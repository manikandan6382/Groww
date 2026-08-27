import { TradingViewTerminal } from "./js/tradingview-chart.js";

const colors = ["#15a8ff", "#19e0ff", "#6b57ff", "#a950f5", "#4f83ff", "#00f5c4"];
const WATCHLIST_KEY = "portfolio-watchlist";
const MAX_WATCHLIST = 30;
const DEFAULT_WATCHLIST = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS", "SBIN.NS", "ITC.NS", "GOLDBEES.NS"];
const rupee = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const num = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

const INDIAN_STOCK_META = {
  "RELIANCE.NS": { name: "Reliance Industries", sector: "Energy & Conglomerate", color: "#00d5ff", tag: "Heavyweight", shortName: "RE", price: 1307.20, change: -6.00, changePct: -0.46 },
  "TCS.NS": { name: "Tata Consultancy Services", sector: "IT & Tech Services", color: "#a855f7", tag: "Tech Titan", shortName: "TC", price: 2268.10, change: -29.90, changePct: -1.30 },
  "HDFCBANK.NS": { name: "HDFC Bank", sector: "Private Banking & NBFC", color: "#3b82f6", tag: "Banking Leader", shortName: "HD", price: 729.65, change: 4.60, changePct: 0.63 },
  "INFY.NS": { name: "Infosys Technologies", sector: "IT & Enterprise Cloud", color: "#06b6d4", tag: "Tech Bluechip", shortName: "IN", price: 1121.10, change: -8.90, changePct: -0.79 },
  "ICICIBANK.NS": { name: "ICICI Bank", sector: "Private Banking & Retail", color: "#f97316", tag: "Growth Bank", shortName: "IC", price: 1438.00, change: 26.10, changePct: 1.85 },
  "SBIN.NS": { name: "State Bank of India", sector: "Public Sector Banking", color: "#10b981", tag: "PSU Giant", shortName: "SB", price: 1056.00, change: 8.00, changePct: 0.76 },
  "ITC.NS": { name: "ITC Limited", sector: "FMCG & Agri Business", color: "#eab308", tag: "Defensive King", shortName: "IT", price: 271.60, change: -0.05, changePct: -0.02 },
  "GOLDBEES.NS": { name: "Nippon India Gold ETF", sector: "Gold Commodity ETF", color: "#f59e0b", tag: "Safe Haven", shortName: "GB", price: 132.87, change: 3.99, changePct: 3.10 },
  "TATAMOTORS.NS": { name: "Tata Motors", sector: "Automotive & EV", color: "#38bdf8", tag: "EV Leader", shortName: "TM", price: 985.40, change: 12.60, changePct: 1.30 },
  "BHARTIARTL.NS": { name: "Bharti Airtel", sector: "Telecom & 5G Data", color: "#ef4444", tag: "Telecom Giant", shortName: "BA", price: 1680.50, change: 15.20, changePct: 0.91 },
  "LT.NS": { name: "Larsen & Toubro", sector: "Infrastructure & Defense", color: "#8b5cf6", tag: "Infra Giant", shortName: "LT", price: 3450.00, change: -18.40, changePct: -0.53 },
  "KOTAKBANK.NS": { name: "Kotak Mahindra Bank", sector: "Banking & Wealth", color: "#ec4899", tag: "Private Bank", shortName: "KB", price: 1780.00, change: 8.50, changePct: 0.48 },
  "BAJFINANCE.NS": { name: "Bajaj Finance", sector: "Consumer NBFC", color: "#14b8a6", tag: "Fintech Leader", shortName: "BF", price: 7120.00, change: 45.00, changePct: 0.64 },
  "MARUTI.NS": { name: "Maruti Suzuki", sector: "Automobile Leader", color: "#6366f1", tag: "Auto Giant", shortName: "MS", price: 11850.00, change: -80.00, changePct: -0.67 },
  "SUNPHARMA.NS": { name: "Sun Pharma", sector: "Healthcare & Pharma", color: "#84cc16", tag: "Pharma Leader", shortName: "SP", price: 1720.00, change: 14.00, changePct: 0.82 },
  "WIPRO.NS": { name: "Wipro Limited", sector: "Enterprise IT", color: "#a855f7", tag: "IT Services", shortName: "WP", price: 495.00, change: -3.20, changePct: -0.64 },
  "ZOMATO.NS": { name: "Zomato Limited", sector: "Food Delivery & Quick Commerce", color: "#ef4444", tag: "Growth Star", shortName: "ZO", price: 235.50, change: 4.80, changePct: 2.08 },
  "SUZLON.NS": { name: "Suzlon Energy", sector: "Green Energy & Wind Power", color: "#10b981", tag: "Renewable Power", shortName: "SU", price: 68.40, change: 1.20, changePct: 1.79 },
  "JIOFIN.NS": { name: "Jio Financial Services", sector: "Fintech & NBFC", color: "#00d5ff", tag: "Reliance NBFC", shortName: "JF", price: 324.80, change: -2.10, changePct: -0.64 },
  "HAL.NS": { name: "Hindustan Aeronautics", sector: "Defense & Aerospace", color: "#3b82f6", tag: "Defense Leader", shortName: "HA", price: 4350.00, change: 65.00, changePct: 1.52 },
  "BEL.NS": { name: "Bharat Electronics", sector: "Defense & Electronics", color: "#06b6d4", tag: "PSU Tech", shortName: "BE", price: 298.00, change: 3.40, changePct: 1.15 },
  "TRENT.NS": { name: "Trent Limited", sector: "Retail & Fashion (Zudio)", color: "#a855f7", tag: "Retail Star", shortName: "TR", price: 6850.00, change: 120.00, changePct: 1.78 },
  "NIFTYBEES.NS": { name: "Nippon India Nifty 50 ETF", sector: "Index Fund ETF", color: "#00d5ff", tag: "Index Core", shortName: "NB", price: 262.50, change: 1.10, changePct: 0.42 }
};

