/**
 * Legendary RPG-7V "Nova Dragon" (آرپی‌جی نُوا دِرَگون) — High-Craft Procedural 3D Model & VFX Pool
 *
 * Original procedural Three.js weapon skin:
 * - Obsidian anodized titanium barrel with engraved golden dragon scales & glowing emerald plasma veins
 * - Sculpted dragon-spine heat shroud, beveled gold containment rings, and flaring Venturi afterburner cone
 * - Animated "Nova Core" warhead (LatheGeometry torpedo + 4 beveled ExtrudeGeometry fins + exposed emerald plasma core
 *   orbited by 2 counter-rotating golden gyro-rings) that slides cleanly into the muzzle during reload
 * - Zero-allocation pooled NovaDragonVfxPool: spiral emerald-gold plasma rocket trail, twin-ring Nova supernova
 *   explosion shockwave, and Legendary emerald-gold kill vortex pillar
 * - Full GPU resource disposal (.dispose()) and 100% cosmetic-only (zero damage/blast/hitbox changes)
 */

import * as THREE from 'three';
import { getCachedProceduralCanvas } from './sharedPreviewRenderer';
import { buildSculptedTacticalHands } from './weaponModels3d';

export interface NovaDragonRpgBuildOptions {
  includeHands?: boolean;
  gloveMat?: THREE.Material;
  sleeveMat?: THREE.Material;
  maxAnisotropy?: number;
}

export interface NovaDragonRpgBuildResult {
  group: THREE.Group;
  mag: THREE.Group;
  muzzlePos: THREE.Vector3;
  triggerLaunch: () => void;
  updateAnimation: (dt: number, elapsedSec: number, animated?: boolean) => void;
  dispose: () => void;
}

interface NovaRpgTextureSet {
  barrelMap: THREE.CanvasTexture;
  barrelRoughMap: THREE.CanvasTexture;
  gripMap: THREE.CanvasTexture;
  dispose: () => void;
}

let cachedNovaBarrelCanvases: {
  albedoCanvas: HTMLCanvasElement;
  roughCanvas: HTMLCanvasElement;
} | null = null;

