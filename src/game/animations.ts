import type { WeaponId } from './rules';

/**
 * ============================================================================
 * PURE ANIMATION, CAMERA MOTION & ADAPTIVE FX POOLING MODULE
 * ============================================================================
 * Strictly visual/kinematic calculations — NEVER alters hitboxes, damage,
 * player collider positions, or round/network gameplay rules.
 */

// ---------------------------------------------------------------------------
// 1. HUMANOID / PLAYER ANIMATION STATES (Compact Wire Enum 0..9)
// ---------------------------------------------------------------------------

export type PlayerAnimState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'slide'
  | 'shoot'
  | 'reload'
  | 'switch'
  | 'dead'
  | 'respawn'
  | 'emote';

export const PLAYER_ANIM_STATE_TO_CODE: Record<PlayerAnimState, number> = {
  idle: 0,
  walk: 1,
  run: 2,
  slide: 3,
  shoot: 4,
  reload: 5,
  switch: 6,
  dead: 7,
  respawn: 8,
  emote: 9,
};

const CODE_TO_PLAYER_ANIM_STATE: readonly PlayerAnimState[] = [
  'idle',
  'walk',
  'run',
  'slide',
  'shoot',
  'reload',
  'switch',
  'dead',
  'respawn',
  'emote',
];

export function encodePlayerAnimState(state: PlayerAnimState): number {
  return PLAYER_ANIM_STATE_TO_CODE[state] ?? 0;
}

export function decodePlayerAnimState(code: number | undefined | null): PlayerAnimState {
  if (typeof code !== 'number' || !Number.isInteger(code) || code < 0 || code >= CODE_TO_PLAYER_ANIM_STATE.length) {
    return 'idle';
  }
  return CODE_TO_PLAYER_ANIM_STATE[code];
}

export function resolveLocalPlayerAnimState(params: {
  alive: boolean;
  isRespawning: boolean;
  isSliding: boolean;
  isReloading: boolean;
  isSwitching: boolean;
  recentlyFired: boolean;
  isMoving: boolean;
  isSprinting: boolean;
  isEmoting?: boolean;
}): PlayerAnimState {
  if (!params.alive) return 'dead';
  if (params.isRespawning) return 'respawn';
  if (params.isSliding) return 'slide';
  if (params.isReloading) return 'reload';
  if (params.isSwitching) return 'switch';
  if (params.recentlyFired) return 'shoot';
  if (params.isEmoting) return 'emote';
  if (params.isMoving) return params.isSprinting ? 'run' : 'walk';
  return 'idle';
}

/**
 * Remote clients compute walk/run locomotion locally from observed movement speed
 * so network packets only transmit compact discrete action state enums.
 */
export function computeRemoteLocomotionFromSpeed(speedMps: number): {
  mode: 'idle' | 'walk' | 'run';
  strideAmplitude: number;
  strideFrequency: number;
  forwardLean: number;
} {
  if (!Number.isFinite(speedMps) || speedMps < 0.35) {
    return { mode: 'idle', strideAmplitude: 0, strideFrequency: 0, forwardLean: 0 };
  }
  if (speedMps >= 5.6) {
    const runT = Math.min(1, (speedMps - 5.6) / 4.2);
    return {
      mode: 'run',
      strideAmplitude: 0.62 + runT * 0.16,
      strideFrequency: 4.3 + runT * 0.9,
      forwardLean: 0.1 + runT * 0.06,
    };
  }
  const walkT = Math.min(1, (speedMps - 0.35) / 5.25);
  return {
    mode: 'walk',
    strideAmplitude: 0.24 + walkT * 0.34,
    strideFrequency: 2.8 + walkT * 1.4,
    forwardLean: 0.02 + walkT * 0.06,
  };
}

export interface HumanoidVisualPose {
  legLRotX: number;
  legRRotX: number;
  legY: number;
  upperBodyY: number;
  upperBodyZ: number;
  upperBodyRotX: number;
  armLRotX: number;
  armLRotZ: number;
  armRRotX: number;
  gunPosY: number;
  gunPosZ: number;
  gunRotX: number;
  gunRotZ: number;
  deathFallRotX: number;
  deathRollRotZ: number;
  deathDropY: number;
  opacity: number;
  respawnScaleY: number;
}

export const HUMANOID_DEATH_FALL_SEC = 0.46;
export const HUMANOID_DEATH_FADE_START_SEC = 0.62;
export const HUMANOID_DEATH_TOTAL_SEC = 1.25;
export const HUMANOID_RESPAWN_DURATION_SEC = 0.36;

