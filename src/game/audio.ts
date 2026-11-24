type SettingsGetter = () => { music: boolean; sfx: boolean; gentle: boolean };

/**
 * Procedural music box + soft SFX. No samples, everything synthesized so it
 * works offline and stays tiny.
 */
export class Sfx {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  musicGain: GainNode | null = null;
  sfxGain: GainNode | null = null;
  getSettings: SettingsGetter;
  musicOn = false;
  musicTimer: number | null = null;
  step = 0;
  breathing = false;
  breaTimer: number | null = null;
  lastPlay: Record<string, number> = {};

  constructor(getSettings: SettingsGetter) {
    this.getSettings = getSettings;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    }
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.6;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.16;
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.5;
      this.sfxGain.connect(this.master);
      return this.ctx;
    } catch {
      return null;
    }
  }

  tone(
    freq: number,
    dur: number,
    opts: { type?: OscillatorType; vol?: number; delay?: number; slide?: number; bus?: 'sfx' | 'music'; attack?: number } = {},
  ) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, opts.slide), t0 + dur);
    const vol = opts.vol ?? 0.18;
    const attack = opts.attack ?? 0.012;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(opts.bus === 'music' ? this.musicGain! : this.sfxGain!);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  noise(dur: number, opts: { vol?: number; delay?: number; filter?: number; type?: BiquadFilterType } = {}) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = opts.type ?? 'lowpass';
    filter.frequency.value = opts.filter ?? 1200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(opts.vol ?? 0.08, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  play(name: string, vol = 1) {
    const s = this.getSettings();
    if (!s.sfx) return;
    const now = performance.now();
    const key = name;
    if (this.lastPlay[key] && now - this.lastPlay[key] < 60) return;
    this.lastPlay[key] = now;
    this.ensure();
    switch (name) {
      case 'step':
        this.noise(0.05, { vol: 0.03 * vol, filter: 700 });
        break;
      case 'select':
        this.tone(880, 0.08, { type: 'triangle', vol: 0.1 * vol });
        this.tone(1320, 0.1, { type: 'sine', vol: 0.06 * vol, delay: 0.03 });
        break;
      case 'talk':
        this.tone(523, 0.09, { type: 'sine', vol: 0.09 * vol });
        this.tone(659, 0.12, { type: 'sine', vol: 0.07 * vol, delay: 0.05 });
        break;
      case 'chime':
        this.tone(1046, 0.5, { type: 'sine', vol: 0.12 * vol });
        this.tone(1568, 0.6, { type: 'sine', vol: 0.07 * vol, delay: 0.05 });
        this.tone(2093, 0.4, { type: 'sine', vol: 0.04 * vol, delay: 0.1 });
        break;
      case 'eat':
        this.noise(0.08, { vol: 0.05 * vol, filter: 500 });
        this.tone(300, 0.1, { type: 'triangle', vol: 0.06 * vol, slide: 220 });
        break;
      case 'water':
        this.noise(0.35, { vol: 0.07 * vol, filter: 2200, type: 'bandpass' });
        this.tone(700, 0.2, { type: 'sine', vol: 0.05 * vol, slide: 1200 });
        break;
      case 'hug':
        this.tone(330, 0.35, { type: 'sine', vol: 0.1 * vol, slide: 440 });
        this.tone(495, 0.4, { type: 'sine', vol: 0.06 * vol, delay: 0.06, slide: 560 });
        break;
      case 'play':
        this.tone(660, 0.09, { type: 'square', vol: 0.06 * vol });
        this.tone(880, 0.09, { type: 'square', vol: 0.06 * vol, delay: 0.09 });
        this.tone(1100, 0.12, { type: 'square', vol: 0.05 * vol, delay: 0.18 });
        break;
      case 'sing':
        [523, 587, 659, 784].forEach((f, i) => this.tone(f, 0.32, { type: 'sine', vol: 0.07 * vol, delay: i * 0.12 }));
        break;
      case 'soothe':
        [440, 523, 659].forEach((f, i) => this.tone(f, 0.6, { type: 'sine', vol: 0.08 * vol, delay: i * 0.18 }));
        break;
      case 'tuck':
        [392, 330, 262].forEach((f, i) => this.tone(f, 0.6, { type: 'sine', vol: 0.08 * vol, delay: i * 0.18 }));
        break;
      case 'grow':
        [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.4, { type: 'triangle', vol: 0.09 * vol, delay: i * 0.08 }));
        break;
      case 'bloom':
        [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.8, { type: 'sine', vol: 0.1 * vol, delay: i * 0.1 }));
        this.noise(0.6, { vol: 0.03 * vol, filter: 4000, type: 'highpass', delay: 0.2 });
        break;
      case 'pick':
        this.tone(880, 0.1, { type: 'triangle', vol: 0.08 * vol });
        this.tone(1174, 0.12, { type: 'triangle', vol: 0.06 * vol, delay: 0.05 });
        break;
      case 'buy':
      case 'place':
        this.tone(440, 0.12, { type: 'triangle', vol: 0.1 * vol });
        this.tone(660, 0.18, { type: 'triangle', vol: 0.08 * vol, delay: 0.08 });
        break;
      case 'unlock':
        [392, 523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.9, { type: 'sine', vol: 0.1 * vol, delay: i * 0.11 }));
        break;
      case 'locked':
        this.tone(160, 0.16, { type: 'triangle', vol: 0.1 * vol, slide: 120 });
        break;
      case 'page':
        this.noise(0.16, { vol: 0.04 * vol, filter: 3500, type: 'highpass' });
        break;
      case 'letter':
        this.noise(0.3, { vol: 0.04 * vol, filter: 3000, type: 'highpass' });
        this.tone(1046, 0.5, { type: 'sine', vol: 0.08 * vol, delay: 0.1 });
        break;
      case 'morning':
        [392, 494, 587, 784].forEach((f, i) => this.tone(f, 1.2, { type: 'sine', vol: 0.09 * vol, delay: i * 0.14 }));
        break;
      case 'cry':
        this.tone(600, 0.6, { type: 'sine', vol: 0.07 * vol, slide: 380 });
        this.tone(520, 0.5, { type: 'sine', vol: 0.05 * vol, slide: 320, delay: 0.4 });
        break;
      case 'rain':
        this.noise(1.4, { vol: 0.03 * vol, filter: 2800, type: 'bandpass' });
        break;
      case 'walkzone':
        [392, 523, 659].forEach((f, i) => this.tone(f, 0.5, { type: 'sine', vol: 0.07 * vol, delay: i * 0.12 }));
        break;
      case 'breathin':
        this.tone(330, 0.5, { type: 'sine', vol: 0.06 * vol, slide: 440 });
        break;
      default:
        this.tone(440, 0.1, { type: 'sine', vol: 0.05 * vol });
    }
  }

  /** slow generative music box: pentatonic, sparse, calms with the garden */
  setMusic(on: boolean) {
    if (on === this.musicOn) return;
    this.musicOn = on;
    if (on) {
      const ctx = this.ensure();
      if (!ctx) return;
      void ctx.resume();
      this.step = 0;
      this.scheduleMusic();
    } else if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  scheduleMusic() {
    if (!this.musicOn) return;
    const s = this.getSettings();
    if (!s.music) {
      this.musicOn = false;
      return;
    }
    const scale = [262, 294, 330, 392, 440, 523, 587, 659];
    const pattern = [0, 2, 4, 2, 5, 4, 2, 1, 3, 5, 7, 5, 4, 2, 0, 2];
    const idx = pattern[this.step % pattern.length];
    const octave = this.step % 8 === 0 ? 1 : 0;
    const freq = scale[idx] * (octave ? 2 : 1) * (this.step % 32 > 28 ? 0.5 : 1);
    // melody
    this.tone(freq, 1.6, { type: 'sine', vol: 0.055, bus: 'music', attack: 0.02 });
    if (this.step % 4 === 0) {
      this.tone(scale[idx] / 2, 2.6, { type: 'sine', vol: 0.035, bus: 'music', attack: 0.05 });
    }
    if (this.step % 8 === 4) {
      this.tone(scale[(idx + 3) % 8] * 1.5, 1.2, { type: 'triangle', vol: 0.02, bus: 'music' });
    }
    this.step++;
    const delay = 900 + Math.random() * 500;
    this.musicTimer = window.setTimeout(() => this.scheduleMusic(), delay);
  }

  setMusicEnabled() {
    this.setMusic(this.getSettings().music);
  }

  setSfx() {
    /* gain is read live via getSettings for one-shots */
  }

  setBreathing(on: boolean) {
    this.breathing = on;
    if (on) {
      this.breathTick();
    } else if (this.breaTimer) {
      clearTimeout(this.breaTimer);
      this.breaTimer = null;
    }
  }

  breathTick() {
    if (!this.breathing) return;
    if (!this.getSettings().sfx) {
      this.breaTimer = window.setTimeout(() => this.breathTick(), 1000);
      return;
    }
    this.tone(392, 0.6, { type: 'sine', vol: 0.035, slide: 440 });
    this.breaTimer = window.setTimeout(() => this.breathTick(), 2400);
  }

  stopMusic() {
    this.musicOn = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.breaTimer) {
      clearTimeout(this.breaTimer);
      this.breaTimer = null;
    }
    this.breathing = false;
  }
}