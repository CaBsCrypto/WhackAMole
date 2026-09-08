import { PizzaIngredient, PizzaRecipe, IngredientId, MoleType } from '../types';

export const PIZZA_INGREDIENTS: PizzaIngredient[] = [
  {
    id: 'flour',
    name: 'Harina Seleccionada 00',
    italianName: 'Farina Tipo 00 di Grano Tenero',
    description: 'Molienda artesanal italiana extra fina, base esponjosa y crujiente de toda gran masa napolitana.',
    iconEmoji: '🌾',
    rarity: 'common',
    color: '#fef08a',
    bgGradient: 'from-amber-950/40 to-slate-900/80',
    droppedBy: ['standard', 'fast'],
    dropChance: 0.55,
    sourceTip: 'Topos Estándar y Repartidores Exprés',
  },
  {
    id: 'san_marzano_tomato',
    name: 'Tomate San Marzano D.O.P.',
    italianName: 'Pomodoro San Marzano dell’Agro Sarnese-Nocerino',
    description: 'Cultivado en las faldas volcánicas del Vesubio. Dulzura intensa, bajo nivel de acidez y color rojo rubí.',
    iconEmoji: '🍅',
    rarity: 'uncommon',
    color: '#ef4444',
    bgGradient: 'from-red-950/40 to-slate-900/80',
    droppedBy: ['tough', 'helmet', 'standard'],
    dropChance: 0.42,
    sourceTip: 'Topos Blindados, Cascos y Estándar',
  },
  {
    id: 'mozzarella_di_bufala',
    name: 'Mozzarella di Bufala Campana',
    italianName: 'Mozzarella di Bufala Campana D.O.P.',
    description: 'Queso fresco de leche de búfala cremoso y elástico que se funde en hebras doradas irresistibles.',
    iconEmoji: '🧀',
    rarity: 'uncommon',
    color: '#fde047',
    bgGradient: 'from-yellow-950/40 to-slate-900/80',
    droppedBy: ['frost', 'phantom', 'fast'],
    dropChance: 0.4,
    sourceTip: 'Topos Glaciales, Fantasmas y Rápidos',
  },
  {
    id: 'spicy_pepperoni',
    name: 'Pepperoni Calabrés Ahumado',
    italianName: 'Salame Calabrese Piccante Affumicato',
    description: 'Embutido curado con pimentón picante de Calabria y notas ahumadas que crujen al hornearse.',
    iconEmoji: '🥓',
    rarity: 'uncommon',
    color: '#dc2626',
    bgGradient: 'from-rose-950/40 to-slate-900/80',
    droppedBy: ['bomb', 'tough', 'boss'],
    dropChance: 0.45,
    sourceTip: 'Topos Bomba (bloqueadas/vaporizadas), Blindados y Jefes',
  },
  {
    id: 'fresh_basil',
    name: 'Albahaca Genovesa Fresca',
    italianName: 'Basilico Genovese D.O.P.',
    description: 'Hojas aromáticas recién recolectadas del huerto de la Nonna para coronar con perfume celestial.',
    iconEmoji: '🌿',
    rarity: 'common',
    color: '#22c55e',
    bgGradient: 'from-emerald-950/40 to-slate-900/80',
    droppedBy: ['standard', 'rainbow', 'fast'],
    dropChance: 0.48,
    sourceTip: 'Topos Estándar, Arcoíris y Rápidos',
  },
  {
    id: 'gorgonzola_cremosa',
    name: 'Queso Gorgonzola Dolce D.O.P.',
    italianName: 'Gorgonzola Dolce Cremoso',
    description: 'Queso azul veteado de los valles del norte de Italia con sabor profundo, suave y aterciopelado.',
    iconEmoji: '🧈',
    rarity: 'rare',
    color: '#38bdf8',
    bgGradient: 'from-sky-950/40 to-slate-900/80',
    droppedBy: ['phantom', 'helmet', 'tough'],
    dropChance: 0.32,
    sourceTip: 'Topos Fantasma, Cascos y Blindados',
  },
  {
    id: 'hot_chili_oil',
    name: 'Aceite de Guindilla Ardiente',
    italianName: 'Olio Santo al Peperoncino Rosso Piccante',
    description: 'Aceite de oliva virgen extra macerado con guindillas del Vesubio al fuego directo del horno de leña.',
    iconEmoji: '🔥',
    rarity: 'rare',
    color: '#ea580c',
    bgGradient: 'from-orange-950/40 to-slate-900/80',
    droppedBy: ['boss', 'bomb'],
    dropChance: 0.38,
    sourceTip: '¡Garantizado en Horno de Pizza Abrasador y Topos Jefe!',
  },
  {
    id: 'black_truffle',
    name: 'Trufa Negra de Verano 24K',
    italianName: 'Tartufo Nero Estivo dei Colli Bolognesi',
    description: 'El diamante negro de la alta gastronomía italiana. Aroma embriagador que corona las recetas legendarias.',
    iconEmoji: '✨',
    rarity: 'legendary',
    color: '#eab308',
    bgGradient: 'from-amber-950/60 to-purple-950/60',
    droppedBy: ['golden', 'rainbow', 'boss'],
    dropChance: 0.65,
    sourceTip: 'Topos Dorados 24K, Arcoíris Astral y Jefes',
  },
];

