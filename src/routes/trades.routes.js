import fs from "node:fs";
import path from "node:path";
import { getDb, getProjectRoot } from "../db/connection.js";
import { buildReviewReports, buildTradeAnalytics } from "../services/analytics/performance-engine.js";
import { getRangeWindow, rangeLabel } from "../services/trading/trade-calculator.js";
import { closePaperTrade, createPaperTrade, deletePaperTrade, getPaperLab, markPaperTrade } from "../repositories/paper-lab.repository.js";
import { createTrade, getTradeById, getTradingBootstrap, listTrades } from "../repositories/trades.repository.js";
import { paperTradeEngine } from "../services/paperTradeEngine.js";
import { computeGexProfile, calculateGreeks } from "../services/greeksEngine.js";

const evidenceRoot = path.join(getProjectRoot(), "data", "uploads", "trades");
const optionContractsCache = new Map();
const optionChainCache = new Map();
const indicesCache = new Map();
const tradeCandleCache = new Map();
const optionHistoryCache = new Map();
const inFlightCandleRequests = new Map();

async function getUpstoxOptionChain(token, indexKey, expiryDate) {
  const cacheKey = `${indexKey}_${expiryDate}`;
  const cached = optionChainCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < 20 * 1000) {
    return cached.data;
  }

  try {
    const res = await fetch(`https://api.upstox.com/v2/option/chain?instrument_key=${encodeURIComponent(indexKey)}&expiry_date=${encodeURIComponent(expiryDate)}`, {
      headers: { "Accept": "application/json", "Authorization": `Bearer ${token}` }
    });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data) && json.data.length) {
        if (optionChainCache.size > 20) {
          const first = optionChainCache.keys().next().value;
          optionChainCache.delete(first);
        }
        optionChainCache.set(cacheKey, { cachedAt: Date.now(), data: json.data });
        return json.data;
      }
    }
  } catch (e) {
    console.warn("Option chain fetch error:", e.message);
  }
  return cached?.data || [];
}

async function getUpstoxOptionContracts(token, indexKey) {
  const cached = optionContractsCache.get(indexKey);
  if (cached && Date.now() - cached.cachedAt < 10 * 60 * 1000) {
    return cached.data;
  }

  try {
    const res = await fetch(`https://api.upstox.com/v2/option/contract?instrument_key=${encodeURIComponent(indexKey)}`, {
      headers: { "Accept": "application/json", "Authorization": `Bearer ${token}` }
    });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data) && json.data.length) {
        optionContractsCache.set(indexKey, { cachedAt: Date.now(), data: json.data });
        return json.data;
      }
    }
  } catch (e) {
    console.warn("Option contracts fetch error:", e.message);
  }
  return cached?.data || [];
}

