/**
 * Procedural 3D Legendary AWM .338 Lapua "Void Piercer" Skin + Pooled Gravitational/Beam VFX System
 * - 100% procedural CanvasTextures & Three.js PBR materials (zero external files).
 * - Matte black & ceramic-white segmented chassis, flowing cyan/violet emissive conduits,
 *   shot-reactive pulsing energy core, futuristic holographic scope lens, and legendary crest.
 * - Single InstancedMesh particle pool capped at 60 particles + pooled beams & shockwave rings
 *   (zero dynamic lights, zero per-frame GC allocations, respects Reduced Motion & Low Quality).
 */

import * as THREE from 'three';

export const VOID_MAX_POOLED_PARTICLES = 60;

export interface VoidPiercerTextureSet {
  albedoMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  emissiveConduitMap: THREE.CanvasTexture;
  iridescentLensMap: THREE.CanvasTexture;
  dispose: () => void;
}

export interface VoidPiercerBuildResult {
  group: THREE.Group;
  mag: THREE.Group;
  muzzlePos: THREE.Vector3;
  emissiveMats: THREE.MeshStandardMaterial[];
  conduitTexture: THREE.CanvasTexture;
  triggerShotPulse: () => void;
  updateAnimation: (dt: number, elapsedSec: number, animateEnergy: boolean) => void;
  dispose: () => void;
}

/**
 * Generates procedural matte obsidian-black & ceramic-white segmented chassis textures,
 * paired roughness map, seamless flowing cyan-violet energy conduit emissive map,
 * and subtle iridescent holographic scope lens map.
 */
