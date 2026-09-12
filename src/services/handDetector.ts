import type {
  HandLandmarker,
  HandLandmarkerResult,
  NormalizedLandmark,
} from '@mediapipe/tasks-vision';
import type { HandCursorData, HandGestureState } from '../types';

const VISION_WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';
const HAND_MODEL_CDN =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export interface ProcessedHandFrame {
  cursor: HandCursorData | null;
  gesture: HandGestureState;
  hasHand: boolean;
}

export class HandDetectorService {
  private landmarker: HandLandmarker | null = null;
  private isInitialized = false;

  // Gesture state tracking
  private isFist = false;
  private isPinching = false;
  private lastWhackTime = 0;
  private gestureReleased = true;
  private readonly cooldownMs = 260;

  // Velocity-adaptive smoothing state
  private smoothX = 0.5;
  private smoothY = 0.5;
  private lastRawX = 0.5;
  private lastRawY = 0.5;
  private lastTimestamp = 0;
  private hasPreviousPoint = false;

  // Asymmetric playable margin deadzones:
  // Top & sides standard, bottom wider so the user reaches bottom moles without hands falling out of webcam view.
  private readonly marginX = 0.10;
  private readonly marginYTop = 0.10;
  private readonly marginYBottom = 0.22;

  /**
   * Initializes MediaPipe FilesetResolver and HandLandmarker.
   * Tries GPU delegate first, falls back to CPU if unavailable.
   */
  async init(): Promise<void> {
    if (this.isInitialized && this.landmarker) return;

    const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
    const vision = await FilesetResolver.forVisionTasks(VISION_WASM_CDN);

    try {
      this.landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: HAND_MODEL_CDN,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    } catch (gpuError) {
      console.warn('[HandDetector] GPU delegate failed, falling back to CPU:', gpuError);
      this.landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: HAND_MODEL_CDN,
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    }

    this.isInitialized = true;
  }

