# 🔒 Corrección de Seguridad: Platform Admin Access Control

## ⚠️ Problema Identificado

Múltiples usuarios tienen acceso a Platform Admin cuando **solo** `valencia.araneda@gmail.com` debería tener este privilegio.

## 🎯 Objetivo

Revocar acceso Platform Admin de todos los usuarios excepto `valencia.araneda@gmail.com`.

---

## 📋 Instrucciones Paso a Paso

### Paso 1: Acceder a la Base de Datos de Producción

1. Ve a tu proyecto en Replit: https://replit.com/@your-username/uni-grc
2. En el panel lateral izquierdo, haz clic en **"Tools"** (🔧)
3. Selecciona **"Database"**
4. Cambia a la pestaña **"Production"** (no Development)
5. Haz clic en **"Query"** o **"SQL Editor"**

### Paso 2: Auditar Estado Actual

Copia y ejecuta este query para ver quién tiene acceso actualmente:

```sql
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
```

**Resultado esperado:** Verás una lista de todos los usuarios con `is_platform_admin = true`. Probablemente incluye varios usuarios.

---

### Paso 3: Aplicar la Corrección (CON SEGURIDAD)

**⚠️ IMPORTANTE:** Copia y ejecuta este bloque completo como una sola consulta:

```sql
BEGIN;

-- Revocar acceso de TODOS los usuarios
UPDATE users 
SET is_platform_admin = false
WHERE is_platform_admin = true;

-- Dar acceso SOLO al usuario correcto
UPDATE users 
SET is_platform_admin = true
WHERE email = 'valencia.araneda@gmail.com';

-- Verificar el cambio
SELECT 
    id,
    email,
    username,
    is_platform_admin,
    'SOLO este usuario debe aparecer' as nota
FROM users
WHERE is_platform_admin = true;

COMMIT;
```

**¿Qué hace esto?**
- `BEGIN`: Inicia una transacción (si algo falla, se revierte automáticamente)
- Primer `UPDATE`: Quita el acceso de todos
- Segundo `UPDATE`: Da acceso solo a valencia.araneda@gmail.com
- `SELECT`: Muestra quién tiene acceso ahora (debe ser solo 1 usuario)
- `COMMIT`: Aplica los cambios permanentemente

**Si ves algún error**, ejecuta `ROLLBACK;` para revertir todos los cambios.

---

### Paso 4: Verificación Final

Ejecuta estos queries para confirmar que todo está correcto:

```sql
-- Debe mostrar exactamente 1
SELECT 
    COUNT(*) as total_platform_admins,
    'Debe ser exactamente 1' as esperado
FROM users
WHERE is_platform_admin = true;

-- Confirmar el usuario correcto
SELECT 
    email,
    is_platform_admin,
    'Este es el único Platform Admin' as confirmacion
FROM users
WHERE email = 'valencia.araneda@gmail.com';

-- Verificar que otros usuarios NO tienen acceso
SELECT 
    email,
    is_platform_admin,
    'Estos usuarios NO deben tener is_platform_admin = true' as nota
FROM users
WHERE is_platform_admin = true 
  AND email != 'valencia.araneda@gmail.com';
```

---

### Paso 5: Probar el Acceso

1. **Cierra sesión** de la aplicación en producción
2. Inicia sesión con `valencia.araneda@gmail.com`
3. **DEBE ver** el menú "Platform Admin" en la barra lateral
4. Puede acceder a `https://uni-grc.replit.app/platform-admin` sin problemas
5. **Prueba con otro usuario** (si existe) - NO debería ver el menú "Platform Admin"

---

## ✅ Confirmación de Éxito

**Después de aplicar la corrección:**

✅ Solo `valencia.araneda@gmail.com` puede acceder a `/platform-admin`  
✅ Otros usuarios NO ven el menú "Platform Admin"  
✅ Todos los usuarios siguen funcionando normalmente con sus roles de organización  

---

## 🔄 ¿Qué pasa si algo sale mal?

### Si ejecutaste BEGIN pero no COMMIT:
```sql
ROLLBACK;
```
Esto revierte todos los cambios y vuelves al estado anterior.

### Si ya ejecutaste COMMIT pero quieres revertir:
```sql
-- Dar acceso nuevamente a valencia.araneda@gmail.com
UPDATE users 
SET is_platform_admin = true
WHERE email = 'valencia.araneda@gmail.com';
```

---

## 📝 Notas Técnicas

- **Este script es idempotente**: Puedes ejecutarlo múltiples veces sin problema
- **No afecta roles de organización**: Los usuarios siguen siendo administradores de sus tenants
- **No elimina datos**: Solo cambia el campo `is_platform_admin`
- **Seguro para producción**: Usa transacciones para evitar estados inconsistentes

---

## 🚀 Archivo SQL Completo

Si prefieres usar el archivo SQL directamente, revisa:
`scripts/fix-platform-admin-production.sql`

---

## ❓ ¿Necesitas ayuda?

Si encuentras algún problema durante la ejecución, verifica:
1. Que estás en la base de datos de **Production** (no Development)
2. Que el usuario `valencia.araneda@gmail.com` existe en la base de datos
3. Que copiaste el bloque completo incluyendo BEGIN y COMMIT
