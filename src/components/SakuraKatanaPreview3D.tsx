import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { buildSakuraKatana3D, SakuraVfxPool } from '../game/sakuraKatana3d';
import { attachSharedPreview, type SharedPreviewAttachment } from '../game/sharedPreviewRenderer';

interface SakuraKatanaPreview3DProps {
  reducedMotion?: boolean;
  compact?: boolean;
  onTriggerSlashSound?: () => void;
  onTriggerKillSound?: (headshot: boolean) => void;
  showDemoControls?: boolean;
}

export const SakuraKatanaPreview3D: React.FC<SakuraKatanaPreview3DProps> = React.memo(({
  reducedMotion = false,
  compact = false,
  onTriggerSlashSound,
  onTriggerKillSound,
  showDemoControls = true,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const actionsRef = useRef<{
    triggerSlash: () => void;
    triggerKill: (crit: boolean) => void;
  } | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);
  const [edgeFlash, setEdgeFlash] = useState<'none' | 'slash' | 'kill'>('none');
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
        const camera = new THREE.PerspectiveCamera(32, w / h, 0.05, 25);
        camera.position.set(0.02, 0.08, 1.04);
        camera.lookAt(0.02, 0.01, 0);

        const hemi = new THREE.HemisphereLight(0xfce7f3, 0x1e1b4b, 1.2);
        const keyLight = new THREE.DirectionalLight(0xfff5f8, 2.65);
        keyLight.position.set(2.2, 2.4, 2.8);
        const rimLight = new THREE.DirectionalLight(0xff4d94, 2.35);
        rimLight.position.set(-2.5, 1.3, -1.5);
        const coolRim = new THREE.DirectionalLight(0x38bdf8, 1.4);
        coolRim.position.set(1.6, -0.5, 1.9);
        scene.add(hemi, keyLight, rimLight, coolRim);

        const baseRingGeo = new THREE.RingGeometry(0.28, 0.33, 28);
        const baseRingMat = new THREE.MeshBasicMaterial({
          color: 0xff4d94,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide,
        });
        const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
        baseRing.rotation.x = -Math.PI / 2;
        baseRing.position.set(0, -0.19, 0);
        scene.add(baseRing);

        const pivot = new THREE.Group();
        scene.add(pivot);

        const displayGroup = new THREE.Group();
        displayGroup.position.set(-0.15, -0.02, 0);
        displayGroup.rotation.set(0.06, 0, -Math.PI / 2 + 0.16);
        pivot.add(displayGroup);

        const katana = buildSakuraKatana3D({
          includeHands: false,
          maxAnisotropy: 2,
        });
        katana.group.rotation.y = Math.PI / 2;
        katana.bladePivot.rotation.set(0, 0, 0);
        katana.bladePivot.position.set(0, 0, 0);
        displayGroup.add(katana.group);

        const slashArcGeo = new THREE.RingGeometry(0.32, 0.44, 24, 1, -Math.PI * 0.42, Math.PI * 0.84);
        const slashArcMat = new THREE.MeshBasicMaterial({
          color: 0xff4d94,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const slashArcMesh = new THREE.Mesh(slashArcGeo, slashArcMat);
        slashArcMesh.visible = false;
        scene.add(slashArcMesh);

        const vfx = new SakuraVfxPool(scene, 36);
        const _origin = new THREE.Vector3(0, 0.04, 0.08);
        const _fwd = new THREE.Vector3(0.4, 0.15, 0.9).normalize();

        let slashTimer = 0;
        let yawAngle = 0.14;
        let dragActive = false;
        let lastPtrX = 0;

        actionsRef.current = {
          triggerSlash: () => {
            slashTimer = 0.42;
            katana.triggerSlash();
            slashArcMesh.visible = true;
            slashArcMesh.position.set(0, 0.03, 0.12);
            slashArcMesh.rotation.set(0.28, 0.15, -0.4);
            slashArcMesh.scale.setScalar(0.85);
            slashArcMat.opacity = 0.92;
            vfx.spawnSlashPetals(_origin, _fwd, 0.85, reducedMotionRef.current);
          },
          triggerKill: (crit: boolean) => {
            katana.triggerSlash();
            _origin.set(0, -0.18, 0.1);
            vfx.spawnKillBurst(_origin, crit, 0.45, reducedMotionRef.current);
          },
        };

        const attachment: SharedPreviewAttachment | null = attachSharedPreview({
          container: host,
          scene,
          camera,
          toneMappingExposure: 1.22,
          onFrame: (dt, elapsed) => {
            if (!dragActive && !reducedMotionRef.current) {
              yawAngle += dt * 0.48;
            }
            pivot.rotation.y = yawAngle;
            pivot.position.y = reducedMotionRef.current ? 0 : Math.sin(elapsed * 1.9) * 0.015;

            if (slashTimer > 0) {
              slashTimer = Math.max(0, slashTimer - dt);
              const p = 1 - slashTimer / 0.42;
              const swing = Math.sin(p * Math.PI);
              katana.bladePivot.rotation.set(swing * 0.42, swing * 0.65, -swing * 0.35);
              slashArcMesh.scale.setScalar(0.85 + p * 0.95);
              slashArcMesh.rotation.z = -0.4 + p * 1.1;
              slashArcMat.opacity = Math.max(0, (1 - p) * 0.92);
              if (slashTimer <= 0) {
                slashArcMesh.visible = false;
                katana.bladePivot.rotation.set(0, 0, 0);
              }
            }

            katana.updateAnimation(dt, elapsed, !reducedMotionRef.current);
            vfx.update(dt);
          },
        });

        if (!attachment) {
          katana.dispose();
          vfx.dispose();
          baseRingGeo.dispose();
          baseRingMat.dispose();
          slashArcGeo.dispose();
          slashArcMat.dispose();
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
          katana.dispose();
          vfx.dispose();
          baseRingGeo.dispose();
          baseRingMat.dispose();
          slashArcGeo.dispose();
          slashArcMat.dispose();
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

  const handleTestSlash = () => {
    actionsRef.current?.triggerSlash();
    onTriggerSlashSound?.();
    if (!reducedMotion) {
      setEdgeFlash('slash');
      window.setTimeout(() => setEdgeFlash('none'), 220);
    }
  };

  const handleTestKill = () => {
    actionsRef.current?.triggerKill(true);
    onTriggerKillSound?.(true);
    if (!reducedMotion) {
      setEdgeFlash('kill');
      window.setTimeout(() => setEdgeFlash('none'), 300);
    }
  };

  return (
    <div
      className={`inferno-3d-box${compact ? ' is-compact' : ''}`}
      data-testid="sakura-katana-preview-3d"
    >
      <div
        className="inferno-3d-stage"
        style={{
          borderColor: 'rgba(244, 114, 182, 0.42)',
          background:
            'radial-gradient(circle at 50% 44%, rgba(244, 114, 182, 0.2), rgba(14, 11, 28, 0.96) 72%)',
        }}
      >
        {webglFailed ? (
          <div className="inferno-3d-fallback" dir="rtl">
            <strong>Sakura Moonblade · Legendary Katana</strong>
            <span>تیغه دمشقی خمیده با لبه نورانی ساکورا و محافظ نیلوفر طلایی</span>
          </div>
        ) : (
          <div
            ref={mountRef}
            className="inferno-3d-canvas-mount"
            aria-label="پیش‌نمایش سه‌بعدی کاتانای لجندری شکوفهٔ ماه"
          />
        )}
        {edgeFlash !== 'none' && (
          <div
            className={`inferno-stage-edge-flash${edgeFlash === 'kill' ? ' is-hs' : ''}`}
            style={{
              boxShadow:
                edgeFlash === 'kill'
                  ? 'inset 0 0 42px rgba(244, 114, 182, 0.75)'
                  : 'inset 0 0 28px rgba(251, 191, 36, 0.55)',
            }}
          />
        )}
        <div
          className="inferno-3d-badge"
          dir="ltr"
          style={{
            color: '#fbcfe8',
            borderColor: 'rgba(244, 114, 182, 0.55)',
            background: 'rgba(30, 12, 32, 0.78)',
          }}
        >
          ✿ LEGENDARY · SAKURA MOONBLADE
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
            data-testid="btn-sakura-demo-slash"
            onClick={handleTestSlash}
          >
            ⚔ تست ضربه و گلبرگ
          </button>
          <button
            type="button"
            className="inferno-demo-btn accent-gold"
            data-testid="btn-sakura-demo-kill"
            onClick={handleTestKill}
          >
            🌸 افکت کشتن شکوفهٔ ماه
          </button>
        </div>
      )}
    </div>
  );
});
