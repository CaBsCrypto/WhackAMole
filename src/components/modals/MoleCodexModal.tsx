import React, { useState } from 'react';
import {
  X,
  Zap,
  Bomb,
  Target,
  ChevronRight,
  Sparkles,
  Activity,
  Heart,
  TrendingUp,
} from 'lucide-react';
import { MoleType } from '../../types';

interface MoleCodexModalProps {
  onClose: () => void;
}

interface MoleSpec {
  type: MoleType;
  name: string;
  badge: string;
  badgeColor: string;
  borderColor: string;
  bgGradient: string;
  icon: React.ReactNode;
  health: number;
  speed: string;
  pattern: string;
  points: number;
  coins: number;
  description: string;
  tacticalTip: string;
  visualTraits: string[];
}

const MOLE_SPECS: MoleSpec[] = [
  {
    type: 'standard',
    name: 'Ladrón Novato de Masa',
    badge: 'Topito Chef',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    borderColor: 'hover:border-orange-400/60',
    bgGradient: 'from-orange-950/30 to-slate-900/80',
    icon: <Target className="w-6 h-6 text-orange-400" />,
    health: 1,
    speed: 'Estándar (1.5s)',
    pattern: 'Asomada Clásica de Cocina',
    points: 100,
    coins: 5,
    description: 'El simpático topo clásico con gorro blanco de chef (toque blanche), pañuelo rojo napolitano, bigote italiano y dientes tiernos.',
    tacticalTip: 'Ideal para iniciar y construir multiplicadores de combo de cocina.',
    visualTraits: ['Gorro de Chef Toque Blanche', 'Bigote Italiano Curvado', 'Pañuelo Rojo'],
  },
  {
    type: 'fast',
    name: 'Repartidor Exprés',
    badge: 'Velocista Ágil',
    badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    borderColor: 'hover:border-cyan-400/60',
    bgGradient: 'from-cyan-950/40 to-slate-900/80',
    icon: <Zap className="w-6 h-6 text-cyan-400" />,
    health: 1,
    speed: 'Ultra Rápido (0.8s)',
    pattern: 'Finta Instantánea & Salto',
    points: 220,
    coins: 15,
    description: 'Equipado con visera roja de reparto, gafas de velocidad y mochila de pizza en miniatura. Asoma por décimas de segundo antes de huir con la masa.',
    tacticalTip: 'Anticípate al agujero en cuanto divises la visera roja; ¡requiere reflejos de chef experto!',
    visualTraits: ['Visera de Repartidor', 'Gafas de Velocidad Cian', 'Mochila de Pizza'],
  },
  {
    type: 'bomb',
    name: 'Piña Prohibida / Habanero Explosivo',
    badge: '¡PELIGRO / NO GOLPEAR!',
    badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30',
    borderColor: 'hover:border-red-500/60',
    bgGradient: 'from-red-950/40 to-slate-900/80',
    icon: <Bomb className="w-6 h-6 text-red-500" />,
    health: 1,
    speed: 'Estándar (1.4s)',
    pattern: 'Mecha Chispeante & Tallo de Chile',
    points: -250,
    coins: 0,
    description: 'Cuerpo volcánico oscuro con ojos ardientes, tallo de chile habanero y una mecha encendida.',
    tacticalTip: '¡NUNCA GOLPEAR! Arruinará la pizza del chef, restará 250 puntos y romperá de inmediato tu racha de combo.',
    visualTraits: ['Cuerpo Oscuro Volcánico', 'Ojos Rojos Calavera', 'Mecha Encendida'],
  },
];



interface MoleCodexModalProps {
  onClose: () => void;
}

interface MoleSpec {
  type: MoleType;
  name: string;
  badge: string;
  badgeColor: string;
  borderColor: string;
  bgGradient: string;
  icon: React.ReactNode;
  health: number;
  speed: string;
  pattern: string;
  points: number;
  coins: number;
  description: string;
  tacticalTip: string;
  visualTraits: string[];
}




