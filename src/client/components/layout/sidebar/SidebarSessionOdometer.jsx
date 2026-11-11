import React from "react";
import clsx from "clsx";
import { RollingTicker } from "../../common/RollingTicker";

export function SidebarSessionOdometer({
  todayTradesLength,
  todayWins,
  todayLosses,
  todayNetPnl,
  isTodayProfitable,
  isPinned = true
}) {
  if (!isPinned) {
    return (
      <div 
        className={clsx(
          "p-2 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all cursor-default shadow-sm relative group",
          isTodayProfitable 
            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]" 
            : "bg-rose-500/10 border-rose-500/25 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.15)]"
        )}
      >
        <span className="text-[8px] font-mono font-black uppercase tracking-tighter">
          {todayTradesLength > 0 ? (isTodayProfitable ? "P&L +" : "P&L -") : "FLAT"}
        </span>
        <span className="font-mono text-[10px] font-black leading-none">
          {todayTradesLength > 0 ? `${todayWins}W` : "0T"}
        </span>

        {/* 🌟 Instant Floating Apple Vision Pro Glass Tooltip */}
        <div className="absolute left-full ml-3 px-3 py-2 rounded-2xl bg-[#0d111a]/95 border border-white/15 shadow-[0_12px_32px_rgba(0,0,0,0.8)] backdrop-blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-[60] flex flex-col -translate-x-1 group-hover:translate-x-0 text-left font-mono">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Session Take-Home</span>
          <span className={clsx("text-xs font-black", isTodayProfitable ? "text-emerald-400" : "text-rose-400")}>
            {todayNetPnl >= 0 ? "+" : ""}₹{Number(todayNetPnl).toFixed(2)}
          </span>
          <span className="text-[9px] text-slate-400 pt-0.5">
            {todayTradesLength > 0 ? `${todayWins} Wins · ${todayLosses} Losses` : "0 trades today"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] space-y-2">
      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>Session Take-Home</span>
        </span>
        <span className="font-mono text-slate-400">
          {todayTradesLength > 0 ? `${todayWins}W · ${todayLosses}L` : "0 Trades"}
        </span>
      </div>

      <div className="flex items-baseline justify-between">
        <div className={clsx("font-mono text-sm font-black tracking-tight", isTodayProfitable ? "text-emerald-400" : "text-rose-400")}>
          <RollingTicker
            value={todayNetPnl}
            prefix="₹"
            showSign={true}
            decimalPlaces={2}
            className={isTodayProfitable ? "text-emerald-400 font-black" : "text-rose-400 font-black"}
          />
        </div>
        <span className={clsx("text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full", todayTradesLength > 0 ? (isTodayProfitable ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/15 text-rose-300 border border-rose-500/30") : "bg-white/5 text-slate-400 border border-white/10")}>
          {todayTradesLength > 0 ? (isTodayProfitable ? "PROFIT" : "LOSS") : "FLAT"}
        </span>
      </div>
    </div>
  );
}
