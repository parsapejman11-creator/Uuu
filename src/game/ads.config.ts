import { MapId } from './rules';

/**
 * ============================================================================
 * AD BILLBOARDS CONFIGURATION (Self-Hosted Local Assets Only)
 * ============================================================================
 * How to replace or add billboard images:
 * 1. Put your compressed image (JPEG or WebP, max 1024px wide, <= 200KB) inside:
 *      public/ads/   (e.g. public/ads/ad-01.jpg, public/ads/ad-02.webp)
 * 2. Update `imagePath` below to './ads/your-file.jpg' (keep the leading './' so
 *    both local dev and subpath/PWA deployments resolve it cleanly).
 * 3. Adjust `position`, `rotationY` (radians), `maxWidth`, and `maxHeight` if needed.
 *    Aspect ratio is computed automatically from the loaded image so it never stretches.
 * ============================================================================
 */

export interface AdBillboardConfig {
  id: string;
  mapId: MapId;
  /** Local relative path under public/ (e.g. './ads/ad-01.jpg'). External URLs are blocked. */
  imagePath: string;
  /** Human-readable Persian description of the placement */
  locationLabelFa: string;
  /** World coordinates slightly offset (~0.06m) from wall/container surface to avoid z-fighting */
  position: { x: number; y: number; z: number };
  /** Facing direction around Y axis in radians (0 = +Z, PI = -Z, PI/2 = +X, -PI/2 = -X) */
  rotationY: number;
  /** Maximum billboard width in meters (compact: ~2.0 to 2.8m) */
  maxWidth: number;
  /** Maximum billboard height in meters */
  maxHeight: number;
}

const DEFAULT_AD_IMAGE = './ads/ad-01.jpg';

export const AD_BILLBOARDS_BY_MAP: Record<MapId, AdBillboardConfig[]> = {
  // MAP 1: انبار صنعتی (Killhouse) — 3 billboards on side pillars & eastern side container
  warehouse: [
    {
      id: 'wh-pillar-nw',
      mapId: 'warehouse',
      imagePath: DEFAULT_AD_IMAGE,
      locationLabelFa: 'ستون آبی شمال‌غرب (رو به مرکز انبار)',
      position: { x: -14, y: 2.05, z: -12.14 },
      rotationY: 0,
      maxWidth: 2.4,
      maxHeight: 2.35,
    },
    {
      id: 'wh-pillar-se',
      mapId: 'warehouse',
      imagePath: DEFAULT_AD_IMAGE,
      locationLabelFa: 'ستون آبی جنوب‌شرق (رو به مرکز انبار)',
      position: { x: 14, y: 2.05, z: 12.14 },
      rotationY: Math.PI,
      maxWidth: 2.4,
      maxHeight: 2.35,
    },
    {
      id: 'wh-container-east',
      mapId: 'warehouse',
      imagePath: DEFAULT_AD_IMAGE,
      locationLabelFa: 'دیواره داخلی کانتینر شرقی',
      position: { x: 32.64, y: 1.65, z: 0 },
      rotationY: -Math.PI / 2,
      maxWidth: 2.5,
      maxHeight: 2.2,
    },
  ],

  // MAP 2: بندر کانتینری شبانه (Neon Docks) — 3 billboards on shipping container flanks
  docks: [
    {
      id: 'dk-container-nw',
      mapId: 'docks',
      imagePath: DEFAULT_AD_IMAGE,
      locationLabelFa: 'دیواره شرقی کانتینر قرمز شمال‌غرب',
      position: { x: -7.34, y: 1.75, z: -8 },
      rotationY: Math.PI / 2,
      maxWidth: 2.5,
      maxHeight: 2.25,
    },
    {
      id: 'dk-container-se',
      mapId: 'docks',
      imagePath: DEFAULT_AD_IMAGE,
      locationLabelFa: 'دیواره غربی کانتینر آبی جنوب‌شرق',
      position: { x: 7.34, y: 1.75, z: 8 },
      rotationY: -Math.PI / 2,
      maxWidth: 2.5,
      maxHeight: 2.25,
    },
    {
      id: 'dk-container-ne',
      mapId: 'docks',
      imagePath: DEFAULT_AD_IMAGE,
      locationLabelFa: 'دیواره جنوبی کانتینر نارنجی شمال‌شرق',
      position: { x: 11, y: 1.75, z: -9.34 },
      rotationY: 0,
      maxWidth: 2.5,
      maxHeight: 2.25,
    },
  ],

  // MAP 3: پایگاه نظامی بیابانی (Desert Outpost) — 3 billboards on sandstone compound walls
  outpost: [
    {
      id: 'op-lwall-nw',
      mapId: 'outpost',
      imagePath: DEFAULT_AD_IMAGE,
      locationLabelFa: 'دیوار سنگی قلعه شمال‌غرب (رو به حیاط مرکزی)',
      position: { x: -9.5, y: 1.75, z: -9.14 },
      rotationY: 0,
      maxWidth: 2.5,
      maxHeight: 2.25,
    },
    {
      id: 'op-lwall-se',
      mapId: 'outpost',
      imagePath: DEFAULT_AD_IMAGE,
      locationLabelFa: 'دیوار سنگی قلعه جنوب‌شرق (رو به حیاط مرکزی)',
      position: { x: 9.5, y: 1.75, z: 9.14 },
      rotationY: Math.PI,
      maxWidth: 2.5,
      maxHeight: 2.25,
    },
    {
      id: 'op-outer-west',
      mapId: 'outpost',
      imagePath: DEFAULT_AD_IMAGE,
      locationLabelFa: 'دیوار غربی محوطه بیرونی پایگاه',
      position: { x: -31.84, y: 1.75, z: 0 },
      rotationY: Math.PI / 2,
      maxWidth: 2.5,
      maxHeight: 2.25,
    },
  ],

  // MAP 4: میدان دوئل ۱v۱ (Duel Arena) — Max 2 symmetrical billboards on outer perimeter walls
  duel: [
    {
      id: 'duel-wall-west',
      mapId: 'duel',
      imagePath: DEFAULT_AD_IMAGE,
      locationLabelFa: 'دیوار محیطی غربی (متقارن، دور از اسپاون و سنگرها)',
      position: { x: -18.24, y: 3.05, z: 0 },
      rotationY: Math.PI / 2,
      maxWidth: 2.4,
      maxHeight: 2.4,
    },
    {
      id: 'duel-wall-east',
      mapId: 'duel',
      imagePath: DEFAULT_AD_IMAGE,
      locationLabelFa: 'دیوار محیطی شرقی (متقارن، دور از اسپاون و سنگرها)',
      position: { x: 18.24, y: 3.05, z: 0 },
      rotationY: -Math.PI / 2,
      maxWidth: 2.4,
      maxHeight: 2.4,
    },
  ],
};

