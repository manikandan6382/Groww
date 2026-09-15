import { soundEngine } from '../../../utils/soundEngine';

const timelineCandleCache = new Map();
const MAX_CACHE_ENTRIES = 40;
const CLIENT_CACHE_TTL = 10 * 60 * 1000;
let lastScrubAudioTime = 0;

export function getCachedTimeline(key) {
  const cached = timelineCandleCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > CLIENT_CACHE_TTL) {
    timelineCandleCache.delete(key);
    return null;
  }
  return cached.data;
}

export function setCachedTimeline(key, data) {
  if (timelineCandleCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = timelineCandleCache.keys().next().value;
    if (oldestKey) timelineCandleCache.delete(oldestKey);
  }
  timelineCandleCache.set(key, { data, cachedAt: Date.now() });
}

export function triggerScrubHaptic(speed = 1) {
  const now = Date.now();
  const throttleMs = Math.max(30, Math.round(90 / speed));
  if (now - lastScrubAudioTime >= throttleMs) {
    lastScrubAudioTime = now;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(6);
    }
    soundEngine.playScrubTickTone?.();
  }
}
