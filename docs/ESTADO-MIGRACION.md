# Estado de la Migración risk_list_view

## ✅ Migración Ejecutada Exitosamente

**Fecha:** $(date)
**Registros en vista:** 38 riesgos

## Verificación

### 1. Vista Materializada
- ✅ `risk_list_view` creada
- ✅ Contiene 38 riesgos
- ✅ Datos denormalizados correctos

### 2. Índices Creados
Deberías tener estos índices:

```sql
SELECT indexname FROM pg_indexes WHERE tablename = 'risk_list_view' ORDER BY indexname;
```

**Índices esperados:**
- `ux_risk_list_view_id` (único, requerido para CONCURRENTLY)
- `idx_risk_list_view_status`
- `idx_risk_list_view_macroproceso`
- `idx_risk_list_view_process`
- `idx_risk_list_view_subproceso`
- `idx_risk_list_view_created_at`
- `idx_risk_list_view_search` (full-text)
- `idx_risk_list_view_filters` (compuesto)

### 3. Prueba Rápida

```sql
-- Verificar que la vista tiene datos
SELECT COUNT(*) FROM risk_list_view;
-- Resultado esperado: 38

-- Ver un registro de ejemplo
SELECT 
  id, code, name, status,
  control_count, avg_effectiveness,
  residual_risk_approx
FROM risk_list_view
LIMIT 1;
```

## Próximos Pasos

### 1. Reiniciar el Servidor

El servicio de refresh se activará automáticamente:

```bash
npm run dev  # o npm start
```

**Logs esperados:**
```
[RiskListViewRefresh] Starting refresh service...
[RiskListViewRefresh] Interval: 5 minutes
[RiskListViewRefresh] Service started - will check and refresh every 5 minutes
```

### 2. Probar el Endpoint

```bash
# Desde terminal
curl http://localhost:5000/api/pages/risks?limit=25&offset=0

# O desde navegador (con autenticación)
http://localhost:5000/api/pages/risks?limit=25&offset=0
```

**Respuesta esperada:**
- `risks.data`: Array con riesgos
- `risks.pagination.total`: 38 (o el total real)
- `counts`: Estadísticas agregadas
- `catalogs`: Catálogos mínimos
- `relations`: Relaciones lite
- `_meta.duration`: <500ms (con cache) o <2s (sin cache)

### 3. Monitorear

**Logs a observar:**
```
[PERF] /api/pages/risks COMPLETE in 150ms
[CACHE HIT] pages:risks:...
[RiskListViewRefresh] risk_list_view is fresh, skipping refresh
```

**Cuando cambies un riesgo:**
```
[CACHE] Failed to invalidate risk_list_view
[RiskListViewRefresh] risk_list_view is stale, refreshing...
[JOB] risk_list_view refreshed in 1234ms
```

## Troubleshooting

### Si el endpoint no funciona

1. Verifica que el servidor está corriendo
2. Verifica que la vista tiene datos: `SELECT COUNT(*) FROM risk_list_view;`
3. Revisa logs del servidor para errores

### Si la vista no se actualiza

1. Verifica que el servicio está corriendo (logs al iniciar)
2. Crea/actualiza un riesgo y verifica logs de invalidación
3. Fuerza refresh manual si es necesario:
   ```sql
   REFRESH MATERIALIZED VIEW CONCURRENTLY risk_list_view;
   ```

## Estado Actual

- ✅ Migración SQL: **COMPLETADA** (38 registros)
- ⏳ Servidor: **Necesita reiniciarse**
- ⏳ Endpoint: **Listo para probar**
- ⏳ Frontend: **Puede migrar cuando esté listo**

