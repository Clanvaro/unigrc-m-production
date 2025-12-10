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

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
      process.env.REPL_ID !== undefined
      ? [
        await import("@replit/vite-plugin-cartographer").then((m) =>
          m.cartographer(),
        ),
      ]
      : []),
  ],
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
    // OPTIMIZED: Use esbuild minifier (faster than terser, default in Vite)
    minify: 'esbuild',
    // OPTIMIZED: Disable sourcemaps in production to reduce bundle size
    sourcemap: false,
    // OPTIMIZED: Enable CSS code splitting for better caching
    cssCodeSplit: true,
    // OPTIMIZED: Warn if chunks exceed 1MB (helps identify optimization opportunities)
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: path.resolve(__dirname, "client/index.html"),
      output: {
        // OPTIMIZED: Manual chunks for better code splitting and caching
        // Separates vendor code from app code, improving cache hit rates
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
          flow: ["@xyflow/react"],
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
});
