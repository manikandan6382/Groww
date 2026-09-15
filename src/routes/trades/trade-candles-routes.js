import { paperTradeEngine } from "../../services/paperTradeEngine.js";
import { ensurePaperEngineStarted } from "./paper-sse.js";
import { sendJson } from "./route-helpers.js";
import { computeFlightScopeToDate, interpolateCandles, synthesizeMicroCandles } from "./trade-candles-synthetic.js";
import { fetchUpstoxTradeCandles } from "./trade-candles-fetcher.js";

const tradeCandleCache = new Map();
const inFlightCandleRequests = new Map();

function parseWithIST(str, fallback) {
  if (!str) return fallback;
  const s = String(str).trim();
  return s.includes("+") || s.includes("Z") ? new Date(s) : new Date(s + "+05:30");
}

export async function handleTradeCandlesRoutes(req, res, url) {
  if (req.method !== "GET" || url.pathname !== "/api/market/trade-candles") return false;

  ensurePaperEngineStarted();
  const symbol = url.searchParams.get("symbol") || "NIFTY 24000 CE";
  let tokenKey = url.searchParams.get("tokenKey");
  if (tokenKey && !/^[A-Za-z0-9_]+(\||\/)[a-zA-Z0-9_.\-%]+$/.test(tokenKey)) tokenKey = null;

  const entryPrice = Number(url.searchParams.get("entryPrice") || 100);
  const exitPrice = Number(url.searchParams.get("exitPrice") || entryPrice);
  const targetPrice = url.searchParams.get("targetPrice") ? Number(url.searchParams.get("targetPrice")) : null;
  const stopLoss = url.searchParams.get("stopLoss") ? Number(url.searchParams.get("stopLoss")) : null;
  const closeReason = url.searchParams.get("closeReason") || (exitPrice >= entryPrice ? "TARGET_HIT" : "STOP_LOSS_HIT");

  const client = paperTradeEngine.client;
  client.refreshAccessToken();
  const token = client.accessToken || "";

  const toExpiry = url.searchParams.get("toExpiry") === "true";
  const flightScopeParam = url.searchParams.get("flightScope") || (toExpiry ? "day" : "scalp");
  const fromDate = parseWithIST(url.searchParams.get("from"), new Date(Date.now() - 30 * 60 * 1000));
  let toDate = computeFlightScopeToDate({ symbol, fromDate, toDate: parseWithIST(url.searchParams.get("to"), new Date()), toExpiry, flightScopeParam, expiryTimeStr: url.searchParams.get("expiryTime") });

  const fromTime = fromDate.getTime();
  const toTime = Math.max(fromTime + 60000, toDate.getTime());
  const cacheKey = `${tokenKey || symbol}_${fromTime}_${toTime}_${entryPrice}_${exitPrice}_${flightScopeParam}`;
  const cached = tradeCandleCache.get(cacheKey);

  if (cached && Date.now() - cached.cachedAt < 10 * 60 * 1000) {
    if (cached.data.source === "interpolated" && token && Date.now() - cached.cachedAt > 30000) {
      tradeCandleCache.delete(cacheKey);
    } else {
      sendJson(res, cached.data);
      return true;
    }
  }

  const inFlightKey = `${tokenKey || symbol}_${fromTime}_${toTime}`;
  if (inFlightCandleRequests.has(inFlightKey)) {
    try {
      const raw = await inFlightCandleRequests.get(inFlightKey);
      sendJson(res, { ...raw, entryPrice, exitPrice, targetPrice, stopLoss });
      return true;
    } catch { /* proceed */ }
  }

  const executeFetch = async () => {
    let candles = [];
    let source = "interpolated";
    let underlying = null;

    if (token) {
      try {
        if (!tokenKey) {
          tokenKey = await client.resolveOptionToken({ symbol, expiryDate: url.searchParams.get("expiryDate") || null, strikePrice: url.searchParams.get("strikePrice") ? Number(url.searchParams.get("strikePrice")) : null, optionType: url.searchParams.get("optionType") || null });
        }
        if (tokenKey) {
          const resObj = await fetchUpstoxTradeCandles({ token, tokenKey, symbol, fromDate, fromTime, toTime });
          underlying = resObj.underlying;
          if (resObj.source === "upstox") {
            candles = resObj.candles;
            source = "upstox";
          } else if (resObj.source === "upstox-single") {
            candles = synthesizeMicroCandles(resObj.candles[0], fromTime, toTime, entryPrice, exitPrice);
            source = "upstox-micro";
          }
        }
      } catch (err) {
        console.warn("Trade candles Upstox fetch notice:", err.message);
      }
    }

    if (candles.length < 2) {
      candles = interpolateCandles({ fromTime, toTime, entryPrice, exitPrice, targetPrice, stopLoss, closeReason });
      source = "interpolated";
    }

    const allPrices = candles.map((c) => c.close);
    return { success: true, source, tokenKey, symbol, entryPrice, exitPrice, targetPrice, stopLoss, mfe: Number((Math.max(...allPrices) - entryPrice).toFixed(2)), mae: Number((entryPrice - Math.min(...allPrices)).toFixed(2)), candles, underlying };
  };

  const fetchPromise = executeFetch();
  inFlightCandleRequests.set(inFlightKey, fetchPromise);
  try {
    const payload = await fetchPromise;
    if (tradeCandleCache.size > 250) tradeCandleCache.delete(tradeCandleCache.keys().next().value);
    tradeCandleCache.set(cacheKey, { cachedAt: Date.now(), data: payload });
    sendJson(res, payload);
    return true;
  } finally {
    inFlightCandleRequests.delete(inFlightKey);
  }
}
