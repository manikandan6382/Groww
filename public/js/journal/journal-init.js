import { escapeHtml, fetchJson, setFormStatus } from "./journal-helpers.js";
import { tradeState } from "./journal-state.js";
import { initJournalMarketClock } from "./journal-clock.js";
import { buildRangeQuery, recalculateTradePlan, setDefaultEntryTime, syncLotSizeFromSymbol, toggleCustomRangeFields } from "./journal-plan.js";
import { exportTaxAuditCsv, saveTrade } from "./journal-save.js";
import { renderTradeHistory } from "./journal-cards.js";
import { renderMasterKPIDeck } from "./journal-kpi-deck.js";
import { renderDailyStreakStrip, renderStrategyMatrix } from "./journal-matrix.js";

export function initTradingJournal(tradeForm) {
  if (!tradeForm) return;

  setDefaultEntryTime();
  recalculateTradePlan();
  initJournalMarketClock();

  tradeForm.addEventListener("input", recalculateTradePlan);
  tradeForm.addEventListener("reset", () => {
    setTimeout(() => {
      setDefaultEntryTime();
      recalculateTradePlan();
      setFormStatus("Ready");
    }, 0);
  });
  tradeForm.addEventListener("submit", (e) => saveTrade(e, tradeForm, loadTradingJournal));

  document.querySelectorAll(".journal-range").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".journal-range").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      tradeState.range = button.dataset.tradeRange;
      toggleCustomRangeFields();
      loadTradingJournal();
    });
  });

  document.querySelectorAll("[data-history-filter]").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("[data-history-filter]").forEach((item) => item.classList.remove("active"));
      chip.classList.add("active");
      tradeState.historyFilter = chip.dataset.historyFilter;
      renderTradeHistory(tradeState.trades);
    });
  });

  document.getElementById("btnToggleLogForm")?.addEventListener("click", () => {
    tradeForm.scrollIntoView({ behavior: "smooth", block: "center" });
    document.getElementById("formSymbol")?.focus();
  });

  document.getElementById("btnExportTaxCsv")?.addEventListener("click", exportTaxAuditCsv);

  const btnFillLtp = document.getElementById("btnFillLiveLtp");
  if (btnFillLtp) {
    btnFillLtp.addEventListener("click", async () => {
      const symInput = document.getElementById("formSymbol");
      const entryPriceInput = document.getElementById("formEntryPrice");
      if (!entryPriceInput) return;
      const rawSymbol = symInput?.value?.trim() || "NIFTY 50";
      btnFillLtp.textContent = "⏳...";
      btnFillLtp.disabled = true;
      try {
        const data = await fetchJson(`/api/quotes?symbols=${encodeURIComponent(rawSymbol)}`);
        const item = data.items?.[0];
        const price = item?.regularMarketPrice || item?.last_price || (rawSymbol.toUpperCase().includes("NIFTY") ? 24334.55 : 150.0);
        entryPriceInput.value = Number(price).toFixed(2);
        recalculateTradePlan();
        btnFillLtp.textContent = "✅ Filled";
        setTimeout(() => { btnFillLtp.textContent = "⚡ Fill LTP"; btnFillLtp.disabled = false; }, 1200);
      } catch {
        btnFillLtp.textContent = "⚡ Fill LTP";
        btnFillLtp.disabled = false;
      }
    });
  }

  document.getElementById("formSymbol")?.addEventListener("input", (e) => {
    syncLotSizeFromSymbol(e.target.value);
    recalculateTradePlan();
  });

  document.getElementById("btnPresetNifty")?.addEventListener("click", () => {
    const symInput = document.getElementById("formSymbol");
    const lotInput = document.getElementById("formLotSize");
    if (symInput) symInput.value = "NIFTY 24300 PE";
    if (lotInput) lotInput.value = "65";
    recalculateTradePlan();
    setFormStatus("NIFTY PE Loaded");
  });

  document.getElementById("btnPresetNiftyCe")?.addEventListener("click", () => {
    const symInput = document.getElementById("formSymbol");
    const lotInput = document.getElementById("formLotSize");
    if (symInput) symInput.value = "NIFTY 24300 CE";
    if (lotInput) lotInput.value = "65";
    recalculateTradePlan();
    setFormStatus("NIFTY CE Loaded");
  });

  ["tradeRangeFrom", "tradeRangeTo"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", () => {
      tradeState.range = "custom";
      document.querySelectorAll(".journal-range").forEach((item) => item.classList.toggle("active", item.dataset.tradeRange === "custom"));
      toggleCustomRangeFields();
      loadTradingJournal();
    });
  });
  toggleCustomRangeFields();
}

export async function loadTradingJournal() {
  const tradeForm = document.getElementById("tradeForm");
  if (!tradeForm) return;
  try {
    if (!tradeState.bootstrapped) await loadBootstrap();
    const query = buildRangeQuery();
    const [tradesRes, analyticsRes] = await Promise.all([
      fetchJson(`/api/trades${query}`),
      fetchJson(`/api/trading/analytics${query}`),
    ]);
    tradeState.trades = tradesRes.items || [];
    tradeState.analytics = analyticsRes.analytics;
    renderMasterKPIDeck(tradeState.trades, tradeState.analytics);
    renderDailyStreakStrip(tradeState.trades);
    renderStrategyMatrix(tradeState.trades);
    renderTradeHistory(tradeState.trades);
    setFormStatus("Ready");
  } catch (error) {
    setFormStatus(error.message, true);
  }
}

async function loadBootstrap() {
  try {
    const data = await fetchJson("/api/trading/bootstrap");
    const renderDl = (id, vals) => { const el = document.getElementById(id); if (el) el.innerHTML = (vals || []).map((v) => `<option value="${escapeHtml(v)}"></option>`).join(""); };
    renderDl("strategyTagOptions", data.strategyTags);
    renderDl("mistakeTagOptions", data.mistakeTags);
    tradeState.bootstrapped = true;
  } catch { /* ignore */ }
}
