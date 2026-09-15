import { byId } from "./app-helpers.js";
import { state } from "./app-state.js";

export function fillTradeFromWatch(sym, ltp) {
  window.setActiveView?.("journal");
  setTimeout(() => {
    const symInput = byId("formTradingsymbol");
    const entryInput = byId("formEntryPrice");
    const qtyInput = byId("formQuantity");
    const slInput = byId("formStopLoss");
    const targetInput = byId("formTargetPrice");
    if (symInput) symInput.value = sym;
    if (entryInput && ltp > 0) {
      entryInput.value = ltp.toFixed(2);
      entryInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
    const cash = state.margins?.net || 100000;
    const slPrice = +(ltp * 0.98).toFixed(2);
    const suggestedQty = Math.max(1, Math.floor((cash * 0.01) / Math.max(1, ltp - slPrice)));
    if (qtyInput) {
      qtyInput.value = suggestedQty;
      qtyInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (slInput) slInput.value = slPrice;
    if (targetInput) targetInput.value = +(ltp * 1.04).toFixed(2);
    byId("tradeForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 150);
}
