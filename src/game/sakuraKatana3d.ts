/**
 * Legendary Katana "Sakura Moonblade" (کاتانای شکوفهٔ ماه) — High-Craft Procedural 3D Model & VFX Pool
 *
 * Original procedural Three.js weapon skin:
 * - Authentic curved Japanese sori blade built via ExtrudeGeometry with folded Damascus steel & glowing rose-gold hamon
 * - Sculpted rose-gold & obsidian lotus tsuba handguard, gold habaki collar, and diamond-wrapped silk tsuka handle
 * - Animated swinging crimson-sakura silk tassel (sageo) & gently orbiting moonlit sakura petals
 * - Zero-allocation pooled SakuraVfxPool for sweeping slash petal bursts & lunar sakura kill shockwaves
 * - Full GPU resource disposal (.dispose()) and 100% cosmetic-only (zero damage/hitbox changes)
 */

import * as THREE from 'three';
import { getCachedProceduralCanvas } from './sharedPreviewRenderer';

export interface SakuraKatanaBuildOptions {
  includeHands?: boolean;
  gloveMat?: THREE.Material;
  sleeveMat?: THREE.Material;
  maxAnisotropy?: number;
}

export interface SakuraKatanaBuildResult {
  group: THREE.Group;
  bladePivot: THREE.Group;
  muzzlePos: THREE.Vector3;
  triggerSlash: () => void;
  updateAnimation: (dt: number, elapsedSec: number, animated?: boolean) => void;
  dispose: () => void;
}

interface SakuraTextureSet {
  damascusMap: THREE.CanvasTexture;
  damascusRoughMap: THREE.CanvasTexture;
  tsukaMap: THREE.CanvasTexture;
  dispose: () => void;
}

let cachedSakuraBladeCanvases: {
  bCanvas: HTMLCanvasElement;
  rCanvas: HTMLCanvasElement;
} | null = null;