export function createVoidPiercerTextures(maxAnisotropy = 4): VoidPiercerTextureSet {
  // 1. Albedo: Matte obsidian-black & crisp ceramic-white architectural armor panels
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = 512;
  albedoCanvas.height = 256;
  const actx = albedoCanvas.getContext('2d')!;

  actx.fillStyle = '#0c0f16';
  actx.fillRect(0, 0, 512, 256);

  // Subtle matte micro-grain
  actx.strokeStyle = 'rgba(255, 255, 255, 0.022)';
  actx.lineWidth = 1;
  for (let y = 0; y < 256; y += 3) {
    actx.beginPath();
    actx.moveTo(0, y);
    actx.lineTo(512, y);
    actx.stroke();
  }

  // Sculpted matte ceramic-white upper & angled side armor plates
  const whiteGrad = actx.createLinearGradient(0, 0, 512, 256);
  whiteGrad.addColorStop(0, '#dde4ee');
  whiteGrad.addColorStop(0.5, '#eef3f9');
  whiteGrad.addColorStop(1, '#cfd9e6');
  actx.fillStyle = whiteGrad;

  // Geometric futuristic angled ceramic plates
  actx.beginPath();
  actx.moveTo(20, 18);
  actx.lineTo(210, 18);
  actx.lineTo(240, 88);
  actx.lineTo(44, 88);
  actx.closePath();
  actx.fill();

  actx.beginPath();
  actx.moveTo(270, 18);
  actx.lineTo(492, 18);
  actx.lineTo(470, 96);
  actx.lineTo(295, 96);
  actx.closePath();
  actx.fill();

  actx.beginPath();
  actx.moveTo(36, 170);
  actx.lineTo(248, 170);
  actx.lineTo(222, 236);
  actx.lineTo(18, 236);
  actx.closePath();
  actx.fill();

  actx.beginPath();
  actx.moveTo(286, 166);
  actx.lineTo(492, 166);
  actx.lineTo(476, 236);
  actx.lineTo(266, 236);
  actx.closePath();
  actx.fill();

  // Dark precision panel seam outlines
  actx.strokeStyle = '#06080d';
  actx.lineWidth = 2.6;
  actx.strokeRect(10, 10, 492, 236);
  for (let x = 64; x < 512; x += 96) {
    actx.beginPath();
    actx.moveTo(x, 10);
    actx.lineTo(x + 20, 128);
    actx.lineTo(x, 246);
    actx.stroke();
  }

  // Subtle recessed cyan-violet inlay grooves along center spine
  const grooveGrad = actx.createLinearGradient(0, 112, 512, 144);
  grooveGrad.addColorStop(0, 'rgba(34, 211, 238, 0.42)');
  grooveGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.48)');
  grooveGrad.addColorStop(1, 'rgba(34, 211, 238, 0.42)');
  actx.strokeStyle = grooveGrad;
  actx.lineWidth = 3;
  actx.beginPath();
  actx.moveTo(0, 128);
  actx.lineTo(512, 128);
  actx.stroke();

  const albedoMap = new THREE.CanvasTexture(albedoCanvas);
  albedoMap.colorSpace = THREE.SRGBColorSpace;
  albedoMap.wrapS = THREE.RepeatWrapping;
  albedoMap.wrapT = THREE.RepeatWrapping;
  albedoMap.anisotropy = Math.min(8, Math.max(1, maxAnisotropy));

  // 2. Roughness map (linear): matte obsidian (0.64) vs satin ceramic-white (0.36) vs sleek conduit (0.18)
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = 512;
  roughCanvas.height = 256;
  const rctx = roughCanvas.getContext('2d')!;
  rctx.fillStyle = '#a4a4a4'; // ~0.64 matte carbon-black
  rctx.fillRect(0, 0, 512, 256);
  rctx.fillStyle = '#5c5c5c'; // ~0.36 satin ceramic white plates
  rctx.fillRect(24, 18, 210, 70);
  rctx.fillRect(272, 18, 216, 78);
  rctx.fillRect(24, 170, 220, 66);
  rctx.fillRect(268, 166, 220, 70);
  rctx.fillStyle = '#2d2d2d'; // ~0.18 glossy energy seam
  rctx.fillRect(0, 118, 512, 20);
  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;

  // 3. Seamless flowing cyan & violet energy conduits (UV offset scrolled horizontally)
  const emCanvas = document.createElement('canvas');
  emCanvas.width = 512;
  emCanvas.height = 256;
  const ectx = emCanvas.getContext('2d')!;
  ectx.fillStyle = '#000000';
  ectx.fillRect(0, 0, 512, 256);

  const drawConduit = (
    baseY: number,
    amp: number,
    freq: number,
    phase: number,
    outerColor: string,
    coreColor: string,
    outerW: number,
    coreW: number
  ) => {
    ectx.lineCap = 'round';
    ectx.strokeStyle = outerColor;
    ectx.lineWidth = outerW;
    ectx.beginPath();
    for (let x = 0; x <= 512; x += 8) {
      const t = (x / 512) * Math.PI * 2 * freq + phase;
      const y = baseY + Math.sin(t) * amp;
      if (x === 0) ectx.moveTo(x, y);
      else ectx.lineTo(x, y);
    }
    ectx.stroke();

    ectx.strokeStyle = coreColor;
    ectx.lineWidth = coreW;
    ectx.beginPath();
    for (let x = 0; x <= 512; x += 8) {
      const t = (x / 512) * Math.PI * 2 * freq + phase;
      const y = baseY + Math.sin(t) * amp;
      if (x === 0) ectx.moveTo(x, y);
      else ectx.lineTo(x, y);
    }
    ectx.stroke();
  };

  // Intertwined cyan & violet plasma streams
  drawConduit(98, 12, 2, 0.0, '#7c3aed', '#d8b4fe', 8.5, 2.8);
  drawConduit(128, 16, 3, 1.1, '#0891b2', '#67e8f9', 10.5, 3.6);
  drawConduit(158, 11, 2, 2.5, '#9333ea', '#38bdf8', 7.5, 2.4);

  // Subtle flowing energy packets along the central conduit
  for (let i = 0; i < 12; i++) {
    const px = ((i * 85 + 24) % 480) + 16;
    const py = 104 + ((i * 37) % 48);
    const rg = ectx.createRadialGradient(px, py, 0, px, py, 13);
    rg.addColorStop(0, i % 2 === 0 ? 'rgba(165, 243, 252, 0.95)' : 'rgba(216, 180, 254, 0.92)');
    rg.addColorStop(0.5, i % 2 === 0 ? 'rgba(6, 182, 212, 0.55)' : 'rgba(147, 51, 234, 0.55)');
    rg.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ectx.fillStyle = rg;
    ectx.fillRect(px - 14, py - 14, 28, 28);
  }

  const emissiveConduitMap = new THREE.CanvasTexture(emCanvas);
  emissiveConduitMap.colorSpace = THREE.SRGBColorSpace;
  emissiveConduitMap.wrapS = THREE.RepeatWrapping;
  emissiveConduitMap.wrapT = THREE.RepeatWrapping;
  emissiveConduitMap.anisotropy = Math.min(8, Math.max(1, maxAnisotropy));

  // 4. Iridescent holographic glass lens texture for the 3D sniper scope
  const lensCanvas = document.createElement('canvas');
  lensCanvas.width = 128;
  lensCanvas.height = 128;
  const lctx = lensCanvas.getContext('2d')!;
  const lg = lctx.createRadialGradient(54, 48, 4, 64, 64, 64);
  lg.addColorStop(0, '#e0f2fe');
  lg.addColorStop(0.28, '#22d3ee');
  lg.addColorStop(0.58, '#8b5cf6');
  lg.addColorStop(0.82, '#1e1b4b');
  lg.addColorStop(1, '#090b14');
  lctx.fillStyle = lg;
  lctx.fillRect(0, 0, 128, 128);
  // Subtle concentric reticle etch inside physical lens
  lctx.strokeStyle = 'rgba(165, 243, 252, 0.55)';
  lctx.lineWidth = 1.5;
  lctx.beginPath();
  lctx.arc(64, 64, 38, 0, Math.PI * 2);
  lctx.stroke();
  lctx.beginPath();
  lctx.moveTo(22, 64);
  lctx.lineTo(106, 64);
  lctx.moveTo(64, 22);
  lctx.lineTo(64, 106);
  lctx.stroke();

  const iridescentLensMap = new THREE.CanvasTexture(lensCanvas);
  iridescentLensMap.colorSpace = THREE.SRGBColorSpace;

  return {
    albedoMap,
    roughnessMap,
    emissiveConduitMap,
    iridescentLensMap,
    dispose: () => {
      albedoMap.dispose();
      roughnessMap.dispose();
      emissiveConduitMap.dispose();
      iridescentLensMap.dispose();
    },
  };
}

/**
 * Builds the composite 3D Legendary AWM .338 Lapua "Void Piercer".
 * Preserves exact AWM proportions & muzzlePos (0, 0.036, -0.76) so zero gameplay/ADS/recoil changes occur.
 */
