import { showDeskToast } from "./paper-audio-fx.js";
import { paperState } from "./paper-state.js";
import { exportClosedTradesToCsv, renderClosedPaperTrades } from "./paper-closed-trades.js";
import { squareOffAllTrades } from "./paper-open-trades.js";

export function initPaperDeckEvents() {
  if (window._paperDeckEventsAttached) return;
  window._paperDeckEventsAttached = true;

  document.addEventListener("click", (e) => {
    const card = e.target.closest("[data-drilldown-id]");
    if (!card) return;
    const tradeId = card.getAttribute("data-drilldown-id");
    if (!tradeId) return;
    
    const storyTarget = document.getElementById(`story-${tradeId}`) || document.querySelector(`[data-trade-id="${tradeId}"]`) || document.querySelector(`[data-paper-trade-row="${tradeId}"]`);
    if (storyTarget) {
      storyTarget.scrollIntoView({ behavior: "smooth", block: "center" });
      storyTarget.classList.add("highlight-pulse-gold");
      setTimeout(() => storyTarget.classList.remove("highlight-pulse-gold"), 2500);
      showDeskToast("Audit Drilldown", `Navigated to Trade Story #${tradeId}.`, "🔍");
    } else {
      const storiesSec = document.getElementById("paperTradeStoriesList") || document.getElementById("paperClosedTrades");
      if (storiesSec) {
        storiesSec.scrollIntoView({ behavior: "smooth", block: "start" });
        showDeskToast("Audit Ledger", `Inspecting Trade History for #${tradeId}.`, "📖");
      }
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      const card = document.activeElement?.closest("[data-drilldown-id]");
      if (card) {
        e.preventDefault();
        card.click();
        return;
      }
    }

    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === "1") document.querySelector('.paper-pnl-range[data-pnl-range="week"]')?.click();
    else if (e.key === "2") document.querySelector('.paper-pnl-range[data-pnl-range="last_week"]')?.click();
    else if (e.key === "3") document.querySelector('.paper-pnl-range[data-pnl-range="month"]')?.click();
    else if (e.key === "4") document.querySelector('.paper-pnl-range[data-pnl-range="all"]')?.click();
    else if (e.key === "b" || e.key === "B") {
      const best = document.querySelector(".pro-edge-card.best");
      if (best) { best.scrollIntoView({ behavior: "smooth", block: "center" }); best.focus(); }
    } else if (e.key === "w" || e.key === "W") {
      const worst = document.querySelector(".pro-edge-card.worst");
      if (worst) { worst.scrollIntoView({ behavior: "smooth", block: "center" }); worst.focus(); }
    } else if (e.key === "?" || e.key === "/") {
      showDeskToast("⚡ Pro Keyboard Shortcuts", "1-4: Switch Timeline Range | B: Jump to Best Alert | W: Jump to Worst Alert", "⌨️");
    }
  });

  document.addEventListener("click", (e) => {
    const filterBtn = e.target.closest(".ledger-filter-btn");
    if (filterBtn) {
      document.querySelectorAll(".ledger-filter-btn").forEach((b) => b.classList.remove("active"));
      filterBtn.classList.add("active");
      paperState.ledgerFilter = filterBtn.getAttribute("data-ledger-filter") || "all";
      renderClosedPaperTrades(paperState.lab?.closedTrades || []);
      return;
    }
    if (e.target.closest("#btnExportLedgerCsv")) {
      exportClosedTradesToCsv();
      return;
    }
    if (e.target.closest("#btnSquareOffAll")) {
      squareOffAllTrades();
    }
  });
}
