#!/bin/bash
# Script para crear Cloud Function que sirve el SPA desde Cloud Storage
# Esta función maneja el routing del SPA para rutas que no son /api/**

set -e

PROJECT_ID=${GCP_PROJECT_ID:-unigrc-m}
REGION=${GCP_REGION:-southamerica-west1}
FUNCTION_NAME="serve-spa"
BUCKET_NAME="unigrc-frontend-prod"

echo "🚀 Configurando Cloud Function para servir SPA"
echo "   Proyecto: $PROJECT_ID"
echo "   Región: $REGION"
echo "   Función: $FUNCTION_NAME"
echo ""

# Verificar que gcloud está instalado
if ! command -v gcloud &> /dev/null; then
  echo "❌ Error: gcloud CLI no está instalado"
  exit 1
fi

# Configurar proyecto
gcloud config set project $PROJECT_ID

# Verificar que el bucket existe
if ! gsutil ls -b gs://$BUCKET_NAME &>/dev/null; then
  echo "❌ Error: El bucket $BUCKET_NAME no existe"
  echo "   Ejecuta primero: npm run setup:gcs"
  exit 1
fi

# Desplegar Cloud Function
echo "📦 Desplegando Cloud Function..."
gcloud functions deploy $FUNCTION_NAME \
  --gen2 \
  --runtime=nodejs20 \
  --region=$REGION \
  --source=gcp/cloud-function-spa \
  --entry-point=serveSPA \
  --trigger-http \
  --allow-unauthenticated \
  --memory=256MB \
  --timeout=60s \
  --max-instances=10 \
  --project=$PROJECT_ID

echo ""
echo "✅ Cloud Function desplegada"
echo ""
echo "📋 Próximo paso:"
echo "   Actualizar el URL map del Load Balancer para usar esta función"
echo "   para todas las rutas que no sean /api/**"
echo ""
echo "   gcloud compute url-maps edit unigrc-frontend-url-map --global --project=$PROJECT_ID"

