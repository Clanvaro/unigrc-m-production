
#!/bin/bash

# Restore script para PostgreSQL (Neon)
# Uso: ./scripts/restore-database.sh <archivo_backup.sql.gz>

if [ -z "$1" ]; then
  echo "❌ ERROR: Debes especificar el archivo de backup"
  echo "Uso: ./scripts/restore-database.sh backups/backup_20250104_120000.sql.gz"
  echo ""
  echo "📋 Backups disponibles:"
  ls -lh backups/
  exit 1
fi

BACKUP_FILE="$1"

# Verificar que el archivo existe
if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ ERROR: Archivo no encontrado: $BACKUP_FILE"
  exit 1
fi

# Verificar que DATABASE_URL existe
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL no está configurada"
  exit 1
fi

echo "⚠️  ADVERTENCIA: Esta operación SOBRESCRIBIRÁ la base de datos actual"
echo "Base de datos: $DATABASE_URL"
echo "Backup: $BACKUP_FILE"
echo ""
read -p "¿Deseas continuar? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "❌ Operación cancelada"
  exit 0
fi

echo "🗄️ Iniciando restauración..."

# Descomprimir si es .gz
if [[ "$BACKUP_FILE" == *.gz ]]; then
  echo "📦 Descomprimiendo backup..."
  gunzip -c "$BACKUP_FILE" > /tmp/restore.sql
  RESTORE_FILE="/tmp/restore.sql"
else
  RESTORE_FILE="$BACKUP_FILE"
fi

# Restaurar backup usando psql
echo "🔄 Restaurando base de datos..."
psql "$DATABASE_URL" < "$RESTORE_FILE"

if [ $? -eq 0 ]; then
  echo "✅ Base de datos restaurada exitosamente"
  
  # Limpiar archivo temporal
  if [ -f "/tmp/restore.sql" ]; then
    rm /tmp/restore.sql
  fi
else
  echo "❌ Error al restaurar base de datos"
  exit 1
fi

echo "🎉 Restauración completada"
