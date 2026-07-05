const paperState = {
  loaded: false,
  lab: null,
  alertFilter: "all",
};

const optionLotSizes = {
  NIFTY: 75,
  BANKNIFTY: 35,
  FINNIFTY: 65,
  SENSEX: 20,
};
const previewOpenAlerts = [
  { id: "preview-1", symbol: "NIFTY 24500 CE", optionType: "CALL", entryDatetime: "2026-07-04T10:18", entryPrice: 26.5, lastMarkPrice: 30.75, targetPrice: 35, stopLoss: 25, quantity: 1, lotSize: 75, entryReason: "Breakout above resistance with strong volume.", preview: true },
  { id: "preview-2", symbol: "BANKNIFTY 52000 PE", optionType: "PUT", entryDatetime: "2026-07-04T10:05", entryPrice: 235.5, lastMarkPrice: 210.4, targetPrice: 185, stopLoss: 235, quantity: 1, lotSize: 35, entryReason: "Rejected intraday resistance; watching downside continuation.", preview: true },
  { id: "preview-3", symbol: "NIFTY 24400 CE", optionType: "CALL", entryDatetime: "2026-07-04T09:52", entryPrice: 66.5, lastMarkPrice: 88.25, targetPrice: 110, stopLoss: 70, quantity: 1, lotSize: 75, entryReason: "Momentum continuation after support hold.", preview: true },
];
const previewClosedAlerts = [
  { id: "closed-1", symbol: "NIFTY 24200 CE", optionType: "CALL", entryDatetime: "2026-07-04T10:15", exitDatetime: "2026-07-04T10:15", entryPrice: 90.13, exitPrice: 95, targetPrice: 95, stopLoss: 75, netPnl: 365, closeReason: "TARGET_HIT", quantity: 1, lotSize: 75, preview: true },
  { id: "closed-2", symbol: "BANKNIFTY 52100 PE", optionType: "PUT", entryDatetime: "2026-07-04T09:58", exitDatetime: "2026-07-04T09:58", entryPrice: 247.19, exitPrice: 240, targetPrice: 210, stopLoss: 240, netPnl: -251.5, closeReason: "STOP_LOSS_HIT", quantity: 1, lotSize: 35, preview: true },
  { id: "closed-3", symbol: "NIFTY 24300 PE", optionType: "PUT", entryDatetime: "2026-07-04T09:41", exitDatetime: "2026-07-04T09:41", entryPrice: 114.4, exitPrice: 120, targetPrice: 120, stopLoss: 100, netPnl: 420, closeReason: "TARGET_HIT", quantity: 1, lotSize: 75, preview: true },
  { id: "closed-4", symbol: "NIFTY 24100 CE", optionType: "CALL", entryDatetime: "2026-07-04T09:22", exitDatetime: "2026-07-04T09:22", entryPrice: 86.27, exitPrice: 90, targetPrice: 90, stopLoss: 70, netPnl: 280, closeReason: "TARGET_HIT", quantity: 1, lotSize: 75, preview: true },
  { id: "closed-5", symbol: "BANKNIFTY 51900 PE", optionType: "PUT", entryDatetime: "2026-07-04T09:05", exitDatetime: "2026-07-04T09:05", entryPrice: 205.29, exitPrice: 200, targetPrice: 180, stopLoss: 200, netPnl: -185, closeReason: "STOP_LOSS_HIT", quantity: 1, lotSize: 35, preview: true },
  { id: "closed-6", symbol: "NIFTY 24200 CE", optionType: "CALL", entryDatetime: "2026-07-03T14:15", exitDatetime: "2026-07-03T14:15", entryPrice: 86.33, exitPrice: 95, targetPrice: 95, stopLoss: 70, netPnl: 650, closeReason: "TARGET_HIT", quantity: 1, lotSize: 75, preview: true },
  { id: "closed-7", symbol: "BANKNIFTY 52100 PE", optionType: "PUT", entryDatetime: "2026-07-02T13:30", exitDatetime: "2026-07-02T13:30", entryPrice: 247.85, exitPrice: 240, targetPrice: 205, stopLoss: 240, netPnl: -275, closeReason: "STOP_LOSS_HIT", quantity: 1, lotSize: 35, preview: true },
  { id: "closed-8", symbol: "NIFTY 24400 CE", optionType: "CALL", entryDatetime: "2026-07-01T11:10", exitDatetime: "2026-07-01T11:10", entryPrice: 76.7, exitPrice: 80, targetPrice: 80, stopLoss: 62, netPnl: 247.25, closeReason: "TARGET_HIT", quantity: 1, lotSize: 75, preview: true },
];

const previewDisplay = {
  active: 3,
  triggeredToday: 2,
  totalPnl: 1250.75,
  pnlPct: 1.27,
  winRate: 64.29,
  wins: 9,
  losses: 5,
  totalTrades: 14,
};

const previewFeedAlerts = [
  { tone: "win", title: "Target Hit", detail: "NIFTY 24200 CE", badge: "Target â‚¹95.00 hit", time: "10:15 AM", pnl: 365 },
  { tone: "loss", title: "Stop Loss Hit", detail: "BANKNIFTY 52100 PE", badge: "Stop loss â‚¹240.00 hit", time: "09:58 AM", pnl: -251.5 },
  { tone: "active", title: "Watching", detail: "NIFTY 24500 CE", badge: "LTP â‚¹30.75", time: "10:25 AM", pnl: 0 },
  { tone: "win", title: "Target Hit", detail: "NIFTY 24300 PE", badge: "Target â‚¹120.00 hit", time: "09:41 AM", pnl: 420 },
  { tone: "risk", title: "Vol Spike", detail: "BANKNIFTY 52000 PE", badge: "Volume 2.4x avg", time: "10:22 AM", pnl: 0 },
  { tone: "muted", title: "Alert Muted", detail: "NIFTY 24400 CE", badge: "Muted by user", time: "09:30 AM", pnl: 0 },
];

const paperMoney = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const paperNum = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

const paperForm = document.getElementById("paperTradeForm");
const paperLab = document.getElementById("paperLab");
const paperOpenTrades = document.getElementById("paperOpenTrades");
const paperClosedTrades = document.getElementById("paperClosedTrades");
const paperLiveTrackBody = document.getElementById("paperLiveTrackBody");
const paperAlertList = document.getElementById("paperAlertList");
let paperSse = null;

