/**
 * Arcade Sound Effects Engine using Web Audio API
 * Generates responsive, punchy physics impacts, metal clangs, bomb blasts, and coin chimes.
 */

class SoundEffectsEngine {
  private ctx: AudioContext | null = null;
  private volume = 0.8;
  private _isMuted = false;

  public get isMuted(): boolean {
    return this._isMuted || this.volume <= 0.001;
  }

  public set isMuted(muted: boolean) {
    this._isMuted = muted;
  }

  private init() {
    if (this.ctx) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
    } catch {
      console.warn('Web Audio not supported');
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
  }

  public setMuted(muted: boolean) {
    this._isMuted = muted;
  }

  public playWhack(isCrit = false) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    // Punchy low thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isCrit ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isCrit ? 280 : 200, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

    gain.gain.setValueAtTime(this.volume * (isCrit ? 0.9 : 0.6), now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);

    // Mole Squeak accent
    const squeak = this.ctx.createOscillator();
    const squeakGain = this.ctx.createGain();
    squeak.type = 'sine';
    squeak.frequency.setValueAtTime(800, now + 0.02);
    squeak.frequency.exponentialRampToValueAtTime(1400, now + 0.08);
    squeak.frequency.exponentialRampToValueAtTime(600, now + 0.13);

    squeakGain.gain.setValueAtTime(this.volume * 0.25, now + 0.02);
    squeakGain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

    squeak.connect(squeakGain);
    squeakGain.connect(this.ctx.destination);

