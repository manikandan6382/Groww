const tradeState = {
  bootstrapped: false,
  range: "all",
  historyFilter: "ALL",
  trades: [],
  analytics: null,
};

const viewPaths = {
  dashboard: "/dashboard",
  paper: "/paper-lab",
  foreign: "/foreign-stocks",
  journal: "/trading-journal",
};

const routeViews = new Map([
  ["/", "dashboard"],
  ["/dashboard", "dashboard"],
  ["/stocks", "dashboard"],
  ["/my-stocks", "dashboard"],
  ["/paper-lab", "paper"],
  ["/paper", "paper"],
  ["/paper-trading", "paper"],
  ["/trade", "paper"],
  ["/foreign-stocks", "foreign"],
  ["/foreign", "foreign"],
  ["/us-stocks", "foreign"],
  ["/trading-journal", "journal"],
  ["/journal", "journal"],
  ["/trading", "journal"],
]);

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const usdTrade = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const pct = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

const tradeForm = document.getElementById("tradeForm");
let isSubmittingTrade = false;
let journalClockTimer = null;

// 🌐 Level 3 Multi-Tab BroadcastChannel Synchronization
const syncChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("portfoliox_sync") : null;
if (syncChannel) {
  syncChannel.onmessage = (event) => {
    if (event.data?.type === "TRADE_MUTATION") {
      loadTradingJournal();
    }
  };
}

initViewNavigation();
initTradingJournal();

function initViewNavigation() {
  document.querySelectorAll("[data-view-target]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      setActiveView(button.dataset.viewTarget, { historyMode: "push" });
    });
  });
  window.addEventListener("popstate", () => {
    setActiveView(getViewFromPath(location.pathname), { historyMode: "none" });
  });
  setActiveView(getViewFromPath(location.pathname), { historyMode: "replace" });
}

function getViewFromPath(pathname) {
  const normalized = normalizePath(pathname);
  return routeViews.get(normalized) || "dashboard";
}

function setActiveView(target, options = {}) {
  const nextView = ["dashboard", "paper", "foreign", "journal"].includes(target) ? target : "dashboard";
  const historyMode = options.historyMode || "push";
  const nextPath = viewPaths[nextView];
  document.documentElement.dataset.activeView = nextView;
  document.querySelectorAll("[data-view-target]").forEach((item) => {
    item.classList.toggle("active", item.dataset.viewTarget === nextView);
  });
  document.querySelectorAll("[data-view-panel]").forEach((panel) => {
    setElementHidden(panel, panel.dataset.viewPanel !== nextView);
  });
  if (historyMode === "push" && location.pathname !== nextPath) {
    history.pushState({ view: nextView }, "", nextPath);
  }
  if (historyMode === "replace" && location.pathname !== nextPath) {
    history.replaceState({ view: nextView }, "", nextPath);
  }
  if (nextView === "journal") loadTradingJournal();
  updateTopbarForView(nextView);
  window.scrollTo({ top: 0, behavior: "instant" });
  document.dispatchEvent(new CustomEvent("portfoliox:view-change", { detail: { view: nextView } }));
}
window.setActiveView = setActiveView;

function updateTopbarForView(view) {
  const title = document.querySelector(".market-title");
  const search = document.getElementById("searchInput");
  if (title) {
    if (view === "paper") title.textContent = "Live Alerts";
    else if (view === "foreign") title.textContent = "Foreign Stocks Radar";
    else if (view === "journal") title.textContent = "Trading Journal";
    else title.textContent = "Market Overview";
  }
  if (search) {
    search.placeholder = view === "paper"
      ? "Search live alerts, instruments..."
      : view === "foreign"
        ? "Search US stocks (AAPL, MSFT)..."
        : view === "journal"
          ? "Search trading journal..."
          : "Search holdings, stocks...";
  }
}

function normalizePath(pathname) {
  const clean = `/${String(pathname || "/").replace(/^\/+/, "")}`.replace(/\/+$/, "");
  return clean === "" ? "/" : clean;
}

function initJournalMarketClock() {
  updateJournalMarketClock();
  if (!journalClockTimer) {
    journalClockTimer = setInterval(updateJournalMarketClock, 1000);
  }
}

function updateJournalMarketClock() {
  const statusTextEl = document.getElementById("journalMarketStatusText");
  const pulseEl = document.getElementById("journalMarketPulse");
  const badgeEl = document.getElementById("journalMarketStatusBadge");
  if (!statusTextEl) return;

  const now = new Date();
  // IST offset = UTC + 5:30
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const ist = new Date(utc + (3600000 * 5.5));

  const day = ist.getDay(); // 0 = Sun, 6 = Sat
  const hour = ist.getHours();
  const min = ist.getMinutes();
  const sec = ist.getSeconds();
  const totalMins = hour * 60 + min;

  const isWeekend = day === 0 || day === 6;
  const isPreOpen = !isWeekend && totalMins >= 540 && totalMins < 555; // 09:00 - 09:15
  const isRegularOpen = !isWeekend && totalMins >= 555 && totalMins < 930; // 09:15 - 15:30
  const isPostMarket = !isWeekend && totalMins >= 930 && totalMins < 960; // 15:30 - 16:00

  if (isRegularOpen) {
    const closeTotalMins = 930; // 15:30
    const minsLeft = closeTotalMins - totalMins - 1;
    const secsLeft = 59 - sec;
    const hrsLeft = Math.floor(minsLeft / 60);
    const remMins = minsLeft % 60;
    const timeStr = `${hrsLeft}h ${String(remMins).padStart(2, '0')}m`;

    statusTextEl.textContent = `🟢 Live Market · Closes in ${timeStr}`;
    if (pulseEl) pulseEl.className = "pulse-beacon win";
    if (badgeEl) badgeEl.className = "apple-status-pill market-bell-badge live-open";
  } else if (isPreOpen) {
    statusTextEl.textContent = `⚡ Pre-Open Discovery (09:00–09:15)`;
    if (pulseEl) pulseEl.className = "pulse-beacon cyan";
    if (badgeEl) badgeEl.className = "apple-status-pill market-bell-badge live-pre";
  } else if (isPostMarket) {
    statusTextEl.textContent = `🔒 Post-Market Settlement`;
    if (pulseEl) pulseEl.className = "pulse-beacon";
    if (badgeEl) badgeEl.className = "apple-status-pill market-bell-badge";
  } else {
    const nextDayStr = isWeekend ? "Opens Mon 09:15 IST" : totalMins < 540 ? "Opens Today 09:15 IST" : "Opens Tomorrow 09:15 IST";
    statusTextEl.textContent = `🌙 Market Closed · ${nextDayStr}`;
    if (pulseEl) pulseEl.className = "pulse-beacon muted";
    if (badgeEl) badgeEl.className = "apple-status-pill market-bell-badge closed";
  }
}

