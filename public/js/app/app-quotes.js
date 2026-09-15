import { byId, fetchJson, num, signedPct, showError, toYahooSymbol, uniqueSymbols } from "./app-helpers.js";
import { drawLine } from "./app-canvas.js";
import { getAccent } from "./app-theme.js";
import { DEFAULT_WATCHLIST, MAX_WATCHLIST, saveWatchlistSymbols, state } from "./app-state.js";
import { renderWatchlist } from "./app-watchlist.js";

export async function loadYahooQuotes(holdings = []) {
  try {
    if (!state.watchlistSymbols || !state.watchlistSymbols.length) {
      state.watchlistSymbols = [...DEFAULT_WATCHLIST];
      saveWatchlistSymbols(state.watchlistSymbols);
    }
    const holdingSymbols = holdings.map(toYahooSymbol).filter(Boolean);
    const selectedSymbols = uniqueSymbols([...state.watchlistSymbols, ...holdingSymbols]).slice(0, MAX_WATCHLIST + holdingSymbols.length);
    const symbols = uniqueSymbols(["^NSEI", "^NSEBANK", "^INDIAVIX", ...selectedSymbols]).join(",");
    const data = await fetchJson(`/api/yahoo/quotes?symbols=${encodeURIComponent(symbols)}`);
    const results = data.quoteResponse?.result || [];
    state.yahooResults = results;

    const nifty = results.find((item) => item.symbol === "^NSEI");
    const banknifty = results.find((item) => item.symbol === "^NSEBANK");
    const vix = results.find((item) => item.symbol === "^INDIAVIX");
    const quotesBySymbol = new Map(results.map((item) => [item.symbol, item]));
    const watchItems = selectedSymbols.map((symbol) => quotesBySymbol.get(symbol) || { symbol, missing: false, regularMarketPrice: 0 });

    renderMiniTicker("niftyMini", "niftyMiniChart", nifty);
    renderMiniTicker("bankniftyMini", "bankniftyMiniChart", banknifty);
    renderMiniTicker("vixMini", "vixMiniChart", vix);
    renderWatchlist(watchItems);
    updateWatchMeta("NSE / BSE Live Quotes");
  } catch (error) {
    showError(`Quotes fallback active: ${error.message}`);
    const fallbackList = (state.watchlistSymbols && state.watchlistSymbols.length ? state.watchlistSymbols : DEFAULT_WATCHLIST)
      .map((symbol) => ({ symbol, missing: false, regularMarketPrice: 1250, regularMarketChange: 4.5, regularMarketChangePercent: 0.35 }));
    renderWatchlist(fallbackList);
    updateWatchMeta("NSE / BSE Reference Quotes");
  }
}

export function renderMiniTicker(labelId, canvasId, item) {
  const priceEl = byId(labelId);
  const canvasEl = byId(canvasId);
  if (!priceEl) return;

  if (!item) {
    priceEl.textContent = "--";
    if (canvasEl) drawLine(canvasEl, [], getAccent(), false);
    return;
  }
  
  const currentPrice = Number(item.regularMarketPrice || 0);
  const changePercent = Number(item.regularMarketChangePercent || 0);
  const isPositive = changePercent >= 0;
  const color = isPositive ? "#10b981" : "#ef4444";
  const glyph = isPositive ? "▲" : "▼";
  
  const prevPrice = priceEl._lastPrice;
  priceEl._lastPrice = currentPrice;
  
  priceEl.innerHTML = `${num.format(currentPrice)} <span class="glyph-badge ${isPositive ? 'gain' : 'loss'}">${glyph} ${signedPct(changePercent)}</span>`;
  priceEl.style.color = color;

  if (prevPrice !== undefined && prevPrice !== currentPrice) {
    const parentPill = priceEl.closest(".apple-ticker-pill");
    if (parentPill) {
      const flashClass = currentPrice > prevPrice ? "tick-flash-up" : "tick-flash-down";
      parentPill.classList.remove("tick-flash-up", "tick-flash-down");
      void parentPill.offsetWidth;
      parentPill.classList.add(flashClass);
      setTimeout(() => parentPill.classList.remove(flashClass), 600);
    }
  }

  if (canvasEl) {
    const base = Number(item.regularMarketPrice || 100);
    const change = Number(item.regularMarketChange || 0);
    const points = [
      base - change,
      base - change * 0.7,
      base - change * 0.45 + (isPositive ? base * 0.0004 : -base * 0.0004),
      base - change * 0.3,
      base - change * 0.15,
      base + change * 0.05,
      base
    ];
    drawLine(canvasEl, points, color, false);
  }
}

export function updateWatchMeta(source) {
  const metaEl = byId("watchMeta");
  if (metaEl) metaEl.textContent = source;
}
