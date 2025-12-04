import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("📍 Vite Config Debug:");
console.log("   __dirname:", __dirname);
console.log("   root:", path.resolve(__dirname, "client"));
console.log("   input:", path.resolve(__dirname, "client/index.html"));

export default defineConfig(async () => {
  // Build plugins array
  const plugins: any[] = [
    react(),
    runtimeErrorOverlay(),
  ];

  // Only load Replit plugin in development when REPL_ID is set
  // Skip in production/Docker builds to avoid Socket.emit errors
  if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined && process.env.REPL_ID !== "") {
    try {
      // Use dynamic import for the Replit plugin
      const cartographer = await import("@replit/vite-plugin-cartographer");
      if (cartographer && cartographer.cartographer) {
        plugins.push(cartographer.cartographer());
      }
    } catch (error) {
      // Silently ignore if plugin is not available (e.g., in Docker build)
      // This is expected in production builds
      console.warn("⚠️ Replit cartographer plugin not available, skipping...");
    }
  }

  return {
    base: "/",
    plugins,
    resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "client/index.html"),
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-hook-form"],
          routing: ["wouter"],
          query: ["@tanstack/react-query", "@tanstack/react-virtual"],
          "ui-core": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-popover",
            "@radix-ui/react-tooltip",
          ],
          "ui-form": [
            "@radix-ui/react-label",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-radio-group",
            "@radix-ui/react-switch",
            "@radix-ui/react-slider",
          ],
          "ui-misc": [
            "@radix-ui/react-tabs",
            "@radix-ui/react-accordion",
            "@radix-ui/react-avatar",
            "@radix-ui/react-toast",
          ],
          charts: ["recharts"],
          flow: ["reactflow", "@xyflow/react"],
          icons: ["lucide-react"],
          date: ["date-fns", "react-day-picker"],
          forms: ["zod", "zod-validation-error", "@hookform/resolvers"],
        },
      },
    },
  },
    server: {
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});
