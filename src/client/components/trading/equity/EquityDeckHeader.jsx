import React from "react";
import { soundEngine } from "../../../utils/soundEngine";
import { TrendingUp, ShieldCheck, Activity, Waves, Sparkles } from "lucide-react";
import clsx from "clsx";

export function EquityDeckHeader({
  accountingMode,
  setAccountingMode,
  activeTab,
  setActiveTab
}) {
  return (
    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-cyan-500/15 to-transparent border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)] flex-shrink-0">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
              Account Growth &amp; Drawdown Studio
            </h3>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 font-mono shadow-sm">
              Apple Spatial Engine
            </span>
          </div>
          <span className="text-xs text-slate-400 block mt-0.5 font-medium">
            ₹1,00,000 Vault Story • Peak High-Water Ceiling • 1,000-Path Stress Testing
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
        {/* Net vs Gross Accounting Mode Pill */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.08] shadow-inner backdrop-blur-2xl text-[11px] font-mono">
          <button
            type="button"
            onClick={() => {
              soundEngine?.playClickTone?.();
              setAccountingMode("NET");
            }}
            className={clsx(
              "px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95",
              accountingMode === "NET"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                : "text-slate-400 hover:text-slate-200"
            )}
            title="Realized Take-Home earnings after Brokerage, STT, and Taxes"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Net Take-Home</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine?.playClickTone?.();
              setAccountingMode("GROSS");
            }}
            className={clsx(
              "px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95",
              accountingMode === "GROSS"
                ? "bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                : "text-slate-400 hover:text-slate-200"
            )}
            title="Raw execution price delta before statutory deductions"
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>Gross Execution</span>
          </button>
        </div>

        {/* Visualization Modes */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.08] shadow-inner backdrop-blur-2xl">
          <button
            type="button"
            onClick={() => {
              soundEngine?.playTabSwitchTone?.();
              setActiveTab("growth");
            }}
            className={clsx(
              "px-3 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 cursor-pointer active:scale-95",
              activeTab === "growth"
                ? "bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            )}
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Growth Flow</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine?.playTabSwitchTone?.();
              setActiveTab("drawdown");
            }}
            className={clsx(
              "px-3 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 cursor-pointer active:scale-95",
              activeTab === "drawdown"
                ? "bg-rose-500/20 text-rose-200 border border-rose-400/40 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            )}
          >
            <Waves className="w-3.5 h-3.5 text-rose-400" />
            <span>Valley Map</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine?.playTabSwitchTone?.();
              setActiveTab("monte-carlo");
            }}
            className={clsx(
              "px-3 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 cursor-pointer active:scale-95",
              activeTab === "monte-carlo"
                ? "bg-purple-500/20 text-purple-200 border border-purple-400/40 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>1,000 Paths</span>
          </button>
        </div>
      </div>
    </div>
  );
}
