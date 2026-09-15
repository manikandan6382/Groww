import fs from "node:fs";
import path from "node:path";

export const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

export async function sendJson(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

export async function serveStatic(pathname, res, staticDir) {
  const safePath = pathname === "/" ? "/index.html" : decodeURIComponent(pathname);
  const filePath = path.resolve(staticDir, `.${safePath}`);
  if (!filePath.startsWith(staticDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  const exists = fs.existsSync(filePath) && fs.statSync(filePath).isFile();

  // Any unhandled API request must return JSON 404, never fallback to HTML index.html
  if (safePath.startsWith("/api/")) {
    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ success: false, error: "API endpoint not found", status: 404 }));
    return;
  }

  // If a specific asset or file with extension is missing, return 404 instead of serving index.html
  if (!exists && (safePath.startsWith("/assets/") || path.extname(safePath) !== "")) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
    return;
  }

  const target = exists ? filePath : path.join(staticDir, "index.html");
  const extension = path.extname(target);
  res.writeHead(200, {
    "Content-Type": mimeTypes[extension] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  fs.createReadStream(target).pipe(res);
}

export function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}
