-- ============================================================
-- PERFORMANCE OPTIMIZATION INDEXES - December 24, 2025
-- Aplicar directamente en la base de datos
-- ============================================================
-- 
-- Estos índices optimizan:
-- 1. Queries con filtros por status y ORDER BY created_at
-- 2. Queries de agregación MIN(residual_risk) en risk_controls
-- 3. Queries paginadas de validación con ORDER BY
--
-- IMPORTANTE: Usar CONCURRENTLY para no bloquear la BD en producción
-- ============================================================

BEGIN;

-- ============= ÍNDICES PARA TABLA RISKS =============

-- Composite index para queries comunes: WHERE deleted_at IS NULL AND status = 'active' ORDER BY created_at
-- Optimiza queries de paginación y listados de riesgos activos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_active_created 
ON risks(status, created_at) 
WHERE deleted_at IS NULL;

-- Composite index para filtros por process_id con status
-- Optimiza queries que filtran riesgos por proceso y status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_process_active 
ON risks(process_id, status) 
WHERE deleted_at IS NULL;

-- Composite index para filtros por subproceso_id con status
-- Optimiza queries que filtran riesgos por subproceso y status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_subproceso_active 
ON risks(subproceso_id, status) 
WHERE deleted_at IS NULL;

-- Composite index para filtros por macroproceso_id con status
-- Optimiza queries que filtran riesgos por macroproceso y status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_macroproceso_active 
ON risks(macroproceso_id, status) 
WHERE deleted_at IS NULL;

-- ============= ÍNDICES PARA TABLA RISK_CONTROLS =============

-- Composite index para queries de MIN(residual_risk) por risk_id
-- Optimiza queries de agregación usadas en getAllRiskLevelsOptimized
-- Este índice es crítico para el cálculo de residual_risk agregado
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rc_risk_residual 
ON risk_controls(risk_id, residual_risk);

-- ============= ÍNDICES PARA TABLA RISK_PROCESS_LINKS =============

-- Composite index para queries paginadas de validación con ORDER BY
-- Covers: WHERE validation_status = X AND notification_sent = Y ORDER BY created_at
-- Este índice es crítico para los endpoints /api/risk-processes/validation/*/list
-- NOTA: risk_process_links NO tiene columna deleted_at, por lo que no se usa WHERE clause
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rpl_validation_notification_created 
ON risk_process_links(validation_status, notification_sent, created_at);

-- ============= VERIFICACIÓN DE ÍNDICES =============

-- Verificar que los índices se crearon correctamente
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('risks', 'risk_controls', 'risk_process_links')
  AND indexname IN (
    'idx_risks_active_created',
    'idx_risks_process_active',
    'idx_risks_subproceso_active',
    'idx_risks_macroproceso_active',
    'idx_rc_risk_residual',
    'idx_rpl_validation_notification_created'
  )
ORDER BY tablename, indexname;

-- ============= ACTUALIZAR ESTADÍSTICAS =============

-- Actualizar estadísticas para que el query planner use los nuevos índices
ANALYZE risks;
ANALYZE risk_controls;
ANALYZE risk_process_links;

COMMIT;

-- ============= MENSAJE DE ÉXITO =============
SELECT 'Performance indexes created successfully! ✅' AS status;

