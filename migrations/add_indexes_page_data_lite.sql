-- Índices para optimizar /api/risks/page-data-lite
-- Ejecutar con: psql $DATABASE_URL -f migrations/add_indexes_page_data_lite.sql

-- Índice compuesto para el LATERAL JOIN en getRisksLite()
-- Optimiza la búsqueda del risk_process_link más reciente con responsible_override_id
CREATE INDEX IF NOT EXISTS idx_risk_process_links_risk_created 
ON risk_process_links(risk_id, created_at DESC NULLS LAST)
WHERE responsible_override_id IS NOT NULL;

-- Índice adicional para mejorar aún más la performance del LATERAL JOIN
-- Incluye responsible_override_id en el índice para evitar lookup adicional
CREATE INDEX IF NOT EXISTS idx_risk_process_links_responsible_override 
ON risk_process_links(risk_id, responsible_override_id, created_at DESC NULLS LAST)
WHERE responsible_override_id IS NOT NULL;

-- Verificar que los índices se crearon correctamente
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname IN (
  'idx_risk_process_links_risk_created',
  'idx_risk_process_links_responsible_override'
)
ORDER BY indexname;
