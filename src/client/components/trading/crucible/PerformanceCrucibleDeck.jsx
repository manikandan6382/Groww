import React, { useMemo } from "react";
import clsx from "clsx";
import { Award, Sparkles, Compass, ShieldCheck, Flame } from "lucide-react";
import { useTradingStore } from "../../../stores/useTradingStore";
import { filterActiveTrades } from "../analytics/sessionAggregationEngine";
import { CounterfactualEquityMirror } from "./CounterfactualEquityMirror";
import { PropFirmScorecardCard } from "./PropFirmScorecardCard";
import { TradeDurationScatterCard } from "./TradeDurationScatterCard";
import { CapitalScalingLadderCard } from "./CapitalScalingLadderCard";

export function PerformanceCrucibleDeck() {
  const {
    journalTrades,
    journalRange,
    journalCustomStart,
    journalCustomEnd,
    selectedStrategyFilter
  } = useTradingStore();

  const activeTrades = useMemo(() => {
    let list = filterActiveTrades(journalTrades, journalRange, journalCustomStart, journalCustomEnd);
    if (selectedStrategyFilter) {
      list = list.filter((t) => (t.strategyTag || t.setupTag) === selectedStrategyFilter);
    }
    return list;
  }, [journalTrades, journalRange, journalCustomStart, journalCustomEnd, selectedStrategyFilter]);

  return (
    <section
      id="performance-crucible-deck"
      data-deck="performance-crucible"
      className="space-y-4"
    >
      {/* Section 5 Deck Super-Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/25 whitespace-nowrap shadow-sm shadow-purple-500/10 flex items-center gap-1.5">
            <Award className="w-3 h-3 text-purple-400" />
            ACT 5: PERFORMANCE CRUCIBLE &amp; ALPHA LAB
          </span>
          <span className="text-xs font-mono text-slate-400 font-bold">
            ({activeTrades.length} Active Trades Audited)
          </span>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
          <span className="px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/5 flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-purple-400" /> Counterfactual Dual-Curve
          </span>
          <span className="px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/5 flex items-center gap-1">
            <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" /> 4-Pillar Scorecard
          </span>
          <span className="px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/5 flex items-center gap-1">
            <Flame className="w-2.5 h-2.5 text-amber-400" /> 2-Lot Scaling
          </span>
        </div>
      </div>

      {/* Row 1: The Truth Mirror (Counterfactual Zero-Leakage Equity Curve) */}
      <CounterfactualEquityMirror trades={activeTrades} />

      {/* Row 2: Two-Column Bento (Prop-Firm Scorecard & Capital Scaling Ladder) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PropFirmScorecardCard trades={activeTrades} />
        <CapitalScalingLadderCard trades={activeTrades} />
      </div>

      {/* Row 3: Trade Hold Duration Microstructure & Intermediary Friction Autopsy */}
      <TradeDurationScatterCard trades={activeTrades} />
    </section>
  );
}

export default PerformanceCrucibleDeck;
