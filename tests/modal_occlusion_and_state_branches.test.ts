/**
 * Modal Occlusion & Gesture Gating Empirical Test Suite (Milestone 3 Run 4, Iteration 2)
 *
 * Verifies:
 * 1. Step 3 Tutorial Isolation: When showCameraTutorial is true, handleCameraWhack returns immediately,
 *    striking the practice dummy does NOT hit #btn_play_arcade or start the game.
 * 2. Modal Occlusion: When activeModal is set ('shop', 'settings', 'leaderboard', etc.),
 *    neither handleCameraWhack nor handleCameraCursorMove affects #btn_play_arcade.
 * 3. Inactive State Gating: When gameState is 'paused', 'gameover', or 'multiplayer_lobby',
 *    air whacks do nothing and trigger 0 audio feedback events.
 * 4. Clean Main Menu Whack: When in clean main menu (gameState === 'menu', no modals,
 *    showCameraTutorial === false), striking #btn_play_arcade triggers confirmation audio,
 *    clears hover state, and calls handleStartArcade('arcade').
 * 5. GestureReticle Active Prop Matrix: Verifies exact boolean logic across all 30 state combinations.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { sfx } from '../src/services/sfx';
import { MockAudioContext } from './harness/mockAudioContext';
import type { HandCursorData, GameState } from '../src/types';

type ActiveModalType = 'shop' | 'avatar' | 'leaderboard' | 'events' | 'settings' | 'codex' | 'pizza_codex' | null;

interface MockDOMRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

/**
 * Emulates the exact closure logic from WhackAMole/src/App.tsx lines 310-374
 */
class CameraHandlersSimulator {
  public gameState: GameState = 'menu';
  public showCameraTutorial: boolean = false;
  public activeModal: ActiveModalType = null;
  public isPlayHoveredByHand: boolean = false;
  public arcadeStarted: boolean = false;
  public gestureWhackTriggeredCount: number = 0;
  public gestureCursorUpdateCount: number = 0;

  // DOM Mock for #btn_play_arcade
  public playBtnRect: MockDOMRect | null = {
    left: 200,
    top: 400,
    right: 440,
    bottom: 464,
    width: 240,
    height: 64,
  };

  public handleStartArcade = (mode: string) => {
    if (mode === 'arcade') {
      this.arcadeStarted = true;
    }
  };

  public moleScene = {
    setGestureCursor: (_ndcX: number, _ndcY: number) => {
      this.gestureCursorUpdateCount++;
    },
    triggerGestureWhack: (_ndcX: number, _ndcY: number, _clientX: number, _clientY: number) => {
      this.gestureWhackTriggeredCount++;
    },
  };

  // Replicates handleCameraCursorMove (lines 310-333)
  public handleCameraCursorMove(cursor: HandCursorData): void {
    if (this.gameState === 'playing' || (this.gameState === 'menu' && !this.showCameraTutorial && !this.activeModal)) {
      this.moleScene.setGestureCursor(cursor.ndcX, cursor.ndcY);
    }

    if (this.gameState === 'menu' && !this.showCameraTutorial && !this.activeModal) {
      const btn = this.playBtnRect;
      if (btn) {
        const isHover =
          cursor.clientX >= btn.left - 12 &&
          cursor.clientX <= btn.right + 12 &&
          cursor.clientY >= btn.top - 12 &&
          cursor.clientY <= btn.bottom + 12;
        this.isPlayHoveredByHand = isHover;
      } else {
        this.isPlayHoveredByHand = false;
      }
    } else {
      this.isPlayHoveredByHand = false;
    }
  }

