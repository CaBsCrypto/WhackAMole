import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings,
  Play,
  Camera,
  ExternalLink,
} from 'lucide-react';
import {
  UserProfile,
  GameMode,
  MoleData,
  MoleType,
  MolePattern,
  FloatingText,
  MultiplayerRoom,
  PushNotification,
  ControlMode,
  HandCursorData,
  HandTrackingStatus,
} from './types';
import { storageService, DEFAULT_HAMMERS } from './services/storage';
import { sfx } from './services/sfx';
import { dynamicSoundtrack } from './services/soundtrack';
import { multiplayerClient } from './services/multiplayer';

import { MoleScene3D, MoleScene3DRef } from './components/game3d/MoleScene3D';
import { useHandTracking } from './hooks/useHandTracking';
import { ModeSelector } from './components/ui/ModeSelector';
import { GameHUD } from './components/ui/GameHUD';
import { MultiplayerMatchOverlay } from './components/ui/MultiplayerMatchOverlay';
import { PushNotificationsToast } from './components/ui/PushNotificationsToast';
import { ChefIdleCharacter } from './components/ui/ChefIdleCharacter';

// Lazy-loaded camera and modal views for optimal initial bundle size and code-splitting
const CameraPiPView = React.lazy(() =>
  import('./components/camera/CameraPiPView').then((m) => ({ default: m.CameraPiPView }))
);
const GestureReticle = React.lazy(() =>
  import('./components/camera/GestureReticle').then((m) => ({ default: m.GestureReticle }))
);
const CameraTutorialModal = React.lazy(() =>
  import('./components/camera/CameraTutorialModal').then((m) => ({ default: m.CameraTutorialModal }))
);
const CameraSmashStartModal = React.lazy(() =>
  import('./components/camera/CameraSmashStartModal').then((m) => ({ default: m.CameraSmashStartModal }))
);
const MultiplayerLobby = React.lazy(() =>
  import('./components/ui/MultiplayerLobby').then((m) => ({ default: m.MultiplayerLobby }))
);
const ShopModal = React.lazy(() =>
  import('./components/ui/ShopModal').then((m) => ({ default: m.ShopModal }))
);
const AvatarCustomizer = React.lazy(() =>
  import('./components/ui/AvatarCustomizer').then((m) => ({ default: m.AvatarCustomizer }))
);
const LeaderboardModal = React.lazy(() =>
  import('./components/ui/LeaderboardModal').then((m) => ({ default: m.LeaderboardModal }))
);
const EventsAndChallengesModal = React.lazy(() =>
  import('./components/ui/EventsAndChallengesModal').then((m) => ({ default: m.EventsAndChallengesModal }))
);
const PauseAndSettingsModal = React.lazy(() =>
  import('./components/ui/PauseAndSettingsModal').then((m) => ({ default: m.PauseAndSettingsModal }))
);
const GameOverModal = React.lazy(() =>
  import('./components/ui/GameOverModal').then((m) => ({ default: m.GameOverModal }))
);
const MoleCodexModal = React.lazy(() =>
  import('./components/modals/MoleCodexModal').then((m) => ({ default: m.MoleCodexModal }))
);
const PizzaRecipeCodex = React.lazy(() =>
  import('./components/modals/PizzaRecipeCodex').then((m) => ({ default: m.PizzaRecipeCodex }))
);


