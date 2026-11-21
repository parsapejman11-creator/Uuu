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

export type MapId = 'warehouse' | 'docks' | 'outpost' | 'duel';

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
  {
    id: 'duel',
    nameFa: 'میدان دوئل ۱v۱ (Duel Arena)',
    nameEn: '1v1 Duel Arena',
    subtitleFa: 'میدان کوچک و کاملاً متقارن مخصوص دوئل ۱v۱ با سنگرهای عادلانه و بدون نقطه کور بزرگ',
    badgeFa: 'مخصوص ۱v۱',
    accentColor: '#10b981',
    arenaHalf: 19,
    skyHex: 0x0d1520,
    fogHex: 0x0d1520,
    fogDensity: 0.011,
    ambientHex: 0x64748b,
    ambientIntensity: 0.9,
    sunHex: 0xf8fafc,
    sunIntensity: 1.75,
  },
];

export function isValidMapId(value: string | null | undefined): value is MapId {
  return value === 'warehouse' || value === 'docks' || value === 'outpost' || value === 'duel';
}

export function getMapArenaHalf(mapId: MapId): number {
  return mapId === 'duel' ? 19 : 48;
}

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

/** Unambiguous 32-char alphabet: excludes O, 0, I, 1 (32 evenly divides 256 for unbiased crypto sampling) */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 8;

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

  // Legacy BC-XXXX format preservation (backward compatibility for older links/codes)
  if (cleaned.startsWith('BC-')) {
    const rest = cleaned.slice(3).replace(/-/g, '');
    return rest ? `BC-${rest}` : '';
  }
  const flat = cleaned.replace(/-/g, '');
  if (!flat) return '';
  if (flat.startsWith('BC') && flat.length >= 4 && flat.length <= 6) {
    return `BC-${flat.slice(2)}`;
  }
  // Legacy 4-character shorthand (e.g. "4821" or "hd7p") -> "BC-4821"
  if (flat.length === 4) {
    return `BC-${flat}`;
  }
  // New readable 8-character (or general 5..12 char) room code (e.g. "K7M9P2X4" or "K7M9-P2X4")
  return flat.slice(0, 12);
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

export const DEFAULT_AIM_ASSIST_STRENGTH = 70;

export function resolveEffectiveAimAssistStrength(
  userStrengthPct: number,
  roomAimAssistAllowed = true
): number {
  if (roomAimAssistAllowed === false) return 0;
  if (!Number.isFinite(userStrengthPct)) return DEFAULT_AIM_ASSIST_STRENGTH;
  return Math.max(0, Math.min(100, Math.round(userStrengthPct)));
}

/**
 * Gentle, non-locking rotational Aim Assist for fair PvP (online opponents) & PvE (bots).
 * Never locks camera abruptly; only nudges camera softly toward visible enemy hitboxes.
 * Bullet hit validation remains 100% Host-authoritative.
 */
export function computeSoftAimAssistAngles(
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
  // Soft narrow cone (~2.6 deg to ~9.2 deg) so it only helps near the crosshair
  const maxConeRad = 0.045 + strengthNorm * 0.115;

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
    if (horizDist < 0.35 || horizDist > 68) continue;

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

  // Smooth falloff near edge of cone & gentle max blend (never hard-locks)
  const coneFalloff = Math.max(0.2, 1 - (bestAngDist / maxConeRad) * 0.65);
  const pullSpeed = (0.45 + strengthNorm * 2.4) * (isFiringOrAds ? 1.15 : 0.72) * coneFalloff;
  const blend = Math.min(0.16, pullSpeed * Math.max(0.001, dt));

  const nextYaw = currentYaw + bestDeltaYaw * blend;
  const nextPitch = Math.max(-1.45, Math.min(1.45, currentPitch + bestDeltaPitch * blend));

  return {
    nextYaw,
    nextPitch,
    lockedTarget: bestTarget,
    angularErrorRad: bestAngDist,
  };
}

export function isRemotePlayerEligibleForAimAssist(
  mode: OnlineGameMode,
  localPlayerId: string,
  localTeam: TeamId,
  candidate: Pick<AuthoritativePlayerState, 'id' | 'team' | 'alive' | 'disconnected' | 'spawnProtected' | 'spawnProtectedUntil'>,
  now = Date.now()
): boolean {
  if (!candidate || candidate.id === localPlayerId) return false;
  if (candidate.disconnected) return false;
  if (isRoundBasedMode(mode) && candidate.alive === false) return false;
  if (!canDamagePlayer(mode, localTeam, candidate.team || 'bravo', localPlayerId, candidate.id)) {
    return false;
  }
  if (isPlayerSpawnProtected(candidate, now)) return false;
  return true;
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

export function generatePeerRoomCode(
  getRandomBytes?: (length: number) => Uint8Array
): string {
  const alphabet = ROOM_CODE_ALPHABET;
  let bytes: Uint8Array;
  if (getRandomBytes) {
    bytes = getRandomBytes(ROOM_CODE_LENGTH);
  } else if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
    const cryptoBytes = new Uint8Array(new ArrayBuffer(ROOM_CODE_LENGTH));
    globalThis.crypto.getRandomValues(cryptoBytes);
    bytes = cryptoBytes;
  } else {
    const fallbackBytes = new Uint8Array(ROOM_CODE_LENGTH);
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
      fallbackBytes[i] = Math.floor(Math.random() * 256);
    }
    bytes = fallbackBytes;
  }
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    // alphabet.length === 32, so byte % 32 has zero modulo bias
    code += alphabet[bytes[i] % alphabet.length];
  }
  return code;
}

export function roomCodeToHostPeerId(rawCode: string): string {
  const normalized = normalizeRoomCode(rawCode) || 'BC-1111';
  const safeCode = normalized.replace(/[^A-Z0-9-]/g, '');
  return `bodycam-vanguard-p2p-${safeCode}`;
}

export function getCurrentOriginShareBaseUrl(origin: string, pathname = '/'): string {
  const cleanOrigin = (origin || '').replace(/\/+$/, '');
  const cleanPath = !pathname || pathname === '/' ? '/' : pathname;
  return `${cleanOrigin}${cleanPath}`;
}

/**
 * Builds a clean hash-based room invite link: https://domain/base/#room=CODE
 * Safe with HTTPS and relative subpaths (e.g. GitHub Pages /repo/).
 */
export function buildRoomInviteUrl(baseUrl: string, roomCode: string, _mapId?: MapId): string {
  const cleanCode = normalizeRoomCode(roomCode) || 'BC-1111';
  const cleanBase = (baseUrl || '').split('#')[0].split('?')[0];
  let normalizedBase = cleanBase;
  try {
    const parsed = new URL(cleanBase);
    const hasFileExt = /\/[^/]+\.[a-z0-9]{2,5}$/i.test(parsed.pathname);
    const cleanPath = parsed.pathname.endsWith('/') || hasFileExt ? parsed.pathname : `${parsed.pathname}/`;
    normalizedBase = `${parsed.origin}${cleanPath}`;
  } catch {
    normalizedBase = cleanBase.endsWith('/') ? cleanBase : `${cleanBase}/`;
  }
  return `${normalizedBase}#room=${encodeURIComponent(cleanCode)}`;
}

/**
 * Parses room invite code from clean hash links (#room=CODE) as well as legacy query links (?room=CODE&map=...).
 */
