import * as THREE from 'three';

/**
 * ============================================================================
 * MYTHIC SPAS-12 "ECLIPSE BREACHER" — 3D Procedural Model & Pooled VFX Engine
 * ============================================================================
 * Original procedural Three.js geometry, CanvasTexture maps (sRGB + anisotropy),
 * miniature rotating black hole + accretion ring in the barrel shroud, glowing
 * shell rack, holographic glass fins, live holographic Kill Counter, cinematic
 * shell-by-shell spinning reload + pump shockwave, golden corona shot VFX
 * (count-limited tracers + glowing ejected shells), and Supernova kill burst.
 *
 * Strict performance guarantees:
 * - Single InstancedMesh particle pool capped at <= 80 particles
 * - 0 extra dynamic lights per effect
 * - 0 second cameras
 * - Zero per-frame heap allocations in update loops
 * - Full .dispose() cleanup on unmount
 */

export const ECLIPSE_MAX_POOLED_PARTICLES = 80;
const MAX_GOLDEN_TRACERS = 6;
const MAX_EJECTED_SHELLS = 6;
const MAX_SHOCKWAVE_RINGS = 6;

const _tmpMat4 = new THREE.Matrix4();
const _tmpQuat = new THREE.Quaternion();
const _tmpScale = new THREE.Vector3();
const _tmpPos = new THREE.Vector3();
const _tmpDir = new THREE.Vector3();
const _tmpColor = new THREE.Color();
const _upAxis = new THREE.Vector3(0, 1, 0);

// ---------------------------------------------------------------------------
// 1. PROCEDURAL CANVAS TEXTURES (Obsidian + Gold Filigree, Roughness, Emissive, Kill Counter)
// ---------------------------------------------------------------------------

function createObsidianGoldTextures(maxAnisotropy: number): {
  albedoMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
} {
  const w = 512;
  const h = 256;

  // 1) Albedo: matte obsidian-black body with intricate golden astronomical engravings
  const aCanvas = document.createElement('canvas');
  aCanvas.width = w;
  aCanvas.height = h;
  const ctx = aCanvas.getContext('2d');

  // 2) Roughness: matte black chassis (0.62) vs mirror-like brushed gold inlays (0.18)
  const rCanvas = document.createElement('canvas');
  rCanvas.width = w;
  rCanvas.height = h;
  const rCtx = rCanvas.getContext('2d');

  // 3) Emissive: glowing golden-amber eclipse conduits & micro runes
  const eCanvas = document.createElement('canvas');
  eCanvas.width = w;
  eCanvas.height = h;
  const eCtx = eCanvas.getContext('2d');

  if (ctx && rCtx && eCtx) {
    // Base obsidian matte fill
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#0a0b0f');
    bgGrad.addColorStop(0.5, '#121319');
    bgGrad.addColorStop(1, '#08090c');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    rCtx.fillStyle = '#a8a8a8';
    rCtx.fillRect(0, 0, w, h);

    eCtx.fillStyle = '#000000';
    eCtx.fillRect(0, 0, w, h);

    // Subtle micro-carbon diagonal weave
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;
    for (let x = -h; x < w + h; x += 12) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + h, h);
      ctx.stroke();
    }

    // Recessed armor panel seams
    ctx.strokeStyle = '#050507';
    ctx.lineWidth = 3;
    ctx.strokeRect(14, 16, w - 28, h - 32);
    ctx.beginPath();
    ctx.moveTo(160, 16);
    ctx.lineTo(188, 72);
    ctx.lineTo(360, 72);
    ctx.lineTo(386, 16);
    ctx.moveTo(14, 186);
    ctx.lineTo(w - 14, 186);
    ctx.stroke();

    // Intricate Golden Engravings (orbital arcs, eclipse rings & micro chevrons)
    const goldGrad = ctx.createLinearGradient(0, 0, w, 0);
    goldGrad.addColorStop(0, '#b47812');
    goldGrad.addColorStop(0.35, '#f6c445');
    goldGrad.addColorStop(0.5, '#fff0a6');
    goldGrad.addColorStop(0.7, '#d99a1e');
    goldGrad.addColorStop(1, '#9a6510');

    ctx.strokeStyle = goldGrad;
    ctx.lineWidth = 2.6;
    ctx.strokeRect(20, 22, w - 40, h - 44);

    // Paint low roughness on gold trim so specular highlights gleam
    rCtx.strokeStyle = '#2d2d2d';
    rCtx.lineWidth = 4;
    rCtx.strokeRect(20, 22, w - 40, h - 44);

    // Central Eclipse medallion engraving
    const cx = 256;
    const cy = 128;
    ctx.beginPath();
    ctx.arc(cx, cy, 48, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, 58, -0.7, 2.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 34, 0, Math.PI * 2);
    ctx.stroke();

    rCtx.beginPath();
    rCtx.arc(cx, cy, 48, 0, Math.PI * 2);
    rCtx.stroke();

    // Glowing eclipse crescent & conduits on emissive map
    eCtx.strokeStyle = '#ffbe2e';
    eCtx.lineWidth = 3.2;
    eCtx.beginPath();
    eCtx.arc(cx, cy, 46, -0.55, 2.15);
    eCtx.stroke();
    eCtx.strokeStyle = '#fff3b0';
    eCtx.lineWidth = 1.8;
    eCtx.beginPath();
    eCtx.arc(cx, cy, 46, -0.25, 1.35);
    eCtx.stroke();

    // Horizontal golden filigree channels + micro-engraved chevrons
    for (let i = 0; i < 6; i++) {
      const lx = 44 + i * 24;
      const rx = w - 44 - i * 24;
      ctx.strokeStyle = goldGrad;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(lx, 108);
      ctx.lineTo(lx + 11, 128);
      ctx.lineTo(lx, 148);
      ctx.moveTo(rx, 108);
      ctx.lineTo(rx - 11, 128);
      ctx.lineTo(rx, 148);
      ctx.stroke();

      rCtx.beginPath();
      rCtx.moveTo(lx, 108);
      rCtx.lineTo(lx + 11, 128);
      rCtx.lineTo(lx, 148);
      rCtx.moveTo(rx, 108);
      rCtx.lineTo(rx - 11, 128);
      rCtx.lineTo(rx, 148);
      rCtx.stroke();

      if (i % 2 === 0) {
        eCtx.strokeStyle = '#f59e0b';
        eCtx.lineWidth = 1.6;
        eCtx.beginPath();
        eCtx.moveTo(lx + 3, 114);
        eCtx.lineTo(lx + 11, 128);
        eCtx.lineTo(lx + 3, 142);
        eCtx.moveTo(rx - 3, 114);
        eCtx.lineTo(rx - 11, 128);
        eCtx.lineTo(rx - 3, 142);
        eCtx.stroke();
      }
    }

    // Upper & lower golden energy veins
    ctx.strokeStyle = goldGrad;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(28, 62);
    ctx.lineTo(156, 62);
    ctx.moveTo(356, 62);
    ctx.lineTo(w - 28, 62);
    ctx.moveTo(28, 198);
    ctx.lineTo(w - 28, 198);
    ctx.stroke();

    eCtx.strokeStyle = '#fbbf24';
    eCtx.lineWidth = 2.4;
    eCtx.beginPath();
    eCtx.moveTo(32, 62);
    eCtx.lineTo(154, 62);
    eCtx.moveTo(358, 62);
    eCtx.lineTo(w - 32, 62);
    eCtx.moveTo(64, 198);
    eCtx.lineTo(w - 64, 198);
    eCtx.stroke();

    // Subtle MYTHIC engraved serial dots
    ctx.fillStyle = '#fde047';
    for (let d = 0; d < 8; d++) {
      ctx.fillRect(34 + d * 12, 212, 5, 3);
      ctx.fillRect(w - 40 - d * 12, 212, 5, 3);
    }
  }

  const albedoMap = new THREE.CanvasTexture(aCanvas);
  albedoMap.colorSpace = THREE.SRGBColorSpace;
  albedoMap.anisotropy = maxAnisotropy;
  albedoMap.wrapS = THREE.RepeatWrapping;
  albedoMap.wrapT = THREE.RepeatWrapping;

  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  roughnessMap.anisotropy = maxAnisotropy;

  const emissiveMap = new THREE.CanvasTexture(eCanvas);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.anisotropy = maxAnisotropy;

  return { albedoMap, roughnessMap, emissiveMap };
}

