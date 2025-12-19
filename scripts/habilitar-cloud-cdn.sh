#!/bin/bash
# Script para habilitar Cloud CDN en todos los backends del Load Balancer
# Usage: ./scripts/habilitar-cloud-cdn.sh

set -e

PROJECT_ID=${GCP_PROJECT_ID:-unigrc-m}
BACKEND_SERVICE_API="unigrc-backend-service"
BACKEND_SERVICE_SPA="unigrc-spa-service"
BUCKET_NAME="unigrc-frontend-prod"
BACKEND_BUCKET_NAME="unigrc-frontend-prod-backend"

echo "🚀 Habilitando Cloud CDN en todos los backends"
echo "   Proyecto: $PROJECT_ID"
echo ""

# Verificar que gcloud está instalado
if ! command -v gcloud &> /dev/null; then
  echo "❌ Error: gcloud CLI no está instalado"
  exit 1
fi

# Configurar proyecto
gcloud config set project $PROJECT_ID

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  CREANDO/HABILITANDO BACKEND BUCKET CON CDN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar si el bucket de GCS existe
if ! gsutil ls -b gs://$BUCKET_NAME &>/dev/null; then
  echo "❌ Error: El bucket de Cloud Storage no existe: gs://$BUCKET_NAME"
  echo "   Crea el bucket primero o ajusta BUCKET_NAME en el script"
  exit 1
fi

# Crear o actualizar Backend Bucket con CDN habilitado
if gcloud compute backend-buckets describe $BACKEND_BUCKET_NAME --project=$PROJECT_ID &>/dev/null; then
  echo "✅ Backend Bucket existe: $BACKEND_BUCKET_NAME"
  echo "   🔄 Actualizando para habilitar CDN..."
  gcloud compute backend-buckets update $BACKEND_BUCKET_NAME \
    --enable-cdn \
    --project=$PROJECT_ID
  echo "   ✅ CDN habilitado en Backend Bucket"
else
  echo "📦 Creando Backend Bucket con CDN habilitado..."
  gcloud compute backend-buckets create $BACKEND_BUCKET_NAME \
    --gcs-bucket-name=$BUCKET_NAME \
    --enable-cdn \
    --project=$PROJECT_ID
  echo "   ✅ Backend Bucket creado con CDN habilitado"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  HABILITANDO CDN EN BACKEND SERVICE (API)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if gcloud compute backend-services describe $BACKEND_SERVICE_API --global --project=$PROJECT_ID &>/dev/null; then
  echo "✅ Backend Service existe: $BACKEND_SERVICE_API"
  echo "   🔄 Habilitando CDN..."
  gcloud compute backend-services update $BACKEND_SERVICE_API \
    --enable-cdn \
    --global \
    --project=$PROJECT_ID
  echo "   ✅ CDN habilitado en Backend Service (API)"
else
  echo "⚠️  Backend Service no existe: $BACKEND_SERVICE_API"
  echo "   Esto es normal si solo usas Cloud Function para el frontend"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  HABILITANDO CDN EN BACKEND SERVICE (SPA - Cloud Function)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if gcloud compute backend-services describe $BACKEND_SERVICE_SPA --global --project=$PROJECT_ID &>/dev/null; then
  echo "✅ Backend Service existe: $BACKEND_SERVICE_SPA"
  echo "   🔄 Habilitando CDN..."
  gcloud compute backend-services update $BACKEND_SERVICE_SPA \
    --enable-cdn \
    --global \
    --project=$PROJECT_ID
  echo "   ✅ CDN habilitado en Backend Service (SPA)"
else
  echo "⚠️  Backend Service no existe: $BACKEND_SERVICE_SPA"
  echo "   Esto es normal si no has configurado la Cloud Function para SPA routing"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  CONFIGURANDO POLÍTICA DE CACHÉ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Configurar política de caché para Backend Service (API)
if gcloud compute backend-services describe $BACKEND_SERVICE_API --global --project=$PROJECT_ID &>/dev/null; then
  echo "📊 Configurando política de caché para API..."
  gcloud compute backend-services update $BACKEND_SERVICE_API \
    --global \
    --cdn-policy-cache-mode=CACHE_ALL_STATIC \
    --cdn-policy-default-ttl=300 \
    --cdn-policy-max-ttl=3600 \
    --cdn-policy-client-ttl=300 \
    --project=$PROJECT_ID 2>/dev/null || echo "   ⚠️  No se pudo actualizar política de caché (puede requerir configuración manual)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ RESUMEN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Cloud CDN ha sido habilitado en:"
echo ""

# Verificar estado final
echo "Verificando estado final..."
BUCKET_CDN=$(gcloud compute backend-buckets describe $BACKEND_BUCKET_NAME --project=$PROJECT_ID --format="value(enableCdn)" 2>/dev/null || echo "False")
API_CDN=$(gcloud compute backend-services describe $BACKEND_SERVICE_API --global --project=$PROJECT_ID --format="value(cdnPolicy.enableCdn)" 2>/dev/null || echo "False")
SPA_CDN=$(gcloud compute backend-services describe $BACKEND_SERVICE_SPA --global --project=$PROJECT_ID --format="value(cdnPolicy.enableCdn)" 2>/dev/null || echo "False")

if [ "$BUCKET_CDN" = "True" ]; then
  echo "✅ Backend Bucket: CDN HABILITADO"
else
  echo "❌ Backend Bucket: CDN DESHABILITADO (valor: $BUCKET_CDN)"
fi

if [ "$API_CDN" = "True" ]; then
  echo "✅ Backend Service (API): CDN HABILITADO"
else
  echo "❌ Backend Service (API): CDN DESHABILITADO (valor: $API_CDN)"
fi

if [ "$SPA_CDN" = "True" ]; then
  echo "✅ Backend Service (SPA): CDN HABILITADO"
elif gcloud compute backend-services describe $BACKEND_SERVICE_SPA --global --project=$PROJECT_ID &>/dev/null; then
  echo "❌ Backend Service (SPA): CDN DESHABILITADO (valor: $SPA_CDN)"
else
  echo "⚠️  Backend Service (SPA): No existe"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 NOTAS IMPORTANTES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Los cambios pueden tardar 5-10 minutos en propagarse"
echo "2. Para verificar el estado, ejecuta: ./scripts/verificar-cdn-status.sh"
echo "3. Para invalidar caché después de un deploy:"
echo "   ./scripts/invalidate-cdn.sh /index.html /assets/*"
echo ""
echo "4. Ver estadísticas de CDN en:"
echo "   https://console.cloud.google.com/net-services/cdn/overview?project=$PROJECT_ID"
echo ""
