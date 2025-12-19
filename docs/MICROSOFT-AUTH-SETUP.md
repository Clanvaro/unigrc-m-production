# 🔐 Configuración de Autenticación con Microsoft

Esta guía explica cómo configurar la autenticación con Microsoft (Azure AD / Microsoft Entra ID) para permitir que los usuarios inicien sesión con sus cuentas de Microsoft personales o corporativas.

## 📋 Requisitos Previos

- Una cuenta de Azure con acceso a Azure Portal
- Permisos para crear aplicaciones en Azure Active Directory
- Acceso a las variables de entorno de tu aplicación

## 🚀 Pasos de Configuración

### 1. Registrar la Aplicación en Azure Portal

1. **Accede a Azure Portal**
   - Ve a [https://portal.azure.com](https://portal.azure.com)
   - Inicia sesión con tu cuenta de Azure

2. **Navega a Azure Active Directory**
   - En el menú lateral, busca "Azure Active Directory" o "Microsoft Entra ID"
   - Haz clic en "App registrations" (Registros de aplicaciones)

3. **Crear Nueva Aplicación**
   - Haz clic en "New registration" (Nuevo registro)
   - Completa el formulario:
     - **Name**: `UniGRC` (o el nombre que prefieras)
     - **Supported account types**: 
       - ✅ **"Accounts in any organizational directory and personal Microsoft accounts"**
       - Esto permite tanto cuentas corporativas como personales
     - **Redirect URI**: 
       - Platform: `Web`
       - URL: `https://tu-dominio.com/api/auth/microsoft/callback`
       - ⚠️ **IMPORTANTE**: Reemplaza `tu-dominio.com` con tu dominio real
   - Haz clic en "Register"

4. **Obtener Credenciales**
   - Una vez creada la aplicación, verás la página de "Overview"
   - **Application (client) ID**: Este es tu `MICROSOFT_CLIENT_ID`
   - Cópialo y guárdalo de forma segura

5. **Crear Client Secret**
   - En el menú lateral, ve a "Certificates & secrets"
   - Haz clic en "New client secret"
   - Completa:
     - **Description**: `UniGRC Production Secret` (o el nombre que prefieras)
     - **Expires**: Selecciona la duración (recomendado: 24 meses)
   - Haz clic en "Add"
   - ⚠️ **IMPORTANTE**: Copia el **Value** del secret inmediatamente (solo se muestra una vez)
   - Este es tu `MICROSOFT_CLIENT_SECRET`

6. **Configurar Permisos de API**
   - En el menú lateral, ve a "API permissions"
   - Verifica que estos permisos estén configurados:
     - ✅ `openid` (OpenID Connect sign-in)
     - ✅ `email`
     - ✅ `profile`
     - ✅ `offline_access`
   - Si falta alguno, haz clic en "Add a permission" → "Microsoft Graph" → "Delegated permissions" y agrégalos
   - Haz clic en "Grant admin consent" si es necesario

### 2. Configurar Variables de Entorno

Agrega las siguientes variables de entorno en tu plataforma de despliegue (Cloud Run, Render, etc.):

```bash
# Microsoft OAuth Configuration
MICROSOFT_CLIENT_ID=tu-client-id-aqui
MICROSOFT_CLIENT_SECRET=tu-client-secret-aqui
MICROSOFT_TENANT_ID=common  # 'common' para personal y corporativo, o un tenant específico
FRONTEND_URL=https://tu-dominio.com  # URL base de tu aplicación
```

#### Explicación de Variables:

- **MICROSOFT_CLIENT_ID**: El Application (client) ID que copiaste del Azure Portal
- **MICROSOFT_CLIENT_SECRET**: El Value del client secret que creaste
- **MICROSOFT_TENANT_ID**: 
  - `common`: Permite cuentas personales y corporativas (recomendado)
  - `organizations`: Solo cuentas corporativas
  - `consumers`: Solo cuentas personales
  - `{tenant-id}`: Un tenant específico de Azure AD
- **FRONTEND_URL**: La URL base de tu aplicación (usada para construir el callback URL)

### 3. Configurar Redirect URI en Azure

Asegúrate de que el Redirect URI en Azure Portal coincida exactamente con:

```
https://tu-dominio.com/api/auth/microsoft/callback
```

Si tu aplicación está en desarrollo local, también puedes agregar:

```
http://localhost:5000/api/auth/microsoft/callback
```

### 4. Verificar la Configuración

1. **Reinicia tu aplicación** para que cargue las nuevas variables de entorno
2. **Verifica los logs** al iniciar la aplicación:
   - Deberías ver: `🔐 Configuring Microsoft Auth for production`
   - Y: `[Microsoft Auth] Callback URL: https://tu-dominio.com/api/auth/microsoft/callback`
3. **Prueba el login**:
   - Ve a la página de login
   - Haz clic en "Continuar con Microsoft"
   - Deberías ser redirigido a Microsoft para autenticarte

## 🔧 Solución de Problemas

### Error: "Microsoft Auth not configured"

**Causa**: Las variables de entorno no están configuradas o no son accesibles.

**Solución**:
1. Verifica que `MICROSOFT_CLIENT_ID` y `MICROSOFT_CLIENT_SECRET` estén configuradas
2. Reinicia la aplicación después de agregar las variables
3. Verifica los logs para confirmar que las variables se están leyendo

### Error: "redirect_uri_mismatch"

**Causa**: El Redirect URI en Azure Portal no coincide con el que usa la aplicación.

**Solución**:
1. Verifica que el Redirect URI en Azure Portal sea exactamente: `https://tu-dominio.com/api/auth/microsoft/callback`
2. Verifica que `FRONTEND_URL` esté configurada correctamente
3. Asegúrate de que no haya espacios o caracteres especiales en la URL

### Error: "invalid_client"

**Causa**: El Client ID o Client Secret son incorrectos.

**Solución**:
1. Verifica que `MICROSOFT_CLIENT_ID` sea el Application (client) ID correcto
2. Verifica que `MICROSOFT_CLIENT_SECRET` sea el Value del secret (no el Secret ID)
3. Si el secret expiró, crea uno nuevo y actualiza la variable de entorno

### Error: "User not found" después de autenticarse

**Causa**: El usuario se autenticó correctamente pero no existe en la base de datos.

**Solución**:
- Esto es normal para nuevos usuarios. El sistema creará automáticamente un usuario con el email de Microsoft.
- Si el usuario ya existe con ese email, se actualizará con la información de Microsoft.

### El botón de Microsoft no aparece

**Causa**: El componente frontend no se actualizó o hay un error de compilación.

**Solución**:
1. Verifica que el archivo `client/src/pages/login.tsx` tenga el botón de Microsoft
2. Recompila el frontend: `npm run build`
3. Verifica que no haya errores de TypeScript o compilación

## 📝 Notas Importantes

1. **Seguridad del Client Secret**:
   - Nunca compartas el Client Secret públicamente
   - No lo incluyas en el código fuente
   - Rótalo periódicamente (cada 6-12 meses)

2. **Redirect URIs**:
   - Solo puedes usar HTTPS en producción (excepto localhost)
   - Asegúrate de que el dominio coincida exactamente

3. **Permisos**:
   - Los permisos `openid`, `email`, `profile`, y `offline_access` son suficientes para el login básico
   - No necesitas permisos adicionales a menos que quieras acceder a otros recursos de Microsoft

4. **Cuentas Personales vs Corporativas**:
   - Con `MICROSOFT_TENANT_ID=common`, ambas funcionan
   - Los usuarios pueden elegir qué cuenta usar en el prompt de Microsoft

5. **Actualización de Usuarios**:
   - Si un usuario ya existe con el mismo email, se actualizará con la información de Microsoft
   - El nombre, foto de perfil, etc. se sincronizarán automáticamente

## 🎯 Próximos Pasos

Después de configurar Microsoft Auth:

1. **Prueba el flujo completo**:
   - Login con cuenta personal
   - Login con cuenta corporativa
   - Verifica que los usuarios se creen/actualicen correctamente

2. **Configura permisos**:
   - Asigna roles y permisos a los usuarios que se autentican con Microsoft
   - Puedes hacerlo desde el panel de administración de la aplicación

3. **Monitorea los logs**:
   - Revisa los logs para asegurarte de que no hay errores
   - Los logs incluyen información útil sobre el proceso de autenticación

## 📚 Referencias

- [Microsoft Identity Platform Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [OpenID Connect con Microsoft](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-protocols-oidc)
- [Azure Portal](https://portal.azure.com)