function createSakuraKatanaTextures(maxAnisotropy = 4): SakuraTextureSet {
  // 1. Folded Damascus Steel + Radiant Sakura-Rose-Gold Hamon (512x128, cached once)
  if (!cachedSakuraBladeCanvases) {
    const bCanvas = getCachedProceduralCanvas('sakura-blade-512x128', 512, 128, () => {});
    const bCtx = bCanvas.getContext('2d');

    const rCanvas = getCachedProceduralCanvas('sakura-rough-512x128', 512, 128, () => {});
    const rCtx = rCanvas.getContext('2d');

    if (bCtx && rCtx) {
      // Deep midnight folded steel gradient across blade width
      const grad = bCtx.createLinearGradient(0, 0, 0, 128);
      grad.addColorStop(0.0, '#131726');
      grad.addColorStop(0.32, '#222b42');
      grad.addColorStop(0.58, '#333f5e');
      grad.addColorStop(0.76, '#f472b6');
      grad.addColorStop(0.88, '#ffd1dc');
      grad.addColorStop(1.0, '#fff1f5');
      bCtx.fillStyle = grad;
      bCtx.fillRect(0, 0, 512, 128);

      // Roughness base: mirror-polished edge (low roughness), satin folded spine
      const rGrad = rCtx.createLinearGradient(0, 0, 0, 128);
      rGrad.addColorStop(0.0, '#424242');
      rGrad.addColorStop(0.65, '#343434');
      rGrad.addColorStop(1.0, '#181818');
      rCtx.fillStyle = rGrad;
      rCtx.fillRect(0, 0, 512, 128);

      // Rippling folded Damascus steel grain waves
      for (let layer = 0; layer < 18; layer++) {
        bCtx.beginPath();
        const baseY = 6 + layer * 4.6;
        for (let x = 0; x <= 512; x += 8) {
          const wave =
            Math.sin(x * 0.045 + layer * 0.9) * 3.5 +
            Math.cos(x * 0.11 - layer * 0.5) * 1.8;
          const y = baseY + wave;
          if (x === 0) bCtx.moveTo(x, y);
          else bCtx.lineTo(x, y);
        }
        bCtx.strokeStyle = layer % 2 === 0 ? 'rgba(203, 213, 245, 0.22)' : 'rgba(10, 14, 26, 0.34)';
        bCtx.lineWidth = 1.6;
        bCtx.stroke();

        rCtx.beginPath();
        for (let x = 0; x <= 512; x += 12) {
          const y = baseY + Math.sin(x * 0.045 + layer * 0.9) * 3.5;
          if (x === 0) rCtx.moveTo(x, y);
          else rCtx.lineTo(x, y);
        }
        rCtx.strokeStyle = layer % 2 === 0 ? 'rgba(110,110,110,0.35)' : 'rgba(25,25,25,0.35)';
        rCtx.lineWidth = 1.4;
        rCtx.stroke();
      }

      // Undulating gunome-midare sakura-gold hamon (temper line) along cutting edge
      bCtx.beginPath();
      for (let x = 0; x <= 512; x += 4) {
        const hamonY = 86 + Math.sin(x * 0.08) * 6 + Math.sin(x * 0.19) * 3.2;
        if (x === 0) bCtx.moveTo(x, hamonY);
        else bCtx.lineTo(x, hamonY);
      }
      bCtx.strokeStyle = 'rgba(255, 224, 236, 0.92)';
      bCtx.lineWidth = 3.2;
      bCtx.stroke();

      // Subtle engraved gold-sakura crescent runes along the mid-spine
      bCtx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
      bCtx.lineWidth = 1.2;
      for (let x = 36; x < 460; x += 44) {
        bCtx.beginPath();
        bCtx.arc(x, 38, 7, 0.3, Math.PI * 1.45);
        bCtx.stroke();
      }
    }
    cachedSakuraBladeCanvases = { bCanvas, rCanvas };
  }

  const { bCanvas, rCanvas } = cachedSakuraBladeCanvases;

  const damascusMap = new THREE.CanvasTexture(bCanvas);
  damascusMap.colorSpace = THREE.SRGBColorSpace;
  damascusMap.anisotropy = Math.min(8, maxAnisotropy);
  damascusMap.needsUpdate = true;

  const damascusRoughMap = new THREE.CanvasTexture(rCanvas);
  damascusRoughMap.anisotropy = Math.min(8, maxAnisotropy);
  damascusRoughMap.needsUpdate = true;

  // 2. Authentic Diamond Tsuka-Ito Silk Wrap over Pearl Samegawa Rayskin (256x256, cached once)
  const tCanvas = getCachedProceduralCanvas('sakura-tsuka-256x256', 256, 256, (tCtx) => {
      // Midnight silk base
      tCtx.fillStyle = '#151022';
      tCtx.fillRect(0, 0, 256, 256);

      // Pearl-white samegawa rayskin diamonds peeking through
      const stepY = 32;
      for (let y = 0; y < 256; y += stepY) {
        for (let x = 0; x < 256; x += 64) {
          const cx = x + 32;
          const cy = y + stepY * 0.5;
          tCtx.beginPath();
          tCtx.moveTo(cx, cy - 11);
          tCtx.lineTo(cx + 15, cy);
          tCtx.lineTo(cx, cy + 11);
          tCtx.lineTo(cx - 15, cy);
          tCtx.closePath();
          tCtx.fillStyle = '#f8e6ee';
          tCtx.fill();
          tCtx.strokeStyle = '#f472b6';
          tCtx.lineWidth = 2;
          tCtx.stroke();
        }
      }

      // Crisscrossing dark crimson-indigo silk ito ribbons with rose-gold stitching
      tCtx.strokeStyle = '#2d1638';
      tCtx.lineWidth = 9;
      for (let y = -64; y < 320; y += stepY) {
        tCtx.beginPath();
        tCtx.moveTo(0, y);
        tCtx.lineTo(256, y + 64);
        tCtx.stroke();
        tCtx.beginPath();
        tCtx.moveTo(256, y);
        tCtx.lineTo(0, y + 64);
        tCtx.stroke();
      }
      tCtx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
      tCtx.lineWidth = 1.4;
      for (let y = -64; y < 320; y += stepY) {
        tCtx.beginPath();
        tCtx.moveTo(0, y);
        tCtx.lineTo(256, y + 64);
        tCtx.stroke();
    }
  });

  const tsukaMap = new THREE.CanvasTexture(tCanvas);
  tsukaMap.colorSpace = THREE.SRGBColorSpace;
  tsukaMap.wrapS = THREE.RepeatWrapping;
  tsukaMap.wrapT = THREE.RepeatWrapping;
  tsukaMap.repeat.set(1, 3);
  tsukaMap.anisotropy = Math.min(8, maxAnisotropy);
  tsukaMap.needsUpdate = true;

  return {
    damascusMap,
    damascusRoughMap,
    tsukaMap,
    dispose: () => {
      damascusMap.dispose();
      damascusRoughMap.dispose();
      tsukaMap.dispose();
    },
  };
}

