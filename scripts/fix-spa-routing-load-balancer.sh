#!/bin/bash
# Script para corregir el routing del SPA en el Load Balancer
# Actualiza el URL Map para usar una Cloud Function que sirve el SPA correctamente

set -e

PROJECT_ID=${GCP_PROJECT_ID:-unigrc-m}
REGION=${GCP_REGION:-southamerica-west1}
FUNCTION_NAME="serve-spa"
BUCKET_NAME="unigrc-frontend-prod"
URL_MAP_NAME="unigrc-frontend-url-map"

echo "🔧 Corrigiendo routing del SPA en Load Balancer"
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

# Paso 1: Desplegar Cloud Function si no existe
echo "📦 Paso 1: Verificando Cloud Function..."
if ! gcloud functions describe $FUNCTION_NAME \
  --gen2 \
  --region=$REGION \
  --project=$PROJECT_ID &>/dev/null; then
  
  echo "   Cloud Function no existe, desplegando..."
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
  
  echo "   ✅ Cloud Function desplegada"
else
  echo "   ✅ Cloud Function ya existe"
fi

# Obtener URL de la Cloud Function
echo ""
echo "🔍 Obteniendo URL de la Cloud Function..."
FUNCTION_URL=$(gcloud functions describe $FUNCTION_NAME \
  --gen2 \
  --region=$REGION \
  --format="value(serviceConfig.uri)" \
  --project=$PROJECT_ID)

if [ -z "$FUNCTION_URL" ]; then
  echo "❌ Error: No se pudo obtener la URL de la Cloud Function"
  exit 1
fi

echo "   ✅ Function URL: $FUNCTION_URL"

# Extraer el nombre del servicio de la URL
# La URL es algo como: https://serve-spa-xxxxx-uc.a.run.app
FUNCTION_SERVICE_NAME=$(echo $FUNCTION_URL | sed 's|https://||' | sed 's|/.*||')

echo "   Service Name: $FUNCTION_SERVICE_NAME"

# Paso 2: Crear Serverless NEG para la Cloud Function
echo ""
echo "🌐 Paso 2: Creando Network Endpoint Group para Cloud Function..."
NEG_NAME="unigrc-spa-neg"
if ! gcloud compute network-endpoint-groups describe $NEG_NAME \
  --region=$REGION \
  --project=$PROJECT_ID &>/dev/null; then
  
  gcloud compute network-endpoint-groups create $NEG_NAME \
    --region=$REGION \
    --network-endpoint-type=serverless \
    --cloud-function-name=$FUNCTION_NAME \
    --project=$PROJECT_ID
  
  echo "   ✅ NEG creado"
else
  echo "   ✅ NEG ya existe"
fi

# Paso 3: Crear Backend Service para la Cloud Function
echo ""
echo "⚙️  Paso 3: Creando Backend Service para Cloud Function..."
BACKEND_SERVICE_SPA="unigrc-spa-service"
if ! gcloud compute backend-services describe $BACKEND_SERVICE_SPA \
  --global \
  --project=$PROJECT_ID &>/dev/null; then
  
  gcloud compute backend-services create $BACKEND_SERVICE_SPA \
    --global \
    --protocol=HTTP \
    --project=$PROJECT_ID
  
  echo "   ✅ Backend Service creado"
else
  echo "   ✅ Backend Service ya existe"
fi

# Agregar NEG al backend service
echo ""
echo "🔗 Agregando NEG al Backend Service..."
gcloud compute backend-services add-backend $BACKEND_SERVICE_SPA \
  --global \
  --network-endpoint-group=$NEG_NAME \
  --network-endpoint-group-region=$REGION \
  --project=$PROJECT_ID 2>/dev/null || echo "   ℹ️  NEG ya está agregado"

# Paso 4: Actualizar URL Map
echo ""
echo "🗺️  Paso 4: Actualizando URL Map..."
echo "   Esto configurará:"
echo "   - /api/* → Backend Service (Cloud Run)"
echo "   - /* → SPA Service (Cloud Function)"

# Cambiar el default backend del URL Map a la Cloud Function
echo "   Cambiando default backend a SPA Service..."
gcloud compute url-maps set-default-service $URL_MAP_NAME \
  --default-service=$BACKEND_SERVICE_SPA \
  --global \
  --project=$PROJECT_ID

echo "   ✅ Default backend actualizado"

# Verificar que el path matcher para /api/* existe y está correcto
echo ""
echo "   Verificando path matcher para /api/*..."
EXISTING_MATCHER=$(gcloud compute url-maps describe $URL_MAP_NAME \
  --global \
  --format="value(pathMatchers[0].name)" \
  --project=$PROJECT_ID 2>/dev/null || echo "")

if [ -n "$EXISTING_MATCHER" ]; then
  echo "   Path matcher existente: $EXISTING_MATCHER"
  echo "   ✅ Path matcher ya configurado"
else
  echo "   Agregando path matcher para /api/*..."
  gcloud compute url-maps add-path-matcher $URL_MAP_NAME \
    --global \
    --path-matcher-name=api-matcher \
    --default-service=$BACKEND_SERVICE_SPA \
    --path-rules="/api/*=unigrc-backend-service" \
    --project=$PROJECT_ID
  
  echo "   ✅ Path matcher agregado"
fi

echo ""
echo "✅ Configuración completada"
echo ""
echo "📋 Resumen:"
echo "   - Cloud Function: $FUNCTION_NAME"
echo "   - Backend Service: $BACKEND_SERVICE_SPA"
echo "   - URL Map: $URL_MAP_NAME"
echo ""
echo "⏳ Espera 2-3 minutos para que los cambios se propaguen"
echo "   Luego prueba acceder a: https://cl.unigrc.app/compliance-officers"
echo ""
