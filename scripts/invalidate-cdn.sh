#!/bin/bash
# Script para invalidar cache de Cloud CDN
# Usage: ./scripts/invalidate-cdn.sh [path1] [path2] ...

set -e

PROJECT_ID=${GCP_PROJECT_ID:-unigrc-m}
URL_MAP_NAME="unigrc-frontend-url-map"

# Si no se proporcionan paths, invalidar los principales
PATHS=${@:-"/index.html /assets/*"}

echo "🔄 Invalidando cache de Cloud CDN"
echo "   Proyecto: $PROJECT_ID"
echo "   URL Map: $URL_MAP_NAME"
echo "   Paths: $PATHS"
echo ""

# Verificar que gcloud está instalado
if ! command -v gcloud &> /dev/null; then
  echo "❌ Error: gcloud CLI no está instalado"
  exit 1
fi

# Configurar proyecto
gcloud config set project $PROJECT_ID

# Invalidar cada path
for path in $PATHS; do
  echo "🗑️  Invalidando: $path"
  gcloud compute url-maps invalidate-cdn-cache $URL_MAP_NAME \
    --path="$path" \
    --project=$PROJECT_ID || echo "   ⚠️  Error invalidando $path"
done

echo ""
echo "✅ Invalidación de cache iniciada"
echo "   Nota: La invalidación puede tardar algunos minutos en propagarse"

