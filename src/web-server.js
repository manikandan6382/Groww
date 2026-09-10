import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleTradingRequest } from "./routes/trades.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const publicDir = path.join(projectRoot, "public");
const distDir = path.join(projectRoot, "dist");
const staticDir = fs.existsSync(path.join(distDir, "index.html")) ? distDir : publicDir;

loadDotEnv(path.join(projectRoot, ".env"));

const port = Number(process.env.PORT || 3003);
const kiteApiBase = "https://api.kite.trade";
const alphaApiBase = "https://www.alphavantage.co/query";
const upstoxTokenUrl = "https://api.upstox.com/v2/login/authorization/token";
const sessionFile = path.resolve(projectRoot, process.env.KITE_SESSION_FILE || ".zerodha-session.json");
const upstoxSessionFile = path.resolve(projectRoot, process.env.UPSTOX_SESSION_FILE || path.join("data", "upstox-session.json"));
const alphaCache = new Map();
const quotesCache = new Map();
const instrumentCache = { savedAt: 0, payload: null };

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    if (await handleTradingRequest(req, res, url)) {
      return;
    }
    if (url.pathname === "/api/portfolio") {
      await sendJson(res, await getPortfolio());
      return;
    }
    if (url.pathname === "/api/yahoo/chart") {
      await sendJson(res, await getYahooChart(url));
      return;
    }
    if (url.pathname === "/api/yahoo/quotes") {
      await sendJson(res, await getYahooQuotes(url));
      return;
    }
    if (url.pathname === "/api/alpha/foreign-quotes") {
      await sendJson(res, await getAlphaForeignQuotes(url));
      return;
    }
    if (url.pathname === "/api/stocks/search") {
      await sendJson(res, await searchStocks(url));
      return;
    }
    if (url.pathname === "/api/broker/status" || url.pathname === "/api/kite/token-status") {
      await sendBrokerStatus(res);
      return;
    }
    if (url.pathname === "/upstox/callback") {
      await sendUpstoxCallback(res, url);
      return;
    }
    if (url.pathname === "/kite/callback" || url.pathname === "/callback" || (url.searchParams.has("request_token") && url.pathname === "/")) {
      await sendKiteCallback(res, url);
      return;
    }
    await serveStatic(url.pathname, res);
  } catch (error) {
    await sendJson(res, { error: error.message }, error.status || 500);
  }
});

server.listen(port, () => {
  console.log(`Finance dashboard running at http://127.0.0.1:${port}`);
});

async function getPortfolio() {
  try {
    const [holdings, positions, margins] = await Promise.all([
      kiteRequest("/portfolio/holdings"),
      kiteRequest("/portfolio/positions"),
      kiteRequest("/user/margins/equity"),
    ]);
    return {
      updatedAt: new Date().toISOString(),
      holdings: holdings.data || [],
      positions: positions.data || [],
      margins: margins.data || { net: 100000, available: 100000, utilised: 0 },
    };
  } catch (error) {
    return {
      updatedAt: new Date().toISOString(),
      holdings: [],
      positions: [],
      margins: { net: 100000, available: 100000, utilised: 0 },
      isKiteOffline: true,
      message: error.message,
    };
  }
}

async function getYahooChart(url) {
  const symbol = url.searchParams.get("symbol") || "^NSEI";
  const range = url.searchParams.get("range") || "1mo";
  const interval = url.searchParams.get("interval") || "1d";
  const endpoint = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  endpoint.searchParams.set("range", range);
  endpoint.searchParams.set("interval", interval);
  endpoint.searchParams.set("includePrePost", "false");
  return fetchJson(endpoint);
}

