import React from "react";
import { LuxuryDateRangePicker } from "../../common/LuxuryDateRangePicker";
import { usePerformanceStudioData } from "./usePerformanceStudioData";
import { StudioHeaderTelemetry } from "./StudioHeaderTelemetry";
import { SessionCardsDeck } from "./SessionCardsDeck";
import { SessionDeepAuditDrawer } from "./SessionDeepAuditDrawer";
import { DisciplineExpectancyMatrix } from "./DisciplineExpectancyMatrix";
import { PostMortemAlphaReview } from "./PostMortemAlphaReview";
import { GraduationGateCard } from "./GraduationGateCard";

export const PerformanceStudioSection = React.memo(function PerformanceStudioSection({
  paperTrades = [],
  trades = [],
}) {
  const data = usePerformanceStudioData({ paperTrades, trades });

  return (
    <div className="space-y-6">
      <StudioHeaderTelemetry
        paperTradesCount={data.paperTradesCount}
        selectedDay={data.selectedDay}
        winRatePercent={data.winRatePercent}
        profitFactor={data.profitFactor}
        isPureWins={data.isPureWins}
        soundEngine={data.soundEngine}
      />

      <SessionCardsDeck
        currentDataset={data.currentDataset}
        selectedDayIndex={data.selectedDayIndex}
        setSelectedDayIndex={data.setSelectedDayIndex}
        paperPnlRange={data.paperPnlRange}
        setPaperPnlRange={data.setPaperPnlRange}
        customStart={data.customStart}
        customEnd={data.customEnd}
        onOpenCalendar={() => data.setCalendarOpen(true)}
        soundEngine={data.soundEngine}
      />

      <SessionDeepAuditDrawer
        selectedDay={data.selectedDay}
        activeTab={data.activeTab}
        setActiveTab={data.setActiveTab}
        drawerFilter={data.drawerFilter}
        setDrawerFilter={data.setDrawerFilter}
        soundEngine={data.soundEngine}
      />

      <DisciplineExpectancyMatrix
        matrixStrategy={data.matrixStrategy}
        setMatrixStrategy={data.setMatrixStrategy}
        matrixTimeframe={data.matrixTimeframe}
        setMatrixTimeframe={data.setMatrixTimeframe}
        matrixTradesCount={data.matrixTradesCount}
        matrixGrossWins={data.matrixGrossWins}
        matrixGrossLosses={data.matrixGrossLosses}
        matrixProfitFactor={data.matrixProfitFactor}
        isMatrixPureWins={data.isMatrixPureWins}
        avgRRValue={data.avgRRValue}
        calculatedRRs={data.calculatedRRs}
        matrixBestStreak={data.matrixBestStreak}
        soundEngine={data.soundEngine}
      />

      <PostMortemAlphaReview
        postMortemRange={data.postMortemRange}
        setPostMortemRange={data.setPostMortemRange}
        pmCustomStart={data.pmCustomStart}
        pmCustomEnd={data.pmCustomEnd}
        setPmCalendarOpen={data.setPmCalendarOpen}
        bestAlert={data.bestAlert}
        worstAlert={data.worstAlert}
        soundEngine={data.soundEngine}
      />

      <GraduationGateCard
        practiceCompleted={data.practiceCompleted}
        gateProfitFactor={data.gateProfitFactor}
        isPureWins={data.isPureWins}
        gateDisciplinePct={data.gateDisciplinePct}
        sampleSizeProgress={data.sampleSizeProgress}
        profitFactor={data.profitFactor}
      />

      <LuxuryDateRangePicker
        isOpen={data.isCalendarOpen}
        onClose={() => data.setCalendarOpen(false)}
        startDate={data.customStart}
        endDate={data.customEnd}
        onApplyRange={(start, end) => {
          data.setCustomStart(start);
          data.setCustomEnd(end);
          data.setPaperPnlRange("custom");
          data.setSelectedDayIndex(0);
        }}
      />

      <LuxuryDateRangePicker
        isOpen={data.pmCalendarOpen}
        onClose={() => data.setPmCalendarOpen(false)}
        startDate={data.pmCustomStart}
        endDate={data.pmCustomEnd}
        onApplyRange={(start, end) => {
          data.setPmCustomStart(start);
          data.setPmCustomEnd(end);
          data.setPostMortemRange("custom");
        }}
      />
    </div>
  );
});

export default PerformanceStudioSection;
