import * as THREE from 'three';
import { MoleType } from '../../types';

interface PooledParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  rotVelocity: THREE.Vector3;
  initialScale: THREE.Vector3;
  gravity: number;
  life: number;
  maxLife: number;
  scaleDelta: number;
  active: boolean;
}

export class ParticleManager {
  private scene: THREE.Scene;
  public group: THREE.Group = new THREE.Group();

  // 5 Shared Reusable Geometries
  private readonly sphereGeom: THREE.SphereGeometry;
  private readonly boxGeom: THREE.BoxGeometry;
  private readonly cylinderGeom: THREE.CylinderGeometry;
  private readonly octahedronGeom: THREE.OctahedronGeometry;
  private readonly ringGeom: THREE.RingGeometry;

  // Shared Reusable Materials (Zero per-frame allocations)
  private readonly matPizzaSauce: THREE.MeshStandardMaterial;
  private readonly matPizzaSauceDark: THREE.MeshBasicMaterial;
  private readonly matFlour: THREE.MeshBasicMaterial;
  private readonly matFlourWarm: THREE.MeshBasicMaterial;
  private readonly matCheese: THREE.MeshStandardMaterial;
  private readonly matOregano: THREE.MeshStandardMaterial;
  private readonly matOreganoSparkle: THREE.MeshBasicMaterial;
  private readonly matSparkGold: THREE.MeshBasicMaterial;
  private readonly matSparkWhite: THREE.MeshBasicMaterial;
  private readonly matSparkCyan: THREE.MeshBasicMaterial;
  private readonly matSparkOrange: THREE.MeshBasicMaterial;
  private readonly matCoins: THREE.MeshStandardMaterial;
  private readonly matShockwaveGold: THREE.MeshBasicMaterial;
  private readonly matShockwaveWhite: THREE.MeshBasicMaterial;
  private readonly matShockwaveCyan: THREE.MeshBasicMaterial;
  private readonly matShockwavePurple: THREE.MeshBasicMaterial;
  private readonly matSmoke: THREE.MeshBasicMaterial;
  private readonly matFire: THREE.MeshBasicMaterial;
  private readonly matFrost: THREE.MeshStandardMaterial;
  private readonly matArmor: THREE.MeshStandardMaterial;
  private readonly matPepperoni: THREE.MeshStandardMaterial;
  private readonly matBasil: THREE.MeshStandardMaterial;
  private readonly matCrumb: THREE.MeshStandardMaterial;
  private readonly matPrismaticPink: THREE.MeshBasicMaterial;
  private readonly matPrismaticPurple: THREE.MeshBasicMaterial;

