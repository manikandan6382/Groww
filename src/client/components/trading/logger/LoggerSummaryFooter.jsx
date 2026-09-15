import React from "react";
import clsx from "clsx";
import { PlusCircle, AlertCircle } from "lucide-react";

export function LoggerSummaryFooter({
  isHighFrictionDrag,
  targetPts,
  frictionPts,
  pts,
  isProfit,
  grossPnl,
  totalFriction,
  netTakeHomePnl,
  submitting,
}) {
  return (
    <>
      {/* ⚠️ High Friction Drag Expectancy Warning */}
      {isHighFrictionDrag && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-200 animate-fadeIn">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Micro-Scalp Friction Warning:</strong> Target (+{targetPts.toFixed(1)} pts) is too narrow compared to statutory drag ({frictionPts.toFixed(1)} pts / {Math.round((frictionPts / targetPts) * 100)}% drag). To maintain positive live expectancy after taxes, target should be &ge; {Math.ceil(frictionPts * 3)} pts.
            </span>
          </span>
          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0 self-start sm:self-auto">
            Low Expectancy
          </span>
        </div>
      )}

      {/* Bottom P&L & Statutory Tax Deductor Output Ribbon */}
      <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Points Captured</span>
            <strong className={clsx("text-sm font-mono font-bold tabular-nums", isProfit ? "text-emerald-400" : "text-rose-400")}>
              {pts >= 0 ? "+" : ""}{pts.toFixed(2)} pts
            </strong>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Gross P&amp;L</span>
            <strong className="text-sm font-mono font-bold tabular-nums text-slate-300">
              {grossPnl >= 0 ? "+" : ""}₹{grossPnl.toFixed(2)}
            </strong>
          </div>

          <div>
            <span className="text-[10px] text-amber-400/90 font-bold uppercase block flex items-center gap-1">
              Est. Taxes &amp; Friction (STT+GST)
            </span>
            <strong className="text-sm font-mono font-bold tabular-nums text-amber-400">
              -₹{totalFriction.toFixed(2)}
            </strong>
          </div>

          <div className="pl-2 border-l border-white/10">
            <span className="text-[10px] text-cyan-400 font-extrabold uppercase block">True Net Take-Home</span>
            <strong className={clsx("text-lg font-mono font-black tabular-nums", isProfit ? "text-emerald-400" : "text-rose-400")}>
              {netTakeHomePnl >= 0 ? "+" : ""}₹{netTakeHomePnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 apple-btn-primary flex items-center gap-2 text-xs font-bold cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{submitting ? "Saving Story..." : "Log Take-Home Profit Story (Enter)"}</span>
        </button>
      </div>
    </>
  );
}
