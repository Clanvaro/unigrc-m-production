# Endpoint: `/api/risks/page-data-lite`

## Resumen
Endpoint optimizado que carga todos los datos necesarios para la página de riesgos en paralelo. Usa caché distribuido (Redis) con TTL de 10 minutos.

## Pseudocódigo del Endpoint

```typescript
GET /api/risks/page-data-lite
  - Autenticación requerida
  - Sin caché HTTP (noCacheMiddleware)
  
  1. Resolver tenantId
  2. Verificar caché Redis (clave: `risks-page-data-lite:${CACHE_VERSION}:${tenantId}`)
     - Si existe → retornar inmediatamente
  3. Log pool metrics ANTES de queries (detecta pool saturado)
  4. Si no hay caché, ejecutar 9 queries en BATCHES de 2 (para evitar pool starvation):
     - Batch 1: getRisksLite(), getProcessOwners()
     - Batch 2: getRiskStats(), getGerencias()
     - Batch 3: getMacroprocesos(), getSubprocesosWithOwners()
     - Batch 4: getProcesses(), getRiskCategories()
     - Batch 5: getAllProcessGerenciasRelations()
     - Log pool metrics después de cada batch
  5. Log pool metrics DESPUÉS de todas las queries
  6. Filtrar registros soft-deleted (gerencias, macroprocesos, subprocesos, processes)
  7. Construir respuesta JSON
  8. Guardar en caché Redis (TTL: 600 segundos = 10 minutos)
  9. Retornar respuesta
```

## Detalle de cada función

### 1. `getRisksLite()`
**Carga relaciones:** ✅ SÍ (owner via LATERAL JOIN)

```sql
SELECT 
  r.id,
  r.code,
  r.name,
  r.description,
  r.category,
  r.probability,
  r.impact,
  r.inherent_risk as "inherentRisk",
  r.status,
  r.created_at as "createdAt",
  r.updated_at as "updatedAt",
  r.deleted_at as "deletedAt",
  po.name as "ownerName",        -- ← Relación con process_owners
  po.email as "ownerEmail"       -- ← Relación con process_owners
FROM risks r
LEFT JOIN LATERAL (
  SELECT rpl.responsible_override_id, rpl.created_at
  FROM risk_process_links rpl
  WHERE rpl.risk_id = r.id
    AND rpl.responsible_override_id IS NOT NULL
  ORDER BY rpl.created_at DESC NULLS LAST
  LIMIT 1
) latest_rpl ON true
LEFT JOIN process_owners po ON latest_rpl.responsible_override_id = po.id 
  AND (po.is_active = true OR po.is_active IS NULL)
WHERE r.deleted_at IS NULL
  AND r.status != 'deleted'
ORDER BY r.id
```

**Retorna:**
```typescript
Array<Risk & {
  ownerName?: string | null;      // Del process_owner más reciente
  ownerEmail?: string | null;      // Del process_owner más reciente
  categoryNames?: string[];       // Array de categorías (del campo category)
}>
```

**Nota:** Usa LATERAL JOIN para obtener el `process_owner` más reciente basado en `risk_process_links.responsible_override_id`.

---

### 2. `getProcessOwners()`
**Carga relaciones:** ❌ NO

```sql
SELECT * FROM process_owners 
WHERE is_active = true
ORDER BY name
```

**Retorna:** `ProcessOwner[]` (todos los process owners activos)

---

### 3. `getRiskStats()`
**Carga relaciones:** ❌ NO

```sql
SELECT 
  status,
  inherent_risk as "inherentRisk",
  (deleted_at IS NOT NULL) as "isDeleted"
FROM risks
```

**Retorna:**
```typescript
{
  total: number;
  active: number;
  inactive: number;
  deleted: number;
  byStatus: Record<string, number>;
  byRiskLevel: {
    low: number;      // inherentRisk 1-6
    medium: number;   // inherentRisk 7-12
    high: number;      // inherentRisk 13-18
    critical: number; // inherentRisk 19-25
  };
}
```

**Nota:** Los agregados se calculan en memoria después de obtener todos los registros.

---

### 4. `getGerencias()`
**Carga relaciones:** ❌ NO

```sql
SELECT * FROM gerencias 
WHERE deleted_at IS NULL
```

**Retorna:** `Gerencia[]` (todas las gerencias activas)

**Nota:** Usa caché Redis con TTL de 60 segundos.

---

### 5. `getMacroprocesos()`
**Carga relaciones:** ❌ NO

```sql
SELECT * FROM macroprocesos 
WHERE deleted_at IS NULL
```

**Retorna:** `Macroproceso[]` (todos los macroprocesos activos)

**Nota:** Usa caché Redis con TTL de 60 segundos.

---

### 6. `getSubprocesosWithOwners()`
**Carga relaciones:** ✅ SÍ (owner via LEFT JOIN)

