/**
 * Procedural 3D Legendary AK-47 "Inferno Reaper" Skin + Pooled Ember/Kill VFX System
 * - Zero external asset files: 100% procedural CanvasTextures & Three.js PBR materials.
 * - Single InstancedMesh particle pool capped at 60 particles (1 draw call, zero dynamic lights).
 * - Zero GC allocations per frame; respects Reduced Motion & Low Quality budgets.
 */

import * as THREE from 'three';

export const INFERNO_MAX_POOLED_PARTICLES = 60;

export interface InfernoReaperTextureSet {
  albedoMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  emissiveVeinMap: THREE.CanvasTexture;
  dispose: () => void;
}

export interface InfernoReaperBuildResult {
  group: THREE.Group;
  mag: THREE.Group;
  muzzlePos: THREE.Vector3;
  emissiveMats: THREE.MeshStandardMaterial[];
  veinTexture: THREE.CanvasTexture;
  updateAnimation: (dt: number, elapsedSec: number, animateVeins: boolean) => void;
  dispose: () => void;
}

/**
 * Generates procedural obsidian-black + golden filigree engraving albedo,
 * paired roughness contrast map, and seamless scrolling molten-orange emissive vein map.
 */
export function createInfernoReaperTextures(maxAnisotropy = 4): InfernoReaperTextureSet {
  // 1. Albedo: Deep matte obsidian + intricate golden filigree engravings
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = 512;
  albedoCanvas.height = 256;
  const actx = albedoCanvas.getContext('2d')!;

  const baseGrad = actx.createLinearGradient(0, 0, 512, 256);
  baseGrad.addColorStop(0, '#0b0c10');
  baseGrad.addColorStop(0.5, '#121318');
  baseGrad.addColorStop(1, '#090a0d');
  actx.fillStyle = baseGrad;
  actx.fillRect(0, 0, 512, 256);

  // Subtle brushed dark metal micro-grain
  actx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
  actx.lineWidth = 1;
  for (let y = 0; y < 256; y += 3) {
    actx.beginPath();
    actx.moveTo(0, y);
    actx.lineTo(512, y);
    actx.stroke();
  }

  // Geometric obsidian carbon bevel seams
  actx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  actx.lineWidth = 2;
  for (let x = 32; x < 512; x += 64) {
    actx.beginPath();
    actx.moveTo(x, 12);
    actx.lineTo(x + 22, 128);
    actx.lineTo(x, 244);
    actx.stroke();
  }

  // Golden ornamental border & filigree lines
  const goldGrad = actx.createLinearGradient(0, 0, 512, 256);
  goldGrad.addColorStop(0, '#b78328');
  goldGrad.addColorStop(0.35, '#f5cc66');
  goldGrad.addColorStop(0.65, '#d49a35');
  goldGrad.addColorStop(1, '#fbe092');

  actx.strokeStyle = goldGrad;
  actx.lineWidth = 3.2;
  actx.strokeRect(10, 12, 492, 232);
  actx.lineWidth = 1.4;
  actx.strokeRect(18, 20, 476, 216);

  // Engraved golden chevron & flame-inspired geometric filigree across body
  actx.strokeStyle = goldGrad;
  actx.lineWidth = 2.2;
  for (let i = 0; i < 6; i++) {
    const cx = 48 + i * 82;
    actx.beginPath();
    actx.moveTo(cx - 24, 128);
    actx.lineTo(cx, 54);
    actx.lineTo(cx + 24, 128);
    actx.lineTo(cx, 202);
    actx.closePath();
    actx.stroke();

    // Inner diamond ornament
    actx.lineWidth = 1.2;
    actx.beginPath();
    actx.moveTo(cx - 11, 128);
    actx.lineTo(cx, 88);
    actx.lineTo(cx + 11, 128);
    actx.lineTo(cx, 168);
    actx.closePath();
    actx.stroke();
    actx.lineWidth = 2.2;
  }

  // Subtle recessed dark-orange molten grooves under gold filigree
  actx.strokeStyle = 'rgba(255, 96, 16, 0.35)';
  actx.lineWidth = 2.0;
  actx.beginPath();
  actx.moveTo(0, 128);
  for (let x = 0; x <= 512; x += 32) {
    actx.lineTo(x, 128 + Math.sin((x / 512) * Math.PI * 6) * 26);
  }
  actx.stroke();

  const albedoMap = new THREE.CanvasTexture(albedoCanvas);
  albedoMap.colorSpace = THREE.SRGBColorSpace;
  albedoMap.wrapS = THREE.RepeatWrapping;
  albedoMap.wrapT = THREE.RepeatWrapping;
  albedoMap.anisotropy = Math.min(8, Math.max(1, maxAnisotropy));

  // 2. Roughness map (linear): matte obsidian (0.58) vs glossy gold engraving (0.20)
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = 512;
  roughCanvas.height = 256;
  const rctx = roughCanvas.getContext('2d')!;
  rctx.fillStyle = '#929292'; // ~0.57 roughness for obsidian
  rctx.fillRect(0, 0, 512, 256);
  rctx.strokeStyle = '#303030'; // ~0.19 roughness for gleaming gold filigree
  rctx.lineWidth = 3.6;
  rctx.strokeRect(10, 12, 492, 232);
  for (let i = 0; i < 6; i++) {
    const cx = 48 + i * 82;
    rctx.beginPath();
    rctx.moveTo(cx - 24, 128);
    rctx.lineTo(cx, 54);
    rctx.lineTo(cx + 24, 128);
    rctx.lineTo(cx, 202);
    rctx.closePath();
    rctx.stroke();
  }
  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;

  // 3. Seamless flowing emissive orange-gold magma veins (scrolled via UV offset.x)
  const emCanvas = document.createElement('canvas');
  emCanvas.width = 512;
  emCanvas.height = 256;
  const ectx = emCanvas.getContext('2d')!;
  ectx.fillStyle = '#000000';
  ectx.fillRect(0, 0, 512, 256);

  const drawSeamlessVein = (
    baseY: number,
    amp: number,
    freq: number,
    phase: number,
    outerWidth: number,
    innerWidth: number
  ) => {
    // Outer soft molten orange halo
    ectx.strokeStyle = '#ff4d00';
    ectx.lineWidth = outerWidth;
    ectx.lineCap = 'round';
    ectx.beginPath();
    for (let x = 0; x <= 512; x += 8) {
      const t = (x / 512) * Math.PI * 2 * freq + phase;
      const y = baseY + Math.sin(t) * amp + Math.cos(t * 2) * (amp * 0.25);
      if (x === 0) ectx.moveTo(x, y);
      else ectx.lineTo(x, y);
    }
    ectx.stroke();

    // Bright gold-orange incandescent core
    ectx.strokeStyle = '#ffb84d';
    ectx.lineWidth = innerWidth;
    ectx.beginPath();
    for (let x = 0; x <= 512; x += 8) {
      const t = (x / 512) * Math.PI * 2 * freq + phase;
      const y = baseY + Math.sin(t) * amp + Math.cos(t * 2) * (amp * 0.25);
      if (x === 0) ectx.moveTo(x, y);
      else ectx.lineTo(x, y);
    }
    ectx.stroke();
  };

  drawSeamlessVein(78, 22, 2, 0.0, 9, 3.2);
  drawSeamlessVein(132, 26, 3, 1.4, 11, 3.8);
  drawSeamlessVein(186, 18, 2, 2.8, 7.5, 2.6);

  // Subtle glowing ember nodes along the veins
  for (let i = 0; i < 14; i++) {
    const ex = ((i * 73 + 29) % 480) + 16;
    const ey = 64 + ((i * 53) % 128);
    const rg = ectx.createRadialGradient(ex, ey, 0, ex, ey, 11);
    rg.addColorStop(0, 'rgba(255, 224, 130, 0.95)');
    rg.addColorStop(0.45, 'rgba(255, 98, 0, 0.65)');
    rg.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ectx.fillStyle = rg;
    ectx.fillRect(ex - 12, ey - 12, 24, 24);
  }

  const emissiveVeinMap = new THREE.CanvasTexture(emCanvas);
  emissiveVeinMap.colorSpace = THREE.SRGBColorSpace;
  emissiveVeinMap.wrapS = THREE.RepeatWrapping;
  emissiveVeinMap.wrapT = THREE.RepeatWrapping;
  emissiveVeinMap.anisotropy = Math.min(8, Math.max(1, maxAnisotropy));

  return {
    albedoMap,
    roughnessMap,
    emissiveVeinMap,
    dispose: () => {
      albedoMap.dispose();
      roughnessMap.dispose();
      emissiveVeinMap.dispose();
    },
  };
}

