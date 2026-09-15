import { parseTradeDate, signedMoney } from "./paper-helpers.js";

export function getWeekStart(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const day = next.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + offset);
  return next;
}

export function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTradeInvestedAmount(trade) {
  const storedCapital = Number(trade.capitalUsed || trade.positionSize || 0);
  if (Number.isFinite(storedCapital) && storedCapital > 0) return storedCapital;
  const units = Number(trade.quantity || 0) * Math.max(1, Number(trade.lotSize || 1));
  return Math.abs(Number(trade.entryPrice || 0) * units);
}

export function buildWeekBuckets(trades, range = "week") {
  let startDate = getWeekStart(new Date());
  let daysCount = 7;
  let labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  if (range === "last_week") {
    const curStart = getWeekStart(new Date());
    startDate = new Date(curStart);
    startDate.setDate(curStart.getDate() - 7);
  } else if (range === "month") {
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    daysCount = Math.min(31, lastDay);
    labels = Array.from({ length: daysCount }, (_, i) => String(i + 1));
  } else if (range === "all") {
    daysCount = 14;
    const now = new Date();
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 13);
    labels = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    });
  }

  const buckets = Array.from({ length: daysCount }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return {
      label: labels[index] || String(index + 1),
      date,
      key: localDateKey(date),
      trades: [],
      count: 0,
      invested: 0,
      pnl: 0,
      wins: 0,
      losses: 0,
    };
  });
  const bucketByKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const trade of trades) {
    const date = parseTradeDate(trade.exitDatetime || trade.entryDatetime);
    const bucket = bucketByKey.get(localDateKey(date));
    if (!bucket) continue;
    const pnl = Number(trade.netPnl || 0);
    bucket.trades.push(trade);
    bucket.count += 1;
    bucket.invested += getTradeInvestedAmount(trade);
    bucket.pnl += pnl;
    if (pnl > 0) bucket.wins += 1;
    if (pnl < 0) bucket.losses += 1;
  }

  return buckets;
}

export function buildDayTooltip(bucket) {
  const dateText = bucket.date.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" });
  if (!bucket.count) return `${dateText}\nNo practice trades on this date`;
  const lines = [
    `📅 ${dateText}`,
    `📦 Closed Trades: ${bucket.count}`,
    `💰 Realized P&L: ${signedMoney(bucket.pnl)}`,
    `🎯 Wins/Losses: ${bucket.wins}W / ${bucket.losses}L`,
    "",
    "Trade Details:",
  ];
  bucket.trades.forEach((trade, idx) => {
    if (idx < 5) {
      const pnl = Number(trade.netPnl || 0);
      const sign = pnl >= 0 ? "+" : "";
      const reason = trade.closeReason === "TARGET_HIT" ? "Target Hit" : trade.closeReason === "STOP_LOSS_HIT" ? "SL Hit" : (trade.closeReason || "Closed");
      lines.push(`• ${trade.symbol}: ${sign}${signedMoney(pnl)} (${reason})`);
    }
  });
  if (bucket.trades.length > 5) lines.push(`+ ${bucket.trades.length - 5} more trades`);
  return lines.join("\n");
}

export function buildTradeTooltip(trade, bucket) {
  const exitDate = parseTradeDate(trade.exitDatetime || trade.entryDatetime);
  const dateText = exitDate.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" });
  const timeText = exitDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const pnl = Number(trade.netPnl || 0);
  const reasonText = trade.closeReason === "TARGET_HIT" ? "🎯 Target Hit" : trade.closeReason === "STOP_LOSS_HIT" ? "🛑 Stop Loss Hit" : "⚡ " + (trade.closeReason || "Closed");
  const qty = Number(trade.quantity || 1);
  const lot = Number(trade.lotSize || 1);
  return [
    `⚡ ${trade.symbol}`,
    `📅 ${dateText} at ${timeText}`,
    `Status: ${pnl >= 0 ? "✅ WIN" : "❌ LOSS"} (${reasonText})`,
    `Qty: ${qty} lot (${qty * lot} units)`,
    `Entry: ₹${Number(trade.entryPrice || 0).toFixed(2)} → Exit: ₹${Number(trade.exitPrice || 0).toFixed(2)}`,
    `Realized P&L: ${signedMoney(pnl)}`,
    `Day Cumulative P&L: ${signedMoney(bucket.pnl)}`,
  ].join("\n");
}
