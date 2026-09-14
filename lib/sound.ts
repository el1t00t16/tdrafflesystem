// Web Audio API sound synthesizer for the Teachers' Day Raffle System
// Works 100% offline, zero external sound files required

class SoundEngine {
  private ctx: AudioContext | null = null;
  private tickerInterval: number | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private enabled: boolean = true;

  setEnabled(val: boolean) {
    this.enabled = val;
    if (!val) {
      this.stopRapidTick();
    }
  }

  // Play a gentle UI click or confirmation tone
  playClick() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch {
      // Audio playback silently guarded
    }
  }

  playSuccess() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, this.ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    } catch {
      // Guarded
    }
  }

  // Start sound when draw begins
  playDrawStart() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const freqs = [392, 523.25, 659.25, 783.99]; // G4, C5, E5, G5
      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.2, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.35);
      });
    } catch {
      // Guarded
    }
  }

  startSpinning() {
    this.startRapidTick();
  }

  stopSpinning() {
    this.stopRapidTick();
  }

  // Start continuous ticking loop during rapid name cycling
  startRapidTick() {
    if (!this.enabled) return;
    this.stopRapidTick();
    let tickSpeed = 70; // ms
    const tick = () => {
      try {
        this.initCtx();
        if (this.ctx && this.enabled) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          const freq = 450 + Math.random() * 200;
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
          gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start();
          osc.stop(this.ctx.currentTime + 0.04);
        }
      } catch {
        // Guarded
      }
      if (this.enabled) {
        this.tickerInterval = window.setTimeout(tick, tickSpeed);
      }
    };
    tick();
  }

  stopRapidTick() {
    if (this.tickerInterval) {
      clearTimeout(this.tickerInterval);
      this.tickerInterval = null;
    }
  }

  playCountdownBeep(count: number) {
    this.playCountdown(count);
  }

  playCountdownTick() {
    this.playClick();
  }

  playWarning() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.setValueAtTime(240, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    } catch {
      // Guarded
    }
  }

  playError() {
    this.playWarning();
  }

  // Countdown beep (3, 2, 1)
  playCountdown(count: number) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      const freq = count === 1 ? 880 : 587.33; // higher pitch on 1
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch {
      // Guarded
    }
  }

  playCelebrationFanfare() {
    this.playFanfare();
  }

  // Fanfare celebration sound upon winner reveal
  playFanfare() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      // Vibrant major celebration fanfare chords
      const notes = [
        { f: 523.25, t: 0, d: 0.2 },      // C5
        { f: 659.25, t: 0.15, d: 0.2 },   // E5
        { f: 783.99, t: 0.3, d: 0.25 },   // G5
        { f: 1046.5, t: 0.5, d: 0.8 },    // C6 (held)
        { f: 783.99, t: 0.5, d: 0.8 },    // G5 (harmony)
        { f: 659.25, t: 0.5, d: 0.8 },    // E5 (harmony)
      ];

      notes.forEach(({ f, t, d }) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + t);
        gain.gain.setValueAtTime(0.22, now + t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + d);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + t);
        osc.stop(now + t + d);
      });
    } catch {
      // Guarded
    }
  }
}

export const soundEngine = new SoundEngine();
export const soundSynthesizer = soundEngine;

