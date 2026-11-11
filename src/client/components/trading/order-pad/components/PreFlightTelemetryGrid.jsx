import React from "react";
import { Zap, Lock, ShieldAlert, CheckCircle2, TrendingUp } from "lucide-react";
import clsx from "clsx";
import { soundEngine } from "../../../../utils/soundEngine";

export function PreFlightTelemetryGrid({
  entryPrice,
  stopLoss,
  targetPrice,
  lots,
  totalQty,
  isLiveStreaming,
  onSetIsLiveStreaming,
  onSyncToLive,
  liveContractTick,
  liveMarkPrice = entryPrice,
  isValidSL,
  isValidTarget,
  rrRatio,
  frictionMetrics
}) {
  const { isFrictionTrap, frictionDragPct, estimatedFriction } = frictionMetrics;
  const netRewardAmount = Math.max(0, totalQty * (targetPrice - entryPrice) - estimatedFriction);
  const netRiskAmount = totalQty * (entryPrice - stopLoss) + estimatedFriction;
  const netRrRatio = netRiskAmount > 0 ? (netRewardAmount / netRiskAmount).toFixed(2) : "0.00";
  const markDiff = Number(liveMarkPrice || entryPrice) - Number(entryPrice || 0);

  return (
    <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. Entry / LTP */}
      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between space-y-1.5 shadow-sm">
        <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-slate-400">
          <span className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-cyan-400" />
            <span>Entry / LTP</span>
          </span>
          {isLiveStreaming ? (
            <button
              type="button"
              onClick={() => {
                soundEngine.playTabSwitchTone();
                onSetIsLiveStreaming(false);
              }}
              className="px-2 py-0.5 rounded-full text-[9px] font-extrabold font-mono flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)] hover:bg-emerald-500/30 transition active:scale-95 cursor-pointer"
              title="Live real-time tick streaming active. Click to lock price for manual limit entry."
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>LIVE TICK</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                soundEngine.playTabSwitchTone();
                onSetIsLiveStreaming(true);
              }}
              className="px-2 py-0.5 rounded-full text-[9px] font-extrabold font-mono flex items-center gap-1 bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition active:scale-95 cursor-pointer"
              title="Price locked for manual entry. Click to resume live real-time tick streaming from Upstox."
            >
              <Lock className="w-2.5 h-2.5 text-amber-400" />
              <span>LOCKED</span>
            </button>
          )}
        </div>
        <div className="flex items-baseline justify-between gap-1">
          <div className="flex items-center gap-1.5">
            <strong className={clsx(
              "text-base font-black tracking-tight transition-colors duration-300",
              isLiveStreaming && liveContractTick?.direction === "up" && "text-emerald-300",
              isLiveStreaming && liveContractTick?.direction === "down" && "text-rose-300",
              (!isLiveStreaming || !liveContractTick) && "text-white"
            )}>
              ₹{Number(entryPrice).toFixed(2)}
            </strong>
            {isLiveStreaming && liveContractTick?.direction === "up" && (
              <span className="text-[10px] text-emerald-400 font-bold animate-pulse">▲</span>
            )}
            {isLiveStreaming && liveContractTick?.direction === "down" && (
              <span className="text-[10px] text-rose-400 font-bold animate-pulse">▼</span>
            )}
            {!isLiveStreaming && Math.abs(markDiff) >= 0.05 && (
              <button
                type="button"
                onClick={() => (onSyncToLive ? onSyncToLive() : onSetIsLiveStreaming(true))}
                className={clsx(
                  "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded transition cursor-pointer active:scale-95",
                  markDiff > 0 ? "text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30" : "text-rose-400 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30"
                )}
                title="Click to snap entry price to live Upstox tick and resume live streaming"
              >
                Snap {markDiff > 0 ? "+" : ""}{markDiff.toFixed(1)}
              </button>
            )}
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {lots} {lots === 1 ? "lot" : "lots"} ({totalQty} Qty)
          </span>
        </div>
      </div>

      {/* 2. Stop Loss */}
      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between space-y-1.5 shadow-sm">
        <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldAlert className="w-3 h-3 text-rose-400" />
            <span>Stop Loss</span>
          </span>
          <span className={clsx("text-[9px] font-bold", isValidSL ? "text-rose-400" : "text-amber-400")}>
            {isValidSL ? `-${(entryPrice - stopLoss).toFixed(1)} pts` : "INVERTED"}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-1">
          <strong className={clsx("text-base font-black tracking-tight", isValidSL ? "text-rose-400" : "text-amber-400")}>
            ₹{Number(stopLoss).toFixed(2)}
          </strong>
          {isValidSL && (
            <span className="text-[10px] text-rose-300/80">
              -{((((entryPrice - stopLoss)) / (entryPrice || 1)) * 100).toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* 3. Target */}
      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between space-y-1.5 shadow-sm">
        <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-slate-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Target</span>
          </span>
          <span className={clsx("text-[9px] font-bold", isValidTarget ? (isFrictionTrap ? "text-amber-400" : "text-emerald-400") : "text-amber-400")}>
            {isValidTarget ? `+${(targetPrice - entryPrice).toFixed(1)} pts` : "INVERTED"}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-1">
          <strong className={clsx("text-base font-black tracking-tight", isValidTarget ? "text-emerald-400" : "text-amber-400")}>
            ₹{Number(targetPrice).toFixed(2)}
          </strong>
          {isValidTarget && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-emerald-300/80">
                +{((((targetPrice - entryPrice)) / (entryPrice || 1)) * 100).toFixed(1)}%
              </span>
              {isFrictionTrap && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {frictionDragPct}% Tax Drag
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4. Risk / Reward */}
      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between space-y-1.5 shadow-sm">
        <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-slate-400">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-cyan-400" />
            <span>Risk : Reward</span>
          </span>
          <span className={clsx(
            "text-[9px] font-black px-1.5 py-0.5 rounded",
            isFrictionTrap
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
              : isValidSL && isValidTarget && Number(rrRatio) >= 2.0 
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" 
                : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
          )}>
            {isFrictionTrap ? `TRAP (${frictionDragPct}% Tax)` : isValidSL && isValidTarget && Number(rrRatio) >= 2.0 ? "PASS (≥1:2)" : "CHECK (<1:2)"}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-1">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <strong className="text-base font-black text-cyan-300 tracking-tight">
              1:{rrRatio}
            </strong>
            <span className={clsx("text-[10px] font-mono font-bold", Number(netRrRatio) >= 1.5 ? "text-emerald-400" : "text-amber-400")}>
              (1:{netRrRatio} Net)
            </span>
          </div>
          <span className={clsx("text-[10px]", isFrictionTrap ? "text-amber-300 font-bold" : "text-slate-400")}>
            {isFrictionTrap
              ? `Net: +₹${Math.max(0, netRewardAmount).toFixed(0)}`
              : `Net Yield: +₹${netRewardAmount.toFixed(0)}`}
          </span>
        </div>
      </div>
    </div>
  );
}
