#!/bin/bash

echo "========================================="
echo "PRUEBA FINAL DE VALIDACIÓN POR BATCH"
echo "========================================="

# Obtener un token activo sin usar
TOKEN_DATA=$(psql $DATABASE_URL -t -A -c "
  SELECT token, entity_ids[1] 
  FROM batch_validation_tokens 
  WHERE type='control' 
    AND is_used=false 
    AND expires_at > NOW() 
  ORDER BY created_at DESC 
  LIMIT 1;
")

if [ -z "$TOKEN_DATA" ]; then
  echo "✗ No hay batch tokens activos"
  exit 1
fi

TOKEN=$(echo $TOKEN_DATA | cut -d'|' -f1)
ENTITY_ID=$(echo $TOKEN_DATA | cut -d'|' -f2)

echo "✓ Token: ${TOKEN:0:20}..."
echo "✓ Entity ID: $ENTITY_ID"
echo ""

# Estado ANTES
echo "1. ESTADO ANTES DE LA VALIDACIÓN:"
psql $DATABASE_URL -c "SELECT code, validation_status, validated_by FROM controls WHERE id='$ENTITY_ID';"
echo ""

# Enviar validación como "observed"
echo "2. ENVIANDO VALIDACIÓN COMO 'OBSERVED'..."
RESPONSE=$(curl -s -X POST "http://localhost:5000/api/batch-validations/$TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"validations\": [{
      \"entityId\": \"$ENTITY_ID\",
      \"action\": \"observed\",
      \"comments\": \"Test final - validación observada\"
    }]
  }")

echo "$RESPONSE"
echo ""

# Esperar procesamiento
sleep 2

# Estado DESPUÉS
echo "3. ESTADO DESPUÉS DE LA VALIDACIÓN:"
psql $DATABASE_URL -c "SELECT code, validation_status, validated_by, validation_comments FROM controls WHERE id='$ENTITY_ID';"
echo ""

# Verificar audit log
echo "4. AUDIT LOG (user_id debe ser NULL):"
psql $DATABASE_URL -c "SELECT action, user_id, changes->>'validationStatus' as status FROM audit_logs WHERE entity_id='$ENTITY_ID' AND action='batch_email_validation' ORDER BY timestamp DESC LIMIT 1;"
echo ""

# Consultar endpoint de controles observados
echo "5. CONSULTANDO /api/controls/validation/observed:"
COUNT=$(curl -s "http://localhost:5000/api/controls/validation/observed" | jq 'length')
echo "$COUNT controles observados encontrados"

echo ""
echo "========================================="
echo "PRUEBA COMPLETADA"
echo "========================================="
