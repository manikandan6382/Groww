import { deletedTradeIdSet, tradeIdMap, flushTradeOutbox, getTradeOutbox, queueTradeInOutbox, activeSquaringOffIds, isTradeTombstoned, recordTradeTombstone, removeTradeTombstone } from "./tradePersistence";
import { normalizeBackendOpenTrade, normalizeBackendTrade } from "./tradeNormalizers";
import { recordLifecycleEvent, assertTradeInvariants } from "../../utils/tradeLifecycleAuditor";

const STORAGE_SCHEMA_VERSION = "portfoliox_v5_20261003_purged";

function loadSanitizedInitialTrades() {
  if (typeof localStorage === "undefined") return [];
  try {
    const currentVersion = localStorage.getItem("portfoliox_schema_version");
    if (currentVersion !== STORAGE_SCHEMA_VERSION) {
      // Clean slate: invalidate legacy or corrupted caches across sessions
      localStorage.removeItem("portfolio-master-trades");
      localStorage.removeItem("portfolio-journal-trades");
      localStorage.removeItem("portfoliox_open_alerts");
      localStorage.removeItem("portfoliox_trade_outbox_queue");
      localStorage.removeItem("portfoliox_deleted_trade_ids");
      try { deletedTradeIdSet.clear(); } catch {}
      localStorage.setItem("portfoliox_schema_version", STORAGE_SCHEMA_VERSION);
      return [];
    }

    const saved = localStorage.getItem("portfolio-master-trades") || localStorage.getItem("portfolio-journal-trades");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.filter((t) => {
          if (deletedTradeIdSet.has(String(t.id))) return false;
          return true;
        });
      }
    }
    return [];
  } catch {
    return [];
  }
}

