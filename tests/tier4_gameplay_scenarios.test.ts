/**
 * Tier 4: Real-World Gameplay Scenarios Test Suite
 * End-to-end full game workload simulations:
 * - Scenario 1: Complete 60-Second Camera Mode Arcade Match
 * - Scenario 2: Tactical Bomb Avoidance & Golden Mole Sniping
 * - Scenario 3: 15-Second Frenzy Mode Blitz
 * - Scenario 4: Mid-Game Hardware Disconnect & Retry Recovery
 * - Scenario 5: Multi-Game Lifecycle Stream Leak Invariant Audit
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { MockMediaDevices, MockMediaStream, StreamLeakAuditor } from './harness/mockMediaStream';
import { LandmarkSynthesizer } from './harness/landmarkSynthesizer';
import { CoordinateEngine } from './harness/coordinateEngine';
import { GestureClassifier } from './harness/gestureClassifier';
import { GameEngineSim } from './harness/gameEngineSim';

describe('Tier 4: Real-World Gameplay Scenarios', () => {
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

  test('Scenario 1: Complete 60-second game simulation in Camera Mode with combo streaks', async () => {
    // 1. Start Arcade match in Camera Mode
    await sim.startArcadeGame('camera');
    assert.equal(sim.gameState, 'playing');
    assert.equal(sim.controlMode, 'camera');
    assert.equal(sim.timeRemainingSeconds, 60);

    let simulatedTimeMs = 0;
    const fistLm = LandmarkSynthesizer.createClosedFist({ x: 0.5, y: 0.5, z: 0 }, 0.2);
    const openLm = LandmarkSynthesizer.createOpenPalm({ x: 0.5, y: 0.5, z: 0 }, 0.2);

    // 2. Play through 60 seconds in discrete steps
    // Spawn a mole every 2 seconds, move hand, whack mole, uncurl hand
    for (let round = 0; round < 25; round++) {
      const targetHole = round % 9;
      sim.spawnMole(targetHole, 'standard', 1500);

      // Advance time by 800ms
      sim.tick(800);
      simulatedTimeMs += 800;

      // Strike mole with fist
      const whackRes = classifier.evaluateFrame(fistLm, simulatedTimeMs);
      if (whackRes.isWhacking) {
        sim.hitHole(targetHole);
      }

      // Advance time by 300ms (satisfies 260ms cooldown)
      sim.tick(300);
      simulatedTimeMs += 300;

      // Uncurl hand to satisfy mandatory release requirement
      classifier.evaluateFrame(openLm, simulatedTimeMs);

      // Advance remaining round time (900ms)
      sim.tick(900);
      simulatedTimeMs += 900;
    }

    // Ensure game reaches gameover
    if (sim.timeRemainingSeconds > 0) {
      sim.tick(sim.timeRemainingSeconds * 1000);
    }

    assert.equal(sim.gameState, 'gameover');
    assert.equal(sim.timeRemainingSeconds, 0);
    assert.ok(sim.stats.hits >= 20, `Expected at least 20 hits, got ${sim.stats.hits}`);
    assert.ok(sim.stats.maxCombo >= 10, `Expected high combo streak, got ${sim.stats.maxCombo}`);
    assert.ok(sim.score >= 3000, `Expected score >= 3000, got ${sim.score}`);

    // Return to main menu and verify clean teardown
    sim.teardownCamera();
    assert.equal(StreamLeakAuditor.getActiveStreamCount(), 0);
    assert.equal(StreamLeakAuditor.getActiveTrackCount(), 0);
  });

  test('Scenario 2: Bomb Mole Avoidance & Golden Mole Pursuit', async () => {
    await sim.startArcadeGame('camera');

    // Spawn bomb at hole 4 (center) and golden mole at hole 2 (top right)
    sim.spawnMole(4, 'bomb', 1200);
    sim.spawnMole(2, 'golden', 1200);

    // Player spots bomb and steers hand away towards hole 2
    const targetCoords = CoordinateEngine.getHoleTargetCameraCoords(2);
    const pinchLm = LandmarkSynthesizer.createPinch(
      { x: targetCoords.x, y: targetCoords.y, z: 0 },
      0.2,
      0.12
    );

    // Whack golden mole
    const whackRes = classifier.evaluateFrame(pinchLm, 1000);
    assert.equal(whackRes.isWhacking, true);

    const norm = CoordinateEngine.toNormalizedCoords(targetCoords.x, targetCoords.y);
    const ndc = CoordinateEngine.toNDCCoords(norm.x, norm.y);
    const hitGround = CoordinateEngine.raycastToGround(ndc.x, ndc.y);
    const closest = CoordinateEngine.findClosestHole(hitGround);

    assert.ok(closest !== null);
    assert.equal(closest.holeIndex, 2);

    const hitResult = sim.hitHole(closest.holeIndex);
    assert.equal(hitResult.hit, true);
    assert.equal(hitResult.moleType, 'golden');
    assert.ok(hitResult.pointsAwarded >= 500);

    // Let 1500ms pass so bomb mole naturally expires
    sim.tick(1500);

    // Verify bomb was NEVER detonated
    assert.equal(sim.stats.bombsHit, 0);
    assert.equal(sim.stats.goldenHit, 1);
    assert.ok(sim.score >= 500);
    assert.equal(sim.activeMoles.has(4), false, 'Bomb mole should have expired naturally');
  });

  test('Scenario 3: 15-Second Frenzy Mode Blitz across all 9 holes', async () => {
    await sim.startArcadeGame('camera');
    sim.activateFrenzy(15000);

    assert.equal(sim.frenzyActive, true);
    assert.equal(sim.activeMoles.size, 9);

    let simTime = 1000;
    const fistLm = LandmarkSynthesizer.createClosedFist({ x: 0.5, y: 0.5, z: 0 }, 0.2);
    const openLm = LandmarkSynthesizer.createOpenPalm({ x: 0.5, y: 0.5, z: 0 }, 0.2);

    // Rapidly clear holes 0 through 8 in sequence adhering to 260ms cooldown
    for (let hole = 0; hole < 9; hole++) {
      // Whack
      const whack = classifier.evaluateFrame(fistLm, simTime);
      assert.equal(whack.isWhacking, true);
      const hitRes = sim.hitHole(hole);
      assert.equal(hitRes.hit, true);

      // Wait 280ms (satisfies 260ms cooldown)
      simTime += 280;
      sim.tick(280);

      // Release
      classifier.evaluateFrame(openLm, simTime);
      simTime += 50;
      sim.tick(50);
    }

    assert.equal(sim.stats.hits, 9);
    assert.equal(sim.comboStreak, 9);
    // In frenzy mode, score is doubled!
    assert.ok(sim.score >= 1800, `Expected frenzy score >= 1800, got ${sim.score}`);
  });

  test('Scenario 4: Mid-Game Hardware Disconnect & Retry Recovery', async () => {
    await sim.startArcadeGame('camera');
    sim.spawnMole(1, 'standard');
    sim.hitHole(1);
    const scoreBeforeDisconnect = sim.score;

    // Fast forward to second 25
    sim.tick(25000);
    assert.equal(sim.timeRemainingSeconds, 35);

    // Camera disconnects (track ended event)
    sim.activeCameraStream!.getVideoTracks()[0].stop();
    sim.isCameraTracking = false;
    sim.trackingStatus = 'error';

    // Game is alerted, camera tracking lost
    assert.equal(sim.isCameraTracking, false);
    assert.equal(sim.trackingStatus, 'error');

    // Player clicks "Retry / Reintentar Cámara"
    await sim.initCameraMode();
    assert.equal(sim.isCameraTracking, true);
    assert.equal(sim.trackingStatus, 'tracking');

    // Continue match to completion
    sim.tick(35000);
    assert.equal(sim.gameState, 'gameover');
    assert.equal(sim.score, scoreBeforeDisconnect);
  });

  test('Scenario 5: Multi-Game Lifecycle Stream Leak Invariant Audit', async () => {
    // Audit 5 consecutive game start/stop/mode-switch lifecycles
    for (let cycle = 1; cycle <= 5; cycle++) {
      if (cycle % 2 === 1) {
        // Classic game cycle
        await sim.startArcadeGame('classic');
        sim.tick(1000);
        sim.teardownCamera();
      } else {
        // Camera game cycle
        await sim.startArcadeGame('camera');
        assert.equal(StreamLeakAuditor.getActiveStreamCount(), 1);
        sim.tick(2000);
        // Switch to classic mid-game
        await sim.switchControlMode('classic');
        assert.equal(StreamLeakAuditor.getActiveStreamCount(), 0);
      }
    }

    // Comprehensive final verification: Zero leaks across all streams and tracks
    const audit = StreamLeakAuditor.verifyClean();
    assert.equal(audit.clean, true, 'All hardware streams and tracks must be completely freed');
    assert.equal(audit.activeStreams, 0);
    assert.equal(audit.activeTracks, 0);
  });
});
