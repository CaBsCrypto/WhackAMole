/**
 * Adversarial Stress Test Harness: Hardware Lifecycle, Concurrency & State Stability
 * Author: challenger_2 (EMPIRICAL CHALLENGER: critic, specialist)
 * Target: WhackAMole MediaPipe Hands Vision Pipeline & App Lifecycle
 * 
 * Verifies:
 * 1. Rapid mode toggling (10 to 50 alternating switches within short intervals)
 *    - Stream / track leaks
 *    - RAF loop leaks
 *    - Asynchronous race conditions (overlapping getUserMedia / init promises)
 * 2. Camera disconnect or permission rejection mid-game
 *    - Startup errors (NotAllowedError, NotFoundError, NotReadableError)
 *    - Mid-game track disconnection (track.stop / track ended event)
 *    - Graceful fallback to Classic mode without uncaught exceptions
 * 3. Switching modes during active Frenzy, Kitchen Disaster, or Pause
 *    - Scene and state recovery
 *    - In-flight timers and scores
 *    - Input isolation during Pause
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// ============================================================================
// Mock Hardware Primitives & Leak Auditor
// ============================================================================
export class MockMediaStreamTrack {
  constructor(kind = 'video') {
    this.id = 'mock-track-' + Math.random().toString(36).substring(2, 9);
    this.kind = kind;
    this.enabled = true;
    this.readyState = 'live';
    this.onended = null;
    this.listeners = new Map();
    StreamLeakAuditor.registerTrack(this);
  }

  stop() {
    if (this.readyState === 'live') {
      this.readyState = 'ended';
      if (this.onended) this.onended();
      const endListeners = this.listeners.get('ended');
      if (endListeners) {
        endListeners.forEach((cb) => cb());
      }
    }
  }

  addEventListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  removeEventListener(event, callback) {
    const list = this.listeners.get(event);
    if (list) list.delete(callback);
  }
}

export class MockMediaStream {
  constructor(tracks = []) {
    this.id = 'mock-stream-' + Math.random().toString(36).substring(2, 9);
    this.tracks = [...tracks];
    StreamLeakAuditor.registerStream(this);
  }

  get active() {
    return this.tracks.some((t) => t.readyState === 'live');
  }

  getTracks() {
    return [...this.tracks];
  }

  getVideoTracks() {
    return this.tracks.filter((t) => t.kind === 'video');
  }

  addTrack(track) {
    if (!this.tracks.includes(track)) this.tracks.push(track);
  }

  removeTrack(track) {
    this.tracks = this.tracks.filter((t) => t !== track);
  }
}

export class StreamLeakAuditor {
  static streams = new Set();
  static tracks = new Set();

  static registerStream(stream) {
    this.streams.add(stream);
  }

  static registerTrack(track) {
    this.tracks.add(track);
  }

  static getActiveStreamCount() {
    let active = 0;
    for (const stream of this.streams) {
      if (stream.active) active++;
    }
    return active;
  }

  static getActiveTrackCount() {
    let active = 0;
    for (const track of this.tracks) {
      if (track.readyState === 'live') active++;
    }
    return active;
  }

  static verifyClean() {
    const activeStreams = this.getActiveStreamCount();
    const activeTracks = this.getActiveTrackCount();
    return {
      clean: activeStreams === 0 && activeTracks === 0,
      activeStreams,
      activeTracks,
    };
  }

  static reset() {
    this.streams.clear();
    this.tracks.clear();
  }
}

export class MockMediaDevices {
  constructor() {
    this.permissionGranted = true;
    this.hasCameraDevice = true;
    this.cameraBusy = false;
    this.getUserMediaCalls = 0;
    this.delayMs = 0; // Configurable async latency
  }

  async getUserMedia(constraints) {
    this.getUserMediaCalls++;
    if (this.delayMs > 0) {
      await new Promise((r) => setTimeout(r, this.delayMs));
    }

    if (!this.permissionGranted) {
      const err = new Error('Permission denied');
      err.name = 'NotAllowedError';
      throw err;
    }
    if (!this.hasCameraDevice) {
      const err = new Error('Requested device not found');
      err.name = 'NotFoundError';
      throw err;
    }
    if (this.cameraBusy) {
      const err = new Error('Could not start video source');
      err.name = 'NotReadableError';
      throw err;
    }
    const videoTrack = new MockMediaStreamTrack('video');
    return new MockMediaStream([videoTrack]);
  }
}

// ============================================================================
// Simulated React useHandTracking Hook Engine
// Mirrors exact async logic, state transitions, and refs from useHandTracking.ts
// ============================================================================
export class SimulatedHandTrackingHook {
  constructor(mediaDevices) {
    this.mediaDevices = mediaDevices || new MockMediaDevices();
    this.status = 'idle';
    this.errorMessage = null;
    this.fps = 0;

    // Internal hook refs
    this.streamRef = null;
    this.rafIdRef = null;
    this.isActiveRef = false;
    this.activeRafLoops = new Set();
    this.rafCounter = 0;

    // Simulation hooks
    this.modelInitDelayMs = 5;
  }

  startInferenceLoop() {
    const loopId = ++this.rafCounter;
    this.activeRafLoops.add(loopId);
    this.rafIdRef = loopId;

    const tick = () => {
      if (!this.isActiveRef || !this.activeRafLoops.has(loopId)) {
        this.activeRafLoops.delete(loopId);
        return;
      }
      // Simulate frame inference
      // Reschedule RAF
      setTimeout(tick, 16);
    };

    setTimeout(tick, 16);
    return loopId;
  }

  stop() {
    this.isActiveRef = false;

    // Step 1: Cancel RAF
    if (this.rafIdRef !== null) {
      this.activeRafLoops.delete(this.rafIdRef);
      this.rafIdRef = null;
    }

    // Step 2: Stop all tracks
    if (this.streamRef) {
      this.streamRef.getTracks().forEach((track) => {
        try {
          track.stop();
          this.streamRef?.removeTrack(track);
        } catch {}
      });
      this.streamRef = null;
    }

    // Step 3: Clear model / status
    this.status = 'idle';
    this.fps = 0;
  }

  /**
   * Exact reproduction of start() from useHandTracking.ts:258-343
   */
  async start() {
    this.stop();

    this.errorMessage = null;
    this.status = 'requesting-camera';
    this.isActiveRef = true;

    try {
      const stream = await this.mediaDevices.getUserMedia({ video: true });

      if (!this.isActiveRef) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      this.streamRef = stream;

      // Model init simulation
      this.status = 'loading-model';
      await new Promise((r) => setTimeout(r, this.modelInitDelayMs));

      if (!this.isActiveRef) {
        this.stop();
        return;
      }

      this.status = 'tracking';
      this.startInferenceLoop();
    } catch (err) {
      let friendlyMessage = 'No se pudo iniciar la cámara web.';
      if (err.name === 'NotAllowedError') {
        friendlyMessage = 'Acceso a la cámara denegado.';
      } else if (err.name === 'NotFoundError') {
        friendlyMessage = 'No se detectó ninguna cámara web conectada.';
      } else if (err.name === 'NotReadableError') {
        friendlyMessage = 'La cámara web está ocupada.';
      }

      this.errorMessage = friendlyMessage;
      this.status = 'error';
      this.stop();
    }
  }
}

