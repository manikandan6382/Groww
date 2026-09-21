import React from "react";
import { JournalHeroHeader } from "./JournalHeroHeader";
import { JournalTimeframeTabs } from "./JournalTimeframeTabs";

export function JournalHeroBanner({
  onOpenSafetyGuard,
  onOpenCustomTrade,
  onExportCsv,
  onOpenEodDebrief,
  onOpenBrainBackup,
  isFormVisible,
  onToggleForm,
  journalRange,
  setJournalRange,
  journalCustomStart,
  journalCustomEnd,
  onOpenCalendar
}) {
  return (
    <div id="journal-hero" data-deck="journal-hero" className="relative p-5 sm:p-6 rounded-3xl bg-[#0d111a]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-5 overflow-hidden transition-all duration-300">
      {/* Apple Luxury Spatial Ambient Spotlight bleeds */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-cyan-500/[0.07] rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-500/[0.05] rounded-full blur-[90px] pointer-events-none" />

      <JournalHeroHeader
        onOpenSafetyGuard={onOpenSafetyGuard}
        onOpenCustomTrade={onOpenCustomTrade}
        onExportCsv={onExportCsv}
        onOpenEodDebrief={onOpenEodDebrief}
        onOpenBrainBackup={onOpenBrainBackup}
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

export default JournalHeroBanner;