  // Object-Pool Configuration (250 pre-allocated meshes)
  private pool: PooledParticle[] = [];
  private freeIndices: number[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group.name = 'particle_manager_pool_group';
    this.scene.add(this.group);

    // 1. Initialize 5 Shared Geometries
    this.sphereGeom = new THREE.SphereGeometry(1, 8, 8);
    this.boxGeom = new THREE.BoxGeometry(1, 1, 1);
    this.cylinderGeom = new THREE.CylinderGeometry(1, 1, 1, 12);
    this.octahedronGeom = new THREE.OctahedronGeometry(1, 0);
    this.ringGeom = new THREE.RingGeometry(0.3, 0.6, 24);

    // 2. Initialize Shared Reusable Materials
    this.matPizzaSauce = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.15,
      metalness: 0.25,
      emissive: 0x450a0a,
      emissiveIntensity: 0.25,
    });

    this.matPizzaSauceDark = new THREE.MeshBasicMaterial({
      color: 0xb91c1c,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });

    this.matFlour = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
    });

    this.matFlourWarm = new THREE.MeshBasicMaterial({
      color: 0xfaf7f2,
      transparent: true,
      opacity: 0.82,
    });

    this.matCheese = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      roughness: 0.3,
      emissive: 0xd97706,
      emissiveIntensity: 0.2,
    });

    this.matOregano = new THREE.MeshStandardMaterial({
      color: 0x3f6212,
      roughness: 0.65,
      emissive: 0x14532d,
      emissiveIntensity: 0.2,
    });

    this.matOreganoSparkle = new THREE.MeshBasicMaterial({
      color: 0x86efac,
      transparent: true,
      opacity: 0.9,
    });

    this.matSparkGold = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.95,
    });

    this.matSparkWhite = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
    });

    this.matSparkCyan = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.95,
    });

    this.matSparkOrange = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.95,
    });

    this.matCoins = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0xd97706,
      emissiveIntensity: 0.4,
    });

    this.matShockwaveGold = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });

    this.matShockwaveWhite = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });

    this.matShockwaveCyan = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });

    this.matShockwavePurple = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });

    this.matSmoke = new THREE.MeshBasicMaterial({
      color: 0x3f3f46,
      transparent: true,
      opacity: 0.85,
    });

    this.matFire = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.95,
    });

    this.matFrost = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      metalness: 0.5,
      roughness: 0.1,
      transparent: true,
      opacity: 0.85,
    });

    this.matArmor = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.3,
    });

    this.matPepperoni = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      roughness: 0.35,
      metalness: 0.2,
      emissive: 0x7f1d1d,
      emissiveIntensity: 0.2,
    });

    this.matBasil = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.5,
      emissive: 0x14532d,
      emissiveIntensity: 0.25,
    });

    this.matCrumb = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.7,
    });

    this.matPrismaticPink = new THREE.MeshBasicMaterial({
      color: 0xec4899,
      transparent: true,
      opacity: 0.95,
    });

    this.matPrismaticPurple = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.95,
    });

    // 3. Pre-allocate exactly 250 THREE.Mesh instances inside this.group
    for (let i = 0; i < 250; i++) {
      const mesh = new THREE.Mesh(this.sphereGeom, this.matFlour);
      mesh.visible = false;
      this.group.add(mesh);

      this.pool.push({
        mesh,
        velocity: new THREE.Vector3(),
        rotVelocity: new THREE.Vector3(),
        initialScale: new THREE.Vector3(1, 1, 1),
        gravity: 9.8,
        life: 0,
        maxLife: 1,
        scaleDelta: 0,
        active: false,
      });

      this.freeIndices.push(i);
    }
  }

  /**
   * Internal zero-allocation particle spawn helper.
   * Acquires an idle particle from the free list (or recycles oldest active)
   * and sets properties directly on mutable fields.
   */
  private spawnParticle(
    geom: THREE.BufferGeometry,
    mat: THREE.Material,
    pos: THREE.Vector3,
    velX: number,
    velY: number,
    velZ: number,
    rotX: number,
    rotY: number,
    rotZ: number,
    scaleX: number,
    scaleY: number,
    scaleZ: number,
    gravity: number,
    maxLife: number,
    scaleDelta: number,
    initRotX = 0,
    initRotY = 0,
    initRotZ = 0
  ): PooledParticle {
    let idx: number;
    if (this.freeIndices.length > 0) {
      idx = this.freeIndices.pop()!;
    } else {
      // Reclaim the oldest active particle
      let oldestIdx = 0;
      let oldestLifeRatio = -1;
      for (let i = 0; i < this.pool.length; i++) {
        const ratio = this.pool[i].life / this.pool[i].maxLife;
        if (ratio > oldestLifeRatio) {
          oldestLifeRatio = ratio;
          oldestIdx = i;
        }
      }
      idx = oldestIdx;
    }

    const p = this.pool[idx];
    p.mesh.geometry = geom;
    p.mesh.material = mat;
    p.mesh.position.set(pos.x, pos.y, pos.z);
    p.mesh.rotation.set(initRotX, initRotY, initRotZ);
    p.mesh.scale.set(scaleX, scaleY, scaleZ);
    p.initialScale.set(scaleX, scaleY, scaleZ);
    p.velocity.set(velX, velY, velZ);
    p.rotVelocity.set(rotX, rotY, rotZ);
    p.gravity = gravity;
    p.life = 0;
    p.maxLife = Math.max(0.05, maxLife);
    p.scaleDelta = scaleDelta;
    p.active = true;
    p.mesh.visible = true;

    return p;
  }

  /**
   * Milestone 2 (F6): Emit Appear Poof on Mole Emergence
   * Flour dust radial burst with archetype color tints + ground shockwave ring
   */
  public emitAppearPoof(pos: THREE.Vector3, type?: MoleType) {
    // 1. Ground Shockwave Ring
    let ringMat: THREE.Material = this.matShockwaveWhite;
    let flourMat: THREE.Material = this.matFlour;

    if (type === 'golden') {
      ringMat = this.matShockwaveGold;
      flourMat = this.matSparkGold;
    } else if (type === 'frost') {
      ringMat = this.matShockwaveCyan;
      flourMat = this.matFrost;
    } else if (type === 'boss' || type === 'bomb') {
      ringMat = this.matShockwaveGold;
      flourMat = this.matSparkOrange;
    } else if (type === 'phantom') {
      ringMat = this.matShockwavePurple;
      flourMat = this.matPrismaticPurple;
    } else if (type === 'rainbow') {
      ringMat = this.matShockwaveCyan;
      flourMat = this.matPrismaticPink;
    }

    // Spawn expanding ground shockwave ring
    this.spawnParticle(
      this.ringGeom,
      ringMat,
      pos,
      0, 0.1, 0,
      0, 0, 0,
      0.45, 0.45, 0.45,
      0,
      0.32,
      3.2,
      -Math.PI / 2, 0, 0
    );

    // 2. Radial burst of archetype-tinted bakery flour puffs
    const puffCount = 11;
    for (let i = 0; i < puffCount; i++) {
      const angle = (i / puffCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const speed = 1.3 + Math.random() * 1.5;
      const elevation = 1.2 + Math.random() * 1.8;
      const size = 0.08 + Math.random() * 0.06;
      const geom = i % 2 === 0 ? this.sphereGeom : this.octahedronGeom;
      const mat = Math.random() > 0.4 ? flourMat : this.matFlourWarm;

      this.spawnParticle(
        geom,
        mat,
        pos,
        Math.cos(angle) * speed,
        elevation,
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        size, size, size,
        2.5,
        0.38 + Math.random() * 0.2,
        -0.6
      );
    }
  }

  /**
   * Milestone 2 (F6): Emit Disappear Poof on Mole Retreat
   * Subtle flour curl spiraling upward as mole sinks
   */
  public emitDisappearPoof(pos: THREE.Vector3) {
    const curlCount = 5;
    for (let i = 0; i < curlCount; i++) {
      const angle = (i / curlCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const speed = 0.35 + Math.random() * 0.45;
      const elevation = 0.9 + Math.random() * 0.9;
      const size = 0.05 + Math.random() * 0.035;

      this.spawnParticle(
        this.sphereGeom,
        this.matFlourWarm,
        pos,
        Math.cos(angle) * speed,
        elevation,
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        size, size, size,
        -0.6, // soft float upward curl
        0.42 + Math.random() * 0.18,
        -0.75
      );
    }
  }

  /**
   * Unified hit particles dispatch method according to PROJECT.md Contract 2
   */
  public emitHitParticles(pos: THREE.Vector3, isCrit = false, type?: MoleType) {
    this.emitPizzaKitchenHit(pos, isCrit);

    if (!type || type === 'standard') return;

    switch (type) {
      case 'bomb':
        this.emitExplosion(pos);
        break;
      case 'fast':
        this.emitLightningSparks(pos);
        break;
      case 'tough':
      case 'helmet':
        this.emitArmorChipped(pos, false);
        break;
      case 'golden':
        this.emitCoins(pos, 8);
        this.emitHitSparks(pos, true, 0xfef08a);
        break;
      case 'rainbow':
        this.emitPrismaticBurst(pos);
        break;
      case 'phantom':
        this.emitPhantomGlow(pos);
        break;
      case 'frost':
        this.emitFrostShards(pos);
        break;
      case 'boss':
        this.emitBossShockwave(pos);
        break;
    }
  }

  public emitHitSparks(pos: THREE.Vector3, isCrit = false, customColor?: number) {
    const count = isCrit ? 16 : 8;
    const mat = customColor === 0x38bdf8 ? this.matSparkCyan
      : customColor === 0xef4444 ? this.matFire
      : (isCrit || customColor === 0xfacc15) ? this.matSparkGold
      : this.matSparkWhite;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * (isCrit ? 4.5 : 2.5);
      const elevation = 0.8 + Math.random() * 2.8;
      const size = isCrit ? 0.07 : 0.045;

      this.spawnParticle(
        this.sphereGeom,
        mat,
        pos,
        Math.cos(angle) * speed,
        elevation,
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        size, size, size,
        9.8,
        0.35 + Math.random() * 0.25,
        -0.8
      );
    }
  }

  public emitCoins(pos: THREE.Vector3, count = 6) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const speed = 1.6 + Math.random() * 2.0;
      const elevation = 3.6 + Math.random() * 2.8;

      this.spawnParticle(
        this.cylinderGeom,
        this.matCoins,
        pos,
        Math.cos(angle) * speed,
        elevation,
        Math.sin(angle) * speed,
        Math.random() * 10,
        Math.random() * 10,
        0,
        0.14, 0.03, 0.14,
        12.0,
        0.75 + Math.random() * 0.35,
        -0.2
      );
    }
  }

  public emitExplosion(pos: THREE.Vector3) {
    // Lightweight mobile bomb explosion: 8 particles (5 sparks, 3 smoke)
    const count = 8;
    for (let i = 0; i < count; i++) {
      const isSmoke = i >= 5; // 5 sparks (0..4), 3 smoke (5..7)
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 2.2 + Math.random() * 3.0;
      const size = isSmoke ? 0.16 : 0.11;

      this.spawnParticle(
        this.octahedronGeom,
        isSmoke ? this.matSmoke : this.matFire,
        pos,
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.abs(Math.cos(phi)) * speed + 1.5,
        Math.sin(phi) * Math.sin(theta) * speed,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        size, size, size,
        isSmoke ? 2.5 : 5.5,
        0.26 + Math.random() * 0.12, // 0.26s to 0.38s lifespan
        isSmoke ? 0.3 : -0.4
      );
    }
  }

  public emitFrostShards(pos: THREE.Vector3) {
    const count = 14;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.8 + Math.random() * 3.2;
      const elevation = 1.4 + Math.random() * 2.5;

      this.spawnParticle(
        this.octahedronGeom,
        this.matFrost,
        pos,
        Math.cos(angle) * speed,
        elevation,
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        0.1, 0.1, 0.1,
        7.0,
        0.48 + Math.random() * 0.25,
        -0.4
      );
    }
  }

  public emitLightningSparks(pos: THREE.Vector3) {
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3.5 + Math.random() * 4.0;
      const elevation = 1.8 + Math.random() * 3.0;

      this.spawnParticle(
        this.boxGeom,
        i % 2 === 0 ? this.matSparkCyan : this.matSparkGold,
        pos,
        Math.cos(angle) * speed,
        elevation,
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 16,
        0.04, 0.12, 0.04,
        11.0,
        0.32 + Math.random() * 0.18,
        -0.5
      );
    }
  }

  public emitArmorChipped(pos: THREE.Vector3, isBroken = false) {
    const count = isBroken ? 14 : 7;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.2 + Math.random() * (isBroken ? 4.5 : 2.5);
      const elevation = 2.5 + Math.random() * 3.2;
      const size = isBroken ? 0.12 : 0.08;

      this.spawnParticle(
        this.octahedronGeom,
        this.matArmor,
        pos,
        Math.cos(angle) * speed,
        elevation,
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        size, size, size,
        13.0,
        0.55 + Math.random() * 0.25,
        -0.3
      );
    }
  }

  public emitPrismaticBurst(pos: THREE.Vector3) {
    const count = 16;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.2;
      const speed = 2.5 + Math.random() * 3.5;
      const elevation = 3.2 + Math.random() * 2.8;

      this.spawnParticle(
        this.octahedronGeom,
        i % 2 === 0 ? this.matPrismaticPink : this.matPrismaticPurple,
        pos,
        Math.cos(angle) * speed,
        elevation,
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        0.1, 0.1, 0.1,
        8.0,
        0.62 + Math.random() * 0.3,
        0.1
      );
    }
  }

  /**
   * Alias for emitPrismaticBurst
   */
  public emitRainbowBurst(pos: THREE.Vector3) {
    this.emitPrismaticBurst(pos);
  }

  public emitBossShockwave(pos: THREE.Vector3) {
    // Ground expanding ring
    this.spawnParticle(
      this.ringGeom,
      this.matShockwaveGold,
      pos,
      0, 0.15, 0,
      0, 0, 0,
      0.55, 0.55, 0.55,
      0,
      0.55,
      4.2,
      -Math.PI / 2, 0, 0
    );

    this.emitHitSparks(pos, true, 0xfacc15);
  }

  public emitPhantomGlow(pos: THREE.Vector3) {
    const count = 10;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 1.6;

      this.spawnParticle(
        this.sphereGeom,
        i % 2 === 0 ? this.matPrismaticPurple : this.matSparkCyan,
        pos,
        Math.cos(angle) * speed,
        1.8 + Math.random() * 2.0,
        Math.sin(angle) * speed,
        0, 0, 0,
        0.075, 0.075, 0.075,
        -1.4, // float upward
        0.58 + Math.random() * 0.25,
        -0.45
      );
    }
  }

  /**
   * Alias for emitPhantomGlow
   */
  public emitPhantomMist(pos: THREE.Vector3) {
    this.emitPhantomGlow(pos);
  }

  public emitFlourCloud(pos: THREE.Vector3, isCrit = false, customCount?: number) {
    const count = customCount ?? (isCrit ? 16 : 10);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * (isCrit ? 3.0 : 1.8);
      const size = 0.1 + Math.random() * (isCrit ? 0.16 : 0.1);

      this.spawnParticle(
        i % 2 === 0 ? this.sphereGeom : this.octahedronGeom,
        Math.random() > 0.4 ? this.matFlour : this.matFlourWarm,
        pos,
        Math.cos(angle) * speed,
        1.4 + Math.random() * (isCrit ? 2.4 : 1.6),
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
        size, size, size,
        2.2,
        0.58 + Math.random() * 0.3,
        0.4
      );
    }
  }

  public emitFlourPuff(pos: THREE.Vector3, count = 12) {
    this.emitFlourCloud(pos, false, count);
  }

  public emitTomatoSauceSplash(pos: THREE.Vector3, isCrit = false, customCount?: number) {
    const count = customCount ?? (isCrit ? 16 : 10);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.8 + Math.random() * (isCrit ? 4.0 : 2.8);
      const elevation = 3.2 + Math.random() * (isCrit ? 3.8 : 2.5);
      const size = 0.05 + Math.random() * 0.06;

      this.spawnParticle(
        this.sphereGeom,
        this.matPizzaSauce,
        pos,
        Math.cos(angle) * speed,
        elevation,
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        size, size, size,
        12.5,
        0.55 + Math.random() * 0.25,
        -0.35
      );
    }
  }

  public emitTomatoSauceSplatter(pos: THREE.Vector3, count = 10) {
    this.emitTomatoSauceSplash(pos, false, count);
  }

  public emitOreganoSparkles(pos: THREE.Vector3, isCrit = false, customCount?: number) {
    const count = customCount ?? (isCrit ? 14 : 9);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * (isCrit ? 2.8 : 1.8);
      const isSparkle = i % 2 === 0;

      this.spawnParticle(
        isSparkle ? this.octahedronGeom : this.boxGeom,
        isSparkle ? this.matOreganoSparkle : this.matOregano,
        pos,
        Math.cos(angle) * speed,
        2.2 + Math.random() * (isCrit ? 2.8 : 1.6),
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        isSparkle ? 0.05 : 0.04,
        isSparkle ? 0.05 : 0.08,
        isSparkle ? 0.05 : 0.015,
        isSparkle ? -0.6 : 4.2,
        0.65 + Math.random() * 0.25,
        -0.2
      );
    }
  }

  public emitPizzaKitchenHit(pos: THREE.Vector3, isCrit = false) {
    this.emitFlourCloud(pos, isCrit, isCrit ? 12 : 7);
    this.emitTomatoSauceSplash(pos, isCrit, isCrit ? 12 : 7);
    this.emitOreganoSparkles(pos, isCrit, isCrit ? 10 : 6);
  }

  public emitPepperoniDiscs(pos: THREE.Vector3, count = 6) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 1.8 + Math.random() * 2.8;
      const elevation = 3.2 + Math.random() * 2.6;

      this.spawnParticle(
        this.cylinderGeom,
        this.matPepperoni,
        pos,
        Math.cos(angle) * speed,
        elevation,
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        0.13, 0.025, 0.13,
        8.5,
        0.75 + Math.random() * 0.25,
        -0.2
      );
    }
  }

  public emitMozzarellaCheese(pos: THREE.Vector3, count = 7) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.6 + Math.random() * 2.6;
      const elevation = 2.8 + Math.random() * 2.8;

      this.spawnParticle(
        this.boxGeom,
        this.matCheese,
        pos,
        Math.cos(angle) * speed,
        elevation,
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        0.05, 0.18, 0.04,
        7.0,
        0.68 + Math.random() * 0.25,
        -0.25
      );
    }
  }

  public emitBasilLeaves(pos: THREE.Vector3, count = 5) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 2.0;

      this.spawnParticle(
        this.boxGeom,
        this.matBasil,
        pos,
        Math.cos(angle) * speed,
        2.2 + Math.random() * 1.8,
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        0.12, 0.02, 0.16,
        4.2,
        0.82 + Math.random() * 0.25,
        -0.1
      );
    }
  }

  public emitCrustCrumbs(pos: THREE.Vector3, count = 6) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.8 + Math.random() * 2.5;

      this.spawnParticle(
        this.octahedronGeom,
        this.matCrumb,
        pos,
        Math.cos(angle) * speed,
        3.0 + Math.random() * 2.2,
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        0.06, 0.06, 0.06,
        11.0,
        0.6,
        -0.35
      );
    }
  }

  public emitPizzaIngredientsBurst(pos: THREE.Vector3, isBig = false) {
    this.emitFlourCloud(pos, isBig, isBig ? 12 : 7);
    this.emitTomatoSauceSplash(pos, isBig, isBig ? 12 : 8);
    this.emitOreganoSparkles(pos, isBig, isBig ? 12 : 7);
    this.emitPepperoniDiscs(pos, isBig ? 7 : 4);
    this.emitMozzarellaCheese(pos, isBig ? 8 : 5);
    this.emitBasilLeaves(pos, isBig ? 5 : 3);
    this.emitCrustCrumbs(pos, isBig ? 6 : 3);
    if (isBig) {
      this.emitPizzaSlices(pos, 4);
    }
  }

  public emitPizzaSlices(pos: THREE.Vector3, count = 4) {
    for (let i = 0; i < count; i++) {
      const angle = (i * Math.PI * 2) / count + Math.random() * 0.4;
      const speed = 1.4 + Math.random() * 1.8;

      this.spawnParticle(
        this.octahedronGeom,
        this.matCoins,
        pos,
        Math.cos(angle) * speed,
        2.8 + Math.random() * 1.8,
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        0.12, 0.18, 0.08,
        6.0,
        0.75,
        0.1
      );
    }
  }

  public emitPizzaOvenBurn(pos: THREE.Vector3) {
    const count = 18;
    for (let i = 0; i < count; i++) {
      const isSmoke = i > 10;
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.4 + Math.random() * 3.5;
      const elevation = 2.8 + Math.random() * 3.5;

      this.spawnParticle(
        this.octahedronGeom,
        isSmoke ? this.matSmoke : this.matFire,
        pos,
        Math.cos(angle) * speed,
        elevation,
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        isSmoke ? 0.16 : 0.1,
        isSmoke ? 0.16 : 0.1,
        isSmoke ? 0.16 : 0.1,
        isSmoke ? -1.8 : 6.0,
        0.5 + Math.random() * 0.3,
        isSmoke ? 0.6 : -0.6
      );
    }
  }

  public emitHeatZoneSparks(pos: THREE.Vector3, count = 2) {
    for (let i = 0; i < count; i++) {
      this.spawnParticle(
        this.sphereGeom,
        this.matSparkOrange,
        pos,
        (Math.random() - 0.5) * 0.6,
        1.8 + Math.random() * 1.5,
        (Math.random() - 0.5) * 0.6,
        0, 0, 0,
        0.05, 0.05, 0.05,
        -1.0,
        0.55 + Math.random() * 0.3,
        -0.35
      );
    }
  }

  /**
   * Per-frame physics integration with ZERO allocations.
   * Modifies existing active particles in place; recycles to freeIndices on expiry.
   */
  public update(delta: number) {
    const dt = Math.min(delta, 0.1);

    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
        this.freeIndices.push(i);
        continue;
      }

      // Physics integration
      p.velocity.y -= p.gravity * dt;
      p.mesh.position.x += p.velocity.x * dt;
      p.mesh.position.y += p.velocity.y * dt;
      p.mesh.position.z += p.velocity.z * dt;

      p.mesh.rotation.x += p.rotVelocity.x * dt;
      p.mesh.rotation.y += p.rotVelocity.y * dt;
      p.mesh.rotation.z += p.rotVelocity.z * dt;

      // Scale evolution without memory allocations
      const progress = p.life / p.maxLife;
      if (p.scaleDelta > 0) {
        // Expanding ring / shockwave
        const factor = 1 + p.scaleDelta * progress;
        p.mesh.scale.x = p.initialScale.x * factor;
        p.mesh.scale.y = p.initialScale.y * factor;
        p.mesh.scale.z = p.initialScale.z * factor;
      } else {
        // Shrinking / dissipating particles
        const factor = Math.max(0.01, (1 - progress) * (1 + p.scaleDelta * dt * progress));
        p.mesh.scale.x = p.initialScale.x * factor;
        p.mesh.scale.y = p.initialScale.y * factor;
        p.mesh.scale.z = p.initialScale.z * factor;
      }
    }
  }

  /**
   * Reset all pooled particles without disposing pre-allocated resources.
   */
  public cleanup() {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      p.active = false;
      p.mesh.visible = false;
    }
    this.freeIndices = this.pool.map((_, i) => i);
  }
}
