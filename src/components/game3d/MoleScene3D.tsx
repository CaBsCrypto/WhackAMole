import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { MoleData, HammerItem, GameTheme, FloatingText, MoleType } from '../../types';
import { createHoleMesh, createMoleMesh, updateMole3DHealth } from './Mole3DModels';
import { HammerController } from './Hammer3D';
import { ParticleManager } from './ParticleEffects';
import { MoleParticleCanvas, MoleParticleCanvasRef } from './MoleParticleCanvas';
import { sfx } from '../../services/sfx';

export interface TauntBubble {
  id: string;
  holeIndex: number;
  moleId: string;
  text: string;
  icon?: string;
  type: MoleType;
  xPercent: number;
  yPercent: number;
  isHit?: boolean;
  createdAt: number;
}

export interface MoleMeshItem {
  mesh: THREE.Group;
  mole: MoleData;
  animProgress: number;
  retreated?: boolean;
  recoilStartTime?: number;
  recoilDuration?: number;
}

// Random taunt messages shown when moles spawn
const GENERAL_TAUNTS = [
  'Try and catch me!',
  'Pizza thief!',
  'Slowpoke!',
  'Too slow, chef!',
  'Yoink! My slice!',
  'Can\'t touch this!',
  'Whack me if you can!',
  'Missed me!',
  'Hands off the dough!',
  'Dough you want some?',
  'Saucy moves!',
  'Catch me if you dough!',
  'Mamma Mia!',
  'Slice snatcher!',
  'Not on my crust!',
];

const TYPE_SPECIFIC_TAUNTS: Record<MoleType, string[]> = {
  fast: [
    'Speedy slice!',
    'Too fast for ya!',
    'Zoom zoom!',
    'Blink and I\'m gone!',
    'Catch my dust!',
  ],
  bomb: [
    'Don\'t touch!',
    'Tick... tick...',
    'Touch me and BOOM!',
    'Spicy surprise!',
    'Careful with that hammer!',
  ],
  standard: [
    'Try and catch me!',
    'Pizza thief!',
    'Slowpoke!',
    'Too slow, chef!',
    'Yoink! My slice!',
  ],
};

function getMoleIcon(type: MoleType): string {
  switch (type) {
    case 'fast':
      return '⚡';
    case 'bomb':
      return '💣';
    case 'standard':
    default:
      return '🍕';
  }
}


function getRandomTaunt(type: MoleType): string {
  const specific = TYPE_SPECIFIC_TAUNTS[type] || [];
  // 50% chance of type-specific taunt, 50% chance of general taunt (guaranteeing 'Try and catch me!', 'Pizza thief!', 'Slowpoke!')
  if (specific.length > 0 && Math.random() < 0.5) {
    return specific[Math.floor(Math.random() * specific.length)];
  }
  return GENERAL_TAUNTS[Math.floor(Math.random() * GENERAL_TAUNTS.length)];
}

interface MoleScene3DProps {
  moles: MoleData[];
  selectedHammer: HammerItem;
  theme: GameTheme;
  frenzyActive: boolean;
  pizzaOvenActive?: boolean;
  kitchenDisasterActive?: boolean;
  disasterTimeRemaining?: number;
  onHitHole: (holeIndex: number, clientX: number, clientY: number) => void;
  floatingTexts: FloatingText[];
  screenShakeTrigger?: { intensity: number; timestamp: number };
  particleExplosionTrigger?: {
    x: number;
    y: number;
    type: MoleType;
    isCrit?: boolean;
    isDefeated?: boolean;
    timestamp: number;
  } | null;
}

// 3x3 Grid Hole Coordinates in 3D Space
const HOLE_COORDS = [
  { x: -2.3, z: -2.2 }, // 0: Top-Left
  { x: 0.0, z: -2.2 },  // 1: Top-Center
  { x: 2.3, z: -2.2 },  // 2: Top-Right
  { x: -2.3, z: 0.0 },  // 3: Mid-Left
  { x: 0.0, z: 0.0 },   // 4: Mid-Center
  { x: 2.3, z: 0.0 },   // 5: Mid-Right
  { x: -2.3, z: 2.2 },  // 6: Bot-Left
  { x: 0.0, z: 2.2 },   // 7: Bot-Center
  { x: 2.3, z: 2.2 },   // 8: Bot-Right
];

export interface ResponsiveCameraConfig {
  fov: number;
  cameraPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  isPortrait: boolean;
  domeScale: THREE.Vector3;
  domePosition: THREE.Vector3;
}

/**
 * Dynamically calculates camera FOV, distance, elevation, target anchor,
 * and oven dome background position and scale for responsive viewport framing.
 * Ensures all 9 holes/dough discs are 100% visible on mobile portrait without clipping.
 */
export function computeResponsiveCameraConfig(width: number, height: number): ResponsiveCameraConfig {
  const aspect = width / height;

  if (aspect >= 1.0) {
    // Landscape / Desktop: Classic angled counter perspective
    return {
      fov: 45,
      cameraPos: new THREE.Vector3(0, 9.2, 7.8),
      targetPos: new THREE.Vector3(0, 0.2, 0),
      isPortrait: false,
      domeScale: new THREE.Vector3(1.0, 1.0, 1.0),
      domePosition: new THREE.Vector3(0, 0.4, -5.6),
    };
  }

  // Portrait / Mobile: Clean tilted aerial view centered 100% on 3x3 board
  const elevationRad = THREE.MathUtils.degToRad(62); // 62° clean tilted aerial perspective
  const fov = 48; // Clean perspective without edge distortion
  const halfFovRad = THREE.MathUtils.degToRad(fov / 2);
  const targetBoardHalfWidth = 4.25; // Accommodates holes at x=±2.3 plus 1.12 dough disc + margin

  // D * tan(halfFov) * aspect = targetBoardHalfWidth
  const distance = Math.max(12.0, Math.min(22.0, targetBoardHalfWidth / (aspect * Math.tan(halfFovRad))));

  const targetPos = new THREE.Vector3(0, 0.1, 0);
  const cameraPos = new THREE.Vector3(
    0,
    targetPos.y + distance * Math.sin(elevationRad),
    targetPos.z + distance * Math.cos(elevationRad)
  );

  return {
    fov,
    cameraPos,
    targetPos,
    isPortrait: true,
    domeScale: new THREE.Vector3(0.72, 0.72, 0.72),
    domePosition: new THREE.Vector3(0, -0.15, -6.8),
  };
}

export interface MoleScene3DRef {
  setGestureCursor: (ndcX: number, ndcY: number) => void;
  triggerGestureWhack: (ndcX: number, ndcY: number, clientX: number, clientY: number) => number;
  setGestureActive: (active: boolean) => void;
}

