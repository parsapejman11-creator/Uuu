/**
 * Procedural 3D Mythic M249 SAW "Tempest Aegis" Skin + Pooled Prismatic/Lightning VFX System
 * - 100% procedural CanvasTextures & Three.js PBR materials (zero external files).
 * - Mirror-chrome & ceramic-white segmented chassis, crimson-red armor plates, iridescent
 *   holographic glass fins, micro-engraved panels, heat-reactive barrel cooling vents,
 *   live holographic kill counter display, visible moving glowing ammo belt, and
 *   articulated feed cover / ammo box / charging handle for cinematic reload.
 * - Single InstancedMesh particle pool capped at 80 particles + rate-limited rainbow tracers
 *   + pooled glowing ejected shells + multi-layer gravitational rings & electric lightning arcs
 *   (0 extra dynamic lights, 0 second camera, respects Reduced Motion & Low Quality).
 */

import * as THREE from 'three';

export const TEMPEST_MAX_POOLED_PARTICLES = 80;

export interface TempestAegisTextureSet {
  albedoMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  emissiveVeinMap: THREE.CanvasTexture;
  holoGlassMap: THREE.CanvasTexture;
  killCounterMap: THREE.CanvasTexture;
  killCounterCanvas: HTMLCanvasElement;
  dispose: () => void;
}

export interface TempestAegisBuildResult {
  group: THREE.Group;
  mag: THREE.Group;
  feedCoverPivot: THREE.Group;
  chargingHandle: THREE.Mesh;
  muzzlePos: THREE.Vector3;
  getHeat01: () => number;
  setKillCount: (kills: number) => void;
  triggerShot: () => void;
  applyCinematicReload: (progress: number) => {
    phase: 'idle' | 'open' | 'swap' | 'feed' | 'close' | 'charge';
    weaponPitchOffset: number;
    weaponRollOffset: number;
    weaponDropOffset: number;
  };
  updateAnimation: (dt: number, elapsedSec: number, animateEnergy: boolean) => void;
  dispose: () => void;
}

function smoothstep01(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function drawKillCounterCanvas(canvas: HTMLCanvasElement, kills: number): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Deep holographic slate backing
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#090714');
  bg.addColorStop(0.5, '#1b0716');
  bg.addColorStop(1, '#08131d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle scanlines
  ctx.fillStyle = 'rgba(255, 255, 255, 0.045)';
  for (let y = 0; y < h; y += 4) {
    ctx.fillRect(0, y, w, 1);
  }

  // Holographic rainbow-crimson top & bottom border accents
  const borderGrad = ctx.createLinearGradient(0, 0, w, 0);
  borderGrad.addColorStop(0, '#ff2a55');
  borderGrad.addColorStop(0.35, '#ffffff');
  borderGrad.addColorStop(0.68, '#38bdf8');
  borderGrad.addColorStop(1, '#ff2a55');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, w - 8, h - 8);

  // Header tag
  ctx.fillStyle = '#fda4af';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('MYTHIC · KILLS', w / 2, 12);

  // Large glowing kill count readout
  const safeKills = Math.max(0, Math.min(999, Math.floor(Number.isFinite(kills) ? kills : 0)));
  const label = String(safeKills).padStart(2, '0');
  ctx.save();
  ctx.shadowColor = '#ff2a55';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 58px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, w / 2, h * 0.63);
  ctx.restore();
}

/**
 * Generates procedural textures for Mythic M249 "Tempest Aegis":
 * - Albedo: crisp ceramic-white + brushed chrome + crimson-red segmented panels + micro-engravings
 * - Roughness: glossy mirror-chrome strips vs satin ceramic white & recessed seams
 * - Emissive: flowing prismatic crimson-white-cyan energy conduits
 * - HoloGlass: translucent rainbow iridescent crystal pattern
 * - KillCounter: live holographic kill readout canvas texture
 */
