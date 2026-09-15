import React from "react";
import { useForeignStocksData } from "./useForeignStocksData";
import { ForeignStocksHud } from "./ForeignStocksHud";
import { ForeignStocksPillars } from "./ForeignStocksPillars";
import { ForeignStocksSimulator } from "./ForeignStocksSimulator";
import { ForeignStocksFilterBar } from "./ForeignStocksFilterBar";
import { ForeignStocksGrid } from "./ForeignStocksGrid";
import { ForeignStocksTable } from "./ForeignStocksTable";
import { ForeignStocksRoadmap } from "./ForeignStocksRoadmap";

/**
 * 🍏 Master Apple Vision Pro Foreign Stocks View
 */
export function ForeignStocksView() {
  const {
    selectedSector, setSelectedSector,
    searchQuery, setSearchQuery,
    viewMode, setViewMode,
    copiedSymbol, handleCopySymbol,
    simRupees, setSimRupees,
    simStockSymbol, setSimStockSymbol,
    isMarketOpen, filteredStocks,
    simStock, simUsdCapital, simSharesOwned,
    simProjectedInrValue, simTotalInrRoiPct
  } = useForeignStocksData();

  return (
    <div className="space-y-6">
      {/* 🌟 1. Wall Street ↔ Dalal Street Master Command HUD */}
      <ForeignStocksHud isMarketOpen={isMarketOpen} />

      {/* 💡 2. "Why Invest in US Equities?" — 3-Pillar Plain-English Rosetta Bar */}
      <ForeignStocksPillars />

      {/* 💱 3. Interactive "Rupee-to-Dollar" Investment & Compounding Simulator */}
      <ForeignStocksSimulator
        simRupees={simRupees}
        setSimRupees={setSimRupees}
        simStockSymbol={simStockSymbol}
        setSimStockSymbol={setSimStockSymbol}
        simStock={simStock}
        simUsdCapital={simUsdCapital}
        simSharesOwned={simSharesOwned}
        simProjectedInrValue={simProjectedInrValue}
        simTotalInrRoiPct={simTotalInrRoiPct}
      />

      {/* 💎 4. US Titans Radar Matrix (Filter Tabs, Search & Cards) */}
      <div className="space-y-4">
        <ForeignStocksFilterBar
          selectedSector={selectedSector}
          setSelectedSector={setSelectedSector}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />

        {viewMode === "grid" ? (
          <ForeignStocksGrid
            filteredStocks={filteredStocks}
            onSelectSimStock={setSimStockSymbol}
            copiedSymbol={copiedSymbol}
            onCopySymbol={handleCopySymbol}
          />
        ) : (
          <ForeignStocksTable
            filteredStocks={filteredStocks}
            onSelectSimStock={setSimStockSymbol}
          />
        )}
      </div>

      {/* 🛡️ 5. Indian Investor Onboarding & Compliance 3-Step Roadmap */}
      <ForeignStocksRoadmap />
    </div>
  );
}

export default ForeignStocksView;