function createNovaDragonTextures(maxAnisotropy = 4): NovaRpgTextureSet {
  if (!cachedNovaBarrelCanvases) {
    const albedoCanvas = getCachedProceduralCanvas('nova-rpg-barrel-512x256', 512, 256, () => {});
    const ctx = albedoCanvas.getContext('2d');

    const roughCanvas = getCachedProceduralCanvas('nova-rpg-rough-512x256', 512, 256, () => {});
    const rCtx = roughCanvas.getContext('2d');

    if (ctx && rCtx) {
      // Deep obsidian-emerald metallic gradient base
      const grad = ctx.createLinearGradient(0, 0, 512, 0);
      grad.addColorStop(0.0, '#091015');
      grad.addColorStop(0.35, '#101d24');
      grad.addColorStop(0.65, '#0c161d');
      grad.addColorStop(1.0, '#070d12');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 256);

      // Roughness base: satin carbon-titanium (~0.36) with polished gold scale edges (~0.16)
      rCtx.fillStyle = '#5c5c5c';
      rCtx.fillRect(0, 0, 512, 256);

      // Interlocking engraved golden dragon-scale arcs
      const scaleW = 32;
      const scaleH = 24;
      for (let row = 0; row < 12; row++) {
        const y = row * scaleH;
        const offsetX = (row % 2) * (scaleW * 0.5);
        for (let col = -1; col < 18; col++) {
          const cx = col * scaleW + offsetX;
          ctx.beginPath();
          ctx.arc(cx, y, scaleW * 0.48, 0.12 * Math.PI, 0.88 * Math.PI);
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.42)';
          ctx.lineWidth = 1.6;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(cx, y + 3, scaleW * 0.32, 0.18 * Math.PI, 0.82 * Math.PI);
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.34)';
          ctx.lineWidth = 1.1;
          ctx.stroke();

          rCtx.beginPath();
          rCtx.arc(cx, y, scaleW * 0.48, 0.12 * Math.PI, 0.88 * Math.PI);
          rCtx.strokeStyle = '#262626';
          rCtx.lineWidth = 2.2;
          rCtx.stroke();
        }
      }

      // Luminous emerald plasma energy conduits running along the tube length
      const conduitYs = [52, 128, 204];
      for (let i = 0; i < conduitYs.length; i++) {
        const cy = conduitYs[i];
        const glowGrad = ctx.createLinearGradient(0, cy - 10, 0, cy + 10);
        glowGrad.addColorStop(0.0, 'rgba(16, 185, 129, 0)');
        glowGrad.addColorStop(0.5, 'rgba(52, 211, 153, 0.88)');
        glowGrad.addColorStop(1.0, 'rgba(16, 185, 129, 0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, cy - 8, 512, 16);

        ctx.strokeStyle = '#a7f3d0';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(512, cy);
        ctx.stroke();

        // Gold chevron tech notches along conduit
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.5;
        for (let x = 24; x < 512; x += 64) {
          ctx.beginPath();
          ctx.moveTo(x - 8, cy - 9);
          ctx.lineTo(x, cy - 4);
          ctx.lineTo(x + 8, cy - 9);
          ctx.moveTo(x - 8, cy + 9);
          ctx.lineTo(x, cy + 4);
          ctx.lineTo(x + 8, cy + 9);
          ctx.stroke();
        }

        rCtx.fillStyle = '#1e1e1e';
        rCtx.fillRect(0, cy - 4, 512, 8);
      }
    }

    cachedNovaBarrelCanvases = { albedoCanvas, roughCanvas };
  }

  const { albedoCanvas, roughCanvas } = cachedNovaBarrelCanvases;
  const barrelMap = new THREE.CanvasTexture(albedoCanvas);
  barrelMap.colorSpace = THREE.SRGBColorSpace;
  barrelMap.wrapS = THREE.RepeatWrapping;
  barrelMap.wrapT = THREE.RepeatWrapping;
  barrelMap.repeat.set(2, 1);
  barrelMap.anisotropy = Math.min(8, maxAnisotropy);
  barrelMap.needsUpdate = true;

  const barrelRoughMap = new THREE.CanvasTexture(roughCanvas);
  barrelRoughMap.wrapS = THREE.RepeatWrapping;
  barrelRoughMap.wrapT = THREE.RepeatWrapping;
  barrelRoughMap.repeat.set(2, 1);
  barrelRoughMap.anisotropy = Math.min(8, maxAnisotropy);
  barrelRoughMap.needsUpdate = true;

  // Tactile obsidian carbon-hex grip wrap with emerald-gold thread accents
  const gCanvas = getCachedProceduralCanvas('nova-rpg-grip-256x256', 256, 256, (gCtx) => {
    gCtx.fillStyle = '#11161c';
    gCtx.fillRect(0, 0, 256, 256);

    gCtx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
    gCtx.lineWidth = 1.5;
    for (let y = -128; y < 384; y += 24) {
      gCtx.beginPath();
      gCtx.moveTo(0, y);
      gCtx.lineTo(256, y + 128);
      gCtx.stroke();
      gCtx.beginPath();
      gCtx.moveTo(256, y);
      gCtx.lineTo(0, y + 128);
      gCtx.stroke();
    }

    gCtx.fillStyle = 'rgba(16, 185, 129, 0.35)';
    for (let y = 12; y < 256; y += 24) {
      for (let x = 16; x < 256; x += 32) {
        gCtx.beginPath();
        gCtx.arc(x, y, 2.2, 0, Math.PI * 2);
        gCtx.fill();
      }
    }
  });

  const gripMap = new THREE.CanvasTexture(gCanvas);
  gripMap.colorSpace = THREE.SRGBColorSpace;
  gripMap.wrapS = THREE.RepeatWrapping;
  gripMap.wrapT = THREE.RepeatWrapping;
  gripMap.repeat.set(1, 2);
  gripMap.anisotropy = Math.min(8, maxAnisotropy);
  gripMap.needsUpdate = true;

  return {
    barrelMap,
    barrelRoughMap,
    gripMap,
    dispose: () => {
      barrelMap.dispose();
      barrelRoughMap.dispose();
      gripMap.dispose();
    },
  };
}

/** Creates a swept dragon-fang stabilizer fin via ExtrudeGeometry with crisp bevels. */
function createDragonFinGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.056, 0.012);
  shape.lineTo(0.068, 0.036);
  shape.lineTo(0.022, 0.032);
  shape.lineTo(-0.012, 0.008);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    steps: 1,
    depth: 0.004,
    bevelEnabled: true,
    bevelThickness: 0.0016,
    bevelSize: 0.0014,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.002);
  geo.computeVertexNormals();
  return geo;
}

/** Creates a sleek multi-stage LatheGeometry warhead nose shell. */
function createNovaWarheadShellGeometry(): THREE.LatheGeometry {
  const pts = [
    new THREE.Vector2(0.001, 0.215), // needle tip
    new THREE.Vector2(0.013, 0.195),
    new THREE.Vector2(0.034, 0.135),
    new THREE.Vector2(0.049, 0.075), // flared dragon crown ridge
    new THREE.Vector2(0.044, 0.042),
    new THREE.Vector2(0.036, 0.0),   // meets plasma core chamber
  ];
  const geo = new THREE.LatheGeometry(pts, 20);
  geo.computeVertexNormals();
  return geo;
}