/** Creates a curved Japanese katana blade profile in the Y-Z plane (extruded along X for thinness). */
function createCurvedBladeGeometry(): THREE.ExtrudeGeometry {
  // Authentic Japanese katana (uchigatana) profile with unmistakable sori curve & kissaki point
  const shape = new THREE.Shape();
  shape.moveTo(0.0, -0.021); // ha (cutting edge) at habaki
  shape.lineTo(0.0, 0.021); // mune (spine) at habaki
  // Graceful sori spine curve sweeping gently back
  shape.quadraticCurveTo(0.36, 0.032, 0.652, 0.068);
  // Crisp kissaki (katana tip) meeting the razor edge
  shape.lineTo(0.715, 0.036);
  // Razor curved cutting edge (ha) sweeping smoothly back to base
  shape.quadraticCurveTo(0.36, -0.004, 0.0, -0.021);
  shape.closePath();

  const cleanGeo = new THREE.ExtrudeGeometry(shape, {
    steps: 1,
    depth: 0.0054,
    bevelEnabled: true,
    bevelThickness: 0.0028,
    bevelSize: 0.0022,
    bevelSegments: 2,
  });
  cleanGeo.translate(0, 0, -0.0027);

  // Normalize UVs BEFORE axis transform so the full Damascus + Sakura Hamon texture spans the blade
  const posAttr = cleanGeo.attributes.position;
  const uvAttr = cleanGeo.attributes.uv;
  for (let i = 0; i < posAttr.count; i++) {
    const sx = posAttr.getX(i);
    const sy = posAttr.getY(i);
    const u = Math.max(0, Math.min(1, sx / 0.715));
    const spineY = 0.021 * (1 - u) * (1 - u) + 2 * 0.032 * u * (1 - u) + 0.068 * u * u;
    const edgeY = -0.021 * (1 - u) * (1 - u) + 2 * -0.004 * u * (1 - u) + 0.036 * u * u;
    const span = Math.max(0.012, spineY - edgeY);
    const vFromSpine = Math.max(0, Math.min(1, (spineY - sy) / span));
    // Canvas y=0 (top=spine) maps to UV v=1 in Three.js, Canvas y=128 (bottom=glowing hamon edge) maps to UV v=0
    uvAttr.setXY(i, u, 1.0 - vFromSpine);
  }
  uvAttr.needsUpdate = true;

  // Map shape.x -> +Y (0.042..0.757), shape.y -> +Z (cutting edge at -Z, sori curve toward +Z), extrude.z -> X (thickness)
  const m = new THREE.Matrix4().set(
    0, 0, 1, 0,
    1, 0, 0, 0.042,
    0, 1, 0, 0,
    0, 0, 0, 1
  );
  cleanGeo.applyMatrix4(m);
  cleanGeo.computeVertexNormals();
  return cleanGeo;
}

/** Creates a luminous razor sakura-plasma cutting edge strip tracing the exact curved ha edge. */
function createGlowingEdgeGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0.006, -0.0165);
  shape.quadraticCurveTo(0.36, 0.0005, 0.716, 0.037);
  shape.lineTo(0.711, 0.031);
  shape.quadraticCurveTo(0.36, -0.0085, 0.006, -0.0245);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    steps: 1,
    depth: 0.0042,
    bevelEnabled: false,
  });
  geo.translate(0, 0, -0.0021);
  const m = new THREE.Matrix4().set(
    0, 0, 1, 0,
    1, 0, 0, 0.042,
    0, 1, 0, 0,
    0, 0, 0, 1
  );
  geo.applyMatrix4(m);
  geo.computeVertexNormals();
  return geo;
}

/** Creates a curved cherry-blossom petal shape geometry. */
function createSakuraPetalGeometry(): THREE.ShapeGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, -0.01);
  s.bezierCurveTo(0.01, -0.004, 0.011, 0.009, 0.003, 0.013);
  s.lineTo(0, 0.009); // signature sakura notch at petal tip
  s.lineTo(-0.003, 0.013);
  s.bezierCurveTo(-0.011, 0.009, -0.01, -0.004, 0, -0.01);
  return new THREE.ShapeGeometry(s, 6);
}

