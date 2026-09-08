import React, { useEffect, useState } from 'react';
import { Sparkles, Flame, Trophy, Award, CheckCircle2, Zap } from 'lucide-react';
import { PizzaRecipe } from '../../types';

interface RecipeCelebrationModalProps {
  recipe: PizzaRecipe | null;
  scoreBonusPoints?: number;
  multiplierDurationSecs?: number;
  onClose: () => void;
}

export const RecipeCelebrationModal: React.FC<RecipeCelebrationModalProps> = ({
  recipe,
  scoreBonusPoints = 1500,
  multiplierDurationSecs = 15,
  onClose,
}) => {
  const [countdown, setCountdown] = useState(3.5);

  useEffect(() => {
    if (!recipe) return;
    setCountdown(3.5);

    const startTime = Date.now();
    const duration = 3500;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, (duration - elapsed) / 1000);
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        onClose();
      }
    }, 100);

    return () => clearInterval(timer);
  }, [recipe, onClose]);

  if (!recipe) return null;

  const progressPercent = Math.max(0, Math.min(100, (countdown / 3.5) * 100));

  return (
    <div
      id="recipe_celebration_overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200 select-none pointer-events-auto"
      onClick={onClose}
    >
      {/* Background Rotating Light Radiance */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-amber-500/20 via-orange-500/30 to-red-500/20 blur-3xl animate-pulse pointer-events-none" />

      {/* Main Celebration Dialog */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-yellow-400/80 rounded-3xl p-6 shadow-[0_0_50px_rgba(234,179,8,0.4)] text-center transform animate-in zoom-in-90 duration-300 overflow-hidden"
      >
        {/* Top Decorative Italian Ribbons / Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-white to-red-500" />

        {/* Floating Animated Pizza Icon */}
        <div className="relative mx-auto mt-2 w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-500/30 to-orange-500/20 border-2 border-yellow-400/50 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.5)] animate-bounce">
          <span className="text-6xl filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
            {recipe.imageEmoji || '🍕'}
          </span>
          <div className="absolute -top-2 -right-2 bg-yellow-400 text-slate-950 p-1 rounded-full shadow-lg">
            <Sparkles className="w-4 h-4 fill-current" />
          </div>
        </div>

        {/* Celebration Title */}
        <div className="mt-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/15 border border-yellow-400/40 text-yellow-300 text-xs font-black uppercase tracking-widest">
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            <span>¡RECETA COMPLETADA! • RECIPE COMPLETE!</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-orange-400 mt-2 tracking-tight">
            {recipe.name}
          </h2>
          <p className="text-xs text-amber-200/80 font-medium italic mt-0.5">
            {recipe.italianName}
          </p>
        </div>

        {/* Reward & Temporary Score Bonus Showcase Card */}
        <div className="mt-5 p-4 rounded-2xl bg-gradient-to-br from-amber-950/70 via-slate-800/80 to-orange-950/70 border border-amber-500/40 shadow-inner">
          <div className="text-[11px] font-black uppercase tracking-widest text-amber-300 flex items-center justify-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
            <span>¡BONO TEMPORAL DE CHEF ACTIVADO!</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 mt-3">
            {/* Immediate Score Bonus */}
            <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-900/80 border border-white/10">
              <span className="text-[10px] uppercase font-bold text-slate-400">Bonus Inmediato</span>
              <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono">
                +{scoreBonusPoints.toLocaleString()}
              </span>
              <span className="text-[9px] text-slate-400">Puntos de Score</span>
            </div>

            {/* Multiplier Buff */}
            <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-900/80 border border-amber-400/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
              <span className="text-[10px] uppercase font-bold text-yellow-300 flex items-center gap-1">
                <Zap className="w-3 h-3 text-yellow-400 fill-current" />
                Multiplicador
              </span>
              <span className="text-lg sm:text-xl font-black text-yellow-300 font-mono">
                2.5x Puntos
              </span>
              <span className="text-[9px] text-amber-200/80">Por {multiplierDurationSecs} segundos</span>
            </div>
          </div>

          {/* Additional Rewards */}
          <div className="flex items-center justify-around mt-3 pt-2.5 border-t border-white/10 text-xs font-bold font-mono">
            <span className="text-yellow-400 flex items-center gap-1">
              🪙 +{recipe.rewardCoins || 250} Monedas
            </span>
            <span className="text-cyan-400 flex items-center gap-1">
              ⭐ +{recipe.rewardXp || 200} XP
            </span>
          </div>
        </div>

        {/* Action Button & Auto-dismiss Countdown */}
        <div className="mt-5 flex flex-col gap-2">
          <button
            id="btn_recipe_celebration_continue"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-orange-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-slate-950" />
            <span>¡A Seguir Aplastando! ({countdown.toFixed(1)}s)</span>
          </button>

          {/* Progress Bar of Auto-dismiss */}
          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-yellow-400 transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
