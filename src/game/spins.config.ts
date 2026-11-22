/**
 * Data-Driven Multi-Spin Banner Configuration
 * Add new spin banners here without rewriting UI or spin engine logic.
 * 100% cosmetic-only (zero damage, hitbox, recoil, or balance impact).
 */

import type { CosmeticRarity } from './cosmetics';

export type SpinBannerId = 'ak47_inferno' | 'sniper_void';

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
  theme: SpinBannerTheme;
  /** Exact rarity probabilities (must sum to 100) */
  rarityWeightsPct: Readonly<Record<CosmeticRarity, number>>;
  /** Allowlisted cosmetic item IDs available inside this spin */
  itemIds: readonly string[];
  /** Consecutive non-legendary spins before next spin guarantees the featured Legendary */
  pityThreshold: number;
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
    theme: {
      primaryHex: '#f59e0b',
      secondaryHex: '#ff5a00',
      glowRgba: 'rgba(245, 158, 11, 0.24)',
      surfaceGradient: 'linear-gradient(155deg, rgba(28, 18, 8, 0.96), rgba(12, 10, 10, 0.98))',
    },
    rarityWeightsPct: {
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
  },
  {
    id: 'sniper_void',
    labelFa: 'اسپین اسنایپ',
    titleFa: 'ووید پیرسر',
    titleEn: 'Void Piercer',
    subtitleFa: 'اسکین لجندری AWM با هستهٔ انرژی و دوربین هولوگرافیک فضایی',
    featuredItemId: 'awm_void_piercer',
    theme: {
      primaryHex: '#22d3ee',
      secondaryHex: '#a855f7',
      glowRgba: 'rgba(34, 211, 238, 0.24)',
      surfaceGradient: 'linear-gradient(155deg, rgba(10, 20, 32, 0.96), rgba(16, 10, 28, 0.98))',
    },
    rarityWeightsPct: {
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
