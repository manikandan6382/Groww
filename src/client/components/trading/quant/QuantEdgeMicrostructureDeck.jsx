import React, { useMemo } from "react";
import { useTradingStore } from "../../../stores/useTradingStore";
import { useLivePriceStore } from "../../../stores/useLivePriceStore";
import { Microscope, Activity, ShieldCheck } from "lucide-react";
import { filterActiveTrades } from "../analytics/sessionAggregationEngine";
import {
  calculateTemporalHeatmap,
  calculateMaeMfeMetrics,
  calculateKellyMetrics,
  generateHeadTraderPrescriptions
} from "./quantEdgeCalculations";
import { TemporalHeatmapCard } from "./TemporalHeatmapCard";
import { MaeMfeEfficiencyCard } from "./MaeMfeEfficiencyCard";
import { KellySizingEngineCard } from "./KellySizingEngineCard";
import { HeadTraderPrescriptionCard } from "./HeadTraderPrescriptionCard";

export function QuantEdgeMicrostructureDeck() {
  const {
    journalTrades = [],
    journalRange = "all",
    journalCustomStart,
    journalCustomEnd,
    selectedStrategyFilter
  } = useTradingStore();

  const vixLtp = useLivePriceStore((s) => s.ticks?.["INDIA_VIX"]?.ltp ?? s.sparklines?.["INDIA_VIX"]?.slice(-1)[0] ?? 13.20);

  const activeTrades = useMemo(() => {
    let list = filterActiveTrades(journalTrades, journalRange, journalCustomStart, journalCustomEnd);
    if (selectedStrategyFilter) {
      list = list.filter((t) => 
        (t.strategyTag === selectedStrategyFilter) ||
        (t.setupTag === selectedStrategyFilter) ||
        (Array.isArray(t.strategyTags) && t.strategyTags.includes(selectedStrategyFilter))
      );
    }
    return list;
  }, [journalTrades, journalRange, journalCustomStart, journalCustomEnd, selectedStrategyFilter]);

  const heatmapData = useMemo(() => {
    try {
      return calculateTemporalHeatmap(activeTrades);
    } catch (err) {
      return calculateTemporalHeatmap([]);
    }
  }, [activeTrades]);

  const maeMfeData = useMemo(() => {
    try {
      return calculateMaeMfeMetrics(activeTrades, vixLtp);
    } catch (err) {
      return calculateMaeMfeMetrics([], vixLtp);
    }
  }, [activeTrades, vixLtp]);

  const kellyData = useMemo(() => {
    try {
      return calculateKellyMetrics(activeTrades);
    } catch (err) {
      return calculateKellyMetrics([]);
    }
  }, [activeTrades]);

  const prescriptions = useMemo(() => {
    try {
      return generateHeadTraderPrescriptions(heatmapData, maeMfeData, kellyData, vixLtp);
    } catch (err) {
      return [];
    }
  }, [heatmapData, maeMfeData, kellyData, vixLtp]);

  return (
    <div id="quant-edge-deck" data-deck="quant-edge" className="space-y-6 scroll-mt-24">
      {/* Act 6 Institutional Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/25 flex items-center gap-1.5 shadow-sm shadow-emerald-500/10">
              <Microscope className="w-3 h-3 text-emerald-400" />
              ACT 6 · QUANT EDGE &amp; MICROSTRUCTURE LAB
            </span>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-slate-400">
              {activeTrades.length} Trades Analyzed
            </span>
            {selectedStrategyFilter && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/30 text-purple-300">
                Setup: {selectedStrategyFilter}
              </span>
            )}
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Execution Microstructure &amp; Fractional Kelly Engine</span>
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Temporal alpha heatmaps, MAE/MFE stop precision regression, and quarter-Kelly position sizing derived from your empirical trade history.
          </p>
        </div>

        {/* Global Statistical Edge Pill */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="px-3.5 py-1.5 rounded-2xl bg-[#0d111a]/85 border border-white/[0.08] flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Expectancy:</span>
            <strong className={kellyData.expectancyRupees >= 0 ? "text-emerald-400" : "text-rose-400"}>
              {kellyData.expectancyRupees >= 0 ? `+₹${kellyData.expectancyRupees}` : `-₹${Math.abs(kellyData.expectancyRupees)}`}/tr
            </strong>
          </div>
        </div>
      </div>

      {/* 1. 2D Temporal Heatmap (Full Width) */}
      <TemporalHeatmapCard heatmapData={heatmapData} />

      {/* 2. MAE vs MFE Scatter (Left) & Quarter-Kelly Sizer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MaeMfeEfficiencyCard maeMfeData={maeMfeData} />
        <KellySizingEngineCard kellyData={kellyData} />
      </div>

      {/* 3. Head-Trader Directives & Circuit Breaker Mandates */}
      <HeadTraderPrescriptionCard prescriptions={prescriptions} />
    </div>
  );
}

export default QuantEdgeMicrostructureDeck;
