#!/bin/bash
# Continuous Deployment Setup Script
# This script configures Cloud Build triggers for automatic deployment

set -e  # Exit on error

PROJECT_ID="unigrc-m"
REGION="southamerica-west1"
GITHUB_USER="Clanvaro"
REPO_NAME="unigrc-m-production"

echo "🚀 Setting up Continuous Deployment for UniGRC"
echo "================================================"
echo ""

# Step 1: Get project number
echo "📋 Step 1: Getting project number..."
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
echo "   Project Number: $PROJECT_NUMBER"
echo ""

# Step 2: Grant Cloud Build permissions
echo "🔐 Step 2: Granting Cloud Build service account permissions..."

echo "   - Granting Cloud Run Admin role..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member=serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com \
  --role=roles/run.admin \
  --quiet

echo "   - Granting Service Account User role..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member=serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com \
  --role=roles/iam.serviceAccountUser \
  --quiet

echo "   - Granting Secret Manager Accessor role..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member=serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor \
  --quiet

echo "   ✅ Permissions granted"
echo ""

# Step 3: Check if secrets exist
echo "🔑 Step 3: Verifying secrets in Secret Manager..."
REQUIRED_SECRETS=("DATABASE_URL" "SESSION_SECRET" "CSRF_SECRET" "GCS_CLIENT_EMAIL" "GCS_PRIVATE_KEY")
MISSING_SECRETS=()

for secret in "${REQUIRED_SECRETS[@]}"; do
  if gcloud secrets describe $secret --project=$PROJECT_ID &>/dev/null; then
    echo "   ✅ $secret exists"
  else
    echo "   ❌ $secret is missing"
    MISSING_SECRETS+=($secret)
  fi
done

if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
  echo ""
  echo "⚠️  WARNING: The following secrets are missing:"
  for secret in "${MISSING_SECRETS[@]}"; do
    echo "   - $secret"
  done
  echo ""
  echo "Please create them using:"
  echo "   echo -n 'your-value' | gcloud secrets create SECRET_NAME --data-file=- --project=$PROJECT_ID"
  echo ""
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi
echo ""

# Step 4: Create Cloud Build triggers
echo "🔨 Step 4: Creating Cloud Build triggers..."

echo "   Creating backend trigger..."
gcloud builds triggers create github \
  --name=deploy-backend \
  --repo-name=$REPO_NAME \
  --repo-owner=$GITHUB_USER \
  --branch-pattern=^main$ \
  --build-config=cloudbuild-backend.yaml \
  --region=$REGION \
  --project=$PROJECT_ID \
  --quiet || echo "   (Trigger may already exist)"

echo "   Creating frontend trigger..."
gcloud builds triggers create github \
  --name=deploy-frontend \
  --repo-name=$REPO_NAME \
  --repo-owner=$GITHUB_USER \
  --branch-pattern=^main$ \
  --build-config=cloudbuild-frontend.yaml \
  --region=$REGION \
  --project=$PROJECT_ID \
  --quiet || echo "   (Trigger may already exist)"

echo "   ✅ Triggers created"
echo ""

# Step 5: Summary
echo "✅ Setup Complete!"
echo "=================="
echo ""
echo "Next steps:"
echo "1. Commit the Cloud Build configuration files:"
echo "   git add cloudbuild-backend.yaml cloudbuild-frontend.yaml Dockerfile.frontend Dockerfile.backend"
echo "   git commit -m 'Add Cloud Build configuration for continuous deployment'"
echo ""
echo "2. Push to trigger deployment:"
echo "   git push origin main"
echo ""
echo "3. Monitor builds at:"
echo "   https://console.cloud.google.com/cloud-build/builds?project=$PROJECT_ID"
echo ""
