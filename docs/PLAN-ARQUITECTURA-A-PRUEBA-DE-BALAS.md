# Plan: Arquitectura a Prueba de Balas - Cloud Run + PgBouncer

## Objetivo

Implementar una arquitectura robusta que elimine completamente el pool starvation mediante:
1. **Backend Cloud Run optimizado:** concurrency 1-2, CPU always allocated, min instances 1
2. **PgBouncer como pooler dedicado:** entre Cloud Run y Cloud SQL (en VM pequeña)
3. **Cloud SQL Private IP:** conexión privada de baja latencia
4. **Frontend en Cloud Storage + CDN:** (opcional pero recomendado)

## Arquitectura Objetivo

```
┌─────────────────────────────────────────────────────────────┐
│                    Google Cloud Platform                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │  Cloud CDN        │         │  Cloud Run       │          │
│  │  (Frontend)       │◄────────┤  Backend API     │          │
│  │  Cloud Storage    │         │  (Express.js)    │          │
│  │  Static Files     │         │  concurrency=1-2│         │
│  └──────────────────┘         │  CPU always on   │          │
│                                │  min instances=1 │          │
│                                └────────┬─────────┘          │
│                                         │                     │
│                                ┌────────▼─────────┐          │
│                                │   PgBouncer       │          │
│                                │   (VM e2-micro)   │          │
│                                │   Port: 6432      │          │
│                                └────────┬─────────┘          │
│                                         │                     │
│                                ┌────────▼─────────┐          │
│                                │  Cloud SQL       │           │
│                                │  PostgreSQL      │           │
│                                │  Private IP      │           │
│                                └──────────────────┘           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Fases de Implementación

### FASE 1: Optimizar Cloud Run Backend (30 min)

#### 1.1 Actualizar cloudbuild-backend.yaml

**Archivo:** `cloudbuild-backend.yaml`

**Cambios:**
- Reducir `--concurrency=10` → `--concurrency=1` (o 2 si aumentas pool)
- Asegurar `--min-instances=1` (ya está)
- Asegurar `--update-annotations=run.googleapis.com/cpu-throttling=false` (ya está)
- Agregar `--cpu-always-allocated` (si está disponible en 2nd gen)

**Código:**
```yaml
# En el paso de deploy, línea 46:
- '--concurrency=1'  # Cambiar de 10 a 1
# Agregar (si está disponible):
- '--cpu-always-allocated'
```

#### 1.2 Verificar configuración actual

```bash
# Ver configuración actual
gcloud run services describe unigrc-backend \
  --region=southamerica-west1 \
  --format="yaml(spec.template.spec)"
```

#### 1.3 Aplicar cambios manualmente (prueba rápida)

```bash
gcloud run services update unigrc-backend \
  --region=southamerica-west1 \
  --concurrency=1 \
  --min-instances=1 \
  --cpu-throttling=false
```

---

### FASE 2: Configurar Cloud SQL Private IP (si no está) (30-60 min)

#### 2.1 Verificar estado actual

```bash
# Verificar si ya tiene Private IP
gcloud sql instances describe unigrc-db \
  --format="value(ipAddresses[?type=='PRIVATE'].ipAddress)"

# Si retorna IP → ya está configurado
# Si retorna vacío → necesita configuración
```

#### 2.2 Si NO tiene Private IP: Habilitar

**⚠️ ADVERTENCIA:** Esto puede causar downtime de 5-10 minutos

```bash
# 1. Verificar VPC Network
gcloud compute networks list

# 2. Si no existe, crear VPC (o usar default)
gcloud compute networks create unigrc-vpc \
  --subnet-mode=auto \
  --bgp-routing-mode=regional

# 3. Habilitar Private IP en Cloud SQL
gcloud sql instances patch unigrc-db \
  --network=projects/unigrc-m/global/networks/unigrc-vpc

# 4. Obtener Private IP
PRIVATE_IP=$(gcloud sql instances describe unigrc-db \
  --format="value(ipAddresses[?type=='PRIVATE'].ipAddress)")
echo "Private IP: $PRIVATE_IP"
```

#### 2.3 Verificar VPC Connector

```bash
# Verificar que VPC Connector existe
gcloud compute networks vpc-access connectors list \
  --region=southamerica-west1

# Si no existe, crear (ver docs/CLOUD-RUN-CLOUD-SQL-PRIVATE-IP.md)
```

---

### FASE 3: Configurar PgBouncer en VM (60-90 min)

#### 3.1 Crear VM pequeña para PgBouncer

```bash
# Crear VM e2-micro (suficiente para PgBouncer)
gcloud compute instances create unigrc-pgbouncer \
  --zone=southamerica-west1-a \
  --machine-type=e2-micro \
  --network=unigrc-vpc \
  --subnet=default \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=10GB \
  --boot-disk-type=pd-standard \
  --tags=pgbouncer-server \
  --metadata=startup-script='#!/bin/bash
