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
  | 'voice';

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
    baseSizePx: 102,
    accentColor: '#00f0ff',
  },
  fire: {
    id: 'fire',
    labelFa: 'دکمه شلیک (Fire)',
    shortLabel: 'FIRE',
    baseSizePx: 72,
    accentColor: '#ff4d6d',
  },
  ads: {
    id: 'ads',
    labelFa: 'نشانه‌گیری (ADS)',
    shortLabel: 'ADS',
    baseSizePx: 48,
    accentColor: '#38bdf8',
  },
  jump: {
    id: 'jump',
    labelFa: 'پرش (Jump)',
    shortLabel: 'JUMP',
    baseSizePx: 48,
    accentColor: '#e2e8f0',
  },
  reload: {
    id: 'reload',
    labelFa: 'ریلود (Reload)',
    shortLabel: 'RLD',
    baseSizePx: 46,
    accentColor: '#38bdf8',
  },
  swap: {
    id: 'swap',
    labelFa: 'سلاح بعدی (Next)',
    shortLabel: 'گان بعدی',
    baseSizePx: 46,
    accentColor: '#ffbe0b',
  },
  lean: {
    id: 'lean',
    labelFa: 'زاویه دیوار (LEAN)',
    shortLabel: 'LEAN',
    baseSizePx: 48,
    accentColor: '#ffbe0b',
  },
  power: {
    id: 'power',
    labelFa: 'آدرنالین (Power)',
    shortLabel: 'PWR',
    baseSizePx: 46,
    accentColor: '#00f0ff',
  },
  voice: {
    id: 'voice',
    labelFa: 'میکروفون چت صوتی (MIC)',
    shortLabel: 'MIC',
    baseSizePx: 44,
    accentColor: '#10b981',
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
];

export const CONTROL_LAYOUT_STORAGE_KEY = 'bodycam_custom_controls_layout_v1';
export const LEAN_HUD_BUTTONS_STORAGE_KEY = 'bodycam_show_lean_hud_buttons_v1';

export function getDefaultControlLayout(preset: HudLayoutPreset = 'standard'): CustomControlsLayout {
  if (preset === 'lefthanded') {
    return {
      joystick: { id: 'joystick', xPct: 83, yPct: 74, scale: 1, opacity: 0.9 },
      fire: { id: 'fire', xPct: 14, yPct: 72, scale: 1, opacity: 0.95 },
      ads: { id: 'ads', xPct: 30, yPct: 76, scale: 1, opacity: 0.9 },
      jump: { id: 'jump', xPct: 12, yPct: 52, scale: 1, opacity: 0.9 },
      reload: { id: 'reload', xPct: 28, yPct: 60, scale: 1, opacity: 0.9 },
      swap: { id: 'swap', xPct: 13, yPct: 36, scale: 1, opacity: 0.9 },
      lean: { id: 'lean', xPct: 88, yPct: 44, scale: 1, opacity: 0.9 },
      power: { id: 'power', xPct: 74, yPct: 48, scale: 1, opacity: 0.9 },
      voice: { id: 'voice', xPct: 88, yPct: 29, scale: 1, opacity: 0.9 },
    };
  }
  if (preset === 'claw') {
    return {
      joystick: { id: 'joystick', xPct: 16, yPct: 74, scale: 1, opacity: 0.9 },
      fire: { id: 'fire', xPct: 87, yPct: 42, scale: 1.05, opacity: 0.95 },
      ads: { id: 'ads', xPct: 14, yPct: 38, scale: 1, opacity: 0.9 },
      jump: { id: 'jump', xPct: 87, yPct: 74, scale: 1, opacity: 0.9 },
      reload: { id: 'reload', xPct: 72, yPct: 68, scale: 1, opacity: 0.9 },
      swap: { id: 'swap', xPct: 74, yPct: 48, scale: 1, opacity: 0.9 },
      lean: { id: 'lean', xPct: 26, yPct: 48, scale: 1, opacity: 0.9 },
      power: { id: 'power', xPct: 72, yPct: 82, scale: 1, opacity: 0.9 },
      voice: { id: 'voice', xPct: 26, yPct: 32, scale: 1, opacity: 0.9 },
    };
  }
  // Standard ergonomic layout (zero overlap on both mobile landscape and portrait)
  return {
    joystick: { id: 'joystick', xPct: 16, yPct: 74, scale: 1, opacity: 0.9 },
    fire: { id: 'fire', xPct: 86, yPct: 72, scale: 1, opacity: 0.95 },
    ads: { id: 'ads', xPct: 70, yPct: 78, scale: 1, opacity: 0.9 },
    jump: { id: 'jump', xPct: 88, yPct: 52, scale: 1, opacity: 0.9 },
    reload: { id: 'reload', xPct: 72, yPct: 60, scale: 1, opacity: 0.9 },
    swap: { id: 'swap', xPct: 87, yPct: 36, scale: 1, opacity: 0.9 },
    lean: { id: 'lean', xPct: 12, yPct: 44, scale: 1, opacity: 0.9 },
    power: { id: 'power', xPct: 26, yPct: 48, scale: 1, opacity: 0.9 },
    voice: { id: 'voice', xPct: 12, yPct: 29, scale: 1, opacity: 0.9 },
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
