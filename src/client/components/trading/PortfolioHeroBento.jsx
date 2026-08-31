import React, { useState, useMemo, useRef, useEffect } from "react";
import { RollingTicker } from "../common/RollingTicker";
import { useTradingStore } from "../../stores/useTradingStore";
import { soundEngine } from "../../utils/soundEngine";
import { extractAvailableMargin } from "./AssetAllocationDeck";
import { LuxuryDateRangePicker } from "../common/LuxuryDateRangePicker";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ShieldCheck, 
  Sparkles, 
  Layers, 
  Calendar as CalendarIcon, 
  Check, 
  Zap, 
  Globe,
  Radio,
  ArrowUpRight,
  ArrowDownRight,
  PieChart
} from "lucide-react";
import clsx from "clsx";

// Static forex reference for Dalal Street <-> Wall Street conversion
const USD_INR_RATE = 83.95;

const TIMEFRAMES = [
  { id: "all", label: "ALL", sub: "Inception" },
  { id: "today", label: "1D", sub: "Session" },
  { id: "week", label: "1W", sub: "5 Days" },
  { id: "month", label: "1M", sub: "30 Days" },
  { id: "year", label: "1Y", sub: "365 Days" },
  { id: "custom", label: "Custom 📅", sub: "Range" },
];

/**
 * Generates high-precision realistic NAV curves based on smooth cubic trend interpolation (Zero Math.sin noise)
 */
function generateNavData(currentVal, investedVal, dayPnl, timeframe, customDays = 30) {
  const validCurrent = Number.isFinite(currentVal) && currentVal > 0 ? currentVal : 342500;
  const validInvested = Number.isFinite(investedVal) && investedVal > 0 ? investedVal : 328000;
  const validDayPnl = Number.isFinite(dayPnl) ? dayPnl : 3420;

  let pointsCount = 36;
  let growth = validCurrent - validInvested;
  let base = Math.max(1000, validInvested);

  if (timeframe === "today") {
    pointsCount = 32;
    const prevClose = validCurrent - validDayPnl;
    const data = [];
    for (let i = 0; i < pointsCount; i++) {
      const p = i / (pointsCount - 1);
      const ease = p * p * (3 - 2 * p); // Cubic smoothstep
      const val = prevClose + (validDayPnl * ease);
      data.push(Math.round(val));
    }
    data[data.length - 1] = Math.round(validCurrent);
    return data;
  }

  if (timeframe === "week") {
    pointsCount = 30;
    const weekDelta = validDayPnl * 3.2;
    const startVal = validCurrent - weekDelta;
    const data = [];
    for (let i = 0; i < pointsCount; i++) {
      const p = i / (pointsCount - 1);
      const ease = Math.pow(p, 1.18);
      const val = startVal + (weekDelta * ease);
      data.push(Math.round(val));
    }
    data[data.length - 1] = Math.round(validCurrent);
    return data;
  }

  if (timeframe === "month") {
    pointsCount = 32;
    const monthDelta = (validCurrent - validInvested) * 0.45;
    const startVal = validCurrent - monthDelta;
    const data = [];
    for (let i = 0; i < pointsCount; i++) {
      const p = i / (pointsCount - 1);
      const ease = Math.pow(p, 1.25);
      const val = startVal + (monthDelta * ease);
      data.push(Math.round(val));
    }
    data[data.length - 1] = Math.round(validCurrent);
    return data;
  }

  if (timeframe === "year") {
    pointsCount = 40;
    const yearDelta = (validCurrent - validInvested) * 0.85;
    const startVal = validCurrent - yearDelta;
    const data = [];
    for (let i = 0; i < pointsCount; i++) {
      const p = i / (pointsCount - 1);
      const ease = Math.pow(p, 1.32);
      const val = startVal + (yearDelta * ease);
      data.push(Math.round(val));
    }
    data[data.length - 1] = Math.round(validCurrent);
    return data;
  }

  if (timeframe === "custom") {
    pointsCount = Math.min(48, Math.max(20, Math.round(customDays / 3)));
    const customRatio = Math.min(1, customDays / 365);
    const customDelta = (validCurrent - validInvested) * customRatio;
    const startVal = validCurrent - customDelta;
    const data = [];
    for (let i = 0; i < pointsCount; i++) {
      const p = i / (pointsCount - 1);
      const ease = Math.pow(p, 1.3);
      const val = startVal + (customDelta * ease);
      data.push(Math.round(val));
    }
    data[data.length - 1] = Math.round(validCurrent);
    return data;
  }

  // "all" Timeframe (Default)
  pointsCount = 42;
  const data = [];
  for (let i = 0; i < pointsCount; i++) {
    const progress = i / (pointsCount - 1);
    const curve = Math.pow(progress, 1.35);
    const val = base + (growth * curve);
    data.push(Math.round(val));
  }
  data[data.length - 1] = Math.round(validCurrent);
  return data;
}

