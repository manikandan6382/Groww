import { byId, escapeHtml, paperMoney, paperNum, signedMoney } from "./paper-helpers.js";
import { averageRewardRisk, bestWinStreak, renderWeeklyVisuals } from "./paper-calendar-visuals.js";

export function renderPaperSummary(lab) {
  const openTrades = Array.isArray(lab.openTrades) ? lab.openTrades : [];
  const closedTrades = Array.isArray(lab.closedTrades) ? lab.closedTrades : [];
  
  const totalClosed = closedTrades.length;
  const wins = closedTrades.filter((t) => Number(t.netPnl || 0) > 0);
  const losses = closedTrades.filter((t) => Number(t.netPnl || 0) < 0);
  
  const winsCount = wins.length;
  const lossesCount = losses.length;
  const winRate = totalClosed > 0 ? (winsCount / totalClosed) * 100 : 0;
  
  const totalPnl = closedTrades.reduce((sum, t) => sum + Number(t.netPnl || 0), 0);
  const startingCapital = Number(lab.account?.starting_capital || 100000);
  const currentTotalVal = startingCapital + totalPnl;
  const pnlPct = (totalPnl / startingCapital) * 100;
  
  const grossWins = wins.reduce((sum, t) => sum + Number(t.netPnl || 0), 0);
  const grossLosses = Math.abs(losses.reduce((sum, t) => sum + Number(t.netPnl || 0), 0));
  const profitFactor = grossLosses > 0 ? (grossWins / grossLosses) : grossWins > 0 ? (winsCount > 0 ? 99.0 : 0.0) : 0.0;
  
  const avgRR = averageRewardRisk([...openTrades, ...closedTrades]);
  const bestStreak = bestWinStreak(closedTrades);

  updateScoreboard({ currentTotalVal, totalPnl, pnlPct, totalClosed, winsCount, lossesCount, winRate });
  updatePerformanceMetrics({ winRate, profitFactor, avgRR, bestStreak, totalPnl, pnlPct });
  updateGraduationGate(totalClosed, profitFactor);

  renderWeeklyVisuals({ ...lab, closedTrades });
  window.renderBestWorstAlerts?.(closedTrades);
  window.syncLiveDeskFromForm?.();
}

function updateScoreboard(m) {
  const scoreVal = byId("scoreboardCurrentValue");
  if (scoreVal) scoreVal.textContent = paperMoney.format(m.currentTotalVal);
  const scorePnl = byId("scoreboardNetPnl");
  if (scorePnl) {
    scorePnl.textContent = `${m.totalPnl >= 0 ? "+" : ""}${paperMoney.format(m.totalPnl)}`;
    scorePnl.className = `score-val apple-numeral ${m.totalPnl >= 0 ? "text-gain" : "text-loss"}`;
  }
  const scorePnlPct = byId("scoreboardPnlPct");
  if (scorePnlPct) {
    scorePnlPct.textContent = `${m.pnlPct >= 0 ? "+" : ""}${m.pnlPct.toFixed(2)}%`;
    scorePnlPct.className = `score-badge apple-pill-badge ${m.pnlPct >= 0 ? "badge-green" : "badge-loss"}`;
  }
  if (byId("scoreboardTotalTrades")) byId("scoreboardTotalTrades").textContent = String(m.totalClosed);
  if (byId("scoreboardWins")) byId("scoreboardWins").textContent = String(m.winsCount);
  if (byId("scoreboardLosses")) byId("scoreboardLosses").textContent = String(m.lossesCount);
  if (byId("scoreboardWinRate")) byId("scoreboardWinRate").textContent = `${paperNum.format(m.winRate)}%`;
}

