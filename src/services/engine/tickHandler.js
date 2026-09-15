import { getDb } from "../../db/connection.js";
import { forwardTickToDotnet } from "./dotnetForwarder.js";

export function handleEngineTick(engine, tick) {
  forwardTickToDotnet(tick);

  if (tick.key && (tick.key.startsWith("NSE_INDEX") || tick.key.startsWith("BSE_INDEX"))) {
    const sym = tick.key.includes("SENSEX")
      ? "SENSEX"
      : tick.key.includes("Bank")
      ? "BANKNIFTY"
      : tick.key.includes("Fin")
      ? "FINNIFTY"
      : "NIFTY";
    engine.publish("index_tick", { symbol: sym, tokenKey: tick.key, ltp: tick.ltp, receivedAt: tick.receivedAt });
  }

  const tickKey = tick.key || tick.tokenKey || tick.token;
  if (tickKey && engine.watchedTokens?.has(tickKey)) {
    const entry = engine.watchedTokens.get(tickKey);
    const sym = typeof entry === "object" ? entry?.symbol : entry || tickKey;
    engine.publish("tick", {
      symbol: sym,
      tokenKey: tickKey,
      ltp: tick.ltp,
      change: tick.change || 0,
      receivedAt: tick.receivedAt || new Date().toISOString(),
    });
  }

  const tradeIds = engine.tokenToTradeIds.get(tickKey);
  if (!tradeIds?.size) return;

  for (const id of Array.from(tradeIds)) {
    const item = engine.activeTrades.get(id);
    if (!item || item.tokenKey !== tickKey) continue;
    item.lastLtp = tick.ltp;
    item.lastTickAt = tick.receivedAt;
    engine.pendingMarks.set(id, { price: tick.ltp, time: tick.receivedAt });
    engine.publish("tick", {
      tradeId: id,
      symbol: item.trade.symbol,
      tokenKey: tickKey,
      ltp: tick.ltp,
      receivedAt: tick.receivedAt,
    });
    engine.evaluateTrigger(item.trade, tick);
  }
}

export function flushMarks(engine) {
  if (!engine.pendingMarks.size) return;
  const entries = Array.from(engine.pendingMarks.entries());
  engine.pendingMarks.clear();

  try {
    const db = getDb();
    db.exec("BEGIN;");
    try {
      const stmt = db.prepare("UPDATE trades SET last_mark_price = ?, last_marked_at = ? WHERE id = ? AND status = 'OPEN'");
      for (const [id, data] of entries) {
        stmt.run(data.price, data.time || new Date().toISOString(), id);
      }
      db.exec("COMMIT;");
    } catch (err) {
      db.exec("ROLLBACK;");
      console.warn("[paperTradeEngine] flushPendingMarks rollback:", err.message);
    }
  } catch (err) {
    console.warn("[paperTradeEngine] flushPendingMarks error:", err.message);
  }
}

export function pruneTokens(engine) {
  const now = Date.now();
  for (const [tokenKey, info] of Array.from(engine.watchedTokens.entries())) {
    if (now - info.lastSeenAt > 90_000) {
      const activeTradeIds = engine.tokenToTradeIds.get(tokenKey);
      if (!activeTradeIds || activeTradeIds.size === 0) {
        if (engine.client?.unsubscribe) engine.client.unsubscribe(tokenKey);
        engine.watchedTokens.delete(tokenKey);
        if (info.symbol) engine.watchedSymbols.delete(info.symbol);
      } else {
        info.lastSeenAt = now;
      }
    }
  }
}
