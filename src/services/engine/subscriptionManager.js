import { getPaperLab } from "../../repositories/paper-lab.repository.js";
import { getTradeById } from "../../repositories/trades.repository.js";
import { isMarketOpenNow, isSessionExpiredError } from "./marketTiming.js";

const MARKET_CLOSED_REFRESH_MS = 60_000;

export async function refreshAllActiveTrades(engine) {
  if (!engine.started) return;
  let lab;
  try {
    lab = getPaperLab({ range: "week" });
  } catch (error) {
    engine.publish("error", { message: error.message });
    return;
  }

  const openTrades = lab.openTrades || [];
  const openIds = new Set(openTrades.map((t) => Number(t.id)));

  for (const id of Array.from(engine.activeTrades.keys())) {
    if (!openIds.has(id)) engine.removeTrade(id);
  }

  if (!openTrades.length) {
    engine.publish("empty", { message: "No active paper trades to monitor." });
    return;
  }

  if (!isMarketOpenNow()) {
    engine.publish("market_closed", {
      message: "Market is closed. Live trigger monitoring will resume when ticks arrive.",
      nextRefreshMs: MARKET_CLOSED_REFRESH_MS,
    });
  }

  for (const trade of openTrades) {
    await engine.ensureTradeSubscription(trade);
  }
}

export async function ensureSubscription(engine, trade, { force = false } = {}) {
  const id = Number(trade.id);
  if (!id || engine.resolving.has(id)) return;

  const isExplicitManual = trade.feedMode === "MANUAL" || trade.personalNotes?.includes("[MANUAL_ONLY]");
  if (isExplicitManual) {
    if (engine.activeTrades.has(id)) engine.removeTrade(id);
    return;
  }

  const existing = engine.activeTrades.get(id);
  if (existing?.status === "subscribed" && !force) return;
  
  engine.resolving.add(id);

  try {
    let tokenKey = await engine.client.resolveOptionToken(trade);
    const isPracticeFallback = !tokenKey;
    if (!tokenKey) {
      tokenKey = `PRACTICE:${trade.id}:${trade.symbol}`;
    }

    if (existing?.tokenKey && existing.tokenKey !== tokenKey) engine.removeTrade(id);
    engine.activeTrades.set(id, {
      ...(existing || {}),
      trade,
      tokenKey,
      status: "subscribed",
      isPracticeFallback,
      subscribedAtMs: existing?.subscribedAtMs || Date.now(),
    });
    if (!engine.tokenToTradeIds.has(tokenKey)) engine.tokenToTradeIds.set(tokenKey, new Set());
    engine.tokenToTradeIds.get(tokenKey).add(id);
    if (!isPracticeFallback) engine.client.subscribe(tokenKey);
    engine.publish("subscribed", { tradeId: id, symbol: trade.symbol, tokenKey, isPracticeFallback });
  } catch (error) {
    engine.activeTrades.set(id, {
      trade,
      tokenKey: null,
      status: "token_error",
      error: error.message,
    });
    engine.publish("token_error", { tradeId: id, symbol: trade.symbol, message: error.message });
    if (isSessionExpiredError(error)) {
      engine.publish("session_expired", { message: error.message });
    }
  } finally {
    engine.resolving.delete(id);
  }
}

export async function syncEngineTrade(engine, tradeId) {
  const id = Number(tradeId);
  let trade = (getPaperLab({ range: "week" }).openTrades || []).find((item) => Number(item.id) === id);
  if (!trade) {
    trade = getTradeById(id);
  }
  if (!trade || trade.status !== "OPEN") {
    engine.removeTrade(id);
    return;
  }
  await ensureSubscription(engine, trade, { force: true });
}

export function removeEngineTrade(engine, tradeId) {
  const id = Number(tradeId);
  const item = engine.activeTrades.get(id);
  if (!item) return;
  engine.activeTrades.delete(id);
  if (item.tokenKey) {
    const ids = engine.tokenToTradeIds.get(item.tokenKey) || new Set();
    ids.delete(id);
    if (ids.size) {
      engine.tokenToTradeIds.set(item.tokenKey, ids);
    } else {
      engine.tokenToTradeIds.delete(item.tokenKey);
      engine.client.unsubscribe(item.tokenKey);
    }
  }
  engine.publish("unsubscribed", { tradeId: id, symbol: item.trade.symbol, tokenKey: item.tokenKey });
}
