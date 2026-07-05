const colors = ["#15a8ff", "#19e0ff", "#6b57ff", "#a950f5", "#4f83ff", "#00f5c4"];
const WATCHLIST_KEY = "portfolio-watchlist";
const MAX_WATCHLIST = 30;
const DEFAULT_WATCHLIST = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS", "SBIN.NS", "ITC.NS", "GOLDBEES.NS"];
const rupee = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const num = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const customizableVars = [
  "--bg",
  "--sidebar",
  "--panel",
  "--panel-2",
  "--line",
  "--line-soft",
  "--cyan",
  "--blue",
  "--green",
  "--accent-rgb",
  "--blue-rgb",
  "--accent-gradient",
];

let state = {
  holdings: [],
  rows: [],
  margins: null,
  yahooResults: [],
  watchlistSymbols: loadWatchlistSymbols(),
  watchlistQuoteItems: [],
  foreignResults: [],
  chartValues: [],
};

const savedTheme = localStorage.getItem("portfolio-theme") || "blue";
setTheme(savedTheme, false);
let stockSearchTimer;

document.getElementById("refreshBtn").addEventListener("click", loadDashboard);
document.getElementById("searchInput").addEventListener("input", renderFilteredHoldings);
document.getElementById("stockSearchInput").addEventListener("input", (event) => {
  clearTimeout(stockSearchTimer);
  stockSearchTimer = setTimeout(() => searchStocks(event.target.value), 220);
});
document.getElementById("clearStockSearch").addEventListener("click", () => {
  byId("stockSearchInput").value = "";
  renderStockSuggestions([]);
});
document.getElementById("stockSuggestions").addEventListener("click", (event) => {
  const button = event.target.closest("[data-watch-symbol]");
  if (!button) return;
  addWatchSymbol(button.dataset.watchSymbol);
});
document.getElementById("watchlist").addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-symbol]");
  if (!button) return;
  removeWatchSymbol(button.dataset.removeSymbol);
});
document.querySelectorAll(".theme-option").forEach((button) => {
  button.addEventListener("click", () => setTheme(button.dataset.theme));
});
document.getElementById("customThemeBtn").addEventListener("click", () => toggleCustomThemePanel());
document.getElementById("saveCustomTheme").addEventListener("click", () => {
  saveCustomThemeFromInputs();
  setTheme("custom");
  toggleCustomThemePanel(false);
});
["customAccentColor", "customBgColor", "customPanelColor"].forEach((id) => {
  document.getElementById(id).addEventListener("input", () => {
    saveCustomThemeFromInputs();
    setTheme("custom");
  });
});
document.addEventListener("click", (event) => {
  const panel = byId("customThemePanel");
  const switcher = document.querySelector(".theme-switcher");
  if (!panel.hidden && !switcher.contains(event.target)) {
    toggleCustomThemePanel(false);
  }
});
document.querySelectorAll(".range-tabs button").forEach((button) => {
  button.addEventListener("click", async () => {
    document.querySelectorAll(".range-tabs button").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
    await loadYahooChart(button.dataset.range);
  });
});

loadDashboard();

async function loadDashboard() {
  setSync("Syncing");
  clearError();

  try {
    const portfolio = await fetchJson("/api/portfolio");
    state.holdings = portfolio.holdings || [];
    state.margins = portfolio.margins;
    setSync("Synced");
  } catch (error) {
    state.holdings = [];
    state.margins = null;
    showError(`Kite portfolio unavailable. No dummy holdings are shown: ${error.message}`);
    setSync("Kite offline");
  }

  renderPortfolio();
  await Promise.all([loadYahooQuotes(state.holdings), loadYahooChart(getSelectedRange()), loadAlphaForeignRadar()]);
}

