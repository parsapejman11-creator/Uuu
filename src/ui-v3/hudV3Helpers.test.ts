import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeTopBarHeightRatioPct,
  formatCountdownDigitFa,
  resolveHudV3ControlsStyle,
  resolveHudV3Countdown,
  resolveHudV3Reconnect,
  resolveHudV3RoundBar,
  resolveHudV3RoundIntermission,
  resolveHudV3Spectator,
  resolveHudV3SurfaceMode,
  resolveHudV3Visibility,
} from './hudV3Helpers';
import {
  DEFAULT_UI_V3_PREFERENCES,
  loadUiV3Preferences,
  saveUiV3Preferences,
  validateUiV3Preferences,
} from './uiV3Store';

test('UI v3 Stage 3 HUD — Cheap-glass surface enforces zero blur/filter and degrades to matte opaque on Reduce Transparency or Low/Lite quality', () => {
  const glass = resolveHudV3SurfaceMode({
    reduceTransparency: false,
    gfxPreset: 'auto',
  });
  assert.equal(glass.surface, 'glass');
  assert.equal(glass.allowBackdropFilter, false);
  assert.equal(glass.allowCssFilter, false);

  const manualOpaque = resolveHudV3SurfaceMode({
    reduceTransparency: true,
    gfxPreset: 'high',
  });
  assert.equal(manualOpaque.surface, 'opaque');
  assert.equal(manualOpaque.allowBackdropFilter, false);

  for (const lowPreset of ['low', 'potato', 'lite'] as const) {
    const autoOpaque = resolveHudV3SurfaceMode({
      reduceTransparency: false,
      gfxPreset: lowPreset,
      autoTransparencyOverridden: false,
    });
    assert.equal(autoOpaque.surface, 'opaque', `${lowPreset} should auto-degrade HUD to opaque`);

    const overridden = resolveHudV3SurfaceMode({
      reduceTransparency: false,
      gfxPreset: lowPreset,
      autoTransparencyOverridden: true,
    });
    assert.equal(overridden.surface, 'glass', 'Explicit user override restores cheap-glass HUD');
  }
});

test('UI v3 Stage 3 HUD — Minimal HUD hides radar, kill feed, buff strip, and wave line while preserving combat essentials', () => {
  const full = resolveHudV3Visibility(false);
  assert.equal(full.showRadar, true);
  assert.equal(full.showKillFeed, true);
  assert.equal(full.showBuffStrip, true);
  assert.equal(full.showWaveLine, true);

  const minimal = resolveHudV3Visibility(true);
  assert.equal(minimal.showRadar, false);
  assert.equal(minimal.showKillFeed, false);
  assert.equal(minimal.showBuffStrip, false);
  assert.equal(minimal.showWaveLine, false);
  assert.equal(minimal.showVitalsAndAmmo, true);
  assert.equal(minimal.showWeaponBar, true);
  assert.equal(minimal.showCrosshair, true);
  assert.equal(minimal.showRoundBar, true);
  assert.equal(minimal.showSpecialAlerts, true);
  assert.equal(minimal.showTouchControls, true);
});

test('UI v3 Stage 3 HUD — Spectator state shows teammate name, color, and next-target switch when multiple teammates are alive', () => {
  const hidden = resolveHudV3Spectator({
    active: false,
    targetName: 'Ali',
    targetTeam: 'alpha',
    aliveCount: 2,
  });
  assert.equal(hidden.visible, false);

  const soloTarget = resolveHudV3Spectator({
    active: true,
    targetName: 'Reza',
    targetTeam: 'bravo',
    aliveCount: 1,
  });
  assert.equal(soloTarget.visible, true);
  assert.equal(soloTarget.targetName, 'Reza');
  assert.equal(soloTarget.canCycleTarget, false);

  const multiTarget = resolveHudV3Spectator({
    active: true,
    targetName: '   ',
    targetTeam: 'alpha',
    aliveCount: 3,
  });
  assert.equal(multiTarget.visible, true);
  assert.equal(multiTarget.targetName, 'نمای میدان');
  assert.equal(multiTarget.canCycleTarget, true);
});

