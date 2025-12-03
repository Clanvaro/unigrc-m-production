# ============================================================================
# Frontend Dockerfile for UniGRC - Google Cloud Run Deployment
# ============================================================================

# ============================================================================
# Stage 1: Builder - Build React application with Vite
# ============================================================================
FROM node:20-alpine AS builder

# Set working directory
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
