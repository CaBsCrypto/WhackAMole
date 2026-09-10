/**
 * Adversarial Stress Test Harness for WhackAMole MediaPipe Hands
 * Target: src/services/handDetector.ts and tests/harness/
 * 
 * Tests:
 * 1. Scale-invariance across user distances (0.1x, 0.3x, 0.5x, 1.0x, 2.0x, 3.0x, 5.0x)
 * 2. Middle MCP / knuckle anchoring during fist clench (jump stability & tolerance)
 * 3. Edge margin boundaries [0.12, 0.88] to Three.js NDC [-1, 1] (NaN & boundary checks)
 * 4. 260ms cooldown and mandatory release requirement (anti-spam & auto-fire prevention)
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Ensure globalThis.window exists for handDetector.ts in Node.js
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    innerWidth: 1920,
    innerHeight: 1080,
  };
}

// Import test harness
import { LandmarkSynthesizer } from './harness/landmarkSynthesizer.js';
import { CoordinateEngine } from './harness/coordinateEngine.js';
import { GestureClassifier } from './harness/gestureClassifier.js';

describe('Adversarial Stress Test: Gesture Recognition & Coordinate Mapping', () => {
  let classifier;

  beforeEach(() => {
    classifier = new GestureClassifier();
  });

  // ==========================================================================
  // 1. SCALE-INVARIANCE ACROSS USER DISTANCES
  // ==========================================================================
  describe('1. Scale-Invariance Stress Testing', () => {
    const scales = [0.1, 0.3, 0.5, 1.0, 2.0, 3.0, 5.0];

    test('1.1: Closed fist classification remains 100% stable across all scales (0.1x to 5.0x)', () => {
      for (const scale of scales) {
        // Generate closed fist scaled around center (0.5, 0.5, 0)
        const fist = LandmarkSynthesizer.createClosedFist({ x: 0.5, y: 0.5, z: 0 }, 0.2 * scale);
        const metrics = GestureClassifier.computeMetrics(fist);

        assert.equal(
          metrics.isFistCandidate,
          true,
          `Scale ${scale}x failed: Expected closed fist to be recognized`
        );
        assert.equal(
          metrics.curledCount,
          4,
          `Scale ${scale}x failed: Expected all 4 fingers to be curled, got ${metrics.curledCount}`
        );
        assert.ok(
          metrics.scale > 0,
          `Scale ${scale}x failed: Scale reference must be positive, got ${metrics.scale}`
        );
      }
    });

    test('1.2: Pinch gesture classification remains 100% stable across all scales (0.1x to 5.0x)', () => {
      for (const scale of scales) {
        // Target pinch ratio 0.12 (well below 0.22 trigger threshold)
        const pinch = LandmarkSynthesizer.createPinch({ x: 0.5, y: 0.5, z: 0 }, 0.2 * scale, 0.12);
        const metrics = GestureClassifier.computeMetrics(pinch);

        assert.equal(
          metrics.isPinchCandidate,
          true,
          `Scale ${scale}x failed: Expected pinch to be recognized`
        );
        assert.ok(
          Math.abs(metrics.pinchRatio - 0.12) < 0.005,
          `Scale ${scale}x failed: Expected pinch ratio ~0.12, got ${metrics.pinchRatio}`
        );
      }
    });

    test('1.3: Open palm classification remains 100% non-gesture across all scales (0.1x to 5.0x)', () => {
      for (const scale of scales) {
        const palm = LandmarkSynthesizer.createOpenPalm({ x: 0.5, y: 0.5, z: 0 }, 0.2 * scale);
        const metrics = GestureClassifier.computeMetrics(palm);

        assert.equal(
          metrics.isFistCandidate,
          false,
          `Scale ${scale}x failed: Open palm falsely triggered fist`
        );
        assert.equal(
          metrics.isPinchCandidate,
          false,
          `Scale ${scale}x failed: Open palm falsely triggered pinch`
        );
        assert.equal(
          metrics.curledCount,
          0,
          `Scale ${scale}x failed: Open palm curledCount must be 0, got ${metrics.curledCount}`
        );
      }
    });

    test('1.4: Scale normalization with 3D Z-depth translation (moving hand in depth)', () => {
      const zDepths = [-0.5, -0.2, 0.0, 0.2, 0.5, 1.0];
      for (const z of zDepths) {
        const fist3D = LandmarkSynthesizer.createClosedFist({ x: 0.5, y: 0.5, z }, 0.2);
        const metrics = GestureClassifier.computeMetrics(fist3D);

        assert.equal(metrics.isFistCandidate, true, `Z-depth ${z} failed to recognize fist`);
        assert.ok(!isNaN(metrics.scale) && metrics.scale > 0);
      }
    });
  });

  // ==========================================================================
  // 2. MIDDLE MCP / KNUCKLE ANCHORING DURING FIST CLENCH
  // ==========================================================================
  describe('2. Middle MCP & Knuckle Anchoring Stability', () => {
    test('2.1: Rigid Knuckle Anchor has zero spatial drift during clenching', () => {
      const openPalm = LandmarkSynthesizer.createOpenPalm({ x: 0.5, y: 0.5, z: 0 }, 0.2);
      const closedFist = LandmarkSynthesizer.createClosedFist({ x: 0.5, y: 0.5, z: 0 }, 0.2);

      // Knuckle landmarks: Index MCP (5), Middle MCP (9), Ring MCP (13)
      const openKnuckleX = (openPalm[5].x + openPalm[9].x + openPalm[13].x) / 3;
      const openKnuckleY = (openPalm[5].y + openPalm[9].y + openPalm[13].y) / 3;

      const fistKnuckleX = (closedFist[5].x + closedFist[9].x + closedFist[13].x) / 3;
      const fistKnuckleY = (closedFist[5].y + closedFist[9].y + closedFist[13].y) / 3;

      const knuckleDrift = Math.hypot(openKnuckleX - fistKnuckleX, openKnuckleY - fistKnuckleY);
      assert.equal(
        knuckleDrift,
        0.0,
        `Knuckle centroid must have 0 spatial drift during clenching, got ${knuckleDrift}`
      );

      // Compare with index fingertip drift (landmark 8)
      const indexTipDrift = Math.hypot(
        openPalm[8].x - closedFist[8].x,
        openPalm[8].y - closedFist[8].y
      );
      // Index fingertip moves by ~0.19 normalized units when curling
      assert.ok(
        indexTipDrift > 0.15,
        `Index fingertip should show significant curl retraction (>0.15), got ${indexTipDrift}`
      );
      assert.ok(
        knuckleDrift < indexTipDrift,
        'Knuckle anchor drift must be strictly less than fingertip drift'
      );
    });

    test('2.2: Continuous clench sequence preserves position within strict tolerance (< 0.05 NDC)', () => {
      // Simulate 10 frames of transition as fingers curl from open (frame 0) to tight fist (frame 9)
      const center = { x: 0.5, y: 0.5, z: 0 };
      const scale = 0.2;

      // Track knuckle positions across the entire clenching sequence
      for (let t = 0; t <= 10; t++) {
        const curlProgress = t / 10.0; // 0.0 = open, 1.0 = fully clenched
        const lm = LandmarkSynthesizer.createOpenPalm(center, scale);

        // Progressively curl fingertips toward MCP knuckles
        for (const [mcpIdx, tipIdx] of [[5, 8], [9, 12], [13, 16], [17, 20]]) {
          const startY = lm[tipIdx].y;
          const targetY = lm[mcpIdx].y + scale * 0.15;
          lm[tipIdx].y = startY + curlProgress * (targetY - startY);
        }

        // Knuckle anchor calculation
        const knuckleX = (lm[5].x + lm[9].x + lm[13].x) / 3;
        const knuckleY = (lm[5].y + lm[9].y + lm[13].y) / 3;

        // Verify knuckle anchor never drifts from the palm center
        const driftFromCenter = Math.hypot(knuckleX - center.x, knuckleY - center.y);
        // Average MCP offset from center is approx (-0.35 + 0 + 0.3)/3 * scale = -0.0167 * scale ≈ 0.0033
        assert.ok(
          driftFromCenter < 0.01,
          `Frame ${t}: Knuckle anchor drifted too far from center (${driftFromCenter})`
        );
      }
    });

    test('2.3: Velocity-Adaptive EMA Smoothing dampens clench cursor jump', () => {
      // Feed open palm position for 5 frames to settle smoother
      const openPalm = LandmarkSynthesizer.createOpenPalm({ x: 0.5, y: 0.5, z: 0 }, 0.2);
      let smoothPoint = { x: 0.5, y: 0.5, speed: 0, alpha: 1.0 };
      for (let i = 0; i < 5; i++) {
        smoothPoint = classifier.applyAdaptiveSmoothing(openPalm[9].x, openPalm[9].y, 1000 + i * 16.6);
      }

      // Next frame: fist clenches, knuckles remain at (0.5, 0.5)
      const closedFist = LandmarkSynthesizer.createClosedFist({ x: 0.5, y: 0.5, z: 0 }, 0.2);
      const nextSmooth = classifier.applyAdaptiveSmoothing(
        closedFist[9].x,
        closedFist[9].y,
        1000 + 5 * 16.6
      );

      const delta = Math.hypot(nextSmooth.x - smoothPoint.x, nextSmooth.y - smoothPoint.y);
      assert.ok(
        delta < 0.001,
        `Smoothed knuckle anchor must have negligible displacement (<0.001), got ${delta}`
      );
    });
  });

  // ==========================================================================
  // 3. EDGE MARGIN BOUNDARIES [0.12, 0.88] TO THREE.JS NDC [-1, 1]
  // ==========================================================================
  describe('3. Edge Margin Boundaries & Three.js NDC Mapping', () => {
    test('3.1: Margin boundaries map exactly to NDC limits [-1.0, 1.0]', () => {
      // rawX = 0.88 (selfie-mirrored: 1 - 0.88 = 0.12 -> normX = 0.0 -> ndcX = -1.0)
      const leftBoundary = CoordinateEngine.toNormalizedCoords(0.88, 0.5);
      const ndcLeft = CoordinateEngine.toNDCCoords(leftBoundary.x, leftBoundary.y);
      assert.ok(Math.abs(ndcLeft.x - (-1.0)) < 1e-6, `Left margin must map to NDC -1.0, got ${ndcLeft.x}`);

      // rawX = 0.12 (selfie-mirrored: 1 - 0.12 = 0.88 -> normX = 1.0 -> ndcX = +1.0)
      const rightBoundary = CoordinateEngine.toNormalizedCoords(0.12, 0.5);
      const ndcRight = CoordinateEngine.toNDCCoords(rightBoundary.x, rightBoundary.y);
      assert.ok(Math.abs(ndcRight.x - 1.0) < 1e-6, `Right margin must map to NDC +1.0, got ${ndcRight.x}`);

      // rawY = 0.12 (top of playable camera frame -> normY = 0.0 -> ndcY = +1.0)
      const topBoundary = CoordinateEngine.toNormalizedCoords(0.5, 0.12);
      const ndcTop = CoordinateEngine.toNDCCoords(topBoundary.x, topBoundary.y);
      assert.ok(Math.abs(ndcTop.y - 1.0) < 1e-6, `Top margin must map to NDC +1.0, got ${ndcTop.y}`);

      // rawY = 0.88 (bottom of playable camera frame -> normY = 1.0 -> ndcY = -1.0)
      const botBoundary = CoordinateEngine.toNormalizedCoords(0.5, 0.88);
      const ndcBot = CoordinateEngine.toNDCCoords(botBoundary.x, botBoundary.y);
      assert.ok(Math.abs(ndcBot.y - (-1.0)) < 1e-6, `Bottom margin must map to NDC -1.0, got ${ndcBot.y}`);
    });

    test('3.2: Extreme out-of-bounds coordinates clamp smoothly without NaN or Infinity', () => {
      const extremeCoordinates = [
        { rawX: -5.0, rawY: -5.0, expectedNdcX: 1.0,  expectedNdcY: 1.0 },
        { rawX: 5.0,  rawY: 5.0,  expectedNdcX: -1.0, expectedNdcY: -1.0 },
        { rawX: -0.5, rawY: 1.5,  expectedNdcX: 1.0,  expectedNdcY: -1.0 },
        { rawX: 1.5,  rawY: -0.5, expectedNdcX: -1.0, expectedNdcY: 1.0 },
      ];

      for (const { rawX, rawY, expectedNdcX, expectedNdcY } of extremeCoordinates) {
        const norm = CoordinateEngine.toNormalizedCoords(rawX, rawY);
        const ndc = CoordinateEngine.toNDCCoords(norm.x, norm.y);

        assert.ok(!isNaN(norm.x) && !isNaN(norm.y), `Norm coords must not be NaN for (${rawX}, ${rawY})`);
        assert.ok(!isNaN(ndc.x) && !isNaN(ndc.y), `NDC coords must not be NaN for (${rawX}, ${rawY})`);
        assert.ok(isFinite(ndc.x) && isFinite(ndc.y), `NDC coords must be finite for (${rawX}, ${rawY})`);

        assert.ok(
          ndc.x >= -1.0 && ndc.x <= 1.0,
          `ndcX must be strictly in [-1, 1], got ${ndc.x}`
        );
        assert.ok(
          ndc.y >= -1.0 && ndc.y <= 1.0,
          `ndcY must be strictly in [-1, 1], got ${ndc.y}`
        );

        assert.equal(ndc.x, expectedNdcX);
        assert.equal(ndc.y, expectedNdcY);

        // Test raycasting to ground plane
        const hit = CoordinateEngine.raycastToGround(ndc.x, ndc.y);
        assert.ok(!isNaN(hit.x) && !isNaN(hit.z), 'Ground raycast must produce finite hit point');
      }
    });

    test('3.3: Smooth monotonic progression across margin boundary without discontinuities', () => {
      // Sweep rawX from 0.0 to 1.0 in 100 steps
      let prevNormX = -1;
      for (let i = 0; i <= 100; i++) {
        const rawX = i / 100.0;
        // In mirrored space: mirrorX = 1 - rawX decreases as rawX increases
        // So normX decreases monotonically as rawX increases
        const norm = CoordinateEngine.toNormalizedCoords(rawX, 0.5);

        assert.ok(norm.x >= 0.0 && norm.x <= 1.0, `norm.x out of bounds: ${norm.x}`);
        if (prevNormX !== -1) {
          assert.ok(
            norm.x <= prevNormX + 1e-9,
            `Non-monotonic step detected at rawX=${rawX}: prev=${prevNormX}, curr=${norm.x}`
          );
        }
        prevNormX = norm.x;
      }
    });
  });

  // ==========================================================================
  // 4. 260MS COOLDOWN AND MANDATORY RELEASE REQUIREMENT
  // ==========================================================================
  describe('4. 260ms Cooldown & Mandatory Release Requirement', () => {
    test('4.1: Holding a closed fist continuously triggers strictly 1 whack (no auto-fire/rapid spam)', () => {
      const fist = LandmarkSynthesizer.createClosedFist({ x: 0.5, y: 0.5, z: 0 }, 0.2);

      let whackCount = 0;
      const startTime = 1000;
      // Simulate 60 frames at 16.6ms intervals (approx 1000ms = 1 full second of continuous fist hold)
      for (let frame = 0; frame < 60; frame++) {
        const currentTimestamp = startTime + frame * 16.6;
        const res = classifier.evaluateFrame(fist, currentTimestamp);

        if (res.isWhacking) {
          whackCount++;
        }

        if (frame === 0) {
          assert.equal(res.isWhacking, true, 'Frame 0: Fist clench must trigger initial whack');
          assert.equal(res.fsmState, 'COOLDOWN');
        } else if (currentTimestamp - startTime < 260) {
          assert.equal(res.isWhacking, false, `Frame ${frame}: During cooldown, must not whack`);
          assert.equal(res.fsmState, 'COOLDOWN');
        } else {
          // After 260ms cooldown has elapsed
          assert.equal(
            res.isWhacking,
            false,
            `Frame ${frame} (t=${currentTimestamp}): Mandatory release violated! Unreleased fist triggered whack`
          );
          assert.equal(
            res.fsmState,
            'WAITING_RELEASE',
            `Frame ${frame}: FSM state must be WAITING_RELEASE, got ${res.fsmState}`
          );
        }
      }

      assert.equal(
        whackCount,
        1,
        `STRICT INVARIANT: Continuous 1000ms fist hold must yield exactly 1 whack, got ${whackCount}`
      );
    });

    test('4.2: Holding closed fist for 10 seconds (600 frames) yields strictly 1 whack', () => {
      const fist = LandmarkSynthesizer.createClosedFist();
      let whackCount = 0;

      for (let frame = 0; frame < 600; frame++) {
        const res = classifier.evaluateFrame(fist, 1000 + frame * 16.6);
        if (res.isWhacking) whackCount++;
      }

      assert.equal(whackCount, 1, `10-second continuous hold must trigger only 1 whack, got ${whackCount}`);
    });

    test('4.3: Full release cycle enables subsequent whack after cooldown', () => {
      const fist = LandmarkSynthesizer.createClosedFist();
      const openPalm = LandmarkSynthesizer.createOpenPalm();

      // Whack 1 at t=1000ms
      const w1 = classifier.evaluateFrame(fist, 1000);
      assert.equal(w1.isWhacking, true);

      // Advance past cooldown to t=1300ms while still holding fist
      const held = classifier.evaluateFrame(fist, 1300);
      assert.equal(held.isWhacking, false);
      assert.equal(held.fsmState, 'WAITING_RELEASE');

      // Release hand at t=1320ms
      const released = classifier.evaluateFrame(openPalm, 1320);
      assert.equal(released.isWhacking, false);
      assert.equal(released.fsmState, 'IDLE');

      // Whack 2 at t=1350ms (now should succeed!)
      const w2 = classifier.evaluateFrame(fist, 1350);
      assert.equal(w2.isWhacking, true, 'Second whack must succeed after full release');
      assert.equal(w2.fsmState, 'COOLDOWN');
    });

    test('4.4: Partial release (curledCount = 2) does NOT reset mandatory release (hysteresis boundary)', () => {
      const fist = LandmarkSynthesizer.createCurledCountPose(4);
      const partial2 = LandmarkSynthesizer.createCurledCountPose(2); // 2 fingers curled

      // Trigger whack 1
      classifier.evaluateFrame(fist, 1000);

      // Cooldown passes at t=1300ms, player partially uncurls to 2 fingers
      const partial = classifier.evaluateFrame(partial2, 1300);
      assert.equal(partial.isWhacking, false);
      // Because curledCount 2 is > 1 (release threshold is <= 1), state remains WAITING_RELEASE!
      assert.equal(partial.fsmState, 'WAITING_RELEASE');

      // Player attempts to re-clench at t=1350ms
      const reClench = classifier.evaluateFrame(fist, 1350);
      assert.equal(
        reClench.isWhacking,
        false,
        'Re-clenching without full uncurl (<=1) must be rejected'
      );
    });

    test('4.5: Pinch mandatory release hysteresis (trigger < 0.22, release > 0.32)', () => {
      const tightPinch = LandmarkSynthesizer.createPinch({ x: 0.5, y: 0.5, z: 0 }, 0.2, 0.12);
      const flutterPinch = LandmarkSynthesizer.createPinch({ x: 0.5, y: 0.5, z: 0 }, 0.2, 0.26); // in-between 0.22 and 0.32
      const fullOpen = LandmarkSynthesizer.createOpenPalm({ x: 0.5, y: 0.5, z: 0 }, 0.2);

      // Whack 1 triggered by pinch
      const p1 = classifier.evaluateFrame(tightPinch, 1000);
      assert.equal(p1.isWhacking, true);
      assert.equal(p1.activeGesture, 'pinch');

      // At t=1300ms, user opens fingers slightly to 0.26 ratio
      const flutter = classifier.evaluateFrame(flutterPinch, 1300);
      assert.equal(flutter.isWhacking, false);
      assert.equal(
        flutter.fsmState,
        'WAITING_RELEASE',
        'Pinch ratio 0.26 is below 0.32 release threshold; must remain WAITING_RELEASE'
      );

      // Fully release at t=1320ms
      const open = classifier.evaluateFrame(fullOpen, 1320);
      assert.equal(open.fsmState, 'IDLE');

      // Whack 2 triggered at t=1350ms
      const p2 = classifier.evaluateFrame(tightPinch, 1350);
      assert.equal(p2.isWhacking, true);
    });
  });
});
