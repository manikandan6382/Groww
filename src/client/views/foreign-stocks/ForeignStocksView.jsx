import React from "react";
import { useForeignStocksData } from "./useForeignStocksData";
import { ForeignStocksHud } from "./ForeignStocksHud";
import { ForeignStocksPillars } from "./ForeignStocksPillars";
import { ForeignStocksSimulator } from "./ForeignStocksSimulator";
import { ForeignStocksFilterBar } from "./ForeignStocksFilterBar";
import { ForeignStocksGrid } from "./ForeignStocksGrid";
import { ForeignStocksTable } from "./ForeignStocksTable";
import { ForeignStocksRoadmap } from "./ForeignStocksRoadmap";
import { ForeignStockDetailModal } from "./ForeignStockDetailModal";
import { ForeignStocksCompareDock } from "./ForeignStocksCompareDock";

/**
 * 🍏 Master Apple Vision Pro Foreign Stocks View
 */
export function ForeignStocksView() {
  const {
    selectedSector, setSelectedSector,
    searchQuery, setSearchQuery,
    resetFilters,
    viewMode, setViewMode,
    sortBy, setSortBy,
    copiedSymbol, handleCopySymbol,
    watchlist, toggleWatchlist,
    watchlistSectorDistribution,
    comparedSymbols, comparedStocks,
    toggleCompareStock, clearCompareStocks,
    selectedModalStock, setSelectedModalStock,
    simRupees, setSimRupees,
    simStockSymbol, setSimStockSymbol,
    simYears, setSimYears,
    simMode, setSimMode,
    adjustInflation, setAdjustInflation,
    customCagr, setCustomCagr,
    activeSimCagr,
    filteredStocks,
    simStock, simUsdCapital, simSharesOwned,
    simProjectedInrValue, simTotalInrRoiPct, simNetInrProfit,
    totalInvestedRupees,
    simDirection, setSimDirection,
    goalTargetRupees, setGoalTargetRupees,
    seedCapitalRupees, setSeedCapitalRupees,
    requiredMonthlySip, goalTotalOutPocket, goalMarketWealth,
    simulatePullback, setSimulatePullback,
    trajectoryData,
    benchmarkFdValue, benchmarkFdGain,
    benchmarkNiftyValue, benchmarkNiftyGain,
    benchmarkUsValue, benchmarkUsGain,
    alphaOverNifty, alphaOverFd,
    priorRemittancesInr, setPriorRemittancesInr,
    remainingTcsExemption,
    fxScenario, setFxScenario,
    activeFxAlpha,
    isTcsExempt, tcsTaxableExcess, tcsAmount,
  } = useForeignStocksData();

  return (
    <div className="space-y-6">
      {/* 🌟 1. Wall Street ↔ Dalal Street Master Command HUD */}
      <ForeignStocksHud />

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
        simNetInrProfit={simNetInrProfit}
        totalInvestedRupees={totalInvestedRupees}
        activeSimCagr={activeSimCagr}
        setCustomCagr={setCustomCagr}
        simYears={simYears}
        setSimYears={setSimYears}
        simMode={simMode}
        setSimMode={setSimMode}
        adjustInflation={adjustInflation}
        setAdjustInflation={setAdjustInflation}
        priorRemittancesInr={priorRemittancesInr}
        setPriorRemittancesInr={setPriorRemittancesInr}
        remainingTcsExemption={remainingTcsExemption}
        fxScenario={fxScenario}
        setFxScenario={setFxScenario}
        activeFxAlpha={activeFxAlpha}
        simDirection={simDirection}
        setSimDirection={setSimDirection}
        goalTargetRupees={goalTargetRupees}
        setGoalTargetRupees={setGoalTargetRupees}
        seedCapitalRupees={seedCapitalRupees}
        setSeedCapitalRupees={setSeedCapitalRupees}
        requiredMonthlySip={requiredMonthlySip}
        goalTotalOutPocket={goalTotalOutPocket}
        goalMarketWealth={goalMarketWealth}
        simulatePullback={simulatePullback}
        setSimulatePullback={setSimulatePullback}
        trajectoryData={trajectoryData}
        benchmarkFdValue={benchmarkFdValue}
        benchmarkFdGain={benchmarkFdGain}
        benchmarkNiftyValue={benchmarkNiftyValue}
        benchmarkNiftyGain={benchmarkNiftyGain}
        benchmarkUsValue={benchmarkUsValue}
        benchmarkUsGain={benchmarkUsGain}
        alphaOverNifty={alphaOverNifty}
        alphaOverFd={alphaOverFd}
        isTcsExempt={isTcsExempt}
        tcsTaxableExcess={tcsTaxableExcess}
        tcsAmount={tcsAmount}
      />

      {/* 💎 4. US Titans Radar Matrix (Filter Tabs, Watchlist, Search & Cards) */}
      <div className="space-y-4">
        <ForeignStocksFilterBar
          selectedSector={selectedSector}
          setSelectedSector={setSelectedSector}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          viewMode={viewMode}
          setViewMode={setViewMode}
          sortBy={sortBy}
          setSortBy={setSortBy}
          watchlistCount={watchlist.length}
          watchlistSectorDistribution={watchlistSectorDistribution}
          onToggleWatchlist={toggleWatchlist}
          onResetFilters={resetFilters}
        />

        {viewMode === "grid" ? (
          <ForeignStocksGrid
            filteredStocks={filteredStocks}
            onSelectSimStock={setSimStockSymbol}
            copiedSymbol={copiedSymbol}
            onCopySymbol={handleCopySymbol}
            onOpenDetail={setSelectedModalStock}
            watchlist={watchlist}
            onToggleWatchlist={toggleWatchlist}
            comparedSymbols={comparedSymbols}
            onToggleCompare={toggleCompareStock}
            onResetFilters={resetFilters}
          />
        ) : (
          <ForeignStocksTable
            filteredStocks={filteredStocks}
            onSelectSimStock={setSimStockSymbol}
            onOpenDetail={setSelectedModalStock}
            watchlist={watchlist}
            onToggleWatchlist={toggleWatchlist}
            comparedSymbols={comparedSymbols}
            onToggleCompare={toggleCompareStock}
            onResetFilters={resetFilters}
          />
        )}
      </div>

      {/* 🥊 Floating Apple Vision Pro Titan Compare Dock */}
      <ForeignStocksCompareDock
        comparedStocks={comparedStocks}
        onRemoveStock={toggleCompareStock}
        onClearAll={clearCompareStocks}
        onSelectSimStock={setSimStockSymbol}
        onOpenDetail={setSelectedModalStock}
      />

      {/* 🛡️ 5. Indian Investor Onboarding & Compliance 3-Step Roadmap */}
      <ForeignStocksRoadmap
        simRupees={simRupees}
        priorRemittancesInr={priorRemittancesInr}
        setPriorRemittancesInr={setPriorRemittancesInr}
        simStock={simStock}
      />

      {/* 🔍 6. Interactive Stock Deep-Dive Modal */}
      <ForeignStockDetailModal
        stock={selectedModalStock}
        isOpen={Boolean(selectedModalStock)}
        onClose={() => setSelectedModalStock(null)}
        isWatchlisted={watchlist.includes(selectedModalStock?.symbol)}
        onToggleWatchlist={toggleWatchlist}
        onSimulate={setSimStockSymbol}
      />
    </div>
  );
}

export default ForeignStocksView;
