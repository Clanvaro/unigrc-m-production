import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Detectar errores de carga de módulos (chunks desactualizados después de deploy)
// y recargar automáticamente para obtener la versión más reciente
window.addEventListener('error', (event) => {
  const isChunkLoadError = 
    event.message?.includes('Failed to fetch dynamically imported module') ||
    event.message?.includes('Failed to load module script') ||
    event.message?.includes('Loading chunk') ||
    event.message?.includes('Loading CSS chunk');
  
  if (isChunkLoadError) {
    // Evitar loop infinito de recargas
    const lastReload = sessionStorage.getItem('chunk-reload-timestamp');
    const now = Date.now();
    if (!lastReload || (now - parseInt(lastReload)) > 10000) {
      sessionStorage.setItem('chunk-reload-timestamp', now.toString());
      window.location.reload();
    }
  }
}, true);

createRoot(document.getElementById("root")!).render(<App />);
