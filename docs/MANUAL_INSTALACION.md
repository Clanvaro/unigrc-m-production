# Manual de Instalación y Despliegue - Unigrc

**Versión:** 2.0.0  
**Fecha:** Octubre 2025  
**Plataforma:** Unigrc (anteriormente RiskMatrix Pro)  
**Entornos:** Replit / Linux / macOS

---

## Índice

1. [Requisitos del Sistema](#1-requisitos-del-sistema)
2. [Instalación en Replit](#2-instalación-en-replit)
3. [Instalación Local](#3-instalación-local)
4. [Configuración de Base de Datos](#4-configuración-de-base-de-datos)
5. [Configuración de Servicios Externos](#5-configuración-de-servicios-externos)
6. [Despliegue en Producción](#6-despliegue-en-producción)
7. [Verificación y Testing](#7-verificación-y-testing)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Requisitos del Sistema

### 1.1 Requisitos de Software

#### Para Desarrollo
- **Node.js:** 20.x o superior
- **npm:** 10.x o superior
- **PostgreSQL:** 16.x o superior
- **Git:** Para control de versiones

#### Recomendado
- **Redis:** 7.x (opcional, para colas de trabajo)
- **Docker:** Para ambiente consistente (opcional)

### 1.2 Requisitos de Hardware

#### Mínimo (Desarrollo)
- **CPU:** 2 cores
- **RAM:** 4 GB
- **Disco:** 10 GB libres

#### Recomendado (Producción)
- **CPU:** 4+ cores
- **RAM:** 8+ GB
- **Disco:** 50+ GB libres
- **Ancho de banda:** 100 Mbps+

### 1.3 Servicios Externos Necesarios

1. **Base de Datos PostgreSQL**
   - Neon (recomendado)
   - AWS RDS
   - Google Cloud SQL
   - PostgreSQL auto-hospedado

2. **Almacenamiento de Archivos**
   - Google Cloud Storage (recomendado)
   - AWS S3
   - Azure Blob Storage

3. **Email (opcional)**
   - Mailgun (recomendado - servicio actual)
   - mailgun (legacy)
   - AWS SES

4. **SMS (opcional)**
   - Twilio (recomendado)
   - AWS SNS

5. **AI Assistant (opcional)**
   - Azure OpenAI (GPT-4o-mini)

---

## 2. Instalación en Replit

### 2.1 Crear un Nuevo Repl

1. Inicie sesión en [Replit](https://replit.com)

2. Haga clic en **+ Create Repl**

3. Seleccione **Import from GitHub:**
   ```
   https://github.com/your-org/riskmatrix-pro
   ```
   
   O cree un **Node.js Repl** vacío

4. Nombre su Repl: `riskmatrix-pro`

5. Haga clic en **Create Repl**

### 2.2 Configurar el Entorno

#### Instalar Dependencias
Las dependencias se instalan automáticamente al abrir el Repl. Si necesita reinstalarlas:

```bash
npm install
```

#### Configurar Variables de Entorno
1. Vaya a la pestaña **Secrets** (🔒) en el panel izquierdo

2. Agregue las siguientes variables:

```bash
# Base de Datos (Neon)
DATABASE_URL=postgresql://usuario:contraseña@host:5432/database

# Seguridad
SESSION_SECRET=genere_un_string_aleatorio_seguro_aquí
CSRF_SECRET=genere_otro_string_aleatorio_aquí

# Google Cloud Storage (si usa almacenamiento de archivos)
GOOGLE_CLOUD_PROJECT=nombre-del-proyecto
GOOGLE_CLOUD_KEYFILE=/path/to/keyfile.json
PUBLIC_OBJECT_SEARCH_PATHS=/public
PRIVATE_OBJECT_DIR=/.private

# Mailgun (Email - servicio actual)
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=sandbox3155d69a4f5e49a8a25ed300851fd478.mailgun.org

# Azure OpenAI (AI Assistant - opcional)
AZURE_OPENAI_API_KEY=your_azure_openai_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Twilio (opcional)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Entorno
NODE_ENV=production
```

### 2.3 Configurar Base de Datos PostgreSQL (Neon)

#### Crear Base de Datos en Neon

1. Vaya a [Neon Console](https://console.neon.tech)

2. Haga clic en **Create a project**

3. Configure:
   - **Project Name:** riskmatrix-pro
   - **PostgreSQL Version:** 16
   - **Region:** Seleccione la más cercana a sus usuarios

4. Haga clic en **Create Project**

5. Copie la **Connection String:**
   ```
   postgresql://usuario:contraseña@ep-xxx.region.neon.tech/riskmatrix
   ```

6. Péguelo en la variable `DATABASE_URL` en Secrets

#### Inicializar el Schema

En la shell de Replit:

```bash
# Push schema to database
npm run db:push
```

Si hay conflictos (primera vez):
```bash
npm run db:push --force
```

### 2.4 Iniciar la Aplicación

El workflow **Start application** ya está configurado. Simplemente:

1. Haga clic en el botón ▶️ **Run**

2. La aplicación se iniciará automáticamente en el puerto 5000

3. Replit mostrará la URL pública:
   ```
   https://riskmatrix-pro.your-username.repl.co
   ```

### 2.5 Crear Usuario Administrador Inicial

#### Opción 1: Desde la Shell de Replit

Cree un script temporal `scripts/create-admin.ts`:

```typescript
import { db } from '../server/db';
import { users, roles, userRoles } from '../shared/schema';
import bcrypt from 'bcrypt';

async function createAdmin() {
  // Hash password
  const passwordHash = await bcrypt.hash('admin123', 10);
  
  // Create admin user
  const [user] = await db.insert(users).values({
    username: 'admin',
    email: 'admin@riskmatrixpro.com',
    passwordHash,
    fullName: 'Administrador del Sistema',
    isActive: true
  }).returning();
  
  // Get or create admin role
  let [adminRole] = await db.select().from(roles).where(eq(roles.name, 'admin'));
  
  if (!adminRole) {
    [adminRole] = await db.insert(roles).values({
      name: 'admin',
      description: 'Administrador del sistema',
      permissions: JSON.stringify(['*']),  // Todos los permisos
      isSystem: true
    }).returning();
  }
  
  // Assign role
  await db.insert(userRoles).values({
    userId: user.id,
    roleId: adminRole.id
  });
  
  console.log('✅ Admin user created successfully!');
  console.log('Username:', user.username);
  console.log('Password: admin123');
  console.log('⚠️  CHANGE THIS PASSWORD IMMEDIATELY!');
  
  process.exit(0);
}

createAdmin().catch(console.error);
```

Ejecute:
```bash
npx tsx scripts/create-admin.ts
```

#### Opción 2: Inserción SQL Directa

Desde la consola de Neon o cualquier cliente PostgreSQL:

```sql
-- Crear usuario
INSERT INTO users (id, username, email, password_hash, full_name, is_active)
VALUES (
  gen_random_uuid(),
  'admin',
  'admin@riskmatrixpro.com',
  '$2b$10$...',  -- Use bcrypt para hashear 'admin123'
  'Administrador del Sistema',
  true
);

-- Crear rol admin
INSERT INTO roles (id, name, description, permissions, is_system)
VALUES (
  gen_random_uuid(),
  'admin',
  'Administrador del sistema',
  '["*"]',
  true
);

-- Asignar rol
INSERT INTO user_roles (id, user_id, role_id)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM users WHERE username = 'admin'),
  (SELECT id FROM roles WHERE name = 'admin')
);
```

---

## 3. Instalación Local

### 3.1 Clonar el Repositorio

```bash
git clone https://github.com/your-org/riskmatrix-pro.git
cd riskmatrix-pro
```

### 3.2 Instalar Dependencias

```bash
npm install
```

### 3.3 Configurar Variables de Entorno

Cree un archivo `.env` en la raíz:

```bash
# .env
DATABASE_URL=postgresql://localhost:5432/riskmatrix
SESSION_SECRET=your_session_secret_here
CSRF_SECRET=your_csrf_secret_here
NODE_ENV=development

# Google Cloud Storage (opcional)
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_KEYFILE=./credentials/gcs-keyfile.json

# Mailgun (Email - servicio actual)
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_domain.mailgun.org

# Azure OpenAI (AI Assistant - opcional)
AZURE_OPENAI_API_KEY=your_azure_openai_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Twilio (opcional)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
```

### 3.4 Configurar PostgreSQL Local

#### Instalar PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql-16 postgresql-contrib
```

**macOS (Homebrew):**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Windows:**
Descargue el instalador desde [postgresql.org](https://www.postgresql.org/download/windows/)

#### Crear Base de Datos

```bash
# Acceder a PostgreSQL
sudo -u postgres psql

# En la consola de PostgreSQL:
CREATE DATABASE riskmatrix;
CREATE USER riskmatrix_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE riskmatrix TO riskmatrix_user;
\q
```

Actualice `DATABASE_URL` en `.env`:
```
DATABASE_URL=postgresql://riskmatrix_user:secure_password@localhost:5432/riskmatrix
```

### 3.5 Inicializar Schema

```bash
npm run db:push
```

### 3.6 Iniciar en Modo Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en:
```
http://localhost:5000
```

---

## 4. Configuración de Base de Datos

### 4.1 Configuración de Neon (Recomendado)

#### Ventajas de Neon
- ✅ Serverless: escala automáticamente
- ✅ Branching: múltiples ambientes fácilmente
- ✅ Backups automáticos
- ✅ Gratis para proyectos pequeños

#### Límites del Plan Gratuito
- 512 MB de almacenamiento
- 3 GB de transferencia/mes
- 1 proyecto

#### Configuración de Connection Pooling

Neon incluye pooling automático. Actualice su connection string:

```
DATABASE_URL=postgresql://usuario:contraseña@ep-xxx.region.neon.tech/database?sslmode=require&pooler=true
```

### 4.2 Configuración de PostgreSQL Auto-hospedado

#### Configuración Recomendada (postgresql.conf)

```conf
# Conexiones
max_connections = 100
shared_buffers = 256MB

# WAL (Write-Ahead Logging)
wal_level = replica
max_wal_senders = 3
wal_keep_size = 1GB

# Autovacuum
autovacuum = on
autovacuum_naptime = 1min

# Performance
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
random_page_cost = 1.1

# Logging
log_destination = 'stderr'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_line_prefix = '%m [%p] %u@%d '
log_min_duration_statement = 1000  # Log queries > 1s
```

#### Backups Automatizados

Cree un script de backup:

```bash
#!/bin/bash
# backup-db.sh

BACKUP_DIR="/var/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="riskmatrix"

mkdir -p $BACKUP_DIR

# Backup completo
pg_dump $DB_NAME | gzip > $BACKUP_DIR/riskmatrix_$DATE.sql.gz

# Mantener solo los últimos 7 días
find $BACKUP_DIR -name "riskmatrix_*.sql.gz" -mtime +7 -delete

echo "Backup completado: riskmatrix_$DATE.sql.gz"
```

Programe con cron:
```bash
crontab -e

# Backup diario a las 2 AM
0 2 * * * /path/to/backup-db.sh
```

### 4.3 Migraciones y Mantenimiento

#### Actualizar Schema

Cuando modifique `shared/schema.ts`:

```bash
npm run db:push
```

Si hay advertencias de pérdida de datos:
```bash
npm run db:push --force
```

**⚠️ IMPORTANTE:** `--force` puede eliminar datos. Haga backup antes.

#### Inspeccionar Schema

```bash
npx drizzle-kit introspect:pg
```

---

## 5. Configuración de Servicios Externos

### 5.1 Google Cloud Storage

#### Crear Proyecto y Bucket

1. Vaya a [Google Cloud Console](https://console.cloud.google.com)

2. Cree un nuevo proyecto:
   - Nombre: `riskmatrix-pro`
   - Proyecto ID: `riskmatrix-pro-xxxxx`

3. Habilite Cloud Storage API:
   ```
   APIs & Services > Enable APIs > Cloud Storage API
   ```

4. Cree un bucket:
   ```
   Cloud Storage > Create Bucket
   - Name: riskmatrix-storage
   - Location: Multi-region (US/EU)
   - Storage class: Standard
   - Access control: Uniform
   ```

5. Cree directorios:
   - `public/` - Para archivos públicos
   - `.private/` - Para archivos privados

#### Crear Service Account

1. Vaya a **IAM & Admin > Service Accounts**

2. **Create Service Account:**
   - Name: `riskmatrix-storage`
   - Role: **Storage Admin**

3. **Create Key:**
   - Key type: JSON
   - Descargue `keyfile.json`

4. En Replit Secrets o `.env`:
   ```bash
   GOOGLE_CLOUD_PROJECT=riskmatrix-pro-xxxxx
   GOOGLE_CLOUD_KEYFILE=./credentials/keyfile.json
   ```

5. Suba `keyfile.json` a Replit (en carpeta `credentials/`) o guárdelo localmente

#### Configurar Permisos del Bucket

```bash
# Hacer el directorio public/ accesible públicamente
gsutil iam ch allUsers:objectViewer gs://riskmatrix-storage/public

# Mantener .private/ privado (ya es el default)
```

### 5.2 Mailgun (Email)

**Servicio actual de email para Unigrc**

#### Opción 1: Sandbox (Desarrollo y Testing)

1. Registre en [Mailgun](https://www.mailgun.com)

2. Por defecto, obtiene un **dominio sandbox** automáticamente:
   - Formato: `sandbox[hash].mailgun.org`
   - Ejemplo: `sandbox3155d69a4f5e49a8a25ed300851fd478.mailgun.org`

3. Vaya a **Settings > API Keys**

4. Copie el **Private API Key**

5. Agregue destinatarios autorizados:
   - **Settings > Authorized Recipients**
   - Agregue emails para testing (ej: `valencia.araneda@gmail.com`)
   - Confirme el email enviado a cada destinatario

6. Guarde en Secrets/`.env`:
   ```bash
   MAILGUN_API_KEY=your_api_key_here
   MAILGUN_DOMAIN=sandbox3155d69a4f5e49a8a25ed300851fd478.mailgun.org
   ```

**Limitaciones del Sandbox:**
- Solo envía a destinatarios autorizados
- Límite de 300 emails/día
- Adecuado para desarrollo y pruebas

#### Opción 2: Dominio Personalizado (Producción)

1. **Sending > Domains > Add New Domain**

2. Ingrese su dominio: `unigrc.com` o `mail.unigrc.com`

3. Configure registros DNS en su proveedor:
   ```
   TXT  @  v=spf1 include:mailgun.org ~all
   TXT  smtp._domainkey  [Valor DKIM proporcionado por Mailgun]
   MX   @  mxa.mailgun.org  (Priority 10)
   MX   @  mxb.mailgun.org  (Priority 10)
   CNAME  email  mailgun.org
   ```

4. Espere verificación (24-48 horas)

5. Use en producción:
   ```bash
   MAILGUN_API_KEY=your_api_key_here
   MAILGUN_DOMAIN=unigrc.com
   ```

#### Plantillas de Email con Mailgun

Mailgun usa templates con variables dinámicas:

```html
<!-- Template example -->
<h1>Hola {{name}}</h1>
<p>Tienes {{count}} notificaciones pendientes</p>
```

Para usar templates:
1. Cree templates en el dashboard de Mailgun
2. Use el nombre del template en el código
3. Pase variables como objeto JSON

### 5.3 Twilio (SMS)

#### Crear Cuenta

1. Registre en [Twilio](https://www.twilio.com)

2. Obtenga su **Account SID** y **Auth Token** del dashboard

3. Guarde en Secrets/`.env`:
   ```bash
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxx
   ```

#### Obtener Número de Teléfono

1. **Phone Numbers > Buy a Number**

2. Seleccione un número con capacidades de SMS

3. Guarde en `.env`:
   ```bash
   TWILIO_PHONE_NUMBER=+12345678901
   ```

#### Verificar Números (Trial Account)

En cuentas trial, debe verificar números de destino:

1. **Phone Numbers > Verified Caller IDs**

2. **Add a new Caller ID**

3. Ingrese el número de teléfono a verificar

### 5.4 Azure OpenAI (AI Assistant)

**Opcional** - Habilita el asistente inteligente integrado

#### Crear Recurso Azure OpenAI

1. Acceda al [Portal de Azure](https://portal.azure.com)

2. **Create a resource > Azure OpenAI**

3. Configure el recurso:
   - **Subscription:** Su suscripción de Azure
   - **Resource group:** Cree o seleccione uno existente
   - **Region:** Seleccione una región disponible (ej: East US)
   - **Name:** `unigrc-openai`
   - **Pricing tier:** Standard S0

4. **Review + Create** y espere el despliegue

#### Desplegar Modelo GPT-4o-mini

1. En el recurso Azure OpenAI, vaya a **Azure OpenAI Studio**

2. **Deployments > Create new deployment**

3. Configure:
   - **Model:** gpt-4o-mini
   - **Deployment name:** `gpt-4o-mini` (use este nombre exacto)
   - **Version:** Última disponible
   - **Deployment type:** Standard

4. **Create**

#### Obtener Credenciales

1. En el recurso Azure OpenAI, vaya a **Keys and Endpoint**

2. Copie:
   - **KEY 1** (API Key)
   - **Endpoint** (URL completa)

3. Guarde en Secrets/`.env`:
   ```bash
   AZURE_OPENAI_API_KEY=your_api_key_here
   AZURE_OPENAI_ENDPOINT=https://unigrc-openai.openai.azure.com
   AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
   AZURE_OPENAI_API_VERSION=2024-02-15-preview
   ```

#### Características

- **Privacidad:** Datos enviados solo como contexto, no almacenados
- **Multilingüe:** Español, inglés y más
- **Streaming:** Respuestas en tiempo real
- **Cache:** Optimización automática de costos

#### Costos Estimados

- **GPT-4o-mini:** Modelo más económico de Microsoft
- **Input:** ~$0.15 / 1M tokens
- **Output:** ~$0.60 / 1M tokens
- **Uso típico:** $5-20/mes para organizaciones pequeñas

---

## 6. Despliegue en Producción

### 6.1 Checklist Pre-Despliegue

- [ ] Variables de entorno configuradas
- [ ] Base de datos con backups automáticos
- [ ] Servicios externos (GCS, Mailgun, Twilio, Azure OpenAI) configurados
- [ ] HTTPS habilitado
- [ ] CSRF protection activado (`NODE_ENV=production`)
- [ ] Session secret seguro (≥32 caracteres aleatorios)
- [ ] Logs configurados
- [ ] Health checks configurados
- [ ] Usuario admin creado

### 6.2 Despliegue en Replit (Recomendado)

#### Ventajas
- ✅ Configuración automática de HTTPS
- ✅ Auto-restart en crashes
- ✅ Logs centralizados
- ✅ Fácil rollback
- ✅ Integración con Git

#### Pasos

1. **Configurar Variables de Producción:**
   - Verifique que `NODE_ENV=production` esté en Secrets
   - Revise todas las API keys

2. **Publicar:**
   - No es necesario "desplegar", Replit corre automáticamente
   - La aplicación está disponible 24/7

3. **Dominio Personalizado (Opcional):**
   - Vaya a **Settings > Domains**
   - **Add a custom domain:** `app.yourdomain.com`
   - Configure DNS según las instrucciones

4. **Configurar Always-On (Plan Paid):**
   - Asegura que el Repl nunca se duerme
   - **Settings > Always On**

### 6.3 Despliegue en VPS/Cloud

#### Preparar Servidor

**Ubuntu 22.04 LTS:**

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PM2 (process manager)
sudo npm install -g pm2

# Instalar Nginx (reverse proxy)
sudo apt install -y nginx

# Instalar Certbot (SSL)
sudo apt install -y certbot python3-certbot-nginx
```

#### Clonar y Configurar Aplicación

```bash
# Crear usuario de aplicación
sudo adduser --system --group --home /opt/riskmatrix riskmatrix

# Cambiar a usuario
sudo -u riskmatrix bash

# Clonar repositorio
cd /opt/riskmatrix
git clone https://github.com/your-org/riskmatrix-pro.git app
cd app

# Instalar dependencias
npm ci --production

# Configurar .env
nano .env
# (Pegue las variables de entorno)

# Build
npm run build
```

#### Configurar PM2

```bash
# ecosystem.config.js
module.exports = {
  apps: [{
    name: 'riskmatrix-pro',
    script: './dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G'
  }]
};
```

Iniciar:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Configurar auto-start
```

#### Configurar Nginx

```nginx
# /etc/nginx/sites-available/riskmatrix-pro
server {
    listen 80;
    server_name app.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Max upload size
    client_max_body_size 50M;
}
```

Activar:
```bash
sudo ln -s /etc/nginx/sites-available/riskmatrix-pro /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Configurar SSL con Let's Encrypt

```bash
sudo certbot --nginx -d app.yourdomain.com
```

Siga las instrucciones para configurar renovación automática.

---

## 7. Verificación y Testing

### 7.1 Health Checks

#### Verificar Aplicación

```bash
curl http://localhost:5000/api/health
```

Respuesta esperada:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-07T12:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0"
}
```

#### Verificar Base de Datos

```bash
curl http://localhost:5000/api/health/db
```

#### Monitoreo Continuo

Configure un servicio como:
- **UptimeRobot** (gratis)
- **Pingdom**
- **New Relic**

Para hacer ping a `/api/health` cada 5 minutos

### 7.2 Tests de Carga

Usando `autocannon`:

```bash
npm install -g autocannon

# Test básico
autocannon -c 10 -d 30 http://localhost:5000

# Test de endpoint específico
autocannon -c 50 -d 60 -m POST \
  -H "Content-Type: application/json" \
  -b '{"username":"test","password":"test"}' \
  http://localhost:5000/api/login
```

### 7.3 Verificación de Seguridad

#### SSL/TLS

```bash
# Verificar certificado
openssl s_client -connect app.yourdomain.com:443 -servername app.yourdomain.com

# Test SSL Labs
# https://www.ssllabs.com/ssltest/
```

#### Headers de Seguridad

```bash
curl -I https://app.yourdomain.com
```

Verificar:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security`

---

## 8. Troubleshooting

### 8.1 Problemas Comunes

#### Error: "Cannot connect to database"

**Causa:** DATABASE_URL incorrecto o base de datos no accesible

**Solución:**
1. Verifique DATABASE_URL en variables de entorno
2. Pruebe conexión manual:
   ```bash
   psql $DATABASE_URL
   ```
3. Verifique firewall/security groups
4. Para Neon: verifique que el proyecto esté activo

#### Error: "Module not found"

**Causa:** Dependencias no instaladas

**Solución:**
```bash
rm -rf node_modules package-lock.json
npm install
```

#### Error: "Port 5000 already in use"

**Causa:** Otra aplicación usa el puerto

**Solución:**
```bash
# Linux/Mac
lsof -i :5000
kill -9 <PID>

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# O cambiar puerto
PORT=5001 npm run dev
```

#### Error: "CSRF token invalid"

**Causa:** CSRF_SECRET no configurado o cookies bloqueadas

**Solución:**
1. Verifique que `CSRF_SECRET` exista en `.env`
2. Verifique que el navegador acepte cookies
3. En desarrollo, puede deshabilitar temporalmente CSRF

#### Error: "Session not persisting"

**Causa:** SESSION_SECRET cambiante o tabla sessions no existe

**Solución:**
1. Verifique `SESSION_SECRET` en `.env`
2. Verifique que tabla `sessions` existe en DB:
   ```sql
   SELECT * FROM sessions LIMIT 1;
   ```
3. Push schema si falta:
   ```bash
   npm run db:push
   ```

### 8.2 Logs

#### Ver Logs en Replit

Abra la consola (terminal) en Replit

#### Ver Logs en PM2

```bash
pm2 logs riskmatrix-pro

# Últimas 100 líneas
pm2 logs --lines 100

# Solo errores
pm2 logs --err
```

#### Ver Logs de Nginx

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 8.3 Performance Issues

#### Database Query Slow

1. Habilite logging de queries lentas en PostgreSQL:
   ```sql
   ALTER SYSTEM SET log_min_duration_statement = 1000;
   SELECT pg_reload_conf();
   ```

2. Revise logs:
   ```bash
   sudo tail -f /var/log/postgresql/postgresql-16-main.log
   ```

3. Analice queries con EXPLAIN:
   ```sql
   EXPLAIN ANALYZE SELECT * FROM risks WHERE deleted_at IS NULL;
   ```

4. Agregue índices faltantes

#### Memory Leaks

```bash
# Monitorear uso de memoria
pm2 monit

# Si excede límite, PM2 reinicia automáticamente
pm2 start ecosystem.config.js --max-memory-restart 1G
```

### 8.4 Soporte

Para soporte adicional:

- **GitHub Issues:** https://github.com/your-org/riskmatrix-pro/issues
- **Documentación:** https://docs.riskmatrixpro.com
- **Email:** support@riskmatrixpro.com

---

## Checklist de Instalación Completa

- [ ] Sistema operativo actualizado
- [ ] Node.js 20+ instalado
- [ ] PostgreSQL 16+ configurado
- [ ] Base de datos creada e inicializada
- [ ] Variables de entorno configuradas
- [ ] Dependencias npm instaladas
- [ ] Schema pushed a database
- [ ] Usuario admin creado
- [ ] Servicios externos configurados (GCS, mailgun, Twilio)
- [ ] HTTPS configurado (producción)
- [ ] PM2/Process manager configurado (producción)
- [ ] Nginx reverse proxy configurado (producción)
- [ ] Backups automáticos configurados
- [ ] Logs configurados
- [ ] Health checks funcionando
- [ ] Tests básicos pasando
- [ ] Monitoreo configurado

---

**¡Instalación Completa!**

Su instancia de RiskMatrix Pro está lista para usar.

---

**Fin del Manual de Instalación y Despliegue**
