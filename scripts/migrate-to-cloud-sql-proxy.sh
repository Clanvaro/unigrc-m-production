#!/bin/bash

# ============================================================
# Script de Migración a Cloud SQL Proxy (Unix Socket)
# Migra de IP pública a Unix socket para mejor seguridad y performance
# ============================================================

set -e  # Exit on error
set -o pipefail  # Exit on pipe failure

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
PROJECT_ID="unigrc-m"
REGION="southamerica-west1"
INSTANCE_NAME="unigrc-db"
SERVICE_NAME="unigrc-backend"
SECRET_NAME="DATABASE_URL"
CLOUD_SQL_CONNECTION="${PROJECT_ID}:${REGION}:${INSTANCE_NAME}"

# Variables de estado
OLD_VERSION=""
NEW_VERSION=""
ROLLBACK_NEEDED=false

# Función para logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Función para rollback
rollback() {
    log_error "Iniciando rollback..."
    
    if [ -n "$OLD_VERSION" ]; then
        log_info "Restaurando versión anterior del secret: $OLD_VERSION"
        gcloud secrets versions enable "$OLD_VERSION" --secret="$SECRET_NAME" || true
        
        log_info "Forzando redeploy con versión anterior..."
        gcloud run services update "$SERVICE_NAME" \
            --region="$REGION" \
            --update-secrets="${SECRET_NAME}=${SECRET_NAME}:${OLD_VERSION}" || true
        
        log_warning "Rollback completado. Espera 2 minutos y verifica los logs."
    else
        log_error "No se pudo obtener la versión anterior para rollback."
    fi
    
    exit 1
}

# Trap para rollback automático en caso de error
trap rollback ERR

# Función para verificar que gcloud está configurado
check_gcloud() {
    log_info "Verificando configuración de gcloud..."
    
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud no está instalado. Por favor instálalo primero."
        exit 1
    fi
    
    CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
    if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
        log_warning "El proyecto actual es '$CURRENT_PROJECT', pero necesitamos '$PROJECT_ID'"
        read -p "¿Continuar de todas formas? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    log_success "gcloud está configurado correctamente"
}

# Función para obtener DATABASE_URL actual
get_current_database_url() {
    log_info "Obteniendo DATABASE_URL actual desde Secret Manager..."
    
    CURRENT_URL=$(gcloud secrets versions access latest --secret="$SECRET_NAME" 2>/dev/null || echo "")
    
    if [ -z "$CURRENT_URL" ]; then
        log_error "No se pudo obtener DATABASE_URL desde Secret Manager"
        exit 1
    fi
    
    # Ocultar contraseña en el log
    MASKED_URL=$(echo "$CURRENT_URL" | sed 's/:[^:@]*@/:***@/')
    log_info "DATABASE_URL actual: $MASKED_URL"
    
    # Verificar si ya está usando Unix socket
    if echo "$CURRENT_URL" | grep -q "/cloudsql/"; then
        log_warning "El DATABASE_URL ya está usando Unix socket. No se requiere migración."
        exit 0
    fi
    
    # Extraer usuario, contraseña y base de datos
    if [[ $CURRENT_URL =~ postgresql://([^:]+):([^@]+)@([^:/]+):?([0-9]*)/([^?]+) ]]; then
        DB_USER="${BASH_REMATCH[1]}"
        DB_PASSWORD="${BASH_REMATCH[2]}"
        DB_HOST="${BASH_REMATCH[3]}"
        DB_PORT="${BASH_REMATCH[4]:-5432}"
        DB_NAME="${BASH_REMATCH[5]}"
        
        log_success "Extraído: usuario=$DB_USER, host=$DB_HOST, db=$DB_NAME"
    else
        log_error "No se pudo parsear el DATABASE_URL actual"
        exit 1
    fi
}

# Función para verificar configuración de Cloud SQL
check_cloud_sql() {
    log_info "Verificando configuración de Cloud SQL..."
    
    INSTANCE_EXISTS=$(gcloud sql instances describe "$INSTANCE_NAME" --format="value(name)" 2>/dev/null || echo "")
    
    if [ -z "$INSTANCE_EXISTS" ]; then
        log_error "La instancia de Cloud SQL '$INSTANCE_NAME' no existe"
        exit 1
    fi
    
    log_success "Instancia de Cloud SQL encontrada: $INSTANCE_NAME"
}

# Función para verificar configuración de Cloud Run
check_cloud_run() {
    log_info "Verificando configuración de Cloud Run..."
    
    SERVICE_EXISTS=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format="value(metadata.name)" 2>/dev/null || echo "")
    
    if [ -z "$SERVICE_EXISTS" ]; then
        log_error "El servicio de Cloud Run '$SERVICE_NAME' no existe en región '$REGION'"
        exit 1
    fi
    
    # Verificar que tiene --add-cloudsql-instances configurado
    HAS_CLOUDSQL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format="value(spec.template.spec.containers[0].env)" 2>/dev/null | grep -i cloudsql || echo "")
    
    if [ -z "$HAS_CLOUDSQL" ]; then
        log_warning "Cloud Run no tiene --add-cloudsql-instances configurado"
        log_info "Verificando en cloudbuild-backend.yaml..."
        
        if grep -q "add-cloudsql-instances" cloudbuild-backend.yaml 2>/dev/null; then
            log_warning "El cloudbuild tiene la configuración, pero el servicio desplegado no."
            log_warning "Necesitarás hacer un nuevo deploy para que tome efecto."
            read -p "¿Continuar de todas formas? (y/n): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        else
            log_error "No se encontró --add-cloudsql-instances en cloudbuild-backend.yaml"
            exit 1
        fi
    else
        log_success "Cloud Run tiene --add-cloudsql-instances configurado"
    fi
}

