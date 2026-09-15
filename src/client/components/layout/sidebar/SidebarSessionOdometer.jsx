import React from "react";
import clsx from "clsx";
import { RollingTicker } from "../../common/RollingTicker";

export function SidebarSessionOdometer({
  todayTradesLength,
  todayWins,
  todayLosses,
  todayNetPnl,
  isTodayProfitable
}) {
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