/**
 * Builds the composite 3D Legendary AK-47 "Inferno Reaper".
 * Matches exact AK-47 proportions & muzzlePos (0, 0.012, -0.6) so zero gameplay/ADS/recoil changes occur.
 */
export function buildInfernoReaperAK47(options: {
  includeHands: boolean;
  gloveMat?: THREE.Material;
  sleeveMat?: THREE.Material;
  maxAnisotropy?: number;
}): InfernoReaperBuildResult {
  const textures = createInfernoReaperTextures(options.maxAnisotropy ?? 4);
  const ownedGeos: THREE.BufferGeometry[] = [];
  const ownedMats: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(geo: T): T => {
    ownedGeos.push(geo);
    return geo;
  };
  const trackMat = <T extends THREE.Material>(mat: T): T => {
    ownedMats.push(mat);
    return mat;
  };

  // Obsidian + Gold Filigree + Animated Flowing Emissive Orange Veins
  const obsidianVeinMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.albedoMap,
      roughnessMap: textures.roughnessMap,
      roughness: 0.72,
      metalness: 0.78,
      emissive: new THREE.Color(0xff6b12),
      emissiveMap: textures.emissiveVeinMap,
      emissiveIntensity: 1.15,
    })
  );

  // Sculpted Brushed Gold Accents (filigree trim, charging handle, muzzle accents, emblem)
  const brushedGoldMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe6b44c,
      metalness: 0.94,
      roughness: 0.22,
      emissive: new THREE.Color(0x3a1c00),
      emissiveIntensity: 0.22,
    })
  );

  // Deep Matte Forged Carbon-Obsidian (barrel, gas tube, grip frame)
  const forgedObsidianMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x111216,
      metalness: 0.86,
      roughness: 0.34,
    })
  );

  // Flowing Molten Core Strip (vented handguard channels & receiver core)
  const moltenCoreMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x220c02,
      metalness: 0.25,
      roughness: 0.35,
      emissive: new THREE.Color(0xff7417),
      emissiveMap: textures.emissiveVeinMap,
      emissiveIntensity: 1.95,
    })
  );

  const g = new THREE.Group();

  // 1. Primary Receiver with Obsidian-Gold Filigree & Flowing Veins
  const receiver = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.058, 0.072, 0.295)), obsidianVeinMat);
  g.add(receiver);

  // Gold filigree side rail trim bars (left + right)
  const trimGeo = trackGeo(new THREE.BoxGeometry(0.004, 0.008, 0.28));
  const trimL = new THREE.Mesh(trimGeo, brushedGoldMat);
  trimL.position.set(-0.03, 0.022, 0);
  const trimR = new THREE.Mesh(trimGeo, brushedGoldMat);
  trimR.position.set(0.03, 0.022, 0);
  g.add(trimL, trimR);

  // Lower golden inlay spine
  const lowerTrimL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.004, 0.006, 0.25)), brushedGoldMat);
  lowerTrimL.position.set(-0.03, -0.026, -0.005);
  const lowerTrimR = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.004, 0.006, 0.25)), brushedGoldMat);
  lowerTrimR.position.set(0.03, -0.026, -0.005);
  g.add(lowerTrimL, lowerTrimR);

  // Legendary Crest Emblem on both flanks of receiver (diamond gold medallion + glowing ember core)
  const crestGeo = trackGeo(new THREE.OctahedronGeometry(0.012, 0));
  const crestL = new THREE.Mesh(crestGeo, brushedGoldMat);
  crestL.scale.set(0.28, 1.0, 1.35);
  crestL.position.set(-0.031, 0.0, 0.05);
  const crestR = new THREE.Mesh(crestGeo, brushedGoldMat);
  crestR.scale.set(0.28, 1.0, 1.35);
  crestR.position.set(0.031, 0.0, 0.05);
  const crestCoreGeo = trackGeo(new THREE.BoxGeometry(0.004, 0.008, 0.012));
  const crestCoreL = new THREE.Mesh(crestCoreGeo, moltenCoreMat);
  crestCoreL.position.set(-0.033, 0.0, 0.05);
  const crestCoreR = new THREE.Mesh(crestCoreGeo, moltenCoreMat);
  crestCoreR.position.set(0.033, 0.0, 0.05);
  g.add(crestL, crestR, crestCoreL, crestCoreR);

  // 2. Sculpted Dust Cover with Molten Seam
  const dust = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.052, 0.025, 0.265)), obsidianVeinMat);
  dust.position.set(0, 0.043, 0.01);
  g.add(dust);

  // Gold Picatinny Top Rail + Custom Obsidian-Gold Reflex Sight
  const rail = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.032, 0.01, 0.165)), brushedGoldMat);
  rail.position.set(0, 0.057, -0.02);
  g.add(rail);
  const reflexFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.038, 0.033, 0.05)), forgedObsidianMat);
  reflexFrame.position.set(0, 0.073, -0.03);
  g.add(reflexFrame);
  const reflexTopTrim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.04, 0.005, 0.052)), brushedGoldMat);
  reflexTopTrim.position.set(0, 0.09, -0.03);
  g.add(reflexTopTrim);
  const sightDotMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xffa826 }));
  const sightDot = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.0042, 8, 8)), sightDotMat);
  sightDot.position.set(0, 0.075, -0.03);
  g.add(sightDot);

  // Golden Charging Handle
  const ch = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.036, 0.014, 0.022)), brushedGoldMat);
  ch.position.set(0.037, 0.02, -0.02);
  g.add(ch);

  // 3. Sculpted Obsidian-Gold Stock with Flowing Vein Inlay
  const stock = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.045, 0.082, 0.23)), obsidianVeinMat);
  stock.position.set(0, -0.018, 0.24);
  stock.rotation.x = 0.08;
  g.add(stock);
  const stockGoldCollar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.049, 0.086, 0.016)), brushedGoldMat);
  stockGoldCollar.position.set(0, -0.01, 0.155);
  g.add(stockGoldCollar);
  const buttpad = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.047, 0.089, 0.022)), forgedObsidianMat);
  buttpad.position.set(0, -0.026, 0.355);
  g.add(buttpad);

  // Pistol Grip with Gold Collar
  const grip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.036, 0.096, 0.046)), obsidianVeinMat);
  grip.position.set(0, -0.072, 0.095);
  grip.rotation.x = -0.32;
  g.add(grip);
  const gripBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.039, 0.012, 0.049)), brushedGoldMat);
  gripBase.position.set(0, -0.115, 0.11);
  gripBase.rotation.x = -0.32;
  g.add(gripBase);

  // 4. Vented Molten-Core Handguard (glowing inner core visible through obsidian/gold ribs)
  const hgCore = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.05, 0.048, 0.195)), moltenCoreMat);
  hgCore.position.set(0, 0.005, -0.22);
  g.add(hgCore);

  // Obsidian armor shroud ribs over molten core
  const hgTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.056, 0.018, 0.198)), obsidianVeinMat);
  hgTop.position.set(0, 0.026, -0.22);
  const hgBot = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.056, 0.018, 0.198)), obsidianVeinMat);
  hgBot.position.set(0, -0.016, -0.22);
  g.add(hgTop, hgBot);

  // 3 Gold Barrel-Cage Rings across the vented handguard
  const ringGeo = trackGeo(new THREE.BoxGeometry(0.06, 0.06, 0.011));
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(ringGeo, brushedGoldMat);
    ring.position.set(0, 0.005, -0.155 - i * 0.065);
    g.add(ring);
  }

  // 5. Barrel + Gas Tube + Fluted Gold-Trimmed Inferno Muzzle Brake
  const barrel = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0115, 0.0115, 0.35, 12)), forgedObsidianMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.01, -0.4);
  g.add(barrel);

  const muzzleBrake = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0175, 0.0155, 0.06, 10)), brushedGoldMat);
  muzzleBrake.rotation.x = Math.PI / 2;
  muzzleBrake.position.set(0, 0.01, -0.57);
  g.add(muzzleBrake);

  const muzzleEmberRing = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0182, 0.0182, 0.012, 10)), moltenCoreMat);
  muzzleEmberRing.rotation.x = Math.PI / 2;
  muzzleEmberRing.position.set(0, 0.01, -0.558);
  g.add(muzzleEmberRing);

  const gasTube = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0095, 0.0095, 0.18, 8)), forgedObsidianMat);
  gasTube.rotation.x = Math.PI / 2;
  gasTube.position.set(0, 0.032, -0.24);
  g.add(gasTube);

  const fs = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.018, 0.04, 0.018)), brushedGoldMat);
  fs.position.set(0, 0.032, -0.52);
  g.add(fs);

  // Tactical Laser Module (Obsidian + Gold Face)
  const laserBox = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.024, 0.024, 0.066)), forgedObsidianMat);
  laserBox.position.set(0.038, 0.012, -0.25);
  const laserFace = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.025, 0.025, 0.008)), brushedGoldMat);
  laserFace.position.set(0.038, 0.012, -0.282);
  g.add(laserBox, laserFace);

  // 6. Curved Engraved Magazine with Glowing Orange Seam & Gold Baseplate
  const magGroup = new THREE.Group();
  const seg1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.037, 0.088, 0.055)), obsidianVeinMat);
  seg1.position.set(0, -0.065, -0.025);
  seg1.rotation.x = 0.14;
  const seg2 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.035, 0.088, 0.053)), obsidianVeinMat);
  seg2.position.set(0, -0.135, -0.048);
  seg2.rotation.x = 0.36;
  const magCoreStrip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.039, 0.11, 0.008)), moltenCoreMat);
  magCoreStrip.position.set(0, -0.105, -0.038);
  magCoreStrip.rotation.x = 0.24;
  const magFoot = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.04, 0.013, 0.06)), brushedGoldMat);
  magFoot.position.set(0, -0.175, -0.065);
  magFoot.rotation.x = 0.36;
  magGroup.add(seg1, seg2, magCoreStrip, magFoot);
  g.add(magGroup);

  // Optional First-Person Hands & Sleeve
  if (options.includeHands) {
    const gMat = options.gloveMat ?? forgedObsidianMat;
    const sMat = options.sleeveMat ?? forgedObsidianMat;
    const rHand = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.054, 0.065, 0.075)), gMat);
    rHand.position.set(0.008, -0.07, 0.1);
    const lHand = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.062, 0.055, 0.085)), gMat);
    lHand.position.set(-0.01, -0.025, -0.22);
    const lArm = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.065, 0.065, 0.24)), sMat);
    lArm.position.set(-0.09, -0.11, -0.08);
    lArm.rotation.set(0.32, -0.35, 0);
    g.add(rHand, lHand, lArm);
  }

  const emissiveMats = [obsidianVeinMat, moltenCoreMat];

  const updateAnimation = (dt: number, elapsedSec: number, animateVeins: boolean) => {
    if (!animateVeins) {
      obsidianVeinMat.emissiveIntensity = 0.95;
      moltenCoreMat.emissiveIntensity = 1.55;
      return;
    }
    // Gentle molten energy flow across receiver & handguard
    textures.emissiveVeinMap.offset.x = (textures.emissiveVeinMap.offset.x + dt * 0.16) % 1;
    textures.emissiveVeinMap.offset.y = Math.sin(elapsedSec * 0.7) * 0.04;
    const pulse = 0.5 + 0.5 * Math.sin(elapsedSec * 2.8);
    obsidianVeinMat.emissiveIntensity = 0.95 + pulse * 0.42;
    moltenCoreMat.emissiveIntensity = 1.65 + pulse * 0.65;
  };

  const dispose = () => {
    for (let i = 0; i < ownedGeos.length; i++) ownedGeos[i].dispose();
    for (let i = 0; i < ownedMats.length; i++) ownedMats[i].dispose();
    textures.dispose();
  };

  return {
    group: g,
    mag: magGroup,
    muzzlePos: new THREE.Vector3(0, 0.012, -0.6),
    emissiveMats,
    veinTexture: textures.emissiveVeinMap,
    updateAnimation,
    dispose,
  };
}