# Función para guardar versión actual
save_current_version() {
    log_info "Guardando versión actual del secret para rollback..."
    
    OLD_VERSION=$(gcloud secrets versions list "$SECRET_NAME" --limit=1 --format="value(name)" 2>/dev/null || echo "")
    
    if [ -z "$OLD_VERSION" ]; then
        log_error "No se pudo obtener la versión actual del secret"
        exit 1
    fi
    
    log_success "Versión actual guardada: $OLD_VERSION"
}

# Función para crear nueva versión del secret
create_new_secret_version() {
    log_info "Creando nueva versión del secret con formato Unix socket..."
    
    # Construir nuevo DATABASE_URL
    # Formato: postgresql://user:password@/db?host=/cloudsql/project:region:instance
    NEW_DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@/${DB_NAME}?host=/cloudsql/${CLOUD_SQL_CONNECTION}"
    
    # Crear nueva versión
    echo "$NEW_DATABASE_URL" | gcloud secrets versions add "$SECRET_NAME" --data-file=- 2>&1 | while read line; do
        log_info "$line"
    done
    
    # Obtener ID de la nueva versión
    NEW_VERSION=$(gcloud secrets versions list "$SECRET_NAME" --limit=1 --format="value(name)" 2>/dev/null || echo "")
    
    if [ -z "$NEW_VERSION" ]; then
        log_error "No se pudo crear la nueva versión del secret"
        exit 1
    fi
    
    log_success "Nueva versión creada: $NEW_VERSION"
    
    # Mostrar URL (con contraseña oculta)
    MASKED_NEW_URL=$(echo "$NEW_DATABASE_URL" | sed 's/:[^:@]*@/:***@/')
    log_info "Nuevo DATABASE_URL: $MASKED_NEW_URL"
}

# Función para activar nueva versión
activate_new_version() {
    log_info "Activando nueva versión del secret..."
    
    # Forzar redeploy con nueva versión
    gcloud run services update "$SERVICE_NAME" \
        --region="$REGION" \
        --update-secrets="${SECRET_NAME}=${SECRET_NAME}:latest" \
        --quiet 2>&1 | while read line; do
        log_info "$line"
    done
    
    log_success "Nueva versión activada. Cloud Run se está actualizando..."
    
    # Esperar a que el servicio se actualice
    log_info "Esperando 30 segundos para que el servicio se actualice..."
    sleep 30
}

