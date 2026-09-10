import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Flame, HelpCircle, Camera } from 'lucide-react';
import type { HandCursorData, HandGestureState, HandTrackingStatus } from '../../types';
import { sfx } from '../../services/sfx';

export interface CameraSmashToStartProps {
  cursor: HandCursorData | null;
  gesture: HandGestureState;
  status: HandTrackingStatus;
  onSmashStart: () => void;
  onOpenTutorial: () => void;
  onSwitchToClassic?: () => void;
}

export const CameraSmashToStart: React.FC<CameraSmashToStartProps> = ({
  cursor,
  gesture,
  status,
  onSmashStart,
  onOpenTutorial,
  onSwitchToClassic,
}) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isSquashed, setIsSquashed] = useState<boolean>(false);
  const [hasSmashed, setHasSmashed] = useState<boolean>(false);
  const [particles, setParticles] = useState<Array<{ id: number; dx: number; dy: number; emoji: string; rot: number }>>([]);
  const targetRef = useRef<HTMLDivElement>(null);
  const smashTriggeredRef = useRef<boolean>(false);

  // Calculate magnetic hover based on hand cursor coordinates
  useEffect(() => {
    if (hasSmashed) return;
    if (!cursor || !targetRef.current) {
      setIsHovered(false);
      return;
    }

    const rect = targetRef.current.getBoundingClientRect();
    // Generous magnetic detection margin (40px outside target bounding box)
    const margin = 40;
    const inside =
      cursor.clientX >= rect.left - margin &&
      cursor.clientX <= rect.right + margin &&
      cursor.clientY >= rect.top - margin &&
      cursor.clientY <= rect.bottom + margin;

    setIsHovered(inside);
  }, [cursor, hasSmashed]);

  // Handle Smash Execution
  const triggerSmash = useCallback(() => {
    if (smashTriggeredRef.current || hasSmashed) return;
    smashTriggeredRef.current = true;
    setHasSmashed(true);
    setIsSquashed(true);

    // Play tactile auditory punch
    try {
      sfx.playGestureConfirm();
      sfx.playMoleHit('golden');
    } catch {
      // Ignore audio error if blocked
    }

    // Spawn burst particles (pizza slices, stars, fire, sparks)
    const items = ['🍕', '💥', '✨', '🔥', '⭐', '🧀', '🍅', '⚡'];
    const newParticles = Array.from({ length: 14 }).map((_, i) => {
      const angle = (i / 14) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const speed = 70 + Math.random() * 90;
      return {
        id: Date.now() + i,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        emoji: items[Math.floor(Math.random() * items.length)],
        rot: (Math.random() - 0.5) * 360,
      };
    });
    setParticles(newParticles);

    // Haptic vibration feedback on mobile
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([40, 30, 80]);
      } catch {}
    }

    // Launch game after brief satisfying squash celebration
    setTimeout(() => {
      onSmashStart();
    }, 450);
  }, [hasSmashed, onSmashStart]);

  // Detect gesture strike when hovered
  useEffect(() => {
    if (!isHovered || hasSmashed || smashTriggeredRef.current) return;

    // Trigger on pinch (fingers closed) or closed fist
    if (gesture.isWhacking || gesture.isPinching || gesture.isFist) {
      triggerSmash();
    }
  }, [isHovered, gesture.isWhacking, gesture.isPinching, gesture.isFist, hasSmashed, triggerSmash]);

  // Calculate live pinch proximity progress (0 to 100%)
  const pinchProgress = isHovered
    ? gesture.isFist || gesture.isPinching
      ? 100
      : gesture.pinchDistance !== undefined
      ? Math.max(0, Math.min(100, Math.round((1 - (gesture.pinchDistance - 0.15) / 0.65) * 100)))
      : 30
    : 0;

  return (
    <div className="w-full max-w-md flex flex-col items-center select-none relative z-20">
      {/* Live Animated Gesture Onboarding Banner */}
      <div className="w-full mb-3 flex items-center justify-between px-3 py-2 bg-gradient-to-r from-amber-950/80 via-slate-900/90 to-amber-950/80 backdrop-blur-md rounded-2xl border border-amber-500/30 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 text-lg">
            <span className="animate-pulse">👌</span>
            <span className="absolute -bottom-1 -right-1 text-[10px]">💥</span>
          </div>
          <div className="text-left">
            <span className="text-[11px] font-black text-amber-300 tracking-wider uppercase block">
              Control por Gestos Activo
            </span>
            <span className="text-[10px] text-slate-300 font-medium">
              Junta pulgar + índice o cierra el puño sobre el blanco
            </span>
          </div>
        </div>

        <button
          onClick={onOpenTutorial}
          className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 rounded-lg text-[11px] font-bold border border-amber-500/30 transition hover:scale-105 active:scale-95 cursor-pointer"
          title="Ver tutorial de cámara interactivo"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Tutorial</span>
        </button>
      </div>

      {/* Main Interactive Smash Target Area */}
      <div
        ref={targetRef}
        id="btn_play_arcade"
        onClick={triggerSmash}
        className={`relative w-full p-6 sm:p-7 rounded-3xl cursor-pointer transition-all duration-300 flex flex-col items-center justify-center text-center overflow-hidden border-2 group ${
          isSquashed
            ? 'scale-90 bg-red-600 border-yellow-300 shadow-[0_0_60px_rgba(239,68,68,1)]'
            : isHovered
            ? 'scale-105 bg-gradient-to-b from-amber-600/90 via-orange-600/90 to-red-700/90 border-amber-300 shadow-[0_0_50px_rgba(245,158,11,0.9)] -translate-y-1'
            : 'bg-gradient-to-b from-slate-900/90 via-slate-800/90 to-slate-950/90 border-amber-500/40 shadow-[0_12px_35px_rgba(0,0,0,0.6)] hover:border-amber-400'
        }`}
      >
        {/* Pulsing Target Background Beacon Rings */}
        <div
          className={`absolute inset-0 pointer-events-none rounded-3xl transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-20'
          }`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-400/20 via-orange-500/10 to-transparent animate-pulse" />
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl" />
          <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-red-500/20 rounded-full blur-2xl" />
        </div>

        {/* Concentric Arcade Crosshair / Bullseye Visual */}
        <div className="relative mb-3 flex items-center justify-center">
          {/* Outer Pulsing Bullseye Ring */}
          <div
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-dashed flex items-center justify-center transition-all duration-200 ${
              isHovered
                ? 'border-yellow-300 animate-[spin_4s_linear_infinite] scale-110 shadow-[0_0_25px_rgba(253,224,71,0.8)]'
                : 'border-amber-500/50 animate-[spin_10s_linear_infinite]'
            }`}
          >
            {/* Middle Glowing Ring */}
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${
                isHovered
                  ? 'border-red-400 bg-red-500/30 scale-105 shadow-[0_0_15px_rgba(239,68,68,0.8)]'
                  : 'border-amber-400/40 bg-amber-500/10'
              }`}
            >
              {/* Inner Target Core Icon */}
              <div className="relative flex items-center justify-center text-3xl sm:text-4xl">
                {isSquashed ? (
                  <span className="scale-125 animate-bounce">💥</span>
                ) : isHovered ? (
                  <span className="scale-110 drop-shadow-[0_0_12px_rgba(255,255,255,0.9)] animate-pulse">
                    🥊
                  </span>
                ) : (
                  <span className="transition-transform group-hover:scale-110">🎯</span>
                )}
              </div>
            </div>
          </div>

          {/* Magnetic Lock-on Badges */}
          {isHovered && !isSquashed && (
            <div className="absolute -top-2 px-2 py-0.5 rounded-full bg-yellow-400 text-slate-950 font-black text-[10px] tracking-widest uppercase shadow-md animate-bounce">
              ¡BLOQUEADO!
            </div>
          )}
        </div>

        {/* Action Header Title */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className={`w-5 h-5 ${isHovered ? 'text-yellow-300 animate-spin' : 'text-amber-400'}`} />
            <span className="text-xl sm:text-2xl font-black text-white font-display tracking-widest uppercase drop-shadow-md">
              {isHovered ? '¡DALE UN SMASH!' : 'SMASH TO START'}
            </span>
            <Flame className={`w-5 h-5 ${isHovered ? 'text-orange-300 animate-bounce' : 'text-orange-400'}`} />
          </div>

          <p className="text-xs sm:text-sm font-bold text-amber-200/90 max-w-xs leading-tight">
            {isHovered ? (
              <span className="text-yellow-100 font-extrabold">
                👌 ¡Junta los dedos o ✊ cierra el puño ahora!
              </span>
            ) : status === 'tracking' ? (
              'Coloca tu mano sobre este objetivo y junta tus dedos'
            ) : (
              'Muestra tu mano a la cámara o haz clic aquí'
            )}
          </p>
        </div>

        {/* Pinch Proximity / Closure Bar Gauge */}
        <div className="w-full max-w-[260px] mt-4 flex flex-col items-center gap-1.5">
          <div className="w-full h-2.5 bg-slate-950/80 rounded-full overflow-hidden border border-white/20 p-0.5 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-100 ${
                pinchProgress > 70
                  ? 'bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)]'
                  : 'bg-gradient-to-r from-amber-500 to-yellow-400'
              }`}
              style={{ width: `${pinchProgress}%` }}
            />
          </div>

          <div className="flex justify-between w-full text-[10px] font-bold px-1 text-slate-400">
            <span>Mano en posición</span>
            <span className={isHovered ? 'text-amber-300 font-black' : ''}>
              {pinchProgress >= 90 ? '¡SMASH!' : `${pinchProgress}%`}
            </span>
          </div>
        </div>

        {/* Fallback Touch Notice */}
        <div className="mt-3 text-[10px] text-slate-400/80 font-medium">
          (También puedes hacer clic o tocar para iniciar)
        </div>

        {/* Burst Splatter Particle Overlay */}
        <AnimatePresence>
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0.5, rotate: 0 }}
              animate={{ x: p.dx, y: p.dy, opacity: 0, scale: 1.6, rotate: p.rot }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="absolute text-2xl pointer-events-none z-30"
              style={{ left: '50%', top: '50%' }}
            >
              {p.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Switch to Classic Mode Link */}
      {onSwitchToClassic && (
        <button
          onClick={onSwitchToClassic}
          className="mt-3 text-[11px] font-bold text-slate-400 hover:text-white transition flex items-center gap-1.5 hover:underline cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5 text-orange-400" />
          <span>¿Prefieres jugar con mouse o tocar? Cambiar a Modo Clásico</span>
        </button>
      )}
    </div>
  );
};
