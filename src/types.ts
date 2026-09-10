export type MoleType =
  | 'standard'
  | 'fast'
  | 'tough'
  | 'golden'
  | 'bomb'
  | 'helmet'
  | 'frost'
  | 'rainbow'
  | 'phantom'
  | 'boss';

export type GameMode = 'arcade' | 'story' | 'multiplayer' | 'boss_raid';

export type GameTheme = 'garden' | 'arcade' | 'cyber' | 'volcano';

export type MolePattern =
  | 'normal'
  | 'lightning_fast'
  | 'heavy_armored'
  | 'spiral_golden'
  | 'prismatic_levitate'
  | 'fuse_burn'
  | 'frost_freeze'
  | 'phase_glitch'
  | 'boss_slam';

export interface MoleData {
  id: string;
  holeIndex: number;
  type: MoleType;
  health: number;
  maxHealth: number;
  spawnTime: number;
  duration: number; // milliseconds mole stays up
  state: 'rising' | 'idle' | 'hit' | 'hiding' | 'exploded' | 'gone' | 'dodging';
  points: number;
  coins: number;
  speed: number;
  pattern?: MolePattern;
  squashFactor?: number;
  hitFlashTime?: number;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number; // screen or world coordinate
  y: number;
  color: string;
  scale: number;
  createdAt: number;
  duration: number;
  isCrit?: boolean;
}

export interface HammerItem {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'coins' | 'gems';
  damage: number;
  speed: number; // swing speed
  critChance: number; // 0 to 1
  scoreBonus: number; // multiplier e.g. 1.2
  specialEffect: 'none' | 'lightning' | 'golden_touch' | 'fire_burst' | 'freeze_wave' | 'double_coin' | 'heavy_quake';
  color: string;
  handleColor: string;
  headShape: 'uslero' | 'cylinder' | 'cube' | 'warhammer' | 'cyber' | 'magma' | 'star' | 'donut';
  glowColor?: string;
  unlocked: boolean;
  level: number;
}

export interface PowerupItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  count: number;
  price: number;
  currency: 'coins' | 'gems';
  duration: number; // duration in seconds
}

export interface AvatarConfig {
  skinTone: string;
  headwear: string;
  glasses: string;
  expression: string;
  outfitColor: string;
  badge: string;
  title: string;
}

export interface WeeklyChallenge {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  rewardCoins: number;
  rewardGems: number;
  claimed: boolean;
  icon: string;
  type: 'moles_hit' | 'golden_hit' | 'combo_streak' | 'duels_won' | 'boss_damage' | 'no_bomb_run';
}

export interface SpecialEvent {
  id: string;
  title: string;
  badge: string;
  description: string;
  modifier: 'double_golden' | 'speed_frenzy' | 'boss_invasion' | 'coin_rain';
  multiplier: number;
  active: boolean;
  endsInHours: number;
  bannerColor: string;
}

export type IngredientId =
  | 'flour'
  | 'san_marzano_tomato'
  | 'mozzarella_di_bufala'
  | 'spicy_pepperoni'
  | 'fresh_basil'
  | 'black_truffle'
  | 'hot_chili_oil'
  | 'gorgonzola_cremosa';

export type IngredientRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface PizzaIngredient {
  id: IngredientId;
  name: string;
  italianName: string;
  description: string;
  iconEmoji: string;
  rarity: IngredientRarity;
  color: string;
  bgGradient: string;
  droppedBy: MoleType[];
  dropChance: number; // base percentage 0-1
  sourceTip: string;
}

export interface RecipeRequirement {
  ingredientId: IngredientId;
  count: number;
}

