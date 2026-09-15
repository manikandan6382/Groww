import fs from "node:fs";
import { renderUpstoxCallbackHtml, renderKiteCallbackHtml } from "./htmlTemplates.js";
import { exchangeKiteRequestToken, exchangeUpstoxCode } from "./oauthExchange.js";
import { sendJson } from "./staticServer.js";

export async function sendBrokerStatus(res, sessionFile, upstoxSessionFile) {
  let kiteConnected = false;
  let kiteUserName = "";
  let kiteUserId = "";
  let kiteAgeMinutes = null;
  if (fs.existsSync(sessionFile)) {
    try {
      const stat = fs.statSync(sessionFile);
      kiteAgeMinutes = Math.round((Date.now() - stat.mtimeMs) / 60000);
      const raw = JSON.parse(fs.readFileSync(sessionFile, "utf8"));
      if (raw.access_token) {
        kiteConnected = true;
        kiteUserName = raw.user_name || "";
        kiteUserId = raw.user_id || "";
      }
    } catch { /* ignore */ }
  }

  let upstoxConnected = false;
  let upstoxExpired = false;
  let upstoxAgeMinutes = null;
  if (fs.existsSync(upstoxSessionFile)) {
    try {
      const stat = fs.statSync(upstoxSessionFile);
      upstoxAgeMinutes = Math.round((Date.now() - stat.mtimeMs) / 60000);
      const raw = JSON.parse(fs.readFileSync(upstoxSessionFile, "utf8"));
      if (raw.access_token) {
        const dateToCheck = raw.updated_at ? new Date(raw.updated_at) : new Date(stat.mtimeMs);
        const now = new Date();
        const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 22, 0, 0, 0));
        if (now.getUTCHours() < 22) cutoff.setUTCDate(cutoff.getUTCDate() - 1);
        upstoxExpired = dateToCheck.getTime() < cutoff.getTime();
        upstoxConnected = !upstoxExpired;
      }
    } catch { /* ignore */ }
  }

  await sendJson(res, {
    kite: {
      connected: kiteConnected,
      userName: kiteUserName,
      userId: kiteUserId,
      sessionAgeMinutes: kiteAgeMinutes,
      sessionFileExists: fs.existsSync(sessionFile),
    },
    upstox: {
      connected: upstoxConnected,
      isExpired: upstoxExpired,
      sessionAgeMinutes: upstoxAgeMinutes,
      sessionFileExists: fs.existsSync(upstoxSessionFile),
    },
  });
}

export async function sendUpstoxCallback(res, url, upstoxSessionFile) {
  const code = url.searchParams.get("code") || "";
  const error = url.searchParams.get("error") || url.searchParams.get("message") || "";
  let status = "";
  let statusTone = "ok";
  let tokenSaved = false;

  if (code && !error) {
    try {
      await exchangeUpstoxCode(code, upstoxSessionFile);
      tokenSaved = true;
      status = "Upstox Pro token authenticated successfully! Live market feed and options chain active.";
    } catch (callbackError) {
      statusTone = "error";
      status = callbackError.message;
    }
  }

  const isError = Boolean(error) || statusTone === "error";
  const upstoxClientId = process.env.UPSTOX_API_KEY || "61557114-951e-4b68-af88-e5121939f2e4";
  const redirectUri = process.env.UPSTOX_REDIRECT_URI || "http://127.0.0.1:3003/upstox/callback";
  const retryAuthUrl = `https://api.upstox.com/v2/login/authorization/dialog?response_type=code&client_id=${encodeURIComponent(upstoxClientId)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  const body = renderUpstoxCallbackHtml({ isError, tokenSaved, error, status, retryAuthUrl });
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(body);
}

export async function sendKiteCallback(res, url, sessionFile) {
  const requestToken = url.searchParams.get("request_token") || "";
  const statusParam = url.searchParams.get("status") || "";
  const errorParam = url.searchParams.get("message") || "";
  let message = "";
  let statusTone = "ok";
  let tokenSaved = false;

  if (statusParam === "error" || errorParam) {
    statusTone = "error";
    message = errorParam || "Zerodha Kite authorization was rejected or cancelled.";
  } else if (requestToken) {
    try {
      const sessionData = await exchangeKiteRequestToken(requestToken, sessionFile);
      tokenSaved = true;
      message = `Access token saved for ${sessionData.user_name || sessionData.user_id || "Zerodha User"}. Live portfolio and holdings are synchronized!`;
    } catch (err) {
      statusTone = "error";
      message = err.message;
    }
  }

  const isError = statusTone === "error";
  const apiKey = process.env.KITE_API_KEY || "3fm9odz8emxrymjo";
  const retryAuthUrl = `https://kite.zerodha.com/connect/login?v=3&api_key=${encodeURIComponent(apiKey)}`;

  const body = renderKiteCallbackHtml({ isError, tokenSaved, message, retryAuthUrl });
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(body);
}
