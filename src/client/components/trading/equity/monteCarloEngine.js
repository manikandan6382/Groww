export const MIN_MONTE_CARLO_SAMPLE = 15;

/**
 * Monte Carlo Simulation Engine
 * Runs 1,000 simulated paths by bootstrapping the trader's actual trade history.
 * Enforces mandatory sample-size gate (N >= 15) to prevent variance hallucination.
 * Computes step-by-step percentile distributions (Cone of Uncertainty) across the future horizon.
 */
export function runMonteCarloSimulation(trades = [], initialCapital = 100000, horizon = 50, runs = 1000) {
  const sampleCount = trades?.length || 0;
  const isSampleGated = sampleCount < MIN_MONTE_CARLO_SAMPLE;

  if (isSampleGated) {
    return {
      isSampleGated: true,
      sampleCount,
      minRequired: MIN_MONTE_CARLO_SAMPLE,
      ruinProbability: 0,
      medianEndCapital: initialCapital,
      worstDrawdown: 0,
      bestEndCapital: initialCapital,
      worstEndCapital: initialCapital,
      expectedReturnPct: "0.0",
      runs: 0,
      horizon,
      conePaths: [],
      spaghettiPaths: []
    };
  }

  const pnlPool = trades.map((t) => Number(t.netPnl ?? t.realizedPnl ?? 0));
  let drawdownBreachHits = 0;
  const endCapitals = [];
  let maxSimDrawdown = 0;
  const breachThreshold = initialCapital * 0.85; // 15% drawdown threshold

  // Step-by-step capital distribution array
  const stepCapitals = Array.from({ length: horizon + 1 }, () => []);
  for (let r = 0; r < runs; r++) {
    stepCapitals[0].push(initialCapital);
  }

  // Retain 15 sample paths for background spaghetti rendering
  const spaghettiPaths = [];
  const maxSpaghetti = 15;

  for (let r = 0; r < runs; r++) {
    let cap = initialCapital;
    let peak = initialCapital;
    let simMaxDD = 0;
    let hitBreach = false;
    const currentPath = r < maxSpaghetti ? [initialCapital] : null;

    for (let s = 0; s < horizon; s++) {
      const randomPnl = pnlPool[Math.floor(Math.random() * pnlPool.length)];
      cap += randomPnl;
      if (cap > peak) peak = cap;
      const dd = peak - cap;
      if (dd > simMaxDD) simMaxDD = dd;
      if (cap <= breachThreshold) hitBreach = true;

      stepCapitals[s + 1].push(cap);
      if (currentPath) currentPath.push(cap);
    }

    if (currentPath) {
      spaghettiPaths.push(currentPath);
    }

    if (hitBreach) drawdownBreachHits++;
    if (simMaxDD > maxSimDrawdown) maxSimDrawdown = simMaxDD;
    endCapitals.push(cap);
  }

  // Calculate percentiles at each step for the Cone of Uncertainty
  const conePaths = [];
  for (let s = 0; s <= horizon; s++) {
    stepCapitals[s].sort((a, b) => a - b);
    conePaths.push({
      step: s,
      p05: stepCapitals[s][Math.floor(runs * 0.05)] ?? initialCapital,
      p25: stepCapitals[s][Math.floor(runs * 0.25)] ?? initialCapital,
      p50: stepCapitals[s][Math.floor(runs * 0.50)] ?? initialCapital,
      p75: stepCapitals[s][Math.floor(runs * 0.75)] ?? initialCapital,
      p95: stepCapitals[s][Math.floor(runs * 0.95)] ?? initialCapital
    });
  }

  endCapitals.sort((a, b) => a - b);
  const medianEndCapital = endCapitals[Math.floor(runs / 2)];
  const bestEndCapital = endCapitals[Math.floor(runs * 0.95)];
  const worstEndCapital = endCapitals[Math.floor(runs * 0.05)];
  const ruinProbability = Number(((drawdownBreachHits / runs) * 100).toFixed(1));
  const expectedReturnPct = initialCapital > 0 
    ? (((medianEndCapital - initialCapital) / initialCapital) * 100).toFixed(1)
    : "0.0";

  return {
    isSampleGated: false,
    sampleCount,
    minRequired: MIN_MONTE_CARLO_SAMPLE,
    ruinProbability,
    medianEndCapital,
    worstDrawdown: Math.round(maxSimDrawdown),
    bestEndCapital,
    worstEndCapital,
    expectedReturnPct,
    runs,
    horizon,
    conePaths,
    spaghettiPaths
  };
}

export default runMonteCarloSimulation;

