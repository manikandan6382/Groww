import React, { useEffect, useState, Suspense, lazy } from "react";
import { CheckCircle2, ShieldCheck, X } from "lucide-react";
import { AppShell } from "./components/layout/AppShell";
import { ViewErrorBoundary } from "./components/common/ViewErrorBoundary";
import { useTradingStore } from "./stores/useTradingStore";
import { soundEngine } from "./utils/soundEngine";
import { getViewFromUrl, syncUrlWithView } from "./utils/urlRouter";
import { motion, AnimatePresence } from "framer-motion";

// 🛡️ Resilient dynamic loader that auto-recovers from stale chunks after new builds
function safeLazy(importFn) {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (error) {
      const isChunkError =
        error?.message?.includes("Failed to fetch dynamically imported module") ||
        error?.message?.includes("Importing a module script failed") ||
        error?.name === "ChunkLoadError";

      if (isChunkError && typeof window !== "undefined") {
        const reloadKey = "chunk_retry_" + window.location.pathname;
        const lastReload = sessionStorage.getItem(reloadKey);
        const now = Date.now();
        if (!lastReload || now - Number(lastReload) > 10000) {
          sessionStorage.setItem(reloadKey, String(now));
          window.location.reload();
          return new Promise(() => {});
        }
      }
      throw error;
    }
  });
}

// 🚀 Dynamic Route Code-Splitting with safeLazy
const DashboardView = safeLazy(() => import("./views/DashboardView").then((m) => ({ default: m.DashboardView })));
const LiveAlertsView = safeLazy(() => import("./views/LiveAlertsView").then((m) => ({ default: m.LiveAlertsView })));
const JournalView = safeLazy(() => import("./views/JournalView").then((m) => ({ default: m.JournalView })));
const ForeignStocksView = safeLazy(() => import("./views/ForeignStocksView").then((m) => ({ default: m.ForeignStocksView })));
const CustomTradeModal = safeLazy(() => import("./components/trading/CustomTradeModal").then((m) => ({ default: m.CustomTradeModal })));

/**
 * 🌟 Sleek Glassmorphism Route Loading Skeleton
 */
function RouteLoadingSkeleton() {
  return (
    <div className="w-full space-y-5 animate-pulse py-2" role="status" aria-label="Loading view">
      {/* Top Banner Skeleton */}
      <div className="h-20 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5" />
          <div className="space-y-1.5">
            <div className="w-36 h-4 rounded bg-white/10" />
            <div className="w-24 h-2.5 rounded bg-white/5" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-24 h-8 rounded-xl bg-white/5" />
          <div className="w-20 h-8 rounded-xl bg-white/5" />
        </div>
      </div>

      {/* Bento Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-white/[0.02] border border-white/5 p-4 space-y-2.5">
            <div className="w-20 h-3 rounded bg-white/10" />
            <div className="w-28 h-6 rounded bg-white/10" />
            <div className="w-36 h-2.5 rounded bg-white/5" />
          </div>
        ))}
      </div>

      {/* Main Panel Skeleton */}
      <div className="h-80 rounded-2xl bg-white/[0.02] border border-white/5 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-40 h-4 rounded bg-white/10" />
          <div className="w-24 h-3 rounded bg-white/5" />
        </div>
        <div className="space-y-3 pt-2">
          <div className="w-full h-10 rounded-xl bg-white/[0.03]" />
          <div className="w-full h-10 rounded-xl bg-white/[0.03]" />
          <div className="w-full h-10 rounded-xl bg-white/[0.03]" />
          <div className="w-full h-10 rounded-xl bg-white/[0.03]" />
        </div>
      </div>
    </div>
  );
}

