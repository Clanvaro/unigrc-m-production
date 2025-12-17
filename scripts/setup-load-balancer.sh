#!/bin/bash
# Script para configurar Load Balancer HTTP(S) con backend bucket y backend service
# Usage: ./scripts/setup-load-balancer.sh [staging|prod]

set -e

ENVIRONMENT=${1:-prod}
PROJECT_ID=${GCP_PROJECT_ID:-unigrc-m}
REGION=${GCP_REGION:-southamerica-west1}
BACKEND_SERVICE_NAME="unigrc-backend-service"

if [ "$ENVIRONMENT" = "staging" ]; then
  BUCKET_NAME="unigrc-frontend-staging"
  LB_NAME="unigrc-frontend-lb-staging"
else
  BUCKET_NAME="unigrc-frontend-prod"
  LB_NAME="unigrc-frontend-lb"
fi

echo "🚀 Configurando Load Balancer: $LB_NAME"
echo "   Proyecto: $PROJECT_ID"
echo "   Región: $REGION"
echo "   Bucket: $BUCKET_NAME"
echo ""

# Verificar que gcloud está instalado
if ! command -v gcloud &> /dev/null; then
  echo "❌ Error: gcloud CLI no está instalado"
  exit 1
fi

# Configurar proyecto
gcloud config set project $PROJECT_ID

# Crear backend bucket para archivos estáticos
echo "📦 Creando backend bucket..."
gcloud compute backend-buckets create $BUCKET_NAME-backend \
  --gcs-bucket-name=$BUCKET_NAME \
  --project=$PROJECT_ID || echo "   ℹ️  Backend bucket ya existe"

# Obtener URL del servicio Cloud Run backend
echo "🔍 Obteniendo URL del backend Cloud Run..."
BACKEND_URL=$(gcloud run services describe unigrc-backend \
  --region=$REGION \
  --format="value(status.url)" \
  --project=$PROJECT_ID 2>/dev/null || echo "")

if [ -z "$BACKEND_URL" ]; then
  echo "❌ Error: No se pudo obtener la URL del backend Cloud Run"
  echo "   Asegúrate de que el servicio 'unigrc-backend' existe en la región $REGION"
  exit 1
fi

echo "   ✅ Backend URL: $BACKEND_URL"

# Crear NEG (Network Endpoint Group) para Cloud Run
echo "🌐 Creando Network Endpoint Group para Cloud Run..."
NEG_NAME="unigrc-backend-neg"
gcloud compute network-endpoint-groups create $NEG_NAME \
  --region=$REGION \
  --network-endpoint-type=serverless \
  --cloud-run-service=unigrc-backend \
  --cloud-run-url=$BACKEND_URL \
  --project=$PROJECT_ID 2>/dev/null || echo "   ℹ️  NEG ya existe"

# Crear backend service apuntando a Cloud Run
echo "⚙️  Creando backend service..."
gcloud compute backend-services create $BACKEND_SERVICE_NAME \
  --global \
  --protocol=HTTP \
  --project=$PROJECT_ID 2>/dev/null || echo "   ℹ️  Backend service ya existe"

# Agregar NEG al backend service
echo "🔗 Agregando NEG al backend service..."
gcloud compute backend-services add-backend $BACKEND_SERVICE_NAME \
  --global \
  --network-endpoint-group=$NEG_NAME \
  --network-endpoint-group-region=$REGION \
  --project=$PROJECT_ID 2>/dev/null || echo "   ℹ️  NEG ya está agregado"

# Crear URL map
echo "🗺️  Creando URL map..."
URL_MAP_NAME="unigrc-frontend-url-map"
gcloud compute url-maps create $URL_MAP_NAME \
  --default-backend-bucket=$BUCKET_NAME-backend \
  --project=$PROJECT_ID 2>/dev/null || echo "   ℹ️  URL map ya existe"

# Agregar path matcher para /api/**
echo "📝 Configurando path matcher para /api/**..."
gcloud compute url-maps add-path-matcher $URL_MAP_NAME \
  --path-matcher-name=api-matcher \
  --default-backend-service=$BACKEND_SERVICE_NAME \
  --path-rules="/api/*=$BACKEND_SERVICE_NAME" \
  --project=$PROJECT_ID 2>/dev/null || echo "   ℹ️  Path matcher ya configurado"

# Crear target HTTPS proxy (requiere certificado SSL primero)
echo "🔒 Creando target HTTPS proxy..."
echo "   ⚠️  Nota: Necesitas crear el certificado SSL primero con:"
echo "      ./scripts/setup-ssl-certificate.sh $ENVIRONMENT"
echo ""
echo "   Después ejecuta:"
echo "   gcloud compute target-https-proxies create unigrc-frontend-https-proxy \\"
echo "     --url-map=$URL_MAP_NAME \\"
echo "     --ssl-certificates=cl-unigrc-app-ssl-cert \\"
echo "     --project=$PROJECT_ID"
echo ""
echo "   Y luego crea el forwarding rule:"
echo "   gcloud compute forwarding-rules create unigrc-frontend-https-rule \\"
echo "     --global \\"
echo "     --target-https-proxy=unigrc-frontend-https-proxy \\"
echo "     --ports=443 \\"
echo "     --project=$PROJECT_ID"

# Crear target HTTP proxy para redirección a HTTPS
echo "🔄 Creando target HTTP proxy para redirección..."
gcloud compute target-http-proxies create unigrc-frontend-http-proxy \
  --url-map=$URL_MAP_NAME \
  --project=$PROJECT_ID 2>/dev/null || echo "   ℹ️  HTTP proxy ya existe"

# Crear forwarding rule HTTP (redirección a HTTPS)
echo "📡 Creando forwarding rule HTTP..."
gcloud compute forwarding-rules create unigrc-frontend-http-rule \
  --global \
  --target-http-proxy=unigrc-frontend-http-proxy \
  --ports=80 \
  --project=$PROJECT_ID 2>/dev/null || echo "   ℹ️  HTTP forwarding rule ya existe"

echo ""
echo "✅ Load Balancer configurado parcialmente"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Crear certificado SSL: ./scripts/setup-ssl-certificate.sh $ENVIRONMENT"
echo "   2. Completar configuración HTTPS (ver comandos arriba)"
echo "   3. Obtener IP del Load Balancer para configurar DNS"
echo "   4. Configurar Cloud CDN: gcloud compute backend-services update $BACKEND_SERVICE_NAME --enable-cdn --global"

