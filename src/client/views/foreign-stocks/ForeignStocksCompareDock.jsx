import React, { useState } from "react";
import clsx from "clsx";
import { 
  Layers, 
  X, 
  TrendingUp, 
  Sparkles, 
  ShieldCheck, 
  Calculator, 
  ChevronUp, 
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { soundEngine } from "../../utils/soundEngine";
import { USD_INR_RATE } from "./foreignStocksData";

/**
 * 🍏 Master Apple Vision Pro Titan Compare Dock
 * Floating glassmorphic dock comparing up to 3 US Titans head-to-head
 * across Valuation, Growth, Beta Volatility, and Dividend Tax Relief.
 */
export function ForeignStocksCompareDock({
  comparedStocks = [],
  onRemoveStock,
  onClearAll,
  onSelectSimStock,
  onOpenDetail
}) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!comparedStocks || comparedStocks.length === 0) return null;

  return (
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-4xl transition-all duration-300">
      <div className="rounded-3xl bg-[#090b12]/95 border border-cyan-500/35 backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.15)] overflow-hidden">
        
        {/* Dock Header Bar */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-sm">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider font-mono">
                  Titan Head-to-Head Showdown
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/35">
                  {comparedStocks.length}/3 Titans
                </span>
              </div>
              <span className="text-[10px] text-slate-400 hidden sm:block">
                Compare multi-year CAGR, risk beta, and Indian tax efficiency side-by-side.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Clear All */}
            <button
              type="button"
              onClick={onClearAll}
              className="text-[11px] font-mono text-slate-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-white/5 transition cursor-pointer"
            >
              Clear
            </button>

            {/* Minimize / Expand Toggle */}
            <button
              type="button"
              onClick={() => {
                setIsMinimized(!isMinimized);
                soundEngine.playTabSwitchTone();
              }}
              className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
              title={isMinimized ? "Expand Dock" : "Minimize Dock"}
            >
              {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Expanded Comparison Matrix */}
        {!isMinimized && (
          <div className="p-3 sm:p-4 overflow-x-auto max-h-[70vh]">
            <div className={clsx(
              "grid gap-3",
              comparedStocks.length === 1 && "grid-cols-1 max-w-sm mx-auto",
              comparedStocks.length === 2 && "grid-cols-1 sm:grid-cols-2",
              comparedStocks.length === 3 && "grid-cols-1 sm:grid-cols-3"
            )}>
              {comparedStocks.map((stock) => {
                const inrPrice = stock.price * USD_INR_RATE;
                const isHighBeta = (stock.beta || 1) >= 1.5;

                return (
                  <div 
                    key={stock.symbol}
                    className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-cyan-500/30 transition-all flex flex-col justify-between space-y-3"
                  >
                    {/* Header */}
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-200 flex items-center justify-center font-mono font-black text-xs">
                            {stock.symbol.slice(0, 3)}
                          </div>
                          <div>
                            <strong className="text-sm font-black text-white font-mono block leading-tight">
                              {stock.symbol}
                            </strong>
                            <span className="text-[10px] text-slate-400 truncate block max-w-[120px]">
                              {stock.name}
                            </span>
                          </div>
                        </div>

                        {/* Remove from comparison */}
                        <button
                          type="button"
                          onClick={() => onRemoveStock?.(stock.symbol)}
                          className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition cursor-pointer"
                          title="Remove Titan"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Price Matrix */}
                      <div className="mt-2.5 flex items-baseline justify-between pt-2 border-t border-white/5">
                        <span className="text-base font-black font-mono text-white tabular-nums">
                          ${stock.price.toFixed(2)}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          ≈ ₹{inrPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>

                    {/* Metrics Comparison Grid */}
                    <div className="space-y-1.5 text-xs font-mono">
                      {/* 3Y CAGR */}
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.02] border border-white/5">
                        <span className="text-slate-400 text-[10px]">3Y CAGR:</span>
                        <strong className="text-cyan-300 font-bold">+{stock.cagr3Y || 15}%</strong>
                      </div>

                      {/* Volatility Beta */}
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.02] border border-white/5">
                        <span className="text-slate-400 text-[10px]">Risk Beta (β):</span>
                        <strong className={isHighBeta ? "text-amber-300 font-bold" : "text-emerald-300 font-bold"}>
                          {stock.beta ? stock.beta.toFixed(2) : "1.15"} {isHighBeta ? "· High" : "· Anchor"}
                        </strong>
                      </div>

                      {/* P/E Ratio */}
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.02] border border-white/5">
                        <span className="text-slate-400 text-[10px]">P/E Valuation:</span>
                        <strong className="text-slate-200">{stock.peRatio}</strong>
                      </div>

                      {/* 52W Proximity */}
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.02] border border-white/5">
                        <span className="text-slate-400 text-[10px]">Peak Drawdown:</span>
                        <strong className={stock.drawdown52W > -6 ? "text-emerald-300" : "text-indigo-300"}>
                          {stock.drawdown52W != null ? `${stock.drawdown52W}%` : "-8.5%"}
                        </strong>
                      </div>

                      {/* Dividend & US IRS Tax */}
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.02] border border-white/5">
                        <span className="text-slate-400 text-[10px]">US Tax Mode:</span>
                        <span className="text-[10px] text-slate-300 truncate max-w-[130px]">
                          {stock.dividendTaxType === "growth_zero" 
                            ? "0% Drag (Growth)" 
                            : "Form 67 DTAA Relief"}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-white/5 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectSimStock?.(stock.symbol);
                          soundEngine.playTabSwitchTone();
                        }}
                        className="flex-1 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-[10px] font-mono font-bold transition cursor-pointer text-center active:scale-95"
                      >
                        ⚡ Simulate
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenDetail?.(stock)}
                        className="px-2.5 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white text-[10px] font-mono transition cursor-pointer"
                        title="Open Deep-Dive Modal"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default ForeignStocksCompareDock;
