import { PEERJS_STUN_SERVERS } from './peerConfig';

export { PEERJS_STUN_SERVERS };

export type BotDifficultyPreset = 'weak' | 'medium' | 'strong' | 'custom';

export type WeaponId =
  | 'ak47'
  | 'm4a1'
  | 'sniper'
  | 'mp5'
  | 'shotgun'
  | 'pistol'
  | 'katana'
  | 'lmg'
  | 'deagle'
  | 'rpg';

export interface WeaponCatalogItem {
  id: WeaponId;
  nameEn: string;
  nameFa: string;
  categoryFa: string;
  damageLabel: string;
  fireModeFa: string;
}

export const WEAPON_CATALOG: WeaponCatalogItem[] = [
  {
    id: 'ak47',
    nameEn: 'AK-47 Tactical',
    nameFa: 'کلاشینکف تاکتیکی',
    categoryFa: 'رایفل هجومی سنگین',
    damageLabel: '36 DMG',
    fireModeFa: 'اتوماتیک · ریل تاکتیکی',
  },
  {
    id: 'm4a1',
    nameEn: 'M4A1-S SpecOps',
    nameFa: 'کارباین صداخفه‌کن‌دار',
    categoryFa: 'کارباین دقیق',
    damageLabel: '31 DMG',
    fireModeFa: 'اتوماتیک · سایلنسر',
  },
  {
    id: 'sniper',
    nameEn: 'AWM .338 Lapua',
    nameFa: 'اسنایپر دوربرد AWM',
    categoryFa: 'تک‌تیرانداز سنگین',
    damageLabel: '115 DMG',
    fireModeFa: 'گلنگدنی · اسکوپ ۸X',
  },
  {
    id: 'mp5',
    nameEn: 'MP5-SD Navy',
    nameFa: 'مسلسل دستی MP5',
    categoryFa: 'SMG سرعت بالا',
    damageLabel: '25 DMG',
    fireModeFa: 'نرخ آتش بسیار بالا',
  },
  {
    id: 'shotgun',
    nameEn: 'SPAS-12 Breacher',
    nameFa: 'شاتگان پمپی SPAS',
    categoryFa: 'نبرد نزدیک CQB',
    damageLabel: '8x20 DMG',
    fireModeFa: 'پمپی · ۸ ساچمه',
  },
  {
    id: 'pistol',
    nameEn: 'G18 Tactical',
    nameFa: 'کلت کمری لیزردار',
    categoryFa: 'سلاح کمری سریع',
    damageLabel: '32 DMG',
    fireModeFa: 'نیمه‌اتوماتیک · سبک',
  },
  {
    id: 'katana',
    nameEn: 'Tactical Blade',
    nameFa: 'شمشیر تاکتیکی',
    categoryFa: 'سلاح سرد بی‌صدا',
    damageLabel: '95 DMG',
    fireModeFa: 'ضربه نزدیک · سرعت بالا',
  },
  {
    id: 'lmg',
    nameEn: 'M249 SAW Heavy',
    nameFa: 'تیربار سنگین M249',
    categoryFa: 'پشتیبانی سنگین ۱۰۰ تیر',
    damageLabel: '34 DMG',
    fireModeFa: 'اتوماتیک · خشاب ۱۰۰ تایی',
  },
  {
    id: 'deagle',
    nameEn: 'Desert Eagle .50AE',
    nameFa: 'کلت سنگین دزرت ایگل',
    categoryFa: 'کالیبر ۵۰ سنگین',
    damageLabel: '72 DMG',
    fireModeFa: 'نیمه‌اتوماتیک · قدرت بالا',
  },
  {
    id: 'rpg',
    nameEn: 'RPG-7V Launcher',
    nameFa: 'آرپی‌جی ضدسنگر RPG-7',
    categoryFa: 'راکت‌انداز انفجاری',
    damageLabel: '180 DMG',
    fireModeFa: 'انفجاری · موج انفجار محیطی',
  },
];

export const MAX_LOADOUT_SIZE = 3;

export const DEFAULT_LOADOUT: WeaponId[] = ['ak47', 'sniper', 'pistol'];

export function sanitizeLoadout(input: readonly WeaponId[] | unknown): WeaponId[] {
  const validSet = new Set<WeaponId>(WEAPON_CATALOG.map((w) => w.id));
  const picked: WeaponId[] = [];
  if (Array.isArray(input)) {
    for (const raw of input) {
      if (typeof raw === 'string' && validSet.has(raw as WeaponId) && !picked.includes(raw as WeaponId)) {
        picked.push(raw as WeaponId);
        if (picked.length === MAX_LOADOUT_SIZE) break;
      }
    }
  }
  for (const fallback of DEFAULT_LOADOUT) {
    if (picked.length >= MAX_LOADOUT_SIZE) break;
    if (!picked.includes(fallback)) picked.push(fallback);
  }
  for (const item of WEAPON_CATALOG) {
    if (picked.length >= MAX_LOADOUT_SIZE) break;
    if (!picked.includes(item.id)) picked.push(item.id);
  }
  return picked.slice(0, MAX_LOADOUT_SIZE);
}

export function toggleLoadoutWeapon(
  currentLoadout: readonly WeaponId[],
  targetWeapon: WeaponId,
  preferredSlot = -1
): WeaponId[] {
  const clean = sanitizeLoadout(currentLoadout);
  const existingIdx = clean.indexOf(targetWeapon);
  if (existingIdx !== -1) {
    // Already equipped: keep it valid (3 weapons always required); move to slot 0 if clicked to prioritize
    if (existingIdx === 0) return clean;
    const reordered = [...clean];
    reordered.splice(existingIdx, 1);
    reordered.unshift(targetWeapon);
    return reordered;
  }
  const next = [...clean];
  if (preferredSlot >= 0 && preferredSlot < MAX_LOADOUT_SIZE) {
    next[preferredSlot] = targetWeapon;
  } else {
    // Shift slots: keep first two, replace 3rd slot (or rotate)
    next[MAX_LOADOUT_SIZE - 1] = targetWeapon;
  }
  return sanitizeLoadout(next);
}

export type HudLayoutPreset = 'standard' | 'claw' | 'lefthanded';

export type MapId = 'warehouse' | 'docks' | 'outpost';

export interface MapDefinition {
  id: MapId;
  nameFa: string;
  nameEn: string;
  subtitleFa: string;
  badgeFa: string;
  accentColor: string;
  arenaHalf: number;
  skyHex: number;
  fogHex: number;
  fogDensity: number;
  ambientHex: number;
  ambientIntensity: number;
  sunHex: number;
  sunIntensity: number;
}

export const MAP_LIST: MapDefinition[] = [
  {
    id: 'warehouse',
    nameFa: 'انبار صنعتی (Killhouse)',
    nameEn: 'Industrial Killhouse',
    subtitleFa: 'سوله تاکتیکی با برجک دیده‌بانی، کانتینرهای مرکزی و نورپردازی صنعتی',
    badgeFa: 'کلاسیک CQB',
    accentColor: '#38bdf8',
    arenaHalf: 32,
    skyHex: 0x090c12,
    fogHex: 0x0a0d14,
    fogDensity: 0.015,
    ambientHex: 0x4a5b75,
    ambientIntensity: 0.72,
    sunHex: 0xffeedd,
    sunIntensity: 1.5,
  },
  {
    id: 'docks',
    nameFa: 'بندر کانتینری شبانه (Neon Docks)',
    nameEn: 'Neon Cargo Docks',
    subtitleFa: 'محوطه کانتینرهای کشتیرانی، پل جرثقیل، سکوهای دوطبقه و آسفالت بارانی',
    badgeFa: 'بندر شبانه',
    accentColor: '#0ea5e9',
    arenaHalf: 32,
    skyHex: 0x050914,
    fogHex: 0x060b18,
    fogDensity: 0.012,
    ambientHex: 0x3b6496,
    ambientIntensity: 0.85,
    sunHex: 0x7dd3fc,
    sunIntensity: 1.85,
  },
  {
    id: 'outpost',
    nameFa: 'پایگاه نظامی بیابانی (Desert Outpost)',
    nameEn: 'Desert Canyon Outpost',
    subtitleFa: 'دژ نظامی شنی با ۲ برجک تک‌تیرانداز، طاق‌های مرکزی، سنگرهای HESCO و نخلستان',
    badgeFa: 'بیابانی · بازطراحی کامل',
    accentColor: '#f59e0b',
    arenaHalf: 32,
    skyHex: 0xc89666,
    fogHex: 0xc28e5c,
    fogDensity: 0.0085,
    ambientHex: 0xffe0b2,
    ambientIntensity: 1.15,
    sunHex: 0xfff3d1,
    sunIntensity: 2.25,
  },
];

export interface CheatConfig {
  aimAssistEnabled: boolean;
  aimAssistStrength: number; // 0 to 100 (%)
  aimAssistHeadshot: boolean; // Lock onto head instead of chest
  godMode: boolean; // Invulnerable
  infiniteAmmo: boolean; // Unlimited mag & reserve in all modes
  espWallhack: boolean; // 3D glowing box through walls
  superSpeed: boolean; // 1.7x movement & jump boost
  zeroRecoil: boolean; // No recoil or spread
}

