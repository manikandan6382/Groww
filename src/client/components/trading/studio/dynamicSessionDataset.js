import { getLocalDateKey } from "../../../utils/dateUtils";
import { getISODate, getWeekMonday, addDays, buildBar, summariseBars } from "./sessionBarBuilder";

export function buildDynamicSessionDataset(allTrades = [], range = "week", customStart = "", customEnd = "") {
  const trades = allTrades || [];
  const todayStr = getISODate(new Date());

  if (range === "custom") {
    const filtered = trades.filter((t) => {
      const d = t.exitDatetime?.split("T")[0] || t.entryDatetime?.split("T")[0] || todayStr;
      if (customStart && customEnd) return d >= customStart && d <= customEnd;
      if (customStart) return d >= customStart;
      return true;
    });

    const dateMap = new Map();
    for (const t of filtered) {
      const dStr = t.exitDatetime?.split("T")[0] || t.entryDatetime?.split("T")[0] || todayStr;
      if (!dateMap.has(dStr)) dateMap.set(dStr, []);
      dateMap.get(dStr).push(t);
    }

    const sortedDates = Array.from(dateMap.keys()).sort();
    const bars = sortedDates.map((dStr) => {
      const dt = new Date(dStr + "T12:00:00");
      const dayName = dt.toLocaleString("en-US", { weekday: "short" });
      const fullDay = dt.toLocaleString("en-US", { weekday: "long" });
      const dateShort = `${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      return buildBar(dateMap.get(dStr), dayName, fullDay, dateShort, dStr);
    });

    return {
      label: customStart && customEnd ? `${customStart} to ${customEnd}` : "Custom Range",
      ...summariseBars(bars),
      bars: bars.length > 0 ? bars : [buildBar([], "Custom", "Custom Window", customStart || todayStr.slice(5), customStart || todayStr)]
    };
  }

  if (range === "today") {
    const todayTrades = trades.filter((t) => getLocalDateKey(t.exitDatetime || t.entryDatetime) === todayStr);
    const bar = buildBar(todayTrades, "Today", "Today's Active Session", todayStr.slice(5), todayStr);
    const wins = todayTrades.filter((t) => (t.netPnl || 0) > 0);
    const losses = todayTrades.filter((t) => (t.netPnl || 0) <= 0);
    const winPnl = wins.reduce((acc, t) => acc + t.netPnl, 0);
    const lossPnl = Math.abs(losses.reduce((acc, t) => acc + t.netPnl, 0));
    return {
      label: "Today",
      totalPnl: bar.pnl,
      winCount: bar.wins,
      lossCount: bar.losses,
      profitFactor: lossPnl > 0 ? (winPnl / lossPnl).toFixed(2) : winPnl > 0 ? "4.00" : "0.00",
      bars: [bar]
    };
  }

  if (range === "week" || range === "last_week") {
    const weekOffset = range === "last_week" ? -7 : 0;
    const monday = getWeekMonday(addDays(new Date(), weekOffset));
    const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const DAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    const bars = DAY_NAMES.map((dayLabel, i) => {
      const dayDate = addDays(monday, i);
      const dateStr = getISODate(dayDate);
      const dateShort = `${String(dayDate.getMonth() + 1).padStart(2, "0")}-${String(dayDate.getDate()).padStart(2, "0")}`;
      const dayTrades = trades.filter((t) => getLocalDateKey(t.exitDatetime || t.entryDatetime) === dateStr);
      return buildBar(dayTrades, dayLabel, `${DAY_FULL[i]} (${dateShort})`, dateShort, dateStr);
    });

    return { label: range === "week" ? "This Week" : "Last Week", ...summariseBars(bars), bars };
  }

  if (range === "month") {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthStr = String(month + 1).padStart(2, "0");
    const lastDay = new Date(year, month + 1, 0).getDate();
    const monthName = now.toLocaleString("en-US", { month: "short" });

    const bands = [
      { label: "Wk 1", full: "Week 1", start: `${year}-${monthStr}-01`, end: `${year}-${monthStr}-07` },
      { label: "Wk 2", full: "Week 2", start: `${year}-${monthStr}-08`, end: `${year}-${monthStr}-14` },
      { label: "Wk 3", full: "Week 3", start: `${year}-${monthStr}-15`, end: `${year}-${monthStr}-21` },
      { label: "Wk 4", full: "Week 4", start: `${year}-${monthStr}-22`, end: `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}` },
    ];

    const bars = bands.map((w) => {
      const wTrades = trades.filter((t) => {
        const d = t.exitDatetime?.split("T")[0] || t.entryDatetime?.split("T")[0] || todayStr;
        return d >= w.start && d <= w.end;
      });
      return buildBar(wTrades, w.label, w.full, `${monthName} ${w.start.slice(8)} - ${w.end.slice(8)}`, w.start);
    });

    return { label: "This Month", ...summariseBars(bars), bars };
  }

  // ALL TIME
  const dateMap = new Map();
  for (const t of trades) {
    const dStr = t.exitDatetime?.split("T")[0] || t.entryDatetime?.split("T")[0] || todayStr;
    if (!dateMap.has(dStr)) dateMap.set(dStr, []);
    dateMap.get(dStr).push(t);
  }

  const sortedDates = Array.from(dateMap.keys()).sort();
  const bars = sortedDates.map((dStr) => {
    const dt = new Date(dStr + "T12:00:00");
    const dayName = dt.toLocaleString("en-US", { weekday: "short" });
    const fullDay = `${dt.toLocaleString("en-US", { weekday: "long" })} (${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")})`;
    const dateShort = `${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    return buildBar(dateMap.get(dStr), dayName, fullDay, dateShort, dStr);
  });

  return { label: "All Time", ...summariseBars(bars), bars: bars.length > 0 ? bars : [buildBar([], "–", "No Trades Yet", "--", todayStr)] };
}