initPaperLab();
window.deletePaperTradeFromUi = deletePaperTradeFromUi;

function initPaperLab() {
  if (!paperForm) return;
  paperForm.addEventListener("input", renderPaperRiskPreview);
  paperForm.querySelector('[name="underlyingSymbol"]')?.addEventListener("change", syncOptionLotSize);
  paperForm.addEventListener("reset", () => {
    setTimeout(() => {
      syncOptionLotSize();
      renderPaperRiskPreview();
      setPaperStatus("Ready");
    }, 0);
  });
  paperForm.addEventListener("submit", createPaperPosition);
  document.addEventListener("click", handlePaperTradeAction);
  paperLab.addEventListener("pointerover", handlePaperTooltipOver);
  paperLab.addEventListener("pointermove", handlePaperTooltipMove);
  paperLab.addEventListener("pointerout", handlePaperTooltipOut);
  paperLab.addEventListener("mouseover", handlePaperTooltipOver);
  paperLab.addEventListener("mousemove", handlePaperTooltipMove);
  paperLab.addEventListener("mouseout", handlePaperTooltipOut);
  paperLab.addEventListener("focusin", handlePaperTooltipFocus);
  paperLab.addEventListener("focusout", hidePaperHoverToast);
  paperLab.addEventListener("click", handlePaperAlertFilter);
  document.querySelector(".notification")?.addEventListener("click", () => {
    if (document.documentElement.dataset.activeView !== "paper") return;
    document.querySelector(".paper-alert-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  syncOptionLotSize();
  renderPaperRiskPreview();

  startLiveClock();
  connectPaperSse();

  document.addEventListener("portfoliox:view-change", (event) => {
    if (event.detail?.view === "paper") loadPaperLab();
  });

  if (document.documentElement.dataset.activeView === "paper" || location.pathname === "/paper-lab") {
    loadPaperLab();
  }
}

async function loadPaperLab() {
  if (!paperForm) return;
  setPaperStatus("Loading...");
  try {
    const lab = await fetchJson("/api/live-alerts?range=week");
    paperState.lab = lab;
    paperState.loaded = true;
    renderPaperSummary(lab);
    renderOpenPaperTrades(lab.openTrades || []);
    renderClosedPaperTrades(lab.closedTrades || []);
    renderPaperLiveTrack(lab);
    renderPaperAlerts(lab);
    renderPaperLessons(lab);
    setPaperStatus("Ready");
  } catch (error) {
    setPaperStatus(error.message, true);
  }
}

async function createPaperPosition(event) {
  event.preventDefault();
  setPaperStatus("Starting...");
  try {
    const payload = Object.fromEntries(new FormData(paperForm).entries());
    syncOptionLotSize();
    await fetchJson("/api/live-alerts/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    paperForm.reset();
    renderPaperRiskPreview();
    await loadPaperLab();
    setPaperStatus("Live alert created");
  } catch (error) {
    setPaperStatus(error.message, true);
  }
}

async function handlePaperTradeAction(event) {
  if (!event.target.closest("#paperLab")) return;
  const strikeButton = event.target.closest("[data-strike-step]");
  const lotsButton = event.target.closest("[data-lots-step]");
  const deleteButton = event.target.closest("[data-paper-delete]");
  const markButton = event.target.closest("[data-paper-mark]");
  const closeButton = event.target.closest("[data-paper-close]");
  if (!strikeButton && !lotsButton && !deleteButton && !markButton && !closeButton) return;
  event.preventDefault();

  if (strikeButton) {
    incrementStrike(Number(strikeButton.dataset.strikeStep || 0));
    return;
  }

  if (lotsButton) {
    incrementLots(Number(lotsButton.dataset.lotsStep || 0));
    return;
  }

  if (deleteButton) {
    const id = Number(deleteButton.dataset.paperDelete);
    await deletePaperTradeFromUi(id, deleteButton);
    return;
  }

  const id = Number((markButton || closeButton).dataset.paperMark || closeButton?.dataset.paperClose);
  const card = event.target.closest(".paper-position-card");
  const price = Number(card?.querySelector("[data-paper-price]")?.value);
  if (!price || price <= 0) {
    setPaperStatus("Enter a manual LTP first.", true);
    return;
  }

  setPaperStatus(closeButton ? "Closing alert..." : "Checking target/SL...");
  try {
    const endpoint = closeButton ? `/api/live-alerts/trades/${id}/close` : `/api/live-alerts/trades/${id}/mark`;
    const result = await fetchJson(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price, reason: closeButton ? "MANUAL_EXIT" : "MARK_ONLY" }),
    });
    await loadPaperLab();
    setPaperStatus(result.triggered ? formatCloseReason(result.closeReason) : "Alert checked");
  } catch (error) {
    setPaperStatus(error.message, true);
  }
}

function renderPaperSummary(lab) {
  const analytics = lab.analytics || {};
  const hasRealAlerts = Boolean((lab.openTrades || []).length || (lab.closedTrades || []).length);
  const openTrades = hasRealAlerts ? (lab.openTrades || []) : previewOpenAlerts;
  const closedTrades = hasRealAlerts ? (lab.closedTrades || []) : previewClosedAlerts;
  const pnlPct = analytics.startingCapital ? (Number(analytics.totalPnl || 0) / Number(analytics.startingCapital)) * 100 : 0;
  const previewPnl = closedTrades.reduce((sum, trade) => sum + Number(trade.netPnl || 0), 0);
  const previewWins = closedTrades.filter((trade) => Number(trade.netPnl || 0) > 0).length;
  const previewLosses = closedTrades.filter((trade) => Number(trade.netPnl || 0) < 0).length;
  const displayPnl = hasRealAlerts ? Number(analytics.totalPnl || 0) : previewDisplay.totalPnl;
  const displayWinRate = hasRealAlerts ? Number(analytics.winRate || 0) : previewDisplay.winRate;
  const displayActive = hasRealAlerts ? Number(analytics.activeTrades || 0) : previewDisplay.active;
  const avgRR = averageRewardRisk([...openTrades, ...closedTrades]);
  const bestStreak = bestWinStreak(closedTrades);
  const todayTrades = closedTrades.filter((trade) => localDateKey(parseTradeDate(trade.exitDatetime || trade.entryDatetime)) === localDateKey(new Date()));

  const triggeredTotal = hasRealAlerts ? Number(analytics.winningTrades || 0) + Number(analytics.losingTrades || 0) : closedTrades.length;
  byId("paperWeekPnl").textContent = signedMoney(displayPnl);
  byId("paperPnlPct").textContent = `${displayPnl >= 0 ? "+" : ""}${hasRealAlerts ? pnlPct.toFixed(2) : previewDisplay.pnlPct.toFixed(2)}%`;
  byId("paperWinRate").textContent = `${paperNum.format(displayWinRate)}%`;
  byId("paperTradeCount").textContent = hasRealAlerts ? `${analytics.winningTrades || 0} Wins / ${analytics.losingTrades || 0} Losses` : `${previewDisplay.wins} Wins / ${previewDisplay.losses} Losses`;
  byId("paperTriggeredToday").textContent = String(hasRealAlerts ? todayTrades.length : previewDisplay.triggeredToday);
  byId("paperTriggeredTotal").textContent = hasRealAlerts ? `${triggeredTotal} stored results` : "NSE Options";
  byId("paperActiveCount").textContent = String(displayActive);
  byId("paperMarketFeedStatus").textContent = hasRealAlerts || displayActive ? "Live" : "Waiting";
  byId("paperWeekPnl").className = displayPnl >= 0 ? "gain" : "loss";
  byId("paperPnlPct").className = displayPnl >= 0 ? "gain" : "loss";

  // Bind to new bottom row panels
  const bottomDailyPnl = byId("bottomDailyPnl");
  if (bottomDailyPnl) {
    bottomDailyPnl.textContent = signedMoney(displayPnl);
    bottomDailyPnl.className = displayPnl >= 0 ? "gain" : "loss";
  }
  const bottomDailyPnlPct = byId("bottomDailyPnlPct");
  if (bottomDailyPnlPct) {
    bottomDailyPnlPct.textContent = `${displayPnl >= 0 ? "+" : ""}${hasRealAlerts ? pnlPct.toFixed(2) : previewDisplay.pnlPct.toFixed(2)}%`;
    bottomDailyPnlPct.className = displayPnl >= 0 ? "gain" : "loss";
  }

  const summaryTotalPnl = byId("summaryTotalPnl");
  if (summaryTotalPnl) {
    summaryTotalPnl.textContent = signedMoney(displayPnl);
    summaryTotalPnl.className = displayPnl >= 0 ? "gain" : "loss";
  }
  const summaryTotalPnlPct = byId("summaryTotalPnlPct");
  if (summaryTotalPnlPct) {
    summaryTotalPnlPct.textContent = `${displayPnl >= 0 ? "+" : ""}${hasRealAlerts ? pnlPct.toFixed(2) : previewDisplay.pnlPct.toFixed(2)}%`;
    summaryTotalPnlPct.className = displayPnl >= 0 ? "gain" : "loss";
  }

  const summaryWinRate = byId("summaryWinRate");
  if (summaryWinRate) {
    summaryWinRate.textContent = `${paperNum.format(displayWinRate)}%`;
  }
  const summaryWinLossCounts = byId("summaryWinLossCounts");
  if (summaryWinLossCounts) {
    summaryWinLossCounts.textContent = hasRealAlerts ? `${analytics.winningTrades || 0} Wins / ${analytics.losingTrades || 0} Losses` : `${previewDisplay.wins} Wins / ${previewDisplay.losses} Losses`;
  }

  const summaryTotalTrades = byId("summaryTotalTrades");
  if (summaryTotalTrades) {
    summaryTotalTrades.textContent = String(hasRealAlerts ? closedTrades.length : previewDisplay.totalTrades);
  }

  renderWeeklyVisuals({ ...lab, closedTrades });
  renderBestWorstAlerts(closedTrades);
}

function renderPaperLiveTrack(lab) {
  if (!paperLiveTrackBody) return;
  const openTrades = lab.openTrades || [];
  const firstTrade = openTrades[0];
  const status = byId("paperLiveStatus");
  if (status) {
    status.textContent = openTrades.length ? "Tracking" : "Waiting";
    status.classList.toggle("live", Boolean(openTrades.length));
  }

  if (!openTrades.length) {
    paperLiveTrackBody.innerHTML = `
      <div class="paper-live-empty">
        <strong>No live alert yet</strong>
        <span>Create a CALL or PUT alert. Once Upstox token is connected, live option LTP can watch target and stop loss.</span>
      </div>
      ${renderPaperLiveMiniStats(lab)}
    `;
    return;
  }

  paperLiveTrackBody.innerHTML = `
    <div class="paper-live-main-card">
      <div>
        <span>Watching now</span>
        <strong>${escapeHtml(firstTrade.symbol)}</strong>
        <small>${escapeHtml(firstTrade.optionType || "CALL")} Â· ${paperNum.format(firstTrade.quantity || 0)} qty</small>
      </div>
      <div class="paper-live-price">
        <span>Last LTP</span>
        <strong>${paperMoney.format(firstTrade.lastMarkPrice || firstTrade.entryPrice || 0)}</strong>
      </div>
    </div>
    <div class="paper-live-levels">
      ${openTrades.slice(0, 3).map((trade) => renderLiveLevel(trade)).join("")}
    </div>
    ${renderPaperLiveMiniStats(lab)}
  `;
}

function renderLiveLevel(trade) {
  const mark = Number(trade.lastMarkPrice || trade.entryPrice || 0);
  const target = Number(trade.targetPrice || 0);
  const stop = Number(trade.stopLoss || 0);
  const progress = target > Number(trade.entryPrice || 0)
    ? clamp(((mark - Number(trade.entryPrice || 0)) / (target - Number(trade.entryPrice || 0))) * 100, 0, 100)
    : 0;
  return `
    <article class="paper-live-level">
      <div>
        <strong>${escapeHtml(trade.symbol)}</strong>
        <span>LTP ${paperMoney.format(mark)}</span>
      </div>
      <div>
        <span>Target ${paperMoney.format(target)}</span>
        <i class="target" style="width:${progress}%"></i>
      </div>
      <div>
        <span>SL ${paperMoney.format(stop)}</span>
        <i class="stop" style="width:${clamp(100 - progress, 8, 100)}%"></i>
      </div>
    </article>
  `;
}

function renderPaperLiveMiniStats(lab) {
  const analytics = lab.analytics || {};
  return `
    <div class="paper-live-mini-stats">
      <div><span>Provider</span><strong>Upstox</strong><small>${(lab.openTrades || []).length ? "LTP watch ready" : "Token pending"}</small></div>
      <div><span>Active Alerts</span><strong>${analytics.activeTrades || 0}</strong><small>Auto trigger queue</small></div>
      <div><span>Week P&L</span><strong class="${Number(analytics.totalPnl || 0) >= 0 ? "gain" : "loss"}">${signedMoney(analytics.totalPnl || 0)}</strong><small>Alert results</small></div>
    </div>
  `;
}

function renderPaperAlerts(lab) {
  if (!paperAlertList) return;
  const hasRealAlerts = Boolean((lab.openTrades || []).length || (lab.closedTrades || []).length);
  const openTrades = hasRealAlerts ? (lab.openTrades || []) : previewOpenAlerts;
  const closedTrades = hasRealAlerts ? (lab.closedTrades || []) : previewClosedAlerts;
  const alerts = hasRealAlerts ? [
    ...openTrades.flatMap((trade) => [
      {
        tone: "active",
        title: "Watching",
        detail: `${trade.symbol} target watch`,
        badge: `${paperMoney.format(trade.targetPrice || 0)} hit`,
        time: formatTime(trade.entryDatetime),
        pnl: 0,
      },
      {
        tone: "risk",
        title: `Stop Loss Hit`,
        detail: `${trade.symbol} stop-loss watch`,
        badge: `${paperMoney.format(trade.stopLoss || 0)} hit`,
        time: formatTime(trade.entryDatetime),
        pnl: 0,
      },
    ]),
    ...closedTrades.slice(0, 5).map((trade) => {
      const isWin = Number(trade.netPnl || 0) >= 0;
      return {
        tone: isWin ? "win" : "loss",
        title: isWin ? "Target Hit" : "Stop Loss Hit",
        detail: `${trade.symbol} CE`,
        badge: isWin ? "Target Hit" : "Stop Loss",
        time: formatTime(trade.exitDatetime || trade.entryDatetime),
        pnl: Number(trade.netPnl || 0),
      };
    }),
  ] : previewFeedAlerts;

  // Update tabs badges
  const activeCount = hasRealAlerts ? openTrades.length : previewDisplay.active;
  const triggeredCount = hasRealAlerts ? closedTrades.length : 7;
  const totalCount = hasRealAlerts ? activeCount + triggeredCount : 12;

  const feedCountAll = byId("feedCountAll");
  if (feedCountAll) feedCountAll.textContent = String(totalCount);
  const feedCountActive = byId("feedCountActive");
  if (feedCountActive) feedCountActive.textContent = String(activeCount);
  const feedCountTriggered = byId("feedCountTriggered");
  if (feedCountTriggered) feedCountTriggered.textContent = String(triggeredCount);

  const filter = paperState.alertFilter;
  const visibleAlerts = alerts.filter((alert) => {
    if (filter === "active") return ["active"].includes(alert.tone);
    if (filter === "triggered") return ["win", "loss", "risk", "muted"].includes(alert.tone);
    return true;
  });

  paperAlertList.innerHTML = visibleAlerts.length
    ? visibleAlerts.slice(0, 8).map((alert) => {
      const isWin = alert.tone === "win";
      const isLoss = alert.tone === "loss";
      const isRisk = alert.tone === "risk";
      const isMuted = alert.tone === "muted";
      const isWatching = alert.tone === "active";
      const iconClass = isWin ? "target-hit" : isLoss ? "stop-loss" : isRisk ? "risk" : isMuted ? "muted" : "watching";
      const pillClass = isWin ? "gain" : isLoss ? "loss" : isRisk ? "risk" : isMuted ? "muted" : "watching";
      const displayValue = isWatching ? "Active" : isRisk ? "Triggered" : isMuted ? "Muted" : signedMoney(alert.pnl);

      let iconSvg = "";
      if (isWin) {
        iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`;
      } else if (isLoss) {
        iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>`;
      } else if (isRisk) {
        iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M4 13h4l2-8 4 14 2-6h4"/></svg>`;
      } else if (isMuted) {
        iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="m3 3 18 18"/></svg>`;
      } else {
        iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1"/></svg>`;
      }

      return `
        <article class="paper-alert-row ${alert.tone}">
          <div class="alert-icon ${iconClass}">
            ${iconSvg}
          </div>
          <div class="alert-info">
            <div class="alert-title-row">
              <strong>${escapeHtml(alert.title)}</strong>
              <small>${escapeHtml(alert.time)}</small>
            </div>
            <p>${escapeHtml(alert.detail)}</p>
          </div>
          <span class="alert-badge-pill ${pillClass}">${displayValue}</span>
        </article>
      `;
    }).join("")
    : `<div class="paper-alert-empty"><strong>No alerts yet</strong><span>Alert activity log will appear here.</span></div>`;
}

function handlePaperAlertFilter(event) {
  const button = event.target.closest(".paper-alert-tabs button");
  if (!button) return;
  const label = button.childNodes[0].textContent.trim().toLowerCase();
  paperState.alertFilter = label === "active" ? "active" : label === "triggered" ? "triggered" : "all";
  document.querySelectorAll(".paper-alert-tabs button").forEach((item) => {
    item.classList.toggle("active", item === button);
  });
  if (paperState.lab) renderPaperAlerts(paperState.lab);
}

function renderOpenPaperTrades(trades) {
  const visibleTrades = trades.length ? trades : previewOpenAlerts;
  const openCountEl = byId("paperOpenCount");
  if (openCountEl) {
    openCountEl.textContent = visibleTrades.length ? `${visibleTrades.length} Active` : "WAITING";
  }
  byId("paperActiveCount").textContent = String(visibleTrades.length);
  paperOpenTrades.innerHTML = visibleTrades.length
    ? visibleTrades.map((trade) => renderLiveAlertCard(trade)).join("") + `<a class="paper-view-all-link" href="#paperOpenTrades">View All Active Alerts â†’</a>`
    : `<div class="paper-active-empty"><strong>No active live alert yet</strong><span>Create a CALL or PUT alert on the left. It will stay here until target, stop loss, or manual exit.</span></div>`;
}

function renderClosedPaperTrades(trades) {
  const visibleTrades = trades.length ? trades : previewClosedAlerts;
  paperClosedTrades.innerHTML = visibleTrades.length
    ? visibleTrades.slice(0, 5).map((trade) => {
      const isWin = Number(trade.netPnl || 0) >= 0;
      const displayTime = formatTime(trade.exitDatetime || trade.entryDatetime);
      return `
        <tr>
          <td>${displayTime}</td>
          <td><strong>${escapeHtml(trade.symbol)}</strong></td>
          <td><span class="type-badge ${trade.optionType.toLowerCase()}">${escapeHtml(trade.optionType)}</span></td>
          <td>${isWin ? `Target ${paperMoney.format(trade.targetPrice)}` : `SL ${paperMoney.format(trade.stopLoss)}`}</td>
          <td><span class="outcome-badge ${isWin ? "gain" : "loss"}">${isWin ? "Target Hit" : "Stop Loss"}</span></td>
          <td><strong class="${isWin ? "gain" : "loss"}">${signedMoney(trade.netPnl || 0)}</strong></td>
        </tr>
      `;
    }).join("")
    : `<tr><td colspan="6" class="empty-table-cell">No triggered alerts this week.</td></tr>`;
}

function renderLiveAlertCard(trade) {
  const mark = Number(trade.lastMarkPrice || trade.entryPrice || 0);
  const lots = Number(trade.quantity || 0);
  const lotSize = Math.max(1, Number(trade.lotSize || 1));
  const units = lots * lotSize;
  const entry = Number(trade.entryPrice || 0);
  const target = Number(trade.targetPrice || 0);
  const stop = Number(trade.stopLoss || 0);
  const unrealized = (mark - entry) * units;
  const targetDistance = target ? target - mark : 0;
  const stopDistance = stop ? mark - stop : 0;
  const targetSpan = target - entry;
  const progress = targetSpan > 0 ? clamp(((mark - entry) / targetSpan) * 100, 0, 100) : 0;
  const side = trade.optionType === "PUT" ? "PUT" : "CALL";
  const movePct = percentMove(entry, mark);

  return `
    <article class="paper-position-card paper-active-card live-alert-card ${side.toLowerCase()}" data-trade-id="${trade.id}">
      <div class="paper-position-head live-alert-card-head">
        <div>
          <div class="live-alert-title-line">
            <span class="paper-side-badge ${side.toLowerCase()}">${side}</span>
            <strong>${escapeHtml(trade.symbol)}</strong>
          </div>
          <span>${formatShortDate(trade.entryDatetime)} &bull; ${paperNum.format(lots)} lot</span>
        </div>
        <span class="paper-live-pill"><i></i> WATCHING</span>
      </div>
      <div class="live-alert-card-body">
        <div class="live-alert-main-metrics">
          <div><span>Live LTP</span><strong data-ltp-value="${trade.id}" class="${movePct >= 0 ? "gain" : "loss"}">${paperMoney.format(mark || 0)}</strong><small data-move-pct="${trade.id}" class="${movePct >= 0 ? "gain" : "loss"}">${signedNumber(movePct)}%</small></div>
          <div><span>Target</span><strong>${paperMoney.format(target || 0)}</strong></div>
          <div><span>Stop Loss</span><strong>${paperMoney.format(stop || 0)}</strong></div>
          <div><span>Time</span><strong class="live-time-in-trade">${escapeHtml(timeInTrade(trade.entryDatetime))}</strong></div>
        </div>
        <div class="live-alert-side">
          ${renderMiniSparkline(trade, movePct)}
        </div>
      </div>
      <div class="paper-pnl-progress live-alert-progress-row">
        <div class="live-alert-distance">
          <span>Distance to Target</span>
          <strong data-progress-text="${trade.id}">${targetDistance >= 0 ? `${paperNum.format(targetDistance)} (${paperNum.format(progress)}%)` : `crossed (${paperNum.format(progress)}%)`}</strong>
        </div>
        <div class="paper-progress">
          <i data-progress-bar="${trade.id}" style="width:${progress}%"></i>
        </div>
        <strong data-unrealized-pnl="${trade.id}" class="live-alert-pnl-chip ${unrealized >= 0 ? "gain" : "loss"}">${signedMoney(unrealized)}</strong>
      </div>
      <div class="paper-mark-row">
        <label>
          <span>Manual LTP</span>
          <input data-paper-price data-manual-price-id="${trade.id}" type="number" step="0.05" min="0" value="${escapeHtml(mark)}" />
        </label>
        <div class="action-btn-group">
          <button data-paper-mark="${trade.id}" type="button">Check LTP</button>
          <button data-paper-close="${trade.id}" type="button" class="danger-lite">Close Alert</button>
          <button data-paper-delete="${trade.id}" onclick="event.stopPropagation(); window.deletePaperTradeFromUi(${trade.id}, this)" type="button" class="paper-delete-mini">Delete</button>
        </div>
      </div>
    </article>
  `;
}
function renderMiniSparkline(trade, movePct) {
  const seed = Math.abs(Math.round(Number(trade.entryPrice || 1) * 10));
  const values = Array.from({ length: 16 }, (_, index) => {
    const wave = Math.sin((index + seed) * 0.82) * 8;
    const trend = (movePct / 100) * index * 10;
    return 45 - wave - trend;
  });
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => `${(index / 15) * 118},${8 + ((value - min) / span) * 32}`).join(" ");
  return `
    <svg class="live-alert-sparkline" viewBox="0 0 118 48" aria-hidden="true" focusable="false">
      <polyline points="${points}" />
    </svg>
  `;
}

