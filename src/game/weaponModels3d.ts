import * as THREE from 'three';

/**
 * ============================================================================
 * UPGRADED PROCEDURAL PBR FIRST-PERSON WEAPON LIBRARY (ALL 10 BASE WEAPONS)
 * ============================================================================
 * - Shared procedural CanvasTexture PBR materials (sRGB albedo, linear roughness/bump, anisotropy)
 * - Hollow open-window reflex & holographic optics (never opaque bricks blocking ADS)
 * - Sculpted tactical operator gloves, curled fingers, knuckle armor & forearms
 * - Articulated bolts, charging handles, slides, pumps & shell carriers
 * - Preserves exact gameplay muzzle positions & weapon scales
 * - Full deterministic .dispose() cleanup, zero external asset fetches
 */

export interface WeaponModelResult {
  group: THREE.Group;
  mag: THREE.Object3D | null;
  bolt?: THREE.Object3D | null;
  boltRestZ?: number;
  boltTravelZ?: number;
  slide?: THREE.Object3D | null;
  slideRestZ?: number;
  pump?: THREE.Object3D | null;
  pumpRestZ?: number;
  bladePivot?: THREE.Group | null;
  muzzlePos: THREE.Vector3;
  dispose: () => void;
}

export interface WeaponMaterialLibrary {
  gunmetal: THREE.MeshStandardMaterial;
  gunmetalLight: THREE.MeshStandardMaterial;
  brushedSteel: THREE.MeshStandardMaterial;
  polymer: THREE.MeshStandardMaterial;
  olivePolymer: THREE.MeshStandardMaterial;
  walnutWood: THREE.MeshStandardMaterial;
  bakelite: THREE.MeshStandardMaterial;
  chrome: THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
  brass: THREE.MeshStandardMaterial;
  copper: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  glove: THREE.MeshStandardMaterial;
  gloveKnuckle: THREE.MeshStandardMaterial;
  sleeve: THREE.MeshStandardMaterial;
  opticGlass: THREE.MeshStandardMaterial;
  scopeLens: THREE.MeshStandardMaterial;
  shellRed: THREE.MeshStandardMaterial;
  warheadOlive: THREE.MeshStandardMaterial;
  warheadStripe: THREE.MeshStandardMaterial;
  reticleGreen: THREE.MeshBasicMaterial;
  reticleRed: THREE.MeshBasicMaterial;
  reticleCyan: THREE.MeshBasicMaterial;
  reticleAmber: THREE.MeshBasicMaterial;
  tritiumGlow: THREE.MeshBasicMaterial;
  katanaEdge: THREE.MeshBasicMaterial;
  dispose: () => void;
}

// ---------------------------------------------------------------------------
// 1. PROCEDURAL PBR CANVAS TEXTURES (Anodized Metal, Brushed Steel, Polymer, Wood, Glove)
// ---------------------------------------------------------------------------

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.min(8, Math.max(1, maxAnisotropy));
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.needsUpdate = true;
  return tex;
}

function createGunmetalMaps(maxAnisotropy: number) {
  const [aCan, aCtx] = makeCanvas(256, 256);
  const [rCan, rCtx] = makeCanvas(256, 256);

  if (aCtx && rCtx) {
    const grad = aCtx.createLinearGradient(0, 0, 256, 256);
    grad.addColorStop(0, '#1f252e');
    grad.addColorStop(0.5, '#2b323d');
    grad.addColorStop(1, '#1a1f27');
    aCtx.fillStyle = grad;
    aCtx.fillRect(0, 0, 256, 256);

    rCtx.fillStyle = '#5c5c5c';
    rCtx.fillRect(0, 0, 256, 256);

    // Subtle directional CNC brushed grain + worn chamfer highlights
    for (let y = 0; y < 256; y += 2) {
      const shade = 28 + ((y * 19) % 18);
      aCtx.fillStyle = `rgba(${shade + 22}, ${shade + 28}, ${shade + 36}, 0.16)`;
      aCtx.fillRect(0, y, 256, 1);

      const rough = 76 + ((y * 29) % 36);
      rCtx.fillStyle = `rgb(${rough},${rough},${rough})`;
      rCtx.fillRect(0, y, 256, 1);
    }

    // Subtle machined panel seam & rivets
    aCtx.strokeStyle = 'rgba(8, 10, 14, 0.55)';
    aCtx.lineWidth = 2;
    aCtx.strokeRect(10, 10, 236, 236);
    aCtx.strokeStyle = 'rgba(180, 198, 220, 0.14)';
    aCtx.lineWidth = 1;
    aCtx.strokeRect(12, 12, 232, 232);

    // Subtle micro-speckle parkerized coat
    for (let i = 0; i < 650; i++) {
      const x = (i * 73) % 256;
      const y = (i * 137) % 256;
      aCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.06)';
      aCtx.fillRect(x, y, 2, 1);
    }
  }

  return {
    albedo: finalizeTexture(aCan, true, maxAnisotropy, 1.5, 1.5),
    roughness: finalizeTexture(rCan, false, maxAnisotropy, 1.5, 1.5),
  };
}

function createBrushedSteelMaps(maxAnisotropy: number) {
  const [aCan, aCtx] = makeCanvas(256, 128);
  const [rCan, rCtx] = makeCanvas(256, 128);

  if (aCtx && rCtx) {
    const grad = aCtx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, '#788496');
    grad.addColorStop(0.5, '#96a4b8');
    grad.addColorStop(1, '#687486');
    aCtx.fillStyle = grad;
    aCtx.fillRect(0, 0, 256, 128);

    rCtx.fillStyle = '#444444';
    rCtx.fillRect(0, 0, 256, 128);

    for (let y = 0; y < 128; y++) {
      const v = (y * 37) % 25;
      aCtx.fillStyle = `rgba(255, 255, 255, ${0.03 + v * 0.004})`;
      aCtx.fillRect(0, y, 256, 1);
      const r = 46 + ((y * 53) % 40);
      rCtx.fillStyle = `rgb(${r},${r},${r})`;
      rCtx.fillRect(0, y, 256, 1);
    }
  }

  return {
    albedo: finalizeTexture(aCan, true, maxAnisotropy, 2, 1),
    roughness: finalizeTexture(rCan, false, maxAnisotropy, 2, 1),
  };
}

function createPolymerStippleMaps(baseHex: string, darkHex: string, maxAnisotropy: number) {
  const [aCan, aCtx] = makeCanvas(128, 128);
  const [rCan, rCtx] = makeCanvas(128, 128);

  if (aCtx && rCtx) {
    aCtx.fillStyle = baseHex;
    aCtx.fillRect(0, 0, 128, 128);
    rCtx.fillStyle = '#b4b4b4';
    rCtx.fillRect(0, 0, 128, 128);

    // Fine diamond tactical stippling grid
    aCtx.strokeStyle = darkHex;
    aCtx.lineWidth = 1;
    rCtx.strokeStyle = '#d4d4d4';
    rCtx.lineWidth = 1;
    for (let i = -128; i < 256; i += 8) {
      aCtx.beginPath();
      aCtx.moveTo(i, 0);
      aCtx.lineTo(i + 128, 128);
      aCtx.stroke();
      aCtx.beginPath();
      aCtx.moveTo(i + 128, 0);
      aCtx.lineTo(i, 128);
      aCtx.stroke();

      rCtx.beginPath();
      rCtx.moveTo(i, 0);
      rCtx.lineTo(i + 128, 128);
      rCtx.stroke();
    }

    for (let i = 0; i < 420; i++) {
      const x = (i * 47) % 128;
      const y = (i * 89) % 128;
      aCtx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.075)';
      aCtx.fillRect(x, y, 2, 2);
    }
  }

  return {
    albedo: finalizeTexture(aCan, true, maxAnisotropy, 3, 3),
    roughness: finalizeTexture(rCan, false, maxAnisotropy, 3, 3),
  };
}

function createWalnutWoodMaps(maxAnisotropy: number) {
  const [aCan, aCtx] = makeCanvas(256, 128);
  const [rCan, rCtx] = makeCanvas(256, 128);

  if (aCtx && rCtx) {
    const grad = aCtx.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0, '#61341a');
    grad.addColorStop(0.35, '#7e4724');
    grad.addColorStop(0.7, '#582e16');
    grad.addColorStop(1, '#713e1f');
    aCtx.fillStyle = grad;
    aCtx.fillRect(0, 0, 256, 128);

    rCtx.fillStyle = '#929292';
    rCtx.fillRect(0, 0, 256, 128);

    // Rich organic wood grain ribbons
    for (let y = 0; y < 128; y += 2) {
      aCtx.strokeStyle = y % 6 === 0 ? 'rgba(34, 15, 6, 0.42)' : 'rgba(164, 102, 52, 0.2)';
      aCtx.lineWidth = y % 8 === 0 ? 1.8 : 1;
      aCtx.beginPath();
      for (let x = 0; x <= 256; x += 16) {
        const wave = Math.sin(x * 0.045 + y * 0.14) * 3.5 + Math.cos(x * 0.02 - y * 0.08) * 2.2;
        if (x === 0) aCtx.moveTo(x, y + wave);
        else aCtx.lineTo(x, y + wave);
      }
      aCtx.stroke();

      const rv = 128 + ((y * 23) % 44);
      rCtx.fillStyle = `rgb(${rv},${rv},${rv})`;
      rCtx.fillRect(0, y, 256, 2);
    }
  }

  return {
    albedo: finalizeTexture(aCan, true, maxAnisotropy, 1.4, 1),
    roughness: finalizeTexture(rCan, false, maxAnisotropy, 1.4, 1),
  };
}

function createGloveFabricMap(maxAnisotropy: number, baseHex: string, weaveHex: string) {
  const [c, ctx] = makeCanvas(128, 128);
  if (ctx) {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = weaveHex;
    for (let y = 0; y < 128; y += 4) {
      for (let x = 0; x < 128; x += 4) {
        if (((x + y) >> 2) % 2 === 0) {
          ctx.fillRect(x, y, 2, 2);
        }
      }
    }
  }
  return finalizeTexture(c, true, maxAnisotropy, 3, 3);
}