export const ALL_AD_BILLBOARDS: AdBillboardConfig[] = [
  ...AD_BILLBOARDS_BY_MAP.warehouse,
  ...AD_BILLBOARDS_BY_MAP.docks,
  ...AD_BILLBOARDS_BY_MAP.outpost,
  ...AD_BILLBOARDS_BY_MAP.duel,
];

export function getMapAdBillboards(mapId: MapId): AdBillboardConfig[] {
  return AD_BILLBOARDS_BY_MAP[mapId] || [];
}

/**
 * Only allows local self-hosted relative paths (blocks external http(s)://, data:, javascript:).
 * Returns null if invalid so broken/unsafe entries are safely skipped without crashing.
 */
export function resolveSafeLocalAdPath(imagePath: string): string | null {
  const trimmed = String(imagePath || '').trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) || trimmed.startsWith('//')) {
    return null;
  }
  if (trimmed.includes('..')) {
    return null;
  }
  return trimmed.startsWith('./') || trimmed.startsWith('/') ? trimmed : `./${trimmed}`;
}

/**
 * Computes exact billboard world width & height from the image's real natural aspect ratio
 * so the image fits inside [maxWidth, maxHeight] with ZERO stretching or distortion.
 */
export function computeBillboardDimensions(
  naturalWidth: number,
  naturalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const safeMaxW = Math.max(0.5, Math.min(3.5, Number.isFinite(maxWidth) ? maxWidth : 2.4));
  const safeMaxH = Math.max(0.5, Math.min(3.5, Number.isFinite(maxHeight) ? maxHeight : 2.2));
  if (
    !Number.isFinite(naturalWidth) ||
    !Number.isFinite(naturalHeight) ||
    naturalWidth <= 0 ||
    naturalHeight <= 0
  ) {
    return { width: safeMaxW, height: safeMaxH };
  }
  const aspect = naturalWidth / naturalHeight;
  let width = safeMaxW;
  let height = width / aspect;
  if (height > safeMaxH) {
    height = safeMaxH;
    width = height * aspect;
  }
  return {
    width: Math.round(width * 1000) / 1000,
    height: Math.round(height * 1000) / 1000,
  };
}
