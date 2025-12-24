# Cómo Ejecutar `npm run db:push` Localmente

## Problema
El `DATABASE_URL` en Secret Manager usa formato Unix socket (`host=/cloudsql/...`), que solo funciona en Cloud Run o con Cloud SQL Proxy.

## Solución: Usar Cloud SQL Proxy

### Paso 1: Instalar Cloud SQL Proxy

```bash
# macOS
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64
chmod +x cloud-sql-proxy
sudo mv cloud-sql-proxy /usr/local/bin/

# O usar Homebrew
brew install cloud-sql-proxy
```

### Paso 2: Autenticar con Google Cloud

```bash
gcloud auth application-default login
```

### Paso 3: Iniciar Cloud SQL Proxy (en una terminal separada)

```bash
cloud-sql-proxy unigrc-m:southamerica-west1:unigrc-db --port=5432
```

**⚠️ IMPORTANTE:** Deja esta terminal abierta mientras ejecutas `db:push`.

### Paso 4: Configurar DATABASE_URL local

En otra terminal, ejecuta:

```bash
# Obtener contraseña del secret
export DB_PASSWORD=$(gcloud secrets versions access latest --secret=DATABASE_URL --project=unigrc-m | grep -oP ':[^@]+@' | sed 's/://' | sed 's/@//')

# Configurar DATABASE_URL para conexión local vía proxy
export DATABASE_URL="postgresql://unigrc_user:${DB_PASSWORD}@localhost:5432/unigrc_db"
```

O manualmente (reemplaza `UniGRC2025User!` con tu contraseña real):

```bash
export DATABASE_URL="postgresql://unigrc_user:UniGRC2025User!@localhost:5432/unigrc_db"
```

### Paso 5: Ejecutar db:push

```bash
npm run db:push
```

---

## Opción 2: Usar IP Pública (Alternativa)

Si no quieres usar Cloud SQL Proxy, puedes usar la IP pública de Cloud SQL:

### Paso 1: Obtener IP pública

```bash
gcloud sql instances describe unigrc-db \
  --project=unigrc-m \
  --format="value(ipAddresses[?type=='PRIMARY'].ipAddress)"
```

### Paso 2: Configurar DATABASE_URL con IP pública

```bash
# Obtener contraseña
export DB_PASSWORD=$(gcloud secrets versions access latest --secret=DATABASE_URL --project=unigrc-m | grep -oP ':[^@]+@' | sed 's/://' | sed 's/@//')

# Obtener IP pública
export DB_IP=$(gcloud sql instances describe unigrc-db --project=unigrc-m --format="value(ipAddresses[?type=='PRIMARY'].ipAddress)")

# Configurar DATABASE_URL
export DATABASE_URL="postgresql://unigrc_user:${DB_PASSWORD}@${DB_IP}:5432/unigrc_db?sslmode=require"
```

### Paso 3: Ejecutar db:push

```bash
npm run db:push
```

**⚠️ NOTA:** Asegúrate de que tu IP esté autorizada en Cloud SQL (Settings > Connections > Authorized networks).

---

## Opción 3: Ejecutar en Cloud Build (Recomendado para Producción)

En lugar de ejecutar localmente, puedes crear un script que ejecute `db:push` en Cloud Build:

```bash
# Crear script en scripts/apply-schema.sh
gcloud builds submit --config=cloudbuild-schema.yaml
```

Esto ejecuta `db:push` en un entorno que ya tiene acceso a Cloud SQL.

---

## Opción 4: Aplicar Índices Directamente con SQL (Más Rápido)

Si solo necesitas crear los índices (sin ejecutar todo `db:push`), puedes aplicar el script SQL directamente:

### Paso 1: Obtener DATABASE_URL

```bash
# Obtener DATABASE_URL desde Secret Manager
gcloud secrets versions access latest --secret=DATABASE_URL --project=unigrc-m
```

### Paso 2: Aplicar script SQL

```bash
# Opción A: Con psql (si tienes acceso directo)
psql "$DATABASE_URL" -f scripts/apply-performance-indexes-dec24.sql

# Opción B: Con gcloud sql connect
gcloud sql connect unigrc-db --project=unigrc-m --user=unigrc_user
# Luego ejecutar: \i scripts/apply-performance-indexes-dec24.sql
```

### Paso 3: Verificar índices creados

```bash
psql "$DATABASE_URL" -c "
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('risks', 'risk_controls', 'risk_process_links')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
"
```

Deberías ver los nuevos índices:
- `idx_risks_active_created`
- `idx_risks_process_active`
- `idx_risks_subproceso_active`
- `idx_risks_macroproceso_active`
- `idx_rc_risk_residual`
- `idx_rpl_validation_notification_created`

---

## Verificación

Después de ejecutar cualquiera de las opciones, verifica que los índices se crearon:

```bash
# Conectar a la base de datos
psql "$DATABASE_URL" -c "\d+ risks" | grep idx_risks
psql "$DATABASE_URL" -c "\d+ risk_controls" | grep idx_rc
psql "$DATABASE_URL" -c "\d+ risk_process_links" | grep idx_rpl
```

