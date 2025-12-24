-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN DE PRUEBAS DE AUDITORÍA
-- Fecha: 2024-12-23
-- Objetivo: Reducir latencia de /api/audit-tests/my-tests
-- =====================================================

-- Índice para assignedTo (usado en getAuditTestsByAssignee)
-- NOTA: Ya existe audit_tests_executor_idx, pero assignedTo puede ser diferente
CREATE INDEX IF NOT EXISTS idx_audit_tests_assigned_to
ON audit_tests(assigned_to, created_at DESC);

-- Índice compuesto para queries comunes: assignedTo + status
CREATE INDEX IF NOT EXISTS idx_audit_tests_assigned_status
ON audit_tests(assigned_to, status, created_at DESC);

-- Índice compuesto para queries por auditoría: auditId + status
CREATE INDEX IF NOT EXISTS idx_audit_tests_audit_status
ON audit_tests(audit_id, status, created_at DESC);

-- Índice compuesto para queries por ejecutor: executorId + status
CREATE INDEX IF NOT EXISTS idx_audit_tests_executor_status
ON audit_tests(executor_id, status, created_at DESC);

-- Actualizar estadísticas
ANALYZE audit_tests;
