import React, { useState } from "react";
import clsx from "clsx";
import { Scale, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { soundEngine } from "../../../utils/soundEngine";

const REBALANCE_PRESETS = [
  { id: "balanced", label: "70/15/15 Dhandho", eq: 70, gd: 15, cs: 15, desc: "Balanced Growth & Shield" },
  { id: "defensive", label: "60/20/20 Shield", eq: 60, gd: 20, cs: 20, desc: "High Volatility Defense" },
  { id: "aggressive", label: "80/10/10 Growth", eq: 80, gd: 10, cs: 10, desc: "Aggressive Equity Run" },
];

export function RebalanceEngineCard({
  equityValue = 0,
  goldValue = 0,
  cashValue = 0,
  total = 0,
  isPrivacyMode = false,
  currencySymbol = "₹",
  fxRate = 1,
}) {
  const [selectedPreset, setSelectedPreset] = useState("balanced");
  const preset = REBALANCE_PRESETS.find((p) => p.id === selectedPreset) || REBALANCE_PRESETS[0];

  const targetEquityVal = total * (preset.eq / 100);
  const targetGoldVal = total * (preset.gd / 100);
  const targetCashVal = total * (preset.cs / 100);

  const equityDelta = equityValue - targetEquityVal;
  const goldDelta = goldValue - targetGoldVal;
  const cashDelta = cashValue - targetCashVal;

  const actualEqPct = total > 0 ? Math.round((equityValue / total) * 100) : 0;
  const actualGdPct = total > 0 ? Math.round((goldValue / total) * 100) : 0;
  const actualCsPct = total > 0 ? Math.max(0, 100 - actualEqPct - actualGdPct) : 0;

  const goldbeesUnitsNeeded = goldDelta < 0 ? Math.ceil(Math.abs(goldDelta) / 133) : 0;

  const convertedEqDelta = Math.round(Math.abs(equityDelta) / fxRate);
  const convertedGdDelta = Math.round(Math.abs(goldDelta) / fxRate);
  const convertedCsDelta = Math.round(Math.abs(cashDelta) / fxRate);

  return (
    <div className="space-y-3.5 pt-2 border-t border-white/[0.08] font-mono text-xs">
      {/* Preset Selector */}
      <div className="flex items-center justify-between gap-1 p-1 rounded-xl bg-black/40 border border-white/10 text-[10px]">
        {REBALANCE_PRESETS.map((p) => {
          const isActive = selectedPreset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelectedPreset(p.id);
                soundEngine.playTabSwitchTone();
              }}
              className={clsx(
                "flex-1 py-1 px-1.5 rounded-lg font-bold transition text-center cursor-pointer whitespace-nowrap",
                isActive
                  ? "bg-cyan-500/25 text-cyan-200 border border-cyan-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
              title={p.desc}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Target vs Actual Comparison Rows */}
      <div className="space-y-2.5">
        {/* Equity */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300">Equity ({actualEqPct}% vs {preset.eq}%)</span>
            <span
              className={clsx(
                "font-bold transition-all duration-300",
                equityDelta >= 0 ? "text-emerald-400" : "text-rose-400",
                isPrivacyMode && "filter blur-[6px] select-none hover:blur-none cursor-pointer"
              )}
            >
              {equityDelta >= 0 ? "+" : "-"}{currencySymbol}{convertedEqDelta.toLocaleString("en-IN")}{" "}
              <span className="text-[9px] font-sans text-slate-400">({equityDelta >= 0 ? "Over" : "Under"})</span>
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden flex">
            <div className="h-full bg-cyan-400 transition-all duration-500" style={{ width: `${Math.min(100, actualEqPct)}%` }} />
          </div>
        </div>

        {/* Gold */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300">Gold ({actualGdPct}% vs {preset.gd}%)</span>
            <span
              className={clsx(
                "font-bold transition-all duration-300",
                goldDelta >= 0 ? "text-amber-400" : "text-amber-300",
                isPrivacyMode && "filter blur-[6px] select-none hover:blur-none cursor-pointer"
              )}
            >
              {goldDelta >= 0 ? "+" : "-"}{currencySymbol}{convertedGdDelta.toLocaleString("en-IN")}{" "}
              <span className="text-[9px] font-sans text-slate-400">({goldDelta >= 0 ? "Over" : "Under"})</span>
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden flex">
            <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${Math.min(100, actualGdPct)}%` }} />
          </div>
        </div>

        {/* Cash / Margin */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300">Liquid Cash ({actualCsPct}% vs {preset.cs}%)</span>
            <span
              className={clsx(
                "font-bold transition-all duration-300",
                cashDelta >= 0 ? "text-emerald-400" : "text-slate-400",
                isPrivacyMode && "filter blur-[6px] select-none hover:blur-none cursor-pointer"
              )}
            >
              {cashDelta >= 0 ? "+" : "-"}{currencySymbol}{convertedCsDelta.toLocaleString("en-IN")}{" "}
              <span className="text-[9px] font-sans text-slate-400">({cashDelta >= 0 ? "Over" : "Under"})</span>
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden flex">
            <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${Math.min(100, actualCsPct)}%` }} />
          </div>
        </div>
      </div>

      {/* Action Directive Card */}
      <div className="p-3 rounded-2xl bg-cyan-500/[0.08] border border-cyan-500/20 space-y-1.5 text-[11px]">
        <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
          <Scale className="w-3.5 h-3.5" />
          <span>Capital Rebalancing Directive</span>
        </div>
        <p className="text-slate-300 font-sans leading-relaxed text-[11px]">
          {goldDelta < 0 ? (
            <span>
              Buy ~<strong className="text-amber-300">{goldbeesUnitsNeeded} units GOLDBEES</strong> (
              <span className={clsx(isPrivacyMode && "filter blur-[4px]")}>
                {currencySymbol}{convertedGdDelta.toLocaleString("en-IN")}
              </span>
              ) from available margin to hit your {preset.gd}% hedge target.
            </span>
          ) : equityDelta < 0 ? (
            <span>
              Deploy{" "}
              <strong className={clsx("text-cyan-300", isPrivacyMode && "filter blur-[4px]")}>
                {currencySymbol}{convertedEqDelta.toLocaleString("en-IN")}
              </strong>{" "}
              into core compounders to reach your {preset.eq}% equity allocation.
            </span>
          ) : (
            <span className="text-emerald-300 flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" />
              Portfolio aligned with {preset.label} asset allocation. No action required.
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