```sql
SELECT 
  subproceso.*,
  process_owners.* as owner
FROM subprocesos
LEFT JOIN process_owners ON (
  subprocesos.owner_id = process_owners.id 
  AND process_owners.is_active = true
)
WHERE subprocesos.deleted_at IS NULL
ORDER BY subprocesos.created_at DESC
```

**Retorna:**
```typescript
Array<Subproceso & {
  owner: ProcessOwner | null
}>
```

---

### 7. `getProcesses()`
**Carga relaciones:** ❌ NO

```sql
SELECT * FROM processes 
WHERE deleted_at IS NULL
```

**Retorna:** `Process[]` (todos los procesos activos)

**Nota:** Usa caché Redis con TTL de 60 segundos.

---

### 8. `getRiskCategories()`
**Carga relaciones:** ❌ NO

```sql
SELECT * FROM risk_categories 
WHERE is_active = true
```

**Retorna:** `RiskCategory[]` (todas las categorías activas)

**Nota:** Usa caché Redis con TTL de 10 minutos (600 segundos).

---

### 9. `getAllProcessGerenciasRelations()`
**Carga relaciones:** ✅ SÍ (combina 3 tipos de relaciones en UNION ALL)

```sql
-- Relaciones Macroproceso-Gerencia
SELECT 
  mg.macroproceso_id as "macroprocesoId",
  NULL::text as "processId",
  NULL::text as "subprocesoId",
  mg.gerencia_id as "gerenciaId"
FROM macroproceso_gerencias mg
INNER JOIN macroprocesos m ON mg.macroproceso_id = m.id
INNER JOIN gerencias g ON mg.gerencia_id = g.id
WHERE m.deleted_at IS NULL AND g.deleted_at IS NULL

UNION ALL

-- Relaciones Process-Gerencia
SELECT 
  NULL::text as "macroprocesoId",
  pg.process_id as "processId",
  NULL::text as "subprocesoId",
  pg.gerencia_id as "gerenciaId"
FROM process_gerencias pg
INNER JOIN processes p ON pg.process_id = p.id
INNER JOIN gerencias g ON pg.gerencia_id = g.id
WHERE p.deleted_at IS NULL AND g.deleted_at IS NULL

UNION ALL

-- Relaciones Subproceso-Gerencia
SELECT 
  NULL::text as "macroprocesoId",
  NULL::text as "processId",
  sg.subproceso_id as "subprocesoId",
  sg.gerencia_id as "gerenciaId"
FROM subproceso_gerencias sg
INNER JOIN subprocesos s ON sg.subproceso_id = s.id
INNER JOIN gerencias g ON sg.gerencia_id = g.id
WHERE s.deleted_at IS NULL AND g.deleted_at IS NULL
```

**Retorna:**
```typescript
Array<{
  macroprocesoId?: string | null;
  processId?: string | null;
  subprocesoId?: string | null;
  gerenciaId: string;
}>
```

**Nota:** Combina todas las relaciones proceso-gerencia en una sola query optimizada.

---

## Estructura de la Respuesta

```typescript
{
  risks: Array<Risk & { ownerName, ownerEmail, categoryNames }>,
  owners: ProcessOwner[],
  stats: {
    total, active, inactive, deleted,
    byStatus: Record<string, number>,
    byRiskLevel: { low, medium, high, critical }
  },
  gerencias: Gerencia[],              // Filtrado: status !== 'deleted'
  macroprocesos: Macroproceso[],      // Filtrado: status !== 'deleted'
  subprocesos: Array<Subproceso & { owner }>,  // Filtrado: deletedAt IS NULL
  processes: Process[],               // Filtrado: status !== 'deleted'
  riskCategories: RiskCategory[],
  processGerencias: Array<{          // Relaciones proceso-gerencia
    macroprocesoId?: string | null,
    processId?: string | null,
    subprocesoId?: string | null,
    gerenciaId: string
  }>
}
```

## Optimizaciones

1. **Limitación de concurrencia:** Las 9 queries se ejecutan en **batches de 2** para evitar pool starvation (pool=4, concurrency=10 causaba saturación)
2. **Caché distribuido:** Redis con TTL de 10 minutos (600 segundos)
3. **Caché individual:** Algunas funciones tienen su propio caché (60s para catálogos)
4. **LATERAL JOIN:** `getRisksLite()` usa LATERAL JOIN para obtener el owner más reciente eficientemente
5. **UNION ALL:** `getAllProcessGerenciasRelations()` combina 3 queries en una sola
6. **Filtrado en memoria:** Los soft-deleted se filtran después de obtener los datos
7. **Logging de pool metrics:** Métricas antes/después de queries para detectar pool starvation
8. **Agregación SQL:** `getRiskStats()` usa COUNT(*) FILTER en lugar de traer todos los registros

## Invalidación de Caché

El caché se invalida automáticamente cuando:
- Se crea/actualiza/elimina un riesgo
- Se crea/actualiza/elimina un proceso
- Se crea/actualiza/elimina un macroproceso
- Se crea/actualiza/elimina un subproceso
- Se crea/actualiza/elimina una gerencia
- Se modifican relaciones proceso-gerencia
