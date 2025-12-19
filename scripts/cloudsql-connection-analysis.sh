#!/bin/bash
# Script para analizar métricas de conexiones de Cloud SQL
# Compara conexiones activas vs máximas y detecta saturación

set -e

# Configuración
PROJECT_ID="${GCP_PROJECT_ID:-unigrc-m}"
INSTANCE_ID="${CLOUDSQL_INSTANCE_ID:-unigrc-db}"
REGION="${GCP_REGION:-southamerica-west1}"

echo "🔍 Analizando conexiones de Cloud SQL: ${INSTANCE_ID}"
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

# Obtener información de la instancia
echo "📋 Información de la instancia:"
INSTANCE_INFO=$(gcloud sql instances describe "${INSTANCE_ID}" \
  --project="${PROJECT_ID}" \
  --format="json" 2>/dev/null)

if [ -z "$INSTANCE_INFO" ]; then
    echo "❌ Error: No se pudo obtener información de la instancia"
    exit 1
fi

MAX_CONNECTIONS=$(echo "$INSTANCE_INFO" | jq -r '.settings.databaseFlags[]? | select(.name=="max_connections") | .value // "100"')
TIER=$(echo "$INSTANCE_INFO" | jq -r '.settings.tier // "unknown"')

echo "   Tier: ${TIER}"
echo "   Max Connections: ${MAX_CONNECTIONS}"
echo ""

# Obtener métricas de conexiones activas (últimas 24 horas)
START_TIME=$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ)
END_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)

echo "📈 Métricas de conexiones (últimas 24 horas):"
echo ""

# Conexiones activas por base de datos
echo "🔌 Conexiones activas por base de datos:"
CONNECTION_DATA=$(gcloud monitoring time-series list \
  --project="${PROJECT_ID}" \
  --filter="resource.type=cloudsql_database AND resource.labels.database_id=${PROJECT_ID}:${INSTANCE_ID} AND metric.type=\"database/postgresql/num_backends\"" \
  --format="json" \
  --start-time="${START_TIME}" \
  --end-time="${END_TIME}" \
  2>/dev/null)

if [ -n "$CONNECTION_DATA" ] && [ "$CONNECTION_DATA" != "[]" ]; then
    echo "$CONNECTION_DATA" | jq -r '.[] | "   \(.metric.labels.database // "unknown"): \(.points[0].value.int64Value // .points[0].value.doubleValue) conexiones activas"'
    
    # Calcular promedio y máximo
    AVG_CONNECTIONS=$(echo "$CONNECTION_DATA" | jq '[.[] | .points[0].value.int64Value // .points[0].value.doubleValue] | add / length')
    MAX_ACTIVE=$(echo "$CONNECTION_DATA" | jq '[.[] | .points[0].value.int64Value // .points[0].value.doubleValue] | max')
    
    echo ""
    echo "   Promedio: $(printf "%.0f" "$AVG_CONNECTIONS") conexiones"
    echo "   Máximo: ${MAX_ACTIVE} conexiones"
    echo "   Utilización: $(printf "%.1f" "$(echo "scale=2; ${MAX_ACTIVE} * 100 / ${MAX_CONNECTIONS}" | bc)")%"
    
    # Detectar saturación
    UTILIZATION_PCT=$(echo "scale=2; ${MAX_ACTIVE} * 100 / ${MAX_CONNECTIONS}" | bc)
    if (( $(echo "$UTILIZATION_PCT > 80" | bc -l) )); then
        echo ""
        echo "⚠️  ADVERTENCIA: Alta utilización de conexiones (${UTILIZATION_PCT}%)"
        echo "   Considera:"
        echo "   - Aumentar max_connections en Cloud SQL"
        echo "   - Optimizar pool de conexiones en la aplicación"
        echo "   - Revisar queries que mantienen conexiones abiertas"
    fi
else
    echo "⚠️ No hay datos de conexiones disponibles"
fi

echo ""
echo "📊 Análisis de pool de conexiones:"
echo ""

# Calcular ratio recomendado
CLOUD_RUN_INSTANCES=5  # Ajustar según configuración real
POOL_MAX_PER_INSTANCE=4  # Valor actual en db.ts
TOTAL_POOL_CONNECTIONS=$((CLOUD_RUN_INSTANCES * POOL_MAX_PER_INSTANCE))

echo "   Instancias Cloud Run estimadas: ${CLOUD_RUN_INSTANCES}"
echo "   Pool max por instancia: ${POOL_MAX_PER_INSTANCE}"
echo "   Total conexiones del pool: ${TOTAL_POOL_CONNECTIONS}"
echo "   Headroom disponible: $((MAX_CONNECTIONS - TOTAL_POOL_CONNECTIONS)) conexiones"
echo ""

if [ $TOTAL_POOL_CONNECTIONS -gt $MAX_CONNECTIONS ]; then
    echo "❌ ERROR: Pool total (${TOTAL_POOL_CONNECTIONS}) excede max_connections (${MAX_CONNECTIONS})"
    echo "   Reduce DB_POOL_MAX o aumenta max_connections en Cloud SQL"
elif [ $((MAX_CONNECTIONS - TOTAL_POOL_CONNECTIONS)) -lt 10 ]; then
    echo "⚠️  ADVERTENCIA: Poco margen de conexiones disponibles"
    echo "   Considera aumentar max_connections o reducir DB_POOL_MAX"
else
    echo "✅ Pool configurado correctamente con margen adecuado"
fi

echo ""
echo "✅ Análisis completado"
