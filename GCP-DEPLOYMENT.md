# 🚀 Google Cloud Platform Deployment Guide - UniGRC

Complete step-by-step guide to deploy the UniGRC risk management application to Google Cloud Platform using Cloud Run, Cloud SQL, and Cloud Storage.

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Step 1: Enable GCP Services](#step-1-enable-gcp-services)
- [Step 2: Create Artifact Registry](#step-2-create-artifact-registry)
- [Step 3: Set Up Cloud SQL](#step-3-set-up-cloud-sql)
- [Step 4: Configure Cloud Storage](#step-4-configure-cloud-storage)
- [Step 5: Build Docker Images](#step-5-build-docker-images)
- [Step 6: Deploy Backend to Cloud Run](#step-6-deploy-backend-to-cloud-run)
- [Step 7: Deploy Frontend to Cloud Run](#step-7-deploy-frontend-to-cloud-run)
- [Step 8: Database Migration](#step-8-database-migration)
- [Step 9: Verification](#step-9-verification)
- [Environment Variables Reference](#environment-variables-reference)
- [Troubleshooting](#troubleshooting)
- [Cost Optimization](#cost-optimization)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                Google Cloud Platform                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │  Cloud Run       │         │  Cloud Run       │          │
│  │  Frontend        │◄────────┤  Backend API     │          │
│  │  (React + serve) │         │  (Express.js)    │          │
│  │  Port: 8080      │         │  Port: 8080      │          │
│  └──────────────────┘         └────────┬─────────┘          │
│                                         │                     │
│                                 ┌───────▼────────┐           │
│                                 │  Cloud SQL     │           │
│                                 │  PostgreSQL 15 │           │
│                                 │  Public IP+SSL │           │
│                                 └────────────────┘           │
│                                         │                     │
│                                 ┌───────▼────────┐           │
│                                 │ Cloud Storage  │           │
│                                 │ File Uploads   │           │
│                                 └────────────────┘           │
│                                                               │
│  External (unchanged):                                       │
│  - Upstash Redis (caching)                                   │
│  - Azure OpenAI (AI features, optional)                      │
└─────────────────────────────────────────────────────────────┘
```

**Key Components:**
- **Backend**: Cloud Run service running Express.js API
- **Frontend**: Cloud Run service serving static React build
- **Database**: Cloud SQL PostgreSQL with public IP + SSL
- **Storage**: Cloud Storage bucket for file uploads
- **Cache**: Upstash Redis (external, no changes needed)

---

## Prerequisites

### 1. Google Cloud SDK Installation

**macOS:**
```bash
brew install --cask google-cloud-sdk
```

**Linux:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

**Windows:**
Download from: https://cloud.google.com/sdk/docs/install

### 2. Initialize gcloud

```bash
# Login to your Google account
gcloud auth login

# Set your project (replace with your actual project ID)
gcloud config set project <GCP_PROJECT_ID>

# Set your preferred region (e.g., southamerica-west1, us-central1)
gcloud config set run/region <REGION>

# Verify configuration
gcloud config list
```

### 3. Enable Billing

Ensure billing is enabled for your GCP project:
```bash
# Check billing status
gcloud beta billing projects describe <GCP_PROJECT_ID>
```

If not enabled, go to: https://console.cloud.google.com/billing

### 4. Required Permissions

Your account needs these IAM roles:
- `roles/run.admin` - Deploy Cloud Run services
- `roles/cloudsql.admin` - Manage Cloud SQL instances
- `roles/storage.admin` - Manage Cloud Storage buckets
- `roles/artifactregistry.admin` - Manage container images
- `roles/iam.serviceAccountUser` - Use service accounts

---

## Step 1: Enable GCP Services

Enable all required Google Cloud APIs:

```bash
# Enable Cloud Run API
gcloud services enable run.googleapis.com

# Enable Cloud SQL Admin API
gcloud services enable sqladmin.googleapis.com

# Enable Artifact Registry API
gcloud services enable artifactregistry.googleapis.com

# Enable Cloud Build API (for building Docker images)
gcloud services enable cloudbuild.googleapis.com

# Enable Cloud Storage API
gcloud services enable storage.googleapis.com

# Enable Compute Engine API (required for Cloud SQL)
gcloud services enable compute.googleapis.com

# Enable Secret Manager API (recommended for secrets)
gcloud services enable secretmanager.googleapis.com

# Verify enabled services
gcloud services list --enabled | grep -E "run|sql|artifact|build|storage"
```

**Expected output:**
```
artifactregistry.googleapis.com    Artifact Registry API
cloudbuild.googleapis.com          Cloud Build API
run.googleapis.com                 Cloud Run Admin API
sqladmin.googleapis.com            Cloud SQL Admin API
storage.googleapis.com             Cloud Storage API
```

---

## Step 2: Create Artifact Registry

Artifact Registry stores your Docker images.

```bash
# Create a Docker repository
gcloud artifacts repositories create unigrc \
  --repository-format=docker \
  --location=<REGION> \
  --description="UniGRC application container images"

# Verify repository was created
gcloud artifacts repositories list --location=<REGION>

# Configure Docker authentication
gcloud auth configure-docker <REGION>-docker.pkg.dev
```

**Expected output:**
```
Created repository [unigrc].
```

---

## Step 3: Set Up Cloud SQL

### 3.1 Create PostgreSQL Instance

```bash
# Create Cloud SQL instance (PostgreSQL 15)
# Tier: db-f1-micro (cheapest, ~$7/month) or db-g1-small (better performance, ~$25/month)
gcloud sql instances create unigrc-db \
  --database-version=POSTGRES_15 \
  --tier=db-g1-small \
  --region=<REGION> \
  --root-password=<TEMPORARY_ROOT_PASSWORD> \
  --storage-type=SSD \
  --storage-size=10GB \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=04 \
  --database-flags=max_connections=100

# This takes 5-10 minutes. Check status:
gcloud sql instances list
```

**Important Notes:**
- Replace `<TEMPORARY_ROOT_PASSWORD>` with a secure password
- For production, use `db-custom-2-7680` or higher tier
- Storage auto-increases when 90% full

### 3.2 Create Database and User

```bash
# Create the application database
gcloud sql databases create unigrc_db \
  --instance=unigrc-db

# Create application user
gcloud sql users create unigrc_user \
  --instance=unigrc-db \
  --password=<SECURE_DB_PASSWORD>

# Verify
gcloud sql databases list --instance=unigrc-db
gcloud sql users list --instance=unigrc-db
```

### 3.3 Configure Public IP and SSL

```bash
# Get the public IP address
gcloud sql instances describe unigrc-db \
  --format="value(ipAddresses[0].ipAddress)"

# Enable SSL requirement (IMPORTANT for security)
gcloud sql instances patch unigrc-db \
  --require-ssl

# Allow connections from Cloud Run (authorize 0.0.0.0/0 for Cloud Run)
# Cloud Run uses dynamic IPs, so we need to allow all IPs
# Security is enforced via SSL and strong passwords
gcloud sql instances patch unigrc-db \
  --authorized-networks=0.0.0.0/0

# Download SSL certificates (optional, for local testing)
gcloud sql ssl-certs create unigrc-client-cert \
  --instance=unigrc-db

gcloud sql ssl-certs describe unigrc-client-cert \
  --instance=unigrc-db \
  --format="get(cert)" > server-ca.pem
```

### 3.4 Build Connection String

**⚠️ IMPORTANTE: Para Cloud Run, usa Unix socket (Cloud SQL Proxy) en lugar de IP pública para mejor performance.**

#### Opción A: Unix Socket (Recomendado para Cloud Run - Más rápido y seguro)

**Formato:**
```
postgresql://unigrc_user:<SECURE_DB_PASSWORD>@/unigrc_db?host=/cloudsql/unigrc-m:southamerica-west1:unigrc-db
```

**Ejemplo:**
```
postgresql://unigrc_user:MySecurePass123@/unigrc_db?host=/cloudsql/unigrc-m:southamerica-west1:unigrc-db
```

**Ventajas:**
- ✅ Latencia mucho menor (<10ms vs 100-1000ms con IP pública)
- ✅ Más seguro (conexión interna, no expone IP)
- ✅ No requiere SSL (conexión ya es segura)
- ✅ Funciona automáticamente con `--add-cloudsql-instances` en Cloud Run

**Requisitos:**
- Cloud Run debe tener `--add-cloudsql-instances=unigrc-m:southamerica-west1:unigrc-db` configurado (ya está en `cloudbuild-backend.yaml`)

#### Opción B: IP Pública (Alternativa - Más lento)

**Formato:**
```
postgresql://unigrc_user:<SECURE_DB_PASSWORD>@<PUBLIC_IP>:5432/unigrc_db?sslmode=require
```

**Ejemplo:**
```
postgresql://unigrc_user:MySecurePass123@34.123.45.67:5432/unigrc_db?sslmode=require
```

**Nota:** Esta opción es más lenta y menos segura. Solo úsala si no puedes usar Unix socket.

**Para obtener la IP pública:**
```bash
gcloud sql instances describe unigrc-db \
  --format="value(ipAddresses[0].ipAddress)"
```

**Guardar en Secret Manager:**
```bash
# Actualizar el secret DATABASE_URL con el formato Unix socket (recomendado)
# Reemplaza MySecurePass123 con tu contraseña real
echo -n "postgresql://unigrc_user:MySecurePass123@/unigrc_db?host=/cloudsql/unigrc-m:southamerica-west1:unigrc-db" | \
  gcloud secrets versions add DATABASE_URL --data-file=-
```

**⚠️ IMPORTANTE - Actualizar DATABASE_URL existente:**

Si ya tienes un secret `DATABASE_URL` con formato IP pública, actualízalo así:

```bash
# 1. Obtener la contraseña actual (si no la recuerdas)
gcloud secrets versions access latest --secret=DATABASE_URL

# 2. Actualizar el secret con formato Unix socket
# Reemplaza <PASSWORD> con la contraseña obtenida en el paso 1
echo -n "postgresql://unigrc_user:<PASSWORD>@/unigrc_db?host=/cloudsql/unigrc-m:southamerica-west1:unigrc-db" | \
  gcloud secrets versions add DATABASE_URL --data-file=-

# 3. Verificar que el secret se actualizó correctamente
gcloud secrets versions access latest --secret=DATABASE_URL

# 4. Redesplegar el backend para aplicar el cambio
# Esto se hace automáticamente con el siguiente push a main, o manualmente:
gcloud run services update unigrc-backend \
  --region=southamerica-west1
```

**Beneficios del cambio:**
- ✅ Latencia reducida de 100-1000ms a <10ms
- ✅ Mejor estabilidad de conexiones
- ✅ Más seguro (conexión interna)
- ✅ No requiere certificados SSL de cliente

---

## Step 4: Configure Cloud Storage

### 4.1 Create Storage Bucket

```bash
# Create bucket for file uploads
# Bucket names must be globally unique
gcloud storage buckets create gs://unigrc-uploads-<GCP_PROJECT_ID> \
  --location=<REGION> \
  --uniform-bucket-level-access

# Verify bucket was created
gcloud storage buckets list | grep unigrc
```

### 4.2 Create Service Account for Storage Access

```bash
# Create service account
gcloud iam service-accounts create unigrc-storage \
  --display-name="UniGRC Storage Service Account" \
  --description="Service account for Cloud Storage access"

# Grant storage permissions to the service account
gcloud storage buckets add-iam-policy-binding gs://unigrc-uploads-<GCP_PROJECT_ID> \
  --member="serviceAccount:unigrc-storage@<GCP_PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# Create and download service account key
gcloud iam service-accounts keys create ~/unigrc-storage-key.json \
  --iam-account=unigrc-storage@<GCP_PROJECT_ID>.iam.gserviceaccount.com

# View the key (you'll need to set this as environment variable)
cat ~/unigrc-storage-key.json
```

**IMPORTANT:** 
- Keep `unigrc-storage-key.json` secure
- You'll need to extract `client_email` and `private_key` for environment variables
- Never commit this file to version control

### 4.3 Extract Credentials for Environment Variables

```bash
# Extract client email
cat ~/unigrc-storage-key.json | grep client_email

# Extract private key (will be multi-line)
cat ~/unigrc-storage-key.json | grep -A 20 private_key
```

You'll set these as:
- `GCS_CLIENT_EMAIL` = value from `client_email`
- `GCS_PRIVATE_KEY` = entire value from `private_key` (including `-----BEGIN PRIVATE KEY-----`)

---

## Step 5: Build Docker Images

### 5.1 Build Backend Image

```bash
# Navigate to project root
cd /path/to/unigrc-m-production

# Build backend Docker image
docker build -f Dockerfile.backend \
  -t <REGION>-docker.pkg.dev/<GCP_PROJECT_ID>/unigrc/backend:latest \
  -t <REGION>-docker.pkg.dev/<GCP_PROJECT_ID>/unigrc/backend:v1.0.0 \
  .

# Verify image was built
docker images | grep backend
```

**Alternative: Use Cloud Build (recommended for CI/CD)**
```bash
gcloud builds submit \
  --tag <REGION>-docker.pkg.dev/<GCP_PROJECT_ID>/unigrc/backend:latest \
  --dockerfile=Dockerfile.backend \
  .
```

### 5.2 Build Frontend Image

```bash
# Build frontend Docker image
docker build -f Dockerfile.frontend \
  -t <REGION>-docker.pkg.dev/<GCP_PROJECT_ID>/unigrc/frontend:latest \
  -t <REGION>-docker.pkg.dev/<GCP_PROJECT_ID>/unigrc/frontend:v1.0.0 \
  .

# Verify image was built
docker images | grep frontend
```

**Alternative: Use Cloud Build**
```bash
gcloud builds submit \
  --tag <REGION>-docker.pkg.dev/<GCP_PROJECT_ID>/unigrc/frontend:latest \
  --dockerfile=Dockerfile.frontend \
  .
```

### 5.3 Push Images to Artifact Registry

```bash
# Push backend image
docker push <REGION>-docker.pkg.dev/<GCP_PROJECT_ID>/unigrc/backend:latest
docker push <REGION>-docker.pkg.dev/<GCP_PROJECT_ID>/unigrc/backend:v1.0.0

# Push frontend image
docker push <REGION>-docker.pkg.dev/<GCP_PROJECT_ID>/unigrc/frontend:latest
docker push <REGION>-docker.pkg.dev/<GCP_PROJECT_ID>/unigrc/frontend:v1.0.0

# Verify images in registry
gcloud artifacts docker images list <REGION>-docker.pkg.dev/<GCP_PROJECT_ID>/unigrc
```

---

## Step 6: Deploy Backend to Cloud Run

### 6.1 Generate Secrets

```bash
# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate CSRF_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Save these values - you'll need them in the next step.**

### 6.2 Deploy Backend Service

```bash
# Deploy backend to Cloud Run
gcloud run deploy unigrc-backend \
  --image=<REGION>-docker.pkg.dev/<GCP_PROJECT_ID>/unigrc/backend:latest \
  --region=<REGION> \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --timeout=300 \
  --set-env-vars="NODE_ENV=production,PORT=8080,IS_GCP_DEPLOYMENT=true" \
  --set-env-vars="DATABASE_URL=postgresql://unigrc_user:<SECURE_DB_PASSWORD>@/unigrc_db?host=/cloudsql/unigrc-m:southamerica-west1:unigrc-db" \
  --set-env-vars="SESSION_SECRET=<GENERATED_SESSION_SECRET>" \
  --set-env-vars="CSRF_SECRET=<GENERATED_CSRF_SECRET>" \
  --set-env-vars="GCS_PROJECT_ID=<GCP_PROJECT_ID>" \
  --set-env-vars="GCS_BUCKET_NAME=unigrc-uploads-<GCP_PROJECT_ID>" \
  --set-env-vars="GCS_CLIENT_EMAIL=unigrc-storage@<GCP_PROJECT_ID>.iam.gserviceaccount.com" \
  --set-env-vars="GCS_PRIVATE_KEY=<PRIVATE_KEY_FROM_SERVICE_ACCOUNT>"

# Get the backend URL
gcloud run services describe unigrc-backend \
  --region=<REGION> \
  --format="value(status.url)"
```

**Important Notes:**
- Replace all `<PLACEHOLDERS>` with actual values
- The `GCS_PRIVATE_KEY` must include the entire key with `\n` for newlines
- For better security, use Secret Manager instead of environment variables (see below)

### 6.3 (Optional) Use Secret Manager for Sensitive Data

```bash
# Create secrets in Secret Manager
echo -n "<GENERATED_SESSION_SECRET>" | gcloud secrets create session-secret --data-file=-
echo -n "<GENERATED_CSRF_SECRET>" | gcloud secrets create csrf-secret --data-file=-
echo -n "<SECURE_DB_PASSWORD>" | gcloud secrets create db-password --data-file=-
cat ~/unigrc-storage-key.json | gcloud secrets create storage-key --data-file=-

# Grant Cloud Run service account access to secrets
PROJECT_NUMBER=$(gcloud projects describe <GCP_PROJECT_ID> --format="value(projectNumber)")

for SECRET in session-secret csrf-secret db-password storage-key; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done

# Deploy with secrets (more secure)
gcloud run deploy unigrc-backend \
  --image=<REGION>-docker.pkg.dev/<GCP_PROJECT_ID>/unigrc/backend:latest \
  --region=<REGION> \
  --update-secrets=SESSION_SECRET=session-secret:latest \
  --update-secrets=CSRF_SECRET=csrf-secret:latest \
  --update-secrets=GCS_PRIVATE_KEY=storage-key:latest \
  --set-env-vars="NODE_ENV=production,PORT=8080" \
  --set-env-vars="DATABASE_URL=postgresql://unigrc_user:$(gcloud secrets versions access latest --secret=db-password)@/unigrc_db?host=/cloudsql/unigrc-m:southamerica-west1:unigrc-db"
```

---

## Step 7: Deploy Frontend to Cloud Run

### 7.1 Get Backend URL

```bash
# Get backend URL (you'll need this for frontend configuration)
BACKEND_URL=$(gcloud run services describe unigrc-backend \
  --region=<REGION> \
  --format="value(status.url)")

echo "Backend URL: $BACKEND_URL"
```

### 7.2 Deploy Frontend Service

The frontend needs to know the backend API URL. Since we're using `serve` to host static files, we need to rebuild the frontend with the correct API URL.

**Option A: Rebuild with API URL (recommended)**

```bash
# Set API URL for build
export VITE_API_URL=$BACKEND_URL

# Rebuild frontend Docker image with API URL
docker build -f Dockerfile.frontend \
  --build-arg VITE_API_URL=$BACKEND_URL \
  -t <REGION>-docker.pkg.dev/<GCP_PROJECT_ID>/unigrc/frontend:latest \
  .

# Push updated image
docker push <REGION>-docker.pkg.dev/<GCP_PROJECT_ID>/unigrc/frontend:latest

# Deploy frontend
gcloud run deploy unigrc-frontend \
  --image=<REGION>-docker.pkg.dev/<GCP_PROJECT_ID>/unigrc/frontend:latest \
  --region=<REGION> \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=5 \
  --timeout=60
```

**Option B: Use runtime configuration (requires modifying Dockerfile.frontend)**

If you want to avoid rebuilding for different environments, you can serve a `config.js` file that loads the API URL at runtime. This requires modifying the frontend Dockerfile to include a startup script.

### 7.3 Get Frontend URL

```bash
# Get frontend URL
FRONTEND_URL=$(gcloud run services describe unigrc-frontend \
  --region=<REGION> \
  --format="value(status.url)")

echo "Frontend URL: $FRONTEND_URL"
echo "Access your application at: $FRONTEND_URL"
```

### 7.4 Update Backend CORS Configuration

```bash
# Update backend to allow frontend origin
gcloud run services update unigrc-backend \
  --region=<REGION> \
  --set-env-vars="FRONTEND_URL=$FRONTEND_URL"
```

---

## Step 8: Database Migration

### 8.1 Run Database Migrations

You have two options to run migrations:

**Option A: Connect from local machine**

```bash
# Install Cloud SQL Proxy
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64
chmod +x cloud-sql-proxy

# Start proxy
./cloud-sql-proxy <GCP_PROJECT_ID>:<REGION>:unigrc-db &

# Run migrations (in another terminal)
export DATABASE_URL="postgresql://unigrc_user:<SECURE_DB_PASSWORD>@127.0.0.1:5432/unigrc_db"
npm run db:push

# Or use Drizzle Kit
npx drizzle-kit push:pg
```

**Option B: Run from Cloud Run job (recommended for production)**

```bash
# Create a one-time job to run migrations
gcloud run jobs create unigrc-migrate \
  --image=<REGION>-docker.pkg.dev/<GCP_PROJECT_ID>/unigrc/backend:latest \
  --region=<REGION> \
  --set-env-vars="DATABASE_URL=postgresql://unigrc_user:<SECURE_DB_PASSWORD>@/unigrc_db?host=/cloudsql/unigrc-m:southamerica-west1:unigrc-db" \
  --command="npm" \
  --args="run,db:push"

# Execute the job
gcloud run jobs execute unigrc-migrate --region=<REGION>

# Check job logs
gcloud run jobs executions logs unigrc-migrate --region=<REGION>
```

### 8.2 Verify Database Schema

```bash
# Connect to database using psql
gcloud sql connect unigrc-db --user=unigrc_user --database=unigrc_db

# List tables
\dt

# Check a specific table
\d users

# Exit
\q
```

---

## Step 9: Verification

### 9.1 Health Check

```bash
# Check backend health
curl $BACKEND_URL/health

# Expected response:
# {
#   "status": "healthy",
#   "database": true,
#   "uptime": 123,
#   "timestamp": "2025-12-02T..."
# }
```

### 9.2 Access Application

```bash
# Open frontend in browser
open $FRONTEND_URL

# Or use curl to verify it loads
curl -I $FRONTEND_URL
```

### 9.3 Check Cloud Run Logs

```bash
# Backend logs
gcloud run services logs read unigrc-backend \
  --region=<REGION> \
  --limit=50

# Frontend logs
gcloud run services logs read unigrc-frontend \
  --region=<REGION> \
  --limit=50

# Follow logs in real-time
gcloud run services logs tail unigrc-backend --region=<REGION>
```

### 9.4 Test File Upload (if configured)

1. Log in to the application
2. Navigate to a section with file upload
3. Upload a test file
4. Verify file appears in Cloud Storage:

```bash
gcloud storage ls gs://unigrc-uploads-<GCP_PROJECT_ID>/
```

---

## Environment Variables Reference

### Required Variables (Backend)

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Node environment | `production` |
| `PORT` | Server port | `8080` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@/db?host=/cloudsql/PROJECT:REGION:INSTANCE` (Unix socket) o `postgresql://user:pass@IP:5432/db?sslmode=require` (IP pública) |
| `SESSION_SECRET` | Session encryption key | `<64-char-hex-string>` |
| `CSRF_SECRET` | CSRF token secret | `<64-char-hex-string>` |
| `GCS_PROJECT_ID` | GCP project ID | `my-project-123` |
| `GCS_BUCKET_NAME` | Storage bucket name | `unigrc-uploads-my-project-123` |
| `GCS_CLIENT_EMAIL` | Service account email | `unigrc-storage@project.iam.gserviceaccount.com` |
| `GCS_PRIVATE_KEY` | Service account private key | `-----BEGIN PRIVATE KEY-----\n...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FRONTEND_URL` | Frontend URL for CORS | Auto-detected |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL | None |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token | None |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint | None |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI key | None |
| `SENDGRID_API_KEY` | SendGrid API key | None |
| `MAILGUN_API_KEY` | Mailgun API key | None |

### How to Update Environment Variables

```bash
# Update a single variable
gcloud run services update unigrc-backend \
  --region=<REGION> \
  --set-env-vars="NEW_VAR=value"

# Update multiple variables
gcloud run services update unigrc-backend \
  --region=<REGION> \
  --set-env-vars="VAR1=value1,VAR2=value2"

# Remove a variable
gcloud run services update unigrc-backend \
  --region=<REGION> \
  --remove-env-vars="VAR_TO_REMOVE"
```

---

## Troubleshooting

### Issue: Backend fails to connect to Cloud SQL

**Symptoms:** 
- Health check returns `{"database": false}`
- Logs show: `connection timeout` or `ECONNREFUSED`

**Solutions:**
1. Verify Cloud SQL instance is running:
   ```bash
   gcloud sql instances describe unigrc-db --format="value(state)"
   ```
2. Check authorized networks:
   ```bash
   gcloud sql instances describe unigrc-db --format="value(settings.ipConfiguration.authorizedNetworks)"
   ```
3. Verify DATABASE_URL is correct:
   ```bash
   gcloud run services describe unigrc-backend --region=<REGION> --format="value(spec.template.spec.containers[0].env)"
   ```
4. Test connection from Cloud Shell:
   ```bash
   gcloud sql connect unigrc-db --user=unigrc_user
   ```

### Issue: Frontend can't reach backend API

**Symptoms:**
- Frontend loads but shows "Network Error"
- Browser console shows CORS errors

**Solutions:**
1. Verify backend is accessible:
   ```bash
   curl $BACKEND_URL/health
   ```
2. Check CORS configuration in backend logs
3. Ensure `FRONTEND_URL` is set correctly in backend environment variables
4. Verify both services are in the same region (lower latency)

### Issue: File uploads fail

**Symptoms:**
- Upload button doesn't work
- Logs show: `GCS authentication failed`

**Solutions:**
1. Verify service account has correct permissions:
   ```bash
   gcloud storage buckets get-iam-policy gs://unigrc-uploads-<GCP_PROJECT_ID>
   ```
2. Check `GCS_PRIVATE_KEY` is correctly formatted (includes newlines as `\n`)
3. Verify bucket exists:
   ```bash
   gcloud storage buckets describe gs://unigrc-uploads-<GCP_PROJECT_ID>
   ```

### Issue: Cloud Run service crashes or restarts

**Symptoms:**
- Service shows "Unhealthy" status
- Frequent restarts in logs

**Solutions:**
1. Check memory usage:
   ```bash
   gcloud run services describe unigrc-backend --region=<REGION> --format="value(spec.template.spec.containers[0].resources.limits.memory)"
   ```
2. Increase memory if needed:
   ```bash
   gcloud run services update unigrc-backend --region=<REGION> --memory=2Gi
   ```
3. Check for memory leaks in application logs
4. Verify `NODE_OPTIONS` is set correctly (see package.json)

### Issue: Slow performance

**Solutions:**
1. Enable Cloud SQL connection pooling (already configured in `db.ts`)
2. Increase Cloud Run CPU:
   ```bash
   gcloud run services update unigrc-backend --region=<REGION> --cpu=2
   ```
3. Increase Cloud SQL tier:
   ```bash
   gcloud sql instances patch unigrc-db --tier=db-custom-2-7680
   ```
4. Enable Cloud CDN for frontend (requires Load Balancer)
5. Verify Upstash Redis is configured for caching

---

## Cost Optimization

### Estimated Monthly Costs (Single Region)

| Service | Configuration | Estimated Cost |
|---------|---------------|----------------|
| Cloud Run (Backend) | 1 vCPU, 1GB RAM, ~100k requests | $5-15 |
| Cloud Run (Frontend) | 1 vCPU, 512MB RAM, ~100k requests | $3-8 |
| Cloud SQL | db-g1-small, 10GB SSD | $25-30 |
| Cloud Storage | 10GB storage, 1000 operations | $0.50-2 |
| Artifact Registry | 5GB images | $0.50 |
| **Total** | | **$34-56/month** |

### Cost Reduction Tips

1. **Use Cloud Run min-instances=0** (already configured)
   - Scales to zero when not in use
   - Saves ~$20-30/month for low-traffic apps

2. **Use Cloud SQL db-f1-micro** for development
   ```bash
   gcloud sql instances patch unigrc-db --tier=db-f1-micro
   ```
   - Reduces cost to ~$7/month
   - Not recommended for production (limited performance)

3. **Enable Cloud Storage lifecycle policies**
   ```bash
   # Delete old files after 90 days
   gcloud storage buckets update gs://unigrc-uploads-<GCP_PROJECT_ID> \
     --lifecycle-file=lifecycle.json
   ```

4. **Use Cloud SQL scheduled backups** (instead of continuous)
   - Already configured for daily backups at 3 AM

5. **Monitor usage with Cloud Billing**
   ```bash
   # Set up budget alerts
   gcloud billing budgets create \
     --billing-account=<BILLING_ACCOUNT_ID> \
     --display-name="UniGRC Monthly Budget" \
     --budget-amount=50USD \
     --threshold-rule=percent=80 \
     --threshold-rule=percent=100
   ```

---

## Next Steps

1. **Set up Custom Domain** (optional)
   ```bash
   gcloud run domain-mappings create \
     --service=unigrc-frontend \
     --domain=app.yourdomain.com \
     --region=<REGION>
   ```

2. **Enable Cloud Monitoring**
   - Set up uptime checks
   - Configure alerting policies
   - Create custom dashboards

3. **Implement CI/CD**
   - Use Cloud Build triggers
   - Automate deployments from GitHub
   - Set up staging environment

4. **Security Hardening**
   - Enable Cloud Armor (WAF)
   - Implement VPC connector for private Cloud SQL
   - Use Workload Identity instead of service account keys
   - Enable audit logging

5. **Performance Optimization**
   - Enable Cloud CDN
   - Implement Cloud Load Balancing
   - Use Cloud Memorystore (Redis) instead of Upstash

---

## Support and Resources

- **GCP Documentation**: https://cloud.google.com/docs
- **Cloud Run Docs**: https://cloud.google.com/run/docs
- **Cloud SQL Docs**: https://cloud.google.com/sql/docs
- **Pricing Calculator**: https://cloud.google.com/products/calculator

---

**Last Updated:** December 2, 2025  
**Version:** 1.0.0
