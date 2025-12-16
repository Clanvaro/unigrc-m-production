# Configuración de Firebase Hosting para Unigrc

Firebase Hosting actúa como proxy para tu aplicación Cloud Run, permitiendo usar dominios personalizados fácilmente y sin necesidad de un Load Balancer.

## Ventajas de Firebase Hosting

- ✅ **Dominios personalizados**: Configuración simple desde Firebase Console
- ✅ **SSL automático**: Certificados gestionados por Google
- ✅ **CDN global**: Contenido estático servido desde edge locations
- ✅ **Costo bajo**: ~$0.026/GB transferido (vs $18/mes base del Load Balancer)
- ✅ **Funciona con cualquier región**: No necesitas migrar a us-east1
- ✅ **Proxy a Cloud Run**: Las rutas `/api/**` se redirigen automáticamente al backend

## Requisitos Previos

1. **Firebase CLI instalado**:
```bash
npm install -g firebase-tools
```

2. **Autenticación con Firebase**:
```bash
firebase login
```

3. **Proyecto Firebase creado** (o usar el proyecto GCP existente `unigrc-m`):
```bash
firebase use unigrc-m
```

## Configuración Inicial

### Paso 1: Habilitar Firebase Hosting en tu proyecto

```bash
# Habilitar Firebase Hosting API
gcloud services enable firebasehosting.googleapis.com --project=unigrc-m

# Inicializar Firebase Hosting (si no está inicializado)
firebase init hosting
```

### Paso 2: Configurar Cloud Run para aceptar requests de Firebase

Firebase Hosting necesita permisos para invocar tu servicio de Cloud Run. Asegúrate de que el servicio tenga `--allow-unauthenticated` (ya lo tienes configurado).

### Paso 3: Verificar configuración

Los archivos `firebase.json` y `.firebaserc` ya están configurados. Verifica que:

- `firebase.json` apunta al servicio correcto: `unigrc-backend` en `southamerica-west1`
- `.firebaserc` tiene el proyecto correcto: `unigrc-m`

## Despliegue

### Desplegar Frontend a Firebase Hosting

```bash
# Build y deploy en un solo comando
npm run firebase:deploy:hosting

# O paso a paso:
npm run build
firebase deploy --only hosting
```

### Desplegar solo el frontend (sin rebuild)

```bash
npm run firebase:deploy
```

## Configurar Dominio Personalizado

### Paso 1: Agregar dominio en Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto `unigrc-m`
3. Ve a **Hosting** → **Agregar dominio personalizado**
4. Ingresa `cl.unigrc.app` (subdominio para la aplicación)
5. Firebase te dará registros DNS para configurar

### Paso 2: Configurar DNS en GoDaddy

Firebase te proporcionará registros tipo A o CNAME. Configúralos en GoDaddy:

1. Inicia sesión en GoDaddy
2. Ve a **Mis Productos** → **Dominios** → `unigrc.app` → **DNS**
3. Agrega los registros que Firebase te proporcionó

**Para el subdominio `cl.unigrc.app`, Firebase normalmente usa CNAME:**

```
Tipo: CNAME
Nombre: cl
Valor: [valor CNAME proporcionado por Firebase, algo como: unigrc-m.web.app]
TTL: 3600
```

**Nota:** Si Firebase te da registros tipo A, úsalos en lugar de CNAME. El nombre del registro debe ser `cl` (no `@`).

### Paso 3: Verificar dominio

Firebase verificará automáticamente el dominio. Esto puede tardar unos minutos hasta 48 horas, pero normalmente es rápido.

Una vez verificado:
- ✅ SSL se configura automáticamente
- ✅ El dominio estará activo
- ✅ Las rutas `/api/**` se redirigirán a Cloud Run automáticamente

## Estructura de Rutas

Con Firebase Hosting configurado:

- `https://cl.unigrc.app/` → Frontend (servido desde Firebase CDN)
- `https://cl.unigrc.app/api/**` → Backend Cloud Run (proxy automático)
- `https://cl.unigrc.app/risks` → Frontend SPA route
- `https://cl.unigrc.app/validation` → Frontend SPA route

## Costos

### Firebase Hosting
- **Almacenamiento**: $0.026/GB/mes
- **Transferencia**: $0.026/GB (primeros 10GB gratis/mes)
- **SSL**: Gratis

### Comparación con Load Balancer
- **Load Balancer**: ~$24-30 USD/mes (base) + transferencia
- **Firebase Hosting**: ~$0-5 USD/mes (dependiendo del tráfico)

Para una aplicación con tráfico moderado, Firebase Hosting es significativamente más económico.

## Actualizar Backend URL en Frontend

Si cambias el dominio, actualiza la variable de entorno del frontend:

```bash
# En cloudbuild-frontend.yaml, actualiza API_URL si es necesario
# Pero con Firebase Hosting, puedes usar rutas relativas:
# API_URL=/api (en lugar de URL absoluta)
```

O mantén la URL absoluta del backend de Cloud Run si prefieres.

## Troubleshooting

### Error: "Service not found"
- Verifica que el servicio `unigrc-backend` existe en `southamerica-west1`
- Verifica que tiene `--allow-unauthenticated`

### Error: "Permission denied"
- Asegúrate de tener permisos de Firebase Hosting
- Verifica que Firebase Hosting API está habilitada

### El dominio no funciona
- Verifica los registros DNS en GoDaddy
- Espera hasta 48 horas para propagación DNS
- Verifica el estado en Firebase Console → Hosting → Dominios

### Las rutas /api no funcionan
- Verifica que `firebase.json` tiene la configuración correcta de rewrites
- Verifica que el servicio Cloud Run está corriendo
- Revisa los logs de Firebase Hosting en la consola

## Comandos Útiles

```bash
# Ver configuración actual
firebase hosting:sites:list

# Ver logs de deployment
firebase hosting:channel:list

# Servir localmente (para testing)
firebase serve

# Ver estado del dominio
firebase hosting:sites:get unigrc-app
```

## Próximos Pasos

1. ✅ Desplegar frontend a Firebase Hosting
2. ✅ Configurar subdominio `cl.unigrc.app` en Firebase Console
3. ✅ Configurar DNS en GoDaddy (registro CNAME para `cl`)
4. ✅ Verificar que todo funciona
5. ✅ (Opcional) Configurar redirección de `unigrc.app` → `cl.unigrc.app` si deseas

## Referencias

- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
- [Cloud Run Integration](https://firebase.google.com/docs/hosting/cloud-run)
- [Custom Domains](https://firebase.google.com/docs/hosting/custom-domain)