/**
 * Builds the Legendary Katana "Sakura Moonblade" 3D model.
 */
export function buildSakuraKatana3D(
  options: SakuraKatanaBuildOptions = {}
): SakuraKatanaBuildResult {
  const { includeHands = true, maxAnisotropy = 4 } = options;
  const ownedGeos: THREE.BufferGeometry[] = [];
  const ownedMats: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    ownedGeos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    ownedMats.push(m);
    return m;
  };

  const textures = createSakuraKatanaTextures(maxAnisotropy);

  // PBR Materials with rich metallic/roughness contrast
  const damascusMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.damascusMap,
      roughnessMap: textures.damascusRoughMap,
      color: 0xf4f6ff,
      metalness: 0.86,
      roughness: 0.19,
      emissive: 0x5c1744,
      emissiveIntensity: 0.36,
    })
  );

  const sakuraEdgeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffe4f2,
      emissive: 0xff3d8e,
      emissiveIntensity: 2.35,
      roughness: 0.1,
      metalness: 0.2,
    })
  );

  const roseGoldMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf4b678,
      metalness: 0.92,
      roughness: 0.2,
      emissive: 0x5c2414,
      emissiveIntensity: 0.22,
    })
  );

  const obsidianMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x12131d,
      metalness: 0.62,
      roughness: 0.42,
    })
  );

  const tsukaMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.tsukaMap,
      color: 0xffffff,
      metalness: 0.14,
      roughness: 0.78,
    })
  );

  const moonlightRuneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0x38e8ff,
      emissiveIntensity: 1.65,
      roughness: 0.2,
      metalness: 0.2,
    })
  );

  const tasselMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf43f7e,
      emissive: 0x9f1239,
      emissiveIntensity: 0.55,
      roughness: 0.58,
      metalness: 0.1,
    })
  );

  const petalMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xff85bd,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );

  const root = new THREE.Group();
  const pivot = new THREE.Group();

  // 1. Primary Silhouette: Curved Folded Damascus Blade + Radiant Sakura-Plasma Edge
  const bladeMesh = new THREE.Mesh(trackGeo(createCurvedBladeGeometry()), damascusMat);
  const edgeMesh = new THREE.Mesh(trackGeo(createGlowingEdgeGeometry()), sakuraEdgeMat);
  pivot.add(bladeMesh, edgeMesh);

  // Engraved Moonlight Blood-Groove (Bo-Hi) filigree dots along both faces of the blade
  const runeGeo = trackGeo(new THREE.BoxGeometry(0.0112, 0.022, 0.0054));
  for (let i = 0; i < 6; i++) {
    const t = (i + 1) / 7;
    const y = 0.095 + t * 0.5;
    const zCurve = 0.004 + t * t * 0.036;
    const rune = new THREE.Mesh(runeGeo, i % 2 === 0 ? moonlightRuneMat : sakuraEdgeMat);
    rune.position.set(0, y, zCurve);
    rune.rotation.x = -0.075 * t;
    pivot.add(rune);
  }

  // 2. Sculpted Rose-Gold Habaki (Blade Collar) + Twin Seppa Washers
  const habaki = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.0155, 0.036, 0.044)), roseGoldMat);
  habaki.position.set(0, 0.048, 0);
  const habakiBand = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.017, 0.008, 0.046)), sakuraEdgeMat);
  habakiBand.position.set(0, 0.056, 0);
  const seppaTop = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.026, 0.026, 0.004, 16)), roseGoldMat);
  seppaTop.position.set(0, 0.029, 0);
  const seppaBot = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.026, 0.026, 0.004, 16)), roseGoldMat);
  seppaBot.position.set(0, 0.017, 0);
  pivot.add(habaki, habakiBand, seppaTop, seppaBot);

  // 3. Sculpted Rose-Gold & Obsidian Lotus Tsuba (Handguard)
  const tsubaGroup = new THREE.Group();
  tsubaGroup.position.set(0, 0.023, 0);
  const tsubaCore = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.044, 0.044, 0.0075, 8)),
    obsidianMat
  );
  const tsubaOuterRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.046, 0.0048, 8, 24)),
    roseGoldMat
  );
  tsubaOuterRing.rotation.x = Math.PI / 2;
  const tsubaGlowRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.033, 0.0022, 6, 20)),
    sakuraEdgeMat
  );
  tsubaGlowRing.rotation.x = Math.PI / 2;
  tsubaGroup.add(tsubaCore, tsubaOuterRing, tsubaGlowRing);

  // 4 sculpted rose-gold lotus petals + crescent moon crest radiating around the tsuba rim
  const petalReliefGeo = trackGeo(new THREE.BoxGeometry(0.02, 0.012, 0.02));
  for (let i = 0; i < 4; i++) {
    const ang = (i * Math.PI) / 2 + Math.PI / 4;
    const p = new THREE.Mesh(petalReliefGeo, roseGoldMat);
    p.position.set(Math.cos(ang) * 0.037, 0, Math.sin(ang) * 0.037);
    p.rotation.y = ang;
    tsubaGroup.add(p);
  }
  const moonCrest = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.022, 0.0034, 8, 18, Math.PI * 1.35)),
    moonlightRuneMat
  );
  moonCrest.rotation.x = Math.PI / 2;
  moonCrest.position.set(0, 0.0048, -0.012);
  tsubaGroup.add(moonCrest);
  pivot.add(tsubaGroup);

  // 4. Diamond Silk-Wrapped Tsuka Handle + Rose-Gold Fuchi/Kashira + Menuki Ornaments
  const fuchi = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.019, 0.02, 0.018, 12)), roseGoldMat);
  fuchi.scale.set(0.84, 1, 1.12);
  fuchi.position.set(0, 0.006, 0);

  const handle = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.018, 0.019, 0.225, 12)), tsukaMat);
  handle.scale.set(0.82, 1, 1.15);
  handle.position.set(0, -0.105, 0);

  // Raised rose-gold menuki lotus ornaments on sides of grip
  const menukiGeo = trackGeo(new THREE.OctahedronGeometry(0.0075, 0));
  const menukiR = new THREE.Mesh(menukiGeo, roseGoldMat);
  menukiR.scale.set(0.5, 1.35, 0.9);
  menukiR.position.set(0.016, -0.068, 0);
  const menukiL = new THREE.Mesh(menukiGeo, roseGoldMat);
  menukiL.scale.set(0.5, 1.35, 0.9);
  menukiL.position.set(-0.016, -0.132, 0);

  const kashira = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.02, 0.017, 0.024, 12)), roseGoldMat);
  kashira.scale.set(0.84, 1, 1.16);
  kashira.position.set(0, -0.224, 0);
  const pommelGem = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.009, 0)), sakuraEdgeMat);
  pommelGem.position.set(0, -0.238, 0);
  const pommelRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.013, 0.0024, 6, 14)), roseGoldMat);
  pommelRing.position.set(0, -0.242, 0.01);
  pivot.add(fuchi, handle, menukiR, menukiL, kashira, pommelGem, pommelRing);

  // 5. Animated Crimson-Sakura Silk Tassel (Sageo) hanging from pommel ring
  const tasselPivot = new THREE.Group();
  tasselPivot.position.set(0, -0.246, 0.014);
  const tasselCord = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0028, 0.0032, 0.055, 6)), roseGoldMat);
  tasselCord.position.set(0, -0.028, 0);
  const tasselKnot = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.008, 8, 8)), roseGoldMat);
  tasselKnot.position.set(0, -0.056, 0);
  const tasselSkirt = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.013, 0.068, 8)), tasselMat);
  tasselSkirt.position.set(0, -0.094, 0);
  tasselPivot.add(tasselCord, tasselKnot, tasselSkirt);
  pivot.add(tasselPivot);

  // 6. Lightweight Orbiting Moonlit Sakura Petals Aura (6 petals, zero per-frame allocations)
  const petalGeo = trackGeo(createSakuraPetalGeometry());
  const auraPetals: Array<{
    mesh: THREE.Mesh;
    angleOffset: number;
    heightFrac: number;
    radius: number;
    speed: number;
  }> = [];
  for (let i = 0; i < 6; i++) {
    const pm = new THREE.Mesh(petalGeo, petalMat);
    pm.scale.setScalar(0.85 + (i % 3) * 0.22);
    pivot.add(pm);
    auraPetals.push({
      mesh: pm,
      angleOffset: (i / 6) * Math.PI * 2,
      heightFrac: 0.14 + (i / 6) * 0.52,
      radius: 0.036 + (i % 2) * 0.016,
      speed: 1.55 + (i % 3) * 0.35,
    });
  }

  // 7. Optional Sculpted Samurai-Tactical Right Hand gripping the Tsuka (hidden in studio preview)
  if (includeHands) {
    const handGlove =
      options.gloveMat ??
      trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x1b1e28,
          roughness: 0.82,
          metalness: 0.1,
        })
      );
    const handSleeve =
      options.sleeveMat ??
      trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x262d3d,
          roughness: 0.88,
          metalness: 0.05,
        })
      );
    const handGroup = new THREE.Group();
    handGroup.position.set(0.006, -0.088, 0.008);

    const palm = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.048, 0.068, 0.056)), handGlove);
    const fingers = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.046, 0.058, 0.026)), handGlove);
    fingers.position.set(-0.014, 0.002, -0.028);
    const thumb = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.022, 0.02, 0.036)), handGlove);
    thumb.position.set(-0.016, 0.032, -0.006);
    thumb.rotation.x = 0.28;
    // Rose-gold armored knuckle plate
    const knuckle = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.052, 0.016, 0.034)), roseGoldMat);
    knuckle.position.set(0.004, 0.02, -0.018);
    // Wrist cuff & angled forearm sleeve
    const cuff = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.03, 0.032, 0.032, 10)), obsidianMat);
    cuff.position.set(0.014, -0.052, 0.022);
    cuff.rotation.set(0.38, 0, -0.2);
    const forearm = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.033, 0.042, 0.24, 10)), handSleeve);
    forearm.position.set(0.044, -0.155, 0.082);
    forearm.rotation.set(0.42, 0, -0.22);

    handGroup.add(palm, fingers, thumb, knuckle, cuff, forearm);
    pivot.add(handGroup);
  }

  pivot.rotation.set(-0.48, 0.25, 0.32);
  root.add(pivot);

  let slashSurge = 0;

  return {
    group: root,
    bladePivot: pivot,
    muzzlePos: new THREE.Vector3(0, 0.14, -0.45),
    triggerSlash: () => {
      slashSurge = 1.0;
    },
    updateAnimation: (dt: number, elapsedSec: number, animated = true) => {
      if (slashSurge > 0) {
        slashSurge = Math.max(0, slashSurge - dt * 2.8);
      }
      const pulse = animated ? 0.5 + 0.5 * Math.sin(elapsedSec * 3.6) : 0.5;
      sakuraEdgeMat.emissiveIntensity = 1.85 + pulse * 0.75 + slashSurge * 2.4;
      moonlightRuneMat.emissiveIntensity = 1.3 + (1 - pulse) * 0.65 + slashSurge * 1.4;
      damascusMat.emissiveIntensity = 0.22 + pulse * 0.14 + slashSurge * 0.38;

      // Gentle silk tassel physics sway
      if (animated) {
        tasselPivot.rotation.z = Math.sin(elapsedSec * 2.8) * 0.14 + slashSurge * 0.45;
        tasselPivot.rotation.x = 0.18 + Math.cos(elapsedSec * 2.1) * 0.09 + slashSurge * 0.32;
      } else {
        tasselPivot.rotation.set(0.18, 0, 0);
      }

      // Gently drifting orbiting sakura petals along the blade
      for (let i = 0; i < auraPetals.length; i++) {
        const p = auraPetals[i];
        p.mesh.visible = animated;
        if (!animated) continue;
        const a = elapsedSec * p.speed + p.angleOffset;
        const r = p.radius + slashSurge * 0.045;
        const ySlide = ((p.heightFrac + elapsedSec * 0.085) % 0.56) + 0.1;
        const zCurve = ySlide * ySlide * 0.032;
        p.mesh.position.set(Math.cos(a) * r, ySlide, zCurve + Math.sin(a) * r * 0.85);
        p.mesh.rotation.set(a * 1.3, a * 0.9, Math.sin(a) * 0.8);
      }
    },
    dispose: () => {
      textures.dispose();
      ownedGeos.forEach((g) => g.dispose());
      ownedMats.forEach((m) => m.dispose());
    },
  };
}

