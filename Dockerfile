# ============================================================================
# Backend Dockerfile for UniGRC - Google Cloud Run Deployment
# ============================================================================
# This Dockerfile builds the Node.js/Express backend API for deployment to
# Google Cloud Run. It uses a multi-stage build to minimize the final image size.
#
# Build command:
#   docker build -f Dockerfile.backend -t <REGION>-docker.pkg.dev/<GCP_PROJECT_ID>/unigrc/backend:latest .
#
# Local test:
#   docker run -p 8080:8080 -e DATABASE_URL="..." -e SESSION_SECRET="..." <image>
# ============================================================================

# ============================================================================
# Stage 1: Builder - Install dependencies and build TypeScript
# ============================================================================
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
# Use --legacy-peer-deps if there are peer dependency conflicts
RUN npm ci --legacy-peer-deps

# Copy source code and configuration files
COPY . .

# Build the application
# This runs: vite build (frontend) + esbuild (backend)
RUN npm run build

# ============================================================================
# Stage 2: Runtime - Production-only dependencies and built artifacts
# ============================================================================
FROM node:20-alpine AS runtime

# Install dumb-init to handle signals properly in containers
RUN apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies
# This significantly reduces image size by excluding dev tools
RUN npm ci --only=production --legacy-peer-deps && \
    npm cache clean --force

# Copy built artifacts from builder stage
# Backend: dist/index.js (bundled server)
# Frontend: dist/public/* (static React build)
COPY --from=builder /app/dist ./dist

# Copy shared schema (needed at runtime for Drizzle ORM)
COPY --from=builder /app/shared ./shared

# Copy migrations (needed for database initialization)
COPY --from=builder /app/migrations ./migrations

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Cloud Run requires listening on 0.0.0.0
# This is already configured in server/index.ts

# Expose port 8080 (Cloud Run requirement)
EXPOSE 8080

# Use dumb-init to handle signals properly
# This ensures graceful shutdown when Cloud Run stops the container
ENTRYPOINT ["dumb-init", "--"]

# Start the application
# Uses the production start script from package.json
CMD ["npm", "run", "start"]

# ============================================================================
# Image Optimization Notes:
# - Multi-stage build reduces final image size by ~60%
# - Alpine Linux base image (minimal footprint)
# - Production dependencies only in runtime stage
# - Bundled backend code (single dist/index.js file)
#
# Expected image size: ~400-500MB (vs ~1GB without optimization)
# ============================================================================
