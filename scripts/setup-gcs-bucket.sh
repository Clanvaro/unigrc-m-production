#!/bin/bash
# Script para crear y configurar bucket de Cloud Storage para frontend estático
# Usage: ./scripts/setup-gcs-bucket.sh [staging|prod]

set -e

ENVIRONMENT=${1:-prod}
PROJECT_ID=${GCP_PROJECT_ID:-unigrc-m}
REGION=${GCP_REGION:-southamerica-west1}

if [ "$ENVIRONMENT" = "staging" ]; then
  BUCKET_NAME="unigrc-frontend-staging"
else
  BUCKET_NAME="unigrc-frontend-prod"
fi

echo "🚀 Configurando bucket de Cloud Storage: $BUCKET_NAME"
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

# Crear bucket si no existe
echo "📦 Creando bucket $BUCKET_NAME..."
if gsutil ls -b gs://$BUCKET_NAME &>/dev/null; then
  echo "   ✅ Bucket ya existe"
else
  gsutil mb -p $PROJECT_ID -c STANDARD -l $REGION gs://$BUCKET_NAME
  echo "   ✅ Bucket creado"
fi

# Configurar bucket como sitio web estático
echo "🌐 Configurando bucket como sitio web estático..."
gsutil web set -m index.html -e index.html gs://$BUCKET_NAME
echo "   ✅ Configuración de sitio web aplicada"

# Configurar CORS
echo "🔐 Configurando CORS..."
cat > /tmp/cors.json <<EOF
[
  {
    "origin": ["https://cl.unigrc.app", "https://*.unigrc.app"],
    "method": ["GET", "HEAD", "OPTIONS"],
    "responseHeader": ["Content-Type", "Cache-Control", "X-Requested-With"],
    "maxAgeSeconds": 3600
  }
]
EOF
gsutil cors set /tmp/cors.json gs://$BUCKET_NAME
rm /tmp/cors.json
echo "   ✅ CORS configurado"

# Configurar políticas de acceso público para objetos (no bucket)
echo "🔓 Configurando políticas de acceso..."
# Permitir acceso público a objetos pero no al bucket completo
gsutil iam ch allUsers:objectViewer gs://$BUCKET_NAME
echo "   ✅ Políticas de acceso configuradas"

# Configurar headers de cache para diferentes tipos de archivos
echo "📋 Configurando headers de cache..."
cat > /tmp/metadata.yaml <<EOF
cacheControl: public, max-age=31536000, immutable
contentType: application/javascript
EOF

# Aplicar headers a archivos JS
gsutil -m setmeta -h "Cache-Control: public, max-age=31536000, immutable" \
  gs://$BUCKET_NAME/assets/*.js 2>/dev/null || echo "   ℹ️  No hay archivos JS aún"

cat > /tmp/metadata-css.yaml <<EOF
cacheControl: public, max-age=31536000, immutable
contentType: text/css
EOF

# Aplicar headers a archivos CSS
gsutil -m setmeta -h "Cache-Control: public, max-age=31536000, immutable" \
  gs://$BUCKET_NAME/assets/*.css 2>/dev/null || echo "   ℹ️  No hay archivos CSS aún"

# index.html debe tener no-cache
gsutil setmeta -h "Cache-Control: no-cache, no-store, must-revalidate" \
  gs://$BUCKET_NAME/index.html 2>/dev/null || echo "   ℹ️  index.html se configurará en el primer deploy"

echo "   ✅ Headers de cache configurados"

# Configurar lifecycle policy (opcional - mantener versiones por 30 días)
echo "🔄 Configurando lifecycle policy..."
cat > /tmp/lifecycle.json <<EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "age": 30,
          "matchesStorageClass": ["STANDARD"]
        }
      }
    ]
  }
}
EOF
gsutil lifecycle set /tmp/lifecycle.json gs://$BUCKET_NAME
rm /tmp/lifecycle.json
echo "   ✅ Lifecycle policy configurada"

echo ""
echo "✅ Bucket $BUCKET_NAME configurado exitosamente"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Desplegar frontend al bucket: npm run deploy:gcs:$ENVIRONMENT"
echo "   2. Configurar Load Balancer apuntando a este bucket"
echo "   3. Configurar Cloud CDN en el Load Balancer"

