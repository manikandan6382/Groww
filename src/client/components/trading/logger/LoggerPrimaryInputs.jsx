import React from "react";

export function LoggerPrimaryInputs({
  symbol,
  setSymbol,
  side,
  setSide,
  quantity,
  setQuantity,
  entryPrice,
  setEntryPrice,
  exitPrice,
  setExitPrice,
  onOpenTopic
}) {
  return (
    <>
      {/* Tab 1: Symbol (3 cols) */}
      <div className="md:col-span-3 space-y-1">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          1. Symbol / Strike
        </label>
        <input
          id="formTradingsymbol"
          tabIndex={1}
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="w-full px-3 py-2 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-400/50"
          placeholder="e.g. NIFTY 24500 CE"
          required
        />
      </div>

      {/* Tab 2: Direction (2 cols) */}
      <div className="md:col-span-2 space-y-1">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          2. Action
        </label>
        <select
          tabIndex={2}
          value={side}
          onChange={(e) => setSide(e.target.value)}
          className="w-full px-3 py-2 text-xs bg-slate-900 border border-white/10 rounded-xl text-white font-bold focus:outline-none focus:border-cyan-400/50"
        >
          <option value="BUY">🟢 BUY (Long)</option>
          <option value="SELL">🔴 SELL (Short)</option>
        </select>
      </div>

      {/* Tab 3: Qty (2 cols) */}
      <div className="md:col-span-2 space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            3. Quantity
          </label>
          <button
            type="button"
            onClick={() => onOpenTopic?.("lot_size")}
            className="text-slate-500 hover:text-cyan-400 text-[10px] flex items-center gap-0.5 cursor-pointer"
            title="Learn about Lot Sizes in Guide"
          >
            <span>?</span>
          </button>
        </div>
        <input
          tabIndex={3}
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-full px-3 py-2 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-400/50"
          required
        />
      </div>

      {/* Tab 4: Entry Price (2 cols) */}
      <div className="md:col-span-2 space-y-1">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          4. Entry Price (₹)
        </label>
        <input
          tabIndex={4}
          type="number"
          step="0.05"
          value={entryPrice}
          onChange={(e) => setEntryPrice(e.target.value)}
          className="w-full px-3 py-2 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-400/50"
          required
        />
      </div>

      {/* Tab 5: Exit Price (3 cols) */}
      <div className="md:col-span-3 space-y-1">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          5. Exit Price (₹)
        </label>
        <input
          tabIndex={5}
          type="number"
          step="0.05"
          value={exitPrice}
          onChange={(e) => setExitPrice(e.target.value)}
          className="w-full px-3 py-2 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-cyan-400 font-mono font-bold focus:outline-none focus:border-cyan-400/50"
          required
        />
      </div>
    </>
  );
}
