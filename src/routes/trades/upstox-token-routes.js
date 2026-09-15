import fs from "node:fs";
import path from "node:path";
import { paperTradeEngine } from "../../services/paperTradeEngine.js";
import { ensurePaperEngineStarted } from "./paper-sse.js";
import { readJsonBody, sendJson } from "./route-helpers.js";

function checkUpstoxTokenExpired(updatedAtIso, fileMtimeMs) {
  const dateToCheck = updatedAtIso ? new Date(updatedAtIso) : fileMtimeMs ? new Date(fileMtimeMs) : null;
  if (!dateToCheck || isNaN(dateToCheck.getTime())) return true;
  const now = new Date();
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 22, 0, 0, 0));
  if (now.getUTCHours() < 22) {
    cutoff.setUTCDate(cutoff.getUTCDate() - 1);
  }
  return dateToCheck.getTime() < cutoff.getTime();
}

export async function handleUpstoxTokenRoutes(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/upstox/token-status") {
    ensurePaperEngineStarted();
    const client = paperTradeEngine.client;
    client.refreshAccessToken();
    const token = client.accessToken || "";
    let sessionAgeMinutes = null;
    let fileExists = false;
    let updatedAt = null;
    let fileMtimeMs = null;

    try {
      if (fs.existsSync(client.sessionFile)) {
        fileExists = true;
        const stat = fs.statSync(client.sessionFile);
        fileMtimeMs = stat.mtimeMs;
        sessionAgeMinutes = Math.round((Date.now() - stat.mtimeMs) / 60000);
        const raw = JSON.parse(fs.readFileSync(client.sessionFile, "utf8"));
        updatedAt = raw.updated_at || raw.created_at || null;
      }
    } catch { /* ignore */ }

    const isExpired = checkUpstoxTokenExpired(updatedAt, fileMtimeMs);
    const hasValidToken = Boolean(token && token.length > 20 && !isExpired);

    sendJson(res, {
      configured: client.isConfigured(),
      hasToken: Boolean(token),
      tokenLength: token.length,
      sessionFile: path.basename(client.sessionFile),
      sessionFileExists: fileExists,
      sessionAgeMinutes,
      isExpired,
      isPreMarketReady: hasValidToken,
      websocketConnected: client.connected,
      polling: Boolean(client.pollTimer),
      lastError: client.lastError,
      status: hasValidToken ? "Token Active · Feed Ready" : isExpired ? "Expired (03:30 AM IST Daily Reset)" : "Token Required · OAuth Expired",
    });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/upstox/set-token") {
    const body = await readJsonBody(req);
    const token = String(body.accessToken || body.token || "").trim();
    if (!token) {
      sendJson(res, { error: "accessToken is required" }, 422);
      return true;
    }
    const client = paperTradeEngine.client;
    try {
      fs.mkdirSync(path.dirname(client.sessionFile), { recursive: true });
      fs.writeFileSync(client.sessionFile, JSON.stringify({
        access_token: token,
        updated_at: new Date().toISOString(),
      }, null, 2));
      client.refreshAccessToken();
      client.lastError = "";
      if (paperTradeEngine.started) {
        client.start();
      }
      sendJson(res, { success: true, message: "Upstox token saved and client reloaded successfully." });
    } catch (error) {
      sendJson(res, { error: `Failed to save session: ${error.message}` }, 500);
    }
    return true;
  }

  return false;
}
