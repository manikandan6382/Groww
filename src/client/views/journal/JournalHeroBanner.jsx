import React from "react";
import { JournalHeroHeader } from "./JournalHeroHeader";
import { JournalTimeframeTabs } from "./JournalTimeframeTabs";

export function JournalHeroBanner({
  onOpenSafetyGuard,
  onOpenCustomTrade,
  onExportCsv,
  isFormVisible,
  onToggleForm,
  journalRange,
  setJournalRange,
  journalCustomStart,
  journalCustomEnd,
  onOpenCalendar
}) {
  return (
    <div className="p-5 rounded-2xl bg-app-card/70 backdrop-blur-xl border border-white/5 shadow-xl space-y-4">
      <JournalHeroHeader
        onOpenSafetyGuard={onOpenSafetyGuard}
        onOpenCustomTrade={onOpenCustomTrade}
        onExportCsv={onExportCsv}
        isFormVisible={isFormVisible}
        onToggleForm={onToggleForm}
      />
      <JournalTimeframeTabs
        journalRange={journalRange}
        setJournalRange={setJournalRange}
        journalCustomStart={journalCustomStart}
        journalCustomEnd={journalCustomEnd}
        onOpenCalendar={onOpenCalendar}
      />
    </div>
  );
}
