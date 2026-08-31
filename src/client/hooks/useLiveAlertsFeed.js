import { useEffect, useRef } from "react";
import { useLivePriceStore } from "../stores/useLivePriceStore";
import { useTradingStore } from "../stores/useTradingStore";

export function useLiveAlertsFeed() {
  const reconnectTimeoutRef = useRef(null);
  const backoffRef = useRef(1000);
  const { setBrokerStatus } = useTradingStore();

  useEffect(() => {
    let eventSource = null;
    let isMounted = true;

    // Check token status periodically
    async function checkTokenStatus() {
      try {
        const res = await fetch("/api/upstox/token-status");
        if (res.ok) {
          const data = await res.json();
          setBrokerStatus({
            upstoxConnected: data.websocketConnected || data.polling,
            upstoxPreMarketReady: data.isPreMarketReady,
            upstoxTokenAgeMinutes: data.sessionAgeMinutes,
          });
        }
      } catch { /* ignore offline */ }
    }

    checkTokenStatus();
    const tokenInterval = setInterval(checkTokenStatus, 15000);

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
              useLivePriceStore.getState().updateIndexTick(payload.symbol, ltp, payload.change || 0, payload.changePct || 0);
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
        eventSource.addEventListener("trade_mutation", (event) => handleEventData(event.data));
        eventSource.addEventListener("status", (event) => handleEventData(event.data));
        eventSource.addEventListener("stop_loss_hit", (event) => {
          handleEventData(event.data);
          try {
            const data = JSON.parse(event.data);
            const tradeId = data.payload?.tradeId || data.tradeId;
            const ltp = Number(data.payload?.ltp || data.ltp || 0);
            if (tradeId) useTradingStore.getState().squareOffTrade(tradeId, ltp);
          } catch {}
        });
        eventSource.addEventListener("target_hit", (event) => {
          handleEventData(event.data);
          try {
            const data = JSON.parse(event.data);
            const tradeId = data.payload?.tradeId || data.tradeId;
            const ltp = Number(data.payload?.ltp || data.ltp || 0);
            if (tradeId) useTradingStore.getState().squareOffTrade(tradeId, ltp);
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
      clearInterval(tokenInterval);
      if (eventSource) eventSource.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [setBrokerStatus]);
}