export function parseRoomInviteFromUrl(
  search: string,
  hash: string
): { roomCode: string | null; mapId: MapId | null; source: 'hash' | 'query' | null } {
  const cleanHash = (hash || '').replace(/^#/, '').trim();
  if (cleanHash) {
    const hashParams = new URLSearchParams(cleanHash);
    const rawHashRoom = hashParams.get('room');
    if (rawHashRoom && rawHashRoom.trim()) {
      const normalized = normalizeRoomCode(rawHashRoom.trim());
      if (normalized) {
        const hashMap = hashParams.get('map');
        return {
          roomCode: normalized,
          mapId: isValidMapId(hashMap) ? hashMap : null,
          source: 'hash',
        };
      }
    }
  }

  const cleanSearch = (search || '').replace(/^\?/, '').trim();
  if (cleanSearch) {
    const searchParams = new URLSearchParams(cleanSearch);
    const rawQueryRoom = searchParams.get('room');
    if (rawQueryRoom && rawQueryRoom.trim()) {
      const normalized = normalizeRoomCode(rawQueryRoom.trim());
      if (normalized) {
        const queryMap = searchParams.get('map');
        return {
          roomCode: normalized,
          mapId: isValidMapId(queryMap) ? queryMap : null,
          source: 'query',
        };
      }
    }
  }

  return { roomCode: null, mapId: null, source: null };
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
export type RoundPhase = 'countdown' | 'playing' | 'intermission' | 'match_over';

export const ROUND_MATCH_WIN_SCORE = 6;
export const ROUND_DURATION_SEC = 90;
export const ROUND_INTERMISSION_SEC = 3.5;
export const ROUND_COUNTDOWN_SEC = 3;
export const SPAWN_PROTECTION_SEC = 2;
export const KILL_FEED_MAX_ITEMS = 4;
export const KILL_FEED_TTL_MS = 5000;

export const TEAM_ALPHA_COLOR = '#38bdf8';
export const TEAM_BRAVO_COLOR = '#f43f5e';

export const WEAPON_SHORT_NAMES: readonly string[] = [
  'AK-47',
  'M4A1-S',
  'AWM',
  'MP5',
  'M870',
  'GLOCK',
  'KATANA',
  'M249',
  'DEAGLE',
  'RPG-7',
];

export function getWeaponShortName(weaponIdx: number): string {
  return WEAPON_SHORT_NAMES[weaponIdx] || 'RIFLE';
}

export function isRoundBasedMode(mode: OnlineGameMode): boolean {
  return mode === 'tdm_1v1' || mode === 'tdm_2v2';
}

export function isRoundInputLocked(
  room: Pick<AuthoritativeRoomState, 'mode' | 'roundPhase'> | null | undefined
): boolean {
  return Boolean(room && isRoundBasedMode(room.mode) && room.roundPhase === 'countdown');
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
  targetId: string,
  friendlyFire = false
): boolean {
  if (!attackerId || !targetId || attackerId === targetId) return false;
  if (mode === 'pvp') return true; // Free-For-All PvP
  if (mode === 'coop') return Boolean(friendlyFire); // Co-Op friendly fire OFF by default
  // In 1v1 and 2v2 Round Team Mode: Friendly Fire is OFF by default, toggleable by Host
  if (friendlyFire) return true;
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
  deaths?: number;
  shotsFired?: number;
  shotsHit?: number;
  headshots?: number;
  score: number;
  color: string;
  isHost?: boolean;
  isSliding?: boolean;
  /** Compact wire enum code (0..8) for discrete player visual animation state */
  anim?: number;
  /** Timestamp (ms) when current discrete animation state started */
  animAt?: number;
  peerId?: string;
  respawnSeq?: number;
  spawnProtectedUntil?: number;
  spawnProtected?: boolean;
  isBot?: boolean;
  botDifficulty?: OnlineBotDifficulty;
  /** Whether this player has marked themselves Ready in the pre-match lobby */
  lobbyReady?: boolean;
  /** Last measured round-trip ping in ms (0 for Host, null if unknown/bot) */
  pingMs?: number | null;
  disconnected?: boolean;
  disconnectedAt?: number;
  reconnectDeadlineAt?: number;
  lastSeen: number;
}

export interface AuthoritativeRoomState {
  code: string;
  name: string;
  hasPassword?: boolean;
  /** When true, Host has locked the room against new non-reconnecting players */
  isLocked?: boolean;
  mapId: MapId;
  mode: OnlineGameMode;
  hostId: string;
  hostName: string;
  wave: number;
  teamScore: number;
  playerCount: number;
  players: AuthoritativePlayerState[];
  // Host-controlled Room Rules & Match Settings (synced to all players)
  aimAssistAllowed?: boolean;
  slideAllowed?: boolean;
  roundDurationSec?: number;
  startingHp?: number;
  friendlyFire?: boolean;
  fillBotsEnabled?: boolean;
  botDifficulty?: OnlineBotDifficulty;
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
  countdownEndsAt?: number;
  countdownRemainingSec?: number;
  rematchReadyPlayerIds?: string[];
  mapVotes?: Record<string, MapId>;
  appVersion?: string;
}

const P2P_COLORS = ['#00f0ff', '#38bdf8', '#f59e0b', '#10b981', '#c084fc', '#f43f5e'];

export function isPlayerSpawnProtected(
  player: Pick<AuthoritativePlayerState, 'spawnProtectedUntil' | 'spawnProtected'> | null | undefined,
  now = Date.now()
): boolean {
  if (!player) return false;
  if (typeof player.spawnProtectedUntil === 'number' && player.spawnProtectedUntil > 0) {
    return now < player.spawnProtectedUntil;
  }
  return Boolean(player.spawnProtected);
}

export function clearPlayerSpawnProtection(
  room: AuthoritativeRoomState,
  playerId: string
): { nextRoom: AuthoritativeRoomState; changed: boolean } {
  let changed = false;
  const nextPlayers = room.players.map((p) => {
    if (p.id !== playerId) return p;
    if (!p.spawnProtected && !(p.spawnProtectedUntil && p.spawnProtectedUntil > 0)) {
      return p;
    }
    changed = true;
    return {
      ...p,
      spawnProtectedUntil: 0,
      spawnProtected: false,
    };
  });
  return {
    nextRoom: changed ? { ...room, players: nextPlayers } : room,
    changed,
  };
}

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

export function getTeamSpawnPosition(
  team: TeamId,
  slotIdx = 0,
  mapId?: MapId
): { x: number; y: number; z: number; yaw: number } {
  const isDuel = mapId === 'duel';
  const spread = isDuel ? 3.0 : 3.5;
  const spawnZ = isDuel ? 14.5 : 24;
  const lateralOffset = slotIdx > 0 ? (slotIdx % 2 === 0 ? -spread : spread) : 0;
  if (team === 'bravo') {
    return { x: lateralOffset, y: 0, z: -spawnZ, yaw: Math.PI };
  }
  return { x: lateralOffset, y: 0, z: spawnZ, yaw: 0 };
}

export function mergeClientInputIntoHostState(
  room: AuthoritativeRoomState,
  input: Partial<AuthoritativePlayerState> & { id: string; name?: string },
  now = Date.now()
): AuthoritativeRoomState {
  const existingIdx = room.players.findIndex((p) => p.id === input.id);
  const nextPlayers = [...room.players];
  const roundBased = isRoundBasedMode(room.mode);
  const slidePermitted = room.slideAllowed !== false;

  const roomMaxHp = room.startingHp === 150 ? 150 : 100;

  if (existingIdx === -1) {
    const team = assignBalancedTeam(nextPlayers, input.team);
    const spawn = getTeamSpawnPosition(team, nextPlayers.length, room.mapId);
    const color = roundBased
      ? getTeamColor(team)
      : input.color || P2P_COLORS[nextPlayers.length % P2P_COLORS.length];
    const hp = typeof input.hp === 'number' ? Math.max(0, Math.min(roomMaxHp, input.hp)) : roomMaxHp;
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
      maxHp: roomMaxHp,
      kills: typeof input.kills === 'number' ? Math.max(0, input.kills) : 0,
      deaths: typeof input.deaths === 'number' ? Math.max(0, input.deaths) : 0,
      shotsFired: typeof input.shotsFired === 'number' ? Math.max(0, input.shotsFired) : 0,
      shotsHit: typeof input.shotsHit === 'number' ? Math.max(0, input.shotsHit) : 0,
      headshots: typeof input.headshots === 'number' ? Math.max(0, input.headshots) : 0,
      score: typeof input.score === 'number' ? Math.max(0, input.score) : 0,
      color,
      isHost: input.id === room.hostId,
      isSliding: slidePermitted ? Boolean(input.isSliding) : false,
      anim: typeof input.anim === 'number' && Number.isInteger(input.anim) && input.anim >= 0 && input.anim <= 8 ? input.anim : 0,
      animAt: typeof input.animAt === 'number' && Number.isFinite(input.animAt) ? input.animAt : now,
      peerId: input.peerId,
      respawnSeq: typeof input.respawnSeq === 'number' ? input.respawnSeq : 0,
      spawnProtectedUntil: 0,
      spawnProtected: false,
      lobbyReady:
        typeof input.lobbyReady === 'boolean'
          ? input.lobbyReady
          : Boolean(input.isBot || input.id === room.hostId),
      pingMs:
        typeof input.pingMs === 'number' && Number.isFinite(input.pingMs)
          ? Math.max(0, Math.round(input.pingMs))
          : input.id === room.hostId
            ? 0
            : null,
      disconnected: false,
      disconnectedAt: undefined,
      reconnectDeadlineAt: undefined,
      lastSeen: now,
    });
  } else {
    const prev = nextPlayers[existingIdx];
    const nextTeam = input.team || prev.team || 'alpha';
    const nextMaxHp = typeof input.maxHp === 'number' ? Math.max(100, Math.min(150, input.maxHp)) : roomMaxHp;
    const nextHp = typeof input.hp === 'number' ? Math.max(0, Math.min(nextMaxHp, input.hp)) : Math.min(nextMaxHp, prev.hp);
    const nextAlive =
      typeof input.alive === 'boolean'
        ? input.alive
        : roundBased && !prev.alive && room.roundPhase === 'playing'
          ? false
          : nextHp > 0;
    const lockedToSpawn = roundBased && room.roundPhase === 'countdown';
    nextPlayers[existingIdx] = {
      ...prev,
      name: input.name ? input.name.slice(0, 18) : prev.name,
      team: nextTeam,
      alive: prev.disconnected && input.disconnected !== false ? false : nextAlive,
      x: lockedToSpawn ? prev.x : typeof input.x === 'number' ? input.x : prev.x,
      y: lockedToSpawn ? prev.y : typeof input.y === 'number' ? input.y : prev.y,
      z: lockedToSpawn ? prev.z : typeof input.z === 'number' ? input.z : prev.z,
      yaw: typeof input.yaw === 'number' ? input.yaw : prev.yaw,
      pitch: typeof input.pitch === 'number' ? input.pitch : prev.pitch,
      weaponIdx: typeof input.weaponIdx === 'number' ? input.weaponIdx : prev.weaponIdx,
      hp: nextAlive ? nextHp : 0,
      maxHp: nextMaxHp,
      kills: typeof input.kills === 'number' ? Math.max(0, input.kills) : prev.kills,
      deaths: typeof input.deaths === 'number' ? Math.max(0, input.deaths) : (prev.deaths ?? 0),
      shotsFired: typeof input.shotsFired === 'number' ? Math.max(0, input.shotsFired) : (prev.shotsFired ?? 0),
      shotsHit: typeof input.shotsHit === 'number' ? Math.max(0, input.shotsHit) : (prev.shotsHit ?? 0),
      headshots: typeof input.headshots === 'number' ? Math.max(0, input.headshots) : (prev.headshots ?? 0),
      score: typeof input.score === 'number' ? Math.max(0, input.score) : prev.score,
      color: roundBased ? getTeamColor(nextTeam) : prev.color,
      isSliding:
        !slidePermitted || lockedToSpawn || !nextAlive
          ? false
          : typeof input.isSliding === 'boolean'
            ? input.isSliding
            : Boolean(prev.isSliding),
      anim:
        !nextAlive
          ? 7
          : typeof input.anim === 'number' && Number.isInteger(input.anim) && input.anim >= 0 && input.anim <= 8
            ? input.anim
            : (prev.anim ?? 0),
      animAt:
        typeof input.animAt === 'number' && Number.isFinite(input.animAt)
          ? input.animAt
          : (prev.animAt ?? now),
      peerId: input.peerId || prev.peerId,
      respawnSeq:
        typeof input.respawnSeq === 'number'
          ? Math.max(prev.respawnSeq ?? 0, input.respawnSeq)
          : (prev.respawnSeq ?? 0),
      lobbyReady:
        typeof input.lobbyReady === 'boolean'
          ? input.lobbyReady
          : prev.isBot
            ? true
            : Boolean(prev.lobbyReady),
      pingMs:
        typeof input.pingMs === 'number' && Number.isFinite(input.pingMs)
          ? Math.max(0, Math.round(input.pingMs))
          : prev.pingMs ?? (prev.isHost ? 0 : null),
      disconnected: typeof input.disconnected === 'boolean' ? input.disconnected : prev.disconnected,
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

/**
 * Checks whether all active human players in the lobby have marked themselves Ready.
 * Bots are automatically ready. Disconnected players do not block start.
 */
export function areAllLobbyPlayersReady(
  room:
    | {
        players: Array<Pick<AuthoritativePlayerState, 'name' | 'isBot' | 'disconnected' | 'lobbyReady'>>;
      }
    | null
    | undefined
): {
  allReady: boolean;
  readyCount: number;
  totalCount: number;
  waitingNames: string[];
} {
  if (!room || !Array.isArray(room.players) || room.players.length === 0) {
    return { allReady: false, readyCount: 0, totalCount: 0, waitingNames: [] };
  }
  const activeHumans = room.players.filter((p) => !p.isBot && !p.disconnected);
  if (activeHumans.length === 0) {
    return { allReady: false, readyCount: 0, totalCount: 0, waitingNames: [] };
  }
  const waitingNames: string[] = [];
  let readyCount = 0;
  for (const p of activeHumans) {
    if (p.lobbyReady) {
      readyCount++;
    } else {
      waitingNames.push(p.name);
    }
  }
  return {
    allReady: readyCount === activeHumans.length,
    readyCount,
    totalCount: activeHumans.length,
    waitingNames,
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

  const intermissionMs = ROUND_INTERMISSION_SEC * 1000;

  return {
    ...room,
    alphaScore: nextAlpha,
    bravoScore: nextBravo,
    roundWinnerTeam: winner,
    matchWinnerTeam: matchWinner,
    roundPhase: matchWinner ? 'match_over' : 'intermission',
    roundTimeRemainingSec: matchWinner ? 0 : ROUND_INTERMISSION_SEC,
    phaseStartedAt: now,
    intermissionEndsAt: matchWinner ? undefined : now + intermissionMs,
    roundEndsAt: undefined,
    countdownEndsAt: undefined,
    countdownRemainingSec: 0,
    rematchReadyPlayerIds: matchWinner ? [] : room.rematchReadyPlayerIds,
  };
}

export function beginRoundCountdownState(
  room: AuthoritativeRoomState,
  now = Date.now(),
  incrementRound = false
): AuthoritativeRoomState {
  const roundDuration = room.roundDurationSec || ROUND_DURATION_SEC;
  const startHp = room.startingHp === 150 ? 150 : 100;
  let alphaIdx = 0;
  let bravoIdx = 0;
  const respawnedPlayers = room.players.map((p) => {
    const idx = p.team === 'bravo' ? bravoIdx++ : alphaIdx++;
    const spawn = getTeamSpawnPosition(p.team, idx, room.mapId);
    const isDisconnected = Boolean(p.disconnected);
    return {
      ...p,
      hp: isDisconnected ? 0 : startHp,
      maxHp: startHp,
      alive: !isDisconnected,
      isSliding: false,
      x: spawn.x,
      y: spawn.y,
      z: spawn.z,
      yaw: spawn.yaw,
      pitch: 0,
      respawnSeq: (p.respawnSeq ?? 0) + 1,
      spawnProtectedUntil: 0,
      spawnProtected: false,
      color: isRoundBasedMode(room.mode) ? getTeamColor(p.team) : p.color,
    };
  });

  return {
    ...room,
    currentRound: incrementRound ? room.currentRound + 1 : Math.max(1, room.currentRound),
    roundTimeRemainingSec: roundDuration,
    roundPhase: 'countdown',
    roundWinnerTeam: null,
    phaseStartedAt: now,
    countdownEndsAt: now + ROUND_COUNTDOWN_SEC * 1000,
    countdownRemainingSec: ROUND_COUNTDOWN_SEC,
    roundEndsAt: undefined,
    intermissionEndsAt: undefined,
    players: respawnedPlayers,
  };
}

export function finishRoundCountdownState(
  room: AuthoritativeRoomState,
  now = Date.now()
): AuthoritativeRoomState {
  const roundDuration = room.roundDurationSec || ROUND_DURATION_SEC;
  const protectUntil = now + SPAWN_PROTECTION_SEC * 1000;
  const protectedPlayers = room.players.map((p) => {
    const activeAlive = Boolean(p.alive && !p.disconnected);
    return {
      ...p,
      alive: activeAlive,
      spawnProtectedUntil: activeAlive ? protectUntil : 0,
      spawnProtected: activeAlive,
    };
  });

  return {
    ...room,
    roundTimeRemainingSec: roundDuration,
    roundPhase: 'playing',
    phaseStartedAt: now,
    roundEndsAt: now + roundDuration * 1000,
    countdownEndsAt: undefined,
    countdownRemainingSec: 0,
    intermissionEndsAt: undefined,
    players: protectedPlayers,
  };
}

export function startNextAuthoritativeRound(
  room: AuthoritativeRoomState,
  now = Date.now()
): AuthoritativeRoomState {
  if (isRoundBasedMode(room.mode)) {
    return beginRoundCountdownState(room, now, true);
  }
  const roundDuration = room.roundDurationSec || ROUND_DURATION_SEC;
  const startHp = room.startingHp === 150 ? 150 : 100;
  let alphaIdx = 0;
  let bravoIdx = 0;
  const protectUntil = now + SPAWN_PROTECTION_SEC * 1000;
  const respawnedPlayers = room.players.map((p) => {
    const idx = p.team === 'bravo' ? bravoIdx++ : alphaIdx++;
    const spawn = getTeamSpawnPosition(p.team, idx, room.mapId);
    const isDisconnected = Boolean(p.disconnected);
    return {
      ...p,
      hp: isDisconnected ? 0 : startHp,
      maxHp: startHp,
      alive: !isDisconnected,
      isSliding: false,
      x: spawn.x,
      y: spawn.y,
      z: spawn.z,
      yaw: spawn.yaw,
      pitch: 0,
      respawnSeq: (p.respawnSeq ?? 0) + 1,
      spawnProtectedUntil: isDisconnected ? 0 : protectUntil,
      spawnProtected: !isDisconnected,
      color: p.color,
    };
  });

  return {
    ...room,
    currentRound: room.currentRound + 1,
    roundTimeRemainingSec: roundDuration,
    roundPhase: 'playing',
    roundWinnerTeam: null,
    phaseStartedAt: now,
    roundEndsAt: now + roundDuration * 1000,
    intermissionEndsAt: undefined,
    countdownEndsAt: undefined,
    countdownRemainingSec: 0,
    players: respawnedPlayers,
  };
}

export function resetAuthoritativeMatch(
  room: AuthoritativeRoomState,
  now = Date.now(),
  nextMapId?: MapId
): AuthoritativeRoomState {
  const zeroedPlayers = room.players.map((p) => ({
    ...p,
    kills: 0,
    deaths: 0,
    shotsFired: 0,
    shotsHit: 0,
    headshots: 0,
    isSliding: false,
    score: 0,
  }));
  const next = startNextAuthoritativeRound(
    {
      ...room,
      mapId: nextMapId || room.mapId,
      alphaScore: 0,
      bravoScore: 0,
      teamScore: 0,
      currentRound: 0,
      matchWinnerTeam: null,
      roundWinnerTeam: null,
      rematchReadyPlayerIds: [],
      mapVotes: {},
      players: zeroedPlayers,
    },
    now
  );
  return {
    ...next,
    currentRound: 1,
  };
}

export interface SpectatorCandidate {
  id: string;
  name: string;
  team?: TeamId;
  alive?: boolean;
}

export function selectInitialSpectatorTarget(
  players: readonly SpectatorCandidate[],
  localPlayerId: string,
  localTeam: TeamId,
  killerId: string | null | undefined,
  mode: OnlineGameMode
): string | null {
  const aliveCandidates = players.filter((p) => p.id !== localPlayerId && p.alive !== false);
  if (aliveCandidates.length === 0) return null;
  if (mode === 'tdm_2v2') {
    const aliveTeammate = aliveCandidates.find((p) => (p.team || 'alpha') === localTeam);
    if (aliveTeammate) return aliveTeammate.id;
  }
  if (killerId) {
    const aliveKiller = aliveCandidates.find((p) => p.id === killerId);
    if (aliveKiller) return aliveKiller.id;
  }
  return aliveCandidates[0].id;
}

export function cycleSpectatorTarget(
  players: readonly SpectatorCandidate[],
  localPlayerId: string,
  currentTargetId: string | null,
  direction: 1 | -1 = 1
): string | null {
  const aliveCandidates = players.filter((p) => p.id !== localPlayerId && p.alive !== false);
  if (aliveCandidates.length === 0) return null;
  if (!currentTargetId) return aliveCandidates[0].id;
  const idx = aliveCandidates.findIndex((p) => p.id === currentTargetId);
  if (idx === -1) return aliveCandidates[0].id;
  return aliveCandidates[(idx + direction + aliveCandidates.length) % aliveCandidates.length].id;
}

export interface KillFeedEntry {
  id: string;
  killerName: string;
  killerTeam: TeamId;
  weaponName: string;
  victimName: string;
  victimTeam: TeamId;
  isHeadshot: boolean;
  createdAt: number;
}

export function appendKillFeedEntry(
  list: readonly KillFeedEntry[],
  entry: KillFeedEntry,
  maxItems = KILL_FEED_MAX_ITEMS
): KillFeedEntry[] {
  return [entry, ...list].slice(0, Math.max(1, maxItems));
}

export function pruneExpiredKillFeed(
  list: readonly KillFeedEntry[],
  now: number,
  ttlMs = KILL_FEED_TTL_MS
): KillFeedEntry[] {
  return list.filter((item) => now - item.createdAt < ttlMs);
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

// =========================================================
// PING QUALITY, SCOREBOARD, SPATIAL FOOTSTEPS, REMATCH, MAP VOTE & RECONNECT
// =========================================================

export type PingQuality = 'good' | 'medium' | 'poor';

export function classifyPingQuality(pingMs: number): {
  quality: PingQuality;
  color: string;
  labelFa: string;
} {
  const safeMs = Number.isFinite(pingMs) ? Math.max(0, Math.round(pingMs)) : 999;
  if (safeMs <= 80) {
    return { quality: 'good', color: '#34d399', labelFa: 'عالی' };
  }
  if (safeMs <= 160) {
    return { quality: 'medium', color: '#fbbf24', labelFa: 'متوسط' };
  }
  return { quality: 'poor', color: '#f43f5e', labelFa: 'ضعیف' };
}

export interface ScoreboardSortablePlayer {
  id: string;
  name: string;
  team?: TeamId;
  kills: number;
  deaths?: number;
  score?: number;
  alive?: boolean;
  isHost?: boolean;
  disconnected?: boolean;
}

export function sortScoreboardPlayers<T extends ScoreboardSortablePlayer>(players: readonly T[]): T[] {
  return [...players].sort((a, b) => {
    if (b.kills !== a.kills) return b.kills - a.kills;
    const aDeaths = a.deaths ?? 0;
    const bDeaths = b.deaths ?? 0;
    if (aDeaths !== bDeaths) return aDeaths - bDeaths;
    const aScore = a.score ?? 0;
    const bScore = b.score ?? 0;
    if (bScore !== aScore) return bScore - aScore;
    return a.name.localeCompare(b.name);
  });
}

export const FOOTSTEP_MAX_RANGE_M = 16;

/**
 * Pure spatial footstep gain calculator:
 * - Short audible radius (<= 16m)
 * - Slow walking is much quieter than fast running/sprinting
 * - Respects user Settings volume slider (0..1)
 */
export function computeFootstepGain(distanceM: number, speedMps: number, volumeSetting: number): number {
  if (!Number.isFinite(distanceM) || !Number.isFinite(speedMps) || !Number.isFinite(volumeSetting)) {
    return 0;
  }
  const vol = Math.max(0, Math.min(1, volumeSetting));
  if (vol <= 0.001) return 0;
  if (distanceM >= FOOTSTEP_MAX_RANGE_M || distanceM < 0) return 0;
  if (speedMps < 0.35) return 0;

  // Smooth distance attenuation (quadratic falloff so nearby footsteps are clear & distant ones vanish)
  const distNorm = Math.max(0, 1 - distanceM / FOOTSTEP_MAX_RANGE_M);
  const distCurve = distNorm * distNorm;

  // Speed factor: slow walk (~1.5-3.2 m/s) is quiet (~0.25-0.42), fast run/sprint (~5.5-8.5 m/s) up to 1.0
  const speedNorm = Math.max(0, Math.min(1, (speedMps - 0.35) / 6.65));
  const speedCurve = 0.22 + speedNorm * speedNorm * 0.78;

  // Keep overall footstep level subtle so it never masks gunfire or voice chat
  return Math.round(distCurve * speedCurve * vol * 0.18 * 10000) / 10000;
}

export function toggleRematchVote(
  room: AuthoritativeRoomState,
  playerId: string,
  ready = true
): AuthoritativeRoomState {
  const prev = Array.isArray(room.rematchReadyPlayerIds) ? room.rematchReadyPlayerIds : [];
  const exists = prev.includes(playerId);
  let next: string[];
  if (ready) {
    next = exists ? prev : [...prev, playerId];
  } else {
    next = prev.filter((id) => id !== playerId);
  }
  return {
    ...room,
    rematchReadyPlayerIds: next,
  };
}

export function areAllActivePlayersReadyForRematch(room: AuthoritativeRoomState): boolean {
  const activePlayers = room.players.filter((p) => !p.disconnected && !p.isBot);
  if (activePlayers.length === 0) return false;
  const readySet = new Set(room.rematchReadyPlayerIds || []);
  return activePlayers.every((p) => readySet.has(p.id));
}

export function castMapVote(
  room: AuthoritativeRoomState,
  playerId: string,
  mapId: MapId
): AuthoritativeRoomState {
  if (!MAP_LIST.some((m) => m.id === mapId)) return room;
  const prevVotes = room.mapVotes || {};
  return {
    ...room,
    mapVotes: {
      ...prevVotes,
      [playerId]: mapId,
    },
  };
}

export interface MapVoteResolution {
  winnerMapId: MapId;
  counts: Record<MapId, number>;
  totalVotes: number;
  isTie: boolean;
  decidedByHost: boolean;
}

export function resolveMapVoteWinner(room: AuthoritativeRoomState): MapVoteResolution {
  const counts: Record<MapId, number> = {
    warehouse: 0,
    docks: 0,
    outpost: 0,
    duel: 0,
  };
  const activePlayerIds = new Set(room.players.filter((p) => !p.disconnected).map((p) => p.id));
  const rawVotes = room.mapVotes || {};
  let totalVotes = 0;

  for (const [pid, votedMap] of Object.entries(rawVotes)) {
    if (activePlayerIds.size > 0 && !activePlayerIds.has(pid)) continue;
    if (isValidMapId(votedMap)) {
      counts[votedMap] += 1;
      totalVotes += 1;
    }
  }

  if (totalVotes === 0) {
    return {
      winnerMapId: room.mapId,
      counts,
      totalVotes: 0,
      isTie: false,
      decidedByHost: false,
    };
  }

  const mapIds: MapId[] = ['warehouse', 'docks', 'outpost', 'duel'];
  const maxVotes = Math.max(counts.warehouse, counts.docks, counts.outpost, counts.duel);
  const leaders = mapIds.filter((id) => counts[id] === maxVotes);

  if (leaders.length === 1) {
    return {
      winnerMapId: leaders[0],
      counts,
      totalVotes,
      isTie: false,
      decidedByHost: false,
    };
  }

  // Tie-breaker: Host's own vote decides if it's among the tied leaders;
  // otherwise Host's currently selected map breaks the tie if tied, else Host's current map.
  const hostVote = rawVotes[room.hostId];
  if (hostVote && leaders.includes(hostVote)) {
    return {
      winnerMapId: hostVote,
      counts,
      totalVotes,
      isTie: true,
      decidedByHost: true,
    };
  }
  if (leaders.includes(room.mapId)) {
    return {
      winnerMapId: room.mapId,
      counts,
      totalVotes,
      isTie: true,
      decidedByHost: true,
    };
  }
  return {
    winnerMapId: leaders[0],
    counts,
    totalVotes,
    isTie: true,
    decidedByHost: true,
  };
}

export const RECONNECT_GRACE_MS = 30_000;

export function markPlayerDisconnectedInHostState(
  room: AuthoritativeRoomState,
  playerId: string,
  now = Date.now()
): { nextRoom: AuthoritativeRoomState; disconnectedPlayer: AuthoritativePlayerState | null } {
  const target = room.players.find((p) => p.id === playerId) || null;
  if (!target || target.disconnected) {
    return { nextRoom: room, disconnectedPlayer: null };
  }
  const deadline = now + RECONNECT_GRACE_MS;
  const nextPlayers = room.players.map((p) =>
    p.id === playerId
      ? {
          ...p,
          disconnected: true,
          disconnectedAt: now,
          reconnectDeadlineAt: deadline,
          alive: false,
          hp: 0,
          spawnProtected: false,
          spawnProtectedUntil: 0,
        }
      : p
  );
  const updatedTarget = nextPlayers.find((p) => p.id === playerId) || target;
  return {
    nextRoom: {
      ...room,
      players: nextPlayers,
    },
    disconnectedPlayer: updatedTarget,
  };
}

export function reclaimDisconnectedPlayerInHostState(
  room: AuthoritativeRoomState,
  incomingPlayerId: string,
  incomingName: string,
  incomingPeerId: string | undefined,
  now = Date.now()
): { nextRoom: AuthoritativeRoomState; reclaimedPlayer: AuthoritativePlayerState | null } {
  const normIncomingName = (incomingName || '').trim().toLowerCase();
  const byId = room.players.find(
    (p) => p.id === incomingPlayerId && p.disconnected && (p.reconnectDeadlineAt ?? 0) > now
  );
  const byName =
    !byId && normIncomingName
      ? room.players.find(
          (p) =>
            p.disconnected &&
            (p.reconnectDeadlineAt ?? 0) > now &&
            p.name.trim().toLowerCase() === normIncomingName &&
            !room.players.some((other) => !other.disconnected && other.name.trim().toLowerCase() === normIncomingName)
        )
      : undefined;

  const matched = byId || byName;
  if (!matched) {
    return { nextRoom: room, reclaimedPlayer: null };
  }

  const oldId = matched.id;
  const roundBased = isRoundBasedMode(room.mode);
  const teamSlotIdx = Math.max(
    0,
    room.players.filter((p) => p.team === matched.team).findIndex((p) => p.id === oldId)
  );
  const spawn = getTeamSpawnPosition(matched.team, teamSlotIdx, room.mapId);
  // If reconnecting mid-round while round is actively playing, return as dead/spectator until next round;
  // otherwise (countdown, lobby, or non-round mode) return alive on team spawn.
  const rejoinAlive = !roundBased || room.roundPhase === 'countdown';

  const startHp = room.startingHp === 150 ? 150 : 100;
  const restored: AuthoritativePlayerState = {
    ...matched,
    id: incomingPlayerId,
    name: (incomingName || matched.name).slice(0, 18),
    peerId: incomingPeerId || matched.peerId,
    disconnected: false,
    disconnectedAt: undefined,
    reconnectDeadlineAt: undefined,
    alive: rejoinAlive,
    hp: rejoinAlive ? startHp : 0,
    maxHp: startHp,
    x: spawn.x,
    y: 0,
    z: spawn.z,
    yaw: spawn.yaw,
    pitch: 0,
    respawnSeq: (matched.respawnSeq ?? 0) + 1,
    lastSeen: now,
  };

  const nextPlayers = room.players.map((p) => (p.id === oldId ? restored : p));
  const nextVotes = room.mapVotes ? { ...room.mapVotes } : undefined;
  if (nextVotes && oldId !== incomingPlayerId && nextVotes[oldId]) {
    nextVotes[incomingPlayerId] = nextVotes[oldId];
    delete nextVotes[oldId];
  }
  const nextRematch = room.rematchReadyPlayerIds
    ? room.rematchReadyPlayerIds.map((id) => (id === oldId ? incomingPlayerId : id))
    : undefined;

  return {
    nextRoom: {
      ...room,
      players: nextPlayers,
      playerCount: nextPlayers.length,
      mapVotes: nextVotes,
      rematchReadyPlayerIds: nextRematch,
    },
    reclaimedPlayer: restored,
  };
}

export function pruneExpiredDisconnectedPlayers(
  room: AuthoritativeRoomState,
  now = Date.now()
): { nextRoom: AuthoritativeRoomState; expiredPlayers: AuthoritativePlayerState[] } {
  const expiredPlayers: AuthoritativePlayerState[] = [];
  const nextPlayers: AuthoritativePlayerState[] = [];

  for (const p of room.players) {
    if (p.disconnected && typeof p.reconnectDeadlineAt === 'number' && now >= p.reconnectDeadlineAt) {
      expiredPlayers.push(p);
    } else {
      nextPlayers.push(p);
    }
  }

  if (expiredPlayers.length === 0) {
    return { nextRoom: room, expiredPlayers: [] };
  }

  const expiredIds = new Set(expiredPlayers.map((p) => p.id));
  const nextVotes = room.mapVotes ? { ...room.mapVotes } : undefined;
  if (nextVotes) {
    for (const eid of expiredIds) {
      delete nextVotes[eid];
    }
  }
  const nextRematch = room.rematchReadyPlayerIds
    ? room.rematchReadyPlayerIds.filter((id) => !expiredIds.has(id))
    : undefined;
  const teamScore = nextPlayers.reduce((sum, p) => sum + (p.score || 0), 0);

  return {
    nextRoom: {
      ...room,
      players: nextPlayers,
      playerCount: nextPlayers.length,
      teamScore,
      mapVotes: nextVotes,
      rematchReadyPlayerIds: nextRematch,
    },
    expiredPlayers,
  };
}

// ============================================================================
// CALL OF DUTY-STYLE TACTICAL SLIDE (ALPHA) — PURE DETERMINISTIC STATE MACHINE
// ============================================================================

export const SLIDE_DURATION_SEC = 0.85;
export const SLIDE_COOLDOWN_SEC = 1.5;
export const SLIDE_INITIAL_SPEED = 14.5;
export const SLIDE_END_SPEED = 4.6;
export const SLIDE_MIN_TRIGGER_SPEED = 2.6;
export const PLAYER_STAND_EYE_HEIGHT = 1.68;
export const PLAYER_SLIDE_EYE_HEIGHT = 0.92;
export const PLAYER_STAND_HITBOX_HEIGHT = 1.85;
export const PLAYER_SLIDE_HITBOX_HEIGHT = 1.05;

export interface SlideState {
  active: boolean;
  elapsedSec: number;
  durationSec: number;
  cooldownRemainingSec: number;
  dirX: number;
  dirZ: number;
  currentSpeed: number;
  eyeHeight: number;
  hitboxHeight: number;
}

export function createInitialSlideState(): SlideState {
  return {
    active: false,
    elapsedSec: 0,
    durationSec: SLIDE_DURATION_SEC,
    cooldownRemainingSec: 0,
    dirX: 0,
    dirZ: 0,
    currentSpeed: 0,
    eyeHeight: PLAYER_STAND_EYE_HEIGHT,
    hitboxHeight: PLAYER_STAND_HITBOX_HEIGHT,
  };
}

export interface SlideTriggerContext {
  featureEnabled: boolean;
  roomSlideAllowed: boolean;
  onGround: boolean;
  isDead: boolean;
  isFrozen: boolean;
  moveSpeed: number;
  dirX: number;
  dirZ: number;
}

export function canTriggerSlide(state: SlideState, ctx: SlideTriggerContext): boolean {
  if (!ctx.featureEnabled || !ctx.roomSlideAllowed) return false;
  if (!ctx.onGround || ctx.isDead || ctx.isFrozen) return false;
  if (state.active || state.cooldownRemainingSec > 0.001) return false;
  if (ctx.moveSpeed < SLIDE_MIN_TRIGGER_SPEED) return false;
  const dirLen = Math.hypot(ctx.dirX, ctx.dirZ);
  return dirLen > 0.05;
}

export function triggerSlide(state: SlideState, ctx: SlideTriggerContext): SlideState {
  if (!canTriggerSlide(state, ctx)) return state;
  const dirLen = Math.hypot(ctx.dirX, ctx.dirZ) || 1;
  return {
    active: true,
    elapsedSec: 0,
    durationSec: SLIDE_DURATION_SEC,
    cooldownRemainingSec: 0,
    dirX: ctx.dirX / dirLen,
    dirZ: ctx.dirZ / dirLen,
    currentSpeed: SLIDE_INITIAL_SPEED,
    eyeHeight: PLAYER_SLIDE_EYE_HEIGHT,
    hitboxHeight: PLAYER_SLIDE_HITBOX_HEIGHT,
  };
}

export function cancelSlide(state: SlideState, applyCooldown = true): SlideState {
  if (!state.active) return state;
  return {
    ...state,
    active: false,
    elapsedSec: 0,
    currentSpeed: 0,
    cooldownRemainingSec: applyCooldown
      ? Math.max(state.cooldownRemainingSec, SLIDE_COOLDOWN_SEC)
      : state.cooldownRemainingSec,
    eyeHeight: PLAYER_STAND_EYE_HEIGHT,
    hitboxHeight: PLAYER_STAND_HITBOX_HEIGHT,
  };
}

export function stepSlideState(
  state: SlideState,
  dtSec: number,
  options: { roomSlideAllowed: boolean; featureEnabled: boolean; isDead?: boolean; isFrozen?: boolean }
): SlideState {
  const dt = Math.max(0, Math.min(0.1, Number.isFinite(dtSec) ? dtSec : 0));

  if (!options.featureEnabled || !options.roomSlideAllowed || options.isDead || options.isFrozen) {
    const nextCd = Math.max(0, state.cooldownRemainingSec - dt);
    return {
      ...state,
      active: false,
      elapsedSec: 0,
      currentSpeed: 0,
      cooldownRemainingSec: nextCd,
      eyeHeight: PLAYER_STAND_EYE_HEIGHT,
      hitboxHeight: PLAYER_STAND_HITBOX_HEIGHT,
    };
  }

  if (state.active) {
    const nextElapsed = state.elapsedSec + dt;
    if (nextElapsed >= state.durationSec) {
      return {
        ...state,
        active: false,
        elapsedSec: 0,
        currentSpeed: 0,
        cooldownRemainingSec: SLIDE_COOLDOWN_SEC,
        eyeHeight: PLAYER_STAND_EYE_HEIGHT,
        hitboxHeight: PLAYER_STAND_HITBOX_HEIGHT,
      };
    }
    const t = Math.max(0, Math.min(1, nextElapsed / state.durationSec));
    // Smooth ease-out friction decay: fast burst at start, gliding deceleration toward end
    const decay = Math.pow(1 - t, 1.35);
    const speed = SLIDE_END_SPEED + (SLIDE_INITIAL_SPEED - SLIDE_END_SPEED) * decay;
    return {
      ...state,
      active: true,
      elapsedSec: nextElapsed,
      currentSpeed: speed,
      eyeHeight: PLAYER_SLIDE_EYE_HEIGHT,
      hitboxHeight: PLAYER_SLIDE_HITBOX_HEIGHT,
    };
  }

  const nextCd = Math.max(0, state.cooldownRemainingSec - dt);
  if (nextCd === state.cooldownRemainingSec) {
    return state;
  }
  return {
    ...state,
    cooldownRemainingSec: nextCd,
  };
}

// ============================================================================
// POST-MATCH STATISTICS SUMMARY & MVP CALCULATION
// ============================================================================

export interface MatchPlayerStatInput {
  id: string;
  name: string;
  team?: TeamId;
  kills: number;
  deaths: number;
  shotsFired?: number;
  shotsHit?: number;
  headshots?: number;
  score?: number;
}

export interface MatchPlayerStatRow {
  id: string;
  name: string;
  team: TeamId;
  kills: number;
  deaths: number;
  shotsFired: number;
  shotsHit: number;
  accuracyPct: number;
  headshots: number;
  score: number;
  isMvp: boolean;
}

export interface MatchSummaryStats {
  rows: MatchPlayerStatRow[];
  mvp: MatchPlayerStatRow | null;
}

export function computeAccuracyPercent(shotsFired: number, shotsHit: number): number {
  const fired = Math.max(0, Math.floor(shotsFired || 0));
  const hit = Math.max(0, Math.floor(shotsHit || 0));
  if (fired <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((Math.min(hit, fired) / fired) * 100)));
}

export function computeMatchSummaryStats(players: MatchPlayerStatInput[]): MatchSummaryStats {
  if (!players || players.length === 0) {
    return { rows: [], mvp: null };
  }

  const baseRows: MatchPlayerStatRow[] = players.map((p) => {
    const kills = Math.max(0, Math.floor(p.kills || 0));
    const deaths = Math.max(0, Math.floor(p.deaths || 0));
    const shotsFired = Math.max(0, Math.floor(p.shotsFired || 0));
    const shotsHit = Math.max(0, Math.floor(p.shotsHit || 0));
    const headshots = Math.max(0, Math.floor(p.headshots || 0));
    const score = Math.max(0, Math.floor(p.score ?? kills * 150 + headshots * 50));
    return {
      id: p.id,
      name: p.name,
      team: p.team || 'alpha',
      kills,
      deaths,
      shotsFired,
      shotsHit,
      accuracyPct: computeAccuracyPercent(shotsFired, shotsHit),
      headshots,
      score,
      isMvp: false,
    };
  });

  baseRows.sort((a, b) => {
    if (b.kills !== a.kills) return b.kills - a.kills;
    if (b.headshots !== a.headshots) return b.headshots - a.headshots;
    if (b.accuracyPct !== a.accuracyPct) return b.accuracyPct - a.accuracyPct;
    if (a.deaths !== b.deaths) return a.deaths - b.deaths;
    return b.score - a.score;
  });

  if (baseRows.length > 0) {
    baseRows[0].isMvp = true;
  }

  return {
    rows: baseRows,
    mvp: baseRows[0] || null,
  };
}

// ============================================================================
// HOST MATCH SETTINGS (ROUND DURATION / WIN TARGET / STARTING HP / FRIENDLY FIRE)
// ============================================================================

export const ALLOWED_ROUND_DURATIONS = [60, 90, 120] as const;
export type AllowedRoundDuration = (typeof ALLOWED_ROUND_DURATIONS)[number];

export const ALLOWED_WIN_TARGETS = [3, 6, 10] as const;
export type AllowedWinTarget = (typeof ALLOWED_WIN_TARGETS)[number];

export const ALLOWED_STARTING_HP = [100, 150] as const;
export type AllowedStartingHp = (typeof ALLOWED_STARTING_HP)[number];

export type OnlineBotDifficulty = 'weak' | 'medium' | 'strong';
export const ONLINE_BOT_DIFFICULTIES = ['weak', 'medium', 'strong'] as const;

export interface HostMatchSettings {
  roundDurationSec: AllowedRoundDuration;
  targetWinRounds: AllowedWinTarget;
  startingHp: AllowedStartingHp;
  friendlyFire: boolean;
  fillBotsEnabled?: boolean;
  botDifficulty?: OnlineBotDifficulty;
}

export const DEFAULT_HOST_MATCH_SETTINGS: HostMatchSettings = {
  roundDurationSec: 90,
  targetWinRounds: 6,
  startingHp: 100,
  friendlyFire: false,
  fillBotsEnabled: false,
  botDifficulty: 'medium',
};

export function sanitizeOnlineBotDifficulty(
  raw: unknown,
  fallback: OnlineBotDifficulty = 'medium'
): OnlineBotDifficulty {
  return raw === 'weak' || raw === 'medium' || raw === 'strong' ? raw : fallback;
}

export function formatOnlineBotDifficultyFa(diff: OnlineBotDifficulty): string {
  if (diff === 'weak') return 'آسان';
  if (diff === 'strong') return 'سخت';
  return 'متوسط';
}

export function sanitizeHostMatchSettings(
  input: Partial<{
    roundDurationSec: number;
    targetWinRounds: number;
    startingHp: number;
    friendlyFire: boolean;
    fillBotsEnabled: boolean;
    botDifficulty: OnlineBotDifficulty;
  }>,
  fallback: HostMatchSettings = DEFAULT_HOST_MATCH_SETTINGS
): HostMatchSettings {
  const roundDurationSec: AllowedRoundDuration =
    input.roundDurationSec === 60 || input.roundDurationSec === 90 || input.roundDurationSec === 120
      ? input.roundDurationSec
      : fallback.roundDurationSec;

  const targetWinRounds: AllowedWinTarget =
    input.targetWinRounds === 3 || input.targetWinRounds === 6 || input.targetWinRounds === 10
      ? input.targetWinRounds
      : fallback.targetWinRounds;

  const startingHp: AllowedStartingHp =
    input.startingHp === 100 || input.startingHp === 150
      ? input.startingHp
      : fallback.startingHp;

  const friendlyFire =
    typeof input.friendlyFire === 'boolean' ? input.friendlyFire : fallback.friendlyFire;

  const fillBotsEnabled =
    typeof input.fillBotsEnabled === 'boolean'
      ? input.fillBotsEnabled
      : Boolean(fallback.fillBotsEnabled);

  const botDifficulty = sanitizeOnlineBotDifficulty(
    input.botDifficulty,
    fallback.botDifficulty || 'medium'
  );

  return {
    roundDurationSec,
    targetWinRounds,
    startingHp,
    friendlyFire,
    fillBotsEnabled,
    botDifficulty,
  };
}

// ============================================================================
// TEAM-ONLY TACTICAL PING (5s) & QUICK PERSIAN COMMS (4 MESSAGES)
// ============================================================================

export const TEAM_PING_TTL_MS = 5000;
export const TEAM_QUICK_MSG_TTL_MS = 4000;
export const TEAM_SIGNAL_COOLDOWN_MS = 850;

export type TeamQuickMessageId = 'enemy_here' | 'help' | 'go' | 'wait';

export interface TeamQuickMessageDef {
  id: TeamQuickMessageId;
  textFa: string;
  shortLabel: string;
}

export const TEAM_QUICK_MESSAGES: readonly TeamQuickMessageDef[] = [
  { id: 'enemy_here', textFa: 'دشمن اینجاست', shortLabel: 'دشمن' },
  { id: 'help', textFa: 'کمک', shortLabel: 'کمک' },
  { id: 'go', textFa: 'برو', shortLabel: 'برو' },
  { id: 'wait', textFa: 'صبر کن', shortLabel: 'صبر' },
] as const;

export function getTeamQuickMessageTextFa(messageId: string): string | null {
  const found = TEAM_QUICK_MESSAGES.find((m) => m.id === messageId);
  return found ? found.textFa : null;
}

export function isTeamCommsMode(mode: OnlineGameMode | null | undefined): boolean {
  return mode === 'coop' || mode === 'tdm_1v1' || mode === 'tdm_2v2';
}

export function shouldReceiveTeamSignal(
  mode: OnlineGameMode | null | undefined,
  senderTeam: TeamId | undefined,
  receiverTeam: TeamId | undefined
): boolean {
  if (!isTeamCommsMode(mode)) return false;
  if (!senderTeam || !receiverTeam) return false;
  return senderTeam === receiverTeam;
}

export interface TeamTacticalPing {
  id: string;
  senderId: string;
  senderName: string;
  team: TeamId;
  x: number;
  y: number;
  z: number;
  createdAt: number;
  expiresAt: number;
}

export interface TeamQuickMessage {
  id: string;
  senderId: string;
  senderName: string;
  team: TeamId;
  messageId: TeamQuickMessageId;
  textFa: string;
  createdAt: number;
  expiresAt: number;
}

export function pruneExpiredTeamSignals<T extends { expiresAt: number }>(
  list: readonly T[],
  now = Date.now()
): T[] {
  return list.filter((item) => item.expiresAt > now);
}

// ============================================================================
// HOST-AUTHORITATIVE VALIDATION (ANTI-TAMPER: MOVEMENT / FIRE-RATE / MAG / DMG)
// ============================================================================

export interface AuthoritativeWeaponSpec {
  id: WeaponId;
  baseDamage: number;
  headMultiplier: number;
  minFireIntervalMs: number;
  magSize: number;
  isMelee: boolean;
}

export const WEAPON_AUTHORITATIVE_SPECS: readonly AuthoritativeWeaponSpec[] = [
  { id: 'ak47', baseDamage: 36, headMultiplier: 2.2, minFireIntervalMs: 90, magSize: 30, isMelee: false },
  { id: 'm4a1', baseDamage: 31, headMultiplier: 2.2, minFireIntervalMs: 70, magSize: 35, isMelee: false },
  { id: 'sniper', baseDamage: 115, headMultiplier: 2.5, minFireIntervalMs: 750, magSize: 5, isMelee: false },
  { id: 'mp5', baseDamage: 25, headMultiplier: 2.1, minFireIntervalMs: 60, magSize: 40, isMelee: false },
  { id: 'shotgun', baseDamage: 160, headMultiplier: 1.6, minFireIntervalMs: 580, magSize: 8, isMelee: false },
  { id: 'pistol', baseDamage: 32, headMultiplier: 2.0, minFireIntervalMs: 120, magSize: 15, isMelee: false },
  { id: 'katana', baseDamage: 95, headMultiplier: 1.5, minFireIntervalMs: 300, magSize: 999, isMelee: true },
  { id: 'lmg', baseDamage: 34, headMultiplier: 2.0, minFireIntervalMs: 75, magSize: 100, isMelee: false },
  { id: 'deagle', baseDamage: 72, headMultiplier: 2.3, minFireIntervalMs: 260, magSize: 7, isMelee: false },
  { id: 'rpg', baseDamage: 180, headMultiplier: 1.3, minFireIntervalMs: 1100, magSize: 1, isMelee: false },
] as const;

export function getAuthoritativeWeaponSpec(weaponIdx: number): AuthoritativeWeaponSpec | null {
  if (!Number.isInteger(weaponIdx) || weaponIdx < 0 || weaponIdx >= WEAPON_AUTHORITATIVE_SPECS.length) {
    return null;
  }
  return WEAPON_AUTHORITATIVE_SPECS[weaponIdx];
}

export interface ClientValidationTracker {
  lastPosX: number;
  lastPosZ: number;
  lastPosAtMs: number;
  lastWeaponIdx: number;
  lastShotAtMs: number;
  shotsInMag: number;
}

export function validateClientMovementPosition(params: {
  prevX: number;
  prevZ: number;
  prevAtMs: number;
  nextX: number;
  nextY: number;
  nextZ: number;
  nowMs: number;
  isSliding: boolean;
  slideAllowed: boolean;
  arenaHalf: number;
}): { valid: boolean; x: number; y: number; z: number } {
  if (
    !Number.isFinite(params.nextX) ||
    !Number.isFinite(params.nextY) ||
    !Number.isFinite(params.nextZ)
  ) {
    return { valid: false, x: params.prevX, y: 0, z: params.prevZ };
  }

  // Reject impossible vertical flight or void fall
  if (params.nextY < -1.5 || params.nextY > 9.0) {
    return { valid: false, x: params.prevX, y: 0, z: params.prevZ };
  }

  const limit = Math.max(4, params.arenaHalf - 0.35);
  const clampedX = Math.max(-limit, Math.min(limit, params.nextX));
  const clampedZ = Math.max(-limit, Math.min(limit, params.nextZ));

  // If first sample or invalid timestamp delta, accept clamped bounds
  if (params.prevAtMs <= 0) {
    return { valid: true, x: clampedX, y: Math.max(0, params.nextY), z: clampedZ };
  }

  const dtSec = Math.max(0.05, Math.min(2.5, (params.nowMs - params.prevAtMs) / 1000));
  const dist = Math.hypot(clampedX - params.prevX, clampedZ - params.prevZ);

  // Standing/sprinting (+adrenaline burst) up to 13.5 m/s; active allowed slide up to 17.8 m/s + 2.4m jitter allowance
  const maxSpeedMps = params.isSliding && params.slideAllowed ? 17.8 : 13.5;
  const maxAllowedDist = maxSpeedMps * dtSec + 2.4;

  if (dist > maxAllowedDist) {
    return { valid: false, x: params.prevX, y: 0, z: params.prevZ };
  }

  return { valid: true, x: clampedX, y: Math.max(0, params.nextY), z: clampedZ };
}

export function validateClientShootEvent(
  tracker: ClientValidationTracker | undefined,
  weaponIdx: number,
  nowMs: number
): { valid: boolean; nextTracker: ClientValidationTracker } {
  const spec = getAuthoritativeWeaponSpec(weaponIdx);
  const base: ClientValidationTracker = tracker || {
    lastPosX: 0,
    lastPosZ: 0,
    lastPosAtMs: 0,
    lastWeaponIdx: weaponIdx,
    lastShotAtMs: 0,
    shotsInMag: 0,
  };
  if (!spec) {
    return { valid: false, nextTracker: base };
  }

  const switchedWeapon = base.lastWeaponIdx !== weaponIdx;
  const elapsedMs = base.lastShotAtMs > 0 ? nowMs - base.lastShotAtMs : Infinity;

  // Enforce minimum fire interval with network jitter tolerance (72%)
  if (!switchedWeapon && elapsedMs < spec.minFireIntervalMs * 0.72) {
    return { valid: false, nextTracker: base };
  }

  // Reset magazine counter if player switched weapons or paused long enough to reload (>= 1050ms)
  const nextShotsInMag = switchedWeapon || elapsedMs >= 1050 ? 1 : base.shotsInMag + 1;

  // Enforce magazine capacity (+1 tolerance for out-of-order packets)
  if (!spec.isMelee && nextShotsInMag > spec.magSize + 1) {
    return { valid: false, nextTracker: base };
  }

  return {
    valid: true,
    nextTracker: {
      ...base,
      lastWeaponIdx: weaponIdx,
      lastShotAtMs: nowMs,
      shotsInMag: nextShotsInMag,
    },
  };
}

export function validateAuthoritativeHitDamage(params: {
  weaponIdx: number;
  rawDamage: number;
  isHeadshot: boolean;
  lastShotAtMs?: number;
  nowMs: number;
  requireRecentShot?: boolean;
}): { valid: boolean; authoritativeDamage: number } {
  const spec = getAuthoritativeWeaponSpec(params.weaponIdx);
  if (!spec) return { valid: false, authoritativeDamage: 0 };
  if (!Number.isFinite(params.rawDamage) || params.rawDamage <= 0) {
    return { valid: false, authoritativeDamage: 0 };
  }

  // Ensure a hit arrives within a plausible window of a validated shot
  if (params.requireRecentShot && (!params.lastShotAtMs || params.lastShotAtMs <= 0)) {
    return { valid: false, authoritativeDamage: 0 };
  }
  if (typeof params.lastShotAtMs === 'number' && params.lastShotAtMs > 0) {
    const sinceShotMs = params.nowMs - params.lastShotAtMs;
    if (sinceShotMs < -250 || sinceShotMs > 2600) {
      return { valid: false, authoritativeDamage: 0 };
    }
  }

  const expectedSingleHit = Math.round(
    spec.baseDamage * (params.isHeadshot ? spec.headMultiplier : 1.0)
  );
  // Reject outrageous forged numbers (> 2.2x max) silently; clamp mild overdrive/rounding to expected weapon max
  if (params.rawDamage > expectedSingleHit * 2.2 + 10) {
    return { valid: false, authoritativeDamage: 0 };
  }

  const clampedDamage = Math.max(1, Math.min(expectedSingleHit, Math.round(params.rawDamage)));
  return { valid: true, authoritativeDamage: clampedDamage };
}

// ============================================================================
// HOST-AUTHORITATIVE ONLINE BOT FILLING (1v1 / 2v2 ROUND MODES)
// ============================================================================

export function getRoundModeTeamCapacity(mode: OnlineGameMode): number {
  if (mode === 'tdm_1v1') return 1;
  if (mode === 'tdm_2v2') return 2;
  return 0;
}

export interface OnlineBotDifficultyProfile {
  moveSpeed: number;
  fireIntervalMs: number;
  accuracy: number;
  bodyDamage: number;
  headshotChance: number;
  engageRange: number;
  preferredRange: number;
}

export function getOnlineBotDifficultyProfile(
  difficulty: OnlineBotDifficulty = 'medium'
): OnlineBotDifficultyProfile {
  if (difficulty === 'weak') {
    return {
      moveSpeed: 3.3,
      fireIntervalMs: 1220,
      accuracy: 0.28,
      bodyDamage: 14,
      headshotChance: 0.06,
      engageRange: 28,
      preferredRange: 13,
    };
  }
  if (difficulty === 'strong') {
    return {
      moveSpeed: 5.9,
      fireIntervalMs: 470,
      accuracy: 0.72,
      bodyDamage: 25,
      headshotChance: 0.24,
      engageRange: 44,
      preferredRange: 15,
    };
  }
  return {
    moveSpeed: 4.6,
    fireIntervalMs: 760,
    accuracy: 0.48,
    bodyDamage: 19,
    headshotChance: 0.14,
    engageRange: 35,
    preferredRange: 14,
  };
}

/**
 * Balances teams using ONLY human players so that when a real player joins a room
 * that has bots filling empty slots, the human naturally takes a bot's slot instead
 * of stacking onto the already-human-occupied team.
 */
export function assignBalancedHumanTeam(
  players: readonly AuthoritativePlayerState[],
  preferredTeam?: TeamId
): TeamId {
  if (preferredTeam === 'alpha' || preferredTeam === 'bravo') return preferredTeam;
  const humansOnly = players.filter((p) => !p.isBot);
  return assignBalancedTeam(humansOnly);
}

/**
 * Reconciles Host-authoritative bot slots in 1v1 / 2v2 round modes.
 * - Removes all bots when fillBotsEnabled is OFF or mode is not round-based.
 * - Keeps human players untouched and fills empty slots per team up to capacity (1 for 1v1, 2 for 2v2).
 * - Immediately removes excess bots when real humans join or switch onto a team.
 */
export function reconcileOnlineBots(
  room: AuthoritativeRoomState,
  now = Date.now()
): AuthoritativeRoomState {
  const cap = getRoundModeTeamCapacity(room.mode);
  const enabled = Boolean(room.fillBotsEnabled) && cap > 0;
  const difficulty = sanitizeOnlineBotDifficulty(room.botDifficulty, 'medium');
  const startHp = room.startingHp === 150 ? 150 : 100;

  const humans = room.players.filter((p) => !p.isBot);
  if (!enabled) {
    if (humans.length === room.players.length) return room;
    return {
      ...room,
      players: humans,
      playerCount: humans.length,
    };
  }

  const existingBots = room.players.filter((p) => p.isBot);
  const keptBots: AuthoritativePlayerState[] = [];

  for (const team of ['alpha', 'bravo'] as const) {
    const teamHumans = humans.filter((p) => p.team === team);
    const needed = Math.max(0, cap - teamHumans.length);
    const teamExistingBots = existingBots.filter((p) => p.team === team);

    for (let i = 0; i < needed; i++) {
      const slotIdx = teamHumans.length + i;
      const existing = teamExistingBots[i];
      if (existing) {
        keptBots.push({
          ...existing,
          botDifficulty: difficulty,
          maxHp: startHp,
          hp: Math.min(startHp, existing.hp > 0 ? existing.hp : existing.alive ? startHp : 0),
          lastSeen: now,
        });
      } else {
        const prefix = team === 'alpha' ? 'A' : 'B';
        const botId = `bot-${team}-${slotIdx + 1}`;
        const spawn = getTeamSpawnPosition(team, slotIdx, room.mapId);
        const protectUntil =
          room.roundPhase === 'playing' ? now + SPAWN_PROTECTION_SEC * 1000 : 0;
        keptBots.push({
          id: botId,
          name: `BOT-${prefix}${slotIdx + 1}`,
          team,
          isBot: true,
          botDifficulty: difficulty,
          x: spawn.x,
          y: spawn.y,
          z: spawn.z,
          yaw: spawn.yaw,
          pitch: 0,
          weaponIdx: slotIdx % 2 === 0 ? 0 : 1,
          hp: startHp,
          maxHp: startHp,
          alive: true,
          kills: 0,
          deaths: 0,
          shotsFired: 0,
          shotsHit: 0,
          headshots: 0,
          score: 0,
          color: getTeamColor(team),
          isSliding: false,
          respawnSeq: 1,
          spawnProtectedUntil: protectUntil,
          spawnProtected: protectUntil > now,
          disconnected: false,
          lastSeen: now,
        });
      }
    }
  }

  const nextPlayers = [...humans, ...keptBots];
  return {
    ...room,
    players: nextPlayers,
    playerCount: nextPlayers.length,
  };
}

export interface OnlineBotRuntimeState {
  lastShotAtMs: number;
  strafeSign: number;
  nextStrafeSwitchAtMs: number;
}

export interface OnlineBotShotEvent {
  attackerId: string;
  targetId: string;
  weaponIdx: number;
  from: { x: number; y: number; z: number };
  to: { x: number; y: number; z: number };
  hit: boolean;
  damage: number;
  isHeadshot: boolean;
}

export interface OnlineBotSimHelpers {
  canMoveTo?: (x: number, z: number) => boolean;
  hasLineOfSight?: (
    from: { x: number; y: number; z: number },
    to: { x: number; y: number; z: number }
  ) => boolean;
  rng?: () => number;
}

/**
 * Pure Host-authoritative simulation tick for online round bots.
 * Respects round phase (frozen during countdown/intermission/match_over),
 * team membership, Friendly Fire (never targets allies), arena bounds,
 * obstacle avoidance, line-of-sight, and difficulty parameters.
 */
export function stepOnlineBotsAuthoritative(
  room: AuthoritativeRoomState,
  runtimeMap: Map<string, OnlineBotRuntimeState>,
  dtSec: number,
  now = Date.now(),
  helpers: OnlineBotSimHelpers = {}
): {
  nextRoom: AuthoritativeRoomState;
  changed: boolean;
  shots: OnlineBotShotEvent[];
} {
  if (!isRoundBasedMode(room.mode) || room.roundPhase !== 'playing') {
    return { nextRoom: room, changed: false, shots: [] };
  }
  const hasBots = room.players.some((p) => p.isBot && p.alive && !p.disconnected);
  if (!hasBots) {
    return { nextRoom: room, changed: false, shots: [] };
  }

  const dt = Math.max(0.01, Math.min(0.25, dtSec));
  const arenaLimit = Math.max(8, getMapArenaHalf(room.mapId) - 2.2);
  const rng = helpers.rng || Math.random;
  const canMoveTo = helpers.canMoveTo || (() => true);
  const hasLineOfSight = helpers.hasLineOfSight || (() => true);
  const difficulty = sanitizeOnlineBotDifficulty(room.botDifficulty, 'medium');
  const profile = getOnlineBotDifficultyProfile(difficulty);
  const shots: OnlineBotShotEvent[] = [];
  let changed = false;

  const nextPlayers = room.players.map((bot) => {
    if (!bot.isBot || !bot.alive || bot.disconnected) return bot;

    let rt = runtimeMap.get(bot.id);
    if (!rt) {
      rt = {
        lastShotAtMs: now - Math.round(profile.fireIntervalMs * 0.4),
        strafeSign: rng() < 0.5 ? 1 : -1,
        nextStrafeSwitchAtMs: now + 1500 + Math.round(rng() * 1400),
      };
      runtimeMap.set(bot.id, rt);
    }

    if (now >= rt.nextStrafeSwitchAtMs) {
      rt.strafeSign = -rt.strafeSign;
      rt.nextStrafeSwitchAtMs = now + 1400 + Math.round(rng() * 1600);
    }

    // Find nearest alive opposing-team enemy (bots never target allies)
    let nearestEnemy: AuthoritativePlayerState | null = null;
    let nearestDistSq = Infinity;
    for (const candidate of room.players) {
      if (candidate.id === bot.id || !candidate.alive || candidate.disconnected) continue;
      if (candidate.team === bot.team) continue;
      const dx = candidate.x - bot.x;
      const dz = candidate.z - bot.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < nearestDistSq) {
        nearestDistSq = dSq;
        nearestEnemy = candidate;
      }
    }

    if (!nearestEnemy) return bot;

    const dx = nearestEnemy.x - bot.x;
    const dz = nearestEnemy.z - bot.z;
    const dist = Math.hypot(dx, dz) || 0.001;
    const dirX = dx / dist;
    const dirZ = dz / dist;
    const targetYaw = Math.atan2(-dirX, -dirZ);

    const botEye = { x: bot.x, y: 1.55, z: bot.z };
    const enemyCenter = { x: nearestEnemy.x, y: 1.32, z: nearestEnemy.z };
    const losClear = dist <= profile.engageRange && hasLineOfSight(botEye, enemyCenter);

    let moveX = 0;
    let moveZ = 0;
    if (!losClear || dist > profile.preferredRange + 2.5) {
      moveX = dirX + -dirZ * rt.strafeSign * 0.35;
      moveZ = dirZ + dirX * rt.strafeSign * 0.35;
    } else if (dist < Math.max(5, profile.preferredRange - 6)) {
      moveX = -dirX * 0.65 + -dirZ * rt.strafeSign * 0.75;
      moveZ = -dirZ * 0.65 + dirX * rt.strafeSign * 0.75;
    } else {
      moveX = -dirZ * rt.strafeSign;
      moveZ = dirX * rt.strafeSign;
    }

    const mLen = Math.hypot(moveX, moveZ) || 1;
    const step = profile.moveSpeed * dt;
    let nextX = Math.max(-arenaLimit, Math.min(arenaLimit, bot.x + (moveX / mLen) * step));
    let nextZ = Math.max(-arenaLimit, Math.min(arenaLimit, bot.z + (moveZ / mLen) * step));

    if (!canMoveTo(nextX, nextZ)) {
      const tryX = Math.max(-arenaLimit, Math.min(arenaLimit, bot.x + (moveX / mLen) * step));
      const tryZ = Math.max(-arenaLimit, Math.min(arenaLimit, bot.z + (moveZ / mLen) * step));
      if (canMoveTo(tryX, bot.z)) {
        nextX = tryX;
        nextZ = bot.z;
      } else if (canMoveTo(bot.x, tryZ)) {
        nextX = bot.x;
        nextZ = tryZ;
      } else {
        const altX = Math.max(-arenaLimit, Math.min(arenaLimit, bot.x + -dirZ * rt.strafeSign * step));
        const altZ = Math.max(-arenaLimit, Math.min(arenaLimit, bot.z + dirX * rt.strafeSign * step));
        if (canMoveTo(altX, altZ)) {
          nextX = altX;
          nextZ = altZ;
        } else {
          nextX = bot.x;
          nextZ = bot.z;
          rt.strafeSign = -rt.strafeSign;
        }
      }
    }

    let nextShotsFired = bot.shotsFired ?? 0;
    let nextSpawnProtected = bot.spawnProtected;
    let nextSpawnProtectedUntil = bot.spawnProtectedUntil;

    if (losClear && now - rt.lastShotAtMs >= profile.fireIntervalMs) {
      rt.lastShotAtMs = now;
      nextShotsFired += 1;
      // Same rule as real players: firing cancels remaining spawn protection immediately
      nextSpawnProtected = false;
      nextSpawnProtectedUntil = 0;

      const rangeFactor = Math.max(0.45, 1 - dist / (profile.engageRange * 1.45));
      const hitRoll = rng();
      const didHit = hitRoll < profile.accuracy * rangeFactor;
      const isHead = didHit && rng() < profile.headshotChance;
      const damage = isHead ? Math.round(profile.bodyDamage * 1.6) : profile.bodyDamage;
      const spreadMiss = didHit ? 0 : (rng() - 0.5) * 1.8;

      shots.push({
        attackerId: bot.id,
        targetId: nearestEnemy.id,
        weaponIdx: bot.weaponIdx,
        from: { x: nextX, y: 1.48, z: nextZ },
        to: {
          x: nearestEnemy.x + spreadMiss,
          y: isHead ? 1.72 : 1.25 + (didHit ? 0 : (rng() - 0.5) * 0.7),
          z: nearestEnemy.z + spreadMiss,
        },
        hit: didHit,
        damage,
        isHeadshot: isHead,
      });
    }

    if (
      Math.abs(nextX - bot.x) > 0.001 ||
      Math.abs(nextZ - bot.z) > 0.001 ||
      Math.abs(targetYaw - bot.yaw) > 0.01 ||
      nextShotsFired !== (bot.shotsFired ?? 0)
    ) {
      changed = true;
    }

    return {
      ...bot,
      x: nextX,
      z: nextZ,
      yaw: targetYaw,
      pitch: 0,
      shotsFired: nextShotsFired,
      spawnProtected: nextSpawnProtected,
      spawnProtectedUntil: nextSpawnProtectedUntil,
      lastSeen: now,
    };
  });

  if (!changed && shots.length === 0) {
    return { nextRoom: room, changed: false, shots: [] };
  }
  return {
    nextRoom: {
      ...room,
      players: nextPlayers,
    },
    changed: true,
    shots,
  };
}

// ============================================================================
// SHORT GUIDED OFFLINE TUTORIAL (1-2 MIN, STATIC TARGETS, FIRST-RUN AUTO)
// ============================================================================

export const QUICK_TUTORIAL_STORAGE_KEY = 'vanguard_quick_tutorial_done_v1';

export type QuickTutorialStepId = 'move' | 'aim' | 'shoot' | 'reload' | 'switch' | 'slide';

export interface QuickTutorialStep {
  id: QuickTutorialStepId;
  titleFa: string;
  hintFa: string;
  target: number;
  progress: number;
  completed: boolean;
}

export interface QuickTutorialState {
  active: boolean;
  slideIncluded: boolean;
  currentIndex: number;
  completedAll: boolean;
  steps: QuickTutorialStep[];
}

export function getQuickTutorialStepList(slideEnabled: boolean): QuickTutorialStep[] {
  const steps: QuickTutorialStep[] = [
    {
      id: 'move',
      titleFa: 'حرکت در میدان',
      hintFa: 'با کلیدهای WASD یا جوی‌استیک چند قدم حرکت کنید.',
      target: 3.5,
      progress: 0,
      completed: false,
    },
    {
      id: 'aim',
      titleFa: 'نشانه‌گیری دقیق (ADS)',
      hintFa: 'کلیک راست ماوس یا دکمه ADS را بزنید تا دقیق نشانه‌گیری کنید.',
      target: 1,
      progress: 0,
      completed: false,
    },
    {
      id: 'shoot',
      titleFa: 'شلیک به هدف‌های ثابت',
      hintFa: '۳ بار به هدف‌های تمرینی ثابت مقابل خود شلیک کنید.',
      target: 3,
      progress: 0,
      completed: false,
    },
    {
      id: 'reload',
      titleFa: 'ریلود سلاح',
      hintFa: 'کلید R یا دکمه ریلود را بزنید تا خشاب پر شود.',
      target: 1,
      progress: 0,
      completed: false,
    },
    {
      id: 'switch',
      titleFa: 'تعویض سلاح',
      hintFa: 'یکی از اسلات‌های پایین، کلید ۱ تا ۳ یا دکمه «سلاح بعدی» را بزنید.',
      target: 1,
      progress: 0,
      completed: false,
    },
  ];

  if (slideEnabled) {
    steps.push({
      id: 'slide',
      titleFa: 'اسلاید تاکتیکی',
      hintFa: 'حین حرکت، کلید C (یا Ctrl / دکمه اسلاید) را بزنید.',
      target: 1,
      progress: 0,
      completed: false,
    });
  }

  return steps;
}

export function createQuickTutorialState(slideEnabled: boolean): QuickTutorialState {
  return {
    active: true,
    slideIncluded: Boolean(slideEnabled),
    currentIndex: 0,
    completedAll: false,
    steps: getQuickTutorialStepList(Boolean(slideEnabled)),
  };
}

export function advanceQuickTutorial(
  state: QuickTutorialState | null,
  stepId: QuickTutorialStepId,
  amount = 1
): {
  next: QuickTutorialState | null;
  changed: boolean;
  stepCompleted: boolean;
  allCompleted: boolean;
} {
  if (!state || !state.active || state.completedAll || amount <= 0) {
    return { next: state, changed: false, stepCompleted: false, allCompleted: false };
  }
  const cur = state.steps[state.currentIndex];
  if (!cur || cur.id !== stepId || cur.completed) {
    return { next: state, changed: false, stepCompleted: false, allCompleted: false };
  }

  const nextProgress = Math.min(cur.target, cur.progress + amount);
  const doneNow = nextProgress >= cur.target - 1e-4;
  const nextSteps = state.steps.map((s, idx) =>
    idx === state.currentIndex
      ? { ...s, progress: doneNow ? s.target : nextProgress, completed: doneNow }
      : s
  );

  let nextIndex = state.currentIndex;
  let allCompleted = false;
  if (doneNow) {
    if (state.currentIndex + 1 < nextSteps.length) {
      nextIndex = state.currentIndex + 1;
    } else {
      allCompleted = true;
    }
  }

  return {
    next: {
      ...state,
      steps: nextSteps,
      currentIndex: nextIndex,
      completedAll: allCompleted,
    },
    changed: true,
    stepCompleted: doneNow,
    allCompleted,
  };
}

/**
 * Auto-launches the short tutorial ONLY on the user's first offline visit.
 * Never auto-starts inside an online room or after completion/skip is persisted.
 */
export function shouldAutoStartQuickTutorial(
  storedFlag: string | null | undefined,
  isOnlineRoom: boolean
): boolean {
  if (isOnlineRoom) return false;
  return storedFlag !== '1';
}