export function createTempestAegisTextures(maxAnisotropy = 4): TempestAegisTextureSet {
  // 1. Albedo (512x256)
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = 512;
  albedoCanvas.height = 256;
  const actx = albedoCanvas.getContext('2d')!;

  // Base ceramic pearl-white
  const baseGrad = actx.createLinearGradient(0, 0, 512, 256);
  baseGrad.addColorStop(0, '#edf2f7');
  baseGrad.addColorStop(0.5, '#ffffff');
  baseGrad.addColorStop(1, '#dbe4ef');
  actx.fillStyle = baseGrad;
  actx.fillRect(0, 0, 512, 256);

  // Brushed chrome bands
  const chromeGrad = actx.createLinearGradient(0, 62, 0, 128);
  chromeGrad.addColorStop(0, '#cbd5e1');
  chromeGrad.addColorStop(0.45, '#f8fafc');
  chromeGrad.addColorStop(0.55, '#94a3b8');
  chromeGrad.addColorStop(1, '#e2e8f0');
  actx.fillStyle = chromeGrad;
  actx.fillRect(0, 66, 512, 54);

  // Angular crimson-red Mythic armor plates
  const crimsonGrad = actx.createLinearGradient(0, 0, 512, 0);
  crimsonGrad.addColorStop(0, '#be123c');
  crimsonGrad.addColorStop(0.5, '#ff2a55');
  crimsonGrad.addColorStop(1, '#9f1239');
  actx.fillStyle = crimsonGrad;

  actx.beginPath();
  actx.moveTo(16, 14);
  actx.lineTo(188, 14);
  actx.lineTo(222, 64);
  actx.lineTo(36, 64);
  actx.closePath();
  actx.fill();

  actx.beginPath();
  actx.moveTo(276, 14);
  actx.lineTo(494, 14);
  actx.lineTo(466, 64);
  actx.lineTo(298, 64);
  actx.closePath();
  actx.fill();

  actx.beginPath();
  actx.moveTo(32, 168);
  actx.lineTo(244, 168);
  actx.lineTo(212, 240);
  actx.lineTo(16, 240);
  actx.closePath();
  actx.fill();

  actx.beginPath();
  actx.moveTo(292, 168);
  actx.lineTo(496, 168);
  actx.lineTo(474, 240);
  actx.lineTo(274, 240);
  actx.closePath();
  actx.fill();

  // Micro-engraved tactical geometric chevrons & fine hairline etching
  actx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
  actx.lineWidth = 1.6;
  actx.strokeRect(8, 8, 496, 240);
  for (let x = 28; x < 490; x += 48) {
    actx.beginPath();
    actx.moveTo(x, 72);
    actx.lineTo(x + 14, 93);
    actx.lineTo(x, 114);
    actx.stroke();
  }
  // Fine micro-engravings on ceramic panels
  actx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  actx.lineWidth = 1.1;
  for (let x = 36; x < 480; x += 64) {
    actx.beginPath();
    actx.moveTo(x, 22);
    actx.lineTo(x + 34, 22);
    actx.lineTo(x + 44, 34);
    actx.stroke();
    actx.beginPath();
    actx.moveTo(x, 226);
    actx.lineTo(x + 28, 226);
    actx.lineTo(x + 38, 214);
    actx.stroke();
  }

  // Dark carbon technical vents
  actx.fillStyle = '#0f172a';
  for (let i = 0; i < 6; i++) {
    actx.fillRect(46 + i * 74, 132, 34, 20);
  }

  const albedoMap = new THREE.CanvasTexture(albedoCanvas);
  albedoMap.colorSpace = THREE.SRGBColorSpace;
  albedoMap.wrapS = THREE.RepeatWrapping;
  albedoMap.wrapT = THREE.RepeatWrapping;
  albedoMap.anisotropy = maxAnisotropy;

  // 2. Roughness map (glossy chrome center, satin ceramic white, matte vents)
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = 256;
  roughCanvas.height = 128;
  const rctx = roughCanvas.getContext('2d')!;
  rctx.fillStyle = '#5a5a5a'; // ~0.35 satin ceramic
  rctx.fillRect(0, 0, 256, 128);
  rctx.fillStyle = '#1e1e1e'; // ~0.12 mirror chrome strip
  rctx.fillRect(0, 32, 256, 28);
  rctx.fillStyle = '#3a3a3a'; // ~0.23 lacquered crimson armor
  rctx.fillRect(8, 6, 240, 24);
  rctx.fillRect(8, 84, 240, 36);
  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;

  // 3. Seamless flowing prismatic crimson-white-rainbow emissive conduit map
  const emissiveCanvas = document.createElement('canvas');
  emissiveCanvas.width = 512;
  emissiveCanvas.height = 128;
  const ectx = emissiveCanvas.getContext('2d')!;
  ectx.fillStyle = '#000000';
  ectx.fillRect(0, 0, 512, 128);

  const flowGrad = ectx.createLinearGradient(0, 0, 512, 0);
  flowGrad.addColorStop(0.0, '#ff2a55');
  flowGrad.addColorStop(0.22, '#ffffff');
  flowGrad.addColorStop(0.42, '#38bdf8');
  flowGrad.addColorStop(0.62, '#c084fc');
  flowGrad.addColorStop(0.82, '#ff2a55');
  flowGrad.addColorStop(1.0, '#ff2a55');

  ectx.strokeStyle = flowGrad;
  ectx.lineWidth = 8;
  ectx.beginPath();
  ectx.moveTo(0, 64);
  for (let x = 0; x <= 512; x += 32) {
    const y = 64 + Math.sin((x / 512) * Math.PI * 4) * 18;
    ectx.lineTo(x, y);
  }
  ectx.stroke();

  // Sharp bright plasma core thread
  ectx.strokeStyle = '#ffffff';
  ectx.lineWidth = 2.4;
  ectx.beginPath();
  ectx.moveTo(0, 64);
  for (let x = 0; x <= 512; x += 32) {
    const y = 64 + Math.sin((x / 512) * Math.PI * 4) * 18;
    ectx.lineTo(x, y);
  }
  ectx.stroke();

  // Parallel crimson pulse bars
  ectx.fillStyle = '#ff2a55';
  for (let x = 16; x < 512; x += 64) {
    ectx.fillRect(x, 18, 28, 8);
    ectx.fillRect(x + 24, 102, 28, 8);
  }

  const emissiveVeinMap = new THREE.CanvasTexture(emissiveCanvas);
  emissiveVeinMap.colorSpace = THREE.SRGBColorSpace;
  emissiveVeinMap.wrapS = THREE.RepeatWrapping;
  emissiveVeinMap.wrapT = THREE.RepeatWrapping;

  // 4. Holographic iridescent crystal glass map
  const holoCanvas = document.createElement('canvas');
  holoCanvas.width = 256;
  holoCanvas.height = 256;
  const hctx = holoCanvas.getContext('2d')!;
  const holoGrad = hctx.createLinearGradient(0, 0, 256, 256);
  holoGrad.addColorStop(0.0, 'rgba(255, 42, 85, 0.85)');
  holoGrad.addColorStop(0.24, 'rgba(255, 255, 255, 0.92)');
  holoGrad.addColorStop(0.48, 'rgba(56, 189, 248, 0.88)');
  holoGrad.addColorStop(0.72, 'rgba(192, 132, 252, 0.86)');
  holoGrad.addColorStop(1.0, 'rgba(255, 42, 85, 0.85)');
  hctx.fillStyle = holoGrad;
  hctx.fillRect(0, 0, 256, 256);

  // Prismatic crystalline facets
  hctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  hctx.lineWidth = 2;
  for (let i = -256; i < 512; i += 32) {
    hctx.beginPath();
    hctx.moveTo(i, 0);
    hctx.lineTo(i + 160, 256);
    hctx.stroke();
  }
  const holoGlassMap = new THREE.CanvasTexture(holoCanvas);
  holoGlassMap.colorSpace = THREE.SRGBColorSpace;
  holoGlassMap.wrapS = THREE.RepeatWrapping;
  holoGlassMap.wrapT = THREE.RepeatWrapping;

  // 5. Live Holographic Kill Counter CanvasTexture
  const killCounterCanvas = document.createElement('canvas');
  killCounterCanvas.width = 256;
  killCounterCanvas.height = 128;
  drawKillCounterCanvas(killCounterCanvas, 0);
  const killCounterMap = new THREE.CanvasTexture(killCounterCanvas);
  killCounterMap.colorSpace = THREE.SRGBColorSpace;

  return {
    albedoMap,
    roughnessMap,
    emissiveVeinMap,
    holoGlassMap,
    killCounterMap,
    killCounterCanvas,
    dispose: () => {
      albedoMap.dispose();
      roughnessMap.dispose();
      emissiveVeinMap.dispose();
      holoGlassMap.dispose();
      killCounterMap.dispose();
    },
  };
}

/**
 * Builds the ultra-detailed Mythic M249 SAW "Tempest Aegis" composite 3D weapon.
 * Preserves exact M249 scale & muzzlePos (0, 0.02, -0.66) so gameplay aim/ADS remain identical.
 */
