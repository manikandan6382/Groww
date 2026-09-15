import { fetchJson, kiteRequest, parsePercent, sleep } from "./marketHttpUtils.js";

const alphaCache = new Map();
const quotesCache = new Map();

export async function getPortfolio(kiteApiBase, sessionFile) {
  try {
    const [holdings, positions, margins] = await Promise.all([
      kiteRequest("/portfolio/holdings", kiteApiBase, sessionFile),
      kiteRequest("/portfolio/positions", kiteApiBase, sessionFile),
      kiteRequest("/user/margins/equity", kiteApiBase, sessionFile),
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

export async function getYahooChart(url) {
  const symbol = url.searchParams.get("symbol") || "^NSEI";
  const range = url.searchParams.get("range") || "1mo";
  const interval = url.searchParams.get("interval") || "1d";
  const endpoint = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  endpoint.searchParams.set("range", range);
  endpoint.searchParams.set("interval", interval);
  endpoint.searchParams.set("includePrePost", "false");
  return fetchJson(endpoint);
}

export async function getYahooQuotes(url) {
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

export async function getAlphaForeignQuotes(url, alphaApiBase = "https://www.alphavantage.co/query") {
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