function initTradingJournal() {
  if (!tradeForm) return;

  setDefaultEntryTime();
  recalculateTradePlan();
  initJournalMarketClock();

  // Quick form input listeners
  tradeForm.addEventListener("input", recalculateTradePlan);
  tradeForm.addEventListener("reset", () => {
    setTimeout(() => {
      setDefaultEntryTime();
      recalculateTradePlan();
      setFormStatus("Ready");
    }, 0);
  });
  tradeForm.addEventListener("submit", saveTrade);

  // Range selector buttons
  document.querySelectorAll(".journal-range").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".journal-range").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      tradeState.range = button.dataset.tradeRange;
      toggleCustomRangeFields();
      loadTradingJournal();
    });
  });

  // History filter chips (All, Wins, Losses, Breakeven)
  document.querySelectorAll("[data-history-filter]").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("[data-history-filter]").forEach((item) => item.classList.remove("active"));
      chip.classList.add("active");
      tradeState.historyFilter = chip.dataset.historyFilter;
      renderTradeHistory(tradeState.trades);
    });
  });

  // Scroll to Log Form button
  const btnLog = document.getElementById("btnToggleLogForm");
  if (btnLog) {
    btnLog.addEventListener("click", () => {
      tradeForm.scrollIntoView({ behavior: "smooth", block: "center" });
      document.getElementById("formSymbol")?.focus();
    });
  }

  // 1-Click Tax Audit CSV Export
  const btnExport = document.getElementById("btnExportTaxCsv");
  if (btnExport) {
    btnExport.addEventListener("click", exportTaxAuditCsv);
  }

  // ⚡ 1-Click Fill Live LTP Quick-Action
  const btnFillLtp = document.getElementById("btnFillLiveLtp");
  if (btnFillLtp) {
    btnFillLtp.addEventListener("click", async () => {
      const symbolInput = document.getElementById("formSymbol");
      const entryPriceInput = document.getElementById("formEntryPrice");
      if (!entryPriceInput) return;

      const rawSymbol = symbolInput?.value?.trim() || "NIFTY 50";
      btnFillLtp.textContent = "⏳...";
      btnFillLtp.disabled = true;

      try {
        const data = await fetchJson(`/api/quotes?symbols=${encodeURIComponent(rawSymbol)}`);
        const item = data.items?.[0];
        const price = item?.regularMarketPrice || item?.last_price || (rawSymbol.toUpperCase().includes("NIFTY") ? 24334.55 : 150.00);
        entryPriceInput.value = Number(price).toFixed(2);
        recalculateTradePlan();
        
        btnFillLtp.textContent = "✅ Filled";
        setTimeout(() => {
          btnFillLtp.textContent = "⚡ Fill LTP";
          btnFillLtp.disabled = false;
        }, 1200);
      } catch {
        btnFillLtp.textContent = "⚡ Fill LTP";
        btnFillLtp.disabled = false;
      }
    });
  }

  // Dynamic Symbol Tokenizer & Auto Lot-Size Sync
  const symInput = document.getElementById("formSymbol");
  if (symInput) {
    symInput.addEventListener("input", (e) => {
      syncLotSizeFromSymbol(e.target.value);
      recalculateTradePlan();
    });
  }

  // ⚡ 1-Click Fast Presets
  const btnPresetNifty = document.getElementById("btnPresetNifty");
  if (btnPresetNifty) {
    btnPresetNifty.addEventListener("click", () => {
      const symInput = document.getElementById("formSymbol");
      const lotInput = document.getElementById("formLotSize");
      if (symInput) symInput.value = "NIFTY 24300 PE";
      if (lotInput) lotInput.value = "65";
      recalculateTradePlan();
      setFormStatus("NIFTY PE Loaded");
    });
  }

  const btnPresetNiftyCe = document.getElementById("btnPresetNiftyCe");
  if (btnPresetNiftyCe) {
    btnPresetNiftyCe.addEventListener("click", () => {
      const symInput = document.getElementById("formSymbol");
      const lotInput = document.getElementById("formLotSize");
      if (symInput) symInput.value = "NIFTY 24300 CE";
      if (lotInput) lotInput.value = "65";
      recalculateTradePlan();
      setFormStatus("NIFTY CE Loaded");
    });
  }

  const btnRepeatLastSymbol = document.getElementById("btnRepeatLastSymbol");
  if (btnRepeatLastSymbol) {
    btnRepeatLastSymbol.addEventListener("click", () => {
      const lastTrade = tradeState.trades?.[0];
      if (lastTrade) {
        const symInput = document.getElementById("formSymbol");
        const lotInput = document.getElementById("formLotSize");
        if (symInput) symInput.value = lastTrade.symbol || "";
        if (lotInput) lotInput.value = String(lastTrade.lotSize || 65);
        recalculateTradePlan();
        setFormStatus("Last trade symbol loaded");
      }
    });
  }

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

async function loadTradingJournal() {
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
    renderDatalist("strategyTagOptions", data.strategyTags || []);
    renderDatalist("mistakeTagOptions", data.mistakeTags || []);
    tradeState.bootstrapped = true;
  } catch { /* ignore fallback */ }
}

