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
  quantity,
  netRupees,
  focusMode = "cash"
}) => {
  const canLockProfit = isGain && Number(pts) >= 1.0;
  const payMyselfDisabled = isScaling || !canLockProfit;
  const lockBeDisabled = isProtected || !canLockProfit;

  return (
    <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] bg-white/[0.01]">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Pay Myself (Mark Douglas Scale-Out) */}
        <button
          onClick={onPayMyself}
          disabled={payMyselfDisabled}
          className={clsx(
            "px-3 py-2 rounded-xl text-xs font-bold font-mono tracking-tight flex items-center gap-1.5 transition-all border",
            payMyselfDisabled
              ? "bg-white/[0.02] text-zinc-500 border-white/5 cursor-not-allowed opacity-50"
              : "bg-gradient-to-r from-amber-500/25 to-amber-600/25 hover:from-amber-500/35 hover:to-amber-600/35 text-amber-300 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)] ring-1 ring-amber-400/30 cursor-pointer animate-pulse"
          )}
          type="button"
          title={
            !canLockProfit
              ? "Disabled: Trade is currently at a loss or flat. You can only 'Pay Myself' when in profit (≥ +1.0 pt). Use CASH OUT NOW to cut losses immediately."
              : "Bank tranche profit and lock risk-free stop (Mark Douglas Principle #5)"
          }
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>
            {isScaling
              ? "BANKING..."
              : quantity > 1
              ? "PAY MYSELF (1 LOT)"
              : Number(pts) >= 2.5
              ? "PAY MYSELF (LOCK 75%)"
              : "PAY MYSELF (LOCK BE)"}
          </span>
        </button>

        {/* Lock True Breakeven */}
        <button
          onClick={onLockTrueBe}
          disabled={lockBeDisabled}
          className={clsx(
            "px-3 py-2 rounded-xl text-xs font-bold font-mono tracking-tight border flex items-center gap-1.5 transition-all",
            lockBeDisabled
              ? "bg-white/[0.02] text-zinc-500 border-white/5 cursor-not-allowed opacity-50"
              : "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.15)] cursor-pointer"
          )}
          type="button"
          title={
            isProtected
              ? "Already protected: Stop loss is at or above True Breakeven"
              : !canLockProfit
              ? "Disabled: Cannot lock Breakeven while trade is in a loss. Breakeven is above current market price. Use CASH OUT NOW to exit."
              : "Locks Stop Loss to cover all friction & commissions (100% Risk-Free)"
          }
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{isProtected ? "100% ZERO RISK" : "MAKE 100% SAFE"}</span>
        </button>

        {/* Simulator Interlink */}
        <button
          onClick={onLaunchSimulator}
          className="px-3 py-2 rounded-xl text-xs font-mono font-bold tracking-tight text-purple-300 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(168,85,247,0.15)] cursor-pointer active:scale-95"
          type="button"
          title="Launch Interactive Payoff & Greeks Simulator: Loads this exact trade into the visual P&L curve to test what happens if spot moves"
        >
          <Activity className="w-3.5 h-3.5 text-purple-400" />
          <span>SIMULATE</span>
        </button>
      </div>

      <button
        onClick={onSquareOff}
        disabled={isClosing}
        title={typeof netRupees === "number" ? `Exit entire position at current market price (Net P&L: ${netRupees >= 0 ? "+" : ""}₹${netRupees.toFixed(2)})` : "Instantly exit the entire position at current market price"}
        className={clsx(
          "px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-tight flex items-center gap-1.5 transition-all shadow-lg disabled:opacity-50 cursor-pointer active:scale-95",
          typeof netRupees === "number" && netRupees >= 0
            ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25"
            : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30"
        )}
        type="button"
      >
        <Zap className="w-3.5 h-3.5" />
        <span>
          {isClosing 
            ? "CLOSING..." 
            : focusMode === "points"
            ? `CASH OUT (${pts >= 0 ? "+" : ""}${pts.toFixed(1)} pts)`
            : typeof netRupees === "number"
            ? `CASH OUT (${netRupees >= 0 ? "+" : ""}₹${Math.round(netRupees)})`
            : "CASH OUT NOW"}
        </span>
      </button>
    </div>
  );
};