  /**
   * Processes a video frame with MediaPipe and runs scale-invariant gesture detection.
   */
  processFrame(
    videoElement: HTMLVideoElement,
    timestampMs: number,
    viewportWidth = window.innerWidth,
    viewportHeight = window.innerHeight
  ): ProcessedHandFrame {
    if (!this.landmarker || !this.isInitialized) {
      return {
        cursor: null,
        gesture: {
          isFist: false,
          isPinching: false,
          isWhacking: false,
          pinchDistance: 1.0,
          fistCurledCount: 0,
        },
        hasHand: false,
      };
    }

    let result: HandLandmarkerResult | null = null;
    try {
      result = this.landmarker.detectForVideo(videoElement, timestampMs);
    } catch (detectErr) {
      console.warn('[HandDetector] detectForVideo frame skipped:', detectErr);
      return {
        cursor: null,
        gesture: {
          isFist: false,
          isPinching: false,
          isWhacking: false,
          pinchDistance: 1.0,
          fistCurledCount: 0,
        },
        hasHand: false,
      };
    }

    if (!result || !result.landmarks || result.landmarks.length === 0 || !result.landmarks[0] || result.landmarks[0].length === 0) {
      // Hand out of frame: reset smoothing anchor & release gestures
      this.hasPreviousPoint = false;
      this.isFist = false;
      this.isPinching = false;
      this.gestureReleased = true;

      return {
        cursor: null,
        gesture: {
          isFist: false,
          isPinching: false,
          isWhacking: false,
          pinchDistance: 1.0,
          fistCurledCount: 0,
        },
        hasHand: false,
      };
    }

    const lm: NormalizedLandmark[] = result.landmarks[0];

    // 1. Scale-invariant reference length: Wrist (0) to Middle MCP (9)
    const wrist = lm[0];
    const middleMcp = lm[9];
    const hScale = Math.max(
      0.001,
      Math.hypot(
        middleMcp.x - wrist.x,
        middleMcp.y - wrist.y,
        (middleMcp.z ?? 0) - (wrist.z ?? 0)
      )
    );

    // 2. Pinch Distance: Thumb Tip (4) to Index Tip (8)
    const thumbTip = lm[4];
    const indexTip = lm[8];
    const rawPinchDist = Math.hypot(
      indexTip.x - thumbTip.x,
      indexTip.y - thumbTip.y,
      (indexTip.z ?? 0) - (thumbTip.z ?? 0)
    );
    const pinchDistance = rawPinchDist / hScale;

    // Pinch Hysteresis: trigger < 0.22, release > 0.32
    if (!this.isPinching && pinchDistance < 0.22) {
      this.isPinching = true;
    } else if (this.isPinching && pinchDistance > 0.32) {
      this.isPinching = false;
    }

    // 3. Closed Fist Evaluation
    // Measure distance from each fingertip to its MCP joint
    // Index (8 -> 5), Middle (12 -> 9), Ring (16 -> 13), Pinky (20 -> 17)
    const indexMcp = lm[5];
    const ringMcp = lm[13];
    const pinkyMcp = lm[17];

    const distIndex = Math.hypot(indexTip.x - indexMcp.x, indexTip.y - indexMcp.y, (indexTip.z ?? 0) - (indexMcp.z ?? 0)) / hScale;
    const distMiddle = Math.hypot(lm[12].x - middleMcp.x, lm[12].y - middleMcp.y, (lm[12].z ?? 0) - (middleMcp.z ?? 0)) / hScale;
    const distRing = Math.hypot(lm[16].x - ringMcp.x, lm[16].y - ringMcp.y, (lm[16].z ?? 0) - (ringMcp.z ?? 0)) / hScale;
    const distPinky = Math.hypot(lm[20].x - pinkyMcp.x, lm[20].y - pinkyMcp.y, (lm[20].z ?? 0) - (pinkyMcp.z ?? 0)) / hScale;

    // A finger is curled if distance to MCP < 0.45 or distance to wrist < 1.15
    let fistCurledCount = 0;
    if (distIndex < 0.45 || Math.hypot(indexTip.x - wrist.x, indexTip.y - wrist.y) / hScale < 1.15) fistCurledCount++;
    if (distMiddle < 0.45 || Math.hypot(lm[12].x - wrist.x, lm[12].y - wrist.y) / hScale < 1.15) fistCurledCount++;
    if (distRing < 0.45 || Math.hypot(lm[16].x - wrist.x, lm[16].y - wrist.y) / hScale < 1.15) fistCurledCount++;
    if (distPinky < 0.45 || Math.hypot(lm[20].x - wrist.x, lm[20].y - wrist.y) / hScale < 1.15) fistCurledCount++;

    // Fist Hysteresis: trigger >= 3 curled fingers, release <= 1
    if (!this.isFist && fistCurledCount >= 3) {
      this.isFist = true;
    } else if (this.isFist && fistCurledCount <= 1) {
      this.isFist = false;
    }

    // 4. Cursor Anchor Selection
    // When clenching fist, fingertips move inward causing pointer jump.
    // Anchor to Middle MCP (9) or knuckle centroid during fist to eliminate jump!
    let rawCursorX: number;
    let rawCursorY: number;

    if (this.isFist) {
      // Knuckle centroid anchor
      rawCursorX = (indexMcp.x + middleMcp.x + ringMcp.x) / 3;
      rawCursorY = (indexMcp.y + middleMcp.y + ringMcp.y) / 3;
    } else if (this.isPinching) {
      // Midpoint between thumb and index
      rawCursorX = (thumbTip.x + indexTip.x) / 2;
      rawCursorY = (thumbTip.y + indexTip.y) / 2;
    } else {
      // Normal open hand pointing with index tip
      rawCursorX = indexTip.x;
      rawCursorY = indexTip.y;
    }

    // Horizontal mirroring (webcam selfie mode)
    const mirroredX = 1.0 - rawCursorX;
    const mirroredY = rawCursorY;

    // 5. Velocity-Adaptive EMA Smoothing
    const now = timestampMs;
    const dt = this.lastTimestamp > 0 ? Math.max(0.001, Math.min(0.1, (now - this.lastTimestamp) / 1000)) : 0.016;
    this.lastTimestamp = now;

    if (!this.hasPreviousPoint) {
      this.smoothX = mirroredX;
      this.smoothY = mirroredY;
      this.lastRawX = mirroredX;
      this.lastRawY = mirroredY;
      this.hasPreviousPoint = true;
    } else {
      const moveDist = Math.hypot(mirroredX - this.lastRawX, mirroredY - this.lastRawY);
      const speed = moveDist / dt;
      // Adaptive alpha: smooth on slow movements (0.18), responsive on quick snaps (up to 0.85)
      const alpha = Math.max(0.18, Math.min(0.85, 0.18 + speed * 1.5));

      this.smoothX += alpha * (mirroredX - this.smoothX);
      this.smoothY += alpha * (mirroredY - this.smoothY);
      this.lastRawX = mirroredX;
      this.lastRawY = mirroredY;
    }

    // 6. Asymmetric Margin calibration: allows reaching bottom holes comfortably
    const clampedX = Math.max(this.marginX, Math.min(1.0 - this.marginX, this.smoothX));
    const clampedY = Math.max(this.marginYTop, Math.min(1.0 - this.marginYBottom, this.smoothY));
    const normX = (clampedX - this.marginX) / (1.0 - 2.0 * this.marginX);
    const normY = (clampedY - this.marginYTop) / (1.0 - this.marginYTop - this.marginYBottom);

    // 7. Coordinate Space Projections
    // Three.js NDC [-1, 1]
    const ndcX = normX * 2.0 - 1.0;
    const ndcY = 1.0 - normY * 2.0;

    // Viewport Pixels
    const clientX = Math.round(normX * viewportWidth);
    const clientY = Math.round(normY * viewportHeight);

    // 8. 260ms Cooldown FSM with Mandatory Release
    const gestureActive = this.isFist || this.isPinching;
    const timeSinceLastWhack = now - this.lastWhackTime;
    const cooldownElapsed = timeSinceLastWhack >= this.cooldownMs;

    // Mandatory release check: un-pinch and un-fist
    if (!this.isFist && !this.isPinching && pinchDistance > 0.32 && fistCurledCount <= 1) {
      this.gestureReleased = true;
    }

    let isWhacking = false;
    if (gestureActive && cooldownElapsed && this.gestureReleased) {
      isWhacking = true;
      this.lastWhackTime = now;
      this.gestureReleased = false; // Must be released before next strike
    }

    const cursor: HandCursorData = {
      rawX: rawCursorX,
      rawY: rawCursorY,
      normX,
      normY,
      clientX,
      clientY,
      ndcX,
      ndcY,
      landmarks: lm.map((pt) => ({ x: pt.x, y: pt.y, z: pt.z })),
    };

    const gesture: HandGestureState = {
      isFist: this.isFist,
      isPinching: this.isPinching,
      isWhacking,
      pinchDistance,
      fistCurledCount,
    };

    return {
      cursor,
      gesture,
      hasHand: true,
    };
  }

  /**
   * Resets internal tracking state.
   */
  resetState(): void {
    this.isFist = false;
    this.isPinching = false;
    this.lastWhackTime = 0;
    this.gestureReleased = true;
    this.hasPreviousPoint = false;
    this.smoothX = 0.5;
    this.smoothY = 0.5;
    this.lastRawX = 0.5;
    this.lastRawY = 0.5;
    this.lastTimestamp = 0;
  }

  /**
   * Closes the MediaPipe HandLandmarker instance and frees memory/textures.
   */
  close(): void {
    if (this.landmarker) {
      try {
        this.landmarker.close();
      } catch (err) {
        console.warn('[HandDetector] Error closing landmarker:', err);
      }
      this.landmarker = null;
    }
    this.isInitialized = false;
    this.resetState();
  }
}

export const handDetectorService = new HandDetectorService();
