import { byId } from "./paper-helpers.js";

export function startLiveClock() {
  const clockEl = document.getElementById("liveClock");
  if (!clockEl) return;
  const update = () => {
    const now = new Date();
    const options = {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZoneName: "short",
    };
    let formatted = now.toLocaleString("en-IN", options);
    formatted = formatted.replace("GMT+5:30", "IST").replace("pm", "PM").replace("am", "AM");
    clockEl.textContent = formatted;
  };
  update();
  setInterval(update, 1000);
}

export function setStreamStatusUi(status) {
  const statusBadge = byId("paperStreamStatus");
  if (!statusBadge) return;
  if (status === "live") {
    statusBadge.className = "stream-pulse-badge live";
    const label = statusBadge.querySelector(".pulse-label");
    if (label) label.textContent = "LIVE STREAM";
    statusBadge.dataset.paperTooltip = "Real-Time Execution Engine: Connected & streaming live practice data (SSE active)";
  } else if (status === "reconnecting") {
    statusBadge.className = "stream-pulse-badge reconnecting";
    const label = statusBadge.querySelector(".pulse-label");
    if (label) label.textContent = "RECONNECTING...";
    statusBadge.dataset.paperTooltip = "SSE Connection dropped. Auto-reconnecting to stream...";
  } else {
    statusBadge.className = "stream-pulse-badge offline";
    const label = statusBadge.querySelector(".pulse-label");
    if (label) label.textContent = "OFFLINE";
    statusBadge.dataset.paperTooltip = "Execution stream offline. Check internet connection.";
  }
}

export function updateDeskMarketHoursStatus() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const istDate = new Date(utc + 3600000 * 5.5);
  const day = istDate.getDay();
  const hour = istDate.getHours();
  const min = istDate.getMinutes();
  const timeInMinutes = hour * 60 + min;

  const isWeekday = day >= 1 && day <= 5;
  const isMarketOpen = isWeekday && timeInMinutes >= (9 * 60 + 15) && timeInMinutes <= (15 * 60 + 30);

  const badge = byId("deskMarketStatusBadge");
  if (badge) {
    if (isMarketOpen) {
      badge.textContent = "🟢 Live Market (09:15–15:30 IST)";
      badge.className = "desk-live-status-pill";
      badge.style.background = "";
      badge.style.borderColor = "";
      badge.style.color = "";
    } else {
      badge.textContent = "🌙 Market Closed (Will run next session)";
      badge.className = "desk-live-status-pill text-muted-clean";
      badge.style.background = "rgba(255, 255, 255, 0.06)";
      badge.style.borderColor = "rgba(255, 255, 255, 0.12)";
      badge.style.color = "#94a3b8";
    }
  }
}
