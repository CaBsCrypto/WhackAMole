import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { HandTrackingStatus, HandGestureState, HandCursorData } from '../types';
import { handDetectorService } from '../services/handDetector';

export interface UseHandTrackingOptions {
  enabled: boolean;
  onWhack?: (cursor: HandCursorData) => void;
  onCursorMove?: (cursor: HandCursorData) => void;
}

export interface UseHandTrackingReturn {
  status: HandTrackingStatus;
  errorMessage: string | null;
  cursor: HandCursorData | null;
  gesture: HandGestureState;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  fps: number;
  start: () => Promise<void>;
  stop: () => void;
  retry: () => Promise<void>;
}

// Landmark connectivity bones
const HAND_CONNECTIONS: Array<[number, number]> = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm Knuckles
  [5, 9], [9, 13], [13, 17],
];

export function useHandTracking(options: UseHandTrackingOptions): UseHandTrackingReturn {
  const { enabled, onWhack, onCursorMove } = options;

  const [status, setStatus] = useState<HandTrackingStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cursor, setCursor] = useState<HandCursorData | null>(null);
  const [gesture, setGesture] = useState<HandGestureState>({
    isFist: false,
    isPinching: false,
    isWhacking: false,
    pinchDistance: 1.0,
    fistCurledCount: 0,
  });
  const [fps, setFps] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const isActiveRef = useRef<boolean>(false);
  const lastVideoTimeRef = useRef<number>(-1);
  const frameCountRef = useRef<number>(0);
  const lastFpsCalcTimeRef = useRef<number>(performance.now());

  // Callbacks ref to avoid recreating RAF loop
  const onWhackRef = useRef(onWhack);
  onWhackRef.current = onWhack;
  const onCursorMoveRef = useRef(onCursorMove);
  onCursorMoveRef.current = onCursorMove;

  /**
   * Helper to draw landmark skeleton overlay on PiP canvas.
   */
  const drawSkeleton = useCallback(
    (landmarks: Array<{ x: number; y: number; z?: number }>, currentGesture: HandGestureState) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      if (landmarks.length === 0) return;

      // Draw connection lines
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = currentGesture.isWhacking
        ? '#ef4444' // Crimson on whack
        : currentGesture.isFist
        ? '#f97316' // Orange on fist
        : currentGesture.isPinching
        ? '#eab308' // Yellow on pinch
        : 'rgba(56, 189, 248, 0.7)'; // Cyan default

      ctx.beginPath();
      for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
        const start = landmarks[startIdx];
        const end = landmarks[endIdx];
        if (start && end) {
          ctx.moveTo(start.x * w, start.y * h);
          ctx.lineTo(end.x * w, end.y * h);
        }
      }
      ctx.stroke();

      // Draw landmark dots
      for (let i = 0; i < landmarks.length; i++) {
        const pt = landmarks[i];
        if (!pt) continue;

        const px = pt.x * w;
        const py = pt.y * h;

        ctx.beginPath();
        // Fingertip dots (4, 8, 12, 16, 20) are slightly larger
        const isFingertip = i === 4 || i === 8 || i === 12 || i === 16 || i === 20;
        const radius = isFingertip ? 4.5 : 3;
        ctx.arc(px, py, radius, 0, 2 * Math.PI);

        if (i === 8) {
          // Index tip (primary pointer)
          ctx.fillStyle = '#22c55e'; // Green
        } else if (i === 4) {
          // Thumb tip
          ctx.fillStyle = '#eab308'; // Amber
        } else if (isFingertip) {
          ctx.fillStyle = '#06b6d4'; // Cyan
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        }
        ctx.fill();
      }
    },
    []
  );

  /**
   * Strict 4-step teardown procedure:
   * 1. Cancel RAF inference loop
   * 2. Stop all hardware MediaStream tracks
   * 3. Nullify video element srcObject
   * 4. Close MediaPipe landmarker and free memory
   * 5. Reset all state flags
   */
  const stop = useCallback(() => {
    isActiveRef.current = false;

    // Step 1: Cancel RAF
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // Step 2: Stop all MediaStream tracks (Hardware webcam LED turns off)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
          streamRef.current?.removeTrack(track);
        } catch {}
      });
      streamRef.current = null;
    }

    // Step 3: Clear video element binding
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Clear PiP canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }

    // Step 4: Close HandLandmarker
    handDetectorService.close();

    // Step 5: Reset state
    setStatus('idle');
    setCursor(null);
    setGesture({
      isFist: false,
      isPinching: false,
      isWhacking: false,
      pinchDistance: 1.0,
      fistCurledCount: 0,
    });
    setFps(0);
    lastVideoTimeRef.current = -1;
  }, []);

  /**
   * Main inference loop scheduled via requestAnimationFrame
   */
  const runInferenceLoop = useCallback(() => {
    if (!isActiveRef.current) return;

    const video = videoRef.current;
    if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        const now = performance.now();

        // Calculate FPS
        frameCountRef.current++;
        if (now - lastFpsCalcTimeRef.current >= 1000) {
          const calculatedFps = Math.round(
            (frameCountRef.current * 1000) / (now - lastFpsCalcTimeRef.current)
          );
          setFps(calculatedFps);
          frameCountRef.current = 0;
          lastFpsCalcTimeRef.current = now;
        }

        // Process frame with HandDetectorService
        const frameData = handDetectorService.processFrame(video, now);

        if (frameData.hasHand && frameData.cursor) {
          setStatus('tracking');
          setCursor(frameData.cursor);
          setGesture(frameData.gesture);

          // Invoke callbacks
          onCursorMoveRef.current?.(frameData.cursor);
          if (frameData.gesture.isWhacking) {
            onWhackRef.current?.(frameData.cursor);
          }

          // Draw skeleton on PiP canvas
          drawSkeleton(frameData.cursor.landmarks, frameData.gesture);
        } else {
          setStatus('no-hand-detected');
          setCursor(null);
          setGesture(frameData.gesture);

          // Clear skeleton on canvas
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        }
      }
    }

    if (isActiveRef.current) {
      rafIdRef.current = requestAnimationFrame(runInferenceLoop);
    }
  }, [drawSkeleton]);

  /**
   * Starts camera stream and initializes MediaPipe model.
   */
  const start = useCallback(async () => {
    // Teardown previous instances if any
    stop();

    setErrorMessage(null);
    setStatus('requesting-camera');
    isActiveRef.current = true;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Navegador no compatible con captura de video web (getUserMedia no soportado).');
      }

      // 1. Acquire Webcam Stream (640x480 @ 30-60 FPS)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: 'user',
        },
        audio: false,
      });

      if (!isActiveRef.current) {
        // Unmounted or stopped during getUserMedia
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;

      // 2. Bind to HTMLVideoElement
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((resolve) => {
          if (!videoRef.current) return resolve();
          if (videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            resolve();
          } else {
            videoRef.current.onloadeddata = () => resolve();
          }
        });
        try {
          await videoRef.current.play();
        } catch {}
      }

      // 3. Load MediaPipe Hand Model
      setStatus('loading-model');
      await handDetectorService.init();

      if (!isActiveRef.current) {
        stop();
        return;
      }

      // 4. Begin RAF Inference Loop
      setStatus('tracking');
      lastFpsCalcTimeRef.current = performance.now();
      frameCountRef.current = 0;
      rafIdRef.current = requestAnimationFrame(runInferenceLoop);
    } catch (err: unknown) {
      console.error('[useHandTracking] Initialization failed:', err);

      let friendlyMessage = 'No se pudo iniciar la cámara web.';
      const errorObj = err as { name?: string; message?: string };

      if (errorObj.name === 'NotAllowedError' || errorObj.name === 'PermissionDeniedError') {
        friendlyMessage =
          'Acceso a la cámara denegado. Permite el acceso a la cámara web en los ajustes de tu navegador para jugar con gestos.';
      } else if (errorObj.name === 'NotFoundError' || errorObj.name === 'DevicesNotFoundError') {
        friendlyMessage =
          'No se detectó ninguna cámara web conectada a tu dispositivo. Conecta una cámara para activar el modo gestos.';
      } else if (errorObj.name === 'NotReadableError' || errorObj.name === 'TrackStartError') {
        friendlyMessage =
          'La cámara web está ocupada o siendo utilizada por otra aplicación (Zoom, Teams, Meet). Ciérrala e inténtalo de nuevo.';
      } else if (errorObj.message) {
        friendlyMessage = `Error de visión: ${errorObj.message}`;
      }

      setErrorMessage(friendlyMessage);
      setStatus('error');
      stop();
    }
  }, [stop, runInferenceLoop]);

  const retry = useCallback(async () => {
    await start();
  }, [start]);

  // Synchronize enabled state with camera lifecycle
  useEffect(() => {
    if (enabled) {
      start();
    } else {
      stop();
    }

    return () => {
      stop();
    };
  }, [enabled, start, stop]);

  return {
    status,
    errorMessage,
    cursor,
    gesture,
    videoRef,
    canvasRef,
    fps,
    start,
    stop,
    retry,
  };
}
