#!/bin/bash
# Script para aplicar índices de optimización de matriz de riesgo
# Uso: ./scripts/apply-risk-matrix-indexes.sh

set -e

echo "🔍 Aplicando índices de optimización para matriz de riesgo..."

# Verificar que DATABASE_URL esté configurada
if [ -z "$DATABASE_URL" ] && [ -z "$POOLED_DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL o POOLED_DATABASE_URL debe estar configurada"
    exit 1
fi

# Usar POOLED_DATABASE_URL si está disponible, sino DATABASE_URL
DB_URL=${POOLED_DATABASE_URL:-$DATABASE_URL}

echo "📊 Aplicando índices desde migrations/optimize-risk-matrix-indexes.sql..."

# Aplicar el script SQL
psql "$DB_URL" -f migrations/optimize-risk-matrix-indexes.sql

echo "✅ Índices aplicados exitosamente!"
echo ""
echo "📈 Para verificar los índices creados, ejecuta:"
echo "   psql \"$DB_URL\" -c \"SELECT tablename, indexname FROM pg_indexes WHERE tablename IN ('risk_controls', 'controls', 'risk_process_links', 'risks') AND indexname LIKE 'idx_%' ORDER BY tablename, indexname;\""

