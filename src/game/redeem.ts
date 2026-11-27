/**
 * Redeem Code client helpers:
 * - Same Unicode / Persian-Arabic digit / Ya-Kaf / whitespace normalization as the Netlify Function
 * - 5-attempt 1-minute lockout state (stores ONLY attempt count & lock expiry — NEVER stores any code)
 * - POST /.netlify/functions/redeem client wrapper
 */

import {
  LEGENDARY_AK47_ID,
  LEGENDARY_KATANA_ID,
  LEGENDARY_RPG_ID,
  LEGENDARY_SNIPER_ID,
  MYTHIC_M249_ID,
  MYTHIC_SHOTGUN_ID,
} from './cosmetics';

export const REDEEM_ENDPOINT = '/.netlify/functions/redeem';
export const REDEEM_LOCKOUT_STORAGE_KEY = 'bodycam_redeem_guard_v1';
export const REDEEM_LOCKOUT_VERSION = 1;
export const REDEEM_MAX_FAILED_ATTEMPTS = 5;
export const REDEEM_LOCKOUT_DURATION_MS = 60_000;

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export interface RedeemLockoutState {
  version: number;
  failedAttempts: number;
  lockedUntilMs: number;
}

export type RedeemRewardId =
  | typeof LEGENDARY_AK47_ID
  | typeof LEGENDARY_KATANA_ID
  | typeof LEGENDARY_RPG_ID
  | typeof LEGENDARY_SNIPER_ID
  | typeof MYTHIC_M249_ID
  | typeof MYTHIC_SHOTGUN_ID;

export const ALLOWED_REDEEM_REWARD_IDS: ReadonlySet<string> = new Set([
  LEGENDARY_AK47_ID,
  LEGENDARY_SNIPER_ID,
  MYTHIC_M249_ID,
  MYTHIC_SHOTGUN_ID,
  LEGENDARY_KATANA_ID,
  LEGENDARY_RPG_ID,
]);

export function parseAllowedRedeemRewardId(raw: unknown): RedeemRewardId | null {
  if (typeof raw === 'string' && ALLOWED_REDEEM_REWARD_IDS.has(raw)) {
    return raw as RedeemRewardId;
  }
  return null;
}

export type RedeemSubmitResult =
  | { status: 'ok'; rewardId: RedeemRewardId }
  | { status: 'invalid' }
  | { status: 'unavailable' };

/**
 * Normalizes user input identically to the server function:
 * strips whitespace & invisible chars, converts Persian/Arabic digits to ASCII,
 * unifies Arabic/Persian ی and ک, and lowercases English letters.
 */
export function normalizeRedeemCode(raw: string): string {
  if (typeof raw !== 'string') return '';
  const cleaned = raw
    .replace(/[\s\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\u3164\uFEFF\uFFA0]+/g, '')
    .replace(/[\u064A\u0649]/g, '\u06CC')
    .replace(/\u0643/g, '\u06A9');

  let out = '';
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    const pIdx = PERSIAN_DIGITS.indexOf(ch);
    if (pIdx !== -1) {
      out += String(pIdx);
      continue;
    }
    const aIdx = ARABIC_DIGITS.indexOf(ch);
    if (aIdx !== -1) {
      out += String(aIdx);
      continue;
    }
    out += ch;
  }
  return out.toLowerCase();
}

export function createInitialRedeemLockoutState(): RedeemLockoutState {
  return {
    version: REDEEM_LOCKOUT_VERSION,
    failedAttempts: 0,
    lockedUntilMs: 0,
  };
}

