/**
 * Tier 3: Comprehensive Audio & Sound Feedback Test Suite (Requirement R3)
 * Tests Web Audio API procedural synthesis, mole hit audio variations,
 * camera mode feedback cues, and dynamic ambient soundtrack.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { MockAudioContext } from './harness/mockAudioContext';
import { sfx } from '../src/services/sfx';
import { dynamicSoundtrack } from '../src/services/soundtrack';
import type { MoleType } from '../src/types';

describe('Tier 3: Audio & Sound Feedback Suite (Requirement R3)', () => {
  let mockCtx: MockAudioContext;

  beforeEach(() => {
    mockCtx = new MockAudioContext();
    sfx.setAudioContext(mockCtx as unknown as AudioContext);
    sfx.setMuted(false);
    sfx.setVolume(0.8);

    dynamicSoundtrack.setAudioContext(mockCtx as unknown as AudioContext);
    dynamicSoundtrack.setMuted(false);
    dynamicSoundtrack.setVolume(0.6);
  });

  // ==============================================================
  // 1. Procedural Mole Hit Sound Variations (Helmet, Frost, Golden)
  // ==============================================================
  describe('Mole Hit Audio Synthesizers', () => {
    test('R3.1: playHelmetHit(false) generates dual metallic resonance & rim tap', () => {
      mockCtx.resetTracking();
      sfx.playHelmetHit(false);

      // Should create at least 3 oscillators (820Hz, 1480Hz, 2100Hz rim tap)
      assert.ok(mockCtx.oscillators.length >= 3, `Expected >= 3 oscillators, got ${mockCtx.oscillators.length}`);

      const freqs = mockCtx.oscillators.map((o) => o.frequency.value);
      assert.ok(freqs.some((f) => f === 820), 'Should synthesize 820Hz metal bandpass partial');
      assert.ok(freqs.some((f) => f === 1480), 'Should synthesize 1480Hz metal bandpass partial');
      assert.ok(freqs.some((f) => f === 2100), 'Should synthesize 2100Hz rim tap transient');

      // Check all oscillators started
      mockCtx.oscillators.forEach((osc) => {
        assert.equal(osc.started, true, 'Every synthesized oscillator must be scheduled to start');
      });
    });

    test('R3.2: playHelmetHit(true) adds heavy armor shatter noise burst and crunch thud', () => {
      mockCtx.resetTracking();
      sfx.playHelmetHit(true);

      // Should create metal oscillators + thud crunch oscillator
      assert.ok(mockCtx.oscillators.length >= 4, `Expected >= 4 oscillators for lethal helmet, got ${mockCtx.oscillators.length}`);
      const freqs = mockCtx.oscillators.map((o) => o.frequency.value);
      assert.ok(freqs.some((f) => f === 220), 'Should synthesize low 220Hz crunch thud on lethal helmet hit');

      // Should create bandpass filter and noise buffer source
      assert.ok(mockCtx.filters.length >= 1, 'Should create bandpass filter for armor shatter noise');
      assert.equal(mockCtx.filters[0].type, 'bandpass');
      assert.equal(mockCtx.filters[0].frequency.value, 1400);
      assert.ok(mockCtx.bufferSources.length >= 1, 'Should create noise burst buffer for armor shattering');
    });

    test('R3.3: playFrostHit() generates highpass noise burst, dual FM bells, and brittle crackle', () => {
      mockCtx.resetTracking();
      sfx.playFrostHit();

      // Ice shatter noise burst with highpass filter at 3200Hz
      assert.ok(mockCtx.bufferSources.length >= 1, 'Should create white noise buffer for ice shatter');
      assert.ok(mockCtx.filters.length >= 1, 'Should route noise through filter');
      assert.equal(mockCtx.filters[0].type, 'highpass');
      assert.equal(mockCtx.filters[0].frequency.value, 3200);

      // Crystalline bell partials at 2400Hz and 3840Hz
      const bellFreqs = mockCtx.oscillators.map((o) => o.frequency.value);
      assert.ok(bellFreqs.includes(2400), 'Should include 2400Hz FM crystalline bell tone');
      assert.ok(bellFreqs.includes(3840), 'Should include 3840Hz overtone bell tone');

      // Brittle crackle ticks
      assert.ok(bellFreqs.includes(4500), 'Should include 4500Hz brittle crackle click');
    });

    test('R3.4: playGoldenHit() generates ascending pentatonic glockenspiel cascade and shimmer', () => {
      mockCtx.resetTracking();
      sfx.playGoldenHit();

      // Pentatonic cascade with 6 notes (E5, G#5, B5, E6, G#6, B6)
      // Each note has 2 oscillators (sine fundamental + triangle shimmer) -> 12 oscillators
      assert.ok(mockCtx.oscillators.length >= 12, `Expected >= 12 bell oscillators, got ${mockCtx.oscillators.length}`);

      const baseNotes = [659.25, 830.61, 987.77, 1318.51, 1661.22, 1975.53];
      baseNotes.forEach((note) => {
        assert.ok(
          mockCtx.oscillators.some((o) => Math.abs(o.frequency.value - note) < 0.01),
          `Should include golden pentatonic note ${note}Hz`
        );
      });

      // Shimmer sparkle highpass filter burst at 4200Hz
      assert.ok(mockCtx.filters.length >= 1, 'Should include sparkle shimmer filter');
      assert.equal(mockCtx.filters[0].type, 'highpass');
      assert.equal(mockCtx.filters[0].frequency.value, 4200);
      assert.ok(mockCtx.bufferSources.length >= 1, 'Should emit sparkle noise shimmer');
    });
  });

  // ==============================================================
  // 2. Camera Mode Auditory Feedback (Activate Chime & Gesture Confirm)
  // ==============================================================
  describe('Camera Mode Auditory Feedback', () => {
    test('R3.5: playCameraActivate() synthesizes futuristic ascending dual-tone chime', () => {
      mockCtx.resetTracking();
      sfx.playCameraActivate();

      assert.equal(mockCtx.oscillators.length, 2, 'Should synthesize exactly 2 ascending chime tones');
      assert.equal(mockCtx.oscillators[0].frequency.value, 523.25, 'Tone 1 fundamental should be 523.25Hz (C5)');
      assert.equal(mockCtx.oscillators[1].frequency.value, 1046.5, 'Tone 2 fundamental should be 1046.5Hz (C6)');

      // Verify ascending start times
      assert.ok(mockCtx.oscillators[1].startTime > mockCtx.oscillators[0].startTime, 'Tone 2 must start after Tone 1 for ascending chime');
    });

    test('R3.6: playGestureConfirm() synthesizes crisp 15ms high-to-low tactile pitch drop and click', () => {
      mockCtx.resetTracking();
      sfx.playGestureConfirm();

      assert.ok(mockCtx.oscillators.length >= 1, 'Should synthesize pitch drop oscillator');
      const osc = mockCtx.oscillators[0];
      assert.equal(osc.frequency.value, 1400, 'Initial frequency should be 1400Hz');

      // Check exponential ramp down to 160Hz
      const rampEvent = osc.frequency.events.find((e) => e.type === 'exponentialRampToValueAtTime');
      assert.ok(rampEvent !== undefined, 'Should have exponential frequency ramp');
      assert.equal(rampEvent?.value, 160, 'Ramp target should be 160Hz');
      assert.ok(rampEvent!.time - mockCtx.currentTime <= 0.02, 'Ramp duration should be snappy (~15ms)');

      // Micro noise transient
      assert.ok(mockCtx.bufferSources.length >= 1, 'Should produce micro haptic noise tick');
    });
  });

  // ==============================================================
  // 3. Missing Special Audio Methods for MoleScene3D
  // ==============================================================
  describe('MoleScene3D Required Audio Methods', () => {
    test('R3.7: playPhantomDisappear() synthesizes ethereal phase shift whoosh', () => {
      mockCtx.resetTracking();
      sfx.playPhantomDisappear();

      assert.equal(mockCtx.oscillators.length, 2, 'Should synthesize dual detuned oscillators for phase beating');
      const freqs = mockCtx.oscillators.map((o) => o.frequency.value);
      assert.ok(freqs.includes(460), 'Should have 460Hz oscillator');
      assert.ok(freqs.includes(466), 'Should have 466Hz detuned oscillator for 6Hz binaural beating');
    });

    test('R3.8: playFireBurst() synthesizes combustion roar and sizzle crackle', () => {
      mockCtx.resetTracking();
      sfx.playFireBurst();

      assert.ok(mockCtx.oscillators.length >= 1, 'Should synthesize combustion roar oscillator');
      assert.equal(mockCtx.oscillators[0].frequency.value, 90, 'Roar starts at 90Hz');
      assert.ok(mockCtx.bufferSources.length >= 1, 'Should include sizzle crackle noise');
      assert.equal(mockCtx.filters[0].type, 'bandpass');
      assert.equal(mockCtx.filters[0].frequency.value, 1800);
    });

    test('R3.9: playFreeze() synthesizes sub-zero chilling sweep and glassy ice clink', () => {
      mockCtx.resetTracking();
      sfx.playFreeze();

      assert.ok(mockCtx.oscillators.length >= 2, 'Should synthesize sweep and glassy bell');
      const freqs = mockCtx.oscillators.map((o) => o.frequency.value);
      assert.ok(freqs.includes(340), 'Sweep starts at 340Hz');
      assert.ok(freqs.includes(2200), 'Glassy bell at 2200Hz');
    });

    test('R3.10: playLightning() synthesizes electric arc transient snap and 120Hz buzz', () => {
      mockCtx.resetTracking();
      sfx.playLightning();

      assert.ok(mockCtx.oscillators.length >= 2, 'Should synthesize arc transient and 120Hz buzz');
      const freqs = mockCtx.oscillators.map((o) => o.frequency.value);
      assert.ok(freqs.includes(2800), 'Arc snap starts at 2800Hz');
      assert.ok(freqs.includes(120), 'Electric buzz at 120Hz');
      assert.ok(mockCtx.bufferSources.length >= 1, 'Should include spark sizzle');
    });
  });

  // ==============================================================
  // 4. Unified Mole Hit Dispatcher
  // ==============================================================
  describe('Unified Hit Dispatcher (playMoleHit)', () => {
    const archetypes: MoleType[] = [
      'standard',
      'fast',
      'tough',
      'golden',
      'bomb',
      'helmet',
      'frost',
      'rainbow',
      'phantom',
      'boss',
    ];

    archetypes.forEach((type) => {
      test(`R3.11: playMoleHit("${type}") executes cleanly without throwing`, () => {
        mockCtx.resetTracking();
        assert.doesNotThrow(() => {
          sfx.playMoleHit(type, false, false);
        }, `playMoleHit for "${type}" must execute without throwing`);

        // Each archetype should trigger audio nodes
        const totalNodes = mockCtx.oscillators.length + mockCtx.bufferSources.length;
        assert.ok(totalNodes > 0, `playMoleHit("${type}") must synthesize audio nodes`);
      });
    });

    test('R3.12: playMoleHit routes helmet lethal vs non-lethal appropriately', () => {
      mockCtx.resetTracking();
      sfx.playMoleHit('helmet', false, false);
      const nonLethalBuffers = mockCtx.bufferSources.length;

      mockCtx.resetTracking();
      sfx.playMoleHit('helmet', false, true);
      const lethalBuffers = mockCtx.bufferSources.length;

      assert.equal(nonLethalBuffers, 0, 'Non-lethal helmet hit should not emit armor shatter buffer');
      assert.ok(lethalBuffers > 0, 'Lethal helmet hit must emit armor shatter buffer');
    });
  });

  // ==============================================================
  // 5. Dynamic Soundtrack Engine (Menu Ambient Loop & Volume Control)
  // ==============================================================
  describe('Dynamic Soundtrack Engine', () => {
    test('R3.13: Supports menu ambient mode with relaxed tempo and warm filter', () => {
      dynamicSoundtrack.start('menu');
      assert.equal(dynamicSoundtrack.getMode(), 'menu');
      assert.equal(dynamicSoundtrack.getIsPlaying(), true);
      dynamicSoundtrack.stop();
      assert.equal(dynamicSoundtrack.getIsPlaying(), false);
    });

    test('R3.14: Smoothly transitions between menu ambient and gameplay mode', () => {
      dynamicSoundtrack.start('menu');
      assert.equal(dynamicSoundtrack.getMode(), 'menu');

      dynamicSoundtrack.setMode('gameplay');
      assert.equal(dynamicSoundtrack.getMode(), 'gameplay');
      assert.equal(dynamicSoundtrack.getIsPlaying(), true);

      dynamicSoundtrack.setMode('menu');
      assert.equal(dynamicSoundtrack.getMode(), 'menu');
      dynamicSoundtrack.stop();
    });

    test('R3.15: setVolume immediately adjusts active master gain node', () => {
      dynamicSoundtrack.init();
      mockCtx.resetTracking();

      // Test normalized value 0.75
      dynamicSoundtrack.setVolume(0.75);
      const gainNode = mockCtx.gains[0];
      assert.ok(gainNode !== undefined, 'Master gain node must exist');

      const targetEvent = gainNode.gain.events.find((e) => e.type === 'setTargetAtTime');
      assert.ok(targetEvent !== undefined, 'setVolume must call setTargetAtTime on master gain');
      assert.ok(Math.abs(targetEvent!.target! - 0.75 * 0.45) < 0.001, 'Target gain must match volume scale');

      // Test percentage value 50 (50%)
      dynamicSoundtrack.setVolume(50);
      const lastTarget = gainNode.gain.events[gainNode.gain.events.length - 1];
      assert.ok(Math.abs(lastTarget.target! - 0.5 * 0.45) < 0.001, 'Percentage volume 50 must scale to 0.5');
    });

    test('R3.16: triggerImpactDucking dips volume and restores it', () => {
      dynamicSoundtrack.init();
      dynamicSoundtrack.setVolume(0.8);
      const gainNode = mockCtx.gains[0];
      gainNode.gain.events = [];

      dynamicSoundtrack.triggerImpactDucking();

      assert.ok(
        gainNode.gain.events.some((e) => e.type === 'cancelScheduledValues'),
        'Ducking should cancel existing scheduled ramps'
      );
      assert.ok(
        gainNode.gain.events.some((e) => e.type === 'setValueAtTime'),
        'Ducking should immediately drop gain'
      );
      assert.ok(
        gainNode.gain.events.some((e) => e.type === 'linearRampToValueAtTime'),
        'Ducking should ramp back to master gain'
      );
    });

    test('R3.17: updateGameState accelerates tempo and opens filter with combo', () => {
      dynamicSoundtrack.init();
      dynamicSoundtrack.updateGameState(10, 60, 15, true);

      assert.equal(dynamicSoundtrack.getMode(), 'gameplay');
      const filterNode = mockCtx.filters[0];
      assert.ok(filterNode !== undefined, 'Filter node must exist');
      const freqEvent = filterNode.frequency.events[filterNode.frequency.events.length - 1];
      assert.ok(freqEvent !== undefined && freqEvent.target! > 4000, 'Filter frequency must open up on high combo');
    });
  });
});
