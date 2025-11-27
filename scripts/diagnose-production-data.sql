-- 🔍 SCRIPT DE DIAGNÓSTICO PARA PRODUCCIÓN
-- Ejecutar este SQL en la base de datos de producción para verificar datos

-- 1. Verificar control C-0002 existe
SELECT id, code, name, tenant_id, status
FROM controls
WHERE code = 'C-0002';

-- 2. Ver todas las asociaciones de riesgos para C-0002
SELECT 
  c.code as control_code,
  c.name as control_name,
  r.code as risk_code,
  r.name as risk_name,
  rc.id as association_id,
  rc.residual_risk
FROM controls c
INNER JOIN risk_controls rc ON c.id = rc.control_id
INNER JOIN risks r ON rc.risk_id = r.id
WHERE c.code = 'C-0002'
  AND c.status != 'deleted'
  AND r.status != 'deleted';

-- 3. Contar riesgos por control (todos los controles)
SELECT 
  c.code,
  c.name,
  COUNT(rc.id) as risk_count,
  STRING_AGG(r.code, ', ' ORDER BY r.code) as associated_risks
FROM controls c
LEFT JOIN risk_controls rc ON c.id = rc.control_id
LEFT JOIN risks r ON rc.risk_id = r.id AND r.status != 'deleted'
WHERE c.status != 'deleted'
GROUP BY c.id, c.code, c.name
ORDER BY c.code;

-- 4. Verificar que no hay asociaciones duplicadas
SELECT 
  rc.control_id,
  rc.risk_id,
  COUNT(*) as duplicate_count
FROM risk_controls rc
GROUP BY rc.control_id, rc.risk_id
HAVING COUNT(*) > 1;

-- 5. Verificar tenant_id consistency
SELECT 
  rc.id,
  c.code as control_code,
  c.tenant_id as control_tenant,
  r.code as risk_code,
  r.tenant_id as risk_tenant,
  CASE 
    WHEN c.tenant_id != r.tenant_id THEN 'INCONSISTENT ❌'
    ELSE 'OK ✅'
  END as tenant_check
FROM risk_controls rc
INNER JOIN controls c ON rc.control_id = c.id
INNER JOIN risks r ON rc.risk_id = r.id
WHERE c.tenant_id != r.tenant_id;