apt-get update
apt-get install -y pgbouncer postgresql-client
systemctl enable pgbouncer
systemctl start pgbouncer
'
```

#### 3.2 Configurar PgBouncer

**Archivo a crear en VM:** `/etc/pgbouncer/pgbouncer.ini`

```ini
[databases]
unigrc_db = host=PRIVATE_IP port=5432 dbname=unigrc_db

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3
max_db_connections = 100
max_user_connections = 100
server_round_robin = 1
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
```

#### 3.3 Configurar autenticación PgBouncer

**Archivo:** `/etc/pgbouncer/userlist.txt`

```bash
# Conectar a VM
gcloud compute ssh unigrc-pgbouncer --zone=southamerica-west1-a

# Crear userlist.txt con hash MD5 de contraseña
# Formato: "username" "md5hash"
# Para generar hash: echo -n "passwordusername" | md5sum
```

#### 3.4 Configurar firewall

```bash
# Permitir conexiones desde Cloud Run (VPC Connector)
gcloud compute firewall-rules create allow-pgbouncer \
  --network=unigrc-vpc \
  --allow=tcp:6432 \
  --source-ranges=10.8.0.0/28 \
  --target-tags=pgbouncer-server \
  --description="Allow PgBouncer connections from VPC Connector"
```

**Nota:** `10.8.0.0/28` es el rango típico de VPC Connector. Verificar con:
```bash
gcloud compute networks vpc-access connectors describe unigrc-connector \
  --region=southamerica-west1 \
  --format="value(network)"
```

#### 3.5 Obtener IP interna de VM

```bash
# Obtener IP interna de la VM
PGPOOLER_IP=$(gcloud compute instances describe unigrc-pgbouncer \
  --zone=southamerica-west1-a \
  --format="value(networkInterfaces[0].networkIP)")

echo "PgBouncer IP: $PGPOOLER_IP"
```

---

### FASE 4: Actualizar código para usar PgBouncer (15 min)

#### 4.1 Actualizar server/db.ts

**Archivo:** `server/db.ts`

**Cambios:**
- Detectar si `PGBOUNCER_URL` está configurado
- Si existe, usar PgBouncer en lugar de conexión directa
- Mantener fallback a conexión directa si no está configurado

**Código a agregar:**
```typescript
// Después de línea 14 (databaseUrl)
const pgbouncerUrl = process.env.PGBOUNCER_URL;

// Prioridad: PGBOUNCER_URL > POOLED_DATABASE_URL > DATABASE_URL
const finalDatabaseUrl = pgbouncerUrl || databaseUrl;

// Detectar si usando PgBouncer
const isUsingPgBouncer = !!pgbouncerUrl;

if (isUsingPgBouncer) {
  console.log(`[DB Config] Using: PgBouncer pooler at ${pgbouncerUrl.split('@')[1]?.split('/')[0] || 'unknown'}`);
}
```

#### 4.2 Ajustar pool config para PgBouncer

**En server/db.ts, después de línea 159:**

```typescript
if (isUsingPgBouncer) {
  // PgBouncer maneja el pooling real, Cloud Run solo necesita pocas conexiones "cliente"
  poolMax = 10; // Más conexiones cliente porque PgBouncer las pool
  poolMin = 3;
  console.log('[DB Config] PgBouncer mode: Cloud Run pool increased to 10 (PgBouncer handles real pooling)');
} else if (isCloudSql) {
  // ... código existente
}
```

#### 4.3 Crear secret para PGBOUNCER_URL

```bash
# Crear PGBOUNCER_URL secret
# Formato: postgresql://user:password@PGPOOLER_IP:6432/unigrc_db?sslmode=disable
echo -n "postgresql://unigrc_user:PASSWORD@${PGPOOLER_IP}:6432/unigrc_db?sslmode=disable" | \
  gcloud secrets create PGBOUNCER_URL --data-file=-

# O si ya existe, agregar nueva versión
echo -n "postgresql://unigrc_user:PASSWORD@${PGPOOLER_IP}:6432/unigrc_db?sslmode=disable" | \
  gcloud secrets versions add PGBOUNCER_URL --data-file=-
```

---

### FASE 5: Actualizar Cloud Build para usar PgBouncer (10 min)

#### 5.1 Actualizar cloudbuild-backend.yaml

**Archivo:** `cloudbuild-backend.yaml`

**Cambios:**
- Agregar `PGBOUNCER_URL` a secrets
- Actualizar `--concurrency=1`
- Agregar `--cpu-always-allocated` (si disponible)

**Código:**
```yaml
# Línea 46: Cambiar concurrency
- '--concurrency=1'

# Línea 49: Agregar PGBOUNCER_URL a secrets
- '--set-secrets=...PGBOUNCER_URL=PGBOUNCER_URL:latest'

