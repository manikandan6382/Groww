import React, { useState } from "react";
import clsx from "clsx";
import { Zap, X, ShieldAlert, Target, TrendingUp, TrendingDown, ArrowRight, ExternalLink } from "lucide-react";
import { resolveIndexStrikeInterval } from "./marketPulseUtils";

export function QuickScalpModal({ modalData, onClose, onExecute, onTransferToPad }) {
  if (!modalData || !modalData.isOpen) return null;

  const { symbol, name, ltp, lotSize = 25, optionType: initialType = "CE" } = modalData;

  const [optionType, setOptionType] = useState(initialType);
  const [lots, setLots] = useState(1);
  const [strikeOffset, setStrikeOffset] = useState(0); // -interval (ITM/OTM), 0 (ATM), +interval

  const interval = resolveIndexStrikeInterval(symbol);
  const baseAtm = Math.round(ltp / interval) * interval;
  const activeStrike = baseAtm + strikeOffset;

  // Premium formula
  const basePremium = ltp * (optionType === "CE" ? 0.021 : 0.019);
  const offsetAdjustment = optionType === "CE" ? -strikeOffset * 0.45 : strikeOffset * 0.45;
  const estPremium = Math.max(5, Number((basePremium + offsetAdjustment).toFixed(2)));

  const totalQty = lots * lotSize;

  // STRICT MANIKANDAN RISK INVARIANT: Max ₹250 default, hard cap ₹300
  const rawSl = 250 / (totalQty || 25);
  const slPoints = Math.max(0.5, Math.round(rawSl * 2) / 2);
  const targetPoints = Number((slPoints * 2.0).toFixed(1));

  const totalRisk = Number((slPoints * totalQty).toFixed(2));
  const totalTarget = Number((targetPoints * totalQty).toFixed(2));
  const stopLossPrice = Math.max(0.05, Number((estPremium - slPoints).toFixed(2)));
  const targetPrice = Number((estPremium + targetPoints).toFixed(2));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-[#0c0e14] border border-white/10 p-5 shadow-[0_24px_64px_rgba(0,0,0,0.9)] space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <div className={clsx(
              "w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs",
              optionType === "CE" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
            )}>
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white font-mono tracking-wider flex items-center gap-2">
                <span>{symbol} QUICK SCALP PAD</span>
                <span className="text-[10px] text-slate-400 font-normal">({name})</span>
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Spot LTP: <span className="text-white font-bold">{Number(ltp).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Option Side Selector (CE vs PE) */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <button
            type="button"
            onClick={() => setOptionType("CE")}
            className={clsx(
              "py-2 rounded-lg font-mono text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              optionType === "CE"
                ? "bg-emerald-500 text-slate-950 shadow-md"
                : "text-emerald-400 hover:bg-white/[0.04]"
            )}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>CALL (CE)</span>
          </button>

          <button
            type="button"
            onClick={() => setOptionType("PE")}
            className={clsx(
              "py-2 rounded-lg font-mono text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              optionType === "PE"
                ? "bg-rose-500 text-slate-950 shadow-md"
                : "text-rose-400 hover:bg-white/[0.04]"
            )}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>PUT (PE)</span>
          </button>
        </div>

        {/* Strike Selection */}
        <div className="space-y-1.5 font-mono">
          <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
            Strike Selection
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "ITM", offset: optionType === "CE" ? -interval : interval },
              { label: "ATM", offset: 0 },
              { label: "OTM", offset: optionType === "CE" ? interval : -interval }
            ].map((s) => {
              const strike = baseAtm + s.offset;
              const isSelected = strikeOffset === s.offset;
              return (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setStrikeOffset(s.offset)}
                  className={clsx(
                    "p-2 rounded-xl border text-center transition-all cursor-pointer font-mono",
                    isSelected
                      ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-200 shadow-sm"
                      : "bg-white/[0.02] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                  )}
                >
                  <div className="text-[9px] text-slate-400 font-bold">{s.label}</div>
                  <div className="text-xs font-black text-white mt-0.5">{strike}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lots & Quantity */}
        <div className="grid grid-cols-2 gap-3 font-mono">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
              Lots ({lotSize} Qty/Lot)
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setLots(n)}
                  className={clsx(
                    "flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer",
                    lots === n
                      ? "bg-white/20 border-white/40 text-white font-black"
                      : "bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-white"
                  )}
                >
                  {n}L
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
              Est. Premium
            </label>
            <div className="h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 flex items-center justify-between text-xs font-black text-white">
              <span>₹{estPremium.toFixed(2)}</span>
              <span className="text-[9px] text-slate-400">{totalQty} Qty</span>
            </div>
          </div>
        </div>

        {/* Dynamic Risk Budget Card (Strict Invariant Display) */}
        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2 font-mono">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              STRICT RISK INVARIANT
            </span>
            <span className="text-slate-300 font-bold">₹200–₹300 Budget</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <div className="text-rose-400 font-bold">Stop Loss: -{slPoints} pts</div>
              <div className="text-slate-300 mt-0.5">SL Level: ₹{stopLossPrice}</div>
              <div className="text-rose-300 font-black mt-1">Max Loss: -₹{totalRisk}</div>
            </div>

            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-emerald-400 font-bold">Target: +{targetPoints} pts (1:2 RR)</div>
              <div className="text-slate-300 mt-0.5">TP Level: ₹{targetPrice}</div>
              <div className="text-emerald-300 font-black mt-1">Aim Gain: +₹{totalTarget}</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1 font-mono">
          <button
            type="button"
            onClick={() => onExecute({ symbol, optionType, lots, strike: activeStrike })}
            className={clsx(
              "flex-1 py-2.5 px-4 rounded-xl font-black text-xs tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer",
              optionType === "CE"
                ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                : "bg-rose-500 hover:bg-rose-400 text-slate-950"
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Deploy Practice Scalp</span>
          </button>

          <button
            type="button"
            onClick={() => onTransferToPad({ symbol, optionType, lots, strike: activeStrike })}
            className="py-2.5 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.12] text-slate-300 hover:text-white font-bold text-xs transition-all flex items-center gap-1 cursor-pointer"
            title="Open in Full Paper Order Pad"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
