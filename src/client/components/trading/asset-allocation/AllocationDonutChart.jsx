import React from "react";
import clsx from "clsx";
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
  cashPct,
  isPrivacyMode = false,
  currencySymbol = "₹",
  fxRate = 1,
}) {
  const convertedEq = Math.round((equityValue || 0) / fxRate);
  const convertedGold = Math.round((goldValue || 0) / fxRate);
  const convertedCash = Math.round((cashValue || 0) / fxRate);

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
      <div className="flex-1 w-full space-y-2 text-xs font-mono">
        {/* Row 1: Equities */}
        <div className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] transition-all space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              <span className="text-slate-200 font-semibold leading-tight font-sans">Equities (Growth)</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={clsx(
                  "text-[11px] text-slate-400 transition-all duration-300",
                  isPrivacyMode && "filter blur-[6px] select-none hover:blur-none cursor-pointer"
                )}
                title={isPrivacyMode ? "Privacy Mode Active" : undefined}
              >
                {currencySymbol}{convertedEq.toLocaleString("en-IN")}
              </span>
              <span className="text-white font-bold text-xs">{equityPct}%</span>
            </div>
          </div>
          <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full bg-cyan-400/80 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, equityPct))}%` }} />
          </div>
        </div>

        {/* Row 2: Gold & Commodities */}
        <div className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] transition-all space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
              <span className="text-slate-200 font-semibold leading-tight font-sans">Gold &amp; Hedge</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={clsx(
                  "text-[11px] text-slate-400 transition-all duration-300",
                  isPrivacyMode && "filter blur-[6px] select-none hover:blur-none cursor-pointer"
                )}
                title={isPrivacyMode ? "Privacy Mode Active" : undefined}
              >
                {currencySymbol}{convertedGold.toLocaleString("en-IN")}
              </span>
              <span className="text-white font-bold text-xs">{goldPct}%</span>
            </div>
          </div>
          <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full bg-amber-400/80 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, goldPct))}%` }} />
          </div>
        </div>

        {/* Row 3: Liquid Cash Margin */}
        <div className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] transition-all space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <span className="text-slate-200 font-semibold leading-tight font-sans">Liquid Margin Buffer</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={clsx(
                  "text-[11px] text-slate-400 transition-all duration-300",
                  isPrivacyMode && "filter blur-[6px] select-none hover:blur-none cursor-pointer"
                )}
                title={isPrivacyMode ? "Privacy Mode Active" : undefined}
              >
                {currencySymbol}{convertedCash.toLocaleString("en-IN")}
              </span>
              <span className="text-white font-bold text-xs">{cashPct}%</span>
            </div>
          </div>
          <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full bg-emerald-400/80 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, cashPct))}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
