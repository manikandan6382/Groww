const paperState = {
  loaded: false,
  lab: null,
  alertFilter: "all",
  pnlRange: "week",
};

const optionLotSizes = {
  NIFTY: 75,
  BANKNIFTY: 35,
  FINNIFTY: 65,
  SENSEX: 20,
};
const previewOpenAlerts = [
  { id: 56, symbol: "NIFTY 24300 CE", underlyingSymbol: "NIFTY", strikePrice: 24300, optionType: "CALL", entryDatetime: new Date().toISOString(), entryPrice: 83.0, lastMarkPrice: 88.5, targetPrice: 102.0, stopLoss: 75.0, quantity: 1, lotSize: 65, entryReason: "ATM Scalp Practice · R:R 1:2.38", personalNotes: "[SANDBOX_MANUAL] Practice Sandbox", preview: true },
  { id: 44, symbol: "BANKNIFTY 52200 PE", underlyingSymbol: "BANKNIFTY", strikePrice: 52200, optionType: "PUT", entryDatetime: new Date().toISOString(), entryPrice: 145.0, lastMarkPrice: 162.0, targetPrice: 185.0, stopLoss: 130.0, quantity: 1, lotSize: 35, entryReason: "Bearish Breakdown Scalp · R:R 1:2.67", personalNotes: "[SANDBOX_MANUAL] Practice Sandbox", preview: true },
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
let isDeployingOrder = false;
let simulationInterval = null;

// Expose all action handlers globally on window for inline HTML onclick handlers
window.trailTradeStopLoss = trailTradeStopLoss;
window.promptEditStopLoss = promptEditStopLoss;
window.promptEditTargetPrice = promptEditTargetPrice;
window.quickBumpTargetPrice = quickBumpTargetPrice;
window.instantExitTrade = instantExitTrade;
window.handleManualLtpInput = handleManualLtpInput;
window.stepManualLtp = stepManualLtp;
window.syncManualLtp = syncManualLtp;
window.deletePaperTradeFromUi = deletePaperTradeFromUi;
window.exportPracticeTradeToJournal = exportPracticeTradeToJournal;
window.triggerVictoryConfetti = triggerVictoryConfetti;
window.executeDeployPracticeTrade = createPaperPosition;
window.executeFastDeploySignal = loadCopilotSetupIntoForm;
window.fastDeployLiveSignal = loadCopilotSetupIntoForm;
window.loadCopilotSetupIntoForm = loadCopilotSetupIntoForm;
window.loadCopilotSetupIntoJournal = loadCopilotSetupIntoJournal;
window.toggleSpreadMode = toggleSpreadMode;

initPaperLab();

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
  const btnDeploy = document.getElementById("btnDeployPracticeTrade");
  if (btnDeploy) {
    btnDeploy.addEventListener("click", (e) => {
      e.preventDefault();
      createPaperPosition(e);
    });
  }
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
  const underlyingSelect = paperForm.querySelector('[name="underlyingSymbol"]');
  try {
    const savedUnderlying = localStorage.getItem("portfoliox_pref_underlying");
    if (savedUnderlying && underlyingSelect) {
      underlyingSelect.value = savedUnderlying;
    }
  } catch (_) {}
  syncOptionLotSize();
  renderPaperRiskPreview();
  syncLiveDeskFromForm();
  initLiveDeskButtons();
  initDeskAiPresets();
  initWeekendMarketSimulation();

  paperForm.addEventListener("input", () => {
    syncLiveDeskFromForm();
    renderPaperRiskPreview();
  });
  paperForm.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      createPaperPosition();
    }
  });
  paperForm.querySelectorAll("input, select").forEach((el) => {
    el.addEventListener("change", () => {
      syncLiveDeskFromForm();
      renderPaperRiskPreview();
    });
  });

  // Daily P&L Range Filter (This Week, Last Week, This Month, All Time)
  document.querySelectorAll(".paper-pnl-range").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".paper-pnl-range").forEach((b) => b.classList.remove("active"));
      button.classList.add("active");
      paperState.pnlRange = button.dataset.pnlRange || "week";
      
      const labelMap = {
        week: "(This Week)",
        last_week: "(Last Week)",
        month: "(This Month)",
        all: "(All Time)",
      };
      const labelEl = byId("dailyPnlRangeLabel");
      if (labelEl) labelEl.textContent = labelMap[paperState.pnlRange] || "(This Week)";

      if (paperState.lab) {
        renderWeeklyVisuals(paperState.lab);
      }
    });
  });

  // 🏛️ Trading Copilot Pro 1-Click Handlers
  document.getElementById("btnDeployCopilotPractice")?.addEventListener("click", loadCopilotSetupIntoForm);
  document.getElementById("btnFastDeployLiveSignal")?.addEventListener("click", loadCopilotSetupIntoForm);
  document.getElementById("btnDeployCopilotJournal")?.addEventListener("click", loadCopilotSetupIntoJournal);
  window.loadCopilotSetupIntoForm = loadCopilotSetupIntoForm;
  window.fastDeployLiveSignal = loadCopilotSetupIntoForm;
  window.executeFastDeploySignal = loadCopilotSetupIntoForm;
  window.executeDeployPracticeTrade = createPaperPosition;
  window.loadCopilotSetupIntoJournal = loadCopilotSetupIntoJournal;

  startLiveClock();
  connectPaperSse();

  document.addEventListener("portfoliox:view-change", (event) => {
    if (event.detail?.view === "paper") loadPaperLab();
  });

  // 0ms instant synchronous dummy render
  renderOpenPaperTrades(previewOpenAlerts);
  loadPaperLab();
}

async function loadPaperLab() {
  const currentForm = document.getElementById("paperTradeForm") || paperForm;
  if (!currentForm) return;
  setPaperStatus("Loading...");
  try {
    const lab = await fetchJson("/api/live-alerts?range=week");
    paperState.lab = lab;
    paperState.loaded = true;

    // 1️⃣ Always render Section 3 Active Trades FIRST with zero blockage
    try {
      renderOpenPaperTrades(lab.openTrades || []);
    } catch (err) {
      console.error("Error in renderOpenPaperTrades:", err);
    }

    // 2️⃣ Render Summary & Analytics
    try {
      renderPaperSummary(lab);
    } catch (err) {
      console.error("Error in renderPaperSummary:", err);
    }

    // 3️⃣ Render Closed History Ledger
    try {
      renderClosedPaperTrades(lab.closedTrades || []);
    } catch (err) {
      console.error("Error in renderClosedPaperTrades:", err);
    }

    // 4️⃣ Render Live Track & Alerts
    try {
      renderPaperLiveTrack(lab);
      renderPaperAlerts(lab);
      renderPaperLessons(lab);
    } catch (err) {
      console.error("Error in live track/alerts:", err);
    }

    setPaperStatus("Ready");
  } catch (error) {
    console.error("Failed to load paper lab data:", error);
    setPaperStatus(error.message, true);
  }
}

// Level 3 Elite Desk: Cross-Tab Channel & Audio Micro-Feedback
const deskChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("portfoliox_desk_sync") : null;
if (deskChannel) {
  deskChannel.onmessage = (event) => {
    if (event.data?.type === "TRADE_MUTATION") {
      loadPaperLab();
    }
  };
}

function playTactileChime(type = "click") {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === "target") {
      // 🎯 Ascending Harmonic Major Triad (C6 -> E6 -> G6)
      const freqs = [1046.50, 1318.51, 1567.98];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.06 + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.06);
        osc.stop(ctx.currentTime + idx * 0.06 + 0.16);
      });
    } else if (type === "stop_loss") {
      // 🛑 Low Damped Minor Tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(349.23, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220.00, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.19);
    } else {
      // ⚡ Crisp Micro-Click Stepper
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1100, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.035);
    }
  } catch (_) {}
}

