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

export function buildReviewReports(trades, analytics, label) {
  const commonMistake = analytics.mostCommonMistakes[0]?.name || "No repeated mistake yet";
  const bestStrategy = analytics.bestStrategy?.name || "Not enough closed trades";
  const worstStrategy = analytics.worstStrategy?.name || "Not enough closed trades";
  const ruleCompliance = calculateRuleCompliance(trades);

  return [
    {
      type: "DAILY",
      title: "Daily trade review",
      period: label,
      summary: `${analytics.totalTrades} trades tracked. Net P&L ${formatNumber(analytics.totalPnl)}. Top mistake: ${commonMistake}.`,
      metrics: [
        { label: "Trades", value: analytics.totalTrades },
        { label: "Win rate", value: `${analytics.winRate.toFixed(1)}%` },
        { label: "Net P&L", value: formatNumber(analytics.totalPnl) },
      ],
    },
    {
      type: "WEEKLY",
      title: "Weekly performance report",
      period: label,
      summary: `Best strategy: ${bestStrategy}. Worst strategy: ${worstStrategy}. Profit factor ${analytics.profitFactor.toFixed(2)}.`,
      metrics: [
        { label: "Best strategy", value: bestStrategy },
        { label: "Worst strategy", value: worstStrategy },
        { label: "Profit factor", value: analytics.profitFactor.toFixed(2) },
      ],
    },
    {
      type: "MONTHLY",
      title: "Monthly mistake report",
      period: label,
      summary: analytics.mostCommonMistakes.length
        ? `Most repeated mistake is ${commonMistake}. Review entries where this appeared before taking similar trades.`
        : "No mistake pattern yet. Keep tagging each trade honestly.",
      metrics: analytics.mostCommonMistakes.slice(0, 3).map((mistake) => ({ label: mistake.name, value: mistake.count })),
    },
    {
      type: "RULE_COMPLIANCE",
      title: "Rule compliance report",
      period: label,
      summary: `${ruleCompliance.score.toFixed(0)}% compliance based on risk <= 2%, minimum 1:2 reward/risk, and followed-plan journal entries.`,
      metrics: ruleCompliance.items,
    },
  ];
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

function calculateRuleCompliance(trades) {
  const checks = [];
  for (const trade of trades) {
    checks.push({ label: "Risk <= 2%", passed: Number(trade.riskPercentage || 0) <= 2 });
    checks.push({ label: "Reward/risk >= 2", passed: Number(trade.riskRewardRatio || 0) >= 2 });
    checks.push({ label: "Followed plan", passed: Boolean(trade.followedPlan) });
  }

  if (!checks.length) {
    return {
      score: 0,
      items: [
        { label: "Risk <= 2%", value: "No trades" },
        { label: "Reward/risk >= 2", value: "No trades" },
        { label: "Followed plan", value: "No trades" },
      ],
    };
  }

  const grouped = new Map();
  for (const check of checks) {
    const item = grouped.get(check.label) || { total: 0, passed: 0 };
    item.total += 1;
    if (check.passed) item.passed += 1;
    grouped.set(check.label, item);
  }

  const passed = checks.filter((check) => check.passed).length;
  return {
    score: (passed / checks.length) * 100,
    items: [...grouped.entries()].map(([label, item]) => ({
      label,
      value: `${item.passed}/${item.total}`,
    })),
  };
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}
