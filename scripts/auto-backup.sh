
#!/bin/bash

# Auto-backup script
# Este script se puede ejecutar desde cron o manualmente

BACKUP_DIR="backups"
MAX_BACKUPS=14  # Mantener últimos 14 backups

echo "🤖 Iniciando backup automático..."

# Ejecutar backup
./scripts/backup-database.sh

# Contar backups
BACKUP_COUNT=$(ls -1 $BACKUP_DIR/backup_*.sql.gz 2>/dev/null | wc -l)

echo "📊 Total de backups: $BACKUP_COUNT"

if [ $BACKUP_COUNT -gt $MAX_BACKUPS ]; then
  echo "🧹 Limpiando backups antiguos (max: $MAX_BACKUPS)..."
  ls -t $BACKUP_DIR/backup_*.sql.gz | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -f
  echo "✅ Limpieza completada"
fi
