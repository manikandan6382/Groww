import React from "react";

export function OrderPriceInputs({
  entryPrice,
  setEntryPrice,
  stopLoss,
  setStopLoss,
  target,
  setTarget,
  quantity,
  setQuantity,
  lotSize
}) {
  const stepPrice = (setter, current, delta) => {
    const val = Math.max(0.05, Math.round((Number(current) + delta) * 20) / 20);
    setter(val.toFixed(2));
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Entry Price */}
      <div className="p-2.5 rounded-xl border border-white/5 bg-white/[0.02]">
        <label className="block text-[11px] font-medium text-zinc-400 mb-1">Entry Price (₹)</label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            step="0.05"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            className="w-full bg-transparent font-mono text-sm font-bold text-zinc-100 focus:outline-none"
          />
          <div className="flex flex-col text-[10px] text-zinc-500">
            <button onClick={() => stepPrice(setEntryPrice, entryPrice, 0.5)} className="hover:text-zinc-200">▲</button>
            <button onClick={() => stepPrice(setEntryPrice, entryPrice, -0.5)} className="hover:text-zinc-200">▼</button>
          </div>
        </div>
      </div>

      {/* Stop Loss */}
      <div className="p-2.5 rounded-xl border border-rose-500/15 bg-rose-500/[0.03]">
        <label className="block text-[11px] font-medium text-rose-300 mb-1">Stop Loss (₹)</label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            step="0.05"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            className="w-full bg-transparent font-mono text-sm font-bold text-rose-300 focus:outline-none"
          />
          <div className="flex flex-col text-[10px] text-rose-400/60">
            <button onClick={() => stepPrice(setStopLoss, stopLoss, 0.5)} className="hover:text-rose-200">▲</button>
            <button onClick={() => stepPrice(setStopLoss, stopLoss, -0.5)} className="hover:text-rose-200">▼</button>
          </div>
        </div>
      </div>

      {/* Target Price */}
      <div className="p-2.5 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.03]">
        <label className="block text-[11px] font-medium text-emerald-300 mb-1">Target (₹)</label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            step="0.05"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full bg-transparent font-mono text-sm font-bold text-emerald-300 focus:outline-none"
          />
          <div className="flex flex-col text-[10px] text-emerald-400/60">
            <button onClick={() => stepPrice(setTarget, target, 0.5)} className="hover:text-emerald-200">▲</button>
            <button onClick={() => stepPrice(setTarget, target, -0.5)} className="hover:text-emerald-200">▼</button>
          </div>
        </div>
      </div>

      {/* Quantity / Lots */}
      <div className="p-2.5 rounded-xl border border-white/5 bg-white/[0.02]">
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-medium text-zinc-400">Qty (Units)</label>
          <span className="text-[10px] text-zinc-500 font-mono">Lot: {lotSize}</span>
        </div>
        <div className="flex items-center gap-1">
          <input
            type="number"
            step={lotSize}
            min={lotSize}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full bg-transparent font-mono text-sm font-bold text-zinc-100 focus:outline-none"
          />
          <div className="flex flex-col text-[10px] text-zinc-500">
            <button onClick={() => setQuantity(Number(quantity) + lotSize)} className="hover:text-zinc-200">▲</button>
            <button onClick={() => setQuantity(Math.max(lotSize, Number(quantity) - lotSize))} className="hover:text-zinc-200">▼</button>
          </div>
        </div>
      </div>
    </div>
  );
}