// ---------------------------------------------------------------------------
// POOLED SAKURA MOONBLADE VFX (Slash Petals + Lunar Sakura Kill Shockwave)
// ---------------------------------------------------------------------------

interface SakuraPetalParticle {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Euler;
  rotVel: THREE.Vector3;
  scale: number;
  life: number;
  maxLife: number;
}

interface SakuraRingSlot {
  active: boolean;
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  life: number;
  maxLife: number;
  maxScale: number;
}

export class SakuraVfxPool {
  private readonly scene: THREE.Scene;
  private readonly maxPetals: number;
  private readonly petalGeo: THREE.ShapeGeometry;
  private readonly petalMat: THREE.MeshBasicMaterial;
  private readonly petalInst: THREE.InstancedMesh;
  private readonly petals: SakuraPetalParticle[] = [];
  private petalCursor = 0;

  private readonly ringGeo: THREE.RingGeometry;
  private readonly rings: SakuraRingSlot[] = [];
  private ringCursor = 0;

  private readonly dummy = new THREE.Object3D();
  private readonly zeroMat = new THREE.Matrix4().makeScale(0, 0, 0);

  constructor(scene: THREE.Scene, maxPetals = 48) {
    this.scene = scene;
    this.maxPetals = Math.max(12, Math.min(64, maxPetals));

    this.petalGeo = createSakuraPetalGeometry();
    this.petalMat = new THREE.MeshBasicMaterial({
      color: 0xff7eb6,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.petalInst = new THREE.InstancedMesh(this.petalGeo, this.petalMat, this.maxPetals);
    this.petalInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.petalInst.frustumCulled = false;

    const palette = [0xff4d94, 0xff9ec7, 0xfef3c7, 0xf43f5e, 0x38e8ff];
    const tmpCol = new THREE.Color();
    for (let i = 0; i < this.maxPetals; i++) {
      this.petalInst.setMatrixAt(i, this.zeroMat);
      tmpCol.setHex(palette[i % palette.length]);
      this.petalInst.setColorAt(i, tmpCol);
      this.petals.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        rot: new THREE.Euler(),
        rotVel: new THREE.Vector3(),
        scale: 1,
        life: 0,
        maxLife: 0.6,
      });
    }
    this.petalInst.instanceMatrix.needsUpdate = true;
    if (this.petalInst.instanceColor) this.petalInst.instanceColor.needsUpdate = true;
    this.petalInst.visible = false;
    this.scene.add(this.petalInst);

    // Expanding Lunar-Sakura shockwave rings for Kill FX
    this.ringGeo = new THREE.RingGeometry(0.24, 0.36, 28);
    for (let i = 0; i < 6; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xff4d94 : 0xfef08a,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.ringGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.rings.push({ active: false, mesh, mat, life: 0, maxLife: 0.45, maxScale: 3.4 });
    }
  }