function createEclipseKillCounterTexture(): {
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  draw: (kills: number) => void;
} {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const draw = (kills: number) => {
    if (!ctx) return;
    const safeKills = Math.max(0, Math.min(999, Math.floor(kills)));
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Translucent dark obsidian hologram backing
    const bg = ctx.createLinearGradient(0, 0, 256, 128);
    bg.addColorStop(0, 'rgba(14, 10, 4, 0.90)');
    bg.addColorStop(0.5, 'rgba(34, 22, 6, 0.84)');
    bg.addColorStop(1, 'rgba(10, 8, 12, 0.92)');
    ctx.fillStyle = bg;
    ctx.fillRect(6, 6, 244, 116);

    // Golden holographic frame & corner ticks
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.92)';
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, 240, 112);

    // Subtle scanlines
    ctx.fillStyle = 'rgba(253, 224, 71, 0.08)';
    for (let y = 14; y < 116; y += 6) {
      ctx.fillRect(10, y, 236, 2);
    }

    // Mini eclipsed sun icon
    ctx.beginPath();
    ctx.arc(38, 64, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#060609';
    ctx.fill();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 3.2;
    ctx.stroke();

    // Header label
    ctx.fillStyle = '#fcd34d';
    ctx.font = 'bold 17px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('MYTHIC · ECLIPSE', 68, 36);

    // Large glowing kill count readout
    ctx.fillStyle = '#fffbeb';
    ctx.font = '900 46px monospace';
    ctx.fillText(String(safeKills).padStart(2, '0'), 68, 92);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('ELIMS', 142, 86);

    texture.needsUpdate = true;
  };

  draw(0);
  return { canvas, texture, draw };
}

// ---------------------------------------------------------------------------
// 2. MYTHIC SPAS-12 "ECLIPSE BREACHER" 3D MODEL
// ---------------------------------------------------------------------------

export type EclipseReloadPhase = 'idle' | 'tilt' | 'shell_1' | 'shell_2' | 'shell_3' | 'pump' | 'settle';

export interface EclipseBreacherModelHandle {
  group: THREE.Group;
  pump: THREE.Object3D;
  mag: THREE.Object3D | null;
  muzzlePos: THREE.Vector3;
  triggerShot: () => void;
  setKillCount: (kills: number) => void;
  setOpticVisible: (visible: boolean) => void;
  applyCinematicReload: (progress: number) => {
    phase: EclipseReloadPhase;
    weaponPitchOffset: number;
    weaponRollOffset: number;
    weaponDropOffset: number;
    pumpShockwaveActive: boolean;
  };
  updateAnimation: (dt: number, elapsedSec: number, fxEnabled?: boolean) => void;
  dispose: () => void;
}

export interface BuildEclipseBreacherOptions {
  includeHands?: boolean;
  gloveMat?: THREE.Material;
  sleeveMat?: THREE.Material;
  maxAnisotropy?: number;
}

