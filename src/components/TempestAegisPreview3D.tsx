import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildTempestAegisM249, TempestAegisVfxPool } from '../game/tempestAegis3d';
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

export const TempestAegisPreview3D: React.FC<TempestAegisPreview3DProps> = ({
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
    renderer.toneMappingExposure = 1.2;
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

    const camera = new THREE.PerspectiveCamera(35, w / h, 0.05, 25);
    camera.position.set(0.06, 0.14, 1.32);
    camera.lookAt(0, 0.01, 0);

    // Prismatic crimson-white-chrome 3-point studio lighting (zero shadow maps, fast on mobile)
    const hemi = new THREE.HemisphereLight(0xf8fafc, 0x26081a, 1.0);
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.35);
    keyLight.position.set(2.4, 2.8, 2.2);
    const crimsonRim = new THREE.DirectionalLight(0xff2a55, 2.0);
    crimsonRim.position.set(-2.5, 1.3, -1.6);
    const prismFill = new THREE.DirectionalLight(0x38bdf8, 1.35);
    prismFill.position.set(1.8, -0.9, -2.0);
    scene.add(hemi, keyLight, crimsonRim, prismFill);

    // Subtle Mythic holographic pedestal ring
    const baseRingGeo = new THREE.RingGeometry(0.34, 0.39, 36);
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
      maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
    });
    lmg.setKillCount(7);
    lmg.group.position.set(-0.04, 0.01, 0.08);
    lmg.group.rotation.y = Math.PI / 2;
    pivot.add(lmg.group);

    // Large prismatic muzzle flash octahedron for demo bursts
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

    // Reusable scratch vectors (zero per-frame allocations)
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

    // Interactive demo timelines
    let burstRemaining = 0;
    let burstCooldown = 0;
    let reloadProgress = -1; // 0..1 when active
    let lastReloadPhase: string = 'idle';
    let inspectProgress = -1; // 0..1 when active
    let emoteProgress = -1; // 0..1 when active
    let localKillCounter = 7;

    const fireOneDemoShot = () => {
      lmg.triggerShot();
      flashTimer = 0.075;
      kickAmt = 0.042;
      flashMesh.visible = true;
      const heat = lmg.getHeat01();
      flashMat.color.setHSL((elapsed * 0.9 + heat * 0.5) % 1, 0.95, 0.68);
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
        yawAngle += dt * 0.44;
      }

      // Sustained burst firing demo
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

      // Cinematic Reload Demo (3.2s matching real M249 duration)
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

      // Custom Inspect Demo (~2.4s)
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

      // Exclusive Mythic Emote Flourish Demo (~3.0s)
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

      // Iridescent pedestal ring color shift
      if (!reducedMotionRef.current) {
        _ringColor.setHSL((elapsed * 0.16) % 1, 0.9, 0.62);
        baseRingMat.color.copy(_ringColor);
        baseRing.rotation.z = elapsed * 0.45;
      }

      lmg.updateAnimation(dt, elapsed, !reducedMotionRef.current);
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
      lmg.dispose();
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
};
