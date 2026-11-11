import React from "react";
import { useLiveAlertsViewData } from "./useLiveAlertsViewData";
import { LiveAlertsHeroBanner } from "./LiveAlertsHeroBanner";
import { UpstoxSessionExpiryBanner } from "./UpstoxSessionExpiryBanner";
import { LiveAlertsNavDock } from "./LiveAlertsNavDock";
import { LiveScoreboardSection } from "./LiveScoreboardSection";
import { ActiveTradesSection } from "./ActiveTradesSection";
import { SquareOffAllModal } from "./SquareOffAllModal";
import { SettlementToastHud } from "./SettlementToastHud";
import { PositionDeployToastHud } from "./PositionDeployToastHud";
import { OrderPadSection } from "../../components/trading/OrderPadSection";
import { PerformanceStudioSection } from "../../components/trading/PerformanceStudioSection";
import { TriggeredHistorySection } from "../../components/trading/TriggeredHistorySection";
import { ViewErrorBoundary } from "../../components/common/ViewErrorBoundary";

export function LiveAlertsView() {
  const {
    openAlerts,
    closedAlerts,
    deployToast,
    setDeployToast,
    settlementToast,
    setSettlementToast,
    autoDeployCopilotTrade,
    showSquareOffModal,
    setShowSquareOffModal,
    activeTradesViewMode,
    setActiveTradesViewMode,
    scorecardTimeframe,
    setScorecardTimeframe,
    isScrolledDown,
    workspaceFocus,
    handleSetWorkspaceFocus,
    handleSquareOffWithToast,
    handleConfirmSquareOff,
    telemetry
  } = useLiveAlertsViewData();

  return (
    <div className="space-y-6">
      <LiveAlertsHeroBanner />
      <UpstoxSessionExpiryBanner />

      <LiveAlertsNavDock
        workspaceFocus={workspaceFocus}
        onSetWorkspaceFocus={handleSetWorkspaceFocus}
        openAlertsCount={openAlerts.length}
        closedAlertsCount={closedAlerts.length}
      />

      <LiveScoreboardSection
        telemetry={telemetry}
        scorecardTimeframe={scorecardTimeframe}
        setScorecardTimeframe={setScorecardTimeframe}
      />

      {(workspaceFocus === "all" || workspaceFocus === "cockpit") && (
        <>
          <OrderPadSection />
          <ActiveTradesSection
            openAlerts={openAlerts}
            activeTradesViewMode={activeTradesViewMode}
            setActiveTradesViewMode={setActiveTradesViewMode}
            onSquareOffAll={() => setShowSquareOffModal(true)}
            onCloseTrade={handleSquareOffWithToast}
          />
        </>
      )}

      {(workspaceFocus === "all" || workspaceFocus === "studio") && (
        <div id="performance-studio">
          <PerformanceStudioSection />
        </div>
      )}

      {(workspaceFocus === "all" || workspaceFocus === "ledger") && (
        <div id="practice-history-table">
          <ViewErrorBoundary fallbackTitle="Settled Practice History Unavailable">
            <TriggeredHistorySection />
          </ViewErrorBoundary>
        </div>
      )}

      <SquareOffAllModal
        isOpen={showSquareOffModal}
        onClose={() => setShowSquareOffModal(false)}
        onConfirm={handleConfirmSquareOff}
        openAlertsCount={openAlerts.length}
        totalOpenPnl={telemetry.totalOpenPnl}
      />

      <SettlementToastHud
        settlementToast={settlementToast}
        onDismiss={() => setSettlementToast(null)}
      />

      <PositionDeployToastHud
        deployToast={deployToast}
        onDismiss={() => setDeployToast(null)}
      />
    </div>
  );
}

export default LiveAlertsView;
