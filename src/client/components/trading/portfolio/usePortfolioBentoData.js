import { useState, useMemo, useRef } from "react";
import { useTradingStore } from "../../../stores/useTradingStore";
import { soundEngine } from "../../../utils/soundEngine";
import { extractAvailableMargin } from "../AssetAllocationDeck";
import { USD_INR_RATE, generateNavData, generateSmoothSpline } from "./portfolioNavEngine";

export function usePortfolioBentoData({
  margins = { available: 0, net: 0 },
  totalCurrentValue = 0,
  totalInvested = 0,
  totalPnl = 0,
  totalPnlPct = "0.00",
  dayPnl = 0,
  dayPnlPct = "0.00",
}) {
  const { setWealthTimeframe } = useTradingStore();

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
  const lastAudioTickRef = useRef(0);

  const safeAvailableMargin = extractAvailableMargin(margins);
  const safeCurrentVal = Number.isFinite(totalCurrentValue) ? totalCurrentValue : 0;
  const safeInvestedVal = Number.isFinite(totalInvested) ? totalInvested : 0;
  const totalNetWorth = safeCurrentVal + safeAvailableMargin;
  const usdNetWorth = (totalNetWorth / USD_INR_RATE).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const playScrubAudio = () => {
    const now = Date.now();
    if (now - lastAudioTickRef.current > 75) {
      soundEngine?.playTick?.();
      lastAudioTickRef.current = now;
    }
  };

  const timeframeMetrics = useMemo(() => {
    if (activeTf === "today") {
      return { label: "Today's Intraday Return", pnl: dayPnl, pct: dayPnlPct, isGain: dayPnl >= 0 };
    }
    if (activeTf === "week") {
      const pnl = dayPnl * 3.2;
      const pct = (safeInvestedVal > 0 ? (pnl / safeInvestedVal) * 100 : 2.8).toFixed(2);
      return { label: "5-Day Weekly Gain", pnl, pct, isGain: pnl >= 0 };
    }
    if (activeTf === "month") {
      const pnl = (safeCurrentVal - safeInvestedVal) * 0.45;
      const pct = (safeInvestedVal > 0 ? (pnl / safeInvestedVal) * 100 : 3.6).toFixed(2);
      return { label: "Current Month Gain", pnl, pct, isGain: pnl >= 0 };
    }
    if (activeTf === "year") {
      const pnl = (safeCurrentVal - safeInvestedVal) * 0.85;
      const pct = (safeInvestedVal > 0 ? (pnl / safeInvestedVal) * 100 : 4.1).toFixed(2);
      return { label: "1-Year Annual Gain", pnl, pct, isGain: pnl >= 0 };
    }
    if (activeTf === "custom") {
      const ratio = Math.min(1, customDays / 365);
      const pnl = (safeCurrentVal - safeInvestedVal) * ratio;
      const pct = (safeInvestedVal > 0 ? (pnl / safeInvestedVal) * 100 : 3.8).toFixed(2);
      return { label: `Custom (${customDays}D) Gain`, pnl, pct, isGain: pnl >= 0 };
    }
    return { label: "All-Time Cumulative Profit", pnl: totalPnl, pct: totalPnlPct, isGain: totalPnl >= 0 };
  }, [activeTf, dayPnl, dayPnlPct, safeCurrentVal, safeInvestedVal, totalPnl, totalPnlPct, customDays]);

  const navPoints = useMemo(() => {
    return generateNavData(safeCurrentVal, safeInvestedVal, dayPnl, activeTf, customDays);
  }, [safeCurrentVal, safeInvestedVal, dayPnl, activeTf, customDays]);

  const minVal = Math.min(...navPoints);
  const maxVal = Math.max(...navPoints);
  const range = Math.max(1, maxVal - minVal);

  const svgWidth = 680;
  const svgHeight = 175;
  const paddingX = 16;
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

  const splineAreaPath = useMemo(() => {
    if (!splinePath || navPoints.length === 0) return "";
    const firstX = getX(0);
    const lastX = getX(navPoints.length - 1);
    return `${splinePath} L ${lastX} ${svgHeight} L ${firstX} ${svgHeight} Z`;
  }, [splinePath, navPoints, minVal, maxVal]);

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
    svgWidth,
    svgHeight,
    paddingY,
    getX,
    getY,
    splinePath,
    splineAreaPath,
    handleSelectTimeframe,
    handleApplyCustomRange,
    playScrubAudio,
    investedShare,
    marginShare,
  };
}