export function buildVoidPiercerSniper(options: {
  includeHands: boolean;
  gloveMat?: THREE.Material;
  sleeveMat?: THREE.Material;
  maxAnisotropy?: number;
}): VoidPiercerBuildResult {
  const textures = createVoidPiercerTextures(options.maxAnisotropy ?? 4);
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

  // Segmented Matte Black & White Armor with Flowing Cyan-Violet Energy Conduits
  const armorConduitMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.albedoMap,
      roughnessMap: textures.roughnessMap,
      roughness: 0.78,
      metalness: 0.42,
      emissive: new THREE.Color(0x67e8f9),
      emissiveMap: textures.emissiveConduitMap,
      emissiveIntensity: 1.05,
    })
  );

  // Matte Ceramic White Shroud Plates (clean high-contrast futuristic silhouette)
  const ceramicWhiteMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe6edf5,
      roughness: 0.48,
      metalness: 0.16,
    })
  );

  // Deep Matte Forged Carbon-Black (barrel, bipod, scope frame, bolt housing)
  const matteBlackMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0d111a,
      roughness: 0.42,
      metalness: 0.78,
    })
  );

  // Brushed Titanium-Violet Accent Alloy (muzzle fins, bolt handle, scope rings)
  const titaniumMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x94a3c8,
      roughness: 0.24,
      metalness: 0.9,
      emissive: new THREE.Color(0x1b1138),
      emissiveIntensity: 0.2,
    })
  );

  // Flowing Cyan-Violet Plasma Conduit Strip (exposed energy rails)
  const conduitStripMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0b1628,
      roughness: 0.25,
      metalness: 0.2,
      emissive: new THREE.Color(0x38e8ff),
      emissiveMap: textures.emissiveConduitMap,
      emissiveIntensity: 1.75,
    })
  );

  // Shot-Reactive Pulsing Energy Core Material (cyan-violet heart in receiver chamber)
  const energyCoreMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e103d,
      roughness: 0.16,
      metalness: 0.15,
      emissive: new THREE.Color(0x38e8ff),
      emissiveIntensity: 1.85,
    })
  );

  const energyRingMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2e1065,
      roughness: 0.22,
      metalness: 0.35,
      emissive: new THREE.Color(0xa855f7),
      emissiveIntensity: 1.5,
    })
  );

  // Iridescent Holographic Scope Glass
  const scopeLensMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.iridescentLensMap,
      roughness: 0.08,
      metalness: 0.25,
      emissive: new THREE.Color(0x22d3ee),
      emissiveMap: textures.iridescentLensMap,
      emissiveIntensity: 0.55,
    })
  );

  const g = new THREE.Group();

  // 1. Primary Sculpted Matte Black/White Chassis & Receiver
  const chassis = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.056, 0.066, 0.365)), armorConduitMat);
  g.add(chassis);

  // Upper Ceramic-White Split Armor Cowling
  const upperRec = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.05, 0.036, 0.29)), ceramicWhiteMat);
  upperRec.position.set(0, 0.044, -0.01);
  g.add(upperRec);

  // Side Cyan-Violet Energy Conduit Strips running along receiver flanks
  const sideRailGeo = trackGeo(new THREE.BoxGeometry(0.0045, 0.0085, 0.34));
  const sideRailL = new THREE.Mesh(sideRailGeo, conduitStripMat);
  sideRailL.position.set(-0.0295, 0.015, -0.01);
  const sideRailR = new THREE.Mesh(sideRailGeo, conduitStripMat);
  sideRailR.position.set(0.0295, 0.015, -0.01);
  g.add(sideRailL, sideRailR);

  // 2. Shot-Reactive Energy Core Chamber (visible on both receiver flanks + dorsal vent)
  const coreHousingGeo = trackGeo(new THREE.CylinderGeometry(0.017, 0.017, 0.062, 12));
  const coreHousing = new THREE.Mesh(coreHousingGeo, matteBlackMat);
  coreHousing.rotation.z = Math.PI / 2;
  coreHousing.position.set(0, 0.016, -0.085);
  g.add(coreHousing);

  const energyCoreMesh = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.015, 1)), energyCoreMat);
  energyCoreMesh.scale.set(2.15, 0.92, 0.92);
  energyCoreMesh.position.set(0, 0.016, -0.085);
  g.add(energyCoreMesh);

  const coreRingGeo = trackGeo(new THREE.TorusGeometry(0.0185, 0.0032, 8, 18));
  const coreRingL = new THREE.Mesh(coreRingGeo, energyRingMat);
  coreRingL.rotation.y = Math.PI / 2;
  coreRingL.position.set(-0.031, 0.016, -0.085);
  const coreRingR = new THREE.Mesh(coreRingGeo, energyRingMat);
  coreRingR.rotation.y = Math.PI / 2;
  coreRingR.position.set(0.031, 0.016, -0.085);
  g.add(coreRingL, coreRingR);

  // Legendary Prism Crest Emblem behind the energy core on both flanks
  const crestGeo = trackGeo(new THREE.OctahedronGeometry(0.0115, 0));
  const crestL = new THREE.Mesh(crestGeo, titaniumMat);
  crestL.scale.set(0.28, 1.0, 1.35);
  crestL.position.set(-0.03, 0.004, 0.082);
  const crestR = new THREE.Mesh(crestGeo, titaniumMat);
  crestR.scale.set(0.28, 1.0, 1.35);
  crestR.position.set(0.03, 0.004, 0.082);
  const crestCoreGeo = trackGeo(new THREE.BoxGeometry(0.004, 0.007, 0.011));
  const crestCoreL = new THREE.Mesh(crestCoreGeo, energyRingMat);
  crestCoreL.position.set(-0.032, 0.004, 0.082);
  const crestCoreR = new THREE.Mesh(crestCoreGeo, energyRingMat);
  crestCoreR.position.set(0.032, 0.004, 0.082);
  g.add(crestL, crestR, crestCoreL, crestCoreR);

  // Futuristic Angular Bolt Handle with Glowing Violet Tip
  const boltShaft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0048, 0.0048, 0.05, 8)), titaniumMat);
  boltShaft.rotation.z = -Math.PI / 2.4;
  boltShaft.position.set(0.038, 0.036, 0.05);
  const boltKnob = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.0115, 0)), matteBlackMat);
  boltKnob.position.set(0.056, 0.024, 0.05);
  const boltTip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.005, 0.005, 0.014)), energyRingMat);
  boltTip.position.set(0.059, 0.024, 0.05);
  g.add(boltShaft, boltKnob, boltTip);

  // 3. Sculpted Futuristic Thumbhole Stock (Ceramic White + Matte Carbon + Energy Spine)
  const stockMain = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.048, 0.088, 0.255)), armorConduitMat);
  stockMain.position.set(0, -0.016, 0.28);
  g.add(stockMain);
  const stockWhiteShell = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.052, 0.028, 0.22)), ceramicWhiteMat);
  stockWhiteShell.position.set(0, 0.022, 0.27);
  g.add(stockWhiteShell);
  const cheekRest = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.05, 0.024, 0.135)), matteBlackMat);
  cheekRest.position.set(0, 0.042, 0.26);
  g.add(cheekRest);
  const buttpad = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.05, 0.094, 0.02)), matteBlackMat);
  buttpad.position.set(0, -0.018, 0.41);
  g.add(buttpad);
  const grip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.038, 0.098, 0.048)), matteBlackMat);
  grip.position.set(0, -0.072, 0.12);
  grip.rotation.x = -0.24;
  const gripTrim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.041, 0.01, 0.05)), ceramicWhiteMat);
  gripTrim.position.set(0, -0.114, 0.13);
  gripTrim.rotation.x = -0.24;
  g.add(grip, gripTrim);

  // 4. Split-Rail Electromagnetic Barrel Shroud + Heavy Fluted Barrel + Plasma Muzzle Brake
  const barrel = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0125, 0.0155, 0.56, 12)), matteBlackMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.036, -0.42);
  g.add(barrel);

  // Ceramic-white floating rail shroud wings flanking the barrel
  const shroudTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.042, 0.012, 0.32)), ceramicWhiteMat);
  shroudTop.position.set(0, 0.056, -0.34);
  const shroudBot = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.038, 0.014, 0.34)), matteBlackMat);
  shroudBot.position.set(0, 0.014, -0.35);
  const barrelEnergyL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.005, 0.006, 0.36)), conduitStripMat);
  barrelEnergyL.position.set(-0.02, 0.036, -0.38);
  const barrelEnergyR = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.005, 0.006, 0.36)), conduitStripMat);
  barrelEnergyR.position.set(0.02, 0.036, -0.38);
  g.add(shroudTop, shroudBot, barrelEnergyL, barrelEnergyR);

  // Sculpted Multi-Port Split Muzzle Brake with Glowing Cyan-Violet Core Vent
  const muzzleBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.036, 0.03, 0.078)), matteBlackMat);
  muzzleBody.position.set(0, 0.036, -0.72);
  const muzzleFinTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.04, 0.007, 0.07)), ceramicWhiteMat);
  muzzleFinTop.position.set(0, 0.052, -0.72);
  const muzzleFinBot = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.04, 0.007, 0.07)), ceramicWhiteMat);
  muzzleFinBot.position.set(0, 0.02, -0.72);
  const muzzleGlowCollar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.041, 0.012, 0.018)), energyCoreMat);
  muzzleGlowCollar.position.set(0, 0.036, -0.705);
  g.add(muzzleBody, muzzleFinTop, muzzleFinBot, muzzleGlowCollar);

  // Sleek Folded Bipod
  const bipodMount = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.042, 0.022, 0.045)), matteBlackMat);
  bipodMount.position.set(0, -0.032, -0.24);
  const legL = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0055, 0.0055, 0.17, 6)), titaniumMat);
  legL.rotation.x = Math.PI / 2;
  legL.position.set(-0.024, -0.046, -0.32);
  const legR = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0055, 0.0055, 0.17, 6)), titaniumMat);
  legR.rotation.x = Math.PI / 2;
  legR.position.set(0.024, -0.046, -0.32);
  g.add(bipodMount, legL, legR);

  // 5. Futuristic Holographic Sci-Fi Scope Assembly (chamfered white/black housing + iridescent lens)
  const scopeRail = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.032, 0.012, 0.23)), titaniumMat);
  scopeRail.position.set(0, 0.066, -0.02);
  const ringRear = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.044, 0.036, 0.022)), matteBlackMat);
  ringRear.position.set(0, 0.088, 0.04);
  const ringFront = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.044, 0.036, 0.022)), matteBlackMat);
  ringFront.position.set(0, 0.088, -0.08);
  const scopeTube = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0185, 0.0185, 0.26, 14)), matteBlackMat);
  scopeTube.rotation.x = Math.PI / 2;
  scopeTube.position.set(0, 0.099, -0.02);
  // Angular ceramic-white outer sci-fi optic shroud
  const scopeHood = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.044, 0.026, 0.21)), ceramicWhiteMat);
  scopeHood.position.set(0, 0.108, -0.035);
  const scopeGlowRing = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0205, 0.0205, 0.014, 14)), energyRingMat);
  scopeGlowRing.rotation.x = Math.PI / 2;
  scopeGlowRing.position.set(0, 0.099, 0.07);
  const scopeBellFront = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.028, 0.021, 0.08, 14)), matteBlackMat);
  scopeBellFront.rotation.x = Math.PI / 2;
  scopeBellFront.position.set(0, 0.099, -0.175);
  const scopeEyepiece = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.022, 0.024, 0.056, 14)), matteBlackMat);
  scopeEyepiece.rotation.x = Math.PI / 2;
  scopeEyepiece.position.set(0, 0.099, 0.12);
  const lensBack = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.0195, 16)), scopeLensMat);
  lensBack.position.set(0, 0.099, 0.149);
  const lensFront = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.025, 16)), scopeLensMat);
  lensFront.rotation.y = Math.PI;
  lensFront.position.set(0, 0.099, -0.216);
  const holoBridgeTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.018, 0.008, 0.11)), conduitStripMat);
  holoBridgeTop.position.set(0, 0.124, -0.025);
  g.add(
    scopeRail,
    ringRear,
    ringFront,
    scopeTube,
    scopeHood,
    scopeGlowRing,
    scopeBellFront,
    scopeEyepiece,
    lensBack,
    lensFront,
    holoBridgeTop
  );

  // 6. Futuristic .338 Box Magazine with Glowing Energy Window
  const magGroup = new THREE.Group();
  const boxMag = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.038, 0.095, 0.086)), matteBlackMat);
  boxMag.position.set(0, -0.068, -0.02);
  const magEnergyStrip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.04, 0.058, 0.012)), conduitStripMat);
  magEnergyStrip.position.set(0, -0.066, -0.02);
  const magBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.041, 0.012, 0.09)), ceramicWhiteMat);
  magBase.position.set(0, -0.114, -0.02);
  magGroup.add(boxMag, magEnergyStrip, magBase);
  g.add(magGroup);

  // Optional First-Person Hands & Sleeve
  if (options.includeHands) {
    const gMat = options.gloveMat ?? matteBlackMat;
    const sMat = options.sleeveMat ?? matteBlackMat;
    const rHand = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.054, 0.065, 0.075)), gMat);
    rHand.position.set(0.008, -0.07, 0.12);
    const lHand = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.062, 0.055, 0.085)), gMat);
    lHand.position.set(-0.008, -0.026, -0.16);
    const lArm = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.065, 0.065, 0.24)), sMat);
    lArm.position.set(-0.09, -0.11, -0.05);
    lArm.rotation.set(0.32, -0.35, 0);
    g.add(rHand, lHand, lArm);
  }

  let shotPulse = 0;
  const _coreCyan = new THREE.Color(0x38e8ff);
  const _coreViolet = new THREE.Color(0xc084fc);
  const _coreMix = new THREE.Color();

  const triggerShotPulse = () => {
    shotPulse = 1.0;
  };

  const updateAnimation = (dt: number, elapsedSec: number, animateEnergy: boolean) => {
    if (shotPulse > 0) {
      shotPulse = Math.max(0, shotPulse - dt * 2.8);
    }

    if (!animateEnergy) {
      armorConduitMat.emissiveIntensity = 0.85;
      conduitStripMat.emissiveIntensity = 1.4;
      energyCoreMat.emissiveIntensity = 1.6 + shotPulse * 2.1;
      energyRingMat.emissiveIntensity = 1.3 + shotPulse * 1.4;
      return;
    }

    // Smooth energy current flowing toward barrel
    textures.emissiveConduitMap.offset.x = (textures.emissiveConduitMap.offset.x - dt * 0.22 + 1) % 1;
    textures.emissiveConduitMap.offset.y = Math.sin(elapsedSec * 0.9) * 0.03;

    const breathe = 0.5 + 0.5 * Math.sin(elapsedSec * 2.6);
    const pulseBoost = shotPulse * shotPulse;

    armorConduitMat.emissiveIntensity = 0.9 + breathe * 0.35 + pulseBoost * 0.85;
    conduitStripMat.emissiveIntensity = 1.55 + breathe * 0.45 + pulseBoost * 1.4;
    energyCoreMat.emissiveIntensity = 1.65 + breathe * 0.55 + pulseBoost * 2.6;
    energyRingMat.emissiveIntensity = 1.25 + (1 - breathe) * 0.5 + pulseBoost * 1.8;

    // Gentle cyan <-> violet color shift on core, flaring bright cyan-white on shot
    _coreMix.copy(_coreCyan).lerp(_coreViolet, 0.35 * (1 - breathe) * (1 - pulseBoost));
    energyCoreMat.emissive.copy(_coreMix);

    const coreScale = 1 + pulseBoost * 0.24 + breathe * 0.04;
    energyCoreMesh.scale.set(2.15, 0.92 * coreScale, 0.92 * coreScale);
    energyCoreMesh.rotation.x += dt * (1.2 + pulseBoost * 8.0);
  };

  const dispose = () => {
    for (let i = 0; i < ownedGeos.length; i++) ownedGeos[i].dispose();
    for (let i = 0; i < ownedMats.length; i++) ownedMats[i].dispose();
    textures.dispose();
  };

  return {
    group: g,
    mag: magGroup,
    muzzlePos: new THREE.Vector3(0, 0.036, -0.76),
    emissiveMats: [armorConduitMat, conduitStripMat, energyCoreMat, energyRingMat],
    conduitTexture: textures.emissiveConduitMap,
    triggerShotPulse,
    updateAnimation,
    dispose,
  };
}

