#!/bin/bash
# Script para verificar la configuración del URL Map del Load Balancer

PROJECT_ID=${GCP_PROJECT_ID:-unigrc-m}
URL_MAP_NAME="unigrc-frontend-url-map"

echo "🔍 Verificando configuración del URL Map"
echo "   Proyecto: $PROJECT_ID"
echo "   URL Map: $URL_MAP_NAME"
echo ""

# Verificar que gcloud está instalado
if ! command -v gcloud &> /dev/null; then
  echo "❌ Error: gcloud CLI no está instalado"
  exit 1
fi

# Configurar proyecto
gcloud config set project $PROJECT_ID

echo "📋 Configuración actual del URL Map:"
echo ""

# Obtener información del URL Map
echo "1. Default Backend:"
DEFAULT_BACKEND=$(gcloud compute url-maps describe $URL_MAP_NAME \
  --global \
  --format="value(defaultBackendBucket,defaultService)" \
  --project=$PROJECT_ID 2>/dev/null)

if [ -n "$DEFAULT_BACKEND" ]; then
  echo "   $DEFAULT_BACKEND"
else
  echo "   ⚠️  No configurado"
fi

echo ""
echo "2. Path Matchers:"
gcloud compute url-maps describe $URL_MAP_NAME \
  --global \
  --format="table(pathMatchers[].name,pathMatchers[].defaultService)" \
  --project=$PROJECT_ID 2>/dev/null || echo "   ⚠️  No hay path matchers configurados"

echo ""
echo "3. Path Rules:"
gcloud compute url-maps describe $URL_MAP_NAME \
  --global \
  --format="table(pathMatchers[].pathRules[].paths,pathMatchers[].pathRules[].service)" \
  --project=$PROJECT_ID 2>/dev/null || echo "   ⚠️  No hay path rules configuradas"

echo ""
echo "4. Backend Services:"
echo "   Verificando backend services relacionados..."
gcloud compute backend-services list \
  --global \
  --filter="name:unigrc*" \
  --format="table(name,backends[].group)" \
  --project=$PROJECT_ID 2>/dev/null || echo "   ⚠️  No se encontraron backend services"

echo ""
echo "5. Backend Buckets:"
gcloud compute backend-buckets list \
  --filter="name:unigrc*" \
  --format="table(name,bucketName)" \
  --project=$PROJECT_ID 2>/dev/null || echo "   ⚠️  No se encontraron backend buckets"

echo ""
echo "💡 Diagnóstico:"
echo ""
echo "   El URL Map debería tener:"
echo "   - Default Backend: unigrc-spa-service (Cloud Function)"
echo "   - Path Rule: /api/* → unigrc-backend-service (Cloud Run)"
echo ""
echo "   Si el default backend es un Backend Bucket, ese es el problema."
echo "   El Backend Bucket no maneja SPA routing."
