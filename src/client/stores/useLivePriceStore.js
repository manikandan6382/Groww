import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export const useLivePriceStore = create(
  subscribeWithSelector((set, get) => ({
    ticks: {}, // { [tradeIdOrSymbol]: { ltp: number, timestamp: number, change: number, direction: 'up' | 'down' } }
    indices: {
      "NSE_INDEX|Nifty 50": { ltp: 24031.45, change: -144.20, changePct: -0.60, timestamp: Date.now() },
      "NSE_INDEX|Nifty Bank": { ltp: 57317.75, change: -178.55, changePct: -0.31, timestamp: Date.now() },
      "NSE_INDEX|Nifty Fin Service": { ltp: 23450.60, change: 65.40, changePct: 0.28, timestamp: Date.now() },
      "BSE_INDEX|SENSEX": { ltp: 79890.30, change: 310.00, changePct: 0.39, timestamp: Date.now() },
    },
    sparklines: {
      "NSE_INDEX|Nifty 50": [24120, 24110, 24150, 24135, 24180, 24210, 24080, 24031.45],
      "NSE_INDEX|Nifty Bank": [57400, 57350, 57450, 57320, 57280, 57317.75],
      "INDIA_VIX": [14.1, 13.9, 13.5, 13.4, 13.20]
    },
    lastTickReceivedAt: Date.now(),
    
    updateTick: (id, ltp, change = 0) => {
      if (!id) return;
      const numLtp = Number(ltp);
      if (!Number.isFinite(numLtp)) return;
      const prev = get().ticks?.[id];
      if (prev && prev.ltp === numLtp && prev.change === change) return;

      const prevLtp = prev?.ltp ?? numLtp;
      const direction = numLtp > prevLtp ? "up" : numLtp < prevLtp ? "down" : (prev?.direction ?? "up");
      const prevSparkline = get().sparklines?.[id] ?? [numLtp];
      const nextSparkline = [...prevSparkline.slice(-14), numLtp];
      
      set((state) => ({
        lastTickReceivedAt: Date.now(),
        ticks: {
          ...state.ticks,
          [id]: {
            ltp: numLtp,
            change,
            direction,
            timestamp: Date.now(),
          },
        },
        sparklines: {
          ...state.sparklines,
          [id]: nextSparkline,
        }
      }));
    },

    updateMultiTicks: (updates) => {
      if (!Array.isArray(updates) || updates.length === 0) return;
      const currentTicks = get().ticks;
      const currentSparklines = get().sparklines;
      let hasChanges = false;
      const newTicks = { ...currentTicks };
      const newSparklines = { ...currentSparklines };
      const now = Date.now();

      for (const { id, ltp, change = 0 } of updates) {
        if (!id) continue;
        const numLtp = Number(ltp);
        if (!Number.isFinite(numLtp)) continue;

        const prev = currentTicks[id];
        if (prev && prev.ltp === numLtp && prev.change === change) {
          continue; // Identical tick, skip re-cloning to conserve RAM & CPU
        }

        hasChanges = true;
        const prevLtp = prev?.ltp ?? numLtp;
        const direction = numLtp > prevLtp ? "up" : numLtp < prevLtp ? "down" : (prev?.direction ?? "up");
        newTicks[id] = { ltp: numLtp, change, direction, timestamp: now };
        
        const prevSparkline = currentSparklines?.[id] ?? [numLtp];
        newSparklines[id] = [...prevSparkline.slice(-14), numLtp];
      }

      if (hasChanges) {
        set({ lastTickReceivedAt: now, ticks: newTicks, sparklines: newSparklines });
      }
    },

    updateIndexTick: (symbol, ltp, change = 0, changePct = 0, extra = {}) => {
      const numLtp = Number(ltp);
      if (!Number.isFinite(numLtp)) return;
      const prev = get().indices?.[symbol];
      if (prev && prev.ltp === numLtp && prev.change === Number(change)) return;

      const prevSparkline = get().sparklines?.[symbol] ?? [numLtp];
      const nextSparkline = [...prevSparkline.slice(-14), numLtp];
      set((state) => ({
        lastTickReceivedAt: Date.now(),
        indices: {
          ...state.indices,
          [symbol]: {
            ...prev,
            ...extra,
            ltp: numLtp,
            change: Number(change),
            changePct: Number(changePct),
            open: extra.open != null ? Number(extra.open) : prev?.open,
            high: extra.high != null ? Number(extra.high) : prev?.high,
            low: extra.low != null ? Number(extra.low) : prev?.low,
            close: extra.close != null ? Number(extra.close) : prev?.close,
            timestamp: extra.receivedAt || extra.timestamp || Date.now(),
          },
        },
        sparklines: {
          ...state.sparklines,
          [symbol]: nextSparkline,
        }
      }));
    },

    setAllIndices: (indicesMap) => {
      set((state) => {
        const nextIndices = { ...state.indices };
        const nextSparklines = { ...state.sparklines };
        for (const [key, data] of Object.entries(indicesMap)) {
          if (!data || data.ltp == null) continue;
          nextIndices[key] = {
            ...(nextIndices[key] || {}),
            ...data,
          };
          const prevSpark = nextSparklines[key] || [];
          nextSparklines[key] = [...prevSpark.slice(-14), data.ltp];
        }
        return { indices: nextIndices, sparklines: nextSparklines };
      });
    },

    setBulkTicks: (newTicksMap) => {
      if (!newTicksMap) return;
      set((state) => {
        const nextTicks = { ...state.ticks };
        if (Array.isArray(newTicksMap)) {
          for (const item of newTicksMap) {
            if (!item) continue;
            const ltp = Number(item.ltp || item.price || 0);
            if (ltp <= 0) continue;
            const tickObj = {
              ltp,
              change: Number(item.change || 0),
              timestamp: item.timestamp || Date.now(),
              pnl: item.pnl != null ? Number(item.pnl) : undefined
            };
            if (item.id) nextTicks[item.id] = { ...nextTicks[item.id], ...tickObj };
            if (item.symbol) nextTicks[item.symbol] = { ...nextTicks[item.symbol], ...tickObj };
            if (item.tokenKey) nextTicks[item.tokenKey] = { ...nextTicks[item.tokenKey], ...tickObj };
          }
        } else if (typeof newTicksMap === "object") {
          for (const [key, val] of Object.entries(newTicksMap)) {
            if (!val) continue;
            nextTicks[key] = typeof val === "object" ? { ...nextTicks[key], ...val } : { ltp: Number(val) };
          }
        }
        return { ticks: nextTicks, lastTickReceivedAt: Date.now() };
      });
    },

    pruneDetachedTicks: (activeKeys = []) => {
      const activeSet = new Set(activeKeys.map(String));
      const currentTicks = get().ticks;
      const currentSparklines = get().sparklines;
      const newTicks = {};
      const newSparklines = {};
      let pruned = false;

      for (const [k, v] of Object.entries(currentTicks)) {
        if (k.startsWith("NSE_INDEX") || k.startsWith("BSE_INDEX") || k === "INDIA_VIX" || activeSet.has(k)) {
          newTicks[k] = v;
        } else {
          pruned = true;
        }
      }

      for (const [k, v] of Object.entries(currentSparklines)) {
        if (k.startsWith("NSE_INDEX") || k.startsWith("BSE_INDEX") || k === "INDIA_VIX" || activeSet.has(k)) {
          newSparklines[k] = v;
        } else {
          pruned = true;
        }
      }

      if (pruned) {
        set({ ticks: newTicks, sparklines: newSparklines });
      }
    },
  }))
);
