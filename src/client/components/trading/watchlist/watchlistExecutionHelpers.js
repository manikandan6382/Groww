import { resolveIndexLotSize } from "../../../stores/useTradingStore";
import { soundEngine } from "../../../utils/soundEngine";

export function executeEquityTrade({
  meta,
  cleanSym,
  productType,
  tradeQty,
  orderSide,
  deployPracticeTrade,
  setToastMessage,
  setActiveModal
}) {
  const price = Number(meta.price || 1000);
  deployPracticeTrade({
    symbol: `${cleanSym} (${productType})`,
    underlyingSymbol: cleanSym,
    entryPrice: price,
    plannedEntryPrice: price,
    quantity: tradeQty,
    lotSize: 1,
    optionType: orderSide,
    tradeType: productType === "CNC" ? "DELIVERY" : "INTRADAY",
    direction: orderSide === "BUY" ? "LONG" : "SHORT",
    strategyTag: productType === "CNC" ? "Equity Wealth Accumulation" : "Equity Intraday Momentum",
    personalNotes: `Watchlist Quick Execution · ${orderSide} ${tradeQty} shares @ ₹${price}`
  });
  soundEngine.playOrderFillTone();
  setToastMessage(`✅ Order Executed: ${orderSide} ${tradeQty} shares of ${cleanSym} @ ₹${price.toFixed(2)} (${productType})`);
  setActiveModal(null);
}

export function executeOptionScalp({
  meta,
  cleanSym,
  optionType,
  optionLots,
  deployPracticeTrade,
  setToastMessage,
  setActiveModal
}) {
  const spot = Number(meta.price || 1000);
  const roundedStrike = Math.round(spot / 50) * 50;
  const strikeSymbol = `${cleanSym} ${roundedStrike} ${optionType}`;
  const estPremium = Number((spot * (optionType === "CE" ? 0.022 : 0.020)).toFixed(2));
  const lotSize = resolveIndexLotSize(cleanSym, 25);
  const totalQty = optionLots * lotSize;
  const rawSlPts = 250 / (totalQty || 65);
  const slPoints = Math.max(0.5, Math.round(rawSlPts * 2) / 2);
  const targetPoints = Number((slPoints * 2.0).toFixed(1));
  const stopLoss = Number(Math.max(0.05, estPremium - slPoints).toFixed(2));
  const targetPrice = Number((estPremium + targetPoints).toFixed(2));

  deployPracticeTrade({
    symbol: strikeSymbol,
    underlyingSymbol: cleanSym,
    strikePrice: roundedStrike,
    entryPrice: estPremium,
    plannedEntryPrice: estPremium,
    targetPrice,
    stopLoss,
    quantity: optionLots,
    lotSize: lotSize,
    optionType: optionType === "CE" ? "CALL" : "PUT",
    tradeType: "INTRADAY",
    direction: optionType === "CE" ? "LONG" : "SHORT",
    strategyTag: "ATM Watchlist Scalp",
    personalNotes: `Watchlist Scalp Desk · ${strikeSymbol} @ ₹${estPremium}`
  });
  soundEngine.playOrderFillTone();
  setToastMessage(`🎯 Option Scalp Deployed: ${strikeSymbol} (${totalQty} Qty) @ ₹${estPremium.toFixed(2)}`);
  setActiveModal(null);
}

export function transferToPaperLab({
  meta,
  cleanSym,
  optionType,
  optionLots,
  setOrderPadPreFill,
  setActiveModal,
  setActiveView
}) {
  const spot = Number(meta.price || 1000);
  const roundedStrike = Math.round(spot / 50) * 50;
  const entryVal = Number((spot * 0.02).toFixed(2));
  const lotSizeVal = resolveIndexLotSize(cleanSym, 25);
  const totalUnits = (optionLots || 1) * lotSizeVal;
  const rawSl = 250 / (totalUnits || 65);
  const slPts = Math.max(0.5, Math.round(rawSl * 2) / 2);
  const tpPts = Number((slPts * 2.0).toFixed(1));

  setOrderPadPreFill({
    symbol: `${cleanSym} ${roundedStrike} ${optionType}`,
    underlying: cleanSym,
    entryPrice: entryVal,
    targetPrice: Number((entryVal + tpPts).toFixed(2)),
    stopLoss: Number(Math.max(0.05, entryVal - slPts).toFixed(2)),
    quantity: optionLots,
    lotSize: lotSizeVal
  });
  setActiveModal(null);
  setActiveView("paper");
  soundEngine.playSuccessTone();
}