export function computeHumanoidVisualPose(params: {
  alive: boolean;
  actionState: PlayerAnimState;
  actionElapsedSec: number;
  walkPhase: number;
  speedMps: number;
  slideBlend: number;
  recoilKick: number;
  idleTimeSec: number;
  deathElapsedSec: number;
  respawnElapsedSec: number;
  reducedMotion?: boolean;
  emoteId?: string | null;
}): HumanoidVisualPose {
  const rmScale = params.reducedMotion ? 0.35 : 1.0;

  if (!params.alive) {
    const tFall = Math.min(1, Math.max(0, params.deathElapsedSec / HUMANOID_DEATH_FALL_SEC));
    // Smooth ease-out fall with tiny settle bounce
    const easeFall = 1 - Math.pow(1 - tFall, 3);
    const fadeProgress =
      params.deathElapsedSec <= HUMANOID_DEATH_FADE_START_SEC
        ? 0
        : Math.min(
            1,
            (params.deathElapsedSec - HUMANOID_DEATH_FADE_START_SEC) /
              Math.max(0.05, HUMANOID_DEATH_TOTAL_SEC - HUMANOID_DEATH_FADE_START_SEC)
          );
    return {
      legLRotX: -0.25 * easeFall,
      legRRotX: 0.32 * easeFall,
      legY: 0.78,
      upperBodyY: 0,
      upperBodyZ: 0,
      upperBodyRotX: 0,
      armLRotX: 0.55 * easeFall,
      armLRotZ: -0.35 * easeFall,
      armRRotX: 0.45 * easeFall,
      gunPosY: 1.22,
      gunPosZ: 0.32,
      gunRotX: 0.28 * easeFall,
      gunRotZ: 0.35 * easeFall,
      deathFallRotX: -1.46 * easeFall,
      deathRollRotZ: 0.24 * easeFall,
      deathDropY: -0.18 * easeFall - 0.16 * fadeProgress,
      opacity: Math.max(0, 1 - fadeProgress),
      respawnScaleY: 1,
    };
  }

  const respawnT =
    params.respawnElapsedSec >= HUMANOID_RESPAWN_DURATION_SEC
      ? 1
      : Math.max(0, Math.min(1, params.respawnElapsedSec / HUMANOID_RESPAWN_DURATION_SEC));
  const respawnEase = 1 - Math.pow(1 - respawnT, 3);
  const opacity = 0.25 + 0.75 * respawnEase;
  const respawnScaleY = 0.92 + 0.08 * respawnEase;

  const slide = Math.max(0, Math.min(1, params.slideBlend));
  const loco = computeRemoteLocomotionFromSpeed(params.speedMps);
  const breath = Math.sin(params.idleTimeSec * 2.4) * 0.014 * rmScale;

  let legLRotX = 0;
  let legRRotX = 0;
  let legY = 0.78;
  let upperBodyY = breath;
  let upperBodyZ = 0;
  let upperBodyRotX = 0;

  if (slide > 0.12) {
    legY = 0.78 - 0.42 * slide;
    legLRotX = -1.25 * slide;
    legRRotX = -0.65 * slide;
    upperBodyY = -0.68 * slide;
    upperBodyZ = -0.14 * slide;
    upperBodyRotX = -0.34 * slide;
  } else if (loco.mode !== 'idle') {
    const stride = Math.sin(params.walkPhase) * loco.strideAmplitude * rmScale;
    const bounce = Math.abs(Math.sin(params.walkPhase)) * (loco.mode === 'run' ? 0.045 : 0.022) * rmScale;
    legLRotX = stride;
    legRRotX = -stride;
    upperBodyY = bounce;
    upperBodyRotX = loco.forwardLean * rmScale;
  }

  let armLRotX = 0;
  let armLRotZ = 0;
  let armRRotX = 0;
  let gunPosY = 1.22;
  let gunPosZ = 0.32;
  let gunRotX = 0;
  let gunRotZ = 0;

  // Subtle weapon bob when walking/running
  if (slide <= 0.12 && loco.mode !== 'idle') {
    const sway = Math.cos(params.walkPhase) * (loco.mode === 'run' ? 0.045 : 0.024) * rmScale;
    gunPosY += Math.abs(Math.sin(params.walkPhase)) * 0.02 * rmScale;
    gunRotZ += sway;
  }

  // Discrete upper-body action overlays (reload / switch / shoot recoil)
  if (params.actionState === 'reload') {
    const relT = Math.min(1, Math.max(0, params.actionElapsedSec / 1.45));
    const magWave = Math.sin(relT * Math.PI);
    armLRotX = 0.42 * magWave * rmScale;
    armLRotZ = 0.28 * magWave * rmScale;
    gunRotZ = 0.36 * magWave * rmScale;
    gunPosY -= 0.05 * magWave * rmScale;
  } else if (params.actionState === 'switch') {
    const swT = Math.min(1, Math.max(0, params.actionElapsedSec / 0.32));
    const dip = Math.sin(swT * Math.PI);
    armRRotX = 0.38 * dip * rmScale;
    gunPosY -= 0.14 * dip * rmScale;
    gunRotX = -0.45 * dip * rmScale;
  } else if (params.actionState === 'emote') {
    if (params.emoteId === 'mythic_eclipse_dance') {
      // Celebratory Mythic SPAS-12 "Eclipse Breacher" ~3s celestial orbit salute & shotgun spin (distinct from M249!)
      const emT = Math.max(0, Math.min(1, params.actionElapsedSec / 3.0));
      const env = Math.sin(emT * Math.PI);
      const orbit = params.actionElapsedSec * 5.2;
      const pulse = Math.sin(orbit * 2.0);
      legLRotX = Math.sin(orbit) * 0.28 * env * rmScale;
      legRRotX = -Math.sin(orbit) * 0.28 * env * rmScale;
      upperBodyY += Math.abs(Math.cos(orbit)) * 0.06 * env * rmScale;
      upperBodyRotX = (-0.22 + pulse * 0.06) * env * rmScale;
      armLRotX = (-1.12 + Math.cos(orbit) * 0.25) * env * rmScale;
      armLRotZ = (-0.62 + Math.sin(orbit) * 0.35) * env * rmScale;
      armRRotX = (-1.05 + Math.sin(orbit) * 0.32) * env * rmScale;
      gunPosY += (0.28 + Math.sin(orbit) * 0.06) * env * rmScale;
      gunPosZ += (0.1 + Math.cos(orbit) * 0.05) * env * rmScale;
      gunRotX = (0.72 + Math.sin(orbit * 2) * 0.22) * env * rmScale;
      gunRotZ = Math.cos(orbit) * 0.92 * env * rmScale;
    } else {
      // Celebratory Mythic M249 ~3s rhythmic dance + weapon salute flourish
      const emT = Math.max(0, Math.min(1, params.actionElapsedSec / 3.0));
      const env = Math.sin(emT * Math.PI);
      const beat = params.actionElapsedSec * 7.2;
      const bounce = Math.abs(Math.sin(beat)) * 0.085 * env * rmScale;
      const sway = Math.sin(beat * 0.5) * 0.24 * env * rmScale;
      legLRotX = Math.sin(beat) * 0.42 * env * rmScale;
      legRRotX = -Math.sin(beat) * 0.42 * env * rmScale;
      upperBodyY += bounce;
      upperBodyRotX = -0.14 * env * rmScale;
      armLRotX = (-0.85 + Math.sin(beat) * 0.32) * env * rmScale;
      armLRotZ = (-0.42 + sway) * env * rmScale;
      armRRotX = (-0.65 - Math.cos(beat) * 0.28) * env * rmScale;
      gunPosY += (0.2 + bounce * 0.8) * env * rmScale;
      gunPosZ += 0.06 * env * rmScale;
      gunRotX = (0.48 + Math.sin(beat) * 0.18) * env * rmScale;
      gunRotZ = sway * 1.45;
    }
  }

  const kick = Math.max(0, Math.min(1, params.recoilKick));
  if (kick > 0.001) {
    gunPosZ -= 0.095 * kick;
    gunRotX += 0.16 * kick;
    armRRotX -= 0.12 * kick;
    upperBodyRotX -= 0.045 * kick;
  }

  return {
    legLRotX,
    legRRotX,
    legY,
    upperBodyY,
    upperBodyZ,
    upperBodyRotX,
    armLRotX,
    armLRotZ,
    armRRotX,
    gunPosY,
    gunPosZ,
    gunRotX,
    gunRotZ,
    deathFallRotX: 0,
    deathRollRotZ: 0,
    deathDropY: 0,
    opacity,
    respawnScaleY,
  };
}

