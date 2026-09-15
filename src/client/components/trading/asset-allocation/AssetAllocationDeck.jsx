import React from "react";
import { PieChart, ShieldCheck } from "lucide-react";
import { useAllocationMetrics } from "./useAllocationMetrics";
import { AllocationDonutChart } from "./AllocationDonutChart";
import { AllocationTelemetryBars } from "./AllocationTelemetryBars";

export function AssetAllocationDeck({ holdings = [], margins = {} }) {
  const {
    equityValue,
    goldValue,
    cashValue,
    items,
    maxHoldingSymbol,
    maxConcentrationPct,
    equityPct,
    goldPct,
    cashPct,
    capitalGuardPct,
    liquidShieldVal,
    circ,
    eqStroke,
    goldStroke,
    cashStroke
  } = useAllocationMetrics(holdings, margins);

  return (
    <div className="p-6 sm:p-7 rounded-[32px] bg-[var(--card)] backdrop-blur-3xl border border-[var(--line)] shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12)] relative overflow-hidden flex flex-col justify-between space-y-5 hover:border-white/[0.18] transition-colors">
      {/* 🌌 Apple Ambient Glow */}
      <div className="absolute top-0 right-0 w-[260px] h-[260px] bg-cyan-500/[0.06] rounded-full blur-[80px] pointer-events-none -mt-20 -mr-20" />
      <div className="absolute bottom-0 left-0 w-[240px] h-[240px] bg-emerald-500/[0.05] rounded-full blur-[70px] pointer-events-none -mb-16 -ml-16" />

      {/* 1. Header: Master Title & Health Score Pill */}
      <div className="relative flex items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-2.5 min-w-0 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)] flex-shrink-0">
            <PieChart className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-white tracking-tight whitespace-nowrap">Allocation &amp; Risk Shield</h2>
            <p className="text-[10px] text-slate-400 font-mono whitespace-nowrap">Dynamic Portfolio Balance</p>
          </div>
        </div>
        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)] flex items-center gap-1.5 whitespace-nowrap font-mono flex-shrink-0">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>94/100 · Optimal</span>
        </span>
      </div>

      {/* 2. Visual Donut & Detailed Asset Breakdown */}
      <AllocationDonutChart
        itemsLength={items.length}
        eqStroke={eqStroke}
        goldStroke={goldStroke}
        cashStroke={cashStroke}
        circ={circ}
        equityValue={equityValue}
        equityPct={equityPct}
        goldValue={goldValue}
        goldPct={goldPct}
        cashValue={cashValue}
        cashPct={cashPct}
      />

      {/* 3. Streamlined Capital Health Telemetry Strip */}
      <AllocationTelemetryBars
        maxHoldingSymbol={maxHoldingSymbol}
        maxConcentrationPct={maxConcentrationPct}
        liquidShieldVal={liquidShieldVal}
        capitalGuardPct={capitalGuardPct}
      />
    </div>
  );
}

export default AssetAllocationDeck;
