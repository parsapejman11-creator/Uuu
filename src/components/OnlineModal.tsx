import React, { useState, useEffect } from 'react';
import {
  MAP_LIST,
  MapId,
  OnlineGameMode,
  TeamId,
  RoundPhase,
  normalizeRoomCode,
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
} from '../game/rules';
import { PEERJS_BROKER_CONFIG, PEERJS_STUN_SERVERS } from '../game/peerConfig';
import {
  ConnectionDiagnosticsReport,
  LivePeerTelemetry,
  runConnectionDiagnostics,
} from '../game/peerDiagnostics';
import type { VoiceChatSnapshot } from '../game/voiceChat';
import { APP_VERSION } from '../game/version';

export interface OnlinePlayerSummary {
  id: string;
  name: string;
  kills: number;
  score?: number;
  hp: number;
  color: string;
  team?: TeamId;
  alive?: boolean;
  isHost?: boolean;
}

export interface OnlineRoomSummary {
  code: string;
  name: string;
  hasPassword?: boolean;
  mapId: MapId;
  mode: OnlineGameMode;
  hostId: string;
  hostName?: string;
  wave?: number;
  teamScore?: number;
  alphaScore?: number;
  bravoScore?: number;
  currentRound?: number;
  roundTimeRemainingSec?: number;
  roundPhase?: RoundPhase;
  roundWinnerTeam?: TeamId | 'draw' | null;
  matchWinnerTeam?: TeamId | null;
  targetWinRounds?: number;
  appVersion?: string;
  playerCount: number;
  players: OnlinePlayerSummary[];
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
  onSelectMap: (mapId: MapId) => void;
  onCreateRoom: (mapId: MapId, mode: OnlineGameMode, password: string) => void;
  onChangeGameMode?: (mode: OnlineGameMode) => void;
  onSwitchTeam?: (playerId?: string) => void;
  onJoinRoom: (roomCode: string, password: string) => void;
  onLeaveRoom: () => void;
  onStartOnlineMatch: () => void;
  onGetDiagnosticsTelemetry?: () => Promise<LivePeerTelemetry>;
  voiceState?: VoiceChatSnapshot;
  localPlayerId?: string;
  onToggleMutePlayer?: (playerId: string) => void;
  onClose: () => void;
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
  onSelectMap,
  onCreateRoom,
  onChangeGameMode,
  onSwitchTeam,
  onJoinRoom,
  onLeaveRoom,
  onStartOnlineMatch,
  onGetDiagnosticsTelemetry,
  voiceState,
  localPlayerId,
  onToggleMutePlayer,
  onClose,
}) => {
  const [joinCodeInput, setJoinCodeInput] = useState(pendingInviteRoomCode || '');
  const [roomPasswordInput, setRoomPasswordInput] = useState('');
  const [onlineMode, setOnlineMode] = useState<OnlineGameMode>(currentRoom?.mode || 'tdm_1v1');
  const [copiedType, setCopiedType] = useState<'code' | 'link' | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagReport, setDiagReport] = useState<ConnectionDiagnosticsReport | null>(null);

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
    }
  }, [pendingInviteRoomCode]);

  useEffect(() => {
    if (currentRoom?.mode) {
      setOnlineMode(currentRoom.mode);
    }
  }, [currentRoom?.mode]);

  const statusInfo = formatConnectionStatusFa(peerStatus, peerRole, roomError);
  const standaloneBaseUrl = getCurrentOriginShareBaseUrl(window.location.origin, window.location.pathname);
  const activeCodeForUrl = currentRoom?.code || normalizeRoomCode(joinCodeInput) || 'BC-HD7P';
  const shareUrl = buildRoomInviteUrl(
    standaloneBaseUrl,
    activeCodeForUrl,
    currentRoom?.mapId || selectedMap
  );

  const copyText = (text: string, type: 'code' | 'link') => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedType(type);
    window.setTimeout(() => setCopiedType(null), 1800);
  };

  const handleCreateClick = () => {
    onCreateRoom(selectedMap, onlineMode, roomPasswordInput.trim());
  };

  const handleModeSelectChange = (nextMode: OnlineGameMode) => {
    setOnlineMode(nextMode);
    if (currentRoom && peerRole === 'host') {
      onChangeGameMode?.(nextMode);
    }
  };

  const handleJoinClick = () => {
    const trimmedCode = joinCodeInput.trim();
    if (trimmedCode) {
      onJoinRoom(normalizeRoomCode(trimmedCode), roomPasswordInput.trim());
    } else if (publicRooms.length > 0) {
      onJoinRoom(publicRooms[0].code, roomPasswordInput.trim());
    } else {
      onJoinRoom('BC-1111', roomPasswordInput.trim());
    }
  };

  const activeMode = currentRoom?.mode || onlineMode;
  const roundModeActive = isRoundBasedMode(activeMode);

  return (
    <div
      id="online-screen"
      className="overlay-screen"
      role="dialog"
      aria-modal="true"
      aria-label="Online Multiplayer Lobby"
    >
      <div className="panel-card training-modal-card" dir="rtl">
        <div className="training-modal-header">
          <div>
            <div className="game-logo" style={{ fontSize: '19px' }}>
              لابی آنلاین چندنفره بدون سرور · <span>PEERJS WEBRTC</span>
            </div>
            <div className="game-subtitle" style={{ marginBottom: 0 }}>
              اتصال مستقیم نظیربه‌نظیر (P2P) با {PEERJS_STUN_SERVERS.length} سرور STUN عمومی — میزبان (Host) نقشه و حالت بازی (1v1 / 2v2 راندی یا بقا) را انتخاب می‌کند
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center', marginTop: '8px' }}>
            <button
              type="button"
              data-testid="btn-open-diagnostics"
              className="preset-chip"
              style={{
                borderColor: showDiagnostics ? 'rgba(56, 189, 248, 0.7)' : 'rgba(245, 158, 11, 0.6)',
                background: showDiagnostics ? 'rgba(56, 189, 248, 0.2)' : 'rgba(245, 158, 11, 0.14)',
                color: showDiagnostics ? '#7dd3fc' : '#fcd34d',
                fontWeight: 800,
              }}
              onClick={() => setShowDiagnostics((prev) => !prev)}
            >
              {showDiagnostics ? 'بازگشت به لابی' : 'تشخیص اتصال'}
            </button>
            <button
              type="button"
              data-testid="btn-close-online-modal"
              className="icon-close-btn"
              style={{ position: 'static', margin: 0 }}
              onClick={onClose}
              aria-label="Close Online Modal"
            >
              بستن
            </button>
          </div>
        </div>

        {showDiagnostics ? (
          <div data-testid="connection-diagnostics-panel" style={{ marginTop: '8px' }}>
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                borderRadius: '10px',
                padding: '12px',
                marginBottom: '10px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginBottom: '10px',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 900, color: '#38bdf8' }}>
                    صفحه تشخیص اتصال (PeerJS & WebRTC)
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    بررسی زنده سرور واسطه سیگنالینگ، وضعیت ICE، کاندیداهای STUN و نوع ارتباط P2P
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="btn-run-diagnostics"
                  className="preset-chip"
                  disabled={diagRunning}
                  style={{
                    borderColor: 'rgba(16, 185, 129, 0.65)',
                    background: 'rgba(16, 185, 129, 0.18)',
                    color: '#6ee7b7',
                    fontWeight: 800,
                  }}
                  onClick={() => void handleRunDiagnostics()}
                >
                  {diagRunning ? 'در حال بررسی شبکه...' : 'اجرای مجدد تست اتصال'}
                </button>
              </div>

              {diagRunning && !diagReport ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#7dd3fc', fontSize: '12px' }}>
                  در حال بررسی دسترسی به سرور واسطه ({PEERJS_BROKER_CONFIG.host}) و جمع‌آوری کاندیداهای ICE...
                </div>
              ) : diagReport ? (
                <div style={{ display: 'grid', gap: '8px' }}>
                  {/* 1. PeerJS Broker Status */}
                  <div
                    data-testid="diag-broker-row"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'rgba(6, 12, 24, 0.85)',
                      border: `1px solid ${
                        diagReport.brokerReachability === 'reachable'
                          ? 'rgba(16, 185, 129, 0.5)'
                          : 'rgba(244, 63, 94, 0.55)'
                      }`,
                    }}
                  >
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#f1f5f9' }}>
                        ۱. سرور واسطه (PeerJS Broker)
                      </div>
                      <div
                        dir="ltr"
                        style={{
                          fontSize: '10.5px',
                          color: '#94a3b8',
                          fontFamily: 'monospace',
                          textAlign: 'right',
                        }}
                      >
                        {diagReport.brokerHost}:{PEERJS_BROKER_CONFIG.port} (
                        {PEERJS_BROKER_CONFIG.secure ? 'WSS/HTTPS' : 'WS/HTTP'})
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 900,
                        color: diagReport.brokerReachability === 'reachable' ? '#10b981' : '#f43f5e',
                      }}
                    >
                      {diagReport.brokerReachability === 'reachable' ? '✓ ' : '✕ '}
                      {diagReport.brokerDetailFa}
                    </div>
                  </div>

                  {/* 2. ICE & STUN Status */}
                  <div
                    data-testid="diag-ice-row"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'rgba(6, 12, 24, 0.85)',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                    }}
                  >
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#f1f5f9' }}>
                        ۲. وضعیت ICE و سرورهای STUN
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                        کاندیدای عمومی STUN (srflx): <b style={{ color: '#38bdf8' }}>{diagReport.stunCandidatesCount}</b> ·
                        محلی (host): <b style={{ color: '#cbd5e1' }}>{diagReport.hostCandidatesCount}</b> · رله (relay):{' '}
                        <b style={{ color: '#fbbf24' }}>{diagReport.relayCandidatesCount}</b>
                      </div>
                    </div>
                    <div
                      dir="ltr"
                      style={{ textAlign: 'left', fontFamily: 'monospace', fontSize: '11px', color: '#7dd3fc' }}
                    >
                      ICE: {diagReport.iceState} / {diagReport.iceGatheringState}
                    </div>
                  </div>

                  {/* 3. Connection Type (Direct vs Relay) */}
                  <div
                    data-testid="diag-type-row"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'rgba(6, 12, 24, 0.85)',
                      border: `1px solid ${
                        diagReport.connectionType === 'direct_p2p'
                          ? 'rgba(16, 185, 129, 0.5)'
                          : 'rgba(245, 158, 11, 0.5)'
                      }`,
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#f1f5f9' }}>
                      ۳. نوع اتصال (مستقیم / رله)
                    </div>
                    <div
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 900,
                        color:
                          diagReport.connectionType === 'direct_p2p'
                            ? '#10b981'
                            : diagReport.connectionType === 'relay_turn' ||
                                diagReport.connectionType === 'local_only'
                              ? '#fbbf24'
                              : '#f43f5e',
                      }}
                    >
                      {diagReport.connectionTypeLabelFa}
                    </div>
                  </div>

                  {/* 4. Voice Chat & Microphone Status */}
                  {voiceState && (
                    <div
                      data-testid="diag-voice-row"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '6px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        background: 'rgba(6, 12, 24, 0.85)',
                        border: `1px solid ${
                          voiceState.lastErrorFa || !voiceState.secureContextOk
                            ? 'rgba(244, 63, 94, 0.55)'
                            : voiceState.micEnabled || voiceState.connectedCallCount > 0
                              ? 'rgba(16, 185, 129, 0.55)'
                              : 'rgba(56, 189, 248, 0.35)'
                        }`,
                      }}
                    >
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#f1f5f9' }}>
                          ۴. چت صوتی (Voice Chat · WebRTC)
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                          بستر امن HTTPS:{' '}
                          <b style={{ color: voiceState.secureContextOk ? '#10b981' : '#f43f5e' }}>
                            {voiceState.secureContextOk ? 'فعال (امن)' : 'غیرامن (فقط روی HTTPS)'}
                          </b>{' '}
                          · تماس صوتی برقرار:{' '}
                          <b style={{ color: '#38bdf8' }}>{voiceState.connectedCallCount} نفر</b>
                          {voiceState.autoplayBlocked && (
                            <span style={{ color: '#fbbf24' }}> · نیاز به لمس صفحه برای پخش صدا</span>
                          )}
                        </div>
                        {voiceState.lastErrorFa && (
                          <div
                            data-testid="diag-voice-error"
                            style={{ fontSize: '10.5px', color: '#fda4af', marginTop: '3px', fontWeight: 700 }}
                          >
                            خطای صدا: {voiceState.lastErrorFa}
                          </div>
                        )}
                      </div>
                      <div
                        data-testid="diag-voice-status-badge"
                        style={{
                          fontSize: '11px',
                          fontWeight: 900,
                          color:
                            voiceState.micStatus === 'error' || !voiceState.secureContextOk
                              ? '#f43f5e'
                              : voiceState.micStatus === 'active'
                                ? '#10b981'
                                : voiceState.micStatus === 'ptt_ready'
                                  ? '#38bdf8'
                                  : '#cbd5e1',
                        }}
                      >
                        {!voiceState.secureContextOk
                          ? '✕ فقط روی HTTPS'
                          : voiceState.micStatus === 'active'
                            ? '● میکروفون روشن (در حال ارسال)'
                            : voiceState.micStatus === 'ptt_ready'
                              ? '◉ میکروفون آماده (Push-to-Talk)'
                              : voiceState.micStatus === 'requesting'
                                ? '… در حال درخواست دسترسی'
                                : voiceState.micStatus === 'error'
                                  ? '✕ خطای میکروفون'
                                  : '○ میکروفون خاموش'}
                      </div>
                    </div>
                  )}

                  {/* 5. Persian Failure Diagnosis (if any error/blocker exists) */}
                  {diagReport.failureReasonFa ? (
                    <div
                      data-testid="diag-failure-reason"
                      style={{
                        background: 'rgba(244, 63, 94, 0.14)',
                        border: '1px solid rgba(244, 63, 94, 0.55)',
                        borderRadius: '8px',
                        padding: '9px 11px',
                        color: '#fecdd3',
                        fontSize: '11.5px',
                        lineHeight: 1.6,
                        fontWeight: 700,
                      }}
                    >
                      علت احتمالی عدم اتصال: {diagReport.failureReasonFa}
                    </div>
                  ) : (
                    <div
                      data-testid="diag-healthy-notice"
                      style={{
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.45)',
                        borderRadius: '8px',
                        padding: '8px 11px',
                        color: '#a7f3d0',
                        fontSize: '11.5px',
                        fontWeight: 700,
                      }}
                    >
                      ✓ شبکه شما برای اتصال مستقیم P2P با PeerJS آماده است (بررسی‌شده در {diagReport.checkedAt}).
                    </div>
                  )}

                  {/* Active STUN List Summary */}
                  <div
                    style={{
                      background: 'rgba(6, 12, 24, 0.7)',
                      border: '1px solid rgba(148, 163, 184, 0.25)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      fontSize: '10px',
                      color: '#94a3b8',
                    }}
                  >
                    <div style={{ fontWeight: 800, color: '#cbd5e1', marginBottom: '4px' }}>
                      سرورهای STUN پیکربندی‌شده ({PEERJS_STUN_SERVERS.length} سرور — شامل غیرگوگل و گوگل):
                    </div>
                    <div style={{ fontFamily: 'monospace', direction: 'ltr', textAlign: 'left', lineHeight: 1.5 }}>
                      {PEERJS_STUN_SERVERS.map((s) => s.urls).join(' · ')}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="training-modal-footer" style={{ marginTop: '10px' }}>
              <button
                type="button"
                data-testid="btn-diagnostics-back"
                className="primary-btn"
                onClick={() => setShowDiagnostics(false)}
              >
                بازگشت به لابی آنلاین
              </button>
            </div>
          </div>
        ) : (
          <>

        {/* Live Connection Status Banner */}
        <div
          data-testid="online-connection-status"
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: `1px solid ${statusInfo.color}`,
            borderRadius: '8px',
            padding: '8px 12px',
            marginBottom: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: statusInfo.color,
                boxShadow: `0 0 8px ${statusInfo.color}`,
                display: 'inline-block',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: statusInfo.color }}>
                وضعیت اتصال: {statusInfo.badgeFa}
              </span>
              <span style={{ fontSize: '10.5px', color: '#cbd5e1' }}>{statusInfo.labelFa}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {peerRole !== 'none' && (
              <span
                data-testid="online-peer-role"
                style={{
                  fontSize: '10.5px',
                  fontWeight: 900,
                  padding: '3px 8px',
                  borderRadius: '5px',
                  background: peerRole === 'host' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                  color: peerRole === 'host' ? '#6ee7b7' : '#7dd3fc',
                  border: `1px solid ${peerRole === 'host' ? 'rgba(16,185,129,0.5)' : 'rgba(56,189,248,0.5)'}`,
                }}
              >
                {peerRole === 'host' ? 'میزبان اصلی (HOST)' : 'متصل به میزبان (CLIENT)'}
              </span>
            )}
            <span
              style={{
                fontSize: '10px',
                color: '#94a3b8',
                background: 'rgba(255,255,255,0.05)',
                padding: '3px 7px',
                borderRadius: '5px',
                fontFamily: 'monospace',
              }}
            >
              {APP_VERSION} · {PEERJS_STUN_SERVERS.length} STUN
            </span>
          </div>
        </div>

        {/* Invite Link (?room=CODE) Share Bar */}
        <div
          style={{
            background: 'rgba(14, 165, 233, 0.09)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            borderRadius: '8px',
            padding: '8px 10px',
            marginBottom: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 700 }}>
              لینک دعوت مستقیم اتاق (قابل ارسال برای دوست — با پارامتر <code style={{ color: '#38bdf8' }}>?room={activeCodeForUrl}</code>):
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                type="button"
                data-testid="btn-copy-invite-link"
                className="preset-chip"
                style={{
                  borderColor: 'rgba(56, 189, 248, 0.65)',
                  color: '#38bdf8',
                  background: 'rgba(56, 189, 248, 0.16)',
                  fontWeight: 800,
                }}
                onClick={() => copyText(shareUrl, 'link')}
              >
                {copiedType === 'link' ? 'لینک دعوت کپی شد!' : 'کپی لینک اتاق (?room=CODE)'}
              </button>
            </div>
          </div>
          <input
            type="text"
            readOnly
            aria-label="Room Invite Link URL"
            data-testid="input-standalone-chrome-url"
            value={shareUrl}
            onClick={(e) => e.currentTarget.select()}
            style={{
              width: '100%',
              background: '#050911',
              color: '#7dd3fc',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '5px',
              padding: '5px 8px',
              fontSize: '11px',
              fontFamily: 'monospace',
              direction: 'ltr',
            }}
          />
        </div>

        {/* Player Callsign Row */}
        <div className="setting-row" style={{ marginBottom: '8px' }}>
          <label htmlFor="online-player-name">نام نمایشی شما در بازی آنلاین</label>
          <input
            id="online-player-name"
            data-testid="input-online-player-name"
            type="text"
            maxLength={16}
            placeholder="نام اپراتور..."
            value={playerName}
            onChange={(e) => onChangePlayerName(e.target.value)}
            style={{
              background: '#0b1018',
              color: '#6ee7b7',
              border: '1px solid rgba(16,185,129,0.5)',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '13px',
              fontWeight: 800,
              width: '150px',
            }}
          />
        </div>

        {roomError && (
          <div
            data-testid="online-room-error"
            style={{
              background: 'rgba(244, 63, 94, 0.14)',
              border: '1px solid rgba(244, 63, 94, 0.5)',
              color: '#fda4af',
              borderRadius: '6px',
              padding: '7px 10px',
              fontSize: '11.5px',
              marginBottom: '10px',
              fontWeight: 700,
            }}
          >
            {roomError}
          </div>
        )}

        {/* Map Selection (Host controls map & syncs to all players) */}
        <div className="settings-section-title">
          <span>
            ۱. انتخاب نقشه عملیات{' '}
            {currentRoom && peerRole === 'client' ? '(توسط میزبان همگام می‌شود)' : '(همگام‌سازی خودکار با همه بازیکنان)'}
          </span>
        </div>

        <div className="training-weapons-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {MAP_LIST.map((m) => {
            const active = (currentRoom?.mapId || selectedMap) === m.id;
            const disabledForClient = Boolean(currentRoom && peerRole === 'client');
            return (
              <button
                key={m.id}
                type="button"
                data-testid={`online-map-${m.id}`}
                disabled={disabledForClient}
                className={`training-weapon-card ${active ? 'selected' : ''}`}
                onClick={() => onSelectMap(m.id)}
                style={{
                  borderColor: active ? m.accentColor : undefined,
                  textAlign: 'right',
                  alignItems: 'flex-start',
                  opacity: disabledForClient && !active ? 0.55 : 1,
                }}
              >
                <div className="tw-top" style={{ width: '100%' }}>
                  <span
                    className="tw-check"
                    style={{
                      background: active ? m.accentColor : 'rgba(255,255,255,0.08)',
                      color: active ? '#041019' : '#94a3b8',
                      padding: '1px 6px',
                      width: 'auto',
                      fontSize: '10px',
                    }}
                  >
                    {m.badgeFa}
                  </span>
                </div>
                <strong style={{ color: active ? m.accentColor : '#f1f5f9', fontSize: '12px' }}>
                  {m.nameFa}
                </strong>
                <small style={{ fontSize: '10px', lineHeight: 1.35 }}>{m.subtitleFa}</small>
              </button>
            );
          })}
        </div>

        {/* Game Mode Selector (Always visible so Host can pick 1v1 / 2v2 / Co-op / PvP before or after creating room) */}
        <div className="setting-row" style={{ marginTop: '8px' }}>
          <label htmlFor="online-mode-select">
            نوع بازی آنلاین (حالت تیمی راندی Call of Duty یا بقا)
          </label>
          <select
            id="online-mode-select"
            data-testid="online-mode-select"
            disabled={Boolean(currentRoom && peerRole === 'client')}
            value={activeMode}
            onChange={(e) => handleModeSelectChange(e.target.value as OnlineGameMode)}
          >
            <option value="tdm_1v1">نبرد تیمی راندی 1v1 — Call of Duty (تا {ROUND_MATCH_WIN_SCORE} راند · بدون Friendly Fire)</option>
            <option value="tdm_2v2">نبرد تیمی راندی 2v2 — Call of Duty (تا {ROUND_MATCH_WIN_SCORE} راند · بدون Friendly Fire)</option>
            <option value="coop">همکاری تیمی + بات‌ها (Co-Op Survival)</option>
            <option value="pvp">نبرد آزاد بازیکنان + بات‌ها (Free-For-All PvP)</option>
          </select>
        </div>

        {/* Active Room Box (If Hosting or Joined) */}
        {currentRoom ? (
          <div
            data-testid="active-online-room-box"
            style={{
              background: 'rgba(16, 185, 129, 0.09)',
              border: '1px solid rgba(16, 185, 129, 0.5)',
              borderRadius: '8px',
              padding: '12px',
              marginTop: '10px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '8px',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: '#6ee7b7', fontWeight: 700 }}>
                  {peerRole === 'host'
                    ? 'شما میزبان (Host) این اتاق هستید — کد زیر را به دوستتان بدهید:'
                    : `متصل به اتاق میزبان (${currentRoom.hostName || 'Host'}) · ${formatGameModeFa(currentRoom.mode)}:`}
                </div>
                <div
                  data-testid="online-room-code-display"
                  style={{
                    fontSize: '22px',
                    fontWeight: 900,
                    color: '#38bdf8',
                    letterSpacing: '2px',
                    fontFamily: 'monospace',
                    marginTop: '2px',
                  }}
                >
                  <span data-testid="online-room-code">{currentRoom.code}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  data-testid="btn-switch-team"
                  className="preset-chip"
                  style={{
                    borderColor: 'rgba(245, 158, 11, 0.65)',
                    color: '#fcd34d',
                    background: 'rgba(245, 158, 11, 0.16)',
                    fontWeight: 800,
                  }}
                  onClick={() => onSwitchTeam?.()}
                >
                  تغییر تیم (آلفا ⇄ براوو)
                </button>
                <button
                  type="button"
                  data-testid="btn-copy-room-code"
                  className="preset-chip"
                  style={{
                    borderColor: 'rgba(56, 189, 248, 0.6)',
                    color: '#38bdf8',
                    background: 'rgba(56, 189, 248, 0.15)',
                    fontWeight: 800,
                  }}
                  onClick={() => copyText(currentRoom.code, 'code')}
                >
                  {copiedType === 'code' ? 'کد کپی شد!' : 'کپی کد اتاق'}
                </button>
                <button
                  type="button"
                  className="preset-chip"
                  style={{
                    borderColor: 'rgba(16, 185, 129, 0.5)',
                    color: '#6ee7b7',
                    background: 'rgba(16, 185, 129, 0.12)',
                  }}
                  onClick={() => copyText(shareUrl, 'link')}
                >
                  {copiedType === 'link' ? 'لینک کپی شد!' : 'کپی لینک دعوت'}
                </button>
                <button
                  type="button"
                  data-testid="btn-leave-online-room"
                  className="preset-chip"
                  style={{
                    borderColor: 'rgba(244, 63, 94, 0.45)',
                    color: '#fda4af',
                  }}
                  onClick={onLeaveRoom}
                >
                  قطع اتصال / خروج
                </button>
              </div>
            </div>

            {roundModeActive && (
              <div
                data-testid="lobby-round-summary"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  marginBottom: '8px',
                  fontSize: '11.5px',
                  fontWeight: 800,
                }}
              >
                <span style={{ color: '#38bdf8' }}>
                  تیم آلفا (آبی): {currentRoom.alphaScore ?? 0}
                </span>
                <span style={{ color: '#fbbf24' }}>
                  راند {currentRoom.currentRound ?? 1} · هدف: {currentRoom.targetWinRounds ?? ROUND_MATCH_WIN_SCORE} راند (Friendly Fire: خاموش)
                </span>
                <span style={{ color: '#f43f5e' }}>
                  تیم براوو (قرمز): {currentRoom.bravoScore ?? 0}
                </span>
              </div>
            )}

            <div style={{ fontSize: '12px', color: '#f1f5f9', marginBottom: '6px' }}>
              بازیکنان همگام‌شده در اتاق ({currentRoom.players.length} نفر):
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {currentRoom.players.map((p) => {
                const pTeam: TeamId = p.team || 'alpha';
                const teamColor = getTeamColor(pTeam);
                const isSpeaking = Boolean(voiceState?.speakingPlayerIds.includes(p.id));
                const isMuted = Boolean(voiceState?.mutedPlayerIds.includes(p.id));
                const isMe = Boolean(localPlayerId && p.id === localPlayerId);
                return (
                  <span
                    key={p.id}
                    data-testid={`lobby-player-${p.id}`}
                    style={{
                      background: isSpeaking ? 'rgba(16, 185, 129, 0.16)' : 'rgba(15, 23, 36, 0.92)',
                      border: `1px solid ${isSpeaking ? '#10b981' : teamColor}`,
                      borderRadius: '6px',
                      padding: '4px 9px',
                      fontSize: '11px',
                      color: '#ffffff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      boxShadow: isSpeaking ? '0 0 10px rgba(16, 185, 129, 0.35)' : undefined,
                    }}
                  >
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontWeight: 900,
                        background: pTeam === 'alpha' ? 'rgba(56,189,248,0.22)' : 'rgba(244,63,94,0.22)',
                        color: teamColor,
                        padding: '1px 5px',
                        borderRadius: '4px',
                      }}
                    >
                      {pTeam === 'alpha' ? 'ALPHA' : 'BRAVO'}
                    </span>
                    {isSpeaking && (
                      <span
                        data-testid={`lobby-speaking-dot-${p.id}`}
                        title="در حال صحبت"
                        className="voice-speaking-badge"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a1 1 0 1 0-2 0 3 3 0 0 1-6 0 1 1 0 1 0-2 0 5 5 0 0 0 4 4.9V19H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-3.1A5 5 0 0 0 17 11z" />
                        </svg>
                      </span>
                    )}
                    <b style={{ color: teamColor }}>{p.name}</b>
                    {p.id === currentRoom.hostId && (
                      <span
                        style={{
                          fontSize: '9px',
                          background: 'rgba(16,185,129,0.2)',
                          color: '#6ee7b7',
                          padding: '1px 5px',
                          borderRadius: '4px',
                        }}
                      >
                        HOST
                      </span>
                    )}
                    <span style={{ color: '#94a3b8' }}>
                      HP {p.hp} · {p.kills} Kill
                    </span>
                    {!isMe && onToggleMutePlayer && (
                      <button
                        type="button"
                        data-testid={`lobby-mute-player-${p.id}`}
                        onClick={() => onToggleMutePlayer(p.id)}
                        title={isMuted ? 'وصل صدای بازیکن' : 'قطع صدای بازیکن'}
                        style={{
                          background: isMuted ? 'rgba(244, 63, 94, 0.22)' : 'rgba(148, 163, 184, 0.14)',
                          border: `1px solid ${isMuted ? 'rgba(244, 63, 94, 0.55)' : 'rgba(148, 163, 184, 0.35)'}`,
                          color: isMuted ? '#fda4af' : '#cbd5e1',
                          borderRadius: '4px',
                          padding: '1px 5px',
                          fontSize: '9.5px',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        {isMuted ? 'میوت' : 'صدا'}
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            <div className="settings-section-title">
              <span>۲. ساخت اتاق به‌عنوان میزبان (Host) یا ورود با کد اتاق</span>
            </div>

            <div className="setting-row" style={{ marginTop: '6px' }}>
              <label htmlFor="online-room-password">رمز اتاق (اختیاری — خالی بگذارید تا بدون رمز باشد)</label>
              <input
                id="online-room-password"
                data-testid="input-online-room-password"
                type="text"
                maxLength={16}
                placeholder="بدون رمز"
                value={roomPasswordInput}
                onChange={(e) => setRoomPasswordInput(e.target.value)}
                style={{
                  background: '#0b1018',
                  color: '#38bdf8',
                  border: '1px solid rgba(56,189,248,0.4)',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  textAlign: 'center',
                  width: '130px',
                }}
              />
            </div>

            {/* Host Room Action */}
            <div style={{ marginTop: '8px' }}>
              <button
                type="button"
                data-testid="btn-create-online-room"
                className="primary-btn"
                style={{ marginTop: 0, padding: '11px', width: '100%' }}
                onClick={handleCreateClick}
              >
                ساخت اتاق جدید (شدن به عنوان Host و دریافت کد اتاق)
              </button>
            </div>

            {/* Join Room by Code Action */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <input
                type="text"
                data-testid="input-join-room-code"
                placeholder="کد اتاق میزبان را وارد کنید (مثلاً BC-HD7P)"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleJoinClick();
                  }
                }}
                style={{
                  flex: 1,
                  background: '#0b1018',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.45)',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  fontSize: '13px',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  textAlign: 'center',
                  direction: 'ltr',
                }}
              />
              <button
                type="button"
                data-testid="btn-join-room-code"
                className="training-cta-btn"
                style={{
                  marginTop: 0,
                  width: 'auto',
                  padding: '8px 18px',
                  borderColor: 'rgba(16, 185, 129, 0.55)',
                  background: 'rgba(16, 185, 129, 0.16)',
                  color: '#6ee7b7',
                }}
                onClick={handleJoinClick}
              >
                اتصال به اتاق (Join)
              </button>
            </div>
          </>
        )}

        <div className="training-modal-footer" style={{ marginTop: '14px' }}>
          <button
            type="button"
            data-testid="btn-launch-online-match"
            className="primary-btn"
            onClick={() => {
              if (!currentRoom) {
                onCreateRoom(selectedMap, onlineMode, roomPasswordInput.trim());
              }
              onStartOnlineMatch();
            }}
          >
            ورود به میدان نبرد آنلاین ({MAP_LIST.find((m) => m.id === (currentRoom?.mapId || selectedMap))?.nameFa} · {formatGameModeFa(activeMode)})
          </button>
          <button type="button" className="secondary-btn" onClick={onClose}>
            بازگشت
          </button>
        </div>
          </>
        )}
      </div>
    </div>
  );
};