export const DEFAULT_CHEAT_CONFIG: CheatConfig = {
  aimAssistEnabled: true,
  aimAssistStrength: 10,
  aimAssistHeadshot: false,
  godMode: false,
  infiniteAmmo: false,
  espWallhack: false,
  superSpeed: false,
  zeroRecoil: false,
};

export const CHEAT_UNLOCK_DURATION_SEC = 30;

export function tickCheatUnlockTimer(
  remainingSec: number,
  dtSec: number
): { unlocked: boolean; remainingSec: number } {
  const next = Math.max(0, Number((remainingSec - Math.max(0, dtSec)).toFixed(2)));
  return {
    unlocked: next > 0,
    remainingSec: next,
  };
}

export function normalizeRoomCode(rawInput: string): string {
  if (typeof rawInput !== 'string') return '';
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  let cleaned = '';
  for (const ch of rawInput.trim()) {
    const pIdx = persianDigits.indexOf(ch);
    const aIdx = arabicDigits.indexOf(ch);
    if (pIdx !== -1) cleaned += String(pIdx);
    else if (aIdx !== -1) cleaned += String(aIdx);
    else if (/[a-zA-Z0-9-]/.test(ch)) cleaned += ch.toUpperCase();
  }
  if (!cleaned) return '';
  if (cleaned.startsWith('BC-')) return cleaned;
  if (cleaned.startsWith('BC') && cleaned.length > 2) return `BC-${cleaned.slice(2)}`;
  return `BC-${cleaned}`;
}

export function sanitizeCheatConfig(input: Partial<CheatConfig>): CheatConfig {
  const rawStrength = Number(input.aimAssistStrength ?? DEFAULT_CHEAT_CONFIG.aimAssistStrength);
  const aimAssistStrength = Number.isFinite(rawStrength)
    ? Math.max(0, Math.min(100, Math.round(rawStrength)))
    : DEFAULT_CHEAT_CONFIG.aimAssistStrength;

  return {
    aimAssistEnabled: Boolean(input.aimAssistEnabled ?? DEFAULT_CHEAT_CONFIG.aimAssistEnabled),
    aimAssistStrength,
    aimAssistHeadshot: Boolean(input.aimAssistHeadshot ?? DEFAULT_CHEAT_CONFIG.aimAssistHeadshot),
    godMode: Boolean(input.godMode ?? DEFAULT_CHEAT_CONFIG.godMode),
    infiniteAmmo: Boolean(input.infiniteAmmo ?? DEFAULT_CHEAT_CONFIG.infiniteAmmo),
    espWallhack: Boolean(input.espWallhack ?? DEFAULT_CHEAT_CONFIG.espWallhack),
    superSpeed: Boolean(input.superSpeed ?? DEFAULT_CHEAT_CONFIG.superSpeed),
    zeroRecoil: Boolean(input.zeroRecoil ?? DEFAULT_CHEAT_CONFIG.zeroRecoil),
  };
}

export function verifyCheatPasscode(rawInput: string): boolean {
  if (typeof rawInput !== 'string') return false;
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  let normalized = '';
  for (const ch of rawInput) {
    const pIdx = persianDigits.indexOf(ch);
    const aIdx = arabicDigits.indexOf(ch);
    if (pIdx !== -1) {
      normalized += String(pIdx);
    } else if (aIdx !== -1) {
      normalized += String(aIdx);
    } else if (ch !== ' ' && ch !== '\t' && ch !== '\n' && ch !== '\u200c') {
      normalized += ch.toLowerCase();
    }
  }
  return normalized === 'پارسا3435' || normalized === 'parsa3435';
}

export function hasLineOfSight3D(
  originX: number,
  originY: number,
  originZ: number,
  targetX: number,
  targetY: number,
  targetZ: number,
  wallColliders: WallCollider[]
): boolean {
  const dx = targetX - originX;
  const dy = targetY - originY;
  const dz = targetZ - originZ;
  const dist = Math.hypot(dx, dy, dz);
  if (dist <= 0.25) return true;

  for (let i = 0; i < wallColliders.length; i++) {
    const b = wallColliders[i];
    // Slab intersection on [0, 1] segment parameter t
    let tMin = 0.02;
    let tMax = 0.98;

    // X slab
    if (Math.abs(dx) < 1e-6) {
      if (originX < b.minX || originX > b.maxX) continue;
    } else {
      const invX = 1 / dx;
      let t1 = (b.minX - originX) * invX;
      let t2 = (b.maxX - originX) * invX;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) continue;
    }

    // Y slab [0, b.height]
    if (Math.abs(dy) < 1e-6) {
      if (originY < 0 || originY > b.height) continue;
    } else {
      const invY = 1 / dy;
      let t1 = (0 - originY) * invY;
      let t2 = (b.height - originY) * invY;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) continue;
    }

    // Z slab
    if (Math.abs(dz) < 1e-6) {
      if (originZ < b.minZ || originZ > b.maxZ) continue;
    } else {
      const invZ = 1 / dz;
      let t1 = (b.minZ - originZ) * invZ;
      let t2 = (b.maxZ - originZ) * invZ;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) continue;
    }

    if (tMin <= tMax) {
      return false;
    }
  }

  return true;
}

function isPointBlockedByTallCover(
  x: number,
  z: number,
  playerY: number,
  radius: number,
  wallColliders: WallCollider[],
  arenaHalf: number
): boolean {
  if (Math.abs(x) > arenaHalf - 1.2 || Math.abs(z) > arenaHalf - 1.2) return true;
  const minCoverHeight = playerY + 1.0;
  for (let i = 0; i < wallColliders.length; i++) {
    const b = wallColliders[i];
    if (b.height < minCoverHeight) continue;
    if (x + radius > b.minX && x - radius < b.maxX && z + radius > b.minZ && z - radius < b.maxZ) {
      return true;
    }
  }
  return false;
}

export function computeAutoCornerLean(
  playerX: number,
  playerY: number,
  playerZ: number,
  yaw: number,
  isADS: boolean,
  strafeInputX: number,
  prevLean: number,
  wallColliders: WallCollider[],
  arenaHalf = 32
): number {
  const sinY = Math.sin(yaw);
  const cosY = Math.cos(yaw);
  const fwdX = -sinY;
  const fwdZ = -cosY;
  const rightX = cosY;
  const rightZ = -sinY;

  const distClose = 0.6;
  const distNear = 0.95;
  const distMid = isADS ? 1.75 : 1.45;
  const distFar = isADS ? 2.55 : 2.1;

  const blockedAt = (latOffset: number, fwdDist: number, rad = 0.18) =>
    isPointBlockedByTallCover(
      playerX + rightX * latOffset + fwdX * fwdDist,
      playerZ + rightZ * latOffset + fwdZ * fwdDist,
      playerY,
      rad,
      wallColliders,
      arenaHalf
    );

  // Check if there is actual cover in front of the player (center or inner shoulders)
  const centerBlocked =
    blockedAt(0, distClose, 0.22) || blockedAt(0, distNear, 0.22) || blockedAt(0, distMid, 0.2);
  const innerLeftBlocked =
    blockedAt(-0.36, distClose, 0.19) ||
    blockedAt(-0.36, distNear, 0.19) ||
    blockedAt(-0.36, distMid, 0.18);
  const innerRightBlocked =
    blockedAt(0.36, distClose, 0.19) ||
    blockedAt(0.36, distNear, 0.19) ||
    blockedAt(0.36, distMid, 0.18);

  // If there is no cover in front of the center or inner shoulders, do NOT lean (prevents false lean when walking parallel to walls)
  if (!centerBlocked && !innerLeftBlocked && !innerRightBlocked) {
    return 0;
  }

  // Check whether the outer peek lanes (±0.62m and ±0.78m lateral offset) have a clear line of sight past the corner
  const outerRightClear =
    !blockedAt(0.64, 0.15, 0.18) &&
    !blockedAt(0.64, distMid, 0.16) &&
    (!blockedAt(0.64, distFar, 0.14) || !blockedAt(0.82, distFar, 0.14));

  const outerLeftClear =
    !blockedAt(-0.64, 0.15, 0.18) &&
    !blockedAt(-0.64, distMid, 0.16) &&
    (!blockedAt(-0.64, distFar, 0.14) || !blockedAt(-0.82, distFar, 0.14));

  const canPeekRight = (centerBlocked || innerLeftBlocked) && outerRightClear;
  const canPeekLeft = (centerBlocked || innerRightBlocked) && outerLeftClear;

  if (canPeekRight && !canPeekLeft) {
    return 1;
  }
  if (canPeekLeft && !canPeekRight) {
    return -1;
  }
  if (canPeekRight && canPeekLeft) {
    // Behind a narrow pillar where both sides are open: follow strafe input or previous lean hysteresis
    if (strafeInputX > 0.06) return 1;
    if (strafeInputX < -0.06) return -1;
    if (prevLean > 0.1) return 1;
    if (prevLean < -0.1) return -1;
    if (innerLeftBlocked && !innerRightBlocked) return 1;
    if (innerRightBlocked && !innerLeftBlocked) return -1;
  }

  return 0;
}

