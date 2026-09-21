import { useState, useRef, useEffect, useMemo } from "react";
import { useTradingStore, INDIAN_STOCK_META, getStockMeta } from "../../../stores/useTradingStore";
import { soundEngine } from "../../../utils/soundEngine";
import { getLiquidityRadarData } from "./watchlistRadarUtils";
import { filterAndSortWatchlistSymbols } from "./watchlistFilterUtils";
import { executeEquityTrade, executeOptionScalp, transferToPaperLab } from "./watchlistExecutionHelpers";

export function useWatchlistData() {
  const { 
    watchlistSymbols, 
    addWatchSymbol, 
    removeWatchSymbol, 
    activeSectorFilter, 
    setActiveSectorFilter,
    deployPracticeTrade,
    squareOffTrade,
    openAlerts = [],
    setOrderPadPreFill,
    setActiveView
  } = useTradingStore();

  const [search, setSearch] = useState("");
  
  const [viewMode, setViewModeState] = useState(() => {
    try {
      return localStorage.getItem("portfoliox_watchlist_view_mode") || "grid";
    } catch {
      return "grid";
    }
  });

  const setViewMode = (mode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem("portfoliox_watchlist_view_mode", mode);
    } catch {}
  };

  const [sortBy, setSortByState] = useState(() => {
    try {
      return localStorage.getItem("portfoliox_watchlist_sort") || "default";
    } catch {
      return "default";
    }
  });

  const setSortBy = (val) => {
    setSortByState(val);
    try {
      localStorage.setItem("portfoliox_watchlist_sort", val);
    } catch {}
  };

  const [activeModal, setActiveModal] = useState(null); // { type: 'depth', symbol }
  const [activeTradeModal, setActiveTradeModal] = useState(null); // { symbol, side }
  const [toastMessage, setToastMessage] = useState(null);

  // Quick Order Pad Form State
  const [tradeTab, setTradeTab] = useState("equity"); // 'equity' | 'option'
  const [orderSide, setOrderSide] = useState("BUY"); // 'BUY' | 'SELL'
  const [productType, setProductType] = useState("CNC"); // 'CNC' | 'MIS'
  const [tradeQty, setTradeQty] = useState(10);
  const [optionType, setOptionType] = useState("CE"); // 'CE' | 'PE'
  const [optionLots, setOptionLots] = useState(1);

  const searchInputRef = useRef(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Global keydown listeners (Escape to dismiss, hotkeys when idle)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (activeModal) setActiveModal(null);
        if (activeTradeModal) setActiveTradeModal(null);
      }
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        if (!activeModal && !activeTradeModal) {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeModal, activeTradeModal]);

  const searchCandidates = useMemo(() => {
    if (!search?.trim()) return [];
    const q = search.toLowerCase().trim();
    return Object.keys(INDIAN_STOCK_META)
      .filter((sym) => {
        const meta = INDIAN_STOCK_META[sym];
        const match = sym.toLowerCase().includes(q) || (meta?.name || "").toLowerCase().includes(q) || (meta?.sector || "").toLowerCase().includes(q);
        return match && !watchlistSymbols.includes(sym);
      })
      .slice(0, 5);
  }, [search, watchlistSymbols]);

  const filteredSymbols = useMemo(
    () => filterAndSortWatchlistSymbols(watchlistSymbols, search, activeSectorFilter, sortBy),
    [watchlistSymbols, search, activeSectorFilter, sortBy]
  );

  const handleTabChange = (tabId) => {
    setActiveSectorFilter(tabId);
    soundEngine.playTabSwitchTone();
  };

  const handleAddPreset = (sym) => {
    addWatchSymbol(sym);
    soundEngine.playSuccessTone();
  };

  const handleRemove = (sym, e) => {
    e?.stopPropagation();
    removeWatchSymbol(sym);
    soundEngine.playDeleteTone();
  };

  const handleOpenDepthModal = (symbol, e) => {
    e?.stopPropagation();
    setActiveModal({ type: "depth", symbol });
    soundEngine.playTabSwitchTone();
  };

  const handleOpenTradeModal = (symbol, side = "BUY") => {
    setOrderSide(side);
    setActiveTradeModal({ symbol, side });
    soundEngine.playTabSwitchTone();
  };

  const handleCloseTradeModal = () => {
    setActiveTradeModal(null);
  };

  const handleSquareOff = (tradeId, e) => {
    e?.stopPropagation();
    squareOffTrade(tradeId);
    soundEngine.playSuccessTone();
    setToastMessage("🛑 Position squared off successfully.");
  };

  // Execution triggers
  const handleExecuteEquity = (meta, cleanSym) => {
    executeEquityTrade({
      meta,
      cleanSym,
      productType,
      tradeQty,
      orderSide,
      deployPracticeTrade,
      setToastMessage,
      setActiveModal: setActiveTradeModal
    });
  };

  const handleExecuteScalp = (meta, cleanSym) => {
    executeOptionScalp({
      meta,
      cleanSym,
      optionType,
      optionLots,
      deployPracticeTrade,
      setToastMessage,
      setActiveModal: setActiveTradeModal
    });
  };

  const handleTransferToPaperLab = (meta, cleanSym) => {
    transferToPaperLab({
      meta,
      cleanSym,
      optionType,
      optionLots,
      setOrderPadPreFill,
      setActiveModal: setActiveTradeModal,
      setActiveView
    });
  };

  // Derive active stock meta for modals
  const activeModalSymbol = activeModal?.symbol || activeTradeModal?.symbol;
  const activeStockMeta = activeModalSymbol ? getStockMeta(activeModalSymbol) : null;
  const activeRadarData = activeModalSymbol ? getLiquidityRadarData(activeModalSymbol, activeStockMeta) : null;
  const activeCleanSym = activeModalSymbol ? activeModalSymbol.replace(/\.(NS|BO)$/, "") : "";

  return {
    watchlistSymbols, search, setSearch, viewMode, setViewMode, sortBy, setSortBy,
    activeModal, setActiveModal, activeTradeModal, setActiveTradeModal,
    tradeTab, setTradeTab, orderSide, setOrderSide, productType, setProductType,
    tradeQty, setTradeQty, optionType, setOptionType, optionLots, setOptionLots,
    toastMessage, setToastMessage, searchInputRef, searchCandidates, filteredSymbols,
    openAlerts, handleSquareOff,
    handleTabChange, handleAddPreset, handleRemove, handleOpenDepthModal,
    handleOpenTradeModal, handleCloseTradeModal, handleExecuteEquity, handleExecuteScalp, handleTransferToPaperLab,
    activeStockMeta, activeRadarData, activeCleanSym, activeSectorFilter, setActiveSectorFilter
  };
}
