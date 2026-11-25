import type { FxQualityTier, GfxPresetKind } from './animations';

/**
 * ============================================================================
 * PURE PERFORMANCE, ADAPTIVE QUALITY & COMPACT NETWORK CODEC MODULE
 * ============================================================================
 * Zero external dependencies. Strictly deterministic and unit-testable.
 * Preserves 100% of gameplay logic, damage, hitboxes, rounds, and PeerJS rules.
 */

// ---------------------------------------------------------------------------
// 1. PIXEL RATIO & SHADOW BUDGETING (Mobile-First)
// ---------------------------------------------------------------------------

export const MOBILE_MAX_PIXEL_RATIO = 1.5;
export const DESKTOP_MAX_PIXEL_RATIO = 2.0;

export function detectIsMobileDevice(
  userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '',
  maxTouchPoints = typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0,
  viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1280
): boolean {
  if (/Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(userAgent)) {
    return true;
  }
  return maxTouchPoints > 0 && viewportWidth <= 1024;
}

export function computeEffectivePixelRatio(params: {
  devicePixelRatio: number;
  resScale: number;
  preset: GfxPresetKind;
  isMobile: boolean;
  isSoftwareGl: boolean;
  autoQualityResScale?: number;
}): number {
  if (params.isSoftwareGl) return 1.0;

  const rawDpr = Number.isFinite(params.devicePixelRatio) && params.devicePixelRatio > 0 ? params.devicePixelRatio : 1.0;
  const rawResScale = Number.isFinite(params.resScale) ? Math.max(0.5, Math.min(1.5, params.resScale)) : 1.0;
  const aqScale =
    typeof params.autoQualityResScale === 'number' && Number.isFinite(params.autoQualityResScale)
      ? Math.max(0.6, Math.min(1.0, params.autoQualityResScale))
      : 1.0;

  let presetCap: number;
  if (params.isMobile) {
    presetCap =
      params.preset === 'potato'
        ? 0.9
        : params.preset === 'low'
          ? 1.15
          : params.preset === 'med'
            ? 1.35
            : MOBILE_MAX_PIXEL_RATIO;
  } else {
    presetCap =
      params.preset === 'potato'
        ? 1.0
        : params.preset === 'low'
          ? 1.25
          : params.preset === 'med'
            ? 1.5
            : params.preset === 'high'
              ? 1.75
              : DESKTOP_MAX_PIXEL_RATIO;
  }

  const hardCap = params.isMobile ? MOBILE_MAX_PIXEL_RATIO : DESKTOP_MAX_PIXEL_RATIO;
  const baseDpr = Math.min(rawDpr, presetCap, hardCap);
  const scaled = baseDpr * rawResScale * aqScale;
  return Math.round(Math.max(0.5, Math.min(hardCap, scaled)) * 100) / 100;
}

export type ShadowModeKind = 'off' | 'basic' | 'soft' | 'ultra';

export interface EffectiveShadowConfig {
  enabled: boolean;
  mapSize: number;
  frustumHalf: number;
  soft: boolean;
}

export function computeEffectiveShadowConfig(params: {
  shadowMode: ShadowModeKind;
  isMobile: boolean;
  isSoftwareGl: boolean;
  autoQualityStage: AdaptiveQualityStage;
  arenaHalf: number;
}): EffectiveShadowConfig {
  if (params.isSoftwareGl || params.shadowMode === 'off' || params.autoQualityStage >= 2) {
    return {
      enabled: false,
      mapSize: 512,
      frustumHalf: 24,
      soft: false,
    };
  }

  const clampedArena = Number.isFinite(params.arenaHalf) ? Math.max(16, params.arenaHalf) : 48;
  // Tighter shadow frustum keeps texel density crisp without rendering distant map corners
  const frustumHalf = params.isMobile
    ? Math.min(clampedArena + 2, 24)
    : Math.min(clampedArena + 2, 34);

  if (params.isMobile) {
    const mapSize = params.shadowMode === 'basic' ? 512 : 1024;
    return {
      enabled: true,
      mapSize,
      frustumHalf,
      soft: params.shadowMode === 'soft' || params.shadowMode === 'ultra',
    };
  }

  const mapSize = params.shadowMode === 'ultra' ? 2048 : params.shadowMode === 'soft' ? 1024 : 512;
  return {
    enabled: true,
    mapSize,
    frustumHalf,
    soft: params.shadowMode === 'soft' || params.shadowMode === 'ultra',
  };
}

