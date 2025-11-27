#!/bin/bash

# Script de prueba para validación por batch
# Verifica que las validaciones "observed" y "rejected" se guarden correctamente

echo "================================"
echo "PRUEBA DE VALIDACIÓN POR BATCH"
echo "================================"
echo ""

# Obtener un batch token activo
echo "1. Buscando batch token activo..."
TOKEN_DATA=$(psql $DATABASE_URL -t -c "SELECT token, entity_ids[1] FROM batch_validation_tokens WHERE type='control' AND is_used=false AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1;")

if [ -z "$TOKEN_DATA" ]; then
  echo "❌ No hay batch tokens activos para probar"
  echo "Por favor, notifica un control para validación primero"
  exit 1
fi

TOKEN=$(echo $TOKEN_DATA | awk '{print $1}')
ENTITY_ID=$(echo $TOKEN_DATA | awk '{print $3}')

echo "✓ Token encontrado: $TOKEN"
echo "✓ Entity ID: $ENTITY_ID"
echo ""

# Obtener estado actual del control
echo "2. Estado ANTES de la validación:"
psql $DATABASE_URL -c "SELECT code, name, validation_status, validated_by, validation_comments FROM controls WHERE id='$ENTITY_ID';"
echo ""

# Hacer validación como "observed"
echo "3. Enviando validación como 'observed'..."
RESPONSE=$(curl -s -X POST "http://localhost:5000/api/batch-validations/$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "validations": [{
      "entityId": "'"$ENTITY_ID"'",
      "action": "observed",
      "comments": "Test de validación observada desde script"
    }]
  }')

echo "Respuesta del servidor:"
echo "$RESPONSE" | jq '.'
echo ""

# Esperar un momento para que se procese
sleep 2

# Verificar estado DESPUÉS de la validación
echo "4. Estado DESPUÉS de la validación:"
psql $DATABASE_URL -c "SELECT code, name, validation_status, validated_by, validation_comments FROM controls WHERE id='$ENTITY_ID';"
echo ""

# Verificar audit log
echo "5. Verificando audit log (debe tener user_id = NULL):"
psql $DATABASE_URL -c "SELECT entity_type, action, user_id, changes->>'validationStatus' as new_status FROM audit_logs WHERE entity_id='$ENTITY_ID' AND action='batch_email_validation' ORDER BY timestamp DESC LIMIT 1;"
echo ""

# Verificar query del endpoint
echo "6. Consultando endpoint de controles observados:"
curl -s "http://localhost:5000/api/controls/validation/observed" \
  -H "Cookie: connect.sid=$(cat .session-cookie 2>/dev/null || echo '')" | jq 'length'
echo " controles observados encontrados"
echo ""

echo "================================"
echo "PRUEBA COMPLETADA"
echo "================================"
