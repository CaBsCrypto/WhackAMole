import React, { useState } from 'react';
import { Camera, ChevronDown, RefreshCw, AlertCircle, Hand } from 'lucide-react';
import type { HandTrackingStatus, HandGestureState } from '../../types';

interface CameraPiPViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  status: HandTrackingStatus;
  errorMessage: string | null;
  gesture: HandGestureState;
  fps: number;
  onRetry?: () => void;
  onSwitchToClassic?: () => void;
}

export const CameraPiPView: React.FC<CameraPiPViewProps> = React.memo(({
  videoRef,
  canvasRef,
  status,
  errorMessage,
  gesture,
  fps,
  onRetry,
  onSwitchToClassic,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Status visual configurations
  const getStatusBadge = () => {
    switch (status) {
      case 'tracking':
        return {
          label: 'Rastreando',
          color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-400 animate-pulse',
        };
      case 'no-hand-detected':
        return {
          label: 'Sin Mano',
          color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
          dot: 'bg-amber-400',
        };
      case 'loading-model':
        return {
          label: 'Cargando IA...',
          color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
          dot: 'bg-indigo-400 animate-spin',
        };
      case 'requesting-camera':
        return {
          label: 'Iniciando...',
          color: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
          dot: 'bg-sky-400 animate-pulse',
        };
      case 'error':
        return {
          label: 'Error',
          color: 'bg-red-500/20 text-red-400 border-red-500/30',
          dot: 'bg-red-400',
        };
      case 'idle':
      default:
        return {
          label: 'Inactivo',
          color: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
          dot: 'bg-slate-400',
        };
    }
  };

  const badge = getStatusBadge();

  // Collapsed 44x44 badge
  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="fixed bottom-5 right-5 z-40 w-11 h-11 rounded-2xl bg-slate-900/90 border border-white/20 shadow-2xl flex items-center justify-center text-slate-200 hover:text-white hover:border-orange-500/60 transition-all group backdrop-blur-md"
        title="Expandir vista de cámara MediaPipe"
      >
        <Camera className="w-5 h-5 text-orange-400 group-hover:scale-110 transition-transform" />
        <span
          className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-900 ${badge.dot}`}
        />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 w-[240px] h-[170px] rounded-2xl bg-slate-950/85 border border-white/20 shadow-2xl overflow-hidden flex flex-col backdrop-blur-md select-none transition-all animate-fade-in">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-900/90 border-b border-white/10 z-10">
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${badge.dot}`} />
          <span className="text-[10px] font-black text-white tracking-wider uppercase">
            {badge.label}
          </span>
          {status === 'tracking' && fps > 0 && (
            <span className="text-[9px] font-mono font-bold text-slate-400">
              {fps} FPS
            </span>
          )}
        </div>

        <button
          onClick={() => setIsCollapsed(true)}
          className="w-5 h-5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          title="Minimizar ventana de cámara"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Video & Skeleton Viewport */}
      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
        {/* Hidden / Mirrored Webcam Feed */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* Mirrored Landmark Skeleton Canvas */}
        <canvas
          ref={canvasRef}
          width={240}
          height={140}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* Error Overlay */}
        {status === 'error' && (
          <div className="absolute inset-0 bg-slate-950/95 p-3 flex flex-col items-center justify-center text-center z-20">
            <AlertCircle className="w-6 h-6 text-red-400 mb-1" />
            <p className="text-[10px] text-slate-300 line-clamp-3 mb-2 font-medium">
              {errorMessage || 'Error al conectar con la cámara.'}
            </p>
            <div className="flex items-center gap-1.5">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-2 py-1 bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 transition"
                >
                  <RefreshCw className="w-3 h-3" /> Reintentar
                </button>
              )}
              {onSwitchToClassic && (
                <button
                  onClick={onSwitchToClassic}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg transition"
                >
                  Modo Clásico
                </button>
              )}
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {(status === 'requesting-camera' || status === 'loading-model') && (
          <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center z-10 gap-1.5">
            <RefreshCw className="w-5 h-5 text-orange-400 animate-spin" />
            <span className="text-[10px] font-bold text-slate-300">
              {status === 'requesting-camera' ? 'Activando cámara...' : 'Iniciando MediaPipe...'}
            </span>
          </div>
        )}

        {/* No Hand Guidance Hint */}
        {status === 'no-hand-detected' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 z-10 pointer-events-none animate-pulse">
            <Hand className="w-7 h-7 text-amber-400/80 mb-1" />
            <span className="text-[10px] font-bold text-amber-200">
              Coloca tu mano frente a la cámara
            </span>
          </div>
        )}

        {/* Active Gesture Pill (Bottom Overlay) */}
        {status === 'tracking' && (
          <div className="absolute bottom-1.5 inset-x-2 flex items-center justify-center pointer-events-none z-10">
            {gesture.isFist ? (
              <span className="px-2 py-0.5 rounded-full bg-orange-600/90 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                <span>✊</span> Puño Cerrado (¡Smash!)
              </span>
            ) : gesture.isPinching ? (
              <span className="px-2 py-0.5 rounded-full bg-yellow-500/90 text-black text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                <span>🤏</span> Pellizco (¡Whack!)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-slate-900/80 text-cyan-300 text-[9px] font-bold tracking-wide flex items-center gap-1 border border-cyan-500/30">
                <span>🖐️</span> Apuntar (Cierra puño para golpear)
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