function showDeskToast(title, subtitle, icon = "⚡") {
  let dock = document.querySelector(".desk-toast-dock");
  if (!dock) {
    dock = document.createElement("div");
    dock.className = "desk-toast-dock";
    document.body.appendChild(dock);
  }

  const toast = document.createElement("div");
  toast.className = "desk-toast";
  toast.innerHTML = `
    <span class="desk-toast-icon">${icon}</span>
    <div class="desk-toast-body">
      <strong class="desk-toast-title">${title}</strong>
      <span class="desk-toast-sub">${subtitle}</span>
    </div>
  `;
  dock.appendChild(toast);

  // Trigger animation frame for CSS spring slide-in
  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

async function createPaperPosition(event) {
  if (event) event.preventDefault();
  if (isDeployingOrder) return;

  const currentForm = document.getElementById("paperTradeForm");
  if (!currentForm) return;

  const btnDeploy = document.getElementById("btnDeployPracticeTrade");
  const origBtnHtml = btnDeploy ? btnDeploy.innerHTML : "";

  // Pre-flight risk bracket validation
  const payload = Object.fromEntries(new FormData(currentForm).entries());
  const entry = Number(payload.currentPrice || 0);
  const stop = Number(payload.stopLoss || 0);
  const target = Number(payload.targetPrice || 0);
  const optType = payload.optionType || "CALL";
  const sym = payload.underlyingSymbol || "NIFTY";
  const strike = payload.strikePrice || "24200";
  const qty = Number(payload.quantity || 1);
  const isSpread = payload.strategyMode === "SPREAD";

  if (!entry || entry <= 0) {
    showDeskToast("⚠️ Missing Entry Price", "Please enter a valid Option Entry Price (₹).", "🛑");
    setPaperStatus("Enter Entry Price", true);
    return;
  }

  if (isSpread) {
    const hedgeStrike = Number(payload.hedgeStrikePrice || (optType === "CALL" ? Number(strike) + 100 : Number(strike) - 100));
    const hedgePrice = Number(payload.hedgePrice || (entry * 0.45));
    const netDebit = Math.max(0.05, entry - hedgePrice);
    const strikeWidth = Math.abs(hedgeStrike - Number(strike));
    const spreadType = optType === "CALL" ? "Bull Call Spread" : "Bear Put Spread";

    payload.symbol = `${sym} ${strike}/${hedgeStrike} ${spreadType}`;
    payload.currentPrice = netDebit.toFixed(2);
    payload.stopLoss = (netDebit * 0.4).toFixed(2);
    payload.targetPrice = (strikeWidth * 0.85).toFixed(2);
    payload.entryReason = `Vertical Defined-Risk Spread · Max Loss: ₹${(netDebit * (optionLotSizes[sym] || 65) * qty).toFixed(0)}`;
    payload.personalNotes = `[SPREAD_BUNDLE] [SANDBOX_MANUAL] Long ${strike} @ ₹${entry.toFixed(2)} + Short ${hedgeStrike} @ ₹${hedgePrice.toFixed(2)}`;
  } else {
    if (stop >= entry) {
      showDeskToast("⚠️ Risk Limit Warning", `Stop Loss (₹${stop.toFixed(2)}) must be below Entry Price (₹${entry.toFixed(2)})`, "🛑");
      setPaperStatus("Invalid Stop Loss", true);
      return;
    }

    if (target <= entry) {
      showDeskToast("⚠️ Target Warning", `Target Price (₹${target.toFixed(2)}) must be above Entry Price (₹${entry.toFixed(2)})`, "🎯");
      setPaperStatus("Invalid Target", true);
      return;
    }
  }

  isDeployingOrder = true;
  if (btnDeploy) {
    btnDeploy.disabled = true;
    btnDeploy.classList.add("is-loading");
    btnDeploy.innerHTML = `<span class="pad-spinner"></span> <span class="cta-text">Executing Order...</span>`;
  }
  setPaperStatus("Deploying...");

  try {
    payload.lotSize = optionLotSizes[String(sym).toUpperCase()] || 65;
    payload.isSandbox = true;
    const result = await fetchJson("/api/live-alerts/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    playTactileChime();
    const tradeItem = result?.item;
    if (tradeItem && tradeItem.status === "CLOSED") {
      showDeskToast(
        "⚡ Trade Auto-Completed",
        `${payload.symbol || sym} reached target/SL immediately at live LTP. Auto-saved to Trading Journal!`,
        "🎯"
      );
      setPaperStatus("⚡ Trade Executed & Saved to Journal");
    } else {
      showDeskToast(
        "⚡ Live Practice Order Deployed",
        `${payload.symbol || sym} · ${qty} ${qty === 1 ? "Lot" : "Lots"} (Active in Section 3)`,
        "🟢"
      );
      setPaperStatus("⚡ Trade Deployed Successfully!");
    }
    
    // Broadcast to sync other open tabs
    if (deskChannel) deskChannel.postMessage({ type: "TRADE_MUTATION" });

    await loadPaperLab();
    
    // Smooth auto-scroll down to Active Trades section for instant position monitoring
    const activeSection = document.getElementById("sectionActiveTrades");
    if (activeSection) {
      activeSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  } catch (error) {
    showDeskToast("Execution Error", error.message, "❌");
    setPaperStatus(error.message, true);
  } finally {
    isDeployingOrder = false;
    if (btnDeploy) {
      btnDeploy.disabled = false;
      btnDeploy.classList.remove("is-loading");
      btnDeploy.innerHTML = origBtnHtml;
    }
  }
}

async function handlePaperTradeAction(event) {
  if (!event.target.closest("#paperLab")) return;
  const strikeButton = event.target.closest("[data-strike-step]");
  const hedgeStrikeButton = event.target.closest("[data-hedge-strike-step]");
  const lotsButton = event.target.closest("[data-lots-step]");
  const deleteButton = event.target.closest("[data-paper-delete]");
  const markButton = event.target.closest("[data-paper-mark]");
  const closeButton = event.target.closest("[data-paper-close]");
  if (!strikeButton && !hedgeStrikeButton && !lotsButton && !deleteButton && !markButton && !closeButton) return;
  event.preventDefault();

  if (strikeButton) {
    incrementStrike(Number(strikeButton.dataset.strikeStep || 0));
    return;
  }

  if (hedgeStrikeButton) {
    incrementHedgeStrike(Number(hedgeStrikeButton.dataset.hedgeStrikeStep || 0));
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
  const winsCount = hasRealAlerts ? Number(analytics.winningTrades || 0) : previewDisplay.wins;
  const lossesCount = hasRealAlerts ? Number(analytics.losingTrades || 0) : previewDisplay.losses;
  const totalCount = hasRealAlerts ? (winsCount + lossesCount) : previewDisplay.totalTrades;
  const currentTotalVal = 100000 + displayPnl;

  // 1️⃣ SECTION 1: Top Scoreboard 2-Row Updates
  const scoreVal = byId("scoreboardCurrentValue");
  if (scoreVal) scoreVal.textContent = paperMoney.format(currentTotalVal);
  const scorePnl = byId("scoreboardNetPnl");
  if (scorePnl) {
    scorePnl.textContent = `${displayPnl >= 0 ? "+" : ""}${paperMoney.format(displayPnl)}`;
    scorePnl.className = `score-val apple-numeral ${displayPnl >= 0 ? "text-gain" : "text-loss"}`;
  }
  const scorePnlPct = byId("scoreboardPnlPct");
  if (scorePnlPct) {
    const calcPct = (displayPnl / 100000) * 100;
    scorePnlPct.textContent = `${calcPct >= 0 ? "+" : ""}${calcPct.toFixed(2)}%`;
    scorePnlPct.className = `score-badge apple-pill-badge ${calcPct >= 0 ? "badge-green" : "badge-loss"}`;
  }
  const scoreTrades = byId("scoreboardTotalTrades");
  if (scoreTrades) scoreTrades.textContent = String(totalCount);
  const scoreWins = byId("scoreboardWins");
  if (scoreWins) scoreWins.textContent = String(winsCount);
  const scoreLosses = byId("scoreboardLosses");
  if (scoreLosses) scoreLosses.textContent = String(lossesCount);
  const scoreWinRate = byId("scoreboardWinRate");
  if (scoreWinRate) scoreWinRate.textContent = `${paperNum.format(displayWinRate)}%`;

  // Legacy IDs if present
  if (byId("paperWeekPnl")) byId("paperWeekPnl").textContent = signedMoney(displayPnl);
  if (byId("paperPnlPct")) byId("paperPnlPct").textContent = `${displayPnl >= 0 ? "+" : ""}${hasRealAlerts ? pnlPct.toFixed(2) : previewDisplay.pnlPct.toFixed(2)}%`;
  if (byId("paperWinRate")) byId("paperWinRate").textContent = `${paperNum.format(displayWinRate)}%`;
  if (byId("paperTradeCount")) byId("paperTradeCount").textContent = `${winsCount} Wins / ${lossesCount} Losses`;
  if (byId("paperTriggeredToday")) byId("paperTriggeredToday").textContent = String(hasRealAlerts ? todayTrades.length : previewDisplay.triggeredToday);
  if (byId("paperTriggeredTotal")) byId("paperTriggeredTotal").textContent = hasRealAlerts ? `${triggeredTotal} stored results` : "NSE Options";
  if (byId("paperActiveCount")) byId("paperActiveCount").textContent = String(displayActive);
  if (byId("paperMarketFeedStatus")) byId("paperMarketFeedStatus").textContent = hasRealAlerts || displayActive ? "Live" : "Waiting";

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

  const perfWinRate = byId("paperPerfWinRate");
  if (perfWinRate) {
    perfWinRate.textContent = `${paperNum.format(displayWinRate)}%`;
  }
  const perfProfitFactor = byId("paperProfitFactor");
  if (perfProfitFactor) {
    perfProfitFactor.textContent = paperNum.format(hasRealAlerts ? Number(analytics.profitFactor || 0) : 2.39);
  }
  const perfAvgRR = byId("paperAvgRR");
  if (perfAvgRR) {
    perfAvgRR.textContent = avgRR ? `1:${paperNum.format(avgRR)}` : "--";
  }
  const perfBestStreak = byId("paperBestStreak");
  if (perfBestStreak) {
    perfBestStreak.textContent = bestStreak ? `${bestStreak} wins` : "--";
  }

  syncLiveDeskFromForm();
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
      const displayValue = isWatching ? "Active" : isRisk ? "Triggered" : isMuted ? "Muted" : signedCompactMoney(alert.pnl);

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
  const visibleTrades = trades || [];
  const openCountEl = byId("paperOpenCount");
  if (openCountEl) {
    openCountEl.textContent = `${visibleTrades.length} ACTIVE`;
    openCountEl.className = visibleTrades.length ? "active-count-badge active" : "active-count-badge";
  }
  const activeCountEl = byId("paperActiveCount");
  if (activeCountEl) {
    activeCountEl.textContent = String(visibleTrades.length);
  }
  const container = document.getElementById("paperOpenTrades") || paperOpenTrades;
  if (container) {
    if (!visibleTrades.length) {
      container.innerHTML = `
        <div class="empty-trades-dock">
          <span class="empty-icon">🏖️</span>
          <strong>No Active Practice Trades</strong>
          <small>Configure an Option Scalp or Defined-Risk Spread in Section 2 above and click <strong>Deploy Live Practice Trade</strong>.</small>
        </div>
      `;
      return;
    }
    container.innerHTML = visibleTrades.map((trade) => {
      try {
        return renderLiveAlertCard(trade);
      } catch (err) {
        console.error("renderLiveAlertCard error:", err);
        return "";
      }
    }).join("");
  }
}

function exportPracticeTradeToJournal(symbol, entryPrice, exitPrice, stopLoss, targetPrice, qty, lotSize, netPnl) {
  try {
    if (typeof window.setActiveView === "function") {
      window.setActiveView("journal");
    }
    setTimeout(() => {
      const sym = document.getElementById("formSymbol");
      const entry = document.getElementById("formEntryPrice");
      const exit = document.getElementById("formExitPrice");
      const stop = document.getElementById("formStopLoss");
      const target = document.getElementById("formTargetPrice");
      const quantity = document.getElementById("formQuantity");
      const lot = document.getElementById("formLotSize");
      const reason = document.getElementById("formCloseReason");

      if (sym) sym.value = symbol || "";
      if (entry) entry.value = String(entryPrice || "");
      if (exit) exit.value = String(exitPrice || "");
      if (stop) stop.value = String(stopLoss || "");
      if (target) target.value = String(targetPrice || "");
      if (quantity) quantity.value = String(qty || 1);
      if (lot) lot.value = String(lotSize || 65);
      if (reason) {
        reason.value = Number(netPnl || 0) >= 0 ? "TARGET_HIT" : "STOP_LOSS_HIT";
      }

      if (typeof window.recalculateTradePlan === "function") {
        window.recalculateTradePlan();
      }

      const form = document.getElementById("tradeForm");
      if (form) {
        form.scrollIntoView({ behavior: "smooth", block: "center" });
        const formStatus = document.getElementById("tradeFormStatus");
        if (formStatus) formStatus.textContent = "Practice Trade Loaded";
      }
    }, 80);
  } catch (err) {
    console.error("Flywheel export failed:", err);
  }
}
window.exportPracticeTradeToJournal = exportPracticeTradeToJournal;

function renderClosedPaperTrades(trades) {
  const visibleTrades = trades.length ? trades : previewClosedAlerts;
  paperClosedTrades.innerHTML = visibleTrades.length
    ? visibleTrades.slice(0, 5).map((trade) => {
      const isWin = Number(trade.netPnl || 0) >= 0;
      const displayTime = formatTime(trade.exitDatetime || trade.entryDatetime);
      const exitP = Number(trade.exitPrice || trade.lastMarkPrice || trade.entryPrice || 0);
      return `
        <tr>
          <td>${displayTime}</td>
          <td><strong>${escapeHtml(trade.symbol)}</strong></td>
          <td><span class="type-badge ${trade.optionType.toLowerCase()}">${escapeHtml(trade.optionType)}</span></td>
          <td>${isWin ? `Target ${compactMoney(trade.targetPrice)}` : `SL ${compactMoney(trade.stopLoss)}`}</td>
          <td><span class="outcome-badge ${isWin ? "gain" : "loss"}">${isWin ? "Target Hit" : "Stop Loss"}</span></td>
          <td>
            <div class="flex items-center justify-between gap-2">
              <strong class="${isWin ? "gain" : "loss"}">${signedCompactMoney(trade.netPnl || 0)}</strong>
              <button type="button" class="btn-micro-chip" title="Export this practice trade to Journal" onclick="exportPracticeTradeToJournal('${escapeHtml(trade.symbol)}', ${Number(trade.entryPrice || 0)}, ${exitP}, ${Number(trade.stopLoss || 0)}, ${Number(trade.targetPrice || 0)}, ${Number(trade.quantity || 1)}, ${Number(trade.lotSize || 65)}, ${Number(trade.netPnl || 0)})">📝 Journal</button>
            </div>
          </td>
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
  const targetDistance = target ? Math.max(0, target - mark) : 0;
  const stopDistance = stop ? Math.max(0, mark - stop) : 0;
  const targetSpan = target - entry;
  const progress = targetSpan > 0 ? clamp(((mark - entry) / targetSpan) * 100, 0, 100) : 50;
  const side = trade.optionType === "PUT" ? "PUT" : "CALL";
  const movePct = percentMove(entry, mark);
  const isGain = unrealized >= 0;

  // Compute Smart Dynamic Trailing SL
  let smartSlPrice = stop;
  let smartSlLabel = `✏️ Edit SL (₹${stop.toFixed(2)})`;
  let canLockProfit = false;

  if (side === "CALL" && mark > entry) {
    const profitPts = mark - entry;
    // Lock 50% of the gained profit or minimum breakeven + 0.50 pts
    smartSlPrice = Math.round(Math.max(entry + 0.50, entry + profitPts * 0.5) * 20) / 20;
    if (smartSlPrice > stop) {
      canLockProfit = true;
      const ptsLocked = (smartSlPrice - entry).toFixed(2);
      smartSlLabel = `🔒 Lock SL to ₹${smartSlPrice.toFixed(2)} (+${ptsLocked} pts profit)`;
    }
  } else if (side === "PUT" && mark < entry) {
    const profitPts = entry - mark;
    smartSlPrice = Math.round(Math.min(entry - 0.50, entry - profitPts * 0.5) * 20) / 20;
    if (smartSlPrice < stop) {
      canLockProfit = true;
      const ptsLocked = (entry - smartSlPrice).toFixed(2);
      smartSlLabel = `🔒 Lock SL to ₹${smartSlPrice.toFixed(2)} (+${ptsLocked} pts profit)`;
    }
  }

  // Compute Elapsed Time & Theta Decay Warning
  const now = new Date();
  const entryDate = parseTradeDate(trade.entryDatetime) || now;
  const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - entryDate.getTime()) / 60000));
  const isThetaZone = elapsedMinutes >= 15;
  const isSandbox = trade.personalNotes?.includes("[SANDBOX_MANUAL]") || trade.isSandbox || trade.preview;
  const isSpread = String(trade.symbol || "").includes("Spread") || String(trade.personalNotes || "").includes("[SPREAD_BUNDLE]");
  const approxNetPnl = Math.round((unrealized - (unrealized === 0 ? 0 : 93.58)) * 100) / 100;

  // Option Greeks Telemetry
  const spotMap = { NIFTY: 24200, BANKNIFTY: 52200, FINNIFTY: 23800, SENSEX: 79500 };
  const spot = spotMap[String(trade.underlyingSymbol || "NIFTY").toUpperCase()] || 24200;
  const strike = Number(trade.strikePrice || spot);
  const moneyness = spot > 0 && strike > 0 ? (spot - strike) / spot : 0;
  let delta = side === "CALL" ? 0.50 + moneyness * 2.5 : -0.50 + moneyness * 2.5;
  delta = clamp(delta, side === "CALL" ? 0.05 : -0.95, side === "CALL" ? 0.95 : -0.05);
  const theta = Math.round((mark * 0.06 + 1.2) * 100) / 100;
  const ivPct = 14.2;

  return `
    <article class="paper-position-card live-pos-card ${side.toLowerCase()}" data-trade-id="${trade.id}">
      <!-- Card Top: Instrument & Real-Time P&L Hero -->
      <div class="pos-card-head">
        <div class="pos-sym-group">
          <span class="pos-type-pill ${side.toLowerCase()}">${side === "CALL" ? "▲ CALL (CE)" : "▼ PUT (PE)"}</span>
          <div class="pos-sym-title-wrap">
            <div class="flex items-center gap-2 flex-wrap">
              <strong class="pos-sym-title">${escapeHtml(trade.symbol)}</strong>
              ${isSpread ? `<span class="badge-spread-type">🛡️ SPREAD</span>` : ""}
              ${isSandbox ? `<span class="badge-sandbox-mode">SANDBOX</span>` : `<span class="badge-live-mode">LIVE UPSTOX</span>`}
              ${isThetaZone ? `<span class="badge-theta-zone" title="Holding time > 15m increases weekly option theta decay">⏳ Theta Zone (${elapsedMinutes}m)</span>` : `<span class="badge-timer-active">⏱️ ${elapsedMinutes}m active</span>`}
            </div>
            <span class="pos-meta-sub">${formatShortDate(trade.entryDatetime)} &bull; ${paperNum.format(lots)} ${lots === 1 ? "Lot" : "Lots"} (${paperNum.format(units)} units) &bull; Est. Net: ${signedMoney(approxNetPnl)}</span>
          </div>
        </div>
        <div class="pos-pnl-block">
          <span class="pos-pnl-label">Gross Unr. P&L</span>
          <strong data-unrealized-pnl="${trade.id}" class="pos-pnl-val ${isGain ? "gain" : "loss"}">${signedMoney(unrealized)}</strong>
          <small data-move-pct="${trade.id}" class="pos-pnl-pct ${isGain ? "gain" : "loss"}">${signedNumber(movePct)}%</small>
        </div>
      </div>

      <!-- Card Body: 4-Cell Telemetry Matrix with Quick Edit Steppers -->
      <div class="pos-metrics-deck">
        <div class="pos-metric-cell">
          <span class="m-label">Live LTP</span>
          <strong data-ltp-value="${trade.id}" class="m-val ${isGain ? "gain" : "loss"}">${paperMoney.format(mark || 0)}</strong>
        </div>
        <div class="pos-metric-cell">
          <span class="m-label">Entry Price</span>
          <strong class="m-val">${paperMoney.format(entry || 0)}</strong>
        </div>
        <div class="pos-metric-cell">
          <div class="flex items-center justify-between">
            <span class="m-label text-loss">Stop Loss (SL)</span>
            <button type="button" class="btn-micro-edit" title="Edit Stop Loss" onclick="promptEditStopLoss(${trade.id}, ${stop})">✏️</button>
          </div>
          <strong class="m-val text-loss">${paperMoney.format(stop || 0)}</strong>
        </div>
        <div class="pos-metric-cell">
          <div class="flex items-center justify-between">
            <span class="m-label text-gain">Target (TP)</span>
            <button type="button" class="btn-micro-edit" title="Edit Target Price" onclick="promptEditTargetPrice(${trade.id}, ${target})">✏️</button>
          </div>
          <strong class="m-val text-gain">${paperMoney.format(target || 0)}</strong>
        </div>
      </div>

      <!-- 🧮 Option Greeks Telemetry Deck -->
      <div class="pos-greeks-strip">
        <span class="greek-pill">Δ Delta: <strong>${delta >= 0 ? "+" : ""}${delta.toFixed(2)}</strong></span>
        <span class="greek-pill">Θ Theta: <strong class="text-loss">-${theta.toFixed(2)} pts/day</strong></span>
        <span class="greek-pill">IV: <strong>${ivPct}%</strong></span>
        <span class="greek-pill">Vega: <strong>+0.12 pts/1% IV</strong></span>
      </div>

      <!-- 🚄 Lively Animated Milestone Progress Rail with Live Moving Cursor -->
      <div class="pos-progress-dock">
        <div class="pos-progress-labels">
          <span class="prog-label text-loss">🛑 SL: ₹${stop.toFixed(2)} (${paperNum.format(stopDistance)} pts buffer)</span>
          <span class="prog-label font-bold text-cyan" data-progress-text="${trade.id}">⚡ ${paperNum.format(progress)}% to Target</span>
          <span class="prog-label text-gain">🎯 Target: ₹${target.toFixed(2)} (${paperNum.format(targetDistance)} pts away)</span>
        </div>
        <div class="pos-progress-track">
          <div class="pos-progress-fill" data-progress-bar="${trade.id}" style="width: ${progress}%"></div>
          <div class="pos-progress-cursor" data-progress-cursor="${trade.id}" style="left: ${progress}%">
            <div class="cursor-glow-halo"></div>
            <div class="cursor-pin-badge" data-cursor-tooltip="${trade.id}">
              LTP ₹${paperNum.format(mark)} (${signedNumber(movePct)}%)
            </div>
          </div>
        </div>
      </div>

      <!-- 🌟 THE 3 CORE IN-TRADE ACTION CONTROLS -->
      <div class="pos-primary-actions-grid">
        <!-- Button 1: Smart Trailing SL / Lock Profit -->
        <button type="button" class="btn-pos-primary btn-trail-sl ${canLockProfit ? "is-profitable" : ""}" onclick="${canLockProfit ? `window.trailTradeStopLoss(${trade.id}, ${smartSlPrice})` : `window.promptEditStopLoss(${trade.id}, ${stop})`}">
          ${smartSlLabel}
        </button>

        <!-- Button 2: Immediate Market Exit -->
        <button type="button" class="btn-pos-primary btn-exit-imm" onclick="window.instantExitTrade(${trade.id}, ${mark})">
          ⚡ Exit Immediately
        </button>

        <!-- Button 3: Edit Target Price with Quick Bump Chips -->
        <div class="pos-target-action-cell">
          <button type="button" class="btn-pos-primary btn-edit-target" onclick="window.promptEditTargetPrice(${trade.id}, ${target})">
            🎯 Target (₹${target.toFixed(2)})
          </button>
          <div class="quick-target-chips">
            <button type="button" class="chip-target-bump" onclick="window.quickBumpTargetPrice(${trade.id}, ${target}, 5)" title="Extend target by +5 pts">+5</button>
            <button type="button" class="chip-target-bump" onclick="window.quickBumpTargetPrice(${trade.id}, ${target}, 10)" title="Extend target by +10 pts">+10</button>
            <button type="button" class="chip-target-bump" onclick="window.quickBumpTargetPrice(${trade.id}, ${target}, 20)" title="Extend target by +20 pts">+20</button>
          </div>
        </div>
      </div>

      <!-- Card Utilities Strip: Manual Simulation & Flywheel Export -->
      <div class="pos-actions-bar">
        <div class="pos-manual-ltp-wrap">
          <span class="pos-ltp-tag">Simulate LTP:</span>
          <button type="button" class="btn-step-ltp" onclick="window.stepManualLtp(${trade.id}, -1)">−</button>
          <input data-paper-price data-manual-price-id="${trade.id}" type="number" step="0.50" min="0" value="${escapeHtml(mark)}" class="pos-ltp-input" oninput="window.handleManualLtpInput(${trade.id}, this.value)" onkeydown="if(event.key==='Enter')window.syncManualLtp(${trade.id})" />
          <button type="button" class="btn-step-ltp" onclick="window.stepManualLtp(${trade.id}, 1)">+</button>
          <button data-paper-mark="${trade.id}" onclick="window.syncManualLtp(${trade.id})" type="button" class="btn-pos-action btn-sync">Sync</button>
        </div>
        <div class="pos-btn-cluster">
          <button type="button" class="btn-pos-action btn-journal" title="Export this trade to Journal" onclick="window.exportPracticeTradeToJournal('${escapeHtml(trade.symbol)}', ${Number(trade.entryPrice || 0)}, ${mark}, ${Number(trade.stopLoss || 0)}, ${Number(trade.targetPrice || 0)}, ${Number(trade.quantity || 1)}, ${Number(trade.lotSize || 65)}, ${unrealized})">📝 Journal</button>
          <button data-paper-delete="${trade.id}" onclick="event.stopPropagation(); window.deletePaperTradeFromUi(${trade.id}, this)" type="button" class="btn-pos-action btn-del" title="Delete trade">🗑️</button>
        </div>
      </div>
    </article>
  `;
}

// 🎮 Interactive Simulation Handlers for Manual Sandbox
function handleManualLtpInput(tradeId, val) {
  const price = parseFloat(val);
  if (Number.isFinite(price) && price > 0) {
    updateTradeLtpInUi(tradeId, price);
  }
}
window.handleManualLtpInput = handleManualLtpInput;

function stepManualLtp(tradeId, delta) {
  const input = document.querySelector(`[data-manual-price-id="${tradeId}"]`);
  if (!input) return;
  const current = parseFloat(input.value) || 0;
  const next = Math.max(0.05, Math.round((current + delta) * 20) / 20);
  input.value = next.toFixed(2);
  handleManualLtpInput(tradeId, next);
  syncManualLtp(tradeId);
}
window.stepManualLtp = stepManualLtp;

async function syncManualLtp(tradeId) {
  const input = document.querySelector(`[data-manual-price-id="${tradeId}"]`);
  if (!input) return;
  const price = parseFloat(input.value);
  if (!Number.isFinite(price) || price <= 0) return;

  try {
    const res = await fetchJson(`/api/live-alerts/trades/${tradeId}/mark`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price }),
    });

    if (res?.triggered) {
      playTactileChime();
      const isWin = res.closeReason === "TARGET_HIT";
      showDeskToast(
        isWin ? "🎯 Target Hit!" : "🛑 Stop Loss Hit!",
        `${isWin ? "Target achieved" : "Stop triggered"} at ₹${price.toFixed(2)}. Trade archived to Trading Journal!`,
        isWin ? "🏆" : "🛡️"
      );
      await loadPaperLab();
    } else {
      updateTradeLtpInUi(tradeId, price);
    }
  } catch (err) {
    showDeskToast("Sync Error", err.message, "❌");
  }
}
window.syncManualLtp = syncManualLtp;

// 🌟 IN-TRADE ACTION HANDLERS
async function trailTradeStopLoss(tradeId, newSL) {
  try {
    const res = await fetchJson(`/api/live-alerts/trades/${tradeId}/stop-loss`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stopLoss: Number(newSL) }),
    });
    playTactileChime();
    showDeskToast("Stop Loss Locked", `Trailing SL moved to ₹${Number(newSL).toFixed(2)} to protect profit!`, "🔒");
    if (deskChannel) deskChannel.postMessage({ type: "TRADE_MUTATION", action: "UPDATE_SL", tradeId });
    await loadPaperLab();
  } catch (err) {
    showDeskToast("Update Error", err.message, "❌");
  }
}
window.trailTradeStopLoss = trailTradeStopLoss;

async function promptEditStopLoss(tradeId, currentSL) {
  const input = prompt("Enter new Stop Loss price (₹):", currentSL);
  if (!input) return;
  const newSL = parseFloat(input);
  if (!Number.isFinite(newSL) || newSL <= 0) {
    alert("Please enter a valid positive price.");
    return;
  }
  await trailTradeStopLoss(tradeId, newSL);
}
window.promptEditStopLoss = promptEditStopLoss;

async function promptEditTargetPrice(tradeId, currentTarget) {
  const input = prompt("Enter new Target Price (₹):", currentTarget);
  if (!input) return;
  const newTP = parseFloat(input);
  if (!Number.isFinite(newTP) || newTP <= 0) {
    alert("Please enter a valid positive price.");
    return;
  }
  try {
    await fetchJson(`/api/live-alerts/trades/${tradeId}/target`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetPrice: newTP }),
    });
    playTactileChime();
    showDeskToast("Target Updated", `New Target set to ₹${newTP.toFixed(2)}`, "🎯");
    if (deskChannel) deskChannel.postMessage({ type: "TRADE_MUTATION", action: "UPDATE_TARGET", tradeId });
    await loadPaperLab();
  } catch (err) {
    showDeskToast("Update Error", err.message, "❌");
  }
}
window.promptEditTargetPrice = promptEditTargetPrice;

async function quickBumpTargetPrice(tradeId, currentTarget, deltaPts) {
  const newTP = Math.round((Number(currentTarget) + deltaPts) * 20) / 20;
  try {
    await fetchJson(`/api/live-alerts/trades/${tradeId}/target`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetPrice: newTP }),
    });
    playTactileChime("target");
    showDeskToast("Target Extended! 🎯", `Target bumped by +${deltaPts} pts to ₹${newTP.toFixed(2)}`, "🚀");
    if (deskChannel) deskChannel.postMessage({ type: "TRADE_MUTATION", action: "UPDATE_TARGET", tradeId });
    await loadPaperLab();
  } catch (err) {
    showDeskToast("Update Error", err.message, "❌");
  }
}
window.quickBumpTargetPrice = quickBumpTargetPrice;

function triggerVictoryConfetti() {
  try {
    const canvas = document.createElement("canvas");
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "99999";
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 45 }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 300,
      y: canvas.height / 2 + (Math.random() - 0.5) * 100,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 1) * 7 - 3,
      size: Math.random() * 6 + 4,
      color: ["#00f5c4", "#38bdf8", "#facc15", "#c084fc", "#22c55e"][Math.floor(Math.random() * 5)],
      alpha: 1,
      rotation: Math.random() * Math.PI,
    }));

    let frames = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.alpha -= 0.015;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });
      frames++;
      if (frames < 70) {
        requestAnimationFrame(animate);
      } else {
        canvas.remove();
      }
    };
    requestAnimationFrame(animate);
  } catch (_) {}
}
window.triggerVictoryConfetti = triggerVictoryConfetti;

async function instantExitTrade(tradeId, ltp) {
  if (!confirm(`Exit position immediately at current market price (₹${Number(ltp).toFixed(2)})?`)) return;
  try {
    const result = await fetchJson(`/api/live-alerts/trades/${tradeId}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: Number(ltp), reason: "MANUAL_EXIT" }),
    });
    playTactileChime();
    const netPnl = result?.item?.netPnl || 0;
    const isGain = netPnl >= 0;
    showDeskToast("Position Closed", `Exited at ₹${Number(ltp).toFixed(2)} (${isGain ? "+" : ""}₹${netPnl.toFixed(2)}). Auto-saved to Trading Journal!`, isGain ? "🎯" : "🛑");
    if (deskChannel) deskChannel.postMessage({ type: "TRADE_MUTATION", action: "CLOSE_TRADE", tradeId });
    await loadPaperLab();
  } catch (err) {
    showDeskToast("Exit Error", err.message, "❌");
  }
}
window.instantExitTrade = instantExitTrade;

function renderMiniSparkline(trade, movePct) {
  // Smooth trend interpolation without Math.sin (Width: 54px, Height: 24px)
  const isUp = movePct >= 0;
  const strokeColor = isUp ? "#00f5c4" : "#f87171";
  const trendPoints = isUp ? "2,20 18,16 34,10 52,4" : "2,4 18,10 34,16 52,20";
  return `
    <svg class="live-alert-sparkline" width="54" height="24" viewBox="0 0 54 24" aria-hidden="true" focusable="false">
      <polyline points="${trendPoints}" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `;
}

function renderBestWorstAlerts(trades) {
  const bestTarget = byId("paperBestAlert");
  const worstTarget = byId("paperWorstAlert");
  const legacyTarget = byId("paperBestWorst");
  if (!bestTarget && !worstTarget && !legacyTarget) return;
  const closed = [...trades].filter((trade) => Number.isFinite(Number(trade.netPnl)));
  if (!closed.length) {
    const emptyMarkup = `
      <div class="paper-bestworst-empty">
        <strong>No triggered alerts yet</strong>
        <span>Your best and worst alert will appear after target or stop-loss hits.</span>
      </div>
    `;
    if (bestTarget) bestTarget.innerHTML = emptyMarkup;
    if (worstTarget) worstTarget.innerHTML = emptyMarkup;
    if (legacyTarget) legacyTarget.innerHTML = emptyMarkup;
    return;
  }

  const best = closed.reduce((winner, trade) => Number(trade.netPnl || 0) > Number(winner.netPnl || 0) ? trade : winner, closed[0]);
  const worst = closed.reduce((loser, trade) => Number(trade.netPnl || 0) < Number(loser.netPnl || 0) ? trade : loser, closed[0]);
  if (bestTarget) bestTarget.innerHTML = renderBestWorstItem(best, "Best Alert", "best");
  if (worstTarget) worstTarget.innerHTML = renderBestWorstItem(worst, "Worst Alert", "worst");
  if (legacyTarget) {
    legacyTarget.innerHTML = `
      ${renderBestWorstItem(best, "Best Alert", "best")}
      ${renderBestWorstItem(worst, "Worst Alert", "worst")}
    `;
  }
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
  const underlyingSelect = paperForm.querySelector('[name="underlyingSymbol"]');
  const underlying = String(underlyingSelect?.value || "NIFTY").toUpperCase();
  try {
    if (underlyingSelect?.value) {
      localStorage.setItem("portfoliox_pref_underlying", underlyingSelect.value);
    }
  } catch (_) {}
  const lotSize = optionLotSizes[underlying] || 65;
  const lotInput = paperForm.querySelector('[name="lotSize"]');
  if (lotInput) lotInput.value = String(lotSize);

  // Auto-ATM Strike & Bracket Sizing Map
  const atmDefaults = {
    NIFTY: { strike: 24200, step: 50, entry: 100.0, sl: 92.0, tp: 119.0 },
    BANKNIFTY: { strike: 52200, step: 100, entry: 160.0, sl: 145.0, tp: 195.0 },
    FINNIFTY: { strike: 23800, step: 50, entry: 85.0, sl: 77.0, tp: 104.0 },
    SENSEX: { strike: 79500, step: 100, entry: 210.0, sl: 190.0, tp: 255.0 },
  };

  const config = atmDefaults[underlying] || atmDefaults.NIFTY;
  const strikeInput = paperForm.querySelector('[name="strikePrice"]');
  if (strikeInput) {
    strikeInput.value = String(config.strike);
    strikeInput.step = String(config.step);
  }

  const entryEl = document.getElementById("deskEntryPrice");
  const stopEl = document.getElementById("deskStopLoss");
  const targetEl = document.getElementById("deskTargetPrice");
  if (entryEl) entryEl.value = config.entry.toFixed(2);
  if (stopEl) stopEl.value = config.sl.toFixed(2);
  if (targetEl) targetEl.value = config.tp.toFixed(2);

  renderPaperRiskPreview();
  syncLiveDeskFromForm();
}

function initDeskAiPresets() {
  const btnAtm = document.getElementById("btnPresetAtmScalp");
  if (btnAtm) {
    btnAtm.addEventListener("click", () => {
      document.querySelectorAll(".btn-pad-preset, .btn-studio-preset, .btn-desk-preset").forEach((b) => b.classList.remove("active", "active-pill", "active-glow"));
      btnAtm.classList.add("active");
      const entryEl = document.getElementById("deskEntryPrice");
      const stopEl = document.getElementById("deskStopLoss");
      const targetEl = document.getElementById("deskTargetPrice");
      if (entryEl) entryEl.value = "83.00";
      if (stopEl) stopEl.value = "75.00";
      if (targetEl) targetEl.value = "102.00";
      renderPaperRiskPreview();
      syncLiveDeskFromForm();
      setPaperStatus("⚡ ATM Scalp Loaded");
    });
  }

  const btnSafe = document.getElementById("btnPresetSafeRr");
  if (btnSafe) {
    btnSafe.addEventListener("click", () => {
      document.querySelectorAll(".btn-pad-preset, .btn-studio-preset, .btn-desk-preset").forEach((b) => b.classList.remove("active", "active-pill", "active-glow"));
      btnSafe.classList.add("active");
      const entryEl = document.getElementById("deskEntryPrice");
      const stopEl = document.getElementById("deskStopLoss");
      const targetEl = document.getElementById("deskTargetPrice");
      const entry = Number(entryEl?.value || 83);
      if (stopEl) stopEl.value = (entry - 6.00).toFixed(2);
      if (targetEl) targetEl.value = (entry + 15.00).toFixed(2);
      renderPaperRiskPreview();
      syncLiveDeskFromForm();
      setPaperStatus("🛡️ Safe 1:2.5 R:R Loaded");
    });
  }

  const btnHero = document.getElementById("btnPresetHeroZero");
  if (btnHero) {
    btnHero.addEventListener("click", () => {
      document.querySelectorAll(".btn-pad-preset, .btn-studio-preset, .btn-desk-preset").forEach((b) => b.classList.remove("active", "active-pill", "active-glow"));
      btnHero.classList.add("active");
      const entryEl = document.getElementById("deskEntryPrice");
      const stopEl = document.getElementById("deskStopLoss");
      const targetEl = document.getElementById("deskTargetPrice");
      const entry = Number(entryEl?.value || 83);
      if (stopEl) stopEl.value = Math.max(0.05, entry - 10.00).toFixed(2);
      if (targetEl) targetEl.value = (entry + 30.00).toFixed(2);
      renderPaperRiskPreview();
      syncLiveDeskFromForm();
      setPaperStatus("🎯 0DTE Expiry Hero Loaded");
    });
  }

  // Quick Lot Buttons
  document.querySelectorAll("[data-quick-lot]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-quick-lot]").forEach((b) => b.classList.remove("active", "active-pill"));
      btn.classList.add("active");
      const qty = btn.dataset.quickLot;
      const qtyInput = paperForm?.querySelector('input[name="quantity"]');
      if (qtyInput) {
        qtyInput.value = qty;
        renderPaperRiskPreview();
        syncLiveDeskFromForm();
      }
    });
  });
}

