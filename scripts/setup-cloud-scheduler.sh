#!/bin/bash
# Setup Cloud Scheduler for warm-up during business hours (07:00-23:00 Chile time)
# This reduces cold starts while saving costs outside business hours

set -e

PROJECT_ID="${GCP_PROJECT_ID:-unigrc-m}"
REGION="southamerica-west1"
BACKEND_URL="https://unigrc-backend-524018293934.southamerica-west1.run.app"
TIMEZONE="America/Santiago"

echo "🕐 Configurando Cloud Scheduler para horario laboral..."
echo "   Proyecto: $PROJECT_ID"
echo "   Región: $REGION"
echo "   Zona horaria: $TIMEZONE"
echo ""

# Enable Cloud Scheduler API if not enabled
echo "1️⃣ Habilitando Cloud Scheduler API..."
gcloud services enable cloudscheduler.googleapis.com --project=$PROJECT_ID

# Create service account for scheduler (if not exists)
SA_NAME="cloud-scheduler-invoker"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "2️⃣ Creando service account para scheduler..."
gcloud iam service-accounts create $SA_NAME \
  --display-name="Cloud Scheduler Invoker" \
  --project=$PROJECT_ID 2>/dev/null || echo "   Service account ya existe"

# Grant Cloud Run invoker role
echo "3️⃣ Otorgando permisos de invocación..."
gcloud run services add-iam-policy-binding unigrc-backend \
  --region=$REGION \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.invoker" \
  --project=$PROJECT_ID 2>/dev/null || echo "   Permisos ya otorgados"

# ============================================
# OPCIÓN A: Ping cada 2 minutos durante horario laboral
# (Mantiene instancia caliente sin cambiar min-instances)
# ============================================

echo ""
echo "4️⃣ Creando jobs de warm-up (ping cada 2 min de 07:00-23:00)..."

# Delete existing jobs if they exist
gcloud scheduler jobs delete warm-up-morning --location=$REGION --project=$PROJECT_ID --quiet 2>/dev/null || true
gcloud scheduler jobs delete warm-up-afternoon --location=$REGION --project=$PROJECT_ID --quiet 2>/dev/null || true
gcloud scheduler jobs delete warm-up-business-hours --location=$REGION --project=$PROJECT_ID --quiet 2>/dev/null || true

# Create warm-up job (every 2 minutes from 07:00-23:00, Monday-Sunday)
gcloud scheduler jobs create http warm-up-business-hours \
  --location=$REGION \
  --schedule="*/2 7-22 * * *" \
  --uri="${BACKEND_URL}/api/health" \
  --http-method=GET \
  --time-zone=$TIMEZONE \
  --attempt-deadline=30s \
  --description="Mantiene backend caliente durante horario laboral (07:00-23:00)" \
  --project=$PROJECT_ID

echo "   ✅ Job 'warm-up-business-hours' creado (cada 2 min, 07:00-22:59)"

# ============================================
# OPCIÓN B: Escalar min-instances dinámicamente
# (Más agresivo, garantiza 0 cold starts en horario laboral)
# ============================================

echo ""
echo "5️⃣ Creando jobs para escalar min-instances..."

# Delete existing scaling jobs if they exist
gcloud scheduler jobs delete scale-up-morning --location=$REGION --project=$PROJECT_ID --quiet 2>/dev/null || true
gcloud scheduler jobs delete scale-down-night --location=$REGION --project=$PROJECT_ID --quiet 2>/dev/null || true

# Scale UP at 07:00 (set min-instances=1)
gcloud scheduler jobs create http scale-up-morning \
  --location=$REGION \
  --schedule="0 7 * * *" \
  --uri="https://run.googleapis.com/v2/projects/${PROJECT_ID}/locations/${REGION}/services/unigrc-backend?updateMask=scaling.minInstanceCount" \
  --http-method=PATCH \
  --headers="Content-Type=application/json" \
  --message-body='{"scaling":{"minInstanceCount":1}}' \
  --oauth-service-account-email="${SA_EMAIL}" \
  --time-zone=$TIMEZONE \
  --attempt-deadline=60s \
  --description="Escala a min-instances=1 a las 07:00" \
  --project=$PROJECT_ID 2>/dev/null || echo "   ⚠️ Job scale-up requiere permisos adicionales (ver abajo)"

# Scale DOWN at 23:00 (set min-instances=0)
gcloud scheduler jobs create http scale-down-night \
  --location=$REGION \
  --schedule="0 23 * * *" \
  --uri="https://run.googleapis.com/v2/projects/${PROJECT_ID}/locations/${REGION}/services/unigrc-backend?updateMask=scaling.minInstanceCount" \
  --http-method=PATCH \
  --headers="Content-Type=application/json" \
  --message-body='{"scaling":{"minInstanceCount":0}}' \
  --oauth-service-account-email="${SA_EMAIL}" \
  --time-zone=$TIMEZONE \
  --attempt-deadline=60s \
  --description="Escala a min-instances=0 a las 23:00" \
  --project=$PROJECT_ID 2>/dev/null || echo "   ⚠️ Job scale-down requiere permisos adicionales (ver abajo)"

# Grant Cloud Run Admin role for scaling (needed for OPTION B)
echo ""
echo "6️⃣ Otorgando permisos de administración de Cloud Run..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.admin" 2>/dev/null || echo "   Permisos ya otorgados"

echo ""
echo "============================================"
echo "✅ Configuración completada!"
echo "============================================"
echo ""
echo "📋 RESUMEN DE JOBS CREADOS:"
echo ""
echo "   1. warm-up-business-hours"
echo "      - Cada 2 minutos de 07:00-22:59"
echo "      - Hace ping a /api/health"
echo "      - Mantiene instancia caliente"
echo ""
echo "   2. scale-up-morning (OPCIONAL)"
echo "      - A las 07:00"
echo "      - Escala min-instances a 1"
echo ""
echo "   3. scale-down-night (OPCIONAL)"
echo "      - A las 23:00"
echo "      - Escala min-instances a 0"
echo ""
echo "💰 AHORRO ESTIMADO:"
echo "   - Horario actual (min-instances=1, 24h): ~\$137/mes"
echo "   - Con scheduler (16h activo, 8h apagado): ~\$91/mes"
echo "   - Ahorro: ~\$46/mes (~33%)"
echo ""
echo "🔧 PARA ACTIVAR ESCALADO DINÁMICO:"
echo "   1. Cambiar min-instances a 0 en cloudbuild-backend.yaml"
echo "   2. Ejecutar: gcloud run services update unigrc-backend --min-instances=0 --region=$REGION"
echo ""
echo "📊 VERIFICAR JOBS:"
echo "   gcloud scheduler jobs list --location=$REGION --project=$PROJECT_ID"
echo ""
echo "🧪 PROBAR JOB MANUALMENTE:"
echo "   gcloud scheduler jobs run warm-up-business-hours --location=$REGION --project=$PROJECT_ID"
echo ""
