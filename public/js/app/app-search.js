import { byId, escapeHtml, fetchJson } from "./app-helpers.js";
import { state } from "./app-state.js";

export async function searchStocks(value) {
  const query = value.trim();
  const suggContainer = byId("stockSuggestions");
  if (query.length < 2) {
    if (suggContainer) suggContainer.hidden = true;
    renderStockSuggestions([]);
    return;
  }

  if (suggContainer) {
    suggContainer.hidden = false;
    suggContainer.innerHTML = `<div class="stock-hint">Searching real-time instruments...</div>`;
  }
  try {
    const data = await fetchJson(`/api/stocks/search?q=${encodeURIComponent(query)}&limit=8`);
    renderStockSuggestions(data.items || [], data.source || "Stock search");
  } catch (error) {
    if (suggContainer) {
      suggContainer.hidden = false;
      suggContainer.innerHTML = `<div class="stock-hint warn">Stock search unavailable: ${escapeHtml(error.message)}</div>`;
    }
  }
}

export function renderStockSuggestions(items, source = "Stock search") {
  const suggContainer = byId("stockSuggestions");
  if (!suggContainer) return;
  if (!items.length) {
    suggContainer.hidden = true;
    return;
  }

  suggContainer.hidden = false;
  suggContainer.innerHTML = `
    <div class="stock-source">${escapeHtml(source)}</div>
    ${items.map((item) => {
      const added = (state.watchlistSymbols || []).includes(item.yahooSymbol);
      const clean = item.tradingsymbol.replace(/\.(NS|BO)$/, "");
      return `
        <button class="suggestion-row" data-watch-symbol="${escapeHtml(item.yahooSymbol)}" type="button" ${added ? "disabled" : ""}>
          <span>
            <strong>${escapeHtml(clean)}</strong>
            <small>${escapeHtml(item.name)} · ${escapeHtml(item.exchange)}</small>
          </span>
          <em>${added ? "✓ Added" : "+ Watch"}</em>
        </button>
      `;
    }).join("")}
  `;
}

export function renderQuickPresetChips() {
  const container = byId("quickPresetChips");
  if (!container) return;
  const tracked = new Set(state.watchlistSymbols || []);
  const pool = [
    { symbol: "RELIANCE.NS", label: "RELIANCE" },
    { symbol: "TATAMOTORS.NS", label: "TATAMOTORS" },
    { symbol: "TCS.NS", label: "TCS" },
    { symbol: "HDFCBANK.NS", label: "HDFCBANK" },
    { symbol: "INFY.NS", label: "INFY" },
    { symbol: "SBIN.NS", label: "SBIN" },
    { symbol: "GOLDBEES.NS", label: "GOLDBEES" },
    { symbol: "ZOMATO.NS", label: "ZOMATO" },
    { symbol: "SUZLON.NS", label: "SUZLON" },
    { symbol: "JIOFIN.NS", label: "JIOFIN" },
    { symbol: "HAL.NS", label: "HAL" },
    { symbol: "BEL.NS", label: "BEL" },
    { symbol: "TRENT.NS", label: "TRENT" },
    { symbol: "BHARTIARTL.NS", label: "BHARTIARTL" },
    { symbol: "LT.NS", label: "LT" },
    { symbol: "BAJFINANCE.NS", label: "BAJFINANCE" }
  ];
  const untracked = pool.filter((p) => !tracked.has(p.symbol)).slice(0, 7);
  if (!untracked.length) {
    container.innerHTML = `<span class="preset-label">All Top Leaders Tracked ✓</span>`;
    return;
  }
  container.innerHTML = `
    <span class="preset-label">Quick Add:</span>
    ${untracked.map((p) => `
      <button class="preset-chip" type="button" data-add-quick="${p.symbol}">+ ${p.label}</button>
    `).join("")}
  `;
}
