import {
  PEERJS_BROKER_CONFIG,
  PEERJS_BROKER_LIST,
  PEERJS_STUN_SERVERS,
  PeerBrokerConfig,
  TurnWorkerStatus,
  getPeerBrokerHealthUrl,
  resolveRuntimeIceServers,
} from './peerConfig';

export type BrokerReachabilityState = 'checking' | 'reachable' | 'unreachable';
export type ConnectionTransportType = 'direct_p2p' | 'relay_turn' | 'local_only' | 'none' | 'unknown';

export interface LivePeerTelemetry {
  peerOpen: boolean;
  peerDisconnected: boolean;
  iceConnectionState: string;
  iceGatheringState: string;
  signalingState: string;
  candidateType: string | null; // 'host' | 'srflx' | 'prflx' | 'relay'
  hasActivePeerConnection: boolean;
  activeBrokerHost?: string;
  activeBrokerPort?: number;
  activeBrokerSecure?: boolean;
  relayFallbackActive?: boolean;
  turnWorkerStatus?: TurnWorkerStatus;
  hasTurnServers?: boolean;
}

export interface ConnectionDiagnosticsReport {
  checkedAt: string;
  online: boolean;
  brokerHost: string;
  brokerPort: number;
  brokerSecure: boolean;
  brokerReachability: BrokerReachabilityState;
  brokerLatencyMs: number | null;
  brokerDetailFa: string;
  availableBrokersCount: number;
  turnWorkerStatus: TurnWorkerStatus;
  turnSupportsUdpTcpTls443: boolean;
  turnDetailFa: string;
  relayFallbackActive: boolean;
  iceState: string;
  iceGatheringState: string;
  stunCandidatesCount: number;
  hostCandidatesCount: number;
  relayCandidatesCount: number;
  connectionType: ConnectionTransportType;
  connectionTypeLabelFa: string;
  failureReasonFa: string | null;
}

export function classifyConnectionTypeFa(
  candidateType: string | null,
  stunCandidatesCount: number,
  hostCandidatesCount: number,
  relayCandidatesCount: number,
  relayFallbackActive = false
): { type: ConnectionTransportType; labelFa: string; shortLabelFa: string } {
  if (
    candidateType === 'relay' ||
    relayFallbackActive ||
    (relayCandidatesCount > 0 && stunCandidatesCount === 0 && !candidateType)
  ) {
    return {
      type: 'relay_turn',
      labelFa: 'رله (TURN Relay · عبور از VPN/NAT)',
      shortLabelFa: 'رله TURN',
    };
  }
  if (candidateType === 'srflx' || candidateType === 'prflx' || candidateType === 'host') {
    return {
      type: 'direct_p2p',
      labelFa: 'مستقیم همتا‌به‌همتا (Direct P2P)',
      shortLabelFa: 'مستقیم P2P',
    };
  }
  if (stunCandidatesCount > 0) {
    return {
      type: 'direct_p2p',
      labelFa: 'آماده اتصال مستقیم (Direct P2P با STUN)',
      shortLabelFa: 'مستقیم',
    };
  }
  if (hostCandidatesCount > 0) {
    return {
      type: 'local_only',
      labelFa: 'فقط شبکه محلی (LAN — بدون خروجی STUN)',
      shortLabelFa: 'محلی LAN',
    };
  }
  return {
    type: 'none',
    labelFa: 'برقرار نشده (بدون کاندیدای شبکه)',
    shortLabelFa: 'نامشخص',
  };
}

export function formatTurnWorkerStatusFa(
  status: TurnWorkerStatus,
  supportsAllTransports: boolean
): string {
  if (status === 'ok') {
    return supportsAllTransports
      ? 'فعال (UDP · TCP · TLS 443)'
      : 'فعال (رله TURN آماده)';
  }
  if (status === 'unconfigured') {
    return 'تنظیم نشده (ادامه با STUN)';
  }
  if (status === 'unreachable') {
    return 'در دسترس نیست (ادامه خودکار با STUN)';
  }
  return 'پیکربندی نامعتبر (ادامه با STUN)';
}

