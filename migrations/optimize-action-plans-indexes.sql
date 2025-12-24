-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN DE PLANES DE ACCIÓN
-- Fecha: 2024-12-23
-- Objetivo: Reducir latencia de /api/action-plans
-- =====================================================

-- Índices para actions (tabla principal)
-- Optimiza: WHERE deleted_at IS NULL ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_actions_deleted_created
ON actions(deleted_at, created_at DESC)
WHERE deleted_at IS NULL;

-- Índice para filtros por status y priority
CREATE INDEX IF NOT EXISTS idx_actions_status_priority
ON actions(status, priority, deleted_at)
WHERE deleted_at IS NULL;

-- Índice para responsible (usado en filtros)
CREATE INDEX IF NOT EXISTS idx_actions_responsible
ON actions(responsible, deleted_at)
WHERE deleted_at IS NULL;

-- Índice para risk_id (usado en JOINs)
CREATE INDEX IF NOT EXISTS idx_actions_risk_id
ON actions(risk_id, deleted_at)
WHERE deleted_at IS NULL AND risk_id IS NOT NULL;

-- Índices para audit_logs (reschedule counts)
-- Optimiza: WHERE entity_type = 'action_plan' AND action = 'update' AND changes LIKE '%dueDate%'
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_plan_reschedule
ON audit_logs(entity_type, action, entity_id)
WHERE entity_type = 'action_plan' AND action = 'update';

-- Índice GIN para búsqueda de texto en changes (LIKE '%dueDate%')
-- Nota: Esto requiere extensión pg_trgm si se usa búsqueda de texto avanzada
-- Por ahora, el índice anterior debería ser suficiente

-- Índices para action_plan_risks (associated risks)
CREATE INDEX IF NOT EXISTS idx_action_plan_risks_action_plan_id
ON action_plan_risks(action_plan_id, risk_id)
WHERE action_plan_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_action_plan_risks_action_id
ON action_plan_risks(action_id, risk_id)
WHERE action_id IS NOT NULL;

-- Nota: No se puede crear índice con COALESCE directamente
-- Los índices anteriores (action_plan_id y action_id) cubren ambos casos

-- Índices para process_gerencias (gerencias aggregation)
-- NOTA: La columna se llama gerencia_id (singular), no gerencias_id
CREATE INDEX IF NOT EXISTS idx_process_gerencias_process_id
ON process_gerencias(process_id, gerencia_id);

-- Índice para gerencias (usado en JOIN)
CREATE INDEX IF NOT EXISTS idx_gerencias_id_deleted
ON gerencias(id, deleted_at)
WHERE deleted_at IS NULL;

-- Actualizar estadísticas
ANALYZE actions;
ANALYZE audit_logs;
ANALYZE action_plan_risks;
ANALYZE process_gerencias;
ANALYZE gerencias;