function smoothstep01(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

export function buildEclipseBreacherSpas12(
  options: BuildEclipseBreacherOptions = {}
): EclipseBreacherModelHandle {
  const { includeHands = false, gloveMat, sleeveMat, maxAnisotropy = 4 } = options;
  const g = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const trackGeo = <T extends THREE.BufferGeometry>(geo: T): T => {
    disposables.push(geo);
    return geo;
  };
  const trackMat = <T extends THREE.Material>(mat: T): T => {
    disposables.push(mat);
    return mat;
  };

  const { albedoMap, roughnessMap, emissiveMap } = createObsidianGoldTextures(maxAnisotropy);
  disposables.push(albedoMap, roughnessMap, emissiveMap);

  const killCounter = createEclipseKillCounterTexture();
  disposables.push(killCounter.texture);

  // Materials — Distinct Obsidian + Brushed Gold + Holographic Amber-White Mythic palette
  const obsidianEngravedMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: albedoMap,
      roughnessMap,
      emissive: new THREE.Color(0xffb82e),
      emissiveMap,
      emissiveIntensity: 0.72,
      roughness: 0.56,
      metalness: 0.58,
    })
  );

  const matteObsidianMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x101116,
      roughness: 0.52,
      metalness: 0.45,
    })
  );

  const gildedGoldMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf4c44e,
      emissive: new THREE.Color(0x8a5404),
      emissiveIntensity: 0.25,
      roughness: 0.2,
      metalness: 0.94,
    })
  );

  const brightCoronaMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfff3c4,
      emissive: new THREE.Color(0xffbe2e),
      emissiveIntensity: 1.9,
      roughness: 0.12,
      metalness: 0.2,
    })
  );

  const holoGlassMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xffe8a3,
      emissive: new THREE.Color(0xf59e0b),
      emissiveIntensity: 0.55,
      roughness: 0.08,
      metalness: 0.1,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );

  const eventHorizonMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x030307,
    })
  );

  const accretionRingMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffcf4a,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );

  const innerCoronaRingMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xfff8dc,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );

  const shellGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffd15c,
      emissive: new THREE.Color(0xffa600),
      emissiveIntensity: 1.45,
      roughness: 0.22,
      metalness: 0.65,
    })
  );

  const killCounterMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: killCounter.texture,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );

  const pumpShockRingMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffe074,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );

  // 1) Main Sculpted Receiver (obsidian with golden engravings + beveled side plates)
  const receiver = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.062, 0.078, 0.31)), obsidianEngravedMat);
  g.add(receiver);

  // Upper chamfered receiver spine with golden trim rails
  const topSpine = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.048, 0.014, 0.30)), matteObsidianMat);
  topSpine.position.set(0, 0.044, -0.005);
  g.add(topSpine);

  const railLeft = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.006, 0.008, 0.29)), gildedGoldMat);
  railLeft.position.set(-0.025, 0.044, -0.01);
  const railRight = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.006, 0.008, 0.29)), gildedGoldMat);
  railRight.position.set(0.025, 0.044, -0.01);
  g.add(railLeft, railRight);

  // Side micro-engraved gold accent blades
  const sidePlateGeo = trackGeo(new THREE.BoxGeometry(0.006, 0.048, 0.22));
  const sidePlateL = new THREE.Mesh(sidePlateGeo, gildedGoldMat);
  sidePlateL.position.set(-0.032, 0.004, -0.01);
  const sidePlateR = new THREE.Mesh(sidePlateGeo, gildedGoldMat);
  sidePlateR.position.set(0.032, 0.004, -0.01);
  g.add(sidePlateL, sidePlateR);

  // Luminous golden energy strips along receiver flanks
  const flankVeinGeo = trackGeo(new THREE.BoxGeometry(0.004, 0.007, 0.25));
  const flankVeinL = new THREE.Mesh(flankVeinGeo, brightCoronaMat);
  flankVeinL.position.set(-0.034, -0.012, -0.015);
  const flankVeinR = new THREE.Mesh(flankVeinGeo, brightCoronaMat);
  flankVeinR.position.set(0.034, -0.012, -0.015);
  g.add(flankVeinL, flankVeinR);

  // 2) Open-Arch Ventilated Barrel Shroud housing the Miniature Black Hole
  const shroudTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.052, 0.012, 0.40)), obsidianEngravedMat);
  shroudTop.position.set(0, 0.046, -0.34);
  g.add(shroudTop);

  // Dual sculpted side ribs of the barrel shroud (open window in middle so black hole shines clearly!)
  const shroudRibGeo = trackGeo(new THREE.BoxGeometry(0.009, 0.022, 0.39));
  const shroudRibL = new THREE.Mesh(shroudRibGeo, matteObsidianMat);
  shroudRibL.position.set(-0.026, 0.026, -0.34);
  const shroudRibR = new THREE.Mesh(shroudRibGeo, matteObsidianMat);
  shroudRibR.position.set(0.026, 0.026, -0.34);
  g.add(shroudRibL, shroudRibR);

  // Golden shroud brackets & cooling fins
  const bracketGeo = trackGeo(new THREE.BoxGeometry(0.058, 0.008, 0.014));
  for (let i = 0; i < 4; i++) {
    const zPos = -0.18 - i * 0.105;
    const br = new THREE.Mesh(bracketGeo, gildedGoldMat);
    br.position.set(0, 0.049, zPos);
    g.add(br);
  }

  // Holographic Glass Shroud Fins (left & right translucent golden shields)
  const holoFinGeo = trackGeo(new THREE.BoxGeometry(0.003, 0.034, 0.24));
  const holoFinL = new THREE.Mesh(holoFinGeo, holoGlassMat);
  holoFinL.position.set(-0.034, 0.036, -0.29);
  holoFinL.rotation.z = 0.26;
  const holoFinR = new THREE.Mesh(holoFinGeo, holoGlassMat);
  holoFinR.position.set(0.034, 0.036, -0.29);
  holoFinR.rotation.z = -0.26;
  g.add(holoFinL, holoFinR);

  // 3) MINIATURE GLOWING BLACK HOLE WITH ROTATING ACCRETION RING (inside the barrel shroud!)
  const blackHolePivot = new THREE.Group();
  blackHolePivot.position.set(0, 0.028, -0.27);
  g.add(blackHolePivot);

  const eventHorizonSphere = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.017, 16, 14)),
    eventHorizonMat
  );
  blackHolePivot.add(eventHorizonSphere);

  // Inner luminous photon sphere halo
  const photonRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.0205, 0.0024, 8, 28)),
    brightCoronaMat
  );
  photonRing.rotation.y = Math.PI / 2;
  blackHolePivot.add(photonRing);

  // Primary tilted rotating golden accretion disc
  const accretionDisc = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(0.021, 0.037, 32)),
    accretionRingMat
  );
  accretionDisc.rotation.set(Math.PI * 0.36, 0.35, 0);
  blackHolePivot.add(accretionDisc);

  // Counter-rotating outer orbital corona ring
  const outerCoronaRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.033, 0.0018, 6, 32)),
    innerCoronaRingMat
  );
  outerCoronaRing.rotation.set(-Math.PI * 0.28, -0.4, 0);
  blackHolePivot.add(outerCoronaRing);

  // 4) Heavy Fluted Barrel, Golden Crown Muzzle Brake & Under-barrel Mag Tube
  const barrel = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.0155, 0.0165, 0.49, 14)),
    matteObsidianMat
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.019, -0.365);
  g.add(barrel);

  // Golden crown muzzle compensator
  const muzzleCrown = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.022, 0.0185, 0.055, 8)),
    gildedGoldMat
  );
  muzzleCrown.rotation.x = Math.PI / 2;
  muzzleCrown.position.set(0, 0.019, -0.585);
  g.add(muzzleCrown);

  const muzzleGlowRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.018, 0.0028, 6, 18)),
    brightCoronaMat
  );
  muzzleGlowRing.position.set(0, 0.019, -0.606);
  g.add(muzzleGlowRing);

  // Under-barrel extended magazine tube (holds 9 shells!)
  const magTube = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.0145, 0.0145, 0.46, 12)),
    matteObsidianMat
  );
  magTube.rotation.x = Math.PI / 2;
  magTube.position.set(0, -0.013, -0.35);
  g.add(magTube);

  const magTubeCap = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.0165, 0.0165, 0.028, 12)),
    gildedGoldMat
  );
  magTubeCap.rotation.x = Math.PI / 2;
  magTubeCap.position.set(0, -0.013, -0.575);
  g.add(magTubeCap);

  // 5) Articulated Tactical Pump Forend (with obsidian/gold grip ribs + expanding shockwave ring)
  const pumpGroup = new THREE.Group();
  pumpGroup.position.set(0, -0.016, -0.28);
  g.add(pumpGroup);

  const pumpBody = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.06, 0.05, 0.165)),
    obsidianEngravedMat
  );
  pumpGroup.add(pumpBody);

  const pumpGoldTrimGeo = trackGeo(new THREE.BoxGeometry(0.063, 0.01, 0.014));
  for (let i = -2; i <= 2; i++) {
    const rib = new THREE.Mesh(pumpGoldTrimGeo, i === 0 ? brightCoronaMat : gildedGoldMat);
    rib.position.set(0, -0.006, i * 0.028);
    pumpGroup.add(rib);
  }

  // Pump shockwave ring (expands at end of cinematic reload)
  const pumpShockwaveMesh = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(0.032, 0.048, 28)),
    pumpShockRingMat
  );
  pumpShockwaveMesh.position.set(0, 0.015, -0.32);
  g.add(pumpShockwaveMesh);

  // 6) Glowing Side Shell Rack (6 luminous 12-gauge plasma-gold shells on left side of receiver)
  const shellRackGroup = new THREE.Group();
  shellRackGroup.position.set(-0.039, 0.006, -0.02);
  g.add(shellRackGroup);

  const rackRail = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.01, 0.024, 0.155)),
    matteObsidianMat
  );
  shellRackGroup.add(rackRail);

  const shellBodyGeo = trackGeo(new THREE.CylinderGeometry(0.0068, 0.0068, 0.044, 10));
  const shellBrassGeo = trackGeo(new THREE.CylinderGeometry(0.0073, 0.0073, 0.014, 10));
  const rackShellMeshes: THREE.Group[] = [];
  for (let s = 0; s < 6; s++) {
    const sg = new THREE.Group();
    sg.position.set(-0.006, 0.002, -0.058 + s * 0.023);
    const body = new THREE.Mesh(shellBodyGeo, shellGlowMat);
    const brass = new THREE.Mesh(shellBrassGeo, gildedGoldMat);
    brass.position.y = -0.018;
    sg.add(body, brass);
    shellRackGroup.add(sg);
    rackShellMeshes.push(sg);
  }

  // 7) Cinematic Spinning Shell (animates one-by-one into the loading port during reload)
  const reloadShellGroup = new THREE.Group();
  reloadShellGroup.visible = false;
  const rShellBody = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.0085, 0.0085, 0.052, 10)),
    shellGlowMat
  );
  rShellBody.rotation.x = Math.PI / 2;
  const rShellBrass = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.0092, 0.0092, 0.016, 10)),
    gildedGoldMat
  );
  rShellBrass.rotation.x = Math.PI / 2;
  rShellBrass.position.z = 0.02;
  const rShellHalo = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.013, 0.002, 6, 16)),
    innerCoronaRingMat
  );
  reloadShellGroup.add(rShellBody, rShellBrass, rShellHalo);
  g.add(reloadShellGroup);

  // 8) Holographic Eclipse Ring Optic on Top Rail (matches ADS Eclipse Sight)
  const opticGroup = new THREE.Group();
  opticGroup.position.set(0, 0.068, -0.03);
  g.add(opticGroup);

  const opticBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.04, 0.016, 0.072)), matteObsidianMat);
  opticBase.position.set(0, -0.014, 0);
  opticGroup.add(opticBase);

  const opticRingFrame = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.022, 0.0036, 8, 24)),
    gildedGoldMat
  );
  opticRingFrame.position.set(0, 0.012, 0);
  opticGroup.add(opticRingFrame);

  const opticHoloGlass = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(0.0195, 22)),
    holoGlassMat
  );
  opticHoloGlass.position.set(0, 0.012, 0);
  opticGroup.add(opticHoloGlass);

  const opticEclipseReticle = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(0.006, 0.009, 20)),
    innerCoronaRingMat
  );
  opticEclipseReticle.position.set(0, 0.012, 0.0015);
  opticGroup.add(opticEclipseReticle);

  // 9) Live Holographic Kill Counter (projected cleanly on left-top receiver flank)
  const killCounterMount = new THREE.Group();
  killCounterMount.position.set(-0.044, 0.056, 0.055);
  killCounterMount.rotation.set(0, 0.24, -0.08);
  g.add(killCounterMount);

  const killCounterArm = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.018, 0.007, 0.016)),
    gildedGoldMat
  );
  killCounterArm.position.set(0.012, -0.014, 0);
  killCounterMount.add(killCounterArm);

  const killCounterScreen = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(0.058, 0.029)),
    killCounterMat
  );
  killCounterMount.add(killCounterScreen);

  // 10) Folding Tactical Stock & Sculpted Pistol Grip (obsidian + gold filigree)
  const stockUpper = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.048, 0.026, 0.23)), obsidianEngravedMat);
  stockUpper.position.set(0, 0.004, 0.245);
  stockUpper.rotation.x = 0.06;
  const stockLower = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.042, 0.056, 0.16)), matteObsidianMat);
  stockLower.position.set(0, -0.026, 0.275);
  stockLower.rotation.x = 0.1;
  const stockGoldPlate = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.05, 0.075, 0.016)), gildedGoldMat);
  stockGoldPlate.position.set(0, -0.02, 0.358);
  g.add(stockUpper, stockLower, stockGoldPlate);

  const grip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.039, 0.098, 0.048)), matteObsidianMat);
  grip.position.set(0, -0.074, 0.1);
  grip.rotation.x = -0.28;
  const gripGoldCap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.042, 0.012, 0.052)), gildedGoldMat);
  gripGoldCap.position.set(0, -0.118, 0.114);
  gripGoldCap.rotation.x = -0.28;
  g.add(grip, gripGoldCap);

  // Optional first-person tactical hands (attached cleanly to grip & pump)
  if (includeHands && gloveMat && sleeveMat) {
    const rHand = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.054, 0.065, 0.075)), gloveMat);
    rHand.position.set(0.008, -0.07, 0.1);
    const lHand = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.064, 0.055, 0.09)), gloveMat);
    lHand.position.set(-0.008, -0.009, 0);
    pumpGroup.add(lHand);
    const lArm = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.065, 0.065, 0.24)), sleeveMat);
    lArm.position.set(-0.09, -0.11, -0.11);
    lArm.rotation.set(0.32, -0.35, 0);
    g.add(rHand, lArm);
  }

  let shotPulse = 0;
  let pumpWaveTimer = 0;
  let reloadActive = false;

  return {
    group: g,
    pump: pumpGroup,
    mag: reloadShellGroup,
    muzzlePos: new THREE.Vector3(0, 0.02, -0.61),

    triggerShot: () => {
      shotPulse = 1.0;
    },

    setKillCount: (kills: number) => {
      killCounter.draw(kills);
    },

    setOpticVisible: (visible: boolean) => {
      opticGroup.visible = visible;
    },

    applyCinematicReload: (progress: number) => {
      const p = Math.max(0, Math.min(1, progress));
      if (p <= 0.001 || p >= 0.999) {
        reloadActive = false;
        reloadShellGroup.visible = false;
        pumpGroup.position.z = -0.28;
        pumpShockRingMat.opacity = 0;
        for (let i = 0; i < rackShellMeshes.length; i++) {
          rackShellMeshes[i].scale.setScalar(1);
        }
        return {
          phase: 'idle',
          weaponPitchOffset: 0,
          weaponRollOffset: 0,
          weaponDropOffset: 0,
          pumpShockwaveActive: false,
        };
      }

      reloadActive = true;
      let phase: EclipseReloadPhase = 'tilt';
      let weaponPitchOffset = 0;
      let weaponRollOffset = 0;
      let weaponDropOffset = 0;
      let pumpShockwaveActive = false;

      // Tilt envelope: expose loading port & glowing shell rack
      const tiltEnv =
        p < 0.14
          ? smoothstep01(p / 0.14)
          : p < 0.78
            ? 1
            : 1 - smoothstep01((p - 0.78) / 0.22);

      weaponRollOffset = 0.62 * tiltEnv;
      weaponPitchOffset = 0.22 * tiltEnv;
      weaponDropOffset = -0.055 * tiltEnv;

      if (p < 0.14) {
        phase = 'tilt';
        reloadShellGroup.visible = false;
        pumpGroup.position.z = -0.28;
      } else if (p < 0.74) {
        // 3 spinning luminous shells inserted one-by-one into the loading port!
        const shellSpan = (p - 0.14) / 0.6; // 0..1 across 3 shells
        const shellIdx = Math.min(2, Math.floor(shellSpan * 3));
        const localT = (shellSpan * 3) - shellIdx; // 0..1 per shell
        phase = shellIdx === 0 ? 'shell_1' : shellIdx === 1 ? 'shell_2' : 'shell_3';

        const arc = Math.sin(localT * Math.PI);
        reloadShellGroup.visible = true;
        // Shell arcs from left-below up into underside loading bay while spinning rapidly
        reloadShellGroup.position.set(
          -0.065 * (1 - smoothstep01(localT)),
          -0.14 * (1 - smoothstep01(localT)) - 0.025,
          -0.03 + 0.04 * (1 - localT)
        );
        reloadShellGroup.rotation.set(
          localT * Math.PI * 2.5,
          0.35 * (1 - localT),
          localT * Math.PI * 4.0
        );
        weaponDropOffset += arc * 0.024;
        weaponPitchOffset += arc * 0.06;
        pumpGroup.position.z = -0.28;

        // Pulse rack shells sequentially
        for (let i = 0; i < rackShellMeshes.length; i++) {
          const highlight = i === shellIdx ? 1.18 : 1.0;
          rackShellMeshes[i].scale.setScalar(highlight);
        }
      } else if (p < 0.93) {
        // Crisp tactical pump + expanding golden shockwave ring
        phase = 'pump';
        reloadShellGroup.visible = false;
        const pumpT = (p - 0.74) / 0.19; // 0..1
        const pumpBack = Math.sin(pumpT * Math.PI);
        pumpGroup.position.z = -0.28 + pumpBack * 0.105;
        weaponPitchOffset += pumpBack * 0.11;
        weaponDropOffset += pumpBack * 0.02;

        // Expanding golden shockwave ring around barrel shroud when pump slams forward
        if (pumpT >= 0.45) {
          pumpShockwaveActive = true;
          const waveT = (pumpT - 0.45) / 0.55;
          pumpShockwaveMesh.scale.setScalar(1.0 + waveT * 3.8);
          pumpShockRingMat.opacity = (1 - waveT) * 0.85;
          pumpWaveTimer = Math.max(pumpWaveTimer, 0.15);
        } else {
          pumpShockRingMat.opacity = 0;
        }
      } else {
        phase = 'settle';
        reloadShellGroup.visible = false;
        pumpGroup.position.z = -0.28;
        pumpShockRingMat.opacity = Math.max(0, pumpShockRingMat.opacity - 0.15);
      }

      return {
        phase,
        weaponPitchOffset,
        weaponRollOffset,
        weaponDropOffset,
        pumpShockwaveActive,
      };
    },

    updateAnimation: (dt: number, elapsedSec: number, fxEnabled = true) => {
      if (shotPulse > 0) {
        shotPulse = Math.max(0, shotPulse - dt * 3.6);
      }
      if (pumpWaveTimer > 0 && !reloadActive) {
        pumpWaveTimer = Math.max(0, pumpWaveTimer - dt);
        pumpShockRingMat.opacity = Math.max(0, pumpShockRingMat.opacity - dt * 4.5);
      }

      // Spin the miniature black hole accretion disc & counter-rotating corona ring
      const spinMult = fxEnabled ? 1 + shotPulse * 3.2 : 0.25;
      accretionDisc.rotation.z += dt * 2.4 * spinMult;
      outerCoronaRing.rotation.z -= dt * 1.85 * spinMult;
      outerCoronaRing.rotation.x = -Math.PI * 0.28 + Math.sin(elapsedSec * 1.6) * 0.14;

      const bhScale = 1.0 + shotPulse * 0.28 + (fxEnabled ? Math.sin(elapsedSec * 3.4) * 0.04 : 0);
      blackHolePivot.scale.setScalar(bhScale);

      // Gentle breathing glow on obsidian engravings, holographic fins, and shell rack
      const pulse = fxEnabled ? 0.5 + 0.5 * Math.sin(elapsedSec * 2.8) : 0.5;
      obsidianEngravedMat.emissiveIntensity = 0.62 + pulse * 0.34 + shotPulse * 1.15;
      brightCoronaMat.emissiveIntensity = 1.65 + pulse * 0.55 + shotPulse * 1.8;
      shellGlowMat.emissiveIntensity = 1.2 + pulse * 0.5 + shotPulse * 0.75;
      holoGlassMat.emissiveIntensity = 0.42 + pulse * 0.26 + shotPulse * 0.65;
      opticEclipseReticle.rotation.z = elapsedSec * (fxEnabled ? 0.7 : 0.15);
    },

    dispose: () => {
      for (let i = 0; i < disposables.length; i++) {
        disposables[i].dispose();
      }
    },
  };
}

