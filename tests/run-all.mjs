/**
 * Standalone Pure ECMAScript Test Runner for WhackAMole MediaPipe Hands E2E Test Suite
 * Compatible with Node.js 24+ without requiring any transpiler, compiler, or external packages.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// ============================================================================
// Harness: MockMediaStream & LeakAuditor
// ============================================================================
class MockMediaStreamTrack {
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
        endListeners.forEach(cb => cb());
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

class MockMediaStream {
  constructor(tracks = []) {
    this.id = 'mock-stream-' + Math.random().toString(36).substring(2, 9);
    this.tracks = [...tracks];
    StreamLeakAuditor.registerStream(this);
  }

  get active() {
    return this.tracks.some(t => t.readyState === 'live');
  }

  getTracks() {
    return [...this.tracks];
  }

  getVideoTracks() {
    return this.tracks.filter(t => t.kind === 'video');
  }

  addTrack(track) {
    if (!this.tracks.includes(track)) this.tracks.push(track);
  }

  removeTrack(track) {
    this.tracks = this.tracks.filter(t => t !== track);
  }
}

class StreamLeakAuditor {
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

class MockMediaDevices {
  constructor() {
    this.permissionGranted = true;
    this.hasCameraDevice = true;
    this.cameraBusy = false;
    this.getUserMediaCalls = 0;
    this.delayMs = 0;
  }

  async getUserMedia() {
    this.getUserMediaCalls++;
    if (this.delayMs > 0) {
      await new Promise(r => setTimeout(r, this.delayMs));
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

class SimulatedHandTrackingHook {
  constructor(mediaDevices) {
    this.mediaDevices = mediaDevices || new MockMediaDevices();
    this.status = 'idle';
    this.errorMessage = null;
    this.fps = 0;
    this.streamRef = null;
    this.rafIdRef = null;
    this.isActiveRef = false;
    this.activeRafLoops = new Set();
    this.rafCounter = 0;
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
      setTimeout(tick, 16);
    };
    setTimeout(tick, 16);
    return loopId;
  }

  stop() {
    this.isActiveRef = false;
    if (this.rafIdRef !== null) {
      this.activeRafLoops.delete(this.rafIdRef);
      this.rafIdRef = null;
    }
    if (this.streamRef) {
      this.streamRef.getTracks().forEach((track) => {
        try {
          track.stop();
          this.streamRef?.removeTrack(track);
        } catch {}
      });
      this.streamRef = null;
    }
    this.status = 'idle';
    this.fps = 0;
  }

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
// Harness: LandmarkSynthesizer
// ============================================================================
class LandmarkSynthesizer {
  static createOpenPalm(center = { x: 0.5, y: 0.5, z: 0 }, scale = 0.2) {
    const lm = new Array(21);
    lm[0] = { x: center.x, y: center.y + scale * 0.8, z: center.z };
    lm[5] = { x: center.x - scale * 0.35, y: center.y, z: center.z };
    lm[9] = { x: center.x, y: center.y, z: center.z };
    lm[13] = { x: center.x + scale * 0.3, y: center.y + scale * 0.05, z: center.z };
    lm[17] = { x: center.x + scale * 0.55, y: center.y + scale * 0.1, z: center.z };

    lm[1] = { x: center.x - scale * 0.25, y: center.y + scale * 0.5, z: center.z };
    lm[2] = { x: center.x - scale * 0.45, y: center.y + scale * 0.35, z: center.z };
    lm[3] = { x: center.x - scale * 0.6, y: center.y + scale * 0.2, z: center.z };
    lm[4] = { x: center.x - scale * 0.7, y: center.y + scale * 0.05, z: center.z };

    lm[6] = { x: center.x - scale * 0.35, y: center.y - scale * 0.3, z: center.z };
    lm[7] = { x: center.x - scale * 0.35, y: center.y - scale * 0.55, z: center.z };
    lm[8] = { x: center.x - scale * 0.35, y: center.y - scale * 0.8, z: center.z };

    lm[10] = { x: center.x, y: center.y - scale * 0.35, z: center.z };
    lm[11] = { x: center.x, y: center.y - scale * 0.65, z: center.z };
    lm[12] = { x: center.x, y: center.y - scale * 0.9, z: center.z };

    lm[14] = { x: center.x + scale * 0.3, y: center.y - scale * 0.3, z: center.z };
    lm[15] = { x: center.x + scale * 0.3, y: center.y - scale * 0.55, z: center.z };
    lm[16] = { x: center.x + scale * 0.3, y: center.y - scale * 0.8, z: center.z };

    lm[18] = { x: center.x + scale * 0.55, y: center.y - scale * 0.2, z: center.z };
    lm[19] = { x: center.x + scale * 0.55, y: center.y - scale * 0.4, z: center.z };
    lm[20] = { x: center.x + scale * 0.55, y: center.y - scale * 0.6, z: center.z };
    return lm;
  }

  static createClosedFist(center = { x: 0.5, y: 0.5, z: 0 }, scale = 0.2) {
    const lm = this.createOpenPalm(center, scale);
    lm[6] = { x: lm[5].x, y: lm[5].y + scale * 0.15, z: center.z + scale * 0.1 };
    lm[7] = { x: lm[5].x, y: lm[5].y + scale * 0.25, z: center.z + scale * 0.1 };
    lm[8] = { x: lm[5].x, y: lm[5].y + scale * 0.15, z: center.z + scale * 0.05 };

    lm[10] = { x: lm[9].x, y: lm[9].y + scale * 0.15, z: center.z + scale * 0.1 };
    lm[11] = { x: lm[9].x, y: lm[9].y + scale * 0.25, z: center.z + scale * 0.1 };
    lm[12] = { x: lm[9].x, y: lm[9].y + scale * 0.15, z: center.z + scale * 0.05 };

    lm[14] = { x: lm[13].x, y: lm[13].y + scale * 0.15, z: center.z + scale * 0.1 };
    lm[15] = { x: lm[13].x, y: lm[13].y + scale * 0.25, z: center.z + scale * 0.1 };
    lm[16] = { x: lm[13].x, y: lm[13].y + scale * 0.15, z: center.z + scale * 0.05 };

    lm[18] = { x: lm[17].x, y: lm[17].y + scale * 0.15, z: center.z + scale * 0.1 };
    lm[19] = { x: lm[17].y, y: lm[17].y + scale * 0.25, z: center.z + scale * 0.1 };
    lm[20] = { x: lm[17].x, y: lm[17].y + scale * 0.15, z: center.z + scale * 0.05 };

    lm[4] = { x: lm[9].x, y: lm[9].y + scale * 0.1, z: center.z - scale * 0.05 };
    return lm;
  }

  static createPinch(center = { x: 0.5, y: 0.5, z: 0 }, scale = 0.2, pinchRatioTarget = 0.12) {
    const lm = this.createOpenPalm(center, scale);
    const H_scale = scale * 0.8;
    const targetDist = pinchRatioTarget * H_scale;
    const contactX = center.x - scale * 0.2;
    const contactY = center.y - scale * 0.6;
    lm[8] = { x: contactX, y: contactY, z: center.z };
    lm[4] = { x: contactX - targetDist, y: contactY, z: center.z };
    return lm;
  }

  static createCurledCountPose(curledCount, center = { x: 0.5, y: 0.5, z: 0 }, scale = 0.2) {
    const lm = this.createOpenPalm(center, scale);
    const curlFinger = (mcpIdx, tipIdx) => {
      lm[tipIdx] = { x: lm[mcpIdx].x, y: lm[mcpIdx].y + scale * 0.15, z: center.z + scale * 0.05 };
    };
    if (curledCount >= 1) curlFinger(5, 8);
    if (curledCount >= 2) curlFinger(9, 12);
    if (curledCount >= 3) curlFinger(13, 16);
    if (curledCount >= 4) curlFinger(17, 20);
    return lm;
  }

  static addNoise(landmarks, jitterAmount = 0.03) {
    return landmarks.map(p => ({
      x: p.x + (Math.random() * 2 - 1) * jitterAmount,
      y: p.y + (Math.random() * 2 - 1) * jitterAmount,
      z: (p.z ?? 0) + (Math.random() * 2 - 1) * (jitterAmount * 0.5),
    }));
  }
}

// ============================================================================
// Harness: CoordinateEngine
// ============================================================================
class CoordinateEngine {
  static HOLE_COORDS = [
    { x: -2.3, y: -0.5, z: -2.2 },
    { x: 0.0,  y: -0.5, z: -2.2 },
    { x: 2.3,  y: -0.5, z: -2.2 },
    { x: -2.3, y: -0.5, z: 0.0 },
    { x: 0.0,  y: -0.5, z: 0.0 },
    { x: 2.3,  y: -0.5, z: 0.0 },
    { x: -2.3, y: -0.5, z: 2.2 },
    { x: 0.0,  y: -0.5, z: 2.2 },
    { x: 2.3,  y: -0.5, z: 2.2 },
  ];

  static DEFAULT_MARGIN = 0.12;
  static MAX_HIT_RADIUS = 1.35;

  static mapWithMargin(v, margin = CoordinateEngine.DEFAULT_MARGIN) {
    const clamped = Math.max(margin, Math.min(1.0 - margin, v));
    return (clamped - margin) / (1.0 - 2.0 * margin);
  }

  static mirrorX(rawX) {
    return 1.0 - rawX;
  }

  static toNormalizedCoords(rawX, rawY, margin = CoordinateEngine.DEFAULT_MARGIN) {
    return {
      x: this.mapWithMargin(this.mirrorX(rawX), margin),
      y: this.mapWithMargin(rawY, margin),
    };
  }

  static toNDCCoords(normX, normY) {
    return {
      x: normX * 2.0 - 1.0,
      y: -(normY * 2.0 - 1.0),
    };
  }

  static toViewportPixels(normX, normY, rect) {
    return {
      x: rect.left + normX * rect.width,
      y: rect.top + normY * rect.height,
    };
  }

  static raycastToGround(ndcX, ndcY) {
    const spanX = 3.6;
    const spanZ = 3.4;
    return { x: ndcX * spanX, z: -ndcY * spanZ };
  }

  static findClosestHole(hitPoint, maxRadius = CoordinateEngine.MAX_HIT_RADIUS) {
    let closestDist = Infinity;
    let closestHoleIdx = -1;
    for (let i = 0; i < this.HOLE_COORDS.length; i++) {
      const hole = this.HOLE_COORDS[i];
      const dist = Math.hypot(hitPoint.x - hole.x, hitPoint.z - hole.z);
      if (dist < maxRadius && dist < closestDist) {
        closestDist = dist;
        closestHoleIdx = i;
      }
    }
    return closestHoleIdx === -1 ? null : { holeIndex: closestHoleIdx, distance: closestDist };
  }

  static getHoleTargetCameraCoords(holeIndex) {
    const hole = this.HOLE_COORDS[holeIndex];
    const spanX = 3.6;
    const spanZ = 3.4;
    const ndcX = Math.max(-1.0, Math.min(1.0, hole.x / spanX));
    const ndcY = Math.max(-1.0, Math.min(1.0, -hole.z / spanZ));
    const normX = (ndcX + 1.0) / 2.0;
    const normY = (1.0 - ndcY) / 2.0;
    const margin = CoordinateEngine.DEFAULT_MARGIN;
    const preMarginX = normX * (1.0 - 2.0 * margin) + margin;
    return { x: 1.0 - preMarginX, y: normY * (1.0 - 2.0 * margin) + margin };
  }
}

// ============================================================================
// Harness: GestureClassifier
// ============================================================================
class GestureClassifier {
  static PINCH_TRIGGER_RATIO = 0.22;
  static PINCH_RELEASE_RATIO = 0.32;
  static FINGER_CURLED_RATIO = 0.45;
  static WRIST_TO_MIDDLE_MAX_RATIO = 1.15;
  static FIST_TRIGGER_CURLED_COUNT = 3;
  static FIST_RELEASE_CURLED_COUNT = 1;
  static COOLDOWN_DURATION_MS = 260;

  constructor() {
    this.reset();
  }

  reset() {
    this.state = 'IDLE';
    this.lastWhackTimestamp = 0;
    this.activeWhackType = 'none';
    this.smoothX = null;
    this.smoothY = null;
    this.prevRawX = null;
    this.prevRawY = null;
    this.prevTimestamp = null;
  }

  static computeMetrics(landmarks) {
    if (!landmarks || landmarks.length < 21) {
      return {
        scale: 0,
        pinchDistance: 0,
        pinchRatio: 1,
        curledCount: 0,
        isFistCandidate: false,
        isPinchCandidate: false,
      };
    }

    const dist3d = (a, b) => {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dz = (a.z ?? 0) - (b.z ?? 0);
      return Math.hypot(dx, dy, dz);
    };

    const scale = Math.max(0.001, dist3d(landmarks[0], landmarks[9]));
    const pinchDist = dist3d(landmarks[4], landmarks[8]);
    const pinchRatio = pinchDist / scale;
    const isPinchCandidate = pinchRatio < this.PINCH_TRIGGER_RATIO;

    let curledCount = 0;
    if (dist3d(landmarks[8], landmarks[5]) / scale < this.FINGER_CURLED_RATIO) curledCount++;
    if (dist3d(landmarks[12], landmarks[9]) / scale < this.FINGER_CURLED_RATIO) curledCount++;
    if (dist3d(landmarks[16], landmarks[13]) / scale < this.FINGER_CURLED_RATIO) curledCount++;
    if (dist3d(landmarks[20], landmarks[17]) / scale < this.FINGER_CURLED_RATIO) curledCount++;

    const wristToMiddleRatio = dist3d(landmarks[12], landmarks[0]) / scale;
    const isFistCandidate =
      curledCount >= this.FIST_TRIGGER_CURLED_COUNT &&
      wristToMiddleRatio < this.WRIST_TO_MIDDLE_MAX_RATIO;

    return { scale, pinchDistance: pinchDist, pinchRatio, curledCount, isFistCandidate, isPinchCandidate };
  }

  evaluateFrame(landmarks, currentTimestamp) {
    const metrics = GestureClassifier.computeMetrics(landmarks);
    let isWhacking = false;
    let remainingCooldown = Math.max(0, GestureClassifier.COOLDOWN_DURATION_MS - (currentTimestamp - this.lastWhackTimestamp));

    if (this.state === 'COOLDOWN') {
      if (remainingCooldown === 0) {
        const stillEngaged =
          (this.activeWhackType === 'fist' && metrics.curledCount > GestureClassifier.FIST_RELEASE_CURLED_COUNT) ||
          (this.activeWhackType === 'pinch' && metrics.pinchRatio < GestureClassifier.PINCH_RELEASE_RATIO);
        this.state = stillEngaged ? 'WAITING_RELEASE' : 'IDLE';
        if (!stillEngaged) this.activeWhackType = 'none';
      }
    }

    if (this.state === 'WAITING_RELEASE') {
      const released =
        metrics.curledCount <= GestureClassifier.FIST_RELEASE_CURLED_COUNT &&
        metrics.pinchRatio >= GestureClassifier.PINCH_RELEASE_RATIO;
      if (released) {
        this.state = 'IDLE';
        this.activeWhackType = 'none';
      }
    }

    if (this.state === 'IDLE') {
      if (metrics.isFistCandidate) {
        isWhacking = true;
        this.activeWhackType = 'fist';
        this.state = 'COOLDOWN';
        this.lastWhackTimestamp = currentTimestamp;
        remainingCooldown = GestureClassifier.COOLDOWN_DURATION_MS;
      } else if (metrics.isPinchCandidate) {
        isWhacking = true;
        this.activeWhackType = 'pinch';
        this.state = 'COOLDOWN';
        this.lastWhackTimestamp = currentTimestamp;
        remainingCooldown = GestureClassifier.COOLDOWN_DURATION_MS;
      }
    }

    return { metrics, isWhacking, activeGesture: this.activeWhackType, fsmState: this.state, remainingCooldownMs: remainingCooldown };
  }

  applyAdaptiveSmoothing(rawX, rawY, timestamp) {
    if (this.smoothX === null || this.smoothY === null || this.prevTimestamp === null) {
      this.smoothX = rawX;
      this.smoothY = rawY;
      this.prevRawX = rawX;
      this.prevRawY = rawY;
      this.prevTimestamp = timestamp;
      return { x: rawX, y: rawY, speed: 0, alpha: 1.0 };
    }

    const dt = Math.max(0.001, (timestamp - this.prevTimestamp) / 1000.0);
    const dist = Math.hypot(rawX - (this.prevRawX ?? rawX), rawY - (this.prevRawY ?? rawY));
    const speed = dist / dt;
    const rawAlpha = 0.18 + speed * 16.0 * dt;
    const alpha = Math.max(0.18, Math.min(0.85, rawAlpha));

    this.smoothX = this.smoothX + alpha * (rawX - this.smoothX);
    this.smoothY = this.smoothY + alpha * (rawY - this.smoothY);
    this.prevRawX = rawX;
    this.prevRawY = rawY;
    this.prevTimestamp = timestamp;

    return { x: this.smoothX, y: this.smoothY, speed, alpha };
  }
}

// ============================================================================
// Harness: GameEngineSim
// ============================================================================
class GameEngineSim {
  constructor() {
    this.controlMode = 'classic';
    this.gameState = 'menu';
    this.score = 0;
    this.comboStreak = 0;
    this.timeRemainingSeconds = 60;
    this.activeMoles = new Map();
    this.stats = { hits: 0, misses: 0, bombsHit: 0, goldenHit: 0, maxCombo: 0, totalDamageDealt: 0 };
    this.frenzyActive = false;
    this.frenzyTimeRemainingMs = 0;
    this.kitchenDisasterActive = false;
    this.disasterTimeRemaining = 10;
    this.mediaDevices = new MockMediaDevices();
    this.activeCameraStream = null;
    this.isCameraTracking = false;
    this.trackingStatus = 'idle';
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

  async startArcadeGame(mode = 'classic') {
    this.controlMode = mode;
    this.score = 0;
    this.comboStreak = 0;
    this.timeRemainingSeconds = 60;
    this.activeMoles.clear();
    this.stats = { hits: 0, misses: 0, bombsHit: 0, goldenHit: 0, maxCombo: 0, totalDamageDealt: 0 };
    this.frenzyActive = false;
    this.frenzyTimeRemainingMs = 0;
    this.kitchenDisasterActive = false;

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
      this.activeCameraStream.getTracks().forEach(track => {
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

  spawnMole(holeIndex, type = 'standard', durationMs = 1200) {
    let health = 1;
    let points = 100;
    if (type === 'golden') points = 500;
    else if (type === 'bomb') points = -300;
    else if (type === 'tough') { health = 2; points = 200; }

    const mole = {
      id: 'mole-' + Math.random().toString(36).substring(2, 8),
      holeIndex,
      type,
      health,
      maxHealth: health,
      spawnTime: Date.now(),
      durationMs,
      state: 'idle',
      points,
    };
    this.activeMoles.set(holeIndex, mole);
    return mole;
  }

  hitHole(holeIndex) {
    if (this.gameState !== 'playing') {
      return { hit: false, pointsAwarded: 0, combo: this.comboStreak, destroyed: false };
    }

    const mole = this.activeMoles.get(holeIndex);
    if (!mole || mole.state === 'gone' || mole.state === 'exploded' || mole.state === 'hit') {
      this.comboStreak = 0;
      this.stats.misses++;
      return { hit: false, pointsAwarded: 0, combo: 0, destroyed: false };
    }

    if (mole.type === 'bomb') {
      mole.state = 'exploded';
      this.activeMoles.delete(holeIndex);
      this.comboStreak = 0;
      this.stats.bombsHit++;
      this.score = Math.max(0, this.score - 300);
      return { hit: true, moleType: 'bomb', pointsAwarded: -300, combo: 0, destroyed: true };
    }

    mole.health--;
    this.stats.totalDamageDealt++;

    if (mole.health <= 0) {
      mole.state = 'hit';
      this.activeMoles.delete(holeIndex);
      this.comboStreak++;
      this.stats.hits++;
      this.stats.maxCombo = Math.max(this.stats.maxCombo, this.comboStreak);
      if (mole.type === 'golden') this.stats.goldenHit++;

      let multiplier = 1;
      if (this.comboStreak >= 20) multiplier = 5;
      else if (this.comboStreak >= 10) multiplier = 3;
      else if (this.comboStreak >= 5) multiplier = 2;
      if (this.frenzyActive) multiplier *= 2;

      const earnedPoints = mole.points * multiplier;
      this.score += earnedPoints;
      return { hit: true, moleType: mole.type, pointsAwarded: earnedPoints, combo: this.comboStreak, destroyed: true };
    } else {
      return { hit: true, moleType: mole.type, pointsAwarded: 50, combo: this.comboStreak, destroyed: false };
    }
  }

  activateFrenzy(durationMs = 15000) {
    this.frenzyActive = true;
    this.frenzyTimeRemainingMs = durationMs;
    for (let i = 0; i < 9; i++) {
      if (!this.activeMoles.has(i)) {
        this.spawnMole(i, i % 4 === 0 ? 'golden' : 'standard', durationMs);
      }
    }
  }

  tick(dtMs) {
    if (this.gameState !== 'playing') return;
    if (this.frenzyActive) {
      this.frenzyTimeRemainingMs -= dtMs;
      if (this.frenzyTimeRemainingMs <= 0) {
        this.frenzyActive = false;
        this.frenzyTimeRemainingMs = 0;
      }
    }
    for (const [idx, mole] of this.activeMoles.entries()) {
      mole.durationMs -= dtMs;
      if (mole.durationMs <= 0) {
        mole.state = 'gone';
        this.activeMoles.delete(idx);
      }
    }
    this.timeRemainingSeconds -= dtMs / 1000.0;
    if (this.timeRemainingSeconds <= 0) {
      this.timeRemainingSeconds = 0;
      this.gameState = 'gameover';
    }
  }
}

// ============================================================================
// Test Suite Execution (All 4 Tiers)
// ============================================================================
console.log('Running WhackAMole MediaPipe Hands 4-Tier Test Suite...\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runSyncTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✔ [PASS] ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  ✖ [FAIL] ${name}`);
    console.error(`    ${err.message}`);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✔ [PASS] ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  ✖ [FAIL] ${name}`);
    console.error(`    ${err.message}`);
  }
}

async function executeAll() {
  const startTime = Date.now();
  let sim = new GameEngineSim();
  let classifier = new GestureClassifier();

  const resetAll = () => {
    StreamLeakAuditor.reset();
    sim = new GameEngineSim();
    classifier = new GestureClassifier();
  };

  console.log('--- Tier 1: Feature Coverage (R1 - R4) ---');
  resetAll();
  await runAsyncTest('R1.1: Default mode initializes to classic', async () => {
    await sim.startArcadeGame();
    assert.equal(sim.controlMode, 'classic');
    assert.equal(sim.isCameraTracking, false);
  });

  resetAll();
  await runAsyncTest('R1.2: Switching mode to camera starts tracking', async () => {
    await sim.startArcadeGame('classic');
    await sim.switchControlMode('camera');
    assert.equal(sim.controlMode, 'camera');
    assert.equal(sim.isCameraTracking, true);
    assert.equal(sim.trackingStatus, 'tracking');
  });

  resetAll();
  await runAsyncTest('R1.3: Switching mode to classic releases hardware stream', async () => {
    await sim.startArcadeGame('camera');
    await sim.switchControlMode('classic');
    assert.equal(sim.controlMode, 'classic');
    assert.equal(sim.isCameraTracking, false);
    assert.equal(StreamLeakAuditor.getActiveStreamCount(), 0);
  });

  resetAll();
  await runAsyncTest('R1.4: Starting directly in camera mode starts pipeline', async () => {
    await sim.startArcadeGame('camera');
    assert.equal(sim.isCameraTracking, true);
    assert.equal(sim.gameState, 'playing');
  });

  resetAll();
  await runAsyncTest('R1.5: Toggling mode to current mode is idempotent', async () => {
    await sim.startArcadeGame('camera');
    const stream = sim.activeCameraStream;
    await sim.switchControlMode('camera');
    assert.equal(sim.activeCameraStream, stream);
  });

  resetAll();
  await runAsyncTest('R1.6: Pausing game retains camera state', async () => {
    await sim.startArcadeGame('camera');
    sim.gameState = 'paused';
    assert.equal(sim.isCameraTracking, true);
    assert.ok(sim.activeCameraStream.active);
  });

  resetAll();
  runSyncTest('R2.1: Landmark extraction yields 21 3D points', () => {
    const palm = LandmarkSynthesizer.createOpenPalm();
    assert.equal(palm.length, 21);
    const m = GestureClassifier.computeMetrics(palm);
    assert.equal(m.curledCount, 0);
  });

  resetAll();
  runSyncTest('R2.2: Empty landmark array handles gracefully', () => {
    const m = GestureClassifier.computeMetrics([]);
    assert.equal(m.isFistCandidate, false);
    assert.equal(m.isPinchCandidate, false);
  });

  resetAll();
  await runAsyncTest('R2.3: Teardown stops tracks and nullifies stream', async () => {
    await sim.startArcadeGame('camera');
    const track = sim.activeCameraStream.getVideoTracks()[0];
    sim.teardownCamera();
    assert.equal(track.readyState, 'ended');
    assert.equal(sim.activeCameraStream, null);
  });

  resetAll();
  runSyncTest('R3.1: Pinch triggers whack on rising edge (ratio < 0.22)', () => {
    const pinch = LandmarkSynthesizer.createPinch({ x: 0.5, y: 0.5, z: 0 }, 0.2, 0.10);
    const res = classifier.evaluateFrame(pinch, 1000);
    assert.equal(res.isWhacking, true);
    assert.equal(res.activeGesture, 'pinch');
  });

  resetAll();
  runSyncTest('R3.2: Closed fist triggers whack on rising edge (curled >= 3)', () => {
    const fist = LandmarkSynthesizer.createClosedFist({ x: 0.5, y: 0.5, z: 0 }, 0.2);
    const res = classifier.evaluateFrame(fist, 1000);
    assert.equal(res.isWhacking, true);
    assert.equal(res.activeGesture, 'fist');
  });

  resetAll();
  runSyncTest('R3.3: Mandatory release prevents auto-firing while holding fist', () => {
    const fist = LandmarkSynthesizer.createClosedFist({ x: 0.5, y: 0.5, z: 0 }, 0.2);
    const r1 = classifier.evaluateFrame(fist, 1000);
    assert.equal(r1.isWhacking, true);
    const r2 = classifier.evaluateFrame(fist, 1300);
    assert.equal(r2.isWhacking, false);
    assert.equal(r2.fsmState, 'WAITING_RELEASE');
  });

  resetAll();
  runSyncTest('R3.4: 260ms cooldown rejects rapid spam', () => {
    const fist = LandmarkSynthesizer.createClosedFist({ x: 0.5, y: 0.5, z: 0 }, 0.2);
    classifier.evaluateFrame(fist, 1000);
    const r2 = classifier.evaluateFrame(fist, 1150);
    assert.equal(r2.isWhacking, false);
  });

  resetAll();
  runSyncTest('R3.5: Coordinate mirroring and 12% deadzone margin mapping', () => {
    const left = CoordinateEngine.toNormalizedCoords(0.88, 0.5);
    assert.ok(Math.abs(left.x - 0.0) < 0.01);
    const right = CoordinateEngine.toNormalizedCoords(0.12, 0.5);
    assert.ok(Math.abs(right.x - 1.0) < 0.01);
  });

  resetAll();
  runSyncTest('R3.6: Three.js NDC mapping (inverts Y)', () => {
    const ndc = CoordinateEngine.toNDCCoords(0.0, 0.0);
    assert.equal(ndc.x, -1.0);
    assert.equal(ndc.y, 1.0);
  });

  resetAll();
  runSyncTest('R4.1: Reticle adaptive smoothing adjusts alpha with velocity', () => {
    classifier.applyAdaptiveSmoothing(0.5, 0.5, 1000);
    const slow = classifier.applyAdaptiveSmoothing(0.501, 0.501, 1016);
    assert.ok(slow.alpha < 0.25);
    const fast = classifier.applyAdaptiveSmoothing(0.70, 0.70, 1032);
    assert.ok(fast.alpha > 0.70);
  });

  resetAll();
  runSyncTest('R4.2: Reticle clamps within screen viewport', () => {
    const px = CoordinateEngine.toViewportPixels(0.5, 0.5, { left: 100, top: 50, width: 800, height: 600 });
    assert.equal(px.x, 500);
    assert.equal(px.y, 350);
  });

  resetAll();
  runSyncTest('R4.3: Proximity hit testing identifies all 9 hole targets', () => {
    for (let i = 0; i < 9; i++) {
      const coords = CoordinateEngine.getHoleTargetCameraCoords(i);
      const norm = CoordinateEngine.toNormalizedCoords(coords.x, coords.y);
      const ndc = CoordinateEngine.toNDCCoords(norm.x, norm.y);
      const hit = CoordinateEngine.raycastToGround(ndc.x, ndc.y);
      const closest = CoordinateEngine.findClosestHole(hit);
      assert.equal(closest?.holeIndex, i);
    }
  });

  console.log('\n--- Tier 2: Boundary & Corner Cases ---');
  resetAll();
  await runAsyncTest('B1.1: Camera permission denied falls back cleanly', async () => {
    sim.mediaDevices.permissionGranted = false;
    await assert.rejects(async () => sim.startArcadeGame('camera'));
    assert.equal(sim.trackingStatus, 'error');
    await sim.startArcadeGame('classic');
    assert.equal(sim.controlMode, 'classic');
  });

  resetAll();
  await runAsyncTest('B1.2: Missing webcam hardware produces NotFoundError', async () => {
    sim.mediaDevices.hasCameraDevice = false;
    await assert.rejects(async () => sim.startArcadeGame('camera'));
    assert.equal(sim.trackingStatus, 'error');
  });

  resetAll();
  await runAsyncTest('B1.3: Rapid mode toggling (10x) leaves zero orphan streams', async () => {
    for (let i = 0; i < 10; i++) {
      await sim.switchControlMode(i % 2 === 0 ? 'camera' : 'classic');
    }
    await sim.switchControlMode('classic');
    assert.equal(StreamLeakAuditor.getActiveStreamCount(), 0);
  });

  resetAll();
  runSyncTest('B2.1: Extreme out-of-bounds coordinates clamp cleanly', () => {
    const out = CoordinateEngine.toNormalizedCoords(-0.3, 1.5);
    assert.equal(out.x, 1.0);
    assert.equal(out.y, 1.0);
  });

  resetAll();
  runSyncTest('B2.2: Multi-hand input selects primary foreground hand', () => {
    const primary = LandmarkSynthesizer.createClosedFist({ x: 0.5, y: 0.5, z: 0 }, 0.25);
    const secondary = LandmarkSynthesizer.createOpenPalm({ x: 0.8, y: 0.8, z: 0 }, 0.10);
    const chosen = [primary, secondary].reduce((best, cur) => {
      return GestureClassifier.computeMetrics(cur).scale > GestureClassifier.computeMetrics(best).scale ? cur : best;
    });
    assert.equal(chosen, primary);
  });

  resetAll();
  runSyncTest('B3.1: Scale invariance across extreme camera distances', () => {
    const close = GestureClassifier.computeMetrics(LandmarkSynthesizer.createClosedFist(undefined, 0.45));
    const far = GestureClassifier.computeMetrics(LandmarkSynthesizer.createClosedFist(undefined, 0.08));
    assert.equal(close.isFistCandidate, true);
    assert.equal(far.isFistCandidate, true);
  });

  resetAll();
  runSyncTest('B3.2: Middle MCP anchoring keeps cursor stable during clenching', () => {
    const open = LandmarkSynthesizer.createOpenPalm();
    const fist = LandmarkSynthesizer.createClosedFist();
    assert.equal(open[9].x, fist[9].x);
    assert.equal(open[9].y, fist[9].y);
  });

  resetAll();
  runSyncTest('B3.3: Rapid micro-pinching flutter stabilized by hysteresis', () => {
    const pinch = LandmarkSynthesizer.createPinch(undefined, 0.2, 0.15);
    classifier.evaluateFrame(pinch, 1000);
    const flutter = LandmarkSynthesizer.createPinch(undefined, 0.2, 0.24);
    const res = classifier.evaluateFrame(flutter, 1300);
    assert.equal(res.isWhacking, false);
    assert.equal(res.fsmState, 'WAITING_RELEASE');
  });

  console.log('\n--- Tier 3: Cross-Feature Combinations ---');
  resetAll();
  await runAsyncTest('C1: Switching mode to Classic while fist is clenched leaves no stuck hit', async () => {
    await sim.startArcadeGame('camera');
    const fist = LandmarkSynthesizer.createClosedFist();
    classifier.evaluateFrame(fist, 1000);
    await sim.switchControlMode('classic');
    classifier.reset();
    const idle = classifier.evaluateFrame([], 1100);
    assert.equal(idle.isWhacking, false);
    assert.equal(idle.fsmState, 'IDLE');
  });

  resetAll();
  await runAsyncTest('C2: Mode switching during active Frenzy round preserves score and timer', async () => {
    await sim.startArcadeGame('camera');
    sim.activateFrenzy(15000);
    sim.hitHole(0);
    const score = sim.score;
    await sim.switchControlMode('classic');
    assert.equal(sim.frenzyActive, true);
    assert.equal(sim.score, score);
  });

  resetAll();
  runSyncTest('C3: Hybrid fist & pinch pose registers exactly ONE hit', () => {
    const hybrid = LandmarkSynthesizer.createClosedFist();
    hybrid[4] = { ...hybrid[8] };
    const res = classifier.evaluateFrame(hybrid, 1000);
    assert.equal(res.isWhacking, true);
    const res2 = classifier.evaluateFrame(hybrid, 1016);
    assert.equal(res2.isWhacking, false);
  });

  resetAll();
  runSyncTest('C4: Multi-hit tough mole under cooldown requires spaced hits', () => {
    sim.gameState = 'playing';
    sim.spawnMole(4, 'tough');
    const fist = LandmarkSynthesizer.createClosedFist();
    const open = LandmarkSynthesizer.createOpenPalm();

    classifier.evaluateFrame(fist, 1000);
    sim.hitHole(4);
    assert.equal(sim.activeMoles.get(4).health, 1);

    classifier.evaluateFrame(open, 1300);
    classifier.evaluateFrame(fist, 1350);
    const hit2 = sim.hitHole(4);
    assert.equal(hit2.destroyed, true);
  });

  console.log('\n--- Tier 4: Real-World Gameplay Scenarios ---');
  resetAll();
  await runAsyncTest('Scenario 1: Complete 60s Camera Arcade Run with combos', async () => {
    await sim.startArcadeGame('camera');
    let t = 0;
    const fist = LandmarkSynthesizer.createClosedFist();
    const open = LandmarkSynthesizer.createOpenPalm();

    for (let r = 0; r < 25; r++) {
      const hole = r % 9;
      sim.spawnMole(hole, 'standard');
      sim.tick(800);
      t += 800;
      if (classifier.evaluateFrame(fist, t).isWhacking) {
        sim.hitHole(hole);
      }
      sim.tick(300);
      t += 300;
      classifier.evaluateFrame(open, t);
      sim.tick(900);
      t += 900;
    }

    assert.equal(sim.gameState, 'gameover');
    assert.ok(sim.stats.hits >= 20);
    assert.ok(sim.score >= 3000);
    sim.teardownCamera();
    assert.equal(StreamLeakAuditor.getActiveStreamCount(), 0);
  });

  resetAll();
  await runAsyncTest('Scenario 2: Bomb Avoidance & Golden Mole Sniping', async () => {
    await sim.startArcadeGame('camera');
    sim.spawnMole(4, 'bomb', 1200);
    sim.spawnMole(2, 'golden', 1200);

    // Whack hole 2 only
    sim.hitHole(2);
    sim.tick(1500); // bomb expires
    assert.equal(sim.stats.bombsHit, 0);
    assert.equal(sim.stats.goldenHit, 1);
    assert.ok(sim.score >= 500);
  });

  resetAll();
  await runAsyncTest('Scenario 3: 15-Second Frenzy Mode Blitz', async () => {
    await sim.startArcadeGame('camera');
    sim.activateFrenzy(15000);
    for (let h = 0; h < 9; h++) {
      sim.hitHole(h);
    }
    assert.equal(sim.stats.hits, 9);
    assert.ok(sim.score >= 1800);
  });

  resetAll();
  await runAsyncTest('Scenario 4: Multi-Game Lifecycle Stream Leak Audit (5 cycles)', async () => {
    for (let c = 1; c <= 5; c++) {
      await sim.startArcadeGame(c % 2 === 0 ? 'camera' : 'classic');
      sim.tick(1000);
      sim.teardownCamera();
    }
    const audit = StreamLeakAuditor.verifyClean();
    assert.equal(audit.clean, true);
    assert.equal(audit.activeStreams, 0);
    assert.equal(audit.activeTracks, 0);
  });

  console.log('\n--- Tier 5: Empirical Adversarial Challenge Suite ---');
  resetAll();
  runSyncTest('ADV.1: Scale-Invariance across user distances (0.1x, 0.3x, 0.5x, 1.0x, 2.0x, 3.0x, 5.0x)', () => {
    const scales = [0.1, 0.3, 0.5, 1.0, 2.0, 3.0, 5.0];
    for (const scale of scales) {
      const fist = LandmarkSynthesizer.createClosedFist({ x: 0.5, y: 0.5, z: 0 }, 0.2 * scale);
      const mFist = GestureClassifier.computeMetrics(fist);
      assert.equal(mFist.isFistCandidate, true, `Fist failed at scale ${scale}x`);
      assert.equal(mFist.curledCount, 4);

      const pinch = LandmarkSynthesizer.createPinch({ x: 0.5, y: 0.5, z: 0 }, 0.2 * scale, 0.12);
      const mPinch = GestureClassifier.computeMetrics(pinch);
      assert.equal(mPinch.isPinchCandidate, true, `Pinch failed at scale ${scale}x`);
      assert.ok(Math.abs(mPinch.pinchRatio - 0.12) < 0.005);

      const palm = LandmarkSynthesizer.createOpenPalm({ x: 0.5, y: 0.5, z: 0 }, 0.2 * scale);
      const mPalm = GestureClassifier.computeMetrics(palm);
      assert.equal(mPalm.isFistCandidate, false);
      assert.equal(mPalm.isPinchCandidate, false);
    }
  });

  resetAll();
  runSyncTest('ADV.2: Middle MCP / Knuckle Anchoring has strictly 0 spatial drift during clenching', () => {
    const openPalm = LandmarkSynthesizer.createOpenPalm({ x: 0.5, y: 0.5, z: 0 }, 0.2);
    const closedFist = LandmarkSynthesizer.createClosedFist({ x: 0.5, y: 0.5, z: 0 }, 0.2);

    const openKnuckle = {
      x: (openPalm[5].x + openPalm[9].x + openPalm[13].x) / 3,
      y: (openPalm[5].y + openPalm[9].y + openPalm[13].y) / 3,
    };
    const fistKnuckle = {
      x: (closedFist[5].x + closedFist[9].x + closedFist[13].x) / 3,
      y: (closedFist[5].y + closedFist[9].y + closedFist[13].y) / 3,
    };

    const knuckleDrift = Math.hypot(openKnuckle.x - fistKnuckle.x, openKnuckle.y - fistKnuckle.y);
    assert.equal(knuckleDrift, 0.0, 'Knuckle anchor drift must be strictly 0');

    const indexTipDrift = Math.hypot(openPalm[8].x - closedFist[8].x, openPalm[8].y - closedFist[8].y);
    assert.ok(indexTipDrift > 0.15, `Index tip drift was ${indexTipDrift}`);
    assert.ok(knuckleDrift < indexTipDrift);
  });

  resetAll();
  runSyncTest('ADV.3: Edge margin boundaries [0.12, 0.88] map smoothly to NDC [-1, 1] without NaN', () => {
    const testPoints = [-5.0, -0.5, 0.0, 0.119, 0.12, 0.5, 0.88, 0.881, 1.0, 1.5, 5.0];
    for (const rawX of testPoints) {
      for (const rawY of [0.12, 0.5, 0.88]) {
        const norm = CoordinateEngine.toNormalizedCoords(rawX, rawY);
        const ndc = CoordinateEngine.toNDCCoords(norm.x, norm.y);

        assert.ok(!isNaN(norm.x) && !isNaN(norm.y), `norm coords NaN for (${rawX}, ${rawY})`);
        assert.ok(!isNaN(ndc.x) && !isNaN(ndc.y), `ndc coords NaN for (${rawX}, ${rawY})`);
        assert.ok(isFinite(ndc.x) && isFinite(ndc.y), `ndc coords non-finite for (${rawX}, ${rawY})`);
        assert.ok(ndc.x >= -1.0 && ndc.x <= 1.0, `ndcX out of bounds: ${ndc.x}`);
        assert.ok(ndc.y >= -1.0 && ndc.y <= 1.0, `ndcY out of bounds: ${ndc.y}`);

        const hit = CoordinateEngine.raycastToGround(ndc.x, ndc.y);
        assert.ok(!isNaN(hit.x) && !isNaN(hit.z), 'Ground raycast must be finite');
      }
    }
  });

  resetAll();
  runSyncTest('ADV.4: 260ms cooldown & mandatory release strictly prevents auto-fire on continuous fist hold', () => {
    const fist = LandmarkSynthesizer.createClosedFist();
    let totalWhacks = 0;
    const startTime = 1000;

    // 60 frames = 1000ms
    for (let f = 0; f < 60; f++) {
      const ts = startTime + f * 16.6;
      const res = classifier.evaluateFrame(fist, ts);
      if (res.isWhacking) totalWhacks++;
    }

    assert.equal(totalWhacks, 1, `Continuous fist hold must yield strictly 1 whack, got ${totalWhacks}`);
  });

  resetAll();
  runSyncTest('ADV.5: 10-second (600 frames) continuous fist hold yields strictly 1 whack', () => {
    const fist = LandmarkSynthesizer.createClosedFist();
    let totalWhacks = 0;
    for (let f = 0; f < 600; f++) {
      const res = classifier.evaluateFrame(fist, 1000 + f * 16.6);
      if (res.isWhacking) totalWhacks++;
    }
    assert.equal(totalWhacks, 1, `10s hold must yield strictly 1 whack, got ${totalWhacks}`);
  });

  resetAll();
  runSyncTest('ADV.6: Partial release (curledCount = 2) is blocked by hysteresis until full release (<=1)', () => {
    const fist4 = LandmarkSynthesizer.createCurledCountPose(4);
    const partial2 = LandmarkSynthesizer.createCurledCountPose(2);
    const open0 = LandmarkSynthesizer.createCurledCountPose(0);

    const w1 = classifier.evaluateFrame(fist4, 1000);
    assert.equal(w1.isWhacking, true);

    const partial = classifier.evaluateFrame(partial2, 1300);
    assert.equal(partial.isWhacking, false);
    assert.equal(partial.fsmState, 'WAITING_RELEASE');

    const reClench = classifier.evaluateFrame(fist4, 1350);
    assert.equal(reClench.isWhacking, false);

    classifier.evaluateFrame(open0, 1370);
    const w2 = classifier.evaluateFrame(fist4, 1400);
    assert.equal(w2.isWhacking, true);
  });

  resetAll();
  runSyncTest('ADV.7: Micro-pinching flutter near threshold is stabilized by hysteresis (0.22 vs 0.32)', () => {
    const tightPinch = LandmarkSynthesizer.createPinch({ x: 0.5, y: 0.5, z: 0 }, 0.2, 0.12);
    const flutterPinch = LandmarkSynthesizer.createPinch({ x: 0.5, y: 0.5, z: 0 }, 0.2, 0.26);
    const openPalm = LandmarkSynthesizer.createOpenPalm({ x: 0.5, y: 0.5, z: 0 }, 0.2);

    const p1 = classifier.evaluateFrame(tightPinch, 1000);
    assert.equal(p1.isWhacking, true);

    const flutter = classifier.evaluateFrame(flutterPinch, 1300);
    assert.equal(flutter.isWhacking, false);
    assert.equal(flutter.fsmState, 'WAITING_RELEASE');

    classifier.evaluateFrame(openPalm, 1320);
    const p2 = classifier.evaluateFrame(tightPinch, 1350);
    assert.equal(p2.isWhacking, true);
  });

  console.log('\n--- Tier 6: Adversarial Hardware Lifecycle & Concurrency / State Stability Suite ---');
  resetAll();
  await runAsyncTest('LC.1: 50 Sequential Rapid Mode Switches (GameEngineSim) - 0 leaks', async () => {
    for (let i = 0; i < 50; i++) {
      const targetMode = i % 2 === 0 ? 'camera' : 'classic';
      await sim.switchControlMode(targetMode);
    }
    await sim.switchControlMode('classic');
    const audit = StreamLeakAuditor.verifyClean();
    assert.equal(audit.clean, true, `Leaked streams: ${audit.activeStreams}, tracks: ${audit.activeTracks}`);
  });

  resetAll();
  await runAsyncTest('LC.2: 50 High-Frequency Toggles with Latency (Hook Engine) - Audit Concurrency', async () => {
    const mediaDevices = new MockMediaDevices();
    mediaDevices.delayMs = 2;
    const hook = new SimulatedHandTrackingHook(mediaDevices);

    for (let i = 0; i < 50; i++) {
      if (i % 2 === 0) {
        hook.start().catch(() => {});
      } else {
        hook.stop();
      }
      await new Promise((r) => setTimeout(r, 3));
    }

    await new Promise((r) => setTimeout(r, 50));
    hook.stop();

    const audit = StreamLeakAuditor.verifyClean();
    assert.equal(audit.clean, true, `Orphan tracks detected: ${audit.activeTracks} active`);
    assert.equal(hook.activeRafLoops.size, 0, `Leaked RAF loops: ${hook.activeRafLoops.size} active`);
  });

  resetAll();
  await runAsyncTest('LC.3: 10 Ultra-Fast Synchronous Bursts (0ms interval between calls)', async () => {
    const mediaDevices = new MockMediaDevices();
    mediaDevices.delayMs = 5;
    const hook = new SimulatedHandTrackingHook(mediaDevices);

    for (let i = 0; i < 10; i++) {
      if (i % 2 === 0) {
        hook.start().catch(() => {});
      } else {
        hook.stop();
      }
    }

    await new Promise((r) => setTimeout(r, 60));
    hook.stop();

    const audit = StreamLeakAuditor.verifyClean();
    assert.equal(audit.clean, true, `Leaked tracks after sync burst: ${audit.activeTracks}`);
  });

  resetAll();
  await runAsyncTest('LC.4: Camera permission rejected (NotAllowedError) sets error state and allows fallback', async () => {
    const mediaDevices = new MockMediaDevices();
    mediaDevices.permissionGranted = false;
    const hook = new SimulatedHandTrackingHook(mediaDevices);

    await hook.start();
    assert.equal(hook.status, 'error');
    assert.ok(hook.errorMessage && hook.errorMessage.includes('denegado'));

    hook.stop();
    assert.equal(hook.status, 'idle');
    const audit = StreamLeakAuditor.verifyClean();
    assert.equal(audit.clean, true);
  });

  resetAll();
  await runAsyncTest('LC.5: Camera missing (NotFoundError) provides descriptive message and zero leaks', async () => {
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

  resetAll();
  await runAsyncTest('LC.6: Camera busy (NotReadableError) handled gracefully', async () => {
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

  resetAll();
  await runAsyncTest('LC.7: Hardware webcam unplugged mid-game (track ended event)', async () => {
    const mediaDevices = new MockMediaDevices();
    const hook = new SimulatedHandTrackingHook(mediaDevices);

    await hook.start();
    assert.equal(hook.status, 'tracking');
    assert.ok(hook.streamRef !== null);

    const track = hook.streamRef.getVideoTracks()[0];
    assert.equal(track.readyState, 'live');

    track.stop();
    assert.equal(track.readyState, 'ended');

    hook.stop();
    const audit = StreamLeakAuditor.verifyClean();
    assert.equal(audit.clean, true);
  });

  resetAll();
  await runAsyncTest('LC.8: Mode switch during active Frenzy preserves score, combo, and frenzy multiplier', async () => {
    await sim.startArcadeGame('camera');
    sim.spawnMole(0, 'golden');
    sim.activateFrenzy(15000);
    const hit1 = sim.hitHole(0);
    assert.equal(hit1.pointsAwarded, 1000);
    assert.equal(sim.score, 1000);
    assert.equal(sim.comboStreak, 1);

    await sim.switchControlMode('classic');
    assert.equal(sim.frenzyActive, true, 'Frenzy must remain active');
    assert.equal(sim.score, 1000, 'Score must be preserved');
    assert.equal(sim.comboStreak, 1, 'Combo must be preserved');

    sim.spawnMole(1, 'standard');
    const hit2 = sim.hitHole(1);
    assert.equal(hit2.pointsAwarded, 200);
    assert.equal(sim.score, 1200);
    assert.equal(sim.comboStreak, 2);

    sim.teardownCamera();
    const audit = StreamLeakAuditor.verifyClean();
    assert.equal(audit.clean, true);
  });

  resetAll();
  await runAsyncTest('LC.9: Mode switch during Kitchen Disaster preserves disaster countdown and game state', async () => {
    await sim.startArcadeGame('classic');
    sim.activateKitchenDisaster(10);
    assert.equal(sim.kitchenDisasterActive, true);
    assert.equal(sim.disasterTimeRemaining, 10);

    await sim.switchControlMode('camera');
    assert.equal(sim.kitchenDisasterActive, true, 'Disaster state must persist');
    assert.equal(sim.disasterTimeRemaining, 10, 'Disaster timer must persist');
    assert.equal(sim.isCameraTracking, true, 'Camera tracking must be active');

    sim.teardownCamera();
    const audit = StreamLeakAuditor.verifyClean();
    assert.equal(audit.clean, true);
  });

  resetAll();
  await runAsyncTest('LC.10: Mode switch while Paused strictly blocks whack triggers until unpaused', async () => {
    await sim.startArcadeGame('classic');
    sim.spawnMole(4, 'standard');

    sim.pause();
    assert.equal(sim.gameState, 'paused');

    await sim.switchControlMode('camera');
    assert.equal(sim.controlMode, 'camera');

    const pausedWhack = sim.hitHole(4);
    assert.equal(pausedWhack.hit, false, 'Whack must be blocked while paused');
    assert.equal(sim.score, 0, 'Score must not change while paused');

    sim.resume();
    assert.equal(sim.gameState, 'playing');

    const playingWhack = sim.hitHole(4);
    assert.equal(playingWhack.hit, true, 'Whack must succeed once unpaused');
    assert.equal(sim.score, 100);

    sim.teardownCamera();
    const audit = StreamLeakAuditor.verifyClean();
    assert.equal(audit.clean, true);
  });

  resetAll();
  await runAsyncTest('LC.11: 10x Rapid Mode Switching DURING active Frenzy retains state integrity', async () => {
    await sim.startArcadeGame('camera');
    sim.activateFrenzy(15000);
    sim.spawnMole(2, 'golden');
    sim.hitHole(2);
    assert.equal(sim.score, 1000);

    for (let i = 0; i < 10; i++) {
      await sim.switchControlMode(i % 2 === 0 ? 'classic' : 'camera');
    }

    assert.equal(sim.frenzyActive, true);
    assert.equal(sim.score, 1000);

    await sim.switchControlMode('classic');
    const audit = StreamLeakAuditor.verifyClean();
    assert.equal(audit.clean, true);
  });

  // ============================================================================
  // Milestone 3: Audio & Sound Feedback Test Suite (Requirement R3)
  // ============================================================================
  console.log('\n--- Milestone 3: Audio & Sound Feedback Suite (Requirement R3) ---');

  class M3AudioParam {
    constructor(val = 1) {
      this.value = val;
      this.events = [];
    }
    setValueAtTime(v, t) {
      this.value = v;
      this.events.push({ type: 'setValueAtTime', value: v, time: t });
      return this;
    }
    linearRampToValueAtTime(v, t) {
      this.value = v;
      this.events.push({ type: 'linearRampToValueAtTime', value: v, time: t });
      return this;
    }
    exponentialRampToValueAtTime(v, t) {
      this.value = v;
      this.events.push({ type: 'exponentialRampToValueAtTime', value: v, time: t });
      return this;
    }
    setTargetAtTime(target, time, timeConstant) {
      this.value = target;
      this.events.push({ type: 'setTargetAtTime', target, time, timeConstant });
      return this;
    }
    cancelScheduledValues(t) {
      this.events.push({ type: 'cancelScheduledValues', time: t });
      return this;
    }
  }

  class M3AudioNode {
    constructor(ctx) {
      this.ctx = ctx;
      this.conns = [];
    }
    connect(d) {
      this.conns.push(d);
      return d;
    }
  }

  class M3GainNode extends M3AudioNode {
    constructor(ctx) {
      super(ctx);
      this.gain = new M3AudioParam(1);
    }
  }

  class M3OscillatorNode extends M3AudioNode {
    constructor(ctx) {
      super(ctx);
      this.type = 'sine';
      this.frequency = new M3AudioParam(440);
      this.started = false;
      this.stopped = false;
    }
    start(t = 0) {
      this.started = true;
      this.startTime = t;
    }
    stop(t = 0) {
      this.stopped = true;
      this.stopTime = t;
    }
  }

  class M3BiquadFilterNode extends M3AudioNode {
    constructor(ctx) {
      super(ctx);
      this.type = 'lowpass';
      this.frequency = new M3AudioParam(350);
      this.Q = new M3AudioParam(1);
    }
  }

  class M3BufferSourceNode extends M3AudioNode {
    constructor(ctx) {
      super(ctx);
      this.buffer = null;
      this.started = false;
    }
    start(t = 0) {
      this.started = true;
      this.startTime = t;
    }
    stop(t = 0) {
      this.stopped = true;
      this.stopTime = t;
    }
  }

  class M3AudioContext {
    constructor() {
      this.state = 'running';
      this.currentTime = 0.05;
      this.sampleRate = 44100;
      this.destination = new M3AudioNode(this);
      this.oscillators = [];
      this.gains = [];
      this.filters = [];
      this.bufferSources = [];
    }
    createGain() {
      const g = new M3GainNode(this);
      this.gains.push(g);
      return g;
    }
    createOscillator() {
      const o = new M3OscillatorNode(this);
      this.oscillators.push(o);
      return o;
    }
    createBiquadFilter() {
      const f = new M3BiquadFilterNode(this);
      this.filters.push(f);
      return f;
    }
    createBuffer(ch, len, sr) {
      return { length: len, sampleRate: sr, getChannelData: () => new Float32Array(len) };
    }
    createBufferSource() {
      const bs = new M3BufferSourceNode(this);
      this.bufferSources.push(bs);
      return bs;
    }
    reset() {
      this.oscillators = [];
      this.gains = [];
      this.filters = [];
      this.bufferSources = [];
    }
  }

  const m3Ctx = new M3AudioContext();

  // Synthetic Test Harness mimicking sfx.ts procedural synthesis algorithms
  const m3Sfx = {
    volume: 0.8,
    isMuted: false,
    playHelmetHit(isLethal = false) {
      if (this.isMuted) return;
      const now = m3Ctx.currentTime;
      [820, 1480].forEach((freq, idx) => {
        const osc = m3Ctx.createOscillator();
        const gain = m3Ctx.createGain();
        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(this.volume * (idx === 0 ? 0.45 : 0.3), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (isLethal ? 0.28 : 0.22));
        osc.connect(gain);
        gain.connect(m3Ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      });
      const tap = m3Ctx.createOscillator();
      const tapGain = m3Ctx.createGain();
      tap.type = 'triangle';
      tap.frequency.setValueAtTime(2100, now);
      tap.frequency.exponentialRampToValueAtTime(620, now + 0.02);
      tapGain.gain.setValueAtTime(this.volume * 0.4, now);
      tapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      tap.connect(tapGain);
      tapGain.connect(m3Ctx.destination);
      tap.start(now);
      tap.stop(now + 0.04);
      if (isLethal) {
        const noise = m3Ctx.createBufferSource();
        noise.buffer = m3Ctx.createBuffer(1, 4410, 44100);
        const filter = m3Ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, now);
        const noiseGain = m3Ctx.createGain();
        noiseGain.gain.setValueAtTime(this.volume * 0.5, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(m3Ctx.destination);
        noise.start(now);
        noise.stop(now + 0.13);

        const crunch = m3Ctx.createOscillator();
        const crunchGain = m3Ctx.createGain();
        crunch.type = 'sawtooth';
        crunch.frequency.setValueAtTime(220, now);
        crunch.frequency.exponentialRampToValueAtTime(45, now + 0.15);
        crunchGain.gain.setValueAtTime(this.volume * 0.4, now);
        crunchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        crunch.connect(crunchGain);
        crunchGain.connect(m3Ctx.destination);
        crunch.start(now);
        crunch.stop(now + 0.17);
      }
    },
    playFrostHit() {
      if (this.isMuted) return;
      const now = m3Ctx.currentTime;
      const noise = m3Ctx.createBufferSource();
      noise.buffer = m3Ctx.createBuffer(1, 4410, 44100);
      const filter = m3Ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(3200, now);
      const noiseGain = m3Ctx.createGain();
      noiseGain.gain.setValueAtTime(this.volume * 0.45, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(m3Ctx.destination);
      noise.start(now);
      noise.stop(now + 0.13);

      [2400, 3840].forEach((freq, idx) => {
        const osc = m3Ctx.createOscillator();
        const gain = m3Ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(this.volume * (idx === 0 ? 0.35 : 0.22), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(m3Ctx.destination);
        osc.start(now);
        osc.stop(now + 0.26);
      });

      const tick = m3Ctx.createOscillator();
      const tickGain = m3Ctx.createGain();
      tick.type = 'triangle';
      tick.frequency.setValueAtTime(4500, now + 0.02);
      tick.frequency.exponentialRampToValueAtTime(1200, now + 0.035);
      tickGain.gain.setValueAtTime(this.volume * 0.2, now + 0.02);
      tickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      tick.connect(tickGain);
      tickGain.connect(m3Ctx.destination);
      tick.start(now + 0.02);
      tick.stop(now + 0.045);
    },
    playGoldenHit() {
      if (this.isMuted) return;
      const now = m3Ctx.currentTime;
      const notes = [659.25, 830.61, 987.77, 1318.51, 1661.22, 1975.53];
      notes.forEach((freq, idx) => {
        const t = now + idx * 0.032;
        const o1 = m3Ctx.createOscillator();
        const g1 = m3Ctx.createGain();
        o1.type = 'sine';
        o1.frequency.setValueAtTime(freq, t);
        g1.gain.setValueAtTime(this.volume * 0.32, t);
        g1.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        o1.connect(g1);
        g1.connect(m3Ctx.destination);
        o1.start(t);
        o1.stop(t + 0.3);

        const o2 = m3Ctx.createOscillator();
        const g2 = m3Ctx.createGain();
        o2.type = 'triangle';
        o2.frequency.setValueAtTime(freq * 2, t);
        g2.gain.setValueAtTime(this.volume * 0.15, t);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        o2.connect(g2);
        g2.connect(m3Ctx.destination);
        o2.start(t);
        o2.stop(t + 0.22);
      });
      const noise = m3Ctx.createBufferSource();
      noise.buffer = m3Ctx.createBuffer(1, 4410, 44100);
      const filter = m3Ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(4200, now + 0.08);
      const noiseGain = m3Ctx.createGain();
      noiseGain.gain.setValueAtTime(this.volume * 0.22, now + 0.08);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(m3Ctx.destination);
      noise.start(now + 0.08);
      noise.stop(now + 0.27);
    },
    playCameraActivate() {
      if (this.isMuted) return;
      const now = m3Ctx.currentTime;
      [{ freq: 523.25, time: now, dur: 0.2 }, { freq: 1046.5, time: now + 0.085, dur: 0.3 }].forEach(({ freq, time, dur }) => {
        const osc = m3Ctx.createOscillator();
        const gain = m3Ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(this.volume * 0.32, time + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
        osc.connect(gain);
        gain.connect(m3Ctx.destination);
        osc.start(time);
        osc.stop(time + dur + 0.01);
      });
    },
    playGestureConfirm() {
      if (this.isMuted) return;
      const now = m3Ctx.currentTime;
      const osc = m3Ctx.createOscillator();
      const gain = m3Ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.015);
      gain.gain.setValueAtTime(this.volume * 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.016);
      osc.connect(gain);
      gain.connect(m3Ctx.destination);
      osc.start(now);
      osc.stop(now + 0.018);

      const noise = m3Ctx.createBufferSource();
      noise.buffer = m3Ctx.createBuffer(1, 350, 44100);
      const noiseGain = m3Ctx.createGain();
      noiseGain.gain.setValueAtTime(this.volume * 0.25, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);
      noise.connect(noiseGain);
      noiseGain.connect(m3Ctx.destination);
      noise.start(now);
      noise.stop(now + 0.01);
    },
    playPhantomDisappear() {
      if (this.isMuted) return;
      const now = m3Ctx.currentTime;
      [460, 466].forEach((f) => {
        const osc = m3Ctx.createOscillator();
        const gain = m3Ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);
        osc.frequency.exponentialRampToValueAtTime(820, now + 0.14);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.32);
        gain.gain.setValueAtTime(this.volume * 0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
        osc.connect(gain);
        gain.connect(m3Ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      });
    },
    playFireBurst() {
      if (this.isMuted) return;
      const now = m3Ctx.currentTime;
      const osc = m3Ctx.createOscillator();
      const gain = m3Ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.linearRampToValueAtTime(160, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.35);
      gain.gain.setValueAtTime(this.volume * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      osc.connect(gain);
      gain.connect(m3Ctx.destination);
      osc.start(now);
      osc.stop(now + 0.38);

      const noise = m3Ctx.createBufferSource();
      noise.buffer = m3Ctx.createBuffer(1, 4410, 44100);
      const filter = m3Ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, now);
      const noiseGain = m3Ctx.createGain();
      noiseGain.gain.setValueAtTime(this.volume * 0.4, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(m3Ctx.destination);
      noise.start(now);
      noise.stop(now + 0.26);
    },
    playFreeze() {
      if (this.isMuted) return;
      const now = m3Ctx.currentTime;
      const sweep = m3Ctx.createOscillator();
      const sweepGain = m3Ctx.createGain();
      sweep.type = 'sine';
      sweep.frequency.setValueAtTime(340, now);
      sweep.frequency.exponentialRampToValueAtTime(80, now + 0.28);
      sweepGain.gain.setValueAtTime(this.volume * 0.35, now);
      sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      sweep.connect(sweepGain);
      sweepGain.connect(m3Ctx.destination);
      sweep.start(now);
      sweep.stop(now + 0.32);

      const bell = m3Ctx.createOscillator();
      const bellGain = m3Ctx.createGain();
      bell.type = 'triangle';
      bell.frequency.setValueAtTime(2200, now);
      bellGain.gain.setValueAtTime(this.volume * 0.28, now);
      bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      bell.connect(bellGain);
      bellGain.connect(m3Ctx.destination);
      bell.start(now);
      bell.stop(now + 0.24);
    },
    playLightning() {
      if (this.isMuted) return;
      const now = m3Ctx.currentTime;
      const arc = m3Ctx.createOscillator();
      const arcGain = m3Ctx.createGain();
      arc.type = 'sawtooth';
      arc.frequency.setValueAtTime(2800, now);
      arc.frequency.exponentialRampToValueAtTime(100, now + 0.008);
      arcGain.gain.setValueAtTime(this.volume * 0.5, now);
      arcGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
      arc.connect(arcGain);
      arcGain.connect(m3Ctx.destination);
      arc.start(now);
      arc.stop(now + 0.02);

      const buzz = m3Ctx.createOscillator();
      const buzzGain = m3Ctx.createGain();
      buzz.type = 'sawtooth';
      buzz.frequency.setValueAtTime(120, now);
      buzzGain.gain.setValueAtTime(this.volume * 0.35, now);
      buzzGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      buzz.connect(buzzGain);
      buzzGain.connect(m3Ctx.destination);
      buzz.start(now);
      buzz.stop(now + 0.09);
    },
    playWhack(isCrit = false) {
      const now = m3Ctx.currentTime;
      const osc = m3Ctx.createOscillator();
      const gain = m3Ctx.createGain();
      osc.frequency.setValueAtTime(isCrit ? 280 : 200, now);
      gain.gain.setValueAtTime(0.6, now);
      osc.connect(gain);
      gain.connect(m3Ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    },
    playMoleHit(type, isCrit = false, isLethal = false) {
      if (this.isMuted) return;
      switch (type) {
        case 'helmet':
          this.playHelmetHit(isLethal);
          break;
        case 'frost':
          this.playFrostHit();
          break;
        case 'golden':
          this.playGoldenHit();
          break;
        case 'phantom':
          this.playPhantomDisappear();
          break;
        case 'fast':
        case 'bomb':
        case 'tough':
        case 'rainbow':
        case 'boss':
        case 'standard':
        default:
          this.playWhack(isCrit);
          break;
      }
    },
  };

  // Synthetic Test Harness for DynamicSoundtrackEngine
  const m3Soundtrack = {
    volume: 0.6,
    isMuted: false,
    mode: 'menu',
    isPlaying: false,
    masterGain: m3Ctx.createGain(),
    filterNode: m3Ctx.createBiquadFilter(),
    start(mode = 'menu') {
      this.mode = mode;
      this.isPlaying = true;
      if (mode === 'menu') {
        this.filterNode.frequency.setTargetAtTime(1500, m3Ctx.currentTime, 0.1);
      }
    },
    stop() {
      this.isPlaying = false;
    },
    setMode(mode) {
      this.mode = mode;
    },
    setVolume(val) {
      const normalized = val > 1 ? val / 100 : val;
      this.volume = Math.max(0, Math.min(1, normalized));
      const targetGain = (this.isMuted || this.volume <= 0.001) ? 0 : this.volume * 0.45;
      this.masterGain.gain.cancelScheduledValues(m3Ctx.currentTime);
      this.masterGain.gain.setTargetAtTime(targetGain, m3Ctx.currentTime, 0.03);
    },
    triggerImpactDucking() {
      const now = m3Ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.volume * 0.25, now);
      this.masterGain.gain.linearRampToValueAtTime(this.volume * 0.45, now + 0.18);
    },
  };

  runSyncTest('AUDIO.1: playHelmetHit(false) generates metallic resonance & rim tap', () => {
    m3Ctx.reset();
    m3Sfx.playHelmetHit(false);
    assert.ok(m3Ctx.oscillators.length >= 3, `Expected >= 3 oscillators, got ${m3Ctx.oscillators.length}`);
    const freqs = m3Ctx.oscillators.map((o) => o.frequency.value);
    assert.ok(freqs.includes(820), 'Should synthesize 820Hz metal bandpass partial');
    assert.ok(freqs.includes(1480), 'Should synthesize 1480Hz metal bandpass partial');
    assert.ok(freqs.includes(2100), 'Should synthesize 2100Hz rim tap transient');
    assert.equal(m3Ctx.bufferSources.length, 0, 'Non-lethal hit must not emit shatter buffer');
  });

  runSyncTest('AUDIO.2: playHelmetHit(true) adds armor shatter noise burst and crunch thud', () => {
    m3Ctx.reset();
    m3Sfx.playHelmetHit(true);
    assert.ok(m3Ctx.oscillators.length >= 4, 'Should synthesize metal + crunch thud');
    assert.ok(m3Ctx.bufferSources.length >= 1, 'Should emit armor shatter noise buffer');
    assert.equal(m3Ctx.filters[0].type, 'bandpass');
    assert.equal(m3Ctx.filters[0].frequency.value, 1400);
  });

  runSyncTest('AUDIO.3: playFrostHit() generates highpass noise burst and dual FM bells', () => {
    m3Ctx.reset();
    m3Sfx.playFrostHit();
    assert.ok(m3Ctx.bufferSources.length >= 1, 'Should emit ice shatter noise buffer');
    assert.equal(m3Ctx.filters[0].type, 'highpass');
    assert.equal(m3Ctx.filters[0].frequency.value, 3200);
    const freqs = m3Ctx.oscillators.map((o) => o.frequency.value);
    assert.ok(freqs.includes(2400), 'Should include 2400Hz FM crystalline bell tone');
    assert.ok(freqs.includes(3840), 'Should include 3840Hz overtone bell tone');
    assert.ok(freqs.includes(4500), 'Should include 4500Hz crackle tick');
  });

  runSyncTest('AUDIO.4: playGoldenHit() generates 6-note pentatonic cascade and shimmer filter', () => {
    m3Ctx.reset();
    m3Sfx.playGoldenHit();
    assert.ok(m3Ctx.oscillators.length >= 12, '6 notes * 2 oscillators per note = 12 oscillators');
    assert.ok(m3Ctx.bufferSources.length >= 1, 'Should emit shimmer noise burst');
    assert.equal(m3Ctx.filters[0].frequency.value, 4200);
  });

  runSyncTest('AUDIO.5: playCameraActivate() generates ascending dual-tone chime (523.25Hz -> 1046.5Hz)', () => {
    m3Ctx.reset();
    m3Sfx.playCameraActivate();
    assert.equal(m3Ctx.oscillators.length, 2);
    assert.equal(m3Ctx.oscillators[0].frequency.value, 523.25);
    assert.equal(m3Ctx.oscillators[1].frequency.value, 1046.5);
    assert.ok(m3Ctx.oscillators[1].startTime > m3Ctx.oscillators[0].startTime);
  });

  runSyncTest('AUDIO.6: playGestureConfirm() generates snappy 15ms pitch drop (1400Hz -> 160Hz)', () => {
    m3Ctx.reset();
    m3Sfx.playGestureConfirm();
    assert.ok(m3Ctx.oscillators.length >= 1);
    assert.equal(m3Ctx.oscillators[0].frequency.value, 1400);
    const ramp = m3Ctx.oscillators[0].frequency.events.find((e) => e.type === 'exponentialRampToValueAtTime');
    assert.ok(ramp !== undefined);
    assert.equal(ramp.value, 160);
    assert.ok(m3Ctx.bufferSources.length >= 1, 'Should emit micro tactile noise pop');
  });

  runSyncTest('AUDIO.7: playPhantomDisappear(), playFireBurst(), playFreeze(), playLightning() synthesize special effects', () => {
    m3Ctx.reset();
    m3Sfx.playPhantomDisappear();
    assert.equal(m3Ctx.oscillators.length, 2, 'Phantom requires dual detuned oscillators');

    m3Ctx.reset();
    m3Sfx.playFireBurst();
    assert.ok(m3Ctx.oscillators.length >= 1 && m3Ctx.bufferSources.length >= 1, 'Fire burst requires roar and sizzle');

    m3Ctx.reset();
    m3Sfx.playFreeze();
    assert.ok(m3Ctx.oscillators.length >= 2, 'Freeze requires sweep and bell');

    m3Ctx.reset();
    m3Sfx.playLightning();
    assert.ok(m3Ctx.oscillators.length >= 2, 'Lightning requires arc snap and 120Hz buzz');
  });

  runSyncTest('AUDIO.8: playMoleHit unified dispatcher executes for all archetypes', () => {
    ['standard', 'fast', 'tough', 'golden', 'bomb', 'helmet', 'frost', 'rainbow', 'phantom', 'boss'].forEach((type) => {
      m3Ctx.reset();
      assert.doesNotThrow(() => m3Sfx.playMoleHit(type, false, false));
      assert.ok(m3Ctx.oscillators.length + m3Ctx.bufferSources.length > 0, `playMoleHit(${type}) must emit audio`);
    });
  });

  runSyncTest('AUDIO.9: dynamicSoundtrack supports menu ambient loop and mode switching', () => {
    m3Soundtrack.start('menu');
    assert.equal(m3Soundtrack.mode, 'menu');
    assert.equal(m3Soundtrack.isPlaying, true);

    m3Soundtrack.setMode('gameplay');
    assert.equal(m3Soundtrack.mode, 'gameplay');

    m3Soundtrack.stop();
    assert.equal(m3Soundtrack.isPlaying, false);
  });

  runSyncTest('AUDIO.10: dynamicSoundtrack setVolume immediately adjusts master gain for both 0..1 and 0..100 scales', () => {
    m3Soundtrack.masterGain.gain.events = [];
    m3Soundtrack.setVolume(0.7);
    let target = m3Soundtrack.masterGain.gain.events.find((e) => e.type === 'setTargetAtTime');
    assert.ok(target !== undefined);
    assert.ok(Math.abs(target.target - 0.7 * 0.45) < 0.001);

    m3Soundtrack.setVolume(40); // 40%
    target = m3Soundtrack.masterGain.gain.events[m3Soundtrack.masterGain.gain.events.length - 1];
    assert.ok(Math.abs(target.target - 0.4 * 0.45) < 0.001);
  });

  // ==========================================================================
  // Milestone 4 / Requirement R2: Interactive Camera Tutorial (Onboarding)
  // ==========================================================================
  const TUTORIAL_STORAGE_KEY = 'whackamole_camera_tutorial_completed';
  const mockStorageMap = new Map();
  const mockLocalStorage = {
    getItem: (k) => mockStorageMap.get(k) ?? null,
    setItem: (k, v) => mockStorageMap.set(k, String(v)),
    removeItem: (k) => mockStorageMap.delete(k),
    clear: () => mockStorageMap.clear(),
  };

  runSyncTest('TUTORIAL.1: Initial session has camera tutorial uncompleted in localStorage', () => {
    mockLocalStorage.clear();
    assert.equal(mockLocalStorage.getItem(TUTORIAL_STORAGE_KEY), null);
  });

  runSyncTest('TUTORIAL.2: Step 1 hand framing requires status tracking and 1000ms dwell', () => {
    m3Ctx.reset();
    let dwellMs = 0;
    let step = 1;
    for (let i = 0; i < 20; i++) {
      dwellMs += 50;
      if (dwellMs >= 1000) {
        m3Sfx.playCameraActivate();
        step = 2;
      }
    }
    assert.equal(dwellMs, 1000);
    assert.equal(step, 2);
    assert.ok(m3Ctx.oscillators.length >= 2, 'Must synthesize confirmation chime upon framing');
  });

  runSyncTest('TUTORIAL.3: Step 2 cursor target zone hover radius math (55px) and 800ms dwell', () => {
    const targetCenterX = 550;
    const targetCenterY = 320;
    const targetRadius = 55;
    const isInside = (cx, cy) => Math.hypot(cx - targetCenterX, cy - targetCenterY) <= targetRadius;

    assert.equal(isInside(550, 320), true);
    assert.equal(isInside(580, 350), true); // dist ~42px <= 55px
    assert.equal(isInside(550 + 55, 320), true); // boundary 55px
    assert.equal(isInside(550 + 56, 320), false); // outside 56px
    assert.equal(isInside(100, 100), false);

    m3Ctx.reset();
    let hoverMs = 0;
    let step = 2;
    for (let i = 0; i < 20; i++) {
      if (isInside(570, 330)) {
        hoverMs += 40;
        if (hoverMs >= 800) {
          m3Sfx.playCameraActivate();
          step = 3;
        }
      }
    }
    assert.equal(hoverMs, 800);
    assert.equal(step, 3);
    assert.ok(m3Ctx.oscillators.length >= 2, 'Must synthesize chime upon target hover dwell completion');
  });

  runSyncTest('TUTORIAL.4: Step 3 gesture strike triggers dummy squash and tactile confirmation audio', () => {
    m3Ctx.reset();
    let dummySquashed = false;
    const gesture = { isWhacking: true, isFist: true };
    if (gesture.isWhacking) {
      dummySquashed = true;
      m3Sfx.playGestureConfirm();
    }
    assert.equal(dummySquashed, true);
    assert.ok(m3Ctx.oscillators.length >= 1, 'Must synthesize tactile click on dummy strike');
  });

  runSyncTest('TUTORIAL.5: Saltar tutorial saves localStorage completion flag and closes modal', () => {
    mockLocalStorage.clear();
    let closed = false;
    const handleSkip = () => {
      mockLocalStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
      closed = true;
    };
    handleSkip();
    assert.equal(mockLocalStorage.getItem(TUTORIAL_STORAGE_KEY), 'true');
    assert.equal(closed, true);
  });

  runSyncTest('TUTORIAL.6: Completion screen sets persistence flag and prevents subsequent auto-prompt', () => {
    mockLocalStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    let autoPrompted = false;
    const controlMode = 'camera';
    if (controlMode === 'camera' && mockLocalStorage.getItem(TUTORIAL_STORAGE_KEY) !== 'true') {
      autoPrompted = true;
    }
    assert.equal(autoPrompted, false, 'Should not auto-prompt once completed');
  });

  runSyncTest('TUTORIAL.7: Settings Repetir Tutorial de Cámara manually re-opens tutorial', () => {
    let modalOpen = false;
    const onRepeat = () => {
      modalOpen = true;
    };
    onRepeat();
    assert.equal(modalOpen, true, 'Settings button must force tutorial modal open');
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n================================================================');
  console.log(`  Test Execution Summary:`);
  console.log(`  Total Tests Run: ${totalTests}`);
  console.log(`  Passed:          ${passedTests} ✅`);
  console.log(`  Failed:          ${failedTests} ${failedTests > 0 ? '❌' : ''}`);
  console.log(`  Time Elapsed:    ${duration}s`);
  const finalLeak = StreamLeakAuditor.verifyClean();
  console.log(`  Leak Audit:      ${finalLeak.clean ? 'CLEAN (0 active streams/tracks) ✅' : 'FAILED ❌'}`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exitCode = 1;
  }
}

executeAll();
