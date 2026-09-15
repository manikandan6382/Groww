import { useState, useEffect } from "react";
import { useTradingStore } from "../../../stores/useTradingStore";

export function useAlertCreatorState(onCreated) {
  const { orderPadPreFill, setOrderPadPreFill } = useTradingStore();
  const [symbol, setSymbol] = useState("NIFTY 24500 CE");
  const [optionType, setOptionType] = useState("CE");
  const [entryPrice, setEntryPrice] = useState("28.50");
  const [targetPrice, setTargetPrice] = useState("40.00");
  const [stopLoss, setStopLoss] = useState("22.00");
  const [submitting, setSubmitting] = useState(false);

  // Auto-consume pre-fill from 1-Click Watchlist Deploy
  useEffect(() => {
    if (orderPadPreFill) {
      if (orderPadPreFill.symbol) {
        setSymbol(orderPadPreFill.symbol);
        setOptionType(orderPadPreFill.symbol.endsWith("PE") ? "PE" : "CE");
      }
      if (orderPadPreFill.entryPrice) setEntryPrice(String(orderPadPreFill.entryPrice));
      if (orderPadPreFill.targetPrice) setTargetPrice(String(orderPadPreFill.targetPrice));
      if (orderPadPreFill.stopLoss) setStopLoss(String(orderPadPreFill.stopLoss));
      setOrderPadPreFill(null);
    }
  }, [orderPadPreFill, setOrderPadPreFill]);

  const entry = Number(entryPrice || 0);
  const target = Number(targetPrice || 0);
  const sl = Number(stopLoss || 0);
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(target - entry);
  const rrRatio = (reward / (risk || 1)).toFixed(2);
  const isHealthyRR = Number(rrRatio) >= 1.5;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!symbol || !entryPrice || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/live-alerts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tradingsymbol: symbol.toUpperCase().trim(),
          option_type: optionType,
          entry_price: entry,
          target_price: target,
          stop_loss: sl,
        }),
      });

      if (res.ok && onCreated) {
        onCreated();
      }
    } catch (err) {
      console.error("Failed to create alert:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return {
    symbol,
    setSymbol,
    optionType,
    setOptionType,
    entryPrice,
    setEntryPrice,
    targetPrice,
    setTargetPrice,
    stopLoss,
    setStopLoss,
    submitting,
    rrRatio,
    isHealthyRR,
    handleSubmit
  };
}
