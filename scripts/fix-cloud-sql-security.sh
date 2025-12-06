#!/bin/bash

# Script para remover 0.0.0.0/0 de Cloud SQL y usar Unix Socket
# Este script actualiza DATABASE_URL a formato Unix socket y remueve redes autorizadas públicas

set -e

PROJECT_ID="unigrc-m"
INSTANCE_NAME="unigrc-db"
REGION="southamerica-west1"
SECRET_NAME="DATABASE_URL"
DB_USER="unigrc_user"
DB_NAME="unigrc_db"

echo "🔒 Fix: Remover 0.0.0.0/0 de Cloud SQL y usar Unix Socket"
echo "=========================================================="
echo ""

# Paso 1: Verificar DATABASE_URL actual
echo "📋 Paso 1: Verificando DATABASE_URL actual..."
CURRENT_DB_URL=$(gcloud secrets versions access latest --secret="$SECRET_NAME" 2>/dev/null || echo "")

if [ -z "$CURRENT_DB_URL" ]; then
  echo "❌ Error: No se pudo obtener DATABASE_URL del Secret Manager"
  echo "   Asegúrate de que el secret existe y tienes permisos"
  exit 1
fi

echo "✅ DATABASE_URL actual obtenido"
echo ""

# Verificar si ya usa Unix socket
if [[ "$CURRENT_DB_URL" == *"/cloudsql/"* ]]; then
  echo "✅ DATABASE_URL ya usa formato Unix socket (Cloud SQL Proxy)"
  echo "   Puedes proceder directamente a remover las redes autorizadas"
  USE_UNIX_SOCKET=true
else
  echo "⚠️  DATABASE_URL usa IP pública"
  echo "   Necesitamos actualizarlo a formato Unix socket"
  USE_UNIX_SOCKET=false
  
  # Extraer contraseña del DATABASE_URL actual
  # Formato: postgresql://user:password@host:port/db
  if [[ "$CURRENT_DB_URL" =~ postgresql://([^:]+):([^@]+)@([^:/]+) ]]; then
    EXTRACTED_USER="${BASH_REMATCH[1]}"
    EXTRACTED_PASSWORD="${BASH_REMATCH[2]}"
    echo "   Usuario detectado: $EXTRACTED_USER"
    echo ""
    
    # Crear nuevo DATABASE_URL con formato Unix socket
    NEW_DB_URL="postgresql://${EXTRACTED_USER}:${EXTRACTED_PASSWORD}@/${DB_NAME}?host=/cloudsql/${PROJECT_ID}:${REGION}:${INSTANCE_NAME}"
    
    echo "📝 Paso 2: Actualizando DATABASE_URL a formato Unix socket..."
    echo "$NEW_DB_URL" | gcloud secrets versions add "$SECRET_NAME" --data-file=-
    echo "✅ DATABASE_URL actualizado a formato Unix socket"
    echo ""
  else
    echo "❌ Error: No se pudo parsear el DATABASE_URL actual"
    echo "   Formato esperado: postgresql://user:password@host:port/db"
    exit 1
  fi
fi

# Paso 3: Verificar redes autorizadas actuales
echo "📋 Paso 3: Verificando redes autorizadas actuales..."
AUTHORIZED_NETWORKS=$(gcloud sql instances describe "$INSTANCE_NAME" \
  --format="value(settings.ipConfiguration.authorizedNetworks)" 2>/dev/null || echo "")

if [ -z "$AUTHORIZED_NETWORKS" ] || [ "$AUTHORIZED_NETWORKS" == "None" ]; then
  echo "✅ No hay redes autorizadas configuradas (ya está seguro)"
else
  echo "⚠️  Redes autorizadas encontradas:"
  echo "$AUTHORIZED_NETWORKS" | grep -o '[0-9.]\+/[0-9]\+' || echo "   (formato no reconocido)"
  echo ""
  
  # Verificar si contiene 0.0.0.0/0
  if [[ "$AUTHORIZED_NETWORKS" == *"0.0.0.0/0"* ]]; then
    echo "⚠️  Se encontró 0.0.0.0/0 (permite acceso desde cualquier IP)"
    echo ""
    
    if [ "$USE_UNIX_SOCKET" = true ]; then
      echo "📝 Paso 4: Removiendo todas las redes autorizadas..."
      echo "   (Cloud Run usa Unix socket, no necesita IPs públicas)"
      gcloud sql instances patch "$INSTANCE_NAME" \
        --clear-authorized-networks
      echo "✅ Redes autorizadas removidas"
    else
      echo "⚠️  Espera a que Cloud Run se redespliegue con el nuevo DATABASE_URL"
      echo "   Luego ejecuta este script nuevamente para remover las redes autorizadas"
      echo ""
      echo "   O ejecuta manualmente:"
      echo "   gcloud sql instances patch $INSTANCE_NAME --clear-authorized-networks"
      exit 0
    fi
  else
    echo "✅ No se encontró 0.0.0.0/0"
    echo "   Las redes autorizadas son específicas (más seguro)"
  fi
fi

echo ""
echo "✅ Proceso completado"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Espera a que Cloud Run se redespliegue automáticamente (o hazlo manualmente)"
echo "   2. Verifica los logs de Cloud Run para confirmar que la conexión funciona"
echo "   3. Prueba la aplicación para asegurarte de que todo funciona correctamente"
echo ""
echo "🔍 Para verificar la conexión:"
echo "   gcloud run services logs read unigrc-backend --region=$REGION --limit=50"
echo ""
