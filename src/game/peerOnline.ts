import Peer, { DataConnection } from 'peerjs';
import {
  MapId,
  OnlineGameMode,
  TeamId,
  PeerConnectionStatus,
  PeerRole,
  AuthoritativeRoomState,
  AuthoritativePlayerState,
  ROUND_DURATION_SEC,
  ROUND_INTERMISSION_SEC,
  ROUND_MATCH_WIN_SCORE,
  isRoundBasedMode,
  getTeamColor,
  getTeamNameFa,
  canDamagePlayer,
  assignBalancedTeam,
  getTeamSpawnPosition,
  awardRoundPointToTeam,
  startNextAuthoritativeRound,
  resetAuthoritativeMatch,
  generatePeerRoomCode,
  normalizeRoomCode,
  roomCodeToHostPeerId,
  mergeClientInputIntoHostState,
  removeDisconnectedPlayerFromHostState,
  isStaleClientInputForRespawn,
  VERSION_MISMATCH_MESSAGE_FA,
  checkOnlineVersionCompatibility,
} from './rules';
import { getPeerJsClientOptions } from './peerConfig';
import type { LivePeerTelemetry } from './peerDiagnostics';
import { APP_VERSION } from './version';

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
      targetId: string;
      targetName: string;
      damage: number;
      targetHp: number;
      killed: boolean;
      respawnPos?: { x: number; y: number; z: number; yaw: number };
      respawnSeq?: number;
    }
  | {
      type: 'host:round_respawn';
      roomCode: string;
      currentRound: number;
      alphaScore: number;
      bravoScore: number;
      messageFa: string;
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
    respawnPos?: { x: number; y: number; z: number; yaw: number }
  ) => void;
  onRoundRespawn?: (currentRound: number, team: TeamId, spawnPos: { x: number; z: number; yaw: number }, messageFa: string) => void;
  onNotice: (messageFa: string) => void;
  onPublicRoomsUpdated?: (rooms: AuthoritativeRoomState[]) => void;
  onPeerReady?: (peer: Peer | null, localPeerId: string | null) => void;
}

export class PeerMultiplayerManager {
  private peer: Peer | null = null;
  private hostConnections = new Map<string, DataConnection>(); // playerId -> conn (when role === 'host')
  private clientConn: DataConnection | null = null; // conn to host (when role === 'client')
  private bcChannel: BroadcastChannel | null = null;

  private role: PeerRole = 'none';
  private status: PeerConnectionStatus = 'idle';
  private lastError: string | null = null;

  private localPlayerId: string;
  private localPlayerName: string;
  private roomPassword = '';
  private authoritativeRoom: AuthoritativeRoomState | null = null;
  private joinTimeoutId: number | null = null;
  private roundHeartbeatId: number | null = null;
  private lastBroadcastSecond = -1;
  private lastSyncedClientRound = 0;
  private lastSyncedClientPhase: string | null = null;
  private localRespawnSeq = 0;
  private callbacks: PeerMultiplayerCallbacks;