export const PIZZA_RECIPES: PizzaRecipe[] = [
  {
    id: 'margherita_tradizionale',
    name: 'Margherita Tradizionale',
    italianName: 'Pizza Margherita Verace D.O.C.',
    badge: 'Clásico Real',
    description: 'La reina indiscutible creada en 1889 en Nápoles en honor a la reina Margherita con el tricolor italiano.',
    lore: 'Elaborada únicamente con tomate San Marzano triturado a mano, mozzarella de búfala hilada y hojas de albahaca fresca.',
    difficulty: 1,
    imageEmoji: '🍕',
    themeColor: '#ef4444',
    requirements: [
      { ingredientId: 'flour', count: 4 },
      { ingredientId: 'san_marzano_tomato', count: 3 },
      { ingredientId: 'mozzarella_di_bufala', count: 3 },
      { ingredientId: 'fresh_basil', count: 2 },
    ],
    rewardCoins: 250,
    rewardGems: 10,
    rewardXp: 200,
    passiveBonus: {
      label: '+12% Puntuación Base',
      description: 'Aumenta permanentemente toda la puntuación obtenida al golpear topos.',
      statType: 'score_bonus',
      value: 0.12,
    },
    masteryLevels: [
      { level: 1, title: 'Aprendiz Pizzaiolo', reqMultiplier: 1, extraBonusText: '+12% Puntuación Base' },
      { level: 2, title: 'Maestro de Nápoles', reqMultiplier: 2, extraBonusText: '+18% Puntuación Base & +50 Monedas' },
      { level: 3, title: 'Gran Chef de la Corona', reqMultiplier: 3, extraBonusText: '+25% Puntuación Base & Aura Dorada' },
    ],
  },
  {
    id: 'diavola_calabrese',
    name: 'Diavola Calabrese',
    italianName: 'Pizza alla Diavola con Nduja e Salame',
    badge: 'Fuego Ardiente',
    description: 'Para los amantes de la emoción picante. Crujiente pepperoni sobre un lecho fundido de mozzarella ardiente.',
    lore: 'El aceite sagrado de guindilla despierta los sentidos y afina la precisión de impacto del rodillo.',
    difficulty: 2,
    imageEmoji: '🌶️',
    themeColor: '#f97316',
    requirements: [
      { ingredientId: 'flour', count: 5 },
      { ingredientId: 'san_marzano_tomato', count: 4 },
      { ingredientId: 'mozzarella_di_bufala', count: 3 },
      { ingredientId: 'spicy_pepperoni', count: 4 },
      { ingredientId: 'hot_chili_oil', count: 2 },
    ],
    rewardCoins: 400,
    rewardGems: 15,
    rewardXp: 350,
    passiveBonus: {
      label: '+8% Golpe Crítico & Fuego',
      description: 'Aumenta la probabilidad de impacto crítico y potencia el daño del Horno de Pizza.',
      statType: 'crit_rate',
      value: 0.08,
    },
    masteryLevels: [
      { level: 1, title: 'Iniciador del Fuego', reqMultiplier: 1, extraBonusText: '+8% Golpe Crítico' },
      { level: 2, title: 'Domador del Horno', reqMultiplier: 2, extraBonusText: '+12% Golpe Crítico & +15% Daño Horno' },
      { level: 3, title: 'Señor del Volcán', reqMultiplier: 3, extraBonusText: '+18% Golpe Crítico & Destello Ígneo' },
    ],
  },
  {
    id: 'quattro_formaggi_reale',
    name: 'Quattro Formaggi Reale',
    italianName: 'Pizza ai Quattro Formaggi di Montagna',
    badge: 'Queso Fundido',
    description: 'Fusión sublime de cuatro quesos seleccionados fundidos al punto de hebra perfecta con un toque azul cremoso.',
    lore: 'El aroma untuoso del Gorgonzola y la Mozzarella crea una barrera impenetrable contra los golpes fallidos.',
    difficulty: 3,
    imageEmoji: '🧀',
    themeColor: '#eab308',
    requirements: [
      { ingredientId: 'flour', count: 5 },
      { ingredientId: 'mozzarella_di_bufala', count: 5 },
      { ingredientId: 'gorgonzola_cremosa', count: 4 },
      { ingredientId: 'fresh_basil', count: 3 },
    ],
    rewardCoins: 550,
    rewardGems: 20,
    rewardXp: 450,
    passiveBonus: {
      label: '+15% Escudo & +30 Monedas/Partida',
      description: 'Otorga monedas adicionales garantizadas en cada ronda y refuerza los escudos.',
      statType: 'coin_bonus',
      value: 0.15,
    },
    masteryLevels: [
      { level: 1, title: 'Amante del Queso', reqMultiplier: 1, extraBonusText: '+15% Escudos & +30 Monedas' },
      { level: 2, title: 'Maestro Fondue', reqMultiplier: 2, extraBonusText: '+25% Escudos & +60 Monedas' },
      { level: 3, title: 'Monarca de los Quesos', reqMultiplier: 3, extraBonusText: '+40% Escudos & +100 Monedas' },
    ],
  },
  {
    id: 'tartufo_oro_supreme',
    name: 'Tartufo Oro Supreme 24K',
    italianName: 'Pizza al Tartufo Nero Pregiato e Oro 24K',
    badge: 'Gourmet Legendario',
    description: 'Exclusiva creación de gala adornada con láminas doradas de 24 quilates y virutas de trufa negra fresca.',
    lore: 'Los topos dorados no pueden resistirse al hipnótico perfume de la trufa y acudirán en bandadas.',
    difficulty: 4,
    imageEmoji: '👑',
    themeColor: '#fbbf24',
    requirements: [
      { ingredientId: 'flour', count: 6 },
      { ingredientId: 'mozzarella_di_bufala', count: 5 },
      { ingredientId: 'black_truffle', count: 4 },
      { ingredientId: 'fresh_basil', count: 4 },
    ],
    rewardCoins: 850,
    rewardGems: 35,
    rewardXp: 700,
    passiveBonus: {
      label: '+30% Topos Dorados & +50% XP',
      description: 'Multiplica significativamente la frecuencia de aparición de Topos Dorados de trufa.',
      statType: 'golden_rate',
      value: 0.3,
    },
    masteryLevels: [
      { level: 1, title: 'Coleccionista de Oro', reqMultiplier: 1, extraBonusText: '+30% Topos Dorados' },
      { level: 2, title: 'Magnate de la Trufa', reqMultiplier: 2, extraBonusText: '+45% Topos Dorados & +75% XP' },
      { level: 3, title: 'Emperador Michelin 3★', reqMultiplier: 3, extraBonusText: '+65% Topos Dorados & Lluvia Dorada' },
    ],
  },
  {
    id: 'marinara_rustica_napoletana',
    name: 'Marinara Rustica del Vesubio',
    italianName: 'Pizza Marinara dell’Antico Porto',
    badge: 'Herencia Antigua',
    description: 'La receta marina más antigua de los marineros de Nápoles: salsa concentrada, ajo dorado y orégano silvestre.',
    lore: 'Ligera y enérgica, otorga al pizzaiolo una cadencia de balanceo veloz e incansable.',
    difficulty: 2,
    imageEmoji: '🧄',
    themeColor: '#e11d48',
    requirements: [
      { ingredientId: 'flour', count: 4 },
      { ingredientId: 'san_marzano_tomato', count: 6 },
      { ingredientId: 'fresh_basil', count: 3 },
      { ingredientId: 'hot_chili_oil', count: 2 },
    ],
    rewardCoins: 350,
    rewardGems: 12,
    rewardXp: 280,
    passiveBonus: {
      label: '+12% Velocidad de Mazo',
      description: 'Reduce la fricción de recuperación de impacto del rodillo/mazo tras cada golpe.',
      statType: 'speed_boost',
      value: 0.12,
    },
    masteryLevels: [
      { level: 1, title: 'Marinero Veloz', reqMultiplier: 1, extraBonusText: '+12% Velocidad de Mazo' },
      { level: 2, title: 'Timonel de la Bahía', reqMultiplier: 2, extraBonusText: '+18% Velocidad de Mazo' },
      { level: 3, title: 'Capitán de los Mares', reqMultiplier: 3, extraBonusText: '+25% Velocidad & Estela Marina' },
    ],
  },
  {
    id: 'inferno_vulcano_speciale',
    name: 'Inferno Vulcano Speciale',
    italianName: 'Pizza Vulcano al Fuoco di Magma',
    badge: 'Horno Máximo',
    description: 'Hornada a temperaturas extremas directamente en las brasas del Vesubio con doble aceite de guindilla.',
    lore: 'Desata una oleada de calor que prolonga la duración y el alcance incinerador del Horno de Pizza.',
    difficulty: 5,
    imageEmoji: '🌋',
    themeColor: '#c2410c',
    requirements: [
      { ingredientId: 'flour', count: 7 },
      { ingredientId: 'san_marzano_tomato', count: 5 },
      { ingredientId: 'mozzarella_di_bufala', count: 5 },
      { ingredientId: 'spicy_pepperoni', count: 6 },
      { ingredientId: 'hot_chili_oil', count: 5 },
      { ingredientId: 'black_truffle', count: 3 },
    ],
    rewardCoins: 1200,
    rewardGems: 50,
    rewardXp: 1000,
    passiveBonus: {
      label: '+2.5s Horno de Pizza & +20% Combo',
      description: 'Extiende drásticamente la duración activa del Horno de Pizza Abrasador a 7.5 segundos.',
      statType: 'oven_duration',
      value: 2.5,
    },
    masteryLevels: [
      { level: 1, title: 'Hijo del Magma', reqMultiplier: 1, extraBonusText: '+2.5s Horno de Pizza' },
      { level: 2, title: 'Señor del Cráter', reqMultiplier: 2, extraBonusText: '+3.5s Horno & +30% Combo' },
      { level: 3, title: 'Avatar del Vesubio', reqMultiplier: 3, extraBonusText: '+5.0s Horno & Ignición Total' },
    ],
  },
  {
    id: 'glaciale_formaggio_arcano',
    name: 'Glaciale Formaggio Arcano',
    italianName: 'Pizza Bianco Neve ai Formaggi Alpini',
    badge: 'Criogenia Helada',
    description: 'Masa blanca enfriada a punto de nieve con velo de Gorgonzola alpino y mozzarella cristalina.',
    lore: 'Emite un aura escarchada que añade tiempo extra al reloj del horno al golpear topos helados.',
    difficulty: 3,
    imageEmoji: '❄️',
    themeColor: '#0284c7',
    requirements: [
      { ingredientId: 'flour', count: 5 },
      { ingredientId: 'mozzarella_di_bufala', count: 5 },
      { ingredientId: 'gorgonzola_cremosa', count: 4 },
      { ingredientId: 'fresh_basil', count: 3 },
    ],
    rewardCoins: 500,
    rewardGems: 18,
    rewardXp: 400,
    passiveBonus: {
      label: '+2s Tiempo Extra en Topos Frost',
      description: 'Golpear topos de tipo Frost (Glacial) añade 2 segundos adicionales de tiempo.',
      statType: 'frost_chill',
      value: 2.0,
    },
    masteryLevels: [
      { level: 1, title: 'Escarchador Novato', reqMultiplier: 1, extraBonusText: '+2s Tiempo Extra Frost' },
      { level: 2, title: 'Maestro Criogénico', reqMultiplier: 2, extraBonusText: '+3s Tiempo Extra Frost' },
      { level: 3, title: 'Señor del Cero Absoluto', reqMultiplier: 3, extraBonusText: '+4s Tiempo & Congelación Masiva' },
    ],
  },
];

