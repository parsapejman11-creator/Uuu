import React from 'react';
import {
  getTeamColor,
  getTeamNameFa,
  type OnlineGameMode,
  type RoundPhase,
  type TeamId,
} from '../game/rules';
import {
  resolveHudV3Countdown,
  resolveHudV3Reconnect,
  resolveHudV3RoundBar,
  resolveHudV3Spectator,
  type HudV3ReconnectPlayer,
} from './hudV3Helpers';

/* ============================================================================
   UI v3 STAGE 3 — ISOLATED, MEMOIZED CHEAP-GLASS HUD STATUS COMPONENTS
   - Zero `backdrop-filter`, zero `filter`
   - Only slow-changing states (1-15 Hz or event-driven); fast values (HP/Ammo/
     Crosshair/Hitmarker) stay on direct cached DOM refs with zero React renders.
   - Each sub-component is independently wrapped in React.memo.
   ============================================================================ */

export interface RoundBarV3Props {
  playMode: 'campaign' | 'training';
  mode: OnlineGameMode | null;
  alphaScore?: number;
  bravoScore?: number;
  currentRound?: number;
  targetWinRounds?: number;
  roundPhase?: RoundPhase;
  roundTimeRemainingSec?: number;
  roundCountdownSec: number;
  matchWinnerTeam?: TeamId | null;
}

export const RoundBarV3: React.FC<RoundBarV3Props> = React.memo(
  ({
    playMode,
    mode,
    alphaScore,
    bravoScore,
    currentRound,
    targetWinRounds,
    roundPhase,
    roundTimeRemainingSec,
    roundCountdownSec,
    matchWinnerTeam,
  }) => {
    const view = resolveHudV3RoundBar({
      playMode,
      mode,
      alphaScore,
      bravoScore,
      currentRound,
      targetWinRounds,
      roundPhase,
      roundTimeRemainingSec,
      roundCountdownSec,
      matchWinnerTeam,
    });
    if (!view.visible) return null;

    const clockColor =
      view.clockTone === 'countdown'
        ? '#7dd3fc'
        : view.clockTone === 'urgent'
          ? '#ff5e57'
          : view.clockTone === 'winner'
            ? '#fde68a'
            : '#f8fbff';

    return (
      <div
        id="hud-cod-round-bar"
        data-testid="hud-cod-round-bar"
        className="hud-cod-round-bar uiv3-hud-round-bar"
        dir="rtl"
      >
        <div className="cod-team-chip alpha">
          <span className="cod-team-dot" style={{ background: getTeamColor('alpha') }} />
          <span className="cod-team-label cod-label-full">{getTeamNameFa('alpha')}</span>
          <span className="cod-team-label cod-label-short">آلفا</span>
          <strong className="cod-team-score" data-testid="hud-alpha-score" dir="ltr">
            {view.alphaScore}
          </strong>
        </div>

        <div className="cod-center-meta">
          <span className="cod-round-tag" data-testid="hud-round-number">
            {view.roundTextFa}
          </span>
          <span className="hud-sep" aria-hidden="true">
            ·
          </span>
          <span
            className="cod-round-clock"
            data-testid="hud-round-timer"
            dir="ltr"
            style={{ color: clockColor }}
          >
            {view.clockTextFa}
          </span>
        </div>

        <div className="cod-team-chip bravo">
          <strong className="cod-team-score" data-testid="hud-bravo-score" dir="ltr">
            {view.bravoScore}
          </strong>
          <span className="cod-team-label cod-label-full">{getTeamNameFa('bravo')}</span>
          <span className="cod-team-label cod-label-short">براوو</span>
          <span className="cod-team-dot" style={{ background: getTeamColor('bravo') }} />
        </div>
      </div>
    );
  }
);

export interface RoundCountdownV3Props {
  roundCountdownSec: number;
  mode: OnlineGameMode | null;
  currentRound?: number;
}

