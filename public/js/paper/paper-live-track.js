import { byId, clamp, escapeHtml, paperMoney, paperNum } from "./paper-helpers.js";
import { renderPaperLiveMiniStats } from "./paper-summary-cards.js";

export function renderPaperLiveTrack(lab) {
  const paperLiveTrackBody = document.getElementById("paperLiveTrackBody");
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
        <small>${escapeHtml(firstTrade.optionType || "CALL")} · ${paperNum.format(firstTrade.quantity || 0)} qty</small>
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

export function renderLiveLevel(trade) {
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
