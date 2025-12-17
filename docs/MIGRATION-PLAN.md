# Plan de Migración: Firebase Hosting → Cloud Storage + CDN

Este documento describe el plan detallado para migrar el frontend de Firebase Hosting a Cloud Storage + Cloud CDN.

## Checklist de Preparación

### Infraestructura

- [ ] Bucket de Cloud Storage creado (`unigrc-frontend-prod`)
- [ ] Bucket configurado como sitio web estático
- [ ] CORS configurado en el bucket
- [ ] Load Balancer configurado
- [ ] Backend bucket configurado en Load Balancer
- [ ] Backend service configurado para `/api/**`
- [ ] URL map configurado con path matchers
- [ ] Certificado SSL creado y activo
- [ ] Cloud CDN habilitado en Load Balancer

### Testing

- [ ] Deploy a staging completado
- [ ] Testing en staging exitoso
- [ ] Verificación de rutas SPA
- [ ] Verificación de proxy `/api/**`
- [ ] Verificación de CORS
- [ ] Verificación de headers de seguridad
- [ ] Verificación de cache headers

### Documentación

- [ ] Plan de rollback documentado
- [ ] Procedimientos de operación documentados
- [ ] Equipo informado sobre la migración

## Fase 1: Deploy Inicial (Sin Cambiar DNS)

**Duración estimada**: 1-2 horas

1. **Deploy a Cloud Storage**
   ```bash
   npm run deploy:gcs:prod
   ```

2. **Verificar archivos en bucket**
   ```bash
   gsutil ls -r gs://unigrc-frontend-prod
   ```

3. **Obtener IP del Load Balancer**
   ```bash
   gcloud compute forwarding-rules describe unigrc-frontend-https-rule \
     --global \
     --format="value(IPAddress)" \
     --project=unigrc-m
   ```

4. **Probar acceso directo por IP**
   ```bash
   curl -H "Host: cl.unigrc.app" http://[LB_IP]
   ```

5. **Verificar certificado SSL**
   ```bash
   gcloud compute ssl-certificates describe cl-unigrc-app-ssl-cert \
     --global \
     --format="value(managed.status)" \
     --project=unigrc-m
   ```
   Debe mostrar `ACTIVE`

## Fase 2: Cambio de DNS

**Duración estimada**: 15-30 minutos (más tiempo de propagación)

1. **Configurar DNS en GoDaddy**
   - Cambiar registro CNAME/A record de Firebase a Load Balancer IP
   - Usar TTL bajo (300s) para rollback rápido

2. **Verificar propagación DNS**
   ```bash
   dig cl.unigrc.app +short
   ```

3. **Esperar propagación completa** (5-15 minutos con TTL bajo)

## Fase 3: Verificación Post-Migración

**Duración estimada**: 1-2 horas

1. **Acceder al sitio**
   - `https://cl.unigrc.app`
   - Verificar que carga correctamente
   - Verificar certificado SSL

2. **Probar funcionalidades clave**
   - [ ] Login funciona
   - [ ] Navegación entre páginas funciona
   - [ ] API calls funcionan (`/api/**`)
   - [ ] Carga de assets estáticos funciona
   - [ ] No hay errores de CORS
   - [ ] Headers de seguridad presentes

3. **Verificar performance**
   - Tiempos de carga aceptables
   - CDN funcionando (verificar headers `X-Cache`)
   - Cache hit rate positivo

## Fase 4: Monitoreo

**Duración**: 24-48 horas

Monitorear continuamente:

1. **Métricas de Cloud Load Balancer**
   - Requests por segundo
   - Latencia
   - Errores 4xx/5xx

2. **Métricas de Cloud CDN**
   - Hit rate
   - Bytes transferidos
   - Cache efficiency

3. **Logs de aplicación**
   - Errores en frontend
   - Errores en backend
   - Errores de CORS

4. **Feedback de usuarios**
   - Reportes de problemas
   - Quejas de performance

## Fase 5: Estabilización

**Duración**: 1 semana

1. **Mantener Firebase Hosting activo**
   - No eliminar configuración
   - Mantener como backup

2. **Continuar monitoreo**
   - Revisar métricas diariamente
   - Responder a cualquier problema rápidamente

3. **Optimizaciones**
   - Ajustar cache headers si es necesario
   - Optimizar CDN settings
   - Ajustar Load Balancer config si es necesario

## Fase 6: Limpieza (Después de 1 Semana)

**Duración**: 1-2 horas

Solo después de confirmar que todo funciona correctamente:

1. **Eliminar Cloud Run frontend**
   ```bash
   gcloud run services delete unigrc-frontend \
     --region=southamerica-west1 \
     --project=unigrc-m
   ```

2. **Archivar Dockerfile.frontend**
   - Mover a `archive/` o eliminar

3. **Actualizar documentación**
   - Actualizar README
   - Actualizar guías de deploy

4. **Opcional: Eliminar Firebase Hosting**
   - Solo si estás seguro de que no lo necesitas
   - Considera mantenerlo como backup

## Rollback Plan

Si algo sale mal durante la migración:

1. **Revertir DNS inmediatamente**
   - Cambiar registro DNS de vuelta a Firebase Hosting
   - TTL bajo permite cambio rápido

2. **Verificar que Firebase Hosting funciona**
   - Acceder a `https://cl.unigrc.app`
   - Verificar que carga desde Firebase

3. **Investigar problema**
   - Revisar logs del Load Balancer
   - Revisar configuración
   - Corregir problemas

4. **Reintentar migración**
   - Solo después de corregir problemas
   - Seguir el plan nuevamente

## Timeline Resumido

| Fase | Duración | Estado |
|------|----------|--------|
| Preparación | 2-3 días | ⏳ |
| Deploy inicial | 1-2 horas | ⏳ |
| Cambio DNS | 15-30 min | ⏳ |
| Verificación | 1-2 horas | ⏳ |
| Monitoreo | 24-48 horas | ⏳ |
| Estabilización | 1 semana | ⏳ |
| Limpieza | 1-2 horas | ⏳ |

**Total**: ~2 semanas para migración completa y segura

## Contactos y Recursos

- **Documentación DNS**: `docs/DNS-MIGRATION-GUIDE.md`
- **Plan de Rollback**: `docs/ROLLBACK-PLAN.md`
- **Operaciones**: `docs/GCS-CDN-OPERATIONS.md`
- **Scripts**: `scripts/deploy-frontend-gcs.sh`, `scripts/invalidate-cdn.sh`

