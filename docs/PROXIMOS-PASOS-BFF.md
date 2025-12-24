# Próximos Pasos - BFF + Read-Model

## ✅ Migración SQL Ejecutada

La vista materializada `risk_list_view` ha sido creada exitosamente.

## Pasos Siguientes

### 1. Verificar que la Migración Funcionó

Ejecuta el script de verificación:

```bash
# Si tienes DATABASE_URL configurado
npm run verify-risk-list-view

# O verifica manualmente en la consola SQL:
SELECT COUNT(*) FROM risk_list_view;
SELECT indexname FROM pg_indexes WHERE tablename = 'risk_list_view';
```

**Resultado esperado:**
- ✅ Vista materializada existe
- ✅ Índice único `ux_risk_list_view_id` existe
- ✅ Vista contiene riesgos (count > 0)
- ✅ Índices adicionales creados

### 2. Reiniciar el Servidor

El servicio de refresh se inicia automáticamente al arrancar el servidor:

```bash
# Desarrollo
npm run dev

# Producción
npm start
```

**Logs esperados:**
```
[RiskListViewRefresh] Starting refresh service...
[RiskListViewRefresh] Interval: 5 minutes
[RiskListViewRefresh] Service started - will check and refresh every 5 minutes
```

### 3. Probar el Nuevo Endpoint

El endpoint BFF está disponible en:

```
GET /api/pages/risks?limit=25&offset=0&status=active
```

**Ejemplo de request:**
```bash
curl -X GET "http://localhost:5000/api/pages/risks?limit=25&offset=0" \
  -H "Cookie: session=..."
```

**Respuesta esperada:**
```json
{
  "risks": {
    "data": [...],
    "pagination": { "limit": 25, "offset": 0, "total": 100, "hasMore": true }
  },
  "counts": {
    "total": 100,
    "byStatus": { "active": 80, "pending": 20 },
    "byLevel": { "low": 30, "medium": 40, "high": 20, "critical": 10 }
  },
  "catalogs": { ... },
  "relations": { ... },
  "_meta": { "fetchedAt": "...", "duration": 150 }
}
```

### 4. (Opcional) Actualizar Frontend

El frontend puede seguir usando `/api/risks/bootstrap` (legacy) o migrar a `/api/pages/risks`.

**Ventajas del nuevo endpoint:**
- ✅ 1 sola llamada en lugar de 5-7
- ✅ Respuesta más rápida (<500ms con cache)
- ✅ Menos colas en el servidor
- ✅ Datos más consistentes

**Migración en `client/src/pages/risks.tsx`:**

```typescript
// ANTES: Múltiples queries
const { data: bootstrapData } = useQuery(['/api/risks/bootstrap', ...]);
const { data: pageDataLite } = useQuery(['/api/risks/page-data-lite']);

// DESPUÉS: 1 sola query
const { data: pageData, isLoading } = useQuery({
  queryKey: ['/api/pages/risks', { limit: pageSize, offset, ...filters }],
  queryFn: async () => {
    const response = await fetch(`/api/pages/risks?${new URLSearchParams({
      limit: pageSize.toString(),
      offset: ((currentPage - 1) * pageSize).toString(),
      ...filters
    })}`);
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },
  staleTime: 2 * 60 * 1000, // 2 minutos
  refetchOnWindowFocus: false,
});
```

### 5. Monitorear el Servicio de Refresh

El servicio refresca la vista cada 5 minutos si está marcada como "stale".

**Logs a observar:**
```
[RiskListViewRefresh] risk_list_view is stale, refreshing...
[JOB] risk_list_view refreshed in 1234ms
[RiskListViewRefresh] risk_list_view is fresh, skipping refresh
```

**Invalidación automática:**
- Al crear riesgo → marca vista como stale
- Al actualizar riesgo → marca vista como stale
- Al eliminar riesgo → marca vista como stale

### 6. Verificar Performance

**Métricas esperadas:**

| Métrica | Antes | Después |
|---------|-------|---------|
| Requests por carga | 5-7 | 1 |
| Tiempo primera carga | 2-5s | <2s |
| Tiempo con cache | 500ms-1s | <500ms |
| Queries DB | 5-7 complejas | 1 simple |

**Monitoreo:**
- Revisa logs del endpoint: `[PERF] /api/pages/risks COMPLETE`
- Verifica duración en `_meta.duration`
- Compara con tiempos del endpoint legacy

## Troubleshooting

### La vista no se actualiza

1. Verifica que el servicio está corriendo:
   ```
   [RiskListViewRefresh] Service started
   ```

2. Verifica que la invalidación funciona:
   - Crea/actualiza un riesgo
   - Deberías ver: `[CACHE] Failed to invalidate risk_list_view` (o éxito)

3. Fuerza refresh manual si es necesario:
   ```sql
   REFRESH MATERIALIZED VIEW CONCURRENTLY risk_list_view;
   ```

### El endpoint es lento

1. Verifica que la vista tiene datos:
   ```sql
   SELECT COUNT(*) FROM risk_list_view;
   ```

2. Verifica índices:
   ```sql
   SELECT indexname FROM pg_indexes WHERE tablename = 'risk_list_view';
   ```

3. Verifica cache:
   - Revisa logs: `[CACHE HIT]` vs `[CACHE MISS]`
   - El cache debería mejorar tiempos en requests subsecuentes

### Error: "materialized view does not exist"

Ejecuta la migración:
```bash
npm run apply-risk-list-view
```

## Estado Actual

- ✅ Migración SQL ejecutada
- ✅ Endpoint BFF implementado (`/api/pages/risks`)
- ✅ Servicio de refresh implementado
- ✅ Invalidación en mutaciones implementada
- ⏳ Servidor necesita reiniciarse para activar servicio de refresh
- ⏳ Frontend puede migrar gradualmente al nuevo endpoint

## Siguiente Fase (Opcional)

Para solución definitiva con actualización incremental:

1. Convertir MV a tabla (`risk_list_read`)
2. Actualizar por eventos (triggers o aplicación)
3. Eliminar refresh periódico
4. Actualización en tiempo real (<100ms)

