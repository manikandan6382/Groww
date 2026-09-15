import React from "react";
import { Zap, ShieldCheck, ArrowUpRight, ArrowDownRight } from "lucide-react";
import clsx from "clsx";
import { getLiveLtp, calculateLiveMetrics } from "./historyHelpers";

export const ActivePositionsDock = ({
  openAlerts = [],
  ticks = {},
  onSquareOff
}) => {
  if (!openAlerts || openAlerts.length === 0) return null;

  return (
    <div className="flex flex-col space-y-2.5 p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20">
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-bold text-cyan-300 uppercase tracking-wider">Active In-Flight Orders ({openAlerts.length})</span>
        </div>
        <span className="text-white/40 text-[11px]">Real-Time Upstox WebSocket Stream</span>
      </div>

      <div className="flex flex-col space-y-2">
        {openAlerts.map((trade) => {
          const ltp = getLiveLtp(trade, ticks);
          const metrics = calculateLiveMetrics(trade, ltp);
          const isGain = metrics.grossPnl >= 0;
          const isCE = trade.symbol?.includes("CE");

          return (
            <div
              key={`active-pos-${trade.id}`}
              className="p-3 rounded-xl bg-black/40 border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{trade.symbol}</span>
                <span className={clsx("px-1.5 py-0.5 rounded text-[10px] font-bold uppercase", isCE ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300")}>
                  {isCE ? "CALL" : "PUT"}
                </span>
                <span className="text-white/40">{trade.quantity} Lots</span>
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <span className="text-white/40 text-[10px] block">Entry</span>
                  <span className="text-slate-300 font-bold">₹{Number(trade.entryPrice || 0).toFixed(2)}</span>
                </div>

                <div>
                  <span className="text-white/40 text-[10px] block">LTP</span>
                  <span className={clsx("font-bold tabular-nums", isGain ? "text-emerald-400" : "text-rose-400")}>
                    ₹{ltp.toFixed(2)}
                  </span>
                </div>

                <div className={clsx("px-2.5 py-1 rounded-lg border flex items-center gap-1 font-bold", isGain ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-rose-500/10 border-rose-500/30 text-rose-300")}>
                  {isGain ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  <span>{isGain ? "+" : ""}₹{metrics.grossPnl.toFixed(2)}</span>
                  <span className="text-[10px] opacity-70">({metrics.returnPct.toFixed(1)}%)</span>
                </div>

                <button
                  onClick={() => onSquareOff && onSquareOff(trade.id, ltp, "MANUAL_SQUARE_OFF")}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 flex items-center gap-1 font-bold transition-colors cursor-pointer"
                  type="button"
                >
                  <Zap className="w-3 h-3" />
                  <span>Square Off</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
