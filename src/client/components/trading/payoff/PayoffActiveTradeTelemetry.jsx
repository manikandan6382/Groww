import React from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";
import clsx from "clsx";

export const PayoffActiveTradeTelemetry = React.memo(function PayoffActiveTradeTelemetry({
  isTradeActive,
  tradeSymbol,
  entry,
  liveLtp,
  isBankNifty,
  liveSpot,
  currentActivePnl,
  isLiveStreaming,
  isZeroDte,
  hasLocalChanges,
  syncStatus,
  onSync,
}) {
  if (!isTradeActive) return null;

  return (
    <div className="p-3 rounded-2xl bg-gradient-to-r from-zinc-950 via-[#0d0f14] to-zinc-950 border border-white/10 shadow-inner flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="text-slate-400 text-[11px]">Active Trade:</span>
          <strong className="text-white font-bold">{tradeSymbol}</strong>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="text-slate-400 text-[11px]">Entry:</span>
          <span className="text-slate-200">₹{Number(entry || 0).toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="text-slate-400 text-[11px]">Mark LTP:</span>
          <span className={clsx("font-bold", Number(liveLtp || 0) >= Number(entry || 0) ? "text-emerald-400" : "text-rose-400")}>
            ₹{Number(liveLtp || 0).toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="text-slate-400 text-[11px]">{isBankNifty ? "BANKNIFTY" : "NIFTY"} Spot:</span>
          <span className="text-zinc-200 font-bold font-mono">₹{Math.round(Number(liveSpot || 0)).toLocaleString("en-IN")}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="text-slate-400 text-[11px]">Running P&L:</span>
          <span className={clsx("font-black text-sm", Number(currentActivePnl || 0) >= 0 ? "text-emerald-400" : "text-rose-400")}>
            {Number(currentActivePnl || 0) >= 0 ? "+" : ""}₹{Math.round(Number(currentActivePnl || 0)).toLocaleString("en-IN")}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10.5px] font-mono px-2 py-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <span className={clsx("w-1.5 h-1.5 rounded-full", isLiveStreaming ? "bg-emerald-400 animate-pulse" : "bg-white")} />
          <span className="text-slate-300">{isLiveStreaming ? "Live Ticks" : "Last Mark"}</span>
        </div>
        {isZeroDte && (
          <span className="px-2 py-0.5 rounded-lg bg-white/10 text-zinc-200 border border-white/15 text-[10px] font-mono font-bold">
            ⚡ 0DTE Expiry
          </span>
        )}
      </div>

      {hasLocalChanges && (
        <button
          type="button"
          onClick={onSync}
          className={clsx(
            "px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-md",
            syncStatus === "synced"
              ? "bg-emerald-500 text-black border border-emerald-400"
              : "bg-white hover:bg-zinc-200 text-black font-extrabold shadow-[0_0_15px_rgba(255,255,255,0.25)] animate-pulse"
          )}
        >
          {syncStatus === "synced" ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Trade Synced!</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Commit Target/SL to Live Trade</span>
            </>
          )}
        </button>
      )}
    </div>
  );
});
