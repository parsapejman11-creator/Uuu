import React, { useEffect, useMemo, useState } from 'react';
import { measureModalOpenPaint } from '../utils/perfHelpers';
import {
  ALLOWED_ROUND_DURATIONS,
  ALLOWED_STARTING_HP,
  ALLOWED_WIN_TARGETS,
  MAP_LIST,
  ONLINE_BOT_DIFFICULTIES,
  ROUND_DURATION_SEC,
  ROUND_MATCH_WIN_SCORE,
  areAllLobbyPlayersReady,
  buildRoomInviteUrl,
  classifyPingQuality,
  formatConnectionStatusFa,
  formatGameModeFa,
  formatOnlineBotDifficultyFa,
  getCurrentOriginShareBaseUrl,
  getTeamColor,
  getTeamNameFa,
  isRoundBasedMode,
  type HostMatchSettings,
  type MapId,
  type OnlineBotDifficulty,
  type OnlineGameMode,
  type PeerConnectionStatus,
  type PeerRole,
  type TeamId,
} from '../game/rules';
import { PEERJS_STUN_SERVERS } from '../game/peerConfig';
import {
  runConnectionDiagnostics,
  type ConnectionDiagnosticsReport,
  type LivePeerTelemetry,
} from '../game/peerDiagnostics';
import { renderQrSvgPath } from '../game/qrSvg';
import type { VoiceChatSnapshot } from '../game/voiceChat';
import { getCosmeticItem } from '../game/cosmetics';
import { getLobbyMythicSummary } from '../game/mythicPerks';
import { APP_VERSION } from '../game/version';
import { OG_FEATURE_FLAGS, getOgAllowedMaps, type OgFeatureFlags } from '../og/og.config';
import type { OnlineRoomSummary, OnlineTransportSummary } from '../components/OnlineModal';
import { BidiText, GlassButton } from './primitives';
import { IconCheck, IconClose, IconGlobe, IconShield } from './icons';
import { extractRoomCodeFromClipboard, formatDiagnosticsReportText } from './stage2Helpers';

export interface OnlineModalV3Props {
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
  ogMode?: boolean;
  ogFeatures?: OgFeatureFlags;
  onClose: () => void;
}

type HomeSubView = 'menu' | 'create' | 'join';
type FeedbackKind = 'code' | 'link' | 'share' | 'paste' | 'diag-report';

/**
 * Liquid Glass Stage 2 — Online Entry, Active Lobby, Direct Invite, and Connection Diagnostics.
 * Preserves 100% of existing PeerJS callbacks, host controls, voice controls, and test IDs.
 * Blur Budget: strictly 1 small blur layer (header capsule) when data-glass-mode="liquid".
 */