export interface AimTargetPoint {
  id: string;
  x: number;
  y: number;
  z: number;
  visible?: boolean;
}

export interface AimAssistResult {
  nextYaw: number;
  nextPitch: number;
  lockedTarget: AimTargetPoint | null;
  angularErrorRad: number;
}

function normalizeAngleDelta(a: number): number {
  let d = a % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function computeAimAssistAngles(
  camX: number,
  camY: number,
  camZ: number,
  currentYaw: number,
  currentPitch: number,
  targets: AimTargetPoint[],
  strengthPct: number,
  dt: number,
  isFiringOrAds = false,
  wallColliders?: WallCollider[]
): AimAssistResult {
  const clampedStrength = Math.max(0, Math.min(100, strengthPct));
  if (clampedStrength <= 0 || targets.length === 0) {
    return {
      nextYaw: currentYaw,
      nextPitch: currentPitch,
      lockedTarget: null,
      angularErrorRad: Infinity,
    };
  }

  const strengthNorm = clampedStrength / 100; // 0..1
  // Balanced cone radius: 0.06 rad (~3.4 deg) at low assist up to 0.28 rad (~16 deg) at 100% assist
  const maxConeRad = 0.06 + strengthNorm * 0.22;

  let bestTarget: AimTargetPoint | null = null;
  let bestAngDist = Infinity;
  let bestDeltaYaw = 0;
  let bestDeltaPitch = 0;

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    if (t.visible === false) continue;
    if (wallColliders && wallColliders.length > 0) {
      if (!hasLineOfSight3D(camX, camY, camZ, t.x, t.y, t.z, wallColliders)) {
        continue;
      }
    }

    const dx = t.x - camX;
    const dy = t.y - camY;
    const dz = t.z - camZ;
    const horizDist = Math.hypot(dx, dz);
    if (horizDist < 0.25 || horizDist > 85) continue;

    // In Three.js YXZ camera: forward is (-sin(yaw)*cos(pitch), sin(pitch), -cos(yaw)*cos(pitch))
    const targetYaw = Math.atan2(-dx, -dz);
    const targetPitch = Math.atan2(dy, horizDist);

    const dYaw = normalizeAngleDelta(targetYaw - currentYaw);
    const dPitch = targetPitch - currentPitch;
    const angDist = Math.hypot(dYaw, dPitch);

    if (angDist <= maxConeRad && angDist < bestAngDist) {
      bestAngDist = angDist;
      bestTarget = t;
      bestDeltaYaw = dYaw;
      bestDeltaPitch = dPitch;
    }
  }

  if (!bestTarget) {
    return {
      nextYaw: currentYaw,
      nextPitch: currentPitch,
      lockedTarget: null,
      angularErrorRad: Infinity,
    };
  }

  // Smooth, non-intrusive magnetic pull speed
  const pullSpeed = (0.95 + strengthNorm * strengthNorm * 8.5) * (isFiringOrAds ? 1.15 : 0.75);
  const blend = Math.min(0.45, pullSpeed * Math.max(0.001, dt));

  const nextYaw = currentYaw + bestDeltaYaw * blend;
  const nextPitch = Math.max(-1.45, Math.min(1.45, currentPitch + bestDeltaPitch * blend));

  return {
    nextYaw,
    nextPitch,
    lockedTarget: bestTarget,
    angularErrorRad: bestAngDist,
  };
}

export interface TrainingConfig {
  botSpeed: number; // Multiplier: 0.4 to 1.8 (1.0 = normal)
  botAccuracy: number; // Percentage: 10 to 100 (higher = tighter spread)
  botAggression: number; // Percentage: 10 to 100 (higher = faster fire rate & closer push)
  spawnCount: number; // 0 to 12 concurrent bots
  autoRespawnBots: boolean;
  infiniteAmmo: boolean;
  enabledWeapons: Record<WeaponId, boolean>;
  tutorialEnabled: boolean;
}

export interface ComputedBotParams {
  hpMult: number;
  speedMult: number;
  dmgMult: number;
  fireIntervalMult: number;
  bulletSpeed: number;
  spread: number;
  desiredRangeMult: number;
  strafeFrequencyMult: number;
}

export type TutorialStepId = 'movement' | 'shooting' | 'reloading' | 'powerups';

export interface TutorialStepProgress {
  id: TutorialStepId;
  titleFa: string;
  titleEn: string;
  instructionFa: string;
  controlsHintFa: string;
  unitLabelFa: string;
  detailedPointsFa: string[];
  proTipFa: string;
  current: number;
  target: number;
  completed: boolean;
}

export interface TutorialState {
  activeStepIndex: number;
  steps: TutorialStepProgress[];
  allCompleted: boolean;
}