export function diagnosePeerConnectionFailureFa(params: {
  online: boolean;
  brokerReachable: boolean;
  iceState: string;
  stunCandidatesCount: number;
  hostCandidatesCount: number;
  relayCandidatesCount?: number;
  turnWorkerStatus?: TurnWorkerStatus;
  lastPeerError?: string | null;
}): string | null {
  const relayCount = params.relayCandidatesCount ?? 0;
  if (!params.online) {
    return 'اتصال اینترنت دستگاه قطع است. ابتدا اینترنت را وصل کنید.';
  }
  if (!params.brokerReachable) {
    return 'هیچ‌یک از سرورهای واسطه PeerJS پاسخ ندادند؛ ممکن است فیلتر یا موقتاً در دسترس نباشند. با VPN یا سرور شخصی امتحان کنید.';
  }
  if (params.lastPeerError) {
    if (
      params.lastPeerError.includes('پیدا نشد') ||
      params.lastPeerError.includes('پاسخی') ||
      params.lastPeerError.includes('رمز') ||
      params.lastPeerError.includes('قفل')
    ) {
      return params.lastPeerError;
    }
  }
  if (params.iceState === 'failed' || params.iceState === 'disconnected') {
    if (params.turnWorkerStatus === 'unconfigured' || params.turnWorkerStatus === 'unreachable') {
      return 'اتصال مستقیم WebRTC (ICE) مسدود شده و سرور رله TURN فعال نیست. برای پایداری با VPN، Cloudflare TURN Worker را تنظیم کنید.';
    }
    return 'اتصال WebRTC (ICE) قطع شد؛ ممکن است VPN یا شبکه به‌طور موقت مسیر رله را بسته باشد. «تلاش دوباره» را بزنید.';
  }
  if (params.stunCandidatesCount === 0 && params.hostCandidatesCount === 0 && relayCount === 0) {
    return 'مرورگر نتوانست هیچ کاندیدای WebRTC بسازد؛ احتمالاً دسترسی WebRTC یا شبکه مسدود است.';
  }
  if (params.stunCandidatesCount === 0 && relayCount === 0) {
    return 'پورت UDP یا سرورهای STUN مسدود هستند و کاندیدای TURN هم دریافت نشد. راه‌اندازی Worker رله (TLS 443) مشکل VPN را حل می‌کند.';
  }
  if (params.lastPeerError) {
    return params.lastPeerError;
  }
  return null;
}

export async function checkPeerBrokerAvailability(
  broker: PeerBrokerConfig = PEERJS_BROKER_CONFIG,
  timeoutMs = 4500
): Promise<{
  reachable: boolean;
  latencyMs: number | null;
  detailFa: string;
}> {
  const url = getPeerBrokerHealthUrl(broker);
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    const latencyMs = Math.max(1, Date.now() - startedAt);
    if (res.ok) {
      return {
        reachable: true,
        latencyMs,
        detailFa: `در دسترس (${latencyMs}ms)`,
      };
    }
    return {
      reachable: false,
      latencyMs,
      detailFa: `پاسخ نامعتبر از سرور واسطه (کد ${res.status})`,
    };
  } catch (err) {
    const msg =
      err instanceof Error && err.name === 'AbortError'
        ? 'زمان انتظار سرور واسطه به پایان رسید (Timeout)'
        : 'عدم دسترسی به سرور واسطه PeerJS';
    return {
      reachable: false,
      latencyMs: null,
      detailFa: msg,
    };
  } finally {
    window.clearTimeout(timer);
  }
}

export async function probeWebRtcIceCandidates(
  iceServers: RTCIceServer[] = PEERJS_STUN_SERVERS as RTCIceServer[],
  timeoutMs = 3500
): Promise<{
  iceState: string;
  iceGatheringState: string;
  stunCandidatesCount: number;
  hostCandidatesCount: number;
  relayCandidatesCount: number;
  firstCandidateType: string | null;
}> {
  if (typeof RTCPeerConnection === 'undefined') {
    return {
      iceState: 'unsupported',
      iceGatheringState: 'unsupported',
      stunCandidatesCount: 0,
      hostCandidatesCount: 0,
      relayCandidatesCount: 0,
      firstCandidateType: null,
    };
  }

  let pc: RTCPeerConnection | null = null;
  try {
    pc = new RTCPeerConnection({ iceServers });
    pc.createDataChannel('diag-probe');

    let stunCandidatesCount = 0;
    let hostCandidatesCount = 0;
    let relayCandidatesCount = 0;
    let firstCandidateType: string | null = null;

    const expectRelay = iceServers.some((s) => {
      const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
      return urls.some((u) => typeof u === 'string' && /^turns?:/i.test(u));
    });

    await new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };

      const timer = window.setTimeout(finish, timeoutMs);

      pc!.onicecandidate = (ev) => {
        if (!ev.candidate) {
          window.clearTimeout(timer);
          finish();
          return;
        }
        const raw = ev.candidate.candidate || '';
        const typMatch = /\btyp\s+(host|srflx|prflx|relay)\b/.exec(raw);
        const typ = (ev.candidate as RTCIceCandidate & { type?: string }).type || typMatch?.[1] || null;
        if (!firstCandidateType && typ) firstCandidateType = typ;
        if (typ === 'srflx' || typ === 'prflx') stunCandidatesCount++;
        else if (typ === 'relay') relayCandidatesCount++;
        else if (typ === 'host') hostCandidatesCount++;

        const enoughDirect = stunCandidatesCount >= 2 && hostCandidatesCount >= 1;
        if (enoughDirect && (!expectRelay || relayCandidatesCount >= 1)) {
          window.clearTimeout(timer);
          finish();
        }
      };

      pc!.onicegatheringstatechange = () => {
        if (pc?.iceGatheringState === 'complete') {
          window.clearTimeout(timer);
          finish();
        }
      };

      pc!
        .createOffer()
        .then((offer) => pc!.setLocalDescription(offer))
        .catch(() => {
          window.clearTimeout(timer);
          finish();
        });
    });

    return {
      iceState: pc.iceConnectionState || 'new',
      iceGatheringState: pc.iceGatheringState || 'complete',
      stunCandidatesCount,
      hostCandidatesCount,
      relayCandidatesCount,
      firstCandidateType,
    };
  } catch {
    return {
      iceState: 'error',
      iceGatheringState: 'error',
      stunCandidatesCount: 0,
      hostCandidatesCount: 0,
      relayCandidatesCount: 0,
      firstCandidateType: null,
    };
  } finally {
    try {
      pc?.close();
    } catch {
      // ignore
    }
  }
}

