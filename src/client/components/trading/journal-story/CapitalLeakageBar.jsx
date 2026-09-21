import React from "react";
import clsx from "clsx";
import { 
  ShieldAlert, 
  AlertTriangle, 
  Flame, 
  Zap, 
  Sparkles, 
  Clock, 
  X,
  TrendingDown
} from "lucide-react";
import { RollingTicker } from "../../common/RollingTicker";

export function CapitalLeakageBar({
  analysis,
  activeBiasFilter,
  setActiveBiasFilter
}) {
  const {
    totalPreventableLeakageRupees = 0,
    totalBiasedTrades = 0,
    disciplineRate = 100,
    biasBreakdown = {}
  } = analysis || {};

  const {
    disposition = { count: 0, leakedRupees: 0 },
    shieldBreach = { count: 0, leakedRupees: 0 },
    fomoChase = { count: 0, leakedRupees: 0 },
    revengeCluster = { count: 0, leakedRupees: 0 },
    middayTrap = { count: 0, leakedRupees: 0 }
  } = biasBreakdown;

  // Clean state when discipline is 100%
  if (totalPreventableLeakageRupees === 0 && totalBiasedTrades === 0) {
    return (
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#090e18]/80 border border-emerald-500/20 backdrop-blur-xl flex items-center justify-between gap-3 text-xs shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-emerald-300 block text-xs sm:text-sm">
              Zero Behavioral Capital Leakage
            </span>
            <span className="text-[11px] text-slate-400">
              100% Risk Invariant Compliance. All stops, sizing, and targets strictly honored across this period.
            </span>
          </div>
        </div>
        <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono font-bold text-xs">
          Discipline: 100%
        </div>
      </div>
    );
  }

  const items = [
    {
      id: "DISPOSITION_EFFECT",
      label: "Early Exits",
      count: disposition.count,
      rupees: disposition.leakedRupees,
      icon: TrendingDown,
      color: "amber"
    },
    {
      id: "SHIELD_BREACH",
      label: "Stop Breaches (>₹300)",
      count: shieldBreach.count,
      rupees: shieldBreach.leakedRupees,
      icon: ShieldAlert,
      color: "rose"
    },
    {
      id: "FOMO_CHASE",
      label: "FOMO Slippage",
      count: fomoChase.count,
      rupees: fomoChase.leakedRupees,
      icon: Zap,
      color: "cyan"
    },
    {
      id: "REVENGE_CLUSTER",
      label: "Revenge Tilt",
      count: revengeCluster.count,
      rupees: revengeCluster.leakedRupees,
      icon: Flame,
      color: "rose"
    },
    {
      id: "MIDDAY_TRAP",
      label: "Midday Decay",
      count: middayTrap.count,
      rupees: middayTrap.leakedRupees,
      icon: Clock,
      color: "purple"
    }
  ].filter(item => item.count > 0);

  const toggleFilter = (id) => {
    if (activeBiasFilter === id) {
      setActiveBiasFilter(null);
    } else {
      setActiveBiasFilter(id);
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-[#090d16]/90 border border-white/[0.08] backdrop-blur-2xl shadow-[0_12px_36px_rgba(0,0,0,0.5)] space-y-3">
      {/* Bar Top Telemetry */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex-shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-400 font-mono">
                BEHAVIORAL CAPITAL LEAKAGE DETECTED
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                {totalBiasedTrades} Trades Leaking
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Preventable losses from emotional tilt, unharvested winners, and invariant breaches.
            </p>
          </div>
        </div>

        {/* Aggregate Rupee Leak & Discipline Rate */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-rose-500/30 text-right">
            <span className="text-[9px] text-slate-400 block">Total Preventable Leak</span>
            <div className="font-mono text-sm font-black text-rose-400 flex items-center justify-end">
              <span>-₹</span>
              <RollingTicker value={totalPreventableLeakageRupees} decimalPlaces={0} className="text-rose-400" />
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/[0.08] text-right">
            <span className="text-[9px] text-slate-400 block">Discipline Rate</span>
            <span className={clsx("font-mono text-sm font-black", disciplineRate >= 80 ? "text-cyan-300" : "text-amber-400")}>
              {disciplineRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-white/[0.04]">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
          Isolate Bias:
        </span>
        {items.map((item) => {
          const Icon = item.icon;
          const isSelected = activeBiasFilter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggleFilter(item.id)}
              className={clsx(
                "px-2.5 py-1 rounded-xl text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer border",
                isSelected
                  ? "bg-rose-500/25 text-white border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)] ring-1 ring-rose-400/50"
                  : "bg-white/[0.03] hover:bg-white/[0.07] text-slate-300 border-white/[0.06]"
              )}
            >
              <Icon className="w-3 h-3 text-rose-400" />
              <span>{item.label}</span>
              <span className="font-mono text-[10px] text-rose-300 bg-rose-500/20 px-1 py-0.2 rounded font-bold">
                -₹{item.rupees} ({item.count})
              </span>
            </button>
          );
        })}

        {activeBiasFilter && (
          <button
            type="button"
            onClick={() => setActiveBiasFilter(null)}
            className="px-2 py-1 rounded-xl text-[10px] text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3 h-3" />
            <span>Reset Bias Filter</span>
          </button>
        )}
      </div>
    </div>
  );
}
