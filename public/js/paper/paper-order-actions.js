import { fetchJson, formatCloseReason, setPaperStatus } from "./paper-helpers.js";
import { playTactileChime, showDeskToast } from "./paper-audio-fx.js";
import { paperRuntime, paperState } from "./paper-state.js";
import { deletePaperTradeFromUi } from "./paper-manual-ltp.js";
import { incrementHedgeStrike, incrementLots, incrementStrike } from "./paper-risk-preview.js";

export async function handlePaperTradeAction(event) {
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
    await window.loadPaperLab?.();
    setPaperStatus(result.triggered ? formatCloseReason(result.closeReason) : "Alert checked");
  } catch (error) {
    setPaperStatus(error.message, true);
  }
}

export function copyBrokerPayload(tradeId) {
  const trade = (paperState.lab?.openTrades || []).find((t) => Number(t.id) === Number(tradeId)) ||
                (paperState.lab?.closedTrades || []).find((t) => Number(t.id) === Number(tradeId));
  if (!trade) {
    showDeskToast("Notice", "Trade details not found.", "ℹ️");
    return;
  }

  const units = (Number(trade.quantity) || 1) * Math.max(1, Number(trade.lotSize) || 65);
  const entry = Number(trade.entryPrice || 0).toFixed(2);
  const stop = Number(trade.stopLoss || 0).toFixed(2);
  const target = Number(trade.targetPrice || 0).toFixed(2);
  const side = trade.optionType === "PUT" ? "PUT" : "CALL";

  const payload = [
    `═══════════════════════════════════════════`,
    `📋 BROKER ORDER TICKET (Groww / Zerodha)`,
    `═══════════════════════════════════════════`,
    `• CONTRACT:    ${trade.symbol}`,
    `• ACTION:      BUY (${side} Option)`,
    `• PRODUCT:     INTRADAY (MIS / Regular)`,
    `• QUANTITY:    ${units} (${trade.quantity || 1} Lot)`,
    `• ENTRY LIMIT: ₹${entry} (Limit Order)`,
    `• STOP LOSS:   ₹${stop} (Trigger SL)`,
    `• TARGET (TP): ₹${target} (Take Profit)`,
    `• ORDER TYPE:  LIMIT ORDER (Strict Slippage Cap)`,
    `═══════════════════════════════════════════`
  ].join("\n");

  navigator.clipboard.writeText(payload).then(() => {
    playTactileChime();
    showDeskToast("📋 Broker Ticket Copied", `${trade.symbol} · Ready to paste in Groww/Zerodha!`, "🚀");
  }).catch(() => {
    showDeskToast("Copy Notice", "Could not copy to clipboard.", "ℹ️");
  });
}

export function toggleSlippageSimulation(enabled) {
  paperRuntime.isSlippageSimulationEnabled = Boolean(enabled);
  const badge = document.getElementById("slippageStatusBadge");
  if (badge) {
    if (paperRuntime.isSlippageSimulationEnabled) {
      badge.className = "apple-pill-badge badge-warning";
      badge.textContent = "🛡️ Real -0.50pt Spread Active";
      badge.style.color = "#fbbf24";
      badge.style.borderColor = "rgba(251, 191, 36, 0.4)";
      badge.style.background = "rgba(251, 191, 36, 0.12)";
      showDeskToast("Slippage Guard Active", "Entry & exit fills will now model -0.50 pt spread penalty to prove real edge.", "🛡️");
    } else {
      badge.className = "apple-pill-badge badge-neutral";
      badge.textContent = "Ideal 0ms Fills";
      badge.style.color = "";
      badge.style.borderColor = "";
      badge.style.background = "";
      showDeskToast("Ideal Fills Active", "Slippage penalty disabled.", "⚡");
    }
  }
}
