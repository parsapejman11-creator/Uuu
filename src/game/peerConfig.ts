/**
 * Centralized PeerJS signaling broker & WebRTC ICE/STUN configuration.
 * Edit this file to point the static client to a custom PeerServer broker
 * or update the public STUN/TURN server list without touching game logic.
 */

export interface PeerBrokerConfig {
  host: string;
  port: number;
  path: string;
  secure: boolean;
  pingInterval: number;
  debug: 0 | 1 | 2 | 3;
}

export interface IceServerEntry {
  urls: string;
  username?: string;
  credential?: string;
}

const envObj: Record<string, string | undefined> =
  typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ? (import.meta as unknown as { env: Record<string, string | undefined> }).env
    : {};

export const PEERJS_BROKER_CONFIG: PeerBrokerConfig = {
  host: envObj.VITE_PEER_HOST || '0.peerjs.com',
  port: Number(envObj.VITE_PEER_PORT) || 443,
  path: envObj.VITE_PEER_PATH || '/',
  secure: envObj.VITE_PEER_SECURE ? envObj.VITE_PEER_SECURE === 'true' : true,
  pingInterval: 5000,
  debug: 0,
};

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

export function getPeerBrokerHealthUrl(broker: PeerBrokerConfig = PEERJS_BROKER_CONFIG): string {
  const protocol = broker.secure ? 'https' : 'http';
  const defaultPort = broker.secure ? 443 : 80;
  const portSegment = broker.port && broker.port !== defaultPort ? `:${broker.port}` : '';
  const cleanPath = broker.path && broker.path !== '/' ? `/${broker.path.replace(/^\/+|\/+$/g, '')}` : '';
  return `${protocol}://${broker.host}${portSegment}${cleanPath}/peerjs/id`;
}

export function getPeerJsClientOptions(broker: PeerBrokerConfig = PEERJS_BROKER_CONFIG) {
  return {
    host: broker.host,
    port: broker.port,
    path: broker.path,
    secure: broker.secure,
    pingInterval: broker.pingInterval,
    debug: broker.debug,
    config: {
      iceServers: PEERJS_STUN_SERVERS,
    },
  };
}
