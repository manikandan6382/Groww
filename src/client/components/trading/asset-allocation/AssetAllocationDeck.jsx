import React, { useState } from "react";
import clsx from "clsx";
import { PieChart, ShieldCheck, Scale, Activity, Layers } from "lucide-react";
import { useTradingStore } from "../../../stores/useTradingStore";
import { useAllocationMetrics } from "./useAllocationMetrics";
import { AllocationDonutChart } from "./AllocationDonutChart";
import { AllocationTelemetryBars } from "./AllocationTelemetryBars";
import { SectorBreakdownCard } from "./SectorBreakdownCard";
import { RebalanceEngineCard } from "./RebalanceEngineCard";
import { soundEngine } from "../../../utils/soundEngine";
import { FX_RATES } from "../portfolio/portfolioNavEngine";

export function AssetAllocationDeck({
  holdings = [],
  margins = {},
  currencySymbol = "₹",
  fxRate = 1,
}) {
  const [activeDeckTab, setActiveDeckTab] = useState("telemetry"); // 'telemetry' | 'sectors' | 'rebalance'
  const isPrivacyMode = useTradingStore((s) => s.isPrivacyMode);
  const storeCurrency = useTradingStore((s) => s.portfolioCurrency || "INR");
  const fxConfig = FX_RATES[storeCurrency] || FX_RATES.INR;
  const activeFxRate = fxRate !== 1 ? fxRate : fxConfig.rate;
  const activeCurrencySymbol = currencySymbol !== "₹" ? currencySymbol : fxConfig.symbol;

  const {
    equityValue,
    goldValue,
    cashValue,
    total,
    items,
    maxHoldingSymbol,
    maxConcentrationPct,
    healthScore = 94,
    healthStatus = "Optimal",
    healthColor = "emerald",
    equityPct,
    goldPct,
    cashPct,
    capitalGuardPct,
    liquidShieldVal,
    circ,
    eqStroke,
    goldStroke,
    cashStroke,
    sectorMetrics,
  } = useAllocationMetrics(holdings, margins);

  return (
    <div className="p-6 sm:p-7 rounded-[32px] bg-[var(--card)] backdrop-blur-3xl border border-[var(--line)] shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12)] relative overflow-hidden flex flex-col justify-between space-y-5 hover:border-white/[0.18] transition-colors">
      {/* 🌌 Apple Ambient Glow */}
      <div className="absolute top-0 right-0 w-[260px] h-[260px] bg-cyan-500/[0.06] rounded-full blur-[80px] pointer-events-none -mt-20 -mr-20" />
      <div className="absolute bottom-0 left-0 w-[240px] h-[240px] bg-emerald-500/[0.05] rounded-full blur-[70px] pointer-events-none -mb-16 -ml-16" />

      {/* 1. Header: Master Title & Mode Switcher */}
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

        {/* Mode Toggle: Telemetry vs Sectors vs Dhandho Rebalance */}
        <div className="p-0.5 rounded-xl bg-black/40 border border-white/10 flex items-center font-mono text-[10px] shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveDeckTab("telemetry");
              soundEngine.playTabSwitchTone();
            }}
            className={clsx(
              "px-2 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer",
              activeDeckTab === "telemetry"
                ? "bg-white/15 text-white border border-white/20 shadow-sm"
                : "text-slate-400 hover:text-white"
            )}
            title="Overview Telemetry"
          >
            <Activity className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">Overview</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveDeckTab("sectors");
              soundEngine.playTabSwitchTone();
            }}
            className={clsx(
              "px-2 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer",
              activeDeckTab === "sectors"
                ? "bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            )}
            title="Sector Exposure & Concentration"
          >
            <Layers className="w-3 h-3 text-cyan-400" />
            <span>Sectors</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveDeckTab("rebalance");
              soundEngine.playTabSwitchTone();
            }}
            className={clsx(
              "px-2 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer",
              activeDeckTab === "rebalance"
                ? "bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            )}
            title="Dhandho Rebalancing Engine"
          >
            <Scale className="w-3 h-3 text-cyan-400" />
            <span>Rebalance</span>
          </button>
        </div>
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
        isPrivacyMode={isPrivacyMode}
        currencySymbol={activeCurrencySymbol}
        fxRate={activeFxRate}
      />

      {/* 3. Dynamic Switch: Capital Health Telemetry vs Sector Breakdown vs Dhandho Rebalancing Engine */}
      {activeDeckTab === "telemetry" ? (
        <AllocationTelemetryBars
          maxHoldingSymbol={maxHoldingSymbol}
          maxConcentrationPct={maxConcentrationPct}
          liquidShieldVal={liquidShieldVal}
          capitalGuardPct={capitalGuardPct}
          sectorMetrics={sectorMetrics}
          isPrivacyMode={isPrivacyMode}
          currencySymbol={activeCurrencySymbol}
          fxRate={activeFxRate}
        />
      ) : activeDeckTab === "sectors" ? (
        <SectorBreakdownCard
          sectors={sectorMetrics?.sectors || []}
          topSector={sectorMetrics?.topSector}
          hhiScore={sectorMetrics?.hhiScore || 0}
          diversificationLabel={sectorMetrics?.diversificationLabel || "Optimal"}
          diversificationColor={sectorMetrics?.diversificationColor || "emerald"}
          isPrivacyMode={isPrivacyMode}
          currencySymbol={activeCurrencySymbol}
          fxRate={activeFxRate}
        />
      ) : (
        <RebalanceEngineCard
          equityValue={equityValue}
          goldValue={goldValue}
          cashValue={cashValue}
          total={total}
          isPrivacyMode={isPrivacyMode}
          currencySymbol={activeCurrencySymbol}
          fxRate={activeFxRate}
        />
      )}
    </div>
  );
}

export default AssetAllocationDeck;
