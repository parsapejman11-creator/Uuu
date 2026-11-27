/**
 * Data-Driven Multi-Spin Banner Configuration
 * Add new spin banners here without rewriting UI or spin engine logic.
 * - AK-47 & Sniper banners: 100% cosmetic-only with 20-spin pity guarantee.
 * - LMG Mythic banner ("Tempest Aegis"): 0.01% (1 in 10,000) exact cryptographic integer roll, NO pity.
 */

import type { CosmeticRarity } from './cosmetics';

export type SpinBannerId =
  | 'ak47_inferno'
  | 'sniper_void'
  | 'lmg_tempest'
  | 'shotgun_eclipse'
  | 'katana_sakura'
  | 'rpg_nova';

export interface SpinBannerTheme {
  primaryHex: string;
  secondaryHex: string;
  glowRgba: string;
  surfaceGradient: string;
}

export interface SpinBannerConfig {
  id: SpinBannerId;
  labelFa: string;
  titleFa: string;
  titleEn: string;
  subtitleFa: string;
  featuredItemId: string;
  featuredRarity: CosmeticRarity;
  theme: SpinBannerTheme;
  /** Exact rarity probabilities in percent (must sum to 100.00; precision 0.01% = 1/10000) */
  rarityWeightsPct: Readonly<Record<CosmeticRarity, number>>;
  /** Allowlisted cosmetic item IDs available inside this spin */
  itemIds: readonly string[];
  /** Consecutive non-featured spins before next spin guarantees featured item (0 = no pity) */
  pityThreshold: number;
  /** Whether this banner supports a pity guarantee */
  hasPity: boolean;
}

export const DEFAULT_SPIN_BANNER_ID: SpinBannerId = 'ak47_inferno';

