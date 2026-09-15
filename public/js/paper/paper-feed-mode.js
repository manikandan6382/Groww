import { fetchJson, setPaperStatus } from "./paper-helpers.js";
import { playTactileChime, showDeskToast } from "./paper-audio-fx.js";
import { paperRuntime, paperState } from "./paper-state.js";
import { syncLiveDeskFromForm } from "./paper-copilot-deploy.js";

export function toggleFeedMode(mode) {
  const chosen = String(mode || "LIVE").toUpperCase();
  const input = document.getElementById("deskFeedMode");
  if (input) input.value = chosen;
  
  document.querySelectorAll(".btn-feed-mode").forEach((b) => {
    b.classList.toggle("active", b.dataset.feedMode === chosen);
  });
  
  const statusPill = document.getElementById("paperFormStatus");
  if (statusPill) {
    statusPill.textContent = chosen === "LIVE" ? "🟢 Live Upstox Mode" : "🎮 Manual Sandbox Mode";
  }
  
  try {
    localStorage.setItem("portfoliox_pref_feed_mode", chosen);
  } catch (_) {}
}

export async function toggleTradeFeedMode(tradeId) {
  try {
    const res = await fetchJson(`/api/live-alerts/trades/${tradeId}/toggle-mode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    playTactileChime();
    const isLive = res?.feedMode === "LIVE";
    showDeskToast(
      isLive ? "🟢 Live Stream Connected" : "🎮 Manual Mode Active",
      res?.message || `Position switched to ${isLive ? "Live Upstox auto-exit" : "Manual sandbox simulation"}`,
      isLive ? "🟢" : "🎮"
    );
    await window.loadPaperLab?.();
  } catch (err) {
    showDeskToast("Toggle Error", err.message, "❌");
  }
}

export function initWeekendMarketSimulation() {
  if (paperRuntime.simulationInterval) clearInterval(paperRuntime.simulationInterval);
  
  paperRuntime.simulationInterval = setInterval(() => {
    if (document.documentElement.dataset.activeView !== "paper") return;
    const openTrades = paperState.lab?.openTrades || [];
    if (!openTrades.length) return;

    const active = openTrades[0];
    const currentMark = Number(active.lastMarkPrice || active.entryPrice || 83);
    const tickDelta = (Math.random() - 0.48) * 0.40;
    const newPrice = Math.max(0.05, Number((currentMark + tickDelta).toFixed(2)));
    
    active.lastMarkPrice = newPrice;
    syncLiveDeskFromForm();

    if (active.targetPrice && newPrice >= Number(active.targetPrice)) {
      setPaperStatus("🎯 Target Hit in Live Tracking!");
    } else if (active.stopLoss && newPrice <= Number(active.stopLoss)) {
      setPaperStatus("🛑 Stop Loss Protected in Live Tracking!");
    }
  }, 2500);
}
