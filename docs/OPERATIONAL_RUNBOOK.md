# Runbook Operacional - Base de Datos PostgreSQL

**Última actualización**: 23 de Noviembre, 2025  
**Versión**: 1.0  
**Propósito**: Guía para diagnosticar y resolver problemas comunes de base de datos en producción

---

## 📊 Monitoreo y Diagnóstico

### Endpoints de Salud

**Health Check Completo**
```bash
curl https://tu-app.replit.app/health
```

Respuesta esperada cuando está saludable:
```json
{
  "status": "healthy",
  "services": {
    "database": "up",
    "objectStorage": "up"
  },
  "poolMetrics": {
    "totalConnections": 2,
    "idleConnections": 1,
    "waitingQueries": 0,
    "maxConnections": 10,
    "utilizationPct": 20,
    "status": "normal"
  }
}
```

**Readiness Check (¿Puede recibir tráfico?)**
```bash
curl https://tu-app.replit.app/readiness
```

### Interpretación de Métricas del Pool

| Métrica | Valor Normal | Precaución | Crítico |
|---------|--------------|------------|---------|
| **utilizationPct** | < 60% | 60-80% | > 80% |
| **waitingQueries** | 0-2 | 3-5 | > 5 |
| **status** | normal | high | saturated |

---

## 🚨 Problemas Comunes y Soluciones

### 1. Connection Timeout Errors

**Síntomas**:
```
❌ Connection terminated due to connection timeout
Error: timeout exceeded when trying to connect
```

**Causas Comunes**:
- Pool saturado (todas las conexiones ocupadas)
- Queries lentas bloqueando conexiones
- Spike repentino de tráfico
- Problema con Neon (región caída)

**Diagnóstico**:
1. Verificar métricas del pool en `/health`
2. Revisar logs para queries lentas (>10 segundos)
3. Comprobar si `waitingQueries > 5`

**Solución Inmediata**:
```bash
# 1. Verificar estado del pool
curl https://tu-app.replit.app/health | jq '.poolMetrics'

# 2. Si pool está saturado, reiniciar la app (libera conexiones)
# En Replit: Ir a "Tools" > "Restart"

# 3. Verificar que se recuperó
curl https://tu-app.replit.app/readiness
```

**Solución a Largo Plazo**:
- Si ocurre frecuentemente: Aumentar `max` connections en `server/db.ts` (actualmente 10)
- Optimizar queries lentas identificadas en logs
- Considerar cacheo adicional para endpoints populares

---

### 2. Pool Saturation (Saturación del Pool)

**Síntomas**:
```
⚠️ HIGH POOL SATURATION: 90% (9/10)
⚠️ CONNECTION QUEUE BUILD-UP: 8 queries waiting
```

**Causas**:
- Muchas queries ejecutándose simultáneamente
- Queries lentas no terminan y bloquean el pool
- Pico de usuarios concurrentes

**Diagnóstico**:
```bash
# Ver métricas en tiempo real
curl https://tu-app.replit.app/health | jq '.poolMetrics'

# Buscar queries lentas en los logs
# En Replit Console, buscar: "⚠️ Slow query detected"
```

**Solución**:
1. **Inmediata**: Reiniciar app para limpiar pool
2. **Corto plazo**: Identificar y optimizar queries lentas
3. **Largo plazo**: 
   - Agregar índices faltantes
   - Implementar más cacheo
   - Aumentar max connections si hardware lo soporta

---

### 3. Database Connection Failure

**Síntomas**:
```
❌ Database pool error: connection refused
services: { database: "down" }
```

**Causas**:
- Credenciales incorrectas
- Neon en mantenimiento
- Red bloqueada
- Variable `POOLED_DATABASE_URL` no configurada

**Diagnóstico**:
```bash
# 1. Verificar variables de entorno
env | grep DATABASE_URL

# 2. Intentar conexión directa
psql $POOLED_DATABASE_URL -c "SELECT 1;"
```

**Solución**:
1. Verificar `POOLED_DATABASE_URL` está configurada en Secrets
2. Probar conexión desde Replit Shell: `psql $POOLED_DATABASE_URL`
3. Si Neon está caído, esperar o contactar soporte de Neon
4. Verificar que no hay restricciones de IP

---

### 4. Slow Query Performance

**Síntomas**:
```
⚠️ Slow query detected (15234ms): SELECT * FROM risks WHERE...
```

**Diagnóstico**:
1. Revisar logs para identificar query lenta
2. Analizar con `EXPLAIN ANALYZE`:
```sql
EXPLAIN ANALYZE
SELECT * FROM risks WHERE tenant_id = '123' AND deleted_at IS NULL;
```

**Solución**:
1. **Agregar índices faltantes**:
```sql
-- Para queries con tenant_id y deleted_at
CREATE INDEX CONCURRENTLY idx_table_tenant_active 
ON table_name (tenant_id, deleted_at) 
WHERE deleted_at IS NULL;
```

2. **Optimizar query**:
   - Evitar `SELECT *`, usar columnas específicas
   - Agregar condiciones WHERE más restrictivas
   - Usar JOINs en vez de múltiples queries

3. **Implementar cacheo**:
   - Usar `distributedCache` para datos que no cambian frecuentemente
   - TTL recomendado: 5 minutos para datos "calientes"

---

### 5. Transaction Rollback Errors

**Síntomas**:
```
❌ Transaction rolled back due to error
code: '40001' - serialization_failure
code: '40P01' - deadlock_detected
```

**Causas**:
- Conflictos de concurrencia (dos usuarios modifican mismo registro)
- Deadlock (dos transacciones esperándose mutuamente)

