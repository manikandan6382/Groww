import fs from "node:fs";
import crypto from "node:crypto";
import { defaultExchangeCalendar } from "../services/engine/exchangeCalendar.js";
import { renderUpstoxCallbackHtml, renderKiteCallbackHtml } from "./htmlTemplates.js";
import { exchangeKiteRequestToken, exchangeUpstoxCode } from "./oauthExchange.js";
import { sendJson } from "./staticServer.js";

// Top-level module store for CSRF OAuth states (TDZ safe)
const oauthStates = new Map();

export function createOAuthState() {
  const cutoff = Date.now() - 15 * 60 * 1000;
  for (const [key, timestamp] of oauthStates.entries()) {
    if (timestamp < cutoff) oauthStates.delete(key);
  }
  const state = crypto.randomBytes(16).toString("hex");
  oauthStates.set(state, Date.now());
  return state;
}

export function validateOAuthState(state) {
  if (!state) return true; // Graceful fallback
  const timestamp = oauthStates.get(state);
  if (timestamp) {
    oauthStates.delete(state);
    return (Date.now() - timestamp) <= 15 * 60 * 1000;
  }
  return false;
}

export async function sendBrokerStatus(res, sessionFile, upstoxSessionFile) {
  let kiteConnected = false;
  let kiteExpired = false;
  let kiteUserName = "";
  let kiteUserId = "";
  let kiteAgeMinutes = null;
  if (fs.existsSync(sessionFile)) {
    try {
      const stat = fs.statSync(sessionFile);
      kiteAgeMinutes = Math.round((Date.now() - stat.mtimeMs) / 60000);
      const raw = JSON.parse(fs.readFileSync(sessionFile, "utf8"));
      if (raw.access_token) {
        kiteUserName = raw.user_name || "";
        kiteUserId = raw.user_id || "";

        // Kite tokens reset daily at 06:00 AM IST per SEBI protocol (00:30 UTC)
        const dateToCheck = raw.saved_at ? new Date(raw.saved_at) : (raw.login_time ? new Date(raw.login_time) : new Date(stat.mtimeMs));
        const istNow = new Date(Date.now() + 5.5 * 3600 * 1000);
        const istCutoff = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate(), 6, 0, 0, 0));
        if (istNow.getUTCHours() < 6) istCutoff.setUTCDate(istCutoff.getUTCDate() - 1);
        const utcCutoffMs = istCutoff.getTime() - 5.5 * 3600 * 1000;

        kiteExpired = dateToCheck.getTime() < utcCutoffMs;
        kiteConnected = !kiteExpired;
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

  const tradingDay = defaultExchangeCalendar.isTradingDay(new Date());

  await sendJson(res, {
    kite: {
      connected: kiteConnected,
      isExpired: kiteExpired,
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
    market: {
      isTradingDay: tradingDay.isTradingDay,
      marketHoliday: !tradingDay.isTradingDay,
      status: tradingDay.status,
      reason: tradingDay.holiday?.description || tradingDay.reason || null,
      dateStr: tradingDay.dateStr
    }
  });
}

export async function sendUpstoxCallback(res, url, upstoxSessionFile) {
  const code = url.searchParams.get("code") || "";
  const error = url.searchParams.get("error") || url.searchParams.get("message") || "";
  const state = url.searchParams.get("state") || "";
  let status = "";
  let statusTone = "ok";
  let tokenSaved = false;

  if (state && !validateOAuthState(state)) {
    const upstoxClientId = process.env.UPSTOX_API_KEY || "61557114-951e-4b68-af88-e5121939f2e4";
    const redirectUri = process.env.UPSTOX_REDIRECT_URI || "http://127.0.0.1:3003/upstox/callback";
    const retryAuthUrl = `https://api.upstox.com/v2/login/authorization/dialog?response_type=code&client_id=${encodeURIComponent(upstoxClientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(createOAuthState())}`;

    const body = renderUpstoxCallbackHtml({
      isError: true,
      tokenSaved: false,
      error: "OAuth state parameter validation failed (expired or invalid). Please retry login.",
      status: "",
      retryAuthUrl,
    });
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(body);
  }

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
  const retryAuthUrl = `https://api.upstox.com/v2/login/authorization/dialog?response_type=code&client_id=${encodeURIComponent(upstoxClientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(createOAuthState())}`;

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