export function createWeaponMaterialLibrary(maxAnisotropy = 4): WeaponMaterialLibrary {
  const ownedTextures: THREE.Texture[] = [];
  const ownedMaterials: THREE.Material[] = [];

  const trackTex = <T extends THREE.Texture>(t: T): T => {
    ownedTextures.push(t);
    return t;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    ownedMaterials.push(m);
    return m;
  };

  const gunmetalMaps = createGunmetalMaps(maxAnisotropy);
  trackTex(gunmetalMaps.albedo);
  trackTex(gunmetalMaps.roughness);

  const steelMaps = createBrushedSteelMaps(maxAnisotropy);
  trackTex(steelMaps.albedo);
  trackTex(steelMaps.roughness);

  const darkPolyMaps = createPolymerStippleMaps('#202630', 'rgba(7, 9, 13, 0.55)', maxAnisotropy);
  trackTex(darkPolyMaps.albedo);
  trackTex(darkPolyMaps.roughness);

  const olivePolyMaps = createPolymerStippleMaps('#3d4b37', 'rgba(22, 28, 19, 0.45)', maxAnisotropy);
  trackTex(olivePolyMaps.albedo);
  trackTex(olivePolyMaps.roughness);

  const woodMaps = createWalnutWoodMaps(maxAnisotropy);
  trackTex(woodMaps.albedo);
  trackTex(woodMaps.roughness);

  const gloveTex = trackTex(createGloveFabricMap(maxAnisotropy, '#191d24', 'rgba(255,255,255,0.045)'));
  const sleeveTex = trackTex(createGloveFabricMap(maxAnisotropy, '#29323d', 'rgba(12,16,22,0.22)'));

  const gunmetal = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: gunmetalMaps.albedo,
      roughnessMap: gunmetalMaps.roughness,
      metalness: 0.86,
      roughness: 0.42,
    })
  );

  const gunmetalLight = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      map: gunmetalMaps.albedo,
      roughnessMap: gunmetalMaps.roughness,
      metalness: 0.82,
      roughness: 0.36,
    })
  );

  const brushedSteel = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: steelMaps.albedo,
      roughnessMap: steelMaps.roughness,
      metalness: 0.92,
      roughness: 0.28,
    })
  );

  const polymer = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: darkPolyMaps.albedo,
      roughnessMap: darkPolyMaps.roughness,
      metalness: 0.16,
      roughness: 0.78,
    })
  );

  const olivePolymer = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: olivePolyMaps.albedo,
      roughnessMap: olivePolyMaps.roughness,
      metalness: 0.14,
      roughness: 0.74,
    })
  );

  const walnutWood = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: woodMaps.albedo,
      roughnessMap: woodMaps.roughness,
      metalness: 0.05,
      roughness: 0.62,
    })
  );

  const bakelite = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x8f3e21,
      map: woodMaps.albedo,
      roughness: 0.48,
      metalness: 0.12,
    })
  );

  const chrome = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe6edf5,
      roughnessMap: steelMaps.roughness,
      metalness: 0.96,
      roughness: 0.16,
    })
  );

  const gold = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe0b243,
      roughnessMap: steelMaps.roughness,
      metalness: 0.94,
      roughness: 0.2,
    })
  );

  const brass = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd4a448,
      metalness: 0.88,
      roughness: 0.26,
    })
  );

  const copper = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xc76b3b,
      metalness: 0.86,
      roughness: 0.3,
    })
  );

  const rubber = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x111419,
      metalness: 0.04,
      roughness: 0.92,
    })
  );

  const glove = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: gloveTex,
      metalness: 0.1,
      roughness: 0.82,
    })
  );

  const gloveKnuckle = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2a313c,
      metalness: 0.38,
      roughness: 0.48,
    })
  );

  const sleeve = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: sleeveTex,
      metalness: 0.04,
      roughness: 0.9,
    })
  );

  const opticGlass = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      emissive: new THREE.Color(0x0891b2),
      emissiveIntensity: 0.18,
      metalness: 0.2,
      roughness: 0.08,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );

  const scopeLens = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e3a8a,
      emissive: new THREE.Color(0x0284c7),
      emissiveIntensity: 0.35,
      metalness: 0.85,
      roughness: 0.06,
    })
  );

  const shellRed = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      metalness: 0.12,
      roughness: 0.38,
    })
  );

  const warheadOlive = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3b4932,
      metalness: 0.38,
      roughness: 0.52,
    })
  );

  const warheadStripe = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xeab308,
      metalness: 0.2,
      roughness: 0.45,
    })
  );

  const reticleGreen = trackMat(new THREE.MeshBasicMaterial({ color: 0x22ff88 }));
  const reticleRed = trackMat(new THREE.MeshBasicMaterial({ color: 0xff3b54 }));
  const reticleCyan = trackMat(new THREE.MeshBasicMaterial({ color: 0x22e8ff }));
  const reticleAmber = trackMat(new THREE.MeshBasicMaterial({ color: 0xffb020 }));
  const tritiumGlow = trackMat(new THREE.MeshBasicMaterial({ color: 0x4ade80 }));
  const katanaEdge = trackMat(new THREE.MeshBasicMaterial({ color: 0x7dd3fc }));

  return {
    gunmetal,
    gunmetalLight,
    brushedSteel,
    polymer,
    olivePolymer,
    walnutWood,
    bakelite,
    chrome,
    gold,
    brass,
    copper,
    rubber,
    glove,
    gloveKnuckle,
    sleeve,
    opticGlass,
    scopeLens,
    shellRed,
    warheadOlive,
    warheadStripe,
    reticleGreen,
    reticleRed,
    reticleCyan,
    reticleAmber,
    tritiumGlow,
    katanaEdge,
    dispose: () => {
      for (let i = 0; i < ownedMaterials.length; i++) ownedMaterials[i].dispose();
      for (let i = 0; i < ownedTextures.length; i++) ownedTextures[i].dispose();
    },
  };
}

// ---------------------------------------------------------------------------
// 2. SHARED SCULPTED COMPOSITE BUILDERS (Gloved Hands, Open-Window Optics, Rails)
// ---------------------------------------------------------------------------

interface HandPlacement {
  rightPos: [number, number, number];
  rightRot?: [number, number, number];
  leftPos?: [number, number, number];
  leftRot?: [number, number, number];
  leftArmPos?: [number, number, number];
  leftArmRot?: [number, number, number];
  rightArmPos?: [number, number, number];
  rightArmRot?: [number, number, number];
  twoHandedPistol?: boolean;
}

/**
 * Builds sculpted tactical operator gloves (palm, curled fingers, thumb, carbon knuckle guard,
 * wrist cuff + tactical field watch on left wrist) and angled forearm sleeves.
 * Exported so Legendary/Mythic weapons can share the same upgraded hands.
 */
export function buildSculptedTacticalHands(
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  gloveMat: THREE.Material,
  sleeveMat: THREE.Material,
  knuckleMat: THREE.Material,
  placement: HandPlacement
): THREE.Group {
  const handsGroup = new THREE.Group();

  // Right Hand (firing grip)
  const rGroup = new THREE.Group();
  rGroup.position.set(...placement.rightPos);
  if (placement.rightRot) rGroup.rotation.set(...placement.rightRot);

  const rPalm = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.052, 0.06, 0.068)), gloveMat);
  const rKnuckle = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.055, 0.016, 0.038)), knuckleMat);
  rKnuckle.position.set(0.002, 0.02, -0.014);
  // Curled grip fingers wrapping the front strap
  const rFingers = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.048, 0.044, 0.022)), gloveMat);
  rFingers.position.set(-0.003, -0.008, -0.038);
  rFingers.rotation.x = 0.22;
  // Thumb resting along upper side
  const rThumb = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.02, 0.02, 0.046)), gloveMat);
  rThumb.position.set(-0.026, 0.022, -0.006);
  rThumb.rotation.set(0.18, 0.25, 0.2);
  // Wrist cuff
  const rCuff = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.032, 0.036, 0.045, 10)), knuckleMat);
  rCuff.rotation.x = Math.PI / 2;
  rCuff.position.set(0.006, -0.014, 0.052);
  rGroup.add(rPalm, rKnuckle, rFingers, rThumb, rCuff);

  // Right forearm extending back off-camera
  const rArm = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.034, 0.042, 0.22, 10)), sleeveMat);
  rArm.rotation.x = Math.PI / 2;
  if (placement.rightArmPos) {
    rArm.position.set(...placement.rightArmPos);
    if (placement.rightArmRot) rArm.rotation.set(...placement.rightArmRot);
    handsGroup.add(rArm);
  } else {
    rArm.position.set(0.036, -0.055, 0.165);
    rArm.rotation.set(Math.PI / 2 + 0.24, 0, -0.22);
    rGroup.add(rArm);
  }
  handsGroup.add(rGroup);

  // Optional Left Support Hand & Forearm
  if (placement.leftPos) {
    const lGroup = new THREE.Group();
    lGroup.position.set(...placement.leftPos);
    if (placement.leftRot) lGroup.rotation.set(...placement.leftRot);

    const lPalm = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(placement.twoHandedPistol ? 0.054 : 0.06, 0.048, 0.074)),
      gloveMat
    );
    const lKnuckle = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.062, 0.015, 0.042)), knuckleMat);
    lKnuckle.position.set(-0.005, -0.014, -0.012);
    // Support fingers curling up right side of forend
    const lFingers = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.022, 0.042, 0.058)), gloveMat);
    lFingers.position.set(0.03, 0.01, -0.006);
    lFingers.rotation.z = -0.22;
    // Left thumb high clamp along left rail
    const lThumb = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.02, 0.022, 0.05)), gloveMat);
    lThumb.position.set(-0.028, 0.022, -0.008);
    lThumb.rotation.set(-0.12, -0.18, -0.15);
    // Wrist cuff + tactical watch bezel
    const lCuff = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.032, 0.036, 0.042, 10)), knuckleMat);
    lCuff.rotation.x = Math.PI / 2;
    lCuff.position.set(-0.014, -0.014, 0.052);
    const watchBezel = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.013, 0.013, 0.008, 12)), knuckleMat);
    watchBezel.position.set(-0.028, 0.012, 0.048);
    watchBezel.rotation.z = 0.55;
    lGroup.add(lPalm, lKnuckle, lFingers, lThumb, lCuff, watchBezel);
    handsGroup.add(lGroup);

    const lArm = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.034, 0.043, 0.26, 10)), sleeveMat);
    if (placement.leftArmPos) {
      lArm.position.set(...placement.leftArmPos);
    } else {
      lArm.position.set(
        placement.leftPos[0] - 0.082,
        placement.leftPos[1] - 0.088,
        placement.leftPos[2] + 0.14
      );
    }
    if (placement.leftArmRot) {
      lArm.rotation.set(...placement.leftArmRot);
    } else {
      lArm.rotation.set(Math.PI / 2 + 0.34, 0, 0.36);
    }
    handsGroup.add(lArm);
  }

  return handsGroup;
}

