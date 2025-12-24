-- ============================================================
-- MIGRACIÓN: Crear vista materializada risk_list_view
-- Fecha: 2025-01-XX
-- Descripción: Read-model denormalizado para listados de riesgos
--               Optimiza consultas de listado a 1 query simple
-- ============================================================

-- Crear vista materializada con datos denormalizados
CREATE MATERIALIZED VIEW IF NOT EXISTS risk_list_view AS
SELECT 
  r.id,
  r.code,
  r.name,
  r.description,
  r.status,
  r.probability,
  r.impact,
  r.inherent_risk,
  r.category,
  r.macroproceso_id,
  r.process_id,
  r.subproceso_id,
  r.validation_status,
  r.created_at,
  
  -- Campos denormalizados de procesos
  m.name as macroproceso_name,
  m.code as macroproceso_code,
  p.name as process_name,
  p.code as process_code,
  s.name as subproceso_name,
  s.code as subproceso_code,
  
  -- Agregaciones de controles (pre-calculadas)
  COALESCE(control_stats.control_count, 0)::int as control_count,
  COALESCE(control_stats.avg_effectiveness, 0)::float as avg_effectiveness,
  
  -- Cálculo aproximado de residual risk
  -- NOTA: Este es una aproximación usando AVG(effectiveness)
  -- El cálculo exacto requiere effectTarget y se hace en la aplicación
  -- cuando se necesita precisión total (calculateResidualRiskFromControls)
  CASE 
    WHEN control_stats.control_count > 0 THEN
      r.inherent_risk * (1 - LEAST(control_stats.avg_effectiveness, 100) / 100.0)
    ELSE r.inherent_risk
  END::numeric(5,1) as residual_risk_approx,
  
  -- Agregaciones de procesos relacionados
  COALESCE(process_stats.process_count, 0)::int as process_count,
  
  -- Agregaciones de planes de acción
  COALESCE(action_stats.action_plan_count, 0)::int as action_plan_count,
  
  -- Última actualización (para invalidación)
  NOW() as materialized_at
  
FROM risks r
LEFT JOIN macroprocesos m ON r.macroproceso_id = m.id AND (m.deleted_at IS NULL OR m.deleted_at > NOW())
LEFT JOIN processes p ON r.process_id = p.id AND (p.deleted_at IS NULL OR p.deleted_at > NOW())
LEFT JOIN subprocesos s ON r.subproceso_id = s.id AND (s.deleted_at IS NULL OR s.deleted_at > NOW())

-- Subquery para estadísticas de controles
LEFT JOIN LATERAL (
  SELECT 
    COUNT(rc.id)::int as control_count,
    AVG(c.effectiveness)::float as avg_effectiveness
  FROM risk_controls rc
    INNER JOIN controls c ON rc.control_id = c.id
  WHERE rc.risk_id = r.id 
    AND c.deleted_at IS NULL
) control_stats ON true

-- Subquery para conteo de procesos relacionados
LEFT JOIN LATERAL (
  SELECT COUNT(DISTINCT rpl.process_id)::int as process_count
  FROM risk_process_links rpl
  WHERE rpl.risk_id = r.id
) process_stats ON true

-- Subquery para conteo de planes de acción
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int as action_plan_count
  FROM actions a
  WHERE a.risk_id = r.id 
    AND a.origin = 'risk'
    AND a.deleted_at IS NULL
) action_stats ON true

WHERE r.status <> 'deleted';

-- ============================================================
-- ÍNDICE ÚNICO (REQUERIDO para REFRESH CONCURRENTLY)
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS ux_risk_list_view_id ON risk_list_view(id);

-- ============================================================
-- ÍNDICES ADICIONALES para búsquedas rápidas
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_risk_list_view_status ON risk_list_view(status);
CREATE INDEX IF NOT EXISTS idx_risk_list_view_macroproceso ON risk_list_view(macroproceso_id);
CREATE INDEX IF NOT EXISTS idx_risk_list_view_process ON risk_list_view(process_id);
CREATE INDEX IF NOT EXISTS idx_risk_list_view_subproceso ON risk_list_view(subproceso_id);
CREATE INDEX IF NOT EXISTS idx_risk_list_view_created_at ON risk_list_view(created_at DESC);

-- Índice para búsqueda full-text
CREATE INDEX IF NOT EXISTS idx_risk_list_view_search ON risk_list_view 
USING gin(to_tsvector('spanish', COALESCE(name, '') || ' ' || COALESCE(code, '')));

-- Índice compuesto para filtros comunes
CREATE INDEX IF NOT EXISTS idx_risk_list_view_filters ON risk_list_view(status, macroproceso_id, process_id) 
WHERE status <> 'deleted';

-- ============================================================
-- REFRESH INICIAL
-- ============================================================
REFRESH MATERIALIZED VIEW risk_list_view;

-- ============================================================
-- COMENTARIOS
-- ============================================================
COMMENT ON MATERIALIZED VIEW risk_list_view IS 'Read-model denormalizado para listados de riesgos. Se actualiza cada 5 minutos o por eventos.';
COMMENT ON INDEX ux_risk_list_view_id IS 'Índice único requerido para REFRESH MATERIALIZED VIEW CONCURRENTLY';

