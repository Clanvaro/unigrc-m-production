#!/bin/bash
set -e

echo "🚀 Optimized Deployment Script for Replit Autoscale"
echo "=================================================="
echo ""
echo "⚠️  WARNING: This script only works AFTER reorganizing package.json"
echo "    to move dev-only packages to devDependencies. See DEPLOYMENT.md"
echo ""

echo "📦 Step 1: Installing ALL dependencies (needed for build)..."
npm install

echo ""
echo "🔨 Step 2: Building frontend and backend..."
npm run build

echo ""
echo "✂️ Step 3: Removing devDependencies to reduce deployment size..."
echo "    (This only removes packages in devDependencies section)"
npm prune --production

echo ""
echo "📊 Step 4: Checking node_modules size..."
MODULES_SIZE=$(du -sh node_modules | awk '{print $1}')
echo "Current size: $MODULES_SIZE"

# Check if size is still too large
if [[ "$MODULES_SIZE" =~ ^[0-9]+M$ ]] && [[ ${MODULES_SIZE%M} -gt 700 ]]; then
  echo ""
  echo "⚠️  WARNING: node_modules is still $MODULES_SIZE (target: <600M)"
  echo "    This indicates dev packages are still in dependencies."
  echo "    You MUST reorganize package.json first. See DEPLOYMENT.md"
  echo ""
  exit 1
fi

echo ""
echo "✅ Build optimized for deployment!"
echo ""
echo "📝 Next steps:"
echo "   1. Commit and push your changes"
echo "   2. Deploy to Replit Autoscale"
echo "   3. After deployment, run 'npm install' to restore devDependencies for development"
echo ""
