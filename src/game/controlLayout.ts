import type { HudLayoutPreset } from './rules';

export type ControlSlotId =
  | 'joystick'
  | 'fire'
  | 'ads'
  | 'jump'
  | 'reload'
  | 'swap'
  | 'lean'
  | 'power'
  | 'voice'
  | 'slide'
  | 'emote';

export interface ControlSlotLayout {
  id: ControlSlotId;
  xPct: number; // Center X in % of viewport width (5..95)
  yPct: number; // Center Y in % of viewport height (12..93)
  scale: number; // 0.65..1.6
  opacity: number; // 0.25..1.0
}

export type CustomControlsLayout = Record<ControlSlotId, ControlSlotLayout>;

export interface ControlSlotMeta {
  id: ControlSlotId;
  labelFa: string;
  shortLabel: string;
  baseSizePx: number;
  accentColor: string;
}

export const CONTROL_SLOT_META: Record<ControlSlotId, ControlSlotMeta> = {
  joystick: {
    id: 'joystick',
    labelFa: 'جوی‌استیک حرکت',
    shortLabel: 'MOVE',
    baseSizePx: 88,
    accentColor: '#e2e8f0',
  },
  fire: {
    id: 'fire',
    labelFa: 'دکمه شلیک (Fire)',
    shortLabel: 'FIRE',
    baseSizePx: 60,
    accentColor: '#f43f5e',
  },
  ads: {
    id: 'ads',
    labelFa: 'نشانه‌گیری (ADS)',
    shortLabel: 'ADS',
    baseSizePx: 40,
    accentColor: '#38bdf8',
  },
  jump: {
    id: 'jump',
    labelFa: 'پرش (Jump)',
    shortLabel: 'JUMP',
    baseSizePx: 40,
    accentColor: '#e2e8f0',
  },
  reload: {
    id: 'reload',
    labelFa: 'ریلود (Reload)',
    shortLabel: 'RLD',
    baseSizePx: 38,
    accentColor: '#e2e8f0',
  },
  swap: {
    id: 'swap',
    labelFa: 'سلاح بعدی (Next)',
    shortLabel: 'SWAP',
    baseSizePx: 38,
    accentColor: '#38bdf8',
  },
  lean: {
    id: 'lean',
    labelFa: 'زاویه دیوار (LEAN)',
    shortLabel: 'LEAN',
    baseSizePx: 38,
    accentColor: '#94a3b8',
  },
  power: {
    id: 'power',
    labelFa: 'آدرنالین (Power)',
    shortLabel: 'PWR',
    baseSizePx: 38,
    accentColor: '#38bdf8',
  },
  voice: {
    id: 'voice',
    labelFa: 'میکروفون چت صوتی (MIC)',
    shortLabel: 'MIC',
    baseSizePx: 36,
    accentColor: '#38bdf8',
  },
  slide: {
    id: 'slide',
    labelFa: 'اسلاید تاکتیکی (Slide · Beta)',
    shortLabel: 'SLIDE',
    baseSizePx: 38,
    accentColor: '#38bdf8',
  },
  emote: {
    id: 'emote',
    labelFa: 'ایموت میتیک (رقص)',
    shortLabel: 'EMOTE',
    baseSizePx: 36,
    accentColor: '#ff2a55',
  },
};

export const ALL_CONTROL_SLOT_IDS: ControlSlotId[] = [
  'joystick',
  'fire',
  'ads',
  'jump',
  'reload',
  'swap',
  'lean',
  'power',
  'voice',
  'slide',
  'emote',
];

