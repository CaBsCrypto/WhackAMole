import * as THREE from 'three';
import { MoleType } from '../../types';

/**
 * Creates an Italian Chef's white puffy hat (Toque Blanche)
 */
function createChefHat(scale = 1.0, isImperial = false): THREE.Group {
  const hatGroup = new THREE.Group();

  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.8,
    metalness: 0.05,
  });

  // Base headband ring
  const bandGeom = new THREE.CylinderGeometry(0.48 * scale, 0.46 * scale, 0.22 * scale, 24);
  const bandMat = isImperial
    ? new THREE.MeshStandardMaterial({ color: 0xb91c1c, metalness: 0.4 }) // Red tricolor band for boss
    : new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.6 });
  const band = new THREE.Mesh(bandGeom, bandMat);
  band.position.y = 0.11 * scale;
  hatGroup.add(band);

  // If imperial boss hat, add Italian tricolor stripes
  if (isImperial) {
    const greenRibbon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.485 * scale, 0.485 * scale, 0.07 * scale, 24),
      new THREE.MeshStandardMaterial({ color: 0x15803d })
    );
    greenRibbon.position.y = 0.18 * scale;
    hatGroup.add(greenRibbon);
  }

  // Puffy mushroom dome (Toque)
  const domeHeight = isImperial ? 0.75 * scale : 0.48 * scale;
  const domeGeom = new THREE.SphereGeometry(0.58 * scale, 20, 16, 0, Math.PI * 2, 0, Math.PI / 1.7);
  const dome = new THREE.Mesh(domeGeom, whiteMat);
  dome.scale.set(1.15, domeHeight, 1.15);
  dome.position.y = 0.25 * scale;
  hatGroup.add(dome);

  // Top pleats / folds
  const pleatTopGeom = new THREE.CylinderGeometry(0.62 * scale, 0.45 * scale, 0.12 * scale, 12);
  const pleatTop = new THREE.Mesh(pleatTopGeom, whiteMat);
  pleatTop.position.y = (0.25 + domeHeight * 0.7) * scale;
  hatGroup.add(pleatTop);

  return hatGroup;
}

/**
 * Creates a charming curved Italian Chef Handlebar Mustache
 */
function createItalianMustache(scale = 1.0, dark = true): THREE.Group {
  const mustacheGroup = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: dark ? 0x1c1917 : 0x78350f,
    roughness: 0.9,
  });

  // Left wing of mustache
  const curveL = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-0.16 * scale, -0.04 * scale, 0.04 * scale),
    new THREE.Vector3(-0.28 * scale, 0.08 * scale, 0.02 * scale),
  ]);
  const geomL = new THREE.TubeGeometry(curveL, 8, 0.055 * scale, 8, false);
  const meshL = new THREE.Mesh(geomL, mat);
  mustacheGroup.add(meshL);

  // Right wing of mustache
  const curveR = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.16 * scale, -0.04 * scale, 0.04 * scale),
    new THREE.Vector3(0.28 * scale, 0.08 * scale, 0.02 * scale),
  ]);
  const geomR = new THREE.TubeGeometry(curveR, 8, 0.055 * scale, 8, false);
  const meshR = new THREE.Mesh(geomR, mat);
  mustacheGroup.add(meshR);

  return mustacheGroup;
}

/**
 * Creates an artisan stone pizza oven hole with toasted crust rim and cheese drops
 */
