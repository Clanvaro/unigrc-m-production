#!/bin/bash
# Script para consultar Query Insights de Cloud SQL
# Identifica queries lentas y problemas de rendimiento

set -e

# Configuración
PROJECT_ID="${GCP_PROJECT_ID:-unigrc-m}"
INSTANCE_ID="${CLOUDSQL_INSTANCE_ID:-unigrc-db}"
REGION="${GCP_REGION:-southamerica-west1}"

echo "🔍 Consultando Query Insights para Cloud SQL: ${INSTANCE_ID}"
echo "📊 Proyecto: ${PROJECT_ID}"
echo ""

# Verificar que gcloud esté instalado
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI no está instalado"
    exit 1
fi

# Verificar autenticación
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Error: No hay cuentas autenticadas en gcloud"
    echo "   Ejecuta: gcloud auth login"
    exit 1
fi

# Consultar Query Insights usando Cloud Monitoring API
echo "📈 Consultando métricas de queries desde Cloud Monitoring..."
echo ""

# Obtener métricas de queries lentas (últimas 24 horas)
START_TIME=$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ)
END_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Métrica: database/postgresql/insights/query_time
echo "🔎 Top queries por tiempo total de ejecución:"
gcloud monitoring time-series list \
  --project="${PROJECT_ID}" \
  --filter="resource.type=cloudsql_database AND resource.labels.database_id=${PROJECT_ID}:${INSTANCE_ID} AND metric.type=\"database/postgresql/insights/query_time\"" \
  --format="table(metric.labels.query, value.doubleValue)" \
  --start-time="${START_TIME}" \
  --end-time="${END_TIME}" \
  2>/dev/null || echo "⚠️ No se pudieron obtener métricas de Query Insights (puede requerir habilitación)"

echo ""
echo "📊 Métricas de conexiones:"
echo ""

# Consultar conexiones activas
gcloud monitoring time-series list \
  --project="${PROJECT_ID}" \
  --filter="resource.type=cloudsql_database AND resource.labels.database_id=${PROJECT_ID}:${INSTANCE_ID} AND metric.type=\"database/postgresql/num_backends\"" \
  --format="table(metric.labels.database, value.int64Value, interval.endTime)" \
  --start-time="${START_TIME}" \
  --end-time="${END_TIME}" \
  2>/dev/null || echo "⚠️ No se pudieron obtener métricas de conexiones"

echo ""
echo "💡 Para habilitar Query Insights:"
echo "   1. Ve a Cloud Console > SQL > ${INSTANCE_ID}"
echo "   2. Habilita 'Query Insights' en la sección de Insights"
echo "   3. Espera 5-10 minutos para que se recopilen datos"
echo ""
echo "✅ Análisis completado"
