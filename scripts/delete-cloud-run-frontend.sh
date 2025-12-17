#!/bin/bash
# Script para eliminar el servicio Cloud Run frontend de forma segura
# Usage: ./scripts/delete-cloud-run-frontend.sh

set -e

PROJECT_ID=${GCP_PROJECT_ID:-unigrc-m}
REGION=${GCP_REGION:-southamerica-west1}
FRONTEND_SERVICE="unigrc-frontend"

echo "🗑️  Eliminando servicio Cloud Run frontend"
echo "=========================================="
echo ""
echo "Proyecto: $PROJECT_ID"
echo "Región: $REGION"
echo "Servicio: $FRONTEND_SERVICE"
echo ""

# Ejecutar verificación primero
echo "🔍 Ejecutando verificación previa..."
echo ""
if ! bash scripts/verify-before-delete-frontend.sh; then
    echo ""
    echo "❌ La verificación falló. No se eliminará el servicio."
    echo "   Corrige los errores antes de continuar."
    exit 1
fi

echo ""
echo "⚠️  ADVERTENCIA: Estás a punto de eliminar el servicio Cloud Run '$FRONTEND_SERVICE'"
echo ""
echo "Este servicio ya no se usa porque:"
echo "  - El frontend ahora está en Cloud Storage + CDN"
echo "  - El Load Balancer apunta directamente al bucket"
echo "  - Cloud Build ya no despliega a este servicio"
echo ""
read -p "¿Estás seguro de que quieres continuar? (escribe 'yes' para confirmar): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo ""
    echo "❌ Eliminación cancelada."
    exit 0
fi

echo ""
echo "🗑️  Eliminando servicio..."
gcloud run services delete $FRONTEND_SERVICE \
  --region=$REGION \
  --project=$PROJECT_ID \
  --quiet

echo ""
echo "✅ Servicio eliminado exitosamente"
echo ""
echo "💰 Ahorro de costos:"
echo "   - Ya no pagarás por instancias mínimas del servicio frontend"
echo "   - Ya no pagarás por requests al servicio frontend"
echo "   - Ya no pagarás por CPU/memoria del servicio frontend"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Verifica que el sitio sigue funcionando: https://cl.unigrc.app"
echo "   2. Monitorea los costos en Google Cloud Console"
echo "   3. Opcional: Elimina también las imágenes Docker del servicio frontend en Artifact Registry"

