/**
 * Monte Carlo Simulation Engine
 * Runs 1,000 simulated paths by bootstrapping the trader's actual trade history.
 */
export function runMonteCarloSimulation(trades, initialCapital = 100000, horizon = 50, runs = 1000) {
  if (!trades || trades.length === 0) {
    return {
      ruinProbability: 0,
      medianEndCapital: initialCapital,
      worstDrawdown: 0,
      bestEndCapital: initialCapital,
      runs: 0
    };
  }

  const pnlPool = trades.map((t) => Number(t.netPnl || 0));
  let ruinHits = 0;
  const endCapitals = [];
  let maxSimDrawdown = 0;
  const ruinThreshold = initialCapital * 0.85; // 15% drawdown threshold

  for (let r = 0; r < runs; r++) {
    let cap = initialCapital;
    let peak = initialCapital;
    let simMaxDD = 0;
    let hitRuin = false;

    for (let s = 0; s < horizon; s++) {
      const randomPnl = pnlPool[Math.floor(Math.random() * pnlPool.length)];
      cap += randomPnl;
      if (cap > peak) peak = cap;
      const dd = peak - cap;
      if (dd > simMaxDD) simMaxDD = dd;
      if (cap <= ruinThreshold) hitRuin = true;
    }

    if (hitRuin) ruinHits++;
    if (simMaxDD > maxSimDrawdown) maxSimDrawdown = simMaxDD;
    endCapitals.push(cap);
  }

  endCapitals.sort((a, b) => a - b);
  const medianEndCapital = endCapitals[Math.floor(runs / 2)];
  const bestEndCapital = endCapitals[Math.floor(runs * 0.95)];
  const ruinProbability = ((ruinHits / runs) * 100).toFixed(1);

  return {
    ruinProbability: Number(ruinProbability),
    medianEndCapital,
    worstDrawdown: Math.round(maxSimDrawdown),
    bestEndCapital,
    runs
  };
}
