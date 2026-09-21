import { useState, useMemo, useEffect, useRef } from "react";
import { getStockMeta } from "../../../stores/useTradingStore";
import { soundEngine } from "../../../utils/soundEngine";

export function useHoldingsTableData(holdings = []) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("weight");
  const [viewMode, setViewMode] = useState("all"); // 'all' | 'cost' | 'performance'
  const [concentrationMode, setConcentrationMode] = useState("valuation"); // 'valuation' (with profit) | 'cost' (without profit)
  const [copiedSymbol, setCopiedSymbol] = useState(null);
  const [hoveredHolding, setHoveredHolding] = useState(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInput = activeTag === "input" || activeTag === "textarea";

      if (e.key === "/" && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur();
        setSearch("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const items = Array.isArray(holdings) ? holdings : [];

  const totalHoldingsValue = useMemo(() => {
    const sum = items.reduce((acc, h) => acc + Number(h.quantity || 0) * Number(h.last_price || h.average_price || 0), 0);
    return Math.max(0, sum);
  }, [items]);

  const totalInvestedValue = useMemo(() => {
    const sum = items.reduce((acc, h) => acc + Number(h.quantity || 0) * Number(h.average_price || 0), 0);
    return Math.max(0, sum);
  }, [items]);

  const totalUnrealizedPnl = totalHoldingsValue - totalInvestedValue;
  const totalUnrealizedPnlPct = totalInvestedValue > 0 ? ((totalUnrealizedPnl / totalInvestedValue) * 100).toFixed(2) : "0.00";
  const portfolioProfitMultiplier = totalInvestedValue > 0 ? Number((totalHoldingsValue / totalInvestedValue).toFixed(2)) : 1.0;
  const portfolioCushionPct = totalHoldingsValue > 0 ? Number(((totalUnrealizedPnl / totalHoldingsValue) * 100).toFixed(1)) : 0.0;
  const avgCostPerPosition = items.length > 0 ? totalInvestedValue / items.length : 0;

  const enrichedItems = useMemo(() => {
    return items.map((h) => {
      const sym = h.tradingsymbol;
      const meta = getStockMeta(`${sym}.NS`);
      const qty = Number(h.quantity || 0);
      const avg = Number(h.average_price || 0);
      const isZeroCost = avg <= 0; // Corporate Action / Spin-off / Demerger / Bonus shares pending cost basis
      const ltp = Number(h.last_price || avg || 0);
      const val = qty * ltp;
      const investedVal = isZeroCost ? 0 : qty * avg; // Value without profit (Original Cost Basis)
      const valuationWeightPct = totalHoldingsValue > 0 ? Number(((val / totalHoldingsValue) * 100).toFixed(1)) : 0.0;
      const investedWeightPct = totalInvestedValue > 0 ? Number(((investedVal / totalInvestedValue) * 100).toFixed(1)) : 0.0;
      const activeWeightPct = concentrationMode === "cost" ? investedWeightPct : valuationWeightPct;

      const pnl = Number(h.pnl ?? (val - investedVal));
      const pnlPct = investedVal > 0 ? Number((((val - investedVal) / investedVal) * 100).toFixed(2)) : 0.00;
      const profitPerShare = Number((ltp - avg).toFixed(2));
      const cushionPct = val > 0 && investedVal > 0 ? Number((((val - investedVal) / val) * 100).toFixed(1)) : 0.0;

      let dayChg = 0;
      let dayChgPct = 0;
      if (h.day_change != null && !Number.isNaN(Number(h.day_change))) {
        dayChg = Number(h.day_change);
        dayChgPct = Number(h.day_change_percentage ?? (h.close_price > 0 ? ((dayChg / Number(h.close_price)) * 100) : 0));
      } else if (h.close_price && Number(h.close_price) > 0) {
        dayChg = ltp - Number(h.close_price);
        dayChgPct = (dayChg / Number(h.close_price)) * 100;
      }

      return {
        ...h,
        meta,
        qty,
        avg,
        ltp,
        val,
        investedVal,
        isZeroCost,
        breakEvenPrice: avg,
        profitPerShare,
        cushionPct,
        valuationWeightPct,
        investedWeightPct,
        weightPct: activeWeightPct, // adapts dynamically to concentration mode
        pnl,
        pnlPct,
        dayChg,
        dayChgPct: Number(dayChgPct.toFixed(2)),
        isGain: pnl >= 0,
        isDayGain: dayChg >= 0,
      };
    });
  }, [items, totalHoldingsValue, totalInvestedValue, concentrationMode]);

  const filtered = useMemo(() => {
    return enrichedItems.filter((item) => {
      const sym = item.tradingsymbol.toLowerCase();
      const name = (item.meta?.name || "").toLowerCase();
      const sector = (item.meta?.sector || "").toLowerCase();
      const q = search.toLowerCase().trim();

      if (q && !sym.includes(q) && !name.includes(q) && !sector.includes(q)) {
        return false;
      }

      if (filter === "gain") return item.isGain;
      if (filter === "loss") return !item.isGain;
      if (filter === "banking") return sector.includes("bank");
      if (filter === "tech") return sector.includes("it") || sector.includes("tech");
      if (filter === "large") return item.weightPct >= 15;
      return true;
    }).sort((a, b) => {
      if (sortBy === "weight") return b.weightPct - a.weightPct;
      if (sortBy === "invested") return b.investedVal - a.investedVal;
      if (sortBy === "val") return b.val - a.val;
      if (sortBy === "pnl") return b.pnl - a.pnl;
      if (sortBy === "pnlPct") return b.pnlPct - a.pnlPct;
      if (sortBy === "day") return b.dayChgPct - a.dayChgPct;
      if (sortBy === "symbol") return a.tradingsymbol.localeCompare(b.tradingsymbol);
      return 0;
    });
  }, [enrichedItems, search, filter, sortBy]);

  const gainersCount = enrichedItems.filter((i) => i.isGain).length;
  const losersCount = enrichedItems.filter((i) => !i.isGain).length;
  const topHolding = enrichedItems.reduce((max, i) => (i.val > (max?.val || 0) ? i : max), enrichedItems[0]);
  const topInvested = enrichedItems.reduce((max, i) => (i.investedVal > (max?.investedVal || 0) ? i : max), enrichedItems[0]);

  // Resilient Clipboard API with DOM fallback for LAN / mobile contexts
  const safeCopyToClipboard = async (text) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fallback below
    }
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "-9999px";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      return success;
    } catch {
      return false;
    }
  };

  const handleCopy = async (symbol) => {
    await safeCopyToClipboard(symbol);
    setCopiedSymbol(symbol);
    soundEngine.playSuccessTone();
    setTimeout(() => setCopiedSymbol(null), 2000);
  };

  const handleCopySummary = async () => {
    const lines = [
      "📊 PORTFOLIO HOLDINGS & COST BASIS SUMMARY",
      `Invested Capital (Without Profit): ₹${Math.round(totalInvestedValue).toLocaleString("en-IN")}`,
      `Current Valuation (NAV): ₹${Math.round(totalHoldingsValue).toLocaleString("en-IN")}`,
      `Unrealized Return: ${totalUnrealizedPnl >= 0 ? "+" : ""}₹${Math.round(totalUnrealizedPnl).toLocaleString("en-IN")} (${totalUnrealizedPnlPct}%)`,
      `Capital Multiplier: ${portfolioProfitMultiplier}x`,
      "---",
      ...enrichedItems.map(
        (it) =>
          `• ${it.tradingsymbol}: ${it.qty} shs @ ${it.isZeroCost ? "₹0.00 (Corp Action)" : `₹${it.avg.toFixed(2)}`} (Invested: ₹${Math.round(it.investedVal).toLocaleString("en-IN")}) -> LTP ₹${it.ltp.toFixed(2)} (Val: ₹${Math.round(it.val).toLocaleString("en-IN")}) | P&L: ${it.isGain ? "+" : ""}₹${Math.round(it.pnl).toLocaleString("en-IN")} (${it.pnlPct}%)`
      ),
    ];
    await safeCopyToClipboard(lines.join("\n"));
    setCopiedSymbol("SUMMARY_COPIED");
    soundEngine.playSuccessTone();
    setTimeout(() => setCopiedSymbol(null), 2000);
  };

  const handleFilterChange = (f) => {
    setFilter(f);
    soundEngine.playTabSwitchTone();
  };

  const handleSortChange = (s) => {
    setSortBy(s);
    soundEngine.playTabSwitchTone();
  };

  // Dual-Directional Harmonized Sync: Changing viewMode auto-syncs the Concentration Horizon
  const handleViewModeChange = (m) => {
    setViewMode(m);
    if (m === "cost") {
      setConcentrationMode("cost");
    } else if (m === "all" || m === "performance") {
      setConcentrationMode("valuation");
    }
    soundEngine.playTabSwitchTone();
  };

  // Changing concentrationMode also updates viewMode if needed
  const handleConcentrationModeChange = (cm) => {
    setConcentrationMode(cm);
    if (cm === "cost" && viewMode === "all") {
      setViewMode("cost");
    } else if (cm === "valuation" && viewMode === "cost") {
      setViewMode("all");
    }
    soundEngine.playTabSwitchTone();
  };

  return {
    filter,
    setFilter,
    search,
    setSearch,
    sortBy,
    setSortBy,
    viewMode,
    setViewMode,
    concentrationMode,
    setConcentrationMode,
    copiedSymbol,
    hoveredHolding,
    setHoveredHolding,
    searchInputRef,
    totalHoldingsValue,
    totalInvestedValue,
    totalUnrealizedPnl,
    totalUnrealizedPnlPct,
    portfolioProfitMultiplier,
    portfolioCushionPct,
    avgCostPerPosition,
    enrichedItems,
    filtered,
    gainersCount,
    losersCount,
    topHolding,
    topInvested,
    handleCopy,
    handleCopySummary,
    handleFilterChange,
    handleSortChange,
    handleViewModeChange,
    handleConcentrationModeChange,
  };
}

