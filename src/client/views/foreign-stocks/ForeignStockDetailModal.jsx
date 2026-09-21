import React, { useState, useEffect } from "react";
import clsx from "clsx";
import { 
  X, 
  ExternalLink, 
  ArrowUpRight, 
  ArrowDownRight, 
  Star, 
  Calculator, 
  TrendingUp, 
  ShieldCheck, 
  Globe2 
} from "lucide-react";
import { soundEngine } from "../../utils/soundEngine";
import { RollingTicker } from "../../components/common/RollingTicker";
import { SparklineArea } from "./SparklineArea";
import { Range52Week } from "./Range52Week";
import { USD_INR_RATE, USD_ANNUAL_ALPHA } from "./foreignStocksData";

/**
 * 🍏 Master Apple Vision Pro Foreign Stock Deep-Dive Modal
 */
export function ForeignStockDetailModal({
  stock,
  isOpen,
  onClose,
  isWatchlisted,
  onToggleWatchlist,
  onSimulate
}) {
  const [activeTimeframe, setActiveTimeframe] = useState("1Y");

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !stock) return null;

  const inrPrice = stock.price * USD_INR_RATE;
  const inrDayChange = stock.change * USD_INR_RATE;
  const sparklineData = stock.timeframeSparklines?.[activeTimeframe] || stock.sparkline;

  const handleTimeframeChange = (tf) => {
    setActiveTimeframe(tf);
    soundEngine.playTabSwitchTone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Dimmed Blur Backdrop */}
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-xl transition-opacity animate-in fade-in duration-200" 
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl rounded-3xl bg-[#0d0f14]/95 border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.15)] overflow-hidden z-10 transition-all space-y-5 p-6 sm:p-7">
        
        {/* Glow Aura */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-cyan-500/15 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* ── 1. Header: Emblem, Names, Watchlist & Close ── */}
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/25 to-cyan-500/25 border border-indigo-500/40 text-indigo-200 flex items-center justify-center font-mono font-black text-sm shadow-md">
              {stock.symbol.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white font-mono tracking-tight">
                  {stock.symbol}
                </h2>
                <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-500/15 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                  {stock.tag || stock.sectorLabel}
                </span>
              </div>
              <span className="text-xs text-slate-400 block mt-0.5">
                {stock.name} · {stock.sectorLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onToggleWatchlist(stock.symbol)}
              className={clsx(
                "p-2 rounded-xl border transition cursor-pointer flex items-center justify-center",
                isWatchlisted
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-sm"
                  : "bg-white/[0.04] border-white/10 text-slate-400 hover:text-white"
              )}
              title={isWatchlisted ? "Remove from Watchlist" : "Add to Watchlist"}
            >
              <Star className={clsx("w-4 h-4", isWatchlisted && "fill-amber-400")} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              title="Close modal (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── 2. Pricing Row & Timeframe Switcher ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              Market Quote
            </span>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono tabular-nums tracking-tight">
                <RollingTicker value={stock.price} prefix="$" decimalPlaces={2} className="text-white font-black" />
              </span>
              <span className="text-xs font-mono text-slate-400">
                ≈ ₹{inrPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={clsx(
                "text-[11px] font-mono font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm",
                stock.isGain 
                  ? "text-emerald-300 bg-emerald-500/15 border border-emerald-500/30" 
                  : "text-rose-300 bg-rose-500/15 border border-rose-500/30"
              )}>
                {stock.isGain ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stock.isGain ? "+" : ""}{stock.change.toFixed(2)} ({stock.isGain ? "+" : ""}{stock.changePct}%)
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {stock.isGain ? "+₹" : "-₹"}{Math.abs(inrDayChange).toFixed(0)} Day Impact
              </span>
            </div>
          </div>

          {/* Timeframe Chips */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/10">
            {["1D", "1M", "1Y", "5Y"].map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => handleTimeframeChange(tf)}
                className={clsx(
                  "px-3 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer",
                  activeTimeframe === tf
                    ? "bg-cyan-500/25 text-cyan-200 border border-cyan-500/40 shadow-sm"
                    : "text-slate-400 hover:text-white"
                )}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* ── 3. High-Definition Chart Surface ── */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] backdrop-blur-md flex flex-col items-center justify-center space-y-2">
          <div className="w-full flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>Historical Trend ({activeTimeframe})</span>
            <span className="text-cyan-300 font-bold">3-Yr CAGR: +{stock.cagr3Y || 15}%</span>
          </div>
          <div className="w-full flex justify-center py-2">
            <SparklineArea 
              data={sparklineData} 
              isGain={stock.isGain} 
              width={520} 
              height={70} 
            />
          </div>
          <Range52Week low={stock.low52} high={stock.high52} current={stock.price} isGain={stock.isGain} />
        </div>

        {/* ── 4. Key Financial Fundamentals Matrix ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Market Cap</span>
            <strong className="text-sm font-mono font-black text-white">{stock.mktCap}</strong>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">P/E Ratio</span>
            <strong className="text-sm font-mono font-black text-white">{stock.peRatio}</strong>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Rev. Growth</span>
            <strong className="text-sm font-mono font-black text-cyan-300">{stock.revGrowth || "N/A"}</strong>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Analyst Rating</span>
            <strong className="text-xs font-mono font-bold text-emerald-400 block truncate">{stock.analystRating}</strong>
          </div>
        </div>

        {/* ── 5. Business Moat Narrative ── */}
        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
            Why It Monopolizes
          </span>
          <p className="text-xs text-slate-300 leading-relaxed">
            {stock.whatItDoes}
          </p>
        </div>

        {/* ── 6. Indian Investor Tax & Dividend Telemetry Card ── */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-white/[0.03] to-transparent border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Indian Tax Compliance (Finance Act 2024)</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
              LTCG: 12.5% (&gt;24M)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Capital Gains Tax:</span>
                <span className="text-white">Holding &ge; 24 Mo</span>
              </div>
              <div className="text-xs text-slate-200">
                • <strong className="text-emerald-300">12.5%</strong> LTCG without indexation<br />
                • <span className="text-slate-400">&lt;24 Mo:</span> Slab rate (STCG)
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Dividend Treatment:</span>
                <span className="text-cyan-300">Yield: {stock.divYield || "0.00%"}</span>
              </div>
              {parseFloat((stock.divYield || "0").replace(/[^0-9.]/g, "")) > 0 ? (
                <div className="text-[11px] text-slate-200 leading-snug">
                  • <strong className="text-amber-300">25% US IRS Tax</strong> withheld at source<br />
                  • <strong className="text-cyan-300">Form 67 FTC:</strong> 100% offset against ITR-2
                </div>
              ) : (
                <div className="text-[11px] text-slate-200 leading-snug">
                  • <strong className="text-emerald-300">0% Dividend Drag:</strong> 100% retained earnings<br />
                  • Pure compounding with zero IRS withholding
                </div>
              )}
            </div>
          </div>

          <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
            📌 <strong>Compliance Rule:</strong> Foreign equities mandate filing <strong>ITR-2 (Schedule FA)</strong>. Under DTAA Article 10, US dividend tax is claimable as Foreign Tax Credit (FTC) to eliminate double taxation.
          </p>
        </div>

        {/* ── 6. Action Dock: Simulate & Broker Links ── */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={() => {
              onSimulate(stock.symbol);
              onClose();
            }}
            className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-500/25 to-indigo-500/25 hover:from-cyan-500/35 hover:to-indigo-500/35 border border-cyan-500/40 text-cyan-200 font-mono font-black text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg active:scale-98"
          >
            <Calculator className="w-4 h-4" />
            <span>Simulate ₹ Compounding ({stock.symbol})</span>
          </button>

          <a
            href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(stock.tradingViewSymbol || `NASDAQ:${stock.symbol}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto py-3 px-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white font-mono font-bold text-xs transition flex items-center justify-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span>TradingView Chart</span>
          </a>
        </div>

      </div>
    </div>
  );
}

export default ForeignStockDetailModal;
