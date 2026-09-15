import { useState, useMemo, useRef, useEffect } from "react";
import { useTradingStore } from "../../../stores/useTradingStore";
import { soundEngine } from "../../../utils/soundEngine";
import { runMonteCarloSimulation } from "./monteCarloEngine";
import { calculateEquityMetrics } from "./equityMetricsCalculator";
import { buildEquityPaths } from "./equityPathBuilder";
import { filterActiveTrades } from "./filterActiveTrades";
import { computeReelPoints } from "./computeReelPoints";

const BASE_CAPITAL = 100000;
const PAGE_SIZE = 25;
const WIDTH = 1000;
const HEIGHT = 240;
const PADDING = { top: 20, right: 0, bottom: 0, left: 0 };

export function useEquityCurveData() {
  const { journalTrades, journalRange } = useTradingStore();
  const [selectedId, setSelectedId] = useState(null);
  const [scrubIndex, setScrubIndex] = useState(null);
  const [activeTab, setActiveTab] = useState("growth");
  const [accountingMode, setAccountingMode] = useState("NET");
  const [showGuide, setShowGuide] = useState(false);
  const [reelFilter, setReelFilter] = useState("all");
  const [reelSort, setReelSort] = useState("newest");
  const [reelPage, setReelPage] = useState(1);
  const lastAudioTickRef = useRef(0);
  const svgRef = useRef(null);

  const playScrubAudio = () => {
    const now = Date.now();
    if (now - lastAudioTickRef.current > 75) {
      soundEngine?.playTick?.();
      lastAudioTickRef.current = now;
    }
  };

  const activeTrades = useMemo(() => filterActiveTrades(journalTrades, journalRange), [journalTrades, journalRange]);
  const metrics = useMemo(() => calculateEquityMetrics(activeTrades, accountingMode, BASE_CAPITAL), [activeTrades, accountingMode]);

  const { displayReelPoints, totalReelMatches, totalPages, currentPage } = useMemo(
    () => computeReelPoints(metrics.equityPoints, reelFilter, reelSort, reelPage, PAGE_SIZE),
    [metrics.equityPoints, reelFilter, reelSort, reelPage]
  );

  useEffect(() => {
    setReelPage(1);
  }, [reelFilter, reelSort, journalRange]);

  const monteCarlo = useMemo(() => runMonteCarloSimulation(activeTrades, BASE_CAPITAL, 50, 1000), [activeTrades]);
  const allCapitals = metrics.equityPoints.map((p) => p.capital);
  const minTradeCap = Math.min(...allCapitals);
  const maxTradeCap = Math.max(...metrics.equityPoints.map((p) => p.hwm));
  const capSpread = Math.max(Math.abs(maxTradeCap - BASE_CAPITAL), Math.abs(minTradeCap - BASE_CAPITAL), 600);
  const minCap = Math.floor((BASE_CAPITAL - capSpread * 1.35) / 100) * 100;
  const maxCap = Math.ceil((BASE_CAPITAL + capSpread * 1.35) / 100) * 100;
  const maxDDPct = Math.max(...metrics.equityPoints.map((p) => p.drawdownPct), 2.0);

  const paths = useMemo(() => buildEquityPaths(metrics.equityPoints, WIDTH, HEIGHT, PADDING, minCap, maxCap, maxDDPct), [metrics.equityPoints, minCap, maxCap, maxDDPct]);

  const activePoint = useMemo(() => {
    if (scrubIndex !== null && metrics.equityPoints[scrubIndex]) return metrics.equityPoints[scrubIndex];
    if (selectedId !== null) return metrics.equityPoints.find((p) => p.id === selectedId) || null;
    return null;
  }, [scrubIndex, selectedId, metrics.equityPoints]);

  const activePointIndex = useMemo(() => {
    if (!activePoint) return null;
    const idx = metrics.equityPoints.findIndex((p) => p.id === activePoint.id);
    return idx >= 0 ? idx : null;
  }, [activePoint, metrics.equityPoints]);

  useEffect(() => {
    if (selectedId && !metrics.equityPoints.some((p) => p.id === selectedId)) {
      setSelectedId(null);
      setScrubIndex(null);
    }
  }, [metrics.equityPoints, selectedId]);

  const isTradeOnCurrentPage = useMemo(() => {
    if (!activePoint || activePoint.id === "genesis-origin") return true;
    return displayReelPoints.some((p) => p.id === activePoint.id);
  }, [displayReelPoints, activePoint]);

  const winTrades = activeTrades.filter((t) => (t.netPnl || t.realizedPnl || 0) > 0).length;
  const winRate = activeTrades.length > 0 ? ((winTrades / activeTrades.length) * 100).toFixed(0) : "0";
  const isProfitable = metrics.currentCapital >= BASE_CAPITAL;
  const displayCapital = activePoint ? activePoint.capital : metrics.currentCapital;
  const displayPnl = activePoint ? activePoint.pnl : (metrics.currentCapital - BASE_CAPITAL);
  const displayPct = activePoint
    ? (BASE_CAPITAL > 0 ? ((activePoint.pnl / BASE_CAPITAL) * 100).toFixed(2) : "0.00")
    : (BASE_CAPITAL > 0 ? (((metrics.currentCapital - BASE_CAPITAL) / BASE_CAPITAL) * 100).toFixed(2) : "0.00");
  const baselineY = paths.getY(BASE_CAPITAL);

  return {
    BASE_CAPITAL,
    WIDTH,
    HEIGHT,
    PADDING,
    activeTrades,
    selectedId,
    setSelectedId,
    scrubIndex,
    setScrubIndex,
    activeTab,
    setActiveTab,
    accountingMode,
    setAccountingMode,
    showGuide,
    setShowGuide,
    reelFilter,
    setReelFilter,
    reelSort,
    setReelSort,
    reelPage,
    setReelPage,
    playScrubAudio,
    svgRef,
    ...metrics,
    displayReelPoints,
    totalReelMatches,
    totalPages,
    currentPage,
    monteCarlo,
    maxDDPct,
    ...paths,
    activePoint,
    activePointIndex,
    isTradeOnCurrentPage,
    winRate,
    isProfitable,
    displayCapital,
    displayPnl,
    displayPct,
    baselineY
  };
}
