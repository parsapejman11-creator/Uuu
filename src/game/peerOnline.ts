import Peer, { DataConnection } from 'peerjs';
import {
  MapId,
  OnlineGameMode,
  TeamId,
  RoundPhase,
  PeerConnectionStatus,
  PeerRole,
  AuthoritativeRoomState,
  AuthoritativePlayerState,
  ROUND_DURATION_SEC,
  ROUND_INTERMISSION_SEC,
  ROUND_COUNTDOWN_SEC,
  ROUND_MATCH_WIN_SCORE,
  SPAWN_PROTECTION_SEC,
  isRoundBasedMode,
  isOgOnlineMode,
  validateOgJoinCompatibility,
  sanitizeOgRoomMap,
  getTeamColor,
  getTeamNameFa,
  canDamagePlayer,
  assignBalancedTeam,
  getTeamSpawnPosition,
  awardRoundPointToTeam,
  beginRoundCountdownState,
  finishRoundCountdownState,
  startNextAuthoritativeRound,
  resetAuthoritativeMatch,
  isPlayerSpawnProtected,
  clearPlayerSpawnProtection,
  generatePeerRoomCode,
  normalizeRoomCode,
  roomCodeToHostPeerId,
  mergeClientInputIntoHostState,
  removeDisconnectedPlayerFromHostState,
  markPlayerDisconnectedInHostState,
  reclaimDisconnectedPlayerInHostState,
  pruneExpiredDisconnectedPlayers,
  toggleRematchVote,
  areAllActivePlayersReadyForRematch,
  castMapVote,
  resolveMapVoteWinner,
  RECONNECT_GRACE_MS,
  isStaleClientInputForRespawn,
  VERSION_MISMATCH_MESSAGE_FA,
  checkOnlineVersionCompatibility,
  getMapArenaHalf,
  HostMatchSettings,
  DEFAULT_HOST_MATCH_SETTINGS,
  sanitizeHostMatchSettings,
  TeamTacticalPing,
  TeamQuickMessage,
  TeamQuickMessageId,
  TEAM_PING_TTL_MS,
  TEAM_QUICK_MSG_TTL_MS,
  TEAM_SIGNAL_COOLDOWN_MS,
  getTeamQuickMessageTextFa,
  isTeamCommsMode,
  shouldReceiveTeamSignal,
  ClientValidationTracker,
  validateClientMovementPosition,
  validateClientShootEvent,
  validateAuthoritativeHitDamage,
  assignBalancedHumanTeam,
  reconcileOnlineBots,
  stepOnlineBotsAuthoritative,
  OnlineBotRuntimeState,
  OnlineBotSimHelpers,
} from './rules';
import {
  PEERJS_BROKER_LIST,
  PEERJS_STUN_SERVERS,
  DIRECT_CONNECT_RELAY_FALLBACK_MS,
  PeerBrokerConfig,
  ResolvedIceConfig,
  computeReconnectBackoffMs,
  getPeerJsClientOptions,
  resolveRuntimeIceServers,
} from './peerConfig';
import type { ConnectionTransportType, LivePeerTelemetry } from './peerDiagnostics';
import { MYTHIC_M249_ID, MYTHIC_SHOTGUN_ID, OnlineSyncedCosmetics, sanitizeOnlineCosmetics } from './cosmetics';
import { MYTHIC_M249_EMOTE_ID, MYTHIC_SHOTGUN_EMOTE_ID, sanitizeEmoteId } from './mythicPerks';
import { APP_VERSION } from './version';
import { OG_FEATURE_FLAGS } from '../og/og.config';
import {
  CompactClientInputTuple,
  CompactPlayerPoseTuple,
  LocalSyncSnapshot,
  CLIENT_IDLE_HEARTBEAT_MS,
  HOST_TRANSFORM_BROADCAST_MS,
  encodeCompactClientInput,
  decodeCompactClientInput,
  encodeCompactPlayerPose,
  decodeCompactPlayerPose,
  shouldSendClientStateDelta,
} from './perf';

export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

export type P2PPacket =
  | {
      type: 'client:join';
      roomCode: string;
      playerId: string;
      peerId?: string;
      name: string;
      password?: string;
      weaponIdx: number;
      appVersion?: string;
      cosmetics?: OnlineSyncedCosmetics;
      ogMode?: boolean;
    }
  | {
      type: 'client:cosmetics';
      roomCode: string;
      playerId: string;
      cosmetics?: OnlineSyncedCosmetics;
    }
  | {
      type: 'client:emote';
      roomCode: string;
      playerId: string;
      emoteId: string | null;
    }
  | {
      type: 'host:emote';
      roomCode: string;
      playerId: string;
      emoteId: string | null;
      startedAt: number;
    }
  | {
      type: 'client:input';
      roomCode: string;
      playerId: string;
      name: string;
      x: number;
      y: number;
      z: number;
      yaw: number;
      pitch: number;
      weaponIdx: number;
      hp: number;
      kills: number;
      score: number;
      roundNum?: number;
      respawnSeq?: number;
      isSliding?: boolean;
      anim?: number;
      animAt?: number;
    }
  | {
      type: 'c:i';
      d: CompactClientInputTuple;
    }
  | {
      type: 'h:p';
      r: string;
      p: CompactPlayerPoseTuple[];
    }
  | {
      type: 'client:shoot';
      roomCode: string;
      playerId: string;
      weaponIdx: number;
      from: Vector3Like;
      to: Vector3Like;
    }
  | {
      type: 'client:hit';
      roomCode: string;
      attackerId: string;
      targetId: string;
      damage: number;
      isHeadshot: boolean;
      weaponIdx?: number;
    }
  | {
      type: 'client:switch_team';
      roomCode: string;
      playerId: string;
      team?: TeamId;
    }
  | {
      type: 'client:leave';
      roomCode: string;
      playerId: string;
      name: string;
    }
  | {
      type: 'client:ping';
      roomCode: string;
      playerId: string;
      sentAt: number;
      lastPingMs?: number;
    }
  | {
      type: 'host:pong';
      roomCode: string;
      playerId: string;
      sentAt: number;
    }
  | {
      type: 'client:lobby_ready';
      roomCode: string;
      playerId: string;
      ready: boolean;
    }
  | {
      type: 'client:rematch_vote';
      roomCode: string;
      playerId: string;
      ready: boolean;
    }
  | {
      type: 'client:map_vote';
      roomCode: string;
      playerId: string;
      mapId: MapId;
    }
  | {
      type: 'host:state';
      room: AuthoritativeRoomState;
      joinedPlayerName?: string;
      leftPlayerName?: string;
    }
  | {
      type: 'host:shoot';
      roomCode: string;
      playerId: string;
      weaponIdx: number;
      from: Vector3Like;
      to: Vector3Like;
    }
  | {
      type: 'host:map';
      roomCode: string;
      mapId: MapId;
    }
  | {
      type: 'host:hit';
      roomCode: string;
      attackerId: string;
      attackerName: string;
      attackerTeam: TeamId;
      targetId: string;
      targetName: string;
      targetTeam: TeamId;
      weaponIdx: number;
      isHeadshot: boolean;
      damage: number;
      targetHp: number;
      killed: boolean;
      respawnPos?: { x: number; y: number; z: number; yaw: number };
      respawnSeq?: number;
      attackerCosmetics?: OnlineSyncedCosmetics;
      targetPos?: Vector3Like;
    }
  | {
      type: 'client:team_ping';
      roomCode: string;
      playerId: string;
      x: number;
      y: number;
      z: number;
    }
  | {
      type: 'host:team_ping';
      roomCode: string;
      ping: TeamTacticalPing;
    }
  | {
      type: 'client:team_msg';
      roomCode: string;
      playerId: string;
      messageId: TeamQuickMessageId;
    }
  | {
      type: 'host:team_msg';
      roomCode: string;
      message: TeamQuickMessage;
    }
  | {
      type: 'host:round_respawn';
      roomCode: string;
      currentRound: number;
      alphaScore: number;
      bravoScore: number;
      messageFa: string;
      roundPhase?: RoundPhase;
      countdownRemainingSec?: number;
      startingHp?: number;
      spawns?: Record<string, { team: TeamId; x: number; y: number; z: number; yaw: number; respawnSeq: number }>;
    }
  | {
      type: 'host:error';
      roomCode: string;
      targetPlayerId?: string;
      message: string;
    }
  | {
      type: 'host:closed';
      roomCode: string;
      message: string;
    };

export interface ConfirmedOnlineHitEvent {
  attackerId: string;
  attackerName: string;
  attackerTeam: TeamId;
  targetId: string;
  targetName: string;
  targetTeam: TeamId;
  weaponIdx: number;
  isHeadshot: boolean;
  killed: boolean;
  attackerCosmetics?: OnlineSyncedCosmetics;
  targetPos?: Vector3Like;
}

export interface PeerMultiplayerCallbacks {
  onStatusChange: (status: PeerConnectionStatus, role: PeerRole, error: string | null) => void;
  onRoomState: (room: AuthoritativeRoomState) => void;
  onRoomLeft: () => void;
  onRemoteShoot: (playerId: string, weaponIdx: number, from: Vector3Like, to: Vector3Like) => void;
  onMapChangedByHost: (mapId: MapId) => void;
  onLocalPlayerDamaged: (
    damage: number,
    attackerName: string,
    killed: boolean,
    respawnPos?: { x: number; y: number; z: number; yaw: number },
    attackerId?: string
  ) => void;
  onPlayerHitConfirmed?: (evt: ConfirmedOnlineHitEvent) => void;
  onRoundRespawn?: (currentRound: number, team: TeamId, spawnPos: { x: number; z: number; yaw: number }, messageFa: string) => void;
  onNotice: (messageFa: string) => void;
  onPublicRoomsUpdated?: (rooms: AuthoritativeRoomState[]) => void;
  onPeerReady?: (peer: Peer | null, localPeerId: string | null) => void;
  onPingUpdate?: (pingMs: number | null) => void;
  onReconnectingChange?: (reconnecting: boolean, remainingSec: number) => void;
  onTeamPing?: (ping: TeamTacticalPing) => void;
  onTeamQuickMessage?: (msg: TeamQuickMessage) => void;
  onRemoteEmote?: (playerId: string, emoteId: string | null) => void;
  onTransportChange?: (info: {
    transportType: ConnectionTransportType;
    relayFallbackActive: boolean;
    brokerHost: string;
    hasTurn: boolean;
  }) => void;
}

export class PeerMultiplayerManager {
  private peer: Peer | null = null;
  private hostConnections = new Map<string, DataConnection>(); // playerId -> conn (when role === 'host')
  private connectionPlayerIds = new WeakMap<DataConnection, string>();
  private clientValidators = new Map<string, ClientValidationTracker>();
  private teamSignalCooldowns = new Map<string, number>();
  private onlineBotRuntimes = new Map<string, OnlineBotRuntimeState>();
  private lastOnlineBotBroadcastAt = 0;
  private clientConn: DataConnection | null = null; // conn to host (when role === 'client')
  private bcChannel: BroadcastChannel | null = null;
  private localCosmetics: OnlineSyncedCosmetics | undefined = undefined;
  private localOgMode = false;

  private role: PeerRole = 'none';
  private status: PeerConnectionStatus = 'idle';
  private lastError: string | null = null;

  private localPlayerId: string;
  private localPlayerName: string;
  private roomPassword = '';
  private authoritativeRoom: AuthoritativeRoomState | null = null;
  private joinTimeoutId: number | null = null;
  private roundHeartbeatId: number | null = null;
  private pingIntervalId: number | null = null;
  private reconnectIntervalId: number | null = null;
  private reconnectDeadlineAt = 0;
  private lastJoinCode = '';
  private intentionalLeave = false;
  private smoothedPingMs: number | null = null;
  private lastBroadcastSecond = -1;
  private lastSyncedClientRound = 0;
  private lastSyncedClientPhase: string | null = null;
  private localRespawnSeq = 0;
  private lastLocalSyncSnapshot: LocalSyncSnapshot | null = null;
  private lastLocalSyncSentAtMs = 0;
  private lastHostPoseBroadcastAtMs = 0;
  private activeBrokerIndex = 0;
  private brokerRetryAttempt = 0;
  private brokerFailoverTimerId: number | null = null;
  private relayFallbackTimerId: number | null = null;
  private relayFallbackActive = false;
  private activeIceConfig: ResolvedIceConfig | null = null;
  private activeTransportType: ConnectionTransportType = 'none';
  private connectionEpoch = 0;
  private callbacks: PeerMultiplayerCallbacks;

  constructor(localPlayerId: string, localPlayerName: string, callbacks: PeerMultiplayerCallbacks) {
    this.localPlayerId = localPlayerId;
    this.localPlayerName = localPlayerName;
    this.callbacks = callbacks;
    this.initBroadcastBridge();
  }

  private getActiveBroker(): PeerBrokerConfig {
    return PEERJS_BROKER_LIST[this.activeBrokerIndex % PEERJS_BROKER_LIST.length] || PEERJS_BROKER_LIST[0];
  }

  private emitTransportUpdate() {
    const broker = this.getActiveBroker();
    this.callbacks.onTransportChange?.({
      transportType: this.activeTransportType,
      relayFallbackActive: this.relayFallbackActive,
      brokerHost: broker.host,
      hasTurn: Boolean(this.activeIceConfig?.hasTurn),
    });
  }

  public getTransportSummary(): {
    transportType: ConnectionTransportType;
    relayFallbackActive: boolean;
    brokerHost: string;
    hasTurn: boolean;
  } {
    const broker = this.getActiveBroker();
    return {
      transportType: this.activeTransportType,
      relayFallbackActive: this.relayFallbackActive,
      brokerHost: broker.host,
      hasTurn: Boolean(this.activeIceConfig?.hasTurn),
    };
  }

  private inspectPeerConnectionTransport(conn: DataConnection | null) {
    const pc = (conn as (DataConnection & { peerConnection?: RTCPeerConnection }) | null)?.peerConnection;
    if (!pc || typeof pc.getStats !== 'function') return;
    pc.getStats()
      .then((stats) => {
        let candidateType: string | null = null;
        stats.forEach((report) => {
          if (report.type === 'candidate-pair' && (report.nominated || report.state === 'succeeded')) {
            const localCand = report.localCandidateId ? stats.get(report.localCandidateId) : null;
            if (localCand && typeof localCand.candidateType === 'string') {
              candidateType = localCand.candidateType;
            }
          }
        });
        if (candidateType === 'relay' || this.relayFallbackActive) {
          this.activeTransportType = 'relay_turn';
        } else if (candidateType === 'srflx' || candidateType === 'prflx' || candidateType === 'host') {
          this.activeTransportType = 'direct_p2p';
        }
        this.emitTransportUpdate();
      })
      .catch(() => {
        // ignore stats errors on restricted browsers
      });
  }

  public getPlayerId(): string {
    return this.localPlayerId;
  }

  public getRole(): PeerRole {
    return this.role;
  }

  public getStatus(): PeerConnectionStatus {
    return this.status;
  }

  public getRoom(): AuthoritativeRoomState | null {
    return this.authoritativeRoom;
  }

  public getLocalTeam(): TeamId {
    const me = this.authoritativeRoom?.players.find((p) => p.id === this.localPlayerId);
    return me?.team || 'alpha';
  }

  public getPeerInstance(): Peer | null {
    return this.peer;
  }

  public getLocalPeerId(): string | null {
    return this.peer?.id || null;
  }

  public async getLiveTelemetry(): Promise<LivePeerTelemetry> {
    const peerOpen = Boolean(this.peer && !this.peer.destroyed && this.peer.open);
    const peerDisconnected = Boolean(this.peer?.disconnected);

    const activeConn =
      this.role === 'client'
        ? this.clientConn
        : Array.from(this.hostConnections.values()).find((c) => c.open) ||
          Array.from(this.hostConnections.values())[0] ||
          null;

    const activeBroker = this.getActiveBroker();
    const pc = (activeConn as (DataConnection & { peerConnection?: RTCPeerConnection }) | null)?.peerConnection;
    if (!pc) {
      return {
        peerOpen,
        peerDisconnected,
        iceConnectionState: 'new',
        iceGatheringState: 'new',
        signalingState: 'stable',
        candidateType: null,
        hasActivePeerConnection: false,
        activeBrokerHost: activeBroker.host,
        activeBrokerPort: activeBroker.port,
        activeBrokerSecure: activeBroker.secure,
        relayFallbackActive: this.relayFallbackActive,
        turnWorkerStatus: this.activeIceConfig?.turnWorkerStatus,
        hasTurnServers: Boolean(this.activeIceConfig?.hasTurn),
      };
    }

    let candidateType: string | null = null;
    try {
      const stats = await pc.getStats();
      stats.forEach((report) => {
        if (report.type === 'candidate-pair' && (report.nominated || report.state === 'succeeded')) {
          const localCand = report.localCandidateId ? stats.get(report.localCandidateId) : null;
          if (localCand && typeof localCand.candidateType === 'string') {
            candidateType = localCand.candidateType;
          }
        }
      });
    } catch {
      // ignore stats errors on closed/restricted connections
    }

    return {
      peerOpen,
      peerDisconnected,
      iceConnectionState: pc.iceConnectionState || 'new',
      iceGatheringState: pc.iceGatheringState || 'new',
      signalingState: pc.signalingState || 'stable',
      candidateType,
      hasActivePeerConnection: true,
      activeBrokerHost: activeBroker.host,
      activeBrokerPort: activeBroker.port,
      activeBrokerSecure: activeBroker.secure,
      relayFallbackActive: this.relayFallbackActive,
      turnWorkerStatus: this.activeIceConfig?.turnWorkerStatus,
      hasTurnServers: Boolean(this.activeIceConfig?.hasTurn),
    };
  }

