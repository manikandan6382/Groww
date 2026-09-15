export const parseFiniteNumber = (val, fallback = 0) => {
  const num = Number(val);
  return Number.isFinite(num) ? num : fallback;
};

export const getContextualSteppers = (entryPrice) => {
  const p = parseFiniteNumber(entryPrice, 100);
  if (p < 50) {
    return {
      targetMinus: [-2, -1, -0.5],
      targetPlus: [0.5, 1, 2, 5],
      slMinus: [-2, -1, -0.5],
      slPlus: [0.5, 1, 2]
    };
  }
  if (p >= 300) {
    return {
      targetMinus: [-10, -5, -2],
      targetPlus: [2, 5, 10, 20],
      slMinus: [-10, -5, -2],
      slPlus: [2, 5, 10]
    };
  }
  return {
    targetMinus: [-5, -2, -1],
    targetPlus: [1, 2, 5, 10],
    slMinus: [-5, -2, -1],
    slPlus: [1, 2, 5]
  };
};

export const calculateEstimatedCharges = (entry, currentLtp, totalQty) => {
  const brokerage = 40;
  const buyTurnover = entry * totalQty;
  const sellTurnover = currentLtp * totalQty;
  const totalTurnover = buyTurnover + sellTurnover;
  const stt = sellTurnover * 0.001;
  const exchangeTurnover = totalTurnover * 0.000505;
  const sebiCharge = totalTurnover * 0.000001;
  const stampDuty = buyTurnover * 0.00003;
  const gst = (brokerage + exchangeTurnover + sebiCharge) * 0.18;
  return Math.max(25, Math.round(brokerage + stt + exchangeTurnover + sebiCharge + stampDuty + gst));
};
