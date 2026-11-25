import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildVoidPiercerSniper, VoidPiercerVfxPool } from '../game/voidPiercer3d';
import { VoidSniperScope } from './VoidSniperScope';

interface VoidPiercerPreview3DProps {
  reducedMotion?: boolean;
  compact?: boolean;
  onTriggerFireSound?: () => void;
  onTriggerKillSound?: (headshot: boolean) => void;
  onTriggerScopeSound?: (entering: boolean) => void;
  showDemoControls?: boolean;
}

const detectSoftwareWebGL = (): boolean => {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
};

export const VoidPiercerPreview3D: React.FC<VoidPiercerPreview3DProps> = ({
  reducedMotion = false,
  compact = false,
  onTriggerFireSound,
  onTriggerKillSound,
  onTriggerScopeSound,
  showDemoControls = true,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const actionsRef = useRef<{
    triggerShot: () => void;
    triggerKill: (headshot: boolean) => void;
  } | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);
  const [edgeFlash, setEdgeFlash] = useState<'none' | 'normal' | 'headshot'>('none');
  const [scopePreviewOpen, setScopePreviewOpen] = useState(false);
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglFailed(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 1.2));
    renderer.shadowMap.enabled = false;

    const w = Math.max(240, container.clientWidth || 360);
    const h = Math.max(150, container.clientHeight || (compact ? 175 : 225));
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(34, w / h, 0.05, 25);
    camera.position.set(0.05, 0.14, 1.36);
    camera.lookAt(0, 0.01, 0);

    // Cool ceramic-void 3-point studio lighting (zero shadow maps, fast on mobile)
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x160f29, 0.95);
    const keyLight = new THREE.DirectionalLight(0xeef6ff, 2.25);
    keyLight.position.set(2.4, 2.8, 2.2);
    const cyanRim = new THREE.DirectionalLight(0x22d3ee, 1.85);
    cyanRim.position.set(-2.6, 1.2, -1.6);
    const violetFill = new THREE.DirectionalLight(0xa855f7, 1.25);
    violetFill.position.set(1.8, -1.0, -2.0);
    scene.add(hemi, keyLight, cyanRim, violetFill);

    // Subtle holographic cyan-violet pedestal ring
    const baseRingGeo = new THREE.RingGeometry(0.32, 0.37, 36);
    const baseRingMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });
    const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
    baseRing.rotation.x = -Math.PI / 2;
    baseRing.position.set(0, -0.22, 0);
    scene.add(baseRing);

    const pivot = new THREE.Group();
    scene.add(pivot);

    const sniper = buildVoidPiercerSniper({
      includeHands: false,
      maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
    });
    // Center AWM horizontally across the preview stage
    sniper.group.position.set(-0.08, 0.0, 0.14);
    sniper.group.rotation.y = Math.PI / 2;
    pivot.add(sniper.group);

    // Local cyan-violet muzzle flash burst for shot demo
    const flashGeo = new THREE.OctahedronGeometry(0.06, 0);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0x38f8ff,
      transparent: true,
      opacity: 0.94,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const flashMesh = new THREE.Mesh(flashGeo, flashMat);
    flashMesh.position.copy(sniper.muzzlePos);
    flashMesh.visible = false;
    sniper.group.add(flashMesh);

    // Pooled void beam + shockwave + gravity kill VFX (capped at 48 inside preview)
    const vfx = new VoidPiercerVfxPool(scene, 48);

    // Reusable scratch vectors (zero per-frame GC)
    const _muzzleWorld = new THREE.Vector3();
    const _beamEndWorld = new THREE.Vector3();
    const _muzzleQuat = new THREE.Quaternion();
    const _forwardDir = new THREE.Vector3();
    const _killWorld = new THREE.Vector3(0, -0.4, 0.08);

    let flashTimer = 0;
    let kickAmt = 0;
    let yawAngle = -0.34;
    let dragActive = false;
    let lastPtrX = 0;

    actionsRef.current = {
      triggerShot: () => {
        flashTimer = 0.095;
        kickAmt = 0.055;
        flashMesh.visible = true;
        flashMesh.scale.set(1.25, 1.25, 2.8);
        sniper.triggerShotPulse();
        flashMesh.getWorldPosition(_muzzleWorld);
        sniper.group.getWorldQuaternion(_muzzleQuat);
        _forwardDir.set(0, 0, -1).applyQuaternion(_muzzleQuat).normalize();
        _beamEndWorld.copy(_muzzleWorld).addScaledVector(_forwardDir, 1.55);
        vfx.spawnBeamAndShockwave(
          _muzzleWorld,
          _beamEndWorld,
          1.0,
          reducedMotionRef.current
        );
      },
      triggerKill: (headshot: boolean) => {
        _killWorld.set(0, -0.42, 0.08);
        vfx.spawnGravityKill(_killWorld, headshot, 0.95, reducedMotionRef.current);
      },
    };

    const onPointerDown = (e: PointerEvent) => {
      dragActive = true;
      lastPtrX = e.clientX;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragActive) return;
      const dx = e.clientX - lastPtrX;
      lastPtrX = e.clientX;
      yawAngle += dx * 0.012;
    };
    const onPointerUp = () => {
      dragActive = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const onResize = () => {
      if (!container) return;
      const nw = Math.max(200, container.clientWidth);
      const nh = Math.max(140, container.clientHeight);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh, false);
    };
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    ro?.observe(container);

    let disposed = false;
    let frameId = 0;
    let lastTime = performance.now();
    let elapsed = 0;

    const afterDraw = (cb: () => void) => {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const st = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (st === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 8);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 85);
          }
        };
        frameId = window.setTimeout(poll, 8);
      } else {
        frameId = window.setTimeout(cb, 90);
      }
    };

    let isVisible = true;
    const schedulePreviewFrame = () => {
      if (disposed || !isVisible || document.hidden) return;
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    const tick = () => {
      if (disposed || !isVisible || document.hidden) return;
      const now = performance.now();
      const dt = Math.min(0.06, Math.max(0.004, (now - lastTime) / 1000));
      lastTime = now;
      elapsed += dt;

      if (!dragActive && !reducedMotionRef.current) {
        yawAngle += dt * 0.48;
      }
      pivot.rotation.y = yawAngle;
      pivot.position.y = reducedMotionRef.current ? 0 : Math.sin(elapsed * 1.8) * 0.013;

      if (kickAmt > 0.0005) {
        kickAmt *= Math.exp(-14 * dt);
        sniper.group.position.x = -0.08 - kickAmt;
      } else {
        sniper.group.position.x = -0.08;
      }

      if (flashTimer > 0) {
        flashTimer -= dt;
        if (flashTimer <= 0) flashMesh.visible = false;
      }

      sniper.updateAnimation(dt, elapsed, !reducedMotionRef.current);
      vfx.update(dt);
      renderer.render(scene, camera);

      schedulePreviewFrame();
    };

    const io =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (entries) => {
              const nowVis = entries.some((e) => e.isIntersecting);
              if (nowVis !== isVisible) {
                isVisible = nowVis;
                if (isVisible && !document.hidden) {
                  lastTime = performance.now();
                  schedulePreviewFrame();
                } else {
                  cancelAnimationFrame(frameId);
                  window.clearTimeout(frameId);
                }
              }
            },
            { threshold: 0.05 }
          )
        : null;
    io?.observe(container);

    const onVisChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(frameId);
        window.clearTimeout(frameId);
      } else if (isVisible) {
        lastTime = performance.now();
        schedulePreviewFrame();
      }
    };
    document.addEventListener('visibilitychange', onVisChange);

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      actionsRef.current = null;
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVisChange);
      ro?.disconnect();
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      vfx.dispose();
      sniper.dispose();
      baseRingGeo.dispose();
      baseRingMat.dispose();
      flashGeo.dispose();
      flashMat.dispose();
      envTex.dispose();
      renderer.dispose();
      try {
        renderer.forceContextLoss();
      } catch {
        // ignore
      }
    };
  }, [compact]);

  const handleDemoShot = () => {
    actionsRef.current?.triggerShot();
    onTriggerFireSound?.();
  };

  const handleDemoKill = (headshot: boolean) => {
    actionsRef.current?.triggerKill(headshot);
    onTriggerKillSound?.(headshot);
    if (!reducedMotion) {
      setEdgeFlash(headshot ? 'headshot' : 'normal');
      window.setTimeout(() => setEdgeFlash('none'), headshot ? 560 : 420);
    }
  };

  const handleToggleScopePreview = () => {
    setScopePreviewOpen((prev) => {
      const next = !prev;
      onTriggerScopeSound?.(next);
      return next;
    });
  };

  return (
    <div
      className={`inferno-3d-box void-3d-box${compact ? ' is-compact' : ''}`}
      data-testid="void-preview-3d"
    >
      <div className="inferno-3d-stage void-3d-stage">
        {webglFailed ? (
          <div className="inferno-3d-fallback" dir="rtl">
            <strong>AWM .338 · Void Piercer</strong>
            <span>بدنه مات مشکی و سفید با رگه‌های فیروزه‌ای و بنفش و هسته انرژی</span>
          </div>
        ) : (
          <div ref={mountRef} className="inferno-3d-canvas-mount" />
        )}
        {edgeFlash !== 'none' && (
          <div className={`void-stage-edge-flash${edgeFlash === 'headshot' ? ' is-hs' : ''}`} />
        )}
        <div className="inferno-3d-badge void-3d-badge" dir="ltr">
          ◈ LEGENDARY · VOID PIERCER
        </div>
        <div className="inferno-3d-drag-hint" dir="rtl">
          برای چرخاندن بکشید
        </div>

        {scopePreviewOpen && (
          <div className="void-scope-inline-wrap" data-testid="void-scope-preview-layer">
            <VoidSniperScope
              simplified={reducedMotion}
              previewMode
              onClosePreview={() => {
                setScopePreviewOpen(false);
                onTriggerScopeSound?.(false);
              }}
            />
          </div>
        )}
      </div>

      {showDemoControls && (
        <div className="inferno-3d-actions void-3d-actions" dir="rtl">
          <button
            type="button"
            className="inferno-demo-btn accent-cyan"
            data-testid="btn-demo-void-shot"
            onClick={handleDemoShot}
          >
            تست شلیک و پرتو
          </button>
          <button
            type="button"
            className="inferno-demo-btn accent-violet"
            data-testid="btn-demo-void-kill"
            onClick={() => handleDemoKill(false)}
          >
            افکت کشتن
          </button>
          <button
            type="button"
            className="inferno-demo-btn accent-void-hs"
            data-testid="btn-demo-void-headshot"
            onClick={() => handleDemoKill(true)}
          >
            افکت هدشات
          </button>
          <button
            type="button"
            className={`inferno-demo-btn accent-scope${scopePreviewOpen ? ' is-active' : ''}`}
            data-testid="btn-demo-void-scope"
            onClick={handleToggleScopePreview}
          >
            {scopePreviewOpen ? 'بستن اسکوپ' : 'پیش‌نمایش اسکوپ'}
          </button>
        </div>
      )}
    </div>
  );
};
