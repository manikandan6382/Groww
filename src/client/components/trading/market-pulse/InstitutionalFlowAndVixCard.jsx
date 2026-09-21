import React from "react";
import clsx from "clsx";
import { Landmark, Gauge, ShieldCheck, Zap, ArrowUpRight, ArrowDownRight, Compass } from "lucide-react";

export function InstitutionalFlowAndVixCard({ institutionalFlow, vixRegime }) {
  const {
    fiiCashCr = "₹1,420 Cr",
    fiiCashPositive = true,
    diiCashCr = "₹850 Cr",
    diiCashPositive = true,
    totalNetCr = "+₹2,270 Cr",
    totalNetPositive = true,
    futuresLongRatio = 58,
    sentiment = "Net Institutional Accumulation"
  } = institutionalFlow || {};

  const {
    vix = 13.45,
    label = "Optimal Scalp Conditions",
    tone = "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
    description = "Ideal option premium pricing & standard directional delta momentum.",
    strategyTip = "Standard 4.0-pt SL (₹250 risk cap). Ride momentum to 8.0-pt target."
  } = vixRegime || {};

  const futuresShortRatio = 100 - futuresLongRatio;

  return (
    <div className="rounded-2xl bg-white/[0.025] hover:bg-white/[0.035] border border-white/[0.08] p-5 backdrop-blur-2xl shadow-[0_8px_24px_rgba(0,0,0,0.4)] flex flex-col justify-between h-full relative overflow-hidden group">
      {/* Ambient Radial Highlight */}
      <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full blur-3xl pointer-events-none bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-all" />

      <div className="space-y-4 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-white font-mono tracking-wider flex items-center gap-1.5">
                <span>INSTITUTIONAL FLOW &amp; VIX REGIME</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                FII / DII Cash Activity &amp; Volatility Copilot
              </p>
            </div>
          </div>

          <span
            className={clsx(
              "text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border",
              totalNetPositive
                ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/25"
                : "text-rose-300 bg-rose-500/10 border-rose-500/25"
            )}
          >
            {totalNetPositive ? "NET BUYERS" : "NET SELLERS"}
          </span>
        </div>

        {/* FII / DII Net Cash Metrics */}
        <div className="grid grid-cols-3 gap-2 pt-1 font-mono">
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="text-[9px] text-slate-400 font-semibold flex items-center gap-1">
              FII Net Cash
            </div>
            <div
              className={clsx(
                "text-sm font-extrabold mt-1 flex items-center gap-0.5",
                fiiCashPositive ? "text-emerald-300" : "text-rose-300"
              )}
            >
              {fiiCashPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {fiiCashCr}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="text-[9px] text-slate-400 font-semibold flex items-center gap-1">
              DII Net Cash
            </div>
            <div
              className={clsx(
                "text-sm font-extrabold mt-1 flex items-center gap-0.5",
                diiCashPositive ? "text-emerald-300" : "text-rose-300"
              )}
            >
              {diiCashPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {diiCashCr}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="text-[9px] text-slate-400 font-semibold flex items-center gap-1">
              Combined Flow
            </div>
            <div
              className={clsx(
                "text-sm font-black mt-1",
                totalNetPositive ? "text-emerald-400" : "text-rose-400"
              )}
            >
              {totalNetCr}
            </div>
          </div>
        </div>

        {/* Index Futures Long / Short Positioning */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
            <span>F&amp;O Futures Positioning</span>
            <span className="text-slate-200 font-bold">
              {futuresLongRatio}% Long vs {futuresShortRatio}% Short
            </span>
          </div>

          <div className="relative h-2 rounded-full bg-white/[0.04] overflow-hidden flex p-0.5 border border-white/[0.08]">
            <div
              className="h-full rounded-l-full bg-emerald-500/80 transition-all duration-700"
              style={{ width: `${futuresLongRatio}%` }}
            />
            <div
              className="h-full rounded-r-full bg-rose-500/80 transition-all duration-700"
              style={{ width: `${futuresShortRatio}%` }}
            />
          </div>
        </div>

        {/* India VIX Regime Engine Card */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] font-mono font-bold text-slate-200">
                INDIA VIX: <span className="text-white font-extrabold">{vix}</span>
              </span>
            </div>
            <span className={clsx("text-[8px] font-mono font-extrabold px-1.5 py-0.5 rounded border", tone)}>
              {label}
            </span>
          </div>

          <p className="text-[10px] text-slate-300 font-mono leading-relaxed">
            {description}
          </p>

          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-mono text-emerald-200 flex items-start gap-1.5">
            <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-emerald-300">Tactical SL Rule: </span>
              {strategyTip}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Diagnostic */}
      <div className="mt-4 pt-3 border-t border-white/[0.06] relative z-10 flex items-center justify-between text-[10px] font-mono">
        <span className="text-slate-400 flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          Smart Money Verdict:
        </span>
        <span className={clsx("font-bold", totalNetPositive ? "text-emerald-300" : "text-rose-300")}>
          {sentiment}
        </span>
      </div>
    </div>
  );
}