function renderPortfolio() {
  state.rows = enrichHoldings(state.holdings);
  const rows = state.rows;
  const totals = getTotals(rows);
  const returnPct = totals.cost ? (totals.pnl / totals.cost) * 100 : 0;
  const gold = rows.find((item) => item.tradingsymbol === "GOLDBEES");
  const maxWeight = rows.length ? Math.max(...rows.map((item) => item.weight)) : 0;
  const goldWeight = gold ? gold.weight : 0;
  const health = calculateHealth(rows, goldWeight, maxWeight);

  byId("totalValue").textContent = rupee.format(totals.value);
  byId("investedValue").textContent = rupee.format(totals.cost);
  byId("totalReturn").textContent = `${signedRupee(totals.pnl)} (${signedPct(returnPct)})`;
  byId("totalReturnPct").textContent = signedPct(returnPct);
  byId("holdingCount").textContent = String(rows.length);
  byId("asOf").textContent = `As of ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  byId("cashBuffer").textContent = state.margins?.net != null ? rupee.format(state.margins.net) : "--";
  byId("goldWeight").textContent = gold ? `${gold.weight.toFixed(0)}%` : "--";
  byId("goldInsight").textContent = gold && gold.weight > 40
    ? `Your portfolio is heavily weighted in GOLDBEES at ${gold.weight.toFixed(1)}%. Consider directing future additions toward diversified equity exposure.`
    : "Your largest holding concentration is currently within a moderate range.";
  byId("concentrationRisk").textContent = maxWeight > 50 ? "High" : maxWeight > 30 ? "Moderate" : "Low";
  byId("diversificationRisk").textContent = rows.length < 8 ? "Needs work" : "Good";
  setRiskTone(byId("concentrationRisk"), maxWeight > 50 ? "bad" : maxWeight > 30 ? "warn" : "");
  setRiskTone(byId("diversificationRisk"), rows.length < 8 ? "warn" : "");

  byId("diversificationBar").style.width = `${Math.max(16, Math.min(100, rows.length * 12))}%`;
  byId("riskBar").style.width = `${Math.max(18, Math.min(100, maxWeight))}%`;
  byId("goldBar").style.width = `${Math.max(8, Math.min(100, goldWeight))}%`;

  renderFilteredHoldings();
  renderLegend(rows);
  drawDonut(byId("allocationChart"), rows.map((item) => item.weight), getPalette(), totals.value);
  drawHealth(byId("healthChart"), health);
}

function enrichHoldings(holdings) {
  const base = holdings.map((item) => {
    const value = Number(item.quantity || 0) * Number(item.last_price || 0);
    const cost = Number(item.quantity || 0) * Number(item.average_price || 0);
    const pnl = Number(item.pnl ?? value - cost);
    return { ...item, value, cost, pnl };
  });
  const total = base.reduce((sum, item) => sum + item.value, 0) || 1;
  return base
    .map((item) => ({
      ...item,
      weight: (item.value / total) * 100,
      returnPct: item.cost ? (item.pnl / item.cost) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

function getTotals(rows) {
  return rows.reduce(
    (acc, item) => {
      acc.value += item.value;
      acc.cost += item.cost;
      acc.pnl += item.pnl;
      return acc;
    },
    { value: 0, cost: 0, pnl: 0 },
  );
}

function calculateHealth(rows, goldWeight, maxWeight) {
  if (!rows.length) return 0;
  const diversification = Math.min(32, 14 + rows.length * 3.4);
  const concentration = Math.max(12, 36 - Math.max(0, maxWeight - 30) * 0.55);
  const goldBalance = Math.max(10, 32 - Math.max(0, goldWeight - 25) * 0.45);
  return Math.round(Math.max(5, Math.min(95, diversification + concentration + goldBalance)));
}

function renderFilteredHoldings() {
  const query = byId("searchInput").value.trim().toLowerCase();
  const rows = query
    ? state.rows.filter((item) => item.tradingsymbol.toLowerCase().includes(query))
    : state.rows;

  byId("holdingsBody").innerHTML = rows.map((item, index) => `
    <tr>
      <td>
        <div class="instrument">
          <span class="instrument-icon" style="background:${getPalette()[index % getPalette().length]}">${item.tradingsymbol.slice(0, 1)}</span>
          <div>
            ${item.tradingsymbol}
            <small>${item.exchange}</small>
          </div>
        </div>
      </td>
      <td>${num.format(item.quantity)}</td>
      <td>${money.format(item.average_price)}</td>
      <td>${money.format(item.last_price)}</td>
      <td>${rupee.format(item.value)}</td>
      <td class="${item.pnl >= 0 ? "gain" : "loss"}">${signedPct(item.returnPct)}</td>
      <td>${item.weight.toFixed(1)}% <span class="allocation-bar"><i style="width:${Math.min(100, item.weight)}%"></i></span></td>
    </tr>
  `).join("");
}

function renderLegend(rows) {
  byId("allocationLegend").innerHTML = rows.map((item, index) => `
    <div class="legend-row">
      <span class="dot" style="background:${getPalette()[index % getPalette().length]}"></span>
      <span>${item.tradingsymbol}</span>
      <strong>${item.weight.toFixed(1)}%</strong>
    </div>
  `).join("");
}

async function loadYahooQuotes(holdings = []) {
  try {
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
    const watchItems = selectedSymbols.map((symbol) => quotesBySymbol.get(symbol) || { symbol, missing: true });

    renderMiniTicker("niftyMini", "niftyMiniChart", nifty);
    renderMiniTicker("bankniftyMini", "bankniftyMiniChart", banknifty);
    renderMiniTicker("vixMini", "vixMiniChart", vix);
    renderWatchlist(watchItems);
    updateWatchMeta("Yahoo reference");
  } catch (error) {
    showError(`Yahoo quotes unavailable right now: ${error.message}`);
    renderWatchlist(state.watchlistSymbols.map((symbol) => ({ symbol, missing: true })));
    updateWatchMeta("Yahoo offline");
  }
}

function renderMiniTicker(labelId, canvasId, item) {
  if (!item) {
    byId(labelId).textContent = "--";
    drawLine(byId(canvasId), [], getAccent(), false);
    return;
  }
  const priceEl = byId(labelId);
  const changePercent = item.regularMarketChangePercent || 0;
  priceEl.textContent = `${num.format(item.regularMarketPrice || 0)} ${signedPct(changePercent)}`;
  const isPositive = changePercent >= 0;
  const color = isPositive ? "#00f5c4" : "#ff5d6c";
  priceEl.style.color = color;

  const base = Number(item.regularMarketPrice || 100);
  const change = Number(item.regularMarketChange || 0);
  const points = Array.from({ length: 18 }, (_, index) => base - change + change * (index / 17) + Math.sin(index * 1.3) * Math.abs(change || base * 0.001));
  drawLine(byId(canvasId), points, color, false);
}

function toYahooSymbol(item) {
  if (!item.tradingsymbol || !item.exchange) return null;
  const suffix = item.exchange === "BSE" ? "BO" : "NS";
  return `${item.tradingsymbol}.${suffix}`;
}

async function loadYahooChart(range = "1mo") {
  try {
    const data = await fetchJson(`/api/yahoo/chart?symbol=^NSEI&range=${range}&interval=1d`);
    const result = data.chart?.result?.[0];
    const closes = result?.indicators?.quote?.[0]?.close?.filter((value) => typeof value === "number") || [];
    state.chartValues = closes;
    drawLine(byId("portfolioChart"), closes, getAccent(), true);
  } catch (error) {
    state.chartValues = [];
    drawLine(byId("portfolioChart"), [], getAccent(), true);
    showError(`Yahoo chart unavailable right now: ${error.message}`);
  }
}

function renderWatchlist(items) {
  state.watchlistQuoteItems = items;
  const savedSymbols = new Set(state.watchlistSymbols);
  const holdingSymbols = new Set(state.holdings.map(toYahooSymbol).filter(Boolean));
  byId("watchlist").innerHTML = items.length
    ? items.map((item, index) => `
      <div class="watch-row ${item.missing ? "is-muted" : ""}">
        <div>
          <strong>${item.symbol}</strong>
          <small>${getWatchLabel(item.symbol, savedSymbols, holdingSymbols)}</small>
        </div>
        <span>${item.missing ? "--" : num.format(item.regularMarketPrice || 0)}</span>
        <span class="${Number(item.regularMarketChange || 0) >= 0 ? "gain" : "loss"}">${item.missing ? "--" : signedPct(item.regularMarketChangePercent || 0)}</span>
        <canvas id="watchChart${index}" width="72" height="26" aria-hidden="true"></canvas>
        ${savedSymbols.has(item.symbol) ? `<button class="watch-remove" data-remove-symbol="${item.symbol}" type="button" aria-label="Remove ${item.symbol}">x</button>` : `<span class="watch-badge">Hold</span>`}
      </div>
    `).join("")
    : `<div class="watch-empty"><strong>No stocks selected</strong><small>Search NSE/BSE stocks and add them here.</small></div>`;

  items.forEach((item, index) => {
    if (item.missing) {
      drawLine(byId(`watchChart${index}`), [], getAccent(), false);
      return;
    }
    const base = Number(item.regularMarketPrice || 100);
    const change = Number(item.regularMarketChange || 0);
    const points = Array.from({ length: 18 }, (_, step) => base - change + change * (step / 17) + Math.sin(step * 1.1) * Math.abs(change || base * 0.001));
    drawLine(byId(`watchChart${index}`), points, getAccent(), false);
  });

  byId("watchCount").textContent = `${state.watchlistSymbols.length}/${MAX_WATCHLIST} saved stocks`;
}

async function searchStocks(value) {
  const query = value.trim();
  if (query.length < 2) {
    renderStockSuggestions([]);
    return;
  }

  byId("stockSuggestions").innerHTML = `<div class="stock-hint">Searching...</div>`;
  try {
    const data = await fetchJson(`/api/stocks/search?q=${encodeURIComponent(query)}&limit=8`);
    renderStockSuggestions(data.items || [], data.source || "Stock search");
  } catch (error) {
    byId("stockSuggestions").innerHTML = `<div class="stock-hint warn">Stock search unavailable: ${escapeHtml(error.message)}</div>`;
  }
}

function renderStockSuggestions(items, source = "Stock search") {
  if (!items.length) {
    byId("stockSuggestions").innerHTML = `<div class="stock-hint">Type 2 letters to search NSE/BSE stocks.</div>`;
    return;
  }

  byId("stockSuggestions").innerHTML = `
    <div class="stock-source">${escapeHtml(source)}</div>
    ${items.map((item) => {
      const added = state.watchlistSymbols.includes(item.yahooSymbol);
      return `
        <button class="suggestion-row" data-watch-symbol="${escapeHtml(item.yahooSymbol)}" type="button" ${added ? "disabled" : ""}>
          <span>
            <strong>${escapeHtml(item.tradingsymbol)}</strong>
            <small>${escapeHtml(item.name)} · ${escapeHtml(item.exchange)}</small>
          </span>
          <em>${added ? "Added" : "Add"}</em>
        </button>
      `;
    }).join("")}
  `;
}

function addWatchSymbol(symbol) {
  if (!symbol || state.watchlistSymbols.includes(symbol)) return;
  if (state.watchlistSymbols.length >= MAX_WATCHLIST) {
    byId("stockSuggestions").innerHTML = `<div class="stock-hint warn">Watchlist limit is ${MAX_WATCHLIST} stocks in free mode.</div>`;
    return;
  }
  state.watchlistSymbols = uniqueSymbols([symbol, ...state.watchlistSymbols]).slice(0, MAX_WATCHLIST);
  saveWatchlistSymbols();
  byId("stockSearchInput").value = "";
  renderStockSuggestions([]);
  loadYahooQuotes(state.holdings);
}

function removeWatchSymbol(symbol) {
  state.watchlistSymbols = state.watchlistSymbols.filter((item) => item !== symbol);
  saveWatchlistSymbols();
  loadYahooQuotes(state.holdings);
}

function getWatchLabel(symbol, savedSymbols, holdingSymbols) {
  const base = symbol.replace(/\.(NS|BO)$/, "");
  if (savedSymbols.has(symbol) && holdingSymbols.has(symbol)) return `${base} · Saved + Holding`;
  if (savedSymbols.has(symbol)) return `${base} · Saved`;
  if (holdingSymbols.has(symbol)) return `${base} · Holding`;
  return base;
}

function updateWatchMeta(source) {
  byId("watchSource").textContent = source;
}

async function loadAlphaForeignRadar() {
  try {
    const data = await fetchJson("/api/alpha/foreign-quotes");
    state.foreignResults = data.items || [];
    renderForeignRadar(data);
  } catch (error) {
    state.foreignResults = [];
    renderForeignRadar({
      configured: true,
      items: [],
      message: `Alpha Vantage unavailable right now: ${error.message}`,
    });
  }
}

function renderForeignRadar(data) {
  const items = data.items || [];
  byId("foreignList").innerHTML = items.length
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

  const note = data.message
    || (data.cached ? "Using cached Alpha Vantage data to protect your free quota." : "Free API data for research only. No foreign broker is connected.");
  byId("foreignStatus").textContent = note;
  byId("foreignStatus").classList.toggle("warn", Boolean(data.message || data.configured === false));
}

function getForeignName(symbol) {
  const names = {
    AAPL: "Apple",
    MSFT: "Microsoft",
    NVDA: "NVIDIA",
    QQQ: "Nasdaq 100 ETF",
    SPY: "S&P 500 ETF",
    TSLA: "Tesla",
  };
  return names[symbol] || "Global equity";
}

function drawDonut(canvas, values, palette, totalValue = 0) {
  const ctx = canvas.getContext("2d");
  const total = values.reduce((sum, value) => sum + value, 0) || 1;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = 70;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let start = -Math.PI / 2;
  values.forEach((value, index) => {
    const angle = (value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, start, start + angle);
    ctx.lineWidth = 24;
    ctx.lineCap = "butt";
    ctx.strokeStyle = palette[index % palette.length];
    ctx.stroke();
    start += angle;
  });
  ctx.fillStyle = "#f4f8ff";
  ctx.font = "800 18px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(compactRupee(totalValue), cx, cy - 2);
  ctx.fillStyle = "#8fa6bd";
  ctx.font = "12px Inter, sans-serif";
  ctx.fillText("Total", cx, cy + 18);
}

function drawHealth(canvas, score) {
  const ctx = canvas.getContext("2d");
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = 54;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0, 149, 255, 0.16)";
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (score / 100));
  ctx.strokeStyle = getAccent();
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(0, 213, 255, 0.7)";
  ctx.shadowBlur = 16;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#f4f8ff";
  ctx.font = "800 32px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(String(score), cx, cy + 4);
  ctx.fillStyle = "#00f5c4";
  ctx.font = "12px Inter, sans-serif";
  ctx.fillText(score > 75 ? "Excellent" : score > 55 ? "Watch" : "Risky", cx, cy + 28);
}

function drawLine(canvas, values, color, fill = true) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const pad = fill ? 18 : 2;
  ctx.clearRect(0, 0, width, height);

  if (!values || values.length < 2) {
    ctx.fillStyle = "rgba(143, 166, 189, 0.7)";
    ctx.font = fill ? "13px Inter, sans-serif" : "10px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No live chart", width / 2, height / 2);
    return;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  if (fill) {
    ctx.strokeStyle = "rgba(0, 149, 255, 0.11)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i += 1) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(width - pad, y);
      ctx.stroke();
    }
  }

  const points = values.map((value, index) => ({
    x: pad + (index / (values.length - 1)) * (width - pad * 2),
    y: height - pad - ((value - min) / span) * (height - pad * 2),
  }));

  if (fill) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(0, 149, 255, 0.26)");
    gradient.addColorStop(1, "rgba(0, 149, 255, 0)");
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.lineTo(points.at(-1).x, height - pad);
    ctx.lineTo(points[0].x, height - pad);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = fill ? 3 : 1.6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

async function fetchJson(url) {
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error || response.statusText);
  return data;
}

function showError(message) {
  clearError();
  const banner = document.createElement("div");
  banner.className = "error-banner";
  banner.textContent = message;
  document.querySelector(".dashboard-grid").prepend(banner);
}

function clearError() {
  document.querySelector(".error-banner")?.remove();
}

function setSync(text) {
  byId("syncStatus").textContent = text;
}

function getSelectedRange() {
  return document.querySelector(".range-tabs .selected")?.dataset.range || "1mo";
}

function byId(id) {
  return document.getElementById(id);
}

function loadWatchlistSymbols() {
  try {
    const saved = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "null");
    return Array.isArray(saved) ? uniqueSymbols(saved).slice(0, MAX_WATCHLIST) : DEFAULT_WATCHLIST;
  } catch {
    return DEFAULT_WATCHLIST;
  }
}

function saveWatchlistSymbols() {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(state.watchlistSymbols));
}

function setTheme(theme, persist = true) {
  const nextTheme = ["blue", "emerald", "violet", "custom"].includes(theme) ? theme : "blue";
  if (nextTheme === "custom") {
    applyCustomTheme(readCustomTheme());
    updateCustomInputs(readCustomTheme());
  } else {
    clearCustomThemeStyles();
  }
  document.documentElement.dataset.theme = nextTheme;
  document.querySelectorAll(".theme-option").forEach((button) => {
    button.classList.toggle("active", button.dataset.theme === nextTheme);
  });
  if (persist) localStorage.setItem("portfolio-theme", nextTheme);
  if (state.rows.length) renderPortfolio();
  if (state.chartValues.length) drawLine(byId("portfolioChart"), state.chartValues, getAccent(), true);
  state.yahooResults.forEach((item) => {
    if (item.symbol === "^NSEI") renderMiniTicker("niftyMini", "niftyMiniChart", item);
    if (item.symbol === "^NSEBANK") renderMiniTicker("bankniftyMini", "bankniftyMiniChart", item);
    if (item.symbol === "^INDIAVIX") renderMiniTicker("vixMini", "vixMiniChart", item);
  });
  if (state.watchlistQuoteItems.length) renderWatchlist(state.watchlistQuoteItems);
}

function toggleCustomThemePanel(force) {
  const panel = byId("customThemePanel");
  const button = byId("customThemeBtn");
  const shouldOpen = typeof force === "boolean" ? force : panel.hidden;
  panel.hidden = !shouldOpen;
  button.setAttribute("aria-expanded", String(shouldOpen));
  if (shouldOpen) {
    updateCustomInputs(readCustomTheme());
    setTheme("custom");
  }
}

function readCustomTheme() {
  const fallback = {
    accent: "#00d5ff",
    bg: "#020812",
    panel: "#061423",
  };
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem("portfolio-custom-theme") || "{}") };
  } catch {
    return fallback;
  }
}

function updateCustomInputs(theme) {
  byId("customAccentColor").value = theme.accent;
  byId("customBgColor").value = theme.bg;
  byId("customPanelColor").value = theme.panel;
}

function saveCustomThemeFromInputs() {
  const theme = {
    accent: byId("customAccentColor").value,
    bg: byId("customBgColor").value,
    panel: byId("customPanelColor").value,
  };
  localStorage.setItem("portfolio-custom-theme", JSON.stringify(theme));
}

function applyCustomTheme(theme) {
  const root = document.documentElement;
  const accentRgb = hexToRgb(theme.accent);
  const bgRgb = hexToRgb(theme.bg);
  const panelRgb = hexToRgb(theme.panel);
  const blue = mixHex(theme.accent, "#ffffff", 0.16);
  const success = mixHex(theme.accent, "#7cffd0", 0.36);

  root.style.setProperty("--bg", theme.bg);
  root.style.setProperty("--sidebar", mixHex(theme.bg, theme.panel, 0.34));
  root.style.setProperty("--panel", theme.panel);
  root.style.setProperty("--panel-2", mixHex(theme.panel, "#ffffff", 0.08));
  root.style.setProperty("--line", `rgba(${accentRgb.join(", ")}, 0.3)`);
  root.style.setProperty("--line-soft", `rgba(${accentRgb.join(", ")}, 0.13)`);
  root.style.setProperty("--cyan", theme.accent);
  root.style.setProperty("--blue", blue);
  root.style.setProperty("--green", success);
  root.style.setProperty("--accent-rgb", accentRgb.join(", "));
  root.style.setProperty("--blue-rgb", mixRgb(accentRgb, panelRgb, 0.32).join(", "));
  root.style.setProperty("--accent-gradient", `linear-gradient(90deg, ${blue}, ${theme.accent})`);
  root.style.setProperty("--shadow", `0 22px 70px rgba(${bgRgb.join(", ")}, 0.52)`);
}

function clearCustomThemeStyles() {
  customizableVars.forEach((name) => document.documentElement.style.removeProperty(name));
  document.documentElement.style.removeProperty("--shadow");
}

function getAccent() {
  return getComputedStyle(document.documentElement).getPropertyValue("--cyan").trim() || "#00d5ff";
}

function getPalette() {
  const accent = getAccent();
  const theme = document.documentElement.dataset.theme || "blue";
  if (theme === "emerald") return [accent, "#35e89b", "#34d399", "#22c55e", "#67e8f9", "#8bffcf"];
  if (theme === "violet") return [accent, "#7c3aed", "#c084fc", "#60a5fa", "#22d3ee", "#d8b4fe"];
  return colors;
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ];
}

function mixRgb(a, b, weight) {
  return a.map((channel, index) => Math.round(channel * (1 - weight) + b[index] * weight));
}

function mixHex(hexA, hexB, weight) {
  return `#${mixRgb(hexToRgb(hexA), hexToRgb(hexB), weight)
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function setRiskTone(element, tone) {
  element.classList.remove("warn", "bad");
  if (tone) element.classList.add(tone);
}

function uniqueSymbols(symbols) {
  return [...new Set(symbols.filter(Boolean).map((symbol) => symbol.trim()).filter(Boolean))];
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function signed(value) {
  const amount = Number(value || 0);
  return `${amount >= 0 ? "+" : ""}${num.format(amount)}`;
}

function signedPct(value) {
  return `${signed(value)}%`;
}

function signedRupee(value) {
  const amount = Number(value || 0);
  return `${amount >= 0 ? "+" : "-"}${rupee.format(Math.abs(amount))}`;
}

function compactRupee(value) {
  const amount = Number(value || 0);
  if (amount >= 100000) return `\u20b9${(amount / 100000).toFixed(2)}L`;
  if (amount >= 1000) return `\u20b9${(amount / 1000).toFixed(1)}K`;
  return rupee.format(amount);
}
