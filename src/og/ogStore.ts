import type { MapId } from '../game/rules';
import { OG_CLASSIC_MAPS } from './og.config';

export const OG_STORAGE_KEY = 'bodycam_og_state_v1' as const;
export const OG_STATE_SCHEMA_VERSION = 1 as const;

export interface OgPersistedState {
  version: typeof OG_STATE_SCHEMA_VERSION;
  active: boolean;
  introSeen: boolean;
  bestScore: number;
  bestWave: number;
  matchesPlayed: number;
  lastMap: MapId;
  updatedAt: number;
}

export function createDefaultOgState(): OgPersistedState {
  return {
    version: OG_STATE_SCHEMA_VERSION,
    active: false,
    introSeen: false,
    bestScore: 0,
    bestWave: 0,
    matchesPlayed: 0,
    lastMap: 'warehouse',
    updatedAt: 0,
  };
}

function isValidOgMap(value: unknown): value is MapId {
  return typeof value === 'string' && (OG_CLASSIC_MAPS as readonly string[]).includes(value);
}

function toSafeNonNegInt(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

export function sanitizeOgState(raw: unknown): OgPersistedState {
  const base = createDefaultOgState();
  if (!raw || typeof raw !== 'object') return base;
  const rec = raw as Record<string, unknown>;
  if (rec.version !== OG_STATE_SCHEMA_VERSION) {
    // Unknown/future schema version -> safely reset without throwing
    return base;
  }
  return {
    version: OG_STATE_SCHEMA_VERSION,
    active: Boolean(rec.active),
    introSeen: Boolean(rec.introSeen),
    bestScore: toSafeNonNegInt(rec.bestScore, 0),
    bestWave: toSafeNonNegInt(rec.bestWave, 0),
    matchesPlayed: toSafeNonNegInt(rec.matchesPlayed, 0),
    lastMap: isValidOgMap(rec.lastMap) ? rec.lastMap : 'warehouse',
    updatedAt: toSafeNonNegInt(rec.updatedAt, 0),
  };
}

export function loadOgState(storage?: Pick<Storage, 'getItem'> | null): OgPersistedState {
  try {
    const store = storage !== undefined ? storage : typeof window !== 'undefined' ? window.localStorage : null;
    if (!store) return createDefaultOgState();
    const raw = store.getItem(OG_STORAGE_KEY);
    if (!raw) return createDefaultOgState();
    const parsed = JSON.parse(raw);
    return sanitizeOgState(parsed);
  } catch {
    return createDefaultOgState();
  }
}

export function saveOgState(
  state: OgPersistedState,
  storage?: Pick<Storage, 'setItem'> | null
): OgPersistedState {
  const clean = sanitizeOgState({
    ...state,
    version: OG_STATE_SCHEMA_VERSION,
    updatedAt: Date.now(),
  });
  try {
    const store = storage !== undefined ? storage : typeof window !== 'undefined' ? window.localStorage : null;
    if (store) {
      store.setItem(OG_STORAGE_KEY, JSON.stringify(clean));
    }
  } catch {
    // Ignore storage quota or private-mode errors safely
  }
  return clean;
}

export function recordOgMatchResult(
  prev: OgPersistedState,
  score: number,
  wave: number,
  storage?: Pick<Storage, 'setItem'> | null
): OgPersistedState {
  const safeScore = toSafeNonNegInt(score, 0);
  const safeWave = toSafeNonNegInt(wave, 0);
  return saveOgState(
    {
      ...prev,
      bestScore: Math.max(prev.bestScore, safeScore),
      bestWave: Math.max(prev.bestWave, safeWave),
      matchesPlayed: prev.matchesPlayed + 1,
    },
    storage
  );
}
