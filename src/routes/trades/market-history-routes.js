import { paperTradeEngine } from "../../services/paperTradeEngine.js";
import { ensurePaperEngineStarted } from "./paper-sse.js";
import { sendJson } from "./route-helpers.js";
import { generateSyntheticOptionCandles } from "./synthetic-option-history.js";

const optionHistoryCache = new Map();

function getIndexInfo(symbol) {
  if (symbol.includes("BANK")) return { key: "NSE_INDEX|Nifty Bank", name: "BANKNIFTY" };
  if (symbol.includes("SENSEX")) return { key: "BSE_INDEX|SENSEX", name: "SENSEX" };
  if (symbol.includes("FIN")) return { key: "NSE_INDEX|Nifty Fin Service", name: "FINNIFTY" };
  return { key: "NSE_INDEX|Nifty 50", name: "NIFTY 50" };
}

function buildCandleUrl(tokenKey, timeframe, todayStr) {
  if (timeframe === "1D") {
    return `https://api.upstox.com/v2/historical-candle/intraday/${encodeURIComponent(tokenKey)}/1minute`;
  }
  if (timeframe === "1W") {
    const fromDateStr = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    return `https://api.upstox.com/v2/historical-candle/${encodeURIComponent(tokenKey)}/30minute/${todayStr}/${fromDateStr}`;
  }
  const fromDateStr = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  return `https://api.upstox.com/v2/historical-candle/${encodeURIComponent(tokenKey)}/day/${todayStr}/${fromDateStr}`;
}

export async function handleMarketHistoryRoutes(req, res, url) {
  if (req.method !== "GET" || url.pathname !== "/api/market/option-contract-history") return false;

  ensurePaperEngineStarted();
  const symbol = url.searchParams.get("symbol") || "NIFTY 24900 CE";
  let tokenKey = url.searchParams.get("tokenKey");
  const expiryDate = url.searchParams.get("expiryDate") || url.searchParams.get("expiry") || "";
  const timeframe = (url.searchParams.get("timeframe") || "1W").toUpperCase();
  const entryPrice = url.searchParams.get("entryPrice") ? Number(url.searchParams.get("entryPrice")) : null;
  const exitPrice = url.searchParams.get("exitPrice") ? Number(url.searchParams.get("exitPrice")) : null;

  const client = paperTradeEngine.client;
  client.refreshAccessToken();
  const token = client.accessToken || "";
  const todayStr = new Date().toISOString().split("T")[0];
  const cacheKey = `opt_hist_${tokenKey || symbol}_${expiryDate}_${timeframe}_${todayStr}`;
  const cached = optionHistoryCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < 3 * 60 * 1000) {
    sendJson(res, cached.data);
    return true;
  }

  const { key: indexKey, name: indexName } = getIndexInfo(symbol);
  let candles = [];
  let underlyingData = null;
  let source = "synthetic";
  let tokenExpired = !token;
  let resolvedInfo = null;

  if (token) {
    try {
      if (!tokenKey) {
        const resInfo = await client.resolveOptionToken({ symbol, expiryDate, returnFullDetails: true });
        if (resInfo && typeof resInfo === "object") {
          tokenKey = resInfo.instrumentKey;
          resolvedInfo = resInfo;
        } else if (typeof resInfo === "string") {
          tokenKey = resInfo;
        }
      }
      if (tokenKey) {
        const [optRes, idxRes] = await Promise.all([
          fetch(buildCandleUrl(tokenKey, timeframe, todayStr), {
            headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
          }),
          fetch(`https://api.upstox.com/v2/market-quote/quotes?instrument_key=${encodeURIComponent(indexKey)}`, {
            headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
          }).catch(() => null)
        ]);
        if (optRes.status === 401) tokenExpired = true;
        if (optRes.ok) {
          const optJson = await optRes.json();
          const raw = optJson?.data?.candles || [];
          if (raw.length > 0) {
            candles = raw.map((c) => ({
              time: c[0],
              timestamp: new Date(c[0]).getTime(),
              open: Number(c[1]),
              high: Number(c[2]),
              low: Number(c[3]),
              close: Number(c[4]),
              volume: Number(c[5] || 0)
            })).sort((a, b) => a.timestamp - b.timestamp);
            source = "upstox-rest";
          }
        }
        if (idxRes && idxRes.ok) {
          const idxJson = await idxRes.json();
          const q = idxJson?.data?.[indexKey];
          if (q) {
            underlyingData = {
              name: indexName,
              key: indexKey,
              ltp: Number(q.last_price || 0),
              change: Number(q.net_change || 0),
              changePct: q.ohlc?.close ? Number(((Number(q.net_change || 0) / Number(q.ohlc.close)) * 100).toFixed(2)) : 0
            };
          }
        }
      }
    } catch (err) {
      console.warn("Option contract history fetch error:", err.message);
    }
  }

  if (candles.length === 0) {
    const basePrice = exitPrice || entryPrice || 120;
    candles = generateSyntheticOptionCandles({ basePrice, timeframe });
    source = "synthetic-decay";
  }

  const currentPrice = candles[candles.length - 1]?.close || exitPrice || 100;
  const startPrice = candles[0]?.open || currentPrice;
  const change = Number((currentPrice - startPrice).toFixed(2));
  const changePct = startPrice > 0 ? Number(((change / startPrice) * 100).toFixed(2)) : 0;

  const payload = {
    success: true,
    symbol,
    timeframe,
    currentPrice,
    startPrice,
    change,
    changePct,
    source,
    tokenExpired,
    resolvedExpiry: resolvedInfo?.expiry || expiryDate || null,
    tradingSymbol: resolvedInfo?.tradingSymbol || symbol,
    availableExpiries: resolvedInfo?.availableContracts || [],
    candles,
    underlying: underlyingData || {
      name: indexName,
      key: indexKey,
      ltp: symbol.includes("BANK") ? 52200 : 24850,
      change: 85.5,
      changePct: 0.35
    }
  };

  optionHistoryCache.set(cacheKey, { cachedAt: Date.now(), data: payload });
  sendJson(res, payload);
  return true;
}
