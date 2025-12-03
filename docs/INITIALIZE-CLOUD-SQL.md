# Inicialización de Base de Datos en Cloud SQL

Este documento explica cómo inicializar la base de datos en Google Cloud SQL después del primer deploy.

## Prerrequisitos

1. ✅ Cloud SQL instance creada (`unigrc-db`)
2. ✅ Usuario de base de datos creado (`unigrc_user`)
3. ✅ Base de datos creada (`unigrc_db`)
4. ✅ Secret `DATABASE_URL` configurado en Secret Manager
5. ✅ Backend desplegado en Cloud Run

## Opción 1: Inicialización desde tu máquina local (Recomendado)

### Paso 1: Instalar Cloud SQL Proxy

```bash
# macOS
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64
chmod +x cloud-sql-proxy

# Linux
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.amd64
chmod +x cloud-sql-proxy

# Windows
# Descargar desde: https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.windows.amd64.exe
```

### Paso 2: Iniciar Cloud SQL Proxy

En una terminal separada:

```bash
./cloud-sql-proxy unigrc-m:southamerica-west1:unigrc-db --port=5432
```

Esto creará un túnel local en `localhost:5432` que se conecta a Cloud SQL.

### Paso 3: Configurar DATABASE_URL local

```bash
export DATABASE_URL="postgresql://unigrc_user:UniGRC2025User!@localhost:5432/unigrc_db"
```

**Nota:** Reemplaza la contraseña con la contraseña real de tu base de datos.

### Paso 4: Ejecutar script de inicialización

```bash
npm run db:init
```

Este script:
- ✅ Crea todas las tablas del esquema
- ✅ Crea el usuario administrador inicial

### Paso 5: Credenciales de acceso

Después de la inicialización, verás:

```
✅ Usuario administrador creado exitosamente!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Credenciales de acceso:
   Username: admin
   Email: admin@unigrc.local
   Password: admin123
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  IMPORTANTE: Cambia esta contraseña inmediatamente después del primer login!
```

## Opción 2: Inicialización desde Cloud Run (Alternativa)

Si no puedes usar Cloud SQL Proxy localmente, puedes ejecutar el script desde Cloud Run:

### Paso 1: Conectar a Cloud Run

```bash
gcloud run services proxy unigrc-backend \
  --region=southamerica-west1 \
  --port=5000
```

### Paso 2: Ejecutar script de inicialización

```bash
# Obtener el nombre del pod/revisión
REVISION=$(gcloud run revisions list \
  --service=unigrc-backend \
  --region=southamerica-west1 \
  --format="value(name)" \
  --limit=1)

# Ejecutar el script en el contenedor
gcloud run services update unigrc-backend \
  --region=southamerica-west1 \
  --command="node" \
  --args="dist/scripts/init-cloud-sql.js"
```

**Nota:** Esta opción requiere que el script esté compilado en la imagen Docker.

## Opción 3: Inicialización manual con SQL

Si prefieres hacerlo manualmente:

### Paso 1: Conectar a Cloud SQL

```bash
gcloud sql connect unigrc-db --user=unigrc_user
```

### Paso 2: Ejecutar migraciones

```bash
# Desde tu máquina local con Cloud SQL Proxy activo
npm run db:push
```

### Paso 3: Crear usuario admin manualmente

```sql
-- Conectar a la base de datos
\c unigrc_db

-- Insertar usuario admin (la contraseña es el hash de 'admin123')
-- Necesitarás generar el hash con bcrypt primero
INSERT INTO users (id, username, email, "passwordHash", "fullName", "isActive", "isPlatformAdmin")
VALUES (
  gen_random_uuid(),
  'admin',
  'admin@unigrc.local',
  '$2b$10$...', -- Hash de bcrypt para 'admin123'
  'Administrador del Sistema',
  true,
  true
);
```

## Verificación

Después de la inicialización, verifica que todo esté correcto:

1. **Verificar esquema:**
   ```bash
   # Con Cloud SQL Proxy activo
   psql $DATABASE_URL -c "\dt"
   ```

2. **Verificar usuario admin:**
   ```bash
   psql $DATABASE_URL -c "SELECT username, email, \"isActive\", \"isPlatformAdmin\" FROM users WHERE username = 'admin';"
   ```

3. **Probar login:**
   - Ve a la URL del frontend
   - Intenta hacer login con:
     - Username: `admin`
     - Password: `admin123`

## Solución de Problemas

### Error: "connection requires a valid client certificate"

**Solución:** Asegúrate de usar Cloud SQL Proxy o que el `DATABASE_URL` use el formato de socket Unix:
```
postgresql://user:pass@/db?host=/cloudsql/unigrc-m:southamerica-west1:unigrc-db
```

### Error: "relation does not exist"

**Solución:** El esquema no se ha creado. Ejecuta:
```bash
npm run db:push
```

### Error: "duplicate key value violates unique constraint"

**Solución:** El usuario admin ya existe. Esto es normal si ya ejecutaste el script antes.

## Seguridad

⚠️ **IMPORTANTE:**
- Cambia la contraseña del usuario admin inmediatamente después del primer login
- No compartas las credenciales por defecto
- Considera usar un password manager para generar contraseñas seguras
- Habilita autenticación de dos factores si está disponible

## Próximos Pasos

Después de la inicialización:

1. ✅ Cambiar contraseña del usuario admin
2. ✅ Configurar tu organización/tenant
3. ✅ Crear usuarios adicionales según sea necesario
4. ✅ Configurar permisos y roles