/**
 * Calculates whether a specific mole drop triggers and returns the looted ingredient (if any)
 */
export function rollIngredientDropForMole(
  moleType: MoleType,
  isPizzaOvenActive = false
): PizzaIngredient | null {
  // If Pizza Oven is active, there's a strong chance of guaranteed chili oil or roasted pepperoni
  if (isPizzaOvenActive && Math.random() < 0.65) {
    const ovenSpecial = Math.random() > 0.4 ? 'hot_chili_oil' : 'spicy_pepperoni';
    return PIZZA_INGREDIENTS.find((ing) => ing.id === ovenSpecial) || null;
  }

  // Find candidate ingredients that drop from this mole type
  let candidates = PIZZA_INGREDIENTS.filter((ing) => ing.droppedBy.includes(moleType));
  if (candidates.length === 0) {
    // Fallback candidates: flour or tomato or basil
    candidates = PIZZA_INGREDIENTS.filter((ing) => ['flour', 'san_marzano_tomato', 'fresh_basil'].includes(ing.id));
  }

  // Pick candidate based on drop chance
  const candidate = candidates[Math.floor(Math.random() * candidates.length)];
  const roll = Math.random();
  const boostedChance = isPizzaOvenActive ? 0.95 : Math.min(0.85, candidate.dropChance * 1.7);

  if (roll < boostedChance) {
    return candidate;
  }

  return null;
}