export const MoleScene3D = forwardRef<MoleScene3DRef, MoleScene3DProps>(({
  moles,
  selectedHammer,
  theme,
  frenzyActive,
  pizzaOvenActive = false,
  kitchenDisasterActive = false,
  disasterTimeRemaining = 10,
  onHitHole,
  floatingTexts,
  screenShakeTrigger,
  particleExplosionTrigger,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const hammerCtrlRef = useRef<HammerController | null>(null);
  const particlesRef = useRef<ParticleManager | null>(null);
  const moleMeshesRef = useRef<Map<number, MoleMeshItem>>(new Map());
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const planeIntersectRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5));
  const cameraShakeRef = useRef<{ intensity: number; decay: number }>({ intensity: 0, decay: 0.82 });
  const baseCameraPos = useRef(new THREE.Vector3(0, 9.2, 7.8));
  const targetCameraPos = useRef(new THREE.Vector3(0, 0.2, 0));
  const ovenGroupRef = useRef<THREE.Group | null>(null);
  const pizzaOvenActiveRef = useRef<boolean>(pizzaOvenActive);
  const kitchenDisasterActiveRef = useRef<boolean>(kitchenDisasterActive);
  const heatRingsRef = useRef<THREE.Mesh[]>([]);
  const ovenFireLightRef = useRef<THREE.PointLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const emergencyStrobeLightRef = useRef<THREE.PointLight | null>(null);
  const particleCanvasRef = useRef<MoleParticleCanvasRef | null>(null);
  const lastExplosionTimeRef = useRef<number>(0);

  // Speech Bubble Taunts Overlay State
  const [tauntBubbles, setTauntBubbles] = useState<TauntBubble[]>([]);

  // Project 3D Hole Coordinates to 2D Container Percentages
  const getHoleScreenPosition = useCallback((holeIndex: number, yWorld = 1.35) => {
    if (!cameraRef.current || !containerRef.current) {
      // Geometric fallback based on 3x3 layout
      return {
        xPercent: 25 + (holeIndex % 3) * 25,
        yPercent: 32 + Math.floor(holeIndex / 3) * 18,
      };
    }
    const hole = HOLE_COORDS[holeIndex];
    if (!hole) return null;

    const v = new THREE.Vector3(hole.x, yWorld, hole.z);
    v.project(cameraRef.current);

    return {
      xPercent: Math.max(5, Math.min(95, ((v.x + 1) / 2) * 100)),
      yPercent: Math.max(5, Math.min(95, ((-v.y + 1) / 2) * 100)),
    };
  }, []);

  useEffect(() => {
    pizzaOvenActiveRef.current = pizzaOvenActive;
  }, [pizzaOvenActive]);

  useEffect(() => {
    kitchenDisasterActiveRef.current = Boolean(kitchenDisasterActive);
  }, [kitchenDisasterActive]);

  // Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Set Scene Background based on Theme
    let bgColor = 0x1c1917;
    let fogColor = 0x1c1917;
    if (theme === 'garden') {
      bgColor = 0x1e3a1e;
      fogColor = 0x1e3a1e;
    } else if (theme === 'cyber') {
      bgColor = 0x020617;
      fogColor = 0x020617;
    } else if (theme === 'volcano') {
      bgColor = 0x270b0b;
      fogColor = 0x270b0b;
    }

    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.FogExp2(fogColor, 0.04);

    // 2. Camera setup with dynamic responsive configuration
    const config = computeResponsiveCameraConfig(width, height);
    baseCameraPos.current.copy(config.cameraPos);
    targetCameraPos.current.copy(config.targetPos);

    const camera = new THREE.PerspectiveCamera(config.fov, width / height, 0.1, 100);
    camera.position.copy(config.cameraPos);
    camera.lookAt(config.targetPos);
    cameraRef.current = camera;

    // 3. Renderer - Optimized pixel ratio (max 1.25 on mobile to avoid 4K texture overdraw & GPU lag)
    const isMobileDevice = width < 768 || window.innerWidth < 768;
    const maxDpr = isMobileDevice ? 1.25 : 1.75;
    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobileDevice,
      alpha: false,
      powerPreference: 'high-performance',
      precision: isMobileDevice ? 'mediump' : 'highp',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.shadowMap.enabled = !isMobileDevice; // Disable heavy real-time shadow passes on mobile for zero-lag
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.4);
    dirLight.position.set(5, 12, 6);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 25;
    dirLight.shadow.camera.left = -6;
    dirLight.shadow.camera.right = 6;
    dirLight.shadow.camera.top = 6;
    dirLight.shadow.camera.bottom = -6;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    // Colored rim light for 3D arcade pop
    const rimLight = new THREE.DirectionalLight(theme === 'cyber' ? 0x06b6d4 : 0xf59e0b, 0.6);
    rimLight.position.set(-6, 8, -4);
    scene.add(rimLight);

    // Red Emergency Strobe Alarm Light for Kitchen Disaster Event
    const emergencyStrobeLight = new THREE.PointLight(0xff1122, 0, 16, 1.2);
    emergencyStrobeLight.position.set(0, 5.5, 0);
    scene.add(emergencyStrobeLight);
    emergencyStrobeLightRef.current = emergencyStrobeLight;

    // 5. Ground Arena / Table Platform (Italian Pizzeria Countertop)
    const tableGeom = new THREE.CylinderGeometry(4.8, 5.2, 0.6, 32);
    let tableColor = 0x92400e; // Warm rustic Italian mahogany kitchen prep counter
    let tableRoughness = 0.75;
    let tableMetal = 0.1;

    if (theme === 'cyber') {
      tableColor = 0x0f172a;
      tableRoughness = 0.3;
      tableMetal = 0.7;
    } else if (theme === 'volcano') {
      tableColor = 0x450a0a; // Charred brick pizza oven stone
      tableRoughness = 0.7;
      tableMetal = 0.2;
    } else if (theme === 'arcade') {
      tableColor = 0x78350f;
      tableRoughness = 0.5;
      tableMetal = 0.1;
    }

    const tableMat = new THREE.MeshStandardMaterial({
      color: tableColor,
      roughness: tableRoughness,
      metalness: tableMetal,
    });
    const tableMesh = new THREE.Mesh(tableGeom, tableMat);
    tableMesh.position.y = -0.3;
    tableMesh.receiveShadow = true;
    scene.add(tableMesh);

    // Table Flour Dust Patches (Translucent white flour spots across the chef table)
    const flourMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
    [
      { x: -1.2, z: 0.5, r: 0.4 },
      { x: 1.4, z: -0.8, r: 0.5 },
      { x: 0.2, z: -1.5, r: 0.35 },
      { x: -1.5, z: -1.2, r: 0.45 },
      { x: 1.8, z: 1.2, r: 0.38 },
    ].forEach((f) => {
      const flourPatch = new THREE.Mesh(new THREE.CircleGeometry(f.r, 16), flourMat);
      flourPatch.rotation.x = -Math.PI / 2;
      flourPatch.position.set(f.x, 0.01, f.z);
      scene.add(flourPatch);
    });

    // Kitchen Counter Perimeter Decorative Props (Cherry tomatoes & Fresh basil)
    const tomatoMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.25, metalness: 0.1 });
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
    [
      { x: -3.8, z: 1.5 },
      { x: -3.6, z: 1.8 },
      { x: 3.6, z: -1.8 },
      { x: 3.9, z: -1.5 },
    ].forEach((pos) => {
      const tomato = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), tomatoMat);
      tomato.position.set(pos.x, 0.12, pos.z);
      tomato.castShadow = true;
      scene.add(tomato);

      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.06, 6), stemMat);
      stem.position.set(pos.x, 0.22, pos.z);
      scene.add(stem);
    });

    // Table Wooden/Italian Tricolor Bevel Rim
    const rimGeom = new THREE.TorusGeometry(4.85, 0.16, 12, 40);
    const rimMat = new THREE.MeshStandardMaterial({
      color: theme === 'cyber' ? 0x22d3ee : (theme === 'volcano' ? 0xef4444 : 0xb45309),
      metalness: theme === 'cyber' ? 0.9 : 0.2,
      roughness: 0.3,
      emissive: theme === 'cyber' ? 0x0891b2 : 0x000000,
      emissiveIntensity: theme === 'cyber' ? 0.5 : 0,
    });
    const tableRimMesh = new THREE.Mesh(rimGeom, rimMat);
    tableRimMesh.rotation.x = Math.PI / 2;
    tableRimMesh.position.y = 0.02;
    scene.add(tableRimMesh);

    // =========================================================================
    // PIZZERIA NAPOLITANA 3D SCENERY & AMBIENCE (Horno de Leña, Harina, Aceite)
    // =========================================================================
    const pizzeriaEnvGroup = new THREE.Group();
    pizzeriaEnvGroup.name = 'pizzeria_environment';

    // 1. NAPOLITAN WOOD-FIRED STONE PIZZA OVEN (Horno a la Leña Artesanal)
    const ovenGroup = new THREE.Group();
    ovenGroup.name = 'oven_group';
    ovenGroupRef.current = ovenGroup;
    ovenGroup.position.copy(config.domePosition);
    ovenGroup.scale.copy(config.domeScale);

    // Oven Terracotta & Dark Basalt Stone Dome
    const ovenDomeGeom = new THREE.SphereGeometry(2.3, 24, 16, 0, Math.PI * 2, 0, Math.PI / 1.7);
    const ovenDomeMat = new THREE.MeshStandardMaterial({
      color: theme === 'volcano' ? 0x262626 : (theme === 'cyber' ? 0x0f172a : 0x7c2d12), // Rustic terracotta red
      roughness: 0.85,
      metalness: 0.1,
    });
    const ovenDome = new THREE.Mesh(ovenDomeGeom, ovenDomeMat);
    ovenDome.scale.set(1.2, 0.95, 1.0);
    ovenDome.position.y = 0.6;
    ovenGroup.add(ovenDome);

    // Brick Arch Mouth of the Oven
    const ovenArchGeom = new THREE.TorusGeometry(1.05, 0.2, 12, 24, Math.PI);
    const archMat = new THREE.MeshStandardMaterial({
      color: 0x9a3412, // Burnt clay brick
      roughness: 0.9,
    });
    const ovenArch = new THREE.Mesh(ovenArchGeom, archMat);
    ovenArch.position.set(0, 0.8, 0.7);
    ovenGroup.add(ovenArch);

    // Oven Interior Chamber (Deep warm shadow)
    const ovenInsideGeom = new THREE.CylinderGeometry(0.95, 0.95, 1.2, 20);
    const ovenInsideMat = new THREE.MeshBasicMaterial({ color: 0x1a0803 });
    const ovenInside = new THREE.Mesh(ovenInsideGeom, ovenInsideMat);
    ovenInside.rotation.x = Math.PI / 2;
    ovenInside.position.set(0, 0.8, 0.2);
    ovenGroup.add(ovenInside);

    // Burning Oak Firewood Logs inside the oven
    [-0.35, 0, 0.35].forEach((x, i) => {
      const logGeom = new THREE.CylinderGeometry(0.08, 0.09, 0.8, 8);
      const logMat = new THREE.MeshStandardMaterial({
        color: 0x451a03,
        emissive: 0xea580c,
        emissiveIntensity: 0.8 + i * 0.2,
      });
      const log = new THREE.Mesh(logGeom, logMat);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = (i - 1) * 0.3;
      log.position.set(x, 0.35, 0.1);
      ovenGroup.add(log);
    });

    // Flickering Warm Fire Embers PointLight inside oven
    const ovenMouthLight = new THREE.PointLight(0xf97316, 2.5, 6.5);
    ovenMouthLight.position.set(0, 0.9, 0.4);
    ovenMouthLight.name = 'oven_fire_light';
    ovenGroup.add(ovenMouthLight);

    // Stone Chimney Stack on top of oven dome
    const chimneyGeom = new THREE.CylinderGeometry(0.3, 0.35, 1.4, 16);
    const chimney = new THREE.Mesh(chimneyGeom, ovenDomeMat);
    chimney.position.set(0, 2.7, -0.4);
    ovenGroup.add(chimney);

    const chimneyCap = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.3, 0.15, 16), archMat);
    chimneyCap.position.set(0, 3.4, -0.4);
    ovenGroup.add(chimneyCap);

    // Stack of Firewood (Leña cortada) next to the oven
    [-1, -0.5, 0].forEach((yTier, ti) => {
      for (let j = 0; j < 3 - ti; j++) {
        const woodLog = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.13, 1.2, 8),
          new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 })
        );
        woodLog.rotation.x = Math.PI / 2;
        woodLog.position.set(-2.8 + j * 0.28, 0.2 + ti * 0.22, -4.8);
        ovenGroup.add(woodLog);
      }
    });

    pizzeriaEnvGroup.add(ovenGroup);

    // 2. SACK OF FLOUR "FARINA TIPO 00 DI NAPOLI" (Saco de Harina spilling on counter)
    const flourSackGroup = new THREE.Group();
    flourSackGroup.position.set(-3.7, 0.35, -0.8);

    const sackGeom = new THREE.CylinderGeometry(0.38, 0.48, 0.75, 16);
    const sackMat = new THREE.MeshStandardMaterial({
      color: 0xd6c4a8, // Canvas jute cloth
      roughness: 0.95,
    });
    const sackBody = new THREE.Mesh(sackGeom, sackMat);
    flourSackGroup.add(sackBody);

    const sackRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.38, 0.07, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xc8b598, roughness: 0.9 })
    );
    sackRim.rotation.x = Math.PI / 2;
    sackRim.position.y = 0.38;
    flourSackGroup.add(sackRim);

    const flourMound = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.98 })
    );
    flourMound.position.y = 0.35;
    flourSackGroup.add(flourMound);

    const spillFlour = new THREE.Mesh(
      new THREE.CircleGeometry(0.55, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
    );
    spillFlour.rotation.x = -Math.PI / 2;
    spillFlour.position.set(0.3, -0.34, 0.3);
    flourSackGroup.add(spillFlour);

    pizzeriaEnvGroup.add(flourSackGroup);

    // 3. EXTRA VIRGIN OLIVE OIL BOTTLE ("OLIO D'OLIVA")
    const oilBottleGroup = new THREE.Group();
    oilBottleGroup.position.set(3.8, 0.5, -0.8);

    const bottleBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.2, 0.7, 14),
      new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 })
    );
    oilBottleGroup.add(bottleBody);

    const bottleNeck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.12, 0.35, 12),
      new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.15, transparent: true, opacity: 0.85 })
    );
    bottleNeck.position.y = 0.48;
    oilBottleGroup.add(bottleNeck);

    const cork = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.055, 0.12, 10),
      new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.85 })
    );
    cork.position.y = 0.68;
    oilBottleGroup.add(cork);

    pizzeriaEnvGroup.add(oilBottleGroup);

    // 4. SAN MARZANO TOMATO SAUCE CERAMIC BOWL WITH WOODEN SPOON
    const bowlGroup = new THREE.Group();
    bowlGroup.position.set(-3.6, 0.24, 1.4);

    const bowlGeom = new THREE.CylinderGeometry(0.38, 0.24, 0.28, 16);
    const bowlMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
    const bowl = new THREE.Mesh(bowlGeom, bowlMat);
    bowlGroup.add(bowl);

    const sauceGeom = new THREE.CircleGeometry(0.35, 16);
    const sauceMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.25, metalness: 0.1 });
    const sauce = new THREE.Mesh(sauceGeom, sauceMat);
    sauce.rotation.x = -Math.PI / 2;
    sauce.position.y = 0.13;
    bowlGroup.add(sauce);

    const spoonHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.03, 0.6, 8),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 })
    );
    spoonHandle.rotation.z = 0.5;
    spoonHandle.position.set(0.12, 0.24, 0);
    bowlGroup.add(spoonHandle);

    pizzeriaEnvGroup.add(bowlGroup);

    // 5. FRESH BAKED PIZZA MARGHERITA ON WOODEN PEEL BOARD
    const pizzaBoardGroup = new THREE.Group();
    pizzaBoardGroup.position.set(3.6, 0.08, 1.3);

    const board = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.75, 0.05, 24),
      new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.6 })
    );
    pizzaBoardGroup.add(board);

    const boardHandle = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.04, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.6 })
    );
    boardHandle.position.set(0, 0, 0.95);
    pizzaBoardGroup.add(boardHandle);

    const pizzaBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.68, 0.65, 0.04, 24),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 })
    );
    pizzaBase.position.y = 0.04;
    pizzaBoardGroup.add(pizzaBase);

    const pizzaTop = new THREE.Mesh(
      new THREE.CircleGeometry(0.6, 20),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.35 })
    );
    pizzaTop.rotation.x = -Math.PI / 2;
    pizzaTop.position.y = 0.065;
    pizzaBoardGroup.add(pizzaTop);

    [0, 1.3, 2.6, 3.9, 5.2].forEach((ang) => {
      const pep = new THREE.Mesh(
        new THREE.CircleGeometry(0.1, 10),
        new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.5 })
      );
      pep.rotation.x = -Math.PI / 2;
      pep.position.set(Math.cos(ang) * 0.35, 0.07, Math.sin(ang) * 0.35);
      pizzaBoardGroup.add(pep);
    });

    pizzeriaEnvGroup.add(pizzaBoardGroup);

    // 6. FRESH PIZZA DOUGH DISCS UNDER ALL 9 HOLES
    HOLE_COORDS.forEach((pos) => {
      const doughDiscGeom = new THREE.CylinderGeometry(1.08, 1.12, 0.04, 24);
      const doughDiscMat = new THREE.MeshStandardMaterial({
        color: 0xfef3c7, // Raw stretchy pizza dough
        roughness: 0.85,
      });
      const doughDisc = new THREE.Mesh(doughDiscGeom, doughDiscMat);
      doughDisc.position.set(pos.x, 0.02, pos.z);
      doughDisc.receiveShadow = true;
      pizzeriaEnvGroup.add(doughDisc);

      const flourRim = new THREE.Mesh(
        new THREE.TorusGeometry(1.06, 0.03, 8, 24),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, transparent: true, opacity: 0.7 })
      );
      flourRim.rotation.x = Math.PI / 2;
      flourRim.position.set(pos.x, 0.04, pos.z);
      pizzeriaEnvGroup.add(flourRim);
    });

    scene.add(pizzeriaEnvGroup);

    // 7. Build 9 Holes & Pizza Oven Radiant Heat Rings
    const heatRings: THREE.Mesh[] = [];
    HOLE_COORDS.forEach((pos, idx) => {
      const holeMesh = createHoleMesh(idx, pos.x, pos.z, theme);
      scene.add(holeMesh);

      // Fiery glowing heat ring for each hole during Pizza Oven powerup
      const heatRingGeom = new THREE.TorusGeometry(0.85, 0.07, 10, 24);
      const heatRingMat = new THREE.MeshStandardMaterial({
        color: 0xff4500,
        emissive: 0xff2200,
        emissiveIntensity: 2.0,
        transparent: true,
        opacity: 0,
        roughness: 0.2,
      });
      const heatRing = new THREE.Mesh(heatRingGeom, heatRingMat);
      heatRing.rotation.x = Math.PI / 2;
      heatRing.position.set(pos.x, 0.04, pos.z);
      heatRing.visible = false;
      scene.add(heatRing);
      heatRings.push(heatRing);
    });
    heatRingsRef.current = heatRings;

    // Pizza Oven Radiant Fire Light (Roaring center heat glow)
    const ovenFireLight = new THREE.PointLight(0xff4500, 0, 10);
    ovenFireLight.position.set(0, 2.5, 0);
    scene.add(ovenFireLight);
    ovenFireLightRef.current = ovenFireLight;

    // 7. Particle Manager
    const particles = new ParticleManager(scene);
    particlesRef.current = particles;

    // 8. Hammer Controller
    const hammerCtrl = new HammerController();
    hammerCtrl.setHammer(selectedHammer);
    scene.add(hammerCtrl.group);
    hammerCtrlRef.current = hammerCtrl;

    // Animation Render Loop
    let animFrameId: number;
    let lastTime = performance.now();
    let heatSparkTimer = 0;

    const animate = (time: number) => {
      animFrameId = requestAnimationFrame(animate);
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Update Particles
      particles.update(delta);

      // Update Hammer
      hammerCtrl.update(delta);

      // Animate Pizza Oven Heat Zone (Powerup Active)
      const isOvenActive = pizzaOvenActiveRef.current;
      if (ovenFireLightRef.current) {
        if (isOvenActive) {
          ovenFireLightRef.current.intensity = 3.5 + Math.sin(time * 0.012) * 1.0;
        } else {
          ovenFireLightRef.current.intensity = 0;
        }
      }

      heatRingsRef.current.forEach((ring, idx) => {
        if (isOvenActive) {
          ring.visible = true;
          const pulse = 1 + Math.sin(time * 0.008 + idx) * 0.12;
          ring.scale.set(pulse, pulse, 1);
          ring.rotation.z += delta * 1.5;
          if (ring.material instanceof THREE.MeshStandardMaterial) {
            ring.material.opacity = 0.9;
            ring.material.emissiveIntensity = 2.2 + Math.sin(time * 0.01 + idx) * 0.8;
          }
        } else {
          ring.visible = false;
          if (ring.material instanceof THREE.MeshStandardMaterial) {
            ring.material.opacity = 0;
          }
        }
      });

      // Emit rising oven embers across holes periodically during heat zone
      if (isOvenActive) {
        heatSparkTimer += delta;
        if (heatSparkTimer > 0.08) {
          heatSparkTimer = 0;
          const randomHole = HOLE_COORDS[Math.floor(Math.random() * HOLE_COORDS.length)];
          particles.emitHeatZoneSparks(new THREE.Vector3(randomHole.x, 0, randomHole.z), 2);
        }
      }

      // Update Moles Animation (Rising, Idling, Whack Squash, Unique Patterns)
      moleMeshesRef.current.forEach((item, holeIdx) => {
        const { mesh, mole } = item;
        const holePos = HOLE_COORDS[holeIdx];
        if (!holePos) return;

        const age = Date.now() - mole.spawnTime;
        const totalDur = mole.duration;

        // Keep 3D Health Bar synchronized with current health
        if (mole.health !== undefined && mole.maxHealth !== undefined) {
          updateMole3DHealth(mesh, mole.health, mole.maxHealth);
        }

        if (mole.state === 'hit') {
          // Lethal hit: instant pancake squash (Sy=0.15, Sxz=1.4) + sink into hole
          mesh.scale.y = THREE.MathUtils.lerp(mesh.scale.y, 0.15, 0.32);
          mesh.scale.x = THREE.MathUtils.lerp(mesh.scale.x, 1.4, 0.32);
          mesh.scale.z = THREE.MathUtils.lerp(mesh.scale.z, 1.4, 0.32);
          mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, -0.6, 0.25);
        } else if (mole.state === 'exploded') {
          mesh.scale.set(0.01, 0.01, 0.01);
        } else if (item.recoilStartTime && performance.now() - item.recoilStartTime < (item.recoilDuration || 280)) {
          // Non-lethal hits on multi-hit moles (tough, boss, helmet when HP > 0):
          // spring recoil oscillation (Sy=0.38 -> 1.28 -> 1.0) so they don't immediately flatten
          const elapsed = performance.now() - item.recoilStartTime;
          const dur = item.recoilDuration || 280;
          const p = Math.min(1, elapsed / dur);

          let sy = 1.0;
          if (p < 0.25) {
            // Fast impact compression: 1.0 -> 0.38
            const t = p / 0.25;
            sy = THREE.MathUtils.lerp(1.0, 0.38, Math.sin(t * Math.PI * 0.5));
          } else if (p < 0.65) {
            // Elastic rebound stretch: 0.38 -> 1.28
            const t = (p - 0.25) / 0.40;
            sy = THREE.MathUtils.lerp(0.38, 1.28, Math.sin(t * Math.PI * 0.5));
          } else {
            // Damped settling: 1.28 -> 1.0
            const t = (p - 0.65) / 0.35;
            sy = 1.0 + 0.28 * Math.cos(t * Math.PI * 0.5) * (1 - t);
          }

          const sxz = 1 / Math.sqrt(Math.max(0.1, sy));
          mesh.scale.set(sxz, sy, sxz);
          mesh.position.y = 0;
        } else {
          // Different rising & staying speeds per mole type
          let riseTime = 180; // ms standard
          let hideDuration = 220;

          if (mole.type === 'fast') {
            riseTime = 80;
            hideDuration = 120;
          } else if (mole.type === 'tough' || mole.type === 'boss') {
            riseTime = 320;
            hideDuration = 300;
          } else if (mole.type === 'golden') {
            riseTime = 140;
          }

          const hideStartTime = totalDur - hideDuration;

          if (age < riseTime) {
            // Emergence squash & stretch with volume conservation:
            const p = Math.max(0, Math.min(1, age / riseTime));
            if (p < 0.18) {
              // 0 <= p < 0.18: anticipation coil down (Sy=0.75, Sx=Sz=1.15)
              const t = p / 0.18;
              mesh.scale.y = THREE.MathUtils.lerp(1.0, 0.75, t);
              mesh.scale.x = THREE.MathUtils.lerp(1.0, 1.15, t);
              mesh.scale.z = THREE.MathUtils.lerp(1.0, 1.15, t);
              mesh.position.y = -0.6;
            } else if (p < 0.72) {
              // 0.18 <= p < 0.72: upward surge stretch (Sy=1.32, Sx=Sz=0.87)
              const t = (p - 0.18) / (0.72 - 0.18);
              mesh.scale.y = THREE.MathUtils.lerp(0.75, 1.32, t);
              mesh.scale.x = THREE.MathUtils.lerp(1.15, 0.87, t);
              mesh.scale.z = THREE.MathUtils.lerp(1.15, 0.87, t);
              mesh.position.y = -0.6 + t * 0.6;
            } else {
              // 0.72 <= p <= 1.0: apex overshoot and damped bounce settling to 1.0
              const t = (p - 0.72) / (1.0 - 0.72);
              const bounce = Math.sin(t * Math.PI * 2) * (1 - t) * 0.32;
              mesh.scale.y = 1.0 + bounce;
              const sxz = 1 / Math.sqrt(Math.max(0.2, mesh.scale.y));
              mesh.scale.x = sxz;
              mesh.scale.z = sxz;
              mesh.position.y = 0 + Math.max(0, bounce * 0.08);
            }

            // Golden mole spiral ascend
            if (mole.type === 'golden') {
              mesh.rotation.y = p * Math.PI * 2;
            }
          } else if (age > hideStartTime) {
            // Retracting back into hole (Descent stretch Sy=1.22, Sx=Sz=0.90)
            const p = Math.max(0, Math.min(1, (age - hideStartTime) / hideDuration));
            mesh.position.y = -p * 0.6;

            const stretchFactor = Math.sin(p * Math.PI);
            mesh.scale.y = 1.0 + (1.22 - 1.0) * stretchFactor;
            mesh.scale.x = 1.0 - (1.0 - 0.90) * stretchFactor;
            mesh.scale.z = 1.0 - (1.0 - 0.90) * stretchFactor;

            // Trigger Disappear Poof on first frame of retreat
            if (!item.retreated && particlesRef.current) {
              item.retreated = true;
              particlesRef.current.emitDisappearPoof(new THREE.Vector3(holePos.x, 0.05, holePos.z));
            }
          } else {
            // Idle state with distinct patterns
            if (mole.type === 'fast') {
              // Fast mole: high-frequency twitch + peek-a-boo fake dip at 40-50% age
              const midProgress = (age - riseTime) / (hideStartTime - riseTime);
              let dip = 0;
              if (midProgress > 0.35 && midProgress < 0.55) {
                dip = Math.sin((midProgress - 0.35) * Math.PI * 5) * 0.22;
              }
              mesh.position.y = 0 - dip + Math.sin(time * 0.02 + holeIdx) * 0.02;
              mesh.rotation.y = Math.sin(time * 0.015) * 0.15;
            } else if (mole.type === 'tough') {
              // Heavy lumbering breathing
              mesh.position.y = 0 + Math.sin(time * 0.003 + holeIdx) * 0.02;
              mesh.scale.x = 1 + Math.sin(time * 0.004) * 0.02;
              mesh.scale.z = 1 + Math.sin(time * 0.004) * 0.02;
            } else if (mole.type === 'golden') {
              // Floating levitation bob
              mesh.position.y = 0.06 + Math.sin(time * 0.006 + holeIdx) * 0.05;
              mesh.rotation.y += delta * 1.5;
            } else if (mole.type === 'rainbow') {
              // Prismatic floating hover
              mesh.position.y = 0.08 + Math.sin(time * 0.007 + holeIdx) * 0.06;
              mesh.rotation.y = Math.sin(time * 0.004) * 0.3;
            } else if (mole.type === 'phantom') {
              // Holographic phase pulse
              mesh.position.y = 0 + Math.sin(time * 0.005 + holeIdx) * 0.04;
              const ring = mesh.getObjectByName('phantom_ring');
              if (ring) ring.rotation.z += delta * 3;
            } else if (mole.type === 'boss') {
              // Boss heavy pulse
              mesh.position.y = 0 + Math.sin(time * 0.003) * 0.04;
              mesh.scale.setScalar(1 + Math.sin(time * 0.005) * 0.03);
            } else {
              // Standard idle peek
              mesh.position.y = 0 + Math.sin(time * 0.005 + holeIdx) * 0.03;
            }
          }

          // Auxiliary object animations
          if (mole.type === 'bomb') {
            const spark = mesh.getObjectByName('bomb_spark');
            if (spark) {
              spark.scale.setScalar(0.8 + Math.random() * 0.7);
            }
          } else if (mole.type === 'frost') {
            for (let i = 0; i < 3; i++) {
              const crystal = mesh.getObjectByName(`frost_crystal_${i}`);
              if (crystal) {
                const orbitAngle = time * 0.003 + (i * Math.PI * 2) / 3;
                crystal.position.x = Math.cos(orbitAngle) * 0.65;
                crystal.position.z = Math.sin(orbitAngle) * 0.65;
                crystal.rotation.y += delta * 3;
              }
            }
          } else if (mole.type === 'rainbow') {
            const star = mesh.getObjectByName('crystal_star_rainbow');
            if (star) {
              star.rotation.y += delta * 2;
              star.rotation.x += delta * 1.2;
            }
            for (let i = 0; i < 2; i++) {
              const gem = mesh.getObjectByName(`prismatic_gem_${i}`);
              if (gem) {
                const orbitAngle = time * 0.004 + (i * Math.PI);
                gem.position.x = Math.cos(orbitAngle) * 0.7;
                gem.position.z = Math.sin(orbitAngle) * 0.7;
                gem.rotation.y += delta * 2.5;
              }
            }
          } else if (mole.type === 'boss') {
            const crown = mesh.getObjectByName('boss_crown');
            if (crown) {
              crown.rotation.y += delta * 0.8;
            }
          }
        }
      });

      // Pizzeria Wood Oven Fire Flicker
      const ovenLight = scene.getObjectByName('oven_fire_light') as THREE.PointLight;
      if (ovenLight) {
        ovenLight.intensity = 2.2 + Math.sin(time * 0.008) * 0.4 + Math.random() * 0.3;
      }

      // Kitchen Disaster 3D Lighting & Red Emergency Strobe Flasher
      const isDisaster = kitchenDisasterActiveRef.current;
      if (ambientLightRef.current && dirLightRef.current && emergencyStrobeLightRef.current) {
        if (isDisaster) {
          // Dim the primary background kitchen lights
          ambientLightRef.current.intensity = THREE.MathUtils.lerp(ambientLightRef.current.intensity, 0.18, 0.12);
          dirLightRef.current.intensity = THREE.MathUtils.lerp(dirLightRef.current.intensity, 0.32, 0.12);

          // Fast rhythmic red emergency siren pulse
          const strobePulse = Math.sin(time * 0.024);
          const isRedFlash = strobePulse > 0.05;
          ambientLightRef.current.color.set(isRedFlash ? 0xff2a2a : 0x4f0808);
          emergencyStrobeLightRef.current.intensity = isRedFlash ? 4.5 : 0.8;
          emergencyStrobeLightRef.current.position.x = Math.sin(time * 0.008) * 1.8;
          emergencyStrobeLightRef.current.position.z = Math.cos(time * 0.008) * 1.8;

          if (scene.fog) {
            scene.fog.color.set(isRedFlash ? 0x420808 : 0x180404);
          }
        } else {
          // Smoothly restore normal kitchen lighting
          ambientLightRef.current.intensity = THREE.MathUtils.lerp(ambientLightRef.current.intensity, 0.75, 0.08);
          ambientLightRef.current.color.set(0xffffff);
          dirLightRef.current.intensity = THREE.MathUtils.lerp(dirLightRef.current.intensity, 1.4, 0.08);
          emergencyStrobeLightRef.current.intensity = THREE.MathUtils.lerp(emergencyStrobeLightRef.current.intensity, 0, 0.15);

          if (scene.fog) {
            scene.fog.color.set(fogColor);
          }
        }
      }

      // Camera Shake
      if (cameraShakeRef.current.intensity > 0.001) {
        const shake = cameraShakeRef.current.intensity;
        camera.position.x = baseCameraPos.current.x + (Math.random() - 0.5) * shake;
        camera.position.y = baseCameraPos.current.y + (Math.random() - 0.5) * shake;
        camera.position.z = baseCameraPos.current.z + (Math.random() - 0.5) * shake;
        cameraShakeRef.current.intensity *= cameraShakeRef.current.decay;
      } else {
        camera.position.copy(baseCameraPos.current);
      }
      camera.lookAt(targetCameraPos.current);

      renderer.render(scene, camera);
    };

    animFrameId = requestAnimationFrame(animate);

    // Resize Observer
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w <= 0 || h <= 0) return;

      const cfg = computeResponsiveCameraConfig(w, h);
      cameraRef.current.aspect = w / h;
      cameraRef.current.fov = cfg.fov;
      cameraRef.current.updateProjectionMatrix();

      baseCameraPos.current.copy(cfg.cameraPos);
      targetCameraPos.current.copy(cfg.targetPos);
      cameraRef.current.position.copy(cfg.cameraPos);
      cameraRef.current.lookAt(cfg.targetPos);

      if (ovenGroupRef.current) {
        ovenGroupRef.current.position.copy(cfg.domePosition);
        ovenGroupRef.current.scale.copy(cfg.domeScale);
      }

      const isMob = w < 768 || window.innerWidth < 768;
      const targetDpr = isMob ? 1.25 : 1.75;
      rendererRef.current.setSize(w, h);
      rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio || 1, targetDpr));
    };

    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    return () => {
      cancelAnimationFrame(animFrameId);
      ro.disconnect();
      particles.cleanup();
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.dispose();
        if (container.contains(rendererRef.current.domElement)) {
          container.removeChild(rendererRef.current.domElement);
        }
      }
    };
  }, [theme]);

  // Update Hammer model when user changes hammer in shop/inventory
  useEffect(() => {
    if (hammerCtrlRef.current) {
      hammerCtrlRef.current.setHammer(selectedHammer);
    }
  }, [selectedHammer]);

  // Synchronize Active Moles in 3D Scene
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const currentMap = moleMeshesRef.current;
    const activeMoleHoles = new Set<number>();

    moles.forEach((mole) => {
      activeMoleHoles.add(mole.holeIndex);
      const existing = currentMap.get(mole.holeIndex);

      if (!existing || existing.mole.id !== mole.id) {
        // Remove old mesh if any
        if (existing) {
          scene.remove(existing.mesh);
        }

        const holePos = HOLE_COORDS[mole.holeIndex];
        if (holePos) {
          const mesh = createMoleMesh(mole.type, theme);
          mesh.position.set(holePos.x, -0.6, holePos.z);
          scene.add(mesh);
          currentMap.set(mole.holeIndex, { mesh, mole, animProgress: 0, retreated: false });

          // Milestone 2 (F6): Emit Appear Poof on emergence
          if (particlesRef.current) {
            particlesRef.current.emitAppearPoof(new THREE.Vector3(holePos.x, 0.05, holePos.z), mole.type);
          }

          // Spawn random taunt message bubble for this mole in its hole
          const tauntText = getRandomTaunt(mole.type);
          const initialPos = getHoleScreenPosition(mole.holeIndex, mole.type === 'boss' ? 1.6 : 1.35);
          const newBubble: TauntBubble = {
            id: `taunt_${mole.id}_${Date.now()}`,
            holeIndex: mole.holeIndex,
            moleId: mole.id,
            text: tauntText,
            icon: getMoleIcon(mole.type),
            type: mole.type,
            xPercent: initialPos ? initialPos.xPercent : 25 + (mole.holeIndex % 3) * 25,
            yPercent: initialPos ? initialPos.yPercent : 32 + Math.floor(mole.holeIndex / 3) * 18,
            createdAt: Date.now(),
          };

          setTauntBubbles((prev) => [
            ...prev.filter((b) => b.holeIndex !== mole.holeIndex),
            newBubble,
          ]);

          // Auto-expire after 1.8s or slightly before mole hides
          const bubbleDuration = Math.min(1800, Math.max(1000, (mole.duration || 1500) - 150));
          setTimeout(() => {
            setTauntBubbles((prev) => prev.filter((b) => b.id !== newBubble.id));
          }, bubbleDuration);
        }
      } else {
        // Check if mole transitioned from alive to hit/exploded (e.g. via Pizza Oven auto-burn or multiplayer)
        const wasAlive = existing.mole.state !== 'hit' && existing.mole.state !== 'exploded';
        const isNowHit = mole.state === 'hit' || mole.state === 'exploded';

        if (wasAlive && isNowHit) {
          const hitReactions = ['Ouch!', 'Bonk!', 'Mamma Mia!', 'D\'oh!', 'Ow!', 'Got me!'];
          const hitReactionText = mole.type === 'bomb' ? 'BOOM!' : hitReactions[Math.floor(Math.random() * hitReactions.length)];
          setTauntBubbles((prev) =>
            prev.map((b) =>
              b.holeIndex === mole.holeIndex
                ? { ...b, text: hitReactionText, isHit: true, icon: mole.type === 'bomb' ? '💥' : '💫' }
                : b
            )
          );
          setTimeout(() => {
            setTauntBubbles((prev) => prev.filter((b) => b.holeIndex !== mole.holeIndex));
          }, 450);

          const holePos = HOLE_COORDS[mole.holeIndex];
          if (holePos && particlesRef.current && mole.type !== 'bomb') {
            const impactPos = new THREE.Vector3(holePos.x, 0.35, holePos.z);
            if (pizzaOvenActiveRef.current) {
              // Incinerated by Pizza Oven: fiery inferno blast + massive burst of roasted pizza ingredients
              particlesRef.current.emitPizzaOvenBurn(impactPos);
              particlesRef.current.emitPizzaIngredientsBurst(impactPos, true);
              particlesRef.current.emitPizzaKitchenHit(impactPos, true);
              triggerCameraShake(0.28);
            } else {
              // Regular defeat burst of pizza ingredients: flour clouds, tomato sauce splashes, oregano sparkles
              particlesRef.current.emitPizzaIngredientsBurst(impactPos, false);
              particlesRef.current.emitPizzaKitchenHit(impactPos, false);
            }
          }

          // Trigger 2D canvas particle explosion at mole screen coordinate if not recently clicked (skip bomb to avoid double trigger)
          if (mole.type !== 'bomb' && containerRef.current && Date.now() - lastExplosionTimeRef.current > 150) {
            const screenPos = getHoleScreenPosition(mole.holeIndex, 0.8);
            if (screenPos) {
              const rect = containerRef.current.getBoundingClientRect();
              const hitX = (rect.width * screenPos.xPercent) / 100;
              const hitY = (rect.height * screenPos.yPercent) / 100;
              particleCanvasRef.current?.triggerExplosion(hitX, hitY, mole.type, false, true);
              lastExplosionTimeRef.current = Date.now();
            }
          }
        }

        // Check if mole was damaged non-lethally (e.g. multi-hit mole took damage)
        if (wasAlive && !isNowHit && mole.health !== undefined && existing.mole.health !== undefined && mole.health < existing.mole.health) {
          existing.recoilStartTime = performance.now();
          existing.recoilDuration = 280;
        }

        // Update mole state
        existing.mole = mole;
      }
    });

    // Remove despawned moles and their taunt bubbles
    currentMap.forEach((item, holeIdx) => {
      if (!activeMoleHoles.has(holeIdx)) {
        if (!item.retreated && item.mole.state !== 'hit' && item.mole.state !== 'exploded' && particlesRef.current) {
          const holePos = HOLE_COORDS[holeIdx];
          if (holePos) {
            particlesRef.current.emitDisappearPoof(new THREE.Vector3(holePos.x, 0.05, holePos.z));
          }
        }
        scene.remove(item.mesh);
        currentMap.delete(holeIdx);
        setTauntBubbles((prev) => prev.filter((b) => b.holeIndex !== holeIdx));
      }
    });
  }, [moles, theme, getHoleScreenPosition]);

  // Trigger Camera Shake Helper
  const triggerCameraShake = (amount: number) => {
    cameraShakeRef.current.intensity = Math.max(cameraShakeRef.current.intensity, amount);
  };

  // Synchronize Screen Shake with 3D Camera Shake
  useEffect(() => {
    if (screenShakeTrigger && screenShakeTrigger.intensity > 0) {
      triggerCameraShake(screenShakeTrigger.intensity * 0.024);
    }
  }, [screenShakeTrigger]);

  // Handle external particle explosion trigger (from App.tsx or test triggers)
  useEffect(() => {
    if (particleExplosionTrigger && containerRef.current) {
      if (Date.now() - lastExplosionTimeRef.current < 75) return;
      const rect = containerRef.current.getBoundingClientRect();
      const hitX = particleExplosionTrigger.x - rect.left;
      const hitY = particleExplosionTrigger.y - rect.top;
      particleCanvasRef.current?.triggerExplosion(
        hitX,
        hitY,
        particleExplosionTrigger.type,
        particleExplosionTrigger.isCrit,
        particleExplosionTrigger.isDefeated
      );
      lastExplosionTimeRef.current = Date.now();
    }
  }, [particleExplosionTrigger]);

  // Mouse / Pointer Move / Touch Drag: Raycast onto stage plane to move Hammer
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !cameraRef.current || !hammerCtrlRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    mouseRef.current.set(x, y);
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

    const hitPoint = new THREE.Vector3();
    const intersects = raycasterRef.current.ray.intersectPlane(planeIntersectRef.current, hitPoint);

    if (intersects) {
      hammerCtrlRef.current.setTarget(new THREE.Vector3(hitPoint.x + 0.25, 1.15, hitPoint.z + 0.25));
    }
  };

  // Common Whack Execution logic shared between mouse/touch and MediaPipe gesture input
  const executeWhack = useCallback(
    (hitPoint: THREE.Vector3, clientX: number, clientY: number, maxHitRadius: number, isTouchOrGesture: boolean): number => {
      // Check intersection with all 9 Holes
      let closestHoleIdx = -1;
      let closestDist = Infinity;

      HOLE_COORDS.forEach((pos, idx) => {
        // Bottom row holes (6, 7, 8 at z > 1.0) receive a +0.55 radius boost for effortless air reaches
        const isBottomRow = pos.z > 1.0;
        const effectiveRadius = isTouchOrGesture && isBottomRow ? maxHitRadius + 0.55 : maxHitRadius;
        const dist = Math.hypot(hitPoint.x - pos.x, hitPoint.z - pos.z);
        if (dist < effectiveRadius && dist < closestDist) {
          closestDist = dist;
          closestHoleIdx = idx;
        }
      });

      // Compute hammer target: lock directly onto the hole if tapped near a hole, or hitPoint
      const hammerTarget = new THREE.Vector3();
      if (closestHoleIdx !== -1) {
        const holeCoord = HOLE_COORDS[closestHoleIdx];
        hammerTarget.set(holeCoord.x + 0.25, 1.15, holeCoord.z + 0.25);
      } else {
        hammerTarget.set(hitPoint.x + 0.25, 1.15, hitPoint.z + 0.25);
      }

      // Trigger fluid Hammer Swing directly AT the target position
      if (hammerCtrlRef.current) {
        hammerCtrlRef.current.swingAt(hammerTarget, isTouchOrGesture);
      }

      // Flour puff emitted onto the prep table at click location
      if (particlesRef.current && hitPoint) {
        particlesRef.current.emitFlourCloud(new THREE.Vector3(hitPoint.x, 0.08, hitPoint.z), false, 6);
      }

      if (closestHoleIdx !== -1) {
        const holeCoord = HOLE_COORDS[closestHoleIdx];
        const moleItem = moleMeshesRef.current.get(closestHoleIdx);

        if (moleItem && moleItem.mole.state !== 'hit' && moleItem.mole.state !== 'exploded') {
          const { mole } = moleItem;
          const isCrit = Math.random() < selectedHammer.critChance;
          const isDefeated = mole.health <= selectedHammer.damage;

          if (!isDefeated) {
            moleItem.recoilStartTime = performance.now();
            moleItem.recoilDuration = 280;
          }

          // Immediate 2D Canvas Particle Explosion Effect with mole-type specific colors
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const hitX = clientX - rect.left;
            const hitY = clientY - rect.top;
            particleCanvasRef.current?.triggerExplosion(hitX, hitY, mole.type, isCrit, isDefeated);
            lastExplosionTimeRef.current = Date.now();
          }

          // Immediate reaction upon being whacked
          const hitReactions = ['Ouch!', 'Bonk!', 'Mamma Mia!', 'D\'oh!', 'Ow!', 'Got me!'];
          const hitText = mole.type === 'bomb' ? 'BOOM!' : hitReactions[Math.floor(Math.random() * hitReactions.length)];
          setTauntBubbles((prev) =>
            prev.map((b) =>
              b.holeIndex === closestHoleIdx
                ? { ...b, text: hitText, isHit: true, icon: mole.type === 'bomb' ? '💥' : '💫' }
                : b
            )
          );
          setTimeout(() => {
            setTauntBubbles((prev) => prev.filter((b) => b.holeIndex !== closestHoleIdx));
          }, 450);

          // Particle Bursts and Sound FX based on Mole Type
          const impactPos = new THREE.Vector3(holeCoord.x, 0.4, holeCoord.z);

          if (mole.type === 'bomb') {
            // 100% clean bomb hit: zero 3D particles, zero canvas effects, zero camera shake
            sfx.playExplosion();
          } else {
            // Always trigger signature Pizza Kitchen trio for edible moles: Flour clouds, Tomato sauce splashes, and Oregano sparkles
            particlesRef.current?.emitPizzaKitchenHit(impactPos, isCrit || pizzaOvenActiveRef.current);
            particlesRef.current?.emitPizzaIngredientsBurst(impactPos, isCrit || pizzaOvenActiveRef.current);

            if (pizzaOvenActiveRef.current) {
              particlesRef.current?.emitPizzaOvenBurn(impactPos);
            }

            if (mole.type === 'fast') {
              particlesRef.current?.emitLightningSparks(impactPos);
              particlesRef.current?.emitHitSparks(impactPos, true, 0x38bdf8);
              triggerCameraShake(0.18);
              sfx.playFastWhoosh();
              sfx.playWhack(true);
            } else if (mole.type === 'tough') {
              const isLethal = mole.health <= 1;
              particlesRef.current?.emitArmorChipped(impactPos, isLethal);
              particlesRef.current?.emitHitSparks(impactPos, true, 0x94a3b8);
              if (isLethal) {
                particlesRef.current?.emitPizzaSlices(impactPos, 4);
              }
              triggerCameraShake(isLethal ? 0.35 : 0.2);
              if (isLethal) {
                sfx.playArmorBreak();
              } else {
                sfx.playMetalClang();
              }
            } else if (mole.type === 'helmet') {
              const isLethal = mole.health <= 1;
              particlesRef.current?.emitArmorChipped(impactPos, isLethal);
              particlesRef.current?.emitHitSparks(impactPos, true, 0xf59e0b);
              triggerCameraShake(isLethal ? 0.25 : 0.18);
              sfx.playHelmetHit(isLethal);
            } else if (mole.type === 'frost') {
              particlesRef.current?.emitFrostShards(impactPos);
              triggerCameraShake(0.2);
              sfx.playFrostHit();
            } else if (mole.type === 'golden') {
              particlesRef.current?.emitCoins(impactPos, 10);
              particlesRef.current?.emitPizzaSlices(impactPos, 8);
              particlesRef.current?.emitHitSparks(impactPos, true, 0xfef08a);
              triggerCameraShake(0.25);
              sfx.playGoldenHit();
            } else if (mole.type === 'rainbow') {
              particlesRef.current?.emitRainbowBurst(impactPos);
              triggerCameraShake(0.2);
              sfx.playPowerup();
              sfx.playWhack(true);
            } else if (mole.type === 'phantom') {
              particlesRef.current?.emitPhantomMist(impactPos);
              triggerCameraShake(0.15);
              sfx.playPhantomDisappear();
            } else if (mole.type === 'boss') {
              particlesRef.current?.emitBossRoar(impactPos);
              particlesRef.current?.emitHitSparks(impactPos, true, 0xef4444);
              triggerCameraShake(0.4);
              sfx.playBossRoar();
              sfx.playWhack(true);
            } else if (selectedHammer.specialEffect === 'fire_burst') {
              particlesRef.current?.emitFireEmbers(impactPos);
              triggerCameraShake(0.2);
              sfx.playFireBurst();
            } else if (selectedHammer.specialEffect === 'freeze_wave') {
              particlesRef.current?.emitFrostShards(impactPos);
              triggerCameraShake(0.15);
              sfx.playFreeze();
            } else if (selectedHammer.specialEffect === 'lightning') {
              particlesRef.current?.emitLightningSparks(impactPos);
              triggerCameraShake(0.22);
              sfx.playLightning();
            } else {
              if (isCrit) {
                particlesRef.current?.emitPizzaSlices(impactPos, 5);
              }
              particlesRef.current?.emitHitSparks(impactPos, isCrit);
              triggerCameraShake(isCrit ? 0.22 : 0.1);
              if (selectedHammer.headShape === 'uslero' || selectedHammer.headShape === 'cylinder') {
                sfx.playUsleroSmash(isCrit);
              } else {
                sfx.playWhack(isCrit);
              }
            }
          }
        }

        onHitHole(closestHoleIdx, clientX, clientY);
      }

      return closestHoleIdx;
    },
    [onHitHole, selectedHammer]
  );

  // Imperative handle for MediaPipe Gesture integration without React re-render lag
  useImperativeHandle(
    ref,
    () => ({
      setGestureCursor(ndcX: number, ndcY: number) {
        if (!cameraRef.current || !hammerCtrlRef.current) return;
        mouseRef.current.set(ndcX, ndcY);
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
        const hitPoint = new THREE.Vector3();
        const intersects = raycasterRef.current.ray.intersectPlane(planeIntersectRef.current, hitPoint);
        if (intersects) {
          hammerCtrlRef.current.setTarget(new THREE.Vector3(hitPoint.x + 0.25, 1.15, hitPoint.z + 0.25));
        }
      },
      triggerGestureWhack(ndcX: number, ndcY: number, clientX: number, clientY: number): number {
        if (!cameraRef.current || !sceneRef.current) return -1;
        mouseRef.current.set(ndcX, ndcY);
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
        const hitPoint = new THREE.Vector3();
        const intersects = raycasterRef.current.ray.intersectPlane(planeIntersectRef.current, hitPoint);
        if (!intersects) return -1;
        // Ergonomic 2.0 base hit radius for air gestures (expanded for fluid hits)
        return executeWhack(hitPoint, clientX, clientY, 2.0, true);
      },
      setGestureActive(_active: boolean) {
        // Can be used for custom gesture visual states
      },
    }),
    [executeWhack]
  );

  // Pointer Down (Whack / Smash Tap or Click for Classic Mode)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;
    const isTouch = e.pointerType === 'touch';
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    mouseRef.current.set(x, y);
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

    const hitPoint = new THREE.Vector3();
    raycasterRef.current.ray.intersectPlane(planeIntersectRef.current, hitPoint);
    const maxHitRadius = isTouch ? 1.65 : 1.35;
    executeWhack(hitPoint, e.clientX, e.clientY, maxHitRadius, isTouch);
  };

  return (
    <div
      ref={containerRef}
      id="whack_3d_stage"
      className="relative w-full h-full cursor-crosshair select-none touch-none overflow-hidden"
      onPointerDown={(e) => {
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {}
        handlePointerDown(e);
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={(e) => {
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {}
      }}
      onPointerCancel={(e) => {
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {}
      }}
    >
      {/* 2D Canvas Particle Explosion System Overlay */}
      <MoleParticleCanvas ref={particleCanvasRef} />
      {/* 3D Floating Score & Combo Numbers Overlay */}
      {floatingTexts.map((ft) => (
        <div
          key={ft.id}
          className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 font-extrabold animate-bounce"
          style={{
            left: `${ft.x}px`,
            top: `${ft.y}px`,
            color: ft.color,
            fontSize: `${Math.round(20 * ft.scale)}px`,
            textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 12px currentColor',
            zIndex: 30,
          }}
        >
          {ft.text}
        </div>
      ))}

      {/* Dynamic 3D Mole Speech Bubble Taunts Overlay */}
      {tauntBubbles.map((bubble) => {
        const livePos = getHoleScreenPosition(bubble.holeIndex, bubble.type === 'boss' ? 1.6 : 1.35);
        const left = livePos ? livePos.xPercent : bubble.xPercent;
        const top = livePos ? livePos.yPercent : bubble.yPercent;

        return (
          <div
            key={bubble.id}
            id={`mole_taunt_bubble_${bubble.holeIndex}`}
            className={`absolute pointer-events-none z-20 ${
              bubble.isHit ? 'animate-bubble-hit' : 'animate-bubble-pop'
            }`}
            style={{
              left: `${left}%`,
              top: `${top}%`,
            }}
          >
            {/* Comic Speech Bubble Container */}
            <div
              id={`taunt_text_${bubble.holeIndex}`}
              className={`relative px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-2xl flex items-center gap-1.5 whitespace-nowrap border-2 font-black text-xs sm:text-sm tracking-tight select-none transition-all duration-150 ${
                bubble.isHit
                  ? 'bg-amber-400 border-red-600 text-stone-900 scale-110 shadow-lg shadow-red-500/40'
                  : bubble.type === 'bomb'
                  ? 'bg-rose-50/95 border-rose-600 text-rose-950 shadow-lg shadow-rose-950/25 ring-1 ring-rose-400/50'
                  : bubble.type === 'golden'
                  ? 'bg-amber-50/95 border-amber-500 text-amber-950 shadow-lg shadow-amber-950/20 ring-2 ring-amber-300/60'
                  : bubble.type === 'phantom'
                  ? 'bg-purple-50/95 border-purple-500 text-purple-950 shadow-lg shadow-purple-950/25 ring-1 ring-purple-400/40'
                  : bubble.type === 'boss'
                  ? 'bg-red-50/95 border-red-600 text-red-950 shadow-xl shadow-red-950/30 ring-2 ring-red-500/50 text-xs sm:text-base'
                  : bubble.type === 'frost'
                  ? 'bg-cyan-50/95 border-cyan-500 text-cyan-950 shadow-lg shadow-cyan-950/20 ring-1 ring-cyan-400/40'
                  : bubble.type === 'rainbow'
                  ? 'bg-gradient-to-r from-amber-50 via-rose-50 to-indigo-50 border-purple-500 text-stone-900 shadow-lg shadow-purple-950/25'
                  : 'bg-white/95 border-stone-800 text-stone-900 shadow-lg shadow-stone-900/30'
              }`}
            >
              {bubble.icon && <span className="text-sm leading-none">{bubble.icon}</span>}
              <span className="drop-shadow-xs">{bubble.text}</span>

              {/* Speech Bubble Pointer Arrow (pointing down toward the mole in its hole) */}
              <div
                className={`absolute left-1/2 -bottom-2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] ${
                  bubble.isHit
                    ? 'border-t-red-600'
                    : bubble.type === 'bomb'
                    ? 'border-t-rose-600'
                    : bubble.type === 'golden'
                    ? 'border-t-amber-500'
                    : bubble.type === 'phantom'
                    ? 'border-t-purple-500'
                    : bubble.type === 'boss'
                    ? 'border-t-red-600'
                    : bubble.type === 'frost'
                    ? 'border-t-cyan-500'
                    : bubble.type === 'rainbow'
                    ? 'border-t-purple-500'
                    : 'border-t-stone-800'
                }`}
              />
              <div
                className={`absolute left-1/2 -bottom-[6px] -translate-x-1/2 w-0 h-0 border-l-[4.5px] border-l-transparent border-r-[4.5px] border-r-transparent border-t-[6.5px] ${
                  bubble.isHit
                    ? 'border-t-amber-400'
                    : bubble.type === 'bomb'
                    ? 'border-t-rose-50'
                    : bubble.type === 'golden'
                    ? 'border-t-amber-50'
                    : bubble.type === 'phantom'
                    ? 'border-t-purple-50'
                    : bubble.type === 'boss'
                    ? 'border-t-red-50'
                    : bubble.type === 'frost'
                    ? 'border-t-cyan-50'
                    : bubble.type === 'rainbow'
                    ? 'border-t-rose-50'
                    : 'border-t-white'
                }`}
              />
            </div>
          </div>
        );
      })}

      {/* Dynamic Frenzy Screen Edge Glow */}
      {frenzyActive && (
        <div className="absolute inset-0 pointer-events-none ring-8 ring-amber-400/70 animate-pulse z-10" />
      )}

      {/* Dynamic Pizza Oven Inferno Heat Aura */}
      {pizzaOvenActive && (
        <div className="absolute inset-0 pointer-events-none ring-8 ring-orange-500/80 shadow-[inset_0_0_80px_rgba(234,88,12,0.4)] animate-pulse z-10" />
      )}

      {/* Dynamic Kitchen Disaster Red Emergency Flasher Aura & Warning Pill */}
      {kitchenDisasterActive && (
        <>
          <div
            id="kitchen_disaster_red_flash_overlay"
            className="absolute inset-0 pointer-events-none ring-8 ring-red-600/90 shadow-[inset_0_0_120px_rgba(239,68,68,0.65)] animate-pulse z-15"
          />
          <div
            id="kitchen_disaster_banner"
            className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/95 border-2 border-red-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(239,68,68,0.8)] animate-bounce"
          >
            <span className="text-base animate-spin">🚨</span>
            <span className="text-red-300 font-black">KITCHEN DISASTER!</span>
            <span className="text-stone-300 text-[11px] font-semibold hidden sm:inline">• SPAWN SPEED 2.5X</span>
            <span className="px-2 py-0.5 rounded-md bg-red-600 text-white font-mono text-xs font-black shadow-inner">
              {disasterTimeRemaining}s
            </span>
          </div>
        </>
      )}
    </div>
  );
});

MoleScene3D.displayName = 'MoleScene3D';

