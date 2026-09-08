import React, { useState, useMemo } from 'react';
import { ChefHat, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Check, Flame, Sparkles, BookOpen } from 'lucide-react';
import { PizzaRecipe, PizzaIngredient } from '../../types';
import { PIZZA_RECIPES, PIZZA_INGREDIENTS } from '../../data/pizzaRecipes';

interface PizzaProgressTrackerProps {
  sessionIngredients: Record<string, number>;
  targetRecipeId?: string;
  onSelectTargetRecipe?: (recipeId: string) => void;
  recipeScoreBonusRemaining?: number;
  completedRecipesInSession?: string[];
  onOpenCodex?: () => void;
}

export const PizzaProgressTracker: React.FC<PizzaProgressTrackerProps> = ({
  sessionIngredients,
  targetRecipeId,
  onSelectTargetRecipe,
  recipeScoreBonusRemaining = 0,
  completedRecipesInSession = [],
  onOpenCodex,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [internalTargetId, setInternalTargetId] = useState<string>(
    targetRecipeId || PIZZA_RECIPES[0].id
  );

  // Auto-collapse after 5 seconds if left open to keep the gameplay area clean
  React.useEffect(() => {
    if (!isCollapsed) {
      const timer = setTimeout(() => {
        setIsCollapsed(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isCollapsed]);

  const activeRecipeId = targetRecipeId || internalTargetId;
  const currentRecipeIndex = useMemo(() => {
    const idx = PIZZA_RECIPES.findIndex((r) => r.id === activeRecipeId);
    return idx >= 0 ? idx : 0;
  }, [activeRecipeId]);

  const activeRecipe: PizzaRecipe = PIZZA_RECIPES[currentRecipeIndex] || PIZZA_RECIPES[0];

  // Calculate detailed progress for the active recipe
  const { totalNeeded, totalCollected, percent, isComplete, ingredientStatus } = useMemo(() => {
    let needed = 0;
    let collected = 0;
    let allMet = true;

    const status = activeRecipe.requirements.map((req) => {
      const ing = PIZZA_INGREDIENTS.find((i) => i.id === req.ingredientId) || {
        id: req.ingredientId,
        name: req.ingredientId,
        iconEmoji: '🍕',
        color: '#facc15',
      };
      const count = sessionIngredients[req.ingredientId] || 0;
      const met = count >= req.count;
      if (!met) allMet = false;

      needed += req.count;
      collected += Math.min(req.count, count);

      return {
        ingredient: ing,
        requiredCount: req.count,
        currentCount: count,
        met,
      };
    });

    const pct = needed > 0 ? Math.min(100, Math.round((collected / needed) * 100)) : 0;

    return {
      totalNeeded: needed,
      totalCollected: collected,
      percent: pct,
      isComplete: allMet,
      ingredientStatus: status,
    };
  }, [activeRecipe, sessionIngredients]);

  const totalSessionItems = useMemo(() => {
    return Object.values(sessionIngredients).reduce<number>((a, b) => a + (Number(b) || 0), 0);
  }, [sessionIngredients]);

  const handleNextRecipe = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIdx = (currentRecipeIndex + 1) % PIZZA_RECIPES.length;
    const nextRecipe = PIZZA_RECIPES[nextIdx];
    setInternalTargetId(nextRecipe.id);
    onSelectTargetRecipe?.(nextRecipe.id);
  };

  const handlePrevRecipe = (e: React.MouseEvent) => {
    e.stopPropagation();
    const prevIdx = (currentRecipeIndex - 1 + PIZZA_RECIPES.length) % PIZZA_RECIPES.length;
    const prevRecipe = PIZZA_RECIPES[prevIdx];
    setInternalTargetId(prevRecipe.id);
    onSelectTargetRecipe?.(prevRecipe.id);
  };

  const isRecipeAlreadyBakedInSession = completedRecipesInSession.includes(activeRecipe.id);

  return (
    <div
      id="hud_pizza_progress_tracker"
      className="relative pointer-events-auto transition-all duration-300 select-none"
    >
      {/* Sleek Pill View (Always accessible, compact, no screen clutter) */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-md cursor-pointer transition-all shadow-md ${
          recipeScoreBonusRemaining > 0
            ? 'bg-amber-950/85 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.4)] animate-pulse'
            : 'bg-slate-800/80 hover:bg-slate-700/80 border-white/10 text-slate-200'
        }`}
        title="Progreso de Receta de Pizza (Clic para expandir ingredientes)"
      >
        <span className="text-base leading-none">{activeRecipe.imageEmoji}</span>
        <div className="flex flex-col text-left leading-tight">
          <span className="text-[10px] uppercase font-black tracking-wider text-orange-400 flex items-center gap-1">
            Pizza: {percent}%
            {recipeScoreBonusRemaining > 0 && (
              <span className="text-yellow-300 font-bold">🔥 2.5x</span>
            )}
          </span>
          <span className="text-xs font-bold text-white truncate max-w-[95px] sm:max-w-[120px]">
            {activeRecipe.name}
          </span>
        </div>
        {isCollapsed ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
        )}
      </button>

      {/* Full Expanded Tracker Flyout (Dropdown, non-blocking) */}
      {!isCollapsed && (
        <>
          {/* Backdrop to auto-close when clicking anywhere else */}
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setIsCollapsed(true)}
          />

          <div
            className={`absolute top-full left-0 mt-2 z-50 w-64 sm:w-72 rounded-2xl border backdrop-blur-xl shadow-2xl p-3 transition-all ${
              recipeScoreBonusRemaining > 0
                ? 'bg-slate-900/95 border-amber-400/80 shadow-[0_0_25px_rgba(245,158,11,0.3)]'
                : 'bg-slate-900/95 border-white/15 shadow-2xl'
            }`}
          >
            {/* Top Bar: Title, Total Loot Count & Collapse Button */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center">
                  <ChefHat className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                    Progreso de Pizza
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span
                  className="text-[10px] font-mono font-bold bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded border border-white/5"
                  title="Total de ingredientes recolectados en esta partida"
                >
                  🧺 {totalSessionItems}
                </span>

                {onOpenCodex && (
                  <button
                    id="tracker_btn_codex"
                    onClick={onOpenCodex}
                    className="p-1 text-slate-400 hover:text-amber-300 rounded-lg hover:bg-slate-800 transition"
                    title="Abrir Recetario"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  id="tracker_btn_collapse"
                  onClick={() => setIsCollapsed(true)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                  title="Minimizar panel"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Active Recipe Header with Cyclers */}
            <div className="mt-2 flex items-center justify-between">
              <button
                id="tracker_prev_recipe"
                onClick={handlePrevRecipe}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                title="Receta anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-2 text-center flex-1 justify-center px-1">
                <span className="text-xl">{activeRecipe.imageEmoji}</span>
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-xs font-bold text-white truncate max-w-[140px] sm:max-w-[160px]">
                    {activeRecipe.name}
                  </span>
                  <span className="text-[9px] text-slate-400 font-semibold truncate max-w-[140px]">
                    {activeRecipe.italianName}
                  </span>
                </div>
              </div>

              <button
                id="tracker_next_recipe"
                onClick={handleNextRecipe}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                title="Siguiente receta"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Progress Bar & Status */}
            <div className="mt-2">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-300 mb-1 font-mono">
                <span className="text-slate-400">
                  {totalCollected}/{totalNeeded} items
                </span>
                <span className={percent === 100 ? 'text-emerald-400 font-black' : 'text-amber-400'}>
                  {percent}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-white/10 p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    percent === 100
                      ? 'bg-gradient-to-r from-emerald-500 to-green-400 shadow-[0_0_10px_rgba(34,197,94,0.6)]'
                      : 'bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300'
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            {/* Ingredients Requirement Checklist */}
            <div className="mt-2.5 space-y-1 max-h-36 overflow-y-auto pr-0.5">
              {ingredientStatus.map(({ ingredient, requiredCount, currentCount, met }) => (
                <div
                  key={ingredient.id}
                  className={`flex items-center justify-between px-2 py-1 rounded-lg border text-xs transition-colors ${
                    met
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : 'bg-slate-800/60 border-white/5 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-sm">{ingredient.iconEmoji}</span>
                    <span className="text-[11px] font-medium truncate max-w-[110px] sm:max-w-[130px]">
                      {ingredient.name.split(' ')[0]} {ingredient.name.split(' ')[1] || ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span className={`font-bold ${met ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {currentCount}/{requiredCount}
                    </span>
                    {met ? (
                      <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/30 text-emerald-400 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-500 font-sans">
                        -{requiredCount - currentCount}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Recipe Completion Badge or Score Bonus Indicator */}
            {recipeScoreBonusRemaining > 0 ? (
              <div className="mt-2.5 py-1.5 px-2 rounded-xl bg-gradient-to-r from-amber-600/90 to-orange-500/90 text-slate-950 border border-yellow-300 shadow-[0_0_15px_rgba(245,158,11,0.5)] flex items-center justify-between text-[11px] font-black uppercase tracking-wider animate-pulse">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-slate-950 animate-spin" />
                  <span>Bono Chef: 2.5x Pts</span>
                </div>
                <span className="font-mono bg-slate-950 text-yellow-300 px-1.5 py-0.5 rounded text-[10px]">
                  {recipeScoreBonusRemaining}s
                </span>
              </div>
            ) : isRecipeAlreadyBakedInSession ? (
              <div className="mt-2 py-1 px-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 flex items-center justify-center gap-1.5 text-[10px] font-bold">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>¡Receta Completada en esta Partida!</span>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
};
