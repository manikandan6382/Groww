import { useEffect, useState } from "react";
import { useTradingStore } from "../stores/useTradingStore";
import { soundEngine } from "../utils/soundEngine";
import { getViewFromUrl, syncUrlWithView } from "../utils/urlRouter";
import { checkTokenStatus } from "../hooks/feed/feedApiSync";

export function useAppBootstrap() {
  const setActiveView = useTradingStore((s) => s.setActiveView);
  const [brokerNotice, setBrokerNotice] = useState(null);

  // 🌐 Bi-directional URL synchronization & Browser Back/Forward navigation
  useEffect(() => {
    const initialView = getViewFromUrl();
    setActiveView(initialView, false);
    syncUrlWithView(initialView, true);

    const handlePopState = () => {
      const targetView = getViewFromUrl();
      setActiveView(targetView, false);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [setActiveView]);

  // 🎨 Synchronize Atmospheric Gradient Theme on Mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedTheme = localStorage.getItem("portfolio-theme") || "violet";
    document.documentElement.setAttribute("data-theme", savedTheme);
    document.documentElement.dataset.theme = savedTheme;
  }, []);

  // 💾 SQLite Full Trade Re-Hydration & Offline Outbox Flush on Boot & Reconnect
  useEffect(() => {
    if (typeof window === "undefined") return;
    useTradingStore.getState().hydrateFromSqlite?.();

    const handleOnline = () => {
      useTradingStore.getState().hydrateFromSqlite?.();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  // 🎯 Demat Account Connection Callback Toast & Audio Feedback
  useEffect(() => {
    if (typeof window === "undefined") return;
    const searchParams = new URLSearchParams(window.location.search);
    const connected = searchParams.get("connected");

    if (connected === "kite" || connected === "upstox") {
      const isKite = connected === "kite";
      const brokerName = isKite ? "Zerodha Kite" : "Upstox Pro";

      try {
        soundEngine.playTradeExecutedTone();
      } catch { /* ignore audio error */ }

      if (isKite) {
        useTradingStore.getState().setBrokerStatus({ kiteConnected: true, kiteExpired: false });
      } else {
        useTradingStore.getState().setBrokerStatus({ upstoxConnected: true, upstoxExpired: false });
      }

      setBrokerNotice({
        broker: brokerName,
        message: isKite
          ? "Zerodha Kite Demat connected! Live portfolio and positions synchronized."
          : "Upstox Pro connected! Live tick stream and option contracts active.",
      });

      searchParams.delete("connected");
      searchParams.delete("broker");
      const newQuery = searchParams.toString();
      const cleanUrl = window.location.pathname + (newQuery ? `?${newQuery}` : "") + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);

      const timer = setTimeout(() => {
        setBrokerNotice(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, []);

  // 🔗 Global Broker OAuth Connection Listener (Across All Tabs & Views)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBrokerConnected = (e) => {
      const broker = e.detail?.broker;
      const isKite = broker === "kite";
      const brokerName = isKite ? "Zerodha Kite" : "Upstox Pro";

      try {
        soundEngine?.playTradeExecutedTone?.();
      } catch { /* audio */ }

      checkTokenStatus(useTradingStore.getState().setBrokerStatus).catch(() => {});

      setBrokerNotice({
        broker: brokerName,
        message: isKite
          ? "Zerodha Kite Demat connected! Live portfolio and positions synchronized."
          : "Upstox Pro connected! Live tick stream and option contracts active.",
      });

      const timer = setTimeout(() => {
        setBrokerNotice(null);
      }, 6000);
      return () => clearTimeout(timer);
    };

    const handleGlobalMessage = (e) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "KITE_AUTH_SUCCESS" || e.data?.type === "UPSTOX_AUTH_SUCCESS" || e.data?.type === "BROKER_AUTH_SUCCESS") {
        checkTokenStatus(useTradingStore.getState().setBrokerStatus).catch(() => {});
      }
    };

    window.addEventListener("portfoliox:broker-connected", handleBrokerConnected);
    window.addEventListener("message", handleGlobalMessage);
    return () => {
      window.removeEventListener("portfoliox:broker-connected", handleBrokerConnected);
      window.removeEventListener("message", handleGlobalMessage);
    };
  }, []);

  return [brokerNotice, setBrokerNotice];
}
