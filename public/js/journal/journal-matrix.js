import { escapeHtml, inr } from "./journal-helpers.js";

export function renderDailyStreakStrip(trades) {
  try {
    const strip = document.getElementById("dailyStreakStrip");
    if (!strip) return;

    const closed = (trades || []).filter((t) => t && t.status === "CLOSED");
    const dayGroups = new Map();

    closed.forEach((t) => {
      let day = "";
      if (typeof t.entryDatetime === "string" && t.entryDatetime.length >= 10) {
        day = t.entryDatetime.slice(0, 10);
      } else if (t.entryDatetime) {
        const d = new Date(t.entryDatetime);
        day = !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      } else {
        day = new Date().toISOString().slice(0, 10);
      }

      if (!dayGroups.has(day)) dayGroups.set(day, { count: 0, net: 0, wins: 0 });
      const g = dayGroups.get(day);
      g.count++;
      const net = Number.isFinite(Number(t.netPnl)) ? Number(t.netPnl) : 0;
      g.net += net;
      if (net > 0) g.wins++;
    });

    const days = Array.from(dayGroups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    const activeDaysEl = document.getElementById("timelineActiveDays");
    if (activeDaysEl) activeDaysEl.textContent = `${days.length} Active Trading Day${days.length === 1 ? "" : "s"}`;

    if (!days.length) {
      strip.innerHTML = '<div class="empty-state-mini">No trading sessions recorded in this range.</div>';
      return;
    }

    strip.innerHTML = days.map(([day, stats]) => {
      const isGain = stats.net >= 0;
      const winRate = stats.count > 0 ? (stats.wins / stats.count) * 100 : 0;
      const d = new Date(day);
      const dayLabel = !isNaN(d.getTime()) ? d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : day;

      return `
        <div class="streak-day-card ${isGain ? 'day-gain' : 'day-loss'}">
          <div class="day-card-header">
            <span class="day-date">${escapeHtml(dayLabel)}</span>
            <span class="day-badge ${isGain ? 'bg-gain' : 'bg-loss'}">${stats.wins}/${stats.count} W</span>
          </div>
          <div class="day-pnl ${isGain ? 'text-gain' : 'text-loss'}">${isGain ? "+" : ""}${inr.format(stats.net)}</div>
          <div class="day-progress-wrap"><div class="day-progress-bar" style="width: ${winRate}%"></div></div>
        </div>
      `;
    }).join("");
  } catch {
    const strip = document.getElementById("dailyStreakStrip");
    if (strip) strip.innerHTML = '<div class="empty-state-mini">Timeline standby.</div>';
  }
}

export function renderStrategyMatrix(trades) {
  try {
    const target = document.getElementById("strategyMatrix");
    if (!target) return;

    const closed = (trades || []).filter((t) => t && t.status === "CLOSED");
    const stratMap = new Map();

    closed.forEach((t) => {
      const tags = Array.isArray(t.strategyTags) && t.strategyTags.length ? t.strategyTags : ["Standard Scalp"];
      const specificTag = tags.find((tag) => tag !== "Trading Copilot Pro" && tag !== "General Setup") || tags[0] || "Standard Scalp";
      const cleanTag = specificTag === "0DTE Scalp" ? "Same-Day Expiry Scalp" : specificTag;

      if (!stratMap.has(cleanTag)) stratMap.set(cleanTag, { count: 0, wins: 0, net: 0 });
      const s = stratMap.get(cleanTag);
      s.count++;
      const net = Number.isFinite(Number(t.netPnl)) ? Number(t.netPnl) : 0;
      s.net += net;
      if (net > 0) s.wins++;
    });

    const sorted = Array.from(stratMap.entries()).sort((a, b) => b[1].net - a[1].net);
    if (!sorted.length) {
      target.innerHTML = '<div class="empty-state-mini">No strategy setups logged yet.</div>';
      return;
    }

    target.innerHTML = sorted.slice(0, 5).map(([tag, stats]) => {
      const wr = stats.count > 0 ? (stats.wins / stats.count) * 100 : 0;
      const isGain = stats.net >= 0;

      return `
        <div class="strategy-row">
          <div class="strat-name-col"><span class="strat-dot ${isGain ? 'win' : 'loss'}"></span><strong title="${escapeHtml(tag)}">${escapeHtml(tag)}</strong></div>
          <div class="strat-trades-col">${stats.count} trade${stats.count > 1 ? 's' : ''}</div>
          <div class="strat-wr-col"><div class="strat-wr-bar"><div style="width: ${wr}%"></div></div><span>${wr.toFixed(0)}% Win (${stats.wins}/${stats.count})</span></div>
          <div class="strat-pnl-col ${isGain ? 'text-gain' : 'text-loss'}">${isGain ? "+" : ""}${inr.format(stats.net)}</div>
        </div>
      `;
    }).join("");
  } catch {
    const target = document.getElementById("strategyMatrix");
    if (target) target.innerHTML = '<div class="empty-state-mini">Strategy matrix standby.</div>';
  }
}
