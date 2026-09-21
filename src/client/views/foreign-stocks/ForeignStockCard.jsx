import React, { useState } from "react";
import clsx from "clsx";
import { ArrowUpRight, ArrowDownRight, Star, TrendingUp, Layers, Check } from "lucide-react";
import { RollingTicker } from "../../components/common/RollingTicker";
import { soundEngine } from "../../utils/soundEngine";
import { SparklineArea } from "./SparklineArea";
import { Range52Week } from "./Range52Week";
import { USD_INR_RATE } from "./foreignStocksData";

/**
 * 🍏 Master Apple Vision Pro US Titan Stock Card
 * Features interactive 1D/1M/1Y/5Y timeframe sparkline morphing,
 * Risk-adjusted Alpha Badges (Beta β & ATH Drawdown),
 * and side-by-side comparison dock integration.
 */
export function ForeignStockCard({
  stock,
  onSelectSimStock,
  copiedSymbol,
  onCopySymbol,
  onOpenDetail,
  isWatchlisted = false,
  onToggleWatchlist,
  isComparing = false,
  onToggleCompare
}) {
  const [activeTf, setActiveTf] = useState("1M");

  const inrPrice = stock.price * USD_INR_RATE;
  const inrDayChange = stock.change * USD_INR_RATE;

  // Safe fallback chain for sparkline data
  const sparklineData = stock.timeframeSparklines?.[activeTf] || stock.sparkline || [stock.price, stock.price];
  const isTfGain = sparklineData.length >= 2 
    ? sparklineData[sparklineData.length - 1] >= sparklineData[0]
    : stock.isGain;

  // Beta badge styling
  const beta = stock.beta || 1.15;
  const isHighBeta = beta >= 1.5;
  const isDefensive = beta <= 1.05;

  return (
    <div 
      className="p-4 sm:p-4.5 rounded-3xl bg-[#0d0f14]/85 hover:bg-[#121424]/95 border border-white/[0.07] hover:border-cyan-500/40 transition-all duration-300 backdrop-blur-3xl shadow-[0_12px_36px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] group flex flex-col justify-between space-y-3 cursor-pointer relative overflow-hidden"
      onClick={() => onOpenDetail?.(stock)}
    >
      {/* Top Ambient Glow */}
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/20 transition-all" />

      {/* Card Header: Emblem, Symbol, Badges & Star */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-cyan-500/15 to-emerald-500/20 border border-white/10 text-cyan-300 flex items-center justify-center font-mono font-black text-xs shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
              {stock.symbol.slice(0, 3)}
            </div>
            <div className="min-w-0">
              <strong className="text-sm font-black text-white font-mono block leading-tight flex items-center gap-1.5">
                {stock.symbol}
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-cyan-300 font-sans font-normal">
                  ↗
                </span>
              </strong>
              <span className="text-[10px] text-slate-400 truncate block font-medium">
                {stock.name}
              </span>
            </div>
          </div>

          {/* Right Top Actions: Tag & Watchlist Pin */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[8px] font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20 whitespace-nowrap">
              {stock.tag}
            </span>

            {/* Watchlist Pin Button (44px touch-accessible) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleWatchlist?.(stock.symbol);
              }}
              className={clsx(
                "p-1.5 min-w-[32px] min-h-[32px] rounded-xl border transition cursor-pointer flex items-center justify-center active:scale-95",
                isWatchlisted
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.25)]"
                  : "bg-white/[0.03] border-white/5 text-slate-500 hover:text-white hover:bg-white/[0.06]"
              )}
              title={isWatchlisted ? "Remove from Watchlist" : "Pin to Watchlist"}
              aria-label={`Favorite ${stock.symbol}`}
            >
              <Star className={clsx("w-3.5 h-3.5", isWatchlisted && "fill-amber-300 text-amber-300")} />
            </button>
          </div>
        </div>

        {/* Risk/Reward Telemetry Badges */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {/* Volatility Beta Pill */}
          <span 
            className={clsx(
              "text-[8px] font-mono font-black px-2 py-0.5 rounded-md border",
              isHighBeta
                ? "bg-amber-500/15 border-amber-500/35 text-amber-300"
                : isDefensive
                ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-300"
                : "bg-cyan-500/15 border-cyan-500/35 text-cyan-300"
            )}
            title={`Beta ${beta.toFixed(2)}: Relative volatility vs S&P 500`}
          >
            β {beta.toFixed(2)} {isHighBeta ? "· High Alpha" : isDefensive ? "· Anchor" : "· Core"}
          </span>

          {/* 3Y CAGR Pill */}
          <span className="text-[8px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-slate-300">
            +{stock.cagr3Y || 15}% 3Y CAGR
          </span>

          {/* ATH Discount Proximity */}
          {stock.drawdown52W != null && (
            <span 
              className={clsx(
                "text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-md border",
                stock.drawdown52W > -6
                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                  : "bg-indigo-500/10 border-indigo-500/25 text-indigo-300"
              )}
            >
              {stock.drawdown52W > -6 ? "Near ATH" : `${stock.drawdown52W}% vs Peak`}
            </span>
          )}
        </div>

        {/* Plain English "What They Do" */}
        <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2">
          {stock.whatItDoes}
        </p>
      </div>

      {/* Pricing Matrix (USD & INR) */}
      <div className="space-y-2 pt-2 border-t border-white/[0.06]">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-lg font-black text-white font-mono tabular-nums tracking-tight">
              <RollingTicker value={stock.price} prefix="$" decimalPlaces={2} className="text-white font-black" />
            </div>
            <span 
              className="text-[10px] font-mono text-slate-400 block"
              title={`Converted at live rate ₹${USD_INR_RATE.toFixed(2)}/USD`}
            >
              ≈ ₹{inrPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </span>
          </div>

          <div className="text-right">
            <span className={clsx(
              "text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm justify-end",
              stock.isGain 
                ? "text-emerald-300 bg-emerald-500/15 border border-emerald-500/30" 
                : "text-rose-300 bg-rose-500/15 border border-rose-500/30"
            )}>
              {stock.isGain ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
              {stock.isGain ? "+" : ""}{stock.change.toFixed(2)} ({stock.isGain ? "+" : ""}{stock.changePct}%)
            </span>
            <span className="text-[9px] font-mono text-slate-500 block mt-0.5">
              {stock.isGain ? "+₹" : "-₹"}{Math.abs(inrDayChange).toFixed(0)} Day
            </span>
          </div>
        </div>

        {/* Multi-Horizon Interactive Sparkline Row */}
        <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-1 font-mono text-[9px]">
              <span className="text-slate-400">P/E: <strong className="text-slate-200">{stock.peRatio}</strong></span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">Cap: <strong className="text-slate-200">{stock.mktCap}</strong></span>
            </div>

            {/* Timeframe Switcher (1D · 1M · 1Y · 5Y) */}
            <div 
              className="flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {["1D", "1M", "1Y", "5Y"].map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => {
                    setActiveTf(tf);
                    soundEngine.playTabSwitchTone();
                  }}
                  className={clsx(
                    "px-1.5 py-0.5 rounded text-[8px] font-mono font-bold transition cursor-pointer active:scale-95",
                    activeTf === tf
                      ? "bg-cyan-500/25 text-cyan-200 border border-cyan-500/40 shadow-sm"
                      : "text-slate-500 hover:text-slate-300 bg-white/[0.02]"
                  )}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Morphing Sparkline Area */}
          <SparklineArea 
            data={sparklineData} 
            isGain={isTfGain} 
            width={72} 
            height={26} 
          />
        </div>

        {/* 52-Week Range Bar */}
        <Range52Week low={stock.low52} high={stock.high52} current={stock.price} isGain={stock.isGain} />
      </div>

      {/* Action Bar: Compare, Simulate, & Copy */}
      <div 
        className="pt-2 border-t border-white/[0.06] flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Simulate in Section 3 */}
        <button
          type="button"
          onClick={() => onSelectSimStock(stock.symbol)}
          className="flex-1 py-1.5 rounded-xl bg-white/[0.04] hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-500/35 text-[10px] font-mono font-bold text-slate-200 hover:text-cyan-200 transition cursor-pointer text-center active:scale-95"
          title="Load into Section 3 Simulator"
        >
          ⚡ Simulate ₹
        </button>

        {/* Compare Toggle Button */}
        <button
          type="button"
          onClick={() => onToggleCompare?.(stock.symbol)}
          className={clsx(
            "px-2.5 py-1.5 rounded-xl border text-[10px] font-mono font-bold transition cursor-pointer flex items-center gap-1 active:scale-95",
            isComparing
              ? "bg-cyan-500/25 border-cyan-500/50 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
              : "bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white"
          )}
          title={isComparing ? "Remove from comparison dock" : "Add to comparison dock (max 3)"}
        >
          {isComparing ? (
            <>
              <Check className="w-3 h-3 text-cyan-300" />
              <span>Comparing</span>
            </>
          ) : (
            <>
              <Layers className="w-3 h-3 text-slate-400" />
              <span>Compare</span>
            </>
          )}
        </button>

        {/* Copy Symbol */}
        <button
          type="button"
          onClick={() => onCopySymbol(stock.symbol)}
          className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[10px] font-mono text-slate-300 hover:text-white transition cursor-pointer active:scale-95"
          title="Copy Symbol"
        >
          {copiedSymbol === stock.symbol ? "✓" : "📋"}
        </button>
      </div>
    </div>
  );
}

export default ForeignStockCard;
