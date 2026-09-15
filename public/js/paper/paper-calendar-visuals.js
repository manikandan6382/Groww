import { byId, escapeHtml, paperMoney, signedMoney } from "./paper-helpers.js";
import { paperState } from "./paper-state.js";
import { buildDayTooltip, buildTradeTooltip, buildWeekBuckets } from "./paper-calendar-buckets.js";

export function renderWeeklyVisuals(lab) {
  const trades = Array.isArray(lab.closedTrades) ? lab.closedTrades : [];
  const dailyTarget = byId("paperDailyBars");
  const calendarTarget = byId("paperTradeCalendar");
  if (!dailyTarget && !calendarTarget) return;

  const range = paperState.pnlRange || "week";
  const buckets = buildWeekBuckets(trades, range);
  const values = buckets.map((bucket) => bucket.pnl);
  const maxValue = Math.max(1, ...values.map((value) => Math.abs(value)));

  const totalRangePnl = buckets.reduce((sum, b) => sum + b.pnl, 0);
  const startingCapital = Number(lab.account?.starting_capital || 100000);
  const rangePnlPct = (totalRangePnl / startingCapital) * 100;

  const bottomDailyPnl = byId("bottomDailyPnl");
  if (bottomDailyPnl) {
    bottomDailyPnl.textContent = `${totalRangePnl >= 0 ? "+" : ""}${paperMoney.format(totalRangePnl)}`;
    bottomDailyPnl.className = totalRangePnl >= 0 ? "apple-numeral text-gain" : "apple-numeral text-loss";
  }
  const bottomDailyPnlPct = byId("bottomDailyPnlPct");
  if (bottomDailyPnlPct) {
    bottomDailyPnlPct.textContent = `${rangePnlPct >= 0 ? "+" : ""}${rangePnlPct.toFixed(2)}%`;
    bottomDailyPnlPct.className = `apple-pill-badge ${rangePnlPct >= 0 ? "badge-green" : "badge-loss"}`;
  }

  if (dailyTarget) {
    dailyTarget.innerHTML = buckets.map((bucket) => {
      const hasTrades = bucket.count > 0;
      const height = hasTrades ? Math.max(18, Math.round((Math.abs(bucket.pnl) / maxValue) * 78)) : 6;
      const cls = hasTrades ? (bucket.pnl >= 0 ? "gain" : "loss") : "quiet";
      const tooltip = buildDayTooltip(bucket);
      return `
        <div class="paper-bar ${cls}" tabindex="0" data-paper-tooltip="${escapeHtml(tooltip)}">
          <div class="bar-fill-track">
            <span class="bar-pill-fill" style="height:${height}px"></span>
          </div>
          <small class="bar-label">${bucket.label}</small>
        </div>
      `;
    }).join("");
  }

  if (calendarTarget) {
    const maxCalendarRows = 4;
    const calendarCells = Array.from({ length: maxCalendarRows }, (_, rowIndex) =>
      buckets.slice(0, 7).map((bucket) => renderCalendarCell(bucket, rowIndex, maxCalendarRows)).join("")
    ).join("");
    calendarTarget.innerHTML = `
      <div class="paper-calendar-days"><b>M</b><b>T</b><b>W</b><b>T</b><b>F</b><b>S</b><b>S</b></div>
      <div class="paper-calendar-cells">${calendarCells}</div>
      <div class="paper-calendar-legend"><span><i class="gain"></i> Profits</span><span><i class="loss"></i> Stops</span><span><i class="quiet"></i> Inactive</span></div>
    `;
  }
}

export function renderCalendarCell(bucket, tradeIndex, maxRows) {
  const trade = bucket.trades[tradeIndex];
  if (!trade) {
    const dayLabel = bucket.date.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" });
    return `<span class="paper-calendar-cell quiet" aria-hidden="true" tabindex="0" data-paper-tooltip="${escapeHtml(dayLabel)}\nNo practice trades logged"></span>`;
  }

  const hiddenTradeCount = bucket.trades.length - maxRows;
  const isOverflowCell = tradeIndex === maxRows - 1 && hiddenTradeCount > 0;
  const pnl = isOverflowCell
    ? bucket.trades.slice(tradeIndex).reduce((sum, item) => sum + Number(item.netPnl || 0), 0)
    : Number(trade.netPnl || 0);
  const cls = pnl < 0 ? "loss" : "gain";
  const intensity = bucket.count > 1 ? " strong" : "";
  const overflow = isOverflowCell ? " overflow" : "";
  const label = isOverflowCell
    ? `${bucket.label}: ${hiddenTradeCount + 1} more trades`
    : `${bucket.label}: ${trade.symbol} ${signedMoney(trade.netPnl || 0)}`;
  const tooltip = isOverflowCell ? buildDayTooltip(bucket) : buildTradeTooltip(trade, bucket);

  return `<span class="paper-calendar-cell ${cls}${intensity}${overflow}" tabindex="0" aria-label="${escapeHtml(label)}" data-paper-tooltip="${escapeHtml(tooltip)}"></span>`;
}

export function averageRewardRisk(trades) {
  const ratios = trades
    .map((trade) => {
      const entry = Number(trade.entryPrice || 0);
      const target = Number(trade.targetPrice || 0);
      const stop = Number(trade.stopLoss || 0);
      const risk = Math.abs(entry - stop);
      const reward = Math.abs(target - entry);
      return risk > 0 && reward > 0 ? reward / risk : 0;
    })
    .filter(Boolean);
  if (!ratios.length) return 0;
  return ratios.reduce((sum, value) => sum + value, 0) / ratios.length;
}

export function bestWinStreak(trades) {
  let current = 0;
  let best = 0;
  for (const trade of [...trades].sort((a, b) => String(a.exitDatetime || "").localeCompare(String(b.exitDatetime || "")))) {
    if (Number(trade.netPnl || 0) > 0) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}
