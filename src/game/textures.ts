import * as THREE from 'three';

/**
 * Shared procedural texture cache + compact mobile-friendly mipmapped textures.
 * Cutting ground textures from 512x512 (4x pixels & ~7000 fillRects each) to
 * crisp 256x256 with proper mipmaps cuts startup CPU stalls and GPU VRAM by ~75%
 * while keeping the exact visual look.
 */
const sharedTextureCache = new Map<string, THREE.CanvasTexture>();

function configureColorTexture(tex: THREE.CanvasTexture, maxAnisotropy = 4): THREE.CanvasTexture {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = Math.min(4, Math.max(1, maxAnisotropy));
  return tex;
}

function getOrCreateCachedTexture(
  key: string,
  factory: () => THREE.CanvasTexture
): THREE.CanvasTexture {
  const existing = sharedTextureCache.get(key);
  if (existing) return existing;
  const created = factory();
  sharedTextureCache.set(key, created);
  return created;
}

export function disposeSharedProceduralTextures(): void {
  sharedTextureCache.forEach((tex) => {
    try {
      tex.dispose();
    } catch {
      // ignore
    }
  });
  sharedTextureCache.clear();
}

export function makeConcreteTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  return getOrCreateCachedTexture('concrete', () => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#33363b';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 22; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(15,17,20,0.18)' : 'rgba(90,94,100,0.12)';
      ctx.beginPath();
      ctx.arc(Math.random() * 256, Math.random() * 256, 12 + Math.random() * 32, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 1600; i++) {
      const v = 32 + Math.floor(Math.random() * 34);
      ctx.fillStyle = `rgb(${v},${v + 1},${v + 2})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    ctx.strokeStyle = 'rgba(12, 13, 15, 0.72)';
    ctx.lineWidth = 2;
    for (let p = 0; p <= 256; p += 64) {
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(256, p);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(14, 14);
    return configureColorTexture(tex, maxAnisotropy);
  });
}

export function makeAsphaltTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  return getOrCreateCachedTexture('asphalt', () => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#181e29';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2000; i++) {
      const v = 18 + Math.floor(Math.random() * 26);
      ctx.fillStyle = `rgb(${v},${v + 4},${v + 10})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.ellipse(Math.random() * 256, Math.random() * 256, 24, 12, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.52)';
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 10]);
    ctx.strokeRect(12, 12, 232, 232);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(12, 12);
    return configureColorTexture(tex, maxAnisotropy);
  });
}

export function makeSandstoneTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  return getOrCreateCachedTexture('sandstone', () => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#7c5d3f';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(92, 64, 38, 0.25)' : 'rgba(168, 132, 92, 0.2)';
      ctx.beginPath();
      ctx.ellipse(Math.random() * 256, Math.random() * 256, 34, 14, Math.random() * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 1800; i++) {
      const r = 105 + Math.floor(Math.random() * 45);
      const g = 78 + Math.floor(Math.random() * 35);
      const b = 50 + Math.floor(Math.random() * 25);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(14, 14);
    return configureColorTexture(tex, maxAnisotropy);
  });
}

export function makeCrateTexture(baseHex: string, stripeHex: string, maxAnisotropy = 4): THREE.CanvasTexture {
  return getOrCreateCachedTexture(`crate:${baseHex}:${stripeHex}`, () => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 450; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.04)';
      ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 9;
    ctx.strokeRect(4.5, 4.5, 119, 119);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let y = 17; y < 110; y += 11) ctx.fillRect(12, y, 104, 4);
    ctx.fillStyle = stripeHex;
    ctx.fillRect(12, 57, 104, 11);
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.font = 'bold 7px monospace';
    ctx.fillText('UNIT-04 · CARGO', 22, 65);
    const tex = new THREE.CanvasTexture(c);
    return configureColorTexture(tex, maxAnisotropy);
  });
}

export function makeWallTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  return getOrCreateCachedTexture('wall', () => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#3b3e42';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 700; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.08)';
      ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 1;
    for (let y = 0; y < 128; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(128, y);
      ctx.stroke();
    }
    ctx.fillStyle = '#222428';
    ctx.fillRect(0, 102, 128, 26);
    ctx.fillStyle = '#b57b10';
    for (let x = -16; x < 140; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 105);
      ctx.lineTo(x + 7, 105);
      ctx.lineTo(x + 2, 113);
      ctx.lineTo(x - 5, 113);
      ctx.closePath();
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return configureColorTexture(tex, maxAnisotropy);
  });
}