function renderBestWorstAlerts(trades) {
  const target = byId("paperBestWorst");
  if (!target) return;
  const closed = [...trades].filter((trade) => Number.isFinite(Number(trade.netPnl)));
  if (!closed.length) {
    target.innerHTML = `
      <div class="paper-bestworst-empty">
        <strong>No triggered alerts yet</strong>
        <span>Your best and worst alert will appear after target or stop-loss hits.</span>
      </div>
    `;
    return;
  }

  const best = closed.reduce((winner, trade) => Number(trade.netPnl || 0) > Number(winner.netPnl || 0) ? trade : winner, closed[0]);
  const worst = closed.reduce((loser, trade) => Number(trade.netPnl || 0) < Number(loser.netPnl || 0) ? trade : loser, closed[0]);
  target.innerHTML = `
    ${renderBestWorstItem(best, "Best Alert", "best")}
    ${renderBestWorstItem(worst, "Worst Alert", "worst")}
  `;
}

function renderBestWorstItem(trade, label, tone) {
  const pnl = Number(trade.netPnl || 0);
  return `
    <article class="paper-bestworst-item ${tone}">
      <span>${tone === "best" ? "â˜…" : "!"}</span>
      <div>
        <small>${escapeHtml(label)}</small>
        <strong>${escapeHtml(trade.symbol)}</strong>
        <em>${escapeHtml(formatCloseReason(trade.closeReason))}</em>
      </div>
      <b class="${pnl >= 0 ? "gain" : "loss"}">${signedMoney(pnl)}</b>
    </article>
  `;
}