# Línea 52: Agregar CPU always allocated (si está disponible)
- '--cpu-always-allocated'
```

---

### FASE 6: Migrar Frontend a Cloud Storage + CDN (Opcional, 60-90 min)

#### 6.1 Crear bucket para frontend

```bash
# Crear bucket para frontend estático
gsutil mb -p unigrc-m -c STANDARD -l southamerica-west1 gs://unigrc-frontend-static

# Configurar como sitio web estático
gsutil web set -m index.html -e 404.html gs://unigrc-frontend-static

# Configurar CORS
gsutil cors set cors.json gs://unigrc-frontend-static
```

**Archivo:** `cors.json`
```json
[
  {
    "origin": ["https://unigrc-backend-*.run.app"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

#### 6.2 Subir build del frontend

```bash
# Build del frontend
npm run build

# Subir a Cloud Storage
gsutil -m rsync -r dist/public gs://unigrc-frontend-static/

# Configurar permisos públicos (solo lectura)
gsutil iam ch allUsers:objectViewer gs://unigrc-frontend-static
```

#### 6.3 Configurar Cloud CDN

```bash
# Crear backend bucket
gcloud compute backend-buckets create unigrc-frontend-backend \
  --gcs-bucket-name=unigrc-frontend-static

# Crear URL map
gcloud compute url-maps create unigrc-frontend-map \
  --default-backend-bucket=unigrc-frontend-backend

# Crear target HTTPS proxy
gcloud compute target-https-proxies create unigrc-frontend-proxy \
  --url-map=unigrc-frontend-map \
  --ssl-certificates=unigrc-ssl-cert

# Crear forwarding rule
gcloud compute forwarding-rules create unigrc-frontend-https \
  --global \
  --target-https-proxy=unigrc-frontend-proxy \
  --ports=443
```

**Nota:** Requiere Load Balancer y certificado SSL. Alternativa más simple: usar Cloud Storage con dominio personalizado.

---

### FASE 7: Verificación y Pruebas (30 min)

#### 7.1 Verificar conexión a PgBouncer

```bash
# Desde Cloud Run, verificar logs
gcloud run services logs read unigrc-backend \
  --region=southamerica-west1 \
  --limit=50 | grep -i "pgbouncer\|database\|db config"

# Debe mostrar: "Using: PgBouncer pooler at ..."
```

#### 7.2 Probar endpoint

```bash
# Probar endpoint que antes tardaba 88-195s
curl -w "\nTime: %{time_total}s\n" \
  https://unigrc-backend-*.run.app/api/risks/page-data-lite

# Debe responder en <5s
```

#### 7.3 Verificar pool metrics

```bash
# Buscar logs de pool metrics
gcloud run services logs read unigrc-backend \
  --region=southamerica-west1 \
  --limit=100 | grep "Pool metrics"

# Debe mostrar waiting=0, utilization <80%
```

#### 7.4 Verificar PgBouncer stats

```bash
# Conectar a VM de PgBouncer
gcloud compute ssh unigrc-pgbouncer --zone=southamerica-west1-a

# Conectar a PgBouncer admin
psql -h localhost -p 6432 -U pgbouncer pgbouncer

# Ver estadísticas
SHOW POOLS;
SHOW STATS;
SHOW CLIENTS;
```

---

## Archivos a Modificar

1. **`cloudbuild-backend.yaml`**
   - Cambiar `--concurrency=10` → `--concurrency=1`
   - Agregar `PGBOUNCER_URL` a secrets
   - Agregar `--cpu-always-allocated` (si disponible)

2. **`server/db.ts`**
   - Agregar detección de `PGBOUNCER_URL`
   - Ajustar pool config cuando use PgBouncer
   - Logging mejorado

3. **Scripts nuevos:**
   - `scripts/setup-pgbouncer-vm.sh` - Setup automatizado de PgBouncer
   - `scripts/upload-frontend-to-gcs.sh` - Upload frontend a Cloud Storage

4. **Documentación:**
   - Actualizar `GCP-DEPLOYMENT.md` con nueva arquitectura
   - Crear `docs/PGBOUNCER-SETUP.md` con guía detallada

---

## Costos Estimados

### PgBouncer VM
- **e2-micro:** ~$7/mes (southamerica-west1)
- **Disco 10GB:** ~$1.70/mes
- **Total VM:** ~$8.70/mes

### Cloud Storage (Frontend)
- **Almacenamiento:** ~$0.02/GB/mes (primeros 5GB gratis)
- **Operaciones:** ~$0.05 por 10,000 operaciones
- **Total estimado:** <$1/mes para tráfico moderado

### Cloud CDN (Opcional)
- **Egress:** $0.08/GB (primeros 1TB/mes)
- **Cache fill:** $0.08/GB
- **Total estimado:** $5-20/mes dependiendo de tráfico

### VPC Connector (ya existe)
- **Costo actual:** ~$144/mes (min-instances=2)

**Total adicional:** ~$10-30/mes (dependiendo de CDN)

---

## Beneficios Esperados

1. **Eliminación de pool starvation:**
   - PgBouncer maneja pooling real (1000 conexiones cliente → 25 conexiones DB)
   - Cloud Run solo necesita 10 conexiones "cliente" al pooler
   - Fórmula: `10 conexiones cliente × 1 concurrency = 10 conexiones` ✅

2. **Mejor performance:**
   - Latencia reducida: Private IP <10ms
   - Sin espera por conexiones: PgBouncer siempre tiene conexiones disponibles
   - CPU always allocated: Sin cold start

3. **Escalabilidad:**
   - PgBouncer puede manejar 1000+ conexiones cliente
   - Cloud Run puede escalar sin preocuparse por pool
   - Frontend en CDN: Mejor performance global

---

## Plan de Rollback

### Si PgBouncer falla:

```bash
# 1. Remover PGBOUNCER_URL de secrets o usar versión anterior
gcloud secrets versions access <VERSION_ANTERIOR> --secret="DATABASE_URL" | \
  gcloud secrets versions add DATABASE_URL --data-file=-

# 2. Actualizar cloudbuild-backend.yaml para no usar PGBOUNCER_URL
# 3. Redeploy
```

### Si Cloud Run optimizado falla:

```bash
# Revertir concurrency
gcloud run services update unigrc-backend \
  --region=southamerica-west1 \
  --concurrency=10
```

---

## Checklist de Implementación

### Pre-implementación
- [ ] Backup de base de datos
- [ ] Ventana de mantenimiento programada
- [ ] Equipo notificado
- [ ] Plan de rollback revisado

### FASE 1: Cloud Run Backend
- [ ] Actualizar `cloudbuild-backend.yaml` (concurrency=1)
- [ ] Aplicar cambios manualmente para prueba
- [ ] Verificar que funciona

### FASE 2: Cloud SQL Private IP
- [ ] Verificar si ya tiene Private IP
- [ ] Si no, habilitar Private IP
- [ ] Verificar VPC Connector

### FASE 3: PgBouncer VM
- [ ] Crear VM e2-micro
- [ ] Instalar y configurar PgBouncer
- [ ] Configurar firewall
- [ ] Probar conexión desde Cloud Run

### FASE 4: Código
- [ ] Actualizar `server/db.ts` para detectar PgBouncer
- [ ] Crear secret `PGBOUNCER_URL`
- [ ] Actualizar `cloudbuild-backend.yaml` con secret

### FASE 5: Despliegue
- [ ] Commit y push de cambios
- [ ] Verificar que Cloud Build funciona
- [ ] Verificar logs de conexión

### FASE 6: Frontend (Opcional)
- [ ] Crear bucket Cloud Storage
- [ ] Subir build del frontend
- [ ] Configurar CDN (opcional)
- [ ] Actualizar FRONTEND_URL

### FASE 7: Verificación
- [ ] Probar endpoint `/api/risks/page-data-lite` (<5s)
- [ ] Verificar pool metrics (waiting=0)
- [ ] Verificar PgBouncer stats
- [ ] Monitorear por 24-48h

---

## Tiempo Total Estimado

- **FASE 1:** 30 min
- **FASE 2:** 30-60 min (solo si no tiene Private IP)
- **FASE 3:** 60-90 min
- **FASE 4:** 15 min
- **FASE 5:** 10 min
- **FASE 6:** 60-90 min (opcional)
- **FASE 7:** 30 min

**Total:** 3-5 horas (sin frontend CDN) o 4-6 horas (con frontend CDN)

---

## Notas Importantes

1. **PgBouncer requiere:** 
   - VM en la misma VPC que Cloud SQL
   - Firewall configurado correctamente
   - Autenticación MD5 configurada

2. **Pool mode transaction:**
   - PgBouncer usa `pool_mode = transaction` (más eficiente)
   - Cada transacción obtiene conexión, la usa, y la libera
   - Perfecto para Cloud Run serverless

3. **Seguridad:**
   - PgBouncer solo acepta conexiones desde VPC (firewall)
   - No expone Cloud SQL directamente
   - SSL puede deshabilitarse dentro de VPC (sslmode=disable)

4. **Monitoreo:**
   - Monitorear PgBouncer stats regularmente
   - Alertar si `SHOW POOLS` muestra saturación
   - Logs de PgBouncer en `/var/log/pgbouncer/`

---

**Estado:** 📋 Plan completo listo para implementación  
**Prioridad:** 🔴 Alta (resuelve pool starvation definitivamente)  
**Riesgo:** 🟡 Medio (requiere configuración de VM y PgBouncer)
