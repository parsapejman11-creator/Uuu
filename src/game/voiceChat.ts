import type Peer from 'peerjs';
import type { MediaConnection } from 'peerjs';
import type { AuthoritativePlayerState, OnlineGameMode, TeamId } from './rules';

export type VoiceMode = 'open' | 'ptt';
export type VoiceChannelScope = 'team' | 'all';
export type VoiceMicStatus = 'off' | 'requesting' | 'active' | 'ptt_ready' | 'error';

export const MAX_VOICE_PLAYERS = 4;
export const VOICE_SPEAKING_RMS_THRESHOLD = 0.024;
export const VOICE_SPEAKING_HANGOVER_MS = 280;

export const VOICE_MODE_STORAGE_KEY = 'bodycam_voice_mode_v1';
export const VOICE_VOLUME_STORAGE_KEY = 'bodycam_voice_volume_v1';
export const VOICE_CHANNEL_STORAGE_KEY = 'bodycam_voice_channel_v1';

export interface VoicePeerCallState {
  playerId: string;
  peerId: string;
  connected: boolean;
  hasRemoteStream: boolean;
  speaking: boolean;
}

export interface VoiceChatSnapshot {
  micStatus: VoiceMicStatus;
  micEnabled: boolean;
  transmitting: boolean;
  pttPressed: boolean;
  mode: VoiceMode;
  channelScope: VoiceChannelScope;
  volume: number; // 0..1
  mutedPlayerIds: string[];
  speakingPlayerIds: string[];
  connectedCallCount: number;
  peers: VoicePeerCallState[];
  secureContextOk: boolean;
  autoplayBlocked: boolean;
  lastErrorFa: string | null;
}

export interface VoiceSecureContextResult {
  allowed: boolean;
  reasonFa: string | null;
}

/**
 * Check whether the current origin permits microphone access (HTTPS or localhost dev).
 * On plain HTTP LAN URLs, browsers block navigator.mediaDevices completely.
 */
export function isVoiceChatSecureContext(
  protocol?: string,
  hostname?: string,
  isSecureContextFlag?: boolean
): VoiceSecureContextResult {
  const proto =
    protocol ??
    (typeof window !== 'undefined' && window.location ? window.location.protocol : 'https:');
  const host =
    hostname ??
    (typeof window !== 'undefined' && window.location ? window.location.hostname : 'localhost');
  const secureFlag =
    typeof isSecureContextFlag === 'boolean'
      ? isSecureContextFlag
      : typeof window !== 'undefined'
        ? Boolean(window.isSecureContext)
        : true;

  const isLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  if (proto === 'https:' || (isLocalhost && secureFlag)) {
    return { allowed: true, reasonFa: null };
  }
  return {
    allowed: false,
    reasonFa:
      'چت صوتی فقط روی آدرس امن HTTPS (نسخهٔ Deploy شده) فعال است. روی آدرس HTTP مرورگر اجازهٔ دسترسی به میکروفون نمی‌دهد.',
  };
}

/**
 * Standard WebRTC voice capture constraints with echo cancellation,
 * noise suppression, and auto gain control explicitly enabled.
 */
export function getAudioCaptureConstraints(): MediaStreamConstraints {
  return {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  };
}

/**
 * Map browser getUserMedia errors to clear, actionable Persian messages.
 */
export function mapMicrophoneErrorToFa(err: unknown): string {
  const name =
    typeof err === 'object' && err !== null && 'name' in err
      ? String((err as { name?: unknown }).name || '')
      : '';
  const msg =
    typeof err === 'object' && err !== null && 'message' in err
      ? String((err as { message?: unknown }).message || '')
      : '';

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return 'دسترسی به میکروفون داده نشد. بازی بدون چت صوتی ادامه دارد (برای فعال‌سازی اجازهٔ میکروفون را در مرورگر تأیید کنید).';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'میکروفونی روی این دستگاه پیدا نشد. بازی بدون چت صوتی ادامه دارد.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
    return 'میکروفون توسط برنامه دیگری در حال استفاده است یا قابل دسترس نیست.';
  }
  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
    return 'تنظیمات صوتی میکروفون روی این دستگاه پشتیبانی نشد.';
  }
  if (msg.toLowerCase().includes('https') || msg.toLowerCase().includes('secure')) {
    return 'چت صوتی فقط روی آدرس امن HTTPS (نسخهٔ Deploy شده) فعال است.';
  }
  return 'خطا در فعال‌سازی میکروفون. بازی بدون چت صوتی ادامه دارد.';
}

