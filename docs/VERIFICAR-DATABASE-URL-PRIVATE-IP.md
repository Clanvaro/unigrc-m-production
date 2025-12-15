# Verificar y Actualizar DATABASE_URL para usar IP Privada

## Problema
El log muestra `connectionType: IP pública` y latencia alta (1901ms), lo que indica que aunque el VPC Connector está configurado, el `DATABASE_URL` todavía está usando la IP pública.

## Verificación Actual

### 1. Verificar IP Privada de Cloud SQL
```bash
# Obtener la IP privada de Cloud SQL
gcloud sql instances describe unigrc-db \
  --format="value(ipAddresses[?type=='PRIVATE'].ipAddress)"
```

### 2. Verificar DATABASE_URL actual en Secret Manager
```bash
# Ver el DATABASE_URL actual (sin mostrar la contraseña completa)
gcloud secrets versions access latest --secret="DATABASE_URL" | sed 's/:[^@]*@/:***@/'
```

### 3. Verificar si DATABASE_URL usa IP privada
El DATABASE_URL debería tener formato:
```
postgresql://user:password@10.x.x.x:5432/database?sslmode=disable
```

Si tiene formato:
```
postgresql://user:password@34.x.x.x:5432/database?sslmode=require
```
Entonces está usando IP pública (34.x.x.x es una IP pública de GCP).

## Solución: Actualizar DATABASE_URL

### Paso 1: Obtener IP Privada
```bash
PRIVATE_IP=$(gcloud sql instances describe unigrc-db \
  --format="value(ipAddresses[?type=='PRIVATE'].ipAddress)")

echo "Cloud SQL Private IP: $PRIVATE_IP"
```

### Paso 2: Obtener DATABASE_URL actual y extraer credenciales
```bash
# Obtener DATABASE_URL completo
CURRENT_DB_URL=$(gcloud secrets versions access latest --secret="DATABASE_URL")

# Extraer componentes (ajustar según tu formato)
# Formato esperado: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?PARAMS
```

### Paso 3: Crear nuevo DATABASE_URL con IP privada
```bash
# Extraer usuario, contraseña y base de datos del URL actual
# Ejemplo si el formato es: postgresql://user:pass@host:5432/db?params

# Crear nuevo URL con IP privada
# IMPORTANTE: Usar sslmode=disable para IP privada (más rápido, seguro dentro de VPC)
NEW_DB_URL="postgresql://USER:PASSWORD@${PRIVATE_IP}:5432/DATABASE?sslmode=disable"

# Agregar nueva versión al secret
echo -n "$NEW_DB_URL" | gcloud secrets versions add DATABASE_URL --data-file=-

# Verificar
gcloud secrets versions access latest --secret="DATABASE_URL" | sed 's/:[^@]*@/:***@/'
```

### Paso 4: Verificar después del despliegue
Después del próximo despliegue, los logs deberían mostrar:
```
[DB Config] Using: Google Cloud SQL via IP privada (VPC), host: 10.x.x.x
```

En lugar de:
```
[DB Config] Using: Google Cloud SQL via IP pública, host: 34.x.x.x
```

## Notas Importantes

1. **sslmode=disable**: Para conexiones por IP privada dentro de VPC, SSL no es necesario y añade latencia. Usar `sslmode=disable` es seguro dentro de la red privada.

2. **VPC Connector**: Asegúrate de que Cloud Run tenga el VPC Connector configurado:
```bash
gcloud run services describe unigrc-backend \
  --region=southamerica-west1 \
  --format="value(spec.template.metadata.annotations.'run.googleapis.com/vpc-access-connector')"
```

3. **VPC Egress**: Debe estar configurado como `private-ranges-only` o `all-traffic`:
```bash
gcloud run services describe unigrc-backend \
  --region=southamerica-west1 \
  --format="value(spec.template.metadata.annotations.'run.googleapis.com/vpc-access-egress')"
```

## Troubleshooting

### Si la IP privada no está disponible:
```bash
# Verificar si Cloud SQL tiene Private IP habilitada
gcloud sql instances describe unigrc-db \
  --format="yaml(ipAddresses)"
```

### Si el VPC Connector no está conectado:
Verificar en `cloudbuild-backend.yaml` que tenga:
```yaml
- '--vpc-connector=unigrc-connector'
- '--vpc-egress=private-ranges-only'
```
