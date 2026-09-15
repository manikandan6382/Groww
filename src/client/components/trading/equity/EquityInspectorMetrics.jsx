import React from "react";
import clsx from "clsx";

export function EquityInspectorMetrics({ activePoint, onReset }) {
  return (
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

      <div className="bg-black/40 px-2.5 py-1 rounded-xl border border-white/5 hidden sm:block">
        <span className="text-slate-400 text-[9px] block uppercase">Friction Drag</span>
        <span className="text-amber-400 font-bold">-₹{Number(activePoint.charges || 55.20).toFixed(2)}</span>
      </div>

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
        onClick={onReset}
        className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer text-xs font-bold shrink-0 ml-auto lg:ml-0"
        title="Close Inspector & Snap to Latest"
      >
        ✕
      </button>
    </div>
  );
}
