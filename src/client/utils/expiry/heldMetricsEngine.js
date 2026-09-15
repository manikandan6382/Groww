import { parseOptionContract, calculateTerminalIntrinsic } from "./contractExpiryEngine.js";
import { resolveAlphaVerdict } from "./resolveAlphaVerdict.js";

export function calculateHeldToExpiryMetrics(trade, customExpirySpot = null) {
  const {
    symbol = "NIFTY 24200 CE",
    entryPrice = 100,
    exitPrice = 100,
    stopLoss = null,
    totalQty = 65,
    charges = 55.20,
    netPnl = 0,
    closeReason = "TARGET_HIT",
    expiryDatetime = null,
    postExitMinPrice = null,
    isDrawdownBreached = false
  } = trade;

  const contract = parseOptionContract(symbol);
  const strike = contract.strikePrice;

  const nowMs = Date.now();
  const expiryTimeMs = expiryDatetime ? new Date(expiryDatetime).getTime() : nowMs - 1000;
  const isSessionSettled = nowMs >= expiryTimeMs;

  let expirySpot = customExpirySpot ?? trade.expirySpot;
  if (!expirySpot) {
    if (contract.optionType === "CALL") {
      expirySpot = closeReason.includes("TARGET") ? strike + (exitPrice * 0.85) : strike - 45;
    } else {
      expirySpot = closeReason.includes("TARGET") ? strike - (exitPrice * 0.85) : strike + 55;
    }
    expirySpot = Number(expirySpot.toFixed(1));
  }

  const effectiveStopLoss = stopLoss ? Number(stopLoss) : Number((entryPrice * 0.90).toFixed(2));
  const terminalIntrinsic = calculateTerminalIntrinsic(contract, expirySpot);
  const isWorthless = terminalIntrinsic <= 0.05;

  const wasStoppedOutInitially = closeReason.includes("STOP");
  const breachedPostExit = postExitMinPrice != null && Number(postExitMinPrice) <= effectiveStopLoss;
  const isBreached = isDrawdownBreached || wasStoppedOutInitially || breachedPostExit;

  let heldGrossPnl;
  let heldNetPnl;
  let decisionAlpha;

  if (isBreached) {
    const stopExitPrice = wasStoppedOutInitially ? exitPrice : effectiveStopLoss;
    heldGrossPnl = Number(((stopExitPrice - entryPrice) * totalQty).toFixed(2));
    heldNetPnl = Number((heldGrossPnl - charges).toFixed(2));
    decisionAlpha = Number((netPnl - heldNetPnl).toFixed(2));
  } else {
    heldGrossPnl = Number(((terminalIntrinsic - entryPrice) * totalQty).toFixed(2));
    heldNetPnl = Number((heldGrossPnl - charges).toFixed(2));
    decisionAlpha = Number((netPnl - heldNetPnl).toFixed(2));
  }

  const verdict = resolveAlphaVerdict({
    wasStoppedOutInitially,
    isWorthless,
    terminalIntrinsic,
    isBreached,
    postExitMinPrice,
    effectiveStopLoss,
    decisionAlpha,
    closeReason,
    entryPrice
  });

  return {
    contract,
    expirySpot,
    terminalIntrinsic,
    heldGrossPnl,
    heldNetPnl,
    realizedNetPnl: netPnl,
    decisionAlpha,
    isHeldProfitable: heldNetPnl > 0,
    isExpiredZero: isWorthless,
    isSessionSettled,
    sessionPhase: isSessionSettled ? "SETTLED" : "PROJECTED_LIVE",
    isDrawdownBreached: isBreached,
    effectiveStopLoss,
    postExitMinPrice,
    verdict
  };
}
