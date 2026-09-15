import { fetchJson, setPaperStatus } from "./paper-helpers.js";
import { playTactileChime, showDeskToast } from "./paper-audio-fx.js";
import { optionLotSizes, paperRuntime } from "./paper-state.js";

export async function createPaperPosition(event) {
  if (event) event.preventDefault();
  if (paperRuntime.isDeployingOrder) return;

  const currentForm = document.getElementById("paperTradeForm");
  if (!currentForm) return;

  const btnDeploy = document.getElementById("btnDeployPracticeTrade");
  const origBtnHtml = btnDeploy ? btnDeploy.innerHTML : "";

  const payload = Object.fromEntries(new FormData(currentForm).entries());
  const entry = Number(payload.currentPrice || 0);
  const stop = Number(payload.stopLoss || 0);
  const target = Number(payload.targetPrice || 0);
  const optType = payload.optionType || "CALL";
  const sym = payload.underlyingSymbol || "NIFTY";
  const strike = payload.strikePrice || "24200";
  const qty = Number(payload.quantity || 1);
  const isSpread = payload.strategyMode === "SPREAD";

  if (!entry || entry <= 0) {
    showDeskToast("⚠️ Missing Entry Price", "Please enter a valid Option Entry Price (₹).", "🛑");
    setPaperStatus("Enter Entry Price", true);
    return;
  }

  if (isSpread) {
    const hedgeStrike = Number(payload.hedgeStrikePrice || (optType === "CALL" ? Number(strike) + 100 : Number(strike) - 100));
    const hedgePrice = Number(payload.hedgePrice || (entry * 0.45));
    const netDebit = Math.max(0.05, entry - hedgePrice);
    const strikeWidth = Math.abs(hedgeStrike - Number(strike));
    const spreadType = optType === "CALL" ? "Bull Call Spread" : "Bear Put Spread";

    payload.symbol = `${sym} ${strike}/${hedgeStrike} ${spreadType}`;
    payload.currentPrice = netDebit.toFixed(2);
    payload.stopLoss = (netDebit * 0.4).toFixed(2);
    payload.targetPrice = (strikeWidth * 0.85).toFixed(2);
    payload.entryReason = `Vertical Defined-Risk Spread · Max Loss: ₹${(netDebit * (optionLotSizes[sym] || 65) * qty).toFixed(0)}`;
    payload.personalNotes = `[SPREAD_BUNDLE] Long ${strike} @ ₹${entry.toFixed(2)} + Short ${hedgeStrike} @ ₹${hedgePrice.toFixed(2)}`;
  } else {
    if (stop >= entry) {
      showDeskToast("⚠️ Risk Limit Warning", `Stop Loss (₹${stop.toFixed(2)}) must be below Entry Price (₹${entry.toFixed(2)})`, "🛑");
      setPaperStatus("Invalid Stop Loss", true);
      return;
    }
    if (target <= entry) {
      showDeskToast("⚠️ Target Warning", `Target Price (₹${target.toFixed(2)}) must be above Entry Price (₹${entry.toFixed(2)})`, "🎯");
      setPaperStatus("Invalid Target", true);
      return;
    }
  }

  paperRuntime.isDeployingOrder = true;
  if (btnDeploy) {
    btnDeploy.disabled = true;
    btnDeploy.classList.add("is-loading");
    btnDeploy.innerHTML = `<span class="pad-spinner"></span> <span class="cta-text">Executing Order...</span>`;
  }
  setPaperStatus("Deploying...");

  try {
    const chosenMode = payload.feedMode || document.getElementById("deskFeedMode")?.value || "LIVE";
    payload.feedMode = chosenMode;
    payload.lotSize = optionLotSizes[String(sym).toUpperCase()] || 65;
    payload.isSandbox = chosenMode === "MANUAL";
    
    if (paperRuntime.isSlippageSimulationEnabled) {
      const adverseSlippage = 0.50;
      const adjustedEntry = Number((entry + adverseSlippage).toFixed(2));
      payload.currentPrice = adjustedEntry.toFixed(2);
      payload.entryPrice = adjustedEntry.toFixed(2);
      payload.personalNotes = `${payload.personalNotes || ""} [SLIPPAGE: -0.50pt spread penalty applied (Entry: ₹${adjustedEntry})]`.trim();
    }
    
    const result = await fetchJson("/api/live-alerts/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    playTactileChime();
    const tradeItem = result?.item;
    if (tradeItem && tradeItem.status === "CLOSED") {
      showDeskToast(
        "⚡ Trade Auto-Completed",
        `${payload.symbol || sym} reached target/SL immediately at live LTP. Auto-saved to Trading Journal!`,
        "🎯"
      );
      setPaperStatus("⚡ Trade Executed & Saved to Journal");
    } else {
      const isLive = chosenMode === "LIVE";
      showDeskToast(
        isLive ? "🟢 Live Upstox Stream Active" : "🎮 Manual Sandbox Active",
        `${payload.symbol || sym} · ${qty} ${qty === 1 ? "Lot" : "Lots"} (${isLive ? "Continuous auto-exit monitoring" : "Manual LTP simulation ready"})`,
        isLive ? "🟢" : "🎮"
      );
      setPaperStatus(isLive ? "🟢 Live Stream Connected & Monitoring" : "🎮 Manual Sandbox Ready");
    }
    
    window.deskChannel?.postMessage({ type: "TRADE_MUTATION" });
    await window.loadPaperLab?.();
    
    const activeSection = document.getElementById("sectionActiveTrades");
    activeSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    showDeskToast("Execution Error", error.message, "❌");
    setPaperStatus(error.message, true);
  } finally {
    paperRuntime.isDeployingOrder = false;
    if (btnDeploy) {
      btnDeploy.disabled = false;
      btnDeploy.classList.remove("is-loading");
      btnDeploy.innerHTML = origBtnHtml;
    }
  }
}