// ---------------------------------------------------------------------------
// 2. MULTI-STAGE ADAPTIVE AUTO QUALITY (Stage 0 -> FX -> Shadows -> Resolution)
// ---------------------------------------------------------------------------

/**
 * 0 = Full user settings
 * 1 = Stage 1: Heavy FX reduced (no shells, no muzzle light, fewer particles)
 * 2 = Stage 2: Heavy FX reduced + Dynamic Shadows disabled
 * 3 = Stage 3: Heavy FX reduced + Shadows disabled + Render Resolution scaled down (0.72x)
 */
export type AdaptiveQualityStage = 0 | 1 | 2 | 3;

export interface AdaptiveQualityState {
  stage: AdaptiveQualityStage;
  lowFpsStreakSec: number;
  highFpsStreakSec: number;
}

export interface AdaptiveQualityEffects {
  stage: AdaptiveQualityStage;
  fxTierOverride: FxQualityTier;
  disableShadows: boolean;
  resScaleMultiplier: number;
  labelFa: string;
}

export function createAdaptiveQualityState(): AdaptiveQualityState {
  return {
    stage: 0,
    lowFpsStreakSec: 0,
    highFpsStreakSec: 0,
  };
}

export function getAdaptiveQualityEffects(stage: AdaptiveQualityStage): AdaptiveQualityEffects {
  if (stage === 0) {
    return {
      stage: 0,
      fxTierOverride: 2,
      disableShadows: false,
      resScaleMultiplier: 1.0,
      labelFa: 'کامل',
    };
  }
  if (stage === 1) {
    return {
      stage: 1,
      fxTierOverride: 0,
      disableShadows: false,
      resScaleMultiplier: 1.0,
      labelFa: 'کاهش افکت‌ها',
    };
  }
  if (stage === 2) {
    return {
      stage: 2,
      fxTierOverride: 0,
      disableShadows: true,
      resScaleMultiplier: 1.0,
      labelFa: 'حذف سایه‌ها',
    };
  }
  return {
    stage: 3,
    fxTierOverride: 0,
    disableShadows: true,
    resScaleMultiplier: 0.72,
    labelFa: 'کاهش رزولوشن (۷۲٪)',
  };
}

/**
 * Steps adaptive quality smoothly:
 * - Drops one stage when FPS stays < 30 for >= 2.0s (or < 20 twice as fast).
 * - Recovers one stage when FPS stays >= 48 for >= 4.0s.
 * - Disabled on software WebGL (`isSoftwareGl = true`) or when Auto Quality is OFF.
 */
