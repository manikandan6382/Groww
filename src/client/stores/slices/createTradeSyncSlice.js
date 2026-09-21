import { deletedTradeIdSet, tradeIdMap, flushTradeOutbox, queueTradeInOutbox } from "./tradePersistence";
import { normalizeBackendOpenTrade, normalizeBackendTrade } from "./tradeNormalizers";

export const createTradeSyncSlice = (set, get) => ({
  masterTrades: (() => {
    try {
      const saved = localStorage.getItem("portfolio-master-trades") || localStorage.getItem("portfolio-journal-trades");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter((t) => !deletedTradeIdSet.has(String(t.id)));
      }
      return [];
    } catch { return []; }
  })(),

  closedAlerts: (() => {
    try {
      const saved = localStorage.getItem("portfolio-master-trades") || localStorage.getItem("portfolio-journal-trades");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter((t) => !deletedTradeIdSet.has(String(t.id)));
      }
      return [];
    } catch { return []; }
  })(),

  journalTrades: (() => {
    try {
      const saved = localStorage.getItem("portfolio-master-trades") || localStorage.getItem("portfolio-journal-trades");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter((t) => !deletedTradeIdSet.has(String(t.id)));
      }
      return [];
    } catch { return []; }
  })(),

  syncBackendOpenTrades: (backendOpenTrades) => {
    if (!Array.isArray(backendOpenTrades)) return;
    const currentAlerts = get().openAlerts || [];
    const currentMap = new Map();
    for (const t of currentAlerts) {
      if (t.serverId) currentMap.set(String(t.serverId), t);
      if (t.id) currentMap.set(String(t.id), t);
    }
    const normalizedOpen = backendOpenTrades.map((t) => {
      let existing = currentMap.get(String(t.id));
      if (!existing) {
        existing = currentAlerts.find((c) => !c.serverId && c.symbol === t.symbol && Math.abs(Number(c.entryPrice || 0) - Number(t.entryPrice || 0)) < 1.0);
        if (existing) {
          tradeIdMap.set(existing.id, t.id);
          tradeIdMap.set(String(existing.id), t.id);
        }
      }
      return normalizeBackendOpenTrade(t, existing);
    });

    const backendSymbols = new Set(backendOpenTrades.map((b) => b.symbol));
    const pendingLocal = currentAlerts.filter((t) => !t.serverId && !backendSymbols.has(t.symbol) && (Date.now() - (t.id || 0) < 15000));
    const merged = [...normalizedOpen, ...pendingLocal];

    if (currentAlerts.length === merged.length && currentAlerts.length > 0) {
      const allMatch = currentAlerts.every((c, i) =>
        (c.serverId || c.id) === (merged[i].serverId || merged[i].id) &&
        c.lastMarkPrice === merged[i].lastMarkPrice &&
        c.stopLoss === merged[i].stopLoss &&
        c.targetPrice === merged[i].targetPrice &&
        c.quantity === merged[i].quantity
      );
      if (allMatch) return;
    }

    set({ openAlerts: merged });
    try { localStorage.setItem("portfoliox_open_alerts", JSON.stringify(merged)); } catch {}
  },

  syncBackendTrades: (backendTrades) => {
    if (!Array.isArray(backendTrades) || !backendTrades.length) return;
    const current = get().masterTrades || [];
    const currentMap = new Map();
    for (const t of current) {
      if (t.id !== undefined && t.id !== null) currentMap.set(String(t.id), t);
    }

    const validBackend = backendTrades.filter((t) => !deletedTradeIdSet.has(String(t.id)));
    const normalizedBackend = validBackend.map((t) => normalizeBackendTrade(t, currentMap.get(String(t.id))));
    
    // Two-Way Resilience: Retain local-only trades not yet present in SQLite
    const backendIdSet = new Set(validBackend.map((t) => String(t.id)));
    const backendIdempotencySet = new Set(
      validBackend.map((t) => String(t.idempotencyKey || "")).filter(Boolean)
    );

    const localOnlyTrades = current.filter((t) => {
      if (deletedTradeIdSet.has(String(t.id))) return false;
      if (backendIdSet.has(String(t.id))) return false;
      if (t.serverId && backendIdSet.has(String(t.serverId))) return false;
      if (t.idempotencyKey && backendIdempotencySet.has(String(t.idempotencyKey))) return false;
      return true;
    });

    // Auto-queue local-only trades into outbox for backend durability
    localOnlyTrades.forEach((lt) => {
      queueTradeInOutbox(lt);
    });

    const merged = [...normalizedBackend, ...localOnlyTrades];
    merged.sort((a, b) => new Date(b.exitDatetime || b.entryDatetime || 0).getTime() - new Date(a.exitDatetime || a.entryDatetime || 0).getTime());

    const closedIdSet = new Set(validBackend.map((t) => String(t.id)));
    const openAlerts = get().openAlerts || [];
    const prunedOpen = openAlerts.filter((t) => !closedIdSet.has(String(t.id)) && (!t.serverId || !closedIdSet.has(String(t.serverId))));
    const openPruned = prunedOpen.length !== openAlerts.length;

    if (current.length === merged.length && current.length > 0 && !openPruned) {
      const isIdentical = current.every((c, i) => c.id === merged[i].id && c.exitDatetime === merged[i].exitDatetime && c.netPnl === merged[i].netPnl);
      if (isIdentical) return;
    }

    set({ masterTrades: merged, closedAlerts: merged, journalTrades: merged, ...(openPruned ? { openAlerts: prunedOpen } : {}) });
    try {
      localStorage.setItem("portfolio-master-trades", JSON.stringify(merged));
      localStorage.setItem("portfolio-journal-trades", JSON.stringify(merged));
      if (openPruned) localStorage.setItem("portfoliox_open_alerts", JSON.stringify(prunedOpen));
    } catch {}
  },

  hydrateFromSqlite: async () => {
    try {
      // 1. Flush any unpersisted offline trades to SQLite first
      await flushTradeOutbox();

      // 2. Fetch all authoritative trades from SQLite database.sqlite
      const res = await fetch("/api/trades?range=all");
      if (res.ok) {
        const data = await res.json();
        const items = data?.items || [];
        if (Array.isArray(items) && items.length > 0) {
          get().syncBackendTrades(items);
          return true;
        }
      }
    } catch {
      // Non-blocking offline fallback
    }
    return false;
  },

  purgeStaleMockTrades: () => {
    fetch("/api/paper-lab").then((r) => (r.ok ? r.json() : null)).then((data) => {
      if (data?.closedTrades) get().syncBackendTrades(data.closedTrades);
    }).catch(() => {});
  },
});
