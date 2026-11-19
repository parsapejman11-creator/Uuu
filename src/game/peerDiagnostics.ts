import {
  PEERJS_BROKER_CONFIG,
  PEERJS_STUN_SERVERS,
  getPeerBrokerHealthUrl,
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
}

export interface ConnectionDiagnosticsReport {
  checkedAt: string;
  online: boolean;
  brokerHost: string;
  brokerReachability: BrokerReachabilityState;
  brokerLatencyMs: number | null;
  brokerDetailFa: string;
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
  relayCandidatesCount: number
): { type: ConnectionTransportType; labelFa: string } {
  if (candidateType === 'relay' || (relayCandidatesCount > 0 && stunCandidatesCount === 0 && !candidateType)) {
    return {
      type: 'relay_turn',
      labelFa: 'غیرمستقیم از طریق سرور رله (TURN Relay)',
    };
  }
  if (candidateType === 'srflx' || candidateType === 'prflx' || candidateType === 'host') {
    return {
      type: 'direct_p2p',
      labelFa: 'مستقیم همتا‌به‌همتا (Direct P2P)',
    };
  }
  if (stunCandidatesCount > 0) {
    return {
      type: 'direct_p2p',
      labelFa: 'آماده اتصال مستقیم (Direct P2P با STUN)',
    };
  }
  if (hostCandidatesCount > 0) {
    return {
      type: 'local_only',
      labelFa: 'فقط شبکه محلی (LAN — بدون خروجی STUN)',
    };
  }
  return {
    type: 'none',
    labelFa: 'برقرار نشده (بدون کاندیدای شبکه)',
  };
}

export function diagnosePeerConnectionFailureFa(params: {
  online: boolean;
  brokerReachable: boolean;
  iceState: string;
  stunCandidatesCount: number;
  hostCandidatesCount: number;
  lastPeerError?: string | null;
}): string | null {
  if (!params.online) {
    return 'اتصال اینترنت دستگاه قطع است. ابتدا اینترنت را وصل کنید.';
  }
  if (!params.brokerReachable) {
    return 'سرور واسطه PeerJS در دسترس نیست؛ ممکن است فیلتر یا مسدود شده باشد یا موقتاً پاسخ ندهد.';
  }
  if (params.lastPeerError) {
    if (params.lastPeerError.includes('پیدا نشد') || params.lastPeerError.includes('پاسخی')) {
      return params.lastPeerError;
    }
  }
  if (params.iceState === 'failed' || params.iceState === 'disconnected') {
    return 'اتصال مستقیم WebRTC (ICE) شکست خورد؛ احتمالاً یکی از دو طرف پشت NAT سخت (Symmetric NAT)، فایروال یا VPN محدود قرار دارد.';
  }
  if (params.stunCandidatesCount === 0 && params.hostCandidatesCount === 0) {
    return 'مرورگر نتوانست هیچ کاندیدای WebRTC بسازد؛ احتمالاً دسترسی WebRTC یا شبکه مسدود است.';
  }
  if (params.stunCandidatesCount === 0) {
    return 'هیچ‌یک از سرورهای STUN پاسخ ندادند (پورت UDP یا سرورهای STUN در شبکه/فایروال مسدود هستند و اتصال بین شبکه‌های مختلف ممکن نیست).';
  }
  if (params.lastPeerError) {
    return params.lastPeerError;
  }
  return null;
}

export async function checkPeerBrokerAvailability(timeoutMs = 4500): Promise<{
  reachable: boolean;
  latencyMs: number | null;
  detailFa: string;
}> {
  const url = getPeerBrokerHealthUrl(PEERJS_BROKER_CONFIG);
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
    const msg = err instanceof Error && err.name === 'AbortError'
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

export async function probeWebRtcIceCandidates(timeoutMs = 3200): Promise<{
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
    pc = new RTCPeerConnection({ iceServers: PEERJS_STUN_SERVERS });
    pc.createDataChannel('diag-probe');

    let stunCandidatesCount = 0;
    let hostCandidatesCount = 0;
    let relayCandidatesCount = 0;
    let firstCandidateType: string | null = null;

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

        if (stunCandidatesCount >= 2 && hostCandidatesCount >= 1) {
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
  const brokerRes = online
    ? await checkPeerBrokerAvailability()
    : { reachable: false, latencyMs: null, detailFa: 'اینترنت قطع است' };

  const probe = online
    ? await probeWebRtcIceCandidates()
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
      : probe.stunCandidatesCount > 0
        ? 'srflx'
        : probe.firstCandidateType;

  const classified = classifyConnectionTypeFa(
    candidateType,
    probe.stunCandidatesCount,
    probe.hostCandidatesCount,
    probe.relayCandidatesCount
  );

  const failureReasonFa = diagnosePeerConnectionFailureFa({
    online,
    brokerReachable: brokerRes.reachable || Boolean(liveTelemetry?.peerOpen),
    iceState: activeIceState,
    stunCandidatesCount: probe.stunCandidatesCount,
    hostCandidatesCount: probe.hostCandidatesCount,
    lastPeerError,
  });

  return {
    checkedAt: new Date().toLocaleTimeString('fa-IR'),
    online,
    brokerHost: PEERJS_BROKER_CONFIG.host,
    brokerReachability:
      brokerRes.reachable || Boolean(liveTelemetry?.peerOpen) ? 'reachable' : 'unreachable',
    brokerLatencyMs: brokerRes.latencyMs,
    brokerDetailFa:
      brokerRes.reachable || !liveTelemetry?.peerOpen
        ? brokerRes.detailFa
        : 'متصل به سرور واسطه PeerJS',
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
