import { debounceNetworkSync, broadcastTradeAction } from "./tradePersistence";

export const createSlManagementSlice = (set, get) => ({
  trailStopLoss: (id, newSl) => {
    const val = Number(newSl);
    const updated = get().openAlerts.map((t) => t.id === id ? { ...t, stopLoss: val } : t);
    set({ openAlerts: updated });
    broadcastTradeAction("TRADE_MUTATION", { id, stopLoss: val });
    try {
      localStorage.setItem("portfoliox_open_alerts", JSON.stringify(updated));
      fetch(`/api/paper-lab/trades/${id}/stop-loss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stopLoss: val })
      }).catch(() => {});
    } catch {}
  },

  adjustStopLoss: (id, delta, currentLtp = null) => {
    let finalSl = null;
    let wasClamped = false;
    const updated = get().openAlerts.map((t) => {
      if (t.id === id) {
        const isShort = t.direction === "SHORT";
        const currentSl = Number(t.stopLoss || 0);
        const currentTp = Number(t.targetPrice || (isShort ? 0.05 : 999999));
        const rawNewSl = currentSl + delta;
        let newSl;
        if (isShort) {
          let minAllowed = Math.max(currentTp + 1.0, 0.05);
          if (typeof currentLtp === "number" && currentLtp > 0) minAllowed = Math.max(minAllowed, currentLtp + 0.50);
          newSl = Math.max(minAllowed, Math.max(0.05, rawNewSl));
          if (rawNewSl < minAllowed) wasClamped = true;
        } else {
          let maxAllowed = currentTp - 1.0;
          if (typeof currentLtp === "number" && currentLtp > 0) maxAllowed = Math.min(maxAllowed, Math.max(0.05, currentLtp - 0.50));
          newSl = Math.min(maxAllowed, Math.max(0.05, rawNewSl));
          if (rawNewSl > maxAllowed) wasClamped = true;
        }
        finalSl = Number(newSl.toFixed(2));
        return { ...t, stopLoss: finalSl };
      }
      return t;
    });
    set({ openAlerts: updated });
    broadcastTradeAction("TRADE_MUTATION", { id, stopLoss: finalSl });
    try {
      debounceNetworkSync("portfoliox_open_alerts_storage", () => {
        try { localStorage.setItem("portfoliox_open_alerts", JSON.stringify(get().openAlerts)); } catch {}
      }, 250);
      if (finalSl !== null) {
        debounceNetworkSync(`trade_${id}_sl`, () => {
          fetch(`/api/paper-lab/trades/${id}/stop-loss`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stopLoss: finalSl })
          }).catch(() => {});
        }, 300);
      }
    } catch {}
    return { finalSl, wasClamped };
  },

  setBreakevenSL: (id, currentLtp = null) => {
    let finalSl = null;
    const updated = get().openAlerts.map((t) => {
      if (t.id === id) {
        const entry = Number(t.entryPrice || 0);
        const isShort = t.direction === "SHORT";
        const currentTp = Number(t.targetPrice || (isShort ? 0.05 : 999999));
        const units = Number(t.quantity || 1) * Math.max(1, Number(t.lotSize || 65));
        const estimatedCharges = 55.20 + (entry * units * 0.001);
        const frictionPts = Math.max(1.50, Number((estimatedCharges / units + 0.30).toFixed(2)));
        const trueBePrice = isShort ? (entry - frictionPts) : (entry + frictionPts);
        
        // Guard: Cannot lock Breakeven if trade is currently in a loss!
        if (typeof currentLtp === "number" && currentLtp > 0) {
          const inLoss = isShort ? (currentLtp >= entry) : (currentLtp <= entry);
          if (inLoss) {
            console.warn("Cannot lock Breakeven while trade is currently in a loss.");
            return t;
          }
        }

        let targetSl = trueBePrice;
        if (typeof currentLtp === "number" && currentLtp > 0) {
          targetSl = isShort
            ? Math.max(trueBePrice, Number((currentLtp + 0.30).toFixed(2)))
            : Math.min(trueBePrice, Number((currentLtp - 0.30).toFixed(2)));
        }

        const safeSl = isShort ? Math.max(currentTp + 1.0, targetSl) : Math.min(currentTp - 1.0, targetSl);
        finalSl = Number(safeSl.toFixed(2));
        return { ...t, stopLoss: finalSl, isTrueBeLocked: true };
      }
      return t;
    });
    set({ openAlerts: updated });
    broadcastTradeAction("TRADE_MUTATION", { id, stopLoss: finalSl });
    try {
      localStorage.setItem("portfoliox_open_alerts", JSON.stringify(updated));
      if (finalSl !== null) {
        debounceNetworkSync(`trade_${id}_sl`, () => {
          fetch(`/api/paper-lab/trades/${id}/stop-loss`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stopLoss: finalSl })
          }).catch(() => {});
        }, 100);
      }
    } catch {}
  },

  updateStopLossPrice: (id, newSl, currentLtp = null) => {
    let finalSl = null;
    let wasClamped = false;
    const rawVal = Number(newSl);
    if (!Number.isFinite(rawVal) || rawVal <= 0) return { finalSl: null, wasClamped: false };

    const updated = get().openAlerts.map((t) => {
      if (t.id === id) {
        const isShort = t.direction === "SHORT";
        const currentTp = Number(t.targetPrice || (isShort ? 0.05 : 999999));
        let clampedSl = rawVal;
        if (isShort) {
          let minAllowed = Math.max(currentTp + 1.0, 0.05);
          if (typeof currentLtp === "number" && currentLtp > 0) minAllowed = Math.max(minAllowed, currentLtp + 0.50);
          clampedSl = Math.max(minAllowed, Math.max(0.05, rawVal));
          if (rawVal < minAllowed) wasClamped = true;
        } else {
          let maxAllowed = currentTp - 1.0;
          if (typeof currentLtp === "number" && currentLtp > 0) maxAllowed = Math.min(maxAllowed, Math.max(0.05, currentLtp - 0.50));
          clampedSl = Math.min(maxAllowed, Math.max(0.05, rawVal));
          if (rawVal > maxAllowed) wasClamped = true;
        }
        finalSl = Number(clampedSl.toFixed(2));
        return { ...t, stopLoss: finalSl };
      }
      return t;
    });

    set({ openAlerts: updated });
    broadcastTradeAction("TRADE_MUTATION", { id, stopLoss: finalSl });
    try {
      debounceNetworkSync("portfoliox_open_alerts_storage", () => {
        try { localStorage.setItem("portfoliox_open_alerts", JSON.stringify(get().openAlerts)); } catch {}
      }, 250);
      if (finalSl !== null) {
        debounceNetworkSync(`trade_${id}_sl`, () => {
          fetch(`/api/paper-lab/trades/${id}/stop-loss`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stopLoss: finalSl })
          }).catch(() => {});
        }, 300);
      }
    } catch {}
    return { finalSl, wasClamped };
  },
});