export interface WallCollider {
  x: number;
  z: number;
  w: number;
  d: number;
  height: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const ALL_WEAPON_IDS: WeaponId[] = [
  'ak47',
  'm4a1',
  'sniper',
  'mp5',
  'shotgun',
  'pistol',
  'katana',
  'lmg',
  'deagle',
  'rpg',
];

export const DEFAULT_TRAINING_CONFIG: TrainingConfig = {
  botSpeed: 1.0,
  botAccuracy: 55,
  botAggression: 45,
  spawnCount: 3,
  autoRespawnBots: true,
  infiniteAmmo: false,
  enabledWeapons: {
    ak47: true,
    m4a1: true,
    sniper: true,
    mp5: true,
    shotgun: true,
    pistol: true,
    katana: true,
    lmg: true,
    deagle: true,
    rpg: true,
  },
  tutorialEnabled: true,
};

export function sanitizeTrainingConfig(input: Partial<TrainingConfig>): TrainingConfig {
  const botSpeed = Math.max(0.4, Math.min(1.8, Number(input.botSpeed ?? DEFAULT_TRAINING_CONFIG.botSpeed) || 1.0));
  const botAccuracy = Math.max(10, Math.min(100, Math.round(Number(input.botAccuracy ?? DEFAULT_TRAINING_CONFIG.botAccuracy) || 55)));
  const botAggression = Math.max(10, Math.min(100, Math.round(Number(input.botAggression ?? DEFAULT_TRAINING_CONFIG.botAggression) || 45)));
  const spawnCount = Math.max(0, Math.min(12, Math.round(Number(input.spawnCount ?? DEFAULT_TRAINING_CONFIG.spawnCount))));

  const rawWeapons = (input.enabledWeapons ?? DEFAULT_TRAINING_CONFIG.enabledWeapons) as Partial<Record<WeaponId, boolean>>;
  const enabledWeapons: Record<WeaponId, boolean> = {
    ak47: rawWeapons.ak47 ?? true,
    m4a1: rawWeapons.m4a1 ?? true,
    sniper: rawWeapons.sniper ?? true,
    mp5: rawWeapons.mp5 ?? true,
    shotgun: rawWeapons.shotgun ?? true,
    pistol: rawWeapons.pistol ?? true,
    katana: rawWeapons.katana ?? true,
    lmg: rawWeapons.lmg ?? true,
    deagle: rawWeapons.deagle ?? true,
    rpg: rawWeapons.rpg ?? true,
  };

  // Enforce at least one weapon enabled
  const anyEnabled = ALL_WEAPON_IDS.some((id) => enabledWeapons[id]);
  if (!anyEnabled) {
    enabledWeapons.ak47 = true;
  }

  return {
    botSpeed: Number(botSpeed.toFixed(2)),
    botAccuracy,
    botAggression,
    spawnCount,
    autoRespawnBots: input.autoRespawnBots ?? DEFAULT_TRAINING_CONFIG.autoRespawnBots,
    infiniteAmmo: input.infiniteAmmo ?? DEFAULT_TRAINING_CONFIG.infiniteAmmo,
    enabledWeapons,
    tutorialEnabled: input.tutorialEnabled ?? DEFAULT_TRAINING_CONFIG.tutorialEnabled,
  };
}

export function getEnabledWeaponIndices(enabledWeapons: Record<WeaponId, boolean>): number[] {
  const indices: number[] = [];
  ALL_WEAPON_IDS.forEach((id, idx) => {
    if (enabledWeapons[id]) indices.push(idx);
  });
  return indices.length > 0 ? indices : [0];
}

export function computeBotParameters(
  mode: 'campaign' | 'training',
  preset: BotDifficultyPreset,
  trainingConfig: TrainingConfig
): ComputedBotParams {
  if (mode === 'training') {
    const clean = sanitizeTrainingConfig(trainingConfig);
    // Accuracy 10..100 maps to spread 0.18 (inaccurate) down to 0.018 (accurate)
    const accNorm = (clean.botAccuracy - 10) / 90; // 0..1
    const spread = Number((0.18 - accNorm * 0.162).toFixed(4));

    // Aggression 10..100 maps to fireIntervalMult 1.85 (relaxed) down to 0.72 (aggressive)
    const aggNorm = (clean.botAggression - 10) / 90; // 0..1
    const fireIntervalMult = Number((1.85 - aggNorm * 1.13).toFixed(3));
    const dmgMult = Number((0.55 + aggNorm * 0.75).toFixed(2));
    const bulletSpeed = Number((19 + aggNorm * 10).toFixed(1));
    const desiredRangeMult = Number((1.35 - aggNorm * 0.5).toFixed(2));
    const strafeFrequencyMult = Number((0.6 + aggNorm * 0.85).toFixed(2));

    return {
      hpMult: 1.0,
      speedMult: clean.botSpeed,
      dmgMult,
      fireIntervalMult,
      bulletSpeed,
      spread,
      desiredRangeMult,
      strafeFrequencyMult,
    };
  }

  switch (preset) {
    case 'weak':
      return {
        hpMult: 0.65,
        speedMult: 0.75,
        dmgMult: 0.55,
        fireIntervalMult: 1.6,
        bulletSpeed: 19,
        spread: 0.125,
        desiredRangeMult: 1.2,
        strafeFrequencyMult: 0.72,
      };
    case 'strong':
      return {
        hpMult: 1.35,
        speedMult: 1.2,
        dmgMult: 1.25,
        fireIntervalMult: 0.82,
        bulletSpeed: 28,
        spread: 0.038,
        desiredRangeMult: 0.82,
        strafeFrequencyMult: 1.3,
      };
    case 'medium':
    default:
      return {
        hpMult: 1.0,
        speedMult: 1.0,
        dmgMult: 0.9,
        fireIntervalMult: 1.15,
        bulletSpeed: 23,
        spread: 0.075,
        desiredRangeMult: 1.0,
        strafeFrequencyMult: 1.0,
      };
  }
}

export function calculateWeaponDamage(
  baseDamage: number,
  headMultiplier: number,
  isHeadshot: boolean,
  overdriveActive: boolean
): number {
  const hitDmg = isHeadshot ? baseDamage * headMultiplier : baseDamage;
  const buffMult = overdriveActive ? 2.0 : 1.0;
  return Math.round(hitDmg * buffMult);
}

export function calculateDamageTaken(
  incomingDamage: number,
  currentHp: number,
  currentArmor: number
): { hpDamage: number; armorAbsorbed: number; nextHp: number; nextArmor: number } {
  const dmg = Math.max(0, Math.round(incomingDamage));
  let armorAbsorbed = 0;
  if (currentArmor > 0) {
    armorAbsorbed = Math.min(currentArmor, Math.round(dmg * 0.65));
  }
  const hpDamage = dmg - armorAbsorbed;
  const nextArmor = Math.max(0, currentArmor - armorAbsorbed);
  const nextHp = Math.max(0, currentHp - hpDamage);
  return { hpDamage, armorAbsorbed, nextHp, nextArmor };
}

export function createInitialTutorialState(): TutorialState {
  return {
    activeStepIndex: 0,
    allCompleted: false,
    steps: [
      {
        id: 'movement',
        titleFa: '۱. حرکت تاکتیکی و دویدن (Low-Ready)',
        titleEn: '1. Tactical Movement & Sprint',
        instructionFa: 'در محیط نقشه حرکت کنید و با نگه داشتن Shift (یا کشیدن جوی‌استیک به بالا) بدوید تا حالت حمل پایین سلاح (Low-Ready) و فیزیک بادی‌کم را تجربه کنید.',
        controlsHintFa: 'کلیدهای WASD برای حرکت · Shift برای دویدن سریع · Space برای پرش',
        unitLabelFa: 'متر جابه‌جایی تاکتیکی',
        detailedPointsFa: [
          'فیزیک لنز روی سینه (Bodycam Inertia): هنگام گام‌برداشتن و چرخش به چپ/راست، دوربین به‌طور طبیعی زاویه می‌گیرد (Camera Roll).',
          'دویدن تاکتیکی (Low-Ready Sprint): با نگه داشتن Shift سرعت شما ۲۸٪ افزایش یافته و سلاح به حالت ایمن رو به پایین جمع می‌شود.',
          'عبور از موانع و سنگرگیری: با کلید Space روی جعبه‌ها و رمپ‌ها بپرید و از کانتینرها برای قطع خط دید دشمن استفاده کنید.',
        ],
        proTipFa: 'نکته تاکتیکی: پیش از رسیدن به گوشه دیوارها دویدن را متوقف کنید تا سلاح بلافاصله آماده شلیک باشد.',
        current: 0,
        target: 10,
        completed: false,
      },
      {
        id: 'shooting',
        titleFa: '۲. هدف‌گیری لیزری، نشانه کج (ADS) و شلیک',
        titleEn: '2. Laser Sight, Canted ADS & Shooting',
        instructionFa: 'با کلیک راست (یا دکمه هدف) سلاح را به حالت زاویه‌دار بادی‌کم ببرید و با کمک نقطه لیزر قرمز و ایم اسیست ۳ بار به سمت اهداف یا بات‌ها شلیک کنید.',
        controlsHintFa: 'کلیک چپ: شلیک · کلیک راست یا Q: نشانه تاکتیکی (ADS) · F: چراغ‌قوه',
        unitLabelFa: 'شلیک یا ضربه تمرین‌شده',
        detailedPointsFa: [
          'نشانگر لیزر قرمز (Laser Sight): نقطه برخورد واقعی گلوله روی دیوارها و دشمنان را حتی بدون نشانه‌گر وسط صفحه نمایش می‌دهد.',
          'ایم اسیست هوشمند (Aim Assist): در تنظیمات می‌توانید قدرت قفل خودکار روی دشمن را از ۰ تا ۱۰۰٪ تنظیم کنید.',
          'مهار لگد سنگین (Recoil Control) و هدشات: شلیک به سر دشمنان ۲ برابر آسیب وارد کرده و امتیاز ویژه هدشات می‌دهد.',
        ],
        proTipFa: 'نکته تاکتیکی: با AK-47 یا M4A1 به‌صورت تک‌تیر یا رگبارهای کوتاه شلیک کنید تا لگد عمودی دوربین کنترل شود.',
        current: 0,
        target: 3,
        completed: false,
      },
      {
        id: 'reloading',
        titleFa: '۳. تعویض خشاب و تغییر بین ۵ سلاح',
        titleEn: '3. Magazine Reload & 5-Weapon Arsenal',
        instructionFa: 'پس از شلیک، دکمه R را برای تعویض خشاب بزنید یا با کلیدهای ۱ تا ۵ (یا دکمه تعویض گان در صفحه لمسی) بین ۵ سلاح خود جابه‌جا شوید.',
        controlsHintFa: 'کلید R: تعویض خشاب · کلیدهای 1 تا 5 یا دکمه تعویض گان: تغییر سلاح',
        unitLabelFa: 'تعویض خشاب یا سلاح',
        detailedPointsFa: [
          'تنوع کامل ۵ سلاح: ۱. کلاشینکف AK-47، ۲. کارباین صداخفه‌کن‌دار M4A1، ۳. شاتگان پمپی SPAS-12، ۴. کلت لیزردار Glock-18 و ۵. شمشیر Cyber Katana.',
          'تعویض سریع سلاح در موبایل و PC: با لمس مستقیم نوار سلاح پایین صفحه، دکمه چرخشی تعویض گان یا کلیدهای 1 تا 5 فورا سلاح را عوض کنید.',
          'مدیریت خشاب (Magazine Discipline): همیشه پشت سنگر خشاب عوض کنید یا در صورت اتمام تیر، سریع به کلت یا شاتگان سوئیچ کنید.',
        ],
        proTipFa: 'نکته تاکتیکی: در تنظیمات چیت می‌توانید گزینه «تیر بی‌نهایت» را برای تمام مودها روشن کنید.',
        current: 0,
        target: 1,
        completed: false,
      },
      {
        id: 'powerups',
        titleFa: '۴. قدرت آدرنالین و تجهیزات تاکتیکی',
        titleEn: '4. Adrenaline Surge & Field Pickups',
        instructionFa: 'دکمه E (یا آیکون رعدوبرق) را بزنید تا قدرت «آدرنالین تاکتیکی» فعال شود (+۳۵٪ سرعت، -۵۵٪ لگد سلاح و +۲۵ سلامت) یا یکی از جعبه‌های زره/قدرت 2X نقشه را بردارید.',
        controlsHintFa: 'کلید E: فعال‌سازی آدرنالین · جعبه‌های سبز (سلامت)، آبی (زره) و بنفش (قدرت 2X)',
        unitLabelFa: 'فعال‌سازی قدرت یا دریافت تجهیزات',
        detailedPointsFa: [
          'قدرت فعال آدرنالین (کلید E): به مدت ۶ ثانیه سرعت حرکت را ۳۵٪ افزایش داده، لگد سلاح را ۵۵٪ کم می‌کند و ۲۵ واحد سلامت برمی‌گرداند.',
          'جلیقه زرهی (جعبه آبی Armor Shield): تا ۱۰۰ واحد سپر زرهی ایجاد می‌کند که ۶۵٪ آسیب گلوله‌های دشمن را جذب می‌نماید.',
          'هسته قدرت (جعبه بنفش Overdrive 2X): به مدت ۸ ثانیه قدرت آسیب تمام سلاح‌ها را ۲ برابر کرده و مهمات ذخیره را شارژ می‌کند.',
        ],
        proTipFa: 'نکته تاکتیکی: ترکیب هم‌زمان «آدرنالین E» و «هسته قدرت 2X» به شما اجازه می‌دهد موج‌های سنگین بات‌ها را به‌سرعت پاکسازی کنید.',
        current: 0,
        target: 1,
        completed: false,
      },
    ],
  };
}

export function toggleTutorialStepChecklist(
  state: TutorialState,
  stepId: TutorialStepId
): TutorialState {
  const nextSteps = state.steps.map((step) => {
    if (step.id !== stepId) return step;
    const nextCompleted = !step.completed;
    return {
      ...step,
      completed: nextCompleted,
      current: nextCompleted ? step.target : 0,
    };
  });

  const firstIncompleteIdx = nextSteps.findIndex((s) => !s.completed);
  const allCompleted = firstIncompleteIdx === -1;
  const activeStepIndex = allCompleted ? nextSteps.length - 1 : firstIncompleteIdx;

  return {
    activeStepIndex,
    steps: nextSteps,
    allCompleted,
  };
}

export function recordTutorialProgress(
  state: TutorialState,
  stepId: TutorialStepId,
  amount = 1
): { nextState: TutorialState; newlyCompletedStep: TutorialStepId | null } {
  let newlyCompletedStep: TutorialStepId | null = null;
  let progressedIndex = -1;

  const nextSteps = state.steps.map((step, idx) => {
    if (step.id !== stepId || step.completed) return step;
    progressedIndex = idx;
    const nextCurrent = Math.min(step.target, Number((step.current + amount).toFixed(2)));
    const completed = nextCurrent >= step.target;
    if (completed && !step.completed) {
      newlyCompletedStep = step.id;
    }
    return {
      ...step,
      current: nextCurrent,
      completed,
    };
  });

  if (progressedIndex === -1) {
    return { nextState: state, newlyCompletedStep: null };
  }

  const firstIncompleteIdx = nextSteps.findIndex((s) => !s.completed);
  const allCompleted = firstIncompleteIdx === -1;
  let activeStepIndex = state.activeStepIndex;

  if (allCompleted) {
    activeStepIndex = nextSteps.length - 1;
  } else if (newlyCompletedStep) {
    activeStepIndex = firstIncompleteIdx;
  } else {
    activeStepIndex = progressedIndex;
  }

  return {
    nextState: {
      activeStepIndex,
      steps: nextSteps,
      allCompleted,
    },
    newlyCompletedStep,
  };
}

export function resolveCircleAABB(
  x: number,
  z: number,
  radius: number,
  yFoot: number,
  wallColliders: WallCollider[],
  arenaHalf = 32
): { x: number; z: number; floorY: number } {
  let nx = x;
  let nz = z;
  let floorY = 0;

  for (let i = 0; i < wallColliders.length; i++) {
    const b = wallColliders[i];
    if (yFoot >= b.height - 0.18) {
      if (
        nx + radius * 0.5 > b.minX &&
        nx - radius * 0.5 < b.maxX &&
        nz + radius * 0.5 > b.minZ &&
        nz - radius * 0.5 < b.maxZ
      ) {
        floorY = Math.max(floorY, b.height);
      }
      continue;
    }
    const closestX = Math.max(b.minX, Math.min(nx, b.maxX));
    const closestZ = Math.max(b.minZ, Math.min(nz, b.maxZ));
    const dx = nx - closestX;
    const dz = nz - closestZ;
    const distSq = dx * dx + dz * dz;
    if (distSq < radius * radius) {
      const dist = Math.sqrt(distSq);
      if (dist > 0.0001) {
        const overlap = radius - dist;
        nx += (dx / dist) * overlap;
        nz += (dz / dist) * overlap;
      } else {
        const dL = Math.abs(nx - b.minX);
        const dR = Math.abs(b.maxX - nx);
        const dT = Math.abs(nz - b.minZ);
        const dB = Math.abs(b.maxZ - nz);
        const m = Math.min(dL, dR, dT, dB);
        if (m === dL) nx = b.minX - radius;
        else if (m === dR) nx = b.maxX + radius;
        else if (m === dT) nz = b.minZ - radius;
        else nz = b.maxZ + radius;
      }
    }
  }

  nx = Math.max(-arenaHalf + 1.2, Math.min(arenaHalf - 1.2, nx));
  nz = Math.max(-arenaHalf + 1.2, Math.min(arenaHalf - 1.2, nz));
  return { x: nx, z: nz, floorY };
}

export interface BotStanceTransitionState {
  combatBlend: number; // 0 = relaxed patrol stance, 1 = shouldered combat stance
  alertTimer: number; // memory timer in seconds after losing sight
  currentYaw: number; // smoothly interpolated body yaw in radians
}

export interface BotStancePose {
  smoothCombat: number; // smoothstep(0..1) S-curve factor
  torsoPitch: number;
  torsoRoll: number;
  torsoY: number;
  headPitch: number;
  headYaw: number;
  armLPitch: number;
  armLYaw: number;
  armRPitch: number;
  armRYaw: number;
  weaponPosX: number;
  weaponPosY: number;
  weaponPosZ: number;
  weaponPitch: number;
  weaponYaw: number;
  weaponRoll: number;
  legLSwing: number;
  legRSwing: number;
}

export function lerpAngleRad(current: number, target: number, t: number): number {
  const delta = normalizeAngleDelta(target - current);
  return current + delta * Math.max(0, Math.min(1, t));
}

/**
 * Smoothly updates a bot's transition between patrolling and combat stance,
 * including alert memory and smooth body yaw rotation.
 */
export function computeBotStanceTransition(
  currentBlend: number,
  currentAlertTimer: number,
  currentYaw: number,
  targetCombatYaw: number,
  patrolHeadingYaw: number,
  hasLOS: boolean,
  distToPlayer: number,
  dt: number
): BotStanceTransitionState {
  const clampedDt = Math.max(0.001, Math.min(0.1, dt));
  const closeProximityDetected = distToPlayer < 8.5;
  const detectedNow = hasLOS || closeProximityDetected;

  const nextAlertTimer = detectedNow
    ? 2.6
    : Math.max(0, currentAlertTimer - clampedDt);

  const inCombatAlert = detectedNow || nextAlertTimer > 0;
  const targetBlend = inCombatAlert ? 1.0 : 0.0;

  // Raise weapon briskly on detection (~0.28s), lower gradually when returning to patrol (~0.65s)
  const transitionRate = inCombatAlert ? 4.2 : 1.65;
  const nextBlend = Math.max(
    0,
    Math.min(
      1,
      currentBlend + (targetBlend - currentBlend) * Math.min(1, transitionRate * clampedDt)
    )
  );

  // Smoothly turn toward patrol direction when patrolling, or toward player when alerted
  const desiredYaw = inCombatAlert ? targetCombatYaw : patrolHeadingYaw;
  const turnSpeed = inCombatAlert ? 9.5 : 4.8;
  const nextYaw = lerpAngleRad(currentYaw, desiredYaw, Math.min(1, turnSpeed * clampedDt));

  return {
    combatBlend: nextBlend,
    alertTimer: nextAlertTimer,
    currentYaw: nextYaw,
  };
}

/**
 * Computes natural 3D joint rotations and offsets for an EnemyBot
 * by blending between a relaxed low-ready patrol gait and a shouldered C-clamp combat stance.
 */
export function computeBotStancePose(
  combatBlend: number,
  walkPhase: number,
  isMoving: boolean
): BotStancePose {
  const t = Math.max(0, Math.min(1, combatBlend));
  // Hermite smoothstep S-curve for natural acceleration/deceleration of limbs
  const s = t * t * (3 - 2 * t);

  const strideAmp = isMoving ? (0.36 + s * 0.16) : 0;
  const legSwing = Math.sin(walkPhase) * strideAmp;
  const bobVertical = isMoving ? Math.abs(Math.cos(walkPhase)) * (0.018 + s * 0.014) : Math.sin(walkPhase * 0.5) * 0.006;
  const patrolSway = Math.sin(walkPhase * 0.5) * (1 - s);

  // Torso leans forward into a lower center-of-gravity tactical stance in combat
  const torsoPitch = 0.03 * (1 - s) + 0.16 * s;
  const torsoRoll = isMoving ? Math.cos(walkPhase) * 0.035 * (1 - s * 0.4) : 0;
  const torsoY = 1.13 - s * 0.035 + bobVertical;

  // Head scans left/right during patrol, locks onto player target in combat
  const headYaw = patrolSway * 0.28;
  const headPitch = -0.02 * (1 - s) - 0.08 * s;

  // Arms transition from low-ready chest carry to high shouldered rifle aim
  const armLPitch = (-0.46 - legSwing * 0.18) * (1 - s) + (-0.92 - legSwing * 0.12) * s;
  const armLYaw = 0.22 * (1 - s) + 0.04 * s;
  const armRPitch = (-0.54 + legSwing * 0.16) * (1 - s) + (-1.02 + legSwing * 0.1) * s;
  const armRYaw = -0.18 * (1 - s) + 0.0 * s;

  // Weapon transitions from diagonal low-ready carry across chest to shouldered line-of-sight
  const weaponPosX = 0.11 * (1 - s) + 0.16 * s;
  const weaponPosY = (1.07 + bobVertical * 0.7) * (1 - s) + (1.23 + bobVertical * 0.4) * s;
  const weaponPosZ = 0.23 * (1 - s) + 0.31 * s;

  const weaponPitch = (0.36 + Math.sin(walkPhase) * 0.04) * (1 - s) + 0.0 * s;
  const weaponYaw = (-0.42 + patrolSway * 0.08) * (1 - s) + 0.0 * s;
  const weaponRoll = 0.22 * (1 - s) + 0.0 * s;

  return {
    smoothCombat: s,
    torsoPitch,
    torsoRoll,
    torsoY,
    headPitch,
    headYaw,
    armLPitch,
    armLYaw,
    armRPitch,
    armRYaw,
    weaponPosX,
    weaponPosY,
    weaponPosZ,
    weaponPitch,
    weaponYaw,
    weaponRoll,
    legLSwing: legSwing,
    legRSwing: -legSwing,
  };
}

export type WeaponAmmoStateLevel = 'full' | 'nominal' | 'low' | 'empty' | 'melee';
export type WeaponHealthStateLevel = 'optimal' | 'caution' | 'critical';

export interface WeaponSlotStatusTelemetry {
  shortCode: string;
  ammoPct: number;
  ammoLevel: WeaponAmmoStateLevel;
  ammoLabel: string;
  ammoColor: string;
  healthPct: number;
  healthLevel: WeaponHealthStateLevel;
  healthLabel: string;
  healthColor: string;
}

const WEAPON_SHORT_CODES: Record<WeaponId, string> = {
  ak47: 'AK-47',
  m4a1: 'M4A1-S',
  sniper: 'AWM .338',
  mp5: 'MP5-SD',
  shotgun: 'SPAS-12',
  pistol: 'G18',
  katana: 'BLADE',
  lmg: 'M249',
  deagle: 'DEAGLE',
  rpg: 'RPG-7',
};

/**
 * Computes dynamic health and ammo status telemetry for a weapon slot button in the HUD bar.
 */
export function computeWeaponSlotTelemetry(
  weaponId: WeaponId,
  isMelee: boolean,
  mag: number,
  magSize: number,
  reserve: number,
  playerHp: number,
  playerMaxHp = 100,
  infiniteAmmo = false,
  godMode = false
): WeaponSlotStatusTelemetry {
  const shortCode = WEAPON_SHORT_CODES[weaponId] || weaponId.toUpperCase();

  // 1. Health / Operator Vitals Status
  const rawHpPct = playerMaxHp > 0 ? (playerHp / playerMaxHp) * 100 : 0;
  const healthPct = godMode ? 100 : Math.max(0, Math.min(100, Math.round(rawHpPct)));
  let healthLevel: WeaponHealthStateLevel = 'optimal';
  let healthColor = '#00e676';
  if (!godMode) {
    if (healthPct <= 25) {
      healthLevel = 'critical';
      healthColor = '#ff2e4c';
    } else if (healthPct <= 55) {
      healthLevel = 'caution';
      healthColor = '#ffbe0b';
    }
  }
  const healthLabel = godMode ? '∞' : `${healthPct}%`;

  // 2. Weapon Ammo Status
  if (isMelee) {
    return {
      shortCode,
      ammoPct: 100,
      ammoLevel: 'melee',
      ammoLabel: 'MELEE',
      ammoColor: '#38bdf8',
      healthPct,
      healthLevel,
      healthLabel,
      healthColor,
    };
  }

  const safeMagSize = Math.max(1, magSize);
  const clampedMag = Math.max(0, mag);
  const ammoPct = infiniteAmmo ? 100 : Math.max(0, Math.min(100, Math.round((clampedMag / safeMagSize) * 100)));

  let ammoLevel: WeaponAmmoStateLevel = 'full';
  let ammoColor = '#00e676';

  if (!infiniteAmmo) {
    if (clampedMag === 0) {
      ammoLevel = 'empty';
      ammoColor = '#ff2e4c';
    } else if (ammoPct <= 30) {
      ammoLevel = 'low';
      ammoColor = '#ffbe0b';
    } else if (ammoPct <= 75) {
      ammoLevel = 'nominal';
      ammoColor = '#38bdf8';
    }
  }

  const ammoLabel = infiniteAmmo ? `${ safeMagSize }/∞` : `${clampedMag}/${Math.max(0, reserve)}`;

  return {
    shortCode,
    ammoPct,
    ammoLevel,
    ammoLabel,
    ammoColor,
    healthPct,
    healthLevel,
    healthLabel,
    healthColor,
  };
}

export interface SmartBotSteeringResult {
  dirX: number;
  dirZ: number;
  headingYaw: number;
  blockedAhead: boolean;
}

/**
 * Multi-angle obstacle-avoidance steering solver so bots smoothly navigate around walls/crates
 * without getting stuck on corners while walking toward a waypoint or combat target.
 */
export function computeSmartBotSteering(
  botX: number,
  botZ: number,
  goalX: number,
  goalZ: number,
  strafeBias: number,
  radius: number,
  wallColliders: WallCollider[],
  arenaHalf = 32
): SmartBotSteeringResult {
  const dx = goalX - botX;
  const dz = goalZ - botZ;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.05) {
    return { dirX: 0, dirZ: 0, headingYaw: 0, blockedAhead: false };
  }

