import { diagnoseTradeBiases } from "../journal-story/behavioralBiasEngine";

function resolveSessionWindow(datetime) {
  if (!datetime) return "POWER_HOUR";
  const dateObj = new Date(datetime);
  const totalUtcMinutes = dateObj.getUTCHours() * 60 + dateObj.getUTCMinutes();
  if (totalUtcMinutes < 300) return "OPENING_DRIVE";
  if (totalUtcMinutes < 480) return "MIDDAY_CHOP";
  return "POWER_HOUR";
}

export function aggregateStrategyMetrics(activeTrades = []) {
  const strategyMap = new Map();
  for (let i = 0; i < activeTrades.length; i++) {
    const t = activeTrades[i];
    const prior = i > 0 ? activeTrades[i - 1] : null;
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
        leakedRupees: 0,
        leakingTradeCount: 0,
        tradeIds: [],
        timeWindows: {
          OPENING_DRIVE: { trades: 0, wins: 0, pnl: 0 },
          MIDDAY_CHOP: { trades: 0, wins: 0, pnl: 0 },
          POWER_HOUR: { trades: 0, wins: 0, pnl: 0 }
        }
      });
    }
    const item = strategyMap.get(strat);
    item.trades++;
    item.tradeIds.push(t.id);
    const net = Number(t.netPnl || 0);
    item.pnl += net;

    // Time-of-day attribution
    const win = resolveSessionWindow(t.entryDatetime || t.datetime);
    if (item.timeWindows[win]) {
      item.timeWindows[win].trades++;
      item.timeWindows[win].pnl += net;
      if (net > 0) item.timeWindows[win].wins++;
    }

    // Behavioral leakage attribution
    try {
      const diag = diagnoseTradeBiases(t, prior);
      if (diag.hasBiases) {
        item.leakedRupees += diag.leakedRupees;
        item.leakingTradeCount++;
      }
    } catch {
      // Fallback if trade lacks full props
    }

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
      const avgLoss = s.losses > 0 ? s.grossLosses / s.losses : 0;
      const maxDrawdown = s.lossesList.length ? Math.max(...s.lossesList) : 0;
      const profitFactor = s.grossLosses > 0 
        ? (s.grossWins / s.grossLosses).toFixed(2) 
        : (s.grossWins > 0 ? "MAX" : "0.00");

      const payoffRatio = avgLoss > 0 ? Number((avgWin / avgLoss).toFixed(2)) : 0;
      // Exact Expectancy in ₹ per trade: (P_win * AvgWin) - (P_loss * AvgLoss)
      const expectancy = Number((((winRate / 100) * avgWin) - (((100 - winRate) / 100) * avgLoss)).toFixed(2));

      // Manikandan's Risk Invariant (₹200–₹300 Stop Loss Cap)
      const breachedLossCount = s.lossesList.filter((loss) => loss > 305).length;
      const riskDisciplinePct = s.trades > 0 
        ? Math.round(((s.trades - breachedLossCount) / s.trades) * 100) 
        : 100;
      const hasInvariantBreaches = breachedLossCount > 0;

      // Bayesian Laplace Shrinkage Prior toward 50% baseline
      const pBayes = s.trades ? (s.wins + 2) / (s.trades + 4) : 0.5;
      const qBayes = 1 - pBayes;
      const b = avgLoss > 0 ? avgWin / avgLoss : (avgWin > 0 ? 3 : 1);
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

      if (s.pnl > 0 && winRate >= 65 && !hasInvariantBreaches) {
        statusTier = "top";
        statusBadge = "🏆 Alpha Goldmine";
        statusClass = "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-sm shadow-emerald-500/10";
        tierBorder = "border-l-4 border-l-emerald-400";
        recommendation = `Sizing: ${sizingAdvice} · Double Down! Edge verified & ₹300 stops preserved.`;
      } else if (s.pnl > 0 && hasInvariantBreaches) {
        statusTier = "slippage_risk";
        statusBadge = "⚡ Volatile Edge (Stop Slippage)";
        statusClass = "bg-amber-500/15 text-amber-300 border-amber-500/30";
        tierBorder = "border-l-4 border-l-amber-400";
        recommendation = `Profitable but ${breachedLossCount} trade(s) breached ₹300 risk cap! Enforce hard SL pegging.`;
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
        avgWin,
        avgLoss,
        payoffRatio,
        expectancy,
        maxDrawdown,
        profitFactor,
        breachedLossCount,
        riskDisciplinePct,
        hasInvariantBreaches,
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

