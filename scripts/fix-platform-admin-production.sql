-- ============================================================================
-- CORRECCIÓN DE SEGURIDAD: Platform Admin Access Control
-- ============================================================================
-- PROBLEMA: Múltiples usuarios tienen acceso a Platform Admin
-- SOLUCIÓN: Solo valencia.araneda@gmail.com debe tener isPlatformAdmin = true
-- ============================================================================

-- PASO 1: AUDITAR ESTADO ACTUAL
-- Ejecuta esto primero para ver qué usuarios tienen acceso actualmente
-- ============================================================================

SELECT 
    id,
    email,
    username,
    full_name,
    is_platform_admin,
    is_active,
    created_at
FROM users
WHERE is_platform_admin = true
ORDER BY email;

-- ============================================================================
-- PASO 2: CORRECCIÓN SEGURA (USAR TRANSACCIÓN)
-- ============================================================================
-- IMPORTANTE: Ejecuta este bloque completo como una sola transacción
-- Si algo falla, se revierte automáticamente
-- ============================================================================

BEGIN;

-- 2.1: Primero, revocar acceso Platform Admin de TODOS los usuarios
UPDATE users 
SET is_platform_admin = false
WHERE is_platform_admin = true;

-- 2.2: Dar acceso Platform Admin SOLO al usuario correcto
UPDATE users 
SET is_platform_admin = true
WHERE email = 'valencia.araneda@gmail.com';

-- 2.3: Verificar que el cambio se aplicó correctamente
-- Debería mostrar SOLO valencia.araneda@gmail.com
SELECT 
    id,
    email,
    username,
    is_platform_admin,
    'VERIFICACIÓN: Solo este usuario debe aparecer' as nota
FROM users
WHERE is_platform_admin = true;

-- Si todo se ve bien, ejecuta COMMIT para aplicar los cambios:
COMMIT;

-- Si algo salió mal, ejecuta ROLLBACK para revertir:
-- ROLLBACK;

-- ============================================================================
-- PASO 3: VERIFICACIÓN FINAL
-- ============================================================================
-- Ejecuta esto después del COMMIT para confirmar que todo está correcto
-- ============================================================================

-- 3.1: Verificar que SOLO valencia.araneda@gmail.com tiene acceso
SELECT 
    COUNT(*) as total_platform_admins,
    'Debe ser exactamente 1' as esperado
FROM users
WHERE is_platform_admin = true;

-- 3.2: Confirmar el usuario correcto
SELECT 
    email,
    is_platform_admin,
    'Este es el único Platform Admin' as confirmacion
FROM users
WHERE email = 'valencia.araneda@gmail.com';

-- 3.3: Verificar que otros usuarios NO tienen acceso
SELECT 
    email,
    is_platform_admin,
    'Estos usuarios NO deben tener is_platform_admin = true' as nota
FROM users
WHERE is_platform_admin = true 
  AND email != 'valencia.araneda@gmail.com';

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================
-- 1. Este script es IDEMPOTENTE - puedes ejecutarlo múltiples veces sin problema
-- 2. Usa transacciones (BEGIN/COMMIT) para seguridad
-- 3. Si el usuario valencia.araneda@gmail.com no existe, el UPDATE no hará nada
-- 4. Los usuarios normales pueden seguir teniendo roles de admin dentro de sus organizaciones
-- 5. Este script SOLO afecta el campo is_platform_admin, no los roles de tenant
-- ============================================================================
