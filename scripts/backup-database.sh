
#!/bin/bash

# Backup script para PostgreSQL (Neon)
# Uso: ./scripts/backup-database.sh

echo "🗄️ Iniciando backup de base de datos..."

# Obtener timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backups"
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"

# Crear directorio de backups si no existe
mkdir -p $BACKUP_DIR

# Verificar que DATABASE_URL existe
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL no está configurada"
  exit 1
fi

# Crear backup usando pg_dump
echo "📦 Creando backup en: $BACKUP_FILE"
pg_dump "$DATABASE_URL" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "✅ Backup creado exitosamente: $BACKUP_FILE"
  
  # Comprimir el backup
  gzip "$BACKUP_FILE"
  echo "📦 Backup comprimido: ${BACKUP_FILE}.gz"
  
  # Listar backups existentes
  echo ""
  echo "📋 Backups disponibles:"
  ls -lh $BACKUP_DIR/
else
  echo "❌ Error al crear backup"
  exit 1
fi

# Limpiar backups antiguos (mantener últimos 7 días)
find $BACKUP_DIR -name "backup_*.sql.gz" -type f -mtime +7 -delete
echo "🧹 Backups antiguos limpiados (>7 días)"