export function stepAdaptiveQuality(
  state: AdaptiveQualityState,
  fpsSample: number,
  sampleWindowSec: number,
  enabled: boolean,
  isSoftwareGl: boolean
): AdaptiveQualityState {
  if (!enabled || isSoftwareGl || !Number.isFinite(fpsSample) || fpsSample <= 0) {
    return state.stage === 0 && state.lowFpsStreakSec === 0 && state.highFpsStreakSec === 0
      ? state
      : { stage: 0, lowFpsStreakSec: 0, highFpsStreakSec: 0 };
  }

  let { stage, lowFpsStreakSec, highFpsStreakSec } = state;

  if (fpsSample < 20) {
    lowFpsStreakSec += sampleWindowSec * 1.8;
    highFpsStreakSec = 0;
  } else if (fpsSample < 30) {
    lowFpsStreakSec += sampleWindowSec;
    highFpsStreakSec = 0;
  } else if (fpsSample >= 48) {
    highFpsStreakSec += sampleWindowSec;
    lowFpsStreakSec = Math.max(0, lowFpsStreakSec - sampleWindowSec);
  } else {
    lowFpsStreakSec = Math.max(0, lowFpsStreakSec - sampleWindowSec * 0.4);
    highFpsStreakSec = Math.max(0, highFpsStreakSec - sampleWindowSec * 0.4);
  }

  if (lowFpsStreakSec >= 2.0 && stage < 3) {
    stage = (stage + 1) as AdaptiveQualityStage;
    lowFpsStreakSec = 0;
    highFpsStreakSec = 0;
  } else if (highFpsStreakSec >= 4.0 && stage > 0) {
    stage = (stage - 1) as AdaptiveQualityStage;
    highFpsStreakSec = 0;
    lowFpsStreakSec = 0;
  }

  return { stage, lowFpsStreakSec, highFpsStreakSec };
}

// ---------------------------------------------------------------------------
// 3. DISTANCE-BASED LOD / SMALL PROP CULLING (Zero Allocations)
// ---------------------------------------------------------------------------

export function shouldCullSmallProp(dx: number, dz: number, maxDistance: number): boolean {
  const distSq = dx * dx + dz * dz;
  return distSq > maxDistance * maxDistance;
}

// ---------------------------------------------------------------------------
// 3B. GLOBAL PARTICLE CAP, SKIN FX MODES & MENU PAUSE POLICY (Stage 2)
// ---------------------------------------------------------------------------

export const GLOBAL_PARTICLE_CAP = 80;

export type SkinFxMode = 'off' | 'simple' | 'full';

/**
 * Default Skin VFX level:
 * - Weak / mobile devices (mobile UA, <= 4 logical cores, or <= 4 GB deviceMemory) -> 'simple'
 * - Strong desktop devices -> 'full'
 */
export function resolveDefaultSkinFxMode(params?: {
  isMobile?: boolean;
  hardwareConcurrency?: number;
  deviceMemory?: number;
}): SkinFxMode {
  const isMobile =
    params?.isMobile !== undefined ? params.isMobile : detectIsMobileDevice();
  if (isMobile) return 'simple';
  const cores =
    params?.hardwareConcurrency !== undefined
      ? params.hardwareConcurrency
      : typeof navigator !== 'undefined' && typeof navigator.hardwareConcurrency === 'number'
        ? navigator.hardwareConcurrency
        : 8;
  const mem =
    params?.deviceMemory !== undefined
      ? params.deviceMemory
      : typeof navigator !== 'undefined' &&
          typeof (navigator as unknown as { deviceMemory?: number }).deviceMemory === 'number'
        ? ((navigator as unknown as { deviceMemory?: number }).deviceMemory as number)
        : 8;
  if (cores <= 4 || mem <= 4) return 'simple';
  return 'full';
}

export interface EffectiveSkinFxConfig {
  /** True when all special skin VFX particles/beams/flashes should be disabled (3D skin model remains visible). */
  disabled: boolean;
  /** True when simplified/low-particle VFX should be emitted. */
  simple: boolean;
  /** Particle & burst multiplier (0..1). */
  scale: number;
}

/**
 * Combines explicit user `skinFxMode` ('off' | 'simple' | 'full') with Reduced Motion,
 * Graphics Preset, and Auto-Quality stage into a single deterministic VFX policy.
 */
