import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleTradingRequest } from "./routes/trades.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const publicDir = path.join(projectRoot, "public");

loadDotEnv(path.join(projectRoot, ".env"));

const port = Number(process.env.PORT || 3000);
const kiteApiBase = "https://api.kite.trade";
const alphaApiBase = "https://www.alphavantage.co/query";
const sessionFile = path.resolve(projectRoot, process.env.KITE_SESSION_FILE || ".zerodha-session.json");
const alphaCache = new Map();
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
    if (url.pathname === "/upstox/callback") {
      await sendUpstoxCallback(res, url);
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
  const [holdings, positions, margins] = await Promise.all([
    kiteRequest("/portfolio/holdings"),
    kiteRequest("/portfolio/positions"),
    kiteRequest("/user/margins/equity"),
  ]);
  return {
    updatedAt: new Date().toISOString(),
    holdings: holdings.data,
    positions: positions.data,
    margins: margins.data,
  };
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
  const settled = await Promise.allSettled(
    symbols
      .split(",")
      .map((symbol) => symbol.trim())
      .filter(Boolean)
      .map(async (symbol) => {
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
        return {
          symbol,
          regularMarketPrice: last,
          regularMarketChange: change,
          regularMarketChangePercent: previous ? (change / previous) * 100 : 0,
        };
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
  const ranked = universe.items
    .map((item) => ({ item, score: scoreStockMatch(item, query) }))
    .filter((entry) => (query ? entry.score < 99 : true))
    .sort((a, b) => a.score - b.score || a.item.tradingsymbol.localeCompare(b.item.tradingsymbol))
    .slice(0, limit)
    .map((entry) => entry.item);

  return {
    source: universe.source,
    count: ranked.length,
    items: ranked,
  };
}

async function sendUpstoxCallback(res, url) {
  const code = url.searchParams.get("code") || "";
  const error = url.searchParams.get("error") || url.searchParams.get("message") || "";
  const escapedCode = escapeHtml(code);
  const body = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Upstox Callback - PortfolioX</title>
    <style>
      body{margin:0;min-height:100vh;display:grid;place-items:center;background:#020812;color:#f4f8ff;font-family:Inter,Segoe UI,Arial,sans-serif}
      main{width:min(620px,calc(100vw - 32px));border:1px solid rgba(0,213,255,.28);border-radius:18px;padding:28px;background:linear-gradient(145deg,rgba(8,28,48,.94),rgba(3,13,24,.96));box-shadow:0 24px 70px rgba(0,0,0,.42)}
      span{display:inline-flex;border-radius:999px;padding:7px 10px;color:#00f5c4;background:rgba(0,245,196,.1);font-size:12px;font-weight:800}
      h1{margin:14px 0 10px;font-size:32px}
      p{color:#9cafc4;line-height:1.6}
      code{display:block;margin-top:16px;border:1px solid rgba(0,213,255,.22);border-radius:12px;padding:14px;background:#050b14;color:#00d5ff;font-size:20px;word-break:break-all}
      a{display:inline-flex;margin-top:18px;color:#00d5ff;text-decoration:none}
    </style>
  </head>
  <body>
    <main>
      <span>${error ? "Upstox error" : "Upstox login"}</span>
      <h1>${error ? "Authorization failed" : "Authorization code received"}</h1>
      <p>${error ? escapeHtml(error) : "Copy this short-lived code and use it to generate the Upstox access token. Do not share your API secret."}</p>
      ${code ? `<code>${escapedCode}</code>` : ""}
      <a href="/paper-lab">Return to Trade Lab</a>
    </main>
  </body>
</html>`;
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(body);
}

async function getStockUniverse() {
  if (instrumentCache.payload && Date.now() - instrumentCache.savedAt < 12 * 60 * 60 * 1000) {
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
    source: "Built-in free fallback",
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
  { tradingsymbol: "KTKBANK", name: "Karnataka Bank", exchange: "NSE" },
  { tradingsymbol: "SOUTHBANK", name: "The South Indian Bank", exchange: "NSE" },
];

async function serveStatic(pathname, res) {
  const safePath = pathname === "/" ? "/index.html" : decodeURIComponent(pathname);
  const filePath = path.resolve(publicDir, `.${safePath}`);
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  const exists = fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  const target = exists ? filePath : path.join(publicDir, "index.html");
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
