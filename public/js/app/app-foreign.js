import { byId, fetchJson, signedPct, usd } from "./app-helpers.js";
import { state } from "./app-state.js";

export async function loadAlphaForeignRadar() {
  try {
    const data = await fetchJson("/api/alpha/foreign-quotes");
    state.foreignResults = data.items || [];
    renderForeignRadar(data);
  } catch (error) {
    state.foreignResults = [];
    renderForeignRadar({
      configured: true,
      items: [],
      message: `Alpha Vantage unavailable right now: ${error.message}`
    });
  }
}

export function renderForeignRadar(data) {
  const items = data.items || [];
  const listEl = byId("foreignList");
  if (listEl) {
    listEl.innerHTML = items.length
      ? items.map((item) => `
        <div class="foreign-row">
          <div>
            <strong>${item.symbol}</strong>
            <small>${getForeignName(item.symbol)}</small>
          </div>
          <span>${usd.format(item.price || 0)}</span>
          <span class="${Number(item.change || 0) >= 0 ? "gain" : "loss"}">${signedPct(item.changePercent || 0)}</span>
        </div>
      `).join("")
      : `<div class="foreign-empty">
          <strong>No foreign quotes loaded</strong>
          <small>${data.configured === false ? "Add an Alpha Vantage key in .env." : "Free API limit may be cooling down. Cached data will appear when available."}</small>
        </div>`;
  }

  const note = data.message
    || (data.cached ? "Using cached Alpha Vantage data to protect your free quota." : "Free API data for research only. No foreign broker is connected.");
  const statusEl = byId("foreignStatus");
  if (statusEl) {
    statusEl.textContent = note;
    statusEl.classList.toggle("warn", Boolean(data.message || data.configured === false));
  }
}

export function getForeignName(symbol) {
  const names = {
    AAPL: "Apple",
    MSFT: "Microsoft",
    NVDA: "NVIDIA",
    QQQ: "Nasdaq 100 ETF",
    SPY: "S&P 500 ETF",
    TSLA: "Tesla"
  };
  return names[symbol] || "Global equity";
}
