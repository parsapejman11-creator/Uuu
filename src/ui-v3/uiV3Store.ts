/**
 * Pure, unit-testable state, persistence, adaptive Liquid Glass fallback engine,
 * 3-way UI mode switcher, independent v3 touch layout storage, and 10-15 Hz HUD snapshot helpers.
 *
 * ZERO React imports, ZERO DOM side-effects required for core logic, ZERO game/combat logic.
 */

import {
  getDefaultControlLayout,
  sanitizeControlLayout,
  type ControlSlotId,
  type ControlSlotLayout,
  type CustomControlsLayout,
} from '../game/controlLayout';
import type { HudLayoutPreset, WeaponId } from '../game/rules';

export type AppUiVersionId = 'legacy' | 'v2' | 'v3';
export type UiV3Stage = 'alpha' | 'beta';
export type UiV3ScreenState = 'title' | 'playing' | 'paused' | 'gameover';
export type UiV3GfxPresetName = 'promax' | 'ultramax' | 'ultra' | 'high' | 'med' | 'low' | 'potato';

/** Single source of truth for Liquid Glass UI maturity stage — flip here to promote Alpha -> Beta */
export const UI_V3_STAGE: UiV3Stage = 'alpha' as UiV3Stage;
export const UI_V3_STAGE_LABEL: string = UI_V3_STAGE === 'beta' ? 'Beta' : 'Alpha';
export const UI_V3_TITLE_FA = 'لیکوید گلس';
export const UI_V3_OPTION_LABEL_FA = `${UI_V3_TITLE_FA} · ${UI_V3_STAGE_LABEL}`;
export const UI_V3_STAGE_NOTICE_FA =
  UI_V3_STAGE === 'alpha'
    ? 'مرحلهٔ ۱ (Alpha) رابط لیکوید گلس — منوی اصلی و تنظیمات با شیشهٔ مایع بازطراحی شده‌اند؛ سایر صفحات فعلاً از رابط قبلی استفاده می‌کنند.'
    : 'رابط لیکوید گلس در مرحلهٔ Beta است و ممکن است چند جزئیات کوچک هنوز بهبود یابد.';

export const UI_V3_PENDING_SWITCH_MSG_FA = 'تغییر رابط کاربری پس از خروج از مسابقه اعمال می‌شود.';

export const UI_MODE_STORAGE_KEY = 'bodycam_ui_mode_v3';
export const LEGACY_UI_VERSION_STORAGE_KEY = 'bodycam_ui_version_v1';
export const UI_V3_PREFS_STORAGE_KEY = 'bodycam_ui_v3_prefs_v1';
export const UI_V3_PREFS_SCHEMA_VERSION = 1;
export const UI_V3_CONTROL_LAYOUT_STORAGE_KEY = 'bodycam_custom_controls_layout_ui_v3';
export const UI_V3_CONTROL_LAYOUT_SCHEMA_VERSION = 1;

/** Budget constants for Liquid Glass performance guarantees */
export const LIQUID_GLASS_MAX_BLUR_LAYERS = 3;
export const LIQUID_GLASS_LOW_FPS_THRESHOLD = 38;
export const HUD_V3_MIN_INTERVAL_MS = 80; // ~12.5 Hz (within 10-15 Hz requirement)

export interface UiV3Preferences {
  version: number;
  uiMode: AppUiVersionId;
  reduceTransparency: boolean;
  uiClickSound: boolean;
  uiHaptics: boolean;
}

export const DEFAULT_UI_V3_PREFERENCES: Readonly<UiV3Preferences> = Object.freeze({
  version: UI_V3_PREFS_SCHEMA_VERSION,
  uiMode: 'legacy',
  reduceTransparency: false,
  uiClickSound: true,
  uiHaptics: true,
});

export function isValidAppUiVersion(value: unknown): value is AppUiVersionId {
  return value === 'legacy' || value === 'v2' || value === 'v3';
}

