import { byId, setPaperStatus } from "./paper-helpers.js";
import { paperState } from "./paper-state.js";
import { renderPaperRiskPreview, syncOptionLotSize } from "./paper-risk-preview.js";
import { createPaperPosition } from "./paper-position-deploy.js";
import { handlePaperTradeAction } from "./paper-order-actions.js";
import { handlePaperTooltipFocus, handlePaperTooltipMove, handlePaperTooltipOut, handlePaperTooltipOver, hidePaperHoverToast } from "./paper-tooltips.js";
import { handlePaperAlertFilter } from "./paper-alerts-list.js";
import { loadCopilotSetupIntoForm, loadCopilotSetupIntoJournal, syncLiveDeskFromForm } from "./paper-copilot-deploy.js";
import { initDeskAiPresets } from "./paper-desk-presets.js";
import { initWeekendMarketSimulation } from "./paper-feed-mode.js";
import { renderWeeklyVisuals } from "./paper-calendar-visuals.js";
import { startLiveClock } from "./paper-market-clock.js";
import { connectPaperSse } from "./paper-sse-client.js";
import { initPaperDeckEvents } from "./paper-deck-events.js";
import { initLiveDeskButtons, loadPaperLab } from "./paper-loader.js";

export function initPaperLab() {
  const paperForm = document.getElementById("paperTradeForm");
  const paperLab = document.getElementById("paperLab");
  if (!paperForm || !paperLab) return;

  paperForm.addEventListener("input", renderPaperRiskPreview);
  paperForm.querySelector('[name="underlyingSymbol"]')?.addEventListener("change", syncOptionLotSize);
  paperForm.addEventListener("reset", () => {
    setTimeout(() => {
      syncOptionLotSize();
      renderPaperRiskPreview();
      setPaperStatus("Ready");
    }, 0);
  });
  paperForm.addEventListener("submit", createPaperPosition);
  document.getElementById("btnDeployPracticeTrade")?.addEventListener("click", (e) => {
    e.preventDefault();
    createPaperPosition(e);
  });

  document.addEventListener("click", handlePaperTradeAction);
  document.addEventListener("mouseover", handlePaperTooltipOver, { passive: true });
  document.addEventListener("mousemove", handlePaperTooltipMove, { passive: true });
  document.addEventListener("mouseout", handlePaperTooltipOut, { passive: true });
  document.addEventListener("focusin", handlePaperTooltipFocus);
  document.addEventListener("focusout", hidePaperHoverToast);
  paperLab.addEventListener("click", handlePaperAlertFilter);

  document.querySelector(".notification")?.addEventListener("click", () => {
    if (document.documentElement.dataset.activeView !== "paper") return;
    document.querySelector(".paper-alert-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  const underlyingSelect = paperForm.querySelector('[name="underlyingSymbol"]');
  try {
    const savedUnderlying = localStorage.getItem("portfoliox_pref_underlying");
    if (savedUnderlying && underlyingSelect) underlyingSelect.value = savedUnderlying;
  } catch (_) {}

  syncOptionLotSize();
  renderPaperRiskPreview();
  syncLiveDeskFromForm();
  initLiveDeskButtons();
  initDeskAiPresets();
  initWeekendMarketSimulation();

  paperForm.addEventListener("input", () => {
    syncLiveDeskFromForm();
    renderPaperRiskPreview();
  });
  paperForm.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      createPaperPosition();
    }
  });
  paperForm.querySelectorAll("input, select").forEach((el) => {
    el.addEventListener("change", () => {
      syncLiveDeskFromForm();
      renderPaperRiskPreview();
    });
  });

  document.querySelectorAll(".paper-pnl-range").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".paper-pnl-range").forEach((b) => b.classList.remove("active"));
      button.classList.add("active");
      paperState.pnlRange = button.dataset.pnlRange || "week";
      const labelMap = { week: "(This Week)", last_week: "(Last Week)", month: "(This Month)", all: "(All Time)" };
      const labelEl = byId("dailyPnlRangeLabel");
      if (labelEl) labelEl.textContent = labelMap[paperState.pnlRange] || "(This Week)";
      if (paperState.lab) renderWeeklyVisuals(paperState.lab);
    });
  });

  document.getElementById("btnDeployCopilotPractice")?.addEventListener("click", loadCopilotSetupIntoForm);
  document.getElementById("btnFastDeployLiveSignal")?.addEventListener("click", loadCopilotSetupIntoForm);
  document.getElementById("btnDeployCopilotJournal")?.addEventListener("click", loadCopilotSetupIntoJournal);

  startLiveClock();
  connectPaperSse();
  initPaperDeckEvents();

  document.addEventListener("portfoliox:view-change", (event) => {
    if (event.detail?.view === "paper") loadPaperLab();
  });

  loadPaperLab();
}
