/**
 * Pure, unit-testable helpers for Liquid Glass UI v3 — Stage 2.
 * ZERO React imports, ZERO DOM side-effects, ZERO gameplay/network mutations.
 */

import {
  normalizeRoomCode,
  parseRoomInviteFromUrl,
  type CheatConfig,
} from '../game/rules';
import type { ConnectionDiagnosticsReport } from '../game/peerDiagnostics';
import type { VoiceChatSnapshot } from '../game/voiceChat';
import type { LiquidGlassMode } from './uiV3Store';

export type UiV3Stage2SurfaceKind =
  | 'paused-modal-online'
  | 'paused-modal-cosmetics'
  | 'paused-modal-og-intro'
  | 'live-overlay-scoreboard'
  | 'live-overlay-round-end'
  | 'live-overlay-match-end'
  | 'live-overlay-gameover';

/**
 * Enforces the Stage 2 Liquid Glass Performance Law:
 * - Live-match overlays over an active 3D scene ALWAYS use 0 blur layers (backdrop-filter: none).
 * - Paused modal screens use at most 2 small blur layers in 'liquid' mode, and 0 in 'simple'/'solid'.
 */
export function resolveStage2SurfaceBlurBudget(
  surface: UiV3Stage2SurfaceKind,
  glassMode: LiquidGlassMode
): { allowBlur: boolean; maxBlurLayers: number } {
  if (surface.startsWith('live-overlay-')) {
    return { allowBlur: false, maxBlurLayers: 0 };
  }
  if (glassMode !== 'liquid') {
    return { allowBlur: false, maxBlurLayers: 0 };
  }
  return { allowBlur: true, maxBlurLayers: 2 };
}

/**
 * Extracts a normalized room code from raw clipboard text, invite URLs (`#room=...` / `?room=...`),
 * or Persian/Arabic digits.
 */
export function extractRoomCodeFromClipboard(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    if (trimmed.includes('#') || trimmed.includes('?') || /^https?:\/\//i.test(trimmed)) {
      const url = new URL(
        trimmed.startsWith('http')
          ? trimmed
          : `https://example.invalid/${trimmed.replace(/^\/+/, '')}`
      );
      const parsed = parseRoomInviteFromUrl(url.search, url.hash);
      if (parsed.roomCode) return parsed.roomCode;
    }
  } catch {
    // Fall through to regex/plain code extraction
  }
  const hashMatch = /room=([A-Za-z0-9\-۰-۹٠-٩]+)/i.exec(trimmed);
  if (hashMatch?.[1]) {
    return normalizeRoomCode(hashMatch[1]);
  }
  return normalizeRoomCode(trimmed);
}

/**
 * Formats a clean, shareable plain-text Diagnostics Report for the "کپی گزارش" button.
 */
export function formatDiagnosticsReportText(params: {
  report: ConnectionDiagnosticsReport;
  appVersion: string;
  stunServersCount: number;
  roomCode?: string | null;
  peerRole?: string;
  pingMs?: number | null;
  voiceState?: VoiceChatSnapshot;
}): string {
  const { report, appVersion, stunServersCount, roomCode, peerRole, pingMs, voiceState } = params;
  const lines: string[] = [
    `=== BODYCAM · گزارش تشخیص اتصال ===`,
    `نسخه: ${appVersion} | زمان بررسی: ${report.checkedAt}`,
  ];

  if (roomCode) {
    lines.push(
      `اتاق: ${roomCode} | نقش: ${peerRole === 'host' ? 'میزبان' : 'مهمان'} | پینگ: ${
        typeof pingMs === 'number' && Number.isFinite(pingMs) ? `${Math.round(pingMs)}ms` : '—'
      }`
    );
  }

  lines.push(
    `1) سرور واسطه PeerJS: ${report.brokerHost}:${report.brokerPort} (${
      report.brokerSecure ? 'WSS' : 'WS'
    }) -> ${report.brokerReachability} (${report.brokerDetailFa})`,
    `2) رله TURN (VPN): ${report.turnWorkerStatus} (${report.turnDetailFa})`,
    `3) وضعیت ICE: ${report.iceState} / ${report.iceGatheringState} | STUN: ${report.stunCandidatesCount}, Host: ${report.hostCandidatesCount}, Relay: ${report.relayCandidatesCount} (STUN Servers: ${stunServersCount})`,
    `4) نوع اتصال فعال: ${report.connectionTypeLabelFa} [${report.connectionType}]${
      report.relayFallbackActive ? ' (VPN Relay Fallback فعال)' : ''
    }`
  );

  if (voiceState) {
    const voiceSummary = !voiceState.secureContextOk
      ? 'فقط روی HTTPS'
      : voiceState.micStatus === 'active'
        ? 'میکروفون روشن'
        : voiceState.micStatus === 'ptt_ready'
          ? 'آماده (PTT)'
          : voiceState.micStatus === 'error'
            ? `خطا (${voiceState.lastErrorFa || 'میکروفون'})`
            : 'خاموش';
    lines.push(
      `5) چت صوتی WebRTC: ${voiceSummary} | تماس‌های متصل: ${voiceState.connectedCallCount}`
    );
  }

  if (report.failureReasonFa) {
    lines.push(`نتیجه: خطا — ${report.failureReasonFa}`);
  } else {
    lines.push(`نتیجه: شبکه آماده بازی آنلاین است.`);
  }

  return lines.join('\n');
}

