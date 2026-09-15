import React from "react";
import { Zap, ArrowUpRight } from "lucide-react";
import clsx from "clsx";

export const WatchlistOptionForm = React.memo(function WatchlistOptionForm({
  activeStockMeta,
  activeCleanSym,
  optionType,
  setOptionType,
  optionLots,
  onExecuteScalp,
  onTransferToPaperLab,
}) {
  const spot = Number(activeStockMeta?.price || 1000);
  const roundedStrike = Math.round(spot / 50) * 50;
  const estPremium = Number((spot * (optionType === "CE" ? 0.022 : 0.020)).toFixed(2));
  const reqMargin = (estPremium * 25 * optionLots).toFixed(2);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setOptionType("CE")}
          className={clsx(
            "py-2.5 rounded-xl font-bold font-mono text-xs transition border flex items-center justify-center gap-1.5 cursor-pointer",
            optionType === "CE"
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_16px_rgba(16,185,129,0.2)]"
              : "bg-white/[0.03] text-slate-400 border-white/10 hover:text-white"
          )}
        >
          <span>CALL CE (Bullish ATM)</span>
        </button>
        <button
          type="button"
          onClick={() => setOptionType("PE")}
          className={clsx(
            "py-2.5 rounded-xl font-bold font-mono text-xs transition border flex items-center justify-center gap-1.5 cursor-pointer",
            optionType === "PE"
              ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_16px_rgba(244,63,94,0.2)]"
              : "bg-white/[0.03] text-slate-400 border-white/10 hover:text-white"
          )}
        >
          <span>PUT PE (Bearish ATM)</span>
        </button>
      </div>

      <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-2 text-xs font-mono">
        <div className="flex justify-between">
          <span className="text-slate-400">Resolved ATM Strike:</span>
          <strong className="text-white">
            {activeCleanSym} {roundedStrike} {optionType}
          </strong>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Estimated Option Premium:</span>
          <strong className="text-cyan-300">₹{estPremium.toFixed(2)}</strong>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Standard Lot Size:</span>
          <span className="text-slate-200">25 Shares / Lot</span>
        </div>
        <div className="flex justify-between border-t border-white/10 pt-1.5">
          <span className="text-slate-400">Required Margin:</span>
          <strong className="text-emerald-400">₹{reqMargin}</strong>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onExecuteScalp(activeStockMeta, activeCleanSym)}
        className="w-full py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-sm transition-all cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-95 flex items-center justify-center gap-2"
      >
        <Zap className="w-4 h-4 fill-black" />
        <span>Deploy {optionType} Practice Scalp</span>
      </button>

      <button
        type="button"
        onClick={() => onTransferToPaperLab(activeStockMeta, activeCleanSym)}
        className="w-full py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] text-slate-300 hover:text-white text-xs font-semibold transition border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <span>Open in Full Paper Lab Workspace</span>
        <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
      </button>
    </div>
  );
});
