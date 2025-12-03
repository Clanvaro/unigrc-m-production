# ============================================================================
# Backend Dockerfile for UniGRC - Google Cloud Run Deployment
# ============================================================================

# ============================================================================
# Stage 1: Builder - Install dependencies and build TypeScript
# ============================================================================
FROM node:20-alpine AS builder

# Set working directory FIRST
WORKDIR /app

# Install Python and build dependencies (required for node-gyp and canvas)
# This MUST happen before npm install
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    pkgconf \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev

# Create symlink for python (node-gyp looks for 'python')
RUN ln -sf /usr/bin/python3 /usr/bin/python

# Set Python path explicitly for node-gyp
ENV PYTHON=/usr/bin/python3

# Copy package files for dependency installation
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci --legacy-peer-deps

# Copy source code and configuration files
COPY . .

# Build ONLY the backend (skip frontend build)
RUN npx esbuild server/index.ts \
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
    --external:./vite \
    --external:vite \
    --outdir=dist

# ============================================================================
# Stage 2: Runtime - Production-only dependencies and built artifacts
# ============================================================================
FROM node:20-alpine AS runtime

# Install dumb-init and runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    python3 \
    make \
    g++ \
    pkgconf \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Set Python path
ENV PYTHON=/usr/bin/python3

# Install ONLY production dependencies
RUN npm ci --only=production --legacy-peer-deps && \
    npm cache clean --force

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Copy shared schema (needed at runtime for Drizzle ORM)
COPY --from=builder /app/shared ./shared

# Copy migrations (needed for database initialization)
COPY --from=builder /app/migrations ./migrations

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port 8080 (Cloud Run requirement)
EXPOSE 8080

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["npm", "run", "start"]
