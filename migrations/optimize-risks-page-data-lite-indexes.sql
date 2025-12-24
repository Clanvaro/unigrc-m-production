-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN DE /api/risks/page-data-lite
-- Fecha: 2024-12-24
-- Objetivo: Reducir latencia de 35.3s a <5s
-- =====================================================

-- Índice para getRisksLite: LATERAL JOIN con risk_process_links
-- Optimiza: WHERE rpl.risk_id = r.id AND rpl.responsible_override_id IS NOT NULL ORDER BY rpl.created_at DESC
CREATE INDEX IF NOT EXISTS idx_rpl_risk_responsible_created
ON risk_process_links(risk_id, responsible_override_id, created_at DESC)
WHERE responsible_override_id IS NOT NULL;

-- Índice compuesto para risks: deleted_at + status (usado en WHERE)
CREATE INDEX IF NOT EXISTS idx_risks_deleted_status
ON risks(deleted_at, status)
WHERE deleted_at IS NULL AND status != 'deleted';

-- Índice para subprocesos: owner_id + deleted_at (usado en getSubprocesosWithOwners)
CREATE INDEX IF NOT EXISTS idx_subprocesos_owner_deleted
ON subprocesos(owner_id, deleted_at)
WHERE deleted_at IS NULL;

-- Índice para process_owners: is_active (usado en JOINs)
CREATE INDEX IF NOT EXISTS idx_process_owners_active
ON process_owners(is_active, id)
WHERE is_active = true;

-- Índice para process_gerencias: process_id (usado en getAllProcessGerenciasRelations)
CREATE INDEX IF NOT EXISTS idx_process_gerencias_process_id_optimized
ON process_gerencias(process_id);

-- Índice para macroproceso_gerencias: macroproceso_id
CREATE INDEX IF NOT EXISTS idx_macroproceso_gerencias_macro_id
ON macroproceso_gerencias(macroproceso_id);

-- Índice para subproceso_gerencias: subproceso_id
CREATE INDEX IF NOT EXISTS idx_subproceso_gerencias_sub_id
ON subproceso_gerencias(subproceso_id);

-- Actualizar estadísticas
ANALYZE risk_process_links;
ANALYZE risks;
ANALYZE subprocesos;
ANALYZE process_owners;
ANALYZE process_gerencias;
ANALYZE macroproceso_gerencias;
ANALYZE subproceso_gerencias;

