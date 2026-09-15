export function computeTimelinePoints({
  displayCandles,
  scaleY,
  padding,
  graphWidth,
  flightScope,
  isShort,
  exitTime
}) {
  let resolvedExitIdx = displayCandles.findIndex(c => c.isExitPoint);
  if (resolvedExitIdx === -1) {
    const postExitFirst = displayCandles.findIndex(c => c.isPostExit);
    if (postExitFirst > 0) resolvedExitIdx = postExitFirst - 1;
  }

  const useDualZone = flightScope !== 'scalp' && resolvedExitIdx > 0 && resolvedExitIdx < displayCandles.length - 1;
  const executionWidth = graphWidth * 0.44;
  const postExitWidth = graphWidth * 0.56;

  const pts = displayCandles.map((c, i) => {
    const p = c.close ?? c.price;
    let x;
    if (useDualZone) {
      if (i <= resolvedExitIdx) {
        x = padding.left + (i / resolvedExitIdx) * executionWidth;
      } else {
        const postRatio = (i - resolvedExitIdx) / ((displayCandles.length - 1) - resolvedExitIdx);
        x = padding.left + executionWidth + postRatio * postExitWidth;
      }
    } else {
      x = padding.left + (i / (displayCandles.length - 1 || 1)) * graphWidth;
    }
    const openP = c.open ?? p;
    return {
      ...c,
      close: p,
      open: openP,
      high: c.high ?? (p + 0.3),
      low: c.low ?? (p - 0.3),
      x,
      y: scaleY(p),
      openY: scaleY(openP),
      highY: scaleY(c.high ?? (p + 0.3)),
      lowY: scaleY(c.low ?? (p - 0.3)),
      index: i,
      isBullish: p >= openP
    };
  });

  let peak = pts[0];
  let trough = pts[0];
  pts.forEach((pt) => {
    const h = pt.high ?? pt.close;
    const l = pt.low ?? pt.close;
    if (!isShort) {
      if (h > (peak.high ?? peak.close)) peak = pt;
      if (l < (trough.low ?? trough.close)) trough = pt;
    } else {
      if (l < (peak.low ?? peak.close)) peak = pt;
      if (h > (trough.high ?? trough.close)) trough = pt;
    }
  });

  const exitPoint = (resolvedExitIdx !== -1 && pts[resolvedExitIdx]) || pts.find(p => p.isExitPoint) || pts.find(p => {
    const exitMs = new Date(exitTime || Date.now()).getTime();
    return Math.abs(p.timestamp - exitMs) < 60000;
  }) || pts[Math.min(pts.length - 1, 16)];

  return { pts, peak, trough, exitPoint };
}
