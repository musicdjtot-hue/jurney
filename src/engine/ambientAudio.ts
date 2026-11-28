import type { AudioSettings, InteriorMode, VehicleFlightState, WeatherMode } from '../types/simulation';
import { DEFAULT_AUDIO_SETTINGS } from './saveSystem';
import type { ChunkZoneType } from './world';

export type AmbientAudioMode = 'road' | 'flight' | 'orbit' | 'space' | 'rv';

export interface AudioFrameInput {
  mode: AmbientAudioMode;
  flightState: VehicleFlightState;
  speedKmh: number;
  altitudeM: number;
  zoneType: ChunkZoneType;
  weather: WeatherMode;
  weatherBlend: number;
  isWalking: boolean;
  interiorMode: InteriorMode;
  inRvCabin: boolean;
  windowOpen: boolean;
  engineRunning: boolean;
  boostActive: boolean;
  insideHangar: boolean;
  planetBiome: string;
  delta: number;
  elapsed: number;
}

// Ethereal cosmic chord voicings (warm, meditative, low-frequency pads + pentatonic bells)
const COSMIC_CHORDS: readonly { padA: number; padB: number; scale: readonly number[] }[] = [
  // Am9
  { padA: 110.0, padB: 164.81, scale: [440.0, 493.88, 523.25, 659.25, 783.99, 987.77] },
  // Fmaj9
  { padA: 87.31, padB: 130.81, scale: [349.23, 440.0, 523.25, 587.33, 659.25, 783.99] },
  // Cmaj9
  { padA: 130.81, padB: 196.0, scale: [392.0, 440.0, 523.25, 587.33, 659.25, 783.99] },
  // Dm9 -> Em7
  { padA: 98.0, padB: 146.83, scale: [392.0, 493.88, 587.33, 659.25, 739.99, 880.0] },
];