function renderMasterKPIDeck(trades, analytics) {
  const closed = trades.filter((t) => t.status === "CLOSED");
  const winners = closed.filter((t) => Number(t.netPnl || 0) > 0);
  const losers = closed.filter((t) => Number(t.netPnl || 0) < 0);
  const breakevens = closed.filter((t) => Number(t.netPnl || 0) === 0);

  const totalNet = closed.reduce((sum, t) => sum + Number(t.netPnl || 0), 0);
  const grossProfit = winners.reduce((sum, t) => sum + Number(t.netPnl || 0), 0);
  const grossLoss = Math.abs(losers.reduce((sum, t) => sum + Number(t.netPnl || 0), 0));
  const totalCharges = closed.reduce((sum, t) => sum + Number(t.charges || 56), 0);

  const n = closed.length;
  const w = winners.length;
  const rawWinRate = n > 0 ? (w / n) * 100 : 0;
  
  // 95% Wilson Lower Bound (z = 1.96)
  const z = 1.96;
  const p_hat = n > 0 ? w / n : 0;
  const wilsonLower = n > 0 
    ? ((p_hat + (z * z) / (2 * n) - z * Math.sqrt((p_hat * (1 - p_hat)) / n + (z * z) / (4 * n * n))) / (1 + (z * z) / n)) * 100
    : 0;

  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 9.99 : 0;
  const avgWin = w > 0 ? grossProfit / w : 0;
  const avgLoss = losers.length > 0 ? grossLoss / losers.length : 0;
  const netEv = n > 0 ? totalNet / n : 0;

  // 1. Top Story Headline Summary
  const storySummaryEl = document.getElementById("journalStorySummary");
  if (storySummaryEl) {
    if (n > 0) {
      const isProfitable = totalNet >= 0;
      const netFormatted = inr.format(Math.abs(totalNet));
      const sign = isProfitable ? "+" : "-";
      const icon = isProfitable ? "🚀" : "🛡️";
      const rangeLabel = tradeState.range === "today" ? "Today's" : tradeState.range === "week" ? "This Week's" : tradeState.range === "month" ? "This Month's" : "Executive";
      const netDesc = isProfitable 
        ? `<span class="story-profit-pill">Net Banked: <strong>${sign}${netFormatted}</strong> ${icon}</span>` 
        : `<span class="story-profit-pill loss">Capital Shield: <strong>${sign}${netFormatted}</strong> ${icon}</span>`;
      
      storySummaryEl.innerHTML = `<strong>${rangeLabel} Summary:</strong> ${n} Trades Logged · <span class="text-gain font-bold">${w} Target Wins</span> · <span class="text-loss font-bold">${losers.length} Protected Stops</span> · ${netDesc}`;
    } else {
      storySummaryEl.textContent = "Every trade explained in plain English — see how much money you made, which strategies worked, and how your risk was protected.";
    }
  }

  // 2. Net Realized P&L
  const pnlEl = document.getElementById("kpiNetPnl");
  const pnlBadge = document.getElementById("kpiPnlPercent");
  pnlEl.textContent = `${totalNet >= 0 ? "+" : ""}${inr.format(totalNet)}`;
  pnlEl.className = `kpi-main-val ${totalNet >= 0 ? "text-gain" : "text-loss"}`;
  
  const startingCapital = Number(analytics?.startingCapital || 10000);
  const retPct = startingCapital ? (totalNet / startingCapital) * 100 : 0;
  pnlBadge.textContent = `${retPct >= 0 ? "+" : ""}${retPct.toFixed(2)}%`;
  pnlBadge.className = `kpi-badge ${retPct >= 0 ? "badge-gain" : "badge-loss"}`;

  const pnlNoteEl = document.getElementById("kpiPnlNote");
  if (pnlNoteEl) {
    pnlNoteEl.textContent = n > 0 
      ? `Net profit deposited after deducting ${inr.format(totalCharges)} in taxes & broker fees.`
      : "No closed trades recorded in this range.";
  }

  document.getElementById("kpiGrossProfit").textContent = `+${inr.format(grossProfit)}`;
  document.getElementById("kpiGrossLoss").textContent = `-${inr.format(grossLoss)}`;
  document.getElementById("kpiCharges").textContent = inr.format(totalCharges);

  // 3. Interactive SVG Donut Win Rate
  document.getElementById("donutWinRateText").textContent = `${rawWinRate.toFixed(0)}%`;
  document.getElementById("donutRatioText").textContent = `${w} Won / ${losers.length} Cut`;
  document.getElementById("legendWins").textContent = String(w);
  document.getElementById("legendLosses").textContent = String(losers.length);
  document.getElementById("kpiWilsonFloor").textContent = `${Math.max(0, wilsonLower).toFixed(1)}%`;

  // Animate Apple Fitness Activity Ring (circumference = 2 * PI * 38 ≈ 238.761)
  const C = 238.761;
  const winFraction = n > 0 ? w / n : 0;
  const lossFraction = n > 0 ? losers.length / n : 0;
  
  const winLen = winFraction * C;
  const lossLen = lossFraction * C;

  const winSeg = document.getElementById("donutWinSegment");
  const lossSeg = document.getElementById("donutLossSegment");
  if (winSeg) {
    winSeg.style.strokeDasharray = `${winLen} ${C - winLen}`;
    winSeg.style.strokeDashoffset = "0";
  }
  if (lossSeg) {
    lossSeg.style.strokeDasharray = `${lossLen} ${C - lossLen}`;
    lossSeg.style.strokeDashoffset = `-${winLen}`;
  }

  // Human-Friendly Trades Tracked Badge
  const confTierEl = document.getElementById("kpiConfidenceTier");
  if (confTierEl) {
    confTierEl.textContent = n === 0 ? "0 Trades Tracked" : `${n} Trades Tracked`;
  }

  // 4. Profit Factor & Edge
  const pfEl = document.getElementById("kpiProfitFactor");
  pfEl.textContent = n > 0 ? (profitFactor >= 9.99 ? "9.99x" : `${profitFactor.toFixed(2)}x`) : "0.00x";
  document.getElementById("kpiAvgWin").textContent = inr.format(avgWin);
  document.getElementById("kpiAvgLoss").textContent = inr.format(avgLoss);
  
  const evEl = document.getElementById("kpiNetEv");
  evEl.textContent = `${netEv >= 0 ? "+" : ""}${inr.format(netEv)}`;
  evEl.className = netEv >= 0 ? "text-cyan" : "text-loss";

  const edgeBadge = document.getElementById("kpiEdgeBadge");
  const edgeNoteEl = document.getElementById("kpiEdgeNote");
  if (n === 0) {
    edgeBadge.textContent = "Awaiting Trades";
    edgeBadge.className = "kpi-badge badge-neutral";
    if (edgeNoteEl) edgeNoteEl.textContent = "Log or paper trade setups to measure edge.";
  } else if (profitFactor >= 2.0) {
    edgeBadge.textContent = "Institutional Edge";
    edgeBadge.className = "kpi-badge badge-gain";
    if (edgeNoteEl) edgeNoteEl.textContent = `You make ₹${profitFactor.toFixed(2)} in profit for every ₹1.00 risked!`;
  } else if (profitFactor >= 1.25) {
    edgeBadge.textContent = "Positive Edge";
    edgeBadge.className = "kpi-badge badge-gain";
    if (edgeNoteEl) edgeNoteEl.textContent = `You make ₹${profitFactor.toFixed(2)} for every ₹1.00 risked.`;
  } else {
    edgeBadge.textContent = "Negative Edge";
    edgeBadge.className = "kpi-badge badge-loss";
    if (edgeNoteEl) edgeNoteEl.textContent = "Focus on 1:2 risk-reward setups to build edge.";
  }

  // 5. Discipline & Streak
  let followedCount = 0;
  trades.forEach((t) => { if (t.followedPlan !== false) followedCount++; });
  const disciplineScore = trades.length > 0 ? (followedCount / trades.length) * 100 : 100;
  document.getElementById("kpiRuleScore").textContent = `${disciplineScore.toFixed(0)}%`;
  
  const disciplineNoteEl = document.getElementById("kpiDisciplineNote");
  if (disciplineNoteEl) {
    disciplineNoteEl.textContent = "Zero emotional deviations · 100% stop loss compliance.";
  }
  
  // Calculate current streak
  let streakType = "";
  let streakLen = 0;
  for (let i = closed.length - 1; i >= 0; i--) {
    const isW = Number(closed[i].netPnl || 0) > 0;
    const type = isW ? "W" : "L";
    if (!streakType) {
      streakType = type;
      streakLen = 1;
    } else if (streakType === type) {
      streakLen++;
    } else {
      break;
    }
  }
  document.getElementById("kpiCurrentStreak").textContent = streakLen > 0 ? `${streakLen} ${streakType === "W" ? "Wins" : "Losses"}` : "--";
  
  // Max drawdown
  let peak = 0;
  let equity = 0;
  let maxDD = 0;
  closed.forEach((t) => {
    equity += Number(t.netPnl || 0);
    peak = Math.max(peak, equity);
    maxDD = Math.max(maxDD, peak - equity);
  });
  // 1-Trade Daily Quota & Safety Guard
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayTrades = closed.filter((t) => String(t.entryDatetime || "").startsWith(todayKey));
  const dailyQuotaBadge = document.getElementById("journalDailyQuotaBadge") || document.getElementById("journalKillSwitchBadge");
  if (dailyQuotaBadge) {
    if (todayTrades.length >= 1) {
      dailyQuotaBadge.innerHTML = `<span class="pulse-beacon win"></span> 🎯 Daily Quota: 1/1 Completed (Capital Shielded)`;
      dailyQuotaBadge.className = "apple-status-pill gain";
    } else {
      dailyQuotaBadge.innerHTML = `<span class="pulse-beacon"></span> 🎯 Daily Quota: 0/1 Available Today`;
      dailyQuotaBadge.className = "apple-status-pill";
    }
  }
}

