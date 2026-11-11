import { useState, useEffect, useMemo } from "react";
import { useTradingStore } from "../../stores/useTradingStore";
import { soundEngine } from "../../utils/soundEngine";

const DEFAULT_TELEMETRY = {
  timeframe: "today",
  startingCapital: 100000,
  currentAccountValue: 100000,
  totalRealizedPnl: 0,
  totalOpenPnl: 0,
  netPnl: 0,
  pnlPct: "0.00",
  winCount: 0,
  lossCount: 0,
  totalClosed: 0,
  winRateNum: 0,
  winRate: "0.0",
  openCount: 0
};

export function useLiveAlertsViewData() {
  const openAlerts = useTradingStore((s) => s.openAlerts);
  const closedAlerts = useTradingStore((s) => s.closedAlerts);
  const squareOffTrade = useTradingStore((s) => s.squareOffTrade);
  const squareOffAll = useTradingStore((s) => s.squareOffAll);
  const autoDeployCopilotTrade = useTradingStore((s) => s.autoDeployCopilotTrade);
  const deployToast = useTradingStore((s) => s.deployToast);
  const setDeployToast = useTradingStore((s) => s.setDeployToast);
  const settlementToast = useTradingStore((s) => s.settlementToast);
  const setSettlementToast = useTradingStore((s) => s.setSettlementToast);
  const getPortfolioTelemetry = useTradingStore((s) => s.getPortfolioTelemetry);

  const [showSquareOffModal, setShowSquareOffModal] = useState(false);
  const [activeTradesViewMode, setActiveTradesViewMode] = useState("deck");
  const [scorecardTimeframe, setScorecardTimeframe] = useState("today");
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const [workspaceFocus, setWorkspaceFocus] = useState(() => {
    try {
      return localStorage.getItem("portfoliox_workspace_focus") || "all";
    } catch {
      return "all";
    }
  });

  const handleSetWorkspaceFocus = (focus) => {
    soundEngine.playTabSwitchTone();
    setWorkspaceFocus(focus);
    try {
      localStorage.setItem("portfoliox_workspace_focus", focus);
    } catch {}
  };

  const handleSquareOffWithToast = (id, exitPrice) => {
    squareOffTrade(id, exitPrice);
  };

  const handleConfirmSquareOff = () => {
    soundEngine.playStopLossTone();
    squareOffAll();
    setShowSquareOffModal(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolledDown(window.scrollY > 450);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!deployToast) return;
    const timer = setTimeout(() => {
      setDeployToast(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [deployToast, setDeployToast]);

  useEffect(() => {
    if (!settlementToast) return;
    const timer = setTimeout(() => {
      setSettlementToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [settlementToast, setSettlementToast]);


  const telemetry = useMemo(() => {
    return getPortfolioTelemetry
      ? getPortfolioTelemetry(scorecardTimeframe)
      : { ...DEFAULT_TELEMETRY, timeframe: scorecardTimeframe };
  }, [getPortfolioTelemetry, scorecardTimeframe, openAlerts, closedAlerts]);

  return {
    openAlerts,
    closedAlerts,
    deployToast,
    setDeployToast,
    settlementToast,
    setSettlementToast,
    autoDeployCopilotTrade,
    showSquareOffModal,
    setShowSquareOffModal,
    activeTradesViewMode,
    setActiveTradesViewMode,
    scorecardTimeframe,
    setScorecardTimeframe,
    isScrolledDown,
    workspaceFocus,
    handleSetWorkspaceFocus,
    handleSquareOffWithToast,
    handleConfirmSquareOff,
    telemetry
  };
}
