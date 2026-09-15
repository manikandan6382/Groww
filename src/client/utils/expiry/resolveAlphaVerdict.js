export function resolveAlphaVerdict({
  wasStoppedOutInitially,
  isWorthless,
  terminalIntrinsic,
  isBreached,
  postExitMinPrice,
  effectiveStopLoss,
  decisionAlpha,
  closeReason,
  entryPrice
}) {
  if (wasStoppedOutInitially && isWorthless) {
    return {
      type: "SAVED_BY_STOP",
      label: "Stop Saved Capital",
      tone: "emerald",
      badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      text: `Disciplined stop loss saved ₹${Math.abs(decisionAlpha).toLocaleString('en-IN')} from worthless ₹0.00 expiry.`
    };
  }
  if (wasStoppedOutInitially && terminalIntrinsic > 0) {
    return {
      type: "STOP_PROTECTED",
      label: "Stop Respected · Capital Shielded",
      tone: "cyan",
      badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
      text: `Stop loss executed as planned. Late-session intrinsic (₹${terminalIntrinsic.toFixed(2)}) was unexecutable without violating maximum allowed risk.`
    };
  }
  if (isBreached) {
    return {
      type: "INVALIDATED_BY_DRAWDOWN",
      label: "🛑 Drawdown Breach",
      tone: "emerald",
      badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      text: `Continuation dropped to ₹${postExitMinPrice ?? effectiveStopLoss} (below stop ₹${effectiveStopLoss}). Target exit locked gains before stop breach.`
    };
  }
  if (decisionAlpha > 50) {
    return {
      type: "ALPHA_HARVESTED",
      label: "Alpha Harvested",
      tone: "emerald",
      badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      text: `Active exit secured +₹${decisionAlpha.toLocaleString('en-IN')} more than holding to 15:30 settlement without drawdown risk.`
    };
  }
  if (decisionAlpha < -50) {
    const isTargetExit = closeReason.includes("TARGET");
    return {
      type: "POST_EXIT_EXPANSION",
      label: isTargetExit ? "Target Locked · Feasible Drift" : "Feasible Continuation",
      tone: "blue",
      badgeClass: "bg-blue-500/15 text-blue-300 border-blue-500/30",
      text: isTargetExit
        ? `Target achieved per plan. Contract maintained above stop (₹${effectiveStopLoss}) and drifted into 15:30. Taking planned liquidity is sound risk execution.`
        : `Option drifted into 15:30 without breaching stop. Discipline protected capital from intraday volatility.`
    };
  }
  if (terminalIntrinsic > entryPrice) {
    return {
      type: "ITM_EXPIRY",
      label: "Settled In-The-Money",
      tone: "cyan",
      badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
      text: `Contract settled ITM at ₹${terminalIntrinsic.toFixed(2)} at 15:30 terminal cut.`
    };
  }
  return {
    type: "OTM_ZERO",
    label: "Expired OTM (₹0)",
    tone: "rose",
    badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    text: "Extrinsic premium decayed to zero at 15:30 settlement."
  };
}
