#!/bin/bash
# Script para corregir el routing del SPA
# Opción rápida: Usar el servicio Cloud Run frontend existente temporalmente
# hasta que podamos crear una solución mejor

set -e

PROJECT_ID=${GCP_PROJECT_ID:-unigrc-m}
REGION=${GCP_REGION:-southamerica-west1}

echo "🔧 Solución temporal: Usar servicio Cloud Run frontend para routing SPA"
echo "   Esto es una solución temporal hasta implementar una mejor"
echo ""

# Verificar que el servicio frontend existe
if ! gcloud run services describe unigrc-frontend \
  --region=$REGION \
  --project=$PROJECT_ID &>/dev/null; then
  echo "❌ Error: El servicio unigrc-frontend no existe"
  echo "   Necesitas crear un servicio Cloud Run mínimo para servir el SPA"
  exit 1
fi

echo "✅ El servicio unigrc-frontend existe"
echo ""
echo "📋 Solución recomendada:"
echo ""
echo "1. Actualizar el URL map para que las rutas no-API usen el servicio frontend:"
echo "   gcloud compute url-maps edit unigrc-frontend-url-map --global --project=$PROJECT_ID"
echo ""
echo "2. O mejor: Crear un servicio Cloud Run mínimo específico para servir el SPA"
echo "   desde Cloud Storage usando un proxy simple"
echo ""
echo "3. O usar la Cloud Function creada (scripts/setup-spa-cloud-function.sh)"
echo ""
echo "⚠️  NOTA: El servicio frontend actual puede seguir funcionando temporalmente"
echo "   para servir el SPA mientras implementamos una solución mejor."