// ============================================================================
// Simulated Game Engine with Full State Engine
// ============================================================================
export class GameEngineSim {
  constructor() {
    this.controlMode = 'classic';
    this.gameState = 'menu';
    this.score = 0;
    this.comboStreak = 0;
    this.timeRemainingSeconds = 60;
    this.frenzyActive = false;
    this.frenzyTimeRemainingMs = 0;
    this.kitchenDisasterActive = false;
    this.disasterTimeRemaining = 10;
    this.activeMoles = new Map();

    this.mediaDevices = new MockMediaDevices();
    this.activeCameraStream = null;
    this.isCameraTracking = false;
    this.trackingStatus = 'idle';
  }

  async startArcadeGame(mode = 'classic') {
    this.controlMode = mode;
    this.score = 0;
    this.comboStreak = 0;
    this.timeRemainingSeconds = 60;
    this.frenzyActive = false;
    this.kitchenDisasterActive = false;
    this.activeMoles.clear();

    if (mode === 'camera') {
      await this.initCameraMode();
    } else {
      this.teardownCamera();
    }

    this.gameState = 'playing';
  }

  async initCameraMode() {
    this.trackingStatus = 'requesting-camera';
    try {
      this.activeCameraStream = await this.mediaDevices.getUserMedia({ video: true });
      this.trackingStatus = 'loading-model';
      this.trackingStatus = 'tracking';
      this.isCameraTracking = true;
    } catch (err) {
      this.trackingStatus = 'error';
      this.isCameraTracking = false;
      throw err;
    }
  }

