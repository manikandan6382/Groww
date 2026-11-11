import { useEffect } from "react";
import { useTradingStore } from "../stores/useTradingStore";
import { soundEngine } from "../utils/soundEngine";

export function useAppShortcuts() {
  const setActiveView = useTradingStore((s) => s.setActiveView);
  const setCustomTradeModalOpen = useTradingStore((s) => s.setCustomTradeModalOpen);
  const setRosettaOpen = useTradingStore((s) => s.setRosettaOpen);
  const setShortcutsOpen = useTradingStore((s) => s.setShortcutsOpen);
  const setCommandPaletteOpen = useTradingStore((s) => s.setCommandPaletteOpen);
  const togglePrivacyMode = useTradingStore((s) => s.togglePrivacyMode);

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

      // Ctrl+B or Cmd+B toggles Sidebar Pin (Collapse / Expand)
      if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        const state = useTradingStore.getState();
        state.toggleSidebarPin();
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
}
