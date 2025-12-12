#!/bin/bash

# Script para otorgar permisos de Secret Manager a la service account de Cloud Run
# Este script resuelve el error: "Permission denied on secret" al desplegar Cloud Run

set -e

PROJECT_ID="unigrc-m"
SERVICE_ACCOUNT="unigrc-backend@${PROJECT_ID}.iam.gserviceaccount.com"
ROLE="roles/secretmanager.secretAccessor"

echo "🔐 Otorgando permisos de Secret Manager a la service account de Cloud Run..."
echo "   Proyecto: ${PROJECT_ID}"
echo "   Service Account: ${SERVICE_ACCOUNT}"
echo "   Rol: ${ROLE}"
echo ""

# Verificar que la service account existe
echo "📋 Verificando que la service account existe..."
if ! gcloud iam service-accounts describe "${SERVICE_ACCOUNT}" --project="${PROJECT_ID}" &>/dev/null; then
    echo "❌ Error: La service account ${SERVICE_ACCOUNT} no existe."
    echo "   Creando la service account..."
    gcloud iam service-accounts create unigrc-backend \
        --display-name="Cloud Run Backend Service Account" \
        --project="${PROJECT_ID}"
    echo "✅ Service account creada"
fi

# Otorgar el rol a nivel de proyecto (recomendado para acceso a todos los secretos)
echo ""
echo "🔑 Otorgando rol ${ROLE} a nivel de proyecto..."
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="${ROLE}" \
    --condition=None

echo ""
echo "✅ Permisos otorgados exitosamente!"
echo ""
echo "📝 Verificando permisos..."
gcloud projects get-iam-policy "${PROJECT_ID}" \
    --flatten="bindings[].members" \
    --filter="bindings.members:serviceAccount:${SERVICE_ACCOUNT} AND bindings.role:${ROLE}" \
    --format="table(bindings.role,bindings.members)"

echo ""
echo "🎉 La service account ${SERVICE_ACCOUNT} ahora tiene acceso a Secret Manager."
echo "   Puedes volver a desplegar Cloud Run sin errores de permisos."
echo ""
echo "💡 Para desplegar manualmente, ejecuta:"
echo "   gcloud run deploy unigrc-backend --region=southamerica-west1 --project=${PROJECT_ID}"

