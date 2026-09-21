import React from "react";
import clsx from "clsx";
import { RollingTicker } from "../../common/RollingTicker";
import { ShieldAlert } from "lucide-react";

export function DailySessionCard({ session, isSelected = false, onSelect }) {
  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect && onSelect()}
      className={clsx(
        "p-3.5 rounded-2xl border transition-all duration-300 group relative overflow-hidden flex flex-col justify-between space-y-2.5 cursor-pointer select-none",
        isSelected
          ? "ring-2 ring-cyan-400 bg-cyan-500/15 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
          : session.win
          ? "bg-[#0d111a]/85 border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/[0.04]"
          : "bg-[#0d111a]/85 border-rose-500/20 hover:border-rose-500/40 hover:bg-rose-500/[0.04]"
      )}
    >
      {/* Top Ambient Glow */}
      <div className={clsx(
        "absolute -top-12 -right-12 w-24 h-24 rounded-full blur-2xl pointer-events-none transition-opacity",
        session.win ? "bg-emerald-500/[0.08]" : "bg-rose-500/[0.08]"
      )} />

      {/* Header Row: Date Pill & Outcome Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={clsx(
            "w-2 h-2 rounded-full flex-shrink-0",
            session.win ? "bg-emerald-400 shadow-sm shadow-emerald-500/50" : "bg-rose-400 shadow-sm shadow-rose-500/50"
          )} />
          <span className="font-bold text-white text-xs truncate">{session.date}</span>
          <span className="text-[10px] text-slate-400 font-mono font-normal">({session.day})</span>
        </div>

        <div className="flex items-center gap-1">
          {session.riskInvariantViolated && (
            <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-0.5">
              <ShieldAlert className="w-2.5 h-2.5" />
              <span>&gt;₹300</span>
            </span>
          )}
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
      </div>

      {/* Main Metric Row: PnL Display with Rolling Odometer Animation */}
      <div>
        <span className="text-[10px] text-slate-400 block font-medium">Session Net Take-Home</span>
        <div className={clsx("font-mono text-base font-black block tracking-tight mt-0.5", session.win ? "text-emerald-400" : "text-rose-400")}>
          <RollingTicker 
            value={session.pnl} 
            prefix="₹" 
            showSign={true} 
            decimalPlaces={2} 
            className={session.win ? "text-emerald-400" : "text-rose-400"}
          />
        </div>
      </div>

      {/* Footer Sub-row: Best Performer / Trade Count */}
      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-slate-400 font-mono">
        <span className="truncate max-w-[120px] text-slate-300">
          ⭐ {session.topSymbol}
        </span>
        <span className="text-slate-400">
          {session.winCount}W · {session.lossCount}L ({session.tradesCount})
        </span>
      </div>
    </div>
  );
}

export default DailySessionCard;

