import { clearError, fetchJson, setSync } from "./app-helpers.js";
import { state, checkBrokerStatuses } from "./app-state.js";
import { renderPortfolio } from "./app-holdings.js";
import { loadYahooQuotes } from "./app-quotes.js";
import { getSelectedRange, loadYahooChart } from "./app-chart.js";
import { loadAlphaForeignRadar } from "./app-foreign.js";
import { initCommandPalette } from "./app-command-palette.js";
import { initKeyboardShortcuts } from "./app-shortcuts.js";
import { initTooltips } from "./app-tooltip.js";
import { initEventListeners } from "./app-listeners.js";

let marketPulseTimer = null;

export function isMarketHours() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const ist = new Date(utc + (3600000 * 5.5));
  const day = ist.getDay();
  if (day === 0 || day === 6) return false;
  const mins = ist.getHours() * 60 + ist.getMinutes();
  return mins >= (9 * 60 + 15) && mins <= (15 * 60 + 30);
}

export function startMarketPulse() {
  if (marketPulseTimer) clearInterval(marketPulseTimer);
  marketPulseTimer = setInterval(async () => {
    if (document.visibilityState !== "visible") return;
    if (isMarketHours()) {
      try {
        await loadYahooQuotes(state.holdings);
      } catch { /* Silent non-fatal skip */ }
    }
  }, 8000);
}

export async function loadDashboard() {
  setSync("Syncing");
  clearError();

  loadYahooChart(getSelectedRange()).catch((e) => console.warn(e));

  try {
    const portfolio = await fetchJson("/api/portfolio");
    state.holdings = portfolio.holdings || [];
    state.margins = portfolio.margins;
    setSync("Synced");
  } catch (error) {
    state.holdings = [];
    state.margins = null;
    setSync("Broker Ready");
  }

  renderPortfolio();
  await Promise.all([loadYahooQuotes(state.holdings), loadAlphaForeignRadar()]);
}

export function initApp() {
  initCommandPalette();
  checkBrokerStatuses();
  initTooltips();
  initKeyboardShortcuts();
  initEventListeners(loadDashboard);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") loadYahooQuotes(state.holdings);
  });

  loadDashboard();
  startMarketPulse();
}
