#!/bin/bash
# Script de diagnóstico para comparar asociaciones riesgo-control entre diferentes endpoints

set -e

API_URL="${API_URL:-http://localhost:5000}"
RISK_CODE="${RISK_CODE:-R-0002}"

echo "=========================================="
echo "Diagnóstico de Asociaciones Riesgo-Control"
echo "=========================================="
echo ""
echo "Buscando riesgo: $RISK_CODE"
echo ""

# 1. Obtener el ID del riesgo R-0002
echo "1. Obteniendo información del riesgo $RISK_CODE..."
RISK_DATA=$(curl -s -X GET "$API_URL/api/risks" -H "Accept: application/json" --compressed | \
  jq ".data[] | select(.code == \"$RISK_CODE\")")

if [ -z "$RISK_DATA" ]; then
  echo "❌ No se encontró el riesgo $RISK_CODE"
  exit 1
fi

RISK_ID=$(echo "$RISK_DATA" | jq -r '.id')
RISK_NAME=$(echo "$RISK_DATA" | jq -r '.name')

echo "  ✓ Riesgo encontrado:"
echo "    ID: $RISK_ID"
echo "    Nombre: $RISK_NAME"
echo ""

# 2. Obtener controles desde el endpoint del modal
echo "2. Obteniendo controles desde /api/risks/$RISK_ID/controls (usado en MODAL)..."
MODAL_CONTROLS=$(curl -s -X GET "$API_URL/api/risks/$RISK_ID/controls" \
  -H "Accept: application/json" --compressed)

MODAL_COUNT=$(echo "$MODAL_CONTROLS" | jq 'length')
echo "  ✓ Controles encontrados en MODAL: $MODAL_COUNT"

if [ "$MODAL_COUNT" -gt 0 ]; then
  echo "  Detalles:"
  echo "$MODAL_CONTROLS" | jq -r '.[] | "    - " + .control.code + ": " + .control.name + " (Effectiveness: " + (.control.effectiveness|tostring) + "%)"'
fi
echo ""

# 3. Obtener controles desde el endpoint de la tabla
echo "3. Obteniendo controles desde /api/risk-controls-with-details (usado en TABLA)..."
TABLE_CONTROLS=$(curl -s -X GET "$API_URL/api/risk-controls-with-details" \
  -H "Accept: application/json" --compressed | \
  jq "[.[] | select(.riskId == \"$RISK_ID\")]")

TABLE_COUNT=$(echo "$TABLE_CONTROLS" | jq 'length')
echo "  ✓ Controles encontrados en TABLA: $TABLE_COUNT"

if [ "$TABLE_COUNT" -gt 0 ]; then
  echo "  Detalles:"
  echo "$TABLE_CONTROLS" | jq -r '.[] | "    - " + .control.code + ": " + .control.name + " (Effectiveness: " + (.control.effectiveness|tostring) + "%)"'
fi
echo ""

# 4. Comparar resultados
echo "=========================================="
echo "RESUMEN DE COMPARACIÓN"
echo "=========================================="
echo ""
echo "Riesgo: $RISK_CODE ($RISK_NAME)"
echo "Controles en MODAL: $MODAL_COUNT"
echo "Controles en TABLA: $TABLE_COUNT"
echo ""

if [ "$MODAL_COUNT" -eq "$TABLE_COUNT" ]; then
  echo "✓ CONSISTENTE: Ambos endpoints muestran la misma cantidad de controles"
  
  # Verificar si son los mismos controles
  MODAL_IDS=$(echo "$MODAL_CONTROLS" | jq -r '.[].id' | sort)
  TABLE_IDS=$(echo "$TABLE_CONTROLS" | jq -r '.[].id' | sort)
  
  if [ "$MODAL_IDS" == "$TABLE_IDS" ]; then
    echo "✓ Los controles son exactamente los mismos"
  else
    echo "⚠️  ADVERTENCIA: La cantidad es igual pero los IDs son diferentes"
    echo ""
    echo "IDs en MODAL:"
    echo "$MODAL_IDS"
    echo ""
    echo "IDs en TABLA:"
    echo "$TABLE_IDS"
  fi
else
  echo "❌ INCONSISTENTE: Los endpoints muestran cantidades diferentes"
  echo ""
  echo "Diferencia: $((MODAL_COUNT - TABLE_COUNT))"
  
  if [ "$MODAL_COUNT" -gt "$TABLE_COUNT" ]; then
    echo ""
    echo "El MODAL muestra MÁS controles que la TABLA"
    echo "Esto sugiere que /api/risk-controls-with-details no retorna todas las asociaciones"
    
    # Encontrar qué controles están en el modal pero no en la tabla
    MODAL_CONTROL_IDS=$(echo "$MODAL_CONTROLS" | jq -r '.[].controlId')
    TABLE_CONTROL_IDS=$(echo "$TABLE_CONTROLS" | jq -r '.[].controlId')
    
    echo ""
    echo "Controles que SOLO aparecen en el MODAL:"
    for control_id in $MODAL_CONTROL_IDS; do
      if ! echo "$TABLE_CONTROL_IDS" | grep -q "$control_id"; then
        CONTROL_INFO=$(echo "$MODAL_CONTROLS" | jq -r ".[] | select(.controlId == \"$control_id\") | \"  - \" + .control.code + \": \" + .control.name")
        echo "$CONTROL_INFO"
        
        # Obtener detalles del control para diagnóstico
        CONTROL_DETAILS=$(curl -s -X GET "$API_URL/api/controls" -H "Accept: application/json" --compressed | \
          jq ".data[] | select(.id == \"$control_id\")")
        
        if [ ! -z "$CONTROL_DETAILS" ]; then
          CONTROL_STATUS=$(echo "$CONTROL_DETAILS" | jq -r '.status // "N/A"')
          CONTROL_TENANT=$(echo "$CONTROL_DETAILS" | jq -r '.tenantId // "N/A"')
          echo "    Status: $CONTROL_STATUS, TenantId: $CONTROL_TENANT"
        else
          echo "    ⚠️  Control no encontrado en /api/controls"
        fi
      fi
    done
  fi
fi

echo ""
echo "=========================================="
echo "DIAGNÓSTICO COMPLETADO"
echo "=========================================="
