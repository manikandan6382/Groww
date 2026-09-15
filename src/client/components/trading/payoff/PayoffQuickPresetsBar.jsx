import React from "react";
import { Crosshair, CheckCircle2, RefreshCw } from "lucide-react";
import clsx from "clsx";

const RR_PRESETS = [
  { label: "1:1.5", mult: 1.5 },
  { label: "1:2.0", mult: 2.0, tag: "Double" },
  { label: "1:3.0", mult: 3.0, tag: "Triple" },
  { label: "1:4.0", mult: 4.0, tag: "Quad" }
];

export const PayoffQuickPresetsBar = React.memo(function PayoffQuickPresetsBar({
  riskPts,
  totalShares,
  onApplyPreset,
  isTradeActive,
  hasLocalChanges,
  syncStatus,
  onSync,
  riskAmount,
  rewardAmount,
  currentRR,
}) {
  return (
    <div className="pt-2 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        <span className="text-[11px] font-bold text-slate-400 uppercase font-sans flex items-center gap-1.5 shrink-0">
          <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
          Quick Targets:
        </span>
        {RR_PRESETS.map((preset) => {
          const estProfit = Math.round(Number(riskPts || 0) * preset.mult * Number(totalShares || 0));
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => onApplyPreset(preset.mult)}
              className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/10 text-slate-300 hover:text-zinc-200 border border-white/10 hover:border-white/20 text-xs font-mono font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#060709]"
              title={`Set target to capture ₹${Number(estProfit || 0).toLocaleString("en-IN")} profit`}
            >
              <span>{preset.label}</span>
              {preset.tag && (
                <span className="text-[9.5px] px-1 py-0.2 rounded bg-white/10 text-zinc-300 font-sans font-normal">
                  {preset.tag}
                </span>
              )}
              <span className="text-[10px] text-emerald-400 font-normal">
                (+₹{Number(estProfit || 0).toLocaleString("en-IN")})
              </span>
            </button>
          );
        })}

        {isTradeActive && hasLocalChanges && (
          <button
            type="button"
            onClick={onSync}
            className={clsx(
              "px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-lg",
              syncStatus === "synced"
                ? "bg-emerald-500 text-black border border-emerald-400"
                : "bg-white hover:bg-zinc-200 text-black shadow-[0_0_15px_rgba(255,255,255,0.25)] animate-pulse font-extrabold"
            )}
            title="Apply modified target/SL directly to your live running practice trade"
          >
            {syncStatus === "synced" ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Synced to Trade!</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync to Live Trade</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 font-mono text-xs self-end sm:self-auto shrink-0">
        <span className="text-rose-400 flex items-center gap-1 font-bold">
          🛑 Max Risk: -₹{Number(riskAmount || 0).toLocaleString("en-IN")}
        </span>
        <span className="text-zinc-200 font-black bg-white/10 px-2.5 py-1 rounded-lg border border-white/15">
          R:R {currentRR?.startsWith("1:") ? currentRR : `1:${currentRR || "2.5"}`}
        </span>
        <span className="text-emerald-400 flex items-center gap-1 font-bold">
          🎯 Target: +₹{Number(rewardAmount || 0).toLocaleString("en-IN")}
        </span>
      </div>
    </div>
  );
});
