/**
 * Pure, unit-testable state, surface, layout budget, and visibility resolvers
 * for Liquid Glass UI v3 — Stage 3 In-Game HUD.
 *
 * ZERO React imports, ZERO DOM side-effects, ZERO combat/gameplay mutations.
 */

import {
  formatRoundClock,
  getTeamColor,
  getTeamNameFa,
  isRoundBasedMode,
  ROUND_MATCH_WIN_SCORE,
  type OnlineGameMode,
  type RoundPhase,
  type TeamId,
} from '../game/rules';
import type { ActiveAppUiVersionId, HudControlsStyle, UiV3GfxPresetName } from './uiV3Store';

export type HudV3SurfaceMode = 'glass' | 'opaque';

export interface HudV3SurfaceInput {
  reduceTransparency: boolean;
  gfxPreset: UiV3GfxPresetName;
  autoTransparencyOverridden?: boolean;
}

/**
 * Resolves the Stage 3 cheap-glass HUD material mode:
 * - ALWAYS zero `backdrop-filter` and zero `filter` (enforced by contract).
 * - Switches to clean matte/opaque (`'opaque'`) when "کاهش شفافیت" is ON or
 *   graphics preset is Low/Potato/Lite (unless user explicitly overrode auto-degrade).
 */
export function resolveHudV3SurfaceMode(input: HudV3SurfaceInput): {
  surface: HudV3SurfaceMode;
  allowBackdropFilter: false;
  allowCssFilter: false;
} {
  const isLowQuality =
    input.gfxPreset === 'low' || input.gfxPreset === 'potato' || input.gfxPreset === 'lite';
  const opaque =
    Boolean(input.reduceTransparency) || (isLowQuality && !input.autoTransparencyOverridden);
  return {
    surface: opaque ? 'opaque' : 'glass',
    allowBackdropFilter: false,
    allowCssFilter: false,
  };
}

/**
 * Resolves the active touch/HUD controls visual style:
 * - Legacy UI always uses `'classic'` (flat, non-glassy, ultra-lightweight).
 * - Liquid Glass UI (`'v3'`) lets the player explicitly pick `'classic'` (Legacy non-glassy
 *   buttons for weaker phones or players who prefer flat buttons) or `'glass'` (default).
 */
export function resolveHudV3ControlsStyle(input: {
  uiVersion: ActiveAppUiVersionId;
  controlsStyle: HudControlsStyle;
}): HudControlsStyle {
  if (input.uiVersion === 'legacy') return 'classic';
  return input.controlsStyle === 'classic' ? 'classic' : 'glass';
}

export interface HudV3VisibilityMap {
  showRadar: boolean;
  showKillFeed: boolean;
  showBuffStrip: boolean;
  showWaveLine: boolean;
  showVitalsAndAmmo: boolean;
  showWeaponBar: boolean;
  showCrosshair: boolean;
  showRoundBar: boolean;
  showSpecialAlerts: boolean;
  showTouchControls: boolean;
}

/**
 * Computes which HUD clusters remain visible in standard vs "HUD مینیمال" mode.
 * Minimal HUD hides non-essential clutter (radar, kill feed, buff strip, wave line)
 * while preserving essential combat telemetry and critical match alerts.
 */
export function resolveHudV3Visibility(minimalHud: boolean): HudV3VisibilityMap {
  return {
    showRadar: !minimalHud,
    showKillFeed: !minimalHud,
    showBuffStrip: !minimalHud,
    showWaveLine: !minimalHud,
    showVitalsAndAmmo: true,
    showWeaponBar: true,
    showCrosshair: true,
    showRoundBar: true,
    showSpecialAlerts: true,
    showTouchControls: true,
  };
}

