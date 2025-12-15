# Optimizaciones Implementadas para `/api/risks/page-data-lite`

## ✅ Optimizaciones Implementadas

### 1. **Optimización de `getRiskStats()` con Agregación SQL** ✅

**Antes:** Traía TODOS los registros de `risks` y calculaba agregados en memoria
```typescript
// Traía todos los registros (puede ser miles)
const stats = await db.select({ status, inherentRisk, isDeleted }).from(risks);
// Luego filtraba y contaba en memoria
const active = stats.filter(s => s.status === 'active' && !s.isDeleted).length;
```

**Después:** Una sola query SQL con agregación
```sql
SELECT 
  COUNT(*)::int as total,
  COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'active')::int as active,
  COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'inactive')::int as inactive,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::int as deleted,
  -- ... más agregados
FROM risks
```

**Impacto esperado:** 
- Reduce transferencia de datos de ~MB a ~KB
- Reduce tiempo de query de segundos a milisegundos
- Reduce uso de memoria significativamente

### 2. **Logging Detallado de Redis** ✅

**Agregado:**
- Tiempo de `redis.get()` en cache hit/miss
- Tiempo de `redis.set()` al guardar caché
- Tamaño de respuesta en KB

**Logs ahora muestran:**
```
[page-data-lite] CACHE HIT { redisGetMs: 45, total: 50 }
[page-data-lite] CACHE MISS { redisGetMs: 120 }
[page-data-lite] CACHE SET { redisSetMs: 250, responseSizeKB: 1250 }
```

**Beneficio:** Permite identificar si Redis/Upstash es el cuello de botella

---

## 📋 Optimizaciones Pendientes (Recomendadas)

### 3. **Índices para `getRisksLite()`**

El LATERAL JOIN en `getRisksLite()` necesita estos índices para optimizar:

```sql
-- Índice compuesto para el LATERAL JOIN
CREATE INDEX IF NOT EXISTS idx_risk_process_links_risk_created 
ON risk_process_links(risk_id, created_at DESC NULLS LAST)
WHERE responsible_override_id IS NOT NULL;

-- Índice parcial adicional (opcional, pero mejora aún más)
CREATE INDEX IF NOT EXISTS idx_risk_process_links_responsible_override 
ON risk_process_links(risk_id, responsible_override_id, created_at DESC NULLS LAST)
WHERE responsible_override_id IS NOT NULL;
```

**Impacto esperado:** Reduce tiempo de `getRisksLite()` de segundos a <500ms

**Cómo aplicar:**
```bash
# Crear migración
psql $DATABASE_URL -c "
CREATE INDEX IF NOT EXISTS idx_risk_process_links_risk_created 
ON risk_process_links(risk_id, created_at DESC NULLS LAST)
WHERE responsible_override_id IS NOT NULL;
"
```

### 4. **Optimizar SELECT * en Catálogos** (Opcional)

Los catálogos (`getGerencias`, `getMacroprocesos`, `getProcesses`) usan `SELECT *`. 

**Evaluación:**
- ✅ Ya tienen caché Redis (60s TTL)
- ✅ Son relativamente pequeños (<1000 registros típicamente)
- ⚠️ SELECT específico reduciría transferencia pero el impacto es menor

**Si decides optimizar:**
```typescript
// En lugar de:
db.select().from(gerencias)

// Usar:
db.select({
  id: gerencias.id,
  code: gerencias.code,
  name: gerencias.name,
  level: gerencias.level,
  order: gerencias.order,
  parentId: gerencias.parentId,
  managerId: gerencias.managerId,
  status: gerencias.status,
  // No incluir: description, createdBy, updatedBy, deletedBy, deletionReason, createdAt, updatedAt
}).from(gerencias)
```

**Impacto esperado:** Reducción de ~20-30% en tamaño de respuesta (menor que getRiskStats)

---

## 🔧 Configuración de Infraestructura

### 5. **Ajustar Concurrency y Max Instances en Cloud Run**

**Recomendación temporal para diagnóstico:**

```yaml
# app.yaml o configuración de Cloud Run
service: unigrc-backend
runtime: nodejs20

autoscaling:
  min_instances: 1
  max_instances: 5  # ← Reducir de 10+ a 5 temporalmente

resources:
  cpu: 2
  memory: 4Gi

# En variables de entorno o configuración:
CONCURRENCY: 5  # ← Reducir de 80 a 5 temporalmente
```

**Cómo aplicar:**
```bash
gcloud run services update unigrc-backend \
  --max-instances=5 \
  --concurrency=5 \
  --region=us-central1
```

**Objetivo:** Si con esto `page-data-lite` baja de 160s a 2-5s, confirma que era saturación del pool/Cloud SQL.

### 6. **Verificar Configuración de Pool de Conexiones**

**No estás usando Prisma**, estás usando `pg` Pool directamente. La configuración está en `server/db.ts`:

```typescript
// Ya está optimizado para Cloud SQL:
poolMax = 4  // Configurable via DB_POOL_MAX env var
poolMin = 2
connectionTimeoutMillis = 60000
statement_timeout = 30000
```

**Verificar:**
- ✅ Pool max ya está bajo (4 conexiones por instancia)
- ✅ Timeout de statement configurado (30s)
- ⚠️ Verificar que `DB_POOL_MAX=4` esté en variables de entorno

**Si necesitas reducir más:**
```bash
# En Cloud Run, agregar variable de entorno:
DB_POOL_MAX=2
```

---

## 🔍 Diagnóstico de Redis/Upstash

### 7. **Verificar Latencia de Upstash**

Con el nuevo logging, revisa los logs:

```bash
# Buscar logs de Redis
gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.redisGetMs>100" --limit=50

# Si redisGetMs > 200ms consistentemente:
# - Verificar región de Upstash (debe estar cerca de Cloud Run)
# - Verificar rate limits de Upstash REST API
# - Considerar usar Redis directo en lugar de REST API
```

**Si Redis es lento:**
- Opción 1: Cambiar región de Upstash a la misma que Cloud Run
- Opción 2: Usar Redis directo (no REST API) si Upstash lo soporta
- Opción 3: Aumentar timeout de caché o deshabilitar temporalmente para diagnóstico

---

## 📊 Métricas Esperadas Después de Optimizaciones

### Antes:
- `getRiskStats()`: 5-30s (dependiendo de cantidad de riesgos)
- `page-data-lite` total: 88-195s
- Redis get: No medido

### Después (esperado):
- `getRiskStats()`: <100ms (agregación SQL)
- `page-data-lite` total: 2-10s (con caché), 5-15s (sin caché)
- Redis get: <100ms (si región correcta)

---

## 🚀 Próximos Pasos

1. ✅ **Implementado:** Optimización de `getRiskStats()`
2. ✅ **Implementado:** Logging de Redis
3. ⏳ **Pendiente:** Crear índices para `getRisksLite()`
4. ⏳ **Pendiente:** Ajustar concurrency/max-instances en Cloud Run
5. ⏳ **Pendiente:** Monitorear logs de Redis para identificar cuellos de botella

---

## 📝 Notas Adicionales

### Sobre el "doble fetch"
Si ves dos requests seguidos al mismo endpoint:
- Revisar `useQuery` en el frontend
- Verificar que no haya múltiples `useEffect` disparando el mismo fetch
- Considerar `staleTime` más alto para evitar refetches innecesarios

### Sobre Prisma
**No estás usando Prisma**, estás usando Drizzle ORM con `pg` Pool. Las recomendaciones de Prisma no aplican. Tu configuración de pool ya está optimizada.