  public getActiveParticleCount(): number {
    let n = 0;
    for (let i = 0; i < this.petals.length; i++) {
      if (this.petals[i].active) n++;
    }
    for (let i = 0; i < this.rings.length; i++) {
      if (this.rings[i].active) n++;
    }
    return n;
  }

  public spawnSlashPetals(
    origin: THREE.Vector3,
    forward: THREE.Vector3,
    scale = 1.0,
    disabled = false
  ): void {
    if (disabled || scale <= 0) return;
    const count = Math.max(4, Math.min(12, Math.round(9 * scale)));
    for (let i = 0; i < count; i++) {
      const slot = this.petals[this.petalCursor % this.maxPetals];
      this.petalCursor = (this.petalCursor + 1) % this.maxPetals;
      slot.active = true;
      slot.pos.copy(origin).addScaledVector(forward, 0.6 + Math.random() * 0.8);
      slot.pos.x += (Math.random() - 0.5) * 0.55;
      slot.pos.y += (Math.random() - 0.5) * 0.35;
      slot.pos.z += (Math.random() - 0.5) * 0.55;
      slot.vel.copy(forward).multiplyScalar(1.4 + Math.random() * 2.2);
      slot.vel.x += (Math.random() - 0.5) * 2.6;
      slot.vel.y += 0.45 + Math.random() * 1.4;
      slot.vel.z += (Math.random() - 0.5) * 2.6;
      slot.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      slot.rotVel.set(
        (Math.random() - 0.5) * 9,
        (Math.random() - 0.5) * 9,
        (Math.random() - 0.5) * 9
      );
      slot.scale = (1.6 + Math.random() * 1.4) * Math.max(0.7, scale);
      slot.maxLife = 0.45 + Math.random() * 0.35;
      slot.life = slot.maxLife;
    }
    this.petalInst.visible = true;
  }