test('UI v3 Stage 3 HUD — Round countdown state renders Persian digits 3..1 only in round-based modes', () => {
  assert.equal(formatCountdownDigitFa(3), '۳');
  assert.equal(formatCountdownDigitFa(2), '۲');
  assert.equal(formatCountdownDigitFa(1), '۱');

  const active1v1 = resolveHudV3Countdown({
    roundCountdownSec: 3,
    mode: 'tdm_1v1',
    currentRound: 2,
  });
  assert.equal(active1v1.visible, true);
  assert.equal(active1v1.digitFa, '۳');
  assert.equal(active1v1.labelFa, 'راند 2');

  const active2v2 = resolveHudV3Countdown({
    roundCountdownSec: 1,
    mode: 'tdm_2v2',
    currentRound: 4,
  });
  assert.equal(active2v2.visible, true);
  assert.equal(active2v2.digitFa, '۱');

  const zeroSec = resolveHudV3Countdown({
    roundCountdownSec: 0,
    mode: 'tdm_1v1',
    currentRound: 2,
  });
  assert.equal(zeroSec.visible, false);

  const nonRoundMode = resolveHudV3Countdown({
    roundCountdownSec: 2,
    mode: 'coop',
    currentRound: 1,
  });
  assert.equal(nonRoundMode.visible, false);
});

test('UI v3 Stage 3 HUD — Disconnect & reconnect indicator handles local grace timer and remote disconnected teammates', () => {
  const connected = resolveHudV3Reconnect({
    localActive: false,
    localRemainingSec: 0,
    players: [{ id: 'p1', name: 'Sara', disconnected: false }],
    nowMs: 10000,
  });
  assert.equal(connected.visible, false);

  const localDrop = resolveHudV3Reconnect({
    localActive: true,
    localRemainingSec: 18.2,
    players: [],
    nowMs: 10000,
  });
  assert.equal(localDrop.visible, true);
  assert.equal(localDrop.isLocalReconnecting, true);
  assert.ok(localDrop.messageFa.includes('19 ثانیه'));

  const remoteDrop = resolveHudV3Reconnect({
    localActive: false,
    localRemainingSec: 0,
    players: [
      { id: 'p1', name: 'Sina', disconnected: true, reconnectDeadlineAt: 24500 },
      { id: 'p2', name: 'Nima', disconnected: false },
    ],
    nowMs: 10000,
  });
  assert.equal(remoteDrop.visible, true);
  assert.equal(remoteDrop.isLocalReconnecting, false);
  assert.ok(remoteDrop.messageFa.includes('Sina'));
  assert.ok(remoteDrop.messageFa.includes('15ث'));
});