export const CONTROL_LAYOUT_STORAGE_KEY = 'bodycam_custom_controls_layout_v1';
export const LEAN_HUD_BUTTONS_STORAGE_KEY = 'bodycam_show_lean_hud_buttons_v1';
export const HUD_SHOW_FPS_STORAGE_KEY = 'bodycam_show_fps_hud_v1';
export const HUD_CROSSHAIR_SIZE_STORAGE_KEY = 'bodycam_crosshair_size_v1';
export const HUD_CROSSHAIR_STYLE_STORAGE_KEY = 'bodycam_crosshair_style_v1';
export const HUD_SHOW_PING_STORAGE_KEY = 'bodycam_show_ping_hud_v1';
export const HUD_FOOTSTEP_VOLUME_STORAGE_KEY = 'bodycam_footstep_volume_v1';
export const AIM_ASSIST_STRENGTH_STORAGE_KEY = 'bodycam_aim_assist_strength_v1';
export const SLIDE_ALPHA_ENABLED_STORAGE_KEY = 'bodycam_slide_beta_enabled_v1';
const LEGACY_SLIDE_ALPHA_STORAGE_KEY = 'bodycam_slide_alpha_enabled_v1';
export const VIBRATION_ENABLED_STORAGE_KEY = 'bodycam_vibration_enabled_v1';
export const AUTO_RELOAD_ENABLED_STORAGE_KEY = 'bodycam_auto_reload_enabled_v1';
export const SHOW_AD_BILLBOARDS_STORAGE_KEY = 'bodycam_show_ad_billboards_v1';
export const CAMERA_MOTION_INTENSITY_STORAGE_KEY = 'bodycam_camera_motion_intensity_v1';
export const REDUCED_MOTION_STORAGE_KEY = 'bodycam_reduced_motion_v1';
export const AUTO_QUALITY_STORAGE_KEY = 'bodycam_auto_quality_v1';
export const SHOW_PERF_PROFILER_STORAGE_KEY = 'bodycam_show_perf_profiler_v1';

export type CrosshairStyle = 'cross' | 'dot';

export function getDefaultControlLayout(preset: HudLayoutPreset = 'standard'): CustomControlsLayout {
  if (preset === 'lefthanded') {
    return {
      joystick: { id: 'joystick', xPct: 86, yPct: 74, scale: 1, opacity: 0.78 },
      fire: { id: 'fire', xPct: 12, yPct: 72, scale: 1, opacity: 0.85 },
      ads: { id: 'ads', xPct: 24, yPct: 77, scale: 1, opacity: 0.78 },
      jump: { id: 'jump', xPct: 10, yPct: 50, scale: 1, opacity: 0.78 },
      reload: { id: 'reload', xPct: 22, yPct: 58, scale: 1, opacity: 0.78 },
      swap: { id: 'swap', xPct: 11, yPct: 33, scale: 1, opacity: 0.78 },
      lean: { id: 'lean', xPct: 90, yPct: 45, scale: 1, opacity: 0.6 },
      power: { id: 'power', xPct: 78, yPct: 48, scale: 1, opacity: 0.6 },
      voice: { id: 'voice', xPct: 90, yPct: 30, scale: 1, opacity: 0.62 },
      slide: { id: 'slide', xPct: 24, yPct: 42, scale: 1, opacity: 0.78 },
      emote: { id: 'emote', xPct: 78, yPct: 30, scale: 1, opacity: 0.78 },
    };
  }
  if (preset === 'claw') {
    return {
      joystick: { id: 'joystick', xPct: 13, yPct: 74, scale: 1, opacity: 0.78 },
      fire: { id: 'fire', xPct: 89, yPct: 40, scale: 1.05, opacity: 0.85 },
      ads: { id: 'ads', xPct: 11, yPct: 38, scale: 1, opacity: 0.78 },
      jump: { id: 'jump', xPct: 89, yPct: 74, scale: 1, opacity: 0.78 },
      reload: { id: 'reload', xPct: 77, yPct: 68, scale: 1, opacity: 0.78 },
      swap: { id: 'swap', xPct: 78, yPct: 48, scale: 1, opacity: 0.78 },
      lean: { id: 'lean', xPct: 22, yPct: 48, scale: 1, opacity: 0.6 },
      power: { id: 'power', xPct: 77, yPct: 83, scale: 1, opacity: 0.6 },
      voice: { id: 'voice', xPct: 22, yPct: 32, scale: 1, opacity: 0.62 },
      slide: { id: 'slide', xPct: 66, yPct: 76, scale: 1, opacity: 0.78 },
      emote: { id: 'emote', xPct: 32, yPct: 32, scale: 1, opacity: 0.78 },
    };
  }
  // Standard ergonomic layout (clean mobile landscape & portrait clearance around bottom HUD)
  return {
    joystick: { id: 'joystick', xPct: 13, yPct: 74, scale: 1, opacity: 0.78 },
    fire: { id: 'fire', xPct: 88, yPct: 72, scale: 1, opacity: 0.85 },
    ads: { id: 'ads', xPct: 76, yPct: 77, scale: 1, opacity: 0.78 },
    jump: { id: 'jump', xPct: 90, yPct: 50, scale: 1, opacity: 0.78 },
    reload: { id: 'reload', xPct: 78, yPct: 58, scale: 1, opacity: 0.78 },
    swap: { id: 'swap', xPct: 89, yPct: 33, scale: 1, opacity: 0.78 },
    lean: { id: 'lean', xPct: 12, yPct: 45, scale: 1, opacity: 0.6 },
    power: { id: 'power', xPct: 22, yPct: 45, scale: 1, opacity: 0.6 },
    voice: { id: 'voice', xPct: 10, yPct: 31, scale: 1, opacity: 0.62 },
    slide: { id: 'slide', xPct: 67, yPct: 66, scale: 1, opacity: 0.78 },
    emote: { id: 'emote', xPct: 21, yPct: 31, scale: 1, opacity: 0.78 },
  };
}

