import { UserProfile, HammerItem, PowerupItem, WeeklyChallenge, SpecialEvent } from '../types';

export const DEFAULT_HAMMERS: HammerItem[] = [
  {
    id: 'wooden_mallet',
    name: 'Gran Uslero de la Nonna',
    description: 'Auténtico uslero de madera noble de haya impregnado de harina y tradición. ¡El arma sagrada de la Nonna para amasar masas crujientes y escarmentar a los topos ladrones!',
    price: 0,
    currency: 'coins',
    damage: 1,
    speed: 1.0,
    critChance: 0.05,
    scoreBonus: 1.0,
    specialEffect: 'none',
    color: '#92400e',
    handleColor: '#d97706',
    headShape: 'uslero',
    unlocked: true,
    level: 1,
  },
  {
    id: 'golden_sledge',
    name: 'Pala Rústica de Horno a la Leña',
    description: 'Pala artesanal de madera con remaches de latón forjada en Nápoles. ¡Los topos derrotados otorgan +50% de monedas!',
    price: 600,
    currency: 'coins',
    damage: 1,
    speed: 1.15,
    critChance: 0.15,
    scoreBonus: 1.5,
    specialEffect: 'golden_touch',
    color: '#fbbf24',
    handleColor: '#b45309',
    headShape: 'warhammer',
    glowColor: '#fef08a',
    unlocked: false,
    level: 1,
  },
  {
    id: 'cyber_crusher',
    name: 'Cortapizzas Napolitano de Acero',
    description: 'Rueda circular giratoria de acero inoxidable con filo pulido. Rápido y letal para cortes precisos de pizza.',
    price: 1400,
    currency: 'coins',
    damage: 2,
    speed: 1.35,
    critChance: 0.25,
    scoreBonus: 1.8,
    specialEffect: 'lightning',
    color: '#06b6d4',
    handleColor: '#3b82f6',
    headShape: 'cyber',
    glowColor: '#22d3ee',
    unlocked: false,
    level: 1,
  },
  {
    id: 'thunder_mjolnir',
    name: 'Uslero Pesado de Mármol de Carrara',
    description: 'Tallado en puro mármol blanco italiano con mangos dorados torneados. Pesa 4 kg: aplasta ingredientes y topos con contundencia suprema.',
    price: 45,
    currency: 'gems',
    damage: 2,
    speed: 1.45,
    critChance: 0.35,
    scoreBonus: 2.2,
    specialEffect: 'lightning',
    color: '#f8fafc',
    handleColor: '#eab308',
    headShape: 'uslero',
    glowColor: '#fef08a',
    unlocked: false,
    level: 1,
  },
  {
    id: 'lava_cleaver',
    name: 'Uslero Volcánico del Vesubio',
    description: 'Madera petrificada y basalto volcánico del monte Vesubio con vetas incandescentes. ¡Incinera agujeros con brasas ardientes!',
    price: 80,
    currency: 'gems',
    damage: 3,
    speed: 1.3,
    critChance: 0.3,
    scoreBonus: 2.5,
    specialEffect: 'fire_burst',
    color: '#1c1917',
    handleColor: '#ea580c',
    headShape: 'uslero',
    glowColor: '#f97316',
    unlocked: false,
    level: 1,
  },
  {
    id: 'cosmic_void',
    name: 'Uslero Divino de Oro 24K',
    description: 'Bañado en oro macizo con el lazo tricolor de la Academia Pizzaiola. Máxima velocidad de amasado y lluvia de ingredientes legendarios.',
    price: 150,
    currency: 'gems',
    damage: 3,
    speed: 1.6,
    critChance: 0.45,
    scoreBonus: 3.0,
    specialEffect: 'freeze_wave',
    color: '#eab308',
    handleColor: '#ca8a04',
    headShape: 'uslero',
    glowColor: '#fde047',
    unlocked: false,
    level: 1,
  },
];

