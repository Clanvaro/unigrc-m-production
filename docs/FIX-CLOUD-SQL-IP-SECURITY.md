# Fix: Remover 0.0.0.0/0 de Cloud SQL - Usar Unix Socket

## Problema
Cloud SQL tiene `0.0.0.0/0` en las redes autorizadas, lo cual permite acceso desde cualquier IP y es un riesgo de seguridad.

## Solución Recomendada: Usar Cloud SQL Proxy (Unix Socket)

Cloud Run ya tiene configurado `--add-cloudsql-instances`, por lo que podemos usar Unix socket en lugar de IP pública. Esto elimina la necesidad de redes autorizadas públicas.

### Paso 1: Verificar DATABASE_URL actual

```bash
# Ver el DATABASE_URL actual en Secret Manager
gcloud secrets versions access latest --secret="DATABASE_URL"
```

### Paso 2: Actualizar DATABASE_URL a formato Unix Socket

**Formato Unix Socket (Recomendado):**
```
postgresql://unigrc_user:<PASSWORD>@/unigrc_db?host=/cloudsql/unigrc-m:southamerica-west1:unigrc-db
```

**Ejemplo:**
```bash
# Obtener la contraseña actual (si la conoces)
# Luego crear nueva versión del secret con formato Unix socket
gcloud secrets versions add DATABASE_URL \
  --data-file=- <<EOF
postgresql://unigrc_user:TU_PASSWORD_AQUI@/unigrc_db?host=/cloudsql/unigrc-m:southamerica-west1:unigrc-db
EOF
```

**⚠️ IMPORTANTE:** Reemplaza `TU_PASSWORD_AQUI` con la contraseña real del usuario `unigrc_user`.

### Paso 3: Remover todas las redes autorizadas (incluyendo 0.0.0.0/0)

Una vez que DATABASE_URL use Unix socket, puedes remover todas las redes autorizadas públicas:

```bash
# Listar redes autorizadas actuales
gcloud sql instances describe unigrc-db \
  --format="value(settings.ipConfiguration.authorizedNetworks)"

# Remover todas las redes autorizadas (incluyendo 0.0.0.0/0)
gcloud sql instances patch unigrc-db \
  --clear-authorized-networks
```

### Paso 4: Verificar que Cloud Run puede conectarse

Después de hacer el cambio, verifica que Cloud Run puede conectarse:

1. Revisa los logs de Cloud Run para ver si hay errores de conexión
2. Verifica que el servicio funciona correctamente

### Paso 5: (Opcional) Deshabilitar IP pública si no la necesitas

Si solo usas Unix socket y no necesitas acceso desde fuera de GCP:

```bash
# Deshabilitar IP pública (solo si no necesitas acceso externo)
gcloud sql instances patch unigrc-db \
  --no-assign-ip
```

**⚠️ ADVERTENCIA:** Esto eliminará completamente el acceso por IP pública. Solo hazlo si estás 100% seguro de que no necesitas acceso externo.

## Alternativa: Si necesitas mantener IP pública

Si por alguna razón necesitas mantener IP pública, puedes:

1. **Obtener IPs de salida de Cloud Run** (pero estas cambian dinámicamente)
2. **Usar Private IP** (requiere VPC y configuración adicional)

Sin embargo, **Unix socket es la mejor opción** porque:
- ✅ No requiere IPs públicas
- ✅ Más rápido (<10ms vs 100-1000ms)
- ✅ Más seguro (conexión interna)
- ✅ Ya está configurado en Cloud Run

## Verificación

Después de los cambios, verifica:

1. ✅ DATABASE_URL usa formato Unix socket (`/cloudsql/...`)
2. ✅ No hay redes autorizadas públicas (`--clear-authorized-networks`)
3. ✅ Cloud Run puede conectarse (revisar logs)
4. ✅ La aplicación funciona correctamente

## Rollback (si algo falla)

Si necesitas revertir los cambios:

```bash
# Restaurar IP pública (si la deshabilitaste)
gcloud sql instances patch unigrc-db \
  --assign-ip

# Volver a agregar 0.0.0.0/0 temporalmente (solo para debugging)
gcloud sql instances patch unigrc-db \
  --authorized-networks=0.0.0.0/0

# Restaurar DATABASE_URL anterior desde Secret Manager
# (ver historial de versiones del secret)
```
