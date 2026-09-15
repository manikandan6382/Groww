import React from "react";
import { DollarSign, ShieldCheck, Activity, Zap } from "lucide-react";
import clsx from "clsx";

export const LiveCardActionFooter = ({
  onPayMyself,
  onLockTrueBe,
  onLaunchSimulator,
  onSquareOff,
  isScaling,
  isClosing,
  isProtected,
  isGain,
  pts,
  noiseBufferPts,
  quantity
}) => {
  return (
    <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] bg-white/[0.01]">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Pay Myself (Mark Douglas Scale-Out) */}
        <button
          onClick={onPayMyself}
          disabled={isScaling}
          className="px-3 py-2 rounded-xl text-xs font-bold font-mono tracking-tight bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(245,158,11,0.12)] disabled:opacity-50 cursor-pointer"
          type="button"
          title="Bank tranche profit and lock risk-free stop (Mark Douglas Principle #5)"
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>{isScaling ? "BANKING..." : quantity > 1 ? "PAY MYSELF (1 LOT)" : "PAY MYSELF (LOCK BE)"}</span>
        </button>

        {/* Lock True Breakeven */}
        <button
          onClick={onLockTrueBe}
          disabled={isProtected}
          className={clsx(
            "px-3 py-2 rounded-xl text-xs font-bold font-mono tracking-tight border flex items-center gap-1.5 transition-all cursor-pointer",
            isProtected
              ? "bg-cyan-500/10 text-cyan-300/60 border-cyan-500/20 cursor-not-allowed"
              : "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
          )}
          type="button"
          title="Locks Stop Loss to cover all friction & commissions (100% Risk-Free)"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{isProtected ? "100% ZERO RISK" : "MAKE 100% SAFE"}</span>
        </button>

        {/* Simulator Interlink */}
        <button
          onClick={onLaunchSimulator}
          className="px-2.5 py-2 rounded-xl text-xs font-mono font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 flex items-center gap-1 transition-colors cursor-pointer"
          type="button"
          title="Simulate option price outcome with Greeks"
        >
          <Activity className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">SIMULATE</span>
        </button>
      </div>

      <button
        onClick={onSquareOff}
        disabled={isClosing}
        className="px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-tight bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(225,29,72,0.3)] disabled:opacity-50 cursor-pointer"
        type="button"
      >
        <Zap className="w-3.5 h-3.5" />
        <span>{isClosing ? "CLOSING..." : "CASH OUT NOW"}</span>
      </button>
    </div>
  );
};