function toggleSpreadMode(mode) {
  const modeInput = document.getElementById("deskStrategyMode");
  if (modeInput) modeInput.value = mode;

  document.querySelectorAll(".btn-spread-mode").forEach((b) => {
    b.classList.toggle("active", b.dataset.spreadMode === mode);
  });

  const hedgeCard = document.getElementById("spreadHedgeLegCard");
  const singleProtection = document.getElementById("cardSingleLegProtection");
  const beStat = document.getElementById("spreadBreakevenStat");
  const beDivider = document.getElementById("spreadBreakevenDivider");
  const callDesc = document.getElementById("callSentimentDesc");
  const putDesc = document.getElementById("putSentimentDesc");
  const payoffDock = document.getElementById("spreadPayoffDock");

  const isSpread = mode === "SPREAD";
  if (hedgeCard) hedgeCard.style.display = isSpread ? "block" : "none";
  if (singleProtection) singleProtection.style.display = isSpread ? "none" : "block";
  if (beStat) beStat.style.display = isSpread ? "flex" : "none";
  if (beDivider) beDivider.style.display = isSpread ? "block" : "none";
  if (payoffDock) payoffDock.style.display = isSpread ? "block" : "none";

  if (callDesc) callDesc.textContent = isSpread ? "Bull Call Vertical Spread" : "Bullish Breakout Scalp";
  if (putDesc) putDesc.textContent = isSpread ? "Bear Put Vertical Spread" : "Bearish Breakdown Scalp";

  const capLabel = document.getElementById("deskCapitalLabel");
  const riskLabel = document.getElementById("deskRiskLabel");
  const rewLabel = document.getElementById("deskRewardLabel");
  if (capLabel) capLabel.textContent = isSpread ? "Net Debit Outlay" : "Capital Outlay";
  if (riskLabel) riskLabel.textContent = isSpread ? "Max Risk (Defined)" : "Max Risk";
  if (rewLabel) rewLabel.textContent = isSpread ? "Max Gain (Capped)" : "Target Profit";

  // Auto-sync default hedge strike when switching to spread
  if (isSpread && paperForm) {
    const underlying = String(paperForm.querySelector('[name="underlyingSymbol"]')?.value || "NIFTY").toUpperCase();
    const optType = paperForm.querySelector('input[name="optionType"]:checked')?.value || "CALL";
    const strike = Number(paperForm.querySelector('[name="strikePrice"]')?.value || 24200);
    const step = underlying === "BANKNIFTY" || underlying === "SENSEX" ? 100 : 50;
    const hedgeStrike = optType === "CALL" ? strike + (step * 2) : strike - (step * 2);
    
    const hedgeStrikeEl = document.getElementById("deskHedgeStrike");
    if (hedgeStrikeEl) hedgeStrikeEl.value = String(hedgeStrike);
    
    const hedgePremEl = document.getElementById("deskHedgePremium");
    const longPrem = Number(document.getElementById("deskEntryPrice")?.value || 83);
    if (hedgePremEl && (!hedgePremEl.value || Number(hedgePremEl.value) <= 0 || Number(hedgePremEl.value) >= longPrem)) {
      hedgePremEl.value = Math.max(5, (longPrem * 0.45)).toFixed(2);
    }
  }

  renderPaperRiskPreview();
  syncLiveDeskFromForm();
}
window.toggleSpreadMode = toggleSpreadMode;

