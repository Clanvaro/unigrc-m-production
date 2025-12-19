#!/bin/bash
# Script manual para corregir el URL Map directamente
# Usa este si el script automático no funcionó

set -e

PROJECT_ID=${GCP_PROJECT_ID:-unigrc-m}
URL_MAP_NAME="unigrc-frontend-url-map"
BACKEND_SERVICE_SPA="unigrc-spa-service"
BACKEND_SERVICE_API="unigrc-backend-service"

echo "🔧 Corrección manual del URL Map"
echo "   Proyecto: $PROJECT_ID"
echo ""

# Verificar que gcloud está instalado
if ! command -v gcloud &> /dev/null; then
  echo "❌ Error: gcloud CLI no está instalado"
  exit 1
fi

# Configurar proyecto
gcloud config set project $PROJECT_ID

echo "📋 Verificando que los backend services existen..."
echo ""

# Verificar Backend Service para SPA
if ! gcloud compute backend-services describe $BACKEND_SERVICE_SPA \
  --global \
  --project=$PROJECT_ID &>/dev/null; then
  echo "❌ Error: El backend service $BACKEND_SERVICE_SPA no existe"
  echo "   Ejecuta primero: ./scripts/fix-spa-routing-load-balancer.sh"
  exit 1
fi
echo "   ✅ $BACKEND_SERVICE_SPA existe"

# Verificar Backend Service para API
if ! gcloud compute backend-services describe $BACKEND_SERVICE_API \
  --global \
  --project=$PROJECT_ID &>/dev/null; then
  echo "⚠️  Advertencia: El backend service $BACKEND_SERVICE_API no existe"
  echo "   Esto puede ser normal si usas un NEG diferente"
fi

echo ""
echo "🗺️  Actualizando URL Map..."
echo ""

# Cambiar el default backend a la Cloud Function
echo "1. Cambiando default backend a SPA Service..."
gcloud compute url-maps set-default-service $URL_MAP_NAME \
  --default-service=$BACKEND_SERVICE_SPA \
  --global \
  --project=$PROJECT_ID

echo "   ✅ Default backend actualizado"

# Verificar si existe un path matcher para /api/*
echo ""
echo "2. Verificando path matcher para /api/*..."
EXISTING_MATCHER=$(gcloud compute url-maps describe $URL_MAP_NAME \
  --global \
  --format="value(pathMatchers[0].name)" \
  --project=$PROJECT_ID 2>/dev/null || echo "")

if [ -z "$EXISTING_MATCHER" ]; then
  echo "   Agregando path matcher para /api/*..."
  gcloud compute url-maps add-path-matcher $URL_MAP_NAME \
    --global \
    --path-matcher-name=api-matcher \
    --default-service=$BACKEND_SERVICE_SPA \
    --path-rules="/api/*=$BACKEND_SERVICE_API" \
    --project=$PROJECT_ID
  
  echo "   ✅ Path matcher agregado"
else
  echo "   Path matcher existente: $EXISTING_MATCHER"
  echo "   Verificando si necesita actualización..."
  
  # Verificar si el path rule para /api/* existe
  API_RULE=$(gcloud compute url-maps describe $URL_MAP_NAME \
    --global \
    --format="value(pathMatchers[0].pathRules[?paths=='/api/*'].service)" \
    --project=$PROJECT_ID 2>/dev/null || echo "")
  
  if [ -z "$API_RULE" ]; then
    echo "   Agregando path rule para /api/*..."
    # Necesitamos actualizar el path matcher existente
    echo "   ⚠️  Necesitas actualizar manualmente el path matcher existente"
    echo "   Ejecuta:"
    echo "   gcloud compute url-maps edit $URL_MAP_NAME --global --project=$PROJECT_ID"
  else
    echo "   ✅ Path rule para /api/* ya existe: $API_RULE"
  fi
fi

echo ""
echo "🔄 Invalidando caché del CDN..."
gcloud compute url-maps invalidate-cdn-cache $URL_MAP_NAME \
  --path="/*" \
  --global \
  --project=$PROJECT_ID || echo "   ⚠️  No se pudo invalidar caché (puede ser normal)"

echo ""
echo "✅ Configuración completada"
echo ""
echo "⏳ Espera 2-3 minutos para que los cambios se propaguen"
echo "   Luego prueba: https://cl.unigrc.app/compliance-officers"
echo ""
