/**
 * Cosmetic Lucky Spin System & Allowlist ("Inferno Reaper" Collection)
 * 100% cosmetic-only (zero damage, recoil, hitbox, or balance impact).
 * Pure deterministic/unit-testable module with cryptographic RNG and versioned persistence.
 */

import {
  DEFAULT_SPIN_BANNER_ID,
  SPIN_BANNERS,
  SpinBannerConfig,
  SpinBannerId,
  getSpinBannerConfig,
} from './spins.config';

export type CosmeticRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export const COSMETIC_RARITY_ORDER: readonly CosmeticRarity[] = [
  'common',
  'rare',
  'epic',
  'legendary',
  'mythic',
];

export type CosmeticCategory =
  | 'ak47_skin'
  | 'sniper_skin'
  | 'm249_skin'
  | 'tracer_color'
  | 'muzzle_flash'
  | 'crosshair_color'
  | 'name_frame'
  | 'name_badge'
  | 'kill_icon';

export interface CosmeticItem {
  id: string;
  nameFa: string;
  nameEn: string;
  category: CosmeticCategory;
  rarity: CosmeticRarity;
  /** Primary display hex color */
  colorHex: string;
  /** Optional secondary accent hex color */
  accentHex?: string;
  /** Numeric hex for Three.js materials */
  colorInt: number;
  /** Optional glyph / symbol for badges & kill feed icons */
  symbol?: string;
  /** Short Persian description for preview */
  descriptionFa: string;
}

/** Compact cosmetic payload synced over PeerJS (strictly allowlist-validated) */
export interface OnlineSyncedCosmetics {
  /** Equipped AK-47 skin ID */
  ak?: string;
  /** Equipped AWM Sniper skin ID */
  sn?: string;
  /** Equipped M249 SAW skin ID */
  m249?: string;
  /** Equipped tracer color ID */
  tr?: string;
  /** Equipped muzzle flash color ID */
  mf?: string;
  /** Equipped player name frame ID */
  nf?: string;
  /** Equipped player name badge ID */
  nb?: string;
  /** Equipped kill feed icon ID */
  ki?: string;
}

export interface EquippedCosmetics {
  ak47_skin: string | null;
  sniper_skin: string | null;
  m249_skin: string | null;
  tracer_color: string | null;
  muzzle_flash: string | null;
  crosshair_color: string | null;
  name_frame: string | null;
  name_badge: string | null;
  kill_icon: string | null;
}

export interface CosmeticsState {
  version: number;
  spins: number;
  shards: number;
  /** Number of consecutive spins without hitting Legendary on AK-47 banner (0..20) */
  pityCounter: number;
  /** Per-banner consecutive non-Legendary spin count (extensible for multi-spin banners) */
  pityByBanner?: Record<string, number>;
  totalSpins: number;
  /** Cumulative kills toward next +1 spin reward (0..24) */
  killProgress: number;
  totalKillsTracked: number;
  totalWinsTracked: number;
  /** Last calendar date (YYYY-MM-DD) when daily free spin was claimed */
  lastDailyClaimDate: string | null;
  ownedIds: string[];
  equipped: EquippedCosmetics;
}

export interface SpinOutcome {
  bannerId: SpinBannerId;
  item: CosmeticItem;
  isDuplicate: boolean;
  wasPityGuaranteed: boolean;
  shardsGained: number;
  bonusSpinsFromShards: number;
  nextState: CosmeticsState;
}

export const COSMETICS_STORAGE_KEY = 'bodycam_cosmetics_v1';
export const COSMETICS_STATE_VERSION = 1;
export const INITIAL_FREE_SPINS = 5;
export const SHARDS_PER_FREE_SPIN = 5;
export const PITY_GUARANTEE_THRESHOLD = 20;
export const KILLS_PER_FREE_SPIN = 25;
export const LEGENDARY_AK47_ID = 'ak_inferno_reaper';
export const LEGENDARY_SNIPER_ID = 'awm_void_piercer';
export const MYTHIC_M249_ID = 'm249_tempest_aegis';

export const RARITY_META: Record<
  CosmeticRarity,
  { labelFa: string; labelEn: string; colorHex: string; bgHex: string; borderHex: string; chancePct: number }
> = {
  mythic: {
    labelFa: 'میتیک',
    labelEn: 'MYTHIC',
    colorHex: '#ff2a55',
    bgHex: 'rgba(255, 42, 85, 0.18)',
    borderHex: 'rgba(255, 77, 118, 0.78)',
    chancePct: 0.01,
  },
  legendary: {
    labelFa: 'لجندری',
    labelEn: 'LEGENDARY',
    colorHex: '#f59e0b',
    bgHex: 'rgba(245, 158, 11, 0.16)',
    borderHex: 'rgba(245, 158, 11, 0.65)',
    chancePct: 2,
  },
  epic: {
    labelFa: 'اپیک',
    labelEn: 'EPIC',
    colorHex: '#a855f7',
    bgHex: 'rgba(168, 85, 247, 0.15)',
    borderHex: 'rgba(168, 85, 247, 0.55)',
    chancePct: 8,
  },
  rare: {
    labelFa: 'کمیاب',
    labelEn: 'RARE',
    colorHex: '#38bdf8',
    bgHex: 'rgba(56, 189, 248, 0.14)',
    borderHex: 'rgba(56, 189, 248, 0.5)',
    chancePct: 25,
  },
  common: {
    labelFa: 'معمولی',
    labelEn: 'COMMON',
    colorHex: '#94a3b8',
    bgHex: 'rgba(148, 163, 184, 0.12)',
    borderHex: 'rgba(148, 163, 184, 0.35)',
    chancePct: 65,
  },
};

export const CATEGORY_LABELS_FA: Record<CosmeticCategory, string> = {
  ak47_skin: 'اسکین AK-47',
  sniper_skin: 'اسکین AWM اسنایپ',
  m249_skin: 'اسکین M249 تیربار',
  tracer_color: 'رنگ ردگلوله',
  muzzle_flash: 'رنگ شعلهٔ دهانه',
  crosshair_color: 'رنگ کراس‌هیر',
  name_frame: 'قاب اسم بازیکن',
  name_badge: 'نشان کنار اسم',
  kill_icon: 'آیکون Kill Feed',
};

export const COSMETIC_CATEGORY_ORDER: CosmeticCategory[] = [
  'm249_skin',
  'ak47_skin',
  'sniper_skin',
  'tracer_color',
  'muzzle_flash',
  'crosshair_color',
  'name_frame',
  'name_badge',
  'kill_icon',
];

/**
 * Fixed static catalog — ONLY ONE weapon skin exists ("ak_inferno_reaper").
 * All other items are purely visual tracers, flashes, crosshairs, frames, badges, and kill icons.
 */
