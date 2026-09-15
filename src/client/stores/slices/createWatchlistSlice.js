import { DEFAULT_WATCHLIST } from "./stockMetadata";

export const createWatchlistSlice = (set, get) => ({
  watchlistSymbols: (() => {
    try {
      const saved = localStorage.getItem("portfolio-watchlist");
      return saved ? JSON.parse(saved) : DEFAULT_WATCHLIST;
    } catch {
      return DEFAULT_WATCHLIST;
    }
  })(),
  activeSectorFilter: "all",
  setActiveSectorFilter: (filter) => set({ activeSectorFilter: filter }),
  addWatchSymbol: (symbol) => {
    const clean = symbol.toUpperCase().endsWith(".NS") ? symbol.toUpperCase() : `${symbol.toUpperCase()}.NS`;
    const list = get().watchlistSymbols;
    if (!list.includes(clean)) {
      const next = [clean, ...list];
      set({ watchlistSymbols: next });
      try { localStorage.setItem("portfolio-watchlist", JSON.stringify(next)); } catch {}
    }
  },
  removeWatchSymbol: (symbol) => {
    const next = get().watchlistSymbols.filter((s) => s !== symbol);
    set({ watchlistSymbols: next });
    try { localStorage.setItem("portfolio-watchlist", JSON.stringify(next)); } catch {}
  },
  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),
});
