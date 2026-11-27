import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { buildInfernoReaperAK47, InfernoVfxPool } from '../game/infernoReaper3d';
import { attachSharedPreview, type SharedPreviewAttachment } from '../game/sharedPreviewRenderer';

interface InfernoPreview3DProps {
  reducedMotion?: boolean;
  compact?: boolean;
  onTriggerFireSound?: () => void;
  onTriggerKillSound?: (headshot: boolean) => void;
  showDemoControls?: boolean;
}

export const InfernoPreview3D: React.FC<InfernoPreview3DProps> = React.memo(({
  reducedMotion = false,
  compact = false,
  onTriggerFireSound,
  onTriggerKillSound,
  showDemoControls = true,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const actionsRef = useRef<{
    triggerShot: () => void;
    triggerKill: (headshot: boolean) => void;
  } | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);
  const [edgeFlash, setEdgeFlash] = useState<'none' | 'normal' | 'headshot'>('none');
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let disposed = false;
    let cleanupPreview: (() => void) | null = null;
    let mountTimer: number | null = null;

    let rafId2 = 0;
    // Defer 3D model build & shared WebGL attach until after 2 modal paint frames (<50ms open)
    const rafId = window.requestAnimationFrame(() => {
      rafId2 = window.requestAnimationFrame(() => {
        mountTimer = window.setTimeout(() => {
        if (disposed || !mountRef.current) return;
        const host = mountRef.current;

        const w = Math.max(200, host.clientWidth || 320);
        const h = Math.max(140, host.clientHeight || (compact ? 175 : 220));
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(34, w / h, 0.05, 25);
        camera.position.set(0.05, 0.14, 1.12);
        camera.lookAt(0, 0.0, 0);

        // Warm obsidian-gold 3-point studio lighting (zero shadow maps, fast on mobile)
        const hemi = new THREE.HemisphereLight(0x9ec5fe, 0x26150a, 1.0);
        const keyLight = new THREE.DirectionalLight(0xffdfb0, 2.3);
        keyLight.position.set(2.4, 2.8, 2.2);
        const rimLight = new THREE.DirectionalLight(0xff7a1a, 1.9);
        rimLight.position.set(-2.5, 1.1, -1.8);
        scene.add(hemi, keyLight, rimLight);

        const baseRingGeo = new THREE.RingGeometry(0.28, 0.34, 28);
        const baseRingMat = new THREE.MeshBasicMaterial({
          color: 0xf59e0b,
          transparent: true,
          opacity: 0.24,
          side: THREE.DoubleSide,
        });
        const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
        baseRing.rotation.x = -Math.PI / 2;
        baseRing.position.set(0, -0.22, 0);
        scene.add(baseRing);

        const pivot = new THREE.Group();
        scene.add(pivot);

        const ak = buildInfernoReaperAK47({
          includeHands: false,
          maxAnisotropy: 2,
        });
        ak.group.position.set(0, 0.01, 0.12);
        ak.group.rotation.y = Math.PI / 2;
        pivot.add(ak.group);

        const flashGeo = new THREE.OctahedronGeometry(0.055, 0);
        const flashMat = new THREE.MeshBasicMaterial({
          color: 0xffa028,
          transparent: true,
          opacity: 0.92,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const flashMesh = new THREE.Mesh(flashGeo, flashMat);
        flashMesh.position.copy(ak.muzzlePos);
        flashMesh.visible = false;
        ak.group.add(flashMesh);

        const vfx = new InfernoVfxPool(scene, 40);
        const _muzzleWorld = new THREE.Vector3();
        const _killWorld = new THREE.Vector3(0, -0.35, 0);

        let flashTimer = 0;
        let kickAmt = 0;
        let yawAngle = -0.38;
        let dragActive = false;
        let lastPtrX = 0;

        actionsRef.current = {
          triggerShot: () => {
            flashTimer = 0.085;
            kickAmt = 0.045;
            flashMesh.visible = true;
            flashMesh.scale.set(1.2, 1.2, 2.6);
            flashMesh.getWorldPosition(_muzzleWorld);
            vfx.spawnFiringEmbers(_muzzleWorld, 1.0, reducedMotionRef.current);
          },
          triggerKill: (headshot: boolean) => {
            _killWorld.set(0, -0.45, 0.08);
            vfx.spawnKillBurst(_killWorld, headshot, 0.9, reducedMotionRef.current);
          },
        };

        const attachment: SharedPreviewAttachment | null = attachSharedPreview({
          container: host,
          scene,
          camera,
          toneMappingExposure: 1.18,
          onFrame: (dt, elapsed) => {
            if (!dragActive && !reducedMotionRef.current) {
              yawAngle += dt * 0.52;
            }
            pivot.rotation.y = yawAngle;
            pivot.position.y = reducedMotionRef.current ? 0 : Math.sin(elapsed * 1.9) * 0.014;

            if (kickAmt > 0.0005) {
              kickAmt *= Math.exp(-16 * dt);
              ak.group.position.x = -kickAmt;
            } else {
              ak.group.position.x = 0;
            }

            if (flashTimer > 0) {
              flashTimer -= dt;
              if (flashTimer <= 0) flashMesh.visible = false;
            }

            ak.updateAnimation(dt, elapsed, !reducedMotionRef.current);
            vfx.update(dt);
          },
        });

        if (!attachment) {
          vfx.dispose();
          ak.dispose();
          baseRingGeo.dispose();
          baseRingMat.dispose();
          flashGeo.dispose();
          flashMat.dispose();
          setWebglFailed(true);
          return;
        }

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

        const dom = attachment.domElement;
        dom.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);

        cleanupPreview = () => {
          actionsRef.current = null;
          dom.removeEventListener('pointerdown', onPointerDown);
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);
          attachment.detach();
          vfx.dispose();
          ak.dispose();
          baseRingGeo.dispose();
          baseRingMat.dispose();
          flashGeo.dispose();
          flashMat.dispose();
        };
        }, 90);
      });
    });

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      if (rafId2) window.cancelAnimationFrame(rafId2);
      if (mountTimer !== null) window.clearTimeout(mountTimer);
      cleanupPreview?.();
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

  return (
    <div className={`inferno-3d-box${compact ? ' is-compact' : ''}`} data-testid="inferno-preview-3d">
      <div className="inferno-3d-stage">
        {webglFailed ? (
          <div className="inferno-3d-fallback" dir="rtl">
            <strong>AK-47 · Inferno Reaper</strong>
            <span>بدنه مشکی با حکاکی طلایی و رگه‌های نارنجی درخشان</span>
          </div>
        ) : (
          <div ref={mountRef} className="inferno-3d-canvas-mount" />
        )}
        {edgeFlash !== 'none' && (
          <div className={`inferno-stage-edge-flash${edgeFlash === 'headshot' ? ' is-hs' : ''}`} />
        )}
        <div className="inferno-3d-badge" dir="ltr">
          ✦ LEGENDARY · INFERNO REAPER
        </div>
        <div className="inferno-3d-drag-hint" dir="rtl">
          برای چرخاندن بکشید
        </div>
      </div>

      {showDemoControls && (
        <div className="inferno-3d-actions" dir="rtl">
          <button
            type="button"
            className="inferno-demo-btn"
            data-testid="btn-demo-inferno-shot"
            onClick={handleDemoShot}
          >
            تست شلیک و جرقه
          </button>
          <button
            type="button"
            className="inferno-demo-btn accent-gold"
            data-testid="btn-demo-inferno-kill"
            onClick={() => handleDemoKill(false)}
          >
            افکت کشتن
          </button>
          <button
            type="button"
            className="inferno-demo-btn accent-orange"
            data-testid="btn-demo-inferno-headshot"
            onClick={() => handleDemoKill(true)}
          >
            افکت هدشات
          </button>
        </div>
      )}
    </div>
  );
});
