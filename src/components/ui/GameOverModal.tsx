import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Home, Sparkles, Zap, Target, Coins, BookOpen, Send, CheckCircle2, AlertCircle, Loader2, ArrowRight, ExternalLink } from 'lucide-react';
import { UserProfile, GameMode } from '../../types';
import { PIZZA_INGREDIENTS, PIZZA_RECIPES, checkRecipeRequirements } from '../../data/pizzaRecipes';
import { sfx } from '../../services/sfx';
import { submitScore } from '../../services/spicycrust-api';

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
  onOpenLeaderboard?: () => void;
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
  onOpenLeaderboard,
}) => {
  const isNewHighScore = isNewHighScoreProp !== undefined
    ? isNewHighScoreProp
    : (score > (profile.highScore || 0) && score > 0);

  const isCelebration = isNewHighScore || !!isMultiplayerWin;

  const coinsEarned = Math.round(molesHit * 3 + goldenHit * 20 + score * 0.02);
  const xpEarned = Math.round(score * 0.05 + maxCombo * 10);

  // SpicyCrust Score Submission Form State
  const [nickname, setNickname] = useState(profile.name || '');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    activeTimersRef.current.forEach((t) => clearInterval(t));
    activeTimersRef.current = [];

    const colors = type === 'high_score'
      ? ['#F59E0B', '#EF4444', '#FBBF24', '#FFFFFF', '#10B981', '#F97316', '#EAB308']
      : ['#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#FFFFFF', '#EC4899', '#06B6D4'];

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

    try {
      sfx.playRecipeComplete();
      sfx.playPowerup();
    } catch {}
  };

  useEffect(() => {
    if (isCelebration) {
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
      } catch {}
    };
  }, [isCelebration, isMultiplayerWin]);

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

  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setErrorMessage('Por favor ingresa tu nombre (nickname).');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await submitScore({
        nickname: nickname.trim().slice(0, 20),
        email: email.trim(),
        score,
        metadata: {
          molesHit,
          goldenHit,
          maxCombo,
          mode,
          timestamp: Date.now(),
        },
      });

      if (res && (res.status === 'success' || res.data || res.success !== false)) {
        setSubmitSuccess(true);
        sfx.playPowerup();
        // Transition to leaderboard screen after short feedback
        setTimeout(() => {
          if (onOpenLeaderboard) {
            onOpenLeaderboard();
          }
        }, 800);
      } else {
        setErrorMessage(res?.message || 'No se pudo guardar el puntaje en la taberna.');
      }
    } catch (err: any) {
      console.warn('[SpicyCrust] Submit error:', err);
      setErrorMessage('Error al conectar con SpicyCrust API. Puedes reintentar o saltar.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkipToLeaderboard = () => {
    sfx.playButtonClick();
    if (onOpenLeaderboard) {
      onOpenLeaderboard();
    } else {
      handleHomeClick();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 15, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-sm sm:max-w-md bg-slate-900 border border-white/10 rounded-3xl p-5 sm:p-6 text-center shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto"
      >
        {/* Glow Header */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-12 bg-orange-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Title Badge */}
        <div className="flex justify-center mb-2">
          {mode === 'multiplayer' ? (
            isMultiplayerWin ? (
              <span className="px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-emerald-500/10">
                <Trophy className="w-3.5 h-3.5" /> ¡Victoria en Duelo!
              </span>
            ) : isMultiplayerTie ? (
              <span className="px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> ¡Empate Épico!
              </span>
            ) : (
              <span className="px-3.5 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                💔 Fin del Duelo
              </span>
            )
          ) : isNewHighScore ? (
            <span className="px-3.5 py-1 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-yellow-500/10">
              <Trophy className="w-3.5 h-3.5" /> ¡Nuevo Récord Personal!
            </span>
          ) : (
            <span className="px-3.5 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
              🍕 ¡Masa Servida!
            </span>
          )}
        </div>

        <h2 className="text-2xl sm:text-3xl font-black font-display text-white tracking-wide mb-1">
          {mode === 'multiplayer'
            ? isMultiplayerWin
              ? '¡Maestro Pizzero Ganador!'
              : isMultiplayerTie
              ? '¡Duelo Reñido!'
              : '¡Mejor Suerte en la Próxima!'
            : 'Fin de la Partida'}
        </h2>

        {/* Multiplayer Opponent Breakdown */}
        {mode === 'multiplayer' && opponentName && opponentScore !== undefined && (
          <div className="bg-slate-950/60 rounded-2xl border border-white/10 p-2.5 mb-3 flex items-center justify-between text-xs">
            <div className="flex flex-col items-start">
              <span className="text-slate-400 text-[10px]">Tú</span>
              <span className="font-mono font-bold text-white text-sm">{score.toLocaleString()} pts</span>
            </div>
            <div className="text-[10px] font-black uppercase text-slate-500 font-mono px-2 py-0.5 rounded bg-slate-800">
              VS
            </div>
            <div className="flex flex-col items-end">
              <span className="text-slate-400 text-[10px] truncate max-w-[100px]">{opponentName}</span>
              <span className="font-mono font-bold text-slate-300 text-sm">{opponentScore.toLocaleString()} pts</span>
            </div>
          </div>
        )}

        {/* Score Display Card */}
        <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-white/10 mb-3 text-center">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mb-0.5">Puntaje Final</div>
          <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-red-400 font-mono tracking-tight">
            {score.toLocaleString()}
          </div>
        </div>

        {/* SpicyCrust Leaderboard Submit Form */}
        <div className="bg-slate-950/80 border border-orange-500/30 rounded-2xl p-3.5 mb-3 text-left">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase font-display text-orange-400 tracking-wide">
              <span>🏆</span> Publicar en Leaderboard SpicyCrust
            </div>
            {submitSuccess && (
              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> ¡Enviado!
              </span>
            )}
          </div>

          {!submitSuccess ? (
            <form onSubmit={handleSubmitScore} className="space-y-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Tu Nombre / Nickname <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={20}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Ingresa tu nombre (máx 20)"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Email <span className="text-slate-500 font-normal">(Opcional para premios)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com (opcional)"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition font-medium"
                />
              </div>

              {errorMessage && (
                <div className="flex items-center gap-1.5 text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-2 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={submitting || !nickname.trim()}
                  className="flex-1 py-2.5 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 disabled:opacity-50 text-white font-black text-xs uppercase rounded-xl tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 transition cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar Puntaje</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSkipToLeaderboard}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase rounded-xl transition flex items-center gap-1 cursor-pointer"
                >
                  <span>Saltar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-2 text-xs text-emerald-300 font-bold">
              ¡Puntaje registrado con éxito! Abriendo el ranking...
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
        <div className="flex flex-col gap-2">
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

          <a
            href="https://spicycrust.com"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sfx.playButtonClick()}
            className="w-full py-2.5 bg-slate-950/80 hover:bg-slate-900 border border-amber-500/30 text-amber-300 rounded-2xl text-xs font-black uppercase font-display tracking-wider flex items-center justify-center gap-2 transition hover:border-amber-400/60 shadow-md"
          >
            <span>🍕 Visitar Taberna SpicyCrust.com</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
};