  const baseAngle = Math.atan2(dx, dz);
  const candidateOffsets =
    strafeBias >= 0
      ? [0, 0.42, -0.42, 0.85, -0.85, 1.32, -1.32, 1.82, -1.82]
      : [0, -0.42, 0.42, -0.85, 0.85, -1.32, 1.32, -1.82, 1.82];

  const probeNear = 0.85;
  const probeFar = 1.65;
  let bestAngle = baseAngle;
  let bestScore = -Infinity;
  let directBlocked = false;

  for (let i = 0; i < candidateOffsets.length; i++) {
    const offset = candidateOffsets[i];
    const ang = baseAngle + offset;
    const vx = Math.sin(ang);
    const vz = Math.cos(ang);

    const nearTestX = botX + vx * probeNear;
    const nearTestZ = botZ + vz * probeNear;
    const resNear = resolveCircleAABB(nearTestX, nearTestZ, radius + 0.06, 0, wallColliders, arenaHalf);
    const penNear = Math.hypot(resNear.x - nearTestX, resNear.z - nearTestZ);

    const farTestX = botX + vx * probeFar;
    const farTestZ = botZ + vz * probeFar;
    const resFar = resolveCircleAABB(farTestX, farTestZ, radius + 0.04, 0, wallColliders, arenaHalf);
    const penFar = Math.hypot(resFar.x - farTestX, resFar.z - farTestZ);

    if (i === 0 && (penNear > 0.02 || penFar > 0.04)) {
      directBlocked = true;
    }

    // Score prefers clear paths (zero penetration) and minimal deviation from goal angle
    const clearanceScore = -(penNear * 18 + penFar * 10);
    const alignmentScore = Math.cos(offset) * 1.4;
    const totalScore = clearanceScore + alignmentScore;

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestAngle = ang;
    }

