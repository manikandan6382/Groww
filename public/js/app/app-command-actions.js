import { byId } from "./app-helpers.js";
import { setTheme } from "./app-theme.js";
import { checkBrokerStatuses } from "./app-state.js";

export function executeCommandAction(action) {
  if (action === "quick-log-journal-trade") {
    window.setActiveView?.("journal");
    setTimeout(() => {
      const symbolInput = document.getElementById("formSymbol");
      const entryInput = document.getElementById("formEntryPrice");
      const exitInput = document.getElementById("formExitPrice");
      const stopInput = document.getElementById("formStopLoss");
      const targetInput = document.getElementById("formTargetPrice");
      const qtyInput = document.getElementById("formQuantity");
      const lotInput = document.getElementById("formLotSize");
      
      if (symbolInput) symbolInput.value = "NIFTY 24250 CE";
      if (entryInput) entryInput.value = "114.95";
      if (exitInput) exitInput.value = "110.00";
      if (stopInput) stopInput.value = "110.00";
      if (targetInput) targetInput.value = "125.00";
      if (qtyInput) qtyInput.value = "1";
      if (lotInput) lotInput.value = "65";
      
      entryInput?.dispatchEvent(new Event("input", { bubbles: true }));
      symbolInput?.focus();
      document.getElementById("tradeForm")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
  } else if (action === "quick-scalp-nifty-ce" || action === "quick-scalp-nifty-pe") {
    const isCe = action === "quick-scalp-nifty-ce";
    window.setActiveView?.("paper");
    setTimeout(() => {
      const form = byId("paperTradeForm");
      if (form) {
        form.querySelector(`input[name="optionType"][value="${isCe ? 'CALL' : 'PUT'}"]`)?.click();
        const under = form.querySelector('select[name="underlyingSymbol"]');
        if (under) under.value = "NIFTY";
        const strike = form.querySelector('input[name="strikePrice"]');
        if (strike) strike.value = isCe ? "24500" : "24400";
        const entry = form.querySelector('input[name="entryPrice"]');
        if (entry) entry.value = isCe ? "90.00" : "95.00";
        const target = form.querySelector('input[name="targetPrice"]');
        if (target) target.value = isCe ? "98.50" : "103.50";
        const stop = form.querySelector('input[name="stopLoss"]');
        if (stop) stop.value = isCe ? "85.50" : "90.50";
        entry?.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }, 150);
  } else if (action === "nav-dashboard") {
    window.setActiveView?.("dashboard");
  } else if (action === "nav-paper") {
    window.setActiveView?.("paper");
  } else if (action === "nav-foreign") {
    window.setActiveView?.("foreign");
  } else if (action === "nav-journal") {
    window.setActiveView?.("journal");
  } else if (action === "theme-blue") {
    setTheme("blue");
  } else if (action === "theme-emerald") {
    setTheme("emerald");
  } else if (action === "theme-violet") {
    setTheme("violet");
  } else if (action === "refresh-upstox") {
    checkBrokerStatuses();
  }
}