export function buildNovaDragonRpg3D(
  options: NovaDragonRpgBuildOptions = {}
): NovaDragonRpgBuildResult {
  const { includeHands = false, gloveMat, sleeveMat, maxAnisotropy = 4 } = options;

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

  const textures = createNovaDragonTextures(maxAnisotropy);

  // PBR Material Palette (contrasting metalness & roughness across adjacent surfaces)
  const obsidianDragonMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xdbeafe,
      map: textures.barrelMap,
      roughnessMap: textures.barrelRoughMap,
      metalness: 0.84,
      roughness: 0.34,
      emissive: new THREE.Color(0x064e3b),
      emissiveIntensity: 0.22,
    })
  );

  const matteCarbonMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      map: textures.gripMap,
      metalness: 0.28,
      roughness: 0.72,
    })
  );

  const imperialGoldMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.94,
      roughness: 0.18,
      emissive: new THREE.Color(0x78350f),
      emissiveIntensity: 0.18,
    })
  );

  const darkTitaniumMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x16202a,
      metalness: 0.78,
      roughness: 0.42,
    })
  );

  const emeraldPlasmaMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x6ee7b7,
      emissive: new THREE.Color(0x10b981),
      emissiveIntensity: 1.9,
      metalness: 0.15,
      roughness: 0.14,
    })
  );

  const afterburnerRingMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xa7f3d0,
      emissive: new THREE.Color(0x34d399),
      emissiveIntensity: 1.35,
      metalness: 0.2,
      roughness: 0.18,
    })
  );

  const haloAuraMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );

  const g = new THREE.Group();

  // 1. Primary Silhouette — Obsidian Dragon-Scale Launch Tube
  const mainTube = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.033, 0.033, 0.94, 20)),
    obsidianDragonMat
  );
  mainTube.rotation.x = Math.PI / 2;
  mainTube.position.set(0, 0.02, -0.04);
  g.add(mainTube);

  // Armored Ribbed Heat Shroud with Emerald Energy Vents
  const heatShroud = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.0405, 0.0405, 0.36, 16)),
    darkTitaniumMat
  );
  heatShroud.rotation.x = Math.PI / 2;
  heatShroud.position.set(0, 0.02, -0.07);
  g.add(heatShroud);

  // Side glowing plasma vent strips along heat shroud
  const ventGeo = trackGeo(new THREE.BoxGeometry(0.005, 0.011, 0.29));
  for (const side of [-1, 1]) {
    const vent = new THREE.Mesh(ventGeo, emeraldPlasmaMat);
    vent.position.set(side * 0.0405, 0.024, -0.07);
    g.add(vent);
  }

  // Sculpted Golden Dragon-Spine Containment Clamps
  const clampGeo = trackGeo(new THREE.TorusGeometry(0.042, 0.0042, 8, 20));
  const clampZs = [-0.23, -0.125, -0.02, 0.095];
  for (let i = 0; i < clampZs.length; i++) {
    const cl = new THREE.Mesh(clampGeo, imperialGoldMat);
    cl.position.set(0, 0.02, clampZs[i]);
    g.add(cl);
  }

  // Front Golden Dragon Crown Collar (Muzzle Flange)
  const frontFlange = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.044, 0.036, 0.046, 18)),
    imperialGoldMat
  );
  frontFlange.rotation.x = Math.PI / 2;
  frontFlange.position.set(0, 0.02, -0.495);
  const muzzlePlasmaRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.043, 0.0032, 8, 20)),
    emeraldPlasmaMat
  );
  muzzlePlasmaRing.position.set(0, 0.02, -0.515);
  g.add(frontFlange, muzzlePlasmaRing);

  // Rear Dual-Stage Flared Venturi Thruster Exhaust Cone + Glowing Afterburner Ring
  const exhaustOuter = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.034, 0.062, 0.17, 20)),
    darkTitaniumMat
  );
  exhaustOuter.rotation.x = Math.PI / 2;
  exhaustOuter.position.set(0, 0.02, 0.485);
  const exhaustTrim = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.061, 0.0045, 8, 22)),
    imperialGoldMat
  );
  exhaustTrim.position.set(0, 0.02, 0.568);
  const exhaustAfterburner = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.046, 0.0055, 8, 20)),
    afterburnerRingMat
  );
  exhaustAfterburner.position.set(0, 0.02, 0.556);
  g.add(exhaustOuter, exhaustTrim, exhaustAfterburner);

  // 2. Secondary Read — Dual Carbon Grips, Gold Trigger Guard & Holographic Emerald Sight
  const frontGrip = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.034, 0.098, 0.043)),
    matteCarbonMat
  );
  frontGrip.position.set(0, -0.056, -0.22);
  frontGrip.rotation.x = -0.22;
  const frontGripCap = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.036, 0.012, 0.046)),
    imperialGoldMat
  );
  frontGripCap.position.set(0, -0.104, -0.21);
  frontGripCap.rotation.x = -0.22;

  const rearGrip = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.032, 0.088, 0.038)),
    matteCarbonMat
  );
  rearGrip.position.set(0, -0.054, -0.02);
  rearGrip.rotation.x = -0.12;
  const trigGuard = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.018, 0.006, 0.058)),
    imperialGoldMat
  );
  trigGuard.position.set(0, -0.04, -0.266);

  // Sculpted Holographic Emerald Target Sight (aligned cleanly at y = 0.086)
  const sightRail = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.024, 0.012, 0.25)),
    darkTitaniumMat
  );
  sightRail.position.set(0, 0.06, -0.35);
  const rearArchL = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.005, 0.042, 0.012)),
    imperialGoldMat
  );
  rearArchL.position.set(-0.014, 0.081, -0.245);
  const rearArchR = rearArchL.clone();
  rearArchR.position.x = 0.014;
  const frontArch = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.018, 0.0032, 8, 18, Math.PI)),
    imperialGoldMat
  );
  frontArch.position.set(0, 0.072, -0.455);
  const holoReticleDot = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.0046, 0)),
    emeraldPlasmaMat
  );
  holoReticleDot.position.set(0, 0.086, -0.455);

  g.add(
    frontGrip,
    frontGripCap,
    rearGrip,
    trigGuard,
    sightRail,
    rearArchL,
    rearArchR,
    frontArch,
    holoReticleDot
  );

  // 3. Signature Animated "Nova Core" Warhead (loaded in magGroup so reload slides it smoothly!)
  const magGroup = new THREE.Group();

  const neck = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.022, 0.026, 0.085, 14)),
    darkTitaniumMat
  );
  neck.rotation.x = Math.PI / 2;
  neck.position.set(0, 0.02, -0.535);

  const coreCollar = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.04, 0.03, 0.032, 16)),
    imperialGoldMat
  );
  coreCollar.rotation.x = Math.PI / 2;
  coreCollar.position.set(0, 0.02, -0.585);

  // Exposed pulsing emerald Nova Plasma Core
  const plasmaCore = new THREE.Mesh(
    trackGeo(new THREE.IcosahedronGeometry(0.036, 1)),
    emeraldPlasmaMat
  );
  plasmaCore.position.set(0, 0.02, -0.635);

  const plasmaAura = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.052, 14, 12)),
    haloAuraMat
  );
  plasmaAura.position.set(0, 0.02, -0.635);

  // Two counter-rotating golden containment gyro-rings orbiting the Nova Core
  const gyroRingOuter = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.054, 0.0038, 8, 24)),
    imperialGoldMat
  );
  gyroRingOuter.position.set(0, 0.02, -0.635);
  gyroRingOuter.rotation.set(Math.PI / 3, 0.35, 0);

  const gyroRingInner = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.046, 0.0032, 8, 22)),
    emeraldPlasmaMat
  );
  gyroRingInner.position.set(0, 0.02, -0.635);
  gyroRingInner.rotation.set(-Math.PI / 4, -0.5, Math.PI / 4);

  // LatheGeometry Sculpted Dragon-Fang Warhead Nose Cone
  const warheadShell = new THREE.Mesh(
    trackGeo(createNovaWarheadShellGeometry()),
    obsidianDragonMat
  );
  warheadShell.rotation.x = -Math.PI / 2;
  warheadShell.position.set(0, 0.02, -0.662);

  // Golden crown stripe around warhead shoulder
  const warheadCrown = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.0485, 0.0042, 8, 20)),
    imperialGoldMat
  );
  warheadCrown.position.set(0, 0.02, -0.737);

  // Glowing emerald piezo-detonator needle tip
  const piezoTip = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.011, 0.036, 10)),
    imperialGoldMat
  );
  piezoTip.rotation.x = -Math.PI / 2;
  piezoTip.position.set(0, 0.02, -0.885);

  // 4 Swept Dragon-Fang Stabilizer Fins (ExtrudeGeometry) around the warhead
  const finGeo = trackGeo(createDragonFinGeometry());
  const finPivot = new THREE.Group();
  finPivot.position.set(0, 0.02, -0.715);
  for (let i = 0; i < 4; i++) {
    const finHolder = new THREE.Group();
    finHolder.rotation.z = (i * Math.PI) / 2 + Math.PI / 4;
    const finMesh = new THREE.Mesh(finGeo, imperialGoldMat);
    // Align fin sweep outward (+Y) and backward (+Z)
    finMesh.rotation.y = Math.PI / 2;
    finMesh.position.set(0, 0.036, 0.02);
    finHolder.add(finMesh);
    finPivot.add(finHolder);
  }

  magGroup.add(
    neck,
    coreCollar,
    plasmaCore,
    plasmaAura,
    gyroRingOuter,
    gyroRingInner,
    warheadShell,
    warheadCrown,
    piezoTip,
    finPivot
  );
  g.add(magGroup);

  // Optional First-Person Tactical Hands (matches standard RPG grip coordinates)
  if (includeHands && gloveMat && sleeveMat) {
    g.add(
      buildSculptedTacticalHands(trackGeo, gloveMat, sleeveMat, imperialGoldMat, {
        rightPos: [0.008, -0.056, -0.22],
        leftPos: [-0.01, -0.054, -0.02],
        leftArmPos: [-0.088, -0.13, 0.12],
        leftArmRot: [Math.PI / 2 + 0.3, 0, 0.36],
      })
    );
  }

  let launchFlare01 = 0;

  const triggerLaunch = () => {
    launchFlare01 = 1.0;
  };

  const updateAnimation = (dt: number, elapsedSec: number, animated = true) => {
    const safeDt = Math.min(0.05, Math.max(0, dt));
    if (launchFlare01 > 0) {
      launchFlare01 = Math.max(0, launchFlare01 - safeDt * 2.4);
    }

    const pulse = animated ? 0.5 + 0.5 * Math.sin(elapsedSec * 4.2) : 0.5;
    emeraldPlasmaMat.emissiveIntensity = 1.55 + pulse * 0.7 + launchFlare01 * 2.1;
    afterburnerRingMat.emissiveIntensity = 1.1 + pulse * 0.45 + launchFlare01 * 3.4;
    haloAuraMat.opacity = 0.22 + pulse * 0.14 + launchFlare01 * 0.22;

    if (animated) {
      const spinSpeed = 1.6 + launchFlare01 * 4.5;
      gyroRingOuter.rotation.z += safeDt * spinSpeed;
      gyroRingOuter.rotation.x += safeDt * spinSpeed * 0.55;
      gyroRingInner.rotation.z -= safeDt * (spinSpeed * 1.45);
      gyroRingInner.rotation.y += safeDt * (spinSpeed * 0.8);
      plasmaCore.rotation.y += safeDt * 1.3;
      plasmaCore.scale.setScalar(0.95 + pulse * 0.1);
      holoReticleDot.rotation.y += safeDt * 2.0;
    }
  };

  return {
    group: g,
    mag: magGroup,
    muzzlePos: new THREE.Vector3(0, 0.02, -0.9),
    triggerLaunch,
    updateAnimation,
    dispose: () => {
      textures.dispose();
      ownedGeos.forEach((geo) => geo.dispose());
      ownedMats.forEach((mat) => mat.dispose());
    },
  };
}