export function createHoleMesh(index: number, x: number, z: number, theme: string): THREE.Group {
  const holeGroup = new THREE.Group();
  holeGroup.position.set(x, 0, z);
  holeGroup.name = `hole_${index}`;

  // Oven / Pizza theme colors
  let crustColor = 0xd97706; // Golden baked crust
  let innerHoleColor = 0x1c0f08; // Warm deep oven interior
  let cheeseDripColor = 0xfef08a; // Melted mozzarella

  if (theme === 'cyber') {
    crustColor = 0x06b6d4;
    innerHoleColor = 0x020617;
    cheeseDripColor = 0x22d3ee;
  } else if (theme === 'volcano') {
    crustColor = 0x991b1b;
    innerHoleColor = 0x1f0404;
    cheeseDripColor = 0xf97316;
  } else if (theme === 'arcade') {
    crustColor = 0xb45309;
    innerHoleColor = 0x1c1917;
    cheeseDripColor = 0xfde047;
  }

  // 1. Baked Pizza Crust Outer Torus Rim (with dough thickness)
  const crustGeom = new THREE.TorusGeometry(0.88, 0.22, 14, 32);
  const crustMat = new THREE.MeshStandardMaterial({
    color: crustColor,
    roughness: 0.85,
    metalness: theme === 'cyber' ? 0.6 : 0.08,
    emissive: theme === 'cyber' ? 0x0891b2 : 0x000000,
    emissiveIntensity: theme === 'cyber' ? 0.35 : 0,
  });
  const crustMesh = new THREE.Mesh(crustGeom, crustMat);
  crustMesh.rotation.x = Math.PI / 2;
  crustMesh.position.y = 0.09;
  crustMesh.castShadow = true;
  crustMesh.receiveShadow = true;
  holeGroup.add(crustMesh);

  // 2. Melted Mozzarella Cheese drips over the crust ring
  const cheeseGeom = new THREE.TorusGeometry(0.82, 0.06, 8, 24);
  const cheeseMat = new THREE.MeshStandardMaterial({
    color: cheeseDripColor,
    roughness: 0.4,
    emissive: theme === 'volcano' ? 0xf97316 : 0xd97706,
    emissiveIntensity: 0.25,
  });
  const cheeseMesh = new THREE.Mesh(cheeseGeom, cheeseMat);
  cheeseMesh.rotation.x = Math.PI / 2;
  cheeseMesh.position.y = 0.16;
  holeGroup.add(cheeseMesh);

  // 3. Cheese Drip Blobs around the rim
  [0, 1.2, 2.5, 3.8, 5.0].forEach((angle, i) => {
    const dripGeom = new THREE.SphereGeometry(0.06 + (i % 2) * 0.02, 8, 8);
    const drip = new THREE.Mesh(dripGeom, cheeseMat);
    drip.scale.set(1.0, 1.4, 0.9);
    drip.position.set(Math.cos(angle) * 0.9, 0.06, Math.sin(angle) * 0.9);
    holeGroup.add(drip);
  });

  // 4. Pepperoni Slice on edge of the hole
  const pepGeom = new THREE.CylinderGeometry(0.14, 0.14, 0.02, 12);
  const pepMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.6 });
  const pep = new THREE.Mesh(pepGeom, pepMat);
  pep.position.set(0.65, 0.16, 0.65);
  pep.rotation.y = index * 0.7;
  holeGroup.add(pep);

  // 5. Fresh Basil Leaf accent on counter next to hole
  const basilGeom = new THREE.SphereGeometry(0.1, 8, 8);
  const basilMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.5 });
  const basil = new THREE.Mesh(basilGeom, basilMat);
  basil.scale.set(0.5, 0.05, 1.3);
  basil.position.set(-0.75, 0.12, -0.65);
  basil.rotation.y = 0.6 + index * 0.4;
  holeGroup.add(basil);

  // 6. Deep Wood-Fired Oven Chamber Interior
  const cavityGeom = new THREE.CylinderGeometry(0.78, 0.78, 0.5, 24);
  const cavityMat = new THREE.MeshBasicMaterial({ color: innerHoleColor });
  const cavityMesh = new THREE.Mesh(cavityGeom, cavityMat);
  cavityMesh.position.y = -0.2;
  holeGroup.add(cavityMesh);

  // Oven glowing bottom fire embers
  const emberGeom = new THREE.CircleGeometry(0.72, 16);
  const emberMat = new THREE.MeshBasicMaterial({
    color: theme === 'cyber' ? 0x06b6d4 : (theme === 'volcano' ? 0xef4444 : 0x7c2d12),
  });
  const ember = new THREE.Mesh(emberGeom, emberMat);
  ember.rotation.x = -Math.PI / 2;
  ember.position.y = -0.38;
  holeGroup.add(ember);

  return holeGroup;
}

