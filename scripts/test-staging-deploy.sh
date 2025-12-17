#!/bin/bash
# Script para testing completo en staging
# Usage: ./scripts/test-staging-deploy.sh

set -e

PROJECT_ID=${GCP_PROJECT_ID:-unigrc-m}
STAGING_BUCKET="unigrc-frontend-staging"

echo "🧪 Testing de deploy en staging"
echo "   Proyecto: $PROJECT_ID"
echo "   Bucket: $STAGING_BUCKET"
echo ""

# Verificar que gcloud está instalado
if ! command -v gcloud &> /dev/null; then
  echo "❌ Error: gcloud CLI no está instalado"
  exit 1
fi

# Configurar proyecto
gcloud config set project $PROJECT_ID

# 1. Deploy a staging
echo "📤 Paso 1: Deploy a staging..."
./scripts/deploy-frontend-gcs.sh staging

# 2. Obtener URL del Load Balancer de staging (si existe)
echo ""
echo "🔍 Paso 2: Verificando configuración..."
LB_IP=$(gcloud compute forwarding-rules describe unigrc-frontend-https-rule-staging \
  --global \
  --format="value(IPAddress)" \
  --project=$PROJECT_ID 2>/dev/null || echo "")

if [ -z "$LB_IP" ]; then
  echo "   ⚠️  Load Balancer de staging no configurado aún"
  echo "   Configura primero con: ./scripts/setup-load-balancer.sh staging"
else
  echo "   ✅ Load Balancer IP: $LB_IP"
fi

# 3. Verificar que los archivos están en el bucket
echo ""
echo "📋 Paso 3: Verificando archivos en bucket..."
if gsutil ls gs://$STAGING_BUCKET/index.html &>/dev/null; then
  echo "   ✅ index.html encontrado"
else
  echo "   ❌ index.html no encontrado"
  exit 1
fi

if gsutil ls gs://$STAGING_BUCKET/assets/*.js &>/dev/null; then
  JS_COUNT=$(gsutil ls gs://$STAGING_BUCKET/assets/*.js 2>/dev/null | wc -l)
  echo "   ✅ $JS_COUNT archivos JS encontrados"
else
  echo "   ⚠️  No se encontraron archivos JS"
fi

# 4. Verificar headers de cache
echo ""
echo "📋 Paso 4: Verificando headers de cache..."
INDEX_CACHE=$(gsutil stat gs://$STAGING_BUCKET/index.html 2>/dev/null | grep "Cache-Control" || echo "")
if echo "$INDEX_CACHE" | grep -q "no-cache"; then
  echo "   ✅ index.html tiene headers correctos"
else
  echo "   ⚠️  index.html puede no tener headers correctos"
fi

# 5. Test de CORS (si curl está disponible)
if command -v curl &> /dev/null && [ ! -z "$LB_IP" ]; then
  echo ""
  echo "🌐 Paso 5: Testing CORS..."
  CORS_RESPONSE=$(curl -s -I -X OPTIONS "http://$LB_IP" \
    -H "Origin: https://cl.unigrc.app" \
    -H "Access-Control-Request-Method: GET" 2>/dev/null || echo "")
  
  if echo "$CORS_RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
    echo "   ✅ CORS configurado correctamente"
  else
    echo "   ⚠️  CORS puede no estar configurado"
  fi
fi

echo ""
echo "✅ Testing completado"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Si el Load Balancer está configurado, prueba acceder a: http://$LB_IP"
echo "   2. Verifica que las rutas del SPA funcionan correctamente"
echo "   3. Prueba que /api/** se proxea correctamente al backend"
echo "   4. Si todo funciona, procede con deploy a producción"