export const COSMETIC_ITEMS: readonly CosmeticItem[] = [
  // === LEGENDARY (2%) — The sole weapon skin in the Spin ===
  {
    id: LEGENDARY_AK47_ID,
    nameFa: 'AK-47 اینفرنو ریپر',
    nameEn: 'Inferno Reaper',
    category: 'ak47_skin',
    rarity: 'legendary',
    colorHex: '#f59e0b',
    accentHex: '#ff5a00',
    colorInt: 0xff7a1a,
    symbol: '✦',
    descriptionFa:
      'بدنه مشکی با حکاکی طلایی، رگه‌های نورانی نارنجی متحرک، جرقه‌های شلیک، شعله و ردگلوله نارنجی-طلایی، افکت و صدای کشتن ویژه.',
  },

  // === EPIC (8% total — 4 items, 2% each) ===
  {
    id: 'tracer_crimson',
    nameFa: 'ردگلوله یاقوتی',
    nameEn: 'Crimson Tracer',
    category: 'tracer_color',
    rarity: 'epic',
    colorHex: '#ff3b5c',
    accentHex: '#ff8fa3',
    colorInt: 0xff3b5c,
    descriptionFa: 'مسیر گلوله با رنگ سرخ یاقوتی درخشان در آفلاین و آنلاین.',
  },
  {
    id: 'flash_violet',
    nameFa: 'شعلهٔ آذرخش بنفش',
    nameEn: 'Violet Arc Flash',
    category: 'muzzle_flash',
    rarity: 'epic',
    colorHex: '#c084fc',
    accentHex: '#e9d5ff',
    colorInt: 0xc084fc,
    descriptionFa: 'شعلهٔ دهانه سلاح با طیف بنفش الکترونیک.',
  },
  {
    id: 'frame_obsidian_gold',
    nameFa: 'قاب مشکی طلایی',
    nameEn: 'Obsidian Gold Frame',
    category: 'name_frame',
    rarity: 'epic',
    colorHex: '#f59e0b',
    accentHex: '#18181b',
    colorInt: 0xf59e0b,
    descriptionFa: 'قاب حکاکی‌شده مشکی و طلایی دور اسم شما در لابی، جدول امتیازات و بالای سر.',
  },
  {
    id: 'kicon_ember',
    nameFa: 'آیکون شعلهٔ نبرد',
    nameEn: 'Ember Crest',
    category: 'kill_icon',
    rarity: 'epic',
    colorHex: '#fb923c',
    accentHex: '#fde68a',
    colorInt: 0xfb923c,
    symbol: '❖',
    descriptionFa: 'آیکون درخشان اختصاصی در کنار نام سلاح در Kill Feed.',
  },

  // === RARE (25% total — 5 items, 5% each) ===
  {
    id: 'tracer_cyan',
    nameFa: 'ردگلوله پلاسما آبی',
    nameEn: 'Plasma Cyan Tracer',
    category: 'tracer_color',
    rarity: 'rare',
    colorHex: '#22d3ee',
    accentHex: '#a5f3fc',
    colorInt: 0x22d3ee,
    descriptionFa: 'ردگلوله آبی پلاسمایی واضح و خوانا در همهٔ نقشه‌ها.',
  },
  {
    id: 'flash_cobalt',
    nameFa: 'شعلهٔ کبالت',
    nameEn: 'Cobalt Flash',
    category: 'muzzle_flash',
    rarity: 'rare',
    colorHex: '#38bdf8',
    accentHex: '#bae6fd',
    colorInt: 0x38bdf8,
    descriptionFa: 'شعلهٔ دهانه سلاح به رنگ آبی کبالت شفاف.',
  },
  {
    id: 'ch_gold',
    nameFa: 'کراس‌هیر طلایی',
    nameEn: 'Amber Gold Crosshair',
    category: 'crosshair_color',
    rarity: 'rare',
    colorHex: '#fbbf24',
    colorInt: 0xfbbf24,
    descriptionFa: 'نشانهٔ وسط صفحه به رنگ طلایی با کنتراست بالا.',
  },
  {
    id: 'frame_cobalt_edge',
    nameFa: 'قاب لبه کبالت',
    nameEn: 'Cobalt Edge Frame',
    category: 'name_frame',
    rarity: 'rare',
    colorHex: '#38bdf8',
    accentHex: '#0c1929',
    colorInt: 0x38bdf8,
    descriptionFa: 'قاب تاکتیکی آبی دور اسم بازیکن در جدول امتیازات و لابی.',
  },
  {
    id: 'badge_crown',
    nameFa: 'نشان تاج فرمانده',
    nameEn: 'Commander Crown',
    category: 'name_badge',
    rarity: 'rare',
    colorHex: '#fbbf24',
    colorInt: 0xfbbf24,
    symbol: '♛',
    descriptionFa: 'نشان تاج در کنار اسم شما برای همهٔ بازیکن‌ها.',
  },

  // === COMMON (65% total — 10 items, 6.5% each) ===
  {
    id: 'tracer_emerald',
    nameFa: 'ردگلوله زمردی',
    nameEn: 'Emerald Tracer',
    category: 'tracer_color',
    rarity: 'common',
    colorHex: '#34d399',
    colorInt: 0x34d399,
    descriptionFa: 'ردگلوله سبز زمردی تمیز.',
  },
  {
    id: 'tracer_amber',
    nameFa: 'ردگلوله کهربایی',
    nameEn: 'Amber Tracer',
    category: 'tracer_color',
    rarity: 'common',
    colorHex: '#f59e0b',
    colorInt: 0xf59e0b,
    descriptionFa: 'ردگلوله نارنجی-کهربایی گرم.',
  },
  {
    id: 'flash_crimson',
    nameFa: 'شعلهٔ اخگر سرخ',
    nameEn: 'Crimson Spark Flash',
    category: 'muzzle_flash',
    rarity: 'common',
    colorHex: '#fb7185',
    colorInt: 0xfb7185,
    descriptionFa: 'شعلهٔ دهانه با ته‌رنگ اخگر سرخ.',
  },
  {
    id: 'flash_solar',
    nameFa: 'شعلهٔ خورشیدی',
    nameEn: 'Solar Flash',
    category: 'muzzle_flash',
    rarity: 'common',
    colorHex: '#facc15',
    colorInt: 0xfacc15,
    descriptionFa: 'شعلهٔ دهانه طلایی روشن.',
  },
  {
    id: 'ch_cyan',
    nameFa: 'کراس‌هیر فیروزه‌ای',
    nameEn: 'Cyan Crosshair',
    category: 'crosshair_color',
    rarity: 'common',
    colorHex: '#22d3ee',
    colorInt: 0x22d3ee,
    descriptionFa: 'نشانهٔ وسط صفحه فیروزه‌ای واضح.',
  },
  {
    id: 'ch_lime',
    nameFa: 'کراس‌هیر سبز تاکتیکی',
    nameEn: 'Tactical Lime Crosshair',
    category: 'crosshair_color',
    rarity: 'common',
    colorHex: '#4ade80',
    colorInt: 0x4ade80,
    descriptionFa: 'نشانهٔ وسط صفحه به رنگ سبز نوری.',
  },
  {
    id: 'ch_rose',
    nameFa: 'کراس‌هیر سرخ',
    nameEn: 'Rose Crosshair',
    category: 'crosshair_color',
    rarity: 'common',
    colorHex: '#fb7185',
    colorInt: 0xfb7185,
    descriptionFa: 'نشانهٔ وسط صفحه به رنگ سرخ روشن.',
  },
  {
    id: 'frame_steel_trim',
    nameFa: 'قاب فولادی',
    nameEn: 'Brushed Steel Frame',
    category: 'name_frame',
    rarity: 'common',
    colorHex: '#cbd5e1',
    accentHex: '#1e293b',
    colorInt: 0xcbd5e1,
    descriptionFa: 'قاب مینیمال نقره‌ای-فولادی دور اسم بازیکن.',
  },
  {
    id: 'badge_bolt',
    nameFa: 'نشان صاعقه',
    nameEn: 'Strike Bolt',
    category: 'name_badge',
    rarity: 'common',
    colorHex: '#38bdf8',
    colorInt: 0x38bdf8,
    symbol: '⚡',
    descriptionFa: 'نشان صاعقه کنار اسم شما.',
  },
  {
    id: 'kicon_blade',
    nameFa: 'آیکون تیغ تاکتیکی',
    nameEn: 'Tactical Blade Icon',
    category: 'kill_icon',
    rarity: 'common',
    colorHex: '#e2e8f0',
    colorInt: 0xe2e8f0,
    symbol: '⚔',
    descriptionFa: 'آیکون شمشیر متقاطع در Kill Feed.',
  },

  // =========================================================================
  // SNIPER SPIN ("Void Piercer") COLLECTION — 1 Legendary Sniper Skin + 13 Cosmetics
  // =========================================================================
  {
    id: LEGENDARY_SNIPER_ID,
    nameFa: 'AWM ووید پیرسر',
    nameEn: 'Void Piercer',
    category: 'sniper_skin',
    rarity: 'legendary',
    colorHex: '#22d3ee',
    accentHex: '#a855f7',
    colorInt: 0x22d3ee,
    symbol: '◈',
    descriptionFa:
      'بدنه مات مشکی و سفید با خطوط انرژی فیروزه‌ای-بنفش متحرک، هستهٔ انرژی پالس‌دار، دوربین هولوگرافیک فضایی، پرتو و موج گرانشی کشتن.',
  },

  // Sniper Spin — EPIC (3 items)
  {
    id: 'tracer_void_prism',
    nameFa: 'ردگلوله منشور فضایی',
    nameEn: 'Void Prism Tracer',
    category: 'tracer_color',
    rarity: 'epic',
    colorHex: '#38e8ff',
    accentHex: '#a855f7',
    colorInt: 0x38e8ff,
    descriptionFa: 'ردگلوله باریک با طیف نورانی فیروزه‌ای-بنفش در آفلاین و آنلاین.',
  },
  {
    id: 'flash_plasma_nova',
    nameFa: 'شعلهٔ نوا پلاسما',
    nameEn: 'Plasma Nova Flash',
    category: 'muzzle_flash',
    rarity: 'epic',
    colorHex: '#a855f7',
    accentHex: '#22d3ee',
    colorInt: 0xa855f7,
    descriptionFa: 'شعلهٔ دهانه پلاسمایی با درخشش بنفش و فیروزه‌ای.',
  },
  {
    id: 'frame_nebula_glass',
    nameFa: 'قاب سحابی هولوگرافیک',
    nameEn: 'Nebula Glass Frame',
    category: 'name_frame',
    rarity: 'epic',
    colorHex: '#22d3ee',
    accentHex: '#18102c',
    colorInt: 0x22d3ee,
    descriptionFa: 'قاب شیشه‌ای فیروزه‌ای-بنفش دور اسم بازیکن در لابی و جدول امتیازات.',
  },

  // Sniper Spin — RARE (4 items)
  {
    id: 'tracer_astral_indigo',
    nameFa: 'ردگلوله نیلی اختری',
    nameEn: 'Astral Indigo Tracer',
    category: 'tracer_color',
    rarity: 'rare',
    colorHex: '#818cf8',
    accentHex: '#c4b5fd',
    colorInt: 0x818cf8,
    descriptionFa: 'مسیر گلوله نیلی-بنفش شفاف برای تیراندازی دقیق.',
  },
  {
    id: 'flash_ion_pulse',
    nameFa: 'شعلهٔ پالس یونی',
    nameEn: 'Ion Pulse Flash',
    category: 'muzzle_flash',
    rarity: 'rare',
    colorHex: '#06b6d4',
    accentHex: '#cffafe',
    colorInt: 0x06b6d4,
    descriptionFa: 'شعلهٔ دهانه فیروزه‌ای روشن با پالس یونی.',
  },
  {
    id: 'badge_prism_eye',
    nameFa: 'نشان چشم فضایی',
    nameEn: 'Prism Sight Badge',
    category: 'name_badge',
    rarity: 'rare',
    colorHex: '#22d3ee',
    accentHex: '#a855f7',
    colorInt: 0x22d3ee,
    symbol: '◈',
    descriptionFa: 'نشان منشور فضایی کنار نام بازیکن در مسابقه.',
  },
  {
    id: 'kicon_singularity',
    nameFa: 'آیکون تکینگی',
    nameEn: 'Singularity Crest',
    category: 'kill_icon',
    rarity: 'rare',
    colorHex: '#c084fc',
    accentHex: '#22d3ee',
    colorInt: 0xc084fc,
    symbol: '✹',
    descriptionFa: 'آیکون تکینگی درخشان کنار نام سلاح در Kill Feed.',
  },

  // Sniper Spin — COMMON (6 items)
  {
    id: 'tracer_ice_vapor',
    nameFa: 'ردگلوله بخار یخی',
    nameEn: 'Ice Vapor Tracer',
    category: 'tracer_color',
    rarity: 'common',
    colorHex: '#bae6fd',
    colorInt: 0xbae6fd,
    descriptionFa: 'ردگلوله سفید-یخی ظریف و واضح.',
  },
  {
    id: 'flash_arctic_spark',
    nameFa: 'شعلهٔ جرقه قطبی',
    nameEn: 'Arctic Spark Flash',
    category: 'muzzle_flash',
    rarity: 'common',
    colorHex: '#67e8f9',
    colorInt: 0x67e8f9,
    descriptionFa: 'شعلهٔ دهانه یخی ملایم.',
  },
  {
    id: 'ch_violet',
    nameFa: 'کراس‌هیر بنفش فضایی',
    nameEn: 'Cosmic Violet Crosshair',
    category: 'crosshair_color',
    rarity: 'common',
    colorHex: '#c084fc',
    colorInt: 0xc084fc,
    descriptionFa: 'نشانهٔ وسط صفحه بنفش روشن و خوانا.',
  },
  {
    id: 'frame_titanium_white',
    nameFa: 'قاب تیتانیوم سفید',
    nameEn: 'Matte Titanium Frame',
    category: 'name_frame',
    rarity: 'common',
    colorHex: '#e2e8f0',
    accentHex: '#0f172a',
    colorInt: 0xe2e8f0,
    descriptionFa: 'قاب مینیمال سفید-تیتانیوم دور اسم بازیکن.',
  },
  {
    id: 'badge_orbit',
    nameFa: 'نشان مدار',
    nameEn: 'Orbit Ring Badge',
    category: 'name_badge',
    rarity: 'common',
    colorHex: '#a5b4fc',
    colorInt: 0xa5b4fc,
    symbol: '◎',
    descriptionFa: 'نشان دایرهٔ مداری کنار اسم شما.',
  },
  {
    id: 'kicon_crossbeam',
    nameFa: 'آیکون پرتو دقیق',
    nameEn: 'Crossbeam Icon',
    category: 'kill_icon',
    rarity: 'common',
    colorHex: '#67e8f9',
    colorInt: 0x67e8f9,
    symbol: '⊹',
    descriptionFa: 'آیکون هدف دقیق در Kill Feed.',
  },

  // =========================================================================
  // LMG MYTHIC SPIN ("Tempest Aegis") COLLECTION — 1 Mythic M249 Skin + 13 Cosmetics
  // =========================================================================
  {
    id: MYTHIC_M249_ID,
    nameFa: 'M249 تمپست ایجیس',
    nameEn: 'Tempest Aegis',
    category: 'm249_skin',
    rarity: 'mythic',
    colorHex: '#ff2a55',
    accentHex: '#ffffff',
    colorInt: 0xff2a55,
    symbol: '✧',
    descriptionFa:
      'بدنه کرومی-سفید با پنل‌های قرمز و شیشه هولوگرافیک، دریچه‌های داغ‌شونده، شمارنده هولوگرافیک کشتن، تسمه فشنگ نورانی، ریلود سینمایی، افکت موج گرانشی + برق و رقص اختصاصی. (+۱۵٪ Aim Assist و -۱۰٪ لرزش دوربین روی M249)',
  },

  // LMG Spin — EPIC (3 items)
  {
    id: 'tracer_prism_arc',
    nameFa: 'ردگلوله قوس منشوری',
    nameEn: 'Prism Arc Tracer',
    category: 'tracer_color',
    rarity: 'epic',
    colorHex: '#ff4d7d',
    accentHex: '#38e8ff',
    colorInt: 0xff4d7d,
    descriptionFa: 'مسیر گلوله با درخشش سرخ-منشوری چشم‌نواز.',
  },
  {
    id: 'flash_crimson_prism',
    nameFa: 'شعلهٔ منشور سرخ',
    nameEn: 'Crimson Prism Flash',
    category: 'muzzle_flash',
    rarity: 'epic',
    colorHex: '#ff2a55',
    accentHex: '#ffffff',
    colorInt: 0xff2a55,
    descriptionFa: 'شعلهٔ دهانه سفید و سرخ هولوگرافیک.',
  },
  {
    id: 'frame_aegis_holo',
    nameFa: 'قاب هولوگرافیک ایجیس',
    nameEn: 'Aegis Holo Frame',
    category: 'name_frame',
    rarity: 'epic',
    colorHex: '#ff2a55',
    accentHex: '#18101c',
    colorInt: 0xff2a55,
    descriptionFa: 'قاب سرخ و سفید درخشان دور نام بازیکن در لابی و جدول امتیازات.',
  },

  // LMG Spin — RARE (4 items)
  {
    id: 'tracer_scarlet_pulse',
    nameFa: 'ردگلوله پالس ارغوانی',
    nameEn: 'Scarlet Pulse Tracer',
    category: 'tracer_color',
    rarity: 'rare',
    colorHex: '#f43f5e',
    accentHex: '#fecdd3',
    colorInt: 0xf43f5e,
    descriptionFa: 'ردگلوله سرخ-ارغوانی شفاف و تمیز.',
  },
  {
    id: 'flash_chrome_burst',
    nameFa: 'شعلهٔ انفجار کروم',
    nameEn: 'Chrome Burst Flash',
    category: 'muzzle_flash',
    rarity: 'rare',
    colorHex: '#f8fafc',
    accentHex: '#fb7185',
    colorInt: 0xf8fafc,
    descriptionFa: 'شعلهٔ دهانه نقره‌ای-سفید روشن.',
  },
  {
    id: 'badge_tempest_wing',
    nameFa: 'نشان بال طوفان',
    nameEn: 'Tempest Wing Badge',
    category: 'name_badge',
    rarity: 'rare',
    colorHex: '#ff4d7d',
    accentHex: '#ffffff',
    colorInt: 0xff4d7d,
    symbol: '✧',
    descriptionFa: 'نشان ستاره طوفان کنار نام شما در لابی و بازی.',
  },
  {
    id: 'frame_crimson_alloy',
    nameFa: 'قاب آلیاژ سرخ',
    nameEn: 'Crimson Alloy Frame',
    category: 'name_frame',
    rarity: 'rare',
    colorHex: '#fb7185',
    accentHex: '#1f1018',
    colorInt: 0xfb7185,
    descriptionFa: 'قاب فلزی با لبهٔ سرخ-کرومی دور نام بازیکن.',
  },

  // LMG Spin — COMMON (6 items)
  {
    id: 'tracer_pearl_white',
    nameFa: 'ردگلوله سفید مرواریدی',
    nameEn: 'Pearl White Tracer',
    category: 'tracer_color',
    rarity: 'common',
    colorHex: '#f1f5f9',
    colorInt: 0xf1f5f9,
    descriptionFa: 'ردگلوله سفید شفاف و مینیمال.',
  },
  {
    id: 'tracer_ruby_streak',
    nameFa: 'ردگلوله خط یاقوت',
    nameEn: 'Ruby Streak Tracer',
    category: 'tracer_color',
    rarity: 'common',
    colorHex: '#e11d48',
    colorInt: 0xe11d48,
    descriptionFa: 'ردگلوله سرخ تیره خوانا در همهٔ نقشه‌ها.',
  },
  {
    id: 'flash_ruby_spark',
    nameFa: 'شعلهٔ جرقه یاقوت',
    nameEn: 'Ruby Spark Flash',
    category: 'muzzle_flash',
    rarity: 'common',
    colorHex: '#e11d48',
    colorInt: 0xe11d48,
    descriptionFa: 'شعلهٔ دهانه با ته‌رنگ سرخ یاقوتی.',
  },
  {
    id: 'flash_frost_flare',
    nameFa: 'شعلهٔ فلر یخی',
    nameEn: 'Frost Flare Flash',
    category: 'muzzle_flash',
    rarity: 'common',
    colorHex: '#e0f2fe',
    colorInt: 0xe0f2fe,
    descriptionFa: 'شعلهٔ دهانه سفید یخی ملایم.',
  },
  {
    id: 'badge_aegis_shield',
    nameFa: 'نشان سپر ایجیس',
    nameEn: 'Aegis Shield Badge',
    category: 'name_badge',
    rarity: 'common',
    colorHex: '#f8fafc',
    colorInt: 0xf8fafc,
    symbol: '⛨',
    descriptionFa: 'نشان سپر نقره‌ای کنار نام شما.',
  },
  {
    id: 'frame_silver_crest',
    nameFa: 'قاب نقره‌ای کروم',
    nameEn: 'Silver Crest Frame',
    category: 'name_frame',
    rarity: 'common',
    colorHex: '#e2e8f0',
    accentHex: '#18181b',
    colorInt: 0xe2e8f0,
    descriptionFa: 'قاب نقره‌ای براق دور نام بازیکن.',
  },
];

