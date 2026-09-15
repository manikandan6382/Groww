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