export interface MatchIntegrityBadgeInfo {
  isUnofficial: boolean;
  labelFa: string;
  activeFlagsFa: string[];
}

/**
 * Computes whether any cheat / non-standard match assist is currently active so post-match
 * screens display a transparent badge without touching gameplay scoring or rules.
 */
export function resolveMatchIntegrityBadge(
  cheatConfig?: Partial<CheatConfig> | null
): MatchIntegrityBadgeInfo {
  if (!cheatConfig) {
    return { isUnofficial: false, labelFa: '', activeFlagsFa: [] };
  }
  const flags: string[] = [];
  if (cheatConfig.godMode) flags.push('ضدضربه');
  if (cheatConfig.infiniteAmmo) flags.push('تیر بی‌نهایت');
  if (cheatConfig.zeroRecoil) flags.push('بدون لگد');
  if (cheatConfig.espWallhack) flags.push('رادار ESP');
  if (cheatConfig.superSpeed) flags.push('سرعت فوق‌العاده');
  if (cheatConfig.aimAssistHeadshot) flags.push('قفل سر');
  if (
    cheatConfig.aimAssistEnabled !== false &&
    typeof cheatConfig.aimAssistStrength === 'number' &&
    cheatConfig.aimAssistStrength > 10
  ) {
    flags.push(`ایم‌اسیست ${Math.round(cheatConfig.aimAssistStrength)}%`);
  }

  if (flags.length === 0) {
    return { isUnofficial: false, labelFa: '', activeFlagsFa: [] };
  }

  return {
    isUnofficial: true,
    labelFa: 'مسابقه غیررسمی (چیت فعال)',
    activeFlagsFa: flags,
  };
}

export interface TransparencyUiState {
  /** Whether the "کاهش شفافیت" switch appears ON (manual OR auto-on from Low/Potato quality) */
  switchChecked: boolean;
  /** Whether transparency/blur is currently reduced automatically rather than manually */
  isAutoTriggered: boolean;
  /** Short Persian explanation when auto-reduced, otherwise null */
  autoReasonFa: string | null;
  /** True when the user can turn off the automatic reduction */
  canDisableAuto: boolean;
}

/**
 * Enforces the user rule for "کاهش شفافیت":
 * - Turns ON only when the user manually turns it on OR selects Low/Potato quality (unless dismissed).
 * - Whenever transparency/blur is reduced automatically (Low quality, Low FPS, Reduced Motion),
 *   exposes a short Persian reason and allows the user to disable it.
 */
export function resolveTransparencyUiState(params: {
  manualReduceTransparency: boolean;
  gfxPreset: 'auto' | 'lite' | 'promax' | 'ultramax' | 'ultra' | 'high' | 'med' | 'low' | 'potato';
  glassReason:
    | 'optimal'
    | 'gameplay-hud-zero-blur'
    | 'reduce-transparency'
    | 'unsupported-backdrop-filter'
    | 'reduced-motion'
    | 'low-graphics-preset'
    | 'low-fps-fallback'
    | 'scene-rendering';
  autoTransparencyOverridden: boolean;
}): TransparencyUiState {
  const { manualReduceTransparency, gfxPreset, glassReason, autoTransparencyOverridden } = params;

  if (manualReduceTransparency) {
    return {
      switchChecked: true,
      isAutoTriggered: false,
      autoReasonFa: null,
      canDisableAuto: false,
    };
  }

  const isLowQuality = gfxPreset === 'low' || gfxPreset === 'potato' || gfxPreset === 'lite';
  if (isLowQuality && !autoTransparencyOverridden) {
    return {
      switchChecked: true,
      isAutoTriggered: true,
      autoReasonFa: 'به‌خاطر انتخاب کیفیت «کم» خودکار روشن شد.',
      canDisableAuto: true,
    };
  }

  if (glassReason === 'low-fps-fallback' && !autoTransparencyOverridden) {
    return {
      switchChecked: false,
      isAutoTriggered: true,
      autoReasonFa: 'به‌خاطر افت FPS تارشدگی موقتاً ساده شد.',
      canDisableAuto: true,
    };
  }

  if (glassReason === 'reduced-motion' && !autoTransparencyOverridden) {
    return {
      switchChecked: false,
      isAutoTriggered: true,
      autoReasonFa: 'به‌خاطر «کاهش حرکت» تارشدگی ساده شد.',
      canDisableAuto: true,
    };
  }

  if (glassReason === 'unsupported-backdrop-filter') {
    return {
      switchChecked: false,
      isAutoTriggered: true,
      autoReasonFa: 'مرورگر فعلی از تارشدگی شیشه پشتیبانی نمی‌کند.',
      canDisableAuto: false,
    };
  }

  return {
    switchChecked: false,
    isAutoTriggered: false,
    autoReasonFa: null,
    canDisableAuto: false,
  };
}