function incrementHedgeStrike(step) {
  if (!paperForm) return;
  const input = paperForm.querySelector('input[name="hedgeStrikePrice"]');
  if (!input || !step) return;
  const current = Number(input.value || 0);
  input.value = String(Math.max(0, current + step));
  renderPaperRiskPreview();
  syncLiveDeskFromForm();
}

function renderPaperRiskPreview() {
  if (!paperForm) return;
  const values = Object.fromEntries(new FormData(paperForm).entries());
  const isSpread = values.strategyMode === "SPREAD";
  const entry = Number(values.currentPrice || 0);
  const target = Number(values.targetPrice || 0);
  const stop = Number(values.stopLoss || 0);
  const quantity = Number(values.quantity || 0);
  const lotSize = Math.max(1, Number(values.lotSize || 1));
  const units = quantity * lotSize;

  const optType = values.optionType || "CALL";
  const longStrike = Number(values.strikePrice || 24200);

  if (isSpread) {
    const hedgeStrike = Number(values.hedgeStrikePrice || (optType === "CALL" ? longStrike + 100 : longStrike - 100));
    const hedgePrice = Number(values.hedgePrice || (entry * 0.45));
    const netDebitPerUnit = Math.max(0.05, entry - hedgePrice);
    const strikeWidth = Math.abs(hedgeStrike - longStrike);
    
    const capital = netDebitPerUnit * units;
    const maxRisk = capital;
    const maxReward = Math.max(0, (strikeWidth - netDebitPerUnit) * units);
    const rr = maxRisk > 0 ? maxReward / maxRisk : 0;
    
    const breakeven = optType === "CALL" ? longStrike + netDebitPerUnit : longStrike - netDebitPerUnit;

    const capEl = byId("deskCapitalVal");
    if (capEl) capEl.textContent = paperMoney.format(capital || 0);

    const riskEl = byId("deskRiskVal");
    if (riskEl) riskEl.textContent = paperMoney.format(maxRisk || 0);

    const rewEl = byId("deskRewardVal");
    if (rewEl) rewEl.textContent = paperMoney.format(maxReward || 0);

    const rrEl = byId("deskRrVal");
    if (rrEl) {
      rrEl.textContent = rr > 0 ? `1 : ${rr.toFixed(2)}` : "1 : 1.50+";
      rrEl.className = rr >= 1.5 ? "bracket-rr-text text-gain" : "bracket-rr-text text-cyan";
    }

    const beEl = byId("deskBreakevenVal");
    if (beEl) beEl.textContent = breakeven.toFixed(2);

    const hedgeTag = byId("hedgeSummaryTag");
    if (hedgeTag) {
      const sym = values.underlyingSymbol || "NIFTY";
      hedgeTag.textContent = `Sell ${sym} ${hedgeStrike} ${optType === "CALL" ? "CE" : "PE"}`;
    }

    const hedgeCreditTag = byId("hedgeCreditTag");
    if (hedgeCreditTag) {
      hedgeCreditTag.textContent = `Credit +₹${hedgePrice.toFixed(2)} (Net: ₹${netDebitPerUnit.toFixed(2)})`;
    }

    // Dynamic Payoff SVG Visualizer
    const payoffDock = document.getElementById("spreadPayoffDock");
    if (payoffDock) payoffDock.style.display = "block";
    const rangeTag = document.getElementById("payoffRangeTag");
    const sym = values.underlyingSymbol || "NIFTY";
    const minRange = Math.min(longStrike, hedgeStrike) - 200;
    const maxRange = Math.max(longStrike, hedgeStrike) + 200;
    if (rangeTag) rangeTag.textContent = `${sym} Range: ${minRange.toLocaleString()} → ${maxRange.toLocaleString()}`;

    const pMaxLoss = document.getElementById("pMarkerMaxLoss");
    const pBe = document.getElementById("pMarkerBe");
    const pMaxGain = document.getElementById("pMarkerMaxGain");
    if (pMaxLoss) pMaxLoss.textContent = `Max Loss: -${paperMoney.format(maxRisk)}`;
    if (pBe) pBe.textContent = `Breakeven: ${breakeven.toFixed(2)}`;
    if (pMaxGain) pMaxGain.textContent = `Max Gain: +${paperMoney.format(maxReward)}`;

    const strokeLine = document.getElementById("payoffStrokeLine");
    const fillArea = document.getElementById("payoffFillArea");
    const bePoint = document.getElementById("payoffBePoint");
    if (strokeLine && fillArea && bePoint) {
      if (optType === "CALL") {
        strokeLine.setAttribute("d", "M 0,95 L 175,95 L 325,30 L 500,30");
        fillArea.setAttribute("d", "M 0,95 L 175,95 L 325,30 L 500,30 L 500,65 L 0,65 Z");
        bePoint.setAttribute("cx", "250");
        bePoint.setAttribute("cy", "65");
      } else {
        strokeLine.setAttribute("d", "M 0,30 L 175,30 L 325,95 L 500,95");
        fillArea.setAttribute("d", "M 0,30 L 175,30 L 325,95 L 500,95 L 500,65 L 0,65 Z");
        bePoint.setAttribute("cx", "250");
        bePoint.setAttribute("cy", "65");
      }
    }
    return;
  }

  const payoffDock = document.getElementById("spreadPayoffDock");
  if (payoffDock) payoffDock.style.display = "none";

  // Single-Leg Naked Scalp Calculations
  const capital = entry * units;
  const risk = Math.max(0, entry - stop) * units;
  const reward = Math.max(0, target - entry) * units;
  const rr = risk > 0 ? reward / risk : 0;

  const slDiff = stop > 0 && entry > 0 ? entry - stop : 0;
  const tpDiff = target > 0 && entry > 0 ? target - entry : 0;
  const slDiffPct = entry > 0 ? (slDiff / entry) * 100 : 0;
  const tpDiffPct = entry > 0 ? (tpDiff / entry) * 100 : 0;

  const slDiffEl = byId("deskSlDiff");
  if (slDiffEl) {
    if (stop >= entry && stop > 0 && entry > 0) {
      slDiffEl.textContent = `⚠️ SL must be < ₹${entry.toFixed(2)}`;
      slDiffEl.className = "pad-diff-tag text-loss font-bold";
    } else {
      slDiffEl.textContent = slDiff > 0 ? `-${slDiff.toFixed(2)} pts (-${slDiffPct.toFixed(1)}%)` : "--";
      slDiffEl.className = "pad-diff-tag text-loss";
    }
  }

  const tpDiffEl = byId("deskTpDiff");
  if (tpDiffEl) {
    if (target <= entry && target > 0 && entry > 0) {
      tpDiffEl.textContent = `⚠️ Target must be > ₹${entry.toFixed(2)}`;
      tpDiffEl.className = "pad-diff-tag text-loss font-bold";
    } else {
      tpDiffEl.textContent = tpDiff > 0 ? `+${tpDiff.toFixed(2)} pts (+${tpDiffPct.toFixed(1)}%)` : "--";
      tpDiffEl.className = "pad-diff-tag text-gain";
    }
  }

  const capEl = byId("deskCapitalVal");
  if (capEl) capEl.textContent = paperMoney.format(capital || 0);

  const riskEl = byId("deskRiskVal");
  if (riskEl) riskEl.textContent = paperMoney.format(risk || 0);

  const rewEl = byId("deskRewardVal");
  if (rewEl) rewEl.textContent = paperMoney.format(reward || 0);

  const rrEl = byId("deskRrVal");
  if (rrEl) {
    if (rr > 0) {
      rrEl.textContent = `1 : ${rr.toFixed(2)}`;
      rrEl.className = rr >= 2.0 ? "bracket-rr-text text-gain" : rr >= 1.5 ? "bracket-rr-text text-cyan" : "bracket-rr-text text-loss";
    } else {
      rrEl.textContent = "1 : 2.00+";
      rrEl.className = "bracket-rr-text text-muted";
    }
  }
}

