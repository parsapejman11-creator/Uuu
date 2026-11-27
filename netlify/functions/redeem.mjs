import crypto from 'node:crypto';

const FAILURE_DELAY_MS = 450;
const MAX_BODY_BYTES = 2048;
const MAX_CODE_CHARS = 128;

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/**
 * Fixed server-side allowlist mapping Netlify Environment Variable names to cosmetic reward IDs.
 * No secret codes are stored in source; all values are read from process.env at runtime.
 */
const REDEEM_REWARD_ENTRIES = Object.freeze([
  {
    envVar: 'REDEEM_CODE_LEGENDARY_AK47',
    rewardId: 'ak_inferno_reaper',
    // Existing AK-47 SHA-256 fallback digest preserved only when REDEEM_CODE_LEGENDARY_AK47 is unset
    fallbackDigestHex: 'bd0f84f17c52da7fdc5414fbf6c7b8b3e22d61d1cd68e0411714f6c6153ba4c7',
  },
  {
    envVar: 'REDEEM_CODE_LEGENDARY_SNIPER',
    rewardId: 'awm_void_piercer',
    // SHA-256 fallback digest used only when REDEEM_CODE_LEGENDARY_SNIPER is unset
    fallbackDigestHex: 'ec9eddc39e740b47a3933e590cd5b855cc5464f79e723977d704688b3ff985a9',
  },
  {
    envVar: 'REDEEM_CODE_MYTHIC_M249',
    rewardId: 'm249_tempest_aegis',
    // SHA-256 fallback digest used only when REDEEM_CODE_MYTHIC_M249 is unset
    fallbackDigestHex: 'd03e5e140df2c94fb9caa0f2c0550c52e0dd728db81c2958c322538f235683ab',
  },
  {
    envVar: 'REDEEM_CODE_MYTHIC_SHOTGUN',
    rewardId: 'spas12_eclipse_breacher',
    // SHA-256 fallback digests used ONLY when REDEEM_CODE_MYTHIC_SHOTGUN env var is unset
    fallbackDigestHexList: [
      '0ab92734f12a19616a6a449cacf9acbb72dec10481dc38158aac98021c1df4e7',
      '713374afa878c773dedcd66536b7e6454cefc4f73ef1c925e09c8fb9f60a5c28',
    ],
  },
  {
    envVar: 'REDEEM_CODE_LEGENDARY_KATANA',
    rewardId: 'katana_sakura_moonblade',
    // SHA-256 fallback digests used ONLY when REDEEM_CODE_LEGENDARY_KATANA env var is unset
    fallbackDigestHexList: [
      'e3ea0a262d65db5ba0e30400b4c78680a694c6ad3b5f56fd5644b14effdec4b2',
      '8366f187b76e5a0a44046004497fbaf19070b73d1610447611c9b3047287f45f',
    ],
  },
  {
    envVar: 'REDEEM_CODE_LEGENDARY_RPG',
    rewardId: 'rpg_nova_dragon',
    // SHA-256 fallback digests used ONLY when REDEEM_CODE_LEGENDARY_RPG env var is unset
    fallbackDigestHexList: [
      '9ea270e4a6f3bd4d5c22f2338afc897951931af2029a61cb0d6a482a4ca9acdb',
      'a44bfbd8032b1a8c305feba7858f1b7d40c2073c03164d6f72a3cf109a05a4bd',
    ],
  },
]);

export const ALLOWED_SERVER_REDEEM_REWARD_IDS = Object.freeze(
  REDEEM_REWARD_ENTRIES.map((e) => e.rewardId)
);

/**
 * Normalizes a redeem code before comparison:
 * - Removes all whitespace and invisible / zero-width / directional format characters
 * - Converts Persian (۰-۹) and Arabic-Indic (٠-٩) digits to ASCII (0-9)
 * - Unifies Arabic & Persian Ya (ي / ى -> ی) and Kaf (ك -> ک)
 * - Lowercases English letters
 */
export function normalizeRedeemInput(raw) {
  if (typeof raw !== 'string') return '';
  let out = raw
    // Strip whitespace and invisible/zero-width/bidi/soft-hyphen characters
    .replace(/[\s\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\u3164\uFEFF\uFFA0]+/g, '')
    // Unify Arabic Ya/Alef-Maksura and Kaf to Persian equivalents
    .replace(/[\u064A\u0649]/g, '\u06CC')
    .replace(/\u0643/g, '\u06A9');

  // Convert Persian & Arabic-Indic digits to English ASCII digits
  let normalizedDigits = '';
  for (let i = 0; i < out.length; i++) {
    const ch = out[i];
    const pIdx = PERSIAN_DIGITS.indexOf(ch);
    if (pIdx !== -1) {
      normalizedDigits += String(pIdx);
      continue;
    }
    const aIdx = ARABIC_DIGITS.indexOf(ch);
    if (aIdx !== -1) {
      normalizedDigits += String(aIdx);
      continue;
    }
    normalizedDigits += ch;
  }

  return normalizedDigits.toLowerCase();
}

const ZERO_DIGEST = Buffer.alloc(32);

function sha256DigestBuf(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest();
}

