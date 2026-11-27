/**
 * Shared Low-Resolution 3D Preview Renderer & Procedural Canvas Cache
 *
 * Solves the 1.3s–2.1s WebGL stall when opening Spin / Skins modals:
 * - Maintains AT MOST ONE reusable low-res WebGLRenderer across all 5 skin previews.
 * - Detects software WebGL ONCE (never creates throwaway probe WebGL contexts on mount).
 * - Replaces expensive PMREMGenerator + RoomEnvironment cubemap shader compilation (~600ms)
 *   with a cached 64x32 equirectangular studio reflection DataTexture (<0.5ms CPU, zero shader pass).
 * - Renders ONLY while visible (IntersectionObserver + !document.hidden) at a capped low backing
 *   resolution (max 384x224, dpr=1) and stops cleanly when hidden, switched, or unmounted.
 * - Caches static procedural 2D canvases once so skin models never repaint 512x256 procedural
 *   textures from scratch on reopen.
 */

import * as THREE from 'three';

const proceduralCanvasCache = new Map<string, HTMLCanvasElement>();

/**
 * Returns a cached procedural 2D HTMLCanvasElement, generating its pixels at most ONCE.
 * Safe to pass into `new THREE.CanvasTexture(canvas)` across different WebGL contexts.
 */
export function getCachedProceduralCanvas(
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): HTMLCanvasElement {
  const existing = proceduralCanvasCache.get(key);
  if (existing && existing.width === width && existing.height === height) {
    return existing;
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    draw(ctx, width, height);
  }
  proceduralCanvasCache.set(key, canvas);
  return canvas;
}

export function clearProceduralCanvasCache(): void {
  proceduralCanvasCache.clear();
}

/** Pure sizing clamp so 3D previews always stay low-resolution & fast on mobile GPUs */
export function computePreviewRenderSize(
  clientWidth: number,
  clientHeight: number,
  maxWidth = 384,
  maxHeight = 224
): { width: number; height: number } {
  const safeW = Math.max(180, Math.round(clientWidth || 320));
  const safeH = Math.max(120, Math.round(clientHeight || 180));
  const scale = Math.min(1, maxWidth / safeW, maxHeight / safeH);
  return {
    width: Math.max(160, Math.round(safeW * scale)),
    height: Math.max(100, Math.round(safeH * scale)),
  };
}

let cachedSoftwareGl: boolean | null = null;

export function isSoftwareWebGLCached(): boolean {
  if (cachedSoftwareGl !== null) return cachedSoftwareGl;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      cachedSoftwareGl = true;
      return true;
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    cachedSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    cachedSoftwareGl = true;
  }
  return cachedSoftwareGl;
}

/**
 * Generates a lightweight 64x32 equirectangular studio reflection DataTexture in <0.5ms.
 * Provides crisp metallic specular highlights on obsidian/gold/Damascus skins without
 * compiling PMREMGenerator + RoomEnvironment shaders on the main thread.
 */