function incrementStrike(step) {
  const input = paperForm.querySelector('input[name="strikePrice"]');
  if (!input || !step) return;
  const current = Number(input.value || 0);
  input.value = String(Math.max(0, current + step));
  renderPaperRiskPreview();
  syncLiveDeskFromForm();
}

function renderWeeklyVisuals(lab) {
  const trades = lab.closedTrades || [];
  const dailyTarget = byId("paperDailyBars");
  const calendarTarget = byId("paperTradeCalendar");
  if (!dailyTarget || !calendarTarget) return;

  const range = paperState.pnlRange || "week";
  const buckets = buildWeekBuckets(trades, range);
  const values = buckets.map((bucket) => bucket.pnl);
  const maxValue = Math.max(1, ...values.map((value) => Math.abs(value)));

  const totalRangePnl = buckets.reduce((sum, b) => sum + b.pnl, 0);
  const rangePnlPct = (totalRangePnl / 100000) * 100;

  const bottomDailyPnl = byId("bottomDailyPnl");
  if (bottomDailyPnl) {
    bottomDailyPnl.textContent = signedMoney(totalRangePnl);
    bottomDailyPnl.className = totalRangePnl >= 0 ? "gain" : "loss";
  }
  const bottomDailyPnlPct = byId("bottomDailyPnlPct");
  if (bottomDailyPnlPct) {
    bottomDailyPnlPct.textContent = `${totalRangePnl >= 0 ? "+" : ""}${rangePnlPct.toFixed(2)}%`;
    bottomDailyPnlPct.className = totalRangePnl >= 0 ? "gain" : "loss";
  }

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
    buckets.slice(0, 7).map((bucket) => renderCalendarCell(bucket, rowIndex, maxCalendarRows)).join("")
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

function buildWeekBuckets(trades, range = "week") {
  let startDate = getWeekStart(new Date());
  let daysCount = 7;
  let labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  if (range === "last_week") {
    const curStart = getWeekStart(new Date());
    startDate = new Date(curStart);
    startDate.setDate(curStart.getDate() - 7);
  } else if (range === "month") {
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    daysCount = Math.min(31, lastDay);
    labels = Array.from({ length: daysCount }, (_, i) => String(i + 1));
  } else if (range === "all") {
    daysCount = 14;
    const now = new Date();
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 13);
    labels = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    });
  }

  const buckets = Array.from({ length: daysCount }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return {
      label: labels[index] || String(index + 1),
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

function compactMoney(value) {
  return `₹${paperNum.format(Number(value || 0))}`;
}

function signedCompactMoney(value) {
  const amount = Number(value || 0);
  return `${amount >= 0 ? "+" : "-"}${compactMoney(Math.abs(amount))}`;
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

  paperSse.addEventListener("target_hit", (event) => {
    try {
      const data = JSON.parse(event.data);
      const payload = data.payload || {};
      playTactileChime();
      showDeskToast("Target Achieved! 🎯", `Target Hit for ${payload.symbol || "Position"}. Trade auto-saved to Trading Journal!`, "🎯");
    } catch (_) {}
    loadPaperLab();
  });

  paperSse.addEventListener("stop_loss_hit", (event) => {
    try {
      const data = JSON.parse(event.data);
      const payload = data.payload || {};
      playTactileChime();
      showDeskToast("Stop Loss Triggered 🛑", `Stop Loss Hit for ${payload.symbol || "Position"}. Trade archived to Journal!`, "🛑");
    } catch (_) {}
    loadPaperLab();
  });

  paperSse.addEventListener("subscribed", handleReloadEvent);
  paperSse.addEventListener("unsubscribed", handleReloadEvent);
  paperSse.addEventListener("trade_mutation", handleReloadEvent);
  
  paperSse.onerror = (err) => {
    console.warn("SSE connection error, retrying in 5s...", err);
    paperSse.close();
    setTimeout(connectPaperSse, 5000);
  };
}

function updateTradeLtpInUi(tradeId, ltp) {
  const card = document.querySelector(`[data-trade-id="${tradeId}"]`);
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
  const targetDistance = target ? Math.max(0, target - ltp) : 0;
  const stopDistance = stop ? Math.max(0, ltp - stop) : 0;
  const targetSpan = target - entry;
  const progress = targetSpan > 0 ? clamp(((ltp - entry) / targetSpan) * 100, 0, 100) : 50;
  
  const ltpEl = card.querySelector(`[data-ltp-value="${tradeId}"]`);
  if (ltpEl) {
    ltpEl.textContent = paperMoney.format(ltp);
    ltpEl.className = movePct >= 0 ? "m-val gain" : "m-val loss";
  }
  
  const movePctEl = card.querySelector(`[data-move-pct="${tradeId}"]`);
  if (movePctEl) {
    movePctEl.textContent = `${signedNumber(movePct)}%`;
    movePctEl.className = movePct >= 0 ? "pos-pnl-pct gain" : "pos-pnl-pct loss";
  }
  
  const pnlEl = card.querySelector(`[data-unrealized-pnl="${tradeId}"]`);
  if (pnlEl) {
    pnlEl.textContent = signedMoney(unrealized);
    pnlEl.className = unrealized >= 0 ? "pos-pnl-val gain" : "pos-pnl-val loss";
  }
  
  const progTextEl = card.querySelector(`[data-progress-text="${tradeId}"]`);
  if (progTextEl) {
    progTextEl.textContent = `⚡ ${paperNum.format(progress)}% to Target`;
  }
  
  const progBarEl = card.querySelector(`[data-progress-bar="${tradeId}"]`);
  if (progBarEl) {
    progBarEl.style.width = `${progress}%`;
  }

  const cursorEl = card.querySelector(`[data-progress-cursor="${tradeId}"]`);
  if (cursorEl) {
    cursorEl.style.left = `${progress}%`;
  }

  const cursorTooltipEl = card.querySelector(`[data-cursor-tooltip="${tradeId}"]`);
  if (cursorTooltipEl) {
    cursorTooltipEl.textContent = `LTP ₹${paperNum.format(ltp)} (${signedNumber(movePct)}%)`;
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

async function loadCopilotSetupIntoForm(e) {
  if (e && typeof e.preventDefault === "function") e.preventDefault();
  const btn = document.getElementById("btnFastDeployLiveSignal") || document.getElementById("btnDeployCopilotPractice");
  const origHtml = btn ? btn.innerHTML : "";
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="pad-spinner"></span> Deploying Live Upstox Signal...`;
  }
  setPaperStatus("Deploying Live Market Signal...");

  try {
    const res = await fetchJson("/api/live-alerts/auto-deploy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    playTactileChime();
    const trade = res?.item;
    const optLabel = trade?.optionType === "CALL" ? "CE" : "PE";
    showDeskToast(
      "⚡ Live Upstox Trade Deployed",
      `${trade?.symbol || "NIFTY"} · Live Entry @ ₹${Number(trade?.entryPrice || 100).toFixed(2)} (Active in Section 3)`,
      "🚀"
    );
    setPaperStatus(`⚡ Live ${trade?.symbol || "NIFTY"} Position Deployed!`);

    if (deskChannel) deskChannel.postMessage({ type: "TRADE_MUTATION" });
    await loadPaperLab();

    const activeSection = document.getElementById("sectionActiveTrades");
    if (activeSection) {
      activeSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  } catch (err) {
    showDeskToast("Deployment Error", err.message, "❌");
    setPaperStatus(err.message, true);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origHtml;
    }
  }
}

function loadCopilotSetupIntoJournal() {
  const journalLink = document.querySelector('a[href="/journal"], a[href="#journal"]');
  if (journalLink) {
    journalLink.click();
  } else {
    location.hash = "#journal";
  }
  
  setTimeout(() => {
    const journalForm = document.getElementById("tradeLogForm");
    if (journalForm) {
      journalForm.classList.remove("hidden");
      journalForm.style.display = "block";
      
      const symbolInput = journalForm.querySelector('[name="symbol"]');
      if (symbolInput) symbolInput.value = "NIFTY 24300 PE";
      
      const typeSel = journalForm.querySelector('[name="instrumentType"]');
      if (typeSel) typeSel.value = "OPTION";
      
      const optionTypeSel = journalForm.querySelector('[name="optionType"]');
      if (optionTypeSel) optionTypeSel.value = "PUT";
      
      const strikeInput = journalForm.querySelector('[name="strikePrice"]');
      if (strikeInput) strikeInput.value = "24300";
      
      const entryInput = journalForm.querySelector('[name="entryPrice"]');
      if (entryInput) entryInput.value = "83.00";
      
      const slInput = journalForm.querySelector('[name="stopLoss"]');
      if (slInput) slInput.value = "75.00";
      
      const targetInput = journalForm.querySelector('[name="targetPrice"]');
      if (targetInput) targetInput.value = "102.00";
      
      const qtyInput = journalForm.querySelector('[name="positionSize"]');
      if (qtyInput) qtyInput.value = "65";
      
      const reasonInput = journalForm.querySelector('[name="entryReason"]');
      if (reasonInput) reasonInput.value = "Trading Copilot Pro: 24,300 CE Institutional Wall Rejection";
      
      journalForm.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 150);
}

function syncLiveDeskFromForm() {
  if (!paperForm) return;
  const optType = paperForm.querySelector('input[name="optionType"]:checked')?.value || "PUT";
  const sym = paperForm.querySelector('[name="underlyingSymbol"]')?.value || "NIFTY";
  const strike = paperForm.querySelector('[name="strikePrice"]')?.value || "24300";
  const entry = Number(paperForm.querySelector('[name="currentPrice"]')?.value || 83);
  const sl = Number(paperForm.querySelector('[name="stopLoss"]')?.value || 75);
  const target = Number(paperForm.querySelector('[name="targetPrice"]')?.value || 102);

  const fullSym = `${sym} ${strike} ${optType === "CALL" ? "CE" : "PE"}`;
  const symEl = byId("deskLiveSymbol");
  if (symEl) symEl.textContent = fullSym;

  const ltpEl = byId("deskLiveLtp");
  if (ltpEl) ltpEl.textContent = `LTP: ₹${entry.toFixed(2)}`;

  const targetDist = Math.abs(target - entry);
  const stopDist = Math.abs(entry - sl);

  const targetDistEl = byId("deskLiveTargetDist");
  if (targetDistEl) targetDistEl.textContent = `Distance: +${targetDist.toFixed(2)} pts`;

  const stopDistEl = byId("deskLiveStopDist");
  if (stopDistEl) stopDistEl.textContent = `Buffer: ${stopDist.toFixed(2)} pts`;

  const markerEntry = byId("markerEntryText");
  if (markerEntry) markerEntry.textContent = `Entry: ₹${entry.toFixed(2)}`;

  const markerSl = byId("markerSlText");
  if (markerSl) markerSl.textContent = `SL: ₹${sl.toFixed(2)}`;

  const markerTarget = byId("markerTargetText");
  if (markerTarget) markerTarget.textContent = `Target: ₹${target.toFixed(2)}`;

  // Calculate Progress percentage
  const totalRange = Math.max(0.1, target - sl);
  const curPos = Math.max(0, Math.min(100, ((entry - sl) / totalRange) * 100));

  const railFill = byId("deskRailFill");
  if (railFill) railFill.style.width = `${curPos}%`;

  const railPin = byId("deskRailPin");
  if (railPin) railPin.style.left = `${curPos}%`;

  // Check Indian Market Session Hours (09:15 to 15:30 IST)
  updateDeskMarketHoursStatus();
}

function updateDeskMarketHoursStatus() {
  const now = new Date();
  // IST is UTC+5:30
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const istDate = new Date(utc + 3600000 * 5.5);
  const day = istDate.getDay(); // 0 = Sun, 6 = Sat
  const hour = istDate.getHours();
  const min = istDate.getMinutes();
  const timeInMinutes = hour * 60 + min;

  const isWeekday = day >= 1 && day <= 5;
  const isMarketOpen = isWeekday && timeInMinutes >= (9 * 60 + 15) && timeInMinutes <= (15 * 60 + 30);

  const badge = byId("deskMarketStatusBadge");
  if (badge) {
    if (isMarketOpen) {
      badge.textContent = "🟢 Live Market (09:15–15:30 IST)";
      badge.className = "desk-live-status-pill";
      badge.style.background = "";
      badge.style.borderColor = "";
      badge.style.color = "";
    } else {
      badge.textContent = "🌙 Market Closed (Will run next session)";
      badge.className = "desk-live-status-pill text-muted-clean";
      badge.style.background = "rgba(255, 255, 255, 0.06)";
      badge.style.borderColor = "rgba(255, 255, 255, 0.12)";
      badge.style.color = "#94a3b8";
    }
  }
}

function initLiveDeskButtons() {
  const btnExit = byId("btnDeskImmediateExit");
  if (btnExit) {
    btnExit.addEventListener("click", async () => {
      const openTrades = paperState.lab?.openTrades || [];
      if (openTrades.length > 0) {
        const firstTrade = openTrades[0];
        setPaperStatus(`Closing ${firstTrade.symbol} immediately...`);
        try {
          await fetchJson(`/api/live-alerts/trades/${firstTrade.id}/close`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ price: firstTrade.lastMarkPrice || firstTrade.entryPrice, reason: "MANUAL_EXIT" }),
          });
          await loadPaperLab();
          setPaperStatus("Trade closed at market price!");
        } catch (e) {
          setPaperStatus(e.message, true);
        }
      } else {
        setPaperStatus("⚡ No open practice trade to exit. Deploy a trade first!");
      }
    });
  }

  const btnEditSl = byId("btnDeskEditStopLoss");
  if (btnEditSl) {
    btnEditSl.addEventListener("click", () => {
      const slInput = byId("deskStopLoss");
      if (slInput) {
        slInput.focus();
        slInput.select();
        setPaperStatus("✏️ Enter your new Stop Loss price in the left form");
      }
    });
  }

  const btnEditTarget = byId("btnDeskEditTarget");
  if (btnEditTarget) {
    btnEditTarget.addEventListener("click", () => {
      const targetInput = byId("deskTargetPrice");
      if (targetInput) {
        targetInput.focus();
        targetInput.select();
        setPaperStatus("✏️ Enter your new Target price in the left form");
      }
    });
  }
}

function initWeekendMarketSimulation() {
  if (simulationInterval) clearInterval(simulationInterval);
  
  simulationInterval = setInterval(() => {
    if (document.documentElement.dataset.activeView !== "paper") return;
    const openTrades = paperState.lab?.openTrades || [];
    if (!openTrades.length) return;

    const active = openTrades[0];
    const currentMark = Number(active.lastMarkPrice || active.entryPrice || 83);
    const tickDelta = (Math.random() - 0.48) * 0.40;
    const newPrice = Math.max(0.05, Number((currentMark + tickDelta).toFixed(2)));
    
    active.lastMarkPrice = newPrice;
    syncLiveDeskFromForm();

    if (active.targetPrice && newPrice >= Number(active.targetPrice)) {
      setPaperStatus("🎯 Target Hit in Live Tracking!");
    } else if (active.stopLoss && newPrice <= Number(active.stopLoss)) {
      setPaperStatus("🛑 Stop Loss Protected in Live Tracking!");
    }
  }, 2500);
}


