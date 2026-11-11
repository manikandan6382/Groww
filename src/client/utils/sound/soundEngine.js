import { audioContextManager } from "./audioContextManager.js";
import { playTone } from "./toneSynthesizer.js";

class SoundEngine {
  init() {
    return audioContextManager.init();
  }

  isMuted() {
    return audioContextManager.isMuted();
  }

  toggleMute() {
    return audioContextManager.toggleMute();
  }

  setMuted(val) {
    audioContextManager.setMuted(val);
  }

  _playTone(opts) {
    playTone(opts);
  }

  playTargetChime() {
    if (this.isMuted()) return;
    this._playTone({ type: "sine", freq: 880, duration: 0.35, gain: 0.12, delay: 0 });
    this._playTone({ type: "sine", freq: 1760, duration: 0.55, gain: 0.15, delay: 0.09 });
  }

  playStopLossTone() {
    this._playTone({ type: "triangle", freq: 220, duration: 0.3, gain: 0.14 });
  }

  playOrderFillTone() {
    this._playTone({ type: "sine", freq: 520, duration: 0.08, gain: 0.1 });
  }

  playBreakevenTone() {
    this._playTone({ type: "sine", freq: 660, duration: 0.22, gain: 0.09, rampFreq: 880 });
  }

  playSuccessTone() {
    if (this.isMuted()) return;
    const freqs = [523.25, 659.25, 783.99];
    freqs.forEach((freq, i) => {
      this._playTone({ type: "sine", freq, duration: 0.28, gain: 0.08, delay: i * 0.05 });
    });
  }

  playDeleteTone() {
    this._playTone({ type: "triangle", freq: 480, duration: 0.15, gain: 0.1, rampFreq: 320 });
  }

  playTabSwitchTone() {
    const jitter = (Math.random() - 0.5) * 30;
    this._playTone({ type: "sine", freq: 650 + jitter, duration: 0.05, gain: 0.07 });
  }

  playMilestoneTone() {
    this._playTone({ type: "sine", freq: 780, duration: 0.035, gain: 0.06 });
  }

  playOrderExecutedTone() {
    if (this.isMuted()) return;
    this._playTone({ type: "sine", freq: 587.33, duration: 0.12, gain: 0.1, delay: 0 });
    this._playTone({ type: "sine", freq: 880, duration: 0.22, gain: 0.12, delay: 0.06 });
  }

  playTradeExecutedTone() {
    this.playOrderExecutedTone();
  }

  playTradeConfirmed() {
    if (this.isMuted()) return;
    this._playTone({ type: "sine", freq: 659.25, duration: 0.1, gain: 0.1, delay: 0 });
    this._playTone({ type: "sine", freq: 987.77, duration: 0.2, gain: 0.12, delay: 0.05 });
  }

  playStopHitTone() {
    this._playTone({ type: "triangle", freq: 280, duration: 0.25, gain: 0.14, rampFreq: 180 });
  }

  playTick() {
    this._playTone({ type: "sine", freq: 820, duration: 0.025, gain: 0.04 });
  }

  playScrub() {
    this._playTone({ type: "sine", freq: 720, duration: 0.025, gain: 0.04 });
  }

  playScrubTickTone() {
    this.playTick();
  }

  playOrderSuccess() {
    this.playSuccessTone();
  }

  playOrderReject() {
    this._playTone({ type: "sawtooth", freq: 196, duration: 0.22, gain: 0.12, rampFreq: 140 });
  }

  playRiskBreachKlaxon() {
    if (this.isMuted()) return;
    this._playTone({ type: "sawtooth", freq: 440, duration: 0.15, gain: 0.14, rampFreq: 220 });
    this._playTone({ type: "sawtooth", freq: 330, duration: 0.25, gain: 0.15, delay: 0.12, rampFreq: 165 });
  }
}

const rawSoundEngine = new SoundEngine();

export const soundEngine = new Proxy(rawSoundEngine, {
  get(target, prop, receiver) {
    if (prop in target) {
      const val = Reflect.get(target, prop, receiver);
      return typeof val === "function" ? val.bind(target) : val;
    }
    return () => {};
  }
});

// Auto-attach single-fire user interaction warmup listener (Bypasses Browser Autoplay Block)
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
