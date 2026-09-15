export function aggregateStrategyMetrics(activeTrades) {
  const strategyMap = new Map();
  for (const t of activeTrades) {
    let rawStrat = t.strategyTag || t.strategyTags || t.entryReason || "Discretionary Scalp";
    if (Array.isArray(rawStrat)) {
      rawStrat = rawStrat[0] || "Discretionary Scalp";
    }
    const strat = String(rawStrat || "Discretionary Scalp").trim() || "Discretionary Scalp";
    if (!strategyMap.has(strat)) {
      strategyMap.set(strat, {
        name: strat,
        trades: 0,
        wins: 0,
        losses: 0,
        pnl: 0,
        grossWins: 0,
        grossLosses: 0,
        lossesList: [],
      });
    }
    const item = strategyMap.get(strat);
    item.trades++;
    const net = Number(t.netPnl || 0);
    item.pnl += net;
    if (net > 0) {
      item.wins++;
      item.grossWins += net;
    } else {
      item.losses++;
      item.grossLosses += Math.abs(net);
      item.lossesList.push(Math.abs(net));
    }
  }

  return Array.from(strategyMap.values())
    .sort((a, b) => b.pnl - a.pnl)
    .map((s) => {
      const winRate = s.trades ? Math.round((s.wins / s.trades) * 100) : 0;
      const avgPayoff = s.trades ? Math.round((s.pnl / s.trades) * 100) / 100 : 0;
      const avgWin = s.wins > 0 ? s.grossWins / s.wins : 0;
      const avgLoss = s.losses > 0 ? s.grossLosses / s.losses : 1;
      const maxDrawdown = s.lossesList.length ? Math.max(...s.lossesList) : 0;
      const profitFactor = s.grossLosses > 0 
        ? (s.grossWins / s.grossLosses).toFixed(2) 
        : (s.grossWins > 0 ? "5.0+" : "0.00");

      // Bayesian Laplace Shrinkage Prior toward 50% baseline
      const pBayes = s.trades ? (s.wins + 2) / (s.trades + 4) : 0.5;
      const qBayes = 1 - pBayes;
      const b = avgLoss > 0 ? avgWin / avgLoss : 1;
      const rawKelly = b > 0 ? (pBayes * b - qBayes) / b : 0;
      const quarterKelly = Math.max(0, rawKelly * 0.25);

      // Sample-size Gated Sizing Guidance
      let sizingAdvice = "0.5 Lot (Exploratory · N < 10)";
      if (s.trades >= 20) {
        sizingAdvice = quarterKelly >= 0.12 ? "2 Lots (Aggressive Edge)" : quarterKelly >= 0.04 ? "1 Lot (Standard)" : "0.5 Lot (Defensive)";
      } else if (s.trades >= 10) {
        sizingAdvice = quarterKelly >= 0.08 ? "1 Lot (Calibrating)" : "0.5 Lot (Defensive)";
      }

      let statusTier = "neutral";
      let statusBadge = "⚖️ Balanced Setup";
      let statusClass = "bg-cyan-500/10 text-cyan-300 border-cyan-500/20";
      let tierBorder = "border-l-4 border-l-cyan-400";
      let recommendation = `Sizing: ${sizingAdvice} · Keep maintaining strict risk discipline.`;

      if (s.pnl > 0 && winRate >= 65) {
        statusTier = "top";
        statusBadge = "🏆 Alpha Goldmine";
        statusClass = "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-sm shadow-emerald-500/10";
        tierBorder = "border-l-4 border-l-emerald-400";
        recommendation = `Sizing: ${sizingAdvice} · Double Down! Strong statistical edge.`;
      } else if (s.pnl > 0) {
        statusTier = "good";
        statusBadge = "✅ Profitable Play";
        statusClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
        tierBorder = "border-l-4 border-l-teal-400";
        recommendation = `Sizing: ${sizingAdvice} · Positive Expectancy — Maintain stop-loss discipline.`;
      } else if (s.pnl <= 0 && winRate >= 60) {
        statusTier = "warning";
        statusBadge = "⚠️ Risk/Reward Leak";
        statusClass = "bg-amber-500/15 text-amber-300 border-amber-500/30";
        tierBorder = "border-l-4 border-l-amber-400";
        recommendation = "High win-rate but negative P&L — You are cutting winners too early!";
      } else {
        statusTier = "drain";
        statusBadge = "🛑 Capital Drain";
        statusClass = "bg-rose-500/15 text-rose-300 border-rose-500/30 shadow-sm shadow-rose-500/10";
        tierBorder = "border-l-4 border-l-rose-500";
        recommendation = "Eliminate Setup — Consistently draining your trading capital.";
      }

      return {
        ...s,
        winRate,
        avgPayoff,
        maxDrawdown,
        profitFactor,
        sizingAdvice,
        statusTier,
        statusBadge,
        statusClass,
        tierBorder,
        recommendation,
        pnl: Math.round(s.pnl * 100) / 100,
      };
    });
}
