/**
 * Apple-Grade Zero-Dependency Web Audio API Synthesizer
 * Generates instant harmonic spatial feedback for trade fills, target reaches, and stop losses.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    // Check localStorage if available
    try {
      if (typeof window !== "undefined") {
        this.muted = localStorage.getItem("portfoliox_sound_muted") === "true";
      }
    } catch {
      this.muted = false;
    }
  }

  init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  isMuted() {
    return this.muted;
  }

  toggleMute() {
    this.muted = !this.muted;
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("portfoliox_sound_muted", String(this.muted));
      }
    } catch {}
    return this.muted;
  }

  setMuted(val) {
    this.muted = Boolean(val);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("portfoliox_sound_muted", String(this.muted));
      }
    } catch {}
  }

  /**
   * Internal Rock-Solid Single Tone Dispatcher
   * Uses a 5ms lookahead buffer and linearRampToValueAtTime to eliminate timestamp collisions.
   */
  _playTone({ type = "sine", freq = 600, duration = 0.06, gain = 0.08, rampFreq = null, delay = 0 }) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime + 0.005 + delay;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (rampFreq && rampFreq !== freq) {
        osc.frequency.linearRampToValueAtTime(rampFreq, now + duration);
      }

      gainNode.gain.setValueAtTime(gain, now);
      gainNode.gain.linearRampToValueAtTime(0.0001, now + duration);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.01);
    } catch (e) {
      console.warn("SoundEngine tone dispatch notice:", e.message);
    }
  }

  /**
   * Ascending Two-Tone Glass Chime on Target Reached (Apple Pay Style)
   * 880 Hz (A5) -> 1760 Hz (A6) with smooth decay
   */
  playTargetChime() {
    if (this.muted) return;
    this._playTone({ type: "sine", freq: 880, duration: 0.35, gain: 0.12, delay: 0 });
    this._playTone({ type: "sine", freq: 1760, duration: 0.55, gain: 0.15, delay: 0.09 });
  }

  /**
   * Soft Dampened Low Tone on Stop Loss Hit
   * 220 Hz (A3) with fast decay
   */
  playStopLossTone() {
    this._playTone({ type: "triangle", freq: 220, duration: 0.3, gain: 0.14 });
  }

  /**
   * Crisp Micro-Click on Order Fill
   * 520 Hz with 80ms impulse
   */
  playOrderFillTone() {
    this._playTone({ type: "sine", freq: 520, duration: 0.08, gain: 0.1 });
  }

  /**
   * Ascending Pip on Trailing Stop Breakeven Lock
   * 660 Hz -> 880 Hz
   */
  playBreakevenTone() {
    this._playTone({ type: "sine", freq: 660, duration: 0.22, gain: 0.09, rampFreq: 880 });
  }

  /**
   * Ascending Harmonic Triad on Successful Action (Log Trade / Undo / Import)
   * 523.25 Hz (C5) -> 659.25 Hz (E5) -> 783.99 Hz (G5)
   */
  playSuccessTone() {
    if (this.muted) return;
    const freqs = [523.25, 659.25, 783.99];
    freqs.forEach((freq, i) => {
      this._playTone({ type: "sine", freq, duration: 0.28, gain: 0.08, delay: i * 0.05 });
    });
  }

  /**
   * Descending Soft Click on Trade Delete / Trash
   * 480 Hz -> 320 Hz
   */
  playDeleteTone() {
    this._playTone({ type: "triangle", freq: 480, duration: 0.15, gain: 0.1, rampFreq: 320 });
  }

  /**
   * Subtle Frosted Glass Click on Navigation / Tab / Pill Switches
   * 650 Hz with organic ±15 Hz micro-pitch variation for Apple tactile mechanical feel
   */
  playTabSwitchTone() {
    const jitter = (Math.random() - 0.5) * 30;
    this._playTone({ type: "sine", freq: 650 + jitter, duration: 0.05, gain: 0.07 });
  }
}

export const soundEngine = new SoundEngine();

// 🌟 Auto-attach single-fire user interaction warmup listener (Bypasses Browser Autoplay Block)
if (typeof window !== "undefined") {
  const warmup = () => {
    soundEngine.init();
    window.removeEventListener("pointerdown", warmup);
    window.removeEventListener("keydown", warmup);
    window.removeEventListener("touchstart", warmup);
  };
  window.addEventListener("pointerdown", warmup, { once: true, passive: true });
  window.addEventListener("keydown", warmup, { once: true, passive: true });
  window.addEventListener("touchstart", warmup, { once: true, passive: true });
}

export default soundEngine;