  public setPlayerName(name: string): void {
    this.localPlayerName = (name || 'GHOST-01').slice(0, 18);
    if (this.role === 'host' && this.authoritativeRoom) {
      this.authoritativeRoom = mergeClientInputIntoHostState(this.authoritativeRoom, {
        id: this.localPlayerId,
        name: this.localPlayerName,
      });
      this.authoritativeRoom.hostName = this.localPlayerName;
      this.broadcastFromHost({
        type: 'host:state',
        room: this.authoritativeRoom,
      });
      this.callbacks.onRoomState(this.authoritativeRoom);
    }
  }

  public setOgMode(enabled: boolean): void {
    this.localOgMode = Boolean(enabled);
  }

  public setLocalCosmetics(raw?: OnlineSyncedCosmetics): void {
    this.localCosmetics = sanitizeOnlineCosmetics(raw);
    if (!this.authoritativeRoom) return;
    if (isOgOnlineMode(this.authoritativeRoom.mode)) return;
    if (this.role === 'host') {
      this.authoritativeRoom = {
        ...this.authoritativeRoom,
        players: this.authoritativeRoom.players.map((p) =>
          p.id === this.localPlayerId ? { ...p, cosmetics: this.localCosmetics } : p
        ),
      };
      this.broadcastFromHost({
        type: 'host:state',
        room: this.authoritativeRoom,
      });
      this.callbacks.onRoomState(this.authoritativeRoom);
    } else if (this.role === 'client') {
      this.sendToHost({
        type: 'client:cosmetics',
        roomCode: this.authoritativeRoom.code,
        playerId: this.localPlayerId,
        cosmetics: this.localCosmetics,
      });
    }
  }

  /**
   * Broadcasts or cancels an allowlisted emote (e.g., Mythic M249 exclusive dance).
   * Host strictly verifies the allowlist AND that the player actually has Mythic M249 equipped.
   */
  public sendEmote(emoteId: string | null): void {
    if (!this.authoritativeRoom || this.status !== 'connected') return;
    if (isOgOnlineMode(this.authoritativeRoom.mode)) return;
    const safeEmoteId = emoteId === null ? null : sanitizeEmoteId(emoteId);
    if (emoteId !== null && !safeEmoteId) return;
    const now = Date.now();
    if (this.role === 'host') {
      const me = this.authoritativeRoom.players.find((p) => p.id === this.localPlayerId);
      const allowedEmote =
        !safeEmoteId ||
        (Boolean(me?.alive) &&
          ((safeEmoteId === MYTHIC_M249_EMOTE_ID && me?.cosmetics?.m249 === MYTHIC_M249_ID) ||
            (safeEmoteId === MYTHIC_SHOTGUN_EMOTE_ID && me?.cosmetics?.sg === MYTHIC_SHOTGUN_ID)));
      if (!allowedEmote) {
        return;
      }
      this.authoritativeRoom = {
        ...this.authoritativeRoom,
        players: this.authoritativeRoom.players.map((p) =>
          p.id === this.localPlayerId
            ? { ...p, activeEmoteId: safeEmoteId, emoteStartedAt: safeEmoteId ? now : 0 }
            : p
        ),
      };
      this.broadcastFromHost({
        type: 'host:emote',
        roomCode: this.authoritativeRoom.code,
        playerId: this.localPlayerId,
        emoteId: safeEmoteId,
        startedAt: safeEmoteId ? now : 0,
      });
      this.callbacks.onRoomState(this.authoritativeRoom);
    } else if (this.role === 'client') {
      this.sendToHost({
        type: 'client:emote',
        roomCode: this.authoritativeRoom.code,
        playerId: this.localPlayerId,
        emoteId: safeEmoteId,
      });
    }
  }

  private setStatus(status: PeerConnectionStatus, role: PeerRole, error: string | null = null) {
    this.status = status;
    this.role = role;
    this.lastError = error;
    this.callbacks.onStatusChange(status, role, error);
  }

