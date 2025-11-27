-- Migración de compromisos de hallazgos a tabla unificada de acciones
-- Este script mueve los compromisos almacenados en audit_findings a la tabla actions

-- Paso 1: Insertar acciones desde hallazgos que tengan agreed_action
INSERT INTO actions (
  code,
  origin,
  audit_finding_id,
  title,
  description,
  responsible,
  due_date,
  priority,
  status,
  progress,
  management_response,
  agreed_action,
  created_by,
  created_at,
  updated_at
)
SELECT
  'ACT-MIG-' || af.code, -- Código temporal, se regenerará
  'audit'::text, -- Origen: auditoría
  af.id, -- ID del hallazgo
  COALESCE(af.agreed_action, af.title), -- Título del plan de acción
  af.recommendation, -- Descripción
  af.responsible_person, -- Responsable
  af.due_date, -- Fecha límite
  CASE
    WHEN af.severity = 'critical' THEN 'critical'::text
    WHEN af.severity = 'high' THEN 'high'::text
    WHEN af.severity = 'medium' THEN 'medium'::text
    ELSE 'low'::text
  END, -- Prioridad basada en severidad
  'approved'::text, -- Estado inicial: aprobado (nacen validados)
  0, -- Progreso inicial: 0%
  af.management_response, -- Respuesta de la administración
  af.agreed_action, -- Acción acordada
  af.identified_by, -- Creado por el mismo usuario que identificó el hallazgo
  af.created_at, -- Fecha de creación original
  NOW() -- Fecha de actualización
FROM audit_findings af
WHERE 
  af.agreed_action IS NOT NULL 
  AND af.agreed_action != ''
  -- Solo migrar si no existe ya una acción para este hallazgo
  AND NOT EXISTS (
    SELECT 1 FROM actions a 
    WHERE a.audit_finding_id = af.id 
    AND a.title = COALESCE(af.agreed_action, af.title)
  );

-- Paso 2: Actualizar códigos secuenciales
-- Los códigos ACT-MIG-* se regenerarán automáticamente por el sistema
-- o podemos ejecutar un UPDATE para renumerarlos correctamente

-- Paso 3: Verificación
SELECT 
  COUNT(*) as total_acciones_migradas,
  COUNT(DISTINCT audit_finding_id) as hallazgos_con_acciones
FROM actions
WHERE origin = 'audit';

-- Paso 4: Mostrar hallazgos migrados
SELECT 
  af.code as hallazgo_codigo,
  af.title as hallazgo_titulo,
  a.code as accion_codigo,
  a.title as accion_titulo,
  a.status as accion_estado
FROM audit_findings af
INNER JOIN actions a ON a.audit_finding_id = af.id
WHERE a.origin = 'audit'
ORDER BY af.created_at DESC
LIMIT 10;
