import React from "react";
import clsx from "clsx";

export const LiveCardHeroMetrics = ({
  entry = 0,
  currentLtp = 0,
  tickDirection,
  isGain,
  pts = 0,
  grossRupees = null,
  netRupees = 0,
  roiPct,
  estimatedCharges = 55,
  stopLoss = 0,
  target = 0,
  quantity = 1,
  totalQty = null,
  lotSize = null,
  focusMode = "cash"
}) => {
  const units = Number(totalQty || quantity || 65);
  const capitalInvested = Number(entry || 0) * units;
  const currentPositionValue = Number(currentLtp || 0) * units;
  const effectiveGrossRupees = (grossRupees != null && Number.isFinite(Number(grossRupees)))
    ? Number(grossRupees)
    : Number((pts || 0) * units);

  const isNetGain = netRupees >= 0;
  const netRoiPct = capitalInvested > 0 ? ((netRupees / capitalInvested) * 100).toFixed(1) : "0.0";
  const estimatedSpread = 0.25;
  const estimatedBid = (currentLtp - 0.1).toFixed(2);
  const estimatedAsk = (currentLtp + 0.15).toFixed(2);

  const slPts = Math.max(0.1, Math.abs(entry - stopLoss));
  const targetPts = Math.max(0.1, Math.abs(target - entry));
  const slRupees = slPts * units;
  const targetRupees = targetPts * units;
  const rrRatio = slPts > 0 ? (targetPts / slPts).toFixed(1) : "1.8";
  const isSlRiskBreached = slRupees > 300;

  const buyerDepthPct = isGain ? 62 : 44;
  const sellerDepthPct = 100 - buyerDepthPct;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.06] bg-black/30 border-y border-white/[0.06]">
      {/* Metric 1: Dual Market MTM & Net Take-Home Breakdown */}
      <div className={clsx(
        "p-4 sm:p-5 flex flex-col justify-between transition-colors",
        isNetGain ? "bg-emerald-500/[0.02]" : "bg-rose-500/[0.02]"
      )}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              MARKET VALUE (MTM)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={clsx(
              "px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border",
              isGain ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-rose-500/10 text-rose-300 border-rose-500/20"
            )} title="Pure Market Price Return">
              Mkt: {isGain ? "+" : ""}{roiPct}%
            </span>
            <span className={clsx(
              "px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border",
              isNetGain ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-rose-500/15 text-rose-400 border-rose-500/30"
            )} title="Net Take-Home Return After Statutory Friction">
              Net: {isNetGain ? "+" : ""}{netRoiPct}%
            </span>
          </div>
        </div>

        <div className="py-1 space-y-1.5">
          {/* Primary: Pure Market MTM */}
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <span className={clsx(
                "text-2xl sm:text-3xl font-black font-mono tracking-tight tabular-nums",
                isGain ? "text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.25)]" : "text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.25)]"
              )}>
                {effectiveGrossRupees >= 0 ? "+" : ""}₹{effectiveGrossRupees.toFixed(2)}
              </span>
              <span className={clsx("text-xs font-mono font-bold", isGain ? "text-emerald-400" : "text-rose-400")}>
                ({isGain ? "+" : ""}{pts.toFixed(1)} pts)
              </span>
            </div>
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Gross Price
            </span>
          </div>

          {/* Institutional Equation Strip: Market − Fees = Net Cash */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/[0.06] text-[11px] font-mono">
            <div className="flex items-center gap-1">
              <span className="text-white/40 text-[10px]">Fees:</span>
              <span className="text-amber-400 font-bold">−₹{estimatedCharges}</span>
            </div>
            <span className="text-white/20">➔</span>
            <div className="flex items-center gap-1.5">
              <span className="text-white/40 text-[10px]">Net Take-Home:</span>
              <span className={clsx(
                "font-black tabular-nums text-xs",
                isNetGain ? "text-emerald-400" : "text-rose-400"
              )}>
                {isNetGain ? "+" : ""}₹{netRupees.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Dynamic Friction Explanation Badge */}
          {isGain && !isNetGain ? (
            <div className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-mono font-bold flex items-center gap-1.5 animate-pulse">
              <span>⚠️ Friction Hurdle:</span>
              <span>+{pts.toFixed(1)} pts gross (+₹{effectiveGrossRupees.toFixed(0)}) absorbing ₹{estimatedCharges} fees. Needs +{(estimatedCharges / units).toFixed(1)} pts for pure green!</span>
            </div>
          ) : !isGain ? (
            <div className="px-2 py-0.5 rounded-lg bg-white/[0.02] border border-white/5 text-slate-400 text-[10px] font-mono flex items-center justify-between">
              <span>Mkt Loss: −₹{Math.abs(effectiveGrossRupees).toFixed(0)}</span>
              <span>+</span>
              <span className="text-amber-400/80">Fees: ₹{estimatedCharges}</span>
              <span>=</span>
              <span className="text-rose-400 font-bold">Total: −₹{Math.abs(netRupees).toFixed(0)}</span>
            </div>
          ) : (
            <div className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1.5">
              <span>✨ In Pure Green:</span>
              <span>Fees cleared! Net take-home: +₹{netRupees.toFixed(2)} in pocket</span>
            </div>
          )}
        </div>
      </div>

      {/* Metric 2: Live Market LTP */}
      <div className="p-4 sm:p-5 flex flex-col justify-between space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
            <span className={clsx("w-1.5 h-1.5 rounded-full animate-ping", tickDirection === "UP" ? "bg-emerald-400" : tickDirection === "DOWN" ? "bg-rose-500" : "bg-white/40")} />
            Live Market LTP
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-white/[0.04] text-cyan-300 border border-white/[0.08]"
              title={`Current Position Value: ₹${currentLtp.toFixed(2)} × ${units} Qty = ₹${currentPositionValue.toFixed(2)}`}
            >
              Val ₹{Math.round(currentPositionValue).toLocaleString("en-IN")}
            </span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-white/[0.04] text-slate-300 border border-white/[0.08]">
              Spread ₹{estimatedSpread.toFixed(2)}
            </span>
          </div>
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
          <div className="text-[11px] font-mono text-white/50 mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="text-white/80 font-bold">Bought @ ₹{entry.toFixed(2)}</span>
            <span
              className="px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-bold text-[10px]"
              title={`Total Trade Price / Capital Invested: ₹${entry.toFixed(2)} × ${units} Qty = ₹${capitalInvested.toFixed(2)}`}
            >
              ₹{Math.round(capitalInvested).toLocaleString("en-IN")} ({entry.toFixed(2)} × {units})
            </span>
            <span className="text-white/30">·</span>
            <span className="text-white/40">Bid ₹{estimatedBid} / Ask ₹{estimatedAsk}</span>
          </div>
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
            {focusMode === "points" ? (
              <span>-{slPts.toFixed(1)} pts → +{targetPts.toFixed(1)} pts</span>
            ) : (
              <span>-₹{slRupees.toFixed(0)} → +₹{targetRupees.toFixed(0)}</span>
            )}
          </div>
          {isSlRiskBreached ? (
            <div className="mt-1 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-200 font-mono text-[9px] font-bold border border-rose-500/40 animate-pulse flex items-center justify-between">
              <span>⚠️ Risk ₹{Math.round(slRupees)} exceeds ₹300 Max</span>
              <span>Tighten SL!</span>
            </div>
          ) : (
            <div className="mt-0.5 text-[10px] font-mono text-emerald-400/90 font-medium">
              ₹{Math.round(slRupees)} Risk · ₹{Math.round(targetRupees)} Target (1:{rrRatio})
            </div>
          )}
          <div className="mt-1.5 space-y-1">
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
