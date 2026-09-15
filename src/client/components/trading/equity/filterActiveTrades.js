const getTradeDate = (t) => {
  if (!t) return new Date().toISOString().split("T")[0];
  const raw = t?.exitDatetime || t?.entryDatetime;
  if (typeof raw === "string" && raw.includes("T")) return raw.split("T")[0];
  if (typeof raw === "string" && raw.length >= 10) return raw.slice(0, 10);
  return new Date().toISOString().split("T")[0];
};

export function filterActiveTrades(journalTrades = [], journalRange = "all") {
  const list = (journalTrades || []).filter((t) => {
    if (!t) return false;
    const isSettled = t.status === "CLOSED" || t.status === "COMPLETED" || t.exitPrice !== undefined || t.realizedPnl !== undefined || t.netPnl !== undefined;
    if (!isSettled) return false;

    const tradeDate = getTradeDate(t);
    const todayStr = new Date().toISOString().split("T")[0];

    if (journalRange === "today") return tradeDate === todayStr;
    if (journalRange === "week") {
      const d = new Date();
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return tradeDate >= monday.toISOString().split("T")[0] && tradeDate <= sunday.toISOString().split("T")[0];
    }
    if (journalRange === "month") {
      const now = new Date();
      return tradeDate.startsWith(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    }
    return true;
  });

  return [...list].sort((a, b) => {
    const timeA = new Date(a?.entryDatetime || a?.id || 0).getTime();
    const timeB = new Date(b?.entryDatetime || b?.id || 0).getTime();
    return timeA - timeB;
  });
}