/**
 * Creates the 3D Mole Mesh with full Italian Pizza Chef & Bandit accessories
 */
export function createMoleMesh(type: MoleType, theme: string): THREE.Group {
  const moleGroup = new THREE.Group();
  moleGroup.name = `mole_${type}`;

  // Body Materials based on Mole Type
  let bodyColor = 0x8b5a2b; // standard brown chef mole
  let noseColor = 0xf472b6;
  let bellyColor = 0xffedd5; // Dough apron / belly
  let isMetallic = false;
  let isEmissive = false;
  let emissiveColor = 0x000000;
  let roughness = 0.7;
  let opacity = 1.0;
  let transparent = false;

  if (type === 'fast') {
    bodyColor = 0xd97706; // energetic pizza delivery courier
    noseColor = 0x38bdf8;
    bellyColor = 0xfef08a;
    isEmissive = true;
    emissiveColor = 0xb45309;
    roughness = 0.35;
  } else if (type === 'tough') {
    bodyColor = 0x475569; // tough cast-iron master chef
    noseColor = 0x94a3b8;
    bellyColor = 0x334155;
    isMetallic = true;
    roughness = 0.4;
  } else if (type === 'golden') {
    bodyColor = 0xfbbf24; // 24K parmesan & golden truffle mole
    noseColor = 0xfef08a;
    bellyColor = 0xfde047;
    isMetallic = true;
    roughness = 0.15;
    isEmissive = true;
    emissiveColor = 0xca8a04;
  } else if (type === 'bomb') {
    bodyColor = 0x1c1917; // volcanic dark habanero / forbidden pineapple bomb
    noseColor = 0xef4444;
    bellyColor = 0x450a0a;
    roughness = 0.35;
    isEmissive = true;
    emissiveColor = 0x7f1d1d;
  } else if (type === 'helmet') {
    bodyColor = 0x78350f; // oven hardhat baker
    noseColor = 0xf472b6;
    bellyColor = 0xb45309;
  } else if (type === 'frost') {
    bodyColor = 0x38bdf8; // gelato criogénico mole
    noseColor = 0xe0f2fe;
    bellyColor = 0x7dd3fc;
    isEmissive = true;
    emissiveColor = 0x0284c7;
    roughness = 0.15;
    transparent = true;
    opacity = 0.9;
  } else if (type === 'rainbow') {
    bodyColor = 0xec4899; // cuatro quesos supremo astral
    noseColor = 0xfde047;
    bellyColor = 0xa855f7;
    isEmissive = true;
    emissiveColor = 0x8b5cf6;
    roughness = 0.2;
  } else if (type === 'phantom') {
    bodyColor = 0x818cf8; // vapor de masa madre
    noseColor = 0xc084fc;
    bellyColor = 0x6366f1;
    transparent = true;
    opacity = 0.65;
    isEmissive = true;
    emissiveColor = 0x4f46e5;
    roughness = 0.2;
  } else if (type === 'boss') {
    bodyColor = 0x831843; // Don Quesone - Godfather of the Dough
    noseColor = 0xfbcfe8;
    bellyColor = 0x9d174d;
    isMetallic = true;
    roughness = 0.35;
  }

  const moleScale = type === 'boss' ? 1.4 : 1.0;

  // 1. Mole Body (Capsule / Cylinder)
  const bodyGeom = new THREE.CylinderGeometry(0.55 * moleScale, 0.62 * moleScale, 1.2 * moleScale, 20);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness,
    metalness: isMetallic ? 0.85 : 0.05,
    emissive: isEmissive ? emissiveColor : 0x000000,
    emissiveIntensity: isEmissive ? 0.4 : 0,
    transparent,
    opacity,
  });
  const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
  bodyMesh.position.y = 0.6 * moleScale;
  bodyMesh.castShadow = true;
  bodyMesh.name = 'mole_body';
  moleGroup.add(bodyMesh);

  // 2. Mole Head Top Dome
  const headDomeGeom = new THREE.SphereGeometry(0.55 * moleScale, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const headDomeMesh = new THREE.Mesh(headDomeGeom, bodyMat);
  headDomeMesh.position.y = 1.2 * moleScale;
  headDomeMesh.castShadow = true;
  headDomeMesh.name = 'mole_head';
  moleGroup.add(headDomeMesh);

  // 3. Chef Apron / Dough Patch on Chest
  const bellyGeom = new THREE.CylinderGeometry(0.45 * moleScale, 0.5 * moleScale, 0.7 * moleScale, 16, 1, false, -Math.PI / 3, (2 * Math.PI) / 3);
  const bellyMat = new THREE.MeshStandardMaterial({ color: bellyColor, roughness: 0.8, transparent, opacity });
  const bellyMesh = new THREE.Mesh(bellyGeom, bellyMat);
  bellyMesh.position.set(0, 0.45 * moleScale, 0.12 * moleScale);
  moleGroup.add(bellyMesh);

  // Red Neckerchief / Chef Scarf for standard, tough, boss
  if (type === 'standard' || type === 'boss' || type === 'tough') {
    const scarfGeom = new THREE.TorusGeometry(0.54 * moleScale, 0.06 * moleScale, 8, 20);
    const scarfMat = new THREE.MeshStandardMaterial({ color: type === 'boss' ? 0xd97706 : 0xdc2626, roughness: 0.5 });
    const scarf = new THREE.Mesh(scarfGeom, scarfMat);
    scarf.rotation.x = Math.PI / 2;
    scarf.position.set(0, 0.85 * moleScale, 0.05 * moleScale);
    moleGroup.add(scarf);
  }

  // 4. Snout & Nose
  const snoutGeom = new THREE.SphereGeometry(0.24 * moleScale, 16, 12);
  const snoutMat = new THREE.MeshStandardMaterial({ color: 0xffedd5, roughness: 0.6, transparent, opacity });
  const snoutMesh = new THREE.Mesh(snoutGeom, snoutMat);
  snoutMesh.scale.set(1.1, 0.75, 1.0);
  snoutMesh.position.set(0, 0.95 * moleScale, 0.48 * moleScale);
  moleGroup.add(snoutMesh);

  const noseGeom = new THREE.SphereGeometry(0.1 * moleScale, 12, 10);
  const noseMat = new THREE.MeshStandardMaterial({ color: noseColor, roughness: 0.3 });
  const noseMesh = new THREE.Mesh(noseGeom, noseMat);
  noseMesh.position.set(0, 1.02 * moleScale, 0.68 * moleScale);
  moleGroup.add(noseMesh);

  // 5. Italian Chef Mustache (Added to all pizza chef moles)
  if (type !== 'bomb') {
    const mustache = createItalianMustache(moleScale * (type === 'boss' ? 1.4 : 1.0), type !== 'golden');
    mustache.position.set(0, 0.92 * moleScale, 0.65 * moleScale);
    moleGroup.add(mustache);
  }

  // 6. Cute Buck Teeth
  const toothGeom = new THREE.BoxGeometry(0.08 * moleScale, 0.12 * moleScale, 0.04 * moleScale);
  const toothMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
  const toothL = new THREE.Mesh(toothGeom, toothMat);
  toothL.position.set(-0.05 * moleScale, 0.8 * moleScale, 0.55 * moleScale);
  moleGroup.add(toothL);

  const toothR = new THREE.Mesh(toothGeom, toothMat);
  toothR.position.set(0.05 * moleScale, 0.8 * moleScale, 0.55 * moleScale);
  moleGroup.add(toothR);

  // 7. Eyes
  const eyeWhiteGeom = new THREE.SphereGeometry(0.11 * moleScale, 12, 12);
  const eyeWhiteMat = new THREE.MeshStandardMaterial({
    color: type === 'bomb' ? 0xff0000 : 0xffffff,
    emissive: type === 'bomb' ? 0xff0000 : 0x000000,
    emissiveIntensity: type === 'bomb' ? 0.6 : 0,
    roughness: 0.1,
  });
  const eyePupilGeom = new THREE.SphereGeometry(0.055 * moleScale, 10, 10);
  const eyePupilMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.1 });

  const eyeL = new THREE.Mesh(eyeWhiteGeom, eyeWhiteMat);
  eyeL.position.set(-0.24 * moleScale, 1.15 * moleScale, 0.42 * moleScale);
  const pupilL = new THREE.Mesh(eyePupilGeom, eyePupilMat);
  pupilL.position.set(-0.24 * moleScale, 1.15 * moleScale, 0.51 * moleScale);
  moleGroup.add(eyeL);
  moleGroup.add(pupilL);

  const eyeR = new THREE.Mesh(eyeWhiteGeom, eyeWhiteMat);
  eyeR.position.set(0.24 * moleScale, 1.15 * moleScale, 0.42 * moleScale);
  const pupilR = new THREE.Mesh(eyePupilGeom, eyePupilMat);
  pupilR.position.set(0.24 * moleScale, 1.15 * moleScale, 0.51 * moleScale);
  moleGroup.add(eyeR);
  moleGroup.add(pupilR);

  // 8. Ears
  const earGeom = new THREE.SphereGeometry(0.15 * moleScale, 12, 10);
  const earL = new THREE.Mesh(earGeom, bodyMat);
  earL.scale.set(0.6, 1.0, 0.6);
  earL.position.set(-0.48 * moleScale, 1.32 * moleScale, 0.05 * moleScale);
  earL.rotation.z = -0.3;
  moleGroup.add(earL);

  const earR = new THREE.Mesh(earGeom, bodyMat);
  earR.scale.set(0.6, 1.0, 0.6);
  earR.position.set(0.48 * moleScale, 1.32 * moleScale, 0.05 * moleScale);
  earR.rotation.z = 0.3;
  moleGroup.add(earR);

  // 9. Hands / Paws holding kitchen items
  const pawGeom = new THREE.SphereGeometry(0.14 * moleScale, 12, 10);
  const pawL = new THREE.Mesh(pawGeom, snoutMat);
  pawL.position.set(-0.42 * moleScale, 0.25 * moleScale, 0.52 * moleScale);
  moleGroup.add(pawL);

  const pawR = new THREE.Mesh(pawGeom, snoutMat);
  pawR.position.set(0.42 * moleScale, 0.25 * moleScale, 0.52 * moleScale);
  moleGroup.add(pawR);

  // =========================================================================
  // 10. UNIQUE PIZZA THEMED ACCESSORIES PER MOLE SPECIES
  // =========================================================================

  // --- STANDARD MOLE: Authentic White Chef's Toque Blanche & Red Neckerchief ---
  if (type === 'standard') {
    const chefHat = createChefHat(1.0);
    chefHat.position.set(0, 1.45, 0.05);
    moleGroup.add(chefHat);
  }

  // --- FAST MOLE: "Repartidor Exprés" (Pizza Delivery Visor, Checkered Goggles & Mini Pizza Box) ---
  else if (type === 'fast') {
    // Red Pizza Delivery Visor Cap
    const capGeom = new THREE.SphereGeometry(0.58, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const capMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
    const cap = new THREE.Mesh(capGeom, capMat);
    cap.position.set(0, 1.3, 0.02);
    moleGroup.add(cap);

    // Visor Bill pointing forward
    const billGeom = new THREE.BoxGeometry(0.6, 0.04, 0.4);
    const bill = new THREE.Mesh(billGeom, capMat);
    bill.position.set(0, 1.3, 0.55);
    bill.rotation.x = 0.15;
    moleGroup.add(bill);

    // Cyan Delivery Goggles
    const goggleGeom = new THREE.BoxGeometry(0.68, 0.2, 0.15);
    const goggleMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0x0891b2,
      emissiveIntensity: 0.8,
    });
    const goggleMesh = new THREE.Mesh(goggleGeom, goggleMat);
    goggleMesh.position.set(0, 1.16, 0.44);
    moleGroup.add(goggleMesh);

    // Mini Pizza Box Backpack on back
    const boxGeom = new THREE.BoxGeometry(0.65, 0.12, 0.65);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.8 });
    const box = new THREE.Mesh(boxGeom, boxMat);
    box.position.set(0, 0.6, -0.65);
    moleGroup.add(box);
  }

  // --- TOUGH MOLE: "Chef Sartén de Hierro" (Heavy Cast-Iron Skillet Helmet & 3-Pip Health Bar) ---
  else if (type === 'tough') {
    // Cast-iron frying pan upside down as a helmet
    const panGeom = new THREE.CylinderGeometry(0.65, 0.6, 0.22, 18);
    const panMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.95,
      roughness: 0.2,
    });
    const pan = new THREE.Mesh(panGeom, panMat);
    pan.position.set(0, 1.45, 0);
    pan.name = 'tough_pan_helmet';
    moleGroup.add(pan);

    // Long pan handle sticking out to the right
    const panHandleGeom = new THREE.CylinderGeometry(0.06, 0.07, 0.7, 10);
    const panHandle = new THREE.Mesh(panHandleGeom, panMat);
    panHandle.rotation.z = Math.PI / 2;
    panHandle.position.set(0.95, 1.45, 0);
    moleGroup.add(panHandle);

    // Iron Chef Apron Armor Plate
    const apronGeom = new THREE.BoxGeometry(0.65, 0.55, 0.08);
    const apron = new THREE.Mesh(apronGeom, panMat);
    apron.position.set(0, 0.45, 0.6);
    moleGroup.add(apron);

    // 3-Pip 3D Floating Health Bar
    const healthGroup = new THREE.Group();
    healthGroup.name = 'health_bar_group';
    healthGroup.position.set(0, 1.95, 0);

    const barBg = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.08), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
    healthGroup.add(barBg);

    [-0.2, 0, 0.2].forEach((xOffset, i) => {
      const pip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.1), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
      pip.position.set(xOffset, 0, 0.01);
      pip.name = `health_pip_${i}`;
      healthGroup.add(pip);
    });

    moleGroup.add(healthGroup);
  }

  // --- HELMET MOLE: "Maestro Hornero" (Cheese Grater & Oven Hardhat with 2-Pip Health Bar) ---
  else if (type === 'helmet') {
    const helmetGeom = new THREE.SphereGeometry(0.62, 18, 14, 0, Math.PI * 2, 0, Math.PI / 1.7);
    const helmetMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.6,
      roughness: 0.3,
    });
    const helmetMesh = new THREE.Mesh(helmetGeom, helmetMat);
    helmetMesh.position.set(0, 1.25, 0.02);
    helmetMesh.rotation.x = -0.15;
    moleGroup.add(helmetMesh);

    // Brim
    const brimGeom = new THREE.TorusGeometry(0.63, 0.06, 8, 20);
    const brimMesh = new THREE.Mesh(brimGeom, helmetMat);
    brimMesh.rotation.x = Math.PI / 2 - 0.15;
    brimMesh.position.set(0, 1.15, 0.05);
    moleGroup.add(brimMesh);

    // Front Oven Baker Lantern
    const lampGeom = new THREE.CylinderGeometry(0.08, 0.1, 0.08, 10);
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfacc15,
      emissiveIntensity: 0.8,
    });
    const lamp = new THREE.Mesh(lampGeom, lampMat);
    lamp.rotation.x = Math.PI / 2;
    lamp.position.set(0, 1.32, 0.58);
    moleGroup.add(lamp);

    // 2-Pip Health Bar
    const healthGroup = new THREE.Group();
    healthGroup.name = 'health_bar_group';
    healthGroup.position.set(0, 1.8, 0);

    const barBg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.09, 0.08), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
    healthGroup.add(barBg);

    [-0.12, 0.12].forEach((xOffset, i) => {
      const pip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.1), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
      pip.position.set(xOffset, 0, 0.01);
      pip.name = `health_pip_${i}`;
      healthGroup.add(pip);
    });

    moleGroup.add(healthGroup);
  }

  // --- GOLDEN MOLE: "Trufa de Oro 24K & Parmesano Real" (Melted Gold Cheese & Tiara) ---
  else if (type === 'golden') {
    // Golden Pizza Slice Medallion on Chest
    const medalGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.04, 16);
    const medalMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      metalness: 0.98,
      roughness: 0.1,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.6,
    });
    const medal = new THREE.Mesh(medalGeom, medalMat);
    medal.rotation.x = Math.PI / 2;
    medal.position.set(0, 0.48, 0.6);
    moleGroup.add(medal);

    // 24K Golden Parmesan Wheel Crown
    const tiaraGeom = new THREE.CylinderGeometry(0.42, 0.35, 0.25, 8, 1, true);
    const tiara = new THREE.Mesh(tiaraGeom, medalMat);
    tiara.position.set(0, 1.55, 0);
    tiara.name = 'golden_tiara';
    moleGroup.add(tiara);
  }

  // --- RAINBOW MOLE: "Cuatro Quesos Supremo" (Galaxy Four-Cheese Star & Orbiting Gems) ---
  else if (type === 'rainbow') {
    const starGeom = new THREE.OctahedronGeometry(0.26, 0);
    const starMat = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      metalness: 0.2,
      roughness: 0.1,
      emissive: 0xc084fc,
      emissiveIntensity: 0.8,
    });
    const star = new THREE.Mesh(starGeom, starMat);
    star.position.set(0, 1.7, 0);
    star.name = 'crystal_star_rainbow';
    moleGroup.add(star);

    // Orbiting Pizza Topping Gems
    const gemColors = [0xef4444, 0xfacc15, 0x10b981];
    gemColors.forEach((color, i) => {
      const gem = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.09, 0),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.7 })
      );
      gem.position.set(Math.cos((i * Math.PI * 2) / 3) * 0.65, 1.4, Math.sin((i * Math.PI * 2) / 3) * 0.65);
      gem.name = `prismatic_gem_${i}`;
      moleGroup.add(gem);
    });
  }

  // --- PHANTOM MOLE: "Vapor de Masa Madre" (Aromas of Fresh Baked Pizza) ---
  else if (type === 'phantom') {
    const ringGeom = new THREE.TorusGeometry(0.68, 0.04, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xa5b4fc, transparent: true, opacity: 0.7 });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 1.0, 0);
    ring.name = 'phantom_ring';
    moleGroup.add(ring);
  }

  // --- BOMB MOLE: "Piña Prohibida / Chile Habanero Explosivo" (Fiery Fuse & Warning Skull Eyes) ---
  else if (type === 'bomb') {
    // Volcanic Pepper / Bomb Top Stem
    const stemGeom = new THREE.CylinderGeometry(0.12, 0.18, 0.15, 10);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
    const stem = new THREE.Mesh(stemGeom, stemMat);
    stem.position.set(0, 1.42, 0);
    moleGroup.add(stem);

    // Burning Spark Fuse
    const fuseCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.48, 0),
      new THREE.Vector3(0.08, 1.65, 0.04),
      new THREE.Vector3(0.02, 1.82, -0.02),
    ]);
    const fuseGeom = new THREE.TubeGeometry(fuseCurve, 8, 0.035, 6, false);
    const fuseMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9 });
    const fuseMesh = new THREE.Mesh(fuseGeom, fuseMat);
    moleGroup.add(fuseMesh);

    const sparkGeom = new THREE.SphereGeometry(0.1, 8, 8);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
    const sparkMesh = new THREE.Mesh(sparkGeom, sparkMat);
    sparkMesh.position.set(0.02, 1.84, -0.02);
    sparkMesh.name = 'bomb_spark';
    moleGroup.add(sparkMesh);
  }

  // --- FROST MOLE: "Gelato Criogénico" (Mint Leaf & 3 Floating Ice Shards) ---
  else if (type === 'frost') {
    // Mint leaf on head
    const mintLeaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.4 })
    );
    mintLeaf.scale.set(0.6, 0.08, 1.2);
    mintLeaf.position.set(0, 1.5, 0);
    mintLeaf.rotation.x = 0.4;
    moleGroup.add(mintLeaf);

    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const crystalGeom = new THREE.OctahedronGeometry(0.14, 0);
      const crystalMat = new THREE.MeshStandardMaterial({
        color: 0xe0f2fe,
        metalness: 0.3,
        roughness: 0.1,
        transparent: true,
        opacity: 0.85,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.4,
      });
      const crystal = new THREE.Mesh(crystalGeom, crystalMat);
      crystal.position.set(Math.cos(angle) * 0.65, 1.35 + i * 0.1, Math.sin(angle) * 0.65);
      crystal.name = `frost_crystal_${i}`;
      moleGroup.add(crystal);
    }
  }

  // --- BOSS MOLE: "Don Quesone - El Padrino de la Masa" (Imperial Toque, Golden Pizza Medallion & 5-Pip Health Bar) ---
  else if (type === 'boss') {
    // Imperial Grand Chef Toque Blanche with Italian Tricolor Ribbon
    const imperialHat = createChefHat(1.4, true);
    imperialHat.position.set(0, 1.7 * moleScale, 0);
    imperialHat.name = 'boss_crown';
    moleGroup.add(imperialHat);

    // Large Golden Pizza Cutter Badge on Chest
    const badgeGeom = new THREE.CylinderGeometry(0.24 * moleScale, 0.24 * moleScale, 0.05, 18);
    const badgeMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.95,
      roughness: 0.15,
      emissive: 0xeab308,
      emissiveIntensity: 0.5,
    });
    const badge = new THREE.Mesh(badgeGeom, badgeMat);
    badge.rotation.x = Math.PI / 2;
    badge.position.set(0, 0.55 * moleScale, 0.65 * moleScale);
    moleGroup.add(badge);

    // 5-Pip Boss 3D Health Bar
    const healthGroup = new THREE.Group();
    healthGroup.name = 'health_bar_group';
    healthGroup.position.set(0, 2.45 * moleScale, 0);

    const barBg = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.14, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x0f172a })
    );
    healthGroup.add(barBg);

    [-0.44, -0.22, 0, 0.22, 0.44].forEach((xOffset, i) => {
      const pip = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.1, 0.12),
        new THREE.MeshBasicMaterial({ color: 0xef4444 })
      );
      pip.position.set(xOffset, 0, 0.01);
      pip.name = `health_pip_${i}`;
      healthGroup.add(pip);
    });

    moleGroup.add(healthGroup);
  }

  return moleGroup;
}

/**
 * Updates 3D health pips above multi-hit moles (Tough, Helmet, Boss)
 */
export function updateMole3DHealth(moleGroup: THREE.Group, currentHp: number, maxHp: number) {
  const healthGroup = moleGroup.getObjectByName('health_bar_group');
  if (!healthGroup) return;

  for (let i = 0; i < maxHp; i++) {
    const pip = healthGroup.getObjectByName(`health_pip_${i}`) as THREE.Mesh | undefined;
    if (pip && pip.material instanceof THREE.MeshBasicMaterial) {
      if (i < currentHp) {
        // Active HP Pip
        if (currentHp === 1) {
          pip.material.color.setHex(0xef4444); // red when critical
        } else if (currentHp === 2 && maxHp > 2) {
          pip.material.color.setHex(0xf59e0b); // orange/amber
        } else {
          pip.material.color.setHex(maxHp >= 5 ? 0xdc2626 : 0x22c55e); // red for boss or green
        }
        pip.scale.set(1, 1, 1);
      } else {
        // Depleted Pip
        pip.material.color.setHex(0x334155);
        pip.scale.set(0.7, 0.5, 0.7);
      }
    }
  }
}


