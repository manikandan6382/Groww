const networkDebounceTimers = new Map();
export function debounceNetworkSync(key, fn, delay = 300) {
  if (networkDebounceTimers.has(key)) {
    clearTimeout(networkDebounceTimers.get(key));
  }
  const timer = setTimeout(() => {
    networkDebounceTimers.delete(key);
    fn();
  }, delay);
  networkDebounceTimers.set(key, timer);
}

let deploySyncLockUntil = 0;
export function lockDeploySync(durationMs = 1500) {
  deploySyncLockUntil = Date.now() + durationMs;
}
export function isDeploySyncLocked() {
  return Date.now() < deploySyncLockUntil;
}

let openAlertsStorageTimer = null;
export function debounceOpenAlertsStorage(alerts, delay = 250) {
  if (typeof localStorage === "undefined") return;
  if (openAlertsStorageTimer) clearTimeout(openAlertsStorageTimer);
  openAlertsStorageTimer = setTimeout(() => {
    try {
      localStorage.setItem("portfoliox_open_alerts", JSON.stringify(alerts));
    } catch {}
  }, delay);
}

export const activeSquaringOffIds = new Set();

export const deletedTradeIdSet = new Set((() => {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem("portfoliox_deleted_trade_ids") : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
})());

export function persistDeletedTradeId(id) {
  if (id === undefined || id === null) return;
  deletedTradeIdSet.add(String(id));
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("portfoliox_deleted_trade_ids", JSON.stringify([...deletedTradeIdSet]));
    }
  } catch {}
}

export function removeDeletedTradeId(id) {
  if (id === undefined || id === null) return;
  deletedTradeIdSet.delete(String(id));
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("portfoliox_deleted_trade_ids", JSON.stringify([...deletedTradeIdSet]));
    }
  } catch {}
}

export async function commitTradeDeletionToBackend(id) {
  if (id === undefined || id === null) return;
  try {
    const paperRes = await fetch(`/api/paper-lab/trades/${id}`, { method: "DELETE" });
    if (!paperRes.ok) {
      await fetch(`/api/trades/${id}`, { method: "DELETE" });
    }
  } catch {
    try {
      await fetch(`/api/trades/${id}`, { method: "DELETE" });
    } catch {}
  }
}

export const tradeIdMap = new Map();
export const pendingPartialCloseQueue = new Map();

export const closedTradeTombstones = new Map((() => {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem("portfoliox_closed_tombstones") : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
})());

export function recordTradeTombstone(id, revision = 1) {
  if (id === undefined || id === null) return;
  const sId = String(id);
  const existing = closedTradeTombstones.get(sId);
  const nextRev = Math.max(Number(revision) || 1, (existing?.revision || 0) + 1);
  closedTradeTombstones.set(sId, { revision: nextRev, closedAt: Date.now() });
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("portfoliox_closed_tombstones", JSON.stringify([...closedTradeTombstones.entries()]));
    }
  } catch {}
}

export function removeTradeTombstone(id) {
  if (id === undefined || id === null) return;
  const sId = String(id);
  if (closedTradeTombstones.has(sId)) {
    closedTradeTombstones.delete(sId);
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("portfoliox_closed_tombstones", JSON.stringify([...closedTradeTombstones.entries()]));
      }
    } catch {}
  }
}

export function isTradeTombstoned(id, revision = 0) {
  if (id === undefined || id === null) return false;
  const sId = String(id);
  const tombstone = closedTradeTombstones.get(sId);
  if (!tombstone) return false;
  if (!revision || Number(revision) <= tombstone.revision) return true;
  return false;
}

