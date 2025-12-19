# Fix: SPA Routing en Cloud Storage

## Problema

Después de eliminar el servicio frontend de Cloud Run y servir el frontend desde Cloud Storage, las rutas del SPA (como `/compliance-officers`) devuelven error 404 "Page not found".

## Causa

Cloud Storage no maneja rutas del lado del cliente (client-side routing) automáticamente. Cuando accedes a una ruta como `/compliance-officers`, Cloud Storage busca un archivo físico en esa ruta y no lo encuentra, devolviendo un 404.

En una SPA (Single Page Application), todas las rutas deben servir el mismo archivo `index.html` para que el router del lado del cliente pueda manejar la navegación.

## Solución

Usar una Cloud Function que sirva el SPA correctamente desde Cloud Storage, manejando:
- Archivos estáticos (JS, CSS, imágenes) → servirlos directamente
- Rutas del SPA → servir `index.html`
- Rutas `/api/*` → no deberían llegar aquí (manejadas por Load Balancer)

## Pasos para Aplicar la Solución

### 1. Ejecutar el Script de Corrección

```bash
./scripts/fix-spa-routing-load-balancer.sh
```

Este script:
1. Despliega la Cloud Function `serve-spa` si no existe
2. Crea un Network Endpoint Group (NEG) para la Cloud Function
3. Crea un Backend Service para la Cloud Function
4. Actualiza el URL Map del Load Balancer para usar la Cloud Function como default backend

### 2. Verificar la Configuración

Después de ejecutar el script, espera 2-3 minutos para que los cambios se propaguen y luego verifica:

```bash
# Verificar que la Cloud Function está desplegada
gcloud functions describe serve-spa \
  --gen2 \
  --region=southamerica-west1 \
  --project=unigrc-m

# Verificar el URL Map
gcloud compute url-maps describe unigrc-frontend-url-map \
  --global \
  --project=unigrc-m
```

### 3. Probar las Rutas

Accede a:
- `https://cl.unigrc.app/` → Debe cargar el frontend
- `https://cl.unigrc.app/compliance-officers` → Debe cargar el frontend (no 404)
- `https://cl.unigrc.app/api/auth/me` → Debe ir al backend (Cloud Run)

## Configuración del URL Map

Después de aplicar la solución, el URL Map debería estar configurado así:

```
Default Backend: unigrc-spa-service (Cloud Function)
Path Matcher:
  - /api/* → unigrc-backend-service (Cloud Run)
  - /* → unigrc-spa-service (Cloud Function)
```

## Cloud Function

La Cloud Function (`gcp/cloud-function-spa/index.js`) maneja:

1. **Archivos estáticos**: Si la ruta termina en `.js`, `.css`, `.png`, etc., intenta servirlo desde Cloud Storage
2. **Rutas del SPA**: Para todas las demás rutas, sirve `index.html` desde Cloud Storage
3. **Rutas de API**: Si llega una ruta `/api/*` (no debería), devuelve 404

## Troubleshooting

### Error: Cloud Function no se despliega

Verifica que tienes permisos:
```bash
gcloud projects get-iam-policy unigrc-m
```

Necesitas el rol `roles/cloudfunctions.developer` o `roles/owner`.

### Error: URL Map no se actualiza

Verifica que tienes permisos:
```bash
gcloud projects get-iam-policy unigrc-m
```

Necesitas el rol `roles/compute.admin` o `roles/owner`.

### Las rutas siguen dando 404

1. Espera 2-3 minutos para que los cambios se propaguen
2. Limpia la caché del CDN:
   ```bash
   gcloud compute url-maps invalidate-cdn-cache unigrc-frontend-url-map \
     --path="/*" \
     --global \
     --project=unigrc-m
   ```
3. Verifica que la Cloud Function está funcionando:
   ```bash
   curl https://serve-spa-xxxxx-uc.a.run.app/
   ```

### La Cloud Function devuelve error 500

Revisa los logs:
```bash
gcloud functions logs read serve-spa \
  --gen2 \
  --region=southamerica-west1 \
  --project=unigrc-m \
  --limit=50
```

Verifica que:
- El bucket `unigrc-frontend-prod` existe
- El archivo `index.html` existe en el bucket
- La Cloud Function tiene permisos para leer el bucket

## Alternativas

Si prefieres no usar Cloud Function, puedes:

1. **Usar un servicio Cloud Run mínimo** que sirva el SPA desde Cloud Storage
2. **Usar Firebase Hosting** que maneja SPA routing automáticamente
3. **Configurar un servidor web (nginx)** en una VM que sirva el SPA

La Cloud Function es la solución más simple y económica para este caso.