export const COSMETIC_ITEM_BY_ID: ReadonlyMap<string, CosmeticItem> = new Map(
  COSMETIC_ITEMS.map((item) => [item.id, item])
);

export const ALLOWED_COSMETIC_IDS_BY_CATEGORY: Readonly<Record<CosmeticCategory, ReadonlySet<string>>> = {
  ak47_skin: new Set(COSMETIC_ITEMS.filter((i) => i.category === 'ak47_skin').map((i) => i.id)),
  sniper_skin: new Set(COSMETIC_ITEMS.filter((i) => i.category === 'sniper_skin').map((i) => i.id)),
  m249_skin: new Set(COSMETIC_ITEMS.filter((i) => i.category === 'm249_skin').map((i) => i.id)),
  tracer_color: new Set(COSMETIC_ITEMS.filter((i) => i.category === 'tracer_color').map((i) => i.id)),
  muzzle_flash: new Set(COSMETIC_ITEMS.filter((i) => i.category === 'muzzle_flash').map((i) => i.id)),
  crosshair_color: new Set(COSMETIC_ITEMS.filter((i) => i.category === 'crosshair_color').map((i) => i.id)),
  name_frame: new Set(COSMETIC_ITEMS.filter((i) => i.category === 'name_frame').map((i) => i.id)),
  name_badge: new Set(COSMETIC_ITEMS.filter((i) => i.category === 'name_badge').map((i) => i.id)),
  kill_icon: new Set(COSMETIC_ITEMS.filter((i) => i.category === 'kill_icon').map((i) => i.id)),
};

