# Implementación BFF + Read-Model

## Resumen

Se ha implementado un patrón **Backend For Frontend (BFF)** con **Read-Model (materialización)** para optimizar la carga de la página de riesgos.

### Beneficios

1. **1 endpoint por pantalla** (`/api/pages/risks`) - Reemplaza 5-7 llamadas paralelas
2. **1 query simple** desde vista materializada (sin JOINs complejos)
3. **Respuesta predecible** (<500ms con cache, <2s sin cache)
4. **Menos colas** - Una sola request en lugar de múltiples paralelas
5. **Datos consistentes** desde vista materializada

## Archivos Creados

### Backend

1. **`server/utils/cache-key-builder.ts`**
   - Función para construir cache keys canónicas y estables
   - Evita problemas con `JSON.stringify()` (orden, undefined, etc.)

2. **`server/services/risks-page-service.ts`**
   - Servicio con funciones auxiliares:
     - `getRisksFromReadModel()` - Lee desde vista materializada
     - `getRiskCounts()` - Counts básicos agregados
     - `getMinimalCatalogs()` - Catálogos mínimos (solo IDs y nombres)
     - `getRelationsLite()` - Relaciones lite (solo totales, Record en lugar de Map)

3. **`server/jobs/refresh-risk-list-view.ts`**
   - Job para refrescar vista materializada con advisory lock
   - Servicio programado que refresca cada 5 minutos si está marcado como stale
   - Funciones: `refreshRiskListView()`, `invalidateRiskListView()`, `isRiskListViewStale()`

4. **`migrations/create-risk-list-view.sql`**
   - Migración SQL para crear vista materializada `risk_list_view`
   - Incluye índice único requerido para `REFRESH CONCURRENTLY`
   - Índices adicionales para búsquedas rápidas

### Endpoints

- **`GET /api/pages/risks`** - Nuevo endpoint BFF optimizado
- **`GET /api/risks/bootstrap`** - Mantenido por compatibilidad (legacy)

### Integración

- Invalidación automática del read-model en:
  - `POST /api/risks` - Al crear riesgo
  - `PUT /api/risks/:id` - Al actualizar riesgo
  - `DELETE /api/risks/:id` - Al eliminar riesgo

## Pasos de Implementación

### 1. Ejecutar Migración SQL

**IMPORTANTE**: Ejecutar la migración SQL antes de usar el nuevo endpoint.

```bash
# Opción 1: Desde psql
psql -h <host> -U <user> -d <database> -f migrations/create-risk-list-view.sql

# Opción 2: Desde la consola SQL de Render/Cloud SQL
# Copiar y pegar el contenido de migrations/create-risk-list-view.sql
```

La migración:
- Crea la vista materializada `risk_list_view`
- Crea el índice único `ux_risk_list_view_id` (requerido para CONCURRENTLY)
- Crea índices adicionales para búsquedas rápidas
- Hace un refresh inicial

### 2. Verificar que el Servicio se Inició

El servicio de refresh se inicia automáticamente al arrancar el servidor. Verificar logs:

```
[RiskListViewRefresh] Starting refresh service...
[RiskListViewRefresh] Interval: 5 minutes
[RiskListViewRefresh] Service started - will check and refresh every 5 minutes
```

### 3. Probar el Nuevo Endpoint

```bash
# Ejemplo de request
curl -X GET "http://localhost:5000/api/pages/risks?limit=25&offset=0&status=active" \
  -H "Cookie: session=..."
```

Respuesta esperada:
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

### 4. Actualizar Frontend (Opcional)

El frontend puede seguir usando `/api/risks/bootstrap` (legacy) o migrar a `/api/pages/risks`.

**Ejemplo de migración en `client/src/pages/risks.tsx`:**

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

## Correcciones Implementadas

### ✅ 1. Map() → Record
- Todas las relaciones usan `Record<string, T>` en lugar de `Map`
- Serialización JSON correcta

### ✅ 2. Cache Fail-Open
- Timeout de 200ms para cache
- Si falla, continúa sin cache (no bloquea)
- SingleFlight integrado (solo 1 query si 20 requests simultáneos)

### ✅ 3. Cache Key Estable
- Función `buildStableCacheKey()` canoniza parámetros
- Evita problemas con orden de propiedades o undefined

### ✅ 4. Índice Único para CONCURRENTLY
- `ux_risk_list_view_id` creado en la migración
- Permite `REFRESH MATERIALIZED VIEW CONCURRENTLY`

### ✅ 5. Refresh Optimizado
- Advisory lock para evitar refreshes concurrentes
- Refresh solo si está marcado como stale
- Invalidación por eventos (al cambiar riesgo/control/plan)

## Monitoreo

### Verificar Estado del Servicio

```bash
# Endpoint de status (si existe)
curl http://localhost:5000/api/admin/risk-list-view-status
```

### Logs a Observar

```
[RiskListViewRefresh] risk_list_view is stale, refreshing...
[JOB] risk_list_view refreshed in 1234ms
[CACHE] Timeout getting pages:risks:..., proceeding without cache
```

### Métricas Esperadas

- **Primera carga**: <2s (sin cache)
- **Carga con cache**: <500ms
- **Refresh de vista**: <5s (depende del tamaño de datos)

## Notas Importantes

1. **Cálculo de Residual Risk**: El read-model usa una aproximación (`AVG(effectiveness)`). Para cálculos exactos, usar `calculateResidualRiskFromControls()` en la aplicación cuando se necesite precisión total.

2. **Compatibilidad**: El endpoint legacy `/api/risks/bootstrap` sigue funcionando. Se puede migrar gradualmente.

3. **Invalidación**: La vista se marca como "stale" al cambiar datos. El refresh ocurre en el próximo ciclo (máximo 5 minutos).

4. **Escalabilidad**: Para datasets muy grandes (>10k riesgos), considerar actualización incremental por eventos en lugar de refresh completo.

## Troubleshooting

### Error: "materialized view risk_list_view does not exist"
- Ejecutar la migración SQL primero

### Error: "cannot refresh materialized view concurrently without unique index"
- Verificar que el índice `ux_risk_list_view_id` existe
- Si no existe, ejecutar: `CREATE UNIQUE INDEX ux_risk_list_view_id ON risk_list_view(id);`

### Vista no se actualiza
- Verificar logs del servicio: `[RiskListViewRefresh]`
- Verificar que el flag `risk_list_view:stale` se está seteando en mutaciones
- Forzar refresh manual si es necesario

### Cache no funciona
- Verificar que Redis/Upstash está disponible
- Los timeouts son esperados (fail-open pattern)
- Verificar logs: `[CACHE] Timeout getting...`

## Próximos Pasos (Fase 2)

Para solución definitiva con actualización incremental:

1. Convertir MV a tabla (`risk_list_read`)
2. Actualizar por eventos (triggers o aplicación)
3. Eliminar refresh periódico
4. Actualización en tiempo real (<100ms)