export function buildTempestAegisM249(options: {
  includeHands?: boolean;
  gloveMat?: THREE.Material;
  sleeveMat?: THREE.Material;
  maxAnisotropy?: number;
} = {}): TempestAegisBuildResult {
  const textures = createTempestAegisTextures(options.maxAnisotropy ?? 4);
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

  // Materials
  const chassisMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.albedoMap,
      roughnessMap: textures.roughnessMap,
      roughness: 0.34,
      metalness: 0.58,
      emissive: new THREE.Color(0xffffff),
      emissiveMap: textures.emissiveVeinMap,
      emissiveIntensity: 0.55,
    })
  );

  const mirrorChromeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.96,
      roughness: 0.12,
    })
  );

  const ceramicWhiteMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.18,
      roughness: 0.28,
    })
  );

  const crimsonArmorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe11d48,
      metalness: 0.52,
      roughness: 0.24,
      emissive: new THREE.Color(0x881337),
      emissiveIntensity: 0.28,
    })
  );

  const darkCarbonMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.45,
      roughness: 0.62,
    })
  );

  const prismaticConduitMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: new THREE.Color(0xff2a55),
      emissiveMap: textures.emissiveVeinMap,
      emissiveIntensity: 1.55,
      roughness: 0.16,
      metalness: 0.2,
    })
  );

  const holoGlassMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.holoGlassMap,
      emissiveMap: textures.holoGlassMap,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.72,
      metalness: 0.25,
      roughness: 0.08,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );

  // Heat-reactive cooling vents material (glows brighter & shifts crimson -> solar-white on sustained fire)
  const coolingVentMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffe4e6,
      emissive: new THREE.Color(0xff2a55),
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.35,
    })
  );

  // Glowing ammo belt link tip material
  const beltGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: new THREE.Color(0x38bdf8),
      emissiveIntensity: 1.5,
      roughness: 0.2,
      metalness: 0.6,
    })
  );

  // Live holographic kill counter screen material
  const killCounterMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: textures.killCounterMap,
      transparent: true,
      opacity: 0.96,
    })
  );

  const g = new THREE.Group();

  // 1. Main Sculpted Receiver (Ceramic White + Mirror Chrome + Crimson Armored Cheek Shrouds)
  const receiverCore = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.072, 0.084, 0.35)), chassisMat);
  g.add(receiverCore);

  // Mirror chrome upper structural side rails
  const chromeRailL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.008, 0.022, 0.36)), mirrorChromeMat);
  chromeRailL.position.set(-0.039, 0.018, -0.01);
  const chromeRailR = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.008, 0.022, 0.36)), mirrorChromeMat);
  chromeRailR.position.set(0.039, 0.018, -0.01);
  g.add(chromeRailL, chromeRailR);

  // Angular crimson-red Mythic wing plates flanking receiver
  const crimsonWingL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.012, 0.044, 0.22)), crimsonArmorMat);
  crimsonWingL.position.set(-0.042, -0.006, -0.04);
  const crimsonWingR = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.012, 0.044, 0.22)), crimsonArmorMat);
  crimsonWingR.position.set(0.042, -0.006, -0.04);
  g.add(crimsonWingL, crimsonWingR);

  // Floating Iridescent Holographic Glass Crest Fins along the upper receiver
  const holoFinL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.004, 0.032, 0.16)), holoGlassMat);
  holoFinL.position.set(-0.048, 0.042, -0.05);
  holoFinL.rotation.z = 0.24;
  const holoFinR = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.004, 0.032, 0.16)), holoGlassMat);
  holoFinR.position.set(0.048, 0.042, -0.05);
  holoFinR.rotation.z = -0.24;
  g.add(holoFinL, holoFinR);

  // Prismatic glowing side conduits
  const sideConduitL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.005, 0.009, 0.31)), prismaticConduitMat);
  sideConduitL.position.set(-0.044, 0.005, -0.02);
  const sideConduitR = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.005, 0.009, 0.31)), prismaticConduitMat);
  sideConduitR.position.set(0.044, 0.005, -0.02);
  g.add(sideConduitL, sideConduitR);

  // 2. Articulated Top Feed Cover Pivot (opens during cinematic reload!)
  const feedCoverPivot = new THREE.Group();
  feedCoverPivot.position.set(0, 0.052, -0.145); // Front hinge pivot
  const feedCoverBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.066, 0.026, 0.29)), ceramicWhiteMat);
  feedCoverBody.position.set(0, 0.003, 0.135);
  const feedCoverStripe = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.028, 0.03, 0.24)), crimsonArmorMat);
  feedCoverStripe.position.set(0, 0.004, 0.135);
  const feedCoverRail = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.024, 0.009, 0.21)), mirrorChromeMat);
  feedCoverRail.position.set(0, 0.02, 0.135);

  // Futuristic Mythic Reflex Holographic Sight mounted cleanly on the top cover
  const opticBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.046, 0.014, 0.068)), darkCarbonMat);
  opticBase.position.set(0, 0.028, 0.155);
  const opticArchL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.007, 0.036, 0.048)), ceramicWhiteMat);
  opticArchL.position.set(-0.022, 0.048, 0.155);
  const opticArchR = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.007, 0.036, 0.048)), ceramicWhiteMat);
  opticArchR.position.set(0.022, 0.048, 0.155);
  const opticTopBar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.05, 0.007, 0.046)), crimsonArmorMat);
  opticTopBar.position.set(0, 0.066, 0.155);
  const opticGlass = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.036, 0.03)), holoGlassMat);
  opticGlass.position.set(0, 0.048, 0.155);
  const opticDot = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.0042, 0)),
    trackMat(new THREE.MeshBasicMaterial({ color: 0xff2a55 }))
  );
  opticDot.position.set(0, 0.048, 0.156);

  feedCoverPivot.add(
    feedCoverBody,
    feedCoverStripe,
    feedCoverRail,
    opticBase,
    opticArchL,
    opticArchR,
    opticTopBar,
    opticGlass,
    opticDot
  );
  g.add(feedCoverPivot);

  // 3. Right-Side Articulated Charging Handle (pulled back on reload phase 5)
  const chargingHandle = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.026, 0.012, 0.03)), mirrorChromeMat);
  chargingHandle.position.set(0.048, 0.026, -0.015);
  const chargingTip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.009, 0.014, 0.016)), crimsonArmorMat);
  chargingTip.position.set(0.012, 0, 0);
  chargingHandle.add(chargingTip);
  g.add(chargingHandle);

  // 4. Live Holographic Kill Counter Screen (angled clearly toward first-person viewer on left rear receiver)
  const counterHousing = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.01, 0.034, 0.062)), darkCarbonMat);
  counterHousing.position.set(-0.045, 0.036, 0.088);
  counterHousing.rotation.y = 0.24;
  const counterTrim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.012, 0.005, 0.066)), crimsonArmorMat);
  counterTrim.position.set(0, 0.018, 0);
  counterHousing.add(counterTrim);
  const counterScreen = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.054, 0.027)), killCounterMat);
  counterScreen.position.set(-0.006, 0, 0);
  counterScreen.rotation.y = -Math.PI / 2;
  counterHousing.add(counterScreen);
  // Subtle floating holo projection rim on top rear so it is also crisp from direct behind-view
  const rearHoloBadge = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.044, 0.022)), killCounterMat);
  rearHoloBadge.position.set(-0.056, 0.056, 0.095);
  rearHoloBadge.rotation.y = 0.14;
  g.add(counterHousing, rearHoloBadge);

  // 5. Ventilated Handguard & Heat-Reactive Glowing Cooling Vents
  const handguardCore = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.068, 0.068, 0.27)), ceramicWhiteMat);
  handguardCore.position.set(0, 0.004, -0.27);
  const handguardUnder = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.054, 0.02, 0.25)), darkCarbonMat);
  handguardUnder.position.set(0, -0.034, -0.265);
  const handguardCrimsonL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.01, 0.026, 0.23)), crimsonArmorMat);
  handguardCrimsonL.position.set(-0.037, -0.01, -0.265);
  const handguardCrimsonR = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.01, 0.026, 0.23)), crimsonArmorMat);
  handguardCrimsonR.position.set(0.037, -0.01, -0.265);
  g.add(handguardCore, handguardUnder, handguardCrimsonL, handguardCrimsonR);

  // 6 paired glowing heat-reactive cooling vent slats along the upper shroud
  for (let i = 0; i < 6; i++) {
    const zPos = -0.175 - i * 0.038;
    const ventTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.044, 0.008, 0.016)), coolingVentMat);
    ventTop.position.set(0, 0.04, zPos);
    const ventL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.006, 0.018, 0.015)), coolingVentMat);
    ventL.position.set(-0.036, 0.018, zPos);
    const ventR = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.006, 0.018, 0.015)), coolingVentMat);
    ventR.position.set(0.036, 0.018, zPos);
    g.add(ventTop, ventL, ventR);
  }

  // Iridescent front barrel shroud crystal fins
  const shroudHoloTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.016, 0.022, 0.14)), holoGlassMat);
  shroudHoloTop.position.set(0, 0.052, -0.28);
  g.add(shroudHoloTop);

  // 6. Heavy Chrome Fluted Barrel + Heated Radiator Core + Mythic Muzzle Compensator
  const barrel = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0145, 0.016, 0.42, 12)), mirrorChromeMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.44);
  const barrelHeatRing1 = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.019, 0.019, 0.016, 12)), coolingVentMat);
  barrelHeatRing1.rotation.x = Math.PI / 2;
  barrelHeatRing1.position.set(0, 0.02, -0.46);
  const barrelHeatRing2 = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.019, 0.019, 0.016, 12)), coolingVentMat);
  barrelHeatRing2.rotation.x = Math.PI / 2;
  barrelHeatRing2.position.set(0, 0.02, -0.53);

  // Angular Prismatic Muzzle Compensator
  const muzzleBrake = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.036, 0.032, 0.072)), darkCarbonMat);
  muzzleBrake.position.set(0, 0.02, -0.625);
  const muzzleFinTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.04, 0.007, 0.062)), ceramicWhiteMat);
  muzzleFinTop.position.set(0, 0.037, -0.625);
  const muzzleFinBot = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.04, 0.007, 0.062)), crimsonArmorMat);
  muzzleFinBot.position.set(0, 0.003, -0.625);
  const muzzleGlow = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.041, 0.01, 0.014)), coolingVentMat);
  muzzleGlow.position.set(0, 0.02, -0.61);
  g.add(barrel, barrelHeatRing1, barrelHeatRing2, muzzleBrake, muzzleFinTop, muzzleFinBot, muzzleGlow);

  // Folded Chrome Tactical Bipod
  const bipodL = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0055, 0.0055, 0.19, 8)), mirrorChromeMat);
  bipodL.rotation.x = Math.PI / 2;
  bipodL.position.set(-0.028, -0.046, -0.37);
  const bipodR = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0055, 0.0055, 0.19, 8)), mirrorChromeMat);
  bipodR.rotation.x = Math.PI / 2;
  bipodR.position.set(0.028, -0.046, -0.37);
  g.add(bipodL, bipodR);

  // 7. Sculpted White/Chrome Skeletonized Stock & Pistol Grip
  const stockMain = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.054, 0.094, 0.24)), ceramicWhiteMat);
  stockMain.position.set(0, -0.012, 0.26);
  const stockCrimsonTrim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.058, 0.022, 0.19)), crimsonArmorMat);
  stockCrimsonTrim.position.set(0, 0.02, 0.25);
  const stockButt = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.056, 0.098, 0.022)), darkCarbonMat);
  stockButt.position.set(0, -0.012, 0.382);
  const grip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.039, 0.098, 0.049)), darkCarbonMat);
  grip.position.set(0, -0.075, 0.1);
  grip.rotation.x = -0.28;
  const gripTrim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.042, 0.012, 0.052)), crimsonArmorMat);
  gripTrim.position.set(0, -0.116, 0.112);
  gripTrim.rotation.x = -0.28;
  g.add(stockMain, stockCrimsonTrim, stockButt, grip, gripTrim);

  // 8. 100-Round Mythic Ammo Box + Visible Moving Glowing Ammo Belt
  const magGroup = new THREE.Group();
  const ammoBox = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.114, 0.142, 0.124)), ceramicWhiteMat);
  ammoBox.position.set(0, -0.102, -0.05);
  const ammoBoxCrimsonSide = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.118, 0.058, 0.094)), crimsonArmorMat);
  ammoBoxCrimsonSide.position.set(0, -0.105, -0.05);
  const ammoBoxGlassWin = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.12, 0.032, 0.068)), holoGlassMat);
  ammoBoxGlassWin.position.set(0, -0.068, -0.05);
  const ammoBoxBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.116, 0.014, 0.126)), mirrorChromeMat);
  ammoBoxBase.position.set(0, -0.172, -0.05);
  magGroup.add(ammoBox, ammoBoxCrimsonSide, ammoBoxGlassWin, ammoBoxBase);

  // Visible Moving Glowing Ammo Belt (7 linked cartridges arching from box into left feed tray)
  const beltGroup = new THREE.Group();
  const beltLinks: THREE.Group[] = [];
  const casingGeo = trackGeo(new THREE.CylinderGeometry(0.0046, 0.0048, 0.032, 6));
  const tipGeo = trackGeo(new THREE.ConeGeometry(0.0046, 0.012, 6));
  for (let i = 0; i < 7; i++) {
    const link = new THREE.Group();
    const casing = new THREE.Mesh(casingGeo, mirrorChromeMat);
    casing.rotation.x = Math.PI / 2;
    const tip = new THREE.Mesh(tipGeo, beltGlowMat);
    tip.rotation.x = -Math.PI / 2;
    tip.position.set(0, 0, -0.022);
    link.add(casing, tip);
    beltGroup.add(link);
    beltLinks.push(link);
  }
  magGroup.add(beltGroup);
  g.add(magGroup);

  const positionBeltLinks = (phase01: number) => {
    const count = beltLinks.length;
    for (let i = 0; i < count; i++) {
      const t = ((i + phase01) % count) / (count - 1);
      // Curved feed arch from left top of ammo box (-0.056, -0.042) up & into left receiver tray (-0.034, 0.036)
      const angle = t * Math.PI * 0.55;
      const x = -0.064 + Math.sin(angle) * 0.026 - Math.sin(t * Math.PI) * 0.014;
      const y = -0.042 + t * 0.082;
      const z = -0.05 + (t - 0.5) * 0.014;
      beltLinks[i].position.set(x, y, z);
      beltLinks[i].rotation.z = -0.45 + t * 0.85;
    }
  };
  positionBeltLinks(0);

  // Optional First-Person Hands & Sleeve
  if (options.includeHands) {
    const gMat = options.gloveMat ?? darkCarbonMat;
    const sMat = options.sleeveMat ?? darkCarbonMat;
    const rHand = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.056, 0.065, 0.075)), gMat);
    rHand.position.set(0.008, -0.07, 0.1);
    const lHand = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.064, 0.058, 0.085)), gMat);
    lHand.position.set(-0.01, -0.03, -0.25);
    const lArm = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.065, 0.065, 0.24)), sMat);
    lArm.position.set(-0.09, -0.11, -0.09);
    lArm.rotation.set(0.32, -0.35, 0);
    g.add(rHand, lHand, lArm);
  }

  // Runtime state (zero per-frame allocations)
  let heat01 = 0;
  let shotFlashPulse = 0;
  let beltPhase = 0;
  let lastKillCount = 0;

  const _coolColor = new THREE.Color(0xff2a55);
  const _midHeatColor = new THREE.Color(0xff6b2c);
  const _maxHeatColor = new THREE.Color(0xfff1f2);
  const _tmpColor = new THREE.Color();
  const _prismColor = new THREE.Color();

  const setKillCount = (kills: number) => {
    const safe = Math.max(0, Math.min(999, Math.floor(Number.isFinite(kills) ? kills : 0)));
    if (safe === lastKillCount) return;
    lastKillCount = safe;
    drawKillCounterCanvas(textures.killCounterCanvas, safe);
    textures.killCounterMap.needsUpdate = true;
  };

  const triggerShot = () => {
    heat01 = Math.min(1, heat01 + 0.068);
    shotFlashPulse = 1.0;
    beltPhase = (beltPhase + 0.55) % beltLinks.length;
    positionBeltLinks(beltPhase);
  };

  /**
   * Articulated 5-phase Mythic M249 cinematic reload (same exact reload duration as standard M249):
   * 0.00-0.18: Feed cover opens up
   * 0.18-0.42: Old 100-round ammo box detaches & drops
   * 0.42-0.68: Fresh ammo box slides & locks in + belt feeds across
   * 0.68-0.84: Feed cover snaps shut
   * 0.84-1.00: Charging handle pulls back & snaps forward + ready check
   */
  const applyCinematicReload = (progress: number) => {
    const p = Math.max(0, Math.min(1, progress));
    if (p <= 0 || p >= 1) {
      feedCoverPivot.rotation.x = 0;
      magGroup.position.set(0, 0, 0);
      magGroup.rotation.set(0, 0, 0);
      beltGroup.visible = true;
      chargingHandle.position.z = -0.015;
      return {
        phase: 'idle' as const,
        weaponPitchOffset: 0,
        weaponRollOffset: 0,
        weaponDropOffset: 0,
      };
    }

    // 1. Feed cover opening angle (opens 0..0.18, stays open until 0.68, slams shut 0.68..0.82)
    let coverOpen = 0;
    if (p < 0.18) {
      coverOpen = smoothstep01(p / 0.18);
    } else if (p < 0.68) {
      coverOpen = 1;
    } else if (p < 0.82) {
      coverOpen = 1 - smoothstep01((p - 0.68) / 0.14);
    }
    feedCoverPivot.rotation.x = coverOpen * 1.12;

    // 2. Ammo box swap + belt feed
    let boxDropY = 0;
    let boxSlideX = 0;
    let boxTiltZ = 0;
    let phase: 'idle' | 'open' | 'swap' | 'feed' | 'close' | 'charge' = 'open';
    if (p < 0.18) {
      phase = 'open';
    } else if (p < 0.42) {
      phase = 'swap';
      const t = smoothstep01((p - 0.18) / 0.24);
      boxDropY = -0.26 * t;
      boxSlideX = -0.05 * t;
      boxTiltZ = 0.28 * t;
    } else if (p < 0.68) {
      phase = 'feed';
      const t = smoothstep01((p - 0.42) / 0.22);
      boxDropY = -0.26 * (1 - t);
      boxSlideX = -0.05 * (1 - t);
      boxTiltZ = 0.28 * (1 - t);
      // Advance glowing belt visibly as it seats into the tray
      positionBeltLinks((beltPhase + t * 2.5) % beltLinks.length);
    } else if (p < 0.84) {
      phase = 'close';
    } else {
      phase = 'charge';
    }

    magGroup.position.set(boxSlideX, boxDropY, 0);
    magGroup.rotation.set(0, 0, boxTiltZ);
    beltGroup.visible = p < 0.36 || p >= 0.48;

    // 3. Charging handle pull & snap (0.84 -> 0.98)
    let chargePull = 0;
    if (p >= 0.84 && p <= 0.98) {
      chargePull = Math.sin(((p - 0.84) / 0.14) * Math.PI);
    }
    chargingHandle.position.z = -0.015 + chargePull * 0.085;

    // Subtle cinematic weapon tilt offsets
    const tiltEnv =
      p < 0.16
        ? smoothstep01(p / 0.16)
        : p < 0.86
          ? 1
          : 1 - smoothstep01((p - 0.86) / 0.14);
    const slamBump = p >= 0.78 && p <= 0.86 ? Math.sin(((p - 0.78) / 0.08) * Math.PI) * -0.026 : 0;
    const chargeKick = chargePull * -0.018;

    return {
      phase,
      weaponPitchOffset: 0.11 * tiltEnv + chargeKick * 2.0,
      weaponRollOffset: (p >= 0.82 ? -0.34 : 0.44) * tiltEnv,
      weaponDropOffset: -0.048 * tiltEnv + slamBump,
    };
  };

  const updateAnimation = (dt: number, elapsedSec: number, animateEnergy: boolean) => {
    // Cool down heat vents smoothly after sustained fire
    if (heat01 > 0) {
      heat01 = Math.max(0, heat01 - dt * 0.28);
    }
    if (shotFlashPulse > 0) {
      shotFlashPulse = Math.max(0, shotFlashPulse - dt * 5.2);
    }

    // Heat-reactive cooling vents color & intensity
    if (heat01 < 0.55) {
      _tmpColor.copy(_coolColor).lerp(_midHeatColor, heat01 / 0.55);
    } else {
      _tmpColor.copy(_midHeatColor).lerp(_maxHeatColor, (heat01 - 0.55) / 0.45);
    }
    coolingVentMat.emissive.copy(_tmpColor);
    coolingVentMat.emissiveIntensity = 0.75 + heat01 * 2.45 + shotFlashPulse * 0.65;

    if (!animateEnergy) {
      prismaticConduitMat.emissiveIntensity = 1.25 + heat01 * 0.6;
      holoGlassMat.emissiveIntensity = 0.65;
      beltGlowMat.emissiveIntensity = 1.3;
      return;
    }

    // Flowing holographic energy veins along receiver
    textures.emissiveVeinMap.offset.x = (textures.emissiveVeinMap.offset.x - dt * (0.28 + heat01 * 0.55) + 1) % 1;
    textures.holoGlassMap.offset.x = (textures.holoGlassMap.offset.x + dt * 0.16) % 1;
    textures.holoGlassMap.offset.y = (textures.holoGlassMap.offset.y + dt * 0.09) % 1;

    // Gentle rainbow holographic hue drift on conduits & ammo tips
    const hue = (elapsedSec * (0.18 + heat01 * 0.25)) % 1;
    _prismColor.setHSL(hue, 0.92, 0.62);
    prismaticConduitMat.emissive.copy(_prismColor).lerp(_coolColor, 0.35);
    prismaticConduitMat.emissiveIntensity = 1.35 + Math.sin(elapsedSec * 3.4) * 0.28 + heat01 * 0.95;

    beltGlowMat.emissive.setHSL((hue + 0.32) % 1, 0.95, 0.62);
    beltGlowMat.emissiveIntensity = 1.3 + heat01 * 1.15;

    holoGlassMat.emissiveIntensity = 0.62 + 0.24 * Math.sin(elapsedSec * 2.4) + shotFlashPulse * 0.45;
  };

  const dispose = () => {
    for (let i = 0; i < ownedGeos.length; i++) ownedGeos[i].dispose();
    for (let i = 0; i < ownedMats.length; i++) ownedMats[i].dispose();
    textures.dispose();
  };

  return {
    group: g,
    mag: magGroup,
    feedCoverPivot,
    chargingHandle,
    muzzlePos: new THREE.Vector3(0, 0.02, -0.66),
    getHeat01: () => heat01,
    setKillCount,
    triggerShot,
    applyCinematicReload,
    updateAnimation,
    dispose,
  };
}

