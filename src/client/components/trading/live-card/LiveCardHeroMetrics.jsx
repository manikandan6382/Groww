import React from "react";
import clsx from "clsx";

export const LiveCardHeroMetrics = ({
  entry,
  currentLtp,
  tickDirection,
  isGain,
  pts,
  netRupees,
  roiPct,
  estimatedCharges = 55,
  stopLoss = 0,
  target = 0,
  quantity = 1
}) => {
  const isNetGain = netRupees >= 0;
  const estimatedSpread = 0.25;
  const estimatedBid = (currentLtp - 0.1).toFixed(2);
  const estimatedAsk = (currentLtp + 0.15).toFixed(2);

  const slPts = Math.max(0.1, Math.abs(entry - stopLoss));
  const targetPts = Math.max(0.1, Math.abs(target - entry));
  const slRupees = slPts * quantity;
  const targetRupees = targetPts * quantity;
  const rrRatio = slPts > 0 ? (targetPts / slPts).toFixed(1) : "1.8";

  const buyerDepthPct = isGain ? 62 : 44;
  const sellerDepthPct = 100 - buyerDepthPct;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.06] bg-black/30 border-y border-white/[0.06]">
      {/* Metric 1: True Net Cash */}
      <div className={clsx(
        "p-4 sm:p-5 flex flex-col justify-between transition-colors",
        isNetGain ? "bg-emerald-500/[0.02]" : "bg-rose-500/[0.02]"
      )}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40">
            Net Take-Home Cash
          </span>
          <span className={clsx(
            "px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border",
            isNetGain ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
          )}>
            {isNetGain ? "+" : ""}{roiPct}% Return
          </span>
        </div>
        <div className="py-1">
          <div className={clsx(
            "text-2xl sm:text-3xl font-black font-mono tracking-tight tabular-nums",
            isNetGain ? "text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.2)]"
          )}>
            {isNetGain ? "+" : ""}₹{netRupees.toFixed(2)}
          </div>
          <p className="text-[11px] font-mono text-white/40 mt-0.5">
            {isNetGain ? "Net profit after friction" : "Net statutory friction drag"} · ₹{estimatedCharges} fees deducted
          </p>
        </div>
      </div>

      {/* Metric 2: Live Market LTP */}
      <div className="p-4 sm:p-5 flex flex-col justify-between space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
            <span className={clsx("w-1.5 h-1.5 rounded-full animate-ping", tickDirection === "UP" ? "bg-emerald-400" : tickDirection === "DOWN" ? "bg-rose-500" : "bg-white/40")} />
            Live Market LTP
          </span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-white/[0.04] text-slate-300 border border-white/[0.08]">
            Spread ₹{estimatedSpread.toFixed(2)}
          </span>
        </div>
        <div className="py-1">
          <div className="flex items-baseline gap-2">
            <span className={clsx(
              "text-2xl sm:text-3xl font-black font-mono tracking-tight tabular-nums transition-colors",
              tickDirection === "UP" ? "text-emerald-400" : tickDirection === "DOWN" ? "text-rose-400" : "text-white"
            )}>
              ₹{currentLtp.toFixed(2)}
            </span>
            <span className={clsx("text-xs font-mono font-bold", isGain ? "text-emerald-400" : "text-rose-400")}>
              {isGain ? "+" : ""}{pts.toFixed(1)} pts
            </span>
          </div>
          <p className="text-[11px] font-mono text-white/40 mt-0.5">
            Bought @ ₹{entry.toFixed(2)} · Bid ₹{estimatedBid} / Ask ₹{estimatedAsk}
          </p>
        </div>
      </div>

      {/* Metric 3: Risk : Reward Expectancy & Order Flow */}
      <div className="p-4 sm:p-5 flex flex-col justify-between space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40">
            Risk : Reward Edge
          </span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-white/[0.04] text-white/70 border border-white/[0.08]">
            1:{rrRatio} Ratio
          </span>
        </div>
        <div className="py-1">
          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white/90">
            -₹{slRupees.toFixed(0)} → +₹{targetRupees.toFixed(0)}
          </div>
          <div className="mt-1 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
              <span className="text-emerald-400/90 font-medium">Bids {buyerDepthPct}%</span>
              <span className="text-rose-400/90 font-medium">Asks {sellerDepthPct}%</span>
            </div>
            <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden flex">
              <div style={{ width: `${buyerDepthPct}%` }} className="h-full bg-emerald-500/80" />
              <div style={{ width: `${sellerDepthPct}%` }} className="h-full bg-rose-500/80" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
