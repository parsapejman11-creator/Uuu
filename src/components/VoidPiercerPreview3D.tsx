import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { buildVoidPiercerSniper, VoidPiercerVfxPool } from '../game/voidPiercer3d';
import { attachSharedPreview, type SharedPreviewAttachment } from '../game/sharedPreviewRenderer';
import { VoidSniperScope } from './VoidSniperScope';

interface VoidPiercerPreview3DProps {
  reducedMotion?: boolean;
  compact?: boolean;
  onTriggerFireSound?: () => void;
  onTriggerKillSound?: (headshot: boolean) => void;
  onTriggerScopeSound?: (entering: boolean) => void;
  showDemoControls?: boolean;
}

export const VoidPiercerPreview3D: React.FC<VoidPiercerPreview3DProps> = React.memo(({
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

    let disposed = false;
    let cleanupPreview: (() => void) | null = null;
    let mountTimer: number | null = null;

    let rafId2 = 0;
    const rafId = window.requestAnimationFrame(() => {
      rafId2 = window.requestAnimationFrame(() => {
        mountTimer = window.setTimeout(() => {
        if (disposed || !mountRef.current) return;
        const host = mountRef.current;

        const w = Math.max(200, host.clientWidth || 320);
        const h = Math.max(140, host.clientHeight || (compact ? 175 : 225));
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(34, w / h, 0.05, 25);
        camera.position.set(0.05, 0.14, 1.36);
        camera.lookAt(0, 0.01, 0);

        const hemi = new THREE.HemisphereLight(0xdbeafe, 0x160f29, 1.0);
        const keyLight = new THREE.DirectionalLight(0xeef6ff, 2.35);
        keyLight.position.set(2.4, 2.8, 2.2);
        const cyanRim = new THREE.DirectionalLight(0x22d3ee, 1.95);
        cyanRim.position.set(-2.6, 1.2, -1.6);
        const violetFill = new THREE.DirectionalLight(0xa855f7, 1.3);
        violetFill.position.set(1.8, -1.0, -2.0);
        scene.add(hemi, keyLight, cyanRim, violetFill);

        const baseRingGeo = new THREE.RingGeometry(0.32, 0.37, 28);
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
          maxAnisotropy: 2,
        });
        sniper.group.position.set(-0.08, 0.0, 0.14);
        sniper.group.rotation.y = Math.PI / 2;
        pivot.add(sniper.group);

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

        const vfx = new VoidPiercerVfxPool(scene, 40);
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

        const attachment: SharedPreviewAttachment | null = attachSharedPreview({
          container: host,
          scene,
          camera,
          toneMappingExposure: 1.18,
          onFrame: (dt, elapsed) => {
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
          },
        });

        if (!attachment) {
          vfx.dispose();
          sniper.dispose();
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
          sniper.dispose();
          baseRingGeo.dispose();
          baseRingMat.dispose();
          flashGeo.dispose();
          flashMat.dispose();
        };
        }, 40);
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
});
