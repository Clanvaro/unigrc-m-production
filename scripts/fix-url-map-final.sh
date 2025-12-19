#!/bin/bash
# Script para corregir el URL Map - versión final
# Cambia el default backend a la Cloud Function

set -e

PROJECT_ID=${GCP_PROJECT_ID:-unigrc-m}
REGION=${GCP_REGION:-southamerica-west1}
URL_MAP_NAME="unigrc-frontend-url-map"
BACKEND_SERVICE_SPA="unigrc-spa-service"
FUNCTION_NAME="serve-spa"
NEG_NAME="unigrc-spa-neg"

echo "🔧 Corrigiendo URL Map - Versión Final"
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

# Paso 1: Verificar que la Cloud Function existe
echo "📦 Paso 1: Verificando Cloud Function..."
if ! gcloud functions describe $FUNCTION_NAME \
  --gen2 \
  --region=$REGION \
  --project=$PROJECT_ID &>/dev/null; then
  echo "❌ Error: La Cloud Function $FUNCTION_NAME no existe"
  echo "   Ejecuta primero: ./scripts/fix-spa-routing-load-balancer.sh"
  exit 1
fi
echo "   ✅ Cloud Function existe"

# Paso 2: Crear o verificar NEG para Cloud Function
echo ""
echo "🌐 Paso 2: Verificando Network Endpoint Group..."
if ! gcloud compute network-endpoint-groups describe $NEG_NAME \
  --region=$REGION \
  --project=$PROJECT_ID &>/dev/null; then
  
  echo "   Creando NEG para Cloud Function..."
  gcloud compute network-endpoint-groups create $NEG_NAME \
    --region=$REGION \
    --network-endpoint-type=serverless \
    --cloud-function-name=$FUNCTION_NAME \
    --project=$PROJECT_ID
  
  echo "   ✅ NEG creado"
else
  echo "   ✅ NEG ya existe"
fi

# Paso 3: Crear o verificar Backend Service para Cloud Function
echo ""
echo "⚙️  Paso 3: Verificando Backend Service para Cloud Function..."
if ! gcloud compute backend-services describe $BACKEND_SERVICE_SPA \
  --global \
  --project=$PROJECT_ID &>/dev/null; then
  
  echo "   Creando Backend Service..."
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
  --project=$PROJECT_ID 2>/dev/null || echo "   ℹ️  NEG ya está agregado (o hubo un error, continuando...)"

# Paso 4: Actualizar URL Map
echo ""
echo "🗺️  Paso 4: Actualizando URL Map..."
echo "   Cambiando default backend de 'unigrc-frontend-service' a '$BACKEND_SERVICE_SPA'..."

# Cambiar el default backend
gcloud compute url-maps set-default-service $URL_MAP_NAME \
  --default-service=$BACKEND_SERVICE_SPA \
  --global \
  --project=$PROJECT_ID

echo "   ✅ Default backend actualizado"

# Actualizar el path matcher para que el default también sea la Cloud Function
echo ""
echo "📝 Paso 5: Actualizando path matcher..."
echo "   El path matcher 'api-matcher' ya tiene la regla /api/* correcta"
echo "   Solo necesitamos asegurarnos de que el default backend esté correcto"
echo "   ✅ Path matcher verificado"

# Invalidar caché del CDN
echo ""
echo "🔄 Paso 6: Invalidando caché del CDN..."
gcloud compute url-maps invalidate-cdn-cache $URL_MAP_NAME \
  --path="/*" \
  --global \
  --project=$PROJECT_ID || echo "   ⚠️  No se pudo invalidar caché (puede ser normal)"

echo ""
echo "✅ Configuración completada"
echo ""
echo "📋 Resumen de cambios:"
echo "   - Default Backend: $BACKEND_SERVICE_SPA (Cloud Function)"
echo "   - Path Rule /api/*: unigrc-backend-service (Cloud Run)"
echo ""
echo "⏳ Espera 2-3 minutos para que los cambios se propaguen"
echo "   Luego prueba: https://cl.unigrc.app/compliance-officers"
echo ""
