/**
 * Centralized PeerJS signaling broker & WebRTC ICE (STUN + ephemeral TURN) configuration.
 * - TURN credentials are NEVER embedded in client code; they are fetched dynamically
 *   from the user's Cloudflare Worker (`VITE_TURN_WORKER_URL`).
 * - Supports UDP, TCP, and TLS (port 443) TURN transports for strict VPN / NAT environments.
 * - Falls back seamlessly to STUN-only when no TURN Worker is configured or reachable.
 * - Supports prioritized PeerJS signaling brokers (custom self-hosted first, then backups)
 *   with automatic failover and exponential backoff.
 */

export interface PeerBrokerConfig {
  id: string;
  labelFa: string;
  host: string;
  port: number;
  path: string;
  secure: boolean;
  pingInterval: number;
  debug: 0 | 1 | 2 | 3;
  isCustom?: boolean;
}

export interface IceServerEntry {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export type TurnWorkerStatus = 'unconfigured' | 'ok' | 'unreachable' | 'invalid';

export interface ResolvedIceConfig {
  iceServers: IceServerEntry[];
  hasTurn: boolean;
  turnSupportsUdpTcpTls443: boolean;
  turnWorkerStatus: TurnWorkerStatus;
  turnWorkerUrl: string | null;
  fetchedAt: number;
  expiresAt: number;
}

const envObj: Record<string, string | undefined> =
  typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ? (import.meta as unknown as { env: Record<string, string | undefined> }).env
    : {};

export const DIRECT_CONNECT_RELAY_FALLBACK_MS = 15_000;
export const TURN_FETCH_TIMEOUT_MS = 4_000;

export const TURN_WORKER_URL: string = (envObj.VITE_TURN_WORKER_URL || '').trim().replace(/\/+$/, '');

export const PEERJS_STUN_SERVERS: IceServerEntry[] = [
  // Non-Google public STUN servers (Cloudflare, Twilio, Metered, Nextcloud)
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  { urls: 'stun:stun.relay.metered.ca:80' },
  { urls: 'stun:openrelay.metered.ca:80' },
  { urls: 'stun:stun.nextcloud.com:443' },
  // Google public STUN servers
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

/**
 * Parse a compact broker string such as:
 * - "https://peer.example.com:443/peerjs"
 * - "http://localhost:9000/myapp"
 * - "0.peerjs.com:443/"
 */
export function parsePeerBrokerSpec(
  raw: string,
  index: number,
  isCustom = false
): PeerBrokerConfig | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;

  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProto);
    const secure = parsed.protocol === 'https:';
    const port = parsed.port ? Number(parsed.port) : secure ? 443 : 80;
    const path = parsed.pathname && parsed.pathname !== '' ? parsed.pathname : '/';
    if (!parsed.hostname) return null;
    return {
      id: `${parsed.hostname}:${port}${path}`,
      labelFa: isCustom ? `سرور شخصی (${parsed.hostname})` : `سرور یدک ${index + 1} (${parsed.hostname})`,
      host: parsed.hostname,
      port: Number.isFinite(port) && port > 0 ? port : secure ? 443 : 80,
      path,
      secure,
      pingInterval: 5000,
      debug: 0,
      isCustom,
    };
  } catch {
    return null;
  }
}

export function buildPeerBrokerList(env: Record<string, string | undefined> = envObj): PeerBrokerConfig[] {
  const list: PeerBrokerConfig[] = [];
  const seen = new Set<string>();

  const pushUnique = (cfg: PeerBrokerConfig | null) => {
    if (!cfg) return;
    if (seen.has(cfg.id)) return;
    seen.add(cfg.id);
    list.push(cfg);
  };

  // Priority 1: Dedicated self-hosted PeerServer if configured in env
  const customHost = (env.VITE_PEER_HOST || '').trim();
  if (customHost) {
    const secure = env.VITE_PEER_SECURE ? env.VITE_PEER_SECURE === 'true' : true;
    const port = Number(env.VITE_PEER_PORT) || (secure ? 443 : 80);
    const path = (env.VITE_PEER_PATH || '/').trim() || '/';
    pushUnique({
      id: `${customHost}:${port}${path}`,
      labelFa: `سرور اختصاصی (${customHost})`,
      host: customHost,
      port,
      path,
      secure,
      pingInterval: 5000,
      debug: 0,
      isCustom: true,
    });
  }

  // Priority 2: User-supplied backup brokers via comma-separated env
  const rawBackups = (env.VITE_PEER_BACKUP_BROKERS || '').trim();
  if (rawBackups) {
    rawBackups.split(',').forEach((entry, idx) => {
      pushUnique(parsePeerBrokerSpec(entry, idx, false));
    });
  }

  // Priority 3: Built-in public PeerJS cloud brokers (HTTPS/WSS port 443)
  pushUnique({
    id: '0.peerjs.com:443/',
    labelFa: 'سرور عمومی PeerJS Cloud',
    host: '0.peerjs.com',
    port: 443,
    path: '/',
    secure: true,
    pingInterval: 5000,
    debug: 0,
    isCustom: false,
  });

  // Secondary public fallback host on standard TLS port 443
  pushUnique({
    id: '0.peerjs.com:443/peerjs',
    labelFa: 'سرور یدک PeerJS (مسیر جایگزین)',
    host: '0.peerjs.com',
    port: 443,
    path: '/peerjs',
    secure: true,
    pingInterval: 5000,
    debug: 0,
    isCustom: false,
  });

  return list;
}