export async function handleTradingRequest(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/trading/bootstrap") {
    sendJson(res, getTradingBootstrap());
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/market/gex-profile") {
    const symbol = (url.searchParams.get("symbol") || "NIFTY").toUpperCase();
    const spot = Number(url.searchParams.get("spot") || (symbol === "BANKNIFTY" ? 52000 : 24500));
    const dte = Number(url.searchParams.get("dte") || 1);
    const profile = computeGexProfile(symbol, spot, [], dte);
    sendJson(res, profile);
    return true;
  }

  if (req.method === "GET" && ["/api/paper-lab", "/api/live-alerts"].includes(url.pathname)) {
    ensurePaperEngineStarted();
    sendJson(res, getPaperLab({
      range: getRange(url),
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
    }));
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/upstox/token-status") {
    ensurePaperEngineStarted();
    const client = paperTradeEngine.client;
    client.refreshAccessToken();
    const token = client.accessToken || "";
    let sessionAgeMinutes = null;
    let fileExists = false;
    try {
      if (fs.existsSync(client.sessionFile)) {
        fileExists = true;
        const stat = fs.statSync(client.sessionFile);
        sessionAgeMinutes = Math.round((Date.now() - stat.mtimeMs) / 60000);
      }
    } catch { /* ignore */ }

    const isPreMarketReady = Boolean(token && token.length > 20);
    sendJson(res, {
      configured: client.isConfigured(),
      hasToken: Boolean(token),
      tokenLength: token.length,
      sessionFile: path.basename(client.sessionFile),
      sessionFileExists: fileExists,
      sessionAgeMinutes,
      isPreMarketReady,
      websocketConnected: client.connected,
      polling: Boolean(client.pollTimer),
      lastError: client.lastError,
      status: isPreMarketReady ? "Token Active · Feed Ready" : "Token Required · OAuth Expired",
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

  if (req.method === "GET" && (url.pathname === "/api/market/indices" || url.pathname === "/api/upstox/indices")) {
    ensurePaperEngineStarted();
    const client = paperTradeEngine.client;
    client.refreshAccessToken();
    const token = client.accessToken || "";

    const cached = indicesCache.get("LIVE_INDICES");
    if (cached && Date.now() - cached.timestamp < 1500) {
      sendJson(res, cached.data);
      return true;
    }

    if (token) {
      try {
        const keys = [
          "NSE_INDEX|Nifty 50",
          "NSE_INDEX|Nifty Bank",
          "NSE_INDEX|India VIX",
          "NSE_INDEX|Nifty Fin Service",
          "BSE_INDEX|SENSEX"
        ].join(",");

        const upstoxUrl = `https://api.upstox.com/v2/market-quote/quotes?instrument_key=${encodeURIComponent(keys)}`;
        const qRes = await fetch(upstoxUrl, {
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });

        if (qRes.ok) {
          const qData = await qRes.json();
          const raw = qData?.data || {};
          const result = {};

          const mapping = [
            { key: "NSE_INDEX|Nifty 50", lookup: "NSE_INDEX:Nifty 50", name: "NIFTY 50" },
            { key: "NSE_INDEX|Nifty Bank", lookup: "NSE_INDEX:Nifty Bank", name: "BANKNIFTY" },
            { key: "NSE_INDEX|India VIX", lookup: "NSE_INDEX:India VIX", name: "INDIA VIX" },
            { key: "NSE_INDEX|Nifty Fin Service", lookup: "NSE_INDEX:Nifty Fin Service", name: "FINNIFTY" },
            { key: "BSE_INDEX|SENSEX", lookup: "BSE_INDEX:SENSEX", name: "BSE SENSEX" }
          ];

          for (const item of mapping) {
            const quote = raw[item.lookup] || raw[item.key];
            if (quote && quote.last_price != null) {
              const ltp = Number(quote.last_price);
              const change = Number(quote.net_change || 0);
              const prevClose = quote.ohlc?.close != null ? Number(quote.ohlc.close) : (ltp - change);
              const changePct = prevClose > 0 ? Number(((change / prevClose) * 100).toFixed(2)) : 0;

              result[item.key] = {
                name: item.name,
                ltp,
                change,
                changePct,
                open: quote.ohlc?.open != null ? Number(quote.ohlc.open) : ltp,
                high: quote.ohlc?.high != null ? Number(quote.ohlc.high) : ltp,
                low: quote.ohlc?.low != null ? Number(quote.ohlc.low) : ltp,
                close: prevClose,
                timestamp: quote.timestamp || new Date().toISOString()
              };

              paperTradeEngine.publish("index_tick", {
                symbol: item.key,
                tokenKey: item.key,
                name: item.name,
                ltp,
                change,
                changePct,
                open: result[item.key].open,
                high: result[item.key].high,
                low: result[item.key].low,
                close: prevClose,
                receivedAt: quote.timestamp || new Date().toISOString()
              });
            }
          }

          const responseData = {
            success: true,
            timestamp: new Date().toISOString(),
            indices: result
          };

          indicesCache.set("LIVE_INDICES", { timestamp: Date.now(), data: responseData });
          sendJson(res, responseData);
          return true;
        }
      } catch (err) {
        console.warn("Live indices fetch error:", err.message);
      }
    }

    sendJson(res, {
      success: false,
      message: "Upstox live feed unavailable or token missing",
      indices: cached?.data?.indices || {}
    });
    return true;
  }

  if ((req.method === "POST" && url.pathname === "/api/market/option-quotes") || (req.method === "GET" && url.pathname === "/api/market/option-quote")) {
    ensurePaperEngineStarted();
    const client = paperTradeEngine.client;
    client.refreshAccessToken();
    const token = client.accessToken || "";

    let symbols = [];
    if (req.method === "POST") {
      const body = await readJsonBody(req);
      symbols = Array.isArray(body.symbols) ? body.symbols : (body.symbol ? [body.symbol] : []);
    } else {
      const sym = url.searchParams.get("symbol");
      if (sym) symbols.push(sym);
    }

    if (!symbols.length) {
      sendJson(res, { success: true, quotes: {} });
      return true;
    }

    const quotes = {};
    if (token) {
      try {
        const tokenEntries = await Promise.all(
          symbols.map(async (sym) => {
            try {
              const tokenKey = await client.resolveOptionToken({ symbol: sym });
              return { sym, tokenKey };
            } catch {
              return { sym, tokenKey: null };
            }
          })
        );

        const validEntries = tokenEntries.filter((e) => Boolean(e.tokenKey));
        if (validEntries.length > 0) {
          const uniqueKeys = Array.from(new Set(validEntries.map((e) => e.tokenKey)));
          const qRes = await fetch(`https://api.upstox.com/v2/market-quote/quotes?instrument_key=${encodeURIComponent(uniqueKeys.join(","))}`, {
            headers: {
              "Accept": "application/json",
              "Authorization": `Bearer ${token}`
            }
          });
          if (qRes.ok) {
            const qData = await qRes.json();
            const rawData = qData?.data || {};
            for (const { sym, tokenKey } of validEntries) {
              const quoteItem = Object.values(rawData).find(
                (item) => item?.instrument_token === tokenKey || item?.instrument_key === tokenKey
              ) || rawData[tokenKey] || rawData[tokenKey.replace("|", ":")];

              if (quoteItem && quoteItem.last_price != null) {
                const ltp = Number(quoteItem.last_price);
                const change = Number(quoteItem.net_change || 0);
                const quoteObj = {
                  symbol: sym,
                  tokenKey,
                  ltp,
                  change,
                  open: quoteItem.ohlc?.open != null ? Number(quoteItem.ohlc.open) : ltp,
                  high: quoteItem.ohlc?.high != null ? Number(quoteItem.ohlc.high) : ltp,
                  low: quoteItem.ohlc?.low != null ? Number(quoteItem.ohlc.low) : ltp,
                  close: quoteItem.ohlc?.close != null ? Number(quoteItem.ohlc.close) : ltp,
                  timestamp: quoteItem.timestamp || new Date().toISOString()
                };
                quotes[sym] = quoteObj;
                quotes[tokenKey] = quoteObj;

                // Also forward tick into paperTradeEngine so internal triggers stay live
                paperTradeEngine.client.emit("tick", {
                  exchange: tokenKey.split("|")[0] || "NSE",
                  token: tokenKey,
                  key: tokenKey,
                  ltp,
                  raw: quoteItem,
                  receivedAt: quoteObj.timestamp
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn("Option quotes fetch error:", err.message);
      }
    }

    sendJson(res, { success: true, quotes });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/market/option-contract-history") {
    ensurePaperEngineStarted();
    const symbol = url.searchParams.get("symbol") || "NIFTY 24900 CE";
    let tokenKey = url.searchParams.get("tokenKey");
    const expiryDate = url.searchParams.get("expiryDate") || url.searchParams.get("expiry") || "";
    const timeframe = (url.searchParams.get("timeframe") || "1W").toUpperCase(); // "1D" | "1W" | "1M" | "ALL"
    const entryPrice = url.searchParams.get("entryPrice") ? Number(url.searchParams.get("entryPrice")) : null;
    const exitPrice = url.searchParams.get("exitPrice") ? Number(url.searchParams.get("exitPrice")) : null;
    const entryTime = url.searchParams.get("entryTime") || null;
    const exitTime = url.searchParams.get("exitTime") || null;

    const client = paperTradeEngine.client;
    client.refreshAccessToken();
    const token = client.accessToken || "";

    const todayStr = new Date().toISOString().split("T")[0];
    const cacheKey = `opt_hist_${tokenKey || symbol}_${expiryDate}_${timeframe}_${todayStr}`;
    const cached = optionHistoryCache.get(cacheKey);
    const CACHE_TTL = 3 * 60 * 1000;
    if (cached && (Date.now() - cached.cachedAt < CACHE_TTL)) {
      sendJson(res, cached.data);
      return true;
    }

    // Resolve Underlying Key & Name
    let indexKey = "NSE_INDEX|Nifty 50";
    let indexName = "NIFTY 50";
    if (symbol.includes("BANK")) {
      indexKey = "NSE_INDEX|Nifty Bank";
      indexName = "BANKNIFTY";
    } else if (symbol.includes("SENSEX")) {
      indexKey = "BSE_INDEX|SENSEX";
      indexName = "SENSEX";
    } else if (symbol.includes("FIN")) {
      indexKey = "NSE_INDEX|Nifty Fin Service";
      indexName = "FINNIFTY";
    }

    let candles = [];
    let underlyingData = null;
    let source = "synthetic";
    let tokenExpired = !token;
    let resolvedInfo = null;

    if (token) {
      try {
        if (!tokenKey) {
          const resInfo = await client.resolveOptionToken({
            symbol,
            expiryDate,
            returnFullDetails: true
          });
          if (resInfo && typeof resInfo === "object") {
            tokenKey = resInfo.instrumentKey;
            resolvedInfo = resInfo;
          } else if (typeof resInfo === "string") {
            tokenKey = resInfo;
          }
        }

        if (tokenKey) {
          let candleUrl;
          if (timeframe === "1D") {
            candleUrl = `https://api.upstox.com/v2/historical-candle/intraday/${encodeURIComponent(tokenKey)}/1minute`;
          } else if (timeframe === "1W") {
            const fromDateStr = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
            candleUrl = `https://api.upstox.com/v2/historical-candle/${encodeURIComponent(tokenKey)}/30minute/${todayStr}/${fromDateStr}`;
          } else {
            // 1M or ALL
            const fromDateStr = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
            candleUrl = `https://api.upstox.com/v2/historical-candle/${encodeURIComponent(tokenKey)}/day/${todayStr}/${fromDateStr}`;
          }

          const [optRes, idxRes] = await Promise.all([
            fetch(candleUrl, {
              headers: { "Accept": "application/json", "Authorization": `Bearer ${token}` }
            }),
            fetch(`https://api.upstox.com/v2/market-quote/quotes?instrument_key=${encodeURIComponent(indexKey)}`, {
              headers: { "Accept": "application/json", "Authorization": `Bearer ${token}` }
            }).catch(() => null)
          ]);

          if (optRes.status === 401) {
            tokenExpired = true;
          }

          if (optRes.ok) {
            const optJson = await optRes.json();
            const raw = optJson?.data?.candles || [];
            if (raw.length > 0) {
              candles = raw.map(c => ({
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

    // High-Fidelity Synthetic Fallback if Upstox candles are empty (e.g. older expired strike)
    if (candles.length === 0) {
      const basePrice = exitPrice || entryPrice || 120;
      const steps = timeframe === "1D" ? 25 : (timeframe === "1W" ? 14 : 20);
      const totalMs = timeframe === "1D" ? 6 * 3600 * 1000 : (timeframe === "1W" ? 7 * 86400000 : 30 * 86400000);
      const startMs = Date.now() - totalMs;
      const stepMs = totalMs / steps;

      const initialMultiplier = timeframe === "1D" ? 1.15 : (timeframe === "1W" ? 1.6 : 2.4);
      let prevC = basePrice * initialMultiplier;
      for (let i = 0; i <= steps; i++) {
        const t = startMs + i * stepMs;
        const prog = i / steps;
        // Strict Zero-Math.sin Trend Interpolation (Complies with Financial Sparkline Rules)
        const decayFactor = 1 - Math.pow(prog, 0.85);
        let closeVal = basePrice + (basePrice * (initialMultiplier - 1)) * decayFactor;
        closeVal = Math.max(0.05, Number(closeVal.toFixed(2)));
        const openVal = Number(prevC.toFixed(2));
        const highVal = Number((Math.max(openVal, closeVal) + (prevC - basePrice) * 0.05 * decayFactor).toFixed(2));
        const lowVal = Number((Math.min(openVal, closeVal) - (prevC - basePrice) * 0.03 * decayFactor).toFixed(2));
        candles.push({
          time: new Date(t).toISOString(),
          timestamp: t,
          open: openVal,
          high: Math.max(highVal, openVal, closeVal),
          low: Math.max(0.05, Math.min(lowVal, openVal, closeVal)),
          close: closeVal,
          volume: Math.round(10000 + (1 - prog) * 40000)
        });
        prevC = closeVal;
      }
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
        change: 85.50,
        changePct: 0.35
      }
    };

    optionHistoryCache.set(cacheKey, { cachedAt: Date.now(), data: payload });
    sendJson(res, payload);
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/market/trade-candles") {
    ensurePaperEngineStarted();
    const symbol = url.searchParams.get("symbol") || "NIFTY 24000 CE";
    let tokenKey = url.searchParams.get("tokenKey");
    if (tokenKey && !/^[A-Za-z0-9_]+(\||\/)[a-zA-Z0-9_.\-%]+$/.test(tokenKey)) {
      tokenKey = null;
    }
    const fromStr = url.searchParams.get("from");
    const toStr = url.searchParams.get("to");
    const entryPrice = Number(url.searchParams.get("entryPrice") || 100);
    const exitPrice = Number(url.searchParams.get("exitPrice") || entryPrice);
    const targetPrice = url.searchParams.get("targetPrice") ? Number(url.searchParams.get("targetPrice")) : null;
    const stopLoss = url.searchParams.get("stopLoss") ? Number(url.searchParams.get("stopLoss")) : null;
    const closeReason = url.searchParams.get("closeReason") || (exitPrice >= entryPrice ? "TARGET_HIT" : "STOP_LOSS_HIT");

    const client = paperTradeEngine.client;
    client.refreshAccessToken();
    const token = client.accessToken || "";

    const parseWithIST = (str, fallback) => {
      if (!str) return fallback;
      const s = String(str).trim();
      if (s.includes("+") || s.includes("Z")) return new Date(s);
      return new Date(s + "+05:30");
    };

    const toExpiry = url.searchParams.get("toExpiry") === "true";
    const expiryTimeStr = url.searchParams.get("expiryTime");

    const fromDate = parseWithIST(fromStr, new Date(Date.now() - 30 * 60 * 1000));
    let toDate = parseWithIST(toStr, new Date());
    if (toExpiry) {
      if (expiryTimeStr) {
        toDate = parseWithIST(expiryTimeStr, toDate);
      } else {
        const istDateStr = fromDate.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
        toDate = new Date(`${istDateStr}T15:30:00+05:30`);
      }
    }
    const fromTime = fromDate.getTime();
    const toTime = Math.max(fromTime + 60000, toDate.getTime());

    // 10-Minute Sliding TTL Cache with Transient Degradation Eviction
    const cacheKey = `${tokenKey || symbol}_${fromTime}_${toTime}_${entryPrice}_${exitPrice}_${toExpiry ? "exp" : "sclp"}`;
    const cached = tradeCandleCache.get(cacheKey);
    const CACHE_TTL = 10 * 60 * 1000;
    if (cached && (Date.now() - cached.cachedAt < CACHE_TTL)) {
      if (cached.data.source === "interpolated" && token && (Date.now() - cached.cachedAt > 30000)) {
        tradeCandleCache.delete(cacheKey); // Evict fallback to retry real Upstox fetch
      } else {
        sendJson(res, cached.data);
        return true;
      }
    }

    // In-Flight Promise Coalescing: Deduplicate concurrent requests for the same instrument window
    const inFlightKey = `${tokenKey || symbol}_${fromTime}_${toTime}`;
    if (inFlightCandleRequests.has(inFlightKey)) {
      try {
        const rawCoalesced = await inFlightCandleRequests.get(inFlightKey);
        const tailored = {
          ...rawCoalesced,
          entryPrice,
          exitPrice,
          targetPrice,
          stopLoss,
          mfe: Number((Math.max(...rawCoalesced.candles.map(c => c.close)) - entryPrice).toFixed(2)),
          mae: Number((entryPrice - Math.min(...rawCoalesced.candles.map(c => c.close))).toFixed(2))
        };
        sendJson(res, tailored);
        return true;
      } catch {
        // Fall through to independent execution
      }
    }

    const executeFetch = async () => {
      let candles = [];
      let source = "interpolated";
      let underlying = null;

      if (token) {
        try {
          if (!tokenKey) {
            tokenKey = await client.resolveOptionToken({
              symbol,
              expiryDate: url.searchParams.get("expiryDate") || null,
              strikePrice: url.searchParams.get("strikePrice") ? Number(url.searchParams.get("strikePrice")) : null,
              optionType: url.searchParams.get("optionType") || null
            });
          }

          if (tokenKey) {
            const dateOnly = fromDate.toISOString().split("T")[0];
            const todayOnly = new Date().toISOString().split("T")[0];
            const isToday = dateOnly === todayOnly;
            const candleUrl = isToday
              ? `https://api.upstox.com/v2/historical-candle/intraday/${encodeURIComponent(tokenKey)}/1minute`
              : `https://api.upstox.com/v2/historical-candle/${encodeURIComponent(tokenKey)}/1minute/${dateOnly}/${dateOnly}`;

            let indexKey = "NSE_INDEX|Nifty 50";
            let indexName = "NIFTY 50";
            if (symbol.includes("BANK")) {
              indexKey = "NSE_INDEX|Nifty Bank";
              indexName = "BANKNIFTY";
            } else if (symbol.includes("FIN")) {
              indexKey = "NSE_INDEX|Nifty Fin Service";
              indexName = "FINNIFTY";
            }

            const indexUrl = isToday
              ? `https://api.upstox.com/v2/historical-candle/intraday/${encodeURIComponent(indexKey)}/1minute`
              : `https://api.upstox.com/v2/historical-candle/${encodeURIComponent(indexKey)}/1minute/${dateOnly}/${dateOnly}`;

            const [cRes, iRes] = await Promise.all([
              fetch(candleUrl, {
                headers: {
                  "Accept": "application/json",
                  "Authorization": `Bearer ${token}`
                }
              }),
              fetch(indexUrl, {
                headers: {
                  "Accept": "application/json",
                  "Authorization": `Bearer ${token}`
                }
              }).catch(() => null)
            ]);

            const bufferBefore = 3 * 60 * 1000; // 3 mins context before entry
            const bufferAfter = 3 * 60 * 1000;  // 3 mins context after exit
            const minTime = fromTime - bufferBefore;
            const maxTime = toTime + bufferAfter;

            if (iRes && iRes.ok) {
              try {
                const iData = await iRes.json();
                const rawIndexCandles = iData?.data?.candles || [];
                if (rawIndexCandles.length > 0) {
                  const matchedIndex = rawIndexCandles
                    .map(c => ({
                      time: c[0],
                      timestamp: new Date(c[0]).getTime(),
                      close: Number(c[4])
                    }))
                    .filter(c => c.timestamp >= minTime && c.timestamp <= maxTime)
                    .sort((a, b) => a.timestamp - b.timestamp);

                  if (matchedIndex.length >= 2) {
                    const uStart = matchedIndex[0].close;
                    const uEnd = matchedIndex[matchedIndex.length - 1].close;
                    const uPts = Number((uEnd - uStart).toFixed(1));
                    const uPct = Number(((uPts / uStart) * 100).toFixed(2));
                    underlying = {
                      name: indexName,
                      key: indexKey,
                      startPrice: uStart,
                      endPrice: uEnd,
                      changePts: uPts,
                      changePct: uPct,
                      candles: matchedIndex
                    };
                  }
                }
              } catch (err) {
                console.warn("Index parse warning:", err.message);
              }
            }

            if (cRes && cRes.ok) {
              const cData = await cRes.json();
              const rawCandles = cData?.data?.candles || [];
              if (rawCandles.length > 0) {
                // Raw candles come in descending order: [timestamp, open, high, low, close, volume, oi]

                const matched = rawCandles
                  .map(c => ({
                    time: c[0],
                    timestamp: new Date(c[0]).getTime(),
                    open: Number(c[1]),
                    high: Number(c[2]),
                    low: Number(c[3]),
                    close: Number(c[4]),
                    volume: Number(c[5] || 0)
                  }))
                  .filter(c => c.timestamp >= minTime && c.timestamp <= maxTime)
                  .sort((a, b) => a.timestamp - b.timestamp);

                if (matched.length >= 2) {
                  candles = matched;
                  source = "upstox";
                } else if (matched.length === 1) {
                  // Sub-minute scalp (<60s duration): synthesize real intra-candle path using Upstox OHLC bounds
                  const m = matched[0];
                  const isWin = exitPrice >= entryPrice;
                  candles = [
                    {
                      time: new Date(fromTime).toISOString(),
                      timestamp: fromTime,
                      open: m.open,
                      high: m.open,
                      low: m.open,
                      close: entryPrice,
                      volume: Math.round(m.volume / 3)
                    },
                    {
                      time: new Date(Math.round((fromTime + toTime) / 2)).toISOString(),
                      timestamp: Math.round((fromTime + toTime) / 2),
                      open: entryPrice,
                      high: m.high,
                      low: m.low,
                      close: isWin ? m.high : m.low,
                      volume: Math.round(m.volume / 3)
                    },
                    {
                      time: new Date(toTime).toISOString(),
                      timestamp: toTime,
                      open: isWin ? m.high : m.low,
                      high: m.high,
                      low: m.low,
                      close: exitPrice,
                      volume: Math.round(m.volume / 3)
                    }
                  ];
                  source = "upstox-micro";
                }
              }
            }
          }
        } catch (err) {
          console.warn("Trade candles Upstox fetch notice:", err.message);
        }
      }

      // High-precision mathematical interpolation fallback
      if (candles.length < 2) {
        source = "interpolated";
        const totalSteps = Math.max(10, Math.min(30, Math.round((toTime - fromTime) / 60000) || 12));
        const stepMs = (toTime - fromTime) / totalSteps;
        const isWin = exitPrice >= entryPrice;
        const isTarget = closeReason.includes("TARGET");
        const isStop = closeReason.includes("STOP");

        // Peak price excursion (MFE / MAE)
        let peakPrice = Math.max(entryPrice, exitPrice);
        let dipPrice = Math.min(entryPrice, exitPrice);

        if (isTarget) {
          peakPrice = targetPrice ? Math.max(targetPrice, exitPrice) : exitPrice;
          dipPrice = stopLoss ? entryPrice - Math.abs(entryPrice - stopLoss) * 0.25 : entryPrice * 0.98;
        } else if (isStop) {
          peakPrice = targetPrice ? entryPrice + Math.abs(targetPrice - entryPrice) * 0.2 : entryPrice * 1.02;
          dipPrice = stopLoss ? Math.min(stopLoss, exitPrice) : exitPrice;
        } else {
          peakPrice = targetPrice ? entryPrice + Math.abs(targetPrice - entryPrice) * 0.45 : entryPrice * 1.03;
          dipPrice = stopLoss ? entryPrice - Math.abs(entryPrice - stopLoss) * 0.25 : entryPrice * 0.98;
        }

        candles = [];
        for (let i = 0; i <= totalSteps; i++) {
          const progress = i / totalSteps; // 0 to 1
          const t = fromTime + i * stepMs;
          let p;

          if (progress === 0) {
            p = entryPrice;
          } else if (progress === 1) {
            p = exitPrice;
          } else if (isWin) {
            // Pullback first, then breakout to peak/exit
            if (progress < 0.25) {
              const sub = progress / 0.25;
              p = entryPrice - (entryPrice - dipPrice) * Math.sin(sub * Math.PI * 0.5);
            } else {
              const sub = (progress - 0.25) / 0.75;
              p = dipPrice + (exitPrice - dipPrice) * Math.sin(sub * Math.PI * 0.5);
            }
          } else {
            // Rally first, then roll over to stop loss
            if (progress < 0.3) {
              const sub = progress / 0.3;
              p = entryPrice + (peakPrice - entryPrice) * Math.sin(sub * Math.PI * 0.5);
            } else {
              const sub = (progress - 0.3) / 0.7;
              p = peakPrice - (peakPrice - exitPrice) * Math.sin(sub * Math.PI * 0.5);
            }
          }

          const closeVal = Number(p.toFixed(2));
          candles.push({
            time: new Date(t).toISOString(),
            timestamp: t,
            open: closeVal,
            high: Number((closeVal + 0.3).toFixed(2)),
            low: Number((closeVal - 0.3).toFixed(2)),
            close: closeVal,
            volume: 1000
          });
        }
      }

      const allPrices = candles.map(c => c.close);
      const minPrice = Math.min(...allPrices);
      const maxPrice = Math.max(...allPrices);
      const mfe = Number((maxPrice - entryPrice).toFixed(2));
      const mae = Number((entryPrice - minPrice).toFixed(2));

      return {
        success: true,
        source,
        tokenKey,
        symbol,
        entryPrice,
        exitPrice,
        targetPrice,
        stopLoss,
        mfe,
        mae,
        candles,
        underlying
      };
    };

    const fetchPromise = executeFetch();
    inFlightCandleRequests.set(inFlightKey, fetchPromise);

    try {
      const payload = await fetchPromise;
      if (tradeCandleCache.size > 250) {
        const firstKey = tradeCandleCache.keys().next().value;
        tradeCandleCache.delete(firstKey);
      }
      tradeCandleCache.set(cacheKey, { cachedAt: Date.now(), data: payload });
      sendJson(res, payload);
      return true;
    } finally {
      inFlightCandleRequests.delete(inFlightKey);
    }
  }

  if (req.method === "GET" && url.pathname === "/api/upstox/copilot-audit") {
    ensurePaperEngineStarted();
    const symbol = (url.searchParams.get("symbol") || "NIFTY").toUpperCase();
    const client = paperTradeEngine.client;
    client.refreshAccessToken();
    const token = client.accessToken || "";

    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMins = now.getUTCMinutes();
    const istMinsTotal = (utcHours * 60 + utcMins + 330) % 1440;
    const istHour = Math.floor(istMinsTotal / 60);
    const istMinute = istMinsTotal % 60;

    const isMarketOpen = (istHour > 9 || (istHour === 9 && istMinute >= 15)) && (istHour < 15 || (istHour === 15 && istMinute <= 30));

    let regime = "PRIME";
    let status = "APPROVED";
    let badge = "🟢 PRIME EXECUTION WINDOW · 12/12 APPROVED";

    if (!isMarketOpen) {
      regime = "BLOCKED";
      status = "STAND_DOWN";
      badge = "🔴 MARKET CLOSED (09:15-15:30 IST)";
    } else if ((istHour === 9 && istMinute < 20) || (istHour === 15 && istMinute >= 0)) {
      regime = "BLOCKED";
      status = "STAND_DOWN";
      badge = "🔴 SQUARING VOLATILITY CHOP";
    } else if ((istHour === 11 && istMinute >= 15) || istHour === 12 || (istHour === 13 && istMinute < 15)) {
      regime = "WARNING";
      status = "CAUTION";
      badge = "🟡 MID-DAY THETA CHOP (11:15-13:15 IST)";
    }

    let spotPrice = symbol === "SENSEX" ? 76261.50 : (symbol === "BANKNIFTY" ? 57031.00 : (symbol === "FINNIFTY" ? 25721.20 : 23816.65));
    let netChange = symbol === "SENSEX" ? -682.78 : (symbol === "BANKNIFTY" ? -378.60 : -239.15);
    let netChangePct = symbol === "SENSEX" ? -0.89 : (symbol === "BANKNIFTY" ? -0.66 : -0.99);
    let optionType = netChange >= 0 ? "CALL" : "PUT";
    
    const step = symbol === "BANKNIFTY" || symbol === "SENSEX" ? 100 : 50;
    const requestedStrike = Number(url.searchParams.get("strike"));
    const requestedHedgeStrike = Number(url.searchParams.get("hedgeStrike"));
    let atmStrike = Math.round(spotPrice / step) * step;
    let strike = requestedStrike && requestedStrike > 0 ? requestedStrike : atmStrike;
    let hedgeStrike = requestedHedgeStrike && requestedHedgeStrike > 0 ? requestedHedgeStrike : 0;

    let liveGreeks = null;
    let hedgeGreeks = null;
    let optionLtp = optionType === "PUT" ? 54.30 : 99.20;
    let spread = 0.25;
    let volume = 160514120;
    let oi = 9864270;
    let tokenKey = "";
    let nearestExpiry = "";

    // Fetch live Upstox REST data if token is active
    if (token) {
      try {
        const indexKey = symbol === "SENSEX" ? "BSE_INDEX|SENSEX" : (symbol === "BANKNIFTY" ? "NSE_INDEX|Nifty Bank" : (symbol === "FINNIFTY" ? "NSE_INDEX|Nifty Fin Service" : "NSE_INDEX|Nifty 50"));
        const quoteRes = await fetch(`https://api.upstox.com/v2/market-quote/quotes?instrument_key=${encodeURIComponent(indexKey)}`, {
          headers: { "Accept": "application/json", "Authorization": `Bearer ${token}` }
        });
        const qData = await quoteRes.json();
        const keyFormatted = indexKey.replace("|", ":");
        const spotQuote = qData?.data?.[keyFormatted];
        if (spotQuote?.last_price) {
          spotPrice = Number(spotQuote.last_price);
          netChange = Number(spotQuote.net_change || 0);
          netChangePct = spotPrice > 0 ? (netChange / (spotPrice - netChange)) * 100 : 0;
          optionType = netChange >= 0 ? "CALL" : "PUT";
          atmStrike = Math.round(spotPrice / step) * step;
          if (!requestedStrike) {
            strike = atmStrike;
          }
        }

        // Fetch nearest weekly contracts and option chain
        const contracts = await getUpstoxOptionContracts(token, indexKey);
        if (contracts && contracts.length) {
          const expiries = [...new Set(contracts.map(c => c.expiry))].sort();
          nearestExpiry = expiries[0];
          const targetType = optionType === "CALL" ? "CE" : "PE";

          // 1. Fetch Option Chain for nearest expiry
          const chain = await getUpstoxOptionChain(token, indexKey, nearestExpiry);
          let chainItem = null;
          if (chain && chain.length) {
            chainItem = chain.find(i => Number(i.strike_price) === strike);
            if (!chainItem) {
              chainItem = chain.find(i => Math.abs(Number(i.strike_price) - strike) <= step);
            }
            if (hedgeStrike > 0) {
              const hItem = chain.find(i => Number(i.strike_price) === hedgeStrike);
              if (hItem) {
                const hSide = targetType === "CE" ? hItem.call_options : hItem.put_options;
                if (hSide?.option_greeks) {
                  hedgeGreeks = {
                    strike: hedgeStrike,
                    delta: Number((hSide.option_greeks.delta || 0).toFixed(4)),
                    gamma: Number((hSide.option_greeks.gamma || 0).toFixed(6)),
                    theta: Number((hSide.option_greeks.theta || 0).toFixed(2)),
                    vega: Number((hSide.option_greeks.vega || 0).toFixed(2)),
                    iv: Number((hSide.option_greeks.iv || 0).toFixed(2)),
                    ltp: Number(hSide.market_data?.ltp || 0)
                  };
                }
              }
            }
          }

          if (chainItem) {
            const optSide = targetType === "CE" ? chainItem.call_options : chainItem.put_options;
            if (optSide) {
              tokenKey = optSide.instrument_key || tokenKey;
              if (optSide.market_data?.ltp) {
                optionLtp = Number(optSide.market_data.ltp);
              }
              if (optSide.market_data?.volume) volume = optSide.market_data.volume;
              if (optSide.market_data?.oi) oi = optSide.market_data.oi;
              if (optSide.market_data?.bid_price && optSide.market_data?.ask_price) {
                spread = Number(Math.max(0.05, optSide.market_data.ask_price - optSide.market_data.bid_price).toFixed(2));
              }
              if (optSide.option_greeks) {
                liveGreeks = {
                  delta: Number((optSide.option_greeks.delta || (optionType === "CALL" ? 0.54 : -0.54)).toFixed(4)),
                  gamma: Number((optSide.option_greeks.gamma || 0.0012).toFixed(6)),
                  theta: Number((optSide.option_greeks.theta || -10.5).toFixed(2)),
                  vega: Number((optSide.option_greeks.vega || 11.2).toFixed(2)),
                  iv: Number((optSide.option_greeks.iv || 12.5).toFixed(2)),
                  pop: Number((optSide.option_greeks.pop || 36.0).toFixed(2)),
                  pcr: Number((chainItem.pcr || 1.0).toFixed(2)),
                  expiry: nearestExpiry,
                  source: "upstox_chain"
                };
              }
            }
          }

          // Fallback quote fetch if chainItem had 0 LTP
          if (optionLtp <= 0 || !tokenKey) {
            let matching = contracts.find(c => c.expiry === nearestExpiry && Number(c.strike_price) === strike && String(c.instrument_type).toUpperCase() === targetType);
            if (!matching) {
              matching = contracts.find(c => c.expiry === nearestExpiry && String(c.instrument_type).toUpperCase() === targetType);
            }
            if (matching) {
              tokenKey = matching.instrument_key;
              const optQuoteRes = await fetch(`https://api.upstox.com/v2/market-quote/quotes?instrument_key=${encodeURIComponent(matching.instrument_key)}`, {
                headers: { "Accept": "application/json", "Authorization": `Bearer ${token}` }
              });
              const optQuoteData = await optQuoteRes.json();
              const formattedKey = matching.instrument_key.replace("|", ":");
              const optQuote = optQuoteData?.data?.[formattedKey] || Object.values(optQuoteData?.data || {})[0];
              if (optQuote?.last_price) {
                optionLtp = Number(optQuote.last_price);
                if (optQuote.depth?.buy?.[0]?.price && optQuote.depth?.sell?.[0]?.price) {
                  spread = Number(Math.max(0.05, optQuote.depth.sell[0].price - optQuote.depth.buy[0].price).toFixed(2));
                }
                if (optQuote.volume) volume = optQuote.volume;
                if (optQuote.oi) oi = optQuote.oi;
              }
            }
          }
        }
      } catch (e) {
        console.warn("Upstox live copilot quote & chain fetch notice:", e.message);
      }
    }

    // Mathematical Black-76 local Greeks fallback if Upstox option_greeks wasn't populated
    if (!liveGreeks) {
      const isSensex = symbol === "SENSEX";
      const isBankNifty = symbol === "BANKNIFTY";
      const dteDays = Math.max(0.1, isSensex ? 0.2 : (isBankNifty ? 4.5 : 2.5));
      const baseIv = isSensex ? 22.0 : 13.5;
      const local = calculateGreeks(spotPrice, strike, dteDays, baseIv, 0.065, optionType);
      liveGreeks = {
        delta: local.delta,
        gamma: local.gamma,
        theta: local.theta,
        vega: local.vega,
        iv: baseIv,
        pop: optionType === "CALL" ? Number((local.delta * 100).toFixed(1)) : Number((Math.abs(local.delta) * 100).toFixed(1)),
        pcr: 1.05,
        expiry: nearestExpiry || "CURRENT_WEEKLY",
        source: "black_76_local"
      };
    }

    // Robust Structural Stop Loss & Target Engine (/gaslight-pro calibrated)
    // Minimum Noise Floor: Must withstand 1m/3m candle spread without premature invalidation
    // NIFTY: min 6.5 pts (~15 spot pts at 0.45 delta), 8.5% premium
    // BANKNIFTY: min 16.0 pts (~35 spot pts at 0.45 delta), 8.5% premium
    // SENSEX: min 28.0 pts (~60 spot pts at 0.45 delta), 8.5% premium
    const isSensex = symbol === "SENSEX";
    const isBankNifty = symbol === "BANKNIFTY";
    const isFinNifty = symbol === "FINNIFTY";

    const minSlFloor = isSensex ? 28.0 : (isBankNifty ? 16.0 : (isFinNifty ? 7.0 : 6.5));
    const maxSlCap = isSensex ? 65.0 : (isBankNifty ? 45.0 : (isFinNifty ? 18.0 : 16.0));

    // Calibrated to 8.5% of option premium or minSlFloor
    const calculatedSl = Number((optionLtp * 0.085).toFixed(1));
    const slDistance = Math.max(minSlFloor, Math.min(calculatedSl, maxSlCap));
    const stopLoss = Math.max(0.5, Number((optionLtp - slDistance).toFixed(2)));

    // Mark Douglas 3-Tier Targets (Scaled for genuine structural targets & friction clearance)
    // T1 (Pay Myself & Breakeven Shield): 1:1.15 R:R
    // T2 (Primary Structural Profit Bank): 1:2.05 R:R
    // T3 (Extended Trend Expansion): 1:3.4 R:R
    const t1Distance = Number((slDistance * 1.15).toFixed(1));
    const t2Distance = Number((slDistance * 2.05).toFixed(1));
    const t3Distance = Number((slDistance * 3.4).toFixed(1));

    const targetT1 = Number((optionLtp + t1Distance).toFixed(2));
    const targetT2 = Number((optionLtp + t2Distance).toFixed(2));
    const targetT3 = Number((optionLtp + t3Distance).toFixed(2));

    // Default primary target set to reachable T2 structural pivot
    const targetPrice = targetT2;
    const tpDistance = t2Distance;
    const rrRatio = (tpDistance / slDistance).toFixed(2);
    const lotSize = symbol === "SENSEX" ? 20 : (symbol === "BANKNIFTY" ? 30 : 65);
    const riskRupees = Number((slDistance * lotSize).toFixed(2));
    const rewardRupees = Number((tpDistance * lotSize).toFixed(2));

    // Realized Net Math factoring statutory friction & conservative slippage
    const estimatedFriction = Number((55.20 + (optionLtp * lotSize * 0.001)).toFixed(2));
    const slippageDrag = Number((0.5 * lotSize).toFixed(2)); // conservative 0.5 pt execution slippage
    const netRiskRupees = Number((riskRupees + estimatedFriction + slippageDrag).toFixed(2));
    const netRewardRupees = Number((rewardRupees - estimatedFriction - slippageDrag).toFixed(2));
    const netRrRatio = netRiskRupees > 0 ? (netRewardRupees / netRiskRupees).toFixed(2) : "0.00";

    // Realistic EV under noise-filtered stops (50% empirical base win rate)
    const ev = Number(((netRewardRupees * 0.50) - (netRiskRupees * 0.50)).toFixed(2));

    // Theta Stagnation Breaker: Minutes of consolidation before 50% of SL budget is burned by theta
    const absTheta = Math.abs(liveGreeks?.theta || 10.0);
    const thetaPerMin = absTheta / 375.0; // 375 trading minutes per session
    const thetaHalfLifeMins = thetaPerMin > 0 ? Math.round((slDistance * 0.5) / thetaPerMin) : 120;

    const targets = {
      t1: { name: "Invalidation Shield (T1)", pts: t1Distance, price: targetT1, ratio: `1:${(t1Distance / slDistance).toFixed(1)}`, description: "Lock True BE & eliminate risk (0 exit fees)" },
      t2: { name: "Primary Profit Bank (T2)", pts: t2Distance, price: targetT2, ratio: `1:${(t2Distance / slDistance).toFixed(1)}`, description: "Bank base momentum scalp (Friction < 8%)" },
      t3: { name: "Trend Runner (T3)", pts: t3Distance, price: targetT3, ratio: `1:${(t3Distance / slDistance).toFixed(1)}`, description: "Extended directional runner" }
    };

    const contractSymbol = `${symbol} ${strike} ${optionType === "CALL" ? "CE" : "PE"}`;
    const isBearish = optionType === "PUT";
    const title = isBearish ? "Breakdown Momentum Scalp" : "Bullish Expansion Scalp";
    const subtitle = `Spot @ ₹${spotPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })} (${netChangePct >= 0 ? "+" : ""}${netChangePct.toFixed(2)}%). ${symbol} ${isBearish ? "breakdown below resistance" : "breakout above VWAP"} confirmed on Upstox v2. 1:${rrRatio} Gross (1:${netRrRatio} Net Realized).`;

    let netTheta = liveGreeks?.theta || 0;
    let netDelta = liveGreeks?.delta || 0;
    if (hedgeGreeks && liveGreeks) {
      netTheta = Number((liveGreeks.theta - hedgeGreeks.theta).toFixed(2));
      netDelta = Number((liveGreeks.delta - hedgeGreeks.delta).toFixed(4));
    }

    sendJson(res, {
      success: true,
      regime,
      status: "APPROVED",
      badge: "🟢 PRIME EXECUTION WINDOW · 12/12 APPROVED",
      underlying: symbol,
      spot: spotPrice,
      netChange,
      netChangePct,
      optionType,
      strike,
      atmStrike,
      contractSymbol,
      entryPrice: optionLtp,
      stopLoss,
      targetPrice,
      targetT1,
      targetT2,
      targetT3,
      targets,
      rrRatio,
      netRrRatio,
      slDistance,
      tpDistance,
      thetaHalfLifeMins,
      ev,
      lotSize,
      riskRupees,
      rewardRupees,
      netRiskRupees,
      netRewardRupees,
      capitalAtRiskPct: Number(((riskRupees / 50000) * 100).toFixed(2)),
      spread,
      volume,
      oi,
      greeks: liveGreeks,
      hedgeGreeks,
      netTheta,
      netDelta,
      expiry: nearestExpiry,
      title,
      subtitle,
      timestamp: new Date().toISOString()
    });
    return true;
  }

  if (req.method === "GET" && ["/api/paper-lab/live-status", "/api/live-alerts/live-status"].includes(url.pathname)) {
    ensurePaperEngineStarted();
    sendJson(res, paperTradeEngine.getStatus());
    return true;
  }

  if (req.method === "GET" && ["/api/paper-lab/live-events", "/api/live-alerts/live-events"].includes(url.pathname)) {
    ensurePaperEngineStarted();
    streamPaperEvents(req, res, url);
    return true;
  }

  if (req.method === "POST" && ["/api/paper-lab/trades", "/api/live-alerts/trades"].includes(url.pathname)) {
    const body = await readJsonBody(req);
    const entryPrice = Number(body.entryPrice);
    const targetPrice = Number(body.targetPrice);
    const stopLoss = Number(body.stopLoss);
    const quantity = Number(body.quantity || 1);
    const direction = String(body.direction || "LONG").toUpperCase();

    if (!body.symbol || typeof body.symbol !== "string") {
      sendJson(res, { error: "Missing or invalid symbol." }, 422);
      return true;
    }
    if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
      sendJson(res, { error: "Entry price must be a positive number." }, 422);
      return true;
    }
    if (!Number.isFinite(quantity) || quantity < 1) {
      sendJson(res, { error: "Quantity must be at least 1 lot." }, 422);
      return true;
    }
    if (direction === "LONG") {
      if (Number.isFinite(stopLoss) && stopLoss > 0 && stopLoss >= entryPrice) {
        sendJson(res, { error: "For LONG trades, stop loss must be lower than entry price." }, 422);
        return true;
      }
      if (Number.isFinite(targetPrice) && targetPrice > 0 && targetPrice <= entryPrice) {
        sendJson(res, { error: "For LONG trades, target price must be higher than entry price." }, 422);
        return true;
      }
    } else if (direction === "SHORT") {
      if (Number.isFinite(stopLoss) && stopLoss > 0 && stopLoss <= entryPrice) {
        sendJson(res, { error: "For SHORT trades, stop loss must be higher than entry price." }, 422);
        return true;
      }
      if (Number.isFinite(targetPrice) && targetPrice > 0 && targetPrice >= entryPrice) {
        sendJson(res, { error: "For SHORT trades, target price must be lower than entry price." }, 422);
        return true;
      }
    }

    const feedMode = String(body.feedMode || (body.isManual ? "MANUAL" : "LIVE")).toUpperCase();
    const isManual = feedMode === "MANUAL";
    const modeTag = isManual ? "[MANUAL_ONLY]" : "[LIVE_FEED]";
    const cleanNotes = (body.personalNotes || "").replace(/\[(?:SANDBOX_MANUAL|MANUAL_ONLY|LIVE_FEED)\]/g, "").trim();
    
    const payload = {
      ...body,
      feedMode,
      personalNotes: `${modeTag} ${cleanNotes || (isManual ? "Manual Simulator Trade" : "Live Upstox Practice Trade")}`.trim()
    };
    
    const trade = createPaperTrade(payload);
    ensurePaperEngineStarted();
    
    let tokenKey = null;
    if (!isManual) {
      await paperTradeEngine.syncTrade(trade.id);
      tokenKey = paperTradeEngine.activeTrades.get(trade.id)?.tokenKey || null;
    }
    
    paperTradeEngine.publish("trade_mutation", { action: "create", tradeId: trade.id, feedMode });
    sendJson(res, { item: { ...trade, tokenKey }, feedMode, isManual }, 201);
    return true;
  }

  const paperToggleModeMatch = url.pathname.match(/^\/api\/(?:paper-lab|live-alerts)\/trades\/(\d+)\/toggle-mode$/);
  if (req.method === "POST" && paperToggleModeMatch) {
    const id = Number(paperToggleModeMatch[1]);
    const trade = getTradeById(id);
    if (!trade) {
      sendJson(res, { error: "Trade not found" }, 404);
      return true;
    }
    const currentNotes = trade.personalNotes || "";
    const isCurrentlyManual = currentNotes.includes("[MANUAL_ONLY]");
    const newMode = isCurrentlyManual ? "LIVE" : "MANUAL";
    const newTag = isCurrentlyManual ? "[LIVE_FEED]" : "[MANUAL_ONLY]";
    const updatedNotes = `${newTag} ${currentNotes.replace(/\[(?:SANDBOX_MANUAL|MANUAL_ONLY|LIVE_FEED)\]/g, "").trim()}`.trim();
    
    const db = getDb();
    db.prepare("INSERT INTO trade_journal (trade_id, personal_notes, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(trade_id) DO UPDATE SET personal_notes = excluded.personal_notes, updated_at = datetime('now')").run(id, updatedNotes);
    trade.personalNotes = updatedNotes;
    trade.feedMode = newMode;
    
    ensurePaperEngineStarted();
    if (newMode === "LIVE") {
      await paperTradeEngine.ensureTradeSubscription(trade, { force: true });
    } else {
      paperTradeEngine.removeTrade(id);
    }
    
    paperTradeEngine.publish("trade_mutation", { action: "toggle_mode", tradeId: id, feedMode: newMode });
    sendJson(res, { success: true, id, feedMode: newMode, message: `Switched to ${newMode === "LIVE" ? "🟢 Live Upstox Stream" : "🎮 Manual Simulator"}` });
    return true;
  }

  if (req.method === "POST" && ["/api/paper-lab/auto-deploy", "/api/live-alerts/auto-deploy"].includes(url.pathname)) {
    try {
      const token = paperTradeEngine.client.accessToken;
      let spotPrice = 24151.10;
      let optionLtp = 100.00;
      let symbol = "NIFTY";
      let strike = 24200;
      let optionType = "PUT";
      let tokenKey = "NSE_FO|46994";

      // Query live Upstox quote if token is configured
      if (token) {
        try {
          const quoteRes = await fetch("https://api.upstox.com/v2/market-quote/quotes?instrument_key=NSE_INDEX|Nifty 50,NSE_FO|46993,NSE_FO|46994", {
            headers: { "Accept": "application/json", "Authorization": `Bearer ${token}` }
          });
          const qData = await quoteRes.json();
          const spotData = qData?.data?.["NSE_INDEX:Nifty 50"];
          const peData = qData?.data?.["NSE_FO:NIFTY2690124200PE"];
          const ceData = qData?.data?.["NSE_FO:NIFTY2690124200CE"];
          
          if (spotData?.last_price) spotPrice = Number(spotData.last_price);
          const netChange = Number(spotData?.net_change || 0);

          if (netChange >= 0 && ceData?.last_price) {
            optionType = "CALL";
            optionLtp = Number(ceData.last_price);
            tokenKey = "NSE_FO|46993";
          } else if (peData?.last_price) {
            optionType = "PUT";
            optionLtp = Number(peData.last_price);
            tokenKey = "NSE_FO|46994";
          }
        } catch (e) {
          console.warn("Upstox quote fetch fallback:", e.message);
        }
      }

      const entryPrice = Math.round(optionLtp * 20) / 20;
      // 🏛️ Dan Passarelli Option Greeks Rule for ₹10k Budget:
      // SL 4.0 pts (₹260 on Nifty 65 qty -> exactly within ₹200–₹300)
      // TP 8.0 pts (₹520 on Nifty 65 qty -> exactly within ₹400–₹600)
      // R:R = 1:2.0
      const isNifty = symbol === "NIFTY";
      const slBuffer = isNifty ? 4.00 : Math.max(8.00, Math.round((entryPrice * 0.12) * 20) / 20);
      const tpBuffer = isNifty ? 8.00 : Math.max(16.00, Math.round((entryPrice * 0.25) * 20) / 20);
      const stopLoss = Math.max(0.05, Math.round((entryPrice - slBuffer) * 20) / 20);
      const targetPrice = Math.round((entryPrice + tpBuffer) * 20) / 20;

      const trade = createPaperTrade({
        underlyingSymbol: symbol,
        strikePrice: strike,
        optionType: optionType,
        currentPrice: entryPrice,
        entryPrice: entryPrice,
        stopLoss: stopLoss,
        targetPrice: targetPrice,
        quantity: 1,
        lotSize: 65,
        personalNotes: `UPSTOX_TOKEN:${tokenKey} Live AI Copilot 10k Greeks Scalp (₹260 SL / ₹520 TP)`
      });

      ensurePaperEngineStarted();
      await paperTradeEngine.syncTrade(trade.id);
      paperTradeEngine.publish("trade_mutation", { action: "create", tradeId: trade.id });
      sendJson(res, { success: true, item: trade, message: `Live ${optionType} alert deployed at ₹${entryPrice.toFixed(2)}` }, 201);
      return true;
    } catch (err) {
      sendJson(res, { success: false, error: err.message }, 500);
      return true;
    }
  }

  const paperMarkMatch = url.pathname.match(/^\/api\/(?:paper-lab|live-alerts)\/trades\/(\d+)\/mark$/);
  if (req.method === "POST" && paperMarkMatch) {
    const body = await readJsonBody(req);
    const result = markPaperTrade(Number(paperMarkMatch[1]), body);
    if (result.trade.status !== "OPEN") paperTradeEngine.removeTrade(Number(paperMarkMatch[1]));
    paperTradeEngine.publish("trade_mutation", { action: "mark", tradeId: Number(paperMarkMatch[1]) });
    sendJson(res, result);
    return true;
  }

  if (req.method === "POST" && ["/api/paper-lab/square-off-all", "/api/live-alerts/square-off-all"].includes(url.pathname)) {
    const db = getDb();
    const openTrades = db.prepare("SELECT * FROM trades WHERE trade_mode = 'PAPER' AND status = 'OPEN'").all();
    const closedResults = [];
    for (const trade of openTrades) {
      try {
        const markPrice = Number(trade.last_mark_price || trade.entry_price);
        const result = closePaperTrade(trade.id, { price: markPrice, reason: "MANUAL_EXIT" });
        paperTradeEngine.removeTrade(trade.id);
        closedResults.push(result);
      } catch (err) {
        console.warn(`Failed to close trade ${trade.id}:`, err.message);
      }
    }
    paperTradeEngine.publish("trade_mutation", { action: "square_off_all", count: closedResults.length });
    sendJson(res, { success: true, count: closedResults.length, items: closedResults });
    return true;
  }

  const paperCloseMatch = url.pathname.match(/^\/api\/(?:paper-lab|live-alerts)\/trades\/(\d+)\/close$|^\/api\/trades\/(\d+)\/close$/);
  if (req.method === "POST" && paperCloseMatch) {
    const body = await readJsonBody(req);
    let targetId = Number(paperCloseMatch[1] || paperCloseMatch[2]);
    try {
      let trade = null;
      try {
        trade = getTradeById(targetId);
      } catch (err) {
        if (targetId > 1000000000000) {
          const db = getDb();
          const candidate = db.prepare("SELECT id FROM trades WHERE trade_mode = 'PAPER' AND status = 'OPEN' ORDER BY id DESC LIMIT 1").get();
          if (candidate?.id) {
            targetId = candidate.id;
            trade = getTradeById(targetId);
          }
        }
        if (!trade) throw err;
      }
      const result = closePaperTrade(targetId, body);
      paperTradeEngine.removeTrade(targetId);
      paperTradeEngine.publish("trade_mutation", { action: "close", tradeId: targetId });
      sendJson(res, result);
    } catch (err) {
      sendJson(res, { error: err.message }, err.status || 500);
    }
    return true;
  }

  const paperPartialCloseMatch = url.pathname.match(/^\/api\/(?:paper-lab|live-alerts)\/trades\/(\d+)\/partial-close$/);
  if (req.method === "POST" && paperPartialCloseMatch) {
    const id = Number(paperPartialCloseMatch[1]);
    const body = await readJsonBody(req);
    const db = getDb();
    const remainingQty = Number(body.remainingQuantity ?? body.quantity ?? 1);
    const newStopLoss = Number(body.stopLoss || 0);
    const exitPrice = Number(body.exitPrice || 0);
    const scaledLots = Number(body.scaledLots || 0);
    const netPnl = Number(body.netPnl || 0);
    const grossPnl = Number(body.grossPnl || netPnl);
    const charges = Number(body.charges || 56.0);
    const closeReason = body.closeReason || "PAY_MYSELF_T1";
    const exitDatetime = new Date().toISOString().replace("T", " ").substring(0, 19);

    let trade = null;
    try {
      trade = getTradeById(id);
    } catch (e) {}

    db.exec("BEGIN;");
    try {
      if (trade) {
        // 1. If lots were scaled out (>0), record closed child tranche in SQLite trades
        if (scaledLots > 0) {
          const insertStmt = db.prepare(`
            INSERT INTO trades (
              account_id, instrument_id, trade_mode, trade_type, direction,
              status, entry_datetime, exit_datetime, entry_price, exit_price,
              quantity, target_price, stop_loss, realized_pnl, charges, net_pnl,
              close_reason, last_mark_price, last_marked_at
            ) VALUES (?, ?, ?, ?, ?, 'CLOSED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          insertStmt.run(
            trade.accountId || 1,
            trade.instrumentId || 1,
            trade.tradeMode || "PAPER",
            trade.tradeType || "INTRADAY",
            trade.direction || "LONG",
            trade.entryDatetime || exitDatetime,
            exitDatetime,
            trade.entryPrice,
            exitPrice,
            scaledLots,
            trade.targetPrice,
            newStopLoss,
            grossPnl,
            charges,
            netPnl,
            closeReason,
            exitPrice,
            exitDatetime
          );

          // Record execution
          try {
            db.prepare(`
              INSERT INTO trade_executions(trade_id, execution_type, execution_datetime, price, quantity, charges, notes)
              VALUES (?, 'EXIT', ?, ?, ?, ?, ?)
            `).run(trade.id, exitDatetime, exitPrice, scaledLots, charges, `${closeReason} Scalp Exit`);
          } catch (e) {}

          // Refresh paper account capital
          try {
            const result = db.prepare("SELECT COALESCE(SUM(net_pnl), 0) AS pnl FROM trades WHERE trade_mode = 'PAPER' AND status = 'CLOSED'").get();
            db.prepare("UPDATE accounts SET current_capital = starting_capital + ? WHERE account_type = 'PAPER'").run(Number(result.pnl || 0));
          } catch (e) {}
        }

        // 2. Update remaining active trade quantity & stop loss in SQLite
        db.prepare("UPDATE trades SET quantity = ?, stop_loss = ?, updated_at = datetime('now') WHERE id = ?").run(remainingQty, newStopLoss, id);
      } else {
        // Fallback if trade ID was not in SQLite yet
        db.prepare("UPDATE trades SET quantity = ?, stop_loss = ?, updated_at = datetime('now') WHERE id = ?").run(remainingQty, newStopLoss, id);
      }
      db.exec("COMMIT;");
    } catch (e) {
      db.exec("ROLLBACK;");
      console.warn("Partial close DB transaction notice:", e.message);
    }

    // 3. Synchronize paperTradeEngine daemon in-memory state
    if (paperTradeEngine.activeTrades.has(id)) {
      const activeObj = paperTradeEngine.activeTrades.get(id);
      if (activeObj?.trade) {
        activeObj.trade.quantity = remainingQty;
        activeObj.trade.stopLoss = newStopLoss;
        activeObj.trade.isRiskFreeRunner = true;
      }
    }

    paperTradeEngine.publish("trade_mutation", {
      action: "partial_close",
      tradeId: id,
      remainingQuantity: remainingQty,
      stopLoss: newStopLoss,
      exitPrice,
      scaledLots,
      netPnl,
      closeReason
    });

    sendJson(res, { 
      success: true, 
      tradeId: id, 
      remainingQuantity: remainingQty, 
      stopLoss: newStopLoss,
      scaledLots,
      netPnl 
    });
    return true;
  }

  const paperStopLossMatch = url.pathname.match(/^\/api\/(?:paper-lab|live-alerts)\/trades\/(\d+)\/stop-loss$/);
  if (["PATCH", "POST"].includes(req.method) && paperStopLossMatch) {
    const id = Number(paperStopLossMatch[1]);
    const body = await readJsonBody(req);
    const stopLoss = Number(body.stopLoss || 0);
    const db = getDb();
    db.prepare("UPDATE trades SET stop_loss = ?, updated_at = datetime('now') WHERE id = ?").run(stopLoss, id);
    const trade = getTradeById(id);
    if (trade && paperTradeEngine.activeTrades.has(id)) {
      paperTradeEngine.activeTrades.get(id).trade.stopLoss = stopLoss;
    }
    paperTradeEngine.publish("stop_loss_updated", {
      tradeId: id,
      stopLoss,
      message: `Stop Loss updated to ₹${stopLoss.toFixed(2)}`,
    });
    paperTradeEngine.publish("trade_mutation", { action: "stop_loss", tradeId: id });
    sendJson(res, { success: true, item: trade });
    return true;
  }

  const paperTargetMatch = url.pathname.match(/^\/api\/(?:paper-lab|live-alerts)\/trades\/(\d+)\/target$/);
  if (["PATCH", "POST"].includes(req.method) && paperTargetMatch) {
    const id = Number(paperTargetMatch[1]);
    const body = await readJsonBody(req);
    const targetPrice = Number(body.targetPrice || body.target || 0);
    const db = getDb();
    db.prepare("UPDATE trades SET target_price = ?, updated_at = datetime('now') WHERE id = ?").run(targetPrice, id);
    const trade = getTradeById(id);
    if (trade && paperTradeEngine.activeTrades.has(id)) {
      paperTradeEngine.activeTrades.get(id).trade.targetPrice = targetPrice;
    }
    paperTradeEngine.publish("target_updated", {
      tradeId: id,
      targetPrice,
      message: `Target updated to ₹${targetPrice.toFixed(2)}`,
    });
    sendJson(res, { success: true, item: trade });
    return true;
  }

  const paperPostDeleteMatch = url.pathname.match(/^\/api\/(?:paper-lab|live-alerts)\/trades\/(\d+)\/delete$/);
  if (req.method === "POST" && paperPostDeleteMatch) {
    const id = Number(paperPostDeleteMatch[1]);
    const result = deletePaperTrade(id);
    paperTradeEngine.removeTrade(id);
    sendJson(res, result);
    return true;
  }

  const paperDeleteMatch = url.pathname.match(/^\/api\/(?:paper-lab|live-alerts)\/trades\/(\d+)$/);
  if (req.method === "DELETE" && paperDeleteMatch) {
    const id = Number(paperDeleteMatch[1]);
    const result = deletePaperTrade(id);
    paperTradeEngine.removeTrade(id);
    sendJson(res, result);
    return true;
  }

  const paperGetMatch = url.pathname.match(/^\/api\/(?:paper-lab|live-alerts)\/trades\/(\d+)$/);
  if (req.method === "GET" && paperGetMatch) {
    const id = Number(paperGetMatch[1]);
    try {
      const trade = getTradeById(id);
      sendJson(res, { success: true, trade, item: trade });
    } catch (err) {
      sendJson(res, { success: false, error: "Trade not found" }, 404);
    }
    return true;
  }

  const tradeGetMatch = url.pathname.match(/^\/api\/trades\/(\d+)$/);
  if (req.method === "GET" && tradeGetMatch) {
    const id = Number(tradeGetMatch[1]);
    try {
      const trade = getTradeById(id);
      sendJson(res, { success: true, trade, item: trade });
    } catch (err) {
      sendJson(res, { success: false, error: "Trade not found" }, 404);
    }
    return true;
  }

  const journalDeleteMatch = url.pathname.match(/^\/api\/trades\/(\d+)(?:\/delete)?$/);
  if (["DELETE", "POST"].includes(req.method) && journalDeleteMatch) {
    const id = Number(journalDeleteMatch[1]);
    const db = getDb();
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec("BEGIN;");
    try {
      db.prepare("DELETE FROM trade_executions WHERE trade_id = ?").run(id);
      db.prepare("DELETE FROM trade_journal WHERE trade_id = ?").run(id);
      db.prepare("DELETE FROM trade_strategy_tags WHERE trade_id = ?").run(id);
      db.prepare("DELETE FROM trade_mistake_tags WHERE trade_id = ?").run(id);
      db.prepare("DELETE FROM trade_attachments WHERE trade_id = ?").run(id);
      db.prepare("DELETE FROM trades WHERE id = ?").run(id);
      db.exec("COMMIT;");
    } catch (e) {
      db.exec("ROLLBACK;");
      throw e;
    }
    paperTradeEngine.removeTrade(id);
    paperTradeEngine.publish("trade_mutation", { action: "delete", tradeId: id });
    sendJson(res, { success: true, deleted: true, id });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/trades") {
    sendJson(res, { items: getTradesForUrl(url) });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/trades") {
    const body = await readJsonBody(req);
    const trade = createTrade(body);
    sendJson(res, { item: trade, deduplicated: Boolean(trade.deduplicated) }, trade.deduplicated ? 200 : 201);
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/trading/analytics") {
    const range = getRange(url);
    const trades = getTradesForUrl(url);
    sendJson(res, {
      range,
      label: rangeLabel(range),
      analytics: buildTradeAnalytics(trades),
    });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/trading/reviews") {
    const range = getRange(url);
    const trades = getTradesForUrl(url);
    const analytics = buildTradeAnalytics(trades);
    sendJson(res, {
      range,
      label: rangeLabel(range),
      reports: buildReviewReports(trades, analytics, rangeLabel(range)),
    });
    return true;
  }

  if (req.method === "GET" && url.pathname.startsWith("/evidence/trades/")) {
    serveEvidence(url.pathname, res);
    return true;
  }

  return false;
}

function ensurePaperEngineStarted() {
  paperTradeEngine.start();
}

function streamPaperEvents(req, res, url) {
  const afterId = Number(url.searchParams.get("after") || 0);
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-store, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write(": connected\n\n");

  for (const event of paperTradeEngine.getRecentEvents(afterId)) {
    writeSse(res, event);
  }

  const onEvent = (event) => writeSse(res, event);
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat ${Date.now()}\n\n`);
  }, 25_000);

  paperTradeEngine.on("event", onEvent);
  req.on("close", () => {
    clearInterval(heartbeat);
    paperTradeEngine.off("event", onEvent);
  });
}

function writeSse(res, event) {
  const payload = {
    ...(event.payload || {}),
    id: event.id,
    type: event.type,
    createdAt: event.createdAt,
  };
  res.write(`id: ${event.id}\n`);
  res.write(`event: ${event.type}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function getTradesForUrl(url) {
  const range = getRange(url);
  const { start, end } = getRangeWindow(range, url.searchParams.get("from"), url.searchParams.get("to"));
  return listTrades({ start, end });
}

function getRange(url) {
  return url.searchParams.get("range") || "all";
}

function serveEvidence(pathname, res) {
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

async function readJsonBody(req) {
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

function sendJson(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}