# Estado Actual de la Configuración

## ✅ Verificaciones Completadas

### Cloud SQL
- **Private IP:** `10.31.0.3` ✅ (Ya configurado)
- **Public IP:** `34.176.37.114` (también disponible)
- **Estado:** Listo para usar con PgBouncer

### VPC Connector
- **Nombre:** `unigrc-connector`
- **Región:** `southamerica-west1`
- **Estado:** `READY` ✅
- **Red:** `default`
- **Subnet:** `vpc-connector-subnet`

### Cloud Run Backend
- **Nombre:** `unigrc-backend`
- **Región:** `southamerica-west1`
- **Concurrency:** Necesita actualizarse a `1` (actualmente `10`)
- **Min Instances:** `1` ✅
- **CPU Throttling:** Deshabilitado ✅

## 📋 Próximos Pasos

1. **Obtener credenciales de DATABASE_URL** para configurar PgBouncer
2. **Configurar PgBouncer en VM** usando el script automatizado
3. **Crear secret PGBOUNCER_URL** en Secret Manager
4. **Aplicar concurrency=1** a Cloud Run
5. **Verificar funcionamiento**

## 🔑 Variables Necesarias

Para continuar, necesitas:

```bash
# Ya obtenidas:
CLOUD_SQL_PRIVATE_IP="10.31.0.3"
PROJECT_ID="unigrc-m"  # Verificar con: gcloud config get-value project

# Necesitas obtener:
DB_USER="..."  # Del DATABASE_URL
DB_PASSWORD="..."  # Del DATABASE_URL
DB_NAME="..."  # Del DATABASE_URL
```

## 📝 Comandos Útiles

```bash
# Ver Private IP de Cloud SQL
gcloud sql instances describe unigrc-db --format="value(ipAddresses[?type=='PRIVATE'].ipAddress)"

# Ver VPC Connector
gcloud compute networks vpc-access connectors list --region=southamerica-west1

# Obtener DATABASE_URL (sin mostrar el valor completo por seguridad)
gcloud secrets versions access latest --secret=DATABASE_URL | grep -o "postgresql://[^@]*@[^/]*/[^?]*" | head -c 50
```



























## 🚀 Optimizaciones de Rendimiento - Endpoints Lentos

### Problemas Identificados (24 Dic 2025)

**Endpoints críticos con tiempos de respuesta muy altos:**
- `/api/risk-processes/validation/notified/list`: **26 segundos**
- `/api/risk-processes/validation/not-notified/list`: **26 segundos**
- `/api/subprocesos`: **8 segundos**
- `/api/processes/basic`: **7.6 segundos**

### Optimizaciones Implementadas

#### 1. **Query `getRiskProcessLinksByNotificationStatusPaginated`**
- **Problema:** Múltiples LEFT JOINs (5 tablas) + ORDER BY sin índice compuesto adecuado
- **Solución:**
  - Convertida a SQL raw para mejor control del plan de ejecución
  - Agregado índice compuesto: `idx_rpl_validation_notification_created` que cubre `(validation_status, notification_sent, created_at)`
  - Optimizado cálculo de residual_risk con subquery agregada
  - Reducido número de JOINs innecesarios

#### 2. **Índice Compuesto Crítico**
- **Archivo:** `scripts/optimize-validation-endpoints.sql`
- **Índice:** `idx_rpl_validation_notification_created`
- **Cubre:** `WHERE validation_status = X AND notification_sent = Y ORDER BY created_at`
- **Impacto esperado:** Reducción de 26s a <2s en endpoints de validación

#### 3. **Schema Actualizado**
- Agregado índice en `shared/schema.ts` para futuras migraciones
- El índice debe crearse manualmente en producción ejecutando el script SQL

### Optimizaciones Adicionales (Código)

#### 4. **Endpoint `/api/subprocesos`**
- **Problema:** No usaba SingleFlight, causando múltiples queries concurrentes
- **Solución:**
  - Agregado SingleFlight para deduplicar requests concurrentes cuando el caché está frío
  - Mejorado logging de performance

#### 5. **Caché de Risk Levels**
- **Problema:** TTL de 10 minutos podía ser insuficiente
- **Solución:**
  - Aumentado TTL de 10 a 15 minutos (risk levels cambian infrecuentemente)
  - Reduce carga en base de datos

#### 6. **Query de Risk Controls Optimizada**
- **Problema:** Siempre traía todos los risk controls, incluso cuando solo se necesitaban subprocesos
- **Solución:**
  - Filtrado inteligente por entidad solicitada (subprocesos, processes, macroprocesos)
  - Reduce volumen de datos transferidos y procesamiento en memoria

### Próximos Pasos

1. **Aplicar cambios del schema (índice compuesto):**
   ```bash
   npm run db:push
   ```
   Esto creará automáticamente el índice `idx_rpl_validation_notification_created`

2. **Monitorear mejoras:**
   - Verificar tiempos de respuesta después del deploy
   - Revisar logs de Cloud Run para confirmar mejoras
   - Los endpoints de validación deberían pasar de 26s a <2s con el índice

3. **Optimizaciones futuras (si aún hay problemas):**
   - Evaluar SQL GROUP BY para `getAllRiskLevelsOptimized` si sigue siendo lento
   - Revisar estrategias de invalidación de caché más agresivas



