import { byId, escapeHtml, formatCloseReason, formatShortDate, signedMoney } from "./paper-helpers.js";

export function renderMiniSparkline(trade, movePct) {
  const isUp = movePct >= 0;
  const strokeColor = isUp ? "#00f5c4" : "#f87171";
  const trendPoints = isUp ? "2,20 18,16 34,10 52,4" : "2,4 18,10 34,16 52,20";
  return `
    <svg class="live-alert-sparkline" width="54" height="24" viewBox="0 0 54 24" aria-hidden="true" focusable="false">
      <polyline points="${trendPoints}" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `;
}

export function renderBestWorstAlerts(trades) {
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

export function renderBestWorstItem(trade, label, tone) {
  const pnl = Number(trade.netPnl || 0);
  const isBest = tone === "best";
  const entry = Number(trade.entryPrice || 0);
  const exit = Number(trade.exitPrice || 0);
  const movePts = exit - entry;
  const movePct = entry > 0 ? (movePts / entry) * 100 : 0;
  const reason = formatCloseReason(trade.closeReason);
  const glyph = isBest ? "🏆" : "🛡️";
  const tagCls = isBest ? "badge-green" : "badge-loss";
  const dateStr = formatShortDate(trade.exitDatetime || trade.entryDatetime);

  return `
    <article class="pro-edge-card ${tone}" data-drilldown-id="${trade.id}" tabindex="0" role="button" data-paper-tooltip="⚡ Click or press Enter to inspect Trade Story #${trade.id} in audit ledger">
      <div class="pro-edge-head">
        <div class="pro-edge-badge-group">
          <span class="pro-edge-icon">${glyph}</span>
          <div class="pro-edge-titles">
            <span class="pro-edge-type">${escapeHtml(label)}</span>
            <strong class="pro-edge-symbol">${escapeHtml(trade.symbol)}</strong>
          </div>
        </div>
        <div class="pro-edge-head-right">
          <span class="apple-pill-badge ${tagCls}">${escapeHtml(reason)}</span>
          <span class="pro-edge-drill-hint">🔍 Inspect →</span>
        </div>
      </div>
      <div class="pro-edge-metrics">
        <div class="pro-edge-submetric">
          <small>Execution</small>
          <span>₹${entry.toFixed(2)} → ₹${exit.toFixed(2)}</span>
        </div>
        <div class="pro-edge-submetric">
          <small>Resolved Date</small>
          <span>${escapeHtml(dateStr)}</span>
        </div>
        <div class="pro-edge-pnl">
          <small>Net Realized</small>
          <strong class="${pnl >= 0 ? 'text-gain' : 'text-loss'}">${signedMoney(pnl)} <em class="pro-edge-pct">(${movePct >= 0 ? '+' : ''}${movePct.toFixed(1)}%)</em></strong>
        </div>
      </div>
    </article>
  `;
}