  public spawnKillBurst(
    pos: THREE.Vector3,
    isCrit = false,
    scale = 1.0,
    disabled = false
  ): void {
    if (disabled || scale <= 0) return;
    // Dual lunar rings (horizontal sakura bloom + angled moonlit gold crescent)
    for (let k = 0; k < 2; k++) {
      const r = this.rings[this.ringCursor % this.rings.length];
      this.ringCursor = (this.ringCursor + 1) % this.rings.length;
      r.active = true;
      r.mesh.position.copy(pos);
      r.mesh.position.y += k === 0 ? 0.08 : 0.22;
      r.mesh.rotation.set(k === 0 ? -Math.PI / 2 : -Math.PI / 2 + 0.55, 0, k * 0.7);
      r.mesh.scale.setScalar(0.35);
      r.mat.color.setHex(k === 0 ? 0xff4d94 : isCrit ? 0xfef08a : 0x38e8ff);
      r.mat.opacity = 0.92;
      r.maxLife = isCrit ? 0.55 : 0.44;
      r.life = r.maxLife;
      r.maxScale = (isCrit ? 4.4 : 3.4) * Math.max(0.7, scale);
      r.mesh.visible = true;
    }

    // Swirling cherry blossom vortex burst
    const count = Math.max(8, Math.min(22, Math.round((isCrit ? 20 : 15) * scale)));
    for (let i = 0; i < count; i++) {
      const slot = this.petals[this.petalCursor % this.maxPetals];
      this.petalCursor = (this.petalCursor + 1) % this.maxPetals;
      const ang = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const spd = 1.6 + Math.random() * 2.8;
      slot.active = true;
      slot.pos.copy(pos);
      slot.pos.y += (Math.random() - 0.3) * 0.45;
      slot.vel.set(Math.cos(ang) * spd, 1.4 + Math.random() * 2.8, Math.sin(ang) * spd);
      slot.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      slot.rotVel.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      );
      slot.scale = (2.0 + Math.random() * 1.9) * Math.max(0.75, scale);
      slot.maxLife = 0.65 + Math.random() * 0.45;
      slot.life = slot.maxLife;
    }
    this.petalInst.visible = true;
  }

  public update(dt: number): void {
    let anyPetal = false;
    let dirty = false;
    for (let i = 0; i < this.petals.length; i++) {
      const p = this.petals[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        this.petalInst.setMatrixAt(i, this.zeroMat);
        dirty = true;
        continue;
      }
      anyPetal = true;
      dirty = true;
      // Air drag + soft floating flutter gravity
      p.vel.multiplyScalar(Math.exp(-2.2 * dt));
      p.vel.y -= 1.85 * dt;
      p.pos.addScaledVector(p.vel, dt);
      p.rot.x += p.rotVel.x * dt;
      p.rot.y += p.rotVel.y * dt;
      p.rot.z += p.rotVel.z * dt;
      const fade = Math.min(1, p.life / (p.maxLife * 0.35));
      this.dummy.position.copy(p.pos);
      this.dummy.rotation.copy(p.rot);
      this.dummy.scale.setScalar(p.scale * fade);
      this.dummy.updateMatrix();
      this.petalInst.setMatrixAt(i, this.dummy.matrix);
    }
    if (dirty) this.petalInst.instanceMatrix.needsUpdate = true;
    this.petalInst.visible = anyPetal;

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
      const eased = 1 - Math.pow(1 - prog, 3);
      r.mesh.scale.setScalar(0.35 + eased * r.maxScale);
      r.mat.opacity = (1 - prog) * 0.88;
    }
  }

  public clear(): void {
    for (let i = 0; i < this.petals.length; i++) {
      this.petals[i].active = false;
      this.petalInst.setMatrixAt(i, this.zeroMat);
    }
    this.petalInst.instanceMatrix.needsUpdate = true;
    this.petalInst.visible = false;
    for (let i = 0; i < this.rings.length; i++) {
      this.rings[i].active = false;
      this.rings[i].mesh.visible = false;
    }
  }

  public dispose(): void {
    this.scene.remove(this.petalInst);
    this.petalGeo.dispose();
    this.petalMat.dispose();
    for (let i = 0; i < this.rings.length; i++) {
      this.scene.remove(this.rings[i].mesh);
      this.rings[i].mat.dispose();
    }
    this.ringGeo.dispose();
  }
}
