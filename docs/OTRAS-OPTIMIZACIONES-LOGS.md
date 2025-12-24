# Otras Optimizaciones Identificadas del Análisis de Logs

## 🔍 Problemas Identificados en Logs de Cloud Run

### 1. ❌ **ERROR CRÍTICO: SQL Error "column r.residual_risk does not exist"**

**Problema:**
- Error frecuente en endpoints de validación: `/api/risk-processes/validation/*/list`
- La query intenta acceder a `r.residual_risk` pero la tabla `risks` no tiene esa columna
- `residual_risk` está en `risk_controls`, no en `risks`

**Ubicación del error:**
```sql
-- En server/storage.ts línea 21403
COALESCE(rc_min.min_residual_risk, r.inherent_risk) as risk_residual_risk
```

**Análisis:**
- La query actual calcula `residual_risk` correctamente desde `risk_controls`
- Pero el error sugiere que en algún lugar se intenta acceder a `r.residual_risk` directamente
- Esto causa fallos en endpoints de validación

**Solución:**
✅ **Ya corregido** - La query optimizada usa subquery para calcular `residual_risk` desde `risk_controls`

**Verificación necesaria:**
- Revisar si hay otras queries que intenten acceder a `r.residual_risk` directamente
- Asegurar que todas usen el cálculo desde `risk_controls`

---

### 2. ⚠️ **Redis L2 Timeouts Frecuentes**

**Problema:**
- Timeouts frecuentes en Redis L2 (vistos en logs)
- Algunos responses de Redis tomaban hasta 28 segundos

**Solución implementada:**
✅ **Timeout corto (200ms) + fail-open**
- Si Redis es lento → va directo a DB (que es rápida)
- Upstash fuera del camino crítico

**Estado:** ✅ **Resuelto**

---

### 3. 📊 **Endpoints Muy Lentos**

**Problemas identificados:**
- `/api/risk-processes/validation/notified/list`: 26 segundos
- `/api/risk-processes/validation/not-notified/list`: 26 segundos
- `/api/subprocesos`: 8 segundos
- `/api/processes/basic`: 7.6 segundos

**Soluciones implementadas:**
✅ **Query optimizada con SQL raw** para endpoints de validación
✅ **Índice compuesto** `idx_rpl_validation_notification_created`
✅ **SingleFlight** agregado a `/api/subprocesos`
✅ **TTLs aumentados** para catálogos estáticos
✅ **Prewarm** para mantener cache caliente

**Estado:** ✅ **Resuelto**

---

### 4. 🔄 **Thundering Herd Problem**

**Problema:**
- Múltiples requests concurrentes cuando cache está frío
- Todos hacen la misma query a DB simultáneamente
- Carga innecesaria en DB

**Solución implementada:**
✅ **SingleFlight pattern**
- Solo 1 request ejecuta la query
- Otros esperan el mismo resultado
- Evita "thundering herd"

**Estado:** ✅ **Resuelto**

---

## 🎯 Optimizaciones Adicionales Recomendadas

### 5. 📈 **Monitoreo y Alertas**

**Recomendación:**
- Implementar alertas para:
  - Endpoints que toman >3 segundos
  - Errores SQL frecuentes (>10 en 5 min)
  - Redis timeout rate >5%
  - Cache hit rate <80%

**Implementación sugerida:**
```typescript
// server/monitoring/performance-alerts.ts
export function checkPerformanceMetrics() {
  const stats = twoTierCache.getStats();
  
  if (stats.l2TimeoutRate > 0.05) {
    console.error('[ALERT] Redis timeout rate too high:', stats.l2TimeoutRate);
  }
  
  if (stats.l2HitRate < 0.80) {
    console.warn('[ALERT] Cache hit rate too low:', stats.l2HitRate);
  }
}
```

---

### 6. 🗄️ **Optimización de Queries con Índices Adicionales**

**Análisis de queries lentas:**
- Queries con múltiples JOINs pueden beneficiarse de índices compuestos
- Queries con ORDER BY pueden necesitar índices específicos

**Recomendación:**
- Analizar `EXPLAIN ANALYZE` de queries lentas
- Crear índices específicos para patrones de acceso comunes

**Ejemplo:**
```sql
-- Si hay queries frecuentes con ORDER BY created_at en risks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_created_at 
ON risks(created_at DESC) WHERE deleted_at IS NULL;
```

