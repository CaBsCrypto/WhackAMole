/**
 * Direct Adversarial Stress Tests against production HandDetectorService
 * Target: src/services/handDetector.ts
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { HandDetectorService } from '../src/services/handDetector';
import { LandmarkSynthesizer } from './harness/landmarkSynthesizer';

describe('HandDetectorService (Production Code) Adversarial Stress Tests', () => {
  let detector: HandDetectorService;
  let mockLandmarks: any[] = [];

  beforeEach(() => {
    detector = new HandDetectorService();
    // Inject mock landmarker to bypass browser WebGL/WASM in test runner
    (detector as any).landmarker = {
      detectForVideo: (_video: any, _timestamp: number) => {
        return {
          landmarks: mockLandmarks.length > 0 ? [mockLandmarks] : [],
        };
      },
      close: () => {},
    };
    (detector as any).isInitialized = true;
    detector.resetState();
  });

  // ==========================================================================
  // 1. SCALE-INVARIANCE ACROSS USER DISTANCES (0.3x, 0.5x, 1.0x, 2.0x, 3.0x)
  // ==========================================================================
  describe('1. Scale-Invariance in Production handDetector.ts', () => {
    const scaleFactors = [0.3, 0.5, 1.0, 2.0, 3.0];

    test('1.1: Closed fist classification remains 100% stable across all scales', () => {
      for (const scale of scaleFactors) {
        mockLandmarks = LandmarkSynthesizer.createClosedFist({ x: 0.5, y: 0.5, z: 0 }, 0.2 * scale);
        const result = detector.processFrame({} as HTMLVideoElement, 1000, 1920, 1080);

        assert.equal(
          result.gesture.isFist,
          true,
          `Scale ${scale}x: isFist must be true for closed fist`
        );
        assert.equal(
          result.gesture.fistCurledCount,
          4,
          `Scale ${scale}x: fistCurledCount must be 4`
        );
        assert.equal(
          result.gesture.isWhacking,
          true,
          `Scale ${scale}x: Initial fist clench must trigger isWhacking`
        );
        detector.resetState();
      }
    });

    test('1.2: Pinch classification remains 100% stable across all scales', () => {
      for (const scale of scaleFactors) {
        mockLandmarks = LandmarkSynthesizer.createPinch({ x: 0.5, y: 0.5, z: 0 }, 0.2 * scale, 0.12);
        const result = detector.processFrame({} as HTMLVideoElement, 1000, 1920, 1080);

        assert.equal(
          result.gesture.isPinching,
          true,
          `Scale ${scale}x: isPinching must be true`
        );
        assert.ok(
          Math.abs(result.gesture.pinchDistance - 0.12) < 0.005,
          `Scale ${scale}x: pinchDistance must scale-invariantly match ~0.12, got ${result.gesture.pinchDistance}`
        );
        assert.equal(
          result.gesture.isWhacking,
          true,
          `Scale ${scale}x: Initial pinch must trigger isWhacking`
        );
        detector.resetState();
      }
    });

    test('1.3: Open palm remains non-gesture across all scales', () => {
      for (const scale of scaleFactors) {
        mockLandmarks = LandmarkSynthesizer.createOpenPalm({ x: 0.5, y: 0.5, z: 0 }, 0.2 * scale);
        const result = detector.processFrame({} as HTMLVideoElement, 1000, 1920, 1080);

        assert.equal(result.gesture.isFist, false, `Scale ${scale}x: Open palm must not be fist`);
        assert.equal(result.gesture.isPinching, false, `Scale ${scale}x: Open palm must not be pinch`);
        assert.equal(result.gesture.isWhacking, false, `Scale ${scale}x: Open palm must not whack`);
        assert.equal(result.gesture.fistCurledCount, 0);
        detector.resetState();
      }
    });
  });

  // ==========================================================================
  // 2. MIDDLE MCP / KNUCKLE ANCHORING DURING FIST CLENCH
  // ==========================================================================
  describe('2. Middle MCP & Knuckle Anchoring Cursor Stability', () => {
    test('2.1: Knuckle centroid anchor stays stationary during fist clench', () => {
      const openPalm = LandmarkSynthesizer.createOpenPalm({ x: 0.5, y: 0.5, z: 0 }, 0.2);
      const closedFist = LandmarkSynthesizer.createClosedFist({ x: 0.5, y: 0.5, z: 0 }, 0.2);

      // Knuckles: Index MCP (5), Middle MCP (9), Ring MCP (13)
      const openCentroid = {
        x: (openPalm[5].x + openPalm[9].x + openPalm[13].x) / 3,
        y: (openPalm[5].y + openPalm[9].y + openPalm[13].y) / 3,
      };
      const fistCentroid = {
        x: (closedFist[5].x + closedFist[9].x + closedFist[13].x) / 3,
        y: (closedFist[5].y + closedFist[9].y + closedFist[13].y) / 3,
      };

      const drift = Math.hypot(openCentroid.x - fistCentroid.x, openCentroid.y - fistCentroid.y);
      assert.equal(drift, 0.0, `Metacarpal knuckle centroid drift must be strictly 0, got ${drift}`);
    });

    test('2.2: Middle MCP knuckle anchor prevents pointer jump vs raw index fingertip', () => {
      const openPalm = LandmarkSynthesizer.createOpenPalm({ x: 0.5, y: 0.5, z: 0 }, 0.2);
      const closedFist = LandmarkSynthesizer.createClosedFist({ x: 0.5, y: 0.5, z: 0 }, 0.2);

      // If tracking index tip (landmark 8), fingertip moves by ~0.19 normalized units when curling
      const indexTipJump = Math.hypot(openPalm[8].x - closedFist[8].x, openPalm[8].y - closedFist[8].y);
      assert.ok(indexTipJump > 0.15, `Index tip curling jump is ${indexTipJump}`);

      // Feed closed fist into HandDetectorService
      mockLandmarks = closedFist;
      const res = detector.processFrame({} as HTMLVideoElement, 1000, 1920, 1080);
      assert.ok(res.cursor !== null);

      // In closed fist, cursor anchors to knuckle centroid
      const expectedRawX = (closedFist[5].x + closedFist[9].x + closedFist[13].x) / 3;
      const expectedRawY = (closedFist[5].y + closedFist[9].y + closedFist[13].y) / 3;
      assert.ok(Math.abs(res.cursor.rawX - expectedRawX) < 1e-6);
      assert.ok(Math.abs(res.cursor.rawY - expectedRawY) < 1e-6);
    });
  });

  // ==========================================================================
  // 3. EDGE MARGIN BOUNDARIES [0.12, 0.88] TO THREE.JS NDC [-1, 1]
  // ==========================================================================
  describe('3. Edge Margin Boundaries & Three.js NDC Projections', () => {
    test('3.1: Margin boundaries map smoothly to NDC [-1, 1] without NaN or clipping errors', () => {
      // Test 20 landmark points across edge boundaries from -0.5 to 1.5
      const testCoordinates = [
        -0.5, -0.1, 0.0, 0.05, 0.119, 0.12, 0.25, 0.5, 0.75, 0.88, 0.881, 0.95, 1.0, 1.1, 1.5,
      ];

      for (const x of testCoordinates) {
        for (const y of [0.12, 0.5, 0.88]) {
          // Construct landmarks at (x, y)
          mockLandmarks = LandmarkSynthesizer.createOpenPalm({ x, y, z: 0 }, 0.1);
          const res = detector.processFrame({} as HTMLVideoElement, 1000, 1920, 1080);

          assert.ok(res.cursor !== null);
          assert.ok(!isNaN(res.cursor.normX), `normX is NaN for rawX=${x}`);
          assert.ok(!isNaN(res.cursor.normY), `normY is NaN for rawY=${y}`);
          assert.ok(!isNaN(res.cursor.ndcX), `ndcX is NaN for rawX=${x}`);
          assert.ok(!isNaN(res.cursor.ndcY), `ndcY is NaN for rawY=${y}`);

          // Strictly within normalized [0, 1]
          assert.ok(res.cursor.normX >= 0.0 && res.cursor.normX <= 1.0, `normX out of bounds: ${res.cursor.normX}`);
          assert.ok(res.cursor.normY >= 0.0 && res.cursor.normY <= 1.0, `normY out of bounds: ${res.cursor.normY}`);

          // Strictly within Three.js NDC [-1, 1]
          assert.ok(res.cursor.ndcX >= -1.0 && res.cursor.ndcX <= 1.0, `ndcX out of bounds: ${res.cursor.ndcX}`);
          assert.ok(res.cursor.ndcY >= -1.0 && res.cursor.ndcY <= 1.0, `ndcY out of bounds: ${res.cursor.ndcY}`);

          // Viewport pixels within screen limits
          assert.ok(res.cursor.clientX >= 0 && res.cursor.clientX <= 1920);
          assert.ok(res.cursor.clientY >= 0 && res.cursor.clientY <= 1080);
        }
      }
    });
  });

  // ==========================================================================
  // 4. 260MS COOLDOWN AND MANDATORY RELEASE REQUIREMENT
  // ==========================================================================
  describe('4. 260ms Cooldown & Mandatory Release in Production handDetector.ts', () => {
    test('4.1: Continuous closed fist hold triggers strictly 1 whack over 1000ms (anti-spam)', () => {
      mockLandmarks = LandmarkSynthesizer.createClosedFist({ x: 0.5, y: 0.5, z: 0 }, 0.2);

      let totalWhacks = 0;
      const startTime = 1000;

      // 60 frames = approx 1000ms
      for (let f = 0; f < 60; f++) {
        const ts = startTime + f * 16.6;
        const res = detector.processFrame({} as HTMLVideoElement, ts, 1920, 1080);

        if (res.gesture.isWhacking) {
          totalWhacks++;
        }

        if (f === 0) {
          assert.equal(res.gesture.isWhacking, true, 'Frame 0: Fist clench must trigger whack');
        } else {
          assert.equal(
            res.gesture.isWhacking,
            false,
            `Frame ${f} (t=${ts}): Mandatory release violated! Continuous fist triggered whack`
          );
        }
      }

      assert.equal(
        totalWhacks,
        1,
        `Holding closed fist for 1000ms must produce exactly 1 whack, got ${totalWhacks}`
      );
    });

    test('4.2: Full release enables second whack after 260ms cooldown', () => {
      const fist = LandmarkSynthesizer.createClosedFist({ x: 0.5, y: 0.5, z: 0 }, 0.2);
      const openPalm = LandmarkSynthesizer.createOpenPalm({ x: 0.5, y: 0.5, z: 0 }, 0.2);

      // Strike 1
      mockLandmarks = fist;
      const r1 = detector.processFrame({} as HTMLVideoElement, 1000, 1920, 1080);
      assert.equal(r1.gesture.isWhacking, true);

      // Still holding fist at t=1300ms (300ms > 260ms cooldown)
      const rHold = detector.processFrame({} as HTMLVideoElement, 1300, 1920, 1080);
      assert.equal(rHold.gesture.isWhacking, false, 'Must not whack while fist is unreleased');

      // Release hand at t=1320ms
      mockLandmarks = openPalm;
      const rRelease = detector.processFrame({} as HTMLVideoElement, 1320, 1920, 1080);
      assert.equal(rRelease.gesture.isWhacking, false);
      assert.equal(rRelease.gesture.isFist, false);

      // Strike 2 at t=1350ms
      mockLandmarks = fist;
      const r2 = detector.processFrame({} as HTMLVideoElement, 1350, 1920, 1080);
      assert.equal(r2.gesture.isWhacking, true, 'Second whack must trigger after release');
    });

    test('4.3: Hysteresis prevents re-triggering on partial uncurling (curledCount = 2)', () => {
      const fist4 = LandmarkSynthesizer.createCurledCountPose(4);
      const partial2 = LandmarkSynthesizer.createCurledCountPose(2);

      // Strike 1
      mockLandmarks = fist4;
      const r1 = detector.processFrame({} as HTMLVideoElement, 1000, 1920, 1080);
      assert.equal(r1.gesture.isWhacking, true);

      // Partial release to 2 curled fingers at t=1300ms
      mockLandmarks = partial2;
      const rPartial = detector.processFrame({} as HTMLVideoElement, 1300, 1920, 1080);
      assert.equal(rPartial.gesture.isWhacking, false);
      // Because curledCount 2 is > 1 (release threshold <= 1), isFist stays true
      assert.equal(rPartial.gesture.isFist, true);

      // Attempt re-clench to 4 curled fingers at t=1350ms
      mockLandmarks = fist4;
      const rReClench = detector.processFrame({} as HTMLVideoElement, 1350, 1920, 1080);
      assert.equal(rReClench.gesture.isWhacking, false, 'Re-clench without full uncurl must be blocked');
    });

    test('4.4: Hand leaving camera frame cleanly resets gesture release state', () => {
      const fist = LandmarkSynthesizer.createClosedFist({ x: 0.5, y: 0.5, z: 0 }, 0.2);

      // Strike 1
      mockLandmarks = fist;
      const r1 = detector.processFrame({} as HTMLVideoElement, 1000, 1920, 1080);
      assert.equal(r1.gesture.isWhacking, true);

      // Hand leaves frame at t=1100ms
      mockLandmarks = [];
      const rLost = detector.processFrame({} as HTMLVideoElement, 1100, 1920, 1080);
      assert.equal(rLost.hasHand, false);
      assert.equal(rLost.cursor, null);
      assert.equal(rLost.gesture.isFist, false);

      // Hand returns as fist at t=1350ms (cooldown passed + hand re-entered)
      mockLandmarks = fist;
      const rReturn = detector.processFrame({} as HTMLVideoElement, 1350, 1920, 1080);
      assert.equal(rReturn.gesture.isWhacking, true, 'Hand re-entering frame as fist should strike');
    });
  });
});