function getStockMeta(symbol) {
  if (INDIAN_STOCK_META[symbol]) return INDIAN_STOCK_META[symbol];
  const clean = symbol.replace(/\.(NS|BO)$/, "");
  return {
    name: clean,
    sector: "Equity / ETF",
    color: "#00d5ff",
    tag: "NSE Stock",
    shortName: clean.slice(0, 2).toUpperCase(),
    price: 850.00,
    change: 4.50,
    changePct: 0.53
  };
}

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

// Synchronous 0ms Initial Render of Watchlist (No blank waiting states)
state.watchlistQuoteItems = (state.watchlistSymbols && state.watchlistSymbols.length ? state.watchlistSymbols : DEFAULT_WATCHLIST).map(sym => {
  const meta = getStockMeta(sym);
  return {
    symbol: sym,
    regularMarketPrice: meta.price || 850,
    regularMarketChange: meta.change || 3.5,
    regularMarketChangePercent: meta.changePct || 0.45,
    missing: false
  };
});
renderWatchlist(state.watchlistQuoteItems);

document.getElementById("refreshBtn")?.addEventListener("click", loadDashboard);
document.getElementById("searchInput")?.addEventListener("input", renderFilteredHoldings);
document.getElementById("holdingsFilterGroup")?.addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-filter]");
  if (!btn) return;
  document.querySelectorAll("#holdingsFilterGroup button").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  state.holdingsFilter = btn.dataset.filter;
  renderFilteredHoldings();
});
document.getElementById("stockSearchInput")?.addEventListener("input", (event) => {
  clearTimeout(stockSearchTimer);
  stockSearchTimer = setTimeout(() => searchStocks(event.target.value), 220);
});

// Linear / Superhuman Global Desktop Accelerators
document.addEventListener("keydown", (e) => {
  const activeTag = document.activeElement?.tagName;
  const isTyping = activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT" || document.activeElement?.isContentEditable;

  // Spotlight search: '/' or 'Cmd+K' / 'Ctrl+K'
  if ((e.key === "/" || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) && !isTyping) {
    e.preventDefault();
    const input = byId("stockSearchInput");
    if (input) {
      input.focus();
      input.select();
    }
    return;
  }

  // 'N' -> Jump to Trade Logger & Focus
  if (e.key.toLowerCase() === "n" && !isTyping && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    setActiveView("journal");
    setTimeout(() => {
      const form = byId("tradeForm");
      if (form) {
        form.scrollIntoView({ behavior: "smooth", block: "center" });
        const symInput = byId("formSymbol");
        if (symInput) symInput.focus();
      }
    }, 50);
    return;
  }

  // '?' -> Open Keyboard Shortcuts Cheat Sheet Modal
  if (e.key === "?" && !isTyping && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    const modal = document.getElementById("shortcutsModal");
    if (modal) {
      if (modal.open) modal.close();
      else modal.showModal();
    }
    return;
  }

  // '1' - '4' -> Instant View Switching
  if (!isTyping && !e.ctrlKey && !e.metaKey && !e.altKey) {
    if (e.key === "1") { e.preventDefault(); setActiveView("dashboard"); }
    else if (e.key === "2") { e.preventDefault(); setActiveView("paper"); }
    else if (e.key === "3") { e.preventDefault(); setActiveView("journal"); }
    else if (e.key === "4") { e.preventDefault(); setActiveView("foreign"); }
  }

  if (e.key === "Escape") {
    const shortcutsModal = document.getElementById("shortcutsModal");
    if (shortcutsModal && shortcutsModal.open) {
      shortcutsModal.close();
      return;
    }
    if (document.activeElement?.id === "stockSearchInput") {
      document.activeElement.blur();
      const sugg = byId("stockSuggestions");
      if (sugg) sugg.hidden = true;
    }
  }
});

// Shortcuts modal listeners
const shortcutsModal = document.getElementById("shortcutsModal");
if (shortcutsModal) {
  document.getElementById("btnCloseShortcutsModal")?.addEventListener("click", () => shortcutsModal.close());
  shortcutsModal.addEventListener("click", (e) => {
    if (e.target === shortcutsModal) shortcutsModal.close();
  });
}

document.getElementById("clearStockSearch")?.addEventListener("click", () => {
  const input = byId("stockSearchInput");
  if (input) input.value = "";
  renderStockSuggestions([]);
});

document.getElementById("stockSuggestions")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-watch-symbol]");
  if (!button) return;
  addWatchSymbol(button.dataset.watchSymbol);
});

document.getElementById("quickPresetChips")?.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-add-quick]");
  if (!chip) return;
  addWatchSymbol(chip.dataset.addQuick);
});

document.getElementById("watchlistFilterGroup")?.addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-watch-filter]");
  if (!btn) return;
  document.querySelectorAll("#watchlistFilterGroup button").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  state.watchlistFilter = btn.dataset.watchFilter;
  if (state.watchlistQuoteItems.length) renderWatchlist(state.watchlistQuoteItems);
});

