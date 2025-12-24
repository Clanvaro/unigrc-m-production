# Ejecutar Migración risk_list_view

## Opción 1: Usando Cloud SQL Proxy (Recomendado para Local)

### Paso 1: Instalar Cloud SQL Proxy

```bash
# macOS
brew install cloud-sql-proxy

# O descargar manualmente
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64
chmod +x cloud-sql-proxy
sudo mv cloud-sql-proxy /usr/local/bin/
```

### Paso 2: Autenticar con Google Cloud

```bash
gcloud auth application-default login
```

### Paso 3: Iniciar Cloud SQL Proxy (en una terminal separada)

```bash
cloud-sql-proxy unigrc-m:southamerica-west1:unigrc-db --port=5432
```

**⚠️ IMPORTANTE:** Deja esta terminal abierta mientras ejecutas la migración.

### Paso 4: Configurar DATABASE_URL y Ejecutar

En otra terminal:

```bash
cd "/Users/claudiovalencia/Git Hub/unigrc-m-production"

# Configurar DATABASE_URL para conexión local vía proxy
export DATABASE_URL="postgresql://unigrc_user:UniGRC2025User!@localhost:5432/unigrc_db"

# Ejecutar migración
npm run apply-risk-list-view
```

---

## Opción 2: Ejecutar Directamente en Cloud SQL (Si tienes psql)

### Paso 1: Conectar a Cloud SQL

```bash
gcloud sql connect unigrc-db --project=unigrc-m --user=unigrc_user
```

### Paso 2: Ejecutar SQL

Una vez conectado, copia y pega el contenido de `migrations/create-risk-list-view.sql`:

```sql
-- Copiar todo el contenido del archivo migrations/create-risk-list-view.sql
```

O ejecutar directamente:

```bash
gcloud sql connect unigrc-db --project=unigrc-m --user=unigrc_user < migrations/create-risk-list-view.sql
```

---

## Opción 3: Ejecutar desde Cloud Build (Producción)

Crear un job de Cloud Build que ejecute la migración:

```bash
# Crear archivo cloudbuild-migration.yaml
cat > cloudbuild-migration.yaml << 'EOF'
steps:
  - name: 'node:20'
    entrypoint: 'npm'
    args: ['run', 'apply-risk-list-view']
    env:
      - 'DATABASE_URL=$$DATABASE_URL'
    secretEnv: ['DATABASE_URL']
availableSecrets:
  secretManager:
    - versionName: projects/unigrc-m/secrets/DATABASE_URL/versions/latest
      env: 'DATABASE_URL'
options:
  machineType: 'E2_HIGHCPU_8'
timeout: '600s'
EOF

# Ejecutar
gcloud builds submit --config=cloudbuild-migration.yaml --project=unigrc-m
```

---

## Opción 4: Ejecutar Manualmente en Consola SQL de GCP

1. Ve a [Google Cloud Console](https://console.cloud.google.com/sql/instances/unigrc-db/databases?project=unigrc-m)
2. Haz clic en "Open Cloud Shell" o usa la consola SQL
3. Selecciona la base de datos `unigrc_db`
4. Copia y pega el contenido de `migrations/create-risk-list-view.sql`
5. Ejecuta el script

---

## Verificación

Después de ejecutar la migración, verifica que se creó correctamente:

```sql
-- Verificar que la vista existe
SELECT COUNT(*) FROM risk_list_view;

-- Verificar índices
SELECT indexname FROM pg_indexes WHERE tablename = 'risk_list_view';

-- Deberías ver:
-- ux_risk_list_view_id (único, requerido)
-- idx_risk_list_view_status
-- idx_risk_list_view_macroproceso
-- idx_risk_list_view_process
-- idx_risk_list_view_subproceso
-- idx_risk_list_view_created_at
-- idx_risk_list_view_search
-- idx_risk_list_view_filters
```

---

## Notas Importantes

1. **La migración es idempotente**: Puedes ejecutarla múltiples veces sin problemas (usa `IF NOT EXISTS`)

2. **Tiempo de ejecución**: Depende del tamaño de datos, pero típicamente toma 10-30 segundos

3. **Bloqueo**: `REFRESH MATERIALIZED VIEW CONCURRENTLY` no bloquea lecturas, pero requiere el índice único

4. **Si falla**: Verifica que:
   - Tienes permisos de escritura en la base de datos
   - La conexión a la base de datos funciona
   - No hay otra migración ejecutándose

---

## Troubleshooting

### Error: "materialized view risk_list_view does not exist"
- Ejecuta la migración completa primero

### Error: "cannot refresh materialized view concurrently without unique index"
- Verifica que el índice `ux_risk_list_view_id` existe
- Si no existe, ejecuta: `CREATE UNIQUE INDEX ux_risk_list_view_id ON risk_list_view(id);`

### Error: "permission denied"
- Verifica que el usuario `unigrc_user` tiene permisos de CREATE y REFRESH

### Error: "connection timeout"
- Verifica que Cloud SQL Proxy está corriendo (Opción 1)
- O que tu IP está autorizada en Cloud SQL (Settings > Connections > Authorized networks)