// ---------------------------------------------------------------------------
// 2. FIRST-PERSON WEAPON ANIMATION PROFILES & PHASES
// ---------------------------------------------------------------------------

export interface WeaponAnimProfile {
  weaponClass: 'rifle' | 'smg' | 'lmg' | 'shotgun' | 'sniper' | 'pistol' | 'melee' | 'launcher';
  kickBackScale: number;
  kickUpScale: number;
  kickPitchScale: number;
  kickRollJitter: number;
  posDamp: number;
  rotDamp: number;
  flashScale: number;
  flashDurationSec: number;
  ejectShell: boolean;
  cameraShakeScale: number;
}

export const WEAPON_ANIM_PROFILES: Record<WeaponId, WeaponAnimProfile> = {
  ak47: {
    weaponClass: 'rifle',
    kickBackScale: 1.08,
    kickUpScale: 0.17,
    kickPitchScale: 1.05,
    kickRollJitter: 0.085,
    posDamp: 16.5,
    rotDamp: 14.5,
    flashScale: 1.15,
    flashDurationSec: 0.046,
    ejectShell: true,
    cameraShakeScale: 0.009,
  },
  m4a1: {
    weaponClass: 'rifle',
    kickBackScale: 0.9,
    kickUpScale: 0.12,
    kickPitchScale: 0.88,
    kickRollJitter: 0.055,
    posDamp: 19.5,
    rotDamp: 17.5,
    flashScale: 0.52,
    flashDurationSec: 0.038,
    ejectShell: true,
    cameraShakeScale: 0.006,
  },
  mp5: {
    weaponClass: 'smg',
    kickBackScale: 0.82,
    kickUpScale: 0.1,
    kickPitchScale: 0.78,
    kickRollJitter: 0.06,
    posDamp: 23.0,
    rotDamp: 21.0,
    flashScale: 0.48,
    flashDurationSec: 0.036,
    ejectShell: true,
    cameraShakeScale: 0.0055,
  },
  lmg: {
    weaponClass: 'lmg',
    kickBackScale: 1.16,
    kickUpScale: 0.15,
    kickPitchScale: 1.02,
    kickRollJitter: 0.11,
    posDamp: 13.5,
    rotDamp: 12.5,
    flashScale: 1.24,
    flashDurationSec: 0.052,
    ejectShell: true,
    cameraShakeScale: 0.011,
  },
  shotgun: {
    weaponClass: 'shotgun',
    kickBackScale: 1.38,
    kickUpScale: 0.25,
    kickPitchScale: 1.32,
    kickRollJitter: 0.12,
    posDamp: 11.0,
    rotDamp: 10.5,
    flashScale: 1.5,
    flashDurationSec: 0.065,
    ejectShell: true,
    cameraShakeScale: 0.022,
  },
  sniper: {
    weaponClass: 'sniper',
    kickBackScale: 1.42,
    kickUpScale: 0.24,
    kickPitchScale: 1.38,
    kickRollJitter: 0.075,
    posDamp: 9.8,
    rotDamp: 9.2,
    flashScale: 1.65,
    flashDurationSec: 0.068,
    ejectShell: true,
    cameraShakeScale: 0.026,
  },
  pistol: {
    weaponClass: 'pistol',
    kickBackScale: 0.86,
    kickUpScale: 0.16,
    kickPitchScale: 1.12,
    kickRollJitter: 0.05,
    posDamp: 22.0,
    rotDamp: 20.0,
    flashScale: 0.72,
    flashDurationSec: 0.04,
    ejectShell: true,
    cameraShakeScale: 0.0065,
  },
  deagle: {
    weaponClass: 'pistol',
    kickBackScale: 1.24,
    kickUpScale: 0.28,
    kickPitchScale: 1.42,
    kickRollJitter: 0.095,
    posDamp: 14.0,
    rotDamp: 13.0,
    flashScale: 1.42,
    flashDurationSec: 0.055,
    ejectShell: true,
    cameraShakeScale: 0.02,
  },
  katana: {
    weaponClass: 'melee',
    kickBackScale: 0.45,
    kickUpScale: 0.06,
    kickPitchScale: 0.4,
    kickRollJitter: 0.02,
    posDamp: 18.0,
    rotDamp: 18.0,
    flashScale: 0,
    flashDurationSec: 0,
    ejectShell: false,
    cameraShakeScale: 0.01,
  },
  rpg: {
    weaponClass: 'launcher',
    kickBackScale: 1.55,
    kickUpScale: 0.22,
    kickPitchScale: 1.28,
    kickRollJitter: 0.08,
    posDamp: 8.2,
    rotDamp: 8.5,
    flashScale: 1.72,
    flashDurationSec: 0.075,
    ejectShell: false,
    cameraShakeScale: 0.032,
  },
};

export function getWeaponAnimProfile(weaponId: WeaponId): WeaponAnimProfile {
  return WEAPON_ANIM_PROFILES[weaponId] || WEAPON_ANIM_PROFILES.ak47;
}

