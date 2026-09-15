import { getLocalDateKey } from "../../../utils/dateUtils";

function getWeekMonday(refDate = new Date()) {
  const d = new Date(refDate);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function filterTradesByRange(trades = [], range = "all", csStart = "", csEnd = "") {
  const todayKey = getLocalDateKey();
  if (range === "today") {
    return trades.filter((t) => getLocalDateKey(t.exitDatetime || t.entryDatetime) === todayKey);
  }
  if (range === "week" || range === "last_week") {
    const weekOffset = range === "last_week" ? -7 : 0;
    const monday = getWeekMonday(addDays(new Date(), weekOffset));
    const sunday = addDays(monday, 6);
    const startKey = getLocalDateKey(monday);
    const endKey = getLocalDateKey(sunday);
    return trades.filter((t) => {
      const td = getLocalDateKey(t.exitDatetime || t.entryDatetime);
      return td >= startKey && td <= endKey;
    });
  }
  if (range === "month") {
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return trades.filter((t) => {
      const td = getLocalDateKey(t.exitDatetime || t.entryDatetime);
      return td.startsWith(prefix);
    });
  }
  if (range === "custom") {
    return trades.filter((t) => {
      const td = getLocalDateKey(t.exitDatetime || t.entryDatetime);
      if (csStart && csEnd) return td >= csStart && td <= csEnd;
      if (csStart) return td >= csStart;
      return true;
    });
  }
  return trades;
}
