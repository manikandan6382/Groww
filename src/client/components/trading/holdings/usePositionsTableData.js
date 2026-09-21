import { useState, useMemo } from "react";
import { soundEngine } from "../../../utils/soundEngine";
import { useTradingStore } from "../../../stores/useTradingStore";

export function usePositionsTableData(positions = []) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("pnl");
  const [copiedSymbol, setCopiedSymbol] = useState(null);

  const { setActiveView, setOrderPadPreFill } = useTradingStore();

  const items = Array.isArray(positions) ? positions : [];

  const enrichedItems = useMemo(() => {
    return items.map((p) => {
      const sym = String(p.tradingsymbol || "").toUpperCase();
      const exchange = String(p.exchange || "NFO").toUpperCase();
      const product = String(p.product || "NRML").toUpperCase();
      const qty = Number(p.quantity || 0);
      const avg = Number(p.average_price || p.buy_price || p.sell_price || 0);
      const ltp = Number(p.last_price || avg || 0);
      const close = Number(p.close_price || avg || 0);
      const dayChg = close > 0 ? ltp - close : 0;
      const dayChgPct = close > 0 ? (dayChg / close) * 100 : 0;

      const isLong = qty > 0;
      const isShort = qty < 0;
      const isClosed = qty === 0;

      const isFno =
        exchange === "NFO" ||
        exchange === "BFO" ||
        exchange === "MCX" ||
        sym.includes("CE") ||
        sym.includes("PE") ||
        sym.includes("FUT");

      const isMis = product === "MIS";

      // Kite P&L: if open, MTM represents today's live unrealized mark; realised is booked profit
      const m2m = Number(p.m2m ?? p.pnl ?? 0);
      const realised = Number(p.realised || 0);
      const unrealised = Number(p.unrealised || m2m);
      const totalPnl = Number(p.pnl ?? (realised + unrealised));

      // Exposure value = abs(qty) * ltp
      const exposureVal = Math.abs(qty) * ltp;

      // Cost value = abs(qty) * avg
      const costVal = Math.abs(qty) * avg;
      const returnPct = costVal > 0 ? (m2m / costVal) * 100 : 0;

      return {
        ...p,
        sym,
        exchange,
        product,
        qty,
        absQty: Math.abs(qty),
        avg,
        ltp,
        close,
        dayChg,
        dayChgPct,
        isLong,
        isShort,
        isClosed,
        isFno,
        isMis,
        m2m,
        realised,
        unrealised,
        totalPnl,
        exposureVal,
        costVal,
        returnPct,
        isGain: m2m >= 0,
        isDayGain: dayChg >= 0,
      };
    });
  }, [items]);

  const filtered = useMemo(() => {
    return enrichedItems
      .filter((p) => {
        const q = search.toLowerCase().trim();
        const sym = p.sym.toLowerCase();
        if (q && !sym.includes(q)) return false;

        if (filter === "open") return !p.isClosed;
        if (filter === "fno") return p.isFno;
        if (filter === "mis") return p.isMis;
        if (filter === "closed") return p.isClosed;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "pnl") return b.m2m - a.m2m;
        if (sortBy === "val") return b.exposureVal - a.exposureVal;
        if (sortBy === "qty") return b.absQty - a.absQty;
        if (sortBy === "symbol") return a.sym.localeCompare(b.sym);
        return 0;
      });
  }, [enrichedItems, search, filter, sortBy]);

  const openPositions = enrichedItems.filter((p) => !p.isClosed);
  const openCount = openPositions.length;
  const totalM2m = enrichedItems.reduce((acc, p) => acc + p.m2m, 0);
  const totalRealised = enrichedItems.reduce((acc, p) => acc + p.realised, 0);
  const totalExposure = openPositions.reduce((acc, p) => acc + p.exposureVal, 0);

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSymbol(text);
      soundEngine.playSuccessTone();
      setTimeout(() => setCopiedSymbol(null), 2000);
    } catch {
      // Fallback
    }
  };

  // ⚡ 1-Click Square Off: Pre-fill OrderPad with reverse order to exit contract
  const handleSquareOff = (position) => {
    if (!position || position.isClosed) return;
    const exitSide = position.isLong ? "SELL" : "BUY";
    const cleanSym = position.sym;

    setOrderPadPreFill({
      symbol: cleanSym,
      underlying: cleanSym.replace(/\d+.*$/, ""),
      instrumentType: position.isFno ? "OPTIONS" : "EQUITY",
      entryPrice: position.ltp,
      quantity: position.absQty,
      lotSize: 1,
      orderType: exitSide,
      product: position.product,
    });

    soundEngine.playTabSwitchTone();
    setActiveView("paper"); // Or order pad tab
  };

  return {
    filter,
    setFilter,
    search,
    setSearch,
    sortBy,
    setSortBy,
    copiedSymbol,
    enrichedItems,
    filtered,
    openPositions,
    openCount,
    totalM2m,
    totalRealised,
    totalExposure,
    handleCopy,
    handleSquareOff,
  };
}