function renderPaperLessons(lab) {
  const analytics = lab.analytics || {};
  const profitText = analytics.totalPnl >= 0 ? "You are positive this week." : "You are negative this week.";
  const riskText = analytics.profitFactor > 1
    ? "Winning trades are covering losses."
    : "Focus on cleaner entries or tighter stop discipline.";
  byId("paperLessons").innerHTML = `
    <strong>${escapeHtml(profitText)}</strong>
    <span>${escapeHtml(riskText)} Weekly P&L: ${signedMoney(analytics.totalPnl || 0)}</span>
  `;
}

function syncOptionLotSize() {
  if (!paperForm) return;
  const underlying = String(paperForm.querySelector('[name="underlyingSymbol"]')?.value || "NIFTY").toUpperCase();
  const lotSize = optionLotSizes[underlying] || 1;
  const lotInput = paperForm.querySelector('[name="lotSize"]');
  if (lotInput) lotInput.value = String(lotSize);
  const note = byId("paperLotNote");
  if (note) note.textContent = `1 lot = ${paperNum.format(lotSize)} ${underlying} option units`;
}

function renderPaperRiskPreview() {
  syncOptionLotSize();
  const values = Object.fromEntries(new FormData(paperForm).entries());
  const entry = Number(values.currentPrice || 0);
  const target = Number(values.targetPrice || 0);
  const stop = Number(values.stopLoss || 0);
  const quantity = Number(values.quantity || 0);
  const lotSize = Math.max(1, Number(values.lotSize || 1));
  const units = quantity * lotSize;
  const capital = entry * units;
  const risk = Math.max(0, entry - stop) * units;
  const reward = Math.max(0, target - entry) * units;
  const rr = risk ? reward / risk : 0;
  const items = [
    paperMoney.format(capital || 0),
    paperMoney.format(risk || 0),
    paperMoney.format(reward || 0),
    rr ? `1:${rr.toFixed(2)}` : "--",
  ];
  document.querySelectorAll("#paperRiskPreview strong").forEach((node, index) => {
    node.textContent = items[index];
  });
}