export function resolveEffectiveSkinFx(params: {
  skinFxMode: SkinFxMode;
  reducedMotion: boolean;
  preset: GfxPresetKind;
  autoQualityStage: AdaptiveQualityStage;
  baseScale?: number;
}): EffectiveSkinFxConfig {
  if (params.skinFxMode === 'off' || params.reducedMotion || params.preset === 'potato') {
    return { disabled: true, simple: true, scale: 0 };
  }
  const base =
    typeof params.baseScale === 'number' && Number.isFinite(params.baseScale)
      ? Math.max(0.25, Math.min(1, params.baseScale))
      : 1;
  if (
    params.skinFxMode === 'simple' ||
    params.preset === 'low' ||
    params.autoQualityStage >= 2
  ) {
    return { disabled: false, simple: true, scale: Math.min(0.45, base) };
  }
  if (params.preset === 'med' || params.autoQualityStage === 1) {
    return { disabled: false, simple: false, scale: Math.min(0.7, base) };
  }
  return { disabled: false, simple: false, scale: base };
}

/**
 * Strictly clamps newly requested particles so total active particles across all pools
 * (base sparks + Inferno + Void + Tempest + Eclipse) never exceed `cap` (default 80).
 */
export function computeRemainingParticleAllowance(
  currentActiveParticles: number,
  requestedCount: number,
  cap = GLOBAL_PARTICLE_CAP
): number {
  if (!Number.isFinite(requestedCount) || requestedCount <= 0) return 0;
  const safeCap = Math.max(0, Math.floor(cap));
  const safeActive = Math.max(0, Math.floor(currentActiveParticles));
  const remaining = Math.max(0, safeCap - safeActive);
  return Math.min(Math.floor(requestedCount), remaining);
}

/**
 * Determines whether the main 3D game scene renderer should pause its live animation loop.
 * Whenever menus, spin, collection/skins, loadout, settings, or online modals are open
 * (or the screen is not actively in 'playing'), main 3D rendering pauses completely so
 * CPU/GPU are 100% free for UI and low-res 3D previews without dual-renderer contention.
 */
export function shouldPauseMainSceneRender(params: {
  screenState: string;
  anyOverlayOpen: boolean;
  isPageHidden: boolean;
}): boolean {
  if (params.isPageHidden) return true;
  if (params.screenState !== 'playing') return true;
  if (params.anyOverlayOpen) return true;
  return false;
}

// ---------------------------------------------------------------------------
// 3C. UNIFIED SINGLE-SIGHT STATE MACHINE (Stage 3 — NEVER Two Sights At Once)
// ---------------------------------------------------------------------------

export type ActiveSightKind =
  | 'none'
  | 'hip_crosshair'
  | 'weapon_3d_ads'
  | 'sniper_2d_scope'
  | 'eclipse_2d_holo';

export interface ActiveSightMode {
  kind: ActiveSightKind;
  /** True ONLY during hipfire (or melee) when user crosshair is enabled — NEVER during ADS. */
  showCrosshair: boolean;
  /** True ONLY when ADS with AWM sniper (classic Mil-Dot or Void Piercer). */
  showSniperScope2D: boolean;
  /** True ONLY when ADS with Mythic SPAS-12 Eclipse Breacher (non-OG). */
  showEclipseSight2D: boolean;
  /** True when 3D first-person weapon model must hide (sniper 2D scope or spectating). */
  hideFirstPersonWeapon3D: boolean;
  /** True when Mythic SPAS-12 3D top-rail optic must hide so only the 2D holographic sight renders. */
  hideEclipseRailOptic3D: boolean;
}

/**
 * Single source of truth for aiming reticles & optics across ALL weapons and ALL skins.
 * Strict invariant: NEVER renders two sights simultaneously (no 2D crosshair over 3D ADS irons,
 * no 3D top-rail optic competing with 2D Eclipse holographic sight, no 3D sniper inside 2D scope).
 */
