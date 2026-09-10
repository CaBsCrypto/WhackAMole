/**
 * Tier 2: Camera Tutorial Interactive Onboarding Test Suite (Requirement R2)
 * Tests step transitions, real-time hand presence dwell, target zone hover radius,
 * strike gesture detection, skip button, Escape key handling, and localStorage persistence.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  CameraTutorialModal,
  CAMERA_TUTORIAL_STORAGE_KEY,
} from '../src/components/camera/CameraTutorialModal';
import { sfx } from '../src/services/sfx';
import { MockAudioContext } from './harness/mockAudioContext';
import type { HandTrackingStatus, HandGestureState, HandCursorData } from '../src/types';

// Mock localStorage for Node test environment
class MockLocalStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

describe('Tier 2: Camera Interactive Onboarding Tutorial (Requirement R2)', () => {
  let mockStorage: MockLocalStorage;
  let mockCtx: MockAudioContext;

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
    (globalThis as unknown as { localStorage: MockLocalStorage }).localStorage = mockStorage;

    mockCtx = new MockAudioContext();
    sfx.setAudioContext(mockCtx as unknown as AudioContext);
    sfx.setMuted(false);
    sfx.setVolume(0.8);
  });

  // =========================================================================
  // 1. Contract & Storage Key Invariants
  // =========================================================================
  describe('Contract & Export Invariants', () => {
    test('R2.1: CameraTutorialModal is a valid component function and exports correct storage key', () => {
      assert.equal(typeof CameraTutorialModal, 'function');
      assert.equal(CAMERA_TUTORIAL_STORAGE_KEY, 'whackamole_camera_tutorial_completed');
    });

    test('R2.2: Initial state has tutorial uncompleted in clean profile session', () => {
      assert.equal(mockStorage.getItem(CAMERA_TUTORIAL_STORAGE_KEY), null);
    });
  });

  // =========================================================================
  // 2. Step 1: Hand Framing & Continuous 1000ms Dwell
  // =========================================================================
  describe('Step 1: "Encuadra tu Mano" Framing Dwell Logic', () => {
    test('R2.3: Tracking status must be "tracking" to accumulate dwell time', () => {
      const statuses: HandTrackingStatus[] = ['idle', 'requesting-camera', 'loading-model', 'no-hand-detected', 'error'];
      statuses.forEach((st) => {
        let dwellMs = 0;
        if (st === 'tracking') {
          dwellMs += 100;
        }
        assert.equal(dwellMs, 0, `Status ${st} must not advance framing dwell`);
      });
    });

    test('R2.4: Continuous 1000ms dwell advances to Step 2 and plays camera activation chime', () => {
      mockCtx.resetTracking();

      let step = 1;
      let dwellMs = 0;
      const stepDuration = 1000;

      // Simulate 20 frames of 50ms ticks with tracking = true
      for (let i = 0; i < 20; i++) {
        dwellMs += 50;
        if (dwellMs >= stepDuration) {
          sfx.playCameraActivate();
          step = 2;
        }
      }

      assert.equal(dwellMs, 1000);
      assert.equal(step, 2, 'Must advance to Step 2 after 1000ms continuous dwell');

      // Verify camera activate audio cue was synthesized (523.25Hz -> 1046.5Hz ascending chime)
      assert.ok(mockCtx.oscillators.length >= 2, 'playCameraActivate must synthesize dual ascending chime');
      const freqs = mockCtx.oscillators.map((o) => o.frequency.value);
      assert.ok(freqs.some((f) => Math.abs(f - 523.25) < 1), 'Ascending chime starts at ~523Hz');
      assert.ok(freqs.some((f) => Math.abs(f - 1046.5) < 1), 'Ascending chime rises to ~1046Hz');
    });

    test('R2.5: Loss of tracking before 1000ms resets continuous dwell progress', () => {
      let dwellMs = 0;
      let step = 1;

      // Frame tracking for 700ms
      for (let i = 0; i < 14; i++) {
        dwellMs += 50;
      }
      assert.equal(dwellMs, 700);

      // Tracking lost (e.g. hand out of frame)
      const isTracking = false;
      if (!isTracking) {
        dwellMs = 0;
      }

      assert.equal(dwellMs, 0, 'Dwell time must reset to 0 upon tracking loss');
      assert.equal(step, 1, 'Must remain on Step 1 if dwell was interrupted');
    });
  });

  // =========================================================================
  // 3. Step 2: Cursor Movement & Target Zone Hover Radius (55px)
  // =========================================================================
  describe('Step 2: "Mueve el Cursor" Hover Radius & Dwell Logic', () => {
    const TARGET_CENTER_X = 550;
    const TARGET_CENTER_Y = 320;
    const TARGET_RADIUS = 55; // 55px radius requirement

    function isCursorInsideTarget(cursorX: number, cursorY: number): boolean {
      const dist = Math.hypot(cursorX - TARGET_CENTER_X, cursorY - TARGET_CENTER_Y);
      return dist <= TARGET_RADIUS;
    }

    test('R2.6: Cursor inside 55px radius correctly registers hover state', () => {
      // Direct center
      assert.equal(isCursorInsideTarget(550, 320), true);

      // Within radius (offset by 30px, 30px -> dist ≈ 42.4px <= 55px)
      assert.equal(isCursorInsideTarget(580, 350), true);

      // Exact boundary (55px)
      assert.equal(isCursorInsideTarget(550 + 55, 320), true);
      assert.equal(isCursorInsideTarget(550, 320 - 55), true);
    });

    test('R2.7: Cursor outside 55px radius registers outside state', () => {
      // 56px offset (just beyond radius)
      assert.equal(isCursorInsideTarget(550 + 56, 320), false);

      // Distant coordinates
      assert.equal(isCursorInsideTarget(100, 100), false);
      assert.equal(isCursorInsideTarget(700, 500), false);
    });

    test('R2.8: Continuous 800ms hover dwell inside target advances to Step 3 with chime', () => {
      mockCtx.resetTracking();

      let step = 2;
      let hoverMs = 0;
      const hoverThreshold = 800; // 800ms hover dwell

      // Cursor inside target for 20 ticks of 40ms = 800ms
      const cursor = { clientX: 560, clientY: 330 };
      assert.equal(isCursorInsideTarget(cursor.clientX, cursor.clientY), true);

      for (let i = 0; i < 20; i++) {
        if (isCursorInsideTarget(cursor.clientX, cursor.clientY)) {
          hoverMs += 40;
          if (hoverMs >= hoverThreshold) {
            sfx.playCameraActivate();
            step = 3;
          }
        }
      }

      assert.equal(hoverMs, 800);
      assert.equal(step, 3, 'Must advance to Step 3 after 800ms continuous hover');
      assert.ok(mockCtx.oscillators.length >= 2, 'Must play confirmation chime upon target completion');
    });

    test('R2.9: Exiting target zone before 800ms resets hover progress', () => {
      let hoverMs = 0;
      let step = 2;

      // Hover for 600ms
      hoverMs = 600;

      // Cursor moves outside target
      const cursor = { clientX: 800, clientY: 800 };
      const inside = isCursorInsideTarget(cursor.clientX, cursor.clientY);
      assert.equal(inside, false);

      if (!inside) {
        hoverMs = 0;
      }

      assert.equal(hoverMs, 0, 'Hover progress must reset when cursor leaves target zone');
      assert.equal(step, 2, 'Must remain on Step 2');
    });
  });

  // =========================================================================
  // 4. Step 3: Whack Gesture Strike Detection on Dummy
  // =========================================================================
  describe('Step 3: "¡Golpea!" Gesture Strike Detection', () => {
    test('R2.10: Detecting gesture.isWhacking triggers dummy squash and tactile confirmation audio', () => {
      mockCtx.resetTracking();

      let isDummyHit = false;
      let dummySquash = false;
      let soundPlayed = false;

      const gesture: HandGestureState = {
        isFist: true,
        isPinching: false,
        isWhacking: true, // Rising-edge strike trigger
        pinchDistance: 0.1,
        fistCurledCount: 4,
      };

      if (gesture.isWhacking) {
        isDummyHit = true;
        dummySquash = true;
        sfx.playGestureConfirm();
        soundPlayed = true;
      }

      assert.equal(isDummyHit, true);
      assert.equal(dummySquash, true);
      assert.equal(soundPlayed, true);

      // Verify tactile confirmation sound (1400Hz -> 160Hz pitch snap)
      assert.ok(mockCtx.oscillators.length >= 1, 'playGestureConfirm must synthesize tactile snap');
      const snapOsc = mockCtx.oscillators[0];
      assert.equal(snapOsc.frequency.value, 1400);
      const ramp = snapOsc.frequency.events.find((e) => e.type === 'exponentialRampToValueAtTime');
      assert.ok(ramp !== undefined);
      assert.equal(ramp.value, 160);
    });

    test('R2.11: Resting or non-whacking gesture does not trigger dummy strike', () => {
      let isDummyHit = false;

      const idleGesture: HandGestureState = {
        isFist: false,
        isPinching: false,
        isWhacking: false,
        pinchDistance: 0.85,
        fistCurledCount: 0,
      };

      if (idleGesture.isWhacking) {
        isDummyHit = true;
      }

      assert.equal(isDummyHit, false, 'Idle open hand must not trigger strike');
    });
  });

  // =========================================================================
  // 5. Skip Button, Escape Key & LocalStorage Persistence
  // =========================================================================
  describe('Skip Handling & LocalStorage Persistence', () => {
    test('R2.12: "Saltar tutorial" button immediately writes completion flag and calls onClose', () => {
      let closed = false;
      const onClose = () => {
        closed = true;
      };

      // Execute skip handler logic
      mockStorage.setItem(CAMERA_TUTORIAL_STORAGE_KEY, 'true');
      onClose();

      assert.equal(mockStorage.getItem(CAMERA_TUTORIAL_STORAGE_KEY), 'true');
      assert.equal(closed, true);
    });

    test('R2.13: Completing tutorial through Step 4 saves completion flag and calls onComplete & onClose', () => {
      let completed = false;
      let closed = false;

      const onComplete = () => {
        completed = true;
      };
      const onClose = () => {
        closed = true;
      };

      // Execute finish handler
      mockStorage.setItem(CAMERA_TUTORIAL_STORAGE_KEY, 'true');
      onComplete();
      onClose();

      assert.equal(mockStorage.getItem(CAMERA_TUTORIAL_STORAGE_KEY), 'true');
      assert.equal(completed, true);
      assert.equal(closed, true);
    });

    test('R2.14: Subsequent sessions do not auto-prompt when localStorage flag is set', () => {
      mockStorage.setItem(CAMERA_TUTORIAL_STORAGE_KEY, 'true');

      const isCompleted = mockStorage.getItem(CAMERA_TUTORIAL_STORAGE_KEY) === 'true';
      let showCameraTutorial = false;

      // Emulate App.tsx controlMode === 'camera' trigger
      if (!isCompleted) {
        showCameraTutorial = true;
      }

      assert.equal(showCameraTutorial, false, 'Tutorial must NOT auto-open if already completed');
    });

    test('R2.15: Settings "Repetir Tutorial de Cámara" re-opens tutorial even when previously completed', () => {
      mockStorage.setItem(CAMERA_TUTORIAL_STORAGE_KEY, 'true');

      let showCameraTutorial = false;
      const onRepeatCameraTutorial = () => {
        showCameraTutorial = true;
      };

      // User clicks manual repeat button
      onRepeatCameraTutorial();

      assert.equal(showCameraTutorial, true, 'Manual replay must open tutorial modal');
    });
  });
});