export interface ModalChromeBudgetResult {
  chromeRatioPct: number;
  contentRatioPct: number;
  meetsBudget: boolean;
}

/**
 * Pure viewport space-budget verifier for mobile landscape modals (e.g. 667x375, 800x360, 932x430):
 * - Header + Footer <= 20% of viewport height
 * - Content area >= 70% of viewport height
 */
export function computeModalChromeBudget(
  viewportHeightPx: number,
  headerHeightPx: number,
  footerHeightPx: number,
  contentHeightPx: number
): ModalChromeBudgetResult {
  if (viewportHeightPx <= 0) {
    return { chromeRatioPct: 100, contentRatioPct: 0, meetsBudget: false };
  }
  const chromeRatioPct = +(((headerHeightPx + footerHeightPx) / viewportHeightPx) * 100).toFixed(1);
  const contentRatioPct = +((contentHeightPx / viewportHeightPx) * 100).toFixed(1);
  return {
    chromeRatioPct,
    contentRatioPct,
    meetsBudget: chromeRatioPct <= 20 && contentRatioPct >= 70,
  };
}

export type MatchScreenState = 'title' | 'playing' | 'paused' | 'gameover';

export const DEFERRED_SKIN_SELECTED_MSG_FA =
  'اسکین انتخاب شد و بعد از پایان مسابقه اعمال میشود';

export const IN_MATCH_SPIN_HINT_FA =
  'بعد از پایان مسابقه، گردونه از منوی اصلی در دسترس است.';

/**
 * True while a match is actively running or paused mid-match.
 */
export function isMatchInProgress(screenState: MatchScreenState): boolean {
  return screenState === 'playing' || screenState === 'paused';
}

/**
 * Spin wheel is ONLY accessible from the main menu ('title') when no match is in progress
 * and OG mode allows the spin system.
 */
export function canOpenSpinWheel(
  screenState: MatchScreenState,
  ogSpinAllowed: boolean
): boolean {
  return Boolean(ogSpinAllowed) && screenState === 'title';
}

/**
 * Resolves which equipped cosmetics apply to the live 3D gameplay match:
 * - During an active/paused match, keeps the snapshot captured at match start so mid-match
 *   selections never mutate active match visuals or perks.
 * - Outside a match (title/gameover), uses the user's latest saved equipped loadout.
 */
export function resolveActiveMatchCosmetics<T extends object>(
  savedEquipped: T,
  matchLockedEquipped: T | null,
  screenState: MatchScreenState
): T {
  if (isMatchInProgress(screenState) && matchLockedEquipped !== null) {
    return matchLockedEquipped;
  }
  return savedEquipped;
}

export interface CosmeticSelectionOutcome<T extends object> {
  shouldDeferToNextMatch: boolean;
  noticeFa: string | null;
  effectiveMatchEquipped: T;
}

/**
 * Computes the effect of selecting a cosmetic item given the current screen state.
 * Mid-match selections are saved for the next match and emit the required Persian notice
 * while keeping the current match's active cosmetics unchanged.
 */
export function computeCosmeticSelectionOutcome<T extends object>(params: {
  screenState: MatchScreenState;
  prevSavedEquipped: T;
  nextSavedEquipped: T;
  matchLockedEquipped: T | null;
}): CosmeticSelectionOutcome<T> {
  const { screenState, prevSavedEquipped, nextSavedEquipped, matchLockedEquipped } = params;
  if (isMatchInProgress(screenState)) {
    return {
      shouldDeferToNextMatch: true,
      noticeFa: DEFERRED_SKIN_SELECTED_MSG_FA,
      effectiveMatchEquipped: matchLockedEquipped ?? prevSavedEquipped,
    };
  }
  return {
    shouldDeferToNextMatch: false,
    noticeFa: null,
    effectiveMatchEquipped: nextSavedEquipped,
  };
}

