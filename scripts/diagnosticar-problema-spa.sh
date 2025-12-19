#!/bin/bash
# Script de diagnóstico completo para el problema de SPA routing

PROJECT_ID="unigrc-m"
REGION="southamerica-west1"
FUNCTION_NAME="serve-spa"
NEG_NAME="unigrc-spa-neg"
BACKEND_SERVICE_SPA="unigrc-spa-service"
URL_MAP_NAME="unigrc-frontend-url-map"

echo "🔍 Diagnóstico completo del problema de SPA routing"
echo "   Proyecto: $PROJECT_ID"
echo ""

gcloud config set project $PROJECT_ID

echo "1️⃣ Verificando Cloud Function..."
if gcloud functions describe $FUNCTION_NAME \
  --gen2 \
  --region=$REGION \
  --project=$PROJECT_ID &>/dev/null; then
  FUNCTION_URL=$(gcloud functions describe $FUNCTION_NAME \
    --gen2 \
    --region=$REGION \
    --format="value(serviceConfig.uri)" \
    --project=$PROJECT_ID 2>/dev/null)
  echo "   ✅ Cloud Function existe"
  echo "   URL: $FUNCTION_URL"
else
  echo "   ❌ Cloud Function NO existe"
fi

echo ""
echo "2️⃣ Verificando NEG..."
if gcloud compute network-endpoint-groups describe $NEG_NAME \
  --region=$REGION \
  --project=$PROJECT_ID &>/dev/null; then
  echo "   ✅ NEG existe"
  NEG_DETAILS=$(gcloud compute network-endpoint-groups describe $NEG_NAME \
    --region=$REGION \
    --format="value(cloudFunction.name)" \
    --project=$PROJECT_ID 2>/dev/null)
  echo "   Cloud Function asociada: $NEG_DETAILS"
else
  echo "   ❌ NEG NO existe"
fi

echo ""
echo "3️⃣ Verificando Backend Service..."
if gcloud compute backend-services describe $BACKEND_SERVICE_SPA \
  --global \
  --project=$PROJECT_ID &>/dev/null; then
  echo "   ✅ Backend Service existe"
  BACKENDS=$(gcloud compute backend-services describe $BACKEND_SERVICE_SPA \
    --global \
    --format="value(backends[].group)" \
    --project=$PROJECT_ID 2>/dev/null)
  if [ -z "$BACKENDS" ]; then
    echo "   ⚠️  Backend Service NO tiene backends configurados"
  else
    echo "   Backends: $BACKENDS"
  fi
else
  echo "   ❌ Backend Service NO existe"
fi

echo ""
echo "4️⃣ Verificando URL Map..."
DEFAULT_SERVICE=$(gcloud compute url-maps describe $URL_MAP_NAME \
  --global \
  --format="value(defaultService)" \
  --project=$PROJECT_ID 2>/dev/null)

if [[ "$DEFAULT_SERVICE" == *"$BACKEND_SERVICE_SPA"* ]]; then
  echo "   ✅ Default backend es $BACKEND_SERVICE_SPA"
else
  echo "   ❌ Default backend NO es $BACKEND_SERVICE_SPA"
  echo "   Actual: $DEFAULT_SERVICE"
fi

echo ""
echo "5️⃣ Verificando Path Matchers..."
gcloud compute url-maps describe $URL_MAP_NAME \
  --global \
  --format="table(pathMatchers[].name,pathMatchers[].defaultService)" \
  --project=$PROJECT_ID 2>/dev/null

echo ""
echo "6️⃣ Verificando Path Rules..."
gcloud compute url-maps describe $URL_MAP_NAME \
  --global \
  --format="table(pathMatchers[].pathRules[].paths,pathMatchers[].pathRules[].service)" \
  --project=$PROJECT_ID 2>/dev/null

echo ""
echo "7️⃣ Probando Cloud Function directamente..."
if [ -n "$FUNCTION_URL" ]; then
  echo "   Probando: $FUNCTION_URL/"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FUNCTION_URL/" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ Cloud Function responde correctamente (HTTP $HTTP_CODE)"
  else
    echo "   ❌ Cloud Function NO responde correctamente (HTTP $HTTP_CODE)"
  fi
else
  echo "   ⚠️  No se pudo obtener URL de Cloud Function"
fi

echo ""
echo "8️⃣ Verificando estado del Backend Service..."
HEALTH=$(gcloud compute backend-services get-health $BACKEND_SERVICE_SPA \
  --global \
  --project=$PROJECT_ID 2>/dev/null | grep -q "healthy" && echo "healthy" || echo "unhealthy/unknown")
echo "   Estado: $HEALTH"

echo ""
echo "💡 Diagnóstico completado"
echo ""