function parseOrigin(urlStr) {
  if (typeof urlStr !== 'string' || !urlStr.trim()) return null;
  try {
    const parsed = new URL(urlStr.trim());
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

function buildAllowedOrigins(headers) {
  const allowed = new Set();

  // Netlify built-in site origin environment variables
  const envUrls = [
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    process.env.DEPLOY_URL,
  ];
  for (const u of envUrls) {
    const origin = parseOrigin(u);
    if (origin) allowed.add(origin);
  }

  // Optional comma-separated custom domains configured in Netlify env
  if (typeof process.env.REDEEM_ALLOWED_ORIGINS === 'string') {
    for (const part of process.env.REDEEM_ALLOWED_ORIGINS.split(',')) {
      const origin = parseOrigin(part);
      if (origin) allowed.add(origin);
    }
  }

  // Same-host origin derived from the request Host / X-Forwarded-Host header
  const rawHost = headers['x-forwarded-host'] || headers.host || '';
  const host = String(rawHost).split(',')[0].trim();
  if (host && /^[a-zA-Z0-9.-]+(:\d{1,5})?$/.test(host)) {
    const protoRaw = headers['x-forwarded-proto'] || (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
    const proto = String(protoRaw).split(',')[0].trim() === 'http' ? 'http' : 'https';
    allowed.add(`${proto}://${host}`);
  }

  return allowed;
}

function normalizeHeaders(rawHeaders) {
  const out = {};
  if (!rawHeaders || typeof rawHeaders !== 'object') return out;
  for (const [k, v] of Object.entries(rawHeaders)) {
    if (typeof v === 'string') out[k.toLowerCase()] = v;
  }
  return out;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jsonResponse(statusCode, ok, corsOrigin, rewardId = null) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Vary: 'Origin',
  };
  if (corsOrigin) {
    headers['Access-Control-Allow-Origin'] = corsOrigin;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Access-Control-Max-Age'] = '600';
  }
  const payload = ok && rewardId && ALLOWED_SERVER_REDEEM_REWARD_IDS.includes(rewardId)
    ? { ok: true, rewardId }
    : { ok: false };
  return {
    statusCode,
    headers,
    body: JSON.stringify(payload),
  };
}

export async function handler(event) {
  const headers = normalizeHeaders(event?.headers);
  const method = String(event?.httpMethod || '').toUpperCase();
  const originHeader = headers.origin ? parseOrigin(headers.origin) : null;
  const allowedOrigins = buildAllowedOrigins(headers);

  // Strict CORS: reject any cross-origin request not matching the site's own origin(s)
  if (headers.origin) {
    if (!originHeader || !allowedOrigins.has(originHeader)) {
      return jsonResponse(403, false, null);
    }
  }

  const corsOrigin = originHeader && allowedOrigins.has(originHeader) ? originHeader : null;

  if (method === 'OPTIONS') {
    if (!corsOrigin) {
      return jsonResponse(403, false, null);
    }
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '600',
        'Cache-Control': 'no-store',
        Vary: 'Origin',
      },
      body: '',
    };
  }

  if (method !== 'POST') {
    return jsonResponse(405, false, corsOrigin);
  }

  const rawBody = typeof event?.body === 'string'
    ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body)
    : '';

  if (!rawBody || Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    await sleep(FAILURE_DELAY_MS);
    return jsonResponse(200, false, corsOrigin);
  }

  let submittedCode = '';
  try {
    const parsed = JSON.parse(rawBody);
    if (parsed && typeof parsed.code === 'string' && parsed.code.length <= MAX_CODE_CHARS) {
      submittedCode = parsed.code;
    }
  } catch {
    await sleep(FAILURE_DELAY_MS);
    return jsonResponse(200, false, corsOrigin);
  }

  const inputNormalized = normalizeRedeemInput(submittedCode);
  const inputDigest = inputNormalized ? sha256DigestBuf(inputNormalized) : ZERO_DIGEST;

  // Evaluate ALL entries without early return so response timing never leaks which code matched
  let matchedRewardId = null;
  for (let i = 0; i < REDEEM_REWARD_ENTRIES.length; i++) {
    const entry = REDEEM_REWARD_ENTRIES[i];
    const envNormalized = normalizeRedeemInput(process.env[entry.envVar] || '');
    let candidateDigests = [ZERO_DIGEST];
    let isConfigured = false;
    if (envNormalized) {
      candidateDigests = [sha256DigestBuf(envNormalized)];
      isConfigured = true;
    } else if (Array.isArray(entry.fallbackDigestHexList) && entry.fallbackDigestHexList.length > 0) {
      candidateDigests = entry.fallbackDigestHexList.map((hex) => Buffer.from(hex, 'hex'));
      isConfigured = true;
    } else if (entry.fallbackDigestHex) {
      candidateDigests = [Buffer.from(entry.fallbackDigestHex, 'hex')];
      isConfigured = true;
    }
    let eq = false;
    for (let j = 0; j < candidateDigests.length; j++) {
      if (crypto.timingSafeEqual(inputDigest, candidateDigests[j])) {
        eq = true;
      }
    }
    if (inputNormalized && isConfigured && eq && matchedRewardId === null) {
      matchedRewardId = entry.rewardId;
    }
  }

  if (!matchedRewardId) {
    await sleep(FAILURE_DELAY_MS);
    return jsonResponse(200, false, corsOrigin);
  }

  return jsonResponse(200, true, corsOrigin, matchedRewardId);
}
