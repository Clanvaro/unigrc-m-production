# Guía de Operaciones: Cloud Storage + Cloud CDN

Esta guía describe las operaciones diarias y troubleshooting para el frontend desplegado en Cloud Storage + Cloud CDN.

## Deploy del Frontend

### Deploy a Producción

```bash
# Deploy completo (build + upload + invalidación CDN)
npm run deploy:gcs:prod

# O manualmente
./scripts/deploy-frontend-gcs.sh prod
```

### Deploy a Staging

```bash
npm run deploy:gcs:staging
```

### Deploy con Cloud Build (CI/CD)

El deploy automático se ejecuta cuando se hace push a `main`:

```bash
git push origin main
```

Cloud Build ejecutará `cloudbuild-frontend.yaml` automáticamente.

## Invalidación de Cache CDN

### Invalidar Cache Completo

```bash
npm run invalidate-cdn

# O manualmente
./scripts/invalidate-cdn.sh /index.html /assets/*
```

### Invalidar Archivos Específicos

```bash
./scripts/invalidate-cdn.sh /index.html
./scripts/invalidate-cdn.sh /assets/main.js /assets/main.css
```

### Invalidar desde Cloud Console

1. Ve a **Network Services** → **Load Balancing**
2. Selecciona el URL map `unigrc-frontend-url-map`
3. Haz clic en **Invalidate cache**
4. Ingresa los paths a invalidar (ej: `/index.html`)

## Monitoreo

### Métricas de Cloud CDN

```bash
# Ver hit rate de CDN
gcloud compute backend-services describe unigrc-backend-service \
  --global \
  --format="value(cdnPolicy)" \
  --project=unigrc-m
```

### Logs del Load Balancer

```bash
# Ver logs recientes
gcloud logging read "resource.type=http_load_balancer" \
  --limit=50 \
  --project=unigrc-m

# Filtrar por status code
gcloud logging read "resource.type=http_load_balancer AND httpRequest.status>=400" \
  --limit=50 \
  --project=unigrc-m
```

### Verificar Archivos en Storage

```bash
# Listar archivos en bucket
gsutil ls -r gs://unigrc-frontend-prod

# Verificar que index.html existe
gsutil ls gs://unigrc-frontend-prod/index.html

# Ver headers de un archivo
gsutil stat gs://unigrc-frontend-prod/index.html
```

## Troubleshooting

### El sitio no carga

1. **Verificar que los archivos están en Storage**
   ```bash
   gsutil ls gs://unigrc-frontend-prod/index.html
   ```

2. **Verificar Load Balancer**
   ```bash
   gcloud compute forwarding-rules describe unigrc-frontend-https-rule \
     --global \
     --format="value(IPAddress)" \
     --project=unigrc-m
   ```

3. **Verificar certificado SSL**
   ```bash
   gcloud compute ssl-certificates describe cl-unigrc-app-ssl-cert \
     --global \
     --format="value(managed.status)" \
     --project=unigrc-m
   ```

4. **Revisar logs del Load Balancer**
   ```bash
   gcloud logging read "resource.type=http_load_balancer" \
     --limit=100 \
     --project=unigrc-m
   ```

### Assets no cargan (404)

1. **Verificar que los assets están en Storage**
   ```bash
   gsutil ls gs://unigrc-frontend-prod/assets/
   ```

2. **Verificar headers de cache**
   ```bash
   gsutil stat gs://unigrc-frontend-prod/assets/main.js
   ```

3. **Invalidar cache de CDN**
   ```bash
   ./scripts/invalidate-cdn.sh /assets/*
   ```

### Errores de CORS

1. **Verificar configuración CORS en Storage**
   ```bash
   gsutil cors get gs://unigrc-frontend-prod
   ```

2. **Verificar configuración CORS en backend**
   - Revisar `server/security.ts`
   - Asegurarse de que `cl.unigrc.app` está en allowed origins