// ---------------------------------------------------------------------------
// 3. POOLED VFX ENGINE (<= 80 Instanced Particles, Count-Limited Golden Tracers,
//    Glowing Ejected Shells, Supernova Kill Burst — 0 Extra Lights)
// ---------------------------------------------------------------------------

interface PooledEclipseParticle {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  baseScale: number;
  gravity: number;
  colorHex: number;
}

interface PooledGoldenTracer {
  active: boolean;
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  life: number;
  maxLife: number;
}

interface PooledGlowShell {
  active: boolean;
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  rotVel: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface PooledShockRing {
  active: boolean;
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  life: number;
  maxLife: number;
  startScale: number;
  endScale: number;
}

export class EclipseBreacherVfxPool {
  private readonly maxParticles: number;
  private readonly particleMesh: THREE.InstancedMesh;
  private readonly particleGeo: THREE.BufferGeometry;
  private readonly particleMat: THREE.MeshBasicMaterial;
  private readonly particles: PooledEclipseParticle[] = [];
  private particleCursor = 0;

  private readonly tracers: PooledGoldenTracer[] = [];
  private readonly tracerGeo: THREE.BufferGeometry;
  private tracerCursor = 0;

  private readonly shells: PooledGlowShell[] = [];
  private readonly shellGeo: THREE.BufferGeometry;
  private readonly shellMat: THREE.MeshBasicMaterial;
  private shellCursor = 0;

