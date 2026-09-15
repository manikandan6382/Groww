import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { soundEngine } from "../../../utils/soundEngine";
import { useTradingStore } from "../../../stores/useTradingStore";
import { useLivePriceStore } from "../../../stores/useLivePriceStore";
import {
  snapToTick, calculateBreakevenSpot, calculatePopPercent, calculateDomain,
  calculateApproxDelta, calculateGammaFactor, calculateThetaDecayPct,
  computeExpiryPayoff, computeSimulatedOutcome, computePayoffRiskReward
} from "./payoffMathEngine";
import { calculateRiskRewardTargets } from "../order-pad/hooks/orderPadCalculations";

export function useApplePayoffSimulator({
  optionType = "CALL", direction = "BUY", spotPrice = 24005.55, strikePrice = 24100,
  netEntryPrice = 100.50, stopLoss = null, targetPrice = null, quantity = 1,
  lotSize = 65, strategyMode = "NAKED", hedgeStrike = 23900, hedgePrice = 23.90,
  onSetTarget, onSetStopLoss,
}) {
  const lastAudioTickRef = useRef(0);
  const [viewMode, setViewMode] = useState("chart");
  const [holdDuration, setHoldDuration] = useState("flash");

  const { 
    openAlerts = [], simulatorActiveTradeId, setSimulatorActiveTradeId,
    updateTargetPrice, updateStopLossPrice
  } = useTradingStore();

  const ticks = useLivePriceStore((state) => state.ticks);
  const indices = useLivePriceStore((state) => state.indices);

  const activeTrade = useMemo(() => {
    if (!simulatorActiveTradeId || !openAlerts.length) return null;
    return openAlerts.find((t) => t.id === simulatorActiveTradeId) || null;
  }, [simulatorActiveTradeId, openAlerts]);

  const isTradeActive = Boolean(activeTrade);
  const tradeSymbol = activeTrade?.symbol || activeTrade?.tradingsymbol || "";
  const isBankNifty = tradeSymbol.includes("BANK") || Boolean(activeTrade?.underlyingSymbol?.includes("BANK"));
  
  const liveSpot = isBankNifty 
    ? (indices?.["NSE_INDEX|Nifty Bank"]?.ltp || 57317.75) 
    : (indices?.["NSE_INDEX|Nifty 50"]?.ltp || spotPrice);

  const effectiveOptionType = activeTrade ? (activeTrade.optionType || (tradeSymbol.includes("PE") ? "PUT" : "CALL")) : optionType;
  const effectiveDirection = activeTrade ? (activeTrade.direction || "BUY") : direction;
  const effectiveSpot = isTradeActive ? liveSpot : spotPrice;
  const effectiveStrike = isTradeActive ? Number(activeTrade.strikePrice || strikePrice) : Number(strikePrice || spotPrice);
  const effectiveEntry = isTradeActive ? Math.max(0.05, Number(activeTrade.entryPrice || activeTrade.plannedEntryPrice || netEntryPrice)) : Math.max(0.05, Number(netEntryPrice || 0.05));
  const liveLtp = isTradeActive ? (ticks?.[activeTrade.id]?.ltp || activeTrade.lastMarkPrice || effectiveEntry) : effectiveEntry;

  const [localTarget, setLocalTarget] = useState(null);
  const [localSL, setLocalSL] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [closedTradeNotice, setClosedTradeNotice] = useState(null);

  useEffect(() => {
    if (simulatorActiveTradeId && openAlerts.length > 0 && !openAlerts.some((t) => t.id === simulatorActiveTradeId)) {
      setClosedTradeNotice("Active position squared off / closed in background. Returned to OrderPad Draft.");
      setSimulatorActiveTradeId(null);
      soundEngine.playTabSwitchTone();
      const timer = setTimeout(() => setClosedTradeNotice(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [openAlerts, simulatorActiveTradeId, setSimulatorActiveTradeId]);

  useEffect(() => {
    setLocalTarget(null); setLocalSL(null); setSyncStatus(null);
  }, [simulatorActiveTradeId]);

  const isLiveStreaming = Boolean(isTradeActive && ticks?.[activeTrade.id]?.ltp);
  const isZeroDte = useMemo(() => {
    const day = new Date().getDay();
    return (isBankNifty && day === 3) || (!isBankNifty && day === 4) || Boolean(activeTrade?.isExpiryToday || activeTrade?.isZeroDte);
  }, [isBankNifty, activeTrade]);

  const totalShares = (isTradeActive ? Number(activeTrade.quantity || 1) : Number(quantity || 1)) * (isTradeActive ? Number(activeTrade.lotSize || 65) : Number(lotSize || 65));

  // Manikandan's Immutable Capital Protection Rule: ₹200–₹300 max risk (default ₹250), ₹400–₹600 target (default ₹500)
  const defaultTargets = useMemo(() => {
    return calculateRiskRewardTargets({
      entryPrice: effectiveEntry,
      totalQty: totalShares,
      underlying: isBankNifty ? "BANKNIFTY" : "NIFTY"
    });
  }, [effectiveEntry, totalShares, isBankNifty]);

  const fallbackSL = defaultTargets.stopLoss;
  const fallbackTP = defaultTargets.targetPrice;

  const effectiveSL = localSL != null
    ? localSL
    : (isTradeActive
        ? (activeTrade?.stopLoss != null && !isNaN(Number(activeTrade.stopLoss)) && Number(activeTrade.stopLoss) > 0 ? Number(activeTrade.stopLoss) : fallbackSL)
        : (stopLoss != null && !isNaN(Number(stopLoss)) && Number(stopLoss) > 0 ? Number(stopLoss) : fallbackSL));

  const effectiveTP = localTarget != null
    ? localTarget
    : (isTradeActive
        ? (activeTrade?.targetPrice != null && !isNaN(Number(activeTrade.targetPrice)) && Number(activeTrade.targetPrice) > 0 ? Number(activeTrade.targetPrice) : fallbackTP)
        : (targetPrice != null && !isNaN(Number(targetPrice)) && Number(targetPrice) > 0 ? Number(targetPrice) : fallbackTP));
  const isCall = effectiveOptionType === "CALL";
  const isBuy = effectiveDirection === "BUY";
  const isDirect = isTradeActive ? (activeTrade.strategyMode !== "SPREAD") : (strategyMode !== "SPREAD");
  const hedgeStrk = isTradeActive ? Number(activeTrade.hedgeStrike || hedgeStrike) : hedgeStrike;
  const hedgePrc = isTradeActive ? Number(activeTrade.hedgePrice || hedgePrice) : hedgePrice;

  const capitalOutlay = useMemo(() => {
    const unitPrice = isDirect ? effectiveEntry : Math.max(0.05, effectiveEntry - hedgePrc);
    return Math.round(unitPrice * totalShares);
  }, [isDirect, effectiveEntry, hedgePrc, totalShares]);

  const rrStats = useMemo(() => computePayoffRiskReward({
    entry: effectiveEntry, sl: effectiveSL, tp: effectiveTP, totalShares, isBuy, liveLtp, isTradeActive
  }), [effectiveEntry, effectiveSL, effectiveTP, totalShares, isBuy, liveLtp, isTradeActive]);

  const breakevenSpot = useMemo(() => calculateBreakevenSpot({ isDirect, isCall, strike: effectiveStrike, entry: effectiveEntry, hedgePrc }), [isDirect, isCall, effectiveStrike, effectiveEntry, hedgePrc]);
  const distToBE = isCall ? (breakevenSpot - effectiveSpot) : (effectiveSpot - breakevenSpot);
  const popPercent = useMemo(() => calculatePopPercent({ effectiveSpot, breakevenSpot, isCall }), [effectiveSpot, breakevenSpot, isCall]);
  const domain = useMemo(() => calculateDomain({ strike: effectiveStrike, effectiveSpot, breakevenSpot, entry: effectiveEntry }), [effectiveStrike, effectiveSpot, breakevenSpot, effectiveEntry]);
  const spotRatio = useMemo(() => domain.max <= domain.min ? 0.5 : Math.max(0, Math.min(1, (effectiveSpot - domain.min) / (domain.max - domain.min))), [effectiveSpot, domain]);

  const [scrubRatio, setScrubRatio] = useState(spotRatio);
  const [isScrubbing, setIsScrubbing] = useState(false);
  useEffect(() => { setScrubRatio(spotRatio); }, [spotRatio]);

  const calculatePayoffAtExpiry = useCallback((sT) => computeExpiryPayoff({ sT, isCall, strike: effectiveStrike, isDirect, hedgeStrk, hedgePrc, entry: effectiveEntry, isBuy, totalShares }), [isCall, effectiveStrike, isDirect, hedgeStrk, hedgePrc, effectiveEntry, isBuy, totalShares]);
  const approxDelta = useMemo(() => calculateApproxDelta({ isCall, effectiveSpot, strike: effectiveStrike }), [isCall, effectiveSpot, effectiveStrike]);
  const gammaFactor = useMemo(() => calculateGammaFactor({ effectiveSpot, strike: effectiveStrike, isZeroDte }), [effectiveSpot, effectiveStrike, isZeroDte]);
  const thetaDecayPct = useMemo(() => calculateThetaDecayPct({ holdDuration, isZeroDte }), [holdDuration, isZeroDte]);
  const currentSimulatedSpot = useMemo(() => domain.min + scrubRatio * (domain.max - domain.min), [scrubRatio, domain]);

  const simulatedOutcome = useMemo(() => computeSimulatedOutcome({
    currentSimulatedSpot, effectiveSpot, approxDelta, gammaFactor, isBuy, entry: effectiveEntry, thetaDecayPct, totalShares, calculatePayoffAtExpiry
  }), [currentSimulatedSpot, effectiveSpot, approxDelta, gammaFactor, isBuy, effectiveEntry, thetaDecayPct, totalShares, calculatePayoffAtExpiry]);

  const handleScrubChange = (newRatio) => {
    setScrubRatio(Math.max(0, Math.min(1, newRatio)));
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - lastAudioTickRef.current > 75) {
      lastAudioTickRef.current = now;
      soundEngine.playTick();
    }
  };

  const handleApplyRRPreset = (multiplier) => {
    const safeRisk = Math.max(2, isBuy ? (effectiveEntry - effectiveSL) : (effectiveSL - effectiveEntry));
    const newTargetPrice = snapToTick(isBuy ? effectiveEntry + safeRisk * multiplier : effectiveEntry - safeRisk * multiplier);
    setLocalTarget(newTargetPrice);
    if (onSetTarget) onSetTarget(newTargetPrice);
    soundEngine.playTargetChime();
  };

  const handleAdoptTarget = (price) => {
    const val = snapToTick(price != null ? price : simulatedOutcome?.estOptPrice);
    setLocalTarget(val);
    if (onSetTarget) onSetTarget(val);
    soundEngine.playTargetChime();
  };

  const handleAdoptSL = (price) => {
    const val = snapToTick(price != null ? price : simulatedOutcome?.estOptPrice);
    setLocalSL(val);
    if (onSetStopLoss) onSetStopLoss(val);
    soundEngine.playTargetChime();
  };

  const handleSyncToActiveTrade = () => {
    if (!activeTrade) return;
    if (updateTargetPrice && localTarget != null) updateTargetPrice(activeTrade.id, localTarget);
    if (updateStopLossPrice && localSL != null) updateStopLossPrice(activeTrade.id, localSL);
    setSyncStatus("synced");
    soundEngine.playTradeConfirmed();
    setTimeout(() => setSyncStatus(null), 2500);
  };

  return {
    viewMode, setViewMode, holdDuration, setHoldDuration, openAlerts,
    simulatorActiveTradeId, setSimulatorActiveTradeId, activeTrade, isTradeActive,
    tradeSymbol, isBankNifty, liveSpot, effectiveOptionType, effectiveSpot, effectiveStrike,
    effectiveEntry, liveLtp, localTarget, setLocalTarget, localSL, setLocalSL, syncStatus,
    closedTradeNotice, setClosedTradeNotice, isLiveStreaming, isZeroDte, effectiveSL,
    effectiveTP, totalShares, entry: effectiveEntry, strike: effectiveStrike, sl: effectiveSL, tp: effectiveTP,
    isCall, isBuy, isDirect, ...rrStats, capitalOutlay, breakevenSpot, distToBE, popPercent, domain, spotRatio,
    scrubRatio, isScrubbing, setIsScrubbing, calculatePayoffAtExpiry, approxDelta,
    currentSimulatedSpot, simulatedOutcome, handleScrubChange, handleApplyRRPreset,
    handleAdoptTarget, handleAdoptSL, handleSyncToActiveTrade, ticks
  };
}