/**
 * Compute normalized RMS amplitude (0..1) from an AnalyserNode time-domain Uint8Array.
 */
export function computeRmsAudioLevel(timeDomainBytes: Uint8Array): number {
  if (!timeDomainBytes || timeDomainBytes.length === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < timeDomainBytes.length; i++) {
    const centered = (timeDomainBytes[i] - 128) / 128;
    sumSq += centered * centered;
  }
  return Math.sqrt(sumSq / timeDomainBytes.length);
}

/**
 * Determine whether a remote player's voice audio should be audible to the local player,
 * respecting per-player mute, master volume, and team-only channel filter in team modes.
 */
export function shouldPlayRemoteVoice(params: {
  remotePlayerId: string;
  remoteTeam: TeamId;
  localTeam: TeamId;
  gameMode: OnlineGameMode;
  channelScope: VoiceChannelScope;
  mutedPlayerIds: ReadonlySet<string> | readonly string[];
  masterVolume: number;
}): boolean {
  if (params.masterVolume <= 0.001) return false;
  const isMuted = Array.isArray(params.mutedPlayerIds)
    ? params.mutedPlayerIds.includes(params.remotePlayerId)
    : (params.mutedPlayerIds as ReadonlySet<string>).has(params.remotePlayerId);
  if (isMuted) return false;

  const isTeamMode =
    params.gameMode === 'tdm_1v1' ||
    params.gameMode === 'tdm_2v2' ||
    params.gameMode === 'coop';

  if (isTeamMode && params.channelScope === 'team') {
    return params.remoteTeam === params.localTeam;
  }
  return true;
}

/**
 * Select eligible remote peers in the room for mesh voice calls (capped at MAX_VOICE_PLAYERS = 4 total).
 */
export function selectVoiceMeshTargets(
  players: readonly AuthoritativePlayerState[],
  localPlayerId: string,
  localPeerId: string | null
): Array<{ playerId: string; peerId: string; team: TeamId; name: string }> {
  const cappedRoom = players.slice(0, MAX_VOICE_PLAYERS);
  const targets: Array<{ playerId: string; peerId: string; team: TeamId; name: string }> = [];
  for (const p of cappedRoom) {
    if (p.id === localPlayerId) continue;
    if (!p.peerId) continue;
    if (localPeerId && p.peerId === localPeerId) continue;
    targets.push({
      playerId: p.id,
      peerId: p.peerId,
      team: p.team || 'alpha',
      name: p.name,
    });
  }
  return targets;
}

/**
 * Deterministic glare tie-breaker when two peers call simultaneously.
 */
export function shouldPreferOutgoingCallOnGlare(localPeerId: string, remotePeerId: string): boolean {
  return localPeerId > remotePeerId;
}

export function loadSavedVoiceMode(): VoiceMode {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return 'open';
    const raw = window.localStorage.getItem(VOICE_MODE_STORAGE_KEY);
    return raw === 'ptt' ? 'ptt' : 'open';
  } catch {
    return 'open';
  }
}

export function saveVoiceMode(mode: VoiceMode): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(VOICE_MODE_STORAGE_KEY, mode);
    }
  } catch {
    // ignore storage errors
  }
}

export function loadSavedVoiceVolume(): number {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return 0.9;
    const raw = window.localStorage.getItem(VOICE_VOLUME_STORAGE_KEY);
    if (!raw) return 0.9;
    const num = Number(raw);
    if (!Number.isFinite(num)) return 0.9;
    return Math.max(0, Math.min(1, num));
  } catch {
    return 0.9;
  }
}

export function saveVoiceVolume(vol: number): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(VOICE_VOLUME_STORAGE_KEY, String(Math.max(0, Math.min(1, vol))));
    }
  } catch {
    // ignore
  }
}

export function loadSavedVoiceChannelScope(): VoiceChannelScope {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return 'team';
    const raw = window.localStorage.getItem(VOICE_CHANNEL_STORAGE_KEY);
    return raw === 'all' ? 'all' : 'team';
  } catch {
    return 'team';
  }
}

export function saveVoiceChannelScope(scope: VoiceChannelScope): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(VOICE_CHANNEL_STORAGE_KEY, scope);
    }
  } catch {
    // ignore
  }
}

