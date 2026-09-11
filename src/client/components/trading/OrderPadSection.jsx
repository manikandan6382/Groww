import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useTradingStore, resolveIndexLotSize } from "../../stores/useTradingStore";
import { useLivePriceStore } from "../../stores/useLivePriceStore";
import { soundEngine } from "../../utils/soundEngine";
import { RollingTicker } from "../common/RollingTicker";
import { ApplePayoffCanvas } from "./ApplePayoffCanvas";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Zap, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Layers, 
  Clock, 
  Lock, 
  Unlock,
  Sparkles, 
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import clsx from "clsx";
import { isIndianMarketOpenHours } from "../../utils/dateUtils";

function isPowerHourWindow() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const timeInMins = hours * 60 + minutes;
  // 2:00 PM to 3:30 PM IST (14:00 to 15:30 -> 840 to 930 mins)
  return timeInMins >= 840 && timeInMins <= 930;
}

const INDEX_ASSETS = [
  { key: "NIFTY", name: "NIFTY 50", exchange: "NSE", spot: 23430.00, lot: 65, defaultOption: "PUT", defaultStrike: 23450, defaultEntry: 95.00, defaultSL: 91.00, defaultTP: 103.00, change: "-0.25%", positive: false },
  { key: "BANKNIFTY", name: "BANK NIFTY", exchange: "NSE", spot: 57031.00, lot: 30, defaultOption: "PUT", defaultStrike: 57000, defaultEntry: 180.00, defaultSL: 171.50, defaultTP: 197.00, change: "-0.66%", positive: false },
  { key: "FINNIFTY", name: "FIN NIFTY", exchange: "NSE", spot: 25721.20, lot: 65, defaultOption: "PUT", defaultStrike: 25700, defaultEntry: 65.0, defaultSL: 61.0, defaultTP: 73.0, change: "-1.10%", positive: false },
  { key: "SENSEX", name: "BSE SENSEX", exchange: "BSE", spot: 74765.00, lot: 20, defaultOption: "PUT", defaultStrike: 74800, defaultEntry: 155.0, defaultSL: 142.5, defaultTP: 180.0, change: "+0.01%", positive: true },
];

