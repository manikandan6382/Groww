import { useState, useMemo, useCallback, useEffect, useRef, startTransition } from "react";
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
import { calculateCanonicalExecutionPlan } from "../../../../utils/canonicalExecutionPlan.js";

export function useOrderPadFullLogic() {
  const {
    deployPracticeTrade, setDeployToast, feedMode, setFeedMode, strategyMode, setStrategyMode,
    simulateSlippage, setSimulateSlippage, dailyQuotaLimit = 3, dailyQuotaBypass = false,
    testingMode = false, testingRestrictionMode = "UNRESTRICTED", coolingVaultUnlockTime = null, requestCoolingVaultUnlock,
    cancelCoolingVault, claimCoolingVaultUnlock, getTodayTradesCount, getTodayRealizedLoss,
    openAlerts = [], masterTrades = []
  } = useTradingStore();

  const isUnrestricted = Boolean(testingMode && testingRestrictionMode === "UNRESTRICTED");

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

  const hasUserPickedOptionRef = useRef(false);
  const [underlying, setUnderlying] = useState("NIFTY");

  // Initialize optionType dynamically: check live index tick, then localStorage cache, then defaultOption
  const [optionType, setOptionTypeState] = useState(() => {
    const nifty = indices?.["NSE_INDEX|Nifty 50"] || indices?.["NIFTY 50"];
    if (nifty?.changePct != null) {
      return nifty.changePct >= 0 ? "CALL" : "PUT";
    }
    try {
      const cached = localStorage.getItem("portfoliox_last_nifty_dir");
      if (cached === "CALL" || cached === "PUT") return cached;
    } catch {}
    return INDEX_ASSETS[0]?.defaultOption || "CALL";
  });

  const setOptionType = useCallback((type) => {
    hasUserPickedOptionRef.current = true;
    setOptionTypeState(type);
  }, []);

  const hasUserPickedStrikeRef = useRef(false);
  const hasUserCustomizedSlTpRef = useRef(false);

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
  const [tokenKey, setTokenKey] = useState(null);

  // Auto-synchronize optionType to live index trend if the user hasn't manually overridden it
  useEffect(() => {
    if (hasUserPickedOptionRef.current) return;
    const map = {
      NIFTY: "NSE_INDEX|Nifty 50",
      BANKNIFTY: "NSE_INDEX|Nifty Bank",
      FINNIFTY: "NSE_INDEX|Nifty Fin Service",
      SENSEX: "BSE_INDEX|SENSEX"
    };
    const ind = indices?.[map[underlying]] || indices?.[underlying];
    if (ind?.changePct != null) {
      const liveDir = ind.changePct >= 0 ? "CALL" : "PUT";
      setOptionTypeState((prev) => (prev !== liveDir ? liveDir : prev));
      try {
        localStorage.setItem("portfoliox_last_nifty_dir", liveDir);
      } catch {}
    }
  }, [indices, underlying]);

  // Auto-synchronize strikePrice to live ATM strike if user hasn't manually chosen a custom strike
  useEffect(() => {
    if (hasUserPickedStrikeRef.current) return;
    const asset = dynamicAssets.find((a) => a.key === underlying);
    if (asset?.calculatedAtmStrike && asset.calculatedAtmStrike > 0) {
      setStrikePrice((prev) => (prev !== asset.calculatedAtmStrike ? asset.calculatedAtmStrike : prev));
    }
  }, [dynamicAssets, underlying]);

  const handleSetStrikePrice = useCallback((val) => {
    hasUserPickedStrikeRef.current = true;
    hasUserCustomizedSlTpRef.current = false;
    setStrikePrice(val);
  }, []);

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

  const canonicalPlan = useMemo(() => {
    return calculateCanonicalExecutionPlan({
      symbol: activeContractSymbol,
      underlying,
      entryPrice: netEntryPrice,
      stopLoss,
      targetPrice,
      quantity: lots,
      lotSize,
      totalUnits: totalQty,
      direction: "LONG",
      stopPolicy: "ATR_ENTRY_RELATIVE",
      targetPolicy: "RR_DERIVED",
      adverseSlippageAllowance: 0.50,
      testingMode: Boolean(testingMode),
      isUnrestricted
    });
  }, [activeContractSymbol, underlying, netEntryPrice, stopLoss, targetPrice, lots, lotSize, totalQty, testingMode, isUnrestricted]);

  const isValidSL = canonicalPlan.isStopLossValid;
  const isValidTarget = canonicalPlan.isTargetValid;
  const riskAmount = canonicalPlan.grossRiskRupees;
  const rewardAmount = canonicalPlan.grossRewardRupees;
  const rrRatio = canonicalPlan.grossRewardToRiskRatio.toFixed(2);
  const plannedNetRisk = canonicalPlan.modelledNetRisk;
  const isRiskExceeded = !canonicalPlan.isRiskCeilingSatisfied;

  const frictionMetrics = useMemo(() => computeFrictionMetrics({
    netEntryPrice,
    totalQty,
    rewardAmount,
    riskAmount,
    stopLoss,
    underlying
  }), [netEntryPrice, totalQty, rewardAmount, riskAmount, stopLoss, underlying]);
  const hasActivePosition = openAlerts.length >= 1;
  const copilotState = useMemo(() => {
    const baseState = evaluateCopilotRegime({
      copilotRegime,
      activeAsset: currentAsset,
      rrRatio,
      ...frictionMetrics,
      rewardAmount,
      activeContractSymbol
    });

    if (hasActivePosition && !isUnrestricted) {
      return {
        ...baseState,
        canDeploy: false,
        buttonText: "🔒 Position Active (1/1 Max)",
        buttonClass: "bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-not-allowed opacity-90",
        ctaText: "🔒 Active Trade Running · Capital Protected (1/1 Max)",
        ctaClass: "bg-amber-950/60 border border-amber-500/30 text-amber-400/80 cursor-not-allowed shadow-none",
        badge: "🔒 ACTIVE TRADE RUNNING",
        badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40"
      };
    }

    if (isDailyCapReached && !isUnrestricted) {
      return {
        ...baseState,
        canDeploy: false,
        buttonText: `🛡️ Quota Locked (${todayTradesCount}/${dailyQuotaLimit})`,
        buttonClass: "bg-slate-800/80 text-slate-400 border border-slate-700/50 cursor-not-allowed opacity-80",
        ctaText: `🛡️ Quota Locked: ${todayTradesCount}/${dailyQuotaLimit} Trades Completed Today`,
        ctaClass: "bg-slate-900/80 border border-slate-700/50 text-slate-400 cursor-not-allowed shadow-none",
        badge: "🛡️ DAILY QUOTA LOCKED",
        badgeBg: "bg-purple-500/20 text-purple-300 border border-purple-500/40"
      };
    }

    if (testingMode && isUnrestricted) {
      const isRiskBreach = !canonicalPlan.isRiskCeilingSatisfied;
      return {
        ...baseState,
        canDeploy: canonicalPlan.isStopLossValid && canonicalPlan.isTargetValid,
        buttonText: isRiskBreach ? `⚡ DEPLOY SANDBOX (Risk ₹${plannedNetRisk.toFixed(0)})` : "⚡ DEPLOY SANDBOX TRADE",
        buttonClass: "bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white shadow-purple-500/25",
        ctaText: isRiskBreach ? `⚡ DEPLOY SANDBOX (₹${plannedNetRisk.toFixed(0)} Risk · Unrestricted)` : "⚡ DEPLOY SANDBOX TRADE (UNRESTRICTED)",
        ctaClass: "bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white shadow-lg shadow-purple-500/25 active:scale-[0.99]",
        badge: "🧪 SANDBOX (UNRESTRICTED)",
        badgeBg: "bg-purple-500/20 text-purple-300 border border-purple-500/40"
      };
    }

    if (!canonicalPlan.isCompliant) {
      const reasonText = !canonicalPlan.isRiskCeilingSatisfied
        ? `Risk ₹${canonicalPlan.modelledNetRisk.toFixed(0)} exceeds ₹300 ceiling`
        : !canonicalPlan.isRewardToRiskSatisfied
        ? `R:R 1:${canonicalPlan.netRewardToRiskRatio.toFixed(2)} below 2:1 min`
        : !canonicalPlan.isStopLossValid
        ? "Invalid Stop Loss"
        : "Invalid Target Price";

      return {
        ...baseState,
        canDeploy: false,
        buttonText: `🛑 Non-Compliant (${reasonText})`,
        buttonClass: "bg-rose-500/20 text-rose-300 border border-rose-500/40 cursor-not-allowed opacity-90",
        ctaText: `🛑 Non-Compliant: ${reasonText}`,
        ctaClass: "bg-rose-950/60 border border-rose-500/30 text-rose-400/80 cursor-not-allowed shadow-none",
        badge: "🛑 INVARIANT REJECTED",
        badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/40"
      };
    }

    if (testingMode) {
      return {
        ...baseState,
        canDeploy: true,
        buttonText: "⚡ DEPLOY PRACTICE (LIKE REAL)",
        buttonClass: "bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black shadow-emerald-500/25",
        ctaText: "⚡ DEPLOY PRACTICE (LIKE REAL · COMPLIANT)",
        ctaClass: "bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-black shadow-lg shadow-cyan-500/25 active:scale-[0.99]",
        badge: "🛡️ PRACTICE (LIKE REAL)",
        badgeBg: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
      };
    }

    return baseState;
  }, [copilotRegime, currentAsset, rrRatio, frictionMetrics, rewardAmount, activeContractSymbol, hasActivePosition, canonicalPlan, testingMode, isUnrestricted, plannedNetRisk]);

  const estimatedFriction = Number(canonicalPlan.statutoryRiskCharges || frictionMetrics?.estimatedFriction || 55.20);
  
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

    let isMounted = true;
    let pollInterval = null;

    const executeQuoteFetch = () => {
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
        if (!isMounted || currentSeq !== quoteSeqRef.current) return;

        const q = primaryData?.quotes?.[activeContractSymbol] || (primaryData?.quotes ? Object.values(primaryData.quotes)[0] : null);
        if (q?.tokenKey) {
          setTokenKey(q.tokenKey);
        }
        if (q?.ltp > 0) {
          useLivePriceStore.getState().updateTick?.(activeContractSymbol, q.ltp, q.change || 0);
          const ltp = Number(q.ltp);
          setLiveMarkPrice(ltp);
          const isTargetInvalid = targetPrice <= ltp;
          const isSlInvalid = stopLoss >= ltp || stopLoss <= 0;
          if (isLiveStreaming && (!hasUserCustomizedSlTpRef.current || isTargetInvalid || isSlInvalid)) {
            setEntryPrice(ltp);
            const targets = calculateRiskRewardTargets({ entryPrice: ltp, totalQty, underlying, isTesting: testingMode });
            setStopLoss(targets.stopLoss);
            setTargetPrice(targets.targetPrice);
          } else if (isLiveStreaming) {
            setEntryPrice(ltp);
          }
        }

        if (strategyMode === "SPREAD" && hedgeData) {
          const hq = hedgeData?.quotes?.[hedgeContractSymbol] || (hedgeData?.quotes ? Object.values(hedgeData.quotes)[0] : null);
          if (hq?.ltp > 0) {
            setHedgePrice(Number(hq.ltp));
          } else {
            const estHedge = Number((Number(q?.ltp || 100) * 0.35).toFixed(2));
            setHedgePrice((prev) => (prev > 0 ? prev : estHedge));
          }
        }
      });
    };

    executeQuoteFetch();
    pollInterval = setInterval(executeQuoteFetch, 3000);

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
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
        const isTargetInvalid = targetPrice <= ltp;
        const isSlInvalid = stopLoss >= ltp || stopLoss <= 0;
        if (!hasUserCustomizedSlTpRef.current || isTargetInvalid || isSlInvalid) {
          // Dynamic Risk Pegging: smoothly shift Stop Loss and Target by delta, strictly preserving Manikandan's risk invariant
          const totalDeductions = 35.00 + (0.50 * totalQty);
          const safeSlDiff = testingMode 
            ? (underlying === "SENSEX" ? 25.0 : underlying === "BANKNIFTY" ? 18.0 : 10.0)
            : Number((Math.max(65, 250 - totalDeductions) / Math.max(1, totalQty)).toFixed(2));
          const safeTpDiff = testingMode ? safeSlDiff * 2.0 : Number(((500 + 35.00) / Math.max(1, totalQty)).toFixed(2));
          setStopLoss((prev) => {
            const currentSL = Number(prev);
            const candidateSL = currentSL > 0 ? Number((currentSL + delta).toFixed(2)) : 0;
            return (candidateSL > 0 && candidateSL < ltp) ? candidateSL : Number(Math.max(0.05, ltp - safeSlDiff).toFixed(2));
          });
          setTargetPrice((prev) => {
            const currentTP = Number(prev);
            const candidateTP = currentTP > 0 ? Number((currentTP + delta).toFixed(2)) : 0;
            return candidateTP > ltp ? candidateTP : Number((ltp + safeTpDiff).toFixed(2));
          });
        }
      }
    }
  }, [liveContractTick?.ltp, isLiveStreaming, entryPrice, totalQty]);

  const handleSelectAsset = useCallback((asset) => {
    soundEngine.playTabSwitchTone();
    setUnderlying(asset.key);
    setTokenKey(null);
    hasUserPickedStrikeRef.current = false;
    hasUserCustomizedSlTpRef.current = false;
    const step = asset.key === "BANKNIFTY" || asset.key === "SENSEX" ? 100 : 50;
    const atm = asset.calculatedAtmStrike || asset.defaultStrike;
    setStrikePrice(atm);

    // Auto-align sentiment to the selected asset's live market trend
    const assetDir = asset.positive ? "CALL" : (asset.defaultOption || "CALL");
    hasUserPickedOptionRef.current = false;
    setOptionTypeState(assetDir);

    if (strategyMode === "SPREAD") {
      setHedgeStrike(assetDir === "CALL" ? atm + 2 * step : atm - 2 * step);
    }
    setEntryPrice(asset.defaultEntry);
    setLiveMarkPrice(asset.defaultEntry);
    const targets = calculateRiskRewardTargets({
      entryPrice: asset.defaultEntry,
      totalQty: resolveIndexLotSize(asset.key) * lots,
      underlying: asset.key,
      isTesting: testingMode
    });
    hasUserCustomizedSlTpRef.current = false;
    setStopLoss(targets.stopLoss);
    setTargetPrice(targets.targetPrice);
    setIsLiveStreaming(true);
  }, [strategyMode, lots]);

  const handleManualInputFocus = useCallback(() => {
    hasUserCustomizedSlTpRef.current = true;
    setIsLiveStreaming(false);
  }, []);

  const handleSetIsLiveStreaming = useCallback((val) => {
    setIsLiveStreaming(val);
    if (val) {
      hasUserCustomizedSlTpRef.current = false;
      const targetLtp = Number(liveMarkPrice || liveContractTick?.ltp || 0);
      if (targetLtp > 0) {
        setEntryPrice(targetLtp);
        const targets = calculateRiskRewardTargets({ entryPrice: targetLtp, totalQty, underlying, isTesting: testingMode });
        setStopLoss(targets.stopLoss);
        setTargetPrice(targets.targetPrice);
      }
    }
  }, [liveMarkPrice, liveContractTick?.ltp, totalQty, underlying, testingMode]);

  const handleSyncToLive = useCallback(() => {
    soundEngine.playSuccessChime?.();
    setIsLiveStreaming(true);
    hasUserCustomizedSlTpRef.current = false;
    const targetLtp = Number(liveMarkPrice || liveContractTick?.ltp || 0);
    if (targetLtp > 0) {
      setEntryPrice(targetLtp);
      const targets = calculateRiskRewardTargets({ entryPrice: targetLtp, totalQty, underlying, isTesting: testingMode });
      setStopLoss(targets.stopLoss);
      setTargetPrice(targets.targetPrice);
    }
  }, [liveMarkPrice, liveContractTick?.ltp, totalQty, underlying, testingMode]);

  const handleSetStopLoss = useCallback((val) => {
    hasUserCustomizedSlTpRef.current = true;
    setIsLiveStreaming(false);
    setStopLoss(val);
  }, []);

  const handleSetTargetPrice = useCallback((val) => {
    hasUserCustomizedSlTpRef.current = true;
    setIsLiveStreaming(false);
    setTargetPrice(val);
  }, []);

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
    isDeployingRef.current = true;
    setIsDeploying(true);

    const currentBrokerStatus = useTradingStore.getState().brokerStatus;
    if (currentBrokerStatus?.marketHoliday) {
      soundEngine?.playOrderReject?.();
      const holidayName = currentBrokerStatus?.holidayName || "Exchange Holiday";
      setDeployToast?.({
        error: true,
        symbol: activeContractSymbol,
        message: `🛑 Deployment Rejected: Market is closed today for ${holidayName}. Orders cannot be deployed on exchange holidays.`
      });
      isDeployingRef.current = false;
      setIsDeploying(false);
      return;
    }

    if (tiltSecondsRemaining > 0 && !testingMode) {
      soundEngine?.playOrderReject?.();
      isDeployingRef.current = false;
      setIsDeploying(false);
      return;
    }

    if (openAlerts.length >= 1) {
      soundEngine?.playOrderReject?.();
      setDeployToast?.({
        error: true,
        symbol: activeContractSymbol,
        message: "🔒 Active Position Lock: You already have an open active trade (1/1 Max). Close it before opening another."
      });
      isDeployingRef.current = false;
      setIsDeploying(false);
      return;
    }

    if (isDailyCapReached && !isUnrestricted) {
      soundEngine?.playOrderReject?.();
      setDeployToast?.({
        error: true,
        symbol: activeContractSymbol,
        message: "🛡️ Daily 3-Trade Quota Locked: Maximum 3 disciplined trades permitted per day. Capital preserved."
      });
      isDeployingRef.current = false;
      setIsDeploying(false);
      return;
    }

    if (isUnrestricted) {
      if (!canonicalPlan.isStopLossValid || !canonicalPlan.isTargetValid) {
        soundEngine?.playOrderReject?.();
        setDeployToast?.({
          error: true,
          symbol: activeContractSymbol,
          message: !canonicalPlan.isStopLossValid
            ? "🛑 Deployment Rejected: Invalid Stop Loss (must be strictly below Entry for CALL/Long)."
            : "🛑 Deployment Rejected: Invalid Target Price (must be strictly above Entry for CALL/Long)."
        });
        isDeployingRef.current = false;
        setIsDeploying(false);
        return;
      }
    } else if (!canonicalPlan.isCompliant) {
      soundEngine?.playOrderReject?.();
      const rejectDetail = canonicalPlan.rejectionReasonCodes.map((code) => {
        if (code === "MODELLED_RISK_EXCEEDS_CEILING") return `Net risk ₹${canonicalPlan.modelledNetRisk.toFixed(0)} exceeds ₹300 ceiling.`;
        if (code === "RR_BELOW_MINIMUM") return `Net R:R 1:${canonicalPlan.netRewardToRiskRatio.toFixed(2)} is below 2:1 minimum.`;
        if (code === "INVALID_STOP_LOSS") return "Invalid Stop Loss.";
        if (code === "INVALID_TARGET") return "Invalid Target Price.";
        return code;
      }).join(" ");
      setDeployToast?.({
        error: true,
        symbol: activeContractSymbol,
        message: `🛑 Deployment Rejected: ${rejectDetail}`
      });
      isDeployingRef.current = false;
      setIsDeploying(false);
      return;
    }

    soundEngine.playOrderExecutedTone();

    const currentLivePrice = Number(liveMarkPrice || netEntryPrice || 0);
    let deployEntry = netEntryPrice > 0 ? netEntryPrice : currentLivePrice;
    let deploySl = Number(stopLoss);
    let deployTp = Number(targetPrice);

    // Dynamic Guard: If stopLoss is breached by current market tick, recalibrate SL and TP to live tick so order never liquidates instantly
    if (currentLivePrice > 0 && (deploySl >= currentLivePrice || deploySl <= 0 || !hasUserCustomizedSlTpRef.current)) {
      deployEntry = currentLivePrice;
      const targets = calculateRiskRewardTargets({ entryPrice: currentLivePrice, totalQty, underlying, isTesting: testingMode });
      deploySl = targets.stopLoss;
      deployTp = targets.targetPrice;
    }

    const tradeToDeploy = {
      symbol: activeContractSymbol, underlying, optionType, strikePrice,
      tokenKey: tokenKey || null,
      entryPrice: deployEntry, stopLoss: deploySl, targetPrice: deployTp, quantity: lots,
      totalQty, lotSize, lots, strategyMode: strategyMode || "NAKED", direction: "LONG",
      feedMode: feedMode || "LIVE",
      testingMode: Boolean(testingMode),
      isUnrestricted: Boolean(isUnrestricted),
      testingRestrictionMode,
      tradeMode: isUnrestricted ? "SANDBOX" : "PAPER",
      status: "PENDING_SERVER_CONFIRMATION",
      stopDistancePts: canonicalPlan.stopDistancePts,
      targetDistancePts: canonicalPlan.targetDistancePts,
      modelledNetRisk: canonicalPlan.modelledNetRisk,
      netRewardToRiskRatio: canonicalPlan.netRewardToRiskRatio,
      ...customPayload
    };

    if (typeof deployPracticeTrade === "function") {
      startTransition(() => {
        deployPracticeTrade(tradeToDeploy);
      });
    }
    setTimeout(() => {
      isDeployingRef.current = false;
      setIsDeploying(false);
    }, 1200);
  }, [
    isDeploying, tiltSecondsRemaining, testingMode, isUnrestricted, testingRestrictionMode, isDailyCapReached, canonicalPlan,
    activeContractSymbol, underlying, optionType, strikePrice, netEntryPrice,
    stopLoss, targetPrice, totalQty, lotSize, lots, strategyMode, deployPracticeTrade, setDeployToast, openAlerts
  ]);

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
        const targets = calculateRiskRewardTargets({ entryPrice: ltp, totalQty, underlying, isTesting: testingMode });
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
    hasUserCustomizedSlTpRef.current = false;
    const newType = optionType === "CALL" ? "PUT" : "CALL";
    setOptionType(newType);
    const step = underlying === "BANKNIFTY" || underlying === "SENSEX" ? 100 : 50;
    const atm = Math.round(Number(currentAsset.spot || 24000) / step) * step;
    setStrikePrice(atm);
    if (strategyMode === "SPREAD") {
      setHedgeStrike(newType === "CALL" ? atm + 2 * step : atm - 2 * step);
    }
    if (entryPrice > 0) {
      const targets = calculateRiskRewardTargets({ entryPrice, totalQty, underlying, isTesting: testingMode });
      setStopLoss(targets.stopLoss);
      setTargetPrice(targets.targetPrice);
    }
    setIsLiveStreaming(true);
  }, [optionType, underlying, currentAsset.spot, strategyMode, setOptionType, entryPrice, totalQty]);

  const applyCopilotSignal = useCallback((signal) => {
    if (!signal) return;
    soundEngine.playTargetChime();
    hasUserPickedOptionRef.current = true;
    if (signal.underlying) setUnderlying(signal.underlying);
    if (signal.optionType) setOptionTypeState(signal.optionType);
    if (signal.strikePrice) {
      hasUserPickedStrikeRef.current = true;
      setStrikePrice(Number(signal.strikePrice));
    }
    if (signal.entryPrice) {
      const entry = Number(signal.entryPrice);
      setEntryPrice(entry);
      setLiveMarkPrice(entry);
    }
    if (signal.stopLoss) setStopLoss(Number(signal.stopLoss));
    if (signal.targetPrice) setTargetPrice(Number(signal.targetPrice));
    if (signal.lots) setLots(Number(signal.lots));
    setIsLiveStreaming(true);
  }, []);

  return {
    applyCopilotSignal,
    underlying, setUnderlying, optionType, setOptionType, strikePrice, setStrikePrice: handleSetStrikePrice,
    entryPrice, setEntryPrice, lots, setLots, stopLoss, setStopLoss: handleSetStopLoss, targetPrice, setTargetPrice: handleSetTargetPrice,
    hedgeStrike, setHedgeStrike, hedgePrice, setHedgePrice, strategyMode, setStrategyMode,
    feedMode, setFeedMode, simulateSlippage, setSimulateSlippage, dynamicAssets, currentAsset,
    lotSize, totalQty, netEntryPrice, capitalOutlay, riskAmount, rewardAmount, rrRatio,
    frictionMetrics, copilotState, copilotRegime, setCopilotRegime, activeDelta, ivRegime,
    activeGreeks,
    isDeploying, isScanning, setIsScanning, isIndexDropdownOpen, setIsIndexDropdownOpen,
    show12FilterDrawer, setShow12FilterDrawer, isLiveStreaming, setIsLiveStreaming: handleSetIsLiveStreaming, handleSyncToLive,
    liveContractTick, liveMarkPrice, strikeStep, hedgeContractSymbol,
    handleManualInputFocus, handleSelectAsset, handleExecute, handleManualScan, handleToggleTestingMode,
    handleQuickFlipOptionType,
    activeQuotaMode, isDailyCapReached, isDailyLossBreached, todayRealizedLoss,
    todayTradesCount, dailyQuotaLimit, testingMode, dailyQuotaBypass,
    tiltSecondsRemaining, isTiltLocked: tiltSecondsRemaining > 0,
    vault: { ...vault, claimCoolingVaultUnlock, cancelCoolingVault, requestCoolingVaultUnlock },
    duplicateWarning,
    plannedNetRisk, isRiskExceeded, estimatedFriction,
    canonicalPlan
  };
}
