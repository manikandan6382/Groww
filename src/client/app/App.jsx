import React, { Suspense } from "react";
import { motion } from "framer-motion";
import { AppShell } from "../components/layout/AppShell";
import { ViewErrorBoundary } from "../components/common/ViewErrorBoundary";
import { useTradingStore } from "../stores/useTradingStore";
import { safeLazy } from "./safeLazy";
import { RouteLoadingSkeleton } from "./RouteLoadingSkeleton";
import { UndoTradeToast } from "./UndoTradeToast";
import { BrokerNoticeToast } from "./BrokerNoticeToast";
import { useAppShortcuts } from "./useAppShortcuts";
import { useAppBootstrap } from "./useAppBootstrap";

// 🚀 Dynamic Route Code-Splitting with safeLazy
const DashboardView = safeLazy(() => import("../views/DashboardView").then((m) => ({ default: m.DashboardView })));
const LiveAlertsView = safeLazy(() => import("../views/LiveAlertsView").then((m) => ({ default: m.LiveAlertsView })));
const JournalView = safeLazy(() => import("../views/JournalView").then((m) => ({ default: m.JournalView })));
const ForeignStocksView = safeLazy(() => import("../views/ForeignStocksView").then((m) => ({ default: m.ForeignStocksView })));
const CustomTradeModal = safeLazy(() => import("../components/trading/CustomTradeModal").then((m) => ({ default: m.CustomTradeModal })));

export function App() {
  const activeView = useTradingStore((s) => s.activeView);
  const isCustomTradeModalOpen = useTradingStore((s) => s.isCustomTradeModalOpen);
  const setCustomTradeModalOpen = useTradingStore((s) => s.setCustomTradeModalOpen);

  const [brokerNotice, setBrokerNotice] = useAppBootstrap();
  useAppShortcuts();

  function renderView() {
    switch (activeView) {
      case "dashboard":
        return <DashboardView />;
      case "paper":
        return <LiveAlertsView />;
      case "journal":
        return <JournalView />;
      case "foreign":
        return <ForeignStocksView />;
      default:
        return <DashboardView />;
    }
  }

  return (
    <AppShell>
      <ViewErrorBoundary fallbackTitle="View Temporarily Unavailable">
        <motion.div
          key={activeView}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="w-full"
        >
          <Suspense fallback={<RouteLoadingSkeleton />}>
            {renderView()}
          </Suspense>
        </motion.div>
      </ViewErrorBoundary>

      {/* Global Custom Trade Logger Modal (Code-Split on Demand) */}
      {isCustomTradeModalOpen && (
        <Suspense fallback={null}>
          <CustomTradeModal 
            isOpen={isCustomTradeModalOpen} 
            onClose={() => setCustomTradeModalOpen(false)} 
          />
        </Suspense>
      )}

      {/* 🌟 Cross-Route Global Undo Toast */}
      <UndoTradeToast />

      {/* 🚀 Cross-Route Demat Connection Toast */}
      <BrokerNoticeToast 
        brokerNotice={brokerNotice} 
        onClose={() => setBrokerNotice(null)} 
      />
    </AppShell>
  );
}

export default App;
