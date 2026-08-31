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
    
    updateTick: (id, ltp, change = 0) => {
      const numLtp = Number(ltp);
      const prev = get().ticks?.[id];
      const prevLtp = prev?.ltp ?? numLtp;
      const direction = numLtp > prevLtp ? "up" : numLtp < prevLtp ? "down" : (prev?.direction ?? "up");
      const prevSparkline = get().sparklines?.[id] ?? [numLtp];
      const nextSparkline = [...prevSparkline.slice(-14), numLtp];
      
      set((state) => ({
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
      // updates: Array<{ id, ltp, change }>
      const currentTicks = get().ticks;
      const currentSparklines = get().sparklines;
      const newTicks = { ...currentTicks };
      const newSparklines = { ...currentSparklines };
      const now = Date.now();
      for (const { id, ltp, change = 0 } of updates) {
        if (!id) continue;
        const numLtp = Number(ltp);
        const prev = currentTicks[id];
        const prevLtp = prev?.ltp ?? numLtp;
        const direction = numLtp > prevLtp ? "up" : numLtp < prevLtp ? "down" : (prev?.direction ?? "up");
        newTicks[id] = { ltp: numLtp, change, direction, timestamp: now };
        
        const prevSparkline = currentSparklines?.[id] ?? [numLtp];
        newSparklines[id] = [...prevSparkline.slice(-14), numLtp];
      }
      set({ ticks: newTicks, sparklines: newSparklines });
    },

    updateIndexTick: (symbol, ltp, change = 0, changePct = 0) => {
      const numLtp = Number(ltp);
      const prevSparkline = get().sparklines?.[symbol] ?? [numLtp];
      const nextSparkline = [...prevSparkline.slice(-14), numLtp];
      set((state) => ({
        indices: {
          ...state.indices,
          [symbol]: {
            ltp: numLtp,
            change,
            changePct,
            timestamp: Date.now(),
          },
        },
        sparklines: {
          ...state.sparklines,
          [symbol]: nextSparkline,
        }
      }));
    },

    setBulkTicks: (newTicksMap) => {
      set((state) => ({
        ticks: {
          ...state.ticks,
          ...newTicksMap,
        },
      }));
    },
  }))
);
