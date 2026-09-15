import { debounceNetworkSync, broadcastTradeAction } from "./tradePersistence";

export const createTpManagementSlice = (set, get) => ({
  updateTargetPrice: (id, newTp, currentLtp = null) => {
    let finalTp = null;
    let wasClamped = false;
    const rawVal = Number(newTp);
    if (!Number.isFinite(rawVal) || rawVal <= 0) return { finalTp: null, wasClamped: false };

    const updated = get().openAlerts.map((t) => {
      if (t.id === id) {
        const isShort = t.direction === "SHORT";
        const currentSl = Number(t.stopLoss || 0);
        let clampedTp = rawVal;

        if (isShort) {
          let maxAllowed = currentSl > 0 ? Math.max(0.05, currentSl - 1.0) : 999999;
          if (typeof currentLtp === "number" && currentLtp > 0) maxAllowed = Math.min(maxAllowed, Math.max(0.05, currentLtp - 0.50));
          clampedTp = Math.min(maxAllowed, Math.max(0.05, rawVal));
          if (rawVal > maxAllowed) wasClamped = true;
        } else {
          let minAllowed = currentSl > 0 ? currentSl + 1.0 : 0.05;
          if (typeof currentLtp === "number" && currentLtp > 0) minAllowed = Math.max(minAllowed, currentLtp + 0.50);
          clampedTp = Math.max(minAllowed, Math.max(0.05, rawVal));
          if (rawVal < minAllowed) wasClamped = true;
        }

        finalTp = Number(clampedTp.toFixed(2));
        return { ...t, targetPrice: finalTp };
      }
      return t;
    });

    set({ openAlerts: updated });
    broadcastTradeAction("TRADE_MUTATION", { id, targetPrice: finalTp });
    try {
      debounceNetworkSync("portfoliox_open_alerts_storage", () => {
        try { localStorage.setItem("portfoliox_open_alerts", JSON.stringify(get().openAlerts)); } catch {}
      }, 250);
      if (finalTp !== null) {
        debounceNetworkSync(`trade_${id}_target`, () => {
          fetch(`/api/paper-lab/trades/${id}/target`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetPrice: finalTp })
          }).catch(() => {});
        }, 300);
      }
    } catch {}
    return { finalTp, wasClamped };
  },

  adjustTargetPrice: (id, delta, currentLtp = null) => {
    let finalTp = null;
    let wasClamped = false;
    const updated = get().openAlerts.map((t) => {
      if (t.id === id) {
        const isShort = t.direction === "SHORT";
        const currentTp = Number(t.targetPrice || 0);
        const currentSl = Number(t.stopLoss || 0);
        const rawNewTp = currentTp + delta;
        let newTp;
        if (isShort) {
          let maxAllowed = currentSl > 0 ? Math.max(0.05, currentSl - 1.0) : 999999;
          if (typeof currentLtp === "number" && currentLtp > 0) maxAllowed = Math.min(maxAllowed, Math.max(0.05, currentLtp - 0.50));
          newTp = Math.min(maxAllowed, Math.max(0.05, rawNewTp));
          if (rawNewTp > maxAllowed) wasClamped = true;
        } else {
          let minAllowed = currentSl + 1.0;
          if (typeof currentLtp === "number" && currentLtp > 0) minAllowed = Math.max(minAllowed, currentLtp + 0.50);
          newTp = Math.max(minAllowed, Math.max(0.05, rawNewTp));
          if (rawNewTp < minAllowed) wasClamped = true;
        }
        finalTp = Number(newTp.toFixed(2));
        return { ...t, targetPrice: finalTp };
      }
      return t;
    });
    set({ openAlerts: updated });
    broadcastTradeAction("TRADE_MUTATION", { id, targetPrice: finalTp });
    try {
      debounceNetworkSync("portfoliox_open_alerts_storage", () => {
        try { localStorage.setItem("portfoliox_open_alerts", JSON.stringify(get().openAlerts)); } catch {}
      }, 250);
      if (finalTp !== null) {
        debounceNetworkSync(`trade_${id}_target`, () => {
          fetch(`/api/paper-lab/trades/${id}/target`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetPrice: finalTp })
          }).catch(() => {});
        }, 300);
      }
    } catch {}
    return { finalTp, wasClamped };
  },
});