function incrementStrike(step) {
  const input = paperForm.querySelector('input[name="strikePrice"]');
  if (!input || !step) return;
  const current = Number(input.value || 0);
  input.value = String(Math.max(0, current + step));
  renderPaperRiskPreview();
}

function renderWeeklyVisuals(lab) {
  const trades = lab.closedTrades || [];
  const dailyTarget = byId("paperDailyBars");
  const calendarTarget = byId("paperTradeCalendar");
  if (!dailyTarget || !calendarTarget) return;

  const buckets = buildWeekBuckets(trades);
  const values = buckets.map((bucket) => bucket.pnl);
  const maxValue = Math.max(1, ...values.map((value) => Math.abs(value)));
  dailyTarget.innerHTML = buckets.map((bucket) => {
    const height = bucket.count ? Math.max(16, Math.round((Math.abs(bucket.pnl) / maxValue) * 92)) : 8;
    const cls = bucket.count ? (bucket.pnl < 0 ? "loss" : "gain") : "quiet";
    const tooltip = buildDayTooltip(bucket);
    return `
      <div class="paper-bar ${cls}" tabindex="0" data-paper-tooltip="${escapeHtml(tooltip)}">
        <span style="height:${height}px"></span>
        <small>${bucket.label}</small>
      </div>
    `;
  }).join("");

  const maxCalendarRows = 4;
  const calendarCells = Array.from({ length: maxCalendarRows }, (_, rowIndex) =>
    buckets.map((bucket) => renderCalendarCell(bucket, rowIndex, maxCalendarRows)).join("")
  ).join("");
  calendarTarget.innerHTML = `
    <div class="paper-calendar-days"><b>M</b><b>T</b><b>W</b><b>T</b><b>F</b><b>S</b><b>S</b></div>
    <div class="paper-calendar-cells">${calendarCells}</div>
    <div class="paper-calendar-legend"><span><i class="gain"></i> More trades</span><span><i></i> Less trades</span></div>
  `;
}

