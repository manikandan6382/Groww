import { useState, useMemo, useEffect, useCallback } from "react";
import { soundEngine } from "../../utils/soundEngine";
import { 
  USD_INR_RATE, 
  USD_ANNUAL_ALPHA, 
  DEFAULT_US_STOCKS 
} from "./foreignStocksData";

const WATCHLIST_STORAGE_KEY = "portfoliox:foreign-watchlist";
const COMPARED_STORAGE_KEY = "portfoliox:foreign-compared";
const LRS_TCS_THRESHOLD = 700000; // ₹7,00,000 annual statutory exemption
const INFLATION_CPI_RATE = 0.052; // 5.2% Indian annual CPI

export function useForeignStocksData() {
  const [selectedSector, setSelectedSector] = useState("all"); // "all" | sector | "watchlist"
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"
  const [sortBy, setSortBy] = useState("default"); // "default" | "cagr" | "pe" | "gain" | "mcap"
  const [copiedSymbol, setCopiedSymbol] = useState(null);

  // 🌟 Watchlist Persistence State
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const stored = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      return stored ? JSON.parse(stored) : ["NVDA", "AAPL", "MSFT", "VOO"];
    } catch {
      return ["NVDA", "AAPL", "MSFT", "VOO"];
    }
  });

  // 🔍 Deep-Dive Stock Detail Modal State
  const [selectedModalStock, setSelectedModalStock] = useState(null);

  // 💱 Persistent Simulator Preferences
  const storedPrefs = useMemo(() => {
    try {
      const raw = localStorage.getItem("portfoliox:foreign-sim-prefs");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);

  // 💱 Interactive Simulator State (Multi-Year, SIP, Hybrid Goal & FX Engine)
  const [simRupees, setSimRupees] = useState(() => storedPrefs.simRupees ?? 50000);
  const [simStockSymbol, setSimStockSymbol] = useState(() => storedPrefs.simStockSymbol ?? "NVDA");
  const [simYears, setSimYears] = useState(() => storedPrefs.simYears ?? 3); // 1, 3, 5, 10 Years
  const [simMode, setSimMode] = useState(() => storedPrefs.simMode ?? "lumpsum"); // "lumpsum" | "sip"
  const [adjustInflation, setAdjustInflation] = useState(() => storedPrefs.adjustInflation ?? false);
  const [customCagr, setCustomCagr] = useState(null); // null means use stock's historical CAGR
  const [priorRemittancesInr, setPriorRemittancesInr] = useState(0); // Cumulative remittances in current FY
  const [fxScenario, setFxScenario] = useState(() => storedPrefs.fxScenario ?? "mean"); // "stagnant" (0%) | "mean" (3.5%) | "shock" (6.0%)
  const [simDirection, setSimDirection] = useState(() => storedPrefs.simDirection ?? "forward"); // "forward" | "goal"
  const [goalTargetRupees, setGoalTargetRupees] = useState(() => storedPrefs.goalTargetRupees ?? 1000000); // Default ₹10 Lakhs for goal mode
  const [seedCapitalRupees, setSeedCapitalRupees] = useState(() => storedPrefs.seedCapitalRupees ?? 0); // Starting lump sum seed for hybrid goal
  const [simulatePullback, setSimulatePullback] = useState(false); // DCA volatility dip simulator
  const [comparedSymbols, setComparedSymbols] = useState(() => {
    try {
      const stored = localStorage.getItem(COMPARED_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }); // Max 3 Titans for side-by-side dock

  // Save simulator preferences to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("portfoliox:foreign-sim-prefs", JSON.stringify({
        simRupees,
        simStockSymbol,
        simYears,
        simMode,
        simDirection,
        goalTargetRupees,
        seedCapitalRupees,
        fxScenario,
        adjustInflation
      }));
    } catch { /* ignore */ }
  }, [simRupees, simStockSymbol, simYears, simMode, simDirection, goalTargetRupees, seedCapitalRupees, fxScenario, adjustInflation]);

  // Save watchlist changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
    } catch { /* ignore */ }
  }, [watchlist]);

  // Save compared symbols changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(COMPARED_STORAGE_KEY, JSON.stringify(comparedSymbols));
    } catch { /* ignore */ }
  }, [comparedSymbols]);

  const toggleWatchlist = useCallback((symbol) => {
    setWatchlist((prev) => {
      const exists = prev.includes(symbol);
      const next = exists ? prev.filter((s) => s !== symbol) : [...prev, symbol];
      if (!exists) {
        soundEngine.playSuccessTone();
      } else {
        soundEngine.playTabSwitchTone();
      }
      return next;
    });
  }, []);

  // Filtered US Stocks (Handling Sectors, Watchlist, and Search)
  const filteredStocks = useMemo(() => {
    const base = DEFAULT_US_STOCKS.filter((stock) => {
      // 1. Sector or Watchlist Filter
      let matchesCategory = true;
      if (selectedSector === "watchlist") {
        matchesCategory = watchlist.includes(stock.symbol);
      } else if (selectedSector !== "all") {
        matchesCategory = stock.sector === selectedSector;
      }

      // 2. Search Filter
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        stock.symbol.toLowerCase().includes(q) ||
        stock.name.toLowerCase().includes(q) ||
        stock.whatItDoes.toLowerCase().includes(q) ||
        (stock.tag && stock.tag.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });

    // Multi-factor sorting
    const sorted = [...base];
    if (sortBy === "cagr") {
      sorted.sort((a, b) => (b.cagr3Y || 0) - (a.cagr3Y || 0));
    } else if (sortBy === "pe") {
      sorted.sort((a, b) => parseFloat(a.peRatio || "999") - parseFloat(b.peRatio || "999"));
    } else if (sortBy === "gain") {
      sorted.sort((a, b) => b.changePct - a.changePct);
    } else if (sortBy === "mcap") {
      sorted.sort((a, b) => (b.mktCapNum || 0) - (a.mktCapNum || 0));
    } else if (sortBy === "beta") {
      sorted.sort((a, b) => (a.beta || 1) - (b.beta || 1));
    }

    return sorted;
  }, [selectedSector, searchQuery, watchlist, sortBy]);

  // Selected Stock for Simulator
  const simStock = useMemo(() => {
    return DEFAULT_US_STOCKS.find((s) => s.symbol === simStockSymbol) || DEFAULT_US_STOCKS[0];
  }, [simStockSymbol]);

  // Active CAGR for Simulator: Either user custom or stock's 3-year historical CAGR
  const activeSimCagr = customCagr ?? simStock.cagr3Y ?? 15.0;

  // Active FX Alpha (USD/INR trajectory)
  const activeFxAlpha = fxScenario === "stagnant" ? 0.0 : fxScenario === "shock" ? 6.0 : USD_ANNUAL_ALPHA;

  // Simulator Compounding Engine (Multi-Year, SIP & Cumulative LRS TCS)
  const cleanRupees = Math.max(0, Number(simRupees) || 0);
  const cleanPrior = Math.max(0, Number(priorRemittancesInr) || 0);
  const remainingTcsExemption = Math.max(0, LRS_TCS_THRESHOLD - cleanPrior);
  const tcsTaxableExcess = Math.max(0, cleanRupees - remainingTcsExemption);
  const isTcsExempt = tcsTaxableExcess === 0;
  const tcsAmount = Math.round(tcsTaxableExcess * 0.20); // 20% on excess over remaining threshold

  // Annualized combined rate (Stock CAGR + USD/INR appreciation)
  const nominalAnnualRate = (1 + activeSimCagr / 100) * (1 + activeFxAlpha / 100) - 1;
  const effectiveAnnualRate = adjustInflation
    ? (1 + nominalAnnualRate) / (1 + INFLATION_CPI_RATE) - 1
    : nominalAnnualRate;

  // Antifragile Floor: Insulate against severe crash inputs or bankruptcy (-99.99% floor)
  const safeEffectiveBase = Math.max(0.0001, 1 + effectiveAnnualRate);
  const monthlyUsRateCalculated = Math.pow(safeEffectiveBase, 1 / 12) - 1;

  let totalInvestedRupees = 0;
  let simProjectedInrValue = 0;

  if (cleanRupees > 0) {
    if (simMode === "lumpsum") {
      totalInvestedRupees = cleanRupees;
      simProjectedInrValue = cleanRupees * Math.pow(safeEffectiveBase, simYears);
    } else {
      // Monthly SIP Mode
      const months = Math.max(1, (Number(simYears) || 1) * 12);
      totalInvestedRupees = cleanRupees * months;
      if (monthlyUsRateCalculated > 0) {
        simProjectedInrValue = cleanRupees * ((Math.pow(1 + monthlyUsRateCalculated, months) - 1) / monthlyUsRateCalculated) * (1 + monthlyUsRateCalculated);
      } else {
        simProjectedInrValue = totalInvestedRupees;
      }
    }
  }

  // Volatility Dip Adjustment (if enabled)
  if (simulatePullback && simProjectedInrValue > 0) {
    if (simMode === "sip") {
      // SIP accumulators gain bonus shares during Year 1 dip
      simProjectedInrValue = Math.round(simProjectedInrValue * 1.075);
    } else {
      // Lumpsum absorbs -20% hit in Yr 1
      simProjectedInrValue = Math.round(simProjectedInrValue * 0.85);
    }
  }

  const simUsdCapital = cleanRupees > 0 ? cleanRupees / USD_INR_RATE : 0;
  const simSharesOwned = cleanRupees > 0 && simStock.price > 0 ? simUsdCapital / simStock.price : 0;
  const simNetInrProfit = Math.max(0, simProjectedInrValue - totalInvestedRupees);
  const simTotalInrRoiPct = totalInvestedRupees > 0
    ? (((simProjectedInrValue - totalInvestedRupees) / totalInvestedRupees) * 100).toFixed(1)
    : "0.0";

  // 🎯 Reverse Wealth Goal Solver (Hybrid Seed Capital + Monthly SIP Annuity)
  const cleanGoal = Math.max(0, Number(goalTargetRupees) || 0);
  const cleanSeed = Math.max(0, Number(seedCapitalRupees) || 0);
  const safeYears = Math.max(1, Number(simYears) || 1);
  let requiredMonthlySip = 0;
  let goalTotalOutPocket = 0;
  let goalMarketWealth = 0;

  if (cleanGoal > 0) {
    const nMonths = safeYears * 12;
    // Compounded future value of initial seed capital over simYears
    const seedFutureValue = cleanSeed > 0 ? cleanSeed * Math.pow(safeEffectiveBase, safeYears) : 0;
    const remainingGoal = Math.max(0, cleanGoal - seedFutureValue);

    if (remainingGoal > 0) {
      if (monthlyUsRateCalculated > 0) {
        requiredMonthlySip = Math.round(
          (remainingGoal * monthlyUsRateCalculated) / ((Math.pow(1 + monthlyUsRateCalculated, nMonths) - 1) * (1 + monthlyUsRateCalculated))
        );
      } else {
        requiredMonthlySip = Math.round(remainingGoal / nMonths);
      }
    } else {
      requiredMonthlySip = 0;
    }

    const cleanSip = Number.isFinite(requiredMonthlySip) ? Math.max(0, requiredMonthlySip) : 0;
    goalTotalOutPocket = cleanSeed + (cleanSip * nMonths);
    goalMarketWealth = Math.max(0, cleanGoal - goalTotalOutPocket);
  }

  // 🔄 Synchronized State Metrics (Smooth Dynamic Binding in Goal Mode)
  const isGoal = simDirection === "goal";
  const goalMonthlyUsd = requiredMonthlySip > 0 ? requiredMonthlySip / USD_INR_RATE : 0;
  const goalMonthlyShares = goalMonthlyUsd > 0 && simStock.price > 0 ? goalMonthlyUsd / simStock.price : 0;

  const effectiveSimUsdCapital = isGoal ? goalMonthlyUsd : simUsdCapital;
  const effectiveSimSharesOwned = isGoal ? goalMonthlyShares : simSharesOwned;
  const effectiveTotalInvestedRupees = isGoal ? goalTotalOutPocket : totalInvestedRupees;
  const effectiveSimProjectedInrValue = isGoal ? cleanGoal : simProjectedInrValue;
  const effectiveSimNetInrProfit = isGoal ? goalMarketWealth : simNetInrProfit;
  const effectiveSimTotalInrRoiPct = effectiveTotalInvestedRupees > 0
    ? (((effectiveSimProjectedInrValue - effectiveTotalInvestedRupees) / effectiveTotalInvestedRupees) * 100).toFixed(1)
    : "0.0";

  // 📈 Multi-Year Compounding Trajectory Points (Year 0 through Year simYears)
  const trajectoryData = useMemo(() => {
    const points = [];
    const monthlyFdRate = Math.pow(1 + 0.065, 1 / 12) - 1;
    const monthlyNiftyRate = Math.pow(1 + 0.125, 1 / 12) - 1;
    const monthlyUsRate = monthlyUsRateCalculated;

    for (let yr = 0; yr <= simYears; yr++) {
      if (yr === 0) {
        const startCapital = isGoal ? cleanSeed : (simMode === "lumpsum" ? cleanRupees : 0);
        points.push({
          year: 0,
          label: "Start",
          invested: startCapital,
          fdValue: startCapital,
          niftyValue: startCapital,
          usValue: startCapital,
        });
        continue;
      }

      if (isGoal) {
        // Goal Mode: Hybrid Seed compounding + required Monthly SIP installments
        const m = yr * 12;
        const inv = cleanSeed + (requiredMonthlySip * m);

        const seedFd = cleanSeed * Math.pow(1 + 0.065, yr);
        const sipFd = monthlyFdRate > 0
          ? requiredMonthlySip * ((Math.pow(1 + monthlyFdRate, m) - 1) / monthlyFdRate) * (1 + monthlyFdRate)
          : requiredMonthlySip * m;
        const fd = Math.round(seedFd + sipFd);

        const seedNifty = cleanSeed * Math.pow(1 + 0.125, yr);
        const sipNifty = monthlyNiftyRate > 0
          ? requiredMonthlySip * ((Math.pow(1 + monthlyNiftyRate, m) - 1) / monthlyNiftyRate) * (1 + monthlyNiftyRate)
          : requiredMonthlySip * m;
        const nifty = Math.round(seedNifty + sipNifty);

        const seedUs = cleanSeed * Math.pow(safeEffectiveBase, yr);
        const sipUs = monthlyUsRate > 0
          ? requiredMonthlySip * ((Math.pow(1 + monthlyUsRate, m) - 1) / monthlyUsRate) * (1 + monthlyUsRate)
          : requiredMonthlySip * m;
        let us = Math.round(seedUs + sipUs);

        if (simulatePullback && yr === 1) {
          us = Math.round(us * 0.90);
        } else if (simulatePullback && yr > 1) {
          us = Math.round(us * 1.05);
        }

        points.push({ year: yr, label: `Yr ${yr}`, invested: inv, fdValue: fd, niftyValue: nifty, usValue: Math.max(0, us) });
      } else if (simMode === "lumpsum") {
        const inv = cleanRupees;
        const fd = Math.round(cleanRupees * Math.pow(1 + 0.065, yr));
        const nifty = Math.round(cleanRupees * Math.pow(1 + 0.125, yr));
        let us = Math.round(cleanRupees * Math.pow(safeEffectiveBase, yr));
        if (simulatePullback && yr === 1) {
          us = Math.round(cleanRupees * 0.80);
        } else if (simulatePullback && yr > 1) {
          us = Math.round(cleanRupees * 0.80 * Math.pow(safeEffectiveBase, yr - 1));
        }
        points.push({ year: yr, label: `Yr ${yr}`, invested: inv, fdValue: fd, niftyValue: nifty, usValue: Math.max(0, us) });
      } else {
        const m = yr * 12;
        const inv = cleanRupees * m;
        const fd = monthlyFdRate > 0
          ? Math.round(cleanRupees * ((Math.pow(1 + monthlyFdRate, m) - 1) / monthlyFdRate) * (1 + monthlyFdRate))
          : inv;
        const nifty = monthlyNiftyRate > 0
          ? Math.round(cleanRupees * ((Math.pow(1 + monthlyNiftyRate, m) - 1) / monthlyNiftyRate) * (1 + monthlyNiftyRate))
          : inv;
        let us = monthlyUsRate > 0
          ? Math.round(cleanRupees * ((Math.pow(1 + monthlyUsRate, m) - 1) / monthlyUsRate) * (1 + monthlyUsRate))
          : inv;
        if (simulatePullback) {
          us = Math.round(us * 1.075);
        }
        points.push({ year: yr, label: `Yr ${yr}`, invested: inv, fdValue: fd, niftyValue: nifty, usValue: Math.max(0, us) });
      }
    }
    return points;
  }, [simYears, simMode, cleanRupees, cleanSeed, isGoal, requiredMonthlySip, effectiveAnnualRate, simulatePullback]);

  // 3-Way Benchmark Showdown Terminal Metrics
  const finalPoint = trajectoryData[trajectoryData.length - 1] || { fdValue: 0, niftyValue: 0, usValue: 0, invested: 0 };
  const benchmarkFdValue = finalPoint.fdValue;
  const benchmarkFdGain = Math.max(0, benchmarkFdValue - effectiveTotalInvestedRupees);
  const benchmarkNiftyValue = finalPoint.niftyValue;
  const benchmarkNiftyGain = Math.max(0, benchmarkNiftyValue - effectiveTotalInvestedRupees);
  const benchmarkUsValue = finalPoint.usValue;
  const benchmarkUsGain = Math.max(0, benchmarkUsValue - effectiveTotalInvestedRupees);
  const alphaOverNifty = Math.max(0, benchmarkUsValue - benchmarkNiftyValue);
  const alphaOverFd = Math.max(0, benchmarkUsValue - benchmarkFdValue);

  // Watchlist Sector Concentration Telemetry
  const watchlistSectorDistribution = useMemo(() => {
    if (watchlist.length === 0) return [];
    const counts = {};
    for (const sym of watchlist) {
      const stock = DEFAULT_US_STOCKS.find((s) => s.symbol === sym);
      if (stock) {
        counts[stock.sectorLabel] = (counts[stock.sectorLabel] || 0) + 1;
      }
    }
    return Object.entries(counts).map(([label, count]) => ({
      label,
      count,
      pct: Math.round((count / watchlist.length) * 100),
    }));
  }, [watchlist]);

  const handleCopySymbol = useCallback((sym) => {
    navigator.clipboard?.writeText(sym);
    setCopiedSymbol(sym);
    soundEngine.playSuccessTone();
    setTimeout(() => setCopiedSymbol(null), 2000);
  }, []);

  const handleSelectSimStock = useCallback((symbol) => {
    setSimStockSymbol(symbol);
    setCustomCagr(null); // reset custom slider to match new stock's baseline
    soundEngine.playTabSwitchTone();
    const el = document.getElementById("foreign-simulator");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  // 🥊 Titan Compare Dock Handlers (Max 3 Stocks)
  const toggleCompareStock = useCallback((symbol) => {
    setComparedSymbols((prev) => {
      if (prev.includes(symbol)) {
        soundEngine.playTabSwitchTone();
        return prev.filter((s) => s !== symbol);
      }
      if (prev.length >= 3) {
        soundEngine.playSuccessTone();
        return [...prev.slice(1), symbol];
      }
      soundEngine.playSuccessTone();
      return [...prev, symbol];
    });
  }, []);

  const clearCompareStocks = useCallback(() => {
    setComparedSymbols([]);
    soundEngine.playTabSwitchTone();
  }, []);

  const resetFilters = useCallback(() => {
    setSelectedSector("all");
    setSearchQuery("");
    soundEngine.playTabSwitchTone();
  }, []);

  const comparedStocks = useMemo(() => {
    return comparedSymbols
      .map((sym) => DEFAULT_US_STOCKS.find((s) => s.symbol === sym))
      .filter(Boolean);
  }, [comparedSymbols]);

  return {
    selectedSector, setSelectedSector,
    searchQuery, setSearchQuery,
    resetFilters,
    viewMode, setViewMode,
    sortBy, setSortBy,
    copiedSymbol, handleCopySymbol,
    watchlist, toggleWatchlist,
    watchlistSectorDistribution,
    comparedSymbols, comparedStocks,
    toggleCompareStock, clearCompareStocks,
    selectedModalStock, setSelectedModalStock,
    simRupees, setSimRupees,
    simStockSymbol, setSimStockSymbol: handleSelectSimStock,
    simYears, setSimYears,
    simMode, setSimMode,
    adjustInflation, setAdjustInflation,
    customCagr, setCustomCagr,
    activeSimCagr,
    filteredStocks,
    simStock,
    simUsdCapital: effectiveSimUsdCapital,
    simSharesOwned: effectiveSimSharesOwned,
    simProjectedInrValue: effectiveSimProjectedInrValue,
    simTotalInrRoiPct: effectiveSimTotalInrRoiPct,
    simNetInrProfit: effectiveSimNetInrProfit,
    totalInvestedRupees: effectiveTotalInvestedRupees,
    simDirection, setSimDirection,
    goalTargetRupees, setGoalTargetRupees,
    seedCapitalRupees, setSeedCapitalRupees,
    requiredMonthlySip, goalTotalOutPocket, goalMarketWealth,
    simulatePullback, setSimulatePullback,
    trajectoryData,
    benchmarkFdValue, benchmarkFdGain,
    benchmarkNiftyValue, benchmarkNiftyGain,
    benchmarkUsValue, benchmarkUsGain,
    alphaOverNifty, alphaOverFd,
    priorRemittancesInr, setPriorRemittancesInr,
    remainingTcsExemption,
    fxScenario, setFxScenario,
    activeFxAlpha,
    isTcsExempt, tcsTaxableExcess, tcsAmount,
  };
}