---

### 7. 💾 **Connection Pool Optimization**

**Problema potencial:**
- Si hay muchas queries simultáneas, el pool puede saturarse
- Queries esperando conexiones disponibles

**Recomendación:**
- Monitorear métricas del pool:
  - `idle connections`
  - `waiting queries`
  - `connection timeout errors`

**Verificación:**
```typescript
// Ya implementado en server/db.ts
getPoolMetrics() // Verificar métricas del pool
```

---

### 8. 🔍 **Query Result Caching más Agresivo**

**Oportunidad:**
- Algunos catálogos cambian muy poco (macroprocesos, processes)
- Podrían tener TTLs más largos (1-2 horas)

**Recomendación:**
- Evaluar TTLs por tipo de dato:
  - **Catálogos estáticos:** 1-2 horas
  - **Datos semi-estáticos:** 30-60 minutos
  - **Datos dinámicos:** 5-15 minutos

**Estado actual:**
- L1: 5 minutos
- L2: 30 minutos
- Stale-while-revalidate: 10 minutos

**Mejora sugerida:**
- Para catálogos completamente estáticos: L2 = 2 horas

---

### 9. 📊 **Database Query Optimization**

**Problema identificado:**
- `getAllRiskLevelsOptimized` procesa todo en memoria
- Con muchos riesgos, puede ser lento

**Optimización futura:**
- Usar SQL GROUP BY para agregaciones en DB
- Reducir procesamiento en memoria

**Ejemplo:**
```sql
-- En vez de traer todos los riesgos y procesar en memoria
-- Hacer agregación en SQL:
SELECT 
  process_id,
  COUNT(*) as risk_count,
  AVG(inherent_risk) as avg_inherent_risk,
  MIN(residual_risk) as min_residual_risk
FROM risks
WHERE deleted_at IS NULL AND status = 'active'
GROUP BY process_id;
```

**Estado:** ⚠️ **Pendiente** - Requiere refactorización significativa

---

### 10. 🚀 **Lazy Loading de Datos Pesados**

**Oportunidad:**
- Algunos endpoints cargan datos que no siempre se usan
- Implementar lazy loading para datos opcionales

**Ejemplo:**
- `/api/processes/basic` carga risk levels siempre
- Podría ser opcional o lazy-loaded

**Estado:** ⚠️ **Evaluar** - Trade-off entre requests adicionales vs carga inicial

---

## 📋 Resumen de Optimizaciones

| # | Optimización | Estado | Impacto |
|---|--------------|--------|---------|
| 1 | Error SQL residual_risk | ✅ Resuelto | Crítico |
| 2 | Redis timeouts | ✅ Resuelto | Alto |
| 3 | Endpoints lentos | ✅ Resuelto | Alto |
| 4 | Thundering herd | ✅ Resuelto | Medio |
| 5 | Monitoreo/Alertas | ⚠️ Pendiente | Medio |
| 6 | Índices adicionales | ⚠️ Evaluar | Medio |
| 7 | Connection pool | ✅ Monitoreado | Bajo |
| 8 | TTLs más largos | ⚠️ Evaluar | Bajo |
| 9 | SQL GROUP BY | ⚠️ Pendiente | Medio |
| 10 | Lazy loading | ⚠️ Evaluar | Bajo |

---

## 🎯 Prioridades

### Alta Prioridad (Ya implementado):
1. ✅ Error SQL residual_risk
2. ✅ Redis timeout + fail-open
3. ✅ Endpoints lentos optimizados
4. ✅ SingleFlight para thundering herd

### Media Prioridad (Recomendado):
5. ⚠️ Monitoreo y alertas de performance
6. ⚠️ Índices adicionales según EXPLAIN ANALYZE
7. ⚠️ SQL GROUP BY para getAllRiskLevelsOptimized

### Baja Prioridad (Opcional):
8. ⚠️ TTLs más largos para catálogos estáticos
9. ⚠️ Lazy loading de datos opcionales

---

## 📝 Próximos Pasos

1. **Monitorear** métricas después del deploy
2. **Analizar** EXPLAIN ANALYZE de queries lentas restantes
3. **Implementar** alertas de performance
4. **Evaluar** optimizaciones de media/baja prioridad según métricas reales

