import React, { useMemo } from "react";
import clsx from "clsx";
import { Sparkles, Download, Plus, Minus, ShieldCheck, ShieldAlert, ChevronRight, Activity, Flame, FileText, Database } from "lucide-react";
import { useTradingStore } from "../../stores/useTradingStore";
import { useLivePriceStore } from "../../stores/useLivePriceStore";
import { getLocalDateKey, isIndianMarketOpenHours } from "../../utils/dateUtils";
import { soundEngine } from "../../utils/soundEngine";

export function JournalHeroHeader({
  onOpenSafetyGuard,
  onOpenCustomTrade,
  onExportCsv,
  onOpenEodDebrief,
  onOpenBrainBackup,
  isFormVisible,
  onToggleForm
}) {
  const journalTrades = useTradingStore((s) => s.journalTrades || []);
  const brokerStatus = useTradingStore((s) => s.brokerStatus);
  const vixLtp = useLivePriceStore((s) => s.ticks?.["INDIA_VIX"]?.ltp ?? s.sparklines?.["INDIA_VIX"]?.slice(-1)[0] ?? 13.20);
  const isMarketOpen = isIndianMarketOpenHours();

  // 🧠 Memoized IST Day Metrics (Prevents redundant O(N) array filtering on live ticks)
  const { todayTradesCount, lossRunway, isLossCapBreached, isQuotaBreached, todayTotalLossRupees, stopsRemaining } = useMemo(() => {
    const todayKey = getLocalDateKey();
    const todayList = journalTrades.filter((t) => {
      const dateStr = t.exitDatetime || t.entryDatetime || "";
      return dateStr.startsWith(todayKey);
    });

    const losses = todayList.filter((t) => Number(t.netPnl || 0) < 0);
    const totalLoss = Math.abs(losses.reduce((acc, t) => acc + Number(t.netPnl || 0), 0));
    // Manikandan's daily capital risk invariant: ₹750 max risk budget (3 stops x ₹250)
    const runway = Math.max(0, 750 - totalLoss);
    const stopsLeft = Math.max(0, Math.floor(runway / 250));

    return {
      todayTradesCount: todayList.length,
      todayTotalLossRupees: totalLoss,
      lossRunway: runway,
      stopsRemaining: stopsLeft,
      isLossCapBreached: totalLoss >= 750,
      isQuotaBreached: todayList.length >= 3
    };
  }, [journalTrades]);

  // ⚡ Live VIX Volatility Regime Detection
  const vixNum = Number(vixLtp);
  const vixRegime = !isMarketOpen
    ? "Session Closed"
    : vixNum < 13.0
    ? "Ultra-Low Vol · Spread Ready"
    : vixNum <= 16.0
    ? "Calibrated Scalp · High Alpha"
    : vixNum <= 20.0
    ? "Elevated Vol · Momentum Active"
    : "Extreme Vol · Strict Stops";

  const handleSafetyClick = () => {
    if (isLossCapBreached) {
      soundEngine?.playWarningTone?.();
    } else {
      soundEngine?.playTabSwitchTone?.();
    }
    onOpenSafetyGuard?.();
  };

  const handleCustomTradeClick = () => {
    soundEngine?.playTabSwitchTone?.();
    onOpenCustomTrade?.();
  };

  const handleExportClick = () => {
    soundEngine?.playTabSwitchTone?.();
    onExportCsv?.();
  };

  const handleEodDebriefClick = () => {
    soundEngine?.playTabSwitchTone?.();
    onOpenEodDebrief?.();
  };

  const handleBrainBackupClick = () => {
    soundEngine?.playTabSwitchTone?.();
    onOpenBrainBackup?.();
  };

  const handleToggleClick = () => {
    soundEngine?.playTabSwitchTone?.();
    onToggleForm?.();
  };

  const isUpstoxReady = Boolean(brokerStatus?.upstoxConnected || brokerStatus?.upstoxPreMarketReady);
  const isUpstoxExpired = Boolean(brokerStatus?.upstoxExpired);

  return (
    <>
      {/* Top Meta Bar: Status Pills & Interactive Safety Guard */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3.5 border-b border-white/[0.07]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/25 whitespace-nowrap shadow-sm shadow-cyan-500/10 flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-cyan-400" />
            JOURNAL &amp; PERFORMANCE
          </span>

          <span className={clsx(
            "text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1.5 whitespace-nowrap shadow-sm transition-colors",
            isMarketOpen
              ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/25"
              : "text-slate-400 bg-white/[0.03] border-white/10"
          )}>
            <span className={clsx(
              "w-1.5 h-1.5 rounded-full",
              isMarketOpen ? "bg-emerald-400 animate-ping" : "bg-slate-500"
            )} />
            {isMarketOpen ? "Live Market Active" : "Market Dark (Offline)"}
          </span>

          <span className={clsx(
            "text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1.5 whitespace-nowrap shadow-sm transition-colors",
            isUpstoxReady
              ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/25"
              : isUpstoxExpired
              ? "text-rose-400 bg-rose-500/10 border-rose-500/25"
              : "text-slate-400 bg-white/[0.03] border-white/10"
          )}>
            <span className={clsx(
              "w-1.5 h-1.5 rounded-full",
              isUpstoxReady ? "bg-cyan-400" : isUpstoxExpired ? "bg-rose-400 animate-pulse" : "bg-slate-500"
            )} />
            {isUpstoxReady ? "Upstox Live Ready" : isUpstoxExpired ? "Upstox Token Expired" : "Upstox Standby"}
          </span>

          <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/25 whitespace-nowrap font-mono flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-400" />
            <span>India VIX: {vixNum.toFixed(2)} · {vixRegime}</span>
          </span>
        </div>

        {/* Clickable Safety Guard Pill (Opens Circuit Breaker Modal) */}
        <button
          type="button"
          onClick={handleSafetyClick}
          className={clsx(
            "flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full border transition-all duration-200 shadow-sm group whitespace-nowrap cursor-pointer",
            isLossCapBreached
              ? "bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25 hover:border-rose-500/60 shadow-rose-500/20"
              : isQuotaBreached
              ? "bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25 hover:border-amber-500/60 shadow-amber-500/20"
              : "bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-500/50 shadow-cyan-500/10"
          )}
          title="Click to view 3-Trade Quota & ₹750 Max Daily Loss Circuit Breaker Policy"
        >
          {isLossCapBreached ? (
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          )}
          <span>
            {isLossCapBreached
              ? `🛑 Cap Breached: -₹${Math.round(todayTotalLossRupees)} (₹750 Cap)`
              : `🛡️ Daily Shield: ₹${Math.round(lossRunway)} Runway · ${stopsRemaining} Stops Left · ${todayTradesCount}/3 Quota`}
          </span>
          <ChevronRight className="w-3 h-3 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Title and Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Trading Journal &amp; Results</span>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-slate-400">
              v4 Pro
            </span>
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Every trade explained in plain English — track your true take-home earnings, statistical edge, and risk discipline.
          </p>
        </div>

        {/* Action CTAs Dock */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
          <button
            type="button"
            onClick={handleCustomTradeClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 hover:border-purple-500/50 text-purple-300 hover:text-purple-200 text-xs font-bold transition-all shadow-sm cursor-pointer whitespace-nowrap active:scale-95"
            title="Add Custom Trade, Sample Template, or Bulk JSON (Press Shift+N)"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>+ Add Custom Data</span>
          </button>

          <button
            type="button"
            onClick={handleExportClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 text-xs font-bold text-slate-300 hover:text-white transition-all whitespace-nowrap cursor-pointer active:scale-95 shadow-sm"
            title="Export Section 44AD Compliant CSV Tax Audit Report"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Export Tax CSV</span>
            <span className="sm:hidden">CSV</span>
            <span className="text-[10px] font-mono text-cyan-400/80 font-normal">({journalTrades.length})</span>
          </button>

          <button
            type="button"
            onClick={handleEodDebriefClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 hover:border-cyan-500/40 text-xs font-bold text-cyan-300 hover:text-cyan-200 transition-all whitespace-nowrap cursor-pointer active:scale-95 shadow-sm"
            title="Generate & Export Executive 1-Click EOD Debrief Report"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">EOD Debrief</span>
            <span className="sm:hidden">Debrief</span>
          </button>

          <button
            type="button"
            onClick={handleBrainBackupClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 hover:border-emerald-500/40 text-xs font-bold text-emerald-300 hover:text-emerald-200 transition-all whitespace-nowrap cursor-pointer active:scale-95 shadow-sm"
            title="1-Click JSON Backup & Restore Trading Brain across devices"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Brain Backup</span>
            <span className="sm:hidden">Backup</span>
          </button>

          <button
            type="button"
            onClick={handleToggleClick}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 via-cyan-400 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-black font-black text-xs shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/35 transition-all whitespace-nowrap cursor-pointer active:scale-95"
            title="Toggle Fast Trade Logger Form (Hotkey 'N')"
          >
            {isFormVisible ? (
              <Minus className="w-3.5 h-3.5 stroke-[3]" />
            ) : (
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            )}
            <span>{isFormVisible ? "Hide Form" : "Log Trade"}</span>
            <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-black/20 text-black font-extrabold border border-black/10">
              N
            </kbd>
          </button>
        </div>
      </div>
    </>
  );
}

export default JournalHeroHeader;
