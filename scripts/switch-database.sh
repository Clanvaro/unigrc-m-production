
#!/bin/bash

# Switch database connections
# Uso: ./scripts/switch-database.sh [main|backup]

MODE="${1:-main}"

if [ "$MODE" == "backup" ]; then
  if [ -z "$DATABASE_URL_BACKUP" ]; then
    echo "❌ ERROR: DATABASE_URL_BACKUP no está configurada en Secrets"
    exit 1
  fi
  
  echo "🔄 Cambiando a base de datos de RESPALDO..."
  export DATABASE_URL="$DATABASE_URL_BACKUP"
  echo "✅ Usando: $DATABASE_URL_BACKUP"
  
elif [ "$MODE" == "main" ]; then
  echo "🔄 Cambiando a base de datos PRINCIPAL..."
  # DATABASE_URL ya está configurada en Secrets
  echo "✅ Usando base de datos principal"
  
else
  echo "❌ Modo inválido: $MODE"
  echo "Uso: ./scripts/switch-database.sh [main|backup]"
  exit 1
fi

echo "🎉 Base de datos cambiada exitosamente"
echo "Reinicia la aplicación para aplicar cambios"
