# 🔥 Warm-up Automático con Cloud Scheduler

## 📋 Resumen

Este sistema usa **Cloud Scheduler** para hacer warm-up automático de Cloud Run antes de horarios pico, permitiendo usar `min-instances=0` para reducir costos mientras se minimizan los cold starts.

## 🎯 Cómo Funciona

1. **Cloud Scheduler** ejecuta jobs HTTP a las **07:00** y **23:00** (horario Chile)
2. Los jobs llaman al endpoint `/api/warmup` que:
   - Inicializa la base de datos
   - Calienta el pool de conexiones (establece conexiones mínimas)
   - Pre-carga conexiones a Redis
   - Prepara la aplicación para recibir tráfico
3. Cloud Run activa una instancia para procesar el request de warm-up
4. La instancia queda "caliente" y lista para recibir tráfico real
5. Si no hay tráfico, Cloud Run escala a cero después de ~15 minutos

## 💰 Costos

### Con `min-instances=0` + Warm-up Scheduler:

| Concepto | Costo Mensual |
|----------|---------------|
| **Cloud Run** (solo cuando hay tráfico) | ~$5-15 |
| **Cloud Scheduler** (2 jobs × $0.10) | ~$0.20 |
| **Requests de warm-up** (2/día × 30 días = 60 requests) | ~$0.00 |
| **Total** | **~$5-15/mes** |

### Comparación con `min-instances=1`:

| Configuración | Costo Mensual | Cold Starts |
|---------------|---------------|-------------|
| `min-instances=1` | ~$137/mes | ❌ Mínimos |
| `min-instances=0` + Warm-up | ~$5-15/mes | ✅ Reducidos en horarios pico |

**Ahorro: ~$120-130/mes** (88-91% de reducción)

## ⚙️ Configuración

### 1. Cambiar `min-instances` a 0

Ya está configurado en `cloudbuild-backend.yaml`:
```yaml
- '--min-instances=0'
```

### 2. Ejecutar script de configuración

```bash
# Configurar variables de entorno
export GCP_PROJECT_ID=unigrc-m
export GCP_REGION=southamerica-west1
export CLOUD_RUN_SERVICE=unigrc-backend

# Ejecutar script
bash scripts/setup-warmup-scheduler.sh
```

### 3. Verificar jobs creados

```bash
gcloud scheduler jobs list --location=southamerica-west1 \
  --filter="name:unigrc-backend-warmup*"
```

## 🧪 Probar Manualmente

```bash
# Probar endpoint de warm-up
curl https://unigrc-backend-524018293934.southamerica-west1.run.app/api/warmup

# Respuesta esperada:
# {
#   "success": true,
#   "warmupDuration": 150,
#   "totalDuration": 200,
#   "connections": 2,
#   "poolMetrics": { ... },
#   "initialized": true,
#   "timestamp": "2025-01-XX..."
# }
```

## 📊 Monitoreo

### Ver logs de warm-up:

```bash
# Logs de Cloud Scheduler
gcloud logging read "resource.type=cloud_scheduler_job" \
  --limit=50 \
  --format=json

# Logs de Cloud Run (warm-up requests)
gcloud logging read "resource.type=cloud_run_revision \
  AND resource.labels.service_name=unigrc-backend \
  AND httpRequest.requestUrl=~'/api/warmup'" \
  --limit=50
```

### Verificar que warm-up funciona:

1. Esperar a las 07:00 o 23:00
2. Verificar logs de Cloud Run - debería aparecer un request a `/api/warmup`
3. Verificar que la instancia está activa después del warm-up
4. Hacer un request real - debería responder rápido (sin cold start)

## 🔧 Personalización

### Cambiar horarios:

```bash
# Cambiar a 08:00 y 22:00
gcloud scheduler jobs update http unigrc-backend-warmup-0700 \
  --schedule="0 8 * * *" \
  --time-zone="America/Santiago"

gcloud scheduler jobs update http unigrc-backend-warmup-2300 \
  --schedule="0 22 * * *" \
  --time-zone="America/Santiago"
```

### Agregar más horarios:

```bash
# Agregar warm-up a las 12:00 (almuerzo)
gcloud scheduler jobs create http unigrc-backend-warmup-1200 \
  --schedule="0 12 * * *" \
  --time-zone="America/Santiago" \
  --uri="https://unigrc-backend-524018293934.southamerica-west1.run.app/api/warmup" \
  --http-method=GET
```

## ⚠️ Limitaciones

1. **Cold starts fuera de horarios pico**: Si hay tráfico fuera de 07:00-23:00, puede haber cold start
2. **Primera request después de warm-up**: Si pasan >15 minutos sin tráfico, Cloud Run escala a cero
3. **Múltiples instancias**: Si hay mucho tráfico, Cloud Run puede escalar múltiples instancias (cada una necesita warm-up)

## 🚀 Optimizaciones Adicionales

### 1. Warm-up más agresivo:

Modificar `/api/warmup` para hacer más requests internos:
```typescript
// Pre-cargar endpoints críticos
await fetch('/api/risks/bootstrap?limit=1');
await fetch('/api/validation/counts');
```

### 2. Health check periódico:

Agregar job cada 10 minutos para mantener instancia activa:
```bash
gcloud scheduler jobs create http unigrc-backend-keepalive \
  --schedule="*/10 * * * *" \
  --uri="https://unigrc-backend-xxx.run.app/api/health" \
  --http-method=GET
```

**Nota**: Esto aumenta costos (~$4/mes) pero elimina cold starts completamente.

## 📝 Notas

- Los jobs de Cloud Scheduler son **gratis** hasta 3 jobs por proyecto
- Cada job adicional cuesta **$0.10/mes**
- Los requests de warm-up cuentan como requests normales (pero son mínimos)
- El warm-up toma ~200-500ms dependiendo de la latencia de DB
