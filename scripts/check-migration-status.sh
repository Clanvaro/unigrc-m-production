#!/bin/bash
# Script para monitorear el estado de la migración DNS y certificado SSL
# Usage: ./scripts/check-migration-status.sh

set -e

PROJECT_ID=${GCP_PROJECT_ID:-unigrc-m}
EXPECTED_IP="34.54.125.2"

echo "🔍 Verificando estado de la migración..."
echo ""

# Verificar DNS
echo "1️⃣  Verificando DNS..."
DNS_IP=$(dig +short cl.unigrc.app 2>&1 | head -1)
if [ "$DNS_IP" = "$EXPECTED_IP" ]; then
  echo "   ✅ DNS propagado correctamente: $DNS_IP"
else
  echo "   ⏳ DNS aún propagándose o apunta a: $DNS_IP"
  echo "   Esperado: $EXPECTED_IP"
fi
echo ""

# Verificar certificado SSL
echo "2️⃣  Verificando certificado SSL..."
CERT_STATUS=$(gcloud compute ssl-certificates describe cl-unigrc-app-ssl-cert \
  --global \
  --format="value(managed.status)" \
  --project=$PROJECT_ID 2>&1)

CERT_DOMAIN_STATUS=$(gcloud compute ssl-certificates describe cl-unigrc-app-ssl-cert \
  --global \
  --format="get(managed.domains[0].status)" \
  --project=$PROJECT_ID 2>&1)

echo "   Estado general: $CERT_STATUS"
echo "   Estado dominio: $CERT_DOMAIN_STATUS"

if [ "$CERT_STATUS" = "ACTIVE" ]; then
  echo "   ✅ Certificado ACTIVO - HTTPS debería funcionar"
elif [ "$CERT_DOMAIN_STATUS" = "ACTIVE" ]; then
  echo "   ✅ Dominio ACTIVO - El certificado se está activando"
elif [ "$CERT_DOMAIN_STATUS" = "PROVISIONING" ]; then
  echo "   ⏳ Certificado en proceso de activación (normal)"
elif [ "$CERT_DOMAIN_STATUS" = "FAILED_NOT_VISIBLE" ]; then
  echo "   ⚠️  Google aún no puede ver el dominio"
  echo "   Verifica que el DNS apunta correctamente"
else
  echo "   ⏳ Google está verificando el dominio"
fi
echo ""

# Verificar Load Balancer
echo "3️⃣  Verificando Load Balancer..."
LB_IP=$(gcloud compute forwarding-rules describe unigrc-frontend-https-rule \
  --global \
  --format="value(IPAddress)" \
  --project=$PROJECT_ID 2>&1)

if [ ! -z "$LB_IP" ] && [ "$LB_IP" != "ERROR" ]; then
  echo "   ✅ Load Balancer IP: $LB_IP"
else
  echo "   ⚠️  No se pudo obtener IP del Load Balancer"
fi
echo ""

# Probar acceso HTTP
echo "4️⃣  Probando acceso HTTP..."
HTTP_TEST=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: cl.unigrc.app" http://$EXPECTED_IP 2>&1 || echo "000")
if [ "$HTTP_TEST" = "200" ] || [ "$HTTP_TEST" = "301" ] || [ "$HTTP_TEST" = "302" ]; then
  echo "   ✅ Load Balancer responde (HTTP $HTTP_TEST)"
else
  echo "   ⏳ Load Balancer aún configurándose o requiere HTTPS"
fi
echo ""

# Resumen
echo "📊 Resumen:"
if [ "$DNS_IP" = "$EXPECTED_IP" ] && [ "$CERT_STATUS" = "ACTIVE" ]; then
  echo "   ✅ Migración completa - Todo funcionando"
  echo "   🌐 Prueba: https://cl.unigrc.app"
elif [ "$DNS_IP" = "$EXPECTED_IP" ]; then
  echo "   ⏳ DNS propagado - Esperando activación del certificado SSL"
  echo "   El certificado puede tardar 10-60 minutos en activarse"
else
  echo "   ⏳ Esperando propagación DNS"
fi
echo ""
echo "💡 Ejecuta este script periódicamente para monitorear el progreso:"
echo "   ./scripts/check-migration-status.sh"

