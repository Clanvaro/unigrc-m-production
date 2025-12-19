#!/bin/bash
# Script para verificar si existe una Cloud Function
# Usa la sintaxis correcta de gcloud

PROJECT_ID=${GCP_PROJECT_ID:-unigrc-m}
REGION=${GCP_REGION:-southamerica-west1}
FUNCTION_NAME="serve-spa"

echo "🔍 Verificando Cloud Functions en el proyecto..."
echo "   Proyecto: $PROJECT_ID"
echo "   Región: $REGION"
echo ""

# Listar todas las Cloud Functions Gen2
echo "📋 Cloud Functions Gen2 existentes:"
gcloud functions list \
  --v2 \
  --regions=$REGION \
  --project=$PROJECT_ID \
  --format="table(name,state,updateTime)" || echo "   No se encontraron funciones o hay un error"

echo ""
echo "🔍 Verificando función específica: $FUNCTION_NAME"
if gcloud functions describe $FUNCTION_NAME \
  --gen2 \
  --region=$REGION \
  --project=$PROJECT_ID &>/dev/null; then
  echo "   ✅ La función $FUNCTION_NAME existe"
  
  # Obtener detalles
  echo ""
  echo "📋 Detalles de la función:"
  gcloud functions describe $FUNCTION_NAME \
    --gen2 \
    --region=$REGION \
    --project=$PROJECT_ID \
    --format="yaml(name,state,serviceConfig.uri,serviceConfig.availableMemory)"
else
  echo "   ❌ La función $FUNCTION_NAME NO existe"
fi
