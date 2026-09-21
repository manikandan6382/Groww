export function computeTimelinePoints({
  displayCandles,
  scaleY,
  padding,
  graphWidth,
  flightScope,
  isShort,
  entryTime,
  exitTime
}) {
  let resolvedEntryIdx = displayCandles.findIndex(c => c.isEntryPoint);
  if (resolvedEntryIdx === -1) {
    const inTradeFirst = displayCandles.findIndex(c => c.isInTrade);
    if (inTradeFirst !== -1) resolvedEntryIdx = inTradeFirst;
    else if (entryTime) {
      const entryMs = new Date(entryTime).getTime();
      resolvedEntryIdx = displayCandles.findIndex(c => Math.abs((c.timestamp || 0) - entryMs) < 60000);
    }
  }
  if (resolvedEntryIdx === -1) resolvedEntryIdx = 0;

  let resolvedExitIdx = displayCandles.findIndex(c => c.isExitPoint);
  if (resolvedExitIdx === -1) {
    const postExitFirst = displayCandles.findIndex(c => c.isPostExit);
    if (postExitFirst > 0) resolvedExitIdx = postExitFirst - 1;
    else if (exitTime) {
      const exitMs = new Date(exitTime).getTime();
      resolvedExitIdx = displayCandles.findIndex(c => Math.abs((c.timestamp || 0) - exitMs) < 60000);
    }
  }
  if (resolvedExitIdx === -1) resolvedExitIdx = displayCandles.length - 1;

  const total = Math.max(1, displayCandles.length - 1);
  const pts = displayCandles.map((c, i) => {
    const p = c.close ?? c.price;
    const x = padding.left + (i / total) * graphWidth;
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

  const entryPoint = pts[resolvedEntryIdx] || pts[0];
  const exitPoint = pts[resolvedExitIdx] || pts[pts.length - 1];

  // Calculate peak and trough across active trade window (or full set if trade window is short)
  const tradePts = pts.filter((p, idx) => idx >= resolvedEntryIdx && idx <= resolvedExitIdx);
  const targetPtsForExcursion = tradePts.length >= 2 ? tradePts : pts;

  let peak = targetPtsForExcursion[0] || pts[0];
  let trough = targetPtsForExcursion[0] || pts[0];
  targetPtsForExcursion.forEach((pt) => {
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

  return { pts, peak, trough, entryPoint, exitPoint };
}
