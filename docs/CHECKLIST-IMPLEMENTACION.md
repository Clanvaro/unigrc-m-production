# Checklist de Implementación - Arquitectura a Prueba de Balas

## Estado Actual
- ✅ Plan completo creado
- ✅ Cambios de código implementados (server/db.ts, cloudbuild-backend.yaml)
- ✅ Scripts de automatización creados
- ✅ Commit y push realizado

## Próximos Pasos (En Orden)

### PASO 1: Verificar Cloud SQL Private IP (5 min)

**Objetivo:** Confirmar si Cloud SQL ya tiene Private IP configurado

```bash
# Verificar si Cloud SQL tiene Private IP
gcloud sql instances describe unigrc-db \
  --format="value(ipAddresses[?type=='PRIVATE'].ipAddress)"

# Si retorna una IP (ej: 10.x.x.x) → ✅ Ya está configurado, continuar a PASO 2
# Si retorna vacío → ⚠️ Necesita configuración (ver FASE 2 del plan)
```

**Resultado esperado:** IP privada (10.x.x.x) o vacío

---

### PASO 2: Verificar VPC Connector (5 min)

**Objetivo:** Confirmar que VPC Connector existe y está configurado

```bash
# Verificar VPC Connector
gcloud compute networks vpc-access connectors list \
  --region=southamerica-west1

# Debe mostrar: unigrc-connector
```

**Resultado esperado:** Lista con `unigrc-connector`

---

### PASO 3: Obtener Variables Necesarias (10 min)

**Objetivo:** Obtener valores para configurar PgBouncer

```bash
# 1. Obtener Private IP de Cloud SQL
CLOUD_SQL_PRIVATE_IP=$(gcloud sql instances describe unigrc-db \
  --format="value(ipAddresses[?type=='PRIVATE'].ipAddress)")

echo "Cloud SQL Private IP: $CLOUD_SQL_PRIVATE_IP"

# 2. Obtener DATABASE_URL para extraer credenciales
DATABASE_URL=$(gcloud secrets versions access latest --secret=DATABASE_URL)

# Extraer componentes (ejemplo, ajustar según formato real)
# Formato típico: postgresql://user:password@host:port/dbname
# Usar para obtener DB_USER, DB_PASSWORD, DB_NAME

# 3. Verificar PROJECT_ID
PROJECT_ID=$(gcloud config get-value project)
echo "Project ID: $PROJECT_ID"
```

**Resultado esperado:** 
- `CLOUD_SQL_PRIVATE_IP` (ej: 10.x.x.x)
- `DATABASE_URL` completo
- `PROJECT_ID`

---

### PASO 4: Configurar PgBouncer en VM (60-90 min)

**Objetivo:** Crear VM y configurar PgBouncer

**Opción A: Script Automatizado (Recomendado)**

```bash
# 1. Exportar variables necesarias
export CLOUD_SQL_PRIVATE_IP="10.x.x.x"  # Del PASO 3
export DB_PASSWORD="..."  # Extraer de DATABASE_URL
export DB_USER="unigrc_user"  # Ajustar según tu configuración
export DB_NAME="unigrc_db"  # Ajustar según tu configuración
export GCP_PROJECT_ID="unigrc-m"  # Ajustar según tu proyecto
export GCP_ZONE="southamerica-west1-a"

# 2. Ejecutar script
./scripts/setup-pgbouncer-vm.sh
```

**Opción B: Manual (Si prefieres control total)**

Seguir instrucciones en `docs/PLAN-ARQUITECTURA-A-PRUEBA-DE-BALAS.md` - FASE 3

**Resultado esperado:**
- VM `unigrc-pgbouncer` creada
- PgBouncer instalado y configurado
- Firewall configurado
- IP interna de VM obtenida (ej: 10.x.x.x)

---

### PASO 5: Crear Secret PGBOUNCER_URL (5 min)

**Objetivo:** Crear secret en Secret Manager con URL de PgBouncer

```bash
# 1. Obtener IP de VM PgBouncer
PGPOOLER_IP=$(gcloud compute instances describe unigrc-pgbouncer \
  --zone=southamerica-west1-a \
  --format="value(networkInterfaces[0].networkIP)")

echo "PgBouncer IP: $PGPOOLER_IP"

# 2. Construir PGBOUNCER_URL
# Formato: postgresql://user:password@IP:6432/dbname?sslmode=disable
PGBOUNCER_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${PGPOOLER_IP}:6432/${DB_NAME}?sslmode=disable"

# 3. Crear secret
echo -n "$PGBOUNCER_URL" | \
  gcloud secrets create PGBOUNCER_URL --data-file=-

# O si ya existe, agregar nueva versión
# echo -n "$PGBOUNCER_URL" | \
#   gcloud secrets versions add PGBOUNCER_URL --data-file=-
```

**Resultado esperado:**
- Secret `PGBOUNCER_URL` creado en Secret Manager

---

### PASO 6: Aplicar Cambios de Cloud Run Manualmente (Prueba Rápida) (5 min)

**Objetivo:** Aplicar concurrency=1 antes del próximo despliegue automático

