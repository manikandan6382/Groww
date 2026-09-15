/**
 * Apple-Grade Zero-Dependency Audio Context & Warmup Manager
 */
class AudioContextManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
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
    return this.ctx;
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
}

export const audioContextManager = new AudioContextManager();
