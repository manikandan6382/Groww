import { calculateGreeks } from "../../services/greeksEngine.js";
import { calculateStatutoryCharges } from "../../client/stores/slices/tradeHelpers.js";

export function getMarketTimingRegime(now = new Date()) {
  const istMinsTotal = (now.getUTCHours() * 60 + now.getUTCMinutes() + 330) % 1440;
  const istHour = Math.floor(istMinsTotal / 60);
  const istMinute = istMinsTotal % 60;
  const isMarketOpen = (istHour > 9 || (istHour === 9 && istMinute >= 15)) && (istHour < 15 || (istHour === 15 && istMinute <= 30));

  if (!isMarketOpen) {
    return { regime: "BLOCKED", status: "STAND_DOWN", badge: "🔴 MARKET CLOSED (09:15-15:30 IST)" };
  }
  if ((istHour === 9 && istMinute < 20) || (istHour === 15 && istMinute >= 0)) {
    return { regime: "BLOCKED", status: "STAND_DOWN", badge: "🔴 SQUARING VOLATILITY CHOP" };
  }
  if ((istHour === 11 && istMinute >= 15) || istHour === 12 || (istHour === 13 && istMinute < 15)) {
    return { regime: "WARNING", status: "CAUTION", badge: "🟡 MID-DAY THETA CHOP (11:15-13:15 IST)" };
  }
  return { regime: "PRIME", status: "APPROVED", badge: "🟢 PRIME EXECUTION WINDOW · 12/12 APPROVED" };
}

export function computeCopilotRiskMath({ symbol, optionLtp, liveGreeks }) {
  const isSensex = symbol === "SENSEX";
  const isBankNifty = symbol === "BANKNIFTY";
  const slDistance = isSensex ? 12.5 : (isBankNifty ? 8.5 : 4.0);
  const stopLoss = Math.max(0.5, Number((optionLtp - slDistance).toFixed(2)));

  const t1Distance = Number((slDistance * 1.0).toFixed(1));
  const t2Distance = Number((slDistance * 2.0).toFixed(1));
  const t3Distance = Number((slDistance * 3.0).toFixed(1));

  const targetT1 = Number((optionLtp + t1Distance).toFixed(2));
  const targetT2 = Number((optionLtp + t2Distance).toFixed(2));
  const targetT3 = Number((optionLtp + t3Distance).toFixed(2));

  const lotSize = isSensex ? 20 : (isBankNifty ? 30 : 65);
  const riskRupees = Number((slDistance * lotSize).toFixed(2));
  const rewardRupees = Number((t2Distance * lotSize).toFixed(2));

  const estimatedFriction = calculateStatutoryCharges(optionLtp, optionLtp, lotSize, "LONG");
  const slippageDrag = Number((0.5 * lotSize).toFixed(2));
  const netRiskRupees = Number((riskRupees + estimatedFriction + slippageDrag).toFixed(2));
  const netRewardRupees = Number((rewardRupees - estimatedFriction - slippageDrag).toFixed(2));
  const netRrRatio = netRiskRupees > 0 ? (netRewardRupees / netRiskRupees).toFixed(2) : "0.00";
  const ev = Number(((netRewardRupees * 0.50) - (netRiskRupees * 0.50)).toFixed(2));

  const absTheta = Math.abs(liveGreeks?.theta || 10.0);
  const thetaPerMin = absTheta / 375.0;
  const thetaHalfLifeMins = thetaPerMin > 0 ? Math.round((slDistance * 0.5) / thetaPerMin) : 120;

  const targets = {
    t1: { name: "Invalidation Shield (T1)", pts: t1Distance, price: targetT1, ratio: `1:${(t1Distance / slDistance).toFixed(1)}`, description: "Lock True BE & eliminate risk (0 exit fees)" },
    t2: { name: "Primary Profit Bank (T2)", pts: t2Distance, price: targetT2, ratio: `1:${(t2Distance / slDistance).toFixed(1)}`, description: "Bank base momentum scalp (Friction < 8%)" },
    t3: { name: "Trend Runner (T3)", pts: t3Distance, price: targetT3, ratio: `1:${(t3Distance / slDistance).toFixed(1)}`, description: "Extended directional runner" }
  };

  return {
    slDistance, stopLoss, t1Distance, t2Distance, t3Distance,
    targetT1, targetT2, targetT3, targetPrice: targetT2,
    lotSize, riskRupees, rewardRupees, netRiskRupees, netRewardRupees,
    rrRatio: "2.00", netRrRatio, ev, thetaHalfLifeMins, targets
  };
}

export function fallbackBlack76Greeks({ symbol, spotPrice, strike, optionType, nearestExpiry }) {
  const isSensex = symbol === "SENSEX";
  const isBankNifty = symbol === "BANKNIFTY";
  const dteDays = Math.max(0.1, isSensex ? 0.2 : (isBankNifty ? 4.5 : 2.5));
  const baseIv = isSensex ? 22.0 : 13.5;
  const local = calculateGreeks(spotPrice, strike, dteDays, baseIv, 0.065, optionType);
  return {
    delta: local.delta,
    gamma: local.gamma,
    theta: local.theta,
    vega: local.vega,
    iv: baseIv,
    pop: optionType === "CALL" ? Number((local.delta * 100).toFixed(1)) : Number((Math.abs(local.delta) * 100).toFixed(1)),
    pcr: 1.05,
    expiry: nearestExpiry || "CURRENT_WEEKLY",
    source: "black_76_local"
  };
}
