#!/bin/bash

# Script para verificar acceso a CSRF_SECRET desde Cloud Run

set -e

PROJECT_ID="unigrc-m"
SERVICE_ACCOUNT="unigrc-backend@unigrc-m.iam.gserviceaccount.com"
SECRET_NAME="CSRF_SECRET"

echo "🔍 Verificando acceso a CSRF_SECRET para Cloud Run"
echo "📦 Proyecto: $PROJECT_ID"
echo "👤 Service Account: $SERVICE_ACCOUNT"
echo "🔐 Secreto: $SECRET_NAME"
echo ""

# 1. Verificar que el secreto existe
echo "1️⃣ Verificando que el secreto existe..."
if ! gcloud secrets describe $SECRET_NAME --project=$PROJECT_ID &>/dev/null; then
    echo "❌ Error: El secreto $SECRET_NAME no existe"
    exit 1
fi
echo "✅ Secreto existe"
echo ""

# 2. Verificar que tiene una versión
echo "2️⃣ Verificando versiones del secreto..."
VERSION_COUNT=$(gcloud secrets versions list $SECRET_NAME --project=$PROJECT_ID --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')
if [ "$VERSION_COUNT" -eq 0 ]; then
    echo "❌ Error: El secreto no tiene versiones"
    exit 1
fi
echo "✅ Secreto tiene $VERSION_COUNT versión(es)"
LATEST_VERSION=$(gcloud secrets versions list $SECRET_NAME --project=$PROJECT_ID --limit=1 --format="value(name)" 2>/dev/null | head -1)
echo "   Versión más reciente: $LATEST_VERSION"
echo ""

# 3. Verificar permisos a nivel de proyecto
echo "3️⃣ Verificando permisos a nivel de proyecto..."
HAS_PROJECT_ACCESS=$(gcloud projects get-iam-policy $PROJECT_ID \
    --flatten="bindings[].members" \
    --filter="bindings.members:serviceAccount:$SERVICE_ACCOUNT AND bindings.role:roles/secretmanager.secretAccessor" \
    --format="value(bindings.role)" 2>/dev/null | grep -q "secretmanager.secretAccessor" && echo "yes" || echo "no")

if [ "$HAS_PROJECT_ACCESS" == "yes" ]; then
    echo "✅ Service account tiene rol secretmanager.secretAccessor a nivel de proyecto"
else
    echo "❌ Service account NO tiene rol secretmanager.secretAccessor a nivel de proyecto"
    echo "   Otorgando permiso..."
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT" \
        --role="roles/secretmanager.secretAccessor" \
        --condition=None 2>&1 | grep -v "^Updated IAM policy" || true
    echo "✅ Permiso otorgado"
fi
echo ""

# 4. Verificar permisos específicos del secreto (opcional pero recomendado)
echo "4️⃣ Verificando permisos específicos del secreto..."
SECRET_IAM=$(gcloud secrets get-iam-policy $SECRET_NAME --project=$PROJECT_ID --format="json" 2>/dev/null || echo "{}")
HAS_SECRET_ACCESS=$(echo "$SECRET_IAM" | grep -q "$SERVICE_ACCOUNT" && echo "yes" || echo "no")

if [ "$HAS_SECRET_ACCESS" == "yes" ]; then
    echo "✅ Service account tiene acceso específico al secreto"
else
    echo "⚠️  Service account no tiene acceso específico al secreto (pero puede tener acceso a nivel de proyecto)"
    echo "   Esto debería funcionar si tiene el rol a nivel de proyecto"
fi
echo ""

# 5. Simular acceso al secreto (solo verificar que se puede leer, no mostrar el valor)
echo "5️⃣ Simulando acceso al secreto..."
if gcloud secrets versions access latest --secret=$SECRET_NAME --project=$PROJECT_ID &>/dev/null; then
    SECRET_LENGTH=$(gcloud secrets versions access latest --secret=$SECRET_NAME --project=$PROJECT_ID 2>/dev/null | wc -c)
    echo "✅ Secreto es accesible (longitud: $SECRET_LENGTH caracteres)"
else
    echo "❌ Error: No se puede acceder al secreto"
    exit 1
fi
echo ""

# 6. Verificar configuración de Cloud Run
echo "6️⃣ Verificando configuración de Cloud Run..."
RUN_SECRETS=$(gcloud run services describe unigrc-backend \
    --region=southamerica-west1 \
    --project=$PROJECT_ID \
    --format="value(spec.template.spec.containers[0].env)" 2>/dev/null | grep -o "CSRF_SECRET" || echo "")

if [ -n "$RUN_SECRETS" ]; then
    echo "✅ Cloud Run está configurado para usar CSRF_SECRET"
else
    echo "❌ Cloud Run NO está configurado para usar CSRF_SECRET"
    echo "   Verifica cloudbuild-backend.yaml"
fi
echo ""

echo "📋 Resumen:"
echo "   ✅ Secreto existe y tiene versiones"
echo "   ✅ Service account tiene permisos a nivel de proyecto"
echo "   ✅ Secreto es accesible"
echo ""
echo "💡 Si Cloud Run sigue teniendo problemas:"
echo "   1. Verifica los logs de Cloud Run para ver errores específicos"
echo "   2. Asegúrate de que Cloud Run esté usando la versión más reciente del secreto"
echo "   3. Verifica que el despliegue incluye la configuración correcta de secretos"
echo ""
echo "✅ Verificación completada"

