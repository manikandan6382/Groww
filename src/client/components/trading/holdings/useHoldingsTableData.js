import { useState, useMemo, useEffect, useRef } from "react";
import { getStockMeta } from "../../../stores/useTradingStore";
import { soundEngine } from "../../../utils/soundEngine";

export function useHoldingsTableData(holdings = []) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("weight");
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

  const enrichedItems = useMemo(() => {
    return items.map((h) => {
      const sym = h.tradingsymbol;
      const meta = getStockMeta(`${sym}.NS`);
      const qty = Number(h.quantity || 0);
      const avg = Number(h.average_price || 0);
      const ltp = Number(h.last_price || avg);
      const val = qty * ltp;
      const weightPct = totalHoldingsValue > 0 ? ((val / totalHoldingsValue) * 100).toFixed(1) : "0.0";
      const pnl = Number(h.pnl ?? (val - qty * avg));
      const pnlPct = avg > 0 ? (((ltp - avg) / avg) * 100).toFixed(2) : "0.00";
      const dayChg = Number(h.day_change ?? (ltp * 0.008));
      const dayChgPct = Number(h.day_change_percentage ?? 0.8);

      return {
        ...h,
        meta,
        qty,
        avg,
        ltp,
        val,
        weightPct: Number(weightPct),
        pnl,
        pnlPct,
        dayChg,
        dayChgPct,
        isGain: pnl >= 0,
        isDayGain: dayChg >= 0,
      };
    });
  }, [items, totalHoldingsValue]);

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
      if (sortBy === "weight") return b.val - a.val;
      if (sortBy === "pnl") return b.pnl - a.pnl;
      if (sortBy === "day") return b.dayChgPct - a.dayChgPct;
      if (sortBy === "symbol") return a.tradingsymbol.localeCompare(b.tradingsymbol);
      return 0;
    });
  }, [enrichedItems, search, filter, sortBy]);

  const gainersCount = enrichedItems.filter((i) => i.isGain).length;
  const losersCount = enrichedItems.filter((i) => !i.isGain).length;
  const topHolding = enrichedItems.reduce((max, i) => (i.val > (max?.val || 0) ? i : max), enrichedItems[0]);

  const handleCopy = (symbol) => {
    navigator.clipboard.writeText(symbol);
    setCopiedSymbol(symbol);
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

  return {
    filter,
    setFilter,
    search,
    setSearch,
    sortBy,
    setSortBy,
    copiedSymbol,
    hoveredHolding,
    setHoveredHolding,
    searchInputRef,
    totalHoldingsValue,
    enrichedItems,
    filtered,
    gainersCount,
    losersCount,
    topHolding,
    handleCopy,
    handleFilterChange,
    handleSortChange,
  };
}