export async function runConnectionDiagnostics(
  liveTelemetry: LivePeerTelemetry | null,
  lastPeerError?: string | null
): Promise<ConnectionDiagnosticsReport> {
  const online = typeof navigator !== 'undefined' ? navigator.onLine !== false : true;

  const activeBroker =
    PEERJS_BROKER_LIST.find((b) => b.host === liveTelemetry?.activeBrokerHost) ||
    PEERJS_BROKER_CONFIG;

  const [brokerRes, resolvedIce] = await Promise.all([
    online
      ? checkPeerBrokerAvailability(activeBroker)
      : Promise.resolve({ reachable: false, latencyMs: null, detailFa: 'اینترنت قطع است' }),
    online
      ? resolveRuntimeIceServers()
      : Promise.resolve({
          iceServers: [...PEERJS_STUN_SERVERS],
          hasTurn: false,
          turnSupportsUdpTcpTls443: false,
          turnWorkerStatus: 'unconfigured' as TurnWorkerStatus,
          turnWorkerUrl: null,
          fetchedAt: Date.now(),
          expiresAt: Date.now(),
        }),
  ]);

  const probe = online
    ? await probeWebRtcIceCandidates(resolvedIce.iceServers as RTCIceServer[])
    : {
        iceState: 'offline',
        iceGatheringState: 'offline',
        stunCandidatesCount: 0,
        hostCandidatesCount: 0,
        relayCandidatesCount: 0,
        firstCandidateType: null,
      };

  const activeIceState =
    liveTelemetry && liveTelemetry.hasActivePeerConnection
      ? liveTelemetry.iceConnectionState
      : probe.iceState;
  const activeGathering =
    liveTelemetry && liveTelemetry.hasActivePeerConnection
      ? liveTelemetry.iceGatheringState
      : probe.iceGatheringState;
  const candidateType =
    liveTelemetry && liveTelemetry.hasActivePeerConnection && liveTelemetry.candidateType
      ? liveTelemetry.candidateType
      : probe.relayCandidatesCount > 0 && probe.stunCandidatesCount === 0
        ? 'relay'
        : probe.stunCandidatesCount > 0
          ? 'srflx'
          : probe.firstCandidateType;

  const relayFallbackActive = Boolean(liveTelemetry?.relayFallbackActive);
  const classified = classifyConnectionTypeFa(
    candidateType,
    probe.stunCandidatesCount,
    probe.hostCandidatesCount,
    probe.relayCandidatesCount,
    relayFallbackActive
  );

  const failureReasonFa = diagnosePeerConnectionFailureFa({
    online,
    brokerReachable: brokerRes.reachable || Boolean(liveTelemetry?.peerOpen),
    iceState: activeIceState,
    stunCandidatesCount: probe.stunCandidatesCount,
    hostCandidatesCount: probe.hostCandidatesCount,
    relayCandidatesCount: probe.relayCandidatesCount,
    turnWorkerStatus: resolvedIce.turnWorkerStatus,
    lastPeerError,
  });

  return {
    checkedAt: new Date().toLocaleTimeString('fa-IR'),
    online,
    brokerHost: activeBroker.host,
    brokerPort: activeBroker.port,
    brokerSecure: activeBroker.secure,
    brokerReachability:
      brokerRes.reachable || Boolean(liveTelemetry?.peerOpen) ? 'reachable' : 'unreachable',
    brokerLatencyMs: brokerRes.latencyMs,
    brokerDetailFa:
      brokerRes.reachable || !liveTelemetry?.peerOpen
        ? brokerRes.detailFa
        : 'متصل به سرور واسطه PeerJS',
    availableBrokersCount: PEERJS_BROKER_LIST.length,
    turnWorkerStatus: resolvedIce.turnWorkerStatus,
    turnSupportsUdpTcpTls443: resolvedIce.turnSupportsUdpTcpTls443,
    turnDetailFa: formatTurnWorkerStatusFa(
      resolvedIce.turnWorkerStatus,
      resolvedIce.turnSupportsUdpTcpTls443
    ),
    relayFallbackActive,
    iceState: activeIceState,
    iceGatheringState: activeGathering,
    stunCandidatesCount: probe.stunCandidatesCount,
    hostCandidatesCount: probe.hostCandidatesCount,
    relayCandidatesCount: probe.relayCandidatesCount,
    connectionType: classified.type,
    connectionTypeLabelFa: classified.labelFa,
    failureReasonFa,
  };
}