    squeak.start(now + 0.02);
    squeak.stop(now + 0.15);
  }

  /**
   * Authentic wooden Uslero dough-smash and flour puff sound
   */
  public playUsleroSmash(isCrit = false) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;

    // 1. Deep solid beechwood hollow impact
    const woodOsc = this.ctx.createOscillator();
    const woodGain = this.ctx.createGain();
    woodOsc.type = isCrit ? 'triangle' : 'sine';
    woodOsc.frequency.setValueAtTime(isCrit ? 360 : 250, now);
    woodOsc.frequency.exponentialRampToValueAtTime(55, now + 0.11);

    woodGain.gain.setValueAtTime(this.volume * (isCrit ? 0.95 : 0.75), now);
    woodGain.gain.exponentialRampToValueAtTime(0.005, now + 0.13);

    woodOsc.connect(woodGain);
    woodGain.connect(this.ctx.destination);
    woodOsc.start(now);
    woodOsc.stop(now + 0.14);

    // 2. Crisp slap transient of dough & rolling pin contact
    const snapOsc = this.ctx.createOscillator();
    const snapGain = this.ctx.createGain();
    snapOsc.type = 'triangle';
    snapOsc.frequency.setValueAtTime(920, now);
    snapOsc.frequency.exponentialRampToValueAtTime(160, now + 0.04);
    snapGain.gain.setValueAtTime(this.volume * 0.45, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    snapOsc.connect(snapGain);
    snapGain.connect(this.ctx.destination);
    snapOsc.start(now);
    snapOsc.stop(now + 0.06);

    // 3. Flour puff burst (filtered white noise)
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.Q.setValueAtTime(1.2, now);
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(this.volume * (isCrit ? 0.35 : 0.22), now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);
      noise.stop(now + 0.09);
    } catch {}

    // 4. Mole squeak
    const squeak = this.ctx.createOscillator();
    const squeakGain = this.ctx.createGain();
    squeak.type = 'sine';
    squeak.frequency.setValueAtTime(750, now + 0.02);
    squeak.frequency.exponentialRampToValueAtTime(1350, now + 0.07);
    squeak.frequency.exponentialRampToValueAtTime(500, now + 0.12);
    squeakGain.gain.setValueAtTime(this.volume * 0.22, now + 0.02);
    squeakGain.gain.exponentialRampToValueAtTime(0.01, now + 0.13);
    squeak.connect(squeakGain);
    squeakGain.connect(this.ctx.destination);
    squeak.start(now + 0.02);
    squeak.stop(now + 0.14);
  }

  public playMetalClang() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const freqs = [840, 1120, 1750, 2400];

    freqs.forEach((f, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = idx % 2 === 0 ? 'sine' : 'square';
      osc.frequency.setValueAtTime(f, now);

      gain.gain.setValueAtTime(this.volume * 0.25 / (idx + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.36);
    });
  }

  public playExplosion() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    // Low rumble
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.45);

    gain.gain.setValueAtTime(this.volume * 0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.52);

    // Noise blast
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.4);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(this.volume * 0.7, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.42);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 0.43);
  }

  public playCoin() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(987.77, now); // B5
    osc1.frequency.setValueAtTime(1318.51, now + 0.08); // E6

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1318.51, now);
    osc2.frequency.setValueAtTime(1975.53, now + 0.08);

    gain.gain.setValueAtTime(this.volume * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.36);
    osc2.stop(now + 0.36);
  }

  public playFrost() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1600, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.25);

    gain.gain.setValueAtTime(this.volume * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.29);
  }

  public playComboStreak(combo: number) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const baseFreq = 440 + Math.min(15, combo) * 45;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.15);

    gain.gain.setValueAtTime(this.volume * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playPowerup() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((f, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = now + i * 0.06;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, startTime);

      gain.gain.setValueAtTime(this.volume * 0.35, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.26);
    });
  }

  public playButtonClick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.04);

    gain.gain.setValueAtTime(this.volume * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playFastWhoosh() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);

    gain.gain.setValueAtTime(this.volume * 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  public playArmorBreak() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    this.playMetalClang();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);

    gain.gain.setValueAtTime(this.volume * 0.4, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now + 0.05);
    osc.stop(now + 0.32);
  }

  public playBossRoar() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.linearRampToValueAtTime(140, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.45);

    gain.gain.setValueAtTime(this.volume * 0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.52);
  }

  public playRainbowChime() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const notes = [587.33, 739.99, 880.0, 1174.66, 1479.98]; // D5, F#5, A5, D6, F#6
    notes.forEach((f, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = now + i * 0.04;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, startTime);

      gain.gain.setValueAtTime(this.volume * 0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.32);
    });
  }

  public playPhantomPhase() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);

    gain.gain.setValueAtTime(this.volume * 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  public playPizzaOvenRoar() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;

    // 1. Low rumbling oven draft
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(65, now);
    osc.frequency.linearRampToValueAtTime(140, now + 0.2);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.6);

    gain.gain.setValueAtTime(this.volume * 0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.65);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.66);

    // 2. High sizzle flare
    const noise = this.ctx.createOscillator();
    const noiseGain = this.ctx.createGain();
    noise.type = 'triangle';
    noise.frequency.setValueAtTime(320, now);
    noise.frequency.exponentialRampToValueAtTime(880, now + 0.25);
    noise.frequency.exponentialRampToValueAtTime(180, now + 0.5);

    noiseGain.gain.setValueAtTime(this.volume * 0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    noise.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(now);
    noise.stop(now + 0.56);
  }

  public playFireBurn() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.2);

    gain.gain.setValueAtTime(this.volume * 0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  public playIngredientDrop() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    // Harmonious dual chime (bell-like chime with sizzle sparkle)
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.05, now + idx * 0.04 + 0.12);

      gain.gain.setValueAtTime(this.volume * 0.25, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.22);
    });
  }

  public playBakeRecipe() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;

    // 1. Oven Sizzle Burst
    const sizzle = this.ctx.createOscillator();
    const sGain = this.ctx.createGain();
    sizzle.type = 'sawtooth';
    sizzle.frequency.setValueAtTime(440, now);
    sizzle.frequency.exponentialRampToValueAtTime(120, now + 0.4);
    sGain.gain.setValueAtTime(this.volume * 0.5, now);
    sGain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
    sizzle.connect(sGain);
    sGain.connect(this.ctx.destination);
    sizzle.start(now);
    sizzle.stop(now + 0.45);

    // 2. Triumphal Italian Master Fanfare (C Major arpeggio + fanfare octave)
    const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const delay = 0.15 + idx * 0.07;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(this.volume * (idx === notes.length - 1 ? 0.6 : 0.35), now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.42);
    });
  }

  public playPageFlip() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

    gain.gain.setValueAtTime(this.volume * 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  // ==========================================
  // UNIQUE MOLE SPAWN AUDIO CUES
  // ==========================================

  /**
   * Metallic clank for Helmet Mole spawn (construction hardhat clink)
   */
  public playHelmetSpawn() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    // Crisp metallic hardhat clank: multi-resonant frequencies with snappy decay
    const metalFreqs = [1120, 1680, 2450];
    metalFreqs.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = idx === 0 ? 'triangle' : 'square';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.92, now + 0.18);

      gain.gain.setValueAtTime((this.volume * 0.28) / (idx + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.23);
    });

    // Helmet rim tap transient
    const tapOsc = this.ctx.createOscillator();
    const tapGain = this.ctx.createGain();
    tapOsc.type = 'sine';
    tapOsc.frequency.setValueAtTime(320, now);
    tapOsc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
    tapGain.gain.setValueAtTime(this.volume * 0.35, now);
    tapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    tapOsc.connect(tapGain);
    tapGain.connect(this.ctx.destination);
    tapOsc.start(now);
    tapOsc.stop(now + 0.1);
  }

  /**
   * Soft melodic giggle for Phantom Mole spawn (eerie, playful ghost giggle)
   */
  public playPhantomGiggle() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    // Soft, charming ghost giggle: 4 staccato pitches with pitch inflection
    const giggleNotes = [
      { freq: 720, delay: 0, dur: 0.07 },
      { freq: 880, delay: 0.08, dur: 0.07 },
      { freq: 760, delay: 0.16, dur: 0.06 },
      { freq: 940, delay: 0.23, dur: 0.09 },
    ];

    giggleNotes.forEach(({ freq, delay, dur }) => {
      if (!this.ctx) return;
      const t = now + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.15, t + dur * 0.5);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.95, t + dur);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(this.volume * 0.22, t + dur * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + dur + 0.02);
    });

    // Whimsical phantom harmonic shimmer
    const shimmer = this.ctx.createOscillator();
    const shimmerGain = this.ctx.createGain();
    shimmer.type = 'triangle';
    shimmer.frequency.setValueAtTime(1400, now);
    shimmer.frequency.exponentialRampToValueAtTime(1800, now + 0.2);
    shimmer.frequency.exponentialRampToValueAtTime(1200, now + 0.35);
    shimmerGain.gain.setValueAtTime(this.volume * 0.1, now);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(this.ctx.destination);
    shimmer.start(now);
    shimmer.stop(now + 0.38);
  }

  /**
   * Cute earth pop and chirping peek for Standard Mole spawn
   */
  public playStandardSpawn() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);

    gain.gain.setValueAtTime(this.volume * 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Heavy armored steel thud for Tough Mole spawn
   */
  public playToughSpawn() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    // Deep bass impact
    const bassOsc = this.ctx.createOscillator();
    const bassGain = this.ctx.createGain();
    bassOsc.type = 'triangle';
    bassOsc.frequency.setValueAtTime(180, now);
    bassOsc.frequency.exponentialRampToValueAtTime(55, now + 0.18);
    bassGain.gain.setValueAtTime(this.volume * 0.45, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    bassOsc.connect(bassGain);
    bassGain.connect(this.ctx.destination);
    bassOsc.start(now);
    bassOsc.stop(now + 0.22);

    // Dull iron plate clank
    const clang = this.ctx.createOscillator();
    const cGain = this.ctx.createGain();
    clang.type = 'square';
    clang.frequency.setValueAtTime(640, now);
    clang.frequency.exponentialRampToValueAtTime(420, now + 0.14);
    cGain.gain.setValueAtTime(this.volume * 0.22, now);
    cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    clang.connect(cGain);
    cGain.connect(this.ctx.destination);
    clang.start(now);
    clang.stop(now + 0.18);
  }

  /**
   * Shimmering golden glockenspiel sparkle for Golden Mole spawn
   */
  public playGoldenSpawn() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const notes = [1318.51, 1661.22, 1975.53, 2637.02]; // E6, G#6, B6, E7
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const t = now + idx * 0.045;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(this.volume * 0.26, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.26);
    });
  }

  /**
   * Radiant prismatic sparkle glissando for Rainbow Mole spawn
   */
  public playRainbowSpawn() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const chord = [659.25, 830.61, 987.77, 1318.51, 1567.98];
    chord.forEach((freq, idx) => {
      if (!this.ctx) return;
      const t = now + idx * 0.035;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.linearRampToValueAtTime(freq * 1.06, t + 0.18);

      gain.gain.setValueAtTime(this.volume * 0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.28);
    });
  }

  /**
   * Rapid whoosh-zip for Fast Mole spawn
   */
  public playFastSpawn() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(1450, now + 0.08);

    gain.gain.setValueAtTime(this.volume * 0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  /**
   * Crystalline ice tinkle for Frost Mole spawn
   */
  public playFrostSpawn() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    [2093.0, 2489.02, 3135.96].forEach((f, i) => {
      if (!this.ctx) return;
      const t = now + i * 0.03;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.95, t + 0.16);

      gain.gain.setValueAtTime(this.volume * 0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  /**
   * Sizzling fuse hiss and warning tick for Bomb Mole spawn
   */
  public playBombSpawn() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    // Sizzling fuse noise
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.1);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(3200, now);
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(this.volume * 0.28, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);
      noise.stop(now + 0.11);
    } catch {}

    // Caution pip
    const beep = this.ctx.createOscillator();
    const bGain = this.ctx.createGain();
    beep.type = 'square';
    beep.frequency.setValueAtTime(880, now + 0.03);
    beep.frequency.setValueAtTime(740, now + 0.08);
    bGain.gain.setValueAtTime(this.volume * 0.16, now + 0.03);
    bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    beep.connect(bGain);
    bGain.connect(this.ctx.destination);
    beep.start(now + 0.03);
    beep.stop(now + 0.13);
  }

  /**
   * Menacing sub-bass thud and brassy roar for Chef Boss Mole spawn
   */
  public playBossSpawn() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    // Sub-bass heavy entrance thud
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(95, now);
    subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.35);
    subGain.gain.setValueAtTime(this.volume * 0.6, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);
    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.4);

    // Brassy boss growl
    const growl = this.ctx.createOscillator();
    const gGain = this.ctx.createGain();
    growl.type = 'sawtooth';
    growl.frequency.setValueAtTime(85, now + 0.04);
    growl.frequency.linearRampToValueAtTime(140, now + 0.2);
    growl.frequency.exponentialRampToValueAtTime(50, now + 0.38);
    gGain.gain.setValueAtTime(this.volume * 0.35, now + 0.04);
    gGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    growl.connect(gGain);
    gGain.connect(this.ctx.destination);
    growl.start(now + 0.04);
    growl.stop(now + 0.43);
  }

  /**
   * Kitchen Disaster Event Siren / Emergency Klaxon
   */
  public playKitchenDisasterAlert() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    // Two-tone emergency siren pulses
    for (let i = 0; i < 3; i++) {
      const startTime = now + i * 0.32;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';

      // Pitch sweep up and down
      osc.frequency.setValueAtTime(620, startTime);
      osc.frequency.linearRampToValueAtTime(880, startTime + 0.16);
      osc.frequency.linearRampToValueAtTime(580, startTime + 0.28);

      gain.gain.setValueAtTime(this.volume * 0.45, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

      // Lowpass filter for punchy arcade alarm sound
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, startTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.31);
    }

    // Sub rumble impact for sudden disaster shockwave
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(120, now);
    sub.frequency.exponentialRampToValueAtTime(35, now + 0.5);
    subGain.gain.setValueAtTime(this.volume * 0.7, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    sub.connect(subGain);
    subGain.connect(this.ctx.destination);
    sub.start(now);
    sub.stop(now + 0.56);
  }


  /**
   * Triumphant fanfare when a pizza recipe is completed
   */
  public playRecipeComplete() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    // Rapid fanfare arpeggio: C5 -> E5 -> G5 -> C6 -> E6
    const arpeggio = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    arpeggio.forEach((f, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = now + idx * 0.07;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, startTime);

      gain.gain.setValueAtTime(this.volume * 0.45, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.36);
    });

    // Sustained celebratory major chord (C6 + E6 + G6) at climax
    const chordTime = now + 0.38;
    const chordFreqs = [1046.5, 1318.51, 1567.98];
    chordFreqs.forEach((f) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, chordTime);

      gain.gain.setValueAtTime(this.volume * 0.4, chordTime);
      gain.gain.exponentialRampToValueAtTime(0.001, chordTime + 0.9);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(chordTime);
      osc.stop(chordTime + 0.92);
    });
  }

  /**
   * Subtle vintage watch tick when chef checks time
   */
  public playChefWatchTick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    // Tick 1
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1600, now);
    osc1.frequency.exponentialRampToValueAtTime(900, now + 0.03);
    gain1.gain.setValueAtTime(this.volume * 0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.05);

    // Tock 2
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1100, now + 0.14);
    osc2.frequency.exponentialRampToValueAtTime(600, now + 0.17);
    gain2.gain.setValueAtTime(this.volume * 0.15, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.19);
  }

  /**
   * Soft relieved sigh / cloth swoosh when wiping brow
   */
  public playChefBrowWipe() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(460, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.26);
    gain.gain.setValueAtTime(this.volume * 0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.29);
  }

  /**
   * Cheerful chef chime on greeting / tap
   */
  public playChefGreeting() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    freqs.forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const t = now + idx * 0.055;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(this.volume * 0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.19);
    });
  }

  /**
   * Unified dispatcher for mole spawn audio cues based on mole type
   */
  public playMoleSpawn(type: string) {
    if (this.isMuted) return;
    switch (type) {
      case 'helmet':
        this.playHelmetSpawn();
        break;
      case 'phantom':
        this.playPhantomGiggle();
        break;
      case 'tough':
        this.playToughSpawn();
        break;
      case 'golden':
        this.playGoldenSpawn();
        break;
      case 'rainbow':
        this.playRainbowSpawn();
        break;
      case 'fast':
        this.playFastSpawn();
        break;
      case 'frost':
        this.playFrostSpawn();
        break;
      case 'bomb':
        this.playBombSpawn();
        break;
      case 'boss':
        this.playBossSpawn();
        break;
      case 'standard':
      default:
        this.playStandardSpawn();
        break;
    }
  }
}

export const sfx = new SoundEffectsEngine();
