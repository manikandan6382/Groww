import React, { useState } from "react";
import { useTradingStore } from "../../stores/useTradingStore";
import { useLivePriceStore } from "../../stores/useLivePriceStore";
import { exportTaxCsv } from "./exportTaxCsv";
import { JournalHeroBanner } from "./JournalHeroBanner";
import { JournalMaster2CardDeck } from "../../components/trading/JournalMaster2CardDeck";
import { EquityCurveDeck } from "../../components/trading/EquityCurveDeck";
import { JournalAnalyticsDeck } from "../../components/trading/JournalAnalyticsDeck";
import { TradeLoggerForm } from "../../components/trading/TradeLoggerForm";
import { JournalStoryDeck } from "../../components/trading/JournalStoryDeck";
import { PerformanceCrucibleDeck } from "../../components/trading/PerformanceCrucibleDeck";
import { QuantEdgeMicrostructureDeck } from "../../components/trading/QuantEdgeMicrostructureDeck";
import { LuxuryDateRangePicker } from "../../components/common/LuxuryDateRangePicker";
import { EodDebriefModal } from "./EodDebriefModal";
import { TradingBrainBackupModal } from "./TradingBrainBackupModal";
import { CockpitFloatingDock } from "./CockpitFloatingDock";

export function JournalView() {
  const { 
    journalTrades, 
    journalRange, 
    journalCustomStart,
    journalCustomEnd,
    setJournalRange,
    setJournalCustomRange,
    setSafetyGuardModalOpen,
    setCustomTradeModalOpen
  } = useTradingStore();

  const vixLtp = useLivePriceStore((s) => s.ticks?.["INDIA_VIX"]?.ltp ?? s.sparklines?.["INDIA_VIX"]?.slice(-1)[0] ?? 13.20);
  const [isFormVisible, setFormVisible] = useState(true);
  const [isCalendarOpen, setCalendarOpen] = useState(false);
  const [isEodModalOpen, setEodModalOpen] = useState(false);
  const [isBrainModalOpen, setBrainModalOpen] = useState(false);

  const handleExportCsv = () => {
    exportTaxCsv(journalTrades, journalRange);
  };

  return (
    <div className="space-y-6">
      {/* Act 1: Apple Luxury Spatial Hero Banner */}
      <JournalHeroBanner
        onOpenSafetyGuard={() => setSafetyGuardModalOpen(true)}
        onOpenCustomTrade={() => setCustomTradeModalOpen(true)}
        onExportCsv={handleExportCsv}
        onOpenEodDebrief={() => setEodModalOpen(true)}
        onOpenBrainBackup={() => setBrainModalOpen(true)}
        isFormVisible={isFormVisible}
        onToggleForm={() => setFormVisible(!isFormVisible)}
        journalRange={journalRange}
        setJournalRange={setJournalRange}
        journalCustomStart={journalCustomStart}
        journalCustomEnd={journalCustomEnd}
        onOpenCalendar={() => setCalendarOpen(true)}
      />

      {/* Act 2: Master 2-Card Deck (Reactive to journalRange) */}
      <JournalMaster2CardDeck />

      {/* Act 3: Cumulative Account Equity Growth Curve & 1,000-Path Monte Carlo Deck */}
      <EquityCurveDeck />

      {/* Act 3.5: Middle Visual Analytics Deck (Reactive to journalRange) */}
      <JournalAnalyticsDeck />

      {/* Act 3.5: Full 12-Column Guided Trade Logger Form */}
      {isFormVisible && <TradeLoggerForm />}

      {/* Act 4: Story-Driven Trade History Log (Reactive to journalRange & filters) */}
      <JournalStoryDeck />

      {/* Act 5: The Institutional Performance Crucible & Counterfactual Alpha Lab */}
      <PerformanceCrucibleDeck />

      {/* Act 6: The Quant Edge & Execution Microstructure Lab */}
      <QuantEdgeMicrostructureDeck />

      {/* Luxury Calendar Date Range Picker */}
      <LuxuryDateRangePicker
        isOpen={isCalendarOpen}
        onClose={() => setCalendarOpen(false)}
        startDate={journalCustomStart}
        endDate={journalCustomEnd}
        onApplyRange={(start, end) => setJournalCustomRange(start, end)}
      />

      {/* 1-Click Executive EOD Daily Debrief Modal */}
      <EodDebriefModal
        isOpen={isEodModalOpen}
        onClose={() => setEodModalOpen(false)}
        trades={journalTrades}
        vixLtp={vixLtp}
      />

      {/* 1-Click Trading Brain JSON Backup & Restore Modal */}
      <TradingBrainBackupModal
        isOpen={isBrainModalOpen}
        onClose={() => setBrainModalOpen(false)}
      />

      {/* Floating Apple Spatial Cockpit HUD Navigation Dock */}
      <CockpitFloatingDock />
    </div>
  );
}

export default JournalView;
