import { useLivePriceStore } from "../../stores/useLivePriceStore";
import { useTradingStore } from "../../stores/useTradingStore";

// Check token status periodically (Upstox & Zerodha Kite)
export async function checkTokenStatus(setBrokerStatus) {
  try {
    const [upstoxRes, brokerRes] = await Promise.allSettled([
      fetch("/api/upstox/token-status").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/broker/status").then((r) => (r.ok ? r.json() : null)),
    ]);

    const upstoxData = upstoxRes.status === "fulfilled" ? upstoxRes.value : null;
    const brokerData = brokerRes.status === "fulfilled" ? brokerRes.value : null;

    const nextStatus = {};
    if (upstoxData) {
      const isExpired = Boolean(upstoxData.isExpired);
      nextStatus.upstoxExpired = isExpired;
      nextStatus.upstoxConnected = Boolean(!isExpired && (upstoxData.websocketConnected || upstoxData.polling || upstoxData.hasToken));
      nextStatus.upstoxPreMarketReady = Boolean(!isExpired && upstoxData.isPreMarketReady);
      nextStatus.upstoxTokenAgeMinutes = upstoxData.sessionAgeMinutes;
    }
    if (brokerData?.kite) {
      nextStatus.kiteConnected = Boolean(brokerData.kite.connected);
      nextStatus.kiteUserName = brokerData.kite.userName || "";
      nextStatus.kiteUserId = brokerData.kite.userId || "";
      nextStatus.kiteTokenAgeMinutes = brokerData.kite.sessionAgeMinutes;
    }
    if (Object.keys(nextStatus).length > 0) {
      setBrokerStatus(nextStatus);
    }
  } catch { /* ignore offline */ }
}

// Fetch live market indices from Upstox REST API periodically
export async function fetchLiveIndices() {
  try {
    const res = await fetch("/api/market/indices");
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.indices) {
        useLivePriceStore.getState().setAllIndices(data.indices);
      }
    }
  } catch { /* ignore offline */ }
}

// Fetch live option quotes from Upstox REST API for active practice positions & live Order Pad contract
export async function fetchLiveOptionQuotes() {
  try {
    const openAlerts = useTradingStore.getState().openAlerts || [];
    const activePadSymbol = useTradingStore.getState().activePadSymbol;
    const activeHedgeSymbol = useTradingStore.getState().activeHedgeSymbol;
    const symbols = Array.from(new Set([
      ...openAlerts.map((t) => t.symbol || t.tradingsymbol),
      activePadSymbol,
      activeHedgeSymbol
    ].filter(Boolean)));
    if (!symbols.length) return;

    const res = await fetch("/api/market/option-quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.quotes) {
        const updates = [];
        for (const [key, quote] of Object.entries(data.quotes)) {
          if (quote.ltp > 0) {
            updates.push({ id: key, ltp: quote.ltp, change: quote.change || 0 });
            if (quote.tokenKey) {
              updates.push({ id: quote.tokenKey, ltp: quote.ltp, change: quote.change || 0 });
            }
          }
        }
        for (const trade of openAlerts) {
          const symQuote = data.quotes[trade.symbol] || (trade.tokenKey && data.quotes[trade.tokenKey]);
          if (symQuote?.ltp > 0) {
            updates.push({ id: trade.id, ltp: symQuote.ltp, change: symQuote.change || 0 });
            if (trade.serverId) {
              updates.push({ id: trade.serverId, ltp: symQuote.ltp, change: symQuote.change || 0 });
            }
          }
        }
        if (updates.length > 0) {
          useLivePriceStore.getState().updateMultiTicks(updates);
        }
      }
    }
  } catch { /* ignore offline */ }
}

// Reconcile open alerts with server status to prevent orphaned cards
export async function reconcileServerTrades(onSyncClosed) {
  try {
    const res = await fetch("/api/paper-lab/live-status");
    if (res.ok) {
      const status = await res.json();
      const serverActiveIds = new Set((status.activeTrades || []).map((t) => Number(t.id)));
      const openAlerts = useTradingStore.getState().openAlerts || [];
      for (const trade of openAlerts) {
        if (trade.serverId && !serverActiveIds.has(Number(trade.serverId))) {
          const currentLtp = useLivePriceStore.getState().ticks?.[trade.symbol]?.ltp || trade.entryPrice;
          fetch(`/api/paper-lab/trades/${trade.serverId}`)
            .then((r) => r.json())
            .then((detail) => {
              if (detail?.trade && detail.trade.status !== "OPEN") {
                useTradingStore.getState().squareOffTrade(trade.id, detail.trade.exitPrice || currentLtp, detail.trade.closeReason);
                onSyncClosed?.();
              }
            })
            .catch(() => {});
        }
      }
    }
  } catch {}
}

// Hydrate closed ledger trades directly from SQLite database
export async function syncClosedTrades() {
  try {
    const res = await fetch("/api/paper-lab");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.closedTrades) && data.closedTrades.length > 0) {
        useTradingStore.getState().syncBackendTrades(data.closedTrades);
      }
      if (Array.isArray(data.openTrades)) {
        useTradingStore.getState().syncBackendOpenTrades(data.openTrades);
      }
    }
  } catch {}
}
