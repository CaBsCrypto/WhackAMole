/**
 * WhackAMole Complete Game Loop Simulation for E2E Testing
 * Based on App.tsx game state, scoring rules, combo system, and mole types.
 */

import { CoordinateEngine } from './coordinateEngine';
import { MockMediaDevices, MockMediaStream, StreamLeakAuditor } from './mockMediaStream';

export type SimulatedMoleType = 'standard' | 'golden' | 'bomb' | 'tough' | 'frost';

export interface SimulatedMole {
  id: string;
  holeIndex: number;
  type: SimulatedMoleType;
  health: number;
  maxHealth: number;
  spawnTime: number;
  durationMs: number;
  state: 'rising' | 'idle' | 'hit' | 'exploded' | 'gone';
  points: number;
}

export interface GameEngineStats {
  hits: number;
  misses: number;
  bombsHit: number;
  goldenHit: number;
  maxCombo: number;
  totalDamageDealt: number;
}

export class GameEngineSim {
  public controlMode: 'classic' | 'camera' = 'classic';
  public gameState: 'menu' | 'playing' | 'paused' | 'gameover' = 'menu';
  public score: number = 0;
  public comboStreak: number = 0;
  public timeRemainingSeconds: number = 60;
  public activeMoles: Map<number, SimulatedMole> = new Map();
  public stats: GameEngineStats = {
    hits: 0,
    misses: 0,
    bombsHit: 0,
    goldenHit: 0,
    maxCombo: 0,
    totalDamageDealt: 0,
  };

  public frenzyActive: boolean = false;
  public frenzyTimeRemainingMs: number = 0;

  // MediaStream tracking for camera mode
  public mediaDevices: MockMediaDevices = new MockMediaDevices();
  public activeCameraStream: MockMediaStream | null = null;
  public isCameraTracking: boolean = false;
  public trackingStatus: 'idle' | 'requesting-camera' | 'loading-model' | 'tracking' | 'error' = 'idle';

  public async startArcadeGame(mode: 'classic' | 'camera' = 'classic'): Promise<void> {
    this.controlMode = mode;
    this.score = 0;
    this.comboStreak = 0;
    this.timeRemainingSeconds = 60;
    this.activeMoles.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      bombsHit: 0,
      goldenHit: 0,
      maxCombo: 0,
      totalDamageDealt: 0,
    };
    this.frenzyActive = false;
    this.frenzyTimeRemainingMs = 0;

    if (mode === 'camera') {
      await this.initCameraMode();
    } else {
      this.teardownCamera();
    }

