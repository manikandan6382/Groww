import { useTradingStore } from "../../../stores/useTradingStore";

export function useJournalDeckMetrics() {
  const { journalTrades, journalRange, journalCustomStart, journalCustomEnd } = useTradingStore();

  const filteredTrades = (journalTrades || []).filter((t) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const tradeDate = t.exitDatetime?.split("T")[0] || t.entryDatetime?.split("T")[0] || todayStr;

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
      const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      return tradeDate.startsWith(prefix);
    }
    if (journalRange === "custom") {
      if (!journalCustomStart) return true;
      if (journalCustomStart && !journalCustomEnd) return tradeDate >= journalCustomStart;
      return tradeDate >= journalCustomStart && tradeDate <= journalCustomEnd;
    }
    return true;
  });

  const totalNetPnl = filteredTrades.reduce((acc, t) => acc + (t.netPnl || 0), 0);
  const winTrades = filteredTrades.filter((t) => (t.netPnl || 0) > 0);
  const lossTrades = filteredTrades.filter((t) => (t.netPnl || 0) <= 0);
  const winRate = filteredTrades.length > 0 ? ((winTrades.length / filteredTrades.length) * 100).toFixed(1) : "100.0";

  const grossWins = winTrades.reduce((acc, t) => acc + t.netPnl, 0);
  const grossLosses = Math.abs(lossTrades.reduce((acc, t) => acc + t.netPnl, 0));
  const profitFactor = grossLosses > 0 ? (grossWins / grossLosses).toFixed(2) : grossWins > 0 ? "4.01" : "0.00";
  const avgNet = filteredTrades.length > 0 ? (totalNetPnl / filteredTrades.length).toFixed(2) : "0.00";

  const n = filteredTrades.length || 1;
  const p = winTrades.length / n;
  const z = 1.96;
  const numerator = p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
  const denominator = 1 + (z * z) / n;
  const wilsonFloor = ((numerator / denominator) * 100).toFixed(1);

  const winAngle = ((winTrades.length || 1) / (n || 1)) * 238.76;
  const netYieldPct = (totalNetPnl / 100000) * 100;

  const followedPlanCount = filteredTrades.filter((t) => t.followedPlan !== false).length;
  const ruleDisciplinePct = filteredTrades.length > 0 ? (followedPlanCount / filteredTrades.length) * 100 : 100;
  
  let currentStreak = 0;
  for (const trade of [...filteredTrades].reverse()) {
    if ((trade.netPnl || 0) > 0) currentStreak++;
    else break;
  }
  const displayStreak = currentStreak > 0 ? currentStreak : winTrades.length;
  const maxLoss = lossTrades.length > 0 ? Math.min(...lossTrades.map((t) => t.netPnl || 0)) : -511.0;

  const rangeLabel = journalRange === "today" 
    ? "Today" 
    : journalRange === "week" 
    ? "This Week" 
    : journalRange === "month" 
    ? "This Month" 
    : journalRange === "custom" 
    ? `${journalCustomStart} to ${journalCustomEnd}` 
    : "All Time";

  return {
    filteredTrades,
    totalNetPnl,
    winTrades,
    lossTrades,
    winRate,
    grossWins,
    grossLosses,
    profitFactor,
    avgNet,
    wilsonFloor,
    winAngle,
    netYieldPct,
    ruleDisciplinePct,
    displayStreak,
    maxLoss,
    rangeLabel
  };
}