interface RemoteVoiceEntry {
  playerId: string;
  peerId: string;
  team: TeamId;
  call: MediaConnection;
  stream: MediaStream | null;
  audioEl: HTMLAudioElement | null;
  sourceNode: MediaStreamAudioSourceNode | null;
  analyser: AnalyserNode | null;
  dataArray: Uint8Array<ArrayBuffer> | null;
  speaking: boolean;
  lastSpokeAt: number;
  connected: boolean;
}

/**
 * Pure WebRTC MediaConnection voice mesh manager built on top of the existing PeerJS Peer.
 * Audio flows strictly over WebRTC media tracks (peer.call) — never through game DataConnections.
 */
export class PeerVoiceChatManager {
  private peer: Peer | null = null;
  private localPeerId: string | null = null;
  private localPlayerId: string;
  private localTeam: TeamId = 'alpha';
  private gameMode: OnlineGameMode = 'tdm_1v1';
  private roomCode = '';
  private roomPlayers: AuthoritativePlayerState[] = [];

  private localStream: MediaStream | null = null;
  private localAudioCtx: AudioContext | null = null;
  private localSourceNode: MediaStreamAudioSourceNode | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private localDataArray: Uint8Array<ArrayBuffer> | null = null;
  private localSpeaking = false;
  private localLastSpokeAt = 0;

  private remoteEntries = new Map<string, RemoteVoiceEntry>(); // remotePeerId -> entry
  private audioHostContainer: HTMLDivElement | null = null;

  private micStatus: VoiceMicStatus = 'off';
  private mode: VoiceMode = loadSavedVoiceMode();
  private channelScope: VoiceChannelScope = loadSavedVoiceChannelScope();
  private volume: number = loadSavedVoiceVolume();
  private mutedPlayerIds = new Set<string>();
  private pttPressed = false;
  private autoplayBlocked = false;
  private lastErrorFa: string | null = null;

  private vadIntervalId: number | null = null;
  private autoplayUnlockBound = false;
  private onSnapshot: (snapshot: VoiceChatSnapshot) => void;
  private onNotice?: (msgFa: string) => void;

  private boundPeerCallHandler: ((call: MediaConnection) => void) | null = null;

  constructor(
    localPlayerId: string,
    onSnapshot: (snapshot: VoiceChatSnapshot) => void,
    onNotice?: (msgFa: string) => void
  ) {
    this.localPlayerId = localPlayerId;
    this.onSnapshot = onSnapshot;
    this.onNotice = onNotice;
    this.bindAutoplayUnlockListeners();
    this.emitSnapshot();
  }

  private ensureAudioHostContainer(): HTMLDivElement | null {
    if (typeof document === 'undefined') return null;
    if (this.audioHostContainer && document.body.contains(this.audioHostContainer)) {
      return this.audioHostContainer;
    }
    const existing = document.getElementById('voice-chat-audio-host') as HTMLDivElement | null;
    if (existing) {
      this.audioHostContainer = existing;
      return existing;
    }
    const div = document.createElement('div');
    div.id = 'voice-chat-audio-host';
    div.style.position = 'fixed';
    div.style.width = '1px';
    div.style.height = '1px';
    div.style.opacity = '0';
    div.style.pointerEvents = 'none';
    div.style.overflow = 'hidden';
    document.body.appendChild(div);
    this.audioHostContainer = div;
    return div;
  }

