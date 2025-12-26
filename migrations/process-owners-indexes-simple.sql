-- ============================================================================
-- ÍNDICES PARA process_owners - VERSIÓN SIMPLE
-- ============================================================================

-- ÍNDICE CRÍTICO: Optimiza /api/process-owners (WHERE is_active = true ORDER BY name)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_process_owners_active_name 
ON process_owners (is_active, name);

-- Índices básicos (ya deberían existir, pero se crean por si acaso)
CREATE INDEX IF NOT EXISTS idx_process_owners_email ON process_owners (email);
CREATE INDEX IF NOT EXISTS idx_process_owners_active ON process_owners (is_active);
CREATE INDEX IF NOT EXISTS idx_process_owners_company ON process_owners (company);

-- Verificar índices creados
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'process_owners'
ORDER BY indexname;

-- Actualizar estadísticas
ANALYZE process_owners;

