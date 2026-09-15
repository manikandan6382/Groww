import { escapeHtml, paperNum } from "./paper-helpers.js";

export function renderCardProgressDock(p) {
  return `
    <div class="pos-progress-dock">
      <div class="pos-progress-labels">
        <span class="prog-label text-loss">🛑 SL: ₹${p.stop.toFixed(2)} (${paperNum.format(p.stopDistance)} pts buffer)</span>
        <span class="prog-label font-bold text-cyan" data-progress-text="${p.trade.id}">⚡ ${paperNum.format(p.progress)}% to Target</span>
        <span class="prog-label text-gain">🎯 Target: ₹${p.target.toFixed(2)} (${paperNum.format(p.targetDistance)} pts away)</span>
      </div>
      <div class="pos-progress-track">
        <div class="pos-progress-fill" data-progress-bar="${p.trade.id}" style="width: ${p.progress}%"></div>
        <div class="pos-progress-cursor" data-progress-cursor="${p.trade.id}" style="left: ${p.progress}%">
          <div class="cursor-glow-halo"></div>
          <div class="cursor-pin-badge" data-cursor-tooltip="${p.trade.id}">
            LTP ₹${paperNum.format(p.mark)} (${p.movePct >= 0 ? "+" : ""}${paperNum.format(p.movePct)}%)
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderThetaWarningBanner(tradeId, mark, elapsedMinutes) {
  return `
    <div class="theta-warning-banner">
      <div class="flex items-center gap-2">
        <span class="theta-alert-icon">⏳</span>
        <div>
          <strong class="text-white text-xs">Theta Decay Warning (${elapsedMinutes}m held)</strong>
          <small class="text-slate-400 text-xxs block">Option time decay is accelerating. Consider time-stopping if momentum has stalled.</small>
        </div>
      </div>
      <button type="button" class="btn-time-stop" onclick="window.instantExitTrade(${tradeId}, ${mark}, 'TIME_STOP_THETA_EXIT')" title="Cut stalled trade to eliminate further option theta decay">
        🛡️ Time-Stop Exit
      </button>
    </div>
  `;
}

export function renderCardPrimaryActions(p) {
  return `
    <div class="pos-primary-actions-grid">
      <button type="button" class="btn-pos-primary btn-trail-sl ${p.canLockProfit ? "is-profitable" : ""}" onclick="${p.canLockProfit ? `window.trailTradeStopLoss(${p.trade.id}, ${p.smartSlPrice})` : `window.promptEditStopLoss(${p.trade.id}, ${p.stop})`}">
        ${p.smartSlLabel}
      </button>
      <button type="button" class="btn-pos-primary btn-exit-imm" onclick="window.instantExitTrade(${p.trade.id}, ${p.mark})">
        ⚡ Exit Immediately
      </button>
      <div class="pos-target-action-cell">
        <button type="button" class="btn-pos-primary btn-edit-target" onclick="window.promptEditTargetPrice(${p.trade.id}, ${p.target})">
          🎯 Target (₹${p.target.toFixed(2)})
        </button>
        <div class="quick-target-chips">
          <button type="button" class="chip-target-bump" onclick="window.quickBumpTargetPrice(${p.trade.id}, ${p.target}, 5)" title="Extend target by +5 pts">+5</button>
          <button type="button" class="chip-target-bump" onclick="window.quickBumpTargetPrice(${p.trade.id}, ${p.target}, 10)" title="Extend target by +10 pts">+10</button>
          <button type="button" class="chip-target-bump" onclick="window.quickBumpTargetPrice(${p.trade.id}, ${p.target}, 20)" title="Extend target by +20 pts">+20</button>
        </div>
      </div>
    </div>
  `;
}

export function renderCardUtilityStrip(p) {
  return `
    <div class="pos-actions-bar">
      <div class="pos-manual-ltp-wrap">
        <span class="pos-ltp-tag">${p.isLive ? "🟢 Live (Simulate):" : "🎮 Simulate LTP:"}</span>
        <button type="button" class="btn-step-ltp" onclick="window.stepManualLtp(${p.trade.id}, -1)">−</button>
        <input data-paper-price data-manual-price-id="${p.trade.id}" type="number" step="0.50" min="0" value="${escapeHtml(p.mark)}" class="pos-ltp-input" oninput="window.handleManualLtpInput(${p.trade.id}, this.value)" onkeydown="if(event.key==='Enter')window.syncManualLtp(${p.trade.id})" />
        <button type="button" class="btn-step-ltp" onclick="window.stepManualLtp(${p.trade.id}, 1)">+</button>
        <button data-paper-mark="${p.trade.id}" onclick="window.syncManualLtp(${p.trade.id})" type="button" class="btn-pos-action btn-sync">Sync</button>
      </div>
      <div class="pos-btn-cluster">
        <button type="button" class="btn-pos-action btn-ticket" title="Copy exact Groww/Zerodha broker order ticket payload" onclick="window.copyBrokerPayload(${p.trade.id})">📋 Ticket</button>
        <button type="button" class="btn-pos-action btn-mode-toggle" onclick="window.toggleTradeFeedMode(${p.trade.id})" title="Toggle between Live Upstox stream and Manual simulator">${p.isLive ? "🎮 Set Manual" : "🟢 Set Live"}</button>
        <button type="button" class="btn-pos-action btn-journal" title="Export this trade to Journal" onclick="window.exportPracticeTradeToJournal('${escapeHtml(p.trade.symbol)}', ${Number(p.trade.entryPrice || 0)}, ${p.mark}, ${Number(p.trade.stopLoss || 0)}, ${Number(p.trade.targetPrice || 0)}, ${Number(p.trade.quantity || 1)}, ${Number(p.trade.lotSize || 65)}, ${p.unrealized})">📝 Journal</button>
        <button data-paper-delete="${p.trade.id}" onclick="event.stopPropagation(); window.deletePaperTradeFromUi(${p.trade.id}, this)" type="button" class="btn-pos-action btn-del" title="Delete trade">🗑️</button>
      </div>
    </div>
  `;
}
