import { useState, useMemo } from "react";
import { soundEngine } from "../../utils/soundEngine";
import { 
  USD_INR_RATE, 
  USD_ANNUAL_ALPHA, 
  DEFAULT_US_STOCKS 
} from "./foreignStocksData";

export function useForeignStocksData() {
  const [selectedSector, setSelectedSector] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [copiedSymbol, setCopiedSymbol] = useState(null);

  // 💱 Interactive Simulator State
  const [simRupees, setSimRupees] = useState(50000);
  const [simStockSymbol, setSimStockSymbol] = useState("NVDA");

  // Determine US Market Status in IST
  const isMarketOpen = useMemo(() => {
    const now = new Date();
    // US Market is 9:30 AM – 4:00 PM EST (7:00 PM – 1:30 AM IST)
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentMin = hours * 60 + minutes;
    return currentMin >= 1140 || currentMin <= 90;
  }, []);

  // Filtered US Stocks
  const filteredStocks = useMemo(() => {
    return DEFAULT_US_STOCKS.filter((stock) => {
      const matchesSector = selectedSector === "all" || stock.sector === selectedSector;
      const matchesSearch = 
        stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.whatItDoes.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSector && matchesSearch;
    });
  }, [selectedSector, searchQuery]);

  // Selected Stock for Simulator
  const simStock = useMemo(() => {
    return DEFAULT_US_STOCKS.find((s) => s.symbol === simStockSymbol) || DEFAULT_US_STOCKS[0];
  }, [simStockSymbol]);

  // Simulator Calculations
  const simUsdCapital = Number(simRupees) / USD_INR_RATE;
  const simSharesOwned = simUsdCapital / simStock.price;
  const simEstGainPct = 15.0; // Average conservative annualized tech return
  const simProjectedInrValue = (simUsdCapital * (1 + simEstGainPct / 100)) * (USD_INR_RATE * (1 + USD_ANNUAL_ALPHA / 100));
  const simNetInrProfit = simProjectedInrValue - Number(simRupees);
  const simTotalInrRoiPct = ((simNetInrProfit / Number(simRupees)) * 100).toFixed(1);

  const handleCopySymbol = (sym) => {
    navigator.clipboard?.writeText(sym);
    setCopiedSymbol(sym);
    soundEngine.playSuccessTone();
    setTimeout(() => setCopiedSymbol(null), 2000);
  };

  return {
    selectedSector, setSelectedSector,
    searchQuery, setSearchQuery,
    viewMode, setViewMode,
    copiedSymbol, handleCopySymbol,
    simRupees, setSimRupees,
    simStockSymbol, setSimStockSymbol,
    isMarketOpen, filteredStocks,
    simStock, simUsdCapital, simSharesOwned,
    simProjectedInrValue, simTotalInrRoiPct
  };
}