  constructor(localPlayerId: string, localPlayerName: string, callbacks: PeerMultiplayerCallbacks) {
    this.localPlayerId = localPlayerId;
    this.localPlayerName = localPlayerName;
    this.callbacks = callbacks;
    this.initBroadcastBridge();
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

  private destroyPeerInstance() {
    if (this.joinTimeoutId !== null) {
      window.clearTimeout(this.joinTimeoutId);
      this.joinTimeoutId = null;
    }
    if (this.roundHeartbeatId !== null) {
      window.clearInterval(this.roundHeartbeatId);
      this.roundHeartbeatId = null;
    }
    this.lastBroadcastSecond = -1;
    this.lastSyncedClientRound = 0;
    this.lastSyncedClientPhase = null;
    this.localRespawnSeq = 0;
    this.hostConnections.forEach((conn) => {
      try {
        conn.close();
      } catch {
        // ignore
      }
    });
    this.hostConnections.clear();

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
  }

  /**
   * Become the authoritative Host and create a room with a code like BC-HD7P.
   */
  public hostRoom(mapId: MapId, mode: OnlineGameMode, password = '', preferredCode?: string): string {
    this.destroyPeerInstance();
    const roomCode = preferredCode ? normalizeRoomCode(preferredCode) : generatePeerRoomCode();
    this.roomPassword = password.trim();
    const now = Date.now();
    this.setStatus('connecting', 'host', null);

    const hostTeam: TeamId = 'alpha';
    const spawn = getTeamSpawnPosition(hostTeam, 0);

    const initialRoom: AuthoritativeRoomState = {
      code: roomCode,
      name: `اتاق ${this.localPlayerName}`,
      hasPassword: Boolean(this.roomPassword),
      mapId,
      mode,
      hostId: this.localPlayerId,
      hostName: this.localPlayerName,
      wave: 1,
      teamScore: 0,
      alphaScore: 0,
      bravoScore: 0,
      currentRound: 1,
      roundTimeRemainingSec: ROUND_DURATION_SEC,
      roundPhase: 'playing',
      roundWinnerTeam: null,
      matchWinnerTeam: null,
      targetWinRounds: ROUND_MATCH_WIN_SCORE,
      phaseStartedAt: now,
      roundEndsAt: now + ROUND_DURATION_SEC * 1000,
      intermissionEndsAt: undefined,
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
          score: 0,
          color: getTeamColor(hostTeam),
          team: hostTeam,
          alive: true,
          isHost: true,
          peerId: roomCodeToHostPeerId(roomCode),
          respawnSeq: 0,
          lastSeen: now,
        },
      ],
    };

    this.authoritativeRoom = initialRoom;
    this.callbacks.onRoomState(initialRoom);

    // Wall-clock 200ms Host heartbeat ensures round timers and intermission transitions
    // advance reliably via Date.now() even when requestAnimationFrame is throttled or paused.
    this.roundHeartbeatId = window.setInterval(() => {
      this.tickAuthoritativeRoundNow(Date.now());
    }, 200);

    const hostPeerId = roomCodeToHostPeerId(roomCode);

