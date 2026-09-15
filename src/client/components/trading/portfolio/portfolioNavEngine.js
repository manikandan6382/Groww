// Static forex reference for Dalal Street <-> Wall Street conversion
export const USD_INR_RATE = 83.95;

export const TIMEFRAMES = [
  { id: "all", label: "ALL", sub: "Inception" },
  { id: "today", label: "1D", sub: "Session" },
  { id: "week", label: "1W", sub: "5 Days" },
  { id: "month", label: "1M", sub: "30 Days" },
  { id: "year", label: "1Y", sub: "365 Days" },
  { id: "custom", label: "Custom 📅", sub: "Range" },
];

/**
 * Generates high-precision realistic NAV curves based on smooth cubic trend interpolation (Zero Math.sin noise)
 */
export function generateNavData(currentVal, investedVal, dayPnl, timeframe, customDays = 30) {
  const validCurrent = Number.isFinite(currentVal) ? Math.max(0, currentVal) : 0;
  const validInvested = Number.isFinite(investedVal) ? Math.max(0, investedVal) : 0;
  const validDayPnl = Number.isFinite(dayPnl) ? dayPnl : 0;

  let pointsCount = 36;
  if (validCurrent === 0 && validInvested === 0) {
    return new Array(pointsCount).fill(0);
  }

  let growth = validCurrent - validInvested;
  let base = Math.max(0, validInvested);

  if (timeframe === "today") {
    pointsCount = 32;
    const prevClose = validCurrent - validDayPnl;
    const data = [];
    for (let i = 0; i < pointsCount; i++) {
      const p = i / (pointsCount - 1);
      const ease = p * p * (3 - 2 * p); // Cubic smoothstep
      const val = prevClose + (validDayPnl * ease);
      data.push(Math.round(val));
    }
    data[data.length - 1] = Math.round(validCurrent);
    return data;
  }

  if (timeframe === "week") {
    pointsCount = 30;
    const weekDelta = validDayPnl * 3.2;
    const startVal = validCurrent - weekDelta;
    const data = [];
    for (let i = 0; i < pointsCount; i++) {
      const p = i / (pointsCount - 1);
      const ease = Math.pow(p, 1.18);
      const val = startVal + (weekDelta * ease);
      data.push(Math.round(val));
    }
    data[data.length - 1] = Math.round(validCurrent);
    return data;
  }

  if (timeframe === "month") {
    pointsCount = 32;
    const monthDelta = (validCurrent - validInvested) * 0.45;
    const startVal = validCurrent - monthDelta;
    const data = [];
    for (let i = 0; i < pointsCount; i++) {
      const p = i / (pointsCount - 1);
      const ease = Math.pow(p, 1.25);
      const val = startVal + (monthDelta * ease);
      data.push(Math.round(val));
    }
    data[data.length - 1] = Math.round(validCurrent);
    return data;
  }

  if (timeframe === "year") {
    pointsCount = 40;
    const yearDelta = (validCurrent - validInvested) * 0.85;
    const startVal = validCurrent - yearDelta;
    const data = [];
    for (let i = 0; i < pointsCount; i++) {
      const p = i / (pointsCount - 1);
      const ease = Math.pow(p, 1.32);
      const val = startVal + (yearDelta * ease);
      data.push(Math.round(val));
    }
    data[data.length - 1] = Math.round(validCurrent);
    return data;
  }

  if (timeframe === "custom") {
    pointsCount = Math.min(48, Math.max(20, Math.round(customDays / 3)));
    const customRatio = Math.min(1, customDays / 365);
    const customDelta = (validCurrent - validInvested) * customRatio;
    const startVal = validCurrent - customDelta;
    const data = [];
    for (let i = 0; i < pointsCount; i++) {
      const p = i / (pointsCount - 1);
      const ease = Math.pow(p, 1.3);
      const val = startVal + (customDelta * ease);
      data.push(Math.round(val));
    }
    data[data.length - 1] = Math.round(validCurrent);
    return data;
  }

  // "all" Timeframe (Default)
  pointsCount = 42;
  const data = [];
  for (let i = 0; i < pointsCount; i++) {
    const progress = i / (pointsCount - 1);
    const curve = Math.pow(progress, 1.35);
    const val = base + (growth * curve);
    data.push(Math.round(val));
  }
  data[data.length - 1] = Math.round(validCurrent);
  return data;
}

/**
 * Generates a smooth cubic Bézier spline SVG path string
 */
export function generateSmoothSpline(points, getX, getY) {
  if (!points || points.length === 0) return "";
  if (points.length === 1) return `M ${getX(0)} ${getY(points[0])}`;
  if (points.length === 2) {
    const p0 = { x: getX(0), y: getY(points[0]) };
    const p1 = { x: getX(1), y: getY(points[1]) };
    const cx = (p0.x + p1.x) / 2;
    return `M ${p0.x} ${p0.y} C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  let path = `M ${getX(0)} ${getY(points[0])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? { x: getX(i - 1), y: getY(points[i - 1]) } : { x: getX(0), y: getY(points[0]) };
    const p1 = { x: getX(i), y: getY(points[i]) };
    const p2 = { x: getX(i + 1), y: getY(points[i + 1]) };
    const p3 = i < points.length - 2 ? { x: getX(i + 2), y: getY(points[i + 2]) } : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 5;
    const cp1y = p1.y + (p2.y - p0.y) / 5;
    const cp2x = p2.x - (p3.x - p1.x) / 5;
    const cp2y = p2.y - (p3.y - p1.y) / 5;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return path;
}