export function validateUiV3Preferences(raw: unknown): UiV3Preferences {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_UI_V3_PREFERENCES };
  }
  const obj = raw as Record<string, unknown>;
  const uiMode: AppUiVersionId = isValidAppUiVersion(obj.uiMode) ? obj.uiMode : 'legacy';
  const reduceTransparency = typeof obj.reduceTransparency === 'boolean' ? obj.reduceTransparency : false;
  const uiClickSound = typeof obj.uiClickSound === 'boolean' ? obj.uiClickSound : true;
  const uiHaptics = typeof obj.uiHaptics === 'boolean' ? obj.uiHaptics : true;
  return {
    version: UI_V3_PREFS_SCHEMA_VERSION,
    uiMode,
    reduceTransparency,
    uiClickSound,
    uiHaptics,
  };
}

export function loadUiV3Preferences(storage?: Pick<Storage, 'getItem'> | null): UiV3Preferences {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    if (!store) return { ...DEFAULT_UI_V3_PREFERENCES };

    const rawV3 = store.getItem(UI_V3_PREFS_STORAGE_KEY);
    if (rawV3) {
      return validateUiV3Preferences(JSON.parse(rawV3));
    }

    // Seamless one-way read of existing v1/v2 preference without mutating legacy storage
    const rawLegacy = store.getItem(LEGACY_UI_VERSION_STORAGE_KEY);
    if (rawLegacy) {
      const parsed = JSON.parse(rawLegacy) as Record<string, unknown> | null;
      if (parsed && typeof parsed === 'object') {
        return validateUiV3Preferences({
          uiMode: isValidAppUiVersion(parsed.uiVersion) ? parsed.uiVersion : 'legacy',
          uiClickSound: typeof parsed.uiClickSound === 'boolean' ? parsed.uiClickSound : true,
          uiHaptics: typeof parsed.uiHaptics === 'boolean' ? parsed.uiHaptics : true,
          reduceTransparency: false,
        });
      }
    }
    return { ...DEFAULT_UI_V3_PREFERENCES };
  } catch {
    return { ...DEFAULT_UI_V3_PREFERENCES };
  }
}

export function saveUiV3Preferences(
  prefs: UiV3Preferences,
  storage?: Pick<Storage, 'setItem'> | null
): UiV3Preferences {
  const validated = validateUiV3Preferences(prefs);
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    if (store) {
      store.setItem(UI_V3_PREFS_STORAGE_KEY, JSON.stringify(validated));
      // Keep v1/v2 key updated ONLY for legacy/v2 values so existing ui-v2 remains compatible
      if (validated.uiMode === 'legacy' || validated.uiMode === 'v2') {
        store.setItem(
          LEGACY_UI_VERSION_STORAGE_KEY,
          JSON.stringify({
            version: 1,
            uiVersion: validated.uiMode,
            uiClickSound: validated.uiClickSound,
            uiHaptics: validated.uiHaptics,
          })
        );
      }
    }
  } catch {
    // Ignore storage quota or private browsing errors
  }
  return validated;
}

export interface ThreeWaySwitchResult {
  nextActiveUi: AppUiVersionId;
  nextPreferredUi: AppUiVersionId;
  deferred: boolean;
  noticeFa: string | null;
}

/**
 * Pure 3-way UI transition rule:
 * - In main menu ('title'): switches immediately between legacy / v2 / v3.
 * - Mid-match ('playing' | 'paused' | 'gameover'): saves preference immediately,
 *   defers visual switch until exiting match, and returns a clear Persian notice.
 */
export function resolveThreeWayUiSwitch(
  currentActiveUi: AppUiVersionId,
  targetUi: AppUiVersionId,
  screenState: UiV3ScreenState
): ThreeWaySwitchResult {
  const safeTarget: AppUiVersionId = isValidAppUiVersion(targetUi) ? targetUi : 'legacy';
  if (screenState === 'title') {
    return {
      nextActiveUi: safeTarget,
      nextPreferredUi: safeTarget,
      deferred: false,
      noticeFa: null,
    };
  }
  if (safeTarget === currentActiveUi) {
    return {
      nextActiveUi: currentActiveUi,
      nextPreferredUi: safeTarget,
      deferred: false,
      noticeFa: null,
    };
  }
  return {
    nextActiveUi: currentActiveUi,
    nextPreferredUi: safeTarget,
    deferred: true,
    noticeFa: UI_V3_PENDING_SWITCH_MSG_FA,
  };
}