  private readonly rings: PooledShockRing[] = [];
  private readonly ringGeo: THREE.BufferGeometry;
  private ringCursor = 0;

  private readonly root: THREE.Group;

  constructor(scene: THREE.Scene, maxParticles = ECLIPSE_MAX_POOLED_PARTICLES) {
    this.maxParticles = Math.max(16, Math.min(ECLIPSE_MAX_POOLED_PARTICLES, Math.floor(maxParticles)));
    this.root = new THREE.Group();
    scene.add(this.root);

    // Single InstancedMesh for all Supernova stars + golden corona sparks (<= 80 instances)
    this.particleGeo = new THREE.OctahedronGeometry(0.055, 0);
    this.particleMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.94,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.particleMesh = new THREE.InstancedMesh(this.particleGeo, this.particleMat, this.maxParticles);
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleMesh.frustumCulled = false;

    _tmpScale.set(0, 0, 0);
    _tmpPos.set(0, -999, 0);
    _tmpQuat.identity();
    _tmpMat4.compose(_tmpPos, _tmpQuat, _tmpScale);
    for (let i = 0; i < this.maxParticles; i++) {
      this.particleMesh.setMatrixAt(i, _tmpMat4);
      this.particleMesh.setColorAt(i, _tmpColor.setHex(0xffcf4a));
      this.particles.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.5,
        baseScale: 1,
        gravity: 0,
        colorHex: 0xffcf4a,
      });
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    this.root.add(this.particleMesh);

