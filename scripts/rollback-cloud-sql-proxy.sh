#!/bin/bash

# ============================================================
# Script de Rollback: Volver a IP pública desde Unix socket
# Usar solo si la migración a Unix socket causó problemas
# ============================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ID="unigrc-m"
REGION="southamerica-west1"
SERVICE_NAME="unigrc-backend"
SECRET_NAME="DATABASE_URL"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo "=========================================="
echo "Rollback: Volver a IP pública"
echo "=========================================="
echo ""

# Obtener versión anterior
if [ -f "/tmp/old-secret-version.txt" ]; then
    OLD_VERSION=$(cat /tmp/old-secret-version.txt)
    log_info "Versión anterior encontrada: $OLD_VERSION"
else
    log_warning "No se encontró archivo de versión anterior"
    log_info "Listando versiones disponibles:"
    gcloud secrets versions list "$SECRET_NAME" --limit=5
    read -p "Ingresa el número de la versión anterior (con IP pública): " OLD_VERSION
fi

# Confirmar rollback
log_warning "Esto restaurará la versión anterior con IP pública"
read -p "¿Deseas continuar con el rollback? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "Rollback cancelado"
    exit 0
fi

# Habilitar versión anterior
log_info "Habilitando versión anterior: $OLD_VERSION"
gcloud secrets versions enable "$OLD_VERSION" --secret="$SECRET_NAME"

# Actualizar Cloud Run
log_info "Actualizando Cloud Run con versión anterior..."
gcloud run services update "$SERVICE_NAME" \
    --region="$REGION" \
    --update-secrets="${SECRET_NAME}=${SECRET_NAME}:${OLD_VERSION}" \
    --quiet

log_success "Rollback completado"
log_info "Espera 1-2 minutos y verifica que el servicio funciona correctamente"