function updatePerformanceMetrics(p) {
  const sumPnl = byId("summaryTotalPnl");
  if (sumPnl) {
    sumPnl.textContent = `${p.totalPnl >= 0 ? "+" : ""}${paperMoney.format(p.totalPnl)}`;
    sumPnl.className = p.totalPnl >= 0 ? "apple-numeral text-gain" : "apple-numeral text-loss";
  }
  const sumPnlPct = byId("summaryTotalPnlPct");
  if (sumPnlPct) {
    sumPnlPct.textContent = `${p.pnlPct >= 0 ? "+" : ""}${p.pnlPct.toFixed(2)}% Account Growth`;
    sumPnlPct.className = p.totalPnl >= 0 ? "sub-label text-gain" : "sub-label text-loss";
  }
  if (byId("summaryWinRate")) byId("summaryWinRate").textContent = `${paperNum.format(p.winRate)}%`;
  if (byId("paperPerfWinRate")) byId("paperPerfWinRate").textContent = `${paperNum.format(p.winRate)}%`;
  if (byId("paperProfitFactor")) byId("paperProfitFactor").textContent = p.profitFactor > 0 ? p.profitFactor.toFixed(2) : "0.00";
  if (byId("paperAvgRR")) byId("paperAvgRR").textContent = p.avgRR ? `1:${p.avgRR.toFixed(2)}` : "1:2.0";
  if (byId("paperBestStreak")) byId("paperBestStreak").textContent = `${p.bestStreak} win${p.bestStreak === 1 ? "" : "s"}`;
}

function updateGraduationGate(totalClosed, profitFactor) {
  const gradBadge = byId("gradBadgeStatus");
  const gradCheckTrades = byId("gradCheckTrades");
  const gradFillTrades = byId("gradFillTrades");
  const gradCheckPf = byId("gradCheckPf");
  const gradFillPf = byId("gradFillPf");

  if (gradCheckTrades) gradCheckTrades.textContent = `${totalClosed} / 30`;
  if (gradFillTrades) gradFillTrades.style.width = `${Math.min(100, (totalClosed / 30) * 100)}%`;

  if (gradCheckPf) {
    const passed = profitFactor >= 1.5;
    gradCheckPf.textContent = `${profitFactor.toFixed(2)} (${passed ? "≥1.5 ✅" : "Target: ≥1.5"})`;
    gradCheckPf.className = `grad-step-check ${passed ? "text-gain" : "text-loss"}`;
  }
  if (gradFillPf) {
    gradFillPf.style.width = `${Math.min(100, (profitFactor / 1.5) * 100)}%`;
    gradFillPf.className = profitFactor >= 1.5 ? "grad-fill bg-gain" : "grad-fill bg-loss";
  }

  if (gradBadge) {
    if (totalClosed >= 30 && profitFactor >= 1.5) {
      gradBadge.textContent = "🟢 Ready for Micro-Lot Live Bridge!";
      gradBadge.className = "apple-pill-badge badge-green font-bold";
    } else {
      gradBadge.textContent = `Phase 1: Practice Audit (${totalClosed}/30)`;
      gradBadge.className = "apple-pill-badge badge-subtle";
    }
  }
}

export function renderPaperLiveMiniStats(lab) {
  const analytics = lab.analytics || {};
  return `
    <div class="paper-live-mini-stats">
      <div><span>Provider</span><strong>Upstox</strong><small>${(lab.openTrades || []).length ? "LTP watch ready" : "Token pending"}</small></div>
      <div><span>Active Alerts</span><strong>${analytics.activeTrades || 0}</strong><small>Auto trigger queue</small></div>
      <div><span>Week P&L</span><strong class="${Number(analytics.totalPnl || 0) >= 0 ? "gain" : "loss"}">${signedMoney(analytics.totalPnl || 0)}</strong><small>Alert results</small></div>
    </div>
  `;
}

export function renderPaperLessons(lab) {
  const analytics = lab.analytics || {};
  const profitText = analytics.totalPnl >= 0 ? "You are positive this week." : "You are negative this week.";
  const riskText = analytics.profitFactor > 1 ? "Winning trades are covering losses." : "Focus on cleaner entries or tighter stop discipline.";
  const el = byId("paperLessons");
  if (el) {
    el.innerHTML = `
      <strong>${escapeHtml(profitText)}</strong>
      <span>${escapeHtml(riskText)} Weekly P&L: ${signedMoney(analytics.totalPnl || 0)}</span>
    `;
  }
}
