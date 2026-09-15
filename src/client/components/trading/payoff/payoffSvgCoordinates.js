export function computePayoffSvgData({ domain, calculatePayoffAtExpiry, breakevenSpot, isCall, canvasWidth = 700, zeroY = 88 }) {
  const domainMin = Number(domain?.min || 0);
  const domainMax = Number(domain?.max || 100);
  const domainSpan = (domainMax - domainMin) > 0 ? (domainMax - domainMin) : 1;
  const steps = 60;
  const stepSize = domainSpan / steps;
  const rawData = [];
  let maxV = 10;
  let minV = -10;

  for (let i = 0; i <= steps; i++) {
    const sT = domainMin + i * stepSize;
    const { pnl = 0 } = (calculatePayoffAtExpiry ? calculatePayoffAtExpiry(sT) : {}) || {};
    const safePnl = Number.isFinite(pnl) ? pnl : 0;
    if (safePnl > maxV) maxV = safePnl;
    if (safePnl < minV) minV = safePnl;
    rawData.push({ sT, pnl: safePnl });
  }

  const yRange = Math.max(Math.abs(maxV), Math.abs(minV), 100);
  const scaleY = (zeroY - 20) / yRange;

  const coords = rawData.map((d) => {
    const rawX = ((d.sT - domainMin) / domainSpan) * canvasWidth;
    const rawY = zeroY - d.pnl * scaleY;
    return {
      x: Number.isFinite(rawX) ? rawX : 0,
      y: Number.isFinite(rawY) ? rawY : zeroY,
      sT: d.sT,
      pnl: d.pnl
    };
  });

  const beX = Number.isFinite(breakevenSpot) && domainSpan > 0
    ? Math.max(0, Math.min(canvasWidth, ((breakevenSpot - domainMin) / domainSpan) * canvasWidth))
    : canvasWidth / 2;

  const profitPts = coords.filter((c) => c.pnl >= 0);
  const lossPts = coords.filter((c) => c.pnl <= 0);

  let profitPoly = "";
  if (profitPts.length > 0) {
    if (isCall) {
      profitPoly = `M ${beX},${zeroY} ` + profitPts.map(p => `L ${p.x},${p.y}`).join(" ") + ` L ${coords[coords.length - 1].x},${zeroY} Z`;
    } else {
      profitPoly = `M ${coords[0].x},${zeroY} ` + profitPts.map(p => `L ${p.x},${p.y}`).join(" ") + ` L ${beX},${zeroY} Z`;
    }
  }

  let lossPoly = "";
  if (lossPts.length > 0) {
    if (isCall) {
      lossPoly = `M ${coords[0].x},${zeroY} ` + lossPts.map(p => `L ${p.x},${p.y}`).join(" ") + ` L ${beX},${zeroY} Z`;
    } else {
      lossPoly = `M ${beX},${zeroY} ` + lossPts.map(p => `L ${p.x},${p.y}`).join(" ") + ` L ${coords[coords.length - 1].x},${zeroY} Z`;
    }
  }

  const mainLine = coords.length > 0
    ? `M ${coords[0].x},${coords[0].y} ` + coords.slice(1).map(p => `L ${p.x},${p.y}`).join(" ")
    : "";

  return {
    points: coords,
    profitPolygon: profitPoly,
    lossPolygon: lossPoly,
    maxPnl: maxV,
    minPnl: minV,
    beCoordX: beX,
    mainLinePath: mainLine
  };
}