    // Early exit if straight path is completely clear
    if (i === 0 && penNear < 0.005 && penFar < 0.005) {
      break;
    }
  }

  return {
    dirX: Math.sin(bestAngle),
    dirZ: Math.cos(bestAngle),
    headingYaw: bestAngle,
    blockedAhead: directBlocked,
  };
}

// =========================================================
// PEERJS (WEBRTC P2P) HOST-AUTHORITATIVE MULTIPLAYER HELPERS
// =========================================================

export type PeerConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';
export type PeerRole = 'none' | 'host' | 'client';

export function generatePeerRoomCode(randomFn: () => number = Math.random): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    const idx = Math.floor(randomFn() * chars.length) % chars.length;
    suffix += chars[idx];
  }
  return `BC-${suffix}`;
}

export function roomCodeToHostPeerId(rawCode: string): string {
  const normalized = normalizeRoomCode(rawCode) || 'BC-1111';
  const safeCode = normalized.replace(/[^A-Z0-9-]/g, '');
  return `bodycam-vanguard-p2p-${safeCode}`;
}

export function getCurrentOriginShareBaseUrl(origin: string, pathname = '/'): string {
  const cleanOrigin = (origin || '').replace(/\/+$/, '');
  const cleanPath = !pathname || pathname === '/' ? '' : pathname;
  return `${cleanOrigin}${cleanPath}`;
}

export function buildRoomInviteUrl(baseUrl: string, roomCode: string, mapId: MapId): string {
  const cleanCode = normalizeRoomCode(roomCode) || 'BC-1111';
  const cleanBase = baseUrl.split('?')[0];
  return `${cleanBase}?room=${encodeURIComponent(cleanCode)}&map=${encodeURIComponent(mapId)}`;
}

export const VERSION_MISMATCH_MESSAGE_FA = 'نسخه‌ها فرق دارن، صفحه رو رفرش کنید';

