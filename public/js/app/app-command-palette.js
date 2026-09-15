import { byId } from "./app-helpers.js";
import { executeCommandAction } from "./app-command-actions.js";

export function initCommandPalette() {
  const dialog = byId("commandPalette");
  const trigger = byId("globalCommandTrigger");
  const input = byId("paletteInput");
  const results = byId("paletteResults");
  if (!dialog || !input) return;

  const openPalette = () => {
    try {
      dialog.showModal();
      input.value = "";
      filterPaletteItems("");
      input.focus();
    } catch {
      dialog.setAttribute("open", "");
    }
  };

  const closePalette = () => {
    try {
      dialog.close();
    } catch {
      dialog.removeAttribute("open");
    }
  };

  trigger?.addEventListener("click", (e) => {
    e.preventDefault();
    openPalette();
  });

  window.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (dialog.open) closePalette();
      else openPalette();
    } else if (e.key === "Escape" && dialog.open) {
      closePalette();
    } else if (e.altKey && (e.key.toLowerCase() === "l" || e.key.toLowerCase() === "j")) {
      e.preventDefault();
      executeCommandAction("quick-log-journal-trade");
    } else if (e.altKey && e.key.toLowerCase() === "d") {
      e.preventDefault();
      executeCommandAction("nav-dashboard");
    } else if (e.altKey && e.key.toLowerCase() === "p") {
      e.preventDefault();
      executeCommandAction("nav-paper");
    }
  });

  input.addEventListener("input", (e) => {
    filterPaletteItems(e.target.value.toLowerCase().trim());
  });

  results?.addEventListener("click", (e) => {
    const item = e.target.closest(".palette-item");
    if (!item) return;
    executeCommandAction(item.dataset.action);
    closePalette();
  });

  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) closePalette();
  });
}

export function filterPaletteItems(query) {
  const items = document.querySelectorAll(".palette-item");
  const groups = document.querySelectorAll(".palette-group");

  items.forEach((item) => {
    const text = item.textContent.toLowerCase();
    const match = !query || text.includes(query);
    item.style.display = match ? "flex" : "none";
  });

  groups.forEach((group) => {
    const visibleChildren = group.querySelectorAll('.palette-item:not([style*="display: none"])');
    group.style.display = visibleChildren.length ? "block" : "none";
  });
}
