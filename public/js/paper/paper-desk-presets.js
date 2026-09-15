import { setPaperStatus } from "./paper-helpers.js";
import { renderPaperRiskPreview } from "./paper-risk-preview.js";

export function initDeskAiPresets() {
  const btnAtm = document.getElementById("btnPresetAtmScalp");
  btnAtm?.addEventListener("click", () => {
    document.querySelectorAll(".btn-pad-preset, .btn-studio-preset, .btn-desk-preset").forEach((b) => b.classList.remove("active", "active-pill", "active-glow"));
    btnAtm.classList.add("active");
    const entryEl = document.getElementById("deskEntryPrice");
    const stopEl = document.getElementById("deskStopLoss");
    const targetEl = document.getElementById("deskTargetPrice");
    if (entryEl) entryEl.value = "83.00";
    if (stopEl) stopEl.value = "79.00";
    if (targetEl) targetEl.value = "91.00";
    renderPaperRiskPreview();
    window.syncLiveDeskFromForm?.();
    setPaperStatus("⚡ ATM Scalp Loaded (₹260 Risk · ₹520 Aim)");
  });

  const btnSafe = document.getElementById("btnPresetSafeRr");
  btnSafe?.addEventListener("click", () => {
    document.querySelectorAll(".btn-pad-preset, .btn-studio-preset, .btn-desk-preset").forEach((b) => b.classList.remove("active", "active-pill", "active-glow"));
    btnSafe.classList.add("active");
    const entryEl = document.getElementById("deskEntryPrice");
    const stopEl = document.getElementById("deskStopLoss");
    const targetEl = document.getElementById("deskTargetPrice");
    const entry = Number(entryEl?.value || 83);
    if (stopEl) stopEl.value = (entry - 3.80).toFixed(2);
    if (targetEl) targetEl.value = (entry + 7.60).toFixed(2);
    renderPaperRiskPreview();
    window.syncLiveDeskFromForm?.();
    setPaperStatus("🛡️ Safe 1:2.0 R:R Loaded (₹247 Risk · ₹494 Aim)");
  });

  const btnHero = document.getElementById("btnPresetHeroZero");
  btnHero?.addEventListener("click", () => {
    document.querySelectorAll(".btn-pad-preset, .btn-studio-preset, .btn-desk-preset").forEach((b) => b.classList.remove("active", "active-pill", "active-glow"));
    btnHero.classList.add("active");
    const entryEl = document.getElementById("deskEntryPrice");
    const stopEl = document.getElementById("deskStopLoss");
    const targetEl = document.getElementById("deskTargetPrice");
    const entry = Number(entryEl?.value || 83);
    if (stopEl) stopEl.value = Math.max(0.05, entry - 4.50).toFixed(2);
    if (targetEl) targetEl.value = (entry + 9.00).toFixed(2);
    renderPaperRiskPreview();
    window.syncLiveDeskFromForm?.();
    setPaperStatus("🎯 Momentum Scalp Loaded (₹292 Risk · ₹585 Aim)");
  });

  document.querySelectorAll("[data-quick-lot]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-quick-lot]").forEach((b) => b.classList.remove("active", "active-pill"));
      btn.classList.add("active");
      const paperForm = document.getElementById("paperTradeForm");
      const qtyInput = paperForm?.querySelector('input[name="quantity"]');
      if (qtyInput) {
        qtyInput.value = btn.dataset.quickLot;
        renderPaperRiskPreview();
        window.syncLiveDeskFromForm?.();
      }
    });
  });
}

export function toggleSpreadMode(mode) {
  const modeInput = document.getElementById("deskStrategyMode");
  if (modeInput) modeInput.value = mode;

  document.querySelectorAll(".btn-spread-mode").forEach((b) => {
    b.classList.toggle("active", b.dataset.spreadMode === mode);
  });

  const isSpread = mode === "SPREAD";
  const hedgeCard = document.getElementById("spreadHedgeLegCard");
  const singleProtection = document.getElementById("cardSingleLegProtection");
  const beStat = document.getElementById("spreadBreakevenStat");
  const beDivider = document.getElementById("spreadBreakevenDivider");
  const payoffDock = document.getElementById("spreadPayoffDock");

  if (hedgeCard) hedgeCard.style.display = isSpread ? "block" : "none";
  if (singleProtection) singleProtection.style.display = isSpread ? "none" : "block";
  if (beStat) beStat.style.display = isSpread ? "flex" : "none";
  if (beDivider) beDivider.style.display = isSpread ? "block" : "none";
  if (payoffDock) payoffDock.style.display = isSpread ? "block" : "none";

  const callDesc = document.getElementById("callSentimentDesc");
  const putDesc = document.getElementById("putSentimentDesc");
  if (callDesc) callDesc.textContent = isSpread ? "Bull Call Vertical Spread" : "Bullish Breakout Scalp";
  if (putDesc) putDesc.textContent = isSpread ? "Bear Put Vertical Spread" : "Bearish Breakdown Scalp";

  const capLabel = document.getElementById("deskCapitalLabel");
  const riskLabel = document.getElementById("deskRiskLabel");
  const rewLabel = document.getElementById("deskRewardLabel");
  if (capLabel) capLabel.textContent = isSpread ? "Net Debit Outlay" : "Capital Outlay";
  if (riskLabel) riskLabel.textContent = isSpread ? "Max Risk (Defined)" : "Max Risk";
  if (rewLabel) rewLabel.textContent = isSpread ? "Max Gain (Capped)" : "Target Profit";

  const paperForm = document.getElementById("paperTradeForm");
  if (isSpread && paperForm) {
    const underlying = String(paperForm.querySelector('[name="underlyingSymbol"]')?.value || "NIFTY").toUpperCase();
    const optType = paperForm.querySelector('input[name="optionType"]:checked')?.value || "CALL";
    const strike = Number(paperForm.querySelector('[name="strikePrice"]')?.value || 24200);
    const step = underlying === "BANKNIFTY" || underlying === "SENSEX" ? 100 : 50;
    const hedgeStrike = optType === "CALL" ? strike + (step * 2) : strike - (step * 2);
    
    const hedgeStrikeEl = document.getElementById("deskHedgeStrike");
    if (hedgeStrikeEl) hedgeStrikeEl.value = String(hedgeStrike);
    
    const hedgePremEl = document.getElementById("deskHedgePremium");
    const longPrem = Number(document.getElementById("deskEntryPrice")?.value || 83);
    if (hedgePremEl && (!hedgePremEl.value || Number(hedgePremEl.value) <= 0 || Number(hedgePremEl.value) >= longPrem)) {
      hedgePremEl.value = Math.max(5, (longPrem * 0.45)).toFixed(2);
    }
  }

  renderPaperRiskPreview();
  window.syncLiveDeskFromForm?.();
}
