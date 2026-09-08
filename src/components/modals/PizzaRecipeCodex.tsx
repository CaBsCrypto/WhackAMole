import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  X,
  Sparkles,
  Flame,
  CheckCircle2,
  Lock,
  Star,
  Award,
  ChevronRight,
  Info,
  Shield,
  Zap,
  TrendingUp,
  Package,
  BookOpen,
  ChefHat,
  Search,
  Check,
} from 'lucide-react';
import { UserProfile, PizzaRecipe, PizzaIngredient, IngredientId } from '../../types';
import {
  PIZZA_RECIPES,
  PIZZA_INGREDIENTS,
  checkRecipeRequirements,
  calculateRecipeBuffs,
} from '../../data/pizzaRecipes';
import { sfx } from '../../services/sfx';

interface PizzaRecipeCodexProps {
  profile: UserProfile;
  onClose: () => void;
  onUpdateProfile: (updated: UserProfile) => void;
  initialRecipeId?: string;
}

type TabType = 'recipes' | 'ready_to_bake' | 'unlocked' | 'pantry';

export const PizzaRecipeCodex: React.FC<PizzaRecipeCodexProps> = ({
  profile,
  onClose,
  onUpdateProfile,
  initialRecipeId,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('recipes');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(
    initialRecipeId || PIZZA_RECIPES[0].id
  );
  const [bakedCelebration, setBakedCelebration] = useState<{
    recipe: PizzaRecipe;
    masteryLevel: number;
  } | null>(null);
  const [filterDifficulty, setFilterDifficulty] = useState<number | 'all'>('all');
  const [selectedPantryIngredient, setSelectedPantryIngredient] = useState<PizzaIngredient | null>(null);

  const unlockedCount = profile.unlockedRecipes?.length || 0;
  const totalRecipes = PIZZA_RECIPES.length;
  const progressPct = Math.round((unlockedCount / totalRecipes) * 100);

  // Aggregated Buffs
  const activeBuffs = calculateRecipeBuffs(profile.unlockedRecipes, profile.masteredRecipes);

  // Selected recipe object
  const selectedRecipe = PIZZA_RECIPES.find((r) => r.id === selectedRecipeId) || PIZZA_RECIPES[0];
  const isUnlocked = profile.unlockedRecipes?.includes(selectedRecipe.id);
  const currentMastery = profile.masteredRecipes?.[selectedRecipe.id] || (isUnlocked ? 1 : 0);

  const reqCheck = checkRecipeRequirements(
    selectedRecipe,
    profile.ingredients || {},
    currentMastery
  );

  // Chef Rank Title based on completion
  const getChefRank = () => {
    if (unlockedCount >= 7) return { title: 'Emperador Michelin 3★', color: 'text-amber-300', icon: '👑' };
    if (unlockedCount >= 5) return { title: 'Gran Chef de la Corona', color: 'text-yellow-400', icon: '⭐' };
    if (unlockedCount >= 3) return { title: 'Maestro Fornaio Napoletano', color: 'text-orange-400', icon: '🔥' };
    if (unlockedCount >= 1) return { title: 'Pizzaiolo Promesa', color: 'text-emerald-400', icon: '🍕' };
    return { title: 'Ayudante de Cocina', color: 'text-slate-400', icon: '👨‍🍳' };
  };

  const chefRank = getChefRank();

  // Handle Recipe Baking
  const handleBakeRecipe = (recipe: PizzaRecipe) => {
    const isAlreadyUnlocked = profile.unlockedRecipes?.includes(recipe.id);
    const mastery = profile.masteredRecipes?.[recipe.id] || (isAlreadyUnlocked ? 1 : 0);
    const reqStatus = checkRecipeRequirements(recipe, profile.ingredients || {}, mastery);

    if (!reqStatus.canBake) return;

    // Deduct ingredients
    const nextIngredients = { ...(profile.ingredients || {}) };
    reqStatus.progress.forEach(({ ingredient, needed }) => {
      nextIngredients[ingredient.id] = Math.max(0, (nextIngredients[ingredient.id] || 0) - needed);
    });

    const nextUnlocked = isAlreadyUnlocked
      ? profile.unlockedRecipes
      : [...(profile.unlockedRecipes || []), recipe.id];

    const nextMastery = isAlreadyUnlocked ? mastery + 1 : 1;
    const nextMasteredMap = {
      ...(profile.masteredRecipes || {}),
      [recipe.id]: nextMastery,
    };

    // Calculate rewards
    const rewardCoins = isAlreadyUnlocked ? Math.round(recipe.rewardCoins * 0.6) : recipe.rewardCoins;
    const rewardGems = isAlreadyUnlocked ? Math.round(recipe.rewardGems * 0.5) : recipe.rewardGems;
    const rewardXp = isAlreadyUnlocked ? Math.round(recipe.rewardXp * 0.75) : recipe.rewardXp;

    const newXp = profile.xp + rewardXp;
    const newLevel = Math.floor(newXp / 500) + 1;

    // Audio & FX
    sfx.playBakeRecipe();
    confetti({
      particleCount: 90,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#ef4444', '#f59e0b', '#22c55e', '#ffffff'],
    });

    setBakedCelebration({
      recipe,
      masteryLevel: nextMastery,
    });

    onUpdateProfile({
      ...profile,
      coins: profile.coins + rewardCoins,
      gems: profile.gems + rewardGems,
      xp: newXp,
      level: newLevel,
      ingredients: nextIngredients,
      unlockedRecipes: nextUnlocked,
      masteredRecipes: nextMasteredMap,
      stats: {
        ...profile.stats,
        totalPizzasBaked: (profile.stats.totalPizzasBaked || 0) + 1,
      },
    });
  };

  // Filtered Recipes list
  const filteredRecipes = PIZZA_RECIPES.filter((recipe) => {
    if (filterDifficulty !== 'all' && recipe.difficulty !== filterDifficulty) return false;
    if (activeTab === 'ready_to_bake') {
      const isU = profile.unlockedRecipes?.includes(recipe.id);
      const m = profile.masteredRecipes?.[recipe.id] || (isU ? 1 : 0);
      return checkRecipeRequirements(recipe, profile.ingredients || {}, m).canBake;
    }
    if (activeTab === 'unlocked') {
      return profile.unlockedRecipes?.includes(recipe.id);
    }
    return true;
  });

  return (
    <div
      id="pizza_recipe_codex_modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in"
    >
      <div className="relative flex flex-col w-full max-w-5xl h-[92vh] max-h-[850px] bg-slate-900/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-slate-100">
        {/* TOP BANNER & PROGRESS OVERVIEW */}
        <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-gradient-to-r from-amber-950/70 via-slate-900/90 to-red-950/70 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-500 border border-white/20 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/20">
              🍕
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-['Outfit']">
                  Codex Culinario de Pizzas
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Progreso Culinario
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Recolecta ingredientes derrotando topos para desvelar recetas tradicionales y bonificaciones permanentes.
              </p>
            </div>
          </div>

          {/* Chef Rank Pill & Exit Button */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950/70 border border-white/10 px-3.5 py-1.5 rounded-2xl text-xs">
              <span className="text-base">{chefRank.icon}</span>
              <div className="text-left">
                <span className="text-[10px] text-slate-400 block font-semibold leading-none">Rango del Chef</span>
                <span className={`font-black ${chefRank.color}`}>{chefRank.title}</span>
              </div>
            </div>

            <button
              id="codex_btn_close"
              onClick={() => {
                sfx.playButtonClick();
                onClose();
              }}
              className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center border border-white/10 transition"
              title="Cerrar Codex"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* PROGRESS METRICS & PASSIVE PERKS STRIP */}
        <div className="px-5 py-2.5 bg-slate-950/60 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Progress Bar */}
          <div className="flex items-center gap-3 flex-1 min-w-[200px]">
            <span className="text-slate-400 font-bold whitespace-nowrap">
              Recetas Descubiertas: <strong className="text-white">{unlockedCount}</strong>/{totalRecipes}
            </span>
            <div className="flex-1 max-w-xs h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 transition-all duration-500 rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-amber-400 font-mono font-black">{progressPct}%</span>
          </div>

          {/* Quick Active Buff Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {activeBuffs.scoreMultiplier > 1 && (
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md font-mono text-[11px] font-bold">
                +Math.round((activeBuffs.scoreMultiplier - 1) * 100)% Puntos
              </span>
            )}
            {activeBuffs.critBonus > 0 && (
              <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-md font-mono text-[11px] font-bold">
                +{Math.round(activeBuffs.critBonus * 100)}% Crítico
              </span>
            )}
            {activeBuffs.goldenRateMultiplier > 1 && (
              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md font-mono text-[11px] font-bold">
                +{Math.round((activeBuffs.goldenRateMultiplier - 1) * 100)}% Topos Oro
              </span>
            )}
            {activeBuffs.ovenExtraDuration > 0 && (
              <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md font-mono text-[11px] font-bold">
                +{activeBuffs.ovenExtraDuration.toFixed(1)}s Horno
              </span>
            )}
          </div>
        </div>

        {/* TABS NAV */}
        <div className="flex items-center justify-between px-5 pt-3 border-b border-white/5 bg-slate-900/60">
          <div className="flex gap-2">
            <button
              onClick={() => {
                sfx.playPageFlip();
                setActiveTab('recipes');
              }}
              className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'recipes'
                  ? 'bg-slate-800 text-amber-400 border-t-2 border-amber-400 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Todas las Recetas ({PIZZA_RECIPES.length})
            </button>

            <button
              onClick={() => {
                sfx.playPageFlip();
                setActiveTab('ready_to_bake');
              }}
              className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'ready_to_bake'
                  ? 'bg-slate-800 text-emerald-400 border-t-2 border-emerald-400 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Listas para Hornear
            </button>

            <button
              onClick={() => {
                sfx.playPageFlip();
                setActiveTab('unlocked');
              }}
              className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'unlocked'
                  ? 'bg-slate-800 text-yellow-400 border-t-2 border-yellow-400 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              Descubiertas ({unlockedCount})
            </button>

            <button
              onClick={() => {
                sfx.playPageFlip();
                setActiveTab('pantry');
              }}
              className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'pantry'
                  ? 'bg-slate-800 text-cyan-400 border-t-2 border-cyan-400 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Despensa del Chef ({PIZZA_INGREDIENTS.length})
            </button>
          </div>
        </div>

        {/* MAIN CONTENT WORKSPACE */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col md:flex-row">
          {activeTab !== 'pantry' ? (
            <>
              {/* LEFT: RECIPE LIST SIDEBAR */}
              <aside className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-white/10 p-3 overflow-y-auto space-y-2 bg-slate-950/40">
                {filteredRecipes.length === 0 ? (
                  <div className="text-center py-12 px-4 text-slate-500 text-xs">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No hay recetas en esta categoría. ¡Sigue recolectando ingredientes derrotando topos!
                  </div>
                ) : (
                  filteredRecipes.map((recipe) => {
                    const unlocked = profile.unlockedRecipes?.includes(recipe.id);
                    const mastery = profile.masteredRecipes?.[recipe.id] || (unlocked ? 1 : 0);
                    const status = checkRecipeRequirements(recipe, profile.ingredients || {}, mastery);
                    const isSelected = selectedRecipeId === recipe.id;

                    return (
                      <div
                        key={recipe.id}
                        onClick={() => {
                          sfx.playButtonClick();
                          setSelectedRecipeId(recipe.id);
                        }}
                        className={`group relative p-3 rounded-2xl border transition-all cursor-pointer text-left ${
                          isSelected
                            ? 'bg-slate-800/90 border-amber-400/80 shadow-lg shadow-amber-500/10'
                            : 'bg-slate-900/60 hover:bg-slate-800/50 border-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border shadow-inner ${
                              unlocked
                                ? 'bg-amber-500/20 border-amber-500/30'
                                : status.canBake
                                ? 'bg-emerald-500/20 border-emerald-500/40 animate-pulse'
                                : 'bg-slate-800 border-white/5 grayscale opacity-75'
                            }`}
                          >
                            {recipe.imageEmoji}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <h4
                                className={`text-xs sm:text-sm font-bold truncate ${
                                  unlocked ? 'text-white' : 'text-slate-300'
                                }`}
                              >
                                {recipe.name}
                              </h4>
                              {unlocked ? (
                                <span className="flex items-center text-amber-400 text-[10px] font-mono font-bold">
                                  ★ {mastery}
                                </span>
                              ) : status.canBake ? (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black uppercase">
                                  ¡Listo!
                                </span>
                              ) : (
                                <Lock className="w-3.5 h-3.5 text-slate-500" />
                              )}
                            </div>

                            <span className="text-[10px] text-slate-400 block truncate">{recipe.italianName}</span>

                            {/* Mini progress bar of ingredients */}
                            <div className="mt-1.5 flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                                <div
                                  className={`h-full rounded-full ${
                                    status.canBake ? 'bg-emerald-400' : 'bg-amber-500/70'
                                  }`}
                                  style={{
                                    width: `${
                                      (status.progress.filter((p) => p.met).length / status.progress.length) * 100
                                    }%`,
                                  }}
                                />
                              </div>
                              <span className="text-[9px] text-slate-400 font-mono">
                                {status.progress.filter((p) => p.met).length}/{status.progress.length}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </aside>

              {/* RIGHT: SELECTED RECIPE DETAIL & BAKING STATION */}
              <section className="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col justify-between space-y-6">
                <div className="space-y-6">
                  {/* Hero Header of Recipe */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-900/90 border border-white/10 shadow-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-amber-600/30 to-red-600/30 border border-amber-500/40 flex items-center justify-center text-4xl shadow-xl">
                        {selectedRecipe.imageEmoji}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-xl sm:text-2xl font-black text-white font-['Outfit']">
                            {selectedRecipe.name}
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {selectedRecipe.badge}
                          </span>
                        </div>
                        <p className="text-xs text-amber-200/90 italic font-serif">{selectedRecipe.italianName}</p>
                        <div className="flex items-center gap-1 mt-1 text-amber-400 text-xs">
                          {Array.from({ length: selectedRecipe.difficulty }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-current" />
                          ))}
                          <span className="text-[10px] text-slate-400 ml-1">
                            Dificultad de Horno ({selectedRecipe.difficulty}/5)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="sm:text-right">
                      {isUnlocked ? (
                        <div className="inline-flex flex-col sm:items-end">
                          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl font-bold text-xs flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" /> Receta Dominada (Nivel {currentMastery})
                          </span>
                          <span className="text-[10px] text-slate-400 mt-1">Bonificación Activa Permanentemente</span>
                        </div>
                      ) : (
                        <div className="inline-flex flex-col sm:items-end">
                          <span className="px-3 py-1 bg-slate-800 text-slate-400 border border-white/10 rounded-xl font-bold text-xs flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5" /> Receta por Descubrir
                          </span>
                          <span className="text-[10px] text-slate-400 mt-1">Reúne ingredientes para hornear</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Lore & Historical Background */}
                  <div className="p-3.5 bg-slate-950/50 rounded-2xl border border-white/5 text-xs text-slate-300 leading-relaxed">
                    <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block mb-1">
                      Historia del Maestro Pizzaiolo
                    </span>
                    {selectedRecipe.lore}
                  </div>

                  {/* INGREDIENT REQUIREMENTS GRID */}
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider mb-3 flex items-center justify-between">
                      <span>Ingredientes Necesarios para el Horno</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        Haz clic en un ingrediente para ver su origen de drop
                      </span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {reqCheck.progress.map(({ ingredient, needed, available, met }) => {
                        return (
                          <div
                            key={ingredient.id}
                            onClick={() => setSelectedPantryIngredient(ingredient)}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                              met
                                ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-400'
                                : 'bg-slate-900/60 border-white/5 hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2.5">
                                <span className="text-2xl">{ingredient.iconEmoji}</span>
                                <div>
                                  <span className="text-xs font-bold text-white block">{ingredient.name}</span>
                                  <span className="text-[10px] text-slate-400">
                                    {ingredient.sourceTip}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right">
                                <span
                                  className={`text-xs font-black font-mono ${
                                    met ? 'text-emerald-400' : 'text-orange-400'
                                  }`}
                                >
                                  {available} / {needed}
                                </span>
                              </div>
                            </div>

                            {/* Mini progress line */}
                            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  met ? 'bg-emerald-500' : 'bg-orange-500'
                                }`}
                                style={{ width: `${Math.min(100, (available / needed) * 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* PASSIVE BONUS & MASTERY REWARDS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Passive Perk Card */}
                    <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/10 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block mb-1">
                          Efecto Pasivo Permanente
                        </span>
                        <div className="text-sm font-black text-white mb-1 flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-amber-400" />
                          {selectedRecipe.passiveBonus.label}
                        </div>
                        <p className="text-[11px] text-slate-300">{selectedRecipe.passiveBonus.description}</p>
                      </div>
                      {isUnlocked && (
                        <div className="mt-2.5 pt-2 border-t border-white/5 text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Estado: Activo en todas las partidas
                        </div>
                      )}
                    </div>

                    {/* Discovery Rewards Card */}
                    <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/10 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase text-yellow-400 tracking-wider block mb-1">
                          Recompensas al Hornear
                        </span>
                        <div className="flex items-center gap-3 mt-2 text-xs font-mono font-black">
                          <div className="flex items-center gap-1 text-yellow-400">
                            <span>🪙</span>
                            <span>+{selectedRecipe.rewardCoins} Monedas</span>
                          </div>
                          <div className="flex items-center gap-1 text-purple-400">
                            <span>💎</span>
                            <span>+{selectedRecipe.rewardGems} Gemas</span>
                          </div>
                          <div className="flex items-center gap-1 text-indigo-400">
                            <span>⭐</span>
                            <span>+{selectedRecipe.rewardXp} XP</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-white/5 text-[10px] text-slate-400">
                        {isUnlocked
                          ? `Maestría actual: Nivel ${currentMastery} de 3`
                          : 'Otorga recompensas y desbloquea el siguiente nivel de maestría.'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOTTOM ACTION BUTTON */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-4">
                  <div className="text-xs text-slate-400">
                    {reqCheck.canBake ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-orange-500 animate-bounce" />
                        ¡El horno de leña está listo a 450°C!
                      </span>
                    ) : (
                      <span className="text-slate-400">
                        Recolecta los ingredientes restantes golpeando a los topos indicados.
                      </span>
                    )}
                  </div>

                  <button
                    id="btn_bake_recipe"
                    disabled={!reqCheck.canBake}
                    onClick={() => handleBakeRecipe(selectedRecipe)}
                    className={`px-6 py-3.5 rounded-2xl text-sm font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-xl ${
                      reqCheck.canBake
                        ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:to-red-400 text-white shadow-orange-500/30 scale-105 animate-pulse cursor-pointer'
                        : 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <Flame className="w-4 h-4 fill-current" />
                    {isUnlocked ? `Mejorar Maestría ★ (Nivel ${currentMastery + 1})` : '¡Hornear & Descubrir Receta!'}
                  </button>
                </div>
              </section>
            </>
          ) : (
            /* PANTRY / INGREDIENT INVENTORY COMPENDIUM */
            <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6 bg-slate-950/20">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white font-['Outfit']">Despensa del Chef & Guía de Drops</h3>
                  <p className="text-xs text-slate-400">
                    Conoce qué especies de topos sueltan cada ingrediente gourmet y su probabilidad de botín.
                  </p>
                </div>
                <div className="text-xs font-mono font-bold text-amber-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-white/10">
                  Total Recolectado:{' '}
                  {Object.values(profile.ingredients || {}).reduce<number>((a, b) => a + (Number(b) || 0), 0)} unidades
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {PIZZA_INGREDIENTS.map((ingredient) => {
                  const count = profile.ingredients?.[ingredient.id] || 0;
                  const rarityBadge = {
                    common: { text: 'Común', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
                    uncommon: { text: 'Poco Común', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
                    rare: { text: 'Raro', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
                    legendary: { text: 'Legendario', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
                  }[ingredient.rarity];

                  return (
                    <div
                      key={ingredient.id}
                      onClick={() => setSelectedPantryIngredient(ingredient)}
                      className="p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-white/5 hover:border-white/20 transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-3xl">{ingredient.iconEmoji}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${rarityBadge.color} border`}>
                            {rarityBadge.text}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-white mb-0.5">{ingredient.name}</h4>
                        <span className="text-[10px] text-slate-400 italic block mb-2">{ingredient.italianName}</span>
                        <p className="text-xs text-slate-300 leading-snug line-clamp-2 mb-3">
                          {ingredient.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                        <div className="text-[10px] text-slate-400 font-medium">
                          En inventario:
                        </div>
                        <div className="text-sm font-black font-mono text-yellow-400">
                          {count}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mole Source Tip Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-red-950/40 border border-white/10 flex items-center gap-4 text-xs">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-xl shrink-0">
                  🔥
                </div>
                <div>
                  <h5 className="font-bold text-white">Consejo del Chef: ¡Potenciador Horno de Pizza!</h5>
                  <p className="text-slate-300 text-[11px]">
                    Activar el <strong>Horno de Pizza Abrasador</strong> no solo incinera a todos los topos del tablero, sino que <strong>duplica la tasa de drop</strong> y otorga Aceite de Guindilla Ardiente garantizado.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* INGREDIENT DETAIL MODAL POPUP */}
        {selectedPantryIngredient && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl p-5 shadow-2xl text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-white/10 mx-auto mb-3 flex items-center justify-center text-3xl shadow-inner">
                {selectedPantryIngredient.iconEmoji}
              </div>
              <h4 className="text-lg font-black text-white">{selectedPantryIngredient.name}</h4>
              <p className="text-xs text-amber-300 italic font-serif mb-2">
                {selectedPantryIngredient.italianName}
              </p>
              <p className="text-xs text-slate-300 mb-4">{selectedPantryIngredient.description}</p>

              <div className="p-3 bg-slate-950 rounded-2xl border border-white/5 text-left text-xs mb-4">
                <span className="text-[10px] font-black uppercase text-cyan-400 block mb-1">
                  Dónde Encontrar (Loot Drops)
                </span>
                <p className="text-slate-300">{selectedPantryIngredient.sourceTip}</p>
                <div className="mt-2 pt-2 border-t border-white/5 flex justify-between text-[11px] font-mono text-slate-400">
                  <span>Probabilidad base:</span>
                  <span className="text-emerald-400 font-bold">
                    {Math.round(selectedPantryIngredient.dropChance * 100)}%
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedPantryIngredient(null)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-white/10 transition"
              >
                Entendido
              </button>
            </div>
          </div>
        )}

        {/* CELEBRATION MODAL (ON BAKING SUCCESS) */}
        {bakedCelebration && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-md bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl text-center space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-red-500 border-2 border-white/20 mx-auto flex items-center justify-center text-4xl shadow-[0_0_40px_rgba(245,158,11,0.5)] animate-bounce">
                {bakedCelebration.recipe.imageEmoji}
              </div>

              <div>
                <span className="text-xs font-black text-amber-400 uppercase tracking-widest block">
                  ¡RECETA HORNEADA CON ÉXITO!
                </span>
                <h3 className="text-2xl font-black text-white font-['Outfit']">
                  {bakedCelebration.recipe.name}
                </h3>
                <span className="text-xs text-amber-200 italic font-serif">
                  {bakedCelebration.recipe.italianName}
                </span>
              </div>

              <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300">
                <span className="font-black block text-emerald-400 mb-0.5">
                  ★ Bonificación Desbloqueada:
                </span>
                {bakedCelebration.recipe.passiveBonus.label} — {bakedCelebration.recipe.passiveBonus.description}
              </div>

              {/* Rewards */}
              <div className="flex items-center justify-center gap-4 bg-slate-950 p-3 rounded-2xl border border-white/10 text-xs font-mono font-black">
                <div className="text-yellow-400 flex items-center gap-1">
                  <span>🪙</span>
                  <span>+{bakedCelebration.recipe.rewardCoins}</span>
                </div>
                <div className="text-purple-400 flex items-center gap-1">
                  <span>💎</span>
                  <span>+{bakedCelebration.recipe.rewardGems}</span>
                </div>
                <div className="text-indigo-400 flex items-center gap-1">
                  <span>⭐</span>
                  <span>+{bakedCelebration.recipe.rewardXp} XP</span>
                </div>
              </div>

              <button
                id="btn_claim_baked_recipe"
                onClick={() => setBakedCelebration(null)}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-sm uppercase rounded-2xl tracking-wider transition shadow-lg shadow-orange-500/30"
              >
                ¡Añadir al Recetario Maestro!
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
