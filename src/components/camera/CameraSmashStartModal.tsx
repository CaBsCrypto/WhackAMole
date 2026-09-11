import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Sparkles, X, FastForward, CheckCircle2, AlertCircle, Camera, Flame } from 'lucide-react';
import type { HandCursorData, HandGestureState, HandTrackingStatus } from '../../types';
import { sfx } from '../../services/sfx';

export interface CameraSmashStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGame: () => void;
  cursor: HandCursorData | null;
  gesture: HandGestureState;
  status: HandTrackingStatus;
}

export const CameraSmashStartModal: React.FC<CameraSmashStartModalProps> = ({
  isOpen,
  onClose,
  onStartGame,
  cursor,
  gesture,
  status,
}) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isSquashed, setIsSquashed] = useState<boolean>(false);
  const [hasSmashed, setHasSmashed] = useState<boolean>(false);
  const [particles, setParticles] = useState<Array<{ id: number; dx: number; dy: number; emoji: string; rot: number }>>([]);
  const targetRef = useRef<HTMLDivElement>(null);
  const smashTriggeredRef = useRef<boolean>(false);

  // Reset states on open
  useEffect(() => {
    if (isOpen) {
      setIsHovered(false);
      setIsSquashed(false);
      setHasSmashed(false);
      setParticles([]);
      smashTriggeredRef.current = false;
    }
  }, [isOpen]);

  // Magnetic hover hit testing against the practice mole
  useEffect(() => {
    if (!isOpen || hasSmashed) return;
    if (!cursor || !targetRef.current) {
      setIsHovered(false);
      return;
    }

    const rect = targetRef.current.getBoundingClientRect();
    const margin = 45; // Generous margin for comfortable aiming
    const inside =
      cursor.clientX >= rect.left - margin &&
      cursor.clientX <= rect.right + margin &&
      cursor.clientY >= rect.top - margin &&
      cursor.clientY <= rect.bottom + margin;

    setIsHovered(inside);
  }, [cursor, isOpen, hasSmashed]);

  // Execute the Smash action
  const triggerSmash = useCallback(() => {
    if (smashTriggeredRef.current || hasSmashed) return;
    smashTriggeredRef.current = true;
    setHasSmashed(true);
    setIsSquashed(true);

    // Audio & Haptic Punch
    try {
      sfx.playGestureConfirm();
      sfx.playMoleHit('fast');

    } catch {}

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([40, 30, 80]);
      } catch {}
    }

    // Splatter particles
    const items = ['🍕', '💥', '✨', '🔥', '⭐', '🧀', '🍅', '⚡'];
    const newParticles = Array.from({ length: 16 }).map((_, i) => {
      const angle = (i / 16) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 80 + Math.random() * 100;
      return {
        id: Date.now() + i,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        emoji: items[Math.floor(Math.random() * items.length)],
        rot: (Math.random() - 0.5) * 360,
      };
    });
    setParticles(newParticles);

    // Launch game after satisfying squash
    setTimeout(() => {
      onStartGame();
    }, 480);
  }, [hasSmashed, onStartGame]);

  // Strike detection on hover
  useEffect(() => {
    if (!isOpen || !isHovered || hasSmashed || smashTriggeredRef.current) return;
    if (gesture.isWhacking || gesture.isPinching || gesture.isFist) {
      triggerSmash();
    }
  }, [isOpen, isHovered, gesture.isWhacking, gesture.isPinching, gesture.isFist, hasSmashed, triggerSmash]);

  // Calculate pinch progress for visual gauge
  const pinchProgress = isHovered
    ? gesture.isFist || gesture.isPinching
      ? 100
      : gesture.pinchDistance !== undefined
      ? Math.max(0, Math.min(100, Math.round((1 - (gesture.pinchDistance - 0.15) / 0.65) * 100)))
      : 35
    : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md select-none animate-fade-in">
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/95 border border-amber-500/30 rounded-3xl p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col items-center text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center border border-white/10 transition cursor-pointer"
          title="Cerrar y volver al menú"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hand Status Pill */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/90 border border-white/10 mb-4 shadow-sm">
          {status === 'tracking' ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="text-xs font-bold text-emerald-300">✅ Mano Detectada</span>
            </>
          ) : (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-bold text-amber-300">📷 Muestra tu mano a la cámara</span>
            </>
          )}
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-black text-white font-display uppercase tracking-wide mb-1">
          ¡Golpe de Prueba!
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-xs mb-5 font-medium">
          Apunta con la mano al topo de prueba y <strong className="text-amber-400 font-bold">junta tus dedos (👌) o cierra el puño (✊)</strong> para iniciar la partida.
        </p>

        {/* Giant Interactive Practice Target */}
        <div
          ref={targetRef}
          onClick={triggerSmash}
          className={`relative w-44 h-44 sm:w-48 sm:h-48 rounded-full cursor-pointer flex flex-col items-center justify-center border-4 transition-all duration-200 group ${
            isSquashed
              ? 'scale-75 bg-red-600 border-yellow-300 shadow-[0_0_70px_rgba(239,68,68,1)]'
              : isHovered
              ? 'scale-110 bg-gradient-to-b from-amber-600 via-orange-500 to-red-600 border-yellow-300 shadow-[0_0_50px_rgba(245,158,11,0.9)] -translate-y-1'
              : 'bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 border-amber-500/50 shadow-[0_10px_30px_rgba(0,0,0,0.6)] hover:border-amber-400'
          }`}
        >
          {/* Animated Background Beacon */}
          <div
            className={`absolute inset-0 rounded-full transition-opacity duration-300 pointer-events-none ${
              isHovered ? 'opacity-100' : 'opacity-30'
            }`}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400/20 to-orange-500/20 animate-spin" />
          </div>

          {/* Mole / Target Graphic */}
          <div className="relative z-10 flex flex-col items-center justify-center">
            {isSquashed ? (
              <span className="text-6xl sm:text-7xl animate-bounce">💥</span>
            ) : isHovered ? (
              <>
                <span className="text-6xl sm:text-7xl drop-shadow-[0_0_15px_rgba(255,255,255,0.9)] animate-pulse">
                  🥊
                </span>
                <span className="text-[11px] font-black text-white uppercase tracking-wider bg-red-700/80 px-2 py-0.5 rounded-full mt-1 border border-yellow-300 shadow">
                  ¡GOLPEA AHORA!
                </span>
              </>
            ) : (
              <>
                <span className="text-5xl sm:text-6xl transition-transform group-hover:scale-110">
                  🐹
                </span>
                <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider bg-slate-900/80 px-2.5 py-0.5 rounded-full mt-1 border border-amber-500/30">
                  TOPO DE PRUEBA
                </span>
              </>
            )}
          </div>

          {/* Lock-on Badge */}
          {isHovered && !isSquashed && (
            <div className="absolute -top-3 px-2.5 py-0.5 rounded-full bg-yellow-400 text-slate-950 font-black text-[10px] tracking-widest uppercase shadow-lg animate-bounce">
              ¡BLOQUEADO!
            </div>
          )}

          {/* Burst Particles */}
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

        {/* Pinch Closure Gauge */}
        <div className="w-full max-w-[240px] mt-6 flex flex-col items-center gap-1">
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-white/20 p-0.5 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-100 ${
                pinchProgress > 70
                  ? 'bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)]'
                  : 'bg-gradient-to-r from-amber-500 to-yellow-400'
              }`}
              style={{ width: `${pinchProgress}%` }}
            />
          </div>
          <div className="flex justify-between w-full text-[10px] font-bold text-slate-400 px-1">
            <span>Fuerza de agarre</span>
            <span className={isHovered ? 'text-amber-300 font-black' : ''}>
              {pinchProgress >= 90 ? '¡SMASH!' : `${pinchProgress}%`}
            </span>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="w-full mt-6 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition border border-white/10 cursor-pointer"
          >
            Volver al Menú
          </button>

          <button
            onClick={() => {
              sfx.playButtonClick();
              onStartGame();
            }}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white rounded-xl text-xs font-black uppercase font-display tracking-wider transition shadow-md shadow-orange-500/20 border border-amber-400/40 flex items-center justify-center gap-1.5 cursor-pointer hover:scale-105"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>Iniciar Ya</span>
          </button>
        </div>
      </div>
    </div>
  );
};