```bash
# Aplicar concurrency=1 manualmente
gcloud run services update unigrc-backend \
  --region=southamerica-west1 \
  --concurrency=1 \
  --min-instances=1 \
  --cpu-throttling=false
```

**Resultado esperado:**
- Cloud Run actualizado con concurrency=1

---

### PASO 7: Verificar Configuración (10 min)

**Objetivo:** Confirmar que todo está configurado correctamente

```bash
# 1. Verificar que PgBouncer está corriendo en VM
gcloud compute ssh unigrc-pgbouncer --zone=southamerica-west1-a \
  --command="sudo systemctl status pgbouncer --no-pager"

# 2. Probar conexión a PgBouncer desde VM
gcloud compute ssh unigrc-pgbouncer --zone=southamerica-west1-a \
  --command="psql -h localhost -p 6432 -U pgbouncer pgbouncer -c 'SHOW VERSION;'"

# 3. Verificar secret existe
gcloud secrets describe PGBOUNCER_URL

# 4. Verificar configuración de Cloud Run
gcloud run services describe unigrc-backend \
  --region=southamerica-west1 \
  --format="value(spec.template.spec.containerConcurrency)"
# Debe mostrar: 1
```

**Resultado esperado:**
- PgBouncer corriendo
- Conexión exitosa
- Secret existe
- Concurrency=1

---

### PASO 8: Esperar Próximo Despliegue o Forzar Redeploy (5 min)

**Opción A: Esperar próximo push a main** (despliegue automático)

**Opción B: Forzar redeploy manual**

```bash
# Trigger Cloud Build manualmente
gcloud builds submit --config=cloudbuild-backend.yaml
```

**Resultado esperado:**
- Cloud Run desplegado con nueva configuración
- Secret PGBOUNCER_URL disponible

---

### PASO 9: Verificar que Cloud Run Usa PgBouncer (10 min)

**Objetivo:** Confirmar en logs que se está usando PgBouncer

```bash
# Ver logs de Cloud Run
gcloud run services logs read unigrc-backend \
  --region=southamerica-west1 \
  --limit=100 | grep -i "pgbouncer\|db config"

# Buscar estas líneas:
# [DB Config] Using: PgBouncer connection pooler at 10.x.x.x:6432
# [DB Config] PgBouncer mode: Cloud Run poolMax=10 (PgBouncer handles real pooling to DB)
```

**Resultado esperado:**
- Logs muestran que usa PgBouncer
- PoolMax=10 configurado

---

### PASO 10: Probar Endpoint (5 min)

**Objetivo:** Verificar que el endpoint responde rápido

```bash
# Probar endpoint que antes tardaba 88-195s
curl -w "\nTime: %{time_total}s\n" \
  https://unigrc-backend-*.run.app/api/risks/page-data-lite

# Debe responder en <5s (vs 88-195s anterior)
```

**Resultado esperado:**
- Tiempo de respuesta <5s
- Sin errores

---

### PASO 11: Verificar Pool Metrics (10 min)

**Objetivo:** Confirmar que no hay pool starvation

```bash
# Ver logs de pool metrics
gcloud run services logs read unigrc-backend \
  --region=southamerica-west1 \
  --limit=200 | grep "Pool metrics"

# Buscar:
# - waiting=0 (no hay espera por conexiones)
# - utilization <80% (pool no saturado)
```

**Resultado esperado:**
- `waiting=0` en todos los requests
- `utilization <80%`

---

### PASO 12: Monitorear por 24-48h (Ongoing)

**Objetivo:** Confirmar estabilidad a largo plazo

- Revisar logs diariamente
- Verificar métricas de Cloud Run
- Verificar métricas de PgBouncer (SHOW POOLS, SHOW STATS)
- Confirmar que no hay pool starvation

---

## Resumen de Tiempo

- **PASO 1-2:** 10 min (verificación)
- **PASO 3:** 10 min (obtener variables)
- **PASO 4:** 60-90 min (configurar PgBouncer)
- **PASO 5:** 5 min (crear secret)
- **PASO 6:** 5 min (aplicar cambios Cloud Run)
- **PASO 7:** 10 min (verificar)
- **PASO 8:** 5 min (redeploy)
- **PASO 9-11:** 25 min (verificación y pruebas)

**Total:** ~2-3 horas de trabajo activo

---

## Comandos Rápidos de Referencia

```bash
# Verificar Private IP de Cloud SQL
gcloud sql instances describe unigrc-db --format="value(ipAddresses[?type=='PRIVATE'].ipAddress)"

# Verificar VPC Connector
gcloud compute networks vpc-access connectors list --region=southamerica-west1

# Obtener IP de VM PgBouncer
gcloud compute instances describe unigrc-pgbouncer --zone=southamerica-west1-a --format="value(networkInterfaces[0].networkIP)"

# Ver logs de Cloud Run
gcloud run services logs read unigrc-backend --region=southamerica-west1 --limit=50

# Verificar concurrency
gcloud run services describe unigrc-backend --region=southamerica-west1 --format="value(spec.template.spec.containerConcurrency)"
```

---

**Estado:** 📋 Checklist listo  
**Siguiente acción:** Ejecutar PASO 1
















