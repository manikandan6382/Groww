export function initStoreSyncListeners(useTradingStore) {
  if (typeof window === "undefined") return;

  window.addEventListener("storage", (event) => {
    if (event.key === "portfoliox_open_alerts" && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        if (Array.isArray(parsed)) useTradingStore.setState({ openAlerts: parsed });
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
          const { action } = event.data || {};
          if (["SYNC_REQUEST", "TRADE_MUTATION", "TRADE_CLOSED", "TRADE_CREATED", "ORDER_DEPLOYED"].includes(action)) {
            fetch("/api/paper-lab")
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
