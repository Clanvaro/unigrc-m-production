-- Índice compuesto para optimizar consultas de gerencias
-- Este índice optimiza la consulta: WHERE deleted_at IS NULL ORDER BY level, order

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gerencias_deleted_level_order 
ON gerencias(deleted_at, level, "order") 
WHERE deleted_at IS NULL;

-- Índice adicional para deleted_at si no existe
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gerencias_deleted_at 
ON gerencias(deleted_at);

-- Actualizar estadísticas para el query planner
ANALYZE gerencias;