/** Independent touch button layout storage for UI v3 (never overwrites Legacy or UI v2 layouts) */
export function loadV3ControlLayout(
  preset: HudLayoutPreset = 'standard',
  storage?: Pick<Storage, 'getItem'> | null
): CustomControlsLayout {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    if (!store) return getDefaultControlLayout(preset);
    const raw = store.getItem(UI_V3_CONTROL_LAYOUT_STORAGE_KEY);
    if (!raw) return getDefaultControlLayout(preset);
    const parsed = JSON.parse(raw) as
      | { version?: number; layout?: Partial<Record<ControlSlotId, Partial<ControlSlotLayout>>> }
      | Partial<Record<ControlSlotId, Partial<ControlSlotLayout>>>;
    const candidate =
      parsed && typeof parsed === 'object' && 'layout' in parsed && parsed.layout && typeof parsed.layout === 'object'
        ? parsed.layout
        : (parsed as Partial<Record<ControlSlotId, Partial<ControlSlotLayout>>>);
    return sanitizeControlLayout(candidate, preset);
  } catch {
    return getDefaultControlLayout(preset);
  }
}

export function saveV3ControlLayout(
  layout: CustomControlsLayout,
  storage?: Pick<Storage, 'setItem'> | null
): void {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    if (store) {
      store.setItem(
        UI_V3_CONTROL_LAYOUT_STORAGE_KEY,
        JSON.stringify({
          version: UI_V3_CONTROL_LAYOUT_SCHEMA_VERSION,
          layout,
        })
      );
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function resetV3ControlLayoutStorage(storage?: Pick<Storage, 'removeItem'> | null): void {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    if (store) {
      store.removeItem(UI_V3_CONTROL_LAYOUT_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

/** Adaptive Liquid Glass material mode & automatic degradation */
export type LiquidGlassMode = 'liquid' | 'simple' | 'solid';

export type LiquidGlassFallbackReason =
  | 'optimal'
  | 'gameplay-hud-zero-blur'
  | 'reduce-transparency'
  | 'unsupported-backdrop-filter'
  | 'reduced-motion'
  | 'low-graphics-preset'
  | 'low-fps-fallback'
  | 'scene-rendering';

export interface LiquidGlassCapabilitiesInput {
  supportsBackdropFilter: boolean;
  gfxPreset: UiV3GfxPresetName;
  reducedMotion: boolean;
  reduceTransparency: boolean;
  /** Latest measured active FPS (0 or null when not yet measured / paused) */
  currentFps: number | null;
  /** True when rendering gameplay HUD (NEVER allows backdrop-filter) */
  isInGameplayHud: boolean;
  /** True when 3D scene behind menu is paused */
  isScenePaused: boolean;
}

export interface LiquidGlassResolution {
  mode: LiquidGlassMode;
  blurEnabled: boolean;
  maxBlurLayers: number;
  reason: LiquidGlassFallbackReason;
  labelFa: string;
}

export function detectBackdropFilterSupport(): boolean {
  try {
    if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false;
    return (
      CSS.supports('backdrop-filter', 'blur(12px)') ||
      CSS.supports('-webkit-backdrop-filter', 'blur(12px)')
    );
  } catch {
    return false;
  }
}

export function resolveLiquidGlassCapabilities(
  input: LiquidGlassCapabilitiesInput
): LiquidGlassResolution {
  if (input.isInGameplayHud) {
    return {
      mode: input.reduceTransparency ? 'solid' : 'simple',
      blurEnabled: false,
      maxBlurLayers: 0,
      reason: 'gameplay-hud-zero-blur',
      labelFa: input.reduceTransparency ? 'مات خوانا (HUD)' : 'شفاف سبک بدون تارشدگی (HUD)',
    };
  }

  if (input.reduceTransparency) {
    return {
      mode: 'solid',
      blurEnabled: false,
      maxBlurLayers: 0,
      reason: 'reduce-transparency',
      labelFa: 'مات با خوانایی بالا (کاهش شفافیت فعال)',
    };
  }

  if (!input.supportsBackdropFilter) {
    return {
      mode: 'simple',
      blurEnabled: false,
      maxBlurLayers: 0,
      reason: 'unsupported-backdrop-filter',
      labelFa: 'شفاف ساده (مرورگر بدون پشتیبانی Blur)',
    };
  }

  if (input.reducedMotion) {
    return {
      mode: 'simple',
      blurEnabled: false,
      maxBlurLayers: 0,
      reason: 'reduced-motion',
      labelFa: 'شفاف ساده (کاهش حرکت و افکت‌ها)',
    };
  }

  if (input.gfxPreset === 'low' || input.gfxPreset === 'potato') {
    return {
      mode: 'simple',
      blurEnabled: false,
      maxBlurLayers: 0,
      reason: 'low-graphics-preset',
      labelFa: 'شفاف ساده (تنظیم گرافیک سبک)',
    };
  }

  if (
    typeof input.currentFps === 'number' &&
    Number.isFinite(input.currentFps) &&
    input.currentFps > 0 &&
    input.currentFps < LIQUID_GLASS_LOW_FPS_THRESHOLD
  ) {
    return {
      mode: 'simple',
      blurEnabled: false,
      maxBlurLayers: 0,
      reason: 'low-fps-fallback',
      labelFa: 'شفاف ساده (بهینه‌سازی خودکار FPS)',
    };
  }

  if (!input.isScenePaused) {
    return {
      mode: 'simple',
      blurEnabled: false,
      maxBlurLayers: 0,
      reason: 'scene-rendering',
      labelFa: 'شفاف سبک (صحنه سه‌بعدی فعال)',
    };
  }

  return {
    mode: 'liquid',
    blurEnabled: true,
    maxBlurLayers: LIQUID_GLASS_MAX_BLUR_LAYERS,
    reason: 'optimal',
    labelFa: 'شیشهٔ مایع فعال (صحنه متوقف · حداکثر ۳ لایه)',
  };
}

/** Throttled low-frequency gameplay HUD snapshot (10-15 Hz, never per-frame) */
export interface HudSnapshotV3 {
  hp: number;
  maxHp: number;
  ammo: number;
  reserve: number;
  weaponId: WeaponId;
  weaponName: string;
  reloading: boolean;
  score: number;
  wave: number;
  aliveEnemies: number;
  fps: number | null;
  pingMs: number | null;
  isOnline: boolean;
  isPlaying: boolean;
  capturedAtMs: number;
}

export function shouldEmitHudSnapshot(
  lastEmitMs: number,
  nowMs: number,
  minIntervalMs: number = HUD_V3_MIN_INTERVAL_MS
): boolean {
  if (!Number.isFinite(nowMs)) return false;
  if (!Number.isFinite(lastEmitMs) || lastEmitMs <= 0) return true;
  return nowMs - lastEmitMs >= minIntervalMs;
}

export function hasHudSnapshotChanged(prev: HudSnapshotV3 | null, next: HudSnapshotV3): boolean {
  if (!prev) return true;
  return (
    prev.hp !== next.hp ||
    prev.maxHp !== next.maxHp ||
    prev.ammo !== next.ammo ||
    prev.reserve !== next.reserve ||
    prev.weaponId !== next.weaponId ||
    prev.weaponName !== next.weaponName ||
    prev.reloading !== next.reloading ||
    prev.score !== next.score ||
    prev.wave !== next.wave ||
    prev.aliveEnemies !== next.aliveEnemies ||
    prev.fps !== next.fps ||
    prev.pingMs !== next.pingMs ||
    prev.isOnline !== next.isOnline ||
    prev.isPlaying !== next.isPlaying
  );
}
