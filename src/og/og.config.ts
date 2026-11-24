import { MAP_LIST, WEAPON_CATALOG, type MapDefinition, type MapId, type WeaponCatalogItem, type WeaponId } from '../game/rules';

export const OG_CONFIG_VERSION = 1 as const;

export interface OgEventConfig {
  /** Master enable flag for the OG event entry & banner */
  enabled: boolean;
  /** Event title shown in the banner and intro */
  titleFa: string;
  /** Short nostalgic tagline shown on the OG intro screen */
  subtitleFa: string;
  /** Short badge text shown beside the OG button */
  badgeFa: string;
  /**
   * Optional ISO-8601 end date for the OG event (e.g. '2026-12-31T23:59:59Z').
   * When `null`, the OG event runs with no time limit and no countdown is shown.
   */
  eventEndIso: string | null;
}

export const OG_EVENT_CONFIG: OgEventConfig = {
  enabled: true,
  titleFa: 'ایونت OG',
  subtitleFa: 'برگرد به شروع',
  badgeFa: 'ایونت',
  eventEndIso: null,
};

/**
 * Feature switches active ONLY inside OG mode.
 * `false` = Post-launch / modern feature disabled in OG.
 * `true`  = Classic / original feature kept enabled in OG (or uncertain feature defaulted ON for user decision).
 */
export interface OgFeatureFlags {
  // --- Post-launch features (OFF in OG) ---
  /** UI جدید (Alpha) — در OG همیشه خاموش است و رابط قدیمی اجباری می‌شود */
  uiV2: boolean;
  /** سیستم اسپین، اسپین رایگان روزانه و جوایز اسپین کیل/برد */
  spinSystem: boolean;
  /** اسکین‌های سلاح، کلکسیون، افکت‌ها و ایموت‌های اسکین */
  skinsAndCollection: boolean;
  /** بخش کد ردیم در تنظیمات */
  redeemCodes: boolean;
  /** Aim Assist پیشرفته نرم (۰ تا ۱۰۰٪، Stage 2) */
  softAimAssist: boolean;
  /** اسلاید تاکتیکی (Stage 4) */
  tacticalSlide: boolean;
  /** حالت راندی تیمی (COD 1v1 / 2v2) — در OG آنلاین با mode='og' کلاسیک اجرا می‌شود */
  teamRoundMode: boolean;
  /** چت صوتی WebRTC */
  voiceChat: boolean;
  /** فید کشتار ساختاریافته (Kill Feed) */
  killFeed: boolean;
  /** شمارش معکوس ۳ ثانیه‌ای راند */
  roundCountdown: boolean;
  /** محافظت ۲ ثانیه‌ای پس از ری‌اسپاون */
  spawnProtection: boolean;
  /** تماشای هم‌تیمی پس از مرگ */
  teammateSpectate: boolean;
  /** بیلبوردهای تبلیغاتی دیواری در نقشه‌ها */
  adBillboards: boolean;
  /** انیمیشن‌ها و افکت‌های جدید (Stages 1-5، ایموت و افکت‌های جدید) */
  newAnimationsAndFx: boolean;
  /** نمایش پینگ HUD، تنظیمات پیشرفتهٔ لابی، رأی‌گیری نقشه، پینگ/پیام سریع تیمی و پر کردن با بات */
  pingHudAndAdvancedLobby: boolean;
  /** نقشهٔ دوئل ۱ به ۱ (duel - Stage 3) */
  duel1v1Map: boolean;

  // --- Uncertain early-evolution features (DEFAULT ON so user can decide) ---
  /** [نامشخص → پیش‌فرض روشن] انتخاب ۳ سلاح همراه (لوداوت) — اگر خاموش شود روی ۳ سلاح پایه قفل می‌شود */
  customLoadout: boolean;
  /** [نامشخص → پیش‌فرض روشن] ۴ سلاح توسعه‌یافتهٔ بعدی (Katana, M249, Deagle, RPG) در کنار ۶ سلاح پایه */
  expandedWeapons: boolean;
  /** [نامشخص → پیش‌فرض روشن] صدای هیت‌مارکر (Hit Sound) هنگام اصابت تیر */
  hitSound: boolean;
  /** [نامشخص → پیش‌فرض روشن] خم‌شدن هوشمند کنار دیوار (Auto Corner Lean) */
  autoCornerLean: boolean;
  /** [نامشخص → پیش‌فرض روشن] ویرایشگر جابه‌جایی دکمه‌های لمسی */
  customTouchLayoutEditor: boolean;
}

/**
 * Default OG feature flags.
 * New/post-launch systems are OFF (`false`); classic core systems and uncertain early features default ON (`true`).
 */
