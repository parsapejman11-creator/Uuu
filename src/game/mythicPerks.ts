/**
 * Dedicated Configuration & Pure Logic for Mythic M249 SAW ("Tempest Aegis") Perks & Emote
 *
 * All gameplay-tuning numbers live here so they can be tweaked easily in one place.
 * IMPORTANT:
 * - Perks apply ONLY when the player is holding M249 SAW ('lmg'), has 'm249_tempest_aegis' equipped,
 *   AND (in online rooms) the Host has `mythicPerksAllowed !== false`.
 * - ZERO changes to damage, fire rate, magazine size (100), bullet spread, reload duration,
 *   hitboxes, or movement speed.
 * - Hit registration stays 100% Host-authoritative; perk values are NEVER transmitted over PeerJS.
 */

export const MYTHIC_M249_WEAPON_ID = 'lmg' as const;
export const MYTHIC_M249_SKIN_ID = 'm249_tempest_aegis' as const;
export const MYTHIC_M249_EMOTE_ID = 'mythic_tempest_dance' as const;

export const MYTHIC_SHOTGUN_WEAPON_ID = 'shotgun' as const;
export const MYTHIC_SHOTGUN_SKIN_ID = 'spas12_eclipse_breacher' as const;
export const MYTHIC_SHOTGUN_EMOTE_ID = 'mythic_eclipse_dance' as const;

export const ALLOWED_EMOTE_IDS: ReadonlySet<string> = new Set([
  MYTHIC_M249_EMOTE_ID,
  MYTHIC_SHOTGUN_EMOTE_ID,
]);

export interface MythicPerksConfig {
  /** Weapon ID eligible for Mythic perks */
  weaponId: typeof MYTHIC_M249_WEAPON_ID;
  /** Skin ID that activates the Mythic perks */
  skinId: typeof MYTHIC_M249_SKIN_ID;
  /** +15% Aim Assist strength relative to the player's own setting (capped at 100%) */
  aimAssistBonusPct: number;
  /** Maximum Aim Assist strength ceiling */
  aimAssistMaxCap: number;
  /** 10% reduction in visual camera recoil kick & firing shake */
  recoilKickReductionPct: number;
  /** Extra ADS transition & aim smoothing responsiveness (visual camera only) */
  adsSmoothnessBonusPct: number;
  /** Gentle reduction in ADS breathing sway amplitude (visual camera only) */
  adsSwayReductionPct: number;
  /** Exclusive emote duration in seconds */
  emoteDurationSec: number;
  /** Cooldown between emotes in seconds */
  emoteCooldownSec: number;
}

export const MYTHIC_M249_PERKS: Readonly<MythicPerksConfig> = Object.freeze({
  weaponId: MYTHIC_M249_WEAPON_ID,
  skinId: MYTHIC_M249_SKIN_ID,
  aimAssistBonusPct: 15,
  aimAssistMaxCap: 100,
  recoilKickReductionPct: 10,
  adsSmoothnessBonusPct: 18,
  adsSwayReductionPct: 15,
  emoteDurationSec: 3.0,
  emoteCooldownSec: 5.0,
});

export interface MythicShotgunPerksConfig {
  /** Weapon ID eligible for Mythic shotgun perks */
  weaponId: typeof MYTHIC_SHOTGUN_WEAPON_ID;
  /** Skin ID that activates Mythic shotgun perks */
  skinId: typeof MYTHIC_SHOTGUN_SKIN_ID;
  /** +1 extra shell in magazine (8 -> 9) */
  extraMagShells: number;
  /** +15% Aim Assist strength relative to the player's own setting (capped at 100%) */
  aimAssistBonusPct: number;
  /** Maximum Aim Assist strength ceiling */
  aimAssistMaxCap: number;
  /** ~8% faster reload speed (duration multiplier 0.92) */
  reloadSpeedBonusPct: number;
  reloadDurationMultiplier: number;
  /** Exclusive emote duration in seconds */
  emoteDurationSec: number;
  /** Cooldown between emotes in seconds */
  emoteCooldownSec: number;
}