/**
 * Builds a true hollow open-window reflex / holographic optic.
 * Guarantees an unobstructed transparent aperture so ADS aims cleanly through the reticle!
 */
function buildOpenReflexOptic(
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  mats: WeaponMaterialLibrary,
  reticleMat: THREE.Material,
  style: 'reflex' | 'holo' | 'micro'
): { group: THREE.Group; reticleLocalY: number } {
  const g = new THREE.Group();

  const w = style === 'holo' ? 0.046 : style === 'micro' ? 0.034 : 0.04;
  const h = style === 'holo' ? 0.038 : style === 'micro' ? 0.028 : 0.033;
  const d = style === 'holo' ? 0.068 : style === 'micro' ? 0.044 : 0.054;
  const wallT = 0.0052;
  const baseH = 0.012;

  // Rail clamp base + locking screw
  const base = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w + 0.004, baseH, d)), mats.gunmetal);
  base.position.set(0, baseH * 0.5, 0);
  const clampNut = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0045, 0.0045, 0.006, 8)), mats.brushedSteel);
  clampNut.rotation.z = Math.PI / 2;
  clampNut.position.set(-w * 0.5 - 0.004, baseH * 0.5, 0.006);
  g.add(base, clampNut);

  const winCenterY = baseH + h * 0.5;
  const frameDepth = d * 0.56;

  // Left & Right armored hood walls (leaving the center 100% open!)
  const wallGeo = trackGeo(new THREE.BoxGeometry(wallT, h, frameDepth));
  const wallL = new THREE.Mesh(wallGeo, mats.gunmetal);
  wallL.position.set(-(w * 0.5 - wallT * 0.5), winCenterY, 0);
  const wallR = new THREE.Mesh(wallGeo, mats.gunmetal);
  wallR.position.set(w * 0.5 - wallT * 0.5, winCenterY, 0);

  // Top protective arch bar
  const topArch = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w, wallT, frameDepth)), mats.gunmetalLight);
  topArch.position.set(0, baseH + h - wallT * 0.5, 0);
  g.add(wallL, wallR, topArch);

  if (style === 'holo') {
    // EOTech-style front battery cowling in front of the window
    const hoodBattery = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w - 0.004, 0.016, 0.022)), mats.polymer);
    hoodBattery.position.set(0, baseH + 0.007, -d * 0.34);
    g.add(hoodBattery);
  }

  // Elevation & windage micro adjustment turrets
  const turret = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.004, 0.004, 0.005, 8)), mats.brushedSteel);
  turret.rotation.z = Math.PI / 2;
  turret.position.set(w * 0.5 + 0.002, winCenterY - 0.004, -0.004);
  g.add(turret);

  // Subtle AR-coated transparent lens (never blocks visibility!)
  const glass = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(w - wallT * 2.1, h - wallT * 1.4)),
    mats.opticGlass
  );
  glass.position.set(0, winCenterY, 0.001);
  g.add(glass);

  // Crisp glowing center reticle dot (plus subtle outer brackets on holo)
  const dot = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.0021, 8, 8)), reticleMat);
  dot.position.set(0, winCenterY, 0.002);
  g.add(dot);

  if (style === 'holo') {
    const ring = new THREE.Mesh(trackGeo(new THREE.RingGeometry(0.0072, 0.0085, 20)), reticleMat);
    ring.position.set(0, winCenterY, 0.002);
    g.add(ring);
  }

  return { group: g, reticleLocalY: winCenterY };
}

function addPicatinnyTeeth(
  parent: THREE.Object3D,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  mat: THREE.Material,
  y: number,
  zStart: number,
  zEnd: number,
  count: number,
  width = 0.024
) {
  const baseLen = Math.abs(zEnd - zStart);
  const railBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(width, 0.006, baseLen)), mat);
  railBase.position.set(0, y, (zStart + zEnd) * 0.5);
  parent.add(railBase);

  const toothGeo = trackGeo(new THREE.BoxGeometry(width + 0.003, 0.0035, Math.min(0.008, (baseLen / count) * 0.52)));
  for (let i = 0; i < count; i++) {
    const t = count > 1 ? i / (count - 1) : 0.5;
    const tooth = new THREE.Mesh(toothGeo, mat);
    tooth.position.set(0, y + 0.0045, zStart + (zEnd - zStart) * t);
    parent.add(tooth);
  }
}

// ---------------------------------------------------------------------------
// 3. ALL 10 UPGRADED FIRST-PERSON BASE WEAPONS
// ---------------------------------------------------------------------------

/** 0. AK-47 — Tactical Modernized Kalashnikov with Stamped Receiver, Walnut Furniture & Open Reflex */
export function buildUpgradedAK47(mats: WeaponMaterialLibrary): WeaponModelResult {
  const ownedGeos: THREE.BufferGeometry[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(geo: T): T => {
    ownedGeos.push(geo);
    return geo;
  };
  const g = new THREE.Group();

  // Stamped receiver + beveled lower skirt + riveted dust cover
  const receiver = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.052, 0.064, 0.285)), mats.gunmetal);
  const receiverLower = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.044, 0.014, 0.26)), mats.polymer);
  receiverLower.position.set(0, -0.036, 0.004);
  const dust = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.046, 0.022, 0.25)), mats.gunmetalLight);
  dust.position.set(0, 0.04, 0.012);
  g.add(receiver, receiverLower, dust);

  // Ribbed dust cover top ridges
  const ribGeo = trackGeo(new THREE.BoxGeometry(0.048, 0.004, 0.01));
  for (let i = 0; i < 4; i++) {
    const rib = new THREE.Mesh(ribGeo, mats.gunmetal);
    rib.position.set(0, 0.051, -0.075 + i * 0.042);
    g.add(rib);
  }

  // Picatinny rail + Hollow Open-Window Reflex Sight (reticle sits at y = 0.056 + 0.0285 = 0.0845)
  addPicatinnyTeeth(g, trackGeo, mats.gunmetal, 0.053, -0.095, 0.07, 10, 0.025);
  const optic = buildOpenReflexOptic(trackGeo, mats, mats.reticleGreen, 'reflex');
  optic.group.position.set(0, 0.056, -0.015);
  g.add(optic.group);

  // Articulated Steel Bolt Carrier & Curved Charging Handle (reciprocates on shot & reload!)
  const boltGroup = new THREE.Group();
  boltGroup.position.set(0, 0.024, -0.022);
  const boltCarrier = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.014, 0.018, 0.078)), mats.brushedSteel);
  boltCarrier.position.set(0.025, 0, 0);
  const chargeHandle = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.028, 0.01, 0.015)), mats.brushedSteel);
  chargeHandle.position.set(0.04, 0.002, 0.014);
  chargeHandle.rotation.z = 0.16;
  boltGroup.add(boltCarrier, chargeHandle);
  g.add(boltGroup);

  // Ejection port recess & safety selector lever on right side
  const selector = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.006, 0.014, 0.092)), mats.gunmetalLight);
  selector.position.set(0.029, 0.002, 0.04);
  selector.rotation.x = 0.08;
  g.add(selector);

  // Trigger guard + curved steel trigger
  const triggerGuard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.018, 0.006, 0.058)), mats.gunmetal);
  triggerGuard.position.set(0, -0.058, 0.042);
  const trigger = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.007, 0.024, 0.008)), mats.brushedSteel);
  trigger.position.set(0, -0.046, 0.048);
  trigger.rotation.x = 0.25;
  g.add(triggerGuard, trigger);

  // Laminated Walnut Stock + Rubber Buttpad + Steel Sling Loop
  const stock = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.042, 0.078, 0.225)), mats.walnutWood);
  stock.position.set(0, -0.018, 0.238);
  stock.rotation.x = 0.09;
  const buttpad = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.044, 0.084, 0.02)), mats.rubber);
  buttpad.position.set(0, -0.027, 0.352);
  g.add(stock, buttpad);

  // Contoured Polymer Pistol Grip
  const grip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.034, 0.094, 0.044)), mats.polymer);
  grip.position.set(0, -0.072, 0.096);
  grip.rotation.x = -0.32;
  g.add(grip);

  // Ventilated Walnut Upper & Lower Handguard with Steel Ferrule Collars
  const hgBot = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.05, 0.034, 0.195)), mats.walnutWood);
  hgBot.position.set(0, -0.008, -0.225);
  const hgTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.044, 0.024, 0.17)), mats.walnutWood);
  hgTop.position.set(0, 0.024, -0.22);
  const hgCollarF = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.053, 0.054, 0.014)), mats.gunmetal);
  hgCollarF.position.set(0, 0.006, -0.322);
  const hgCollarR = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.054, 0.056, 0.014)), mats.gunmetal);
  hgCollarR.position.set(0, 0.006, -0.132);
  g.add(hgBot, hgTop, hgCollarF, hgCollarR);

  // Heavy Barrel, Gas Block, Cleaning Rod & Slant Muzzle Brake
  const barrel = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0105, 0.012, 0.36, 12)), mats.gunmetal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.01, -0.405);
  const cleaningRod = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0032, 0.0032, 0.25, 6)), mats.brushedSteel);
  cleaningRod.rotation.x = Math.PI / 2;
  cleaningRod.position.set(0, -0.008, -0.4);
  const gasTube = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.009, 0.009, 0.18, 10)), mats.gunmetalLight);
  gasTube.rotation.x = Math.PI / 2;
  gasTube.position.set(0, 0.032, -0.26);
  const gasBlock = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.022, 0.036, 0.024)), mats.gunmetal);
  gasBlock.position.set(0, 0.022, -0.36);
  const muzzleBrake = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0145, 0.013, 0.054, 10)), mats.brushedSteel);
  muzzleBrake.rotation.x = Math.PI / 2;
  muzzleBrake.position.set(0, 0.01, -0.578);
  // Classic hooded AK front sight post
  const fsBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.018, 0.034, 0.02)), mats.gunmetal);
  fsBase.position.set(0, 0.028, -0.525);
  const fsWingL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.004, 0.02, 0.014)), mats.gunmetal);
  fsWingL.position.set(-0.008, 0.048, -0.525);
  const fsWingR = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.004, 0.02, 0.014)), mats.gunmetal);
  fsWingR.position.set(0.008, 0.048, -0.525);
  const fsPin = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0018, 0.0018, 0.014, 6)), mats.tritiumGlow);
  fsPin.position.set(0, 0.046, -0.525);
  g.add(barrel, cleaningRod, gasTube, gasBlock, muzzleBrake, fsBase, fsWingL, fsWingR, fsPin);

  // Side Tactical PEQ Laser Module
  const laserBox = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.022, 0.022, 0.068)), mats.polymer);
  laserBox.position.set(0.036, 0.012, -0.245);
  const laserLens = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.004, 0.004, 0.005, 8)), mats.reticleRed);
  laserLens.rotation.x = Math.PI / 2;
  laserLens.position.set(0.036, 0.012, -0.281);
  g.add(laserBox, laserLens);

  // Curved Ribbed Bakelite 30-Round Magazine
  const magGroup = new THREE.Group();
  const seg1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.034, 0.088, 0.052)), mats.bakelite);
  seg1.position.set(0, -0.066, -0.026);
  seg1.rotation.x = 0.14;
  const seg2 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.033, 0.088, 0.05)), mats.bakelite);
  seg2.position.set(0, -0.136, -0.05);
  seg2.rotation.x = 0.36;
  const magPlate = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.038, 0.011, 0.058)), mats.gunmetal);
  magPlate.position.set(0, -0.177, -0.067);
  magPlate.rotation.x = 0.36;
  magGroup.add(seg1, seg2, magPlate);
  g.add(magGroup);

  // Sculpted Tactical Hands
  g.add(
    buildSculptedTacticalHands(trackGeo, mats.glove, mats.sleeve, mats.gloveKnuckle, {
      rightPos: [0.006, -0.072, 0.098],
      leftPos: [-0.012, -0.032, -0.225],
    })
  );

  return {
    group: g,
    mag: magGroup,
    bolt: boltGroup,
    boltRestZ: -0.022,
    boltTravelZ: 0.075,
    muzzlePos: new THREE.Vector3(0, 0.012, -0.6),
    dispose: () => ownedGeos.forEach((geo) => geo.dispose()),
  };
}

