#!/bin/bash
# Script para verificar el estado actual de la infraestructura
# Uso: ./scripts/check-infrastructure.sh

set -e

PROJECT_ID="${GCP_PROJECT_ID:-unigrc-m}"
REGION="${GCP_REGION:-southamerica-west1}"

echo "🔍 Verificando estado de infraestructura..."
echo ""

# 1. Verificar Cloud SQL
echo "📊 Cloud SQL:"
if gcloud sql instances describe unigrc-db --project="$PROJECT_ID" &>/dev/null; then
  echo "   ✅ Instancia 'unigrc-db' existe"
  
  # Verificar Private IP
  PRIVATE_IP=$(gcloud sql instances describe unigrc-db \
    --project="$PROJECT_ID" \
    --format="value(ipAddresses[?type=='PRIVATE'].ipAddress)" 2>/dev/null || echo "")
  
  if [ -n "$PRIVATE_IP" ]; then
    echo "   ✅ Private IP configurada: $PRIVATE_IP"
  else
    echo "   ⚠️  Private IP NO configurada (necesita configuración)"
  fi
  
  # Verificar Public IP
  PUBLIC_IP=$(gcloud sql instances describe unigrc-db \
    --project="$PROJECT_ID" \
    --format="value(ipAddresses[?type=='EXTERNAL'].ipAddress)" 2>/dev/null || echo "")
  
  if [ -n "$PUBLIC_IP" ]; then
    echo "   ℹ️  Public IP: $PUBLIC_IP"
  fi
else
  echo "   ❌ Instancia 'unigrc-db' NO existe"
fi

echo ""

# 2. Verificar VPC Connector
echo "📊 VPC Connector:"
if gcloud compute networks vpc-access connectors describe unigrc-connector \
  --region="$REGION" \
  --project="$PROJECT_ID" &>/dev/null; then
  echo "   ✅ VPC Connector 'unigrc-connector' existe"
  
  CONNECTOR_NETWORK=$(gcloud compute networks vpc-access connectors describe unigrc-connector \
    --region="$REGION" \
    --project="$REGION" \
    --format="value(network)" 2>/dev/null || echo "")
  
  if [ -n "$CONNECTOR_NETWORK" ]; then
    echo "   ℹ️  Network: $CONNECTOR_NETWORK"
  fi
else
  echo "   ⚠️  VPC Connector 'unigrc-connector' NO existe (necesita configuración)"
fi

echo ""

# 3. Verificar Cloud Run Backend
echo "📊 Cloud Run Backend:"
if gcloud run services describe unigrc-backend \
  --region="$REGION" \
  --project="$PROJECT_ID" &>/dev/null; then
  echo "   ✅ Servicio 'unigrc-backend' existe"
  
  CONCURRENCY=$(gcloud run services describe unigrc-backend \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --format="value(spec.template.spec.containerConcurrency)" 2>/dev/null || echo "")
  
  MIN_INSTANCES=$(gcloud run services describe unigrc-backend \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --format="value(spec.template.metadata.annotations.'autoscaling.knative.dev/minScale')" 2>/dev/null || echo "")
  
  echo "   ℹ️  Concurrency: ${CONCURRENCY:-'no configurado'}"
  echo "   ℹ️  Min Instances: ${MIN_INSTANCES:-'no configurado'}"
else
  echo "   ❌ Servicio 'unigrc-backend' NO existe"
fi

echo ""

# 4. Verificar PgBouncer VM
echo "📊 PgBouncer VM:"
if gcloud compute instances describe unigrc-pgbouncer \
  --zone="${REGION}-a" \
  --project="$PROJECT_ID" &>/dev/null; then
  echo "   ✅ VM 'unigrc-pgbouncer' existe"
  
  VM_IP=$(gcloud compute instances describe unigrc-pgbouncer \
    --zone="${REGION}-a" \
    --project="$PROJECT_ID" \
    --format="value(networkInterfaces[0].networkIP)" 2>/dev/null || echo "")
  
  if [ -n "$VM_IP" ]; then
    echo "   ℹ️  IP interna: $VM_IP"
  fi
else
  echo "   ⚠️  VM 'unigrc-pgbouncer' NO existe (necesita creación)"
fi

echo ""

# 5. Verificar Secret PGBOUNCER_URL
echo "📊 Secret PGBOUNCER_URL:"
if gcloud secrets describe PGBOUNCER_URL --project="$PROJECT_ID" &>/dev/null; then
  echo "   ✅ Secret 'PGBOUNCER_URL' existe"
  
  VERSION_COUNT=$(gcloud secrets versions list PGBOUNCER_URL \
    --project="$PROJECT_ID" \
    --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')
  
  echo "   ℹ️  Versiones: $VERSION_COUNT"
else
  echo "   ⚠️  Secret 'PGBOUNCER_URL' NO existe (necesita creación)"
fi

echo ""
echo "✅ Verificación completada"
echo ""
echo "📝 Próximos pasos según estado:"
echo ""

if [ -z "$PRIVATE_IP" ]; then
  echo "   1. Configurar Cloud SQL Private IP (FASE 2)"
fi

if [ -z "$VM_IP" ]; then
  echo "   2. Crear y configurar PgBouncer VM (FASE 3)"
fi

if ! gcloud secrets describe PGBOUNCER_URL --project="$PROJECT_ID" &>/dev/null; then
  echo "   3. Crear secret PGBOUNCER_URL (FASE 4)"
fi

if [ "$CONCURRENCY" != "1" ]; then
  echo "   4. Verificar que Cloud Run use concurrency=1 (ya configurado en cloudbuild-backend.yaml)"
fi