export function clampControlSlot(
  id: ControlSlotId,
  raw: Partial<ControlSlotLayout> | undefined,
  fallback: ControlSlotLayout
): ControlSlotLayout {
  const xRaw = typeof raw?.xPct === 'number' && Number.isFinite(raw.xPct) ? raw.xPct : fallback.xPct;
  const yRaw = typeof raw?.yPct === 'number' && Number.isFinite(raw.yPct) ? raw.yPct : fallback.yPct;
  const scaleRaw = typeof raw?.scale === 'number' && Number.isFinite(raw.scale) ? raw.scale : fallback.scale;
  const opacityRaw =
    typeof raw?.opacity === 'number' && Number.isFinite(raw.opacity) ? raw.opacity : fallback.opacity;

  return {
    id,
    xPct: Math.round(Math.max(5, Math.min(95, xRaw)) * 10) / 10,
    yPct: Math.round(Math.max(12, Math.min(93, yRaw)) * 10) / 10,
    scale: Math.round(Math.max(0.65, Math.min(1.6, scaleRaw)) * 100) / 100,
    opacity: Math.round(Math.max(0.25, Math.min(1.0, opacityRaw)) * 100) / 100,
  };
}

export function sanitizeControlLayout(
  input: Partial<Record<ControlSlotId, Partial<ControlSlotLayout>>> | null | undefined,
  preset: HudLayoutPreset = 'standard'
): CustomControlsLayout {
  const defaults = getDefaultControlLayout(preset);
  const result = {} as CustomControlsLayout;
  for (const id of ALL_CONTROL_SLOT_IDS) {
    result[id] = clampControlSlot(id, input?.[id], defaults[id]);
  }
  return result;
}

export function loadSavedControlLayout(preset: HudLayoutPreset = 'standard'): CustomControlsLayout {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return getDefaultControlLayout(preset);
    }
    const raw = window.localStorage.getItem(CONTROL_LAYOUT_STORAGE_KEY);
    if (!raw) return getDefaultControlLayout(preset);
    const parsed = JSON.parse(raw) as Partial<Record<ControlSlotId, Partial<ControlSlotLayout>>>;
    return sanitizeControlLayout(parsed, preset);
  } catch {
    return getDefaultControlLayout(preset);
  }
}

export function saveControlLayout(layout: CustomControlsLayout): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(CONTROL_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    }
  } catch {
    // ignore storage quota errors
  }
}

export function resetControlLayoutStorage(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(CONTROL_LAYOUT_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export function loadShowLeanHudButtons(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    return window.localStorage.getItem(LEAN_HUD_BUTTONS_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveShowLeanHudButtons(show: boolean): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LEAN_HUD_BUTTONS_STORAGE_KEY, show ? 'true' : 'false');
    }
  } catch {
    // ignore
  }
}

