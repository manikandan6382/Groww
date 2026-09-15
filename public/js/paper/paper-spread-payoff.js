import { byId, paperMoney } from "./paper-helpers.js";

export function renderSpreadPayoff(values, entry, units, longStrike, optType) {
  const hedgeStrike = Number(values.hedgeStrikePrice || (optType === "CALL" ? longStrike + 100 : longStrike - 100));
  const hedgePrice = Number(values.hedgePrice || (entry * 0.45));
  const netDebitPerUnit = Math.max(0.05, entry - hedgePrice);
  const strikeWidth = Math.abs(hedgeStrike - longStrike);
  
  const capital = netDebitPerUnit * units;
  const maxRisk = capital;
  const maxReward = Math.max(0, (strikeWidth - netDebitPerUnit) * units);
  const rr = maxRisk > 0 ? maxReward / maxRisk : 0;
  const breakeven = optType === "CALL" ? longStrike + netDebitPerUnit : longStrike - netDebitPerUnit;

  const capEl = byId("deskCapitalVal");
  if (capEl) capEl.textContent = paperMoney.format(capital || 0);
  const riskEl = byId("deskRiskVal");
  if (riskEl) riskEl.textContent = paperMoney.format(maxRisk || 0);
  const rewEl = byId("deskRewardVal");
  if (rewEl) rewEl.textContent = paperMoney.format(maxReward || 0);

  const rrEl = byId("deskRrVal");
  if (rrEl) {
    rrEl.textContent = rr > 0 ? `1 : ${rr.toFixed(2)}` : "1 : 1.50+";
    rrEl.className = rr >= 1.5 ? "bracket-rr-text text-gain" : "bracket-rr-text text-cyan";
  }

  const beEl = byId("deskBreakevenVal");
  if (beEl) beEl.textContent = breakeven.toFixed(2);

  const hedgeTag = byId("hedgeSummaryTag");
  if (hedgeTag) {
    const sym = values.underlyingSymbol || "NIFTY";
    hedgeTag.textContent = `Sell ${sym} ${hedgeStrike} ${optType === "CALL" ? "CE" : "PE"}`;
  }

  const hedgeCreditTag = byId("hedgeCreditTag");
  if (hedgeCreditTag) {
    hedgeCreditTag.textContent = `Credit +₹${hedgePrice.toFixed(2)} (Net: ₹${netDebitPerUnit.toFixed(2)})`;
  }

  const payoffDock = document.getElementById("spreadPayoffDock");
  if (payoffDock) payoffDock.style.display = "block";
  const rangeTag = document.getElementById("payoffRangeTag");
  const sym = values.underlyingSymbol || "NIFTY";
  const minRange = Math.min(longStrike, hedgeStrike) - 200;
  const maxRange = Math.max(longStrike, hedgeStrike) + 200;
  if (rangeTag) rangeTag.textContent = `${sym} Range: ${minRange.toLocaleString()} → ${maxRange.toLocaleString()}`;

  const pMaxLoss = document.getElementById("pMarkerMaxLoss");
  const pBe = document.getElementById("pMarkerBe");
  const pMaxGain = document.getElementById("pMarkerMaxGain");
  if (pMaxLoss) pMaxLoss.textContent = `Max Loss: -${paperMoney.format(maxRisk)}`;
  if (pBe) pBe.textContent = `Breakeven: ${breakeven.toFixed(2)}`;
  if (pMaxGain) pMaxGain.textContent = `Max Gain: +${paperMoney.format(maxReward)}`;

  const strokeLine = document.getElementById("payoffStrokeLine");
  const fillArea = document.getElementById("payoffFillArea");
  const bePoint = document.getElementById("payoffBePoint");
  if (strokeLine && fillArea && bePoint) {
    if (optType === "CALL") {
      strokeLine.setAttribute("d", "M 0,95 L 175,95 L 325,30 L 500,30");
      fillArea.setAttribute("d", "M 0,95 L 175,95 L 325,30 L 500,30 L 500,65 L 0,65 Z");
    } else {
      strokeLine.setAttribute("d", "M 0,30 L 175,30 L 325,95 L 500,95");
      fillArea.setAttribute("d", "M 0,30 L 175,30 L 325,95 L 500,95 L 500,65 L 0,65 Z");
    }
    bePoint.setAttribute("cx", "250");
    bePoint.setAttribute("cy", "65");
  }
}