async function getYahooQuotes(url) {
  const symbols = url.searchParams.get("symbols") || "^NSEI,^BSESN,RELIANCE.NS,HDFCBANK.NS,TCS.NS,INFY.NS";
  const now = Date.now();
  const rawList = symbols
    .split(",")
    .map((symbol) => symbol.trim())
    .filter(Boolean);

  const settled = await Promise.allSettled(
    rawList.map(async (symbol) => {
      const cached = quotesCache.get(symbol);
      if (cached && now - cached.savedAt < 3500) {
        return cached.data;
      }
      const endpoint = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
      endpoint.searchParams.set("range", "5d");
      endpoint.searchParams.set("interval", "1d");
      const data = await fetchJson(endpoint);
      const chart = data.chart?.result?.[0];
      const meta = chart?.meta || {};
      const closes = chart?.indicators?.quote?.[0]?.close?.filter((value) => typeof value === "number") || [];
      const last = Number(meta.regularMarketPrice ?? closes.at(-1) ?? 0);
      const previous = Number(meta.chartPreviousClose ?? closes.at(-2) ?? last);
      const change = last - previous;
      const quoteObj = {
        symbol,
        regularMarketPrice: last,
        regularMarketChange: change,
        regularMarketChangePercent: previous ? (change / previous) * 100 : 0,
      };
      if (last > 0) {
        quotesCache.set(symbol, { savedAt: now, data: quoteObj });
      }
      return quoteObj;
    }),
  );
  const result = settled.filter((item) => item.status === "fulfilled").map((item) => item.value);
  return { quoteResponse: { result } };
}

async function getAlphaForeignQuotes(url) {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  const symbols = (url.searchParams.get("symbols") || "AAPL,MSFT,NVDA,QQQ")
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 5);

  if (!apiKey) {
    return {
      provider: "Alpha Vantage",
      configured: false,
      items: [],
      message: "Missing ALPHA_VANTAGE_API_KEY in .env.",
    };
  }

  const cacheKey = symbols.join(",");
  const cached = alphaCache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < 15 * 60 * 1000) {
    return { ...cached.payload, cached: true };
  }

  const items = [];
  let message = "";
  for (const [index, symbol] of symbols.entries()) {
    if (index > 0) await sleep(1250);
    const endpoint = new URL(alphaApiBase);
    endpoint.searchParams.set("function", "GLOBAL_QUOTE");
    endpoint.searchParams.set("symbol", symbol);
    endpoint.searchParams.set("apikey", apiKey);

    const data = await fetchJson(endpoint);
    const notice = data.Note || data.Information;
    if (notice) {
      message = notice;
      break;
    }

    const quote = data["Global Quote"];
    if (!quote?.["01. symbol"]) continue;
    items.push({
      symbol: quote["01. symbol"],
      price: Number(quote["05. price"] || 0),
      change: Number(quote["09. change"] || 0),
      changePercent: parsePercent(quote["10. change percent"]),
      latestTradingDay: quote["07. latest trading day"] || "",
    });
  }

  const payload = {
    provider: "Alpha Vantage",
    configured: true,
    refreshedAt: new Date().toISOString(),
    items,
    message,
  };
  alphaCache.set(cacheKey, { savedAt: Date.now(), payload });
  return payload;
}

async function searchStocks(url) {
  const query = normalizeSearch(url.searchParams.get("q") || "");
  const limit = Math.max(1, Math.min(Number(url.searchParams.get("limit") || 20), 50));
  const universe = await getStockUniverse();
  const ranked = (universe.items || [])
    .map((item) => ({ item, score: scoreStockMatch(item, query) }))
    .filter((entry) => (query ? entry.score < 99 : true))
    .sort((a, b) => a.score - b.score || a.item.tradingsymbol.localeCompare(b.item.tradingsymbol))
    .slice(0, limit)
    .map((entry) => entry.item);

  // If query is valid and not already in ranked list, offer direct symbol addition
  if (query && query.length >= 2 && !ranked.some(item => item.tradingsymbol.toUpperCase() === query)) {
    ranked.push({
      tradingsymbol: query,
      name: `${query} (Direct NSE Ticker)`,
      exchange: "NSE",
      yahooSymbol: `${query}.NS`,
    });
  }

  return {
    source: universe.source,
    count: ranked.length,
    items: ranked,
  };
}

async function sendBrokerStatus(res) {
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
  let upstoxAgeMinutes = null;
  if (fs.existsSync(upstoxSessionFile)) {
    try {
      const stat = fs.statSync(upstoxSessionFile);
      upstoxAgeMinutes = Math.round((Date.now() - stat.mtimeMs) / 60000);
      const raw = JSON.parse(fs.readFileSync(upstoxSessionFile, "utf8"));
      if (raw.access_token) {
        upstoxConnected = true;
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
      sessionAgeMinutes: upstoxAgeMinutes,
      sessionFileExists: fs.existsSync(upstoxSessionFile),
    },
  });
}

