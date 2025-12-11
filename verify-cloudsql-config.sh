#!/bin/bash
# Script para verificar la configuración de Cloud SQL en Cloud Run

echo "🔍 Verificando configuración de Cloud SQL para unigrc-backend..."
echo ""

# Verificar la configuración actual del servicio (se almacena como anotación)
echo "📋 Instancias de Cloud SQL configuradas:"
CLOUDSQL_INSTANCES=$(gcloud run services describe unigrc-backend \
  --region=southamerica-west1 \
  --format="value(spec.template.metadata.annotations['run.googleapis.com/cloudsql-instances'])" 2>/dev/null)

if [ -z "$CLOUDSQL_INSTANCES" ]; then
  echo "   ⚠️  No se encontró configuración de Cloud SQL"
  echo "   Estado: CONFIGURACIÓN FALTANTE"
else
  echo "   ✅ $CLOUDSQL_INSTANCES"
  echo "   Estado: CONFIGURADO CORRECTAMENTE"
fi

echo ""
echo "📋 Verificación adicional (formato JSON):"
gcloud run services describe unigrc-backend \
  --region=southamerica-west1 \
  --format="json" 2>/dev/null | python3 -c "import sys, json; data = json.load(sys.stdin); print('   Instancias Cloud SQL:', data.get('spec', {}).get('template', {}).get('metadata', {}).get('annotations', {}).get('run.googleapis.com/cloudsql-instances', 'NO CONFIGURADO'))"

echo ""
if [ "$CLOUDSQL_INSTANCES" = "unigrc-m:southamerica-west1:unigrc-db" ]; then
  echo "✅ CONFIGURACIÓN CORRECTA: Unix socket habilitado para Cloud SQL"
  echo "   Esto debería reducir significativamente la latencia de la base de datos."
else
  echo "⚠️  La configuración no coincide con la esperada."
  echo "   Esperado: unigrc-m:southamerica-west1:unigrc-db"
  echo "   Actual: $CLOUDSQL_INSTANCES"
fi
