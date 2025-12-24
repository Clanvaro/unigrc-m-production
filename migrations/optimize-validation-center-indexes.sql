-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN DEL CENTRO DE VALIDACIÓN
-- Fecha: 2024-12-23
-- Objetivo: Reducir latencia de queries de validación
-- =====================================================

-- Índices para risk_process_links (usado en /api/validation/counts y otros endpoints)
CREATE INDEX IF NOT EXISTS idx_rpl_validation_status_notification
ON risk_process_links(validation_status, notification_sent)
WHERE risk_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rpl_validation_status
ON risk_process_links(validation_status)
WHERE risk_id IS NOT NULL;

-- Índice compuesto para queries de validación con risks
CREATE INDEX IF NOT EXISTS idx_rpl_validation_risk_lookup
ON risk_process_links(risk_id, validation_status, notification_sent)
WHERE risk_id IS NOT NULL;

-- Índice optimizado para getRiskProcessLinksByValidationStatus (usado en /api/risk-processes/validation/:status)
-- Cubre: validation_status + created_at para ORDER BY
CREATE INDEX IF NOT EXISTS idx_rpl_validation_status_created
ON risk_process_links(validation_status, created_at)
WHERE risk_id IS NOT NULL;

-- Índice para JOIN con risks (filtro deleted_at)
CREATE INDEX IF NOT EXISTS idx_risks_id_deleted
ON risks(id, deleted_at)
WHERE deleted_at IS NULL;

-- Índices para controls (usado en /api/validation/counts)
CREATE INDEX IF NOT EXISTS idx_controls_validation_status
ON controls(validation_status, notified_at)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_controls_validation_pending
ON controls(validation_status, notified_at, deleted_at)
WHERE deleted_at IS NULL AND (validation_status IS NULL OR validation_status = 'pending_validation');

-- Índices para actions (usado en /api/validation/counts)
CREATE INDEX IF NOT EXISTS idx_actions_validation_status
ON actions(validation_status, notified_at)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_actions_validation_pending
ON actions(validation_status, notified_at, deleted_at)
WHERE deleted_at IS NULL AND validation_status = 'pending_validation';

-- Actualizar estadísticas
ANALYZE risk_process_links;
ANALYZE controls;
ANALYZE actions;