export function checkOnlineVersionCompatibility(
  localVersion: string,
  remoteVersion?: string | null
): { compatible: boolean; messageFa: string | null } {
  const localNorm = (localVersion || '').trim();
  const remoteNorm = (remoteVersion || '').trim();
  if (!localNorm || !remoteNorm || localNorm !== remoteNorm) {
    return {
      compatible: false,
      messageFa: VERSION_MISMATCH_MESSAGE_FA,
    };
  }
  return {
    compatible: true,
    messageFa: null,
  };
}

export function formatConnectionStatusFa(
  status: PeerConnectionStatus,
  role: PeerRole,
  errorText?: string | null
): { labelFa: string; badgeFa: string; color: string } {
  if (status === 'connecting') {
    return {
      labelFa:
        role === 'host'
          ? 'در حال ساخت اتاق روی شبکه PeerJS (WebRTC)...'
          : 'در حال اتصال به میزبان (Host) از طریق WebRTC...',
      badgeFa: 'در حال اتصال...',
      color: '#f59e0b',
    };
  }
  if (status === 'connected') {
    return {
      labelFa:
        role === 'host'
          ? 'متصل شد — شما میزبان (Host) اتاق هستید'
          : 'متصل شد — همگام‌سازی زنده با میزبان (Host)',
      badgeFa: 'متصل شد (Online P2P)',
      color: '#10b981',
    };
  }
  if (status === 'error') {
    return {
      labelFa: errorText || 'خطا در برقراری ارتباط PeerJS',
      badgeFa: 'خطا در اتصال',
      color: '#f43f5e',
    };
  }
  return {
    labelFa: 'آماده ساخت اتاق (Host) یا اتصال با کد اتاق (Join)',
    badgeFa: 'آماده اتصال',
    color: '#94a3b8',
  };
}

export type OnlineGameMode = 'coop' | 'pvp' | 'tdm_1v1' | 'tdm_2v2';
export type TeamId = 'alpha' | 'bravo';
export type RoundPhase = 'playing' | 'intermission' | 'match_over';

export const ROUND_MATCH_WIN_SCORE = 6;
export const ROUND_DURATION_SEC = 90;
export const ROUND_INTERMISSION_SEC = 3.5;

export const TEAM_ALPHA_COLOR = '#38bdf8';
export const TEAM_BRAVO_COLOR = '#f43f5e';

export function isRoundBasedMode(mode: OnlineGameMode): boolean {
  return mode === 'tdm_1v1' || mode === 'tdm_2v2';
}

export function getTeamColor(team?: TeamId): string {
  return team === 'bravo' ? TEAM_BRAVO_COLOR : TEAM_ALPHA_COLOR;
}

export function getTeamNameFa(team?: TeamId): string {
  return team === 'bravo' ? 'تیم براوو (قرمز)' : 'تیم آلفا (آبی)';
}

export function formatGameModeFa(mode: OnlineGameMode): string {
  if (mode === 'tdm_1v1') return 'راند تیمی ۱v۱ (COD)';
  if (mode === 'tdm_2v2') return 'راند تیمی ۲v۲ (COD)';
  if (mode === 'pvp') return 'نبرد آزاد (PvP)';
  return 'تیمی همکاری (Co-Op)';
}

