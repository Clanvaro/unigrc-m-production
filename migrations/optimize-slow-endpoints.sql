-- Optimización de endpoints lentos: /api/risks y /api/users
-- Ejecutar este script para mejorar el rendimiento de estos endpoints

-- ============================================================
-- OPTIMIZACIÓN PARA /api/risks (GET /api/risks)
-- ============================================================

-- Índice compuesto para optimizar getRisksPaginated
-- Cubre: filtrado por deletedAt, status, y ordenamiento por createdAt
-- Esto mejora significativamente las consultas COUNT(*) y SELECT con ORDER BY
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_pagination_optimized 
ON risks(deleted_at, status, created_at DESC) 
WHERE deleted_at IS NULL AND status != 'deleted';

-- Índice para búsquedas de texto (name, code, description)
-- Usado cuando hay un filtro de búsqueda
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_search_text 
ON risks USING gin(
  to_tsvector('spanish', 
    coalesce(name, '') || ' ' || 
    coalesce(code, '') || ' ' || 
    coalesce(description, '')
  )
) 
WHERE deleted_at IS NULL;

-- Índice compuesto para filtros de probabilidad e impacto
-- Usado cuando hay filtros minProbability, maxProbability, minImpact, maxImpact
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_probability_impact 
ON risks(probability, impact) 
WHERE deleted_at IS NULL;

-- ============================================================
-- OPTIMIZACIÓN PARA /api/users (GET /api/users)
-- ============================================================

-- Índice para ordenamiento por createdAt (usado en ORDER BY)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at 
ON users(created_at DESC);

-- Índice compuesto para usuarios activos ordenados por fecha de creación
-- Útil si en el futuro se filtra por usuarios activos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_created 
ON users(is_active, created_at DESC) 
WHERE is_active = true;

-- ============================================================
-- ACTUALIZAR ESTADÍSTICAS
-- ============================================================

-- Actualizar estadísticas para que el planificador de consultas use los nuevos índices
VACUUM ANALYZE risks;
VACUUM ANALYZE users;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================

-- Verificar que los índices se crearon correctamente
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('risks', 'users') 
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

SELECT 'Índices de optimización creados exitosamente!' as status;