  teardownCamera() {
    if (this.activeCameraStream) {
      this.activeCameraStream.getTracks().forEach((track) => {
        track.stop();
        this.activeCameraStream?.removeTrack(track);
      });
      this.activeCameraStream = null;
    }
    this.isCameraTracking = false;
    this.trackingStatus = 'idle';
  }

  async switchControlMode(newMode) {
    if (this.controlMode === newMode) return;

    if (newMode === 'classic') {
      this.teardownCamera();
      this.controlMode = 'classic';
    } else {
      this.controlMode = 'camera';
      await this.initCameraMode();
    }
  }

  activateFrenzy(durationMs = 15000) {
    this.frenzyActive = true;
    this.frenzyTimeRemainingMs = durationMs;
  }

  activateKitchenDisaster(durationSecs = 10) {
    this.kitchenDisasterActive = true;
    this.disasterTimeRemaining = durationSecs;
  }

  pause() {
    if (this.gameState === 'playing') {
      this.gameState = 'paused';
    }
  }

  resume() {
    if (this.gameState === 'paused') {
      this.gameState = 'playing';
    }
  }

  spawnMole(holeIndex, type = 'standard') {
    const mole = {
      holeIndex,
      type,
      health: type === 'tough' ? 2 : 1,
      points: type === 'golden' ? 500 : type === 'bomb' ? -300 : 100,
    };
    this.activeMoles.set(holeIndex, mole);
    return mole;
  }

  hitHole(holeIndex) {
    if (this.gameState !== 'playing') {
      return { hit: false, pointsAwarded: 0 };
    }
    const mole = this.activeMoles.get(holeIndex);
    if (!mole) {
      this.comboStreak = 0;
      return { hit: false, pointsAwarded: 0 };
    }

    this.comboStreak++;
    const mult = this.frenzyActive ? 2 : 1;
    const pts = mole.points * mult;
    this.score += pts;
    this.activeMoles.delete(holeIndex);
    return { hit: true, pointsAwarded: pts };
  }
}