function createFastStudioEnvTexture(): THREE.DataTexture {
  const w = 64;
  const h = 32;
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const v = y / (h - 1); // 0 = bottom, 1 = top in Three.js DataTexture
    for (let x = 0; x < w; x++) {
      const u = x / (w - 1);
      // Soft studio softbox sky gradient + warm key lobe + cool rim lobe
      const keyLobe = Math.exp(-(((u - 0.25) ** 2) / 0.018 + ((v - 0.78) ** 2) / 0.032));
      const rimLobe = Math.exp(-(((u - 0.75) ** 2) / 0.022 + ((v - 0.62) ** 2) / 0.04));
      const overheadBand = Math.exp(-(((v - 0.92) ** 2) / 0.015)) * 0.55;
      const base = 24 + v * 42;

      const r = Math.min(255, Math.round(base + keyLobe * 225 + rimLobe * 95 + overheadBand * 180));
      const g = Math.min(255, Math.round(base + keyLobe * 208 + rimLobe * 145 + overheadBand * 185));
      const b = Math.min(255, Math.round(base + 14 + keyLobe * 182 + rimLobe * 225 + overheadBand * 200));

      const idx = (y * w + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

interface ActivePreviewClient {
  id: number;
  container: HTMLElement;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  toneMappingExposure: number;
  onFrame: (dt: number, elapsed: number) => void;
  isVisible: boolean;
  lastTime: number;
  elapsed: number;
  io: IntersectionObserver | null;
  ro: ResizeObserver | null;
  resizeTimer: ReturnType<typeof setTimeout> | null;
}

let sharedRenderer: THREE.WebGLRenderer | null = null;
let sharedEnvTexture: THREE.DataTexture | null = null;
let activeClient: ActivePreviewClient | null = null;
let nextClientId = 1;
let loopFrameId: number | null = null;
let loopIsTimeout = false;
let idleDisposeTimer: ReturnType<typeof setTimeout> | null = null;
let visListenerAttached = false;

function cancelLoop(): void {
  if (loopFrameId !== null) {
    if (loopIsTimeout) {
      window.clearTimeout(loopFrameId);
    } else {
      window.cancelAnimationFrame(loopFrameId);
    }
    loopFrameId = null;
    loopIsTimeout = false;
  }
}

function ensureSharedRenderer(): THREE.WebGLRenderer | null {
  if (idleDisposeTimer !== null) {
    clearTimeout(idleDisposeTimer);
    idleDisposeTimer = null;
  }
  if (sharedRenderer) return sharedRenderer;

  try {
    const isSw = isSoftwareWebGLCached();
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: 'low-power',
      preserveDrawingBuffer: false,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = isSw ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = false;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    sharedRenderer = renderer;
    // Software WebGL (e.g., SwiftShader) takes ~3s to compile Three.js's hidden PMREM + CubeUV PBR shaders.
    // Keep 3-point scene lights active everywhere; enable studio IBL env texture only on hardware GPUs.
    sharedEnvTexture = isSw ? null : createFastStudioEnvTexture();
    return renderer;
  } catch {
    return null;
  }
}

function syncRendererSize(client: ActivePreviewClient): void {
  if (!sharedRenderer) return;
  const { width, height } = computePreviewRenderSize(
    client.container.clientWidth,
    client.container.clientHeight
  );
  client.camera.aspect = width / height;
  client.camera.updateProjectionMatrix();
  sharedRenderer.setSize(width, height, false);
}

function scheduleNextTick(): void {
  cancelLoop();
  if (!activeClient || !sharedRenderer) return;
  if (!activeClient.isVisible || (typeof document !== 'undefined' && document.hidden)) return;

  const isSw = isSoftwareWebGLCached();
  if (isSw) {
    // Cap software WebGL previews to ~10 FPS so main thread stays snappy
    loopIsTimeout = true;
    loopFrameId = window.setTimeout(runPreviewTick, 100);
  } else {
    // Cap hardware mobile previews to ~30 FPS (33ms) for cool battery + snappy UI
    loopIsTimeout = true;
    loopFrameId = window.setTimeout(() => {
      if (!activeClient || !activeClient.isVisible || document.hidden) return;
      loopIsTimeout = false;
      loopFrameId = window.requestAnimationFrame(runPreviewTick);
    }, 30);
  }
}

function runPreviewTick(): void {
  loopFrameId = null;
  loopIsTimeout = false;
  const client = activeClient;
  const renderer = sharedRenderer;
  if (!client || !renderer) return;
  if (!client.isVisible || (typeof document !== 'undefined' && document.hidden)) return;

  const now = performance.now();
  const dt = Math.min(0.06, Math.max(0.004, (now - client.lastTime) / 1000));
  client.lastTime = now;
  client.elapsed += dt;

  client.onFrame(dt, client.elapsed);
  renderer.toneMappingExposure = client.toneMappingExposure;
  renderer.render(client.scene, client.camera);
  scheduleNextTick();
}

function handleDocumentVisibility(): void {
  if (!activeClient) return;
  if (document.hidden) {
    cancelLoop();
  } else if (activeClient.isVisible) {
    activeClient.lastTime = performance.now();
    scheduleNextTick();
  }
}

export interface SharedPreviewAttachment {
  domElement: HTMLCanvasElement;
  envTexture: THREE.Texture | null;
  maxAnisotropy: number;
  requestRenderNow: () => void;
  detach: () => void;
}

export interface AttachSharedPreviewOptions {
  container: HTMLElement;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  toneMappingExposure?: number;
  onFrame: (dt: number, elapsed: number) => void;
}

/**
 * Attaches the single shared low-res WebGL preview renderer to `container`.
 * Automatically detaches any previous preview client cleanly without recreating the WebGL context.
 */
export function attachSharedPreview(
  options: AttachSharedPreviewOptions
): SharedPreviewAttachment | null {
  const renderer = ensureSharedRenderer();
  if (!renderer) return null;

  // Cleanly detach any previous active preview client before taking ownership
  if (activeClient) {
    detachClient(activeClient);
  }

  if (!visListenerAttached && typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleDocumentVisibility);
    visListenerAttached = true;
  }

  const client: ActivePreviewClient = {
    id: nextClientId++,
    container: options.container,
    scene: options.scene,
    camera: options.camera,
    toneMappingExposure: options.toneMappingExposure ?? 1.2,
    onFrame: options.onFrame,
    isVisible: true,
    lastTime: performance.now(),
    elapsed: 0,
    io: null,
    ro: null,
    resizeTimer: null,
  };

  if (sharedEnvTexture && !options.scene.environment && !isSoftwareWebGLCached()) {
    options.scene.environment = sharedEnvTexture;
  }

  activeClient = client;
  options.container.innerHTML = '';
  options.container.appendChild(renderer.domElement);
  syncRendererSize(client);

  if (typeof IntersectionObserver !== 'undefined') {
    client.io = new IntersectionObserver(
      (entries) => {
        if (activeClient !== client) return;
        const vis = entries.some((e) => e.isIntersecting);
        if (vis !== client.isVisible) {
          client.isVisible = vis;
          if (vis && !document.hidden) {
            client.lastTime = performance.now();
            scheduleNextTick();
          } else {
            cancelLoop();
          }
        }
      },
      { threshold: 0.05 }
    );
    client.io.observe(options.container);
  }

  if (typeof ResizeObserver !== 'undefined') {
    client.ro = new ResizeObserver(() => {
      if (activeClient !== client) return;
      if (client.resizeTimer !== null) clearTimeout(client.resizeTimer);
      client.resizeTimer = setTimeout(() => {
        client.resizeTimer = null;
        if (activeClient === client) {
          syncRendererSize(client);
        }
      }, 100);
    });
    client.ro.observe(options.container);
  }

  // Render first frame on the next animation frame (never blocking React commit!)
  loopIsTimeout = false;
  loopFrameId = window.requestAnimationFrame(runPreviewTick);

  return {
    domElement: renderer.domElement,
    envTexture: sharedEnvTexture,
    maxAnisotropy: Math.min(2, renderer.capabilities.getMaxAnisotropy()),
    requestRenderNow: () => {
      if (activeClient === client && client.isVisible && !document.hidden) {
        runPreviewTick();
      }
    },
    detach: () => {
      if (activeClient === client) {
        detachClient(client);
      }
    },
  };
}

function detachClient(client: ActivePreviewClient): void {
  cancelLoop();
  client.io?.disconnect();
  client.ro?.disconnect();
  if (client.resizeTimer !== null) {
    clearTimeout(client.resizeTimer);
    client.resizeTimer = null;
  }
  if (sharedRenderer && sharedRenderer.domElement.parentNode === client.container) {
    client.container.removeChild(sharedRenderer.domElement);
  }
  if (activeClient === client) {
    activeClient = null;
  }
  // Schedule automatic release if no other preview mounts shortly (e.g., modal closed)
  if (idleDisposeTimer !== null) clearTimeout(idleDisposeTimer);
  idleDisposeTimer = setTimeout(() => {
    idleDisposeTimer = null;
    if (!activeClient) {
      disposeSharedPreviewRenderer();
    }
  }, 450);
}

/** Immediately frees the shared preview WebGLRenderer & studio env texture when no preview is active */
export function disposeSharedPreviewRenderer(): void {
  if (idleDisposeTimer !== null) {
    clearTimeout(idleDisposeTimer);
    idleDisposeTimer = null;
  }
  if (activeClient) {
    detachClient(activeClient);
    if (idleDisposeTimer !== null) {
      clearTimeout(idleDisposeTimer);
      idleDisposeTimer = null;
    }
  }
  cancelLoop();
  if (visListenerAttached && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handleDocumentVisibility);
    visListenerAttached = false;
  }
  if (sharedEnvTexture) {
    sharedEnvTexture.dispose();
    sharedEnvTexture = null;
  }
  if (sharedRenderer) {
    try {
      sharedRenderer.dispose();
      sharedRenderer.forceContextLoss();
    } catch {
      // ignore
    }
    sharedRenderer = null;
  }
}

export function isSharedPreviewActive(): boolean {
  return activeClient !== null;
}
