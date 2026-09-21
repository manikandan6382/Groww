import React, { useState } from "react";
import clsx from "clsx";
import { Layers, Zap } from "lucide-react";
import { useTradingStore } from "../../../stores/useTradingStore";
import { soundEngine } from "../../../utils/soundEngine";
import { FX_RATES } from "../portfolio/portfolioNavEngine";
import { useHoldingsTableData } from "./useHoldingsTableData";
import { HoldingsTableHeader } from "./HoldingsTableHeader";
import { HoldingsConcentrationHorizon } from "./HoldingsConcentrationHorizon";
import { HoldingsFilterSortBar } from "./HoldingsFilterSortBar";
import { HoldingsTableRow } from "./HoldingsTableRow";
import { HoldingsTableEmptyState } from "./HoldingsTableEmptyState";
import { HoldingQuickActionModal } from "./HoldingQuickActionModal";
import { PositionsMatrixTable } from "./PositionsMatrixTable";

export function HoldingsTable({
  holdings = [],
  positions = [],
  isExpired = false,
  isKiteOffline = false,
  userId = null,
  onConnectKite,
}) {
  const [activeDock, setActiveDock] = useState("holdings"); // 'holdings' | 'positions'
  const currency = useTradingStore((s) => s.portfolioCurrency || "INR");
  const fxConfig = FX_RATES[currency] || FX_RATES.INR;
  const fxRate = fxConfig.rate;
  const currencySymbol = fxConfig.symbol;

  const data = useHoldingsTableData(holdings);
  const [activeActionItem, setActiveActionItem] = useState(null);
  const [initialActionTab, setInitialActionTab] = useState("accumulate");

  const openPositionsCount = Array.isArray(positions)
    ? positions.filter((p) => Number(p.quantity || 0) !== 0).length
    : 0;

  const handleOpenActionModal = (item, tab = "accumulate") => {
    setActiveActionItem(item);
    setInitialActionTab(tab);
  };

  const isCostMode = data.viewMode === "cost";
  const isPerfMode = data.viewMode === "performance";
  const isGain = data.totalUnrealizedPnl >= 0;

  const convertedTotalInvested = Math.round(data.totalInvestedValue / fxRate);
  const convertedTotalHoldings = Math.round(data.totalHoldingsValue / fxRate);
  const convertedTotalPnl = Math.round(Math.abs(data.totalUnrealizedPnl) / fxRate);

  return (
    <div className="p-6 sm:p-8 rounded-[32px] bg-[var(--card)] backdrop-blur-3xl border border-[var(--line)] shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12)] relative overflow-hidden space-y-6 hover:border-white/[0.18] transition-colors">
      {/* 🌌 Apple Spatial Ambient Spotlight */}
      <div className="absolute top-0 left-1/4 w-[480px] h-[220px] bg-cyan-500/[0.06] rounded-full blur-[90px] pointer-events-none -mt-24" />

      {/* 🏛️ Section 4 Master Dock Segmented Switcher: Demat Holdings vs Live Positions */}
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-4 flex-wrap">
        <div className="p-0.5 rounded-2xl bg-black/40 border border-white/10 flex items-center font-mono text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveDock("holdings");
              soundEngine.playTabSwitchTone();
            }}
            className={clsx(
              "px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer",
              activeDock === "holdings"
                ? "bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            )}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>📦 Demat Holdings ({holdings.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveDock("positions");
              soundEngine.playTabSwitchTone();
            }}
            className={clsx(
              "px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer",
              activeDock === "positions"
                ? "bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            )}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>⚡ Live Positions ({openPositionsCount})</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
          <span>Currency:</span>
          <span className="font-bold text-white px-2 py-0.5 rounded bg-white/5 border border-white/10">
            {currencySymbol} {currency}
          </span>
        </div>
      </div>

      {activeDock === "positions" ? (
        /* ⚡ Mode B: Live Positions & Derivatives Matrix Table */
        <PositionsMatrixTable
          positions={positions}
          currencySymbol={currencySymbol}
          fxRate={fxRate}
          onSwitchToDemat={() => setActiveDock("holdings")}
        />
      ) : (
        /* 📦 Mode A: Demat Equity Holdings Matrix */
        <>
          {/* 1. Header: Master Title, Telemetry Pills & Search Box */}
          <HoldingsTableHeader
            gainersCount={data.gainersCount}
            losersCount={data.losersCount}
            topHolding={data.topHolding}
            topInvested={data.topInvested}
            totalHoldingsValue={data.totalHoldingsValue}
            totalInvestedValue={data.totalInvestedValue}
            totalUnrealizedPnl={data.totalUnrealizedPnl}
            totalUnrealizedPnlPct={data.totalUnrealizedPnlPct}
            portfolioProfitMultiplier={data.portfolioProfitMultiplier}
            portfolioCushionPct={data.portfolioCushionPct}
            avgCostPerPosition={data.avgCostPerPosition}
            search={data.search}
            setSearch={data.setSearch}
            searchInputRef={data.searchInputRef}
            onCopySummary={data.handleCopySummary}
            copiedSymbol={data.copiedSymbol}
            currencySymbol={currencySymbol}
            fxRate={fxRate}
          />

          {/* 2. Apple Spatial Horizon: Interactive Portfolio Concentration Spectrum */}
          <HoldingsConcentrationHorizon
            totalHoldingsValue={data.totalHoldingsValue}
            totalInvestedValue={data.totalInvestedValue}
            enrichedItems={data.enrichedItems}
            concentrationMode={data.concentrationMode}
            onConcentrationModeChange={data.handleConcentrationModeChange}
            hoveredHolding={data.hoveredHolding}
            setHoveredHolding={data.setHoveredHolding}
            search={data.search}
            setSearch={data.setSearch}
          />

          {/* 3. Segmented Filter Tabs & Sort Controls */}
          <HoldingsFilterSortBar
            filter={data.filter}
            onFilterChange={data.handleFilterChange}
            sortBy={data.sortBy}
            onSortChange={data.handleSortChange}
            viewMode={data.viewMode}
            onViewModeChange={data.handleViewModeChange}
            totalItemsCount={data.enrichedItems.length}
          />

          {/* 4. Main Matrix Table */}
          <div className="overflow-x-auto rounded-2xl border border-white/[0.08] shadow-inner">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white/[0.03] border-b border-white/[0.08] text-[10px] uppercase font-mono font-extrabold text-slate-400 tracking-wider">
                  <th className="py-3.5 px-4 min-w-[200px] whitespace-nowrap sticky left-0 bg-[#0c121e] z-20 border-r border-white/10 shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
                    Asset / Instrument
                  </th>
                  <th className="py-3.5 px-4 min-w-[160px] whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      <span>Allocation</span>
                      <span className="text-[8px] text-slate-300 font-sans">
                        ({data.concentrationMode === "cost" ? "Cost Basis" : "Live NAV"})
                      </span>
                    </span>
                  </th>
                  <th className={`py-3.5 px-4 min-w-[155px] text-right whitespace-nowrap transition-colors ${isCostMode ? "text-indigo-300 bg-indigo-500/[0.08]" : ""}`}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Cost Basis</span>
                      <span className="text-[8px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        NO PROFIT
                      </span>
                    </div>
                  </th>
                  <th className="py-3.5 px-4 min-w-[145px] text-right whitespace-nowrap">
                    <span className="flex items-center justify-end gap-1">
                      <span>Live Valuation</span>
                      <span className="text-[8px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        NAV
                      </span>
                    </span>
                  </th>
                  <th className="py-3.5 px-4 min-w-[130px] text-right whitespace-nowrap">Today's Movement</th>
                  <th className={`py-3.5 px-4 min-w-[140px] text-right whitespace-nowrap transition-colors ${isPerfMode ? "text-emerald-300 bg-emerald-500/[0.08]" : ""}`}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Unrealized Return</span>
                      {isPerfMode && (
                        <span className="text-[8px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          ALPHA
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="py-3.5 px-4 min-w-[150px] text-center whitespace-nowrap">Trend &amp; Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] font-sans">
                {data.filtered.length === 0 ? (
                  <HoldingsTableEmptyState
                    search={data.search}
                    isExpired={isExpired}
                    isKiteOffline={isKiteOffline}
                    userId={userId}
                    onConnectKite={onConnectKite}
                    onReset={() => {
                      data.setSearch("");
                      data.setFilter("all");
                    }}
                  />
                ) : (
                  data.filtered.map((item, idx) => (
                    <HoldingsTableRow
                      key={item.tradingsymbol || idx}
                      item={item}
                      viewMode={data.viewMode}
                      copiedSymbol={data.copiedSymbol}
                      onCopy={data.handleCopy}
                      onOpenActionModal={handleOpenActionModal}
                      currencySymbol={currencySymbol}
                      fxRate={fxRate}
                    />
                  ))
                )}
              </tbody>

              {/* 🏛️ Institutional Portfolio Aggregate Footer */}
              {data.filtered.length > 0 && (
                <tfoot>
                  <tr className="bg-white/[0.04] border-t-2 border-white/[0.10] font-mono text-xs text-white">
                    <td className="py-3.5 px-4 font-black tracking-wider text-[11px] text-slate-300 flex items-center gap-2 sticky left-0 bg-[#0c121e] z-20 border-r border-white/10 shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span>TOTAL ({data.filtered.length} ASSETS)</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-300">
                      100.0%
                    </td>
                    <td className={`py-3.5 px-4 text-right font-extrabold ${isCostMode ? "text-indigo-200 bg-indigo-500/[0.06]" : "text-slate-200"}`}>
                      {currencySymbol}{convertedTotalInvested.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-white">
                      {currencySymbol}{convertedTotalHoldings.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-400">
                      --
                    </td>
                    <td className={`py-3.5 px-4 text-right font-black ${isGain ? "text-emerald-400" : "text-rose-400"} ${isPerfMode ? "bg-emerald-500/[0.06]" : ""}`}>
                      <span>{isGain ? "+" : "-"}{currencySymbol}{convertedTotalPnl.toLocaleString("en-IN")}</span>
                      <span className="text-[10px] font-sans ml-1">({isGain ? "+" : ""}{data.totalUnrealizedPnlPct}%)</span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-[10px] text-cyan-300 font-bold">
                      {data.portfolioProfitMultiplier}x Net Return
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}

      {/* 🔮 Quick Action Modal (Dip Accumulate, Profit Trim) */}
      <HoldingQuickActionModal
        item={activeActionItem}
        isOpen={Boolean(activeActionItem)}
        initialTab={initialActionTab}
        onClose={() => setActiveActionItem(null)}
        currencySymbol={currencySymbol}
        fxRate={fxRate}
      />
    </div>
  );
}

export default HoldingsTable;