export default function App() {
  // 1. Profile & Settings State
  const [profile, setProfile] = useState<UserProfile>(() => storageService.loadProfile());
  const [activeModal, setActiveModal] = useState<
    'shop' | 'avatar' | 'leaderboard' | 'events' | 'settings' | 'codex' | 'pizza_codex' | null
  >(null);

  // 1b. Vision & Control Mode State ('classic' | 'camera')
  const [controlMode, setControlMode] = useState<ControlMode>(() => profile.settings.controlMode || 'classic');
  const [showCameraTutorial, setShowCameraTutorial] = useState<boolean>(false);
  const [showCameraSmashModal, setShowCameraSmashModal] = useState<boolean>(false);
  const moleSceneRef = useRef<MoleScene3DRef | null>(null);

  const handleSetControlMode = useCallback((mode: ControlMode) => {
    setControlMode(mode);
    if (mode === 'camera') {
      try {
        const completed = typeof window !== 'undefined' && localStorage.getItem('whackamole_camera_tutorial_completed') === 'true';
        if (!completed) {
          setShowCameraTutorial(true);
        }
      } catch {}
    }
    setProfile((prev) => {
      const updated = {
        ...prev,
        settings: {
          ...prev.settings,
          controlMode: mode,
        },
      };
      storageService.saveProfile(updated);
      return updated;
    });
  }, []);

  // Auto-prompt camera tutorial on camera mode if not yet completed
  useEffect(() => {
    if (controlMode === 'camera') {
      try {
        const completed = typeof window !== 'undefined' && localStorage.getItem('whackamole_camera_tutorial_completed') === 'true';
        if (!completed) {
          setShowCameraTutorial(true);
        }
      } catch {}
    }
  }, [controlMode]);

  // 2. Game Lifecycle State
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'gameover' | 'multiplayer_lobby'>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('arcade');

  // 3. Round Gameplay Stats & Ingredient Loot
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [molesHit, setMolesHit] = useState(0);
  const [goldenHit] = useState(0); // kept for stats compat, always 0

  const [bombsHit, setBombsHit] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [frenzyActive, setFrenzyActive] = useState(false);
  const [activePowerups, setActivePowerups] = useState<Record<string, number>>({});
  const [sessionIngredients, setSessionIngredients] = useState<Record<string, number>>({});

  // 4. Moles & 3D Stage Objects
  const [moles, setMoles] = useState<MoleData[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  // 4b. Screen Shake Tactile Feedback Engine
  const [screenShake, setScreenShake] = useState<{ x: number; y: number; rotate: number }>({ x: 0, y: 0, rotate: 0 });
  const [screenShakeClass, setScreenShakeClass] = useState<string>('');
  const [screenShakeTrigger, setScreenShakeTrigger] = useState<{ intensity: number; timestamp: number }>({ intensity: 0, timestamp: 0 });
  const [isPlayHoveredByHand, setIsPlayHoveredByHand] = useState(false);
  const handleStartArcadeRef = useRef<(mode?: GameMode) => void>(() => {});
  const [particleExplosionTrigger, setParticleExplosionTrigger] = useState<{
    x: number;
    y: number;
    type: MoleType;
    isCrit?: boolean;
    isDefeated?: boolean;
    timestamp: number;
  } | null>(null);
  const shakeAnimRef = useRef<number | null>(null);
  const shakeMagnitudeRef = useRef<number>(0);
  const shakeClassTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerScreenShake = useCallback((intensity: number) => {
    // 1. Mobile tactile haptic vibration (when available on touch devices)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        const vibMs = Math.min(80, Math.max(15, Math.round(intensity * 3.5)));
        navigator.vibrate(vibMs);
      } catch {
        // Vibration not permitted or supported
      }
    }

    // 2. Synchronize with 3D Three.js camera shake
    setScreenShakeTrigger({ intensity, timestamp: Date.now() });

    // 3. Select CSS animation class based on intensity tier
    let animClass = 'shake-light';
    if (intensity >= 15) {
      animClass = 'shake-epic';
    } else if (intensity >= 10) {
      animClass = 'shake-heavy';
    } else if (intensity >= 6.5) {
      animClass = 'shake-medium';
    }
    setScreenShakeClass(animClass);
    if (shakeClassTimerRef.current) clearTimeout(shakeClassTimerRef.current);
    shakeClassTimerRef.current = setTimeout(() => {
      setScreenShakeClass('');
    }, intensity >= 15 ? 450 : 250);

    // 4. Dynamic Physics-Damped Frame Loop (additive accumulation for rapid combos)
    shakeMagnitudeRef.current = Math.min(32, Math.max(shakeMagnitudeRef.current, intensity) * 1.15);

    if (shakeAnimRef.current === null) {
      const decay = 0.76; // Dampened decay: settles smoothly within ~200ms without frame drops
      const step = () => {
        if (shakeMagnitudeRef.current < 0.25) {
          shakeMagnitudeRef.current = 0;
          setScreenShake({ x: 0, y: 0, rotate: 0 });
          shakeAnimRef.current = null;
          return;
        }

        const mag = shakeMagnitudeRef.current;
        const angle = Math.random() * Math.PI * 2;
        const dist = (0.4 + Math.random() * 0.6) * mag;
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;
        const rotate = (Math.random() - 0.5) * mag * 0.12;

        setScreenShake({ x, y, rotate });
        shakeMagnitudeRef.current *= decay;
        shakeAnimRef.current = requestAnimationFrame(step);
      };
      shakeAnimRef.current = requestAnimationFrame(step);
    }
  }, []);

  // Cleanup screen shake on unmount
  useEffect(() => {
    return () => {
      if (shakeAnimRef.current !== null) cancelAnimationFrame(shakeAnimRef.current);
      if (shakeClassTimerRef.current) clearTimeout(shakeClassTimerRef.current);
    };
  }, []);

  // 4c. Kitchen Disaster Game Event State
  const [kitchenDisasterActive, setKitchenDisasterActive] = useState<boolean>(false);
  const [disasterTimeRemaining, setDisasterTimeRemaining] = useState<number>(10);
  const disasterCooldownRef = useRef<number>(0);

  // Trigger Kitchen Disaster Event
  const triggerKitchenDisaster = useCallback(() => {
    setKitchenDisasterActive(true);
    setDisasterTimeRemaining(10);
    sfx.playKitchenDisasterAlert();
    triggerScreenShake(9);

    // Floating notification alert banner
    setFloatingTexts((prev) => [
      ...prev,
      {
        id: `disaster_banner_${Date.now()}`,
        text: '🚨 ¡DESASTRE EN COCINA! ¡SPAWN VELOZ! 🚨',
        x: typeof window !== 'undefined' ? window.innerWidth / 2 : 400,
        y: typeof window !== 'undefined' ? window.innerHeight / 3 : 250,
        color: '#ef4444',
      },
    ]);
  }, [triggerScreenShake]);

  // Kitchen Disaster 10-Second Countdown Effect
  useEffect(() => {
    if (!kitchenDisasterActive) return;

    const interval = setInterval(() => {
      setDisasterTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setKitchenDisasterActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [kitchenDisasterActive]);

  // 5. Multiplayer State
  const [mpRoom, setMpRoom] = useState<MultiplayerRoom | null>(null);
  const [mpAttacks, setMpAttacks] = useState<{ type: string; expiresAt: number }[]>([]);

  // Round Victory / Record Celebration Tracking
  const [isNewHighScoreRound, setIsNewHighScoreRound] = useState(false);
  const [isMultiplayerWinRound, setIsMultiplayerWinRound] = useState(false);

  // 6. Push Notifications (start clean, no unsolicited toasts)
  const [notifications, setNotifications] = useState<PushNotification[]>([]);

  // Selected Hammer Reference
  const selectedHammer = DEFAULT_HAMMERS.find((h) => h.id === profile.selectedHammerId) || DEFAULT_HAMMERS[0];

  // Save profile changes automatically
  const handleUpdateProfile = useCallback(
    (updated: UserProfile) => {
      setProfile(updated);
      if (updated.settings.controlMode && updated.settings.controlMode !== controlMode) {
        setControlMode(updated.settings.controlMode);
      }
      storageService.saveProfile(updated);
    },
    [controlMode]
  );

  // Hand Tracking Handlers for 60 FPS Cursor and Whack Actions
  const handleCameraCursorMove = useCallback((cursor: HandCursorData) => {
    // Only update 3D hammer cursor when playing or on ready menu
    if (gameState === 'playing' || (gameState === 'menu' && !showCameraTutorial && !showCameraSmashModal && !activeModal)) {
      moleSceneRef.current?.setGestureCursor(cursor.ndcX, cursor.ndcY);
    }

    // R3: Only test hover against #btn_play_arcade when in menu AND no modal or tutorial is active
    if (gameState === 'menu' && !showCameraTutorial && !showCameraSmashModal && !activeModal) {
      const btn = document.getElementById('btn_play_arcade');
      if (btn) {
        const rect = btn.getBoundingClientRect();
        const isHover =
          cursor.clientX >= rect.left - 40 &&
          cursor.clientX <= rect.right + 40 &&
          cursor.clientY >= rect.top - 40 &&
          cursor.clientY <= rect.bottom + 40;
        setIsPlayHoveredByHand(isHover);
      } else {
        setIsPlayHoveredByHand(false);
      }
    } else {
      setIsPlayHoveredByHand(false);
    }
  }, [gameState, showCameraTutorial, showCameraSmashModal, activeModal]);

  const handleCameraWhack = useCallback(
    (cursor: HandCursorData) => {
      // Disallow all air whacks if any modal/tutorial is open, or if paused/gameover/lobby
      if (showCameraTutorial || showCameraSmashModal || activeModal || gameState === 'paused' || gameState === 'gameover' || gameState === 'multiplayer_lobby') {
        return;
      }

      if (gameState === 'playing') {
        sfx.playGestureConfirm();
        moleSceneRef.current?.triggerGestureWhack(cursor.ndcX, cursor.ndcY, cursor.clientX, cursor.clientY);
      } else if (gameState === 'menu') {
        // Hit testing against play button (#btn_play_arcade) using getBoundingClientRect
        const btn = document.getElementById('btn_play_arcade');
        let isPlayHit = false;
        if (btn) {
          const rect = btn.getBoundingClientRect();
          if (
            cursor.clientX >= rect.left - 40 &&
            cursor.clientX <= rect.right + 40 &&
            cursor.clientY >= rect.top - 40 &&
            cursor.clientY <= rect.bottom + 40
          ) {
            isPlayHit = true;
          }
        }
        if (!isPlayHit) {
          const el = document.elementFromPoint(cursor.clientX, cursor.clientY);
          if (el?.closest('#btn_play_arcade')) {
            isPlayHit = true;
          }
        }
        if (isPlayHit) {
          sfx.playGestureConfirm();
          setIsPlayHoveredByHand(false);
          if (controlMode === 'camera') {
            setShowCameraSmashModal(true);
          } else {
            handleStartArcadeRef.current('arcade');
          }
        }
      }
    },
    [gameState, showCameraTutorial, showCameraSmashModal, activeModal, controlMode]
  );

  const handTracking = useHandTracking({
    enabled: controlMode === 'camera',
    onCursorMove: handleCameraCursorMove,
    onWhack: handleCameraWhack,
  });

  // Camera tracking auditory feedback when status transitions to 'tracking'
  const prevTrackingStatusRef = useRef<HandTrackingStatus>('idle');
  useEffect(() => {
    if (prevTrackingStatusRef.current !== 'tracking' && handTracking.status === 'tracking') {
      sfx.playCameraActivate();
    }
    prevTrackingStatusRef.current = handTracking.status;
  }, [handTracking.status]);

  // Start ambient soundtrack on mount and unlock on first user interaction
  useEffect(() => {
    dynamicSoundtrack.start('menu');
    const handleFirstInteraction = () => {
      dynamicSoundtrack.resume();
    };
    window.addEventListener('pointerdown', handleFirstInteraction, { once: true });
    window.addEventListener('keydown', handleFirstInteraction, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  // Update Soundtrack & Audio Preferences
  useEffect(() => {
    sfx.setVolume(profile.settings.soundVolume);
    dynamicSoundtrack.setVolume(profile.settings.musicVolume);
  }, [profile.settings.soundVolume, profile.settings.musicVolume]);

  // Sync Dynamic Soundtrack in real-time with Game State: gameplay music vs menu ambient loop
  useEffect(() => {
    if (gameState === 'playing') {
      dynamicSoundtrack.start('gameplay');
      dynamicSoundtrack.updateGameState(timeRemaining, 60, combo, frenzyActive);
    } else {
      dynamicSoundtrack.start('menu');
    }
  }, [gameState, timeRemaining, combo, frenzyActive]);

  // Periodic In-Game Powerup Timer Ticker
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      setActivePowerups((prev) => {
        const next: Record<string, number> = {};
        let hasChanges = false;
        Object.entries(prev).forEach(([id, secs]) => {
          const s = secs as number;
          if (s > 1) {
            next[id] = s - 1;
            hasChanges = true;
          } else {
            hasChanges = true;
            if (id === 'golden_frenzy') setFrenzyActive(false);
          }
        });
        return hasChanges ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState]);

  // Cleanup Floating Texts
  useEffect(() => {
    if (floatingTexts.length === 0) return;
    const timer = setTimeout(() => {
      const now = Date.now();
      setFloatingTexts((prev) => prev.filter((ft) => now - ft.createdAt < ft.duration));
    }, 300);
    return () => clearTimeout(timer);
  }, [floatingTexts]);

  // WebSocket Multiplayer Event Subscriptions
  useEffect(() => {
    const unsub = multiplayerClient.subscribe((type, data) => {
      if (type === 'room:update') {
        setMpRoom(data.room);
      } else if (type === 'game:mole_spawned') {
        if (data.mole?.type) {
          sfx.playMoleSpawn(data.mole.type);
        }
        setMoles((prev) => {
          if (prev.some((m) => m.id === data.mole.id)) return prev;
          return [...prev, data.mole];
        });
      } else if (type === 'game:mole_despawned') {
        setMoles((prev) => prev.filter((m) => m.id !== data.moleId));
      } else if (type === 'player:score_update') {
        // If it was another player hitting the mole
        if (data.moleId) {
          setMoles((prev) =>
            prev.map((m) => (m.id === data.moleId ? { ...m, state: 'hit' } : m))
          );
        }
      } else if (type === 'game:tick') {
        setTimeRemaining(data.timeRemaining);
      } else if (type === 'game:attack_received') {
        if (data.targetPlayerId === profile.id) {
          sfx.playFrost();
          setMpAttacks((prev) => [
            ...prev,
            { type: data.attackType, expiresAt: Date.now() + 4500 },
          ]);
        }
      } else if (type === 'game:over') {
        setGameState('gameover');
        if (data.players) {
          setMpRoom((prev) => (prev ? { ...prev, players: data.players } : prev));
        }
        // Check if player won
        const myPlayer = data.players?.[profile.id];
        const opponent = Object.values(data.players || {}).find((p: any) => p.id !== profile.id) as any;
        const won = Boolean(myPlayer && opponent && myPlayer.score > opponent.score);
        setIsMultiplayerWinRound(won);
        if (score > (profile.highScore || 0) && score > 0) {
          setIsNewHighScoreRound(true);
        }
        if (won) {
          handleUpdateProfile({
            ...profile,
            stats: {
              ...profile.stats,
              duelsPlayed: profile.stats.duelsPlayed + 1,
              duelsWon: profile.stats.duelsWon + 1,
            },
          });
        }
      }
    });

    return () => unsub();
  }, [profile, handleUpdateProfile]);

  // Rare, Randomized Kitchen Disaster Hazard System
  // Evaluates periodically mid-match to trigger a thrilling, high-reaction event
  useEffect(() => {
    if (gameState !== 'playing' || gameMode === 'multiplayer') return;

    const checkInterval = setInterval(() => {
      if (kitchenDisasterActive) return;
      if (timeRemaining < 12 || timeRemaining > 48) return;

      const now = Date.now();
      if (now < disasterCooldownRef.current) return;

      // ~20% probability per check mid-match
      if (Math.random() < 0.20) {
        disasterCooldownRef.current = now + 45000;
        triggerKitchenDisaster();
      }
    }, 3500);

    return () => clearInterval(checkInterval);
  }, [gameState, gameMode, kitchenDisasterActive, timeRemaining, triggerKitchenDisaster]);

  // SINGLE-PLAYER SPAWN & ROUND LOOP
  useEffect(() => {
    if (gameState !== 'playing' || gameMode === 'multiplayer') return;

    // Round countdown ticker (60s)
    const clockInterval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(clockInterval);
          finishSoloGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Mole spawn interval & capacity
    // In Kitchen Disaster: spawn rate accelerates dramatically (260ms vs 700ms), max active moles surges to 7
    const spawnDelay = kitchenDisasterActive ? 260 : (frenzyActive ? 380 : 700);
    const maxActiveMoles = kitchenDisasterActive ? 7 : (frenzyActive ? 6 : 4);

    const spawnInterval = setInterval(() => {
      setMoles((prevMoles) => {
        // Limit active moles
        if (prevMoles.length >= maxActiveMoles) return prevMoles;

        // Choose random available hole index
        const occupied = new Set(prevMoles.map((m) => m.holeIndex));
        const freeHoles = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((h) => !occupied.has(h));
        if (freeHoles.length === 0) return prevMoles;

        const holeIndex = freeHoles[Math.floor(Math.random() * freeHoles.length)];
        const isFrenzy = frenzyActive;

        // Mole Type Selection — 3 types: standard, fast, bomb
        let type: MoleData['type'] = 'standard';
        let health = 1;
        let points = 100;
        let coins = 5;
        let speed = 1.0;
        let pattern: MolePattern = 'normal';

        if (isFrenzy) {
          // Frenzy: fast moles flood the board
          type = 'fast';
          points = 220;
          coins = 15;
          speed = 2.0;
          pattern = 'lightning_fast';
        } else {
          const rand = Math.random();
          if (rand < 0.60) {
            // Standard Mole: classic chef, most common
            type = 'standard';
            health = 1;
            points = 100;
            coins = 5;
            speed = 1.0;
            pattern = 'normal';
          } else if (rand < 0.85) {
            // Fast Mole: lightning fast, high score reward
            type = 'fast';
            health = 1;
            points = 220;
            coins = 15;
            speed = 1.8;
            pattern = 'lightning_fast';
          } else {
            // Bomb Mole: avoid it! -250 pts penalty
            type = 'bomb';
            health = 1;
            points = -250;
            coins = 0;
            speed = 1.0;
            pattern = 'fuse_burn';
          }
        }

        // Duration tailored per mole type & scales with time remaining
        const baseDurationMap: Record<string, number> = {
          fast: 850,
          standard: 1500,
          bomb: 1450,
        };


        const baseDur = baseDurationMap[type] || 1500;
        const timeDecay = (60 - timeRemaining) * 8;
        let duration = Math.max(type === 'fast' ? 650 : 950, baseDur - timeDecay);

        // Accelerated gameplay during Kitchen Disaster to challenge reflexes
        if (kitchenDisasterActive) {
          duration = Math.max(460, Math.round(duration * 0.65));
          speed = speed * 1.35;
          points = Math.round(points * 1.25); // +25% bonus points during disaster
        }

        const newMole: MoleData = {
          id: `solo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          holeIndex,
          type,
          health,
          maxHealth: health,
          spawnTime: Date.now(),
          duration,
          state: 'idle',
          points,
          coins,
          speed,
          pattern,
        };

        // Trigger unique audio cue for this mole type upon emerging
        sfx.playMoleSpawn(type);

        // Auto remove when duration expires
        setTimeout(() => {
          setMoles((curr) => curr.filter((m) => m.id !== newMole.id));
        }, duration + 50);

        return [...prevMoles, newMole];
      });
    }, spawnDelay);

    return () => {
      clearInterval(clockInterval);
      clearInterval(spawnInterval);
    };
  }, [gameState, gameMode, frenzyActive, kitchenDisasterActive, timeRemaining]);

  // Finish solo game
  const finishSoloGame = () => {
    setKitchenDisasterActive(false);
    setDisasterTimeRemaining(0);
    setGameState('gameover');
    const coinsEarned = Math.round(molesHit * 3 + goldenHit * 20 + score * 0.02);
    const xpEarned = Math.round(score * 0.05 + maxCombo * 10);
    const isNewRecord = score > (profile.highScore || 0) && score > 0;
    setIsNewHighScoreRound(isNewRecord);
    setIsMultiplayerWinRound(false);
    const newHighScore = Math.max(profile.highScore, score);

    // Update challenges progress
    const updatedChallenges = profile.challenges.map((c) => {
      let add = 0;
      if (c.type === 'moles_hit') add = molesHit;
      if (c.type === 'golden_hit') add = goldenHit;
      if (c.type === 'combo_streak') add = maxCombo >= c.target ? c.target : 0;
      return { ...c, current: Math.min(c.target, c.current + add) };
    });

    handleUpdateProfile({
      ...profile,
      coins: profile.coins + coinsEarned,
      xp: profile.xp + xpEarned,
      level: Math.floor((profile.xp + xpEarned) / 500) + 1,
      highScore: newHighScore,
      stats: {
        ...profile.stats,
        totalMolesHit: profile.stats.totalMolesHit + molesHit,
        totalGoldenHit: profile.stats.totalGoldenHit + goldenHit,
        totalBombsHit: profile.stats.totalBombsHit + bombsHit,
        highestCombo: Math.max(profile.stats.highestCombo, maxCombo),
        totalScore: profile.stats.totalScore + score,
      },
      challenges: updatedChallenges,
    });

    storageService.submitScore({
      userId: profile.id,
      name: profile.name,
      avatar: profile.avatar,
      score,
      combo: maxCombo,
    });
  };

  // Start Solo Arcade Game
  const handleStartArcade = (mode: GameMode = 'arcade') => {
    sfx.playButtonClick();
    setIsNewHighScoreRound(false);
    setIsMultiplayerWinRound(false);
    setGameMode(mode);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setMolesHit(0);

    setBombsHit(0);
    setTimeRemaining(60);
    setFrenzyActive(false);
    setKitchenDisasterActive(false);
    setDisasterTimeRemaining(0);
    disasterCooldownRef.current = 0;
    setActivePowerups({});
    setMoles([]);
    setFloatingTexts([]);
    setIsPlayHoveredByHand(false);
    setGameState('playing');
  };
  handleStartArcadeRef.current = handleStartArcade;

  // Handle User Whack on 3D Stage
  const handleHitHole = (holeIndex: number, clientX: number, clientY: number) => {
    if (gameState !== 'playing') return;

    // Find mole at this hole
    const mole = moles.find((m) => m.holeIndex === holeIndex && m.state !== 'hit' && m.state !== 'exploded');

    if (mole) {
      const isCrit = Math.random() < selectedHammer.critChance;
      const damage = selectedHammer.damage;

      // Handle Bomb Mole
      if (mole.type === 'bomb') {
        const hasShield = (activePowerups['bomb_shield'] || 0) > 0;
        if (hasShield) {
          // Defended by shield!
          addFloatingText('SHIELD BLOCKED!', clientX, clientY, '#10b981', 1.2);
          setActivePowerups((prev) => ({ ...prev, bomb_shield: Math.max(0, (prev['bomb_shield'] || 0) - 1) }));
          triggerScreenShake(3.5);
        } else {
          setScore((s) => Math.max(0, s - 250));
          setCombo(0);
          setBombsHit((b) => b + 1);
          addFloatingText('-250 💥 BOMB!', clientX, clientY, '#ef4444', 1.1);
          triggerScreenShake(4.0);

        }
        mole.state = 'exploded';
        setParticleExplosionTrigger({
          x: clientX,
          y: clientY,
          type: 'bomb',
          isCrit: false,
          isDefeated: true,
          timestamp: Date.now(),
        });
      } else {
        // Successful Whack!
        mole.health -= damage;
        const isDefeated = mole.health <= 0;

        setParticleExplosionTrigger({
          x: clientX,
          y: clientY,
          type: mole.type,
          isCrit,
          isDefeated,
          timestamp: Date.now(),
        });

        // Calculate screen-shake intensity scaling based on mole type
        let hitShakeIntensity = 4.5;
        switch (mole.type) {
          case 'bomb':
            hitShakeIntensity = 5.0;  // Subtle bomb pop (reduced from 12)
            break;
          case 'fast':
            hitShakeIntensity = 5.5;  // Snappy quick-draw flick
            break;
          case 'standard':
          default:
            hitShakeIntensity = 4.5;  // Standard solid whack
            break;
        }

        // Critical hits amplify tactile shockwave (+40%)
        if (isCrit) {
          hitShakeIntensity *= 1.4;
        }

        // Defeating / finishing blow adds extra tactile punch (+25%)
        if (isDefeated) {
          hitShakeIntensity *= 1.25;
        }

        // Frenzy mode tactile amplification (+15%)
        if (frenzyActive || (activePowerups['golden_frenzy'] || 0) > 0) {
          hitShakeIntensity *= 1.15;
        }

        // Trigger tactile screen-shake on every successful mole whack
        triggerScreenShake(hitShakeIntensity);

        if (isDefeated) {
          mole.state = 'hit';
          setMolesHit((m) => m + 1);

          // Type-specific perks & celebration text
          if (mole.type === 'fast') {
            addFloatingText('⚡ SPEED SHOT! +220', clientX, clientY - 20, '#38bdf8', 1.25, true);
          }

        } else {
          // Non-lethal armored hit feedback
          addFloatingText(`💥 HIT! (${mole.health}/${mole.maxHealth} HP)`, clientX, clientY - 15, '#fbbf24', 1.1);
        }

        // Score calculation with multiplier & powerups
        const has2x = (activePowerups['double_points'] || 0) > 0;
        const comboMult = 1 + combo * 0.15;
        const hammerBonus = selectedHammer.scoreBonus || 1.0;
        const critMult = isCrit ? 1.75 : 1.0;
        const basePts = isDefeated ? mole.points : Math.round(mole.points * 0.35);
        const pointsEarned = Math.round(basePts * hammerBonus * comboMult * critMult * (has2x ? 2 : 1));

        setScore((s) => s + pointsEarned);
        const nextCombo = combo + 1;
        setCombo(nextCombo);
        setMaxCombo((m) => Math.max(m, nextCombo));

        sfx.playComboStreak(nextCombo);
        dynamicSoundtrack.triggerImpactDucking();

        // Spawn 3D Score Bubble
        const label = isCrit ? `+${pointsEarned} CRIT!` : `+${pointsEarned}`;
        addFloatingText(label, clientX, clientY, isCrit ? '#facc15' : '#ffffff', isCrit ? 1.4 : 1.0, isCrit);
      }

      // If in multiplayer, notify server
      if (gameMode === 'multiplayer') {
        multiplayerClient.hitMole(mole.id, holeIndex, isCrit, damage);
      }
    } else {
      // Miss Whack!
      if (combo > 0) {
        setCombo(0);
        addFloatingText('MISS', clientX, clientY, '#9ca3af', 0.85);
        if (gameMode === 'multiplayer') {
          multiplayerClient.sendMiss();
        }
      }
    }
  };

  // Add 3D / 2D Floating Text
  const addFloatingText = (text: string, x: number, y: number, color: string, scale = 1, isCrit = false) => {
    const newText: FloatingText = {
      id: 'ft_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      text,
      x,
      y,
      color,
      scale,
      createdAt: Date.now(),
      duration: 750,
      isCrit,
    };
    setFloatingTexts((prev) => [...prev, newText]);
  };

  // Use In-Game Powerup
  const handleUsePowerup = (powerupId: string) => {
    const currentStock = profile.powerups[powerupId] || 0;
    if (currentStock <= 0 || activePowerups[powerupId]) return;

    sfx.playPowerup();
    handleUpdateProfile({
      ...profile,
      powerups: {
        ...profile.powerups,
        [powerupId]: currentStock - 1,
      },
    });

    if (powerupId === 'time_freeze') {
      setTimeRemaining((t) => Math.min(60, t + 5));
      setActivePowerups((prev) => ({ ...prev, time_freeze: 5 }));
    } else if (powerupId === 'golden_frenzy') {
      setFrenzyActive(true);
      setActivePowerups((prev) => ({ ...prev, golden_frenzy: 6 }));
    } else if (powerupId === 'bomb_shield') {
      setActivePowerups((prev) => ({ ...prev, bomb_shield: 30 }));
    } else if (powerupId === 'double_points') {
      setActivePowerups((prev) => ({ ...prev, double_points: 10 }));
    } else if (powerupId === 'pizza_oven') {
      setActivePowerups((prev) => ({ ...prev, pizza_oven: 5 }));
      sfx.playPizzaOvenRoar();
      addFloatingText('🔥 ¡HORNO DE PIZZA ABRASADOR! (5s)', window.innerWidth / 2, window.innerHeight * 0.35, '#ea580c', 1.5, true);
    }
  };

  // Pizza Oven Continuous Heat Zone Auto-Burn Loop (5s duration)
  useEffect(() => {
    if (gameState !== 'playing' || !activePowerups['pizza_oven']) return;

    const burnInterval = setInterval(() => {
      setMoles((prevMoles) => {
        let anyBurned = false;
        const updated = prevMoles.map((mole) => {
          if (mole.state === 'hit' || mole.state === 'exploded') return mole;

          anyBurned = true;
          const holeCol = mole.holeIndex % 3;
          const holeRow = Math.floor(mole.holeIndex / 3);
          const screenX = window.innerWidth * (0.35 + holeCol * 0.15);
          const screenY = window.innerHeight * (0.35 + holeRow * 0.15);

          if (mole.type === 'bomb') {
            addFloatingText('🔥 ¡BOMBA VAPORIZADA!', screenX, screenY, '#ea580c', 1.3, true);
            sfx.playFireBurn();
            return { ...mole, state: 'exploded' as const, health: 0 };
          }

          setMolesHit((m) => m + 1);


          const has2x = (activePowerups['double_points'] || 0) > 0;
          const comboMult = 1 + combo * 0.15;
          const hammerBonus = selectedHammer.scoreBonus || 1.0;
          const pointsEarned = Math.round(mole.points * 1.5 * hammerBonus * comboMult * (has2x ? 2 : 1));

          setScore((s) => s + pointsEarned);
          setCombo((c) => {
            const nextC = c + 1;
            setMaxCombo((m) => Math.max(m, nextC));
            sfx.playComboStreak(nextC);
            return nextC;
          });

          sfx.playFireBurn();
          addFloatingText(`🔥 ¡HORNEADO! +${pointsEarned}`, screenX, screenY - 20, '#ea580c', 1.35, true);

          if (gameMode === 'multiplayer') {
            multiplayerClient.hitMole(mole.id, mole.holeIndex, true, 99);
          }

          return { ...mole, state: 'hit' as const, health: 0 };
        });

        if (anyBurned) {
          triggerScreenShake(7.5);
        }
        return anyBurned ? updated : prevMoles;
      });
    }, 120);

    return () => clearInterval(burnInterval);
  }, [gameState, activePowerups['pizza_oven'], combo, selectedHammer, gameMode, triggerScreenShake]);

  return (
    <div
      id="app_root"
      className="relative w-screen h-screen overflow-hidden flex flex-col bg-slate-900 text-slate-100 font-sans select-none"
    >
      {/* Immersive UI Ambient Gradient Layer */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-transparent to-orange-900/10 pointer-events-none z-0"></div>

      {/* 1. TOP GLOBAL NAVIGATION & STATUS BAR (Visible only in Menu Hub) */}
      <AnimatePresence>
        {gameState === 'menu' && (
          <motion.header
            key="global-menu-header"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.22 }}
            className="relative z-30 flex items-center justify-between px-4 md:px-6 py-3 bg-slate-900/85 backdrop-blur-xl border-b border-white/10 shadow-xl"
          >
            {/* Brand, Avatar & Level Progress */}
            <div className="flex items-center space-x-3 md:space-x-4 min-w-0">
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  sfx.playButtonClick();
                  setActiveModal('avatar');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    sfx.playButtonClick();
                    setActiveModal('avatar');
                  }
                }}
                className="w-11 h-11 md:w-12 md:h-12 shrink-0 rounded-full bg-gradient-to-tr from-orange-500 to-yellow-300 border-2 border-white/20 shadow-[0_0_15px_rgba(249,115,22,0.4)] flex items-center justify-center text-lg md:text-xl font-black text-slate-900 cursor-pointer hover:scale-105 transition-transform"
                title="Edit Avatar"
              >
                {profile.name ? profile.name.slice(0, 2).toUpperCase() : 'WM'}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm md:text-base font-bold leading-tight text-white truncate max-w-[110px] sm:max-w-none">{profile.name}</h2>
                  <div className="hidden sm:flex items-center text-[10px] text-orange-400 space-x-1.5">
                    <span className="bg-slate-800 px-2 py-0.5 rounded font-black tracking-wider border border-white/5">
                      LVL {profile.level}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="uppercase tracking-wider font-semibold text-slate-400">{profile.avatar.title}</span>
                  </div>
                </div>
                <div className="sm:hidden flex items-center text-[10px] text-orange-400 gap-1.5 mt-0.5">
                  <span className="bg-slate-800 px-1.5 py-0.5 rounded font-black">LVL {profile.level}</span>
                  <span className="text-slate-400 truncate max-w-[80px]">{profile.avatar.title}</span>
                </div>
              </div>
            </div>

            {/* Center/Right: Currency & Stats Card in Immersive UI Style */}
            <div className="flex items-center space-x-2 md:space-x-4 shrink-0">
              <div className="flex items-center bg-slate-800/80 backdrop-blur-md px-3 sm:px-5 py-1.5 sm:py-2 rounded-2xl border border-white/10 shadow-lg">
                {/* Coins / Credits */}
                <div className="flex flex-col items-center px-2 sm:px-4 border-r border-slate-700/80">
                  <span className="text-[9px] sm:text-[10px] uppercase text-slate-400 font-bold tracking-tighter">Credits</span>
                  <span className="text-sm sm:text-lg font-black text-yellow-400 font-mono">
                    {profile.coins.toLocaleString()}
                  </span>
                </div>

                {/* Gems / Global Rank */}
                <div className="flex flex-col items-center px-2 sm:px-4">
                  <span className="text-[9px] sm:text-[10px] uppercase text-slate-400 font-bold tracking-tighter">Rank</span>
                  <span className="text-sm sm:text-lg font-black text-indigo-400 font-mono">
                    #{Math.max(1, 1500 - profile.level * 18 - Math.floor(profile.highScore / 200))}
                  </span>
                </div>
              </div>

              {/* Header Actions: Settings & SpicyCrust */}
              <div className="flex items-center space-x-1 sm:space-x-2">
                <button
                  id="nav_btn_settings"
                  type="button"
                  onClick={() => {
                    sfx.playButtonClick();
                    setActiveModal('settings');
                  }}
                  className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl flex items-center justify-center border border-white/10 shadow-sm transition"
                  title="Settings"
                  aria-label="Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>

                {/* SpicyCrust Portal Link */}
                <a
                  href="https://spicycrust.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => sfx.playButtonClick()}
                  className="px-3 py-1.5 sm:py-2 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white rounded-xl flex items-center gap-1.5 text-xs font-black uppercase font-display tracking-wider shadow-md shadow-orange-500/20 border border-amber-400/40 transition hover:scale-105"
                  title="Ir a SpicyCrust.com"
                >
                  <span>🍕</span>
                  <span className="hidden md:inline">SpicyCrust.com</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* 2. MAIN 3D GAME STAGE VIEWPORT (With Dynamic Tactile Screen Shake) */}
      <main
        id="game_stage_viewport"
        className={`relative flex-1 w-full h-full overflow-hidden z-10 ${screenShakeClass}`}
        style={{
          transform:
            screenShake.x !== 0 || screenShake.y !== 0
              ? `translate3d(${screenShake.x}px, ${screenShake.y}px, 0) rotate(${screenShake.rotate}deg)`
              : undefined,
          willChange: 'transform',
        }}
      >
        {/* 3D Three.js WebGL Scene */}
        <MoleScene3D
          ref={moleSceneRef}
          moles={moles}
          selectedHammer={selectedHammer}
          theme={profile.settings.theme}
          frenzyActive={frenzyActive}
          pizzaOvenActive={Boolean(activePowerups['pizza_oven'])}
          kitchenDisasterActive={kitchenDisasterActive}
          disasterTimeRemaining={disasterTimeRemaining}
          onHitHole={handleHitHole}
          floatingTexts={floatingTexts}
          screenShakeTrigger={screenShakeTrigger}
          particleExplosionTrigger={particleExplosionTrigger}
        />

        {/* MediaPipe Hands Vision Overlays (Reticle & PiP Camera Window) */}
        {controlMode === 'camera' && (
          <React.Suspense fallback={null}>
            <GestureReticle
              cursor={handTracking.cursor}
              gesture={handTracking.gesture}
              active={
                !showCameraTutorial &&
                !activeModal &&
                (gameState === 'playing' || gameState === 'menu')
              }
            />
            <CameraPiPView
              videoRef={handTracking.videoRef}
              canvasRef={handTracking.canvasRef}
              status={handTracking.status}
              errorMessage={handTracking.errorMessage}
              gesture={handTracking.gesture}
              fps={handTracking.fps}
              onRetry={handTracking.retry}
              onSwitchToClassic={() => handleSetControlMode('classic')}
            />
          </React.Suspense>
        )}

        {/* IN-GAME HUD OVERLAY (When Playing) */}
        <AnimatePresence>
          {gameState === 'playing' && (
            <motion.div
              key="game-hud-container"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22 }}
              className="pointer-events-none absolute inset-0 z-20"
            >
              <GameHUD
                score={score}
                combo={combo}
                maxCombo={maxCombo}
                timeRemaining={timeRemaining}
                gameDuration={60}
                mode={gameMode}
                profile={profile}
                activePowerups={activePowerups}
                sessionIngredients={sessionIngredients}
                kitchenDisasterActive={kitchenDisasterActive}
                disasterTimeRemaining={disasterTimeRemaining}
                onUsePowerup={handleUsePowerup}
                onPause={() => setGameState('paused')}
                isMuted={profile.settings.soundVolume === 0 && profile.settings.musicVolume === 0}
                onToggleMute={() => {
                  const newVol = profile.settings.soundVolume > 0 ? 0 : 0.8;
                  handleUpdateProfile({
                    ...profile,
                    settings: { ...profile.settings, soundVolume: newVol, musicVolume: newVol * 0.75 },
                  });
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* MULTIPLAYER IN-MATCH OVERLAY (Split Score Bar, Attacks, Live Chat) */}
        {gameState === 'playing' && gameMode === 'multiplayer' && mpRoom && (
          <MultiplayerMatchOverlay
            room={mpRoom}
            profile={profile}
            activeAttacks={mpAttacks}
          />
        )}

        {/* MAIN MENU HUB (Immersive UI Hub Layout) */}
        <AnimatePresence>
          {gameState === 'menu' && (
            <motion.div
              key="main-menu-hub"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.22 }}
              className="absolute inset-0 z-20 flex flex-col items-center p-4 md:p-6 bg-slate-950/40 backdrop-blur-[2px] pointer-events-auto overflow-y-auto"
            >
              {/* Centered Main Menu Hero Area */}
              <div className="grid grid-cols-12 gap-4 w-full max-w-lg my-auto py-3 pb-8 sm:pb-10">
                <section className="col-span-12 flex flex-col items-center justify-center text-center px-2">
                  <div className="max-w-md w-full flex flex-col items-center">
                    {/* Chef Idle Character in Main Menu with Watch Check, Brow Wipe & Interactive Reactions */}
                    <ChefIdleCharacter className="mb-2" />

                    <h1 className="text-3xl md:text-4xl font-display font-black text-white tracking-wide leading-none mb-2">
                      Panic at the Pizzeria
                    </h1>
                    <p className="text-xs md:text-sm text-slate-300 mb-6 max-w-sm">
                      ¡Defiende la cocina del Chef de la banda de topos ladrones de pizza con rodillos, palas y cortadores láser en 3D!
                    </p>

                    {/* Game Mode Selector (Classic vs MediaPipe Hands) */}
                    <div className="w-full max-w-sm sm:max-w-md flex justify-center mb-4">
                      <ModeSelector controlMode={controlMode} onChange={handleSetControlMode} />
                    </div>

                    {/* Action Button: Sleek Play Button that launches game or opens Camera calibration modal */}
                    <div className="w-full max-w-sm sm:max-w-md flex flex-col items-center justify-center">
                      <button
                        id="btn_play_arcade"
                        type="button"
                        onClick={() => {
                          sfx.playButtonClick();
                          if (controlMode === 'camera') {
                            setShowCameraSmashModal(true);
                          } else {
                            handleStartArcade('arcade');
                          }
                        }}
                        className={`w-full bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 hover:from-amber-500 hover:via-orange-400 hover:to-red-400 px-8 py-4 rounded-2xl text-lg font-display font-black uppercase tracking-widest shadow-[0_10px_40px_rgba(245,158,11,0.45)] border-b-4 border-amber-800 active:border-b-0 active:translate-y-1 transition-all text-white flex items-center justify-center gap-3 cursor-pointer ${
                          isPlayHoveredByHand && controlMode === 'camera'
                            ? 'scale-105 ring-4 ring-amber-300 shadow-[0_0_40px_rgba(245,158,11,0.85)] border-amber-400 -translate-y-1'
                            : ''
                        }`}
                      >
                        {controlMode === 'camera' ? (
                          <>
                            <Camera className="w-6 h-6 text-amber-200 animate-pulse" />
                            <span>¡Jugar con Cámara!</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-6 h-6 fill-current" />
                            <span>¡Defender Cocina!</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MULTIPLAYER LOBBY (Room creation, code sharing, quick matchmaking) */}
        {gameState === 'multiplayer_lobby' && (
          <React.Suspense fallback={null}>
            <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md pointer-events-auto">
              <MultiplayerLobby
                profile={profile}
                onBack={() => setGameState('menu')}
                onGameStarted={(room) => {
                  setMpRoom(room);
                  setIsNewHighScoreRound(false);
                  setIsMultiplayerWinRound(false);
                  setGameMode('multiplayer');
                  setScore(0);
                  setCombo(0);
                  setMaxCombo(0);
                  setMolesHit(0);

                  setBombsHit(0);
                  setTimeRemaining(60);
                  setFrenzyActive(false);
                  setMoles([]);
                  setFloatingTexts([]);
                  setGameState('playing');
                }}
              />
            </div>
          </React.Suspense>
        )}
      </main>

      {/* 3. IMMERSIVE UI FOOTER / TELEMETRY STATUS BAR */}
      <footer className="relative z-30 flex justify-between items-center px-4 md:px-6 py-2 border-t border-white/5 bg-slate-900/90 backdrop-blur-md">
        {/* Left: Cloud Sync Status & Version */}
        <div className="flex items-center space-x-4 md:space-x-8 text-xs font-bold text-slate-400">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
            <span className="uppercase tracking-tighter text-[11px] text-slate-300">Cloud Sync Active</span>
          </div>
          <div className="hidden sm:inline-block uppercase tracking-tighter text-[11px] text-slate-500 font-mono">
            v2.4.1 Build-77
          </div>
        </div>

        {/* Right: Audio Synthesizer BPM Visualizer & Status Pills */}
        <div className="flex items-center space-x-3 md:space-x-4">
          {/* BPM Synth Equalizer Wave */}
          <div className="flex items-center space-x-2 bg-slate-800/60 px-3 py-1 rounded-xl border border-white/5">
            <span className="text-[9px] uppercase text-slate-400 font-black tracking-wider">
              {gameState === 'playing' ? 'Synth BPM' : 'Audio Engine'}
            </span>
            <div className="flex space-x-0.5 h-3 items-end">
              <div className={`w-1 bg-indigo-500 rounded-full transition-all duration-150 ${gameState === 'playing' ? 'h-[80%] animate-pulse' : 'h-[40%]'}`}></div>
              <div className={`w-1 bg-indigo-500 rounded-full transition-all duration-150 ${gameState === 'playing' ? 'h-[100%] animate-ping' : 'h-[70%]'}`}></div>
              <div className={`w-1 bg-indigo-500 rounded-full transition-all duration-150 ${gameState === 'playing' ? 'h-[50%]' : 'h-[30%]'}`}></div>
              <div className={`w-1 bg-indigo-500 rounded-full transition-all duration-150 ${gameState === 'playing' ? 'h-[90%]' : 'h-[60%]'}`}></div>
              <div className={`w-1 bg-indigo-500 rounded-full transition-all duration-150 ${gameState === 'playing' ? 'h-[60%]' : 'h-[40%]'}`}></div>
            </div>
          </div>

          {/* Notifications / Mode Badges */}
          <div className="flex space-x-1.5">
            <button
              onClick={() => setActiveModal('events')}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-full border border-white/5 text-[10px] text-slate-300 font-black uppercase tracking-wider transition"
            >
              Alerts ({notifications.length})
            </button>
            <div className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/20 text-[10px] font-black uppercase tracking-wider">
              3D Immersive
            </div>
          </div>
        </div>
      </footer>

      {/* 3. MODALS & POPUPS */}

      {/* Armory & Powerup Shop Modal */}
      {activeModal === 'shop' && (
        <React.Suspense fallback={null}>
          <ShopModal
            profile={profile}
            onClose={() => setActiveModal(null)}
            onUpdateProfile={handleUpdateProfile}
          />
        </React.Suspense>
      )}

      {/* Avatar Customizer Modal */}
      {activeModal === 'avatar' && (
        <React.Suspense fallback={null}>
          <AvatarCustomizer
            profile={profile}
            onClose={() => setActiveModal(null)}
            onUpdateProfile={handleUpdateProfile}
          />
        </React.Suspense>
      )}

      {/* Leaderboards & Friends Modal */}
      {activeModal === 'leaderboard' && (
        <React.Suspense fallback={null}>
          <LeaderboardModal
            profile={profile}
            onClose={() => setActiveModal(null)}
            onPlayAgain={() => {
              setActiveModal(null);
              handleStartArcade(gameMode);
            }}
          />
        </React.Suspense>
      )}

      {/* Mole Field Guide & Species Codex Modal */}
      {activeModal === 'codex' && (
        <React.Suspense fallback={null}>
          <MoleCodexModal
            onClose={() => setActiveModal(null)}
          />
        </React.Suspense>
      )}

      {/* Events & Weekly Challenges Modal */}
      {activeModal === 'events' && (
        <React.Suspense fallback={null}>
          <EventsAndChallengesModal
            profile={profile}
            onClose={() => setActiveModal(null)}
            onUpdateProfile={handleUpdateProfile}
          />
        </React.Suspense>
      )}

      {/* Italian Pizza Recipe Codex Modal */}
      {activeModal === 'pizza_codex' && (
        <React.Suspense fallback={null}>
          <PizzaRecipeCodex
            profile={profile}
            onClose={() => setActiveModal(null)}
            onUpdateProfile={handleUpdateProfile}
          />
        </React.Suspense>
      )}

      {/* Settings & In-Game Pause Modal */}
      {(activeModal === 'settings' || gameState === 'paused') && (
        <React.Suspense fallback={null}>
          <PauseAndSettingsModal
            profile={profile}
            isOpen={activeModal === 'settings' || gameState === 'paused'}
            isPaused={gameState === 'paused'}
            onClose={() => {
              if (gameState === 'paused') setGameState('playing');
              setActiveModal(null);
            }}
            onResume={() => setGameState('playing')}
            onRestart={() => handleStartArcade(gameMode)}
            onQuitToMenu={() => {
              setGameState('menu');
              setActiveModal(null);
            }}
            onTriggerKitchenDisaster={() => {
              triggerKitchenDisaster();
              setGameState('playing');
              setActiveModal(null);
            }}
            onTestParticleExplosion={(type) => {
              const cx = typeof window !== 'undefined' ? window.innerWidth / 2 : 400;
              const cy = typeof window !== 'undefined' ? window.innerHeight / 2 : 300;
              setParticleExplosionTrigger({
                x: cx,
                y: cy,
                type,
                isCrit: true,
                isDefeated: true,
                timestamp: Date.now(),
              });
              triggerScreenShake(6.5);
              sfx.playMoleSpawn(type);
            }}
            onRepeatCameraTutorial={() => setShowCameraTutorial(true)}
            onUpdateProfile={handleUpdateProfile}
          />
        </React.Suspense>
      )}

      {/* Interactive Camera Mode Onboarding Tutorial */}
      {showCameraTutorial && (
        <React.Suspense fallback={null}>
          <CameraTutorialModal
            isOpen={showCameraTutorial}
            onClose={() => setShowCameraTutorial(false)}
            onComplete={() => setShowCameraTutorial(false)}
            status={handTracking.status}
            cursor={handTracking.cursor}
            gesture={handTracking.gesture}
          />
        </React.Suspense>
      )}

      {/* Camera Mode Smash-To-Start Calibration & Launch Modal */}
      {showCameraSmashModal && (
        <React.Suspense fallback={null}>
          <CameraSmashStartModal
            isOpen={showCameraSmashModal}
            onClose={() => setShowCameraSmashModal(false)}
            onStartGame={() => {
              setShowCameraSmashModal(false);
              handleStartArcade('arcade');
            }}
            cursor={handTracking.cursor}
            gesture={handTracking.gesture}
            status={handTracking.status}
          />
        </React.Suspense>
      )}

      {/* Game Over / Victory Modal */}
      <AnimatePresence>
        {gameState === 'gameover' && (
          <React.Suspense fallback={null}>
            <GameOverModal
              score={score}
              combo={combo}
              maxCombo={maxCombo}
              molesHit={molesHit}
              goldenHit={goldenHit}
              bombsHit={bombsHit}
              mode={gameMode}
              isNewHighScore={isNewHighScoreRound}
              isMultiplayerWin={
                isMultiplayerWinRound || (
                  gameMode === 'multiplayer' && mpRoom && mpRoom.players[profile.id]
                    ? (Object.values(mpRoom.players) as import('./types').MultiplayerPlayer[]).every((p) => p.id === profile.id || score > p.score)
                    : false
                )
              }
              isMultiplayerTie={
                gameMode === 'multiplayer' && mpRoom && mpRoom.players[profile.id]
                  ? (Object.values(mpRoom.players) as import('./types').MultiplayerPlayer[]).some((p) => p.id !== profile.id && score === p.score)
                  : false
              }
              opponentName={
                gameMode === 'multiplayer' && mpRoom
                  ? (Object.values(mpRoom.players) as import('./types').MultiplayerPlayer[]).find((p) => p.id !== profile.id)?.name
                  : undefined
              }
              opponentScore={
                gameMode === 'multiplayer' && mpRoom
                  ? (Object.values(mpRoom.players) as import('./types').MultiplayerPlayer[]).find((p) => p.id !== profile.id)?.score
                  : undefined
              }
              profile={profile}
              onOpenCodex={() => setActiveModal('pizza_codex')}
              onOpenLeaderboard={() => setActiveModal('leaderboard')}
              onPlayAgain={() => {
                if (gameMode === 'multiplayer') {
                  setGameState('multiplayer_lobby');
                } else {
                  handleStartArcade(gameMode);
                }
              }}
              onHome={() => setGameState('menu')}
            />
          </React.Suspense>
        )}
      </AnimatePresence>

      {/* Push Notifications Toast Manager - only in Menu state */}
      {gameState === 'menu' && (
        <PushNotificationsToast
          notifications={notifications}
          onDismiss={(id) => setNotifications((prev) => prev.filter((n) => n.id !== id))}
          onOpenChallenges={() => setActiveModal('events')}
        />
      )}
    </div>
  );
}
