-- =====================================================
-- UniGRC Performance Indexes
-- Para ejecutar en Render PostgreSQL Basic-1gb
-- Fecha: Nov 29, 2025
-- =====================================================

-- NOTA: Usar CONCURRENTLY para no bloquear la BD en producción
-- Si falla alguno, ejecutar sin CONCURRENTLY

-- =====================================================
-- PRIORIDAD ALTA - Mayor impacto en rendimiento
-- =====================================================

-- Validaciones (crítico para página de Validaciones)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_process_links_validation_notification 
  ON risk_process_links(validation_status, notification_sent) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_process_links_deleted_at 
  ON risk_process_links(deleted_at);

-- Riesgos (crítico para páginas Riesgos y Matriz)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_deleted_at 
  ON risks(deleted_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_inherent_risk 
  ON risks(inherent_risk DESC) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_residual_risk 
  ON risks(residual_risk DESC) WHERE deleted_at IS NULL;

-- Controles (crítico para página Controles)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_deleted_at 
  ON controls(deleted_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_controls_risk_id 
  ON risk_controls(risk_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_controls_control_id 
  ON risk_controls(control_id);

-- Planes de Acción
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_action_plans_status 
  ON action_plans(status) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_action_plans_deleted_at 
  ON action_plans(deleted_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_action_plans_due_date 
  ON action_plans(due_date) WHERE deleted_at IS NULL;

-- =====================================================
-- PRIORIDAD MEDIA - Jerarquía de procesos y navegación
-- =====================================================

-- Procesos y subprocesos (para JOINs en validaciones)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processes_macroproceso_id 
  ON processes(macroproceso_id) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processes_deleted_at 
  ON processes(deleted_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subprocesos_proceso_id 
  ON subprocesos(proceso_id) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subprocesos_deleted_at 
  ON subprocesos(deleted_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_macroprocesos_deleted_at 
  ON macroprocesos(deleted_at);

-- Matriz de riesgo (índice compuesto)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_inherent_residual 
  ON risks(inherent_risk DESC, residual_risk DESC) WHERE deleted_at IS NULL;

-- =====================================================
-- PRIORIDAD BAJA - Auditorías y usuarios
-- =====================================================

-- Auditorías
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audits_status 
  ON audits(status) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audits_deleted_at 
  ON audits(deleted_at);

-- Actions (para wizard de auditoría)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_actions_origin_deleted 
  ON actions(origin, deleted_at);

-- Usuarios
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
  ON users(email) WHERE deleted_at IS NULL;

-- =====================================================
-- VERIFICAR ÍNDICES CREADOS
-- =====================================================
-- Ejecutar después para verificar:
-- SELECT indexname, tablename FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, indexname;
