import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  Hand,
  Target,
  CheckCircle2,
  X,
  FastForward,
  Sparkles,
  Zap,
  Play,
  RotateCcw,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import type { HandTrackingStatus, HandGestureState, HandCursorData } from '../../types';
import { sfx } from '../../services/sfx';

export interface CameraTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  status: HandTrackingStatus;
  cursor: HandCursorData | null;
  gesture: HandGestureState;
}

export const CAMERA_TUTORIAL_STORAGE_KEY = 'whackamole_camera_tutorial_completed';

export const CameraTutorialModal: React.FC<CameraTutorialModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  status,
  cursor,
  gesture,
}) => {
  // Step state: 1 (Hand in frame), 2 (Move cursor to target), 3 (Whack gesture), 4 (Complete)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Hand Framing Progress (0 to 100% over 1000ms dwell)
  const [step1Progress, setStep1Progress] = useState<number>(0);

  // Step 2: Cursor movement into target zone (0 to 100% over 800ms hover dwell)
  const [step2Progress, setStep2Progress] = useState<number>(0);
  const [isInsideTarget, setIsInsideTarget] = useState<boolean>(false);
  const targetRef = useRef<HTMLDivElement>(null);

  // Step 3: Whack strike detection on practice mole dummy
  const [isDummyHit, setIsDummyHit] = useState<boolean>(false);
  const [dummySquash, setDummySquash] = useState<boolean>(false);
  const [poofParticles, setPoofParticles] = useState<Array<{ id: number; dx: number; dy: number; emoji: string }>>([]);

  // Timing references for continuous dwell calculation
  const step1DwellMsRef = useRef<number>(0);
  const step2HoverMsRef = useRef<number>(0);
  const isInsideTargetRef = useRef<boolean>(false);
  const hasTriggeredWhackRef = useRef<boolean>(false);

  // Target radius in pixels
  const TARGET_RADIUS = 55;

  // Completion / Skip handlers
  const handleSkip = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(CAMERA_TUTORIAL_STORAGE_KEY, 'true');
      }
    } catch {
      // Ignore localStorage write errors
    }
    onClose();
  }, [onClose]);

  const handleFinish = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(CAMERA_TUTORIAL_STORAGE_KEY, 'true');
      }
    } catch {
      // Ignore localStorage write errors
    }
    if (onComplete) onComplete();
    onClose();
  }, [onComplete, onClose]);

  // Handle Escape key to skip/close
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleSkip]);

  // Reset steps when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setStep1Progress(0);
      setStep2Progress(0);
      setIsInsideTarget(false);
      setIsDummyHit(false);
      setDummySquash(false);
      setPoofParticles([]);
      step1DwellMsRef.current = 0;
      step2HoverMsRef.current = 0;
      isInsideTargetRef.current = false;
      hasTriggeredWhackRef.current = false;
    }
  }, [isOpen]);

  // =========================================================================
  // STEP 1 LOGIC: "Encuadra tu Mano" (1000ms continuous dwell tracking)
  // =========================================================================
  useEffect(() => {
    if (!isOpen || step !== 1) return;

    const interval = setInterval(() => {
      if (status === 'tracking') {
        step1DwellMsRef.current += 50;
        const pct = Math.min(100, Math.round((step1DwellMsRef.current / 1000) * 100));
        setStep1Progress(pct);

        if (step1DwellMsRef.current >= 1000) {
          clearInterval(interval);
          try {
            sfx.playCameraActivate();
          } catch {}
          setStep(2);
        }
      } else {
        // Continuous dwell lost: reset progress
        step1DwellMsRef.current = 0;
        setStep1Progress(0);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isOpen, step, status]);

  // =========================================================================
  // STEP 2 LOGIC: "Mueve el Cursor" (Hover within target radius 55px for 800ms)
  // =========================================================================
  useEffect(() => {
    if (!isOpen || step !== 2) return;

    // Check if cursor is within target zone
    let inTarget = false;
    if (cursor) {
      let targetCenterX = 0;
      let targetCenterY = 0;

      if (targetRef.current) {
        const rect = targetRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          targetCenterX = rect.left + rect.width / 2;
          targetCenterY = rect.top + rect.height / 2;
        } else {
          // Fallback for headless / test environments
          targetCenterX = typeof window !== 'undefined' ? window.innerWidth * 0.65 : 550;
          targetCenterY = typeof window !== 'undefined' ? window.innerHeight * 0.5 : 320;
        }
      } else {
        targetCenterX = typeof window !== 'undefined' ? window.innerWidth * 0.65 : 550;
        targetCenterY = typeof window !== 'undefined' ? window.innerHeight * 0.5 : 320;
      }

      const dist = Math.hypot(cursor.clientX - targetCenterX, cursor.clientY - targetCenterY);
      if (dist <= TARGET_RADIUS) {
        inTarget = true;
      }
    }

    isInsideTargetRef.current = inTarget;
    setIsInsideTarget(inTarget);
  }, [isOpen, step, cursor]);

  // Step 2 Hover Dwell Timer (800ms continuous hover)
  useEffect(() => {
    if (!isOpen || step !== 2) return;

    const interval = setInterval(() => {
      if (isInsideTargetRef.current) {
        step2HoverMsRef.current += 40;
        const pct = Math.min(100, Math.round((step2HoverMsRef.current / 800) * 100));
        setStep2Progress(pct);

        if (step2HoverMsRef.current >= 800) {
          clearInterval(interval);
          try {
            sfx.playCameraActivate();
          } catch {}
          setStep(3);
        }
      } else {
        step2HoverMsRef.current = 0;
        setStep2Progress(0);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [isOpen, step]);

  // =========================================================================
  // STEP 3 LOGIC: "¡Golpea!" (Strike gesture on practice dummy)
  // =========================================================================
  const triggerDummyHit = useCallback(() => {
    if (hasTriggeredWhackRef.current) return;
    hasTriggeredWhackRef.current = true;
    setIsDummyHit(true);
    setDummySquash(true);

    try {
      sfx.playGestureConfirm();
    } catch {}

    // Emit poof particles
    const particles = Array.from({ length: 10 }, (_, i) => ({
      id: Date.now() + i,
      dx: (Math.random() - 0.5) * 180,
      dy: (Math.random() - 0.5) * 180,
      emoji: ['💥', '⭐', '✨', '💨', '🍕'][i % 5],
    }));
    setPoofParticles(particles);

    // After animation delay, unlock completion screen (Step 4)
    setTimeout(() => {
      setStep(4);
    }, 550);
  }, []);

  useEffect(() => {
    if (!isOpen || step !== 3) return;

    if (gesture.isWhacking && !hasTriggeredWhackRef.current) {
      triggerDummyHit();
    }
  }, [isOpen, step, gesture.isWhacking, triggerDummyHit]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tutorial Modo Cámara"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md select-none"
    >
      {/* Dynamic Cursor Mirror Pointer inside Tutorial Modal */}
      {cursor && (() => {
        const isStrikingMirror = gesture.isWhacking || gesture.isFist || gesture.isPinching;
        const pinchScaleMirror = Math.max(
          0.68,
          Math.min(1.0, 0.46 + (gesture.pinchDistance !== undefined ? gesture.pinchDistance * 1.08 : 0.54))
        );
        const mirrorScale = isStrikingMirror ? 0.60 : pinchScaleMirror;

        return (
          <div
            className="fixed pointer-events-none z-[70] transition-transform duration-75 will-change-transform"
            style={{
              transform: `translate3d(${cursor.clientX - 26}px, ${cursor.clientY - 26}px, 0)`,
            }}
          >
            <div
              className={`w-13 h-13 rounded-full border-2 flex items-center justify-center transition-all duration-100 ${
                isStrikingMirror
                  ? 'border-red-500 bg-red-500/30 shadow-[0_0_24px_rgba(239,68,68,0.9)]'
                  : 'border-amber-400 bg-amber-400/20 shadow-[0_0_16px_rgba(251,191,36,0.7)]'
              }`}
              style={{ transform: `scale(${mirrorScale})` }}
            >
              {gesture.isFist ? (
                <span className="text-base">✊</span>
              ) : gesture.isPinching ? (
                <span className="text-base">🤏</span>
              ) : (
                <div
                  className="rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,1)] transition-all duration-100"
                  style={{
                    width: `${Math.max(4, 10 * (1 - (1 - mirrorScale) * 0.4))}px`,
                    height: `${Math.max(4, 10 * (1 - (1 - mirrorScale) * 0.4))}px`,
                  }}
                />
              )}
            </div>
          </div>
        );
      })()}

      {/* Main Modal Dialog Window */}
      <div className="relative flex flex-col w-full max-w-2xl bg-slate-900/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-fade-in text-white font-body">
        {/* Arcade Neon Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
              <Camera className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-[10px] font-black tracking-wider uppercase text-indigo-300">
                  MediaPipe Hands AI
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Paso {Math.min(3, step)}/3</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-wide text-white font-display">
                Onboarding: Modo Cámara
              </h2>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-2">
            <button
              id="btn_skip_camera_tutorial"
              onClick={handleSkip}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-white/10 transition cursor-pointer"
              title="Saltar tutorial (Esc)"
            >
              <FastForward className="w-3.5 h-3.5 text-amber-400" />
              <span>Saltar tutorial</span>
            </button>

            <button
              id="btn_close_camera_tutorial"
              onClick={handleSkip}
              aria-label="Cerrar ventana"
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center border border-white/10 transition cursor-pointer shrink-0"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Guided Step Progress Bar Tracker */}
        <div className="grid grid-cols-3 gap-2 px-4 sm:px-6 pt-4 pb-2 bg-slate-950/40 border-b border-white/5">
          <div
            className={`flex items-center gap-2 p-2 rounded-xl border transition ${
              step === 1
                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                : step > 1
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900/40 border-white/5 text-slate-500'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                step > 1 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-white'
              }`}
            >
              {step > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
            </div>
            <span className="text-xs font-bold truncate">1. Encuadre</span>
          </div>

          <div
            className={`flex items-center gap-2 p-2 rounded-xl border transition ${
              step === 2
                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                : step > 2
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900/40 border-white/5 text-slate-500'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                step > 2 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-white'
              }`}
            >
              {step > 2 ? <CheckCircle2 className="w-4 h-4" /> : '2'}
            </div>
            <span className="text-xs font-bold truncate">2. Cursor</span>
          </div>

          <div
            className={`flex items-center gap-2 p-2 rounded-xl border transition ${
              step === 3
                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                : step > 3
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900/40 border-white/5 text-slate-500'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                step > 3 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-white'
              }`}
            >
              {step > 3 ? <CheckCircle2 className="w-4 h-4" /> : '3'}
            </div>
            <span className="text-xs font-bold truncate">3. ¡Golpea!</span>
          </div>
        </div>

        {/* Step Content Arena */}
        <div className="p-4 sm:p-6 flex flex-col items-center justify-center min-h-[360px] bg-slate-900/70">
          {/* ================================================================= */}
          {/* STEP 1: Encuadra tu Mano */}
          {/* ================================================================= */}
          {step === 1 && (
            <div className="flex flex-col items-center text-center max-w-md w-full animate-fade-in">
              <div className="relative mb-6">
                {/* Visual Radar / Framing Rings */}
                <div
                  className={`w-36 h-36 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                    status === 'tracking'
                      ? 'border-emerald-500/80 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.35)]'
                      : 'border-indigo-500/30 bg-indigo-500/5'
                  }`}
                >
                  <div
                    className={`w-28 h-28 rounded-full border border-dashed flex items-center justify-center ${
                      status === 'tracking'
                        ? 'border-emerald-400 animate-spin-slow'
                        : 'border-slate-700 animate-[spin_10s_linear_infinite]'
                    }`}
                  >
                    <Hand
                      className={`w-14 h-14 transition-colors duration-200 ${
                        status === 'tracking' ? 'text-emerald-400 scale-110' : 'text-slate-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Progress Dwell Ring around the Framing Zone */}
                {status === 'tracking' && (
                  <svg className="absolute -inset-2 w-40 h-40 -rotate-90 pointer-events-none">
                    <circle
                      cx="80"
                      cy="80"
                      r="76"
                      className="stroke-emerald-500/30 fill-none"
                      strokeWidth="4"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="76"
                      className="stroke-emerald-400 fill-none transition-all duration-75"
                      strokeWidth="5"
                      strokeDasharray={477}
                      strokeDashoffset={477 - (477 * step1Progress) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-white font-display mb-2">
                1. Encuadra tu Mano
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mb-5 leading-relaxed">
                Coloca tu mano abierta frente a la cámara web a una distancia de{' '}
                <span className="text-indigo-300 font-bold">40 a 70 cm</span>. Manténla quieta un segundo para calibrar el sensor.
              </p>

              {/* Status Pill with Real-Time Indicator */}
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-bold transition mb-4 ${
                  status === 'tracking'
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : status === 'loading-model'
                    ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300'
                    : status === 'requesting-camera'
                    ? 'bg-sky-950/60 border-sky-500/40 text-sky-300'
                    : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                }`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    status === 'tracking'
                      ? 'bg-emerald-400 animate-pulse'
                      : status === 'loading-model'
                      ? 'bg-indigo-400 animate-spin'
                      : 'bg-amber-400'
                  }`}
                />
                <span>
                  {status === 'tracking'
                    ? `¡Mano detectada! Calibrando (${step1Progress}%)...`
                    : status === 'loading-model'
                    ? 'Cargando modelo de visión artificial...'
                    : status === 'requesting-camera'
                    ? 'Iniciando cámara web...'
                    : 'Esperando mano en el encuadre...'}
                </span>
              </div>

              {/* Linear Dwell Fill Bar */}
              <div className="w-full max-w-xs h-2 bg-slate-800 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-75"
                  style={{ width: `${step1Progress}%` }}
                />
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 2: Mueve el Cursor */}
          {/* ================================================================= */}
          {step === 2 && (
            <div className="flex flex-col items-center w-full max-w-lg animate-fade-in">
              <div className="text-center mb-3">
                <h3 className="text-xl sm:text-2xl font-black text-white font-display mb-1">
                  2. Mueve el Cursor
                </h3>
                <p className="text-xs sm:text-sm text-slate-300">
                  Desplaza tu mano libremente en el aire para guiar la retícula hasta el círculo objetivo brillante y mantenla fija{' '}
                  <span className="text-amber-400 font-bold">0.8 segundos</span>.
                </p>
              </div>

              {/* Animated Visual Demonstration: Hand Trajectory Moving Reticle */}
              <div className="w-full mb-3 p-3 bg-slate-950/70 border border-indigo-500/30 rounded-2xl flex flex-col gap-1.5 shadow-lg">
                <div className="flex items-center justify-between text-[11px] font-bold text-indigo-300 px-1">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Demostración de Apuntado:
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Mueve la mano en el aire</span>
                </div>

                <div className="relative w-full h-16 bg-slate-900/90 rounded-xl border border-white/5 overflow-hidden flex items-center px-4">
                  {/* Trajectory Guide Curve */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 400 64">
                    <path
                      d="M 40 44 Q 170 10, 340 32"
                      fill="none"
                      stroke="rgba(251, 191, 36, 0.45)"
                      strokeWidth="2"
                      strokeDasharray="5 4"
                    />
                    <circle cx="160" cy="22" r="2.5" fill="#f59e0b" opacity="0.8" />
                    <circle cx="250" cy="23" r="2.5" fill="#f59e0b" opacity="0.8" />
                  </svg>

                  {/* Origin position marker */}
                  <div className="absolute left-6 bottom-2 flex items-center gap-1 opacity-60">
                    <div className="w-2 h-2 rounded-full bg-indigo-400" />
                    <span className="text-[9px] text-slate-400 font-medium">Inicio</span>
                  </div>

                  {/* Target destination marker */}
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full border border-amber-400/70 bg-amber-400/15 flex items-center justify-center animate-pulse">
                    <Target className="w-4 h-4 text-amber-300" />
                  </div>

                  {/* Animated Hand and Attached Reticle traversing along trajectory */}
                  <motion.div
                    className="absolute top-0 flex flex-col items-center pointer-events-none"
                    animate={{
                      x: ['25px', '160px', '325px', '325px', '25px'],
                      y: ['26px', '6px', '18px', '18px', '26px'],
                    }}
                    transition={{
                      duration: 3.2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      times: [0, 0.45, 0.72, 0.88, 1],
                    }}
                  >
                    <div className="relative flex items-center justify-center">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600/90 border border-indigo-400 text-white flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.7)]">
                        <Hand className="w-4 h-4" />
                      </div>
                      <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full border-2 border-amber-400 border-dashed animate-spin flex items-center justify-center bg-amber-400/20 shadow-[0_0_10px_rgba(251,191,36,0.9)]">
                        <div className="w-1.5 h-1.5 bg-amber-300 rounded-full" />
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Interactive Target Zone Arena */}
              <div className="relative w-full h-44 bg-slate-950/80 rounded-2xl border border-white/10 flex items-center justify-around overflow-hidden shadow-inner p-4">
                {/* Left guidance prompt */}
                <div className="flex flex-col items-center gap-1 opacity-70">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400">
                    <Hand className="w-5 h-5 animate-pulse" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">Mueve tu mano</span>
                </div>

                {/* Interactive Glowing Target Zone (Radius 55px -> 110px diameter) */}
                <div
                  ref={targetRef}
                  id="tutorial_target_zone"
                  className={`relative w-[110px] h-[110px] rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                    isInsideTarget
                      ? 'border-amber-400 bg-amber-400/20 scale-105 shadow-[0_0_35px_rgba(251,191,36,0.6)]'
                      : 'border-dashed border-indigo-400/60 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.25)] animate-pulse'
                  }`}
                >
                  {/* Concentric rings and crosshairs */}
                  <div className="absolute inset-2 rounded-full border border-white/20 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-amber-400/30 border border-amber-400" />
                  </div>
                  <div className="absolute w-full h-[1px] bg-white/20" />
                  <div className="absolute h-full w-[1px] bg-white/20" />

                  {/* Target Icon */}
                  <Target
                    className={`w-8 h-8 transition-transform duration-150 ${
                      isInsideTarget ? 'text-amber-300 scale-125 animate-spin-slow' : 'text-indigo-400'
                    }`}
                  />

                  {/* Radial Progress Ring on Target Hover */}
                  {isInsideTarget && (
                    <svg className="absolute -inset-1.5 w-[122px] h-[122px] -rotate-90 pointer-events-none">
                      <circle
                        cx="61"
                        cy="61"
                        r="58"
                        className="stroke-amber-400/30 fill-none"
                        strokeWidth="4"
                      />
                      <circle
                        cx="61"
                        cy="61"
                        r="58"
                        className="stroke-amber-400 fill-none transition-all duration-75"
                        strokeWidth="4"
                        strokeDasharray={364}
                        strokeDashoffset={364 - (364 * step2Progress) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </div>
              </div>

              {/* Step 2 Feedback Bar */}
              <div className="w-full mt-3 flex items-center justify-between text-xs font-bold text-slate-300 px-1">
                <span>
                  {isInsideTarget
                    ? '🎯 ¡Objetivo fijado! Mantén la posición...'
                    : 'Mueve el cursor hacia el círculo objetivo'}
                </span>
                <span className="text-amber-400 font-mono">{step2Progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-white/10 mt-1.5">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-amber-400 to-amber-300 transition-all duration-75"
                  style={{ width: `${step2Progress}%` }}
                />
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 3: ¡Golpea! */}
          {/* ================================================================= */}
          {step === 3 && (
            <div className="flex flex-col items-center text-center max-w-xl w-full animate-fade-in">
              <h3 className="text-xl sm:text-2xl font-black text-white font-display mb-1">
                3. ¡Golpea!
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mb-3">
                Usa el <span className="text-amber-400 font-bold">pellizco (pinch)</span> o el{' '}
                <span className="text-red-400 font-bold">puño cerrado</span> para asestar un golpe demoledor sobre el topo de prueba.
              </p>

              {/* Visual Demonstration Cards: Pinch vs Fist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mb-3 text-left">
                {/* Card 1: Pellizco (Pinch: Thumb + Index) */}
                <div
                  className={`p-3 rounded-2xl border transition-all duration-200 flex flex-col ${
                    gesture.isPinching
                      ? 'bg-amber-950/70 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)] scale-[1.02]'
                      : 'bg-slate-950/60 border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                      <span className="text-base">🤏</span> Pellizco (Pinch)
                    </span>
                    {gesture.isPinching && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/30 text-[10px] font-bold text-amber-300 border border-amber-500/50 animate-pulse">
                        ¡CONTACTO!
                      </span>
                    )}
                  </div>

                  {/* Animated Pinch Demonstration */}
                  <div className="relative w-full h-20 bg-slate-900/80 rounded-xl border border-white/5 flex items-center justify-center overflow-hidden mb-1.5">
                    <motion.div
                      className="flex items-center justify-center relative select-none"
                      animate={{
                        scale: [1, 0.76, 0.76, 1],
                      }}
                      transition={{
                        duration: 2.2,
                        repeat: Infinity,
                        times: [0, 0.38, 0.68, 1],
                        ease: 'easeInOut',
                      }}
                    >
                      <div className="flex items-center gap-1 text-2xl">
                        <motion.span
                          animate={{ x: [0, 7, 7, 0] }}
                          transition={{ duration: 2.2, repeat: Infinity, times: [0, 0.38, 0.68, 1] }}
                        >
                          👍
                        </motion.span>
                        <motion.span
                          className="scale-x-[-1]"
                          animate={{ x: [0, -7, -7, 0] }}
                          transition={{ duration: 2.2, repeat: Infinity, times: [0, 0.38, 0.68, 1] }}
                        >
                          ☝️
                        </motion.span>
                      </div>

                      {/* Contact Flash Spark at pinch contact */}
                      <motion.div
                        className="absolute text-xl pointer-events-none"
                        animate={{
                          scale: [0, 1.4, 1.4, 0],
                          opacity: [0, 1, 1, 0],
                        }}
                        transition={{
                          duration: 2.2,
                          repeat: Infinity,
                          times: [0, 0.4, 0.66, 0.88],
                        }}
                      >
                        💥
                      </motion.div>
                    </motion.div>
                  </div>
                  <p className="text-[11px] text-slate-300 font-medium">
                    Junta la yema del pulgar con el índice rápidamente.
                  </p>
                </div>

                {/* Card 2: Puño Cerrado (Closed Fist) */}
                <div
                  className={`p-3 rounded-2xl border transition-all duration-200 flex flex-col ${
                    gesture.isFist
                      ? 'bg-red-950/70 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] scale-[1.02]'
                      : 'bg-slate-950/60 border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black uppercase tracking-wider text-red-300 flex items-center gap-1.5">
                      <span className="text-base">✊</span> Puño Cerrado
                    </span>
                    {gesture.isFist && (
                      <span className="px-1.5 py-0.5 rounded bg-red-500/30 text-[10px] font-bold text-red-300 border border-red-500/50 animate-pulse">
                        ¡CERRADO!
                      </span>
                    )}
                  </div>

                  {/* Animated Fist Demonstration */}
                  <div className="relative w-full h-20 bg-slate-900/80 rounded-xl border border-white/5 flex items-center justify-center overflow-hidden mb-1.5">
                    <motion.div
                      className="flex items-center justify-center relative select-none"
                      animate={{
                        scale: [1, 1, 1.15, 1.15, 1],
                      }}
                      transition={{
                        duration: 2.2,
                        repeat: Infinity,
                        times: [0, 0.35, 0.45, 0.7, 1],
                        ease: 'easeInOut',
                      }}
                    >
                      <div className="text-3xl">
                        <motion.span
                          animate={{ opacity: [1, 1, 0, 0, 1] }}
                          transition={{ duration: 2.2, repeat: Infinity, times: [0, 0.38, 0.4, 0.72, 0.74] }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          ✋
                        </motion.span>
                        <motion.span
                          animate={{ opacity: [0, 0, 1, 1, 0] }}
                          transition={{ duration: 2.2, repeat: Infinity, times: [0, 0.38, 0.4, 0.72, 0.74] }}
                          className="flex items-center justify-center"
                        >
                          ✊
                        </motion.span>
                      </div>

                      {/* Impact Shockwave Ring */}
                      <motion.div
                        className="absolute w-12 h-12 rounded-full border-2 border-red-500 pointer-events-none"
                        animate={{
                          scale: [0.5, 0.5, 1.4, 1.4, 0.5],
                          opacity: [0, 0, 0.85, 0, 0],
                        }}
                        transition={{
                          duration: 2.2,
                          repeat: Infinity,
                          times: [0, 0.4, 0.6, 0.7, 1],
                        }}
                      />
                    </motion.div>
                  </div>
                  <p className="text-[11px] text-slate-300 font-medium">
                    Cierra los cuatro dedos contra la palma con firmeza.
                  </p>
                </div>
              </div>

              {/* Live Interactive Proximity Gauge */}
              <div className="w-full p-2.5 rounded-2xl bg-slate-950/80 border border-white/10 flex flex-col gap-1.5 mb-3 shadow-inner text-left">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Proximidad Pulgar-Índice (Sensor Live):
                  </span>
                  <span
                    className={
                      gesture.isPinching
                        ? 'text-amber-400 font-mono font-black animate-pulse'
                        : gesture.isFist
                        ? 'text-red-400 font-mono font-black'
                        : 'text-slate-400 font-mono'
                    }
                  >
                    {gesture.isPinching
                      ? '¡CONTACTO! (100%)'
                      : gesture.isFist
                      ? '¡PUÑO CERRADO!'
                      : `${Math.round(Math.max(0, Math.min(100, (1 - gesture.pinchDistance) * 100)))}%`}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                  <div
                    className={`h-full transition-all duration-75 ${
                      gesture.isPinching
                        ? 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]'
                        : gesture.isFist
                        ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]'
                        : 'bg-gradient-to-r from-indigo-500 via-amber-500 to-amber-400'
                    }`}
                    style={{
                      width: gesture.isPinching || gesture.isFist
                        ? '100%'
                        : `${Math.max(5, Math.min(100, (1 - gesture.pinchDistance) * 100))}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 px-0.5">
                  <span>Dedos separados</span>
                  <span>{gesture.fistCurledCount >= 3 ? 'Puño detectado (3+ dedos)' : `Dedos doblados: ${gesture.fistCurledCount}/4`}</span>
                  <span>Contacto / Golpe</span>
                </div>
              </div>

              {/* Interactive Practice Mole Dummy */}
              <div className="relative mb-3">
                <button
                  type="button"
                  id="btn_practice_mole_dummy"
                  onClick={triggerDummyHit}
                  className={`relative group w-32 h-32 rounded-3xl border-2 flex flex-col items-center justify-center transition-all duration-150 cursor-pointer ${
                    dummySquash
                      ? 'scale-x-125 scale-y-60 bg-red-950/80 border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.8)]'
                      : 'bg-gradient-to-b from-amber-950/60 to-slate-900 border-amber-500/50 hover:border-amber-400 hover:scale-105 shadow-[0_0_25px_rgba(245,158,11,0.25)]'
                  }`}
                  title="¡Haz el gesto de golpe o haz clic para probar!"
                >
                  {/* Mole Dummy Character */}
                  <span className="text-4xl transition-transform group-hover:scale-110 select-none">
                    {dummySquash ? '😵' : '🐹'}
                  </span>
                  <div className="mt-1 px-2 py-0.5 rounded-full bg-slate-950/70 border border-white/10 text-[10px] font-black text-amber-300 uppercase tracking-tighter">
                    {dummySquash ? '¡SQUASH!' : 'Topo Dummy'}
                  </div>
                </button>

                {/* Particle Poof Emitter */}
                {poofParticles.map((p) => (
                  <div
                    key={p.id}
                    className="absolute top-1/2 left-1/2 pointer-events-none text-2xl animate-ping"
                    style={{
                      transform: `translate(${p.dx}px, ${p.dy}px)`,
                    }}
                  >
                    {p.emoji}
                  </div>
                ))}
              </div>

              {/* Live Gesture Detection Pill */}
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-bold transition ${
                  gesture.isWhacking || gesture.isFist || gesture.isPinching
                    ? 'bg-red-950/70 border-red-500 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.5)] scale-105'
                    : 'bg-slate-950/70 border-white/10 text-slate-300'
                }`}
              >
                <Zap
                  className={`w-4 h-4 ${
                    gesture.isWhacking ? 'text-yellow-400 animate-bounce' : 'text-slate-400'
                  }`}
                />
                <span>
                  {gesture.isWhacking
                    ? '💥 ¡Gesto de Golpe detectado!'
                    : gesture.isFist
                    ? '✊ Puño cerrado — ¡Golpea!'
                    : gesture.isPinching
                    ? '🤏 Pellizco detectado — ¡Golpea!'
                    : 'Junta los dedos o cierra el puño sobre el topo dummy'}
                </span>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 4: Completion Screen ("¡Todo Listo para Jugar!") */}
          {/* ================================================================= */}
          {step === 4 && (
            <div className="flex flex-col items-center text-center max-w-md w-full animate-fade-in py-2">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-400 border border-emerald-400/50 flex items-center justify-center text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.5)] mb-4 animate-bounce">
                <Sparkles className="w-9 h-9" />
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-white font-display mb-2">
                ¡Todo Listo para Jugar!
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mb-6">
                Has calibrado la cámara y dominado los 3 movimientos principales con MediaPipe Hands.
              </p>

              {/* Mastery Checklist Cards */}
              <div className="flex flex-col gap-2 w-full mb-6">
                <div className="flex items-center gap-3 p-2.5 bg-slate-950/60 rounded-xl border border-emerald-500/30 text-xs text-left">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-bold text-slate-200">Encuadre continuo verificado</span>
                </div>
                <div className="flex items-center gap-3 p-2.5 bg-slate-950/60 rounded-xl border border-emerald-500/30 text-xs text-left">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-bold text-slate-200">Precisión de cursor 60 FPS dominada</span>
                </div>
                <div className="flex items-center gap-3 p-2.5 bg-slate-950/60 rounded-xl border border-emerald-500/30 text-xs text-left">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-bold text-slate-200">Gesto de impacto registrado con éxito</span>
                </div>
              </div>

              {/* Big Action Finish Button */}
              <button
                id="btn_complete_camera_tutorial"
                onClick={handleFinish}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 hover:from-emerald-500 hover:to-teal-300 text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.4)] transition hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>¡A Jugar en Modo Cámara!</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between p-4 border-t border-white/10 bg-slate-950/80 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>Puedes repetir este tutorial cuando quieras desde Ajustes</span>
          </div>

          {step < 4 && (
            <button
              onClick={handleSkip}
              className="text-slate-400 hover:text-white font-bold transition cursor-pointer"
            >
              Saltar tutorial →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraTutorialModal;
