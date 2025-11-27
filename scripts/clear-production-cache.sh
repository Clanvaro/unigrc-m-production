#!/bin/bash
# Script para limpiar el caché de risk-controls en producción
# Ejecutar este script después de despliegues que cambien queries o estructura de datos

echo "🧹 Limpiando caché de risk-controls..."
echo ""

# Llamar al endpoint dedicado para limpiar el caché
RESPONSE=$(curl -s -X POST "http://localhost:5000/api/risk-controls/clear-cache" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json")

echo "Respuesta del servidor:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

echo ""
echo "✅ Proceso completado!"
echo ""
echo "📊 Ahora verifica en producción:"
echo "1. Recarga la página con Ctrl+Shift+R"
echo "2. Ve a Gestión de Riesgos → R-0002"
echo "3. Verifica que muestre 2 controles en la tabla"
echo "4. Compara con el modal para confirmar que coincidan"
