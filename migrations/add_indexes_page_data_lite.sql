-- ============================================================
-- ÍNDICES PARA OPTIMIZAR /api/risks/page-data-lite
-- Ejecutar con: psql $DATABASE_URL -f migrations/add_indexes_page_data_lite.sql
-- ============================================================

BEGIN;

-- ============= RISK_PROCESS_LINKS - Optimización LATERAL JOIN =============
-- Índice compuesto para el LATERAL JOIN en getRisksLite()
-- Optimiza la búsqueda del risk_process_link más reciente con responsible_override_id
-- Usa índice parcial para reducir tamaño y mejorar performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rpl_risk_created_desc_partial
ON risk_process_links(risk_id, created_at DESC NULLS LAST)
WHERE responsible_override_id IS NOT NULL;

-- Índice adicional para mejorar aún más la performance del LATERAL JOIN
-- Incluye responsible_override_id en el índice para evitar lookup adicional
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rpl_risk_responsible_created_desc_partial
ON risk_process_links(risk_id, responsible_override_id, created_at DESC NULLS LAST)
WHERE responsible_override_id IS NOT NULL;

-- ============= TABLAS *_GERENCIAS - Optimización JOINs en getAllProcessGerenciasRelations =============
-- Estos índices optimizan los JOINs en la query UNION ALL que combina las 3 relaciones

-- macroproceso_gerencias: índices para JOINs con macroprocesos y gerencias
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_macroproceso_gerencias_macroproceso_id
ON macroproceso_gerencias(macroproceso_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_macroproceso_gerencias_gerencia_id
ON macroproceso_gerencias(gerencia_id);

-- process_gerencias: índices para JOINs con processes y gerencias
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_process_gerencias_process_id
ON process_gerencias(process_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_process_gerencias_gerencia_id
ON process_gerencias(gerencia_id);

-- subproceso_gerencias: índices para JOINs con subprocesos y gerencias
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subproceso_gerencias_subproceso_id
ON subproceso_gerencias(subproceso_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subproceso_gerencias_gerencia_id
ON subproceso_gerencias(gerencia_id);

-- ============= ÍNDICES ADICIONALES PARA OPTIMIZAR FILTROS deleted_at =============
-- Estos índices ayudan a optimizar los filtros WHERE deleted_at IS NULL en los JOINs

-- Índices compuestos para optimizar JOINs + filtro deleted_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_macroprocesos_id_deleted
ON macroprocesos(id) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processes_id_deleted
ON processes(id) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subprocesos_id_deleted
ON subprocesos(id) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gerencias_id_deleted
ON gerencias(id) WHERE deleted_at IS NULL;

COMMIT;

-- ============= ACTUALIZAR ESTADÍSTICAS =============
ANALYZE risk_process_links;
ANALYZE macroproceso_gerencias;
ANALYZE process_gerencias;
ANALYZE subproceso_gerencias;
ANALYZE macroprocesos;
ANALYZE processes;
ANALYZE subprocesos;
ANALYZE gerencias;

-- ============= VERIFICAR ÍNDICES CREADOS =============
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname IN (
  'idx_rpl_risk_created_desc_partial',
  'idx_rpl_risk_responsible_created_desc_partial',
  'idx_macroproceso_gerencias_macroproceso_id',
  'idx_macroproceso_gerencias_gerencia_id',
  'idx_process_gerencias_process_id',
  'idx_process_gerencias_gerencia_id',
  'idx_subproceso_gerencias_subproceso_id',
  'idx_subproceso_gerencias_gerencia_id',
  'idx_macroprocesos_id_deleted',
  'idx_processes_id_deleted',
  'idx_subprocesos_id_deleted',
  'idx_gerencias_id_deleted'
)
ORDER BY tablename, indexname;
