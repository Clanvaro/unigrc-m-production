import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
// Default to the provided backend URL if not set env var
const API_URL = process.env.API_URL || 'https://unigrc-backend-524018293934.southamerica-west1.run.app';

console.log(`Starting frontend server...`);
console.log(`PORT: ${PORT}`);
console.log(`API_URL: ${API_URL}`);

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.send('OK');
});

// Test API routing
app.get('/api/test', (req, res) => {
    res.json({ message: 'API routing works', apiUrl: API_URL });
});

// Proxy API requests
app.use('/api', createProxyMiddleware({
    target: API_URL,
    changeOrigin: true,
    secure: false, // Handle potential SSL issues if any
    logLevel: 'debug', // Enable debug logging
    pathRewrite: {
        // Keep /api prefix as backend expects it
    },
    onProxyReq: (proxyReq, req, res) => {
        console.log(`Proxying ${req.method} ${req.url} -> ${API_URL}${req.url}`);
    },
    onError: (err, req, res) => {
        console.error('Proxy Error:', err);
        res.status(500).send('Proxy Error');
    }
}));

import fs from 'fs';

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public'), {
    // Set proper MIME types for JavaScript modules
    setHeaders: (res, filepath) => {
        if (filepath.endsWith('.js') || filepath.endsWith('.mjs')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        } else if (filepath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
        }
    }
}));

// Handle SPA routing - return index.html for all non-API, non-static requests
app.get('*', (req, res) => {
    // Check if this is a static asset request
    const isStaticAsset = req.path.match(/\.(js|mjs|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp|ico|json|map)$/);
    
    if (isStaticAsset) {
        // For static assets, check if file exists before serving index.html
        const filePath = path.join(__dirname, 'public', req.path);
        if (fs.existsSync(filePath)) {
            // File exists, express.static should have served it, but if we're here, serve it manually
            return res.sendFile(filePath);
        } else {
            // Static file not found - return 404 instead of index.html
            return res.status(404).type('text/plain').send('File not found');
        }
    }
    
    // For SPA routes, serve index.html
    console.log(`Fallback to index.html for: ${req.url}`);
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Frontend server running on port ${PORT}`);
});
