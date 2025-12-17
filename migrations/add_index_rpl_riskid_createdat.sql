-- ============================================================
-- ÍNDICE ESPECÍFICO PARA OPTIMIZAR getRisksLite() LATERAL JOIN
-- Este índice optimiza la búsqueda del risk_process_link más reciente
-- Ejecutar con: npm run apply-rpl-index
-- ============================================================

-- Índice específico para el LATERAL JOIN en getRisksLite()
-- Permite que el ORDER BY ... LIMIT 1 por risk deje de escanear toda la tabla
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rpl_riskid_createdat_desc
ON risk_process_links (risk_id, created_at DESC)
WHERE responsible_override_id IS NOT NULL;

-- Actualizar estadísticas para que el planner use el nuevo índice
ANALYZE risk_process_links;

-- Verificar que el índice fue creado
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname = 'idx_rpl_riskid_createdat_desc';