// =============================================================================
// POOLED VOID PIERCER VFX SYSTEM
// - 1 InstancedMesh particle pool capped at 60 particles (0 dynamic lights)
// - Pooled narrow luminous energy beams + short muzzle/gravity shockwave rings
// =============================================================================

interface VoidParticleSlot {
  active: boolean;
  pos: THREE.Vector3;
  center: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  baseScale: number;
  orbitSpeed: number;
  orbitAngle: number;
  orbitRadius: number;
  mode: 'gravity' | 'muzzle';
}

interface VoidRingSlot {
  active: boolean;
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  life: number;
  maxLife: number;
  startScale: number;
  maxScale: number;
  baseOpacity: number;
}

interface VoidBeamSlot {
  active: boolean;
  coreMesh: THREE.Mesh;
  haloMesh: THREE.Mesh;
  coreMat: THREE.MeshBasicMaterial;
  haloMat: THREE.MeshBasicMaterial;
  life: number;
  maxLife: number;
  length: number;
}

const _vpDummy = new THREE.Object3D();
const _vpColor = new THREE.Color();
const _vpMid = new THREE.Vector3();
const _vpDir = new THREE.Vector3();
const _vpUp = new THREE.Vector3(0, 1, 0);
const _vpQuat = new THREE.Quaternion();

