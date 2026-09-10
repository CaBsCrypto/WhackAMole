import * as THREE from 'three';
import { HammerItem } from '../../types';

export class HammerController {
  public group: THREE.Group;
  public targetPos: THREE.Vector3 = new THREE.Vector3(0, 2, 0);
  public currentPos: THREE.Vector3 = new THREE.Vector3(0, 2, 0);
  public isSwinging: boolean = false;
  private prevPos: THREE.Vector3 = new THREE.Vector3(0, 2, 0);
  private currentTiltX: number = 0;
  private currentTiltZ: number = 0;
  private swingStartTime: number = 0;
  private swingDuration: number = 220; // ms
  private baseRotation = new THREE.Euler(0.38, -0.35, 0.18);
  private hammerMesh: THREE.Group | null = null;
  private rollerMesh: THREE.Mesh | null = null;
  private light: THREE.PointLight | null = null;
  private currentHammer: HammerItem | null = null;
  private ribbonMesh: THREE.Mesh | null = null;
  private ribbonGeom: THREE.BufferGeometry | null = null;
  private ribbonPosAttr: THREE.BufferAttribute | null = null;
  private ribbonPositions = new Float32Array(10 * 3); // 5 arc points (inner & outer) = 10 vertices

  constructor() {
    this.group = new THREE.Group();
    this.group.position.set(0, 2, 0);
    this.prevPos.set(0, 2, 0);
  }

  public setHammer(hammer: HammerItem) {
    this.currentHammer = hammer;
    this.rollerMesh = null;

    // Clear old mesh
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }

    const mesh = this.buildHammerMesh(hammer);
    this.hammerMesh = mesh;
    this.group.add(mesh);

    // Optional Point Light on hammer for night/dark modes & glow
    if (hammer.glowColor) {
      this.light = new THREE.PointLight(hammer.glowColor, 2, 4);
      this.light.position.set(0, 0.4, 0);
      this.group.add(this.light);
    }

