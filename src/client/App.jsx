import React, { useEffect } from "react";
import { AppShell } from "./components/layout/AppShell";
import { ViewErrorBoundary } from "./components/common/ViewErrorBoundary";
import { LiveAlertsView } from "./views/LiveAlertsView";
import { DashboardView } from "./views/DashboardView";
import { JournalView } from "./views/JournalView";
import { ForeignStocksView } from "./views/ForeignStocksView";
import { CustomTradeModal } from "./components/trading/CustomTradeModal";
import { useTradingStore } from "./stores/useTradingStore";
import { soundEngine } from "./utils/soundEngine";
import { getViewFromUrl, syncUrlWithView } from "./utils/urlRouter";
import { motion, AnimatePresence } from "framer-motion";

export function App() {
  const { 
    activeView, 
    setActiveView, 
    isCustomTradeModalOpen, 
    setCustomTradeModalOpen,
    setRosettaOpen,
    setShortcutsOpen,
    setCommandPaletteOpen,
    undoTradeBackup,
    undoCountdown,
    executeUndoTrade,
    togglePrivacyMode 
  } = useTradingStore();

  // 🌐 Bi-directional URL synchronization & Browser Back/Forward navigation
  useEffect(() => {
    // Initial URL sync
    const initialView = getViewFromUrl();
    setActiveView(initialView, false);
    syncUrlWithView(initialView, true);

    // Handle Browser Back / Forward buttons
    const handlePopState = () => {
      const targetView = getViewFromUrl();
      setActiveView(targetView, false);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [setActiveView]);

  // ⌨️ Pro-Trader Keyboard Shortcuts Engine
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInput = activeTag === "input" || activeTag === "textarea" || document.activeElement?.isContentEditable;

      // Escape always closes any open drawer / modal regardless of active element
      if (e.key === "Escape") {
        setRosettaOpen(false);
        setShortcutsOpen(false);
        setCommandPaletteOpen(false);
        setCustomTradeModalOpen(false);
        return;
      }

      // Ctrl+Z or Cmd+Z triggers instant Undo if a deleted trade backup is active
      if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
        if (undoTradeBackup) {
          e.preventDefault();
          executeUndoTrade();
          soundEngine.playSuccessTone();
        }
        return;
      }

      // Ctrl+H or Cmd+H toggles Streamer Privacy Mode
      if ((e.ctrlKey || e.metaKey) && (e.key === "h" || e.key === "H")) {
        e.preventDefault();
        togglePrivacyMode();
        soundEngine.playTabSwitchTone();
        return;
      }

      // When typing inside inputs or search boxes, don't trigger single-letter hotkeys
      if (isInput || e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        soundEngine.playTabSwitchTone();
        setActiveView("journal");
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        soundEngine.playTabSwitchTone();
        setActiveView("paper");
      } else if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        soundEngine.playTabSwitchTone();
        setActiveView("dashboard");
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        soundEngine.playTabSwitchTone();
        setActiveView("foreign");
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        soundEngine.playTabSwitchTone();
        setCustomTradeModalOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setActiveView, setRosettaOpen, setShortcutsOpen, setCommandPaletteOpen, setCustomTradeModalOpen, undoTradeBackup, executeUndoTrade]);

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

      {/* Global Custom Trade Logger Modal */}
      <CustomTradeModal 
        isOpen={isCustomTradeModalOpen} 
        onClose={() => setCustomTradeModalOpen(false)} 
      />

      {/* 🌟 Cross-Route Global Undo Toast */}
      <AnimatePresence>
        {undoTradeBackup && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-[#060e1d]/95 backdrop-blur-2xl border border-cyan-500/30 shadow-[0_10px_35px_rgba(6,182,212,0.3)] flex items-center gap-3 text-xs"
          >
            <span className="text-slate-200 font-medium">
              Trade <strong className="text-white font-mono">{undoTradeBackup.symbol}</strong> deleted.
            </span>
            <button
              type="button"
              onClick={executeUndoTrade}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 active:scale-95 text-black font-extrabold font-mono transition flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
            >
              <span>Undo</span>
              <span className="px-1.5 py-0.5 rounded-md bg-black/25 text-black text-[11px] font-mono font-black tabular-nums border border-black/10">
                {undoCountdown}s
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
