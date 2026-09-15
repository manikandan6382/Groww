import React from "react";
import clsx from "clsx";
import { RollingTicker } from "../../common/RollingTicker";

export function DailySessionCard({ session }) {
  return (
    <div
      className={clsx(
        "p-3.5 rounded-2xl border transition group relative overflow-hidden flex flex-col justify-between space-y-2",
        session.win
          ? "bg-gradient-to-br from-emerald-500/[0.04] to-transparent border-emerald-500/20 hover:border-emerald-500/40"
          : "bg-gradient-to-br from-rose-500/[0.04] to-transparent border-rose-500/20 hover:border-rose-500/40"
      )}
    >
      {/* Header Row: Date Pill & Outcome Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={clsx("w-2 h-2 rounded-full", session.win ? "bg-emerald-400 shadow-sm shadow-emerald-500/50" : "bg-rose-400 shadow-sm shadow-rose-500/50")} />
          <span className="font-bold text-white text-xs">{session.date}</span>
          <span className="text-[10px] text-slate-400 font-mono font-normal">({session.day})</span>
        </div>

        <span
          className={clsx(
            "text-[9px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded-md border",
            session.win
              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
              : "bg-rose-500/15 text-rose-300 border-rose-500/30"
          )}
        >
          {session.win ? "GREEN" : "RED"}
        </span>
      </div>

      {/* Main Metric Row: PnL Display with Rolling Odometer Animation */}
      <div>
        <span className="text-[10px] text-slate-400 block">Session Net Take-Home</span>
        <div className={clsx("font-mono text-base font-black block tracking-tight", session.win ? "text-emerald-400" : "text-rose-400")}>
          <RollingTicker 
            value={session.pnl} 
            prefix="₹" 
            showSign={true} 
            decimalPlaces={2} 
            className={session.win ? "text-emerald-400" : "text-rose-400"}
          />
        </div>
      </div>

      {/* Footer Sub-row: Best Performer / Trade Tag */}
      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
        <span className="truncate max-w-[120px]">⭐ {session.topSymbol}</span>
        <span className="text-slate-500">{session.tradesCount} {session.tradesCount === 1 ? "trade" : "trades"}</span>
      </div>
    </div>
  );
}
