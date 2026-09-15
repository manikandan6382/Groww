import { getStockMeta } from "../../../stores/useTradingStore";

export function filterAndSortWatchlistSymbols(watchlistSymbols, search, activeSectorFilter, sortBy) {
  return watchlistSymbols
    .filter((symbol) => {
      const meta = getStockMeta(symbol);
      if (search && !symbol.toLowerCase().includes(search.toLowerCase()) && !meta.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (activeSectorFilter === "nifty") return ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS"].includes(symbol);
      if (activeSectorFilter === "banking") return meta.sector.toLowerCase().includes("bank") || meta.sector.toLowerCase().includes("nbfc");
      if (activeSectorFilter === "tech") return meta.sector.toLowerCase().includes("it") || meta.sector.toLowerCase().includes("tech");
      if (activeSectorFilter === "liquid") return ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS", "SBIN.NS", "TATAMOTORS.NS"].includes(symbol);
      if (activeSectorFilter === "gainers") return meta.change >= 0;
      if (activeSectorFilter === "dips") return meta.change < 0;
      return true;
    })
    .sort((a, b) => {
      const metaA = getStockMeta(a);
      const metaB = getStockMeta(b);
      if (sortBy === "gainers") return metaB.changePct - metaA.changePct;
      if (sortBy === "dips") return metaA.changePct - metaB.changePct;
      if (sortBy === "volume") {
        const isAHeavy = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS"].includes(a);
        const isBHeavy = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS"].includes(b);
        return isBHeavy - isAHeavy;
      }
      return 0;
    });
}
