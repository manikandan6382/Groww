import React, { useState } from "react";
import { Zap, ArrowUpRight, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import { resolveIndexLotSize } from "../../../stores/useTradingStore";

export const WatchlistOptionForm = React.memo(function WatchlistOptionForm({
  activeStockMeta,
  activeCleanSym,
  optionType,
  setOptionType,
  optionLots = 1,
  setOptionLots,
  onExecuteScalp,
  onTransferToPaperLab,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const spot = Number(activeStockMeta?.price || 1000);
  const roundedStrike = Math.round(spot / 50) * 50;
  const estPremium = Number((spot * (optionType === "CE" ? 0.022 : 0.020)).toFixed(2));
  const lotSize = resolveIndexLotSize(activeCleanSym, 25);
  const totalQty = (optionLots || 1) * lotSize;
  const reqMargin = (estPremium * totalQty).toFixed(2);

  // Derive Manikandan's dynamic risk budget (₹250 target, max ₹300)
  const rawSlPts = 250 / (totalQty || 25);
  const slPoints = Math.max(0.5, Math.round(rawSlPts * 2) / 2);
  const targetPoints = Number((slPoints * 2.0).toFixed(1));
  const totalRiskAmount = (slPoints * totalQty).toFixed(0);
  const totalRewardAmount = (targetPoints * totalQty).toFixed(0);

  const handleDispatch = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      onExecuteScalp(activeStockMeta, activeCleanSym);
    } finally {
      setTimeout(() => setIsSubmitting(false), 500);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. CE vs PE Switcher */}
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

      {/* 2. Lot Selector */}
      {setOptionLots && (
        <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/5 font-mono text-xs">
          <span className="text-slate-400">Position Size:</span>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4].map((lots) => (
              <button
                key={lots}
                type="button"
                onClick={() => setOptionLots(lots)}
                className={clsx(
                  "px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer",
                  optionLots === lots
                    ? "bg-cyan-500/25 text-cyan-300 border border-cyan-500/40"
                    : "bg-white/5 text-slate-400 hover:text-white"
                )}
              >
                {lots} {lots === 1 ? "Lot" : "Lots"} ({lots * lotSize} Qty)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Strike & Pricing Metrics Card */}
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
          <span className="text-slate-400">Total Contract Qty:</span>
          <span className="text-slate-200">{totalQty} Shares ({optionLots} Lot @ {lotSize}/lot)</span>
        </div>
        <div className="flex justify-between border-t border-white/10 pt-1.5">
          <span className="text-slate-400">Required Scalp Capital:</span>
          <strong className="text-emerald-400">₹{Number(reqMargin).toLocaleString("en-IN")}</strong>
        </div>
      </div>

      {/* 4. Strict Risk Invariant Display */}
      <div className="p-3 rounded-xl bg-amber-500/[0.08] border border-amber-500/20 space-y-1 font-mono text-[11px]">
        <div className="flex items-center gap-1.5 text-amber-300 font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          <span>Strict ₹250 Capital Risk Budget Pegged</span>
        </div>
        <div className="flex justify-between text-slate-300 text-[10px]">
          <span>Stop Loss: -{slPoints} pts (Max Loss: ₹{totalRiskAmount})</span>
          <span className="text-emerald-300">Target (1:2.00): +{targetPoints} pts (+₹{totalRewardAmount})</span>
        </div>
      </div>

      {/* 5. Execution Triggers with isSubmitting Lock */}
      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleDispatch}
        className={clsx(
          "w-full py-3 rounded-2xl font-black font-mono text-sm transition-all cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-95 flex items-center justify-center gap-2",
          isSubmitting
            ? "opacity-60 cursor-not-allowed bg-slate-700 text-slate-300"
            : "bg-cyan-500 hover:bg-cyan-400 text-black"
        )}
      >
        <Zap className={clsx("w-4 h-4 fill-black", isSubmitting && "animate-spin")} />
        <span>{isSubmitting ? "Deploying Scalp..." : `Deploy ${optionType} Scalp (1:2.00 R:R)`}</span>
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
