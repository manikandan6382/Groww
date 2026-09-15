import { clamp, escapeHtml, formatShortDate, paperMoney, paperNum, parseTradeDate, percentMove, signedMoney, signedNumber } from "./paper-helpers.js";
import { renderCardPrimaryActions, renderCardProgressDock, renderCardUtilityStrip, renderThetaWarningBanner } from "./paper-card-actions.js";

export function renderLiveAlertCard(trade) {
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

  let smartSlPrice = stop;
  let smartSlLabel = `✏️ Edit SL (₹${stop.toFixed(2)})`;
  let canLockProfit = false;

  if (side === "CALL" && mark > entry) {
    const profitPts = mark - entry;
    smartSlPrice = Math.round(Math.max(entry + 0.50, entry + profitPts * 0.5) * 20) / 20;
    if (smartSlPrice > stop) {
      canLockProfit = true;
      smartSlLabel = `🔒 Lock SL to ₹${smartSlPrice.toFixed(2)} (+${(smartSlPrice - entry).toFixed(2)} pts profit)`;
    }
  } else if (side === "PUT" && mark < entry) {
    const profitPts = entry - mark;
    smartSlPrice = Math.round(Math.min(entry - 0.50, entry - profitPts * 0.5) * 20) / 20;
    if (smartSlPrice < stop) {
      canLockProfit = true;
      smartSlLabel = `🔒 Lock SL to ₹${smartSlPrice.toFixed(2)} (+${(entry - smartSlPrice).toFixed(2)} pts profit)`;
    }
  }

  const now = new Date();
  const entryDate = parseTradeDate(trade.entryDatetime) || now;
  const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - entryDate.getTime()) / 60000));
  const isThetaZone = elapsedMinutes >= 15;
  const isLive = !(trade.feedMode === "MANUAL" || trade.personalNotes?.includes("[MANUAL_ONLY]"));
  const isSpread = String(trade.symbol || "").includes("Spread") || String(trade.personalNotes || "").includes("[SPREAD_BUNDLE]");
  const approxNetPnl = Math.round((unrealized - (unrealized === 0 ? 0 : 93.58)) * 100) / 100;

  const spotMap = { NIFTY: 24200, BANKNIFTY: 52200, FINNIFTY: 23800, SENSEX: 79500 };
  const spot = spotMap[String(trade.underlyingSymbol || "NIFTY").toUpperCase()] || 24200;
  const strike = Number(trade.strikePrice || spot);
  const moneyness = spot > 0 && strike > 0 ? (spot - strike) / spot : 0;
  let delta = side === "CALL" ? 0.50 + moneyness * 2.5 : -0.50 + moneyness * 2.5;
  delta = clamp(delta, side === "CALL" ? 0.05 : -0.95, side === "CALL" ? 0.95 : -0.05);
  const theta = Math.round((mark * 0.06 + 1.2) * 100) / 100;

  const p = { trade, mark, lots, units, entry, target, stop, unrealized, targetDistance, stopDistance, progress, side, movePct, isGain, smartSlPrice, smartSlLabel, canLockProfit, isLive };

  return `
    <article class="paper-position-card live-pos-card ${side.toLowerCase()}" data-trade-id="${trade.id}">
      <div class="pos-card-head">
        <div class="pos-sym-group">
          <span class="pos-type-pill ${side.toLowerCase()}">${side === "CALL" ? "▲ CALL (CE)" : "▼ PUT (PE)"}</span>
          <div class="pos-sym-title-wrap">
            <div class="flex items-center gap-2 flex-wrap">
              <strong class="pos-sym-title">${escapeHtml(trade.symbol)}</strong>
              ${isSpread ? `<span class="badge-spread-type">🛡️ SPREAD</span>` : ""}
              <button type="button" class="btn-card-mode-toggle ${isLive ? "is-live" : "is-manual"}" onclick="window.toggleTradeFeedMode(${trade.id})" title="Click to toggle between Live Upstox Stream and Manual Simulator">
                ${isLive ? `<span class="live-pulse-dot"></span> 🟢 Live Upstox Stream` : `🎮 Manual Simulator`}
                <span class="mode-switch-pill">⇋ Switch</span>
              </button>
              ${isThetaZone ? `<span class="badge-theta-zone" title="Holding time > 15m increases weekly option theta decay">⏳ Theta Zone (${elapsedMinutes}m)</span>` : `<span class="badge-timer-active">⏱️ ${elapsedMinutes}m active</span>`}
            </div>
            <span class="pos-meta-sub">${formatShortDate(trade.entryDatetime)} • ${paperNum.format(lots)} ${lots === 1 ? "Lot" : "Lots"} (${paperNum.format(units)} units) • Est. Net: ${signedMoney(approxNetPnl)}</span>
          </div>
        </div>
        <div class="pos-pnl-block">
          <span class="pos-pnl-label">Gross Unr. P&L</span>
          <strong data-unrealized-pnl="${trade.id}" class="pos-pnl-val ${isGain ? "gain" : "loss"}">${signedMoney(unrealized)}</strong>
          <small data-move-pct="${trade.id}" class="pos-pnl-pct ${isGain ? "gain" : "loss"}">${signedNumber(movePct)}%</small>
        </div>
      </div>

      <div class="pos-metrics-deck">
        <div class="pos-metric-cell"><span class="m-label">Live LTP</span><strong data-ltp-value="${trade.id}" class="m-val ${isGain ? "gain" : "loss"}">${paperMoney.format(mark || 0)}</strong></div>
        <div class="pos-metric-cell"><span class="m-label">Entry Price</span><strong class="m-val">${paperMoney.format(entry || 0)}</strong></div>
        <div class="pos-metric-cell">
          <div class="flex items-center justify-between"><span class="m-label text-loss">Stop Loss (SL)</span><button type="button" class="btn-micro-edit" title="Edit Stop Loss" onclick="promptEditStopLoss(${trade.id}, ${stop})">✏️</button></div>
          <strong class="m-val text-loss">${paperMoney.format(stop || 0)}</strong>
        </div>
        <div class="pos-metric-cell">
          <div class="flex items-center justify-between"><span class="m-label text-gain">Target (TP)</span><button type="button" class="btn-micro-edit" title="Edit Target Price" onclick="promptEditTargetPrice(${trade.id}, ${target})">✏️</button></div>
          <strong class="m-val text-gain">${paperMoney.format(target || 0)}</strong>
        </div>
      </div>

      <div class="pos-greeks-strip">
        <span class="greek-pill">Δ Delta: <strong>${delta >= 0 ? "+" : ""}${delta.toFixed(2)}</strong></span>
        <span class="greek-pill">Θ Theta: <strong class="text-loss">-${theta.toFixed(2)} pts/day</strong></span>
        <span class="greek-pill">IV: <strong>14.2%</strong></span>
        <span class="greek-pill">Vega: <strong>+0.12 pts/1% IV</strong></span>
      </div>

      ${renderCardProgressDock(p)}
      ${isThetaZone ? renderThetaWarningBanner(trade.id, mark, elapsedMinutes) : ""}
      ${renderCardPrimaryActions(p)}
      ${renderCardUtilityStrip(p)}
    </article>
  `;
}
