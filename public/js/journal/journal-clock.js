let journalClockTimer = null;

export function initJournalMarketClock() {
  updateJournalMarketClock();
  if (!journalClockTimer) {
    journalClockTimer = setInterval(updateJournalMarketClock, 1000);
  }
}

export function updateJournalMarketClock() {
  const statusTextEl = document.getElementById("journalMarketStatusText");
  const pulseEl = document.getElementById("journalMarketPulse");
  const badgeEl = document.getElementById("journalMarketStatusBadge");
  if (!statusTextEl) return;

  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const ist = new Date(utc + (3600000 * 5.5));

  const day = ist.getDay();
  const hour = ist.getHours();
  const min = ist.getMinutes();
  const sec = ist.getSeconds();
  const totalMins = hour * 60 + min;

  const isWeekend = day === 0 || day === 6;
  const isPreOpen = !isWeekend && totalMins >= 540 && totalMins < 555;
  const isRegularOpen = !isWeekend && totalMins >= 555 && totalMins < 930;
  const isPostMarket = !isWeekend && totalMins >= 930 && totalMins < 960;

  if (isRegularOpen) {
    const closeTotalMins = 930;
    const minsLeft = closeTotalMins - totalMins - 1;
    const hrsLeft = Math.floor(minsLeft / 60);
    const remMins = minsLeft % 60;
    const timeStr = `${hrsLeft}h ${String(remMins).padStart(2, "0")}m`;

    statusTextEl.textContent = `🟢 Live Market · Closes in ${timeStr}`;
    if (pulseEl) pulseEl.className = "pulse-beacon win";
    if (badgeEl) badgeEl.className = "apple-status-pill market-bell-badge live-open";
  } else if (isPreOpen) {
    statusTextEl.textContent = "⚡ Pre-Open Discovery (09:00–09:15)";
    if (pulseEl) pulseEl.className = "pulse-beacon cyan";
    if (badgeEl) badgeEl.className = "apple-status-pill market-bell-badge live-pre";
  } else if (isPostMarket) {
    statusTextEl.textContent = "🔒 Post-Market Settlement";
    if (pulseEl) pulseEl.className = "pulse-beacon";
    if (badgeEl) badgeEl.className = "apple-status-pill market-bell-badge";
  } else {
    const nextDayStr = isWeekend ? "Opens Mon 09:15 IST" : totalMins < 540 ? "Opens Today 09:15 IST" : "Opens Tomorrow 09:15 IST";
    statusTextEl.textContent = `🌙 Market Closed · ${nextDayStr}`;
    if (pulseEl) pulseEl.className = "pulse-beacon muted";
    if (badgeEl) badgeEl.className = "apple-status-pill market-bell-badge closed";
  }
}
