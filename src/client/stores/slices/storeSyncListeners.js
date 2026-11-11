import { 
  deletedTradeIdSet, 
  isTradeTombstoned, 
  recordTradeTombstone, 
  debounceNetworkSync, 
  isDeploySyncLocked, 
  debounceOpenAlertsStorage 
} from "./tradePersistence";

export function initStoreSyncListeners(useTradingStore) {
  if (typeof window === "undefined") return;

  window.addEventListener("storage", (event) => {
    if (event.key === "portfoliox_open_alerts" && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        if (Array.isArray(parsed)) {
          const state = useTradingStore.getState();
          const closedIdSet = new Set();
          for (const c of [...(state.masterTrades || []), ...(state.closedAlerts || [])]) {
            if (c.id != null) closedIdSet.add(String(c.id));
            if (c.serverId != null) closedIdSet.add(String(c.serverId));
          }
          const sanitized = parsed.filter((t) => {
            const sId = String(t.id);
            const serverId = t.serverId != null ? String(t.serverId) : null;
            if (deletedTradeIdSet.has(sId) || (serverId && deletedTradeIdSet.has(serverId))) return false;
            if (closedIdSet.has(sId) || (serverId && closedIdSet.has(serverId))) return false;
            if (isTradeTombstoned(sId) || (serverId && isTradeTombstoned(serverId))) return false;
            return true;
          });
          useTradingStore.setState({ openAlerts: sanitized });
          if (sanitized.length !== parsed.length) {
            debounceOpenAlertsStorage(sanitized);
          }
        }
      } catch {}
    }
    if ((event.key === "portfolio-master-trades" || event.key === "portfolio-journal-trades") && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        if (Array.isArray(parsed)) useTradingStore.setState({ masterTrades: parsed, closedAlerts: parsed, journalTrades: parsed });
      } catch {}
    }
    if (event.key === "portfolio_starting_capital" && event.newValue) {
      const val = Number(event.newValue);
      if (!isNaN(val) && val > 0) useTradingStore.setState({ startingCapital: val });
    }
  });

  if (typeof window.BroadcastChannel !== "undefined") {
    try {
      const channel = new window.BroadcastChannel("portfoliox_trades_channel");
      channel.onmessage = (event) => {
        try {
          const { action, payload } = event.data || {};
          if (action === "TRADE_CLOSED") {
            const { id, localId, serverId } = payload || {};
            if (id) recordTradeTombstone(id);
            if (localId) recordTradeTombstone(localId);
            if (serverId) recordTradeTombstone(serverId);
            const currentOpen = useTradingStore.getState().openAlerts || [];
            const pruned = currentOpen.filter((t) => {
              const tid = String(t.id);
              const tsid = t.serverId != null ? String(t.serverId) : null;
              if (id && (tid === String(id) || tsid === String(id))) return false;
              if (localId && (tid === String(localId) || tsid === String(localId))) return false;
              if (serverId && (tid === String(serverId) || tsid === String(serverId))) return false;
              return true;
            });
            if (pruned.length !== currentOpen.length) {
              useTradingStore.setState({ openAlerts: pruned });
              debounceOpenAlertsStorage(pruned);
            }
          }

          if (["SYNC_REQUEST", "TRADE_MUTATION", "TRADE_CLOSED", "TRADE_CREATED", "ORDER_DEPLOYED"].includes(action)) {
            // Deploy Pipeline Isolation Barrier:
            // Throttle synchronous cascade during active order creation to protect the 60fps main thread
            if (action === "TRADE_CREATED" || isDeploySyncLocked()) {
              debounceNetworkSync("POST_DEPLOY_CONSOLIDATED_SYNC", () => {
                useTradingStore.getState().hydrateFromSqlite?.();
                fetch("/api/paper-lab", { cache: "no-store" })
                  .then((r) => (r.ok ? r.json() : null))
                  .then((data) => {
                    if (data?.closedTrades) useTradingStore.getState().syncBackendTrades(data.closedTrades);
                    if (data?.openTrades) useTradingStore.getState().syncBackendOpenTrades(data.openTrades);
                  })
                  .catch(() => {});
              }, 1200);
              return;
            }

            useTradingStore.getState().hydrateFromSqlite?.();
            fetch("/api/paper-lab", { cache: "no-store" })
              .then((r) => (r.ok ? r.json() : null))
              .then((data) => {
                if (data?.closedTrades) useTradingStore.getState().syncBackendTrades(data.closedTrades);
                if (data?.openTrades) useTradingStore.getState().syncBackendOpenTrades(data.openTrades);
              })
              .catch(() => {});
          }
        } catch {}
      };
    } catch {}
  }
}
