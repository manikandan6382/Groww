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

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "index_tick" || data.symbol?.startsWith("NSE_INDEX")) {
              useLivePriceStore.getState().updateIndexTick(data.symbol, data.ltp, data.change || 0, data.changePct || 0);
            } else if (data.type === "tick" && data.tradeId) {
              useLivePriceStore.getState().updateTick(data.tradeId, data.ltp, data.change || 0);
            } else if (data.type === "bulk-ticks" && data.ticks) {
              useLivePriceStore.getState().setBulkTicks(data.ticks);
            }
          } catch { /* Malformed payload containment */ }
        };

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
