# Guía de Performance de Cloud SQL

## Introducción

Esta guía explica cómo interpretar Query Insights y top waits de Cloud SQL para identificar problemas de conexión/pool (más que CPU) y optimizar la configuración.

## Scripts de Análisis

### 1. Query Insights

**Script**: `scripts/cloudsql-query-insights.sh`

```bash
# Configurar variables de entorno (opcional)
export GCP_PROJECT_ID=unigrc-m
export CLOUDSQL_INSTANCE_ID=unigrc-db
export GCP_REGION=southamerica-west1

# Ejecutar
./scripts/cloudsql-query-insights.sh
```

**Qué muestra**:
- Top queries por tiempo total de ejecución
- Métricas de conexiones activas por base de datos
- Queries lentas (>1s)

**Interpretación**:
- **Queries lentas frecuentes**: Optimizar índices o reescribir queries
- **Alto tiempo total**: Queries ejecutándose muchas veces (considerar cache)
- **Conexiones altas**: Posible saturación de pool

### 2. Top Waits

**Script**: `scripts/cloudsql-top-waits.sh`

```bash
./scripts/cloudsql-top-waits.sh
```

**Qué muestra**:
- **Lock waits**: Queries bloqueando otras queries
- **I/O waits**: Problemas de lectura/escritura en disco
- **Connection waits**: Pool de conexiones saturado
- **CPU waits**: Instancia sobrecargada

**Interpretación**:
- **Lock waits altos**: Revisar transacciones largas, deadlocks
- **I/O waits altos**: Considerar aumentar IOPS o optimizar queries
- **Connection waits**: **PROBLEMA DE POOL** - Aumentar `DB_POOL_MAX` o `max_connections`
- **CPU waits**: Escalar instancia o optimizar queries costosas

### 3. Análisis de Conexiones

**Script**: `scripts/cloudsql-connection-analysis.sh`

```bash
./scripts/cloudsql-connection-analysis.sh
```

**Qué muestra**:
- Información de la instancia (tier, max_connections)
- Conexiones activas por base de datos
- Promedio y máximo de conexiones
- Utilización porcentual
- Análisis de pool de conexiones

**Interpretación**:
- **Utilización > 80%**: Advertencia - considerar aumentar `max_connections`
- **Utilización > 90%**: Crítico - acción inmediata requerida
- **Pool total > max_connections**: Error - reducir `DB_POOL_MAX` o aumentar `max_connections`
- **Headroom < 10**: Advertencia - poco margen disponible

## Dashboard Interno

### Endpoint: `/api/admin/db-metrics`

**Acceso**: Solo administradores de plataforma (`requirePlatformAdmin()`)

**Cache**: 30 segundos (mínimo)

**Sin queries pesadas**: Solo usa datos en memoria

**Respuesta**:
```json
{
  "timestamp": "2025-01-XX...",
  "cached": false,
  "pool": {
    "total": 4,
    "idle": 2,
    "active": 2,
    "waiting": 0,
    "max": 4,
    "utilizationPct": 50
  },
  "stats": {
    "avgActive": 2.5,
    "avgIdle": 1.5,
    "avgWaiting": 0.1,
    "p95Active": 3,
    "p99Active": 4,
    "maxActive": 4,
    "maxWaiting": 2,
    "utilizationPct": 100
  },
  "slowQueries": [
    {
      "query": "SELECT ...",
      "duration": 5234,
      "timestamp": "2025-01-XX..."
    }
  ],
  "alerts": [
    "WARNING: Pool utilization >= 80%"
  ]
}
```

**Métricas clave**:
- **p95Active**: Percentil 95 de conexiones activas (indica picos)
- **p99Active**: Percentil 99 (picos extremos)
- **maxWaiting**: Máximo de queries esperando conexión
- **utilizationPct**: Porcentaje de utilización del pool

## Configuración del Pool

### Fórmula para Calcular Pool Size

```
pool_max = (max_connections / max_instances) * safety_factor

Donde:
- max_connections: Límite de Cloud SQL (ej: 100)
- max_instances: Máximo de instancias Cloud Run (ej: 5)
- safety_factor: 0.8 (80% para dejar margen)

Ejemplo:
pool_max = (100 / 5) * 0.8 = 16 conexiones por instancia
```

