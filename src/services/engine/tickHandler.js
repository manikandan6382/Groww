import { getDb } from "../../db/connection.js";
import { forwardTickToDotnet } from "./dotnetForwarder.js";
import { reconcileActivePosition } from "./triggerEvaluator.js";

export function handleEngineTick(engine, tick) {
  const isFreshLiveTick = tick.isFresh !== false && tick.source !== "REST_RECOVERY";
  if (isFreshLiveTick) {
    forwardTickToDotnet(tick);
  }

  const tickKey = tick.key || tick.tokenKey || tick.token;
  if (tickKey && engine.quoteStore) {
    const existing = engine.quoteStore.get(tickKey);
    const now = Date.now();
    const receivedTimeMs = tick.receivedAtMs || (tick.receivedAt ? new Date(tick.receivedAt).getTime() : now);
    const lttMs = tick.ltt !== undefined ? tick.ltt : (existing?.ltt ?? null);
    const feedTsMs = tick.feedTs !== undefined ? tick.feedTs : (existing?.feedTs ?? null);

    const isStaleRestTick = existing &&
      existing.source === "WEBSOCKET_V3" &&
      tick.source === "REST_RECOVERY" &&
      ((existing.receivedAtMs || existing.timestampMs || 0) >= receivedTimeMs);

    if (!isStaleRestTick) {
      engine.quoteStore.set(tickKey, {
        instrumentKey: tickKey,
        symbol: tick.symbol || existing?.symbol || tickKey,
        ltp: Number(tick.ltp || 0),
        ltt: lttMs,
        lttIso: tick.lttIso || (lttMs ? new Date(lttMs).toISOString() : (existing?.lttIso ?? null)),
        feedTs: feedTsMs,
        feedTsIso: tick.feedTsIso || (feedTsMs ? new Date(feedTsMs).toISOString() : (existing?.feedTsIso ?? null)),
        open: Number(tick.open || existing?.open || 0),
        high: Number(tick.high || existing?.high || 0),
        low: Number(tick.low || existing?.low || 0),
        close: Number(tick.close || existing?.close || 0),
        volume: Number(tick.volume || existing?.volume || 0),
        oi: Number(tick.oi || existing?.oi || 0),
        source: tick.source || (engine.client?.connected ? "WEBSOCKET_V3" : "REST_RECOVERY"),
        isFresh: tick.isFresh !== undefined ? Boolean(tick.isFresh) : true,
        receivedAt: tick.receivedAt || new Date(receivedTimeMs).toISOString(),
        receivedAtMs: receivedTimeMs,
        timestampMs: lttMs || feedTsMs || receivedTimeMs,
        greeks: tick.greeks || existing?.greeks || null,
        depth: tick.depth || existing?.depth || null,
      });
    }
  }

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

    if (!isFreshLiveTick) {
      item.lastKnownReferencePrice = tick.ltp;
      item.isStale = true;
      item.pnlStatus = "UNVERIFIED";
      continue;
    }

    item.lastLtp = tick.ltp;
    item.lastKnownReferencePrice = tick.ltp;
    item.lastTickAt = tick.receivedAt;

    if (item.monitoringState === "RECOVERY_RECONCILIATION_REQUIRED" || item.monitoringState === "RECONCILIATION_REQUIRED") {
      reconcileActivePosition(engine, item, tick);
      continue;
    }

    item.isStale = false;
    item.monitoringState = "NORMAL";
    item.pnlStatus = "VERIFIED";
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
