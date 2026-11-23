import React, { useState, useEffect, useMemo } from 'react';
import {
  MAP_LIST,
  MapId,
  OnlineGameMode,
  TeamId,
  RoundPhase,
  normalizeRoomCode,
  parseRoomInviteFromUrl,
  PeerConnectionStatus,
  PeerRole,
  formatConnectionStatusFa,
  buildRoomInviteUrl,
  getCurrentOriginShareBaseUrl,
  isRoundBasedMode,
  getTeamColor,
  getTeamNameFa,
  formatGameModeFa,
  ROUND_MATCH_WIN_SCORE,
  ROUND_DURATION_SEC,
  ALLOWED_ROUND_DURATIONS,
  ALLOWED_WIN_TARGETS,
  ALLOWED_STARTING_HP,
  HostMatchSettings,
  ONLINE_BOT_DIFFICULTIES,
  OnlineBotDifficulty,
  formatOnlineBotDifficultyFa,
  areAllLobbyPlayersReady,
  classifyPingQuality,
} from '../game/rules';
import { PEERJS_BROKER_CONFIG, PEERJS_STUN_SERVERS } from '../game/peerConfig';
import {
  ConnectionDiagnosticsReport,
  ConnectionTransportType,
  LivePeerTelemetry,
  runConnectionDiagnostics,
} from '../game/peerDiagnostics';
import { renderQrSvgPath } from '../game/qrSvg';
import type { VoiceChatSnapshot } from '../game/voiceChat';
import { OnlineSyncedCosmetics, getCosmeticItem } from '../game/cosmetics';
import { getLobbyMythicHolderNames } from '../game/mythicPerks';
import { APP_VERSION } from '../game/version';

export interface OnlinePlayerSummary {
  id: string;
  name: string;
  kills: number;
  deaths?: number;
  shotsFired?: number;
  shotsHit?: number;
  headshots?: number;
  isSliding?: boolean;
  score?: number;
  hp: number;
  color: string;
  team?: TeamId;
  alive?: boolean;
  isHost?: boolean;
  spawnProtected?: boolean;
  disconnected?: boolean;
  reconnectDeadlineAt?: number;
  isBot?: boolean;
  botDifficulty?: OnlineBotDifficulty;
  lobbyReady?: boolean;
  pingMs?: number | null;
  cosmetics?: OnlineSyncedCosmetics;
}

export interface OnlineRoomSummary {
  code: string;
  name: string;
  hasPassword?: boolean;
  isLocked?: boolean;
  mapId: MapId;
  mode: OnlineGameMode;
  hostId: string;
  hostName?: string;
  wave?: number;
  teamScore?: number;
  alphaScore?: number;
  bravoScore?: number;
  currentRound?: number;
  roundDurationSec?: number;
  roundTimeRemainingSec?: number;
  roundPhase?: RoundPhase;
  countdownRemainingSec?: number;
  roundWinnerTeam?: TeamId | 'draw' | null;
  matchWinnerTeam?: TeamId | null;
  targetWinRounds?: number;
  startingHp?: number;
  friendlyFire?: boolean;
  fillBotsEnabled?: boolean;
  botDifficulty?: OnlineBotDifficulty;
  rematchReadyPlayerIds?: string[];
  mapVotes?: Record<string, MapId>;
  aimAssistAllowed?: boolean;
  slideAllowed?: boolean;
  mythicPerksAllowed?: boolean;
  appVersion?: string;
  playerCount: number;
  players: OnlinePlayerSummary[];
}

export interface OnlineTransportSummary {
  transportType: ConnectionTransportType;
  relayFallbackActive: boolean;
  brokerHost: string;
  hasTurn: boolean;
}

interface OnlineModalProps {
  connected: boolean;
  peerStatus: PeerConnectionStatus;
  peerRole: PeerRole;
  playerName: string;
  onChangePlayerName: (name: string) => void;
  currentRoom: OnlineRoomSummary | null;
  publicRooms: OnlineRoomSummary[];
  selectedMap: MapId;
  roomError: string | null;
  pendingInviteRoomCode?: string | null;
  pingMs?: number | null;
  transportInfo?: OnlineTransportSummary;
  onClearPendingInvite?: () => void;
  onSelectMap: (mapId: MapId) => void;
  onVoteMap?: (mapId: MapId) => void;
  onCreateRoom: (mapId: MapId, mode: OnlineGameMode, password: string) => void;
  onChangeGameMode?: (mode: OnlineGameMode) => void;
  onUpdateRoomRules?: (rules: {
    aimAssistAllowed?: boolean;
    slideAllowed?: boolean;
    mythicPerksAllowed?: boolean;
  }) => void;
  onUpdateMatchSettings?: (settings: Partial<HostMatchSettings>) => void;
  onSwitchTeam?: (playerId?: string) => void;
  onJoinRoom: (roomCode: string, password: string) => void;
  onRetryConnect?: () => void;
  onToggleLobbyReady?: (ready: boolean) => void;
  onToggleRoomLock?: (locked: boolean) => void;
  onUpdateRoomPassword?: (password: string) => void;
  onLeaveRoom: () => void;
  onStartOnlineMatch: () => void;
  onGetDiagnosticsTelemetry?: () => Promise<LivePeerTelemetry>;
  voiceState?: VoiceChatSnapshot;
  localPlayerId?: string;
  onToggleMutePlayer?: (playerId: string) => void;
  onClose: () => void;
}

type HomeSubView = 'menu' | 'create' | 'join';

function extractCodeFromClipboardText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    if (trimmed.includes('#') || trimmed.includes('?') || /^https?:\/\//i.test(trimmed)) {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://example.invalid/${trimmed.replace(/^\/+/, '')}`);
      const parsed = parseRoomInviteFromUrl(url.search, url.hash);
      if (parsed.roomCode) return parsed.roomCode;
    }
  } catch {
    // fall through to plain code parsing
  }
  const hashMatch = /room=([A-Za-z0-9\-۰-۹]+)/i.exec(trimmed);
  if (hashMatch?.[1]) {
    return normalizeRoomCode(hashMatch[1]);
  }
  return normalizeRoomCode(trimmed);
}

