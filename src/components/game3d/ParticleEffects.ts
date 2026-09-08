import * as THREE from 'three';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  rotVelocity: THREE.Vector3;
  gravity: number;
  life: number;
  maxLife: number;
  scaleDelta: number;
}

export class ParticleManager {
  private scene: THREE.Scene;
  private particles: Particle[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public emitHitSparks(pos: THREE.Vector3, isCrit = false, customColor?: number) {
    const count = isCrit ? 22 : 12;
    const color = customColor || (isCrit ? 0xfacc15 : 0xffffff);

    for (let i = 0; i < count; i++) {
      const geom = new THREE.SphereGeometry(isCrit ? 0.08 : 0.05, 6, 6);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(pos);
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * (isCrit ? 5.5 : 3.5);
      const elevation = 0.5 + Math.random() * 3.5;

      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        elevation,
        Math.sin(angle) * speed
      );

      this.particles.push({
        mesh,
        velocity,
        rotVelocity: new THREE.Vector3(Math.random() * 5, Math.random() * 5, Math.random() * 5),
        gravity: 9.8,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.3,
        scaleDelta: -0.8,
      });
    }
  }

  public emitCoins(pos: THREE.Vector3, count = 6) {
    const coinGeom = new THREE.CylinderGeometry(0.14, 0.14, 0.03, 10);
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0xd97706,
      emissiveIntensity: 0.4,
    });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(coinGeom, coinMat);
      mesh.position.copy(pos);
      mesh.position.y += 0.2;
      this.scene.add(mesh);

      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 1.8 + Math.random() * 2.2;
      const elevation = 4.0 + Math.random() * 3.0;

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(Math.cos(angle) * speed, elevation, Math.sin(angle) * speed),
        rotVelocity: new THREE.Vector3(Math.random() * 10, Math.random() * 10, 0),
        gravity: 12.0,
        life: 0,
        maxLife: 0.8 + Math.random() * 0.4,
        scaleDelta: 0,
      });
    }
  }

  public emitExplosion(pos: THREE.Vector3) {
    const count = 35;
    for (let i = 0; i < count; i++) {
      const isSmoke = i > 15;
      const geom = new THREE.DodecahedronGeometry(isSmoke ? 0.25 : 0.16, 0);
      const color = isSmoke ? 0x404040 : (Math.random() > 0.5 ? 0xef4444 : 0xf97316);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(pos);
      this.scene.add(mesh);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 3.0 + Math.random() * 6.0;

      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.abs(Math.cos(phi)) * speed + 2.0,
        Math.sin(phi) * Math.sin(theta) * speed
      );

      this.particles.push({
        mesh,
        velocity,
        rotVelocity: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8),
        gravity: 4.0,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.5,
        scaleDelta: isSmoke ? 0.6 : -0.5,
      });
    }
  }

  public emitFrostShards(pos: THREE.Vector3) {
    const count = 18;
    const geom = new THREE.TetrahedronGeometry(0.12, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      metalness: 0.5,
      roughness: 0.1,
      transparent: true,
      opacity: 0.85,
    });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(pos);
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 4.0;
      const elevation = 1.5 + Math.random() * 3.0;

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(Math.cos(angle) * speed, elevation, Math.sin(angle) * speed),
        rotVelocity: new THREE.Vector3(Math.random() * 12, Math.random() * 12, Math.random() * 12),
        gravity: 7.0,
        life: 0,
        maxLife: 0.5 + Math.random() * 0.3,
        scaleDelta: -0.4,
      });
    }
  }

  public emitLightningSparks(pos: THREE.Vector3) {
    const count = 16;
    const colors = [0x06b6d4, 0x38bdf8, 0xfacc15, 0xffffff];

    for (let i = 0; i < count; i++) {
      const geom = new THREE.BoxGeometry(0.04, 0.14, 0.04);
      const color = colors[i % colors.length];
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(pos);
      mesh.position.y += 0.2;
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 4.0 + Math.random() * 5.0;
      const elevation = 2.0 + Math.random() * 4.0;

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(Math.cos(angle) * speed, elevation, Math.sin(angle) * speed),
        rotVelocity: new THREE.Vector3(Math.random() * 20, Math.random() * 20, Math.random() * 20),
        gravity: 12.0,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.2,
        scaleDelta: -0.6,
      });
    }
  }

  public emitArmorChipped(pos: THREE.Vector3, isBroken = false) {
    const count = isBroken ? 20 : 8;
    const geom = new THREE.DodecahedronGeometry(isBroken ? 0.14 : 0.09, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.3,
    });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(pos);
      mesh.position.y += 0.3;
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * (isBroken ? 6.0 : 3.5);
      const elevation = 3.0 + Math.random() * 4.0;

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(Math.cos(angle) * speed, elevation, Math.sin(angle) * speed),
        rotVelocity: new THREE.Vector3(Math.random() * 15, Math.random() * 15, Math.random() * 15),
        gravity: 14.0,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.3,
        scaleDelta: -0.2,
      });
    }
  }

  public emitPrismaticBurst(pos: THREE.Vector3) {
    const count = 28;
    const colors = [0xec4899, 0x8b5cf6, 0x3b82f6, 0x10b981, 0xfacc15, 0xf97316];

    for (let i = 0; i < count; i++) {
      const geom = new THREE.OctahedronGeometry(0.12, 0);
      const color = colors[i % colors.length];
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(pos);
      mesh.position.y += 0.3;
      this.scene.add(mesh);

      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.2;
      const speed = 3.0 + Math.random() * 4.5;
      const elevation = 4.0 + Math.random() * 3.5;

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(Math.cos(angle) * speed, elevation, Math.sin(angle) * speed),
        rotVelocity: new THREE.Vector3(Math.random() * 12, Math.random() * 12, Math.random() * 12),
        gravity: 8.0,
        life: 0,
        maxLife: 0.7 + Math.random() * 0.4,
        scaleDelta: 0.2,
      });
    }
  }

  public emitBossShockwave(pos: THREE.Vector3) {
    // Ground shockwave ring
    const ringGeom = new THREE.RingGeometry(0.3, 0.55, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.copy(pos);
    ringMesh.position.y = 0.05;
    this.scene.add(ringMesh);

    this.particles.push({
      mesh: ringMesh,
      velocity: new THREE.Vector3(0, 0.2, 0),
      rotVelocity: new THREE.Vector3(0, 0, 0),
      gravity: 0,
      life: 0,
      maxLife: 0.6,
      scaleDelta: 4.5,
    });

    // Explosive crown debris
    this.emitHitSparks(pos, true, 0xfacc15);
    this.emitHitSparks(pos, true, 0xef4444);
  }

  public emitPhantomGlow(pos: THREE.Vector3) {
    const count = 15;
    for (let i = 0; i < count; i++) {
      const geom = new THREE.SphereGeometry(0.08, 6, 6);
      const mat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.5 ? 0xa855f7 : 0x06b6d4,
        transparent: true,
        opacity: 0.8,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(pos);
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.0;

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(Math.cos(angle) * speed, 2.0 + Math.random() * 2.5, Math.sin(angle) * speed),
        rotVelocity: new THREE.Vector3(0, 0, 0),
        gravity: -1.5, // float upwards like spirits
        life: 0,
        maxLife: 0.6 + Math.random() * 0.3,
        scaleDelta: -0.5,
      });
    }
  }

  /**
   * Explodes an authentic fluffy cloud of white bakery flour
  /**
   * Explodes an authentic, billowing volumetric cloud of fine Italian white bakery flour
   */
  public emitFlourCloud(pos: THREE.Vector3, isCrit = false, customCount?: number) {
    const cloudCount = customCount ?? (isCrit ? 22 : 14);

    // 1. Billowing Volumetric Flour Cloud Puffs (expanding softly with air resistance)
    for (let i = 0; i < cloudCount; i++) {
      const size = 0.12 + Math.random() * (isCrit ? 0.22 : 0.16);
      const geom = new THREE.DodecahedronGeometry(size, 0);
      const flourColor = Math.random() > 0.3 ? 0xffffff : (Math.random() > 0.5 ? 0xfaf7f2 : 0xf5f3ee);
      const mat = new THREE.MeshBasicMaterial({
        color: flourColor,
        transparent: true,
        opacity: isCrit ? 0.9 : 0.82,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(pos);
      mesh.position.y += 0.25 + (Math.random() - 0.5) * 0.15;
      mesh.position.x += (Math.random() - 0.5) * 0.2;
      mesh.position.z += (Math.random() - 0.5) * 0.2;
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * (isCrit ? 3.8 : 2.4);

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          1.6 + Math.random() * (isCrit ? 2.8 : 2.0),
          Math.sin(angle) * speed
        ),
        rotVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 3
        ),
        gravity: 2.2, // light billowing float
        life: 0,
        maxLife: 0.65 + Math.random() * (isCrit ? 0.45 : 0.35),
        scaleDelta: 1.4, // expands outward as it disperses in the air
      });
    }

    // 2. Micro-fine Airborne Flour Dust Motes (drifting outward like powdery dust)
    const moteCount = isCrit ? 16 : 10;
    for (let j = 0; j < moteCount; j++) {
      const geom = new THREE.SphereGeometry(0.025 + Math.random() * 0.02, 5, 5);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(pos);
      mesh.position.y += 0.2;
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 3.5;

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          2.2 + Math.random() * 2.5,
          Math.sin(angle) * speed
        ),
        rotVelocity: new THREE.Vector3(Math.random() * 6, Math.random() * 6, 0),
        gravity: 3.5,
        life: 0,
        maxLife: 0.5 + Math.random() * 0.3,
        scaleDelta: 0.2,
      });
    }
  }

  /**
   * Backwards compatible alias for flour puff
   */
  public emitFlourPuff(pos: THREE.Vector3, count = 16) {
    this.emitFlourCloud(pos, false, count);
  }

  /**
   * Splatters rich red San Marzano marinara tomato sauce droplets & splashing arcs
   */
  public emitTomatoSauceSplash(pos: THREE.Vector3, isCrit = false, customCount?: number) {
    const splashCount = customCount ?? (isCrit ? 24 : 16);
    const sauceColors = [0xdc2626, 0xb91c1c, 0xef4444, 0x991b1b];

    for (let i = 0; i < splashCount; i++) {
      const size = 0.05 + Math.random() * (isCrit ? 0.12 : 0.08);
      const geom = new THREE.SphereGeometry(size, 6, 6);
      const color = sauceColors[Math.floor(Math.random() * sauceColors.length)];
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.12,
        metalness: 0.28,
        emissive: 0x450a0a,
        emissiveIntensity: 0.25,
        transparent: true,
        opacity: 0.95,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(pos);
      mesh.position.y += 0.3 + (Math.random() - 0.5) * 0.18;
      mesh.position.x += (Math.random() - 0.5) * 0.15;
      mesh.position.z += (Math.random() - 0.5) * 0.15;
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * (isCrit ? 4.8 : 3.5);
      const elevation = 3.6 + Math.random() * (isCrit ? 4.2 : 3.0);

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          elevation,
          Math.sin(angle) * speed
        ),
        rotVelocity: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8),
        gravity: 12.5, // Viscous liquid gravity curve
        life: 0,
        maxLife: 0.6 + Math.random() * 0.3,
        scaleDelta: -0.4,
      });
    }

    // Horizontal tomato sauce splat dollops spreading on impact
    const dollopCount = isCrit ? 4 : 2;
    for (let d = 0; d < dollopCount; d++) {
      const dollopGeom = new THREE.CircleGeometry(0.1 + Math.random() * 0.1, 10);
      const dollopMat = new THREE.MeshBasicMaterial({
        color: 0xb91c1c,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      });
      const dollopMesh = new THREE.Mesh(dollopGeom, dollopMat);
      dollopMesh.rotation.x = -Math.PI / 2;
      dollopMesh.position.set(
        pos.x + (Math.random() - 0.5) * 0.4,
        0.08,
        pos.z + (Math.random() - 0.5) * 0.4
      );
      this.scene.add(dollopMesh);

      this.particles.push({
        mesh: dollopMesh,
        velocity: new THREE.Vector3(0, 0.05, 0),
        rotVelocity: new THREE.Vector3(0, 0, 0),
        gravity: 0,
        life: 0,
        maxLife: 0.45,
        scaleDelta: 1.6,
      });
    }
  }

  /**
   * Backwards compatible alias for tomato sauce splatter
   */
  public emitTomatoSauceSplatter(pos: THREE.Vector3, count = 14) {
    this.emitTomatoSauceSplash(pos, false, count);
  }

  /**
   * Emits aromatic Mediterranean oregano herb flakes and sparkling culinary sparkles
   */
  public emitOreganoSparkles(pos: THREE.Vector3, isCrit = false, customCount?: number) {
    const flakeCount = customCount ?? (isCrit ? 22 : 14);

    // 1. Organic Oregano Dried & Fresh Leaf Flakes (tumbling and fluttering)
    const oreganoColors = [0x3f6212, 0x4d7c0f, 0x65a30d, 0x15803d, 0x2e5a1c];
    for (let i = 0; i < flakeCount; i++) {
      const flakeGeom = new THREE.BoxGeometry(0.045, 0.085, 0.015);
      const color = oreganoColors[Math.floor(Math.random() * oreganoColors.length)];
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.65,
        emissive: 0x14532d,
        emissiveIntensity: 0.2,
      });
      const mesh = new THREE.Mesh(flakeGeom, mat);
      mesh.position.copy(pos);
      mesh.position.y += 0.35 + (Math.random() - 0.5) * 0.2;
      mesh.position.x += (Math.random() - 0.5) * 0.2;
      mesh.position.z += (Math.random() - 0.5) * 0.2;
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.4 + Math.random() * (isCrit ? 3.4 : 2.2);

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          2.6 + Math.random() * (isCrit ? 3.2 : 2.0),
          Math.sin(angle) * speed
        ),
        rotVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 16,
          (Math.random() - 0.5) * 16,
          (Math.random() - 0.5) * 16
        ),
        gravity: 4.2, // soft leafy flutter descent
        life: 0,
        maxLife: 0.75 + Math.random() * (isCrit ? 0.35 : 0.25),
        scaleDelta: -0.15,
      });
    }

    // 2. Magical Oregano Culinary Sparkles (twinkling star gems floating upward)
    const sparkleCount = isCrit ? 16 : 9;
    const sparkleColors = [0xfde047, 0x86efac, 0x4ade80, 0xfef08a, 0xffffff];
    for (let s = 0; s < sparkleCount; s++) {
      const sparkleGeom = new THREE.OctahedronGeometry(0.045 + Math.random() * 0.035, 0);
      const color = sparkleColors[Math.floor(Math.random() * sparkleColors.length)];
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(sparkleGeom, mat);
      mesh.position.copy(pos);
      mesh.position.y += 0.35 + (Math.random() - 0.5) * 0.2;
      mesh.position.x += (Math.random() - 0.5) * 0.25;
      mesh.position.z += (Math.random() - 0.5) * 0.25;
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * 2.0;

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          1.8 + Math.random() * 2.5,
          Math.sin(angle) * speed
        ),
        rotVelocity: new THREE.Vector3(Math.random() * 12, Math.random() * 12, Math.random() * 12),
        gravity: -0.8, // floats upward like shimmering aroma sparkles!
        life: 0,
        maxLife: 0.65 + Math.random() * 0.3,
        scaleDelta: -0.3,
      });
    }
  }

  /**
   * Spawns the signature Pizza Kitchen Trio whenever a mole is hit:
   * (Flour Clouds + Tomato Sauce Splashes + Oregano Sparkles)
   */
  public emitPizzaKitchenHit(pos: THREE.Vector3, isCrit = false) {
    this.emitFlourCloud(pos, isCrit);
    this.emitTomatoSauceSplash(pos, isCrit);
    this.emitOreganoSparkles(pos, isCrit);
  }

  /**
   * Emits authentic round cured pepperoni slices with 3D tumbling physics
   */
  public emitPepperoniDiscs(pos: THREE.Vector3, count = 8) {
    const pepGeom = new THREE.CylinderGeometry(0.14, 0.14, 0.025, 14);
    for (let i = 0; i < count; i++) {
      const isCrispEdge = Math.random() > 0.4;
      const pepMat = new THREE.MeshStandardMaterial({
        color: isCrispEdge ? 0xb91c1c : 0x991b1b,
        roughness: 0.35,
        metalness: 0.2,
        emissive: 0x7f1d1d,
        emissiveIntensity: 0.2,
      });
      const mesh = new THREE.Mesh(pepGeom, pepMat);
      mesh.position.copy(pos);
      mesh.position.y += 0.35;
      mesh.rotation.x = Math.random() * Math.PI;
      mesh.rotation.z = Math.random() * Math.PI;
      this.scene.add(mesh);

      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 2.0 + Math.random() * 3.5;
      const elevation = 3.5 + Math.random() * 3.0;

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          elevation,
          Math.sin(angle) * speed
        ),
        rotVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 14
        ),
        gravity: 8.5,
        life: 0,
        maxLife: 0.85 + Math.random() * 0.3,
        scaleDelta: -0.2,
      });
    }
  }

  /**
   * Emits stretchy, gooey golden-white mozzarella cheese strands
   */
  public emitMozzarellaCheese(pos: THREE.Vector3, count = 10) {
    for (let i = 0; i < count; i++) {
      const strandLen = 0.18 + Math.random() * 0.18;
      const geom = new THREE.BoxGeometry(0.06, strandLen, 0.04);
      const color = Math.random() > 0.4 ? 0xfef08a : (Math.random() > 0.5 ? 0xfde047 : 0xffedd5);
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.3,
        emissive: 0xd97706,
        emissiveIntensity: 0.2,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(pos);
      mesh.position.y += 0.3;
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.8 + Math.random() * 3.2;
      const elevation = 3.0 + Math.random() * 3.2;

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          elevation,
          Math.sin(angle) * speed
        ),
        rotVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
        ),
        gravity: 7.0,
        life: 0,
        maxLife: 0.75 + Math.random() * 0.3,
        scaleDelta: -0.25,
      });
    }
  }

  /**
   * Emits fresh aromatic green basil leaves fluttering through the air
   */
  public emitBasilLeaves(pos: THREE.Vector3, count = 6) {
    for (let i = 0; i < count; i++) {
      const leafGeom = new THREE.ConeGeometry(0.09, 0.2, 4);
      const mat = new THREE.MeshStandardMaterial({
        color: Math.random() > 0.5 ? 0x15803d : 0x16a34a,
        roughness: 0.5,
        emissive: 0x14532d,
        emissiveIntensity: 0.25,
      });
      const mesh = new THREE.Mesh(leafGeom, mat);
      mesh.position.copy(pos);
      mesh.position.y += 0.3;
      mesh.scale.set(1.2, 0.2, 1.6); // flattened leaf aspect
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.4;

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          2.5 + Math.random() * 2.0,
          Math.sin(angle) * speed
        ),
        rotVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 6
        ),
        gravity: 4.2, // soft foliage air resistance
        life: 0,
        maxLife: 0.9 + Math.random() * 0.3,
        scaleDelta: -0.1,
      });
    }
  }

  /**
   * Emits toasted crunchy pizza crust crumbs & parmesan flakes
   */
  public emitCrustCrumbs(pos: THREE.Vector3, count = 8) {
    for (let i = 0; i < count; i++) {
      const geom = new THREE.DodecahedronGeometry(0.06 + Math.random() * 0.04, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: Math.random() > 0.4 ? 0xd97706 : 0xb45309,
        roughness: 0.7,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(pos);
      mesh.position.y += 0.25;
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 3.0;

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          3.5 + Math.random() * 2.5,
          Math.sin(angle) * speed
        ),
        rotVelocity: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10),
        gravity: 11.0,
        life: 0,
        maxLife: 0.65,
        scaleDelta: -0.4,
      });
    }
  }

  /**
   * Comprehensive gourmet burst of all signature pizza ingredients at once:
   * (Flour clouds, Tomato sauce splashes, Oregano sparkles, Pepperoni discs, Mozzarella cheese strings, Basil leaves & Crust crumbs)
   */
  public emitPizzaIngredientsBurst(pos: THREE.Vector3, isBig = false) {
    this.emitFlourCloud(pos, isBig, isBig ? 18 : 12);
    this.emitTomatoSauceSplash(pos, isBig, isBig ? 20 : 14);
    this.emitOreganoSparkles(pos, isBig, isBig ? 18 : 12);
    this.emitPepperoniDiscs(pos, isBig ? 10 : 6);
    this.emitMozzarellaCheese(pos, isBig ? 12 : 7);
    this.emitBasilLeaves(pos, isBig ? 8 : 4);
    this.emitCrustCrumbs(pos, isBig ? 10 : 5);
    if (isBig) {
      this.emitPizzaSlices(pos, 5);
    }
  }

  /**
   * Emits floating golden pizza slices on critical hits and combos
   */
  public emitPizzaSlices(pos: THREE.Vector3, count = 6) {
    for (let i = 0; i < count; i++) {
      // Mini pizza triangle slice
      const geom = new THREE.ConeGeometry(0.12, 0.24, 3);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        roughness: 0.4,
        emissive: 0xd97706,
        emissiveIntensity: 0.4,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(pos);
      mesh.position.y += 0.4;
      this.scene.add(mesh);

      const angle = (i * Math.PI * 2) / count + Math.random() * 0.5;
      const speed = 1.5 + Math.random() * 2.0;

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          3.2 + Math.random() * 2.0,
          Math.sin(angle) * speed
        ),
        rotVelocity: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8),
        gravity: 6.0,
        life: 0,
        maxLife: 0.8,
        scaleDelta: 0.2,
      });
    }
  }

  /**
   * Emits scorching fiery inferno blast when Pizza Oven powerup incinerates a mole
   */
  public emitPizzaOvenBurn(pos: THREE.Vector3) {
    const count = 28;
    for (let i = 0; i < count; i++) {
      const isEmber = i > 16;
      const isSmoke = i > 23;
      const geom = new THREE.DodecahedronGeometry(isSmoke ? 0.22 : (isEmber ? 0.08 : 0.14), 0);
      const color = isSmoke ? 0x262626 : (isEmber ? 0xfef08a : (Math.random() > 0.5 ? 0xef4444 : 0xf97316));
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(pos);
      mesh.position.y += 0.2;
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      const elevation = 3.0 + Math.random() * 4.0;

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          elevation,
          Math.sin(angle) * speed
        ),
        rotVelocity: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8),
        gravity: isSmoke ? -2.0 : (isEmber ? 3.0 : 8.0),
        life: 0,
        maxLife: 0.55 + Math.random() * 0.35,
        scaleDelta: isSmoke ? 0.8 : -0.7,
      });
    }
  }

  /**
   * Emits continuous radiant heat zone embers rising from active oven holes
   */
  public emitHeatZoneSparks(pos: THREE.Vector3, count = 3) {
    for (let i = 0; i < count; i++) {
      const geom = new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 5, 5);
      const color = Math.random() > 0.4 ? 0xf97316 : (Math.random() > 0.5 ? 0xfbbf24 : 0xef4444);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(pos);
      mesh.position.x += (Math.random() - 0.5) * 0.7;
      mesh.position.z += (Math.random() - 0.5) * 0.7;
      mesh.position.y = 0.05;
      this.scene.add(mesh);

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.8,
          2.2 + Math.random() * 1.8,
          (Math.random() - 0.5) * 0.8
        ),
        rotVelocity: new THREE.Vector3(Math.random() * 4, Math.random() * 4, 0),
        gravity: -1.2, // Floats upward like real oven heat embers
        life: 0,
        maxLife: 0.6 + Math.random() * 0.4,
        scaleDelta: -0.4,
      });
    }
  }

  public update(delta: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += delta;

      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        if (Array.isArray(p.mesh.material)) {
          p.mesh.material.forEach((m) => m.dispose());
        } else {
          p.mesh.material.dispose();
        }
        this.particles.splice(i, 1);
        continue;
      }

      // Physics integration
      p.velocity.y -= p.gravity * delta;
      p.mesh.position.addScaledVector(p.velocity, delta);
      p.mesh.rotation.x += p.rotVelocity.x * delta;
      p.mesh.rotation.y += p.rotVelocity.y * delta;
      p.mesh.rotation.z += p.rotVelocity.z * delta;

      // Scale delta
      const scaleMult = Math.max(0.01, 1 + p.scaleDelta * delta);
      p.mesh.scale.multiplyScalar(scaleMult);

      // Fade out
      const remainingLife = 1 - p.life / p.maxLife;
      if (p.mesh.material instanceof THREE.Material && 'opacity' in p.mesh.material) {
        (p.mesh.material as any).opacity = Math.max(0, remainingLife);
      }
    }
  }

  public cleanup() {
    this.particles.forEach((p) => {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
    });
    this.particles = [];
  }
}
