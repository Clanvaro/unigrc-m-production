#!/bin/bash
# Script para extraer credenciales de DATABASE_URL de forma segura
# Uso: ./scripts/get-db-credentials.sh

set -e

echo "🔐 Extrayendo credenciales de DATABASE_URL..."
echo ""

# Obtener DATABASE_URL
DATABASE_URL=$(gcloud secrets versions access latest --secret=DATABASE_URL 2>/dev/null)

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: No se pudo obtener DATABASE_URL"
  exit 1
fi

# Extraer componentes usando regex
# Formato típico: postgresql://user:password@host:port/dbname?params

# Extraer user
DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
if [ -z "$DB_USER" ]; then
  # Intentar formato alternativo sin password
  DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^@]*\)@.*|\1|p')
fi

# Extraer password (entre : y @)
DB_PASSWORD=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')

# Extraer host:port
HOST_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^/]*\)/.*|\1|p')
HOST=$(echo "$HOST_PORT" | cut -d: -f1)
PORT=$(echo "$HOST_PORT" | cut -d: -f2)

# Extraer database name
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')

# Mostrar información (sin mostrar password completo)
echo "✅ Credenciales extraídas:"
echo ""
echo "DB_USER:     $DB_USER"
echo "DB_PASSWORD: ${DB_PASSWORD:0:3}*** (oculto por seguridad)"
echo "HOST:        $HOST"
echo "PORT:        ${PORT:-5432}"
echo "DB_NAME:     $DB_NAME"
echo ""

# Exportar variables para uso en otros scripts
export DB_USER
export DB_PASSWORD
export DB_NAME
export HOST
export PORT

echo "📋 Variables exportadas: DB_USER, DB_PASSWORD, DB_NAME, HOST, PORT"
echo ""
echo "💡 Para usar estas variables en otro script:"
echo "   source ./scripts/get-db-credentials.sh"
echo "   echo \$DB_USER"












