import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildEclipseBreacherSpas12, EclipseBreacherVfxPool } from '../game/eclipseBreacher3d';
import { computeEclipseInspectPose, computeEclipseEmoteViewPose } from '../game/animations';
import { MYTHIC_SHOTGUN_PERK_SUMMARY_FA } from '../game/mythicPerks';
import { EclipseShotgunSight } from './EclipseShotgunSight';

interface EclipseBreacherPreview3DProps {
  reducedMotion?: boolean;
  compact?: boolean;
  showDemoControls?: boolean;
  showPerksSummary?: boolean;
  onTriggerShotSound?: () => void;
  onTriggerKillSound?: (headshot: boolean) => void;
  onTriggerReloadPhaseSound?: (phase: 'shell' | 'pump') => void;
  onTriggerSightSound?: (entering: boolean) => void;
  onTriggerInspectSound?: () => void;
  onTriggerEmoteSound?: () => void;
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

export const EclipseBreacherPreview3D: React.FC<EclipseBreacherPreview3DProps> = ({
  reducedMotion = false,
  compact = false,
  showDemoControls = true,
  showPerksSummary = true,
  onTriggerShotSound,
  onTriggerKillSound,
  onTriggerReloadPhaseSound,
  onTriggerSightSound,
  onTriggerInspectSound,
  onTriggerEmoteSound,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const actionsRef = useRef<{
    triggerShot: () => void;
    triggerReload: () => void;
    triggerInspect: () => void;
    triggerKill: (headshot: boolean) => void;
    triggerEmote: () => void;
  } | null>(null);

  const [webglFailed, setWebglFailed] = useState(false);
  const [edgeFlash, setEdgeFlash] = useState<'none' | 'normal' | 'headshot'>('none');
  const [sightPreviewOpen, setSightPreviewOpen] = useState(false);
  const [activeDemoLabel, setActiveDemoLabel] = useState<string | null>(null);
  const [demoKills, setDemoKills] = useState(9);

  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;
  const onShotSoundRef = useRef(onTriggerShotSound);
  onShotSoundRef.current = onTriggerShotSound;
  const onReloadSoundRef = useRef(onTriggerReloadPhaseSound);
  onReloadSoundRef.current = onTriggerReloadPhaseSound;

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
    renderer.toneMappingExposure = 1.24;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 1.2));
    renderer.shadowMap.enabled = false;

    const w = Math.max(240, container.clientWidth || 360);
    const h = Math.max(155, container.clientHeight || (compact ? 185 : 235));
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
    camera.position.set(0.04, 0.13, 1.18);
    camera.lookAt(0, 0.01, 0);

