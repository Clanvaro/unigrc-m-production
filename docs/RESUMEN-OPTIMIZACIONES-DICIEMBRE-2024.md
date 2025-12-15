# 📊 Resumen de Optimizaciones - Diciembre 2024

## 🎯 Problema Principal Resuelto

**Pool Starvation en `/api/risks/page-data-lite`**
- **Síntoma:** Endpoint tardaba 88-195s
- **Causa:** Pool=4, concurrency=10, 9 queries en paralelo → 20 queries compitiendo por 4 conexiones
- **Solución:** Limitación de concurrencia de queries + ajuste de concurrency en Cloud Run

---

## ✅ Optimizaciones Implementadas

### 1. Limitación de Concurrencia de Queries ✅

**Archivo:** `server/routes.ts`

**Cambio:**
- **Antes:** 9 queries en paralelo con `Promise.all()`
- **Después:** Batches de 2 queries secuenciales

**Código:**
```typescript
const CONCURRENT_QUERIES = 2;
for (let i = 0; i < queries.length; i += CONCURRENT_QUERIES) {
  const batch = queries.slice(i, i + CONCURRENT_QUERIES);
  await Promise.all(batch.map(q => q.fn()));
}
```

**Impacto:** Respeta límite del pool, elimina pool starvation

---

### 2. Logging Detallado de Pool Metrics ✅

**Archivo:** `server/routes.ts`

**Logs agregados:**
- Pool metrics **ANTES** de ejecutar queries
- Pool metrics **DESPUÉS** de cada batch
- Pool metrics **DESPUÉS** de todas las queries

**Cómo detectar pool starvation:**
```typescript
// Si ves esto → Pool starvation confirmado
{
  total: 4, max: 4, waiting: 2, utilization: '100%'
}

// Si ves esto → Pool saludable
{
  total: 4, max: 4, waiting: 0, utilization: '50%'
}
```

---

### 3. Optimización de getRiskStats() con Agregación SQL ✅

**Archivo:** `server/storage.ts`

**Cambio:**
- **Antes:** Traía TODOS los registros y calculaba en memoria
- **Después:** Una sola query SQL con `COUNT(*) FILTER (WHERE ...)`

**Impacto:**
- Tiempo: 5-30s → <100ms
- Transferencia: MB → KB
- Memoria: Reducción significativa

---

### 4. Logging Detallado de Redis ✅

**Archivo:** `server/routes.ts`

**Logs agregados:**
- Tiempo de `redis.get()` en cache hit/miss
- Tiempo de `redis.set()` al guardar caché
- Tamaño de respuesta en KB

**Permite identificar:** Si Redis/Upstash es cuello de botella

---

### 5. Verificación de Singleton del Pool ✅

**Archivo:** `server/db.ts`

**Confirmado:**
- Pool y DB se crean **UNA SOLA VEZ** al inicio del módulo
- Exportación única: `export { pool, db }`
- Todos los archivos importan desde el mismo módulo
- **No hay múltiples instancias del pool**

---

## ⚠️ ACCIÓN REQUERIDA

### Ajustar Concurrency en Cloud Run

**Opción 1: Reducir Concurrency (RECOMENDADO)**
```bash
gcloud run services update unigrc-backend \
  --concurrency=1 \
  --region=us-central1
```

**Opción 2: Aumentar Pool**
```bash
# 1. Agregar variable de entorno
DB_POOL_MAX=8

# 2. Luego usar concurrency=2-3
gcloud run services update unigrc-backend \
  --concurrency=2 \
  --region=us-central1
```

**Fórmula:**
```
pool_size >= concurrency × queries_por_request
4 >= 1 × 2  ✅ (funciona)
4 >= 10 × 2  ❌ (causa starvation)
```

---

## 📊 Métricas Esperadas

### Antes de las Optimizaciones
- `/api/risks/page-data-lite`: **88-195s**
- `getRiskStats()`: **5-30s**
- Pool waiting: **>0** (queries esperando conexión)
- Pool utilization: **100%** constante

### Después de las Optimizaciones
- `/api/risks/page-data-lite`: **<5s** (con concurrency=1)
- `getRiskStats()`: **<100ms**
- Pool waiting: **0** (sin queries esperando)
- Pool utilization: **<80%** (margen de seguridad)

---

## 📁 Archivos Modificados

1. **`server/routes.ts`**
   - Limitación de concurrencia de queries (batches de 2)
   - Logging de pool metrics
   - Logging de Redis

2. **`server/storage.ts`**
   - Optimización de `getRiskStats()` con agregación SQL

3. **Documentación:**
   - `API_RISKS_PAGE_DATA_LITE.md` - Documentación del endpoint
   - `OPTIMIZACIONES_PAGE_DATA_LITE.md` - Guía completa de optimizaciones
   - `docs/QUICK-FIX-POOL-STARVATION.md` - Guía rápida de fix
   - `docs/PERFORMANCE-OPTIMIZATION.md` - Actualizado
   - `docs/OPTIMIZATION-SUMMARY.md` - Actualizado
   - `docs/ARQUITECTURA_TECNICA.md` - Actualizado
   - `README.md` - Actualizado

---

## 🔍 Cómo Verificar el Fix

### 1. Revisar Logs
```bash
# Buscar pool starvation
gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.poolWaiting>0" --limit=20

# Buscar requests lentos
gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.total>5000" --limit=20
```

### 2. Medir Tiempo de Endpoint
```bash
curl -w "\nTime: %{time_total}s\n" \
  https://unigrc-backend.run.app/api/risks/page-data-lite
```

### 3. Verificar Pool Metrics en Logs
Buscar en logs:
```
[page-data-lite] Pool metrics BEFORE queries
[page-data-lite] Batch X completed
[page-data-lite] Pool metrics AFTER queries
```

---

## ✅ Checklist de Implementación

- [x] ✅ Limitación de concurrencia de queries (batches de 2)
- [x] ✅ Logging de pool metrics antes/después
- [x] ✅ Optimización de getRiskStats() con agregación SQL
- [x] ✅ Logging detallado de Redis
- [x] ✅ Verificación de singleton del pool
- [x] ✅ Documentación completa
- [ ] ⚠️ **PENDIENTE:** Ajustar `concurrency` en Cloud Run a 1-2
- [ ] ⚠️ **OPCIONAL:** Aplicar índices SQL (ver `migrations/add_indexes_page_data_lite.sql`)

---

## 📚 Documentación Relacionada

- [Guía Rápida de Fix](./QUICK-FIX-POOL-STARVATION.md) - Instrucciones paso a paso
- [Optimizaciones Detalladas](../OPTIMIZACIONES_PAGE_DATA_LITE.md) - Guía completa
- [API Documentation](../API_RISKS_PAGE_DATA_LITE.md) - Documentación del endpoint
- [Performance Optimization](./PERFORMANCE-OPTIMIZATION.md) - Guía general

---

**Estado:** ✅ **Optimizaciones implementadas, requiere ajuste de concurrency en Cloud Run**  
**Impacto Esperado:** 🚀 **Reducción de 88-195s a <5s**  
**Última Actualización:** Diciembre 2024
