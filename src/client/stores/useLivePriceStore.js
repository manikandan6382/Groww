import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export const useLivePriceStore = create(
  subscribeWithSelector((set, get) => ({
    ticks: {}, // { [tradeIdOrSymbol]: { ltp: number, timestamp: number, change: number, direction: 'up' | 'down' } }
    indices: {
      "NSE_INDEX|Nifty 50": { ltp: 24245.00, change: 84.20, changePct: 0.35, timestamp: Date.now() },
      "NSE_INDEX|Nifty Bank": { ltp: 52240.00, change: 185.00, changePct: 0.36, timestamp: Date.now() },
    },
    
    updateTick: (id, ltp, change = 0) => {
      const prev = get().ticks?.[id];
      const prevLtp = prev?.ltp ?? ltp;
      const direction = ltp > prevLtp ? "up" : ltp < prevLtp ? "down" : (prev?.direction ?? "up");
      
      set((state) => ({
        ticks: {
          ...state.ticks,
          [id]: {
            ltp,
            change,
            direction,
            timestamp: Date.now(),
          },
        },
      }));
    },

    updateIndexTick: (symbol, ltp, change = 0, changePct = 0) => {
      set((state) => ({
        indices: {
          ...state.indices,
          [symbol]: {
            ltp,
            change,
            changePct,
            timestamp: Date.now(),
          },
        },
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
