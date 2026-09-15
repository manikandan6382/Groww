import { byId, fetchJson, setPaperStatus } from "./paper-helpers.js";
import { showDeskToast } from "./paper-audio-fx.js";
import { paperRuntime, paperState } from "./paper-state.js";
import { renderLiveAlertCard } from "./paper-card-render.js";

export function renderOpenPaperTrades(trades) {
  const visibleTrades = trades || [];
  const openCountEl = byId("paperOpenCount");
  if (openCountEl) {
    openCountEl.textContent = `${visibleTrades.length} ACTIVE`;
    openCountEl.className = visibleTrades.length ? "active-count-badge active" : "active-count-badge";
  }
  const activeCountEl = byId("paperActiveCount");
  if (activeCountEl) {
    activeCountEl.textContent = String(visibleTrades.length);
  }
  const container = document.getElementById("paperOpenTrades");
  if (container) {
    if (!visibleTrades.length) {
      container.innerHTML = `
        <div class="empty-trades-dock">
          <span class="empty-icon">🏖️</span>
          <strong>No Active Practice Trades</strong>
          <small>Configure an Option Scalp or Defined-Risk Spread in Section 2 above and click <strong>Deploy Live Practice Trade</strong>.</small>
        </div>
      `;
      return;
    }
    container.innerHTML = visibleTrades.map((trade) => {
      try {
        return renderLiveAlertCard(trade);
      } catch (err) {
        console.error("renderLiveAlertCard error:", err);
        return "";
      }
    }).join("");
  }
}

export function exportPracticeTradeToJournal(symbol, entryPrice, exitPrice, stopLoss, targetPrice, qty, lotSize, netPnl) {
  try {
    if (typeof window.setActiveView === "function") {
      window.setActiveView("journal");
    }
    setTimeout(() => {
      const sym = document.getElementById("formSymbol");
      const entry = document.getElementById("formEntryPrice");
      const exit = document.getElementById("formExitPrice");
      const stop = document.getElementById("formStopLoss");
      const target = document.getElementById("formTargetPrice");
      const quantity = document.getElementById("formQuantity");
      const lot = document.getElementById("formLotSize");
      const reason = document.getElementById("formCloseReason");

      if (sym) sym.value = symbol || "";
      if (entry) entry.value = String(entryPrice || "");
      if (exit) exit.value = String(exitPrice || "");
      if (stop) stop.value = String(stopLoss || "");
      if (target) target.value = String(targetPrice || "");
      if (quantity) quantity.value = String(qty || 1);
      if (lot) lot.value = String(lotSize || 65);
      if (reason) {
        reason.value = Number(netPnl || 0) >= 0 ? "TARGET_HIT" : "STOP_LOSS_HIT";
      }

      if (typeof window.recalculateTradePlan === "function") {
        window.recalculateTradePlan();
      }

      const form = document.getElementById("tradeForm");
      if (form) {
        form.scrollIntoView({ behavior: "smooth", block: "center" });
        const formStatus = document.getElementById("tradeFormStatus");
        if (formStatus) formStatus.textContent = "Practice Trade Loaded";
      }
    }, 80);
  } catch (err) {
    console.error("Flywheel export failed:", err);
  }
}

export async function squareOffAllTrades() {
  if (paperRuntime.isSquaringOff) return;
  const openTrades = paperState.lab?.openTrades || [];
  if (!openTrades.length) {
    showDeskToast("No Open Trades", "There are no active practice positions to square off.", "🏖️");
    return;
  }
  const confirmAction = window.confirm(`Emergency Killswitch: Are you sure you want to market-close all ${openTrades.length} open practice position(s) immediately?`);
  if (!confirmAction) return;

  paperRuntime.isSquaringOff = true;
  const btnKill = document.getElementById("btnSquareOffAll");
  const origHtml = btnKill ? btnKill.innerHTML : "";
  if (btnKill) {
    btnKill.disabled = true;
    btnKill.innerHTML = `<span class="pad-spinner"></span> Squaring Off...`;
  }

  setPaperStatus("⚡ Emergency Killswitch activated: Closing all active positions...");
  try {
    const res = await fetchJson("/api/paper-lab/square-off-all", { method: "POST" });
    await window.loadPaperLab?.();
    showDeskToast("⚡ Square Off Executed", `Closed ${res.count || openTrades.length} active positions at current market mark!`, "🛑");
  } catch (err) {
    setPaperStatus(err.message, true);
  } finally {
    paperRuntime.isSquaringOff = false;
    if (btnKill) {
      btnKill.disabled = false;
      btnKill.innerHTML = origHtml;
    }
  }
}
