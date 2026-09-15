import { setStreamStatusUi } from "./paper-market-clock.js";
import { updateTradeLtpInUi } from "./paper-ltp-ui.js";
import { playTactileChime, showDeskToast } from "./paper-audio-fx.js";
import { paperRuntime, paperState } from "./paper-state.js";

export function connectPaperSse() {
  if (paperRuntime.paperSse) {
    try {
      paperRuntime.paperSse.close();
    } catch (_) {}
  }

  setStreamStatusUi("reconnecting");
  const sse = new EventSource("/api/live-alerts/live-events");
  paperRuntime.paperSse = sse;

  sse.onopen = () => {
    setStreamStatusUi("live");
  };

  sse.addEventListener("tick", (event) => {
    setStreamStatusUi("live");
    try {
      const data = JSON.parse(event.data);
      const payload = data.payload || {};
      updateTradeLtpInUi(payload.tradeId, payload.ltp);
    } catch (e) {
      console.error("Error processing SSE tick:", e);
    }
  });

  const handleReloadEvent = () => {
    if (paperState.loaded) {
      window.loadPaperLab?.();
    }
  };

  sse.addEventListener("target_hit", (event) => {
    try {
      const data = JSON.parse(event.data);
      const payload = data.payload || {};
      playTactileChime("target");
      showDeskToast("Target Achieved! 🎯", `Target Hit for ${payload.symbol || "Position"}. Trade auto-saved to Trading Journal!`, "🎯");
    } catch (_) {}
    window.loadPaperLab?.();
  });

  sse.addEventListener("stop_loss_hit", (event) => {
    try {
      const data = JSON.parse(event.data);
      const payload = data.payload || {};
      playTactileChime("stop_loss");
      showDeskToast("Stop Loss Triggered 🛑", `Stop Loss Hit for ${payload.symbol || "Position"}. Trade archived to Journal!`, "🛑");
    } catch (_) {}
    window.loadPaperLab?.();
  });

  sse.addEventListener("subscribed", handleReloadEvent);
  sse.addEventListener("unsubscribed", handleReloadEvent);
  sse.addEventListener("trade_mutation", handleReloadEvent);

  sse.onerror = (err) => {
    setStreamStatusUi("reconnecting");
    console.warn("SSE connection error, retrying in 5s...", err);
    try {
      sse.close();
    } catch (_) {}
    setTimeout(connectPaperSse, 5000);
  };

  if (!window._paperTabVisibilityAttached) {
    window._paperTabVisibilityAttached = true;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        window.loadPaperLab?.();
        if (!paperRuntime.paperSse || paperRuntime.paperSse.readyState === 2) {
          connectPaperSse();
        }
      }
    });
    window.addEventListener("focus", () => {
      if (!paperRuntime.paperSse || paperRuntime.paperSse.readyState === 2) {
        connectPaperSse();
      }
    });
  }
}