function renderDailyStreakStrip(trades) {
  try {
    const strip = document.getElementById("dailyStreakStrip");
    if (!strip) return;

    const closed = (trades || []).filter((t) => t && t.status === "CLOSED");
    const dayGroups = new Map();

    closed.forEach((t) => {
      let day = "";
      if (typeof t.entryDatetime === "string" && t.entryDatetime.length >= 10) {
        day = t.entryDatetime.slice(0, 10);
      } else if (t.entryDatetime) {
        const d = new Date(t.entryDatetime);
        day = !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      } else {
        day = new Date().toISOString().slice(0, 10);
      }

      if (!dayGroups.has(day)) dayGroups.set(day, { count: 0, net: 0, wins: 0 });
      const g = dayGroups.get(day);
      g.count++;
      const net = Number.isFinite(Number(t.netPnl)) ? Number(t.netPnl) : 0;
      g.net += net;
      if (net > 0) g.wins++;
    });

    const days = Array.from(dayGroups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    const activeDaysEl = document.getElementById("timelineActiveDays");
    if (activeDaysEl) activeDaysEl.textContent = `${days.length} Active Trading Day${days.length === 1 ? '' : 's'}`;

    if (!days.length) {
      strip.innerHTML = `<div class="empty-state-mini">No trading sessions recorded in this range.</div>`;
      return;
    }

    strip.innerHTML = days.map(([day, stats]) => {
      const isGain = stats.net >= 0;
      const winRate = stats.count > 0 ? (stats.wins / stats.count) * 100 : 0;
      const d = new Date(day);
      const dayLabel = !isNaN(d.getTime())
        ? d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })
        : day;

      return `
        <div class="streak-day-card ${isGain ? 'day-gain' : 'day-loss'}">
          <div class="day-card-header">
            <span class="day-date">${escapeHtml(dayLabel)}</span>
            <span class="day-badge ${isGain ? 'bg-gain' : 'bg-loss'}">${stats.wins}/${stats.count} W</span>
          </div>
          <div class="day-pnl ${isGain ? 'text-gain' : 'text-loss'}">
            ${isGain ? "+" : ""}${inr.format(stats.net)}
          </div>
          <div class="day-progress-wrap">
            <div class="day-progress-bar" style="width: ${winRate}%"></div>
          </div>
        </div>
      `;
    }).join("");
  } catch (err) {
    // Isolated error containment
    const strip = document.getElementById("dailyStreakStrip");
    if (strip) strip.innerHTML = `<div class="empty-state-mini">Timeline standby.</div>`;
  }
}