    // Obsidian-gold eclipse 3-point studio lighting (zero shadow maps, fast on mobile)
    const hemi = new THREE.HemisphereLight(0xfffbeb, 0x1a1208, 0.95);
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.3);
    keyLight.position.set(2.3, 2.6, 2.1);
    const goldRim = new THREE.DirectionalLight(0xf59e0b, 2.4);
    goldRim.position.set(-2.4, 1.2, -1.5);
    const holoFill = new THREE.DirectionalLight(0x38bdf8, 1.15);
    holoFill.position.set(1.8, -0.8, -1.9);
    scene.add(hemi, keyLight, goldRim, holoFill);

    // Subtle Mythic golden eclipse pedestal ring
    const baseRingGeo = new THREE.RingGeometry(0.32, 0.37, 40);
    const baseRingMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
    });
    const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
    baseRing.rotation.x = -Math.PI / 2;
    baseRing.position.set(0, -0.22, 0);
    scene.add(baseRing);

    const pivot = new THREE.Group();
    scene.add(pivot);

    const shotgun = buildEclipseBreacherSpas12({
      includeHands: false,
      maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
    });
    shotgun.setKillCount(9);
    shotgun.group.position.set(-0.04, 0.01, 0.06);
    shotgun.group.rotation.y = Math.PI / 2;
    pivot.add(shotgun.group);

    // Golden-solar eclipse muzzle flash octahedron for demo blasts
    const flashGeo = new THREE.OctahedronGeometry(0.072, 0);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffd15c,
      transparent: true,
      opacity: 0.94,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const flashMesh = new THREE.Mesh(flashGeo, flashMat);
    flashMesh.position.copy(shotgun.muzzlePos);
    flashMesh.visible = false;
    shotgun.group.add(flashMesh);

    const vfx = new EclipseBreacherVfxPool(scene);

    // Reusable scratch vectors (zero per-frame allocations)
    const _muzzleWorld = new THREE.Vector3();
    const _muzzleQuat = new THREE.Quaternion();
    const _forwardDir = new THREE.Vector3();
    const _rightDir = new THREE.Vector3();
    const _upDir = new THREE.Vector3();
    const _pelletEnd0 = new THREE.Vector3();
    const _pelletEnd1 = new THREE.Vector3();
    const _pelletEnd2 = new THREE.Vector3();
    const _shellOrigin = new THREE.Vector3();
    const _shellRight = new THREE.Vector3();
    const _killWorld = new THREE.Vector3(0, -0.44, 0.06);
    const _ringColor = new THREE.Color();

    let flashTimer = 0;
    let kickAmt = 0;
    let pumpCycleTimer = 0;
    let yawAngle = -0.34;
    let dragActive = false;
    let lastPtrX = 0;

    // Interactive demo timelines
    let reloadProgress = -1;
    let lastReloadPhase: string = 'idle';
    let lastReloadShellIndex = -1;
    let inspectProgress = -1;
    let emoteProgress = -1;
    let localKillCounter = 9;

    const fireOneDemoBlast = () => {
      shotgun.triggerShot();
      flashTimer = 0.09;
      kickAmt = 0.068;
      pumpCycleTimer = 0.34;
      flashMesh.visible = true;
      flashMesh.scale.set(1.5, 1.5, 2.7);

      flashMesh.getWorldPosition(_muzzleWorld);
      shotgun.group.getWorldQuaternion(_muzzleQuat);
      _forwardDir.set(0, 0, -1).applyQuaternion(_muzzleQuat).normalize();
      _rightDir.set(1, 0, 0).applyQuaternion(_muzzleQuat).normalize();
      _upDir.set(0, 1, 0).applyQuaternion(_muzzleQuat).normalize();

      _pelletEnd0.copy(_muzzleWorld).addScaledVector(_forwardDir, 1.5);
      _pelletEnd1
        .copy(_muzzleWorld)
        .addScaledVector(_forwardDir, 1.45)
        .addScaledVector(_rightDir, 0.14)
        .addScaledVector(_upDir, 0.08);
      _pelletEnd2
        .copy(_muzzleWorld)
        .addScaledVector(_forwardDir, 1.45)
        .addScaledVector(_rightDir, -0.14)
        .addScaledVector(_upDir, -0.07);

      _shellOrigin.copy(_muzzleWorld).addScaledVector(_forwardDir, -0.44);
      _shellRight.copy(_rightDir).addScaledVector(_upDir, 0.4).normalize();

      vfx.spawnShotEffects(_muzzleWorld, [_pelletEnd0, _pelletEnd1, _pelletEnd2], {
        reducedMotion: reducedMotionRef.current,
        lowQuality: false,
        shellOrigin: _shellOrigin,
        shellRightDir: _shellRight,
      });
      onShotSoundRef.current?.();
    };

    actionsRef.current = {
      triggerShot: () => {
        reloadProgress = -1;
        inspectProgress = -1;
        emoteProgress = -1;
        shotgun.applyCinematicReload(0);
        fireOneDemoBlast();
      },
      triggerReload: () => {
        inspectProgress = -1;
        emoteProgress = -1;
        reloadProgress = 0.001;
        lastReloadPhase = 'idle';
        lastReloadShellIndex = -1;
      },
      triggerInspect: () => {
        reloadProgress = -1;
        emoteProgress = -1;
        shotgun.applyCinematicReload(0);
        inspectProgress = 0.001;
      },
      triggerKill: (headshot: boolean) => {
        localKillCounter += 1;
        shotgun.setKillCount(localKillCounter);
        setDemoKills(localKillCounter);
        _killWorld.set(0, -0.48, 0.06);
        vfx.spawnKillEffect(_killWorld, {
          headshot,
          reducedMotion: reducedMotionRef.current,
          lowQuality: false,
        });
      },
      triggerEmote: () => {
        reloadProgress = -1;
        inspectProgress = -1;
        shotgun.applyCinematicReload(0);
        emoteProgress = 0.001;
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
      const nh = Math.max(145, container.clientHeight);
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
    const tick = () => {
      if (disposed || !isVisible || document.hidden) return;
      const now = performance.now();
      const dt = Math.min(0.06, Math.max(0.004, (now - lastTime) / 1000));
      lastTime = now;
      elapsed += dt;

      if (!dragActive && !reducedMotionRef.current && reloadProgress < 0 && inspectProgress < 0) {
        yawAngle += dt * 0.42;
      }

      let extraPitch = 0;
      let extraYaw = 0;
      let extraRoll = 0;
      let extraY = 0;

      // Cinematic Reload Demo (~1.70s matching real Mythic SPAS-12 duration)
      if (reloadProgress >= 0) {
        reloadProgress += dt / 1.72;
        if (reloadProgress >= 1) {
          reloadProgress = -1;
          shotgun.applyCinematicReload(0);
          setActiveDemoLabel(null);
        } else {
          const rel = shotgun.applyCinematicReload(reloadProgress);
          extraPitch = rel.weaponPitchOffset * 0.9;
          extraRoll = rel.weaponRollOffset * 0.72;
          extraY = rel.weaponDropOffset * 0.65;
          if (rel.phase !== lastReloadPhase) {
            if (rel.phase === 'shell_1' || rel.phase === 'shell_2' || rel.phase === 'shell_3') {
              onReloadSoundRef.current?.('shell');
            } else if (rel.phase === 'pump') {
              onReloadSoundRef.current?.('pump');
            }
            lastReloadPhase = rel.phase;
          }
        }
      }

      // Custom Inspect Demo (~2.4s)
      if (inspectProgress >= 0) {
        inspectProgress += dt / 2.4;
        if (inspectProgress >= 1) {
          inspectProgress = -1;
          setActiveDemoLabel(null);
        } else {
          const pose = computeEclipseInspectPose(inspectProgress);
          extraPitch = pose.pitchX;
          extraYaw = pose.yawY;
          extraRoll = pose.rollZ;
          extraY = pose.offsetY;
        }
      }

      // Exclusive Mythic Emote Demo (~3.0s)
      if (emoteProgress >= 0) {
        emoteProgress += dt / 3.0;
        if (emoteProgress >= 1) {
          emoteProgress = -1;
          setActiveDemoLabel(null);
        } else {
          const pose = computeEclipseEmoteViewPose(emoteProgress);
          extraPitch = pose.pitchX * 1.1;
          extraYaw = pose.yawY * 1.2 + emoteProgress * Math.PI * 2;
          extraRoll = pose.rollZ * 1.1;
          extraY = pose.offsetY * 1.25;
        }
      }

      pivot.rotation.set(extraPitch, yawAngle + extraYaw, extraRoll);
      pivot.position.y = (reducedMotionRef.current ? 0 : Math.sin(elapsed * 1.75) * 0.014) + extraY;

      if (kickAmt > 0.0005) {
        kickAmt *= Math.exp(-13 * dt);
        shotgun.group.position.x = -0.04 - kickAmt;
      } else {
        shotgun.group.position.x = -0.04;
      }

      if (pumpCycleTimer > 0 && reloadProgress < 0) {
        pumpCycleTimer = Math.max(0, pumpCycleTimer - dt);
        const p = 1 - pumpCycleTimer / 0.34;
        const pumpPull = Math.sin(p * Math.PI) * 0.075;
        shotgun.pump.position.z = -0.22 + pumpPull;
      } else if (reloadProgress < 0) {
        shotgun.pump.position.z = -0.22;
      }

      if (flashTimer > 0) {
        flashTimer -= dt;
        flashMesh.rotation.z += dt * 26;
        if (flashTimer <= 0) flashMesh.visible = false;
      }

      // Golden-solar eclipse pedestal ring pulse
      if (!reducedMotionRef.current) {
        const hue = 0.095 + Math.sin(elapsed * 1.1) * 0.035;
        _ringColor.setHSL(hue, 0.94, 0.58);
        baseRingMat.color.copy(_ringColor);
        baseRing.rotation.z = -elapsed * 0.5;
      }

      shotgun.updateAnimation(dt, elapsed, !reducedMotionRef.current);
      vfx.update(dt);
      renderer.render(scene, camera);

      schedulePreviewFrame();
    };

    const schedulePreviewFrame = () => {
      if (disposed || !isVisible || document.hidden) return;
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
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

    if (isSoftwareGl) {
      tick();
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVisChange);
      ro?.disconnect();
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      actionsRef.current = null;
      shotgun.dispose();
      vfx.dispose();
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

  const handleShot = () => {
    setActiveDemoLabel('شلیک اکلیپس · شعله طلایی، ردگلوله درخشان و پوکه نورانی');
    actionsRef.current?.triggerShot();
    window.setTimeout(() => setActiveDemoLabel((cur) => (cur?.includes('شلیک') ? null : cur)), 1100);
  };

  const handleReload = () => {
    setSightPreviewOpen(false);
    setActiveDemoLabel('ریلود سینمایی (فشنگ‌های نورانی چرخان ← پمپ نهایی با موج)');
    actionsRef.current?.triggerReload();
  };

  const handleToggleSight = () => {
    const next = !sightPreviewOpen;
    setSightPreviewOpen(next);
    onTriggerSightSound?.(next);
    setActiveDemoLabel(next ? 'دید هولوگرافیک ماه‌گرفتگی (Eclipse ADS · فقط ظاهری)' : null);
  };

  const handleInspect = () => {
    setSightPreviewOpen(false);
    setActiveDemoLabel('نمایش سلاح (Inspect · سیاهچاله لوله و شمارنده هولوگرافیک)');
    actionsRef.current?.triggerInspect();
    onTriggerInspectSound?.();
  };

  const handleKill = (headshot: boolean) => {
    setActiveDemoLabel(headshot ? 'انفجار ابرنواختر هدشات (Supernova + موج)' : 'انفجار ابرنواختر (Supernova + ذرات طلایی)');
    actionsRef.current?.triggerKill(headshot);
    onTriggerKillSound?.(headshot);
    setEdgeFlash(headshot ? 'headshot' : 'normal');
    window.setTimeout(() => setEdgeFlash('none'), headshot ? 560 : 420);
    window.setTimeout(() => setActiveDemoLabel((cur) => (cur?.includes('ابرنواختر') ? null : cur)), 1100);
  };

  const handleEmote = () => {
    setSightPreviewOpen(false);
    setActiveDemoLabel('ایموت اختصاصی اکلیپس (۳ ثانیه)');
    actionsRef.current?.triggerEmote();
    onTriggerEmoteSound?.();
  };

  return (
    <div
      className={`eclipse-preview-shell${compact ? ' is-compact' : ''}`}
      data-testid="eclipse-3d-preview"
    >
      <div className="eclipse-preview-stage">
        {webglFailed ? (
          <div className="eclipse-preview-fallback">
            <div className="eclipse-fallback-title">MYTHIC · ECLIPSE BREACHER</div>
            <div className="eclipse-fallback-sub">SPAS-12 · مشکی اوبسیدین، حکاکی طلایی و سیاهچاله لوله</div>
          </div>
        ) : (
          <div ref={mountRef} className="eclipse-preview-canvas-mount" />
        )}

        {sightPreviewOpen && (
          <EclipseShotgunSight previewMode simplified={reducedMotion} />
        )}

        <div className="eclipse-preview-badge-top" dir="ltr">
          <span>☀ MYTHIC · SPAS-12 BREACHER</span>
          <span className="eclipse-preview-kill-chip">KILLS {String(demoKills).padStart(2, '0')}</span>
        </div>

        <div className="eclipse-preview-hint">
          {activeDemoLabel || 'برای چرخش سلاح بکشید · سیاهچاله لوله و شمارنده کشتن زنده'}
        </div>

        {edgeFlash !== 'none' && (
          <div
            className={`eclipse-preview-edge-flash${edgeFlash === 'headshot' ? ' is-hs' : ''}`}
            aria-hidden="true"
          />
        )}
      </div>

      {showDemoControls && (
        <div className="eclipse-demo-controls" dir="rtl">
          <button
            type="button"
            className="eclipse-demo-btn"
            data-testid="btn-eclipse-demo-shot"
            onClick={handleShot}
          >
            شلیک شاتگان
          </button>
          <button
            type="button"
            className="eclipse-demo-btn"
            data-testid="btn-eclipse-demo-reload"
            onClick={handleReload}
          >
            ریلود سینمایی
          </button>
          <button
            type="button"
            className={`eclipse-demo-btn is-gold${sightPreviewOpen ? ' is-active' : ''}`}
            data-testid="btn-eclipse-demo-sight"
            onClick={handleToggleSight}
          >
            {sightPreviewOpen ? 'بستن دید ADS' : 'دید ماه‌گرفتگی'}
          </button>
          <button
            type="button"
            className="eclipse-demo-btn"
            data-testid="btn-eclipse-demo-inspect"
            onClick={handleInspect}
          >
            نمایش سلاح
          </button>
          <button
            type="button"
            className="eclipse-demo-btn is-solar"
            data-testid="btn-eclipse-demo-kill"
            onClick={() => handleKill(false)}
          >
            ابرنواختر (کشتن)
          </button>
          <button
            type="button"
            className="eclipse-demo-btn is-solar"
            data-testid="btn-eclipse-demo-hs"
            onClick={() => handleKill(true)}
          >
            هدشات
          </button>
          <button
            type="button"
            className="eclipse-demo-btn is-prism"
            data-testid="btn-eclipse-demo-emote"
            onClick={handleEmote}
          >
            ایموت اختصاصی
          </button>
        </div>
      )}

      {showPerksSummary && (
        <div className="mythic-perks-card is-eclipse" dir="rtl" data-testid="eclipse-perks-summary">
          <div className="mythic-perks-head">
            <span>مزایای محدود میتیک (فقط هنگام انتخاب روی SPAS-12)</span>
          </div>
          <ul className="mythic-perks-list">
            {MYTHIC_SHOTGUN_PERK_SUMMARY_FA.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
