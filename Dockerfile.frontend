# ============================================================================
# Frontend Dockerfile for UniGRC - Google Cloud Run Deployment
# ============================================================================
# This Dockerfile builds the React frontend and serves it as static files
# using the 'serve' package on Google Cloud Run.
#
# Build command:
#   docker build -f Dockerfile.frontend -t <REGION>-docker.pkg.dev/<GCP_PROJECT_ID>/unigrc/frontend:latest .
#
# Local test:
#   docker run -p 8080:8080 <image>
# ============================================================================

# ============================================================================
# Stage 1: Builder - Build React application with Vite
# ============================================================================
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install ALL dependencies (including devDependencies for Vite build)
RUN npm ci --legacy-peer-deps

# Copy source code and configuration files
COPY . .

# Build the frontend application
# This runs: vite build -> outputs to dist/public
RUN npm run build

# Verify build output exists
RUN ls -la dist/public && \
    echo "✅ Frontend build completed successfully"

# ============================================================================
# Stage 2: Runtime - Serve static files with 'serve' package
# ============================================================================
FROM node:20-alpine AS runtime

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Install 'serve' package globally for serving static files
# serve is a lightweight static file server perfect for SPAs
RUN npm install -g serve@14

# Copy built static files from builder stage
COPY --from=builder /app/dist/public ./public

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port 8080 (Cloud Run requirement)
EXPOSE 8080

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Serve the static files
# Options:
#   -s: Single-page application mode (rewrites all routes to index.html)
#   -l: Listen port
#   public: Directory to serve
CMD ["serve", "-s", "public", "-l", "8080"]

# ============================================================================
# Alternative: Custom Express Server (if you need more control)
# ============================================================================
# If you need API proxying or custom headers, you can replace the CMD with:
#
# 1. Create a simple server.js file:
#    const express = require('express');
#    const path = require('path');
#    const app = express();
#    
#    app.use(express.static('public'));
#    app.get('*', (req, res) => {
#      res.sendFile(path.join(__dirname, 'public', 'index.html'));
#    });
#    
#    app.listen(8080, '0.0.0.0', () => {
#      console.log('Frontend serving on port 8080');
#    });
#
# 2. Update Dockerfile:
#    COPY server.js ./
#    RUN npm install express
#    CMD ["node", "server.js"]
# ============================================================================

# ============================================================================
# Image Optimization Notes:
# - Multi-stage build: only static files in runtime image
# - Alpine Linux base image (minimal footprint)
# - No source code or build tools in final image
# - 'serve' package is lightweight (~2MB)
#
# Expected image size: ~150-200MB
# ============================================================================
