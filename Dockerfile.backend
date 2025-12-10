# ============================================================================
# Backend Dockerfile for UniGRC - Google Cloud Run Deployment
# ============================================================================

# ============================================================================
# Stage 1: Builder - Build backend with esbuild
# ============================================================================
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install Python and build dependencies (required for node-gyp and canvas)
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

# Create symlink for python
RUN ln -sf /usr/bin/python3 /usr/bin/python
ENV PYTHON=/usr/bin/python3

# Copy package files
COPY package*.json ./

# Install dependencies (ignore scripts for canvas to patch it manually)
RUN npm ci --legacy-peer-deps --ignore-scripts

# Patch canvas source files to fix C++ compilation errors with Node.js 20
# The issue is missing #include <cstdint> in CharData.h and FontParser files
RUN if [ -d "node_modules/canvas/src" ]; then \
    # Fix CharData.h - add cstdint include at the top \
    if [ -f "node_modules/canvas/src/CharData.h" ] && ! grep -q "#include <cstdint>" node_modules/canvas/src/CharData.h; then \
      echo '#include <cstdint>' | cat - node_modules/canvas/src/CharData.h > /tmp/CharData.h && \
      mv /tmp/CharData.h node_modules/canvas/src/CharData.h; \
    fi; \
    # Fix FontParser.h - add cstdint include after first include \
    if [ -f "node_modules/canvas/src/FontParser.h" ] && ! grep -q "#include <cstdint>" node_modules/canvas/src/FontParser.h; then \
      awk 'NR==1{print; print "#include <cstdint>"; next}1' node_modules/canvas/src/FontParser.h > /tmp/FontParser.h && \
      mv /tmp/FontParser.h node_modules/canvas/src/FontParser.h; \
    fi; \
    # Fix FontParser.cc - add cstdint include after first include \
    if [ -f "node_modules/canvas/src/FontParser.cc" ] && ! grep -q "#include <cstdint>" node_modules/canvas/src/FontParser.cc; then \
      awk 'NR==1{print; print "#include <cstdint>"; next}1' node_modules/canvas/src/FontParser.cc > /tmp/FontParser.cc && \
      mv /tmp/FontParser.cc node_modules/canvas/src/FontParser.cc; \
    fi; \
    fi

# Now build native modules
RUN npm rebuild canvas --build-from-source

# Copy source code
COPY . .

# Build backend only (skip frontend)
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

# Create empty public directory (backend expects it)
RUN mkdir -p dist/public

# ============================================================================
# Stage 2: Runtime - Run the backend server
# ============================================================================
FROM node:20-alpine AS runtime

# Install dumb-init and runtime dependencies for canvas
# OPTIMIZED: Only install runtime libraries (not -dev) and build tools temporarily
# Build tools are needed only during canvas compilation, then removed
RUN apk add --no-cache \
    dumb-init \
    python3 \
    make \
    g++ \
    pkgconf \
    cairo \
    cairo-dev \
    jpeg \
    jpeg-dev \
    pango \
    pango-dev \
    giflib \
    giflib-dev \
    pixman \
    pixman-dev

# Create symlink for python (node-gyp looks for 'python')
RUN ln -sf /usr/bin/python3 /usr/bin/python
ENV PYTHON=/usr/bin/python3

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only (ignore scripts for canvas to patch it manually)
# OPTIMIZED: Clean npm cache after install to reduce image size
RUN npm install --production --legacy-peer-deps --ignore-scripts && \
    npm cache clean --force

# Patch canvas source files to fix C++ compilation errors with Node.js 20
# The issue is missing #include <cstdint> in CharData.h and FontParser files
RUN if [ -d "node_modules/canvas/src" ]; then \
    # Fix CharData.h - add cstdint include at the top \
    if [ -f "node_modules/canvas/src/CharData.h" ] && ! grep -q "#include <cstdint>" node_modules/canvas/src/CharData.h; then \
      echo '#include <cstdint>' | cat - node_modules/canvas/src/CharData.h > /tmp/CharData.h && \
      mv /tmp/CharData.h node_modules/canvas/src/CharData.h; \
    fi; \
    # Fix FontParser.h - add cstdint include after first include \
    if [ -f "node_modules/canvas/src/FontParser.h" ] && ! grep -q "#include <cstdint>" node_modules/canvas/src/FontParser.h; then \
      awk 'NR==1{print; print "#include <cstdint>"; next}1' node_modules/canvas/src/FontParser.h > /tmp/FontParser.h && \
      mv /tmp/FontParser.h node_modules/canvas/src/FontParser.h; \
    fi; \
    # Fix FontParser.cc - add cstdint include after first include \
    if [ -f "node_modules/canvas/src/FontParser.cc" ] && ! grep -q "#include <cstdint>" node_modules/canvas/src/FontParser.cc; then \
      awk 'NR==1{print; print "#include <cstdint>"; next}1' node_modules/canvas/src/FontParser.cc > /tmp/FontParser.cc && \
      mv /tmp/FontParser.cc node_modules/canvas/src/FontParser.cc; \
    fi; \
    fi

# Build native modules (canvas)
RUN npm rebuild canvas --build-from-source

# OPTIMIZED: Remove build tools after canvas compilation to reduce image size
# Keep only runtime libraries needed by canvas (cairo, jpeg, pango, giflib, pixman)
RUN apk del python3 make g++ pkgconf cairo-dev jpeg-dev pango-dev giflib-dev pixman-dev && \
    rm -rf /var/cache/apk/* /tmp/* /root/.npm /root/.node-gyp

# Copy built backend and shared files from builder
# OPTIMIZED: Copy in single layer to reduce image layers
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Run the backend server
CMD ["node", "dist/index.js"]
