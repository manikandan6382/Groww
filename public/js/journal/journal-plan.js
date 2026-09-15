import { inr, setElementHidden } from "./journal-helpers.js";
import { tradeState } from "./journal-state.js";

export function syncLotSizeFromSymbol(symbol) {
  const s = String(symbol || "").toUpperCase();
  const lotInput = document.getElementById("formLotSize");
  if (!lotInput) return;

  if (s.includes("BANKNIFTY")) lotInput.value = "35";
  else if (s.includes("SENSEX")) lotInput.value = "20";
  else if (s.includes("FINNIFTY")) lotInput.value = "65";
  else if (s.includes("NIFTY")) lotInput.value = "65";
}

export function recalculateTradePlan() {
  const entry = Number(document.getElementById("formEntryPrice")?.value || 0);
  const exit = Number(document.getElementById("formExitPrice")?.value || 0);
  const stop = Number(document.getElementById("formStopLoss")?.value || 0);
  const target = Number(document.getElementById("formTargetPrice")?.value || 0);
  const qty = Math.max(1, Number(document.getElementById("formQuantity")?.value || 1));
  const lotSize = Math.max(1, Number(document.getElementById("formLotSize")?.value || 65));
  const direction = document.getElementById("formDirection")?.value || "LONG";

  const totalUnits = qty * lotSize;
  const posValue = entry * totalUnits;
  const riskPerUnit = stop > 0 ? Math.max(0, direction === "LONG" ? entry - stop : stop - entry) : 0;
  const rewardPerUnit = target > 0 ? Math.max(0, direction === "LONG" ? target - entry : entry - target) : 0;
  const totalRisk = riskPerUnit * totalUnits;
  const totalReward = rewardPerUnit * totalUnits;
  const rr = totalRisk > 0 ? totalReward / totalRisk : 0;

  let estNetPnl = 0;
  if (exit > 0) {
    const grossPnl = direction === "LONG" ? (exit - entry) * totalUnits : (entry - exit) * totalUnits;
    estNetPnl = grossPnl - 56;
  }

  const setT = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setT("calcPosValue", inr.format(posValue));
  setT("calcRiskAmount", inr.format(totalRisk));
  setT("calcRewardAmount", inr.format(totalReward));

  const rrEl = document.getElementById("calcRrRatio");
  if (rrEl) {
    if (rr >= 2.0) {
      rrEl.className = "text-gain apple-hud-val";
      rrEl.textContent = `1 : ${rr.toFixed(2)} (High Conviction)`;
    } else if (rr >= 1.5) {
      rrEl.className = "text-cyan apple-hud-val";
      rrEl.textContent = `1 : ${rr.toFixed(2)} (Acceptable)`;
    } else if (rr > 0) {
      rrEl.className = "text-loss apple-hud-val";
      rrEl.textContent = `1 : ${rr.toFixed(2)} (⚠️ Sub-1.5 Risk)`;
    } else {
      rrEl.className = "text-muted-clean apple-hud-val";
      rrEl.textContent = "1 : 2.00+ Target";
    }
  }

  const sllGuideEl = document.getElementById("calcSllGuide");
  if (sllGuideEl) {
    if (stop > 0) {
      const sllLimit = direction === "LONG" ? Math.max(0.05, stop - 1.50) : stop + 1.50;
      const frictionNote = rewardPerUnit > 0 ? (rewardPerUnit < 8.5 ? " · ⚠️ High Friction (<8.5pt)" : " · ✅ Low Friction") : "";
      sllGuideEl.textContent = `Trigger: ₹${stop.toFixed(2)} | Limit: ₹${sllLimit.toFixed(2)}${frictionNote}`;
    } else {
      sllGuideEl.textContent = "Set Stop Loss to generate broker SL-L trigger guide & friction audit";
    }
  }

  const beLockEl = document.getElementById("calcBeLockGuide");
  if (beLockEl) {
    if (entry > 0) {
      const beTrigger = direction === "LONG" ? (entry + 5.00) : Math.max(0.05, entry - 5.00);
      beLockEl.textContent = `When premium hits ₹${beTrigger.toFixed(2)} (+5.0 pts), lock SL at ₹${entry.toFixed(2)} (Cost).`;
    } else {
      beLockEl.textContent = "Set entry price to calculate automated +5.0 pt breakeven lock trigger";
    }
  }

  const estPnlEl = document.getElementById("calcEstNetPnl");
  if (estPnlEl) {
    if (exit > 0) {
      estPnlEl.textContent = `${estNetPnl >= 0 ? "+" : ""}${inr.format(estNetPnl)}`;
      estPnlEl.className = estNetPnl >= 0 ? "text-gain" : "text-loss";
    } else {
      estPnlEl.textContent = "--";
      estPnlEl.className = "text-muted-clean";
    }
  }
}

export function setDefaultEntryTime() {
  const input = document.getElementById("entryDatetime");
  if (input) input.value = new Date().toISOString();
}

export function toggleCustomRangeFields() {
  const isCustom = tradeState.range === "custom";
  setElementHidden(document.getElementById("tradeRangeFrom"), !isCustom);
  setElementHidden(document.getElementById("tradeRangeTo"), !isCustom);
}

export function buildRangeQuery() {
  const params = new URLSearchParams();
  params.set("range", tradeState.range);
  if (tradeState.range === "custom") {
    const from = document.getElementById("tradeRangeFrom")?.value;
    const to = document.getElementById("tradeRangeTo")?.value;
    if (from) params.set("from", from);
    if (to) params.set("to", to);
  }
  return `?${params.toString()}`;
}

export function splitTags(value) {
  return String(value || "").split(",").map((t) => t.trim()).filter(Boolean);
}