export function formatRoundClock(seconds: number): string {
  const clamped = Math.max(0, Math.ceil(seconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function canDamagePlayer(
  mode: OnlineGameMode,
  attackerTeam: TeamId | undefined,
  targetTeam: TeamId | undefined,
  attackerId: string,
  targetId: string
): boolean {
  if (!attackerId || !targetId || attackerId === targetId) return false;
  if (mode === 'coop') return false; // Co-Op has friendly fire OFF
  if (mode === 'pvp') return true; // Free-For-All PvP
  // In 1v1 and 2v2 Round Team Mode: Friendly Fire is strictly OFF
  const aTeam: TeamId = attackerTeam || 'alpha';
  const tTeam: TeamId = targetTeam || 'bravo';
  return aTeam !== tTeam;
}

export interface AuthoritativePlayerState {
  id: string;
  name: string;
  team: TeamId;
  alive: boolean;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  weaponIdx: number;
  hp: number;
  maxHp: number;
  kills: number;
  score: number;
  color: string;
  isHost?: boolean;
  peerId?: string;
  respawnSeq?: number;
  lastSeen: number;
}

export interface AuthoritativeRoomState {
  code: string;
  name: string;
  hasPassword?: boolean;
  mapId: MapId;
  mode: OnlineGameMode;
  hostId: string;
  hostName: string;
  wave: number;
  teamScore: number;
  playerCount: number;
  players: AuthoritativePlayerState[];
  // Call of Duty Round-Based Team Mode (1v1 / 2v2) Authoritative Fields
  alphaScore: number;
  bravoScore: number;
  currentRound: number;
  roundTimeRemainingSec: number;
  roundPhase: RoundPhase;
  roundWinnerTeam: TeamId | 'draw' | null;
  matchWinnerTeam: TeamId | null;
  targetWinRounds: number;
  phaseStartedAt?: number;
  roundEndsAt?: number;
  intermissionEndsAt?: number;
  appVersion?: string;
}

const P2P_COLORS = ['#00f0ff', '#38bdf8', '#f59e0b', '#10b981', '#c084fc', '#f43f5e'];

export function assignBalancedTeam(
  players: readonly AuthoritativePlayerState[],
  preferredTeam?: TeamId
): TeamId {
  if (preferredTeam === 'alpha' || preferredTeam === 'bravo') return preferredTeam;
  let alphaCount = 0;
  let bravoCount = 0;
  for (const p of players) {
    if (p.team === 'bravo') bravoCount++;
    else alphaCount++;
  }
  return alphaCount <= bravoCount ? 'alpha' : 'bravo';
}

export function getTeamSpawnPosition(team: TeamId, slotIdx = 0): { x: number; y: number; z: number; yaw: number } {
  const lateralOffset = (slotIdx % 2 === 0 ? -1 : 1) * (slotIdx > 0 ? 3.5 : 0);
  if (team === 'bravo') {
    return { x: lateralOffset, y: 0, z: -24, yaw: Math.PI };
  }
  return { x: lateralOffset, y: 0, z: 24, yaw: 0 };
}

export function mergeClientInputIntoHostState(
  room: AuthoritativeRoomState,
  input: Partial<AuthoritativePlayerState> & { id: string; name?: string },
  now = Date.now()
): AuthoritativeRoomState {
  const existingIdx = room.players.findIndex((p) => p.id === input.id);
  const nextPlayers = [...room.players];
  const roundBased = isRoundBasedMode(room.mode);

  if (existingIdx === -1) {
    const team = assignBalancedTeam(nextPlayers, input.team);
    const spawn = getTeamSpawnPosition(team, nextPlayers.length);
    const color = roundBased
      ? getTeamColor(team)
      : input.color || P2P_COLORS[nextPlayers.length % P2P_COLORS.length];
    const hp = typeof input.hp === 'number' ? Math.max(0, Math.min(100, input.hp)) : 100;
    nextPlayers.push({
      id: input.id,
      name: (input.name || 'OPERATOR').slice(0, 18),
      team,
      alive: typeof input.alive === 'boolean' ? input.alive : hp > 0,
      x: typeof input.x === 'number' ? input.x : spawn.x,
      y: typeof input.y === 'number' ? input.y : spawn.y,
      z: typeof input.z === 'number' ? input.z : spawn.z,
      yaw: typeof input.yaw === 'number' ? input.yaw : spawn.yaw,
      pitch: typeof input.pitch === 'number' ? input.pitch : 0,
      weaponIdx: typeof input.weaponIdx === 'number' ? input.weaponIdx : 0,
      hp,
      maxHp: 100,
      kills: typeof input.kills === 'number' ? Math.max(0, input.kills) : 0,
      score: typeof input.score === 'number' ? Math.max(0, input.score) : 0,
      color,
      isHost: input.id === room.hostId,
      peerId: input.peerId,
      respawnSeq: typeof input.respawnSeq === 'number' ? input.respawnSeq : 0,
      lastSeen: now,
    });
  } else {
    const prev = nextPlayers[existingIdx];
    const nextTeam = input.team || prev.team || 'alpha';
    const nextHp = typeof input.hp === 'number' ? Math.max(0, Math.min(100, input.hp)) : prev.hp;
    const nextAlive =
      typeof input.alive === 'boolean'
        ? input.alive
        : roundBased && !prev.alive && room.roundPhase === 'playing'
          ? false
          : nextHp > 0;
    nextPlayers[existingIdx] = {
      ...prev,
      name: input.name ? input.name.slice(0, 18) : prev.name,
      team: nextTeam,
      alive: nextAlive,
      x: typeof input.x === 'number' ? input.x : prev.x,
      y: typeof input.y === 'number' ? input.y : prev.y,
      z: typeof input.z === 'number' ? input.z : prev.z,
      yaw: typeof input.yaw === 'number' ? input.yaw : prev.yaw,
      pitch: typeof input.pitch === 'number' ? input.pitch : prev.pitch,
      weaponIdx: typeof input.weaponIdx === 'number' ? input.weaponIdx : prev.weaponIdx,
      hp: nextAlive ? nextHp : 0,
      kills: typeof input.kills === 'number' ? Math.max(0, input.kills) : prev.kills,
      score: typeof input.score === 'number' ? Math.max(0, input.score) : prev.score,
      color: roundBased ? getTeamColor(nextTeam) : prev.color,
      peerId: input.peerId || prev.peerId,
      respawnSeq:
        typeof input.respawnSeq === 'number'
          ? Math.max(prev.respawnSeq ?? 0, input.respawnSeq)
          : (prev.respawnSeq ?? 0),
      lastSeen: now,
    };
  }

  const teamScore = nextPlayers.reduce((sum, p) => sum + (p.score || 0), 0);

  return {
    ...room,
    teamScore,
    playerCount: nextPlayers.length,
    players: nextPlayers,
  };
}

export function removeDisconnectedPlayerFromHostState(
  room: AuthoritativeRoomState,
  playerId: string
): { nextRoom: AuthoritativeRoomState; removedPlayer: AuthoritativePlayerState | null } {
  const removedPlayer = room.players.find((p) => p.id === playerId) || null;
  const nextPlayers = room.players.filter((p) => p.id !== playerId);
  const teamScore = nextPlayers.reduce((sum, p) => sum + (p.score || 0), 0);
  return {
    nextRoom: {
      ...room,
      teamScore,
      playerCount: nextPlayers.length,
      players: nextPlayers,
    },
    removedPlayer,
  };
}

export function awardRoundPointToTeam(
  room: AuthoritativeRoomState,
  winner: TeamId | 'draw',
  now = Date.now()
): AuthoritativeRoomState {
  if (room.roundPhase !== 'playing') return room;
  const nextAlpha = winner === 'alpha' ? room.alphaScore + 1 : room.alphaScore;
  const nextBravo = winner === 'bravo' ? room.bravoScore + 1 : room.bravoScore;
  const targetWins = room.targetWinRounds || ROUND_MATCH_WIN_SCORE;

  let matchWinner: TeamId | null = null;
  if (nextAlpha >= targetWins) matchWinner = 'alpha';
  else if (nextBravo >= targetWins) matchWinner = 'bravo';

  const intermissionMs = matchWinner ? 6000 : ROUND_INTERMISSION_SEC * 1000;

  return {
    ...room,
    alphaScore: nextAlpha,
    bravoScore: nextBravo,
    roundWinnerTeam: winner,
    matchWinnerTeam: matchWinner,
    roundPhase: matchWinner ? 'match_over' : 'intermission',
    roundTimeRemainingSec: matchWinner ? 6 : ROUND_INTERMISSION_SEC,
    phaseStartedAt: now,
    intermissionEndsAt: now + intermissionMs,
    roundEndsAt: undefined,
  };
}

export function startNextAuthoritativeRound(
  room: AuthoritativeRoomState,
  now = Date.now()
): AuthoritativeRoomState {
  let alphaIdx = 0;
  let bravoIdx = 0;
  const respawnedPlayers = room.players.map((p) => {
    const idx = p.team === 'bravo' ? bravoIdx++ : alphaIdx++;
    const spawn = getTeamSpawnPosition(p.team, idx);
    return {
      ...p,
      hp: 100,
      alive: true,
      x: spawn.x,
      y: spawn.y,
      z: spawn.z,
      yaw: spawn.yaw,
      pitch: 0,
      respawnSeq: (p.respawnSeq ?? 0) + 1,
      color: isRoundBasedMode(room.mode) ? getTeamColor(p.team) : p.color,
    };
  });

  return {
    ...room,
    currentRound: room.currentRound + 1,
    roundTimeRemainingSec: ROUND_DURATION_SEC,
    roundPhase: 'playing',
    roundWinnerTeam: null,
    phaseStartedAt: now,
    roundEndsAt: now + ROUND_DURATION_SEC * 1000,
    intermissionEndsAt: undefined,
    players: respawnedPlayers,
  };
}

export function resetAuthoritativeMatch(
  room: AuthoritativeRoomState,
  now = Date.now()
): AuthoritativeRoomState {
  const next = startNextAuthoritativeRound(
    {
      ...room,
      alphaScore: 0,
      bravoScore: 0,
      currentRound: 0,
      matchWinnerTeam: null,
      roundWinnerTeam: null,
    },
    now
  );
  return {
    ...next,
    currentRound: 1,
  };
}

export function isStaleClientInputForRespawn(
  incomingRespawnSeq: number | undefined,
  authoritativeRespawnSeq: number | undefined
): boolean {
  const authSeq = authoritativeRespawnSeq ?? 0;
  if (authSeq <= 0) return false;
  if (typeof incomingRespawnSeq !== 'number') return true;
  return incomingRespawnSeq < authSeq;
}

export function shouldInstantTeleportRemotePlayer(params: {
  initialized: boolean;
  prevX: number;
  prevZ: number;
  nextX: number;
  nextZ: number;
  prevRespawnSeq: number;
  nextRespawnSeq: number;
  prevAlive: boolean;
  nextAlive: boolean;
  prevRound: number;
  nextRound: number;
  distanceThreshold?: number;
}): boolean {
  if (!params.initialized) return true;
  if (params.nextRespawnSeq > params.prevRespawnSeq) return true;
  if (params.prevRound > 0 && params.nextRound > 0 && params.nextRound !== params.prevRound) return true;
  if (!params.prevAlive && params.nextAlive) return true;
  const dist = Math.hypot(params.nextX - params.prevX, params.nextZ - params.prevZ);
  return dist >= (params.distanceThreshold ?? 8.5);
}

// =========================================================
// HIT BODY PART & DAMAGE FEED NOTIFICATION HELPERS
// =========================================================

export type HitBodyPart = 'head' | 'torso' | 'limbs';

export function resolveHitBodyPart(
  isHeadshot: boolean,
  relativeHitY: number,
  enemyScale = 1.0,
  explicitPart?: HitBodyPart
): HitBodyPart {
  if (explicitPart) return explicitPart;
  if (isHeadshot) return 'head';
  const normY = relativeHitY / Math.max(0.5, enemyScale);
  if (normY >= 1.52) return 'head';
  if (normY >= 0.82) return 'torso';
  return 'limbs';
}

export function formatDamageFeedNotification(
  damage: number,
  bodyPart: HitBodyPart,
  enemyName: string
): {
  damage: number;
  bodyPart: HitBodyPart;
  bodyPartLabelFa: string;
  enemyName: string;
  isCritical: boolean;
} {
  const cleanDamage = Math.max(1, Math.round(damage));
  const bodyPartLabelFa =
    bodyPart === 'head' ? 'سر (Headshot)' : bodyPart === 'torso' ? 'سینه (Torso)' : 'اندام (Limbs)';
  return {
    damage: cleanDamage,
    bodyPart,
    bodyPartLabelFa,
    enemyName,
    isCritical: bodyPart === 'head',
  };
}

// =========================================================
// ADMIN PANEL & ANTI-CHEAT HELPERS
// =========================================================

export const APPROVED_OWNER_NAME_FA = 'پارسا';

export interface AntiCheatState {
  enabled: boolean;
  adminImmunity: boolean;
  banned: boolean;
  banReasonFa: string | null;
  consecutiveHeadshots: number;
  totalHeadshots: number;
  totalHits: number;
  suspicionScore: number;
}

export interface BannedPlayerRecord {
  id: string;
  name: string;
  reasonFa: string;
  headshotRatePct: number;
  timestamp: string;
}

export function validateExclusiveNameRegistry(
  rawName: string,
  strictMode = false
): { valid: boolean; allowed: boolean; canonicalName: string; errorFa: string | null } {
  const trimmed = (rawName || '').trim();
  const norm = trimmed
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\s+/g, '')
    .toLowerCase();
  const isParsa = norm === 'پارسا' || norm === 'parsa';
  if (!strictMode || isParsa) {
    return {
      valid: true,
      allowed: true,
      canonicalName: isParsa ? APPROVED_OWNER_NAME_FA : trimmed || 'GHOST-01',
      errorFa: null,
    };
  }
  return {
    valid: false,
    allowed: false,
    canonicalName: APPROVED_OWNER_NAME_FA,
    errorFa: 'در حالت قفل اسم‌خونه فقط نام «پارسا» مجاز است.',
  };
}

export function verifyAdminAccountLogin(
  username: string,
  password: string
): { ok: boolean; canonicalName: string; errorFa: string | null } {
  const nameCheck = validateExclusiveNameRegistry(username, true);
  if (!nameCheck.valid) {
    return {
      ok: false,
      canonicalName: '',
      errorFa: 'نام کاربری ادمین فقط باید «پارسا» باشد.',
    };
  }
  if (!verifyCheatPasscode(password)) {
    return {
      ok: false,
      canonicalName: '',
      errorFa: 'رمز اختصاصی اکانت ادمین نادرست است.',
    };
  }
  return {
    ok: true,
    canonicalName: APPROVED_OWNER_NAME_FA,
    errorFa: null,
  };
}


