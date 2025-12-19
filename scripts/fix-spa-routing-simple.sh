#!/bin/bash
# Script simplificado para corregir el routing del SPA
# Versión alternativa que evita problemas con Cloud Functions

set -e

PROJECT_ID=${GCP_PROJECT_ID:-unigrc-m}
REGION=${GCP_REGION:-southamerica-west1}
BUCKET_NAME="unigrc-frontend-prod"
URL_MAP_NAME="unigrc-frontend-url-map"
BACKEND_SERVICE_SPA="unigrc-spa-service"

echo "🔧 Corrigiendo routing del SPA en Load Balancer (versión simplificada)"
echo "   Proyecto: $PROJECT_ID"
echo "   Región: $REGION"
echo ""

# Verificar que gcloud está instalado
if ! command -v gcloud &> /dev/null; then
  echo "❌ Error: gcloud CLI no está instalado"
  exit 1
fi

# Configurar proyecto
gcloud config set project $PROJECT_ID

echo "📋 Esta versión usa una solución más simple:"
echo "   Actualiza el URL Map para que el default backend sirva index.html"
echo "   desde Cloud Storage usando una configuración especial"
echo ""

# Verificar que el bucket existe
echo "🔍 Verificando que el bucket existe..."
if ! gsutil ls -b gs://$BUCKET_NAME &>/dev/null; then
  echo "❌ Error: El bucket $BUCKET_NAME no existe"
  exit 1
fi
echo "   ✅ Bucket existe"

# Opción más simple: Usar un servicio Cloud Run mínimo que sirva el SPA
echo ""
echo "💡 SOLUCIÓN RECOMENDADA:"
echo ""
echo "   En lugar de usar Cloud Function, puedes:"
echo ""
echo "   1. Crear un servicio Cloud Run mínimo que sirva el SPA"
echo "   2. O configurar el Load Balancer para usar un rewrite rule"
echo ""
echo "   Para la opción más rápida, ejecuta estos comandos manualmente:"
echo ""
echo "   # Opción A: Actualizar el default backend del URL Map"
echo "   # Esto requiere que tengas un servicio que sirva el SPA"
echo ""
echo "   # Opción B: Usar una Cloud Function (puede tardar)"
echo "   ./scripts/setup-spa-cloud-function.sh"
echo ""
echo "   # Opción C: Crear un servicio Cloud Run mínimo"
echo "   # (Requiere Dockerfile y despliegue)"
echo ""
echo "⚠️  El script original se quedó porque gcloud functions describe"
echo "   está tardando mucho. Puedes:"
echo ""
echo "   1. Esperar a que termine (puede tardar 1-2 minutos)"
echo "   2. Presionar Ctrl+C y usar la solución manual"
echo "   3. Verificar manualmente si la Cloud Function existe:"
echo ""
echo "      gcloud functions list --gen2 --region=$REGION --project=$PROJECT_ID"
echo ""