export const SPIN_BANNERS: readonly SpinBannerConfig[] = [
  {
    id: 'ak47_inferno',
    labelFa: 'اسپین AK-47',
    titleFa: 'اینفرنو ریپر',
    titleEn: 'Inferno Reaper',
    subtitleFa: 'اسکین لجندری AK-47 با رگه‌های نارنجی و حکاکی طلایی',
    featuredItemId: 'ak_inferno_reaper',
    featuredRarity: 'legendary',
    theme: {
      primaryHex: '#f59e0b',
      secondaryHex: '#ff5a00',
      glowRgba: 'rgba(245, 158, 11, 0.24)',
      surfaceGradient: 'linear-gradient(155deg, rgba(28, 18, 8, 0.96), rgba(12, 10, 10, 0.98))',
    },
    rarityWeightsPct: {
      mythic: 0,
      legendary: 2,
      epic: 8,
      rare: 25,
      common: 65,
    },
    itemIds: [
      'ak_inferno_reaper',
      'tracer_crimson',
      'flash_violet',
      'frame_obsidian_gold',
      'kicon_ember',
      'tracer_cyan',
      'flash_cobalt',
      'ch_gold',
      'frame_cobalt_edge',
      'badge_crown',
      'tracer_emerald',
      'tracer_amber',
      'flash_crimson',
      'flash_solar',
      'ch_cyan',
      'ch_lime',
      'ch_rose',
      'frame_steel_trim',
      'badge_bolt',
      'kicon_blade',
    ],
    pityThreshold: 20,
    hasPity: true,
  },
  {
    id: 'sniper_void',
    labelFa: 'اسپین اسنایپ',
    titleFa: 'ووید پیرسر',
    titleEn: 'Void Piercer',
    subtitleFa: 'اسکین لجندری AWM با هستهٔ انرژی و دوربین هولوگرافیک فضایی',
    featuredItemId: 'awm_void_piercer',
    featuredRarity: 'legendary',
    theme: {
      primaryHex: '#22d3ee',
      secondaryHex: '#a855f7',
      glowRgba: 'rgba(34, 211, 238, 0.24)',
      surfaceGradient: 'linear-gradient(155deg, rgba(10, 20, 32, 0.96), rgba(16, 10, 28, 0.98))',
    },
    rarityWeightsPct: {
      mythic: 0,
      legendary: 0.5,
      epic: 7.5,
      rare: 27,
      common: 65,
    },
    itemIds: [
      'awm_void_piercer',
      'tracer_void_prism',
      'flash_plasma_nova',
      'frame_nebula_glass',
      'tracer_astral_indigo',
      'flash_ion_pulse',
      'badge_prism_eye',
      'kicon_singularity',
      'tracer_ice_vapor',
      'flash_arctic_spark',
      'ch_violet',
      'frame_titanium_white',
      'badge_orbit',
      'kicon_crossbeam',
    ],
    pityThreshold: 20,
    hasPity: true,
  },
  {
    id: 'lmg_tempest',
    labelFa: 'اسپین تیربار',
    titleFa: 'تمپست ایجیس',
    titleEn: 'Tempest Aegis',
    subtitleFa: 'اسکین میتیک M249 SAW با بدنه کرومی-قرمز، ریلود سینمایی، شمارنده کشتن و ایموت اختصاصی',
    featuredItemId: 'm249_tempest_aegis',
    featuredRarity: 'mythic',
    theme: {
      primaryHex: '#ff2a55',
      secondaryHex: '#ffffff',
      glowRgba: 'rgba(255, 42, 85, 0.28)',
      surfaceGradient: 'linear-gradient(155deg, rgba(32, 10, 20, 0.96), rgba(14, 12, 24, 0.98))',
    },
    rarityWeightsPct: {
      mythic: 0.01,
      legendary: 0,
      epic: 6.99,
      rare: 28,
      common: 65,
    },
    itemIds: [
      'm249_tempest_aegis',
      'tracer_prism_arc',
      'flash_crimson_prism',
      'frame_aegis_holo',
      'tracer_scarlet_pulse',
      'flash_chrome_burst',
      'badge_tempest_wing',
      'frame_crimson_alloy',
      'tracer_pearl_white',
      'tracer_ruby_streak',
      'flash_ruby_spark',
      'flash_frost_flare',
      'badge_aegis_shield',
      'frame_silver_crest',
    ],
    pityThreshold: 0,
    hasPity: false,
  },
  {
    id: 'shotgun_eclipse',
    labelFa: 'اسپین شاتگان',
    titleFa: 'اکلیپس بریچر',
    titleEn: 'Eclipse Breacher',
    subtitleFa: 'اسکین میتیک SPAS-12 با بدنه مشکی-طلایی، سیاه‌چاله چرخان، ریلود سینمایی، دید ماه‌گرفتگی، ابرنواختر و ایموت اختصاصی',
    featuredItemId: 'spas12_eclipse_breacher',
    featuredRarity: 'mythic',
    theme: {
      primaryHex: '#f59e0b',
      secondaryHex: '#fde047',
      glowRgba: 'rgba(245, 158, 11, 0.3)',
      surfaceGradient: 'linear-gradient(155deg, rgba(28, 20, 8, 0.96), rgba(10, 9, 14, 0.98))',
    },
    rarityWeightsPct: {
      mythic: 0.01,
      legendary: 0,
      epic: 6.99,
      rare: 28,
      common: 65,
    },
    itemIds: [
      'spas12_eclipse_breacher',
      'tracer_eclipse_corona',
      'flash_supernova_gold',
      'frame_eclipse_halo',
      'tracer_gilded_ember',
      'flash_solar_flare',
      'badge_eclipse_ring',
      'kicon_supernova',
      'tracer_obsidian_gold',
      'tracer_amber_spark',
      'flash_amber_burst',
      'flash_starlight',
      'badge_corona_star',
      'frame_obsidian_etch',
    ],
    pityThreshold: 0,
    hasPity: false,
  },
  {
    id: 'katana_sakura',
    labelFa: 'اسپین کاتانا',
    titleFa: 'شکوفهٔ ماه',
    titleEn: 'Sakura Moonblade',
    subtitleFa: 'شمشیر کاتانای لجندری با تیغه دمشقی خمیده، لبه نورانی ساکورا، محافظ نیلوفر طلایی و افکت گلبرگ',
    featuredItemId: 'katana_sakura_moonblade',
    featuredRarity: 'legendary',
    theme: {
      primaryHex: '#f472b6',
      secondaryHex: '#fbbf24',
      glowRgba: 'rgba(244, 114, 182, 0.3)',
      surfaceGradient: 'linear-gradient(155deg, rgba(32, 12, 28, 0.96), rgba(14, 10, 26, 0.98))',
    },
    rarityWeightsPct: {
      mythic: 0,
      legendary: 2,
      epic: 8,
      rare: 25,
      common: 65,
    },
    itemIds: [
      'katana_sakura_moonblade',
      'tracer_sakura_bloom',
      'flash_sakura_moon',
      'frame_sakura_gold',
      'tracer_moon_indigo',
      'flash_petal_burst',
      'badge_sakura_crest',
      'kicon_sakura_slash',
      'tracer_rose_mist',
      'flash_blossom_spark',
      'ch_sakura',
      'frame_indigo_silk',
      'badge_crescent_moon',
      'kicon_moon_edge',
    ],
    pityThreshold: 20,
    hasPity: true,
  },
  {
    id: 'rpg_nova',
    labelFa: 'اسپین RPG',
    titleFa: 'نُوا دِرَگون',
    titleEn: 'Nova Dragon',
    subtitleFa: 'آرپی‌جی لجندری با بدنه فلس اژدهای طلایی، هسته پلاسمای زمردی چرخان، رد مارپیچی و انفجار ابرنواختری',
    featuredItemId: 'rpg_nova_dragon',
    featuredRarity: 'legendary',
    theme: {
      primaryHex: '#10b981',
      secondaryHex: '#fbbf24',
      glowRgba: 'rgba(16, 185, 129, 0.34)',
      surfaceGradient: 'linear-gradient(155deg, rgba(6, 36, 28, 0.96), rgba(9, 13, 18, 0.98))',
    },
    rarityWeightsPct: {
      mythic: 0,
      legendary: 2,
      epic: 8,
      rare: 25,
      common: 65,
    },
    itemIds: [
      'rpg_nova_dragon',
      'tracer_nova_emerald',
      'flash_nova_dragon',
      'frame_nova_dragon',
      'tracer_jade_spiral',
      'flash_jade_burst',
      'badge_nova_dragon',
      'kicon_nova_blast',
      'tracer_mint_flare',
      'flash_emerald_spark',
      'ch_emerald_nova',
      'frame_obsidian_jade',
      'badge_dragon_fang',
      'kicon_dragon_core',
    ],
    pityThreshold: 20,
    hasPity: true,
  },
];

export const SPIN_BANNER_BY_ID: ReadonlyMap<SpinBannerId, SpinBannerConfig> = new Map(
  SPIN_BANNERS.map((b) => [b.id, b])
);

export function getSpinBannerConfig(id?: string | null): SpinBannerConfig {
  if (id && SPIN_BANNER_BY_ID.has(id as SpinBannerId)) {
    return SPIN_BANNER_BY_ID.get(id as SpinBannerId)!;
  }
  return SPIN_BANNERS[0];
}
