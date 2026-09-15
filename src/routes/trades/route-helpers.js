import fs from "node:fs";
import path from "node:path";
import { getProjectRoot } from "../../db/connection.js";
import { getRangeWindow } from "../../services/trading/trade-calculator.js";
import { listTrades } from "../../repositories/trades.repository.js";

export const evidenceRoot = path.join(getProjectRoot(), "data", "uploads", "trades");

export function getRange(url) {
  return url.searchParams.get("range") || "all";
}

export function getTradesForUrl(url) {
  const range = getRange(url);
  const { start, end } = getRangeWindow(range, url.searchParams.get("from"), url.searchParams.get("to"));
  return listTrades({ start, end });
}

export function serveEvidence(pathname, res) {
  const name = path.basename(decodeURIComponent(pathname));
  const filePath = path.resolve(evidenceRoot, name);
  if (!filePath.startsWith(evidenceRoot) || !fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const type = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
  fs.createReadStream(filePath).pipe(res);
}

export async function readJsonBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 18 * 1024 * 1024) {
      const error = new Error("Trade payload is too large. Keep screenshots below 4 MB each.");
      error.status = 413;
      throw error;
    }
  }

  if (!body.trim()) return {};
  try {
    return JSON.parse(body);
  } catch {
    const error = new Error("Invalid JSON payload.");
    error.status = 400;
    throw error;
  }
}

export function sendJson(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}