export const DEFAULT_POWERUPS: PowerupItem[] = [
  {
    id: 'time_freeze',
    name: 'Gelato Criogénico (5s)',
    description: 'Detiene el reloj del horno y ralentiza a los ladrones por 5 segundos.',
    icon: 'Snowflake',
    count: 2,
    price: 150,
    currency: 'coins',
    duration: 5,
  },
  {
    id: 'golden_frenzy',
    name: 'Lluvia de Parmesano 24K',
    description: '¡Invoca 6 topos dorados de trufa seguidos para recolectar un festín de monedas!',
    icon: 'Sparkles',
    count: 1,
    price: 300,
    currency: 'coins',
    duration: 6,
  },
  {
    id: 'bomb_shield',
    name: 'Escudo Anti-Piña Prohibida',
    description: 'Protege tu pizza de las próximas 2 bombas de chile habanero o piña sin penalización.',
    icon: 'Shield',
    count: 2,
    price: 200,
    currency: 'coins',
    duration: 30,
  },
  {
    id: 'double_points',
    name: 'Salsa Especial San Marzano',
    description: 'Duplica todos los puntos de la masa y combos durante 10 segundos.',
    icon: 'Flame',
    count: 1,
    price: 250,
    currency: 'coins',
    duration: 10,
  },
  {
    id: 'pizza_oven',
    name: 'Horno de Pizza Abrasador (5s)',
    description: 'Crea una zona de calor abrasador sobre todos los agujeros, incinerando y derrotando automáticamente a cualquier topo que asome durante 5 segundos.',
    icon: 'PizzaOven',
    count: 2,
    price: 350,
    currency: 'coins',
    duration: 5,
  },
];

export const DEFAULT_CHALLENGES: WeeklyChallenge[] = [
  {
    id: 'w1_moles',
    title: 'Defensor de la Cocina',
    description: 'Golpea 150 topos ladrones en cualquier modo de juego',
    target: 150,
    current: 0,
    rewardCoins: 500,
    rewardGems: 10,
    claimed: false,
    icon: 'Target',
    type: 'moles_hit',
  },
  {
    id: 'w1_golden',
    title: 'Cazador de Trufas Doradas',
    description: 'Atrapa 25 Topos Dorados de Parmesano',
    target: 25,
    current: 0,
    rewardCoins: 750,
    rewardGems: 15,
    claimed: false,
    icon: 'Coins',
    type: 'golden_hit',
  },
  {
    id: 'w1_combo',
    title: 'Maestro del Ritmo Napolitano',
    description: 'Alcanza una racha de combo de 20x preparando pizzas',
    target: 20,
    current: 0,
    rewardCoins: 400,
    rewardGems: 8,
    claimed: false,
    icon: 'Zap',
    type: 'combo_streak',
  },
  {
    id: 'w1_chef_mastery',
    title: 'Maestro Pizzero',
    description: 'Elimina 50 topos en defensa de la cocina',
    target: 50,
    current: 0,
    rewardCoins: 1000,
    rewardGems: 25,
    claimed: false,
    icon: 'Trophy',
    type: 'moles_hit',
  },
];

export const CURRENT_EVENTS: SpecialEvent[] = [
  {
    id: 'event_gold_rush',
    title: 'Golden Weekend Rush',
    badge: 'HOT EVENT',
    description: 'Golden Moles spawn with 3x frequency and grant double coin rewards!',
    modifier: 'double_golden',
    multiplier: 2.0,
    active: true,
    endsInHours: 42,
    bannerColor: 'from-amber-500 to-yellow-600',
  },
  {
    id: 'event_speed_madness',
    title: 'Frenzy Blitz',
    badge: 'ACTIVE',
    description: 'Moles pop up 30% faster with 2x combo multiplier!',
    modifier: 'speed_frenzy',
    multiplier: 2.0,
    active: true,
    endsInHours: 18,
    bannerColor: 'from-purple-600 to-indigo-700',
  },
];

const LOCAL_STORAGE_KEY = 'whack_a_mole_3d_user_data_v2';

