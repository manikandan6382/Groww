import React from "react";
import { TrendingUp, AlertCircle, Sparkles, ShieldCheck } from "lucide-react";
import clsx from "clsx";

export const PayoffHeader = React.memo(function PayoffHeader({
  isDirect,
  optionType,
  isCall,
  isSLInverted,
  entry = 0,
  viewMode,
  setViewMode,
  capitalOutlay = 0,
  popPercent = 0,
}) {
  return (
    <div className="space-y-2 border-b border-white/[0.06] pb-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-zinc-200 shadow-sm">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <strong className="text-sm sm:text-base font-black text-white tracking-tight">
                Option Outcome Simulator
              </strong>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/[0.06] text-zinc-200 border border-white/10 font-sans flex items-center gap-1">
                {isDirect ? (
                  <>
                    <span>⚡ Direct {optionType} Buy</span>
                    <span className="opacity-75 font-normal">
                      · {isCall ? "Bullish (Up 📈)" : "Bearish (Down 📉)"}
                    </span>
                  </>
                ) : (
                  <span>🛡️ Spread (2-Legs)</span>
                )}
              </span>
              {isSLInverted && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-zinc-200 border border-white/15 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Fix SL: Must be below ₹{entry}
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400 block sm:inline">
              Interactive "What-If" Market Simulator &amp; Risk Visualizer
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <div className="flex rounded-xl bg-white/[0.04] border border-white/10 p-0.5 text-[11px] font-sans">
            <button
              type="button"
              onClick={() => setViewMode("chart")}
              className={clsx(
                "px-2.5 py-1 rounded-lg font-bold transition cursor-pointer",
                viewMode === "chart" ? "bg-white/15 text-white shadow-sm border border-white/15" : "text-slate-400 hover:text-white"
              )}
            >
              📊 Full View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("simple")}
              className={clsx(
                "px-2.5 py-1 rounded-lg font-bold transition cursor-pointer",
                viewMode === "simple" ? "bg-white/15 text-white shadow-sm border border-white/15" : "text-slate-400 hover:text-white"
              )}
            >
              💡 Simple Story
            </button>
          </div>

          <div className="px-2.5 py-1 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-1.5 text-xs font-mono">
            <span className="text-slate-400 text-[10px]">Cost:</span>
            <strong className="text-white font-bold">₹{Number(capitalOutlay || 0).toLocaleString("en-IN")}</strong>
          </div>

          <div className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1 text-xs text-emerald-300 font-bold shadow-sm">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>{popPercent}% Win</span>
          </div>
        </div>
      </div>

      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-[11.5px] leading-relaxed text-slate-300 space-y-1.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          {isDirect ? (
            <span>
              <strong className="text-white font-semibold">{isCall ? "Call Option" : "Put Option"} Scalp:</strong> You pay a 1-time premium of <strong className="text-white">₹{Number(capitalOutlay || 0).toLocaleString("en-IN")}</strong>. You profit when market moves {isCall ? "UP 📈" : "DOWN 📉"}, and your loss can <strong className="text-rose-300">never exceed</strong> what you paid.
            </span>
          ) : (
            <span>
              <strong className="text-white font-semibold">Protected Spread:</strong> Lowers your entry cost to <strong className="text-white">₹{Number(capitalOutlay || 0).toLocaleString("en-IN")}</strong>. Protects against sudden pullbacks by capping both maximum risk and reward.
            </span>
          )}
        </div>
        <div className="text-[10.5px] font-mono text-slate-400 flex items-center gap-1.5 pl-6 border-t border-white/[0.04] pt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
          <span>Tactical Guidance: Use 1-tap card buttons for fast in-flight exits. Use this Simulator to model Theta decay horizons and structure R:R targets.</span>
        </div>
      </div>
    </div>
  );
});
