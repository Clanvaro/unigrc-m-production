#!/bin/bash
# Script simple para limpiar el caché de producción
# Ejecuta el endpoint de recálculo que también invalida el caché

echo "🧹 Limpiando caché de risk-controls en producción..."
echo ""

# Este endpoint recalcula todos los riesgos residuales Y limpia el caché
curl -X POST "http://localhost:5000/api/risk-controls/recalculate-all" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json"

echo ""
echo ""
echo "✅ Proceso completado!"
echo ""
echo "📊 Ahora verifica en tu navegador:"
echo "1. Recarga la página con Ctrl+Shift+R"
echo "2. Ve a Gestión de Riesgos → R-0002"
echo "3. Verifica que muestre 2 controles en la tabla"