export class AmbientCabinAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private radioBus: GainNode | null = null;
  private engineBus: GainNode | null = null;
  private worldBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;

  // Cabin meditative space radio nodes
  private radioPadFilter: BiquadFilterNode | null = null;
  private radioPadOscA: OscillatorNode | null = null;
  private radioPadOscB: OscillatorNode | null = null;
  private radioPadGain: GainNode | null = null;
  private radioDelay: DelayNode | null = null;
  private radioDelayFilter: BiquadFilterNode | null = null;
  private radioDelayFeedback: GainNode | null = null;

  // Pleasant engine hum nodes
  private engSubOsc: OscillatorNode | null = null;
  private engHarmOsc: OscillatorNode | null = null;
  private engHarmGain: GainNode | null = null;
  private engFilter: BiquadFilterNode | null = null;
  private engGain: GainNode | null = null;

  // World & weather noise loop nodes
  private noiseSource: AudioBufferSourceNode | null = null;
  private cityFilter: BiquadFilterNode | null = null;
  private cityGain: GainNode | null = null;
  private weatherFilter: BiquadFilterNode | null = null;
  private weatherGain: GainNode | null = null;

  private radioEnabled = false;
  private settings: AudioSettings = { ...DEFAULT_AUDIO_SETTINGS };

  // Lightweight schedulers (zero timers; ticked in animation loop)
  private chordIndex = 0;
  private nextChordTime = 0;
  private nextNoteTime = 0;
  private noteStep = 0;
  private nextTrafficSweepTime = 4;
  private nextThunderTime = 12;
  private footstepAccum = 0;

  constructor(initialSettings?: AudioSettings) {
    if (initialSettings) {
      this.settings = { ...initialSettings };
    }
  }

  public isEnabled(): boolean {
    return this.radioEnabled;
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public setSettings(next: AudioSettings): void {
    this.settings = { ...next };
    this.applyMixerGains();
  }

  public unlockFromGesture(): void {
    this.ensureInitialized();
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  public toggle(): boolean {
    this.radioEnabled = !this.radioEnabled;
    this.unlockFromGesture();
    if (this.ctx && this.radioEnabled) {
      const now = this.ctx.currentTime;
      this.nextNoteTime = now + 0.12;
      this.nextChordTime = now + 7.5;
    }
    this.applyMixerGains();
    return this.radioEnabled;
  }

  public setRadioEnabled(on: boolean): void {
    this.radioEnabled = on;
    if (on) {
      this.unlockFromGesture();
    }
    this.applyMixerGains();
  }

  private applyMixerGains(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const master = this.settings.muted ? 0 : this.settings.masterVolume;
    this.masterGain?.gain.setTargetAtTime(master, now, 0.05);
    this.engineBus?.gain.setTargetAtTime(this.settings.engineVolume, now, 0.06);
    this.worldBus?.gain.setTargetAtTime(this.settings.worldVolume, now, 0.06);
    this.sfxBus?.gain.setTargetAtTime(this.settings.sfxVolume, now, 0.05);
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
      masterGain.gain.value = this.settings.muted ? 0 : this.settings.masterVolume;
      masterGain.connect(ctx.destination);

      const radioBus = ctx.createGain();
      radioBus.gain.value = 0; // Dynamically gated by radioEnabled && inVehicle
      radioBus.connect(masterGain);

      const engineBus = ctx.createGain();
      engineBus.gain.value = this.settings.engineVolume;
      engineBus.connect(masterGain);

      const worldBus = ctx.createGain();
      worldBus.gain.value = this.settings.worldVolume;
      worldBus.connect(masterGain);

      const sfxBus = ctx.createGain();
      sfxBus.gain.value = this.settings.sfxVolume;
      sfxBus.connect(masterGain);

      // 1. Meditative Cosmic Radio (Pad + Subtle Soft Echo Delay)
      const radioPadFilter = ctx.createBiquadFilter();
      radioPadFilter.type = 'lowpass';
      radioPadFilter.frequency.value = 390;
      radioPadFilter.Q.value = 0.6;

      const radioPadGain = ctx.createGain();
      radioPadGain.gain.value = 0.036;

      const chord0 = COSMIC_CHORDS[0];
      const radioPadOscA = ctx.createOscillator();
      radioPadOscA.type = 'sine';
      radioPadOscA.frequency.value = chord0.padA;

      const radioPadOscB = ctx.createOscillator();
      radioPadOscB.type = 'triangle';
      radioPadOscB.frequency.value = chord0.padB;

      const padBGain = ctx.createGain();
      padBGain.gain.value = 0.28;

      const radioDelay = ctx.createDelay(1.0);
      radioDelay.delayTime.value = 0.38;
      const radioDelayFilter = ctx.createBiquadFilter();
      radioDelayFilter.type = 'lowpass';
      radioDelayFilter.frequency.value = 1150;
      const radioDelayFeedback = ctx.createGain();
      radioDelayFeedback.gain.value = 0.34;

      radioDelay.connect(radioDelayFilter);
      radioDelayFilter.connect(radioDelayFeedback);
      radioDelayFeedback.connect(radioDelay);
      radioDelayFilter.connect(radioBus);

      radioPadOscA.connect(radioPadFilter);
      radioPadOscB.connect(padBGain);
      padBGain.connect(radioPadFilter);
      radioPadFilter.connect(radioPadGain);
      radioPadGain.connect(radioBus);

      radioPadOscA.start();
      radioPadOscB.start();

      // 2. Pleasant Hybrid-Electric / Smooth Turbine Engine Graph
      const engSubOsc = ctx.createOscillator();
      engSubOsc.type = 'sine';
      engSubOsc.frequency.value = 44;

      const engHarmOsc = ctx.createOscillator();
      engHarmOsc.type = 'triangle';
      engHarmOsc.frequency.value = 88;

      const engHarmGain = ctx.createGain();
      engHarmGain.gain.value = 0.32;

      const engFilter = ctx.createBiquadFilter();
      engFilter.type = 'lowpass';
      engFilter.frequency.value = 180;
      engFilter.Q.value = 0.9;

      const engGain = ctx.createGain();
      engGain.gain.value = 0;

      engSubOsc.connect(engFilter);
      engHarmOsc.connect(engHarmGain);
      engHarmGain.connect(engFilter);
      engFilter.connect(engGain);
      engGain.connect(engineBus);

      engSubOsc.start();
      engHarmOsc.start();

      // 3. World / City / Rain Single Pre-Baked Pink-Brown Noise Loop (ultra-low CPU)
      const bufLen = Math.floor(ctx.sampleRate * 2.2);
      const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const ch = noiseBuf.getChannelData(0);
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      for (let i = 0; i < bufLen; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.996 * b0 + white * 0.045;
        b1 = 0.985 * b1 + white * 0.065;
        b2 = 0.91 * b2 + white * 0.11;
        ch[i] = Math.max(-0.9, Math.min(0.9, (b0 + b1 * 0.65 + b2 * 0.32) * 0.95));
      }
      // Crossfade loop seam smoothly over last 512 samples
      for (let i = 0; i < 512; i++) {
        const t = i / 512;
        ch[i] = ch[i] * t + ch[bufLen - 512 + i] * (1 - t);
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuf;
      noiseSource.loop = true;

      const cityFilter = ctx.createBiquadFilter();
      cityFilter.type = 'lowpass';
      cityFilter.frequency.value = 280;
      cityFilter.Q.value = 0.7;

      const cityGain = ctx.createGain();
      cityGain.gain.value = 0;

      const weatherFilter = ctx.createBiquadFilter();
      weatherFilter.type = 'bandpass';
      weatherFilter.frequency.value = 950;
      weatherFilter.Q.value = 0.55;

      const weatherGain = ctx.createGain();
      weatherGain.gain.value = 0;

      noiseSource.connect(cityFilter);
      cityFilter.connect(cityGain);
      cityGain.connect(worldBus);

      noiseSource.connect(weatherFilter);
      weatherFilter.connect(weatherGain);
      weatherGain.connect(worldBus);

      noiseSource.start();

      this.ctx = ctx;
      this.masterGain = masterGain;
      this.radioBus = radioBus;
      this.engineBus = engineBus;
      this.worldBus = worldBus;
      this.sfxBus = sfxBus;

      this.radioPadFilter = radioPadFilter;
      this.radioPadOscA = radioPadOscA;
      this.radioPadOscB = radioPadOscB;
      this.radioPadGain = radioPadGain;
      this.radioDelay = radioDelay;
      this.radioDelayFilter = radioDelayFilter;
      this.radioDelayFeedback = radioDelayFeedback;

      this.engSubOsc = engSubOsc;
      this.engHarmOsc = engHarmOsc;
      this.engHarmGain = engHarmGain;
      this.engFilter = engFilter;
      this.engGain = engGain;

      this.noiseSource = noiseSource;
      this.cityFilter = cityFilter;
      this.cityGain = cityGain;
      this.weatherFilter = weatherFilter;
      this.weatherGain = weatherGain;

      this.nextChordTime = ctx.currentTime + 7.5;
      this.nextNoteTime = ctx.currentTime + 0.4;
    } catch {
      // AudioContext unavailable in restricted webview
    }
  }

  public update(state: AudioFrameInput): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    // --- 1. CABIN-BOUND MEDITATIVE COSMIC RADIO ---
    // Plays strictly inside the vehicle (driver cab or RV mini-home), muted when walking outside or indoors!
    const inVehicle = !state.isWalking && state.interiorMode === 'none';
    const radioAudible = this.radioEnabled && inVehicle;
    const targetRadioGain = radioAudible ? this.settings.radioVolume * 0.52 : 0;
    this.radioBus?.gain.setTargetAtTime(targetRadioGain, now, radioAudible ? 0.22 : 0.16);

    if (radioAudible && this.radioPadOscA && this.radioPadOscB && this.radioPadFilter) {
      if (now >= this.nextChordTime) {
        this.chordIndex = (this.chordIndex + 1) % COSMIC_CHORDS.length;
        const ch = COSMIC_CHORDS[this.chordIndex];
        this.radioPadOscA.frequency.setTargetAtTime(ch.padA, now, 1.4);
        this.radioPadOscB.frequency.setTargetAtTime(ch.padB, now, 1.4);
        this.nextChordTime = now + 8.0 + (this.chordIndex % 2) * 1.5;
      }

      const targetPadFilter =
        state.mode === 'space' || state.mode === 'orbit'
          ? 320
          : state.mode === 'rv'
            ? 380
            : 450;
      this.radioPadFilter.frequency.setTargetAtTime(targetPadFilter, now, 0.7);

      if (now >= this.nextNoteTime) {
        const ch = COSMIC_CHORDS[this.chordIndex];
        const scaleIdx = (this.noteStep * 2 + (this.noteStep % 3)) % ch.scale.length;
        const freq = ch.scale[scaleIdx];
        this.triggerCosmicBellNote(freq, now);
        this.noteStep++;
        const gap = state.mode === 'space' || state.mode === 'orbit' ? 1.45 : 1.15;
        this.nextNoteTime = now + gap + (this.noteStep % 3) * 0.35;
      }
    }

    // --- 2. ENGINE HUM (ROAD / FLIGHT / SPACE) ---
    if (this.engSubOsc && this.engHarmOsc && this.engFilter && this.engGain && this.engHarmGain) {
      if (!state.engineRunning || state.interiorMode !== 'none') {
        this.engGain.gain.setTargetAtTime(0, now, 0.12);
      } else {
        const normSpeed = Math.min(1, state.speedKmh / 240);
        const boostBonus = state.boostActive ? 0.18 : 0;
        let baseSub = 44;
        let harmMult = 2.0;
        let filterCutoff = 140;
        let baseVol = 0.055;

        if (state.flightState === 'space' || state.flightState === 'orbit') {
          baseSub = 56 + normSpeed * 38;
          harmMult = 2.5;
          filterCutoff = 220 + normSpeed * 260;
          baseVol = 0.036 + normSpeed * 0.035;
        } else if (state.flightState !== 'road') {
          baseSub = 62 + normSpeed * 58 + boostBonus * 25;
          harmMult = 2.0;
          filterCutoff = 220 + normSpeed * 420 + boostBonus * 140;
          baseVol = 0.045 + normSpeed * 0.048 + boostBonus * 0.025;
        } else {
          // Road: smooth low electric-hybrid / 6-cyl purr
          baseSub = 42 + normSpeed * 74 + boostBonus * 22;
          harmMult = 1.98;
          filterCutoff = 135 + normSpeed * 330 + boostBonus * 120;
          baseVol = 0.048 + normSpeed * 0.062 + boostBonus * 0.028;
        }

        // Exterior vs open window vs closed cabin acoustics for engine
        if (state.isWalking) {
          // Outside idling car sounds quieter and slightly farther
          baseVol *= 0.42;
          filterCutoff *= 1.15;
        } else if (state.windowOpen) {
          baseVol *= 1.15;
          filterCutoff *= 1.25;
        } else if (state.inRvCabin) {
          baseVol *= 0.72;
          filterCutoff *= 0.82;
        }

        this.engSubOsc.frequency.setTargetAtTime(baseSub, now, 0.08);
        this.engHarmOsc.frequency.setTargetAtTime(baseSub * harmMult, now, 0.08);
        this.engFilter.frequency.setTargetAtTime(filterCutoff, now, 0.1);
        this.engHarmGain.gain.setTargetAtTime(
          state.flightState === 'road' ? 0.28 + normSpeed * 0.14 : 0.22,
          now,
          0.1,
        );
        this.engGain.gain.setTargetAtTime(baseVol, now, 0.09);
      }
    }

    // --- 3. WORLD, CITY & WEATHER AMBIENCE WITH HERMETIC CABIN ISOLATION ---
    if (this.cityFilter && this.cityGain && this.weatherFilter && this.weatherGain) {
      const inDeepSpace = state.flightState === 'space' || state.flightState === 'orbit';
      const inBuilding = state.interiorMode !== 'none';

      // Cabin acoustic seal factor:
      // Closed car = 0.16 muffled; Open window = 0.74 clear; Walking outside = 1.0 full!
      const outsidePresence = inBuilding
        ? 0.06
        : state.isWalking
          ? 1.0
          : state.windowOpen
            ? 0.74
            : 0.16;

      if (inDeepSpace) {
        this.cityGain.gain.setTargetAtTime(0.004, now, 0.3);
        this.weatherGain.gain.setTargetAtTime(0, now, 0.25);
      } else {
        const altFade = Math.max(0.15, 1 - Math.min(1, state.altitudeM / 180) * 0.75);
        const isCityZone = state.zoneType === 'city' || state.zoneType === 'viaduct';
        const isParkZone = state.zoneType === 'park';

        // City / wind / road speed whisper
        const speedWind = state.isWalking ? 0 : Math.min(0.065, (state.speedKmh / 240) * 0.065);
        const cityBase = isCityZone ? 0.095 : isParkZone ? 0.052 : 0.036;
        const targetCityVol = (cityBase * altFade + speedWind) * outsidePresence * (state.insideHangar ? 0.45 : 1);

        // Acoustic lowpass opens when window is open or walking outside
        let targetCityFreq = state.isWalking
          ? isCityZone
            ? 2150
            : 1250
          : state.windowOpen
            ? isCityZone
              ? 1550
              : 980
            : 255;

        // Subtle urban traffic breath modulation when outside or window open in city
        if (isCityZone && (state.isWalking || state.windowOpen) && state.elapsed >= this.nextTrafficSweepTime) {
          this.nextTrafficSweepTime = state.elapsed + 5.5 + (Math.sin(state.elapsed * 1.7) + 1) * 3.2;
          targetCityFreq += 480;
        }

        this.cityFilter.frequency.setTargetAtTime(targetCityFreq, now, 0.22);
        this.cityGain.gain.setTargetAtTime(targetCityVol, now, 0.2);

        // Weather audio (rain / storm / snow wind)
        let weatherBase = 0;
        let weatherFreq = 750;
        if (!state.insideHangar) {
          if (state.weather === 'rain') {
            weatherBase = 0.095 * state.weatherBlend;
            weatherFreq = state.isWalking ? 2250 : state.windowOpen ? 1650 : 340;
          } else if (state.weather === 'storm') {
            weatherBase = 0.135 * state.weatherBlend;
            weatherFreq = state.isWalking ? 2450 : state.windowOpen ? 1750 : 380;
            if (state.elapsed >= this.nextThunderTime && !inBuilding) {
              this.nextThunderTime = state.elapsed + 14 + (Math.cos(state.elapsed * 0.9) + 1) * 6;
              this.playThunderRumble(outsidePresence);
            }
          } else if (state.weather === 'snow') {
            weatherBase = 0.038 * state.weatherBlend;
            weatherFreq = state.isWalking ? 900 : state.windowOpen ? 680 : 220;
          } else if (state.weather === 'cloudy') {
            weatherBase = 0.018 * state.weatherBlend;
            weatherFreq = 520;
          }
        }

        this.weatherFilter.frequency.setTargetAtTime(weatherFreq, now, 0.22);
        this.weatherGain.gain.setTargetAtTime(weatherBase * outsidePresence, now, 0.22);
      }
    }

    // --- 4. SOFT ORGANIC FOOTSTEPS WHEN WALKING ---
    if (state.isWalking && state.speedKmh > 1.2) {
      const stepFreq = state.boostActive ? 3.2 : 2.05;
      this.footstepAccum += state.delta * stepFreq;
      if (this.footstepAccum >= 1) {
        this.footstepAccum -= 1;
        this.playFootstep(state.zoneType === 'city' || state.zoneType === 'viaduct', state.interiorMode !== 'none');
      }
    } else {
      this.footstepAccum = 0.55;
    }
  }

  private triggerCosmicBellNote(freq: number, now: number): void {
    if (!this.ctx || !this.radioBus || !this.radioDelay) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.042, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0002, now + 2.15);

      osc.connect(gain);
      gain.connect(this.radioBus);
      gain.connect(this.radioDelay);

      osc.start(now);
      osc.stop(now + 2.25);
    } catch {
      // Ignore scheduling errors
    }
  }

  public playEngineIgnition(starting: boolean): void {
    this.unlockFromGesture();
    if (!this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      if (starting) {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(36, now);
        osc.frequency.exponentialRampToValueAtTime(118, now + 0.26);
        osc.frequency.exponentialRampToValueAtTime(64, now + 0.62);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.11, now + 0.09);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.66);
        osc.connect(gain);
        gain.connect(this.sfxBus);
        osc.start(now);
        osc.stop(now + 0.7);

        // Soft futuristic ignition ready chime
        const chime = this.ctx.createOscillator();
        const cGain = this.ctx.createGain();
        chime.type = 'sine';
        chime.frequency.setValueAtTime(392, now + 0.14);
        chime.frequency.exponentialRampToValueAtTime(523.25, now + 0.34);
        cGain.gain.setValueAtTime(0.0001, now + 0.14);
        cGain.gain.linearRampToValueAtTime(0.045, now + 0.18);
        cGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.52);
        chime.connect(cGain);
        cGain.connect(this.sfxBus);
        chime.start(now + 0.14);
        chime.stop(now + 0.55);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(86, now);
        osc.frequency.exponentialRampToValueAtTime(28, now + 0.45);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.48);
        osc.connect(gain);
        gain.connect(this.sfxBus);
        osc.start(now);
        osc.stop(now + 0.52);
      }
    } catch {
      // Ignore audio error
    }
  }

  public playWindowSlide(opening: boolean): void {
    this.unlockFromGesture();
    if (!this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(opening ? 240 : 320, now);
      osc.frequency.linearRampToValueAtTime(opening ? 330 : 210, now + 0.22);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.032, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0004, now + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxBus);
      osc.start(now);
      osc.stop(now + 0.28);
    } catch {
      // Ignore
    }
  }

  public playDoorLatch(exiting: boolean): void {
    this.unlockFromGesture();
    if (!this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(exiting ? 135 : 108, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.14);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.0006, now + 0.16);
      osc.connect(gain);
      gain.connect(this.sfxBus);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch {
      // Ignore
    }
  }

  public playBoostWhoosh(): void {
    this.unlockFromGesture();
    if (!this.ctx || !this.sfxBus) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.28);
      osc.frequency.exponentialRampToValueAtTime(190, now + 0.6);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.055, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.62);
      osc.connect(gain);
      gain.connect(this.sfxBus);
      osc.start(now);
      osc.stop(now + 0.65);
    } catch {
      // Ignore
    }
  }

  private playFootstep(hardSurface: boolean, indoor: boolean): void {
    if (!this.ctx || !this.worldBus) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const base = indoor ? 98 : hardSurface ? 115 : 82;
      osc.frequency.setValueAtTime(base, now);
      osc.frequency.exponentialRampToValueAtTime(44, now + 0.065);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(indoor ? 0.025 : 0.036, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.08);
      osc.connect(gain);
      gain.connect(this.worldBus);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // Ignore
    }
  }

  private playThunderRumble(presence: number): void {
    if (!this.ctx || !this.worldBus) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(58, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 1.6);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.075 * Math.max(0.25, presence), now + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 1.9);
      osc.connect(gain);
      gain.connect(this.worldBus);
      osc.start(now);
      osc.stop(now + 2.0);
    } catch {
      // Ignore
    }
  }

  public playChime(kind: 'fridge' | 'coffee' | 'arrived' | 'hatch'): void {
    this.unlockFromGesture();
    if (!this.ctx || !this.sfxBus || this.ctx.state !== 'running') return;
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
      gain.gain.linearRampToValueAtTime(0.055, now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.28);
      osc.connect(gain);
      gain.connect(this.sfxBus);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch {
      // Ignore audio scheduling errors
    }
  }

  public playSaberSwing(isLegendary = false): void {
    this.unlockFromGesture();
    if (!this.ctx || !this.sfxBus || this.ctx.state !== 'running') return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(isLegendary ? 148 : 132, now);
      osc.frequency.exponentialRampToValueAtTime(isLegendary ? 235 : 196, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(98, now + 0.28);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(780, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.065, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.29);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxBus);
      osc.start(now);
      osc.stop(now + 0.31);
    } catch {
      // Ignore
    }
  }

  public playBlasterShot(): void {
    this.unlockFromGesture();
    if (!this.ctx || !this.sfxBus || this.ctx.state !== 'running') return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(920, now);
      osc.frequency.exponentialRampToValueAtTime(190, now + 0.14);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.07, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.15);
      osc.connect(gain);
      gain.connect(this.sfxBus);
      osc.start(now);
      osc.stop(now + 0.16);
    } catch {
      // Ignore
    }
  }

  public playPunchHit(): void {
    this.unlockFromGesture();
    if (!this.ctx || !this.sfxBus || this.ctx.state !== 'running') return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(48, now + 0.11);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.12);
      osc.connect(gain);
      gain.connect(this.sfxBus);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // Ignore
    }
  }

  public playHealChime(): void {
    this.unlockFromGesture();
    if (!this.ctx || !this.sfxBus || this.ctx.state !== 'running') return;
    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 987.77];
      for (let i = 0; i < notes.length; i++) {
        const t = now + i * 0.075;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(notes[i], t);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.048, t + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0004, t + 0.36);
        osc.connect(gain);
        gain.connect(this.sfxBus);
        osc.start(t);
        osc.stop(t + 0.38);
      }
    } catch {
      // Ignore
    }
  }

  public playLootDrop(isRare: boolean): void {
    this.unlockFromGesture();
    if (!this.ctx || !this.sfxBus || this.ctx.state !== 'running') return;
    try {
      const now = this.ctx.currentTime;
      const notes = isRare ? [587.33, 880, 1174.66] : [523.25, 659.25];
      for (let i = 0; i < notes.length; i++) {
        const t = now + i * 0.065;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(notes[i], t);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.052, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0004, t + 0.28);
        osc.connect(gain);
        gain.connect(this.sfxBus);
        osc.start(t);
        osc.stop(t + 0.3);
      }
    } catch {
      // Ignore
    }
  }

  public playPoliceBeep(): void {
    this.unlockFromGesture();
    if (!this.ctx || !this.sfxBus || this.ctx.state !== 'running') return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(760, now);
      osc.frequency.setValueAtTime(580, now + 0.14);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.04, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.3);
      osc.connect(gain);
      gain.connect(this.sfxBus);
      osc.start(now);
      osc.stop(now + 0.32);
    } catch {
      // Ignore
    }
  }

  public dispose(): void {
    try {
      this.radioPadOscA?.stop();
      this.radioPadOscB?.stop();
      this.engSubOsc?.stop();
      this.engHarmOsc?.stop();
      this.noiseSource?.stop();
      void this.ctx?.close();
    } catch {
      // Ignore cleanup errors
    }
    this.ctx = null;
    this.masterGain = null;
    this.radioBus = null;
    this.engineBus = null;
    this.worldBus = null;
    this.sfxBus = null;
    this.radioPadFilter = null;
    this.radioPadOscA = null;
    this.radioPadOscB = null;
    this.radioPadGain = null;
    this.radioDelay = null;
    this.radioDelayFilter = null;
    this.radioDelayFeedback = null;
    this.engSubOsc = null;
    this.engHarmOsc = null;
    this.engHarmGain = null;
    this.engFilter = null;
    this.engGain = null;
    this.noiseSource = null;
    this.cityFilter = null;
    this.cityGain = null;
    this.weatherFilter = null;
    this.weatherGain = null;
  }
}
