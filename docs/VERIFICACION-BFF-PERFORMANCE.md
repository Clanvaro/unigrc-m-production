# Verificación de Performance del BFF + Read-Model

## Problemas Identificados y Solucionados

### ✅ Problema 1: Query Legacy del Header
**Síntoma:** Requests a `/api/risks/page-data-lite` tomando 5.78s y 2.5 min

**Causa:** El header estaba haciendo queries a `page-data-lite` cuando estaba en `/risks`, duplicando llamadas.

**Solución:** Deshabilitada la query del header (`enabled: false`) ya que la página de riesgos usa el endpoint BFF `/api/pages/risks`.

### ✅ Problema 2: getRelationsLite usando tabla risks
**Síntoma:** Queries lentas en `getRelationsLite`

**Causa:** Estaba consultando la tabla `risks` en lugar de usar `risk_list_view`.

**Solución:** Cambiado para usar `risk_list_view` para obtener los IDs de riesgos.

### ✅ Problema 3: Falta de logs de performance
**Síntoma:** No se podía diagnosticar dónde estaba la lentitud

**Solución:** Agregados logs de performance en:
- `getRisksFromReadModel()` - Muestra tiempo de query si > 1s
- `/api/pages/risks` - Muestra tiempo total de fetch

## Cómo Verificar que Funciona

### 1. Verificar que el endpoint BFF está siendo usado

**En DevTools → Network:**
- Deberías ver 1 request a `/api/pages/risks` (no `/api/risks/page-data-lite`)
- El tiempo debería ser < 2s (sin cache) o < 500ms (con cache)

### 2. Verificar logs del servidor

**Logs esperados:**
```
[PERF] /api/pages/risks data fetch: 150ms (risks: 25, total: 38)
[PERF] /api/pages/risks COMPLETE in 200ms
```

**Si ves warnings:**
```
[PERF] Slow query in getRisksFromReadModel: 1500ms (limit: 25, offset: 0, filters: 2)
```
Significa que la query está lenta y necesita optimización.

### 3. Verificar que la vista materializada existe

```sql
SELECT COUNT(*) FROM risk_list_view;
-- Debería retornar el número de riesgos (38 en tu caso)
```

### 4. Verificar índices

```sql
SELECT indexname FROM pg_indexes WHERE tablename = 'risk_list_view';
-- Deberías ver al menos:
-- - ux_risk_list_view_id (único, requerido para CONCURRENTLY)
-- - idx_risk_list_view_status
-- - idx_risk_list_view_created_at
```

## Troubleshooting

### Si la carga sigue siendo lenta

1. **Verificar logs del servidor:**
   - Busca `[PERF]` en los logs
   - Identifica qué query está lenta

2. **Verificar que la vista está actualizada:**
   ```sql
   SELECT materialized_at FROM risk_list_view LIMIT 1;
   -- Debería ser reciente (últimos 5 minutos si el servicio está corriendo)
   ```

3. **Forzar refresh de la vista:**
   ```sql
   REFRESH MATERIALIZED VIEW CONCURRENTLY risk_list_view;
   ```

4. **Verificar que no hay queries bloqueantes:**
   ```sql
   SELECT pid, state, query, query_start 
   FROM pg_stat_activity 
   WHERE state = 'active' AND query LIKE '%risk_list_view%';
   ```

### Si ves errores de "relation does not exist"

La vista materializada no se creó. Ejecuta:
```bash
npm run apply-risk-list-view
```

### Si el endpoint no responde

1. Verifica que el servidor está corriendo
2. Verifica logs del servidor para errores
3. Verifica que `risk_list_view` existe en la base de datos

## Métricas Esperadas

| Escenario | Tiempo Esperado |
|-----------|----------------|
| Primera carga (sin cache) | < 2s |
| Con cache (L1) | < 100ms |
| Con cache (L2/Redis) | < 500ms |
| Query a risk_list_view | < 200ms |
| Query a getRelationsLite | < 300ms |

## Próximos Pasos

Si después de estos cambios sigue siendo lento:

1. Verificar logs de performance para identificar el cuello de botella
2. Considerar agregar más índices a `risk_list_view`
3. Verificar que el servicio de refresh está corriendo
4. Considerar aumentar el TTL del cache