/** 1. M4A1-S — Suppressed Special Ops Carbine with M-LOK Rail, Open Holo Optic & SOCOM Silencer */
export function buildUpgradedM4A1(mats: WeaponMaterialLibrary): WeaponModelResult {
  const ownedGeos: THREE.BufferGeometry[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(geo: T): T => {
    ownedGeos.push(geo);
    return geo;
  };
  const g = new THREE.Group();

  // Billet Upper & Lower Receivers + Brass Deflector + Forward Assist
  const upper = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.05, 0.044, 0.255)), mats.gunmetal);
  upper.position.set(0, 0.022, 0);
  const lower = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.046, 0.04, 0.195)), mats.gunmetalLight);
  lower.position.set(0, -0.016, 0.018);
  const magwell = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.05, 0.034, 0.068)), mats.gunmetal);
  magwell.position.set(0, -0.034, -0.038);
  const deflector = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.014, 0.018, 0.022)), mats.gunmetal);
  deflector.position.set(0.028, 0.022, 0.045);
  const forwardAssist = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.007, 0.007, 0.028, 8)), mats.brushedSteel);
  forwardAssist.rotation.x = Math.PI / 2;
  forwardAssist.position.set(0.028, 0.014, 0.088);
  g.add(upper, lower, magwell, deflector, forwardAssist);

  // Full-Length Top Picatinny Rail + Open-Window Holographic Optic (reticle at y = 0.048 + 0.031 = 0.079)
  addPicatinnyTeeth(g, trackGeo, mats.gunmetal, 0.045, -0.31, 0.115, 20, 0.024);
  const holo = buildOpenReflexOptic(trackGeo, mats, mats.reticleRed, 'holo');
  holo.group.position.set(0, 0.048, -0.02);
  g.add(holo.group);

  // Articulated T-Charging Handle + Visible Bolt Carrier inside Ejection Port
  const boltGroup = new THREE.Group();
  boltGroup.position.set(0, 0.024, 0);
  const portBolt = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.012, 0.018, 0.068)), mats.brushedSteel);
  portBolt.position.set(0.022, 0, -0.008);
  const tHandleStem = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.016, 0.01, 0.026)), mats.brushedSteel);
  tHandleStem.position.set(0, 0.014, 0.13);
  const tHandleWings = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.042, 0.011, 0.012)), mats.gunmetalLight);
  tHandleWings.position.set(0, 0.014, 0.142);
  boltGroup.add(portBolt, tHandleStem, tHandleWings);
  g.add(boltGroup);

  // M-LOK Vented Tactical Olive Handguard + Side Rail Panels + Vertical Foregrip
  const handguard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.052, 0.052, 0.225)), mats.olivePolymer);
  handguard.position.set(0, 0.016, -0.23);
  const ventGeo = trackGeo(new THREE.BoxGeometry(0.055, 0.008, 0.026));
  for (let i = 0; i < 4; i++) {
    const vent = new THREE.Mesh(ventGeo, mats.gunmetal);
    vent.position.set(0, 0.022, -0.155 - i * 0.048);
    g.add(vent);
  }
  const foregrip = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.014, 0.012, 0.088, 10)), mats.polymer);
  foregrip.position.set(0, -0.05, -0.245);
  const peq = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.024, 0.02, 0.064)), mats.olivePolymer);
  peq.position.set(0.036, 0.02, -0.26);
  g.add(handguard, foregrip, peq);

  // Barrel + Ribbed SOCOM Suppressor with Quick-Detach Collar
  const barrel = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.01, 0.011, 0.14, 12)), mats.brushedSteel);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.018, -0.375);
  const suppCollar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.021, 0.019, 0.028, 14)), mats.brushedSteel);
  suppCollar.rotation.x = Math.PI / 2;
  suppCollar.position.set(0, 0.018, -0.435);
  const suppressor = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0185, 0.0185, 0.215, 16)), mats.gunmetal);
  suppressor.rotation.x = Math.PI / 2;
  suppressor.position.set(0, 0.018, -0.55);
  const suppBandGeo = trackGeo(new THREE.CylinderGeometry(0.0196, 0.0196, 0.01, 16));
  for (let i = 0; i < 3; i++) {
    const band = new THREE.Mesh(suppBandGeo, mats.gunmetalLight);
    band.rotation.x = Math.PI / 2;
    band.position.set(0, 0.018, -0.48 - i * 0.068);
    g.add(band);
  }
  // Flip-up low-profile front sight
  const frontSight = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.014, 0.022, 0.018)), mats.gunmetal);
  frontSight.position.set(0, 0.058, -0.325);
  g.add(barrel, suppCollar, suppressor, frontSight);

  // Buffer Tube + Adjustable Crane Stock + Trigger + Ergonomic Grip
  const bufferTube = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.016, 0.016, 0.19, 10)), mats.gunmetal);
  bufferTube.rotation.x = Math.PI / 2;
  bufferTube.position.set(0, 0.018, 0.215);
  const stockBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.048, 0.09, 0.15)), mats.olivePolymer);
  stockBody.position.set(0, -0.008, 0.28);
  const stockPad = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.05, 0.095, 0.02)), mats.rubber);
  stockPad.position.set(0, -0.008, 0.36);
  const grip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.034, 0.094, 0.044)), mats.polymer);
  grip.position.set(0, -0.068, 0.088);
  grip.rotation.x = -0.3;
  const trigGuard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.018, 0.006, 0.056)), mats.gunmetal);
  trigGuard.position.set(0, -0.052, 0.036);
  const trig = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.006, 0.022, 0.008)), mats.brushedSteel);
  trig.position.set(0, -0.04, 0.042);
  trig.rotation.x = 0.22;
  g.add(bufferTube, stockBody, stockPad, grip, trigGuard, trig);

  // Windowed 35-Round Polymer PMAG (with visible brass rounds through window!)
  const magGroup = new THREE.Group();
  const magBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.032, 0.145, 0.054)), mats.polymer);
  magBody.position.set(0, -0.105, -0.04);
  magBody.rotation.x = 0.1;
  const magWindow = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.034, 0.044, 0.016)), mats.brass);
  magWindow.position.set(0, -0.105, -0.042);
  magWindow.rotation.x = 0.1;
  const magBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.036, 0.014, 0.06)), mats.olivePolymer);
  magBase.position.set(0, -0.175, -0.048);
  magBase.rotation.x = 0.1;
  magGroup.add(magBody, magWindow, magBase);
  g.add(magGroup);

  g.add(
    buildSculptedTacticalHands(trackGeo, mats.glove, mats.sleeve, mats.gloveKnuckle, {
      rightPos: [0.006, -0.066, 0.09],
      leftPos: [-0.01, -0.044, -0.245],
    })
  );

  return {
    group: g,
    mag: magGroup,
    bolt: boltGroup,
    boltRestZ: 0,
    boltTravelZ: 0.065,
    muzzlePos: new THREE.Vector3(0, 0.018, -0.68),
    dispose: () => ownedGeos.forEach((geo) => geo.dispose()),
  };
}

