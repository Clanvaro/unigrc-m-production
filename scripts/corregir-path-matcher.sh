#!/bin/bash
# Script para corregir el path matcher del URL Map
# El problema puede ser que el path matcher tiene un default service incorrecto

set -e

PROJECT_ID="unigrc-m"
URL_MAP_NAME="unigrc-frontend-url-map"
BACKEND_SERVICE_SPA="unigrc-spa-service"
BACKEND_SERVICE_API="unigrc-backend-service"

echo "🔧 Corrigiendo Path Matcher del URL Map"
echo "   Proyecto: $PROJECT_ID"
echo ""

gcloud config set project $PROJECT_ID

echo "📋 Configuración actual del path matcher:"
gcloud compute url-maps describe $URL_MAP_NAME \
  --global \
  --format="yaml(pathMatchers)" \
  --project=$PROJECT_ID

echo ""
echo "🔍 El problema puede ser que el path matcher 'api-matcher' tiene un default"
echo "   que no es el SPA service. Cuando una ruta no coincide con /api/*,"
echo "   va al default del path matcher en lugar del default del URL Map."
echo ""

echo "🗑️  Eliminando path matcher existente para recrearlo correctamente..."
# Eliminar el path matcher existente
gcloud compute url-maps remove-path-matcher $URL_MAP_NAME \
  --path-matcher-name=api-matcher \
  --global \
  --project=$PROJECT_ID

echo "   ✅ Path matcher eliminado"

echo ""
echo "➕ Recreando path matcher con configuración correcta..."
# Crear el path matcher con el default correcto
gcloud compute url-maps add-path-matcher $URL_MAP_NAME \
  --global \
  --path-matcher-name=api-matcher \
  --default-service=$BACKEND_SERVICE_SPA \
  --path-rules="/api/*=$BACKEND_SERVICE_API" \
  --project=$PROJECT_ID

echo "   ✅ Path matcher recreado"

echo ""
echo "🔄 Invalidando caché..."
gcloud compute url-maps invalidate-cdn-cache $URL_MAP_NAME \
  --path="/*" \
  --global \
  --project=$PROJECT_ID 2>/dev/null && echo "   ✅ Caché invalidada" || echo "   ⚠️  No se pudo invalidar"

echo ""
echo "✅ Path matcher corregido"
echo ""
echo "⏳ Espera 2-3 minutos y prueba: https://cl.unigrc.app/compliance-officers"
echo ""
