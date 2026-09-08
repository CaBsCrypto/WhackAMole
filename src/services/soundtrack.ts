/**
 * Dynamic Procedural Adaptive Soundtrack Engine for Whack A Mole 3D
 * Synthesizes adaptive interactive arcade audio using Web Audio API:
 * - Dynamic BPM acceleration (from 115 BPM to 165 BPM as clock winds down)
 * - Layered adaptive stems (Drum Groove, Funk Bassline, Chords, Frenzy Arpeggio)
 * - Low-pass filter cutoff opens up with combo streak
 * - Auto ducking on massive hammer impacts
 */

class DynamicSoundtrackEngine {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private volume = 0.6;
  private masterGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private loopInterval: number | null = null;

  // Music state
  private bpm = 120;
  private step = 0;
  private combo = 0;
  private intensity = 0; // 0 to 1
  private frenzyMode = false;
  private isMuted = false;

  // Scales for arcade funk mood (E minor pentatonic / blues scale)
  private bassNotes = [82.41, 98.00, 110.00, 123.47, 130.81, 146.83]; // E2, G2, A2, B2, C3, D3
  private leadNotes = [329.63, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25, 783.99];

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);

      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(1800, this.ctx.currentTime);
      this.filterNode.Q.setValueAtTime(3.5, this.ctx.currentTime);

      this.filterNode.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    } catch {
      console.warn('Web Audio API not supported');
    }
  }

  public start() {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.step = 0;
    this.scheduleNextTick();
  }

  public stop() {
    this.isPlaying = false;
    if (this.loopInterval) {
      window.clearTimeout(this.loopInterval);
      this.loopInterval = null;
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      const targetGain = (this.isMuted || this.volume <= 0.001) ? 0 : this.volume * 0.45;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    this.setVolume(this.volume);
  }

  public updateGameState(timeRemaining: number, maxTime: number, combo: number, frenzy: boolean) {
    this.combo = combo;
    this.frenzyMode = frenzy;

    // Intensity scales from 0 (relaxed start) to 1 (intense final seconds + high combo)
    const timeProgress = Math.max(0, Math.min(1, 1 - timeRemaining / Math.max(1, maxTime)));
    const comboBoost = Math.min(0.5, combo * 0.03);
    this.intensity = Math.min(1, timeProgress * 0.6 + comboBoost + (frenzy ? 0.35 : 0));

    // Dynamic BPM calculation
    this.bpm = Math.round(115 + this.intensity * 48); // 115 up to 163 BPM

    // Open low-pass filter with combo/intensity
    if (this.filterNode && this.ctx) {
      const targetFreq = 1200 + this.intensity * 6500;
      this.filterNode.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
    }
  }

  public triggerImpactDucking() {
    if (!this.masterGain || !this.ctx || this.isMuted || this.volume <= 0.001) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    const duckedVal = Math.max(0.001, this.volume * 0.25);
    const returnVal = Math.max(0.001, this.volume * 0.45);
    this.masterGain.gain.setValueAtTime(duckedVal, now);
    this.masterGain.gain.linearRampToValueAtTime(returnVal, now + 0.18);
  }

  private scheduleNextTick() {
    if (!this.isPlaying || !this.ctx) return;

    const secondsPerBeat = 60.0 / this.bpm;
    const stepDuration = secondsPerBeat / 4; // 16th note steps

    this.playStep(this.step, this.ctx.currentTime);
    this.step = (this.step + 1) % 16;

    this.loopInterval = window.setTimeout(() => {
      this.scheduleNextTick();
    }, stepDuration * 1000);
  }

  private playStep(step: number, time: number) {
    if (!this.ctx || !this.filterNode || this.isMuted || this.volume <= 0.001) return;

    // 1. Kick Drum (On steps 0, 4, 8, 12, with bonus off-beats at high intensity)
    const isKick = step === 0 || step === 4 || step === 8 || step === 12 || (this.intensity > 0.6 && step === 14);
    if (isKick) {
      this.playKick(time);
    }

    // 2. Hi-Hat (Every 2 steps, or every step when intense)
    const isHat = step % 2 === 0 || (this.intensity > 0.4 && step % 1 === 0);
    if (isHat) {
      this.playHiHat(time, step % 4 === 2 ? 0.35 : 0.18);
    }

    // 3. Snare / Clap (Steps 4 and 12)
    if (step === 4 || step === 12) {
      this.playSnare(time);
    }

    // 4. Synth Bassline (Funky 16th groove)
    const bassRhythm = [1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0];
    if (bassRhythm[step]) {
      const noteIdx = (Math.floor(step / 4) + (step % 3)) % this.bassNotes.length;
      const noteFreq = this.bassNotes[noteIdx];
      this.playBassNote(noteFreq, time, stepDuration(this.bpm) * 0.85);
    }

    // 5. Frenzy / High Combo Arpeggiator
    if (this.combo >= 5 || this.frenzyMode || this.intensity > 0.5) {
      const arpNotes = [0, 2, 4, 7, 5, 2, 0, 4];
      const leadNote = this.leadNotes[(step + arpNotes[step % arpNotes.length]) % this.leadNotes.length];
      this.playLeadNote(leadNote, time, stepDuration(this.bpm) * 0.6);
    }
  }

  private playKick(time: number) {
    if (!this.ctx || !this.filterNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.12);

    gain.gain.setValueAtTime(0.7, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(gain);
    gain.connect(this.filterNode);

    osc.start(time);
    osc.stop(time + 0.19);
  }

  private playSnare(time: number) {
    if (!this.ctx || !this.filterNode) return;
    // Noise buffer
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(900, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.filterNode);

    noise.start(time);
    noise.stop(time + 0.13);
  }

  private playHiHat(time: number, vol: number) {
    if (!this.ctx || !this.filterNode) return;
    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6500, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol * (0.3 + this.intensity * 0.4), time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.filterNode);

    noise.start(time);
    noise.stop(time + 0.05);
  }

  private playBassNote(freq: number, time: number, dur: number) {
    if (!this.ctx || !this.filterNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.28, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + dur);

    osc.connect(gain);
    gain.connect(this.filterNode);

    osc.start(time);
    osc.stop(time + dur + 0.01);
  }

  private playLeadNote(freq: number, time: number, dur: number) {
    if (!this.ctx || !this.filterNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);

    const volumeScale = this.frenzyMode ? 0.22 : 0.14;
    gain.gain.setValueAtTime(volumeScale, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(gain);
    gain.connect(this.filterNode);

    osc.start(time);
    osc.stop(time + dur + 0.01);
  }
}

function stepDuration(bpm: number): number {
  return 60.0 / bpm / 4;
}

export const dynamicSoundtrack = new DynamicSoundtrackEngine();