    // Count-limited Golden Pellet Tracer Pool
    this.tracerGeo = new THREE.CylinderGeometry(0.011, 0.004, 1.0, 6);
    for (let i = 0; i < MAX_GOLDEN_TRACERS; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffd55a,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.tracerGeo, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.root.add(mesh);
      this.tracers.push({ active: false, mesh, mat, life: 0, maxLife: 0.14 });
    }

    // Pooled Glowing Ejected Shotgun Shells
    this.shellGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.056, 8);
    this.shellMat = new THREE.MeshBasicMaterial({
      color: 0xffc83d,
    });
    for (let i = 0; i < MAX_EJECTED_SHELLS; i++) {
      const mesh = new THREE.Mesh(this.shellGeo, this.shellMat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.root.add(mesh);
      this.shells.push({
        active: false,
        mesh,
        vel: new THREE.Vector3(),
        rotVel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.72,
      });
    }

    // Pooled Shockwave / Corona Halo Rings (for Muzzle Corona + Supernova Kill)
    this.ringGeo = new THREE.RingGeometry(0.62, 1.0, 28);
    for (let i = 0; i < MAX_SHOCKWAVE_RINGS; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffcf4a,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.ringGeo, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.root.add(mesh);
      this.rings.push({
        active: false,
        mesh,
        mat,
        life: 0,
        maxLife: 0.5,
        startScale: 0.2,
        endScale: 2.0,
      });
    }
  }

  private emitParticle(
    origin: THREE.Vector3,
    vx: number,
    vy: number,
    vz: number,
    maxLife: number,
    baseScale: number,
    gravity: number,
    colorHex: number
  ): void {
    const slot = this.particles[this.particleCursor];
    this.particleCursor = (this.particleCursor + 1) % this.maxParticles;
    slot.active = true;
    slot.pos.copy(origin);
    slot.vel.set(vx, vy, vz);
    slot.life = 0;
    slot.maxLife = maxLife;
    slot.baseScale = baseScale;
    slot.gravity = gravity;
    slot.colorHex = colorHex;
    this.particleMesh.setColorAt(this.particleCursor === 0 ? this.maxParticles - 1 : this.particleCursor - 1, _tmpColor.setHex(colorHex));
    if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
  }

