/**
 * Pure ESM Zero-Dependency Black-76 Greeks Engine
 * Implements Abramowitz & Stegun polynomial approximation for sub-millisecond calculation.
 */

const SQRT_2PI = Math.sqrt(2 * Math.PI);

/**
 * Standard Normal Probability Density Function: n(x)
 */
export function normalPdf(x) {
  return Math.exp(-0.5 * x * x) / SQRT_2PI;
}

/**
 * Cumulative Standard Normal Distribution Function: N(x)
 * Accurate to within 7.5e-8 using Abramowitz & Stegun approximation (formula 26.2.17)
 */
export function normalCdf(x) {
  if (x < 0) return 1 - normalCdf(-x);
  const p = 0.2316419;
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;

  const t = 1 / (1 + p * x);
  const poly = t * (b1 + t * (b2 + t * (b3 + t * (b4 + t * b5))));
  return 1 - normalPdf(x) * poly;
}

/**
 * Calculate Black-76 Option Greeks
 */
export function calculateGreeks(spot, strike, dteDays = 1, ivPct = 15, r = 0.065, optionType = "CALL") {
  const S = Math.max(1, spot);
  const K = Math.max(1, strike);
  const T = Math.max(0.001, dteDays / 365.25);
  const sigma = Math.max(0.01, ivPct / 100);
  const sqrtT = Math.sqrt(T);

  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const nd1 = normalPdf(d1);
  const discount = Math.exp(-r * T);

  let delta = 0;
  let gamma = (discount * nd1) / (S * sigma * sqrtT);
  let vega = (S * discount * nd1 * sqrtT) / 100;
  let theta = 0;

  if (optionType === "PUT") {
    delta = discount * (normalCdf(d1) - 1);
    theta = (-(S * discount * nd1 * sigma) / (2 * sqrtT) + r * K * discount * normalCdf(-d2)) / 365;
  } else {
    delta = discount * normalCdf(d1);
    theta = (-(S * discount * nd1 * sigma) / (2 * sqrtT) - r * K * discount * normalCdf(d2)) / 365;
  }

  return {
    delta: Number(delta.toFixed(4)),
    gamma: Number(gamma.toFixed(6)),
    theta: Number(theta.toFixed(2)),
    vega: Number(vega.toFixed(2)),
  };
}