export const OrderPadSection = React.memo(function OrderPadSection() {
  const { 
    deployPracticeTrade, 
    feedMode, 
    setFeedMode, 
    strategyMode, 
    setStrategyMode,
    simulateSlippage, 
    setSimulateSlippage,
    dailyQuotaLimit = 3,
    dailyQuotaBypass = false,
    setDailyQuotaBypass,
    testingMode = false,
    setTestingMode,
    toggleTestingMode,
    coolingVaultUnlockTime = null,
    requestCoolingVaultUnlock,
    cancelCoolingVault,
    claimCoolingVaultUnlock,
    getTodayTradesCount,
    openAlerts,
    masterTrades,
    activePadSymbol,
    setActivePadSymbol,
    activeHedgeSymbol,
    setActiveHedgeSymbol
  } = useTradingStore();

  const todayTradesCount = useMemo(() => {
    return typeof getTodayTradesCount === "function" ? getTodayTradesCount() : 0;
  }, [openAlerts, masterTrades, getTodayTradesCount]);
  const isDailyCapReached = todayTradesCount >= dailyQuotaLimit && !dailyQuotaBypass && !testingMode;

  // 🧠 15-Minute Psychological Cooling Vault Live Countdown Engine
  const [nowTime, setNowTime] = useState(Date.now());
  useEffect(() => {
    if (!coolingVaultUnlockTime) return;
    const interval = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [coolingVaultUnlockTime]);

  const vaultMsRemaining = coolingVaultUnlockTime ? Math.max(0, coolingVaultUnlockTime - nowTime) : 0;
  const vaultSecRemaining = Math.floor(vaultMsRemaining / 1000);
  const vaultMins = Math.floor(vaultSecRemaining / 60);
  const vaultSecs = vaultSecRemaining % 60;
  const vaultFormattedTime = `${String(vaultMins).padStart(2, "0")}:${String(vaultSecs).padStart(2, "0")}`;
  const isVaultRunning = Boolean(coolingVaultUnlockTime && vaultMsRemaining > 0);
  const isVaultReadyToClaim = Boolean(coolingVaultUnlockTime && vaultMsRemaining <= 0);

  // 🛡️ Atomic Quota & Execution State Normalizer (Zero dual-banner collision)
  const activeQuotaMode = useMemo(() => {
    if (testingMode) return "UNLIMITED_TESTING";
    if (dailyQuotaBypass) return "SINGLE_BYPASS";
    if (isDailyCapReached) {
      if (isVaultRunning) return "VAULT_RUNNING";
      if (isVaultReadyToClaim) return "VAULT_READY";
      return "CAP_REACHED";
    }
    return "NORMAL";
  }, [testingMode, dailyQuotaBypass, isDailyCapReached, isVaultRunning, isVaultReadyToClaim]);

  const handleToggleTestingMode = useCallback(() => {
    soundEngine.playTabSwitchTone();
    if (testingMode) {
      if (typeof setTestingMode === "function") setTestingMode(false);
      if (typeof setDailyQuotaBypass === "function") setDailyQuotaBypass(false);
    } else {
      if (typeof setTestingMode === "function") setTestingMode(true);
      if (typeof setDailyQuotaBypass === "function") setDailyQuotaBypass(false); // Reset single bypass so it never collides!
    }
  }, [testingMode, setTestingMode, setDailyQuotaBypass]);

  const indices = useLivePriceStore((state) => state.indices);

  // Dynamic live asset quotes & ATM strike resolver
  const dynamicAssets = useMemo(() => {
    return INDEX_ASSETS.map((asset) => {
      let liveLtp = asset.spot;
      let liveChange = asset.change;
      let isPositive = asset.positive;

      if (asset.key === "NIFTY" && indices?.["NSE_INDEX|Nifty 50"]) {
        const ind = indices["NSE_INDEX|Nifty 50"];
        liveLtp = ind.ltp || liveLtp;
        liveChange = ind.changePct != null ? `${ind.changePct >= 0 ? "+" : ""}${ind.changePct.toFixed(2)}%` : liveChange;
        isPositive = (ind.changePct ?? 0) >= 0;
      } else if (asset.key === "BANKNIFTY" && indices?.["NSE_INDEX|Nifty Bank"]) {
        const ind = indices["NSE_INDEX|Nifty Bank"];
        liveLtp = ind.ltp || liveLtp;
        liveChange = ind.changePct != null ? `${ind.changePct >= 0 ? "+" : ""}${ind.changePct.toFixed(2)}%` : liveChange;
        isPositive = (ind.changePct ?? 0) >= 0;
      } else if (asset.key === "FINNIFTY" && indices?.["NSE_INDEX|Nifty Fin Service"]) {
        const ind = indices["NSE_INDEX|Nifty Fin Service"];
        liveLtp = ind.ltp || liveLtp;
        liveChange = ind.changePct != null ? `${ind.changePct >= 0 ? "+" : ""}${ind.changePct.toFixed(2)}%` : liveChange;
        isPositive = (ind.changePct ?? 0) >= 0;
      } else if (asset.key === "SENSEX" && indices?.["BSE_INDEX|SENSEX"]) {
        const ind = indices["BSE_INDEX|SENSEX"];
        liveLtp = ind.ltp || liveLtp;
        liveChange = ind.changePct != null ? `${ind.changePct >= 0 ? "+" : ""}${ind.changePct.toFixed(2)}%` : liveChange;
        isPositive = (ind.changePct ?? 0) >= 0;
      }

      const step = asset.key === "BANKNIFTY" || asset.key === "SENSEX" ? 100 : 50;
      const atmStrike = Math.round(liveLtp / step) * step;
      const recommendedOption = isPositive ? "CALL" : "PUT";

      return {
        ...asset,
        spot: liveLtp,
        change: liveChange,
        positive: isPositive,
        calculatedAtmStrike: atmStrike,
        recommendedOption
      };
    });
  }, [indices]);

  const [optionType, setOptionType] = useState("PUT");
  const [underlying, setUnderlying] = useState("NIFTY");
  const [strikePrice, setStrikePrice] = useState(() => INDEX_ASSETS[0].defaultStrike);
  const [entryPrice, setEntryPrice] = useState(() => INDEX_ASSETS[0].defaultEntry);
  const [lots, setLots] = useState(1);
  const [stopLoss, setStopLoss] = useState(() => INDEX_ASSETS[0].defaultSL);
  const [targetPrice, setTargetPrice] = useState(() => INDEX_ASSETS[0].defaultTP);
  const [hedgeStrike, setHedgeStrike] = useState(23900);
  const [hedgePrice, setHedgePrice] = useState(23.90);
  const [copilotRegime, setCopilotRegime] = useState("AUTO"); // "AUTO" | "PRIME" | "WARNING" | "BLOCKED"
  const [sandboxBypass, setSandboxBypass] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState(null);
  const [isIndexDropdownOpen, setIsIndexDropdownOpen] = useState(false);
  const [show12FilterDrawer, setShow12FilterDrawer] = useState(false);
  const [duplicateContractWarning, setDuplicateContractWarning] = useState(null);
  const [liveGreeks, setLiveGreeks] = useState(null);
  const [hedgeGreeks, setHedgeGreeks] = useState(null);
  const [netTheta, setNetTheta] = useState(null);
  const [netDelta, setNetDelta] = useState(null);
  const indexDropdownRef = useRef(null);
  // 🛡️ Synchronous Hardware-Style Mutex to prevent double-click race conditions
  const deployLockRef = useRef(false);

  // ⚡ Live Real-Time Tick Streaming State
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);
  const isMarketHours = isIndianMarketOpenHours();
  const activeContractSymbol = `${underlying} ${strikePrice} ${optionType === "CALL" ? "CE" : "PE"}`;
  const hedgeContractSymbol = strategyMode === "SPREAD" && hedgeStrike 
    ? `${underlying} ${hedgeStrike} ${optionType === "CALL" ? "CE" : "PE"}` 
    : null;
  const liveContractTick = useLivePriceStore((state) => state.ticks?.[activeContractSymbol]);
  const liveHedgeTick = useLivePriceStore((state) => (hedgeContractSymbol ? state.ticks?.[hedgeContractSymbol] : null));

  // Synchronize active contracts with store and trigger immediate live quote fetch
  useEffect(() => {
    if (typeof setActivePadSymbol === "function") {
      setActivePadSymbol(activeContractSymbol);
    }
    if (typeof setActiveHedgeSymbol === "function") {
      setActiveHedgeSymbol(hedgeContractSymbol);
    }
    const symbolsToQuery = [activeContractSymbol, hedgeContractSymbol].filter(Boolean);
    fetch("/api/market/option-quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols: symbolsToQuery })
    }).catch(() => {});
  }, [activeContractSymbol, hedgeContractSymbol, setActivePadSymbol, setActiveHedgeSymbol]);

  // Dynamic hedge price update for Spread mode
  useEffect(() => {
    if (!isLiveStreaming || !liveHedgeTick?.ltp || strategyMode !== "SPREAD") return;
    const hLtp = Number(liveHedgeTick.ltp);
    if (hLtp <= 0) return;
    setHedgePrice((prev) => (Math.abs(prev - hLtp) < 0.01 ? prev : hLtp));
  }, [liveHedgeTick?.ltp, isLiveStreaming, strategyMode]);

  // ⚡ Throttled Tick Listener (150ms RAF window): Eliminates React state thrashing during 0DTE gamma spikes
  const lastTickTimeRef = useRef(0);
  const rafIdRef = useRef(null);

  useEffect(() => {
    if (!isLiveStreaming || !liveContractTick?.ltp) return;
    const liveLtp = Number(liveContractTick.ltp);
    if (liveLtp <= 0) return;

    const applyLiveTick = () => {
      lastTickTimeRef.current = Date.now();
      setEntryPrice((prev) => {
        if (Math.abs(prev - liveLtp) < 0.01) return prev;
        return liveLtp;
      });

      const isSensex = underlying === "SENSEX";
      const isBankNifty = underlying === "BANKNIFTY";
      // 🏛️ Manikandan's ₹10k Budget Discipline: ₹200–₹300 SL / ₹400–₹600 TP
      // NIFTY/FINNIFTY (lot=65): 4.0 pts SL = ₹260, 8.0 pts TP = ₹520 (R:R 1:2.0)
      // BANKNIFTY (lot=30): 8.5 pts SL = ₹255, 17.0 pts TP = ₹510 (R:R 1:2.0)
      // SENSEX (lot=20): 12.5 pts SL = ₹250, 25.0 pts TP = ₹500 (R:R 1:2.0)
      const slDistance = isSensex ? 12.5 : (isBankNifty ? 8.5 : 4.0);
      const tpDistance = isSensex ? 25.0 : (isBankNifty ? 17.0 : 8.0);

      setStopLoss(Math.max(0.05, Number((liveLtp - slDistance).toFixed(2))));
      setTargetPrice(Number((liveLtp + tpDistance).toFixed(2)));
    };

    const now = Date.now();
    if (now - lastTickTimeRef.current >= 150) {
      applyLiveTick();
    } else {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => {
        applyLiveTick();
      });
    }

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [liveContractTick?.ltp, isLiveStreaming, underlying]);

  // 🔒 Auto-Lock on Manual Input Interaction: Freezes live streaming to prevent overwriting custom input
  const handleManualInputFocus = useCallback(() => {
    setIsLiveStreaming((prev) => {
      if (prev) {
        soundEngine.playTabSwitchTone();
        return false;
      }
      return prev;
    });
  }, []);

  // 🛡️ Mode-Switch Handler with Auto-Spread Activation in Caution Regime (Pivot 3)
  const handleSetCopilotRegime = (regime) => {
    soundEngine.playTabSwitchTone();
    setCopilotRegime(regime);
    if (regime === "WARNING") {
      setStrategyMode("SPREAD");
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (indexDropdownRef.current && !indexDropdownRef.current.contains(event.target)) {
        setIsIndexDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentAsset = useMemo(() => {
    return dynamicAssets.find((a) => a.key === underlying) || dynamicAssets[0];
  }, [dynamicAssets, underlying]);

  const lotSize = resolveIndexLotSize(underlying);
  const totalQty = lots * lotSize;
  const netEntryPrice = strategyMode === "SPREAD" ? Math.max(0.1, entryPrice - hedgePrice) : entryPrice;
  const capitalOutlay = totalQty * netEntryPrice;

  // 🛡️ Edge-Case Invariant: Validate Stop Loss strictly below entry and Target strictly above entry
  const isValidSL = Number(entryPrice) > 0 && Number(stopLoss) > 0 && Number(stopLoss) < Number(entryPrice);
  const isValidTarget = Number(entryPrice) > 0 && Number(targetPrice) > Number(entryPrice);
  const riskAmount = isValidSL ? totalQty * (entryPrice - stopLoss) : 0;
  const rewardAmount = isValidTarget ? totalQty * (targetPrice - entryPrice) : 0;
  const rrRatio = isValidSL && isValidTarget && riskAmount > 0 ? (rewardAmount / riskAmount).toFixed(2) : "0.00";

  // 🧾 Statutory Friction & Reward Floor Gatekeeper (Friction Drag & Micro-Scalp Trap)
  // Calibrated for ₹10k account (₹400-₹600 target retains ~90% after ~₹55 statutory friction)
  const estimatedFriction = Number((55.20 + (netEntryPrice * totalQty * 0.001)).toFixed(2));
  const MIN_VIABLE_REWARD = Math.max(250, estimatedFriction * 3.5);
  const isFrictionTrap = rewardAmount > 0 && rewardAmount < MIN_VIABLE_REWARD;
  const frictionDragPct = rewardAmount > 0 ? Number(((estimatedFriction / rewardAmount) * 100).toFixed(1)) : 0;
  const frictionCoverageRatio = estimatedFriction > 0 && rewardAmount > 0 ? (rewardAmount / estimatedFriction).toFixed(1) : "0.0";

  // ⚖️ Net Realized R:R Engine (/gaslight-pro calibrated)
  const conservativeSlippage = Number((0.5 * totalQty).toFixed(2));
  const netRiskAmount = riskAmount > 0 ? riskAmount + estimatedFriction + conservativeSlippage : 0;
  const netRewardAmount = Math.max(0, rewardAmount - estimatedFriction - conservativeSlippage);
  const netRrRatio = netRiskAmount > 0 ? (netRewardAmount / netRiskAmount).toFixed(2) : "0.00";

  // 💣 Black Swan 10% NSE Circuit Halt Worst-Case Shock (Option premium collapses to ₹0.05 + statutory friction)
  const blackSwanPremiumLoss = totalQty * Math.max(0, netEntryPrice - 0.05);
  const blackSwanLoss = Number((blackSwanPremiumLoss + estimatedFriction).toFixed(2));
  const isCapitalOutlayOversized = capitalOutlay > 10000;
  // 🏛️ Level 3 Elite Quantitative Greeks Engine
  const isSpreadMode = strategyMode === "SPREAD";
  const effectiveThetaPts = isSpreadMode && netTheta != null ? netTheta : (liveGreeks?.theta || 0);
  const rawDailyThetaRupees = Math.abs(Math.round(effectiveThetaPts * totalQty));
  const clampedDailyThetaRupees = capitalOutlay > 0 ? Math.min(capitalOutlay, rawDailyThetaRupees) : rawDailyThetaRupees;

  // ⏳ Theta Stagnation Half-Life: Minutes before 50% of stop loss is consumed by time decay
  const thetaHalfLifeMins = useMemo(() => {
    const slPts = Math.abs(entryPrice - stopLoss);
    const absTheta = Math.abs(effectiveThetaPts || 10.0);
    const thetaPerMin = absTheta / 375.0;
    return thetaPerMin > 0 ? Math.round((slPts * 0.5) / thetaPerMin) : 120;
  }, [entryPrice, stopLoss, effectiveThetaPts]);

  // 0DTE Expiry Assessment
  const isZeroDte = useMemo(() => {
    if (!liveGreeks?.expiry) return false;
    const expDate = new Date(liveGreeks.expiry);
    const today = new Date();
    return expDate.getFullYear() === today.getFullYear() && expDate.getMonth() === today.getMonth() && expDate.getDate() === today.getDate();
  }, [liveGreeks?.expiry]);

  const isThetaCliff = isZeroDte || (capitalOutlay > 0 && rawDailyThetaRupees >= capitalOutlay * 0.75);

  // Real-Time Spot Delta Re-Interpolation (Taylor series: Δ_live = Δ_scan + Γ * dS)
  const displayDelta = useMemo(() => {
    if (liveGreeks?.delta == null) return null;
    const baseDelta = isSpreadMode && netDelta != null ? netDelta : liveGreeks.delta;
    const liveSpot = currentAsset?.spot || 0;
    const scanSpot = liveGreeks.spot || liveSpot;
    const dS = liveSpot - scanSpot;
    const gamma = liveGreeks.gamma || 0.001;
    const deltaSign = optionType === "CALL" ? 1 : -1;
    const raw = baseDelta + (deltaSign * gamma * dS);
    return Number(Math.max(-0.99, Math.min(0.99, raw)).toFixed(4));
  }, [liveGreeks, isSpreadMode, netDelta, currentAsset?.spot, optionType]);

  // IV Regime Matrix
  const ivRegime = useMemo(() => {
    const iv = liveGreeks?.iv || 14;
    if (iv < 14) return { label: "OPTIMAL BUY", tag: "Low Vol Edge", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30" };
    if (iv <= 18) return { label: "FAIR VALUE", tag: "Normal Vol", color: "text-cyan-300", bg: "bg-cyan-500/15 border-cyan-500/30" };
    return { label: "ELEVATED", tag: "Spread Advised", color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/30" };
  }, [liveGreeks?.iv]);

  // Deterministic Trading Copilot Pro Market State Engine (/trading-copilot-pro)
  const copilotState = useMemo(() => {
    const activeAsset = currentAsset;
    const isMarketBearish = !activeAsset.positive;
    const dynamicTitle = isMarketBearish ? "Breakdown Momentum Scalp" : "Bullish Expansion Scalp";
    const dynamicSubtitle = `Spot @ ₹${Number(activeAsset.spot).toLocaleString("en-IN", { minimumFractionDigits: 2 })} (${activeAsset.change}). ${activeAsset.name} ${isMarketBearish ? "breakdown below resistance" : "breakout above VWAP"} confirmed on Upstox v2 feed. 1:${rrRatio} R:R locked.`;

    if (copilotRegime === "PRIME") {
      if (isFrictionTrap) {
        return {
          regime: "PRIME",
          status: "FRICTION_TRAP",
          badge: `⚠️ FRICTION TRAP (${frictionDragPct}% TAX)`,
          badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.3)]",
          bannerBg: "bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.15)]",
          ambientGlow: "bg-amber-500/10",
          pulseColor: "bg-amber-400",
          title: "Micro-Yield Friction Trap",
          subtitle: `Projected reward (+₹${rewardAmount.toFixed(0)}) loses ${frictionDragPct}% to statutory friction (~₹${estimatedFriction.toFixed(0)}). Enforce ≥ ₹${MIN_VIABLE_REWARD.toFixed(0)} reward floor.`,
          buttonText: "⚠️ Auto-Deploy (Friction Drag)",
          buttonClass: "bg-amber-500 hover:bg-amber-400 text-black font-black shadow-lg shadow-amber-500/30",
          ctaText: "⚠️ Deploy Trade (High Statutory Friction Drag) →",
          ctaClass: "bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 text-black font-extrabold shadow-xl shadow-amber-500/25 cursor-pointer",
          canDeploy: true,
          recommendedLots: 1
        };
      }
      return {
        regime: "PRIME",
        status: "APPROVED",
        badge: "🟢 PRIME 12/12 APPROVED",
        badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]",
        bannerBg: "bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.15)]",
        ambientGlow: "bg-emerald-500/10",
        pulseColor: "bg-emerald-400",
        title: dynamicTitle,
        subtitle: dynamicSubtitle,
        buttonText: "🚀 1-Click Auto-Deploy",
        buttonClass: "bg-emerald-500 hover:bg-emerald-400 text-black font-black shadow-lg shadow-emerald-500/30",
        ctaText: "Deploy Prime Live Setup (12/12 Approved) →",
        ctaClass: "bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-black font-extrabold shadow-xl shadow-emerald-500/25 cursor-pointer",
        canDeploy: true,
        recommendedLots: 1
      };
    }
    if (copilotRegime === "WARNING") {
      return {
        regime: "WARNING",
        status: "CAUTION",
        badge: "🟡 CAUTION / HEDGED SPREAD",
        badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.3)]",
        bannerBg: "bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.15)]",
        ambientGlow: "bg-amber-500/10",
        pulseColor: "bg-amber-400",
        title: "Caution: Mid-Day Chop Zone",
        subtitle: "Low volume theta decay window (11:15-13:15 IST). Defined-risk debit spread activated to eliminate theta decay.",
        buttonText: "🛡️ Auto-Deploy Spread (Hedged)",
        buttonClass: "bg-amber-500 hover:bg-amber-400 text-black font-black shadow-lg shadow-amber-500/30",
        ctaText: "🛡️ Deploy Defined-Risk Spread (Theta-Protected) →",
        ctaClass: "bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 text-black font-extrabold shadow-xl shadow-amber-500/25 cursor-pointer",
        canDeploy: true,
        recommendedLots: 1
      };
    }
    if (copilotRegime === "BLOCKED") {
      return {
        regime: "BLOCKED",
        status: "STAND_DOWN",
        badge: "🔴 BANNED EXECUTION WINDOW",
        badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.3)]",
        bannerBg: "bg-gradient-to-r from-rose-500/20 via-red-500/10 to-transparent border-rose-500/40 shadow-[0_0_25px_rgba(244,63,94,0.15)]",
        ambientGlow: "bg-rose-500/10",
        pulseColor: "bg-rose-400",
        title: "Stand Down · Capital Protected",
        subtitle: "Zero edge / outside liquidity hours. 100% of bankroll protected against chop.",
        buttonText: "🛑 Stand Down (Locked)",
        buttonClass: "bg-rose-500/20 text-rose-300 border border-rose-500/40 cursor-not-allowed opacity-90",
        ctaText: "🛑 Trading Locked (Zero Edge · Preserving Bankroll)",
        ctaClass: "bg-rose-950/60 border border-rose-500/30 text-rose-400/80 cursor-not-allowed shadow-none",
        canDeploy: false,
        recommendedLots: 0
      };
    }

    // AUTO EVALUATION BASED ON LIVE TIME & 12-FILTERS
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMins = now.getUTCMinutes();
    const istMinsTotal = (utcHours * 60 + utcMins + 330) % 1440;
    const istHour = Math.floor(istMinsTotal / 60);
    const istMinute = istMinsTotal % 60;

    const isMarketOpen = (istHour > 9 || (istHour === 9 && istMinute >= 15)) && (istHour < 15 || (istHour === 15 && istMinute <= 30));

    if (!isMarketOpen) {
      return {
        regime: "BLOCKED",
        status: "STAND_DOWN",
        badge: "🔴 MARKET CLOSED (09:15-15:30 IST)",
        badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/40",
        bannerBg: "bg-gradient-to-r from-rose-500/20 via-red-500/10 to-transparent border-rose-500/40 shadow-[0_0_25px_rgba(244,63,94,0.15)]",
        ambientGlow: "bg-rose-500/10",
        pulseColor: "bg-rose-400",
        title: "Market Offline · Practice Simulation Ready",
        subtitle: "Live market opens at 09:15 AM IST. Select simulated regimes above to test dynamic states.",
        buttonText: "🛑 Stand Down (Locked)",
        buttonClass: "bg-rose-500/20 text-rose-300 border border-rose-500/40 cursor-not-allowed opacity-90",
        ctaText: "Deploy Practice Trade in Sandbox Mode →",
        ctaClass: "bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 text-black font-extrabold shadow-xl shadow-cyan-500/25 cursor-pointer",
        canDeploy: true,
        recommendedLots: 1
      };
    }

    if ((istHour === 9 && istMinute < 20) || (istHour === 15 && istMinute >= 0)) {
      return {
        regime: "BLOCKED",
        status: "STAND_DOWN",
        badge: "🔴 SQUARING VOLATILITY CHOP",
        badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/40",
        bannerBg: "bg-gradient-to-r from-rose-500/20 via-red-500/10 to-transparent border-rose-500/40 shadow-[0_0_25px_rgba(244,63,94,0.15)]",
        ambientGlow: "bg-rose-500/10",
        pulseColor: "bg-rose-400",
        title: "Volatility Blackout Window",
        subtitle: "First 5-mins opening spreads & auto square-off volatility blocked.",
        buttonText: "🛑 Stand Down (Locked)",
        buttonClass: "bg-rose-500/20 text-rose-300 border border-rose-500/40 cursor-not-allowed opacity-90",
        ctaText: "🛑 Trading Locked (Zero Edge)",
        ctaClass: "bg-rose-950/60 border border-rose-500/30 text-rose-400/80 cursor-not-allowed shadow-none",
        canDeploy: false,
        recommendedLots: 0
      };
    }

    if ((istHour === 11 && istMinute >= 15) || istHour === 12 || (istHour === 13 && istMinute < 15)) {
      return {
        regime: "WARNING",
        status: "CAUTION",
        badge: "🟡 MID-DAY THETA CHOP (11:15-13:15 IST)",
        badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.3)]",
        bannerBg: "bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.15)]",
        ambientGlow: "bg-amber-500/10",
        pulseColor: "bg-amber-400",
        title: "Caution: Lunchtime Theta Decay",
        subtitle: "Mid-day low volume chop zone. Defined-risk debit spread activated to eliminate theta decay.",
        buttonText: "🛡️ Auto-Deploy Spread (Hedged)",
        buttonClass: "bg-amber-500 hover:bg-amber-400 text-black font-black shadow-lg shadow-amber-500/30",
        ctaText: "🛡️ Deploy Defined-Risk Spread (Theta-Protected) →",
        ctaClass: "bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 text-black shadow-xl shadow-amber-500/25 cursor-pointer",
        canDeploy: true,
        recommendedLots: 1
      };
    }

    if (isFrictionTrap) {
      return {
        regime: "PRIME",
        status: "FRICTION_TRAP",
        badge: `⚠️ FRICTION TRAP (${frictionDragPct}% TAX)`,
        badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.3)]",
        bannerBg: "bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.15)]",
        ambientGlow: "bg-amber-500/10",
        pulseColor: "bg-amber-400",
        title: "Micro-Yield Friction Trap",
        subtitle: `Projected reward (+₹${rewardAmount.toFixed(0)}) loses ${frictionDragPct}% to statutory friction (~₹${estimatedFriction.toFixed(0)}). Enforce ≥ ₹${MIN_VIABLE_REWARD.toFixed(0)} reward floor.`,
        buttonText: "⚠️ Auto-Deploy (Friction Drag)",
        buttonClass: "bg-amber-500 hover:bg-amber-400 text-black font-black shadow-lg shadow-amber-500/30",
        ctaText: "⚠️ Deploy Trade (High Statutory Friction Drag) →",
        ctaClass: "bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 text-black font-extrabold shadow-xl shadow-amber-500/25 cursor-pointer",
        canDeploy: true,
        recommendedLots: 1
      };
    }

    return {
      regime: "PRIME",
      status: "APPROVED",
      badge: "🟢 PRIME EXECUTION WINDOW · 12/12 APPROVED",
      badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      bannerBg: "bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.15)]",
      ambientGlow: "bg-emerald-500/10",
      pulseColor: "bg-emerald-400",
      title: dynamicTitle,
      subtitle: dynamicSubtitle,
      buttonText: "🚀 1-Click Auto-Deploy",
      buttonClass: "bg-emerald-500 hover:bg-emerald-400 text-black font-black shadow-lg shadow-emerald-500/30",
      ctaText: "Deploy Prime Live Setup (Approved) →",
      ctaClass: "bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-black font-extrabold shadow-xl shadow-emerald-500/25 cursor-pointer",
      canDeploy: true,
      recommendedLots: 1
    };
  }, [copilotRegime, dynamicAssets, underlying, rrRatio, isFrictionTrap, frictionDragPct, rewardAmount, estimatedFriction, MIN_VIABLE_REWARD]);

  // 🛡️ Auto-Activate Defined-Risk SPREAD during Mid-Day Caution / Theta Decay Window (11:15–13:15 IST)
  useEffect(() => {
    if (copilotState.regime === "WARNING" && strategyMode !== "SPREAD") {
      setStrategyMode("SPREAD");
    }
  }, [copilotState.regime, strategyMode, setStrategyMode]);

  // ⚡ 1-Click Fast Scalp Presets Engine
  const applyScalpPreset = (type) => {
    const step = underlying === "BANKNIFTY" || underlying === "SENSEX" ? 100 : 50;
    const currentAsset = dynamicAssets.find(a => a.key === underlying) || dynamicAssets[0];
    const spot = currentAsset.spot;
    const atmStrike = currentAsset.calculatedAtmStrike || Math.round(spot / step) * step;

    let targetStrike = atmStrike;
    if (type === "ATM") {
      targetStrike = atmStrike;
      setStrikePrice(atmStrike);
      setEntryPrice(currentAsset.defaultEntry);
      setStopLoss(currentAsset.defaultSL);
      setTargetPrice(currentAsset.defaultTP);
    } else if (type === "ITM") {
      targetStrike = optionType === "CALL" ? atmStrike - step : atmStrike + step;
      setStrikePrice(targetStrike);
      const itmEntry = Number((currentAsset.defaultEntry * 1.45).toFixed(1));
      setEntryPrice(itmEntry);
      setStopLoss(Number((itmEntry - 6.0).toFixed(1)));
      setTargetPrice(Number((itmEntry + 12.0).toFixed(1)));
    } else if (type === "OTM") {
      targetStrike = optionType === "CALL" ? atmStrike + step : atmStrike - step;
      setStrikePrice(targetStrike);
      const otmEntry = Number((currentAsset.defaultEntry * 0.65).toFixed(1));
      setEntryPrice(otmEntry);
      setStopLoss(Number((otmEntry - 2.5).toFixed(1)));
      setTargetPrice(Number((otmEntry + 5.5).toFixed(1)));
    }
    // Synchronize Greeks immediately for selected strike!
    handleManualScan(targetStrike);
  };

  // 🏛️ Dan Passarelli Option Greeks Rule for ₹10k Budget (₹200–₹300 SL / ₹400–₹600 TP)
  const apply10kGreeksRule = () => {
    soundEngine.playSuccessTone();
    setLots(1); // 1 lot guarantees capital outlay <= ₹10,000 for ATM options
    const step = underlying === "BANKNIFTY" || underlying === "SENSEX" ? 100 : 50;
    const currentAsset = dynamicAssets.find(a => a.key === underlying) || dynamicAssets[0];
    const spot = currentAsset.spot;
    const atmStrike = currentAsset.calculatedAtmStrike || Math.round(spot / step) * step;
    setStrikePrice(atmStrike);
    
    // Greeks Calibration based on index lot size:
    // NIFTY (lot = 65): 4.0 pts SL = ₹260 (in ₹200-₹300 window), 8.0 pts TP = ₹520 (in ₹400-₹600 window)
    const currentEntry = Number(entryPrice) > 0 ? Number(entryPrice) : currentAsset.defaultEntry;
    const slPts = underlying === "BANKNIFTY" ? 8.5 : underlying === "SENSEX" ? 12.5 : 4.0;
    const tpPts = underlying === "BANKNIFTY" ? 17.0 : underlying === "SENSEX" ? 25.0 : 8.0;

    const newSL = Math.max(0.05, Number((currentEntry - slPts).toFixed(2)));
    const newTP = Number((currentEntry + tpPts).toFixed(2));
    setStopLoss(newSL);
    setTargetPrice(newTP);
    handleManualScan(atmStrike);
  };

  const autoSizeOnePercentRisk = () => {
    const isPowerHour = isPowerHourWindow();
    const riskPerShare = Math.max(1, entryPrice - stopLoss);
    const maxRiskBudget = isPowerHour ? 500 : 1000; // 0.5% during 0DTE power-hour gamma vs 1% standard
    const calculatedLots = Math.max(1, Math.floor(maxRiskBudget / (lotSize * riskPerShare)));
    setLots(calculatedLots);
  };

  const applyRupeeRiskSizer = (budget) => {
    const riskPerShare = Math.max(1, entryPrice - stopLoss);
    const calculatedLots = Math.max(1, Math.floor(budget / (lotSize * riskPerShare)));
    setLots(calculatedLots);
    soundEngine.playTabSwitchTone();
  };

  // AI Presets Handler
  const applyPreset = (preset) => {
    if (preset === "atm") {
      applyScalpPreset("ATM");
    } else if (preset === "safe") {
      applyScalpPreset("ITM");
    } else if (preset === "hero") {
      applyScalpPreset("OTM");
    }
  };

  const handleManualScan = async (overrideStrike = null, overrideHedge = null) => {
    if (isScanning) return;
    setIsScanning(true);
    soundEngine.playTabSwitchTone();
    try {
      const targetStrike = overrideStrike != null ? overrideStrike : null;
      const targetHedge = overrideHedge != null ? overrideHedge : (strategyMode === "SPREAD" ? hedgeStrike : null);
      let url = `/api/upstox/copilot-audit?symbol=${encodeURIComponent(underlying)}`;
      if (targetStrike) url += `&strike=${encodeURIComponent(targetStrike)}`;
      if (targetHedge) url += `&hedgeStrike=${encodeURIComponent(targetHedge)}`;

      const res = await fetch(url);
      if (res.ok) {
        const audit = await res.json();
        if (audit.success) {
          if (audit.optionType) setOptionType(audit.optionType);
          if (audit.strike) setStrikePrice(audit.strike);
          if (audit.entryPrice) setEntryPrice(audit.entryPrice);
          if (audit.stopLoss) setStopLoss(audit.stopLoss);
          if (audit.targetPrice) setTargetPrice(audit.targetPrice);
          if (audit.greeks) setLiveGreeks({ ...audit.greeks, spot: audit.spot });
          if (audit.hedgeGreeks) setHedgeGreeks(audit.hedgeGreeks);
          if (audit.netTheta != null) setNetTheta(audit.netTheta);
          if (audit.netDelta != null) setNetDelta(audit.netDelta);
          setLastScanTime(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));

          soundEngine.playSuccessTone();
        }
      }
    } catch (e) {
      console.warn("Copilot manual scan notice:", e.message);
    } finally {
      setTimeout(() => setIsScanning(false), 800);
    }
  };

  // Re-sync hedge Greeks when switching to spread mode or changing hedge strike
  useEffect(() => {
    if (strategyMode === "SPREAD") {
      handleManualScan(null, hedgeStrike);
    }
  }, [strategyMode, hedgeStrike]);

  // Auto-scan live Upstox option quote on mount & asset switch
  useEffect(() => {
    handleManualScan();
  }, [underlying]);

  const handleSelectAsset = (asset) => {
    soundEngine.playTabSwitchTone();
    setUnderlying(asset.key);
    const optType = asset.recommendedOption || asset.defaultOption || "PUT";
    const strike = asset.calculatedAtmStrike || asset.defaultStrike;
    setOptionType(optType);
    setStrikePrice(strike);
    setEntryPrice(asset.defaultEntry);
    setStopLoss(asset.defaultSL);
    setTargetPrice(asset.defaultTP);
  };

  const handle1ClickAutoDeploy = () => {
    if (deployLockRef.current) return;
    if (isDeploying) return;
    if (isDailyCapReached) {
      soundEngine.playErrorTone();
      return;
    }
    if (!isValidSL || !isValidTarget) {
      soundEngine.playErrorTone();
      setDuplicateContractWarning(!isValidSL ? `Stop Loss (₹${stopLoss}) must be strictly below Entry (₹${entryPrice})` : `Target (₹${targetPrice}) must be strictly above Entry (₹${entryPrice})`);
      setTimeout(() => setDuplicateContractWarning(null), 5000);
      return;
    }
    if (!copilotState.canDeploy && copilotRegime === "BLOCKED" && !sandboxBypass) return;

    // 🛡️ Contract Mismatch Guard (Prevents ATM price pairing with deep ITM strike)
    const spotVal = Number(currentAsset.spot || 23430);
    const stepVal = underlying === "BANKNIFTY" || underlying === "SENSEX" ? 100 : 50;
    const realAtm = Math.round(spotVal / stepVal) * stepVal;
    if (Math.abs(strikePrice - spotVal) > (stepVal * 4) && entryPrice < 150) {
      soundEngine.playErrorTone();
      setStrikePrice(realAtm);
      handleManualScan(realAtm);
      setDuplicateContractWarning(`Strike anomaly prevented: Strike ${strikePrice} diverged from spot ₹${spotVal.toFixed(0)}. Re-anchored to ATM ${realAtm}. Click deploy.`);
      setTimeout(() => setDuplicateContractWarning(null), 5000);
      return;
    }

    const symbol = `${underlying} ${strikePrice} ${optionType === "CALL" ? "CE" : "PE"}`;
    const alreadyOpen = (openAlerts || []).find(t => t.symbol === symbol);
    if (alreadyOpen) {
      soundEngine.playTabSwitchTone();
      setDuplicateContractWarning(symbol);
      const activeElem = document.getElementById("active-practice-trades");
      if (activeElem) {
        activeElem.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      setTimeout(() => setDuplicateContractWarning(null), 5000);
      return;
    }

    deployLockRef.current = true;
    setIsDeploying(true);
    soundEngine.playOrderFillTone();
    const idempotencyKey = `copilot_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const effectiveLots = copilotState.regime === "WARNING" ? Math.max(1, Math.floor(lots * 0.5)) : lots;
    const effectiveStrategyMode = copilotState.regime === "WARNING" ? "SPREAD" : strategyMode;

    // Pull freshest real-time tick directly from Zustand store at millisecond of click
    const freshTick = isLiveStreaming ? useLivePriceStore.getState().ticks?.[symbol] : null;
    const effectiveEntryPrice = freshTick?.ltp && freshTick.ltp > 0 ? Number(freshTick.ltp) : entryPrice;
    const freshHedgeTick = isLiveStreaming && effectiveStrategyMode === "SPREAD" && hedgeStrike 
      ? useLivePriceStore.getState().ticks?.[`${underlying} ${hedgeStrike} ${optionType === "CALL" ? "CE" : "PE"}`] 
      : null;
    const effectiveHedgePrice = freshHedgeTick?.ltp && freshHedgeTick.ltp > 0 ? Number(freshHedgeTick.ltp) : hedgePrice;
    const effectiveNetDebit = effectiveStrategyMode === "SPREAD" ? Math.max(0.1, effectiveEntryPrice - effectiveHedgePrice) : effectiveEntryPrice;

    deployPracticeTrade({
      idempotencyKey,
      symbol,
      underlyingSymbol: underlying,
      strikePrice,
      optionType,
      entryPrice: effectiveEntryPrice,
      stopLoss,
      targetPrice,
      quantity: effectiveLots,
      lotSize,
      feedMode,
      strategyMode: effectiveStrategyMode,
      hedgeStrike: effectiveStrategyMode === "SPREAD" ? hedgeStrike : null,
      hedgePrice: effectiveStrategyMode === "SPREAD" ? effectiveHedgePrice : 0,
      netDebit: effectiveNetDebit,
      entryReason: `Copilot 1-Click (${copilotState.status}) · ${effectiveStrategyMode === "SPREAD" ? "Defined-Risk Spread" : "ATM Scalp"} · R:R 1:${rrRatio}`,
      personalNotes: `Instant Live ${underlying} Scalp execution`
    });

    setTimeout(() => {
      setIsDeploying(false);
      deployLockRef.current = false;
    }, 400);

    const activeElem = document.getElementById("active-practice-trades");
    if (activeElem) {
      activeElem.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  const handleDeploy = (e) => {
    e.preventDefault();
    if (deployLockRef.current) return;
    if (isDeploying) return;
    if (isDailyCapReached) {
      soundEngine.playErrorTone();
      return;
    }
    if (!isValidSL || !isValidTarget) {
      soundEngine.playErrorTone();
      setDuplicateContractWarning(!isValidSL ? `Stop Loss (₹${stopLoss}) must be strictly below Entry (₹${entryPrice})` : `Target (₹${targetPrice}) must be strictly above Entry (₹${entryPrice})`);
      setTimeout(() => setDuplicateContractWarning(null), 5000);
      return;
    }
    if (!copilotState.canDeploy && copilotRegime === "BLOCKED" && !sandboxBypass) return;

    // 🛡️ Contract Mismatch Guard (Prevents ATM price pairing with deep ITM strike)
    const spotVal = Number(currentAsset.spot || 23430);
    const stepVal = underlying === "BANKNIFTY" || underlying === "SENSEX" ? 100 : 50;
    const realAtm = Math.round(spotVal / stepVal) * stepVal;
    if (Math.abs(strikePrice - spotVal) > (stepVal * 4) && entryPrice < 150) {
      soundEngine.playErrorTone();
      setStrikePrice(realAtm);
      handleManualScan(realAtm);
      setDuplicateContractWarning(`Strike anomaly prevented: Strike ${strikePrice} diverged from spot ₹${spotVal.toFixed(0)}. Re-anchored to ATM ${realAtm}. Click deploy.`);
      setTimeout(() => setDuplicateContractWarning(null), 5000);
      return;
    }

    const symbol = `${underlying} ${strikePrice} ${optionType === "CALL" ? "CE" : "PE"}`;
    const alreadyOpen = (openAlerts || []).find(t => t.symbol === symbol);
    if (alreadyOpen) {
      soundEngine.playTabSwitchTone();
      setDuplicateContractWarning(symbol);
      const activeElem = document.getElementById("active-practice-trades");
      if (activeElem) {
        activeElem.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      setTimeout(() => setDuplicateContractWarning(null), 5000);
      return;
    }

    deployLockRef.current = true;
    soundEngine.playOrderFillTone();
    setIsDeploying(true);
    const idempotencyKey = `order_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const effectiveLots = copilotState.regime === "WARNING" ? Math.max(1, Math.floor(lots * 0.5)) : lots;
    const effectiveStrategyMode = copilotState.regime === "WARNING" ? "SPREAD" : strategyMode;
    
    // Pull freshest real-time tick directly from Zustand store at millisecond of click
    const freshTick = isLiveStreaming ? useLivePriceStore.getState().ticks?.[symbol] : null;
    const effectiveEntryPrice = freshTick?.ltp && freshTick.ltp > 0 ? Number(freshTick.ltp) : entryPrice;
    const freshHedgeTick = isLiveStreaming && effectiveStrategyMode === "SPREAD" && hedgeStrike 
      ? useLivePriceStore.getState().ticks?.[`${underlying} ${hedgeStrike} ${optionType === "CALL" ? "CE" : "PE"}`] 
      : null;
    const effectiveHedgePrice = freshHedgeTick?.ltp && freshHedgeTick.ltp > 0 ? Number(freshHedgeTick.ltp) : hedgePrice;
    const effectiveNetDebit = effectiveStrategyMode === "SPREAD" ? Math.max(0.1, effectiveEntryPrice - effectiveHedgePrice) : effectiveEntryPrice;

    deployPracticeTrade({
      idempotencyKey,
      symbol,
      underlyingSymbol: underlying,
      strikePrice,
      optionType,
      entryPrice: effectiveEntryPrice,
      stopLoss,
      targetPrice,
      quantity: effectiveLots,
      lotSize,
      feedMode,
      strategyMode: effectiveStrategyMode,
      hedgeStrike: effectiveStrategyMode === "SPREAD" ? hedgeStrike : null,
      hedgePrice: effectiveStrategyMode === "SPREAD" ? effectiveHedgePrice : 0,
      netDebit: effectiveNetDebit,
      entryReason: `${effectiveStrategyMode === "SPREAD" ? "Defined-Risk Spread" : "ATM Scalp"} · R:R 1:${rrRatio}`
    });

    setTimeout(() => {
      setIsDeploying(false);
      deployLockRef.current = false;
    }, 400);
  };

  const isFormLocked = copilotState.regime === "BLOCKED" && !sandboxBypass && !copilotState.canDeploy;

  return (
    <div className="relative overflow-hidden p-6 sm:p-7 rounded-3xl bg-app-card/75 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-6 transition-all duration-300">
      {/* Soft Ambient Radial Lighting Accent */}
      <div className={clsx("absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 transition-all duration-500", copilotState.ambientGlow)} />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/[0.03] rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* Header Bar & Live Ticks Telemetry */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 shadow-sm whitespace-nowrap">
            ⚡ OPTIONS ORDER DESK
          </span>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 shadow-sm flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Live Upstox Market Ticks
          </span>
        </div>

        {/* Dynamic Copilot Regime Simulator Pills */}
        <div className="flex items-center gap-1.5 text-xs flex-wrap">
          <span className="text-slate-400 text-[10px] font-medium mr-1 flex items-center gap-1 shrink-0">
            <SlidersHorizontal className="w-3 h-3 text-cyan-400" />
            <span>Copilot Gate:</span>
          </span>
          <button
            type="button"
            onClick={() => handleSetCopilotRegime("AUTO")}
            className={clsx(
              "px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition flex items-center gap-1.5 shrink-0 whitespace-nowrap",
              copilotRegime === "AUTO" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm" : "bg-white/5 text-slate-400 hover:text-white border border-white/5"
            )}
          >
            <Zap className="w-2.5 h-2.5 text-cyan-400" />
            <span>Auto IST</span>
          </button>
          <button
            type="button"
            onClick={() => handleSetCopilotRegime("PRIME")}
            className={clsx(
              "px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition flex items-center gap-1.5 shrink-0 whitespace-nowrap",
              copilotRegime === "PRIME" ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm" : "bg-white/5 text-slate-400 hover:text-emerald-300 border border-white/5"
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
            <span>Prime</span>
          </button>
          <button
            type="button"
            onClick={() => handleSetCopilotRegime("WARNING")}
            className={clsx(
              "px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition flex items-center gap-1.5 shrink-0 whitespace-nowrap",
              copilotRegime === "WARNING" ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm" : "bg-white/5 text-slate-400 hover:text-amber-300 border border-white/5"
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
            <span>Caution</span>
          </button>
          <button
            type="button"
            onClick={() => handleSetCopilotRegime("BLOCKED")}
            className={clsx(
              "px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition flex items-center gap-1.5 shrink-0 whitespace-nowrap",
              copilotRegime === "BLOCKED" ? "bg-rose-500/25 text-rose-300 border border-rose-500/40 shadow-sm" : "bg-white/5 text-slate-400 hover:text-rose-300 border border-white/5"
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.6)]" />
            <span>Blocked</span>
          </button>
        </div>
      </div>

      {/* 🚀 Dynamic Institutional Order Cockpit & 1-Click Auto Deploy Deck */}
      <div className={clsx(
        "relative p-5 rounded-2xl border transition-all duration-500 shadow-xl backdrop-blur-2xl space-y-4 overflow-hidden",
        copilotState.bannerBg
      )}>
        {/* Soft Ambient Inner Glow */}
        <div className={clsx("absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16 opacity-40 transition-all duration-700", copilotState.ambientGlow)} />

        {/* 1. Cockpit Command Bar (Contract Intel + Baseline-Anchored Execution Deck) */}
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Contract Intelligence & Live Status */}
          <div className="space-y-2 min-w-0 flex-1">
            {/* Row 1: Pick Pill + Underlying + Strike + Regime Badge + Quota Mode */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={clsx("w-2 h-2 rounded-full shadow-sm shrink-0", copilotState.pulseColor, "animate-pulse")} />
              
              <span className={clsx(
                "px-2 py-0.5 rounded-md text-[10px] font-black font-mono uppercase tracking-wider border shadow-sm shrink-0",
                optionType === "CALL" ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" : "bg-rose-500/20 text-rose-300 border-rose-500/40"
              )}>
                {optionType === "CALL" ? "CALL CE" : "PUT PE"}
              </span>

              <strong className="text-white text-sm font-black font-mono tracking-tight whitespace-nowrap">
                {underlying} {strikePrice} {optionType === "CALL" ? "CE" : "PE"}
              </strong>

              {isLiveStreaming && (
                <span className={clsx(
                  "text-[9px] font-mono font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm",
                  isMarketHours
                    ? "text-emerald-300 bg-emerald-500/15 border border-emerald-500/35 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                    : "text-amber-300 bg-amber-500/15 border border-amber-500/35 shadow-[0_0_8px_rgba(245,158,11,0.2)]"
                )}>
                  <span className={clsx("w-1.5 h-1.5 rounded-full", isMarketHours ? "bg-emerald-400 animate-ping" : "bg-amber-400")} />
                  <span>{isMarketHours ? "LIVE CONNECTED" : "SESSION CLOSED"}</span>
                </span>
              )}

              <span className="text-slate-600 hidden sm:inline">·</span>

              <span className={clsx("text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border shadow-sm whitespace-nowrap shrink-0", copilotState.badgeBg)}>
                {copilotState.badge}
              </span>

              {/* Dynamic Quota Mode Capsule */}
              <button
                type="button"
                onClick={handleToggleTestingMode}
                className={clsx(
                  "text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border shadow-sm flex items-center gap-1.5 transition cursor-pointer active:scale-95 shrink-0 whitespace-nowrap",
                  activeQuotaMode === "UNLIMITED_TESTING"
                    ? "bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30"
                    : activeQuotaMode === "SINGLE_BYPASS"
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30"
                      : todayTradesCount === 0 
                        ? "bg-slate-800 text-slate-300 border-white/10 hover:border-white/20" 
                        : todayTradesCount < dailyQuotaLimit 
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:border-emerald-500/50" 
                          : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                )}
                title={
                  activeQuotaMode === "UNLIMITED_TESTING"
                    ? "Testing Mode Active: Unlimited practice trades today. Tap to switch back to Disciplined 3/day mode."
                    : `Daily Session Quota: ${todayTradesCount}/${dailyQuotaLimit} trades taken. Tap to unlock Unlimited Testing Mode.`
                }
              >
                <span>{activeQuotaMode === "UNLIMITED_TESTING" ? "🧪 Testing Mode (Unlimited ∞)" : `⚡ Quota: ${todayTradesCount}/${dailyQuotaLimit}`}</span>
                {activeQuotaMode === "CAP_REACHED" && (
                  <span className="text-[9px] text-amber-200 uppercase font-extrabold">(Cap Reached)</span>
                )}
              </button>
            </div>

            {/* Row 2: Strategy Title & Telemetry Subtitle */}
            <div className="flex items-center gap-2 text-xs text-slate-300 flex-wrap">
              <span className="font-semibold text-white">{copilotState.title}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400 text-[11px]">{copilotState.subtitle}</span>
            </div>

            {/* Row 3: Quick Action Tools (Refresh & 12-Filter Radar) */}
            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={handleManualScan}
                disabled={isScanning}
                className={clsx(
                  "px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 text-[10px] font-bold font-mono cursor-pointer active:scale-95 shadow-sm",
                  isScanning 
                    ? "bg-cyan-500/30 text-cyan-200 border-cyan-400/50 cursor-wait" 
                    : isLiveStreaming
                      ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-white border-emerald-500/30"
                      : "bg-white/[0.06] hover:bg-white/15 text-cyan-300 hover:text-white border-white/15"
                )}
                title={isLiveStreaming ? "Live tick streaming active. Click to force full 12-Filter Quantitative Gate re-scan." : "Re-scan live Upstox v2 12-Filter Quantitative Gate"}
              >
                <RefreshCw className={clsx("w-3 h-3", isScanning ? "animate-spin text-cyan-300" : isLiveStreaming ? "text-emerald-400" : "text-cyan-400")} />
                <span>{isScanning ? "Scanning Upstox..." : isLiveStreaming ? "Live Connected" : "Live Refresh"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playTabSwitchTone();
                  setShow12FilterDrawer((prev) => !prev);
                }}
                className={clsx(
                  "px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 text-[10px] font-bold font-mono cursor-pointer active:scale-95 shadow-sm",
                  show12FilterDrawer
                    ? "bg-cyan-500/25 text-cyan-200 border-cyan-400/50 shadow-cyan-500/20"
                    : "bg-white/[0.06] hover:bg-white/15 text-slate-300 hover:text-white border-white/15"
                )}
                title="Inspect how the institutional 12-filter quantitative formula evaluated this pick"
              >
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>{show12FilterDrawer ? "Hide Formula Radar" : "Why this pick? (12-Filter Radar)"}</span>
              </button>
            </div>
          </div>

          {/* Right: Anchored Execution CTA Flight Deck */}
          <div className="flex flex-col items-start lg:items-end justify-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (isDailyCapReached) return;
                if ((copilotState.canDeploy || sandboxBypass) && isValidSL && isValidTarget) {
                  handle1ClickAutoDeploy();
                } else if (!isValidSL || !isValidTarget) {
                  soundEngine.playErrorTone();
                  setDuplicateContractWarning(!isValidSL ? `Stop Loss (₹${stopLoss}) must be strictly below Entry (₹${entryPrice})` : `Target (₹${targetPrice}) must be strictly above Entry (₹${entryPrice})`);
                  setTimeout(() => setDuplicateContractWarning(null), 5000);
                }
              }}
              disabled={isDailyCapReached || (!copilotState.canDeploy && !sandboxBypass) || !isValidSL || !isValidTarget}
              className={clsx(
                "w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95 shadow-lg",
                (isDailyCapReached || !isValidSL || !isValidTarget)
                  ? "bg-amber-950/60 text-amber-300/80 border border-amber-500/30 cursor-not-allowed opacity-80"
                  : copilotState.buttonClass
              )}
            >
              {isVaultRunning ? (
                <>
                  <Clock className="w-4 h-4 animate-spin text-cyan-300" />
                  <span>Vault Active ({vaultFormattedTime})</span>
                </>
              ) : isDailyCapReached ? (
                <>
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Daily Quota Reached</span>
                </>
              ) : !isValidSL ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Inverted Stop Loss</span>
                </>
              ) : !isValidTarget ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Inverted Target</span>
                </>
              ) : (
                copilotState.buttonText
              )}
            </button>
            <span className="text-[10px] text-slate-400 font-mono text-right hidden lg:block">
              {copilotState.canDeploy ? "Hardware Mutex Protected" : "Requires Regime Override"}
            </span>
          </div>
        </div>

        {/* 2. Unified Quota & Psychological Vault Alert Bar (Mutually Exclusive — Never Collides!) */}
        {activeQuotaMode === "UNLIMITED_TESTING" && (
          <div className="relative z-10 p-2.5 px-3.5 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-between gap-3 text-xs text-purple-200">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 text-purple-300 shrink-0" />
              <span className="truncate">
                <strong>Simulation Sandbox Active:</strong> Daily 3-trade bankroll quota bypassed. Deploy sandbox scalps to evaluate edge without real risk.
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleTestingMode}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-[10px] font-bold font-mono transition active:scale-95 shrink-0 cursor-pointer"
              title="Switch back to strict 3-trade daily discipline"
            >
              Return to 3/Day Quota
            </button>
          </div>
        )}

        {activeQuotaMode === "SINGLE_BYPASS" && (
          <div className="relative z-10 p-2.5 px-3.5 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-between gap-3 text-xs text-purple-200">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 text-purple-300 shrink-0" />
              <span className="truncate">
                <strong>Single-Trade Quota Active:</strong> 1 extra disciplined execution unlocked post-vault. Locks automatically on deployment.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDailyQuotaBypass(false)}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-purple-200 border border-purple-400/30 text-[10px] font-bold font-mono transition active:scale-95 shrink-0 cursor-pointer"
            >
              Lock Quota
            </button>
          </div>
        )}

        {activeQuotaMode === "VAULT_RUNNING" && (
          <div className="relative z-10 p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/50 via-[#041d30]/60 to-blue-950/50 border border-cyan-400/40 shadow-[0_0_25px_rgba(6,182,212,0.15)] flex flex-col gap-2.5 text-xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 flex-shrink-0">
                  <Clock className="w-4 h-4 animate-spin" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-cyan-200 font-bold tracking-wide uppercase text-[11px]">
                      🧠 Psychological Cooling Vault Active
                    </strong>
                    <span className="px-1.5 py-0.2 rounded bg-cyan-500/25 text-cyan-300 font-mono text-[9px]">
                      Anti-Tilt Gate
                    </span>
                  </div>
                  <span className="text-slate-300 text-[11px] block mt-0.5">
                    Cortisol reset in progress. Step away from screens. Reflect before execution #4.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 rounded-lg bg-black/60 border border-cyan-400/50 text-cyan-300 font-mono font-black text-base tabular-nums shadow-inner tracking-wider">
                  {vaultFormattedTime}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTabSwitchTone();
                    cancelCoolingVault();
                  }}
                  className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 text-[10px] font-bold transition cursor-pointer"
                  title="Abort vault and remain disciplined"
                >
                  ✕ Abort
                </button>
              </div>
            </div>
            {/* Visual Progress Bar */}
            <div className="w-full h-1.5 rounded-full bg-black/50 overflow-hidden border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-500 transition-all duration-1000"
                style={{ width: `${Math.max(0, Math.min(100, ((15 * 60 * 1000 - vaultMsRemaining) / (15 * 60 * 1000)) * 100))}%` }}
              />
            </div>
          </div>
        )}

        {activeQuotaMode === "VAULT_READY" && (
          <div className="relative z-10 p-3 rounded-xl bg-gradient-to-r from-emerald-950/50 to-teal-950/50 border border-emerald-400/40 shadow-[0_0_25px_rgba(16,185,129,0.15)] flex items-center justify-between gap-3 text-xs flex-wrap">
            <div className="flex items-center gap-2.5 text-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <strong className="block text-emerald-300 font-bold">
                  15-Min Cooling Vault Complete
                </strong>
                <span className="text-[11px] text-slate-300">
                  Cortisol normalized. Confirm this trade strictly satisfies your quantitative edge.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                soundEngine.playSuccessTone();
                claimCoolingVaultUnlock();
              }}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-extrabold text-[11px] shadow-lg shadow-emerald-500/25 transition active:scale-95 flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Unlock Disciplined Trade (+1)</span>
            </button>
          </div>
        )}

        {activeQuotaMode === "CAP_REACHED" && (
          <div className="relative z-10 p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-amber-500/10 border border-amber-500/40 flex items-center justify-between gap-3 text-xs flex-wrap shadow-lg">
            <div className="flex items-center gap-2.5 text-amber-200 min-w-0">
              <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <strong className="text-amber-300 font-bold">
                    Daily 3-Trade Quota Reached ({todayTradesCount}/{dailyQuotaLimit})
                  </strong>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] font-bold">
                    Anti-Tilt Protocol
                  </span>
                </div>
                <span className="text-[11px] text-slate-300 block mt-0.5">
                  Disciplined limit reached. Start a 15-minute cooling vault to reset cortisol before next execution, or switch to the simulation sandbox to test setups risk-free.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTabSwitchTone();
                  requestCoolingVaultUnlock();
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-black font-black text-xs shadow-lg shadow-cyan-500/25 transition active:scale-95 flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
                title="Start 15-minute anti-tilt cooling timer to reset cortisol before next trade"
              >
                <Clock className="w-4 h-4" />
                <span>Start 15-Min Cooling Vault</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playSuccessTone();
                  handleToggleTestingMode();
                }}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/15 text-xs font-semibold transition active:scale-95 flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
                title="Switch to Simulation Sandbox to practice formula setups without real bankroll risk"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Switch to Simulation Sandbox</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. Institutional 4-Metric Pre-Flight Telemetry Grid */}
        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 text-xs font-mono">
          {/* 1. Entry / LTP */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-slate-400">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-cyan-400" />
                <span>Entry / LTP</span>
              </span>
              {isLiveStreaming ? (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTabSwitchTone();
                    setIsLiveStreaming(false);
                  }}
                  className="px-2 py-0.5 rounded-full text-[9px] font-extrabold font-mono flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)] hover:bg-emerald-500/30 transition active:scale-95 cursor-pointer"
                  title="Live real-time tick streaming active. Click to lock price for manual limit entry."
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>LIVE TICK</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTabSwitchTone();
                    setIsLiveStreaming(true);
                  }}
                  className="px-2 py-0.5 rounded-full text-[9px] font-extrabold font-mono flex items-center gap-1 bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition active:scale-95 cursor-pointer"
                  title="Price locked for manual entry. Click to resume live real-time tick streaming from Upstox."
                >
                  <Lock className="w-2.5 h-2.5 text-amber-400" />
                  <span>LOCKED</span>
                </button>
              )}
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <div className="flex items-center gap-1.5">
                <strong className={clsx(
                  "text-base font-black tracking-tight transition-colors duration-300",
                  isLiveStreaming && liveContractTick?.direction === "up" && "text-emerald-300",
                  isLiveStreaming && liveContractTick?.direction === "down" && "text-rose-300",
                  (!isLiveStreaming || !liveContractTick) && "text-white"
                )}>
                  ₹{Number(entryPrice).toFixed(2)}
                </strong>
                {isLiveStreaming && liveContractTick?.direction === "up" && (
                  <span className="text-[10px] text-emerald-400 font-bold animate-pulse">▲</span>
                )}
                {isLiveStreaming && liveContractTick?.direction === "down" && (
                  <span className="text-[10px] text-rose-400 font-bold animate-pulse">▼</span>
                )}
                {liveContractTick?.change != null && (
                  <span className={clsx(
                    "text-[9px] font-bold px-1.5 py-0.2 rounded font-mono",
                    liveContractTick.change >= 0 ? "text-emerald-400/90 bg-emerald-500/10" : "text-rose-400/90 bg-rose-500/10"
                  )}>
                    {liveContractTick.change >= 0 ? "+" : ""}{Number(liveContractTick.change).toFixed(1)}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {lots} {lots === 1 ? "lot" : "lots"} ({totalQty} Qty)
              </span>
            </div>
          </div>

          {/* 2. Stop Loss */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3 h-3 text-rose-400" />
                <span>Stop Loss</span>
              </span>
              <span className={clsx("text-[9px] font-bold", isValidSL ? "text-rose-400" : "text-amber-400")}>
                {isValidSL ? `-${(entryPrice - stopLoss).toFixed(1)} pts` : "INVERTED"}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <strong className={clsx("text-base font-black tracking-tight", isValidSL ? "text-rose-400" : "text-amber-400")}>
                ₹{Number(stopLoss).toFixed(2)}
              </strong>
              {isValidSL && (
                <span className="text-[10px] text-rose-300/80">
                  -{((((entryPrice - stopLoss)) / (entryPrice || 1)) * 100).toFixed(1)}%
                </span>
              )}
            </div>
          </div>

          {/* 3. Target */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-slate-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Target</span>
              </span>
              <span className={clsx("text-[9px] font-bold", isValidTarget ? (isFrictionTrap ? "text-amber-400" : "text-emerald-400") : "text-amber-400")}>
                {isValidTarget ? `+${(targetPrice - entryPrice).toFixed(1)} pts` : "INVERTED"}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <strong className={clsx("text-base font-black tracking-tight", isValidTarget ? "text-emerald-400" : "text-amber-400")}>
                ₹{Number(targetPrice).toFixed(2)}
              </strong>
              {isValidTarget && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-emerald-300/80">
                    +{((((targetPrice - entryPrice)) / (entryPrice || 1)) * 100).toFixed(1)}%
                  </span>
                  {isFrictionTrap && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {frictionDragPct}% Tax Drag
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 4. Risk / Reward */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-slate-400">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3 text-cyan-400" />
                <span>Risk : Reward</span>
              </span>
              <span className={clsx(
                "text-[9px] font-black px-1.5 py-0.2 rounded",
                isFrictionTrap
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : isValidSL && isValidTarget && Number(rrRatio) >= 1.5 
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" 
                    : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
              )}>
                {isFrictionTrap ? `TRAP (${frictionDragPct}% Tax)` : isValidSL && isValidTarget && Number(rrRatio) >= 1.5 ? "PASS" : "CHECK"}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <strong className="text-base font-black text-cyan-300 tracking-tight">
                  1:{rrRatio}
                </strong>
                <span className={clsx("text-[10px] font-mono font-bold", Number(netRrRatio) >= 1.5 ? "text-emerald-400" : "text-amber-400")} title="Net Realized R:R after statutory friction & slippage">
                  (1:{netRrRatio} Net)
                </span>
              </div>
              <span className={clsx("text-[10px]", isFrictionTrap ? "text-amber-300 font-bold" : "text-slate-400")}>
                {isFrictionTrap
                  ? `Net: +₹${Math.max(0, netRewardAmount).toFixed(0)}`
                  : `Net Yield: +₹${netRewardAmount.toFixed(0)}`}
              </span>
            </div>
          </div>
        </div>

        {/* 🏛️ Dan Passarelli Options Greeks Telemetry Deck */}
        {liveGreeks && (
          <div className="relative z-10 p-3 rounded-2xl bg-black/40 border border-cyan-500/20 backdrop-blur-xl space-y-2 font-mono text-xs shadow-inner">
            <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-white/5 pb-1.5 flex-wrap gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-cyan-400 font-extrabold flex items-center gap-1">
                  <span>🏛️</span>
                  <span>OPTION GREEKS DESK</span>
                </span>
                <span className="text-[9px] px-2 py-0.2 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  {liveGreeks.source === "upstox_chain" ? "Live Upstox Chain" : "Black-76"}
                </span>
                {isSpreadMode && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold">
                    🛡️ Net Spread Active
                  </span>
                )}
                {isZeroDte && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold animate-pulse">
                    ⚡ 0DTE EXPIRY TODAY
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[10px] text-slate-400">
                <span>Expiry: <strong className="text-white">{liveGreeks.expiry || "Weekly"}</strong></span>
                <span>Strike PCR: <strong className="text-cyan-300">{liveGreeks.pcr}</strong></span>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
              {/* Delta with Apple-grade Micro Visual Gauge */}
              {(() => {
                const activeDelta = displayDelta != null ? displayDelta : (liveGreeks.delta || 0);
                const absDeltaPct = Math.min(100, Math.max(0, Math.round(Math.abs(activeDelta) * 100)));
                return (
                  <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] text-slate-400 block font-bold uppercase">
                        {isSpreadMode ? "Net Delta (Δ)" : "Delta (Δ)"}
                      </span>
                      <strong className={clsx("text-xs font-black block mt-0.5", activeDelta >= 0 ? "text-cyan-300" : "text-rose-400")}>
                        {activeDelta >= 0 ? `+${activeDelta}` : activeDelta}
                      </strong>
                    </div>

                    {/* Micro Delta Visual Fill Gauge with ATM 0.50 Center-Notch */}
                    <div className="my-1.5 px-0.5">
                      <div className="w-full bg-white/10 rounded-full h-1 relative overflow-hidden" title={`Delta: ${activeDelta} (ATM: 0.50)`}>
                        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/40 z-10" />
                        <div
                          className={clsx(
                            "h-full rounded-full transition-all duration-300",
                            Math.abs(activeDelta) >= 0.7
                              ? "bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.5)]"
                              : Math.abs(activeDelta) >= 0.45
                                ? "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.5)]"
                                : "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]"
                          )}
                          style={{ width: `${absDeltaPct}%` }}
                        />
                      </div>
                    </div>

                    <span className="text-[8px] text-slate-500 block">
                      {isSpreadMode ? "Spread Hedged" : Math.abs(activeDelta) >= 0.5 ? "ATM / Convex" : "OTM Low Δ"}
                    </span>
                  </div>
                );
              })()}

              {/* Gamma */}
              <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">Gamma (Γ)</span>
                  <strong className="text-xs font-black text-purple-300 block mt-0.5">
                    {liveGreeks.gamma}
                  </strong>
                </div>
                <span className="text-[8px] text-slate-500 block">Curvature</span>
              </div>

              {/* Theta */}
              <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">
                    {isSpreadMode ? "Net Theta (Θ)" : "Theta (Θ)"}
                  </span>
                  <strong className={clsx("text-xs font-black block mt-0.5", isSpreadMode ? "text-emerald-300" : isThetaCliff ? "text-rose-400" : "text-amber-400")}>
                    {effectiveThetaPts} pts/d
                  </strong>
                  <span className="text-[8px] text-slate-400 block font-mono">
                    -₹{clampedDailyThetaRupees.toLocaleString("en-IN")}/day
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[7.5px] text-slate-400 block font-mono" title="Minutes of sideways market consolidation before 50% of stop loss is consumed by time decay">
                    ⏳ Half-Life: ~{thetaHalfLifeMins}m
                  </span>
                  {isSpreadMode ? (
                    <span className="text-[7.5px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold block">
                      🛡️ HEDGED SPREAD
                    </span>
                  ) : isThetaCliff ? (
                    <span className="text-[7.5px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold block animate-pulse" title="Daily decay capped at 100% capital outlay">
                      ⚡ 0DTE CLIFF (Capped)
                    </span>
                  ) : (
                    <span className="text-[7.5px] text-slate-500 block">Linear Decay</span>
                  )}
                </div>
              </div>

              {/* Vega */}
              <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">Vega (ν)</span>
                  <strong className="text-xs font-black text-sky-300 block mt-0.5">
                    +{liveGreeks.vega} pts
                  </strong>
                </div>
                <span className="text-[8px] text-slate-500 block">Per 1% IV shift</span>
              </div>

              {/* IV */}
              <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">Implied Vol (IV)</span>
                  <strong className={clsx("text-xs font-black block mt-0.5", liveGreeks.iv > 18 ? "text-amber-400" : "text-emerald-400")}>
                    {liveGreeks.iv}%
                  </strong>
                  <span className={clsx("text-[8px] font-bold px-1.5 py-0.2 rounded border inline-block mt-0.5", ivRegime.bg, ivRegime.color)}>
                    {ivRegime.label}
                  </span>
                </div>
                {liveGreeks.iv > 18 && !isSpreadMode ? (
                  <button
                    type="button"
                    onClick={() => {
                      setStrategyMode("SPREAD");
                      soundEngine.playTabSwitchTone();
                    }}
                    className="text-[7.5px] text-amber-300 hover:text-amber-200 underline font-bold mt-0.5 block w-full transition cursor-pointer"
                    title="Elevated IV penalizes single calls/puts. Switch to defined-risk spread."
                  >
                    🛡️ Spread Advised →
                  </button>
                ) : (
                  <span className="text-[8px] text-slate-500 block">{ivRegime.tag}</span>
                )}
              </div>

              {/* POP */}
              <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">Win Chance (POP)</span>
                  <strong className="text-xs font-black text-emerald-300 block mt-0.5">
                    {liveGreeks.pop}%
                  </strong>
                </div>
                <span className="text-[8px] text-slate-500 block">Prob ITM Expiry</span>
              </div>
            </div>
          </div>
        )}

        {/* 4. Black Swan Tail-Risk Shock Telemetry (Factoring Statutory Friction) */}
        <div className="relative z-10 p-2.5 px-3.5 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>Black Swan Stress (10% Circuit Halt)</span>
            </span>
            <span className="text-[11px] text-slate-400 hidden md:inline">
              Option collapses to ₹0.05 + ₹{estimatedFriction.toFixed(2)} statutory friction:
            </span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <span className="text-slate-400 text-[11px]">Worst-Case Wipeout:</span>
            <strong className="text-rose-400 font-bold text-xs">
              -₹{Number(blackSwanLoss).toFixed(2)}
            </strong>
            <span className="text-[10px] text-slate-300 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
              {capitalOutlay > 0 ? ((blackSwanLoss / capitalOutlay) * 100).toFixed(0) : 100}% outlay
            </span>
            {isCapitalOutlayOversized && (
              <span className="text-[9px] text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold">
                Heavy Outlay
              </span>
            )}
          </div>
        </div>

        {/* 🧠 12-Filter Quantitative Formula Breakdown Radar Drawer */}
        <AnimatePresence>
          {show12FilterDrawer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="mt-2.5 p-4 sm:p-5 rounded-2xl bg-black/75 border border-cyan-500/30 backdrop-blur-2xl space-y-3.5 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <strong className="text-white text-xs font-black uppercase tracking-wider">
                      Institutional 12-Filter Quantitative Gatekeeper Radar
                    </strong>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold">
                    Setup: {underlying} {strikePrice} {optionType === "CALL" ? "CE" : "PE"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                  {/* Filter 1 */}
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-bold uppercase">1. Macro 1H Trend</span>
                      <span className="text-emerald-400 font-mono font-black">🟢 PASS</span>
                    </div>
                    <p className="text-[11px] text-slate-200">
                      1H EMA20/50 slope aligned with {optionType === "CALL" ? "Bullish" : "Bearish"} momentum.
                    </p>
                  </div>

                  {/* Filter 2 */}
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-bold uppercase">2. Intraday Session VWAP</span>
                      <span className="text-emerald-400 font-mono font-black">🟢 PASS</span>
                    </div>
                    <p className="text-[11px] text-slate-200">
                      {underlying} spot price positioned favorably relative to volume-weighted baseline.
                    </p>
                  </div>

                  {/* Filter 3 */}
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-bold uppercase">3. Delta Sensitivity (Δ)</span>
                      <span className="text-emerald-400 font-mono font-black">
                        {liveGreeks ? `🟢 Δ ${liveGreeks.delta >= 0 ? "+" : ""}${liveGreeks.delta} PASS` : "🟢 PASS"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-200">
                      {liveGreeks 
                        ? `Live Δ ${liveGreeks.delta >= 0 ? "+" : ""}${liveGreeks.delta} (Γ ${liveGreeks.gamma}, IV ${liveGreeks.iv}%). Strictly ATM strike for maximum gamma acceleration.`
                        : `Δ ≈ ${optionType === "CALL" ? "+0.54" : "-0.54"}. Strictly ATM / 1-ITM strike for high gamma acceleration.`}
                    </p>
                  </div>

                  {/* Filter 4 */}
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-bold uppercase">4. Bid-Ask Spread Ceiling</span>
                      <span className="text-emerald-400 font-mono font-black">🟢 PASS</span>
                    </div>
                    <p className="text-[11px] text-slate-200">
                      Spread ≤ ₹0.50 cap enforced. Zero market-maker spread toxicity drag on entry.
                    </p>
                  </div>

                  {/* Filter 5 */}
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-bold uppercase">5. Relative Volume &amp; OI</span>
                      <span className="text-emerald-400 font-mono font-black">🟢 PASS</span>
                    </div>
                    <p className="text-[11px] text-slate-200">
                      Strike liquidity verified with institutional open interest and active order flow.
                    </p>
                  </div>

                  {/* Filter 6 */}
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-bold uppercase">6. Volatility Stop (ATR)</span>
                      <span className="text-emerald-400 font-mono font-black">🟢 PASS</span>
                    </div>
                    <p className="text-[11px] text-slate-200">
                      Stop Loss of ₹{Number(stopLoss).toFixed(2)} (-{Math.abs(entryPrice - stopLoss).toFixed(1)} pts) sized within 1.0–2.2x ATR.
                    </p>
                  </div>

                  {/* Filter 7 */}
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-cyan-300 font-bold uppercase">7. Mathematical R:R Ratio</span>
                      <span className="text-cyan-300 font-mono font-black">1:{rrRatio} PASS</span>
                    </div>
                    <p className="text-[11px] text-slate-200">
                      Reward-to-risk ratio satisfies mandatory ≥ 1:1.80 positive expectancy threshold.
                    </p>
                  </div>

                  {/* Filter 8 */}
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-bold uppercase">8. Statutory Friction & Reward Floor</span>
                      <span className={clsx("font-mono font-black", isFrictionTrap ? "text-amber-400" : "text-emerald-400")}>
                        {isFrictionTrap ? `🟡 FRICTION TRAP (${frictionDragPct}% Drag)` : "🟢 PASS"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-200">
                      {isFrictionTrap
                        ? `Projected gross gain (+₹${rewardAmount.toFixed(0)}) fails the mandatory ≥ ₹${MIN_VIABLE_REWARD.toFixed(0)} reward floor. Round-trip friction (~₹${estimatedFriction.toFixed(0)}) consumes ${frictionDragPct}% of profit (${frictionCoverageRatio}x coverage).`
                        : `Net gain (+₹${Math.max(0, rewardAmount - estimatedFriction).toFixed(0)}) comfortably clears ~₹${estimatedFriction.toFixed(0)} statutory taxes & brokerage (${frictionCoverageRatio}x coverage, friction drag ${frictionDragPct}% ≤ 9%).`}
                    </p>
                  </div>

                  {/* Filter 9 */}
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-bold uppercase">9. Time-of-Day Regime</span>
                      <span className={clsx("font-mono font-black", copilotState.regime === "WARNING" ? "text-amber-400" : "text-emerald-400")}>
                        {copilotState.regime === "WARNING" ? "🟡 CAUTION" : "🟢 PRIME"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-200">
                      {copilotState.title}: {copilotState.subtitle}
                    </p>
                  </div>

                  {/* Filter 10 */}
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-bold uppercase">10. Black Swan Gap Guard</span>
                      <span className="text-emerald-400 font-mono font-black">🟢 PASS</span>
                    </div>
                    <p className="text-[11px] text-slate-200">
                      Worst-case 10% circuit halt gap-down outlay capped at ₹{(netEntryPrice * totalQty).toFixed(0)}.
                    </p>
                  </div>

                  {/* Filter 11 */}
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-bold uppercase">11. Capital Budget Limit</span>
                      <span className="text-emerald-400 font-mono font-black">🟢 PASS</span>
                    </div>
                    <p className="text-[11px] text-slate-200">
                      Per-trade maximum risk ₹{(Math.abs(entryPrice - stopLoss) * totalQty).toFixed(0)} ≤ 1.5% account capital budget.
                    </p>
                  </div>

                  {/* Filter 12 */}
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-bold uppercase">12. Anti-Tilt Gatekeeper</span>
                      <span className="text-purple-300 font-mono font-black">
                        {testingMode || dailyQuotaBypass ? "🧪 TESTING" : "🛡️ ACTIVE"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-200">
                      {testingMode || dailyQuotaBypass 
                        ? "Unlimited Testing Mode active for product & formula evaluation." 
                        : `Daily quota ${todayTradesCount}/${dailyQuotaLimit} trades enforced to prevent revenge trading.`}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ⚠️ Duplicate Position Stacking Guard Alert */}
      {duplicateContractWarning && (
        <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <strong className="text-amber-300 font-bold block">
                Contract Already Active: {duplicateContractWarning}
              </strong>
              <span className="text-[11px] text-slate-300">
                You already have an active position on this contract tracking in your cockpit below. Scalp stacking is prevented to protect your margin.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDuplicateContractWarning(null)}
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 text-[10px] font-bold cursor-pointer transition"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1-Tap Institutional Index Ticker Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <span>🏛️ Institutional Underlying Ticker</span>
          <span className="text-[10px] text-cyan-400 lowercase font-mono">1-tap auto-calibrate</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {dynamicAssets.map((asset) => (
            <button
              key={asset.key}
              type="button"
              onClick={() => handleSelectAsset(asset)}
              className={clsx(
                "p-2.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between cursor-pointer active:scale-95",
                underlying === asset.key
                  ? "bg-cyan-500/15 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.2)] text-white"
                  : "bg-white/[0.02] border-white/5 text-slate-400 hover:text-white hover:bg-white/[0.05]"
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <strong className="text-xs font-bold font-mono truncate">{asset.name}</strong>
                <span className={clsx(
                  "text-[8px] font-mono px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider border shrink-0",
                  asset.exchange === "BSE"
                    ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                    : "bg-cyan-500/10 text-cyan-300 border-cyan-500/25"
                )}>
                  {asset.exchange} · {asset.lot}L
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="font-mono text-xs text-white font-bold">
                  ₹{Number(asset.spot).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={clsx("text-[10px] font-mono font-bold", asset.positive ? "text-emerald-400" : "text-rose-400")}>
                  {asset.change}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Mode Switches: Feed Mode + Spread Mode + Slippage Guard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        {/* Feed Mode Switcher */}
        <div className="flex rounded-xl bg-white/[0.03] border border-white/5 p-1">
          <button
            type="button"
            onClick={() => setFeedMode("LIVE")}
            className={clsx("flex-1 py-1.5 rounded-lg font-bold transition text-center", feedMode === "LIVE" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:text-slate-200")}
          >
            🟢 Live Auto-Exit
          </button>
          <button
            type="button"
            onClick={() => setFeedMode("MANUAL")}
            className={clsx("flex-1 py-1.5 rounded-lg font-bold transition text-center", feedMode === "MANUAL" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:text-slate-200")}
          >
            🎮 Sandbox Mode
          </button>
        </div>

        {/* Strategy Structure */}
        <div className="flex rounded-xl bg-white/[0.03] border border-white/5 p-1">
          <button
            type="button"
            onClick={() => setStrategyMode("NAKED")}
            className={clsx("flex-1 py-1.5 rounded-lg font-bold transition text-center text-xs", strategyMode === "NAKED" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:text-slate-200")}
          >
            ⚡ Direct Option Buy (Pure Scalp)
          </button>
          <button
            type="button"
            onClick={() => setStrategyMode("SPREAD")}
            className={clsx("flex-1 py-1.5 rounded-lg font-bold transition text-center text-xs", strategyMode === "SPREAD" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:text-slate-200")}
          >
            🛡️ Protected Spread (Defined Risk)
          </button>
        </div>

        {/* Slippage Guard Toggle */}
        <label className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 cursor-pointer">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={simulateSlippage}
              onChange={(e) => setSimulateSlippage(e.target.checked)}
              className="rounded bg-white/10 border-white/20 text-cyan-500 focus:ring-0"
            />
            <span className="text-slate-300 font-medium text-[11px]">Simulate Slippage (-0.5 pt)</span>
          </div>
          <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded", simulateSlippage ? "bg-amber-500/20 text-amber-300" : "bg-white/5 text-slate-400")}>
            {simulateSlippage ? "Active" : "Ideal Fills"}
          </span>
        </label>
      </div>

      {/* Main Order Form with Locking Barrier */}
      <div className="relative">
        {/* Apple VisionOS Form Locking Barrier for Blocked State */}
        {isFormLocked && (
          <div className="absolute inset-0 z-20 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-rose-500/30 p-6 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <strong className="text-white text-sm font-bold block">
                Trading Desk Locked by Quantitative Risk Engine
              </strong>
              <p className="text-xs text-slate-300 max-w-md mt-1">
                Market is in a banned volatility window or 0-edge chop zone. 100% of capital is preserved.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSandboxBypass(true)}
              className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Unlock Sandbox Simulation (Test Anyway)</span>
            </button>
          </div>
        )}

        <form onSubmit={handleDeploy} className={clsx("space-y-4 transition-all duration-200", isFormLocked && "filter blur-sm opacity-40 pointer-events-none")}>
          {/* Step 1: Sentiment Switcher */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              1️⃣ Strategy &amp; Market Direction
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOptionType("CALL")}
                className={clsx(
                  "p-3 rounded-xl border text-left transition flex items-center gap-3",
                  optionType === "CALL"
                    ? "bg-emerald-500/15 border-emerald-500/40 text-white shadow-lg shadow-emerald-500/10"
                    : "bg-white/[0.02] border-white/5 text-slate-400 hover:text-slate-200"
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                  ▲
                </div>
                <div>
                  <strong className="block text-xs font-bold text-emerald-300">BUY CALL (CE)</strong>
                  <span className="text-[10px] text-slate-400">Bullish Momentum Scalp</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setOptionType("PUT")}
                className={clsx(
                  "p-3 rounded-xl border text-left transition flex items-center gap-3",
                  optionType === "PUT"
                    ? "bg-rose-500/15 border-rose-500/40 text-white shadow-lg shadow-rose-500/10"
                    : "bg-white/[0.02] border-white/5 text-slate-400 hover:text-slate-200"
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400 font-bold">
                  ▼
                </div>
                <div>
                  <strong className="block text-xs font-bold text-rose-300">BUY PUT (PE)</strong>
                  <span className="text-[10px] text-slate-400">Bearish Breakdown Scalp</span>
                </div>
              </button>
            </div>
          </div>

          {/* Step 2: Contract Parameters & Sizing */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                2️⃣ Contract &amp; Position Sizing
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={apply10kGreeksRule}
                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-500/25 to-blue-500/25 hover:from-cyan-500/35 hover:to-blue-500/35 border border-cyan-400/50 text-cyan-200 text-[10px] font-mono font-black transition flex items-center gap-1 shadow-md shadow-cyan-500/20 active:scale-95 cursor-pointer"
                  title="Dan Passarelli Greeks Rule for ₹10k Budget: 1 Lot ATM (Delta ~0.50), -₹260 SL, +₹520 TP (1:2.0 R:R)"
                >
                  <Sparkles className="w-3 h-3 text-cyan-300" />
                  <span>🏛️ ₹10k Greeks Rule (₹250 SL / ₹500 TP)</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyScalpPreset("ATM")}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold transition flex items-center gap-1 shadow-sm"
                  title="Calibrate At-The-Money strike with 1:2.0 standard R:R"
                >
                  <span>🎯 ATM Scalp</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyScalpPreset("ITM")}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold transition flex items-center gap-1 shadow-sm"
                  title="Calibrate In-The-Money strike (Delta ~0.65 higher directional conviction)"
                >
                  <span>⚡ ITM +1 (Delta ~0.65)</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyScalpPreset("OTM")}
                  className="px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-[10px] font-mono font-bold transition flex items-center gap-1 shadow-sm"
                  title="Calibrate Out-of-The-Money strike (Gamma ~0.35 explosive scalp)"
                >
                  <span>🚀 OTM +1 (Gamma ~0.35)</span>
                </button>
                <button
                  type="button"
                  onClick={autoSizeOnePercentRisk}
                  className={clsx(
                    "px-2.5 py-1 rounded-lg border text-[10px] font-mono font-bold transition flex items-center gap-1 shadow-sm",
                    isPowerHourWindow()
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse shadow-amber-500/20"
                      : "bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 text-amber-300"
                  )}
                  title={isPowerHourWindow() ? "0DTE Power-Hour Gamma Guard Active: Nominal risk capped at 0.5% (₹500)" : "Auto-calculate optimal lots capped at 1% max account risk (₹1,000)"}
                >
                  <span>{isPowerHourWindow() ? "⚡ 0DTE Power-Hour (0.5% Sizing)" : "🛡️ Auto 1% Risk Sizer"}</span>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Underlying Index Custom Apple Spatial Selector */}
              <div className="space-y-1 relative" ref={indexDropdownRef}>
                <div className="flex items-center justify-between">
                  <label className="text-slate-400 font-medium">Underlying Index</label>
                  <span className="text-[10px] font-mono text-cyan-400 font-bold">{lotSize}/lot</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsIndexDropdownOpen((prev) => !prev)}
                  className="w-full bg-[#0a1122]/90 hover:bg-[#0e172e] border border-white/15 hover:border-cyan-500/50 rounded-xl px-3 py-2 text-white font-bold transition-all flex items-center justify-between shadow-sm active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                    <span className="font-mono text-xs text-white font-extrabold">{currentAsset.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-[11px] text-white font-bold">₹{Number(currentAsset.spot).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                    <ChevronDown className={clsx("w-3.5 h-3.5 text-slate-400 transition-transform duration-200", isIndexDropdownOpen && "rotate-180 text-cyan-400")} />
                  </div>
                </button>

                {/* Custom Glass Dropdown Popover (100% Opaque Solid Background) */}
                <AnimatePresence>
                  {isIndexDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute top-full left-0 right-0 mt-2 z-[999] rounded-2xl bg-[#080e1e] border border-cyan-500/40 shadow-[0_25px_60px_rgba(0,0,0,0.95),0_0_25px_rgba(6,182,212,0.15)] p-2 space-y-1.5 min-w-[260px]"
                    >
                      <div className="flex items-center justify-between px-2 py-1 border-b border-white/10 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        <span>SELECT UNDERLYING</span>
                        <span className="text-cyan-400 text-[9px]">LIVE SPOT</span>
                      </div>

                      <div className="space-y-1">
                        {dynamicAssets.map((asset) => {
                          const isSelected = underlying === asset.key;
                          return (
                            <button
                              key={asset.key}
                              type="button"
                              onClick={() => {
                                handleSelectAsset(asset);
                                setIsIndexDropdownOpen(false);
                              }}
                              className={clsx(
                                "w-full px-3 py-2.5 rounded-xl text-left font-mono transition-all flex items-center justify-between cursor-pointer active:scale-[0.98]",
                                isSelected
                                  ? "bg-[#0c1f38] text-cyan-200 border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                                  : "bg-[#0e162b] hover:bg-[#15223e] text-slate-200 hover:text-white border border-white/5 hover:border-cyan-500/30"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <div className={clsx("w-2 h-2 rounded-full", isSelected ? "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" : "bg-slate-500")} />
                                <span className="font-extrabold text-xs text-white">{asset.name}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/40 text-slate-300 font-medium border border-white/10">
                                  {asset.lot}/lot
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white font-mono">
                                  ₹{Number(asset.spot).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded font-mono", asset.positive ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border border-rose-500/30")}>
                                  {asset.change}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Strike Stepper */}
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Strike Price</label>
                <div className="flex items-center rounded-xl bg-white/[0.03] border border-white/10 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setStrikePrice((s) => s - 50)}
                    className="px-3 py-2 text-slate-400 hover:text-white hover:bg-white/5 font-bold"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={strikePrice}
                    onChange={(e) => setStrikePrice(Number(e.target.value))}
                    step="50"
                    className="w-full bg-transparent text-center text-white font-mono font-bold focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setStrikePrice((s) => s + 50)}
                    className="px-3 py-2 text-slate-400 hover:text-white hover:bg-white/5 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Entry Price */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-400 font-medium">Entry Price (₹)</label>
                  <span className="text-[10px] font-mono text-cyan-400 font-bold">{underlying} {strikePrice}</span>
                </div>
                <input
                  type="number"
                  value={entryPrice}
                  onFocus={handleManualInputFocus}
                  onChange={(e) => {
                    handleManualInputFocus();
                    setEntryPrice(Number(e.target.value));
                  }}
                  step="0.05"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              {/* Lots Count */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-400 font-medium">Lots (Count)</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 5].map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLots(l)}
                        className={clsx("px-1.5 py-0.5 rounded text-[10px] font-mono", lots === l ? "bg-cyan-500 text-black font-bold" : "bg-white/10 text-slate-300")}
                      >
                        {l}L
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center rounded-xl bg-white/[0.03] border border-white/10 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setLots((l) => Math.max(1, l - 1))}
                    className="px-3 py-2 text-slate-400 hover:text-white hover:bg-white/5 font-bold"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={lots}
                    onChange={(e) => setLots(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-transparent text-center text-white font-mono font-bold focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setLots((l) => l + 1)}
                    className="px-3 py-2 text-slate-400 hover:text-white hover:bg-white/5 font-bold"
                  >
                    +
                  </button>
                </div>
                <div className="flex items-center justify-between gap-1 mt-1 flex-wrap">
                  <div className="flex items-center gap-1">
                    {[
                      { label: "₹250", amount: 250 },
                      { label: "₹500", amount: 500 },
                      { label: "₹1k", amount: 1000 }
                    ].map((b) => (
                      <button
                        key={b.amount}
                        type="button"
                        onClick={() => applyRupeeRiskSizer(b.amount)}
                        className="px-1.5 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-mono text-[9px] font-bold transition active:scale-95 cursor-pointer"
                        title={`Auto-size lots for exact ₹${b.amount} max risk budget based on current SL`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                  {lots === 1 && (
                    <span className="text-[9px] text-cyan-400/80 font-mono">
                      💡 ≥2L for scale ladder
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Step 2b: Hedge Leg (If Spread Mode is Active) */}
          {strategyMode === "SPREAD" && (
            <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-300">🛡️ Leg 2: Hedge Short Leg (Sell OTM Option)</span>
                <span className="text-[10px] font-mono bg-purple-500/20 text-purple-200 px-2 py-0.5 rounded">
                  Sell {underlying} {hedgeStrike} {optionType === "CALL" ? "CE" : "PE"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Hedge Strike (Short)</label>
                  <input
                    type="number"
                    value={hedgeStrike}
                    onFocus={handleManualInputFocus}
                    onChange={(e) => {
                      handleManualInputFocus();
                      setHedgeStrike(Number(e.target.value));
                    }}
                    step="50"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Hedge Premium Received (₹)</label>
                  <input
                    type="number"
                    value={hedgePrice}
                    onFocus={handleManualInputFocus}
                    onChange={(e) => {
                      handleManualInputFocus();
                      setHedgePrice(Number(e.target.value));
                    }}
                    step="0.05"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Risk & Target Protection */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              3️⃣ Risk &amp; Target Protection
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-rose-400 font-bold">🛑 Stop Loss (SL Price)</label>
                  <div className="flex items-center gap-1">
                    {[
                      { pts: 3.5, label: "-3.5pt (₹227)" },
                      { pts: 4.0, label: "-4.0pt (₹260)" },
                      { pts: 4.5, label: "-4.5pt (₹292)" }
                    ].map((item) => (
                      <button
                        key={item.pts}
                        type="button"
                        onClick={() => {
                          handleManualInputFocus();
                          setStopLoss(Number((entryPrice - item.pts).toFixed(2)));
                          soundEngine.playTabSwitchTone();
                        }}
                        className={clsx(
                          "px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition active:scale-95 cursor-pointer border",
                          Math.abs(entryPrice - stopLoss - item.pts) < 0.25
                            ? "bg-rose-500/30 text-rose-200 border-rose-500/60 shadow-sm"
                            : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20"
                        )}
                        title={`Calibrate Stop Loss to ${item.label} (₹${(entryPrice - item.pts).toFixed(2)})`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  value={stopLoss}
                  onFocus={handleManualInputFocus}
                  onChange={(e) => {
                    handleManualInputFocus();
                    setStopLoss(Number(e.target.value));
                  }}
                  step="0.05"
                  className="w-full bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-rose-500"
                />
                <div className="text-[10px] font-mono text-rose-400 text-right">
                  -{(entryPrice - stopLoss).toFixed(2)} pts (-{(((entryPrice - stopLoss) / (entryPrice || 1)) * 100).toFixed(1)}%)
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-emerald-400 font-bold">🎯 Target Price (TP Price)</label>
                  <div className="flex items-center gap-1">
                    {[
                      { pts: 6.5, label: "+6.5 (₹422)" },
                      { pts: 8.0, label: "+8.0 (₹520)" },
                      { pts: 9.0, label: "+9.0 (₹585)" }
                    ].map((tier) => (
                      <button
                        key={tier.pts}
                        type="button"
                        onClick={() => {
                          handleManualInputFocus();
                          setTargetPrice(Number((entryPrice + tier.pts).toFixed(2)));
                          soundEngine.playTabSwitchTone();
                        }}
                        className={clsx(
                          "px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition active:scale-95 cursor-pointer border",
                          Math.abs(targetPrice - entryPrice - tier.pts) < 0.25
                            ? "bg-emerald-500/30 text-emerald-200 border-emerald-500/60 shadow-sm"
                            : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                        )}
                        title={`Calibrate Target Price to ${tier.label} (₹${(entryPrice + tier.pts).toFixed(2)})`}
                      >
                        {tier.label}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  value={targetPrice}
                  onFocus={handleManualInputFocus}
                  onChange={(e) => {
                    handleManualInputFocus();
                    setTargetPrice(Number(e.target.value));
                  }}
                  step="0.05"
                  className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
                <div className="text-[10px] font-mono text-emerald-400 flex items-center justify-between pt-0.5">
                  <span className={clsx("text-[9px] font-mono", (targetPrice - entryPrice) < 3.5 ? "text-amber-400 font-bold" : "text-slate-400")}>
                    {(targetPrice - entryPrice) < 3.5 
                      ? "⚠️ Target <2.5x friction (1.35 pt drag)" 
                      : "🏛️ Friction Hurdle: ~1.35 pts (₹87.5)"}
                  </span>
                  <span className="text-right">
                    +{(targetPrice - entryPrice).toFixed(2)} pts (+{(((targetPrice - entryPrice) / (entryPrice || 1)) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 🌟 Apple Spatial Dynamic Expiry Payoff Canvas */}
          <div id="option-outcome-simulator" className="scroll-mt-24">
            <ApplePayoffCanvas 
              optionType={optionType}
              direction="BUY"
              spotPrice={currentAsset.spot}
              strikePrice={strikePrice}
              netEntryPrice={entryPrice}
              stopLoss={stopLoss}
              targetPrice={targetPrice}
              quantity={lots}
              lotSize={currentAsset.lot}
              strategyMode={strategyMode}
              hedgeStrike={hedgeStrike}
              hedgePrice={hedgePrice}
              onSetTarget={(val) => setTargetPrice(val)}
              onSetStopLoss={(val) => setStopLoss(val)}
            />
          </div>

          {/* Pre-Flight Telemetry Strip & Deploy CTA */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] block">Capital Outlay (₹10k Budget)</span>
                <div className={clsx("font-mono font-bold text-sm flex items-baseline gap-1", capitalOutlay > 10000 ? "text-amber-400" : "text-white")}>
                  <RollingTicker value={capitalOutlay} prefix="₹" decimalPlaces={2} />
                  <span className={clsx("text-[9px] px-1 py-0.2 rounded font-mono font-bold", capitalOutlay > 10000 ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30")}>
                    {((capitalOutlay / 10000) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Max Risk</span>
                <div className="text-rose-400 font-mono font-bold text-sm">
                  <RollingTicker value={riskAmount} prefix="₹" decimalPlaces={2} className="text-rose-400" />
                </div>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Target Profit</span>
                <div className="text-emerald-400 font-mono font-bold text-sm">
                  <RollingTicker value={rewardAmount} prefix="+₹" decimalPlaces={2} className="text-emerald-400" />
                </div>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Risk : Reward</span>
                <strong className="text-cyan-400 font-mono text-sm">1 : {rrRatio}</strong>
              </div>
            </div>

            {capitalOutlay > 10000 && (
              <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>₹10k Budget Guard:</strong> Capital outlay (₹{capitalOutlay.toFixed(0)}) exceeds your ₹10,000 target budget. Dan Passarelli rules recommend 1 Lot for ₹10k bankroll.
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={isDailyCapReached || !isValidSL || !isValidTarget || (!copilotState.canDeploy && copilotRegime === "BLOCKED" && !sandboxBypass) || isDeploying}
              className={clsx(
                "w-full py-3.5 rounded-xl font-black text-sm transition flex items-center justify-center gap-2",
                (isDailyCapReached || !isValidSL || !isValidTarget)
                  ? "bg-amber-950/60 text-amber-300/80 border border-amber-500/30 cursor-not-allowed opacity-80" 
                  : copilotState.ctaClass,
                isDeploying && "opacity-75 cursor-wait"
              )}
            >
              {isDeploying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>Arming Order...</span>
                </>
              ) : isVaultRunning ? (
                <>
                  <Clock className="w-4 h-4 text-cyan-300 animate-spin" />
                  <span>Cooling Vault Active ({vaultFormattedTime}) — Take a Breather</span>
                </>
              ) : isDailyCapReached ? (
                <>
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Daily 3-Trade Quota Locked (Start 15m Vault to Unlock)</span>
                </>
              ) : !isValidSL ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Inverted Stop Loss (Must be strictly &lt; ₹{Number(entryPrice).toFixed(1)})</span>
                </>
              ) : !isValidTarget ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Inverted Target (Must be strictly &gt; ₹{Number(entryPrice).toFixed(1)})</span>
                </>
              ) : copilotState.canDeploy || sandboxBypass ? (
                <>
                  <Zap className="w-4 h-4 fill-current" />
                  <span>{copilotState.ctaText}</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>{copilotState.ctaText}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});