export function loadShowFpsHud(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    return window.localStorage.getItem(HUD_SHOW_FPS_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveShowFpsHud(show: boolean): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(HUD_SHOW_FPS_STORAGE_KEY, show ? 'true' : 'false');
    }
  } catch {
    // ignore
  }
}

export function clampCrosshairSize(scale: number): number {
  if (!Number.isFinite(scale)) return 1.0;
  return Math.round(Math.max(0.5, Math.min(1.8, scale)) * 100) / 100;
}

export function loadCrosshairSize(): number {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return 1.0;
    const raw = window.localStorage.getItem(HUD_CROSSHAIR_SIZE_STORAGE_KEY);
    if (!raw) return 1.0;
    return clampCrosshairSize(parseFloat(raw));
  } catch {
    return 1.0;
  }
}

export function saveCrosshairSize(scale: number): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(HUD_CROSSHAIR_SIZE_STORAGE_KEY, String(clampCrosshairSize(scale)));
    }
  } catch {
    // ignore
  }
}

export function loadCrosshairStyle(): CrosshairStyle {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return 'cross';
    return window.localStorage.getItem(HUD_CROSSHAIR_STYLE_STORAGE_KEY) === 'dot' ? 'dot' : 'cross';
  } catch {
    return 'cross';
  }
}

export function saveCrosshairStyle(style: CrosshairStyle): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(HUD_CROSSHAIR_STYLE_STORAGE_KEY, style);
    }
  } catch {
    // ignore
  }
}

export function loadShowPingHud(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return true;
    return window.localStorage.getItem(HUD_SHOW_PING_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function saveShowPingHud(show: boolean): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(HUD_SHOW_PING_STORAGE_KEY, show ? 'true' : 'false');
    }
  } catch {
    // ignore
  }
}

export function clampFootstepVolume(vol: number): number {
  if (!Number.isFinite(vol)) return 0.55;
  return Math.round(Math.max(0, Math.min(1, vol)) * 100) / 100;
}

export function loadFootstepVolume(): number {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return 0.55;
    const raw = window.localStorage.getItem(HUD_FOOTSTEP_VOLUME_STORAGE_KEY);
    if (raw === null) return 0.55;
    return clampFootstepVolume(parseFloat(raw));
  } catch {
    return 0.55;
  }
}

export function saveFootstepVolume(vol: number): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(HUD_FOOTSTEP_VOLUME_STORAGE_KEY, String(clampFootstepVolume(vol)));
    }
  } catch {
    // ignore
  }
}

export function clampAimAssistStrength(value: number): number {
  if (!Number.isFinite(value)) return 70;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function loadAimAssistStrength(): number {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return 70;
    const raw = window.localStorage.getItem(AIM_ASSIST_STRENGTH_STORAGE_KEY);
    if (raw === null) return 70;
    return clampAimAssistStrength(parseFloat(raw));
  } catch {
    return 70;
  }
}

export function saveAimAssistStrength(value: number): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(AIM_ASSIST_STRENGTH_STORAGE_KEY, String(clampAimAssistStrength(value)));
    }
  } catch {
    // ignore
  }
}

export function loadSlideAlphaEnabled(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return true;
    return window.localStorage.getItem(SLIDE_ALPHA_ENABLED_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function saveSlideAlphaEnabled(enabled: boolean): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(SLIDE_ALPHA_ENABLED_STORAGE_KEY, enabled ? 'true' : 'false');
    }
  } catch {
    // ignore
  }
}

export function loadVibrationEnabled(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return true;
    return window.localStorage.getItem(VIBRATION_ENABLED_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function saveVibrationEnabled(enabled: boolean): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(VIBRATION_ENABLED_STORAGE_KEY, enabled ? 'true' : 'false');
    }
  } catch {
    // ignore
  }
}

export function loadAutoReloadEnabled(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return true;
    return window.localStorage.getItem(AUTO_RELOAD_ENABLED_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function saveAutoReloadEnabled(enabled: boolean): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(AUTO_RELOAD_ENABLED_STORAGE_KEY, enabled ? 'true' : 'false');
    }
  } catch {
    // ignore
  }
}

