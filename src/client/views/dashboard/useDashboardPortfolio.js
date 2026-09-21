import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { extractAvailableMargin } from "../../components/trading/AssetAllocationDeck";
import { soundEngine } from "../../utils/soundEngine";
import { openBrokerAuthPopup } from "../../utils/brokerPopupAuth";
import { useTradingStore } from "../../stores/useTradingStore";

export function useDashboardPortfolio() {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(new Date());
  const [fetchError, setFetchError] = useState(null);

  const abortControllerRef = useRef(null);

  const loadPortfolio = useCallback(async (isManual = false) => {
    // Abort previous in-flight request if another refresh is triggered
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      if (isManual) setRefreshing(true);
      const res = await fetch(`/api/portfolio${isManual ? "?refresh=true" : ""}`, {
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        setPortfolio(data);
        setFetchError(null);
        setLastRefreshedAt(new Date());
        if (data) {
          useTradingStore.getState().setBrokerStatus({
            kiteConnected: Boolean(!data.isExpired && !data.isKiteOffline),
            kiteExpired: Boolean(data.isExpired),
            kiteUserName: data.userName || "",
            kiteUserId: data.userId || ""
          });
        }
        if (isManual) soundEngine.playSuccessTone();
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      if (err.name === "AbortError") {
        return; // Clean cancellation, do not trigger error states
      }
      setFetchError(err.message);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  // Window listener for popup OAuth completion
  useEffect(() => {
    function handleAuthMessage(e) {
      if (e.data?.type === "KITE_AUTH_SUCCESS" || e.data?.type === "UPSTOX_AUTH_SUCCESS") {
        loadPortfolio(true);
      }
    }
    window.addEventListener("message", handleAuthMessage);
    return () => window.removeEventListener("message", handleAuthMessage);
  }, [loadPortfolio]);

  // Tab-Visibility Aware Smart Polling & Circuit Breaker:
  // - Pauses when tab is hidden (zero background resource waste)
  // - Immediately resyncs when tab becomes visible
  // - Pauses if session token is expired
  useEffect(() => {
    loadPortfolio();

    const handleVisibilityChange = () => {
      if (!document.hidden && !portfolio?.isExpired) {
        loadPortfolio(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const interval = setInterval(() => {
      if (!document.hidden && !portfolio?.isExpired) {
        loadPortfolio(false);
      }
    }, 15000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadPortfolio, portfolio?.isExpired]);

  const isKiteOffline = Boolean(portfolio?.isKiteOffline);
  const isExpired = Boolean(portfolio?.isExpired);
  const userName = portfolio?.userName || null;
  const userId = portfolio?.userId || null;
  const brokerMessage = portfolio?.message || null;

  // Dynamic Container Hygiene: Render actual holdings, or empty array if offline/empty
  const holdings = Array.isArray(portfolio?.holdings) ? portfolio.holdings : [];

  // Live Intraday & F&O Positions Normalization
  const rawPositions = portfolio?.positions;
  const positions = useMemo(() => {
    if (Array.isArray(rawPositions?.net)) return rawPositions.net;
    if (Array.isArray(rawPositions)) return rawPositions;
    return [];
  }, [rawPositions]);

  const openPositions = useMemo(() => {
    return positions.filter((p) => Number(p.quantity || 0) !== 0);
  }, [positions]);

  const positionsTotalM2m = useMemo(() => {
    return positions.reduce((acc, p) => acc + Number(p.m2m || p.pnl || 0), 0);
  }, [positions]);

  const availableMargin = extractAvailableMargin(portfolio?.margins);
  const utilisedMargin = Number(portfolio?.margins?.utilised?.debits ?? portfolio?.margins?.utilised?.m2m_realised ?? 0);
  const netMargin = Number(portfolio?.margins?.net ?? (availableMargin + utilisedMargin));
  const margins = {
    net: netMargin,
    available: availableMargin,
    utilised: utilisedMargin
  };

  const calculatedCurrent = holdings.reduce((acc, h) => acc + (Number(h.quantity || 0) * Number(h.last_price || h.average_price || 0)), 0);
  const totalCurrentValue = Number.isFinite(calculatedCurrent) ? calculatedCurrent : 0;
  const calculatedInvested = holdings.reduce((acc, h) => acc + (Number(h.quantity || 0) * Number(h.average_price || 0)), 0);
  const totalInvested = Number.isFinite(calculatedInvested) ? calculatedInvested : 0;
  const totalPnl = totalCurrentValue - totalInvested;
  const totalPnlPct = totalInvested > 0 ? ((totalPnl / totalInvested) * 100).toFixed(2) : "0.00";

  const dayPnl = holdings.reduce((acc, h) => acc + (Number(h.day_change || 0) * Number(h.quantity || 1)), 0);
  const dayPnlPct = totalInvested > 0 ? ((dayPnl / totalInvested) * 100).toFixed(2) : "0.00";

  const isMarketOpen = (() => {
    const ist = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const day = ist.getDay();
    if (day === 0 || day === 6) return false;
    const mins = ist.getHours() * 60 + ist.getMinutes();
    return mins >= 9 * 60 + 15 && mins <= 15 * 60 + 30;
  })();

  const handleConnectKite = useCallback(() => {
    openBrokerAuthPopup("kite", () => loadPortfolio(true));
  }, [loadPortfolio]);

  const handleConnectUpstox = useCallback(() => {
    openBrokerAuthPopup("upstox", () => loadPortfolio(true));
  }, [loadPortfolio]);

  return {
    portfolio,
    loading,
    refreshing,
    lastRefreshedAt,
    fetchError,
    loadPortfolio,
    holdings,
    positions,
    openPositions,
    openPositionsCount: openPositions.length,
    positionsTotalM2m,
    margins,
    totalCurrentValue,
    totalInvested,
    totalPnl,
    totalPnlPct,
    dayPnl,
    dayPnlPct,
    isMarketOpen,
    isKiteOffline,
    isExpired,
    userName,
    userId,
    brokerMessage,
    handleConnectKite,
    handleConnectUpstox
  };
}
