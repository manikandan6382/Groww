import React, { useEffect } from "react";
import { AppShell } from "./components/layout/AppShell";
import { ViewErrorBoundary } from "./components/common/ViewErrorBoundary";
import { LiveAlertsView } from "./views/LiveAlertsView";
import { DashboardView } from "./views/DashboardView";
import { JournalView } from "./views/JournalView";
import { ForeignStocksView } from "./views/ForeignStocksView";
import { useTradingStore } from "./stores/useTradingStore";
import { getViewFromUrl, syncUrlWithView } from "./utils/urlRouter";
import { motion, AnimatePresence } from "framer-motion";

export function App() {
  const { activeView, setActiveView } = useTradingStore();

  // 🌐 Bi-directional URL synchronization & Browser Back/Forward navigation
  useEffect(() => {
    // Initial URL sync
    const initialView = getViewFromUrl();
    syncUrlWithView(initialView, true);

    // Handle Browser Back / Forward buttons
    const handlePopState = () => {
      const targetView = getViewFromUrl();
      setActiveView(targetView, false);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [setActiveView]);

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
          {renderView()}
        </motion.div>
      </ViewErrorBoundary>
    </AppShell>
  );
}
