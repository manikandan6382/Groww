import React from "react";
import { useHoldingsTableData } from "./useHoldingsTableData";
import { HoldingsTableHeader } from "./HoldingsTableHeader";
import { HoldingsConcentrationHorizon } from "./HoldingsConcentrationHorizon";
import { HoldingsFilterSortBar } from "./HoldingsFilterSortBar";
import { HoldingsTableRow } from "./HoldingsTableRow";
import { HoldingsTableEmptyState } from "./HoldingsTableEmptyState";

export function HoldingsTable({
  holdings = [],
  isExpired = false,
  isKiteOffline = false,
  userId = null,
  onConnectKite
}) {
  const data = useHoldingsTableData(holdings);

  return (
    <div className="p-6 sm:p-8 rounded-[32px] bg-[var(--card)] backdrop-blur-3xl border border-[var(--line)] shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12)] relative overflow-hidden space-y-6 hover:border-white/[0.18] transition-colors">
      {/* 🌌 Apple Spatial Ambient Spotlight */}
      <div className="absolute top-0 left-1/4 w-[480px] h-[220px] bg-cyan-500/[0.06] rounded-full blur-[90px] pointer-events-none -mt-24" />

      {/* 1. Header: Master Title, Telemetry Pills & Search Box */}
      <HoldingsTableHeader
        gainersCount={data.gainersCount}
        losersCount={data.losersCount}
        topHolding={data.topHolding}
        search={data.search}
        setSearch={data.setSearch}
        searchInputRef={data.searchInputRef}
      />

      {/* 2. Apple Spatial Horizon: Interactive Portfolio Concentration Spectrum */}
      <HoldingsConcentrationHorizon
        totalHoldingsValue={data.totalHoldingsValue}
        enrichedItems={data.enrichedItems}
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
        totalItemsCount={data.enrichedItems.length}
      />

      {/* 4. Main Matrix Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/[0.08] shadow-inner">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-white/[0.03] border-b border-white/[0.08] text-[10px] uppercase font-mono font-extrabold text-slate-400 tracking-wider">
              <th className="py-3.5 px-4 min-w-[200px] whitespace-nowrap">Asset / Instrument</th>
              <th className="py-3.5 px-4 min-w-[150px] whitespace-nowrap">Portfolio Allocation</th>
              <th className="py-3.5 px-4 min-w-[130px] text-right whitespace-nowrap">Position &amp; Cost</th>
              <th className="py-3.5 px-4 min-w-[130px] text-right whitespace-nowrap">Live LTP &amp; Value</th>
              <th className="py-3.5 px-4 min-w-[130px] text-right whitespace-nowrap">Today's Movement</th>
              <th className="py-3.5 px-4 min-w-[140px] text-right whitespace-nowrap">Unrealized Return</th>
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
                  copiedSymbol={data.copiedSymbol}
                  onCopy={data.handleCopy}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default HoldingsTable;
