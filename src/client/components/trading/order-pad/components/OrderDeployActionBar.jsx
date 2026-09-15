import React from "react";
import { AlertTriangle, RefreshCw, Clock, Lock, Zap } from "lucide-react";
import clsx from "clsx";
import { RollingTicker } from "../../../common/RollingTicker";

export function OrderDeployActionBar({
  capitalOutlay,
  riskAmount,
  rewardAmount,
  rrRatio,
  isDailyCapReached,
  isValidSL,
  isValidTarget,
  isDeploying,
  isVaultRunning,
  vaultFormattedTime,
  copilotState,
  entryPrice
}) {
  return (
    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
      {/* Institutional Pre-Trade Telemetry Safeguard */}
      <div className="flex items-center justify-between px-1 text-[11px]">
        <span className="text-slate-400 font-medium">Pre-Trade Risk Engine:</span>
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          ACTIVE RMS SAFEGUARD (10K CAPITAL DISCIPLINE)
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div>
          <span className="text-slate-400 text-[10px] block">Capital Outlay (₹10k Budget)</span>
          <div className={clsx("font-mono tabular-nums font-bold text-sm flex items-baseline gap-1", capitalOutlay > 10000 ? "text-amber-400" : "text-white")}>
            <RollingTicker value={capitalOutlay} prefix="₹" decimalPlaces={2} />
            <span className={clsx("text-[9px] px-1 py-0.5 rounded font-mono tabular-nums font-bold", capitalOutlay > 10000 ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30")}>
              {((capitalOutlay / 10000) * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        <div>
          <span className="text-slate-400 text-[10px] block">Max Risk</span>
          <div className="text-rose-400 font-mono tabular-nums font-bold text-sm">
            <RollingTicker value={riskAmount} prefix="₹" decimalPlaces={2} className="text-rose-400" />
          </div>
        </div>

        <div>
          <span className="text-slate-400 text-[10px] block">Target Profit</span>
          <div className="text-emerald-400 font-mono tabular-nums font-bold text-sm">
            <RollingTicker value={rewardAmount} prefix="+₹" decimalPlaces={2} className="text-emerald-400" />
          </div>
        </div>

        <div>
          <span className="text-slate-400 text-[10px] block">Risk : Reward</span>
          <strong className="text-cyan-400 font-mono tabular-nums text-sm">1 : {rrRatio}</strong>
        </div>
      </div>

      {/* Institutional Friction Drag & True Break-Even Insight */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-white/[0.02] border border-white/5 text-[10px] text-slate-400 font-mono tabular-nums">
        <span className="flex items-center gap-1">
          <span className="text-slate-400">Brokerage + STT:</span>
          <strong className="text-slate-200">~₹55.20</strong>
        </span>
        <span className="flex items-center gap-1">
          <span className="text-slate-400">Net Take-Home Yield:</span>
          <strong className="text-emerald-400 font-bold">
            +₹{Math.max(0, rewardAmount - 55.2).toFixed(0)} ({riskAmount > 0 ? `1:${((rewardAmount - 55.2) / Math.max(1, riskAmount + 55.2)).toFixed(2)} Net` : "1:2.0"})
          </strong>
        </span>
        <span className="flex items-center gap-1">
          <span className="text-slate-400">Friction BE:</span>
          <strong className="text-amber-300">+{Number(entryPrice) > 0 ? (55.2 / Math.max(1, capitalOutlay / Math.max(0.1, Number(entryPrice)))).toFixed(1) : "0.9"} pts</strong>
        </span>
      </div>

      {capitalOutlay > 10000 && (
        <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>₹10k Budget Guard:</strong> Capital outlay (₹{capitalOutlay.toFixed(0)}) exceeds your ₹10,000 target budget. Dan Passarelli rules recommend 1 Lot for ₹10k bankroll.
          </span>
        </div>
      )}

      <button
        type="submit"
        disabled={isDailyCapReached || !isValidSL || !isValidTarget || isDeploying}
        className={clsx(
          "w-full py-3.5 rounded-xl font-black text-sm transition flex items-center justify-center gap-2 cursor-pointer",
          isDailyCapReached || !isValidSL || !isValidTarget
            ? "bg-amber-950/60 text-amber-300/80 border border-amber-500/30 cursor-not-allowed opacity-80"
            : copilotState.ctaClass,
          isDeploying && "opacity-75 cursor-wait"
        )}
      >
        {isDeploying ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin text-black" />
            <span>Arming Order...</span>
          </>
        ) : isVaultRunning ? (
          <>
            <Clock className="w-4 h-4 text-cyan-300 animate-spin" />
            <span>Cooling Vault Active ({vaultFormattedTime}) — Take a Breather</span>
          </>
        ) : isDailyCapReached ? (
          <>
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Daily 3-Trade Quota Locked (Start 15m Vault to Unlock)</span>
          </>
        ) : !isValidSL ? (
          <>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Inverted Stop Loss (Must be strictly &lt; ₹{Number(entryPrice).toFixed(1)})</span>
          </>
        ) : !isValidTarget ? (
          <>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Inverted Target (Must be strictly &gt; ₹{Number(entryPrice).toFixed(1)})</span>
          </>
        ) : (
          <>
            <Zap className="w-4 h-4 fill-current" />
            <span>{copilotState.ctaText}</span>
          </>
        )}
      </button>
    </div>
  );
}