function renderCalendarCell(bucket, tradeIndex, maxRows) {
  const trade = bucket.trades[tradeIndex];
  if (!trade) {
    return `<span class="paper-calendar-cell quiet" aria-hidden="true"></span>`;
  }

  const hiddenTradeCount = bucket.trades.length - maxRows;
  const isOverflowCell = tradeIndex === maxRows - 1 && hiddenTradeCount > 0;
  const pnl = isOverflowCell
    ? bucket.trades.slice(tradeIndex).reduce((sum, item) => sum + Number(item.netPnl || 0), 0)
    : Number(trade.netPnl || 0);
  const cls = pnl < 0 ? "loss" : "gain";
  const intensity = bucket.count > 1 ? " strong" : "";
  const overflow = isOverflowCell ? " overflow" : "";
  const label = isOverflowCell
    ? `${bucket.label}: ${hiddenTradeCount + 1} more trades`
    : `${bucket.label}: ${trade.symbol} ${signedMoney(trade.netPnl || 0)}`;
  const tooltip = isOverflowCell ? buildDayTooltip(bucket) : buildTradeTooltip(trade, bucket);

  return `<span class="paper-calendar-cell ${cls}${intensity}${overflow}" tabindex="0" aria-label="${escapeHtml(label)}" data-paper-tooltip="${escapeHtml(tooltip)}"></span>`;
}

