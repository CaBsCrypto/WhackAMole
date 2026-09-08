import React from 'react';
import { Pause, Flame, Snowflake, Sparkles, Shield, Zap, Volume2, VolumeX, BookOpen } from 'lucide-react';
import { UserProfile, GameMode } from '../../types';
import { PizzaProgressTracker } from './PizzaProgressTracker';

interface GameHUDProps {
  score: number;
  combo: number;
  maxCombo: number;
  timeRemaining: number;
  gameDuration: number;
  mode: GameMode;
  profile: UserProfile;
  activePowerups: Record<string, number>; // powerupId -> remaining seconds
  sessionIngredients?: Record<string, number>;
  targetRecipeId?: string;
  onSelectTargetRecipe?: (recipeId: string) => void;
  completedRecipesInSession?: string[];
  kitchenDisasterActive?: boolean;
  disasterTimeRemaining?: number;
  onUsePowerup: (powerupId: string) => void;
  onPause: () => void;
  onOpenCodex?: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  score,
  combo,
  maxCombo,
  timeRemaining,
  gameDuration,
  mode,
  profile,
  activePowerups,
  sessionIngredients = {},
  targetRecipeId,
  onSelectTargetRecipe,
  completedRecipesInSession = [],
  kitchenDisasterActive = false,
  disasterTimeRemaining = 10,
  onUsePowerup,
  onPause,
  onOpenCodex,
  isMuted,
  onToggleMute,
}) => {
  const timeProgress = Math.max(0, Math.min(1, timeRemaining / Math.max(1, gameDuration)));
  const isTimeCritical = timeRemaining <= 10;
  const comboMultiplier = (1 + combo * 0.15).toFixed(1);
  const totalSessionIngredients = Object.values(sessionIngredients).reduce<number>((a, b) => a + (Number(b) || 0), 0);

  return (
    <div id="game_hud" className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 md:p-5 z-20">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: Score & Integrated Pizza Recipe Pill */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="pointer-events-auto flex items-center gap-3 bg-slate-900/85 backdrop-blur-md px-3.5 sm:px-4 py-2 rounded-2xl border border-white/10 shadow-lg">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold tracking-tighter uppercase text-slate-400">Score</span>
              <span className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-yellow-400 font-mono leading-none">
                {score.toLocaleString()}
              </span>
            </div>
            {profile.highScore > 0 && (
              <div className="hidden sm:flex flex-col border-l border-slate-700/80 pl-3">
                <span className="text-[9px] font-bold tracking-tighter uppercase text-slate-400">Best</span>
                <span className="text-xs sm:text-sm font-black text-indigo-400 font-mono leading-none">
                  {profile.highScore.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Sleek Pizza Progress Tracker (Docked in top bar, collapsed pill by default) */}
          <div className="pointer-events-auto">
            <PizzaProgressTracker
              sessionIngredients={sessionIngredients}
              targetRecipeId={targetRecipeId}
              onSelectTargetRecipe={onSelectTargetRecipe}
              recipeScoreBonusRemaining={activePowerups['recipe_score_bonus'] || 0}
              completedRecipesInSession={completedRecipesInSession}
              onOpenCodex={onOpenCodex}
            />
          </div>
        </div>

        {/* Center: Round Timer & Subtle Non-intrusive Streak Badge */}
        <div className="pointer-events-auto flex flex-col items-center">
          <div
            className={`flex items-center gap-2 px-4 sm:px-5 py-1.5 sm:py-2 rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-300 ${
              isTimeCritical
                ? 'bg-red-600/90 text-white border-red-400 animate-pulse scale-105 shadow-[0_0_15px_rgba(239,68,68,0.6)]'
                : 'bg-slate-900/85 text-white border-white/10'
            }`}
          >
            <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-slate-300">Time</span>
            <span className="text-xl sm:text-2xl md:text-3xl font-black font-mono leading-none">{timeRemaining}s</span>
          </div>

          {/* Progress Mini Bar */}
          <div className="w-20 sm:w-28 h-1 bg-slate-950 rounded-full mt-1 overflow-hidden border border-white/5">
            <div
              className={`h-full transition-all duration-300 ${isTimeCritical ? 'bg-red-500' : 'bg-gradient-to-r from-orange-500 to-yellow-400'}`}
              style={{ width: `${timeProgress * 100}%` }}
            />
          </div>

          {/* Non-intrusive Streak Alert (docked right beneath timer, leaving the 3D holes completely clear) */}
          {combo >= 2 && (
            <div
              className={`pointer-events-none mt-1 flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black shadow-md border ${
                combo >= 10
                  ? 'bg-gradient-to-r from-orange-500 to-yellow-400 text-slate-950 border-yellow-200 animate-pulse'
                  : 'bg-slate-900/90 text-orange-400 border-orange-500/40'
              }`}
            >
              <Flame className="w-3 h-3 text-orange-400" />
              <span>{combo}x Streak ({comboMultiplier}x)</span>
            </div>
          )}

          {/* Kitchen Disaster Pill (docked right beneath timer if triggered) */}
          {kitchenDisasterActive && (
            <div
              id="hud_disaster_indicator"
              className="pointer-events-none mt-1 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600/90 border border-red-400 text-white font-black text-[9px] sm:text-[10px] uppercase tracking-wider animate-pulse shadow-lg shadow-red-500/30"
            >
              <span>🚨 ¡Desastre! ({disasterTimeRemaining}s)</span>
            </div>
          )}
        </div>

        {/* Right: Coins, Recipe Book, Mute & Pause */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          {/* Ingredients Loot Badge in current session (compact) */}
          {totalSessionIngredients > 0 && (
            <button
              id="hud_btn_session_loot"
              onClick={onOpenCodex || onPause}
              className="flex items-center gap-1 bg-amber-950/80 hover:bg-amber-900/80 text-amber-300 border border-amber-500/30 px-2.5 py-1.5 rounded-xl font-black text-xs font-mono transition shadow-md"
              title="Ingredientes recolectados en esta partida - Clic para ver Recetario"
            >
              <span>🍕</span>
              <span>+{totalSessionIngredients}</span>
            </button>
          )}

          {/* In-game Coins Badge */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md text-yellow-400 border border-white/10 px-3 py-1.5 rounded-xl font-black text-xs font-mono">
            <span>🪙</span>
            <span>{profile.coins}</span>
          </div>

          {onOpenCodex && (
            <button
              id="hud_btn_codex"
              onClick={onOpenCodex}
              className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-900/85 hover:bg-slate-800 text-amber-300 hover:text-amber-200 rounded-xl flex items-center justify-center border border-white/10 shadow-sm transition"
              title="Recetario de Pizzas"
            >
              <BookOpen className="w-4 h-4" />
            </button>
          )}

          <button
            id="hud_btn_mute"
            onClick={onToggleMute}
            className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-900/85 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl flex items-center justify-center border border-white/10 shadow-sm transition"
            title="Alternar Sonido"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
          </button>

          <button
            id="hud_btn_pause"
            onClick={onPause}
            className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-900/85 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl flex items-center justify-center border border-white/10 shadow-sm transition"
            title="Pausar Juego"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom In-Game Powerups Bar (Compact & Sleek) */}
      <div className="flex items-end justify-between gap-3">
        {/* Active Powerups & Inventory Shortcuts */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 bg-slate-900/85 backdrop-blur-md p-1.5 sm:p-2 rounded-2xl border border-white/10 shadow-lg">
          {/* Time Freeze */}
          <button
            id="powerup_btn_freeze"
            onClick={() => onUsePowerup('time_freeze')}
            disabled={(profile.powerups['time_freeze'] || 0) <= 0 || !!activePowerups['time_freeze']}
            className={`relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border transition ${
              activePowerups['time_freeze']
                ? 'bg-cyan-600 text-white border-cyan-300 animate-pulse'
                : (profile.powerups['time_freeze'] || 0) > 0
                ? 'bg-slate-900/80 hover:bg-slate-800 text-cyan-300 border-white/10 hover:border-cyan-500/50'
                : 'bg-slate-900/40 text-slate-600 border-white/5 opacity-40 cursor-not-allowed'
            }`}
            title="Congelar Tiempo (5s)"
          >
            <Snowflake className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Freeze</span>
            <span className="bg-slate-950 px-1 py-0.2 rounded text-[10px] text-cyan-300 border border-white/5 font-mono">
              {activePowerups['time_freeze'] ? `${activePowerups['time_freeze']}s` : profile.powerups['time_freeze'] || 0}
            </span>
          </button>

          {/* Golden Frenzy */}
          <button
            id="powerup_btn_frenzy"
            onClick={() => onUsePowerup('golden_frenzy')}
            disabled={(profile.powerups['golden_frenzy'] || 0) <= 0 || !!activePowerups['golden_frenzy']}
            className={`relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border transition ${
              activePowerups['golden_frenzy']
                ? 'bg-amber-600 text-white border-amber-300 animate-pulse'
                : (profile.powerups['golden_frenzy'] || 0) > 0
                ? 'bg-slate-900/80 hover:bg-slate-800 text-amber-300 border-white/10 hover:border-amber-500/50'
                : 'bg-slate-900/40 text-slate-600 border-white/5 opacity-40 cursor-not-allowed'
            }`}
            title="Golden Frenzy"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Gold Rush</span>
            <span className="bg-slate-950 px-1 py-0.2 rounded text-[10px] text-amber-300 border border-white/5 font-mono">
              {activePowerups['golden_frenzy'] ? `${activePowerups['golden_frenzy']}s` : profile.powerups['golden_frenzy'] || 0}
            </span>
          </button>

          {/* Bomb Shield */}
          <button
            id="powerup_btn_shield"
            onClick={() => onUsePowerup('bomb_shield')}
            disabled={(profile.powerups['bomb_shield'] || 0) <= 0 || !!activePowerups['bomb_shield']}
            className={`relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border transition ${
              activePowerups['bomb_shield']
                ? 'bg-emerald-600 text-white border-emerald-300 animate-pulse'
                : (profile.powerups['bomb_shield'] || 0) > 0
                ? 'bg-slate-900/80 hover:bg-slate-800 text-emerald-300 border-white/10 hover:border-emerald-500/50'
                : 'bg-slate-900/40 text-slate-600 border-white/5 opacity-40 cursor-not-allowed'
            }`}
            title="Escudo Anti-Bomba"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Shield</span>
            <span className="bg-slate-950 px-1 py-0.2 rounded text-[10px] text-emerald-300 border border-white/5 font-mono">
              {activePowerups['bomb_shield'] ? `${activePowerups['bomb_shield']}s` : profile.powerups['bomb_shield'] || 0}
            </span>
          </button>

          {/* Double Points */}
          <button
            id="powerup_btn_double"
            onClick={() => onUsePowerup('double_points')}
            disabled={(profile.powerups['double_points'] || 0) <= 0 || !!activePowerups['double_points']}
            className={`relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border transition ${
              activePowerups['double_points']
                ? 'bg-purple-600 text-white border-purple-300 animate-pulse'
                : (profile.powerups['double_points'] || 0) > 0
                ? 'bg-slate-900/80 hover:bg-slate-800 text-purple-300 border-white/10 hover:border-purple-500/50'
                : 'bg-slate-900/40 text-slate-600 border-white/5 opacity-40 cursor-not-allowed'
            }`}
            title="Doble Puntuación (10s)"
          >
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden md:inline">2x Pts</span>
            <span className="bg-slate-950 px-1 py-0.2 rounded text-[10px] text-purple-300 border border-white/5 font-mono">
              {activePowerups['double_points'] ? `${activePowerups['double_points']}s` : profile.powerups['double_points'] || 0}
            </span>
          </button>

          {/* Pizza Oven Inferno */}
          <button
            id="powerup_btn_pizza_oven"
            onClick={() => onUsePowerup('pizza_oven')}
            disabled={(profile.powerups['pizza_oven'] || 0) <= 0 || !!activePowerups['pizza_oven']}
            className={`relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border transition ${
              activePowerups['pizza_oven']
                ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white border-yellow-400 shadow-md shadow-orange-500/50 animate-pulse'
                : (profile.powerups['pizza_oven'] || 0) > 0
                ? 'bg-slate-900/80 hover:bg-slate-800 text-orange-400 border-white/10 hover:border-orange-500/50'
                : 'bg-slate-900/40 text-slate-600 border-white/5 opacity-40 cursor-not-allowed'
            }`}
            title="Horno de Pizza (5s) - Quema topos automáticamente"
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden md:inline">Horno</span>
            <span className="bg-slate-950 px-1 py-0.2 rounded text-[10px] text-orange-300 border border-white/5 font-mono">
              {activePowerups['pizza_oven'] ? `${activePowerups['pizza_oven']}s` : profile.powerups['pizza_oven'] || 0}
            </span>
          </button>

          {/* Active Chef Score Multiplier Bonus Badge */}
          {Boolean(activePowerups['recipe_score_bonus']) && (
            <div
              id="powerup_badge_chef_bonus"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 border border-yellow-200 shadow-md animate-pulse"
              title="¡Bono de Chef Activo! 2.5x Puntuación en todos los golpes"
            >
              <Flame className="w-3.5 h-3.5 text-slate-950 animate-spin" />
              <span className="hidden md:inline">Bono Chef</span>
              <span className="font-mono">2.5x</span>
              <span className="bg-slate-950 px-1 py-0.2 rounded text-[10px] text-yellow-300 border border-white/5 font-mono">
                {activePowerups['recipe_score_bonus']}s
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