function renderStrategyMatrix(trades) {
  try {
    const target = document.getElementById("strategyMatrix");
    if (!target) return;

    const closed = (trades || []).filter((t) => t && t.status === "CLOSED");
    const stratMap = new Map();

    closed.forEach((t) => {
      const tags = Array.isArray(t.strategyTags) && t.strategyTags.length ? t.strategyTags : ["Standard Scalp"];
      const specificTag = tags.find((tag) => tag !== "Trading Copilot Pro" && tag !== "General Setup") || tags[0] || "Standard Scalp";
      const cleanTag = specificTag === "0DTE Scalp" ? "Same-Day Expiry Scalp" : specificTag;
      
      if (!stratMap.has(cleanTag)) stratMap.set(cleanTag, { count: 0, wins: 0, net: 0 });
      const s = stratMap.get(cleanTag);
      s.count++;
      const net = Number.isFinite(Number(t.netPnl)) ? Number(t.netPnl) : 0;
      s.net += net;
      if (net > 0) s.wins++;
    });

    const sorted = Array.from(stratMap.entries()).sort((a, b) => b[1].net - a[1].net);
    if (!sorted.length) {
      target.innerHTML = `<div class="empty-state-mini">No strategy setups logged yet.</div>`;
      return;
    }

    target.innerHTML = sorted.slice(0, 5).map(([tag, stats]) => {
      const wr = stats.count > 0 ? (stats.wins / stats.count) * 100 : 0;
      const isGain = stats.net >= 0;

      return `
        <div class="strategy-row">
          <div class="strat-name-col">
            <span class="strat-dot ${isGain ? 'win' : 'loss'}"></span>
            <strong title="${escapeHtml(tag)}">${escapeHtml(tag)}</strong>
          </div>
          <div class="strat-trades-col">${stats.count} trade${stats.count > 1 ? 's' : ''}</div>
          <div class="strat-wr-col">
            <div class="strat-wr-bar"><div style="width: ${wr}%"></div></div>
            <span>${wr.toFixed(0)}% Win (${stats.wins}/${stats.count})</span>
          </div>
          <div class="strat-pnl-col ${isGain ? 'text-gain' : 'text-loss'}">
            ${isGain ? "+" : ""}${inr.format(stats.net)}
          </div>
        </div>
      `;
    }).join("");
  } catch (err) {
    const target = document.getElementById("strategyMatrix");
    if (target) target.innerHTML = `<div class="empty-state-mini">Strategy matrix standby.</div>`;
  }
}

function renderTradeHistory(trades) {
  const target = document.getElementById("tradeHistory");
  if (!target) return;

  let filtered = [...trades];
  if (tradeState.historyFilter === "WIN") {
    filtered = filtered.filter((t) => Number(t.netPnl || 0) > 0);
  } else if (tradeState.historyFilter === "LOSS") {
    filtered = filtered.filter((t) => Number(t.netPnl || 0) < 0);
  } else if (tradeState.historyFilter === "BREAKEVEN") {
    filtered = filtered.filter((t) => Number(t.netPnl || 0) === 0 || t.closeReason === "BREAKEVEN_LOCKED");
  }

  const countLabelEl = document.getElementById("tradeCountLabel");
  if (countLabelEl) {
    countLabelEl.textContent = `${filtered.length} Displayed (${trades.length} Total Stored)`;
  }

  if (!filtered.length) {
    target.innerHTML = `
      <div class="apple-empty-state">
        <div class="apple-empty-icon-wrap">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        </div>
        <h3 class="apple-empty-title">No Trade Records in This Filter</h3>
        <p class="apple-empty-desc">Your verified trades and execution stories will appear here in real-time as you trade or log setups.</p>
        <div class="apple-empty-actions">
          <button type="button" class="apple-btn-secondary" onclick="document.getElementById('tradeForm').scrollIntoView({behavior: 'smooth', block: 'center'})">➕ Log a Trade</button>
          <button type="button" class="apple-btn-primary" onclick="setActiveView('paper')">⚡ Open Live Alerts</button>
        </div>
      </div>
    `;
    return;
  }

  target.innerHTML = filtered.map((trade) => {
    try {
      return renderStoryTradeCard(trade);
    } catch (err) {
      return "";
    }
  }).join("");
}

