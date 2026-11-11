import { useLivePriceStore } from "../../stores/useLivePriceStore";
import { useTradingStore } from "../../stores/useTradingStore";
import { isDeploySyncLocked, debounceNetworkSync } from "../../stores/slices/tradePersistence";

export function connectSseFeed({
  onStatusChange,
  onSyncClosed,
  backoffRef,
  reconnectTimeoutRef,
  getIsMounted
}) {
  if (!getIsMounted()) return null;

  try {
    const eventSource = new EventSource("/api/live-alerts/live-events");

    eventSource.onopen = () => {
      backoffRef.current = 1000;
      onStatusChange({ upstoxConnected: true });
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
      if (isDeploySyncLocked()) {
        debounceNetworkSync("POST_DEPLOY_SSE_MUTATION_SYNC", () => {
          useTradingStore.getState().hydrateFromSqlite?.();
          onSyncClosed();
        }, 1200);
      } else {
        debounceNetworkSync("SSE_MUTATION_SYNC", () => {
          useTradingStore.getState().hydrateFromSqlite?.();
          onSyncClosed();
        }, 300);
      }
    });
    eventSource.addEventListener("status", (event) => handleEventData(event.data));
    eventSource.addEventListener("stop_loss_hit", (event) => {
      handleEventData(event.data);
      try {
        const data = JSON.parse(event.data);
        const tradeId = data.payload?.tradeId || data.tradeId;
        const ltp = Number(data.payload?.ltp || data.ltp || 0);
        if (tradeId) useTradingStore.getState().squareOffTrade(tradeId, ltp, "STOP_LOSS_HIT");
        useTradingStore.getState().hydrateFromSqlite?.();
        onSyncClosed();
      } catch {}
    });
    eventSource.addEventListener("target_hit", (event) => {
      handleEventData(event.data);
      try {
        const data = JSON.parse(event.data);
        const tradeId = data.payload?.tradeId || data.tradeId;
        const ltp = Number(data.payload?.ltp || data.ltp || 0);
        if (tradeId) useTradingStore.getState().squareOffTrade(tradeId, ltp, "TARGET_HIT");
        useTradingStore.getState().hydrateFromSqlite?.();
        onSyncClosed();
      } catch {}
    });
    eventSource.addEventListener("breakeven_locked", (event) => {
      handleEventData(event.data);
      try {
        const data = JSON.parse(event.data);
        const payload = data.payload || data;
        const tradeId = Number(payload.tradeId);
        const newSl = Number(payload.stopLoss || payload.newStopLoss || 0);
        if (tradeId && newSl > 0) {
          useTradingStore.getState().trailStopLoss?.(tradeId, newSl);
        }
        useTradingStore.getState().hydrateFromSqlite?.();
      } catch {}
    });
    eventSource.addEventListener("stop_loss_updated", (event) => {
      handleEventData(event.data);
      try {
        const data = JSON.parse(event.data);
        const payload = data.payload || data;
        const tradeId = Number(payload.tradeId);
        const newSl = Number(payload.stopLoss || 0);
        if (tradeId && newSl > 0) {
          useTradingStore.getState().trailStopLoss?.(tradeId, newSl);
        }
        useTradingStore.getState().hydrateFromSqlite?.();
      } catch {}
    });

    eventSource.addEventListener("copilot_signal", (event) => {
      try {
        const raw = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        const signal = raw?.payload || raw;
        if (signal?.cleared) {
          useTradingStore.getState().clearCopilotSignal();
        } else if (signal && (signal.symbol || signal.underlying)) {
          useTradingStore.getState().setCopilotSignal(signal);
        }
      } catch {}
    });

    eventSource.onerror = () => {
      if (eventSource) eventSource.close();
      if (!getIsMounted()) return;
      onStatusChange({ upstoxConnected: false });

      // Fast Local Reconnection (1s -> max 3s) to prevent persistent offline buffering
      const jitter = Math.random() * 200;
      const delay = Math.min(3000, (backoffRef.current || 1000) * 1.5) + jitter;
      backoffRef.current = delay;

      reconnectTimeoutRef.current = setTimeout(() => {
        connectSseFeed({
          onStatusChange,
          onSyncClosed,
          backoffRef,
          reconnectTimeoutRef,
          getIsMounted
        });
      }, delay);
    };

    return eventSource;
  } catch {
    reconnectTimeoutRef.current = setTimeout(() => {
      connectSseFeed({
        onStatusChange,
        onSyncClosed,
        backoffRef,
        reconnectTimeoutRef,
        getIsMounted
      });
    }, 5000);
    return null;
  }
}
