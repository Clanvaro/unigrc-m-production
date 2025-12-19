#!/bin/bash

# Script para configurar variables de entorno de Microsoft Auth en Cloud Run
# Uso: ./scripts/configurar-microsoft-auth.sh

set -e

# Configuración
PROJECT_ID="unigrc-m"
REGION="southamerica-west1"
SERVICE_NAME="unigrc-backend"

# Valores de Microsoft Auth
# IMPORTANTE: No incluyas el Client Secret aquí. Úsalo como variable de entorno o parámetro.
# Ejemplo de uso:
#   MICROSOFT_CLIENT_SECRET="tu-secret" ./scripts/configurar-microsoft-auth.sh
#   O configura las variables antes de ejecutar:
#   export MICROSOFT_CLIENT_ID="..."
#   export MICROSOFT_CLIENT_SECRET="..."
#   export MICROSOFT_TENANT_ID="common"
#   export FRONTEND_URL="https://cl.unigrc.app"

MICROSOFT_CLIENT_ID="${MICROSOFT_CLIENT_ID:-b6e5301b-6fb5-4299-b6f7-8761c3ca8688}"
MICROSOFT_CLIENT_SECRET="${MICROSOFT_CLIENT_SECRET:-}"
MICROSOFT_TENANT_ID="${MICROSOFT_TENANT_ID:-common}"
FRONTEND_URL="${FRONTEND_URL:-https://cl.unigrc.app}"

# Validar que el Client Secret esté configurado
if [ -z "$MICROSOFT_CLIENT_SECRET" ]; then
  echo "❌ Error: MICROSOFT_CLIENT_SECRET no está configurado"
  echo ""
  echo "   Configura el secret como variable de entorno:"
  echo "   export MICROSOFT_CLIENT_SECRET='tu-secret-aqui'"
  echo "   ./scripts/configurar-microsoft-auth.sh"
  echo ""
  echo "   O pásalo directamente:"
  echo "   MICROSOFT_CLIENT_SECRET='tu-secret-aqui' ./scripts/configurar-microsoft-auth.sh"
  exit 1
fi

echo "🔐 Configurando Microsoft Auth en Cloud Run..."
echo "   Proyecto: $PROJECT_ID"
echo "   Región: $REGION"
echo "   Servicio: $SERVICE_NAME"
echo ""

# Verificar que gcloud está instalado
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI no está instalado"
    echo "   Instala gcloud desde: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Configurar proyecto
echo "📋 Configurando proyecto..."
gcloud config set project $PROJECT_ID

# Actualizar variables de entorno
echo "🔄 Actualizando variables de entorno..."
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --update-env-vars="MICROSOFT_CLIENT_ID=$MICROSOFT_CLIENT_ID,MICROSOFT_CLIENT_SECRET=$MICROSOFT_CLIENT_SECRET,MICROSOFT_TENANT_ID=$MICROSOFT_TENANT_ID,FRONTEND_URL=$FRONTEND_URL" \
  --quiet

echo ""
echo "✅ Variables de entorno configuradas exitosamente!"
echo ""
echo "📝 Variables configuradas:"
echo "   - MICROSOFT_CLIENT_ID: $MICROSOFT_CLIENT_ID"
echo "   - MICROSOFT_CLIENT_SECRET: [oculto]"
echo "   - MICROSOFT_TENANT_ID: $MICROSOFT_TENANT_ID"
echo "   - FRONTEND_URL: $FRONTEND_URL"
echo ""
echo "🔄 El servicio se está actualizando. Esto puede tomar unos minutos."
echo "   Verifica el estado con:"
echo "   gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.conditions[0].status)'"
echo ""
echo "📚 Para ver los logs después del despliegue:"
echo "   gcloud run services logs read $SERVICE_NAME --region=$REGION --limit=50"
echo ""
echo "⚠️  IMPORTANTE: Asegúrate de que el Client Secret esté guardado de forma segura."
echo "   Si necesitas rotarlo, crea uno nuevo en Azure Portal y actualiza esta variable."
