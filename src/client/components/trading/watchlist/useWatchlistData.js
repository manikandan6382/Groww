import { useState, useRef, useEffect, useMemo } from "react";
import { useTradingStore, INDIAN_STOCK_META, getStockMeta } from "../../../stores/useTradingStore";
import { soundEngine } from "../../../utils/soundEngine";
import { getLiquidityRadarData } from "./watchlistRadarUtils";
import { filterAndSortWatchlistSymbols } from "./watchlistFilterUtils";
import { executeEquityTrade, executeOptionScalp, transferToPaperLab } from "./watchlistExecutionHelpers";

export function useWatchlistData() {
  const { 
    watchlistSymbols, addWatchSymbol, removeWatchSymbol, 
    activeSectorFilter, setActiveSectorFilter, setActiveView,
    setOrderPadPreFill, deployPracticeTrade 
  } = useTradingStore();

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [sortBy, setSortBy] = useState("default");
  const [activeModal, setActiveModal] = useState(null);
  const [tradeTab, setTradeTab] = useState("equity");
  const [orderSide, setOrderSide] = useState("BUY");
  const [productType, setProductType] = useState("CNC");
  const [tradeQty, setTradeQty] = useState(10);
  const [optionType, setOptionType] = useState("CE");
  const [optionLots, setOptionLots] = useState(1);
  const [toastMessage, setToastMessage] = useState(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && activeModal) setActiveModal(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeModal]);

  const searchCandidates = useMemo(() => {
    if (!search?.trim()) return [];
    const q = search.toLowerCase().trim();
    return Object.keys(INDIAN_STOCK_META)
      .filter((sym) => {
        const meta = INDIAN_STOCK_META[sym];
        const match = sym.toLowerCase().includes(q) || meta.name.toLowerCase().includes(q) || meta.sector.toLowerCase().includes(q);
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

  const handleOpenTradeModal = (symbol, e) => {
    e?.stopPropagation();
    setActiveModal({ type: "trade", symbol });
    setTradeTab("equity");
    setTradeQty(10);
    setOrderSide("BUY");
    soundEngine.playTabSwitchTone();
  };

  const handleOpenDepthModal = (symbol, e) => {
    e?.stopPropagation();
    setActiveModal({ type: "depth", symbol });
    soundEngine.playTabSwitchTone();
  };

  const handleExecuteEquityTrade = (meta, cleanSym) =>
    executeEquityTrade({ meta, cleanSym, productType, tradeQty, orderSide, deployPracticeTrade, setToastMessage, setActiveModal });

  const handleExecuteOptionScalp = (meta, cleanSym) =>
    executeOptionScalp({ meta, cleanSym, optionType, optionLots, deployPracticeTrade, setToastMessage, setActiveModal });

  const handleTransferToPaperLab = (meta, cleanSym) =>
    transferToPaperLab({ meta, cleanSym, optionType, optionLots, setOrderPadPreFill, setActiveModal, setActiveView });

  const activeStockMeta = activeModal ? getStockMeta(activeModal.symbol) : null;
  const activeRadarData = activeModal ? getLiquidityRadarData(activeModal.symbol, activeStockMeta) : null;
  const activeCleanSym = activeModal ? activeModal.symbol.replace(/\.(NS|BO)$/, "") : "";

  return {
    watchlistSymbols, search, setSearch, viewMode, setViewMode, sortBy, setSortBy,
    activeModal, setActiveModal, tradeTab, setTradeTab, orderSide, setOrderSide,
    productType, setProductType, tradeQty, setTradeQty, optionType, setOptionType,
    optionLots, setOptionLots, toastMessage, searchInputRef, searchCandidates, filteredSymbols,
    handleTabChange, handleAddPreset, handleRemove, handleOpenTradeModal, handleOpenDepthModal,
    handleExecuteEquityTrade, handleExecuteOptionScalp, handleTransferToPaperLab,
    activeStockMeta, activeRadarData, activeCleanSym, activeSectorFilter, setActiveSectorFilter
  };
}