function averageRewardRisk(trades) {
  const ratios = trades
    .map((trade) => {
      const entry = Number(trade.entryPrice || 0);
      const target = Number(trade.targetPrice || 0);
      const stop = Number(trade.stopLoss || 0);
      const risk = Math.abs(entry - stop);
      const reward = Math.abs(target - entry);
      return risk > 0 && reward > 0 ? reward / risk : 0;
    })
    .filter(Boolean);
  if (!ratios.length) return 0;
  return ratios.reduce((sum, value) => sum + value, 0) / ratios.length;
}

function buildWeekBuckets(trades) {
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekStart = getWeekStart(new Date());
  const buckets = labels.map((label, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return {
      label,
      date,
      key: localDateKey(date),
      trades: [],
      count: 0,
      invested: 0,
      pnl: 0,
      wins: 0,
      losses: 0,
    };
  });
  const bucketByKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const trade of trades) {
    const date = parseTradeDate(trade.exitDatetime || trade.entryDatetime);
    const bucket = bucketByKey.get(localDateKey(date));
    if (!bucket) continue;
    const pnl = Number(trade.netPnl || 0);
    bucket.trades.push(trade);
    bucket.count += 1;
    bucket.invested += getTradeInvestedAmount(trade);
    bucket.pnl += pnl;
    if (pnl > 0) bucket.wins += 1;
    if (pnl < 0) bucket.losses += 1;
  }

  return buckets;
}

function buildDayTooltip(bucket) {
  const dateText = bucket.date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", weekday: "short" });
  if (!bucket.count) {
    return `${dateText}\nNo live alerts`;
  }
  const symbols = bucket.trades.map((trade) => trade.symbol).slice(0, 3).join(", ");
  const extra = bucket.trades.length > 3 ? ` +${bucket.trades.length - 3} more` : "";
  return [
    dateText,
    `Alerts: ${bucket.count}`,
    `Capital watched: ${paperMoney.format(bucket.invested)}`,
    `P&L: ${signedMoney(bucket.pnl)}`,
    `Wins/Losses: ${bucket.wins}/${bucket.losses}`,
    `Alerts: ${symbols}${extra}`,
  ].join("\n");
}

function buildTradeTooltip(trade, bucket) {
  const exitDate = parseTradeDate(trade.exitDatetime || trade.entryDatetime);
  const dateText = exitDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", weekday: "short" });
  const pnl = Number(trade.netPnl || 0);
  return [
    `${dateText} Â· ${trade.symbol}`,
    `Result: ${pnl >= 0 ? "WIN" : "LOSS"}`,
    `Capital watched: ${paperMoney.format(getTradeInvestedAmount(trade))}`,
    `Entry: ${paperMoney.format(trade.entryPrice || 0)}`,
    `Exit: ${paperMoney.format(trade.exitPrice || 0)}`,
    `P&L: ${signedMoney(pnl)}`,
    `Day total: ${signedMoney(bucket.pnl)}`,
  ].join("\n");
}

function getTradeInvestedAmount(trade) {
  const storedCapital = Number(trade.capitalUsed || trade.positionSize || 0);
  if (Number.isFinite(storedCapital) && storedCapital > 0) return storedCapital;
  const units = Number(trade.quantity || 0) * Math.max(1, Number(trade.lotSize || 1));
  return Math.abs(Number(trade.entryPrice || 0) * units);
}