  private initBroadcastBridge() {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.bcChannel = new BroadcastChannel('bodycam_vanguard_p2p_v3');
        this.bcChannel.onmessage = (ev) => {
          const pkt = ev.data as P2PPacket;
          if (!pkt || typeof pkt.type !== 'string') return;
          this.handleIncomingPacket(pkt);
        };
      }
    } catch {
      // BroadcastChannel is optional
    }
  }

  private stopPingLoop() {
    if (this.pingIntervalId !== null) {
      window.clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
    this.smoothedPingMs = null;
  }

  private startClientPingLoop() {
    this.stopPingLoop();
    const sendPing = () => {
      if (this.role !== 'client' || !this.authoritativeRoom || this.status !== 'connected') return;
      this.sendToHost({
        type: 'client:ping',
        roomCode: this.authoritativeRoom.code,
        playerId: this.localPlayerId,
        sentAt: performance.now(),
        lastPingMs: this.smoothedPingMs ?? undefined,
      });
    };
    sendPing();
    this.pingIntervalId = window.setInterval(sendPing, 2000);
  }

  private stopClientReconnectLoop() {
    if (this.reconnectIntervalId !== null) {
      window.clearInterval(this.reconnectIntervalId);
      this.reconnectIntervalId = null;
    }
    this.reconnectDeadlineAt = 0;
    this.callbacks.onReconnectingChange?.(false, 0);
  }

  private destroyPeerInstance() {
    this.connectionEpoch++;
    if (this.joinTimeoutId !== null) {
      window.clearTimeout(this.joinTimeoutId);
      this.joinTimeoutId = null;
    }
    if (this.brokerFailoverTimerId !== null) {
      window.clearTimeout(this.brokerFailoverTimerId);
      this.brokerFailoverTimerId = null;
    }
    if (this.relayFallbackTimerId !== null) {
      window.clearTimeout(this.relayFallbackTimerId);
      this.relayFallbackTimerId = null;
    }
    if (this.roundHeartbeatId !== null) {
      window.clearInterval(this.roundHeartbeatId);
      this.roundHeartbeatId = null;
    }
    this.stopPingLoop();
    this.stopClientReconnectLoop();
    this.relayFallbackActive = false;
    this.activeTransportType = 'none';
    this.lastBroadcastSecond = -1;
    this.lastSyncedClientRound = 0;
    this.lastSyncedClientPhase = null;
    this.localRespawnSeq = 0;
    this.lastLocalSyncSnapshot = null;
    this.lastLocalSyncSentAtMs = 0;
    this.lastHostPoseBroadcastAtMs = 0;
    this.hostConnections.forEach((conn) => {
      try {
        conn.close();
      } catch {
        // ignore
      }
    });
    this.hostConnections.clear();
    this.clientValidators.clear();
    this.teamSignalCooldowns.clear();

    if (this.clientConn) {
      try {
        this.clientConn.close();
      } catch {
        // ignore
      }
      this.clientConn = null;
    }

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        // ignore
      }
      this.peer = null;
    }
    this.callbacks.onPeerReady?.(null, null);
    this.callbacks.onPingUpdate?.(null);
  }

  /**
   * Become the authoritative Host and create a room with an 8-character readable code.
   */
  public hostRoom(mapId: MapId, mode: OnlineGameMode, password = '', preferredCode?: string): string {
    this.destroyPeerInstance();
    const epoch = this.connectionEpoch;
    const roomCode = preferredCode ? normalizeRoomCode(preferredCode) : generatePeerRoomCode();
    this.roomPassword = password.trim();
    const now = Date.now();
    this.activeBrokerIndex = 0;
    this.brokerRetryAttempt = 0;
    this.relayFallbackActive = false;
    this.activeTransportType = 'none';
    this.setStatus('connecting', 'host', null);

    const isOgRoom = isOgOnlineMode(mode);
    const resolvedMapId = isOgRoom ? sanitizeOgRoomMap(mapId, OG_FEATURE_FLAGS.duel1v1Map) : mapId;
    const hostTeam: TeamId = 'alpha';
    const spawn = getTeamSpawnPosition(hostTeam, 0, resolvedMapId);

    const initialRoom: AuthoritativeRoomState = {
      code: roomCode,
      name: isOgRoom ? `اتاق OG ${this.localPlayerName}` : `اتاق ${this.localPlayerName}`,
      hasPassword: Boolean(this.roomPassword),
      isLocked: false,
      mapId: resolvedMapId,
      mode,
      hostId: this.localPlayerId,
      hostName: this.localPlayerName,
      wave: 1,
      teamScore: 0,
      alphaScore: 0,
      bravoScore: 0,
      currentRound: 1,
      roundDurationSec: DEFAULT_HOST_MATCH_SETTINGS.roundDurationSec,
      roundTimeRemainingSec: DEFAULT_HOST_MATCH_SETTINGS.roundDurationSec,
      roundPhase: 'playing',
      roundWinnerTeam: null,
      matchWinnerTeam: null,
      targetWinRounds: DEFAULT_HOST_MATCH_SETTINGS.targetWinRounds,
      startingHp: DEFAULT_HOST_MATCH_SETTINGS.startingHp,
      friendlyFire: DEFAULT_HOST_MATCH_SETTINGS.friendlyFire,
      fillBotsEnabled: isOgRoom ? false : DEFAULT_HOST_MATCH_SETTINGS.fillBotsEnabled,
      phaseStartedAt: now,
      roundEndsAt: now + DEFAULT_HOST_MATCH_SETTINGS.roundDurationSec * 1000,
      intermissionEndsAt: undefined,
      rematchReadyPlayerIds: [],
      mapVotes: {},
      aimAssistAllowed: isOgRoom ? OG_FEATURE_FLAGS.softAimAssist : true,
      slideAllowed: isOgRoom ? OG_FEATURE_FLAGS.tacticalSlide : true,
      mythicPerksAllowed: isOgRoom ? false : true,
      appVersion: APP_VERSION,
      playerCount: 1,
      players: [
        {
          id: this.localPlayerId,
          name: this.localPlayerName,
          x: spawn.x,
          y: 0,
          z: spawn.z,
          yaw: spawn.yaw,
          pitch: 0,
          weaponIdx: 0,
          hp: 100,
          maxHp: 100,
          kills: 0,
          deaths: 0,
          shotsFired: 0,
          shotsHit: 0,
          headshots: 0,
          isSliding: false,
          score: 0,
          color: getTeamColor(hostTeam),
          team: hostTeam,
          alive: true,
          cosmetics: isOgRoom ? undefined : this.localCosmetics,
          isHost: true,
          lobbyReady: true,
          pingMs: 0,
          peerId: roomCodeToHostPeerId(roomCode),
          respawnSeq: 0,
          disconnected: false,
          lastSeen: now,
        },
      ],
    };

    this.authoritativeRoom = initialRoom;
    this.callbacks.onRoomState(initialRoom);
    this.callbacks.onPingUpdate?.(0);

    // Wall-clock 200ms Host heartbeat ensures round timers, intermission transitions,
    // and 30-second reconnect expirations advance reliably via Date.now().
    this.roundHeartbeatId = window.setInterval(() => {
      this.tickAuthoritativeRoundNow(Date.now());
    }, 200);

    const hostPeerId = roomCodeToHostPeerId(roomCode);

    const openHostOnBroker = (brokerIdx: number, iceCfg: ResolvedIceConfig) => {
      if (epoch !== this.connectionEpoch || this.role !== 'host') return;
      this.activeBrokerIndex = brokerIdx % PEERJS_BROKER_LIST.length;
      const broker = this.getActiveBroker();
      this.emitTransportUpdate();

      if (this.peer) {
        try {
          this.peer.destroy();
        } catch {
          // ignore
        }
        this.peer = null;
      }

      try {
        const peer = new Peer(
          hostPeerId,
          getPeerJsClientOptions(broker, iceCfg.iceServers, 'all')
        );
        this.peer = peer;

        let opened = false;
        const readyFallbackTimer = window.setTimeout(() => {
          if (epoch !== this.connectionEpoch) return;
          if (this.role === 'host' && this.status === 'connecting') {
            this.setStatus('connected', 'host', null);
          }
        }, 1800);

        peer.on('open', (openedPeerId) => {
          window.clearTimeout(readyFallbackTimer);
          if (epoch !== this.connectionEpoch || this.role !== 'host') return;
          opened = true;
          this.brokerRetryAttempt = 0;
          this.callbacks.onPeerReady?.(peer, openedPeerId || hostPeerId);
          this.setStatus('connected', 'host', null);
          this.emitTransportUpdate();
          this.callbacks.onNotice(`اتاق آنلاین ${roomCode} ساخته شد — شما میزبان (Host) هستید`);
          if (this.authoritativeRoom) {
            this.authoritativeRoom = mergeClientInputIntoHostState(this.authoritativeRoom, {
              id: this.localPlayerId,
              peerId: openedPeerId || hostPeerId,
              pingMs: 0,
            });
            this.broadcastFromHost({
              type: 'host:state',
              room: this.authoritativeRoom,
            });
            this.callbacks.onRoomState(this.authoritativeRoom);
          }
        });

        peer.on('connection', (conn) => {
          this.setupHostDataConnection(conn);
        });

        peer.on('error', (err: Error & { type?: string }) => {
          window.clearTimeout(readyFallbackTimer);
          if (epoch !== this.connectionEpoch) return;
          if (err?.type === 'unavailable-id') {
            const freshCode = generatePeerRoomCode();
            this.hostRoom(mapId, mode, password, freshCode);
            return;
          }
          const isBrokerFailure =
            !opened &&
            (err?.type === 'network' ||
              err?.type === 'server-error' ||
              err?.type === 'socket-error' ||
              err?.type === 'socket-closed' ||
              err?.type === 'disconnected');
          if (isBrokerFailure && this.brokerRetryAttempt < PEERJS_BROKER_LIST.length * 2) {
            const delayMs = computeReconnectBackoffMs(this.brokerRetryAttempt);
            this.brokerRetryAttempt++;
            const nextBrokerIdx = (brokerIdx + 1) % PEERJS_BROKER_LIST.length;
            this.callbacks.onNotice(
              `سرور سیگنالینگ پاسخ نداد — انتقال خودکار به سرور یدک (${Math.round(delayMs / 1000)} ثانیه)...`
            );
            this.brokerFailoverTimerId = window.setTimeout(() => {
              openHostOnBroker(nextBrokerIdx, iceCfg);
            }, delayMs);
            return;
          }
          if (this.role === 'host' && this.authoritativeRoom) {
            this.setStatus('connected', 'host', null);
          } else {
            this.setStatus('error', 'host', `خطای شبکه PeerJS: ${err?.message || 'عدم دسترسی به سرور سیگنالینگ'}`);
          }
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'خطا در راه‌اندازی WebRTC';
        this.setStatus('error', 'host', msg);
      }
    };

    void resolveRuntimeIceServers().then((iceCfg) => {
      if (epoch !== this.connectionEpoch || this.role !== 'host') return;
      this.activeIceConfig = iceCfg;
      openHostOnBroker(0, iceCfg);
    });

    this.broadcastFromHost({
      type: 'host:state',
      room: initialRoom,
    });

    return roomCode;
  }

  private setupHostDataConnection(conn: DataConnection) {
    let remotePlayerId = '';

    conn.on('open', () => {
      this.inspectPeerConnectionTransport(conn);
      if (this.authoritativeRoom) {
        conn.send({
          type: 'host:state',
          room: this.authoritativeRoom,
        } satisfies P2PPacket);
      }
    });

    conn.on('data', (raw) => {
      const pkt = raw as P2PPacket;
      if (!pkt || typeof pkt.type !== 'string') return;
      const incomingPlayerId =
        pkt.type === 'c:i' && Array.isArray(pkt.d) && typeof pkt.d[1] === 'string'
          ? pkt.d[1]
          : 'playerId' in pkt && typeof pkt.playerId === 'string'
            ? pkt.playerId
            : '';
      if (incomingPlayerId.trim()) {
        const boundId = this.connectionPlayerIds.get(conn);
        if (!boundId) {
          remotePlayerId = incomingPlayerId;
          this.connectionPlayerIds.set(conn, remotePlayerId);
          this.hostConnections.set(remotePlayerId, conn);
        } else if (boundId !== incomingPlayerId) {
          // Silently ignore packets attempting to spoof another player's ID over this connection
          return;
        }
      }
      this.handleIncomingPacket(pkt, conn);
    });

    const handleDisconnect = () => {
      if (!remotePlayerId || !this.authoritativeRoom) return;
      // Ignore stale connection close if player already reconnected on a newer DataConnection
      if (this.hostConnections.get(remotePlayerId) !== conn) return;
      this.hostConnections.delete(remotePlayerId);

      // Hold slot for 30s grace period instead of immediate removal so player can reconnect mid-match
      const { nextRoom, disconnectedPlayer } = markPlayerDisconnectedInHostState(
        this.authoritativeRoom,
        remotePlayerId,
        Date.now()
      );
      if (!disconnectedPlayer) return;
      this.authoritativeRoom = nextRoom;
      this.callbacks.onNotice(`بازیکن «${disconnectedPlayer.name}» در حال اتصال دوباره...`);

      // In round-based mode, ensure remaining opposing team isn't stalled if disconnected player was last alive
      if (isRoundBasedMode(nextRoom.mode) && nextRoom.roundPhase === 'playing') {
        const lostTeam = disconnectedPlayer.team || 'alpha';
        const opposingTeam: TeamId = lostTeam === 'alpha' ? 'bravo' : 'alpha';
        const teamMembers = nextRoom.players.filter((p) => p.team === lostTeam);
        const anyAlive = teamMembers.some((p) => p.alive && !p.disconnected && p.hp > 0);
        const anyOpposingActive = nextRoom.players.some((p) => p.team === opposingTeam && !p.disconnected);
        if (teamMembers.length > 0 && !anyAlive && anyOpposingActive) {
          this.recordTeamRoundWin(
            opposingTeam,
            `بازیکن «${disconnectedPlayer.name}» قطع شد — امتیاز راند برای ${getTeamNameFa(opposingTeam)}`
          );
          return;
        }
      }

      this.callbacks.onRoomState(nextRoom);
      this.broadcastFromHost({
        type: 'host:state',
        room: nextRoom,
      });
    };

    conn.on('close', handleDisconnect);
    conn.on('error', handleDisconnect);
  }

  /**
   * Join an existing Host's room by code (8-char readable code or legacy BC-XXXX).
   * Automatically resolves TURN credentials from Cloudflare Worker, fails over across
   * PeerJS brokers with exponential backoff, and falls back to iceTransportPolicy: 'relay'
   * + restartIce if direct P2P cannot connect within 15 seconds (e.g. strict VPN).
   */
  public joinRoom(rawCode: string, password = ''): void {
    const cleanCode = normalizeRoomCode(rawCode);
    if (!cleanCode) {
      this.setStatus('error', 'client', 'لطفاً کد اتاق را درست وارد کنید.');
      return;
    }

    this.intentionalLeave = false;
    this.destroyPeerInstance();
    const epoch = this.connectionEpoch;
    this.lastJoinCode = cleanCode;
    this.roomPassword = password.trim();
    this.activeBrokerIndex = 0;
    this.brokerRetryAttempt = 0;
    this.relayFallbackActive = false;
    this.activeTransportType = 'none';
    this.setStatus('connecting', 'client', null);

    const hostPeerId = roomCodeToHostPeerId(cleanCode);

    const makeClientPeerId = () =>
      `bodycam-vanguard-client-${this.localPlayerId}-${Math.random().toString(36).slice(2, 6)}`;

    const initialClientPeerId = makeClientPeerId();
    const joinPacket: P2PPacket = {
      type: 'client:join',
      roomCode: cleanCode,
      playerId: this.localPlayerId,
      peerId: initialClientPeerId,
      name: this.localPlayerName,
      password: this.roomPassword,
      weaponIdx: 0,
      appVersion: APP_VERSION,
      cosmetics: this.localOgMode ? undefined : this.localCosmetics,
      ogMode: this.localOgMode,
    };
    this.bcChannel?.postMessage(joinPacket);

    const attemptConnect = (
      brokerIdx: number,
      iceCfg: ResolvedIceConfig,
      forceRelay: boolean
    ) => {
      if (epoch !== this.connectionEpoch || this.role !== 'client') return;
      this.activeBrokerIndex = brokerIdx % PEERJS_BROKER_LIST.length;
      this.relayFallbackActive = forceRelay;
      const broker = this.getActiveBroker();
      this.emitTransportUpdate();

      if (this.relayFallbackTimerId !== null) {
        window.clearTimeout(this.relayFallbackTimerId);
        this.relayFallbackTimerId = null;
      }
      if (this.joinTimeoutId !== null) {
        window.clearTimeout(this.joinTimeoutId);
        this.joinTimeoutId = null;
      }

      if (this.peer) {
        try {
          this.peer.destroy();
        } catch {
          // ignore
        }
        this.peer = null;
      }

      const clientPeerId = makeClientPeerId();

      const bindClientConnection = (peer: Peer, resolvedClientPeerId: string) => {
        const conn = peer.connect(hostPeerId, {
          reliable: true,
        });
        this.clientConn = conn;

        // Monitor underlying RTCPeerConnection for ICE failure -> trigger restartIce / relay fallback
        const pc = (conn as DataConnection & { peerConnection?: RTCPeerConnection }).peerConnection;
        if (pc) {
          pc.addEventListener('iceconnectionstatechange', () => {
            if (epoch !== this.connectionEpoch) return;
            if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
              this.inspectPeerConnectionTransport(conn);
            } else if (pc.iceConnectionState === 'failed') {
              if (!forceRelay && iceCfg.hasTurn && !this.authoritativeRoom) {
                this.callbacks.onNotice('مسیر مستقیم مسدود است — تغییر خودکار به رله (TURN)...');
                attemptConnect(brokerIdx, iceCfg, true);
              } else {
                try {
                  pc.restartIce?.();
                } catch {
                  // ignore if browser does not support restartIce
                }
              }
            }
          });
        }

        conn.on('open', () => {
          if (epoch !== this.connectionEpoch) return;
          if (this.relayFallbackTimerId !== null) {
            window.clearTimeout(this.relayFallbackTimerId);
            this.relayFallbackTimerId = null;
          }
          if (this.joinTimeoutId !== null) {
            window.clearTimeout(this.joinTimeoutId);
            this.joinTimeoutId = null;
          }
          this.stopClientReconnectLoop();
          this.inspectPeerConnectionTransport(conn);
          conn.send({
            ...joinPacket,
            peerId: resolvedClientPeerId,
          });
        });

        conn.on('data', (raw) => {
          const pkt = raw as P2PPacket;
          if (!pkt || typeof pkt.type !== 'string') return;
          this.handleIncomingPacket(pkt);
        });

        const onHostLost = () => {
          if (this.intentionalLeave) return;
          if (this.clientConn !== conn) return;
          if (this.role !== 'client' || !this.authoritativeRoom) return;

          // Attempt silent automatic reconnect for up to 30 seconds before dropping room
          this.stopPingLoop();
          this.callbacks.onPingUpdate?.(null);
          if (this.reconnectIntervalId !== null) return;

          this.reconnectDeadlineAt = Date.now() + RECONNECT_GRACE_MS;
          this.callbacks.onNotice('ارتباط با میزبان قطع شد — در حال اتصال دوباره (تا ۳۰ ثانیه)...');
          this.callbacks.onReconnectingChange?.(true, Math.ceil(RECONNECT_GRACE_MS / 1000));

          const tryReconnect = () => {
            const remainingMs = this.reconnectDeadlineAt - Date.now();
            if (remainingMs <= 0 || this.role !== 'client' || !this.authoritativeRoom) {
              this.stopClientReconnectLoop();
              if (this.role === 'client' && this.authoritativeRoom) {
                this.authoritativeRoom = null;
                this.callbacks.onRoomLeft();
                this.setStatus('error', 'none', 'ارتباط با میزبان (Host) قطع شد و اتصال دوباره موفق نبود.');
                this.callbacks.onNotice('اتصال دوباره ناموفق بود — بازی در حالت تک‌نفره ادامه دارد');
              }
              return;
            }
            this.callbacks.onReconnectingChange?.(true, Math.max(1, Math.ceil(remainingMs / 1000)));
            if (this.peer && !this.peer.destroyed) {
              if (this.peer.disconnected) {
                try {
                  this.peer.reconnect();
                } catch {
                  // ignore
                }
              }
              try {
                const activePc = (this.clientConn as (DataConnection & { peerConnection?: RTCPeerConnection }) | null)
                  ?.peerConnection;
                activePc?.restartIce?.();
                bindClientConnection(this.peer, resolvedClientPeerId);
              } catch {
                // retry on next tick
              }
            }
          };

          this.reconnectIntervalId = window.setInterval(tryReconnect, 2500);
        };

        conn.on('close', onHostLost);
        conn.on('error', onHostLost);
      };

      try {
        const transportPolicy: RTCIceTransportPolicy = forceRelay && iceCfg.hasTurn ? 'relay' : 'all';
        const peer = new Peer(
          clientPeerId,
          getPeerJsClientOptions(broker, iceCfg.iceServers, transportPolicy)
        );
        this.peer = peer;

        let peerOpened = false;

        // 15-second direct P2P timeout -> auto switch to iceTransportPolicy: 'relay' + restartIce
        if (!forceRelay) {
          this.relayFallbackTimerId = window.setTimeout(() => {
            if (epoch !== this.connectionEpoch || this.status !== 'connecting' || this.authoritativeRoom) {
              return;
            }
            if (iceCfg.hasTurn) {
              this.callbacks.onNotice(
                'اتصال مستقیم بعد از ۱۵ ثانیه برقرار نشد — تلاش خودکار از طریق سرور رله (TURN/TLS 443)...'
              );
              attemptConnect(brokerIdx, iceCfg, true);
            } else {
              // No TURN Worker configured: try restartIce once, then report clear Persian error
              const activePc = (this.clientConn as (DataConnection & { peerConnection?: RTCPeerConnection }) | null)
                ?.peerConnection;
              try {
                activePc?.restartIce?.();
              } catch {
                // ignore
              }
              this.joinTimeoutId = window.setTimeout(() => {
                if (epoch !== this.connectionEpoch) return;
                if (this.status === 'connecting' && !this.authoritativeRoom) {
                  this.setStatus(
                    'error',
                    'client',
                    `پاسخی از اتاق ${cleanCode} دریافت نشد. اگر با VPN وصل هستید، «تشخیص اتصال» را بررسی کنید یا دوباره تلاش کنید.`
                  );
                }
              }, 5000);
            }
          }, DIRECT_CONNECT_RELAY_FALLBACK_MS);
        } else {
          // Final timeout after relay fallback attempt
          this.joinTimeoutId = window.setTimeout(() => {
            if (epoch !== this.connectionEpoch) return;
            if (this.status === 'connecting' && !this.authoritativeRoom) {
              this.setStatus(
                'error',
                'client',
                `اتصال به اتاق ${cleanCode} حتی از طریق رله (TURN) برقرار نشد. از آنلاین بودن میزبان و درستی کد مطمئن شوید.`
              );
            }
          }, 15000);
        }

        peer.on('open', (openedPeerId) => {
          if (epoch !== this.connectionEpoch || this.role !== 'client') return;
          peerOpened = true;
          this.brokerRetryAttempt = 0;
          const resolvedClientPeerId = openedPeerId || clientPeerId;
          this.callbacks.onPeerReady?.(peer, resolvedClientPeerId);
          bindClientConnection(peer, resolvedClientPeerId);
        });

        peer.on('error', (err: Error & { type?: string }) => {
          if (epoch !== this.connectionEpoch || this.authoritativeRoom) {
            return;
          }
          const errType = err?.type || '';
          const isBrokerFailure =
            !peerOpened &&
            (errType === 'network' ||
              errType === 'server-error' ||
              errType === 'socket-error' ||
              errType === 'socket-closed' ||
              errType === 'disconnected');
          if (isBrokerFailure && this.brokerRetryAttempt < PEERJS_BROKER_LIST.length * 2) {
            if (this.relayFallbackTimerId !== null) {
              window.clearTimeout(this.relayFallbackTimerId);
              this.relayFallbackTimerId = null;
            }
            const delayMs = computeReconnectBackoffMs(this.brokerRetryAttempt);
            this.brokerRetryAttempt++;
            const nextBrokerIdx = (brokerIdx + 1) % PEERJS_BROKER_LIST.length;
            this.callbacks.onNotice(
              `سرور واسطه در دسترس نبود — تلاش با سرور یدک (${Math.round(delayMs / 1000)} ثانیه)...`
            );
            this.brokerFailoverTimerId = window.setTimeout(() => {
              attemptConnect(nextBrokerIdx, iceCfg, forceRelay);
            }, delayMs);
            return;
          }

          if (this.relayFallbackTimerId !== null) {
            window.clearTimeout(this.relayFallbackTimerId);
            this.relayFallbackTimerId = null;
          }
          if (this.joinTimeoutId !== null) {
            window.clearTimeout(this.joinTimeoutId);
            this.joinTimeoutId = null;
          }
          if (errType === 'peer-unavailable') {
            this.setStatus(
              'error',
              'client',
              `اتاقی با کد ${cleanCode} پیدا نشد (میزبان آنلاین نیست یا کد اشتباه است).`
            );
          } else {
            this.setStatus(
              'error',
              'client',
              `خطا در اتصال به اتاق ${cleanCode}: ${err?.message || 'خطای شبکه'}`
            );
          }
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'خطا در اتصال PeerJS';
        this.setStatus('error', 'client', msg);
      }
    };

    void resolveRuntimeIceServers().then((iceCfg) => {
      if (epoch !== this.connectionEpoch || this.role !== 'client') return;
      this.activeIceConfig = iceCfg;
      attemptConnect(0, iceCfg, false);
    });
  }

  public retryLastJoin(): void {
    if (this.lastJoinCode) {
      this.joinRoom(this.lastJoinCode, this.roomPassword);
    }
  }

  public setLobbyReady(ready: boolean): void {
    if (!this.authoritativeRoom) return;
    if (this.role === 'host') {
      this.authoritativeRoom = mergeClientInputIntoHostState(this.authoritativeRoom, {
        id: this.localPlayerId,
        lobbyReady: ready,
      });
      this.callbacks.onRoomState(this.authoritativeRoom);
      this.broadcastFromHost({
        type: 'host:state',
        room: this.authoritativeRoom,
      });
    } else if (this.role === 'client') {
      this.sendToHost({
        type: 'client:lobby_ready',
        roomCode: this.authoritativeRoom.code,
        playerId: this.localPlayerId,
        ready,
      });
    }
  }

  public setRoomLocked(locked: boolean): void {
    if (this.role !== 'host' || !this.authoritativeRoom) return;
    this.authoritativeRoom = {
      ...this.authoritativeRoom,
      isLocked: locked,
    };
    this.callbacks.onRoomState(this.authoritativeRoom);
    this.broadcastFromHost({
      type: 'host:state',
      room: this.authoritativeRoom,
    });
    this.callbacks.onNotice(locked ? 'اتاق قفل شد — بازیکن جدید نمی‌تواند وارد شود' : 'قفل اتاق باز شد');
  }

  public setRoomPassword(password: string): void {
    if (this.role !== 'host' || !this.authoritativeRoom) return;
    this.roomPassword = password.trim();
    this.authoritativeRoom = {
      ...this.authoritativeRoom,
      hasPassword: Boolean(this.roomPassword),
    };
    this.callbacks.onRoomState(this.authoritativeRoom);
    this.broadcastFromHost({
      type: 'host:state',
      room: this.authoritativeRoom,
    });
  }

  private handleIncomingPacket(pkt: P2PPacket, sourceConn?: DataConnection) {
    // 1. Packets handled by HOST
    if (this.role === 'host' && this.authoritativeRoom) {
      const pktRoomCode =
        pkt.type === 'c:i' && Array.isArray(pkt.d)
          ? pkt.d[0]
          : 'roomCode' in pkt
            ? pkt.roomCode
            : '';
      if (pktRoomCode && normalizeRoomCode(pktRoomCode) !== this.authoritativeRoom.code) {
        return;
      }

      if (pkt.type === 'client:join') {
        const verCheck = checkOnlineVersionCompatibility(APP_VERSION, pkt.appVersion);
        if (!verCheck.compatible) {
          const mismatchMsg = verCheck.messageFa || VERSION_MISMATCH_MESSAGE_FA;
          const errPkt: P2PPacket = {
            type: 'host:error',
            roomCode: this.authoritativeRoom.code,
            targetPlayerId: pkt.playerId,
            message: mismatchMsg,
          };
          sourceConn?.send(errPkt);
          this.bcChannel?.postMessage(errPkt);
          this.callbacks.onNotice(`${pkt.name}: ${mismatchMsg}`);
          return;
        }
        const ogCheck = validateOgJoinCompatibility(this.authoritativeRoom.mode, Boolean(pkt.ogMode));
        if (!ogCheck.allowed) {
          const ogErrMsg = ogCheck.messageFa || 'این اتاق OG است';
          const errPkt: P2PPacket = {
            type: 'host:error',
            roomCode: this.authoritativeRoom.code,
            targetPlayerId: pkt.playerId,
            message: ogErrMsg,
          };
          sourceConn?.send(errPkt);
          this.bcChannel?.postMessage(errPkt);
          this.callbacks.onNotice(`${pkt.name}: ${ogErrMsg}`);
          return;
        }
        if (this.roomPassword && (pkt.password || '').trim() !== this.roomPassword) {
          const errPkt: P2PPacket = {
            type: 'host:error',
            roomCode: this.authoritativeRoom.code,
            targetPlayerId: pkt.playerId,
            message: 'رمز اتاق نادرست است یا وارد نشده است.',
          };
          sourceConn?.send(errPkt);
          this.bcChannel?.postMessage(errPkt);
          return;
        }

        // Check if this player is reclaiming a disconnected slot within the 30-second grace window
        const reclaimRes = reclaimDisconnectedPlayerInHostState(
          this.authoritativeRoom,
          pkt.playerId,
          pkt.name,
          pkt.peerId || sourceConn?.peer,
          Date.now()
        );
        if (reclaimRes.reclaimedPlayer) {
          this.authoritativeRoom = reclaimRes.nextRoom;
          this.callbacks.onRoomState(this.authoritativeRoom);
          this.callbacks.onNotice(
            `بازیکن «${reclaimRes.reclaimedPlayer.name}» دوباره به بازی متصل شد (${getTeamNameFa(reclaimRes.reclaimedPlayer.team)})`
          );
          this.broadcastFromHost({
            type: 'host:state',
            room: this.authoritativeRoom,
          });
          return;
        }

        const existingPlayer = this.authoritativeRoom.players.find((p) => p.id === pkt.playerId);
        const isNewPlayer = !existingPlayer;
        if (isNewPlayer && this.authoritativeRoom.isLocked) {
          const errPkt: P2PPacket = {
            type: 'host:error',
            roomCode: this.authoritativeRoom.code,
            targetPlayerId: pkt.playerId,
            message: 'این اتاق توسط میزبان قفل شده است.',
          };
          sourceConn?.send(errPkt);
          this.bcChannel?.postMessage(errPkt);
          return;
        }
        const hadBotsBefore = this.authoritativeRoom.players.some((p) => p.isBot);
        const assignedTeam = existingPlayer?.team || assignBalancedHumanTeam(this.authoritativeRoom.players);
        const humanTeamSlotIdx = this.authoritativeRoom.players.filter(
          (p) => !p.isBot && p.team === assignedTeam && p.id !== pkt.playerId
        ).length;
        const spawn = getTeamSpawnPosition(assignedTeam, humanTeamSlotIdx, this.authoritativeRoom.mapId);

        const startHp = this.authoritativeRoom.startingHp ?? DEFAULT_HOST_MATCH_SETTINGS.startingHp;
        this.authoritativeRoom = mergeClientInputIntoHostState(this.authoritativeRoom, {
          id: pkt.playerId,
          peerId: pkt.peerId || sourceConn?.peer || existingPlayer?.peerId,
          name: pkt.name,
          weaponIdx: pkt.weaponIdx,
          x: spawn.x,
          y: 0,
          z: spawn.z,
          yaw: spawn.yaw,
          hp: startHp,
          maxHp: startHp,
          team: assignedTeam,
          alive: true,
          lobbyReady: existingPlayer ? Boolean(existingPlayer.lobbyReady) : false,
          disconnected: false,
          respawnSeq: (existingPlayer?.respawnSeq ?? 0) + 1,
          cosmetics: isOgOnlineMode(this.authoritativeRoom.mode) ? undefined : sanitizeOnlineCosmetics(pkt.cosmetics),
        });
        // Real human immediately replaces any bot occupying this team's slot
        this.authoritativeRoom = reconcileOnlineBots(this.authoritativeRoom, Date.now());
        this.resetClientValidationPosition(pkt.playerId, spawn.x, spawn.z);

        const replacedBot =
          isNewPlayer &&
          hadBotsBefore &&
          this.authoritativeRoom.players.filter((p) => p.isBot && p.team === assignedTeam).length <
            (this.authoritativeRoom.mode === 'tdm_2v2' ? 2 : 1);

        this.callbacks.onRoomState(this.authoritativeRoom);
        if (isNewPlayer) {
          this.callbacks.onNotice(
            replacedBot
              ? `بازیکن «${pkt.name}» جایگزین بات در ${getTeamNameFa(assignedTeam)} شد`
              : `بازیکن «${pkt.name}» به اتاق متصل شد (${getTeamNameFa(assignedTeam)})`
          );
        }

        this.broadcastFromHost({
          type: 'host:state',
          room: this.authoritativeRoom,
          joinedPlayerName: isNewPlayer ? pkt.name : undefined,
        });
        return;
      }

      if (pkt.type === 'client:cosmetics') {
        if (isOgOnlineMode(this.authoritativeRoom.mode)) return;
        const safeCos = sanitizeOnlineCosmetics(pkt.cosmetics);
        let updated = false;
        const nextPlayers = this.authoritativeRoom.players.map((p) => {
          if (p.id !== pkt.playerId) return p;
          updated = true;
          const clearsEmote =
            (p.activeEmoteId === MYTHIC_M249_EMOTE_ID && safeCos?.m249 !== MYTHIC_M249_ID) ||
            (p.activeEmoteId === MYTHIC_SHOTGUN_EMOTE_ID && safeCos?.sg !== MYTHIC_SHOTGUN_ID);
          return {
            ...p,
            cosmetics: safeCos,
            ...(clearsEmote ? { activeEmoteId: null, emoteStartedAt: 0 } : {}),
          };
        });
        if (updated) {
          this.authoritativeRoom = {
            ...this.authoritativeRoom,
            players: nextPlayers,
          };
          this.callbacks.onRoomState(this.authoritativeRoom);
          this.broadcastFromHost({
            type: 'host:state',
            room: this.authoritativeRoom,
          });
        }
        return;
      }

      if (pkt.type === 'client:emote') {
        if (isOgOnlineMode(this.authoritativeRoom.mode)) return;
        const safeEmoteId = pkt.emoteId === null ? null : sanitizeEmoteId(pkt.emoteId);
        if (pkt.emoteId !== null && !safeEmoteId) return;
        const actor = this.authoritativeRoom.players.find((p) => p.id === pkt.playerId);
        if (!actor) return;
        // Host-authoritative check: only allow starting Mythic emote if alive & matching Mythic skin equipped
        const emotePermitted =
          !safeEmoteId ||
          (Boolean(actor.alive) &&
            ((safeEmoteId === MYTHIC_M249_EMOTE_ID && actor.cosmetics?.m249 === MYTHIC_M249_ID) ||
              (safeEmoteId === MYTHIC_SHOTGUN_EMOTE_ID && actor.cosmetics?.sg === MYTHIC_SHOTGUN_ID)));
        if (!emotePermitted) {
          return;
        }
        const now = Date.now();
        this.authoritativeRoom = {
          ...this.authoritativeRoom,
          players: this.authoritativeRoom.players.map((p) =>
            p.id === pkt.playerId
              ? { ...p, activeEmoteId: safeEmoteId, emoteStartedAt: safeEmoteId ? now : 0 }
              : p
          ),
        };
        this.callbacks.onRoomState(this.authoritativeRoom);
        if (pkt.playerId !== this.localPlayerId) {
          this.callbacks.onRemoteEmote?.(pkt.playerId, safeEmoteId);
        }
        this.broadcastFromHost({
          type: 'host:emote',
          roomCode: this.authoritativeRoom.code,
          playerId: pkt.playerId,
          emoteId: safeEmoteId,
          startedAt: safeEmoteId ? now : 0,
        });
        return;
      }

      if (pkt.type === 'client:ping') {
        if (typeof pkt.lastPingMs === 'number' && Number.isFinite(pkt.lastPingMs)) {
          const targetP = this.authoritativeRoom.players.find((p) => p.id === pkt.playerId);
          const clampedPing = Math.max(1, Math.min(999, Math.round(pkt.lastPingMs)));
          if (targetP && targetP.pingMs !== clampedPing) {
            this.authoritativeRoom = mergeClientInputIntoHostState(this.authoritativeRoom, {
              id: pkt.playerId,
              pingMs: clampedPing,
            });
            this.callbacks.onRoomState(this.authoritativeRoom);
            this.broadcastFromHost({
              type: 'host:state',
              room: this.authoritativeRoom,
            });
          }
        }
        const pongPkt: P2PPacket = {
          type: 'host:pong',
          roomCode: this.authoritativeRoom.code,
          playerId: pkt.playerId,
          sentAt: pkt.sentAt,
        };
        if (sourceConn && sourceConn.open) {
          try {
            sourceConn.send(pongPkt);
          } catch {
            // ignore
          }
        } else {
          this.bcChannel?.postMessage(pongPkt);
        }
        return;
      }

      if (pkt.type === 'client:lobby_ready') {
        if (!this.isAuthorizedSourceForPlayer(pkt.playerId, sourceConn)) return;
        this.authoritativeRoom = mergeClientInputIntoHostState(this.authoritativeRoom, {
          id: pkt.playerId,
          lobbyReady: Boolean(pkt.ready),
        });
        this.callbacks.onRoomState(this.authoritativeRoom);
        this.broadcastFromHost({
          type: 'host:state',
          room: this.authoritativeRoom,
        });
        return;
      }

      if (pkt.type === 'client:rematch_vote') {
        this.applyRematchVoteOnHost(pkt.playerId, pkt.ready);
        return;
      }

      if (pkt.type === 'client:map_vote') {
        if (isOgOnlineMode(this.authoritativeRoom.mode)) {
          if (!OG_FEATURE_FLAGS.pingHudAndAdvancedLobby) return;
          if (!OG_FEATURE_FLAGS.duel1v1Map && pkt.mapId === 'duel') return;
        }
        this.applyMapVoteOnHost(pkt.playerId, pkt.mapId);
        return;
      }

      if (pkt.type === 'client:switch_team') {
        this.applyTeamSwitchOnHost(pkt.playerId, pkt.team);
        return;
      }

      if (pkt.type === 'client:team_ping') {
        if (!this.isAuthorizedSourceForPlayer(pkt.playerId, sourceConn)) return;
        this.handleTeamPingOnHost(pkt.playerId, pkt.x, pkt.y, pkt.z);
        return;
      }

      if (pkt.type === 'client:team_msg') {
        if (!this.isAuthorizedSourceForPlayer(pkt.playerId, sourceConn)) return;
        this.handleTeamQuickMessageOnHost(pkt.playerId, pkt.messageId);
        return;
      }

      if (pkt.type === 'client:input' || pkt.type === 'c:i') {
        const decoded = pkt.type === 'c:i' ? decodeCompactClientInput(pkt.d, Date.now()) : pkt;
        if (!decoded) return;
        if (!this.isAuthorizedSourceForPlayer(decoded.playerId, sourceConn)) return;
        const roundMode = isRoundBasedMode(this.authoritativeRoom.mode);
        if (roundMode && typeof decoded.roundNum === 'number' && decoded.roundNum !== this.authoritativeRoom.currentRound) {
          // Drop stale round packets so an old hp=0 or pre-respawn frame never overwrites a newly-respawned player
          return;
        }
        const existing = this.authoritativeRoom.players.find((p) => p.id === decoded.playerId);
        if (!existing || existing.disconnected) {
          return;
        }
        const now = Date.now();
        const startHp = this.authoritativeRoom.startingHp ?? DEFAULT_HOST_MATCH_SETTINGS.startingHp;
        // Reject stale position updates sent before client processed latest Host respawn/round teleport
        const stalePosition =
          isStaleClientInputForRespawn(decoded.respawnSeq, existing.respawnSeq) ||
          (roundMode && !existing.alive) ||
          (roundMode && this.authoritativeRoom.roundPhase === 'countdown');

        const slideAllowed = this.authoritativeRoom.slideAllowed !== false;
        const requestedSlide = slideAllowed && Boolean(decoded.isSliding);

        // Host-authoritative movement speed validation (silently ignores impossible teleports/speed hacks)
        let nextX = existing.x;
        let nextY = existing.y;
        let nextZ = existing.z;
        let nextYaw = existing.yaw;
        let nextPitch = existing.pitch;
        let nextSliding = false;

        if (!stalePosition) {
          const tracker = this.clientValidators.get(decoded.playerId);
          const arenaHalf = getMapArenaHalf(this.authoritativeRoom.mapId);
          const moveCheck = validateClientMovementPosition({
            prevX: tracker && tracker.lastPosAtMs > 0 ? tracker.lastPosX : existing.x,
            prevZ: tracker && tracker.lastPosAtMs > 0 ? tracker.lastPosZ : existing.z,
            prevAtMs: tracker?.lastPosAtMs ?? 0,
            nextX: decoded.x,
            nextY: decoded.y,
            nextZ: decoded.z,
            nowMs: now,
            isSliding: requestedSlide,
            slideAllowed,
            arenaHalf,
          });
          if (!moveCheck.valid) {
            // Silently ignore impossible movement packet without crashing or showing alerts
            return;
          }
          nextX = moveCheck.x;
          nextY = moveCheck.y;
          nextZ = moveCheck.z;
          nextYaw = Number.isFinite(decoded.yaw) ? decoded.yaw : existing.yaw;
          nextPitch = Number.isFinite(decoded.pitch) ? Math.max(-1.55, Math.min(1.55, decoded.pitch)) : existing.pitch;
          nextSliding = requestedSlide;
          this.clientValidators.set(decoded.playerId, {
            lastPosX: moveCheck.x,
            lastPosZ: moveCheck.z,
            lastPosAtMs: now,
            lastWeaponIdx: tracker?.lastWeaponIdx ?? existing.weaponIdx,
            lastShotAtMs: tracker?.lastShotAtMs ?? 0,
            shotsInMag: tracker?.shotsInMag ?? 0,
          });
        }

        // Competitive modes (1v1, 2v2, PvP, OG): clients NEVER directly modify HP, alive, kills, or score
        const isCompetitive = roundMode || this.authoritativeRoom.mode === 'pvp' || this.authoritativeRoom.mode === 'og';
        const authoritativeHp = isCompetitive
          ? existing.hp
          : Number.isFinite(decoded.hp)
            ? Math.max(0, Math.min(startHp, Math.min(existing.hp + 45, Math.round(decoded.hp))))
            : existing.hp;
        const authoritativeAlive = isCompetitive ? existing.alive : authoritativeHp > 0;
        const authoritativeKills = isCompetitive
          ? existing.kills
          : Number.isFinite(decoded.kills)
            ? Math.max(existing.kills, Math.min(existing.kills + 3, Math.round(decoded.kills)))
            : existing.kills;
        const authoritativeScore = isCompetitive
          ? existing.score
          : Number.isFinite(decoded.score)
            ? Math.max(existing.score, Math.min(existing.score + 450, Math.round(decoded.score)))
            : existing.score;
        const safeWeaponIdx =
          Number.isInteger(decoded.weaponIdx) && decoded.weaponIdx >= 0 && decoded.weaponIdx <= 9
            ? decoded.weaponIdx
            : existing.weaponIdx;

        const scoreOrHpChanged =
          authoritativeHp !== existing.hp ||
          authoritativeAlive !== existing.alive ||
          authoritativeKills !== existing.kills ||
          authoritativeScore !== existing.score ||
          decoded.name !== existing.name;

        this.authoritativeRoom = mergeClientInputIntoHostState(this.authoritativeRoom, {
          id: decoded.playerId,
          name: decoded.name,
          x: nextX,
          y: nextY,
          z: nextZ,
          yaw: nextYaw,
          pitch: nextPitch,
          weaponIdx: safeWeaponIdx,
          hp: authoritativeHp,
          alive: authoritativeAlive,
          kills: authoritativeKills,
          score: authoritativeScore,
          isSliding: nextSliding,
          anim: typeof decoded.anim === 'number' ? decoded.anim : existing.anim,
          animAt: typeof decoded.animAt === 'number' ? decoded.animAt : existing.animAt,
        });
        this.callbacks.onRoomState(this.authoritativeRoom);
        if (scoreOrHpChanged) {
          this.broadcastFromHost({
            type: 'host:state',
            room: this.authoritativeRoom,
          });
        } else {
          const updatedPlayer = this.authoritativeRoom.players.find((p) => p.id === decoded.playerId);
          if (updatedPlayer) {
            this.broadcastCompactPosesFromHost([updatedPlayer], now);
          }
        }
        return;
      }

      if (pkt.type === 'client:shoot') {
        if (!this.isAuthorizedSourceForPlayer(pkt.playerId, sourceConn)) return;
        if (isRoundBasedMode(this.authoritativeRoom.mode) && this.authoritativeRoom.roundPhase === 'countdown') {
          return;
        }
        const shooterPrev = this.authoritativeRoom.players.find((p) => p.id === pkt.playerId);
        if (!shooterPrev || shooterPrev.disconnected) return;
        if (isRoundBasedMode(this.authoritativeRoom.mode) && !shooterPrev.alive) return;

        // Host-authoritative fire rate & magazine validation (accounts for Mythic SPAS-12 +1 shell & ~8% faster reload ONLY when permitted)
        const now = Date.now();
        const allowMythicShotgunBonus =
          pkt.weaponIdx === 4 &&
          !isOgOnlineMode(this.authoritativeRoom.mode) &&
          this.authoritativeRoom.mythicPerksAllowed !== false &&
          shooterPrev.cosmetics?.sg === MYTHIC_SHOTGUN_ID;
        const shootCheck = validateClientShootEvent(
          this.clientValidators.get(pkt.playerId),
          pkt.weaponIdx,
          now,
          allowMythicShotgunBonus ? { magBonus: 1, reloadResetThresholdMs: 960 } : undefined
        );
        if (!shootCheck.valid) {
          return;
        }
        this.clientValidators.set(pkt.playerId, shootCheck.nextTracker);

        // Track authoritative shot count for post-match accuracy statistics
        this.authoritativeRoom = mergeClientInputIntoHostState(this.authoritativeRoom, {
          id: pkt.playerId,
          shotsFired: (shooterPrev.shotsFired ?? 0) + 1,
        });
        // Firing immediately ends shooter's own spawn protection
        const { nextRoom, changed } = clearPlayerSpawnProtection(this.authoritativeRoom, pkt.playerId);
        if (changed) {
          this.authoritativeRoom = nextRoom;
          this.broadcastFromHost({
            type: 'host:state',
            room: this.authoritativeRoom,
          });
          this.callbacks.onRoomState(this.authoritativeRoom);
        }
        if (pkt.playerId !== this.localPlayerId) {
          this.callbacks.onRemoteShoot(pkt.playerId, pkt.weaponIdx, pkt.from, pkt.to);
        }
        this.broadcastFromHost({
          type: 'host:shoot',
          roomCode: this.authoritativeRoom.code,
          playerId: pkt.playerId,
          weaponIdx: pkt.weaponIdx,
          from: pkt.from,
          to: pkt.to,
        });
        return;
      }

      if (pkt.type === 'client:hit') {
        if (!this.isAuthorizedSourceForPlayer(pkt.attackerId, sourceConn)) return;
        const attacker = this.authoritativeRoom.players.find((p) => p.id === pkt.attackerId);
        if (!attacker || attacker.disconnected) return;
        if (isRoundBasedMode(this.authoritativeRoom.mode) && !attacker.alive) return;

        const weaponIdx = typeof pkt.weaponIdx === 'number' ? pkt.weaponIdx : 0;
        const tracker = this.clientValidators.get(pkt.attackerId);
        const dmgCheck = validateAuthoritativeHitDamage({
          weaponIdx,
          rawDamage: pkt.damage,
          isHeadshot: Boolean(pkt.isHeadshot),
          lastShotAtMs: tracker?.lastShotAtMs,
          nowMs: Date.now(),
        });
        if (!dmgCheck.valid) {
          // Silently ignore impossible damage / forged hit without crashing
          return;
        }

        this.processAuthoritativeHit(
          pkt.attackerId,
          pkt.targetId,
          dmgCheck.authoritativeDamage,
          Boolean(pkt.isHeadshot),
          weaponIdx
        );
        return;
      }

      if (pkt.type === 'client:leave') {
        this.hostConnections.delete(pkt.playerId);
        const { nextRoom, removedPlayer } = removeDisconnectedPlayerFromHostState(
          this.authoritativeRoom,
          pkt.playerId
        );
        this.authoritativeRoom = reconcileOnlineBots(nextRoom, Date.now());
        this.callbacks.onRoomState(this.authoritativeRoom);
        if (removedPlayer) {
          this.callbacks.onNotice(`بازیکن «${removedPlayer.name}» از اتاق خارج شد`);
        }
        this.broadcastFromHost({
          type: 'host:state',
          room: this.authoritativeRoom,
          leftPlayerName: removedPlayer?.name,
        });
        return;
      }
    }

    // 2. Packets handled by CLIENT
    if (this.role === 'client') {
      if (pkt.type === 'host:pong') {
        if (pkt.playerId === this.localPlayerId && typeof pkt.sentAt === 'number') {
          const sample = Math.max(1, Math.min(999, Math.round(performance.now() - pkt.sentAt)));
          this.smoothedPingMs =
            this.smoothedPingMs === null
              ? sample
              : Math.round(this.smoothedPingMs * 0.65 + sample * 0.35);
          this.callbacks.onPingUpdate?.(this.smoothedPingMs);
        }
        return;
      }

      if (pkt.type === 'host:error') {
        if (!pkt.targetPlayerId || pkt.targetPlayerId === this.localPlayerId) {
          if (this.joinTimeoutId !== null) {
            window.clearTimeout(this.joinTimeoutId);
            this.joinTimeoutId = null;
          }
          this.setStatus('error', 'client', pkt.message);
        }
        return;
      }

      if (pkt.type === 'host:state' && pkt.room) {
        if (this.joinTimeoutId !== null) {
          window.clearTimeout(this.joinTimeoutId);
          this.joinTimeoutId = null;
        }
        this.stopClientReconnectLoop();
        const verCheck = checkOnlineVersionCompatibility(APP_VERSION, pkt.room.appVersion);
        if (!verCheck.compatible) {
          const mismatchMsg = verCheck.messageFa || VERSION_MISMATCH_MESSAGE_FA;
          this.destroyPeerInstance();
          this.authoritativeRoom = null;
          this.callbacks.onRoomLeft();
          this.setStatus('error', 'client', mismatchMsg);
          this.callbacks.onNotice(mismatchMsg);
          return;
        }
        const ogCompat = validateOgJoinCompatibility(pkt.room.mode, this.localOgMode);
        if (!ogCompat.allowed) {
          const ogErrMsg = ogCompat.messageFa || 'این اتاق OG است';
          this.intentionalLeave = true;
          this.destroyPeerInstance();
          this.authoritativeRoom = null;
          this.callbacks.onRoomLeft();
          this.setStatus('error', 'client', ogErrMsg);
          this.callbacks.onNotice(ogErrMsg);
          return;
        }
        const wasConnected = this.status === 'connected';
        const prevMap = this.authoritativeRoom?.mapId;
        const prevRound = this.lastSyncedClientRound;
        const prevPhase = this.lastSyncedClientPhase;
        const roomIsOg = isOgOnlineMode(pkt.room.mode);
        const sanitizedPlayers = Array.isArray(pkt.room.players)
          ? pkt.room.players.map((pl) => ({
              ...pl,
              cosmetics: roomIsOg ? undefined : sanitizeOnlineCosmetics(pl.cosmetics),
            }))
          : [];
        const sanitizedRoom: AuthoritativeRoomState = {
          ...pkt.room,
          players: sanitizedPlayers,
        };
        this.authoritativeRoom = sanitizedRoom;
        if (!wasConnected) {
          this.setStatus('connected', 'client', null);
          this.callbacks.onNotice(`متصل شد — وارد اتاق ${pkt.room.code} به میزبانی «${pkt.room.hostName}» شدید`);
        }
        if (this.pingIntervalId === null) {
          this.startClientPingLoop();
        }
        if (pkt.leftPlayerName) {
          this.callbacks.onNotice(`بازیکن «${pkt.leftPlayerName}» از بازی خارج شد`);
        }
        if (prevMap && prevMap !== pkt.room.mapId) {
          this.callbacks.onMapChangedByHost(pkt.room.mapId);
        }

        // Authoritative respawn / round transition sync:
        // If Host incremented our respawnSeq (new round, match reset, team switch, or death respawn)
        // or switched into a new playing round, immediately teleport to Host's exact team spawn.
        const meInState = pkt.room.players.find((p) => p.id === this.localPlayerId);
        const serverRespawnSeq = meInState?.respawnSeq ?? 0;
        const respawnSeqAdvanced = serverRespawnSeq > this.localRespawnSeq;
        const enteredNewRoundFromBreak =
          isRoundBasedMode(pkt.room.mode) &&
          (pkt.room.roundPhase === 'countdown' || pkt.room.roundPhase === 'playing') &&
          ((prevRound > 0 && pkt.room.currentRound !== prevRound) ||
            prevPhase === 'intermission' ||
            prevPhase === 'match_over');

        if (respawnSeqAdvanced || enteredNewRoundFromBreak) {
          const myTeam = meInState?.team || 'bravo';
          const teamIdx = Math.max(
            0,
            pkt.room.players.filter((p) => p.team === myTeam).findIndex((p) => p.id === this.localPlayerId)
          );
          const fallbackSpawn = getTeamSpawnPosition(myTeam, teamIdx, pkt.room.mapId);
          const spawn = meInState
            ? { x: meInState.x, z: meInState.z, yaw: meInState.yaw }
            : { x: fallbackSpawn.x, z: fallbackSpawn.z, yaw: fallbackSpawn.yaw };
          const msg = isRoundBasedMode(pkt.room.mode)
            ? `شروع راند ${pkt.room.currentRound} — (${pkt.room.alphaScore} - ${pkt.room.bravoScore})`
            : `بازگشت به نقطه اسپاون ${getTeamNameFa(myTeam)}`;
          this.localRespawnSeq = Math.max(this.localRespawnSeq, serverRespawnSeq);
          this.lastSyncedClientRound = pkt.room.currentRound;
          this.lastSyncedClientPhase = pkt.room.roundPhase;
          this.callbacks.onRoundRespawn?.(pkt.room.currentRound, myTeam, spawn, msg);
        }
        this.lastSyncedClientRound = pkt.room.currentRound;
        this.lastSyncedClientPhase = pkt.room.roundPhase;

        this.callbacks.onRoomState(this.authoritativeRoom);
        return;
      }

      if (pkt.type === 'h:p') {
        if (
          this.authoritativeRoom &&
          pkt.r === this.authoritativeRoom.code &&
          Array.isArray(pkt.p) &&
          pkt.p.length > 0
        ) {
          const nowMs = Date.now();
          const byId = new Map<string, ReturnType<typeof decodeCompactPlayerPose>>();
          for (let i = 0; i < pkt.p.length; i++) {
            const dec = decodeCompactPlayerPose(pkt.p[i], nowMs);
            if (dec) byId.set(dec.id, dec);
          }
          if (byId.size > 0) {
            let changed = false;
            const nextPlayers = this.authoritativeRoom.players.map((pl) => {
              const upd = byId.get(pl.id);
              if (!upd) return pl;
              changed = true;
              return {
                ...pl,
                x: upd.x,
                y: upd.y,
                z: upd.z,
                yaw: upd.yaw,
                pitch: upd.pitch,
                weaponIdx: upd.weaponIdx,
                isSliding: upd.isSliding,
                alive: upd.alive,
                anim: upd.anim,
                animAt: upd.animAt,
                lastSeen: nowMs,
              };
            });
            if (changed) {
              this.authoritativeRoom = {
                ...this.authoritativeRoom,
                players: nextPlayers,
              };
              this.callbacks.onRoomState(this.authoritativeRoom);
            }
          }
        }
        return;
      }

      if (pkt.type === 'host:shoot') {
        if (pkt.playerId !== this.localPlayerId) {
          this.callbacks.onRemoteShoot(pkt.playerId, pkt.weaponIdx, pkt.from, pkt.to);
        }
        return;
      }

      if (pkt.type === 'host:emote') {
        if (this.authoritativeRoom && pkt.roomCode === this.authoritativeRoom.code) {
          const safeEmoteId = pkt.emoteId === null ? null : sanitizeEmoteId(pkt.emoteId);
          this.authoritativeRoom = {
            ...this.authoritativeRoom,
            players: this.authoritativeRoom.players.map((pl) =>
              pl.id === pkt.playerId
                ? { ...pl, activeEmoteId: safeEmoteId, emoteStartedAt: safeEmoteId ? pkt.startedAt : 0 }
                : pl
            ),
          };
          this.callbacks.onRoomState(this.authoritativeRoom);
          if (pkt.playerId !== this.localPlayerId) {
            this.callbacks.onRemoteEmote?.(pkt.playerId, safeEmoteId);
          }
        }
        return;
      }

      if (pkt.type === 'host:map') {
        if (this.authoritativeRoom && pkt.roomCode === this.authoritativeRoom.code) {
          this.authoritativeRoom = {
            ...this.authoritativeRoom,
            mapId: pkt.mapId,
          };
          this.callbacks.onMapChangedByHost(pkt.mapId);
          this.callbacks.onRoomState(this.authoritativeRoom);
        }
        return;
      }

      if (pkt.type === 'host:hit') {
        this.callbacks.onPlayerHitConfirmed?.({
          attackerId: pkt.attackerId,
          attackerName: pkt.attackerName,
          attackerTeam: pkt.attackerTeam || 'alpha',
          targetId: pkt.targetId,
          targetName: pkt.targetName,
          targetTeam: pkt.targetTeam || 'bravo',
          weaponIdx: typeof pkt.weaponIdx === 'number' ? pkt.weaponIdx : 0,
          isHeadshot: Boolean(pkt.isHeadshot),
          killed: Boolean(pkt.killed),
          attackerCosmetics: sanitizeOnlineCosmetics(pkt.attackerCosmetics),
          targetPos: pkt.targetPos,
        });
        if (pkt.targetId === this.localPlayerId) {
          if (typeof pkt.respawnSeq === 'number' && pkt.respawnSeq > this.localRespawnSeq) {
            this.localRespawnSeq = pkt.respawnSeq;
          }
          this.callbacks.onLocalPlayerDamaged(pkt.damage, pkt.attackerName, pkt.killed, pkt.respawnPos, pkt.attackerId);
        }
        return;
      }

      if (pkt.type === 'host:round_respawn') {
        if (this.authoritativeRoom && pkt.roomCode === this.authoritativeRoom.code) {
          const targetPhase: RoundPhase = pkt.roundPhase || 'playing';
          const nextCountdownSec =
            typeof pkt.countdownRemainingSec === 'number'
              ? pkt.countdownRemainingSec
              : targetPhase === 'countdown'
                ? ROUND_COUNTDOWN_SEC
                : 0;
          const roundStartHp =
            typeof pkt.startingHp === 'number'
              ? pkt.startingHp
              : (this.authoritativeRoom.startingHp ?? DEFAULT_HOST_MATCH_SETTINGS.startingHp);
          // Immediately update cached authoritativeRoom with Host's authoritative spawn map so remote players snap cleanly
          if (pkt.spawns) {
            this.authoritativeRoom = {
              ...this.authoritativeRoom,
              currentRound: pkt.currentRound,
              alphaScore: pkt.alphaScore,
              bravoScore: pkt.bravoScore,
              roundPhase: targetPhase,
              countdownRemainingSec: nextCountdownSec,
              startingHp: roundStartHp,
              players: this.authoritativeRoom.players.map((p) => {
                const sp = pkt.spawns?.[p.id];
                if (!sp) return p;
                return {
                  ...p,
                  team: sp.team,
                  x: sp.x,
                  y: sp.y,
                  z: sp.z,
                  yaw: sp.yaw,
                  pitch: 0,
                  hp: roundStartHp,
                  maxHp: roundStartHp,
                  alive: true,
                  spawnProtected: false,
                  spawnProtectedUntil: 0,
                  respawnSeq: Math.max(p.respawnSeq ?? 0, sp.respawnSeq),
                };
              }),
            };
          }

          const mySpawnFromPkt = pkt.spawns?.[this.localPlayerId];
          const nextSeq = mySpawnFromPkt?.respawnSeq ?? this.localRespawnSeq + 1;
          const alreadyRespawned =
            this.lastSyncedClientRound === pkt.currentRound &&
            this.lastSyncedClientPhase === targetPhase &&
            this.localRespawnSeq >= nextSeq;

          this.lastSyncedClientRound = pkt.currentRound;
          this.lastSyncedClientPhase = targetPhase;
          this.localRespawnSeq = Math.max(this.localRespawnSeq, nextSeq);

          if (!alreadyRespawned) {
            const me = this.authoritativeRoom.players.find((p) => p.id === this.localPlayerId);
            const myTeam = mySpawnFromPkt?.team || me?.team || 'bravo';
            const teamIdx = Math.max(
              0,
              this.authoritativeRoom.players
                .filter((p) => p.team === myTeam)
                .findIndex((p) => p.id === this.localPlayerId)
            );
            const fallbackSpawn = getTeamSpawnPosition(myTeam, teamIdx, this.authoritativeRoom.mapId);
            const spawn = mySpawnFromPkt
              ? { x: mySpawnFromPkt.x, z: mySpawnFromPkt.z, yaw: mySpawnFromPkt.yaw }
              : { x: fallbackSpawn.x, z: fallbackSpawn.z, yaw: fallbackSpawn.yaw };
            this.callbacks.onRoundRespawn?.(pkt.currentRound, myTeam, spawn, pkt.messageFa);
            this.callbacks.onNotice(pkt.messageFa);
          }
          this.callbacks.onRoomState(this.authoritativeRoom);
        }
        return;
      }

      if (pkt.type === 'host:team_ping') {
        if (
          this.authoritativeRoom &&
          pkt.roomCode === this.authoritativeRoom.code &&
          shouldReceiveTeamSignal(this.authoritativeRoom.mode, pkt.ping.team, this.getLocalTeam())
        ) {
          this.callbacks.onTeamPing?.(pkt.ping);
        }
        return;
      }

      if (pkt.type === 'host:team_msg') {
        if (
          this.authoritativeRoom &&
          pkt.roomCode === this.authoritativeRoom.code &&
          shouldReceiveTeamSignal(this.authoritativeRoom.mode, pkt.message.team, this.getLocalTeam())
        ) {
          this.callbacks.onTeamQuickMessage?.(pkt.message);
        }
        return;
      }

      if (pkt.type === 'host:closed') {
        if (this.authoritativeRoom && pkt.roomCode === this.authoritativeRoom.code) {
          this.intentionalLeave = true;
          this.destroyPeerInstance();
          this.authoritativeRoom = null;
          this.callbacks.onRoomLeft();
          this.setStatus('error', 'none', pkt.message || 'میزبان (Host) اتاق را بست.');
          this.callbacks.onNotice(pkt.message || 'میزبان (Host) از بازی خارج شد');
        }
        return;
      }
    }
  }

  private applyTeamSwitchOnHost(playerId: string, desiredTeam?: TeamId) {
    if (this.role !== 'host' || !this.authoritativeRoom) return;
    const target = this.authoritativeRoom.players.find((p) => p.id === playerId);
    if (!target) return;
    const nextTeam: TeamId = desiredTeam || (target.team === 'alpha' ? 'bravo' : 'alpha');
    const slotIdx = this.authoritativeRoom.players.filter((p) => p.team === nextTeam && p.id !== playerId).length;
    const spawn = getTeamSpawnPosition(nextTeam, slotIdx, this.authoritativeRoom.mapId);

    const startHp = this.authoritativeRoom.startingHp ?? DEFAULT_HOST_MATCH_SETTINGS.startingHp;
    const nextSeq = (target.respawnSeq ?? 0) + 1;
    this.authoritativeRoom = mergeClientInputIntoHostState(this.authoritativeRoom, {
      id: playerId,
      team: nextTeam,
      x: spawn.x,
      y: 0,
      z: spawn.z,
      yaw: spawn.yaw,
      hp: startHp,
      maxHp: startHp,
      alive: true,
      respawnSeq: nextSeq,
    });
    this.authoritativeRoom = reconcileOnlineBots(this.authoritativeRoom, Date.now());
    this.resetClientValidationPosition(playerId, spawn.x, spawn.z);
    if (playerId === this.localPlayerId) {
      this.localRespawnSeq = nextSeq;
    }

    this.callbacks.onNotice(`بازیکن «${target.name}» به ${getTeamNameFa(nextTeam)} منتقل شد`);
    this.broadcastFromHost({
      type: 'host:state',
      room: this.authoritativeRoom,
    });
    this.callbacks.onRoomState(this.authoritativeRoom);
  }

  public switchPlayerTeam(playerId?: string, desiredTeam?: TeamId): void {
    if (!this.authoritativeRoom) return;
    const targetId = playerId || this.localPlayerId;
    if (this.role === 'host') {
      this.applyTeamSwitchOnHost(targetId, desiredTeam);
    } else if (this.role === 'client') {
      this.sendToHost({
        type: 'client:switch_team',
        roomCode: this.authoritativeRoom.code,
        playerId: targetId,
        team: desiredTeam,
      });
    }
  }

  public setGameMode(mode: OnlineGameMode): void {
    if (this.role !== 'host' || !this.authoritativeRoom) return;
    // OG rooms are locked to mode='og'
    if (isOgOnlineMode(this.authoritativeRoom.mode) && !isOgOnlineMode(mode)) return;
    const now = Date.now();
    this.onlineBotRuntimes.clear();
    const withBots = reconcileOnlineBots(
      {
        ...this.authoritativeRoom,
        mode,
      },
      now
    );
    const updated: AuthoritativeRoomState = resetAuthoritativeMatch(withBots, now);
    this.authoritativeRoom = updated;
    const hostMe = updated.players.find((p) => p.id === this.localPlayerId);
    if (hostMe?.respawnSeq) {
      this.localRespawnSeq = hostMe.respawnSeq;
    }
    this.lastBroadcastSecond = -1;
    this.broadcastFromHost({
      type: 'host:state',
      room: this.authoritativeRoom,
    });
    this.callbacks.onRoomState(this.authoritativeRoom);
  }

  public setRoomRules(rules: {
    aimAssistAllowed?: boolean;
    slideAllowed?: boolean;
    mythicPerksAllowed?: boolean;
  }): void {
    if (this.role !== 'host' || !this.authoritativeRoom) return;
    const isOgRoom = isOgOnlineMode(this.authoritativeRoom.mode);
    const nextAimAssist = isOgRoom
      ? OG_FEATURE_FLAGS.softAimAssist
      : typeof rules.aimAssistAllowed === 'boolean'
        ? rules.aimAssistAllowed
        : this.authoritativeRoom.aimAssistAllowed !== false;
    const nextSlide = isOgRoom
      ? OG_FEATURE_FLAGS.tacticalSlide
      : typeof rules.slideAllowed === 'boolean'
        ? rules.slideAllowed
        : this.authoritativeRoom.slideAllowed !== false;
    const nextMythicPerks = isOgRoom
      ? false
      : typeof rules.mythicPerksAllowed === 'boolean'
        ? rules.mythicPerksAllowed
        : this.authoritativeRoom.mythicPerksAllowed !== false;

    this.authoritativeRoom = {
      ...this.authoritativeRoom,
      aimAssistAllowed: nextAimAssist,
      slideAllowed: nextSlide,
      mythicPerksAllowed: nextMythicPerks,
      players: nextSlide
        ? this.authoritativeRoom.players
        : this.authoritativeRoom.players.map((p) => (p.isSliding ? { ...p, isSliding: false } : p)),
    };
    this.broadcastFromHost({
      type: 'host:state',
      room: this.authoritativeRoom,
    });
    this.callbacks.onRoomState(this.authoritativeRoom);
  }

  public setMatchSettings(partial: Partial<HostMatchSettings>): void {
    if (this.role !== 'host' || !this.authoritativeRoom) return;
    const isOgRoom = isOgOnlineMode(this.authoritativeRoom.mode);
    const current: HostMatchSettings = sanitizeHostMatchSettings(
      {
        roundDurationSec: this.authoritativeRoom.roundDurationSec,
        targetWinRounds: this.authoritativeRoom.targetWinRounds,
        startingHp: this.authoritativeRoom.startingHp,
        friendlyFire: this.authoritativeRoom.friendlyFire,
        fillBotsEnabled: isOgRoom ? false : this.authoritativeRoom.fillBotsEnabled,
        botDifficulty: this.authoritativeRoom.botDifficulty,
      },
      DEFAULT_HOST_MATCH_SETTINGS
    );
    const next = sanitizeHostMatchSettings(
      isOgRoom ? { ...partial, fillBotsEnabled: false } : partial,
      current
    );
    const now = Date.now();
    const durationChanged = next.roundDurationSec !== current.roundDurationSec;
    const hpChanged = next.startingHp !== current.startingHp;

    const updatedRoom: AuthoritativeRoomState = {
      ...this.authoritativeRoom,
      roundDurationSec: next.roundDurationSec,
      targetWinRounds: next.targetWinRounds,
      startingHp: next.startingHp,
      friendlyFire: next.friendlyFire,
      fillBotsEnabled: next.fillBotsEnabled,
      botDifficulty: next.botDifficulty,
      ...(durationChanged
        ? {
            roundTimeRemainingSec: next.roundDurationSec,
            roundEndsAt: now + next.roundDurationSec * 1000,
          }
        : {}),
      players: hpChanged
        ? this.authoritativeRoom.players.map((p) => ({
            ...p,
            maxHp: next.startingHp,
            hp: p.alive !== false ? next.startingHp : p.hp,
          }))
        : this.authoritativeRoom.players,
    };

    this.authoritativeRoom = reconcileOnlineBots(updatedRoom, now);
    this.lastBroadcastSecond = -1;
    this.broadcastFromHost({
      type: 'host:state',
      room: this.authoritativeRoom,
    });
    this.callbacks.onRoomState(this.authoritativeRoom);
  }

  private isAuthorizedSourceForPlayer(playerId: string, sourceConn?: DataConnection): boolean {
    if (!playerId) return false;
    if (!sourceConn) return true; // Local host or BroadcastChannel test bridge
    const boundId = this.connectionPlayerIds.get(sourceConn);
    return Boolean(boundId && boundId === playerId);
  }

  private resetClientValidationPosition(playerId: string, x: number, z: number): void {
    const prev = this.clientValidators.get(playerId);
    this.clientValidators.set(playerId, {
      lastPosX: x,
      lastPosZ: z,
      lastPosAtMs: 0,
      lastWeaponIdx: prev?.lastWeaponIdx ?? 0,
      lastShotAtMs: prev?.lastShotAtMs ?? 0,
      shotsInMag: 0,
    });
  }

  private sendToTeamMembersFromHost(team: TeamId, pkt: P2PPacket): void {
    if (!this.authoritativeRoom) return;
    for (const p of this.authoritativeRoom.players) {
      if (p.id === this.localPlayerId || p.team !== team) continue;
      const conn = this.hostConnections.get(p.id);
      if (conn && conn.open) {
        try {
          conn.send(pkt);
        } catch {
          // ignore
        }
      }
    }
    // Same-browser BroadcastChannel bridge; clients also strictly filter by shouldReceiveTeamSignal
    this.bcChannel?.postMessage(pkt);
  }

  private handleTeamPingOnHost(senderId: string, rawX: number, rawY: number, rawZ: number): void {
    if (this.role !== 'host' || !this.authoritativeRoom) return;
    if (!isTeamCommsMode(this.authoritativeRoom.mode)) return;
    if (!Number.isFinite(rawX) || !Number.isFinite(rawY) || !Number.isFinite(rawZ)) return;

    const sender = this.authoritativeRoom.players.find((p) => p.id === senderId);
    if (!sender || sender.disconnected) return;

    const now = Date.now();
    const lastSent = this.teamSignalCooldowns.get(`ping:${senderId}`) ?? 0;
    if (now - lastSent < TEAM_SIGNAL_COOLDOWN_MS) return;
    this.teamSignalCooldowns.set(`ping:${senderId}`, now);

    const arenaHalf = getMapArenaHalf(this.authoritativeRoom.mapId);
    const ping: TeamTacticalPing = {
      id: `ping-${senderId}-${now}`,
      senderId: sender.id,
      senderName: sender.name,
      team: sender.team || 'alpha',
      x: Math.max(-arenaHalf, Math.min(arenaHalf, rawX)),
      y: Math.max(-1, Math.min(10, rawY)),
      z: Math.max(-arenaHalf, Math.min(arenaHalf, rawZ)),
      createdAt: now,
      expiresAt: now + TEAM_PING_TTL_MS,
    };

    this.sendToTeamMembersFromHost(ping.team, {
      type: 'host:team_ping',
      roomCode: this.authoritativeRoom.code,
      ping,
    });
    if (shouldReceiveTeamSignal(this.authoritativeRoom.mode, ping.team, this.getLocalTeam())) {
      this.callbacks.onTeamPing?.(ping);
    }
  }

  private handleTeamQuickMessageOnHost(senderId: string, messageId: TeamQuickMessageId): void {
    if (this.role !== 'host' || !this.authoritativeRoom) return;
    if (!isTeamCommsMode(this.authoritativeRoom.mode)) return;
    const textFa = getTeamQuickMessageTextFa(messageId);
    if (!textFa) return;

    const sender = this.authoritativeRoom.players.find((p) => p.id === senderId);
    if (!sender || sender.disconnected) return;

    const now = Date.now();
    const lastSent = this.teamSignalCooldowns.get(`msg:${senderId}`) ?? 0;
    if (now - lastSent < TEAM_SIGNAL_COOLDOWN_MS) return;
    this.teamSignalCooldowns.set(`msg:${senderId}`, now);

    const message: TeamQuickMessage = {
      id: `tmsg-${senderId}-${now}`,
      senderId: sender.id,
      senderName: sender.name,
      team: sender.team || 'alpha',
      messageId,
      textFa,
      createdAt: now,
      expiresAt: now + TEAM_QUICK_MSG_TTL_MS,
    };

    this.sendToTeamMembersFromHost(message.team, {
      type: 'host:team_msg',
      roomCode: this.authoritativeRoom.code,
      message,
    });
    if (shouldReceiveTeamSignal(this.authoritativeRoom.mode, message.team, this.getLocalTeam())) {
      this.callbacks.onTeamQuickMessage?.(message);
    }
  }

  public sendTeamPing(x: number, y: number, z: number): void {
    if (!this.authoritativeRoom || !isTeamCommsMode(this.authoritativeRoom.mode)) return;
    if (this.role === 'host') {
      this.handleTeamPingOnHost(this.localPlayerId, x, y, z);
    } else if (this.role === 'client') {
      this.sendToHost({
        type: 'client:team_ping',
        roomCode: this.authoritativeRoom.code,
        playerId: this.localPlayerId,
        x,
        y,
        z,
      });
    }
  }

  public sendTeamQuickMessage(messageId: TeamQuickMessageId): void {
    if (!this.authoritativeRoom || !isTeamCommsMode(this.authoritativeRoom.mode)) return;
    if (!getTeamQuickMessageTextFa(messageId)) return;
    if (this.role === 'host') {
      this.handleTeamQuickMessageOnHost(this.localPlayerId, messageId);
    } else if (this.role === 'client') {
      this.sendToHost({
        type: 'client:team_msg',
        roomCode: this.authoritativeRoom.code,
        playerId: this.localPlayerId,
        messageId,
      });
    }
  }

  /**
   * Host-authoritative trigger to apply winning voted map (if any), place every player on their team spawn,
   * and run a fresh 3-second countdown (used when starting Round 1 of a 1v1 / 2v2 match from the lobby).
   */
  public beginAuthoritativeRoundCountdown(): void {
    if (this.role !== 'host' || !this.authoritativeRoom) return;
    if (!isRoundBasedMode(this.authoritativeRoom.mode)) return;
    const now = Date.now();
    const voteResult = resolveMapVoteWinner(this.authoritativeRoom);
    if (voteResult.totalVotes > 0 && voteResult.winnerMapId !== this.authoritativeRoom.mapId) {
      this.authoritativeRoom = {
        ...this.authoritativeRoom,
        mapId: voteResult.winnerMapId,
      };
      this.callbacks.onMapChangedByHost(voteResult.winnerMapId);
      this.broadcastFromHost({
        type: 'host:map',
        roomCode: this.authoritativeRoom.code,
        mapId: voteResult.winnerMapId,
      });
    }
    this.authoritativeRoom = beginRoundCountdownState(this.authoritativeRoom, now, false);
    this.lastBroadcastSecond = -1;
    const msg = `آماده‌باش برای شروع راند ${this.authoritativeRoom.currentRound}`;
    this.broadcastRoundRespawnFromHost(msg);
  }

  private applyRematchVoteOnHost(playerId: string, ready = true): void {
    if (this.role !== 'host' || !this.authoritativeRoom) return;
    if (this.authoritativeRoom.roundPhase !== 'match_over') return;

    this.authoritativeRoom = toggleRematchVote(this.authoritativeRoom, playerId, ready);

    if (areAllActivePlayersReadyForRematch(this.authoritativeRoom)) {
      const now = Date.now();
      const voteResult = resolveMapVoteWinner(this.authoritativeRoom);
      const nextMap = voteResult.totalVotes > 0 ? voteResult.winnerMapId : this.authoritativeRoom.mapId;
      const mapChanged = nextMap !== this.authoritativeRoom.mapId;

      this.authoritativeRoom = resetAuthoritativeMatch(this.authoritativeRoom, now, nextMap);
      this.lastBroadcastSecond = -1;

      if (mapChanged) {
        this.callbacks.onMapChangedByHost(nextMap);
        this.broadcastFromHost({
          type: 'host:map',
          roomCode: this.authoritativeRoom.code,
          mapId: nextMap,
        });
      }

      const msg = `همه بازیکنان آماده شدند — شروع مسابقه جدید (راند ۱)!`;
      this.broadcastRoundRespawnFromHost(msg);
      this.callbacks.onNotice(msg);
      return;
    }

    this.broadcastFromHost({
      type: 'host:state',
      room: this.authoritativeRoom,
    });
    this.callbacks.onRoomState(this.authoritativeRoom);
  }

  public voteRematch(ready = true): void {
    if (!this.authoritativeRoom) return;
    if (this.role === 'host') {
      this.applyRematchVoteOnHost(this.localPlayerId, ready);
    } else if (this.role === 'client') {
      this.sendToHost({
        type: 'client:rematch_vote',
        roomCode: this.authoritativeRoom.code,
        playerId: this.localPlayerId,
        ready,
      });
    }
  }

  private applyMapVoteOnHost(playerId: string, mapId: MapId): void {
    if (this.role !== 'host' || !this.authoritativeRoom) return;
    this.authoritativeRoom = castMapVote(this.authoritativeRoom, playerId, mapId);
    const resolution = resolveMapVoteWinner(this.authoritativeRoom);
    // In lobby or match_over, immediately reflect winning map if changed (and host tie-break applies automatically)
    if (
      resolution.totalVotes > 0 &&
      resolution.winnerMapId !== this.authoritativeRoom.mapId &&
      this.authoritativeRoom.roundPhase !== 'playing' &&
      this.authoritativeRoom.roundPhase !== 'countdown'
    ) {
      this.authoritativeRoom = {
        ...this.authoritativeRoom,
        mapId: resolution.winnerMapId,
      };
      this.callbacks.onMapChangedByHost(resolution.winnerMapId);
      this.broadcastFromHost({
        type: 'host:map',
        roomCode: this.authoritativeRoom.code,
        mapId: resolution.winnerMapId,
      });
    }
    this.broadcastFromHost({
      type: 'host:state',
      room: this.authoritativeRoom,
    });
    this.callbacks.onRoomState(this.authoritativeRoom);
  }

  public voteMap(mapId: MapId): void {
    if (!this.authoritativeRoom) return;
    if (this.role === 'host') {
      this.applyMapVoteOnHost(this.localPlayerId, mapId);
    } else if (this.role === 'client') {
      this.sendToHost({
        type: 'client:map_vote',
        roomCode: this.authoritativeRoom.code,
        playerId: this.localPlayerId,
        mapId,
      });
    }
  }

  public applyWinningMapVoteOnHost(): MapId | null {
    if (this.role !== 'host' || !this.authoritativeRoom) return null;
    const resolution = resolveMapVoteWinner(this.authoritativeRoom);
    if (resolution.totalVotes <= 0) return this.authoritativeRoom.mapId;
    if (resolution.winnerMapId !== this.authoritativeRoom.mapId) {
      this.authoritativeRoom = {
        ...this.authoritativeRoom,
        mapId: resolution.winnerMapId,
      };
      this.callbacks.onMapChangedByHost(resolution.winnerMapId);
      this.broadcastFromHost({
        type: 'host:map',
        roomCode: this.authoritativeRoom.code,
        mapId: resolution.winnerMapId,
      });
      this.broadcastFromHost({
        type: 'host:state',
        room: this.authoritativeRoom,
      });
      this.callbacks.onRoomState(this.authoritativeRoom);
    }
    return resolution.winnerMapId;
  }

  private broadcastRoundRespawnFromHost(msg: string) {
    if (!this.authoritativeRoom) return;
    const spawnsMap: Record<
      string,
      { team: TeamId; x: number; y: number; z: number; yaw: number; respawnSeq: number }
    > = {};
    for (const p of this.authoritativeRoom.players) {
      spawnsMap[p.id] = {
        team: p.team,
        x: p.x,
        y: p.y,
        z: p.z,
        yaw: p.yaw,
        respawnSeq: p.respawnSeq ?? 1,
      };
      this.resetClientValidationPosition(p.id, p.x, p.z);
    }
    const me = this.authoritativeRoom.players.find((p) => p.id === this.localPlayerId);
    const myTeam = me?.team || 'alpha';
    const spawn = me
      ? { x: me.x, z: me.z, yaw: me.yaw }
      : getTeamSpawnPosition(myTeam, 0, this.authoritativeRoom.mapId);
    if (me?.respawnSeq) {
      this.localRespawnSeq = me.respawnSeq;
    }

    this.broadcastFromHost({
      type: 'host:state',
      room: this.authoritativeRoom,
    });
    this.broadcastFromHost({
      type: 'host:round_respawn',
      roomCode: this.authoritativeRoom.code,
      currentRound: this.authoritativeRoom.currentRound,
      alphaScore: this.authoritativeRoom.alphaScore,
      bravoScore: this.authoritativeRoom.bravoScore,
      messageFa: msg,
      roundPhase: this.authoritativeRoom.roundPhase,
      countdownRemainingSec: this.authoritativeRoom.countdownRemainingSec,
      startingHp: this.authoritativeRoom.startingHp ?? DEFAULT_HOST_MATCH_SETTINGS.startingHp,
      spawns: spawnsMap,
    });
    this.callbacks.onRoomState(this.authoritativeRoom);
    this.callbacks.onRoundRespawn?.(this.authoritativeRoom.currentRound, myTeam, spawn, msg);
  }

  private processAuthoritativeHit(
    attackerId: string,
    targetId: string,
    rawDamage: number,
    isHeadshot = false,
    weaponIdx = 0
  ) {
    if (!this.authoritativeRoom) return;
    const now = Date.now();
    if (isRoundBasedMode(this.authoritativeRoom.mode) && this.authoritativeRoom.roundPhase !== 'playing') {
      return;
    }

    const attacker = this.authoritativeRoom.players.find((p) => p.id === attackerId);
    const target = this.authoritativeRoom.players.find((p) => p.id === targetId);
    if (!attacker || !target) return;

    // Enforce Friendly Fire setting controlled by Host (OFF by default)
    if (
      !canDamagePlayer(
        this.authoritativeRoom.mode,
        attacker.team,
        target.team,
        attacker.id,
        target.id,
        Boolean(this.authoritativeRoom.friendlyFire)
      )
    ) {
      return;
    }

    if (isRoundBasedMode(this.authoritativeRoom.mode) && !target.alive) {
      return;
    }

    // Host ignores damage while target is under spawn protection
    if (isPlayerSpawnProtected(target, now)) {
      return;
    }

    // Ensure attacker loses own spawn protection immediately upon dealing a shot
    const clearedAttacker = clearPlayerSpawnProtection(this.authoritativeRoom, attacker.id);
    if (clearedAttacker.changed) {
      this.authoritativeRoom = clearedAttacker.nextRoom;
    }

    const dmg = Math.max(1, Math.min(290, Math.round(rawDamage)));
    const roundMode = isRoundBasedMode(this.authoritativeRoom.mode);
    const startHp = this.authoritativeRoom.startingHp ?? DEFAULT_HOST_MATCH_SETTINGS.startingHp;
    let nextHp = Math.max(0, target.hp - dmg);
    let killed = false;
    let nextAlive = target.alive;
    let nextKills = attacker.kills;
    let nextScore = attacker.score;

    let respawnPos: { x: number; y: number; z: number; yaw: number } | undefined;
    let nextRespawnSeq: number | undefined;

    if (nextHp <= 0) {
      killed = true;
      const isFriendlyKill =
        this.authoritativeRoom.mode !== 'pvp' &&
        this.authoritativeRoom.mode !== 'og' &&
        attacker.team &&
        target.team &&
        attacker.team === target.team;
      if (!isFriendlyKill) {
        nextKills += 1;
        nextScore += 150;
      }
      if (roundMode) {
        nextHp = 0;
        nextAlive = false;
      } else {
        nextHp = startHp;
        nextAlive = true;
        const teamSlotIdx = Math.max(
          0,
          this.authoritativeRoom.players
            .filter((p) => p.team === target.team)
            .findIndex((p) => p.id === target.id)
        );
        respawnPos = getTeamSpawnPosition(target.team, teamSlotIdx, this.authoritativeRoom.mapId);
        nextRespawnSeq = (target.respawnSeq ?? 0) + 1;
        this.resetClientValidationPosition(target.id, respawnPos.x, respawnPos.z);
      }
    }

    this.authoritativeRoom = mergeClientInputIntoHostState(this.authoritativeRoom, {
      id: target.id,
      hp: nextHp,
      maxHp: startHp,
      alive: nextAlive,
      deaths: killed ? (target.deaths ?? 0) + 1 : (target.deaths ?? 0),
      ...(respawnPos
        ? {
            x: respawnPos.x,
            y: respawnPos.y,
            z: respawnPos.z,
            yaw: respawnPos.yaw,
            pitch: 0,
            isSliding: false,
            respawnSeq: nextRespawnSeq,
          }
        : {}),
    });
    const allowSpawnProtection = !isOgOnlineMode(this.authoritativeRoom.mode) || OG_FEATURE_FLAGS.spawnProtection;
    if (respawnPos && allowSpawnProtection) {
      // Grant 2s spawn protection after non-round PvP death respawn as well
      const protectUntil = now + SPAWN_PROTECTION_SEC * 1000;
      this.authoritativeRoom = {
        ...this.authoritativeRoom,
        players: this.authoritativeRoom.players.map((p) =>
          p.id === target.id ? { ...p, spawnProtectedUntil: protectUntil, spawnProtected: true } : p
        ),
      };
    }
    this.authoritativeRoom = mergeClientInputIntoHostState(this.authoritativeRoom, {
      id: attacker.id,
      kills: nextKills,
      score: nextScore,
      shotsHit: (attacker.shotsHit ?? 0) + 1,
      headshots: (attacker.headshots ?? 0) + (isHeadshot ? 1 : 0),
    });

    const safeAttackerCosmetics = isOgOnlineMode(this.authoritativeRoom.mode)
      ? undefined
      : sanitizeOnlineCosmetics(attacker.cosmetics);
    const targetDeathPos: Vector3Like = { x: target.x, y: target.y, z: target.z };

    const hitPkt: P2PPacket = {
      type: 'host:hit',
      roomCode: this.authoritativeRoom.code,
      attackerId: attacker.id,
      attackerName: attacker.name,
      attackerTeam: attacker.team || 'alpha',
      targetId: target.id,
      targetName: target.name,
      targetTeam: target.team || 'bravo',
      weaponIdx,
      isHeadshot,
      damage: dmg,
      targetHp: nextHp,
      killed,
      respawnPos,
      respawnSeq: nextRespawnSeq,
      attackerCosmetics: safeAttackerCosmetics,
      targetPos: targetDeathPos,
    };

    this.callbacks.onPlayerHitConfirmed?.({
      attackerId: attacker.id,
      attackerName: attacker.name,
      attackerTeam: attacker.team || 'alpha',
      targetId: target.id,
      targetName: target.name,
      targetTeam: target.team || 'bravo',
      weaponIdx,
      isHeadshot,
      killed,
      attackerCosmetics: safeAttackerCosmetics,
      targetPos: targetDeathPos,
    });

    if (target.id === this.localPlayerId) {
      if (typeof nextRespawnSeq === 'number') {
        this.localRespawnSeq = nextRespawnSeq;
      }
      this.callbacks.onLocalPlayerDamaged(dmg, attacker.name, killed, respawnPos, attacker.id);
    }

    this.broadcastFromHost(hitPkt);

    // Check if a team was wiped out in round-based mode (ignoring disconnected slots)
    if (roundMode && killed) {
      const targetTeamMembers = this.authoritativeRoom.players.filter((p) => p.team === target.team);
      const anyTargetTeamAlive = targetTeamMembers.some((p) => p.alive && !p.disconnected && p.hp > 0);
      if (targetTeamMembers.length > 0 && !anyTargetTeamAlive) {
        const winnerTeam: TeamId = target.team === 'alpha' ? 'bravo' : 'alpha';
        this.recordTeamRoundWin(
          winnerTeam,
          `تمام اعضای ${getTeamNameFa(target.team)} حذف شدند — امتیاز راند برای ${getTeamNameFa(winnerTeam)}!`
        );
        return;
      }
    }

    this.broadcastFromHost({
      type: 'host:state',
      room: this.authoritativeRoom,
    });
    this.callbacks.onRoomState(this.authoritativeRoom);
  }

  /**
   * Authoritative Host method to award a round point to `winnerTeam` (either by wiping opposing players,
   * wiping opposing bots in solo/co-op round testing, or when round timer expires).
   */
  public recordTeamRoundWin(winnerTeam: TeamId, customReasonFa?: string): void {
    if (this.role !== 'host' || !this.authoritativeRoom) return;
    if (!isRoundBasedMode(this.authoritativeRoom.mode)) return;
    if (this.authoritativeRoom.roundPhase !== 'playing') return;

    const now = Date.now();
    this.authoritativeRoom = awardRoundPointToTeam(this.authoritativeRoom, winnerTeam, now);
    this.lastBroadcastSecond = -1;

    const matchWon = this.authoritativeRoom.roundPhase === 'match_over';
    const msg = matchWon
      ? `🏆 پایان مسابقه! ${getTeamNameFa(winnerTeam)} با رسیدن به امتیاز ${this.authoritativeRoom.targetWinRounds} برنده نهایی شد!`
      : customReasonFa ||
        `پایان راند ${this.authoritativeRoom.currentRound} — امتیاز برای ${getTeamNameFa(winnerTeam)} (${this.authoritativeRoom.alphaScore} - ${this.authoritativeRoom.bravoScore})`;

    this.callbacks.onNotice(msg);
    this.broadcastFromHost({
      type: 'host:state',
      room: this.authoritativeRoom,
    });
    this.callbacks.onRoomState(this.authoritativeRoom);
  }

  /**
   * Real-time wall-clock (Date.now) authoritative round driver on Host.
   * Safe to invoke both from the 200ms setInterval heartbeat and from requestAnimationFrame.
   */
  public tickAuthoritativeRoundNow(now = Date.now()): void {
    if (this.role !== 'host' || !this.authoritativeRoom) return;

    // 1. Prune players whose 30-second mid-match reconnect grace period has expired
    const pruneRes = pruneExpiredDisconnectedPlayers(this.authoritativeRoom, now);
    if (pruneRes.expiredPlayers.length > 0) {
      this.authoritativeRoom = reconcileOnlineBots(pruneRes.nextRoom, now);
      for (const ep of pruneRes.expiredPlayers) {
        this.clientValidators.delete(ep.id);
        this.teamSignalCooldowns.delete(`ping:${ep.id}`);
        this.teamSignalCooldowns.delete(`msg:${ep.id}`);
        this.callbacks.onNotice(`مهلت ۳۰ ثانیه‌ای اتصال دوباره «${ep.name}» به پایان رسید و از اتاق حذف شد`);
      }
      this.broadcastFromHost({
        type: 'host:state',
        room: this.authoritativeRoom,
        leftPlayerName: pruneRes.expiredPlayers[0]?.name,
      });
      this.callbacks.onRoomState(this.authoritativeRoom);
    }

    if (!isRoundBasedMode(this.authoritativeRoom.mode)) {
      // Even in non-round PvP, expire spawn protection cleanly on real wall-clock time
      let expiredAny = false;
      const nextPlayers = this.authoritativeRoom.players.map((p) => {
        if (p.spawnProtected && p.spawnProtectedUntil && now >= p.spawnProtectedUntil) {
          expiredAny = true;
          return { ...p, spawnProtected: false, spawnProtectedUntil: 0 };
        }
        return p;
      });
      if (expiredAny) {
        this.authoritativeRoom = { ...this.authoritativeRoom, players: nextPlayers };
        this.broadcastFromHost({ type: 'host:state', room: this.authoritativeRoom });
        this.callbacks.onRoomState(this.authoritativeRoom);
      }
      return;
    }

    const room = this.authoritativeRoom;

    if (room.roundPhase === 'countdown') {
      const startedAt = room.phaseStartedAt ?? now;
      const endsAt = room.countdownEndsAt ?? startedAt + ROUND_COUNTDOWN_SEC * 1000;
      const hardCapAt = startedAt + 4500;
      const remSec = Math.max(0, Math.ceil((endsAt - now) / 1000));
      if (remSec <= 0 || now >= endsAt || now >= hardCapAt) {
        this.authoritativeRoom = finishRoundCountdownState(room, now);
        this.lastBroadcastSecond = -1;
        this.broadcastFromHost({
          type: 'host:state',
          room: this.authoritativeRoom,
        });
        this.callbacks.onRoomState(this.authoritativeRoom);
        return;
      }
      if (room.countdownRemainingSec !== remSec) {
        room.countdownRemainingSec = remSec;
        this.broadcastFromHost({
          type: 'host:state',
          room: this.authoritativeRoom,
        });
        this.callbacks.onRoomState(this.authoritativeRoom);
      }
      return;
    }

    if (room.roundPhase === 'playing') {
      let protectionChanged = false;
      const refreshedPlayers = room.players.map((p) => {
        const activeNow = isPlayerSpawnProtected(p, now);
        if (Boolean(p.spawnProtected) !== activeNow) {
          protectionChanged = true;
          return {
            ...p,
            spawnProtected: activeNow,
            spawnProtectedUntil: activeNow ? p.spawnProtectedUntil : 0,
          };
        }
        return p;
      });
      if (protectionChanged) {
        room.players = refreshedPlayers;
      }

      if (!room.roundEndsAt) {
        room.phaseStartedAt = now;
        const roundDur = room.roundDurationSec ?? ROUND_DURATION_SEC;
        room.roundEndsAt = now + Math.max(1, room.roundTimeRemainingSec || roundDur) * 1000;
      }
      const nextSec = Math.max(0, Math.ceil((room.roundEndsAt - now) / 1000));
      room.roundTimeRemainingSec = nextSec;
      if (nextSec <= 0 || now >= room.roundEndsAt) {
        const alphaAlive = room.players.filter((p) => p.team === 'alpha' && p.alive && !p.disconnected).length;
        const bravoAlive = room.players.filter((p) => p.team === 'bravo' && p.alive && !p.disconnected).length;
        const winner: TeamId = alphaAlive >= bravoAlive ? 'alpha' : 'bravo';
        this.recordTeamRoundWin(
          winner,
          `پایان زمان راند ${room.currentRound}! امتیاز به ${getTeamNameFa(winner)} رسید`
        );
        return;
      }
      if (this.lastBroadcastSecond !== nextSec || protectionChanged) {
        this.lastBroadcastSecond = nextSec;
        this.broadcastFromHost({
          type: 'host:state',
          room: this.authoritativeRoom,
        });
        this.callbacks.onRoomState(this.authoritativeRoom);
      }
      return;
    }

    if (room.roundPhase === 'intermission') {
      const startedAt = room.phaseStartedAt ?? now;
      const endsAt = room.intermissionEndsAt ?? startedAt + ROUND_INTERMISSION_SEC * 1000;
      // Watchdog guard: never allow intermission to stall longer than 4.5s
      const hardCapAt = startedAt + 4500;
      if (now >= endsAt || now >= hardCapAt) {
        this.onlineBotRuntimes.clear();
        const reconciled = reconcileOnlineBots(room, now);
        this.authoritativeRoom = startNextAuthoritativeRound(reconciled, now);
        this.lastBroadcastSecond = -1;
        const msg = `شروع راند ${this.authoritativeRoom.currentRound} — آماده نبرد! (${this.authoritativeRoom.alphaScore} - ${this.authoritativeRoom.bravoScore})`;
        this.broadcastRoundRespawnFromHost(msg);
        this.callbacks.onNotice(msg);
      }
      return;
    }

    // Note: in `match_over` phase, Host waits for players to confirm "بازی دوباره" (Rematch)
    // or exit the room, rather than force-restarting automatically.
  }

  /**
   * Called from the Host's main loop (`animate`). Delegates strictly to Date.now()-based clock.
   */
  public tickAuthoritativeRound(_dtSec: number): void {
    this.tickAuthoritativeRoundNow(Date.now());
  }

  /**
   * Host-authoritative simulation tick for bots filling empty 1v1 / 2v2 round slots.
   * Syncs bot movement, gunfire tracers, and hits via the exact same Host pathways as humans.
   */
  public tickOnlineBots(dtSec: number, helpers: OnlineBotSimHelpers = {}): void {
    if (this.role !== 'host' || !this.authoritativeRoom) return;
    if (!isRoundBasedMode(this.authoritativeRoom.mode)) return;
    if (this.authoritativeRoom.roundPhase !== 'playing') return;

    const now = Date.now();
    const res = stepOnlineBotsAuthoritative(
      this.authoritativeRoom,
      this.onlineBotRuntimes,
      dtSec,
      now,
      helpers
    );
    if (!res.changed && res.shots.length === 0) return;

    this.authoritativeRoom = res.nextRoom;

    for (const shot of res.shots) {
      const shootPkt: P2PPacket = {
        type: 'host:shoot',
        roomCode: this.authoritativeRoom.code,
        playerId: shot.attackerId,
        weaponIdx: shot.weaponIdx,
        from: shot.from,
        to: shot.to,
      };
      this.broadcastFromHost(shootPkt);
      this.callbacks.onRemoteShoot(shot.attackerId, shot.weaponIdx, shot.from, shot.to);
      if (shot.hit) {
        this.processAuthoritativeHit(
          shot.attackerId,
          shot.targetId,
          shot.damage,
          shot.isHeadshot,
          shot.weaponIdx
        );
      }
    }

    if (now - this.lastOnlineBotBroadcastAt >= 65 || res.shots.length > 0) {
      this.lastOnlineBotBroadcastAt = now;
      if (res.shots.length > 0) {
        this.broadcastFromHost({
          type: 'host:state',
          room: this.authoritativeRoom,
        });
      } else {
        const botPlayers = this.authoritativeRoom.players.filter((p) => p.isBot);
        if (botPlayers.length > 0) {
          this.broadcastCompactPosesFromHost(botPlayers, now);
        }
      }
      this.callbacks.onRoomState(this.authoritativeRoom);
    }
  }

  private broadcastCompactPosesFromHost(players: AuthoritativePlayerState[], nowMs = Date.now()) {
    if (!this.authoritativeRoom || players.length === 0) return;
    const tuples: CompactPlayerPoseTuple[] = [];
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      tuples.push(
        encodeCompactPlayerPose(
          {
            id: p.id,
            x: p.x,
            y: p.y,
            z: p.z,
            yaw: p.yaw,
            pitch: p.pitch,
            weaponIdx: p.weaponIdx,
            isSliding: Boolean(p.isSliding),
            alive: p.alive !== false,
            anim: p.anim ?? 0,
            animAt: p.animAt ?? nowMs,
          },
          nowMs
        )
      );
    }
    this.broadcastFromHost({
      type: 'h:p',
      r: this.authoritativeRoom.code,
      p: tuples,
    });
  }

  private broadcastFromHost(pkt: P2PPacket) {
    this.hostConnections.forEach((conn) => {
      if (conn.open) {
        try {
          conn.send(pkt);
        } catch {
          // ignore
        }
      }
    });
    this.bcChannel?.postMessage(pkt);
  }

  private sendToHost(pkt: P2PPacket) {
    if (this.clientConn && this.clientConn.open) {
      try {
        this.clientConn.send(pkt);
      } catch {
        // ignore
      }
    }
    this.bcChannel?.postMessage(pkt);
  }

  /**
   * Called at ~20-22Hz from the game loop to sync local player state using
   * delta-only filtering and compact quantized wire arrays.
   */
  public syncLocalPlayerState(state: {
    x: number;
    y: number;
    z: number;
    yaw: number;
    pitch: number;
    weaponIdx: number;
    hp: number;
    kills: number;
    score: number;
    wave: number;
    isSliding?: boolean;
    anim?: number;
    animAt?: number;
  }): void {
    if (!this.authoritativeRoom) return;
    const now = Date.now();
    const snap: LocalSyncSnapshot = {
      x: state.x,
      y: state.y,
      z: state.z,
      yaw: state.yaw,
      pitch: state.pitch,
      weaponIdx: state.weaponIdx,
      hp: state.hp,
      kills: state.kills,
      score: state.score,
      wave: state.wave,
      isSliding: Boolean(state.isSliding),
      anim: state.anim ?? 0,
      animAt: state.animAt ?? now,
    };

    const elapsedMs = now - this.lastLocalSyncSentAtMs;
    if (!shouldSendClientStateDelta(this.lastLocalSyncSnapshot, snap, elapsedMs, CLIENT_IDLE_HEARTBEAT_MS)) {
      return;
    }
    this.lastLocalSyncSnapshot = snap;
    this.lastLocalSyncSentAtMs = now;

    const roundMode = isRoundBasedMode(this.authoritativeRoom.mode);

    if (this.role === 'host') {
      const prevWave = this.authoritativeRoom.wave;
      this.authoritativeRoom.wave = state.wave;
      const existingHost = this.authoritativeRoom.players.find((p) => p.id === this.localPlayerId);
      const startHp = this.authoritativeRoom.startingHp ?? DEFAULT_HOST_MATCH_SETTINGS.startingHp;
      const isCompetitive = roundMode || this.authoritativeRoom.mode === 'pvp' || this.authoritativeRoom.mode === 'og';
      const nextHp = isCompetitive ? (existingHost?.hp ?? startHp) : Math.min(startHp, state.hp);
      const nextKills = isCompetitive ? (existingHost?.kills ?? 0) : state.kills;
      const nextScore = isCompetitive ? (existingHost?.score ?? 0) : state.score;
      const needsFullState =
        prevWave !== state.wave ||
        !existingHost ||
        existingHost.hp !== nextHp ||
        existingHost.kills !== nextKills ||
        existingHost.score !== nextScore;

      this.authoritativeRoom = mergeClientInputIntoHostState(this.authoritativeRoom, {
        id: this.localPlayerId,
        name: this.localPlayerName,
        x: state.x,
        y: state.y,
        z: state.z,
        yaw: state.yaw,
        pitch: state.pitch,
        weaponIdx: state.weaponIdx,
        hp: nextHp,
        alive: roundMode ? (existingHost?.alive ?? true) : undefined,
        kills: nextKills,
        score: nextScore,
        isSliding: this.authoritativeRoom.slideAllowed !== false && Boolean(state.isSliding),
        anim: state.anim,
        animAt: state.animAt,
      });

      if (needsFullState) {
        this.broadcastFromHost({
          type: 'host:state',
          room: this.authoritativeRoom,
        });
      } else if (now - this.lastHostPoseBroadcastAtMs >= HOST_TRANSFORM_BROADCAST_MS) {
        this.lastHostPoseBroadcastAtMs = now;
        const updatedHost = this.authoritativeRoom.players.find((p) => p.id === this.localPlayerId);
        if (updatedHost) {
          this.broadcastCompactPosesFromHost([updatedHost], now);
        }
      }
      this.callbacks.onRoomState(this.authoritativeRoom);
    } else if (this.role === 'client') {
      this.sendToHost({
        type: 'c:i',
        d: encodeCompactClientInput(
          {
            roomCode: this.authoritativeRoom.code,
            playerId: this.localPlayerId,
            name: this.localPlayerName,
            x: state.x,
            y: state.y,
            z: state.z,
            yaw: state.yaw,
            pitch: state.pitch,
            weaponIdx: state.weaponIdx,
            hp: state.hp,
            kills: state.kills,
            score: state.score,
            roundNum: this.authoritativeRoom.currentRound,
            respawnSeq: this.localRespawnSeq,
            isSliding: Boolean(state.isSliding),
            anim: state.anim ?? 0,
            animAt: state.animAt ?? now,
          },
          now
        ),
      });
    }
  }

  public sendShoot(weaponIdx: number, from: Vector3Like, to: Vector3Like): void {
    if (!this.authoritativeRoom) return;
    if (isRoundBasedMode(this.authoritativeRoom.mode) && this.authoritativeRoom.roundPhase === 'countdown') {
      return;
    }
    if (this.role === 'host') {
      const hostShooter = this.authoritativeRoom.players.find((p) => p.id === this.localPlayerId);
      if (hostShooter) {
        this.authoritativeRoom = mergeClientInputIntoHostState(this.authoritativeRoom, {
          id: this.localPlayerId,
          shotsFired: (hostShooter.shotsFired ?? 0) + 1,
        });
      }
      const { nextRoom, changed } = clearPlayerSpawnProtection(this.authoritativeRoom, this.localPlayerId);
      if (changed) {
        this.authoritativeRoom = nextRoom;
        this.broadcastFromHost({
          type: 'host:state',
          room: this.authoritativeRoom,
        });
        this.callbacks.onRoomState(this.authoritativeRoom);
      }
      this.broadcastFromHost({
        type: 'host:shoot',
        roomCode: this.authoritativeRoom.code,
        playerId: this.localPlayerId,
        weaponIdx,
        from,
        to,
      });
    } else if (this.role === 'client') {
      this.sendToHost({
        type: 'client:shoot',
        roomCode: this.authoritativeRoom.code,
        playerId: this.localPlayerId,
        weaponIdx,
        from,
        to,
      });
    }
  }

  public sendPlayerHit(targetId: string, damage: number, isHeadshot: boolean, weaponIdx = 0): void {
    if (!this.authoritativeRoom) return;
    if (this.role === 'host') {
      this.processAuthoritativeHit(this.localPlayerId, targetId, damage, isHeadshot, weaponIdx);
    } else if (this.role === 'client') {
      this.sendToHost({
        type: 'client:hit',
        roomCode: this.authoritativeRoom.code,
        attackerId: this.localPlayerId,
        targetId,
        damage,
        isHeadshot,
        weaponIdx,
      });
    }
  }

  public notifyHostMapChange(mapId: MapId): void {
    if (this.role !== 'host' || !this.authoritativeRoom) return;
    const safeMapId = isOgOnlineMode(this.authoritativeRoom.mode)
      ? sanitizeOgRoomMap(mapId, OG_FEATURE_FLAGS.duel1v1Map)
      : mapId;
    this.authoritativeRoom = {
      ...this.authoritativeRoom,
      mapId: safeMapId,
    };
    this.broadcastFromHost({
      type: 'host:map',
      roomCode: this.authoritativeRoom.code,
      mapId: safeMapId,
    });
    this.broadcastFromHost({
      type: 'host:state',
      room: this.authoritativeRoom,
    });
    this.callbacks.onRoomState(this.authoritativeRoom);
  }

  public leaveRoom(): void {
    this.intentionalLeave = true;
    if (this.role === 'host' && this.authoritativeRoom) {
      this.broadcastFromHost({
        type: 'host:closed',
        roomCode: this.authoritativeRoom.code,
        message: `میزبان («${this.localPlayerName}») اتاق را بست و ارتباط قطع شد.`,
      });
    } else if (this.role === 'client' && this.authoritativeRoom) {
      this.sendToHost({
        type: 'client:leave',
        roomCode: this.authoritativeRoom.code,
        playerId: this.localPlayerId,
        name: this.localPlayerName,
      });
    }

    this.destroyPeerInstance();
    this.authoritativeRoom = null;
    this.setStatus('idle', 'none', null);
    this.callbacks.onRoomLeft();
  }

  public dispose(): void {
    this.leaveRoom();
    try {
      this.bcChannel?.close();
    } catch {
      // ignore
    }
  }
}
export type { AuthoritativePlayerState, AuthoritativeRoomState };
