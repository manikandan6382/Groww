import fs from "node:fs";
import path from "node:path";
import { paperTradeEngine } from "../../services/paperTradeEngine.js";
import { ensurePaperEngineStarted } from "./paper-sse.js";
import { readJsonBody, sendJson } from "./route-helpers.js";

// In-memory 5-second TTL cache to prevent Upstox API 429 rate-limiting
let upstoxFillsCache = null;
let upstoxFillsCacheTime = 0;
const FILLS_CACHE_TTL_MS = 5000;

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

export function parseUpstoxFills(rawTrades = [], rawPositions = []) {
  const result = [];

  const tradesBySymbol = new Map();
  for (const tr of rawTrades) {
    const sym = String(tr.trading_symbol || tr.instrument_token || "").trim();
    if (!sym) continue;
    if (!tradesBySymbol.has(sym)) tradesBySymbol.set(sym, []);
    tradesBySymbol.get(sym).push(tr);
  }

  for (const list of tradesBySymbol.values()) {
    list.sort((a, b) => new Date(a.trade_timestamp || a.order_timestamp || 0) - new Date(b.trade_timestamp || b.order_timestamp || 0));
  }

  const processedSymbols = new Set();
  for (const pos of rawPositions) {
    const sym = String(pos.trading_symbol || pos.instrument_token || "").trim();
    if (!sym) continue;

    const buyQty = Number(pos.day_buy_quantity || 0);
    const sellQty = Number(pos.day_sell_quantity || 0);
    const netQty = Number(pos.quantity || 0);
    const buyPrice = Number(pos.day_buy_price || 0);
    const sellPrice = Number(pos.day_sell_price || 0);

    if (buyQty === 0 && sellQty === 0) continue;

    processedSymbols.add(sym);
    const matchingTrades = tradesBySymbol.get(sym) || [];

    let direction = "LONG";
    if (matchingTrades.length > 0) {
      direction = matchingTrades[0].transaction_type === "SELL" ? "SHORT" : "LONG";
    } else if (sellQty > buyQty) {
      direction = "SHORT";
    }

    const matchedQty = netQty === 0 ? Math.min(buyQty, sellQty) : Math.max(buyQty, sellQty);
    const isSettled = netQty === 0 && buyQty > 0 && sellQty > 0;
    const entryPrice = direction === "SHORT" ? (sellPrice || buyPrice) : (buyPrice || sellPrice);
    const exitPrice = direction === "SHORT" ? (buyPrice || sellPrice) : (sellPrice || buyPrice);

    const entryDatetime = matchingTrades[0]?.trade_timestamp || matchingTrades[0]?.order_timestamp || new Date().toISOString();
    const exitDatetime = matchingTrades[matchingTrades.length - 1]?.trade_timestamp || matchingTrades[matchingTrades.length - 1]?.order_timestamp || entryDatetime;

    const buyTurnover = buyPrice * (matchedQty || 1);
    const sellTurnover = sellPrice * (matchedQty || 1);
    const totalTurnover = buyTurnover + sellTurnover;
    const brokerage = 40.0;
    const sellLegTurnover = direction === "SHORT" ? buyTurnover : sellTurnover;
    const stt = Number((sellLegTurnover * 0.001).toFixed(2));
    const exchangeCharges = Number((totalTurnover * 0.000505).toFixed(2));
    const sebiCharges = Number((totalTurnover * 0.000001).toFixed(2));
    const stampDuty = Number(((direction === "SHORT" ? sellTurnover : buyTurnover) * 0.00003).toFixed(2));
    const gst = Number(((brokerage + exchangeCharges + sebiCharges) * 0.18).toFixed(2));
    const statutoryCharges = Number((brokerage + stt + exchangeCharges + sebiCharges + stampDuty + gst).toFixed(2));

    const grossPnl = isSettled
      ? Number(((direction === "SHORT" ? entryPrice - exitPrice : exitPrice - entryPrice) * matchedQty).toFixed(2))
      : Number(pos.pnl || 0);
    const netPnl = isSettled ? Number((grossPnl - statutoryCharges).toFixed(2)) : grossPnl;

    const slPoints = Number((250 / Math.max(1, matchedQty)).toFixed(2));
    const targetPoints = Number((slPoints * 2.0).toFixed(2));
    const stopLoss = direction === "SHORT" ? Number((entryPrice + slPoints).toFixed(2)) : Math.max(0.05, Number((entryPrice - slPoints).toFixed(2)));
    const targetPrice = direction === "SHORT" ? Math.max(0.05, Number((entryPrice - targetPoints).toFixed(2))) : Number((entryPrice + targetPoints).toFixed(2));

    result.push({
      id: `upstox-pos-${sym}-${Date.now()}`,
      symbol: sym,
      instrumentToken: pos.instrument_token || "",
      direction,
      entryPrice: Number(entryPrice.toFixed(2)),
      exitPrice: Number((isSettled ? exitPrice : (pos.last_price || exitPrice)).toFixed(2)),
      quantity: matchedQty,
      lotSize: 1,
      netPnl,
      grossPnl,
      statutoryCharges,
      status: isSettled ? "SETTLED" : "OPEN",
      source: "Upstox Live API",
      strategyTag: "Intraday Scalp",
      setupTag: "Intraday Scalp",
      stopLoss,
      targetPrice,
      entryDatetime,
      exitDatetime,
      lessonsLearned: `Auto-synced from Upstox execution terminal. Realized P&L: ₹${netPnl}.`,
      notes: `Upstox order fill sync for ${sym} (${matchedQty} units).`
    });
  }

  for (const [sym, trades] of tradesBySymbol.entries()) {
    if (processedSymbols.has(sym)) continue;
    const buys = trades.filter((t) => t.transaction_type === "BUY");
    const sells = trades.filter((t) => t.transaction_type === "SELL");

    const totalBuyQty = buys.reduce((acc, b) => acc + Number(b.quantity || 0), 0);
    const totalSellQty = sells.reduce((acc, s) => acc + Number(s.quantity || 0), 0);
    const avgBuyPrice = totalBuyQty > 0 ? buys.reduce((acc, b) => acc + Number(b.average_price || 0) * Number(b.quantity || 0), 0) / totalBuyQty : 0;
    const avgSellPrice = totalSellQty > 0 ? sells.reduce((acc, s) => acc + Number(s.average_price || 0) * Number(s.quantity || 0), 0) / totalSellQty : 0;

    const direction = trades[0]?.transaction_type === "SELL" ? "SHORT" : "LONG";
    const matchedQty = Math.min(totalBuyQty, totalSellQty) || totalBuyQty || totalSellQty;
    const isSettled = totalBuyQty > 0 && totalSellQty > 0 && totalBuyQty === totalSellQty;

    const entryPrice = direction === "SHORT" ? avgSellPrice : avgBuyPrice;
    const exitPrice = direction === "SHORT" ? avgBuyPrice : avgSellPrice;

    const entryDatetime = trades[0]?.trade_timestamp || trades[0]?.order_timestamp || new Date().toISOString();
    const exitDatetime = trades[trades.length - 1]?.trade_timestamp || trades[trades.length - 1]?.order_timestamp || entryDatetime;

    const buyTurnover = avgBuyPrice * (matchedQty || 1);
    const sellTurnover = avgSellPrice * (matchedQty || 1);
    const totalTurnover = buyTurnover + sellTurnover;
    const brokerage = 40.0;
    const sellLegTurnover = direction === "SHORT" ? buyTurnover : sellTurnover;
    const stt = Number((sellLegTurnover * 0.001).toFixed(2));
    const exchangeCharges = Number((totalTurnover * 0.000505).toFixed(2));
    const sebiCharges = Number((totalTurnover * 0.000001).toFixed(2));
    const stampDuty = Number(((direction === "SHORT" ? sellTurnover : buyTurnover) * 0.00003).toFixed(2));
    const gst = Number(((brokerage + exchangeCharges + sebiCharges) * 0.18).toFixed(2));
    const statutoryCharges = Number((brokerage + stt + exchangeCharges + sebiCharges + stampDuty + gst).toFixed(2));

    const grossPnl = Number(((direction === "SHORT" ? entryPrice - exitPrice : exitPrice - entryPrice) * matchedQty).toFixed(2));
    const netPnl = Number((grossPnl - statutoryCharges).toFixed(2));

    const slPoints = Number((250 / Math.max(1, matchedQty)).toFixed(2));
    const targetPoints = Number((slPoints * 2.0).toFixed(2));
    const stopLoss = direction === "SHORT" ? Number((entryPrice + slPoints).toFixed(2)) : Math.max(0.05, Number((entryPrice - slPoints).toFixed(2)));
    const targetPrice = direction === "SHORT" ? Math.max(0.05, Number((entryPrice - targetPoints).toFixed(2))) : Number((entryPrice + targetPoints).toFixed(2));

    result.push({
      id: `upstox-tr-${sym}-${Date.now()}`,
      symbol: sym,
      instrumentToken: trades[0]?.instrument_token || "",
      direction,
      entryPrice: Number(entryPrice.toFixed(2)),
      exitPrice: Number(exitPrice.toFixed(2)),
      quantity: matchedQty,
      lotSize: 1,
      netPnl,
      grossPnl,
      statutoryCharges,
      status: isSettled ? "SETTLED" : "OPEN",
      source: "Upstox Live API",
      strategyTag: "Intraday Scalp",
      setupTag: "Intraday Scalp",
      stopLoss,
      targetPrice,
      entryDatetime,
      exitDatetime,
      lessonsLearned: `Auto-synced from Upstox execution terminal. Realized P&L: ₹${netPnl}.`,
      notes: `Upstox order fill sync for ${sym} (${matchedQty} units).`
    });
  }

  return result;
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

  if (req.method === "GET" && url.pathname === "/api/upstox/today-fills") {
    // 5-second TTL cache check (prevents 429 Too Many Requests from Upstox)
    if (Date.now() - upstoxFillsCacheTime < FILLS_CACHE_TTL_MS && upstoxFillsCache) {
      sendJson(res, { ...upstoxFillsCache, cached: true });
      return true;
    }

    ensurePaperEngineStarted();
    const client = paperTradeEngine.client;
    client.refreshAccessToken();
    const token = client.accessToken || "";

    if (!token) {
      sendJson(res, {
        success: false,
        error: "Upstox access token missing. Please paste token in settings.",
        isExpired: true,
        trades: []
      }, 401);
      return true;
    }

    try {
      const [tradesRes, positionsRes] = await Promise.allSettled([
        fetch("https://api.upstox.com/v2/order/trades/get-trades-for-day", {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json"
          }
        }).then((r) => r.json()),
        fetch("https://api.upstox.com/v2/portfolio/short-term-positions", {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json"
          }
        }).then((r) => r.json())
      ]);

      const rawTradesData = tradesRes.status === "fulfilled" ? tradesRes.value : null;
      const rawPositionsData = positionsRes.status === "fulfilled" ? positionsRes.value : null;

      const isUnauthorized =
        rawTradesData?.status === "error" &&
        (rawTradesData?.errors?.[0]?.errorCode === "UDAPI100057" ||
          rawTradesData?.message?.toLowerCase().includes("unauthorized") ||
          rawTradesData?.message?.toLowerCase().includes("expired"));

      if (isUnauthorized) {
        sendJson(res, {
          success: false,
          error: "Upstox session token expired. Please re-authenticate.",
          isExpired: true,
          trades: []
        }, 401);
        return true;
      }

      const rawTrades = Array.isArray(rawTradesData?.data) ? rawTradesData.data : [];
      const rawPositions = Array.isArray(rawPositionsData?.data) ? rawPositionsData.data : [];

      const parsedFills = parseUpstoxFills(rawTrades, rawPositions);

      const payload = {
        success: true,
        count: parsedFills.length,
        trades: parsedFills,
        rawTradesCount: rawTrades.length,
        positionsCount: rawPositions.length,
        syncedAt: new Date().toISOString(),
        message: parsedFills.length > 0
          ? `Successfully synced ${parsedFills.length} Upstox trade(s) for today.`
          : "No executed trades recorded on Upstox for today yet."
      };

      upstoxFillsCache = payload;
      upstoxFillsCacheTime = Date.now();

      sendJson(res, payload);
    } catch (err) {
      sendJson(res, {
        success: false,
        error: `Failed to query Upstox fills: ${err.message}`,
        trades: []
      }, 500);
    }
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