test('UI v3 Stage 3 HUD — Top round scoreboard bar & round-end intermission resolve all phases accurately', () => {
  const hiddenInTraining = resolveHudV3RoundBar({
    playMode: 'training',
    mode: 'tdm_1v1',
    roundCountdownSec: 0,
  });
  assert.equal(hiddenInTraining.visible, false);

  const urgentBar = resolveHudV3RoundBar({
    playMode: 'campaign',
    mode: 'tdm_2v2',
    alphaScore: 3,
    bravoScore: 2,
    currentRound: 6,
    targetWinRounds: 5,
    roundPhase: 'playing',
    roundTimeRemainingSec: 12,
    roundCountdownSec: 0,
  });
  assert.equal(urgentBar.visible, true);
  assert.equal(urgentBar.alphaScore, 3);
  assert.equal(urgentBar.bravoScore, 2);
  assert.equal(urgentBar.roundTextFa, 'راند 6/5');
  assert.equal(urgentBar.clockTone, 'urgent');

  const matchOverBar = resolveHudV3RoundBar({
    playMode: 'campaign',
    mode: 'tdm_1v1',
    alphaScore: 5,
    bravoScore: 3,
    roundPhase: 'match_over',
    matchWinnerTeam: 'alpha',
    roundCountdownSec: 0,
  });
  assert.equal(matchOverBar.clockTone, 'winner');
  assert.ok(matchOverBar.clockTextFa.includes('برنده:'));

  const intermissionWin = resolveHudV3RoundIntermission({
    screenState: 'playing',
    mode: 'tdm_2v2',
    roundPhase: 'intermission',
    currentRound: 4,
    roundWinnerTeam: 'bravo',
    alphaScore: 2,
    bravoScore: 2,
  });
  assert.equal(intermissionWin.visible, true);
  assert.equal(intermissionWin.kickerFa, 'راند 4 به پایان رسید');
  assert.ok(intermissionWin.headlineFa.includes('برندهٔ راند'));

  const intermissionDraw = resolveHudV3RoundIntermission({
    screenState: 'playing',
    mode: 'tdm_1v1',
    roundPhase: 'intermission',
    currentRound: 2,
    roundWinnerTeam: 'draw',
    alphaScore: 1,
    bravoScore: 1,
  });
  assert.equal(intermissionDraw.visible, true);
  assert.equal(intermissionDraw.headlineFa, 'پایان راند · تساوی');
});

test('UI v3 Stage 3 HUD — Top bar height budget stays <= 6% across 667x375, 800x360, 932x430', () => {
  assert.equal(computeTopBarHeightRatioPct(21, 360).withinBudget, true);
  assert.equal(computeTopBarHeightRatioPct(22, 375).withinBudget, true);
  assert.equal(computeTopBarHeightRatioPct(25, 430).withinBudget, true);
  assert.equal(computeTopBarHeightRatioPct(28, 360).withinBudget, false);
});

test('UI v3 Stage 3 — minimalHud preference defaults to false and persists cleanly', () => {
  assert.equal(DEFAULT_UI_V3_PREFERENCES.minimalHud, false);
  const map = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
  };
  saveUiV3Preferences({ ...DEFAULT_UI_V3_PREFERENCES, uiMode: 'v3', minimalHud: true }, mockStorage);
  const loaded = loadUiV3Preferences(mockStorage);
  assert.equal(loaded.uiMode, 'v3');
  assert.equal(loaded.minimalHud, true);

  const sanitized = validateUiV3Preferences({ uiMode: 'v3', minimalHud: 'yes' });
  assert.equal(sanitized.minimalHud, false);
});

test('UI v3 Classic Controls Style — defaults to glass, persists classic non-glassy choice, and resolves properly across UI modes', () => {
  assert.equal(DEFAULT_UI_V3_PREFERENCES.controlsStyle, 'glass');

  const map = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
  };

  saveUiV3Preferences(
    { ...DEFAULT_UI_V3_PREFERENCES, uiMode: 'v3', controlsStyle: 'classic' },
    mockStorage
  );
  const loaded = loadUiV3Preferences(mockStorage);
  assert.equal(loaded.controlsStyle, 'classic');

  assert.equal(validateUiV3Preferences({ uiMode: 'v3', controlsStyle: 'unknown' }).controlsStyle, 'glass');
  assert.equal(validateUiV3Preferences({ uiMode: 'v3', controlsStyle: 'classic' }).controlsStyle, 'classic');

  assert.equal(resolveHudV3ControlsStyle({ uiVersion: 'v3', controlsStyle: 'glass' }), 'glass');
  assert.equal(resolveHudV3ControlsStyle({ uiVersion: 'v3', controlsStyle: 'classic' }), 'classic');
  assert.equal(resolveHudV3ControlsStyle({ uiVersion: 'legacy', controlsStyle: 'glass' }), 'classic');
});