### Configuración Actual

**Archivo**: `server/db.ts`

- **PgBouncer**: `DB_POOL_MAX=10` (configurable)
- **Cloud SQL directo**: `DB_POOL_MAX=4` (configurable)
- **Render**: 20 (fijo)
- **Neon**: 6-10 (según tipo)

**Variables de entorno**:
```bash
DB_POOL_MAX=10  # Máximo de conexiones por instancia
DB_POOL_MIN=2   # Mínimo de conexiones
```

### Ajuste Basado en Métricas

1. **Si `p95Active` > `pool_max * 0.9`**:
   - Aumentar `DB_POOL_MAX`
   - Verificar que `total_pool_connections < max_connections`

2. **Si `maxWaiting` > 5 frecuentemente**:
   - Aumentar `DB_POOL_MAX`
   - Revisar slow queries que bloquean conexiones

3. **Si `utilizationPct` > 80%**:
   - Aumentar `DB_POOL_MAX` o `max_connections` en Cloud SQL
   - Optimizar queries lentas

4. **Si hay muchos timeouts**:
   - Aumentar `connectionTimeoutMillis` (actual: 60s)
   - Revisar si hay deadlocks o locks largos

## Logging de la Aplicación

### Slow Queries

**Threshold**: 5 segundos

**Logs**:
```
⚠️ SLOW QUERY (5234ms): SELECT * FROM risks WHERE...
   Pool: active=3/4, waiting=1
```

Solo se loguean queries que exceden el threshold.

### Métricas Agregadas

**Frecuencia**: Cada 5 minutos

**Logs**:
```
📊 Pool Stats (multiple samples): avgActive=2.5, p95Active=3, p99Active=4, maxWaiting=2, utilization=75%
```

### Alertas Críticas

- **Pool saturation >= 90%**: Error crítico
- **Waiting queries > 5**: Advertencia de saturación

## Troubleshooting

### Problema: Pool Saturado

**Síntomas**:
- `waitingCount` > 0 frecuentemente
- `utilizationPct` > 80%
- Timeouts de conexión

**Soluciones**:
1. Aumentar `DB_POOL_MAX` (verificar que no exceda `max_connections`)
2. Optimizar slow queries identificadas
3. Aumentar `max_connections` en Cloud SQL si es necesario
4. Revisar si hay conexiones que no se liberan correctamente

### Problema: Queries Lentas

**Síntomas**:
- Muchas slow queries en el dashboard
- Alto tiempo en `p95Active` o `p99Active`

**Soluciones**:
1. Revisar índices faltantes (usar `EXPLAIN ANALYZE`)
2. Optimizar queries con `SELECT *` → seleccionar columnas específicas
3. Agregar índices compuestos para queries frecuentes
4. Considerar cache para queries repetitivas

### Problema: Lock Waits Altos

**Síntomas**:
- Lock waits en top waits script
- Queries bloqueadas

**Soluciones**:
1. Revisar transacciones largas
2. Reducir tiempo de transacciones
3. Usar `SELECT ... FOR UPDATE SKIP LOCKED` cuando sea posible
4. Revisar deadlocks en logs

### Problema: Connection Waits

**Síntomas**:
- Connection waits en top waits script
- Pool saturado

**Soluciones**:
1. **PRIMERO**: Aumentar `DB_POOL_MAX`
2. Verificar que PgBouncer esté configurado correctamente
3. Revisar si hay conexiones que no se liberan (leaks)
4. Considerar aumentar `max_connections` en Cloud SQL

## Mejores Prácticas

1. **Monitorear regularmente**: Ejecutar scripts semanalmente
2. **Revisar dashboard**: Verificar métricas agregadas diariamente
3. **Optimizar proactivamente**: No esperar a que el pool se sature
4. **Documentar cambios**: Registrar ajustes de pool y resultados
5. **Probar en staging**: Probar cambios de configuración antes de producción

## Referencias

- [Cloud SQL Query Insights](https://cloud.google.com/sql/docs/postgres/insights)
- [PgBouncer Configuration](https://www.pgbouncer.org/config.html)
- [PostgreSQL Wait Events](https://www.postgresql.org/docs/current/monitoring-stats.html#WAIT-EVENT-TABLE)