export function getCosmeticItem(id: string | null | undefined): CosmeticItem | null {
  if (!id || typeof id !== 'string') return null;
  return COSMETIC_ITEM_BY_ID.get(id) ?? null;
}

export function getSpinBannerItems(bannerOrId: SpinBannerConfig | SpinBannerId = DEFAULT_SPIN_BANNER_ID): CosmeticItem[] {
  const banner = typeof bannerOrId === 'string' ? getSpinBannerConfig(bannerOrId) : bannerOrId;
  const out: CosmeticItem[] = [];
  for (let i = 0; i < banner.itemIds.length; i++) {
    const found = COSMETIC_ITEM_BY_ID.get(banner.itemIds[i]);
    if (found) out.push(found);
  }
  return out;
}

export function getSpinBannerItemChancePct(
  bannerOrId: SpinBannerConfig | SpinBannerId,
  item: CosmeticItem
): number {
  const banner = typeof bannerOrId === 'string' ? getSpinBannerConfig(bannerOrId) : bannerOrId;
  const pool = getSpinBannerItems(banner);
  const tierTotal = banner.rarityWeightsPct[item.rarity] ?? 0;
  const sameTierCount = pool.filter((i) => i.rarity === item.rarity).length;
  return sameTierCount > 0 ? Number((tierTotal / sameTierCount).toFixed(2)) : 0;
}