export class VoidPiercerVfxPool {
  private readonly scene: THREE.Scene;
  private readonly instanced: THREE.InstancedMesh;
  private readonly particleGeo: THREE.BufferGeometry;
  private readonly particleMat: THREE.MeshBasicMaterial;
  private readonly slots: VoidParticleSlot[] = [];
  private cursor = 0;

  private readonly ringGeo: THREE.RingGeometry;
  private readonly rings: VoidRingSlot[] = [];
  private ringCursor = 0;

  private readonly beamGeo: THREE.CylinderGeometry;
  private readonly beams: VoidBeamSlot[] = [];
  private beamCursor = 0;

  constructor(scene: THREE.Scene, maxParticles = VOID_MAX_POOLED_PARTICLES) {
    this.scene = scene;
    const cap = Math.max(12, Math.min(VOID_MAX_POOLED_PARTICLES, maxParticles));

    this.particleGeo = new THREE.OctahedronGeometry(0.052, 0);
    this.particleMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.instanced = new THREE.InstancedMesh(this.particleGeo, this.particleMat, cap);
    this.instanced.frustumCulled = false;
    this.instanced.count = cap;

    _vpDummy.scale.set(0, 0, 0);
    _vpDummy.position.set(0, -999, 0);
    _vpDummy.updateMatrix();
    for (let i = 0; i < cap; i++) {
      this.instanced.setMatrixAt(i, _vpDummy.matrix);
      this.instanced.setColorAt(i, _vpColor.setHex(0x22d3ee));
      this.slots.push({
        active: false,
        pos: new THREE.Vector3(),
        center: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.6,
        baseScale: 1,
        orbitSpeed: 4,
        orbitAngle: 0,
        orbitRadius: 0.8,
        mode: 'gravity',
      });
    }
    this.instanced.instanceMatrix.needsUpdate = true;
    if (this.instanced.instanceColor) this.instanced.instanceColor.needsUpdate = true;
    this.instanced.visible = false;
    scene.add(this.instanced);

    // 6 pooled shockwave / gravitational rings (reused for muzzle shockwaves & gravity kills)
    this.ringGeo = new THREE.RingGeometry(0.36, 0.52, 28);
    for (let i = 0; i < 6; i++) {
      const rMat = new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const rMesh = new THREE.Mesh(this.ringGeo, rMat);
      rMesh.visible = false;
      rMesh.frustumCulled = false;
      scene.add(rMesh);
      this.rings.push({
        active: false,
        mesh: rMesh,
        mat: rMat,
        life: 0,
        maxLife: 0.45,
        startScale: 0.2,
        maxScale: 2.6,
        baseOpacity: 0.82,
      });
    }

    // 4 pooled narrow luminous energy beams (core cyan-white + outer violet halo)
    this.beamGeo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
    for (let i = 0; i < 4; i++) {
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xdcfbff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xa855f7,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const coreMesh = new THREE.Mesh(this.beamGeo, coreMat);
      const haloMesh = new THREE.Mesh(this.beamGeo, haloMat);
      coreMesh.visible = false;
      haloMesh.visible = false;
      coreMesh.frustumCulled = false;
      haloMesh.frustumCulled = false;
      scene.add(coreMesh, haloMesh);
      this.beams.push({
        active: false,
        coreMesh,
        haloMesh,
        coreMat,
        haloMat,
        life: 0,
        maxLife: 0.26,
        length: 1,
      });
    }
  }

