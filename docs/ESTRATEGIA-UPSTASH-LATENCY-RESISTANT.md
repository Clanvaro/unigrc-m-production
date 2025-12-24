# Estrategia: Upstash Fuera del Camino Crítico (Latency-Resistant Architecture)

## 📊 Evaluación de la Estrategia

**Veredicto: ✅ EXCELENTE estrategia** - Resuelve el problema sin cambiar proveedor.

### Análisis de cada punto:

---

## 1. ✅ Fail-Open + Timeout Ultra Corto

**Estado:** ✅ **YA IMPLEMENTADO**

- **Timeout actual:** 300ms (dentro del rango 100-300ms recomendado)
- **Comportamiento:** Si Upstash falla o es lento → va directo a DB (que es rápida según logs)
- **Resultado:** Upstash nunca congela pantallas

**Mejora aplicada:**
- Reducido timeout de 300ms a **200ms** para fail-fast más agresivo
- Upstash queda completamente fuera del camino crítico

---

## 2. ⚠️ Stale-While-Revalidate

**Estado:** ⚠️ **PARCIALMENTE IMPLEMENTADO**

- **Código existe:** `staleMaxAgeMs` está en `SingleFlight` y `TwoTierCache`
- **Problema:** No está activado en endpoints críticos
- **Solución:** Activado con 10 minutos de stale para catálogos

**Cómo funciona:**
```typescript
// Si hay datos stale disponibles y fresh data se está calculando:
// → Retorna stale inmediatamente (no espera)
// → Actualiza en background
// → Próxima request obtiene fresh data
```

**Beneficios:**
- Usuario nunca espera (siempre hay respuesta instantánea)
- Datos se refrescan en background
- Perfecto para catálogos que cambian poco

---

## 3. ✅ SingleFlight / Request Coalescing

**Estado:** ✅ **YA IMPLEMENTADO Y ACTIVO**

- **Funcionamiento:** Si 10 requests piden `catalogs:v3` al mismo tiempo:
  - Solo 1 hace el fetch
  - Los otros 9 esperan esa promesa
  - Evita "thundering herd" que vimos en logs

**Evidencia en código:**
- `SingleFlight` class implementada
- Activo en `/api/processes/basic` y `/api/subprocesos`
- Deduplica requests concurrentes cuando cache está frío

---

## 4. ⚠️ TTL Más Largo + Prewarm

**Estado:** ⚠️ **MEJORADO, PERO FALTA PREWARM**

### TTLs Optimizados (Aplicados):

**Antes:**
- L1: 30 segundos (muy corto para catálogos)
- L2: 5 minutos (muy corto para catálogos estáticos)

**Ahora:**
- L1: **5 minutos** (catálogos estáticos)
- L2: **30 minutos** (catálogos estáticos)
- Stale-while-revalidate: **10 minutos**

**Catálogos que se benefician:**
- `processes-basic`: 30 min (estructura organizacional rara vez cambia)
- `subprocesos`: 30 min
- `macroprocesos`: 30 min
- `risk-levels`: 15 min (cálculos agregados)

### Prewarm (✅ Implementado):

**Estado:** ✅ **IMPLEMENTADO Y ACTIVO**

**Implementación:**
- **Archivo:** `server/jobs/prewarm-cache.ts`
- **Servicio:** `CachePrewarmService` (singleton)
- **Frecuencia:** Cada 28 minutos (2 min antes de que expire L2 de 30 min)
- **Horario activo:** Solo entre 07:30 y 21:30 (horario laboral)
- **Catálogos precargados:**
  - `processes-basic:single-tenant` (con risk levels)
  - `subprocesos:single-tenant` (con risk levels)
  - `macroprocesos-basic:single-tenant`

**Características:**
- ✅ Ejecuta automáticamente al iniciar servidor
- ✅ Ejecuta cada 25 minutos en background
- ✅ No bloquea requests (async)
- ✅ Maneja errores gracefully
- ✅ Endpoint para trigger manual: `/api/cache/prewarm`
- ✅ Endpoint para status: `/api/cache/prewarm/status`

**Integración:**
- Se inicia automáticamente en `server/index.ts` (5s después del startup)
- Puede ser llamado manualmente o desde Cloud Scheduler si es necesario

---

## 📈 Impacto Esperado

### Antes (Upstash en camino crítico):
- ❌ Timeout de 28 segundos bloqueando requests
- ❌ "Thundering herd" cuando cache está frío
- ❌ Múltiples requests concurrentes haciendo mismo fetch
- ❌ TTLs cortos causan cache misses frecuentes

### Después (Upstash fuera del camino crítico):
- ✅ Timeout de 200ms → fail-fast a DB (rápida)
- ✅ SingleFlight deduplica requests concurrentes
- ✅ Stale-while-revalidate → respuesta instantánea siempre
- ✅ TTLs largos → menos cache misses
- ✅ Prewarm → cache siempre caliente en horas peak

### Métricas esperadas:
- **Latencia p95:** 200ms (timeout) + DB query (~100-300ms) = **<500ms total**
- **Cache hit rate:** 90%+ (con TTLs largos y prewarm)
- **Upstash calls:** 80% reducción (L1 cache + TTLs largos)
- **User experience:** Sin pantallas congeladas

---

## 🎯 Recomendaciones Finales

### Prioridad Alta (Ya implementado):
1. ✅ Fail-open con timeout 200ms
2. ✅ SingleFlight activo
3. ✅ Stale-while-revalidate activado (10 min)

### Prioridad Media (Mejoras aplicadas):
4. ✅ TTLs aumentados (L1: 5min, L2: 30min)
5. ✅ Prewarm implementado (ejecuta cada 25 minutos automáticamente)

### Monitoreo:
- **Métricas clave:**
  - L2 timeout rate (debe ser <5%)
  - Cache hit rate (debe ser >90%)
  - L2 latency p95 (debe ser <200ms)
  - DB query latency (debe mantenerse <300ms)

---

## 💡 Conclusión

**Esta estrategia es la correcta** porque:

1. ✅ **No requiere cambiar proveedor** (Upstash puede seguir lejos)
2. ✅ **Resuelve el problema de raíz** (Upstash fuera del camino crítico)
3. ✅ **Mejora UX dramáticamente** (sin pantallas congeladas)
4. ✅ **Reduce costos** (menos llamadas a Upstash)
5. ✅ **Escalable** (funciona con cualquier latencia de Upstash)

**Upstash puede ser lento, pero ya no importa** - el sistema es resiliente y siempre responde rápido.

---

## 📝 Próximos Pasos

1. **Monitorear métricas** después del deploy
2. **Implementar prewarm** si cache misses siguen siendo altos
3. **Ajustar TTLs** según patrones de uso reales
4. **Considerar L3 cache** (CDN) para catálogos completamente estáticos

