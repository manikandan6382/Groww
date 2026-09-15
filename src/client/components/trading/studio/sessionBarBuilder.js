import { getLocalDateKey } from "../../../utils/dateUtils";

export function getISODate(dt) {
  return getLocalDateKey(dt);
}

export function getWeekMonday(refDate = new Date()) {
  const d = new Date(refDate);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function buildBar(dayTrades, dayLabel, fullDayLabel, dateShort, dateStr) {
  const wins = dayTrades.filter((t) => (t.netPnl || 0) > 0);
  const losses = dayTrades.filter((t) => (t.netPnl || 0) <= 0);
  const dayNet = dayTrades.reduce((acc, t) => acc + (t.netPnl || 0), 0);
  const winPnl = wins.reduce((acc, t) => acc + (t.netPnl || 0), 0);
  const lossPnl = losses.reduce((acc, t) => acc + (t.netPnl || 0), 0);
  let cumPnl = 0;
  const spark = [0];
  dayTrades.forEach((t) => {
    cumPnl += (t.netPnl || 0);
    spark.push(cumPnl);
  });
  return {
    day: dayLabel,
    fullDay: fullDayLabel,
    date: dateShort,
    dateStr,
    pnl: Math.round(dayNet * 100) / 100,
    trades: dayTrades.length,
    wins: wins.length,
    losses: losses.length,
    winPnl: Math.round(winPnl * 100) / 100,
    lossPnl: Math.round(lossPnl * 100) / 100,
    sparkline: spark.length > 1 ? spark : [0, dayNet],
    tradesList: dayTrades.map((t) => ({
      symbol: t.symbol,
      tag: t.strategyTag || t.strategyTags || t.entryReason || "Practice Scalp",
      qty: `${t.lotSize || 75} (${t.quantity || 1} Lot)`,
      pnl: t.netPnl,
      status: t.closeReason || (t.netPnl >= 0 ? "TARGET_HIT" : "STOP_LOSS_HIT")
    }))
  };
}

export function summariseBars(bars) {
  const totalPnl = bars.reduce((acc, b) => acc + b.pnl, 0);
  const winCount = bars.reduce((acc, b) => acc + b.wins, 0);
  const lossCount = bars.reduce((acc, b) => acc + b.losses, 0);
  const grossWins = bars.reduce((acc, b) => acc + b.winPnl, 0);
  const grossLosses = Math.abs(bars.reduce((acc, b) => acc + b.lossPnl, 0));
  const pf = grossLosses > 0 ? (grossWins / grossLosses).toFixed(2) : grossWins > 0 ? "4.00" : "0.00";
  return { totalPnl: Math.round(totalPnl * 100) / 100, winCount, lossCount, profitFactor: pf };
}