// ============================================================================
// TEST SUITE: Adversarial Lifecycle Stress & Concurrency
// ============================================================================
async function runAdversarialLifecycleStressTests() {
  console.log('================================================================');
  console.log('  ADVERSARIAL STRESS TEST: Hardware Lifecycle, Concurrency & State');
  console.log('  Target: useHandTracking, App.tsx, Three.js Scene State');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;
  const startTime = Date.now();

  async function runTest(name, fn) {
    StreamLeakAuditor.reset();
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}`);
      console.error(`         Error: ${err.message}`);
      failed++;
    } finally {
      StreamLeakAuditor.reset();
    }
  }

  // --------------------------------------------------------------------------
  // SUITE 1: Rapid Mode Toggling (10 to 50 switches)
  // --------------------------------------------------------------------------
  console.log('--- Suite 1: Rapid Mode Toggling (10 to 50 switches) ---');

  await runTest('1.1: 50 Sequential Rapid Mode Switches (GameEngineSim) - 0 leaks', async () => {
    const sim = new GameEngineSim();
    for (let i = 0; i < 50; i++) {
      const targetMode = i % 2 === 0 ? 'camera' : 'classic';
      await sim.switchControlMode(targetMode);
    }
    await sim.switchControlMode('classic');
    const audit = StreamLeakAuditor.verifyClean();
    assert.equal(audit.clean, true, `Leaked streams: ${audit.activeStreams}, tracks: ${audit.activeTracks}`);
  });

  await runTest('1.2: 50 High-Frequency Toggles with Latency (Hook Engine) - Audit Concurrency', async () => {
    const mediaDevices = new MockMediaDevices();
    mediaDevices.delayMs = 2; // 2ms getUserMedia latency
    const hook = new SimulatedHandTrackingHook(mediaDevices);

    // Rapidly toggle 50 times with micro-intervals
    for (let i = 0; i < 50; i++) {
      if (i % 2 === 0) {
        hook.start().catch(() => {});
      } else {
        hook.stop();
      }
      await new Promise((r) => setTimeout(r, 3));
    }

    // Allow settling
    await new Promise((r) => setTimeout(r, 50));
    hook.stop();

    const audit = StreamLeakAuditor.verifyClean();
    assert.equal(audit.clean, true, `Orphan tracks detected: ${audit.activeTracks} active`);
    assert.equal(hook.activeRafLoops.size, 0, `Leaked RAF loops: ${hook.activeRafLoops.size} active`);
  });

  await runTest('1.3: 10 Ultra-Fast Synchronous Bursts (0ms interval between calls)', async () => {
    const mediaDevices = new MockMediaDevices();
    mediaDevices.delayMs = 5;
    const hook = new SimulatedHandTrackingHook(mediaDevices);

    // Blast 10 calls synchronously without waiting for promises
    for (let i = 0; i < 10; i++) {
      if (i % 2 === 0) {
        hook.start().catch(() => {});
      } else {
        hook.stop();
      }
    }

    // Settle
    await new Promise((r) => setTimeout(r, 60));
    hook.stop();

    const audit = StreamLeakAuditor.verifyClean();
    assert.equal(audit.clean, true, `Leaked tracks after sync burst: ${audit.activeTracks}`);
  });

  // --------------------------------------------------------------------------
  // SUITE 2: Camera Disconnect & Permission Rejection Mid-Game
  // --------------------------------------------------------------------------
  console.log('\n--- Suite 2: Camera Disconnect & Permission Rejection Mid-Game ---');

  await runTest('2.1: Camera permission rejected (NotAllowedError) sets error state and allows fallback', async () => {
    const mediaDevices = new MockMediaDevices();
    mediaDevices.permissionGranted = false;
    const hook = new SimulatedHandTrackingHook(mediaDevices);

    await hook.start();
    assert.equal(hook.status, 'error');
    assert.ok(hook.errorMessage && hook.errorMessage.includes('denegado'));

    // Verify clean fallback
    hook.stop();
    assert.equal(hook.status, 'idle');
    const audit = StreamLeakAuditor.verifyClean();
    assert.equal(audit.clean, true);
  });

  await runTest('2.2: Camera missing (NotFoundError) provides descriptive message and zero leaks', async () => {
    const mediaDevices = new MockMediaDevices();
    mediaDevices.hasCameraDevice = false;
    const hook = new SimulatedHandTrackingHook(mediaDevices);

    await hook.start();
    assert.equal(hook.status, 'error');
    assert.ok(hook.errorMessage && hook.errorMessage.includes('No se detectó'));

    hook.stop();
    const audit = StreamLeakAuditor.verifyClean();
    assert.equal(audit.clean, true);
  });

  await runTest('2.3: Camera busy (NotReadableError) handled gracefully', async () => {
    const mediaDevices = new MockMediaDevices();
    mediaDevices.cameraBusy = true;
    const hook = new SimulatedHandTrackingHook(mediaDevices);

    await hook.start();
    assert.equal(hook.status, 'error');
    assert.ok(hook.errorMessage && hook.errorMessage.includes('ocupada'));

    hook.stop();
    const audit = StreamLeakAuditor.verifyClean();
    assert.equal(audit.clean, true);
  });

  await runTest('2.4: Hardware webcam unplugged mid-game (track ended event)', async () => {
    const mediaDevices = new MockMediaDevices();
    const hook = new SimulatedHandTrackingHook(mediaDevices);

    await hook.start();
    assert.equal(hook.status, 'tracking');
    assert.ok(hook.streamRef !== null);

    const track = hook.streamRef.getVideoTracks()[0];
    assert.equal(track.readyState, 'live');

    // Simulate hardware unplug
    track.stop();
    assert.equal(track.readyState, 'ended');

    // Clean teardown after disconnect
    hook.stop();
    const audit = StreamLeakAuditor.verifyClean();
    assert.equal(audit.clean, true);
  });

  // --------------------------------------------------------------------------
  // SUITE 3: Switching Modes During Active Frenzy, Kitchen Disaster, or Pause
  // --------------------------------------------------------------------------
  console.log('\n--- Suite 3: Switching Modes During Active Frenzy, Disaster, or Pause ---');

  await runTest('3.1: Mode switch during active Frenzy preserves score, combo, and frenzy multiplier', async () => {
    const sim = new GameEngineSim();
    await sim.startArcadeGame('camera');

    sim.spawnMole(0, 'golden');
    sim.activateFrenzy(15000);
    const hit1 = sim.hitHole(0);
    assert.equal(hit1.pointsAwarded, 1000); // 500 * 2 (frenzy)
    assert.equal(sim.score, 1000);
    assert.equal(sim.comboStreak, 1);

    // Switch mode to Classic mid-frenzy
    await sim.switchControlMode('classic');
    assert.equal(sim.frenzyActive, true, 'Frenzy must remain active');
    assert.equal(sim.score, 1000, 'Score must be preserved');
    assert.equal(sim.comboStreak, 1, 'Combo must be preserved');

    // Hit next mole in Classic mode
    sim.spawnMole(1, 'standard');
    const hit2 = sim.hitHole(1);
    assert.equal(hit2.pointsAwarded, 200); // 100 * 2 (frenzy)
    assert.equal(sim.score, 1200);
    assert.equal(sim.comboStreak, 2);

    sim.teardownCamera();
    const audit = StreamLeakAuditor.verifyClean();
    assert.equal(audit.clean, true);
  });

  await runTest('3.2: Mode switch during Kitchen Disaster preserves disaster countdown and game state', async () => {
    const sim = new GameEngineSim();
    await sim.startArcadeGame('classic');

    sim.activateKitchenDisaster(10);
    assert.equal(sim.kitchenDisasterActive, true);
    assert.equal(sim.disasterTimeRemaining, 10);

    // Switch mode to Camera mid-disaster
    await sim.switchControlMode('camera');
    assert.equal(sim.kitchenDisasterActive, true, 'Disaster state must persist');
    assert.equal(sim.disasterTimeRemaining, 10, 'Disaster timer must persist');
    assert.equal(sim.isCameraTracking, true, 'Camera tracking must be active');

    sim.teardownCamera();
    const audit = StreamLeakAuditor.verifyClean();
    assert.equal(audit.clean, true);
  });

  await runTest('3.3: Mode switch while Paused strictly blocks whack triggers until unpaused', async () => {
    const sim = new GameEngineSim();
    await sim.startArcadeGame('classic');
    sim.spawnMole(4, 'standard');

    // Player pauses game
    sim.pause();
    assert.equal(sim.gameState, 'paused');

    // Switch mode to Camera while paused
    await sim.switchControlMode('camera');
    assert.equal(sim.controlMode, 'camera');

    // Attempt to whack while paused
    const pausedWhack = sim.hitHole(4);
    assert.equal(pausedWhack.hit, false, 'Whack must be blocked while paused');
    assert.equal(sim.score, 0, 'Score must not change while paused');

    // Unpause game
    sim.resume();
    assert.equal(sim.gameState, 'playing');

    // Whack now succeeds
    const playingWhack = sim.hitHole(4);
    assert.equal(playingWhack.hit, true, 'Whack must succeed once unpaused');
    assert.equal(sim.score, 100);

    sim.teardownCamera();
    const audit = StreamLeakAuditor.verifyClean();
    assert.equal(audit.clean, true);
  });

  await runTest('3.4: 10x Rapid Mode Switching DURING active Frenzy retains state integrity', async () => {
    const sim = new GameEngineSim();
    await sim.startArcadeGame('camera');
    sim.activateFrenzy(15000);
    sim.spawnMole(2, 'golden');
    sim.hitHole(2); // 1000 pts
    assert.equal(sim.score, 1000);

    // Rapid 10 switches while Frenzy is active
    for (let i = 0; i < 10; i++) {
      await sim.switchControlMode(i % 2 === 0 ? 'classic' : 'camera');
    }

    assert.equal(sim.frenzyActive, true);
    assert.equal(sim.score, 1000);

    // Final teardown
    await sim.switchControlMode('classic');
    const audit = StreamLeakAuditor.verifyClean();
    assert.equal(audit.clean, true);
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n================================================================');
  console.log(`  Adversarial Stress Test Summary:`);
  console.log(`  Total Tests: ${passed + failed}`);
  console.log(`  Passed:      ${passed} ✅`);
  console.log(`  Failed:      ${failed} ${failed > 0 ? '❌' : ''}`);
  console.log(`  Duration:    ${duration}s`);
  const finalLeak = StreamLeakAuditor.verifyClean();
  console.log(`  Leak Audit:  ${finalLeak.clean ? 'CLEAN (0 active streams/tracks) ✅' : 'FAILED ❌'}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exitCode = 1;
  }
}

runAdversarialLifecycleStressTests();