/** 2. AWM .338 — Long-Range Bolt-Action Sniper with Olive Chassis, Fluted Barrel & 8x Scope */
export function buildUpgradedSniper(mats: WeaponMaterialLibrary): WeaponModelResult {
  const ownedGeos: THREE.BufferGeometry[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(geo: T): T => {
    ownedGeos.push(geo);
    return geo;
  };
  const g = new THREE.Group();

  // Tactically Sculpted AWM Olive Chassis + Upper Steel Action
  const chassis = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.054, 0.068, 0.39)), mats.olivePolymer);
  chassis.position.set(0, -0.004, -0.02);
  const forend = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.046, 0.044, 0.22)), mats.olivePolymer);
  forend.position.set(0, 0.002, -0.28);
  const upperAction = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.046, 0.036, 0.28)), mats.gunmetal);
  upperAction.position.set(0, 0.042, -0.01);
  g.add(chassis, forend, upperAction);

  // Articulated Stainless Bolt & Oversized Tactical Bolt Knob
  const boltGroup = new THREE.Group();
  boltGroup.position.set(0, 0.04, 0.048);
  const boltBody = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.012, 0.012, 0.11, 10)), mats.brushedSteel);
  boltBody.rotation.x = Math.PI / 2;
  boltBody.position.set(0.012, 0, -0.015);
  const boltStem = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0048, 0.0048, 0.046, 8)), mats.brushedSteel);
  boltStem.rotation.z = -Math.PI / 2.4;
  boltStem.position.set(0.036, -0.004, 0);
  const boltKnob = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.012, 10, 10)), mats.rubber);
  boltKnob.position.set(0.054, -0.016, 0);
  boltGroup.add(boltBody, boltStem, boltKnob);
  g.add(boltGroup);

  // Thumbhole Sniper Stock + Adjustable Cheek Riser + Monopod + Buttpad
  const stockMain = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.046, 0.088, 0.255)), mats.olivePolymer);
  stockMain.position.set(0, -0.018, 0.28);
  const cheekRiser = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.048, 0.024, 0.13)), mats.rubber);
  cheekRiser.position.set(0, 0.04, 0.265);
  const buttpad = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.048, 0.094, 0.022)), mats.rubber);
  buttpad.position.set(0, -0.02, 0.415);
  const grip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.036, 0.096, 0.046)), mats.polymer);
  grip.position.set(0, -0.072, 0.118);
  grip.rotation.x = -0.24;
  g.add(stockMain, cheekRiser, buttpad, grip);

  // Free-Floating Heavy Fluted Barrel + Multi-Baffle .338 Muzzle Brake + Folded Bipod
  const barrel = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.013, 0.0165, 0.56, 14)), mats.gunmetal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.036, -0.43);
  const brakeBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.034, 0.028, 0.078)), mats.brushedSteel);
  brakeBody.position.set(0, 0.036, -0.725);
  const brakeBaffle1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.036, 0.018, 0.012)), mats.rubber);
  brakeBaffle1.position.set(0, 0.036, -0.708);
  const brakeBaffle2 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.036, 0.018, 0.012)), mats.rubber);
  brakeBaffle2.position.set(0, 0.036, -0.738);
  const bipodBlock = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.04, 0.022, 0.045)), mats.gunmetal);
  bipodBlock.position.set(0, -0.026, -0.34);
  const legL = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0055, 0.0055, 0.18, 8)), mats.brushedSteel);
  legL.rotation.x = Math.PI / 2;
  legL.position.set(-0.026, -0.042, -0.43);
  const legR = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0055, 0.0055, 0.18, 8)), mats.brushedSteel);
  legR.rotation.x = Math.PI / 2;
  legR.position.set(0.026, -0.042, -0.43);
  g.add(barrel, brakeBody, brakeBaffle1, brakeBaffle2, bipodBlock, legL, legR);

  // High-Magnification 8x Optical Scope + Dual Mounting Rings + Elevation/Windage Turrets
  addPicatinnyTeeth(g, trackGeo, mats.gunmetal, 0.062, -0.14, 0.1, 12, 0.026);
  const ringR = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.042, 0.036, 0.022)), mats.gunmetalLight);
  ringR.position.set(0, 0.086, 0.042);
  const ringF = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.042, 0.036, 0.022)), mats.gunmetalLight);
  ringF.position.set(0, 0.086, -0.082);
  const scopeTube = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.018, 0.018, 0.255, 16)), mats.gunmetal);
  scopeTube.rotation.x = Math.PI / 2;
  scopeTube.position.set(0, 0.098, -0.02);
  const turretTop = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.011, 0.011, 0.018, 12)), mats.brushedSteel);
  turretTop.position.set(0, 0.12, -0.02);
  const turretSide = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.009, 0.009, 0.016, 12)), mats.brushedSteel);
  turretSide.rotation.z = Math.PI / 2;
  turretSide.position.set(0.022, 0.098, -0.02);
  const scopeObj = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.028, 0.02, 0.085, 16)), mats.gunmetal);
  scopeObj.rotation.x = Math.PI / 2;
  scopeObj.position.set(0, 0.098, -0.178);
  const scopeEye = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.022, 0.024, 0.06, 16)), mats.gunmetal);
  scopeEye.rotation.x = Math.PI / 2;
  scopeEye.position.set(0, 0.098, 0.125);
  const lensRear = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.02, 16)), mats.scopeLens);
  lensRear.position.set(0, 0.098, 0.156);
  const lensFront = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.026, 16)), mats.scopeLens);
  lensFront.rotation.y = Math.PI;
  lensFront.position.set(0, 0.098, -0.222);
  g.add(ringR, ringF, scopeTube, turretTop, turretSide, scopeObj, scopeEye, lensRear, lensFront);

  // .338 Box Magazine
  const magGroup = new THREE.Group();
  const magBox = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.036, 0.092, 0.084)), mats.gunmetal);
  magBox.position.set(0, -0.068, -0.02);
  const magFloor = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.04, 0.01, 0.088)), mats.polymer);
  magFloor.position.set(0, -0.114, -0.02);
  magGroup.add(magBox, magFloor);
  g.add(magGroup);

  g.add(
    buildSculptedTacticalHands(trackGeo, mats.glove, mats.sleeve, mats.gloveKnuckle, {
      rightPos: [0.006, -0.072, 0.12],
      leftPos: [-0.01, -0.028, -0.24],
    })
  );

  return {
    group: g,
    mag: magGroup,
    bolt: boltGroup,
    boltRestZ: 0.048,
    boltTravelZ: 0.082,
    muzzlePos: new THREE.Vector3(0, 0.036, -0.77),
    dispose: () => ownedGeos.forEach((geo) => geo.dispose()),
  };
}

/** 3. MP5-SD — Integrally Suppressed Tactical SMG with Claw Micro-Dot & Ribbed SD Shroud */
export function buildUpgradedMP5(mats: WeaponMaterialLibrary): WeaponModelResult {
  const ownedGeos: THREE.BufferGeometry[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(geo: T): T => {
    ownedGeos.push(geo);
    return geo;
  };
  const g = new THREE.Group();

  // Iconic H&K Stamped Upper + Cylindrical Cocking Tube + Navy Polymer Lower
  const upperRec = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.044, 0.056, 0.245)), mats.gunmetal);
  const lowerGripFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.04, 0.028, 0.14)), mats.polymer);
  lowerGripFrame.position.set(0, -0.032, 0.042);
  const cockingTube = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.013, 0.013, 0.195, 12)), mats.gunmetalLight);
  cockingTube.rotation.x = Math.PI / 2;
  cockingTube.position.set(0, 0.035, -0.11);
  g.add(upperRec, lowerGripFrame, cockingTube);

  // Articulated Front-Left H&K Slap Charging Handle
  const boltGroup = new THREE.Group();
  boltGroup.position.set(0, 0.036, -0.175);
  const handleArm = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.028, 0.01, 0.014)), mats.brushedSteel);
  handleArm.position.set(-0.024, 0, 0);
  const handleKnob = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.006, 0.006, 0.02, 8)), mats.rubber);
  handleKnob.rotation.z = Math.PI / 2;
  handleKnob.position.set(-0.038, 0.002, 0);
  boltGroup.add(handleArm, handleKnob);
  g.add(boltGroup);

  // Claw Mount + Open-Window Cyan Micro Reflex Optic (reticle at y = 0.054 + 0.026 = 0.080)
  addPicatinnyTeeth(g, trackGeo, mats.gunmetal, 0.049, -0.075, 0.045, 7, 0.022);
  const microOptic = buildOpenReflexOptic(trackGeo, mats, mats.reticleCyan, 'micro');
  microOptic.group.position.set(0, 0.053, -0.015);
  g.add(microOptic.group);

  // Ribbed Circular SD Handguard + Integral Matte-Black Suppressor
  const sdHandguard = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.026, 0.026, 0.155, 14)), mats.rubber);
  sdHandguard.rotation.x = Math.PI / 2;
  sdHandguard.position.set(0, 0.006, -0.19);
  const sdRingGeo = trackGeo(new THREE.TorusGeometry(0.0265, 0.0024, 6, 16));
  for (let i = 0; i < 6; i++) {
    const r = new THREE.Mesh(sdRingGeo, mats.polymer);
    r.position.set(0, 0.006, -0.13 - i * 0.022);
    g.add(r);
  }
  const supp = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0195, 0.0195, 0.21, 16)), mats.gunmetal);
  supp.rotation.x = Math.PI / 2;
  supp.position.set(0, 0.008, -0.355);
  const suppCap = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.018, 0.02, 0.018, 16)), mats.brushedSteel);
  suppCap.rotation.x = Math.PI / 2;
  suppCap.position.set(0, 0.008, -0.462);
  // Iconic MP5 hooded ring front sight
  const frontRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.011, 0.0024, 6, 14)), mats.gunmetal);
  frontRing.position.set(0, 0.048, -0.22);
  g.add(sdHandguard, supp, suppCap, frontRing);

  // Dual-Rail Collapsible A3 Stock + Navy Pistol Grip
  const railL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.006, 0.01, 0.19)), mats.brushedSteel);
  railL.position.set(-0.024, 0.004, 0.21);
  const railR = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.006, 0.01, 0.19)), mats.brushedSteel);
  railR.position.set(0.024, 0.004, 0.21);
  const butt = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.046, 0.09, 0.026)), mats.rubber);
  butt.position.set(0, -0.012, 0.305);
  const grip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.032, 0.09, 0.042)), mats.polymer);
  grip.position.set(0, -0.074, 0.072);
  grip.rotation.x = -0.26;
  const triggerGuard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.016, 0.006, 0.048)), mats.polymer);
  triggerGuard.position.set(0, -0.056, 0.02);
  g.add(railL, railR, butt, grip, triggerGuard);

  // Curved 9mm Banana Magazine
  const magGroup = new THREE.Group();
  const mag1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.024, 0.092, 0.034)), mats.gunmetal);
  mag1.position.set(0, -0.074, -0.052);
  mag1.rotation.x = 0.16;
  const mag2 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.023, 0.072, 0.033)), mats.gunmetal);
  mag2.position.set(0, -0.145, -0.072);
  mag2.rotation.x = 0.34;
  magGroup.add(mag1, mag2);
  g.add(magGroup);

  g.add(
    buildSculptedTacticalHands(trackGeo, mats.glove, mats.sleeve, mats.gloveKnuckle, {
      rightPos: [0.006, -0.072, 0.075],
      leftPos: [-0.01, -0.03, -0.19],
    })
  );

  return {
    group: g,
    mag: magGroup,
    bolt: boltGroup,
    boltRestZ: -0.175,
    boltTravelZ: 0.068,
    muzzlePos: new THREE.Vector3(0, 0.01, -0.475),
    dispose: () => ownedGeos.forEach((geo) => geo.dispose()),
  };
}

