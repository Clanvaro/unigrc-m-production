-- ============================================================
-- MIGRACIÓN: Agregar índices para optimización de rendimiento
-- Fecha: 2025-12-01
-- Descripción: Índices faltantes en tablas de auditoría
-- ============================================================

-- IMPORTANTE: Estos comandos usan CONCURRENTLY para evitar bloquear
-- las tablas en producción. Esto significa que la creación de índices
-- tomará más tiempo pero no afectará a los usuarios activos.

-- ============================================================
-- TABLA: audit_universe
-- ============================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_universe_macroproceso 
ON audit_universe(macroproceso_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_universe_process 
ON audit_universe(process_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_universe_subproceso 
ON audit_universe(subproceso_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_universe_entity_type 
ON audit_universe(entity_type);

-- ============================================================
-- TABLA: audit_prioritization_factors
-- ============================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apf_universe_id 
ON audit_prioritization_factors(universe_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apf_plan_id 
ON audit_prioritization_factors(plan_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apf_total_score 
ON audit_prioritization_factors(total_priority_score);

-- ============================================================
-- TABLA: audit_plan_items
-- ============================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_plan_id 
ON audit_plan_items(plan_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_universe_id 
ON audit_plan_items(universe_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_prioritization_id 
ON audit_plan_items(prioritization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_status 
ON audit_plan_items(status);

-- ============================================================
-- VERIFICACIÓN: Confirmar que los índices se crearon correctamente
-- ============================================================
-- Ejecuta esta query después para verificar:
/*
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('audit_universe', 'audit_prioritization_factors', 'audit_plan_items')
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
*/
