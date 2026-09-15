import { byId, fetchJson, setPaperStatus } from "./paper-helpers.js";
import { playTactileChime, showDeskToast } from "./paper-audio-fx.js";
import { paperRuntime } from "./paper-state.js";
import { updateDeskMarketHoursStatus } from "./paper-market-clock.js";

export async function loadCopilotSetupIntoForm(e) {
  if (e && typeof e.preventDefault === "function") e.preventDefault();
  if (paperRuntime.isAutoDeploying) return;
  paperRuntime.isAutoDeploying = true;

  const btn = document.getElementById("btnFastDeployLiveSignal") || document.getElementById("btnDeployCopilotPractice");
  const origHtml = btn ? btn.innerHTML : "";
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="pad-spinner"></span> Deploying Live Upstox Signal...`;
  }
  setPaperStatus("Deploying Live Market Signal...");

  try {
    const res = await fetchJson("/api/live-alerts/auto-deploy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    playTactileChime();
    const trade = res?.item;
    showDeskToast(
      "⚡ Live Upstox Trade Deployed",
      `${trade?.symbol || "NIFTY"} · Live Entry @ ₹${Number(trade?.entryPrice || 100).toFixed(2)} (Active in Section 3)`,
      "🚀"
    );
    setPaperStatus(`⚡ Live ${trade?.symbol || "NIFTY"} Position Deployed!`);

    window.deskChannel?.postMessage({ type: "TRADE_MUTATION" });
    await window.loadPaperLab?.();

    const activeSection = document.getElementById("sectionActiveTrades");
    activeSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    showDeskToast("Deployment Error", err.message, "❌");
    setPaperStatus(err.message, true);
  } finally {
    paperRuntime.isAutoDeploying = false;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origHtml;
    }
  }
}

export function loadCopilotSetupIntoJournal() {
  const journalLink = document.querySelector('a[href="/journal"], a[href="#journal"]');
  if (journalLink) journalLink.click();
  else location.hash = "#journal";
  
  setTimeout(() => {
    const journalForm = document.getElementById("tradeLogForm");
    if (journalForm) {
      journalForm.classList.remove("hidden");
      journalForm.style.display = "block";
      
      const setVal = (sel, val) => {
        const el = journalForm.querySelector(sel);
        if (el) el.value = val;
      };
      setVal('[name="symbol"]', "NIFTY 24300 PE");
      setVal('[name="instrumentType"]', "OPTION");
      setVal('[name="optionType"]', "PUT");
      setVal('[name="strikePrice"]', "24300");
      setVal('[name="entryPrice"]', "83.00");
      setVal('[name="stopLoss"]', "75.00");
      setVal('[name="targetPrice"]', "102.00");
      setVal('[name="positionSize"]', "65");
      setVal('[name="entryReason"]', "Trading Copilot Pro: 24,300 CE Institutional Wall Rejection");
      
      journalForm.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 150);
}

export function syncLiveDeskFromForm() {
  const paperForm = document.getElementById("paperTradeForm");
  if (!paperForm) return;
  const optType = paperForm.querySelector('input[name="optionType"]:checked')?.value || "PUT";
  const sym = paperForm.querySelector('[name="underlyingSymbol"]')?.value || "NIFTY";
  const strike = paperForm.querySelector('[name="strikePrice"]')?.value || "24300";
  const entry = Number(paperForm.querySelector('[name="currentPrice"]')?.value || 83);
  const sl = Number(paperForm.querySelector('[name="stopLoss"]')?.value || 75);
  const target = Number(paperForm.querySelector('[name="targetPrice"]')?.value || 102);

  const fullSym = `${sym} ${strike} ${optType === "CALL" ? "CE" : "PE"}`;
  const symEl = byId("deskLiveSymbol");
  if (symEl) symEl.textContent = fullSym;

  const ltpEl = byId("deskLiveLtp");
  if (ltpEl) ltpEl.textContent = `LTP: ₹${entry.toFixed(2)}`;

  const targetDist = Math.abs(target - entry);
  const stopDist = Math.abs(entry - sl);

  const targetDistEl = byId("deskLiveTargetDist");
  if (targetDistEl) targetDistEl.textContent = `Distance: +${targetDist.toFixed(2)} pts`;

  const stopDistEl = byId("deskLiveStopDist");
  if (stopDistEl) stopDistEl.textContent = `Buffer: ${stopDist.toFixed(2)} pts`;

  const markerEntry = byId("markerEntryText");
  if (markerEntry) markerEntry.textContent = `Entry: ₹${entry.toFixed(2)}`;

  const markerSl = byId("markerSlText");
  if (markerSl) markerSl.textContent = `SL: ₹${sl.toFixed(2)}`;

  const markerTarget = byId("markerTargetText");
  if (markerTarget) markerTarget.textContent = `Target: ₹${target.toFixed(2)}`;

  const totalRange = Math.max(0.1, target - sl);
  const curPos = Math.max(0, Math.min(100, ((entry - sl) / totalRange) * 100));

  const railFill = byId("deskRailFill");
  if (railFill) railFill.style.width = `${curPos}%`;

  const railPin = byId("deskRailPin");
  if (railPin) railPin.style.left = `${curPos}%`;

  updateDeskMarketHoursStatus();
}