    // Initialize 4-segment swing arc ribbon mesh
    this.initRibbonMesh(hammer);
  }

  private initRibbonMesh(hammer: HammerItem) {
    const geom = new THREE.BufferGeometry();
    this.ribbonPositions.fill(0);
    const posAttr = new THREE.BufferAttribute(this.ribbonPositions, 3);
    geom.setAttribute('position', posAttr);
    this.ribbonPosAttr = posAttr;

    const indices: number[] = [];
    for (let i = 0; i < 4; i++) {
      const p0 = i * 2;
      const p1 = i * 2 + 1;
      const p2 = (i + 1) * 2;
      const p3 = (i + 1) * 2 + 1;
      indices.push(p0, p1, p2);
      indices.push(p1, p3, p2);
    }
    geom.setIndex(indices);
    this.ribbonGeom = geom;

    const trailColor = hammer.glowColor ? new THREE.Color(hammer.glowColor) : new THREE.Color(0xffffff);
    const mat = new THREE.MeshBasicMaterial({
      color: trailColor,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.visible = false;
    this.ribbonMesh = mesh;
    this.group.add(mesh);
  }

  private buildHammerMesh(hammer: HammerItem): THREE.Group {
    const group = new THREE.Group();

    const headColor = new THREE.Color(hammer.color);
    const handleColor = new THREE.Color(hammer.handleColor);

    if (hammer.headShape === 'uslero' || hammer.headShape === 'cylinder' || !hammer.headShape) {
      // =========================================================================
      // --- AUTHENTIC ITALIAN USLERO (GRAN RODILLO DE AMASAR DE LA NONNA) ---
      // =========================================================================
      const usleroGroup = new THREE.Group();

      // 1. Central Solid Roller Barrel
      // Length: 2.3, Radius: 0.33
      const barrelGeom = new THREE.CylinderGeometry(0.33, 0.33, 2.3, 32);

      let barrelRoughness = 0.45;
      let barrelMetalness = 0.05;
      let barrelEmissive = 0x000000;
      let barrelEmissiveIntensity = 0;

      if (hammer.color === '#f8fafc') {
        // Carrara Marble Uslero
        barrelRoughness = 0.12;
        barrelMetalness = 0.15;
      } else if (hammer.color === '#1c1917') {
        // Volcanic Basalt Uslero from Mt. Vesuvius
        barrelRoughness = 0.38;
        barrelMetalness = 0.35;
        barrelEmissive = 0xea580c;
        barrelEmissiveIntensity = 0.55;
      } else if (hammer.color === '#eab308') {
        // 24K Gold Divine Uslero
        barrelRoughness = 0.18;
        barrelMetalness = 0.92;
        barrelEmissive = 0xb45309;
        barrelEmissiveIntensity = 0.4;
      }

      const barrelMat = new THREE.MeshStandardMaterial({
        color: headColor,
        roughness: barrelRoughness,
        metalness: barrelMetalness,
        emissive: barrelEmissive,
        emissiveIntensity: barrelEmissiveIntensity,
      });

      const barrelMesh = new THREE.Mesh(barrelGeom, barrelMat);
      barrelMesh.rotation.z = Math.PI / 2;
      barrelMesh.position.y = 1.35;
      barrelMesh.castShadow = true;
      this.rollerMesh = barrelMesh;
      usleroGroup.add(barrelMesh);

      // 2. Beveled Lathe-Turned Barrel Shoulders
      const shoulderGeom = new THREE.CylinderGeometry(0.33, 0.2, 0.18, 24);
      [-1.24, 1.24].forEach((xPos, idx) => {
        const shoulder = new THREE.Mesh(shoulderGeom, barrelMat);
        shoulder.rotation.z = idx === 0 ? -Math.PI / 2 : Math.PI / 2;
        shoulder.position.set(xPos, 1.35, 0);
        usleroGroup.add(shoulder);
      });

      // 3. Polished Brass Ferrule Collar Rings
      const brassMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.92,
        roughness: 0.2,
        emissive: 0x78350f,
        emissiveIntensity: 0.25,
      });

      [-1.34, -0.68, 0.68, 1.34].forEach((xPos) => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.336, 0.02, 8, 24), brassMat);
        ring.rotation.y = Math.PI / 2;
        ring.position.set(xPos, 1.35, 0);
        usleroGroup.add(ring);
      });

      // 4. Artisanal Flour Dust Rings (Realistic white dusted patches)
      const flourMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.98,
        transparent: true,
        opacity: 0.85,
      });
      [-0.44, 0.0, 0.44].forEach((xPos) => {
        const flourRing = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.022, 6, 24), flourMat);
        flourRing.rotation.y = Math.PI / 2;
        flourRing.position.set(xPos, 1.35, 0);
        usleroGroup.add(flourRing);
      });

      // 5. Central Brass Italian Seal Medallion ("NONNA D.O.P.")
      const sealGroup = new THREE.Group();
      sealGroup.position.set(0, 1.35, 0.33);

      const sealPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.03, 20), brassMat);
      sealPlate.rotation.x = Math.PI / 2;
      sealGroup.add(sealPlate);

      // Star / Crest emblem in medallion center
      const crestMesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.08, 0),
        new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8, roughness: 0.25 })
      );
      crestMesh.position.z = 0.025;
      sealGroup.add(crestMesh);

      usleroGroup.add(sealGroup);

      // 6. Italian Tricolor Ribbon accent band near the seal
      const ribbonGreen = new THREE.Mesh(
        new THREE.TorusGeometry(0.338, 0.014, 6, 24),
        new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5 })
      );
      ribbonGreen.rotation.y = Math.PI / 2;
      ribbonGreen.position.set(-0.16, 1.35, 0);
      usleroGroup.add(ribbonGreen);

      const ribbonWhite = new THREE.Mesh(
        new THREE.TorusGeometry(0.338, 0.014, 6, 24),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 })
      );
      ribbonWhite.rotation.y = Math.PI / 2;
      ribbonWhite.position.set(-0.2, 1.35, 0);
      usleroGroup.add(ribbonWhite);

      const ribbonRed = new THREE.Mesh(
        new THREE.TorusGeometry(0.338, 0.014, 6, 24),
        new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 })
      );
      ribbonRed.rotation.y = Math.PI / 2;
      ribbonRed.position.set(-0.24, 1.35, 0);
      usleroGroup.add(ribbonRed);

      // 7. Dual Ergonomic Lathe-Turned Side Handles (Mangos tallados de haya)
      const handleMat = new THREE.MeshStandardMaterial({
        color: handleColor,
        roughness: 0.45,
        metalness: hammer.specialEffect === 'golden_touch' ? 0.85 : 0.05,
      });

      [-1, 1].forEach((dir) => {
        // Spindle neck
        const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.22, 16), handleMat);
        spindle.rotation.z = Math.PI / 2;
        spindle.position.set(dir * 1.44, 1.35, 0);
        usleroGroup.add(spindle);

        // Ergonomic sculpted palm grip bulge
        const gripBulge = new THREE.Mesh(new THREE.SphereGeometry(0.125, 16, 12), handleMat);
        gripBulge.scale.set(1.5, 0.95, 0.95);
        gripBulge.position.set(dir * 1.64, 1.35, 0);
        usleroGroup.add(gripBulge);

        // Outer grip shaft
        const outerShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.22, 16), handleMat);
        outerShaft.rotation.z = Math.PI / 2;
        outerShaft.position.set(dir * 1.82, 1.35, 0);
        usleroGroup.add(outerShaft);

        // Polished brass rounded finial pommel cap
        const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.095, 14, 12), brassMat);
        pommel.position.set(dir * 1.95, 1.35, 0);
        usleroGroup.add(pommel);
      });

      // 8. Nonna's Gingham Tea Towel (Paño de cocina a cuadros atado al mango derecho)
      const towelGroup = new THREE.Group();
      towelGroup.position.set(1.48, 1.35, 0);

      // Towel Knot Ring
      const towelKnotMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.8 });
      const towelKnot = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.045, 8, 16), towelKnotMat);
      towelKnot.rotation.y = Math.PI / 2;
      towelGroup.add(towelKnot);

      // White checker contrast ring
      const towelWhiteRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.135, 0.02, 6, 16),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 })
      );
      towelWhiteRing.rotation.y = Math.PI / 2;
      towelGroup.add(towelWhiteRing);

      // Hanging Draped Cloth flap
      const flapGeom = new THREE.BoxGeometry(0.12, 0.52, 0.03);
      const flapRed = new THREE.Mesh(flapGeom, towelKnotMat);
      flapRed.position.set(0.04, -0.28, 0.08);
      flapRed.rotation.z = -0.15;
      flapRed.rotation.x = 0.2;
      towelGroup.add(flapRed);

      // White folded trim on towel flap
      const flapWhite = new THREE.Mesh(
        new THREE.BoxGeometry(0.13, 0.12, 0.035),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 })
      );
      flapWhite.position.set(0.04, -0.48, 0.09);
      flapWhite.rotation.z = -0.15;
      flapWhite.rotation.x = 0.2;
      towelGroup.add(flapWhite);

      usleroGroup.add(towelGroup);

      // 9. Floating Flour Motes around the uslero
      const moteMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65 });
      [
        { x: -0.8, y: 1.6, z: 0.2 },
        { x: -0.3, y: 1.1, z: -0.2 },
        { x: 0.5, y: 1.7, z: 0.15 },
        { x: 0.9, y: 1.2, z: 0.3 },
      ].forEach((motePos) => {
        const mote = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), moteMat);
        mote.position.set(motePos.x, motePos.y, motePos.z);
        usleroGroup.add(mote);
      });

      group.add(usleroGroup);
    } else if (hammer.headShape === 'cyber') {
      // --- 2. ROTATING PIZZA CUTTER WHEEL (Cortapizzas de Acero) ---
      // Long ergonomic chef handle
      const handleGeom = new THREE.CylinderGeometry(0.07, 0.08, 1.5, 14);
      const handleMat = new THREE.MeshStandardMaterial({
        color: handleColor,
        roughness: 0.3,
        metalness: 0.2,
      });
      const handleMesh = new THREE.Mesh(handleGeom, handleMat);
      handleMesh.position.y = 0.6;
      handleMesh.castShadow = true;
      group.add(handleMesh);

      // Safety finger guard plate
      const guardGeom = new THREE.BoxGeometry(0.35, 0.06, 0.22);
      const guardMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
      const guard = new THREE.Mesh(guardGeom, guardMat);
      guard.position.set(0, 1.3, 0);
      group.add(guard);

      // Steel arched fork bracket
      const forkGeom = new THREE.BoxGeometry(0.06, 0.45, 0.15);
      const forkMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.15 });
      const fork = new THREE.Mesh(forkGeom, forkMat);
      fork.position.set(0, 1.5, 0);
      group.add(fork);

      // Stainless circular cutter wheel disc
      const bladeGeom = new THREE.CylinderGeometry(0.55, 0.55, 0.03, 32);
      const bladeMat = new THREE.MeshStandardMaterial({
        color: headColor,
        metalness: 0.98,
        roughness: 0.1,
        emissive: hammer.glowColor ? new THREE.Color(hammer.glowColor) : new THREE.Color(0x000000),
        emissiveIntensity: hammer.glowColor ? 0.4 : 0,
      });
      const blade = new THREE.Mesh(bladeGeom, bladeMat);
      blade.rotation.z = Math.PI / 2;
      blade.position.set(0, 1.7, 0);
      blade.castShadow = true;
      group.add(blade);

      // Center axle bolt & bevel edge
      const axleGeom = new THREE.SphereGeometry(0.1, 12, 10);
      const axle = new THREE.Mesh(axleGeom, guardMat);
      axle.position.set(0, 1.7, 0);
      group.add(axle);

      // Glowing Neon Cutting Rim
      const cuttingRimGeom = new THREE.TorusGeometry(0.55, 0.025, 8, 32);
      const cuttingRimMat = new THREE.MeshBasicMaterial({ color: hammer.glowColor || 0x38bdf8 });
      const cuttingRim = new THREE.Mesh(cuttingRimGeom, cuttingRimMat);
      cuttingRim.rotation.y = Math.PI / 2;
      cuttingRim.position.set(0, 1.7, 0);
      group.add(cuttingRim);
    } else if (hammer.headShape === 'warhammer' || hammer.headShape === 'cube') {
      // --- 3. STONE OVEN PIZZA PEEL (Pala Gigante de Horno) ---
      // Long Baker Wooden Handle
      const handleGeom = new THREE.CylinderGeometry(0.06, 0.08, 1.7, 14);
      const handleMat = new THREE.MeshStandardMaterial({ color: handleColor, roughness: 0.7 });
      const handleMesh = new THREE.Mesh(handleGeom, handleMat);
      handleMesh.position.y = 0.6;
      handleMesh.castShadow = true;
      group.add(handleMesh);

      // Riveted metal ferrule connector
      const ferruleGeom = new THREE.CylinderGeometry(0.09, 0.09, 0.2, 12);
      const ferruleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.2 });
      const ferrule = new THREE.Mesh(ferruleGeom, ferruleMat);
      ferrule.position.y = 1.35;
      group.add(ferrule);

      // Wide flat Pizza Peel shovel paddle
      const isMetal = hammer.id.includes('gold') || hammer.id.includes('cyber') || hammer.id.includes('steel') || hammer.id.includes('mecha');
      const paddleGeom = new THREE.BoxGeometry(1.2, 0.06, 1.0);
      const paddleMat = new THREE.MeshStandardMaterial({
        color: headColor,
        roughness: isMetal ? 0.25 : 0.6,
        metalness: isMetal ? 0.85 : 0.1,
        emissive: hammer.glowColor ? new THREE.Color(hammer.glowColor) : new THREE.Color(0x000000),
        emissiveIntensity: hammer.glowColor ? 0.35 : 0,
      });
      const paddle = new THREE.Mesh(paddleGeom, paddleMat);
      paddle.position.set(0, 1.75, 0);
      paddle.castShadow = true;
      group.add(paddle);

      // Tapered beveled leading lip of the paddle
      const lipGeom = new THREE.ConeGeometry(0.6, 0.25, 4);
      const lipMesh = new THREE.Mesh(lipGeom, paddleMat);
      lipMesh.rotation.y = Math.PI / 4;
      lipMesh.rotation.x = Math.PI / 2;
      lipMesh.position.set(0, 2.25, 0);
      lipMesh.scale.set(1.4, 0.1, 1.0);
      group.add(lipMesh);
    } else if (hammer.headShape === 'magma') {
      // --- 4. GOURMET MEAT & DOUGH TENDERIZER (Ablandador Gourmet) ---
      const handleGeom = new THREE.CylinderGeometry(0.06, 0.08, 1.6, 14);
      const handleMat = new THREE.MeshStandardMaterial({ color: handleColor, roughness: 0.6 });
      const handleMesh = new THREE.Mesh(handleGeom, handleMat);
      handleMesh.position.y = 0.6;
      handleMesh.castShadow = true;
      group.add(handleMesh);

      // Heavy Tenderizer Head Block
      const headGeom = new THREE.BoxGeometry(1.1, 0.65, 0.65);
      const headMat = new THREE.MeshStandardMaterial({
        color: headColor,
        roughness: 0.3,
        metalness: 0.8,
        emissive: hammer.glowColor ? new THREE.Color(hammer.glowColor) : new THREE.Color(0x000000),
        emissiveIntensity: 0.4,
      });
      const headMesh = new THREE.Mesh(headGeom, headMat);
      headMesh.position.y = 1.45;
      headMesh.castShadow = true;
      group.add(headMesh);

      // Spiked pyramidal teeth on both faces
      [-0.58, 0.58].forEach((xPos, sideIdx) => {
        const spikeGroup = new THREE.Group();
        for (let r = -1; r <= 1; r++) {
          for (let c = -1; c <= 1; c++) {
            const spike = new THREE.Mesh(
              new THREE.ConeGeometry(0.06, 0.12, 4),
              new THREE.MeshStandardMaterial({ color: 0xffedd5, metalness: 0.9, roughness: 0.1 })
            );
            spike.rotation.z = sideIdx === 0 ? Math.PI / 2 : -Math.PI / 2;
            spike.position.set(xPos, 1.45 + r * 0.18, c * 0.18);
            spikeGroup.add(spike);
          }
        }
        group.add(spikeGroup);
      });
    } else {
      // --- 5. RADIANT CHEESE SPATULA & ASTRAL UTENSIL ---
      const handleGeom = new THREE.CylinderGeometry(0.06, 0.08, 1.5, 14);
      const handleMat = new THREE.MeshStandardMaterial({ color: handleColor, roughness: 0.5 });
      const handleMesh = new THREE.Mesh(handleGeom, handleMat);
      handleMesh.position.y = 0.6;
      group.add(handleMesh);

      const spatulaGeom = new THREE.BoxGeometry(0.85, 0.05, 1.1);
      const spatulaMat = new THREE.MeshStandardMaterial({
        color: headColor,
        roughness: 0.2,
        metalness: 0.85,
        emissive: hammer.glowColor ? new THREE.Color(hammer.glowColor) : new THREE.Color(0x000000),
        emissiveIntensity: 0.5,
      });
      const spatula = new THREE.Mesh(spatulaGeom, spatulaMat);
      spatula.position.set(0, 1.6, 0);
      spatula.castShadow = true;
      group.add(spatula);

      // Cheese Drip Droplets
      const dripGeom = new THREE.SphereGeometry(0.08, 8, 8);
      const dripMat = new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0xfacc15, emissiveIntensity: 0.6 });
      [-0.25, 0, 0.25].forEach((xPos, idx) => {
        const drip = new THREE.Mesh(dripGeom, dripMat);
        drip.position.set(xPos, 1.55 - idx * 0.04, 0.55);
        drip.scale.set(0.8, 1.4, 0.8);
        group.add(drip);
      });
    }

    group.rotation.set(this.baseRotation.x, this.baseRotation.y, this.baseRotation.z);
    return group;
  }

  public setTarget(pos: THREE.Vector3) {
    this.targetPos.copy(pos);
  }

  public triggerSwing() {
    this.isSwinging = true;
    this.swingStartTime = performance.now();
  }

  public swingAt(target: THREE.Vector3, isTouch = false) {
    this.targetPos.copy(target);
    this.isSwinging = true;
    this.swingStartTime = performance.now();

    if (isTouch) {
      const dist = this.currentPos.distanceTo(target);
      if (dist > 0.8) {
        // Fluid mobile swoop: Bring hammer directly into high striking arc above tapped position
        this.currentPos.set(
          target.x - (target.x - this.currentPos.x) * 0.18,
          target.y + 0.65,
          target.z - (target.z - this.currentPos.z) * 0.18
        );
      }
    } else {
      const dist = this.currentPos.distanceTo(target);
      if (dist > 1.8) {
        this.currentPos.lerp(target, 0.45);
      }
    }
  }

  public update(delta: number) {
    const dt = Math.max(0.001, Math.min(delta, 0.05));

    // 1. Frame-rate independent exponential smoothing (snappy on fast taps / touch, smooth glide when hovering)
    const dist = this.currentPos.distanceTo(this.targetPos);
    const followSpeed = this.isSwinging ? 36 : dist > 2.0 ? 30 : 22;
    const alpha = 1 - Math.exp(-followSpeed * dt);
    this.currentPos.lerp(this.targetPos, alpha);
    this.group.position.copy(this.currentPos);

    // 2. Dynamic Motion Tilt & Banking (organic physical weight as finger or mouse moves)
    const vx = (this.currentPos.x - this.prevPos.x) / dt;
    const vz = (this.currentPos.z - this.prevPos.z) / dt;
    this.prevPos.copy(this.currentPos);

    const targetTiltZ = THREE.MathUtils.clamp(-vx * 0.042, -0.28, 0.28);
    const targetTiltX = THREE.MathUtils.clamp(vz * 0.035, -0.22, 0.22);
    this.currentTiltZ = THREE.MathUtils.lerp(this.currentTiltZ, targetTiltZ, 1 - Math.exp(-16 * dt));
    this.currentTiltX = THREE.MathUtils.lerp(this.currentTiltX, targetTiltX, 1 - Math.exp(-16 * dt));

    // 3. Swing Physics
    if (this.isSwinging && this.hammerMesh) {
      const elapsed = performance.now() - this.swingStartTime;
      const progress = elapsed / this.swingDuration;

      // Dynamic barrel roll rotation around longitudinal axis during swing
      if (this.rollerMesh) {
        this.rollerMesh.rotation.x += dt * 30;
      }

      if (progress >= 1) {
        this.isSwinging = false;
        this.hammerMesh.rotation.set(this.baseRotation.x, this.baseRotation.y, this.baseRotation.z);
        this.hammerMesh.position.set(0, 0, 0);
        this.hammerMesh.scale.set(1, 1, 1);
        if (this.ribbonMesh) {
          this.ribbonMesh.visible = false;
        }
        this.group.rotation.set(
          this.baseRotation.x + this.currentTiltX,
          this.baseRotation.y,
          this.baseRotation.z + this.currentTiltZ
        );
      } else {
        // Swing curve: rapid windup -> fast downward strike -> spring bounce
        if (progress < 0.4) {
          // Downward smash phase (0 -> 1)
          const p = progress / 0.4;
          const smashRotX = this.baseRotation.x - p * 1.6;
          this.hammerMesh.rotation.x = smashRotX;
          this.hammerMesh.position.y = -p * 0.45;

          // Milestone 2 (F7): Hammer swing velocity stretch (Sy=1.25 during strike)
          const stretch = THREE.MathUtils.lerp(1.0, 1.25, Math.sin(p * Math.PI));
          const sxz = 1 / Math.sqrt(stretch);
          this.hammerMesh.scale.set(sxz, stretch, sxz);
        } else {
          // Elastic spring recoil phase
          const p = (progress - 0.4) / 0.6;
          const bounce = Math.sin(p * Math.PI * 2) * (1 - p) * 0.4;
          this.hammerMesh.rotation.x = this.baseRotation.x + bounce;
          this.hammerMesh.position.y = bounce * 0.3;

          // Milestone 2 (F7): Hammer impact compression (Sy=0.80 on impact) settling back to 1.0
          const impactSquash = THREE.MathUtils.lerp(0.80, 1.0, Math.min(1, p * 2.2));
          const sxz = 1 / Math.sqrt(impactSquash);
          this.hammerMesh.scale.set(sxz, impactSquash, sxz);
        }

        // Milestone 2 (F7): 4-segment swing arc ribbon mesh for subtle motion blur
        if (this.ribbonMesh && this.ribbonPosAttr) {
          if (progress < 0.6) {
            this.ribbonMesh.visible = true;
            const currentRotX = this.hammerMesh.rotation.x;
            const arcSpan = 0.95 * Math.sin(Math.min(1, progress / 0.4) * Math.PI);
            const py = this.hammerMesh.position.y;

            for (let k = 0; k < 5; k++) {
              const trailAngle = currentRotX + (k / 4) * arcSpan;
              const cosA = Math.cos(trailAngle);
              const sinA = Math.sin(trailAngle);

              // Inner edge of roller arc
              this.ribbonPositions[k * 6 + 0] = 0;
              this.ribbonPositions[k * 6 + 1] = py + 0.95 * cosA;
              this.ribbonPositions[k * 6 + 2] = -0.95 * sinA;

              // Outer edge of roller arc
              this.ribbonPositions[k * 6 + 3] = 0;
              this.ribbonPositions[k * 6 + 4] = py + 1.55 * cosA;
              this.ribbonPositions[k * 6 + 5] = -1.55 * sinA;
            }

            this.ribbonPosAttr.needsUpdate = true;
            if (this.ribbonMesh.material instanceof THREE.MeshBasicMaterial) {
              this.ribbonMesh.material.opacity = Math.sin(Math.min(1, progress / 0.5) * Math.PI) * 0.4;
            }
          } else {
            this.ribbonMesh.visible = false;
          }
        }

        // Apply subtle motion tilt during swing for natural feel
        this.group.rotation.set(
          this.baseRotation.x + this.currentTiltX * 0.25,
          this.baseRotation.y,
          this.baseRotation.z + this.currentTiltZ * 0.25
        );
      }
    } else if (this.hammerMesh) {
      this.hammerMesh.scale.set(1, 1, 1);
      if (this.ribbonMesh) {
        this.ribbonMesh.visible = false;
      }
      // Idle chef posture: subtle gentle breathing sway + motion tilt
      const time = performance.now() * 0.003;
      this.hammerMesh.position.y = Math.sin(time) * 0.025;
      this.hammerMesh.position.x = Math.cos(time * 0.7) * 0.015;

      this.group.rotation.set(
        this.baseRotation.x + this.currentTiltX,
        this.baseRotation.y,
        this.baseRotation.z + this.currentTiltZ
      );

      // Animate floating flour motes
      this.hammerMesh.traverse((child) => {
        if (child.name === 'flour_mote') {
          child.position.y += Math.sin(time * 2 + child.position.x) * 0.001;
        }
      });
    }
  }
}
