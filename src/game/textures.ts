import * as THREE from 'three';

function configureColorTexture(tex: THREE.CanvasTexture, maxAnisotropy = 4): THREE.CanvasTexture {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function makeConcreteTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#33363b';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(15,17,20,0.18)' : 'rgba(90,94,100,0.12)';
    ctx.beginPath();
    ctx.arc(Math.random() * 512, Math.random() * 512, 20 + Math.random() * 55, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 6000; i++) {
    const v = 32 + Math.floor(Math.random() * 34);
    ctx.fillStyle = `rgb(${v},${v + 1},${v + 2})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  ctx.strokeStyle = 'rgba(12, 13, 15, 0.72)';
  ctx.lineWidth = 3;
  for (let p = 0; p <= 512; p += 128) {
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(512, p);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);
  return configureColorTexture(tex, maxAnisotropy);
}

export function makeAsphaltTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#181e29';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 7500; i++) {
    const v = 18 + Math.floor(Math.random() * 26);
    ctx.fillStyle = `rgb(${v},${v + 4},${v + 10})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  // Wet dockyard reflection puddles & yellow cargo lane markings
  ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
  for (let i = 0; i < 16; i++) {
    ctx.beginPath();
    ctx.ellipse(Math.random() * 512, Math.random() * 512, 45, 22, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.52)';
  ctx.lineWidth = 6;
  ctx.setLineDash([28, 20]);
  ctx.strokeRect(24, 24, 464, 464);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 12);
  return configureColorTexture(tex, maxAnisotropy);
}

export function makeSandstoneTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#7c5d3f';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 45; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(92, 64, 38, 0.25)' : 'rgba(168, 132, 92, 0.2)';
    ctx.beginPath();
    ctx.ellipse(Math.random() * 512, Math.random() * 512, 65, 25, Math.random() * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 6500; i++) {
    const r = 105 + Math.floor(Math.random() * 45);
    const g = 78 + Math.floor(Math.random() * 35);
    const b = 50 + Math.floor(Math.random() * 25);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);
  return configureColorTexture(tex, maxAnisotropy);
}

export function makeCrateTexture(baseHex: string, stripeHex: string, maxAnisotropy = 4): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.04)';
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 18;
  ctx.strokeRect(9, 9, 238, 238);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let y = 34; y < 220; y += 22) ctx.fillRect(24, y, 208, 8);
  ctx.fillStyle = stripeHex;
  ctx.fillRect(24, 114, 208, 22);
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('UNIT-04 · CARGO', 44, 130);
  const tex = new THREE.CanvasTexture(c);
  return configureColorTexture(tex, maxAnisotropy);
}

export function makeWallTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#3b3e42';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2400; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.08)';
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = 2;
  for (let y = 0; y < 256; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  ctx.fillStyle = '#222428';
  ctx.fillRect(0, 204, 256, 52);
  ctx.fillStyle = '#b57b10';
  for (let x = -32; x < 280; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 210);
    ctx.lineTo(x + 14, 210);
    ctx.lineTo(x + 4, 226);
    ctx.lineTo(x - 10, 226);
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return configureColorTexture(tex, maxAnisotropy);
}

export function makeWoodTexture(maxAnisotropy = 4): THREE.CanvasTexture {
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
}

export function makeFlashTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  g.addColorStop(0, 'rgba(255, 255, 235, 1)');
  g.addColorStop(0.28, 'rgba(255, 195, 70, 0.92)');
  g.addColorStop(0.65, 'rgba(255, 100, 15, 0.32)');
  g.addColorStop(1, 'rgba(255, 80, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeRedactedFaceTexture(tintColor: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  const cols = ['#1a1c20', '#2b2f36', '#4a4e56', '#72767e', '#111215', tintColor];
  for (let y = 0; y < 64; y += 8) {
    for (let x = 0; x < 64; x += 8) {
      ctx.fillStyle = cols[Math.floor(Math.random() * cols.length)];
      ctx.fillRect(x, y, 8, 8);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeNameplateTexture(
  callsign: string,
  accentHex = '#00f0ff',
  isSpeaking = false
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 96);
  ctx.fillStyle = isSpeaking ? 'rgba(6, 26, 20, 0.92)' : 'rgba(6, 12, 22, 0.88)';
  ctx.strokeStyle = isSpeaking ? '#10b981' : accentHex;
  ctx.lineWidth = isSpeaking ? 5 : 4;
  ctx.beginPath();
  ctx.roundRect(10, 12, 492, 72, 16);
  ctx.fill();
  ctx.stroke();

  const label = (callsign || 'OPERATOR').trim().slice(0, 24);
  const maxTextW = isSpeaking ? 390 : 448;
  let fontSize = 28;
  ctx.font = `800 ${fontSize}px Tahoma, monospace`;
  while (fontSize > 16 && ctx.measureText(label).width > maxTextW) {
    fontSize -= 2;
    ctx.font = `800 ${fontSize}px Tahoma, monospace`;
  }

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, isSpeaking ? 236 : 256, 49, maxTextW + 8);

  if (isSpeaking) {
    // Glowing green speaker/sound-wave badge on the right side of the nameplate
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(462, 48, 17, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#041a11';
    ctx.beginPath();
    ctx.moveTo(453, 44);
    ctx.lineTo(458, 44);
    ctx.lineTo(464, 38);
    ctx.lineTo(464, 58);
    ctx.lineTo(458, 52);
    ctx.lineTo(453, 52);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#041a11';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(464, 48, 6, -0.7, 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(464, 48, 10.5, -0.7, 0.7);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
