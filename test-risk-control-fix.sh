#!/bin/bash
# Test script para verificar el fix de asociaciones riesgo-control
# Este script prueba que las asociaciones aparezcan inmediatamente después de crearse

set -e

API_URL="${API_URL:-http://localhost:5000}"
# Use actual existing IDs from the database
RISK_ID="${RISK_ID:-0d8db484-de5d-42f2-9f9c-353274e35e39}"  # R-0001
CONTROL_ID="${CONTROL_ID:-6315ee55-31f1-4b28-8e4e-9e2cd0cfeb85}"  # C-0003
RESIDUAL_RISK=25

echo "=================================================="
echo "Test: Verificación de asociaciones riesgo-control"
echo "=================================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Verificar estado inicial
echo "1. Verificando estado inicial del control..."
INITIAL_RESPONSE=$(curl -s -X GET "$API_URL/api/controls?limit=50&offset=0&paginate=true" \
  -H "Accept: application/json" --compressed)

INITIAL_COUNT=$(echo "$INITIAL_RESPONSE" | jq ".data[] | select(.id == \"$CONTROL_ID\") | .associatedRisksCount")

if [ -z "$INITIAL_COUNT" ]; then
  echo "  ⚠️  Control $CONTROL_ID no encontrado. Usando búsqueda por código..."
  CONTROL_CODE=$(curl -s -X GET "$API_URL/api/controls" -H "Accept: application/json" --compressed | \
    jq -r '.data[0].code // "C-0003"')
  echo "  Usando control con código: $CONTROL_CODE"
  INITIAL_COUNT=$(echo "$INITIAL_RESPONSE" | jq ".data[] | select(.code == \"$CONTROL_CODE\") | .associatedRisksCount")
fi

echo "  Estado inicial: $INITIAL_COUNT riesgos asociados"
echo ""

# 2. Crear nueva asociación
echo "2. Creando nueva asociación riesgo-control..."
CREATE_RESPONSE=$(curl -s -X POST "$API_URL/api/risks/$RISK_ID/controls" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  --compressed \
  -d "{\"controlId\": \"$CONTROL_ID\", \"residualRisk\": $RESIDUAL_RISK}")

ASSOCIATION_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id')

if [ "$ASSOCIATION_ID" == "null" ] || [ -z "$ASSOCIATION_ID" ]; then
  echo -e "  ${RED}✗ FALLO${NC}: No se pudo crear la asociación"
  echo "  Response: $CREATE_RESPONSE"
  exit 1
fi

echo -e "  ${GREEN}✓${NC} Asociación creada con ID: $ASSOCIATION_ID"
echo ""

# 3. Esperar brevemente para asegurar propagación
echo "3. Esperando propagación de datos..."
sleep 2
echo ""

# 4. Verificar que la asociación aparezca inmediatamente
echo "4. Verificando que la asociación aparezca en la API (sin caché)..."
AFTER_RESPONSE=$(curl -s -X GET "$API_URL/api/controls?limit=50&offset=0&paginate=true" \
  -H "Accept: application/json" \
  -H "Cache-Control: no-cache" \
  --compressed)

AFTER_COUNT=$(echo "$AFTER_RESPONSE" | jq ".data[] | select(.id == \"$CONTROL_ID\") | .associatedRisksCount")
AFTER_RISKS=$(echo "$AFTER_RESPONSE" | jq ".data[] | select(.id == \"$CONTROL_ID\") | .associatedRisks")

if [ -z "$AFTER_COUNT" ]; then
  # Buscar por código si no se encuentra por ID
  AFTER_COUNT=$(echo "$AFTER_RESPONSE" | jq ".data[] | select(.code == \"$CONTROL_CODE\") | .associatedRisksCount")
  AFTER_RISKS=$(echo "$AFTER_RESPONSE" | jq ".data[] | select(.code == \"$CONTROL_CODE\") | .associatedRisks")
fi

echo "  Estado después: $AFTER_COUNT riesgos asociados"
echo "  Riesgos: $AFTER_RISKS"
echo ""

# 5. Validar resultado
EXPECTED_COUNT=$((INITIAL_COUNT + 1))

if [ "$AFTER_COUNT" -eq "$EXPECTED_COUNT" ]; then
  echo -e "${GREEN}✓ ÉXITO${NC}: La asociación aparece inmediatamente"
  echo "  Expected: $EXPECTED_COUNT, Got: $AFTER_COUNT"
  
  # Limpiar: eliminar la asociación creada
  echo ""
  echo "5. Limpiando: eliminando asociación de prueba..."
  DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/api/risk-controls/$ASSOCIATION_ID" \
    -H "Accept: application/json")
  echo -e "  ${GREEN}✓${NC} Asociación eliminada"
  
  echo ""
  echo "=================================================="
  echo -e "${GREEN}TEST PASSED ✓${NC}"
  echo "=================================================="
  exit 0
else
  echo -e "${RED}✗ FALLO${NC}: La asociación NO aparece correctamente"
  echo "  Expected count: $EXPECTED_COUNT"
  echo "  Actual count: $AFTER_COUNT"
  echo "  Diferencia: $(($EXPECTED_COUNT - $AFTER_COUNT))"
  
  # Verificar si es problema de caché
  echo ""
  echo "6. Verificando directamente en endpoint de risk-controls..."
  ALL_ASSOCIATIONS=$(curl -s -X GET "$API_URL/api/risk-controls-with-details" \
    -H "Accept: application/json" --compressed)
  
  FOUND=$(echo "$ALL_ASSOCIATIONS" | jq ".[] | select(.controlId == \"$CONTROL_ID\") | .id")
  
  if [ ! -z "$FOUND" ]; then
    echo -e "  ${RED}✗ PROBLEMA DE CACHÉ${NC}: La asociación existe en DB pero no en /api/controls"
    echo "  Asociaciones encontradas para control $CONTROL_ID: $(echo "$ALL_ASSOCIATIONS" | jq ".[] | select(.controlId == \"$CONTROL_ID\")")"
  else
    echo -e "  ${RED}✗ PROBLEMA DE BACKEND${NC}: La asociación no existe en ningún endpoint"
  fi
  
  echo ""
  echo "=================================================="
  echo -e "${RED}TEST FAILED ✗${NC}"
  echo "=================================================="
  exit 1
fi
