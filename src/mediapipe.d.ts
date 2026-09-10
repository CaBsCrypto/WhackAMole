declare module '@mediapipe/tasks-vision' {
  export interface NormalizedLandmark {
    x: number;
    y: number;
    z?: number;
    visibility?: number;
  }

  export interface Category {
    index: number;
    score: number;
    categoryName: string;
    displayName: string;
  }

  export interface HandLandmarkerResult {
    landmarks: NormalizedLandmark[][];
    worldLandmarks?: NormalizedLandmark[][];
    handedness?: Category[][];
    handednesses?: Category[][];
  }

  export interface HandLandmarkerOptions {
    baseOptions?: {
      modelAssetPath?: string;
      delegate?: 'CPU' | 'GPU';
    };
    runningMode?: 'IMAGE' | 'VIDEO';
    numHands?: number;
    minHandDetectionConfidence?: number;
    minHandPresenceConfidence?: number;
    minTrackingConfidence?: number;
  }

  export class HandLandmarker {
    static HAND_CONNECTIONS: Array<{ start: number; end: number }>;
    static createFromOptions(
      wasmFileset: unknown,
      options: HandLandmarkerOptions
    ): Promise<HandLandmarker>;
    detectForVideo(
      videoFrame: HTMLVideoElement | HTMLCanvasElement | ImageData,
      timestampMs: number
    ): HandLandmarkerResult;
    close(): void;
  }

  export class FilesetResolver {
    static forVisionTasks(wasmPath: string): Promise<unknown>;
  }

  export class DrawingUtils {
    constructor(context: CanvasRenderingContext2D);
    drawConnectors(
      landmarks: NormalizedLandmark[],
      connections: Array<{ start: number; end: number }>,
      style?: { color?: string; lineWidth?: number }
    ): void;
    drawLandmarks(
      landmarks: NormalizedLandmark[],
      style?: { color?: string; fillColor?: string; lineWidth?: number; radius?: number }
    ): void;
  }
}
