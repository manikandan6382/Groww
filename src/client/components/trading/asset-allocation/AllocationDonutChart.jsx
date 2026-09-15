import React from "react";
import { RollingTicker } from "../../common/RollingTicker";

export function AllocationDonutChart({
  itemsLength,
  eqStroke,
  goldStroke,
  cashStroke,
  circ,
  equityValue,
  equityPct,
  goldValue,
  goldPct,
  cashValue,
  cashPct
}) {
  return (
    <div className="relative flex flex-col sm:flex-row items-center gap-5">
      {/* Donut SVG */}
      <div className="relative w-28 h-28 flex-shrink-0 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90 filter drop-shadow-[0_0_14px_rgba(0,213,255,0.18)]" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="38" fill="transparent" stroke="#1e293b" strokeWidth="11" />
          {/* Equities (Cyan) */}
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="transparent"
            stroke="#00d5ff"
            strokeWidth="11"
            strokeDasharray={`${eqStroke} ${circ}`}
            strokeDashoffset="0"
            strokeLinecap="round"
            className="transition-all duration-500"
          />
          {/* Gold (Amber) */}
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="transparent"
            stroke="#f59e0b"
            strokeWidth="11"
            strokeDasharray={`${goldStroke} ${circ}`}
            strokeDashoffset={`-${eqStroke}`}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
          {/* Cash (Emerald) */}
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="transparent"
            stroke="#10b981"
            strokeWidth="11"
            strokeDasharray={`${cashStroke} ${circ}`}
            strokeDashoffset={`-${eqStroke + goldStroke}`}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-xs font-mono font-black text-white">{itemsLength} Assets</span>
          <span className="text-[10px] text-emerald-400 font-bold">Balanced</span>
        </div>
      </div>

      {/* 3-Row Value Pills */}
      <div className="flex-1 w-full space-y-2 text-xs">
        {/* Row 1: Equities */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] transition-all">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
            <div className="flex flex-col">
              <span className="text-slate-300 font-medium leading-tight">Equities (Growth)</span>
              <span className="text-[10px] text-slate-400 font-mono">₹{(equityValue / 100000).toFixed(2)}L</span>
            </div>
          </div>
          <div className="text-white font-mono font-bold text-sm">
            <RollingTicker value={equityPct} suffix="%" decimalPlaces={0} className="text-white" />
          </div>
        </div>

        {/* Row 2: Gold & Commodities */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] transition-all">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
            <div className="flex flex-col">
              <span className="text-slate-300 font-medium leading-tight">Gold &amp; Hedge</span>
              <span className="text-[10px] text-slate-400 font-mono">₹{(goldValue / 1000).toFixed(1)}K</span>
            </div>
          </div>
          <div className="text-white font-mono font-bold text-sm">
            <RollingTicker value={goldPct} suffix="%" decimalPlaces={0} className="text-white" />
          </div>
        </div>

        {/* Row 3: Liquid Cash Margin */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] transition-all">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
            <div className="flex flex-col">
              <span className="text-slate-300 font-medium leading-tight">Liquid Margin Buffer</span>
              <span className="text-[10px] text-slate-400 font-mono">₹{(cashValue / 100000).toFixed(2)}L</span>
            </div>
          </div>
          <div className="text-white font-mono font-bold text-sm">
            <RollingTicker value={cashPct} suffix="%" decimalPlaces={0} className="text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
