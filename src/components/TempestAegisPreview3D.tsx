import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { buildTempestAegisM249, TempestAegisVfxPool } from '../game/tempestAegis3d';
import { attachSharedPreview, type SharedPreviewAttachment } from '../game/sharedPreviewRenderer';
import { computeTempestInspectPose, computeTempestEmoteViewPose } from '../game/animations';
import { MYTHIC_PERK_SUMMARY_FA } from '../game/mythicPerks';

interface TempestAegisPreview3DProps {
  reducedMotion?: boolean;
  compact?: boolean;
  showDemoControls?: boolean;
  showPerksSummary?: boolean;
  onTriggerShotSound?: (heat01: number) => void;
  onTriggerKillSound?: (headshot: boolean) => void;
  onTriggerReloadPhaseSound?: (phase: 'open' | 'swap' | 'close' | 'charge') => void;
  onTriggerInspectSound?: () => void;
  onTriggerEmoteSound?: () => void;
}

export const TempestAegisPreview3D: React.FC<TempestAegisPreview3DProps> = React.memo(({
  reducedMotion = false,
  compact = false,
  showDemoControls = true,
  showPerksSummary = true,
  onTriggerShotSound,
  onTriggerKillSound,
  onTriggerReloadPhaseSound,
  onTriggerInspectSound,
  onTriggerEmoteSound,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const actionsRef = useRef<{
    triggerBurst: () => void;
    triggerReload: () => void;
    triggerInspect: () => void;
    triggerKill: (headshot: boolean) => void;
    triggerEmote: () => void;
  } | null>(null);

  const [webglFailed, setWebglFailed] = useState(false);
  const [edgeFlash, setEdgeFlash] = useState<'none' | 'normal' | 'headshot'>('none');
  const [activeDemoLabel, setActiveDemoLabel] = useState<string | null>(null);
  const [demoKills, setDemoKills] = useState(7);

  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;
  const onShotSoundRef = useRef(onTriggerShotSound);
  onShotSoundRef.current = onTriggerShotSound;
  const onReloadSoundRef = useRef(onTriggerReloadPhaseSound);
  onReloadSoundRef.current = onTriggerReloadPhaseSound;

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
        const h = Math.max(145, host.clientHeight || (compact ? 185 : 235));
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(35, w / h, 0.05, 25);
        camera.position.set(0.06, 0.14, 1.32);
        camera.lookAt(0, 0.01, 0);

        const hemi = new THREE.HemisphereLight(0xf8fafc, 0x26081a, 1.05);
        const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
        keyLight.position.set(2.4, 2.8, 2.2);
        const crimsonRim = new THREE.DirectionalLight(0xff2a55, 2.05);
        crimsonRim.position.set(-2.5, 1.3, -1.6);
        const prismFill = new THREE.DirectionalLight(0x38bdf8, 1.4);
        prismFill.position.set(1.8, -0.9, -2.0);
        scene.add(hemi, keyLight, crimsonRim, prismFill);

        const baseRingGeo = new THREE.RingGeometry(0.34, 0.39, 28);
        const baseRingMat = new THREE.MeshBasicMaterial({
          color: 0xff2a55,
          transparent: true,
          opacity: 0.34,
          side: THREE.DoubleSide,
        });
        const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
        baseRing.rotation.x = -Math.PI / 2;
        baseRing.position.set(0, -0.24, 0);
        scene.add(baseRing);

        const pivot = new THREE.Group();
        scene.add(pivot);

        const lmg = buildTempestAegisM249({
          includeHands: false,
          maxAnisotropy: 2,
        });
        lmg.setKillCount(7);
        lmg.group.position.set(-0.04, 0.01, 0.08);
        lmg.group.rotation.y = Math.PI / 2;
        pivot.add(lmg.group);

        const flashGeo = new THREE.OctahedronGeometry(0.068, 0);
        const flashMat = new THREE.MeshBasicMaterial({
          color: 0xff6b8b,
          transparent: true,
          opacity: 0.94,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const flashMesh = new THREE.Mesh(flashGeo, flashMat);
        flashMesh.position.copy(lmg.muzzlePos);
        flashMesh.visible = false;
        lmg.group.add(flashMesh);

        const vfx = new TempestAegisVfxPool(scene);

        const _muzzleWorld = new THREE.Vector3();
        const _beamEndWorld = new THREE.Vector3();
        const _muzzleQuat = new THREE.Quaternion();
        const _forwardDir = new THREE.Vector3();
        const _shellOrigin = new THREE.Vector3();
        const _shellRight = new THREE.Vector3();
        const _killWorld = new THREE.Vector3(0, -0.45, 0.08);
        const _ringColor = new THREE.Color();

        let flashTimer = 0;
        let kickAmt = 0;
        let yawAngle = -0.36;
        let dragActive = false;
        let lastPtrX = 0;
        let elapsedLocal = 0;

        let burstRemaining = 0;
        let burstCooldown = 0;
        let reloadProgress = -1;
        let lastReloadPhase: string = 'idle';
        let inspectProgress = -1;
        let emoteProgress = -1;
        let localKillCounter = 7;

        const fireOneDemoShot = () => {
          lmg.triggerShot();
          flashTimer = 0.075;
          kickAmt = 0.042;
          flashMesh.visible = true;
          const heat = lmg.getHeat01();
          flashMat.color.setHSL((elapsedLocal * 0.9 + heat * 0.5) % 1, 0.95, 0.68);
          flashMesh.scale.set(1.25 + heat * 0.65, 1.25 + heat * 0.65, 2.5 + heat * 1.1);

          flashMesh.getWorldPosition(_muzzleWorld);
          lmg.group.getWorldQuaternion(_muzzleQuat);
          _forwardDir.set(0, 0, -1).applyQuaternion(_muzzleQuat).normalize();
          _beamEndWorld.copy(_muzzleWorld).addScaledVector(_forwardDir, 1.6);
          _shellOrigin.copy(_muzzleWorld).addScaledVector(_forwardDir, -0.52);
          _shellRight.set(1, 0.35, 0).applyQuaternion(_muzzleQuat).normalize();

          vfx.spawnShotEffects(_muzzleWorld, _beamEndWorld, heat, {
            reducedMotion: reducedMotionRef.current,
            lowQuality: false,
            shellOrigin: _shellOrigin,
            shellRightDir: _shellRight,
          });
          onShotSoundRef.current?.(heat);
        };

        actionsRef.current = {
          triggerBurst: () => {
            reloadProgress = -1;
            inspectProgress = -1;
            emoteProgress = -1;
            lmg.applyCinematicReload(0);
            burstRemaining = 7;
            burstCooldown = 0;
          },
          triggerReload: () => {
            burstRemaining = 0;
            inspectProgress = -1;
            emoteProgress = -1;
            reloadProgress = 0.001;
            lastReloadPhase = 'idle';
          },
          triggerInspect: () => {
            burstRemaining = 0;
            reloadProgress = -1;
            emoteProgress = -1;
            lmg.applyCinematicReload(0);
            inspectProgress = 0.001;
          },
          triggerKill: (headshot: boolean) => {
            localKillCounter += 1;
            lmg.setKillCount(localKillCounter);
            setDemoKills(localKillCounter);
            _killWorld.set(0, -0.52, 0.08);
            vfx.spawnKillEffect(_killWorld, {
              headshot,
              reducedMotion: reducedMotionRef.current,
              lowQuality: false,
            });
          },
          triggerEmote: () => {
            burstRemaining = 0;
            reloadProgress = -1;
            inspectProgress = -1;
            lmg.applyCinematicReload(0);
            emoteProgress = 0.001;
          },
        };

        const attachment: SharedPreviewAttachment | null = attachSharedPreview({
          container: host,
          scene,
          camera,
          toneMappingExposure: 1.2,
          onFrame: (dt, elapsed) => {
            elapsedLocal = elapsed;
            if (!dragActive && !reducedMotionRef.current && reloadProgress < 0 && inspectProgress < 0) {
              yawAngle += dt * 0.44;
            }

            if (burstRemaining > 0) {
              burstCooldown -= dt;
              if (burstCooldown <= 0) {
                fireOneDemoShot();
                burstRemaining -= 1;
                burstCooldown = 0.095;
              }
            }

            let extraPitch = 0;
            let extraYaw = 0;
            let extraRoll = 0;
            let extraY = 0;

            if (reloadProgress >= 0) {
              reloadProgress += dt / 3.2;
              if (reloadProgress >= 1) {
                reloadProgress = -1;
                lmg.applyCinematicReload(0);
                setActiveDemoLabel(null);
              } else {
                const rel = lmg.applyCinematicReload(reloadProgress);
                extraPitch = rel.weaponPitchOffset * 0.85;
                extraRoll = rel.weaponRollOffset * 0.65;
                extraY = rel.weaponDropOffset * 0.65;
                if (rel.phase !== lastReloadPhase) {
                  lastReloadPhase = rel.phase;
                  if (rel.phase === 'open') onReloadSoundRef.current?.('open');
                  else if (rel.phase === 'swap') onReloadSoundRef.current?.('swap');
                  else if (rel.phase === 'close') onReloadSoundRef.current?.('close');
                  else if (rel.phase === 'charge') onReloadSoundRef.current?.('charge');
                }
              }
            }

            if (inspectProgress >= 0) {
              inspectProgress += dt / 2.4;
              if (inspectProgress >= 1) {
                inspectProgress = -1;
                setActiveDemoLabel(null);
              } else {
                const pose = computeTempestInspectPose(inspectProgress);
                extraPitch = pose.pitchX;
                extraYaw = pose.yawY;
                extraRoll = pose.rollZ;
                extraY = pose.offsetY;
              }
            }

            if (emoteProgress >= 0) {
              emoteProgress += dt / 3.0;
              if (emoteProgress >= 1) {
                emoteProgress = -1;
                setActiveDemoLabel(null);
              } else {
                const pose = computeTempestEmoteViewPose(emoteProgress);
                extraPitch = pose.pitchX * 1.1;
                extraYaw = pose.yawY * 1.25 + emoteProgress * Math.PI * 2;
                extraRoll = pose.rollZ * 1.1;
                extraY = pose.offsetY * 1.3;
              }
            }

            pivot.rotation.set(extraPitch, yawAngle + extraYaw, extraRoll);
            pivot.position.y = (reducedMotionRef.current ? 0 : Math.sin(elapsed * 1.85) * 0.014) + extraY;

            if (kickAmt > 0.0005) {
              kickAmt *= Math.exp(-15 * dt);
              lmg.group.position.x = -0.04 - kickAmt;
            } else {
              lmg.group.position.x = -0.04;
            }

            if (flashTimer > 0) {
              flashTimer -= dt;
              flashMesh.rotation.z += dt * 24;
              if (flashTimer <= 0) flashMesh.visible = false;
            }

            if (!reducedMotionRef.current) {
              _ringColor.setHSL((elapsed * 0.16) % 1, 0.9, 0.62);
              baseRingMat.color.copy(_ringColor);
              baseRing.rotation.z = elapsed * 0.45;
            }

            lmg.updateAnimation(dt, elapsed, !reducedMotionRef.current);
            vfx.update(dt);
          },
        });

        if (!attachment) {
          lmg.dispose();
          vfx.dispose();
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
          lmg.dispose();
          vfx.dispose();
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

  const handleBurst = () => {
    setActiveDemoLabel('شلیک پیوسته · داغ‌شدن شیارها و ردگلوله رنگین‌کمانی');
    actionsRef.current?.triggerBurst();
    window.setTimeout(() => setActiveDemoLabel((cur) => (cur?.includes('شلیک') ? null : cur)), 1100);
  };

  const handleReload = () => {
    setActiveDemoLabel('ریلود سینمایی (باز شدن کاور ← تعویض جعبه ← بستن و مسلح‌کردن)');
    actionsRef.current?.triggerReload();
  };

  const handleInspect = () => {
    setActiveDemoLabel('نمایش سلاح (Inspect)');
    actionsRef.current?.triggerInspect();
    onTriggerInspectSound?.();
  };

  const handleKill = (headshot: boolean) => {
    setActiveDemoLabel(headshot ? 'افکت هدشات میتیک (موج گرانشی + رعدوبرق)' : 'افکت کشتن میتیک (موج گرانشی + رعدوبرق)');
    actionsRef.current?.triggerKill(headshot);
    onTriggerKillSound?.(headshot);
    setEdgeFlash(headshot ? 'headshot' : 'normal');
    window.setTimeout(() => setEdgeFlash('none'), headshot ? 560 : 420);
    window.setTimeout(() => setActiveDemoLabel((cur) => (cur?.includes('افکت') ? null : cur)), 1050);
  };

  const handleEmote = () => {
    setActiveDemoLabel('ایموت اختصاصی میتیک (۳ ثانیه)');
    actionsRef.current?.triggerEmote();
    onTriggerEmoteSound?.();
  };

  return (
    <div
      className={`tempest-preview-shell${compact ? ' is-compact' : ''}`}
      data-testid="tempest-3d-preview"
    >
      <div className="tempest-preview-stage">
        {webglFailed ? (
          <div className="tempest-preview-fallback">
            <div className="tempest-fallback-title">MYTHIC · TEMPEST AEGIS</div>
            <div className="tempest-fallback-sub">M249 SAW · کروم، سفید و قرمز هولوگرافیک</div>
          </div>
        ) : (
          <div ref={mountRef} className="tempest-preview-canvas-mount" />
        )}

        <div className="tempest-preview-badge-top" dir="ltr">
          <span>✧ MYTHIC · M249 SAW</span>
          <span className="tempest-preview-kill-chip">KILLS {String(demoKills).padStart(2, '0')}</span>
        </div>

        <div className="tempest-preview-hint">
          {activeDemoLabel || 'برای چرخش سلاح بکشید · شمارنده کشتن زنده روی بدنه'}
        </div>

        {edgeFlash !== 'none' && (
          <div
            className={`tempest-preview-edge-flash${edgeFlash === 'headshot' ? ' is-hs' : ''}`}
            aria-hidden="true"
          />
        )}
      </div>

      {showDemoControls && (
        <div className="tempest-demo-controls" dir="rtl">
          <button
            type="button"
            className="tempest-demo-btn"
            data-testid="btn-tempest-demo-burst"
            onClick={handleBurst}
          >
            شلیک پیوسته
          </button>
          <button
            type="button"
            className="tempest-demo-btn"
            data-testid="btn-tempest-demo-reload"
            onClick={handleReload}
          >
            ریلود سینمایی
          </button>
          <button
            type="button"
            className="tempest-demo-btn"
            data-testid="btn-tempest-demo-inspect"
            onClick={handleInspect}
          >
            نمایش سلاح
          </button>
          <button
            type="button"
            className="tempest-demo-btn is-crimson"
            data-testid="btn-tempest-demo-kill"
            onClick={() => handleKill(false)}
          >
            افکت کشتن
          </button>
          <button
            type="button"
            className="tempest-demo-btn is-crimson"
            data-testid="btn-tempest-demo-hs"
            onClick={() => handleKill(true)}
          >
            هدشات
          </button>
          <button
            type="button"
            className="tempest-demo-btn is-prism"
            data-testid="btn-tempest-demo-emote"
            onClick={handleEmote}
          >
            ایموت (رقص)
          </button>
        </div>
      )}

      {showPerksSummary && (
        <div className="mythic-perks-card" dir="rtl" data-testid="mythic-perks-summary">
          <div className="mythic-perks-head">
            <span>مزایای محدود میتیک (فقط هنگام انتخاب روی M249)</span>
          </div>
          <ul className="mythic-perks-list">
            {MYTHIC_PERK_SUMMARY_FA.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});