export const MYTHIC_SHOTGUN_PERKS: Readonly<MythicShotgunPerksConfig> = Object.freeze({
  weaponId: MYTHIC_SHOTGUN_WEAPON_ID,
  skinId: MYTHIC_SHOTGUN_SKIN_ID,
  extraMagShells: 1,
  aimAssistBonusPct: 15,
  aimAssistMaxCap: 100,
  reloadSpeedBonusPct: 8,
  reloadDurationMultiplier: 0.92,
  emoteDurationSec: 3.0,
  emoteCooldownSec: 5.0,
});

export const MYTHIC_PERK_SUMMARY_FA: readonly string[] = Object.freeze([
  `کمک نشانه‌گیری (Aim Assist): +${MYTHIC_M249_PERKS.aimAssistBonusPct}٪ قوی‌تر از تنظیم شما (سقف ${MYTHIC_M249_PERKS.aimAssistMaxCap}٪، فقط دشمنان قابل دیدن)`,
  `کنترل دوربین: ${MYTHIC_M249_PERKS.recoilKickReductionPct}٪ لرزش و پرش دوربین کمتر هنگام شلیک + نشانه‌گیری نرم‌تر`,
  'بدون هیچ تغییری در دمیج، سرعت شلیک، خشاب ۱۰۰ تایی، پخش گلوله، ریلود، هیتباکس یا سرعت حرکت',
]);

export const MYTHIC_SHOTGUN_PERK_SUMMARY_FA: readonly string[] = Object.freeze([
  `ظرفیت خشاب شاتگان: +${MYTHIC_SHOTGUN_PERKS.extraMagShells} فشنگ بیشتر (۸ ← ۹ فشنگ)`,
  `کمک نشانه‌گیری (Aim Assist): +${MYTHIC_SHOTGUN_PERKS.aimAssistBonusPct}٪ قوی‌تر از تنظیم شما (سقف ${MYTHIC_SHOTGUN_PERKS.aimAssistMaxCap}٪، فقط دشمنان قابل دیدن)`,
  `سرعت ریلود: حدود ${MYTHIC_SHOTGUN_PERKS.reloadSpeedBonusPct}٪ سریع‌تر هنگام تجهیز اسکین اکلیپس بریچر`,
  'بدون هیچ تغییری در دمیج، تعداد ساچمه، پخش گلوله، نرخ شلیک، هیتباکس یا سرعت حرکت · قابل کنترل توسط میزبان اتاق',
]);

export function sanitizeEmoteId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  return ALLOWED_EMOTE_IDS.has(raw) ? raw : null;
}

/**
 * Determines whether Mythic M249 gameplay perks are currently active for the local player.
 */
export function isMythicM249PerksActive(params: {
  weaponId: string;
  equippedM249SkinId?: string | null;
  isOnline: boolean;
  roomMythicPerksAllowed?: boolean;
}): boolean {
  if (params.weaponId !== MYTHIC_M249_PERKS.weaponId) return false;
  if (params.equippedM249SkinId !== MYTHIC_M249_PERKS.skinId) return false;
  if (params.isOnline && params.roomMythicPerksAllowed === false) return false;
  return true;
}

/**
 * Determines whether Mythic SPAS-12 ("Eclipse Breacher") gameplay perks are currently active.
 * Optional weaponId: when omitted, checks whether SPAS-12 perks are permitted for mag sizing.
 */
export function isMythicShotgunPerksActive(params: {
  weaponId?: string;
  equippedShotgunSkinId?: string | null;
  isOnline: boolean;
  roomMythicPerksAllowed?: boolean;
}): boolean {
  if (params.weaponId !== undefined && params.weaponId !== MYTHIC_SHOTGUN_PERKS.weaponId) return false;
  if (params.equippedShotgunSkinId !== MYTHIC_SHOTGUN_PERKS.skinId) return false;
  if (params.isOnline && params.roomMythicPerksAllowed === false) return false;
  return true;
}

/**
 * Effective SPAS-12 magazine capacity (+1 shell ONLY when Mythic SPAS-12 perks are active).
 */
export function getMythicShotgunMagSize(baseMagSize: number, mythicShotgunActive: boolean): number {
  const safeBase = Math.max(1, Math.round(baseMagSize));
  return mythicShotgunActive ? safeBase + MYTHIC_SHOTGUN_PERKS.extraMagShells : safeBase;
}

/**
 * Effective SPAS-12 reload duration (~8% faster ONLY when Mythic SPAS-12 perks are active).
 */