# Función para monitorear logs
monitor_logs() {
    log_info "Monitoreando logs de Cloud Run (próximos 2 minutos)..."
    
    # Buscar confirmación de uso de Unix socket
    log_info "Buscando confirmación de uso de Unix socket..."
    
    FOUND_UNIX_SOCKET=false
    FOUND_ERRORS=false
    
    # Monitorear por 2 minutos (120 segundos)
    for i in {1..24}; do
        sleep 5
        
        # Buscar mensaje de Unix socket
        LOG_CHECK=$(gcloud logging read \
            "resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE_NAME} AND (textPayload=~'Unix socket' OR textPayload=~'Cloud SQL Proxy')" \
            --limit=1 \
            --format="value(textPayload)" \
            --freshness=2m 2>/dev/null || echo "")
        
        if [ -n "$LOG_CHECK" ]; then
            log_success "✓ Confirmado: Cloud Run está usando Unix socket"
            echo "  $LOG_CHECK"
            FOUND_UNIX_SOCKET=true
        fi
        
        # Buscar errores críticos de conexión
        ERROR_CHECK=$(gcloud logging read \
            "resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE_NAME} AND severity>=ERROR AND (textPayload=~'connection' OR textPayload=~'database' OR textPayload=~'timeout' OR textPayload=~'ECONNREFUSED')" \
            --limit=1 \
            --format="value(textPayload)" \
            --freshness=2m 2>/dev/null || echo "")
        
        if [ -n "$ERROR_CHECK" ]; then
            log_error "✗ Error detectado en logs:"
            echo "  $ERROR_CHECK"
            FOUND_ERRORS=true
        fi
        
        # Mostrar progreso
        if [ $((i % 6)) -eq 0 ]; then
            log_info "Monitoreando... ($((i * 5))s / 120s)"
        fi
    done
    
    # Evaluar resultados
    if [ "$FOUND_ERRORS" = true ] && [ "$FOUND_UNIX_SOCKET" = false ]; then
        log_error "Se detectaron errores y no se confirmó el uso de Unix socket"
        ROLLBACK_NEEDED=true
        return 1
    elif [ "$FOUND_UNIX_SOCKET" = false ]; then
        log_warning "No se encontró confirmación de Unix socket en los logs"
        log_warning "Esto puede ser normal si el servicio no ha recibido requests aún"
        log_info "Revisa los logs manualmente para confirmar"
    fi
    
    return 0
}

# Función para verificar salud del servicio
check_service_health() {
    log_info "Verificando salud del servicio..."
    
    # Obtener URL del servicio
    SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format="value(status.url)" 2>/dev/null || echo "")
    
    if [ -z "$SERVICE_URL" ]; then
        log_warning "No se pudo obtener la URL del servicio"
        return 0
    fi
    
    log_info "Probando endpoint de salud: ${SERVICE_URL}/api/health"
    
    # Intentar hacer un request al endpoint de salud
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${SERVICE_URL}/api/health" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        log_success "✓ Servicio responde correctamente (HTTP $HTTP_CODE)"
        return 0
    elif [ "$HTTP_CODE" = "000" ]; then
        log_warning "No se pudo conectar al servicio (timeout o error de red)"
        return 0
    else
        log_warning "Servicio responde con código HTTP $HTTP_CODE"
        return 0
    fi
}

# Función principal
main() {
    echo "=========================================="
    echo "Migración a Cloud SQL Proxy (Unix Socket)"
    echo "=========================================="
    echo ""
    
    # Confirmación
    log_warning "Este script migrará tu DATABASE_URL de IP pública a Unix socket"
    log_warning "Esto mejorará la seguridad y performance de tu conexión a la BD"
    echo ""
    read -p "¿Deseas continuar? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Migración cancelada por el usuario"
        exit 0
    fi
    echo ""
    
    # Ejecutar pasos
    check_gcloud
    get_current_database_url
    check_cloud_sql
    check_cloud_run
    save_current_version
    
    echo ""
    log_info "=== Creando nueva versión del secret ==="
    create_new_secret_version
    
    echo ""
    log_info "=== Activando nueva versión ==="
    activate_new_version
    
    echo ""
    log_info "=== Monitoreando logs ==="
    if ! monitor_logs; then
        log_error "La migración falló. Iniciando rollback..."
        rollback
    fi
    
    echo ""
    log_info "=== Verificando salud del servicio ==="
    check_service_health
    
    echo ""
    log_success "=========================================="
    log_success "Migración completada exitosamente!"
    log_success "=========================================="
    echo ""
    log_info "Próximos pasos recomendados:"
    log_info "1. Monitorea la aplicación por las próximas 24 horas"
    log_info "2. Si todo funciona correctamente, puedes remover las redes autorizadas:"
    log_info "   gcloud sql instances patch $INSTANCE_NAME --clear-authorized-networks"
    log_info "3. (Opcional) Si no necesitas IP pública, puedes deshabilitarla:"
    log_info "   gcloud sql instances patch $INSTANCE_NAME --no-assign-ip"
    echo ""
    log_info "Para rollback manual si es necesario:"
    log_info "  gcloud secrets versions enable $OLD_VERSION --secret=$SECRET_NAME"
    log_info "  gcloud run services update $SERVICE_NAME --region=$REGION --update-secrets=$SECRET_NAME=$SECRET_NAME:$OLD_VERSION"
    echo ""
}

# Ejecutar función principal
main

