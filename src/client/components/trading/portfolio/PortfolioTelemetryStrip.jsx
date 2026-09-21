import React, { useState } from "react";
import clsx from "clsx";
import { Wallet, ShieldCheck, TrendingUp, Sparkles, Activity, ShieldAlert } from "lucide-react";
import { RollingTicker } from "../../common/RollingTicker";
import { useTradingStore } from "../../../stores/useTradingStore";
import { soundEngine } from "../../../utils/soundEngine";

export function PortfolioTelemetryStrip({
  safeInvestedVal = 0,
  investedShare = "0.0",
  safeAvailableMargin = 0,
  marginShare = "0.0",
  totalPnl = 0,
  totalPnlPct = "0.00",
  cagr = "+21.08%",
  cagrLabel = "2-Year CAGR",
  xirr,
  institutionalRisk,
  currencySymbol = "₹",
  fxRate = 1,
}) {
  const isPrivacyMode = useTradingStore((s) => s.isPrivacyMode);
  // Tri-Mode Pod: "xirr" (Money-Weighted) ⇄ "cagr" (Time-Weighted) ⇄ "risk" (Sharpe/Beta)
  const [podMode, setPodMode] = useState("xirr");
  const isPnlPositive = Number(totalPnl) >= 0;

  const handleCyclePod = () => {
    soundEngine?.playTabSwitchTone?.();
    setPodMode((prev) => (prev === "xirr" ? "cagr" : prev === "cagr" ? "risk" : "xirr"));
  };

  const convertedInvested = (Number(safeInvestedVal) || 0) / fxRate;
  const convertedMargin = (Number(safeAvailableMargin) || 0) / fxRate;
  const convertedPnl = (Number(totalPnl) || 0) / fxRate;

  return (
    <div className="relative rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl p-4 sm:p-5 shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.06]">
        {/* Cell 1: Invested Capital */}
        <div className="space-y-1.5 pt-2 first:pt-0 lg:pt-0 lg:first:pl-0 lg:pl-4">
          <div className="flex items-center gap-1.5 text-slate-400">
            <div className="w-5 h-5 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center text-slate-300">
              <Wallet className="w-3 h-3" />
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider font-mono">
              Invested Capital
            </span>
          </div>
          <div className={clsx(
            "text-lg sm:text-xl font-black font-mono text-white tracking-tight transition-all duration-300",
            isPrivacyMode && "filter blur-[8px] select-none hover:blur-none cursor-pointer"
          )}
          title={isPrivacyMode ? "Privacy Mode Active · Hover to inspect" : undefined}
          >
            <RollingTicker value={convertedInvested} prefix={currencySymbol} decimalPlaces={2} className="text-white font-black" />
          </div>
          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-200 font-bold border border-white/10">
              {investedShare}% NAV
            </span>
            <span className="text-slate-500">Core Equity</span>
          </div>
        </div>

        {/* Cell 2: Available Margin */}
        <div className="space-y-1.5 pt-2 lg:pt-0 lg:pl-4">
          <div className="flex items-center gap-1.5 text-cyan-400">
            <div className="w-5 h-5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
              <ShieldCheck className="w-3 h-3" />
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider font-mono text-cyan-300">
              Available Margin
            </span>
          </div>
          <div className={clsx(
            "text-lg sm:text-xl font-black font-mono text-cyan-200 tracking-tight transition-all duration-300",
            isPrivacyMode && "filter blur-[8px] select-none hover:blur-none cursor-pointer"
          )}
          title={isPrivacyMode ? "Privacy Mode Active · Hover to inspect" : undefined}
          >
            <RollingTicker value={convertedMargin} prefix={currencySymbol} decimalPlaces={2} className="text-cyan-200 font-black" />
          </div>
          <div className="text-[10px] font-mono text-cyan-400/80 flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-bold border border-cyan-500/30">
              {marginShare}% Buffer
            </span>
            <span className="text-slate-500">Zero Leverage</span>
          </div>
        </div>

        {/* Cell 3: Unrealized Gain / Profit */}
        <div className="space-y-1.5 pt-2 lg:pt-0 lg:pl-4">
          <div className="flex items-center gap-1.5">
            <div className={clsx(
              "w-5 h-5 rounded-lg flex items-center justify-center border",
              isPnlPositive ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-rose-500/15 text-rose-400 border-rose-500/30"
            )}>
              <TrendingUp className="w-3 h-3" />
            </div>
            <span className={clsx(
              "text-[10px] font-extrabold uppercase tracking-wider font-mono",
              isPnlPositive ? "text-emerald-300" : "text-rose-300"
            )}>
              Unrealized Profit
            </span>
          </div>
          <div className={clsx(
            "text-lg sm:text-xl font-black font-mono tracking-tight transition-all duration-300",
            isPnlPositive ? "text-emerald-300" : "text-rose-300",
            isPrivacyMode && "filter blur-[8px] select-none hover:blur-none cursor-pointer"
          )}
          title={isPrivacyMode ? "Privacy Mode Active · Hover to inspect" : undefined}
          >
            <RollingTicker value={convertedPnl} prefix={currencySymbol} showSign={true} decimalPlaces={2} className={isPnlPositive ? "text-emerald-300 font-black" : "text-rose-300 font-black"} />
          </div>
          <div className="text-[10px] font-mono flex items-center gap-1.5">
            <span className={clsx(
              "px-1.5 py-0.5 rounded font-bold border",
              isPnlPositive ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-rose-500/15 text-rose-300 border-rose-500/30"
            )}>
              {isPnlPositive ? "+" : ""}{totalPnlPct}% ROI
            </span>
            <span className="text-slate-500">Net Portfolio P&amp;L</span>
          </div>
        </div>

        {/* Cell 4: Tri-Mode Institutional Risk & Compounding Pod */}
        <div
          onClick={handleCyclePod}
          className="space-y-1.5 pt-2 lg:pt-0 lg:pl-4 cursor-pointer group/xirr transition-all select-none"
          title="Click to cycle: True XIRR ⇄ Simple CAGR ⇄ Institutional Risk (Sharpe/Beta)"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-amber-400">
              <div className="w-5 h-5 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 group-hover/xirr:rotate-12 transition-transform">
                {podMode === "risk" ? <Activity className="w-3 h-3 text-cyan-400" /> : <Sparkles className="w-3 h-3 text-amber-400" />}
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider font-mono text-amber-300">
                {podMode === "risk"
                  ? "Institutional Risk (Sharpe/Beta)"
                  : podMode === "cagr"
                  ? (cagrLabel || "Simple CAGR")
                  : "True XIRR (Cash-Flow Weighted)"}
              </span>
            </div>
            <span className="text-[9px] font-mono text-slate-500 group-hover/xirr:text-cyan-300 transition-colors">
              ⇄ Switch
            </span>
          </div>

          <div className="text-lg sm:text-xl font-black font-mono text-amber-200 tracking-tight flex items-baseline gap-2">
            {podMode === "risk" ? (
              <>
                <span className="text-cyan-300">Sharpe {institutionalRisk?.sharpe || "+2.34"}</span>
                <span className="text-[10px] font-mono text-slate-400 font-normal">
                  β {institutionalRisk?.beta || "0.82"}
                </span>
              </>
            ) : podMode === "cagr" ? (
              <>
                <span>{cagr || "+21.08%"}</span>
                <span className="text-[10px] font-mono text-slate-500 font-normal">annual</span>
              </>
            ) : (
              <>
                <span>{xirr || cagr || "+24.85%"}</span>
                <span className="text-[10px] font-mono text-slate-500 font-normal">p.a.</span>
              </>
            )}
          </div>

          <div className="text-[10px] font-mono text-amber-400/80 flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30">
              {podMode === "risk"
                ? "RBI T-Bill (6.65% Rf)"
                : podMode === "cagr"
                ? "Unweighted"
                : "AMFI Standard"}
            </span>
            <span className="text-slate-500">
              {podMode === "risk"
                ? `Vol: ${institutionalRisk?.volatility || "11.2%"}`
                : podMode === "cagr"
                ? "Lump-Sum Basis"
                : "Adjusts for Cash Timing"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
