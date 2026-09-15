import { useState, useMemo, useCallback, useEffect } from "react";
import { useTradingStore, resolveIndexLotSize } from "../../../../stores/useTradingStore";
import { useLivePriceStore } from "../../../../stores/useLivePriceStore";
import { soundEngine } from "../../../../utils/soundEngine";
import { INDEX_ASSETS } from "../constants";
import { useCoolingVault } from "./useCoolingVault";
import {
  resolveLiveGreeksAdjustedDelta,
  resolveIvRegime,
  computeFrictionMetrics,
  evaluateCopilotRegime,
  calculateRiskRewardTargets
} from "./orderPadCalculations";

export function useOrderPadFullLogic() {
  const {
    deployPracticeTrade, feedMode, setFeedMode, strategyMode, setStrategyMode,
    simulateSlippage, setSimulateSlippage, dailyQuotaLimit = 3, dailyQuotaBypass = false,
    testingMode = false, coolingVaultUnlockTime = null, requestCoolingVaultUnlock,
    cancelCoolingVault, claimCoolingVaultUnlock, getTodayTradesCount,
    openAlerts = [], masterTrades = []
  } = useTradingStore();

  const vault = useCoolingVault(coolingVaultUnlockTime);

  const todayTradesCount = useMemo(() => {
    return typeof getTodayTradesCount === "function" ? getTodayTradesCount() : 0;
  }, [openAlerts, masterTrades, getTodayTradesCount]);
  const isDailyCapReached = todayTradesCount >= dailyQuotaLimit && !dailyQuotaBypass && !testingMode;

  const activeQuotaMode = useMemo(() => {
    if (testingMode) return "UNLIMITED_TESTING";
    if (dailyQuotaBypass) return "SINGLE_BYPASS";
    if (isDailyCapReached) {
      if (vault.isVaultRunning) return "VAULT_RUNNING";
      if (vault.isVaultReadyToClaim) return "VAULT_READY";
      return "CAP_REACHED";
    }
    return "NORMAL";
  }, [testingMode, dailyQuotaBypass, isDailyCapReached, vault.isVaultRunning, vault.isVaultReadyToClaim]);

  const indices = useLivePriceStore((s) => s.indices);

  const dynamicAssets = useMemo(() => INDEX_ASSETS.map((asset) => {
    const map = { NIFTY: "NSE_INDEX|Nifty 50", BANKNIFTY: "NSE_INDEX|Nifty Bank", FINNIFTY: "NSE_INDEX|Nifty Fin Service", SENSEX: "BSE_INDEX|SENSEX" };
    const ind = indices?.[map[asset.key]];
    const liveLtp = ind?.ltp || asset.spot;
    const isPositive = (ind?.changePct ?? 0) >= 0;
    const liveChange = ind?.changePct != null ? `${isPositive ? "+" : ""}${ind.changePct.toFixed(2)}%` : asset.change;
    const step = asset.key === "BANKNIFTY" || asset.key === "SENSEX" ? 100 : 50;
    return { ...asset, spot: liveLtp, change: liveChange, positive: isPositive, calculatedAtmStrike: Math.round(liveLtp / step) * step };
  }), [indices]);

  const [optionType, setOptionType] = useState("PUT");
  const [underlying, setUnderlying] = useState("NIFTY");
  const [strikePrice, setStrikePrice] = useState(() => INDEX_ASSETS[0].defaultStrike);
  const [entryPrice, setEntryPrice] = useState(() => INDEX_ASSETS[0].defaultEntry);
  const [lots, setLots] = useState(1);
  const [stopLoss, setStopLoss] = useState(() => INDEX_ASSETS[0].defaultSL);
  const [targetPrice, setTargetPrice] = useState(() => INDEX_ASSETS[0].defaultTP);
  const [hedgeStrike, setHedgeStrike] = useState(23900), [hedgePrice, setHedgePrice] = useState(23.90);
  const [copilotRegime, setCopilotRegime] = useState("AUTO");
  const [isDeploying, setIsDeploying] = useState(false), [isScanning, setIsScanning] = useState(false);
  const [isIndexDropdownOpen, setIsIndexDropdownOpen] = useState(false), [show12FilterDrawer, setShow12FilterDrawer] = useState(false);
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);

  const activeContractSymbol = `${underlying} ${strikePrice} ${optionType === "CALL" ? "CE" : "PE"}`;
  const currentAsset = useMemo(() => dynamicAssets.find((a) => a.key === underlying) || dynamicAssets[0], [dynamicAssets, underlying]);
  const lotSize = resolveIndexLotSize(underlying);
  const totalQty = lots * lotSize;
  const netEntryPrice = strategyMode === "SPREAD" ? Math.max(0.1, entryPrice - hedgePrice) : entryPrice;
  const capitalOutlay = totalQty * netEntryPrice;

  const isValidSL = Number(entryPrice) > 0 && Number(stopLoss) > 0 && Number(stopLoss) < Number(entryPrice);
  const isValidTarget = Number(entryPrice) > 0 && Number(targetPrice) > Number(entryPrice);
  const riskAmount = isValidSL ? totalQty * (entryPrice - stopLoss) : 0;
  const rewardAmount = isValidTarget ? totalQty * (targetPrice - entryPrice) : 0;
  const rrRatio = isValidSL && isValidTarget && riskAmount > 0 ? (rewardAmount / riskAmount).toFixed(2) : "0.00";

  const frictionMetrics = useMemo(() => computeFrictionMetrics({ netEntryPrice, totalQty, rewardAmount }), [netEntryPrice, totalQty, rewardAmount]);
  const copilotState = useMemo(() => evaluateCopilotRegime({ copilotRegime, activeAsset: currentAsset, rrRatio, ...frictionMetrics, rewardAmount }), [copilotRegime, currentAsset, rrRatio, frictionMetrics, rewardAmount]);
  const activeDelta = useMemo(() => resolveLiveGreeksAdjustedDelta({ liveGreeks: { delta: optionType === "CALL" ? 0.48 : -0.48, gamma: 0.001, spot: currentAsset.spot }, isSpreadMode: strategyMode === "SPREAD", netDelta: null, spot: currentAsset.spot, optionType }), [optionType, strategyMode, currentAsset.spot]);
  const ivRegime = useMemo(() => resolveIvRegime(15.2), []);
  const liveContractTick = useLivePriceStore((s) => s.ticks?.[activeContractSymbol] || s.ticks?.[`PRACTICE:${activeContractSymbol}`]);

  useEffect(() => {
    useTradingStore.getState().setActivePadSymbol?.(activeContractSymbol);
    let isMounted = true;
    fetch(`/api/market/option-quote?symbol=${encodeURIComponent(activeContractSymbol)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!isMounted) return;
        const q = data?.quotes?.[activeContractSymbol] || (data?.quotes ? Object.values(data.quotes)[0] : null);
        if (q?.ltp > 0) {
          useLivePriceStore.getState().updateTick?.(activeContractSymbol, q.ltp, q.change || 0);
          if (isLiveStreaming) {
            const ltp = Number(q.ltp);
            setEntryPrice(ltp);
            const targets = calculateRiskRewardTargets({ entryPrice: ltp, totalQty, underlying });
            setStopLoss(targets.stopLoss);
            setTargetPrice(targets.targetPrice);
          }
        }
      }).catch(() => {});
    return () => { isMounted = false; };
  }, [activeContractSymbol, totalQty, underlying, isLiveStreaming]);

  useEffect(() => {
    if (!isLiveStreaming || !liveContractTick?.ltp) return;
    const ltp = Number(liveContractTick.ltp);
    if (ltp > 0 && Math.abs(ltp - entryPrice) >= 0.05) {
      setEntryPrice(ltp);
      const targets = calculateRiskRewardTargets({ entryPrice: ltp, totalQty, underlying });
      setStopLoss(targets.stopLoss);
      setTargetPrice(targets.targetPrice);
    }
  }, [isLiveStreaming, liveContractTick?.ltp, totalQty, underlying, entryPrice]);

  const handleSelectAsset = useCallback((asset) => {
    soundEngine.playTabSwitchTone();
    setUnderlying(asset.key);
    setStrikePrice(asset.calculatedAtmStrike || asset.defaultStrike);
    setEntryPrice(asset.defaultEntry);
    setStopLoss(asset.defaultSL);
    setTargetPrice(asset.defaultTP);
    setIsLiveStreaming(true);
  }, []);

  const handleManualInputFocus = useCallback(() => setIsLiveStreaming(false), []);

  const duplicateWarning = useMemo(() => {
    const isExisting = openAlerts.some((a) => {
      const sym = a.symbol || a.tradingsymbol || "";
      return sym.includes(underlying) && sym.includes(String(strikePrice));
    });
    return isExisting ? `Position already active for ${activeContractSymbol}` : null;
  }, [openAlerts, underlying, strikePrice, activeContractSymbol]);

  const handleExecute = useCallback((customPayload = {}) => {
    if (isDeploying) return;
    setIsDeploying(true);
    soundEngine.playOrderExecutedTone();

    const tradeToDeploy = {
      symbol: activeContractSymbol, underlying, optionType, strikePrice,
      entryPrice: netEntryPrice, stopLoss, targetPrice, quantity: lots,
      totalQty, lotSize, lots, strategyMode, ...customPayload
    };

    if (typeof deployPracticeTrade === "function") deployPracticeTrade(tradeToDeploy);
    setTimeout(() => setIsDeploying(false), 300);
  }, [isDeploying, activeContractSymbol, underlying, optionType, strikePrice, netEntryPrice, stopLoss, targetPrice, totalQty, lotSize, lots, strategyMode, deployPracticeTrade]);

  const handleManualScan = useCallback(async () => {
    if (isScanning) return;
    setIsScanning(true);
    soundEngine.playTick();
    try {
      const sym = activeContractSymbol;
      const [idxRes, optRes] = await Promise.all([
        fetch("/api/market/indices").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`/api/market/option-quote?symbol=${encodeURIComponent(sym)}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)
      ]);
      if (idxRes?.indices) useLivePriceStore.getState().syncIndices?.(idxRes.indices);
      const q = optRes?.quotes?.[sym] || (optRes?.quotes ? Object.values(optRes.quotes)[0] : null);
      if (q?.ltp > 0) {
        const ltp = Number(q.ltp);
        setEntryPrice(ltp);
        const targets = calculateRiskRewardTargets({ entryPrice: ltp, totalQty, underlying });
        setStopLoss(targets.stopLoss);
        setTargetPrice(targets.targetPrice);
      }
      soundEngine.playTargetChime();
    } catch (err) {
      console.warn("Manual scan failed:", err);
    } finally {
      setIsScanning(false);
      setIsLiveStreaming(true);
    }
  }, [isScanning, activeContractSymbol]);

  const handleToggleTestingMode = useCallback(() => {
    soundEngine.playTabSwitchTone();
    useTradingStore.getState().toggleTestingMode?.();
  }, []);

  return {
    underlying, setUnderlying, optionType, setOptionType, strikePrice, setStrikePrice,
    entryPrice, setEntryPrice, lots, setLots, stopLoss, setStopLoss, targetPrice, setTargetPrice,
    hedgeStrike, setHedgeStrike, hedgePrice, setHedgePrice, strategyMode, setStrategyMode,
    feedMode, setFeedMode, simulateSlippage, setSimulateSlippage, dynamicAssets, currentAsset,
    lotSize, totalQty, netEntryPrice, capitalOutlay, riskAmount, rewardAmount, rrRatio,
    frictionMetrics, copilotState, copilotRegime, setCopilotRegime, activeDelta, ivRegime,
    isDeploying, isScanning, setIsScanning, isIndexDropdownOpen, setIsIndexDropdownOpen,
    show12FilterDrawer, setShow12FilterDrawer, isLiveStreaming, setIsLiveStreaming,
    liveContractTick,
    handleManualInputFocus, handleSelectAsset, handleExecute, handleManualScan, handleToggleTestingMode,
    activeQuotaMode, isDailyCapReached,
    vault: { ...vault, claimCoolingVaultUnlock, cancelCoolingVault, requestCoolingVaultUnlock },
    duplicateWarning
  };
}