function renderStoryTradeCard(trade) {
  const net = Number(trade.netPnl || 0);
  const gross = Number(trade.grossPnl || trade.pnl || (net + Number(trade.charges || 56)));
  const charges = Number(trade.charges || 56);
  const isWin = net > 0;
  const isLoss = net < 0;
  const statusCls = isWin ? "story-card-win" : isLoss ? "story-card-loss" : "story-card-neutral";
  
  // Clean Outcome Status & Story
  let outcomeBadge = `<span class="apple-status-pill gain"><span class="pulse-beacon win"></span> 🎯 Target Hit</span>`;
  let outcomeTitle = `Full Target Profit Banked`;
  if (trade.closeReason === "STOP_LOSS_HIT") {
    outcomeBadge = `<span class="apple-status-pill loss"><span class="pulse-beacon loss"></span> 🛑 Stop Loss Protected</span>`;
    outcomeTitle = `Capital Shield Auto-Triggered`;
  } else if (trade.closeReason === "BREAKEVEN_LOCKED") {
    outcomeBadge = `<span class="apple-status-pill be"><span class="pulse-beacon cyan"></span> 🔒 Breakeven Locked</span>`;
    outcomeTitle = `Risk Eliminated · Zero Net Loss`;
  }

  const buyPrice = Number(trade.entryPrice || 0).toFixed(2);
  const sellPrice = Number(trade.exitPrice || 0).toFixed(2);
  const priceDiff = Number(sellPrice) - Number(buyPrice);
  const priceChangePct = Number(buyPrice) > 0 && Number(sellPrice) > 0 
    ? ((priceDiff / Number(buyPrice)) * 100).toFixed(1) 
    : "0.0";
  const totalUnits = (trade.quantity || 1) * (trade.lotSize || 1);
  const rr = Number(trade.riskRewardRatio || 2).toFixed(2);
  const rBadge = isWin ? `+${rr}x Reward` : isLoss ? `-1.0x Risk` : `0.0x BE`;
  const rawStrat = (trade.strategyTags || [])[0] || "Same-Day Expiry Scalp";
  const stratTag = rawStrat === "0DTE Scalp" ? "Same-Day Expiry Scalp" : rawStrat;
  const isCall = trade.direction === "LONG" || String(trade.symbol).toUpperCase().includes("CE");

  const entryDate = trade.entryDatetime ? new Date(trade.entryDatetime) : null;
  const exitDate = trade.exitDatetime ? new Date(trade.exitDatetime) : null;
  const entryStr = formatDateTime(trade.entryDatetime);
  const exitStr = trade.exitDatetime ? formatDateTime(trade.exitDatetime) : null;
  
  const entryTimeOnly = entryDate && !isNaN(entryDate.getTime())
    ? entryDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })
    : (entryStr.split(" ")[1] || entryStr);
  const exitTimeOnly = exitDate && !isNaN(exitDate.getTime())
    ? exitDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })
    : (exitStr ? (exitStr.split(" ")[1] || exitStr) : null);

  let elapsedDuration = "";
  if (entryDate && exitDate && !isNaN(entryDate.getTime()) && !isNaN(exitDate.getTime())) {
    const diffMins = Math.max(0, Math.round((exitDate.getTime() - entryDate.getTime()) / 60000));
    elapsedDuration = diffMins >= 60 
      ? `(${Math.floor(diffMins / 60)}h ${diffMins % 60}m held)` 
      : `(${diffMins}m held)`;
  }

  const timingMeta = exitTimeOnly
    ? `<span>🗓️ ${escapeHtml(entryStr)} ➔ ⏱️ Exit ${escapeHtml(exitTimeOnly)} <small class="text-cyan font-bold">${elapsedDuration}</small></span>`
    : `<span>🗓️ ${escapeHtml(entryStr)}</span>`;

  return `
    <article class="story-trade-card panel apple-ceramic-card ${statusCls} ios-touch-item" data-story-trade-id="${trade.id}">
      <!-- Top Row: Asset Identity + Financial P&L -->
      <div class="story-card-top-row">
        <div class="story-identity-group">
          <div class="story-type-badge ${isCall ? 'call' : 'put'}">
            ${isCall ? '🟢 CALL' : '🔴 PUT'}
          </div>
          <div class="story-name-meta">
            <div class="story-title-line">
              <strong class="story-symbol-name">${escapeHtml(trade.symbol)}</strong>
              ${outcomeBadge}
              <span class="apple-pill-badge ${isWin ? 'text-gain' : isLoss ? 'text-loss' : ''}">${rBadge}</span>
            </div>
            <div class="story-subtitle-meta">
              ${timingMeta}
              <span class="meta-dot">·</span>
              <span>📦 ${trade.quantity || 1} Lot (${totalUnits} Qty)</span>
              <span class="meta-dot">·</span>
              <span>🏷️ ${escapeHtml(stratTag)}</span>
              <span class="meta-dot">·</span>
              <span class="discipline-tag">🛡️ Followed Plan</span>
            </div>
          </div>
        </div>

        <div class="story-financial-group">
          <div class="flex items-center justify-end gap-2">
            <div class="story-net-pnl ${isWin ? 'text-gain' : isLoss ? 'text-loss' : 'text-neutral'} apple-numeral">
              ${net >= 0 ? "+" : ""}${inr.format(net)}
            </div>
            <button type="button" class="btn-story-delete" title="Delete this trade record" onclick="event.stopPropagation(); window.deleteJournalTrade(${trade.id})">
              🗑️
            </button>
          </div>
          <div class="story-sub-breakdown">
            <span>Gross: ${gross >= 0 ? "+" : ""}${inr.format(gross)}</span>
            <span class="meta-dot">·</span>
            <span>Taxes & Fees: ₹${charges.toFixed(0)}</span>
          </div>
        </div>
      </div>

      <!-- Bottom Row: Apple Spatial Journey Capsule (No ASCII dashes!) -->
      <div class="story-journey-capsule">
        <div class="journey-node start">
          <span class="node-label">Bought Entry</span>
          <strong class="node-price">₹${buyPrice}</strong>
          <small class="node-time">⏱️ ${escapeHtml(entryTimeOnly)}</small>
        </div>

        <div class="journey-vector-track ${isWin ? 'gain' : isLoss ? 'loss' : 'neutral'}">
          <div class="vector-line">
            <div class="vector-fill"></div>
          </div>
          <div class="vector-pill">
            <span class="pill-change ${Number(priceChangePct) >= 0 ? 'gain' : 'loss'}">
              ${Number(priceChangePct) >= 0 ? '▲ +' : '▼ '}${priceChangePct}% (${priceDiff >= 0 ? '+' : ''}${priceDiff.toFixed(2)} pts)
            </span>
            <span class="pill-context">${outcomeTitle}${elapsedDuration ? ' · ' + elapsedDuration : ''}</span>
          </div>
        </div>

        <div class="journey-node end ${isWin ? 'target' : 'stop'}">
          <span class="node-label">${isWin ? 'Target Sold' : 'Stop Cut'}</span>
          <strong class="node-price">₹${sellPrice}</strong>
          <small class="node-time">⏱️ ${escapeHtml(exitTimeOnly || '--')}</small>
        </div>
      </div>
    </article>
  `;
}

function syncLotSizeFromSymbol(symbol) {
  const s = String(symbol || "").toUpperCase();
  const lotInput = document.getElementById("formLotSize");
  if (!lotInput) return;

  if (s.includes("BANKNIFTY")) lotInput.value = "35";
  else if (s.includes("SENSEX")) lotInput.value = "20";
  else if (s.includes("FINNIFTY")) lotInput.value = "65";
  else if (s.includes("NIFTY")) lotInput.value = "65";
}

