#!/bin/bash

# Script para verificar y actualizar DATABASE_URL con sslmode=require
# Esto es necesario después de requerir SSL en Cloud SQL

set -e

SECRET_NAME="DATABASE_URL"
PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Error: No se pudo obtener el PROJECT_ID. Ejecuta: gcloud config set project [PROJECT_ID]"
    exit 1
fi

echo "🔍 Verificando configuración de DATABASE_URL en Secret Manager"
echo "📦 Proyecto: $PROJECT_ID"
echo ""

# Verificar si el secreto existe
if ! gcloud secrets describe $SECRET_NAME --project=$PROJECT_ID &>/dev/null; then
    echo "❌ Error: El secreto $SECRET_NAME no existe en Secret Manager"
    exit 1
fi

echo "✅ Secreto encontrado: $SECRET_NAME"
echo ""

# Obtener el valor actual (sin mostrarlo completo por seguridad)
echo "📋 Verificando si DATABASE_URL incluye sslmode=require..."
CURRENT_VALUE=$(gcloud secrets versions access latest --secret=$SECRET_NAME --project=$PROJECT_ID 2>/dev/null || echo "")

if [ -z "$CURRENT_VALUE" ]; then
    echo "❌ Error: No se pudo obtener el valor del secreto"
    exit 1
fi

# Verificar si ya tiene sslmode=require
if echo "$CURRENT_VALUE" | grep -q "sslmode=require"; then
    echo "✅ DATABASE_URL ya incluye sslmode=require"
    echo "   No se requiere actualización"
    exit 0
fi

# Verificar si tiene sslmode=prefer o sslmode=disable
if echo "$CURRENT_VALUE" | grep -q "sslmode=prefer"; then
    echo "⚠️  DATABASE_URL tiene sslmode=prefer"
    echo "   Actualizando a sslmode=require..."
    UPDATED_VALUE=$(echo "$CURRENT_VALUE" | sed 's/sslmode=prefer/sslmode=require/g')
elif echo "$CURRENT_VALUE" | grep -q "sslmode=disable"; then
    echo "⚠️  ADVERTENCIA: DATABASE_URL tiene sslmode=disable"
    echo "   Esto NO funcionará con Cloud SQL que requiere SSL"
    echo "   Actualizando a sslmode=require..."
    UPDATED_VALUE=$(echo "$CURRENT_VALUE" | sed 's/sslmode=disable/sslmode=require/g')
elif echo "$CURRENT_VALUE" | grep -q "cloudsql"; then
    # Si usa Cloud SQL Proxy (Unix socket), no necesita sslmode
    echo "✅ DATABASE_URL usa Cloud SQL Proxy (Unix socket)"
    echo "   No requiere sslmode (la conexión ya es segura)"
    exit 0
else
    # No tiene sslmode, agregarlo
    echo "⚠️  DATABASE_URL no tiene sslmode especificado"
    echo "   Agregando sslmode=require..."
    
    if echo "$CURRENT_VALUE" | grep -q "?"; then
        # Ya tiene parámetros, agregar sslmode
        UPDATED_VALUE="${CURRENT_VALUE}&sslmode=require"
    else
        # No tiene parámetros, agregar sslmode
        UPDATED_VALUE="${CURRENT_VALUE}?sslmode=require"
    fi
fi

echo ""
echo "📝 Valor actualizado:"
echo "   ${UPDATED_VALUE:0:50}..." # Mostrar solo primeros 50 caracteres
echo ""

read -p "¿Deseas actualizar el secreto? (s/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "⏭️  Actualización cancelada"
    exit 0
fi

# Crear nueva versión del secreto
echo "$UPDATED_VALUE" | gcloud secrets versions add $SECRET_NAME \
    --data-file=- \
    --project=$PROJECT_ID

if [ $? -eq 0 ]; then
    echo "✅ Secreto actualizado exitosamente"
    echo ""
    echo "⚠️  IMPORTANTE: Cloud Run necesita ser redesplegado para usar la nueva versión del secreto"
    echo "   Ejecuta: git push (si usas Cloud Build)"
    echo "   O: gcloud run services update unigrc-backend --region=southamerica-west1"
else
    echo "❌ Error al actualizar el secreto"
    exit 1
fi