// =============================================================================
// POOLED INFERNO VFX SYSTEM (1 InstancedMesh Draw Call, Hard Cap <= 60, 0 Lights)
// =============================================================================

interface PooledEmberSlot {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  baseScale: number;
  spinSpeed: number;
  rotY: number;
  riseAccel: number;
}

interface PooledRingSlot {
  active: boolean;
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  life: number;
  maxLife: number;
  maxRadius: number;
}

const _emberDummy = new THREE.Object3D();
const _emberColor = new THREE.Color();

export class InfernoVfxPool {
  private readonly instanced: THREE.InstancedMesh;
  private readonly emberGeo: THREE.BufferGeometry;
  private readonly emberMat: THREE.MeshBasicMaterial;
  private readonly slots: PooledEmberSlot[] = [];
  private cursor = 0;
  private activeCount = 0;

  private readonly ringGeo: THREE.RingGeometry;
  private readonly rings: PooledRingSlot[] = [];
  private ringCursor = 0;
  private readonly scene: THREE.Scene;

  constructor(scene: THREE.Scene, maxParticles = INFERNO_MAX_POOLED_PARTICLES) {
    this.scene = scene;
    const cap = Math.max(12, Math.min(INFERNO_MAX_POOLED_PARTICLES, maxParticles));

    this.emberGeo = new THREE.OctahedronGeometry(0.055, 0);
    this.emberMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.94,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.instanced = new THREE.InstancedMesh(this.emberGeo, this.emberMat, cap);
    this.instanced.frustumCulled = false;
    this.instanced.count = cap;

    _emberDummy.scale.set(0, 0, 0);
    _emberDummy.position.set(0, -999, 0);
    _emberDummy.updateMatrix();
    for (let i = 0; i < cap; i++) {
      this.instanced.setMatrixAt(i, _emberDummy.matrix);
      this.instanced.setColorAt(i, _emberColor.setHex(0xff8c1a));
      this.slots.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.5,
        baseScale: 1,
        spinSpeed: 4,
        rotY: 0,
        riseAccel: 2.2,
      });
    }
    this.instanced.instanceMatrix.needsUpdate = true;
    if (this.instanced.instanceColor) this.instanced.instanceColor.needsUpdate = true;
    this.instanced.visible = false;
    scene.add(this.instanced);

    // 4 pooled ground/burst shock rings (zero dynamic lights, reused forever)
    this.ringGeo = new THREE.RingGeometry(0.32, 0.55, 24);
    for (let i = 0; i < 4; i++) {
      const rMat = new THREE.MeshBasicMaterial({
        color: 0xff8c1a,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const rMesh = new THREE.Mesh(this.ringGeo, rMat);
      rMesh.rotation.x = -Math.PI / 2;
      rMesh.visible = false;
      rMesh.frustumCulled = false;
      scene.add(rMesh);
      this.rings.push({
        active: false,
        mesh: rMesh,
        mat: rMat,
        life: 0,
        maxLife: 0.45,
        maxRadius: 2.2,
      });
    }
  }

  private allocSlot(): { slot: PooledEmberSlot; idx: number } {
    const cap = this.slots.length;
    for (let i = 0; i < cap; i++) {
      const idx = (this.cursor + i) % cap;
      if (!this.slots[idx].active) {
        this.cursor = (idx + 1) % cap;
        return { slot: this.slots[idx], idx };
      }
    }
    const idx = this.cursor;
    this.cursor = (this.cursor + 1) % cap;
    return { slot: this.slots[idx], idx };
  }

  /**
   * Small upward-floating sparks after firing Inferno Reaper AK-47.
   */
  public spawnFiringEmbers(
    origin: THREE.Vector3,
    intensityScale = 1.0,
    disabled = false
  ): void {
    if (disabled || intensityScale <= 0.05) return;
    const count = Math.max(2, Math.min(6, Math.round(5 * intensityScale)));
    let colorDirty = false;
    for (let i = 0; i < count; i++) {
      const { slot, idx } = this.allocSlot();
      if (!slot.active) this.activeCount++;
      slot.active = true;
      slot.pos.set(
        origin.x + (Math.random() - 0.5) * 0.12,
        origin.y + (Math.random() - 0.5) * 0.08,
        origin.z + (Math.random() - 0.5) * 0.12
      );
      slot.vel.set(
        (Math.random() - 0.5) * 0.65,
        0.55 + Math.random() * 0.9,
        (Math.random() - 0.5) * 0.65
      );
      slot.maxLife = 0.32 + Math.random() * 0.28;
      slot.life = slot.maxLife;
      slot.baseScale = 0.24 + Math.random() * 0.24;
      slot.spinSpeed = 5 + Math.random() * 6;
      slot.rotY = Math.random() * Math.PI * 2;
      slot.riseAccel = 1.8;
      _emberColor.setHex(i % 2 === 0 ? 0xffaa2b : 0xff5a00);
      this.instanced.setColorAt(idx, _emberColor);
      colorDirty = true;
    }
    if (colorDirty && this.instanced.instanceColor) {
      this.instanced.instanceColor.needsUpdate = true;
    }
    this.instanced.visible = true;
  }

  /**
   * Short fiery explosion of flame embers & golden sparks around a killed target (< 0.85s).
   * Headshots trigger a noticeably larger, richer golden-orange burst.
   */
  public spawnKillBurst(
    worldPos: THREE.Vector3,
    isHeadshot: boolean,
    intensityScale = 1.0,
    disabled = false
  ): void {
    if (disabled || intensityScale <= 0.05) return;
    const baseCount = isHeadshot ? 30 : 18;
    const count = Math.max(6, Math.min(34, Math.round(baseCount * intensityScale)));
    const speedScale = isHeadshot ? 1.38 : 1.0;
    const scaleBoost = isHeadshot ? 1.45 : 1.05;
    let colorDirty = false;

    for (let i = 0; i < count; i++) {
      const { slot, idx } = this.allocSlot();
      if (!slot.active) this.activeCount++;
      slot.active = true;
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const radialSpeed = (1.6 + Math.random() * 3.4) * speedScale;
      const upSpeed = (1.4 + Math.random() * 3.6) * speedScale;

      slot.pos.set(
        worldPos.x + (Math.random() - 0.5) * 0.35,
        worldPos.y + 0.35 + Math.random() * 1.15,
        worldPos.z + (Math.random() - 0.5) * 0.35
      );
      slot.vel.set(Math.cos(angle) * radialSpeed, upSpeed, Math.sin(angle) * radialSpeed);
      slot.maxLife = (isHeadshot ? 0.58 : 0.46) + Math.random() * 0.28; // < 0.86s total
      slot.life = slot.maxLife;
      slot.baseScale = (0.55 + Math.random() * 0.85) * scaleBoost;
      slot.spinSpeed = 6 + Math.random() * 8;
      slot.rotY = Math.random() * Math.PI * 2;
      slot.riseAccel = 1.6;

      // Palette: deep molten orange -> bright flame -> golden sparks
      const palettePick = i % 3;
      if (palettePick === 0) _emberColor.setHex(0xff4d00);
      else if (palettePick === 1) _emberColor.setHex(0xff941a);
      else _emberColor.setHex(isHeadshot ? 0xffe07d : 0xffcc4d);
      this.instanced.setColorAt(idx, _emberColor);
      colorDirty = true;
    }

    if (colorDirty && this.instanced.instanceColor) {
      this.instanced.instanceColor.needsUpdate = true;
    }
    this.instanced.visible = true;

    // Expanding flame shock ring(s)
    const ringCount = isHeadshot ? 2 : 1;
    for (let r = 0; r < ringCount; r++) {
      const ring = this.rings[this.ringCursor];
      this.ringCursor = (this.ringCursor + 1) % this.rings.length;
      ring.active = true;
      ring.maxLife = isHeadshot ? 0.52 + r * 0.14 : 0.42;
      ring.life = ring.maxLife;
      ring.maxRadius = isHeadshot ? 3.4 + r * 1.1 : 2.3;
      ring.mesh.position.set(worldPos.x, worldPos.y + 0.14 + r * 0.65, worldPos.z);
      ring.mesh.scale.setScalar(0.25);
      ring.mat.color.setHex(r === 0 ? 0xff7a12 : 0xffd166);
      ring.mat.opacity = 0.85;
      ring.mesh.visible = true;
    }
  }

  public update(dt: number): void {
    let anyEmberActive = false;
    let matrixDirty = false;
    const cap = this.slots.length;

    if (this.instanced.visible) {
      for (let i = 0; i < cap; i++) {
        const s = this.slots[i];
        if (!s.active) continue;
        s.life -= dt;
        if (s.life <= 0) {
          s.active = false;
          this.activeCount = Math.max(0, this.activeCount - 1);
          _emberDummy.scale.set(0, 0, 0);
          _emberDummy.position.set(0, -999, 0);
          _emberDummy.updateMatrix();
          this.instanced.setMatrixAt(i, _emberDummy.matrix);
          matrixDirty = true;
          continue;
        }
        anyEmberActive = true;
        s.vel.x *= Math.max(0, 1 - dt * 2.2);
        s.vel.z *= Math.max(0, 1 - dt * 2.2);
        s.vel.y += s.riseAccel * dt;
        s.pos.addScaledVector(s.vel, dt);
        s.rotY += s.spinSpeed * dt;

        const norm = s.life / s.maxLife;
        const sc = s.baseScale * Math.sin(Math.min(1, norm) * Math.PI * 0.85);
        _emberDummy.position.copy(s.pos);
        _emberDummy.rotation.set(s.rotY * 0.6, s.rotY, s.rotY * 0.4);
        _emberDummy.scale.set(sc * 0.8, sc * 1.35, sc * 0.8);
        _emberDummy.updateMatrix();
        this.instanced.setMatrixAt(i, _emberDummy.matrix);
        matrixDirty = true;
      }
      if (matrixDirty) {
        this.instanced.instanceMatrix.needsUpdate = true;
      }
      if (!anyEmberActive) {
        this.instanced.visible = false;
      }
    }

    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i];
      if (!r.active) continue;
      r.life -= dt;
      if (r.life <= 0) {
        r.active = false;
        r.mesh.visible = false;
        continue;
      }
      const prog = 1 - r.life / r.maxLife;
      const eased = 1 - Math.pow(1 - prog, 2.2);
      const rad = 0.25 + eased * r.maxRadius;
      r.mesh.scale.setScalar(rad);
      r.mat.opacity = (1 - prog) * 0.78;
    }
  }

  public clear(): void {
    _emberDummy.scale.set(0, 0, 0);
    _emberDummy.position.set(0, -999, 0);
    _emberDummy.updateMatrix();
    for (let i = 0; i < this.slots.length; i++) {
      this.slots[i].active = false;
      this.instanced.setMatrixAt(i, _emberDummy.matrix);
    }
    this.activeCount = 0;
    this.instanced.instanceMatrix.needsUpdate = true;
    this.instanced.visible = false;
    for (let i = 0; i < this.rings.length; i++) {
      this.rings[i].active = false;
      this.rings[i].mesh.visible = false;
    }
  }

  public getActiveParticleCount(): number {
    let n = 0;
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i].active) n++;
    }
    for (let i = 0; i < this.rings.length; i++) {
      if (this.rings[i].active) n++;
    }
    return n;
  }

  public dispose(): void {
    this.scene.remove(this.instanced);
    this.emberGeo.dispose();
    this.emberMat.dispose();
    for (let i = 0; i < this.rings.length; i++) {
      this.scene.remove(this.rings[i].mesh);
      this.rings[i].mat.dispose();
    }
    this.ringGeo.dispose();
  }
}
