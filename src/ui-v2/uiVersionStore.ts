/**
 * Versioned persistence and pure state helpers for UI v2 (Alpha) alongside Legacy UI.
 * - Default is ALWAYS 'legacy' so existing users see zero unintended changes.
 * - Touch control layout for UI v2 is stored under its own independent key so Legacy layout is never overwritten.
 * - All localStorage operations are wrapped in try/catch with strict schema validation.
 */

import {
  getDefaultControlLayout,
  sanitizeControlLayout,
  type ControlSlotId,
  type ControlSlotLayout,
  type CustomControlsLayout,
} from '../game/controlLayout';
import type { HudLayoutPreset } from '../game/rules';

export type UiScreenState = 'title' | 'playing' | 'paused' | 'gameover';
export type UiPlayMode = 'campaign' | 'training';
export type UiGfxPresetName = 'promax' | 'ultramax' | 'ultra' | 'high' | 'med' | 'low' | 'potato';

export type UiVersionId = 'legacy' | 'v2';

export const UI_VERSION_STORAGE_KEY = 'bodycam_ui_version_v1';
export const UI_VERSION_SCHEMA_VERSION = 1;

export const UI_V2_CONTROL_LAYOUT_STORAGE_KEY = 'bodycam_custom_controls_layout_ui_v2';
export const UI_V2_CONTROL_LAYOUT_SCHEMA_VERSION = 1;

export type UiV2Stage = 'alpha' | 'beta';
export const UI_V2_STAGE: UiV2Stage = 'beta';
export const UI_V2_STAGE_LABEL: string = UI_V2_STAGE === 'beta' ? 'Beta' : 'Alpha';
export const UI_V2_STAGE_NOTICE_FA =
  UI_V2_STAGE === 'beta'
    ? 'این رابط تقریباً کامله ولی ممکنه چند مورد کوچک هنوز مشکل داشته باشه.'
    : 'این رابط هنوز کامل نشده و بعضی بخش‌ها ممکنه شبیه نسخهٔ قدیمی باشن.';

// Backwards-compatible aliases referencing the single UI_V2_STAGE constant
export const UI_V2_ALPHA_LABEL = UI_V2_STAGE_LABEL;
export const UI_V2_ALPHA_DISCLAIMER_FA = UI_V2_STAGE_NOTICE_FA;
export const UI_V2_PENDING_SWITCH_MSG_FA =
  'تغییر رابط کاربری پس از خروج از مسابقه اعمال می‌شود.';

export interface UiV2Preferences {
  version: number;
  uiVersion: UiVersionId;
  uiClickSound: boolean;
  uiHaptics: boolean;
}

export const DEFAULT_UI_V2_PREFERENCES: UiV2Preferences = Object.freeze({
  version: UI_VERSION_SCHEMA_VERSION,
  uiVersion: 'legacy',
  uiClickSound: true,
  uiHaptics: true,
});

export function validateUiV2Preferences(raw: unknown): UiV2Preferences {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_UI_V2_PREFERENCES };
  }
  const obj = raw as Record<string, unknown>;
  const uiVersion: UiVersionId = obj.uiVersion === 'v2' ? 'v2' : 'legacy';
  const uiClickSound = typeof obj.uiClickSound === 'boolean' ? obj.uiClickSound : true;
  const uiHaptics = typeof obj.uiHaptics === 'boolean' ? obj.uiHaptics : true;
  return {
    version: UI_VERSION_SCHEMA_VERSION,
    uiVersion,
    uiClickSound,
    uiHaptics,
  };
}

export function loadUiV2Preferences(): UiV2Preferences {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ...DEFAULT_UI_V2_PREFERENCES };
    }
    const raw = window.localStorage.getItem(UI_VERSION_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_UI_V2_PREFERENCES };
    return validateUiV2Preferences(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_UI_V2_PREFERENCES };
  }
}

export function saveUiV2Preferences(prefs: UiV2Preferences): UiV2Preferences {
  const validated = validateUiV2Preferences(prefs);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(UI_VERSION_STORAGE_KEY, JSON.stringify(validated));
    }
  } catch {
    // Ignore storage quota or private-mode restrictions
  }
  return validated;
}

export function loadV2ControlLayout(preset: HudLayoutPreset = 'standard'): CustomControlsLayout {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return getDefaultControlLayout(preset);
    }
    const raw = window.localStorage.getItem(UI_V2_CONTROL_LAYOUT_STORAGE_KEY);
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

export function saveV2ControlLayout(layout: CustomControlsLayout): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const payload = {
        version: UI_V2_CONTROL_LAYOUT_SCHEMA_VERSION,
        layout,
      };
      window.localStorage.setItem(UI_V2_CONTROL_LAYOUT_STORAGE_KEY, JSON.stringify(payload));
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function resetV2ControlLayoutStorage(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(UI_V2_CONTROL_LAYOUT_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export interface UiSwitchTransitionResult {
  nextActiveUi: UiVersionId;
  nextPreferredUi: UiVersionId;
  deferred: boolean;
  noticeFa: string | null;
}

/**
 * Pure transition rule:
 * - In menus ('title'): switch applies immediately.
 * - Mid-match ('playing' | 'paused' | 'gameover'): preference is saved immediately,
 *   but active UI remains stable until exiting the match, returning a short Persian notice.
 */
export function resolveUiSwitchTransition(
  currentActiveUi: UiVersionId,
  targetUi: UiVersionId,
  screenState: UiScreenState
): UiSwitchTransitionResult {
  if (screenState === 'title') {
    return {
      nextActiveUi: targetUi,
      nextPreferredUi: targetUi,
      deferred: false,
      noticeFa: null,
    };
  }
  if (targetUi === currentActiveUi) {
    return {
      nextActiveUi: currentActiveUi,
      nextPreferredUi: targetUi,
      deferred: false,
      noticeFa: null,
    };
  }
  return {
    nextActiveUi: currentActiveUi,
    nextPreferredUi: targetUi,
    deferred: true,
    noticeFa: UI_V2_PENDING_SWITCH_MSG_FA,
  };
}

export type QuickGraphicsTier = 'auto' | 'low' | 'med' | 'high';

export function resolveQuickGraphicsPreset(tier: QuickGraphicsTier): {
  preset: UiGfxPresetName;
  autoQuality: boolean;
} {
  if (tier === 'auto') {
    return { preset: 'high', autoQuality: true };
  }
  if (tier === 'low') {
    return { preset: 'low', autoQuality: false };
  }
  if (tier === 'med') {
    return { preset: 'med', autoQuality: false };
  }
  return { preset: 'high', autoQuality: false };
}

export function getActiveQuickGraphicsTier(preset: UiGfxPresetName, autoQuality: boolean): QuickGraphicsTier | null {
  if (autoQuality) return 'auto';
  if (preset === 'low' || preset === 'potato') return 'low';
  if (preset === 'med') return 'med';
  if (preset === 'high' || preset === 'ultra' || preset === 'ultramax' || preset === 'promax') return 'high';
  return null;
}
