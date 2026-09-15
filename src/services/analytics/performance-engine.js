import { buildReviewReports } from "./review-reports.js";

export { buildReviewReports };

export function buildTradeAnalytics(trades) {
  const closed = trades.filter((trade) => trade.status === "CLOSED");
  const winners = closed.filter((trade) => Number(trade.netPnl) > 0);
  const losers = closed.filter((trade) => Number(trade.netPnl) < 0);
  const grossProfit = winners.reduce((sum, trade) => sum + Number(trade.netPnl || 0), 0);
  const grossLoss = Math.abs(losers.reduce((sum, trade) => sum + Number(trade.netPnl || 0), 0));

  return {
    totalTrades: trades.length,
    winningTrades: winners.length,
    losingTrades: losers.length,
    openTrades: trades.filter((trade) => trade.status === "OPEN").length,
    winRate: closed.length ? (winners.length / closed.length) * 100 : 0,
    totalPnl: closed.reduce((sum, trade) => sum + Number(trade.netPnl || 0), 0),
    averageWin: winners.length ? grossProfit / winners.length : 0,
    averageLoss: losers.length ? grossLoss / losers.length : 0,
    profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit > 0 ? grossProfit : 0,
    maximumDrawdown: calculateMaxDrawdown(closed),
    bestStrategy: getBestStrategy(trades),
    worstStrategy: getWorstStrategy(trades),
    mostCommonMistakes: getMostCommonMistakes(trades),
  };
}

function calculateMaxDrawdown(trades) {
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;

  [...trades]
    .sort((a, b) => String(a.exitDatetime || a.entryDatetime).localeCompare(String(b.exitDatetime || b.entryDatetime)))
    .forEach((trade) => {
      equity += Number(trade.netPnl || 0);
      peak = Math.max(peak, equity);
      maxDrawdown = Math.max(maxDrawdown, peak - equity);
    });

  return maxDrawdown;
}

function getBestStrategy(trades) {
  return getStrategyScores(trades).sort((a, b) => b.pnl - a.pnl)[0] || null;
}

function getWorstStrategy(trades) {
  return getStrategyScores(trades).sort((a, b) => a.pnl - b.pnl)[0] || null;
}

function getStrategyScores(trades) {
  const scores = new Map();
  for (const trade of trades.filter((item) => item.status === "CLOSED")) {
    for (const tag of trade.strategyTags || []) {
      const existing = scores.get(tag) || { name: tag, count: 0, pnl: 0 };
      existing.count += 1;
      existing.pnl += Number(trade.netPnl || 0);
      scores.set(tag, existing);
    }
  }
  return [...scores.values()];
}

function getMostCommonMistakes(trades) {
  const counts = new Map();
  for (const trade of trades) {
    for (const tag of trade.mistakeTags || []) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
