import React, { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Home, Sparkles, Zap, Target, Coins, BookOpen, PartyPopper } from 'lucide-react';
import { UserProfile, GameMode } from '../../types';
import { PIZZA_INGREDIENTS, PIZZA_RECIPES, checkRecipeRequirements } from '../../data/pizzaRecipes';
import { sfx } from '../../services/sfx';

interface GameOverModalProps {
  score: number;
  combo: number;
  maxCombo: number;
  molesHit: number;
  goldenHit: number;
  bombsHit: number;
  mode: GameMode;
  sessionIngredients?: Record<string, number>;
  isNewHighScore?: boolean;
  isMultiplayerWin?: boolean;
  isMultiplayerTie?: boolean;
  opponentName?: string;
  opponentScore?: number;
  profile: UserProfile;
  onPlayAgain: () => void;
  onHome: () => void;
  onOpenCodex?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  score,
  combo: _combo,
  maxCombo,
  molesHit,
  goldenHit,
  bombsHit: _bombsHit,
  mode,
  sessionIngredients = {},
  isNewHighScore: isNewHighScoreProp,
  isMultiplayerWin,
  isMultiplayerTie,
  opponentName,
  opponentScore,
  profile,
  onPlayAgain,
  onHome,
  onOpenCodex,
}) => {
  const isNewHighScore = isNewHighScoreProp !== undefined
    ? isNewHighScoreProp
    : (score > (profile.highScore || 0) && score > 0);

  const isCelebration = isNewHighScore || !!isMultiplayerWin;

  const coinsEarned = Math.round(molesHit * 3 + goldenHit * 20 + score * 0.02);
  const xpEarned = Math.round(score * 0.05 + maxCombo * 10);

  // Check if any recipe is currently ready to bake with player's total ingredients
  const readyRecipesCount = PIZZA_RECIPES.filter((r) => {
    const isU = profile.unlockedRecipes?.includes(r.id);
    const m = profile.masteredRecipes?.[r.id] || (isU ? 1 : 0);
    return checkRecipeRequirements(r, profile.ingredients || {}, m).canBake;
  }).length;

  const totalSessionIngredients = Object.values(sessionIngredients).reduce<number>((a, b) => a + (Number(b) || 0), 0);

  // Active timers reference for cleanup
  const activeTimersRef = useRef<number[]>([]);

  const launchParticleConfetti = (type: 'high_score' | 'multiplayer_win') => {
    // Clear any previous interval showers
    activeTimersRef.current.forEach((t) => clearInterval(t));
    activeTimersRef.current = [];

    // Themed palettes
    const colors = type === 'high_score'
      ? ['#F59E0B', '#EF4444', '#FBBF24', '#FFFFFF', '#10B981', '#F97316', '#EAB308']
      : ['#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#FFFFFF', '#EC4899', '#06B6D4'];

    // Construct shapes (squares, circles, stars, plus custom emoji shapes if supported)
    let shapes: confetti.Shape[] = ['square', 'circle', 'star'];
    if (typeof confetti.shapeFromText === 'function') {
      try {
        const trophyOrStar = confetti.shapeFromText({
          text: type === 'high_score' ? '⭐' : '🏆',
          scalar: 1.5,
        });
        const pizzaSlice = confetti.shapeFromText({
          text: '🍕',
          scalar: 1.5,
        });
        shapes = ['square', 'circle', 'star', trophyOrStar, pizzaSlice];
      } catch {
        shapes = ['square', 'circle', 'star'];
      }
    }

    // 1. Stage 1: Left and Right Dual Cannon Bursts
    confetti({
      particleCount: 55,
      angle: 60,
      spread: 70,
      origin: { x: 0.05, y: 0.8 },
      colors,
      shapes,
      zIndex: 99999,
      startVelocity: 55,
      scalar: 1.1,
    });

    confetti({
      particleCount: 55,
      angle: 120,
      spread: 70,
      origin: { x: 0.95, y: 0.8 },
      colors,
      shapes,
      zIndex: 99999,
      startVelocity: 55,
      scalar: 1.1,
    });

    // 2. Stage 2: Central Fireworks Climax Burst
    const centerTimer = window.setTimeout(() => {
      confetti({
        particleCount: 90,
        spread: 115,
        origin: { x: 0.5, y: 0.42 },
        colors,
        shapes,
        zIndex: 99999,
        startVelocity: 48,
        scalar: 1.25,
      });
    }, 220);
    activeTimersRef.current.push(centerTimer);

    // 3. Stage 3: Cascading Fluttering Shower Waves (3 seconds duration)
    const showerEnd = Date.now() + 2800;
    const showerInterval = window.setInterval(() => {
      if (Date.now() > showerEnd) {
        clearInterval(showerInterval);
        return;
      }

      confetti({
        particleCount: 16,
        angle: 60 + Math.random() * 60,
        spread: 75,
        origin: { x: 0.1 + Math.random() * 0.8, y: Math.random() * 0.2 },
        colors,
        shapes: ['square', 'circle', 'star'],
        zIndex: 99999,
        gravity: 0.85,
        scalar: 0.85 + Math.random() * 0.45,
        drift: (Math.random() - 0.5) * 1.5,
        ticks: 190,
      });
    }, 260);
    activeTimersRef.current.push(showerInterval);

    // Play triumphant audio fanfare
    try {
      sfx.playRecipeComplete();
      sfx.playPowerup();
    } catch {
      // Audio fallback
    }
  };

  useEffect(() => {
    if (isCelebration) {
      // Small initial delay so modal transition is visible first
      const initTimer = window.setTimeout(() => {
        launchParticleConfetti(isMultiplayerWin ? 'multiplayer_win' : 'high_score');
      }, 150);
      activeTimersRef.current.push(initTimer);
    }

    return () => {
      activeTimersRef.current.forEach((t) => {
        clearTimeout(t);
        clearInterval(t);
      });
      activeTimersRef.current = [];
      try {
        confetti.reset();
      } catch {
        // Reset fallback
      }
    };
  }, [isCelebration, isMultiplayerWin]);

  const handleManualConfetti = () => {
    sfx.playButtonClick();
    launchParticleConfetti(isMultiplayerWin ? 'multiplayer_win' : 'high_score');
  };

  const handlePlayAgainClick = () => {
    try {
      confetti.reset();
    } catch {}
    onPlayAgain();
  };

  const handleHomeClick = () => {
    try {
      confetti.reset();
    } catch {}
    onHome();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="flex flex-col w-full max-w-md bg-slate-900 rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in text-center p-6 relative">
        {/* Result Header */}
        <div className="flex flex-col items-center mb-4">
          <div className="relative mb-3">
            <button
              type="button"
              onClick={isCelebration ? handleManualConfetti : undefined}
              title={isCelebration ? "¡Haz clic para lanzar más confeti!" : undefined}
              className={`w-18 h-18 rounded-3xl flex items-center justify-center text-3xl shadow-xl transition-transform active:scale-95 ${
                isCelebration
                  ? 'bg-yellow-500/20 border-2 border-yellow-500/40 text-yellow-400 animate-bounce cursor-pointer hover:scale-105 hover:bg-yellow-500/30'
                  : 'bg-slate-800 border border-white/10 text-slate-200'
              }`}
            >
              {mode === 'multiplayer' ? (isMultiplayerWin ? '🏆' : isMultiplayerTie ? '🤝' : '💀') : (isNewHighScore ? '⭐' : '🍕')}
            </button>

            {isCelebration && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-yellow-500 items-center justify-center text-[9px]">✨</span>
              </span>
            )}
          </div>

          <h2 className="text-2xl font-black text-white font-['Outfit'] tracking-tight">
            {mode === 'multiplayer'
              ? isMultiplayerWin
                ? 'VICTORY!'
                : isMultiplayerTie
                ? 'ROUND TIED!'
                : 'DEFEAT!'
              : isNewHighScore
              ? 'NEW HIGH SCORE!'
              : 'ROUND FINISHED!'}
          </h2>

          {/* Celebration Pill */}
          {isCelebration && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-bold text-yellow-400 bg-yellow-500/20 border border-yellow-500/40 px-3.5 py-1 rounded-full animate-pulse flex items-center gap-1.5 font-mono shadow-lg shadow-yellow-500/10">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                {isMultiplayerWin ? 'MATCH WINNER!' : 'NEW PERSONAL RECORD!'}
              </span>

              <button
                type="button"
                onClick={handleManualConfetti}
                className="text-[11px] font-bold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-2.5 py-1 rounded-full flex items-center gap-1 transition active:scale-95 cursor-pointer"
                title="Lanzar más confeti"
              >
                <PartyPopper className="w-3.5 h-3.5 text-amber-400" />
                <span>🎉</span>
              </button>
            </div>
          )}
        </div>

        {/* Big Score Number */}
        <div className="bg-slate-950/80 rounded-2xl p-3.5 border border-white/10 mb-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">
            Final Score
          </span>
          <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
            {score.toLocaleString()}
          </span>

          {mode === 'multiplayer' && opponentName && (
            <div className="mt-2 pt-2 border-t border-white/10 flex justify-between text-xs text-slate-400 font-medium">
              <span>{opponentName}:</span>
              <span className="font-bold text-yellow-400 font-mono">{(opponentScore || 0).toLocaleString()} pts</span>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 bg-slate-950/50 p-2.5 rounded-2xl border border-white/10 mb-3 text-xs">
          <div className="flex flex-col items-center p-1">
            <Target className="w-4 h-4 text-orange-400 mb-1" />
            <span className="text-slate-400 text-[10px] font-medium">Whacks</span>
            <span className="font-bold text-white text-sm font-mono">{molesHit}</span>
          </div>

          <div className="flex flex-col items-center p-1 border-x border-white/10">
            <Zap className="w-4 h-4 text-indigo-400 mb-1" />
            <span className="text-slate-400 text-[10px] font-medium">Max Streak</span>
            <span className="font-bold text-white text-sm font-mono">{maxCombo}x</span>
          </div>

          <div className="flex flex-col items-center p-1">
            <Coins className="w-4 h-4 text-yellow-400 mb-1" />
            <span className="text-slate-400 text-[10px] font-medium">Golden</span>
            <span className="font-bold text-white text-sm font-mono">{goldenHit}</span>
          </div>
        </div>

        {/* Ingredients Looted in This Match */}
        {totalSessionIngredients > 0 && (
          <div className="bg-slate-950/60 p-3 rounded-2xl border border-amber-500/20 mb-3 text-left">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1">
                <span>🍕</span> Botín Culinario Recolectado ({totalSessionIngredients})
              </span>
              {readyRecipesCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black uppercase animate-pulse">
                  ¡Receta Lista!
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {Object.entries(sessionIngredients)
                .filter(([_, count]) => Number(count) > 0)
                .map(([id, count]) => {
                  const ing = PIZZA_INGREDIENTS.find((i) => i.id === id);
                  if (!ing) return null;
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-slate-200"
                    >
                      <span>{ing.iconEmoji}</span>
                      <span className="font-mono text-[11px] font-bold text-amber-300">x{count}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Rewards Earned Pill */}
        <div className="flex items-center justify-center gap-4 bg-slate-800/60 border border-white/10 p-2.5 rounded-2xl mb-4 text-xs font-bold font-mono">
          <div className="flex items-center gap-1 text-yellow-400">
            <span>🪙</span>
            <span>+{coinsEarned} Coins</span>
          </div>
          <div className="flex items-center gap-1 text-indigo-400">
            <span>⭐</span>
            <span>+{xpEarned} XP</span>
          </div>
        </div>

        {/* Optional Open Recipe Codex Prompt Button */}
        {onOpenCodex && (
          <button
            id="gameover_btn_codex"
            onClick={onOpenCodex}
            className="w-full mb-3 py-2.5 bg-gradient-to-r from-amber-600/30 to-red-600/30 hover:from-amber-600/50 hover:to-red-600/50 text-amber-300 border border-amber-500/30 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition"
          >
            <BookOpen className="w-4 h-4" /> Abrir Recetario & Hornear Pizzas
          </button>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            id="gameover_btn_home"
            onClick={handleHomeClick}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase rounded-2xl flex items-center justify-center gap-1.5 border border-white/10 transition cursor-pointer"
          >
            <Home className="w-4 h-4" /> Menu
          </button>

          <button
            id="gameover_btn_replay"
            onClick={handlePlayAgainClick}
            className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 text-white font-black text-xs uppercase rounded-2xl tracking-wider flex items-center justify-center gap-1.5 transition shadow-lg shadow-orange-500/20 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> Play Again
          </button>
        </div>
      </div>
    </div>
  );
};