export const RoundCountdownV3: React.FC<RoundCountdownV3Props> = React.memo(
  ({ roundCountdownSec, mode, currentRound }) => {
    const view = resolveHudV3Countdown({ roundCountdownSec, mode, currentRound });
    if (!view.visible) return null;

    return (
      <div
        className="round-countdown-overlay uiv3-hud-countdown"
        data-testid="round-countdown-overlay"
        role="status"
        aria-live="assertive"
        dir="rtl"
      >
        <div
          key={roundCountdownSec}
          className="round-countdown-digit uiv3-hud-countdown-digit"
          data-testid="round-countdown-digit"
        >
          {view.digitFa}
        </div>
        <div className="round-countdown-label uiv3-hud-countdown-label">{view.labelFa}</div>
      </div>
    );
  }
);

export interface SpawnProtectionV3Props {
  visible: boolean;
}

export const SpawnProtectionV3: React.FC<SpawnProtectionV3Props> = React.memo(({ visible }) => {
  if (!visible) return null;
  return (
    <div
      className="spawn-protection-badge uiv3-hud-spawn-shield"
      data-testid="spawn-protection-badge"
      role="status"
      dir="rtl"
    >
      <span className="spawn-protection-dot" aria-hidden="true" />
      <span>محافظت اسپاون</span>
    </div>
  );
});

export interface SpectatorBannerV3Props {
  active: boolean;
  targetName: string;
  targetTeam: TeamId;
  aliveCount: number;
  onNextTarget: () => void;
}

export const SpectatorBannerV3: React.FC<SpectatorBannerV3Props> = React.memo(
  ({ active, targetName, targetTeam, aliveCount, onNextTarget }) => {
    const view = resolveHudV3Spectator({ active, targetName, targetTeam, aliveCount });
    if (!view.visible) return null;

    return (
      <div
        className="spectator-banner uiv3-hud-spectator"
        data-testid="spectator-banner"
        role="status"
        dir="rtl"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span className="uiv3-hud-spec-label">تماشا:</span>
        <strong data-testid="spectator-target-name" style={{ color: view.targetColor }}>
          {view.targetName}
        </strong>
        {view.canCycleTarget && (
          <button
            type="button"
            className="spectator-switch-btn uiv3-hud-spec-next"
            data-testid="btn-spectate-next"
            onClick={(e) => {
              e.stopPropagation();
              onNextTarget();
            }}
          >
            بعدی
          </button>
        )}
      </div>
    );
  }
);

export interface ReconnectBannerV3Props {
  localActive: boolean;
  localRemainingSec: number;
  players?: HudV3ReconnectPlayer[] | null;
  nowMs: number;
}

export const ReconnectBannerV3: React.FC<ReconnectBannerV3Props> = React.memo(
  ({ localActive, localRemainingSec, players, nowMs }) => {
    const view = resolveHudV3Reconnect({
      localActive,
      localRemainingSec,
      players,
      nowMs,
    });
    if (!view.visible) return null;

    return (
      <div
        className={`reconnect-status-banner uiv3-hud-reconnect${view.isLocalReconnecting ? ' is-local' : ''}`}
        data-testid="hud-reconnecting-banner"
        role="status"
        aria-live="polite"
        dir="rtl"
      >
        <span className="reconnect-pulse-dot" aria-hidden="true" />
        <span>{view.messageFa}</span>
      </div>
    );
  }
);

export interface VoiceSpeakersV3Props {
  speakingNames: { id: string; label: string }[];
  autoplayBlocked: boolean;
  onUnlockAudio: () => void;
}

export const VoiceSpeakersV3: React.FC<VoiceSpeakersV3Props> = React.memo(
  ({ speakingNames, autoplayBlocked, onUnlockAudio }) => {
    if (speakingNames.length === 0 && !autoplayBlocked) return null;

    return (
      <div
        className="hud-voice-speakers uiv3-hud-voice-stack"
        data-testid="hud-voice-speakers"
        dir="rtl"
      >
        {speakingNames.map((sp) => (
          <span key={sp.id} className="hud-voice-speaker-pill uiv3-hud-voice-item">
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            </svg>
            <span>{sp.label}</span>
          </span>
        ))}
        {autoplayBlocked && (
          <button
            type="button"
            className="hud-voice-unlock-btn uiv3-hud-voice-unlock"
            data-testid="hud-voice-unlock-btn"
            onClick={(e) => {
              e.stopPropagation();
              onUnlockAudio();
            }}
          >
            باز کردن صدا
          </button>
        )}
      </div>
    );
  }
);
