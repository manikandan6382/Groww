import { initViewNavigation, syncChannel } from "./journal/journal-state.js";
import { initTradingJournal, loadTradingJournal } from "./journal/journal-init.js";

if (typeof window !== "undefined") {
  window.loadTradingJournal = loadTradingJournal;
}

const tradeForm = typeof document !== "undefined" ? document.getElementById("tradeForm") : null;

if (syncChannel) {
  syncChannel.onmessage = (event) => {
    if (event.data?.type === "TRADE_MUTATION") {
      loadTradingJournal();
    }
  };
}

if (typeof document !== "undefined") {
  const bootstrap = () => {
    initViewNavigation(loadTradingJournal);
    initTradingJournal(tradeForm);
    loadTradingJournal();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
  } else {
    bootstrap();
  }

  document.addEventListener("portfoliox:trade-deleted", () => {
    if (document.getElementById("tradeForm")) {
      loadTradingJournal();
    }
  });
}
