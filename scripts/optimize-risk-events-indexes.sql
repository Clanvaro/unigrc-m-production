-- ============================================================
-- OPTIMIZACIÓN: ÍNDICES PARA PÁGINA DE EVENTOS DE RIESGOS
-- Ejecuta estos comandos en Cloud SQL para acelerar la carga
-- ============================================================

-- Índice compuesto para la query principal (deleted_at + event_date DESC)
-- Ya aplicado por el usuario, pero incluido aquí para referencia
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_events_deleted_date 
-- ON risk_events(deleted_at, event_date DESC) 
-- WHERE deleted_at IS NULL;

-- Índice para controlId (usado en filtros y joins)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_events_control_id 
ON risk_events(control_id) 
WHERE deleted_at IS NULL;

-- Índices en tablas de relaciones para queries paralelas
-- Optimiza las queries que buscan relaciones por risk_event_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_event_macroprocesos_event_id 
ON risk_event_macroprocesos(risk_event_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_event_processes_event_id 
ON risk_event_processes(risk_event_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_event_subprocesos_event_id 
ON risk_event_subprocesos(risk_event_id);

-- Índice adicional para macroprocesoId en relaciones (si se filtra por macroproceso)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_event_macroprocesos_macro_id 
ON risk_event_macroprocesos(macroproceso_id);

-- Índice adicional para processId en relaciones (si se filtra por proceso)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_event_processes_process_id 
ON risk_event_processes(process_id);

-- Actualizar estadísticas para el query planner
ANALYZE risk_events;
ANALYZE risk_event_macroprocesos;
ANALYZE risk_event_processes;
ANALYZE risk_event_subprocesos;

-- Verificar índices creados
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('risk_events', 'risk_event_macroprocesos', 'risk_event_processes', 'risk_event_subprocesos')
AND indexname LIKE 'idx_risk_event%'
ORDER BY tablename, indexname;