export function getCosmeticItemChancePct(
  item: CosmeticItem,
  bannerId: SpinBannerId = DEFAULT_SPIN_BANNER_ID
): number {
  return getSpinBannerItemChancePct(bannerId, item);
}

export function getLocalCalendarDateKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function createDefaultEquipped(): EquippedCosmetics {
  return {
    ak47_skin: null,
    sniper_skin: null,
    m249_skin: null,
    tracer_color: null,
    muzzle_flash: null,
    crosshair_color: null,
    name_frame: null,
    name_badge: null,
    kill_icon: null,
  };
}

export function createInitialCosmeticsState(todayDateKey = getLocalCalendarDateKey()): CosmeticsState {
  const pityByBanner: Record<string, number> = {};
  for (let i = 0; i < SPIN_BANNERS.length; i++) {
    pityByBanner[SPIN_BANNERS[i].id] = 0;
  }
  return {
    version: COSMETICS_STATE_VERSION,
    spins: INITIAL_FREE_SPINS,
    shards: 0,
    pityCounter: 0,
    pityByBanner,
    totalSpins: 0,
    killProgress: 0,
    totalKillsTracked: 0,
    totalWinsTracked: 0,
    lastDailyClaimDate: todayDateKey,
    ownedIds: [],
    equipped: createDefaultEquipped(),
  };
}

export function getBannerPityCounter(
  state: CosmeticsState,
  bannerId: SpinBannerId = DEFAULT_SPIN_BANNER_ID
): number {
  if (bannerId === DEFAULT_SPIN_BANNER_ID) {
    return typeof state.pityCounter === 'number' ? state.pityCounter : 0;
  }
  const mapVal = state.pityByBanner?.[bannerId];
  return typeof mapVal === 'number' && Number.isFinite(mapVal) ? mapVal : 0;
}

/**
 * Cryptographically strong unbiased random integer in [0, maxExclusive) using crypto.getRandomValues.
 * Uses monotonic bucket rejection sampling so exact probabilities like 1 in 10,000 (0.01%) have zero bias.
 */
export function secureRandomInt(
  maxExclusive: number,
  getRandomValuesFn?: (arr: Uint32Array) => Uint32Array
): number {
  const max = Math.max(1, Math.floor(maxExclusive));
  const bucketSize = Math.floor(0x100000000 / max);
  const limit = bucketSize * max;
  const buf = new Uint32Array(1);

  for (let attempt = 0; attempt < 8; attempt++) {
    if (typeof getRandomValuesFn === 'function') {
      getRandomValuesFn(buf);
    } else if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
      globalThis.crypto.getRandomValues(buf);
    } else {
      buf[0] = Math.floor(Math.random() * 0x100000000);
    }
    if (buf[0] < limit) {
      return Math.floor(buf[0] / bucketSize);
    }
  }
  return Math.min(max - 1, Math.floor((buf[0] / 0x100000000) * max));
}

/**
 * Cryptographically strong uniform float in [0, 1) using crypto.getRandomValues.
 */
export function secureRandomUnit(
  getRandomValuesFn?: (arr: Uint32Array) => Uint32Array
): number {
  const buf = new Uint32Array(1);
  if (typeof getRandomValuesFn === 'function') {
    getRandomValuesFn(buf);
  } else if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(buf);
  } else {
    // Extremely rare non-crypto fallback (should never trigger in modern browsers or Node 20+)
    buf[0] = Math.floor(Math.random() * 0x100000000);
  }
  return buf[0] / 0x100000000;
}

/**
 * Picks a rarity tier from an exact integer roll in [0, 10000) (1 basis point = 0.01% = 1/10,000).
 */
export function selectRarityFromBasisPoints(
  roll0To9999: number,
  weightsPct: Readonly<Record<CosmeticRarity, number>>
): CosmeticRarity {
  const roll = Number.isFinite(roll0To9999) ? Math.max(0, Math.min(9999, Math.floor(roll0To9999))) : 9999;
  const mythicBp = Math.max(0, Math.round((weightsPct.mythic ?? 0) * 100));
  const legBp = Math.max(0, Math.round((weightsPct.legendary ?? 0) * 100));
  const epicBp = Math.max(0, Math.round((weightsPct.epic ?? 0) * 100));
  const rareBp = Math.max(0, Math.round((weightsPct.rare ?? 0) * 100));
  if (roll < mythicBp) return 'mythic';
  if (roll < mythicBp + legBp) return 'legendary';
  if (roll < mythicBp + legBp + epicBp) return 'epic';
  if (roll < mythicBp + legBp + epicBp + rareBp) return 'rare';
  return 'common';
}

