/**
 * Cloudflare Worker: Ephemeral TURN Credentials Proxy for Bodycam Vanguard
 *
 * Keeps Cloudflare TURN API secrets strictly on the edge server, enforces
 * strict Origin allowlisting (CORS) and per-IP rate limiting, and returns
 * short-lived WebRTC ICE servers (UDP, TCP, and TLS over port 443) so players
 * behind strict VPNs / symmetric NATs can connect reliably.
 */

export interface Env {
  CF_TURN_TOKEN_ID: string;
  CF_TURN_API_TOKEN: string;
  /** Comma-separated exact allowed origins, e.g. "https://user.github.io,https://game.example.com" */
  ALLOWED_ORIGINS: string;
  /** Optional TTL in seconds (default 3600, clamped to 300..86400) */
  TURN_TTL_SECONDS?: string;
  /** Optional max requests per window per IP (default 20) */
  RATE_LIMIT_MAX?: string;
  /** Optional rate limit window in seconds (default 60) */
  RATE_LIMIT_WINDOW_SEC?: string;
  /** Optional Cloudflare KV namespace for cross-isolate rate limiting */
  RATE_LIMIT_KV?: KVNamespace;
}

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

interface IceServerResponseItem {
  urls: string | string[];
  username?: string;
  credential?: string;
}

interface RateBucket {
  count: number;
  resetAt: number;
}

const memoryRateBuckets = new Map<string, RateBucket>();

function parseAllowedOrigins(raw: string | undefined): Set<string> {
  const set = new Set<string>();
  if (!raw) return set;
  for (const part of raw.split(',')) {
    const trimmed = part.trim().replace(/\/+$/, '');
    if (trimmed && trimmed !== '*' && /^https?:\/\/[^/\s]+$/i.test(trimmed)) {
      set.add(trimmed);
    }
  }
  return set;
}

function buildCorsHeaders(origin: string | null, allowed: Set<string>): Record<string, string> {
  const headers: Record<string, string> = {
    Vary: 'Origin',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
  };
  if (origin && allowed.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Access-Control-Max-Age'] = '600';
  }
  return headers;
}

function getClientIp(request: Request): string {
  const cfIp = request.headers.get('CF-Connecting-IP');
  if (cfIp) return cfIp.trim();
  const xff = request.headers.get('X-Forwarded-For');
  if (xff) return xff.split(',')[0].trim();
  return 'unknown';
}

async function checkRateLimit(
  ip: string,
  env: Env
): Promise<{ allowed: boolean; remaining: number; retryAfterSec: number }> {
  const maxReqs = Math.max(5, Math.min(200, Number(env.RATE_LIMIT_MAX) || 20));
  const windowSec = Math.max(10, Math.min(3600, Number(env.RATE_LIMIT_WINDOW_SEC) || 60));
  const now = Date.now();
  const windowMs = windowSec * 1000;

  if (env.RATE_LIMIT_KV) {
    const bucketKey = `rl:${ip}:${Math.floor(now / windowMs)}`;
    const raw = await env.RATE_LIMIT_KV.get(bucketKey);
    const current = raw ? Number(raw) || 0 : 0;
    if (current >= maxReqs) {
      const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now % windowMs)) / 1000));
      return { allowed: false, remaining: 0, retryAfterSec };
    }
    await env.RATE_LIMIT_KV.put(bucketKey, String(current + 1), {
      expirationTtl: windowSec + 10,
    });
    return { allowed: true, remaining: Math.max(0, maxReqs - current - 1), retryAfterSec: 0 };
  }

  // In-memory isolate fallback with periodic cleanup to bound memory
  if (memoryRateBuckets.size > 2000) {
    for (const [key, bucket] of memoryRateBuckets.entries()) {
      if (bucket.resetAt <= now) memoryRateBuckets.delete(key);
    }
  }

  const existing = memoryRateBuckets.get(ip);
  if (!existing || existing.resetAt <= now) {
    memoryRateBuckets.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxReqs - 1, retryAfterSec: 0 };
  }

  if (existing.count >= maxReqs) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  existing.count += 1;
  return { allowed: true, remaining: Math.max(0, maxReqs - existing.count), retryAfterSec: 0 };
}

/**
 * Ensures Cloudflare TURN servers expose UDP (3478), TCP (80/3478), and TLS (443/5349)
 * endpoints so connections still succeed when a VPN blocks UDP traffic.
 */
function ensureUdpTcpTlsTurnUrls(servers: IceServerResponseItem[]): IceServerResponseItem[] {
  return servers.map((entry) => {
    const urlList = Array.isArray(entry.urls) ? [...entry.urls] : [entry.urls];
    const hasTurnCreds = Boolean(entry.username && entry.credential);
    if (!hasTurnCreds) {
      return { ...entry, urls: urlList };
    }

    const normalized = new Set<string>(urlList);
    for (const u of urlList) {
      const match = /^turns?:\/\/?([^:?/]+)/i.exec(u) || /^turns?:([^:?/]+)/i.exec(u);
      const host = match?.[1];
      if (!host) continue;
      normalized.add(`turn:${host}:3478?transport=udp`);
      normalized.add(`turn:${host}:3478?transport=tcp`);
      normalized.add(`turn:${host}:80?transport=tcp`);
      normalized.add(`turns:${host}:443?transport=tcp`);
      normalized.add(`turns:${host}:5349?transport=tcp`);
    }

    return {
      urls: Array.from(normalized),
      username: entry.username,
      credential: entry.credential,
    };
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin')?.replace(/\/+$/, '') || null;
    const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);
    const corsHeaders = buildCorsHeaders(origin, allowedOrigins);

    if (request.method === 'OPTIONS') {
      if (!origin || !allowedOrigins.has(origin)) {
        return new Response(null, { status: 403, headers: corsHeaders });
      }
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true, service: 'bodycam-turn-worker' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (request.method !== 'GET' && request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enforce strict Origin allowlist for credential minting
    if (!origin || !allowedOrigins.has(origin)) {
      return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Per-IP rate limiting
    const ip = getClientIp(request);
    const rate = await checkRateLimit(ip, env);
    if (!rate.allowed) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': String(rate.retryAfterSec),
        },
      });
    }

    const tokenId = (env.CF_TURN_TOKEN_ID || '').trim();
    const apiToken = (env.CF_TURN_API_TOKEN || '').trim();
    if (!tokenId || !apiToken) {
      return new Response(JSON.stringify({ error: 'TURN worker not configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ttl = Math.max(300, Math.min(86400, Number(env.TURN_TTL_SECONDS) || 3600));
    const cfEndpoint = `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(
      tokenId
    )}/credentials/generate-ice-servers`;

    try {
      const cfResp = await fetch(cfEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ttl }),
      });

      if (!cfResp.ok) {
        return new Response(
          JSON.stringify({ error: 'Upstream TURN credential provider error', status: cfResp.status }),
          {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const data = (await cfResp.json()) as { iceServers?: IceServerResponseItem | IceServerResponseItem[] };
      const rawList = Array.isArray(data.iceServers)
        ? data.iceServers
        : data.iceServers
          ? [data.iceServers]
          : [];

      const iceServers = ensureUdpTcpTlsTurnUrls(rawList);

      return new Response(
        JSON.stringify({
          iceServers,
          ttl,
          issuedAt: Date.now(),
          provider: 'cloudflare-turn',
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': String(rate.remaining),
          },
        }
      );
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to reach Cloudflare TURN API' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