    this.gameState = 'playing';
  }

  public async initCameraMode(): Promise<void> {
    this.trackingStatus = 'requesting-camera';
    try {
      this.activeCameraStream = await this.mediaDevices.getUserMedia({ video: true });
      this.trackingStatus = 'loading-model';
      // Simulate WASM load time
      this.trackingStatus = 'tracking';
      this.isCameraTracking = true;
    } catch (err) {
      this.trackingStatus = 'error';
      this.isCameraTracking = false;
      throw err;
    }
  }

  public teardownCamera(): void {
    if (this.activeCameraStream) {
      this.activeCameraStream.getTracks().forEach(track => {
        track.stop();
        this.activeCameraStream?.removeTrack(track);
      });
      this.activeCameraStream = null;
    }
    this.isCameraTracking = false;
    this.trackingStatus = 'idle';
  }

  public async switchControlMode(newMode: 'classic' | 'camera'): Promise<void> {
    if (this.controlMode === newMode) return;

    if (newMode === 'classic') {
      this.teardownCamera();
      this.controlMode = 'classic';
    } else {
      this.controlMode = 'camera';
      await this.initCameraMode();
    }
  }

  public spawnMole(holeIndex: number, type: SimulatedMoleType = 'standard', durationMs = 1200): SimulatedMole {
    let health = 1;
    let points = 100;

    if (type === 'golden') {
      points = 500;
    } else if (type === 'bomb') {
      points = -300;
    } else if (type === 'tough') {
      health = 2;
      points = 200;
    }

    const mole: SimulatedMole = {
      id: 'mole-' + Math.random().toString(36).substring(2, 8),
      holeIndex,
      type,
      health,
      maxHealth: health,
      spawnTime: Date.now(),
      durationMs,
      state: 'idle',
      points,
    };

    this.activeMoles.set(holeIndex, mole);
    return mole;
  }

  public hitHole(holeIndex: number): {
    hit: boolean;
    moleType?: SimulatedMoleType;
    pointsAwarded: number;
    combo: number;
    destroyed: boolean;
  } {
    if (this.gameState !== 'playing') {
      return { hit: false, pointsAwarded: 0, combo: this.comboStreak, destroyed: false };
    }

    const mole = this.activeMoles.get(holeIndex);
    if (!mole || mole.state === 'gone' || mole.state === 'exploded' || mole.state === 'hit') {
      // Missed hit resets combo
      this.comboStreak = 0;
      this.stats.misses++;
      return { hit: false, pointsAwarded: 0, combo: 0, destroyed: false };
    }

    // Process Mole Hit
    if (mole.type === 'bomb') {
      mole.state = 'exploded';
      this.activeMoles.delete(holeIndex);
      this.comboStreak = 0;
      this.stats.bombsHit++;
      this.score = Math.max(0, this.score - 300);
      return { hit: true, moleType: 'bomb', pointsAwarded: -300, combo: 0, destroyed: true };
    }

    // Damage mole
    mole.health--;
    this.stats.totalDamageDealt++;

    if (mole.health <= 0) {
      mole.state = 'hit';
      this.activeMoles.delete(holeIndex);
      this.comboStreak++;
      this.stats.hits++;
      this.stats.maxCombo = Math.max(this.stats.maxCombo, this.comboStreak);

      if (mole.type === 'golden') {
        this.stats.goldenHit++;
      }

      // Combo multiplier: 1x (1-4), 2x (5-9), 3x (10-19), 5x (20+)
      let multiplier = 1;
      if (this.comboStreak >= 20) multiplier = 5;
      else if (this.comboStreak >= 10) multiplier = 3;
      else if (this.comboStreak >= 5) multiplier = 2;

      if (this.frenzyActive) multiplier *= 2;

      const earnedPoints = mole.points * multiplier;
      this.score += earnedPoints;

      return {
        hit: true,
        moleType: mole.type,
        pointsAwarded: earnedPoints,
        combo: this.comboStreak,
        destroyed: true,
      };
    } else {
      // Partially damaged tough mole
      return {
        hit: true,
        moleType: mole.type,
        pointsAwarded: 50,
        combo: this.comboStreak,
        destroyed: false,
      };
    }
  }

  public activateFrenzy(durationMs = 15000): void {
    this.frenzyActive = true;
    this.frenzyTimeRemainingMs = durationMs;
    // Spawn moles in all 9 holes
    for (let i = 0; i < 9; i++) {
      if (!this.activeMoles.has(i)) {
        this.spawnMole(i, i % 4 === 0 ? 'golden' : 'standard', durationMs);
      }
    }
  }

  public tick(dtMs: number): void {
    if (this.gameState !== 'playing') return;

    // Frenzy countdown
    if (this.frenzyActive) {
      this.frenzyTimeRemainingMs -= dtMs;
      if (this.frenzyTimeRemainingMs <= 0) {
        this.frenzyActive = false;
        this.frenzyTimeRemainingMs = 0;
      }
    }

    // Active mole timers
    for (const [idx, mole] of this.activeMoles.entries()) {
      mole.durationMs -= dtMs;
      if (mole.durationMs <= 0) {
        mole.state = 'gone';
        this.activeMoles.delete(idx);
      }
    }

    // Game countdown
    this.timeRemainingSeconds -= dtMs / 1000.0;
    if (this.timeRemainingSeconds <= 0) {
      this.timeRemainingSeconds = 0;
      this.gameState = 'gameover';
    }
  }
}
