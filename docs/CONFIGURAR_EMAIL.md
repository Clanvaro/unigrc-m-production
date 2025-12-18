# Guía de Configuración de Email

Esta guía te ayudará a configurar el servicio de email para que puedas enviar notificaciones de validación de riesgos.

## Opciones Disponibles

El sistema soporta dos proveedores de email:

1. **Mailgun** - Servicio de email transaccional recomendado
2. **SMTP** - Servidor SMTP estándar (Outlook/Office 365, Gmail, etc.)

## Configuración desde la Interfaz

### Paso 1: Acceder a la Configuración

1. Inicia sesión en la aplicación
2. Ve a **Configuración** → **Servicio de Email**
3. O navega directamente a: `/config/email`

### Paso 2: Seleccionar Proveedor

Elige entre:
- **Mailgun** - Para uso profesional y alto volumen
- **SMTP** - Para servidores de email estándar

### Paso 3: Configurar Mailgun

Si eliges Mailgun, necesitarás:

1. **API Key**: Tu clave API de Mailgun
   - Obtén una en: https://app.mailgun.com/app/dashboard
   - Ve a Settings → API Keys

2. **Domain**: Tu dominio verificado en Mailgun
   - Ejemplo: `mg.unigrc.app` o `sandbox-xxx.mailgun.org` (para pruebas)

3. **Email de Remitente**: El email desde el cual se enviarán los correos
   - Ejemplo: `noreply@unigrc.app`
   - Debe estar verificado en Mailgun

**Ejemplo de configuración Mailgun:**
```
API Key: key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Domain: mg.unigrc.app
From: noreply@unigrc.app
```

### Paso 4: Configurar SMTP

Si eliges SMTP, necesitarás:

1. **Servidor SMTP**: Dirección del servidor
   - Outlook/Office 365: `smtp-mail.outlook.com`
   - Gmail: `smtp.gmail.com`
   - Otro: Consulta con tu proveedor

2. **Puerto**: Puerto del servidor SMTP
   - Outlook: `587`
   - Gmail: `587` o `465`
   - Generalmente: `587` (TLS) o `465` (SSL)

3. **Conexión Segura**: Activa si usas SSL (puerto 465)

4. **Usuario**: Tu email completo
   - Ejemplo: `usuario@outlook.com`

5. **Contraseña**: 
   - Para Outlook/Office 365: Tu contraseña normal
   - Para Gmail: Necesitas una "Contraseña de aplicación" (no tu contraseña normal)
     - Ve a: https://myaccount.google.com/apppasswords

6. **Email de Remitente**: Generalmente el mismo que el usuario

**Ejemplo de configuración SMTP (Outlook):**
```
Servidor: smtp-mail.outlook.com
Puerto: 587
Conexión Segura: No (desactivado)
Usuario: usuario@outlook.com
Contraseña: tu_contraseña
From: usuario@outlook.com
```

**Ejemplo de configuración SMTP (Gmail):**
```
Servidor: smtp.gmail.com
Puerto: 587
Conexión Segura: No (desactivado)
Usuario: tu_email@gmail.com
Contraseña: xxxx xxxx xxxx xxxx (contraseña de aplicación de 16 dígitos)
From: tu_email@gmail.com
```

### Paso 5: Probar la Configuración

1. Ingresa un email de prueba en el campo "Email de Prueba"
2. Haz clic en **"Enviar Email de Prueba"**
3. Revisa tu bandeja de entrada (y spam) para confirmar que recibiste el email

### Paso 6: Guardar

1. Haz clic en **"Guardar Configuración"**
2. El sistema probará la conexión automáticamente
3. Si hay errores, revisa los mensajes y corrige la configuración

## Solución de Problemas

### Error: "Servicio de email no configurado"

**Causa**: No se ha guardado ninguna configuración de email.

**Solución**: 
1. Ve a Configuración → Servicio de Email
2. Completa todos los campos requeridos
3. Guarda la configuración

### Error: "Error de conexión con el servicio de email"

**Causa**: Las credenciales son incorrectas o el servidor no está accesible.

**Solución**:
- **Mailgun**: Verifica que el API Key y Domain sean correctos
- **SMTP**: 
  - Verifica usuario y contraseña
  - Para Gmail, asegúrate de usar una "Contraseña de aplicación"
  - Verifica que el puerto sea correcto
  - Si usas puerto 465, activa "Conexión Segura"

### Error: "Configuración guardada pero la conexión de prueba falló"

**Causa**: La configuración se guardó pero no se puede conectar al servicio.

**Solución**:
1. Verifica las credenciales
2. Prueba la conexión con el botón "Enviar Email de Prueba"
3. Revisa los logs del servidor para más detalles

### Los emails no se envían

**Causa**: El servicio de email no está configurado o hay un error.

**Solución**:
1. Verifica que la configuración esté guardada correctamente
2. Revisa los logs del servidor (busca mensajes con "Email service")
3. Prueba enviar un email de prueba desde la configuración
4. Verifica que los destinatarios tengan emails válidos configurados

## Configuración mediante Variables de Entorno (Alternativa)

Si prefieres configurar el email mediante variables de entorno en lugar de la interfaz:

### Mailgun (Variables de Entorno)

```bash
MAILGUN_API_KEY=key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MAILGUN_DOMAIN=mg.unigrc.app
MAILGUN_FROM=noreply@unigrc.app
```

### SMTP (Variables de Entorno)

```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=usuario@outlook.com
SMTP_PASSWORD=tu_contraseña
SMTP_FROM=usuario@outlook.com
```

**Nota**: Si configuras mediante variables de entorno, estas tienen prioridad sobre la configuración guardada en la base de datos.

## Verificación

Después de configurar el email:

1. ✅ Ve a Configuración → Servicio de Email
2. ✅ Deberías ver "Servicio de Email Configurado" con el proveedor activo
3. ✅ Prueba enviar un email de prueba
4. ✅ Intenta enviar emails de validación desde el Centro de Validación

## Soporte

Si continúas teniendo problemas:

1. Revisa los logs del servidor para mensajes de error específicos
2. Verifica que las credenciales sean correctas
3. Asegúrate de que el servicio de email esté accesible desde el servidor
4. Para Mailgun, verifica que tu dominio esté verificado

