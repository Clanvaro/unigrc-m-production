#!/bin/bash
# Script para diagnosticar problemas de conexión SSL con Cloud SQL

# Configuración
INSTANCE_NAME="unigrc-db"
REGION="southamerica-west1"
PROJECT_ID="unigrc-m"

echo "🔍 Diagnóstico de conexión Cloud SQL"
echo "📋 Instancia: ${INSTANCE_NAME}"
echo "🌍 Región: ${REGION}"
echo "📦 Proyecto: ${PROJECT_ID}"
echo ""

# 1. Verificar configuración SSL de la instancia
echo "1️⃣ Verificando configuración SSL..."
SSL_REQUIRED=$(gcloud sql instances describe ${INSTANCE_NAME} --project=${PROJECT_ID} --format="value(settings.ipConfiguration.requireSsl)" 2>/dev/null)
if [ "${SSL_REQUIRED}" == "True" ]; then
  echo "   ✅ SSL requerido está HABILITADO"
else
  echo "   ⚠️  SSL requerido está DESHABILITADO"
  echo "   💡 Ejecuta: gcloud sql instances patch ${INSTANCE_NAME} --ip-configuration=require-ssl=true"
fi
echo ""

# 2. Verificar redes autorizadas
echo "2️⃣ Verificando redes autorizadas..."
AUTHORIZED_NETWORKS=$(gcloud sql instances describe ${INSTANCE_NAME} --project=${PROJECT_ID} --format="json" | jq -r '.settings.ipConfiguration.authorizedNetworks[]?.value' 2>/dev/null)
if [ -z "${AUTHORIZED_NETWORKS}" ]; then
  echo "   ✅ No hay redes autorizadas públicas (usa Unix socket o IP privada)"
else
  echo "   📋 Redes autorizadas:"
  echo "${AUTHORIZED_NETWORKS}" | while read -r network; do
    if [ "${network}" == "0.0.0.0/0" ]; then
      echo "      ⚠️  ${network} (permite todas las IPs - riesgo de seguridad)"
    else
      echo "      ✅ ${network}"
    fi
  done
fi
echo ""

# 3. Verificar formato de DATABASE_URL en Secret Manager
echo "3️⃣ Verificando DATABASE_URL en Secret Manager..."
if gcloud secrets describe DATABASE_URL --project=${PROJECT_ID} >/dev/null 2>&1; then
  DB_URL=$(gcloud secrets versions access latest --secret=DATABASE_URL --project=${PROJECT_ID} 2>/dev/null)
  if [ -n "${DB_URL}" ]; then
    echo "   ✅ DATABASE_URL existe"
    
    # Verificar si usa Unix socket
    if echo "${DB_URL}" | grep -q "/cloudsql/"; then
      echo "   ✅ Usa formato Unix socket (Cloud SQL Proxy)"
      echo "   ✅ No requiere SSL (conexión interna segura)"
    else
      # Verificar si tiene sslmode
      if echo "${DB_URL}" | grep -q "sslmode=require"; then
        echo "   ✅ Contiene sslmode=require"
      elif echo "${DB_URL}" | grep -q "sslmode=disable"; then
        echo "   ❌ Contiene sslmode=disable (debe ser sslmode=require)"
        echo "   💡 Actualiza DATABASE_URL para usar sslmode=require"
      else
        echo "   ⚠️  No contiene sslmode (debería tener sslmode=require para Cloud SQL)"
        echo "   💡 El código debería agregarlo automáticamente, pero verifica los logs"
      fi
      
      # Verificar si usa IP privada
      if echo "${DB_URL}" | grep -q "@10\."; then
        echo "   ✅ Usa IP privada (VPC)"
        echo "   ⚠️  IMPORTANTE: IPs privadas también requieren SSL después de los cambios de seguridad"
      fi
    fi
  else
    echo "   ❌ No se pudo acceder al valor del secreto"
  fi
else
  echo "   ⚠️  El secreto DATABASE_URL no existe"
fi
echo ""

