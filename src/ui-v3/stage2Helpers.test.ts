import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFERRED_SKIN_SELECTED_MSG_FA,
  IN_MATCH_SPIN_HINT_FA,
  canOpenSpinWheel,
  computeCosmeticSelectionOutcome,
  computeModalChromeBudget,
  extractRoomCodeFromClipboard,
  formatDiagnosticsReportText,
  isMatchInProgress,
  resolveActiveMatchCosmetics,
  resolveMatchIntegrityBadge,
  resolveStage2SurfaceBlurBudget,
  resolveTransparencyUiState,
} from './stage2Helpers';
import { resolveLiquidGlassCapabilities } from './uiV3Store';
import type { ConnectionDiagnosticsReport } from '../game/peerDiagnostics';

test('UI v3 Stage 2 — Blur budget enforces 0 blur on all live-match overlays and <= 2 on paused modals', () => {
  const liveSurfaces = [
    'live-overlay-scoreboard',
    'live-overlay-round-end',
    'live-overlay-match-end',
    'live-overlay-gameover',
  ] as const;

  for (const s of liveSurfaces) {
    assert.deepEqual(resolveStage2SurfaceBlurBudget(s, 'liquid'), {
      allowBlur: false,
      maxBlurLayers: 0,
    });
    assert.deepEqual(resolveStage2SurfaceBlurBudget(s, 'simple'), {
      allowBlur: false,
      maxBlurLayers: 0,
    });
    assert.deepEqual(resolveStage2SurfaceBlurBudget(s, 'solid'), {
      allowBlur: false,
      maxBlurLayers: 0,
    });
  }

  const pausedModals = [
    'paused-modal-online',
    'paused-modal-cosmetics',
    'paused-modal-og-intro',
  ] as const;

  for (const m of pausedModals) {
    const liquid = resolveStage2SurfaceBlurBudget(m, 'liquid');
    assert.equal(liquid.allowBlur, true);
    assert.ok(liquid.maxBlurLayers <= 2);

    assert.deepEqual(resolveStage2SurfaceBlurBudget(m, 'simple'), {
      allowBlur: false,
      maxBlurLayers: 0,
    });
    assert.deepEqual(resolveStage2SurfaceBlurBudget(m, 'solid'), {
      allowBlur: false,
      maxBlurLayers: 0,
    });
  }
});

test('UI v3 Stage 2 — Clipboard room code extraction handles invite URLs, hashes, and Persian digits', () => {
  assert.equal(extractRoomCodeFromClipboard('  k7m9p2x4  '), 'K7M9P2X4');
  assert.equal(
    extractRoomCodeFromClipboard('https://example.com/game/#room=ab12cd34'),
    'AB12CD34'
  );
  assert.equal(
    extractRoomCodeFromClipboard('بیا بازی! https://host.app/?room=XYZ987'),
    'XYZ987'
  );
  assert.equal(extractRoomCodeFromClipboard(''), '');
});

test('UI v3 Stage 2 — Diagnostics report text formatter includes broker, TURN, ICE, transport, and voice info', () => {
  const mockReport: ConnectionDiagnosticsReport = {
    checkedAt: '12:30:05',
    online: true,
    brokerHost: '0.peerjs.com',
    brokerPort: 443,
    brokerSecure: true,
    brokerReachability: 'reachable',
    brokerLatencyMs: 42,
    brokerDetailFa: 'در دسترس (42ms)',
    availableBrokersCount: 3,
    turnWorkerStatus: 'ok',
    turnSupportsUdpTcpTls443: true,
    turnDetailFa: 'آماده (TLS 443)',
    iceState: 'connected',
    iceGatheringState: 'complete',
    stunCandidatesCount: 2,
    hostCandidatesCount: 1,
    relayCandidatesCount: 1,
    connectionType: 'relay_turn',
    connectionTypeLabelFa: 'رله TURN',
    relayFallbackActive: true,
    failureReasonFa: null,
  };

  const text = formatDiagnosticsReportText({
    report: mockReport,
    appVersion: 'v2.4.0',
    stunServersCount: 4,
    roomCode: 'AB12CD',
    peerRole: 'host',
    pingMs: 28,
  });

  assert.match(text, /BODYCAM/);
  assert.match(text, /v2\.4\.0/);
  assert.match(text, /AB12CD/);
  assert.match(text, /0\.peerjs\.com:443/);
  assert.match(text, /رله TURN/);
  assert.match(text, /VPN Relay Fallback/);
  assert.match(text, /شبکه آماده بازی آنلاین است/);
});

