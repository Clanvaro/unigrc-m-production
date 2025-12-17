#!/bin/bash
# Script para verificar que todo funciona correctamente antes de eliminar el servicio Cloud Run frontend
# Usage: ./scripts/verify-before-delete-frontend.sh

set -e

PROJECT_ID=${GCP_PROJECT_ID:-unigrc-m}
REGION=${GCP_REGION:-southamerica-west1}
DOMAIN="cl.unigrc.app"
FRONTEND_SERVICE="unigrc-frontend"
BACKEND_SERVICE="unigrc-backend"
BUCKET_NAME="unigrc-frontend-prod"
URL_MAP_NAME="unigrc-frontend-url-map"

echo "🔍 Verificación previa a eliminar servicio Cloud Run frontend"
echo "============================================================"
echo ""
echo "Proyecto: $PROJECT_ID"
echo "Región: $REGION"
echo "Dominio: $DOMAIN"
echo ""

ERRORS=0
WARNINGS=0

# Función para reportar errores
report_error() {
    echo "❌ ERROR: $1"
    ERRORS=$((ERRORS + 1))
}

# Función para reportar advertencias
report_warning() {
    echo "⚠️  ADVERTENCIA: $1"
    WARNINGS=$((WARNINGS + 1))
}

# Función para reportar éxito
report_success() {
    echo "✅ $1"
}

echo "1️⃣  Verificando que el sitio funciona desde Cloud Storage..."
echo "------------------------------------------------------------"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" 2>&1 || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    report_success "El sitio responde correctamente (HTTP $HTTP_CODE)"
else
    report_error "El sitio no responde correctamente (HTTP $HTTP_CODE)"
fi
echo ""

echo "2️⃣  Verificando certificado SSL..."
echo "-----------------------------------"
SSL_STATUS=$(gcloud compute ssl-certificates describe cl-unigrc-app-ssl-cert \
  --global \
  --format="value(managed.status)" \
  --project=$PROJECT_ID 2>&1 || echo "ERROR")
if [ "$SSL_STATUS" = "ACTIVE" ]; then
    report_success "Certificado SSL está ACTIVO"
else
    report_error "Certificado SSL no está ACTIVO (Estado: $SSL_STATUS)"
fi
echo ""

echo "3️⃣  Verificando configuración del Load Balancer..."
echo "---------------------------------------------------"
DEFAULT_BACKEND=$(gcloud compute url-maps describe $URL_MAP_NAME \
  --global \
  --format="get(defaultService)" \
  --project=$PROJECT_ID 2>&1 || echo "ERROR")
if echo "$DEFAULT_BACKEND" | grep -q "backendBuckets"; then
    report_success "Load Balancer apunta al backend bucket (Cloud Storage)"
    echo "   Backend: $DEFAULT_BACKEND"
else
    report_error "Load Balancer NO apunta al backend bucket"
    echo "   Backend actual: $DEFAULT_BACKEND"
fi
echo ""

echo "4️⃣  Verificando path matcher para /api/**..."
echo "--------------------------------------------"
PATH_MATCHER=$(gcloud compute url-maps describe $URL_MAP_NAME \
  --global \
  --format="get(pathMatchers[0].pathRules[0].service)" \
  --project=$PROJECT_ID 2>&1 || echo "ERROR")
if echo "$PATH_MATCHER" | grep -q "backendServices"; then
    report_success "Path matcher /api/** apunta al backend service (Cloud Run backend)"
    echo "   Service: $PATH_MATCHER"
else
    report_warning "Path matcher /api/** no está configurado correctamente"
    echo "   Service actual: $PATH_MATCHER"
fi
echo ""

echo "5️⃣  Verificando que la API funciona..."
echo "--------------------------------------"
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/api/auth/user" 2>&1 || echo "000")
if [ "$API_CODE" = "200" ] || [ "$API_CODE" = "401" ] || [ "$API_CODE" = "403" ]; then
    report_success "La API responde correctamente (HTTP $API_CODE - esperado sin autenticación)"
else
    report_error "La API no responde correctamente (HTTP $API_CODE)"
fi
echo ""