function UndoTradeToast() {
  const undoTradeBackup = useTradingStore((s) => s.undoTradeBackup);
  const undoCountdown = useTradingStore((s) => s.undoCountdown);
  const executeUndoTrade = useTradingStore((s) => s.executeUndoTrade);

  return (
    <AnimatePresence>
      {undoTradeBackup && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-[#121424]/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.08)] flex items-center gap-3 text-xs"
        >
          <span className="text-slate-200 font-medium">
            Trade <strong className="text-white font-mono">{undoTradeBackup.symbol}</strong> deleted.
          </span>
          <button
            type="button"
            onClick={executeUndoTrade}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 active:scale-95 text-black font-extrabold font-mono transition flex items-center gap-1.5 shadow-md shadow-cyan-500/20 cursor-pointer"
          >
            <span>Undo</span>
            <span className="px-1.5 py-0.5 rounded-md bg-black/25 text-black text-[11px] font-mono font-black tabular-nums border border-black/10">
              {undoCountdown}s
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function App() {
  const activeView = useTradingStore((s) => s.activeView);
  const setActiveView = useTradingStore((s) => s.setActiveView);
  const isCustomTradeModalOpen = useTradingStore((s) => s.isCustomTradeModalOpen);
  const setCustomTradeModalOpen = useTradingStore((s) => s.setCustomTradeModalOpen);
  const setRosettaOpen = useTradingStore((s) => s.setRosettaOpen);
  const setShortcutsOpen = useTradingStore((s) => s.setShortcutsOpen);
  const setCommandPaletteOpen = useTradingStore((s) => s.setCommandPaletteOpen);
  const togglePrivacyMode = useTradingStore((s) => s.togglePrivacyMode);

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

  // 🎨 Synchronize Atmospheric Gradient Theme on Mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedTheme = localStorage.getItem("portfolio-theme") || "violet";
    document.documentElement.setAttribute("data-theme", savedTheme);
    document.documentElement.dataset.theme = savedTheme;
  }, []);

  const [brokerNotice, setBrokerNotice] = useState(null);

  // 🎯 Demat Account Connection Callback Toast & Audio Feedback
  useEffect(() => {
    if (typeof window === "undefined") return;
    const searchParams = new URLSearchParams(window.location.search);
    const connected = searchParams.get("connected");

    if (connected === "kite" || connected === "upstox") {
      const isKite = connected === "kite";
      const brokerName = isKite ? "Zerodha Kite" : "Upstox Pro";

      try {
        soundEngine.playTradeExecutedTone();
      } catch { /* ignore audio error */ }

      if (isKite) {
        useTradingStore.getState().setBrokerStatus({ kiteConnected: true });
      } else {
        useTradingStore.getState().setBrokerStatus({ upstoxConnected: true });
      }

      setBrokerNotice({
        broker: brokerName,
        message: isKite
          ? "Zerodha Kite Demat connected! Live portfolio and positions synchronized."
          : "Upstox Pro connected! Live tick stream and option contracts active.",
      });

      // Clear query param cleanly without page reload
      searchParams.delete("connected");
      searchParams.delete("broker");
      const newQuery = searchParams.toString();
      const cleanUrl = window.location.pathname + (newQuery ? `?${newQuery}` : "") + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);

      const timer = setTimeout(() => {
        setBrokerNotice(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, []);

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
        const state = useTradingStore.getState();
        if (state.undoTradeBackup) {
          e.preventDefault();
          state.executeUndoTrade();
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
  }, [setActiveView, setRosettaOpen, setShortcutsOpen, setCommandPaletteOpen, setCustomTradeModalOpen, togglePrivacyMode]);

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
      <AnimatePresence>
        {brokerNotice && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3.5 rounded-2xl bg-[#121424]/95 backdrop-blur-2xl border border-emerald-500/40 shadow-[0_12px_40px_rgba(16,185,129,0.35)] flex items-center gap-3.5 text-xs text-white"
          >
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-white flex items-center gap-2">
                <span>{brokerNotice.broker} Connected</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  LIVE DEMAT
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium">{brokerNotice.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setBrokerNotice(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