export function resolveActiveSightMode(params: {
  isPlaying: boolean;
  isSpectating: boolean;
  isADS: boolean;
  weaponId: string;
  isMelee: boolean;
  userCrosshairVisible: boolean;
  hasEclipseShotgunSkin: boolean;
  isOgMode: boolean;
}): ActiveSightMode {
  if (!params.isPlaying || params.isSpectating) {
    return {
      kind: 'none',
      showCrosshair: false,
      showSniperScope2D: false,
      showEclipseSight2D: false,
      hideFirstPersonWeapon3D: params.isSpectating,
      hideEclipseRailOptic3D: false,
    };
  }

  if (params.isADS && !params.isMelee) {
    if (params.weaponId === 'sniper') {
      return {
        kind: 'sniper_2d_scope',
        showCrosshair: false,
        showSniperScope2D: true,
        showEclipseSight2D: false,
        hideFirstPersonWeapon3D: true,
        hideEclipseRailOptic3D: false,
      };
    }

    if (params.weaponId === 'shotgun' && params.hasEclipseShotgunSkin && !params.isOgMode) {
      return {
        kind: 'eclipse_2d_holo',
        showCrosshair: false,
        showSniperScope2D: false,
        showEclipseSight2D: true,
        hideFirstPersonWeapon3D: false,
        hideEclipseRailOptic3D: true,
      };
    }

    // All other weapons (AK-47, Inferno AK, M249, Tempest M249, default SPAS-12, M4A1, MP5, Pistol, RPG):
    // Use ONLY the 3D weapon sight during ADS — hide the 2D hipfire crosshair cleanly.
    return {
      kind: 'weapon_3d_ads',
      showCrosshair: false,
      showSniperScope2D: false,
      showEclipseSight2D: false,
      hideFirstPersonWeapon3D: false,
      hideEclipseRailOptic3D: false,
    };
  }

  return {
    kind: params.userCrosshairVisible ? 'hip_crosshair' : 'none',
    showCrosshair: params.userCrosshairVisible,
    showSniperScope2D: false,
    showEclipseSight2D: false,
    hideFirstPersonWeapon3D: false,
    hideEclipseRailOptic3D: false,
  };
}

// ---------------------------------------------------------------------------
// 4. PEERJS COMPACT WIRE FORMAT, DELTA CHECK & SMOOTH INTERPOLATION
// ---------------------------------------------------------------------------

export const CLIENT_SYNC_INTERVAL_SEC = 0.045; // ~22 Hz
export const CLIENT_IDLE_HEARTBEAT_MS = 500; // keepalive when standing still
export const HOST_TRANSFORM_BROADCAST_MS = 45; // ~22 Hz compact transform broadcast

export interface LocalSyncSnapshot {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  weaponIdx: number;
  hp: number;
  kills: number;
  score: number;
  wave: number;
  isSliding: boolean;
  anim: number;
  animAt: number;
}

export function shouldSendClientStateDelta(
  prev: LocalSyncSnapshot | null,
  next: LocalSyncSnapshot,
  elapsedSinceLastSendMs: number,
  heartbeatMs = CLIENT_IDLE_HEARTBEAT_MS
): boolean {
  if (!prev) return true;
  if (elapsedSinceLastSendMs >= heartbeatMs) return true;
  if (
    Math.abs(next.x - prev.x) >= 0.02 ||
    Math.abs(next.y - prev.y) >= 0.02 ||
    Math.abs(next.z - prev.z) >= 0.02
  ) {
    return true;
  }
  if (Math.abs(next.yaw - prev.yaw) >= 0.015 || Math.abs(next.pitch - prev.pitch) >= 0.015) {
    return true;
  }
  if (
    next.weaponIdx !== prev.weaponIdx ||
    next.hp !== prev.hp ||
    next.kills !== prev.kills ||
    next.score !== prev.score ||
    next.wave !== prev.wave ||
    next.isSliding !== prev.isSliding ||
    next.anim !== prev.anim ||
    next.animAt !== prev.animAt
  ) {
    return true;
  }
  return false;
}

/**
 * Compact quantized client input tuple (wire packet type: 'c:i'):
 * [roomCode, playerId, name, qX, qY, qZ, qYaw, qPitch, weaponIdx, hp, kills, score, roundNum, respawnSeq, flags, anim, animAtDeltaMs]
 * Quantization: pos * 100 (1cm precision), angles * 1000 (0.001 rad precision).
 */
