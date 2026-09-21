import React from "react";
import clsx from "clsx";
import { Layers, RefreshCw, Activity, ShieldCheck, Compass, Sparkles, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { OPTION_CHAIN_UNDERLYINGS, getMaxPainContext } from "./optionChainUtils";

export function OptionChainHeader({
  activeSymbol,
  onSelectSymbol,
  activeExpiry,
  onSelectExpiry,
  chainData,
  pcrSentiment,
  refreshing,
  lastUpdated,
  onRefresh,
  isCollapsed = false,
  onToggleCollapse
}) {
  const spot = chainData?.spot || 25000;
  const expiryDates = chainData?.expiryDates || [];
  const maxPain = chainData?.maxPain || spot;
  const maxPainCtx = getMaxPainContext(activeSymbol);

  return (
    <div className="space-y-4 border-b border-white/[0.06] pb-5">
      {/* Top Title & Diagnostics Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Layers className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-white font-mono tracking-wider">
                INSTITUTIONAL OPTION CHAIN &amp; PCR RADAR
              </h2>
              <span className="text-[9px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shadow-sm">
                <Sparkles className="w-2.5 h-2.5" />
                STRIKE ORDER-FLOW
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-400 font-mono pl-10">
            Real-time Strike OI Accumulation · PCR Sentiment Dial · Max Pain Pin · 1-Click Scalp Execution
          </p>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 flex-wrap self-end sm:self-center">
          {chainData?.isSimulated && (
            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/25 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-amber-400" />
              SIMULATED GREEKS
            </span>
          )}

          {lastUpdated && (
            <span className="text-[10px] font-mono text-slate-400 hidden md:inline">
              Synced:{" "}
              <span className="text-slate-200 font-semibold">
                {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </span>
          )}

          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] text-slate-300 hover:text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              title={isCollapsed ? "Expand Option Chain Strike Matrix" : "Collapse into Compact Investor Overview"}
            >
              {isCollapsed ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Expand Table</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  <span>Compact Focus</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] text-slate-300 hover:text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm active:scale-95"
          >
            <RefreshCw className={clsx("w-3.5 h-3.5", refreshing && "animate-spin text-emerald-400")} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Middle Controls & Telemetry Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
        {/* Underlying Symbol Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
          {OPTION_CHAIN_UNDERLYINGS.map((u) => {
            const isSelected = activeSymbol === u.symbol;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => onSelectSymbol(u.symbol)}
                className={clsx(
                  "py-1.5 px-3 rounded-xl font-mono text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer",
                  isSelected
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20"
                    : "bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-slate-400 hover:text-white"
                )}
              >
                <span>{u.name}</span>
                <span className={clsx("text-[9px] font-normal px-1 rounded", isSelected ? "bg-slate-950/20 text-slate-900" : "text-slate-500")}>
                  Lot: {u.lotSize}
                </span>
              </button>
            );
          })}
        </div>

        {/* Live Metrics: Spot, PCR, Max Pain */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Live Spot Badge */}
          <div className="p-1.5 px-3 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            <span className="text-[10px] text-slate-400 font-bold">SPOT:</span>
            <span className="text-sm font-black text-white">
              {Number(spot).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* PCR Dial & Sentiment */}
          <div className={clsx("p-1.5 px-3 rounded-xl border flex items-center gap-2 font-mono", pcrSentiment?.pillColor || "bg-white/[0.03] border-white/[0.08]")}>
            <Activity className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold">PCR:</span>
            <span className="text-sm font-black">{chainData?.pcr ?? "1.15"}</span>
            <span className="text-[9px] font-bold opacity-80 hidden sm:inline">
              ({pcrSentiment?.label || "Equilibrium"})
            </span>
          </div>

          {/* Max Pain Pin with Contextual Expiry Tag */}
          <div
            className={clsx(
              "p-1.5 px-3 rounded-xl border flex items-center gap-1.5 font-mono cursor-help transition-all",
              maxPainCtx.isExpiryToday
                ? "bg-amber-500/15 border-amber-500/35 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                : "bg-white/[0.03] border-white/[0.08] text-slate-300"
            )}
            title={maxPainCtx.tip}
          >
            <Compass className={clsx("w-3.5 h-3.5", maxPainCtx.isExpiryToday ? "text-amber-400 animate-pulse" : "text-slate-400")} />
            <span className="text-[10px] font-bold text-slate-400">MAX PAIN:</span>
            <span className="text-sm font-black text-white">
              {Number(maxPain).toLocaleString("en-IN")}
            </span>
            <span
              className={clsx(
                "text-[8px] font-extrabold px-1.5 py-0.2 rounded border hidden sm:inline",
                maxPainCtx.tone
              )}
            >
              {maxPainCtx.shortTag}
            </span>
          </div>

          {/* Expiry Selector Dropdown */}
          {expiryDates.length > 0 && (
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="text-[10px] text-slate-400">EXPIRY:</span>
              <select
                value={activeExpiry}
                onChange={(e) => onSelectExpiry(e.target.value)}
                className="bg-[#121620] border border-white/10 rounded-xl px-2.5 py-1.5 text-slate-200 font-mono text-xs font-bold focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                {expiryDates.map((exp) => (
                  <option key={exp} value={exp} className="bg-slate-900 text-slate-200">
                    {exp}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
