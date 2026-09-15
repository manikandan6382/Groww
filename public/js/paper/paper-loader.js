import { byId, fetchJson, setPaperStatus } from "./paper-helpers.js";
import { paperState } from "./paper-state.js";
import { renderOpenPaperTrades } from "./paper-open-trades.js";
import { renderPaperLessons, renderPaperSummary } from "./paper-summary-cards.js";
import { renderClosedPaperTrades } from "./paper-closed-trades.js";
import { renderPaperLiveTrack } from "./paper-live-track.js";
import { renderPaperAlerts } from "./paper-alerts-list.js";

export const deskChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("portfoliox_desk_sync") : null;
if (deskChannel) {
  deskChannel.onmessage = (event) => {
    if (event.data?.type === "TRADE_MUTATION") {
      loadPaperLab();
    }
  };
}

export async function loadPaperLab() {
  const currentForm = document.getElementById("paperTradeForm");
  if (!currentForm) return;
  setPaperStatus("Loading...");
  try {
    const lab = await fetchJson("/api/live-alerts?range=all");
    paperState.lab = lab;
    paperState.loaded = true;

    try {
      renderOpenPaperTrades(lab.openTrades || []);
    } catch (err) {
      console.error("Error in renderOpenPaperTrades:", err);
    }

    try {
      renderPaperSummary(lab);
    } catch (err) {
      console.error("Error in renderPaperSummary:", err);
    }

    try {
      renderClosedPaperTrades(lab.closedTrades || []);
    } catch (err) {
      console.error("Error in renderClosedPaperTrades:", err);
    }

    try {
      renderPaperLiveTrack(lab);
      renderPaperAlerts(lab);
      renderPaperLessons(lab);
    } catch (err) {
      console.error("Error in live track/alerts:", err);
    }

    setPaperStatus("Ready");
  } catch (error) {
    console.error("Failed to load paper lab data:", error);
    setPaperStatus(error.message, true);
  }
}

export function initLiveDeskButtons() {
  const btnExit = byId("btnDeskImmediateExit");
  if (btnExit) {
    btnExit.addEventListener("click", async () => {
      const openTrades = paperState.lab?.openTrades || [];
      if (openTrades.length > 0) {
        const firstTrade = openTrades[0];
        setPaperStatus(`Closing ${firstTrade.symbol} immediately...`);
        try {
          await fetchJson(`/api/live-alerts/trades/${firstTrade.id}/close`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ price: firstTrade.lastMarkPrice || firstTrade.entryPrice, reason: "MANUAL_EXIT" }),
          });
          await loadPaperLab();
          setPaperStatus("Trade closed at market price!");
        } catch (e) {
          setPaperStatus(e.message, true);
        }
      } else {
        setPaperStatus("⚡ No open practice trade to exit. Deploy a trade first!");
      }
    });
  }

  const btnEditSl = byId("btnDeskEditStopLoss");
  if (btnEditSl) {
    btnEditSl.addEventListener("click", () => {
      const slInput = byId("deskStopLoss");
      if (slInput) {
        slInput.focus();
        slInput.select();
        setPaperStatus("✏️ Enter your new Stop Loss price in the left form");
      }
    });
  }

  const btnEditTarget = byId("btnDeskEditTarget");
  if (btnEditTarget) {
    btnEditTarget.addEventListener("click", () => {
      const targetInput = byId("deskTargetPrice");
      if (targetInput) {
        targetInput.focus();
        targetInput.select();
        setPaperStatus("✏️ Enter your new Target price in the left form");
      }
    });
  }
}
