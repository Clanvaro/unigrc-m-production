#!/bin/bash
# Script completo para solucionar el problema de SPA routing
# Crea todos los recursos necesarios y configura el URL Map correctamente

set -e

PROJECT_ID="unigrc-m"
REGION="southamerica-west1"
FUNCTION_NAME="serve-spa"
NEG_NAME="unigrc-spa-neg"
BACKEND_SERVICE_SPA="unigrc-spa-service"
URL_MAP_NAME="unigrc-frontend-url-map"

echo "🚀 Solucionando problema de SPA routing"
echo "   Proyecto: $PROJECT_ID"
echo "   Región: $REGION"
echo ""

# Configurar proyecto
gcloud config set project $PROJECT_ID

# Paso 1: Verificar Cloud Function
echo "📦 Paso 1: Verificando Cloud Function..."
if ! gcloud functions describe $FUNCTION_NAME \
  --gen2 \
  --region=$REGION \
  --project=$PROJECT_ID &>/dev/null; then
  echo "❌ Error: La Cloud Function $FUNCTION_NAME no existe"
  echo "   Ejecuta primero: ./scripts/fix-spa-routing-load-balancer.sh"
  exit 1
fi
echo "   ✅ Cloud Function existe"

# Paso 2: Crear NEG
echo ""
echo "🌐 Paso 2: Creando Network Endpoint Group..."
if gcloud compute network-endpoint-groups describe $NEG_NAME \
  --region=$REGION \
  --project=$PROJECT_ID &>/dev/null; then
  echo "   ✅ NEG ya existe"
else
  echo "   Creando NEG..."
  gcloud compute network-endpoint-groups create $NEG_NAME \
    --region=$REGION \
    --network-endpoint-type=serverless \
    --cloud-function-name=$FUNCTION_NAME \
    --project=$PROJECT_ID
  echo "   ✅ NEG creado"
fi

# Paso 3: Crear Backend Service
echo ""
echo "⚙️  Paso 3: Creando Backend Service..."
if gcloud compute backend-services describe $BACKEND_SERVICE_SPA \
  --global \
  --project=$PROJECT_ID &>/dev/null; then
  echo "   ✅ Backend Service ya existe"
else
  echo "   Creando Backend Service..."
  gcloud compute backend-services create $BACKEND_SERVICE_SPA \
    --global \
    --protocol=HTTP \
    --project=$PROJECT_ID
  echo "   ✅ Backend Service creado"
fi

# Paso 4: Agregar NEG al Backend Service
echo ""
echo "🔗 Paso 4: Agregando NEG al Backend Service..."
# Verificar si el NEG ya está agregado
EXISTING_BACKEND=$(gcloud compute backend-services describe $BACKEND_SERVICE_SPA \
  --global \
  --format="value(backends[].group)" \
  --project=$PROJECT_ID 2>/dev/null | grep -q "$NEG_NAME" && echo "yes" || echo "no")

if [ "$EXISTING_BACKEND" = "yes" ]; then
  echo "   ✅ NEG ya está agregado"
else
  echo "   Agregando NEG..."
  gcloud compute backend-services add-backend $BACKEND_SERVICE_SPA \
    --global \
    --network-endpoint-group=$NEG_NAME \
    --network-endpoint-group-region=$REGION \
    --project=$PROJECT_ID
  echo "   ✅ NEG agregado"
fi

# Paso 5: Actualizar URL Map
echo ""
echo "🗺️  Paso 5: Actualizando URL Map..."
echo "   Cambiando default backend a $BACKEND_SERVICE_SPA..."

CURRENT_DEFAULT=$(gcloud compute url-maps describe $URL_MAP_NAME \
  --global \
  --format="value(defaultService)" \
  --project=$PROJECT_ID 2>/dev/null || echo "")

if [[ "$CURRENT_DEFAULT" == *"$BACKEND_SERVICE_SPA"* ]]; then
  echo "   ✅ Default backend ya está configurado correctamente"
else
  gcloud compute url-maps set-default-service $URL_MAP_NAME \
    --default-service=$BACKEND_SERVICE_SPA \
    --global \
    --project=$PROJECT_ID
  echo "   ✅ Default backend actualizado"
fi

# Paso 6: Invalidar caché
echo ""
echo "🔄 Paso 6: Invalidando caché del CDN..."
gcloud compute url-maps invalidate-cdn-cache $URL_MAP_NAME \
  --path="/*" \
  --global \
  --project=$PROJECT_ID 2>/dev/null && echo "   ✅ Caché invalidada" || echo "   ⚠️  No se pudo invalidar caché (puede ser normal)"

echo ""
echo "✅ ¡Problema solucionado!"
echo ""
echo "📋 Resumen de cambios:"
echo "   - NEG creado: $NEG_NAME"
echo "   - Backend Service creado: $BACKEND_SERVICE_SPA"
echo "   - URL Map actualizado: default → $BACKEND_SERVICE_SPA"
echo "   - Path /api/* → unigrc-backend-service (sin cambios)"
echo ""
echo "⏳ Espera 2-3 minutos para que los cambios se propaguen"
echo "   Luego prueba: https://cl.unigrc.app/compliance-officers"
echo ""
echo "💡 Si después de 3 minutos sigue dando 404, ejecuta:"
echo "   ./scripts/verificar-url-map.sh"
echo ""
