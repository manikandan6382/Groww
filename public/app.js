import { initApp, loadDashboard } from "./js/app/app-init.js";
import { addWatchSymbol, removeWatchSymbol } from "./js/app/app-watchlist.js";
import { setTheme } from "./js/app/app-theme.js";
import { state } from "./js/app/app-state.js";
import { loadYahooQuotes } from "./js/app/app-quotes.js";

// Global exports for inline HTML onclick handlers & cross-script access
window.addWatchSymbol = (symbol) => {
  addWatchSymbol(symbol);
  loadYahooQuotes(state.holdings);
};
window.removeWatchSymbol = (symbol) => {
  removeWatchSymbol(symbol);
  loadYahooQuotes(state.holdings);
};
window.loadDashboard = loadDashboard;
window.setTheme = setTheme;

// Bootstrap dashboard on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
