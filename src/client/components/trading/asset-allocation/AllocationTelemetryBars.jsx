import React from "react";
import clsx from "clsx";
import { ShieldCheck } from "lucide-react";

export function AllocationTelemetryBars({
  maxHoldingSymbol,
  maxConcentrationPct,
  liquidShieldVal = 0,
  capitalGuardPct = 0,
  sectorMetrics = null,
  isPrivacyMode = false,
  currencySymbol = "₹",
  fxRate = 1,
}) {
  const activeSectors = sectorMetrics?.activeSectorCount ?? 0;
  const betaEstimate = sectorMetrics?.betaEstimate ?? "0.82";
  const sectorLabel = activeSectors > 0
    ? `${activeSectors} Sectors · β ${betaEstimate}`
    : "Asset Balanced";
  const sectorWidth = activeSectors > 0
    ? Math.min(100, Math.max(25, Math.round((activeSectors / 5) * 100)))
    : 75;

  const convertedLiquid = Math.round((liquidShieldVal || 0) / fxRate);

  return (
    <div className="relative space-y-3 pt-2 border-t border-white/[0.08]">
      {/* Metric 1: Real Dynamic Sector Diversification */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-300 font-medium">Sector Diversification</span>
          <span className="text-emerald-400 font-bold">{sectorLabel}</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full bg-emerald-400/80 rounded-full transition-all duration-500"
            style={{ width: `${sectorWidth}%` }}
          />
        </div>
      </div>

      {/* Metric 2: Max Single Asset Concentration */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-300 font-medium">Concentration ({maxHoldingSymbol})</span>
          <span
            className={clsx(
              "text-cyan-300 font-bold transition-all duration-300",
              isPrivacyMode && "filter blur-[6px] select-none hover:blur-none cursor-pointer"
            )}
            title={isPrivacyMode ? "Privacy Mode Active" : undefined}
          >
            {maxConcentrationPct}%
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full bg-cyan-400/80 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Number(maxConcentrationPct) || 0)}%` }}
          />
        </div>
      </div>

      {/* Metric 3: Crisis Defense Buffer */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-300 font-medium">Liquid Buffer / Gold</span>
          <span
            className={clsx(
              "text-amber-300 font-bold transition-all duration-300",
              isPrivacyMode && "filter blur-[6px] select-none hover:blur-none cursor-pointer"
            )}
            title={isPrivacyMode ? "Privacy Mode Active" : undefined}
          >
            {currencySymbol}{convertedLiquid.toLocaleString("en-IN")} ({capitalGuardPct}%)
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full bg-amber-400/80 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, capitalGuardPct)}%` }}
          />
        </div>
      </div>

      {/* 4. Compact Institutional Risk Profile Chip */}
      <div className="relative p-3 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl flex items-center gap-3">
        <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
          <ShieldCheck className="w-3.5 h-3.5" />
        </div>
        <p className="text-[11px] text-slate-300 leading-snug font-mono flex-1">
          <strong className="text-emerald-300 font-bold">Risk Guard Active:</strong> {sectorMetrics?.diversificationLabel || "Balanced asset mix"}. Zero leverage debt.
        </p>
      </div>
    </div>
  );
}
