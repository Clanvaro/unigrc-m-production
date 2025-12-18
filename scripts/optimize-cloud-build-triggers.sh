#!/bin/bash
# Script para optimizar Cloud Build triggers y reducir costos
# Solo despliega cuando hay cambios relevantes en las carpetas correspondientes

set -e

PROJECT_ID="unigrc-m"
REGION="southamerica-west1"
GITHUB_USER="Clanvaro"
REPO_NAME="unigrc-m-production"

echo "🔧 Optimizando Cloud Build Triggers para reducir costos"
echo "========================================================"
echo ""
echo "Este script actualizará los triggers para que solo se ejecuten cuando:"
echo "  - Backend: Solo cuando hay cambios en server/, cloudbuild-backend.yaml, Dockerfile.backend, etc."
echo "  - Frontend: Solo cuando hay cambios en client/, cloudbuild-frontend.yaml, Dockerfile.frontend, etc."
echo ""

# Función para actualizar un trigger con condiciones de path
update_trigger_with_paths() {
  local TRIGGER_NAME=$1
  local BUILD_CONFIG=$2
  local INCLUDED_PATHS=$3
  
  echo "📝 Actualizando trigger: $TRIGGER_NAME"
  
  # Primero, obtener el ID del trigger existente
  TRIGGER_ID=$(gcloud builds triggers list \
    --filter="name=$TRIGGER_NAME" \
    --format="value(id)" \
    --project=$PROJECT_ID \
    --region=$REGION 2>/dev/null | head -n1)
  
  if [ -z "$TRIGGER_ID" ]; then
    echo "   ⚠️  Trigger '$TRIGGER_NAME' no encontrado. Creando nuevo trigger..."
    
    gcloud builds triggers create github \
      --name=$TRIGGER_NAME \
      --repo-name=$REPO_NAME \
      --repo-owner=$GITHUB_USER \
      --branch-pattern=^main$ \
      --build-config=$BUILD_CONFIG \
      --region=$REGION \
      --project=$PROJECT_ID \
      --included-files=$INCLUDED_PATHS \
      --quiet
    
    echo "   ✅ Trigger creado con filtros de path"
  else
    echo "   🔍 Trigger encontrado (ID: $TRIGGER_ID). Actualizando..."
    
    # Actualizar el trigger existente con filtros de path
    gcloud builds triggers update github $TRIGGER_ID \
      --repo-name=$REPO_NAME \
      --repo-owner=$GITHUB_USER \
      --branch-pattern=^main$ \
      --build-config=$BUILD_CONFIG \
      --region=$REGION \
      --project=$PROJECT_ID \
      --included-files=$INCLUDED_PATHS \
      --quiet
    
    echo "   ✅ Trigger actualizado con filtros de path"
  fi
  echo ""
}

# Actualizar trigger de backend
echo "1️⃣ Configurando trigger de Backend..."
BACKEND_PATHS="server/**,cloudbuild-backend.yaml,Dockerfile.backend,package.json,package-lock.json,tsconfig.json"
update_trigger_with_paths "deploy-backend" "cloudbuild-backend.yaml" "$BACKEND_PATHS"

# Actualizar trigger de frontend
echo "2️⃣ Configurando trigger de Frontend..."
FRONTEND_PATHS="client/**,cloudbuild-frontend.yaml,Dockerfile.frontend,vite.config.ts,tailwind.config.ts,postcss.config.js,components.json,tsconfig.json,package.json,package-lock.json"
update_trigger_with_paths "deploy-frontend" "cloudbuild-frontend.yaml" "$FRONTEND_PATHS"

echo "✅ Optimización completada!"
echo ""
echo "📊 Resumen de cambios:"
echo "  - Backend solo se despliega cuando hay cambios en:"
echo "    • server/"
echo "    • cloudbuild-backend.yaml"
echo "    • Dockerfile.backend"
echo "    • package.json / package-lock.json"
echo ""
echo "  - Frontend solo se despliega cuando hay cambios en:"
echo "    • client/"
echo "    • cloudbuild-frontend.yaml"
echo "    • Dockerfile.frontend"
echo "    • vite.config.ts, tailwind.config.ts, etc."
echo ""
echo "💡 Beneficios:"
echo "  ✅ Reducción significativa de builds innecesarios"
echo "  ✅ Ahorro en costos de Cloud Build"
echo "  ✅ Deploys más rápidos (solo cuando es necesario)"
echo ""
echo "⚠️  Nota: Si necesitas desplegar manualmente ambos servicios, puedes:"
echo "   1. Hacer un commit vacío: git commit --allow-empty -m 'Force deploy'"
echo "   2. O usar: gcloud builds triggers run TRIGGER_NAME --branch=main"
echo ""