/**
 * Picks a rarity tier from [0, 1) uniform value using any banner's percentage weights.
 */
export function selectRarityFromWeights(
  u: number,
  weightsPct: Readonly<Record<CosmeticRarity, number>>
): CosmeticRarity {
  const clamped = Number.isFinite(u) ? Math.max(0, Math.min(0.999999999, u)) : 0.9999;
  const rollBp = Math.min(9999, Math.floor(clamped * 10000));
  return selectRarityFromBasisPoints(rollBp, weightsPct);
}

/**
 * Picks a rarity tier from [0, 1) uniform value for the default AK-47 banner:
 * [0.00, 0.02) -> legendary (2%)
 * [0.02, 0.10) -> epic (8%)
 * [0.10, 0.35) -> rare (25%)
 * [0.35, 1.00) -> common (65%)
 */
export function selectRarityFromUnit(u: number): CosmeticRarity {
  return selectRarityFromWeights(u, getSpinBannerConfig(DEFAULT_SPIN_BANNER_ID).rarityWeightsPct);
}

/**
 * Executes a single Lucky Spin on any configured banner using crypto.getRandomValues integer sampling:
 * - Shares state.spins and state.shards across all banners
 * - Enforces per-banner pity guarantee ONLY when banner.hasPity && banner.pityThreshold > 0
 *   (Mythic LMG banner has NO pity: pure 0.01% = 1/10,000 roll)
 * - Duplicates award +1 Shard; every 5 Shards automatically convert into +1 Free Spin
 */
export function executeLuckySpin(
  state: CosmeticsState,
  getRandomValuesFn?: (arr: Uint32Array) => Uint32Array,
  bannerId: SpinBannerId = DEFAULT_SPIN_BANNER_ID
): SpinOutcome | null {
  if (!state || state.spins < 1) return null;

  const banner = getSpinBannerConfig(bannerId);
  const bannerPool = getSpinBannerItems(banner);
  const bannerSupportsPity = banner.hasPity !== false && banner.pityThreshold > 0;
  const currentBannerPity = bannerSupportsPity ? getBannerPityCounter(state, banner.id) : 0;
  const wasPityGuaranteed = bannerSupportsPity && currentBannerPity >= banner.pityThreshold;
  let pickedItem: CosmeticItem;

  if (wasPityGuaranteed) {
    pickedItem = COSMETIC_ITEM_BY_ID.get(banner.featuredItemId) ?? bannerPool[0] ?? COSMETIC_ITEMS[0];
  } else {
    const rollBp = secureRandomInt(10000, getRandomValuesFn);
    const rarity = selectRarityFromBasisPoints(rollBp, banner.rarityWeightsPct);
    const pool = bannerPool.filter((i) => i.rarity === rarity);
    const effectivePool = pool.length > 0 ? pool : bannerPool;
    const idx = secureRandomInt(effectivePool.length, getRandomValuesFn);
    pickedItem = effectivePool[idx] ?? bannerPool[0] ?? COSMETIC_ITEMS[0];
  }

  const ownedSet = new Set(state.ownedIds);
  const isDuplicate = ownedSet.has(pickedItem.id);

  let nextSpins = state.spins - 1;
  let nextShards = state.shards;
  let shardsGained = 0;
  let bonusSpinsFromShards = 0;

  if (isDuplicate) {
    shardsGained = 1;
    nextShards += 1;
    while (nextShards >= SHARDS_PER_FREE_SPIN) {
      nextShards -= SHARDS_PER_FREE_SPIN;
      nextSpins += 1;
      bonusSpinsFromShards += 1;
    }
  } else {
    ownedSet.add(pickedItem.id);
  }

  const nextBannerPity = !bannerSupportsPity
    ? 0
    : pickedItem.rarity === banner.featuredRarity
      ? 0
      : Math.min(banner.pityThreshold, currentBannerPity + 1);

  const nextPityByBanner: Record<string, number> = {
    ...(state.pityByBanner ?? {}),
    [DEFAULT_SPIN_BANNER_ID]: state.pityCounter,
    [banner.id]: nextBannerPity,
  };

  const nextState: CosmeticsState = {
    ...state,
    spins: nextSpins,
    shards: nextShards,
    pityCounter: banner.id === DEFAULT_SPIN_BANNER_ID ? nextBannerPity : state.pityCounter,
    pityByBanner: nextPityByBanner,
    totalSpins: state.totalSpins + 1,
    ownedIds: Array.from(ownedSet),
  };

  return {
    bannerId: banner.id,
    item: pickedItem,
    isDuplicate,
    wasPityGuaranteed,
    shardsGained,
    bonusSpinsFromShards,
    nextState,
  };
}

export function canClaimDailyFreeSpin(
  state: CosmeticsState,
  todayDateKey = getLocalCalendarDateKey()
): boolean {
  return state.lastDailyClaimDate !== todayDateKey;
}

export function claimDailyFreeSpin(
  state: CosmeticsState,
  todayDateKey = getLocalCalendarDateKey()
): { state: CosmeticsState; granted: boolean } {
  if (!canClaimDailyFreeSpin(state, todayDateKey)) {
    return { state, granted: false };
  }
  return {
    state: {
      ...state,
      spins: state.spins + 1,
      lastDailyClaimDate: todayDateKey,
    },
    granted: true,
  };
}

export function awardMatchWinSpin(state: CosmeticsState): { state: CosmeticsState; spinsGranted: number } {
  return {
    state: {
      ...state,
      spins: state.spins + 1,
      totalWinsTracked: state.totalWinsTracked + 1,
    },
    spinsGranted: 1,
  };
}

export function recordKillsForSpinReward(
  state: CosmeticsState,
  killsDelta = 1
): { state: CosmeticsState; spinsGranted: number } {
  const safeDelta = Math.max(0, Math.floor(killsDelta));
  if (safeDelta === 0) return { state, spinsGranted: 0 };
  const combined = state.killProgress + safeDelta;
  const spinsGranted = Math.floor(combined / KILLS_PER_FREE_SPIN);
  const nextProgress = combined % KILLS_PER_FREE_SPIN;
  return {
    state: {
      ...state,
      spins: state.spins + spinsGranted,
      killProgress: nextProgress,
      totalKillsTracked: state.totalKillsTracked + safeDelta,
    },
    spinsGranted,
  };
}

export function equipCosmeticItem(
  state: CosmeticsState,
  category: CosmeticCategory,
  itemId: string | null
): CosmeticsState {
  if (itemId === null) {
    return {
      ...state,
      equipped: {
        ...state.equipped,
        [category]: null,
      },
    };
  }
  if (!ALLOWED_COSMETIC_IDS_BY_CATEGORY[category].has(itemId)) {
    return state;
  }
  if (!state.ownedIds.includes(itemId)) {
    return state;
  }
  return {
    ...state,
    equipped: {
      ...state.equipped,
      [category]: itemId,
    },
  };
}

