/**
 * Authoritative Scale-Invariant Gesture Recognition Engine & FSM
 * Based on PROJECT.md §F7, §F8 and explorer_survey_3 §2.2.
 */

import { Landmark3D } from './landmarkSynthesizer';

export interface GestureMetrics {
  scale: number;
  pinchDistance: number;
  pinchRatio: number;
  curledCount: number;
  isFistCandidate: boolean;
  isPinchCandidate: boolean;
}

export interface GestureEvaluationResult {
  metrics: GestureMetrics;
  isWhacking: boolean;
  activeGesture: 'none' | 'pinch' | 'fist';
  fsmState: 'IDLE' | 'COOLDOWN' | 'WAITING_RELEASE';
  remainingCooldownMs: number;
}

export class GestureClassifier {
  public static readonly PINCH_TRIGGER_RATIO = 0.22;
  public static readonly PINCH_RELEASE_RATIO = 0.32;
  public static readonly FINGER_CURLED_RATIO = 0.45;
  public static readonly WRIST_TO_MIDDLE_MAX_RATIO = 1.15;
  public static readonly FIST_TRIGGER_CURLED_COUNT = 3;
  public static readonly FIST_RELEASE_CURLED_COUNT = 1;
  public static readonly COOLDOWN_DURATION_MS = 260;

  // FSM State
  private state: 'IDLE' | 'COOLDOWN' | 'WAITING_RELEASE' = 'IDLE';
  private lastWhackTimestamp: number = 0;
  private activeWhackType: 'none' | 'pinch' | 'fist' = 'none';

  // Temporal EMA State
  private smoothX: number | null = null;
  private smoothY: number | null = null;
  private prevRawX: number | null = null;
  private prevRawY: number | null = null;
  private prevTimestamp: number | null = null;

  public reset(): void {
    this.state = 'IDLE';
    this.lastWhackTimestamp = 0;
    this.activeWhackType = 'none';
    this.smoothX = null;
    this.smoothY = null;
    this.prevRawX = null;
    this.prevRawY = null;
    this.prevTimestamp = null;
  }

  /**
   * Calculates scale-invariant geometric metrics from 21 MediaPipe landmarks.
   */
  public static computeMetrics(landmarks: Landmark3D[]): GestureMetrics {
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

    const dist3d = (a: Landmark3D, b: Landmark3D) => {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dz = (a.z ?? 0) - (b.z ?? 0);
      return Math.hypot(dx, dy, dz);
    };

    // Rigid reference scale: Wrist (0) to Middle MCP (9)
    const scale = Math.max(0.001, dist3d(landmarks[0], landmarks[9]));

    // Pinch: Thumb Tip (4) to Index Tip (8)
    const pinchDist = dist3d(landmarks[4], landmarks[8]);
    const pinchRatio = pinchDist / scale;
    const isPinchCandidate = pinchRatio < this.PINCH_TRIGGER_RATIO;

    // Fingers curled relative to their respective MCP bases
    let curledCount = 0;
    // Index: tip 8 to MCP 5
    if (dist3d(landmarks[8], landmarks[5]) / scale < this.FINGER_CURLED_RATIO) curledCount++;
    // Middle: tip 12 to MCP 9
    if (dist3d(landmarks[12], landmarks[9]) / scale < this.FINGER_CURLED_RATIO) curledCount++;
    // Ring: tip 16 to MCP 13
    if (dist3d(landmarks[16], landmarks[13]) / scale < this.FINGER_CURLED_RATIO) curledCount++;
    // Pinky: tip 20 to MCP 17
    if (dist3d(landmarks[20], landmarks[17]) / scale < this.FINGER_CURLED_RATIO) curledCount++;

    const wristToMiddleRatio = dist3d(landmarks[12], landmarks[0]) / scale;
    const isFistCandidate =
      curledCount >= this.FIST_TRIGGER_CURLED_COUNT &&
      wristToMiddleRatio < this.WRIST_TO_MIDDLE_MAX_RATIO;

    return {
      scale,
      pinchDistance: pinchDist,
      pinchRatio,
      curledCount,
      isFistCandidate,
      isPinchCandidate,
    };
  }

  /**
   * Evaluates hand frame against anti-spam FSM and cooldown.
   */
  public evaluateFrame(landmarks: Landmark3D[], currentTimestamp: number): GestureEvaluationResult {
    const metrics = GestureClassifier.computeMetrics(landmarks);
    let isWhacking = false;
    let remainingCooldown = Math.max(0, this.COOLDOWN_DURATION_MS - (currentTimestamp - this.lastWhackTimestamp));

    // Handle Cooldown state expiration
    if (this.state === 'COOLDOWN') {
      if (remainingCooldown === 0) {
        // Cooldown passed, check if gesture is still engaged
        const stillEngaged =
          (this.activeWhackType === 'fist' && metrics.curledCount > GestureClassifier.FIST_RELEASE_CURLED_COUNT) ||
          (this.activeWhackType === 'pinch' && metrics.pinchRatio < GestureClassifier.PINCH_RELEASE_RATIO);

        if (stillEngaged) {
          this.state = 'WAITING_RELEASE';
        } else {
          this.state = 'IDLE';
          this.activeWhackType = 'none';
        }
      }
    }

    // Handle WAITING_RELEASE state (prevents holding fist from continuous whacking)
    if (this.state === 'WAITING_RELEASE') {
      const released =
        metrics.curledCount <= GestureClassifier.FIST_RELEASE_CURLED_COUNT &&
        metrics.pinchRatio >= GestureClassifier.PINCH_RELEASE_RATIO;

      if (released) {
        this.state = 'IDLE';
        this.activeWhackType = 'none';
      }
    }

    // Handle IDLE state (can trigger new whack)
    if (this.state === 'IDLE') {
      if (metrics.isFistCandidate) {
        isWhacking = true;
        this.activeWhackType = 'fist';
        this.state = 'COOLDOWN';
        this.lastWhackTimestamp = currentTimestamp;
        remainingCooldown = this.COOLDOWN_DURATION_MS;
      } else if (metrics.isPinchCandidate) {
        isWhacking = true;
        this.activeWhackType = 'pinch';
        this.state = 'COOLDOWN';
        this.lastWhackTimestamp = currentTimestamp;
        remainingCooldown = this.COOLDOWN_DURATION_MS;
      }
    }

    return {
      metrics,
      isWhacking,
      activeGesture: this.activeWhackType,
      fsmState: this.state,
      remainingCooldownMs: remainingCooldown,
    };
  }

  /**
   * Applies Velocity-Adaptive Exponential Moving Average (EMA) smoothing.
   */
  public applyAdaptiveSmoothing(
    rawX: number,
    rawY: number,
    timestamp: number
  ): { x: number; y: number; speed: number; alpha: number } {
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

    // Adaptive alpha formula: higher speed = higher alpha (responsiveness), lower speed = lower alpha (jitter rejection)
    const rawAlpha = 0.18 + speed * 16.0 * dt;
    const alpha = Math.max(0.18, Math.min(0.85, rawAlpha));

    this.smoothX = this.smoothX + alpha * (rawX - this.smoothX);
    this.smoothY = this.smoothY + alpha * (rawY - this.smoothY);

    this.prevRawX = rawX;
    this.prevRawY = rawY;
    this.prevTimestamp = timestamp;

    return {
      x: this.smoothX,
      y: this.smoothY,
      speed,
      alpha,
    };
  }
}
