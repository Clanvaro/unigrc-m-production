-- =====================================================
-- OPTIMIZACIÓN DE ENDPOINTS LENTOS - V2
-- Fecha: 2024-12-23
-- Objetivo: Reducir latencia de endpoints críticos
-- 
-- Endpoints afectados:
--   /api/risks/bootstrap      : 15.5s → <2s
--   /api/risks/batch-relations: 14.7s → <1s  
--   /api/processes            : 7s → <500ms
-- =====================================================

-- =====================================================
-- 1. ÍNDICES PARA /api/risks/bootstrap
-- =====================================================

-- Índice compuesto para la query principal de risks con paginación
-- Cubre: filtro por status, deleted_at, ordenamiento por created_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_bootstrap_main 
ON risks(status, deleted_at, created_at DESC) 
INCLUDE (id, code, name, description, inherent_risk, residual_risk, probability, impact, owner_id, category_id);

-- Índice para búsqueda de texto en risks (nombre y descripción)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_search_optimized
ON risks USING gin(to_tsvector('spanish', coalesce(name, '') || ' ' || coalesce(description, '')))
WHERE deleted_at IS NULL;

-- Índice para filtros por nivel de riesgo
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_risk_levels
ON risks(inherent_risk, residual_risk)
WHERE deleted_at IS NULL AND status = 'active';

-- =====================================================
-- 2. ÍNDICES PARA /api/risks/batch-relations
-- =====================================================

-- Índice optimizado para batch lookup de risk_process_links
-- Usado cuando se cargan relaciones para múltiples risks a la vez
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rpl_risk_batch_lookup
ON risk_process_links(risk_id)
INCLUDE (id, macroproceso_id, process_id, subproceso_id, validation_status, validated_at, created_at);

-- Índice para filtrar por proceso en risk_process_links
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rpl_process_hierarchy
ON risk_process_links(macroproceso_id, process_id, subproceso_id)
WHERE risk_id IS NOT NULL;

-- Índice optimizado para batch lookup de risk_controls
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rc_risk_batch_lookup
ON risk_controls(risk_id)
WHERE deleted_at IS NULL;

-- Índice compuesto para risk_controls con control_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rc_risk_control_lookup
ON risk_controls(risk_id, control_id)
INCLUDE (residual_risk)
WHERE deleted_at IS NULL;

-- =====================================================
-- 3. ÍNDICES PARA /api/processes
-- =====================================================

-- Índice para processes con owner (usado en getProcessesWithOwners)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processes_with_owner
ON processes(status, deleted_at)
INCLUDE (id, code, name, description, owner_id, macroproceso_id)
WHERE deleted_at IS NULL;

-- Índice para cálculo de risk levels por proceso
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_by_process
ON risks(process_id)
INCLUDE (inherent_risk, residual_risk)
WHERE deleted_at IS NULL AND status = 'active';

-- Índice para cálculo de risk levels por macroproceso
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_by_macroproceso
ON risks(macroproceso_id)
INCLUDE (inherent_risk, residual_risk)
WHERE deleted_at IS NULL AND status = 'active';

-- Índice para cálculo de risk levels por subproceso
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_by_subproceso
ON risks(subproceso_id)
INCLUDE (inherent_risk, residual_risk)
WHERE deleted_at IS NULL AND status = 'active';

-- =====================================================
-- 4. ÍNDICES ADICIONALES PARA CATÁLOGOS
-- =====================================================

-- Índice para gerencias activas (usado en bootstrap catalogs)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gerencias_active
ON gerencias(status)
INCLUDE (id, code, name)
WHERE deleted_at IS NULL AND status != 'deleted';

-- Índice para macroprocesos activos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_macroprocesos_active
ON macroprocesos(status)
INCLUDE (id, code, name, gerencia_id)
WHERE deleted_at IS NULL AND status != 'deleted';

-- Índice para subprocesos activos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subprocesos_active
ON subprocesos(status)
INCLUDE (id, code, name, process_id)
WHERE deleted_at IS NULL AND status != 'deleted';

-- =====================================================
-- 5. ACTUALIZAR ESTADÍSTICAS
-- =====================================================

-- Actualizar estadísticas de las tablas modificadas para que el query planner use los nuevos índices
ANALYZE risks;
ANALYZE risk_process_links;
ANALYZE risk_controls;
ANALYZE processes;
ANALYZE macroprocesos;
ANALYZE subprocesos;
ANALYZE gerencias;

-- =====================================================
-- VERIFICACIÓN DE ÍNDICES CREADOS
-- =====================================================

SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
AND indexname IN (
    'idx_risks_bootstrap_main',
    'idx_risks_search_optimized',
    'idx_risks_risk_levels',
    'idx_rpl_risk_batch_lookup',
    'idx_rpl_process_hierarchy',
    'idx_rc_risk_batch_lookup',
    'idx_rc_risk_control_lookup',
    'idx_processes_with_owner',
    'idx_risks_by_process',
    'idx_risks_by_macroproceso',
    'idx_risks_by_subproceso',
    'idx_gerencias_active',
    'idx_macroprocesos_active',
    'idx_subprocesos_active'
)
ORDER BY tablename, indexname;