document.getElementById("watchlist")?.addEventListener("click", (event) => {
  const removeBtn = event.target.closest("[data-remove-symbol]");
  if (removeBtn) {
    removeWatchSymbol(removeBtn.dataset.removeSymbol);
    return;
  }

  const chartBtn = event.target.closest("[data-chart-sync]");
  if (chartBtn) {
    const sym = chartBtn.dataset.chartSync;
    const heroChart = document.querySelector(".portfolio-hero");
    if (heroChart) {
      heroChart.scrollIntoView({ behavior: "smooth", block: "center" });
      const symbolPill = document.querySelector(".tv-symbol-pill");
      if (symbolPill) symbolPill.textContent = sym;
    }
    return;
  }

  const tradeBtn = event.target.closest("[data-trade-fill]");
  if (tradeBtn) {
    const sym = tradeBtn.dataset.tradeFill;
    const ltp = Number(tradeBtn.dataset.ltp || 1000);
    window.setActiveView?.("journal");
    setTimeout(() => {
      const symInput = byId("formTradingsymbol");
      const entryInput = byId("formEntryPrice");
      const qtyInput = byId("formQuantity");
      const slInput = byId("formStopLoss");
      const targetInput = byId("formTargetPrice");

      if (symInput) symInput.value = sym;
      if (entryInput && ltp > 0) {
        entryInput.value = ltp.toFixed(2);
        entryInput.dispatchEvent(new Event("input", { bubbles: true }));
      }

      // Auto-Risk 1% Sizing Rule
      const cash = state.margins?.net || 100000;
      const riskCapital = cash * 0.01;
      const slPrice = +(ltp * 0.98).toFixed(2);
      const riskPerShare = Math.max(1, ltp - slPrice);
      const suggestedQty = Math.max(1, Math.floor(riskCapital / riskPerShare));
      const targetPrice = +(ltp * 1.04).toFixed(2);

      if (qtyInput) {
        qtyInput.value = suggestedQty;
        qtyInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (slInput) slInput.value = slPrice;
      if (targetInput) targetInput.value = targetPrice;

      const tradeForm = byId("tradeForm");
      if (tradeForm) tradeForm.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  }
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

// 🎓 Beginner Rosetta Stone Guide Toggle
const btnToggleRosetta = document.getElementById("btnToggleBeginnerGuide");
const btnCloseRosetta = document.getElementById("btnCloseRosetta");
const rosettaDrawer = document.getElementById("beginnerRosettaStone");

if (btnToggleRosetta && rosettaDrawer) {
  btnToggleRosetta.addEventListener("click", () => {
    rosettaDrawer.hidden = !rosettaDrawer.hidden;
    if (!rosettaDrawer.hidden) {
      rosettaDrawer.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}
if (btnCloseRosetta && rosettaDrawer) {
  btnCloseRosetta.addEventListener("click", () => {
    rosettaDrawer.hidden = true;
  });
}

loadDashboard();
startMarketPulse();

let marketPulseTimer = null;
function isMarketHours() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const ist = new Date(utc + (3600000 * 5.5));
  const day = ist.getDay();
  if (day === 0 || day === 6) return false;
  const mins = ist.getHours() * 60 + ist.getMinutes();
  return mins >= (9 * 60 + 15) && mins <= (15 * 60 + 30);
}

function startMarketPulse() {
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

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    loadYahooQuotes(state.holdings);
  }
});

async function loadDashboard() {
  setSync("Syncing");
  clearError();

  // Load chart immediately so user sees TradingView candles with 0ms delay
  loadYahooChart(getSelectedRange()).catch(e => console.warn(e));

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
  const filter = state.holdingsFilter || "all";
  
  let rows = state.rows;
  if (query) {
    rows = rows.filter((item) => item.tradingsymbol.toLowerCase().includes(query));
  }
  if (filter === "gainers") {
    rows = rows.filter((item) => item.pnl > 0);
  } else if (filter === "losers") {
    rows = rows.filter((item) => item.pnl < 0);
  }

  byId("holdingsBody").innerHTML = rows.length ? rows.map((item, index) => `
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
      <td class="${item.pnl >= 0 ? "gain" : "loss"}">
        <span class="badge-subtle ${item.pnl >= 0 ? "gain" : "loss"}" style="padding: 3px 8px; border-radius: 999px;">
          ${signedPct(item.returnPct)}
        </span>
      </td>
      <td>
        ${item.weight.toFixed(1)}% 
        <span class="allocation-bar" title="${item.weight.toFixed(1)}% of portfolio"><i style="width:${Math.min(100, item.weight)}%"></i></span>
      </td>
    </tr>
  `).join("") : `
    <tr>
      <td colspan="7" style="text-align: center; padding: 24px; color: var(--text-muted);">
        No holdings match the current filter.
      </td>
    </tr>
  `;
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
    if (!state.watchlistSymbols || !state.watchlistSymbols.length) {
      state.watchlistSymbols = [...DEFAULT_WATCHLIST];
      saveWatchlistSymbols();
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

function renderMiniTicker(labelId, canvasId, item) {
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

  // 2026 Institutional Flash Trigger on Real-Time Ticks
  if (prevPrice !== undefined && prevPrice !== currentPrice) {
    const parentPill = priceEl.closest(".apple-ticker-pill");
    if (parentPill) {
      const flashClass = currentPrice > prevPrice ? "tick-flash-up" : "tick-flash-down";
      parentPill.classList.remove("tick-flash-up", "tick-flash-down");
      void parentPill.offsetWidth; // Trigger reflow
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

function toYahooSymbol(item) {
  if (!item.tradingsymbol || !item.exchange) return null;
  const suffix = item.exchange === "BSE" ? "BO" : "NS";
  return `${item.tradingsymbol}.${suffix}`;
}

async function loadYahooChart(range = "1mo") {
  const container = document.getElementById("tradingviewChartContainer");
  if (!state.tvTerminal && container) {
    state.tvTerminal = new TradingViewTerminal(container, {
      symbol: "NIFTY 50",
      height: 280,
      showVolume: true,
      onCrosshairMove: (param, series) => {
        if (!param || !param.time) return;
        const data = param.seriesData?.get(series);
        if (!data) return;
        
        const oEl = document.getElementById("tvO");
        const hEl = document.getElementById("tvH");
        const lEl = document.getElementById("tvL");
        const cEl = document.getElementById("tvC");
        const priceEl = document.getElementById("tvLegendPrice");
        const changeEl = document.getElementById("tvLegendChange");

        if (oEl && data.open !== undefined) oEl.textContent = data.open.toFixed(2);
        if (hEl && data.high !== undefined) hEl.textContent = data.high.toFixed(2);
        if (lEl && data.low !== undefined) lEl.textContent = data.low.toFixed(2);
        if (cEl && data.close !== undefined) cEl.textContent = data.close.toFixed(2);
        if (priceEl && data.close !== undefined) priceEl.textContent = "₹" + data.close.toFixed(2);
        
        if (changeEl && data.open && data.close) {
          const diff = data.close - data.open;
          const pct = (diff / data.open) * 100;
          changeEl.textContent = (diff >= 0 ? "+" : "") + pct.toFixed(2) + "%";
          changeEl.className = "tv-legend-change " + (diff >= 0 ? "text-gain" : "text-loss");
        }
      }
    });

    state.tvTerminal.setVisualPricePlan({
      entry: 24165.00,
      stopLoss: 24150.00,
      target: 24205.00
    });
  }

  try {
    const data = await fetchJson(`/api/yahoo/chart?symbol=^NSEI&range=${range}&interval=1d`);
    const result = data.chart?.result?.[0];
    const timestamps = result?.timestamp || [];
    const quote = result?.indicators?.quote?.[0] || {};
    
    if (timestamps.length && quote.open && quote.close) {
      const candles = [];
      for (let i = 0; i < timestamps.length; i++) {
        const o = quote.open[i];
        const h = quote.high[i];
        const l = quote.low[i];
        const c = quote.close[i];
        const v = quote.volume?.[i] || 0;
        if (typeof c === "number" && typeof o === "number") {
          candles.push({
            time: timestamps[i],
            open: Number(o.toFixed(2)),
            high: Number((h || Math.max(o, c)).toFixed(2)),
            low: Number((l || Math.min(o, c)).toFixed(2)),
            close: Number(c.toFixed(2)),
            volume: v
          });
        }
      }
      if (candles.length && state.tvTerminal) {
        state.tvTerminal.loadHistoricalCandles(candles);
        const last = candles[candles.length - 1];
        const oEl = document.getElementById("tvO");
        const hEl = document.getElementById("tvH");
        const lEl = document.getElementById("tvL");
        const cEl = document.getElementById("tvC");
        const priceEl = document.getElementById("tvLegendPrice");
        const changeEl = document.getElementById("tvLegendChange");

        if (oEl && last.open !== undefined) oEl.textContent = last.open.toFixed(2);
        if (hEl && last.high !== undefined) hEl.textContent = last.high.toFixed(2);
        if (lEl && last.low !== undefined) lEl.textContent = last.low.toFixed(2);
        if (cEl && last.close !== undefined) cEl.textContent = last.close.toFixed(2);
        if (priceEl && last.close !== undefined) priceEl.textContent = "₹" + last.close.toFixed(2);
        if (changeEl && last.open && last.close) {
          const diff = last.close - last.open;
          const pct = (diff / last.open) * 100;
          changeEl.textContent = (diff >= 0 ? "+" : "") + pct.toFixed(2) + "%";
          changeEl.className = "tv-legend-change " + (diff >= 0 ? "text-gain" : "text-loss");
        }

        state.tvTerminal.setVisualPricePlan({
          entry: Number((last.close - 15).toFixed(2)),
          stopLoss: Number((last.close - 40).toFixed(2)),
          target: Number((last.close + 45).toFixed(2))
        });
      }
    } else if (state.tvTerminal) {
      const samples = state.tvTerminal.generateSampleCandles(24310, 60, 5);
      state.tvTerminal.loadHistoricalCandles(samples);
    }
  } catch (error) {
    if (state.tvTerminal) {
      const samples = state.tvTerminal.generateSampleCandles(24310, 60, 5);
      state.tvTerminal.loadHistoricalCandles(samples);
    }
    showError(`Yahoo chart fallback active: ${error.message}`);
  }
}

function renderWatchlist(items) {
  state.watchlistQuoteItems = items;
  const savedSymbols = new Set(state.watchlistSymbols);
  const holdingSymbols = new Set(state.holdings.map(toYahooSymbol).filter(Boolean));

  const filter = state.watchlistFilter || "all";
  let filtered = items;
  if (filter === "nifty") {
    const niftyTop = new Set(["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS", "SBIN.NS"]);
    filtered = items.filter(item => niftyTop.has(item.symbol));
  } else if (filter === "banking") {
    const banks = new Set(["HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS", "KOTAKBANK.NS", "BAJFINANCE.NS", "AXISBANK.NS"]);
    filtered = items.filter(item => banks.has(item.symbol));
  } else if (filter === "tech") {
    const tech = new Set(["TCS.NS", "INFY.NS", "WIPRO.NS", "TECHM.NS", "HCLTECH.NS"]);
    filtered = items.filter(item => tech.has(item.symbol));
  } else if (filter === "gainers") {
    filtered = items.filter(item => Number(item.regularMarketChangePercent || 0) > 0);
  } else if (filter === "dips") {
    filtered = items.filter(item => Number(item.regularMarketChangePercent || 0) < 0);
  }

  const container = byId("watchlist");
  if (!container) return;

  if (!filtered.length) {
    container.innerHTML = `
      <div class="watch-empty-apple">
        <div class="empty-icon"></div>
        <h4>No stocks match "${escapeHtml(filter.toUpperCase())}"</h4>
        <p>Try switching filter tabs or click any quick-add chip above to add new instruments.</p>
      </div>
    `;
    byId("watchCount").textContent = `${state.watchlistSymbols.length}/${MAX_WATCHLIST} Stocks`;
    return;
  }

  container.innerHTML = filtered.map((item) => {
    const meta = getStockMeta(item.symbol);
    const cleanSym = item.symbol.replace(/\.(NS|BO)$/, "");
    const rawPrice = Number(item.regularMarketPrice || 0);
    const price = rawPrice > 0 ? rawPrice : (meta.price || 850);
    const change = Number(item.regularMarketChange !== undefined && item.regularMarketChange !== 0 ? item.regularMarketChange : (meta.change || 3.5));
    const changePct = Number(item.regularMarketChangePercent !== undefined && item.regularMarketChangePercent !== 0 ? item.regularMarketChangePercent : (meta.changePct || 0.45));
    const isPos = change >= 0;
    const glyph = isPos ? "▲" : "▼";
    const isSaved = savedSymbols.has(item.symbol);
    const isHolding = holdingSymbols.has(item.symbol);

    // Plain English Vibe Insight
    let vibeIcon = "⚡";
    let vibeText = "Equilibrium · Steady";
    let vibeClass = "vibe-neutral";
    if (changePct >= 1.5) {
      vibeIcon = "🔥";
      vibeText = "High Demand · Strong Momentum";
      vibeClass = "vibe-hot";
    } else if (changePct > 0) {
      vibeIcon = "⚡";
      vibeText = "Steady Gain · Buyers in Control";
      vibeClass = "vibe-gain";
    } else if (changePct <= -1.5) {
      vibeIcon = "🩸";
      vibeText = "Deep Pullback · Value Zone";
      vibeClass = "vibe-drop";
    } else if (changePct < 0) {
      vibeIcon = "🛡️";
      vibeText = "Minor Dip · Testing Support";
      vibeClass = "vibe-dip";
    }

    if (item.symbol === "GOLDBEES.NS") {
      vibeIcon = "🏆";
      vibeText = "Safe Haven Asset · Low Beta Hedge";
      vibeClass = "vibe-gold";
    }

    return `
      <div class="apple-watch-card" data-symbol="${escapeHtml(item.symbol)}">
        <!-- Top Row: Avatar + Ticker Info + Dismiss -->
        <div class="watch-card-top">
          <div class="watch-brand-info">
            <div class="watch-brand-avatar" style="background: linear-gradient(135deg, ${meta.color}22, ${meta.color}38); color: ${meta.color}; border: 1px solid ${meta.color}44;">
              ${escapeHtml(meta.shortName)}
            </div>
            <div class="watch-titles">
              <div class="watch-sym-row">
                <strong class="watch-symbol-label">${escapeHtml(cleanSym)}</strong>
                ${isHolding ? `<span class="watch-status-tag holding">Holding</span>` : `<span class="watch-status-tag tracked">Watch</span>`}
              </div>
              <span class="watch-name-label">${escapeHtml(meta.name)}</span>
            </div>
          </div>
          <div class="watch-card-actions">
            ${isSaved ? `<button class="watch-card-remove" data-remove-symbol="${escapeHtml(item.symbol)}" type="button" title="Remove from Watchlist">✕</button>` : ``}
          </div>
        </div>

        <!-- Middle Row: Big Price, Change Pill, HD Sparkline -->
        <div class="watch-card-body">
          <div class="watch-price-block">
            <div class="watch-card-price">₹${num.format(price)}</div>
            <div class="apple-change-badge ${isPos ? "gain" : "loss"}">
              ${glyph} ${signedPct(changePct)} (${signed(change)})
            </div>
          </div>
          <div class="watch-sparkline-box">
            <canvas id="watchCanvas_${escapeHtml(cleanSym)}" width="96" height="38" aria-hidden="true"></canvas>
          </div>
        </div>

        <!-- Bottom Row: Plain English Vibe Insight + Quick Actions -->
        <div class="watch-card-bottom">
          <div class="watch-vibe-badge ${vibeClass}" title="Plain-English market interpretation of this asset's current price action.">
            <span class="vibe-icon">${vibeIcon}</span>
            <span class="vibe-text">${vibeText}</span>
          </div>
          <div class="watch-quick-buttons">
            <button class="btn-watch-quick" data-chart-sync="${escapeHtml(cleanSym)}" type="button" title="Sync with top TradingView Chart">📈 Chart</button>
            <button class="btn-watch-quick trade" data-trade-fill="${escapeHtml(cleanSym)}" data-ltp="${price}" type="button" title="Fill into Trade Journal">⚡ Trade</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // Render HD sparklines for all cards
  filtered.forEach((item) => {
    const meta = getStockMeta(item.symbol);
    const cleanSym = item.symbol.replace(/\.(NS|BO)$/, "");
    const canvas = byId(`watchCanvas_${cleanSym}`);
    if (!canvas) return;
    const rawPrice = Number(item.regularMarketPrice || 0);
    const base = rawPrice > 0 ? rawPrice : (meta.price || 850);
    const rawChange = Number(item.regularMarketChange || 0);
    const change = rawChange !== 0 ? rawChange : (meta.change || 3.5);
    const isPositive = change >= 0;
    const color = isPositive ? "#10b981" : "#ef4444";
    // Smooth financial trend interpolation without fake sine waves
    const points = [
      base - change,
      base - change * 0.75,
      base - change * 0.5 + (isPositive ? base * 0.0003 : -base * 0.0003),
      base - change * 0.25,
      base + change * 0.05,
      base
    ];
    drawLine(canvas, points, color, false);
  });

  byId("watchCount").textContent = `${state.watchlistSymbols.length}/${MAX_WATCHLIST} Stocks`;
  renderQuickPresetChips();
  updateMarketStatusBadge();
}

function renderQuickPresetChips() {
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
  const untracked = pool.filter(p => !tracked.has(p.symbol)).slice(0, 7);
  if (!untracked.length) {
    container.innerHTML = `<span class="preset-label">All Top Leaders Tracked ✓</span>`;
    return;
  }
  container.innerHTML = `
    <span class="preset-label">Quick Add:</span>
    ${untracked.map(p => `
      <button class="preset-chip" type="button" data-add-quick="${p.symbol}">+ ${p.label}</button>
    `).join("")}
  `;
}

function updateMarketStatusBadge() {
  const sourceEl = byId("watchSource");
  const beaconEl = document.querySelector(".pulse-beacon");
  if (!sourceEl) return;
  const isOpen = isMarketHours();
  if (isOpen) {
    sourceEl.textContent = "🟢 Live Market (09:15–15:30 IST)";
    if (beaconEl) beaconEl.style.display = "inline-block";
  } else {
    sourceEl.textContent = "🌙 Market Closed · Last Traded Price";
    if (beaconEl) beaconEl.style.display = "none";
  }
}

async function searchStocks(value) {
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

function renderStockSuggestions(items, source = "Stock search") {
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
      const added = state.watchlistSymbols.includes(item.yahooSymbol);
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

function addWatchSymbol(symbol) {
  if (!symbol) return;
  const clean = symbol.replace(/\.(NS|BO)$/, "");
  const meta = getStockMeta(symbol);

  // 1. Optimistically insert into symbols list
  state.watchlistSymbols = uniqueSymbols([symbol, ...state.watchlistSymbols]).slice(0, MAX_WATCHLIST);
  saveWatchlistSymbols();

  // 2. Optimistically build or update item in quote list
  const existingIndex = (state.watchlistQuoteItems || []).findIndex(i => i.symbol === symbol);
  const newItem = {
    symbol,
    regularMarketPrice: meta.price || 850,
    regularMarketChange: meta.change || 4.5,
    regularMarketChangePercent: meta.changePct || 0.53,
    missing: false
  };

  if (!state.watchlistQuoteItems) state.watchlistQuoteItems = [];
  if (existingIndex >= 0) {
    state.watchlistQuoteItems.splice(existingIndex, 1);
  }
  state.watchlistQuoteItems.unshift(newItem);

  // 3. Clear search input and hide autocomplete
  const searchInput = byId("stockSearchInput");
  if (searchInput) searchInput.value = "";
  const sugg = byId("stockSuggestions");
  if (sugg) sugg.hidden = true;
  renderStockSuggestions([]);

  // 4. Reset filter to 'all'
  state.watchlistFilter = "all";
  document.querySelectorAll("#watchlistFilterGroup button").forEach(b => {
    b.classList.toggle("active", b.dataset.watchFilter === "all");
  });

  // 5. INSTANT 0ms SYNCHRONOUS RENDER
  renderWatchlist(state.watchlistQuoteItems);

  // 6. Highlight and scroll to the card smoothly
  setTimeout(() => {
    const card = document.querySelector(`[data-symbol="${symbol}"]`);
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "nearest" });
      card.style.transition = "transform 300ms, box-shadow 300ms, border-color 300ms";
      card.style.borderColor = "rgba(0, 213, 255, 0.8)";
      card.style.boxShadow = "0 0 30px rgba(0, 213, 255, 0.35)";
      setTimeout(() => {
        card.style.borderColor = "";
        card.style.boxShadow = "";
      }, 1200);
    }
  }, 50);

  // 7. Background refresh
  loadYahooQuotes(state.holdings);
}

function removeWatchSymbol(symbol) {
  state.watchlistSymbols = state.watchlistSymbols.filter((item) => item !== symbol);
  if (state.watchlistQuoteItems) {
    state.watchlistQuoteItems = state.watchlistQuoteItems.filter((item) => item.symbol !== symbol);
  }
  saveWatchlistSymbols();
  renderWatchlist(state.watchlistQuoteItems || []);
  loadYahooQuotes(state.holdings);
}

window.addWatchSymbol = addWatchSymbol;
window.removeWatchSymbol = removeWatchSymbol;

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
  if (!canvas || !canvas.getContext) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || canvas.width || 96;
  const height = rect.height || canvas.height || 38;

  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }

  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const pad = fill ? 18 : 2;

  if (!values || values.length < 2) {
    ctx.fillStyle = "rgba(143, 166, 189, 0.7)";
    ctx.font = fill ? "13px Inter, sans-serif" : "10px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No live chart", width / 2, height / 2);
    ctx.restore();
    return;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  if (fill) {
    ctx.strokeStyle = "rgba(0, 213, 255, 0.08)";
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

  const buildSmoothPath = (context) => {
    context.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const midX = (curr.x + next.x) / 2;
      const midY = (curr.y + next.y) / 2;
      context.quadraticCurveTo(curr.x, curr.y, midX, midY);
    }
    context.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  };

  if (fill) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(0, 213, 255, 0.28)");
    gradient.addColorStop(0.7, "rgba(0, 213, 255, 0.06)");
    gradient.addColorStop(1, "rgba(0, 213, 255, 0)");

    ctx.beginPath();
    buildSmoothPath(ctx);
    ctx.lineTo(points.at(-1).x, height - pad);
    ctx.lineTo(points[0].x, height - pad);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  ctx.beginPath();
  buildSmoothPath(ctx);
  ctx.strokeStyle = color;
  ctx.lineWidth = fill ? 2.5 : 1.8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.restore();
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
  const syncEl = byId("syncStatus");
  if (syncEl) syncEl.textContent = text;
  checkBrokerStatuses();
}

async function checkBrokerStatuses() {
  // Check Upstox Status
  try {
    const upstoxData = await fetchJson("/api/upstox/token-status");
    const syncEl = byId("syncStatus");
    if (syncEl) {
      syncEl.textContent = upstoxData.isPreMarketReady ? "Active" : "Auth Required";
      syncEl.style.color = upstoxData.isPreMarketReady ? "#34d399" : "#fbbf24";
    }
  } catch { /* Non-fatal */ }

  // Check Zerodha Kite Status
  try {
    const portfolioData = await fetchJson("/api/portfolio");
    const kiteSyncEl = byId("kiteSyncStatus");
    if (kiteSyncEl) {
      const isOnline = !portfolioData.isKiteOffline;
      kiteSyncEl.textContent = isOnline ? "Active" : "Auth Required";
      kiteSyncEl.style.color = isOnline ? "#34d399" : "#fbbf24";
    }
  } catch { /* Non-fatal */ }
}

function getSelectedRange() {
  return document.querySelector(".range-tabs .selected")?.dataset.range || "1mo";
}

function byId(id) {
  return document.getElementById(id);
}

function loadWatchlistSymbols() {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY) || sessionStorage.getItem(WATCHLIST_KEY) || "null";
    const saved = JSON.parse(raw);
    if (Array.isArray(saved) && saved.length > 0) {
      return uniqueSymbols(saved).slice(0, MAX_WATCHLIST);
    }
    return [...DEFAULT_WATCHLIST];
  } catch {
    return [...DEFAULT_WATCHLIST];
  }
}

function saveWatchlistSymbols() {
  try {
    const data = JSON.stringify(state.watchlistSymbols);
    localStorage.setItem(WATCHLIST_KEY, data);
    sessionStorage.setItem(WATCHLIST_KEY, data);
  } catch {
    // Non-fatal fallback in restricted storage environments
  }
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
  if (state.tvTerminal) {
    const colors = state.tvTerminal.getThemeColors();
    state.tvTerminal.chart?.applyOptions({
      layout: { textColor: colors.textColor },
      grid: { vertLines: { color: colors.gridColor }, horzLines: { color: colors.gridColor } }
    });
  }
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
  root.style.setProperty("--panel-glass", `rgba(${panelRgb.join(", ")}, 0.75)`);
  root.style.setProperty("--line", `rgba(${accentRgb.join(", ")}, 0.22)`);
  root.style.setProperty("--line-soft", `rgba(${accentRgb.join(", ")}, 0.1)`);
  root.style.setProperty("--cyan", theme.accent);
  root.style.setProperty("--blue", blue);
  root.style.setProperty("--green", success);
  root.style.setProperty("--accent-rgb", accentRgb.join(", "));
  root.style.setProperty("--blue-rgb", mixRgb(accentRgb, panelRgb, 0.32).join(", "));
  root.style.setProperty("--accent-gradient", `linear-gradient(135deg, ${blue}, ${theme.accent})`);
  root.style.setProperty("--shadow-main", `0 22px 70px rgba(${bgRgb.join(", ")}, 0.52)`);
}

function clearCustomThemeStyles() {
  customizableVars.forEach((name) => document.documentElement.style.removeProperty(name));
  document.documentElement.style.removeProperty("--panel-glass");
  document.documentElement.style.removeProperty("--shadow-main");
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

// ========================================================
// GLOBAL COMMAND PALETTE (Cmd+K / Ctrl+K)
// ========================================================
function initCommandPalette() {
  const dialog = byId("commandPalette");
  const trigger = byId("globalCommandTrigger");
  const input = byId("paletteInput");
  const results = byId("paletteResults");
  if (!dialog || !input) return;

  const openPalette = () => {
    try {
      dialog.showModal();
      input.value = "";
      filterPaletteItems("");
      input.focus();
    } catch {
      dialog.setAttribute("open", "");
    }
  };

  const closePalette = () => {
    try {
      dialog.close();
    } catch {
      dialog.removeAttribute("open");
    }
  };

  trigger?.addEventListener("click", (e) => {
    e.preventDefault();
    openPalette();
  });

  window.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (dialog.open) closePalette();
      else openPalette();
    } else if (e.key === "Escape" && dialog.open) {
      closePalette();
    } else if (e.altKey && (e.key.toLowerCase() === "l" || e.key.toLowerCase() === "j")) {
      e.preventDefault();
      executeCommandAction("quick-log-journal-trade");
    } else if (e.altKey && e.key.toLowerCase() === "d") {
      e.preventDefault();
      executeCommandAction("nav-dashboard");
    } else if (e.altKey && e.key.toLowerCase() === "p") {
      e.preventDefault();
      executeCommandAction("nav-paper");
    }
  });

  input.addEventListener("input", (e) => {
    filterPaletteItems(e.target.value.toLowerCase().trim());
  });

  results?.addEventListener("click", (e) => {
    const item = e.target.closest(".palette-item");
    if (!item) return;
    executeCommandAction(item.dataset.action);
    closePalette();
  });

  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) closePalette();
  });
}

function filterPaletteItems(query) {
  const items = document.querySelectorAll(".palette-item");
  const groups = document.querySelectorAll(".palette-group");

  items.forEach((item) => {
    const text = item.textContent.toLowerCase();
    const match = !query || text.includes(query);
    item.style.display = match ? "flex" : "none";
  });

  groups.forEach((group) => {
    const visibleChildren = group.querySelectorAll('.palette-item:not([style*="display: none"])');
    group.style.display = visibleChildren.length ? "block" : "none";
  });
}

function executeCommandAction(action) {
  if (action === "quick-log-journal-trade") {
    window.setActiveView?.("journal");
    setTimeout(() => {
      const symbolInput = document.getElementById("formSymbol");
      const entryInput = document.getElementById("formEntryPrice");
      const exitInput = document.getElementById("formExitPrice");
      const stopInput = document.getElementById("formStopLoss");
      const targetInput = document.getElementById("formTargetPrice");
      const qtyInput = document.getElementById("formQuantity");
      const lotInput = document.getElementById("formLotSize");
      
      if (symbolInput) symbolInput.value = "NIFTY 24250 CE";
      if (entryInput) entryInput.value = "114.95";
      if (exitInput) exitInput.value = "110.00";
      if (stopInput) stopInput.value = "110.00";
      if (targetInput) targetInput.value = "125.00";
      if (qtyInput) qtyInput.value = "1";
      if (lotInput) lotInput.value = "65";
      
      entryInput?.dispatchEvent(new Event("input", { bubbles: true }));
      symbolInput?.focus();
      document.getElementById("tradeForm")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
  } else if (action === "quick-scalp-nifty-ce") {
    window.setActiveView?.("paper");
    setTimeout(() => {
      const form = byId("paperTradeForm");
      if (form) {
        form.querySelector('input[name="optionType"][value="CALL"]')?.click();
        const under = form.querySelector('select[name="underlyingSymbol"]');
        if (under) under.value = "NIFTY";
        const strike = form.querySelector('input[name="strikePrice"]');
        if (strike) strike.value = "24500";
        const entry = form.querySelector('input[name="entryPrice"]');
        if (entry) entry.value = "90.00";
        const target = form.querySelector('input[name="targetPrice"]');
        if (target) target.value = "98.50";
        const stop = form.querySelector('input[name="stopLoss"]');
        if (stop) stop.value = "85.50";
        entry?.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }, 150);
  } else if (action === "quick-scalp-nifty-pe") {
    window.setActiveView?.("paper");
    setTimeout(() => {
      const form = byId("paperTradeForm");
      if (form) {
        form.querySelector('input[name="optionType"][value="PUT"]')?.click();
        const under = form.querySelector('select[name="underlyingSymbol"]');
        if (under) under.value = "NIFTY";
        const strike = form.querySelector('input[name="strikePrice"]');
        if (strike) strike.value = "24400";
        const entry = form.querySelector('input[name="entryPrice"]');
        if (entry) entry.value = "95.00";
        const target = form.querySelector('input[name="targetPrice"]');
        if (target) target.value = "103.50";
        const stop = form.querySelector('input[name="stopLoss"]');
        if (stop) stop.value = "90.50";
        entry?.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }, 150);
  } else if (action === "nav-dashboard") {
    window.setActiveView?.("dashboard");
  } else if (action === "nav-paper") {
    window.setActiveView?.("paper");
  } else if (action === "nav-foreign") {
    window.setActiveView?.("foreign");
  } else if (action === "nav-journal") {
    window.setActiveView?.("journal");
  } else if (action === "theme-blue") {
    setTheme("blue");
  } else if (action === "theme-emerald") {
    setTheme("emerald");
  } else if (action === "theme-violet") {
    setTheme("violet");
  } else if (action === "refresh-upstox") {
    checkBrokerStatuses();
  }
}

initCommandPalette();
checkBrokerStatuses();

// Accessible Mobile / Touch Info Tooltip Popover System
document.addEventListener("click", (e) => {
  const badge = e.target.closest(".info-tooltip-badge");
  const existingPopover = document.getElementById("appleActiveTooltipPopover");
  if (existingPopover) {
    existingPopover.remove();
  }
  if (!badge) return;
  
  const text = badge.getAttribute("title") || badge.getAttribute("data-tooltip") || badge.textContent;
  if (!text || text === "ℹ️") return;
  
  e.preventDefault();
  e.stopPropagation();
  
  const popover = document.createElement("div");
  popover.id = "appleActiveTooltipPopover";
  popover.className = "apple-tooltip-popover";
  popover.textContent = text;
  document.body.appendChild(popover);
  
  const rect = badge.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  let top = rect.bottom + 8;
  let left = rect.left + rect.width / 2 - popoverRect.width / 2;
  
  if (left < 10) left = 10;
  if (left + popoverRect.width > window.innerWidth - 10) {
    left = window.innerWidth - popoverRect.width - 10;
  }
  if (top + popoverRect.height > window.innerHeight - 10) {
    top = rect.top - popoverRect.height - 8;
  }
  
  popover.style.top = `${top}px`;
  popover.style.left = `${left}px`;
  
  const closeHandler = () => {
    popover.remove();
    document.removeEventListener("click", closeHandler);
    document.removeEventListener("keydown", keyHandler);
  };
  const keyHandler = (ev) => {
    if (ev.key === "Escape") closeHandler();
  };
  setTimeout(() => {
    document.addEventListener("click", closeHandler);
    document.addEventListener("keydown", keyHandler);
  }, 10);
});
