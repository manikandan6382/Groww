import { byId } from "./app-helpers.js";

export function initKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    const activeTag = document.activeElement?.tagName;
    const isTyping = activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT" || document.activeElement?.isContentEditable;

    if ((e.key === "/" || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) && !isTyping) {
      e.preventDefault();
      const input = byId("stockSearchInput");
      if (input) {
        input.focus();
        input.select();
      }
      return;
    }

    if (e.key.toLowerCase() === "n" && !isTyping && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      window.setActiveView?.("journal");
      setTimeout(() => {
        const form = byId("tradeForm");
        if (form) {
          form.scrollIntoView({ behavior: "smooth", block: "center" });
          const symInput = byId("formSymbol");
          if (symInput) symInput.focus();
        }
      }, 50);
      return;
    }

    if (e.key === "?" && !isTyping && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const modal = document.getElementById("shortcutsModal");
      if (modal) {
        if (modal.open) modal.close();
        else modal.showModal();
      }
      return;
    }

    if (!isTyping && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (e.key === "1") { e.preventDefault(); window.setActiveView?.("dashboard"); }
      else if (e.key === "2") { e.preventDefault(); window.setActiveView?.("paper"); }
      else if (e.key === "3") { e.preventDefault(); window.setActiveView?.("journal"); }
      else if (e.key === "4") { e.preventDefault(); window.setActiveView?.("foreign"); }
    }

    if (e.key === "Escape") {
      const shortcutsModal = document.getElementById("shortcutsModal");
      if (shortcutsModal && shortcutsModal.open) {
        shortcutsModal.close();
        return;
      }
      if (document.activeElement?.id === "stockSearchInput") {
        document.activeElement.blur();
        const sugg = byId("stockSuggestions");
        if (sugg) sugg.hidden = true;
      }
    }
  });

  const shortcutsModal = document.getElementById("shortcutsModal");
  if (shortcutsModal) {
    document.getElementById("btnCloseShortcutsModal")?.addEventListener("click", () => shortcutsModal.close());
    shortcutsModal.addEventListener("click", (e) => {
      if (e.target === shortcutsModal) shortcutsModal.close();
    });
  }
}
