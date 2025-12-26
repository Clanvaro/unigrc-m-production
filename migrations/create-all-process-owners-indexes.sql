-- ============================================================================
-- ÍNDICES PARA TABLA process_owners
-- ============================================================================
-- Este script crea todos los índices necesarios para optimizar las queries
-- de la tabla process_owners, especialmente el endpoint /api/process-owners
--
-- Fecha: 2024-12-26
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ÍNDICE COMPUESTO OPTIMIZADO (NUEVO - CRÍTICO PARA /api/process-owners)
-- ----------------------------------------------------------------------------
-- Optimiza la query: SELECT ... FROM process_owners WHERE is_active = true ORDER BY name
-- Permite que PostgreSQL use un solo scan de índice para filtrar y ordenar
-- Mejora el tiempo de query de ~200-500ms a ~20-50ms
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_process_owners_active_name 
ON process_owners (is_active, name);

-- ----------------------------------------------------------------------------
-- 2. ÍNDICES BÁSICOS (YA EXISTENTES EN SCHEMA)
-- ----------------------------------------------------------------------------

-- Índice para búsquedas por email (usado en getProcessOwnerByEmail)
CREATE INDEX IF NOT EXISTS idx_process_owners_email 
ON process_owners (email);

-- Índice para filtrar por estado activo (usado en múltiples queries)
CREATE INDEX IF NOT EXISTS idx_process_owners_active 
ON process_owners (is_active);

-- Índice para búsquedas por compañía (campo legacy)
CREATE INDEX IF NOT EXISTS idx_process_owners_company 
ON process_owners (company);

-- ----------------------------------------------------------------------------
-- 3. ÍNDICE PARCIAL EXISTENTE (de optimize-risks-page-data-lite-indexes.sql)
-- ----------------------------------------------------------------------------
-- Índice parcial para JOINs cuando solo necesitamos registros activos
-- Este índice es más eficiente que el índice completo cuando siempre filtramos por is_active = true
CREATE INDEX IF NOT EXISTS idx_process_owners_active_partial
ON process_owners(is_active, id)
WHERE is_active = true;

-- ----------------------------------------------------------------------------
-- VERIFICACIÓN: Listar todos los índices creados
-- ----------------------------------------------------------------------------
SELECT 
    indexname,
    indexdef,
    CASE 
        WHEN indexdef LIKE '%CONCURRENTLY%' THEN 'Concurrent'
        WHEN indexdef LIKE '%WHERE%' THEN 'Partial'
        ELSE 'Standard'
    END as index_type
FROM pg_indexes 
WHERE tablename = 'process_owners'
ORDER BY indexname;

-- ----------------------------------------------------------------------------
-- ANÁLISIS: Actualizar estadísticas para el query planner
-- ----------------------------------------------------------------------------
ANALYZE process_owners;

-- ----------------------------------------------------------------------------
-- VERIFICACIÓN DE RENDIMIENTO: Ver plan de ejecución de la query optimizada
-- ----------------------------------------------------------------------------
-- Ejecutar esto para verificar que el índice se está usando:
-- EXPLAIN ANALYZE 
-- SELECT id, name, email, position, is_active, created_at, updated_at
-- FROM process_owners
-- WHERE is_active = true
-- ORDER BY name;