  // Replicates handleCameraWhack (lines 335-374)
  public handleCameraWhack(cursor: HandCursorData): boolean {
    // Disallow all air whacks if any modal/tutorial is open, or if paused/gameover/lobby
    if (
      this.showCameraTutorial ||
      this.activeModal ||
      this.gameState === 'paused' ||
      this.gameState === 'gameover' ||
      this.gameState === 'multiplayer_lobby'
    ) {
      return false; // Early returned
    }

    if (this.gameState === 'playing') {
      sfx.playGestureConfirm();
      this.moleScene.triggerGestureWhack(cursor.ndcX, cursor.ndcY, cursor.clientX, cursor.clientY);
      return true;
    } else if (this.gameState === 'menu') {
      const btn = this.playBtnRect;
      let isPlayHit = false;
      if (btn) {
        if (
          cursor.clientX >= btn.left - 16 &&
          cursor.clientX <= btn.right + 16 &&
          cursor.clientY >= btn.top - 16 &&
          cursor.clientY <= btn.bottom + 16
        ) {
          isPlayHit = true;
        }
      }
      if (isPlayHit) {
        sfx.playGestureConfirm();
        this.isPlayHoveredByHand = false;
        this.handleStartArcade('arcade');
        return true;
      }
    }
    return false;
  }

  // Replicates <GestureReticle active={...} /> condition (lines 1259-1263)
  public isGestureReticleActive(): boolean {
    return (
      !this.showCameraTutorial &&
      !this.activeModal &&
      (this.gameState === 'playing' || this.gameState === 'menu')
    );
  }
}

