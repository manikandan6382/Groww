/**
 * Pure ESM Zero-Dependency Black-76 Greeks & Dealer Gamma Exposure (GEX) Engine
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

/**
 * Compute Complete Dealer Gamma Exposure (GEX) Profile
 */
export function computeGexProfile(symbol = "NIFTY", currentSpot = 24500, optionChain = [], dteDays = 1) {
  const lotSize = symbol === "BANKNIFTY" ? 35 : symbol === "FINNIFTY" ? 65 : 75;
  const spot = Number(currentSpot || 24500);

  const strikes = optionChain.length ? optionChain : generateSyntheticChain(symbol, spot);

  let totalCallGex = 0;
  let totalPutGex = 0;
  let maxCallGexStrike = 0;
  let maxCallGexValue = 0;
  let maxPutGexStrike = 0;
  let maxPutGexValue = 0;

  const strikeProfiles = strikes.map((item) => {
    const K = item.strike;
    const callOI = Number(item.callOI || 150000);
    const putOI = Number(item.putOI || 140000);
    const callIV = Number(item.callIV || 14.2);
    const putIV = Number(item.putIV || 15.1);

    const callGreeks = calculateGreeks(spot, K, dteDays, callIV, 0.065, "CALL");
    const putGreeks = calculateGreeks(spot, K, dteDays, putIV, 0.065, "PUT");

    const callGex = (callOI * spot * callGreeks.gamma * lotSize) / 10000000;
    const putGex = (-1 * putOI * spot * putGreeks.gamma * lotSize) / 10000000;
    const netGex = callGex + putGex;

    totalCallGex += callGex;
    totalPutGex += putGex;

    if (callGex > maxCallGexValue) {
      maxCallGexValue = callGex;
      maxCallGexStrike = K;
    }
    if (Math.abs(putGex) > maxPutGexValue) {
      maxPutGexValue = Math.abs(putGex);
      maxPutGexStrike = K;
    }

    return {
      strike: K,
      callOI,
      putOI,
      callGex: Number(callGex.toFixed(2)),
      putGex: Number(putGex.toFixed(2)),
      netGex: Number(netGex.toFixed(2)),
      callDelta: callGreeks.delta,
      putDelta: putGreeks.delta,
      gamma: callGreeks.gamma,
      isAtm: Math.abs(K - spot) <= (symbol === "BANKNIFTY" ? 100 : 50),
    };
  });

  const netTotalGex = totalCallGex + totalPutGex;
  
  let gammaFlipStrike = spot;
  let minDiff = Infinity;
  strikeProfiles.forEach((p) => {
    if (Math.abs(p.netGex) < minDiff) {
      minDiff = Math.abs(p.netGex);
      gammaFlipStrike = p.strike;
    }
  });

  return {
    symbol,
    spot,
    lotSize,
    totalCallGex: Number(totalCallGex.toFixed(2)),
    totalPutGex: Number(totalPutGex.toFixed(2)),
    netTotalGex: Number(netTotalGex.toFixed(2)),
    regime: netTotalGex >= 0 ? "POSITIVE_GAMMA" : "NEGATIVE_GAMMA",
    regimeDescription: netTotalGex >= 0 ? "Mean-Reverting · Volatility Dampening" : "Directional Acceleration · Volatility Spike",
    gammaFlipStrike,
    callWall: { strike: maxCallGexStrike, gexCrores: Number(maxCallGexValue.toFixed(2)) },
    putWall: { strike: maxPutGexStrike, gexCrores: Number(maxPutGexValue.toFixed(2)) },
    strikes: strikeProfiles,
    updatedAt: new Date().toISOString(),
  };
}

function generateSyntheticChain(symbol, spot) {
  const step = symbol === "BANKNIFTY" ? 100 : 50;
  const atmBase = Math.round(spot / step) * step;
  const count = 10;
  const strikes = [];

  for (let i = -count; i <= count; i++) {
    const K = atmBase + i * step;
    const dist = Math.abs(i);
    const baseOI = Math.max(40000, Math.round(350000 * Math.exp(-0.15 * dist * dist)));
    const callOI = i >= 0 ? Math.round(baseOI * (1 + 0.3 * Math.sin(i))) : Math.round(baseOI * 0.7);
    const putOI = i <= 0 ? Math.round(baseOI * (1 + 0.3 * Math.cos(i))) : Math.round(baseOI * 0.7);
    const iv = Number((14.0 + 0.35 * Math.abs(i) + (i < 0 ? 0.8 : 0)).toFixed(2));

    strikes.push({
      strike: K,
      callOI,
      putOI,
      callIV: iv,
      putIV: iv + 0.6,
      callLtp: Math.max(0.5, spot - K > 0 ? spot - K + 25 : Math.exp(-0.5 * dist) * 35),
      putLtp: Math.max(0.5, K - spot > 0 ? K - spot + 25 : Math.exp(-0.5 * dist) * 35),
    });
  }

  return strikes;
}
