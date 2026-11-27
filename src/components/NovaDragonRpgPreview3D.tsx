import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { buildNovaDragonRpg3D, NovaDragonVfxPool } from '../game/novaDragonRpg3d';
import { attachSharedPreview, type SharedPreviewAttachment } from '../game/sharedPreviewRenderer';

interface NovaDragonRpgPreview3DProps {
  reducedMotion?: boolean;
  compact?: boolean;
  onTriggerLaunchSound?: () => void;
  onTriggerExplosionSound?: () => void;
  onTriggerKillSound?: (headshot: boolean) => void;
  showDemoControls?: boolean;
}

export const NovaDragonRpgPreview3D: React.FC<NovaDragonRpgPreview3DProps> = React.memo(({
  reducedMotion = false,
  compact = false,
  onTriggerLaunchSound,
  onTriggerExplosionSound,
  onTriggerKillSound,
  showDemoControls = true,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const actionsRef = useRef<{
    triggerLaunch: () => void;
    triggerExplosion: () => void;
    triggerKill: () => void;
  } | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);
  const [edgeFlash, setEdgeFlash] = useState<'none' | 'launch' | 'explosion' | 'kill'>('none');
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
          camera.position.set(0.0, 0.14, 1.48);
          camera.lookAt(0.0, 0.01, 0.0);

          const hemi = new THREE.HemisphereLight(0xd1fae5, 0x0b1620, 1.25);
          const keyLight = new THREE.DirectionalLight(0xfffbeb, 2.7);
          keyLight.position.set(2.4, 2.6, 2.8);
          const emeraldRim = new THREE.DirectionalLight(0x10b981, 2.6);
          emeraldRim.position.set(-2.6, 1.4, -1.6);
          const goldRim = new THREE.DirectionalLight(0xfbbf24, 1.8);
          goldRim.position.set(1.8, -0.6, 1.8);
          scene.add(hemi, keyLight, emeraldRim, goldRim);

          // Glowing emerald-gold display pedestal ring
          const baseRingGeo = new THREE.RingGeometry(0.42, 0.48, 32);
          const baseRingMat = new THREE.MeshBasicMaterial({
            color: 0x10b981,
            transparent: true,
            opacity: 0.34,
            side: THREE.DoubleSide,
          });
          const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
          baseRing.rotation.x = -Math.PI / 2;
          baseRing.position.set(0, -0.22, 0);
          scene.add(baseRing);

          const pivot = new THREE.Group();
          scene.add(pivot);

          const rpg = buildNovaDragonRpg3D({
            includeHands: false,
            maxAnisotropy: 2,
          });
          // Orient tube horizontally across the showcase frame (warhead pointing right-forward)
          rpg.group.rotation.set(0.04, -Math.PI / 2, 0);
          rpg.group.position.set(-0.14, 0.0, 0.0);
          pivot.add(rpg.group);

          const vfx = new NovaDragonVfxPool(scene, 42);
          const _trailFrom = new THREE.Vector3();
          const _trailTo = new THREE.Vector3();
          const _blastCenter = new THREE.Vector3();

          let kickBack = 0;
          let yawAngle = 0.24;
          let dragActive = false;
          let lastPtrX = 0;

          actionsRef.current = {
            triggerLaunch: () => {
              kickBack = 0.1;
              rpg.triggerLaunch();
              _trailFrom.set(0.42, 0.02, 0.02);
              _trailTo.set(1.18, 0.04, 0.08);
              vfx.spawnRocketTrail(_trailFrom, _trailTo, 0.22, reducedMotionRef.current);
            },
            triggerExplosion: () => {
              rpg.triggerLaunch();
              _blastCenter.set(0.32, 0.03, 0.08);
              vfx.spawnNovaExplosion(_blastCenter, 0.11, reducedMotionRef.current);
            },
            triggerKill: () => {
              rpg.triggerLaunch();
              _blastCenter.set(0.0, -0.2, 0.08);
              vfx.spawnNovaKillEffect(_blastCenter, true, 0.12, reducedMotionRef.current);
            },
          };

          const attachment: SharedPreviewAttachment | null = attachSharedPreview({
            container: host,
            scene,
            camera,
            toneMappingExposure: 1.24,
            onFrame: (dt, elapsed) => {
              if (!dragActive && !reducedMotionRef.current) {
                yawAngle += dt * 0.42;
              }
              if (kickBack > 0.001) {
                kickBack *= Math.exp(-9.5 * dt);
              } else {
                kickBack = 0;
              }
              pivot.rotation.y = yawAngle;
              pivot.position.y = reducedMotionRef.current ? 0 : Math.sin(elapsed * 1.8) * 0.014;
              rpg.group.position.x = -0.14 - kickBack;
              rpg.updateAnimation(dt, elapsed, !reducedMotionRef.current);
              vfx.update(dt);
            },
          });

          if (!attachment) {
            rpg.dispose();
            vfx.dispose();
            baseRingGeo.dispose();
            baseRingMat.dispose();
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
            rpg.dispose();
            vfx.dispose();
            baseRingGeo.dispose();
            baseRingMat.dispose();
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

  const handleTestLaunch = () => {
    actionsRef.current?.triggerLaunch();
    onTriggerLaunchSound?.();
    if (!reducedMotion) {
      setEdgeFlash('launch');
      window.setTimeout(() => setEdgeFlash('none'), 240);
    }
  };

  const handleTestExplosion = () => {
    actionsRef.current?.triggerExplosion();
    onTriggerExplosionSound?.();
    if (!reducedMotion) {
      setEdgeFlash('explosion');
      window.setTimeout(() => setEdgeFlash('none'), 300);
    }
  };

  const handleTestKill = () => {
    actionsRef.current?.triggerKill();
    onTriggerKillSound?.(true);
    if (!reducedMotion) {
      setEdgeFlash('kill');
      window.setTimeout(() => setEdgeFlash('none'), 300);
    }
  };

  return (
    <div
      className={`inferno-3d-box${compact ? ' is-compact' : ''}`}
      data-testid="nova-rpg-preview-3d"
    >
      <div
        className="inferno-3d-stage"
        style={{
          borderColor: 'rgba(16, 185, 129, 0.48)',
          background:
            'radial-gradient(circle at 50% 44%, rgba(16, 185, 129, 0.22), rgba(7, 14, 19, 0.96) 72%)',
        }}
      >
        {webglFailed ? (
          <div className="inferno-3d-fallback" dir="rtl">
            <strong>Nova Dragon · Legendary RPG-7V</strong>
            <span>راکت‌انداز اژدهای نُوا با هسته پلاسمای زمردی، حلقه‌های ژیروسکوپ طلایی و انفجار ابرنواختری</span>
          </div>
        ) : (
          <div
            ref={mountRef}
            className="inferno-3d-canvas-mount"
            aria-label="پیش‌نمایش سه‌بعدی آرپی‌جی لجندری نُوا دِرَگون"
          />
        )}

        <div
          className="inferno-3d-badge"
          dir="ltr"
          style={{
            borderColor: 'rgba(16, 185, 129, 0.6)',
            background: 'rgba(6, 78, 59, 0.78)',
            color: '#a7f3d0',
          }}
        >
          ✦ LEGENDARY · NOVA DRAGON
        </div>
        <div className="inferno-3d-drag-hint" dir="rtl">
          برای چرخاندن بکشید
        </div>

        {edgeFlash !== 'none' && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              borderRadius: 'inherit',
              boxShadow:
                edgeFlash === 'kill'
                  ? 'inset 0 0 36px rgba(251, 191, 36, 0.65), inset 0 0 18px rgba(16, 185, 129, 0.7)'
                  : edgeFlash === 'explosion'
                    ? 'inset 0 0 42px rgba(16, 185, 129, 0.75)'
                    : 'inset 0 0 28px rgba(52, 211, 153, 0.55)',
            }}
          />
        )}
      </div>

      {showDemoControls && (
        <div className="inferno-3d-actions" dir="rtl">
          <button
            type="button"
            className="inferno-demo-btn"
            data-testid="btn-nova-rpg-test-launch"
            onClick={handleTestLaunch}
          >
            تست شلیک و رد پلاسما
          </button>
          <button
            type="button"
            className="inferno-demo-btn is-gold"
            data-testid="btn-nova-rpg-test-explosion"
            onClick={handleTestExplosion}
          >
            افکت انفجار نُوا
          </button>
          <button
            type="button"
            className="inferno-demo-btn is-hs"
            data-testid="btn-nova-rpg-test-kill"
            onClick={handleTestKill}
          >
            افکت کشتن لجندری
          </button>
        </div>
      )}
    </div>
  );
});
