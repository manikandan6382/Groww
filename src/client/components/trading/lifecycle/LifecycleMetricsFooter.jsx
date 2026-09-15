import React from "react";

export function LifecycleMetricsFooter({
  targetPrice,
  targetDeltaPts,
  targetDeltaPct,
  entryPrice,
  netZeroPrice,
  stopLoss,
  stopDeltaPts,
  stopDeltaPct,
  candleData,
  underlying
}) {
  return (
    <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between gap-3 text-[10.5px] font-mono text-slate-400 flex-wrap">
      <div className="flex items-center gap-3">
        {targetPrice !== null && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Target: +₹{targetDeltaPts} ({targetDeltaPct}%)</span>
          </span>
        )}
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>Entry: ₹{entryPrice.toFixed(2)}</span>
        </span>
        <span className="flex items-center gap-1 text-amber-300">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>True BE: ₹{netZeroPrice.toFixed(2)}</span>
        </span>
        {stopLoss !== null && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>Risk: -₹{stopDeltaPts} ({stopDeltaPct}%)</span>
          </span>
        )}
      </div>

      {candleData?.mfe !== undefined && (
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-slate-500">Excursions:</span>
          <span className="text-emerald-400 font-bold">MFE +{candleData.mfe} pts</span>
          <span className="text-rose-400 font-bold">MAE -{candleData.mae} pts</span>
          {underlying && (
            <span className="text-amber-400 font-bold hidden sm:inline">
              ({underlying.name} {underlying.changePct >= 0 ? "+" : ""}{underlying.changePct}%)
            </span>
          )}
        </div>
      )}
    </div>
  );
}
