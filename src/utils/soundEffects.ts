/**
 * Web Audio API Synthesizer for futuristic sci-fi sound effects.
 * Synthesizes audio procedurally using standard oscillators with zero external assets.
 */

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;

  constructor() {
    // Check localStorage preference
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('robofleet_muted');
        if (saved !== null) {
          this.isMuted = JSON.parse(saved);
        }
      }
    } catch {
      this.isMuted = false;
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (this.isMuted) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('robofleet_muted', JSON.stringify(muted));
      }
    } catch {}
  }

  public toggleMuted(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  /**
   * Crisp futuristic UI click
   */
  public playClick(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {}
  }

  /**
   * Upbeat double blip when a task is created or queued
   */
  public playTaskCreated(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.06); // A5

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.setValueAtTime(0.09, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {}
  }

  /**
   * Rising melodic chime when an AGV picks up inventory from a shelf
   */
  public playPickup(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.05);

        gain.gain.setValueAtTime(0.08, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.12);
      });
    } catch {}
  }

  /**
   * Harmonious delivery completion fanfare
   */
  public playDelivery(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [659.25, 783.99, 1046.5]; // E5, G5, C6

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);

        gain.gain.setValueAtTime(0.1, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.22);
      });
    } catch {}
  }

  /**
   * Pulsing alert siren for emergency / lockdown events
   */
  public playEmergency(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.linearRampToValueAtTime(440, now + 0.18);
      osc.frequency.linearRampToValueAtTime(880, now + 0.36);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch {}
  }

  /**
   * Low mechanical buzz for breakdowns
   */
  public playBreakdown(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.28);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.28);
    } catch {}
  }
}

export const soundEffects = new SoundSynthesizer();
