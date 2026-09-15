import { audioContextManager } from "./audioContextManager.js";

/**
 * Internal Rock-Solid Single Tone Dispatcher
 * Uses a 5ms lookahead buffer and linearRampToValueAtTime to eliminate timestamp collisions.
 */
export function playTone({
  type = "sine",
  freq = 600,
  duration = 0.06,
  gain = 0.08,
  rampFreq = null,
  delay = 0
}) {
  if (audioContextManager.isMuted()) return;
  const ctx = audioContextManager.init();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  try {
    const now = ctx.currentTime + 0.005 + delay;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (rampFreq && rampFreq !== freq) {
      osc.frequency.linearRampToValueAtTime(rampFreq, now + duration);
    }

    gainNode.gain.setValueAtTime(gain, now);
    gainNode.gain.linearRampToValueAtTime(0.0001, now + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.01);
  } catch (e) {
    console.warn("SoundEngine tone dispatch notice:", e.message);
  }
}