// =============================================================================
// POOLED MYTHIC M249 VFX SYSTEM (<= 80 PARTICLES, 0 DYNAMIC LIGHTS, 0 2ND CAM)
// =============================================================================

interface TempestParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  life: number;
  size: number;
  gravity: number;
  swirlAngle: number;
  swirlSpeed: number;
  cx: number;
  cz: number;
  swirlRadius: number;
  color: THREE.Color;
}

interface TempestTracerSlot {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  active: boolean;
  age: number;
  life: number;
}

interface TempestShellSlot {
  mesh: THREE.Mesh;
  active: boolean;
  age: number;
  life: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
}

interface TempestGravityRingSlot {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  active: boolean;
  age: number;
  life: number;
  maxScale: number;
}

interface TempestLightningArcSlot {
  line: THREE.Line;
  mat: THREE.LineBasicMaterial;
  positions: Float32Array;
  active: boolean;
  age: number;
  life: number;
  origin: THREE.Vector3;
  dir: THREE.Vector3;
  length: number;
  jitterTimer: number;
}

const TEMPEST_TRACER_POOL_SIZE = 10;
const TEMPEST_SHELL_POOL_SIZE = 14;
const TEMPEST_RING_POOL_SIZE = 12; // 4 concurrent multi-layer kills x 3 rings each
const TEMPEST_ARC_POOL_SIZE = 18; // 3 concurrent kills x 6 lightning arcs
const TEMPEST_ARC_SEGMENTS = 7;