/**
 * Generates a smooth cubic Bézier spline SVG path string
 */
function generateSmoothSpline(points, getX, getY) {
  if (!points || points.length === 0) return "";
  if (points.length === 1) return `M ${getX(0)} ${getY(points[0])}`;
  if (points.length === 2) {
    const p0 = { x: getX(0), y: getY(points[0]) };
    const p1 = { x: getX(1), y: getY(points[1]) };
    const cx = (p0.x + p1.x) / 2;
    return `M ${p0.x} ${p0.y} C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  let path = `M ${getX(0)} ${getY(points[0])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? { x: getX(i - 1), y: getY(points[i - 1]) } : { x: getX(0), y: getY(points[0]) };
    const p1 = { x: getX(i), y: getY(points[i]) };
    const p2 = { x: getX(i + 1), y: getY(points[i + 1]) };
    const p3 = i < points.length - 2 ? { x: getX(i + 2), y: getY(points[i + 2]) } : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 5;
    const cp1y = p1.y + (p2.y - p0.y) / 5;
    const cp2x = p2.x - (p3.x - p1.x) / 5;
    const cp2y = p2.y - (p3.y - p1.y) / 5;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return path;
}

export function PortfolioHeroBento({
  holdings = [],
  margins = { available: 125000, net: 145000 },
  totalCurrentValue = 342500,
  totalInvested = 328000,
  totalPnl = 14500,
  totalPnlPct = "4.42",
  dayPnl = 3420,
  dayPnlPct = "1.01"
}) {
  const {
    wealthTimeframe,
    setWealthTimeframe,
  } = useTradingStore();

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
  const safeCurrentVal = Number.isFinite(totalCurrentValue) && totalCurrentValue > 0 ? totalCurrentValue : 342500;
  const safeInvestedVal = Number.isFinite(totalInvested) && totalInvested > 0 ? totalInvested : 328000;
  const totalNetWorth = safeCurrentVal + safeAvailableMargin;
  const usdNetWorth = (totalNetWorth / USD_INR_RATE).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Throttled Audio Haptics (75ms timestamp latch)
  const playScrubAudio = () => {
    const now = Date.now();
    if (now - lastAudioTickRef.current > 75) {
      soundEngine?.playTick?.();
      lastAudioTickRef.current = now;
    }
  };

  // Compute Timeframe-Adaptive P&L & ROI
  const timeframeMetrics = useMemo(() => {
    if (activeTf === "today") {
      const pnl = dayPnl;
      const pct = dayPnlPct;
      return { label: "Today's Intraday Return", pnl, pct, isGain: pnl >= 0 };
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
    // "all" Time
    const pnl = totalPnl;
    const pct = totalPnlPct;
    return { label: "All-Time Cumulative Profit", pnl, pct, isGain: pnl >= 0 };
  }, [activeTf, dayPnl, dayPnlPct, safeCurrentVal, safeInvestedVal, totalPnl, totalPnlPct, customDays]);

  const navPoints = useMemo(() => {
    return generateNavData(safeCurrentVal, safeInvestedVal, dayPnl, activeTf, customDays);
  }, [safeCurrentVal, safeInvestedVal, dayPnl, activeTf, customDays]);

  const minVal = Math.min(...navPoints);
  const maxVal = Math.max(...navPoints);
  const range = Math.max(1, maxVal - minVal);

  // SVG Dimensions & Padding
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

  // Smooth Spline Path & Area Fill
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

  // Percent shares for bottom cards
  const investedShare = totalNetWorth > 0 ? ((safeInvestedVal / totalNetWorth) * 100).toFixed(1) : "0.0";
  const marginShare = totalNetWorth > 0 ? ((safeAvailableMargin / totalNetWorth) * 100).toFixed(1) : "0.0";

  return (
    <div className="p-6 sm:p-8 rounded-[32px] bg-[#060a14] border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.14)] relative overflow-hidden flex flex-col justify-between space-y-6 hover:border-white/[0.12] transition-colors">
      {/* 🌌 Apple Spatial Ambient Spotlights */}
      <div className="absolute top-0 right-1/4 w-[480px] h-[280px] bg-cyan-500/[0.07] rounded-full blur-[100px] pointer-events-none -mt-24" />
      <div className="absolute bottom-0 left-10 w-[400px] h-[240px] bg-emerald-500/[0.06] rounded-full blur-[90px] pointer-events-none -mb-20" />

      {/* 🏛️ 1. Top Executive Branding & Telemetry Bar */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-300 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/25 shadow-sm whitespace-nowrap font-mono flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-cyan-400 fill-cyan-400/30" />
              <span>PORTFOLIO NET ASSET VALUE</span>
            </span>
            <span className="text-[10px] font-bold text-slate-400 font-mono hidden sm:inline-block">
              • NAV Telemetry
            </span>
          </div>
          <h1 className="text-sm font-bold uppercase tracking-wider text-white">
            Total Integrated Portfolio Valuation
          </h1>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)] flex items-center gap-1.5 whitespace-nowrap font-mono">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            Live Wealth Stream
          </span>
        </div>
      </div>

      {/* 💰 2. Main Net Worth Valuation & Return Telemetry */}
      <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-3">
            <div className="text-4xl sm:text-5xl lg:text-6xl font-black font-mono text-white tracking-tight drop-shadow-[0_4px_30px_rgba(255,255,255,0.15)] flex items-baseline gap-2">
              <RollingTicker value={totalNetWorth} prefix="₹" decimalPlaces={2} className="text-white font-black" />
            </div>
            <div className="text-xs font-mono text-slate-400 flex items-center gap-1 bg-white/[0.03] px-3 py-1 rounded-full border border-white/10 self-start sm:self-auto shadow-sm">
              <Globe className="w-3 h-3 text-cyan-400" />
              <span>≈ $${usdNetWorth} USD</span>
            </div>
          </div>

          {/* Timeframe-Adaptive Return Pill */}
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className={clsx(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-extrabold border shadow-md",
                timeframeMetrics.isGain
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/35 shadow-[0_0_16px_rgba(16,185,129,0.2)]"
                  : "bg-rose-500/15 text-rose-300 border-rose-500/35 shadow-[0_0_16px_rgba(244,63,94,0.2)]"
              )}
            >
              {timeframeMetrics.isGain ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> : <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
              <span>
                {timeframeMetrics.label}: {timeframeMetrics.isGain ? "+" : ""}₹{Math.abs(timeframeMetrics.pnl).toLocaleString("en-IN", { minimumFractionDigits: 2 })} ({timeframeMetrics.isGain ? "+" : ""}{timeframeMetrics.pct}%)
              </span>
            </div>

            <span className="text-xs text-slate-300 flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Alpha +2.8% vs NIFTY 50</span>
            </span>
          </div>
        </div>

        {/* Live Hover Scrubber Value Readout */}
        {hoverIndex !== null && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 rounded-2xl bg-[#091122]/95 border border-cyan-500/40 backdrop-blur-2xl text-right self-start lg:self-auto shadow-2xl space-y-0.5 pointer-events-none"
          >
            <span className="text-[10px] text-slate-400 block font-mono">
              {activeTf === "today" ? `Intraday Point #${hoverIndex + 1}` : `Timeline Point #${hoverIndex + 1}`}
            </span>
            <strong className="text-sm font-mono font-black text-cyan-300 block">
              ₹{navPoints[hoverIndex].toLocaleString("en-IN")}
            </strong>
          </motion.div>
        )}
      </div>

      {/* 🌟 3. Dedicated Apple Glass Segmented Timeframe Switcher */}
      <div className="relative w-full">
        <div className="grid grid-cols-6 gap-1 p-1 rounded-2xl bg-[#050811]/90 border border-white/[0.1] backdrop-blur-2xl shadow-inner w-full">
          {TIMEFRAMES.map((tf) => {
            const isSelected = activeTf === tf.id;
            return (
              <button
                key={tf.id}
                type="button"
                onClick={() => handleSelectTimeframe(tf.id)}
                className={clsx(
                  "relative w-full min-h-[36px] flex items-center justify-center gap-1 text-xs font-sans font-bold tracking-wide rounded-xl transition-all duration-200 cursor-pointer whitespace-nowrap active:scale-[0.97] z-10",
                  isSelected
                    ? "text-white"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {isSelected && (
                  <motion.div
                    layoutId="activeWealthTfPill"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    className="absolute inset-0 rounded-xl bg-cyan-500/20 border border-cyan-500/35 shadow-[0_0_12px_rgba(6,182,212,0.25)] -z-10"
                  />
                )}
                <span>{tf.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 📈 4. Cinematic Compounding Area NAV Spline Curve */}
      <div className="relative w-full h-44 pt-2">
        <svg
          className="w-full h-full overflow-visible select-none touch-none"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="appleSpatialNavGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00d5ff" stopOpacity="0.32" />
              <stop offset="60%" stopColor="#00f5c4" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#060a14" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="appleNavStrokeGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#168fff" />
              <stop offset="50%" stopColor="#00d5ff" />
              <stop offset="100%" stopColor="#00f5c4" />
            </linearGradient>
          </defs>

          {/* Area Gradient Fill */}
          <path d={splineAreaPath} fill="url(#appleSpatialNavGradient)" />

          {/* Glowing Smooth Spline Curve */}
          <path
            d={splinePath}
            fill="none"
            stroke="url(#appleNavStrokeGradient)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive Laser Crosshair on Hover */}
          {hoverIndex !== null && (
            <line
              x1={getX(hoverIndex)}
              y1={paddingY}
              x2={getX(hoverIndex)}
              y2={svgHeight}
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          )}

          {/* Micro Data Nodes along curve */}
          {navPoints.map((val, idx) => {
            const x = getX(idx);
            const y = getY(val);
            const isHovered = hoverIndex === idx;

            return (
              <g
                key={idx}
                className="cursor-pointer"
                onMouseEnter={() => {
                  playScrubAudio();
                  setHoverIndex(idx);
                }}
              >
                {/* Generous touch target */}
                <circle cx={x} cy={y} r="16" fill="transparent" />

                {/* Core Node */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 6 : 2}
                  fill={isHovered ? "#00f5c4" : "#00d5ff"}
                  stroke="#060a14"
                  strokeWidth={isHovered ? 2.5 : 1}
                  className="transition-all duration-150"
                />

                {/* Outer Glow Halo on Hover */}
                {isHovered && (
                  <circle cx={x} cy={y} r={12} fill="#00f5c4" opacity={0.3} className="animate-ping" />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* 💎 5. 4-Cell Symmetrical Bottom Telemetry Strip: Apple Ceramic Glass Tiles */}
      <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 border-t border-white/[0.06] pt-4">
        {/* Cell 1: Invested Equity Base */}
        <div className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] shadow-sm flex flex-col justify-between space-y-2.5 transition-all group">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono truncate">
              Invested Capital
            </span>
            <div className="w-7 h-7 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 flex-shrink-0 group-hover:scale-105 transition-transform">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-white tracking-tight">
            <RollingTicker value={safeInvestedVal} prefix="₹" decimalPlaces={2} className="text-white font-black" />
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
            <span className="px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-slate-300 font-bold">
              {investedShare}% NAV
            </span>
            <span className="text-[10px] text-slate-500 truncate">Portfolio Core</span>
          </div>
        </div>

        {/* Cell 2: Available Cash Margin */}
        <div className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-cyan-500/25 shadow-sm flex flex-col justify-between space-y-2.5 transition-all group">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-300 font-mono truncate">
              Available Margin
            </span>
            <div className="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-500/35 flex items-center justify-center text-cyan-300 flex-shrink-0 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-cyan-300 tracking-tight">
            <RollingTicker value={safeAvailableMargin} prefix="₹" decimalPlaces={2} className="text-cyan-300 font-black" />
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400">
            <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/25 text-cyan-300 font-bold">
              {marginShare}% NAV
            </span>
            <span className="text-[10px] text-slate-500 truncate">Free Collateral</span>
          </div>
        </div>

        {/* Cell 3: Unrealized Net Alpha */}
        <div className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-indigo-500/25 shadow-sm flex flex-col justify-between space-y-2.5 transition-all group">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300 font-mono truncate">
              Unrealized Profit
            </span>
            <div className="w-7 h-7 rounded-xl bg-indigo-500/20 border border-indigo-500/35 flex items-center justify-center text-indigo-300 flex-shrink-0 group-hover:scale-105 transition-transform">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-indigo-300 tracking-tight">
            <RollingTicker value={totalPnl} prefix="₹" showSign={true} decimalPlaces={2} className="text-indigo-300 font-black" />
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-indigo-400">
            <span className={clsx("px-1.5 py-0.5 rounded-md font-bold border", Number(totalPnl) >= 0 ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25" : "bg-rose-500/15 text-rose-300 border-rose-500/25")}>
              {Number(totalPnlPct) >= 0 ? "+" : ""}{totalPnlPct}% ROI
            </span>
            <span className="text-[10px] text-slate-500 truncate">Open P&amp;L</span>
          </div>
        </div>

        {/* Cell 4: Realized XIRR Compounding Speed */}
        <div className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-emerald-500/25 shadow-sm flex flex-col justify-between space-y-2.5 transition-all group">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 font-mono truncate">
              Annualized XIRR
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/35 flex items-center justify-center text-emerald-300 flex-shrink-0 group-hover:scale-105 transition-transform">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-emerald-300 tracking-tight">
            <span>+24.8%</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 font-bold">
              CAGR 18%
            </span>
            <span className="text-[10px] text-slate-500 truncate">Compounding</span>
          </div>
        </div>
      </div>

      {/* Universal React Portal Calendar Modal */}
      <LuxuryDateRangePicker
        isOpen={isCalendarOpen}
        onClose={() => setCalendarOpen(false)}
        startDate={customStart}
        endDate={customEnd}
        onApplyRange={handleApplyCustomRange}
      />
    </div>
  );
}

export default PortfolioHeroBento;
