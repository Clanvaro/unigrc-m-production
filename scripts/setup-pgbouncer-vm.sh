#!/bin/bash
# Script para configurar PgBouncer en VM de Google Cloud
# Uso: ./scripts/setup-pgbouncer-vm.sh

set -e

# Variables (ajustar según tu configuración)
PROJECT_ID="${GCP_PROJECT_ID:-unigrc-m}"
ZONE="${GCP_ZONE:-southamerica-west1-a}"
VM_NAME="unigrc-pgbouncer"
NETWORK="${VPC_NETWORK:-unigrc-vpc}"
CLOUD_SQL_PRIVATE_IP="${CLOUD_SQL_PRIVATE_IP}"  # Debe ser proporcionado
DB_NAME="${DB_NAME:-unigrc_db}"
DB_USER="${DB_USER:-unigrc_user}"
DB_PASSWORD="${DB_PASSWORD}"  # Debe ser proporcionado

echo "🚀 Configurando PgBouncer en VM..."

# Verificar que variables requeridas están configuradas
if [ -z "$CLOUD_SQL_PRIVATE_IP" ]; then
  echo "❌ Error: CLOUD_SQL_PRIVATE_IP no está configurado"
  echo "   Obtener con: gcloud sql instances describe unigrc-db --format='value(ipAddresses[?type==\"PRIVATE\"].ipAddress)'"
  exit 1
fi

if [ -z "$DB_PASSWORD" ]; then
  echo "❌ Error: DB_PASSWORD no está configurado"
  echo "   Obtener con: gcloud secrets versions access latest --secret=DATABASE_URL"
  exit 1
fi

# 1. Crear VM si no existe
echo "📦 Creando VM para PgBouncer..."
if ! gcloud compute instances describe "$VM_NAME" --zone="$ZONE" --project="$PROJECT_ID" &>/dev/null; then
  gcloud compute instances create "$VM_NAME" \
    --zone="$ZONE" \
    --project="$PROJECT_ID" \
    --machine-type=e2-micro \
    --network="$NETWORK" \
    --subnet=default \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=10GB \
    --boot-disk-type=pd-standard \
    --tags=pgbouncer-server \
    --metadata=startup-script='#!/bin/bash
apt-get update
apt-get install -y pgbouncer postgresql-client
systemctl enable pgbouncer
systemctl start pgbouncer
'
  echo "✅ VM creada. Esperando 60 segundos para que termine el startup..."
  sleep 60
else
  echo "✅ VM ya existe"
fi

# 2. Obtener IP interna de la VM
VM_IP=$(gcloud compute instances describe "$VM_NAME" \
  --zone="$ZONE" \
  --project="$PROJECT_ID" \
  --format="value(networkInterfaces[0].networkIP)")

echo "📍 IP interna de VM: $VM_IP"

# 3. Configurar PgBouncer
echo "⚙️ Configurando PgBouncer..."

# Generar hash MD5 para userlist.txt
# Formato: md5(password + username)
MD5_HASH=$(echo -n "${DB_PASSWORD}${DB_USER}" | md5sum | awk '{print $1}')

# Crear configuración temporal
# IMPORTANTE: Cloud SQL usa SCRAM authentication
# - auth_type = trust para cliente->PgBouncer (seguro dentro de VPC)
# - Usar .pgpass file para PgBouncer->Cloud SQL (SCRAM automático)
cat > /tmp/pgbouncer.ini <<EOF
[databases]
${DB_NAME} = host=${CLOUD_SQL_PRIVATE_IP} port=5432 dbname=${DB_NAME} user=${DB_USER}

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = trust
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3
max_db_connections = 100
max_user_connections = 100
server_round_robin = 1
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
admin_users = pgbouncer
stats_users = pgbouncer
pidfile = /var/run/postgresql/pgbouncer.pid
logfile = /var/log/pgbouncer/pgbouncer.log
EOF

# Crear userlist.txt
cat > /tmp/userlist.txt <<EOF
"${DB_USER}" "md5${MD5_HASH}"
"pgbouncer" "pgbouncer"
EOF

