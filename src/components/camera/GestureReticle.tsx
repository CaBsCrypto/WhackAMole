import React, { useEffect, useState, useRef } from 'react';
import type { HandCursorData, HandGestureState } from '../../types';

interface GestureReticleProps {
  cursor: HandCursorData | null;
  gesture: HandGestureState;
  active?: boolean;
}

export const GestureReticle: React.FC<GestureReticleProps> = ({
  cursor,
  gesture,
  active = true,
}) => {
  const [impactTriggered, setImpactTriggered] = useState<boolean>(false);
  const [cooldownPercent, setCooldownPercent] = useState<number>(100);
  const reticleRef = useRef<HTMLDivElement>(null);
  const cooldownTimerRef = useRef<number | null>(null);

  // Directly update DOM position for 60 FPS performance without React layout thrashing
  useEffect(() => {
    if (!reticleRef.current) return;
    if (cursor) {
      reticleRef.current.style.transform = `translate3d(${cursor.clientX}px, ${cursor.clientY}px, 0)`;
      reticleRef.current.style.opacity = '1';
    } else {
      reticleRef.current.style.opacity = '0';
    }
  }, [cursor]);

  // Handle Whack Impact and Cooldown Recharge Animation
  useEffect(() => {
    if (gesture.isWhacking) {
      setImpactTriggered(true);
      setCooldownPercent(0);

      const impactTimeout = window.setTimeout(() => {
        setImpactTriggered(false);
      }, 220);

      const startTime = performance.now();
      const duration = 260; // 260ms cooldown

      const updateCooldown = () => {
        const elapsed = performance.now() - startTime;
        const p = Math.min(100, Math.round((elapsed / duration) * 100));
        setCooldownPercent(p);
        if (p < 100) {
          cooldownTimerRef.current = requestAnimationFrame(updateCooldown);
        }
      };
      cooldownTimerRef.current = requestAnimationFrame(updateCooldown);

      return () => {
        clearTimeout(impactTimeout);
        if (cooldownTimerRef.current) cancelAnimationFrame(cooldownTimerRef.current);
      };
    }
  }, [gesture.isWhacking]);

  if (!active) return null;

  const isStriking = gesture.isFist || gesture.isPinching || impactTriggered;

  // Continuous contraction: as fingers close (pinchDistance drops from ~0.8 to < 0.22),
  // scale smoothly contracts inward from 1.0 down to ~0.70.
  const pinchScale = Math.max(
    0.68,
    Math.min(1.0, 0.46 + (gesture.pinchDistance !== undefined ? gesture.pinchDistance * 1.08 : 0.54))
  );

  // On strike trigger, snap closure to scale-60
  const currentScale = isStriking ? 0.60 : pinchScale;

  return (
    <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden select-none">
      <div
        ref={reticleRef}
        className="absolute top-0 left-0 -ml-7 -mt-7 w-14 h-14 flex items-center justify-center transition-opacity duration-200 will-change-transform"
        style={{ opacity: 0 }}
      >
        {/* Whack Impact Shockwave (Expanding Wave on Strike) */}
        {impactTriggered && (
          <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-90" />
        )}

        {/* Outer Inward-Compressing Ring (Continuous Contraction + scale-60 Snap Closure) */}
        <div
          className={`absolute inset-0 rounded-full border-2 border-dashed transition-all duration-100 ${
            isStriking
              ? 'border-red-500 bg-red-500/20 shadow-[0_0_24px_rgba(239,68,68,0.9)] animate-none'
              : 'border-amber-400/80 animate-[spin_6s_linear_infinite]'
          }`}
          style={{ transform: `scale(${currentScale})` }}
        />

        {/* Inward Optical Aperture Brackets */}
        <div
          className={`absolute -top-1 left-1/2 w-2.5 h-1 rounded-full transition-all duration-100 ${
            isStriking
              ? 'bg-red-400 shadow-[0_0_8px_rgba(239,68,68,1)]'
              : 'bg-amber-300/80'
          }`}
          style={{ transform: `translateX(-50%) translateY(${isStriking ? '7px' : `${(1 - currentScale) * 14}px`})` }}
        />
        <div
          className={`absolute -bottom-1 left-1/2 w-2.5 h-1 rounded-full transition-all duration-100 ${
            isStriking
              ? 'bg-red-400 shadow-[0_0_8px_rgba(239,68,68,1)]'
              : 'bg-amber-300/80'
          }`}
          style={{ transform: `translateX(-50%) translateY(${isStriking ? '-7px' : `-${(1 - currentScale) * 14}px`})` }}
        />
        <div
          className={`absolute top-1/2 -left-1 w-1 h-2.5 rounded-full transition-all duration-100 ${
            isStriking
              ? 'bg-red-400 shadow-[0_0_8px_rgba(239,68,68,1)]'
              : 'bg-amber-300/80'
          }`}
          style={{ transform: `translateY(-50%) translateX(${isStriking ? '7px' : `${(1 - currentScale) * 14}px`})` }}
        />
        <div
          className={`absolute top-1/2 -right-1 w-1 h-2.5 rounded-full transition-all duration-100 ${
            isStriking
              ? 'bg-red-400 shadow-[0_0_8px_rgba(239,68,68,1)]'
              : 'bg-amber-300/80'
          }`}
          style={{ transform: `translateY(-50%) translateX(${isStriking ? '-7px' : `-${(1 - currentScale) * 14}px`})` }}
        />

        {/* Inner Solid Target Ring with Dynamic Inward Compression */}
        <div
          className={`absolute rounded-full border transition-all duration-100 ${
            isStriking
              ? 'w-7 h-7 border-red-500 bg-red-600/40 shadow-[0_0_20px_rgba(239,68,68,0.9)]'
              : 'w-8 h-8 border-amber-300/80 bg-amber-400/10 shadow-[0_0_12px_rgba(251,191,36,0.4)]'
          }`}
          style={{ transform: `scale(${isStriking ? 0.75 : Math.max(0.75, currentScale * 0.95)})` }}
        />

        {/* Precision Crosshair Tick Marks */}
        <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-amber-300 to-transparent pointer-events-none opacity-70" />
        <div className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-amber-300 to-transparent pointer-events-none opacity-70" />

        {/* Center Target Dot / Fist Icon / Pinch Icon */}
        <div className="relative flex items-center justify-center">
          {gesture.isFist ? (
            <span className="text-sm scale-110 drop-shadow-[0_0_6px_rgba(239,68,68,0.9)] animate-bounce">
              ✊
            </span>
          ) : gesture.isPinching ? (
            <span className="text-sm scale-110 drop-shadow-[0_0_6px_rgba(234,179,8,0.9)] animate-pulse">
              🤏
            </span>
          ) : (
            <div
              className="rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,1)] transition-all duration-100"
              style={{
                width: `${Math.max(4, 8 * (1 - (1 - currentScale) * 0.4))}px`,
                height: `${Math.max(4, 8 * (1 - (1 - currentScale) * 0.4))}px`,
              }}
            />
          )}
        </div>

        {/* Cooldown Recharge Radial Indicator (Below Reticle) */}
        {cooldownPercent < 100 && (
          <div className="absolute -bottom-3.5 flex items-center gap-0.5">
            <div className="w-8 h-1 bg-slate-800/80 rounded-full overflow-hidden border border-white/10 shadow">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-75"
                style={{ width: `${cooldownPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
