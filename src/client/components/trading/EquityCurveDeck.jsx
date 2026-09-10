import React, { useState, useMemo, useRef, useEffect } from "react";
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
  BarChart2,
  Target,
  Compass,
  ShieldCheck,
  Zap
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
  if (points.length === 1) {
    const y = getY(points[0].capital);
    return `M ${getX(0)} ${y} L ${getX(1)} ${y}`;
  }
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
  const [selectedId, setSelectedId] = useState(null);
  const [scrubIndex, setScrubIndex] = useState(null);
  const [activeTab, setActiveTab] = useState("growth"); // "growth" | "drawdown" | "monte-carlo"
  const [accountingMode, setAccountingMode] = useState("NET"); // "NET" | "GROSS"
  const [showGuide, setShowGuide] = useState(false);
  const [reelFilter, setReelFilter] = useState("all"); // "all" | "win" | "loss"
  const [reelSort, setReelSort] = useState("newest"); // "newest" | "chrono"
  const [reelPage, setReelPage] = useState(1);
  const PAGE_SIZE = 25;
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
    if (!t) return new Date().toISOString().split("T")[0];
    const raw = t?.exitDatetime || t?.entryDatetime;
    if (typeof raw === "string" && raw.includes("T")) {
      return raw.split("T")[0];
    }
    if (typeof raw === "string" && raw.length >= 10) {
      return raw.slice(0, 10);
    }
    return new Date().toISOString().split("T")[0];
  };

  // Filter trades based on active journalRange with Closed/Settled Trade Firewall
  const activeTrades = useMemo(() => {
    const list = (journalTrades || []).filter((t) => {
      if (!t) return false;
      // Closed/Settled Trade Firewall (defensive against open contracts leaking in)
      const isSettled = t.status === "CLOSED" || t.status === "COMPLETED" || t.exitPrice !== undefined || t.realizedPnl !== undefined || t.netPnl !== undefined;
      if (!isSettled) return false;

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
      const timeA = new Date(a?.entryDatetime || a?.id || 0).getTime();
      const timeB = new Date(b?.entryDatetime || b?.id || 0).getTime();
      return timeA - timeB;
    });
  }, [journalTrades, journalRange]);

  // Compute Equity Curve Points, High Water Mark & Underwater Drawdowns with Friction Realism
  const { 
    equityPoints, 
    peakCapital, 
    currentCapital, 
    maxDrawdown, 
    recoveryFactor, 
    maxWin, 
    totalGross, 
    totalCharges, 
    totalNet, 
    retentionPct 
  } = useMemo(() => {
    let runningCap = BASE_CAPITAL;
    let currentPeak = BASE_CAPITAL;
    let maxDD = 0;
    let sumGross = 0;
    let sumCharges = 0;
    let sumNet = 0;

    const points = [{
      id: "genesis-origin",
      index: 0,
      label: "Start",
      pnl: 0,
      netPnl: 0,
      grossPnl: 0,
      charges: 0,
      capital: BASE_CAPITAL,
      hwm: BASE_CAPITAL,
      drawdown: 0,
      drawdownPct: 0,
      symbol: "Vault Starting Capital",
      isWin: true,
      time: "Initial Balance"
    }];

    const safeNum = (v, fallback = 0) => {
      if (v === null || v === undefined) return fallback;
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };

    activeTrades.forEach((t, i) => {
      const gross = safeNum(t.realizedPnl ?? t.grossPnl ?? t.netPnl, 0);
      const charges = safeNum(
        t.charges, 
        t.realizedPnl !== undefined && t.netPnl !== undefined 
          ? Math.max(0, safeNum(t.realizedPnl) - safeNum(t.netPnl)) 
          : 55.20
      );
      const net = safeNum(t.netPnl, gross - charges);

      sumGross += gross;
      sumCharges += charges;
      sumNet += net;

      const delta = accountingMode === "NET" ? net : gross;
      runningCap += delta;
      if (runningCap > currentPeak) {
        currentPeak = runningCap;
      }
      const dd = currentPeak - runningCap;
      if (dd > maxDD) maxDD = dd;
      const ddPct = currentPeak > 0 ? (dd / currentPeak) * 100 : 0;

      points.push({
        id: t.id ? String(t.id) : `trade-${t.symbol || 'scalp'}-${t.entryDatetime || t.entryPrice || (i + 1)}`,
        index: i + 1,
        label: `Trade #${i + 1}`,
        shortLabel: `#${i + 1}`,
        pnl: delta,
        netPnl: net,
        grossPnl: gross,
        charges: charges,
        capital: Math.round(runningCap * 100) / 100,
        hwm: Math.round(currentPeak * 100) / 100,
        drawdown: Math.round(dd * 100) / 100,
        drawdownPct: Math.round(ddPct * 10) / 10,
        symbol: String(t.symbol || "Option Scalp"),
        isWin: delta >= 0,
        direction: t.direction || "LONG",
        entryPrice: t.entryPrice !== null && t.entryPrice !== undefined ? safeNum(t.entryPrice, null) : null,
        exitPrice: t.exitPrice !== null && t.exitPrice !== undefined ? safeNum(t.exitPrice, null) : null,
        targetPrice: t.targetPrice !== null && t.targetPrice !== undefined ? safeNum(t.targetPrice, null) : null,
        stopLoss: t.stopLoss !== null && t.stopLoss !== undefined ? safeNum(t.stopLoss, null) : null,
        quantity: t.quantity ? safeNum(t.quantity, 75) : 75,
        closeReason: t.closeReason || (delta >= 0 ? "TARGET_HIT" : "STOP_LOSS_HIT"),
        time: t.exitDatetime 
          ? new Date(t.exitDatetime).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) 
          : "Executed"
      });
    });

    const netGain = runningCap - BASE_CAPITAL;
    let recFactor = "0.00";
    if (maxDD === 0) {
      recFactor = netGain > 0 ? "10.0+ (No Drawdown)" : "1.00";
    } else {
      recFactor = (netGain / maxDD).toFixed(2) + "x";
    }

    const allDeltas = points.slice(1).map(p => p.pnl);
    const maxWinVal = allDeltas.length ? Math.max(...allDeltas, 0) : 0;
    const retPct = sumGross > 0 ? Math.max(0, Math.min(100, (sumNet / sumGross) * 100)).toFixed(1) : (sumGross < 0 ? "0.0" : "100.0");

    return {
      equityPoints: points,
      peakCapital: currentPeak,
      currentCapital: runningCap,
      maxDrawdown: maxDD,
      recoveryFactor: recFactor,
      maxWin: maxWinVal,
      totalGross: sumGross,
      totalCharges: sumCharges,
      totalNet: sumNet,
      retentionPct: retPct
    };
  }, [activeTrades, accountingMode]);

  // Filtered & Sorted Trade Reel Points with original index preservation & 25-card pagination
  const { displayReelPoints, totalReelMatches, totalPages, currentPage } = useMemo(() => {
    let list = equityPoints.map((p, originalIndex) => ({ ...p, originalIndex }));
    
    // Outcome Filtering
    if (reelFilter === "win") {
      list = list.filter(p => p.originalIndex > 0 && p.pnl >= 0);
    } else if (reelFilter === "loss") {
      list = list.filter(p => p.originalIndex > 0 && p.pnl < 0);
    }

    // Sort order: newest first places latest trades at top-left, genesis anchor at bottom
    if (reelSort === "newest") {
      const tradesOnly = list.filter(p => p.originalIndex > 0).reverse();
      const baseOnly = list.filter(p => p.originalIndex === 0);
      list = [...tradesOnly, ...baseOnly];
    }

    const total = list.length;
    const computedPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(reelPage, computedPages);
    const paginated = list.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    return { 
      displayReelPoints: paginated, 
      totalReelMatches: total, 
      totalPages: computedPages, 
      currentPage: safePage 
    };
  }, [equityPoints, reelFilter, reelSort, reelPage, PAGE_SIZE]);

  // Reset pagination to page 1 on filter or sort change
  useEffect(() => {
    setReelPage(1);
  }, [reelFilter, reelSort, journalRange]);

  // Monte Carlo Simulation Results
  const monteCarlo = useMemo(() => {
    return runMonteCarloSimulation(activeTrades, BASE_CAPITAL, 50, 1000);
  }, [activeTrades]);

  // SVG Chart Dimensions & Adaptive Domain (Apple Card / Stocks True 0px Edge-to-Edge Canvas)
  const width = 1000;
  const height = 240;
  const padding = { top: 20, right: 0, bottom: 0, left: 0 };

  const winTrades = activeTrades.filter(t => (t.netPnl || t.realizedPnl || 0) > 0).length;
  const winRate = activeTrades.length > 0 ? ((winTrades / activeTrades.length) * 100).toFixed(0) : "0";

  const allCapitals = equityPoints.map(p => p.capital);
  const minTradeCap = Math.min(...allCapitals);
  const maxTradeCap = Math.max(...equityPoints.map(p => p.hwm));

  // Adaptive headroom calculation (prevents flat line when trade count is low)
  const capSpread = Math.max(Math.abs(maxTradeCap - BASE_CAPITAL), Math.abs(minTradeCap - BASE_CAPITAL), 600);
  const minCap = Math.floor((BASE_CAPITAL - capSpread * 1.35) / 100) * 100;
  const maxCap = Math.ceil((BASE_CAPITAL + capSpread * 1.35) / 100) * 100;
  const capRange = maxCap - minCap || 1;

  // True 0px edge-to-edge projection (0% to 100%)
  const getX = (index) => {
    if (equityPoints.length <= 1) {
      return index === 0 ? 0 : width;
    }
    return (index / (equityPoints.length - 1)) * width;
  };

  const getY = (cap) => {
    const usableHeight = height - padding.top - 24;
    return height - 24 - ((cap - minCap) / capRange) * usableHeight;
  };

  // Dynamic Multi-Level Y-Axis Gridlines
  const yTicks = useMemo(() => {
    const ticksCount = 4;
    const ticks = [];
    for (let i = 0; i <= ticksCount; i++) {
      const val = minCap + (i / ticksCount) * (maxCap - minCap);
      const isBase = Math.abs(val - BASE_CAPITAL) < (capRange / 10);
      ticks.push({
        val: Math.round(val),
        y: getY(val),
        isBase
      });
    }
    return ticks;
  }, [minCap, maxCap, capRange]);

  const svgRef = useRef(null);

  const handleSvgMouseMove = (e) => {
    if (!svgRef.current || equityPoints.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const svgX = (clientX / rect.width) * width;
    
    const rawIndex = (svgX / width) * (equityPoints.length - 1);
    const closestIndex = Math.max(0, Math.min(equityPoints.length - 1, Math.round(rawIndex)));

    if (closestIndex !== scrubIndex) {
      playScrubAudio();
      setScrubIndex(closestIndex);
    }
  };

  // Drawdown Y coordinate (0% at top, Max Drawdown at bottom)
  const maxDDPct = Math.max(...equityPoints.map(p => p.drawdownPct), 2.0);
  const getDDY = (ddPct) => {
    const usableHeight = height - padding.top - 24;
    return padding.top + (ddPct / maxDDPct) * usableHeight;
  };

  // Smooth SVG Path & Area for Growth Curve
  const smoothEquityPath = useMemo(() => {
    return generateSmoothPath(equityPoints, getX, getY);
  }, [equityPoints, minCap, maxCap]);

  const smoothEquityArea = useMemo(() => {
    if (!smoothEquityPath || equityPoints.length === 0) return "";
    const firstX = 0;
    const lastX = width;
    return `${smoothEquityPath} L ${lastX} ${height} L ${firstX} ${height} Z`;
  }, [smoothEquityPath, equityPoints, width, height]);

  // High Water Mark Peak Path
  const hwmPath = useMemo(() => {
    if (equityPoints.length === 0) return "";
    if (equityPoints.length <= 1) {
      const y = getY(equityPoints[0].hwm);
      return `M 0 ${y} L ${width} ${y}`;
    }
    return equityPoints.reduce((acc, p, i) => {
      const x = getX(i);
      const y = getY(p.hwm);
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, "");
  }, [equityPoints, minCap, maxCap, width]);

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
    const firstX = 0;
    const lastX = width;
    return `${drawdownPath} L ${lastX} ${padding.top} L ${firstX} ${padding.top} Z`;
  }, [drawdownPath, equityPoints, width, padding.top]);

  const activePoint = useMemo(() => {
    if (scrubIndex !== null && equityPoints[scrubIndex]) {
      return equityPoints[scrubIndex];
    }
    if (selectedId !== null) {
      const match = equityPoints.find(p => p.id === selectedId);
      if (match) return match;
    }
    return null;
  }, [scrubIndex, selectedId, equityPoints]);

  const activePointIndex = useMemo(() => {
    if (!activePoint) return null;
    const idx = equityPoints.findIndex(p => p.id === activePoint.id);
    return idx >= 0 ? idx : null;
  }, [activePoint, equityPoints]);

  // Filter-Boundary Latch: Automatically deselect if selected trade is no longer in active dataset
  useEffect(() => {
    if (!selectedId) return;
    const exists = equityPoints.some(p => p.id === selectedId);
    if (!exists) {
      setSelectedId(null);
      setScrubIndex(null);
    }
  }, [equityPoints, selectedId]);

  // 2D Roving Keyboard Grid Navigation with Cross-Page Traversal & Boundary Safety
  const handleReelKeyDown = (e) => {
    if (!displayReelPoints || displayReelPoints.length === 0) return;

    if (e.key === "Escape") {
      playScrubAudio();
      setSelectedId(null);
      setScrubIndex(null);
      return;
    }

    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) return;

    const currentIdx = displayReelPoints.findIndex(p => p.id === activePoint?.id);
    const cols = window.innerWidth >= 1280 ? 5 : window.innerWidth >= 1024 ? 4 : window.innerWidth >= 640 ? 2 : 1;

    if (e.key === "ArrowRight") {
      e.preventDefault();
      if (currentIdx >= displayReelPoints.length - 1 && currentPage < totalPages) {
        // Cross page boundary to next page
        playScrubAudio();
        setReelPage(p => p + 1);
        return;
      }
      const targetIdx = currentIdx < 0 ? 0 : Math.min(displayReelPoints.length - 1, currentIdx + 1);
      if (targetIdx >= 0 && displayReelPoints[targetIdx]) {
        playScrubAudio();
        setSelectedId(displayReelPoints[targetIdx].id);
        setScrubIndex(null);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (currentIdx === 0 && currentPage > 1) {
        // Cross page boundary to previous page
        playScrubAudio();
        setReelPage(p => p - 1);
        return;
      }
      const targetIdx = currentIdx < 0 ? displayReelPoints.length - 1 : Math.max(0, currentIdx - 1);
      if (targetIdx >= 0 && displayReelPoints[targetIdx]) {
        playScrubAudio();
        setSelectedId(displayReelPoints[targetIdx].id);
        setScrubIndex(null);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const targetIdx = currentIdx < 0 ? 0 : Math.min(displayReelPoints.length - 1, currentIdx + cols);
      if (targetIdx >= 0 && displayReelPoints[targetIdx]) {
        playScrubAudio();
        setSelectedId(displayReelPoints[targetIdx].id);
        setScrubIndex(null);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const targetIdx = currentIdx < 0 ? 0 : Math.max(0, currentIdx - cols);
      if (targetIdx >= 0 && displayReelPoints[targetIdx]) {
        playScrubAudio();
        setSelectedId(displayReelPoints[targetIdx].id);
        setScrubIndex(null);
      }
    }
  };

  // Target-Aware Global Keyboard Listener (Zero Form Input Hijacking)
  useEffect(() => {
    const onGlobalKeyDown = (e) => {
      // 1. NEVER hijack keystrokes when trader is typing in a form or input
      if (e.target?.closest?.("input, textarea, select, [contenteditable='true'], [role='textbox']")) {
        return;
      }
      
      // 2. Only capture navigation keys
      if (["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Escape"].includes(e.key)) {
        handleReelKeyDown(e);
      }
    };

    window.addEventListener("keydown", onGlobalKeyDown);
    return () => window.removeEventListener("keydown", onGlobalKeyDown);
  }, [displayReelPoints, activePoint, currentPage, totalPages]);

  const isTradeOnCurrentPage = useMemo(() => {
    if (!activePoint || activePoint.id === "genesis-origin") return true;
    return displayReelPoints.some(p => p.id === activePoint.id);
  }, [displayReelPoints, activePoint]);

  const isProfitable = currentCapital >= BASE_CAPITAL;
  const displayCapital = activePoint ? activePoint.capital : currentCapital;
  const displayPnl = activePoint ? activePoint.pnl : (currentCapital - BASE_CAPITAL);
  const displayPct = activePoint 
    ? (BASE_CAPITAL > 0 ? ((activePoint.pnl / BASE_CAPITAL) * 100).toFixed(2) : "0.00")
    : (BASE_CAPITAL > 0 ? (((currentCapital - BASE_CAPITAL) / BASE_CAPITAL) * 100).toFixed(2) : "0.00");
  const baselineY = getY(BASE_CAPITAL);

  return (
    <div className="relative rounded-3xl bg-[#0d0f14] border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.12)] p-4 sm:p-6 space-y-5 overflow-hidden">
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

        {/* Apple Segmented Pill Switcher & Realism Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Net vs Gross Accounting Mode Pill */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.08] shadow-inner backdrop-blur-2xl text-[11px] font-mono">
            <button
              type="button"
              onClick={() => {
                soundEngine?.playClickTone?.();
                setAccountingMode("NET");
              }}
              className={clsx(
                "px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95",
                accountingMode === "NET"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                  : "text-slate-400 hover:text-slate-200"
              )}
              title="Realized Take-Home earnings after Brokerage, STT, and Taxes"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Net Take-Home</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine?.playClickTone?.();
                setAccountingMode("GROSS");
              }}
              className={clsx(
                "px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95",
                accountingMode === "GROSS"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                  : "text-slate-400 hover:text-slate-200"
              )}
              title="Raw execution price delta before statutory deductions"
            >
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>Gross Execution</span>
            </button>
          </div>

          {/* Visualization Modes */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.08] shadow-inner backdrop-blur-2xl">
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
              <div className="p-3 rounded-xl bg-[#121424] border border-emerald-500/20 space-y-1">
                <strong className="text-emerald-400 flex items-center gap-1.5 font-bold">
                  <Mountain className="w-4 h-4" />
                  1. Growth Line (Balance)
                </strong>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Your bank account total as trades settle. Wins pull the curve upward; losses cause small dips.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#121424] border border-cyan-500/20 space-y-1">
                <strong className="text-cyan-400 flex items-center gap-1.5 font-bold">
                  <Crown className="w-4 h-4" />
                  2. All-Time Peak (Ceiling)
                </strong>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  The highest capital balance you ever achieved. Every new peak unlocks higher account milestone badges.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#121424] border border-rose-500/20 space-y-1">
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
          {/* Apple Card / Stocks Full-Bleed Studio Surface */}
          <div className="relative rounded-3xl bg-[#0d0f14]/95 border border-white/[0.07] overflow-hidden backdrop-blur-3xl shadow-[0_32px_80px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.08)] group select-none">
            {/* Ambient Studio Lighting Highlights */}
            <div className={clsx(
              "absolute -top-24 right-1/4 w-96 h-64 rounded-full blur-3xl pointer-events-none transition-colors duration-700",
              isProfitable ? "bg-emerald-500/10" : "bg-rose-500/10"
            )} />
            <div className={clsx(
              "absolute -bottom-24 left-1/4 w-96 h-64 rounded-full blur-3xl pointer-events-none transition-colors duration-700",
              isProfitable ? "bg-cyan-500/10" : "bg-purple-500/10"
            )} />

            {/* Apple Stocks Hero Telemetry Header */}
            <div className="p-5 sm:p-7 pb-2 relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <span className={clsx(
                    "w-2.5 h-2.5 rounded-full shadow-lg animate-pulse",
                    isProfitable ? "bg-emerald-400 shadow-emerald-500/80" : "bg-rose-400 shadow-rose-500/80"
                  )} />
                  <span className="font-bold text-slate-300 text-xs tracking-wider uppercase font-mono">
                    PORTFOLIO VAULT STORY
                  </span>
                  <span className={clsx(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full border font-mono",
                    accountingMode === "NET" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  )}>
                    {accountingMode === "NET" ? "NET TAKE-HOME" : "GROSS EXECUTION"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                    {activeTrades.length} Trades Recorded
                  </span>
                </div>
              </div>

              {/* Big Fluid Dynamic Balance */}
              <div className="space-y-1">
                <div 
                  className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight font-sans transition-all duration-150"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  ₹{displayCapital.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>

                {/* Dynamic Context Pill */}
                <div className="flex items-center gap-2.5 flex-wrap pt-1">
                  <span className={clsx(
                    "px-3 py-1 rounded-full text-xs font-bold border font-sans flex items-center gap-1.5 transition-colors duration-300",
                    displayPnl >= 0 ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                  )}>
                    {displayPnl >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <Waves className="w-3.5 h-3.5" />}
                    <span>{displayPnl >= 0 ? "+" : ""}₹{displayPnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    <span className="opacity-70">({displayPct}%)</span>
                  </span>

                  <span className="text-xs text-slate-400 font-medium">
                    {activePoint ? (
                      <span className="text-slate-300 font-mono">
                        {activePoint.label} · <strong className="text-white">{activePoint.symbol}</strong> · {activePoint.time}
                      </span>
                    ) : (
                      <span>Overall Vault Performance vs ₹1.00L Base</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* True 0px Edge-to-Edge SVG Canvas (No gutters, bleeds to left & right borders) */}
          {/* True 0px Edge-to-Edge SVG Canvas (No gutters, bleeds to left & right borders) */}
            <div className="relative w-full overflow-hidden mt-2">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-64 sm:h-80 select-none touch-pan-y cursor-crosshair overflow-visible block"
                preserveAspectRatio="none"
                onMouseMove={handleSvgMouseMove}
                onMouseLeave={() => setScrubIndex(null)}
              >
                <defs>
                  {/* Dynamic Volumetric Area Gradient */}
                  <linearGradient id="appleAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isProfitable ? "#10b981" : "#f43f5e"} stopOpacity="0.40" />
                    <stop offset="50%" stopColor={isProfitable ? "#06b6d4" : "#e11d48"} stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#060709" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Dynamic Neon Spline Gradient */}
                  <linearGradient id="appleSplineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={isProfitable ? "#06b6d4" : "#fb7185"} />
                    <stop offset="50%" stopColor={isProfitable ? "#10b981" : "#f43f5e"} />
                    <stop offset="100%" stopColor={isProfitable ? "#34d399" : "#e11d48"} />
                  </linearGradient>

                  {/* High Water Mark Stepped Beam */}
                  <linearGradient id="hwmBeamGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.85" />
                  </linearGradient>

                  {/* Bloom Glow Filter */}
                  <filter id="neonBloom" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3.5" result="blur1" />
                    <feGaussianBlur stdDeviation="7" result="blur2" />
                    <feMerge>
                      <feMergeNode in="blur2" />
                      <feMergeNode in="blur1" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* Subtle Background Pattern */}
                  <pattern id="spatialMicroGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="40" x2="40" y2="40" stroke="rgba(255,255,255,0.02)" strokeWidth="0.8" />
                    <line x1="40" y1="0" x2="40" y2="40" stroke="rgba(255,255,255,0.02)" strokeWidth="0.8" />
                  </pattern>
                </defs>

                {/* Subtle Background Micro-Grid */}
                <rect x="0" y="0" width={width} height={height} fill="url(#spatialMicroGrid)" />

                {/* ₹1.00L BASE HORIZON Line & Label */}
                <line 
                  x1="0" 
                  y1={baselineY} 
                  x2={width} 
                  y2={baselineY} 
                  stroke={isProfitable ? "rgba(16, 185, 129, 0.25)" : "rgba(244, 63, 94, 0.25)"} 
                  strokeWidth="1.2" 
                  strokeDasharray="4 6" 
                />
                <text
                  x={width - 16}
                  y={baselineY - 7}
                  textAnchor="end"
                  fill="rgba(255, 255, 255, 0.35)"
                  fontSize="10"
                  fontFamily="sans-serif"
                  fontWeight="bold"
                  letterSpacing="0.5"
                >
                  ₹1.00L BASE HORIZON
                </text>

                {/* High Water Mark (Peak Ceiling Beam) */}
                <path 
                  d={hwmPath} 
                  fill="none" 
                  stroke="url(#hwmBeamGrad)" 
                  strokeWidth="1.5" 
                  strokeDasharray="3 3" 
                  opacity="0.75" 
                />

                {/* Volumetric Liquid Area Gradient Fill */}
                <path d={smoothEquityArea} fill="url(#appleAreaGrad)" />

                {/* Neon Spline Glow Aura (Bloom) */}
                <path 
                  d={smoothEquityPath} 
                  fill="none" 
                  stroke="url(#appleSplineGrad)" 
                  strokeWidth="7" 
                  opacity="0.38" 
                  filter="url(#neonBloom)" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />

                {/* Luminous Spline Core */}
                <path 
                  d={smoothEquityPath} 
                  fill="none" 
                  stroke="url(#appleSplineGrad)" 
                  strokeWidth="3.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />

                {/* Active Hover Crosshair & Reticle (Zero bead clutter on rest!) */}
                {activePoint && activePointIndex !== null && (
                  <g>
                    {/* Vertical Laser Crosshair */}
                    <line
                      x1={getX(activePointIndex)}
                      y1="0"
                      x2={getX(activePointIndex)}
                      y2={height}
                      stroke="rgba(255, 255, 255, 0.35)"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                    />

                    {/* Outer Glowing Halo */}
                    <circle
                      cx={getX(activePointIndex)}
                      cy={getY(activePoint.capital)}
                      r="12"
                      fill={activePoint.isWin ? "rgba(16, 185, 129, 0.35)" : "rgba(244, 63, 94, 0.35)"}
                      className="animate-pulse"
                    />

                    {/* Core Reticle Dot */}
                    <circle
                      cx={getX(activePointIndex)}
                      cy={getY(activePoint.capital)}
                      r="6"
                      fill={activePoint.isWin ? "#10b981" : "#f43f5e"}
                      stroke="#ffffff"
                      strokeWidth="2.5"
                    />
                  </g>
                )}

                {/* Terminal Live Radar Beacon when not hovered */}
                {activePoint === null && equityPoints.length > 0 && (
                  <g>
                    <circle 
                      cx={width} 
                      cy={getY(equityPoints[equityPoints.length - 1].capital)} 
                      r="12" 
                      fill={isProfitable ? "rgba(16, 185, 129, 0.35)" : "rgba(244, 63, 94, 0.35)"} 
                      className="animate-ping" 
                    />
                    <circle 
                      cx={width} 
                      cy={getY(equityPoints[equityPoints.length - 1].capital)} 
                      r="5" 
                      fill={isProfitable ? "#10b981" : "#f43f5e"} 
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  </g>
                )}

                {/* 0-Trade Baseline Watermark */}
                {equityPoints.length <= 1 && (
                  <text
                    x={width / 2}
                    y={height / 2 - 4}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.2)"
                    fontSize="11"
                    fontFamily="sans-serif"
                    fontWeight="bold"
                    letterSpacing="1"
                  >
                    READY FOR INITIAL EXECUTION · ₹1,00,000 BASELINE
                  </text>
                )}
              </svg>
            </div>

            {/* 4 Plain-English Apple Glass Telemetry Cards Below */}
            <div className="p-4 sm:p-6 grid grid-cols-2 lg:grid-cols-4 gap-3 border-t border-white/[0.07] bg-white/[0.01]">
              {/* Card 1: Starting Base */}
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <span className="text-[11px] font-medium text-slate-400 block mb-1">Starting Capital</span>
                <div className="text-lg font-bold text-white font-sans">₹1,00,000.00</div>
                <span className="text-[10px] text-slate-400 block mt-0.5">1.00L Base Foundation</span>
              </div>

              {/* Card 2: Peak Record */}
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-cyan-500/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium text-slate-400">All-Time Peak</span>
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-lg font-bold text-cyan-300 font-sans">₹{peakCapital.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                <span className="text-[10px] text-slate-400 block mt-0.5">Highest Vault Value</span>
              </div>

              {/* Card 3: Deepest Dip */}
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-rose-500/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium text-slate-400">Deepest Dip</span>
                  <Waves className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <div className="text-lg font-bold text-rose-400 font-sans">-₹{maxDrawdown.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                <span className="text-[10px] text-slate-400 block mt-0.5">Max Pullback from ATH</span>
              </div>

              {/* Card 4: Retention / Win Rate */}
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-emerald-500/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium text-slate-400">Alpha Retention</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-lg font-bold text-emerald-300 font-sans">{retentionPct}% Retained</div>
                <span className="text-[10px] text-slate-400 block mt-0.5">{winRate}% Win Rate · ₹{totalCharges.toFixed(0)} Drag</span>
              </div>
            </div>
          </div>

          {/* Interactive Trade Milestone Journey 4-5 Column Apple Spatial Bento Grid */}
          <div className="space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 text-[11px] font-bold text-slate-400 font-mono pb-2 border-b border-white/[0.05]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-cyan-400 text-sm">🎯</span>
                <span className="uppercase tracking-wider text-white font-black text-xs sm:text-sm">SETTLED TRADE REEL</span>
                
                {/* Segmented Outcome Filters */}
                <div className="flex rounded-xl bg-white/[0.04] border border-white/10 p-0.5 text-[10px] font-sans">
                  <button
                    type="button"
                    onClick={() => {
                      playScrubAudio();
                      setReelFilter("all");
                    }}
                    className={clsx(
                      "px-2 py-0.5 rounded-lg font-bold transition cursor-pointer",
                      reelFilter === "all" ? "bg-cyan-500/25 text-cyan-300 shadow-sm" : "text-slate-400 hover:text-white"
                    )}
                  >
                    All ({equityPoints.length - 1})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playScrubAudio();
                      setReelFilter("win");
                    }}
                    className={clsx(
                      "px-2 py-0.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1",
                      reelFilter === "win" ? "bg-emerald-500/25 text-emerald-300 shadow-sm" : "text-slate-400 hover:text-white"
                    )}
                  >
                    <span>🟢 Wins</span>
                    <span>({equityPoints.slice(1).filter(p => p.pnl >= 0).length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playScrubAudio();
                      setReelFilter("loss");
                    }}
                    className={clsx(
                      "px-2 py-0.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1",
                      reelFilter === "loss" ? "bg-rose-500/25 text-rose-300 shadow-sm" : "text-slate-400 hover:text-white"
                    )}
                  >
                    <span>🛑 Losses</span>
                    <span>({equityPoints.slice(1).filter(p => p.pnl < 0).length})</span>
                  </button>
                </div>

                {/* Sort Order Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    playScrubAudio();
                    setReelSort(reelSort === "newest" ? "chrono" : "newest");
                  }}
                  className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10 text-[10px] font-mono transition flex items-center gap-1 cursor-pointer active:scale-95"
                  title="Toggle between Newest First and Chronological order"
                >
                  <span>{reelSort === "newest" ? "⏳ Newest First" : "📈 Chronological"}</span>
                </button>

                {activePoint !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      playScrubAudio();
                      setSelectedId(null);
                      setScrubIndex(null);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 text-[10px] font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer shadow-sm animate-pulse"
                    title="Snap curve back to latest trade"
                  >
                    <span>↺ Snap to Latest</span>
                  </button>
                )}
              </div>

              {/* Quick Metrics Pills */}
              <div className="flex items-center gap-2 text-[10px] flex-wrap self-start lg:self-auto">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Best Win: +₹{maxWin.toLocaleString("en-IN")}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Recovery: {recoveryFactor}
                </span>
              </div>
            </div>

            {/* Quick Execution Telemetry Inspector Dock (Apple Spatial Glass with Fluid Motion) */}
            <AnimatePresence mode="wait">
              {activePoint !== null ? (
                <motion.div
                  key={activePoint.id}
                  initial={{ opacity: 0, y: -6, scale: 0.995 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.995 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="relative rounded-2xl bg-gradient-to-r from-[#0c1a2f]/95 via-[#081324]/95 to-[#050d1a]/95 border border-cyan-400/40 p-3 sm:p-3.5 backdrop-blur-2xl shadow-[0_12px_32px_rgba(6,182,212,0.18),inset_0_1px_0_rgba(255,255,255,0.2)]"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Left: Trade Identity & Outcome Badge */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={clsx(
                        "px-2.5 py-1 rounded-xl text-xs font-black font-mono border shadow-sm shrink-0",
                        activePoint.id === "genesis-origin" 
                          ? "bg-white/10 border-white/20 text-white" 
                          : activePoint.pnl >= 0 
                          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" 
                          : "bg-rose-500/20 border-rose-500/40 text-rose-300"
                      )}>
                        {activePoint.id === "genesis-origin" ? "🏛️ BASELINE" : `#${activePoint.index}`}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-xs sm:text-sm truncate">
                            {activePoint.symbol}
                          </span>
                          {activePoint.id !== "genesis-origin" && (
                            <span className={clsx(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border",
                              activePoint.pnl >= 0 
                                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" 
                                : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                            )}>
                              {activePoint.exitPrice && activePoint.targetPrice && activePoint.exitPrice >= activePoint.targetPrice * 0.998
                                ? "🎯 Target Hit"
                                : activePoint.stopLoss && activePoint.entryPrice && Math.abs(activePoint.stopLoss - activePoint.entryPrice) <= 0.25
                                ? "🛡️ Trailed BE Exit"
                                : activePoint.pnl >= 0
                                ? "✅ Profit Exit"
                                : "🛑 Stop Cut"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10.5px] text-slate-400 font-mono block truncate">
                            {activePoint.id === "genesis-origin" ? "Initial Vault Starting Capital" : `Settled at ${activePoint.time}`}
                          </span>
                          {!isTradeOnCurrentPage && (
                            <span className="px-2 py-0.2 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[9.5px] font-mono">
                              📍 Card on Another Page
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Center/Right: Execution Telemetry Metrics & Friction Drag */}
                    {activePoint.id !== "genesis-origin" ? (
                      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap text-xs font-mono self-start lg:self-auto">
                        {activePoint.entryPrice !== null && activePoint.entryPrice !== undefined && (
                          <div className="bg-black/40 px-2.5 py-1 rounded-xl border border-white/5">
                            <span className="text-slate-400 text-[9px] block uppercase">Entry</span>
                            <span className="text-white font-bold">₹{Number(activePoint.entryPrice).toFixed(2)}</span>
                          </div>
                        )}
                        {activePoint.exitPrice !== null && activePoint.exitPrice !== undefined && (
                          <div className="bg-black/40 px-2.5 py-1 rounded-xl border border-white/5">
                            <span className="text-slate-400 text-[9px] block uppercase">Exit</span>
                            <span className="text-white font-bold">₹{Number(activePoint.exitPrice).toFixed(2)}</span>
                          </div>
                        )}
                        {activePoint.targetPrice !== null && activePoint.targetPrice !== undefined && (
                          <div className="bg-black/40 px-2.5 py-1 rounded-xl border border-white/5 hidden xl:block">
                            <span className="text-slate-400 text-[9px] block uppercase">Target</span>
                            <span className="text-emerald-400 font-bold">₹{Number(activePoint.targetPrice).toFixed(2)}</span>
                          </div>
                        )}
                        {activePoint.stopLoss !== null && activePoint.stopLoss !== undefined && (
                          <div className="bg-black/40 px-2.5 py-1 rounded-xl border border-white/5 hidden xl:block">
                            <span className="text-slate-400 text-[9px] block uppercase">Stop Loss</span>
                            <span className="text-rose-400 font-bold">₹{Number(activePoint.stopLoss).toFixed(2)}</span>
                          </div>
                        )}

                        {/* Friction Drag (Brokerage + STT + GST) */}
                        <div className="bg-black/40 px-2.5 py-1 rounded-xl border border-white/5 hidden sm:block">
                          <span className="text-slate-400 text-[9px] block uppercase">Friction Drag</span>
                          <span className="text-amber-400 font-bold">-₹{Number(activePoint.charges || 55.20).toFixed(2)}</span>
                        </div>

                        {/* Net P&L Hero */}
                        <div className="bg-black/50 px-3 py-1 rounded-xl border border-cyan-500/30 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <span className="text-slate-400 text-[9px] block uppercase">Net Realized</span>
                            {activePoint.grossPnl !== undefined && activePoint.charges > 0 && (
                              <span className="text-[9px] text-slate-400">
                                (Gross: {activePoint.grossPnl >= 0 ? "+" : ""}₹{activePoint.grossPnl.toFixed(0)})
                              </span>
                            )}
                          </div>
                          <span className={clsx("font-black text-xs sm:text-sm", activePoint.netPnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                            {activePoint.netPnl >= 0 ? "+" : ""}₹{activePoint.netPnl.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            playScrubAudio();
                            setSelectedId(null);
                            setScrubIndex(null);
                          }}
                          className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer text-xs font-bold shrink-0 ml-auto lg:ml-0"
                          title="Close Inspector & Snap to Latest"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="bg-black/50 px-3 py-1 rounded-xl border border-white/10 text-right font-mono">
                          <span className="text-slate-400 text-[9.5px] block uppercase">Genesis Capital</span>
                          <span className="text-white font-black text-xs sm:text-sm">₹{BASE_CAPITAL.toLocaleString("en-IN")}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            playScrubAudio();
                            setSelectedId(null);
                            setScrubIndex(null);
                          }}
                          className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer text-xs font-bold shrink-0"
                          title="Close Inspector"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="inspector-empty-state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-[11px] font-mono text-slate-400"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400">💡</span>
                    <span className="truncate">Click or use Arrow Keys (←, →, ↑, ↓) to inspect Entry, Exit, Target, Trailing Stop, and Friction Drag.</span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 hidden sm:inline">Press Esc or tap card to reset</span>
                </motion.div>
              )}
            </AnimatePresence>

            {displayReelPoints.length === 0 ? (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>No trades match the current outcome filter. Select "All" to view your complete trade reel.</span>
              </div>
            ) : equityPoints.length <= 1 ? (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] animate-pulse" />
                <span>Vault initialized at ₹1,00,000 baseline. Execute setups to dynamically chart your compounding trajectory!</span>
              </div>
            ) : (
              <div 
                tabIndex={0}
                onKeyDown={handleReelKeyDown}
                title="Trade Reel: Use Arrow Keys (←, →, ↑, ↓) to navigate trades · Esc to snap to live"
                className="max-h-[460px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 scrollbar-track-transparent focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/40 rounded-2xl"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3">
                  {displayReelPoints.map((p) => {
                    const originalIdx = p.originalIndex ?? p.index;
                    const isSelected = activePoint?.id === p.id;
                    const isGenesis = p.id === "genesis-origin" || originalIdx === 0;
                    const isCE = p.symbol && p.symbol.includes("CE");
                    const isPE = p.symbol && p.symbol.includes("PE");
                    const isWin = p.pnl >= 0;

                    if (isGenesis) {
                      return (
                        <button
                          key="genesis-anchor"
                          type="button"
                          onClick={() => {
                            playScrubAudio();
                            setSelectedId(selectedId === p.id ? null : p.id);
                            setScrubIndex(null);
                          }}
                          className={clsx(
                            "p-3 rounded-2xl border text-left font-mono transition-all duration-300 cursor-pointer active:scale-[0.97] flex flex-col justify-between gap-2.5 relative overflow-hidden group/card focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 [content-visibility:auto] [contain-intrinsic-size:110px]",
                            isSelected
                              ? "bg-gradient-to-b from-cyan-500/20 via-[#121424]/95 to-[#0d0f14]/95 border-cyan-400/80 shadow-[0_0_25px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400/40 -translate-y-1"
                              : "bg-[#0d0f14]/90 border-white/10 text-slate-300 hover:border-white/20 hover:shadow-[0_12px_28px_rgba(0,0,0,0.45)] hover:-translate-y-1"
                          )}
                        >
                          <div className="flex items-center justify-between gap-1.5 w-full">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase font-mono bg-slate-500/15 border border-slate-500/30 text-slate-200">
                              🏛️ GENESIS ANCHOR
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">Origin</span>
                          </div>

                          <div className="space-y-0.5 w-full">
                            <span className="text-xs font-bold text-slate-200 truncate block tracking-tight">
                              Vault Starting Capital
                            </span>
                            <div className="text-sm sm:text-base font-black font-mono tracking-tight text-white">
                              ₹{BASE_CAPITAL.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-1 w-full pt-1.5 border-t border-white/[0.05] text-[10.5px] font-mono">
                            <span className="text-slate-400">Compounding Baseline</span>
                            <span className="text-[9px] text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.2 rounded font-bold">
                              Day 0
                            </span>
                          </div>
                        </button>
                      );
                    }

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          playScrubAudio();
                          setSelectedId(selectedId === p.id ? null : p.id);
                          setScrubIndex(null);
                        }}
                        className={clsx(
                          "p-3 rounded-2xl border text-left font-mono transition-all duration-300 cursor-pointer active:scale-[0.97] flex flex-col justify-between gap-2.5 relative overflow-hidden group/card focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060709] [content-visibility:auto] [contain-intrinsic-size:110px]",
                          isSelected
                            ? "bg-gradient-to-b from-cyan-500/15 via-[#121424]/95 to-[#0d0f14]/95 border-cyan-400/80 shadow-[0_0_25px_rgba(6,182,212,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] ring-1 ring-cyan-400/40 -translate-y-1"
                            : "bg-gradient-to-b from-[#121424]/85 via-[#0d0f14]/85 to-[#060709]/85 border-white/[0.07] text-slate-300 hover:text-white hover:from-[#1a1f2c]/90 hover:to-[#0d0f14]/90 hover:border-white/20 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]"
                        )}
                      >
                        {/* Top Row: Jewel Badge + Option Pill + Timestamp */}
                        <div className="flex items-center justify-between gap-1.5 w-full">
                          <div className="flex items-center gap-1.5">
                            <span className={clsx(
                              "px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase font-mono border shadow-sm",
                              isWin 
                                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" 
                                : "bg-rose-500/15 border-rose-500/30 text-rose-300"
                            )}>
                              #{originalIdx}
                            </span>
                            {(isCE || isPE) && (
                              <span className={clsx(
                                "px-1 py-0.2 rounded text-[9px] font-black font-mono border",
                                isCE ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                              )}>
                                {isCE ? "CE" : "PE"}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono truncate">
                            {p.time}
                          </span>
                        </div>

                        {/* Middle: Symbol & Realized P&L + Return % */}
                        <div className="space-y-0.5 w-full min-w-0">
                          <span 
                            title={p.symbol}
                            className="text-xs font-bold text-white truncate block tracking-tight group-hover/card:text-cyan-300 transition-colors"
                          >
                            {p.symbol}
                          </span>
                          <div className="flex items-baseline justify-between gap-1">
                            <div className={clsx("text-sm sm:text-base font-black font-mono tracking-tight", isWin ? "text-emerald-400" : "text-rose-400")}>
                              {isWin ? "+" : ""}₹{p.pnl.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            {p.pnl !== 0 && (
                              <span className={clsx("text-[10px] font-mono font-bold", isWin ? "text-emerald-400/80" : "text-rose-400/80")}>
                                {isWin ? "+" : ""}{((p.pnl / (p.capital - p.pnl || BASE_CAPITAL)) * 100).toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bottom Row: Vault Balance + Drawdown/ATH Pill */}
                        <div className="flex items-center justify-between gap-1 w-full pt-1.5 border-t border-white/[0.05] text-[10.5px] font-mono">
                          <span className="text-slate-400 truncate">
                            ₹{p.capital.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                          </span>
                          {p.drawdownPct > 0 ? (
                            <span className="text-[9px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.2 rounded font-bold">
                              -{p.drawdownPct}% DD
                            </span>
                          ) : (
                            <span className="text-[9px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5">
                              ATH 🌟
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* View Capping / 25-Card Pagination Footer */}
                {totalReelMatches > PAGE_SIZE && (
                  <div className="flex items-center justify-between gap-3 pt-2.5 mt-2 text-[11px] font-mono border-t border-white/[0.06] flex-wrap">
                    <span className="text-slate-400">
                      Showing page <strong className="text-white">{currentPage}</strong> of <strong className="text-white">{totalPages}</strong> ({totalReelMatches} settled trades)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={currentPage <= 1}
                        onClick={() => {
                          playScrubAudio();
                          setReelPage(p => Math.max(1, p - 1));
                        }}
                        className="px-3 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition cursor-pointer active:scale-95"
                      >
                        ← Prev
                      </button>
                      <button
                        type="button"
                        disabled={currentPage >= totalPages}
                        onClick={() => {
                          playScrubAudio();
                          setReelPage(p => Math.min(totalPages, p + 1));
                        }}
                        className="px-3 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed text-cyan-300 hover:text-white border border-cyan-400/30 text-xs font-bold transition cursor-pointer active:scale-95"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === "drawdown" ? (
        /* Underwater Drawdown Valley Map (Apple Spatial Polish) */
        <div className="space-y-4">
          <div className="relative rounded-3xl bg-[#0d0f14]/95 border border-white/[0.07] p-4 sm:p-6 overflow-hidden backdrop-blur-3xl shadow-[0_24px_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)]">
            {/* Ambient Rose/Blood Glow */}
            <div className="absolute -top-24 right-1/3 w-96 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono mb-3.5 relative z-10">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.9)] animate-pulse" />
                <div>
                  <span className="font-black text-white text-xs sm:text-sm tracking-wider uppercase">UNDERWATER DRAWDOWN VALLEY</span>
                  <span className="block text-[10.5px] text-slate-400 font-normal">Capital Preservation &amp; Pullback from All-Time Peak</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
                  0% = All-Time High Peak
                </span>
                <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/25">
                  Max Dip: -{maxDDPct.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="relative w-full overflow-hidden rounded-2xl bg-[#050608]/90 border border-white/[0.06] p-1 sm:p-2">
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-64 sm:h-72 select-none overflow-visible">
                <defs>
                  <linearGradient id="ddValleyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.05" />
                    <stop offset="60%" stopColor="#e11d48" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#881337" stopOpacity="0.45" />
                  </linearGradient>

                  <filter id="roseBloom" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Spatial Grid Background */}
                <rect 
                  x="0" 
                  y={padding.top} 
                  width={width} 
                  height={height - padding.top} 
                  fill="url(#spatialMicroGrid)" 
                />

                {/* 0% Peak Reference Line */}
                <line x1="0" y1={padding.top} x2={width} y2={padding.top} stroke="#06b6d4" strokeWidth="1.5" />
                <text x={width - 16} y={padding.top + 14} textAnchor="end" fill="#06b6d4" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
                  0.0% · ATH PEAK
                </text>

                {/* Max Drawdown Level */}
                <line x1="0" y1={height - 24} x2={width} y2={height - 24} stroke="rgba(244,63,94,0.35)" strokeDasharray="3 3" />
                <text x={width - 16} y={height - 28} textAnchor="end" fill="#f43f5e" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
                  -{maxDDPct.toFixed(1)}% · MAX VALLEY
                </text>

                {/* Drawdown Area Fill & Path */}
                <path d={drawdownArea} fill="url(#ddValleyGrad)" />
                <path d={drawdownPath} fill="none" stroke="#f43f5e" strokeWidth="6" opacity="0.3" filter="url(#roseBloom)" strokeLinecap="round" />
                <path d={drawdownPath} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />

                {/* Drawdown Points */}
                {equityPoints.map((p, i) => {
                  const x = getX(i);
                  const y = getDDY(p.drawdownPct);
                  return (
                    <g key={i}>
                      <circle
                        cx={x}
                        cy={y}
                        r="4"
                        fill={p.drawdown > 0 ? "#f43f5e" : "#06b6d4"}
                        stroke="#070d1a"
                        strokeWidth="2"
                      />
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-300 mt-3 flex items-start gap-2.5">
              <span className="text-rose-400 text-base">🛡️</span>
              <div>
                <strong className="text-white block mb-0.5 font-mono text-[11px]">Why Valley Depth Matters for Institutional Sizing:</strong>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Drawdown measures how far your account dips below its highest historical peak before recovering. A shallow valley (&lt; 3%) is definitive mathematical proof that you maintain strict stop-loss discipline and never revenge trade.
                </p>
              </div>
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