describe('Modal Occlusion & State Gating Verification (Iteration 2)', () => {
  let sim: CameraHandlersSimulator;
  let mockCtx: MockAudioContext;

  beforeEach(() => {
    mockCtx = new MockAudioContext();
    sfx.setAudioContext(mockCtx as unknown as AudioContext);
    sfx.setMuted(false);
    sfx.setVolume(1.0);
    sim = new CameraHandlersSimulator();
  });

  // =========================================================================
  // Question 1: showCameraTutorial === true (Step 3 dummy whack)
  // =========================================================================
  describe('1. Camera Tutorial Step 3 Dummy Whack Isolation', () => {
    test('1.1: When showCameraTutorial is true, handleCameraWhack returns immediately without touching #btn_play_arcade', () => {
      sim.gameState = 'menu';
      sim.showCameraTutorial = true;
      sim.activeModal = null;

      // Position cursor exactly at the center of #btn_play_arcade (200..440, 400..464 -> cx: 320, cy: 432)
      const cursorOnBtn: HandCursorData = {
        clientX: 320,
        clientY: 432,
        ndcX: 0,
        ndcY: 0,
        landmarks: [],
      };

      const result = sim.handleCameraWhack(cursorOnBtn);

      // Verify early return
      assert.equal(result, false, 'handleCameraWhack must return immediately when showCameraTutorial is true');
      assert.equal(sim.arcadeStarted, false, 'Game must NOT start when whacking inside tutorial');
      assert.equal(mockCtx.oscillators.length, 0, 'No audio oscillator must be created by handleCameraWhack');
      assert.equal(sim.gestureWhackTriggeredCount, 0, 'Mole scene whack must not trigger');
    });

    test('1.2: When showCameraTutorial is true, handleCameraCursorMove forces isPlayHoveredByHand to false', () => {
      sim.gameState = 'menu';
      sim.showCameraTutorial = true;

      // Position cursor over #btn_play_arcade
      const cursorOnBtn: HandCursorData = {
        clientX: 320,
        clientY: 432,
        ndcX: 0,
        ndcY: 0,
        landmarks: [],
      };

      sim.handleCameraCursorMove(cursorOnBtn);

      assert.equal(sim.isPlayHoveredByHand, false, 'Hover state must be false during tutorial');
      assert.equal(sim.gestureCursorUpdateCount, 0, '3D gesture cursor must not update during tutorial in menu');
    });

    test('1.3: GestureReticle is disabled during tutorial to prevent duplicate reticle behind modal', () => {
      sim.gameState = 'menu';
      sim.showCameraTutorial = true;
      assert.equal(sim.isGestureReticleActive(), false);

      sim.gameState = 'playing';
      assert.equal(sim.isGestureReticleActive(), false);
    });
  });

  // =========================================================================
  // Question 2: activeModal occlusion ('shop', 'settings', 'leaderboard', etc.)
  // =========================================================================
  describe('2. Modal Occlusion Against Background UI', () => {
    const modals: ActiveModalType[] = [
      'shop',
      'avatar',
      'leaderboard',
      'events',
      'settings',
      'codex',
      'pizza_codex',
    ];

    modals.forEach((modal) => {
      test(`2.1 [modal: ${modal}]: handleCameraWhack returns immediately and never hits #btn_play_arcade`, () => {
        sim.gameState = 'menu';
        sim.showCameraTutorial = false;
        sim.activeModal = modal;

        // Directly targeting play button center
        const cursor: HandCursorData = {
          clientX: 320,
          clientY: 432,
          ndcX: 0,
          ndcY: 0,
          landmarks: [],
        };

        const whacked = sim.handleCameraWhack(cursor);

        assert.equal(whacked, false);
        assert.equal(sim.arcadeStarted, false, `Modal '${modal}' must block game start`);
        assert.equal(mockCtx.oscillators.length, 0, `Modal '${modal}' must not trigger audio snap`);
      });

      test(`2.2 [modal: ${modal}]: handleCameraCursorMove clears isPlayHoveredByHand and ignores button`, () => {
        sim.gameState = 'menu';
        sim.showCameraTutorial = false;
        sim.activeModal = modal;

        const cursor: HandCursorData = {
          clientX: 320,
          clientY: 432,
          ndcX: 0,
          ndcY: 0,
          landmarks: [],
        };

        sim.handleCameraCursorMove(cursor);

        assert.equal(sim.isPlayHoveredByHand, false, `Modal '${modal}' must clear button hover`);
        assert.equal(sim.gestureCursorUpdateCount, 0, `Modal '${modal}' must suppress 3D hammer cursor update`);
      });

      test(`2.3 [modal: ${modal}]: GestureReticle is disabled when modal is open`, () => {
        sim.gameState = 'menu';
        sim.showCameraTutorial = false;
        sim.activeModal = modal;
        assert.equal(sim.isGestureReticleActive(), false, `Reticle must be inactive when '${modal}' is open`);
      });
    });
  });

  // =========================================================================
  // Question 3: Non-interactive game states ('paused', 'gameover', 'multiplayer_lobby')
  // =========================================================================
  describe('3. Inactive Game States (paused, gameover, multiplayer_lobby)', () => {
    const inactiveStates: GameState[] = ['paused', 'gameover', 'multiplayer_lobby'];

    inactiveStates.forEach((state) => {
      test(`3.1 [state: ${state}]: air whacks return early and trigger 0 audio events`, () => {
        sim.gameState = state;
        sim.showCameraTutorial = false;
        sim.activeModal = null;

        const cursor: HandCursorData = {
          clientX: 320,
          clientY: 432,
          ndcX: 0,
          ndcY: 0,
          landmarks: [],
        };

        const result = sim.handleCameraWhack(cursor);

        assert.equal(result, false);
        assert.equal(sim.arcadeStarted, false);
        assert.equal(sim.gestureWhackTriggeredCount, 0);
        assert.equal(mockCtx.oscillators.length, 0, `No audio oscillator in '${state}' state`);
      });

      test(`3.2 [state: ${state}]: GestureReticle is inactive`, () => {
        sim.gameState = state;
        sim.showCameraTutorial = false;
        sim.activeModal = null;
        assert.equal(sim.isGestureReticleActive(), false, `Reticle must be hidden in '${state}' state`);
      });
    });
  });

  // =========================================================================
  // Question 4: Clean Main Menu Whack & Coordinate Geometry
  // =========================================================================
  describe('4. Clean Main Menu Play Button Whack & Coordinate Math', () => {
    beforeEach(() => {
      sim.gameState = 'menu';
      sim.showCameraTutorial = false;
      sim.activeModal = null;
    });

    test('4.1: Strike inside button bounding box starts arcade and plays confirmation audio', () => {
      // Button rect: left: 200, right: 440, top: 400, bottom: 464
      // Strike center (320, 432)
      const centerCursor: HandCursorData = {
        clientX: 320,
        clientY: 432,
        ndcX: 0,
        ndcY: 0,
        landmarks: [],
      };

      const result = sim.handleCameraWhack(centerCursor);

      assert.equal(result, true, 'Valid strike inside button must return true');
      assert.equal(sim.arcadeStarted, true, 'Game must start');
      assert.equal(sim.isPlayHoveredByHand, false, 'Hover must be cleared on start');
      assert.ok(mockCtx.oscillators.length >= 1, 'Confirmation audio snap must play');
    });

    test('4.2: Strike within ±16px hit padding registers valid hit (bounding margin tolerance)', () => {
      // Boundary hit: left: 200 - 16 = 184
      const leftBoundaryCursor: HandCursorData = {
        clientX: 184,
        clientY: 432,
        ndcX: 0,
        ndcY: 0,
        landmarks: [],
      };
      assert.equal(sim.handleCameraWhack(leftBoundaryCursor), true, 'Left -16px boundary must hit');

      sim.arcadeStarted = false;
      // Boundary hit: right: 440 + 16 = 456
      const rightBoundaryCursor: HandCursorData = {
        clientX: 456,
        clientY: 432,
        ndcX: 0,
        ndcY: 0,
        landmarks: [],
      };
      assert.equal(sim.handleCameraWhack(rightBoundaryCursor), true, 'Right +16px boundary must hit');

      sim.arcadeStarted = false;
      // Boundary hit: top: 400 - 16 = 384
      const topBoundaryCursor: HandCursorData = {
        clientX: 320,
        clientY: 384,
        ndcX: 0,
        ndcY: 0,
        landmarks: [],
      };
      assert.equal(sim.handleCameraWhack(topBoundaryCursor), true, 'Top -16px boundary must hit');

      sim.arcadeStarted = false;
      // Boundary hit: bottom: 464 + 16 = 480
      const bottomBoundaryCursor: HandCursorData = {
        clientX: 320,
        clientY: 480,
        ndcX: 0,
        ndcY: 0,
        landmarks: [],
      };
      assert.equal(sim.handleCameraWhack(bottomBoundaryCursor), true, 'Bottom +16px boundary must hit');
    });

    test('4.3: Strike 1px beyond hit padding fails to start game and plays no audio', () => {
      // Beyond left padding: 183px (200 - 17)
      const outsideLeft: HandCursorData = {
        clientX: 183,
        clientY: 432,
        ndcX: 0,
        ndcY: 0,
        landmarks: [],
      };
      assert.equal(sim.handleCameraWhack(outsideLeft), false);
      assert.equal(sim.arcadeStarted, false);
      assert.equal(mockCtx.oscillators.length, 0);

      // Beyond right padding: 457px (440 + 17)
      const outsideRight: HandCursorData = {
        clientX: 457,
        clientY: 432,
        ndcX: 0,
        ndcY: 0,
        landmarks: [],
      };
      assert.equal(sim.handleCameraWhack(outsideRight), false);
      assert.equal(sim.arcadeStarted, false);
      assert.equal(mockCtx.oscillators.length, 0);

      // Beyond top padding: 383px (400 - 17)
      const outsideTop: HandCursorData = {
        clientX: 320,
        clientY: 383,
        ndcX: 0,
        ndcY: 0,
        landmarks: [],
      };
      assert.equal(sim.handleCameraWhack(outsideTop), false);
      assert.equal(sim.arcadeStarted, false);
      assert.equal(mockCtx.oscillators.length, 0);

      // Beyond bottom padding: 481px (464 + 17)
      const outsideBottom: HandCursorData = {
        clientX: 320,
        clientY: 481,
        ndcX: 0,
        ndcY: 0,
        landmarks: [],
      };
      assert.equal(sim.handleCameraWhack(outsideBottom), false);
      assert.equal(sim.arcadeStarted, false);
      assert.equal(mockCtx.oscillators.length, 0);
    });

    test('4.4: Hover padding (±12px) correctly toggles isPlayHoveredByHand in clean menu', () => {
      // Within ±12px: left 200 - 12 = 188
      sim.handleCameraCursorMove({
        clientX: 188,
        clientY: 432,
        ndcX: 0,
        ndcY: 0,
        landmarks: [],
      });
      assert.equal(sim.isPlayHoveredByHand, true, 'Cursor at left -12px must hover');

      // Beyond ±12px: left 200 - 13 = 187
      sim.handleCameraCursorMove({
        clientX: 187,
        clientY: 432,
        ndcX: 0,
        ndcY: 0,
        landmarks: [],
      });
      assert.equal(sim.isPlayHoveredByHand, false, 'Cursor at left -13px must not hover');
    });

    test('4.5: GestureReticle is active in clean menu', () => {
      assert.equal(sim.isGestureReticleActive(), true);
    });
  });

  // =========================================================================
  // Question 5: State Matrix Exhaustive Stress Test (All combinations)
  // =========================================================================
  describe('5. Exhaustive State Permutation Stress Matrix', () => {
    const gameStates: GameState[] = ['menu', 'playing', 'paused', 'gameover', 'multiplayer_lobby'];
    const tutorialStates = [true, false];
    const modalStates: ActiveModalType[] = [null, 'shop', 'settings'];

    test('5.1: Exactly 1 state permutation allows starting arcade with camera whack', () => {
      let allowedCount = 0;
      const allowedPermutations: string[] = [];

      for (const gs of gameStates) {
        for (const tut of tutorialStates) {
          for (const mod of modalStates) {
            sim.gameState = gs;
            sim.showCameraTutorial = tut;
            sim.activeModal = mod;
            sim.arcadeStarted = false;

            const cursor: HandCursorData = {
              clientX: 320,
              clientY: 432,
              ndcX: 0,
              ndcY: 0,
              landmarks: [],
            };

            const whacked = sim.handleCameraWhack(cursor);
            if (whacked && sim.arcadeStarted) {
              allowedCount++;
              allowedPermutations.push(`gameState=${gs}, tutorial=${tut}, modal=${mod}`);
            }
          }
        }
      }

      // Out of 5 * 2 * 3 = 30 state combinations, ONLY ONE must allow starting arcade:
      // gameState === 'menu' && showCameraTutorial === false && activeModal === null
      assert.equal(allowedCount, 1, `Expected exactly 1 allowed permutation, got ${allowedCount}: ${allowedPermutations.join('; ')}`);
      assert.equal(allowedPermutations[0], 'gameState=menu, tutorial=false, modal=null');
    });

    test('5.2: Exactly 2 state permutations allow GestureReticle to be active', () => {
      let reticleActiveCount = 0;
      const activePermutations: string[] = [];

      for (const gs of gameStates) {
        for (const tut of tutorialStates) {
          for (const mod of modalStates) {
            sim.gameState = gs;
            sim.showCameraTutorial = tut;
            sim.activeModal = mod;

            if (sim.isGestureReticleActive()) {
              reticleActiveCount++;
              activePermutations.push(`gameState=${gs}, tutorial=${tut}, modal=${mod}`);
            }
          }
        }
      }

      // Out of 30 combinations, ONLY TWO are active:
      // 1. gameState === 'menu', tutorial === false, modal === null
      // 2. gameState === 'playing', tutorial === false, modal === null
      assert.equal(reticleActiveCount, 2, `Expected exactly 2 active reticle states, got ${reticleActiveCount}`);
      assert.deepEqual(activePermutations, [
        'gameState=menu, tutorial=false, modal=null',
        'gameState=playing, tutorial=false, modal=null',
      ]);
    });
  });
});