/**
 * Unlocks ownership of a single allowlisted cosmetic item (e.g. via server-verified Redeem Code).
 * Stores ONLY the cosmetic ownership ID in state — never any code or secret.
 */
export function unlockCosmeticItem(
  state: CosmeticsState,
  itemId: string
): { state: CosmeticsState; alreadyOwned: boolean; unlocked: boolean } {
  if (!COSMETIC_ITEM_BY_ID.has(itemId)) {
    return { state, alreadyOwned: false, unlocked: false };
  }
  if (state.ownedIds.includes(itemId)) {
    return { state, alreadyOwned: true, unlocked: false };
  }
  return {
    state: {
      ...state,
      ownedIds: [...state.ownedIds, itemId],
    },
    alreadyOwned: false,
    unlocked: true,
  };
}

/**
 * Strict validator for persisted CosmeticsState.
 * Drops unknown IDs, enforces category ownership, clamps numeric bounds.
 */
export function validateCosmeticsState(
  raw: unknown,
  todayDateKey = getLocalCalendarDateKey()
): CosmeticsState {
  if (!raw || typeof raw !== 'object') {
    return createInitialCosmeticsState(todayDateKey);
  }
  const obj = raw as Record<string, unknown>;
  const rawOwned = Array.isArray(obj.ownedIds) ? obj.ownedIds : [];
  const validOwnedSet = new Set<string>();
  for (let i = 0; i < rawOwned.length; i++) {
    const id = rawOwned[i];
    if (typeof id === 'string' && COSMETIC_ITEM_BY_ID.has(id)) {
      validOwnedSet.add(id);
    }
  }

  const rawEquipped =
    obj.equipped && typeof obj.equipped === 'object' ? (obj.equipped as Record<string, unknown>) : {};
  const equipped = createDefaultEquipped();
  for (let i = 0; i < COSMETIC_CATEGORY_ORDER.length; i++) {
    const cat = COSMETIC_CATEGORY_ORDER[i];
    const candidate = rawEquipped[cat];
    if (
      typeof candidate === 'string' &&
      ALLOWED_COSMETIC_IDS_BY_CATEGORY[cat].has(candidate) &&
      validOwnedSet.has(candidate)
    ) {
      equipped[cat] = candidate;
    }
  }

  const clampInt = (v: unknown, fallback: number, min: number, max: number): number => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
    return Math.max(min, Math.min(max, Math.floor(v)));
  };

  let spins = clampInt(obj.spins, INITIAL_FREE_SPINS, 0, 9999);
  let shards = clampInt(obj.shards, 0, 0, 999);
  while (shards >= SHARDS_PER_FREE_SPIN) {
    shards -= SHARDS_PER_FREE_SPIN;
    spins = Math.min(9999, spins + 1);
  }

  const lastDateRaw = typeof obj.lastDailyClaimDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(obj.lastDailyClaimDate)
    ? obj.lastDailyClaimDate
    : null;

  const akPity = clampInt(obj.pityCounter, 0, 0, PITY_GUARANTEE_THRESHOLD);
  const rawPityMap =
    obj.pityByBanner && typeof obj.pityByBanner === 'object'
      ? (obj.pityByBanner as Record<string, unknown>)
      : {};
  const pityByBanner: Record<string, number> = {};
  for (let i = 0; i < SPIN_BANNERS.length; i++) {
    const b = SPIN_BANNERS[i];
    pityByBanner[b.id] =
      b.id === DEFAULT_SPIN_BANNER_ID
        ? akPity
        : clampInt(rawPityMap[b.id], 0, 0, b.pityThreshold);
  }

  return {
    version: COSMETICS_STATE_VERSION,
    spins,
    shards,
    pityCounter: akPity,
    pityByBanner,
    totalSpins: clampInt(obj.totalSpins, 0, 0, 999999),
    killProgress: clampInt(obj.killProgress, 0, 0, KILLS_PER_FREE_SPIN - 1),
    totalKillsTracked: clampInt(obj.totalKillsTracked, 0, 0, 9999999),
    totalWinsTracked: clampInt(obj.totalWinsTracked, 0, 0, 999999),
    lastDailyClaimDate: lastDateRaw,
    ownedIds: Array.from(validOwnedSet),
    equipped,
  };
}