export function makeWoodTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  return getOrCreateCachedTexture('wood', () => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#683619';
    ctx.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 3) {
      ctx.fillStyle = y % 6 === 0 ? 'rgba(30,10,2,0.32)' : 'rgba(170,95,40,0.14)';
      ctx.fillRect(0, y, 128, 2);
    }
    const tex = new THREE.CanvasTexture(c);
    return configureColorTexture(tex, maxAnisotropy);
  });
}

export function makeFlashTexture(): THREE.CanvasTexture {
  return getOrCreateCachedTexture('flash', () => {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(32, 32, 1, 32, 32, 31);
    g.addColorStop(0, 'rgba(255, 255, 235, 1)');
    g.addColorStop(0.28, 'rgba(255, 195, 70, 0.92)');
    g.addColorStop(0.65, 'rgba(255, 100, 15, 0.32)');
    g.addColorStop(1, 'rgba(255, 80, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  });
}

export function makeRedactedFaceTexture(tintColor: string): THREE.CanvasTexture {
  return getOrCreateCachedTexture(`face:${tintColor}`, () => {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const ctx = c.getContext('2d')!;
    const cols = ['#1a1c20', '#2b2f36', '#4a4e56', '#72767e', '#111215', tintColor];
    for (let y = 0; y < 32; y += 4) {
      for (let x = 0; x < 32; x += 4) {
        ctx.fillStyle = cols[Math.floor(Math.random() * cols.length)];
        ctx.fillRect(x, y, 4, 4);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  });
}

export interface NameplateCosmeticStyle {
  frameColorHex?: string;
  frameBgHex?: string;
  badgeSymbol?: string;
  badgeColorHex?: string;
}

export function makeNameplateTexture(
  callsign: string,
  accentHex = '#00f0ff',
  isSpeaking = false,
  cosmetic?: NameplateCosmeticStyle
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 48;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 48);

  const borderColor = isSpeaking
    ? '#10b981'
    : (cosmetic?.frameColorHex || accentHex);
  const bgColor = isSpeaking
    ? 'rgba(6, 26, 20, 0.92)'
    : (cosmetic?.frameBgHex || 'rgba(6, 12, 22, 0.88)');

  ctx.fillStyle = bgColor;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = isSpeaking ? 2.5 : cosmetic?.frameColorHex ? 2.4 : 2;
  ctx.beginPath();
  ctx.roundRect(5, 6, 246, 36, 8);
  ctx.fill();
  ctx.stroke();

  if (cosmetic?.frameColorHex && !isSpeaking) {
    // Subtle corner accent ticks for equipped frames
    ctx.strokeStyle = cosmetic.frameColorHex;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(9, 10, 238, 28, 5);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  const badgeSym = cosmetic?.badgeSymbol?.trim() || '';
  const hasBadge = badgeSym.length > 0;
  const label = (callsign || 'OPERATOR').trim().slice(0, 22);
  const maxTextW = (isSpeaking ? 192 : 220) - (hasBadge ? 22 : 0);
  let fontSize = 15;
  ctx.font = `800 ${fontSize}px Tahoma, monospace`;
  while (fontSize > 9 && ctx.measureText(label).width > maxTextW) {
    fontSize -= 1;
    ctx.font = `800 ${fontSize}px Tahoma, monospace`;
  }

  if (hasBadge) {
    ctx.fillStyle = cosmetic?.badgeColorHex || '#fbbf24';
    ctx.font = '800 15px Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeSym, 24, 24.5);
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${fontSize}px Tahoma, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const centerX = isSpeaking ? (hasBadge ? 124 : 118) : (hasBadge ? 136 : 128);
  ctx.fillText(label, centerX, 25, maxTextW + 4);

  if (isSpeaking) {
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(231, 24, 8.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#041a11';
    ctx.beginPath();
    ctx.moveTo(226.5, 22);
    ctx.lineTo(229, 22);
    ctx.lineTo(232, 19);
    ctx.lineTo(232, 29);
    ctx.lineTo(229, 26);
    ctx.lineTo(226.5, 26);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#041a11';
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(232, 24, 3, -0.7, 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(232, 24, 5.2, -0.7, 0.7);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
