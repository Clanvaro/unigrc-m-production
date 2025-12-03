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

// Health check
app.get('/health', (req, res) => {
    res.send('OK');
});

// Proxy API requests
app.use('/api', createProxyMiddleware({
    target: API_URL,
    changeOrigin: true,
    secure: false, // Handle potential SSL issues if any
    pathRewrite: {
        // Keep /api prefix as backend expects it
    },
    onProxyReq: (proxyReq, req, res) => {
        // Optional: Add custom headers if needed
    },
    onError: (err, req, res) => {
        console.error('Proxy Error:', err);
        res.status(500).send('Proxy Error');
    }
}));

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Handle SPA routing - return index.html for all non-API requests
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Frontend server running on port ${PORT}`);
});
