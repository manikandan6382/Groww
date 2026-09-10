import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles/index.scss";

// 🚀 Auto-recover from stale dynamic chunk imports when a new build is deployed
if (typeof window !== "undefined") {
  // 🛡️ Suppress external Chrome DevTools / Web-Vitals extension injected script crash (startTime bug)
  window.addEventListener("error", (event) => {
    if (
      event.message?.includes("reading 'startTime'") ||
      event.error?.stack?.includes("reportAllChanges") ||
      (event.message?.includes("startTime") && (!event.filename || event.filename.includes("<anonymous>")))
    ) {
      event.preventDefault?.();
      event.stopImmediatePropagation?.();
      return true;
    }
  });

  window.addEventListener("vite:preloadError", (event) => {
    event?.preventDefault?.();
    console.warn("New build chunks detected. Auto-reloading application...");
    window.location.reload();
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
