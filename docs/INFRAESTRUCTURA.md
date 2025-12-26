# 📊 Infraestructura y Configuración - UniGRC

> Última actualización: Diciembre 2025

## 🏗️ Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                      cl.unigrc.app (dominio)                    │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│              Google Cloud Load Balancer + CDN                   │
│              (SSL, HTTPS redirection, caching)                  │
└───────────────┬─────────────────────────────────┬───────────────┘
                │                                 │
    ┌───────────▼───────────┐       ┌─────────────▼─────────────┐
    │    /api/* → Backend   │       │   /* → Frontend estático  │
    │   (Cloud Run)         │       │   (GCS Bucket + CDN)      │
    └───────────┬───────────┘       └───────────────────────────┘
                │
    ┌───────────▼───────────┐       ┌─────────────────────────┐
    │  VPC Connector        │       │   Upstash Redis         │
    │  (private network)    │       │   (distributed cache)   │
    └───────────┬───────────┘       └─────────────────────────┘
                │
    ┌───────────▼───────────┐
    │  Cloud SQL PostgreSQL │
    │  (via Cloud SQL Proxy)│
    │  (instance: unigrc-db)│
    └───────────────────────┘
```

---

## ☁️ Google Cloud Platform (Producción)

### Configuración General

| Componente | Configuración |
|------------|---------------|
| **Región** | `southamerica-west1` (Santiago, Chile) |
| **Proyecto** | `unigrc-m` |
| **Dominio** | `cl.unigrc.app` |

### Cloud Run (Backend)

| Parámetro | Valor |
|-----------|-------|
| Servicio | `unigrc-backend` |
| Puerto | `5000` |
| Memoria | `2 Gi` |
| CPUs | `2` |
| Max instancias | `6` |
| Min instancias | `1` (siempre activo) |
| Concurrencia | `4` requests/instancia |
| Timeout | `300s` |
| CPU Throttling | Deshabilitado |

### Cloud SQL (Base de datos)

| Parámetro | Valor |
|-----------|-------|
| Instancia | `unigrc-db` |
| Tipo | PostgreSQL |
| Conexión | Via Cloud SQL Auth Proxy (directo) |
| Cloud SQL Instance | `unigrc-m:southamerica-west1:unigrc-db` |
| Pool Size | 10 conexiones (Node.js pg pool) |

### VPC & Networking

| Componente | Nombre |
|------------|--------|
| VPC Connector | `unigrc-connector` |
| Egress | `private-ranges-only` |

### Cloud CDN

| Parámetro | Valor |
|-----------|-------|
| Habilitado | ✅ Sí |
| Default TTL | 1 hora (3600s) |
| Max TTL | 24 horas (86400s) |
| Client TTL | 1 hora (3600s) |
| Cache Key Policy | includeHost, includeProtocol, !includeQueryString |

### Load Balancer

| Componente | Nombre |
|------------|--------|
| URL Map | `unigrc-frontend-url-map` |
| HTTPS Proxy | `unigrc-frontend-https-proxy` |
| SSL Certificate | `cl-unigrc-app-ssl-cert` |
| Backend Bucket | `unigrc-frontend-prod-backend` |
| Backend Service | `unigrc-backend-service` |

---

## 📦 Stack Tecnológico

### Backend

| Tecnología | Versión | Uso |
|------------|---------|-----|
| Node.js | `≥20.0.0` | Runtime |
| Express | `4.21.2` | Web framework |
| TypeScript | `5.6.3` | Lenguaje |
| Drizzle ORM | `0.39.3` | ORM |
| PostgreSQL (pg) | `8.16.3` | Driver BD |
| Zod | `3.24.2` | Validación |

### Frontend

| Tecnología | Versión | Uso |
|------------|---------|-----|
| React | `18.3.1` | UI Framework |
| Vite | `5.4.19` | Build tool |
| TailwindCSS | `3.4.17` | Estilos |
| TanStack Query | `5.60.5` | Data fetching |
| Wouter | `3.3.5` | Routing |
| Radix UI | `^1.x` | Componentes |
| Recharts | `2.15.2` | Gráficos |

### Caché (Two-Tier)

| Capa | Tecnología | TTL | Latencia |
|------|------------|-----|----------|
| L1 (local) | In-memory Map | 5-120 min | <1ms |
| L2 (distribuida) | Upstash Redis | 5-60 min | 60-115ms |

### Servicios Externos

| Servicio | Uso |
|----------|-----|
| Upstash Redis | Caché distribuida |
| OpenAI API | Asistente IA |
| Mailgun | Envío de emails |
| Google Cloud Storage | Almacenamiento archivos |

---

## 🔐 Variables de Entorno

### Secretos (Secret Manager)

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Conexión PostgreSQL directa |
| `PGBOUNCER_URL` | Conexión via PgBouncer |
| `SESSION_SECRET` | Clave para sesiones |
| `CSRF_SECRET` | Clave para CSRF tokens |
| `OPENAI_API_KEY` | API Key OpenAI |
| `UPSTASH_REDIS_REST_URL` | URL Redis Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | Token Redis |
| `GCS_CLIENT_EMAIL` | Service Account GCS |
| `GCS_PRIVATE_KEY` | Clave privada GCS |

### Variables de Entorno

| Variable | Valor |
|----------|-------|
| `NODE_ENV` | `production` |
| `IS_GCP_DEPLOYMENT` | `true` |
| `FRONTEND_URL` | `https://cl.unigrc.app` |
| `GCS_PROJECT_ID` | `$PROJECT_ID` |
| `GCS_BUCKET_NAME` | `unigrc-uploads-$PROJECT_ID` |

---

## 🚀 CI/CD Pipeline

### Cloud Build

```
GitHub (main branch)
        │
        ▼ (trigger)
Cloud Build
        │
        ├── Build Docker image (E2_HIGHCPU_8)
        ├── Push to Artifact Registry
        └── Deploy to Cloud Run
```

| Parámetro Build | Valor |
|-----------------|-------|
| Machine Type | `E2_HIGHCPU_8` |
| Timeout | `1800s` (30 min) |
| Registry | `southamerica-west1-docker.pkg.dev` |
| Logging | `CLOUD_LOGGING_ONLY` |

### Artifact Registry

| Parámetro | Valor |
|-----------|-------|
| Ubicación | `southamerica-west1-docker.pkg.dev` |
| Repositorio | `unigrc` |
| Imagen Backend | `backend:$COMMIT_SHA` / `backend:latest` |

---

## 📁 Almacenamiento

| Bucket/Storage | Uso |
|----------------|-----|
| `unigrc-frontend-prod` | Frontend estático (HTML, JS, CSS) |
| `unigrc-uploads-$PROJECT_ID` | Uploads de usuarios (evidencias, etc.) |

---

## 🔄 Entorno Alternativo: Render (Staging/Dev)

| Parámetro | Valor |
|-----------|-------|
| Región | Oregon |
| Plan | Starter |
| Runtime | Node.js |
| Build Command | `npm install --include=dev && npm run build && npm run db:push` |
| Start Command | `npm run start` |
| Health Check | `/health` |

### Variables Render

| Variable | Tipo |
|----------|------|
| `DATABASE_URL` | Sync: false |
| `SESSION_SECRET` | Auto-generated |
| `AZURE_OPENAI_*` | Sync: false |
| `MAILGUN_*` | Sync: false |
| `UPSTASH_REDIS_*` | Sync: false |

---

## 📊 Límites de Recursos

### Node.js Runtime

| Recurso | Configuración |
|---------|---------------|
| Max Old Space Size | `1536 MB` |
| Thread Pool Size | `4` (UV_THREADPOOL_SIZE) |

### Rate Limiting

| Endpoint | Límite |
|----------|--------|
| `/api/auth/*` | Estricto (authRateLimiter) |
| Mutaciones API | Moderado (apiMutationLimiter) |

### Conexiones DB

| Parámetro | Valor |
|-----------|-------|
| Pool Size (Cloud Run) | 10 conexiones |
| Idle Timeout | 10s |
| Connection Timeout | 5s |

---

## 🐳 Docker

### Backend (Dockerfile.backend)

- **Base Image**: `node:20-alpine`
- **Build Stage**: esbuild bundle
- **Runtime**: dumb-init + node
- **Puerto expuesto**: 5000

### Dependencias Nativas

- cairo (canvas)
- jpeg, pango, giflib, pixman

---

## 📝 Scripts Útiles

```bash
# Desarrollo
npm run dev                    # Iniciar en modo desarrollo

# Build
npm run build                  # Build frontend + backend

# Base de datos
npm run db:push               # Push schema a DB
npm run db:init               # Inicializar Cloud SQL

# Despliegue
npm run validate-deploy       # Validar antes de deploy
npm run firebase:deploy       # Deploy frontend a Firebase

# Testing
npm run test                  # Tests unitarios
npm run test:e2e              # Tests E2E (Playwright)

# Performance
npm run apply-risk-list-view  # Aplicar vista materializada
npm run verify-risk-list-view # Verificar vista
```

---

## 🔗 URLs Importantes

| Entorno | URL |
|---------|-----|
| Producción | https://cl.unigrc.app |
| Backend directo | https://unigrc-backend-7joma3s3xa-tl.a.run.app |
| Cloud Console | https://console.cloud.google.com/run?project=unigrc-m |

---

## 📈 Monitoreo

### Endpoints de Salud

| Endpoint | Descripción |
|----------|-------------|
| `/health` | Health check básico |
| `/api/system/diagnostics` | Diagnóstico completo del sistema |

### Logs

- Cloud Logging (GCP)
- Console logs con prefijos: `[PERF]`, `[CACHE]`, `[DB]`, `[ERROR]`

---

## 🛡️ Seguridad

| Medida | Implementación |
|--------|----------------|
| HTTPS | Obligatorio (redirect HTTP→HTTPS) |
| CSRF | csrf-csrf middleware |
| Helmet | Headers de seguridad |
| Rate Limiting | express-rate-limit |
| Sanitización | express-mongo-sanitize |
| CORS | Configurado para dominio específico |

---

*Documento generado automáticamente. Para actualizaciones, modificar `docs/INFRAESTRUCTURA.md`*

