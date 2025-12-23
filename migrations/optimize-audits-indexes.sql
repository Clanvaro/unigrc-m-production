-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN DE PÁGINA DE AUDITORÍAS
-- Fecha: 2024-12-23
-- =====================================================

-- Índice para tabla audits - filtro por status y ordenamiento
CREATE INDEX IF NOT EXISTS idx_audits_status_created
ON audits(status, created_at DESC);

-- Índice para búsqueda de auditorías por tipo
CREATE INDEX IF NOT EXISTS idx_audits_type
ON audits(type);

-- Índice para filtro por auditor asignado
CREATE INDEX IF NOT EXISTS idx_audits_assigned_auditor
ON audits(assigned_auditor_id)
WHERE assigned_auditor_id IS NOT NULL;

-- Índice para audit_findings por audit_id
CREATE INDEX IF NOT EXISTS idx_audit_findings_audit
ON audit_findings(audit_id);

-- Índice para audit_findings por status
CREATE INDEX IF NOT EXISTS idx_audit_findings_status
ON audit_findings(status);

-- Índice para actions por origin (risk/audit)
CREATE INDEX IF NOT EXISTS idx_actions_origin
ON actions(origin)
WHERE origin IS NOT NULL;

-- Índice para actions por status
CREATE INDEX IF NOT EXISTS idx_actions_status
ON actions(status);

-- Índice para user_roles lookup rápido
CREATE INDEX IF NOT EXISTS idx_user_roles_user
ON user_roles(user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_role
ON user_roles(role_id);

-- Actualizar estadísticas
ANALYZE audits;
ANALYZE audit_findings;
ANALYZE actions;
ANALYZE user_roles;

