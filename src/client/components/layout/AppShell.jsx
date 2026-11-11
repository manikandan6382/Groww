import React from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MarketIndicesStrip } from "./MarketIndicesStrip";
import { RosettaDrawer } from "./RosettaDrawer";
import { MobileBottomBar } from "./MobileBottomBar";
import { ShortcutsModal } from "../common/ShortcutsModal";
import { CommandPaletteModal } from "../common/CommandPaletteModal";
import { SafetyGuardModal } from "../common/SafetyGuardModal";
import { EmergencyPanicHud } from "../trading/EmergencyPanicHud";
import { ViewErrorBoundary } from "../common/ViewErrorBoundary";
import { MobileQuickHubSheet } from "./MobileQuickHubSheet";
import { useKeyboardAccelerators } from "../../hooks/useKeyboardAccelerators";
import { useLiveAlertsFeed } from "../../hooks/useLiveAlertsFeed";

export function AppShell({ children }) {
  // Activate global keyboard accelerators and live SSE feed
  useKeyboardAccelerators();
  useLiveAlertsFeed();

  return (
    <div className="apple-spatial-shell flex min-h-screen text-slate-100 selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* Desktop Sidebar (hidden on mobile) */}
      <Sidebar />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <MarketIndicesStrip />
        <RosettaDrawer />
        <main className="flex-1 p-3 sm:p-4 md:p-6 max-w-7xl mx-auto w-full pb-[calc(84px+env(safe-area-inset-bottom,0px))] md:pb-6">
          {children}
        </main>
      </div>

      {/* Floating Apple Frosted Bottom Tab Bar (Mobile/Tablet only) */}
      <MobileBottomBar />

      {/* Native Apple iOS Mobile Quick Hub & Control Center Sheet */}
      <MobileQuickHubSheet />

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal />

      {/* Global Command Palette Modal (Cmd+K / Ctrl+K) */}
      <CommandPaletteModal />

      {/* Daily Safety Guardrail Modal */}
      <SafetyGuardModal />

      {/* Persistent Emergency Panic Kill Switch HUD */}
      <ViewErrorBoundary fallbackTitle="Emergency Panic HUD">
        <EmergencyPanicHud />
      </ViewErrorBoundary>
    </div>
  );
}
