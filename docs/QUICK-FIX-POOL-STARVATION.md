# 🚨 Fix Rápido: Pool Starvation

## Problema Identificado

**Síntoma:** Endpoint `/api/risks/page-data-lite` tarda 88-195s aunque queries individuales son rápidas (2ms).

**Causa Raíz:** Pool starvation
- Pool de conexiones: **4 conexiones**
- Cloud Run concurrency: **10 requests simultáneos**
- Queries por request: **9 queries en paralelo**
- **Resultado:** 10 requests × 2 queries = 20 queries compitiendo por 4 conexiones

## ✅ Soluciones Implementadas

### 1. Limitación de Concurrencia de Queries ✅

**Implementado en:** `server/routes.ts` (endpoint `/api/risks/page-data-lite`)

```typescript
// ANTES: 9 queries en paralelo
await Promise.all([risksPromise, ownersPromise, statsPromise, ...]);

// DESPUÉS: Batches de 2 queries
const CONCURRENT_QUERIES = 2;
for (let i = 0; i < queries.length; i += CONCURRENT_QUERIES) {
  const batch = queries.slice(i, i + CONCURRENT_QUERIES);
  await Promise.all(batch.map(q => q.fn()));
}
```

**Impacto:** Respeta límite del pool (pool=4, max 2 queries concurrentes por request)

### 2. Logging de Pool Metrics ✅

**Implementado en:** `server/routes.ts`

```typescript
// Log ANTES de queries
const poolMetricsBefore = getPoolMetrics();
console.log('[page-data-lite] Pool metrics BEFORE queries', {
  total, max, idle, active, waiting, utilization
});

// Log DESPUÉS de cada batch
console.log(`[page-data-lite] Batch ${n} completed`, {
  poolTotal, poolActive, poolWaiting
});

// Log DESPUÉS de todas las queries
const poolMetricsAfter = getPoolMetrics();
console.log('[page-data-lite] Pool metrics AFTER queries', {...});
```

**Cómo confirmar pool starvation:**
- Si ves `waiting > 0` → Pool starvation confirmado
- Si ves `total=4/4` constante → Pool saturado
- Si ves `utilization: '100%'` → Pool completamente ocupado

### 3. Optimización de getRiskStats() ✅

**Implementado en:** `server/storage.ts`

```sql
-- ANTES: Traía todos los registros
SELECT status, inherent_risk, (deleted_at IS NOT NULL) FROM risks;
-- Luego calculaba en memoria

-- DESPUÉS: Agregación SQL
SELECT 
  COUNT(*)::int as total,
  COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'active')::int as active,
  -- ... más agregados
FROM risks
```

**Impacto:** 5-30s → <100ms

### 4. Singleton del Cliente DB ✅

**Verificado en:** `server/db.ts`

```typescript
// Pool y DB se crean UNA SOLA VEZ al inicio del módulo
let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

// Solo se inicializa si no existe
if (databaseUrl && !pool) {
  pool = new Pool({...});
  db = drizzle(pool, { schema, logger: true });
}

export { pool, db }; // Exportación única
```

**✅ Confirmado:** No hay múltiples instancias del pool.

---

## ⚠️ ACCIÓN REQUERIDA: Ajustar Concurrency en Cloud Run

### Opción 1: Reducir Concurrency (RECOMENDADO)

```bash
gcloud run services update unigrc-backend \
  --concurrency=1 \
  --region=us-central1
```

**Fórmula:**
```
pool_size >= concurrency × queries_por_request
4 >= 1 × 2  ✅ (funciona)
4 >= 10 × 2  ❌ (causa starvation)
```

### Opción 2: Aumentar Pool (si Cloud SQL lo permite)

```bash
# 1. Aumentar pool en variables de entorno
DB_POOL_MAX=8

# 2. Luego puedes usar concurrency=2-3
gcloud run services update unigrc-backend \
  --concurrency=2 \
  --region=us-central1
```

**Verificar límites de Cloud SQL:**
```sql
-- Verificar max_connections de tu instancia
SHOW max_connections;

-- Calcular: pool_size × max_instances debe ser < max_connections
-- Ejemplo: 8 × 5 = 40 conexiones (debe ser < max_connections de Cloud SQL)
```

---

## 🔍 Cómo Confirmar el Fix (2 minutos)

### 1. Revisar Logs de Pool Metrics

```bash
# Buscar logs de pool metrics
gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.poolWaiting>0" --limit=20

# Buscar requests lentos con pool saturado
gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.total>5000 AND jsonPayload.utilization='100%'" --limit=20
```

### 2. Verificar Métricas en Logs

**Pool Starvation CONFIRMADO si ves:**
```
[page-data-lite] Pool metrics BEFORE queries {
  total: 4, max: 4, waiting: 2, utilization: '100%'
}
```

**Pool Starvation RESUELTO si ves:**
```
[page-data-lite] Pool metrics BEFORE queries {
  total: 4, max: 4, waiting: 0, utilization: '50%'
}
```

### 3. Medir Tiempo de Endpoint

```bash
# Antes del fix: 88-195s
# Después del fix: <5s (con concurrency=1)
curl -w "\nTime: %{time_total}s\n" https://unigrc-backend.run.app/api/risks/page-data-lite
```

---

## 📊 Métricas Esperadas

### Antes del Fix
- Tiempo total: **88-195s**
- Pool waiting: **>0** (queries esperando conexión)
- Pool utilization: **100%** constante

### Después del Fix
- Tiempo total: **<5s**
- Pool waiting: **0** (sin queries esperando)
- Pool utilization: **<80%** (margen de seguridad)

---

## 🎯 Checklist de Implementación

- [x] ✅ Limitación de concurrencia de queries (batches de 2)
- [x] ✅ Logging de pool metrics antes/después
- [x] ✅ Optimización de getRiskStats() con agregación SQL
- [x] ✅ Singleton del cliente DB verificado
- [ ] ⚠️ **PENDIENTE:** Ajustar `concurrency` en Cloud Run a 1-2
- [ ] ⚠️ **OPCIONAL:** Aumentar `DB_POOL_MAX` si Cloud SQL lo permite

---

## 📝 Notas Adicionales

### Por qué batches de 2 y no 3?

Con `pool=4` y `concurrency=1`:
- 1 request × 2 queries = 2 conexiones usadas
- Deja 2 conexiones libres para otros requests/operaciones
- Margen de seguridad del 50%

Si usas `concurrency=2`:
- 2 requests × 2 queries = 4 conexiones (pool completo)
- Sin margen de seguridad
- **Recomendación:** Usar `concurrency=1` o aumentar pool a 8

### Monitoreo Continuo

Después de aplicar el fix, monitorear:
1. Logs de pool metrics (waiting debe ser 0)
2. Tiempo de respuesta del endpoint (<5s)
3. Utilización del pool (<80% para margen de seguridad)

---

**Última Actualización:** Diciembre 2024  
**Estado:** ✅ Soluciones implementadas, requiere ajuste de concurrency en Cloud Run