export function loadCosmeticsState(): CosmeticsState {
  const today = getLocalCalendarDateKey();
  try {
    const raw = window.localStorage.getItem(COSMETICS_STORAGE_KEY);
    if (!raw) {
      const initial = createInitialCosmeticsState(today);
      saveCosmeticsState(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    return validateCosmeticsState(parsed, today);
  } catch {
    return createInitialCosmeticsState(today);
  }
}

export function saveCosmeticsState(state: CosmeticsState): void {
  try {
    const validated = validateCosmeticsState(state);
    window.localStorage.setItem(COSMETICS_STORAGE_KEY, JSON.stringify(validated));
  } catch {
    // Ignore storage quota or private-mode restrictions
  }
}

/**
 * Converts local equipped cosmetics into the compact allowlisted PeerJS sync object.
 */
export function toOnlineSyncedCosmetics(equipped: EquippedCosmetics): OnlineSyncedCosmetics {
  const out: OnlineSyncedCosmetics = {};
  if (equipped.ak47_skin && ALLOWED_COSMETIC_IDS_BY_CATEGORY.ak47_skin.has(equipped.ak47_skin)) {
    out.ak = equipped.ak47_skin;
  }
  if (equipped.sniper_skin && ALLOWED_COSMETIC_IDS_BY_CATEGORY.sniper_skin.has(equipped.sniper_skin)) {
    out.sn = equipped.sniper_skin;
  }
  if (equipped.m249_skin && ALLOWED_COSMETIC_IDS_BY_CATEGORY.m249_skin.has(equipped.m249_skin)) {
    out.m249 = equipped.m249_skin;
  }
  if (equipped.tracer_color && ALLOWED_COSMETIC_IDS_BY_CATEGORY.tracer_color.has(equipped.tracer_color)) {
    out.tr = equipped.tracer_color;
  }
  if (equipped.muzzle_flash && ALLOWED_COSMETIC_IDS_BY_CATEGORY.muzzle_flash.has(equipped.muzzle_flash)) {
    out.mf = equipped.muzzle_flash;
  }
  if (equipped.name_frame && ALLOWED_COSMETIC_IDS_BY_CATEGORY.name_frame.has(equipped.name_frame)) {
    out.nf = equipped.name_frame;
  }
  if (equipped.name_badge && ALLOWED_COSMETIC_IDS_BY_CATEGORY.name_badge.has(equipped.name_badge)) {
    out.nb = equipped.name_badge;
  }
  if (equipped.kill_icon && ALLOWED_COSMETIC_IDS_BY_CATEGORY.kill_icon.has(equipped.kill_icon)) {
    out.ki = equipped.kill_icon;
  }
  return out;
}

/**
 * Strictly validates any untrusted online cosmetic payload (used by BOTH Host and Clients).
 * Unknown or mismatched-category IDs are silently dropped.
 */
export function sanitizeOnlineCosmetics(raw: unknown): OnlineSyncedCosmetics | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const out: OnlineSyncedCosmetics = {};
  let hasAny = false;

  if (typeof obj.ak === 'string' && ALLOWED_COSMETIC_IDS_BY_CATEGORY.ak47_skin.has(obj.ak)) {
    out.ak = obj.ak;
    hasAny = true;
  }
  if (typeof obj.sn === 'string' && ALLOWED_COSMETIC_IDS_BY_CATEGORY.sniper_skin.has(obj.sn)) {
    out.sn = obj.sn;
    hasAny = true;
  }
  if (typeof obj.m249 === 'string' && ALLOWED_COSMETIC_IDS_BY_CATEGORY.m249_skin.has(obj.m249)) {
    out.m249 = obj.m249;
    hasAny = true;
  }
  if (typeof obj.tr === 'string' && ALLOWED_COSMETIC_IDS_BY_CATEGORY.tracer_color.has(obj.tr)) {
    out.tr = obj.tr;
    hasAny = true;
  }
  if (typeof obj.mf === 'string' && ALLOWED_COSMETIC_IDS_BY_CATEGORY.muzzle_flash.has(obj.mf)) {
    out.mf = obj.mf;
    hasAny = true;
  }
  if (typeof obj.nf === 'string' && ALLOWED_COSMETIC_IDS_BY_CATEGORY.name_frame.has(obj.nf)) {
    out.nf = obj.nf;
    hasAny = true;
  }
  if (typeof obj.nb === 'string' && ALLOWED_COSMETIC_IDS_BY_CATEGORY.name_badge.has(obj.nb)) {
    out.nb = obj.nb;
    hasAny = true;
  }
  if (typeof obj.ki === 'string' && ALLOWED_COSMETIC_IDS_BY_CATEGORY.kill_icon.has(obj.ki)) {
    out.ki = obj.ki;
    hasAny = true;
  }
  return hasAny ? out : undefined;
}

const TEMPEST_PRISM_PALETTE = [
  0xff2a55, // crimson red
  0xff6b9d, // rose prism
  0xffffff, // chrome white
  0x38e8ff, // cyan prism
  0xc084fc, // violet prism
  0xff4560, // hot scarlet
];

export function resolveTempestRainbowColorInt(shotSeq = 0, heat01 = 0): number {
  const idx = Math.abs(Math.floor(shotSeq)) % TEMPEST_PRISM_PALETTE.length;
  if (heat01 > 0.72 && idx % 2 === 1) return 0xffffff;
  return TEMPEST_PRISM_PALETTE[idx];
}

/**
 * Resolves effective tracer color hex int for a shot:
 * - AK-47 with Inferno Reaper -> legendary orange-gold (#ff8c1a)
 * - AWM Sniper with Void Piercer -> luminous cyan-violet (#38e8ff)
 * - M249 SAW with Tempest Aegis -> prismatic rainbow-crimson (#ff2a55)
 * - Otherwise equipped tracer color, or default warm gold (0xffdd77)
 */
export function resolveEffectiveTracerColorInt(
  weaponId: string,
  cosmetics?: OnlineSyncedCosmetics | null,
  shotSeq = 0,
  heat01 = 0
): number {
  if (weaponId === 'ak47' && cosmetics?.ak === LEGENDARY_AK47_ID) {
    return 0xff8c1a;
  }
  if (weaponId === 'sniper' && cosmetics?.sn === LEGENDARY_SNIPER_ID) {
    return 0x38e8ff;
  }
  if (weaponId === 'lmg' && cosmetics?.m249 === MYTHIC_M249_ID) {
    return resolveTempestRainbowColorInt(shotSeq, heat01);
  }
  const tr = getCosmeticItem(cosmetics?.tr);
  return tr ? tr.colorInt : 0xffdd77;
}

/**
 * Resolves effective muzzle flash tint hex int for a shot:
 * - AK-47 with Inferno Reaper -> legendary orange-gold (#ff9224)
 * - AWM Sniper with Void Piercer -> electric cyan-violet (#46f0ff)
 * - M249 SAW with Tempest Aegis -> prismatic crimson-white (#ff3b6b)
 * - Otherwise equipped muzzle flash color, or default white-amber (0xffffff)
 */
export function resolveEffectiveMuzzleFlashColorInt(
  weaponId: string,
  cosmetics?: OnlineSyncedCosmetics | null
): number {
  if (weaponId === 'ak47' && cosmetics?.ak === LEGENDARY_AK47_ID) {
    return 0xff9224;
  }
  if (weaponId === 'sniper' && cosmetics?.sn === LEGENDARY_SNIPER_ID) {
    return 0x46f0ff;
  }
  if (weaponId === 'lmg' && cosmetics?.m249 === MYTHIC_M249_ID) {
    return 0xff3b6b;
  }
  const mf = getCosmeticItem(cosmetics?.mf);
  return mf ? mf.colorInt : 0xffffff;
}

/**
 * Checks whether a kill should trigger the Inferno Reaper special fiery kill effect & Kill Feed highlight.
 */
export function isInfernoReaperKill(
  weaponId: string,
  cosmetics?: OnlineSyncedCosmetics | null
): boolean {
  return weaponId === 'ak47' && cosmetics?.ak === LEGENDARY_AK47_ID;
}

/**
 * Checks whether a kill should trigger the Void Piercer gravitational wave kill effect & Kill Feed highlight.
 */
export function isVoidPiercerKill(
  weaponId: string,
  cosmetics?: OnlineSyncedCosmetics | null
): boolean {
  return weaponId === 'sniper' && cosmetics?.sn === LEGENDARY_SNIPER_ID;
}

/**
 * Checks whether a kill should trigger the Mythic M249 Tempest Aegis multi-layer gravity + lightning kill effect.
 */
export function isTempestAegisKill(
  weaponId: string,
  cosmetics?: OnlineSyncedCosmetics | null
): boolean {
  return weaponId === 'lmg' && cosmetics?.m249 === MYTHIC_M249_ID;
}

/**
 * Builds a deterministic horizontal reel strip ending on the won item at `winIndex`.
 */
export function buildSpinReelStrip(
  winItem: CosmeticItem,
  totalSlots = 36,
  winIndex = 29,
  getRandomValuesFn?: (arr: Uint32Array) => Uint32Array,
  poolItems: readonly CosmeticItem[] = COSMETIC_ITEMS
): CosmeticItem[] {
  const safePool = poolItems.length > 0 ? poolItems : COSMETIC_ITEMS;
  const safeTotal = Math.max(winIndex + 4, totalSlots);
  const strip: CosmeticItem[] = [];
  for (let i = 0; i < safeTotal; i++) {
    if (i === winIndex) {
      strip.push(winItem);
    } else {
      const u = secureRandomUnit(getRandomValuesFn);
      const idx = Math.min(safePool.length - 1, Math.floor(u * safePool.length));
      strip.push(safePool[idx]);
    }
  }
  return strip;
}
