import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendPort = process.env.BACKEND_PORT || 3004;

export default defineConfig({
  plugins: [react()],
  root: __dirname,
  server: {
    port: 3003,
    strictPort: true,
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${backendPort}`,
        changeOrigin: true,
        ws: true,
        // Disable response buffering for Server-Sent Events (SSE)
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            if (req.url?.includes("/live-events")) {
              proxyReq.setHeader("Cache-Control", "no-cache");
              proxyReq.setHeader("Connection", "keep-alive");
            }
          });
        },
      },
      "/upstox": {
        target: `http://127.0.0.1:${backendPort}`,
        changeOrigin: true,
      },
      "/kite": {
        target: `http://127.0.0.1:${backendPort}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: path.resolve(__dirname, "../../dist"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "zustand", "clsx"],
          motion: ["framer-motion"],
          charts: ["lightweight-charts"],
          icons: ["lucide-react"],
        },
      },
    },
  },
});