export const MoleCodexModal: React.FC<MoleCodexModalProps> = ({ onClose }) => {
  const [selectedMole, setSelectedMole] = useState<MoleSpec>(MOLE_SPECS[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in select-none">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/80 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-slate-900 shadow-md">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-wide uppercase font-display">Bestiario: Ladrones de Pizza</h2>
              <p className="text-xs text-slate-400 font-body font-medium">Guía culinaria táctica de las 3 especies de topos y sus puntos débiles</p>

            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center border border-white/10 transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Left List + Right Detail */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Left: Species Selector Carousel / List */}
          <div className="md:col-span-5 border-r border-white/10 p-4 overflow-y-auto space-y-2 bg-slate-950/40">
            {MOLE_SPECS.map((spec) => {
              const isSelected = selectedMole.type === spec.type;
              return (
                <div
                  key={spec.type}
                  onClick={() => setSelectedMole(spec)}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/90 border-orange-500/60 shadow-[0_0_15px_rgba(249,115,22,0.2)]'
                      : 'bg-slate-900/50 border-white/5 hover:bg-slate-800/40 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-slate-800 border border-white/10`}>
                      {spec.icon}
                    </div>
                    <div>
                      <div className="text-sm font-display font-bold text-white flex items-center gap-1.5">
                        {spec.name}
                      </div>

                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${spec.badgeColor}`}>
                        {spec.badge}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-orange-400 translate-x-0.5' : 'text-slate-600'}`} />
                </div>
              );
            })}
          </div>

          {/* Right: Selected Mole Intelligence & Traits */}
          <div className="md:col-span-7 p-6 overflow-y-auto bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              {/* Species Hero Header */}
              <div className={`p-5 rounded-3xl border border-white/10 bg-gradient-to-r ${selectedMole.bgGradient} flex items-center justify-between shadow-xl`}>
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900/80 border border-white/20 flex items-center justify-center shadow-lg">
                    {selectedMole.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-black text-white">{selectedMole.name}</h3>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${selectedMole.badgeColor}`}>
                      {selectedMole.badge}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-400 uppercase font-black tracking-wider">Reward</div>
                  <div className={`text-lg font-black font-mono ${selectedMole.points < 0 ? 'text-red-400' : 'text-amber-400'}`}>
                    {selectedMole.points > 0 ? `+${selectedMole.points}` : selectedMole.points} PTS
                  </div>
                  {selectedMole.coins > 0 && (
                    <div className="text-xs font-bold text-yellow-400 font-mono">+{selectedMole.coins} COINS</div>
                  )}
                </div>
              </div>

              {/* Core Combat Telemetry Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-800/60 rounded-2xl border border-white/5 flex flex-col">
                  <span className="text-[10px] uppercase font-black text-slate-400 flex items-center gap-1 mb-1">
                    <Heart className="w-3 h-3 text-rose-400" /> Health Points
                  </span>
                  <div className="text-base font-black text-white font-mono flex items-center gap-1">
                    {Array.from({ length: selectedMole.health }).map((_, i) => (
                      <span key={i} className="inline-block w-2.5 h-4 bg-rose-500 rounded-sm" />
                    ))}
                    <span className="ml-1 text-xs text-slate-400">({selectedMole.health} HP)</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-800/60 rounded-2xl border border-white/5 flex flex-col">
                  <span className="text-[10px] uppercase font-black text-slate-400 flex items-center gap-1 mb-1">
                    <Activity className="w-3 h-3 text-cyan-400" /> Pop-Up Speed
                  </span>
                  <div className="text-sm font-bold text-white truncate">{selectedMole.speed}</div>
                </div>

                <div className="p-3 bg-slate-800/60 rounded-2xl border border-white/5 flex flex-col">
                  <span className="text-[10px] uppercase font-black text-slate-400 flex items-center gap-1 mb-1">
                    <TrendingUp className="w-3 h-3 text-amber-400" /> Motion Pattern
                  </span>
                  <div className="text-xs font-bold text-amber-300 truncate">{selectedMole.pattern}</div>
                </div>
              </div>

              {/* Description */}
              <div className="p-4 bg-slate-800/40 rounded-2xl border border-white/5 space-y-1.5">
                <h4 className="text-xs uppercase font-display font-bold text-slate-300 tracking-wider">Species Behavior</h4>
                <p className="text-xs text-slate-300 leading-relaxed font-body">{selectedMole.description}</p>
              </div>

              {/* Tactical Tip */}
              <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 space-y-1">
                <h4 className="text-xs uppercase font-display font-bold text-amber-400 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Pro Whacker Tip
                </h4>
                <p className="text-xs text-amber-200/90 leading-relaxed font-body">{selectedMole.tacticalTip}</p>
              </div>

              {/* 3D Visual Traits */}
              <div className="space-y-2">
                <h4 className="text-xs uppercase font-display font-bold text-slate-400 tracking-wider">3D Visual Identifiers</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedMole.visualTraits.map((trait, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-medium px-3 py-1 bg-slate-800/80 rounded-xl border border-white/10 text-slate-200"
                    >
                      ✓ {trait}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