export interface PizzaRecipe {
  id: string;
  name: string;
  italianName: string;
  badge: string;
  description: string;
  lore: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  imageEmoji: string;
  themeColor: string;
  requirements: RecipeRequirement[];
  rewardCoins: number;
  rewardGems: number;
  rewardXp: number;
  passiveBonus: {
    label: string;
    description: string;
    statType:
      | 'score_bonus'
      | 'crit_rate'
      | 'combo_bonus'
      | 'golden_rate'
      | 'oven_duration'
      | 'coin_bonus'
      | 'speed_boost'
      | 'frost_chill';
    value: number; // e.g. 0.10 for +10%
  };
  masteryLevels: {
    level: number;
    title: string;
    reqMultiplier: number;
    extraBonusText: string;
  }[];
}

export type ControlMode = 'classic' | 'camera';

export interface UserSettings {
  soundVolume: number;
  musicVolume: number;
  vibration: boolean;
  darkMode: boolean;
  theme: GameTheme;
  pushNotifications: boolean;
  showFps: boolean;
  controlMode: ControlMode;
  cameraPipCollapsed?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  coins: number;
  gems: number;
  level: number;
  xp: number;
  highScore: number;
  avatar: AvatarConfig;
  selectedHammerId: string;
  inventoryHammers: string[];
  powerups: Record<string, number>;
  ingredients: Record<string, number>;
  unlockedRecipes: string[];
  masteredRecipes: Record<string, number>;
  unlockedThemes: GameTheme[];
  stats: {
    totalMolesHit: number;
    totalGoldenHit: number;
    totalBombsHit: number;
    totalHelmetsBroken: number;
    highestCombo: number;
    duelsPlayed: number;
    duelsWon: number;
    totalScore: number;
    totalIngredientsCollected?: number;
    totalPizzasBaked?: number;
  };
  settings: UserSettings;
  challenges: WeeklyChallenge[];
  completedAchievements: string[];
  lastLoginDate: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar: AvatarConfig;
  score: number;
  combo: number;
  wins: number;
  level: number;
  date: string;
  isFriend?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: AvatarConfig;
  text: string;
  emoji?: string;
  timestamp: number;
  isSystem?: boolean;
}

export type CombatAttackType = 'frost_slow' | 'ink_splat' | 'bomb_barrage' | 'speed_haste';

export interface MultiplayerPlayer {
  id: string;
  name: string;
  avatar: AvatarConfig;
  score: number;
  combo: number;
  maxCombo: number;
  hits: number;
  misses: number;
  ready: boolean;
  isHost: boolean;
  ping: number;
  activeAttacks: {
    type: CombatAttackType;
    expiresAt: number;
  }[];
}

export interface MultiplayerRoom {
  id: string;
  code: string;
  name: string;
  mode: 'quick' | 'custom' | 'ranked';
  status: 'lobby' | 'countdown' | 'in_game' | 'finished';
  players: Record<string, MultiplayerPlayer>;
  moles: MoleData[];
  gameDuration: number;
  timeRemaining: number;
  startedAt?: number;
  winnerId?: string;
  chat: ChatMessage[];
}

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  type: 'challenge' | 'event' | 'duel_invite' | 'reward' | 'system';
  actionUrl?: string;
  timestamp: number;
  read: boolean;
}

export type HandTrackingStatus =
  | 'idle'
  | 'requesting-camera'
  | 'loading-model'
  | 'tracking'
  | 'no-hand-detected'
  | 'error';

export interface HandGestureState {
  isFist: boolean;
  isPinching: boolean;
  isWhacking: boolean; // Rising edge trigger
  pinchDistance: number;
  fistCurledCount: number;
}

export interface HandCursorData {
  rawX: number;          // Normalized [0, 1]
  rawY: number;          // Normalized [0, 1]
  normX: number;         // Mirrored & margin-calibrated [0, 1]
  normY: number;         // Margin-calibrated [0, 1]
  clientX: number;       // Viewport pixels
  clientY: number;       // Viewport pixels
  ndcX: number;          // Three.js NDC [-1, 1]
  ndcY: number;          // Three.js NDC [-1, 1]
  landmarks: Array<{ x: number; y: number; z?: number }>;
}

