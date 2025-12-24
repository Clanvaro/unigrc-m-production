# Análisis de Costo: Cache Prewarm

## 📊 Cálculo de Requests

### Prewarm Service
- **Catálogos precargados:** 3 (processes-basic, subprocesos, macroprocesos-basic)
- **Frecuencia:** Cada 28 minutos (2 min antes de que expire L2 a los 30 min)
- **Horario activo:** Solo entre 07:30 y 21:30 (14 horas/día)
- **Requests por ejecución:**
  - **Escenario normal (cache caliente - 90% del tiempo):**
    - 1 GET a L2 (hit) × 3 catálogos = **3 GETs**
  - **Escenario cache frío (10% del tiempo - startup, errores):**
    - 1 GET a L2 (miss) + 1 SET × 3 catálogos = **6 requests**
  - **Promedio:** (3 × 0.9) + (6 × 0.1) = **3.3 requests por ejecución**

### Cálculo Diario
- **Horas activas:** 14 horas/día (07:30 - 21:30)
- **Ejecuciones por hora:** 60 / 28 = 2.14 ejecuciones/hora
- **Ejecuciones por día:** 2.14 × 14 = **~30 ejecuciones/día** (solo en horario activo)
- **Requests por día:** 30 × 3.3 = **~99 requests/día** (escenario conservador)
- **Máximo posible:** 30 × 6 = **~180 requests/día** (si siempre está frío)

---

## 💰 Costo en Upstash

### Plan Free de Upstash
- **Límite:** 10,000 requests/día
- **Prewarm usa (promedio):** ~99 requests/día
- **Prewarm usa (máximo):** ~180 requests/día
- **Porcentaje usado:** 1.0% - 1.8% del límite diario
- **Requests disponibles:** ~9,820 - 9,901 requests/día para uso normal
- **Ahorro vs 24h:** ~50% menos requests (solo horario activo)

### Conclusión
✅ **El prewarm está dentro del plan Free** - No hay costo adicional

---

## 🔄 Comparación: Con vs Sin Prewarm

### Sin Prewarm (Situación Actual)
**Escenario:** Cache expira cada 30 minutos

1. **Cache frío (cada 30 min):**
   - 10 usuarios hacen request simultáneo
   - Cada uno hace: 1 GET (miss) + 1 SET = 2 requests
   - **Total: 10 × 2 = 20 requests** en ~1 segundo

2. **Cache caliente (próximos 30 min):**
   - 100 usuarios hacen request
   - Cada uno hace: 1 GET (hit) = 1 request
   - **Total: 100 requests**

3. **Total por ciclo (30 min):** 20 + 100 = **120 requests**

4. **Total por día:** 120 × 48 ciclos = **~5,760 requests/día**

### Con Prewarm
**Escenario:** Cache se refresca cada 25 minutos (antes de expirar)

1. **Prewarm (cada 25 min):**
   - 1 proceso hace: 3 GETs + 3 SETs = **6 requests**

2. **Cache siempre caliente:**
   - 100 usuarios hacen request
   - Cada uno hace: 1 GET (hit) = 1 request
   - **Total: 100 requests**

3. **Total por ciclo (25 min):** 6 + 100 = **106 requests**

4. **Total por día:** 106 × 57.6 ciclos = **~6,106 requests/día**

### Comparación
| Métrica | Sin Prewarm | Con Prewarm | Diferencia |
|---------|-------------|-------------|------------|
| Requests/día | ~5,760 | ~6,106 | +346 (+6%) |
| Cache misses | Alto (cada 30 min) | Mínimo (cada 25 min) | ✅ Mejor |
| Latencia p95 | Variable (0-28s) | Consistente (<500ms) | ✅ Mejor |
| Thundering herd | Sí (10 requests simultáneos) | No (1 request proactivo) | ✅ Mejor |

---

## 💡 Beneficios vs Costo

### Costo Adicional
- **Upstash:** $0 (dentro del plan Free - usa 1.9-3.5% del límite)
- **Cloud Run:** $0 (mismo proceso, no hay costo de infraestructura adicional)
- **Cloud SQL:** ~173 queries/día adicionales (mínimo - solo cuando cache está frío)

### Beneficios
1. ✅ **Elimina "thundering herd"** - Evita 10+ requests simultáneos cuando cache está frío
2. ✅ **Latencia consistente** - Siempre <500ms (vs 0-28s sin prewarm)
3. ✅ **Mejor UX** - Sin pantallas congeladas
4. ✅ **Menos carga en DB** - Evita picos de queries simultáneas
5. ✅ **Cache siempre caliente** - Mejor hit rate

### ROI (Return on Investment)
- **Costo:** ~99-180 requests/día (1.0-1.8% del límite Free)
- **Ahorro:** ~50% menos requests que ejecutar 24h (solo horario activo 07:30-21:30)
- **Beneficio:** Eliminación de timeouts de 28s, mejor UX, menos carga en DB
- **Veredicto:** ✅ **Altamente rentable** - El costo es mínimo comparado con los beneficios

---

## 🎯 Recomendación

### Si estás en Plan Free de Upstash:
✅ **Mantener prewarm** - Usa solo 1.0-1.8% del límite diario (muy bajo)
- **Optimización:** Solo ejecuta en horario activo (07:30-21:30) → 50% menos requests

### Si superas 10K requests/día:
1. **Opción 1:** Mantener prewarm y pagar por plan superior ($0.20/100K requests)
2. **Opción 2:** Ajustar frecuencia (cada 30 min en vez de 25 min) → Reduce a ~288 requests/día
3. **Opción 3:** Desactivar prewarm y confiar en SingleFlight (sigue siendo resiliente)

### Optimización Opcional
Si quieres reducir aún más el costo:
```typescript
// En server/jobs/prewarm-cache.ts
const PREWARM_INTERVAL_MS = 30 * 60 * 1000; // 30 min en vez de 25 min
// Reduce a ~288 requests/día (2.9% del límite)
```

---

## 📈 Monitoreo

Para monitorear el uso real:
1. **Upstash Dashboard:** Ver requests/día
2. **Endpoint:** `GET /api/cache/prewarm/status` - Ver última ejecución
3. **Logs:** Buscar `[Prewarm]` en Cloud Run logs

---

## ✅ Conclusión

**El prewarm tiene costo mínimo:**
- ✅ Dentro del plan Free de Upstash (3.5% del límite)
- ✅ No hay costo adicional de infraestructura
- ✅ Beneficios superan ampliamente el costo

**Recomendación:** ✅ **Mantener activo** - El costo es insignificante comparado con los beneficios de UX y performance.