export interface HudV3RoundBarInput {
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

export interface HudV3RoundBarView {
  visible: boolean;
  alphaScore: number;
  bravoScore: number;
  roundTextFa: string;
  clockTextFa: string;
  clockTone: 'normal' | 'countdown' | 'urgent' | 'winner';
}

const PERSIAN_COUNTDOWN_DIGITS = ['۰', '۱', '۲', '۳'] as const;

export function formatCountdownDigitFa(sec: number): string {
  const clamped = Math.max(0, Math.floor(sec));
  return PERSIAN_COUNTDOWN_DIGITS[clamped] ?? String(clamped);
}

export function resolveHudV3RoundBar(input: HudV3RoundBarInput): HudV3RoundBarView {
  if (input.playMode === 'training' || !input.mode || !isRoundBasedMode(input.mode)) {
    return {
      visible: false,
      alphaScore: 0,
      bravoScore: 0,
      roundTextFa: '',
      clockTextFa: '',
      clockTone: 'normal',
    };
  }

  const alphaScore = input.alphaScore ?? 0;
  const bravoScore = input.bravoScore ?? 0;
  const currentRound = input.currentRound ?? 1;
  const targetWinRounds = input.targetWinRounds ?? ROUND_MATCH_WIN_SCORE;
  const remainingSec = input.roundTimeRemainingSec ?? 90;

  let clockTextFa: string;
  let clockTone: HudV3RoundBarView['clockTone'] = 'normal';

  if (input.roundPhase === 'match_over') {
    clockTextFa = `برنده: ${getTeamNameFa(input.matchWinnerTeam ?? 'alpha')}`;
    clockTone = 'winner';
  } else if (input.roundPhase === 'countdown') {
    clockTextFa = formatCountdownDigitFa(input.roundCountdownSec);
    clockTone = 'countdown';
  } else if (input.roundPhase === 'intermission') {
    clockTextFa = 'راند بعد...';
    clockTone = 'countdown';
  } else {
    clockTextFa = formatRoundClock(remainingSec);
    clockTone = remainingSec <= 15 ? 'urgent' : 'normal';
  }

  return {
    visible: true,
    alphaScore,
    bravoScore,
    roundTextFa: `راند ${currentRound}/${targetWinRounds}`,
    clockTextFa,
    clockTone,
  };
}

export interface HudV3CountdownView {
  visible: boolean;
  digitFa: string;
  labelFa: string;
}

export function resolveHudV3Countdown(params: {
  roundCountdownSec: number;
  mode: OnlineGameMode | null;
  currentRound?: number;
}): HudV3CountdownView {
  if (params.roundCountdownSec <= 0 || !params.mode || !isRoundBasedMode(params.mode)) {
    return { visible: false, digitFa: '', labelFa: '' };
  }
  return {
    visible: true,
    digitFa: formatCountdownDigitFa(params.roundCountdownSec),
    labelFa: `راند ${params.currentRound ?? 1}`,
  };
}

export interface HudV3SpectatorView {
  visible: boolean;
  targetName: string;
  targetColor: string;
  canCycleTarget: boolean;
}

export function resolveHudV3Spectator(params: {
  active: boolean;
  targetName: string;
  targetTeam: TeamId;
  aliveCount: number;
}): HudV3SpectatorView {
  if (!params.active) {
    return {
      visible: false,
      targetName: '',
      targetColor: getTeamColor('alpha'),
      canCycleTarget: false,
    };
  }
  return {
    visible: true,
    targetName: params.targetName.trim() || 'نمای میدان',
    targetColor: getTeamColor(params.targetTeam),
    canCycleTarget: params.aliveCount > 1,
  };
}

export interface HudV3ReconnectPlayer {
  id: string;
  name: string;
  disconnected?: boolean;
  reconnectDeadlineAt?: number | null;
}

export interface HudV3ReconnectView {
  visible: boolean;
  isLocalReconnecting: boolean;
  messageFa: string;
}

export function resolveHudV3Reconnect(params: {
  localActive: boolean;
  localRemainingSec: number;
  players?: HudV3ReconnectPlayer[] | null;
  nowMs: number;
}): HudV3ReconnectView {
  if (params.localActive) {
    const sec = Math.max(0, Math.ceil(params.localRemainingSec));
    return {
      visible: true,
      isLocalReconnecting: true,
      messageFa: `در حال اتصال دوباره به میزبان... (${sec} ثانیه)`,
    };
  }
  const disconnected = (params.players ?? []).filter((p) => p.disconnected);
  if (disconnected.length === 0) {
    return { visible: false, isLocalReconnecting: false, messageFa: '' };
  }
  const parts = disconnected.map((p) => {
    const rem = p.reconnectDeadlineAt
      ? Math.max(0, Math.ceil((p.reconnectDeadlineAt - params.nowMs) / 1000))
      : 30;
    return `بازیکن «${p.name}» در حال اتصال دوباره... (${rem}ث)`;
  });
  return {
    visible: true,
    isLocalReconnecting: false,
    messageFa: parts.join(' · '),
  };
}

export interface HudV3RoundIntermissionView {
  visible: boolean;
  kickerFa: string;
  headlineFa: string;
  accentColor: string;
  alphaScore: number;
  bravoScore: number;
}

export function resolveHudV3RoundIntermission(params: {
  screenState: 'title' | 'playing' | 'paused' | 'gameover';
  mode: OnlineGameMode | null;
  roundPhase?: RoundPhase;
  currentRound?: number;
  roundWinnerTeam?: TeamId | 'draw' | null;
  alphaScore?: number;
  bravoScore?: number;
}): HudV3RoundIntermissionView {
  if (
    params.screenState !== 'playing' ||
    !params.mode ||
    !isRoundBasedMode(params.mode) ||
    params.roundPhase !== 'intermission'
  ) {
    return {
      visible: false,
      kickerFa: '',
      headlineFa: '',
      accentColor: '#bae6fd',
      alphaScore: 0,
      bravoScore: 0,
    };
  }
  const winner = params.roundWinnerTeam;
  const isDraw = !winner || winner === 'draw';
  return {
    visible: true,
    kickerFa: `راند ${params.currentRound ?? 1} به پایان رسید`,
    headlineFa: isDraw ? 'پایان راند · تساوی' : `برندهٔ راند: ${getTeamNameFa(winner)}`,
    accentColor: isDraw ? '#bae6fd' : getTeamColor(winner),
    alphaScore: params.alphaScore ?? 0,
    bravoScore: params.bravoScore ?? 0,
  };
}

/**
 * Verifies the top-center round bar stays within the strict <= 6% viewport height budget
 * across mobile landscape viewports (667x375, 800x360, 932x430).
 */
export function computeTopBarHeightRatioPct(
  topBarHeightPx: number,
  viewportHeightPx: number
): { ratioPct: number; withinBudget: boolean } {
  if (viewportHeightPx <= 0) {
    return { ratioPct: 100, withinBudget: false };
  }
  const ratioPct = +((topBarHeightPx / viewportHeightPx) * 100).toFixed(2);
  return {
    ratioPct,
    withinBudget: ratioPct <= 6.0,
  };
}