export type CompactClientInputTuple = [
  string, // 0: roomCode
  string, // 1: playerId
  string, // 2: name
  number, // 3: x * 100
  number, // 4: y * 100
  number, // 5: z * 100
  number, // 6: yaw * 1000
  number, // 7: pitch * 1000
  number, // 8: weaponIdx
  number, // 9: hp
  number, // 10: kills
  number, // 11: score
  number, // 12: roundNum
  number, // 13: respawnSeq
  number, // 14: flags bitmask (bit 0 = isSliding)
  number, // 15: anim enum
  number, // 16: animAt offset (ms since epoch base or 0)
];

export interface DecodedClientInput {
  roomCode: string;
  playerId: string;
  name: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  weaponIdx: number;
  hp: number;
  kills: number;
  score: number;
  roundNum: number;
  respawnSeq: number;
  isSliding: boolean;
  anim: number;
  animAt: number;
}

export function encodeCompactClientInput(input: DecodedClientInput, nowMs = Date.now()): CompactClientInputTuple {
  const flags = input.isSliding ? 1 : 0;
  const animAtDelta =
    Number.isFinite(input.animAt) && input.animAt > 0
      ? Math.max(0, Math.min(60000, Math.round(nowMs - input.animAt)))
      : 0;
  return [
    input.roomCode,
    input.playerId,
    input.name,
    Math.round(input.x * 100),
    Math.round(input.y * 100),
    Math.round(input.z * 100),
    Math.round(input.yaw * 1000),
    Math.round(input.pitch * 1000),
    input.weaponIdx | 0,
    Math.round(input.hp),
    input.kills | 0,
    Math.round(input.score),
    input.roundNum | 0,
    input.respawnSeq | 0,
    flags,
    input.anim | 0,
    animAtDelta,
  ];
}

export function decodeCompactClientInput(
  tuple: CompactClientInputTuple,
  nowMs = Date.now()
): DecodedClientInput | null {
  if (!Array.isArray(tuple) || tuple.length < 15) return null;
  const roomCode = typeof tuple[0] === 'string' ? tuple[0] : '';
  const playerId = typeof tuple[1] === 'string' ? tuple[1] : '';
  const name = typeof tuple[2] === 'string' ? tuple[2] : 'OPERATOR';
  if (!roomCode || !playerId) return null;
  const animAtDelta = typeof tuple[16] === 'number' && Number.isFinite(tuple[16]) ? tuple[16] : 0;
  return {
    roomCode,
    playerId,
    name,
    x: (Number(tuple[3]) || 0) / 100,
    y: (Number(tuple[4]) || 0) / 100,
    z: (Number(tuple[5]) || 0) / 100,
    yaw: (Number(tuple[6]) || 0) / 1000,
    pitch: (Number(tuple[7]) || 0) / 1000,
    weaponIdx: Number(tuple[8]) || 0,
    hp: Number(tuple[9]) || 0,
    kills: Number(tuple[10]) || 0,
    score: Number(tuple[11]) || 0,
    roundNum: Number(tuple[12]) || 1,
    respawnSeq: Number(tuple[13]) || 0,
    isSliding: Boolean((Number(tuple[14]) || 0) & 1),
    anim: typeof tuple[15] === 'number' ? tuple[15] : 0,
    animAt: animAtDelta > 0 ? nowMs - animAtDelta : nowMs,
  };
}

/**
 * Compact host player transform tuple (wire packet type: 'h:p'):
 * [playerId, qX, qY, qZ, qYaw, qPitch, weaponIdx, flagsBitmask, anim, animAtDeltaMs]
 * flagsBitmask: bit 0 = isSliding, bit 1 = alive
 */