/** 4. SPAS-12 — Iconic Tactical Combat Shotgun with Perforated Heat Shield, Ghost-Ring & Animated Shell Carrier */
export function buildUpgradedShotgun(mats: WeaponMaterialLibrary): WeaponModelResult {
  const ownedGeos: THREE.BufferGeometry[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(geo: T): T => {
    ownedGeos.push(geo);
    return geo;
  };
  const g = new THREE.Group();

  // Heavy Sculpted SPAS-12 Receiver + Side Saddle Shells
  const rec = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.058, 0.078, 0.305)), mats.gunmetal);
  const recTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.048, 0.012, 0.285)), mats.gunmetalLight);
  recTop.position.set(0, 0.043, -0.005);
  g.add(rec, recTop);

  // Side Shell Saddle (4 crimson 12-gauge shells clipped to left receiver flank)
  const saddleBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.01, 0.024, 0.115)), mats.polymer);
  saddleBase.position.set(-0.032, 0.002, -0.01);
  g.add(saddleBase);
  const sHullGeo = trackGeo(new THREE.CylinderGeometry(0.0062, 0.0062, 0.042, 8));
  const sBrassGeo = trackGeo(new THREE.CylinderGeometry(0.0068, 0.0068, 0.013, 8));
  for (let i = 0; i < 4; i++) {
    const hull = new THREE.Mesh(sHullGeo, mats.shellRed);
    hull.position.set(-0.038, 0.004, -0.046 + i * 0.024);
    const brass = new THREE.Mesh(sBrassGeo, mats.brass);
    brass.position.set(-0.038, -0.016, -0.046 + i * 0.024);
    g.add(hull, brass);
  }

  // Articulated Side Ejection Bolt
  const boltGroup = new THREE.Group();
  boltGroup.position.set(0.028, 0.016, -0.01);
  const boltPlate = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.008, 0.022, 0.068)), mats.brushedSteel);
  const boltKnob = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.005, 0.005, 0.022, 8)), mats.brushedSteel);
  boltKnob.rotation.z = Math.PI / 2;
  boltKnob.position.set(0.01, 0, 0.02);
  boltGroup.add(boltPlate, boltKnob);
  g.add(boltGroup);

  // Iconic Perforated SPAS-12 Barrel Heat Shield + Heavy Barrel + Magazine Tube
  const barrel = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0145, 0.0155, 0.49, 14)), mats.gunmetal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.36);
  const shield = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.052, 0.03, 0.34)), mats.gunmetalLight);
  shield.position.set(0, 0.03, -0.3);
  // Perforated heat-vent slots along top of shroud
  const ventSlotGeo = trackGeo(new THREE.CylinderGeometry(0.005, 0.005, 0.032, 8));
  for (let i = 0; i < 7; i++) {
    const vL = new THREE.Mesh(ventSlotGeo, mats.rubber);
    vL.position.set(-0.014, 0.031, -0.17 - i * 0.042);
    const vR = new THREE.Mesh(ventSlotGeo, mats.rubber);
    vR.position.set(0.014, 0.031, -0.17 - i * 0.042);
    g.add(vL, vR);
  }
  const magTube = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.014, 0.014, 0.45, 12)), mats.gunmetal);
  magTube.rotation.x = Math.PI / 2;
  magTube.position.set(0, -0.012, -0.34);
  const tubeCap = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.016, 0.016, 0.024, 12)), mats.brushedSteel);
  tubeCap.rotation.x = Math.PI / 2;
  tubeCap.position.set(0, -0.012, -0.568);
  const barrelClamp = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.036, 0.052, 0.022)), mats.gunmetal);
  barrelClamp.position.set(0, 0.004, -0.51);
  g.add(barrel, shield, magTube, tubeCap, barrelClamp);

  // Crisp Fiber-Optic Ghost-Ring Rear & Glowing Amber Front Sight (sightline y = 0.068)
  const rearRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.013, 0.0026, 8, 18)), mats.gunmetal);
  rearRing.position.set(0, 0.068, 0.075);
  const rearDotL = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.0022, 6, 6)), mats.tritiumGlow);
  rearDotL.position.set(-0.014, 0.068, 0.077);
  const rearDotR = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.0022, 6, 6)), mats.tritiumGlow);
  rearDotR.position.set(0.014, 0.068, 0.077);
  const frontPost = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.006, 0.022, 0.014)), mats.gunmetal);
  frontPost.position.set(0, 0.056, -0.565);
  const frontBead = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.0036, 8, 8)), mats.reticleAmber);
  frontBead.position.set(0, 0.068, -0.565);
  g.add(rearRing, rearDotL, rearDotR, frontPost, frontBead);

  // Articulated Ribbed Tactical Pump Forend (rest Z = -0.28)
  const pumpGroup = new THREE.Group();
  pumpGroup.position.set(0, -0.014, -0.28);
  const pumpCore = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.058, 0.048, 0.165)), mats.polymer);
  pumpGroup.add(pumpCore);
  const pumpRibGeo = trackGeo(new THREE.BoxGeometry(0.062, 0.05, 0.009));
  for (let i = -3; i <= 3; i++) {
    const rib = new THREE.Mesh(pumpRibGeo, mats.rubber);
    rib.position.set(0, -0.001, i * 0.022);
    pumpGroup.add(rib);
  }
  g.add(pumpGroup);

  // Iconic Folding Frame Stock + Pistol Grip
  const stockArm = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.044, 0.024, 0.25)), mats.gunmetal);
  stockArm.position.set(0, 0.004, 0.26);
  const stockStrut = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.036, 0.016, 0.22)), mats.gunmetalLight);
  stockStrut.position.set(0, -0.034, 0.26);
  stockStrut.rotation.x = -0.14;
  const stockButt = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.048, 0.094, 0.024)), mats.rubber);
  stockButt.position.set(0, -0.018, 0.388);
  const grip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.038, 0.095, 0.048)), mats.polymer);
  grip.position.set(0, -0.072, 0.105);
  grip.rotation.x = -0.34;
  const trigGuard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.02, 0.006, 0.058)), mats.gunmetal);
  trigGuard.position.set(0, -0.06, 0.044);
  g.add(stockArm, stockStrut, stockButt, grip, trigGuard);

  // Animated Loading Shell Carrier (visible & animated during shell-by-shell reload!)
  const shellCarrier = new THREE.Group();
  const loadShell = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0085, 0.0085, 0.05, 10)), mats.shellRed);
  loadShell.rotation.x = Math.PI / 2;
  loadShell.position.set(0, -0.075, -0.045);
  const loadBrass = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.009, 0.009, 0.014, 10)), mats.brass);
  loadBrass.rotation.x = Math.PI / 2;
  loadBrass.position.set(0, -0.075, -0.025);
  shellCarrier.add(loadShell, loadBrass);
  shellCarrier.visible = false; // shown cleanly only during reload!
  g.add(shellCarrier);

  g.add(
    buildSculptedTacticalHands(trackGeo, mats.glove, mats.sleeve, mats.gloveKnuckle, {
      rightPos: [0.006, -0.07, 0.108],
      leftPos: [-0.008, -0.038, -0.28],
    })
  );

  return {
    group: g,
    mag: shellCarrier,
    bolt: boltGroup,
    boltRestZ: -0.01,
    boltTravelZ: 0.062,
    pump: pumpGroup,
    pumpRestZ: -0.28,
    muzzlePos: new THREE.Vector3(0, 0.02, -0.62),
    dispose: () => ownedGeos.forEach((geo) => geo.dispose()),
  };
}

/** 5. G18 Tactical — Polymer Tactical Sidearm with Serrated Steel Slide, Under-Rail Laser & Tritium 3-Dot */
export function buildUpgradedPistol(mats: WeaponMaterialLibrary): WeaponModelResult {
  const ownedGeos: THREE.BufferGeometry[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(geo: T): T => {
    ownedGeos.push(geo);
    return geo;
  };
  const g = new THREE.Group();

  // Stippled Polymer Frame + Flared Magwell + Trigger Guard + Under-Rail Tactical Light
  const frame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.035, 0.025, 0.18)), mats.polymer);
  frame.position.set(0, -0.012, -0.02);
  const grip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.033, 0.105, 0.048)), mats.polymer);
  grip.position.set(0, -0.07, 0.042);
  grip.rotation.x = -0.26;
  const gripPanelL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.036, 0.075, 0.032)), mats.rubber);
  gripPanelL.position.set(0, -0.072, 0.042);
  gripPanelL.rotation.x = -0.26;
  const trigGuard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.016, 0.005, 0.05)), mats.polymer);
  trigGuard.position.set(0, -0.048, -0.016);
  const trigFront = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.016, 0.026, 0.006)), mats.polymer);
  trigFront.position.set(0, -0.036, -0.04);
  const trigger = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.006, 0.02, 0.007)), mats.brushedSteel);
  trigger.position.set(0, -0.032, -0.008);
  trigger.rotation.x = 0.2;
  const tacLight = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.026, 0.022, 0.056)), mats.gunmetal);
  tacLight.position.set(0, -0.032, -0.078);
  const tacLens = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.008, 0.008, 0.005, 10)), mats.scopeLens);
  tacLens.rotation.x = Math.PI / 2;
  tacLens.position.set(0, -0.032, -0.107);
  g.add(frame, grip, gripPanelL, trigGuard, trigFront, trigger, tacLight, tacLens);

  // Chamfered Machined Steel Slide with Serrations & Glowing 3-Dot Tritium Sights (sightline y = 0.042)
  const slideGroup = new THREE.Group();
  slideGroup.position.set(0, 0.016, -0.02);
  const slideBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.036, 0.034, 0.195)), mats.gunmetal);
  const slideTopBevel = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.028, 0.007, 0.193)), mats.gunmetalLight);
  slideTopBevel.position.set(0, 0.019, 0);
  const barrelTip = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0075, 0.0075, 0.022, 10)), mats.brushedSteel);
  barrelTip.rotation.x = Math.PI / 2;
  barrelTip.position.set(0, 0.002, -0.102);
  // Rear serration grooves
  const serGeo = trackGeo(new THREE.BoxGeometry(0.038, 0.024, 0.004));
  for (let i = 0; i < 5; i++) {
    const ser = new THREE.Mesh(serGeo, mats.rubber);
    ser.position.set(0, 0, 0.05 + i * 0.009);
    slideGroup.add(ser);
  }
  // Glowing 3-dot tritium iron sights
  const rearSightL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.008, 0.009, 0.012)), mats.gunmetal);
  rearSightL.position.set(-0.01, 0.025, 0.082);
  const rearSightR = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.008, 0.009, 0.012)), mats.gunmetal);
  rearSightR.position.set(0.01, 0.025, 0.082);
  const dotRL = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.002, 6, 6)), mats.tritiumGlow);
  dotRL.position.set(-0.009, 0.026, 0.088);
  const dotRR = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.002, 6, 6)), mats.tritiumGlow);
  dotRR.position.set(0.009, 0.026, 0.088);
  const frontSight = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.005, 0.01, 0.012)), mats.gunmetal);
  frontSight.position.set(0, 0.026, -0.086);
  const dotF = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.0023, 6, 6)), mats.reticleGreen);
  dotF.position.set(0, 0.027, -0.08);
  slideGroup.add(slideBody, slideTopBevel, barrelTip, rearSightL, rearSightR, dotRL, dotRR, frontSight, dotF);
  g.add(slideGroup);

  // Extended Tactical Magazine with Polymer Basepad
  const magGroup = new THREE.Group();
  const magBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.025, 0.095, 0.036)), mats.gunmetalLight);
  magBody.position.set(0, -0.075, 0.044);
  magBody.rotation.x = -0.26;
  const magPad = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.032, 0.015, 0.045)), mats.polymer);
  magPad.position.set(0, -0.125, 0.056);
  magPad.rotation.x = -0.26;
  magGroup.add(magBody, magPad);
  g.add(magGroup);

  g.add(
    buildSculptedTacticalHands(trackGeo, mats.glove, mats.sleeve, mats.gloveKnuckle, {
      rightPos: [0.005, -0.068, 0.046],
      leftPos: [-0.016, -0.072, 0.038],
      leftArmPos: [-0.095, -0.135, 0.165],
      leftArmRot: [Math.PI / 2 + 0.28, 0, 0.42],
      twoHandedPistol: true,
    })
  );

  return {
    group: g,
    mag: magGroup,
    slide: slideGroup,
    slideRestZ: -0.02,
    muzzlePos: new THREE.Vector3(0, 0.016, -0.13),
    dispose: () => ownedGeos.forEach((geo) => geo.dispose()),
  };
}

