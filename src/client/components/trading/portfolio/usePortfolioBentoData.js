import { useState, useMemo, useRef, useEffect } from "react";
import { useTradingStore } from "../../../stores/useTradingStore";
import { useLivePriceStore } from "../../../stores/useLivePriceStore";
import { soundEngine } from "../../../utils/soundEngine";
import { extractAvailableMargin } from "../AssetAllocationDeck";
import { 
  USD_INR_RATE, 
  FX_RATES, 
  generateNavData, 
  generateSmoothSpline, 
  generateBenchmarkData, 
  calculateHighWaterMark, 
  generateAlphaAreaPath, 
  calculateInstitutionalRiskMetrics 
} from "./portfolioNavEngine";
import { calculateTimeframeMetrics } from "./portfolioTimeframeMetrics";
import { calculateXirr, formatXirrPercent, buildCashFlowsFromHoldings } from "./portfolioXirrEngine";

function formatPriceLevel(v) {
  if (!v || v <= 0) return "₹0";
  if (v >= 100000) {
    const l = (v / 100000).toFixed(1);
    return `₹${l.endsWith(".0") ? l.slice(0, -2) : l}L`;
  }
  return `₹${Math.round(v / 1000)}K`;
}

export function usePortfolioBentoData({
  holdings = [],
  margins = { available: 0, net: 0 },
  totalCurrentValue = 0,
  totalInvested = 0,
  totalPnl = 0,
  totalPnlPct = "0.00",
  dayPnl = 0,
  dayPnlPct = "0.00",
}) {
  const { setWealthTimeframe } = useTradingStore();
  const nifty50 = useLivePriceStore((s) => s.indices?.["NSE_INDEX|Nifty 50"]);

  const [activeTf, setActiveTf] = useState("all");
  const [isCalendarOpen, setCalendarOpen] = useState(false);
  const [customDays, setCustomDays] = useState(30);
  const [customStart, setCustomStart] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [customEnd, setCustomEnd] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [hoverIndex, setHoverIndex] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [depository, setDepository] = useState("integrated");
  const [isStatementModalOpen, setStatementModalOpen] = useState(false);
  const [showBenchmark, setShowBenchmark] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const lastAudioTickRef = useRef(0);

  const toggleBenchmark = () => {
    setShowBenchmark((prev) => !prev);
    soundEngine?.playTabSwitchTone?.();
  };

  const safeAvailableMargin = extractAvailableMargin(margins);
  const safeCurrentVal = Number.isFinite(totalCurrentValue) ? totalCurrentValue : 0;
  const safeInvestedVal = Number.isFinite(totalInvested) ? totalInvested : 0;
  const totalNetWorth = safeCurrentVal + safeAvailableMargin;
  const usdNetWorth = (totalNetWorth / USD_INR_RATE).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const xirrMetrics = useMemo(() => {
    const cashFlows = buildCashFlowsFromHoldings(holdings, totalNetWorth, safeInvestedVal);
    const rate = calculateXirr(cashFlows);
    return {
      rate,
      formatted: formatXirrPercent(rate),
    };
  }, [holdings, totalNetWorth, safeInvestedVal]);

  const reloadPortfolioHistory = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // 📡 Live Historical Valuation Engine Fetcher
  useEffect(() => {
    let isCancelled = false;
    async function fetchHistoricalTimeline() {
      try {
        setHistoryLoading(true);
        const res = await fetch(`/api/portfolio/history?timeframe=${encodeURIComponent(activeTf)}&customDays=${encodeURIComponent(customDays)}&depository=${encodeURIComponent(depository)}&refresh=${refreshTrigger > 0 ? "true" : "false"}`);
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data && Array.isArray(data.points) && data.points.length > 0) {
            setHistoryData(data);
          }
        }
      } catch {
        // Fallback data remains seamlessly active
      } finally {
        if (!isCancelled) setHistoryLoading(false);
      }
    }
    fetchHistoricalTimeline();
    return () => { isCancelled = true; };
  }, [activeTf, customDays, depository, refreshTrigger]);

  const playScrubAudio = () => {
    const now = Date.now();
    if (now - lastAudioTickRef.current > 75) {
      soundEngine?.playTick?.();
      lastAudioTickRef.current = now;
    }
  };

  const timeframeMetrics = useMemo(() => {
    if (historyData?.metrics) {
      return {
        label: historyData.metrics.label,
        pnl: Number(historyData.metrics.pnl ?? 0),
        pct: String(historyData.metrics.pct ?? "0.00"),
        isGain: Boolean(historyData.metrics.isGain),
        allTimePnl: Number(historyData.metrics.allTimePnl ?? 0),
        allTimePct: String(historyData.metrics.allTimePct ?? "0.00"),
        alpha: historyData.metrics.alpha || "+0.0%",
        alphaValue: Number(historyData.metrics.alphaValue ?? 0),
        niftyReturn: historyData.metrics.niftyReturn || "+0.0%",
        cagr: historyData.metrics.cagr || xirrMetrics.formatted,
        cagrLabel: historyData.metrics.cagrLabel || "True XIRR"
      };
    }

    const calculated = calculateTimeframeMetrics({
      activeTf,
      dayPnl,
      dayPnlPct,
      safeCurrentVal,
      safeInvestedVal,
      totalPnl,
      totalPnlPct,
      customDays,
      nifty50,
      xirr: xirrMetrics.rate
    });

    return {
      ...calculated,
      cagr: xirrMetrics.formatted,
      cagrLabel: "True XIRR (Money-Weighted)",
    };
  }, [historyData, activeTf, dayPnl, dayPnlPct, safeCurrentVal, safeInvestedVal, totalPnl, totalPnlPct, customDays, nifty50, xirrMetrics]);

  const navPoints = useMemo(() => {
    if (historyData && Array.isArray(historyData.points) && historyData.points.length > 0) {
      return historyData.points.map((p) => Number(p) || 0);
    }
    return generateNavData(safeCurrentVal, safeInvestedVal, dayPnl, activeTf, customDays);
  }, [historyData, safeCurrentVal, safeInvestedVal, dayPnl, activeTf, customDays]);

  const investedPoints = useMemo(() => {
    if (historyData && Array.isArray(historyData.investedPoints) && historyData.investedPoints.length > 0) {
      return historyData.investedPoints.map((p) => Number(p) || 0);
    }
    return navPoints.map(() => safeInvestedVal);
  }, [historyData, navPoints, safeInvestedVal]);

  const benchmarkPoints = useMemo(() => {
    if (!showBenchmark) return [];
    if (historyData && Array.isArray(historyData.benchmarkPoints) && historyData.benchmarkPoints.length > 0) {
      return historyData.benchmarkPoints.map((p) => Number(p) || 0);
    }
    const base = safeInvestedVal > 0 ? safeInvestedVal : (safeCurrentVal * 0.85);
    return generateBenchmarkData(base, activeTf, customDays);
  }, [showBenchmark, historyData, safeInvestedVal, safeCurrentVal, activeTf, customDays]);

  const navDates = useMemo(() => {
    if (historyData && Array.isArray(historyData.dates)) {
      return historyData.dates;
    }
    return [];
  }, [historyData]);

  const isAllView = activeTf === "all";

  const chartValues = useMemo(() => {
    // Only include invested baseline on 'all' view to prevent short-term/intraday flatlining
    const list = isAllView ? [...navPoints, ...investedPoints, ...benchmarkPoints] : navPoints;
    return list.length > 0 ? list : [0, 100];
  }, [isAllView, navPoints, investedPoints, benchmarkPoints]);

  const rawMin = Math.min(...chartValues);
  const rawMax = Math.max(...chartValues);
  const spread = rawMax - rawMin;

  // Add 12% vertical headroom/padding so waves are fluid and price ticks have space
  const pad = Math.max(spread * 0.12, (rawMax * 0.01) || 500);
  const minVal = Math.max(0, rawMin - pad);
  const maxVal = rawMax + pad;
  const range = Math.max(1, maxVal - minVal);

  const svgWidth = 680;
  const svgHeight = 210;
  const paddingX = 20;
  const paddingY = 24;

  const getX = (idx) => {
    if (navPoints.length <= 1) return svgWidth / 2;
    return paddingX + (idx / (navPoints.length - 1)) * (svgWidth - paddingX * 2);
  };

  const getY = (val) => {
    return svgHeight - paddingY - ((val - minVal) / range) * (svgHeight - paddingY * 2);
  };

  const splinePath = useMemo(() => {
    return generateSmoothSpline(navPoints, getX, getY);
  }, [navPoints, minVal, maxVal]);

  const investedPath = useMemo(() => {
    if (!isAllView || investedPoints.length === 0) return "";
    return generateSmoothSpline(investedPoints, getX, getY);
  }, [isAllView, investedPoints, minVal, maxVal]);

  const benchmarkPath = useMemo(() => {
    if (benchmarkPoints.length === 0) return "";
    return generateSmoothSpline(benchmarkPoints, getX, getY);
  }, [benchmarkPoints, minVal, maxVal]);

  const splineAreaPath = useMemo(() => {
    if (!splinePath || navPoints.length === 0) return "";
    const firstX = getX(0);
    const lastX = getX(navPoints.length - 1);
    return `${splinePath} L ${lastX} ${svgHeight} L ${firstX} ${svgHeight} Z`;
  }, [splinePath, navPoints, minVal, maxVal]);

  // 🌟 Alpha Area Differential Ribbon Path (Portfolio vs NIFTY 50)
  const alphaAreaPath = useMemo(() => {
    if (!showBenchmark || benchmarkPoints.length === 0 || navPoints.length === 0) return "";
    return generateAlphaAreaPath(navPoints, benchmarkPoints, getX, getY);
  }, [showBenchmark, navPoints, benchmarkPoints, getX, getY]);

  // 💎 High-Water Mark (ATH Peak) & Drawdown Telemetry
  const highWaterMark = useMemo(() => {
    return calculateHighWaterMark(navPoints);
  }, [navPoints]);

  const athY = useMemo(() => {
    if (!highWaterMark.peakVal || range <= 0) return null;
    return getY(highWaterMark.peakVal);
  }, [highWaterMark.peakVal, range, getY]);

  // 🛡️ Institutional Risk Pod Metrics (Sharpe, Beta, Volatility, Sortino)
  const institutionalRisk = useMemo(() => {
    return calculateInstitutionalRiskMetrics({
      points: navPoints,
      investedVal: safeInvestedVal,
      currentVal: safeCurrentVal,
      timeframe: activeTf,
    });
  }, [navPoints, safeInvestedVal, safeCurrentVal, activeTf]);

  // 🌍 Global Multi-Currency State (INR, USD, EUR)
  const currency = useTradingStore((s) => s.portfolioCurrency || "INR");
  const setPortfolioCurrency = useTradingStore((s) => s.setPortfolioCurrency);
  const toggleCurrency = () => {
    const next = currency === "INR" ? "USD" : currency === "USD" ? "EUR" : "INR";
    soundEngine?.playClickTone?.();
    setPortfolioCurrency?.(next);
  };
  const fxConfig = FX_RATES[currency] || FX_RATES.INR;
  const fxRate = fxConfig.rate;
  const currencySymbol = fxConfig.symbol;

  const priceLevels = useMemo(() => {
    if (range <= 0) return [];
    const step = range / 4;
    return [
      { value: minVal + step, y: getY(minVal + step), label: formatPriceLevel(minVal + step) },
      { value: minVal + step * 2, y: getY(minVal + step * 2), label: formatPriceLevel(minVal + step * 2) },
      { value: minVal + step * 3, y: getY(minVal + step * 3), label: formatPriceLevel(minVal + step * 3) },
    ];
  }, [minVal, range, getY]);

  const dateMilestones = useMemo(() => {
    if (!navDates || navDates.length < 2) return [];
    const count = Math.min(5, navDates.length);
    const items = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.round((i / (count - 1)) * (navDates.length - 1));
      const dStr = navDates[idx];
      let label = dStr;
      if (dStr && !dStr.includes(":") && !dStr.startsWith("Session")) {
        const d = new Date(dStr);
        if (!isNaN(d.getTime())) {
          label = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
        }
      }
      items.push({ index: idx, x: getX(idx), label });
    }
    return items;
  }, [navDates, navPoints.length]);

  const handleSelectTimeframe = (tfId) => {
    setActiveTf(tfId);
    setWealthTimeframe(tfId);
    soundEngine?.playTabSwitchTone?.();
    if (tfId === "custom") {
      setCalendarOpen(true);
    }
  };

  const handleApplyCustomRange = (start, end) => {
    setCustomStart(start);
    setCustomEnd(end);
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e - s);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    setCustomDays(diffDays);
    setActiveTf("custom");
    soundEngine?.playSuccessTone?.();
  };

  const investedShare = totalNetWorth > 0 ? ((safeInvestedVal / totalNetWorth) * 100).toFixed(1) : "0.0";
  const marginShare = totalNetWorth > 0 ? ((safeAvailableMargin / totalNetWorth) * 100).toFixed(1) : "0.0";

  return {
    activeTf,
    isCalendarOpen,
    setCalendarOpen,
    customDays,
    customStart,
    customEnd,
    hoverIndex,
    setHoverIndex,
    safeAvailableMargin,
    safeInvestedVal,
    totalNetWorth,
    usdNetWorth,
    timeframeMetrics,
    navPoints,
    navDates,
    historyLoading,
    svgWidth,
    svgHeight,
    paddingY,
    getX,
    getY,
    splinePath,
    investedPath,
    splineAreaPath,
    handleSelectTimeframe,
    handleApplyCustomRange,
    playScrubAudio,
    investedShare,
    marginShare,
    investedPoints,
    activeTf,
    isAllView,
    depository,
    setDepository,
    isStatementModalOpen,
    setStatementModalOpen,
    benchmarkPoints,
    benchmarkPath,
    showBenchmark,
    toggleBenchmark,
    priceLevels,
    dateMilestones,
    minVal,
    maxVal,
    reloadPortfolioHistory,
    hasCustomLedger: Boolean(historyData?.hasCustomLedger),
    customLedgerCount: Number(historyData?.customLedgerCount ?? 0),
    xirrMetrics,
    highWaterMark,
    athY,
    alphaAreaPath,
    institutionalRisk,
    currency,
    toggleCurrency,
    currencySymbol,
    fxRate,
  };
}
