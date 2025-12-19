#!/bin/bash
# Script para analizar top waits de Cloud SQL
# Identifica cuellos de botella de conexión, lock waits, I/O waits

set -e

# Configuración
PROJECT_ID="${GCP_PROJECT_ID:-unigrc-m}"
INSTANCE_ID="${CLOUDSQL_INSTANCE_ID:-unigrc-db}"
REGION="${GCP_REGION:-southamerica-west1}"

echo "🔍 Analizando Top Waits para Cloud SQL: ${INSTANCE_ID}"
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

# Obtener métricas de las últimas 24 horas
START_TIME=$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ)
END_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)

echo "📈 Consultando métricas de wait events..."
echo ""

# Lock waits (bloqueos)
echo "🔒 Lock Waits (bloqueos):"
gcloud monitoring time-series list \
  --project="${PROJECT_ID}" \
  --filter="resource.type=cloudsql_database AND resource.labels.database_id=${PROJECT_ID}:${INSTANCE_ID} AND metric.type=\"database/postgresql/insights/lock_waits\"" \
  --format="table(metric.labels.query, value.doubleValue)" \
  --start-time="${START_TIME}" \
  --end-time="${END_TIME}" \
  2>/dev/null || echo "⚠️ No hay datos de lock waits disponibles"

echo ""

# I/O waits (lectura/escritura)
echo "💾 I/O Waits (lectura/escritura):"
gcloud monitoring time-series list \
  --project="${PROJECT_ID}" \
  --filter="resource.type=cloudsql_database AND resource.labels.database_id=${PROJECT_ID}:${INSTANCE_ID} AND (metric.type=\"database/postgresql/insights/blk_read_time\" OR metric.type=\"database/postgresql/insights/blk_write_time\")" \
  --format="table(metric.type, metric.labels.query, value.doubleValue)" \
  --start-time="${START_TIME}" \
  --end-time="${END_TIME}" \
  2>/dev/null || echo "⚠️ No hay datos de I/O waits disponibles"

echo ""

# Connection waits (espera de conexión)
echo "🔌 Connection Waits (espera de conexión):"
gcloud monitoring time-series list \
  --project="${PROJECT_ID}" \
  --filter="resource.type=cloudsql_database AND resource.labels.database_id=${PROJECT_ID}:${INSTANCE_ID} AND metric.type=\"database/postgresql/num_backends\"" \
  --format="table(metric.labels.database, value.int64Value, interval.endTime)" \
  --start-time="${START_TIME}" \
  --end-time="${END_TIME}" \
  2>/dev/null || echo "⚠️ No hay datos de connection waits disponibles"

echo ""

# CPU waits (si aplica)
echo "⚡ CPU Waits:"
gcloud monitoring time-series list \
  --project="${PROJECT_ID}" \
  --filter="resource.type=cloudsql_database AND resource.labels.database_id=${PROJECT_ID}:${INSTANCE_ID} AND metric.type=\"database/cpu/utilization\"" \
  --format="table(value.doubleValue, interval.endTime)" \
  --start-time="${START_TIME}" \
  --end-time="${END_TIME}" \
  2>/dev/null || echo "⚠️ No hay datos de CPU waits disponibles"

echo ""
echo "💡 Interpretación:"
echo "   - Lock waits altos: queries bloqueando otras queries"
echo "   - I/O waits altos: problemas de lectura/escritura en disco"
echo "   - Connection waits: pool de conexiones saturado"
echo "   - CPU waits: instancia sobrecargada"
echo ""
echo "✅ Análisis completado"
