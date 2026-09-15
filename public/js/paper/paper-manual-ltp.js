import { fetchJson, setPaperStatus } from "./paper-helpers.js";
import { playTactileChime, showDeskToast } from "./paper-audio-fx.js";
import { paperState } from "./paper-state.js";

export function handleManualLtpInput(tradeId, val) {
  const trade = (paperState.lab?.openTrades || []).find((t) => Number(t.id) === Number(tradeId));
  if (trade?.feedMode === "LIVE") {
    showDeskToast("🔒 Live Stream Active", "Position is locked to live Upstox ticks. Switch to Sandbox mode to override.", "ℹ️");
    return;
  }
  const price = parseFloat(val);
  if (Number.isFinite(price) && price > 0) {
    window.updateTradeLtpInUi?.(tradeId, price);
  }
}

export function stepManualLtp(tradeId, delta) {
  const trade = (paperState.lab?.openTrades || []).find((t) => Number(t.id) === Number(tradeId));
  if (trade?.feedMode === "LIVE") {
    showDeskToast("🔒 Live Stream Active", "Position is locked to live Upstox ticks. Switch to Sandbox mode to override.", "ℹ️");
    return;
  }
  const input = document.querySelector(`[data-manual-price-id="${tradeId}"]`);
  if (!input) return;
  const current = parseFloat(input.value) || 0;
  const next = Math.max(0.05, Math.round((current + delta) * 20) / 20);
  input.value = next.toFixed(2);
  handleManualLtpInput(tradeId, next);
  syncManualLtp(tradeId);
}

export async function syncManualLtp(tradeId) {
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
      await window.loadPaperLab?.();
    } else {
      window.updateTradeLtpInUi?.(tradeId, price);
    }
  } catch (err) {
    showDeskToast("Sync Error", err.message, "❌");
  }
}

export async function deletePaperTradeFromUi(id, button) {
  const tradeId = Number(id);
  if (!tradeId) {
    setPaperStatus("Could not find trade id.", true);
    return;
  }

  if (!confirm(`Delete practice trade #${tradeId}? This will remove it from your history.`)) {
    return;
  }

  const row = button?.closest(".paper-position-card, .paper-closed-row, tr") || document.querySelector(`[data-closed-trade-id="${tradeId}"]`);
  if (row) {
    row.style.transition = "opacity 0.2s ease, transform 0.2s ease";
    row.style.opacity = "0";
    row.style.transform = "scale(0.96)";
    setTimeout(() => { try { row.remove(); } catch (_) {} }, 200);
  }

  if (paperState.lab) {
    if (Array.isArray(paperState.lab.openTrades)) {
      paperState.lab.openTrades = paperState.lab.openTrades.filter((t) => Number(t.id) !== tradeId);
      window.renderOpenPaperTrades?.(paperState.lab.openTrades);
    }
    if (Array.isArray(paperState.lab.closedTrades)) {
      paperState.lab.closedTrades = paperState.lab.closedTrades.filter((t) => Number(t.id) !== tradeId);
      window.renderClosedPaperTrades?.(paperState.lab.closedTrades);
    }
    try { window.renderPaperSummary?.(paperState.lab); } catch (_) {}
  }

  showDeskToast("Trade Deleted", `Practice trade #${tradeId} removed.`, "🗑️");
  document.dispatchEvent(new CustomEvent("portfoliox:trade-deleted", { detail: { tradeId } }));
  window.deskChannel?.postMessage({ type: "TRADE_MUTATION", action: "delete", tradeId });

  try {
    await fetchJson(`/api/live-alerts/trades/${tradeId}/delete`, { method: "POST" });
    setPaperStatus("Trade deleted");
  } catch (error) {
    showDeskToast("Delete Error", error.message, "❌");
    setPaperStatus(`Delete failed: ${error.message}`, true);
    await window.loadPaperLab?.();
  }
}