export const OG_FEATURE_FLAGS: Readonly<OgFeatureFlags> = Object.freeze({
  // Definitely post-launch -> OFF in OG
  uiV2: false,
  spinSystem: false,
  skinsAndCollection: false,
  redeemCodes: false,
  softAimAssist: false,
  tacticalSlide: false,
  teamRoundMode: false,
  voiceChat: false,
  killFeed: false,
  roundCountdown: false,
  spawnProtection: false,
  teammateSpectate: false,
  adBillboards: false,
  newAnimationsAndFx: false,
  pingHudAndAdvancedLobby: false,
  duel1v1Map: false,

  // Uncertain whether Day-1 or early update -> DEFAULT ON (`true`) for user confirmation
  customLoadout: true,
  expandedWeapons: true,
  hitSound: true,
  autoCornerLean: true,
  customTouchLayoutEditor: true,
});

/** Explicit list of keys that were uncertain without git history (kept ON by default). */
export const OG_UNCERTAIN_FLAG_KEYS: readonly (keyof OgFeatureFlags)[] = [
  'customLoadout',
  'expandedWeapons',
  'hitSound',
  'autoCornerLean',
  'customTouchLayoutEditor',
];

export const OG_CLASSIC_MAPS: readonly MapId[] = ['warehouse', 'docks', 'outpost'];

export const OG_BASE_WEAPONS: readonly WeaponId[] = [
  'ak47',
  'm4a1',
  'sniper',
  'mp5',
  'shotgun',
  'pistol',
];

export const OG_CLASSIC_LOADOUT: readonly WeaponId[] = ['ak47', 'sniper', 'pistol'];

/** Returns all features enabled when in Normal mode, or OG_FEATURE_FLAGS when in OG mode. */
export function resolveEffectiveFeatures(
  isOgMode: boolean,
  ogFlags: Readonly<OgFeatureFlags> = OG_FEATURE_FLAGS
): OgFeatureFlags {
  if (!isOgMode) {
    return {
      uiV2: true,
      spinSystem: true,
      skinsAndCollection: true,
      redeemCodes: true,
      softAimAssist: true,
      tacticalSlide: true,
      teamRoundMode: true,
      voiceChat: true,
      killFeed: true,
      roundCountdown: true,
      spawnProtection: true,
      teammateSpectate: true,
      adBillboards: true,
      newAnimationsAndFx: true,
      pingHudAndAdvancedLobby: true,
      duel1v1Map: true,
      customLoadout: true,
      expandedWeapons: true,
      hitSound: true,
      autoCornerLean: true,
      customTouchLayoutEditor: true,
    };
  }
  return {
    ...ogFlags,
    // OG ALWAYS forces Legacy UI regardless of any override
    uiV2: false,
  };
}

export function getOgAllowedMaps(
  isOgMode: boolean,
  ogFlags: Readonly<OgFeatureFlags> = OG_FEATURE_FLAGS
): MapDefinition[] {
  if (!isOgMode || ogFlags.duel1v1Map) {
    return MAP_LIST;
  }
  return MAP_LIST.filter((m) => m.id !== 'duel');
}

export function getOgAllowedWeapons(
  isOgMode: boolean,
  ogFlags: Readonly<OgFeatureFlags> = OG_FEATURE_FLAGS
): WeaponCatalogItem[] {
  if (!isOgMode || ogFlags.expandedWeapons) {
    return WEAPON_CATALOG;
  }
  const baseSet = new Set<WeaponId>(OG_BASE_WEAPONS);
  return WEAPON_CATALOG.filter((w) => baseSet.has(w.id));
}

export interface OgCountdownParts {
  active: boolean;
  expired: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  labelFa: string;
}

/**
 * Formats an optional ISO event end timestamp into a Persian countdown string.
 * Returns `null` if `eventEndIso` is null/invalid (no time limit).
 */
export function formatOgCountdownFa(
  eventEndIso: string | null | undefined,
  nowMs = Date.now()
): OgCountdownParts | null {
  if (!eventEndIso || typeof eventEndIso !== 'string') return null;
  const endMs = Date.parse(eventEndIso);
  if (!Number.isFinite(endMs)) return null;

  const diffMs = endMs - nowMs;
  if (diffMs <= 0) {
    return {
      active: false,
      expired: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      labelFa: 'پایان ایونت',
    };
  }

  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const labelFa = days > 0 ? `${days} روز و ${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`;

  return {
    active: true,
    expired: false,
    days,
    hours,
    minutes,
    seconds,
    labelFa,
  };
}
