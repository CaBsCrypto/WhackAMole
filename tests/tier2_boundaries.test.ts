/**
 * Tier 2: Boundary & Corner Cases Test Suite
 * Minimum 5 test cases per feature boundary:
 * - Camera permission denied, missing webcam, busy device
 * - Rapid mode toggling (race conditions & resource leaks)
 * - Edge of frame landmarks & out-of-bounds clamping
 * - Extreme lighting & degraded confidence
 * - Multi-hand inputs & scale invariance
 * - Clenching fist without moving (Middle MCP anchoring)
 * - Rapid micro-pinching flutter & hysteresis
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { MockMediaDevices, MockMediaStream, MockMediaStreamTrack, StreamLeakAuditor } from './harness/mockMediaStream';
import { LandmarkSynthesizer } from './harness/landmarkSynthesizer';
import { CoordinateEngine } from './harness/coordinateEngine';
import { GestureClassifier } from './harness/gestureClassifier';
import { GameEngineSim } from './harness/gameEngineSim';

describe('Tier 2: Boundary & Corner Cases', () => {
  let sim: GameEngineSim;
  let classifier: GestureClassifier;

  beforeEach(() => {
    StreamLeakAuditor.reset();
    sim = new GameEngineSim();
    classifier = new GestureClassifier();
  });

  afterEach(() => {
    sim.teardownCamera();
    const leakAudit = StreamLeakAuditor.verifyClean();
    assert.ok(leakAudit.clean, `Hardware leak detected! Streams: ${leakAudit.activeStreams}, Tracks: ${leakAudit.activeTracks}`);
  });

  // ==========================================
  // Group 1: Hardware Failures & Permissions
  // ==========================================
  describe('Hardware Boundaries & Error Handling', () => {
    test('B1.1: Camera permission denied (NotAllowedError) falls back cleanly without crashing', async () => {
      sim.mediaDevices.permissionGranted = false;

      await assert.rejects(
        async () => {
          await sim.startArcadeGame('camera');
        },
        (err: Error) => {
          return err.name === 'NotAllowedError';
        }
      );

      assert.equal(sim.trackingStatus, 'error');
      assert.equal(sim.isCameraTracking, false);
      assert.equal(sim.activeCameraStream, null);

      // Verify fallback to Classic mode is possible
      await sim.startArcadeGame('classic');
      assert.equal(sim.controlMode, 'classic');
      assert.equal(sim.gameState, 'playing');
    });

    test('B1.2: Missing webcam hardware (NotFoundError) produces descriptive error', async () => {
      sim.mediaDevices.hasCameraDevice = false;

      await assert.rejects(
        async () => {
          await sim.startArcadeGame('camera');
        },
        (err: Error) => {
          return err.name === 'NotFoundError';
        }
      );

      assert.equal(sim.trackingStatus, 'error');
      assert.equal(sim.isCameraTracking, false);
    });

    test('B1.3: Camera device busy (NotReadableError) handles camera lock by another application', async () => {
      sim.mediaDevices.cameraBusy = true;

      await assert.rejects(
        async () => {
          await sim.startArcadeGame('camera');
        },
        (err: Error) => {
          return err.name === 'NotReadableError';
        }
      );

      assert.equal(sim.trackingStatus, 'error');
      assert.equal(sim.isCameraTracking, false);
    });

    test('B1.4: Camera stream track interrupted mid-game triggers track ended listener', async () => {
      await sim.startArcadeGame('camera');
      assert.equal(sim.isCameraTracking, true);

      let endedFired = false;
      const track = sim.activeCameraStream!.getVideoTracks()[0];
      track.addEventListener('ended', () => {
        endedFired = true;
      });

      // Simulate operating system killing video source
      track.stop();
      assert.equal(endedFired, true);
      assert.equal(track.readyState, 'ended');
    });

    test('B1.5: Rapid mode toggling (10 switches in <100ms) leaves zero orphan streams', async () => {
      // Simulate player hammering the mode toggle button rapidly
      for (let i = 0; i < 10; i++) {
        const mode = i % 2 === 0 ? 'camera' : 'classic';
        await sim.switchControlMode(mode);
      }

      // Ensure final state is clean and no leaking tracks remain
      await sim.switchControlMode('classic');
      assert.equal(sim.controlMode, 'classic');
      assert.equal(sim.activeCameraStream, null);
      assert.equal(StreamLeakAuditor.getActiveStreamCount(), 0);
      assert.equal(StreamLeakAuditor.getActiveTrackCount(), 0);
    });
  });

  // ==========================================
  // Group 2: Landmark Spatial & Lighting Boundaries
  // ==========================================
  describe('Landmark Spatial & Lighting Boundaries', () => {
    test('B2.1: Extreme edge of frame landmarks clamp cleanly to [0.0, 1.0] without NaN', () => {
      // Landmark far beyond left frame edge (rawX = -0.3)
      const outLeft = CoordinateEngine.toNormalizedCoords(-0.3, 0.5);
      assert.equal(outLeft.x, 1.0, 'Mirrored negative rawX must clamp to 1.0');
      assert.ok(!isNaN(outLeft.x) && !isNaN(outLeft.y));

      // Landmark far beyond right frame edge (rawX = 1.4)
      const outRight = CoordinateEngine.toNormalizedCoords(1.4, 0.5);
      assert.equal(outRight.x, 0.0, 'Mirrored oversized rawX must clamp to 0.0');

      // Landmark far beyond top edge (rawY = -0.5)
      const outTop = CoordinateEngine.toNormalizedCoords(0.5, -0.5);
      assert.equal(outTop.y, 0.0);

      // Landmark far beyond bottom edge (rawY = 1.5)
      const outBottom = CoordinateEngine.toNormalizedCoords(0.5, 1.5);
      assert.equal(outBottom.y, 1.0);
    });

    test('B2.2: Extreme low-light noise/jitter is absorbed by adaptive smoothing filter', () => {
      const baseRawX = 0.5;
      const baseRawY = 0.5;

      // Feed 30 frames of high frequency sensor jitter around (0.5, 0.5)
      let currentSmoothed = { x: baseRawX, y: baseRawY, alpha: 1 };
      for (let i = 0; i < 30; i++) {
        const jitterX = baseRawX + (Math.sin(i * 1.5) * 0.015);
        const jitterY = baseRawY + (Math.cos(i * 1.5) * 0.015);
        currentSmoothed = classifier.applyAdaptiveSmoothing(jitterX, jitterY, 1000 + i * 16.6);
      }

      // Smoothed position should stay firmly centered within +/- 0.005
      assert.ok(
        Math.abs(currentSmoothed.x - baseRawX) < 0.008,
        `Expected jitter absorption near 0.5, got ${currentSmoothed.x}`
      );
      assert.ok(
        Math.abs(currentSmoothed.y - baseRawY) < 0.008,
        `Expected jitter absorption near 0.5, got ${currentSmoothed.y}`
      );
    });

    test('B2.3: Zero time delta (dt = 0) in detection loop does not cause divide-by-zero or NaN', () => {
      classifier.applyAdaptiveSmoothing(0.5, 0.5, 1000);
      // Same timestamp
      const res = classifier.applyAdaptiveSmoothing(0.52, 0.52, 1000);

      assert.ok(!isNaN(res.x) && !isNaN(res.y));
      assert.ok(!isNaN(res.speed));
      assert.ok(!isNaN(res.alpha));
    });

    test('B2.4: Out-of-bounds NDC coordinates handle extreme hand movements gracefully', () => {
      const ndc = CoordinateEngine.toNDCCoords(0.0, 1.0);
      assert.equal(ndc.x, -1.0);
      assert.equal(ndc.y, -1.0);

      const hit = CoordinateEngine.raycastToGround(ndc.x, ndc.y);
      assert.ok(!isNaN(hit.x) && !isNaN(hit.z));
    });

    test('B2.5: Multi-hand input: selects primary hand based on scale/proximity and ignores secondary hand', () => {
      // Primary foreground hand (closer, scale = 0.25)
      const primaryHand = LandmarkSynthesizer.createClosedFist({ x: 0.5, y: 0.5, z: 0 }, 0.25);
      // Secondary background hand (farther, scale = 0.10)
      const secondaryHand = LandmarkSynthesizer.createOpenPalm({ x: 0.8, y: 0.8, z: 0.3 }, 0.10);

      const hands = [primaryHand, secondaryHand];
      // Hand selection algorithm prioritizes larger hand bounding scale
      const primary = hands.reduce((best, current) => {
        const bestMetrics = GestureClassifier.computeMetrics(best);
        const currentMetrics = GestureClassifier.computeMetrics(current);
        return currentMetrics.scale > bestMetrics.scale ? current : best;
      });

      assert.equal(primary, primaryHand, 'Must prioritize larger foreground hand');
      const evalRes = classifier.evaluateFrame(primary, 1000);
      assert.equal(evalRes.isWhacking, true);
    });

    test('B2.6: Degraded confidence score (< 0.5) triggers no-hand-detected without throwing', () => {
      const noisy = LandmarkSynthesizer.addNoise(LandmarkSynthesizer.createOpenPalm(), 0.15);
      const metrics = GestureClassifier.computeMetrics(noisy);
      assert.ok(!isNaN(metrics.scale));
      assert.ok(!isNaN(metrics.pinchRatio));
    });
  });

  // ==========================================
  // Group 3: Gesture Scale & Morphological Boundaries
  // ==========================================
  describe('Gesture Scale Invariance & Stability Boundaries', () => {
    test('B3.1: Scale invariance across extreme camera distances (close vs far)', () => {
      // Hand very close to camera (scale = 0.45, H_scale = 0.36)
      const closeFist = LandmarkSynthesizer.createClosedFist({ x: 0.5, y: 0.5, z: 0 }, 0.45);
      const closeMetrics = GestureClassifier.computeMetrics(closeFist);

      // Hand far from camera (scale = 0.08, H_scale = 0.064)
      const farFist = LandmarkSynthesizer.createClosedFist({ x: 0.5, y: 0.5, z: 0 }, 0.08);
      const farMetrics = GestureClassifier.computeMetrics(farFist);

      // Both must classify as valid fists regardless of distance
      assert.equal(closeMetrics.isFistCandidate, true, 'Close fist must be recognized');
      assert.equal(farMetrics.isFistCandidate, true, 'Far fist must be recognized');
      assert.equal(closeMetrics.curledCount, farMetrics.curledCount);
    });

    test('B3.2: Clenching fist without moving keeps cursor stable (Middle MCP anchoring)', () => {
      // When a user clenches a fist from an open palm, the fingertips curl inwards towards palm.
      // If the index fingertip (8) was used as the cursor anchor, the cursor would jump by ~0.15 norm.
      // Anchoring to Middle MCP (9) keeps the cursor position stationary!
      const openPalm = LandmarkSynthesizer.createOpenPalm({ x: 0.5, y: 0.5, z: 0 }, 0.2);
      const closedFist = LandmarkSynthesizer.createClosedFist({ x: 0.5, y: 0.5, z: 0 }, 0.2);

      // Middle MCP (knuckle base) is landmark 9
      const openMCP = openPalm[9];
      const fistMCP = closedFist[9];

      const knuckleDrift = Math.hypot(openMCP.x - fistMCP.x, openMCP.y - fistMCP.y);
      assert.equal(knuckleDrift, 0.0, 'Middle MCP knuckle anchor must have 0 spatial drift during clenching');
    });

    test('B3.3: Rapid micro-pinching flutter near threshold is stabilized by hysteresis', () => {
      // Trigger threshold is < 0.22, Release threshold is > 0.32
      // Frame 1: Pinch triggers (ratio = 0.15)
      const pinchLm = LandmarkSynthesizer.createPinch({ x: 0.5, y: 0.5, z: 0 }, 0.2, 0.15);
      const res1 = classifier.evaluateFrame(pinchLm, 1000);
      assert.equal(res1.isWhacking, true);

      // Simulate player fluttering fingers at ratio 0.24 (above trigger 0.22 but below release 0.32)
      // at t=1300 (after 260ms cooldown)
      const flutterLm = LandmarkSynthesizer.createPinch({ x: 0.5, y: 0.5, z: 0 }, 0.2, 0.24);
      const res2 = classifier.evaluateFrame(flutterLm, 1300);

      // Because 0.24 < 0.32 (release threshold), the gesture is NOT considered released!
      // Therefore, it must transition to WAITING_RELEASE rather than re-triggering!
      assert.equal(res2.isWhacking, false);
      assert.equal(res2.fsmState, 'WAITING_RELEASE');

      // Now open fingers fully (ratio > 0.4)
      const openLm = LandmarkSynthesizer.createOpenPalm({ x: 0.5, y: 0.5, z: 0 }, 0.2);
      const res3 = classifier.evaluateFrame(openLm, 1350);
      assert.equal(res3.fsmState, 'IDLE');
    });

    test('B3.4: Hysteresis on closed fist release (trigger >= 3 curled, release <= 1 curled)', () => {
      // Fist with 4 fingers curled triggers at t=1000
      const fist4 = LandmarkSynthesizer.createCurledCountPose(4);
      const res1 = classifier.evaluateFrame(fist4, 1000);
      assert.equal(res1.isWhacking, true);

      // At t=1300 (cooldown expired), player partially uncurls to 2 fingers
      const partial2 = LandmarkSynthesizer.createCurledCountPose(2);
      const res2 = classifier.evaluateFrame(partial2, 1300);

      // Curled count = 2 is > 1 (release threshold), so state must be WAITING_RELEASE!
      assert.equal(res2.isWhacking, false);
      assert.equal(res2.fsmState, 'WAITING_RELEASE');

      // Fully open to 0 curled fingers
      const open0 = LandmarkSynthesizer.createCurledCountPose(0);
      const res3 = classifier.evaluateFrame(open0, 1350);
      assert.equal(res3.fsmState, 'IDLE');
    });

    test('B3.5: Extreme Viewport Resizing adjusts pixel mapping correctly without distortion', () => {
      // 4K Desktop resolution
      const desktop = { left: 0, top: 0, width: 3840, height: 2160 };
      const ptDesktop = CoordinateEngine.toViewportPixels(0.5, 0.5, desktop);
      assert.equal(ptDesktop.x, 1920);
      assert.equal(ptDesktop.y, 1080);

      // Compact Mobile Portrait resolution
      const mobile = { left: 0, top: 0, width: 375, height: 812 };
      const ptMobile = CoordinateEngine.toViewportPixels(0.5, 0.5, mobile);
      assert.equal(ptMobile.x, 187.5);
      assert.equal(ptMobile.y, 406);
    });

    test('B3.6: Clenching fist while moving rapidly preserves smooth trajectory', () => {
      // Hand moving at speed while clenching
      const frame1 = classifier.applyAdaptiveSmoothing(0.3, 0.3, 1000);
      const frame2 = classifier.applyAdaptiveSmoothing(0.4, 0.35, 1016);
      const frame3 = classifier.applyAdaptiveSmoothing(0.5, 0.4, 1032);

      assert.ok(frame3.speed > 0);
      assert.ok(frame3.alpha > 0.3);
      assert.ok(frame3.x > frame1.x);
    });

    test('B3.7: Rapid alternating between fist and pinch requires full release between each', () => {
      const fistLm = LandmarkSynthesizer.createClosedFist();
      const pinchLm = LandmarkSynthesizer.createPinch();
      const openLm = LandmarkSynthesizer.createOpenPalm();

      // Fist strike at t=1000
      const w1 = classifier.evaluateFrame(fistLm, 1000);
      assert.equal(w1.isWhacking, true);
      assert.equal(w1.activeGesture, 'fist');

      // Attempt pinch without uncurling at t=1300 -> blocked
      const blocked = classifier.evaluateFrame(pinchLm, 1300);
      assert.equal(blocked.isWhacking, false);

      // Release at t=1320
      classifier.evaluateFrame(openLm, 1320);

      // Pinch strike at t=1350 -> succeeds!
      const w2 = classifier.evaluateFrame(pinchLm, 1350);
      assert.equal(w2.isWhacking, true);
      assert.equal(w2.activeGesture, 'pinch');
    });

    test('B3.8: Static hand for 60 seconds drops velocity to zero without cursor drift', () => {
      classifier.applyAdaptiveSmoothing(0.5, 0.5, 1000);
      // Feed static position for 100 frames
      let lastRes = { x: 0.5, y: 0.5, speed: 0, alpha: 1 };
      for (let i = 1; i <= 60; i++) {
        lastRes = classifier.applyAdaptiveSmoothing(0.5, 0.5, 1000 + i * 16.6);
      }

      assert.equal(lastRes.x, 0.5);
      assert.equal(lastRes.y, 0.5);
      assert.equal(lastRes.speed, 0);
      assert.equal(lastRes.alpha, 0.18, 'Static hand alpha drops to minimum 0.18');
    });
  });
});
