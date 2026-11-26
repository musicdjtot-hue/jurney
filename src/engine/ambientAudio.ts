export type AmbientAudioMode = 'road' | 'flight' | 'orbit' | 'space' | 'rv';

export class AmbientCabinAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private oscA: OscillatorNode | null = null;
  private oscB: OscillatorNode | null = null;
  private lfoOsc: OscillatorNode | null = null;
  private enabled = false;
  private lastMode: AmbientAudioMode = 'road';

  public isEnabled(): boolean {
    return this.enabled;
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.ensureInitialized();
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.setTargetAtTime(0.055, this.ctx.currentTime, 0.25);
      }
    } else if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.15);
    }
    return this.enabled;
  }

  private ensureInitialized(): void {
    if (this.ctx || typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      const ctx = new AudioCtx();
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 460;
      filter.Q.value = 0.8;

      const oscA = ctx.createOscillator();
      oscA.type = 'sine';
      oscA.frequency.value = 110;

      const oscB = ctx.createOscillator();
      oscB.type = 'triangle';
      oscB.frequency.value = 164.81;

      const gainB = ctx.createGain();
      gainB.gain.value = 0.32;

      const lfoOsc = ctx.createOscillator();
      lfoOsc.type = 'sine';
      lfoOsc.frequency.value = 0.14;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 120;

      lfoOsc.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      oscA.connect(filter);
      oscB.connect(gainB);
      gainB.connect(filter);
      filter.connect(masterGain);
      masterGain.connect(ctx.destination);

      oscA.start();
      oscB.start();
      lfoOsc.start();

      this.ctx = ctx;
      this.masterGain = masterGain;
      this.filter = filter;
      this.oscA = oscA;
      this.oscB = oscB;
      this.lfoOsc = lfoOsc;
    } catch {
      // AudioContext unavailable in restricted webview
    }
  }

  public update(mode: AmbientAudioMode): void {
    if (!this.enabled || !this.ctx || !this.oscA || !this.oscB || !this.filter) return;
    if (mode === this.lastMode) return;
    this.lastMode = mode;

    const now = this.ctx.currentTime;
    if (mode === 'space' || mode === 'orbit') {
      this.oscA.frequency.setTargetAtTime(98, now, 0.8);
      this.oscB.frequency.setTargetAtTime(146.83, now, 0.8);
      this.filter.frequency.setTargetAtTime(340, now, 0.8);
    } else if (mode === 'flight') {
      this.oscA.frequency.setTargetAtTime(130.81, now, 0.8);
      this.oscB.frequency.setTargetAtTime(196.0, now, 0.8);
      this.filter.frequency.setTargetAtTime(560, now, 0.8);
    } else if (mode === 'rv') {
      this.oscA.frequency.setTargetAtTime(116.54, now, 0.8);
      this.oscB.frequency.setTargetAtTime(174.61, now, 0.8);
      this.filter.frequency.setTargetAtTime(420, now, 0.8);
    } else {
      this.oscA.frequency.setTargetAtTime(110.0, now, 0.8);
      this.oscB.frequency.setTargetAtTime(164.81, now, 0.8);
      this.filter.frequency.setTargetAtTime(480, now, 0.8);
    }
  }

  public playChime(kind: 'fridge' | 'coffee' | 'arrived' | 'hatch'): void {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const baseFreq =
        kind === 'arrived' ? 587.33 : kind === 'coffee' ? 523.25 : kind === 'fridge' ? 440 : 392;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(
        kind === 'arrived' ? 880 : baseFreq * 1.25,
        now + 0.18,
      );
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch {
      // Ignore audio scheduling errors
    }
  }

  public dispose(): void {
    try {
      this.oscA?.stop();
      this.oscB?.stop();
      this.lfoOsc?.stop();
      void this.ctx?.close();
    } catch {
      // Ignore cleanup errors
    }
    this.ctx = null;
    this.masterGain = null;
    this.filter = null;
    this.oscA = null;
    this.oscB = null;
    this.lfoOsc = null;
  }
}