export class TempestAegisVfxPool {
  private scene: THREE.Scene;
  private particleMesh: THREE.InstancedMesh;
  private particleGeo: THREE.OctahedronGeometry;
  private particleMat: THREE.MeshBasicMaterial;
  private particles: TempestParticle[] = [];
  private particleCursor = 0;

  private tracerGeo: THREE.CylinderGeometry;
  private tracers: TempestTracerSlot[] = [];
  private tracerCursor = 0;
  private lastTracerSpawnSec = -10;
  private rainbowPhase = 0;

  private shellGeo: THREE.CylinderGeometry;
  private shellMat: THREE.MeshBasicMaterial;
  private shells: TempestShellSlot[] = [];
  private shellCursor = 0;

  private ringGeo: THREE.RingGeometry;
  private rings: TempestGravityRingSlot[] = [];
  private ringCursor = 0;

  private arcs: TempestLightningArcSlot[] = [];
  private arcCursor = 0;

  private dummy = new THREE.Object3D();
  private tmpVecA = new THREE.Vector3();
  private tmpVecB = new THREE.Vector3();
  private tmpDir = new THREE.Vector3();
  private tmpUp = new THREE.Vector3(0, 1, 0);
  private tmpQuat = new THREE.Quaternion();
  private tmpColor = new THREE.Color();
  private elapsedClock = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // 1. Single InstancedMesh particle pool (strict cap = 80)
    this.particleGeo = new THREE.OctahedronGeometry(0.055, 0);
    this.particleMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.94,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.particleMesh = new THREE.InstancedMesh(
      this.particleGeo,
      this.particleMat,
      TEMPEST_MAX_POOLED_PARTICLES
    );
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleMesh.frustumCulled = false;

