# Deploy UniGRC en Render

Esta guía te ayudará a desplegar UniGRC en Render en minutos.

## Requisitos Previos

1. **Cuenta en Render** - [render.com](https://render.com)
2. **Repositorio en GitHub** - Tu código debe estar en GitHub
3. **Base de datos PostgreSQL** - Recomendamos [Neon](https://neon.tech) (tiene plan gratuito)

## Paso 1: Preparar la Base de Datos

### Opción A: Usar Neon (Recomendado)
1. Ve a [neon.tech](https://neon.tech) y crea una cuenta
2. Crea un nuevo proyecto
3. Copia la cadena de conexión (`DATABASE_URL`)
   - Formato: `postgresql://user:password@host/database?sslmode=require`

### Opción B: Usar Render PostgreSQL
1. En Render, ve a **New > PostgreSQL**
2. Configura el nombre y región
3. Crea la base de datos
4. Copia la **Internal Database URL**

## Paso 2: Crear el Web Service en Render

### Método 1: Deploy Automático con render.yaml (Recomendado)

1. Haz push de tu código a GitHub (asegúrate de incluir `render.yaml`)
2. Ve a [dashboard.render.com](https://dashboard.render.com)
3. Click en **New > Blueprint**
4. Conecta tu repositorio de GitHub
5. Render detectará automáticamente el `render.yaml`
6. Configura las variables de entorno requeridas
7. Click en **Apply**

### Método 2: Configuración Manual

1. Ve a [dashboard.render.com](https://dashboard.render.com)
2. Click en **New > Web Service**
3. Conecta tu repositorio de GitHub
4. Configura:

| Campo | Valor |
|-------|-------|
| **Name** | unigrc |
| **Environment** | Node |
| **Region** | Oregon (us-west-2) o el más cercano |
| **Branch** | main |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm run start` |
| **Plan** | Starter ($7/mes) o superior |

5. En **Advanced**, configura el **Health Check Path**: `/health`

## Paso 3: Configurar Variables de Entorno

En Render, ve a **Environment** y agrega estas variables:

### Requeridas (la app NO funciona sin estas)

| Variable | Valor | Notas |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://...` | Tu conexión de Neon/PostgreSQL |
| `SESSION_SECRET` | (generar) | Click en "Generate" o usa: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NODE_ENV` | `production` | Ya está en render.yaml |

### Opcionales (funcionalidad extendida)

| Variable | Propósito |
|----------|-----------|
| `AZURE_OPENAI_ENDPOINT` | Asistente de IA |
| `AZURE_OPENAI_API_KEY` | Asistente de IA |
| `AZURE_OPENAI_DEPLOYMENT` | Asistente de IA (ej: `gpt-4o-mini`) |
| `MAILGUN_API_KEY` | Notificaciones por email |
| `MAILGUN_DOMAIN` | Notificaciones por email |
| `MAILGUN_FROM_EMAIL` | Remitente de emails |
| `UPSTASH_REDIS_REST_URL` | Caché distribuido |
| `UPSTASH_REDIS_REST_TOKEN` | Caché distribuido |

## Paso 4: Inicializar la Base de Datos

Una vez desplegado, necesitas crear las tablas:

1. Ve a tu servicio en Render
2. Click en **Shell**
3. Ejecuta:
```bash
npm run db:push
```

## Paso 5: Crear Usuario Administrador

En el Shell de Render:
```bash
npm run set-password
```
Sigue las instrucciones para crear tu primer usuario administrador.

## Verificar el Deploy

1. Tu app estará disponible en: `https://unigrc.onrender.com` (o el nombre que elegiste)
2. Verifica el health check: `https://tu-app.onrender.com/health`
3. Inicia sesión con tu usuario administrador

## Troubleshooting

### El deploy falla en el build
- Verifica que `package-lock.json` esté en el repositorio
- Revisa los logs de build en Render

### La app no inicia
- Verifica que `DATABASE_URL` esté configurado correctamente
- Revisa los logs en **Logs** en el dashboard de Render

### Error de conexión a base de datos
- Asegúrate de usar `?sslmode=require` en la URL de Neon
- Verifica que la IP de Render no esté bloqueada en Neon

### El health check falla
- El endpoint `/health` debe responder con status 200
- Espera unos minutos después del deploy inicial

## Costos Estimados

| Servicio | Plan | Costo |
|----------|------|-------|
| Render Web Service | Starter | $7/mes |
| Neon PostgreSQL | Free | $0 (0.5 GB) |
| Upstash Redis | Free | $0 (10K requests/día) |
| **Total** | | **$7/mes** |

## Monitoreo

- **Logs**: Dashboard de Render > Logs
- **Métricas**: Dashboard de Render > Metrics
- **Alertas**: Configura alertas en Settings > Notifications

## Actualizar la Aplicación

Cada push a la rama `main` (o la que configuraste) desplegará automáticamente una nueva versión.

Para deploys manuales:
1. Ve a tu servicio en Render
2. Click en **Manual Deploy** > **Deploy latest commit**

---

**Soporte**: Si tienes problemas, revisa los [Render Docs](https://render.com/docs) o abre un issue en el repositorio.
