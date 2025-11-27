#!/bin/bash
set -e

echo '🔨 Building frontend...'
vite build
echo '✅ Frontend built'

echo '🔨 Building backend with optimizations...'
esbuild server/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --minify \
  --tree-shaking=true \
  --external:exceljs \
  --external:chartjs-node-canvas \
  --external:pdfjs-dist \
  --external:puppeteer \
  --external:html2canvas \
  --outdir=dist

echo '✅ Backend built'
echo '✅ Build complete!'
ls -lh dist/
