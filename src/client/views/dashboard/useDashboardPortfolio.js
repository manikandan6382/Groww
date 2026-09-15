import { useState, useEffect, useCallback } from "react";
import { extractAvailableMargin } from "../../components/trading/AssetAllocationDeck";
import { soundEngine } from "../../utils/soundEngine";
import { openBrokerAuthPopup } from "../../utils/brokerPopupAuth";

export function useDashboardPortfolio() {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(new Date());
  const [fetchError, setFetchError] = useState(null);

  const loadPortfolio = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const res = await fetch(`/api/portfolio${isManual ? "?refresh=true" : ""}`);
      if (res.ok) {
        const data = await res.json();
        setPortfolio(data);
        setFetchError(null);
        setLastRefreshedAt(new Date());
        if (isManual) soundEngine.playSuccessTone();
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn("Live portfolio sync notice:", err.message);
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

  // Exponential backoff / circuit breaker: Pause 15s polling if token is expired
  useEffect(() => {
    loadPortfolio();
    const interval = setInterval(() => {
      if (!portfolio?.isExpired) {
        loadPortfolio();
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [loadPortfolio, portfolio?.isExpired]);

  const isKiteOffline = Boolean(portfolio?.isKiteOffline);
  const isExpired = Boolean(portfolio?.isExpired);
  const userName = portfolio?.userName || null;
  const userId = portfolio?.userId || null;
  const brokerMessage = portfolio?.message || null;

  // Dynamic Container Hygiene: Render actual holdings, or empty array if offline/empty
  const holdings = Array.isArray(portfolio?.holdings) ? portfolio.holdings : [];
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