# 4. Verificar configuración de Cloud Run
echo "4️⃣ Verificando configuración de Cloud Run..."
CLOUD_RUN_SERVICE="unigrc-backend"
CLOUD_SQL_INSTANCE="${PROJECT_ID}:${REGION}:${INSTANCE_NAME}"

CLOUD_SQL_CONFIGURED=$(gcloud run services describe ${CLOUD_RUN_SERVICE} --region=${REGION} --project=${PROJECT_ID} --format="json" 2>/dev/null | jq -r ".spec.template.spec.containers[0].env[] | select(.name == \"IS_GCP_DEPLOYMENT\") | .value")
if [ "${CLOUD_SQL_CONFIGURED}" == "true" ]; then
  echo "   ✅ IS_GCP_DEPLOYMENT=true está configurado"
else
  echo "   ⚠️  IS_GCP_DEPLOYMENT no está configurado o no es 'true'"
  echo "   💡 Esto puede afectar la detección de Cloud SQL en el código"
fi

CLOUD_SQL_INSTANCES=$(gcloud run services describe ${CLOUD_RUN_SERVICE} --region=${REGION} --project=${PROJECT_ID} --format="json" 2>/dev/null | jq -r ".spec.template.metadata.annotations.\"run.googleapis.com/cloudsql-instances\"" 2>/dev/null)
if echo "${CLOUD_SQL_INSTANCES}" | grep -q "${CLOUD_SQL_INSTANCE}"; then
  echo "   ✅ Cloud SQL instance está configurada en Cloud Run"
  echo "   📋 Instancias: ${CLOUD_SQL_INSTANCES}"
else
  echo "   ⚠️  Cloud SQL instance NO está configurada en Cloud Run"
  echo "   💡 Ejecuta: gcloud run services update ${CLOUD_RUN_SERVICE} --region=${REGION} --add-cloudsql-instances=${CLOUD_SQL_INSTANCE}"
fi
echo ""

# 5. Verificar logs recientes de Cloud Run
echo "5️⃣ Verificando logs recientes de Cloud Run (últimas 10 líneas con errores)..."
RECENT_ERRORS=$(gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=${CLOUD_RUN_SERVICE} AND severity>=ERROR" --limit=10 --format="value(textPayload,jsonPayload.message)" --project=${PROJECT_ID} 2>/dev/null | head -10)
if [ -n "${RECENT_ERRORS}" ]; then
  echo "   📋 Errores recientes:"
  echo "${RECENT_ERRORS}" | while read -r error; do
    if echo "${error}" | grep -qi "ssl\|encryption\|pg_hba"; then
      echo "      🔴 ${error}"
    else
      echo "      ⚠️  ${error}"
    fi
  done
else
  echo "   ✅ No se encontraron errores recientes"
fi
echo ""

# 6. Resumen y recomendaciones
echo "📋 Resumen y Recomendaciones:"
echo ""
if [ "${SSL_REQUIRED}" == "True" ]; then
  echo "✅ SSL está requerido en Cloud SQL"
  if echo "${DB_URL}" | grep -q "sslmode=require"; then
    echo "✅ DATABASE_URL tiene sslmode=require"
    echo ""
    echo "💡 Si los errores persisten:"
    echo "   1. Verifica que el código esté usando el Pool con SSL configurado"
    echo "   2. Revisa los logs de Cloud Run para ver si hay errores de conexión SSL"
    echo "   3. Verifica que pg_hba.conf permita conexiones SSL desde la IP/VPC de Cloud Run"
  else
    echo "⚠️  DATABASE_URL NO tiene sslmode=require"
    echo ""
    echo "💡 Soluciones:"
    echo "   1. El código debería agregar sslmode=require automáticamente"
    echo "   2. Si no funciona, actualiza DATABASE_URL manualmente para incluir sslmode=require"
    echo "   3. Verifica los logs de Cloud Run para ver si se está agregando sslmode=require"
  fi
else
  echo "⚠️  SSL NO está requerido en Cloud SQL"
  echo "   💡 Ejecuta: gcloud sql instances patch ${INSTANCE_NAME} --ip-configuration=require-ssl=true"
fi
echo ""
echo "✅ Diagnóstico completado"

