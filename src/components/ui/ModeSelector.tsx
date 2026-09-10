import React from 'react';
import { MousePointer, Camera, Sparkles } from 'lucide-react';
import type { ControlMode } from '../../types';
import { sfx } from '../../services/sfx';

interface ModeSelectorProps {
  controlMode: ControlMode;
  onChange: (mode: ControlMode) => void;
  className?: string;
  compact?: boolean;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  controlMode,
  onChange,
  className = '',
  compact = false,
}) => {
  const handleSelect = (mode: ControlMode) => {
    if (mode !== controlMode) {
      sfx.playButtonClick();
      onChange(mode);
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-2xl border border-white/10 ${className}`}>
        <button
          type="button"
          onClick={() => handleSelect('classic')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold text-xs transition-all ${
            controlMode === 'classic'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <MousePointer className="w-4 h-4" />
          <span>Clásico (Mouse/Touch)</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelect('camera')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold text-xs transition-all ${
            controlMode === 'camera'
              ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <Camera className="w-4 h-4 text-orange-300" />
          <span>Cámara (MediaPipe)</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`w-full max-w-sm sm:max-w-md bg-slate-900/80 backdrop-blur-md rounded-2xl p-1.5 border border-white/10 shadow-xl ${className}`}
    >
      <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 px-3 pt-1 pb-1.5 flex items-center justify-between">
        <span>Modo de Control</span>
        {controlMode === 'camera' && (
          <span className="text-orange-400 flex items-center gap-1 font-bold">
            <Sparkles className="w-3 h-3" /> IA Gestual Activa
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {/* Classic Button */}
        <button
          id="btn_mode_classic"
          type="button"
          onClick={() => handleSelect('classic')}
          className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all relative overflow-hidden ${
            controlMode === 'classic'
              ? 'bg-gradient-to-r from-amber-600/90 to-amber-700/90 text-white border border-amber-400/40 shadow-lg'
              : 'bg-slate-950/60 hover:bg-slate-800/60 text-slate-300 border border-white/5'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              controlMode === 'classic' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <MousePointer className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-black uppercase tracking-tight truncate">Modo Clásico</div>
            <div className="text-[10px] text-slate-300/80 line-clamp-1">Mouse & Clics Táctiles</div>
          </div>
        </button>

        {/* MediaPipe Camera Button */}
        <button
          id="btn_mode_camera"
          type="button"
          onClick={() => handleSelect('camera')}
          className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all relative overflow-hidden ${
            controlMode === 'camera'
              ? 'bg-gradient-to-r from-orange-600/95 via-amber-600/95 to-yellow-600/90 text-white border border-orange-400/50 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
              : 'bg-slate-950/60 hover:bg-slate-800/60 text-slate-300 border border-white/5'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              controlMode === 'camera' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <Camera className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-black uppercase tracking-tight truncate flex items-center gap-1">
              <span>Modo Cámara</span>
            </div>
            <div className="text-[10px] text-slate-300/80 line-clamp-1">Gestos MediaPipe Hands</div>
          </div>
        </button>
      </div>
    </div>
  );
};
