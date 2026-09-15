import { generateSmoothPath } from "./equitySplineUtils";

export function buildEquityPaths(equityPoints, width, height, padding, minCap, maxCap, maxDDPct) {
  const capRange = maxCap - minCap || 1;

  const getX = (index) => {
    if (equityPoints.length <= 1) return index === 0 ? 0 : width;
    return (index / (equityPoints.length - 1)) * width;
  };

  const getY = (cap) => {
    const usableHeight = height - padding.top - 24;
    return height - 24 - ((cap - minCap) / capRange) * usableHeight;
  };

  const getDDY = (ddPct) => padding.top + (ddPct / maxDDPct) * (height - padding.top - 24);

  const smoothEquityPath = generateSmoothPath(equityPoints, getX, getY);
  const smoothEquityArea = smoothEquityPath && equityPoints.length > 0
    ? `${smoothEquityPath} L ${width} ${height} L 0 ${height} Z`
    : "";

  const hwmPath = equityPoints.length === 0
    ? ""
    : equityPoints.length <= 1
    ? `M 0 ${getY(equityPoints[0].hwm)} L ${width} ${getY(equityPoints[0].hwm)}`
    : equityPoints.reduce((acc, p, i) => {
        const x = getX(i);
        const y = getY(p.hwm);
        return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
      }, "");

  const drawdownPath = equityPoints.length === 0
    ? ""
    : equityPoints.reduce((acc, p, i) => {
        const x = getX(i);
        const y = getDDY(p.drawdownPct);
        return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
      }, "");

  const drawdownArea = drawdownPath && equityPoints.length > 0
    ? `${drawdownPath} L ${width} ${padding.top} L 0 ${padding.top} Z`
    : "";

  return {
    getX,
    getY,
    getDDY,
    smoothEquityPath,
    smoothEquityArea,
    hwmPath,
    drawdownPath,
    drawdownArea
  };
}
