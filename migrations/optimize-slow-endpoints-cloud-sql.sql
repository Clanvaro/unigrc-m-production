-- Optimización de endpoints lentos: /api/risks y /api/users
-- Versión para ejecutar en Google Cloud SQL Web UI
-- NOTA: Ejecuta cada sección por separado para evitar problemas de transacciones

-- ============================================================
-- OPTIMIZACIÓN PARA /api/risks (GET /api/risks)
-- ============================================================

-- Índice compuesto para optimizar getRisksPaginated
-- Cubre: filtrado por deletedAt, status, y ordenamiento por createdAt
-- Esto mejora significativamente las consultas COUNT(*) y SELECT con ORDER BY
CREATE INDEX IF NOT EXISTS idx_risks_pagination_optimized 
ON risks(deleted_at, status, created_at DESC) 
WHERE deleted_at IS NULL AND status != 'deleted';

-- Índice para búsquedas de texto (name, code, description)
-- Usado cuando hay un filtro de búsqueda
-- NOTA: Este índice usa GIN para búsqueda de texto completo
CREATE INDEX IF NOT EXISTS idx_risks_search_text 
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
CREATE INDEX IF NOT EXISTS idx_risks_probability_impact 
ON risks(probability, impact) 
WHERE deleted_at IS NULL;

-- ============================================================
-- OPTIMIZACIÓN PARA /api/users (GET /api/users)
-- ============================================================

-- Índice para ordenamiento por createdAt (usado en ORDER BY)
CREATE INDEX IF NOT EXISTS idx_users_created_at 
ON users(created_at DESC);

-- Índice compuesto para usuarios activos ordenados por fecha de creación
-- Útil si en el futuro se filtra por usuarios activos
CREATE INDEX IF NOT EXISTS idx_users_active_created 
ON users(is_active, created_at DESC) 
WHERE is_active = true;

-- ============================================================
-- ACTUALIZAR ESTADÍSTICAS
-- ============================================================

-- Actualizar estadísticas para que el planificador de consultas use los nuevos índices
VACUUM ANALYZE risks;
VACUUM ANALYZE users;

-- ============================================================
-- OPTIMIZACIÓN PARA /api/controls (GET /api/controls/with-details)
-- ============================================================

-- Índice compuesto para optimizar getControlsPaginatedWithDetails
-- Cubre: filtrado por status (<> 'deleted'), ordenamiento por code
-- Esto mejora significativamente las consultas con paginación
CREATE INDEX IF NOT EXISTS idx_controls_pagination_optimized 
ON controls(status, code) 
WHERE status <> 'deleted';

-- Índice para búsquedas de texto (name, code, description)
-- Usado cuando hay un filtro de búsqueda
CREATE INDEX IF NOT EXISTS idx_controls_search_text 
ON controls USING gin(
  to_tsvector('spanish', 
    coalesce(name, '') || ' ' || 
    coalesce(code, '') || ' ' || 
    coalesce(description, '')
  )
) 
WHERE status <> 'deleted';

-- Índice compuesto para filtros de efectividad
-- Usado cuando hay filtros minEffectiveness, maxEffectiveness
CREATE INDEX IF NOT EXISTS idx_controls_effectiveness 
ON controls(effectiveness) 
WHERE status <> 'deleted';

-- Índice compuesto para filtros comunes (type, frequency, validationStatus)
CREATE INDEX IF NOT EXISTS idx_controls_filters 
ON controls(type, frequency, validation_status) 
WHERE status <> 'deleted';

-- Índice para control_owners (usado en JOINs con filtro por owner)
CREATE INDEX IF NOT EXISTS idx_control_owners_active 
ON control_owners(control_id, process_owner_id, is_active) 
WHERE is_active = true;

-- ============================================================
-- ACTUALIZAR ESTADÍSTICAS
-- ============================================================

-- Actualizar estadísticas para que el planificador de consultas use los nuevos índices
VACUUM ANALYZE risks;
VACUUM ANALYZE users;
VACUUM ANALYZE controls;
VACUUM ANALYZE control_owners;

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
WHERE tablename IN ('risks', 'users', 'controls', 'control_owners') 
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

SELECT 'Índices de optimización creados exitosamente!' as status;
