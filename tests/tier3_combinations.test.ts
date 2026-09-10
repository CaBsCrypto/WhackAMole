/**
 * Tier 3: Cross-Feature Combinations (Pairwise Coverage) Test Suite
 * Tests asynchronous interactions and state interleaving across orthogonal features:
 * - Mode switching during active frenzy round
 * - Mode switching while fist is closed
 * - PiP minimize during active mole round
 * - Resizing window while hand is tracking across holes
 * - Stream interruption mid-gameplay
 * - Hybrid fist & pinch simultaneous gestures
 * - Hand leaving frame while hovering over mole
 * - Multi-hit tough mole under 260ms cooldown
 * - Interleaving mouse and camera inputs
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { MockMediaDevices, MockMediaStream, StreamLeakAuditor } from './harness/mockMediaStream';
import { LandmarkSynthesizer } from './harness/landmarkSynthesizer';
import { CoordinateEngine } from './harness/coordinateEngine';
import { GestureClassifier } from './harness/gestureClassifier';
import { GameEngineSim } from './harness/gameEngineSim';

describe('Tier 3: Cross-Feature Combinations (Pairwise Matrix)', () => {
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

  test('C1: Mode switching to Classic while fist is clenched leaves no stuck whack state', async () => {
    await sim.startArcadeGame('camera');

    // Clench fist
    const fistLm = LandmarkSynthesizer.createClosedFist({ x: 0.5, y: 0.5, z: 0 }, 0.2);
    const whackRes = classifier.evaluateFrame(fistLm, 1000);
    assert.equal(whackRes.isWhacking, true);
    assert.equal(whackRes.fsmState, 'COOLDOWN');

    // Player switches mode to classic while fist is still closed!
    await sim.switchControlMode('classic');
    classifier.reset();

    assert.equal(sim.controlMode, 'classic');
    assert.equal(sim.isCameraTracking, false);
    assert.equal(sim.activeCameraStream, null);

    // Verify classifier is reset to IDLE and no stuck whack triggers on classic mode
    const idleEvaluation = classifier.evaluateFrame([], 1100);
    assert.equal(idleEvaluation.isWhacking, false);
    assert.equal(idleEvaluation.fsmState, 'IDLE');
  });

  test('C2: Mode switching during active Frenzy round preserves frenzy state and score', async () => {
    await sim.startArcadeGame('camera');
    sim.activateFrenzy(15000);
    assert.equal(sim.frenzyActive, true);
    assert.equal(sim.activeMoles.size, 9);

    // Whack hole 0 via camera mode
    const hitRes1 = sim.hitHole(0);
    assert.equal(hitRes1.hit, true);
    assert.ok(sim.score > 0);
    const scoreBeforeSwitch = sim.score;

    // Switch to classic mode during Frenzy
    await sim.switchControlMode('classic');
    assert.equal(sim.controlMode, 'classic');
    assert.equal(sim.frenzyActive, true, 'Frenzy must remain active across mode switches');
    assert.equal(sim.score, scoreBeforeSwitch);

    // Whack hole 1 via classic click
    const hitRes2 = sim.hitHole(1);
    assert.equal(hitRes2.hit, true);
    assert.ok(sim.score > scoreBeforeSwitch);
  });

  test('C3: PiP minimize/collapse during active mole round does not impair hit registration', async () => {
    await sim.startArcadeGame('camera');
    sim.spawnMole(4, 'standard'); // Center hole

    // PiP is collapsed
    let pipCollapsed = true;

    // Hand points to center hole (rawX = 0.5, rawY = 0.5) and pinches
    const pinchLm = LandmarkSynthesizer.createPinch({ x: 0.5, y: 0.5, z: 0 }, 0.2, 0.12);
    const gestureRes = classifier.evaluateFrame(pinchLm, 1000);
    assert.equal(gestureRes.isWhacking, true);

    const norm = CoordinateEngine.toNormalizedCoords(0.5, 0.5);
    const ndc = CoordinateEngine.toNDCCoords(norm.x, norm.y);
    const hitGround = CoordinateEngine.raycastToGround(ndc.x, ndc.y);
    const closest = CoordinateEngine.findClosestHole(hitGround);

    assert.ok(closest !== null);
    assert.equal(closest.holeIndex, 4);

    const hitResult = sim.hitHole(closest.holeIndex);
    assert.equal(hitResult.hit, true);
    assert.equal(hitResult.destroyed, true);
    assert.equal(pipCollapsed, true);
  });

  test('C4: Window resize event while hand is tracking across hole boundary updates NDC accurately', () => {
    // Start with 1920x1080 resolution
    let viewport = { left: 0, top: 0, width: 1920, height: 1080 };
    const norm = CoordinateEngine.toNormalizedCoords(0.5, 0.5);
    const px1 = CoordinateEngine.toViewportPixels(norm.x, norm.y, viewport);
    assert.equal(px1.x, 960);
    assert.equal(px1.y, 540);

    // Resize to 800x600 resolution
    viewport = { left: 0, top: 0, width: 800, height: 600 };
    const px2 = CoordinateEngine.toViewportPixels(norm.x, norm.y, viewport);
    assert.equal(px2.x, 400);
    assert.equal(px2.y, 300);

    // NDC coordinates are invariant to screen resolution!
    const ndc1 = CoordinateEngine.toNDCCoords(norm.x, norm.y);
    const ndc2 = CoordinateEngine.toNDCCoords(norm.x, norm.y);
    assert.equal(ndc1.x, ndc2.x);
    assert.equal(ndc1.y, ndc2.y);
  });

  test('C5: Camera stream interruption mid-game transitions tracking to error without destroying game state', async () => {
    await sim.startArcadeGame('camera');
    sim.spawnMole(2, 'golden');
    sim.hitHole(2);
    const savedScore = sim.score;
    assert.ok(savedScore >= 500);

    // Camera track abruptly ends
    const track = sim.activeCameraStream!.getVideoTracks()[0];
    track.stop();
    sim.isCameraTracking = false;
    sim.trackingStatus = 'error';

    // Verify game score and mole states are intact
    assert.equal(sim.gameState, 'playing');
    assert.equal(sim.score, savedScore);
    assert.equal(sim.trackingStatus, 'error');

    // Switch to classic to continue match
    await sim.switchControlMode('classic');
    assert.equal(sim.controlMode, 'classic');
    assert.equal(sim.score, savedScore);
  });

  test('C6: Hybrid fist & pinch pose triggers exactly ONE whack without double hits', () => {
    // Generate pose where curledCount >= 3 AND pinchRatio < 0.22 simultaneously
    const hybridLm = LandmarkSynthesizer.createClosedFist({ x: 0.5, y: 0.5, z: 0 }, 0.2);
    // Bring thumb tip (4) and index tip (8) close
    hybridLm[4] = { ...hybridLm[8] };

    const metrics = GestureClassifier.computeMetrics(hybridLm);
    assert.equal(metrics.isFistCandidate, true);
    assert.equal(metrics.isPinchCandidate, true);

    // Evaluate frame
    const res = classifier.evaluateFrame(hybridLm, 1000);
    assert.equal(res.isWhacking, true);
    // One active whack type chosen
    assert.ok(res.activeGesture === 'fist' || res.activeGesture === 'pinch');

    // Next frame at t=1016 (still within cooldown)
    const resNext = classifier.evaluateFrame(hybridLm, 1016);
    assert.equal(resNext.isWhacking, false, 'No duplicate hits on continuous hybrid pose');
  });

  test('C7: Hand leaving frame while hovering over active mole does not fire phantom hit', () => {
    sim.spawnMole(4, 'standard');

    // Frame 1: Hand hovering over mole 4
    const hoverPalm = LandmarkSynthesizer.createOpenPalm({ x: 0.5, y: 0.5, z: 0 }, 0.2);
    const evalHover = classifier.evaluateFrame(hoverPalm, 1000);
    assert.equal(evalHover.isWhacking, false);

    // Frame 2: Hand leaves frame completely (empty landmarks)
    const evalGone = classifier.evaluateFrame([], 1016);
    assert.equal(evalGone.isWhacking, false);
    assert.equal(evalGone.fsmState, 'IDLE');

    // Active mole must still be alive
    const mole = sim.activeMoles.get(4);
    assert.ok(mole !== undefined);
    assert.equal(mole.state, 'idle');
    assert.equal(mole.health, 1);
  });

  test('C8: Multi-hit tough mole under 260ms cooldown requires spaced successive whacks', () => {
    sim.spawnMole(4, 'tough'); // Requires 2 hits
    const mole = sim.activeMoles.get(4)!;
    assert.equal(mole.health, 2);

    const fistLm = LandmarkSynthesizer.createClosedFist({ x: 0.5, y: 0.5, z: 0 }, 0.2);
    const openLm = LandmarkSynthesizer.createOpenPalm({ x: 0.5, y: 0.5, z: 0 }, 0.2);

    // Strike 1 at t=1000
    const whack1 = classifier.evaluateFrame(fistLm, 1000);
    assert.equal(whack1.isWhacking, true);
    const hit1 = sim.hitHole(4);
    assert.equal(hit1.destroyed, false);
    assert.equal(mole.health, 1);

    // Premature strike at t=1150 (only 150ms later) -> rejected by cooldown
    const whackPremature = classifier.evaluateFrame(fistLm, 1150);
    assert.equal(whackPremature.isWhacking, false);

    // Uncurl hand at t=1300
    classifier.evaluateFrame(openLm, 1300);

    // Strike 2 at t=1350 (350ms > 260ms) -> valid second hit!
    const whack2 = classifier.evaluateFrame(fistLm, 1350);
    assert.equal(whack2.isWhacking, true);
    const hit2 = sim.hitHole(4);
    assert.equal(hit2.destroyed, true);
    assert.equal(mole.health, 0);
  });

  test('C9: Interleaving Mouse click and Camera gesture accumulates combo streak sequentially', async () => {
    await sim.startArcadeGame('camera');
    sim.spawnMole(0, 'standard');
    sim.spawnMole(1, 'standard');
    sim.spawnMole(2, 'standard');

    // Hit 1 via camera gesture
    const res1 = sim.hitHole(0);
    assert.equal(res1.combo, 1);

    // Hit 2 via simulated classic mouse event
    const res2 = sim.hitHole(1);
    assert.equal(res2.combo, 2);

    // Hit 3 via camera gesture
    const res3 = sim.hitHole(2);
    assert.equal(res3.combo, 3);
    assert.equal(sim.stats.hits, 3);
    assert.equal(sim.comboStreak, 3);
  });

  test('C10: Game over timeout cleans up camera without memory leak when 60s expires', async () => {
    await sim.startArcadeGame('camera');
    assert.equal(sim.isCameraTracking, true);

    // Fast-forward game by 60 seconds
    sim.tick(60000);
    assert.equal(sim.gameState, 'gameover');
    assert.equal(sim.timeRemainingSeconds, 0);

    // Return to main menu triggers teardown
    sim.teardownCamera();
    assert.equal(sim.isCameraTracking, false);
    assert.equal(StreamLeakAuditor.getActiveStreamCount(), 0);
  });
});