export const OnlineModalV3: React.FC<OnlineModalV3Props> = React.memo(({
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
  ogMode = false,
  ogFeatures = OG_FEATURE_FLAGS,
  onClose,
}) => {
  const [homeView, setHomeView] = useState<HomeSubView>(pendingInviteRoomCode ? 'join' : 'create');
  const [joinCodeInput, setJoinCodeInput] = useState(pendingInviteRoomCode || '');
  const [roomPasswordInput, setRoomPasswordInput] = useState('');
  const [showInvitePassword, setShowInvitePassword] = useState(false);
  const [hostPasswordEdit, setHostPasswordEdit] = useState('');
  const [hostPasswordSaved, setHostPasswordSaved] = useState(false);
  const [onlineMode, setOnlineMode] = useState<OnlineGameMode>(
    ogMode ? 'og' : currentRoom?.mode || 'tdm_1v1'
  );
  const [copiedFeedback, setCopiedFeedback] = useState<FeedbackKind | null>(null);
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
    measureModalOpenPaint('online-v3');
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
    if (ogMode) {
      setOnlineMode('og');
      return;
    }
    if (currentRoom?.mode) {
      setOnlineMode(currentRoom.mode);
    }
  }, [currentRoom?.mode, ogMode]);

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
    ? { label: isRelayMode ? 'تلاش با رله...' : 'در حال اتصال...', color: '#fbbf24', pulse: true }
    : peerStatus === 'connected'
      ? isRelayMode
        ? { label: 'رله TURN', color: '#fbbf24', pulse: false }
        : { label: 'متصل', color: '#30d158', pulse: false }
      : peerStatus === 'error'
        ? { label: 'خطای اتصال', color: '#ff453a', pulse: false }
        : { label: 'آماده', color: '#7dd3fc', pulse: false };

  const transportShortFa = isRelayMode
    ? 'رله (TURN)'
    : transportInfo?.transportType === 'direct_p2p' || peerStatus === 'connected'
      ? 'مستقیم (P2P)'
      : 'در حال بررسی';

  const standaloneBaseUrl = getCurrentOriginShareBaseUrl(
    window.location.origin,
    window.location.pathname
  );
  const shareUrl = currentRoom ? buildRoomInviteUrl(standaloneBaseUrl, currentRoom.code) : '';

  const qrSvgData = useMemo(() => {
    if (!showQrCode || !shareUrl) return null;
    try {
      return renderQrSvgPath(shareUrl, 2);
    } catch {
      return null;
    }
  }, [showQrCode, shareUrl]);

  const flashFeedback = (kind: FeedbackKind) => {
    setCopiedFeedback(kind);
    window.setTimeout(() => {
      setCopiedFeedback((prev) => (prev === kind ? null : prev));
    }, 1800);
  };

  const copyText = (text: string, type: FeedbackKind) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    flashFeedback(type);
  };

  const handleCopyDiagnosticsReport = () => {
    if (!diagReport) return;
    const text = formatDiagnosticsReportText({
      report: diagReport,
      appVersion: APP_VERSION,
      stunServersCount: PEERJS_STUN_SERVERS.length,
      roomCode: currentRoom?.code ?? null,
      peerRole,
      pingMs,
      voiceState,
    });
    copyText(text, 'diag-report');
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
        if (err instanceof Error && err.name === 'AbortError') return;
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
        const extracted = extractRoomCodeFromClipboard(text);
        if (extracted) {
          setJoinCodeInput(extracted);
          flashFeedback('paste');
          return;
        }
      }
    } catch {
      // Clipboard read denied or unavailable
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
    const resolvedMode: OnlineGameMode = ogMode ? 'og' : onlineMode;
    onCreateRoom(selectedMap, resolvedMode, roomPasswordInput.trim());
  };

  const handleJoinClick = () => {
    setLocalValidationError(null);
    const trimmedName = playerName.trim();
    if (!trimmedName) {
      setLocalValidationError('لطفاً ابتدا نام نمایشی خود را وارد کنید.');
      return;
    }
    const cleanCode = extractRoomCodeFromClipboard(joinCodeInput);
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
      const resolvedMode: OnlineGameMode = ogMode ? 'og' : onlineMode;
      onCreateRoom(selectedMap, resolvedMode, roomPasswordInput.trim());
      return;
    }
    if (onRetryConnect && (joinCodeInput.trim() || pendingInviteRoomCode)) {
      const codeToJoin = extractRoomCodeFromClipboard(joinCodeInput || pendingInviteRoomCode || '');
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

  const activeMode: OnlineGameMode = ogMode ? 'og' : currentRoom?.mode || onlineMode;
  const isOgActive = ogMode || activeMode === 'og';
  const availableMaps = getOgAllowedMaps(isOgActive, ogFeatures);
  const showCosmeticsInLobby = !isOgActive || ogFeatures.skinsAndCollection;
  const showVoiceInLobby = !isOgActive || ogFeatures.voiceChat;
  const showAdvancedLobbySettings = !isOgActive || ogFeatures.pingHudAndAdvancedLobby;
  const roundModeActive = isRoundBasedMode(activeMode);
  const isDirectInviteMode = Boolean(pendingInviteRoomCode && !currentRoom);

  const localPlayerInRoom = currentRoom?.players.find((p) => p.id === localPlayerId) || null;
  const localIsReady = Boolean(localPlayerInRoom?.lobbyReady);
  const readySummary = areAllLobbyPlayersReady(currentRoom);

  const activeMapObj =
    availableMaps.find((m) => m.id === (currentRoom?.mapId || selectedMap)) ||
    availableMaps[0] ||
    MAP_LIST[0];
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
        : { color: '#94a3b8', tier: 'good' as const, labelFa: '—' };

  return (
    <div
      id="online-screen"
      className="uiv3-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="بخش آنلاین"
      data-testid="uiv3-online-modal"
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="uiv3-ambient-scrim" aria-hidden="true" />
      <div className="uiv3-modal-sheet uiv3-online-sheet">
        <div className="uiv3-modal-glass-bg" aria-hidden="true" />
        <div className="uiv3-modal-content">
          {/* BLUR LAYER 1: Compact Liquid Glass Header */}
          <header className="uiv3-modal-header uiv3-blur-layer uiv3-blur-l1">
            <div className="uiv3-modal-title-group">
              <div className="uiv3-modal-title-row">
                <span className="uiv3-online-head-icon" aria-hidden="true">
                  <IconGlobe size={18} />
                </span>
                <h2 className="uiv3-modal-title">
                  <BidiText text={isOgActive ? 'بازی آنلاین · OG' : 'بازی آنلاین (1v1 / 2v2)'} />
                </h2>
                {isOgActive && (
                  <span className="uiv3-og-pill-tag" data-testid="online-og-badge">
                    OG
                  </span>
                )}
                <span
                  className="uiv3-online-status-pill"
                  data-testid="online-connection-status"
                  title={statusInfo.labelFa}
                >
                  <span
                    className={`uiv3-status-dot${compactStatusBadge.pulse ? ' is-pulsing' : ''}`}
                    style={{ background: compactStatusBadge.color }}
                  />
                  <span>
                    <BidiText text={compactStatusBadge.label} />
                  </span>
                </span>
              </div>
              <div className="uiv3-modal-subtitle">
                <BidiText text={statusInfo.labelFa} />
              </div>
            </div>

            <div className="uiv3-modal-header-actions">
              <button
                type="button"
                data-testid="btn-open-diagnostics"
                className={`uiv3-pill-action-btn${showDiagnostics ? ' is-active' : ''}`}
                onClick={() => setShowDiagnostics((prev) => !prev)}
              >
                <IconShield size={15} />
                <span>{showDiagnostics ? 'بازگشت' : 'تشخیص اتصال'}</span>
              </button>
              <button
                type="button"
                data-testid="btn-close-online-modal"
                className="uiv3-icon-circle-btn"
                onClick={onClose}
                aria-label="بستن پنجره آنلاین"
              >
                <IconClose size={17} />
              </button>
            </div>
          </header>

          {/* SCROLLABLE STAGE 2 BODY */}
          <div className="uiv3-online-body">
            {/* =====================================================
                VIEW 1: CONNECTION DIAGNOSTICS (+ COPY REPORT)
                ===================================================== */}
            {showDiagnostics ? (
              <div data-testid="connection-diagnostics-panel" className="uiv3-online-stack">
                <div className="uiv3-glass-group">
                  <div className="uiv3-group-head">
                    <div>
                      <div className="uiv3-group-title">تشخیص اتصال شبکه و VPN</div>
                      <div className="uiv3-setting-desc">
                        <BidiText text="بررسی سرور PeerJS، رله TURN (UDP/TCP/TLS 443)، کاندیداهای ICE و چت صوتی" />
                      </div>
                    </div>
                    <div className="uiv3-btn-inline-pair">
                      <GlassButton
                        variant="secondary"
                        size="sm"
                        data-testid="btn-copy-diagnostics-report"
                        disabled={!diagReport}
                        onClick={handleCopyDiagnosticsReport}
                      >
                        {copiedFeedback === 'diag-report' ? 'گزارش کپی شد' : 'کپی گزارش'}
                      </GlassButton>
                      <GlassButton
                        variant="accent"
                        size="sm"
                        data-testid="btn-run-diagnostics"
                        disabled={diagRunning}
                        onClick={() => void handleRunDiagnostics()}
                      >
                        {diagRunning ? 'در حال تست...' : 'تست مجدد'}
                      </GlassButton>
                    </div>
                  </div>

                  {diagRunning && !diagReport ? (
                    <div className="uiv3-online-loading">
                      <span className="uiv3-spinner" aria-hidden="true" />
                      <span>در حال بررسی سرور واسطه و کاندیداهای شبکه...</span>
                    </div>
                  ) : diagReport ? (
                    <div className="uiv3-diag-grid">
                      {/* 1. PeerJS Broker */}
                      <div
                        data-testid="diag-broker-row"
                        className={`uiv3-diag-row ${
                          diagReport.brokerReachability === 'reachable' ? 'is-ok' : 'is-err'
                        }`}
                      >
                        <div>
                          <div className="uiv3-diag-label">1. سرور واسطه (PeerJS)</div>
                          <div className="uiv3-diag-meta" dir="ltr">
                            {diagReport.brokerHost}:{diagReport.brokerPort} (
                            {diagReport.brokerSecure ? 'WSS' : 'WS'}) ·{' '}
                            {diagReport.availableBrokersCount} servers
                          </div>
                        </div>
                        <span className="uiv3-diag-val">{diagReport.brokerDetailFa}</span>
                      </div>

                      {/* 2. TURN Relay */}
                      <div
                        data-testid="diag-turn-row"
                        className={`uiv3-diag-row ${
                          diagReport.turnWorkerStatus === 'ok' ? 'is-ok' : 'is-warn'
                        }`}
                      >
                        <div>
                          <div className="uiv3-diag-label">2. سرور رله TURN (عبور از VPN)</div>
                          <div className="uiv3-diag-meta">
                            <BidiText text="پشتیبانی UDP / TCP / TLS 443 · رله خودکار پس از 15 ثانیه" />
                          </div>
                        </div>
                        <span className="uiv3-diag-val">{diagReport.turnDetailFa}</span>
                      </div>

                      {/* 3. ICE & Candidates */}
                      <div data-testid="diag-ice-row" className="uiv3-diag-row">
                        <div>
                          <div className="uiv3-diag-label">3. وضعیت ICE و کاندیداها</div>
                          <div className="uiv3-diag-meta">
                            STUN: <b dir="ltr">{diagReport.stunCandidatesCount}</b> · محلی:{' '}
                            <b dir="ltr">{diagReport.hostCandidatesCount}</b> · رله:{' '}
                            <b dir="ltr">{diagReport.relayCandidatesCount}</b>
                          </div>
                        </div>
                        <span className="uiv3-diag-meta" dir="ltr">
                          {diagReport.iceState} / {diagReport.iceGatheringState}
                        </span>
                      </div>

                      {/* 4. Connection Type */}
                      <div
                        data-testid="diag-type-row"
                        className={`uiv3-diag-row ${
                          diagReport.connectionType === 'direct_p2p'
                            ? 'is-ok'
                            : diagReport.connectionType === 'relay_turn'
                              ? 'is-warn'
                              : 'is-err'
                        }`}
                      >
                        <div>
                          <div className="uiv3-diag-label">4. نوع اتصال فعال</div>
                          {diagReport.relayFallbackActive && (
                            <div className="uiv3-diag-meta">حالت رله خودکار (VPN Fallback) فعال است</div>
                          )}
                        </div>
                        <span className="uiv3-diag-val">
                          <BidiText text={diagReport.connectionTypeLabelFa} />
                        </span>
                      </div>

                      {/* 5. Voice Chat */}
                      {voiceState && (
                        <div
                          data-testid="diag-voice-row"
                          className={`uiv3-diag-row ${
                            voiceState.lastErrorFa || !voiceState.secureContextOk
                              ? 'is-err'
                              : voiceState.micEnabled || voiceState.connectedCallCount > 0
                                ? 'is-ok'
                                : ''
                          }`}
                        >
                          <div>
                            <div className="uiv3-diag-label">5. چت صوتی (WebRTC)</div>
                            <div className="uiv3-diag-meta">
                              HTTPS: {voiceState.secureContextOk ? 'امن' : 'غیرامن'} · تماس برقرار:{' '}
                              <b dir="ltr">{voiceState.connectedCallCount}</b> نفر
                            </div>
                            {voiceState.lastErrorFa && (
                              <div data-testid="diag-voice-error" className="uiv3-diag-err-note">
                                {voiceState.lastErrorFa}
                              </div>
                            )}
                          </div>
                          <span data-testid="diag-voice-status-badge" className="uiv3-diag-val">
                            {!voiceState.secureContextOk
                              ? 'فقط روی HTTPS'
                              : voiceState.micStatus === 'active'
                                ? 'میکروفون روشن'
                                : voiceState.micStatus === 'ptt_ready'
                                  ? 'آماده (PTT)'
                                  : voiceState.micStatus === 'error'
                                    ? 'خطای میکروفون'
                                    : 'خاموش'}
                          </span>
                        </div>
                      )}

                      {diagReport.failureReasonFa ? (
                        <div data-testid="diag-failure-reason" className="uiv3-error-banner">
                          {diagReport.failureReasonFa}
                        </div>
                      ) : (
                        <div data-testid="diag-healthy-notice" className="uiv3-success-banner">
                          شبکه شما برای بازی آنلاین آماده است (بررسی در{' '}
                          <bdi dir="ltr" className="uiv3-bidi-ltr">
                            {diagReport.checkedAt}
                          </bdi>
                          ).
                        </div>
                      )}

                      <div className="uiv3-diag-foot">
                        <BidiText
                          text={`نسخه ${APP_VERSION} · ${PEERJS_STUN_SERVERS.length} سرور STUN فعال`}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                <GlassButton
                  variant="primary"
                  size="md"
                  block
                  data-testid="btn-diagnostics-back"
                  onClick={() => setShowDiagnostics(false)}
                >
                  بازگشت به آنلاین
                </GlassButton>
              </div>
            ) : (
              <div className="uiv3-online-stack">
                {/* Clear Persian Error & Disconnect Banner with Retry + Diagnostics */}
                {displayError && (
                  <div
                    data-testid="online-room-error"
                    className="uiv3-online-error-card"
                    role="alert"
                  >
                    <div className="uiv3-online-error-msg">{displayError}</div>
                    <div className="uiv3-btn-inline-pair">
                      <GlassButton
                        variant="accent"
                        size="sm"
                        data-testid="btn-retry-online-connect"
                        disabled={isConnecting}
                        onClick={handleRetryAction}
                      >
                        تلاش دوباره
                      </GlassButton>
                      <GlassButton
                        variant="subtle"
                        size="sm"
                        data-testid="btn-error-open-diagnostics"
                        onClick={() => setShowDiagnostics(true)}
                      >
                        تشخیص اتصال
                      </GlassButton>
                    </div>
                  </div>
                )}

                {/* =====================================================
                    VIEW 2: ACTIVE LOBBY (IN ROOM)
                    ===================================================== */}
                {currentRoom ? (
                  <div data-testid="active-online-room-box" className="uiv3-online-stack">
                    {/* Room Code & Share Card */}
                    <div className="uiv3-glass-group uiv3-room-hero-card">
                      <div className="uiv3-room-hero-top">
                        <div>
                          <div className="uiv3-room-hero-label">
                            <span>
                              {peerRole === 'host'
                                ? 'کد اتاق شما'
                                : `اتاق ${currentRoom.hostName || 'میزبان'}`}
                            </span>
                            {currentRoom.isLocked && (
                              <span className="uiv3-mini-pill is-warn">قفل‌شده</span>
                            )}
                            {currentRoom.hasPassword && (
                              <span className="uiv3-mini-pill">رمزدار</span>
                            )}
                          </div>
                          <div
                            className="uiv3-room-code-big"
                            data-testid="online-room-code-display"
                            dir="ltr"
                          >
                            <span data-testid="online-room-code">{currentRoom.code}</span>
                          </div>
                        </div>

                        <GlassButton
                          variant="danger"
                          size="sm"
                          data-testid="btn-leave-online-room"
                          onClick={onLeaveRoom}
                        >
                          خروج از اتاق
                        </GlassButton>
                      </div>

                      <div className="uiv3-share-grid">
                        <button
                          type="button"
                          data-testid="btn-copy-invite-link"
                          className="uiv3-share-tile is-primary"
                          onClick={() => copyText(shareUrl, 'link')}
                        >
                          {copiedFeedback === 'link' ? 'لینک کپی شد' : 'کپی لینک'}
                        </button>
                        <button
                          type="button"
                          data-testid="btn-share-room-link"
                          className="uiv3-share-tile"
                          onClick={() => void handleNativeShare()}
                        >
                          {copiedFeedback === 'share' ? 'ارسال شد' : 'اشتراک‌گذاری'}
                        </button>
                        <button
                          type="button"
                          data-testid="btn-copy-room-code"
                          className="uiv3-share-tile"
                          onClick={() => copyText(currentRoom.code, 'code')}
                        >
                          {copiedFeedback === 'code' ? 'کد کپی شد' : 'کپی کد'}
                        </button>
                        <button
                          type="button"
                          data-testid="btn-toggle-qr-code"
                          className={`uiv3-share-tile${showQrCode ? ' is-active' : ''}`}
                          aria-expanded={showQrCode}
                          onClick={() => setShowQrCode((prev) => !prev)}
                        >
                          <bdi dir="ltr" className="uiv3-bidi-ltr">
                            QR
                          </bdi>{' '}
                          کد
                        </button>
                      </div>

                      {showQrCode && qrSvgData && (
                        <div data-testid="qr-code-panel" className="uiv3-qr-drawer">
                          <div className="uiv3-qr-frame">
                            <svg
                              viewBox={qrSvgData.viewBox}
                              width={156}
                              height={156}
                              shapeRendering="crispEdges"
                              role="img"
                              aria-label={`کد QR دعوت اتاق ${currentRoom.code}`}
                            >
                              <rect width={qrSvgData.size} height={qrSvgData.size} fill="#ffffff" />
                              <path d={qrSvgData.pathD} fill="#090d16" />
                            </svg>
                          </div>
                          <div className="uiv3-qr-caption">
                            برای ورود مستقیم با گوشی، کد را اسکن کنید
                          </div>
                          <div className="uiv3-qr-url" dir="ltr">
                            {shareUrl}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Compact Connection Quality Strip */}
                    <div data-testid="lobby-connection-quality" className="uiv3-quality-strip">
                      <div className="uiv3-quality-item">
                        <span
                          className="uiv3-status-dot"
                          style={{ background: localPingQuality.color }}
                        />
                        <span>پینگ:</span>
                        <strong dir="ltr">{localPingDisplay}</strong>
                      </div>
                      <span className="uiv3-dot" aria-hidden="true">
                        ·
                      </span>
                      <div className="uiv3-quality-item">
                        <span>اتصال:</span>
                        <strong style={{ color: isRelayMode ? '#fbbf24' : '#7dd3fc' }}>
                          <BidiText text={transportShortFa} />
                        </strong>
                      </div>
                      <span className="uiv3-dot" aria-hidden="true">
                        ·
                      </span>
                      <div className="uiv3-quality-item" data-testid="online-peer-role">
                        <strong>{peerRole === 'host' ? 'میزبان' : 'مهمان'}</strong>
                      </div>
                    </div>

                    {/* Round Score Summary (1v1 / 2v2) */}
                    {roundModeActive && (
                      <div data-testid="lobby-round-summary" className="uiv3-lobby-round-strip">
                        <span style={{ color: getTeamColor('alpha') }}>
                          آلفا <b dir="ltr">{currentRoom.alphaScore ?? 0}</b>
                        </span>
                        <span className="uiv3-lobby-round-meta">
                          <BidiText
                            text={`راند ${currentRoom.currentRound ?? 1} · هدف ${currentRoom.targetWinRounds ?? ROUND_MATCH_WIN_SCORE} · ${activeMapObj.nameFa}`}
                          />
                        </span>
                        <span style={{ color: getTeamColor('bravo') }}>
                          <b dir="ltr">{currentRoom.bravoScore ?? 0}</b> براوو
                        </span>
                      </div>
                    )}

                    {/* Players Roster */}
                    <div className="uiv3-glass-group">
                      <div className="uiv3-group-head">
                        <div className="uiv3-group-title">
                          بازیکنان (<b dir="ltr">{currentRoom.players.length}</b>) ·{' '}
                          <span className="uiv3-ready-ratio" dir="ltr">
                            {readySummary.readyCount}/{readySummary.totalCount}
                          </span>{' '}
                          آماده
                        </div>
                        {!isOgActive && (
                          <GlassButton
                            variant="subtle"
                            size="sm"
                            data-testid="btn-switch-team"
                            onClick={() => onSwitchTeam?.()}
                          >
                            تغییر تیم
                          </GlassButton>
                        )}
                      </div>

                      <div data-testid="online-players-list" className="uiv3-roster-list">
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
                          const frameItem = showCosmeticsInLobby
                            ? getCosmeticItem(p.cosmetics?.nf)
                            : null;
                          const badgeItem = showCosmeticsInLobby
                            ? getCosmeticItem(p.cosmetics?.nb)
                            : null;

                          return (
                            <div
                              key={p.id}
                              className={`uiv3-roster-row${p.disconnected ? ' is-disconnected' : ''}${isSpeaking ? ' is-speaking' : ''}`}
                              style={{ borderRightColor: teamColor }}
                            >
                              <div className="uiv3-roster-main">
                                {!isOgActive && (
                                  <span
                                    className="uiv3-team-chip"
                                    style={{ color: teamColor, borderColor: `${teamColor}55` }}
                                  >
                                    {getTeamNameFa(pTeam)}
                                  </span>
                                )}
                                <span
                                  className={`uiv3-roster-name${frameItem ? ' has-frame' : ''}`}
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
                                {p.isHost && <span className="uiv3-mini-pill">میزبان</span>}
                                {p.isBot && (
                                  <span className="uiv3-mini-pill">
                                    بات{' '}
                                    {formatOnlineBotDifficultyFa(
                                      p.botDifficulty || currentRoom.botDifficulty || 'medium'
                                    )}
                                  </span>
                                )}
                                {isMe && <span className="uiv3-mini-pill is-accent">شما</span>}
                                {p.disconnected && (
                                  <span className="uiv3-mini-pill is-warn">قطع</span>
                                )}
                                {showVoiceInLobby && isSpeaking && (
                                  <span
                                    className="uiv3-speaking-dot"
                                    title="در حال صحبت"
                                    aria-label="در حال صحبت"
                                  />
                                )}
                              </div>

                              <div className="uiv3-roster-meta">
                                {showAdvancedLobbySettings && (
                                  <span className="uiv3-roster-ping" dir="ltr">
                                    {pPingText}
                                  </span>
                                )}

                                {showVoiceInLobby && !isMe && !p.isBot && onToggleMutePlayer && (
                                  <button
                                    type="button"
                                    data-testid={`btn-lobby-mute-${p.id}`}
                                    className={`uiv3-tiny-btn${isMuted ? ' is-danger' : ''}`}
                                    onClick={() => onToggleMutePlayer(p.id)}
                                    aria-label={
                                      isMuted ? `وصل صدای ${p.name}` : `قطع صدای ${p.name}`
                                    }
                                  >
                                    {isMuted ? 'بی‌صدا' : 'صدا'}
                                  </button>
                                )}

                                <span
                                  data-testid={`player-ready-status-${p.id}`}
                                  className={`uiv3-ready-pill${playerReady ? ' is-ready' : ''}`}
                                >
                                  {playerReady ? (
                                    <>
                                      <IconCheck size={11} />
                                      <span>آماده</span>
                                    </>
                                  ) : (
                                    'منتظر'
                                  )}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <GlassButton
                        variant={localIsReady ? 'accent' : 'secondary'}
                        size="md"
                        block
                        data-testid="btn-lobby-ready-toggle"
                        onClick={() => onToggleLobbyReady?.(!localIsReady)}
                      >
                        {localIsReady ? 'آماده هستم (لغو آمادگی)' : 'اعلام آمادگی برای شروع'}
                      </GlassButton>
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
                      const mythicSummary = getLobbyMythicSummary(currentRoom.players);

                      return (
                        <div className="uiv3-accordion">
                          <button
                            type="button"
                            data-testid="btn-host-settings-accordion"
                            className="uiv3-accordion-trigger"
                            aria-expanded={hostSettingsOpen}
                            onClick={() => setHostSettingsOpen((prev) => !prev)}
                          >
                            <div>
                              <div className="uiv3-group-title">
                                {isHost ? 'تنظیمات اتاق (میزبان)' : 'تنظیمات مسابقه'}
                              </div>
                              <div className="uiv3-setting-desc">
                                <BidiText
                                  text={
                                    isOgActive
                                      ? `${formatGameModeFa(currentRoom.mode)} · ${activeMapObj.nameFa}`
                                      : `${formatGameModeFa(currentRoom.mode)} · ${activeMapObj.nameFa} · ${curRoundDur}ث · ${curWinTarget} برد · ${curStartHp} HP`
                                  }
                                />
                              </div>
                            </div>
                            <span className="uiv3-accordion-chevron" aria-hidden="true">
                              {hostSettingsOpen ? '▲' : '▼'}
                            </span>
                          </button>

                          {hostSettingsOpen && (
                            <div data-testid="lobby-match-settings" className="uiv3-accordion-body">
                              <div className="uiv3-field">
                                <label htmlFor="online-mode-select">حالت بازی</label>
                                {isOgActive ? (
                                  <div
                                    className="uiv3-readonly-chip"
                                    data-testid="online-og-mode-locked"
                                  >
                                    <BidiText text={`${formatGameModeFa('og')} (فقط بازیکنان OG)`} />
                                  </div>
                                ) : (
                                  <select
                                    id="online-mode-select"
                                    data-testid="online-mode-select"
                                    className="uiv3-select uiv3-select-full"
                                    disabled={!isHost}
                                    value={activeMode}
                                    onChange={(e) =>
                                      handleModeSelectChange(e.target.value as OnlineGameMode)
                                    }
                                  >
                                    <option value="tdm_1v1">نبرد راندی 1v1</option>
                                    <option value="tdm_2v2">نبرد راندی 2v2</option>
                                    <option value="coop">همکاری تیمی (Co-Op)</option>
                                    <option value="pvp">نبرد آزاد (PvP)</option>
                                  </select>
                                )}
                              </div>

                              <div className="uiv3-field">
                                <label>{isHost ? 'نقشه مسابقه' : 'رأی به نقشه'}</label>
                                <div className="uiv3-online-map-grid">
                                  {availableMaps.map((m) => {
                                    const active = currentRoom.mapId === m.id;
                                    return (
                                      <button
                                        key={m.id}
                                        type="button"
                                        data-testid={`online-map-${m.id}`}
                                        className={`uiv3-online-map-tile${active ? ' is-selected' : ''}`}
                                        disabled={!isHost && !showAdvancedLobbySettings}
                                        onClick={() =>
                                          isHost ? onSelectMap(m.id) : onVoteMap?.(m.id)
                                        }
                                      >
                                        <strong>
                                          <BidiText text={m.nameFa} />
                                        </strong>
                                        <span>
                                          <BidiText text={m.badgeFa} />
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {showAdvancedLobbySettings && (
                                <div className="uiv3-host-rows">
                                  <div className="uiv3-host-row">
                                    <span>زمان هر راند</span>
                                    <div className="uiv3-chip-wrap">
                                      {isHost ? (
                                        ALLOWED_ROUND_DURATIONS.map((sec) => (
                                          <button
                                            key={sec}
                                            type="button"
                                            data-testid={`btn-host-round-dur-${sec}`}
                                            className={`uiv3-opt-chip${curRoundDur === sec ? ' is-active' : ''}`}
                                            onClick={() =>
                                              onUpdateMatchSettings?.({ roundDurationSec: sec })
                                            }
                                          >
                                            <bdi dir="ltr">{sec}s</bdi>
                                          </button>
                                        ))
                                      ) : (
                                        <span
                                          data-testid="client-match-round-dur"
                                          className="uiv3-readonly-chip"
                                        >
                                          {curRoundDur} ثانیه
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="uiv3-host-row">
                                    <span>برد لازم</span>
                                    <div className="uiv3-chip-wrap">
                                      {isHost ? (
                                        ALLOWED_WIN_TARGETS.map((wins) => (
                                          <button
                                            key={wins}
                                            type="button"
                                            data-testid={`btn-host-win-target-${wins}`}
                                            className={`uiv3-opt-chip${curWinTarget === wins ? ' is-active' : ''}`}
                                            onClick={() =>
                                              onUpdateMatchSettings?.({ targetWinRounds: wins })
                                            }
                                          >
                                            <bdi dir="ltr">{wins}</bdi>
                                          </button>
                                        ))
                                      ) : (
                                        <span
                                          data-testid="client-match-win-target"
                                          className="uiv3-readonly-chip"
                                        >
                                          {curWinTarget} برد
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="uiv3-host-row">
                                    <span>سلامت اولیه</span>
                                    <div className="uiv3-chip-wrap">
                                      {isHost ? (
                                        ALLOWED_STARTING_HP.map((hp) => (
                                          <button
                                            key={hp}
                                            type="button"
                                            data-testid={`btn-host-start-hp-${hp}`}
                                            className={`uiv3-opt-chip${curStartHp === hp ? ' is-active' : ''}`}
                                            onClick={() =>
                                              onUpdateMatchSettings?.({ startingHp: hp })
                                            }
                                          >
                                            <bdi dir="ltr">{hp} HP</bdi>
                                          </button>
                                        ))
                                      ) : (
                                        <span
                                          data-testid="client-match-start-hp"
                                          className="uiv3-readonly-chip"
                                        >
                                          <bdi dir="ltr">{curStartHp} HP</bdi>
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="uiv3-host-row">
                                    <span>
                                      <bdi dir="ltr" className="uiv3-bidi-ltr">
                                        Friendly Fire
                                      </bdi>
                                    </span>
                                    <div className="uiv3-chip-wrap">
                                      {isHost ? (
                                        <button
                                          type="button"
                                          data-testid="btn-host-toggle-ff"
                                          className={`uiv3-opt-chip${curFF ? ' is-danger' : ' is-active'}`}
                                          onClick={() =>
                                            onUpdateMatchSettings?.({ friendlyFire: !curFF })
                                          }
                                        >
                                          {curFF ? 'روشن' : 'خاموش'}
                                        </button>
                                      ) : (
                                        <span
                                          data-testid="client-match-ff"
                                          className="uiv3-readonly-chip"
                                        >
                                          {curFF ? 'روشن' : 'خاموش'}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {roundModeActive && (
                                    <div className="uiv3-host-row">
                                      <span>پر کردن با بات</span>
                                      <div className="uiv3-chip-wrap">
                                        {isHost ? (
                                          <>
                                            <button
                                              type="button"
                                              data-testid="btn-host-toggle-fill-bots"
                                              className={`uiv3-opt-chip${curFillBots ? ' is-active' : ''}`}
                                              onClick={() =>
                                                onUpdateMatchSettings?.({
                                                  fillBotsEnabled: !curFillBots,
                                                })
                                              }
                                            >
                                              {curFillBots ? 'فعال' : 'خاموش'}
                                            </button>
                                            {curFillBots &&
                                              ONLINE_BOT_DIFFICULTIES.map((diff) => (
                                                <button
                                                  key={diff}
                                                  type="button"
                                                  data-testid={`btn-host-bot-diff-${diff}`}
                                                  className={`uiv3-opt-chip${curBotDiff === diff ? ' is-active' : ''}`}
                                                  onClick={() =>
                                                    onUpdateMatchSettings?.({ botDifficulty: diff })
                                                  }
                                                >
                                                  {formatOnlineBotDifficultyFa(diff)}
                                                </button>
                                              ))}
                                          </>
                                        ) : (
                                          <span
                                            data-testid="client-match-bots"
                                            className="uiv3-readonly-chip"
                                          >
                                            {curFillBots
                                              ? `فعال (${formatOnlineBotDifficultyFa(curBotDiff)})`
                                              : 'خاموش'}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Room Rules: Aim Assist, Slide & Mythic Perks */}
                                  <div className="uiv3-host-row" data-testid="lobby-room-rules">
                                    <span>قوانین اتاق</span>
                                    <div className="uiv3-chip-wrap">
                                      {isHost ? (
                                        <>
                                          <button
                                            type="button"
                                            data-testid="btn-host-toggle-aim-assist"
                                            className={`uiv3-opt-chip${
                                              currentRoom.aimAssistAllowed !== false
                                                ? ' is-active'
                                                : ' is-danger'
                                            }`}
                                            onClick={() =>
                                              onUpdateRoomRules?.({
                                                aimAssistAllowed:
                                                  currentRoom.aimAssistAllowed === false,
                                              })
                                            }
                                          >
                                            <BidiText
                                              text={`Aim Assist: ${currentRoom.aimAssistAllowed !== false ? 'مجاز' : 'خاموش'}`}
                                            />
                                          </button>
                                          <button
                                            type="button"
                                            data-testid="btn-host-toggle-slide"
                                            className={`uiv3-opt-chip${
                                              currentRoom.slideAllowed !== false
                                                ? ' is-active'
                                                : ' is-danger'
                                            }`}
                                            onClick={() =>
                                              onUpdateRoomRules?.({
                                                slideAllowed: currentRoom.slideAllowed === false,
                                              })
                                            }
                                          >
                                            اسلاید:{' '}
                                            {currentRoom.slideAllowed !== false ? 'مجاز' : 'خاموش'}
                                          </button>
                                          <button
                                            type="button"
                                            data-testid="btn-host-toggle-mythic-perks"
                                            className={`uiv3-opt-chip${
                                              currentRoom.mythicPerksAllowed !== false
                                                ? ' is-mythic'
                                                : ' is-danger'
                                            }`}
                                            onClick={() =>
                                              onUpdateRoomRules?.({
                                                mythicPerksAllowed:
                                                  currentRoom.mythicPerksAllowed === false,
                                              })
                                            }
                                          >
                                            مزیت‌های میتیک:{' '}
                                            {currentRoom.mythicPerksAllowed !== false
                                              ? 'مجاز'
                                              : 'خاموش'}
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <span
                                            data-testid="client-rule-aim-assist"
                                            className="uiv3-readonly-chip"
                                          >
                                            Aim:{' '}
                                            {currentRoom.aimAssistAllowed !== false
                                              ? 'مجاز'
                                              : 'خاموش'}
                                          </span>
                                          <span
                                            data-testid="client-rule-slide"
                                            className="uiv3-readonly-chip"
                                          >
                                            اسلاید:{' '}
                                            {currentRoom.slideAllowed !== false ? 'مجاز' : 'خاموش'}
                                          </span>
                                          <span
                                            data-testid="client-rule-mythic-perks"
                                            className="uiv3-readonly-chip"
                                          >
                                            میتیک:{' '}
                                            {currentRoom.mythicPerksAllowed !== false
                                              ? 'مجاز'
                                              : 'خاموش'}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {currentRoom.mythicPerksAllowed !== false &&
                                    mythicSummary.allHolders.length > 0 && (
                                      <div
                                        className="uiv3-mythic-notice"
                                        data-testid="lobby-mythic-notice"
                                        role="status"
                                      >
                                        ✧ مزایای محدود میتیک در این اتاق مجاز است —{' '}
                                        {[
                                          mythicSummary.m249Holders.length > 0
                                            ? `میتیک M249 (${mythicSummary.m249Holders.join('، ')})`
                                            : '',
                                          mythicSummary.shotgunHolders.length > 0
                                            ? `میتیک SPAS-12 (${mythicSummary.shotgunHolders.join('، ')})`
                                            : '',
                                        ]
                                          .filter(Boolean)
                                          .join(' · ')}
                                      </div>
                                    )}
                                </div>
                              )}

                              {isHost && (
                                <div className="uiv3-host-rows">
                                  <div className="uiv3-host-row">
                                    <span>قفل اتاق</span>
                                    <button
                                      type="button"
                                      data-testid="btn-host-toggle-lock"
                                      className={`uiv3-opt-chip${currentRoom.isLocked ? ' is-danger' : ''}`}
                                      onClick={() => onToggleRoomLock?.(!currentRoom.isLocked)}
                                    >
                                      {currentRoom.isLocked ? 'قفل (ورود جدید بسته)' : 'باز'}
                                    </button>
                                  </div>

                                  <div className="uiv3-host-row">
                                    <span>رمز اتاق</span>
                                    <div className="uiv3-inline-input-pair">
                                      <input
                                        type="text"
                                        maxLength={16}
                                        placeholder={
                                          currentRoom.hasPassword
                                            ? 'تغییر یا خالی برای حذف'
                                            : 'بدون رمز'
                                        }
                                        value={hostPasswordEdit}
                                        onChange={(e) => setHostPasswordEdit(e.target.value)}
                                        className="uiv3-text-input"
                                      />
                                      <button
                                        type="button"
                                        data-testid="btn-host-save-password"
                                        className="uiv3-opt-chip is-active"
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
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Start Match CTA — enabled ONLY when players are ready */}
                    <div className="uiv3-lobby-cta">
                      <GlassButton
                        variant="primary"
                        size="lg"
                        block
                        data-testid="btn-start-online-match"
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
                      </GlassButton>
                    </div>
                  </div>
                ) : isDirectInviteMode ? (
                  /* =====================================================
                     VIEW 3: DIRECT INVITE LINK JOIN (#room=CODE)
                     ===================================================== */
                  <div data-testid="invite-direct-join-view" className="uiv3-glass-group">
                    <div className="uiv3-invite-banner">
                      <span>دعوت به اتاق</span>
                      <strong dir="ltr" data-testid="invite-prefilled-code">
                        {pendingInviteRoomCode}
                      </strong>
                    </div>

                    <div className="uiv3-field">
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
                        className="uiv3-text-input uiv3-input-full"
                      />
                    </div>

                    {showInvitePassword ? (
                      <div className="uiv3-field">
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
                          className="uiv3-text-input uiv3-input-full"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="uiv3-text-link"
                        onClick={() => setShowInvitePassword(true)}
                      >
                        اتاق رمز دارد؟ وارد کردن رمز
                      </button>
                    )}

                    <GlassButton
                      variant="primary"
                      size="lg"
                      block
                      data-testid="btn-join-room-code"
                      disabled={isConnecting}
                      onClick={handleJoinClick}
                    >
                      {isConnecting ? 'در حال ورود به اتاق...' : 'ورود به اتاق'}
                    </GlassButton>

                    <GlassButton
                      variant="subtle"
                      size="md"
                      block
                      onClick={() => {
                        onClearPendingInvite?.();
                        setHomeView('create');
                      }}
                    >
                      ساخت اتاق جدید یا ورود با کد دیگر
                    </GlassButton>
                  </div>
                ) : (
                  /* =====================================================
                     VIEW 4: CLEAN HOME (PLAYER NAME + CREATE / JOIN)
                     ===================================================== */
                  <div className="uiv3-online-home-grid">
                    {/* Right column in RTL: Player Name + Create/Join Mode Choice */}
                    <div className="uiv3-glass-group">
                      <div className="uiv3-field">
                        <label htmlFor="online-player-name">نام بازیکن</label>
                        <input
                          id="online-player-name"
                          data-testid="input-online-player-name"
                          type="text"
                          maxLength={16}
                          placeholder="نام اپراتور..."
                          value={playerName}
                          onChange={(e) => onChangePlayerName(e.target.value)}
                          className="uiv3-text-input uiv3-input-full"
                        />
                      </div>

                      <div className="uiv3-choice-pair">
                        <button
                          type="button"
                          data-testid="btn-online-home-create"
                          className={`uiv3-choice-card${homeView === 'create' ? ' is-active' : ''}`}
                          onClick={() => {
                            setLocalValidationError(null);
                            setHomeView('create');
                          }}
                        >
                          <strong>ساخت اتاق</strong>
                          <span>ایجاد اتاق و اشتراک‌گذاری لینک یا QR</span>
                        </button>
                        <button
                          type="button"
                          data-testid="btn-online-home-join"
                          className={`uiv3-choice-card${homeView === 'join' ? ' is-active' : ''}`}
                          onClick={() => {
                            setLocalValidationError(null);
                            setHomeView('join');
                          }}
                        >
                          <strong>ورود با کد</strong>
                          <span>ورود سریع با کد یا چسباندن لینک دعوت</span>
                        </button>
                      </div>
                    </div>

                    {/* Left column in RTL: Active Create or Join Subpanel */}
                    <div className="uiv3-glass-group">
                      {homeView === 'join' ? (
                        <div data-testid="online-join-panel" className="uiv3-subpanel-stack">
                          <div className="uiv3-field">
                            <label htmlFor="online-join-code">کد یا لینک اتاق</label>
                            <div className="uiv3-code-input-row">
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
                                className="uiv3-text-input uiv3-code-input"
                              />
                              <button
                                type="button"
                                data-testid="btn-paste-room-code"
                                className="uiv3-paste-btn"
                                onClick={() => void handlePasteCode()}
                              >
                                {copiedFeedback === 'paste' ? 'چسبانده شد' : 'چسباندن'}
                              </button>
                            </div>
                          </div>

                          <div className="uiv3-field">
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
                              className="uiv3-text-input uiv3-input-full"
                            />
                          </div>

                          <GlassButton
                            variant="primary"
                            size="lg"
                            block
                            data-testid="btn-join-room-code"
                            disabled={isConnecting}
                            onClick={handleJoinClick}
                          >
                            {isConnecting ? 'در حال اتصال به اتاق...' : 'ورود به اتاق'}
                          </GlassButton>

                          {publicRooms.length > 0 && (
                            <div className="uiv3-nearby-rooms">
                              <div className="uiv3-setting-desc">اتاق‌های فعال روی این دستگاه:</div>
                              {publicRooms.map((r) => (
                                <button
                                  key={r.code}
                                  type="button"
                                  className="uiv3-nearby-row"
                                  onClick={() => {
                                    setJoinCodeInput(r.code);
                                    onJoinRoom(r.code, roomPasswordInput.trim());
                                  }}
                                >
                                  <strong dir="ltr">{r.code}</strong>
                                  <span>
                                    {r.hostName || 'Host'} · {r.players.length} نفر
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div data-testid="online-create-panel" className="uiv3-subpanel-stack">
                          <div className="uiv3-field">
                            <label htmlFor="online-mode-select">حالت بازی</label>
                            {isOgActive ? (
                              <div
                                className="uiv3-readonly-chip"
                                data-testid="online-og-mode-locked"
                              >
                                <BidiText text={`${formatGameModeFa('og')} · فقط بازیکنان OG`} />
                              </div>
                            ) : (
                              <select
                                id="online-mode-select"
                                data-testid="online-mode-select"
                                className="uiv3-select uiv3-select-full"
                                value={onlineMode}
                                onChange={(e) =>
                                  handleModeSelectChange(e.target.value as OnlineGameMode)
                                }
                              >
                                <option value="tdm_1v1">نبرد راندی 1v1</option>
                                <option value="tdm_2v2">نبرد راندی 2v2</option>
                                <option value="coop">همکاری تیمی (Co-Op)</option>
                                <option value="pvp">نبرد آزاد (PvP)</option>
                              </select>
                            )}
                          </div>

                          <div className="uiv3-field">
                            <label>نقشه</label>
                            <div className="uiv3-online-map-grid">
                              {availableMaps.map((m) => {
                                const active = selectedMap === m.id;
                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    data-testid={`online-map-${m.id}`}
                                    className={`uiv3-online-map-tile${active ? ' is-selected' : ''}`}
                                    onClick={() => onSelectMap(m.id)}
                                  >
                                    <strong>
                                      <BidiText text={m.nameFa} />
                                    </strong>
                                    <span>
                                      <BidiText text={m.badgeFa} />
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="uiv3-field">
                            <label htmlFor="online-create-pass">رمز اتاق (اختیاری)</label>
                            <input
                              id="online-create-pass"
                              data-testid="input-room-password"
                              type="password"
                              maxLength={16}
                              placeholder="خالی = اتاق بدون رمز"
                              value={roomPasswordInput}
                              onChange={(e) => setRoomPasswordInput(e.target.value)}
                              className="uiv3-text-input uiv3-input-full"
                            />
                          </div>

                          <GlassButton
                            variant="primary"
                            size="lg"
                            block
                            data-testid="btn-create-online-room"
                            disabled={isConnecting}
                            onClick={handleCreateClick}
                          >
                            {isConnecting ? 'در حال ساخت اتاق...' : 'ساخت اتاق و دریافت کد'}
                          </GlassButton>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
