import { byId, escapeHtml, num, signedPct, toYahooSymbol, uniqueSymbols } from "./app-helpers.js";
import { getStockMeta } from "./app-stock-meta.js";
import { drawLine } from "./app-canvas.js";
import { MAX_WATCHLIST, saveWatchlistSymbols, state } from "./app-state.js";

export function renderWatchlist(items) {
  state.watchlistQuoteItems = items;
  const savedSymbols = new Set(state.watchlistSymbols);
  const holdingSymbols = new Set(state.holdings.map(toYahooSymbol).filter(Boolean));
  const filter = state.watchlistFilter || "all";

  let filtered = items;
  if (filter === "nifty") {
    const nifty = new Set(["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS", "SBIN.NS"]);
    filtered = items.filter((i) => nifty.has(i.symbol));
  } else if (filter === "banking") {
    const banks = new Set(["HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS", "KOTAKBANK.NS", "BAJFINANCE.NS", "AXISBANK.NS"]);
    filtered = items.filter((i) => banks.has(i.symbol));
  } else if (filter === "tech") {
    const tech = new Set(["TCS.NS", "INFY.NS", "WIPRO.NS", "TECHM.NS", "HCLTECH.NS"]);
    filtered = items.filter((i) => tech.has(i.symbol));
  } else if (filter === "gainers") {
    filtered = items.filter((i) => Number(i.regularMarketChangePercent || 0) > 0);
  } else if (filter === "dips") {
    filtered = items.filter((i) => Number(i.regularMarketChangePercent || 0) < 0);
  }

  const container = byId("watchlist");
  if (!container) return;
  if (!filtered.length) {
    container.innerHTML = `<div class="watch-empty-apple"><h4>No stocks match "${escapeHtml(filter.toUpperCase())}"</h4></div>`;
    if (byId("watchCount")) byId("watchCount").textContent = `${state.watchlistSymbols.length}/${MAX_WATCHLIST} Stocks`;
    return;
  }

  container.innerHTML = filtered.map((item) => buildWatchCard(item, savedSymbols.has(item.symbol), holdingSymbols.has(item.symbol))).join("");

  filtered.forEach((item) => {
    const cleanSym = item.symbol.replace(/\.(NS|BO)$/, "");
    const canvas = byId(`watchCanvas_${cleanSym}`);
    if (canvas) {
      const isPos = Number(item.regularMarketChangePercent || 0) >= 0;
      const base = Number(item.regularMarketPrice || 850);
      const points = [base * 0.98, base * 0.99, base * 1.01, base * (isPos ? 1.02 : 0.97), base];
      drawLine(canvas, points, isPos ? "#10b981" : "#ef4444", false);
    }
  });

  if (byId("watchCount")) byId("watchCount").textContent = `${state.watchlistSymbols.length}/${MAX_WATCHLIST} Stocks`;
}

function buildWatchCard(item, isSaved, isHolding) {
  const meta = getStockMeta(item.symbol);
  const cleanSym = item.symbol.replace(/\.(NS|BO)$/, "");
  const price = Number(item.regularMarketPrice || meta.price || 850);
  const change = Number(item.regularMarketChange ?? meta.change ?? 3.5);
  const changePct = Number(item.regularMarketChangePercent ?? meta.changePct ?? 0.45);
  const isPos = change >= 0;

  let vibe = { icon: "⚡", text: "Equilibrium · Steady", cls: "vibe-neutral" };
  if (changePct >= 1.5) vibe = { icon: "🔥", text: "High Demand · Strong Momentum", cls: "vibe-hot" };
  else if (changePct > 0) vibe = { icon: "⚡", text: "Steady Gain · Buyers in Control", cls: "vibe-gain" };
  else if (changePct <= -1.5) vibe = { icon: "🩸", text: "Deep Pullback · Value Zone", cls: "vibe-drop" };
  else if (changePct < 0) vibe = { icon: "🛡️", text: "Minor Dip · Testing Support", cls: "vibe-dip" };

  return `
    <div class="apple-watch-card" data-symbol="${escapeHtml(item.symbol)}">
      <div class="watch-card-top">
        <div class="watch-brand-info">
          <div class="watch-brand-avatar" style="background: ${meta.color}22; color: ${meta.color}; border: 1px solid ${meta.color}44;">${escapeHtml(meta.shortName)}</div>
          <div class="watch-titles">
            <div class="watch-sym-row"><strong class="watch-symbol-label">${escapeHtml(cleanSym)}</strong>${isHolding ? '<span class="watch-status-tag holding">Holding</span>' : '<span class="watch-status-tag tracked">Watch</span>'}</div>
            <span class="watch-name-label">${escapeHtml(meta.name)}</span>
          </div>
        </div>
        <div class="watch-card-actions">${isSaved ? `<button class="watch-card-remove" data-remove-symbol="${escapeHtml(item.symbol)}" type="button" title="Remove">✕</button>` : ""}</div>
      </div>
      <div class="watch-card-body">
        <div class="watch-price-block">
          <div class="watch-card-price">₹${num.format(price)}</div>
          <div class="apple-change-badge ${isPos ? 'gain' : 'loss'}">${isPos ? "▲" : "▼"} ${signedPct(changePct)}</div>
        </div>
        <div class="watch-sparkline-box"><canvas id="watchCanvas_${escapeHtml(cleanSym)}" width="96" height="38" aria-hidden="true"></canvas></div>
      </div>
      <div class="watch-card-bottom">
        <div class="watch-vibe-badge ${vibe.cls}"><span class="vibe-icon">${vibe.icon}</span><span class="vibe-text">${vibe.text}</span></div>
        <div class="watch-quick-buttons">
          <button class="btn-watch-quick" data-chart-sync="${escapeHtml(cleanSym)}" type="button">📈 Chart</button>
          <button class="btn-watch-quick trade" data-trade-fill="${escapeHtml(cleanSym)}" data-ltp="${price}" type="button">⚡ Trade</button>
        </div>
      </div>
    </div>
  `;
}

export function addWatchSymbol(symbol) {
  if (!symbol) return;
  state.watchlistSymbols = uniqueSymbols([symbol, ...state.watchlistSymbols]).slice(0, MAX_WATCHLIST);
  saveWatchlistSymbols(state.watchlistSymbols);
  renderWatchlist(state.watchlistQuoteItems || []);
}

export function removeWatchSymbol(symbol) {
  state.watchlistSymbols = state.watchlistSymbols.filter((item) => item !== symbol);
  if (state.watchlistQuoteItems) {
    state.watchlistQuoteItems = state.watchlistQuoteItems.filter((item) => item.symbol !== symbol);
  }
  saveWatchlistSymbols(state.watchlistSymbols);
  renderWatchlist(state.watchlistQuoteItems || []);
}