// ============================================================================
// ZERO-ALLOCATION POOLED VFX: PLASMA TRAIL, NOVA EXPLOSION & KILL VORTEX
// ============================================================================

interface NovaEmberSlot {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  vel: THREE.Vector3;
  age: number;
  life: number;
  baseScale: number;
  gravity: number;
  active: boolean;
}

interface NovaRingSlot {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  age: number;
  life: number;
  maxScale: number;
  active: boolean;
}

interface NovaCoreSlot {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  age: number;
  life: number;
  maxScale: number;
  active: boolean;
}

interface NovaBeamSlot {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  age: number;
  life: number;
  active: boolean;
}

interface NovaPillarSlot {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  age: number;
  life: number;
  maxHeight: number;
  active: boolean;
}

const _trailDir = new THREE.Vector3();
const _trailMid = new THREE.Vector3();
const _trailUp = new THREE.Vector3(0, 1, 0);
const _trailRight = new THREE.Vector3();
const _trailOrtho = new THREE.Vector3();
const _trailQuat = new THREE.Quaternion();
const _spawnPos = new THREE.Vector3();

export class NovaDragonVfxPool {
  private readonly root: THREE.Group;
  private readonly emberGeo: THREE.OctahedronGeometry;
  private readonly ringGeo: THREE.RingGeometry;
  private readonly coreGeo: THREE.IcosahedronGeometry;
  private readonly beamGeo: THREE.CylinderGeometry;
  private readonly pillarGeo: THREE.CylinderGeometry;