/** 6. Tactical Plasma-Honed Katana — Mirror Steel Curved Blade, Gold Tsuba & Diamond-Wrapped Tsuka */
export function buildUpgradedKatana(mats: WeaponMaterialLibrary): WeaponModelResult {
  const ownedGeos: THREE.BufferGeometry[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(geo: T): T => {
    ownedGeos.push(geo);
    return geo;
  };
  const g = new THREE.Group();
  const pivot = new THREE.Group();

  // Mirror-steel tapered blade + luminous plasma-honed cutting edge + blood-groove fuller
  const bladeSpine = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.007, 0.62, 0.032)), mats.chrome);
  bladeSpine.position.set(0, 0.34, 0.003);
  const edge = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.0028, 0.63, 0.008)), mats.katanaEdge);
  edge.position.set(0, 0.345, -0.015);
  const tip = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.018, 0.072, 4)), mats.chrome);
  tip.scale.set(0.24, 1, 1);
  tip.position.set(0, 0.684, -0.001);
  const habaki = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.014, 0.034, 0.04)), mats.gold);
  habaki.position.set(0, 0.044, 0);

  // Ornate Brushed-Gold Tsuba Handguard
  const tsuba = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.042, 0.042, 0.009, 16)), mats.gold);
  tsuba.position.set(0, 0.024, 0);
  const tsubaRim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.041, 0.004, 8, 20)), mats.gunmetal);
  tsubaRim.rotation.x = Math.PI / 2;
  tsubaRim.position.set(0, 0.024, 0);

  // Diamond-Wrapped Tsuka Handle + Gold Kashira Pommel
  const handle = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.026, 0.22, 0.036)), mats.rubber);
  handle.position.set(0, -0.095, 0);
  const wrapGeo = trackGeo(new THREE.BoxGeometry(0.029, 0.012, 0.039));
  for (let i = 0; i < 6; i++) {
    const w = new THREE.Mesh(wrapGeo, i % 2 === 0 ? mats.polymer : mats.gold);
    w.position.set(0, -0.02 - i * 0.03, 0);
    w.rotation.x = 0.25;
    pivot.add(w);
  }
  const pommel = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.03, 0.022, 0.04)), mats.gold);
  pommel.position.set(0, -0.21, 0);

  // Gloved grip wrapped around tsuka
  const gripHand = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.052, 0.072, 0.064)), mats.glove);
  gripHand.position.set(0.005, -0.082, 0.006);
  const gripKnuckle = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.055, 0.02, 0.04)), mats.gloveKnuckle);
  gripKnuckle.position.set(0.008, -0.06, -0.014);

  pivot.add(bladeSpine, edge, tip, habaki, tsuba, tsubaRim, handle, pommel, gripHand, gripKnuckle);
  pivot.rotation.set(-0.48, 0.25, 0.32);
  g.add(pivot);

  return {
    group: g,
    mag: null,
    bladePivot: pivot,
    muzzlePos: new THREE.Vector3(0, 0.1, -0.45),
    dispose: () => ownedGeos.forEach((geo) => geo.dispose()),
  };
}

/** 7. M249 SAW — Squad Automatic Weapon with Perforated Shroud, Visible Brass Belt & Open Holo Optic */
export function buildUpgradedLMG(mats: WeaponMaterialLibrary): WeaponModelResult {
  const ownedGeos: THREE.BufferGeometry[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(geo: T): T => {
    ownedGeos.push(geo);
    return geo;
  };
  const g = new THREE.Group();

  // Heavy Stamped Steel Receiver + Articulated Top Feed Cover
  const rec = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.07, 0.082, 0.35)), mats.gunmetal);
  const feedCover = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.062, 0.024, 0.295)), mats.gunmetalLight);
  feedCover.position.set(0, 0.052, -0.01);
  g.add(rec, feedCover);

  // Picatinny Top Rail + Open-Window Tactical Holo Optic (reticle at y = 0.068 + 0.031 = 0.099)
  addPicatinnyTeeth(g, trackGeo, mats.gunmetal, 0.065, -0.12, 0.1, 12, 0.026);
  const holo = buildOpenReflexOptic(trackGeo, mats, mats.reticleAmber, 'holo');
  holo.group.position.set(0, 0.068, 0.015);
  g.add(holo.group);

  // Articulated Right-Side Charging Handle
  const boltGroup = new THREE.Group();
  boltGroup.position.set(0.044, 0.024, -0.015);
  const chArm = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.026, 0.012, 0.026)), mats.brushedSteel);
  const chKnob = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.008, 0.008, 0.022, 8)), mats.rubber);
  chKnob.position.set(0.014, 0, 0);
  boltGroup.add(chArm, chKnob);
  g.add(boltGroup);

  // Perforated Barrel Heat Shield + Lower Rail Handguard + Heavy Fluted Barrel + Flash Hider
  const heatShield = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.062, 0.036, 0.255)), mats.gunmetalLight);
  heatShield.position.set(0, 0.024, -0.27);
  const ventHoleGeo = trackGeo(new THREE.CylinderGeometry(0.006, 0.006, 0.04, 8));
  for (let i = 0; i < 6; i++) {
    const vL = new THREE.Mesh(ventHoleGeo, mats.rubber);
    vL.position.set(-0.018, 0.026, -0.17 - i * 0.038);
    const vR = new THREE.Mesh(ventHoleGeo, mats.rubber);
    vR.position.set(0.018, 0.026, -0.17 - i * 0.038);
    g.add(vL, vR);
  }
  const lowerHg = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.064, 0.036, 0.25)), mats.polymer);
  lowerHg.position.set(0, -0.018, -0.265);
  const barrel = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.014, 0.016, 0.42, 14)), mats.gunmetal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.44);
  const gasCylinder = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.011, 0.011, 0.26, 10)), mats.brushedSteel);
  gasCylinder.rotation.x = Math.PI / 2;
  gasCylinder.position.set(0, -0.008, -0.41);
  const flashHider = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.018, 0.016, 0.065, 10)), mats.brushedSteel);
  flashHider.rotation.x = Math.PI / 2;
  flashHider.position.set(0, 0.02, -0.64);
  const frontSight = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.02, 0.036, 0.02)), mats.gunmetal);
  frontSight.position.set(0, 0.046, -0.56);
  // Folded Chrome Bipod Legs
  const bipodL = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0055, 0.0055, 0.21, 8)), mats.chrome);
  bipodL.rotation.x = Math.PI / 2;
  bipodL.position.set(-0.03, -0.044, -0.37);
  const bipodR = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0055, 0.0055, 0.21, 8)), mats.chrome);
  bipodR.rotation.x = Math.PI / 2;
  bipodR.position.set(0.03, -0.044, -0.37);
  g.add(heatShield, lowerHg, barrel, gasCylinder, flashHider, frontSight, bipodL, bipodR);

  // Heavy Polymer SAW Stock + Hydraulic Buffer + Pistol Grip
  const stock = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.052, 0.094, 0.235)), mats.polymer);
  stock.position.set(0, -0.012, 0.26);
  const stockButt = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.054, 0.1, 0.024)), mats.rubber);
  stockButt.position.set(0, -0.012, 0.382);
  const grip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.038, 0.098, 0.048)), mats.polymer);
  grip.position.set(0, -0.074, 0.1);
  grip.rotation.x = -0.28;
  g.add(stock, stockButt, grip);

  // 100-Round Ribbed OD-Green Ammo Box + Visible Linked Brass Cartridge Belt arching into Left Feed Tray
  const magGroup = new THREE.Group();
  const ammoBox = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.112, 0.138, 0.122)), mats.olivePolymer);
  ammoBox.position.set(0, -0.102, -0.05);
  const boxRibGeo = trackGeo(new THREE.BoxGeometry(0.116, 0.01, 0.116));
  for (let i = -1; i <= 1; i++) {
    const rib = new THREE.Mesh(boxRibGeo, mats.gunmetal);
    rib.position.set(0, -0.102 + i * 0.036, -0.05);
    magGroup.add(rib);
  }
  const casingGeo = trackGeo(new THREE.CylinderGeometry(0.0044, 0.0046, 0.03, 6));
  const bulletGeo = trackGeo(new THREE.ConeGeometry(0.0044, 0.012, 6));
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const angle = t * Math.PI * 0.55;
    const x = -0.062 + Math.sin(angle) * 0.024 - Math.sin(t * Math.PI) * 0.012;
    const y = -0.038 + t * 0.078;
    const z = -0.05 + (t - 0.5) * 0.012;
    const link = new THREE.Group();
    const casing = new THREE.Mesh(casingGeo, mats.brass);
    casing.rotation.x = Math.PI / 2;
    const tip = new THREE.Mesh(bulletGeo, mats.copper);
    tip.rotation.x = -Math.PI / 2;
    tip.position.z = -0.021;
    link.add(casing, tip);
    link.position.set(x, y, z);
    link.rotation.z = -0.45 + t * 0.85;
    magGroup.add(link);
  }
  magGroup.add(ammoBox);
  g.add(magGroup);

  g.add(
    buildSculptedTacticalHands(trackGeo, mats.glove, mats.sleeve, mats.gloveKnuckle, {
      rightPos: [0.008, -0.072, 0.102],
      leftPos: [-0.012, -0.034, -0.255],
    })
  );

  return {
    group: g,
    mag: magGroup,
    bolt: boltGroup,
    boltRestZ: -0.015,
    boltTravelZ: 0.075,
    muzzlePos: new THREE.Vector3(0, 0.02, -0.67),
    dispose: () => ownedGeos.forEach((geo) => geo.dispose()),
  };
}

