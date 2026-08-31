import React, { useState, useMemo, useRef } from "react";
import { useTradingStore } from "../../stores/useTradingStore";
import { RollingTicker } from "../common/RollingTicker";
import { soundEngine } from "../../utils/soundEngine";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, 
  ShieldAlert, 
  Sparkles, 
  Activity, 
  Crown,
  Waves,
  Mountain,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  BarChart2
} from "lucide-react";
import clsx from "clsx";

/**
 * Monte Carlo Simulation Engine
 * Runs 1,000 simulated paths by bootstrapping the trader's actual trade history.
 */
function runMonteCarloSimulation(trades, initialCapital = 100000, horizon = 50, runs = 1000) {
  if (!trades || trades.length === 0) {
    return {
      ruinProbability: 0,
      medianEndCapital: initialCapital,
      worstDrawdown: 0,
      bestEndCapital: initialCapital,
      runs: 0
    };
  }

  const pnlPool = trades.map(t => Number(t.netPnl || 0));
  let ruinHits = 0;
  const endCapitals = [];
  let maxSimDrawdown = 0;
  const ruinThreshold = initialCapital * 0.85; // 15% drawdown threshold

  for (let r = 0; r < runs; r++) {
    let cap = initialCapital;
    let peak = initialCapital;
    let simMaxDD = 0;
    let hitRuin = false;

    for (let s = 0; s < horizon; s++) {
      const randomPnl = pnlPool[Math.floor(Math.random() * pnlPool.length)];
      cap += randomPnl;
      if (cap > peak) peak = cap;
      const dd = peak - cap;
      if (dd > simMaxDD) simMaxDD = dd;
      if (cap <= ruinThreshold) hitRuin = true;
    }

    if (hitRuin) ruinHits++;
    if (simMaxDD > maxSimDrawdown) maxSimDrawdown = simMaxDD;
    endCapitals.push(cap);
  }

  endCapitals.sort((a, b) => a - b);
  const medianEndCapital = endCapitals[Math.floor(runs / 2)];
  const bestEndCapital = endCapitals[Math.floor(runs * 0.95)];
  const ruinProbability = ((ruinHits / runs) * 100).toFixed(1);

  return {
    ruinProbability: Number(ruinProbability),
    medianEndCapital,
    worstDrawdown: Math.round(maxSimDrawdown),
    bestEndCapital,
    runs
  };
}

/**
 * Generates smooth cubic Bézier spline for SVG path
 */