/**
 * Checks if user has enough ingredients to bake or level up a recipe
 */
export function checkRecipeRequirements(
  recipe: PizzaRecipe,
  userIngredients: Record<string, number>,
  masteryLevel = 0
): { canBake: boolean; progress: { ingredient: PizzaIngredient; needed: number; available: number; met: boolean }[] } {
  const reqMultiplier = masteryLevel > 0 ? (recipe.masteryLevels[masteryLevel]?.reqMultiplier || masteryLevel + 1) : 1;

  let canBake = true;
  const progress = recipe.requirements.map((req) => {
    const ingredient = PIZZA_INGREDIENTS.find((ing) => ing.id === req.ingredientId)!;
    const needed = req.count * reqMultiplier;
    const available = userIngredients[req.ingredientId] || 0;
    const met = available >= needed;
    if (!met) canBake = false;

    return {
      ingredient,
      needed,
      available,
      met,
    };
  });

  return { canBake, progress };
}

/**
 * Computes the aggregated passive gameplay buffs from all unlocked & mastered recipes
 */
export function calculateRecipeBuffs(
  unlockedRecipes: string[] = [],
  masteredRecipes: Record<string, number> = {}
) {
  let scoreMultiplier = 1.0;
  let critBonus = 0;
  let coinBonusPerMatch = 0;
  let goldenRateMultiplier = 1.0;
  let ovenExtraDuration = 0;
  let speedBonus = 0;
  let frostTimeBonus = 0;

  unlockedRecipes.forEach((recipeId) => {
    const recipe = PIZZA_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return;

    const mastery = masteredRecipes[recipeId] || 1;
    const bonusScale = 1 + (mastery - 1) * 0.4; // Mastery level 1: 1.0x, Level 2: 1.4x, Level 3: 1.8x

    switch (recipe.passiveBonus.statType) {
      case 'score_bonus':
        scoreMultiplier += recipe.passiveBonus.value * bonusScale;
        break;
      case 'crit_rate':
        critBonus += recipe.passiveBonus.value * bonusScale;
        break;
      case 'coin_bonus':
        coinBonusPerMatch += Math.round(30 * bonusScale);
        break;
      case 'golden_rate':
        goldenRateMultiplier += recipe.passiveBonus.value * bonusScale;
        break;
      case 'oven_duration':
        ovenExtraDuration += recipe.passiveBonus.value * bonusScale;
        break;
      case 'speed_boost':
        speedBonus += recipe.passiveBonus.value * bonusScale;
        break;
      case 'frost_chill':
        frostTimeBonus += recipe.passiveBonus.value * bonusScale;
        break;
    }
  });

  return {
    scoreMultiplier,
    critBonus,
    coinBonusPerMatch,
    goldenRateMultiplier,
    ovenExtraDuration,
    speedBonus,
    frostTimeBonus,
  };
}