  private ensureAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.localAudioCtx) {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        this.localAudioCtx = new AudioCtx();
      } catch {
        return null;
      }
    }
    if (this.localAudioCtx && this.localAudioCtx.state === 'suspended') {
      this.localAudioCtx.resume().catch(() => {});
    }
    return this.localAudioCtx;
  }

  private handleGlobalUserGesture = () => {
    this.unlockAudioPlayback();
  };

  private bindAutoplayUnlockListeners() {
    if (typeof window === 'undefined' || this.autoplayUnlockBound) return;
    this.autoplayUnlockBound = true;
    window.addEventListener('pointerdown', this.handleGlobalUserGesture, { passive: true });
    window.addEventListener('touchstart', this.handleGlobalUserGesture, { passive: true });
    window.addEventListener('keydown', this.handleGlobalUserGesture, { passive: true });
  }

  public unlockAudioPlayback(): void {
    if (this.localAudioCtx && this.localAudioCtx.state === 'suspended') {
      this.localAudioCtx.resume().catch(() => {});
    }
    let anyBlocked = false;
    this.remoteEntries.forEach((entry) => {
      if (entry.audioEl && entry.audioEl.paused && entry.stream) {
        entry.audioEl.play().catch(() => {
          anyBlocked = true;
        });
      }
    });
    if (this.autoplayBlocked && !anyBlocked) {
      this.autoplayBlocked = false;
      this.emitSnapshot();
    }
  }

  /**
   * Attach to the live PeerJS Peer instance owned by PeerMultiplayerManager.
   * Never requests microphone permission automatically — only listens for incoming voice calls.
   */
  public attachPeer(peer: Peer | null, localPeerId: string | null): void {
    if (this.peer === peer && this.localPeerId === localPeerId) return;

    // Detach previous peer listener safely
    if (this.peer && this.boundPeerCallHandler) {
      try {
        this.peer.off('call', this.boundPeerCallHandler);
      } catch {
        // ignore
      }
    }

    this.closeAllRemoteCalls();
    this.peer = peer;
    this.localPeerId = localPeerId;

    if (peer && !peer.destroyed) {
      this.boundPeerCallHandler = (call: MediaConnection) => {
        this.handleIncomingCall(call);
      };
      peer.on('call', this.boundPeerCallHandler);
      this.ensureVadLoopRunning();
      this.reconcileMeshCalls();
    } else {
      this.stopVadLoopIfIdle();
    }
    this.emitSnapshot();
  }

  /**
   * Sync room roster, teams, and game mode so voice mesh connects to current room members
   * (max 4 players) and immediately releases resources for anyone who left.
   */
  public syncRoomRoster(
    roomCode: string,
    mode: OnlineGameMode,
    players: AuthoritativePlayerState[]
  ): void {
    this.roomCode = roomCode;
    this.gameMode = mode;
    this.roomPlayers = players;

    const me = players.find((p) => p.id === this.localPlayerId);
    if (me?.team) {
      this.localTeam = me.team;
    }

    const targets = selectVoiceMeshTargets(players, this.localPlayerId, this.localPeerId);
    const activePeerIds = new Set(targets.map((t) => t.peerId));

    // Close calls for players who left or disconnected
    const toRemove: string[] = [];
    this.remoteEntries.forEach((entry, remotePeerId) => {
      if (!activePeerIds.has(remotePeerId)) {
        toRemove.push(remotePeerId);
      } else {
        const updated = targets.find((t) => t.peerId === remotePeerId);
        if (updated) {
          entry.playerId = updated.playerId;
          entry.team = updated.team;
        }
      }
    });
    for (const rid of toRemove) {
      this.cleanupRemotePeer(rid);
    }

    // Re-apply team/mute audio volume filters immediately
    this.applyAudioRoutingFilters();

    // Establish calls to any newly joined peers if our mic is active
    this.reconcileMeshCalls();
    this.emitSnapshot();
  }

  public clearRoomAndDisconnect(): void {
    this.roomCode = '';
    this.roomPlayers = [];
    this.pttPressed = false;
    this.closeAllRemoteCalls();
    this.disableMicrophone(false);
    this.stopVadLoopIfIdle();
    this.emitSnapshot();
  }

  private reconcileMeshCalls(): void {
    if (!this.peer || this.peer.destroyed || !this.localPeerId) return;
    if (!this.localStream) return; // Only initiate outgoing calls when local mic stream is enabled

    const targets = selectVoiceMeshTargets(this.roomPlayers, this.localPlayerId, this.localPeerId);
    for (const target of targets) {
      const existing = this.remoteEntries.get(target.peerId);
      if (existing) {
        // If we already have a call that was answered without mic (recvonly) and now have localStream,
        // upgrade by replacing outgoing audio track or initiating a fresh bidirectional call.
        const pc = (existing.call as MediaConnection & { peerConnection?: RTCPeerConnection }).peerConnection;
        const micTrack = this.localStream.getAudioTracks()[0];
        if (pc && micTrack) {
          const audioSender = pc.getSenders().find((s) => s.track?.kind === 'audio');
          if (audioSender) {
            if (audioSender.track !== micTrack) {
              audioSender.replaceTrack(micTrack).catch(() => {});
            }
            continue;
          }
          // Existing call had no outgoing audio sender (was listen-only) -> initiate bidirectional call
          this.initiateOutgoingCall(target.peerId, target.playerId, target.team, true);
        }
        continue;
      }
      this.initiateOutgoingCall(target.peerId, target.playerId, target.team, false);
    }
  }

  private initiateOutgoingCall(
    remotePeerId: string,
    remotePlayerId: string,
    remoteTeam: TeamId,
    renegotiate: boolean
  ): void {
    if (!this.peer || this.peer.destroyed || !this.localStream) return;
    try {
      const call = this.peer.call(remotePeerId, this.localStream, {
        metadata: {
          type: 'voice',
          playerId: this.localPlayerId,
          roomCode: this.roomCode,
          hasMic: true,
          renegotiate,
        },
      });
      if (!call) return;
      this.registerCall(remotePeerId, remotePlayerId, remoteTeam, call);
    } catch {
      // Do not crash game if a single peer call fails
    }
  }

  private handleIncomingCall(call: MediaConnection): void {
    const meta = (call.metadata || {}) as {
      type?: string;
      playerId?: string;
      roomCode?: string;
      hasMic?: boolean;
      renegotiate?: boolean;
    };
    if (meta.type && meta.type !== 'voice') return;
    if (this.roomCode && meta.roomCode && meta.roomCode !== this.roomCode) {
      try {
        call.close();
      } catch {
        // ignore
      }
      return;
    }

    const remotePeerId = call.peer;
    const rosterMatch = this.roomPlayers.find(
      (p) => p.peerId === remotePeerId || (meta.playerId && p.id === meta.playerId)
    );
    const remotePlayerId = rosterMatch?.id || meta.playerId || remotePeerId;
    const remoteTeam: TeamId = rosterMatch?.team || 'alpha';

    // Cap total remote voice connections to MAX_VOICE_PLAYERS - 1 (room max 4 players)
    if (!this.remoteEntries.has(remotePeerId) && this.remoteEntries.size >= MAX_VOICE_PLAYERS - 1) {
      try {
        call.close();
      } catch {
        // ignore
      }
      return;
    }

    // Resolve simultaneous glare unless this is an explicit renegotiation/upgrade
    const existing = this.remoteEntries.get(remotePeerId);
    if (
      existing &&
      !meta.renegotiate &&
      this.localPeerId &&
      this.localStream &&
      shouldPreferOutgoingCallOnGlare(this.localPeerId, remotePeerId)
    ) {
      // Our outgoing call wins glare; close duplicate incoming call quietly
      try {
        call.close();
      } catch {
        // ignore
      }
      return;
    }

    try {
      if (this.localStream) {
        call.answer(this.localStream);
      } else {
        // Listen-only answer: receives remote player's audio without requesting local microphone permission!
        call.answer();
      }
    } catch {
      try {
        call.close();
      } catch {
        // ignore
      }
      return;
    }

    this.registerCall(remotePeerId, remotePlayerId, remoteTeam, call);
  }

  private registerCall(
    remotePeerId: string,
    remotePlayerId: string,
    remoteTeam: TeamId,
    call: MediaConnection
  ): void {
    const previous = this.remoteEntries.get(remotePeerId);
    if (previous && previous.call !== call) {
      this.cleanupRemotePeer(remotePeerId);
    }

    const entry: RemoteVoiceEntry = {
      playerId: remotePlayerId,
      peerId: remotePeerId,
      team: remoteTeam,
      call,
      stream: null,
      audioEl: null,
      sourceNode: null,
      analyser: null,
      dataArray: null,
      speaking: false,
      lastSpokeAt: 0,
      connected: true,
    };
    this.remoteEntries.set(remotePeerId, entry);

    call.on('stream', (remoteStream) => {
      const current = this.remoteEntries.get(remotePeerId);
      if (!current || current.call !== call) return;
      this.attachRemoteStream(current, remoteStream);
    });

    const onEnded = () => {
      const current = this.remoteEntries.get(remotePeerId);
      if (current && current.call === call) {
        this.cleanupRemotePeer(remotePeerId);
        this.emitSnapshot();
      }
    };

    call.on('close', onEnded);
    call.on('error', onEnded);

    this.ensureVadLoopRunning();
    this.emitSnapshot();
  }

  private attachRemoteStream(entry: RemoteVoiceEntry, remoteStream: MediaStream): void {
    entry.stream = remoteStream;
    entry.connected = true;

    // 1. Attach to DOM <audio> element for reliable mobile & desktop WebRTC playback
    const container = this.ensureAudioHostContainer();
    if (typeof document !== 'undefined') {
      if (!entry.audioEl) {
        const audio = document.createElement('audio');
        audio.autoplay = true;
        audio.setAttribute('playsinline', 'true');
        (audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
        audio.dataset.voicePeer = entry.peerId;
        container?.appendChild(audio);
        entry.audioEl = audio;
      }
      entry.audioEl.srcObject = remoteStream;
      this.applyEntryAudioVolume(entry);
      entry.audioEl.play().catch(() => {
        this.autoplayBlocked = true;
        this.emitSnapshot();
      });
    }

    // 2. Attach AnalyserNode for Voice Activity Detection (speaking indicator)
    const ctx = this.ensureAudioContext();
    if (ctx && remoteStream.getAudioTracks().length > 0) {
      try {
        entry.sourceNode?.disconnect();
        entry.analyser?.disconnect();
        const src = ctx.createMediaStreamSource(remoteStream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.5;
        src.connect(analyser);
        entry.sourceNode = src;
        entry.analyser = analyser;
        entry.dataArray = new Uint8Array(new ArrayBuffer(analyser.fftSize));
      } catch {
        // Ignore Web Audio analyser errors on restricted platforms
      }
    }

    this.ensureVadLoopRunning();
    this.emitSnapshot();
  }

  private applyEntryAudioVolume(entry: RemoteVoiceEntry): void {
    if (!entry.audioEl) return;
    const audible = shouldPlayRemoteVoice({
      remotePlayerId: entry.playerId,
      remoteTeam: entry.team,
      localTeam: this.localTeam,
      gameMode: this.gameMode,
      channelScope: this.channelScope,
      mutedPlayerIds: this.mutedPlayerIds,
      masterVolume: this.volume,
    });
    entry.audioEl.muted = !audible;
    entry.audioEl.volume = audible ? Math.max(0, Math.min(1, this.volume)) : 0;
  }

  private applyAudioRoutingFilters(): void {
    this.remoteEntries.forEach((entry) => {
      this.applyEntryAudioVolume(entry);
    });
  }

  private cleanupRemotePeer(remotePeerId: string): void {
    const entry = this.remoteEntries.get(remotePeerId);
    if (!entry) return;
    this.remoteEntries.delete(remotePeerId);

    try {
      entry.sourceNode?.disconnect();
    } catch {
      // ignore
    }
    try {
      entry.analyser?.disconnect();
    } catch {
      // ignore
    }
    if (entry.audioEl) {
      try {
        entry.audioEl.pause();
        entry.audioEl.srcObject = null;
        entry.audioEl.remove();
      } catch {
        // ignore
      }
    }
    try {
      entry.call.close();
    } catch {
      // ignore
    }
  }

  private closeAllRemoteCalls(): void {
    const ids = Array.from(this.remoteEntries.keys());
    for (const id of ids) {
      this.cleanupRemotePeer(id);
    }
  }

  /**
   * Request microphone permission on-demand (ONLY called by explicit user action).
   */
  public async enableMicrophone(): Promise<boolean> {
    this.unlockAudioPlayback();

    const sec = isVoiceChatSecureContext();
    if (!sec.allowed) {
      this.micStatus = 'error';
      this.lastErrorFa = sec.reasonFa;
      this.onNotice?.(sec.reasonFa || 'چت صوتی فقط روی HTTPS فعال است.');
      this.emitSnapshot();
      return false;
    }

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      const msg =
        'مرورگر شما از دسترسی به میکروفون پشتیبانی نمی‌کند یا صفحه روی HTTPS نیست. بازی بدون چت صوتی ادامه دارد.';
      this.micStatus = 'error';
      this.lastErrorFa = msg;
      this.onNotice?.(msg);
      this.emitSnapshot();
      return false;
    }

    if (this.localStream) {
      this.syncLocalTrackTransmitState();
      this.reconcileMeshCalls();
      this.emitSnapshot();
      return true;
    }

    this.micStatus = 'requesting';
    this.lastErrorFa = null;
    this.emitSnapshot();

    try {
      const stream = await navigator.mediaDevices.getUserMedia(getAudioCaptureConstraints());
      this.localStream = stream;
      this.lastErrorFa = null;
      this.setupLocalAnalyser(stream);
      this.syncLocalTrackTransmitState();
      this.ensureVadLoopRunning();
      this.reconcileMeshCalls();
      this.onNotice?.(
        this.mode === 'ptt'
          ? 'میکروفون آماده شد (برای صحبت کلید V یا دکمه میکروفون را نگه دارید)'
          : 'چت صوتی فعال شد (میکروفون باز)'
      );
      this.emitSnapshot();
      return true;
    } catch (err) {
      const msg = mapMicrophoneErrorToFa(err);
      this.micStatus = 'error';
      this.lastErrorFa = msg;
      this.onNotice?.(msg);
      this.emitSnapshot();
      return false;
    }
  }

  public disableMicrophone(notify = true): void {
    this.pttPressed = false;
    this.localSpeaking = false;
    try {
      this.localSourceNode?.disconnect();
    } catch {
      // ignore
    }
    try {
      this.localAnalyser?.disconnect();
    } catch {
      // ignore
    }
    this.localSourceNode = null;
    this.localAnalyser = null;
    this.localDataArray = null;

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          // ignore
        }
      });
      this.localStream = null;
    }
    this.micStatus = 'off';
    if (notify) {
      this.onNotice?.('میکروفون خاموش شد');
    }
    this.stopVadLoopIfIdle();
    this.emitSnapshot();
  }

  public async toggleMicrophone(): Promise<void> {
    if (this.localStream) {
      this.disableMicrophone(true);
    } else {
      await this.enableMicrophone();
    }
  }

  /**
   * Handle Push-to-Talk press/release (keyboard V on desktop, hold button on mobile).
   */
  public async setPushToTalkActive(active: boolean): Promise<void> {
    this.unlockAudioPlayback();
    this.pttPressed = active;

    if (active && !this.localStream) {
      const ok = await this.enableMicrophone();
      if (!ok) {
        this.pttPressed = false;
        this.emitSnapshot();
        return;
      }
    }

    this.syncLocalTrackTransmitState();
    this.emitSnapshot();
  }

  private syncLocalTrackTransmitState(): void {
    if (!this.localStream) {
      this.micStatus = this.lastErrorFa ? 'error' : 'off';
      return;
    }
    const shouldTransmit = this.mode === 'open' ? true : this.pttPressed;
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = shouldTransmit;
    });
    if (!shouldTransmit) {
      this.localSpeaking = false;
    }
    this.micStatus = shouldTransmit ? 'active' : 'ptt_ready';
  }

  private setupLocalAnalyser(stream: MediaStream): void {
    const ctx = this.ensureAudioContext();
    if (!ctx || stream.getAudioTracks().length === 0) return;
    try {
      this.localSourceNode?.disconnect();
      this.localAnalyser?.disconnect();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      src.connect(analyser);
      this.localSourceNode = src;
      this.localAnalyser = analyser;
      this.localDataArray = new Uint8Array(new ArrayBuffer(analyser.fftSize));
    } catch {
      // Ignore analyser errors
    }
  }

  private ensureVadLoopRunning(): void {
    if (this.vadIntervalId !== null || typeof window === 'undefined') return;
    this.vadIntervalId = window.setInterval(() => {
      this.sampleVoiceActivity();
    }, 90);
  }

  private stopVadLoopIfIdle(): void {
    if (!this.localStream && this.remoteEntries.size === 0 && this.vadIntervalId !== null) {
      window.clearInterval(this.vadIntervalId);
      this.vadIntervalId = null;
    }
  }

  private sampleVoiceActivity(): void {
    const now = Date.now();
    let changed = false;

    // 1. Local mic VAD
    const isLocalTransmitting =
      Boolean(this.localStream) && (this.mode === 'open' || this.pttPressed);
    if (isLocalTransmitting && this.localAnalyser && this.localDataArray) {
      this.localAnalyser.getByteTimeDomainData(this.localDataArray);
      const rms = computeRmsAudioLevel(this.localDataArray);
      if (rms >= VOICE_SPEAKING_RMS_THRESHOLD) {
        this.localLastSpokeAt = now;
      }
      const nextSpeaking = now - this.localLastSpokeAt <= VOICE_SPEAKING_HANGOVER_MS && this.localLastSpokeAt > 0;
      if (nextSpeaking !== this.localSpeaking) {
        this.localSpeaking = nextSpeaking;
        changed = true;
      }
    } else if (this.localSpeaking) {
      this.localSpeaking = false;
      changed = true;
    }

    // 2. Remote streams VAD
    this.remoteEntries.forEach((entry) => {
      const audible = shouldPlayRemoteVoice({
        remotePlayerId: entry.playerId,
        remoteTeam: entry.team,
        localTeam: this.localTeam,
        gameMode: this.gameMode,
        channelScope: this.channelScope,
        mutedPlayerIds: this.mutedPlayerIds,
        masterVolume: this.volume,
      });

      if (audible && entry.analyser && entry.dataArray) {
        entry.analyser.getByteTimeDomainData(entry.dataArray);
        const rms = computeRmsAudioLevel(entry.dataArray);
        if (rms >= VOICE_SPEAKING_RMS_THRESHOLD) {
          entry.lastSpokeAt = now;
        }
        const nextSpeaking = now - entry.lastSpokeAt <= VOICE_SPEAKING_HANGOVER_MS && entry.lastSpokeAt > 0;
        if (nextSpeaking !== entry.speaking) {
          entry.speaking = nextSpeaking;
          changed = true;
        }
      } else if (entry.speaking) {
        entry.speaking = false;
        changed = true;
      }
    });

    if (changed) {
      this.emitSnapshot();
    }
  }

  public setVoiceMode(mode: VoiceMode): void {
    this.mode = mode;
    saveVoiceMode(mode);
    if (mode === 'open') {
      this.pttPressed = false;
    }
    this.syncLocalTrackTransmitState();
    this.emitSnapshot();
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    saveVoiceVolume(this.volume);
    this.applyAudioRoutingFilters();
    this.emitSnapshot();
  }

  public setChannelScope(scope: VoiceChannelScope): void {
    this.channelScope = scope;
    saveVoiceChannelScope(scope);
    this.applyAudioRoutingFilters();
    this.emitSnapshot();
  }

  public toggleMutePlayer(playerId: string): void {
    if (this.mutedPlayerIds.has(playerId)) {
      this.mutedPlayerIds.delete(playerId);
    } else {
      this.mutedPlayerIds.add(playerId);
    }
    this.applyAudioRoutingFilters();
    this.emitSnapshot();
  }

  public getSnapshot(): VoiceChatSnapshot {
    const speakingPlayerIds: string[] = [];
    if (this.localSpeaking) {
      speakingPlayerIds.push(this.localPlayerId);
    }
    const peers: VoicePeerCallState[] = [];
    let connectedCallCount = 0;

    this.remoteEntries.forEach((entry) => {
      if (entry.connected) connectedCallCount++;
      if (entry.speaking) speakingPlayerIds.push(entry.playerId);
      peers.push({
        playerId: entry.playerId,
        peerId: entry.peerId,
        connected: entry.connected,
        hasRemoteStream: Boolean(entry.stream),
        speaking: entry.speaking,
      });
    });

    const sec = isVoiceChatSecureContext();
    const transmitting = Boolean(this.localStream) && (this.mode === 'open' || this.pttPressed);

    return {
      micStatus: this.micStatus,
      micEnabled: Boolean(this.localStream),
      transmitting,
      pttPressed: this.pttPressed,
      mode: this.mode,
      channelScope: this.channelScope,
      volume: this.volume,
      mutedPlayerIds: Array.from(this.mutedPlayerIds),
      speakingPlayerIds,
      connectedCallCount,
      peers,
      secureContextOk: sec.allowed,
      autoplayBlocked: this.autoplayBlocked,
      lastErrorFa: this.lastErrorFa,
    };
  }

  private emitSnapshot(): void {
    this.onSnapshot(this.getSnapshot());
  }

  public dispose(): void {
    this.clearRoomAndDisconnect();
    if (this.peer && this.boundPeerCallHandler) {
      try {
        this.peer.off('call', this.boundPeerCallHandler);
      } catch {
        // ignore
      }
    }
    this.peer = null;
    if (typeof window !== 'undefined' && this.autoplayUnlockBound) {
      window.removeEventListener('pointerdown', this.handleGlobalUserGesture);
      window.removeEventListener('touchstart', this.handleGlobalUserGesture);
      window.removeEventListener('keydown', this.handleGlobalUserGesture);
      this.autoplayUnlockBound = false;
    }
    if (this.localAudioCtx) {
      try {
        this.localAudioCtx.close();
      } catch {
        // ignore
      }
      this.localAudioCtx = null;
    }
    if (this.audioHostContainer) {
      try {
        this.audioHostContainer.remove();
      } catch {
        // ignore
      }
      this.audioHostContainer = null;
    }
  }
}
