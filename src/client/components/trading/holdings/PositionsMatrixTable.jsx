import React from "react";
import clsx from "clsx";
import { 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  Copy, 
  Check, 
  ShieldCheck, 
  Search, 
  AlertCircle,
  ExternalLink 
} from "lucide-react";
import { RollingTicker } from "../../common/RollingTicker";
import { useTradingStore } from "../../../stores/useTradingStore";
import { usePositionsTableData } from "./usePositionsTableData";
import { POSITION_FILTER_TABS, POSITION_SORT_OPTIONS } from "./holdingsConstants";

export function PositionsMatrixTable({
  positions = [],
  currencySymbol = "₹",
  fxRate = 1,
  onSwitchToDemat,
}) {
  const isPrivacyMode = useTradingStore((s) => s.isPrivacyMode);
  const privacyClass = isPrivacyMode
    ? "filter blur-[7px] select-none hover:blur-none transition-all duration-200 cursor-pointer"
    : "";

  const {
    filter,
    setFilter,
    search,
    setSearch,
    sortBy,
    setSortBy,
    copiedSymbol,
    filtered,
    openCount,
    totalM2m,
    totalRealised,
    totalExposure,
    handleCopy,
    handleSquareOff,
  } = usePositionsTableData(positions);

  const convertedM2m = Math.round(Math.abs(totalM2m) / fxRate);
  const convertedRealised = Math.round(Math.abs(totalRealised) / fxRate);
  const convertedExposure = Math.round(totalExposure / fxRate);
  const isM2mGain = totalM2m >= 0;
  const isRealisedGain = totalRealised >= 0;

  return (
    <div className="space-y-4">
      {/* 1. Header Telemetry Strip for Live Derivatives & Intraday Positions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-white/[0.025] border border-white/[0.08] shadow-[0_8px_24px_rgba(0,0,0,0.4)] font-mono text-xs">
        {/* Card 1: Live MTM P&L */}
        <div className="p-3 rounded-xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.06] space-y-1 relative overflow-hidden group hover:border-cyan-400/30 transition-colors">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>Live MTM Mark</span>
            </span>
            <span
              className={clsx(
                "text-[9px] px-1.5 py-0.5 rounded border font-extrabold tracking-wider",
                isM2mGain ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-rose-500/15 text-rose-300 border-rose-500/30"
              )}
            >
              UNREALIZED
            </span>
          </div>
          <div className={clsx("text-lg font-black tracking-tight", isM2mGain ? "text-emerald-400" : "text-rose-400", privacyClass)}>
            <span>{isM2mGain ? "+" : "-"}{currencySymbol}{convertedM2m.toLocaleString("en-IN")}</span>
          </div>
          <div className="text-[10px] text-slate-400 font-sans flex items-center justify-between">
            <span>Today's active open positions</span>
            <span className="font-mono text-cyan-300 font-bold">{openCount} active</span>
          </div>
        </div>

        {/* Card 2: Booked Realized P&L */}
        <div className="p-3 rounded-xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.06] space-y-1 relative overflow-hidden group hover:border-indigo-400/30 transition-colors">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-indigo-400" />
              <span>Realized Day P&amp;L</span>
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-extrabold tracking-wider">
              BOOKED
            </span>
          </div>
          <div className={clsx("text-lg font-black tracking-tight", isRealisedGain ? "text-emerald-400" : "text-rose-400", privacyClass)}>
            <span>{isRealisedGain ? "+" : "-"}{currencySymbol}{convertedRealised.toLocaleString("en-IN")}</span>
          </div>
          <div className="text-[10px] text-slate-400 font-sans flex items-center justify-between">
            <span>Squared-off intraday profits</span>
            <span className="font-mono text-slate-300 font-bold">Settled</span>
          </div>
        </div>

        {/* Card 3: Total Gross Exposure */}
        <div className="p-3 rounded-xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.06] space-y-1 relative overflow-hidden group hover:border-amber-400/30 transition-colors">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Gross Exposure</span>
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-extrabold tracking-wider">
              NOTIONAL
            </span>
          </div>
          <div className={clsx("text-lg font-black text-slate-100 tracking-tight", privacyClass)}>
            {currencySymbol}{convertedExposure.toLocaleString("en-IN")}
          </div>
          <div className="text-[10px] text-slate-400 font-sans flex items-center justify-between">
            <span>Current market value</span>
            <span className="font-mono text-amber-300 font-bold">Zero-debt</span>
          </div>
        </div>

        {/* Card 4: Risk Protocol Status */}
        <div className="p-3 rounded-xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.06] space-y-1 relative overflow-hidden group hover:border-emerald-400/30 transition-colors">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>RMS Invariant</span>
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-extrabold tracking-wider">
              ACTIVE
            </span>
          </div>
          <div className="text-sm font-bold text-emerald-300 tracking-tight flex items-baseline gap-1 mt-1">
            <span>₹250 Target Risk</span>
            <span className="text-[10px] text-slate-400 font-normal">/trade</span>
          </div>
          <div className="text-[10px] text-slate-400 font-sans flex items-center justify-between">
            <span>1:2.0 Risk-to-Reward Peg</span>
            <span className="font-mono text-emerald-400 font-bold">Protected</span>
          </div>
        </div>
      </div>

      {/* 2. Filter & Sort Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {POSITION_FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={clsx(
                "px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all shrink-0 cursor-pointer",
                filter === tab.id
                  ? "bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-cyan-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contract..."
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-1 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            {POSITION_SORT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id} className="bg-slate-900 text-white">
                Sort: {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Main Positions Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/[0.08] shadow-inner">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-white/[0.03] border-b border-white/[0.08] text-[10px] uppercase font-mono font-extrabold text-slate-400 tracking-wider">
              <th className="py-3.5 px-4 min-w-[200px] whitespace-nowrap sticky left-0 bg-[#0c121e] z-20 border-r border-white/10 shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
                Contract / Instrument
              </th>
              <th className="py-3.5 px-4 min-w-[130px] whitespace-nowrap">Direction &amp; Qty</th>
              <th className="py-3.5 px-4 min-w-[140px] text-right whitespace-nowrap">Avg Entry</th>
              <th className="py-3.5 px-4 min-w-[140px] text-right whitespace-nowrap">LTP / 1D Chg</th>
              <th className="py-3.5 px-4 min-w-[140px] text-right whitespace-nowrap">Exposure</th>
              <th className="py-3.5 px-4 min-w-[150px] text-right whitespace-nowrap">Live MTM P&amp;L</th>
              <th className="py-3.5 px-4 min-w-[160px] text-center whitespace-nowrap">Action Hub</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] font-sans">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <div className="max-w-sm mx-auto space-y-3 font-mono text-xs text-slate-400">
                    <ShieldCheck className="w-8 h-8 mx-auto text-cyan-400 opacity-60" />
                    <div>
                      <p className="font-bold text-slate-200">No Active Intraday or Derivative Positions</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        100% of portfolio capital is in settled Demat delivery or cash reserves. Zero overnight derivative risk.
                      </p>
                    </div>
                    {onSwitchToDemat && (
                      <button
                        type="button"
                        onClick={onSwitchToDemat}
                        className="px-4 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-bold transition cursor-pointer"
                      >
                        Inspect Demat Holdings →
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((pos) => {
                const convertedAvg = Math.round((pos.avg || 0) / fxRate);
                const convertedLtp = Math.round((pos.ltp || 0) / fxRate);
                const convertedExp = Math.round((pos.exposureVal || 0) / fxRate);
                const convertedM2mVal = Math.round(Math.abs(pos.m2m) / fxRate);

                return (
                  <tr
                    key={`${pos.exchange}:${pos.sym}`}
                    className="hover:bg-white/[0.045] transition-all duration-150 group"
                  >
                    {/* Col 1: Contract Symbol */}
                    <td className="py-3.5 px-4 min-w-[200px] sticky left-0 bg-[#0c121e]/95 group-hover:bg-[#121927]/95 backdrop-blur-md z-10 border-r border-white/10 shadow-[4px_0_12px_rgba(0,0,0,0.3)] transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center font-mono font-black text-xs text-cyan-300">
                          {pos.sym.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-white font-mono flex items-center gap-1.5 whitespace-nowrap">
                            <span>{pos.sym}</span>
                            <span className="text-[8px] font-sans px-1.5 py-0.2 rounded bg-white/10 text-slate-300 border border-white/10">
                              {pos.exchange}
                            </span>
                            <span
                              className={clsx(
                                "text-[8px] font-sans font-extrabold px-1.5 py-0.2 rounded border",
                                pos.isMis
                                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                  : "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                              )}
                            >
                              {pos.product}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {pos.isFno ? "Derivatives / F&O" : "Intraday Equity"}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Col 2: Direction & Qty */}
                    <td className="py-3.5 px-4 min-w-[130px] font-mono text-xs whitespace-nowrap">
                      {pos.isClosed ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/30">
                          CLOSED
                        </span>
                      ) : (
                        <div className="space-y-0.5">
                          <span
                            className={clsx(
                              "text-[10px] font-extrabold px-2 py-0.5 rounded-full border inline-flex items-center gap-1",
                              pos.isLong
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                            )}
                          >
                            <span>{pos.isLong ? "LONG" : "SHORT"}</span>
                            <span>{pos.isLong ? `+${pos.qty}` : pos.qty}</span>
                          </span>
                          <div className="text-[10px] text-slate-400">
                            {pos.absQty} units
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Col 3: Avg Price */}
                    <td className="py-3.5 px-4 text-right font-mono min-w-[140px] whitespace-nowrap">
                      <div className="text-slate-200 font-bold text-xs">
                        {currencySymbol}{convertedAvg.toLocaleString("en-IN")}
                      </div>
                      <div className="text-[10px] text-slate-500">Break-even</div>
                    </td>

                    {/* Col 4: LTP & 1D Change */}
                    <td className="py-3.5 px-4 text-right font-mono min-w-[140px] whitespace-nowrap">
                      <div className="text-white font-bold text-xs">
                        {currencySymbol}{convertedLtp.toLocaleString("en-IN")}
                      </div>
                      <div
                        className={clsx(
                          "text-[10px] font-semibold flex items-center justify-end gap-0.5",
                          pos.isDayGain ? "text-cyan-400" : "text-rose-400"
                        )}
                      >
                        {pos.isDayGain ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span>{pos.isDayGain ? "+" : ""}{pos.dayChgPct.toFixed(2)}%</span>
                      </div>
                    </td>

                    {/* Col 5: Exposure */}
                    <td className="py-3.5 px-4 text-right font-mono min-w-[140px] whitespace-nowrap">
                      <div className={clsx("text-slate-200 font-bold text-xs", privacyClass)}>
                        {currencySymbol}{convertedExp.toLocaleString("en-IN")}
                      </div>
                      <div className="text-[10px] text-slate-500">Position value</div>
                    </td>

                    {/* Col 6: Live MTM P&L */}
                    <td className="py-3.5 px-4 text-right font-mono min-w-[150px] whitespace-nowrap">
                      <div
                        className={clsx(
                          "font-black text-sm drop-shadow-sm",
                          pos.isGain ? "text-emerald-400" : "text-rose-400",
                          privacyClass
                        )}
                      >
                        <span>{pos.isGain ? "+" : "-"}{currencySymbol}{convertedM2mVal.toLocaleString("en-IN")}</span>
                      </div>
                      <div
                        className={clsx(
                          "text-[10px] font-bold mt-0.5",
                          pos.isGain ? "text-emerald-300" : "text-rose-300"
                        )}
                      >
                        {pos.isGain ? "+" : ""}{pos.returnPct.toFixed(2)}% ROI
                      </div>
                    </td>

                    {/* Col 7: Action Hub */}
                    <td className="py-3.5 px-4 text-center min-w-[160px] whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopy(pos.sym)}
                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.12] border border-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                          title="Copy Contract Symbol"
                        >
                          {copiedSymbol === pos.sym ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {!pos.isClosed && (
                          <button
                            type="button"
                            onClick={() => handleSquareOff(pos)}
                            className="flex items-center gap-1 px-3 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/40 text-[10px] font-mono font-bold text-rose-300 transition-all duration-150 active:scale-95 shadow-sm cursor-pointer"
                            title={`Square Off ${pos.sym} in OrderPad`}
                          >
                            <Zap className="w-2.5 h-2.5 text-rose-400" />
                            <span>Square Off</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Footer Aggregation */}
          {filtered.length > 0 && (
            <tfoot>
              <tr className="bg-white/[0.04] border-t-2 border-white/[0.10] font-mono text-xs text-white">
                <td className="py-3.5 px-4 font-black tracking-wider text-[11px] text-slate-300 flex items-center gap-2 sticky left-0 bg-[#0c121e] z-20 border-r border-white/10 shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>TOTAL ({filtered.length} POSITIONS)</span>
                </td>
                <td className="py-3.5 px-4 font-bold text-slate-300">
                  {openCount} Open
                </td>
                <td className="py-3.5 px-4 text-right text-slate-400">
                  --
                </td>
                <td className="py-3.5 px-4 text-right text-slate-400">
                  --
                </td>
                <td className={clsx("py-3.5 px-4 text-right font-black text-slate-200", privacyClass)}>
                  {currencySymbol}{convertedExposure.toLocaleString("en-IN")}
                </td>
                <td className={clsx("py-3.5 px-4 text-right font-black", isM2mGain ? "text-emerald-400" : "text-rose-400", privacyClass)}>
                  {isM2mGain ? "+" : "-"}{currencySymbol}{convertedM2m.toLocaleString("en-IN")}
                </td>
                <td className="py-3.5 px-4 text-center text-[10px] text-cyan-300 font-bold">
                  Live Derivatives Desk
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

export default PositionsMatrixTable;
