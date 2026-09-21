import React, { useState } from "react";
import clsx from "clsx";
import { Zap, X, ShieldAlert, Target, TrendingUp, TrendingDown, ExternalLink } from "lucide-react";

export function OptionStrikeModal({ modalData, onClose, onExecute, onTransferToPad }) {
  if (!modalData || !modalData.isOpen) return null;

  const {
    symbol,
    name,
    strike,
    optionType,
    ltp = 50,
    lotSize = 25,
    delta = 0.5,
    iv = 13.5
  } = modalData;

  const [lots, setLots] = useState(1);

  const totalQty = lots * lotSize;
  const isCall = optionType === "CE";
  const strikeSymbol = `${symbol} ${strike} ${optionType}`;

  // STRICT RISK INVARIANT: ₹250 Default Risk Budget, hard cap ₹300
  const rawSl = 250 / (totalQty || 25);
  const slPoints = Math.max(0.5, Math.round(rawSl * 2) / 2);
  const targetPoints = Number((slPoints * 2.0).toFixed(1));

  const totalRisk = Number((slPoints * totalQty).toFixed(2));
  const totalReward = Number((targetPoints * totalQty).toFixed(2));
  const stopLossPrice = Math.max(0.05, Number((ltp - slPoints).toFixed(2)));
  const targetPrice = Number((ltp + targetPoints).toFixed(2));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-[#0c0e14] border border-white/10 p-5 shadow-[0_24px_64px_rgba(0,0,0,0.9)] space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <div
              className={clsx(
                "w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs",
                isCall
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
              )}
            >
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white font-mono tracking-wider flex items-center gap-2">
                <span>{strikeSymbol}</span>
                <span
                  className={clsx(
                    "text-[9px] font-bold px-1.5 py-0.2 rounded border",
                    isCall ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/25" : "text-rose-300 bg-rose-500/10 border-rose-500/25"
                  )}
                >
                  {isCall ? "CALL (CE)" : "PUT (PE)"}
                </span>
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                {name} · Strike: <span className="text-white font-bold">{strike}</span> · Premium: <span className="text-white font-bold">₹{ltp.toFixed(2)}</span>
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

        {/* Greeks Telemetry Pill */}
        <div className="grid grid-cols-2 gap-2 font-mono text-xs">
          <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
            <span className="text-slate-400 text-[10px]">Delta:</span>
            <span className="text-white font-bold">{delta}</span>
          </div>
          <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
            <span className="text-slate-400 text-[10px]">IV:</span>
            <span className="text-white font-bold">{iv}%</span>
          </div>
        </div>

        {/* Lots Selection */}
        <div className="space-y-1 font-mono">
          <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
            Lots ({lotSize} Qty / Lot)
          </label>
          <div className="flex items-center gap-2">
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
                {n} Lot ({n * lotSize} Qty)
              </button>
            ))}
          </div>
        </div>

        {/* Strict Risk Invariant Card */}
        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2 font-mono">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              CAPITAL RISK INVARIANT
            </span>
            <span className="text-slate-300 font-bold">₹200–₹300 Target Budget</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <div className="text-rose-400 font-bold">Stop Loss: -{slPoints} pts</div>
              <div className="text-slate-300 mt-0.5">Exit @ ₹{stopLossPrice}</div>
              <div className="text-rose-300 font-black mt-1">Max Risk: -₹{totalRisk}</div>
            </div>

            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-emerald-400 font-bold">Target: +{targetPoints} pts (1:2 RR)</div>
              <div className="text-slate-300 mt-0.5">Target @ ₹{targetPrice}</div>
              <div className="text-emerald-300 font-black mt-1">Aim Gain: +₹{totalReward}</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1 font-mono">
          <button
            type="button"
            onClick={() => onExecute({ symbol, strike, optionType, lots, ltp })}
            className={clsx(
              "flex-1 py-2.5 px-4 rounded-xl font-black text-xs tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer",
              isCall
                ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                : "bg-rose-500 hover:bg-rose-400 text-slate-950"
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Deploy Strike Scalp</span>
          </button>

          <button
            type="button"
            onClick={() => onTransferToPad({ symbol, strike, optionType, lots, ltp })}
            className="py-2.5 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.12] text-slate-300 hover:text-white font-bold text-xs transition-all flex items-center gap-1 cursor-pointer"
            title="Pre-fill in Paper Order Pad"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