export const PEERJS_BROKER_LIST: PeerBrokerConfig[] = buildPeerBrokerList(envObj);
export const PEERJS_BROKER_CONFIG: PeerBrokerConfig = PEERJS_BROKER_LIST[0];

/**
 * Exponential backoff delay for broker failover and reconnection attempts.
 * Example: attempt 0 -> 1200ms, 1 -> 2400ms, 2 -> 4800ms, 3 -> 9600ms, 4+ -> 15000ms.
 */
export function computeReconnectBackoffMs(
  attempt: number,
  baseMs = 1200,
  maxMs = 15000
): number {
  const safeAttempt = Math.max(0, Math.min(10, Math.floor(attempt)));
  const raw = baseMs * Math.pow(2, safeAttempt);
  return Math.min(maxMs, Math.round(raw));
}

export function getPeerBrokerHealthUrl(broker: PeerBrokerConfig = PEERJS_BROKER_CONFIG): string {
  const protocol = broker.secure ? 'https' : 'http';
  const defaultPort = broker.secure ? 443 : 80;
  const portSegment = broker.port && broker.port !== defaultPort ? `:${broker.port}` : '';
  const cleanPath = broker.path && broker.path !== '/' ? `/${broker.path.replace(/^\/+|\/+$/g, '')}` : '';
  return `${protocol}://${broker.host}${portSegment}${cleanPath}/peerjs/id`;
}

export function inspectTurnCapabilities(iceServers: IceServerEntry[]): {
  hasTurn: boolean;
  hasUdp: boolean;
  hasTcp: boolean;
  hasTls443: boolean;
} {
  let hasTurn = false;
  let hasUdp = false;
  let hasTcp = false;
  let hasTls443 = false;

  for (const server of iceServers) {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
    for (const rawUrl of urls) {
      if (typeof rawUrl !== 'string') continue;
      const lower = rawUrl.toLowerCase();
      if (lower.startsWith('turn:') || lower.startsWith('turns:')) {
        hasTurn = true;
        if (lower.includes('transport=udp') || (lower.startsWith('turn:') && !lower.includes('transport=tcp'))) {
          hasUdp = true;
        }
        if (lower.includes('transport=tcp')) {
          hasTcp = true;
        }
        if (lower.startsWith('turns:') && (lower.includes(':443') || lower.includes(':5349'))) {
          hasTls443 = true;
        }
      }
    }
  }

  return { hasTurn, hasUdp, hasTcp, hasTls443 };
}

export function sanitizeWorkerIceServers(rawList: unknown): IceServerEntry[] {
  if (!Array.isArray(rawList)) return [];
  const valid: IceServerEntry[] = [];
  for (const item of rawList) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const rawUrls = rec.urls;
    const urlsList = Array.isArray(rawUrls)
      ? rawUrls.filter((u): u is string => typeof u === 'string' && /^(stuns?|turns?):/i.test(u.trim()))
      : typeof rawUrls === 'string' && /^(stuns?|turns?):/i.test(rawUrls.trim())
        ? [rawUrls.trim()]
        : [];
    if (urlsList.length === 0) continue;

    const entry: IceServerEntry = {
      urls: urlsList.length === 1 ? urlsList[0] : urlsList,
    };
    if (typeof rec.username === 'string' && rec.username.trim()) {
      entry.username = rec.username.trim();
    }
    if (typeof rec.credential === 'string' && rec.credential.trim()) {
      entry.credential = rec.credential.trim();
    }
    valid.push(entry);
  }
  return valid;
}

let cachedIceConfig: ResolvedIceConfig | null = null;

export function clearCachedIceConfig(): void {
  cachedIceConfig = null;
}

export function getLastResolvedIceConfig(): ResolvedIceConfig | null {
  return cachedIceConfig;
}

/**
 * Resolves runtime ICE servers by fetching ephemeral TURN credentials from the
 * configured Cloudflare Worker (if any) and merging them with public STUN servers.
 * Never throws: falls back cleanly to STUN-only if the Worker is unconfigured or unreachable.
 */