async function sendUpstoxCallback(res, url) {
  const code = url.searchParams.get("code") || "";
  const error = url.searchParams.get("error") || url.searchParams.get("message") || "";
  let status = "";
  let statusTone = "ok";
  let tokenSaved = false;

  if (code && !error) {
    try {
      await exchangeUpstoxCode(code);
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

  const body = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${tokenSaved ? '<meta http-equiv="refresh" content="2;url=/practice?connected=upstox" />' : ""}
    <title>Upstox Pro Authentication - PortfolioX</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: radial-gradient(circle at 50% 20%, #110d2e 0%, #030712 100%); color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif; padding: 16px; }
      main { width: min(540px, 100%); border: 1px solid rgba(168,85,247,0.25); border-radius: 24px; padding: 32px; background: rgba(15,23,42,0.85); backdrop-filter: blur(20px); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6), 0 0 40px rgba(168,85,247,0.15); text-align: center; }
      .pill { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 6px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; font-family: ui-monospace, monospace; }
      .pill.success { color: #34d399; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3); }
      .pill.error { color: #f87171; background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3); }
      h1 { margin: 18px 0 10px; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
      p { color: #94a3b8; line-height: 1.6; font-size: 14px; margin: 0 0 20px; }
      .countdown { font-size: 13px; color: #a855f7; font-weight: 600; margin-bottom: 24px; }
      .actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
      .btn { display: inline-flex; align-items: center; justify-content: center; padding: 11px 22px; border-radius: 12px; font-size: 13px; font-weight: 700; text-decoration: none; transition: all 0.15s ease; cursor: pointer; }
      .btn-primary { background: linear-gradient(135deg, #a855f7, #7c3aed); color: #fff; box-shadow: 0 4px 14px rgba(168,85,247,0.35); }
      .btn-primary:hover { opacity: 0.92; transform: translateY(-1px); }
      .btn-secondary { background: rgba(255,255,255,0.05); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.1); }
      .btn-secondary:hover { background: rgba(255,255,255,0.1); color: #fff; }
    </style>
  </head>
  <body>
    <main>
      <span class="pill ${isError ? "error" : "success"}">
        ${isError ? "Authentication Issue" : tokenSaved ? "Upstox Live Active" : "Authorization Received"}
      </span>
      <h1>${isError ? "Connection Needs Attention" : tokenSaved ? "Upstox Feed Ready" : "OAuth Code Received"}</h1>
      <p>${isError ? escapeHtml(error || status) : escapeHtml(status || "OAuth code verified. Session credentials saved successfully.")}</p>
      
      ${tokenSaved ? '<div class="countdown">Redirecting to Practice Lab in <span id="cd">2</span>s...</div>' : ""}
      
      <div class="actions">
        ${tokenSaved ? `
          <a href="/practice?connected=upstox" class="btn btn-primary">Open Practice Cockpit</a>
          <a href="/?connected=upstox" class="btn btn-secondary">Portfolio View</a>
        ` : `
          <a href="${retryAuthUrl}" class="btn btn-primary">Retry Upstox Login</a>
          <a href="/practice" class="btn btn-secondary">Return to Cockpit</a>
        `}
      </div>
    </main>
    ${tokenSaved ? `
    <script>
      let c = 2;
      const el = document.getElementById("cd");
      const it = setInterval(() => {
        c--;
        if (el) el.textContent = c;
        if (c <= 0) {
          clearInterval(it);
          window.location.replace("/practice?connected=upstox");
        }
      }, 1000);
    </script>
    ` : ""}
  </body>
</html>`;

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(body);
}

async function sendKiteCallback(res, url) {
  const requestToken = url.searchParams.get("request_token") || "";
  const statusParam = url.searchParams.get("status") || "";
  const errorParam = url.searchParams.get("message") || "";
  let message = "";
  let statusTone = "ok";
  let tokenSaved = false;
  let sessionData = null;

  if (statusParam === "error" || errorParam) {
    statusTone = "error";
    message = errorParam || "Zerodha Kite authorization was rejected or cancelled.";
  } else if (requestToken) {
    try {
      sessionData = await exchangeKiteRequestToken(requestToken);
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

  const body = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${tokenSaved ? '<meta http-equiv="refresh" content="2;url=/practice?connected=kite" />' : ""}
    <title>Zerodha Kite Authentication - PortfolioX</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: radial-gradient(circle at 50% 20%, #171109 0%, #030712 100%); color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif; padding: 16px; }
      main { width: min(540px, 100%); border: 1px solid rgba(249,115,22,0.3); border-radius: 24px; padding: 32px; background: rgba(15,23,42,0.85); backdrop-filter: blur(20px); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6), 0 0 40px rgba(249,115,22,0.15); text-align: center; }
      .pill { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 6px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; font-family: ui-monospace, monospace; }
      .pill.success { color: #34d399; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3); }
      .pill.error { color: #f87171; background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3); }
      h1 { margin: 18px 0 10px; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
      p { color: #94a3b8; line-height: 1.6; font-size: 14px; margin: 0 0 20px; }
      .countdown { font-size: 13px; color: #f97316; font-weight: 600; margin-bottom: 24px; }
      .actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
      .btn { display: inline-flex; align-items: center; justify-content: center; padding: 11px 22px; border-radius: 12px; font-size: 13px; font-weight: 700; text-decoration: none; transition: all 0.15s ease; cursor: pointer; }
      .btn-primary { background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; box-shadow: 0 4px 14px rgba(249,115,22,0.35); }
      .btn-primary:hover { opacity: 0.92; transform: translateY(-1px); }
      .btn-secondary { background: rgba(255,255,255,0.05); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.1); }
      .btn-secondary:hover { background: rgba(255,255,255,0.1); color: #fff; }
    </style>
  </head>
  <body>
    <main>
      <span class="pill ${isError ? "error" : "success"}">
        ${isError ? "Zerodha Issue" : tokenSaved ? "Zerodha Kite Linked" : "Token Received"}
      </span>
      <h1>${isError ? "Authorization Needs Attention" : tokenSaved ? "Zerodha Demat Connected" : "Request Token Received"}</h1>
      <p>${escapeHtml(message || (tokenSaved ? "Your Zerodha account is authenticated. Live equity margins & positions are accessible." : "Token received, but session exchange was skipped."))}</p>
      
      ${tokenSaved ? '<div class="countdown">Redirecting to Practice Cockpit in <span id="cd">2</span>s...</div>' : ""}
      
      <div class="actions">
        ${tokenSaved ? `
          <a href="/practice?connected=kite" class="btn btn-primary">Open Practice Cockpit</a>
          <a href="/?connected=kite" class="btn btn-secondary">Portfolio View</a>
        ` : `
          <a href="${retryAuthUrl}" class="btn btn-primary">Retry Zerodha Login</a>
          <a href="/practice" class="btn btn-secondary">Return to Cockpit</a>
        `}
      </div>
    </main>
    ${tokenSaved ? `
    <script>
      let c = 2;
      const el = document.getElementById("cd");
      const it = setInterval(() => {
        c--;
        if (el) el.textContent = c;
        if (c <= 0) {
          clearInterval(it);
          window.location.replace("/practice?connected=kite");
        }
      }, 1000);
    </script>
    ` : ""}
  </body>
</html>`;

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(body);
}

async function exchangeKiteRequestToken(requestToken) {
  const apiKey = requiredEnv("KITE_API_KEY");
  const apiSecret = requiredEnv("KITE_API_SECRET");
  const checksum = crypto
    .createHash("sha256")
    .update(`${apiKey}${requestToken}${apiSecret}`)
    .digest("hex");

  const body = new URLSearchParams({
    api_key: apiKey,
    request_token: requestToken,
    checksum,
  });

  const response = await fetch(`${kiteApiBase}/session/token`, {
    method: "POST",
    headers: {
      "X-Kite-Version": "3",
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 finance-dashboard",
    },
    body: body.toString(),
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!response.ok || data?.status === "error" || !data?.data?.access_token) {
    throw new Error(data?.message || response.statusText || "Failed to exchange Kite request_token for access_token.");
  }

  const session = {
    api_key: apiKey,
    access_token: data.data.access_token,
    public_token: data.data.public_token,
    user_id: data.data.user_id,
    user_name: data.data.user_name,
    login_time: data.data.login_time,
    saved_at: new Date().toISOString(),
  };

  fs.mkdirSync(path.dirname(sessionFile), { recursive: true });
  fs.writeFileSync(sessionFile, JSON.stringify(session, null, 2));
  process.env.KITE_ACCESS_TOKEN = data.data.access_token;
  return session;
}

async function exchangeUpstoxCode(code) {
  const apiKey = process.env.UPSTOX_API_KEY || process.env.UPSTOX_CLIENT_ID || "61557114-951e-4b68-af88-e5121939f2e4";
  const apiSecret = process.env.UPSTOX_API_SECRET || process.env.UPSTOX_CLIENT_SECRET;
  const redirectUri = process.env.UPSTOX_REDIRECT_URI || "http://127.0.0.1:3003/upstox/callback";

  if (!apiKey || !apiSecret) {
    throw new Error("Missing UPSTOX_API_KEY or UPSTOX_API_SECRET in .env. Please configure your Upstox API credentials.");
  }

  const body = new URLSearchParams({
    code,
    client_id: apiKey,
    client_secret: apiSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch(upstoxTokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 finance-dashboard",
    },
    body: body.toString(),
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!response.ok || !data?.access_token) {
    const errorMsg = data?.message || data?.errors?.[0]?.message || response.statusText || text || "Failed to exchange Upstox authorization code.";
    throw new Error(errorMsg);
  }

  let userName = data.user_name || data.user_id || "Upstox User";
  let userId = data.user_id || "";

  // Optionally query user profile for detailed username
  try {
    const profileRes = await fetch("https://api.upstox.com/v2/user/profile", {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${data.access_token}`,
      },
    });
    if (profileRes.ok) {
      const profileData = await profileRes.json();
      if (profileData.data) {
        userName = profileData.data.user_name || userName;
        userId = profileData.data.user_id || userId;
      }
    }
  } catch {
    // Non-fatal, fallback to token payload
  }

  const session = {
    access_token: data.access_token,
    token_type: data.token_type || "Bearer",
    user_name: userName,
    user_id: userId,
    user: userName,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    source: "oauth_web_callback",
  };

  fs.mkdirSync(path.dirname(upstoxSessionFile), { recursive: true });
  fs.writeFileSync(upstoxSessionFile, JSON.stringify(session, null, 2), "utf8");
  process.env.UPSTOX_ACCESS_TOKEN = data.access_token;
  console.log(`✅ [Upstox Auth] Token exchanged and saved to ${upstoxSessionFile} for user ${userName} (${userId})`);

  return session;
}

async function getStockUniverse() {
  if (instrumentCache.payload && Array.isArray(instrumentCache.payload.items) && instrumentCache.payload.items.length > 0 && Date.now() - instrumentCache.savedAt < 12 * 60 * 60 * 1000) {
    return { ...instrumentCache.payload, cached: true };
  }

  try {
    const csv = await downloadInstrumentCsv();
    const rows = parseCsv(csv);
    const items = rows
      .filter((row) => ["NSE", "BSE"].includes(row.exchange))
      .filter((row) => row.instrument_type === "EQ")
      .filter((row) => row.tradingsymbol && row.name)
      .map((row) => ({
        tradingsymbol: row.tradingsymbol,
        name: row.name,
        exchange: row.exchange,
        yahooSymbol: toYahooInstrumentSymbol(row.tradingsymbol, row.exchange),
      }))
      .sort((a, b) => a.tradingsymbol.localeCompare(b.tradingsymbol));
    if (items.length > 100) {
      instrumentCache.payload = { source: "Kite instruments", items };
      instrumentCache.savedAt = Date.now();
      return instrumentCache.payload;
    }
  } catch {
    // Fall back to the bundled list so search still works without a fresh Kite session.
  }

  const fallback = {
    source: "Built-in NSE/BSE Universe",
    items: fallbackStocks.map((item) => ({
      ...item,
      yahooSymbol: toYahooInstrumentSymbol(item.tradingsymbol, item.exchange),
    })),
  };
  instrumentCache.payload = fallback;
  instrumentCache.savedAt = Date.now();
  return fallback;
}

async function downloadInstrumentCsv() {
  try {
    return await fetchText(`${kiteApiBase}/instruments`);
  } catch (error) {
    const session = tryGetSession();
    if (!session) throw error;
    return fetchText(`${kiteApiBase}/instruments`, {
      headers: {
        "X-Kite-Version": "3",
        Authorization: `token ${session.apiKey}:${session.accessToken}`,
      },
    });
  }
}

async function kiteRequest(endpoint) {
  const { apiKey, accessToken } = getSession();
  return fetchJson(`${kiteApiBase}${endpoint}`, {
    headers: {
      "X-Kite-Version": "3",
      Authorization: `token ${apiKey}:${accessToken}`,
    },
  });
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "User-Agent": "Mozilla/5.0 finance-dashboard",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!response.ok || data?.status === "error") {
    throw new Error(data?.message || response.statusText);
  }
  return data;
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "User-Agent": "Mozilla/5.0 finance-dashboard",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || response.statusText);
  }
  return text;
}

function getSession() {
  const apiKey = requiredEnv("KITE_API_KEY");
  const envToken = process.env.KITE_ACCESS_TOKEN;
  if (envToken) return { apiKey, accessToken: envToken };
  if (!fs.existsSync(sessionFile)) {
    throw new Error("No Kite session found. Generate a session with the MCP login flow first.");
  }
  const session = JSON.parse(fs.readFileSync(sessionFile, "utf8"));
  if (!session.access_token) {
    throw new Error("Saved Kite session has no access token.");
  }
  return { apiKey, accessToken: session.access_token };
}

function tryGetSession() {
  try {
    return getSession();
  } catch {
    return null;
  }
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Add it to .env.`);
  return value;
}

function parsePercent(value) {
  if (typeof value !== "string") return Number(value || 0);
  return Number(value.replace("%", "")) || 0;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = parseCsvLine(lines.shift() || "");
  return lines.map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
  });
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function normalizeSearch(value) {
  return value.trim().toUpperCase().replace(/\.(NS|BO)$/, "");
}

function scoreStockMatch(item, query) {
  if (!query) return 10;
  const symbol = item.tradingsymbol.toUpperCase();
  const name = item.name.toUpperCase();
  if (symbol === query) return 0;
  if (symbol.startsWith(query)) return 1;
  if (name.startsWith(query)) return 2;
  if (symbol.includes(query)) return 3;
  if (name.includes(query)) return 4;
  return 99;
}

function toYahooInstrumentSymbol(tradingsymbol, exchange) {
  return `${tradingsymbol}.${exchange === "BSE" ? "BO" : "NS"}`;
}

const fallbackStocks = [
  { tradingsymbol: "RELIANCE", name: "Reliance Industries", exchange: "NSE" },
  { tradingsymbol: "TCS", name: "Tata Consultancy Services", exchange: "NSE" },
  { tradingsymbol: "HDFCBANK", name: "HDFC Bank", exchange: "NSE" },
  { tradingsymbol: "ICICIBANK", name: "ICICI Bank", exchange: "NSE" },
  { tradingsymbol: "INFY", name: "Infosys", exchange: "NSE" },
  { tradingsymbol: "BHARTIARTL", name: "Bharti Airtel", exchange: "NSE" },
  { tradingsymbol: "SBIN", name: "State Bank of India", exchange: "NSE" },
  { tradingsymbol: "LICI", name: "Life Insurance Corporation of India", exchange: "NSE" },
  { tradingsymbol: "ITC", name: "ITC", exchange: "NSE" },
  { tradingsymbol: "HINDUNILVR", name: "Hindustan Unilever", exchange: "NSE" },
  { tradingsymbol: "LT", name: "Larsen and Toubro", exchange: "NSE" },
  { tradingsymbol: "BAJFINANCE", name: "Bajaj Finance", exchange: "NSE" },
  { tradingsymbol: "HCLTECH", name: "HCL Technologies", exchange: "NSE" },
  { tradingsymbol: "MARUTI", name: "Maruti Suzuki India", exchange: "NSE" },
  { tradingsymbol: "SUNPHARMA", name: "Sun Pharmaceutical Industries", exchange: "NSE" },
  { tradingsymbol: "KOTAKBANK", name: "Kotak Mahindra Bank", exchange: "NSE" },
  { tradingsymbol: "AXISBANK", name: "Axis Bank", exchange: "NSE" },
  { tradingsymbol: "M&M", name: "Mahindra and Mahindra", exchange: "NSE" },
  { tradingsymbol: "ULTRACEMCO", name: "UltraTech Cement", exchange: "NSE" },
  { tradingsymbol: "TITAN", name: "Titan Company", exchange: "NSE" },
  { tradingsymbol: "NTPC", name: "NTPC", exchange: "NSE" },
  { tradingsymbol: "ONGC", name: "Oil and Natural Gas Corporation", exchange: "NSE" },
  { tradingsymbol: "POWERGRID", name: "Power Grid Corporation of India", exchange: "NSE" },
  { tradingsymbol: "ADANIENT", name: "Adani Enterprises", exchange: "NSE" },
  { tradingsymbol: "ADANIPORTS", name: "Adani Ports and Special Economic Zone", exchange: "NSE" },
  { tradingsymbol: "COALINDIA", name: "Coal India", exchange: "NSE" },
  { tradingsymbol: "BAJAJFINSV", name: "Bajaj Finserv", exchange: "NSE" },
  { tradingsymbol: "WIPRO", name: "Wipro", exchange: "NSE" },
  { tradingsymbol: "ASIANPAINT", name: "Asian Paints", exchange: "NSE" },
  { tradingsymbol: "NESTLEIND", name: "Nestle India", exchange: "NSE" },
  { tradingsymbol: "TATAMOTORS", name: "Tata Motors", exchange: "NSE" },
  { tradingsymbol: "TATASTEEL", name: "Tata Steel", exchange: "NSE" },
  { tradingsymbol: "JSWSTEEL", name: "JSW Steel", exchange: "NSE" },
  { tradingsymbol: "HINDALCO", name: "Hindalco Industries", exchange: "NSE" },
  { tradingsymbol: "GRASIM", name: "Grasim Industries", exchange: "NSE" },
  { tradingsymbol: "TECHM", name: "Tech Mahindra", exchange: "NSE" },
  { tradingsymbol: "CIPLA", name: "Cipla", exchange: "NSE" },
  { tradingsymbol: "DRREDDY", name: "Dr. Reddy's Laboratories", exchange: "NSE" },
  { tradingsymbol: "DIVISLAB", name: "Divi's Laboratories", exchange: "NSE" },
  { tradingsymbol: "APOLLOHOSP", name: "Apollo Hospitals Enterprise", exchange: "NSE" },
  { tradingsymbol: "EICHERMOT", name: "Eicher Motors", exchange: "NSE" },
  { tradingsymbol: "HEROMOTOCO", name: "Hero MotoCorp", exchange: "NSE" },
  { tradingsymbol: "BAJAJ-AUTO", name: "Bajaj Auto", exchange: "NSE" },
  { tradingsymbol: "BRITANNIA", name: "Britannia Industries", exchange: "NSE" },
  { tradingsymbol: "TATACONSUM", name: "Tata Consumer Products", exchange: "NSE" },
  { tradingsymbol: "HDFCLIFE", name: "HDFC Life Insurance Company", exchange: "NSE" },
  { tradingsymbol: "SBILIFE", name: "SBI Life Insurance Company", exchange: "NSE" },
  { tradingsymbol: "INDUSINDBK", name: "IndusInd Bank", exchange: "NSE" },
  { tradingsymbol: "BPCL", name: "Bharat Petroleum Corporation", exchange: "NSE" },
  { tradingsymbol: "IOC", name: "Indian Oil Corporation", exchange: "NSE" },
  { tradingsymbol: "GOLDBEES", name: "Nippon India ETF Gold BeES", exchange: "NSE" },
  { tradingsymbol: "NIFTYBEES", name: "Nippon India ETF Nifty BeES", exchange: "NSE" },
  { tradingsymbol: "BANKBEES", name: "Nippon India ETF Bank BeES", exchange: "NSE" },
  { tradingsymbol: "JUNIORBEES", name: "Nippon India ETF Junior BeES", exchange: "NSE" },
  { tradingsymbol: "ZOMATO", name: "Zomato Limited", exchange: "NSE" },
  { tradingsymbol: "PAYTM", name: "One 97 Communications", exchange: "NSE" },
  { tradingsymbol: "JIOFIN", name: "Jio Financial Services", exchange: "NSE" },
  { tradingsymbol: "HAL", name: "Hindustan Aeronautics", exchange: "NSE" },
  { tradingsymbol: "BEL", name: "Bharat Electronics", exchange: "NSE" },
  { tradingsymbol: "VEDL", name: "Vedanta Limited", exchange: "NSE" },
  { tradingsymbol: "TRENT", name: "Trent Limited", exchange: "NSE" },
  { tradingsymbol: "IRCTC", name: "Indian Railway Catering and Tourism Corp", exchange: "NSE" },
  { tradingsymbol: "IRFC", name: "Indian Railway Finance Corporation", exchange: "NSE" },
  { tradingsymbol: "RVNL", name: "Rail Vikas Nigam Limited", exchange: "NSE" },
  { tradingsymbol: "IREDA", name: "Indian Renewable Energy Development Agency", exchange: "NSE" },
  { tradingsymbol: "SUZLON", name: "Suzlon Energy", exchange: "NSE" },
  { tradingsymbol: "YESBANK", name: "Yes Bank", exchange: "NSE" },
  { tradingsymbol: "IDEA", name: "Vodafone Idea", exchange: "NSE" },
  { tradingsymbol: "CDSL", name: "Central Depository Services (India)", exchange: "NSE" },
  { tradingsymbol: "BSE", name: "BSE Limited", exchange: "NSE" },
  { tradingsymbol: "BHEL", name: "Bharat Heavy Electricals", exchange: "NSE" },
  { tradingsymbol: "SAIL", name: "Steel Authority of India", exchange: "NSE" },
  { tradingsymbol: "NHPC", name: "NHPC Limited", exchange: "NSE" },
  { tradingsymbol: "SJVN", name: "SJVN Limited", exchange: "NSE" },
  { tradingsymbol: "PFC", name: "Power Finance Corporation", exchange: "NSE" },
  { tradingsymbol: "RECLTD", name: "REC Limited", exchange: "NSE" },
  { tradingsymbol: "DMART", name: "Avenue Supermarts", exchange: "NSE" },
  { tradingsymbol: "POLYCAB", name: "Polycab India", exchange: "NSE" },
  { tradingsymbol: "VBL", name: "Varun Beverages", exchange: "NSE" },
  { tradingsymbol: "CHOLAFIN", name: "Cholamandalam Investment and Finance", exchange: "NSE" },
  { tradingsymbol: "PIDILITIND", name: "Pidilite Industries", exchange: "NSE" },
  { tradingsymbol: "HAVELLS", name: "Havells India", exchange: "NSE" },
  { tradingsymbol: "DLF", name: "DLF Limited", exchange: "NSE" },
  { tradingsymbol: "GODREJCP", name: "Godrej Consumer Products", exchange: "NSE" },
  { tradingsymbol: "KTKBANK", name: "Karnataka Bank", exchange: "NSE" },
  { tradingsymbol: "SOUTHBANK", name: "The South Indian Bank", exchange: "NSE" },
];

async function serveStatic(pathname, res) {
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

async function sendJson(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function loadDotEnv(filePath) {
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

function gracefulShutdown(signal) {
  console.log(`\n🛑 ${signal} received. Performing SQLite WAL checkpoint and graceful shutdown...`);
  try {
    import("./db/connection.js").then(({ getDb }) => {
      const db = getDb();
      db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
      console.log("💾 SQLite WAL checkpointed successfully.");
      server.close(() => {
        process.exit(0);
      });
    }).catch(() => process.exit(0));
  } catch {
    process.exit(0);
  }
}

server.on("error", (err) => {
  console.error("🛑 Server HTTP Error:", err);
});

process.stdin.resume();

process.on("exit", (code) => {
  console.log(`🛑 Node Process exiting with code: ${code}`);
});

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

process.on("unhandledRejection", (reason, promise) => {
  console.error("⚠️ Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("🛑 Uncaught Exception:", error);
});