echo "6️⃣  Verificando contenido del bucket de Cloud Storage..."
echo "--------------------------------------------------------"
if gsutil ls "gs://$BUCKET_NAME/index.html" &>/dev/null; then
    report_success "El archivo index.html existe en el bucket"
    
    # Verificar que hay archivos en assets/
    ASSET_COUNT=$(gsutil ls "gs://$BUCKET_NAME/assets/*.js" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$ASSET_COUNT" -gt 0 ]; then
        report_success "Hay $ASSET_COUNT archivos JS en assets/"
    else
        report_warning "No se encontraron archivos JS en assets/"
    fi
else
    report_error "El archivo index.html NO existe en el bucket"
fi
echo ""

echo "7️⃣  Verificando que el servicio Cloud Run frontend existe..."
echo "------------------------------------------------------------"
if gcloud run services describe $FRONTEND_SERVICE \
  --region=$REGION \
  --project=$PROJECT_ID &>/dev/null; then
    report_warning "El servicio Cloud Run '$FRONTEND_SERVICE' todavía existe"
    
    # Verificar min-instances
    MIN_INSTANCES=$(gcloud run services describe $FRONTEND_SERVICE \
      --region=$REGION \
      --format="get(spec.template.metadata.annotations['autoscaling.knative.dev/minScale'])" \
      --project=$PROJECT_ID 2>&1 || echo "0")
    
    if [ "$MIN_INSTANCES" != "0" ] && [ -n "$MIN_INSTANCES" ]; then
        report_warning "El servicio tiene min-instances=$MIN_INSTANCES (generando costos)"
    else
        report_success "El servicio tiene min-instances=0 (no genera costos por instancias mínimas)"
    fi
    
    # Verificar última actualización
    LAST_UPDATE=$(gcloud run services describe $FRONTEND_SERVICE \
      --region=$REGION \
      --format="get(status.conditions[0].lastTransitionTime)" \
      --project=$PROJECT_ID 2>&1 || echo "unknown")
    echo "   Última actualización: $LAST_UPDATE"
else
    report_success "El servicio Cloud Run '$FRONTEND_SERVICE' ya no existe (ya fue eliminado)"
fi
echo ""

echo "8️⃣  Verificando que el backend service está configurado..."
echo "----------------------------------------------------------"
if gcloud compute backend-services describe unigrc-backend-service \
  --global \
  --project=$PROJECT_ID &>/dev/null; then
    report_success "El backend service 'unigrc-backend-service' existe"
    
    # Verificar que tiene backends
    BACKEND_COUNT=$(gcloud compute backend-services describe unigrc-backend-service \
      --global \
      --format="get(backends)" \
      --project=$PROJECT_ID 2>&1 | grep -o "networkEndpointGroup" | wc -l | tr -d ' ')
    if [ "$BACKEND_COUNT" -gt 0 ]; then
        report_success "El backend service tiene $BACKEND_COUNT backend(s) configurado(s)"
    else
        report_error "El backend service NO tiene backends configurados"
    fi
else
    report_error "El backend service 'unigrc-backend-service' NO existe"
fi
echo ""

echo "9️⃣  Verificando que el servicio Cloud Run backend está funcionando..."
echo "---------------------------------------------------------------------"
if gcloud run services describe $BACKEND_SERVICE \
  --region=$REGION \
  --project=$PROJECT_ID &>/dev/null; then
    BACKEND_STATUS=$(gcloud run services describe $BACKEND_SERVICE \
      --region=$REGION \
      --format="get(status.conditions[0].status)" \
      --project=$PROJECT_ID 2>&1 || echo "False")
    if [ "$BACKEND_STATUS" = "True" ]; then
        report_success "El servicio Cloud Run backend está funcionando"
    else
        report_error "El servicio Cloud Run backend NO está funcionando (Status: $BACKEND_STATUS)"
    fi
else
    report_error "El servicio Cloud Run backend NO existe"
fi
echo ""

echo "🔟 Verificando DNS..."
echo "---------------------"
DNS_IP=$(dig +short $DOMAIN 2>&1 | head -1)
EXPECTED_IP=$(gcloud compute forwarding-rules describe unigrc-frontend-https-rule \
  --global \
  --format="value(IPAddress)" \
  --project=$PROJECT_ID 2>&1 || echo "unknown")
if [ "$DNS_IP" = "$EXPECTED_IP" ]; then
    report_success "DNS apunta correctamente al Load Balancer ($DNS_IP)"
else
    report_warning "DNS puede no estar apuntando correctamente"
    echo "   DNS actual: $DNS_IP"
    echo "   IP esperada: $EXPECTED_IP"
fi
echo ""

echo "============================================================"
echo "📊 RESUMEN DE VERIFICACIÓN"
echo "============================================================"
echo ""
echo "✅ Éxitos: $((10 - ERRORS - WARNINGS))"
echo "⚠️  Advertencias: $WARNINGS"
echo "❌ Errores: $ERRORS"
echo ""

if [ $ERRORS -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo "✅ TODO ESTÁ CORRECTO"
        echo ""
        echo "Puedes eliminar el servicio Cloud Run frontend de forma segura:"
        echo ""
        echo "   gcloud run services delete $FRONTEND_SERVICE \\"
        echo "     --region=$REGION \\"
        echo "     --project=$PROJECT_ID"
        echo ""
        exit 0
    else
        echo "⚠️  HAY ADVERTENCIAS"
        echo ""
        echo "Revisa las advertencias antes de eliminar el servicio."
        echo "Si todo funciona correctamente, puedes proceder con la eliminación."
        echo ""
        exit 0
    fi
else
    echo "❌ HAY ERRORES"
    echo ""
    echo "NO debes eliminar el servicio hasta que se corrijan los errores."
    echo "Revisa los errores arriba y corrígelos antes de continuar."
    echo ""
    exit 1
fi