export async function resolveRuntimeIceServers(options?: {
  workerUrl?: string;
  forceRefresh?: boolean;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}): Promise<ResolvedIceConfig> {
  const now = Date.now();
  const workerUrl = (options?.workerUrl ?? TURN_WORKER_URL).trim().replace(/\/+$/, '');

  if (
    !options?.forceRefresh &&
    cachedIceConfig &&
    cachedIceConfig.turnWorkerUrl === (workerUrl || null) &&
    cachedIceConfig.expiresAt > now + 60_000
  ) {
    return cachedIceConfig;
  }

  if (!workerUrl) {
    const stunOnly: ResolvedIceConfig = {
      iceServers: [...PEERJS_STUN_SERVERS],
      hasTurn: false,
      turnSupportsUdpTcpTls443: false,
      turnWorkerStatus: 'unconfigured',
      turnWorkerUrl: null,
      fetchedAt: now,
      expiresAt: now + 5 * 60_000,
    };
    cachedIceConfig = stunOnly;
    return stunOnly;
  }

  // Validate Worker URL scheme (https or localhost http for local dev)
  let validEndpoint = false;
  try {
    const parsed = new URL(workerUrl);
    validEndpoint =
      parsed.protocol === 'https:' ||
      (parsed.protocol === 'http:' &&
        (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'));
  } catch {
    validEndpoint = false;
  }

  if (!validEndpoint) {
    const invalidRes: ResolvedIceConfig = {
      iceServers: [...PEERJS_STUN_SERVERS],
      hasTurn: false,
      turnSupportsUdpTcpTls443: false,
      turnWorkerStatus: 'invalid',
      turnWorkerUrl: workerUrl,
      fetchedAt: now,
      expiresAt: now + 60_000,
    };
    cachedIceConfig = invalidRes;
    return invalidRes;
  }

  const fetchFn = options?.fetchImpl ?? (typeof fetch === 'function' ? fetch : null);
  if (!fetchFn) {
    return {
      iceServers: [...PEERJS_STUN_SERVERS],
      hasTurn: false,
      turnSupportsUdpTcpTls443: false,
      turnWorkerStatus: 'unreachable',
      turnWorkerUrl: workerUrl,
      fetchedAt: now,
      expiresAt: now + 30_000,
    };
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutMs = options?.timeoutMs ?? TURN_FETCH_TIMEOUT_MS;
  const timer =
    controller && typeof setTimeout === 'function'
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;

  try {
    const resp = await fetchFn(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      cache: 'no-store',
      signal: controller?.signal,
    });
    if (!resp.ok) {
      throw new Error(`Worker HTTP ${resp.status}`);
    }
    const payload = (await resp.json()) as { iceServers?: unknown; ttl?: unknown };
    const workerServers = sanitizeWorkerIceServers(payload?.iceServers);
    const merged: IceServerEntry[] = [...workerServers, ...PEERJS_STUN_SERVERS];
    const caps = inspectTurnCapabilities(workerServers);
    const ttlSec = Math.max(300, Math.min(86400, Number(payload?.ttl) || 3600));

    const resolved: ResolvedIceConfig = {
      iceServers: merged,
      hasTurn: caps.hasTurn,
      turnSupportsUdpTcpTls443: caps.hasTurn && caps.hasUdp && caps.hasTcp && caps.hasTls443,
      turnWorkerStatus: caps.hasTurn ? 'ok' : 'invalid',
      turnWorkerUrl: workerUrl,
      fetchedAt: now,
      expiresAt: now + ttlSec * 1000,
    };
    cachedIceConfig = resolved;
    return resolved;
  } catch {
    // Graceful STUN-only fallback if Worker is down or blocked
    const fallback: ResolvedIceConfig = {
      iceServers: [...PEERJS_STUN_SERVERS],
      hasTurn: false,
      turnSupportsUdpTcpTls443: false,
      turnWorkerStatus: 'unreachable',
      turnWorkerUrl: workerUrl,
      fetchedAt: now,
      expiresAt: now + 30_000,
    };
    cachedIceConfig = fallback;
    return fallback;
  } finally {
    if (timer !== null && typeof clearTimeout === 'function') {
      clearTimeout(timer);
    }
  }
}

export function getPeerJsClientOptions(
  broker: PeerBrokerConfig = PEERJS_BROKER_CONFIG,
  iceServers: IceServerEntry[] = PEERJS_STUN_SERVERS,
  iceTransportPolicy: RTCIceTransportPolicy = 'all'
) {
  return {
    host: broker.host,
    port: broker.port,
    path: broker.path,
    secure: broker.secure,
    pingInterval: broker.pingInterval,
    debug: broker.debug,
    config: {
      iceServers: iceServers as RTCIceServer[],
      iceTransportPolicy,
    },
  };
}
