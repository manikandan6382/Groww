import { byId } from "./app-helpers.js";
import { state } from "./app-state.js";
import { renderFilteredHoldings } from "./app-holdings.js";
import { renderStockSuggestions, searchStocks } from "./app-search.js";
import { addWatchSymbol, removeWatchSymbol, renderWatchlist } from "./app-watchlist.js";
import { loadYahooQuotes } from "./app-quotes.js";
import { loadYahooChart } from "./app-chart.js";
import { saveCustomThemeFromInputs, setTheme, toggleCustomThemePanel } from "./app-theme.js";
import { fillTradeFromWatch } from "./app-trade-fill.js";

let stockSearchTimer = null;

export function initEventListeners(loadDashboard) {
  document.getElementById("refreshBtn")?.addEventListener("click", () => loadDashboard());
  document.getElementById("searchInput")?.addEventListener("input", renderFilteredHoldings);
  document.getElementById("holdingsFilterGroup")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-filter]");
    if (!btn) return;
    document.querySelectorAll("#holdingsFilterGroup button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.holdingsFilter = btn.dataset.filter;
    renderFilteredHoldings();
  });

  document.getElementById("stockSearchInput")?.addEventListener("input", (e) => {
    clearTimeout(stockSearchTimer);
    stockSearchTimer = setTimeout(() => searchStocks(e.target.value), 220);
  });

  document.getElementById("clearStockSearch")?.addEventListener("click", () => {
    const input = byId("stockSearchInput");
    if (input) input.value = "";
    renderStockSuggestions([]);
  });

  document.getElementById("stockSuggestions")?.addEventListener("click", (e) => {
    const button = e.target.closest("[data-watch-symbol]");
    if (button) {
      addWatchSymbol(button.dataset.watchSymbol);
      loadYahooQuotes(state.holdings);
    }
  });

  document.getElementById("quickPresetChips")?.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-add-quick]");
    if (chip) {
      addWatchSymbol(chip.dataset.addQuick);
      loadYahooQuotes(state.holdings);
    }
  });

  document.getElementById("watchlistFilterGroup")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-watch-filter]");
    if (!btn) return;
    document.querySelectorAll("#watchlistFilterGroup button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.watchlistFilter = btn.dataset.watchFilter;
    if (state.watchlistQuoteItems?.length) renderWatchlist(state.watchlistQuoteItems);
  });

  initWatchlistClicks();
  initThemeControls();
  initRangeTabs();
  initRosettaGuide();
}

function initWatchlistClicks() {
  document.getElementById("watchlist")?.addEventListener("click", (event) => {
    const removeBtn = event.target.closest("[data-remove-symbol]");
    if (removeBtn) {
      removeWatchSymbol(removeBtn.dataset.removeSymbol);
      loadYahooQuotes(state.holdings);
      return;
    }
    const chartBtn = event.target.closest("[data-chart-sync]");
    if (chartBtn) {
      const heroChart = document.querySelector(".portfolio-hero");
      heroChart?.scrollIntoView({ behavior: "smooth", block: "center" });
      const symbolPill = document.querySelector(".tv-symbol-pill");
      if (symbolPill) symbolPill.textContent = chartBtn.dataset.chartSync;
      return;
    }
    const tradeBtn = event.target.closest("[data-trade-fill]");
    if (tradeBtn) fillTradeFromWatch(tradeBtn.dataset.tradeFill, Number(tradeBtn.dataset.ltp || 1000));
  });
}

function initThemeControls() {
  document.querySelectorAll(".theme-option").forEach((b) => b.addEventListener("click", () => setTheme(b.dataset.theme)));
  document.getElementById("customThemeBtn")?.addEventListener("click", () => toggleCustomThemePanel());
  document.getElementById("saveCustomTheme")?.addEventListener("click", () => {
    saveCustomThemeFromInputs();
    setTheme("custom");
    toggleCustomThemePanel(false);
  });
  ["customAccentColor", "customBgColor", "customPanelColor"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", () => {
      saveCustomThemeFromInputs();
      setTheme("custom");
    });
  });
  document.addEventListener("click", (event) => {
    const panel = byId("customThemePanel");
    const switcher = document.querySelector(".theme-switcher");
    if (panel && !panel.hidden && switcher && !switcher.contains(event.target)) toggleCustomThemePanel(false);
  });
}

function initRangeTabs() {
  document.querySelectorAll(".range-tabs button").forEach((button) => {
    button.addEventListener("click", async () => {
      document.querySelectorAll(".range-tabs button").forEach((item) => item.classList.remove("selected"));
      button.classList.add("selected");
      await loadYahooChart(button.dataset.range);
    });
  });
}

function initRosettaGuide() {
  const btnToggle = document.getElementById("btnToggleBeginnerGuide");
  const btnClose = document.getElementById("btnCloseRosetta");
  const drawer = document.getElementById("beginnerRosettaStone");
  btnToggle?.addEventListener("click", () => {
    if (!drawer) return;
    drawer.hidden = !drawer.hidden;
    if (!drawer.hidden) drawer.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  btnClose?.addEventListener("click", () => { if (drawer) drawer.hidden = true; });
}
