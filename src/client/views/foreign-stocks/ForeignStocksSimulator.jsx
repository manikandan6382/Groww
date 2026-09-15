import React from "react";
import clsx from "clsx";
import { Calculator } from "lucide-react";
import { soundEngine } from "../../utils/soundEngine";
import { USD_INR_RATE, DEFAULT_US_STOCKS } from "./foreignStocksData";

export function ForeignStocksSimulator({
  simRupees,
  setSimRupees,
  simStockSymbol,
  setSimStockSymbol,
  simStock,
  simUsdCapital,
  simSharesOwned,
  simProjectedInrValue,
  simTotalInrRoiPct
}) {
  return (
    <div className="p-6 rounded-3xl bg-gradient-to-br from-[#121424]/95 via-[#0d0f14]/95 to-[#060709]/95 border border-cyan-500/20 backdrop-blur-3xl shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-cyan-400" />
            <h2 className="text-base font-black text-white uppercase tracking-wider">
              Interactive Rupee-to-Dollar Investment Simulator
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Calculate exact USD allocation, fractional share ownership, and projected 1-Year INR returns.
          </p>
        </div>
        <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20 self-start sm:self-auto">
          Live Math Engine
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Controls: Rupee Input & Stock Selector */}
        <div className="lg:col-span-5 space-y-4">
          {/* Rupee Amount Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">
              1. Select Investment in Indian Rupees (₹)
            </label>
            <div className="flex items-center gap-2">
              {[10000, 25000, 50000, 100000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setSimRupees(amt);
                    soundEngine.playTabSwitchTone();
                  }}
                  className={clsx(
                    "flex-1 py-2 rounded-xl text-xs font-mono font-bold border transition cursor-pointer active:scale-95",
                    simRupees === amt
                      ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-200 shadow-md"
                      : "bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06]"
                  )}
                >
                  ₹{(amt / 1000).toFixed(0)}K
                </button>
              ))}
            </div>
            <div className="relative mt-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-sm">
                ₹
              </span>
              <input
                type="number"
                value={simRupees}
                onChange={(e) => setSimRupees(Math.max(100, Number(e.target.value)))}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-8 pr-3 py-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-cyan-500/50"
                placeholder="Enter custom INR amount"
              />
            </div>
          </div>

          {/* Stock Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">
              2. Choose Target US Giant
            </label>
            <div className="grid grid-cols-4 gap-2">
              {DEFAULT_US_STOCKS.map((stock) => (
                <button
                  key={stock.symbol}
                  type="button"
                  onClick={() => {
                    setSimStockSymbol(stock.symbol);
                    soundEngine.playTabSwitchTone();
                  }}
                  className={clsx(
                    "py-2 px-1 rounded-xl text-xs font-mono font-bold border transition text-center cursor-pointer active:scale-95",
                    simStockSymbol === stock.symbol
                      ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-200 shadow-md"
                      : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white"
                  )}
                >
                  {stock.symbol}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Output: Real-time Conversion Matrix */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-2xl grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">USD Conversion</span>
            <div className="text-base sm:text-lg font-mono font-black text-white tabular-nums">
              ${simUsdCapital.toFixed(2)}
            </div>
            <small className="text-[9px] text-slate-400 block font-mono">@ ₹{USD_INR_RATE}/USD</small>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Shares Owned</span>
            <div className="text-base sm:text-lg font-mono font-black text-cyan-300 tabular-nums">
              {simSharesOwned.toFixed(3)}
            </div>
            <small className="text-[9px] text-slate-400 block font-mono">{simStock.symbol} Fractional</small>
          </div>

          <div className="space-y-1 sm:col-span-1 col-span-2">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">1-Yr Est. INR Value</span>
            <div className="text-base sm:text-lg font-mono font-black text-emerald-400 tabular-nums">
              ₹{simProjectedInrValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </div>
            <small className="text-[9px] text-emerald-300 font-bold block font-mono">
              +{simTotalInrRoiPct}% Net INR ROI
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}
