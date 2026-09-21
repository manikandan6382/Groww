import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { soundEngine } from "../../utils/soundEngine";
import { useTradingStore } from "../../stores/useTradingStore";
import { getLocalDateKey } from "../../utils/dateUtils";
import { Calendar as CalendarIcon, TrendingUp, TrendingDown, Clock, Zap } from "lucide-react";
import clsx from "clsx";

const TIMEFRAME_TABS = [
  { id: "all", label: "All Time" },
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "custom", label: "Custom", icon: CalendarIcon },
];

export function JournalTimeframeTabs({
  journalRange,
  setJournalRange,
  journalCustomStart,
  journalCustomEnd,
  onOpenCalendar
}) {
  const journalTrades = useTradingStore((s) => s.journalTrades || []);

  // 📊 Live Range Telemetry Calculations for Active Timeframe
  const windowMetrics = useMemo(() => {
    const todayKey = getLocalDateKey();
    const filtered = journalTrades.filter((t) => {
      const tradeDate = getLocalDateKey(t.exitDatetime || t.entryDatetime);

      if (journalRange === "today") return tradeDate === todayKey;
      if (journalRange === "week") {
        const d = new Date();
        const day = d.getDay();
        const monday = new Date(d);
        monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        return tradeDate >= getLocalDateKey(monday) && tradeDate <= getLocalDateKey(sunday);
      }
      if (journalRange === "month") {
        const now = new Date();
        const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        return tradeDate.startsWith(prefix);
      }
      if (journalRange === "custom") {
        if (!journalCustomStart) return true;
        if (journalCustomStart && !journalCustomEnd) return tradeDate >= journalCustomStart;
        return tradeDate >= journalCustomStart && tradeDate <= journalCustomEnd;
      }
      return true; // "all"
    });

    const netPnl = filtered.reduce((acc, t) => acc + Number(t.netPnl || 0), 0);
    const wins = filtered.filter((t) => Number(t.netPnl || 0) > 0).length;
    const losses = filtered.filter((t) => Number(t.netPnl || 0) <= 0).length;
    const count = filtered.length;
    const winRate = count > 0 ? Math.round((wins / count) * 100) : 0;

    return {
      netPnl,
      wins,
      losses,
      count,
      winRate
    };
  }, [journalTrades, journalRange, journalCustomStart, journalCustomEnd]);

  const activeLabel =
    journalRange === "today"
      ? "Today"
      : journalRange === "week"
      ? "This Week"
      : journalRange === "month"
      ? "This Month"
      : journalRange === "custom"
      ? "Custom"
      : "All Time";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 border-t border-white/[0.07]">
      {/* Timeframe Tabs with Spring-Physics Segmented Pill */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex items-center gap-1 p-1 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs flex-shrink-0">
          {TIMEFRAME_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = journalRange === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  soundEngine?.playTabSwitchTone?.();
                  setJournalRange(tab.id);
                  if (tab.id === "custom") onOpenCalendar?.();
                }}
                className={clsx(
                  "relative px-3 py-1.5 rounded-lg font-bold transition-colors text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer z-10",
                  isActive
                    ? "text-cyan-200"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeJournalHeroTab"
                    className="absolute inset-0 rounded-lg bg-cyan-500/20 border border-cyan-500/40 shadow-sm shadow-cyan-500/20 z-[-1]"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                {Icon && <Icon className={clsx("w-3.5 h-3.5", isActive ? "text-cyan-400" : "text-slate-400")} />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {journalRange === "custom" && (
          <button
            type="button"
            onClick={onOpenCalendar}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/50 text-cyan-300 text-xs font-mono font-bold transition-all whitespace-nowrap shadow-sm cursor-pointer"
            title="Click to edit custom date range"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span>{journalCustomStart} → {journalCustomEnd}</span>
            <span className="text-[10px] underline ml-1 font-sans text-cyan-300 font-normal">Edit Range</span>
          </button>
        )}
      </div>

      {/* 🚀 Live Range Telemetry HUD (Instant Net P&L & Win Rate for Active Timeframe) */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] shadow-inner text-xs font-mono">
          <span className="text-[11px] text-slate-400 font-sans flex items-center gap-1">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">Window:</span>
            <strong className="text-slate-200 font-mono">{activeLabel}</strong>
          </span>

          <span className="w-px h-3.5 bg-white/10" />

          {/* Window Net P&L */}
          <div className="flex items-center gap-1">
            {windowMetrics.netPnl >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span className={clsx(
              "font-black tracking-tight",
              windowMetrics.netPnl >= 0 ? "text-emerald-400" : "text-rose-400"
            )}>
              {windowMetrics.netPnl >= 0 ? "+" : ""}₹{windowMetrics.netPnl.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
          </div>

          <span className="w-px h-3.5 bg-white/10" />

          {/* Win Rate & Trades Count */}
          <span className="text-cyan-300 font-bold">
            {windowMetrics.winRate}% WR
          </span>
          <span className="text-slate-400 text-[10px] hidden sm:inline">
            ({windowMetrics.wins}W - {windowMetrics.losses}L · {windowMetrics.count}T)
          </span>
        </div>
      </div>
    </div>
  );
}

export default JournalTimeframeTabs;
