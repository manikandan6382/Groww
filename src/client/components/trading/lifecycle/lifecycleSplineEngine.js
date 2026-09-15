import { soundEngine } from "../../../utils/soundEngine";

// Module-level client cache with 10-minute sliding TTL (TDZ Compliance)
export const clientCandleCache = new Map();
export const CLIENT_CACHE_TTL = 10 * 60 * 1000;
let lastScrubAudioTime = 0;

// Throttled audio tick feedback for tactile scrub feel
export function triggerScrubHaptic() {
  const now = Date.now();
  if (now - lastScrubAudioTime > 45) {
    lastScrubAudioTime = now;
    if (typeof soundEngine?.playScrub === "function") {
      soundEngine.playScrub();
    }
  }
}

// Silky cubic-bezier spline interpolation
export function calculateSplinePath(points) {
  if (!points || points.length < 2) return "";
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export function calculateAreaPath(splinePath, points, entryY) {
  if (!points || !points.length) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${splinePath} L ${last.x.toFixed(1)} ${entryY.toFixed(1)} L ${first.x.toFixed(1)} ${entryY.toFixed(1)} Z`;
}
