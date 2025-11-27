
#!/bin/bash

# Export completo (schema + data)
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
EXPORT_FILE="backups/full_export_${TIMESTAMP}.sql"

mkdir -p backups

echo "🗄️ Exportando base de datos completa (schema + datos)..."

pg_dump "$DATABASE_URL" \
  --clean \
  --if-exists \
  --create \
  --verbose \
  > "$EXPORT_FILE"

if [ $? -eq 0 ]; then
  gzip "$EXPORT_FILE"
  echo "✅ Export completo: ${EXPORT_FILE}.gz"
  ls -lh "${EXPORT_FILE}.gz"
else
  echo "❌ Error en export"
  exit 1
fi