export const OnlineModal: React.FC<OnlineModalProps> = ({
  peerStatus,
  peerRole,
  playerName,
  onChangePlayerName,
  currentRoom,
  publicRooms,
  selectedMap,
  roomError,
  pendingInviteRoomCode,
  pingMs = null,
  transportInfo,
  onClearPendingInvite,
  onSelectMap,
  onVoteMap,
  onCreateRoom,
  onChangeGameMode,
  onUpdateRoomRules,
  onUpdateMatchSettings,
  onSwitchTeam,
  onJoinRoom,
  onRetryConnect,
  onToggleLobbyReady,
  onToggleRoomLock,
  onUpdateRoomPassword,
  onLeaveRoom,
  onStartOnlineMatch,
  onGetDiagnosticsTelemetry,
  voiceState,
  localPlayerId,
  onToggleMutePlayer,
  onClose,
}) => {
  const [homeView, setHomeView] = useState<HomeSubView>(pendingInviteRoomCode ? 'join' : 'menu');
  const [joinCodeInput, setJoinCodeInput] = useState(pendingInviteRoomCode || '');
  const [roomPasswordInput, setRoomPasswordInput] = useState('');
  const [showInvitePassword, setShowInvitePassword] = useState(false);
  const [hostPasswordEdit, setHostPasswordEdit] = useState('');
  const [hostPasswordSaved, setHostPasswordSaved] = useState(false);
  const [onlineMode, setOnlineMode] = useState<OnlineGameMode>(currentRoom?.mode || 'tdm_1v1');
  const [copiedFeedback, setCopiedFeedback] = useState<'code' | 'link' | 'share' | 'paste' | null>(null);
  const [showQrCode, setShowQrCode] = useState(false);
  const [hostSettingsOpen, setHostSettingsOpen] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagReport, setDiagReport] = useState<ConnectionDiagnosticsReport | null>(null);
  const [lastActionType, setLastActionType] = useState<'create' | 'join' | null>(null);
  const [localValidationError, setLocalValidationError] = useState<string | null>(null);

  const handleRunDiagnostics = async () => {
    setDiagRunning(true);
    try {
      const telemetry = onGetDiagnosticsTelemetry ? await onGetDiagnosticsTelemetry() : null;
      const report = await runConnectionDiagnostics(telemetry, roomError);
      setDiagReport(report);
    } finally {
      setDiagRunning(false);
    }
  };

  useEffect(() => {
    if (showDiagnostics && !diagReport && !diagRunning) {
      void handleRunDiagnostics();
    }
  }, [showDiagnostics]);

  useEffect(() => {
    if (pendingInviteRoomCode) {
      setJoinCodeInput(pendingInviteRoomCode);
      setHomeView('join');
      setShowDiagnostics(false);
      setLocalValidationError(null);
    }
  }, [pendingInviteRoomCode]);

  useEffect(() => {
    if (currentRoom?.mode) {
      setOnlineMode(currentRoom.mode);
    }
  }, [currentRoom?.mode]);

  useEffect(() => {
    if (!currentRoom) {
      setShowQrCode(false);
    }
  }, [currentRoom]);

  const statusInfo = formatConnectionStatusFa(peerStatus, peerRole, roomError);
  const isConnecting = peerStatus === 'connecting';
  const isRelayMode =
    Boolean(transportInfo?.relayFallbackActive) || transportInfo?.transportType === 'relay_turn';

  const compactStatusBadge = isConnecting
    ? { label: isRelayMode ? 'تلاش با رله...' : 'در حال اتصال...', color: '#f59e0b', pulse: true }
    : peerStatus === 'connected'
      ? isRelayMode
        ? { label: 'رله', color: '#f59e0b', pulse: false }
        : { label: 'متصل', color: '#10b981', pulse: false }
      : peerStatus === 'error'
        ? { label: 'خطا', color: '#f43f5e', pulse: false }
        : { label: 'آماده', color: '#64748b', pulse: false };

  const transportShortFa = isRelayMode
    ? 'رله (TURN)'
    : transportInfo?.transportType === 'direct_p2p' || peerStatus === 'connected'
      ? 'مستقیم (P2P)'
      : 'در حال بررسی';

  const standaloneBaseUrl = getCurrentOriginShareBaseUrl(window.location.origin, window.location.pathname);
  const shareUrl = currentRoom ? buildRoomInviteUrl(standaloneBaseUrl, currentRoom.code) : '';

  const qrSvgData = useMemo(() => {
    if (!showQrCode || !shareUrl) return null;
    try {
      return renderQrSvgPath(shareUrl, 2);
    } catch {
      return null;
    }
  }, [showQrCode, shareUrl]);

  const flashFeedback = (kind: 'code' | 'link' | 'share' | 'paste') => {
    setCopiedFeedback(kind);
    window.setTimeout(() => {
      setCopiedFeedback((prev) => (prev === kind ? null : prev));
    }, 1800);
  };

  const copyText = (text: string, type: 'code' | 'link') => {
    navigator.clipboard?.writeText(text).catch(() => {});
    flashFeedback(type);
  };

  const handleNativeShare = async () => {
    if (!currentRoom || !shareUrl) return;
    const shareData = {
      title: `دعوت به اتاق ${currentRoom.code} — BODYCAM`,
      text: `بیا توی اتاق آنلاین بازی! کد اتاق: ${currentRoom.code}`,
      url: shareUrl,
    };
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
        flashFeedback('share');
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
      }
    }
    navigator.clipboard?.writeText(`${shareData.text}\n${shareUrl}`).catch(() => {});
    flashFeedback('share');
  };

  const handlePasteCode = async () => {
    setLocalValidationError(null);
    try {
      if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
        const text = await navigator.clipboard.readText();
        const extracted = extractCodeFromClipboardText(text);
        if (extracted) {
          setJoinCodeInput(extracted);
          flashFeedback('paste');
          return;
        }
      }
    } catch {
      // Clipboard read permission denied or unsupported
    }
    setLocalValidationError('دسترسی به حافظه کپی مجاز نیست؛ کد را دستی وارد کنید.');
  };

  const handleCreateClick = () => {
    setLocalValidationError(null);
    const trimmedName = playerName.trim();
    if (!trimmedName) {
      setLocalValidationError('لطفاً ابتدا نام نمایشی خود را وارد کنید.');
      return;
    }
    setLastActionType('create');
    onCreateRoom(selectedMap, onlineMode, roomPasswordInput.trim());
  };

  const handleJoinClick = () => {
    setLocalValidationError(null);
    const trimmedName = playerName.trim();
    if (!trimmedName) {
      setLocalValidationError('لطفاً ابتدا نام نمایشی خود را وارد کنید.');
      return;
    }
    const cleanCode = extractCodeFromClipboardText(joinCodeInput);
    if (!cleanCode) {
      setLocalValidationError('لطفاً کد اتاق را وارد کنید.');
      return;
    }
    setJoinCodeInput(cleanCode);
    setLastActionType('join');
    onJoinRoom(cleanCode, roomPasswordInput.trim());
  };

  const handleRetryAction = () => {
    setLocalValidationError(null);
    if (lastActionType === 'create' && !pendingInviteRoomCode) {
      onCreateRoom(selectedMap, onlineMode, roomPasswordInput.trim());
      return;
    }
    if (onRetryConnect && (joinCodeInput.trim() || pendingInviteRoomCode)) {
      const codeToJoin = extractCodeFromClipboardText(joinCodeInput || pendingInviteRoomCode || '');
      if (codeToJoin) {
        onJoinRoom(codeToJoin, roomPasswordInput.trim());
        return;
      }
      onRetryConnect();
    } else if (joinCodeInput.trim()) {
      handleJoinClick();
    }
  };

  const handleModeSelectChange = (nextMode: OnlineGameMode) => {
    setOnlineMode(nextMode);
    if (currentRoom && peerRole === 'host') {
      onChangeGameMode?.(nextMode);
    }
  };

  const activeMode = currentRoom?.mode || onlineMode;
  const roundModeActive = isRoundBasedMode(activeMode);
  const isDirectInviteMode = Boolean(pendingInviteRoomCode && !currentRoom);

  const localPlayerInRoom = currentRoom?.players.find((p) => p.id === localPlayerId) || null;
  const localIsReady = Boolean(localPlayerInRoom?.lobbyReady);
  const readySummary = areAllLobbyPlayersReady(currentRoom);

  const activeMapObj = MAP_LIST.find((m) => m.id === (currentRoom?.mapId || selectedMap)) || MAP_LIST[0];
  const displayError = localValidationError || roomError;
  const localPingDisplay =
    peerRole === 'host'
      ? '0ms'
      : typeof pingMs === 'number' && Number.isFinite(pingMs)
        ? `${Math.round(pingMs)}ms`
        : '—';
  const localPingQuality =
    peerRole === 'host'
      ? classifyPingQuality(0)
      : typeof pingMs === 'number' && Number.isFinite(pingMs)
        ? classifyPingQuality(pingMs)
        : { color: '#64748b', tier: 'good' as const, labelFa: '—' };

  return (
    <div
      id="online-screen"
      className="overlay-screen"
      role="dialog"
      aria-modal="true"
      aria-label="بخش آنلاین"
    >
      <div className="panel-card online-modal-card" dir="rtl">
        {/* Clean Minimal Header */}
        <div className="online-header">
          <div className="online-header-title">
            <div className="online-title-row">
              <h2 className="online-heading">بازی آنلاین</h2>
              <span
                className="online-status-chip"
                data-testid="online-connection-status"
                title={statusInfo.labelFa}
              >
                <span
                  className={`online-status-dot ${compactStatusBadge.pulse ? 'is-pulsing' : ''}`}
                  style={{ background: compactStatusBadge.color }}
                />
                <span>{compactStatusBadge.label}</span>
              </span>
            </div>
          </div>

          <div className="online-header-actions">
            <button
              type="button"
              data-testid="btn-open-diagnostics"
              className={`online-header-btn ${showDiagnostics ? 'is-active' : ''}`}
              onClick={() => setShowDiagnostics((prev) => !prev)}
            >
              {showDiagnostics ? 'بازگشت' : 'تشخیص اتصال'}
            </button>
            <button
              type="button"
              data-testid="btn-close-online-modal"
              className="online-header-btn"
              onClick={onClose}
              aria-label="بستن پنجره آنلاین"
            >
              بستن
            </button>
          </div>
        </div>

        {/* =====================================================
            VIEW 1: CONNECTION DIAGNOSTICS
            ===================================================== */}
        {showDiagnostics ? (
          <div data-testid="connection-diagnostics-panel" className="online-diag-wrap">
            <div className="online-diag-topbar">
              <div>
                <div className="online-section-heading">تشخیص اتصال شبکه و VPN</div>
                <div className="online-muted-sub">
                  بررسی سرور سیگنالینگ، رله TURN (UDP/TCP/TLS 443)، ICE و چت صوتی
                </div>
              </div>
              <button
                type="button"
                data-testid="btn-run-diagnostics"
                className="online-chip-btn is-accent"
                disabled={diagRunning}
                onClick={() => void handleRunDiagnostics()}
              >
                {diagRunning ? 'در حال تست...' : 'تست مجدد'}
              </button>
            </div>

            {diagRunning && !diagReport ? (
              <div className="online-loading-box">
                <span className="online-spinner" aria-hidden="true" />
                <span>در حال بررسی سرور واسطه و کاندیداهای شبکه...</span>
              </div>
            ) : diagReport ? (
              <div className="online-diag-list">
                {/* 1. PeerJS Broker */}
                <div
                  data-testid="diag-broker-row"
                  className={`online-diag-row ${
                    diagReport.brokerReachability === 'reachable' ? 'is-ok' : 'is-err'
                  }`}
                >
                  <div>
                    <div className="online-diag-label">۱. سرور واسطه (PeerJS)</div>
                    <div className="online-diag-meta" dir="ltr">
                      {diagReport.brokerHost}:{diagReport.brokerPort} (
                      {diagReport.brokerSecure ? 'WSS' : 'WS'}) · {diagReport.availableBrokersCount} سرور در لیست
                    </div>
                  </div>
                  <div
                    className={`online-diag-val ${
                      diagReport.brokerReachability === 'reachable' ? 'ok' : 'err'
                    }`}
                  >
                    {diagReport.brokerDetailFa}
                  </div>
                </div>

                {/* 2. Cloudflare TURN Worker (VPN Relay) */}
                <div
                  data-testid="diag-turn-row"
                  className={`online-diag-row ${
                    diagReport.turnWorkerStatus === 'ok' ? 'is-ok' : 'is-warn'
                  }`}
                >
                  <div>
                    <div className="online-diag-label">۲. سرور رله TURN (عبور از VPN)</div>
                    <div className="online-diag-meta">
                      پشتیبانی UDP / TCP / TLS 443 · جایگزینی خودکار پس از ۱۵ ثانیه
                    </div>
                  </div>
                  <div
                    className={`online-diag-val ${
                      diagReport.turnWorkerStatus === 'ok' ? 'ok' : 'warn'
                    }`}
                  >
                    {diagReport.turnDetailFa}
                  </div>
                </div>

                {/* 3. ICE & Candidates */}
                <div data-testid="diag-ice-row" className="online-diag-row">
                  <div>
                    <div className="online-diag-label">۳. وضعیت ICE و کاندیداها</div>
                    <div className="online-diag-meta">
                      STUN: <b>{diagReport.stunCandidatesCount}</b> · محلی:{' '}
                      <b>{diagReport.hostCandidatesCount}</b> · رله:{' '}
                      <b>{diagReport.relayCandidatesCount}</b>
                    </div>
                  </div>
                  <div className="online-diag-meta mono" dir="ltr">
                    {diagReport.iceState} / {diagReport.iceGatheringState}
                  </div>
                </div>

                {/* 4. Connection Type (Direct vs Relay) */}
                <div
                  data-testid="diag-type-row"
                  className={`online-diag-row ${
                    diagReport.connectionType === 'direct_p2p'
                      ? 'is-ok'
                      : diagReport.connectionType === 'relay_turn'
                        ? 'is-warn'
                        : 'is-err'
                  }`}
                >
                  <div>
                    <div className="online-diag-label">۴. نوع اتصال فعال</div>
                    {diagReport.relayFallbackActive && (
                      <div className="online-diag-meta">حالت رله خودکار (VPN Fallback) فعال است</div>
                    )}
                  </div>
                  <div
                    className={`online-diag-val ${
                      diagReport.connectionType === 'direct_p2p'
                        ? 'ok'
                        : diagReport.connectionType === 'relay_turn' ||
                            diagReport.connectionType === 'local_only'
                          ? 'warn'
                          : 'err'
                    }`}
                  >
                    {diagReport.connectionTypeLabelFa}
                  </div>
                </div>

                {/* 5. Voice Chat */}
                {voiceState && (
                  <div
                    data-testid="diag-voice-row"
                    className={`online-diag-row ${
                      voiceState.lastErrorFa || !voiceState.secureContextOk
                        ? 'is-err'
                        : voiceState.micEnabled || voiceState.connectedCallCount > 0
                          ? 'is-ok'
                          : ''
                    }`}
                  >
                    <div>
                      <div className="online-diag-label">۵. چت صوتی (WebRTC)</div>
                      <div className="online-diag-meta">
                        HTTPS: {voiceState.secureContextOk ? 'امن' : 'غیرامن'} · تماس برقرار:{' '}
                        {voiceState.connectedCallCount} نفر
                      </div>
                      {voiceState.lastErrorFa && (
                        <div data-testid="diag-voice-error" className="online-diag-err-note">
                          {voiceState.lastErrorFa}
                        </div>
                      )}
                    </div>
                    <div data-testid="diag-voice-status-badge" className="online-diag-val">
                      {!voiceState.secureContextOk
                        ? 'فقط روی HTTPS'
                        : voiceState.micStatus === 'active'
                          ? 'میکروفون روشن'
                          : voiceState.micStatus === 'ptt_ready'
                            ? 'آماده (PTT)'
                            : voiceState.micStatus === 'error'
                              ? 'خطای میکروفون'
                              : 'خاموش'}
                    </div>
                  </div>
                )}

                {/* Failure Reason or Healthy Notice */}
                {diagReport.failureReasonFa ? (
                  <div data-testid="diag-failure-reason" className="online-diag-alert is-err">
                    {diagReport.failureReasonFa}
                  </div>
                ) : (
                  <div data-testid="diag-healthy-notice" className="online-diag-alert is-ok">
                    شبکه شما برای بازی آنلاین آماده است (بررسی در {diagReport.checkedAt}).
                  </div>
                )}

                <div className="online-diag-foot">
                  نسخه {APP_VERSION} · {PEERJS_STUN_SERVERS.length} سرور STUN فعال
                </div>
              </div>
            ) : null}

            <button
              type="button"
              data-testid="btn-diagnostics-back"
              className="online-primary-btn"
              onClick={() => setShowDiagnostics(false)}
            >
              بازگشت به آنلاین
            </button>
          </div>
        ) : (
          <>
            {/* Clear Persian Error Banner with Retry + Diagnostics */}
            {displayError && (
              <div data-testid="online-room-error" className="online-error-banner" role="alert">
                <div className="online-error-text">{displayError}</div>
                <div className="online-error-actions">
                  <button
                    type="button"
                    data-testid="btn-retry-online-connect"
                    className="online-chip-btn is-accent"
                    disabled={isConnecting}
                    onClick={handleRetryAction}
                  >
                    تلاش دوباره
                  </button>
                  <button
                    type="button"
                    data-testid="btn-error-open-diagnostics"
                    className="online-chip-btn"
                    onClick={() => setShowDiagnostics(true)}
                  >
                    تشخیص اتصال
                  </button>
                </div>
              </div>
            )}

            {/* =====================================================
                VIEW 2: ACTIVE LOBBY (IN ROOM)
                ===================================================== */}
            {currentRoom ? (
              <div data-testid="active-online-room-box" className="online-lobby-wrap">
                {/* Top Room Code & Share Card */}
                <div className="online-code-banner">
                  <div className="online-code-top">
                    <div>
                      <div className="online-code-label">
                        {peerRole === 'host' ? 'کد اتاق شما' : `اتاق ${currentRoom.hostName || 'میزبان'}`}
                        {currentRoom.isLocked && (
                          <span className="online-mini-tag is-warn">قفل‌شده</span>
                        )}
                        {currentRoom.hasPassword && (
                          <span className="online-mini-tag">رمزدار</span>
                        )}
                      </div>
                      <div className="online-code-value" data-testid="online-room-code-display" dir="ltr">
                        <span data-testid="online-room-code">{currentRoom.code}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      data-testid="btn-leave-online-room"
                      className="online-chip-btn is-danger"
                      onClick={onLeaveRoom}
                    >
                      خروج
                    </button>
                  </div>

                  {/* 4 Touch-Friendly Share Actions */}
                  <div className="online-share-grid">
                    <button
                      type="button"
                      data-testid="btn-copy-invite-link"
                      className="online-share-btn is-primary"
                      onClick={() => copyText(shareUrl, 'link')}
                    >
                      {copiedFeedback === 'link' ? 'لینک کپی شد' : 'کپی لینک'}
                    </button>
                    <button
                      type="button"
                      data-testid="btn-share-room-link"
                      className="online-share-btn"
                      onClick={() => void handleNativeShare()}
                    >
                      {copiedFeedback === 'share' ? 'ارسال شد' : 'اشتراک‌گذاری'}
                    </button>
                    <button
                      type="button"
                      data-testid="btn-copy-room-code"
                      className="online-share-btn"
                      onClick={() => copyText(currentRoom.code, 'code')}
                    >
                      {copiedFeedback === 'code' ? 'کد کپی شد' : 'کپی کد'}
                    </button>
                    <button
                      type="button"
                      data-testid="btn-toggle-qr-code"
                      className={`online-share-btn ${showQrCode ? 'is-active' : ''}`}
                      aria-expanded={showQrCode}
                      onClick={() => setShowQrCode((prev) => !prev)}
                    >
                      QR کد
                    </button>
                  </div>

                  {/* Local Zero-Dependency SVG QR Code Drawer */}
                  {showQrCode && qrSvgData && (
                    <div data-testid="qr-code-panel" className="online-qr-card">
                      <div className="online-qr-frame">
                        <svg
                          viewBox={qrSvgData.viewBox}
                          width={168}
                          height={168}
                          shapeRendering="crispEdges"
                          role="img"
                          aria-label={`کد QR دعوت اتاق ${currentRoom.code}`}
                        >
                          <rect width={qrSvgData.size} height={qrSvgData.size} fill="#ffffff" />
                          <path d={qrSvgData.pathD} fill="#090d16" />
                        </svg>
                      </div>
                      <div className="online-qr-caption">
                        برای ورود مستقیم با گوشی، کد را اسکن کنید
                      </div>
                      <div className="online-qr-url" dir="ltr">
                        {shareUrl}
                      </div>
                    </div>
                  )}
                </div>

                {/* Compact Live Connection Quality Strip (Ping + Direct/Relay) */}
                <div data-testid="lobby-connection-quality" className="online-quality-bar">
                  <div className="online-quality-item">
                    <span
                      className="online-status-dot"
                      style={{ background: localPingQuality.color }}
                    />
                    <span className="online-quality-k">پینگ:</span>
                    <strong className="online-quality-v mono" dir="ltr">
                      {localPingDisplay}
                    </strong>
                  </div>
                  <div className="online-quality-sep" />
                  <div className="online-quality-item">
                    <span className="online-quality-k">اتصال:</span>
                    <strong
                      className="online-quality-v"
                      style={{ color: isRelayMode ? '#fbbf24' : '#7dd3fc' }}
                    >
                      {transportShortFa}
                    </strong>
                  </div>
                  <div className="online-quality-sep" />
                  <div className="online-quality-item">
                    <span className="online-quality-k" data-testid="online-peer-role">
                      {peerRole === 'host' ? 'میزبان' : 'مهمان'}
                    </span>
                  </div>
                </div>

                {/* Round Score Bar (1v1 / 2v2) */}
                {roundModeActive && (
                  <div data-testid="lobby-round-summary" className="online-round-strip">
                    <span style={{ color: '#38bdf8' }}>آلفا {currentRoom.alphaScore ?? 0}</span>
                    <span className="online-muted-sub">
                      راند {currentRoom.currentRound ?? 1} · هدف {currentRoom.targetWinRounds ?? ROUND_MATCH_WIN_SCORE} ·{' '}
                      {activeMapObj.nameFa}
                    </span>
                    <span style={{ color: '#f43f5e' }}>براوو {currentRoom.bravoScore ?? 0}</span>
                  </div>
                )}

                {/* Players Roster (Team, Name, Ping, Speaking, Mute, Ready) */}
                <div className="online-roster-section">
                  <div className="online-roster-head">
                    <div className="online-section-heading">
                      بازیکنان ({currentRoom.players.length}) ·{' '}
                      <span className="online-ready-count">
                        {readySummary.readyCount}/{readySummary.totalCount} آماده
                      </span>
                    </div>
                    <button
                      type="button"
                      data-testid="btn-switch-team"
                      className="online-chip-btn"
                      onClick={() => onSwitchTeam?.()}
                    >
                      تغییر تیم
                    </button>
                  </div>

                  <div data-testid="online-players-list" className="online-players-list">
                    {currentRoom.players.map((p) => {
                      const pTeam: TeamId = p.team || 'alpha';
                      const teamColor = getTeamColor(pTeam);
                      const isMe = p.id === localPlayerId;
                      const isSpeaking = Boolean(voiceState?.speakingPlayerIds.includes(p.id));
                      const isMuted = Boolean(voiceState?.mutedPlayerIds.includes(p.id));
                      const playerReady = p.isBot ? true : Boolean(p.lobbyReady);
                      const pPingText = p.isBot
                        ? 'بات'
                        : p.isHost
                          ? '0ms'
                          : typeof p.pingMs === 'number'
                            ? `${Math.round(p.pingMs)}ms`
                            : isMe
                              ? localPingDisplay
                              : '—';

                      return (
                        <div
                          key={p.id}
                          className={`online-player-row ${p.disconnected ? 'is-disconnected' : ''}`}
                          style={{ borderRightColor: teamColor }}
                        >
                          <div className="online-player-main">
                            <span
                              className="online-team-tag"
                              style={{ color: teamColor, borderColor: `${teamColor}44` }}
                            >
                              {getTeamNameFa(pTeam)}
                            </span>
                            {(() => {
                              const frameItem = getCosmeticItem(p.cosmetics?.nf);
                              const badgeItem = getCosmeticItem(p.cosmetics?.nb);
                              return (
                                <span
                                  className={`online-player-name${frameItem ? ' has-cosmetic-frame' : ''}`}
                                  style={
                                    frameItem
                                      ? {
                                          borderColor: frameItem.colorHex,
                                          background: frameItem.accentHex || 'rgba(15, 23, 42, 0.72)',
                                        }
                                      : undefined
                                  }
                                >
                                  {badgeItem && (
                                    <span
                                      className="cosmetic-inline-badge"
                                      style={{ color: badgeItem.colorHex }}
                                      title={badgeItem.nameFa}
                                    >
                                      {badgeItem.symbol}
                                    </span>
                                  )}
                                  {p.name}
                                </span>
                              );
                            })()}
                            {p.isHost && <span className="online-mini-tag">میزبان</span>}
                            {p.isBot && (
                              <span className="online-mini-tag">
                                بات {formatOnlineBotDifficultyFa(p.botDifficulty || currentRoom.botDifficulty || 'medium')}
                              </span>
                            )}
                            {isMe && <span className="online-mini-tag is-accent">شما</span>}
                            {p.disconnected && <span className="online-mini-tag is-warn">قطع</span>}
                            {isSpeaking && (
                              <span className="online-speaking-dot" title="در حال صحبت" aria-label="در حال صحبت" />
                            )}
                          </div>

                          <div className="online-player-meta">
                            <span className="online-player-ping mono" dir="ltr">
                              {pPingText}
                            </span>

                            {!isMe && !p.isBot && onToggleMutePlayer && (
                              <button
                                type="button"
                                data-testid={`btn-lobby-mute-${p.id}`}
                                className={`online-mute-btn ${isMuted ? 'is-muted' : ''}`}
                                onClick={() => onToggleMutePlayer(p.id)}
                                aria-label={isMuted ? `وصل صدای ${p.name}` : `قطع صدای ${p.name}`}
                              >
                                {isMuted ? 'بی‌صدا' : 'صدا'}
                              </button>
                            )}

                            <span
                              data-testid={`player-ready-status-${p.id}`}
                              className={`online-ready-badge ${playerReady ? 'is-ready' : ''}`}
                            >
                              {playerReady ? 'آماده' : 'منتظر'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Local Ready Toggle Button */}
                  <button
                    type="button"
                    data-testid="btn-lobby-ready-toggle"
                    className={`online-ready-toggle-btn ${localIsReady ? 'is-ready' : ''}`}
                    onClick={() => onToggleLobbyReady?.(!localIsReady)}
                  >
                    {localIsReady ? '✓ آماده هستم (لغو آمادگی)' : 'اعلام آمادگی برای شروع'}
                  </button>
                </div>

                {/* Collapsible Host Settings Panel */}
                {(() => {
                  const curRoundDur = currentRoom.roundDurationSec ?? ROUND_DURATION_SEC;
                  const curWinTarget = currentRoom.targetWinRounds ?? ROUND_MATCH_WIN_SCORE;
                  const curStartHp = currentRoom.startingHp ?? 100;
                  const curFF = Boolean(currentRoom.friendlyFire);
                  const curFillBots = Boolean(currentRoom.fillBotsEnabled);
                  const curBotDiff: OnlineBotDifficulty = currentRoom.botDifficulty || 'medium';
                  const isHost = peerRole === 'host';

                  return (
                    <div className="online-accordion">
                      <button
                        type="button"
                        data-testid="btn-host-settings-accordion"
                        className="online-accordion-trigger"
                        aria-expanded={hostSettingsOpen}
                        onClick={() => setHostSettingsOpen((prev) => !prev)}
                      >
                        <div>
                          <div className="online-section-heading">
                            {isHost ? 'تنظیمات اتاق (میزبان)' : 'تنظیمات مسابقه'}
                          </div>
                          <div className="online-muted-sub">
                            {formatGameModeFa(currentRoom.mode)} · {activeMapObj.nameFa} · {curRoundDur}ث · {curWinTarget} برد ·{' '}
                            {curStartHp} HP
                          </div>
                        </div>
                        <span className="online-accordion-chevron" aria-hidden="true">
                          {hostSettingsOpen ? '▲' : '▼'}
                        </span>
                      </button>

                      {hostSettingsOpen && (
                        <div data-testid="lobby-match-settings" className="online-accordion-body">
                          {/* Mode */}
                          <div className="online-field">
                            <label htmlFor="online-mode-select">حالت بازی</label>
                            <select
                              id="online-mode-select"
                              data-testid="online-mode-select"
                              disabled={!isHost}
                              value={activeMode}
                              onChange={(e) => handleModeSelectChange(e.target.value as OnlineGameMode)}
                            >
                              <option value="tdm_1v1">نبرد راندی 1v1</option>
                              <option value="tdm_2v2">نبرد راندی 2v2</option>
                              <option value="coop">همکاری تیمی (Co-Op)</option>
                              <option value="pvp">نبرد آزاد (PvP)</option>
                            </select>
                          </div>

                          {/* Map Picker */}
                          <div className="online-field">
                            <label>{isHost ? 'نقشه مسابقه' : 'رأی به نقشه'}</label>
                            <div className="online-map-grid">
                              {MAP_LIST.map((m) => {
                                const active = currentRoom.mapId === m.id;
                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    data-testid={`online-map-${m.id}`}
                                    className={`online-map-btn ${active ? 'is-selected' : ''}`}
                                    onClick={() => (isHost ? onSelectMap(m.id) : onVoteMap?.(m.id))}
                                  >
                                    <strong>{m.nameFa}</strong>
                                    <span>{m.badgeFa}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Round Match Settings */}
                          <div className="online-settings-rows">
                            <div className="online-setting-line">
                              <span>زمان هر راند</span>
                              <div className="online-chip-group">
                                {isHost ? (
                                  ALLOWED_ROUND_DURATIONS.map((sec) => (
                                    <button
                                      key={sec}
                                      type="button"
                                      data-testid={`btn-host-round-dur-${sec}`}
                                      className={`online-chip-btn ${curRoundDur === sec ? 'is-accent' : ''}`}
                                      onClick={() => onUpdateMatchSettings?.({ roundDurationSec: sec })}
                                    >
                                      {sec}ث
                                    </button>
                                  ))
                                ) : (
                                  <span data-testid="client-match-round-dur" className="online-readonly-val">
                                    {curRoundDur} ثانیه
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="online-setting-line">
                              <span>برد لازم</span>
                              <div className="online-chip-group">
                                {isHost ? (
                                  ALLOWED_WIN_TARGETS.map((wins) => (
                                    <button
                                      key={wins}
                                      type="button"
                                      data-testid={`btn-host-win-target-${wins}`}
                                      className={`online-chip-btn ${curWinTarget === wins ? 'is-accent' : ''}`}
                                      onClick={() => onUpdateMatchSettings?.({ targetWinRounds: wins })}
                                    >
                                      {wins}
                                    </button>
                                  ))
                                ) : (
                                  <span data-testid="client-match-win-target" className="online-readonly-val">
                                    {curWinTarget} برد
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="online-setting-line">
                              <span>سلامت اولیه</span>
                              <div className="online-chip-group">
                                {isHost ? (
                                  ALLOWED_STARTING_HP.map((hp) => (
                                    <button
                                      key={hp}
                                      type="button"
                                      data-testid={`btn-host-start-hp-${hp}`}
                                      className={`online-chip-btn ${curStartHp === hp ? 'is-accent' : ''}`}
                                      onClick={() => onUpdateMatchSettings?.({ startingHp: hp })}
                                    >
                                      {hp} HP
                                    </button>
                                  ))
                                ) : (
                                  <span data-testid="client-match-start-hp" className="online-readonly-val">
                                    {curStartHp} HP
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="online-setting-line">
                              <span>Friendly Fire</span>
                              <div className="online-chip-group">
                                {isHost ? (
                                  <button
                                    type="button"
                                    data-testid="btn-host-toggle-ff"
                                    className={`online-chip-btn ${curFF ? 'is-danger' : 'is-accent'}`}
                                    onClick={() => onUpdateMatchSettings?.({ friendlyFire: !curFF })}
                                  >
                                    {curFF ? 'روشن' : 'خاموش'}
                                  </button>
                                ) : (
                                  <span data-testid="client-match-ff" className="online-readonly-val">
                                    {curFF ? 'روشن' : 'خاموش'}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Fill Empty Slots with Bots (1v1 / 2v2) */}
                            {roundModeActive && (
                              <div className="online-setting-line">
                                <span>پر کردن با بات</span>
                                <div className="online-chip-group">
                                  {isHost ? (
                                    <>
                                      <button
                                        type="button"
                                        data-testid="btn-host-toggle-fill-bots"
                                        className={`online-chip-btn ${curFillBots ? 'is-accent' : ''}`}
                                        onClick={() => onUpdateMatchSettings?.({ fillBotsEnabled: !curFillBots })}
                                      >
                                        {curFillBots ? 'فعال' : 'خاموش'}
                                      </button>
                                      {curFillBots &&
                                        ONLINE_BOT_DIFFICULTIES.map((diff) => (
                                          <button
                                            key={diff}
                                            type="button"
                                            data-testid={`btn-host-bot-diff-${diff}`}
                                            className={`online-chip-btn ${curBotDiff === diff ? 'is-accent' : ''}`}
                                            onClick={() => onUpdateMatchSettings?.({ botDifficulty: diff })}
                                          >
                                            {formatOnlineBotDifficultyFa(diff)}
                                          </button>
                                        ))}
                                    </>
                                  ) : (
                                    <span data-testid="client-match-bots" className="online-readonly-val">
                                      {curFillBots ? `فعال (${formatOnlineBotDifficultyFa(curBotDiff)})` : 'خاموش'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Room Rules: Aim Assist, Slide & Mythic Perks */}
                            <div className="online-setting-line" data-testid="lobby-room-rules">
                              <span>قوانین اتاق</span>
                              <div className="online-chip-group">
                                {isHost ? (
                                  <>
                                    <button
                                      type="button"
                                      data-testid="btn-host-toggle-aim-assist"
                                      className={`online-chip-btn ${
                                        currentRoom.aimAssistAllowed !== false ? 'is-accent' : 'is-danger'
                                      }`}
                                      onClick={() =>
                                        onUpdateRoomRules?.({
                                          aimAssistAllowed: currentRoom.aimAssistAllowed === false,
                                        })
                                      }
                                    >
                                      Aim Assist: {currentRoom.aimAssistAllowed !== false ? 'مجاز' : 'خاموش'}
                                    </button>
                                    <button
                                      type="button"
                                      data-testid="btn-host-toggle-slide"
                                      className={`online-chip-btn ${
                                        currentRoom.slideAllowed !== false ? 'is-accent' : 'is-danger'
                                      }`}
                                      onClick={() =>
                                        onUpdateRoomRules?.({
                                          slideAllowed: currentRoom.slideAllowed === false,
                                        })
                                      }
                                    >
                                      اسلاید: {currentRoom.slideAllowed !== false ? 'مجاز' : 'خاموش'}
                                    </button>
                                    <button
                                      type="button"
                                      data-testid="btn-host-toggle-mythic-perks"
                                      className={`online-chip-btn ${
                                        currentRoom.mythicPerksAllowed !== false ? 'is-mythic' : 'is-danger'
                                      }`}
                                      onClick={() =>
                                        onUpdateRoomRules?.({
                                          mythicPerksAllowed: currentRoom.mythicPerksAllowed === false,
                                        })
                                      }
                                    >
                                      مزیت‌های میتیک: {currentRoom.mythicPerksAllowed !== false ? 'مجاز' : 'خاموش'}
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <span data-testid="client-rule-aim-assist" className="online-readonly-val">
                                      Aim: {currentRoom.aimAssistAllowed !== false ? 'مجاز' : 'خاموش'}
                                    </span>
                                    <span data-testid="client-rule-slide" className="online-readonly-val">
                                      اسلاید: {currentRoom.slideAllowed !== false ? 'مجاز' : 'خاموش'}
                                    </span>
                                    <span data-testid="client-rule-mythic-perks" className="online-readonly-val">
                                      میتیک: {currentRoom.mythicPerksAllowed !== false ? 'مجاز' : 'خاموش'}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Transparent Lobby Notice when Mythic M249 perks are active for any player */}
                            {(() => {
                              const mythicHolders = getLobbyMythicHolderNames(currentRoom.players);
                              if (currentRoom.mythicPerksAllowed === false || mythicHolders.length === 0) {
                                return null;
                              }
                              return (
                                <div
                                  className="online-mythic-lobby-notice"
                                  data-testid="lobby-mythic-notice"
                                  role="status"
                                >
                                  ✧ اسکین میتیک M249 فعال است ({mythicHolders.join('، ')}) — مزایای محدود میتیک (+۱۵٪ Aim Assist و ۱۰٪ کاهش تکان دوربین روی M249) در این اتاق مجاز است.
                                </div>
                              );
                            })()}

                            {/* Host Room Lock & Password Controls */}
                            {isHost && (
                              <>
                                <div className="online-setting-line">
                                  <span>قفل اتاق</span>
                                  <button
                                    type="button"
                                    data-testid="btn-host-toggle-lock"
                                    className={`online-chip-btn ${currentRoom.isLocked ? 'is-danger' : ''}`}
                                    onClick={() => onToggleRoomLock?.(!currentRoom.isLocked)}
                                  >
                                    {currentRoom.isLocked ? 'قفل (ورود جدید بسته)' : 'باز'}
                                  </button>
                                </div>

                                <div className="online-setting-line">
                                  <span>رمز اتاق</span>
                                  <div className="online-inline-pass">
                                    <input
                                      type="text"
                                      maxLength={16}
                                      placeholder={currentRoom.hasPassword ? 'تغییر یا خالی برای حذف' : 'بدون رمز'}
                                      value={hostPasswordEdit}
                                      onChange={(e) => setHostPasswordEdit(e.target.value)}
                                      className="online-mini-input"
                                    />
                                    <button
                                      type="button"
                                      data-testid="btn-host-save-password"
                                      className="online-chip-btn is-accent"
                                      onClick={() => {
                                        onUpdateRoomPassword?.(hostPasswordEdit);
                                        setHostPasswordSaved(true);
                                        window.setTimeout(() => setHostPasswordSaved(false), 1500);
                                      }}
                                    >
                                      {hostPasswordSaved ? 'ذخیره شد' : 'اعمال'}
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Lobby Footer Start Button (Gated by Ready status) */}
                <div className="online-footer-cta">
                  <button
                    type="button"
                    data-testid="btn-start-online-match"
                    className="online-primary-btn"
                    disabled={peerRole === 'host' ? !readySummary.allReady : !localIsReady}
                    onClick={onStartOnlineMatch}
                  >
                    {peerRole === 'host'
                      ? readySummary.allReady
                        ? 'شروع مسابقه'
                        : `در انتظار آماده شدن بازیکنان (${readySummary.readyCount}/${readySummary.totalCount})`
                      : localIsReady
                        ? 'ورود به میدان'
                        : 'ابتدا «اعلام آمادگی» را بزنید'}
                  </button>
                </div>
              </div>
            ) : isDirectInviteMode ? (
              /* =====================================================
                 VIEW 3: DIRECT INVITE LINK JOIN (#room=CODE)
                 ===================================================== */
              <div data-testid="invite-direct-join-view" className="online-direct-join">
                <div className="online-invite-pill">
                  <span>دعوت به اتاق</span>
                  <strong className="mono" dir="ltr" data-testid="invite-prefilled-code">
                    {pendingInviteRoomCode}
                  </strong>
                </div>

                <div className="online-field">
                  <label htmlFor="online-player-name">نام شما در بازی</label>
                  <input
                    id="online-player-name"
                    data-testid="input-online-player-name"
                    type="text"
                    maxLength={16}
                    autoFocus
                    placeholder="نام نمایشی خود را بنویسید..."
                    value={playerName}
                    onChange={(e) => onChangePlayerName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isConnecting) handleJoinClick();
                    }}
                    className="online-text-input"
                  />
                </div>

                {showInvitePassword ? (
                  <div className="online-field">
                    <label htmlFor="online-invite-password">رمز اتاق (در صورت نیاز)</label>
                    <input
                      id="online-invite-password"
                      data-testid="input-room-password"
                      type="password"
                      maxLength={16}
                      placeholder="رمز اتاق..."
                      value={roomPasswordInput}
                      onChange={(e) => setRoomPasswordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isConnecting) handleJoinClick();
                      }}
                      className="online-text-input"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    className="online-text-link"
                    onClick={() => setShowInvitePassword(true)}
                  >
                    اتاق رمز دارد؟ وارد کردن رمز
                  </button>
                )}

                <button
                  type="button"
                  data-testid="btn-join-room-code"
                  className="online-primary-btn"
                  disabled={isConnecting}
                  onClick={handleJoinClick}
                >
                  {isConnecting ? (
                    <span className="online-btn-loading">
                      <span className="online-spinner" aria-hidden="true" />
                      <span>در حال ورود به اتاق...</span>
                    </span>
                  ) : (
                    'ورود به اتاق'
                  )}
                </button>

                <button
                  type="button"
                  className="online-secondary-btn"
                  onClick={() => {
                    onClearPendingInvite?.();
                    setHomeView('menu');
                  }}
                >
                  ساخت اتاق جدید یا ورود با کد دیگر
                </button>
              </div>
            ) : (
              /* =====================================================
                 VIEW 4: CLEAN MINIMAL HOME (NAME + 2 LARGE BUTTONS)
                 ===================================================== */
              <div className="online-home-wrap">
                {/* Player Name Input */}
                <div className="online-field">
                  <label htmlFor="online-player-name">نام شما</label>
                  <input
                    id="online-player-name"
                    data-testid="input-online-player-name"
                    type="text"
                    maxLength={16}
                    placeholder="نام اپراتور..."
                    value={playerName}
                    onChange={(e) => onChangePlayerName(e.target.value)}
                    className="online-text-input"
                  />
                </div>

                {/* Two Large Touch-Friendly Primary Choice Buttons */}
                <div className="online-home-grid">
                  <button
                    type="button"
                    data-testid="btn-online-home-create"
                    className={`online-big-choice ${homeView === 'create' ? 'is-selected' : ''}`}
                    onClick={() => {
                      setLocalValidationError(null);
                      setHomeView('create');
                    }}
                  >
                    <span className="online-big-title">ساخت اتاق</span>
                    <span className="online-big-sub">ایجاد اتاق و ارسال لینک دعوت</span>
                  </button>

                  <button
                    type="button"
                    data-testid="btn-online-home-join"
                    className={`online-big-choice ${homeView === 'join' ? 'is-selected' : ''}`}
                    onClick={() => {
                      setLocalValidationError(null);
                      setHomeView('join');
                    }}
                  >
                    <span className="online-big-title">ورود با کد</span>
                    <span className="online-big-sub">ورود سریع با کد یا لینک اتاق</span>
                  </button>
                </div>

                {/* Create Room Panel */}
                {homeView === 'create' && (
                  <div data-testid="online-create-panel" className="online-subpanel">
                    <div className="online-field">
                      <label htmlFor="online-mode-select">حالت بازی</label>
                      <select
                        id="online-mode-select"
                        data-testid="online-mode-select"
                        value={onlineMode}
                        onChange={(e) => handleModeSelectChange(e.target.value as OnlineGameMode)}
                      >
                        <option value="tdm_1v1">نبرد راندی 1v1</option>
                        <option value="tdm_2v2">نبرد راندی 2v2</option>
                        <option value="coop">همکاری تیمی (Co-Op)</option>
                        <option value="pvp">نبرد آزاد (PvP)</option>
                      </select>
                    </div>

                    <div className="online-field">
                      <label>نقشه</label>
                      <div className="online-map-grid">
                        {MAP_LIST.map((m) => {
                          const active = selectedMap === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              data-testid={`online-map-${m.id}`}
                              className={`online-map-btn ${active ? 'is-selected' : ''}`}
                              onClick={() => onSelectMap(m.id)}
                            >
                              <strong>{m.nameFa}</strong>
                              <span>{m.badgeFa}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="online-field">
                      <label htmlFor="online-create-pass">رمز اتاق (اختیاری)</label>
                      <input
                        id="online-create-pass"
                        data-testid="input-room-password"
                        type="password"
                        maxLength={16}
                        placeholder="خالی = اتاق بدون رمز"
                        value={roomPasswordInput}
                        onChange={(e) => setRoomPasswordInput(e.target.value)}
                        className="online-text-input"
                      />
                    </div>

                    <button
                      type="button"
                      data-testid="btn-create-online-room"
                      className="online-primary-btn"
                      disabled={isConnecting}
                      onClick={handleCreateClick}
                    >
                      {isConnecting ? (
                        <span className="online-btn-loading">
                          <span className="online-spinner" aria-hidden="true" />
                          <span>در حال ساخت اتاق...</span>
                        </span>
                      ) : (
                        'ساخت اتاق و دریافت کد'
                      )}
                    </button>
                  </div>
                )}

                {/* Join Room Panel */}
                {homeView === 'join' && (
                  <div data-testid="online-join-panel" className="online-subpanel">
                    <div className="online-field">
                      <label htmlFor="online-join-code">کد اتاق</label>
                      <div className="online-code-input-row">
                        <input
                          id="online-join-code"
                          data-testid="input-join-room-code"
                          type="text"
                          maxLength={64}
                          placeholder="مثلاً K7M9P2X4"
                          value={joinCodeInput}
                          onChange={(e) => setJoinCodeInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !isConnecting) handleJoinClick();
                          }}
                          dir="ltr"
                          className="online-text-input mono"
                        />
                        <button
                          type="button"
                          data-testid="btn-paste-room-code"
                          className="online-paste-btn"
                          onClick={() => void handlePasteCode()}
                        >
                          {copiedFeedback === 'paste' ? 'چسبانده شد' : 'چسباندن'}
                        </button>
                      </div>
                    </div>

                    <div className="online-field">
                      <label htmlFor="online-join-pass">رمز اتاق (اختیاری)</label>
                      <input
                        id="online-join-pass"
                        data-testid="input-room-password"
                        type="password"
                        maxLength={16}
                        placeholder="در صورت رمزدار بودن اتاق..."
                        value={roomPasswordInput}
                        onChange={(e) => setRoomPasswordInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !isConnecting) handleJoinClick();
                        }}
                        className="online-text-input"
                      />
                    </div>

                    <button
                      type="button"
                      data-testid="btn-join-room-code"
                      className="online-primary-btn"
                      disabled={isConnecting}
                      onClick={handleJoinClick}
                    >
                      {isConnecting ? (
                        <span className="online-btn-loading">
                          <span className="online-spinner" aria-hidden="true" />
                          <span>در حال اتصال به اتاق...</span>
                        </span>
                      ) : (
                        'ورود به اتاق'
                      )}
                    </button>

                    {publicRooms.length > 0 && (
                      <div className="online-nearby-rooms">
                        <div className="online-muted-sub">اتاق‌های فعال روی این دستگاه:</div>
                        {publicRooms.map((r) => (
                          <button
                            key={r.code}
                            type="button"
                            className="online-nearby-row"
                            onClick={() => {
                              setJoinCodeInput(r.code);
                              onJoinRoom(r.code, roomPasswordInput.trim());
                            }}
                          >
                            <span className="mono" dir="ltr">
                              {r.code}
                            </span>
                            <span>
                              {r.hostName || 'Host'} · {r.players.length} نفر
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