  private allocSlot(): { slot: VoidParticleSlot; idx: number } {
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

  private allocRing(): VoidRingSlot {
    const ring = this.rings[this.ringCursor];
    this.ringCursor = (this.ringCursor + 1) % this.rings.length;
    return ring;
  }

  /**
   * Fires a narrow luminous cyan-violet energy beam + short muzzle shockwave ring.
   * Visible for both local and remote Void Piercer sniper shots.
   */
  public spawnBeamAndShockwave(
    startWorld: THREE.Vector3,
    endWorld: THREE.Vector3,
    intensityScale = 1.0,
    disabled = false
  ): void {
    _vpDir.subVectors(endWorld, startWorld);
    const len = _vpDir.length();
    if (len < 0.25) return;
    _vpDir.multiplyScalar(1 / len);

    // Narrow luminous beam (always shown briefly, simplified opacity if disabled/reduced)
    const beam = this.beams[this.beamCursor];
    this.beamCursor = (this.beamCursor + 1) % this.beams.length;
    beam.active = true;
    beam.maxLife = disabled ? 0.14 : 0.28;
    beam.life = beam.maxLife;
    beam.length = len;

    _vpMid.addVectors(startWorld, endWorld).multiplyScalar(0.5);
    _vpQuat.setFromUnitVectors(_vpUp, _vpDir);

    beam.coreMesh.position.copy(_vpMid);
    beam.coreMesh.quaternion.copy(_vpQuat);
    beam.coreMesh.scale.set(0.016, len, 0.016);
    beam.coreMat.opacity = 0.92;
    beam.coreMesh.visible = true;

    beam.haloMesh.position.copy(_vpMid);
    beam.haloMesh.quaternion.copy(_vpQuat);
    beam.haloMesh.scale.set(0.046, len, 0.046);
    beam.haloMat.opacity = disabled ? 0.28 : 0.56;
    beam.haloMesh.visible = true;

    if (disabled || intensityScale <= 0.05) return;

    // Short perpendicular shockwave ring near muzzle along shot direction
    const shock = this.allocRing();
    shock.active = true;
    shock.maxLife = 0.22;
    shock.life = shock.maxLife;
    shock.startScale = 0.14;
    shock.maxScale = 0.85;
    shock.baseOpacity = 0.84;
    shock.mesh.position.copy(startWorld).addScaledVector(_vpDir, Math.min(0.45, len * 0.25));
    shock.mesh.lookAt(endWorld);
    shock.mesh.scale.setScalar(shock.startScale);
    shock.mat.color.setHex(0x38e8ff);
    shock.mat.opacity = shock.baseOpacity;
    shock.mesh.visible = true;

    // 4-6 crisp cyan/violet ionized muzzle motes
    const moteCount = Math.max(2, Math.min(6, Math.round(5 * intensityScale)));
    for (let i = 0; i < moteCount; i++) {
      const { slot, idx } = this.allocSlot();
      slot.active = true;
      slot.mode = 'muzzle';
      slot.pos.copy(startWorld).addScaledVector(_vpDir, 0.08 + Math.random() * 0.25);
      slot.center.copy(startWorld);
      slot.vel.set(
        (Math.random() - 0.5) * 1.1,
        0.25 + Math.random() * 0.75,
        (Math.random() - 0.5) * 1.1
      );
      slot.maxLife = 0.24 + Math.random() * 0.22;
      slot.life = slot.maxLife;
      slot.baseScale = 0.22 + Math.random() * 0.22;
      slot.orbitSpeed = 7;
      slot.orbitAngle = Math.random() * Math.PI * 2;
      slot.orbitRadius = 0;
      _vpColor.setHex(i % 2 === 0 ? 0x22d3ee : 0xc084fc);
      this.instanced.setColorAt(idx, _vpColor);
    }
    if (this.instanced.instanceColor) this.instanced.instanceColor.needsUpdate = true;
    this.instanced.visible = true;
  }

  /**
   * Gravitational wave kill effect (< 0.9s):
   * Expanding cyan-violet gravity ring(s) + swirling orbital particles around the eliminated enemy.
   * Headshots trigger a larger dual-axis gravity wave & richer orbital vortex.
   */
  public spawnGravityKill(
    worldPos: THREE.Vector3,
    isHeadshot: boolean,
    intensityScale = 1.0,
    disabled = false
  ): void {
    if (disabled || intensityScale <= 0.05) return;

    const baseCount = isHeadshot ? 32 : 18;
    const count = Math.max(8, Math.min(36, Math.round(baseCount * intensityScale)));
    const scaleBoost = isHeadshot ? 1.42 : 1.02;
    const radiusBoost = isHeadshot ? 1.38 : 1.0;

    for (let i = 0; i < count; i++) {
      const { slot, idx } = this.allocSlot();
      slot.active = true;
      slot.mode = 'gravity';
      slot.center.set(worldPos.x, worldPos.y, worldPos.z);
      const ang = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      const startRad = (0.35 + Math.random() * 0.6) * radiusBoost;
      slot.orbitAngle = ang;
      slot.orbitRadius = startRad;
      slot.orbitSpeed = (isHeadshot ? 5.2 : 3.8) * (i % 2 === 0 ? 1 : -1);
      slot.pos.set(
        worldPos.x + Math.cos(ang) * startRad,
        worldPos.y + (Math.random() - 0.5) * 0.85,
        worldPos.z + Math.sin(ang) * startRad
      );
      slot.vel.set(
        Math.cos(ang) * (1.8 + Math.random() * 2.2) * radiusBoost,
        (0.6 + Math.random() * 1.9) * radiusBoost,
        Math.sin(ang) * (1.8 + Math.random() * 2.2) * radiusBoost
      );
      slot.maxLife = (isHeadshot ? 0.62 : 0.48) + Math.random() * 0.24; // always < 0.9s
      slot.life = slot.maxLife;
      slot.baseScale = (0.52 + Math.random() * 0.72) * scaleBoost;

      const pick = i % 3;
      if (pick === 0) _vpColor.setHex(0x22d3ee);
      else if (pick === 1) _vpColor.setHex(0xa855f7);
      else _vpColor.setHex(isHeadshot ? 0xe0f2fe : 0x818cf8);
      this.instanced.setColorAt(idx, _vpColor);
    }

    if (this.instanced.instanceColor) this.instanced.instanceColor.needsUpdate = true;
    this.instanced.visible = true;

    // Expanding horizontal gravitational wave ring
    const mainRing = this.allocRing();
    mainRing.active = true;
    mainRing.maxLife = isHeadshot ? 0.62 : 0.48;
    mainRing.life = mainRing.maxLife;
    mainRing.startScale = 0.25;
    mainRing.maxScale = isHeadshot ? 4.1 : 2.65;
    mainRing.baseOpacity = 0.88;
    mainRing.mesh.position.set(worldPos.x, worldPos.y, worldPos.z);
    mainRing.mesh.rotation.set(-Math.PI / 2, 0, 0);
    mainRing.mesh.scale.setScalar(mainRing.startScale);
    mainRing.mat.color.setHex(0x22d3ee);
    mainRing.mat.opacity = mainRing.baseOpacity;
    mainRing.mesh.visible = true;

    // Secondary tilted violet orbital gravity wave (always on headshot, subtle echo on body kill)
    const secondRing = this.allocRing();
    secondRing.active = true;
    secondRing.maxLife = isHeadshot ? 0.72 : 0.52;
    secondRing.life = secondRing.maxLife;
    secondRing.startScale = 0.2;
    secondRing.maxScale = isHeadshot ? 4.8 : 2.1;
    secondRing.baseOpacity = isHeadshot ? 0.82 : 0.56;
    secondRing.mesh.position.set(worldPos.x, worldPos.y + 0.12, worldPos.z);
    secondRing.mesh.rotation.set(-Math.PI / 2 + (isHeadshot ? 0.58 : 0.28), 0.35, 0);
    secondRing.mesh.scale.setScalar(secondRing.startScale);
    secondRing.mat.color.setHex(0xa855f7);
    secondRing.mat.opacity = secondRing.baseOpacity;
    secondRing.mesh.visible = true;
  }

  public update(dt: number): void {
    let anyActive = false;
    let matrixDirty = false;

    if (this.instanced.visible) {
      for (let i = 0; i < this.slots.length; i++) {
        const s = this.slots[i];
        if (!s.active) continue;
        s.life -= dt;
        if (s.life <= 0) {
          s.active = false;
          _vpDummy.scale.set(0, 0, 0);
          _vpDummy.position.set(0, -999, 0);
          _vpDummy.updateMatrix();
          this.instanced.setMatrixAt(i, _vpDummy.matrix);
          matrixDirty = true;
          continue;
        }
        anyActive = true;
        const norm = s.life / s.maxLife; // 1 -> 0
        const prog = 1 - norm;

        if (s.mode === 'gravity') {
          // Brief gravitational swirl inward (0..0.28), then outward pulse release
          s.orbitAngle += s.orbitSpeed * dt;
          const radialFactor = prog < 0.28 ? 1 - prog * 1.4 : 0.6 + (prog - 0.28) * 3.1;
          const rad = Math.max(0.12, s.orbitRadius * radialFactor);
          s.pos.x = s.center.x + Math.cos(s.orbitAngle) * rad;
          s.pos.z = s.center.z + Math.sin(s.orbitAngle) * rad;
          s.pos.y += s.vel.y * dt * 0.45;
        } else {
          s.pos.addScaledVector(s.vel, dt);
          s.vel.multiplyScalar(Math.max(0, 1 - dt * 3.0));
        }

        const sc = s.baseScale * Math.sin(Math.min(1, norm) * Math.PI * 0.9);
        _vpDummy.position.copy(s.pos);
        _vpDummy.rotation.set(s.orbitAngle * 0.5, s.orbitAngle, s.orbitAngle * 0.3);
        _vpDummy.scale.set(sc, sc * 1.25, sc);
        _vpDummy.updateMatrix();
        this.instanced.setMatrixAt(i, _vpDummy.matrix);
        matrixDirty = true;
      }
      if (matrixDirty) {
        this.instanced.instanceMatrix.needsUpdate = true;
      }
      if (!anyActive) {
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
      const eased = 1 - Math.pow(1 - prog, 2.4);
      const rad = r.startScale + eased * (r.maxScale - r.startScale);
      r.mesh.scale.setScalar(rad);
      r.mat.opacity = (1 - prog) * r.baseOpacity;
    }

    for (let i = 0; i < this.beams.length; i++) {
      const b = this.beams[i];
      if (!b.active) continue;
      b.life -= dt;
      if (b.life <= 0) {
        b.active = false;
        b.coreMesh.visible = false;
        b.haloMesh.visible = false;
        continue;
      }
      const norm = b.life / b.maxLife;
      const widthScale = 0.45 + 0.55 * norm;
      b.coreMesh.scale.set(0.016 * widthScale, b.length, 0.016 * widthScale);
      b.haloMesh.scale.set(0.048 * (1.25 - 0.35 * norm), b.length, 0.048 * (1.25 - 0.35 * norm));
      b.coreMat.opacity = norm * 0.95;
      b.haloMat.opacity = norm * 0.55;
    }
  }

  public clear(): void {
    _vpDummy.scale.set(0, 0, 0);
    _vpDummy.position.set(0, -999, 0);
    _vpDummy.updateMatrix();
    for (let i = 0; i < this.slots.length; i++) {
      this.slots[i].active = false;
      this.instanced.setMatrixAt(i, _vpDummy.matrix);
    }
    this.instanced.instanceMatrix.needsUpdate = true;
    this.instanced.visible = false;
    for (let i = 0; i < this.rings.length; i++) {
      this.rings[i].active = false;
      this.rings[i].mesh.visible = false;
    }
    for (let i = 0; i < this.beams.length; i++) {
      this.beams[i].active = false;
      this.beams[i].coreMesh.visible = false;
      this.beams[i].haloMesh.visible = false;
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
    for (let i = 0; i < this.beams.length; i++) {
      if (this.beams[i].active) n++;
    }
    return n;
  }

  public dispose(): void {
    this.scene.remove(this.instanced);
    this.particleGeo.dispose();
    this.particleMat.dispose();
    for (let i = 0; i < this.rings.length; i++) {
      this.scene.remove(this.rings[i].mesh);
      this.rings[i].mat.dispose();
    }
    this.ringGeo.dispose();
    for (let i = 0; i < this.beams.length; i++) {
      this.scene.remove(this.beams[i].coreMesh, this.beams[i].haloMesh);
      this.beams[i].coreMat.dispose();
      this.beams[i].haloMat.dispose();
    }
    this.beamGeo.dispose();
  }
}
