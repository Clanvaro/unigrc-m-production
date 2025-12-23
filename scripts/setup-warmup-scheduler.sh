#!/bin/bash

# Script para configurar Cloud Scheduler que hace warm-up de Cloud Run
# Esto activa instancias antes de horarios pico para evitar cold starts
# Mantiene min-instances=0 para reducir costos

set -e

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuración
PROJECT_ID="${GCP_PROJECT_ID:-unigrc-m}"
REGION="${GCP_REGION:-southamerica-west1}"
SERVICE_NAME="${CLOUD_RUN_SERVICE:-unigrc-backend}"
WARMUP_URL="https://${SERVICE_NAME}-524018293934.${REGION}.run.app/api/warmup"

echo -e "${GREEN}🔥 Configurando Cloud Scheduler para warm-up de Cloud Run${NC}\n"

# Verificar que gcloud está configurado
if ! gcloud config get-value project &>/dev/null; then
  echo -e "${RED}❌ Error: gcloud no está configurado. Ejecuta: gcloud auth login${NC}"
  exit 1
fi

# Verificar que el servicio de Cloud Run existe
echo -e "${YELLOW}📋 Verificando servicio de Cloud Run...${NC}"
if ! gcloud run services describe "${SERVICE_NAME}" --region="${REGION}" &>/dev/null; then
  echo -e "${RED}❌ Error: Servicio ${SERVICE_NAME} no encontrado en ${REGION}${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Servicio encontrado${NC}\n"

# Crear job para las 07:00 (horario de inicio laboral)
echo -e "${YELLOW}⏰ Creando job para 07:00 (inicio laboral)...${NC}"
gcloud scheduler jobs create http "${SERVICE_NAME}-warmup-0700" \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --schedule="0 7 * * *" \
  --time-zone="America/Santiago" \
  --uri="${WARMUP_URL}" \
  --http-method=GET \
  --description="Warm-up Cloud Run antes de inicio laboral (07:00)" \
  --attempt-deadline=60s \
  --max-retry-attempts=2 \
  --max-retry-duration=30s \
  --min-backoff-duration=10s \
  --max-backoff-duration=30s \
  || echo -e "${YELLOW}⚠️  Job 07:00 ya existe, actualizando...${NC}" && \
     gcloud scheduler jobs update http "${SERVICE_NAME}-warmup-0700" \
       --project="${PROJECT_ID}" \
       --location="${REGION}" \
       --schedule="0 7 * * *" \
       --time-zone="America/Santiago" \
       --uri="${WARMUP_URL}" \
       --http-method=GET \
       --description="Warm-up Cloud Run antes de inicio laboral (07:00)" \
       --attempt-deadline=60s \
       --max-retry-attempts=2

echo -e "${GREEN}✅ Job 07:00 configurado${NC}\n"

# Crear job para las 23:00 (antes de horario nocturno)
echo -e "${YELLOW}⏰ Creando job para 23:00 (horario nocturno)...${NC}"
gcloud scheduler jobs create http "${SERVICE_NAME}-warmup-2300" \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --schedule="0 23 * * *" \
  --time-zone="America/Santiago" \
  --uri="${WARMUP_URL}" \
  --http-method=GET \
  --description="Warm-up Cloud Run antes de horario nocturno (23:00)" \
  --attempt-deadline=60s \
  --max-retry-attempts=2 \
  --max-retry-duration=30s \
  --min-backoff-duration=10s \
  --max-backoff-duration=30s \
  || echo -e "${YELLOW}⚠️  Job 23:00 ya existe, actualizando...${NC}" && \
     gcloud scheduler jobs update http "${SERVICE_NAME}-warmup-2300" \
       --project="${PROJECT_ID}" \
       --location="${REGION}" \
       --schedule="0 23 * * *" \
       --time-zone="America/Santiago" \
       --uri="${WARMUP_URL}" \
       --http-method=GET \
       --description="Warm-up Cloud Run antes de horario nocturno (23:00)" \
       --attempt-deadline=60s \
       --max-retry-attempts=2

echo -e "${GREEN}✅ Job 23:00 configurado${NC}\n"

# Listar jobs creados
echo -e "${GREEN}📋 Jobs de warm-up configurados:${NC}"
gcloud scheduler jobs list --project="${PROJECT_ID}" --location="${REGION}" \
  --filter="name:${SERVICE_NAME}-warmup*" \
  --format="table(name,schedule,state,timeZone)"

echo -e "\n${GREEN}✅ Configuración completada${NC}\n"
echo -e "${YELLOW}💡 Notas:${NC}"
echo -e "   • Los jobs ejecutarán warm-up automáticamente a las 07:00 y 23:00"
echo -e "   • Esto activará instancias de Cloud Run antes de horarios pico"
echo -e "   • Con min-instances=0, las instancias se escalarán a cero cuando no haya tráfico"
echo -e "   • Costo: ~\$0.10 por mes por job (2 jobs = ~\$0.20/mes)"
echo -e "\n${YELLOW}🔍 Para probar manualmente:${NC}"
echo -e "   curl ${WARMUP_URL}"
echo -e "\n${YELLOW}📊 Para ver logs:${NC}"
echo -e "   gcloud scheduler jobs describe ${SERVICE_NAME}-warmup-0700 --location=${REGION}"
echo -e "   gcloud logging read \"resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE_NAME}\" --limit=50"
