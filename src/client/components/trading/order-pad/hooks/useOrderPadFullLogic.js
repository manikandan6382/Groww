import { useState, useMemo, useCallback, useEffect, useRef } from "react";
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
  calculateRiskRewardTargets,
  calculateBlack76Greeks
} from "./orderPadCalculations";

export function useOrderPadFullLogic() {
  const {
    deployPracticeTrade, feedMode, setFeedMode, strategyMode, setStrategyMode,
    simulateSlippage, setSimulateSlippage, dailyQuotaLimit = 3, dailyQuotaBypass = false,
    testingMode = false, coolingVaultUnlockTime = null, requestCoolingVaultUnlock,
    cancelCoolingVault, claimCoolingVaultUnlock, getTodayTradesCount, getTodayRealizedLoss,
    openAlerts = [], masterTrades = []
  } = useTradingStore();

  const tiltLockoutUntil = useTradingStore((s) => s.tiltLockoutUntil || 0);
  const [tiltSecondsRemaining, setTiltSecondsRemaining] = useState(0);

  useEffect(() => {
    if (!tiltLockoutUntil) {
      setTiltSecondsRemaining(0);
      return;
    }
    const update = () => {
      const rem = Math.max(0, Math.ceil((tiltLockoutUntil - Date.now()) / 1000));
      setTiltSecondsRemaining(rem);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [tiltLockoutUntil]);

  const vault = useCoolingVault(coolingVaultUnlockTime);

  const todayTradesCount = useMemo(() => {
    return typeof getTodayTradesCount === "function" ? getTodayTradesCount() : 0;
  }, [openAlerts, masterTrades, getTodayTradesCount]);

  const todayRealizedLoss = useMemo(() => {
    return typeof getTodayRealizedLoss === "function" ? getTodayRealizedLoss() : 0;
  }, [masterTrades, getTodayRealizedLoss]);

  const isDailyLossBreached = todayRealizedLoss <= -300;
  const isDailyCapReached = (todayTradesCount >= dailyQuotaLimit || isDailyLossBreached) && !dailyQuotaBypass && !testingMode;

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
  const [hedgeStrike, setHedgeStrike] = useState(23900);
  const [hedgePrice, setHedgePrice] = useState(23.90);
  const [copilotRegime, setCopilotRegime] = useState("AUTO");
  const [isDeploying, setIsDeploying] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isIndexDropdownOpen, setIsIndexDropdownOpen] = useState(false);
  const [show12FilterDrawer, setShow12FilterDrawer] = useState(false);
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);

  const strikeStep = underlying === "BANKNIFTY" || underlying === "SENSEX" ? 100 : 50;
  const autoHedgeStrike = optionType === "CALL" ? strikePrice + 2 * strikeStep : strikePrice - 2 * strikeStep;

  // Auto-sync hedge strike when entering spread mode or changing contract
  useEffect(() => {
    if (strategyMode === "SPREAD") {
      setHedgeStrike(autoHedgeStrike);
    }
  }, [strategyMode, autoHedgeStrike]);

  const activeContractSymbol = `${underlying} ${strikePrice} ${optionType === "CALL" ? "CE" : "PE"}`;
  const hedgeContractSymbol = `${underlying} ${hedgeStrike} ${optionType === "CALL" ? "CE" : "PE"}`;
  const currentAsset = useMemo(() => dynamicAssets.find((a) => a.key === underlying) || dynamicAssets[0], [dynamicAssets, underlying]);
  const lotSize = resolveIndexLotSize(underlying);
  const totalQty = lots * lotSize;
  const netEntryPrice = strategyMode === "SPREAD" ? Math.max(0.1, Number((entryPrice - hedgePrice).toFixed(2))) : entryPrice;
  const capitalOutlay = totalQty * netEntryPrice;

  const isValidSL = Number(entryPrice) > 0 && Number(stopLoss) > 0 && Number(stopLoss) < Number(entryPrice);
  const isValidTarget = Number(entryPrice) > 0 && Number(targetPrice) > Number(entryPrice);
  const riskAmount = isValidSL ? totalQty * (entryPrice - stopLoss) : 0;
  const rewardAmount = isValidTarget ? totalQty * (targetPrice - entryPrice) : 0;
  const rrRatio = isValidSL && isValidTarget && riskAmount > 0 ? (rewardAmount / riskAmount).toFixed(2) : "0.00";

  const frictionMetrics = useMemo(() => computeFrictionMetrics({
    netEntryPrice,
    totalQty,
    rewardAmount,
    riskAmount,
    stopLoss,
    underlying
  }), [netEntryPrice, totalQty, rewardAmount, riskAmount, stopLoss, underlying]);
  const copilotState = useMemo(() => evaluateCopilotRegime({ copilotRegime, activeAsset: currentAsset, rrRatio, ...frictionMetrics, rewardAmount }), [copilotRegime, currentAsset, rrRatio, frictionMetrics, rewardAmount]);
  
  const baseGreeks = useMemo(() => {
    return calculateBlack76Greeks({
      spot: currentAsset.spot,
      strike: strikePrice,
      dteDays: 2,
      ivPct: 14.8,
      optionType
    });
  }, [currentAsset.spot, strikePrice, optionType]);

  const hedgeGreeks = useMemo(() => {
    if (strategyMode !== "SPREAD") return null;
    return calculateBlack76Greeks({
      spot: currentAsset.spot,
      strike: hedgeStrike,
      dteDays: 2,
      ivPct: 15.2,
      optionType
    });
  }, [strategyMode, currentAsset.spot, hedgeStrike, optionType]);

  const activeGreeks = useMemo(() => {
    if (strategyMode === "SPREAD" && hedgeGreeks) {
      return {
        delta: Number((baseGreeks.delta - hedgeGreeks.delta).toFixed(4)),
        gamma: Number(Math.abs(baseGreeks.gamma - hedgeGreeks.gamma).toFixed(6)),
        theta: Number(Math.max(0.1, baseGreeks.theta - hedgeGreeks.theta).toFixed(2)),
        vega: Number(Math.max(0.1, baseGreeks.vega - hedgeGreeks.vega).toFixed(2)),
        pop: Math.min(90, Math.round(baseGreeks.pop + 8)),
        iv: 14.8
      };
    }
    return baseGreeks;
  }, [strategyMode, baseGreeks, hedgeGreeks]);

  const activeDelta = activeGreeks.delta;
  const ivRegime = useMemo(() => resolveIvRegime(activeGreeks.iv), [activeGreeks.iv]);
  const liveContractTick = useLivePriceStore((s) => s.ticks?.[activeContractSymbol] || s.ticks?.[`PRACTICE:${activeContractSymbol}`]);
  const [liveMarkPrice, setLiveMarkPrice] = useState(entryPrice);

  // In-flight quote race-condition controller
  const abortControllerRef = useRef(null);
  const quoteSeqRef = useRef(0);

  useEffect(() => {
    useTradingStore.getState().setActivePadSymbol?.(activeContractSymbol);

    // Cancel any previous pending quote requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const currentSeq = ++quoteSeqRef.current;

    const fetchPrimary = fetch(`/api/market/option-quote?symbol=${encodeURIComponent(activeContractSymbol)}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .catch((err) => {
        if (err.name !== "AbortError") return null;
      });

    const fetchHedge = strategyMode === "SPREAD"
      ? fetch(`/api/market/option-quote?symbol=${encodeURIComponent(hedgeContractSymbol)}`, { signal: controller.signal })
          .then((r) => (r.ok ? r.json() : null))
          .catch((err) => {
            if (err.name !== "AbortError") return null;
          })
      : Promise.resolve(null);

    Promise.all([fetchPrimary, fetchHedge]).then(([primaryData, hedgeData]) => {
      if (currentSeq !== quoteSeqRef.current) return;

      const q = primaryData?.quotes?.[activeContractSymbol] || (primaryData?.quotes ? Object.values(primaryData.quotes)[0] : null);
      if (q?.ltp > 0) {
        useLivePriceStore.getState().updateTick?.(activeContractSymbol, q.ltp, q.change || 0);
        const ltp = Number(q.ltp);
        setLiveMarkPrice(ltp);
        if (isLiveStreaming) {
          setEntryPrice(ltp);
          const targets = calculateRiskRewardTargets({ entryPrice: ltp, totalQty, underlying });
          setStopLoss(targets.stopLoss);
          setTargetPrice(targets.targetPrice);
        }
      }

      if (strategyMode === "SPREAD" && hedgeData) {
        const hq = hedgeData?.quotes?.[hedgeContractSymbol] || (hedgeData?.quotes ? Object.values(hedgeData.quotes)[0] : null);
        if (hq?.ltp > 0) {
          setHedgePrice(Number(hq.ltp));
        } else {
          // Fallback hedge quote estimate (~35% of ATM primary leg)
          const estHedge = Number((Number(q?.ltp || 100) * 0.35).toFixed(2));
          setHedgePrice((prev) => (prev > 0 ? prev : estHedge));
        }
      }
    });

    return () => {
      controller.abort();
    };
  }, [activeContractSymbol, hedgeContractSymbol, strategyMode, totalQty, underlying, isLiveStreaming]);

  // Decouple streaming tick updates: update liveMarkPrice, and dynamically peg SL/TP on mark drift
  useEffect(() => {
    if (!liveContractTick?.ltp) return;
    const ltp = Number(liveContractTick.ltp);
    if (ltp > 0) {
      setLiveMarkPrice(ltp);
      if (isLiveStreaming && Math.abs(ltp - entryPrice) >= 0.05) {
        const delta = ltp - entryPrice;
        setEntryPrice(ltp);
        // Dynamic Risk Pegging: smoothly shift Stop Loss and Target by delta, strictly preserving Manikandan's risk invariant!
        setStopLoss((prev) => {
          const currentSL = Number(prev);
          return currentSL > 0 ? Number((currentSL + delta).toFixed(2)) : currentSL;
        });
        setTargetPrice((prev) => {
          const currentTP = Number(prev);
          return currentTP > 0 ? Number((currentTP + delta).toFixed(2)) : currentTP;
        });
      }
    }
  }, [liveContractTick?.ltp, isLiveStreaming, entryPrice]);

  const handleSelectAsset = useCallback((asset) => {
    soundEngine.playTabSwitchTone();
    setUnderlying(asset.key);
    const step = asset.key === "BANKNIFTY" || asset.key === "SENSEX" ? 100 : 50;
    const atm = asset.calculatedAtmStrike || asset.defaultStrike;
    setStrikePrice(atm);
    if (strategyMode === "SPREAD") {
      setHedgeStrike(optionType === "CALL" ? atm + 2 * step : atm - 2 * step);
    }
    setEntryPrice(asset.defaultEntry);
    setLiveMarkPrice(asset.defaultEntry);
    const targets = calculateRiskRewardTargets({
      entryPrice: asset.defaultEntry,
      totalQty: resolveIndexLotSize(asset.key) * lots,
      underlying: asset.key
    });
    setStopLoss(targets.stopLoss);
    setTargetPrice(targets.targetPrice);
    setIsLiveStreaming(true);
  }, [strategyMode, optionType, lots]);

  const handleManualInputFocus = useCallback(() => setIsLiveStreaming(false), []);

  const duplicateWarning = useMemo(() => {
    const isExisting = openAlerts.some((a) => {
      const sym = a.symbol || a.tradingsymbol || "";
      return sym.includes(underlying) && sym.includes(String(strikePrice));
    });
    return isExisting ? `Position already active for ${activeContractSymbol}` : null;
  }, [openAlerts, underlying, strikePrice, activeContractSymbol]);

  const isDeployingRef = useRef(false);

  const handleExecute = useCallback((customPayload = {}) => {
    if (isDeployingRef.current || isDeploying) return;
    if (tiltSecondsRemaining > 0 && !testingMode) {
      soundEngine?.playOrderReject?.();
      return;
    }
    isDeployingRef.current = true;
    setIsDeploying(true);
    soundEngine.playOrderExecutedTone();

    const tradeToDeploy = {
      symbol: activeContractSymbol, underlying, optionType, strikePrice,
      entryPrice: netEntryPrice, stopLoss, targetPrice, quantity: lots,
      totalQty, lotSize, lots, strategyMode, direction: "LONG", ...customPayload
    };

    if (typeof deployPracticeTrade === "function") deployPracticeTrade(tradeToDeploy);
    setTimeout(() => {
      isDeployingRef.current = false;
      setIsDeploying(false);
    }, 400);
  }, [isDeploying, tiltSecondsRemaining, testingMode, activeContractSymbol, underlying, optionType, strikePrice, netEntryPrice, stopLoss, targetPrice, totalQty, lotSize, lots, strategyMode, deployPracticeTrade]);

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
        setLiveMarkPrice(ltp);
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
  }, [isScanning, activeContractSymbol, totalQty, underlying]);

  const handleToggleTestingMode = useCallback(() => {
    soundEngine.playTabSwitchTone();
    useTradingStore.getState().toggleTestingMode?.();
  }, []);

  const handleQuickFlipOptionType = useCallback(() => {
    soundEngine.playTabSwitchTone();
    const newType = optionType === "CALL" ? "PUT" : "CALL";
    setOptionType(newType);
    const step = underlying === "BANKNIFTY" || underlying === "SENSEX" ? 100 : 50;
    const atm = Math.round(Number(currentAsset.spot || 24000) / step) * step;
    setStrikePrice(atm);
    if (strategyMode === "SPREAD") {
      setHedgeStrike(newType === "CALL" ? atm + 2 * step : atm - 2 * step);
    }
    setIsLiveStreaming(true);
  }, [optionType, underlying, currentAsset.spot, strategyMode]);

  return {
    underlying, setUnderlying, optionType, setOptionType, strikePrice, setStrikePrice,
    entryPrice, setEntryPrice, lots, setLots, stopLoss, setStopLoss, targetPrice, setTargetPrice,
    hedgeStrike, setHedgeStrike, hedgePrice, setHedgePrice, strategyMode, setStrategyMode,
    feedMode, setFeedMode, simulateSlippage, setSimulateSlippage, dynamicAssets, currentAsset,
    lotSize, totalQty, netEntryPrice, capitalOutlay, riskAmount, rewardAmount, rrRatio,
    frictionMetrics, copilotState, copilotRegime, setCopilotRegime, activeDelta, ivRegime,
    activeGreeks,
    isDeploying, isScanning, setIsScanning, isIndexDropdownOpen, setIsIndexDropdownOpen,
    show12FilterDrawer, setShow12FilterDrawer, isLiveStreaming, setIsLiveStreaming,
    liveContractTick, liveMarkPrice, strikeStep, hedgeContractSymbol,
    handleManualInputFocus, handleSelectAsset, handleExecute, handleManualScan, handleToggleTestingMode,
    handleQuickFlipOptionType,
    activeQuotaMode, isDailyCapReached, isDailyLossBreached, todayRealizedLoss,
    todayTradesCount, dailyQuotaLimit, testingMode, dailyQuotaBypass,
    tiltSecondsRemaining, isTiltLocked: tiltSecondsRemaining > 0,
    vault: { ...vault, claimCoolingVaultUnlock, cancelCoolingVault, requestCoolingVaultUnlock },
    duplicateWarning
  };
}
