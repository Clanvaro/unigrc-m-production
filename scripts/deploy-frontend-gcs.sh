#!/bin/bash
# Script para deploy del frontend a Cloud Storage
# Usage: ./scripts/deploy-frontend-gcs.sh [staging|prod]

set -e

ENVIRONMENT=${1:-prod}
PROJECT_ID=${GCP_PROJECT_ID:-unigrc-m}

if [ "$ENVIRONMENT" = "staging" ]; then
  BUCKET_NAME="unigrc-frontend-staging"
  CDN_BACKEND_SERVICE="unigrc-backend-service"
else
  BUCKET_NAME="unigrc-frontend-prod"
  CDN_BACKEND_SERVICE="unigrc-backend-service"
fi

echo "🚀 Desplegando frontend a Cloud Storage"
echo "   Entorno: $ENVIRONMENT"
echo "   Bucket: $BUCKET_NAME"
echo "   Proyecto: $PROJECT_ID"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
  echo "❌ Error: Ejecuta este script desde la raíz del proyecto"
  exit 1
fi

# Verificar que gcloud está instalado
if ! command -v gcloud &> /dev/null; then
  echo "❌ Error: gcloud CLI no está instalado"
  exit 1
fi

# Verificar que gsutil está disponible
if ! command -v gsutil &> /dev/null; then
  echo "❌ Error: gsutil no está instalado"
  exit 1
fi

# Configurar proyecto
gcloud config set project $PROJECT_ID

# Build del frontend (solo frontend, no backend)
echo "🔨 Construyendo frontend..."
export NODE_ENV=production
export VITE_API_URL=${VITE_API_URL:-https://unigrc-backend-524018293934.southamerica-west1.run.app}
npx vite build

if [ ! -d "dist/public" ]; then
  echo "❌ Error: Build no generó dist/public"
  exit 1
fi

echo "   ✅ Build completado"

# Upload a Cloud Storage
echo "📤 Subiendo archivos a Cloud Storage..."
gsutil -m rsync -r -d dist/public gs://$BUCKET_NAME

echo "   ✅ Archivos subidos"

# Configurar headers de cache para diferentes tipos de archivos
echo "📋 Configurando headers de cache..."

# Assets estáticos: cache largo
find dist/public/assets -name "*.js" -type f | while read file; do
  gsutil setmeta -h "Cache-Control: public, max-age=31536000, immutable" \
    "gs://$BUCKET_NAME/assets/$(basename $file)" 2>/dev/null || true
done

find dist/public/assets -name "*.css" -type f | while read file; do
  gsutil setmeta -h "Cache-Control: public, max-age=31536000, immutable" \
    "gs://$BUCKET_NAME/assets/$(basename $file)" 2>/dev/null || true
done

find dist/public/assets -name "*.woff2" -o -name "*.woff" -o -name "*.ttf" -o -name "*.eot" | while read file; do
  gsutil setmeta -h "Cache-Control: public, max-age=31536000, immutable" \
    "gs://$BUCKET_NAME/assets/$(basename $file)" 2>/dev/null || true
done

find dist/public/assets -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.gif" -o -name "*.webp" -o -name "*.svg" -o -name "*.ico" | while read file; do
  gsutil setmeta -h "Cache-Control: public, max-age=31536000, immutable" \
    "gs://$BUCKET_NAME/assets/$(basename $file)" 2>/dev/null || true
done

# index.html: no cache
gsutil setmeta -h "Cache-Control: no-cache, no-store, must-revalidate" \
  gs://$BUCKET_NAME/index.html

# Otros archivos estáticos en raíz
if [ -f "dist/public/favicon.ico" ]; then
  gsutil setmeta -h "Cache-Control: public, max-age=86400" \
    gs://$BUCKET_NAME/favicon.ico
fi

echo "   ✅ Headers de cache configurados"

# Invalidar cache de CDN
echo "🔄 Invalidando cache de Cloud CDN..."
if command -v gcloud &> /dev/null; then
  # Invalidar index.html y assets principales
  gcloud compute url-maps invalidate-cdn-cache unigrc-frontend-url-map \
    --path="/index.html" \
    --project=$PROJECT_ID 2>/dev/null || echo "   ℹ️  CDN invalidation no disponible aún (configura CDN primero)"
fi

echo ""
echo "✅ Deploy completado exitosamente"
echo ""
echo "📋 Verificación:"
echo "   Verifica que el sitio funciona en: https://cl.unigrc.app"
echo "   (después de configurar DNS y Load Balancer)"

