import { useState } from "react";
import { soundEngine } from "../../../utils/soundEngine";
import { calculateTradeFriction, checkFrictionDrag } from "./tradeFrictionCalc";
import { submitJournalTrade } from "./submitJournalTrade";

export function useTradeLoggerState({ logJournalTrade, onLogged }) {
  const [symbol, setSymbol] = useState("NIFTY 24500 CE");
  const [side, setSide] = useState("BUY");
  const [entryPrice, setEntryPrice] = useState("28.50");
  const [exitPrice, setExitPrice] = useState("38.00");
  const [quantity, setQuantity] = useState("65");
  const [stopLoss, setStopLoss] = useState("23.50");
  const [targetPrice, setTargetPrice] = useState("43.50");
  const [setupTag, setSetupTag] = useState("Breakout");
  const [mindsetEmotion, setMindsetEmotion] = useState("Disciplined & Patient");
  const [confidenceScore, setConfidenceScore] = useState(9);
  const [mistakeTag, setMistakeTag] = useState("None (Plan Followed)");
  const [notes, setNotes] = useState("15-min volume breakout above morning high with tight risk.");
  const [submitting, setSubmitting] = useState(false);
  const [overrideTiltBreaker, setOverrideTiltBreaker] = useState(false);

  const friction = calculateTradeFriction(entryPrice, exitPrice, quantity, side);
  const drag = checkFrictionDrag(targetPrice, friction.entry, side, friction.totalFriction, friction.qty);

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
    setSide(trade.direction === "SHORT" || trade.transaction_type === "SELL" ? "SELL" : "BUY");
    setEntryPrice(String(trade.entryPrice || trade.entry_price || "0"));
    setExitPrice(String(trade.exitPrice || trade.exit_price || trade.lastMarkPrice || trade.entryPrice || "0"));
    setStopLoss(String(trade.stopLoss || trade.stop_loss || trade.entryPrice || "0"));
    setTargetPrice(String(trade.targetPrice || trade.target_price || trade.exitPrice || "0"));
    const calculatedQty = (trade.quantity || 1) * (trade.lotSize || 25);
    setQuantity(String(calculatedQty));
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
    applyPreset,
    applyStrikePreset,
    importSettledTrade,
    handleSubmit,
  };
}
