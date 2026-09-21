import { useState } from "react";
import { soundEngine } from "../../../utils/soundEngine";
import { calculateTradeFriction, checkFrictionDrag } from "./tradeFrictionCalc";
import { submitJournalTrade } from "./submitJournalTrade";

export function useTradeLoggerState({ logJournalTrade, onLogged }) {
  const [symbol, setSymbol] = useState("NIFTY 24500 CE");
  const [side, setSide] = useState("BUY");
  const [entryPrice, setEntryPrice] = useState("120.00");
  const [exitPrice, setExitPrice] = useState("128.00");
  const [quantity, setQuantity] = useState("65");
  const [stopLoss, setStopLoss] = useState("116.20"); // 3.8 pts stop * 65 = ₹247.00 risk
  const [targetPrice, setTargetPrice] = useState("127.60"); // 7.6 pts target * 65 = ₹494.00 gain (1:2 R:R)
  const [setupTag, setSetupTag] = useState("15m VWAP Retest");
  const [mindsetEmotion, setMindsetEmotion] = useState("Disciplined & Patient");
  const [confidenceScore, setConfidenceScore] = useState(9);
  const [mistakeTag, setMistakeTag] = useState("None (Plan Followed)");
  const [notes, setNotes] = useState("15-min volume breakout above morning high with ₹250 tight risk budget.");
  const [submitting, setSubmitting] = useState(false);
  const [overrideTiltBreaker, setOverrideTiltBreaker] = useState(false);

  const friction = calculateTradeFriction(entryPrice, exitPrice, quantity, side);
  const drag = checkFrictionDrag(targetPrice, friction.entry, side, friction.totalFriction, friction.qty);

  // Dynamic Invariant Risk & Reward Calculations
  const plannedRiskPts = side === "BUY"
    ? Math.max(0, Number(entryPrice || 0) - Number(stopLoss || 0))
    : Math.max(0, Number(stopLoss || 0) - Number(entryPrice || 0));
  const plannedRiskCash = Math.round(plannedRiskPts * Number(quantity || 1) * 100) / 100;
  const isRiskBreached = plannedRiskCash > 305;

  const plannedTargetPts = side === "BUY"
    ? Math.max(0, Number(targetPrice || 0) - Number(entryPrice || 0))
    : Math.max(0, Number(entryPrice || 0) - Number(targetPrice || 0));
  const plannedTargetCash = Math.round(plannedTargetPts * Number(quantity || 1) * 100) / 100;
  const plannedRR = plannedRiskCash > 0 ? (plannedTargetCash / plannedRiskCash).toFixed(2) : "0.00";

  const autoPegRisk = (customEntry, customQty, customSide) => {
    const ePrice = Number(customEntry !== undefined ? customEntry : entryPrice) || 120;
    const q = Number(customQty !== undefined ? customQty : quantity) || 65;
    const currentSide = customSide || side;

    // Manikandan's exact ₹250 risk invariant:
    const slPoints = Number((250 / Math.max(1, q)).toFixed(1));
    const tpPoints = Number((slPoints * 2.0).toFixed(1));

    if (currentSide === "BUY") {
      const calculatedSL = Math.max(0.05, Number((ePrice - slPoints).toFixed(2)));
      const calculatedTP = Number((ePrice + tpPoints).toFixed(2));
      setStopLoss(String(calculatedSL));
      setTargetPrice(String(calculatedTP));
    } else {
      const calculatedSL = Number((ePrice + slPoints).toFixed(2));
      const calculatedTP = Math.max(0.05, Number((ePrice - tpPoints).toFixed(2)));
      setStopLoss(String(calculatedSL));
      setTargetPrice(String(calculatedTP));
    }
    soundEngine.playTargetChime();
  };

  const applyPreset = (tag, noteText, emotion, conf, mistake) => {
    setSetupTag(tag);
    if (noteText) setNotes(noteText);
    if (emotion) setMindsetEmotion(emotion);
    if (conf) setConfidenceScore(conf);
    if (mistake) setMistakeTag(mistake);
  };

  const applyStrikePreset = (symName, defaultEntry, defaultExit, defaultSL, defaultTP, defaultQty, defaultTag) => {
    setSymbol(symName);
    setEntryPrice(String(defaultEntry));
    setExitPrice(String(defaultExit));
    setStopLoss(String(defaultSL));
    setTargetPrice(String(defaultTP));
    setQuantity(String(defaultQty));
    if (defaultTag) setSetupTag(defaultTag);
  };

  const importSettledTrade = (trade) => {
    if (!trade) return;
    const sym = trade.symbol || "";
    setSymbol(sym);
    const sideValue = trade.direction === "SHORT" || trade.transaction_type === "SELL" ? "SELL" : "BUY";
    setSide(sideValue);
    const ePrice = String(trade.entryPrice || trade.entry_price || "0");
    setEntryPrice(ePrice);
    setExitPrice(String(trade.exitPrice || trade.exit_price || trade.lastMarkPrice || trade.entryPrice || "0"));
    
    const rawQty = Number(trade.quantity || 0);
    const calculatedQty = rawQty >= 25
      ? rawQty
      : (rawQty || 1) * (Number(trade.lotSize) || 65);
    setQuantity(String(calculatedQty));

    // Peg stop loss and target price to ₹250 invariant if unassigned or 0
    if (trade.stopLoss && Number(trade.stopLoss) > 0) {
      setStopLoss(String(trade.stopLoss));
    } else {
      autoPegRisk(Number(ePrice), calculatedQty, sideValue);
    }
    if (trade.targetPrice && Number(trade.targetPrice) > 0) {
      setTargetPrice(String(trade.targetPrice));
    }

    if (trade.strategyTag || trade.setupTag) setSetupTag(trade.strategyTag || trade.setupTag);
    if (trade.mindsetEmotion) setMindsetEmotion(trade.mindsetEmotion);
    if (trade.mistakeTags) setMistakeTag(trade.mistakeTags);
    if (trade.confidenceScore) setConfidenceScore(trade.confidenceScore);
    const net = trade.netPnl !== undefined ? trade.netPnl : 0;
    setNotes(trade.lessonsLearned || trade.catalyst || trade.notes || `Settled ${sym} trade closed with ${net >= 0 ? "+" : ""}₹${Number(net).toFixed(2)} P&L.`);
    soundEngine.playSuccessTone();
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!symbol || !entryPrice || !exitPrice || submitting) return;
    setSubmitting(true);
    try {
      await submitJournalTrade({
        symbol,
        side,
        entry: friction.entry,
        exit: friction.exit,
        qty: friction.qty,
        stopLoss,
        targetPrice,
        setupTag,
        notes,
        mindsetEmotion,
        confidenceScore,
        mistakeTag,
        friction,
        logJournalTrade,
        onLogged,
      });
    } catch (err) {
      console.error("Failed to log trade:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return {
    symbol, setSymbol,
    side, setSide,
    entryPrice, setEntryPrice,
    exitPrice, setExitPrice,
    quantity, setQuantity,
    stopLoss, setStopLoss,
    targetPrice, setTargetPrice,
    setupTag, setSetupTag,
    mindsetEmotion, setMindsetEmotion,
    confidenceScore, setConfidenceScore,
    mistakeTag, setMistakeTag,
    notes, setNotes,
    submitting,
    overrideTiltBreaker, setOverrideTiltBreaker,
    friction,
    drag,
    plannedRiskCash,
    isRiskBreached,
    plannedTargetCash,
    plannedRR,
    autoPegRisk,
    applyPreset,
    applyStrikePreset,
    importSettledTrade,
    handleSubmit,
  };
}

export default useTradeLoggerState;