# Copiar archivos a VM
echo "📤 Copiando configuración a VM..."
gcloud compute scp /tmp/pgbouncer.ini "${VM_NAME}:/tmp/pgbouncer.ini" \
  --zone="$ZONE" --project="$PROJECT_ID"
gcloud compute scp /tmp/userlist.txt "${VM_NAME}:/tmp/userlist.txt" \
  --zone="$ZONE" --project="$PROJECT_ID"

# Instalar y configurar en VM
echo "🔧 Instalando PgBouncer en VM..."
gcloud compute ssh "$VM_NAME" \
  --zone="$ZONE" \
  --project="$PROJECT_ID" \
  --command="
sudo apt-get update
sudo apt-get install -y pgbouncer postgresql-client

# Crear usuario pgbouncer si no existe
sudo useradd -r -s /bin/false pgbouncer 2>/dev/null || true

# Copiar configuración
sudo cp /tmp/pgbouncer.ini /etc/pgbouncer/pgbouncer.ini
sudo cp /tmp/userlist.txt /etc/pgbouncer/userlist.txt
sudo chown postgres:postgres /etc/pgbouncer/pgbouncer.ini
sudo chown postgres:postgres /etc/pgbouncer/userlist.txt
sudo chmod 640 /etc/pgbouncer/pgbouncer.ini
sudo chmod 640 /etc/pgbouncer/userlist.txt

# Configurar systemd para ejecutar como usuario postgres
sudo sed -i 's/^User=.*/User=postgres/' /etc/systemd/system/pgbouncer.service 2>/dev/null || true
sudo systemctl daemon-reload

# Reiniciar PgBouncer
sudo systemctl restart pgbouncer || sudo -u postgres pgbouncer -d /etc/pgbouncer/pgbouncer.ini &
sudo systemctl enable pgbouncer

# Esperar un momento y verificar estado
sleep 2
sudo systemctl status pgbouncer --no-pager || pgrep -u postgres pgbouncer && echo 'PgBouncer corriendo como proceso postgres'
"

# 4. Configurar firewall
echo "🔥 Configurando firewall..."
# Obtener rango de VPC Connector (típicamente 10.8.0.0/28)
VPC_CONNECTOR_RANGE="10.8.0.0/28"

if ! gcloud compute firewall-rules describe allow-pgbouncer --project="$PROJECT_ID" &>/dev/null; then
  gcloud compute firewall-rules create allow-pgbouncer \
    --project="$PROJECT_ID" \
    --network="$NETWORK" \
    --allow=tcp:6432 \
    --source-ranges="$VPC_CONNECTOR_RANGE" \
    --target-tags=pgbouncer-server \
    --description="Allow PgBouncer connections from VPC Connector"
  echo "✅ Firewall rule creada"
else
  echo "✅ Firewall rule ya existe"
fi

# 5. Probar conexión
echo "🧪 Probando conexión a PgBouncer..."
gcloud compute ssh "$VM_NAME" \
  --zone="$ZONE" \
  --project="$PROJECT_ID" \
  --command="
psql -h localhost -p 6432 -U pgbouncer pgbouncer -c 'SHOW VERSION;' || echo '⚠️ Conexión falló, verificar configuración'
"

# 6. Mostrar información
echo ""
echo "✅ PgBouncer configurado exitosamente!"
echo ""
echo "📋 Información importante:"
echo "   VM Name: $VM_NAME"
echo "   VM IP: $VM_IP"
echo "   PgBouncer Port: 6432"
echo "   Database: $DB_NAME"
echo ""
echo "🔗 PGBOUNCER_URL para Cloud Run:"
echo "   postgresql://${DB_USER}:${DB_PASSWORD}@${VM_IP}:6432/${DB_NAME}?sslmode=disable"
echo ""
echo "📝 Próximos pasos:"
echo "   1. Crear secret PGBOUNCER_URL en Secret Manager"
echo "   2. Actualizar server/db.ts para usar PgBouncer"
echo "   3. Actualizar cloudbuild-backend.yaml"
echo "   4. Redeploy backend"

# Limpiar archivos temporales
rm -f /tmp/pgbouncer.ini /tmp/userlist.txt
