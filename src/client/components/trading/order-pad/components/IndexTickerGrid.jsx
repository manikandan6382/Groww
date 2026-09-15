import React from "react";
import clsx from "clsx";

export function IndexTickerGrid({ dynamicAssets, underlying, onSelectAsset }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
        <span>🏛️ Institutional Underlying Ticker</span>
        <span className="text-[10px] text-cyan-400 lowercase font-mono">1-tap auto-calibrate</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {dynamicAssets.map((asset) => (
          <button
            key={asset.key}
            type="button"
            onClick={() => onSelectAsset(asset)}
            className={clsx(
              "p-2.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between cursor-pointer active:scale-95",
              underlying === asset.key
                ? "bg-cyan-500/15 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.2)] text-white"
                : "bg-white/[0.02] border-white/5 text-slate-400 hover:text-white hover:bg-white/[0.05]"
            )}
          >
            <div className="flex items-center justify-between gap-1">
              <strong className="text-xs font-bold font-mono truncate">{asset.name}</strong>
              <span className={clsx(
                "text-[8px] font-mono px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider border shrink-0",
                asset.exchange === "BSE"
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  : "bg-cyan-500/10 text-cyan-300 border-cyan-500/25"
              )}>
                {asset.exchange} · {asset.lot}L
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-mono text-xs text-white font-bold">
                ₹{Number(asset.spot).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={clsx("text-[10px] font-mono font-bold", asset.positive ? "text-emerald-400" : "text-rose-400")}>
                {asset.change}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