    const zeroScale = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < TEMPEST_MAX_POOLED_PARTICLES; i++) {
      this.particleMesh.setMatrixAt(i, zeroScale);
      this.particleMesh.setColorAt(i, new THREE.Color(0xff2a55));
      this.particles.push({
        active: false,
        x: 0,
        y: -999,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        age: 0,
        life: 0.5,
        size: 1,
        gravity: 0,
        swirlAngle: 0,
        swirlSpeed: 0,
        cx: 0,
        cz: 0,
        swirlRadius: 0,
        color: new THREE.Color(0xff2a55),
      });
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    this.scene.add(this.particleMesh);

    // 2. Pooled Rainbow Prismatic Tracers
    this.tracerGeo = new THREE.CylinderGeometry(0.016, 0.016, 1, 6, 1, true);
    for (let i = 0; i < TEMPEST_TRACER_POOL_SIZE; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff2a55,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.tracerGeo, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.tracers.push({ mesh, mat, active: false, age: 0, life: 0.14 });
    }

    // 3. Pooled Glowing Ejected Shells
    this.shellGeo = new THREE.CylinderGeometry(0.0055, 0.0055, 0.026, 6);
    this.shellMat = new THREE.MeshBasicMaterial({
      color: 0xff6b8b,
      transparent: true,
      opacity: 0.95,
    });
    for (let i = 0; i < TEMPEST_SHELL_POOL_SIZE; i++) {
      const mesh = new THREE.Mesh(this.shellGeo, this.shellMat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.shells.push({
        mesh,
        active: false,
        age: 0,
        life: 0.55,
        vx: 0,
        vy: 0,
        vz: 0,
        rx: 0,
        ry: 0,
        rz: 0,
      });
    }

    // 4. Pooled Multi-Layer Gravitational Shockwave Rings
    this.ringGeo = new THREE.RingGeometry(0.68, 1.0, 28);
    for (let i = 0; i < TEMPEST_RING_POOL_SIZE; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff2a55,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.ringGeo, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.rings.push({ mesh, mat, active: false, age: 0, life: 0.55, maxScale: 1.5 });
    }

    // 5. Pooled Jagged Electric Lightning Arcs (zero buffer re-allocation)
    for (let i = 0; i < TEMPEST_ARC_POOL_SIZE; i++) {
      const positions = new Float32Array(TEMPEST_ARC_SEGMENTS * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const line = new THREE.Line(geo, mat);
      line.visible = false;
      line.frustumCulled = false;
      this.scene.add(line);
      this.arcs.push({
        line,
        mat,
        positions,
        active: false,
        age: 0,
        life: 0.42,
        origin: new THREE.Vector3(),
        dir: new THREE.Vector3(0, 1, 0),
        length: 1.4,
        jitterTimer: 0,
      });
    }
  }

  private allocParticle(): TempestParticle {
    const p = this.particles[this.particleCursor];
    this.particleCursor = (this.particleCursor + 1) % TEMPEST_MAX_POOLED_PARTICLES;
    return p;
  }

  private writeLightningBolt(slot: TempestLightningArcSlot, jitterScale: number): void {
    const pos = slot.positions;
    const segs = TEMPEST_ARC_SEGMENTS;
    for (let i = 0; i < segs; i++) {
      const t = i / (segs - 1);
      const env = Math.sin(t * Math.PI) * jitterScale;
      const jx = (Math.random() - 0.5) * env;
      const jy = (Math.random() - 0.5) * env;
      const jz = (Math.random() - 0.5) * env;
      pos[i * 3] = slot.origin.x + slot.dir.x * slot.length * t + jx;
      pos[i * 3 + 1] = slot.origin.y + slot.dir.y * slot.length * t + jy;
      pos[i * 3 + 2] = slot.origin.z + slot.dir.z * slot.length * t + jz;
    }
    const attr = slot.line.geometry.getAttribute('position') as THREE.BufferAttribute;
    attr.needsUpdate = true;
  }

  /**
   * Rate-limited rainbow tracer + optional glowing ejected shell + subtle muzzle sparks.
   * During sustained full-auto fire, tracer intensifies with heat01 (0..1) while staying
   * strictly rate-limited so mobile GPUs never throttle.
   */
  public spawnShotEffects(
    from: THREE.Vector3,
    to: THREE.Vector3,
    heat01: number,
    options: {
      reducedMotion?: boolean;
      lowQuality?: boolean;
      shellOrigin?: THREE.Vector3;
      shellRightDir?: THREE.Vector3;
    } = {}
  ): void {
    const reduced = Boolean(options.reducedMotion);
    const lowQ = Boolean(options.lowQuality);
    const h = Math.max(0, Math.min(1, heat01));

    // Rate-limit special rainbow tracers (min 0.085s on normal, 0.14s on lowQ/reduced)
    const minInterval = reduced || lowQ ? 0.14 : 0.085;
    if (this.elapsedClock - this.lastTracerSpawnSec >= minInterval) {
      this.lastTracerSpawnSec = this.elapsedClock;
      this.rainbowPhase = (this.rainbowPhase + 0.13 + h * 0.07) % 1;

      const slot = this.tracers[this.tracerCursor];
      this.tracerCursor = (this.tracerCursor + 1) % TEMPEST_TRACER_POOL_SIZE;

      this.tmpVecA.copy(from);
      this.tmpVecB.copy(to);
      this.tmpDir.subVectors(this.tmpVecB, this.tmpVecA);
      const dist = Math.min(85, Math.max(0.5, this.tmpDir.length()));
      this.tmpDir.normalize();

      slot.active = true;
      slot.age = 0;
      slot.life = reduced ? 0.09 : 0.13 + h * 0.05;
      slot.mesh.visible = true;
      slot.mesh.position.copy(this.tmpVecA).addScaledVector(this.tmpDir, dist * 0.5);
      this.tmpQuat.setFromUnitVectors(this.tmpUp, this.tmpDir);
      slot.mesh.quaternion.copy(this.tmpQuat);

      // Intensify rainbow beam thickness & luminance slightly with sustained fire heat
      const radiusScale = (reduced || lowQ ? 0.75 : 1.0) * (1.0 + h * 0.85);
      slot.mesh.scale.set(radiusScale, dist, radiusScale);
      this.tmpColor.setHSL(this.rainbowPhase, 0.94, 0.62 + h * 0.14);
      slot.mat.color.copy(this.tmpColor);
      slot.mat.opacity = 0.78 + h * 0.2;
    }

    // Spawn 1-2 muzzle prismatic sparks (skip on reduced motion)
    if (!reduced) {
      const sparkCount = lowQ ? 1 : h > 0.45 ? 3 : 2;
      for (let i = 0; i < sparkCount; i++) {
        const p = this.allocParticle();
        p.active = true;
        p.age = 0;
        p.life = 0.24 + Math.random() * 0.18;
        p.x = from.x + (Math.random() - 0.5) * 0.06;
        p.y = from.y + (Math.random() - 0.5) * 0.06;
        p.z = from.z + (Math.random() - 0.5) * 0.06;
        p.vx = (Math.random() - 0.5) * 1.4;
        p.vy = 0.9 + Math.random() * 1.4;
        p.vz = (Math.random() - 0.5) * 1.4;
        p.size = 0.45 + h * 0.4;
        p.gravity = -2.2;
        p.swirlSpeed = 0;
        p.swirlRadius = 0;
        p.color.setHSL((this.rainbowPhase + i * 0.18) % 1, 0.95, 0.68);
      }
    }

    // Pooled glowing ejected shell casing (skipped on reducedMotion / lowQuality)
    if (!reduced && !lowQ && options.shellOrigin && options.shellRightDir) {
      const s = this.shells[this.shellCursor];
      this.shellCursor = (this.shellCursor + 1) % TEMPEST_SHELL_POOL_SIZE;
      s.active = true;
      s.age = 0;
      s.life = 0.46;
      s.mesh.visible = true;
      s.mesh.position.copy(options.shellOrigin);
      s.mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      s.vx = options.shellRightDir.x * (1.8 + Math.random() * 0.7) + (Math.random() - 0.5) * 0.4;
      s.vy = 1.15 + Math.random() * 0.55;
      s.vz = options.shellRightDir.z * (1.8 + Math.random() * 0.7) + (Math.random() - 0.5) * 0.4;
      s.rx = 12 + Math.random() * 10;
      s.ry = 8 + Math.random() * 10;
      s.rz = 10 + Math.random() * 8;
    }
  }

  /**
   * Mythic M249 Kill Effect (< 0.95s):
   * Multi-layer gravitational shockwave rings + crackling electric lightning arcs + swirling prismatic burst.
   * Bigger and denser on headshots; simplified cleanly on Reduced Motion / Low Quality.
   */
  public spawnKillEffect(
    pos: THREE.Vector3,
    options: { headshot?: boolean; reducedMotion?: boolean; lowQuality?: boolean } = {}
  ): void {
    const hs = Boolean(options.headshot);
    const reduced = Boolean(options.reducedMotion);
    const lowQ = Boolean(options.lowQuality);
    const centerY = pos.y + (hs ? 1.2 : 0.95);

    // 1. Multi-layer gravitational shockwave rings (3 tilted layers on normal, 2 on reduced/lowQ)
    const ringCount = reduced ? 1 : lowQ ? 2 : 3;
    const ringColors = [0xff2a55, 0x38bdf8, 0xffffff];
    const ringTilts: [number, number][] = [
      [Math.PI * 0.5, 0],
      [Math.PI * 0.32, Math.PI * 0.28],
      [-Math.PI * 0.34, -Math.PI * 0.25],
    ];
    for (let i = 0; i < ringCount; i++) {
      const r = this.rings[this.ringCursor];
      this.ringCursor = (this.ringCursor + 1) % TEMPEST_RING_POOL_SIZE;
      r.active = true;
      r.age = 0;
      r.life = (hs ? 0.78 : 0.62) - i * 0.08;
      r.maxScale = (hs ? 2.45 : 1.75) * (1 - i * 0.14);
      r.mesh.visible = true;
      r.mesh.position.set(pos.x, centerY, pos.z);
      r.mesh.rotation.set(ringTilts[i][0], ringTilts[i][1], 0);
      r.mesh.scale.setScalar(0.18);
      r.mat.color.setHex(ringColors[i % ringColors.length]);
      r.mat.opacity = 0.92;
    }

    // 2. Crackling electric lightning arcs radiating out around eliminated enemy
    const arcCount = reduced ? 2 : lowQ ? 3 : hs ? 6 : 4;
    for (let i = 0; i < arcCount; i++) {
      const arc = this.arcs[this.arcCursor];
      this.arcCursor = (this.arcCursor + 1) % TEMPEST_ARC_POOL_SIZE;
      arc.active = true;
      arc.age = 0;
      arc.life = hs ? 0.52 : 0.4;
      arc.origin.set(pos.x, centerY, pos.z);
      const theta = (i / arcCount) * Math.PI * 2 + Math.random() * 0.5;
      const elev = (Math.random() - 0.3) * 0.9;
      arc.dir.set(Math.cos(theta), elev, Math.sin(theta)).normalize();
      arc.length = (hs ? 1.85 : 1.35) + Math.random() * 0.45;
      arc.jitterTimer = 0;
      arc.mat.color.setHex(i % 2 === 0 ? 0xe0f2fe : 0xff2a55);
      arc.mat.opacity = 0.96;
      arc.line.visible = true;
      this.writeLightningBolt(arc, hs ? 0.36 : 0.26);
    }

    // 3. Swirling prismatic gravitational + electric particles (strictly from the 80-cap pool)
    const count = reduced ? 10 : lowQ ? 16 : hs ? 34 : 24;
    for (let i = 0; i < count; i++) {
      const p = this.allocParticle();
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.35;
      const speed = (hs ? 2.8 : 2.1) + Math.random() * 1.9;
      p.active = true;
      p.age = 0;
      p.life = (hs ? 0.78 : 0.62) + Math.random() * 0.24;
      p.cx = pos.x;
      p.cz = pos.z;
      p.swirlAngle = angle;
      p.swirlSpeed = (i % 2 === 0 ? 1 : -1) * (4.2 + Math.random() * 2.5);
      p.swirlRadius = 0.22 + Math.random() * (hs ? 0.55 : 0.38);
      p.x = pos.x + Math.cos(angle) * p.swirlRadius;
      p.y = centerY + (Math.random() - 0.5) * 0.65;
      p.z = pos.z + Math.sin(angle) * p.swirlRadius;
      p.vx = Math.cos(angle) * speed;
      p.vy = (Math.random() - 0.2) * (hs ? 3.2 : 2.3);
      p.vz = Math.sin(angle) * speed;
      p.size = (hs ? 1.35 : 1.0) * (0.65 + Math.random() * 0.65);
      p.gravity = -1.6;
      // Mix crimson, crisp white, cyan, and prismatic violet
      const paletteIdx = i % 4;
      if (paletteIdx === 0) p.color.setHex(0xff2a55);
      else if (paletteIdx === 1) p.color.setHex(0xffffff);
      else if (paletteIdx === 2) p.color.setHex(0x38bdf8);
      else p.color.setHex(0xc084fc);
    }
  }

  public update(dt: number): void {
    const safeDt = Math.min(0.05, Math.max(0.001, dt));
    this.elapsedClock += safeDt;

    // 1. Update InstancedMesh particles
    let anyParticleDirty = false;
    for (let i = 0; i < TEMPEST_MAX_POOLED_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      anyParticleDirty = true;
      p.age += safeDt;
      if (p.age >= p.life) {
        p.active = false;
        this.dummy.position.set(0, -999, 0);
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.particleMesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      const t = p.age / p.life;
      if (p.swirlSpeed !== 0) {
        p.swirlAngle += p.swirlSpeed * safeDt;
        p.swirlRadius += safeDt * 1.45;
        p.x = p.cx + Math.cos(p.swirlAngle) * p.swirlRadius;
        p.z = p.cz + Math.sin(p.swirlAngle) * p.swirlRadius;
        p.y += p.vy * safeDt;
        p.vy += p.gravity * safeDt;
      } else {
        p.x += p.vx * safeDt;
        p.y += p.vy * safeDt;
        p.z += p.vz * safeDt;
        p.vy += p.gravity * safeDt;
      }

      const scale = p.size * (1 - t * t);
      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.rotation.set(p.age * 7, p.age * 5, 0);
      this.dummy.scale.setScalar(Math.max(0.001, scale));
      this.dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, this.dummy.matrix);
      this.particleMesh.setColorAt(i, p.color);
    }
    if (anyParticleDirty) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    }

    // 2. Update Rainbow Tracers
    for (let i = 0; i < this.tracers.length; i++) {
      const tr = this.tracers[i];
      if (!tr.active) continue;
      tr.age += safeDt;
      if (tr.age >= tr.life) {
        tr.active = false;
        tr.mesh.visible = false;
        continue;
      }
      const k = 1 - tr.age / tr.life;
      tr.mat.opacity = k * k * 0.9;
    }

    // 3. Update Glowing Ejected Shells
    for (let i = 0; i < this.shells.length; i++) {
      const s = this.shells[i];
      if (!s.active) continue;
      s.age += safeDt;
      if (s.age >= s.life) {
        s.active = false;
        s.mesh.visible = false;
        continue;
      }
      s.vy -= 9.8 * safeDt;
      s.mesh.position.x += s.vx * safeDt;
      s.mesh.position.y += s.vy * safeDt;
      s.mesh.position.z += s.vz * safeDt;
      s.mesh.rotation.x += s.rx * safeDt;
      s.mesh.rotation.y += s.ry * safeDt;
      s.mesh.rotation.z += s.rz * safeDt;
    }

    // 4. Update Multi-Layer Gravitational Rings
    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i];
      if (!r.active) continue;
      r.age += safeDt;
      if (r.age >= r.life) {
        r.active = false;
        r.mesh.visible = false;
        continue;
      }
      const t = r.age / r.life;
      const easeOut = 1 - Math.pow(1 - t, 3);
      r.mesh.scale.setScalar(0.18 + easeOut * r.maxScale);
      r.mesh.rotation.z += safeDt * 1.8;
      r.mat.opacity = (1 - t) * (1 - t) * 0.92;
    }

    // 5. Update Crackling Lightning Arcs
    for (let i = 0; i < this.arcs.length; i++) {
      const arc = this.arcs[i];
      if (!arc.active) continue;
      arc.age += safeDt;
      if (arc.age >= arc.life) {
        arc.active = false;
        arc.line.visible = false;
        continue;
      }
      arc.jitterTimer += safeDt;
      if (arc.jitterTimer >= 0.055) {
        arc.jitterTimer = 0;
        this.writeLightningBolt(arc, 0.28);
      }
      const k = 1 - arc.age / arc.life;
      arc.mat.opacity = k * 0.95;
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
    for (let i = 0; i < this.arcs.length; i++) {
      if (this.arcs[i].active) n++;
    }
    return n;
  }

  public clear(): void {
    const zeroScale = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].active = false;
      this.particleMesh.setMatrixAt(i, zeroScale);
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
    for (let i = 0; i < this.arcs.length; i++) {
      this.arcs[i].active = false;
      this.arcs[i].line.visible = false;
    }
  }

  public dispose(): void {
    this.scene.remove(this.particleMesh);
    this.particleGeo.dispose();
    this.particleMat.dispose();

    for (let i = 0; i < this.tracers.length; i++) {
      this.scene.remove(this.tracers[i].mesh);
      this.tracers[i].mat.dispose();
    }
    this.tracerGeo.dispose();

    for (let i = 0; i < this.shells.length; i++) {
      this.scene.remove(this.shells[i].mesh);
    }
    this.shellGeo.dispose();
    this.shellMat.dispose();

    for (let i = 0; i < this.rings.length; i++) {
      this.scene.remove(this.rings[i].mesh);
      this.rings[i].mat.dispose();
    }
    this.ringGeo.dispose();

    for (let i = 0; i < this.arcs.length; i++) {
      this.scene.remove(this.arcs[i].line);
      this.arcs[i].line.geometry.dispose();
      this.arcs[i].mat.dispose();
    }
  }
}
