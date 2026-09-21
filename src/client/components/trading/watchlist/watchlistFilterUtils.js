import { getStockMeta } from "../../../stores/useTradingStore";
import { getLiquidityRadarData } from "./watchlistRadarUtils";

export function filterAndSortWatchlistSymbols(watchlistSymbols, search, activeSectorFilter, sortBy) {
  return watchlistSymbols
    .filter((symbol) => {
      const meta = getStockMeta(symbol);
      if (search) {
        const query = search.toLowerCase();
        const symMatch = symbol.toLowerCase().includes(query);
        const nameMatch = (meta?.name || "").toLowerCase().includes(query);
        const sectorMatch = (meta?.sector || "").toLowerCase().includes(query);
        if (!symMatch && !nameMatch && !sectorMatch) return false;
      }

      if (activeSectorFilter === "nifty") {
        return ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS", "SBIN.NS"].includes(symbol);
      }
      if (activeSectorFilter === "banking") {
        const sector = (meta?.sector || "").toLowerCase();
        return sector.includes("bank") || sector.includes("nbfc") || sector.includes("finance");
      }
      if (activeSectorFilter === "tech") {
        const sector = (meta?.sector || "").toLowerCase();
        return sector.includes("it") || sector.includes("tech") || sector.includes("software");
      }
      if (activeSectorFilter === "liquid") {
        return ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS", "SBIN.NS", "TATAMOTORS.NS"].includes(symbol);
      }
      if (activeSectorFilter === "breakouts") {
        const radar = getLiquidityRadarData(symbol, meta);
        return radar.isNear52wHigh;
      }
      if (activeSectorFilter === "gainers") {
        return (meta?.change || 0) >= 0;
      }
      if (activeSectorFilter === "dips") {
        return (meta?.change || 0) < 0;
      }
      return true;
    })
    .sort((a, b) => {
      const metaA = getStockMeta(a);
      const metaB = getStockMeta(b);

      if (sortBy === "gainers") return (metaB?.changePct || 0) - (metaA?.changePct || 0);
      if (sortBy === "dips") return (metaA?.changePct || 0) - (metaB?.changePct || 0);
      if (sortBy === "volume" || sortBy === "rvol") {
        const radarA = getLiquidityRadarData(a, metaA);
        const radarB = getLiquidityRadarData(b, metaB);
        return radarB.rvol - radarA.rvol;
      }
      if (sortBy === "price_high") return (metaB?.price || 0) - (metaA?.price || 0);
      if (sortBy === "price_low") return (metaA?.price || 0) - (metaB?.price || 0);
      return 0;
    });
}