    try {
      const peer = new Peer(hostPeerId, getPeerJsClientOptions());
      this.peer = peer;

      const readyFallbackTimer = window.setTimeout(() => {
        if (this.role === 'host' && this.status === 'connecting') {
          this.setStatus('connected', 'host', null);
        }
      }, 1200);

      peer.on('open', (openedPeerId) => {
        window.clearTimeout(readyFallbackTimer);
        if (this.role !== 'host') return;
        this.callbacks.onPeerReady?.(peer, openedPeerId || hostPeerId);
        this.setStatus('connected', 'host', null);
        this.callbacks.onNotice(`اتاق آنلاین ${roomCode} ساخته شد — شما میزبان (Host) هستید`);
        if (this.authoritativeRoom) {
          this.authoritativeRoom = mergeClientInputIntoHostState(this.authoritativeRoom, {
            id: this.localPlayerId,
            peerId: openedPeerId || hostPeerId,
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
        if (err?.type === 'unavailable-id') {
          const freshCode = generatePeerRoomCode();
          this.hostRoom(mapId, mode, password, freshCode);
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

    this.broadcastFromHost({
      type: 'host:state',
      room: initialRoom,
    });

    return roomCode;
  }

  private setupHostDataConnection(conn: DataConnection) {
    let remotePlayerId = '';

    conn.on('open', () => {
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
      if ('playerId' in pkt && typeof pkt.playerId === 'string') {
        remotePlayerId = pkt.playerId;
        this.hostConnections.set(remotePlayerId, conn);
      }
      this.handleIncomingPacket(pkt, conn);
    });

    const handleDisconnect = () => {
      if (!remotePlayerId || !this.authoritativeRoom) return;
      this.hostConnections.delete(remotePlayerId);
      const { nextRoom, removedPlayer } = removeDisconnectedPlayerFromHostState(
        this.authoritativeRoom,
        remotePlayerId
      );
      this.authoritativeRoom = nextRoom;
      this.callbacks.onRoomState(nextRoom);
      if (removedPlayer) {
        this.callbacks.onNotice(`بازیکن «${removedPlayer.name}» قطع شد و از اتاق خارج گردید`);
      }
      this.broadcastFromHost({
        type: 'host:state',
        room: nextRoom,
        leftPlayerName: removedPlayer?.name,
      });
    };

    conn.on('close', handleDisconnect);
    conn.on('error', handleDisconnect);
  }

  /**
   * Join an existing Host's room by code (e.g. BC-HD7P).
   */
  public joinRoom(rawCode: string, password = ''): void {
    const cleanCode = normalizeRoomCode(rawCode);
    if (!cleanCode) {
      this.setStatus('error', 'client', 'لطفاً کد اتاق (مثلاً BC-HD7P) را وارد کنید.');
      return;
    }

    this.destroyPeerInstance();
    this.roomPassword = password.trim();
    this.setStatus('connecting', 'client', null);

    const clientPeerId = `bodycam-vanguard-client-${this.localPlayerId}-${Math.random().toString(36).slice(2, 6)}`;

    const joinPacket: P2PPacket = {
      type: 'client:join',
      roomCode: cleanCode,
      playerId: this.localPlayerId,
      peerId: clientPeerId,
      name: this.localPlayerName,
      password: this.roomPassword,
      weaponIdx: 0,
      appVersion: APP_VERSION,
    };
    this.bcChannel?.postMessage(joinPacket);

    const hostPeerId = roomCodeToHostPeerId(cleanCode);

    try {
      const peer = new Peer(clientPeerId, getPeerJsClientOptions());
      this.peer = peer;

      this.joinTimeoutId = window.setTimeout(() => {
        if (this.status === 'connecting' && !this.authoritativeRoom) {
          this.setStatus(
            'error',
            'client',
            `پاسخی از اتاق ${cleanCode} دریافت نشد. مطمئن شوید میزبان (Host) آنلاین است و کد را درست وارد کرده‌اید.`
          );
        }
      }, 12000);

      peer.on('open', (openedPeerId) => {
        if (this.role !== 'client') return;
        const resolvedClientPeerId = openedPeerId || clientPeerId;
        this.callbacks.onPeerReady?.(peer, resolvedClientPeerId);
        const conn = peer.connect(hostPeerId, {
          reliable: true,
        });
        this.clientConn = conn;

        conn.on('open', () => {
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
          if (this.role === 'client' && this.authoritativeRoom) {
            this.authoritativeRoom = null;
            this.callbacks.onRoomLeft();
            this.setStatus('error', 'none', 'ارتباط با میزبان (Host) قطع شد. میزبان از بازی خارج شده است.');
            this.callbacks.onNotice('ارتباط با میزبان (Host) قطع شد — بازی در حالت تک‌نفره ادامه دارد');
          }
        };

        conn.on('close', onHostLost);
        conn.on('error', onHostLost);
      });

      peer.on('error', (err: Error & { type?: string }) => {
        if (this.authoritativeRoom) {
          return;
        }
        if (this.joinTimeoutId !== null) {
          window.clearTimeout(this.joinTimeoutId);
          this.joinTimeoutId = null;
        }
        const errType = err?.type || '';
        if (errType === 'peer-unavailable') {
          this.setStatus(
            'error',
            'client',
            `اتاقی با کد ${cleanCode} پیدا نشد (میزبان آنلاین نیست یا کد اشتباه است).`
          );
        } else {
          this.setStatus('error', 'client', `خطا در اتصال به اتاق ${cleanCode}: ${err?.message || 'خطای شبکه'}`);
        }
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در اتصال PeerJS';
      this.setStatus('error', 'client', msg);
    }
  }

  private handleIncomingPacket(pkt: P2PPacket, sourceConn?: DataConnection) {
    // 1. Packets handled by HOST
    if (this.role === 'host' && this.authoritativeRoom) {
      if (
        'roomCode' in pkt &&
        pkt.roomCode &&
        normalizeRoomCode(pkt.roomCode) !== this.authoritativeRoom.code
      ) {
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
        if (this.roomPassword && pkt.password && pkt.password !== this.roomPassword) {
          const errPkt: P2PPacket = {
            type: 'host:error',
            roomCode: this.authoritativeRoom.code,
            targetPlayerId: pkt.playerId,
            message: 'رمز اتاق نادرست است.',
          };
          sourceConn?.send(errPkt);
          this.bcChannel?.postMessage(errPkt);
          return;
        }

        const existingPlayer = this.authoritativeRoom.players.find((p) => p.id === pkt.playerId);
        const isNewPlayer = !existingPlayer;
        const assignedTeam = existingPlayer?.team || assignBalancedTeam(this.authoritativeRoom.players);
        const slotIdx = this.authoritativeRoom.players.filter((p) => p.team === assignedTeam).length;
        const spawn = getTeamSpawnPosition(assignedTeam, slotIdx);

        this.authoritativeRoom = mergeClientInputIntoHostState(this.authoritativeRoom, {
          id: pkt.playerId,
          peerId: pkt.peerId || sourceConn?.peer || existingPlayer?.peerId,
          name: pkt.name,
          weaponIdx: pkt.weaponIdx,
          x: spawn.x,
          y: 0,
          z: spawn.z,
          yaw: spawn.yaw,
          hp: 100,
          team: assignedTeam,
          alive: true,
          respawnSeq: (existingPlayer?.respawnSeq ?? 0) + 1,
        });

        this.callbacks.onRoomState(this.authoritativeRoom);
        if (isNewPlayer) {
          this.callbacks.onNotice(
            `بازیکن «${pkt.name}» به اتاق متصل شد (${getTeamNameFa(assignedTeam)})`
          );
        }

        this.broadcastFromHost({
          type: 'host:state',
          room: this.authoritativeRoom,
          joinedPlayerName: isNewPlayer ? pkt.name : undefined,
        });
        return;
      }

      if (pkt.type === 'client:switch_team') {
        this.applyTeamSwitchOnHost(pkt.playerId, pkt.team);
        return;
      }

      if (pkt.type === 'client:input') {
        const roundMode = isRoundBasedMode(this.authoritativeRoom.mode);
        if (roundMode && typeof pkt.roundNum === 'number' && pkt.roundNum !== this.authoritativeRoom.currentRound) {
          // Drop stale round packets so an old hp=0 or pre-respawn frame never overwrites a newly-respawned player
          return;
        }
        const existing = this.authoritativeRoom.players.find((p) => p.id === pkt.playerId);
        // Reject stale position updates sent before client processed latest Host respawn/round teleport
        const stalePosition =
          (existing && isStaleClientInputForRespawn(pkt.respawnSeq, existing.respawnSeq)) ||
          (roundMode && existing && !existing.alive);

        // In round-based modes, HP and alive are strictly Host-authoritative via hits & round transitions
        const authoritativeHp = roundMode ? (existing?.hp ?? 100) : pkt.hp;
        const authoritativeAlive = roundMode ? (existing?.alive ?? true) : undefined;

        this.authoritativeRoom = mergeClientInputIntoHostState(this.authoritativeRoom, {
          id: pkt.playerId,
          name: pkt.name,
          x: stalePosition ? existing?.x : pkt.x,
          y: stalePosition ? existing?.y : pkt.y,
          z: stalePosition ? existing?.z : pkt.z,
          yaw: stalePosition ? existing?.yaw : pkt.yaw,
          pitch: stalePosition ? existing?.pitch : pkt.pitch,
          weaponIdx: pkt.weaponIdx,
          hp: authoritativeHp,
          alive: authoritativeAlive,
          kills: pkt.kills,
          score: pkt.score,
        });
        this.callbacks.onRoomState(this.authoritativeRoom);
        this.broadcastFromHost({
          type: 'host:state',
          room: this.authoritativeRoom,
        });
        return;
      }

      if (pkt.type === 'client:shoot') {
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
        this.processAuthoritativeHit(pkt.attackerId, pkt.targetId, pkt.damage);
        return;
      }

      if (pkt.type === 'client:leave') {
        this.hostConnections.delete(pkt.playerId);
        const { nextRoom, removedPlayer } = removeDisconnectedPlayerFromHostState(
          this.authoritativeRoom,
          pkt.playerId
        );
        this.authoritativeRoom = nextRoom;
        this.callbacks.onRoomState(nextRoom);
        if (removedPlayer) {
          this.callbacks.onNotice(`بازیکن «${removedPlayer.name}» از اتاق خارج شد`);
        }
        this.broadcastFromHost({
          type: 'host:state',
          room: nextRoom,
          leftPlayerName: removedPlayer?.name,
        });
        return;
      }
    }

    // 2. Packets handled by CLIENT
    if (this.role === 'client') {
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
        const wasConnected = this.status === 'connected';
        const prevMap = this.authoritativeRoom?.mapId;
        const prevRound = this.lastSyncedClientRound;
        const prevPhase = this.lastSyncedClientPhase;
        this.authoritativeRoom = pkt.room;
        if (!wasConnected) {
          this.setStatus('connected', 'client', null);
          this.callbacks.onNotice(`متصل شد — وارد اتاق ${pkt.room.code} به میزبانی «${pkt.room.hostName}» شدید`);
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
        const enteredNewPlayingRound =
          isRoundBasedMode(pkt.room.mode) &&
          pkt.room.roundPhase === 'playing' &&
          ((prevRound > 0 && pkt.room.currentRound !== prevRound) ||
            (prevPhase !== null && prevPhase !== 'playing'));

        if (respawnSeqAdvanced || enteredNewPlayingRound) {
          const myTeam = meInState?.team || 'bravo';
          const teamIdx = Math.max(
            0,
            pkt.room.players.filter((p) => p.team === myTeam).findIndex((p) => p.id === this.localPlayerId)
          );
          const fallbackSpawn = getTeamSpawnPosition(myTeam, teamIdx);
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

        this.callbacks.onRoomState(pkt.room);
        return;
      }

      if (pkt.type === 'host:shoot') {
        if (pkt.playerId !== this.localPlayerId) {
          this.callbacks.onRemoteShoot(pkt.playerId, pkt.weaponIdx, pkt.from, pkt.to);
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
        if (pkt.targetId === this.localPlayerId) {
          if (typeof pkt.respawnSeq === 'number' && pkt.respawnSeq > this.localRespawnSeq) {
            this.localRespawnSeq = pkt.respawnSeq;
          }
          this.callbacks.onLocalPlayerDamaged(pkt.damage, pkt.attackerName, pkt.killed, pkt.respawnPos);
        }
        return;
      }

      if (pkt.type === 'host:round_respawn') {
        if (this.authoritativeRoom && pkt.roomCode === this.authoritativeRoom.code) {
          // Immediately update cached authoritativeRoom with Host's authoritative spawn map so remote players snap cleanly
          if (pkt.spawns) {
            this.authoritativeRoom = {
              ...this.authoritativeRoom,
              currentRound: pkt.currentRound,
              alphaScore: pkt.alphaScore,
              bravoScore: pkt.bravoScore,
              roundPhase: 'playing',
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
                  hp: 100,
                  alive: true,
                  respawnSeq: Math.max(p.respawnSeq ?? 0, sp.respawnSeq),
                };
              }),
            };
          }

          const mySpawnFromPkt = pkt.spawns?.[this.localPlayerId];
          const nextSeq = mySpawnFromPkt?.respawnSeq ?? this.localRespawnSeq + 1;
          const alreadyRespawned =
            this.lastSyncedClientRound === pkt.currentRound &&
            this.lastSyncedClientPhase === 'playing' &&
            this.localRespawnSeq >= nextSeq;

          this.lastSyncedClientRound = pkt.currentRound;
          this.lastSyncedClientPhase = 'playing';
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
            const fallbackSpawn = getTeamSpawnPosition(myTeam, teamIdx);
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

      if (pkt.type === 'host:closed') {
        if (this.authoritativeRoom && pkt.roomCode === this.authoritativeRoom.code) {
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
    const spawn = getTeamSpawnPosition(nextTeam, slotIdx);

    const nextSeq = (target.respawnSeq ?? 0) + 1;
    this.authoritativeRoom = mergeClientInputIntoHostState(this.authoritativeRoom, {
      id: playerId,
      team: nextTeam,
      x: spawn.x,
      y: 0,
      z: spawn.z,
      yaw: spawn.yaw,
      hp: 100,
      alive: true,
      respawnSeq: nextSeq,
    });
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
    const updated: AuthoritativeRoomState = resetAuthoritativeMatch(
      {
        ...this.authoritativeRoom,
        mode,
      },
      Date.now()
    );
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

  private processAuthoritativeHit(attackerId: string, targetId: string, rawDamage: number) {
    if (!this.authoritativeRoom) return;
    if (isRoundBasedMode(this.authoritativeRoom.mode) && this.authoritativeRoom.roundPhase !== 'playing') {
      return;
    }

    const attacker = this.authoritativeRoom.players.find((p) => p.id === attackerId);
    const target = this.authoritativeRoom.players.find((p) => p.id === targetId);
    if (!attacker || !target) return;

    // Enforce Friendly Fire OFF in team & co-op modes
    if (!canDamagePlayer(this.authoritativeRoom.mode, attacker.team, target.team, attacker.id, target.id)) {
      return;
    }

    if (isRoundBasedMode(this.authoritativeRoom.mode) && !target.alive) {
      return;
    }

    const dmg = Math.max(1, Math.min(280, Math.round(rawDamage)));
    const roundMode = isRoundBasedMode(this.authoritativeRoom.mode);
    let nextHp = Math.max(0, target.hp - dmg);
    let killed = false;
    let nextAlive = target.alive;
    let nextKills = attacker.kills;
    let nextScore = attacker.score;

    let respawnPos: { x: number; y: number; z: number; yaw: number } | undefined;
    let nextRespawnSeq: number | undefined;

    if (nextHp <= 0) {
      killed = true;
      nextKills += 1;
      nextScore += 150;
      if (roundMode) {
        nextHp = 0;
        nextAlive = false;
      } else {
        nextHp = 100;
        nextAlive = true;
        const teamSlotIdx = Math.max(
          0,
          this.authoritativeRoom.players
            .filter((p) => p.team === target.team)
            .findIndex((p) => p.id === target.id)
        );
        respawnPos = getTeamSpawnPosition(target.team, teamSlotIdx);
        nextRespawnSeq = (target.respawnSeq ?? 0) + 1;
      }
    }

    this.authoritativeRoom = mergeClientInputIntoHostState(this.authoritativeRoom, {
      id: target.id,
      hp: nextHp,
      alive: nextAlive,
      ...(respawnPos
        ? {
            x: respawnPos.x,
            y: respawnPos.y,
            z: respawnPos.z,
            yaw: respawnPos.yaw,
            pitch: 0,
            respawnSeq: nextRespawnSeq,
          }
        : {}),
    });
    this.authoritativeRoom = mergeClientInputIntoHostState(this.authoritativeRoom, {
      id: attacker.id,
      kills: nextKills,
      score: nextScore,
    });

    const hitPkt: P2PPacket = {
      type: 'host:hit',
      roomCode: this.authoritativeRoom.code,
      attackerId: attacker.id,
      attackerName: attacker.name,
      targetId: target.id,
      targetName: target.name,
      damage: dmg,
      targetHp: nextHp,
      killed,
      respawnPos,
      respawnSeq: nextRespawnSeq,
    };

    if (target.id === this.localPlayerId) {
      if (typeof nextRespawnSeq === 'number') {
        this.localRespawnSeq = nextRespawnSeq;
      }
      this.callbacks.onLocalPlayerDamaged(dmg, attacker.name, killed, respawnPos);
    }

    this.broadcastFromHost(hitPkt);

    // Check if an opposing team was wiped out in round-based mode
    if (roundMode && killed) {
      const targetTeamMembers = this.authoritativeRoom.players.filter((p) => p.team === target.team);
      const anyTargetTeamAlive = targetTeamMembers.some((p) => p.alive && p.hp > 0);
      if (targetTeamMembers.length > 0 && !anyTargetTeamAlive) {
        this.recordTeamRoundWin(
          attacker.team,
          `تمام اعضای ${getTeamNameFa(target.team)} حذف شدند — امتیاز راند برای ${getTeamNameFa(attacker.team)}!`
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
    if (!isRoundBasedMode(this.authoritativeRoom.mode)) return;

    const room = this.authoritativeRoom;

    if (room.roundPhase === 'playing') {
      if (!room.roundEndsAt) {
        room.phaseStartedAt = now;
        room.roundEndsAt = now + Math.max(1, room.roundTimeRemainingSec || ROUND_DURATION_SEC) * 1000;
      }
      const nextSec = Math.max(0, Math.ceil((room.roundEndsAt - now) / 1000));
      room.roundTimeRemainingSec = nextSec;
      if (nextSec <= 0 || now >= room.roundEndsAt) {
        const alphaAlive = room.players.filter((p) => p.team === 'alpha' && p.alive).length;
        const bravoAlive = room.players.filter((p) => p.team === 'bravo' && p.alive).length;
        const winner: TeamId = alphaAlive >= bravoAlive ? 'alpha' : 'bravo';
        this.recordTeamRoundWin(
          winner,
          `پایان زمان راند ${room.currentRound}! امتیاز به ${getTeamNameFa(winner)} رسید`
        );
        return;
      }
      if (this.lastBroadcastSecond !== nextSec) {
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
      const endsAt = room.intermissionEndsAt ?? (startedAt + ROUND_INTERMISSION_SEC * 1000);
      // Watchdog guard: never allow intermission to stall longer than 4.5s
      const hardCapAt = startedAt + 4500;
      if (now >= endsAt || now >= hardCapAt) {
        this.authoritativeRoom = startNextAuthoritativeRound(room, now);
        this.lastBroadcastSecond = -1;
        const msg = `شروع راند ${this.authoritativeRoom.currentRound} — همه بازیکنان ری‌اسپاون شدند! (${this.authoritativeRoom.alphaScore} - ${this.authoritativeRoom.bravoScore})`;
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
        }
        const me = this.authoritativeRoom.players.find((p) => p.id === this.localPlayerId);
        const myTeam = me?.team || 'alpha';
        const spawn = me ? { x: me.x, z: me.z, yaw: me.yaw } : getTeamSpawnPosition(myTeam, 0);
        if (me?.respawnSeq) {
          this.localRespawnSeq = me.respawnSeq;
        }

        // Send authoritative host:state FIRST so every client already has fresh team spawn coordinates
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
          spawns: spawnsMap,
        });
        this.callbacks.onRoomState(this.authoritativeRoom);
        this.callbacks.onRoundRespawn?.(this.authoritativeRoom.currentRound, myTeam, spawn, msg);
        this.callbacks.onNotice(msg);
      }
      return;
    }

    if (room.roundPhase === 'match_over') {
      const startedAt = room.phaseStartedAt ?? now;
      const endsAt = room.intermissionEndsAt ?? (startedAt + 6000);
      const hardCapAt = startedAt + 7500;
      if (now >= endsAt || now >= hardCapAt) {
        this.authoritativeRoom = resetAuthoritativeMatch(room, now);
        this.lastBroadcastSecond = -1;
        const msg = `شروع مسابقه جدید تا ${ROUND_MATCH_WIN_SCORE} راند — راند ۱ آغاز شد!`;
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
        }
        const me = this.authoritativeRoom.players.find((p) => p.id === this.localPlayerId);
        const myTeam = me?.team || 'alpha';
        const spawn = me ? { x: me.x, z: me.z, yaw: me.yaw } : getTeamSpawnPosition(myTeam, 0);
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
          currentRound: 1,
          alphaScore: 0,
          bravoScore: 0,
          messageFa: msg,
          spawns: spawnsMap,
        });
        this.callbacks.onRoomState(this.authoritativeRoom);
        this.callbacks.onRoundRespawn?.(1, myTeam, spawn, msg);
        this.callbacks.onNotice(msg);
      }
    }
  }

  /**
   * Called from the Host's main loop (`animate`). Delegates strictly to Date.now()-based clock.
   */
  public tickAuthoritativeRound(_dtSec: number): void {
    this.tickAuthoritativeRoundNow(Date.now());
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
   * Called at ~12-15Hz from the game loop to sync local player state.
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
  }): void {
    if (!this.authoritativeRoom) return;
    const roundMode = isRoundBasedMode(this.authoritativeRoom.mode);

    if (this.role === 'host') {
      this.authoritativeRoom.wave = state.wave;
      const existingHost = this.authoritativeRoom.players.find((p) => p.id === this.localPlayerId);
      this.authoritativeRoom = mergeClientInputIntoHostState(this.authoritativeRoom, {
        id: this.localPlayerId,
        name: this.localPlayerName,
        x: state.x,
        y: state.y,
        z: state.z,
        yaw: state.yaw,
        pitch: state.pitch,
        weaponIdx: state.weaponIdx,
        hp: roundMode ? (existingHost?.hp ?? 100) : state.hp,
        alive: roundMode ? (existingHost?.alive ?? true) : undefined,
        kills: state.kills,
        score: state.score,
      });
      this.broadcastFromHost({
        type: 'host:state',
        room: this.authoritativeRoom,
      });
      this.callbacks.onRoomState(this.authoritativeRoom);
    } else if (this.role === 'client') {
      this.sendToHost({
        type: 'client:input',
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
      });
    }
  }

  public sendShoot(weaponIdx: number, from: Vector3Like, to: Vector3Like): void {
    if (!this.authoritativeRoom) return;
    if (this.role === 'host') {
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

  public sendPlayerHit(targetId: string, damage: number, isHeadshot: boolean): void {
    if (!this.authoritativeRoom) return;
    if (this.role === 'host') {
      this.processAuthoritativeHit(this.localPlayerId, targetId, damage);
    } else if (this.role === 'client') {
      this.sendToHost({
        type: 'client:hit',
        roomCode: this.authoritativeRoom.code,
        attackerId: this.localPlayerId,
        targetId,
        damage,
        isHeadshot,
      });
    }
  }

  public notifyHostMapChange(mapId: MapId): void {
    if (this.role !== 'host' || !this.authoritativeRoom) return;
    this.authoritativeRoom = {
      ...this.authoritativeRoom,
      mapId,
    };
    this.broadcastFromHost({
      type: 'host:map',
      roomCode: this.authoritativeRoom.code,
      mapId,
    });
    this.broadcastFromHost({
      type: 'host:state',
      room: this.authoritativeRoom,
    });
    this.callbacks.onRoomState(this.authoritativeRoom);
  }

  public leaveRoom(): void {
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
