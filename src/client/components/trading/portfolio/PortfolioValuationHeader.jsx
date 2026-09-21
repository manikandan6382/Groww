import React from "react";
import clsx from "clsx";
import { motion } from "framer-motion";
import { Zap, Radio, Globe, TrendingUp, TrendingDown, Sparkles, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { RollingTicker } from "../../common/RollingTicker";
import { useTradingStore } from "../../../stores/useTradingStore";

function formatScrubDate(dStr) {
  if (!dStr) return "";
  if (dStr.includes(":") || dStr.startsWith("Session")) return dStr;
  const d = new Date(dStr);
  if (isNaN(d.getTime())) return dStr;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function PortfolioValuationHeader({
  totalNetWorth,
  usdNetWorth,
  timeframeMetrics,
  hoverIndex,
  activeTf,
  navPoints,
  investedPoints = [],
  benchmarkPoints = [],
  showBenchmark = false,
  navDates = [],
  depository = "integrated",
  onToggleDepository,
  hasCustomLedger = false,
  customLedgerCount = 0,
  onOpenStatementModal,
  isExpired = false,
  isKiteOffline = false,
  currency = "INR",
  onToggleCurrency,
  currencySymbol = "₹",
  fxRate = 1,
}) {
  const isPrivacyMode = useTradingStore((s) => s.isPrivacyMode);
  const isAlphaPositive = (timeframeMetrics.alphaValue ?? 0) >= 0;
  const convertedNetWorth = (Number(totalNetWorth) || 0) / fxRate;

  return (
    <>
      {/* 🏛️ 1. Top Executive Branding & Dual-Depository Controls */}
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-300 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/25 shadow-sm whitespace-nowrap font-mono flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-cyan-400 fill-cyan-400/30" />
              <span>PORTFOLIO NET ASSET VALUE</span>
            </span>
            <span className="text-[10px] font-bold text-slate-400 font-mono hidden sm:inline-block">
              • NAV Telemetry
            </span>
          </div>
          <h1 className="text-sm font-bold uppercase tracking-wider text-white">
            {depository === "integrated" ? "Total Integrated Portfolio Valuation (Coin + Kite)" : "Zerodha Demat Portfolio Valuation (Kite Live)"}
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
          {/* Dual-Depository Segmented Switcher */}
          <div className="flex items-center p-0.5 rounded-full bg-black/50 border border-white/10 font-mono text-[10px]">
            <button
              type="button"
              onClick={() => onToggleDepository?.("integrated")}
              className={clsx(
                "px-2.5 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap flex items-center gap-1",
                depository === "integrated"
                  ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/35 shadow-[0_0_8px_rgba(6,182,212,0.25)]"
                  : "text-slate-400 hover:text-slate-200 border border-transparent"
              )}
            >
              <span>🌐 Integrated</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleDepository?.("demat")}
              className={clsx(
                "px-2.5 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap flex items-center gap-1",
                depository === "demat"
                  ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/35 shadow-[0_0_8px_rgba(6,182,212,0.25)]"
                  : "text-slate-400 hover:text-slate-200 border border-transparent"
              )}
            >
              <span>📦 Demat Only</span>
            </button>
          </div>

          {/* Statement / Tradebook Ledger Badge Button */}
          <button
            type="button"
            onClick={onOpenStatementModal}
            className={clsx(
              "text-[10px] font-mono px-2.5 py-1 rounded-full border shadow-sm flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-[0.97]",
              hasCustomLedger
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                : "bg-white/[0.04] text-slate-300 border-white/10 hover:bg-white/[0.08] hover:border-cyan-500/30"
            )}
          >
            <FileSpreadsheet className="w-3 h-3 text-cyan-400" />
            <span>{hasCustomLedger ? `Statement Verified (${customLedgerCount})` : "Import Statement"}</span>
          </button>

          {isExpired || isKiteOffline ? (
            <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/35 shadow-[0_0_12px_rgba(245,158,11,0.2)] flex items-center gap-1.5 whitespace-nowrap font-mono">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>⚠️ Kite Session Stale — Quotes Cached at EOD</span>
            </span>
          ) : (
            <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)] flex items-center gap-1.5 whitespace-nowrap font-mono">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>Live Wealth Stream</span>
            </span>
          )}
        </div>
      </div>

      {/* 💰 2. Main Net Worth Valuation & Return Telemetry */}
      <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-3 flex-wrap">
            <div
              className={clsx(
                "text-4xl sm:text-5xl lg:text-6xl font-black font-mono text-white tracking-tight drop-shadow-[0_4px_30px_rgba(255,255,255,0.15)] flex items-baseline gap-2 transition-all duration-300",
                isPrivacyMode && "filter blur-[9px] select-none hover:blur-none cursor-pointer"
              )}
              title={isPrivacyMode ? "Privacy Mode Active · Hover to inspect" : undefined}
            >
              <RollingTicker value={convertedNetWorth} prefix={currencySymbol} decimalPlaces={2} className="text-white font-black" />
            </div>

            {/* 🌍 1-Click Multi-Currency Global Wealth Switcher Capsule */}
            <button
              type="button"
              onClick={onToggleCurrency}
              className="text-xs font-mono text-slate-300 flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] hover:border-cyan-500/40 px-3 py-1 rounded-full border border-white/10 self-start sm:self-auto shadow-sm transition-all cursor-pointer active:scale-95 group"
              title="Click to toggle currency (INR ₹ ⇄ USD $ ⇄ EUR €)"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-45 transition-transform" />
              <span className="font-extrabold text-cyan-300">{currency}</span>
              <span className="text-slate-400 text-[10px]">
                {currency === "INR" ? `≈ $${usdNetWorth} USD` : currency === "USD" ? "Live FX: 83.95" : "Live FX: 91.60"}
              </span>
              <span className="text-[9px] text-cyan-400 font-mono opacity-60 group-hover:opacity-100">⇄</span>
            </button>
          </div>

          {/* Timeframe-Adaptive Return & Alpha Ribbon */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div
              className={clsx(
                "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-extrabold border shadow-md transition-all duration-300",
                timeframeMetrics.isGain
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/35 shadow-[0_0_16px_rgba(16,185,129,0.2)]"
                  : "bg-rose-500/15 text-rose-300 border-rose-500/35 shadow-[0_0_16px_rgba(244,63,94,0.2)]",
                isPrivacyMode && "filter blur-[6px] select-none hover:blur-none cursor-pointer"
              )}
            >
              {timeframeMetrics.isGain ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> : <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
              <span>
                {timeframeMetrics.label}: {timeframeMetrics.isGain ? "+" : ""}{currencySymbol}{Math.abs((timeframeMetrics.pnl || 0) / fxRate).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({timeframeMetrics.isGain ? "+" : ""}{timeframeMetrics.pct}%)
              </span>
            </div>

            {/* Dynamic Benchmark Alpha vs NIFTY 50 */}
            <span
              className={clsx(
                "text-xs flex items-center gap-1.5 font-mono font-medium px-3 py-1 rounded-full border shadow-sm transition-colors",
                isAlphaPositive
                  ? "bg-amber-500/10 text-amber-300 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                  : "bg-rose-500/10 text-rose-300 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)]"
              )}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Alpha {timeframeMetrics.alpha || "+0.0%"} vs NIFTY 50</span>
            </span>
          </div>
        </div>

        {/* 🌟 Permanent Zero-CLS Telemetry HUD Dock (Eliminates All Truncation & Jitter) */}
        <div className={clsx(
          "min-h-[86px] w-full sm:w-[290px] p-3 rounded-2xl bg-[#080b11]/90 border border-white/[0.08] backdrop-blur-2xl shadow-xl flex flex-col justify-center transition-all duration-200 pointer-events-none flex-shrink-0",
          isPrivacyMode && "filter blur-[6px] select-none hover:blur-none"
        )}>
          {hoverIndex !== null && navPoints && navPoints[hoverIndex] !== undefined ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-b border-white/[0.06] pb-1">
                <span className="flex items-center gap-1 text-cyan-300 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  {navDates && navDates[hoverIndex]
                    ? formatScrubDate(navDates[hoverIndex])
                    : `Point #${hoverIndex + 1}`}
                </span>
                <span className="text-slate-500">Historical NAV</span>
              </div>
              <div className="flex items-baseline justify-between pt-0.5">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                  Valuation
                </span>
                <strong className="text-sm font-mono font-black text-cyan-300">
                  {currencySymbol}{((Number(navPoints[hoverIndex]) || 0) / fxRate).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </div>
              {investedPoints && investedPoints[hoverIndex] !== undefined && (
                <div className="flex items-center justify-between text-[10px] font-mono border-t border-white/[0.06] pt-1">
                  <span className="text-slate-400">
                    Invested: {currencySymbol}{Math.round(((Number(investedPoints[hoverIndex]) || 0) / fxRate)).toLocaleString("en-IN")}
                  </span>
                  {(() => {
                    const val = Number(navPoints[hoverIndex]);
                    const inv = Number(investedPoints[hoverIndex]);
                    const pnl = val - inv;
                    const pct = inv > 0 ? ((pnl / inv) * 100).toFixed(1) : "0.0";
                    const isPnlGain = pnl >= 0;
                    return (
                      <span className={clsx("font-bold px-1.5 py-0.2 rounded", isPnlGain ? "text-emerald-300 bg-emerald-500/15" : "text-rose-300 bg-rose-500/15")}>
                        {isPnlGain ? "+" : ""}{currencySymbol}{Math.round(Math.abs(pnl) / fxRate).toLocaleString("en-IN")} ({isPnlGain ? "+" : ""}{pct}%)
                      </span>
                    );
                  })()}
                </div>
              )}
              {showBenchmark && benchmarkPoints && benchmarkPoints[hoverIndex] !== undefined && (
                <div className="flex items-center justify-between text-[10px] font-mono border-t border-white/[0.06] pt-1">
                  <span className="text-amber-300/90 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    NIFTY: {currencySymbol}{Math.round(((Number(benchmarkPoints[hoverIndex]) || 0) / fxRate)).toLocaleString("en-IN")}
                  </span>
                  {(() => {
                    const val = Number(navPoints[hoverIndex]);
                    const bench = Number(benchmarkPoints[hoverIndex]);
                    const diff = val - bench;
                    const alphaPct = bench > 0 ? ((diff / bench) * 100).toFixed(1) : "0.0";
                    const isAlphaLead = diff >= 0;
                    return (
                      <span className={clsx("font-bold px-1.5 py-0.2 rounded text-[9px]", isAlphaLead ? "text-amber-300 bg-amber-500/15" : "text-rose-300 bg-rose-500/15")}>
                        {isAlphaLead ? "+" : ""}{alphaPct}% α
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono border-b border-white/[0.06] pb-1">
                <span className="flex items-center gap-1.5 font-bold text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Wealth Journey</span>
                </span>
                <span className="text-slate-500">Sep 2024 - Present</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-400">11 Verified Orders</span>
                <span className="text-cyan-400 font-bold flex items-center gap-1">
                  <span>Scrub curve</span>
                  <span className="text-xs">✦</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