  private emitRing(
    origin: THREE.Vector3,
    normalDir: THREE.Vector3 | null,
    startScale: number,
    endScale: number,
    maxLife: number,
    colorHex: number
  ): void {
    const slot = this.rings[this.ringCursor];
    this.ringCursor = (this.ringCursor + 1) % MAX_SHOCKWAVE_RINGS;
    slot.active = true;
    slot.life = 0;
    slot.maxLife = maxLife;
    slot.startScale = startScale;
    slot.endScale = endScale;
    slot.mat.color.setHex(colorHex);
    slot.mat.opacity = 0.92;
    slot.mesh.position.copy(origin);
    if (normalDir && normalDir.lengthSq() > 0.0001) {
      _tmpDir.copy(normalDir).normalize();
      slot.mesh.lookAt(
        origin.x + _tmpDir.x,
        origin.y + _tmpDir.y,
        origin.z + _tmpDir.z
      );
    } else {
      slot.mesh.rotation.set(Math.PI / 2, 0, 0);
    }
    slot.mesh.scale.setScalar(startScale);
    slot.mesh.visible = true;
  }

  private emitGoldenTracer(start: THREE.Vector3, end: THREE.Vector3, duration = 0.14): void {
    _tmpDir.subVectors(end, start);
    const dist = _tmpDir.length();
    if (dist < 0.35) return;
    const slot = this.tracers[this.tracerCursor];
    this.tracerCursor = (this.tracerCursor + 1) % MAX_GOLDEN_TRACERS;
    slot.active = true;
    slot.life = 0;
    slot.maxLife = duration;
    slot.mat.opacity = 0.92;
    slot.mat.color.setHex(0xffd766);

    const beamLen = Math.min(dist, 28);
    slot.mesh.position.copy(start).addScaledVector(_tmpDir, (beamLen * 0.5) / dist);
    _tmpDir.multiplyScalar(1 / dist);
    slot.mesh.quaternion.setFromUnitVectors(_upAxis, _tmpDir);
    slot.mesh.scale.set(1, beamLen, 1);
    slot.mesh.visible = true;
  }

  /**
   * Shot VFX: Large golden corona halo + count-limited golden pellet tracers (max 3) + glowing ejected shell.
   */
  public spawnShotEffects(
    muzzleWorld: THREE.Vector3,
    pelletEndPoints: readonly THREE.Vector3[],
    options: {
      reducedMotion?: boolean;
      lowQuality?: boolean;
      maxParticlesBudget?: number;
      shellOrigin?: THREE.Vector3;
      shellRightDir?: THREE.Vector3;
    } = {}
  ): void {
    const simplified = Boolean(options.reducedMotion || options.lowQuality);
    const primaryEnd = pelletEndPoints[0];

    // 1) Golden Corona Halo Ring right at the muzzle
    if (primaryEnd) {
      _tmpDir.subVectors(primaryEnd, muzzleWorld);
      this.emitRing(
        muzzleWorld,
        _tmpDir,
        0.09,
        simplified ? 0.34 : 0.56,
        simplified ? 0.11 : 0.17,
        0xffcc3d
      );
    }

    // 2) Count-limited Golden Pellet Tracers (strictly max 3 beams per blast; 1 when simplified)
    const maxBeams = simplified ? 1 : 3;
    const beamCount = Math.min(maxBeams, pelletEndPoints.length);
    for (let i = 0; i < beamCount; i++) {
      this.emitGoldenTracer(muzzleWorld, pelletEndPoints[i], simplified ? 0.1 : 0.14);
    }

    // 3) Corona Muzzle Sparks (pooled, <= 8 sparks per shot, clamped to global particle budget)
    const desiredSparks = simplified ? 3 : 8;
    const sparkCount =
      typeof options.maxParticlesBudget === 'number'
        ? Math.max(0, Math.min(desiredSparks, Math.floor(options.maxParticlesBudget)))
        : desiredSparks;
    for (let i = 0; i < sparkCount; i++) {
      const ang = (i / Math.max(1, sparkCount)) * Math.PI * 2 + Math.random() * 0.4;
      const spd = 2.4 + Math.random() * 3.8;
      this.emitParticle(
        muzzleWorld,
        Math.cos(ang) * spd * 0.65,
        Math.sin(ang) * spd * 0.55 + 0.6,
        (Math.random() - 0.5) * spd,
        0.16 + Math.random() * 0.14,
        0.65 + Math.random() * 0.5,
        4.5,
        i % 3 === 0 ? 0xfff6d6 : 0xffb82e
      );
    }

    // 4) Glowing Ejected Golden Shotgun Shell (zero per-shot allocations)
    if (!simplified && options.shellOrigin && options.shellRightDir) {
      const sh = this.shells[this.shellCursor];
      this.shellCursor = (this.shellCursor + 1) % MAX_EJECTED_SHELLS;
      sh.active = true;
      sh.life = 0;
      sh.maxLife = 0.68;
      sh.mesh.position.copy(options.shellOrigin);
      sh.mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      sh.vel
        .copy(options.shellRightDir)
        .multiplyScalar(2.3 + Math.random() * 0.9);
      sh.vel.y += 1.35 + Math.random() * 0.45;
      sh.rotVel.set(10 + Math.random() * 6, 8 + Math.random() * 6, 12 + Math.random() * 6);
      sh.mesh.visible = true;
    }
  }