function generateSmoothPath(points, getX, getY) {
  if (!points || points.length === 0) return "";
  if (points.length === 1) return `M ${getX(0)} ${getY(points[0].capital)}`;
  if (points.length === 2) {
    const p0 = { x: getX(0), y: getY(points[0].capital) };
    const p1 = { x: getX(1), y: getY(points[1].capital) };
    const cx = (p0.x + p1.x) / 2;
    return `M ${p0.x} ${p0.y} C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  let path = `M ${getX(0)} ${getY(points[0].capital)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? { x: getX(i - 1), y: getY(points[i - 1].capital) } : { x: getX(0), y: getY(points[0].capital) };
    const p1 = { x: getX(i), y: getY(points[i].capital) };
    const p2 = { x: getX(i + 1), y: getY(points[i + 1].capital) };
    const p3 = i < points.length - 2 ? { x: getX(i + 2), y: getY(points[i + 2].capital) } : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 5;
    const cp1y = p1.y + (p2.y - p0.y) / 5;
    const cp2x = p2.x - (p3.x - p1.x) / 5;
    const cp2y = p2.y - (p3.y - p1.y) / 5;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return path;
}

export function EquityCurveDeck() {
  const { journalTrades, journalRange } = useTradingStore();
  const [hoverIndex, setHoverIndex] = useState(null);
  const [activeTab, setActiveTab] = useState("growth"); // "growth" | "drawdown" | "monte-carlo"
  const [showGuide, setShowGuide] = useState(false);
  const lastAudioTickRef = useRef(0);

  const BASE_CAPITAL = 100000;

  // Throttled Audio Haptics (75ms timestamp latch)
  const playScrubAudio = () => {
    const now = Date.now();
    if (now - lastAudioTickRef.current > 75) {
      soundEngine?.playTick?.();
      lastAudioTickRef.current = now;
    }
  };

  // Safe Dynamic Date Resolver
  const getTradeDate = (t) => {
    return t.exitDatetime?.split("T")[0] || t.entryDatetime?.split("T")[0] || new Date().toISOString().split("T")[0];
  };

  // Filter trades based on active journalRange
  const activeTrades = useMemo(() => {
    const list = (journalTrades || []).filter((t) => {
      const tradeDate = getTradeDate(t);
      const todayStr = new Date().toISOString().split("T")[0];

      if (journalRange === "today") return tradeDate === todayStr;
      if (journalRange === "week") {
        const d = new Date();
        const day = d.getDay();
        const monday = new Date(d);
        monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return tradeDate >= monday.toISOString().split("T")[0] && tradeDate <= sunday.toISOString().split("T")[0];
      }
      if (journalRange === "month") {
        const now = new Date();
        const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        return tradeDate.startsWith(prefix);
      }
      return true;
    });

    return [...list].sort((a, b) => {
      const timeA = new Date(a.entryDatetime || a.id).getTime();
      const timeB = new Date(b.entryDatetime || b.id).getTime();
      return timeA - timeB;
    });
  }, [journalTrades, journalRange]);

  // Compute Equity Curve Points, High Water Mark & Underwater Drawdowns
  const { equityPoints, peakCapital, currentCapital, maxDrawdown, recoveryFactor } = useMemo(() => {
    let runningCap = BASE_CAPITAL;
    let currentPeak = BASE_CAPITAL;
    let maxDD = 0;

    const points = [{
      index: 0,
      label: "Start",
      pnl: 0,
      capital: BASE_CAPITAL,
      hwm: BASE_CAPITAL,
      drawdown: 0,
      drawdownPct: 0,
      symbol: "Vault Starting Capital",
      isWin: true,
      time: "Initial Balance"
    }];

    activeTrades.forEach((t, i) => {
      const net = Number(t.netPnl || 0);
      runningCap += net;
      if (runningCap > currentPeak) {
        currentPeak = runningCap;
      }
      const dd = currentPeak - runningCap;
      if (dd > maxDD) maxDD = dd;
      const ddPct = currentPeak > 0 ? (dd / currentPeak) * 100 : 0;

      points.push({
        index: i + 1,
        label: `Trade #${i + 1}`,
        shortLabel: `#${i + 1}`,
        pnl: net,
        capital: Math.round(runningCap * 100) / 100,
        hwm: Math.round(currentPeak * 100) / 100,
        drawdown: Math.round(dd * 100) / 100,
        drawdownPct: Math.round(ddPct * 10) / 10,
        symbol: t.symbol || "Option Scalp",
        isWin: net >= 0,
        time: t.exitDatetime ? new Date(t.exitDatetime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "Executed"
      });
    });

    const netGain = runningCap - BASE_CAPITAL;
    let recFactor = "0.00";
    if (maxDD === 0) {
      recFactor = netGain > 0 ? "10.0+ (No Drawdown)" : "1.00";
    } else {
      recFactor = (netGain / maxDD).toFixed(2) + "x";
    }

    return {
      equityPoints: points,
      peakCapital: currentPeak,
      currentCapital: runningCap,
      maxDrawdown: maxDD,
      recoveryFactor: recFactor
    };
  }, [activeTrades]);

  // Monte Carlo Simulation Results
  const monteCarlo = useMemo(() => {
    return runMonteCarloSimulation(activeTrades, BASE_CAPITAL, 50, 1000);
  }, [activeTrades]);

  // SVG Chart Dimensions & Adaptive Domain
  const width = 800;
  const height = 220;
  const padding = { top: 32, right: 36, bottom: 44, left: 64 };

  const allCapitals = equityPoints.map(p => p.capital);
  const minTradeCap = Math.min(...allCapitals);
  const maxTradeCap = Math.max(...equityPoints.map(p => p.hwm));

  // Adaptive headroom calculation (prevents flat line when trade count is low)
  const capSpread = Math.max(Math.abs(maxTradeCap - BASE_CAPITAL), Math.abs(minTradeCap - BASE_CAPITAL), 500);
  const minCap = BASE_CAPITAL - capSpread * 1.3;
  const maxCap = BASE_CAPITAL + capSpread * 1.3;
  const capRange = maxCap - minCap || 1;

  const getX = (index) => {
    if (equityPoints.length <= 1) return padding.left + (width - padding.left - padding.right) / 2;
    return padding.left + (index / (equityPoints.length - 1)) * (width - padding.left - padding.right);
  };

  const getY = (cap) => {
    return height - padding.bottom - ((cap - minCap) / capRange) * (height - padding.top - padding.bottom);
  };

  // Drawdown Y coordinate (0% at top, Max Drawdown at bottom)
  const maxDDPct = Math.max(...equityPoints.map(p => p.drawdownPct), 2.0);
  const getDDY = (ddPct) => {
    const usableHeight = height - padding.top - padding.bottom;
    return padding.top + (ddPct / maxDDPct) * usableHeight;
  };

  // Smooth SVG Path & Area for Growth Curve
  const smoothEquityPath = useMemo(() => {
    return generateSmoothPath(equityPoints, getX, getY);
  }, [equityPoints, minCap, maxCap]);

  const smoothEquityArea = useMemo(() => {
    if (!smoothEquityPath || equityPoints.length === 0) return "";
    const firstX = getX(0);
    const lastX = getX(equityPoints.length - 1);
    const baselineY = getY(BASE_CAPITAL);
    return `${smoothEquityPath} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;
  }, [smoothEquityPath, equityPoints, minCap, maxCap]);

  // High Water Mark Peak Path
  const hwmPath = useMemo(() => {
    if (equityPoints.length === 0) return "";
    return equityPoints.reduce((acc, p, i) => {
      const x = getX(i);
      const y = getY(p.hwm);
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, "");
  }, [equityPoints, minCap, maxCap]);

  // Underwater Drawdown Path
  const drawdownPath = useMemo(() => {
    if (equityPoints.length === 0) return "";
    return equityPoints.reduce((acc, p, i) => {
      const x = getX(i);
      const y = getDDY(p.drawdownPct);
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, "");
  }, [equityPoints, maxDDPct]);

  const drawdownArea = useMemo(() => {
    if (!drawdownPath || equityPoints.length === 0) return "";
    const firstX = getX(0);
    const lastX = getX(equityPoints.length - 1);
    return `${drawdownPath} L ${lastX} ${padding.top} L ${firstX} ${padding.top} Z`;
  }, [drawdownPath, equityPoints]);

  const activePoint = hoverIndex !== null && equityPoints[hoverIndex] ? equityPoints[hoverIndex] : null;

  return (
    <div className="relative rounded-3xl bg-[#060a14] border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.12)] p-4 sm:p-6 space-y-5 overflow-hidden">
      {/* Apple Ambient Studio Spotlight */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 right-10 w-80 h-60 bg-emerald-500/10 rounded-full blur-[90px] pointer-events-none" />

      {/* Header Bar */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-cyan-500/15 to-transparent border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)] flex-shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                Account Growth &amp; Drawdown Studio
              </h3>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 font-mono shadow-sm">
                Apple Spatial Engine
              </span>
            </div>
            <span className="text-xs text-slate-400 block mt-0.5 font-medium">
              ₹1,00,000 Vault Story • Peak High-Water Ceiling • 1,000-Path Stress Testing
            </span>
          </div>
        </div>

        {/* Apple Segmented Pill Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.08] shadow-inner backdrop-blur-2xl self-start md:self-auto">
          <button
            type="button"
            onClick={() => {
              soundEngine?.playTabSwitchTone?.();
              setActiveTab("growth");
            }}
            className={clsx(
              "px-3 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 cursor-pointer active:scale-95",
              activeTab === "growth"
                ? "bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            )}
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Growth Flow</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine?.playTabSwitchTone?.();
              setActiveTab("drawdown");
            }}
            className={clsx(
              "px-3 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 cursor-pointer active:scale-95",
              activeTab === "drawdown"
                ? "bg-rose-500/20 text-rose-200 border border-rose-400/40 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            )}
          >
            <Waves className="w-3.5 h-3.5 text-rose-400" />
            <span>Valley Map</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine?.playTabSwitchTone?.();
              setActiveTab("monte-carlo");
            }}
            className={clsx(
              "px-3 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 cursor-pointer active:scale-95",
              activeTab === "monte-carlo"
                ? "bg-purple-500/20 text-purple-200 border border-purple-400/40 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>1,000 Paths</span>
          </button>
        </div>
      </div>

      {/* 3-Card Apple Bento Telemetry Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] shadow-sm hover:border-cyan-500/30 transition-all group">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            <span>Vault Balance</span>
            <span className={clsx("text-[10px] px-2 py-0.5 rounded-full font-mono font-extrabold", currentCapital >= BASE_CAPITAL ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/15 text-rose-300 border border-rose-500/30")}>
              {currentCapital >= BASE_CAPITAL ? "+" : ""}{(((currentCapital - BASE_CAPITAL) / BASE_CAPITAL) * 100).toFixed(2)}%
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">
            <RollingTicker value={currentCapital} prefix="₹" decimalPlaces={2} />
          </div>
          <span className="text-[11px] font-mono text-slate-400 block mt-1">
            {currentCapital >= BASE_CAPITAL ? "Profit Gain: " : "Drawdown: "}
            <strong className={currentCapital >= BASE_CAPITAL ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
              {currentCapital >= BASE_CAPITAL ? "+" : ""}₹{(currentCapital - BASE_CAPITAL).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </strong>
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-cyan-500/20 shadow-sm hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            <span>All-Time Peak (HWM)</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono font-extrabold">
              👑 High Score
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-cyan-300 tracking-tight">
            <RollingTicker value={peakCapital} prefix="₹" decimalPlaces={2} className="text-cyan-300" />
          </div>
          <span className="text-[11px] font-mono text-slate-400 block mt-1">
            Highest Vault Value Reached
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-rose-500/20 shadow-sm hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            <span>Deepest Safety Dip</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 font-mono font-extrabold">
              Max Drawdown
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-rose-400 tracking-tight">
            <RollingTicker value={maxDrawdown} prefix="₹" decimalPlaces={2} className="text-rose-400" />
          </div>
          <span className="text-[11px] font-mono text-slate-400 block mt-1">
            {peakCapital > 0 ? `-${((maxDrawdown / peakCapital) * 100).toFixed(1)}% drop from peak` : "0.0% zero drawdown"}
          </span>
        </div>
      </div>

      {/* Interactive Quick Guide Accordion */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
        <button
          type="button"
          onClick={() => {
            soundEngine?.playClickTone?.();
            setShowGuide(prev => !prev);
          }}
          className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white hover:bg-white/[0.03] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="text-amber-400">💡</span>
            <span>What does this graph mean? (Click for plain-English guide)</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-cyan-400 font-mono font-bold">
            <span>{showGuide ? "Collapse" : "Explain Like I'm 5"}</span>
            {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        <AnimatePresence>
          {showGuide && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="px-4 pb-4 pt-2 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs"
            >
              <div className="p-3 rounded-xl bg-[#0c162b] border border-emerald-500/20 space-y-1">
                <strong className="text-emerald-400 flex items-center gap-1.5 font-bold">
                  <Mountain className="w-4 h-4" />
                  1. Growth Line (Balance)
                </strong>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Your bank account total as trades settle. Wins pull the curve upward; losses cause small dips.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#0c162b] border border-cyan-500/20 space-y-1">
                <strong className="text-cyan-400 flex items-center gap-1.5 font-bold">
                  <Crown className="w-4 h-4" />
                  2. All-Time Peak (Ceiling)
                </strong>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  The highest capital balance you ever achieved. Every new peak unlocks higher account milestone badges.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#0c162b] border border-rose-500/20 space-y-1">
                <strong className="text-rose-400 flex items-center gap-1.5 font-bold">
                  <Waves className="w-4 h-4" />
                  3. Drawdown (The Valley)
                </strong>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  The temporary drop below your peak. A small valley (&lt; 2%) proves you never tilt on losing days.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Visual Display */}
      {activeTab === "growth" ? (
        <div className="space-y-4">
          {/* Apple Spatial Canvas Container */}
          <div className="relative rounded-2xl bg-[#070d1a] border border-white/[0.08] p-3 sm:p-5 overflow-hidden">
            {/* Top Bar inside Canvas */}
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <span className="font-bold text-white text-[11px]">CUMULATIVE VAULT PROGRESSION</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-0.5 bg-cyan-400 rounded-full" /> Peak Ceiling
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-0.5 bg-emerald-400 rounded-full" /> Account Balance
                </span>
              </div>
            </div>

            {/* SVG Visual */}
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-56 sm:h-64 select-none touch-none"
              onMouseLeave={() => setHoverIndex(null)}
            >
              <defs>
                {/* Emerald Gradient Area */}
                <linearGradient id="appleGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.30" />
                  <stop offset="70%" stopColor="#10b981" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>

                {/* Vertical Stem Gradient */}
                <linearGradient id="stemBeamGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(56, 189, 248, 0.4)" />
                  <stop offset="100%" stopColor="rgba(56, 189, 248, 0.0)" />
                </linearGradient>

                {/* Grid Pattern */}
                <pattern id="spatialGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="40" x2="40" y2="40" stroke="rgba(255,255,255,0.03)" />
                  <line x1="40" y1="0" x2="40" y2="40" stroke="rgba(255,255,255,0.03)" />
                </pattern>
              </defs>

              {/* Background Spatial Grid */}
              <rect x={padding.left} y={padding.top} width={width - padding.left - padding.right} height={height - padding.top - padding.bottom} fill="url(#spatialGrid)" />

              {/* Starting Floor Level ₹1,00,000 */}
              <line
                x1={padding.left}
                y1={getY(BASE_CAPITAL)}
                x2={width - padding.right}
                y2={getY(BASE_CAPITAL)}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={getY(BASE_CAPITAL) + 3}
                textAnchor="end"
                fill="rgba(255,255,255,0.4)"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                ₹1.00L
              </text>

              {/* High Water Mark (Peak Ceiling) */}
              <path d={hwmPath} fill="none" stroke="#06b6d4" strokeWidth="1.75" strokeDasharray="4 4" opacity="0.8" />

              {/* Area Gradient Fill */}
              <path d={smoothEquityArea} fill="url(#appleGrowthGrad)" />

              {/* Smooth Spline Curve */}
              <path d={smoothEquityPath} fill="none" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

              {/* Data Nodes & Vertical Stems */}
              {equityPoints.map((p, i) => {
                const x = getX(i);
                const y = getY(p.capital);
                const isHovered = hoverIndex === i;
                const isWin = p.isWin;

                return (
                  <g
                    key={i}
                    onMouseEnter={() => {
                      playScrubAudio();
                      setHoverIndex(i);
                    }}
                    className="cursor-pointer"
                  >
                    {/* Generous hit circle */}
                    <circle cx={x} cy={y} r="20" fill="transparent" />

                    {/* Vertical Luminous Stem */}
                    <line
                      x1={x}
                      y1={y}
                      x2={x}
                      y2={height - padding.bottom}
                      stroke="url(#stemBeamGrad)"
                      strokeWidth={isHovered ? 2 : 1}
                      strokeDasharray={isHovered ? "none" : "2 3"}
                    />

                    {/* Outer Glow Halo on Hover */}
                    {isHovered && (
                      <circle
                        cx={x}
                        cy={y}
                        r="10"
                        fill={isWin ? "rgba(16,185,129,0.25)" : "rgba(244,63,94,0.25)"}
                        className="animate-pulse"
                      />
                    )}

                    {/* Glowing Core Node */}
                    <circle
                      cx={x}
                      cy={y}
                      r={isHovered ? 6 : 4.5}
                      fill={isWin ? "#10b981" : "#f43f5e"}
                      stroke="#070d1a"
                      strokeWidth="2.5"
                    />

                    {/* Bottom Step Label */}
                    <text
                      x={x}
                      y={height - 16}
                      textAnchor="middle"
                      fill={isHovered ? "#38bdf8" : "rgba(255,255,255,0.45)"}
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight={isHovered ? "bold" : "normal"}
                    >
                      {p.shortLabel || p.label}
                    </text>
                  </g>
                );
              })}

              {/* Hover Crosshair Vertical Line */}
              {hoverIndex !== null && (
                <line
                  x1={getX(hoverIndex)}
                  y1={padding.top}
                  x2={getX(hoverIndex)}
                  y2={height - padding.bottom}
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                />
              )}
            </svg>

            {/* Interactive Floating Apple Obsidian Tooltip Card */}
            {activePoint && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute top-4 right-4 z-20 p-3.5 rounded-2xl bg-[#091122]/95 border border-cyan-500/40 backdrop-blur-2xl text-xs font-mono space-y-1.5 shadow-[0_20px_40px_rgba(0,0,0,0.85)] pointer-events-none min-w-[220px]"
              >
                <div className="flex items-center justify-between gap-3 text-slate-400 border-b border-white/10 pb-1">
                  <strong className="text-white font-bold">{activePoint.label}</strong>
                  <span className="text-[10px] text-cyan-400">{activePoint.time}</span>
                </div>
                <div className="text-[11px] text-slate-300 font-bold truncate">
                  {activePoint.symbol}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-400">Trade P&amp;L:</span>
                  <strong className={activePoint.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}>
                    {activePoint.pnl >= 0 ? "+" : ""}₹{activePoint.pnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-1">
                  <span className="text-slate-400">Vault Balance:</span>
                  <strong className="text-white font-black">₹{activePoint.capital.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                </div>
                {activePoint.drawdown > 0 ? (
                  <div className="flex items-center justify-between gap-3 text-[10px] text-rose-400">
                    <span>Valley from Peak:</span>
                    <span>-₹{activePoint.drawdown.toLocaleString("en-IN")} (-{activePoint.drawdownPct}%)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[10px] text-cyan-300 font-bold">
                    <span>👑 All-Time High Record!</span>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Interactive Trade Milestone Journey Cards */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              <span>🎯 Trade Journey Milestones</span>
              <span className="text-cyan-400 text-[10px]">1-Tap Point Focus</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {equityPoints.map((p, i) => {
                const isSelected = hoverIndex === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      playScrubAudio();
                      setHoverIndex(i);
                    }}
                    className={clsx(
                      "p-3 rounded-2xl border text-left font-mono transition-all duration-200 cursor-pointer active:scale-95 flex flex-col justify-between",
                      isSelected
                        ? "bg-cyan-500/15 border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.25)] text-white"
                        : "bg-white/[0.02] border-white/[0.06] text-slate-300 hover:text-white hover:bg-white/[0.05]"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white">{p.label}</span>
                      <span className={clsx("text-[10px] font-bold px-1.5 py-0.2 rounded", p.pnl >= 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300")}>
                        {i === 0 ? "START" : (p.pnl >= 0 ? "+" : "") + "₹" + p.pnl.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between mt-2 pt-1 border-t border-white/[0.05]">
                      <span className="text-[10px] text-slate-400 truncate max-w-[110px]">{p.symbol}</span>
                      <span className="text-xs font-black text-white font-mono">₹{p.capital.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : activeTab === "drawdown" ? (
        /* Underwater Drawdown Valley Map */
        <div className="space-y-4">
          <div className="relative rounded-2xl bg-[#070d1a] border border-rose-500/20 p-4 sm:p-5 overflow-hidden">
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                <span className="font-bold text-white text-[11px]">UNDERWATER DRAWDOWN VALLEY (PULLBACK FROM PEAK)</span>
              </div>
              <span className="text-[10px] text-slate-400">0% = At All-Time High</span>
            </div>

            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-52 sm:h-60 select-none">
              <defs>
                <linearGradient id="ddValleyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.0" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.3" />
                </linearGradient>
              </defs>

              {/* 0% Peak Reference Line */}
              <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke="#06b6d4" strokeWidth="1.5" />
              <text x={padding.left - 8} y={padding.top + 3} textAnchor="end" fill="#06b6d4" fontSize="10" fontFamily="monospace" fontWeight="bold">
                0%
              </text>

              {/* Max Drawdown Level */}
              <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="rgba(244,63,94,0.2)" strokeDasharray="3 3" />
              <text x={padding.left - 8} y={height - padding.bottom + 3} textAnchor="end" fill="#f43f5e" fontSize="10" fontFamily="monospace">
                -{maxDDPct.toFixed(1)}%
              </text>

              {/* Drawdown Area Fill & Path */}
              <path d={drawdownArea} fill="url(#ddValleyGrad)" />
              <path d={drawdownPath} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />

              {/* Drawdown Points */}
              {equityPoints.map((p, i) => {
                const x = getX(i);
                const y = getDDY(p.drawdownPct);
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="4"
                    fill={p.drawdown > 0 ? "#f43f5e" : "#06b6d4"}
                    stroke="#070d1a"
                    strokeWidth="2"
                  />
                );
              })}
            </svg>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-400 mt-2">
              <strong className="text-white block mb-0.5">Why Valley Depth Matters:</strong>
              <p className="text-[11px] leading-relaxed">
                Drawdown measures how far your account falls below its Everest peak before making a new high. A shallow valley proves superior capital preservation.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* 1,000-Path Monte Carlo Quant Studio */
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-[#120b24] border border-purple-500/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">Risk of 15% Ruin</span>
                <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <strong className={clsx("text-2xl font-black font-mono block", monteCarlo.ruinProbability <= 5 ? "text-emerald-400" : "text-amber-400")}>
                {monteCarlo.ruinProbability}%
              </strong>
              <span className="text-xs text-slate-300 block">
                {monteCarlo.ruinProbability <= 5 ? "🛡️ Statistically Safe Edge" : "⚠️ Monitor Drawdown Threshold"}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#071626] border border-cyan-500/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">50-Trade Forecast</span>
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-2xl font-black font-mono text-cyan-300 block">
                <RollingTicker value={monteCarlo.medianEndCapital} prefix="₹" decimalPlaces={0} />
              </div>
              <span className="text-xs text-slate-300 block">Median expected balance after 50 setups</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#240b14] border border-rose-500/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider">Worst Sim Valley</span>
                <Waves className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <strong className="text-2xl font-black font-mono text-rose-400 block">
                -₹{monteCarlo.worstDrawdown.toLocaleString("en-IN")}
              </strong>
              <span className="text-xs text-slate-300 block">Maximum stress dip across 1,000 simulations</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0a1122] border border-purple-500/20 flex items-start gap-3 text-xs text-slate-300">
            <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-white font-bold block text-sm">Doctor Strange 1,000 Alternate Realities Test:</strong>
              <p className="text-xs leading-relaxed text-slate-300">
                By shuffling your {activeTrades.length} historical trades 1,000 times into random future sequences, the engine tests what happens if you hit an unlucky streak of losses in a row. A ruin risk under 5% proves your risk sizing is institutional grade!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EquityCurveDeck;