export type CompactPlayerPoseTuple = [
  string, // 0: playerId
  number, // 1: x * 100
  number, // 2: y * 100
  number, // 3: z * 100
  number, // 4: yaw * 1000
  number, // 5: pitch * 1000
  number, // 6: weaponIdx
  number, // 7: flags (bit0=isSliding, bit1=alive)
  number, // 8: anim
  number, // 9: animAtDeltaMs
];

export interface DecodedPlayerPose {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  weaponIdx: number;
  isSliding: boolean;
  alive: boolean;
  anim: number;
  animAt: number;
}

export function encodeCompactPlayerPose(p: DecodedPlayerPose, nowMs = Date.now()): CompactPlayerPoseTuple {
  const flags = (p.isSliding ? 1 : 0) | (p.alive ? 2 : 0);
  const animAtDelta =
    Number.isFinite(p.animAt) && p.animAt > 0
      ? Math.max(0, Math.min(60000, Math.round(nowMs - p.animAt)))
      : 0;
  return [
    p.id,
    Math.round(p.x * 100),
    Math.round(p.y * 100),
    Math.round(p.z * 100),
    Math.round(p.yaw * 1000),
    Math.round(p.pitch * 1000),
    p.weaponIdx | 0,
    flags,
    p.anim | 0,
    animAtDelta,
  ];
}

export function decodeCompactPlayerPose(
  tuple: CompactPlayerPoseTuple,
  nowMs = Date.now()
): DecodedPlayerPose | null {
  if (!Array.isArray(tuple) || tuple.length < 9 || typeof tuple[0] !== 'string') return null;
  const flags = Number(tuple[7]) || 0;
  const animAtDelta = typeof tuple[9] === 'number' && Number.isFinite(tuple[9]) ? tuple[9] : 0;
  return {
    id: tuple[0],
    x: (Number(tuple[1]) || 0) / 100,
    y: (Number(tuple[2]) || 0) / 100,
    z: (Number(tuple[3]) || 0) / 100,
    yaw: (Number(tuple[4]) || 0) / 1000,
    pitch: (Number(tuple[5]) || 0) / 1000,
    weaponIdx: Number(tuple[6]) || 0,
    isSliding: Boolean(flags & 1),
    alive: Boolean(flags & 2),
    anim: typeof tuple[8] === 'number' ? tuple[8] : 0,
    animAt: animAtDelta > 0 ? nowMs - animAtDelta : nowMs,
  };
}

/**
 * Shortest-angle interpolation in radians (handles -PI / +PI wrap seamlessly).
 */
export function lerpAngle(currentRad: number, targetRad: number, alpha: number): number {
  const t = Math.max(0, Math.min(1, alpha));
  let diff = ((targetRad - currentRad + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return currentRad + diff * t;
}

/**
 * Smooth frame-rate-independent interpolation for remote player position & yaw.
 * Snaps immediately on teleport/respawn jumps (> 10m) so respawn transitions are crisp.
 */
export function computeSmoothedRemoteTransform(params: {
  curX: number;
  curY: number;
  curZ: number;
  curYaw: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  targetYaw: number;
  dtSec: number;
}): { x: number; y: number; z: number; yaw: number; snapped: boolean } {
  const dx = params.targetX - params.curX;
  const dy = params.targetY - params.curY;
  const dz = params.targetZ - params.curZ;
  const distSq = dx * dx + dy * dy + dz * dz;
  if (distSq > 100) {
    return {
      x: params.targetX,
      y: params.targetY,
      z: params.targetZ,
      yaw: params.targetYaw,
      snapped: true,
    };
  }
  const dt = Math.max(0.001, Math.min(0.1, params.dtSec));
  const posAlpha = 1 - Math.exp(-15 * dt);
  const yawAlpha = 1 - Math.exp(-18 * dt);
  return {
    x: params.curX + dx * posAlpha,
    y: params.curY + dy * posAlpha,
    z: params.curZ + dz * posAlpha,
    yaw: lerpAngle(params.curYaw, params.targetYaw, yawAlpha),
    snapped: false,
  };
}
