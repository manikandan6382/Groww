import { clamp, paperMoney, paperNum, signedMoney, signedNumber } from "./paper-helpers.js";
import { paperState } from "./paper-state.js";

export function updateTradeLtpInUi(tradeId, ltp) {
  const card = document.querySelector(`[data-trade-id="${tradeId}"]`);
  if (!card) return;
  
  const openTrades = paperState.lab?.openTrades || [];
  const trade = openTrades.find((t) => Number(t.id) === Number(tradeId));
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
