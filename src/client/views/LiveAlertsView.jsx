import React, { useState, useEffect } from "react";
import { useTradingStore, resolveIndexLotSize } from "../stores/useTradingStore";
import { soundEngine } from "../utils/soundEngine";
import { OrderPadSection } from "../components/trading/OrderPadSection";
import { PerformanceStudioSection } from "../components/trading/PerformanceStudioSection";
import { TriggeredHistorySection } from "../components/trading/TriggeredHistorySection";
import { ViewErrorBoundary } from "../components/common/ViewErrorBoundary";
import { LiveAlertCard } from "../components/trading/LiveAlertCard";
import { RollingTicker } from "../components/common/RollingTicker";
import { 
  Zap, 
  Radio, 
  Clock, 
  ShieldX, 
  Trophy, 
  ShieldAlert, 
  Target, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  LayoutDashboard,
  ArrowLeftRight, 
  Sparkles, 
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Calendar,
  BarChart3
} from "lucide-react";
import clsx from "clsx";

function LiveFeedClock() {
  const [timeStr, setTimeStr] = useState(() => new Date().toLocaleTimeString("en-IN"));
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString("en-IN"));
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  return <span className="font-semibold text-slate-200">{timeStr}</span>;
}

export function LiveAlertsView() {
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
  const [activeTradesViewMode, setActiveTradesViewMode] = useState("deck"); // "deck" | "compact"
  const [scorecardTimeframe, setScorecardTimeframe] = useState("today"); // "today" | "all"
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

  // Centralized Single-Source-Of-Truth Telemetry (Scoped to Today's Session or All-Time)
  const telemetry = getPortfolioTelemetry ? getPortfolioTelemetry(scorecardTimeframe) : {
    timeframe: scorecardTimeframe,
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

  const {
    startingCapital,
    currentAccountValue,
    netPnl,
    pnlPct,
    winCount,
    lossCount,
    totalClosed,
    winRateNum,
    winRate,
    totalOpenPnl
  } = telemetry;

  const handleConfirmSquareOff = () => {
    soundEngine.playStopLossTone();
    squareOffAll();
    setShowSquareOffModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Practice Terminal Hero Banner */}
      <div className="p-6 sm:p-7 rounded-3xl bg-app-card/75 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)] relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5">
        {/* Soft Ambient Radial Lighting */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/[0.04] rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/[0.03] rounded-full blur-3xl pointer-events-none -ml-16 -mb-16" />

        <div className="relative space-y-1.5">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 shadow-sm whitespace-nowrap">
              PRACTICE TERMINAL
            </span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 shadow-sm flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Zero-Risk Simulation Active
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Live Practice Terminal &amp; Options Desk
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed max-w-2xl">
            Practice real-time NIFTY &amp; BANKNIFTY option setups with simulated cash. Zero financial risk, verified Upstox live market ticks.
          </p>
        </div>

        <div className="relative flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl text-xs font-mono text-slate-300 self-start md:self-auto shadow-sm flex-shrink-0">
          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="font-extrabold text-cyan-400 tracking-wide">UPSTOX LIVE FEED</span>
          <span className="text-white/20">|</span>
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <LiveFeedClock />
        </div>
      </div>

      {/* 🧭 Fast Navigation Anchor Dock (Direct Access to All Sections / Segmented Focus) */}
      <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-app-card/85 backdrop-blur-2xl border border-white/[0.08] shadow-[0_12px_36px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] flex-wrap">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10 flex-wrap">
          <button
            type="button"
            onClick={() => handleSetWorkspaceFocus("all")}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              workspaceFocus === "all"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>All Sections</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleSetWorkspaceFocus("cockpit");
              setTimeout(() => {
                document.getElementById("active-practice-trades")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 50);
            }}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              workspaceFocus === "cockpit"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Active Cockpit ({openAlerts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleSetWorkspaceFocus("studio");
              setTimeout(() => {
                document.getElementById("performance-studio")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 50);
            }}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              workspaceFocus === "studio"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
            <span>Performance Studio</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleSetWorkspaceFocus("ledger");
              setTimeout(() => {
                document.getElementById("practice-history-table")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 50);
            }}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              workspaceFocus === "ledger"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Trophy className="w-3.5 h-3.5 text-emerald-400" />
            <span>Settled Ledger ({closedAlerts.length})</span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-3 text-xs font-mono text-slate-400 pr-2">
          {workspaceFocus !== "all" && (
            <button
              type="button"
              onClick={() => handleSetWorkspaceFocus("all")}
              className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Showing focused dock · View All</span>
            </button>
          )}
          <span className="text-white/20">|</span>
          <span>Simulation: <strong className="text-white">Active</strong></span>
          <span className="text-white/20">|</span>
          <span className="text-emerald-400 font-bold">{telemetry.winRate}% Win Rate</span>
        </div>
      </div>

      {/* 1️⃣ SECTION 1: TOP SCOREBOARD & QUANTITATIVE TELEMETRY */}
      <div className="p-6 sm:p-7 rounded-3xl bg-app-card/75 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-6 relative overflow-hidden">
        {/* Soft Ambient Studio Lighting */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/[0.03] rounded-full blur-3xl pointer-events-none" />
        <div className={clsx(
          "absolute bottom-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none -mr-20 -mb-20",
          netPnl >= 0 ? "bg-emerald-500/[0.04]" : "bg-rose-500/[0.04]"
        )} />

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 shadow-sm whitespace-nowrap">
                VIRTUAL CAPITAL &amp; PERFORMANCE TELEMETRY
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Live Capital &amp; Quantitative Execution Matrix
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time mark-to-market valuations, capital buffer tracking, and quantitative execution ratios.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-3 py-1 rounded-xl bg-white/[0.03] border border-white/10 text-slate-400 font-mono text-[11px] flex items-center gap-1.5 shadow-sm">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>{openAlerts.length} Active Positions</span>
            </span>
          </div>
        </div>

        {/* Row 1: 3-Column Luxury Hero Financial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {/* Card 1: Starting Capital */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 backdrop-blur-xl shadow-lg transition-all duration-300 relative overflow-hidden group">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Starting Capital
              </span>
              <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 shadow-sm group-hover:scale-105 transition-transform">
                <Wallet className="w-4 h-4 text-slate-300" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight block">
              <RollingTicker value={startingCapital} prefix="₹" decimalPlaces={2} />
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5 pt-2.5">
              <span>Virtual Sandbox Cash</span>
              <span className="font-mono text-slate-500 font-bold">100% Buffered</span>
            </div>
          </div>

          {/* Card 2: Current Account Value */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-cyan-500/[0.08] to-white/[0.02] hover:from-cyan-500/[0.12] border border-cyan-500/25 backdrop-blur-xl shadow-[0_10px_30px_rgba(6,182,212,0.1)] transition-all duration-300 relative overflow-hidden group">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                Current Account Value
              </span>
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)] group-hover:scale-105 transition-transform">
                <TrendingUp className="w-4 h-4 text-cyan-300" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-cyan-300 tracking-tight block drop-shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <RollingTicker value={currentAccountValue} prefix="₹" decimalPlaces={2} className="text-cyan-300" />
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-cyan-300/80 border-t border-cyan-500/15 pt-2.5">
              <span>Live Mark-to-Market</span>
              <span className="font-mono font-bold text-cyan-400">Upstox Real-Time</span>
            </div>
          </div>

          {/* Card 3: Net Profit / Loss */}
          <div className={clsx(
            "p-5 sm:p-6 rounded-2xl backdrop-blur-xl transition-all duration-300 relative overflow-hidden group border shadow-lg",
            netPnl >= 0
              ? "bg-gradient-to-b from-emerald-500/[0.08] to-white/[0.02] border-emerald-500/25 shadow-[0_10px_30px_rgba(16,185,129,0.1)]"
              : "bg-gradient-to-b from-rose-500/[0.08] to-white/[0.02] border-rose-500/25 shadow-[0_10px_30px_rgba(244,63,94,0.1)]"
          )}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Net Profit / Loss
              </span>
              <span className={clsx(
                "text-xs font-mono font-black px-2.5 py-0.5 rounded-full border shadow-sm",
                netPnl >= 0
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : "bg-rose-500/20 text-rose-300 border-rose-500/30"
              )}>
                {netPnl >= 0 ? "+" : ""}{pnlPct}%
              </span>
            </div>
            <div className={clsx(
              "text-xl sm:text-2xl font-black font-mono tracking-tight block",
              netPnl >= 0 ? "text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.2)]"
            )}>
              <RollingTicker 
                value={netPnl} 
                prefix="₹" 
                showSign={true} 
                decimalPlaces={2} 
                className={netPnl >= 0 ? "text-emerald-400" : "text-rose-400"}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5 pt-2.5">
              <span>Realized + Open Live P&amp;L</span>
              <span className={clsx("font-mono font-bold", netPnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {netPnl >= 0 ? "Profitable" : "Drawdown"}
              </span>
            </div>
          </div>
        </div>

        {/* Row 2 Header: Apple-style Session Performance Switcher */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>{scorecardTimeframe === "today" ? "Today's Trading Scoreboard" : "All-Time Practice Ledger"}</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {scorecardTimeframe === "today" ? "• Real-Time Active IST Day" : "• Lifetime Historical Edge"}
            </span>
          </div>

          <div className="p-1 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center gap-1 shadow-inner">
            <button
              type="button"
              onClick={() => {
                soundEngine.playTabSwitchTone();
                setScorecardTimeframe("today");
              }}
              className={clsx(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer min-h-[32px]",
                scorecardTimeframe === "today"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
              title="Filter to today's active session trades only"
            >
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>Today's Session</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playTabSwitchTone();
                setScorecardTimeframe("all");
              }}
              className={clsx(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer min-h-[32px]",
                scorecardTimeframe === "all"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
              title="Show all-time historical practice trades"
            >
              <span>All-Time</span>
            </button>
          </div>
        </div>

        {/* Row 2: 4-Column Quantitative Execution Matrix */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Metric 1: Total Trades */}
          <div className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 backdrop-blur-xl shadow-sm transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {scorecardTimeframe === "today" ? "Today's Trades" : "Total Trades"}
              </span>
              <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
                <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <strong className="text-xl sm:text-2xl font-black font-mono text-white">
                {telemetry.openCount + telemetry.totalClosed}
              </strong>
              <span className="text-[10px] text-slate-500 font-sans">Setups</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between font-mono">
              <span>{telemetry.openCount} Open</span>
              <span>{telemetry.totalClosed} Resolved</span>
            </div>
          </div>

          {/* Metric 2: Winning Trades */}
          <div className="p-4 rounded-2xl bg-emerald-500/[0.03] hover:bg-emerald-500/[0.06] border border-emerald-500/20 backdrop-blur-xl shadow-sm transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                Winning Trades
              </span>
              <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
                <Trophy className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <strong className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                {telemetry.winCount}
              </strong>
              <span className="text-[10px] text-emerald-400/70 font-sans">Targets Hit</span>
            </div>
            <div className="text-[10px] text-emerald-400/80 mt-1 font-mono">
              {scorecardTimeframe === "today" ? "Profitable Trades Today" : "Alpha Captured Successfully"}
            </div>
          </div>

          {/* Metric 3: Disciplined Stops */}
          <div className="p-4 rounded-2xl bg-rose-500/[0.03] hover:bg-rose-500/[0.06] border border-rose-500/20 backdrop-blur-xl shadow-sm transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                Disciplined Stops
              </span>
              <div className="w-6 h-6 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-300">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <strong className="text-xl sm:text-2xl font-black font-mono text-rose-400">
                {telemetry.lossCount}
              </strong>
              <span className="text-[10px] text-rose-400/70 font-sans">Stops Cut</span>
            </div>
            <div className="text-[10px] text-rose-400/80 mt-1 font-mono">
              {scorecardTimeframe === "today" ? "Cut Cleanly by Rules Today" : "Capital Preserved by Rules"}
            </div>
          </div>

          {/* Metric 4: Target Win Rate */}
          <div className="p-4 rounded-2xl bg-cyan-500/[0.03] hover:bg-cyan-500/[0.06] border border-cyan-500/20 backdrop-blur-xl shadow-sm transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider">
                Target Win Rate
              </span>
              <div className="w-6 h-6 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                <Target className="w-3.5 h-3.5 text-cyan-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <strong className="text-xl sm:text-2xl font-black font-mono text-cyan-300">
                {telemetry.winRate}%
              </strong>
              <span className="text-[10px] text-cyan-400/70 font-sans">{telemetry.totalClosed > 0 ? "Edge" : "No Trades"}</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
              <div 
                className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(Math.max(telemetry.winRateNum, telemetry.totalClosed > 0 ? 5 : 0), 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2️⃣ & 3️⃣ SECTION 2 & 3: ACTIVE COCKPIT (ORDER PAD & ACTIVE POSITIONS) */}
      {(workspaceFocus === "all" || workspaceFocus === "cockpit") && (
        <>
          <OrderPadSection />

          <div id="active-practice-trades" className="p-6 sm:p-7 rounded-3xl bg-app-card/75 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-6 relative overflow-hidden">
        {/* Soft Ambient Studio Lighting */}
        <div className="absolute top-0 left-1/3 w-80 h-80 bg-cyan-500/[0.03] rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 shadow-sm whitespace-nowrap">
                ACTIVE ORDERS &amp; POSITIONS
              </span>
              <span className="text-[10px] font-bold text-slate-300 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10 shadow-sm">
                {openAlerts.length} Positions Live
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
              My Active Practice Trades
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Real-time mark-to-market delta tracking with automated target and stop-loss triggers.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-shrink-0 flex-wrap">
            {/* Apple Segmented View Switcher */}
            <div className="p-1 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center gap-1 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTabSwitchTone();
                  setActiveTradesViewMode("deck");
                }}
                className={clsx(
                  "px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer",
                  activeTradesViewMode === "deck"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                    : "text-slate-400 hover:text-white"
                )}
                title="Full-Column Expansive Pro Deck (Recommended)"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Pro Deck</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTabSwitchTone();
                  setActiveTradesViewMode("compact");
                }}
                className={clsx(
                  "px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer",
                  activeTradesViewMode === "compact"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                    : "text-slate-400 hover:text-white"
                )}
                title="High-Density Compact Terminal Row"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Compact</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowSquareOffModal(true)}
              disabled={openAlerts.length === 0}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 active:scale-95 border border-rose-500/30 text-rose-300 font-bold text-xs transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
            >
              <ShieldX className="w-4 h-4 text-rose-400" />
              <span>Square Off All</span>
            </button>
            <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-2xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 shadow-sm">
              {openAlerts.length} ACTIVE
            </span>
          </div>
        </div>

        {/* Active Trade Cards (Full-Width Responsive Flow) */}
        {openAlerts.length === 0 ? (
          <div className="empty-trades-dock py-12 px-6 rounded-2xl bg-white/[0.01] border border-dashed border-white/10 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-2xl mx-auto shadow-inner">
              🏖️
            </div>
            <div className="space-y-1">
              <div className="text-base font-bold text-white tracking-tight">No Active Practice Trades</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Configure an Option Scalp in Section 2 above and click <strong className="text-cyan-300">Deploy Live Practice Trade</strong>, or auto-deploy below:
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playOrderFillTone();
                  autoDeployCopilotTrade({ underlying: "NIFTY", strikePrice: 24500, entryPrice: 85.0, stopLoss: 75.0, targetPrice: 105.0 });
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/20 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>🚀 Instant 1-Lot NIFTY Scalp</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6 w-full">
            {openAlerts.map((trade) => (
              <ViewErrorBoundary key={trade.id} fallbackTitle="Active Practice Trade Card Unavailable">
                <LiveAlertCard 
                  alert={trade}
                  viewMode={activeTradesViewMode}
                  onClose={(tradeId, exitPrice) => handleSquareOffWithToast(tradeId, exitPrice)} 
                />
              </ViewErrorBoundary>
            ))}
          </div>
        )}
      </div>

      {/* Safety Confirmation Modal: Square Off All */}
      {showSquareOffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-fadeIn">
          <div className="relative w-full max-w-md p-6 sm:p-7 rounded-3xl bg-[#121424]/95 border border-rose-500/30 shadow-[0_25px_60px_rgba(244,63,94,0.25)] space-y-5 overflow-hidden">
            {/* Ambient Rose Light */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-md flex-shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white tracking-tight">
                  Square Off All Active Positions?
                </h3>
                <span className="text-[11px] text-slate-400">
                  Dual-confirmation safety shield active
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              You are about to execute market square-off orders for all <strong className="text-white font-mono">{openAlerts.length} active position(s)</strong>.
            </p>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Estimated Open MTM P&amp;L:</span>
              <strong className={clsx("font-bold text-sm", totalOpenPnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {totalOpenPnl >= 0 ? "+" : ""}₹{totalOpenPnl.toFixed(2)}
              </strong>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSquareOffModal(false)}
                className="flex-1 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition shadow-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSquareOff}
                className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 active:scale-95 text-xs font-black text-white shadow-lg shadow-rose-500/30 transition-all"
              >
                Confirm Liquidation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 Interactive Glassmorphic Settlement HUD Toast */}
      {settlementToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div className="p-4 sm:p-5 rounded-3xl bg-[#121424]/95 border border-cyan-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl max-w-sm w-full space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <strong className="text-white font-mono text-xs font-bold">{settlementToast.symbol}</strong>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/20">
                  Squared Off @ ₹{settlementToast.exitPrice}
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => setSettlementToast(null)} 
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between text-xs font-mono pt-1 border-t border-white/5">
              <span className="text-slate-400">Net Realized P&amp;L:</span>
              <strong className={settlementToast.netPnl >= 0 ? "text-emerald-400 font-black text-sm" : "text-rose-400 font-black text-sm"}>
                {settlementToast.netPnl >= 0 ? "+" : ""}₹{settlementToast.netPnl?.toFixed(2)}
              </strong>
            </div>

            <div className="space-y-1 text-[10px] text-slate-400 pt-0.5 border-t border-white/5">
              <div className="flex items-center justify-between">
                <span>Statutory Friction: -₹{settlementToast.taxesAndCharges?.toFixed(2) || "56.00"}</span>
                {settlementToast.slippageCost > 0 && (
                  <span className="text-amber-400/90 font-mono font-bold">Slippage Penalty: -₹{settlementToast.slippageCost?.toFixed(1)}</span>
                )}
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-500 font-mono">
                  {settlementToast.closeReason?.replace(/_/g, " ") || "SETTLED"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const id = settlementToast.id || settlementToast.serverId;
                    setSettlementToast(null);
                    const rowElem = document.getElementById(`trade-row-${id}`);
                    if (rowElem) {
                      rowElem.scrollIntoView({ behavior: "smooth", block: "center" });
                      rowElem.classList.add("bg-cyan-500/30", "ring-2", "ring-cyan-400");
                      setTimeout(() => rowElem.classList.remove("bg-cyan-500/30", "ring-2", "ring-cyan-400"), 3500);
                    } else {
                      const ledger = document.getElementById("trade-history-ledger");
                      if (ledger) ledger.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }}
                  className="px-3 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold text-[11px] border border-cyan-500/30 flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-sm"
                >
                  <span>Highlight in Ledger</span>
                  <ArrowUpRight className="w-3 h-3 text-cyan-400" />
                </button>
              </div>
            </div>

            {/* Auto-dismiss animated progress bar */}
            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
              <div className="bg-cyan-400 h-full rounded-full animate-pulse" style={{ width: "100%" }} />
            </div>
          </div>
        </div>
      )}

      {/* 🚀 Glassmorphic Position Deployment Toast HUD */}
      {deployToast && (
        <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:bottom-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div className="p-4 sm:p-5 rounded-3xl bg-[#121424]/95 border border-emerald-500/40 shadow-[0_20px_50px_rgba(16,185,129,0.25)] backdrop-blur-2xl max-w-sm sm:max-w-md w-full space-y-3 relative overflow-hidden">
            {/* Soft Emerald Ambient Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none -mr-8 -mt-8" />

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  🚀 Trade Deployed
                </span>
                <strong className="text-white font-mono text-xs font-bold">{deployToast.symbol}</strong>
              </div>
              <button 
                type="button" 
                onClick={() => setDeployToast(null)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 py-1.5 px-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-center text-[10px] font-mono">
              <div>
                <span className="text-slate-400 block text-[10px]">Entry (Fill)</span>
                <strong className="text-white font-bold">₹{Number(deployToast.entryPrice || 0).toFixed(2)}</strong>
              </div>
              <div className="border-x border-white/5">
                <span className="text-rose-400 block text-[10px]">Stop Loss</span>
                <strong className="text-rose-300 font-bold">₹{Number(deployToast.stopLoss || 0).toFixed(2)}</strong>
              </div>
              <div>
                <span className="text-emerald-400 block text-[10px]">Target</span>
                <strong className="text-emerald-300 font-bold">₹{Number(deployToast.targetPrice || 0).toFixed(2)}</strong>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-0.5">
              <span className="text-slate-400 font-mono text-[10px]">
                {deployToast.quantity || 1} Lot ({resolveIndexLotSize(deployToast.symbol, deployToast.lotSize) * (deployToast.quantity || 1)} Qty)
              </span>
              <button
                type="button"
                onClick={() => {
                  const activeSection = document.getElementById("active-practice-trades");
                  if (activeSection) {
                    activeSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
                  }
                  setDeployToast(null);
                }}
                className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 hover:underline text-xs cursor-pointer"
              >
                <span>🎯 Jump to Active Card</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Auto-dismiss animated countdown progress bar */}
            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-400 to-cyan-400 h-full rounded-full animate-pulse" style={{ width: "100%" }} />
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* 4️⃣ SECTION 4: PERFORMANCE & TRADE REVIEW STUDIO */}
      {(workspaceFocus === "all" || workspaceFocus === "studio") && (
        <div id="performance-studio">
          <PerformanceStudioSection />
        </div>
      )}

      {/* 5️⃣ SECTION 5: TRIGGERED PRACTICE HISTORY & AUDIT LEDGER */}
      {(workspaceFocus === "all" || workspaceFocus === "ledger") && (
        <div id="practice-history-table">
          <ViewErrorBoundary fallbackTitle="Settled Practice History Unavailable">
            <TriggeredHistorySection />
          </ViewErrorBoundary>
        </div>
      )}

      {/* 🚀 Sticky Floating Emergency Exit Deck on Scroll */}
      <div
        className={clsx(
          "fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 pointer-events-auto",
          isScrolledDown && openAlerts.length > 0
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-8 scale-95 pointer-events-none"
        )}
      >
        <div className="px-4 py-2.5 rounded-2xl bg-[var(--card)] backdrop-blur-2xl border border-[var(--line)] shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex items-center gap-3.5 text-xs">
          {/* Status Beacon & Metrics */}
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                "w-2 h-2 rounded-full animate-ping",
                (totalOpenPnl ?? 0) >= 0 ? "bg-emerald-400" : "bg-rose-500"
              )}
            />
            <span className="text-slate-400 font-mono hidden sm:inline">Active Net:</span>
            <span
              className={clsx(
                "font-mono font-black text-sm tabular-nums",
                (totalOpenPnl ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"
              )}
            >
              {(totalOpenPnl ?? 0) >= 0 ? "+" : ""}₹{Number(totalOpenPnl || 0).toFixed(2)}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 whitespace-nowrap">
              {openAlerts.length} Live
            </span>
          </div>

          <div className="h-4 w-px bg-white/10" />

          {/* Jump to Cockpit Button */}
          <button
            type="button"
            onClick={() => {
              const activeSection = document.getElementById("active-practice-trades");
              if (activeSection) {
                activeSection.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }}
            className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <span>View Cards</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>

          {/* Instant Emergency Square Off All Button */}
          <button
            type="button"
            onClick={() => setShowSquareOffModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldX className="w-3.5 h-3.5" />
            <span>Square Off All</span>
          </button>
        </div>
      </div>
    </div>
  );
}
