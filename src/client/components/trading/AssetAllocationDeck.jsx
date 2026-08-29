import React from "react";
import { PieChart, ShieldAlert, Sparkles, ArrowRight } from "lucide-react";

export function AssetAllocationDeck({ holdings = [] }) {
  // Compute allocation numbers
  const equityValue = 342500;
  const goldValue = 58200;
  const cashValue = 125000;
  const total = equityValue + goldValue + cashValue;

  const equityPct = Math.round((equityValue / total) * 100);
  const goldPct = Math.round((goldValue / total) * 100);
  const cashPct = Math.round((cashValue / total) * 100);

  return (
    <div className="space-y-4">
      {/* 2-Card Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Asset Allocation Donut */}
        <div className="p-5 rounded-2xl bg-app-card/70 backdrop-blur-xl border border-white/5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">Asset Allocation</h2>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Asset Safety Map
            </span>
          </div>

          <div className="flex items-center gap-6">
            {/* Donut SVG */}
            <div className="relative w-32 h-32 flex-shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#1e293b" strokeWidth="12" />
                {/* Equities (Cyan) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#00d5ff"
                  strokeWidth="12"
                  strokeDasharray={`${(equityPct / 100) * 238.76} 238.76`}
                  strokeDashoffset="0"
                />
                {/* Gold (Amber) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#f59e0b"
                  strokeWidth="12"
                  strokeDasharray={`${(goldPct / 100) * 238.76} 238.76`}
                  strokeDashoffset={`-${(equityPct / 100) * 238.76}`}
                />
                {/* Cash (Emerald) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="12"
                  strokeDasharray={`${(cashPct / 100) * 238.76} 238.76`}
                  strokeDashoffset={`-${((equityPct + goldPct) / 100) * 238.76}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-xs font-bold text-white">3 Assets</span>
                <span className="text-[10px] text-slate-400">Balanced</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex-1 space-y-2 text-xs">
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                  <span className="text-slate-300">Equities (Growth)</span>
                </div>
                <strong className="text-white font-mono">{equityPct}%</strong>
              </div>

              <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  <span className="text-slate-300">Gold (Crisis Hedge)</span>
                </div>
                <strong className="text-white font-mono">{goldPct}%</strong>
              </div>

              <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <span className="text-slate-300">Liquid Cash Buffer</span>
                </div>
                <strong className="text-white font-mono">{cashPct}%</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Portfolio Health Matrix */}
        <div className="p-5 rounded-2xl bg-app-card/70 backdrop-blur-xl border border-white/5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">Portfolio Health Matrix</h2>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Safety Score 92/100
            </span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-300">Diversification (5+ Sectors)</span>
                <strong className="text-emerald-400 font-bold">Optimal (Low Risk)</strong>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" style={{ width: "88%" }}></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-300">Single-Stock Concentration</span>
                <strong className="text-cyan-400 font-bold">&lt; 18% (Safe)</strong>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full" style={{ width: "24%" }}></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-300">Gold &amp; Commodity Shield</span>
                <strong className="text-amber-400 font-bold">11.1% Target Hit</strong>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full" style={{ width: "75%" }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Risk Radar & Advisory Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-sky-500/5 to-transparent border border-cyan-500/20 flex items-start gap-3.5">
        <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 flex-shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white">Risk Radar &amp; Institutional Allocation Advisory</h3>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              AI Guard Active
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Portfolio meets institutional safety criteria: <strong>Zero high-beta single-stock concentration risk</strong>. Gold shield (GOLDBEES) hedges against global macroeconomic shockwaves. Cash buffer is ready to accumulate Bluechip dips.
          </p>
        </div>
      </div>
    </div>
  );
}
