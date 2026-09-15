import { useEffect, useRef } from "react";
import { useTradingStore } from "../../stores/useTradingStore";
import { isIndianMarketOpenHours } from "../../utils/dateUtils";
import { 
  checkTokenStatus, 
  fetchLiveIndices, 
  fetchLiveOptionQuotes, 
  reconcileServerTrades, 
  syncClosedTrades 
} from "./feedApiSync";
import { connectSseFeed } from "./feedSseClient";

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

    // Initial immediate hydration
    checkTokenStatus(setBrokerStatus);
    fetchLiveIndices();
    fetchLiveOptionQuotes();
    syncClosedTrades();

    // ⚡ Adaptive Heartbeat Polling Engine
    const loopInterval = setInterval(() => {
      if (!isMounted) return;
      const now = Date.now();
      const isMarketOpen = isIndianMarketOpenHours();

      // 1. Broker / Upstox Token Heartbeat (15s visible, 60s hidden)
      const tokenIntervalMs = isTabVisible ? 15000 : 60000;
      if (now - lastTokenTime >= tokenIntervalMs) {
        lastTokenTime = now;
        checkTokenStatus(setBrokerStatus);
      }

      // 2. Index Quotes (3s open, 15s closed, 45s hidden)
      const indicesIntervalMs = !isTabVisible ? 45000 : (isMarketOpen ? 3000 : 15000);
      if (now - lastIndicesTime >= indicesIntervalMs) {
        lastIndicesTime = now;
        fetchLiveIndices();
      }

      // 3. Option Quotes (2.5s open, 15s closed, paused hidden)
      if (isTabVisible) {
        const optionsIntervalMs = isMarketOpen ? 2500 : 15000;
        if (now - lastOptionsTime >= optionsIntervalMs) {
          lastOptionsTime = now;
          fetchLiveOptionQuotes();
        }
      }

      // 4. Server Active Trade Reconciler (10s visible, 30s hidden)
      const reconcileIntervalMs = isTabVisible ? 10000 : 30000;
      if (now - lastReconcileTime >= reconcileIntervalMs) {
        lastReconcileTime = now;
        reconcileServerTrades(syncClosedTrades);
      }

      // 5. Closed Ledger Sync (5s visible, 30s hidden)
      const syncIntervalMs = isTabVisible ? 5000 : 30000;
      if (now - lastSyncTradesTime >= syncIntervalMs) {
        lastSyncTradesTime = now;
        syncClosedTrades();
      }
    }, 1000);

    // ⚡ Tab Visibility Listener
    const handleVisibilityChange = () => {
      if (typeof document === "undefined") return;
      isTabVisible = !document.hidden;
      if (isTabVisible && isMounted) {
        const now = Date.now();
        lastTokenTime = now;
        lastIndicesTime = now;
        lastOptionsTime = now;
        lastReconcileTime = now;
        checkTokenStatus(setBrokerStatus);
        fetchLiveIndices();
        fetchLiveOptionQuotes();
        reconcileServerTrades(syncClosedTrades);
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    // ⚡ Reactive Order Pad Contract Switcher
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

    eventSource = connectSseFeed({
      onStatusChange: setBrokerStatus,
      onSyncClosed: syncClosedTrades,
      backoffRef,
      reconnectTimeoutRef,
      getIsMounted: () => isMounted
    });

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

export default useLiveAlertsFeed;
