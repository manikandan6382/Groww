import React, { useState } from "react";
import { useTradingStore } from "../../stores/useTradingStore";
import { exportTaxCsv } from "./exportTaxCsv";
import { JournalHeroBanner } from "./JournalHeroBanner";
import { JournalMaster2CardDeck } from "../../components/trading/JournalMaster2CardDeck";
import { EquityCurveDeck } from "../../components/trading/EquityCurveDeck";
import { JournalAnalyticsDeck } from "../../components/trading/JournalAnalyticsDeck";
import { TradeLoggerForm } from "../../components/trading/TradeLoggerForm";
import { JournalStoryDeck } from "../../components/trading/JournalStoryDeck";
import { LuxuryDateRangePicker } from "../../components/common/LuxuryDateRangePicker";

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

  const [isFormVisible, setFormVisible] = useState(true);
  const [isCalendarOpen, setCalendarOpen] = useState(false);

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

      {/* Act 5: Luxury Calendar Date Range Picker */}
      <LuxuryDateRangePicker
        isOpen={isCalendarOpen}
        onClose={() => setCalendarOpen(false)}
        startDate={journalCustomStart}
        endDate={journalCustomEnd}
        onApplyRange={(start, end) => setJournalCustomRange(start, end)}
      />
    </div>
  );
}

export default JournalView;