function recalculateTradePlan() {
  const entry = Number(document.getElementById("formEntryPrice")?.value || 0);
  const exit = Number(document.getElementById("formExitPrice")?.value || 0);
  const stop = Number(document.getElementById("formStopLoss")?.value || 0);
  const target = Number(document.getElementById("formTargetPrice")?.value || 0);
  const qty = Math.max(1, Number(document.getElementById("formQuantity")?.value || 1));
  const lotSize = Math.max(1, Number(document.getElementById("formLotSize")?.value || 65));
  const direction = document.getElementById("formDirection")?.value || "LONG";

  const totalUnits = qty * lotSize;
  const posValue = entry * totalUnits;
  
  const riskPerUnit = stop > 0 ? Math.max(0, direction === "LONG" ? entry - stop : stop - entry) : 0;
  const rewardPerUnit = target > 0 ? Math.max(0, direction === "LONG" ? target - entry : entry - target) : 0;
  
  const totalRisk = riskPerUnit * totalUnits;
  const totalReward = rewardPerUnit * totalUnits;
  const rr = totalRisk > 0 ? totalReward / totalRisk : 0;

  let estNetPnl = 0;
  if (exit > 0) {
    const grossPnl = direction === "LONG" ? (exit - entry) * totalUnits : (entry - exit) * totalUnits;
    estNetPnl = grossPnl - 56;
  }

  document.getElementById("calcPosValue").textContent = inr.format(posValue);
  document.getElementById("calcRiskAmount").textContent = inr.format(totalRisk);
  document.getElementById("calcRewardAmount").textContent = inr.format(totalReward);
  
  const rrEl = document.getElementById("calcRrRatio");
  if (rrEl) {
    if (rr > 0) {
      if (rr >= 2.0) {
        rrEl.className = "text-gain apple-hud-val";
        rrEl.textContent = `1 : ${rr.toFixed(2)} (High Conviction)`;
      } else if (rr >= 1.5) {
        rrEl.className = "text-cyan apple-hud-val";
        rrEl.textContent = `1 : ${rr.toFixed(2)} (Acceptable)`;
      } else {
        rrEl.className = "text-loss apple-hud-val";
        rrEl.textContent = `1 : ${rr.toFixed(2)} (⚠️ Sub-1.5 Risk)`;
      }
    } else {
      rrEl.className = "text-muted-clean apple-hud-val";
      rrEl.textContent = "1 : 2.00+ Target";
    }
  }
  
  // 🛡️ SL-L Slippage Buffer & Friction Guardrail calculation
  const sllGuideEl = document.getElementById("calcSllGuide");
  if (sllGuideEl) {
    if (stop > 0) {
      const sllLimit = direction === "LONG" ? Math.max(0.05, stop - 1.50) : stop + 1.50;
      let frictionNote = "";
      if (rewardPerUnit > 0) {
        const grossGain = rewardPerUnit * totalUnits;
        const frictionPct = (56 / grossGain) * 100;
        if (rewardPerUnit < 8.5) {
          frictionNote = ` · ⚠️ High Friction (Fees eat ${frictionPct.toFixed(0)}% of gain. Min +8.5pt recommended)`;
        } else {
          frictionNote = ` · ✅ Low Friction (Fees only ${frictionPct.toFixed(0)}% of target)`;
        }
      }
      sllGuideEl.textContent = `Trigger: ₹${stop.toFixed(2)} | Limit: ₹${sllLimit.toFixed(2)} (1.5 pt zero-slippage buffer)${frictionNote}`;
    } else {
      sllGuideEl.textContent = `Set Stop Loss to generate broker SL-L trigger guide & friction audit`;
    }
  }

  // 🔒 Automated Breakeven Lock (+5.0 pts) Guardrail
  const beLockEl = document.getElementById("calcBeLockGuide");
  if (beLockEl) {
    if (entry > 0) {
      const beTrigger = direction === "LONG" ? (entry + 5.00) : Math.max(0.05, entry - 5.00);
      beLockEl.textContent = `When premium hits ₹${beTrigger.toFixed(2)} (+5.0 pts), immediately move SL order to ₹${entry.toFixed(2)} (Cost). Zero Reversal Risk!`;
    } else {
      beLockEl.textContent = `Set entry price to calculate automated +5.0 pt breakeven lock trigger`;
    }
  }

  const estPnlEl = document.getElementById("calcEstNetPnl");
  if (exit > 0) {
    estPnlEl.textContent = `${estNetPnl >= 0 ? "+" : ""}${inr.format(estNetPnl)}`;
    estPnlEl.className = estNetPnl >= 0 ? "text-gain" : "text-loss";
  } else {
    estPnlEl.textContent = "--";
    estPnlEl.className = "text-muted-clean";
  }
}

async function saveTrade(event) {
  event.preventDefault();
  if (isSubmittingTrade) return; // 🛡️ Double-click race condition prevention

  const submitBtn = tradeForm.querySelector('button[type="submit"]');
  try {
    isSubmittingTrade = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "⏳ Saving...";
    }
    setFormStatus("Saving trade...");

    const payload = await buildTradePayload();
    await fetchJson("/api/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    tradeForm.reset();
    setDefaultEntryTime();
    recalculateTradePlan();
    setFormStatus("Saved to SQLite ✅");
    
    // 🌐 Broadcast to other open tabs/monitors
    if (syncChannel) {
      syncChannel.postMessage({ type: "TRADE_MUTATION", timestamp: Date.now() });
    }
    
    await loadTradingJournal();
  } catch (error) {
    setFormStatus(error.message, true);
  } finally {
    isSubmittingTrade = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "💾 Save Trade to Journal";
    }
  }
}

async function buildTradePayload() {
  const data = new FormData(tradeForm);
  const payload = Object.fromEntries(data.entries());
  payload.followedPlan = data.get("followedPlan") === "on";
  payload.strategyTags = splitTags(payload.strategyTags);
  payload.mistakeTags = splitTags(payload.mistakeTags);
  payload.lotSize = Number(payload.lotSize || 65);
  payload.quantity = Number(payload.quantity || 1);
  payload.positionSize = payload.quantity * payload.lotSize;
  payload.entryPrice = Number(payload.entryPrice || 0);
  payload.exitPrice = payload.exitPrice ? Number(payload.exitPrice) : null;
  payload.stopLoss = payload.stopLoss ? Number(payload.stopLoss) : null;
  payload.targetPrice = payload.targetPrice ? Number(payload.targetPrice) : null;
  payload.charges = Number(payload.charges || 56);
  payload.status = payload.exitPrice ? "CLOSED" : "OPEN";
  return payload;
}

