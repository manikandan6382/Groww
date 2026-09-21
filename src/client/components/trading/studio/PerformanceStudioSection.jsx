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
        currentDatasetLabel={data.currentDataset?.label}
        paperPnlRange={data.paperPnlRange}
        totalRealizedPnl={data.totalRealizedPnl}
        winRate={data.winRate}
        winCount={data.winCount}
        lossCount={data.lossCount}
        totalTradesCount={data.totalTradesCount}
        profitFactor={data.profitFactor}
        expectancyStr={data.expectancyStr}
        totalFriction={data.totalFriction}
        frictionDragPct={data.frictionDragPct}
        disciplineTaxRupees={data.disciplineTaxRupees}
        rawStrategyAlphaRupees={data.rawStrategyAlphaRupees}
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
        matrixTotalCount={data.matrixTotalCount}
        matrixWinsCount={data.matrixWinsCount}
        matrixLossesCount={data.matrixLossesCount}
        currentDatasetLabel={data.currentDataset?.label}
        paperPnlRange={data.paperPnlRange}
        matrixWinRate={data.matrixWinRate}
        isMatrixPureWins={data.isMatrixPureWins}
        matrixProfitFactor={data.matrixProfitFactor}
        avgRRValue={data.avgRRValue}
        avgRealizedR={data.avgRealizedR}
        quantExpectancy={data.quantExpectancy}
        expectancyStr={data.expectancyStr}
        rBuckets={data.rBuckets}
        maxDrawdownRupees={data.maxDrawdownRupees}
        quarterKellyPct={data.quarterKellyPct}
        recommendedRiskRupees={data.recommendedRiskRupees}
        matrixBestStreak={data.matrixBestStreak}
      />

      <PostMortemAlphaReview
        postMortemRange={data.postMortemRange}
        setPostMortemRange={data.setPostMortemRange}
        pmCustomStart={data.pmCustomStart}
        pmCustomEnd={data.pmCustomEnd}
        setPmCalendarOpen={data.setPmCalendarOpen}
        bestAlert={data.bestAlert}
        worstAlert={data.worstAlert}
        onPromoteToJournal={data.handlePromoteToJournal}
        promotedTradeIds={data.promotedTradeIds}
        promoteSuccessToast={data.promoteSuccessToast}
        soundEngine={data.soundEngine}
      />

      <GraduationGateCard
        practiceCompleted={data.practiceCompleted}
        distinctSessionsCount={data.distinctSessionsCount}
        sessionsTarget={data.sessionsTarget}
        gateProfitFactor={data.gateProfitFactor}
        isPureWins={data.isPureWins}
        gateDisciplinePct={data.gateDisciplinePct}
        sampleSizeProgress={data.sampleSizeProgress}
        profitFactor={data.profitFactor}
        totalFriction={data.totalFriction}
        frictionDragPct={data.frictionDragPct}
        expectancyPerTrade={data.expectancyPerTrade}
        consistencyScorePct={data.consistencyScorePct}
        isConsistencyPassed={data.isConsistencyPassed}
        syntheticSlippageTotal={data.syntheticSlippageTotal}
        stressedProfitFactor={data.stressedProfitFactor}
        stressedExpectancy={data.stressedExpectancy}
        isSlippageImmune={data.isSlippageImmune}
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
