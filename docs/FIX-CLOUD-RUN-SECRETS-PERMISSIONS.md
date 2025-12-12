# Solución: Permisos de Secret Manager para Cloud Run

## Problema

Al desplegar Cloud Run, aparece el error:
```
Permission denied on secret: projects/.../secrets/DATABASE_URL/versions/latest 
for Revision service account unigrc-backend@unigrc-m.iam.gserviceaccount.com. 
The service account used must be granted the 'Secret Manager Secret Accessor' 
role (roles/secretmanager.secretAccessor) at the secret, project or higher level.
```

## Causa

La service account de Cloud Run (`unigrc-backend@unigrc-m.iam.gserviceaccount.com`) no tiene permisos para acceder a los secretos en Secret Manager.

## Solución Rápida (Comando Directo)

Ejecuta este comando para otorgar los permisos necesarios:

```bash
gcloud projects add-iam-policy-binding unigrc-m \
    --member="serviceAccount:unigrc-backend@unigrc-m.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

## Solución con Script

Ejecuta el script automatizado:

```bash
./scripts/fix-cloud-run-secrets-permissions.sh
```

Este script:
1. Verifica que la service account existe (la crea si no existe)
2. Otorga el rol `roles/secretmanager.secretAccessor` a nivel de proyecto
3. Verifica que los permisos se otorgaron correctamente

## Verificar Permisos

Para verificar que los permisos están correctos:

```bash
gcloud projects get-iam-policy unigrc-m \
    --flatten="bindings[].members" \
    --filter="bindings.members:serviceAccount:unigrc-backend@unigrc-m.iam.gserviceaccount.com" \
    --format="table(bindings.role,bindings.members)"
```

## Después de Otorgar Permisos

Una vez otorgados los permisos, puedes volver a desplegar Cloud Run:

```bash
# Si usas Cloud Build (automático en push a main)
git push origin main

# O manualmente
gcloud run deploy unigrc-backend \
    --region=southamerica-west1 \
    --project=unigrc-m \
    --image=southamerica-west1-docker.pkg.dev/unigrc-m/unigrc/backend:latest
```

## Secretos que Requieren Acceso

Los siguientes secretos necesitan acceso:
- `DATABASE_URL`
- `SESSION_SECRET`
- `CSRF_SECRET`
- `GCS_CLIENT_EMAIL`
- `GCS_PRIVATE_KEY`
- `OPENAI_API_KEY`
- `UPSTASH_REDIS_REST_TOKEN`
- `UPSTASH_REDIS_REST_URL`

## Notas

- El rol se otorga a **nivel de proyecto**, lo que permite acceso a todos los secretos del proyecto
- Si prefieres otorgar permisos por secreto individual, usa:
  ```bash
  gcloud secrets add-iam-policy-binding SECRET_NAME \
      --member="serviceAccount:unigrc-backend@unigrc-m.iam.gserviceaccount.com" \
      --role="roles/secretmanager.secretAccessor"
  ```
- La service account se crea automáticamente cuando despliegas Cloud Run por primera vez, pero los permisos de Secret Manager deben otorgarse manualmente