  /**
   * Kill VFX: "Supernova" explosion (< 0.95s) — expanding shockwave rings + starry golden-white particle burst.
   * Larger & more radiant on Headshots; cleanly simplified under Reduced Motion / Low Quality.
   */
  public spawnKillEffect(
    worldPos: THREE.Vector3,
    options: {
      headshot?: boolean;
      reducedMotion?: boolean;
      lowQuality?: boolean;
    } = {}
  ): void {
    const hs = Boolean(options.headshot);
    const simplified = Boolean(options.reducedMotion || options.lowQuality);
    _tmpPos.set(worldPos.x, worldPos.y + 1.05, worldPos.z);

    // 1) Primary horizontal Supernova shockwave ring
    this.emitRing(
      _tmpPos,
      null,
      0.18,
      hs ? (simplified ? 2.4 : 3.6) : simplified ? 1.8 : 2.75,
      hs ? 0.72 : 0.58,
      0xffcb3d
    );

    // 2) Secondary angled white-gold coronal ring (on full quality)
    if (!simplified) {
      _tmpDir.set(0.55, 0.75, 0.36);
      this.emitRing(
        _tmpPos,
        _tmpDir,
        0.14,
        hs ? 2.9 : 2.1,
        hs ? 0.62 : 0.48,
        0xfff7d6
      );
    }

    // 3) Starry golden-white supernova particle burst (strictly bounded within 80-particle pool)
    const count = simplified ? (hs ? 14 : 10) : hs ? 34 : 24;
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = (hs ? 4.4 : 3.2) + Math.random() * (hs ? 4.8 : 3.4);
      const vx = Math.sin(phi) * Math.cos(theta) * speed;
      const vy = Math.cos(phi) * speed * 0.85 + 1.2;
      const vz = Math.sin(phi) * Math.sin(theta) * speed;
      const colorHex =
        i % 4 === 0 ? 0xffffff : i % 3 === 0 ? 0xffe58a : i % 2 === 0 ? 0xf59e0b : 0xffb31a;
      this.emitParticle(
        _tmpPos,
        vx,
        vy,
        vz,
        (hs ? 0.55 : 0.44) + Math.random() * 0.34,
        (hs ? 1.45 : 1.05) + Math.random() * 0.65,
        2.2,
        colorHex
      );
    }
  }

  public update(dt: number): void {
    const safeDt = Math.min(0.05, Math.max(0, dt));
    if (safeDt <= 0) return;

    // 1) Update instanced particles (zero heap allocations)
    let anyParticleChanged = false;
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      anyParticleChanged = true;
      p.life += safeDt;
      if (p.life >= p.maxLife) {
        p.active = false;
        _tmpPos.set(0, -999, 0);
        _tmpQuat.identity();
        _tmpScale.set(0, 0, 0);
        _tmpMat4.compose(_tmpPos, _tmpQuat, _tmpScale);
        this.particleMesh.setMatrixAt(i, _tmpMat4);
        continue;
      }
      const t = p.life / p.maxLife;
      p.vel.y -= p.gravity * safeDt;
      p.pos.addScaledVector(p.vel, safeDt);
      p.vel.multiplyScalar(Math.exp(-2.2 * safeDt));
      const s = p.baseScale * (1 - t * t);
      _tmpQuat.setFromAxisAngle(_upAxis, p.life * 6.5);
      _tmpScale.setScalar(Math.max(0.001, s));
      _tmpMat4.compose(p.pos, _tmpQuat, _tmpScale);
      this.particleMesh.setMatrixAt(i, _tmpMat4);
    }
    if (anyParticleChanged) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
    }

    // 2) Update count-limited golden pellet tracers
    for (let i = 0; i < MAX_GOLDEN_TRACERS; i++) {
      const tr = this.tracers[i];
      if (!tr.active) continue;
      tr.life += safeDt;
      if (tr.life >= tr.maxLife) {
        tr.active = false;
        tr.mesh.visible = false;
        tr.mat.opacity = 0;
      } else {
        const k = 1 - tr.life / tr.maxLife;
        tr.mat.opacity = k * 0.9;
      }
    }

    // 3) Update glowing ejected shells
    for (let i = 0; i < MAX_EJECTED_SHELLS; i++) {
      const sh = this.shells[i];
      if (!sh.active) continue;
      sh.life += safeDt;
      if (sh.life >= sh.maxLife) {
        sh.active = false;
        sh.mesh.visible = false;
      } else {
        sh.vel.y -= 9.8 * safeDt;
        sh.mesh.position.addScaledVector(sh.vel, safeDt);
        sh.mesh.rotation.x += sh.rotVel.x * safeDt;
        sh.mesh.rotation.y += sh.rotVel.y * safeDt;
        sh.mesh.rotation.z += sh.rotVel.z * safeDt;
      }
    }

    // 4) Update expanding corona / supernova shockwave rings
    for (let i = 0; i < MAX_SHOCKWAVE_RINGS; i++) {
      const r = this.rings[i];
      if (!r.active) continue;
      r.life += safeDt;
      if (r.life >= r.maxLife) {
        r.active = false;
        r.mesh.visible = false;
        r.mat.opacity = 0;
      } else {
        const t = r.life / r.maxLife;
        const easeOut = 1 - Math.pow(1 - t, 3);
        const sc = r.startScale + (r.endScale - r.startScale) * easeOut;
        r.mesh.scale.setScalar(sc);
        r.mat.opacity = (1 - t) * 0.9;
      }
    }
  }

  public getActiveParticleCount(): number {
    let n = 0;
    for (let i = 0; i < this.particles.length; i++) {
      if (this.particles[i].active) n++;
    }
    for (let i = 0; i < this.tracers.length; i++) {
      if (this.tracers[i].active) n++;
    }
    for (let i = 0; i < this.shells.length; i++) {
      if (this.shells[i].active) n++;
    }
    for (let i = 0; i < this.rings.length; i++) {
      if (this.rings[i].active) n++;
    }
    return n;
  }

  public clear(): void {
    _tmpScale.set(0, 0, 0);
    _tmpPos.set(0, -999, 0);
    _tmpQuat.identity();
    _tmpMat4.compose(_tmpPos, _tmpQuat, _tmpScale);
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].active = false;
      this.particleMesh.setMatrixAt(i, _tmpMat4);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < this.tracers.length; i++) {
      this.tracers[i].active = false;
      this.tracers[i].mesh.visible = false;
    }
    for (let i = 0; i < this.shells.length; i++) {
      this.shells[i].active = false;
      this.shells[i].mesh.visible = false;
    }
    for (let i = 0; i < this.rings.length; i++) {
      this.rings[i].active = false;
      this.rings[i].mesh.visible = false;
    }
  }

  public dispose(): void {
    this.particleGeo.dispose();
    this.particleMat.dispose();
    this.tracerGeo.dispose();
    for (let i = 0; i < this.tracers.length; i++) {
      this.tracers[i].mat.dispose();
    }
    this.shellGeo.dispose();
    this.shellMat.dispose();
    this.ringGeo.dispose();
    for (let i = 0; i < this.rings.length; i++) {
      this.rings[i].mat.dispose();
    }
    if (this.root.parent) {
      this.root.parent.remove(this.root);
    }
  }
}