/** 8. Desert Eagle .50 AE — Brushed Chrome & 24K Gold-Fluted Hand Cannon */
export function buildUpgradedDeagle(mats: WeaponMaterialLibrary): WeaponModelResult {
  const ownedGeos: THREE.BufferGeometry[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(geo: T): T => {
    ownedGeos.push(geo);
    return geo;
  };
  const g = new THREE.Group();

  // Heavy Sculpted Chrome Frame + Beavertail + Rubberized Grip with Gold Medallion
  const frame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.044, 0.032, 0.228)), mats.chrome);
  frame.position.set(0, -0.012, -0.038);
  const dustCover = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.04, 0.02, 0.125)), mats.gunmetalLight);
  dustCover.position.set(0, -0.028, -0.09);
  const grip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.041, 0.116, 0.056)), mats.rubber);
  grip.position.set(0, -0.075, 0.042);
  grip.rotation.x = -0.26;
  const medallionL = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.009, 0.009, 0.044, 12)), mats.gold);
  medallionL.rotation.z = Math.PI / 2;
  medallionL.position.set(0, -0.068, 0.044);
  const trigGuard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.02, 0.006, 0.054)), mats.chrome);
  trigGuard.position.set(0, -0.052, -0.02);
  const trigger = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.007, 0.024, 0.008)), mats.gold);
  trigger.position.set(0, -0.036, -0.01);
  trigger.rotation.x = 0.2;
  g.add(frame, dustCover, grip, medallionL, trigGuard, trigger);

  // Iconic Triangular Fluted .50 AE Barrel + Compensated Muzzle Ports (static barrel)
  const barrelShroud = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.036, 0.038, 0.145)), mats.gold);
  barrelShroud.position.set(0, 0.022, -0.105);
  const barrelRibTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.024, 0.008, 0.148)), mats.chrome);
  barrelRibTop.position.set(0, 0.043, -0.105);
  g.add(barrelShroud, barrelRibTop);

  // Reciprocating Chrome Rear Slide with Serrations & Illuminated Crimson-Dot Iron Sights (sightline y = 0.053)
  const slideGroup = new THREE.Group();
  slideGroup.position.set(0, 0.022, -0.04);
  const slideMain = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.046, 0.04, 0.155)), mats.chrome);
  slideMain.position.set(0, 0, 0.038);
  const serGeo = trackGeo(new THREE.BoxGeometry(0.048, 0.028, 0.0045));
  for (let i = 0; i < 5; i++) {
    const ser = new THREE.Mesh(serGeo, mats.gunmetal);
    ser.position.set(0, 0, 0.068 + i * 0.0095);
    slideGroup.add(ser);
  }
  const rearL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.009, 0.011, 0.014)), mats.gunmetal);
  rearL.position.set(-0.011, 0.026, 0.102);
  const rearR = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.009, 0.011, 0.014)), mats.gunmetal);
  rearR.position.set(0.011, 0.026, 0.102);
  const rearDotL = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.0022, 6, 6)), mats.tritiumGlow);
  rearDotL.position.set(-0.01, 0.028, 0.109);
  const rearDotR = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.0022, 6, 6)), mats.tritiumGlow);
  rearDotR.position.set(0.01, 0.028, 0.109);
  slideGroup.add(slideMain, rearL, rearR, rearDotL, rearDotR);
  g.add(slideGroup);

  // Front ramp sight on static barrel
  const frontRamp = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.006, 0.012, 0.018)), mats.gunmetal);
  frontRamp.position.set(0, 0.05, -0.165);
  const frontDot = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.0026, 8, 8)), mats.reticleRed);
  frontDot.position.set(0, 0.052, -0.157);
  g.add(frontRamp, frontDot);

  // Chrome .50 AE Magazine with Gold Floorplate
  const magGroup = new THREE.Group();
  const magBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.03, 0.104, 0.044)), mats.chrome);
  magBody.position.set(0, -0.078, 0.045);
  magBody.rotation.x = -0.26;
  const magFoot = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.036, 0.014, 0.052)), mats.gold);
  magFoot.position.set(0, -0.132, 0.058);
  magFoot.rotation.x = -0.26;
  magGroup.add(magBody, magFoot);
  g.add(magGroup);

  g.add(
    buildSculptedTacticalHands(trackGeo, mats.glove, mats.sleeve, mats.gloveKnuckle, {
      rightPos: [0.006, -0.072, 0.046],
      leftPos: [-0.018, -0.076, 0.038],
      leftArmPos: [-0.098, -0.14, 0.165],
      leftArmRot: [Math.PI / 2 + 0.28, 0, 0.42],
      twoHandedPistol: true,
    })
  );

  return {
    group: g,
    mag: magGroup,
    slide: slideGroup,
    slideRestZ: -0.04,
    muzzlePos: new THREE.Vector3(0, 0.024, -0.185),
    dispose: () => ownedGeos.forEach((geo) => geo.dispose()),
  };
}

/** 9. RPG-7V — Heavy Anti-Armor Rocket Launcher with Ribbed Wood Heat Shield & PG-7V Warhead */
export function buildUpgradedRPG(mats: WeaponMaterialLibrary): WeaponModelResult {
  const ownedGeos: THREE.BufferGeometry[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(geo: T): T => {
    ownedGeos.push(geo);
    return geo;
  };
  const g = new THREE.Group();

  // Launch Tube + Flared Venturi Exhaust Cone + Walnut Heat Shield with Steel Clamps
  const mainTube = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.032, 0.032, 0.92, 16)), mats.gunmetal);
  mainTube.rotation.x = Math.PI / 2;
  mainTube.position.set(0, 0.02, -0.04);
  const heatWrap = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0385, 0.0385, 0.34, 14)), mats.walnutWood);
  heatWrap.rotation.x = Math.PI / 2;
  heatWrap.position.set(0, 0.02, -0.06);
  const clampGeo = trackGeo(new THREE.TorusGeometry(0.039, 0.0032, 6, 16));
  for (let i = -1; i <= 1; i++) {
    const cl = new THREE.Mesh(clampGeo, mats.brushedSteel);
    cl.position.set(0, 0.02, -0.06 + i * 0.14);
    g.add(cl);
  }
  const exhaustCone = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.032, 0.056, 0.16, 16)), mats.gunmetalLight);
  exhaustCone.rotation.x = Math.PI / 2;
  exhaustCone.position.set(0, 0.02, 0.48);
  const frontFlange = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.039, 0.034, 0.038, 16)), mats.brushedSteel);
  frontFlange.rotation.x = Math.PI / 2;
  frontFlange.position.set(0, 0.02, -0.49);
  g.add(mainTube, heatWrap, exhaustCone, frontFlange);

  // Dual Pistol Grips + Trigger Guard + Side Leaf/Optical Sight
  const frontGrip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.034, 0.096, 0.042)), mats.walnutWood);
  frontGrip.position.set(0, -0.056, -0.22);
  frontGrip.rotation.x = -0.22;
  const rearGrip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.032, 0.088, 0.038)), mats.polymer);
  rearGrip.position.set(0, -0.054, -0.02);
  rearGrip.rotation.x = -0.12;
  const trigGuard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.018, 0.006, 0.055)), mats.gunmetal);
  trigGuard.position.set(0, -0.04, -0.265);
  // Folding ladder iron sight (aligned cleanly at y = 0.086)
  const rearLeaf = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.024, 0.042, 0.008)), mats.gunmetal);
  rearLeaf.position.set(0, 0.072, -0.24);
  const frontLeaf = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.022, 0.044, 0.008)), mats.gunmetal);
  frontLeaf.position.set(0, 0.074, -0.46);
  const sightDot = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.0032, 8, 8)), mats.reticleAmber);
  sightDot.position.set(0, 0.086, -0.456);
  g.add(frontGrip, rearGrip, trigGuard, rearLeaf, frontLeaf, sightDot);

  // Loaded PG-7V Warhead (slides cleanly into muzzle during reload!)
  const magGroup = new THREE.Group();
  const neck = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.02, 0.024, 0.08, 12)), mats.gunmetalLight);
  neck.rotation.x = Math.PI / 2;
  neck.position.set(0, 0.02, -0.53);
  const warheadBody = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.045, 0.028, 0.145, 16)), mats.warheadOlive);
  warheadBody.rotation.x = Math.PI / 2;
  warheadBody.position.set(0, 0.02, -0.625);
  const yellowBand = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0456, 0.042, 0.018, 16)), mats.warheadStripe);
  yellowBand.rotation.x = Math.PI / 2;
  yellowBand.position.set(0, 0.02, -0.648);
  const warheadCone = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.045, 0.145, 16)), mats.warheadOlive);
  warheadCone.rotation.x = -Math.PI / 2;
  warheadCone.position.set(0, 0.02, -0.765);
  const piezoTip = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.007, 0.012, 0.028, 10)), mats.copper);
  piezoTip.rotation.x = Math.PI / 2;
  piezoTip.position.set(0, 0.02, -0.842);
  magGroup.add(neck, warheadBody, yellowBand, warheadCone, piezoTip);
  g.add(magGroup);

  g.add(
    buildSculptedTacticalHands(trackGeo, mats.glove, mats.sleeve, mats.gloveKnuckle, {
      rightPos: [0.008, -0.056, -0.22],
      leftPos: [-0.01, -0.054, -0.02],
      leftArmPos: [-0.088, -0.13, 0.12],
      leftArmRot: [Math.PI / 2 + 0.3, 0, 0.36],
    })
  );

  return {
    group: g,
    mag: magGroup,
    muzzlePos: new THREE.Vector3(0, 0.02, -0.86),
    dispose: () => ownedGeos.forEach((geo) => geo.dispose()),
  };
}
