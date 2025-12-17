/**
 * Cloud Function para servir el SPA desde Cloud Storage
 * Esta función maneja todas las rutas que no son /api/** y sirve index.html
 */

const { Storage } = require('@google-cloud/storage');
const storage = new Storage();

const BUCKET_NAME = 'unigrc-frontend-prod';

exports.serveSPA = async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const path = req.path || '/';
  
  // Si es una ruta de API, no debería llegar aquí (debería ser manejada por el Load Balancer)
  if (path.startsWith('/api/')) {
    res.status(404).send('Not Found');
    return;
  }

  // Si es un archivo estático (assets), servirlo directamente
  if (path.match(/\.(js|mjs|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp|ico|json|map)$/)) {
    try {
      const file = storage.bucket(BUCKET_NAME).file(path.substring(1)); // Remove leading /
      const [exists] = await file.exists();
      
      if (exists) {
        const [metadata] = await file.getMetadata();
        res.set('Content-Type', metadata.contentType || 'application/octet-stream');
        
        // Set cache headers for static assets
        if (path.match(/\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp|ico)$/)) {
          res.set('Cache-Control', 'public, max-age=31536000, immutable');
        }
        
        file.createReadStream().pipe(res);
        return;
      }
    } catch (error) {
      console.error('Error serving static file:', error);
    }
  }

  // Para todas las demás rutas (SPA routes), servir index.html
  try {
    const file = storage.bucket(BUCKET_NAME).file('index.html');
    const [exists] = await file.exists();
    
    if (exists) {
      res.set('Content-Type', 'text/html');
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      file.createReadStream().pipe(res);
    } else {
      res.status(404).send('index.html not found');
    }
  } catch (error) {
    console.error('Error serving index.html:', error);
    res.status(500).send('Internal Server Error');
  }
};