export function flushPendingPartialClose(localId, serverId) {
  if (pendingPartialCloseQueue.has(localId)) {
    const payload = pendingPartialCloseQueue.get(localId);
    pendingPartialCloseQueue.delete(localId);
    fetch(`/api/paper-lab/trades/${serverId}/partial-close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => {});
  }
}

const tradeBroadcastChannel = typeof window !== "undefined" && typeof window.BroadcastChannel !== "undefined"
  ? new window.BroadcastChannel("portfoliox_trades_channel")
  : null;

export function broadcastTradeAction(action, payload = {}) {
  try {
    tradeBroadcastChannel?.postMessage({ action, payload, timestamp: Date.now() });
  } catch {}
}

const OUTBOX_STORAGE_KEY = "portfoliox_trade_outbox_queue";

export function getTradeOutbox() {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(OUTBOX_STORAGE_KEY) : null;
    const items = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(items)) return [];
    const sanitized = items.filter((item) => {
      if (deletedTradeIdSet.has(String(item.id))) return false;
      return true;
    });
    if (sanitized.length !== items.length && typeof localStorage !== "undefined") {
      localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(sanitized));
    }
    return sanitized;
  } catch {
    return [];
  }
}

export function queueTradeInOutbox(trade) {
  if (!trade || !trade.symbol) return;
  if (deletedTradeIdSet.has(String(trade.id))) return;
  try {
    const queue = getTradeOutbox();
    const tradeKey = trade.idempotencyKey || `journal_${trade.id || Date.now()}`;
    const exists = queue.some((item) => (item.idempotencyKey || `journal_${item.id}`) === tradeKey);
    if (!exists) {
      queue.push({ ...trade, idempotencyKey: tradeKey });
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(queue.slice(-50)));
      }
    }
  } catch {}
}

export function removeFromTradeOutbox(tradeKey) {
  try {
    const queue = getTradeOutbox();
    const filtered = queue.filter((item) => (item.idempotencyKey || `journal_${item.id}`) !== tradeKey);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch {}
}

export async function persistTradeToBackend(trade) {
  if (!trade || !trade.symbol) return null;
  const tradeKey = trade.idempotencyKey || `journal_${trade.id || Date.now()}`;
  try {
    const symbolStr = String(trade.symbol).trim();
    const isOption = trade.instrumentType === "OPTION" || symbolStr.includes("CE") || symbolStr.includes("PE");
    const hasExit = trade.exitPrice != null && trade.exitPrice !== "" && Number(trade.exitPrice) > 0;
    const entryDate = trade.entryDatetime || new Date().toISOString();
    const exitDate = hasExit ? (trade.exitDatetime || new Date().toISOString()) : null;

    const payload = {
      idempotencyKey: tradeKey,
      symbol: symbolStr,
      instrumentType: isOption ? "OPTION" : (trade.instrumentType || "STOCK"),
      optionType: trade.optionType || (symbolStr.includes("PE") ? "PUT" : (symbolStr.includes("CE") ? "CALL" : null)),
      direction: trade.direction || "LONG",
      tradeType: trade.tradeType || "INTRADAY",
      tradeMode: trade.tradeMode || "PAPER",
      status: hasExit ? "CLOSED" : (trade.status || "OPEN"),
      entryDatetime: entryDate,
      exitDatetime: exitDate,
      entryPrice: Math.max(0.01, Number(trade.entryPrice || 0)),
      exitPrice: hasExit ? Number(trade.exitPrice) : null,
      targetPrice: trade.targetPrice ? Number(trade.targetPrice) : null,
      stopLoss: trade.stopLoss ? Number(trade.stopLoss) : null,
      quantity: Math.max(1, Number(trade.quantity || 1)),
      lotSize: Math.max(1, Number(trade.lotSize || 65)),
      charges: Number(trade.taxesAndCharges || trade.charges || 55.20),
      strategyTags: Array.isArray(trade.strategyTags) ? trade.strategyTags : (trade.strategyTags ? [trade.strategyTags] : (trade.strategyTag ? [trade.strategyTag] : ["Manual Journal Scalp"])),
      mistakeTags: Array.isArray(trade.mistakeTags) ? trade.mistakeTags : (trade.mistakeTags && trade.mistakeTags !== "None" ? [trade.mistakeTags] : []),
      followedPlan: trade.followedPlan ?? true,
      journal: {
        entryReason: trade.catalyst || trade.entryReason || "Technical chart breakout pattern with volume confirmation.",
        personalNotes: trade.executionDetails || trade.personalNotes || "Executed trade as per predefined trade plan.",
        emotionBefore: trade.mindsetEmotion || "Disciplined",
        emotionAfter: hasExit ? (trade.mindsetEmotion || "Patient") : "",
        lessonsLearned: trade.lessonsLearned || "Followed execution rules with zero hesitation.",
        confidenceScore: Math.min(10, Math.max(1, Number(trade.confidenceScore || 8)))
      }
    };

    const res = await fetch("/api/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      removeFromTradeOutbox(tradeKey);
      const data = await res.json();
      return data?.item || data;
    } else {
      queueTradeInOutbox(trade);
    }
  } catch (err) {
    // Network offline / connection failed; queue in outbox for automatic recovery
    queueTradeInOutbox(trade);
  }
  return null;
}

export async function flushTradeOutbox() {
  const queue = getTradeOutbox();
  if (!queue.length) return;
  for (const trade of queue) {
    try {
      await persistTradeToBackend(trade);
    } catch {
      // Continue next item
    }
  }
}

export async function persistTradesBatchToBackend(trades) {
  if (!Array.isArray(trades) || trades.length === 0) return;
  const chunkSize = 5;
  for (let i = 0; i < trades.length; i += chunkSize) {
    const chunk = trades.slice(i, i + chunkSize);
    await Promise.allSettled(chunk.map((t) => persistTradeToBackend(t)));
  }
}
