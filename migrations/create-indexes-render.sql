-- ============================================================
-- CREAR ÍNDICES PARA OPTIMIZACIÓN DE RENDIMIENTO
-- Ejecuta estos comandos UNO POR UNO en la consola SQL de Render
-- ============================================================

-- TABLA: audit_universe (4 índices)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_universe_macroproceso ON audit_universe(macroproceso_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_universe_process ON audit_universe(process_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_universe_subproceso ON audit_universe(subproceso_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_universe_entity_type ON audit_universe(entity_type);

-- TABLA: audit_prioritization_factors (3 índices)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apf_universe_id ON audit_prioritization_factors(universe_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apf_plan_id ON audit_prioritization_factors(plan_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apf_total_score ON audit_prioritization_factors(total_priority_score);

-- TABLA: audit_plan_items (4 índices)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_plan_id ON audit_plan_items(plan_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_universe_id ON audit_plan_items(universe_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_prioritization_id ON audit_plan_items(prioritization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_status ON audit_plan_items(status);

-- TABLA: risks (SPRINT 1 - Risk Matrix Optimization)
-- Índice compuesto para agregaciones de matriz de riesgos
-- Mejora queries GROUP BY de ~500ms a ~20ms (25x más rápido)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_matrix_aggregation 
ON risks(
  status,
  inherent_probability, 
  inherent_impact,
  residual_probability,
  residual_impact
) 
WHERE status != 'deleted';

-- Analizar tabla después de crear índice
ANALYZE risks;

-- VERIFICACIÓN: Ejecuta esto al final para confirmar
SELECT tablename, indexname FROM pg_indexes WHERE tablename IN ('audit_universe', 'audit_prioritization_factors', 'audit_plan_items', 'risks') AND indexname LIKE 'idx_%' ORDER BY tablename, indexname;