  private readonly embers: NovaEmberSlot[] = [];
  private readonly rings: NovaRingSlot[] = [];
  private readonly cores: NovaCoreSlot[] = [];
  private readonly beams: NovaBeamSlot[] = [];
  private readonly pillars: NovaPillarSlot[] = [];

  private emberCursor = 0;
  private ringCursor = 0;
  private coreCursor = 0;
  private beamCursor = 0;
  private pillarCursor = 0;

  constructor(scene: THREE.Scene, maxEmbers = 56) {
    this.root = new THREE.Group();
    this.root.name = 'nova-dragon-vfx-pool';
    scene.add(this.root);

    this.emberGeo = new THREE.OctahedronGeometry(0.055, 0);
    this.ringGeo = new THREE.RingGeometry(0.72, 1.0, 28);
    this.coreGeo = new THREE.IcosahedronGeometry(0.45, 1);
    this.beamGeo = new THREE.CylinderGeometry(0.036, 0.075, 1, 8, 1, true);
    this.pillarGeo = new THREE.CylinderGeometry(0.18, 0.72, 1, 14, 1, true);

    for (let i = 0; i < maxEmbers; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0xfbbf24 : 0x34d399,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.emberGeo, mat);
      mesh.visible = false;
      this.root.add(mesh);
      this.embers.push({
        mesh,
        mat,
        vel: new THREE.Vector3(),
        age: 0,
        life: 0.5,
        baseScale: 1,
        gravity: 6.5,
        active: false,
      });
    }

    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x10b981 : 0xfbbf24,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.ringGeo, mat);
      mesh.visible = false;
      this.root.add(mesh);
      this.rings.push({
        mesh,
        mat,
        age: 0,
        life: 0.55,
        maxScale: 4.5,
        active: false,
      });
    }

    for (let i = 0; i < 4; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x6ee7b7,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.coreGeo, mat);
      mesh.visible = false;
      this.root.add(mesh);
      this.cores.push({
        mesh,
        mat,
        age: 0,
        life: 0.42,
        maxScale: 3.4,
        active: false,
      });
    }

    for (let i = 0; i < 4; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.beamGeo, mat);
      mesh.visible = false;
      this.root.add(mesh);
      this.beams.push({
        mesh,
        mat,
        age: 0,
        life: 0.34,
        active: false,
      });
    }

    for (let i = 0; i < 3; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.pillarGeo, mat);
      mesh.visible = false;
      this.root.add(mesh);
      this.pillars.push({
        mesh,
        mat,
        age: 0,
        life: 0.72,
        maxHeight: 4.2,
        active: false,
      });
    }
  }

  private allocEmber(
    pos: THREE.Vector3,
    vx: number,
    vy: number,
    vz: number,
    colorHex: number,
    life: number,
    scale: number,
    gravity = 6.5
  ) {
    const slot = this.embers[this.emberCursor];
    this.emberCursor = (this.emberCursor + 1) % this.embers.length;
    slot.active = true;
    slot.age = 0;
    slot.life = life;
    slot.baseScale = scale;
    slot.gravity = gravity;
    slot.vel.set(vx, vy, vz);
    slot.mat.color.setHex(colorHex);
    slot.mat.opacity = 0.96;
    slot.mesh.position.copy(pos);
    slot.mesh.scale.setScalar(scale);
    slot.mesh.visible = true;
  }

  private allocRing(
    pos: THREE.Vector3,
    rotX: number,
    rotY: number,
    rotZ: number,
    colorHex: number,
    life: number,
    maxScale: number
  ) {
    const slot = this.rings[this.ringCursor];
    this.ringCursor = (this.ringCursor + 1) % this.rings.length;
    slot.active = true;
    slot.age = 0;
    slot.life = life;
    slot.maxScale = maxScale;
    slot.mat.color.setHex(colorHex);
    slot.mat.opacity = 0.94;
    slot.mesh.position.copy(pos);
    slot.mesh.rotation.set(rotX, rotY, rotZ);
    slot.mesh.scale.setScalar(0.18);
    slot.mesh.visible = true;
  }

  public spawnRocketTrail(
    from: THREE.Vector3,
    to: THREE.Vector3,
    fxScale = 1,
    reducedMotion = false
  ): void {
    _trailDir.subVectors(to, from);
    const dist = _trailDir.length();
    if (dist < 0.15) return;
    _trailDir.divideScalar(dist);

    // Core glowing emerald plasma wake beam
    const beam = this.beams[this.beamCursor];
    this.beamCursor = (this.beamCursor + 1) % this.beams.length;
    beam.active = true;
    beam.age = 0;
    beam.life = reducedMotion ? 0.2 : 0.36;
    beam.mat.color.setHex(0x34d399);
    beam.mat.opacity = 0.82;
    _trailMid.addVectors(from, to).multiplyScalar(0.5);
    beam.mesh.position.copy(_trailMid);
    _trailQuat.setFromUnitVectors(_trailUp, _trailDir);
    beam.mesh.quaternion.copy(_trailQuat);
    const beamWidth = Math.max(0.14, fxScale);
    beam.mesh.scale.set(beamWidth, dist, beamWidth);
    beam.mesh.visible = true;

    if (reducedMotion) return;

    // Helical emerald & gold dragon-flame sparks along the flight line
    if (Math.abs(_trailDir.y) > 0.92) {
      _trailRight.set(1, 0, 0);
    } else {
      _trailRight.crossVectors(_trailDir, _trailUp).normalize();
    }
    _trailOrtho.crossVectors(_trailDir, _trailRight).normalize();

    const count = Math.max(4, Math.min(16, Math.round(dist * 0.45 * fxScale)));
    const stepSpan = Math.min(dist, 42);
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const angle = t * Math.PI * 6;
      const rad = 0.16 * fxScale;
      _spawnPos
        .copy(from)
        .addScaledVector(_trailDir, t * stepSpan)
        .addScaledVector(_trailRight, Math.cos(angle) * rad)
        .addScaledVector(_trailOrtho, Math.sin(angle) * rad);
      const color = i % 3 === 0 ? 0xfbbf24 : i % 2 === 0 ? 0x34d399 : 0xa7f3d0;
      this.allocEmber(
        _spawnPos,
        (Math.random() - 0.5) * 1.4,
        0.5 + Math.random() * 1.1,
        (Math.random() - 0.5) * 1.4,
        color,
        0.38 + Math.random() * 0.26,
        (0.75 + Math.random() * 0.55) * fxScale,
        1.2
      );
    }
  }

  public spawnNovaExplosion(
    pos: THREE.Vector3,
    fxScale = 1,
    reducedMotion = false
  ): void {
    const s = Math.max(0.08, fxScale);

    // Expanding incandescent emerald-white plasma core sphere
    const core = this.cores[this.coreCursor];
    this.coreCursor = (this.coreCursor + 1) % this.cores.length;
    core.active = true;
    core.age = 0;
    core.life = reducedMotion ? 0.25 : 0.44;
    core.maxScale = 3.6 * s;
    core.mat.color.setHex(0x6ee7b7);
    core.mat.opacity = 0.92;
    core.mesh.position.copy(pos);
    core.mesh.scale.setScalar(0.25 * s);
    core.mesh.visible = true;

    // Horizontal ground-hugging emerald shockwave ring
    this.allocRing(pos, -Math.PI / 2, 0, 0, 0x10b981, reducedMotion ? 0.3 : 0.58, 5.2 * s);
    // Cross-tilted imperial gold dragon-corona ring
    if (!reducedMotion) {
      this.allocRing(pos, 0.52, 0.35, 0.4, 0xfbbf24, 0.48, 4.1 * s);
    }

    // Outward supernova emerald & molten-gold sparks
    const count = reducedMotion ? 6 : Math.max(10, Math.round(22 * s));
    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2 + Math.random() * 0.35;
      const elev = (Math.random() - 0.15) * Math.PI * 0.65;
      const spd = (4.2 + Math.random() * 7.8) * s;
      const vx = Math.cos(theta) * Math.cos(elev) * spd;
      const vy = Math.sin(elev) * spd + 2.4 * s;
      const vz = Math.sin(theta) * Math.cos(elev) * spd;
      const color = i % 3 === 0 ? 0xfbbf24 : i % 4 === 0 ? 0xd1fae5 : 0x10b981;
      this.allocEmber(
        pos,
        vx,
        vy,
        vz,
        color,
        0.42 + Math.random() * 0.38,
        (0.95 + Math.random() * 0.9) * s,
        9.2
      );
    }
  }

  public spawnNovaKillEffect(
    pos: THREE.Vector3,
    isHeadshot = false,
    fxScale = 1,
    reducedMotion = false
  ): void {
    const s = Math.max(0.08, fxScale);

    // Rising emerald-gold Nova Dragon ascension pillar
    const pillar = this.pillars[this.pillarCursor];
    this.pillarCursor = (this.pillarCursor + 1) % this.pillars.length;
    pillar.active = true;
    pillar.age = 0;
    pillar.life = reducedMotion ? 0.36 : 0.72;
    pillar.maxHeight = (isHeadshot ? 5.2 : 4.2) * s;
    pillar.mat.color.setHex(isHeadshot ? 0xfbbf24 : 0x10b981);
    pillar.mat.opacity = 0.85;
    pillar.mesh.position.set(pos.x, pos.y + 0.15, pos.z);
    pillar.mesh.scale.set(0.35 * s, 0.2, 0.35 * s);
    pillar.mesh.visible = true;

    // Golden dragon halo shockwave ring
    this.allocRing(
      _spawnPos.set(pos.x, pos.y + 0.12, pos.z),
      -Math.PI / 2,
      0,
      0,
      0xfbbf24,
      reducedMotion ? 0.32 : 0.65,
      3.8 * s
    );

    const sparkCount = reducedMotion ? 5 : Math.max(8, Math.round(14 * s));
    for (let i = 0; i < sparkCount; i++) {
      const a = (i / sparkCount) * Math.PI * 2;
      const radSpd = (1.6 + Math.random() * 2.4) * s;
      this.allocEmber(
        _spawnPos.set(pos.x, pos.y + 0.4, pos.z),
        Math.cos(a) * radSpd,
        (3.2 + Math.random() * 3.8) * s,
        Math.sin(a) * radSpd,
        i % 2 === 0 ? 0xfbbf24 : 0x34d399,
        0.5 + Math.random() * 0.35,
        (0.85 + Math.random() * 0.65) * s,
        2.6
      );
    }
  }

  public update(dt: number): void {
    const safeDt = Math.min(0.05, Math.max(0, dt));

    for (let i = 0; i < this.embers.length; i++) {
      const e = this.embers[i];
      if (!e.active) continue;
      e.age += safeDt;
      if (e.age >= e.life) {
        e.active = false;
        e.mesh.visible = false;
        continue;
      }
      const p = e.age / e.life;
      e.vel.y -= e.gravity * safeDt;
      e.mesh.position.addScaledVector(e.vel, safeDt);
      e.mesh.rotation.x += safeDt * 7.5;
      e.mesh.rotation.y += safeDt * 9.0;
      e.mesh.scale.setScalar(e.baseScale * Math.max(0.05, 1 - p * 0.85));
      e.mat.opacity = (1 - p) * (1 - p) * 0.96;
    }

    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i];
      if (!r.active) continue;
      r.age += safeDt;
      if (r.age >= r.life) {
        r.active = false;
        r.mesh.visible = false;
        continue;
      }
      const p = r.age / r.life;
      const eased = 1 - Math.pow(1 - p, 2.5);
      r.mesh.scale.setScalar(0.18 + eased * r.maxScale);
      r.mat.opacity = Math.max(0, (1 - p) * 0.92);
    }

    for (let i = 0; i < this.cores.length; i++) {
      const c = this.cores[i];
      if (!c.active) continue;
      c.age += safeDt;
      if (c.age >= c.life) {
        c.active = false;
        c.mesh.visible = false;
        continue;
      }
      const p = c.age / c.life;
      const eased = 1 - Math.pow(1 - p, 3);
      c.mesh.scale.setScalar(0.25 + eased * c.maxScale);
      c.mesh.rotation.y += safeDt * 4.5;
      c.mat.opacity = Math.max(0, (1 - p) * (1 - p) * 0.9);
    }

    for (let i = 0; i < this.beams.length; i++) {
      const b = this.beams[i];
      if (!b.active) continue;
      b.age += safeDt;
      if (b.age >= b.life) {
        b.active = false;
        b.mesh.visible = false;
        continue;
      }
      const p = b.age / b.life;
      b.mat.opacity = Math.max(0, (1 - p) * 0.82);
    }

    for (let i = 0; i < this.pillars.length; i++) {
      const pl = this.pillars[i];
      if (!pl.active) continue;
      pl.age += safeDt;
      if (pl.age >= pl.life) {
        pl.active = false;
        pl.mesh.visible = false;
        continue;
      }
      const p = pl.age / pl.life;
      const rise = Math.min(1, p * 2.6);
      const h = pl.maxHeight * rise;
      const radius = (1 - p * 0.55) * 0.85;
      pl.mesh.scale.set(radius, Math.max(0.1, h), radius);
      pl.mesh.position.y += safeDt * 1.1;
      pl.mesh.rotation.y += safeDt * 5.2;
      pl.mat.opacity = Math.max(0, (1 - p) * 0.82);
    }
  }

  public getActiveParticleCount(): number {
    let count = 0;
    for (let i = 0; i < this.embers.length; i++) if (this.embers[i].active) count++;
    for (let i = 0; i < this.rings.length; i++) if (this.rings[i].active) count++;
    for (let i = 0; i < this.cores.length; i++) if (this.cores[i].active) count++;
    for (let i = 0; i < this.beams.length; i++) if (this.beams[i].active) count++;
    for (let i = 0; i < this.pillars.length; i++) if (this.pillars[i].active) count++;
    return count;
  }

  public clear(): void {
    for (let i = 0; i < this.embers.length; i++) {
      this.embers[i].active = false;
      this.embers[i].mesh.visible = false;
    }
    for (let i = 0; i < this.rings.length; i++) {
      this.rings[i].active = false;
      this.rings[i].mesh.visible = false;
    }
    for (let i = 0; i < this.cores.length; i++) {
      this.cores[i].active = false;
      this.cores[i].mesh.visible = false;
    }
    for (let i = 0; i < this.beams.length; i++) {
      this.beams[i].active = false;
      this.beams[i].mesh.visible = false;
    }
    for (let i = 0; i < this.pillars.length; i++) {
      this.pillars[i].active = false;
      this.pillars[i].mesh.visible = false;
    }
  }

  public dispose(): void {
    this.root.parent?.remove(this.root);
    this.emberGeo.dispose();
    this.ringGeo.dispose();
    this.coreGeo.dispose();
    this.beamGeo.dispose();
    this.pillarGeo.dispose();
    this.embers.forEach((s) => s.mat.dispose());
    this.rings.forEach((s) => s.mat.dispose());
    this.cores.forEach((s) => s.mat.dispose());
    this.beams.forEach((s) => s.mat.dispose());
    this.pillars.forEach((s) => s.mat.dispose());
  }
}