export const createDefaultProfile = (): UserProfile => {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return {
    id: 'user_' + Math.random().toString(36).substring(2, 9),
    name: 'Whacker_' + randomSuffix,
    coins: 350,
    gems: 15,
    level: 1,
    xp: 0,
    highScore: 0,
    avatar: {
      skinTone: '#fbcfe8',
      headwear: 'cap',
      glasses: 'aviators',
      expression: 'smug',
      outfitColor: '#3b82f6',
      badge: 'Hammer Novice',
      title: 'Mole Whacker',
    },
    selectedHammerId: 'wooden_mallet',
    inventoryHammers: ['wooden_mallet'],
    powerups: {
      time_freeze: 2,
      golden_frenzy: 1,
      bomb_shield: 2,
      double_points: 1,
      pizza_oven: 2,
    },
    ingredients: {
      flour: 6,
      san_marzano_tomato: 4,
      mozzarella_di_bufala: 3,
      spicy_pepperoni: 2,
      fresh_basil: 3,
      gorgonzola_cremosa: 1,
      hot_chili_oil: 1,
      black_truffle: 0,
    },
    unlockedRecipes: [],
    masteredRecipes: {},
    unlockedThemes: ['garden', 'arcade', 'cyber', 'volcano'],
    stats: {
      totalMolesHit: 0,
      totalGoldenHit: 0,
      totalBombsHit: 0,
      totalHelmetsBroken: 0,
      highestCombo: 0,
      duelsPlayed: 0,
      duelsWon: 0,
      totalScore: 0,
      totalIngredientsCollected: 19,
      totalPizzasBaked: 0,
    },
    settings: {
      soundVolume: 0.8,
      musicVolume: 0.6,
      vibration: true,
      darkMode: true,
      theme: 'garden',
      pushNotifications: true,
      showFps: false,
      controlMode: 'classic',
      cameraPipCollapsed: false,
    },
    challenges: DEFAULT_CHALLENGES,
    completedAchievements: [],
    lastLoginDate: new Date().toISOString(),
  };
};

export const storageService = {
  loadProfile(): UserProfile {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // ensure default structure updates
        return {
          ...createDefaultProfile(),
          ...parsed,
          avatar: { ...createDefaultProfile().avatar, ...(parsed.avatar || {}) },
          stats: { ...createDefaultProfile().stats, ...(parsed.stats || {}) },
          settings: { ...createDefaultProfile().settings, ...(parsed.settings || {}) },
          powerups: {
            ...createDefaultProfile().powerups,
            ...(parsed.powerups || {}),
            pizza_oven: parsed.powerups?.pizza_oven !== undefined ? parsed.powerups.pizza_oven : 2,
          },
          ingredients: {
            ...createDefaultProfile().ingredients,
            ...(parsed.ingredients || {}),
          },
          unlockedRecipes: Array.isArray(parsed.unlockedRecipes) ? parsed.unlockedRecipes : [],
          masteredRecipes: parsed.masteredRecipes || {},
          challenges: parsed.challenges?.length ? parsed.challenges : DEFAULT_CHALLENGES,
        };
      }
    } catch (e) {
      console.error('Error loading local profile', e);
    }
    const fresh = createDefaultProfile();
    this.saveProfile(fresh);
    return fresh;
  },

  saveProfile(profile: UserProfile): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profile));
      // Asynchronously sync with backend cloud
      this.syncCloud(profile).catch(() => {});
    } catch (e) {
      console.error('Error saving local profile', e);
    }
  },

  async syncCloud(profile: UserProfile): Promise<boolean> {
    try {
      const res = await fetch('/api/user/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async fetchLeaderboard(type: 'global' | 'friends' | 'weekly'): Promise<any[]> {
    try {
      const res = await fetch(`/api/leaderboard?type=${type}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Could not fetch online leaderboard, using local fallback', err);
    }
    return [];
  },

  async submitScore(entry: { userId: string; name: string; avatar: any; score: number; combo: number }): Promise<void> {
    try {
      await fetch('/api/leaderboard/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
    } catch (e) {
      console.warn('Offline score submission', e);
    }
  }
};