export function loadShowAdBillboards(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return true;
    return window.localStorage.getItem(SHOW_AD_BILLBOARDS_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function saveShowAdBillboards(enabled: boolean): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(SHOW_AD_BILLBOARDS_STORAGE_KEY, enabled ? 'true' : 'false');
    }
  } catch {
    // ignore
  }
}

export function clampCameraMotionIntensity(value: number): number {
  if (!Number.isFinite(value)) return 65;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function loadCameraMotionIntensity(): number {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return 65;
    const raw = window.localStorage.getItem(CAMERA_MOTION_INTENSITY_STORAGE_KEY);
    if (raw === null) return 65;
    return clampCameraMotionIntensity(parseFloat(raw));
  } catch {
    return 65;
  }
}

export function saveCameraMotionIntensity(value: number): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(CAMERA_MOTION_INTENSITY_STORAGE_KEY, String(clampCameraMotionIntensity(value)));
    }
  } catch {
    // ignore
  }
}

export function loadReducedMotionEnabled(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const raw = window.localStorage.getItem(REDUCED_MOTION_STORAGE_KEY);
    if (raw === null) return false;
    return raw === 'true';
  } catch {
    return false;
  }
}

export function saveReducedMotionEnabled(enabled: boolean): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(REDUCED_MOTION_STORAGE_KEY, enabled ? 'true' : 'false');
    }
  } catch {
    // ignore
  }
}

export function loadAutoQualityEnabled(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return true;
    return window.localStorage.getItem(AUTO_QUALITY_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function saveAutoQualityEnabled(enabled: boolean): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(AUTO_QUALITY_STORAGE_KEY, enabled ? 'true' : 'false');
    }
  } catch {
    // ignore
  }
}

export function loadShowPerfProfiler(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    return window.localStorage.getItem(SHOW_PERF_PROFILER_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveShowPerfProfiler(show: boolean): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(SHOW_PERF_PROFILER_STORAGE_KEY, show ? 'true' : 'false');
    }
  } catch {
    // ignore
  }
}

export type HapticFeedbackKind = 'hit' | 'kill' | 'damage';

export function triggerHapticFeedback(enabled: boolean, kind: HapticFeedbackKind): void {
  if (!enabled) return;
  try {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    if (kind === 'hit') {
      navigator.vibrate(14);
    } else if (kind === 'kill') {
      navigator.vibrate([22, 26, 30]);
    } else if (kind === 'damage') {
      navigator.vibrate(32);
    }
  } catch {
    // Ignore browser/device restrictions
  }
}

export const ALL_SETTINGS_STORAGE_KEYS: string[] = [
  CONTROL_LAYOUT_STORAGE_KEY,
  LEAN_HUD_BUTTONS_STORAGE_KEY,
  HUD_SHOW_FPS_STORAGE_KEY,
  HUD_CROSSHAIR_SIZE_STORAGE_KEY,
  HUD_CROSSHAIR_STYLE_STORAGE_KEY,
  HUD_SHOW_PING_STORAGE_KEY,
  HUD_FOOTSTEP_VOLUME_STORAGE_KEY,
  AIM_ASSIST_STRENGTH_STORAGE_KEY,
  SLIDE_ALPHA_ENABLED_STORAGE_KEY,
  LEGACY_SLIDE_ALPHA_STORAGE_KEY,
  VIBRATION_ENABLED_STORAGE_KEY,
  AUTO_RELOAD_ENABLED_STORAGE_KEY,
  SHOW_AD_BILLBOARDS_STORAGE_KEY,
  CAMERA_MOTION_INTENSITY_STORAGE_KEY,
  REDUCED_MOTION_STORAGE_KEY,
  AUTO_QUALITY_STORAGE_KEY,
  SHOW_PERF_PROFILER_STORAGE_KEY,
];

export function resetAllStoredSettings(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    for (const key of ALL_SETTINGS_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // ignore storage errors
  }
}


