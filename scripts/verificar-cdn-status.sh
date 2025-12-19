#!/bin/bash
# Script para verificar el estado de Cloud CDN
# Usage: ./scripts/verificar-cdn-status.sh

set -e

PROJECT_ID=${GCP_PROJECT_ID:-unigrc-m}
URL_MAP_NAME="unigrc-frontend-url-map"
BACKEND_BUCKET_NAME="unigrc-frontend-prod-backend"
BACKEND_SERVICE_NAME="unigrc-backend-service"

echo "🔍 Verificando estado de Cloud CDN"
echo "   Proyecto: $PROJECT_ID"
echo ""

# Verificar que gcloud está instalado
if ! command -v gcloud &> /dev/null; then
  echo "❌ Error: gcloud CLI no está instalado"
  exit 1
fi

# Configurar proyecto
gcloud config set project $PROJECT_ID

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  VERIFICANDO BACKEND BUCKET (Frontend estático)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if gcloud compute backend-buckets describe $BACKEND_BUCKET_NAME --project=$PROJECT_ID &>/dev/null; then
  echo "✅ Backend Bucket existe: $BACKEND_BUCKET_NAME"
  
  # Verificar si CDN está habilitado
  CDN_ENABLED_BUCKET=$(gcloud compute backend-buckets describe $BACKEND_BUCKET_NAME \
    --format="value(enableCdn)" \
    --project=$PROJECT_ID 2>/dev/null || echo "false")
  
  if [ "$CDN_ENABLED_BUCKET" = "True" ]; then
    echo "   ✅ CDN está HABILITADO en el Backend Bucket"
  else
    echo "   ❌ CDN está DESHABILITADO en el Backend Bucket"
    echo "   💡 Para habilitarlo, ejecuta:"
    echo "      gcloud compute backend-buckets update $BACKEND_BUCKET_NAME \\"
    echo "        --enable-cdn \\"
    echo "        --global \\"
    echo "        --project=$PROJECT_ID"
  fi
  
  # Obtener bucket de GCS asociado
  GCS_BUCKET=$(gcloud compute backend-buckets describe $BACKEND_BUCKET_NAME \
    --global \
    --format="value(bucketName)" \
    --project=$PROJECT_ID 2>/dev/null || echo "")
  
  if [ -n "$GCS_BUCKET" ]; then
    echo "   📦 Bucket de GCS: $GCS_BUCKET"
  fi
else
  echo "❌ Backend Bucket NO existe: $BACKEND_BUCKET_NAME"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  VERIFICANDO BACKEND SERVICE (API)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if gcloud compute backend-services describe $BACKEND_SERVICE_NAME --global --project=$PROJECT_ID &>/dev/null; then
  echo "✅ Backend Service existe: $BACKEND_SERVICE_NAME"
  
  # Verificar si CDN está habilitado
  CDN_ENABLED_SERVICE=$(gcloud compute backend-services describe $BACKEND_SERVICE_NAME \
    --global \
    --format="value(cdnPolicy.enableCdn)" \
    --project=$PROJECT_ID 2>/dev/null || echo "false")
  
  if [ "$CDN_ENABLED_SERVICE" = "True" ]; then
    echo "   ✅ CDN está HABILITADO en el Backend Service"
    
    # Obtener configuración de caché
    CACHE_MODE=$(gcloud compute backend-services describe $BACKEND_SERVICE_NAME \
      --global \
      --format="value(cdnPolicy.cacheMode)" \
      --project=$PROJECT_ID 2>/dev/null || echo "N/A")
    
    DEFAULT_TTL=$(gcloud compute backend-services describe $BACKEND_SERVICE_NAME \
      --global \
      --format="value(cdnPolicy.defaultTtl)" \
      --project=$PROJECT_ID 2>/dev/null || echo "N/A")
    
    MAX_TTL=$(gcloud compute backend-services describe $BACKEND_SERVICE_NAME \
      --global \
      --format="value(cdnPolicy.maxTtl)" \
      --project=$PROJECT_ID 2>/dev/null || echo "N/A")
    
    echo "   📊 Configuración de caché:"
    echo "      - Modo: $CACHE_MODE"
    echo "      - TTL por defecto: ${DEFAULT_TTL}s"
    echo "      - TTL máximo: ${MAX_TTL}s"
  else
    echo "   ❌ CDN está DESHABILITADO en el Backend Service"
    echo "   💡 Para habilitarlo, ejecuta:"
    echo "      gcloud compute backend-services update $BACKEND_SERVICE_NAME \\"
    echo "        --enable-cdn \\"
    echo "        --global \\"
    echo "        --project=$PROJECT_ID"
  fi
else
  echo "❌ Backend Service NO existe: $BACKEND_SERVICE_NAME"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  VERIFICANDO URL MAP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if gcloud compute url-maps describe $URL_MAP_NAME --global --project=$PROJECT_ID &>/dev/null; then
  echo "✅ URL Map existe: $URL_MAP_NAME"
  
  # Obtener backend por defecto
  DEFAULT_BACKEND=$(gcloud compute url-maps describe $URL_MAP_NAME \
    --global \
    --format="value(defaultService)" \
    --project=$PROJECT_ID 2>/dev/null || echo "")
  
  if [ -n "$DEFAULT_BACKEND" ]; then
    echo "   📍 Backend por defecto: $DEFAULT_BACKEND"
  fi
  
  # Listar path matchers
  echo "   📋 Path Matchers:"
  gcloud compute url-maps describe $URL_MAP_NAME \
    --global \
    --format="table(pathMatchers[].name,pathMatchers[].defaultService)" \
    --project=$PROJECT_ID 2>/dev/null || echo "      (No hay path matchers configurados)"
else
  echo "❌ URL Map NO existe: $URL_MAP_NAME"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  VERIFICANDO ESTADÍSTICAS DE CDN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "   💡 Para ver estadísticas de CDN, visita:"
echo "      https://console.cloud.google.com/net-services/cdn/overview?project=$PROJECT_ID"
echo ""
echo "   O ejecuta:"
echo "      gcloud compute url-maps describe $URL_MAP_NAME --global --project=$PROJECT_ID"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 RESUMEN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$CDN_ENABLED_BUCKET" = "True" ] && [ "$CDN_ENABLED_SERVICE" = "True" ]; then
  echo "✅ Cloud CDN está COMPLETAMENTE HABILITADO"
  echo "   - Backend Bucket: ✅"
  echo "   - Backend Service: ✅"
elif [ "$CDN_ENABLED_BUCKET" = "True" ] || [ "$CDN_ENABLED_SERVICE" = "True" ]; then
  echo "⚠️  Cloud CDN está PARCIALMENTE HABILITADO"
  echo "   - Backend Bucket: $([ "$CDN_ENABLED_BUCKET" = "True" ] && echo "✅" || echo "❌")"
  echo "   - Backend Service: $([ "$CDN_ENABLED_SERVICE" = "True" ] && echo "✅" || echo "❌")"
else
  echo "❌ Cloud CDN está DESHABILITADO"
  echo "   - Backend Bucket: ❌"
  echo "   - Backend Service: ❌"
fi

echo ""
