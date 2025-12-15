#!/bin/bash
# Script para subir frontend a Cloud Storage y configurar CDN
# Uso: ./scripts/upload-frontend-to-gcs.sh

set -e

# Variables
PROJECT_ID="${GCP_PROJECT_ID:-unigrc-m}"
BUCKET_NAME="${FRONTEND_BUCKET:-unigrc-frontend-static}"
REGION="${GCP_REGION:-southamerica-west1}"

echo "🚀 Subiendo frontend a Cloud Storage..."

# 1. Verificar que el build existe
if [ ! -d "dist/public" ]; then
  echo "❌ Error: dist/public no existe. Ejecutar 'npm run build' primero"
  exit 1
fi

# 2. Crear bucket si no existe
echo "📦 Creando bucket si no existe..."
if ! gsutil ls -b "gs://${BUCKET_NAME}" &>/dev/null; then
  gsutil mb -p "$PROJECT_ID" -c STANDARD -l "$REGION" "gs://${BUCKET_NAME}"
  echo "✅ Bucket creado"
else
  echo "✅ Bucket ya existe"
fi

# 3. Configurar bucket como sitio web estático
echo "⚙️ Configurando bucket como sitio web..."
gsutil web set -m index.html -e index.html "gs://${BUCKET_NAME}"

# 4. Configurar CORS
echo "🌐 Configurando CORS..."
cat > /tmp/cors.json <<EOF
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type", "Authorization"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set /tmp/cors.json "gs://${BUCKET_NAME}"

# 5. Configurar cache headers
echo "📋 Configurando cache headers..."
cat > /tmp/cache-metadata.txt <<EOF
Cache-Control:public, max-age=31536000, immutable
EOF

# Aplicar a archivos estáticos (JS, CSS, imágenes)
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" \
  "gs://${BUCKET_NAME}/assets/**/*.{js,css,png,jpg,jpeg,svg,woff,woff2}"

# HTML sin cache (para actualizaciones)
gsutil -m setmeta -h "Cache-Control:public, max-age=0, must-revalidate" \
  "gs://${BUCKET_NAME}/*.html"

# 6. Subir archivos
echo "📤 Subiendo archivos a Cloud Storage..."
gsutil -m rsync -r -d dist/public "gs://${BUCKET_NAME}/"

# 7. Configurar permisos públicos (solo lectura)
echo "🔓 Configurando permisos..."
gsutil iam ch allUsers:objectViewer "gs://${BUCKET_NAME}"

# 8. Obtener URL pública
BUCKET_URL="https://storage.googleapis.com/${BUCKET_NAME}/index.html"
echo ""
echo "✅ Frontend subido exitosamente!"
echo ""
echo "🔗 URL pública:"
echo "   ${BUCKET_URL}"
echo ""
echo "📝 Próximos pasos (opcional - CDN):"
echo "   1. Configurar Cloud CDN con Load Balancer"
echo "   2. O usar dominio personalizado con Cloud Storage"
echo "   3. Actualizar FRONTEND_URL en Cloud Run backend"

# Limpiar archivos temporales
rm -f /tmp/cors.json /tmp/cache-metadata.txt