function getWeekStart(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const day = next.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + offset);
  return next;
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function bestWinStreak(trades) {
  let current = 0;
  let best = 0;
  for (const trade of [...trades].sort((a, b) => String(a.exitDatetime || "").localeCompare(String(b.exitDatetime || "")))) {
    if (Number(trade.netPnl || 0) > 0) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}

function percentMove(entryPrice, markPrice) {
  const entry = Number(entryPrice || 0);
  const mark = Number(markPrice || 0);
  return entry ? ((mark - entry) / entry) * 100 : 0;
}

function timeInTrade(entryDatetime) {
  const start = parseTradeDate(entryDatetime);
  const diff = Math.max(0, Date.now() - start.getTime());
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

function formatShortDate(value) {
  const date = parseTradeDate(value);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function formatTime(value) {
  const date = parseTradeDate(value);
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function parseTradeDate(value) {
  const cleanValue = typeof value === "string" ? value.replace(" ", "T") : value;
  const date = cleanValue ? new Date(cleanValue) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function handlePaperTooltipOver(event) {
  const target = event.target.closest("[data-paper-tooltip]");
  if (!target || !paperLab.contains(target)) return;
  showPaperHoverToast(target.dataset.paperTooltip, event.clientX, event.clientY);
}

function handlePaperTooltipMove(event) {
  if (!event.target.closest("[data-paper-tooltip]")) return;
  movePaperHoverToast(event.clientX, event.clientY);
}

function handlePaperTooltipOut(event) {
  const target = event.target.closest("[data-paper-tooltip]");
  if (!target) return;
  const nextTarget = event.relatedTarget?.closest?.("[data-paper-tooltip]");
  if (nextTarget === target) return;
  hidePaperHoverToast();
}

function handlePaperTooltipFocus(event) {
  const target = event.target.closest("[data-paper-tooltip]");
  if (!target) return;
  const rect = target.getBoundingClientRect();
  showPaperHoverToast(target.dataset.paperTooltip, rect.left + rect.width / 2, rect.top);
}

function showPaperHoverToast(text, x, y) {
  if (!text) return;
  const toast = getPaperHoverToast();
  toast.textContent = text;
  toast.hidden = false;
  movePaperHoverToast(x, y);
}

function movePaperHoverToast(x, y) {
  const toast = getPaperHoverToast();
  if (toast.hidden) return;
  const padding = 14;
  const rect = toast.getBoundingClientRect();
  const left = clamp(x + 14, padding, window.innerWidth - rect.width - padding);
  const top = clamp(y + 14, padding, window.innerHeight - rect.height - padding);
  toast.style.left = `${left}px`;
  toast.style.top = `${top}px`;
}

function hidePaperHoverToast() {
  const toast = document.getElementById("paperHoverToast");
  if (toast) toast.hidden = true;
}

function getPaperHoverToast() {
  let toast = document.getElementById("paperHoverToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "paperHoverToast";
    toast.className = "paper-hover-toast";
    toast.hidden = true;
    document.body.appendChild(toast);
  }
  return toast;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    ...options,
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error || response.statusText);
  return data;
}

async function deletePaperTradeFromUi(id, button) {
  const tradeId = Number(id);
  if (!tradeId) {
    setPaperStatus("Could not find trade id.", true);
    return;
  }

  const row = button?.closest(".paper-position-card, .paper-closed-row");
  setPaperStatus("Deleting...");
  if (button) {
    button.disabled = true;
    button.textContent = "Deleting...";
  }

  try {
    await fetchJson(`/api/live-alerts/trades/${tradeId}/delete`, { method: "POST" });
    row?.remove();
    await loadPaperLab();
    setPaperStatus("Live alert deleted");
  } catch (error) {
    if (button) {
      button.disabled = false;
      button.textContent = "Delete";
    }
    setPaperStatus(`Delete failed: ${error.message}`, true);
  }
}

function setPaperStatus(text, isError = false) {
  const target = byId("paperFormStatus");
  target.textContent = text;
  target.classList.toggle("warn", isError);
}

function formatCloseReason(reason) {
  const labels = {
    TARGET_HIT: "Target hit",
    STOP_LOSS_HIT: "Stop loss hit",
    MANUAL_EXIT: "Manual exit",
  };
  return labels[reason] || "Open";
}

function signedMoney(value) {
  const amount = Number(value || 0);
  return `${amount >= 0 ? "+" : "-"}${paperMoney.format(Math.abs(amount))}`;
}

function signedNumber(value) {
  const amount = Number(value || 0);
  return `${amount >= 0 ? "+" : ""}${paperNum.format(amount)}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function byId(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function startLiveClock() {
  const clockEl = document.getElementById("liveClock");
  if (!clockEl) return;
  const update = () => {
    const now = new Date();
    const options = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    };
    let formatted = now.toLocaleString("en-IN", options);
    formatted = formatted.replace("GMT+5:30", "IST").replace("pm", "PM").replace("am", "AM");
    clockEl.textContent = formatted;
  };
  update();
  setInterval(update, 1000);
}

function connectPaperSse() {
  if (paperSse) {
    try { paperSse.close(); } catch(e) {}
  }
  paperSse = new EventSource("/api/live-alerts/live-events");
  
  paperSse.addEventListener("tick", (event) => {
    try {
      const data = JSON.parse(event.data);
      const payload = data.payload || {};
      updateTradeLtpInUi(payload.tradeId, payload.ltp);
    } catch (e) {
      console.error("Error processing SSE tick:", e);
    }
  });

  const handleReloadEvent = () => {
    if (paperState.loaded) {
      loadPaperLab();
    }
  };

  paperSse.addEventListener("target_hit", handleReloadEvent);
  paperSse.addEventListener("stop_loss_hit", handleReloadEvent);
  paperSse.addEventListener("subscribed", handleReloadEvent);
  paperSse.addEventListener("unsubscribed", handleReloadEvent);
  
  paperSse.onerror = (err) => {
    console.warn("SSE connection error, retrying in 5s...", err);
    paperSse.close();
    setTimeout(connectPaperSse, 5000);
  };
}

function updateTradeLtpInUi(tradeId, ltp) {
  const card = document.querySelector(`.live-alert-card[data-trade-id="${tradeId}"]`);
  if (!card) return;
  
  const openTrades = paperState.lab?.openTrades || [];
  const trade = openTrades.find(t => Number(t.id) === Number(tradeId));
  if (!trade) return;
  
  trade.lastMarkPrice = ltp;
  
  const entry = Number(trade.entryPrice || 0);
  const target = Number(trade.targetPrice || 0);
  const stop = Number(trade.stopLoss || 0);
  const quantity = Number(trade.quantity || 0);
  const lotSize = Math.max(1, Number(trade.lotSize || 1));
  const units = quantity * lotSize;
  const unrealized = (ltp - entry) * units;
  const movePct = entry ? ((ltp - entry) / entry) * 100 : 0;
  const targetDistance = target ? target - ltp : 0;
  const stopDistance = stop ? ltp - stop : 0;
  const targetSpan = target - entry;
  const progress = targetSpan > 0 ? clamp(((ltp - entry) / targetSpan) * 100, 0, 100) : 0;
  
  const ltpEl = card.querySelector(`[data-ltp-value="${tradeId}"]`);
  if (ltpEl) {
    ltpEl.textContent = paperMoney.format(ltp);
    ltpEl.className = movePct >= 0 ? "gain" : "loss";
  }
  
  const movePctEl = card.querySelector(`[data-move-pct="${tradeId}"]`);
  if (movePctEl) {
    movePctEl.textContent = `${signedNumber(movePct)}%`;
    movePctEl.className = movePct >= 0 ? "gain" : "loss";
  }
  
  const pnlEl = card.querySelector(`[data-unrealized-pnl="${tradeId}"]`);
  if (pnlEl) {
    pnlEl.textContent = signedMoney(unrealized);
    pnlEl.className = unrealized >= 0 ? "gain" : "loss";
  }
  
  const targetDistEl = card.querySelector(`[data-target-distance="${tradeId}"]`);
  if (targetDistEl) {
    targetDistEl.textContent = targetDistance >= 0 ? `${paperNum.format(targetDistance)} away` : "target crossed";
  }
  
  const stopDistEl = card.querySelector(`[data-stop-distance="${tradeId}"]`);
  if (stopDistEl) {
    stopDistEl.textContent = stopDistance >= 0 ? `${paperNum.format(stopDistance)} buffer` : "stop crossed";
  }
  
  const progTextEl = card.querySelector(`[data-progress-text="${tradeId}"]`);
  if (progTextEl) {
    progTextEl.textContent = targetDistance >= 0 ? `${paperNum.format(targetDistance)} (${paperNum.format(progress)}%)` : `crossed (${paperNum.format(progress)}%)`;
  }
  
  const progBarEl = card.querySelector(`[data-progress-bar="${tradeId}"]`);
  if (progBarEl) {
    progBarEl.style.width = `${progress}%`;
  }
  
  const manualInput = card.querySelector(`[data-manual-price-id="${tradeId}"]`);
  if (manualInput && document.activeElement !== manualInput) {
    manualInput.value = String(ltp);
  }
}

function incrementLots(step) {
  const input = paperForm.querySelector('input[name="quantity"]');
  if (!input || !step) return;
  const current = Number(input.value || 1);
  input.value = String(Math.max(1, current + step));
  renderPaperRiskPreview();
}


