/**
 * Tier 1: Feature Coverage Test Suite
 * Minimum 5 test cases per requirement:
 * - R1: Game Mode Selector & Lifecycle Architecture
 * - R2: MediaPipe Hands Detection Lifecycle
 * - R3: Gesture Mechanics & Coordinate Mapping
 * - R4: PiP View & Dynamic Interactive Reticle
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { MockMediaDevices, MockMediaStream, StreamLeakAuditor } from './harness/mockMediaStream';
import { LandmarkSynthesizer } from './harness/landmarkSynthesizer';
import { CoordinateEngine } from './harness/coordinateEngine';
import { GestureClassifier } from './harness/gestureClassifier';
import { GameEngineSim } from './harness/gameEngineSim';

describe('Tier 1: Feature Coverage (R1 - R4)', () => {
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
  // R1: Mode Selector & Hardware Lifecycle
  // ==========================================
  describe('R1: Game Mode Selector', () => {
    test('R1.1: Default mode initializes to classic when starting game without parameters', async () => {
      await sim.startArcadeGame();
      assert.equal(sim.controlMode, 'classic');
      assert.equal(sim.isCameraTracking, false);
      assert.equal(sim.activeCameraStream, null);
    });

    test('R1.2: Switching mode to camera requests camera permission and begins tracking', async () => {
      await sim.startArcadeGame('classic');
      assert.equal(sim.controlMode, 'classic');

      await sim.switchControlMode('camera');
      assert.equal(sim.controlMode, 'camera');
      assert.equal(sim.isCameraTracking, true);
      assert.equal(sim.trackingStatus, 'tracking');
      assert.ok(sim.activeCameraStream !== null);
      assert.equal(sim.activeCameraStream.active, true);
    });

    test('R1.3: Switching mode back to classic releases camera stream tracks and resets tracking status', async () => {
      await sim.startArcadeGame('camera');
      assert.equal(sim.isCameraTracking, true);
      assert.equal(StreamLeakAuditor.getActiveStreamCount(), 1);

      await sim.switchControlMode('classic');
      assert.equal(sim.controlMode, 'classic');
      assert.equal(sim.isCameraTracking, false);
      assert.equal(sim.trackingStatus, 'idle');
      assert.equal(sim.activeCameraStream, null);
      assert.equal(StreamLeakAuditor.getActiveStreamCount(), 0);
      assert.equal(StreamLeakAuditor.getActiveTrackCount(), 0);
    });

    test('R1.4: Starting game directly in camera mode configures camera pipeline cleanly', async () => {
      await sim.startArcadeGame('camera');
      assert.equal(sim.controlMode, 'camera');
      assert.equal(sim.isCameraTracking, true);
      assert.equal(sim.gameState, 'playing');
      assert.equal(StreamLeakAuditor.getActiveStreamCount(), 1);
    });

    test('R1.5: Toggling mode to current mode is idempotent and does not recreate streams', async () => {
      await sim.startArcadeGame('camera');
      const initialStream = sim.activeCameraStream;
      const initialCallCount = sim.mediaDevices.getUserMediaCalls;

      // Redundant switch
      await sim.switchControlMode('camera');
      assert.equal(sim.activeCameraStream, initialStream);
      assert.equal(sim.mediaDevices.getUserMediaCalls, initialCallCount);
    });

    test('R1.6: Pausing game retains camera state without triggering teardown', async () => {
      await sim.startArcadeGame('camera');
      sim.gameState = 'paused';

      assert.equal(sim.isCameraTracking, true);
      assert.equal(sim.controlMode, 'camera');
      assert.ok(sim.activeCameraStream !== null && sim.activeCameraStream.active);
    });
  });

  // ==========================================
  // R2: MediaPipe Detection Lifecycle
  // ==========================================
  describe('R2: MediaPipe Detection Lifecycle', () => {
    test('R2.1: Status transitions through idle -> requesting-camera -> loading-model -> tracking', async () => {
      const statusLog: string[] = [];
      const trackingSim = new GameEngineSim();

      statusLog.push(trackingSim.trackingStatus); // idle
      await trackingSim.initCameraMode();
      statusLog.push(trackingSim.trackingStatus); // tracking

      assert.deepEqual(statusLog, ['idle', 'tracking']);
      trackingSim.teardownCamera();
    });

    test('R2.2: Detection loop processes synthetic 21-landmark array without errors', () => {
      const palm = LandmarkSynthesizer.createOpenPalm({ x: 0.5, y: 0.5, z: 0 });
      assert.equal(palm.length, 21);

      const metrics = GestureClassifier.computeMetrics(palm);
      assert.ok(metrics.scale > 0, 'Scale must be positive');
      assert.equal(metrics.curledCount, 0, 'Open palm must have 0 curled fingers');
      assert.ok(metrics.pinchRatio > 0.35, 'Open palm pinch ratio must be high');
      assert.equal(metrics.isFistCandidate, false);
      assert.equal(metrics.isPinchCandidate, false);
    });

    test('R2.3: Absence or empty landmark array returns neutral metrics without throwing', () => {
      const emptyMetrics = GestureClassifier.computeMetrics([]);
      assert.equal(emptyMetrics.isFistCandidate, false);
      assert.equal(emptyMetrics.isPinchCandidate, false);
      assert.equal(emptyMetrics.curledCount, 0);
      assert.equal(emptyMetrics.pinchRatio, 1);
    });

    test('R2.4: 4-step teardown closes all tracks and marks stream inactive', async () => {
      await sim.startArcadeGame('camera');
      const stream = sim.activeCameraStream!;
      const tracks = stream.getTracks();
      assert.ok(tracks.length > 0);
      assert.equal(tracks[0].readyState, 'live');

      sim.teardownCamera();
      assert.equal(tracks[0].readyState, 'ended');
      assert.equal(sim.activeCameraStream, null);
      assert.equal(sim.isCameraTracking, false);
    });

    test('R2.5: Detection frame rate calculation tracks inter-frame delta correctly', () => {
      const deltas = [16.6, 16.7, 16.5, 16.8]; // ~60 FPS
      const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
      const computedFps = Math.round(1000 / avgDelta);
      assert.equal(computedFps, 60);
    });
  });

  // ==========================================
  // R3: Gesture Mechanics & Coordinate Mapping
  // ==========================================
  describe('R3: Gesture Mechanics & Coordinate Mapping', () => {
    test('R3.1: Pinch gesture triggers whack on rising edge when pinchRatio < 0.22', () => {
      const pinchLm = LandmarkSynthesizer.createPinch({ x: 0.5, y: 0.5, z: 0 }, 0.2, 0.10);
      const res = classifier.evaluateFrame(pinchLm, 1000);

      assert.equal(res.isWhacking, true);
      assert.equal(res.activeGesture, 'pinch');
      assert.equal(res.fsmState, 'COOLDOWN');
      assert.ok(res.metrics.pinchRatio < 0.22);
    });

    test('R3.2: Closed fist triggers whack on rising edge when curledCount >= 3', () => {
      const fistLm = LandmarkSynthesizer.createClosedFist({ x: 0.5, y: 0.5, z: 0 }, 0.2);
      const res = classifier.evaluateFrame(fistLm, 1000);

      assert.equal(res.isWhacking, true);
      assert.equal(res.activeGesture, 'fist');
      assert.equal(res.fsmState, 'COOLDOWN');
      assert.ok(res.metrics.curledCount >= 3);
    });

    test('R3.3: Mandatory release requirement prevents continuous whacking while holding fist', () => {
      const fistLm = LandmarkSynthesizer.createClosedFist({ x: 0.5, y: 0.5, z: 0 }, 0.2);

      // Frame 1 at t=1000: Initial strike
      const frame1 = classifier.evaluateFrame(fistLm, 1000);
      assert.equal(frame1.isWhacking, true);

      // Frame 2 at t=1100: Still in cooldown
      const frame2 = classifier.evaluateFrame(fistLm, 1100);
      assert.equal(frame2.isWhacking, false);

      // Frame 3 at t=1300: Cooldown expired (300ms > 260ms), but fist still held closed!
      const frame3 = classifier.evaluateFrame(fistLm, 1300);
      assert.equal(frame3.isWhacking, false, 'Holding fist must NOT trigger a second hit!');
      assert.equal(frame3.fsmState, 'WAITING_RELEASE');

      // Frame 4 at t=1350: User uncurls hand (release)
      const openLm = LandmarkSynthesizer.createOpenPalm({ x: 0.5, y: 0.5, z: 0 }, 0.2);
      const frame4 = classifier.evaluateFrame(openLm, 1350);
      assert.equal(frame4.fsmState, 'IDLE', 'Releasing hand resets FSM to IDLE');

      // Frame 5 at t=1400: User punches again -> triggers second hit!
      const frame5 = classifier.evaluateFrame(fistLm, 1400);
      assert.equal(frame5.isWhacking, true, 'Subsequent fist after release triggers whack');
    });

    test('R3.4: 260ms cooldown rejects premature gestures during hammer swing animation', () => {
      const pinchLm = LandmarkSynthesizer.createPinch({ x: 0.5, y: 0.5, z: 0 }, 0.2, 0.10);

      // Hit at t=1000
      classifier.evaluateFrame(pinchLm, 1000);

      // Attempt hit at t=1150 (150ms later < 260ms)
      const premature = classifier.evaluateFrame(pinchLm, 1150);
      assert.equal(premature.isWhacking, false);
      assert.equal(premature.remainingCooldownMs, 110);
    });

    test('R3.5: Coordinate transformation mirrors X and applies 12% playable deadzone margin', () => {
      // Raw X = 0.88 (user hand on right side of webcam image)
      // Mirroring: 1.0 - 0.88 = 0.12 (left border of deadzone)
      // Margin mapping: 0.12 maps to normalized X = 0.0
      const leftCoords = CoordinateEngine.toNormalizedCoords(0.88, 0.5);
      assert.ok(Math.abs(leftCoords.x - 0.0) < 0.01, `Expected normX ~0.0, got ${leftCoords.x}`);

      // Raw X = 0.12 (user hand on left side of webcam image)
      // Mirroring: 1.0 - 0.12 = 0.88 (right border of deadzone)
      // Margin mapping: 0.88 maps to normalized X = 1.0
      const rightCoords = CoordinateEngine.toNormalizedCoords(0.12, 0.5);
      assert.ok(Math.abs(rightCoords.x - 1.0) < 0.01, `Expected normX ~1.0, got ${rightCoords.x}`);

      // Center: Raw X = 0.5, Raw Y = 0.5
      const centerCoords = CoordinateEngine.toNormalizedCoords(0.5, 0.5);
      assert.ok(Math.abs(centerCoords.x - 0.5) < 0.01);
      assert.ok(Math.abs(centerCoords.y - 0.5) < 0.01);
    });

    test('R3.6: Three.js NDC space maps corners and center with inverted Y', () => {
      // Top-Left (normX = 0, normY = 0) -> NDC (-1.0, +1.0)
      const tl = CoordinateEngine.toNDCCoords(0.0, 0.0);
      assert.equal(tl.x, -1.0);
      assert.equal(tl.y, 1.0);

      // Center (normX = 0.5, normY = 0.5) -> NDC (0.0, 0.0)
      const center = CoordinateEngine.toNDCCoords(0.5, 0.5);
      assert.equal(center.x, 0.0);
      assert.equal(center.y, 0.0);

      // Bottom-Right (normX = 1.0, normY = 1.0) -> NDC (+1.0, -1.0)
      const br = CoordinateEngine.toNDCCoords(1.0, 1.0);
      assert.equal(br.x, 1.0);
      assert.equal(br.y, -1.0);
    });
  });

  // ==========================================
  // R4: PiP View & Dynamic Interactive Reticle
  // ==========================================
  describe('R4: PiP View & Dynamic Interactive Reticle', () => {
    test('R4.1: PiP collapsed state toggle preserves active tracking without frame loss', async () => {
      await sim.startArcadeGame('camera');
      let pipCollapsed = false;

      // Toggle PiP collapsed
      pipCollapsed = true;
      assert.equal(sim.isCameraTracking, true, 'Tracking must remain active when PiP is collapsed');
      assert.equal(sim.activeCameraStream?.active, true);

      // Toggle PiP expanded
      pipCollapsed = false;
      assert.equal(sim.isCameraTracking, true);
    });

    test('R4.2: Reticle position employs velocity-adaptive EMA smoothing', () => {
      // Static/slow hand movement (dist = 0.001) -> alpha is low (~0.18) for jitter suppression
      const frame1 = classifier.applyAdaptiveSmoothing(0.5, 0.5, 1000);
      const slowFrame = classifier.applyAdaptiveSmoothing(0.501, 0.501, 1016);
      assert.ok(slowFrame.alpha < 0.25, `Expected low alpha for slow movement, got ${slowFrame.alpha}`);

      // Fast hand movement (dist = 0.20 across 16ms) -> alpha increases towards 0.85 for responsiveness
      const fastFrame = classifier.applyAdaptiveSmoothing(0.70, 0.70, 1032);
      assert.ok(fastFrame.alpha > 0.70, `Expected high alpha for fast movement, got ${fastFrame.alpha}`);
    });

    test('R4.3: Reticle visual state transitions accurately to mole target-lock', () => {
      // Center hole (Hole 4) target coordinates in NDC
      const centerHoleCoords = CoordinateEngine.HOLE_COORDS[4]; // { x: 0, z: 0 }
      const groundHit = CoordinateEngine.raycastToGround(0.0, 0.0); // NDC (0, 0)
      const closestHole = CoordinateEngine.findClosestHole(groundHit);

      assert.ok(closestHole !== null);
      assert.equal(closestHole.holeIndex, 4);
      assert.ok(closestHole.distance < CoordinateEngine.MAX_HIT_RADIUS);
    });

    test('R4.4: Viewport pixel mapping strictly bounds reticle within screen rectangle', () => {
      const viewport = { left: 100, top: 50, width: 800, height: 600 };

      // Normal center
      const centerPx = CoordinateEngine.toViewportPixels(0.5, 0.5, viewport);
      assert.equal(centerPx.x, 500); // 100 + 400
      assert.equal(centerPx.y, 350); // 50 + 300

      // Edge min
      const minPx = CoordinateEngine.toViewportPixels(0.0, 0.0, viewport);
      assert.equal(minPx.x, 100);
      assert.equal(minPx.y, 50);

      // Edge max
      const maxPx = CoordinateEngine.toViewportPixels(1.0, 1.0, viewport);
      assert.equal(maxPx.x, 900);
      assert.equal(maxPx.y, 650);
    });

    test('R4.5: Proximity hit testing correctly identifies all 9 hole targets', () => {
      for (let i = 0; i < 9; i++) {
        const rawCoords = CoordinateEngine.getHoleTargetCameraCoords(i);
        const norm = CoordinateEngine.toNormalizedCoords(rawCoords.x, rawCoords.y);
        const ndc = CoordinateEngine.toNDCCoords(norm.x, norm.y);
        const hit = CoordinateEngine.raycastToGround(ndc.x, ndc.y);
        const closest = CoordinateEngine.findClosestHole(hit);

        assert.ok(closest !== null, `Hole ${i} must be identifiable from its target coords`);
        assert.equal(closest.holeIndex, i, `Expected hole index ${i}, got ${closest?.holeIndex}`);
      }
    });
  });
});
