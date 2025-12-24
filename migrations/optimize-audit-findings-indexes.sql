-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN DE HALLAZGOS DE AUDITORÍA
-- Fecha: 2024-12-23
-- Objetivo: Reducir latencia de /api/audit-findings
-- =====================================================

-- Índice compuesto para queries comunes: auditId + status (usado en filtros)
CREATE INDEX IF NOT EXISTS idx_audit_findings_audit_status
ON audit_findings(audit_id, status, created_at DESC);

-- Índice compuesto para queries por severidad: auditId + severity
CREATE INDEX IF NOT EXISTS idx_audit_findings_audit_severity
ON audit_findings(audit_id, severity, created_at DESC);

-- Índice compuesto para queries por tipo: auditId + type
CREATE INDEX IF NOT EXISTS idx_audit_findings_audit_type
ON audit_findings(audit_id, type, created_at DESC);

-- Índice para responsiblePerson (usado en JOINs y filtros)
CREATE INDEX IF NOT EXISTS idx_audit_findings_responsible
ON audit_findings(responsible_person)
WHERE responsible_person IS NOT NULL;

-- Índice para identifiedBy (usado en JOINs)
CREATE INDEX IF NOT EXISTS idx_audit_findings_identified_by
ON audit_findings(identified_by)
WHERE identified_by IS NOT NULL;

-- Actualizar estadísticas
ANALYZE audit_findings;