**Solución**:
- Sistema automáticamente reintenta (ver `withRetry` en `server/db.ts`)
- Si persiste: Revisar lógica de transacciones para reducir tiempo de lock
- Usar `SELECT FOR UPDATE NOWAIT` para fallar rápido en vez de esperar

---

### 6. Memory Issues

**Síntomas**:
```
memory: { heapUsed: 950, heapTotal: 1024 }  // >90% usado
JavaScript heap out of memory
```

**Diagnóstico**:
```bash
curl https://tu-app.replit.app/health | jq '.deployment.memory'
```

**Solución Inmediata**:
1. Reiniciar app para liberar memoria
2. Verificar que no hay memory leaks en queries grandes

**Solución a Largo Plazo**:
- Implementar paginación en endpoints que retornan muchos registros
- Usar streaming para exports grandes
- Aumentar `--max-old-space-size` si es necesario (actualmente 1024MB)

---

## 🔍 Comandos Útiles de Diagnóstico

### Verificar Estado del Sistema
```bash
# Estado general
curl https://tu-app.replit.app/health | jq

# ¿Puede recibir tráfico?
curl https://tu-app.replit.app/readiness | jq

# Métricas de performance
curl https://tu-app.replit.app/metrics | jq
```

### Logs en Producción
```bash
# En Replit Console, buscar patrones:
# - Errores de conexión
"connection timeout"

# - Queries lentas
"Slow query detected"

# - Saturación del pool
"HIGH POOL SATURATION"

# - Queries en espera
"CONNECTION QUEUE BUILD-UP"
```

### Conectar a Base de Datos
```bash
# Desde Replit Shell
psql $POOLED_DATABASE_URL

# Ver conexiones activas
SELECT count(*), state FROM pg_stat_activity GROUP BY state;

# Ver queries lentas en ejecución
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE state = 'active' 
ORDER BY duration DESC;
```

---

## 📈 Umbrales y Alertas

### Umbrales Configurados

| Métrica | Warning | Critical | Acción |
|---------|---------|----------|--------|
| Pool Utilization | 80% | 90% | Logs automáticos |
| Waiting Queries | 5 | 10 | Logs automáticos |
| Query Duration | 10s | 30s | Logs automáticos |
| Memory Usage | 80% | 95% | Reiniciar |

### Logs Automáticos

El sistema genera logs cada 60 segundos con métricas del pool:
```
📊 Pool Metrics: total=3/10 (30%), idle=2, waiting=0
```

Si detecta problemas, alerta automáticamente en los logs de consola:
```
⚠️ HIGH POOL SATURATION: 90% (9/10) - Consider scaling or investigating slow queries
⚠️ CONNECTION QUEUE BUILD-UP: 8 queries waiting - Pool may be saturated
```

**Nota**: Las alertas actualmente se escriben en los logs de consola. Para producción, se recomienda configurar un sistema de alertas externo (como Sentry, DataDog, o PagerDuty) que monitoree estos logs y envíe notificaciones automáticas al equipo de operaciones.

---

## 🛠️ Configuración Actual

### Pool Configuration (server/db.ts)
```javascript
{
  max: 10,                     // Máximo 10 conexiones simultáneas
  min: 0,                      // No mantener conexiones idle
  idleTimeoutMillis: 30000,    // Cerrar idle después de 30s
  connectionTimeoutMillis: 45000, // 45s timeout para cold starts
  statement_timeout: 60000,    // Queries timeout después de 60s
  keepAlive: true              // Mantener conexiones vivas
}
```

### Retry Logic
- **Max retries**: 3 intentos
- **Base delay**: 2 segundos
- **Exponential backoff**: 2s → 4s → 8s
- **Timeout delay**: Doble (4s → 8s → 16s)

### Códigos de Error Recuperables
- `57P01` - Admin shutdown (Neon recicla conexión)
- `08006` - Connection failure
- `08001` - Unable to connect
- `08004` - Connection rejected
- `53300` - Too many connections
- Mensajes con "timeout" o "Connection terminated"

---

## 📞 Escalamiento

### Nivel 1: Auto-recuperación
- Sistema reintenta automáticamente (3 veces)
- Logs indican si se recuperó o falló definitivamente

### Nivel 2: Acción del Operador
- Revisar `/health` y `/readiness`
- Reiniciar app si es necesario
- Aplicar soluciones de este runbook

### Nivel 3: Contactar Soporte
Si problema persiste después de:
- Reiniciar app
- Verificar configuración
- Aplicar soluciones del runbook

**Información a Proveer**:
1. URL de `/health` output
2. Logs de los últimos 15 minutos
3. Timestamp exacto del problema
4. Queries lentas identificadas
5. Métricas del pool al momento del problema

---

## ✅ Checklist de Salud Diaria

- [ ] Verificar `/health` retorna 200 OK
- [ ] Pool utilization < 60%
- [ ] No queries lentas en logs (>10s)
- [ ] Memory usage < 80%
- [ ] Waiting queries = 0
- [ ] Database status = "up"
- [ ] Object storage status = "up"

---

## 🔄 Mantenimiento Preventivo

### Semanal
- Revisar logs para patterns de queries lentas
- Verificar si hay índices faltantes
- Monitorear tendencias de uso del pool

### Mensual
- Analizar métricas de performance (`/metrics`)
- Evaluar si aumentar max connections
- Revisar y limpiar logs antiguos
- Verificar integridad de backups de Neon

### Trimestral
- Revisar y actualizar este runbook
- Capacitar al equipo en nuevos procedimientos
- Evaluar necesidad de escalamiento de infraestructura

---

**Nota**: Este runbook está diseñado para operadores no técnicos. Usa lenguaje simple y proporciona comandos copy-paste cuando sea posible.