test('UI v3 Stage 2 — Match integrity badge stays silent for standard matches and flags active cheats', () => {
  assert.equal(resolveMatchIntegrityBadge(null).isUnofficial, false);
  assert.equal(
    resolveMatchIntegrityBadge({
      aimAssistEnabled: true,
      aimAssistStrength: 10,
      aimAssistHeadshot: false,
      infiniteAmmo: false,
      zeroRecoil: false,
      godMode: false,
      espWallhack: false,
      superSpeed: false,
    }).isUnofficial,
    false
  );

  const flagged = resolveMatchIntegrityBadge({
    godMode: true,
    infiniteAmmo: true,
    aimAssistEnabled: true,
    aimAssistStrength: 85,
  });
  assert.equal(flagged.isUnofficial, true);
  assert.ok(flagged.activeFlagsFa.includes('ضدضربه'));
  assert.ok(flagged.activeFlagsFa.includes('تیر بی‌نهایت'));
  assert.ok(flagged.activeFlagsFa.includes('ایم‌اسیست 85%'));
});

test('UI v3 Settings — Reduce Transparency activates only manually or on Low quality, shows reason when auto, and can be disabled', () => {
  // Default high quality -> OFF, no auto notice
  const def = resolveTransparencyUiState({
    manualReduceTransparency: false,
    gfxPreset: 'high',
    glassReason: 'optimal',
    autoTransparencyOverridden: false,
  });
  assert.equal(def.switchChecked, false);
  assert.equal(def.isAutoTriggered, false);
  assert.equal(def.autoReasonFa, null);

  // Low quality -> auto-ON with clear Persian reason and dismissible
  const lowAuto = resolveTransparencyUiState({
    manualReduceTransparency: false,
    gfxPreset: 'low',
    glassReason: 'low-graphics-preset',
    autoTransparencyOverridden: false,
  });
  assert.equal(lowAuto.switchChecked, true);
  assert.equal(lowAuto.isAutoTriggered, true);
  assert.equal(lowAuto.canDisableAuto, true);
  assert.ok(lowAuto.autoReasonFa && lowAuto.autoReasonFa.includes('کم'));

  // User turns it OFF while still on Low quality -> stays OFF and restores liquid blur in paused menu
  const lowDismissed = resolveTransparencyUiState({
    manualReduceTransparency: false,
    gfxPreset: 'low',
    glassReason: 'optimal',
    autoTransparencyOverridden: true,
  });
  assert.equal(lowDismissed.switchChecked, false);
  assert.equal(lowDismissed.autoReasonFa, null);

  const restored = resolveLiquidGlassCapabilities({
    supportsBackdropFilter: true,
    gfxPreset: 'low',
    reducedMotion: false,
    reduceTransparency: false,
    currentFps: 60,
    isInGameplayHud: false,
    isScenePaused: true,
    ignoreAutoDegrade: true,
  });
  assert.equal(restored.mode, 'liquid');
  assert.equal(restored.blurEnabled, true);

  // Gameplay HUD MUST remain strictly zero-blur even with ignoreAutoDegrade
  const hud = resolveLiquidGlassCapabilities({
    supportsBackdropFilter: true,
    gfxPreset: 'low',
    reducedMotion: false,
    reduceTransparency: false,
    currentFps: 60,
    isInGameplayHud: true,
    isScenePaused: false,
    ignoreAutoDegrade: true,
  });
  assert.equal(hud.blurEnabled, false);
  assert.equal(hud.maxBlurLayers, 0);
});