export const createTradeSyncSlice = (set, get) => ({
  masterTrades: loadSanitizedInitialTrades(),
  closedAlerts: loadSanitizedInitialTrades(),
  journalTrades: loadSanitizedInitialTrades(),

  syncBackendOpenTrades: (backendOpenTrades) => {
    if (!Array.isArray(backendOpenTrades)) return;
    const currentAlerts = get().openAlerts || [];
    const masterTrades = get().masterTrades || [];
    const closedAlerts = get().closedAlerts || [];

    // Build fast lookup set of all locally closed trade IDs
    const closedIdSet = new Set();
    for (const c of [...masterTrades, ...closedAlerts]) {
      if (c.id != null) closedIdSet.add(String(c.id));
      if (c.serverId != null) closedIdSet.add(String(c.serverId));
    }

    const currentMap = new Map();
    for (const t of currentAlerts) {
      if (t.serverId) currentMap.set(String(t.serverId), t);
      if (t.id) currentMap.set(String(t.id), t);
    }

    const activeBackendOpen = backendOpenTrades.filter((t) => {
      const sId = String(t.id);
      const rev = Number(t.revision) || 1;

      // STAGE 3 INVARIANT: Ghost trade resurrection guard
      if (deletedTradeIdSet.has(sId) || activeSquaringOffIds.has(sId)) return false;
      if (t.status === "OPEN" || !t.exitPrice) {
        removeTradeTombstone(sId);
        return true;
      }
      if (isTradeTombstoned(sId, rev) || closedIdSet.has(sId)) {
        console.warn(`[Ghost Guard] Rejected stale OPEN snapshot for closed/tombstoned trade #${sId} (revision ${rev})`);
        recordLifecycleEvent({
          tradeId: sId,
          revision: rev,
          event: "REJECTED_STALE_OPEN_SNAPSHOT",
          state_before: "CLOSED",
          state_after: "CLOSED",
          source: "GHOST_GUARD",
          details: "Monotonic transition preserved. Stale OPEN response discarded."
        });
        return false;
      }
      return true;
    });

    const normalizedOpen = activeBackendOpen.map((t) => {
      let existing = currentMap.get(String(t.id));
      if (!existing) {
        existing = currentAlerts.find((c) => !c.serverId && c.symbol === t.symbol && Math.abs(Number(c.entryPrice || 0) - Number(t.entryPrice || 0)) < 1.0);
        if (existing) {
          tradeIdMap.set(existing.id, t.id);
          tradeIdMap.set(String(existing.id), t.id);
        }
      }
      const normalized = normalizeBackendOpenTrade(t, existing);
      assertTradeInvariants(normalized, "ACTIVE");
      return normalized;
    });

    const backendSymbols = new Set(activeBackendOpen.map((b) => b.symbol));
    const pendingLocal = currentAlerts.filter((t) => {
      const sId = String(t.id);
      if (t.serverId) return false;
      if (closedIdSet.has(sId) || isTradeTombstoned(sId)) return false;
      return !backendSymbols.has(t.symbol) && (Date.now() - (t.id || 0) < 15000);
    });
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
    if (!Array.isArray(backendTrades)) return;
    const current = get().masterTrades || [];
    const currentMap = new Map();
    for (const t of current) {
      if (t.id !== undefined && t.id !== null) currentMap.set(String(t.id), t);
    }

    const validBackend = backendTrades.filter((t) => {
      const sId = String(t.id);
      if (deletedTradeIdSet.has(sId)) return false;
      if (t.status === "OPEN" && !t.exitPrice && !t.closeReason) return false;
      return true;
    });
    const normalizedBackend = validBackend.map((t) => normalizeBackendTrade(t, currentMap.get(String(t.id))));
    
    // Merge only pending offline outbox trades that have not yet synced to SQLite
    const backendIdSet = new Set(validBackend.map((t) => String(t.id)));
    const backendIdempotencySet = new Set(
      validBackend.map((t) => String(t.idempotencyKey || "")).filter(Boolean)
    );

    const pendingOutbox = getTradeOutbox().filter((t) => {
      if (deletedTradeIdSet.has(String(t.id))) return false;
      if (backendIdSet.has(String(t.id))) return false;
      if (t.serverId && backendIdSet.has(String(t.serverId))) return false;
      if (t.idempotencyKey && backendIdempotencySet.has(String(t.idempotencyKey))) return false;
      return true;
    });

    // Retain recently closed local trades that have not yet arrived from backend
    const recentLocalClosed = current.filter((t) => {
      const sId = String(t.id);
      const serverId = t.serverId ? String(t.serverId) : null;
      if (deletedTradeIdSet.has(sId)) return false;
      if (serverId && deletedTradeIdSet.has(serverId)) return false;
      // If a trade was already assigned a numeric database ID or serverId, and the backend did not return it,
      // it was intentionally purged/deleted from the database — do NOT resurrect it!
      if (!isNaN(Number(t.id)) || serverId) return false;
      if (backendIdSet.has(sId)) return false;
      if (serverId && backendIdSet.has(serverId)) return false;
      if (t.idempotencyKey && backendIdempotencySet.has(String(t.idempotencyKey))) return false;
      return Boolean(t.exitPrice || t.exitDatetime || t.closeReason);
    });

    const merged = [...normalizedBackend, ...pendingOutbox, ...recentLocalClosed];
    merged.sort((a, b) => new Date(b.exitDatetime || b.entryDatetime || 0).getTime() - new Date(a.exitDatetime || a.entryDatetime || 0).getTime());

    const closedIdSet = new Set(validBackend.map((t) => String(t.id)));
    for (const t of validBackend) {
      if (t.id != null) recordTradeTombstone(t.id, t.revision || 1);
      if (t.serverId != null) recordTradeTombstone(t.serverId, t.revision || 1);
    }
    const openAlerts = get().openAlerts || [];
    const prunedOpen = openAlerts.filter((t) => {
      const sId = String(t.id);
      const serverId = t.serverId ? String(t.serverId) : null;
      if (closedIdSet.has(sId) || isTradeTombstoned(sId)) return false;
      if (serverId && (closedIdSet.has(serverId) || isTradeTombstoned(serverId))) return false;
      return true;
    });
    const openPruned = prunedOpen.length !== openAlerts.length;

    const currentClosed = get().closedAlerts || [];
    if (current.length === merged.length && currentClosed.length === merged.length && current.length > 0 && !openPruned) {
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
      const res = await fetch("/api/trades?range=all", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
      });
      let fetchedItems = null;
      if (res.ok) {
        const data = await res.json();
        const allItems = data?.items || (Array.isArray(data) ? data : []);
        fetchedItems = allItems.filter((t) => t.status === "CLOSED" || Boolean(t.exitPrice || t.closeReason));
        if (Array.isArray(fetchedItems)) {
          get().syncBackendTrades(fetchedItems);
        }
      }

      // 3. Sync open trades from paper-lab with no-store
      const paperRes = await fetch("/api/paper-lab", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
      });
      if (paperRes.ok) {
        const paperData = await paperRes.json();
        if (Array.isArray(paperData.openTrades)) {
          get().syncBackendOpenTrades(paperData.openTrades);
        }
        if (Array.isArray(paperData.closedTrades) && (!fetchedItems || fetchedItems.length === 0)) {
          get().syncBackendTrades(paperData.closedTrades);
        }
      }
      return true;
    } catch {
      // Non-blocking offline fallback
    }
    return false;
  },

  purgeStaleMockTrades: () => {
    fetch("/api/paper-lab", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((data) => {
      if (data?.closedTrades) get().syncBackendTrades(data.closedTrades);
    }).catch(() => {});
  },
});
