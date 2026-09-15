import React from "react";

export function AlertCreatorInputs({
  symbol,
  setSymbol,
  entryPrice,
  setEntryPrice,
  targetPrice,
  setTargetPrice,
  stopLoss,
  setStopLoss
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
          Symbol / Strike
        </label>
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="w-full px-3 py-2 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-400/50"
          placeholder="e.g. NIFTY 24500 CE"
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Entry (₹)
          </label>
          <input
            type="number"
            step="0.05"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-400/50"
            required
          />
        </div>

        <div>
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Target (₹)
          </label>
          <input
            type="number"
            step="0.05"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-400/50"
            required
          />
        </div>

        <div>
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Stop Loss (₹)
          </label>
          <input
            type="number"
            step="0.05"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-rose-400 font-mono font-bold focus:outline-none focus:border-rose-400/50"
            required
          />
        </div>
      </div>
    </div>
  );
}