test('UI v3 Settings — Mobile landscape modal chrome/content viewport budget holds on 667x375, 800x360, 932x430', () => {
  for (const vh of [375, 360, 430]) {
    const headerH = 46;
    const footerH = 0;
    const contentH = vh - 8 - headerH;
    const budget = computeModalChromeBudget(vh, headerH, footerH, contentH);
    assert.equal(budget.meetsBudget, true, `Failed budget on viewport height ${vh}`);
    assert.ok(budget.chromeRatioPct <= 20);
    assert.ok(budget.contentRatioPct >= 70);
  }
});

test('In-Match Settings — Spin wheel is allowed ONLY from main menu and blocked during/after match', () => {
  assert.equal(isMatchInProgress('title'), false);
  assert.equal(isMatchInProgress('playing'), true);
  assert.equal(isMatchInProgress('paused'), true);
  assert.equal(isMatchInProgress('gameover'), false);

  // Spin strictly allowed on title screen when OG spin is enabled
  assert.equal(canOpenSpinWheel('title', true), true);
  assert.equal(canOpenSpinWheel('title', false), false);

  // Spin blocked during playing, paused, and gameover
  assert.equal(canOpenSpinWheel('playing', true), false);
  assert.equal(canOpenSpinWheel('paused', true), false);
  assert.equal(canOpenSpinWheel('gameover', true), false);
  assert.equal(IN_MATCH_SPIN_HINT_FA, 'بعد از پایان مسابقه، گردونه از منوی اصلی در دسترس است.');
});

test('In-Match Settings — Selecting a skin mid-match saves for next match without mutating active match skin', () => {
  type EquippedStub = { ak47_skin: string | null; sniper_skin: string | null };
  const matchStartEquipped: EquippedStub = { ak47_skin: null, sniper_skin: null };
  const nextSavedEquipped: EquippedStub = { ak47_skin: 'ak47_inferno_reaper', sniper_skin: null };

  // Mid-match (paused in settings): active match stays on matchStartEquipped, emits exact deferred Persian notice
  const midMatch = computeCosmeticSelectionOutcome({
    screenState: 'paused',
    prevSavedEquipped: matchStartEquipped,
    nextSavedEquipped,
    matchLockedEquipped: matchStartEquipped,
  });
  assert.equal(midMatch.shouldDeferToNextMatch, true);
  assert.equal(midMatch.noticeFa, DEFERRED_SKIN_SELECTED_MSG_FA);
  assert.equal(midMatch.noticeFa, 'اسکین انتخاب شد و بعد از پایان مسابقه اعمال میشود');
  assert.equal(midMatch.effectiveMatchEquipped.ak47_skin, null);

  // Active gameplay resolver keeps locked skin during paused & playing, then applies saved skin after match ends
  assert.equal(
    resolveActiveMatchCosmetics(nextSavedEquipped, matchStartEquipped, 'paused').ak47_skin,
    null
  );
  assert.equal(
    resolveActiveMatchCosmetics(nextSavedEquipped, matchStartEquipped, 'playing').ak47_skin,
    null
  );
  assert.equal(
    resolveActiveMatchCosmetics(nextSavedEquipped, matchStartEquipped, 'gameover').ak47_skin,
    'ak47_inferno_reaper'
  );
  assert.equal(
    resolveActiveMatchCosmetics(nextSavedEquipped, null, 'title').ak47_skin,
    'ak47_inferno_reaper'
  );

  // From main menu (title): applies immediately with no deferred notice
  const atTitle = computeCosmeticSelectionOutcome({
    screenState: 'title',
    prevSavedEquipped: matchStartEquipped,
    nextSavedEquipped,
    matchLockedEquipped: null,
  });
  assert.equal(atTitle.shouldDeferToNextMatch, false);
  assert.equal(atTitle.noticeFa, null);
  assert.equal(atTitle.effectiveMatchEquipped.ak47_skin, 'ak47_inferno_reaper');
});

