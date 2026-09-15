import React from "react";
import clsx from "clsx";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { RollingTicker } from "../../components/common/RollingTicker";
import { soundEngine } from "../../utils/soundEngine";
import { SparklineArea } from "./SparklineArea";
import { Range52Week } from "./Range52Week";
import { USD_INR_RATE } from "./foreignStocksData";

export function ForeignStockCard({
  stock,
  onSelectSimStock,
  copiedSymbol,
  onCopySymbol
}) {
  const inrPrice = stock.price * USD_INR_RATE;
  const inrDayChange = stock.change * USD_INR_RATE;

  return (
    <div className="p-4 rounded-3xl bg-[#0d0f14]/85 hover:bg-[#121424]/95 border border-white/[0.07] hover:border-cyan-500/40 transition-all duration-300 backdrop-blur-3xl shadow-[0_12px_36px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] group flex flex-col justify-between space-y-3 cursor-default">
      {/* Card Header: Emblem, Symbol & Sector */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center font-mono font-black text-xs shadow-sm flex-shrink-0">
              {stock.symbol.slice(0, 3)}
            </div>
            <div className="min-w-0">
              <strong className="text-sm font-black text-white font-mono block leading-tight">
                {stock.symbol}
              </strong>
              <span className="text-[10px] text-slate-400 truncate block">
                {stock.name}
              </span>
            </div>
          </div>

          <span className="text-[8px] font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20 whitespace-nowrap flex-shrink-0">
            {stock.tag}
          </span>
        </div>

        {/* Plain English "What They Do" */}
        <p className="text-[11px] text-slate-300 leading-relaxed mt-2.5 line-clamp-2">
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
            <span className="text-[10px] font-mono text-slate-400 block">
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

        {/* Area Sparkline */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[9px] font-mono text-slate-400">P/E: {stock.peRatio} · MCap: {stock.mktCap}</span>
          <SparklineArea data={stock.sparkline} isGain={stock.isGain} width={64} height={22} />
        </div>

        {/* 52-Week Range Bar */}
        <Range52Week low={stock.low52} high={stock.high52} current={stock.price} isGain={stock.isGain} />
      </div>

      {/* Action Bar */}
      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            onSelectSimStock(stock.symbol);
            soundEngine.playTabSwitchTone();
            window.scrollTo({ top: 300, behavior: "smooth" });
          }}
          className="flex-1 py-1.5 rounded-xl bg-white/[0.04] hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-500/30 text-[10px] font-mono font-bold text-slate-200 hover:text-cyan-200 transition cursor-pointer text-center"
        >
          ⚡ Simulate ₹
        </button>

        <button
          type="button"
          onClick={() => onCopySymbol(stock.symbol)}
          className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[10px] font-mono text-slate-300 hover:text-white transition cursor-pointer"
          title="Copy Symbol"
        >
          {copiedSymbol === stock.symbol ? "✓ Copied" : "📋"}
        </button>
      </div>
    </div>
  );
}