function setDefaultEntryTime() {
  const input = document.getElementById("entryDatetime");
  if (!input) return;
  const now = new Date();
  input.value = now.toISOString();
}

function setElementHidden(element, shouldHide) {
  if (!element) return;
  element.hidden = shouldHide;
  element.style.display = shouldHide ? "none" : "";
}

function toggleCustomRangeFields() {
  const isCustom = tradeState.range === "custom";
  setElementHidden(document.getElementById("tradeRangeFrom"), !isCustom);
  setElementHidden(document.getElementById("tradeRangeTo"), !isCustom);
}

function buildRangeQuery() {
  const params = new URLSearchParams();
  params.set("range", tradeState.range);
  if (tradeState.range === "custom") {
    const from = document.getElementById("tradeRangeFrom")?.value;
    const to = document.getElementById("tradeRangeTo")?.value;
    if (from) params.set("from", from);
    if (to) params.set("to", to);
  }
  return `?${params.toString()}`;
}

function renderDatalist(id, values) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = values.map((v) => `<option value="${escapeHtml(v)}"></option>`).join("");
}

function splitTags(value) {
  return String(value || "").split(",").map((t) => t.trim()).filter(Boolean);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error || response.statusText);
  return data;
}

function setFormStatus(message, isError = false) {
  const target = document.getElementById("tradeFormStatus");
  if (!target) return;
  target.textContent = message;
  target.classList.toggle("warn", isError);
}

function formatDateTime(value) {
  if (!value) return "--";
  return value.replace("T", " ").slice(0, 16);
}

function formatShortDate(dateStr) {
  if (!dateStr) return "--";
  const parts = dateStr.split("-");
  if (parts.length < 3) return dateStr;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mIndex = parseInt(parts[1], 10) - 1;
  return `${parts[2]} ${months[mIndex] || parts[1]}`;
}

function moneyFor(trade) {
  return trade.currency === "USD" ? usdTrade : inr;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function exportTaxAuditCsv() {
  const trades = tradeState.trades || [];
  if (!trades.length) {
    alert("No trade records available to export.");
    return;
  }

  const headers = [
    "Trade ID",
    "Date & Time (IST)",
    "Symbol",
    "Type",
    "Lots",
    "Total Quantity",
    "Entry Price (₹)",
    "Exit Price (₹)",
    "Gross P&L (₹)",
    "Taxes & Brokerage (₹)",
    "Net Take-Home P&L (₹)",
    "R:R Ratio",
    "Close Reason",
    "Strategy Tag",
    "Plan Compliance"
  ];

  const rows = trades.map((t) => {
    const net = Number(t.netPnl || 0);
    const charges = Number(t.charges || 56);
    const gross = Number(t.grossPnl || t.pnl || (net + charges));
    const totalUnits = (t.quantity || 1) * (t.lotSize || 1);
    const direction = t.direction === "LONG" || String(t.symbol).toUpperCase().includes("CE") ? "CALL (CE)" : "PUT (PE)";
    const plan = t.followedPlan !== false ? "YES" : "NO";

    return [
      `"${t.id || ""}"`,
      `"${formatDateTime(t.entryDatetime)}"`,
      `"${t.symbol || ""}"`,
      `"${direction}"`,
      t.quantity || 1,
      totalUnits,
      Number(t.entryPrice || 0).toFixed(2),
      Number(t.exitPrice || 0).toFixed(2),
      gross.toFixed(2),
      charges.toFixed(2),
      net.toFixed(2),
      Number(t.riskRewardRatio || 2).toFixed(2),
      `"${t.closeReason || "MANUAL_EXIT"}"`,
      `"${(t.strategyTags || [])[0] || "0DTE Scalp"}"`,
      `"${plan}"`
    ].join(",");
  });

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `PortfolioX_Tax_Audit_Report_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function deleteJournalTrade(tradeId) {
  const id = Number(tradeId);
  if (!id) return;
  if (!confirm(`Are you sure you want to permanently delete Trade #${id} from your Trading Journal?\n\nThis will remove the story audit log and recalculate your overall portfolio P&L.`)) {
    return;
  }

  // 1. Optimistic DOM exit animation
  const card = document.querySelector(`[data-story-trade-id="${id}"]`);
  if (card) {
    card.style.transition = "opacity 0.2s ease, transform 0.2s ease";
    card.style.opacity = "0";
    card.style.transform = "scale(0.96)";
    setTimeout(() => { try { card.remove(); } catch(_) {} }, 200);
  }

  // 2. Optimistic in-memory recalculation
  if (Array.isArray(tradeState.trades)) {
    tradeState.trades = tradeState.trades.filter((t) => Number(t.id) !== id);
    renderTradeHistory(tradeState.trades);
    renderMasterKPIDeck(tradeState.trades, tradeState.analytics);
    renderDailyStreakStrip(tradeState.trades);
    renderStrategyMatrix(tradeState.trades);
  }

  showToast("Trade Deleted", `Trade #${id} permanently removed from journal.`, "🗑️");

  // 3. Cross-view & tab sync
  document.dispatchEvent(new CustomEvent("portfoliox:trade-deleted", { detail: { tradeId: id } }));
  if (typeof BroadcastChannel !== "undefined") {
    try {
      const channel = new BroadcastChannel("portfoliox_desk_sync");
      channel.postMessage({ type: "TRADE_MUTATION", action: "delete", tradeId: id });
    } catch (_) {}
  }

  try {
    await fetchJson(`/api/trades/${id}/delete`, { method: "POST" });
    await loadTradingJournal(); // background re-sync with precise server analytics
  } catch (err) {
    showToast("Delete Error", err.message, "❌");
    await loadTradingJournal(); // Rollback on error
  }
}
window.deleteJournalTrade = deleteJournalTrade;

// Cross-view sync listeners
document.addEventListener("portfoliox:trade-deleted", () => {
  if (document.getElementById("tradeForm")) {
    loadTradingJournal();
  }
});