3. **Actualizar CORS si es necesario**
   ```bash
   # Ver script setup-gcs-bucket.sh para configuración CORS
   ./scripts/setup-gcs-bucket.sh prod
   ```

### Cache no se invalida

1. **Verificar que la invalidación se ejecutó**
   ```bash
   gcloud compute url-maps describe unigrc-frontend-url-map \
     --global \
     --project=unigrc-m
   ```

2. **Esperar propagación**
   - La invalidación puede tardar varios minutos
   - CDN edge locations necesitan tiempo para actualizar

3. **Invalidar manualmente desde Console**
   - Ve a Load Balancing → URL Maps
   - Selecciona el URL map
   - Haz clic en "Invalidate cache"

### Performance Issues

1. **Verificar hit rate de CDN**
   - Ve a Cloud Console → Network Services → CDN
   - Revisa métricas de hit rate

2. **Verificar headers de cache**
   - Asegúrate de que assets tienen `max-age=31536000, immutable`
   - `index.html` debe tener `no-cache`

3. **Verificar compresión**
   - Load Balancer debe tener compresión habilitada
   - Verificar headers `Content-Encoding: gzip`

## Optimizaciones

### Configurar Compresión en Load Balancer

```bash
gcloud compute backend-services update unigrc-backend-service \
  --enable-compression \
  --global \
  --project=unigrc-m
```

### Ajustar Cache Policies

```bash
# Ver configuración actual
gcloud compute backend-services describe unigrc-backend-service \
  --global \
  --format="value(cdnPolicy)" \
  --project=unigrc-m

# Actualizar cache policy (ejemplo)
gcloud compute backend-services update unigrc-backend-service \
  --cdn-policy-cache-key-include-host=true \
  --cdn-policy-cache-key-include-protocol=true \
  --cdn-policy-cache-key-include-query-string=false \
  --global \
  --project=unigrc-m
```

### Configurar Alertas

1. Ve a **Monitoring** → **Alerting**
2. Crea alertas para:
   - Error rate alto (> 5%)
   - Latencia alta (> 1s p95)
   - CDN hit rate bajo (< 80%)

## Mantenimiento Regular

### Revisión Semanal

- [ ] Revisar métricas de CDN hit rate
- [ ] Revisar logs de errores
- [ ] Verificar que los assets están actualizados
- [ ] Revisar costos de Storage y CDN

### Revisión Mensual

- [ ] Optimizar cache headers si es necesario
- [ ] Revisar y limpiar versiones antiguas en Storage
- [ ] Revisar configuración de Load Balancer
- [ ] Actualizar documentación si hay cambios

## Comandos Útiles

```bash
# Ver IP del Load Balancer
gcloud compute forwarding-rules describe unigrc-frontend-https-rule \
  --global \
  --format="value(IPAddress)" \
  --project=unigrc-m

# Ver estado del certificado SSL
gcloud compute ssl-certificates describe cl-unigrc-app-ssl-cert \
  --global \
  --format="value(managed.status)" \
  --project=unigrc-m

# Ver configuración del URL map
gcloud compute url-maps describe unigrc-frontend-url-map \
  --global \
  --project=unigrc-m

# Listar archivos en bucket
gsutil ls -r gs://unigrc-frontend-prod

# Ver headers de un archivo
gsutil stat gs://unigrc-frontend-prod/index.html

# Invalidar cache
./scripts/invalidate-cdn.sh /index.html
```

## Recursos Adicionales

- **Documentación de Cloud Storage**: https://cloud.google.com/storage/docs
- **Documentación de Cloud CDN**: https://cloud.google.com/cdn/docs
- **Documentación de Load Balancing**: https://cloud.google.com/load-balancing/docs
- **Guía de migración DNS**: `docs/DNS-MIGRATION-GUIDE.md`
- **Plan de rollback**: `docs/ROLLBACK-PLAN.md`

