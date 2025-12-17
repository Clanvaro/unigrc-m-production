#!/bin/bash
# Script para crear Google-managed SSL certificate para cl.unigrc.app
# Usage: ./scripts/setup-ssl-certificate.sh [staging|prod]

set -e

ENVIRONMENT=${1:-prod}
PROJECT_ID=${GCP_PROJECT_ID:-unigrc-m}
CERT_NAME="cl-unigrc-app-ssl-cert"
DOMAIN="cl.unigrc.app"

echo "🔒 Configurando certificado SSL para $DOMAIN"
echo "   Proyecto: $PROJECT_ID"
echo ""

# Verificar que gcloud está instalado
if ! command -v gcloud &> /dev/null; then
  echo "❌ Error: gcloud CLI no está instalado"
  exit 1
fi

# Configurar proyecto
gcloud config set project $PROJECT_ID

# Crear certificado SSL gestionado por Google
echo "📜 Creando certificado SSL gestionado por Google..."
gcloud compute ssl-certificates create $CERT_NAME \
  --domains=$DOMAIN \
  --global \
  --project=$PROJECT_ID 2>/dev/null || echo "   ℹ️  Certificado ya existe"

echo "   ✅ Certificado SSL creado"

# Verificar estado del certificado
echo "🔍 Verificando estado del certificado..."
CERT_STATUS=$(gcloud compute ssl-certificates describe $CERT_NAME \
  --global \
  --format="value(managed.status)" \
  --project=$PROJECT_ID 2>/dev/null || echo "UNKNOWN")

echo "   Estado: $CERT_STATUS"

if [ "$CERT_STATUS" = "ACTIVE" ]; then
  echo "   ✅ Certificado está activo y listo para usar"
elif [ "$CERT_STATUS" = "PROVISIONING" ]; then
  echo "   ⏳ Certificado está siendo provisionado (puede tardar hasta 1 hora)"
  echo "   Verifica el estado con:"
  echo "   gcloud compute ssl-certificates describe $CERT_NAME --global --format=\"value(managed.status)\""
elif [ "$CERT_STATUS" = "FAILED_NOT_VISIBLE" ]; then
  echo "   ❌ Certificado falló - dominio no es visible desde Google"
  echo "   Asegúrate de que el DNS apunta correctamente al Load Balancer"
elif [ "$CERT_STATUS" = "FAILED" ]; then
  echo "   ❌ Certificado falló"
  echo "   Revisa los detalles con:"
  echo "   gcloud compute ssl-certificates describe $CERT_NAME --global"
else
  echo "   ⚠️  Estado desconocido: $CERT_STATUS"
fi

echo ""
echo "📋 Próximos pasos:"
echo "   1. Configurar DNS en GoDaddy para apuntar a la IP del Load Balancer"
echo "   2. Esperar a que el certificado se active (puede tardar hasta 1 hora)"
echo "   3. Asociar certificado al target HTTPS proxy:"
echo "      gcloud compute target-https-proxies update unigrc-frontend-https-proxy \\"
echo "        --ssl-certificates=$CERT_NAME \\"
echo "        --project=$PROJECT_ID"
echo ""
echo "   Para verificar el estado del certificado:"
echo "   gcloud compute ssl-certificates describe $CERT_NAME --global"

