import { byId, escapeHtml, formatTime, paperMoney, signedCompactMoney } from "./paper-helpers.js";
import { paperState, previewClosedAlerts, previewDisplay, previewFeedAlerts, previewOpenAlerts } from "./paper-state.js";

export function renderPaperAlerts(lab) {
  const paperAlertList = document.getElementById("paperAlertList");
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
        title: "Stop Loss Hit",
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

  const activeCount = hasRealAlerts ? openTrades.length : previewDisplay.active;
  const triggeredCount = hasRealAlerts ? closedTrades.length : 7;
  const totalCount = hasRealAlerts ? activeCount + triggeredCount : 12;

  if (byId("feedCountAll")) byId("feedCountAll").textContent = String(totalCount);
  if (byId("feedCountActive")) byId("feedCountActive").textContent = String(activeCount);
  if (byId("feedCountTriggered")) byId("feedCountTriggered").textContent = String(triggeredCount);

  const filter = paperState.alertFilter;
  const visibleAlerts = alerts.filter((alert) => {
    if (filter === "active") return ["active"].includes(alert.tone);
    if (filter === "triggered") return ["win", "loss", "risk", "muted"].includes(alert.tone);
    return true;
  });

  paperAlertList.innerHTML = visibleAlerts.length
    ? visibleAlerts.slice(0, 8).map((alert) => buildAlertRowHtml(alert)).join("")
    : `<div class="paper-alert-empty"><strong>No alerts yet</strong><span>Alert activity log will appear here.</span></div>`;
}

function buildAlertRowHtml(alert) {
  const isWin = alert.tone === "win";
  const isLoss = alert.tone === "loss";
  const isRisk = alert.tone === "risk";
  const isMuted = alert.tone === "muted";
  const isWatching = alert.tone === "active";
  const iconClass = isWin ? "target-hit" : isLoss ? "stop-loss" : isRisk ? "risk" : isMuted ? "muted" : "watching";
  const pillClass = isWin ? "gain" : isLoss ? "loss" : isRisk ? "risk" : isMuted ? "muted" : "watching";
  const displayValue = isWatching ? "Active" : isRisk ? "Triggered" : isMuted ? "Muted" : signedCompactMoney(alert.pnl);

  let iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1"/></svg>`;
  if (isWin) {
    iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`;
  } else if (isLoss) {
    iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>`;
  } else if (isRisk) {
    iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M4 13h4l2-8 4 14 2-6h4"/></svg>`;
  } else if (isMuted) {
    iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="m3 3 18 18"/></svg>`;
  }

  return `
    <article class="paper-alert-row ${alert.tone}">
      <div class="alert-icon ${iconClass}">${iconSvg}</div>
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
}

export function handlePaperAlertFilter(event) {
  const button = event.target.closest(".paper-alert-tabs button");
  if (!button) return;
  const label = button.childNodes[0].textContent.trim().toLowerCase();
  paperState.alertFilter = label === "active" ? "active" : label === "triggered" ? "triggered" : "all";
  document.querySelectorAll(".paper-alert-tabs button").forEach((item) => {
    item.classList.toggle("active", item === button);
  });
  if (paperState.lab) renderPaperAlerts(paperState.lab);
}