export function validateRedeemLockoutState(raw: unknown, nowMs = Date.now()): RedeemLockoutState {
  if (!raw || typeof raw !== 'object') {
    return createInitialRedeemLockoutState();
  }
  const obj = raw as Record<string, unknown>;
  const failedAttempts =
    typeof obj.failedAttempts === 'number' && Number.isFinite(obj.failedAttempts)
      ? Math.max(0, Math.min(REDEEM_MAX_FAILED_ATTEMPTS, Math.floor(obj.failedAttempts)))
      : 0;
  const rawLockedUntil =
    typeof obj.lockedUntilMs === 'number' && Number.isFinite(obj.lockedUntilMs)
      ? Math.max(0, Math.floor(obj.lockedUntilMs))
      : 0;
  // Cap lock window so corrupted future timestamps can never permanently lock out the user
  const maxAllowedUntil = nowMs + REDEEM_LOCKOUT_DURATION_MS;
  const lockedUntilMs = rawLockedUntil > nowMs ? Math.min(rawLockedUntil, maxAllowedUntil) : 0;

  return {
    version: REDEEM_LOCKOUT_VERSION,
    failedAttempts: lockedUntilMs === 0 && failedAttempts >= REDEEM_MAX_FAILED_ATTEMPTS ? 0 : failedAttempts,
    lockedUntilMs,
  };
}

export function loadRedeemLockoutState(nowMs = Date.now()): RedeemLockoutState {
  try {
    const raw = window.localStorage.getItem(REDEEM_LOCKOUT_STORAGE_KEY);
    if (!raw) return createInitialRedeemLockoutState();
    return validateRedeemLockoutState(JSON.parse(raw), nowMs);
  } catch {
    return createInitialRedeemLockoutState();
  }
}

export function saveRedeemLockoutState(state: RedeemLockoutState, nowMs = Date.now()): void {
  try {
    const validated = validateRedeemLockoutState(state, nowMs);
    window.localStorage.setItem(REDEEM_LOCKOUT_STORAGE_KEY, JSON.stringify(validated));
  } catch {
    // Ignore storage quota or private-mode restrictions
  }
}

export function getRedeemLockoutRemainingMs(state: RedeemLockoutState, nowMs = Date.now()): number {
  if (!state || state.lockedUntilMs <= nowMs) return 0;
  return state.lockedUntilMs - nowMs;
}

export function recordRedeemFailure(
  state: RedeemLockoutState,
  nowMs = Date.now()
): { nextState: RedeemLockoutState; lockedNow: boolean; attemptsRemaining: number } {
  const base = state.lockedUntilMs > 0 && state.lockedUntilMs <= nowMs
    ? createInitialRedeemLockoutState()
    : state;
  const nextFailures = base.failedAttempts + 1;
  if (nextFailures >= REDEEM_MAX_FAILED_ATTEMPTS) {
    return {
      nextState: {
        version: REDEEM_LOCKOUT_VERSION,
        failedAttempts: REDEEM_MAX_FAILED_ATTEMPTS,
        lockedUntilMs: nowMs + REDEEM_LOCKOUT_DURATION_MS,
      },
      lockedNow: true,
      attemptsRemaining: 0,
    };
  }
  return {
    nextState: {
      version: REDEEM_LOCKOUT_VERSION,
      failedAttempts: nextFailures,
      lockedUntilMs: 0,
    },
    lockedNow: false,
    attemptsRemaining: REDEEM_MAX_FAILED_ATTEMPTS - nextFailures,
  };
}

const STATIC_FALLBACK_ENTRIES: ReadonlyArray<{
  rewardId: RedeemRewardId;
  digestHex: string;
}> = Object.freeze([
  {
    rewardId: LEGENDARY_AK47_ID,
    digestHex: 'bd0f84f17c52da7fdc5414fbf6c7b8b3e22d61d1cd68e0411714f6c6153ba4c7',
  },
  {
    rewardId: LEGENDARY_SNIPER_ID,
    digestHex: 'ec9eddc39e740b47a3933e590cd5b855cc5464f79e723977d704688b3ff985a9',
  },
  {
    rewardId: MYTHIC_M249_ID,
    digestHex: 'd03e5e140df2c94fb9caa0f2c0550c52e0dd728db81c2958c322538f235683ab',
  },
  {
    rewardId: MYTHIC_SHOTGUN_ID,
    digestHex: '0ab92734f12a19616a6a449cacf9acbb72dec10481dc38158aac98021c1df4e7',
  },
  {
    rewardId: MYTHIC_SHOTGUN_ID,
    digestHex: '713374afa878c773dedcd66536b7e6454cefc4f73ef1c925e09c8fb9f60a5c28',
  },
  {
    rewardId: LEGENDARY_KATANA_ID,
    digestHex: 'e3ea0a262d65db5ba0e30400b4c78680a694c6ad3b5f56fd5644b14effdec4b2',
  },
  {
    rewardId: LEGENDARY_KATANA_ID,
    digestHex: '8366f187b76e5a0a44046004497fbaf19070b73d1610447611c9b3047287f45f',
  },
  {
    rewardId: LEGENDARY_RPG_ID,
    digestHex: '9ea270e4a6f3bd4d5c22f2338afc897951931af2029a61cb0d6a482a4ca9acdb',
  },
  {
    rewardId: LEGENDARY_RPG_ID,
    digestHex: 'a44bfbd8032b1a8c305feba7858f1b7d40c2073c03164d6f72a3cf109a05a4bd',
  },
]);
const CLIENT_FAILURE_DELAY_MS = 380;

function constantTimeHexEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Pure-JS SHA-256 fallback for insecure HTTP LAN previews where crypto.subtle is undefined */
function sha256FallbackBytes(msg: Uint8Array): Uint8Array {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const bitLen = msg.length * 8;
  const paddedLen = (((msg.length + 9 + 63) >> 6) << 6);
  const buf = new Uint8Array(paddedLen);
  buf.set(msg);
  buf[msg.length] = 0x80;
  const view = new DataView(buf.buffer);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;
  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = ((w[i - 15] >>> 7) | (w[i - 15] << 25)) ^ ((w[i - 15] >>> 18) | (w[i - 15] << 14)) ^ (w[i - 15] >>> 3);
      const s1 = ((w[i - 2] >>> 17) | (w[i - 2] << 15)) ^ ((w[i - 2] >>> 19) | (w[i - 2] << 13)) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0, false); outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false); outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false); outView.setUint32(20, h5, false);
  outView.setUint32(24, h6, false); outView.setUint32(28, h7, false);
  return out;
}

export async function sha256HexUtf8(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  let digestBytes: Uint8Array;
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    const buf = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    digestBytes = new Uint8Array(buf);
  } else {
    digestBytes = sha256FallbackBytes(bytes);
  }
  let hex = '';
  for (let i = 0; i < digestBytes.length; i++) {
    hex += digestBytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

async function verifyStaticFallback(normalized: string): Promise<RedeemSubmitResult> {
  const digest = await sha256HexUtf8(normalized);
  let matchedRewardId: RedeemRewardId | null = null;
  for (let i = 0; i < STATIC_FALLBACK_ENTRIES.length; i++) {
    const entry = STATIC_FALLBACK_ENTRIES[i];
    if (constantTimeHexEquals(digest, entry.digestHex) && matchedRewardId === null) {
      matchedRewardId = entry.rewardId;
    }
  }
  if (matchedRewardId) {
    return { status: 'ok', rewardId: matchedRewardId };
  }
  await new Promise((r) => setTimeout(r, CLIENT_FAILURE_DELAY_MS));
  return { status: 'invalid' };
}

export async function verifyRedeemCodeServer(
  rawCode: string,
  endpoint = REDEEM_ENDPOINT
): Promise<RedeemSubmitResult> {
  const normalized = normalizeRedeemCode(rawCode);
  if (!normalized) return { status: 'invalid' };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      cache: 'no-store',
      body: JSON.stringify({ code: normalized }),
    });

    if (res.status === 404 || res.status >= 500) {
      return verifyStaticFallback(normalized);
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return verifyStaticFallback(normalized);
    }

    const data = (await res.json()) as { ok?: unknown; rewardId?: unknown };
    if (data && data.ok === true) {
      const rewardId = parseAllowedRedeemRewardId(data.rewardId) ?? LEGENDARY_AK47_ID;
      return { status: 'ok', rewardId };
    }
    return { status: 'invalid' };
  } catch {
    return verifyStaticFallback(normalized);
  }
}
