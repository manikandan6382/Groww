import { byId, paperMoney } from "./paper-helpers.js";
import { optionLotSizes } from "./paper-state.js";
import { renderSpreadPayoff } from "./paper-spread-payoff.js";

export function renderPaperRiskPreview() {
  const paperForm = document.getElementById("paperTradeForm");
  if (!paperForm) return;
  const values = Object.fromEntries(new FormData(paperForm).entries());
  const isSpread = values.strategyMode === "SPREAD";
  const entry = Number(values.currentPrice || 0);
  const target = Number(values.targetPrice || 0);
  const stop = Number(values.stopLoss || 0);
  const quantity = Number(values.quantity || 0);
  const lotSize = Math.max(1, Number(values.lotSize || 1));
  const units = quantity * lotSize;
  const optType = values.optionType || "CALL";
  const longStrike = Number(values.strikePrice || 24200);

  if (isSpread) {
    renderSpreadPayoff(values, entry, units, longStrike, optType);
    return;
  }

  const payoffDock = document.getElementById("spreadPayoffDock");
  if (payoffDock) payoffDock.style.display = "none";

  const capital = entry * units;
  const risk = Math.max(0, entry - stop) * units;
  const reward = Math.max(0, target - entry) * units;
  const rr = risk > 0 ? reward / risk : 0;

  const slDiff = stop > 0 && entry > 0 ? entry - stop : 0;
  const tpDiff = target > 0 && entry > 0 ? target - entry : 0;
  const slDiffPct = entry > 0 ? (slDiff / entry) * 100 : 0;
  const tpDiffPct = entry > 0 ? (tpDiff / entry) * 100 : 0;

  const slDiffEl = byId("deskSlDiff");
  if (slDiffEl) {
    if (stop >= entry && stop > 0 && entry > 0) {
      slDiffEl.textContent = `⚠️ SL must be < ₹${entry.toFixed(2)}`;
      slDiffEl.className = "pad-diff-tag text-loss font-bold";
    } else {
      slDiffEl.textContent = slDiff > 0 ? `-${slDiff.toFixed(2)} pts (-${slDiffPct.toFixed(1)}%)` : "--";
      slDiffEl.className = "pad-diff-tag text-loss";
    }
  }

  const tpDiffEl = byId("deskTpDiff");
  if (tpDiffEl) {
    if (target <= entry && target > 0 && entry > 0) {
      tpDiffEl.textContent = `⚠️ Target must be > ₹${entry.toFixed(2)}`;
      tpDiffEl.className = "pad-diff-tag text-loss font-bold";
    } else {
      tpDiffEl.textContent = tpDiff > 0 ? `+${tpDiff.toFixed(2)} pts (+${tpDiffPct.toFixed(1)}%)` : "--";
      tpDiffEl.className = "pad-diff-tag text-gain";
    }
  }

  if (byId("deskCapitalVal")) byId("deskCapitalVal").textContent = paperMoney.format(capital || 0);
  if (byId("deskRiskVal")) byId("deskRiskVal").textContent = paperMoney.format(risk || 0);
  if (byId("deskRewardVal")) byId("deskRewardVal").textContent = paperMoney.format(reward || 0);

  const rrEl = byId("deskRrVal");
  if (rrEl) {
    if (rr > 0) {
      rrEl.textContent = `1 : ${rr.toFixed(2)}`;
      rrEl.className = rr >= 2.0 ? "bracket-rr-text text-gain" : rr >= 1.5 ? "bracket-rr-text text-cyan" : "bracket-rr-text text-loss";
    } else {
      rrEl.textContent = "1 : 2.00+";
      rrEl.className = "bracket-rr-text text-muted";
    }
  }
}

export function syncOptionLotSize() {
  const paperForm = document.getElementById("paperTradeForm");
  if (!paperForm) return;
  const underlyingSelect = paperForm.querySelector('[name="underlyingSymbol"]');
  const underlying = String(underlyingSelect?.value || "NIFTY").toUpperCase();
  try {
    if (underlyingSelect?.value) {
      localStorage.setItem("portfoliox_pref_underlying", underlyingSelect.value);
    }
  } catch (_) {}
  const lotSize = optionLotSizes[underlying] || 65;
  const lotInput = paperForm.querySelector('[name="lotSize"]');
  if (lotInput) lotInput.value = String(lotSize);

  const atmDefaults = {
    NIFTY: { strike: 24200, step: 50, entry: 100.0, sl: 96.0, tp: 108.0 },
    BANKNIFTY: { strike: 52200, step: 100, entry: 160.0, sl: 151.5, tp: 177.0 },
    FINNIFTY: { strike: 23800, step: 50, entry: 85.0, sl: 81.0, tp: 93.0 },
    SENSEX: { strike: 79500, step: 100, entry: 210.0, sl: 197.5, tp: 235.0 },
  };

  const config = atmDefaults[underlying] || atmDefaults.NIFTY;
  const strikeInput = paperForm.querySelector('[name="strikePrice"]');
  if (strikeInput) {
    strikeInput.value = String(config.strike);
    strikeInput.step = String(config.step);
  }

  const entryEl = document.getElementById("deskEntryPrice");
  const stopEl = document.getElementById("deskStopLoss");
  const targetEl = document.getElementById("deskTargetPrice");
  if (entryEl) entryEl.value = config.entry.toFixed(2);
  if (stopEl) stopEl.value = config.sl.toFixed(2);
  if (targetEl) targetEl.value = config.tp.toFixed(2);

  renderPaperRiskPreview();
  window.syncLiveDeskFromForm?.();
}

export function incrementStrike(step) {
  const paperForm = document.getElementById("paperTradeForm");
  const input = paperForm?.querySelector('input[name="strikePrice"]');
  if (!input || !step) return;
  const current = Number(input.value || 0);
  input.value = String(Math.max(0, current + step));
  renderPaperRiskPreview();
  window.syncLiveDeskFromForm?.();
}

export function incrementHedgeStrike(step) {
  const paperForm = document.getElementById("paperTradeForm");
  const input = paperForm?.querySelector('input[name="hedgeStrikePrice"]');
  if (!input || !step) return;
  const current = Number(input.value || 0);
  input.value = String(Math.max(0, current + step));
  renderPaperRiskPreview();
  window.syncLiveDeskFromForm?.();
}

export function incrementLots(step) {
  const paperForm = document.getElementById("paperTradeForm");
  const input = paperForm?.querySelector('input[name="quantity"]');
  if (!input || !step) return;
  const current = Number(input.value || 1);
  input.value = String(Math.max(1, current + step));
  renderPaperRiskPreview();
}
