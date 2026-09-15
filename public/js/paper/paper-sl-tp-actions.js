import { fetchJson } from "./paper-helpers.js";
import { playTactileChime, showDeskToast } from "./paper-audio-fx.js";

export async function trailTradeStopLoss(tradeId, newSL) {
  try {
    await fetchJson(`/api/live-alerts/trades/${tradeId}/stop-loss`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stopLoss: Number(newSL) }),
    });
    playTactileChime();
    showDeskToast("Stop Loss Locked", `Trailing SL moved to ₹${Number(newSL).toFixed(2)} to protect profit!`, "🔒");
    window.deskChannel?.postMessage({ type: "TRADE_MUTATION", action: "UPDATE_SL", tradeId });
    await window.loadPaperLab?.();
  } catch (err) {
    showDeskToast("Update Error", err.message, "❌");
  }
}

export async function promptEditStopLoss(tradeId, currentSL) {
  const input = prompt("Enter new Stop Loss price (₹):", currentSL);
  if (!input) return;
  const newSL = parseFloat(input);
  if (!Number.isFinite(newSL) || newSL <= 0) {
    alert("Please enter a valid positive price.");
    return;
  }
  await trailTradeStopLoss(tradeId, newSL);
}

export async function promptEditTargetPrice(tradeId, currentTarget) {
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
    window.deskChannel?.postMessage({ type: "TRADE_MUTATION", action: "UPDATE_TARGET", tradeId });
    await window.loadPaperLab?.();
  } catch (err) {
    showDeskToast("Update Error", err.message, "❌");
  }
}

export async function quickBumpTargetPrice(tradeId, currentTarget, deltaPts) {
  const newTP = Math.round((Number(currentTarget) + deltaPts) * 20) / 20;
  try {
    await fetchJson(`/api/live-alerts/trades/${tradeId}/target`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetPrice: newTP }),
    });
    playTactileChime("target");
    showDeskToast("Target Extended! 🎯", `Target bumped by +${deltaPts} pts to ₹${newTP.toFixed(2)}`, "🚀");
    window.deskChannel?.postMessage({ type: "TRADE_MUTATION", action: "UPDATE_TARGET", tradeId });
    await window.loadPaperLab?.();
  } catch (err) {
    showDeskToast("Update Error", err.message, "❌");
  }
}

export async function instantExitTrade(tradeId, ltp) {
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
    window.deskChannel?.postMessage({ type: "TRADE_MUTATION", action: "CLOSE_TRADE", tradeId });
    await window.loadPaperLab?.();
  } catch (err) {
    showDeskToast("Exit Error", err.message, "❌");
  }
}