export interface WeaponReloadPose {
  weaponDropY: number;
  weaponPosZ: number;
  weaponPitchX: number;
  weaponRollZ: number;
  magOffsetY: number;
  magOffsetZ: number;
  magVisible: boolean;
  /** Normalized 0..1 bolt/charging-handle rack travel near end of reload (0.80..0.95). */
  boltPull01: number;
}

function smoothstep01(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/**
 * Multi-phase magazine reload pose (Mag Out -> Fetch -> Mag In + Seat Bump -> Bolt Rack -> Settle).
 * - Pistol & Deagle slide magazines cleanly along their -0.26 rad grip axis (zero trigger-guard clipping).
 * - Shotgun lifts 3 fresh shells rhythmically into the bottom loading port with animated shell carrier.
 * - RPG slides a fresh PG-7V warhead smoothly into the front launcher tube.
 * - Rifles, SMGs, Snipers & LMG perform a crisp charging-handle/bolt rack at 0.80..0.95.
 */
export function computeWeaponReloadPose(
  progress: number,
  weaponId: WeaponId,
  isADS: boolean
): WeaponReloadPose {
  const p = Math.max(0, Math.min(1, progress));
  // Reload always eases out of ADS in viewmodel kinematics; keep subtle reduction if still transitioning
  const adsScale = isADS ? 0.65 : 1.0;

  if (weaponId === 'rpg') {
    // RPG-7V: tilt tube down/left, slide new rocket into front muzzle (0.28 -> 0.76), settle back
    const tiltEnv =
      p < 0.22
        ? smoothstep01(p / 0.22)
        : p < 0.8
          ? 1
          : 1 - smoothstep01((p - 0.8) / 0.2);
    const rocketVisible = p >= 0.28;
    const slideT = p < 0.28 ? 0 : smoothstep01((p - 0.28) / 0.46);
    const seatBump = p >= 0.72 && p <= 0.88 ? Math.sin(((p - 0.72) / 0.16) * Math.PI) * 0.028 : 0;
    return {
      weaponDropY: -0.095 * tiltEnv * adsScale + seatBump,
      weaponPosZ: 0.04 * tiltEnv * adsScale,
      weaponPitchX: -0.26 * tiltEnv * adsScale,
      weaponRollZ: 0.44 * tiltEnv * adsScale,
      magOffsetY: 0,
      magOffsetZ: (rocketVisible ? -0.34 * (1 - slideT) : -0.34) || 0,
      magVisible: rocketVisible,
      boltPull01: 0,
    };
  }

  if (weaponId === 'shotgun') {
    // Shotgun: angled loading-port roll + 3 rhythmic shell-insert pulses + end pump/bolt rack
    const tiltEnv =
      p < 0.16
        ? smoothstep01(p / 0.16)
        : p < 0.82
          ? 1
          : 1 - smoothstep01((p - 0.82) / 0.18);
    const loadingWindow = p >= 0.18 && p <= 0.8;
    const cyclePos = loadingWindow ? ((p - 0.18) / 0.62) * 3 : 0;
    const localShellT = cyclePos - Math.floor(cyclePos);
    // Shell rises from below (-0.11) cleanly into the receiver loading port (+0.03)
    const shellLift = loadingWindow ? -0.11 + smoothstep01(Math.min(1, localShellT / 0.72)) * 0.14 : -0.11;
    const shellPulse = loadingWindow ? Math.sin(localShellT * Math.PI) * 0.02 : 0;
    const boltPull01 =
      p >= 0.82 && p <= 0.96 ? Math.sin(((p - 0.82) / 0.14) * Math.PI) : 0;
    return {
      weaponDropY: (-0.068 * tiltEnv + shellPulse) * adsScale,
      weaponPosZ: (0.025 * tiltEnv + boltPull01 * 0.018) * adsScale,
      weaponPitchX: (0.2 * tiltEnv - boltPull01 * 0.08) * adsScale,
      weaponRollZ: 0.58 * tiltEnv * adsScale,
      magOffsetY: shellLift || 0,
      magOffsetZ: (loadingWindow ? (1 - localShellT) * 0.025 : 0) || 0,
      magVisible: loadingWindow && localShellT < 0.86,
      boltPull01: boltPull01 || 0,
    };
  }

  // Standard magazine-fed firearms (AK-47, M4A1, MP5, LMG, Sniper, Pistol, Deagle)
  // Phase 1 (0..0.28): tilt & pull mag down along magwell axis
  // Phase 2 (0.28..0.52): mag out / fetch fresh mag
  // Phase 3 (0.52..0.78): insert mag upward + crisp seating bump
  // Phase 4 (0.78..0.95): rack charging handle / bolt carrier + settle to ready
  const tiltEnv =
    p < 0.18
      ? smoothstep01(p / 0.18)
      : p < 0.84
        ? 1
        : 1 - smoothstep01((p - 0.84) / 0.16);

  let magOffsetY = 0;
  let seatImpulse = 0;
  let magVisible = true;
  if (p < 0.28) {
    magOffsetY = -0.24 * smoothstep01(p / 0.28);
  } else if (p < 0.52) {
    magOffsetY = -0.24;
    magVisible = p < 0.36 || p > 0.44; // brief off-screen swap
  } else if (p < 0.78) {
    magOffsetY = -0.24 * (1 - smoothstep01((p - 0.52) / 0.26));
  } else {
    magOffsetY = 0;
    if (p < 0.86) {
      seatImpulse = Math.sin(((p - 0.78) / 0.08) * Math.PI) * 0.024;
    }
  }

  // Pistol & Deagle grips are angled at -0.26 rad: slide mag cleanly along grip axis so it never clips trigger guard!
  const isGripFedPistol = weaponId === 'pistol' || weaponId === 'deagle';
  const magOffsetZ = isGripFedPistol ? -magOffsetY * Math.tan(0.26) : 0;

  // Crisp bolt/charging-handle rack near the end of reload (0.81..0.95)
  const hasBoltRack =
    weaponId === 'ak47' ||
    weaponId === 'm4a1' ||
    weaponId === 'mp5' ||
    weaponId === 'lmg' ||
    weaponId === 'sniper';
  const boltPull01 =
    hasBoltRack && p >= 0.81 && p <= 0.95
      ? Math.sin(((p - 0.81) / 0.14) * Math.PI)
      : 0;

  return {
    weaponDropY: (-0.062 * tiltEnv + seatImpulse) * adsScale,
    weaponPosZ: (0.025 * tiltEnv - seatImpulse * 0.6 + boltPull01 * 0.014) * adsScale,
    weaponPitchX: (0.12 * tiltEnv + seatImpulse * 1.4 - boltPull01 * 0.06) * adsScale,
    weaponRollZ: (0.54 * tiltEnv + boltPull01 * 0.1) * adsScale,
    magOffsetY: magOffsetY || 0,
    magOffsetZ: magOffsetZ || 0,
    magVisible,
    boltPull01: boltPull01 || 0,
  };
}

/**
 * Smooth weapon-switch drop & raise animation (switchAnim goes 1 -> 0) with subtle tactical settle bounce.
 */
export function computeWeaponSwitchPose(switchAnim: number): {
  dropY: number;
  pitchX: number;
  rollZ: number;
} {
  const t = Math.max(0, Math.min(1, switchAnim));
  if (t <= 0) return { dropY: 0, pitchX: 0, rollZ: 0 };
  const eased = t * t * (3 - 2 * t);
  const settle = Math.sin((1 - t) * Math.PI) * 0.022 * (1 - t);
  return {
    dropY: (-0.28 * eased + settle) || 0,
    pitchX: (-0.46 * eased + settle * 1.8) || 0,
    rollZ: (0.22 * eased) || 0,
  };
}

// ---------------------------------------------------------------------------
// 2B. SMOOTH DAMPED FIRST-PERSON VIEWMODEL KINEMATICS (Zero Snaps / Smooth Blends)
// ---------------------------------------------------------------------------

export interface FirstPersonWeaponAnimState {
  sprintBlend: number;
  adsBlend: number;
  moveBobBlend: number;
  idleBreathPhase: number;
  boltKick01: number;
  pistolSlideKick: number;
  deagleSlideKick: number;
}

export function createFirstPersonWeaponAnimState(): FirstPersonWeaponAnimState {
  return {
    sprintBlend: 0,
    adsBlend: 0,
    moveBobBlend: 0,
    idleBreathPhase: 0,
    boltKick01: 0,
    pistolSlideKick: 0,
    deagleSlideKick: 0,
  };
}

export interface FirstPersonWeaponKinematicsOutput {
  sprintBlend: number;
  adsBlend: number;
  bobX: number;
  bobY: number;
  swayRotX: number;
  swayRotY: number;
  swayRotZ: number;
  boltKick01: number;
  pistolSlideKick: number;
  deagleSlideKick: number;
}

/**
 * Pure, frame-rate independent exponential damper for first-person viewmodel motion.
 * Eliminates:
 *  - Instant 30-degree sprint rotation snaps
 *  - Instant ADS cant-roll snaps
 *  - Discontinuous walk-bob amplitude jumps & sharp abs(sin) bounce cusps
 *  - Reload clipping into camera while holding ADS (auto-pulls smoothly out of ADS during reload)
 */
export function stepFirstPersonWeaponKinematics(
  state: FirstPersonWeaponAnimState,
  params: {
    dt: number;
    isMoving: boolean;
    onGround: boolean;
    sprinting: boolean;
    isADS: boolean;
    isReloading: boolean;
    isMelee: boolean;
    walkBobTimer: number;
    deadzoneLagX: number;
    deadzoneLagY: number;
    currentLean: number;
    adsCantRoll: number;
    weaponMotionFactor: number;
    adsSmoothMult: number;
  }
): FirstPersonWeaponKinematicsOutput {
  const dt = Math.max(0.0001, Math.min(0.1, Number.isFinite(params.dt) ? params.dt : 0.016));
  const motionFactor = Math.max(0, Math.min(2, params.weaponMotionFactor));

  // Auto-pull weapon smoothly out of ADS when reloading so reload tilts never clip near plane
  const effectiveAdsTarget = params.isADS && !params.isReloading && !params.isMelee ? 1 : 0;
  const effectiveSprintTarget =
    params.sprinting && !params.isMelee && !params.isReloading && !effectiveAdsTarget ? 1 : 0;
  const moveBobTarget = params.isMoving && params.onGround ? (params.sprinting ? 1.55 : 1.0) : 0;

  const adsRate = Math.max(8, 18 * (Number.isFinite(params.adsSmoothMult) ? params.adsSmoothMult : 1));
  state.adsBlend += (effectiveAdsTarget - state.adsBlend) * (1 - Math.exp(-adsRate * dt));
  if (Math.abs(effectiveAdsTarget - state.adsBlend) < 0.004) state.adsBlend = effectiveAdsTarget;
  state.sprintBlend += (effectiveSprintTarget - state.sprintBlend) * (1 - Math.exp(-12 * dt));
  if (Math.abs(effectiveSprintTarget - state.sprintBlend) < 0.004) state.sprintBlend = effectiveSprintTarget;
  state.moveBobBlend += (moveBobTarget - state.moveBobBlend) * (1 - Math.exp(-10 * dt));
  state.idleBreathPhase = (state.idleBreathPhase + dt * 1.95) % (Math.PI * 200);

  // Smooth exponential decay on bolt & per-weapon pistol/deagle slides
  if (state.boltKick01 > 0) {
    state.boltKick01 = Math.max(0, state.boltKick01 - dt * 12.5);
  }
  if (state.pistolSlideKick > 0) {
    state.pistolSlideKick = Math.max(0, state.pistolSlideKick - dt * 0.72);
  }
  if (state.deagleSlideKick > 0) {
    state.deagleSlideKick = Math.max(0, state.deagleSlideKick - dt * 0.58);
  }

  // Smooth continuous figure-8 Lissajous walk sway + calm idle breathing (zero abs() cusp!)
  const adsDamp = 1 - state.adsBlend * 0.76;
  const walkAmp = 0.0145 * state.moveBobBlend * adsDamp * motionFactor;
  const breathAmp = 0.0024 * (1 - Math.min(1, state.moveBobBlend)) * adsDamp * motionFactor;

  const bobX =
    Math.cos(params.walkBobTimer) * walkAmp +
    Math.sin(state.idleBreathPhase * 0.5) * breathAmp * 0.65;
  const bobY =
    Math.sin(params.walkBobTimer * 2) * walkAmp * 0.72 +
    Math.sin(state.idleBreathPhase) * breathAmp;

  // Smoothly blended sprint tuck, ADS cant roll, deadzone weapon lag & lean roll
  const sprintPitch = -0.2 * state.sprintBlend;
  const sprintYaw = 0.48 * state.sprintBlend;
  const sprintRoll = -0.14 * state.sprintBlend;

  const swayRotX =
    params.deadzoneLagY * 1.25 * motionFactor * adsDamp +
    sprintPitch -
    Math.sin(params.walkBobTimer * 2) * 0.014 * state.moveBobBlend * adsDamp * motionFactor;
  const swayRotY =
    params.deadzoneLagX * 1.55 * motionFactor * adsDamp +
    sprintYaw +
    Math.cos(params.walkBobTimer) * 0.012 * state.moveBobBlend * adsDamp * motionFactor;
  const hipLagRoll = params.deadzoneLagX * 0.78 * motionFactor;
  const swayRotZ =
    hipLagRoll * (1 - state.adsBlend) +
    params.adsCantRoll * state.adsBlend +
    sprintRoll -
    params.currentLean * 0.34;

  return {
    sprintBlend: state.sprintBlend,
    adsBlend: state.adsBlend,
    bobX,
    bobY,
    swayRotX,
    swayRotY,
    swayRotZ,
    boltKick01: state.boltKick01,
    pistolSlideKick: state.pistolSlideKick,
    deagleSlideKick: state.deagleSlideKick,
  };
}

/**
 * Custom Mythic M249 "Tempest Aegis" draw / equip pose:
 * Sweeps up from the right hip with a crisp holographic lock-in roll & settle.
 */
export function computeTempestDrawPose(switchAnim: number): {
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  pitchX: number;
  yawY: number;
  rollZ: number;
} {
  const t = Math.max(0, Math.min(1, switchAnim));
  const eased = t * t * (3 - 2 * t);
  const settle = Math.sin((1 - t) * Math.PI) * 0.045;
  return {
    offsetX: (0.14 * eased) || 0,
    offsetY: (-0.26 * eased + settle) || 0,
    offsetZ: (0.08 * eased) || 0,
    pitchX: (-0.52 * eased + settle * 1.6) || 0,
    yawY: (-0.34 * eased) || 0,
    rollZ: (0.42 * eased) || 0,
  };
}

/**
 * Custom Mythic M249 "Tempest Aegis" weapon inspect showcase pose (progress 0 -> 1 over ~2.4s):
 * Smoothly turns the chrome/white/crimson receiver toward the camera, reveals the holographic kill
 * counter and glowing ammo belt, pauses, then crisply snaps back to combat ready.
 */
export function computeTempestInspectPose(progress: number): {
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  pitchX: number;
  yawY: number;
  rollZ: number;
} {
  const p = Math.max(0, Math.min(1, progress));
  if (p <= 0 || p >= 1) {
    return { offsetX: 0, offsetY: 0, offsetZ: 0, pitchX: 0, yawY: 0, rollZ: 0 };
  }
  const env =
    p < 0.18
      ? smoothstep01(p / 0.18)
      : p < 0.82
        ? 1
        : 1 - smoothstep01((p - 0.82) / 0.18);
  const inspectWave = Math.sin(p * Math.PI * 2);
  const sideFlip = p >= 0.42 && p <= 0.78 ? smoothstep01((p - 0.42) / 0.18) * (1 - smoothstep01(Math.max(0, (p - 0.64) / 0.14))) : 0;
  return {
    offsetX: (-0.09 * env + sideFlip * 0.04) || 0,
    offsetY: (0.045 * env + Math.sin(p * Math.PI) * 0.018) || 0,
    offsetZ: (-0.055 * env) || 0,
    pitchX: (0.16 * env - sideFlip * 0.24) || 0,
    yawY: (0.62 * env - sideFlip * 0.38) || 0,
    rollZ: (-0.42 * env + sideFlip * 0.78 + inspectWave * 0.05 * env) || 0,
  };
}

/**
 * First-person Mythic M249 exclusive emote flourish (progress 0 -> 1 over ~3s).
 */
export function computeTempestEmoteViewPose(progress: number): {
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  pitchX: number;
  yawY: number;
  rollZ: number;
} {
  const p = Math.max(0, Math.min(1, progress));
  if (p <= 0 || p >= 1) {
    return { offsetX: 0, offsetY: 0, offsetZ: 0, pitchX: 0, yawY: 0, rollZ: 0 };
  }
  const env = Math.sin(p * Math.PI);
  const beat = p * Math.PI * 6;
  return {
    offsetX: (-0.07 * env + Math.sin(beat * 0.5) * 0.045 * env) || 0,
    offsetY: (0.055 * env + Math.abs(Math.sin(beat)) * 0.032 * env) || 0,
    offsetZ: (-0.04 * env) || 0,
    pitchX: (0.28 * env + Math.sin(beat) * 0.09 * env) || 0,
    yawY: (0.36 * env + Math.cos(beat * 0.5) * 0.22 * env) || 0,
    rollZ: (Math.sin(beat * 0.5) * 0.42 * env) || 0,
  };
}

/**
 * Custom Mythic SPAS-12 "Eclipse Breacher" equip/draw pose:
 * Sweeps cleanly from the lower-left with a crisp shotgun wrist-flip and forward lock-in.
 */
export function computeEclipseDrawPose(switchAnim: number): {
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  pitchX: number;
  yawY: number;
  rollZ: number;
} {
  const t = Math.max(0, Math.min(1, switchAnim));
  const eased = t * t * (3 - 2 * t);
  const snap = Math.sin((1 - t) * Math.PI) * 0.05;
  return {
    offsetX: (-0.11 * eased) || 0,
    offsetY: (-0.28 * eased + snap) || 0,
    offsetZ: (0.09 * eased) || 0,
    pitchX: (0.48 * eased - snap * 1.4) || 0,
    yawY: (0.42 * eased) || 0,
    rollZ: (-0.54 * eased) || 0,
  };
}

/**
 * Custom Mythic SPAS-12 "Eclipse Breacher" inspect showcase pose (progress 0 -> 1 over ~2.6s):
 * First showcases the golden receiver engravings, glowing shell rack & holographic kill counter,
 * then rolls smoothly to reveal the miniature rotating black hole inside the barrel shroud.
 */
export function computeEclipseInspectPose(progress: number): {
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  pitchX: number;
  yawY: number;
  rollZ: number;
} {
  const p = Math.max(0, Math.min(1, progress));
  if (p <= 0 || p >= 1) {
    return { offsetX: 0, offsetY: 0, offsetZ: 0, pitchX: 0, yawY: 0, rollZ: 0 };
  }
  const env =
    p < 0.16
      ? smoothstep01(p / 0.16)
      : p < 0.84
        ? 1
        : 1 - smoothstep01((p - 0.84) / 0.16);
  const phaseFlip =
    p >= 0.46 && p <= 0.82
      ? smoothstep01((p - 0.46) / 0.16) * (1 - smoothstep01(Math.max(0, (p - 0.68) / 0.14)))
      : 0;
  return {
    offsetX: (-0.11 * env + phaseFlip * 0.08) || 0,
    offsetY: (0.055 * env + Math.sin(p * Math.PI) * 0.02) || 0,
    offsetZ: (-0.075 * env) || 0,
    pitchX: (0.22 * env - phaseFlip * 0.34) || 0,
    yawY: (0.72 * env - phaseFlip * 0.96) || 0,
    rollZ: (-0.48 * env + phaseFlip * 0.94 + Math.sin(p * Math.PI * 2) * 0.04 * env) || 0,
  };
}

/**
 * First-person Mythic SPAS-12 "Eclipse Breacher" exclusive 3-second emote flourish:
 * Heroic eclipse orbit twirl & celestial salute — completely distinct from M249's dance.
 */
export function computeEclipseEmoteViewPose(progress: number): {
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  pitchX: number;
  yawY: number;
  rollZ: number;
} {
  const p = Math.max(0, Math.min(1, progress));
  if (p <= 0 || p >= 1) {
    return { offsetX: 0, offsetY: 0, offsetZ: 0, pitchX: 0, yawY: 0, rollZ: 0 };
  }
  const env = Math.sin(p * Math.PI);
  const orbit = p * Math.PI * 4;
  return {
    offsetX: (-0.09 * env + Math.cos(orbit) * 0.055 * env) || 0,
    offsetY: (0.075 * env + Math.sin(orbit) * 0.036 * env) || 0,
    offsetZ: (-0.06 * env) || 0,
    pitchX: (0.44 * env + Math.cos(orbit) * 0.14 * env) || 0,
    yawY: (Math.sin(orbit * 0.5) * 0.68 * env) || 0,
    rollZ: (Math.cos(orbit * 0.5) * 0.62 * env) || 0,
  };
}

/**
 * Smooth katana melee slash curve (anticipation -> fast arc slash -> follow-through -> return).
 */
export function computeKatanaSlashPose(
  progress: number,
  dir: number
): {
  rotX: number;
  rotY: number;
  rotZ: number;
  posX: number;
  posY: number;
  posZ: number;
} {
  const p = Math.max(0, Math.min(1, progress));
  if (p <= 0 || p >= 1) {
    return { rotX: -0.48, rotY: 0.25, rotZ: 0.32, posX: 0, posY: 0, posZ: 0 };
  }
  const s = dir >= 0 ? 1 : -1;
  // Wind-up (0..0.22) -> fast strike (0.22..0.58) -> smooth return (0.58..1.0)
  let swing = 0;
  if (p < 0.22) {
    swing = -0.28 * smoothstep01(p / 0.22);
  } else if (p < 0.58) {
    const k = (p - 0.22) / 0.36;
    swing = -0.28 + 1.38 * (1 - Math.pow(1 - k, 3));
  } else {
    const k = (p - 0.58) / 0.42;
    swing = 1.1 * (1 - smoothstep01(k));
  }
  return {
    rotX: -0.48 - swing * 1.38,
    rotY: 0.25 + s * swing * 1.55,
    rotZ: 0.32 + s * swing * 1.24,
    posX: -s * swing * 0.21,
    posY: Math.sin(p * Math.PI) * 0.055,
    posZ: -Math.max(0, swing) * 0.24,
  };
}

// ---------------------------------------------------------------------------
// 3. CAMERA MOTION (Walk Bob, Landing Dip, Firing Shake, Slide Tilt)
// ---------------------------------------------------------------------------

export function getEffectiveCameraMotionScale(intensityPct: number, reducedMotion: boolean): number {
  if (reducedMotion) return 0;
  if (!Number.isFinite(intensityPct)) return 0.65;
  return Math.max(0, Math.min(1, intensityPct / 100));
}

export interface CameraMotionOffsets {
  offsetY: number;
  offsetX: number;
  rollZ: number;
  pitchX: number;
  shakeAmp: number;
}

export function computeCameraMotionOffsets(params: {
  intensityScale: number;
  walkBobTimer: number;
  isMoving: boolean;
  onGround: boolean;
  sprinting: boolean;
  sliding: boolean;
  isADS: boolean;
  strafeInputX: number;
  landDip: number;
  screenShake: number;
}): CameraMotionOffsets {
  const s = Math.max(0, Math.min(1, params.intensityScale));
  if (s <= 0.001) {
    return { offsetY: 0, offsetX: 0, rollZ: 0, pitchX: 0, shakeAmp: 0 };
  }

  const adsDamp = params.isADS ? 0.42 : 1.0;
  let offsetY = 0;
  let offsetX = 0;
  let rollZ = 0;

  if (params.sliding) {
    rollZ = 0.072 * s;
    offsetY = -0.012 * s;
  } else if (params.isMoving && params.onGround) {
    const ampY = (params.sprinting ? 0.036 : 0.02) * adsDamp * s;
    const ampX = (params.sprinting ? 0.014 : 0.008) * adsDamp * s;
    offsetY = Math.sin(params.walkBobTimer * 2) * ampY;
    offsetX = Math.cos(params.walkBobTimer) * ampX;
    rollZ = (-params.strafeInputX * 0.026 + Math.sin(params.walkBobTimer) * (params.sprinting ? 0.016 : 0.009)) * adsDamp * s;
  } else {
    offsetY = Math.sin(params.walkBobTimer) * 0.0038 * adsDamp * s;
  }

  const dip = Math.max(0, params.landDip) * s;
  offsetY -= dip;
  const pitchX = -dip * 0.48;
  const shakeAmp = Math.max(0, params.screenShake) * s;

  return { offsetY, offsetX, rollZ, pitchX, shakeAmp };
}

// ---------------------------------------------------------------------------
// 4. ADAPTIVE AUTO-QUALITY & OBJECT POOL FX BUDGETS
// ---------------------------------------------------------------------------

export type GfxPresetKind =
  | 'auto'
  | 'lite'
  | 'promax'
  | 'ultramax'
  | 'ultra'
  | 'high'
  | 'med'
  | 'low'
  | 'potato';
export type FxQualityTier = 0 | 1 | 2;

export interface FxBudget {
  tier: FxQualityTier;
  enableShells: boolean;
  enableDecals: boolean;
  enableMuzzleLight: boolean;
  particleCountScale: number;
  maxActiveParticles: number;
  maxActiveShells: number;
  maxActiveDecals: number;
}

export function getBaseFxTierForPreset(preset: GfxPresetKind): FxQualityTier {
  if (preset === 'potato' || preset === 'low' || preset === 'lite') return 0;
  if (preset === 'med' || preset === 'auto') return 1;
  return 2;
}

export function computeFxBudget(
  preset: GfxPresetKind,
  autoQualityTier: FxQualityTier,
  reducedMotion: boolean
): FxBudget {
  if (reducedMotion) {
    return {
      tier: 0,
      enableShells: false,
      enableDecals: true,
      enableMuzzleLight: false,
      particleCountScale: 0.35,
      maxActiveParticles: 24,
      maxActiveShells: 0,
      maxActiveDecals: 14,
    };
  }
  const baseTier = getBaseFxTierForPreset(preset);
  const tier = Math.min(baseTier, autoQualityTier) as FxQualityTier;
  if (tier === 0) {
    return {
      tier: 0,
      enableShells: false,
      enableDecals: true,
      enableMuzzleLight: false,
      particleCountScale: 0.4,
      maxActiveParticles: 28,
      maxActiveShells: 0,
      maxActiveDecals: 14,
    };
  }
  if (tier === 1) {
    return {
      tier: 1,
      enableShells: true,
      enableDecals: true,
      enableMuzzleLight: true,
      particleCountScale: 0.68,
      maxActiveParticles: 48,
      maxActiveShells: 10,
      maxActiveDecals: 20,
    };
  }
  return {
    tier: 2,
    enableShells: true,
    enableDecals: true,
    enableMuzzleLight: true,
    particleCountScale: 1.0,
    maxActiveParticles: 72,
    maxActiveShells: 20,
    maxActiveDecals: 28,
  };
}

export interface AutoQualityMonitorState {
  tier: FxQualityTier;
  lowFpsStreakSec: number;
  highFpsStreakSec: number;
}

export function createAutoQualityMonitorState(): AutoQualityMonitorState {
  return {
    tier: 2,
    lowFpsStreakSec: 0,
    highFpsStreakSec: 0,
  };
}

/**
 * Dynamically lowers heavy FX tier first when FPS dips (< 36fps for >= 1.2s,
 * or < 24fps immediately), and restores smoothly when FPS stays >= 52fps for >= 3.0s.
 * Skipped on headless software WebGL (`isSoftwareGl = true`) so test captures stay deterministic.
 */
export function stepAutoQualityTier(
  state: AutoQualityMonitorState,
  fpsSample: number,
  sampleWindowSec: number,
  enabled: boolean,
  isSoftwareGl: boolean
): AutoQualityMonitorState {
  if (!enabled || isSoftwareGl || !Number.isFinite(fpsSample) || fpsSample <= 0) {
    return state.tier === 2 && state.lowFpsStreakSec === 0 && state.highFpsStreakSec === 0
      ? state
      : { tier: 2, lowFpsStreakSec: 0, highFpsStreakSec: 0 };
  }

  let { tier, lowFpsStreakSec, highFpsStreakSec } = state;

  if (fpsSample < 24) {
    lowFpsStreakSec += sampleWindowSec * 2.2;
    highFpsStreakSec = 0;
  } else if (fpsSample < 38) {
    lowFpsStreakSec += sampleWindowSec;
    highFpsStreakSec = 0;
  } else if (fpsSample >= 52) {
    highFpsStreakSec += sampleWindowSec;
    lowFpsStreakSec = Math.max(0, lowFpsStreakSec - sampleWindowSec);
  } else {
    lowFpsStreakSec = Math.max(0, lowFpsStreakSec - sampleWindowSec * 0.5);
    highFpsStreakSec = Math.max(0, highFpsStreakSec - sampleWindowSec * 0.5);
  }

  if (lowFpsStreakSec >= 1.2 && tier > 0) {
    tier = (tier - 1) as FxQualityTier;
    lowFpsStreakSec = 0;
  } else if (highFpsStreakSec >= 3.0 && tier < 2) {
    tier = (tier + 1) as FxQualityTier;
    highFpsStreakSec = 0;
  }

  return { tier, lowFpsStreakSec, highFpsStreakSec };
}
