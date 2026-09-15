import React from "react";
import { Sparkles, Download, Plus, ShieldCheck, ChevronRight } from "lucide-react";

export function JournalHeroHeader({
  onOpenSafetyGuard,
  onOpenCustomTrade,
  onExportCsv,
  isFormVisible,
  onToggleForm
}) {
  return (
    <>
      {/* Top Meta Bar: Status Pills & Interactive Safety Guard */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 whitespace-nowrap">
            JOURNAL &amp; PERFORMANCE
          </span>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Live Market Ready
          </span>
          <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 whitespace-nowrap">
            ⚡ India VIX: 13.2 · Favorable Scalp
          </span>
        </div>

        {/* Clickable Safety Guard Pill (Opens Circuit Breaker Modal) */}
        <button
          type="button"
          onClick={onOpenSafetyGuard}
          className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-2.5 py-1 rounded-full border border-cyan-500/30 transition shadow-sm group whitespace-nowrap cursor-pointer"
          title="Click to view 2-Loss Daily Stop Circuit Breaker Policy"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>🛡️ Safety Guard: 0/2 Max Losses</span>
          <ChevronRight className="w-3 h-3 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Title and Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
            Trading Journal &amp; Results
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Every trade explained in plain English — track your true take-home earnings, statistical edge, and risk discipline.
          </p>
        </div>

        {/* Action CTAs Dock */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
          <button
            type="button"
            onClick={onOpenCustomTrade}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 hover:text-purple-200 text-xs font-bold transition whitespace-nowrap shadow-sm cursor-pointer"
            title="Add Custom Trade, Sample Template, or Bulk JSON (Press N)"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>+ Add Custom Data</span>
          </button>

          <button
            type="button"
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition whitespace-nowrap cursor-pointer"
            title="Export CSV Tax Audit Report"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Export Tax CSV</span>
            <span className="sm:hidden">CSV</span>
          </button>

          <button
            type="button"
            onClick={onToggleForm}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/20 transition whitespace-nowrap cursor-pointer"
            title="Toggle Fast Trade Logger Form (Press 'N')"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>{isFormVisible ? "Hide Form" : "Log Trade"}</span>
            <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-black/20 text-black font-bold">N</kbd>
          </button>
        </div>
      </div>
    </>
  );
}