export function getMythicShotgunReloadDuration(baseReloadSec: number, mythicShotgunActive: boolean): number {
  if (!Number.isFinite(baseReloadSec) || baseReloadSec <= 0) return 0;
  return mythicShotgunActive
    ? Number((baseReloadSec * MYTHIC_SHOTGUN_PERKS.reloadDurationMultiplier).toFixed(3))
    : baseReloadSec;
}

/**
 * Computes effective Aim Assist strength with the +15% Mythic bonus (capped at 100%).
 * - Respects Host's `roomAimAssistAllowed` toggle (returns 0 if disabled).
 * - Respects player's own 0% setting (0 * 1.15 === 0).
 */
export function computeEffectiveAimAssistWithMythicPerk(params: {
  baseAimAssistStrength: number;
  roomAimAssistAllowed?: boolean;
  mythicPerksActive: boolean;
}): number {
  if (params.roomAimAssistAllowed === false) return 0;
  const clampedBase = Number.isFinite(params.baseAimAssistStrength)
    ? Math.max(0, Math.min(100, params.baseAimAssistStrength))
    : 0;
  if (clampedBase <= 0) return 0;
  if (!params.mythicPerksActive) return Math.round(clampedBase);
  const boosted = (clampedBase * (100 + MYTHIC_M249_PERKS.aimAssistBonusPct)) / 100;
  return Math.min(MYTHIC_M249_PERKS.aimAssistMaxCap, Math.round(boosted));
}

/**
 * Camera recoil kick & firing shake multiplier (0.90 when Mythic M249 perks active, 1.0 otherwise).
 */
export function getMythicCameraRecoilMultiplier(mythicPerksActive: boolean): number {
  if (!mythicPerksActive) return 1.0;
  return Math.max(0.5, 1 - MYTHIC_M249_PERKS.recoilKickReductionPct / 100);
}

/**
 * ADS camera interpolation smoothness multiplier (1.18 when active, 1.0 otherwise).
 */
export function getMythicAdsSmoothMultiplier(mythicPerksActive: boolean): number {
  if (!mythicPerksActive) return 1.0;
  return 1 + MYTHIC_M249_PERKS.adsSmoothnessBonusPct / 100;
}

/**
 * ADS idle sway damping multiplier (0.85 when active, 1.0 otherwise).
 */
export function getMythicAdsSwayMultiplier(mythicPerksActive: boolean): number {
  if (!mythicPerksActive) return 1.0;
  return Math.max(0.5, 1 - MYTHIC_M249_PERKS.adsSwayReductionPct / 100);
}

/**
 * Lists lobby players who currently have any Mythic skin (M249 or SPAS-12) equipped
 * for transparent lobby notices.
 */
export function getLobbyMythicHolderNames(
  players: ReadonlyArray<{ name: string; cosmetics?: { m249?: string; sg?: string } }>
): string[] {
  const names: string[] = [];
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    if (
      p.cosmetics?.m249 === MYTHIC_M249_SKIN_ID ||
      p.cosmetics?.sg === MYTHIC_SHOTGUN_SKIN_ID
    ) {
      names.push(p.name);
    }
  }
  return names;
}

export function getLobbyMythicSummary(
  players: ReadonlyArray<{ name: string; cosmetics?: { m249?: string; sg?: string } }>
): {
  holderNames: string[];
  allHolders: string[];
  m249Holders: string[];
  shotgunHolders: string[];
  hasM249Mythic: boolean;
  hasShotgunMythic: boolean;
} {
  const holderNames: string[] = [];
  const m249Holders: string[] = [];
  const shotgunHolders: string[] = [];
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const hasM249 = p.cosmetics?.m249 === MYTHIC_M249_SKIN_ID;
    const hasSg = p.cosmetics?.sg === MYTHIC_SHOTGUN_SKIN_ID;
    if (hasM249) m249Holders.push(p.name);
    if (hasSg) shotgunHolders.push(p.name);
    if (hasM249 || hasSg) holderNames.push(p.name);
  }
  return {
    holderNames,
    allHolders: holderNames,
    m249Holders,
    shotgunHolders,
    hasM249Mythic: m249Holders.length > 0,
    hasShotgunMythic: shotgunHolders.length > 0,
  };
}
