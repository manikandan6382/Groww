import { inr } from "./journal-helpers.js";
import { tradeState } from "./journal-state.js";

export function renderMasterKPIDeck(trades, analytics) {
  const closed = trades.filter((t) => t.status === "CLOSED");
  const winners = closed.filter((t) => Number(t.netPnl || 0) > 0);
  const losers = closed.filter((t) => Number(t.netPnl || 0) < 0);

  const totalNet = closed.reduce((sum, t) => sum + Number(t.netPnl || 0), 0);
  const grossProfit = winners.reduce((sum, t) => sum + Number(t.netPnl || 0), 0);
  const grossLoss = Math.abs(losers.reduce((sum, t) => sum + Number(t.netPnl || 0), 0));
  const totalCharges = closed.reduce((sum, t) => sum + Number(t.charges || 56), 0);

  const n = closed.length;
  const w = winners.length;
  const rawWinRate = n > 0 ? (w / n) * 100 : 0;
  const z = 1.96;
  const p_hat = n > 0 ? w / n : 0;
  const wilsonLower = n > 0
    ? ((p_hat + (z * z) / (2 * n) - z * Math.sqrt((p_hat * (1 - p_hat)) / n + (z * z) / (4 * n * n))) / (1 + (z * z) / n)) * 100
    : 0;

  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 9.99 : 0;
  const avgWin = w > 0 ? grossProfit / w : 0;
  const avgLoss = losers.length > 0 ? grossLoss / losers.length : 0;
  const netEv = n > 0 ? totalNet / n : 0;

  const storySummaryEl = document.getElementById("journalStorySummary");
  if (storySummaryEl) {
    if (n > 0) {
      const isProfitable = totalNet >= 0;
      const netFormatted = inr.format(Math.abs(totalNet));
      const rangeLabel = tradeState.range === "today" ? "Today's" : tradeState.range === "week" ? "This Week's" : tradeState.range === "month" ? "This Month's" : "Executive";
      const netDesc = isProfitable
        ? `<span class="story-profit-pill">Net Banked: <strong>+${netFormatted}</strong> 🚀</span>`
        : `<span class="story-profit-pill loss">Capital Shield: <strong>-${netFormatted}</strong> 🛡️</span>`;
      storySummaryEl.innerHTML = `<strong>${rangeLabel} Summary:</strong> ${n} Trades Logged · <span class="text-gain font-bold">${w} Target Wins</span> · <span class="text-loss font-bold">${losers.length} Protected Stops</span> · ${netDesc}`;
    } else {
      storySummaryEl.textContent = "Every trade explained in plain English — see how much money you made and which strategies worked.";
    }
  }

  const pnlEl = document.getElementById("kpiNetPnl");
  const pnlBadge = document.getElementById("kpiPnlPercent");
  if (pnlEl) {
    pnlEl.textContent = `${totalNet >= 0 ? "+" : ""}${inr.format(totalNet)}`;
    pnlEl.className = `kpi-main-val ${totalNet >= 0 ? "text-gain" : "text-loss"}`;
  }
  if (pnlBadge) {
    const startingCapital = Number(analytics?.startingCapital || 10000);
    const retPct = startingCapital ? (totalNet / startingCapital) * 100 : 0;
    pnlBadge.textContent = `${retPct >= 0 ? "+" : ""}${retPct.toFixed(2)}%`;
    pnlBadge.className = `kpi-badge ${retPct >= 0 ? "badge-gain" : "badge-loss"}`;
  }

  const setT = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setT("kpiGrossProfit", `+${inr.format(grossProfit)}`);
  setT("kpiGrossLoss", `-${inr.format(grossLoss)}`);
  setT("kpiCharges", inr.format(totalCharges));
  setT("donutWinRateText", `${rawWinRate.toFixed(0)}%`);
  setT("donutRatioText", `${w} Won / ${losers.length} Cut`);
  setT("legendWins", String(w));
  setT("legendLosses", String(losers.length));
  setT("kpiWilsonFloor", `${Math.max(0, wilsonLower).toFixed(1)}%`);

  const C = 238.761;
  const winLen = (n > 0 ? w / n : 0) * C;
  const lossLen = (n > 0 ? losers.length / n : 0) * C;
  const winSeg = document.getElementById("donutWinSegment");
  const lossSeg = document.getElementById("donutLossSegment");
  if (winSeg) { winSeg.style.strokeDasharray = `${winLen} ${C - winLen}`; winSeg.style.strokeDashoffset = "0"; }
  if (lossSeg) { lossSeg.style.strokeDasharray = `${lossLen} ${C - lossLen}`; lossSeg.style.strokeDashoffset = `-${winLen}`; }

  setT("kpiProfitFactor", n > 0 ? (profitFactor >= 9.99 ? "9.99x" : `${profitFactor.toFixed(2)}x`) : "0.00x");
  setT("kpiAvgWin", inr.format(avgWin));
  setT("kpiAvgLoss", inr.format(avgLoss));

  const evEl = document.getElementById("kpiNetEv");
  if (evEl) {
    evEl.textContent = `${netEv >= 0 ? "+" : ""}${inr.format(netEv)}`;
    evEl.className = netEv >= 0 ? "text-cyan" : "text-loss";
  }

  const edgeBadge = document.getElementById("kpiEdgeBadge");
  if (edgeBadge) {
    edgeBadge.textContent = n === 0 ? "Awaiting Trades" : profitFactor >= 2.0 ? "Institutional Edge" : profitFactor >= 1.25 ? "Positive Edge" : "Negative Edge";
    edgeBadge.className = `kpi-badge ${profitFactor >= 1.25 ? "badge-gain" : profitFactor > 0 ? "badge-loss" : "badge-neutral"}`;
  }

  let followedCount = 0;
  trades.forEach((t) => { if (t.followedPlan !== false) followedCount++; });
  const disciplineScore = trades.length > 0 ? (followedCount / trades.length) * 100 : 100;
  setT("kpiRuleScore", `${disciplineScore.toFixed(0)}%`);

  let streakType = "";
  let streakLen = 0;
  for (let i = closed.length - 1; i >= 0; i--) {
    const type = Number(closed[i].netPnl || 0) > 0 ? "W" : "L";
    if (!streakType) { streakType = type; streakLen = 1; }
    else if (streakType === type) { streakLen++; }
    else break;
  }
  setT("kpiCurrentStreak", streakLen > 0 ? `${streakLen} ${streakType === "W" ? "Wins" : "Losses"}` : "--");
}
