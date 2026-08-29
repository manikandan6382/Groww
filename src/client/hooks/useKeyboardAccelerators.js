import { useEffect } from "react";
import { useTradingStore } from "../stores/useTradingStore";

export function useKeyboardAccelerators() {
  const { setActiveView, setIsShortcutsOpen, isShortcutsOpen } = useTradingStore();

  useEffect(() => {
    function handleKeyDown(e) {
      const activeTag = document.activeElement?.tagName;
      const isTyping = activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT" || document.activeElement?.isContentEditable;

      // ⌘K / Ctrl+K / '/' -> Focus Search
      if ((e.key === "/" || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) && !isTyping) {
        e.preventDefault();
        const input = document.getElementById("globalSearchInput");
        if (input) {
          input.focus();
          input.select();
        }
        return;
      }

      // '?' -> Open Shortcuts Cheat Sheet
      if (e.key === "?" && !isTyping && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsShortcutsOpen(!isShortcutsOpen);
        return;
      }

      // 'N' -> Quick Jump to Trade Logger
      if (e.key.toLowerCase() === "n" && !isTyping && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setActiveView("journal");
        setTimeout(() => {
          document.getElementById("formTradingsymbol")?.focus();
        }, 100);
        return;
      }

      // '1' - '4' -> Instant View Switching
      if (!isTyping && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === "1") { e.preventDefault(); setActiveView("dashboard"); }
        else if (e.key === "2") { e.preventDefault(); setActiveView("paper"); }
        else if (e.key === "3") { e.preventDefault(); setActiveView("journal"); }
        else if (e.key === "4") { e.preventDefault(); setActiveView("foreign"); }
      }

      // Escape -> Close Modals
      if (e.key === "Escape") {
        if (isShortcutsOpen) {
          setIsShortcutsOpen(false);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setActiveView, setIsShortcutsOpen, isShortcutsOpen]);
}
