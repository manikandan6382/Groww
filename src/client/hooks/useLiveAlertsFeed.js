import { useEffect, useRef } from "react";
import { useLivePriceStore } from "../stores/useLivePriceStore";
import { useTradingStore } from "../stores/useTradingStore";
import { isIndianMarketOpenHours } from "../utils/dateUtils";

export function useLiveAlertsFeed() {
  const reconnectTimeoutRef = useRef(null);
  const backoffRef = useRef(1000);
  const setBrokerStatus = useTradingStore((s) => s.setBrokerStatus);

  useEffect(() => {
    let eventSource = null;
    let isMounted = true;
    let isTabVisible = typeof document !== "undefined" ? !document.hidden : true;

    let lastTokenTime = Date.now();
    let lastIndicesTime = Date.now();
    let lastOptionsTime = Date.now();
    let lastReconcileTime = Date.now();
    let lastSyncTradesTime = Date.now();

    // Check token status periodically (Upstox & Zerodha Kite)
    async function checkTokenStatus() {
      try {
        const [upstoxRes, brokerRes] = await Promise.allSettled([
          fetch("/api/upstox/token-status").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/broker/status").then((r) => (r.ok ? r.json() : null)),
        ]);

        const upstoxData = upstoxRes.status === "fulfilled" ? upstoxRes.value : null;
        const brokerData = brokerRes.status === "fulfilled" ? brokerRes.value : null;

        const nextStatus = {};
        if (upstoxData) {
          nextStatus.upstoxConnected = Boolean(upstoxData.websocketConnected || upstoxData.polling || upstoxData.hasToken);
          nextStatus.upstoxPreMarketReady = Boolean(upstoxData.isPreMarketReady);
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
    async function fetchLiveIndices() {
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
    async function fetchLiveOptionQuotes() {
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
    async function reconcileServerTrades() {
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
                    syncClosedTrades();
                  }
                })
                .catch(() => {});
            }
          }
        }
      } catch {}
    }

    // Hydrate closed ledger trades directly from SQLite database
    async function syncClosedTrades() {
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

    // Initial immediate hydration
    checkTokenStatus();
    fetchLiveIndices();
    fetchLiveOptionQuotes();
    syncClosedTrades();

    // ⚡ Adaptive Heartbeat Polling Engine
    const loopInterval = setInterval(() => {
      if (!isMounted) return;
      const now = Date.now();
      const isMarketOpen = isIndianMarketOpenHours();

      // 1. Broker / Upstox Token Heartbeat (15s when visible, 60s when tab hidden)
      const tokenIntervalMs = isTabVisible ? 15000 : 60000;
      if (now - lastTokenTime >= tokenIntervalMs) {
        lastTokenTime = now;
        checkTokenStatus();
      }

      // 2. Index Quotes (3s during market hours, 15s off-market, 45s when hidden)
      const indicesIntervalMs = !isTabVisible ? 45000 : (isMarketOpen ? 3000 : 15000);
      if (now - lastIndicesTime >= indicesIntervalMs) {
        lastIndicesTime = now;
        fetchLiveIndices();
      }

      // 3. Option Quotes (2.5s during market hours, 15s off-market, paused when hidden)
      if (isTabVisible) {
        const optionsIntervalMs = isMarketOpen ? 2500 : 15000;
        if (now - lastOptionsTime >= optionsIntervalMs) {
          lastOptionsTime = now;
          fetchLiveOptionQuotes();
        }
      }

      // 4. Server Active Trade Reconciler (10s when visible, 30s when hidden)
      const reconcileIntervalMs = isTabVisible ? 10000 : 30000;
      if (now - lastReconcileTime >= reconcileIntervalMs) {
        lastReconcileTime = now;
        reconcileServerTrades();
      }

      // 5. Closed Ledger Sync (5s when visible, 30s when hidden)
      const syncIntervalMs = isTabVisible ? 5000 : 30000;
      if (now - lastSyncTradesTime >= syncIntervalMs) {
        lastSyncTradesTime = now;
        syncClosedTrades();
      }
    }, 1000);

    // ⚡ Tab Visibility Listener: Instantly refresh live telemetry when user returns to tab
    const handleVisibilityChange = () => {
      if (typeof document === "undefined") return;
      isTabVisible = !document.hidden;
      if (isTabVisible && isMounted) {
        const now = Date.now();
        lastTokenTime = now;
        lastIndicesTime = now;
        lastOptionsTime = now;
        lastReconcileTime = now;
        checkTokenStatus();
        fetchLiveIndices();
        fetchLiveOptionQuotes();
        reconcileServerTrades();
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    // ⚡ Reactive Order Pad Contract Switcher: Immediately fetch quotes whenever activePadSymbol or activeHedgeSymbol changes
    let prevActivePadSymbol = useTradingStore.getState().activePadSymbol;
    let prevActiveHedgeSymbol = useTradingStore.getState().activeHedgeSymbol;
    const unsubPadSymbol = useTradingStore.subscribe((state) => {
      if (
        (state.activePadSymbol && state.activePadSymbol !== prevActivePadSymbol) ||
        (state.activeHedgeSymbol && state.activeHedgeSymbol !== prevActiveHedgeSymbol)
      ) {
        prevActivePadSymbol = state.activePadSymbol;
        prevActiveHedgeSymbol = state.activeHedgeSymbol;
        fetchLiveOptionQuotes();
      }
    });

    function connect() {
      if (!isMounted) return;
      try {
        eventSource = new EventSource("/api/live-alerts/live-events");

        eventSource.onopen = () => {
          backoffRef.current = 1000;
          setBrokerStatus({ upstoxConnected: true });
        };

        const handleEventData = (rawData) => {
          try {
            const data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
            const payload = data.payload || data;
            const ltp = Number(payload.ltp || payload.price || 0);

            if (payload.type === "index_tick" || payload.symbol?.startsWith("NSE_INDEX") || payload.symbol?.startsWith("BSE_INDEX")) {
              useLivePriceStore.getState().updateIndexTick(
                payload.symbol, 
                ltp, 
                payload.change || 0, 
                payload.changePct || 0,
                payload
              );
            } else if (ltp > 0) {
              const updates = [];
              if (payload.tradeId) updates.push({ id: payload.tradeId, ltp, change: payload.change || 0 });
              if (payload.symbol) updates.push({ id: payload.symbol, ltp, change: payload.change || 0 });
              if (payload.tokenKey) updates.push({ id: payload.tokenKey, ltp, change: payload.change || 0 });
              if (updates.length > 0) {
                useLivePriceStore.getState().updateMultiTicks(updates);
              }
            }

            if (payload.type === "bulk-ticks" && payload.ticks) {
              useLivePriceStore.getState().setBulkTicks(payload.ticks);
            }
          } catch { /* Malformed payload containment */ }
        };

        eventSource.onmessage = (event) => handleEventData(event.data);
        eventSource.addEventListener("tick", (event) => handleEventData(event.data));
        eventSource.addEventListener("index_tick", (event) => handleEventData(event.data));
        eventSource.addEventListener("trade_mutation", (event) => {
          handleEventData(event.data);
          syncClosedTrades();
        });
        eventSource.addEventListener("status", (event) => handleEventData(event.data));
        eventSource.addEventListener("stop_loss_hit", (event) => {
          handleEventData(event.data);
          try {
            const data = JSON.parse(event.data);
            const tradeId = data.payload?.tradeId || data.tradeId;
            const ltp = Number(data.payload?.ltp || data.ltp || 0);
            if (tradeId) useTradingStore.getState().squareOffTrade(tradeId, ltp, "STOP_LOSS_HIT");
            syncClosedTrades();
          } catch {}
        });
        eventSource.addEventListener("target_hit", (event) => {
          handleEventData(event.data);
          try {
            const data = JSON.parse(event.data);
            const tradeId = data.payload?.tradeId || data.tradeId;
            const ltp = Number(data.payload?.ltp || data.ltp || 0);
            if (tradeId) useTradingStore.getState().squareOffTrade(tradeId, ltp, "TARGET_HIT");
            syncClosedTrades();
          } catch {}
        });

        eventSource.onerror = () => {
          if (eventSource) eventSource.close();
          if (!isMounted) return;
          setBrokerStatus({ upstoxConnected: false });

          // Jittered Exponential Backoff (1s -> 2s -> 4s -> max 30s)
          const jitter = Math.random() * 500;
          const delay = Math.min(30000, backoffRef.current * 2) + jitter;
          backoffRef.current = delay;

          reconnectTimeoutRef.current = setTimeout(connect, delay);
        };
      } catch {
        reconnectTimeoutRef.current = setTimeout(connect, 5000);
      }
    }

    connect();

    return () => {
      isMounted = false;
      unsubPadSymbol?.();
      clearInterval(loopInterval);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
      if (eventSource) eventSource.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [setBrokerStatus]);
}
