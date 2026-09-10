import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendPort = process.env.BACKEND_PORT || 3004;

function scopeAuditorPlugin() {
  let auditCodeFn = null;
  return {
    name: "vite-plugin-ast-scope-auditor",
    async buildStart() {
      if (!auditCodeFn) {
        const mod = await import("../../scripts/audit-bindings.mjs");
        auditCodeFn = mod.auditCode;
      }
    },
    async handleHotUpdate({ file, read }) {
      if (file.endsWith(".jsx") || file.endsWith(".js")) {
        if (!auditCodeFn) {
          const mod = await import("../../scripts/audit-bindings.mjs");
          auditCodeFn = mod.auditCode;
        }
        const code = await read();
        const rel = path.relative(path.resolve(__dirname, "../../"), file);
        const errs = auditCodeFn(code, rel);
        if (errs.length > 0) {
          console.error(`\n🚨 [AST Scope Auditor Alert] Undeclared variable detected in ${path.basename(file)}:`);
          for (const err of errs) {
            console.error(`   ❌ Line ${err.line}:${err.col} -> ${err.message}`);
            if (err.snippet) console.error(`      ${err.snippet}`);
          }
          console.error("");
        }
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), scopeAuditorPlugin()],
  root: __dirname,
  server: {
    host: "0.0.0.0",
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
    emptyOutDir: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "zustand", "clsx"],
          motion: ["framer-motion"],
          icons: ["lucide-react"],
        },
      },
    },
  },
});
