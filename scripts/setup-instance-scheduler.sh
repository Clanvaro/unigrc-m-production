#!/bin/bash
# =====================================================
# Configurar Cloud Scheduler para min-instances dinámico
# 
# Horario:
#   07:00 Chile → min-instances=1 (día laboral)
#   23:00 Chile → min-instances=0 (noche, ahorro)
#
# Zona horaria: America/Santiago
# =====================================================

set -e

PROJECT_ID="${PROJECT_ID:-unigrc-m}"
REGION="${REGION:-southamerica-west1}"
SERVICE_NAME="${SERVICE_NAME:-unigrc-backend}"
TIMEZONE="America/Santiago"

echo "🔧 Configurando Cloud Scheduler para min-instances dinámico"
echo "   Proyecto: $PROJECT_ID"
echo "   Región: $REGION"
echo "   Servicio: $SERVICE_NAME"
echo "   Timezone: $TIMEZONE"
echo ""

# Verificar que gcloud está configurado
if ! gcloud projects describe $PROJECT_ID &>/dev/null; then
  echo "❌ Error: No se puede acceder al proyecto $PROJECT_ID"
  echo "   Ejecuta: gcloud config set project $PROJECT_ID"
  exit 1
fi

# Habilitar APIs necesarias
echo "📦 Habilitando APIs necesarias..."
gcloud services enable cloudscheduler.googleapis.com --project=$PROJECT_ID 2>/dev/null || true
gcloud services enable run.googleapis.com --project=$PROJECT_ID 2>/dev/null || true

# Obtener el service account de Cloud Run
SERVICE_ACCOUNT=$(gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="value(spec.template.spec.serviceAccountName)" 2>/dev/null || echo "")

if [ -z "$SERVICE_ACCOUNT" ]; then
  # Usar el compute service account por defecto
  PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
  SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
fi

echo "   Service Account: $SERVICE_ACCOUNT"
echo ""

# =====================================================
# Job 1: Activar instancia mínima a las 07:00
# =====================================================
echo "📅 Creando job para 07:00 (min-instances=1)..."

# Eliminar job existente si existe
gcloud scheduler jobs delete instance-scale-up-morning \
  --location=$REGION \
  --project=$PROJECT_ID \
  --quiet 2>/dev/null || true

# Crear job que ejecuta gcloud run services update
# Usamos un Cloud Function o directamente el API de Cloud Run
gcloud scheduler jobs create http instance-scale-up-morning \
  --project=$PROJECT_ID \
  --location=$REGION \
  --schedule="0 7 * * *" \
  --time-zone="$TIMEZONE" \
  --uri="https://run.googleapis.com/v2/projects/$PROJECT_ID/locations/$REGION/services/$SERVICE_NAME?updateMask=template.scaling.minInstanceCount" \
  --http-method=PATCH \
  --headers="Content-Type=application/json" \
  --message-body='{"template":{"scaling":{"minInstanceCount":1}}}' \
  --oauth-service-account-email="$SERVICE_ACCOUNT" \
  --description="Escalar a min-instances=1 a las 07:00 Chile" \
  --attempt-deadline="60s"

echo "   ✅ Job 'instance-scale-up-morning' creado (07:00 → min=1)"

# =====================================================
# Job 2: Reducir a 0 instancias a las 23:00
# =====================================================
echo "📅 Creando job para 23:00 (min-instances=0)..."

# Eliminar job existente si existe
gcloud scheduler jobs delete instance-scale-down-night \
  --location=$REGION \
  --project=$PROJECT_ID \
  --quiet 2>/dev/null || true

gcloud scheduler jobs create http instance-scale-down-night \
  --project=$PROJECT_ID \
  --location=$REGION \
  --schedule="0 23 * * *" \
  --time-zone="$TIMEZONE" \
  --uri="https://run.googleapis.com/v2/projects/$PROJECT_ID/locations/$REGION/services/$SERVICE_NAME?updateMask=template.scaling.minInstanceCount" \
  --http-method=PATCH \
  --headers="Content-Type=application/json" \
  --message-body='{"template":{"scaling":{"minInstanceCount":0}}}' \
  --oauth-service-account-email="$SERVICE_ACCOUNT" \
  --description="Escalar a min-instances=0 a las 23:00 Chile" \
  --attempt-deadline="60s"

echo "   ✅ Job 'instance-scale-down-night' creado (23:00 → min=0)"

# =====================================================
# Job 3: Warm-up a las 07:05 (después de escalar)
# =====================================================
echo "📅 Creando job de warm-up para 07:05..."

# Eliminar job existente si existe
gcloud scheduler jobs delete backend-warmup-morning \
  --location=$REGION \
  --project=$PROJECT_ID \
  --quiet 2>/dev/null || true

BACKEND_URL="https://unigrc-backend-7joma3s3xa-tl.a.run.app"

gcloud scheduler jobs create http backend-warmup-morning \
  --project=$PROJECT_ID \
  --location=$REGION \
  --schedule="5 7 * * *" \
  --time-zone="$TIMEZONE" \
  --uri="${BACKEND_URL}/api/warmup" \
  --http-method=GET \
  --description="Warm-up del backend a las 07:05 Chile (después de escalar)" \
  --attempt-deadline="120s" \
  --oidc-service-account-email="$SERVICE_ACCOUNT" \
  --oidc-token-audience="$BACKEND_URL"

echo "   ✅ Job 'backend-warmup-morning' creado (07:05 → warm-up)"

# =====================================================
# Resumen
# =====================================================
echo ""
echo "=========================================="
echo "✅ Cloud Scheduler configurado exitosamente"
echo "=========================================="
echo ""
echo "Jobs creados:"
gcloud scheduler jobs list --location=$REGION --project=$PROJECT_ID --format="table(name,schedule,timeZone,state)"
echo ""
echo "📋 Horario:"
echo "   07:00 Chile → min-instances=1 (instancia activa)"
echo "   07:05 Chile → warm-up (pre-calentar conexiones)"
echo "   23:00 Chile → min-instances=0 (ahorro nocturno)"
echo ""
echo "💰 Ahorro estimado:"
echo "   8 horas/noche × 30 días = 240 horas/mes sin instancia"
echo "   ~\$30-50/mes de ahorro"
echo ""
echo "🧪 Para probar manualmente:"
echo "   gcloud scheduler jobs run instance-scale-up-morning --location=$REGION"
echo "   gcloud scheduler jobs run instance-scale-down-night --location=$REGION"
echo "   gcloud scheduler jobs run backend-warmup-morning --location=$REGION"
