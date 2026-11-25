import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_UI_V3_PREFERENCES,
  HUD_V3_MIN_INTERVAL_MS,
  LEGACY_UI_VERSION_STORAGE_KEY,
  LIQUID_GLASS_LOW_FPS_THRESHOLD,
  LIQUID_GLASS_MAX_BLUR_LAYERS,
  UI_V3_CONTROL_LAYOUT_STORAGE_KEY,
  UI_V3_OPTION_LABEL_FA,
  UI_V3_PENDING_SWITCH_MSG_FA,
  UI_V3_PREFS_STORAGE_KEY,
  UI_V3_STAGE,
  UI_V3_STAGE_LABEL,
  hasHudSnapshotChanged,
  loadUiV3Preferences,
  loadV3ControlLayout,
  resetV3ControlLayoutStorage,
  resolveLiquidGlassCapabilities,
  resolveThreeWayUiSwitch,
  saveUiV3Preferences,
  saveV3ControlLayout,
  shouldEmitHudSnapshot,
  validateUiV3Preferences,
} from '../ui-v3/uiV3Store';
import {
  COSMETIC_ITEMS,
  COSMETICS_STATE_VERSION,
  INITIAL_FREE_SPINS,
  KILLS_PER_FREE_SPIN,
  LEGENDARY_AK47_ID,
  LEGENDARY_SNIPER_ID,
  MYTHIC_M249_ID,
  MYTHIC_SHOTGUN_ID,
  PITY_GUARANTEE_THRESHOLD,
  RARITY_META,
  SHARDS_PER_FREE_SPIN,
  awardMatchWinSpin,
  buildSpinReelStrip,
  canClaimDailyFreeSpin,
  claimDailyFreeSpin,
  computeSpinReelTargetOffsetPx,
  createInitialCosmeticsState,
  equipCosmeticItem,
  executeLuckySpin,
  getBannerPityCounter,
  getCosmeticItem,
  getSpinBannerItems,
  isEclipseBreacherKill,
  isInfernoReaperKill,
  isTempestAegisKill,
  isVoidPiercerKill,
  recordKillsForSpinReward,
  resolveEffectiveMuzzleFlashColorInt,
  resolveEffectiveTracerColorInt,
  resolveRemoteWeaponSkinAccentHex,
  resolveSpinReelIndexAtOffsetPx,
  resolveTempestRainbowColorInt,
  sanitizeOnlineCosmetics,
  secureRandomInt,
  secureRandomUnit,
  selectRarityFromBasisPoints,
  selectRarityFromUnit,
  selectRarityFromWeights,
  toOnlineSyncedCosmetics,
  unlockCosmeticItem,
  validateCosmeticsState,
} from './cosmetics';
import { SPIN_BANNERS, getSpinBannerConfig } from './spins.config';
import {
  DEFAULT_UI_V2_PREFERENCES,
  UI_V2_ALPHA_LABEL,
  UI_V2_CONTROL_LAYOUT_STORAGE_KEY,
  UI_V2_PENDING_SWITCH_MSG_FA,
  UI_V2_STAGE,
  UI_V2_STAGE_LABEL,
  UI_V2_STAGE_NOTICE_FA,
  UI_VERSION_SCHEMA_VERSION,
  UI_VERSION_STORAGE_KEY,
  getActiveQuickGraphicsTier,
  loadUiV2Preferences,
  loadV2ControlLayout,
  resetV2ControlLayoutStorage,
  resolveQuickGraphicsPreset,
  resolveUiSwitchTransition,
  saveUiV2Preferences,
  saveV2ControlLayout,
  validateUiV2Preferences,
} from '../ui-v2/uiVersionStore';
import {
  CONTROL_LAYOUT_STORAGE_KEY,
  loadSavedControlLayout,
  saveControlLayout,
} from './controlLayout';
import {
  ALLOWED_EMOTE_IDS,
  MYTHIC_M249_EMOTE_ID,
  MYTHIC_M249_PERKS,
  MYTHIC_PERK_SUMMARY_FA,
  MYTHIC_SHOTGUN_EMOTE_ID,
  MYTHIC_SHOTGUN_PERKS,
  MYTHIC_SHOTGUN_SKIN_ID,
  MYTHIC_SHOTGUN_WEAPON_ID,
  computeEffectiveAimAssistWithMythicPerk,
  getLobbyMythicHolderNames,
  getLobbyMythicSummary,
  getMythicAdsSmoothMultiplier,
  getMythicAdsSwayMultiplier,
  getMythicCameraRecoilMultiplier,
  getMythicShotgunMagSize,
  getMythicShotgunReloadDuration,
  isMythicM249PerksActive,
  isMythicShotgunPerksActive,
  sanitizeEmoteId,
} from './mythicPerks';
import {
  ALLOWED_REDEEM_REWARD_IDS,
  REDEEM_LOCKOUT_DURATION_MS,
  REDEEM_MAX_FAILED_ATTEMPTS,
  createInitialRedeemLockoutState,
  getRedeemLockoutRemainingMs,
  normalizeRedeemCode,
  parseAllowedRedeemRewardId,
  recordRedeemFailure,
  validateRedeemLockoutState,
} from './redeem';
import {
  handler as netlifyRedeemHandler,
  normalizeRedeemInput as netlifyNormalizeRedeemInput,
} from '../../netlify/functions/redeem.mjs';
import {
  sanitizeTrainingConfig,
  getEnabledWeaponIndices,
  computeBotParameters,
  calculateWeaponDamage,
  calculateDamageTaken,
  createInitialTutorialState,
  recordTutorialProgress,
  toggleTutorialStepChecklist,
  resolveCircleAABB,
  DEFAULT_TRAINING_CONFIG,
  sanitizeCheatConfig,
  computeAimAssistAngles,
  MAP_LIST,
  WEAPON_CATALOG,
  sanitizeLoadout,
  toggleLoadoutWeapon,
  verifyCheatPasscode,
  computeAutoCornerLean,
  hasLineOfSight3D,
  CHEAT_UNLOCK_DURATION_SEC,
  tickCheatUnlockTimer,
  normalizeRoomCode,
  computeBotStanceTransition,
  computeBotStancePose,
  computeWeaponSlotTelemetry,
  computeSmartBotSteering,
  DEFAULT_CHEAT_CONFIG,
  PEERJS_STUN_SERVERS,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  generatePeerRoomCode,
  roomCodeToHostPeerId,
  buildRoomInviteUrl,
  parseRoomInviteFromUrl,
  areAllLobbyPlayersReady,
  formatConnectionStatusFa,
  mergeClientInputIntoHostState,
  removeDisconnectedPlayerFromHostState,
  AuthoritativeRoomState,
  ALL_WEAPON_IDS,
  ROUND_MATCH_WIN_SCORE,
  ROUND_COUNTDOWN_SEC,
  SPAWN_PROTECTION_SEC,
  KILL_FEED_MAX_ITEMS,
  KILL_FEED_TTL_MS,
  getWeaponShortName,
  canDamagePlayer,
  assignBalancedTeam,
  awardRoundPointToTeam,
  beginRoundCountdownState,
  finishRoundCountdownState,
  startNextAuthoritativeRound,
  isRoundInputLocked,
  isPlayerSpawnProtected,
  clearPlayerSpawnProtection,
  selectInitialSpectatorTarget,
  cycleSpectatorTarget,
  appendKillFeedEntry,
  pruneExpiredKillFeed,
  formatRoundClock,
  isRoundBasedMode,
  getCurrentOriginShareBaseUrl,
  checkOnlineVersionCompatibility,
  VERSION_MISMATCH_MESSAGE_FA,
  isStaleClientInputForRespawn,
  shouldInstantTeleportRemotePlayer,
  getTeamSpawnPosition,
  resetAuthoritativeMatch,
  classifyPingQuality,
  sortScoreboardPlayers,
  FOOTSTEP_MAX_RANGE_M,
  computeFootstepGain,
  toggleRematchVote,
  areAllActivePlayersReadyForRematch,
  castMapVote,
  resolveMapVoteWinner,
  RECONNECT_GRACE_MS,
  markPlayerDisconnectedInHostState,
  reclaimDisconnectedPlayerInHostState,
  pruneExpiredDisconnectedPlayers,
  isValidMapId,
  getMapArenaHalf,
  DEFAULT_AIM_ASSIST_STRENGTH,
  resolveEffectiveAimAssistStrength,
  computeSoftAimAssistAngles,
  isRemotePlayerEligibleForAimAssist,
  SLIDE_DURATION_SEC,
  SLIDE_COOLDOWN_SEC,
  SLIDE_INITIAL_SPEED,
  SLIDE_END_SPEED,
  PLAYER_STAND_EYE_HEIGHT,
  PLAYER_SLIDE_EYE_HEIGHT,
  PLAYER_STAND_HITBOX_HEIGHT,
  PLAYER_SLIDE_HITBOX_HEIGHT,
  createInitialSlideState,
  canTriggerSlide,
  triggerSlide,
  cancelSlide,
  stepSlideState,
  computeAccuracyPercent,
  computeMatchSummaryStats,
  DEFAULT_HOST_MATCH_SETTINGS,
  sanitizeHostMatchSettings,
  TEAM_PING_TTL_MS,
  TEAM_QUICK_MSG_TTL_MS,
  TEAM_QUICK_MESSAGES,
  getTeamQuickMessageTextFa,
  isTeamCommsMode,
  shouldReceiveTeamSignal,
  pruneExpiredTeamSignals,
  validateClientMovementPosition,
  validateClientShootEvent,
  validateAuthoritativeHitDamage,
  getRoundModeTeamCapacity,
  getOnlineBotDifficultyProfile,
  assignBalancedHumanTeam,
  reconcileOnlineBots,
  stepOnlineBotsAuthoritative,
  formatOnlineBotDifficultyFa,
  QUICK_TUTORIAL_STORAGE_KEY,
  createQuickTutorialState,
  advanceQuickTutorial,
  shouldAutoStartQuickTutorial,
  OG_ROOM_ERROR_FA,
  NON_OG_ROOM_ERROR_FA,
  isOgOnlineMode,
  validateOgJoinCompatibility,
  sanitizeOgRoomMap,
  formatGameModeFa,
} from './rules.ts';
import {
  OG_BASE_WEAPONS,
  OG_CLASSIC_MAPS,
  OG_CONFIG_VERSION,
  OG_EVENT_CONFIG,
  OG_FEATURE_FLAGS,
  OG_UNCERTAIN_FLAG_KEYS,
  formatOgCountdownFa,
  getOgAllowedMaps,
  getOgAllowedWeapons,
  resolveEffectiveFeatures,
} from '../og/og.config';
import {
  OG_STATE_SCHEMA_VERSION,
  OG_STORAGE_KEY,
  createDefaultOgState,
  loadOgState,
  recordOgMatchResult,
  sanitizeOgState,
  saveOgState,
} from '../og/ogStore';
import {
  getDefaultControlLayout,
  clampControlSlot,
  sanitizeControlLayout,
  ALL_CONTROL_SLOT_IDS,
  CONTROL_SLOT_META,
  loadShowFpsHud,
  clampCrosshairSize,
  loadCrosshairSize,
  loadCrosshairStyle,
  loadShowPingHud,
  clampFootstepVolume,
  loadFootstepVolume,
  clampAimAssistStrength,
  loadAimAssistStrength,
  loadSlideAlphaEnabled,
  loadVibrationEnabled,
  loadAutoReloadEnabled,
  loadShowAdBillboards,
  saveShowAdBillboards,
  SHOW_AD_BILLBOARDS_STORAGE_KEY,
  clampCameraMotionIntensity,
  loadCameraMotionIntensity,
  loadReducedMotionEnabled,
  loadAutoQualityEnabled,
  CAMERA_MOTION_INTENSITY_STORAGE_KEY,
  REDUCED_MOTION_STORAGE_KEY,
  AUTO_QUALITY_STORAGE_KEY,
  SHOW_PERF_PROFILER_STORAGE_KEY,
  loadShowPerfProfiler,
  SKIN_FX_MODE_STORAGE_KEY,
  loadSkinFxMode,
  saveSkinFxMode,
  ALL_SETTINGS_STORAGE_KEYS,
} from './controlLayout.ts';
import {
  MOBILE_MAX_PIXEL_RATIO,
  DESKTOP_MAX_PIXEL_RATIO,
  detectIsMobileDevice,
  computeEffectivePixelRatio,
  computeEffectiveShadowConfig,
  createAdaptiveQualityState,
  getAdaptiveQualityEffects,
  stepAdaptiveQuality,
  shouldCullSmallProp,
  GLOBAL_PARTICLE_CAP,
  resolveDefaultSkinFxMode,
  resolveEffectiveSkinFx,
  computeRemainingParticleAllowance,
  shouldPauseMainSceneRender,
  resolveActiveSightMode,
  CLIENT_SYNC_INTERVAL_SEC,
  CLIENT_IDLE_HEARTBEAT_MS,
  shouldSendClientStateDelta,
  encodeCompactClientInput,
  decodeCompactClientInput,
  encodeCompactPlayerPose,
  decodeCompactPlayerPose,
  lerpAngle,
  computeSmoothedRemoteTransform,
} from './perf.ts';
import {
  PLAYER_ANIM_STATE_TO_CODE,
  encodePlayerAnimState,
  decodePlayerAnimState,
  resolveLocalPlayerAnimState,
  computeRemoteLocomotionFromSpeed,
  computeHumanoidVisualPose,
  HUMANOID_DEATH_FALL_SEC,
  HUMANOID_DEATH_FADE_START_SEC,
  HUMANOID_DEATH_TOTAL_SEC,
  HUMANOID_RESPAWN_DURATION_SEC,
  WEAPON_ANIM_PROFILES,
  getWeaponAnimProfile,
  computeWeaponReloadPose,
  computeWeaponSwitchPose,
  computeKatanaSlashPose,
  getEffectiveCameraMotionScale,
  computeCameraMotionOffsets,
  getBaseFxTierForPreset,
  computeFxBudget,
  createAutoQualityMonitorState,
  stepAutoQualityTier,
} from './animations.ts';
import {
  AD_BILLBOARDS_BY_MAP,
  ALL_AD_BILLBOARDS,
  getMapAdBillboards,
  resolveSafeLocalAdPath,
  computeBillboardDimensions,
} from './ads.config.ts';
import {
  MAX_VOICE_PLAYERS,
  isVoiceChatSecureContext,
  getAudioCaptureConstraints,
  mapMicrophoneErrorToFa,
  computeRmsAudioLevel,
  shouldPlayRemoteVoice,
  selectVoiceMeshTargets,
  shouldPreferOutgoingCallOnGlare,
} from './voiceChat.ts';
import {
  PEERJS_BROKER_CONFIG,
  DIRECT_CONNECT_RELAY_FALLBACK_MS,
  buildPeerBrokerList,
  computeReconnectBackoffMs,
  inspectTurnCapabilities,
  resolveRuntimeIceServers,
  clearCachedIceConfig,
  getPeerBrokerHealthUrl,
  getPeerJsClientOptions,
} from './peerConfig.ts';
import {
  classifyConnectionTypeFa,
  diagnosePeerConnectionFailureFa,
  formatTurnWorkerStatusFa,
} from './peerDiagnostics.ts';
import { generateQrMatrix, renderQrSvgPath } from './qrSvg.ts';
import { APP_VERSION, BUILD_DATE } from './version.ts';

test('sanitizeTrainingConfig clamps out-of-range values and enforces at least one weapon', () => {
  const cfg = sanitizeTrainingConfig({
    botSpeed: 99,
    botAccuracy: -20,
    botAggression: 250,
    spawnCount: 40,
    enabledWeapons: {
      ak47: false,
      m4a1: false,
      sniper: false,
      mp5: false,
      shotgun: false,
      pistol: false,
      katana: false,
      lmg: false,
      deagle: false,
      rpg: false,
    },
  });

  assert.equal(cfg.botSpeed, 1.8);
  assert.equal(cfg.botAccuracy, 10);
  assert.equal(cfg.botAggression, 100);
  assert.equal(cfg.spawnCount, 12);
  assert.equal(cfg.enabledWeapons.ak47, true);
  assert.deepEqual(getEnabledWeaponIndices(cfg.enabledWeapons), [0]);
});

test('computeBotParameters scales bot spread, bulletSpeed, and fire interval with accuracy and aggression in training mode', () => {
  const relaxed = computeBotParameters('training', 'custom', {
    ...DEFAULT_TRAINING_CONFIG,
    botAccuracy: 15,
    botAggression: 15,
    botSpeed: 0.5,
  });
  const intense = computeBotParameters('training', 'custom', {
    ...DEFAULT_TRAINING_CONFIG,
    botAccuracy: 95,
    botAggression: 95,
    botSpeed: 1.5,
  });

  assert.ok(intense.spread < relaxed.spread, 'higher accuracy should reduce bullet spread');
  assert.ok(intense.fireIntervalMult < relaxed.fireIntervalMult, 'higher aggression should reduce fire interval');
  assert.ok(intense.bulletSpeed > relaxed.bulletSpeed, 'higher aggression should increase bullet speed');
  assert.equal(relaxed.speedMult, 0.5);
  assert.equal(intense.speedMult, 1.5);
});

test('calculateWeaponDamage and calculateDamageTaken handle headshots, overdrive 2x, and armor absorption', () => {
  assert.equal(calculateWeaponDamage(36, 2.2, false, false), 36);
  assert.equal(calculateWeaponDamage(36, 2.2, true, false), 79);
  assert.equal(calculateWeaponDamage(36, 2.2, true, true), 158);

  const hitWithArmor = calculateDamageTaken(20, 100, 50);
  assert.equal(hitWithArmor.armorAbsorbed, 13);
  assert.equal(hitWithArmor.hpDamage, 7);
  assert.equal(hitWithArmor.nextArmor, 37);
  assert.equal(hitWithArmor.nextHp, 93);
});

test('tutorial progression tracks movement, shooting, reloading, and powerups to completion', () => {
  let state = createInitialTutorialState();
  assert.equal(state.activeStepIndex, 0);
  assert.equal(state.allCompleted, false);

  const step1 = recordTutorialProgress(state, 'movement', 12);
  state = step1.nextState;
  assert.equal(step1.newlyCompletedStep, 'movement');
  assert.equal(state.steps[0].completed, true);
  assert.equal(state.activeStepIndex, 1);

  state = recordTutorialProgress(state, 'shooting', 3).nextState;
  assert.equal(state.steps[1].completed, true);
  assert.equal(state.activeStepIndex, 2);

  state = recordTutorialProgress(state, 'reloading', 1).nextState;
  assert.equal(state.steps[2].completed, true);
  assert.equal(state.activeStepIndex, 3);

  state = recordTutorialProgress(state, 'powerups', 1).nextState;
  assert.equal(state.steps[3].completed, true);
  assert.equal(state.allCompleted, true);
});

test('toggleTutorialStepChecklist marks individual steps completed or uncompleted in checklist', () => {
  let state = createInitialTutorialState();
  assert.equal(state.steps[2].completed, false);

  state = toggleTutorialStepChecklist(state, 'reloading');
  assert.equal(state.steps[2].completed, true);
  assert.equal(state.steps[2].current, state.steps[2].target);

  state = toggleTutorialStepChecklist(state, 'reloading');
  assert.equal(state.steps[2].completed, false);
  assert.equal(state.steps[2].current, 0);
});

test('resolveCircleAABB pushes player out of obstacle collider and respects elevated crate tops', () => {
  const colliders = [
    {
      x: 0,
      z: 0,
      w: 4,
      d: 4,
      height: 1.5,
      minX: -2,
      maxX: 2,
      minZ: -2,
      maxZ: 2,
    },
  ];

  const groundRes = resolveCircleAABB(2.2, 0, 0.7, 0, colliders, 32);
  assert.ok(groundRes.x >= 2.69, 'should push circle outside maxX + radius');
  assert.equal(groundRes.floorY, 0);

  const topRes = resolveCircleAABB(0, 0, 0.7, 1.5, colliders, 32);
  assert.equal(topRes.floorY, 1.5);
});

test('sanitizeCheatConfig and computeAimAssistAngles steer camera toward visible target and reject wall-obscured targets', () => {
  assert.equal(MAP_LIST.length, 4);
  assert.ok(MAP_LIST.some((m) => m.id === 'duel'), 'MAP_LIST should include the symmetrical 1v1 duel map');
  const cheat = sanitizeCheatConfig({ aimAssistStrength: 150, godMode: true });
  assert.equal(cheat.aimAssistStrength, 100);
  assert.equal(cheat.godMode, true);

  // Camera at (0, 1.7, 0) looking along -Z (yaw=0, pitch=0). Target slightly to the right at (1.5, 1.7, -12).
  const res = computeAimAssistAngles(
    0,
    1.7,
    0,
    0,
    0,
    [{ id: 'bot-1', x: 1.5, y: 1.7, z: -12, visible: true }],
    85,
    0.05,
    true
  );
  assert.ok(res.lockedTarget !== null, 'should lock onto target inside cone');
  assert.ok(res.nextYaw < 0, 'yaw should steer negatively toward +X target');

  // Target behind a tall wall from z=-6 to z=-4 -> hasLineOfSight3D is false and aim-assist must NOT lock
  const wallBetween = [
    {
      x: 0,
      z: -5,
      w: 8,
      d: 2,
      height: 3.5,
      minX: -4,
      maxX: 4,
      minZ: -6,
      maxZ: -4,
    },
  ];
  assert.equal(hasLineOfSight3D(0, 1.7, 0, 1.5, 1.7, -12, wallBetween), false);
  const blockedRes = computeAimAssistAngles(
    0,
    1.7,
    0,
    0,
    0,
    [{ id: 'bot-1', x: 1.5, y: 1.7, z: -12 }],
    85,
    0.05,
    true,
    wallBetween
  );
  assert.equal(blockedRes.lockedTarget, null, 'aim-assist must not lock onto targets behind walls');
});

test('3-weapon loadout sanitizer and selector enforce 3 unique weapons including sniper and mp5', () => {
  assert.ok(WEAPON_CATALOG.some((w) => w.id === 'sniper'));
  assert.ok(WEAPON_CATALOG.some((w) => w.id === 'mp5'));

  const clean = sanitizeLoadout(['sniper', 'sniper']);
  assert.equal(clean.length, 3);
  assert.equal(new Set(clean).size, 3);

  const updated = toggleLoadoutWeapon(['ak47', 'sniper', 'pistol'], 'mp5', 2);
  assert.deepEqual(updated, ['ak47', 'sniper', 'mp5']);
});

test('verifyCheatPasscode and 30-second cheat auto-lock timer work as expected', () => {
  assert.equal(verifyCheatPasscode('پارسا ۳۴۳۵'), true);
  assert.equal(verifyCheatPasscode('پارسا۳۴۳۵'), true);
  assert.equal(verifyCheatPasscode('پارسا 3435'), true);
  assert.equal(verifyCheatPasscode('wrong1234'), false);
  assert.equal(verifyCheatPasscode(''), false);

  assert.equal(CHEAT_UNLOCK_DURATION_SEC, 30);
  const after10s = tickCheatUnlockTimer(30, 10);
  assert.equal(after10s.unlocked, true);
  assert.equal(after10s.remainingSec, 20);

  const after30s = tickCheatUnlockTimer(after10s.remainingSec, 20);
  assert.equal(after30s.unlocked, false);
  assert.equal(after30s.remainingSec, 0);
});

test('normalizeRoomCode normalizes codes with or without BC- prefix and Persian digits', () => {
  assert.equal(normalizeRoomCode('4821'), 'BC-4821');
  assert.equal(normalizeRoomCode('bc-4821'), 'BC-4821');
  assert.equal(normalizeRoomCode('۴۸۲۱'), 'BC-4821');
  assert.equal(normalizeRoomCode('BC9911'), 'BC-9911');
});

test('computeAutoCornerLean leans around true corners but stays 0 when walking parallel to a wall', () => {
  // Wall from x=-4 to x=0, z=-2 to z=0 (right edge is at x=0)
  const wall = [
    {
      x: -2,
      z: -1,
      w: 4,
      d: 2,
      height: 3.0,
      minX: -4,
      maxX: 0,
      minZ: -2,
      maxZ: 0,
    },
  ];

  // Player standing near right corner (x = -0.1, z = 1.1) facing -Z (yaw = 0):
  // Left/center is blocked by wall, right peek lane (x = +0.64) is open -> should lean right (+1)
  const rightCornerLean = computeAutoCornerLean(-0.1, 0, 1.1, 0, true, 0, 0, wall, 32);
  assert.equal(rightCornerLean, 1);

  // Player walking parallel to a wall far to their left (no wall in front) -> should NOT lean (0)
  const parallelWalkLean = computeAutoCornerLean(0.8, 0, 5.0, 0, false, 0, 0, wall, 32);
  assert.equal(parallelWalkLean, 0);
});

test('computeBotStanceTransition and computeBotStancePose smoothly blend from low-ready patrol to shouldered combat stance', () => {
  // 1. In pure patrol (no LOS, far away), blend stays at 0 and rifle is held at diagonal low-ready
  const patrolState = computeBotStanceTransition(0, 0, 0, Math.PI / 2, 0.2, false, 22, 0.016);
  assert.equal(patrolState.combatBlend, 0);
  const patrolPose = computeBotStancePose(patrolState.combatBlend, Math.PI / 2, true);
  assert.ok(patrolPose.weaponPitch > 0.3, 'Patrol stance should pitch rifle barrel down/diagonal');
  assert.ok(patrolPose.weaponYaw < -0.3, 'Patrol stance should angle rifle across chest');
  assert.ok(Math.abs(patrolPose.headYaw) > 0.1, 'Patrol stance should scan head left/right');

  // 2. Upon detection (hasLOS = true), blend progresses smoothly over frames (not an instant 0->1 snap)
  let state = patrolState;
  state = computeBotStanceTransition(
    state.combatBlend,
    state.alertTimer,
    state.currentYaw,
    Math.PI,
    0,
    true,
    15,
    0.05
  );
  assert.ok(state.combatBlend > 0.1 && state.combatBlend < 0.5, 'Stance transition should be gradual on first frame');
  assert.ok(state.currentYaw > 0.2 && state.currentYaw < Math.PI, 'Body yaw should rotate smoothly toward target');

  // Advance ~0.8 seconds of continuous combat tracking
  for (let i = 0; i < 16; i++) {
    state = computeBotStanceTransition(
      state.combatBlend,
      state.alertTimer,
      state.currentYaw,
      Math.PI,
      0,
      true,
      15,
      0.05
    );
  }
  assert.ok(state.combatBlend > 0.95, 'After ~0.8s of detection, bot should reach full combat stance');
  const combatPose = computeBotStancePose(state.combatBlend, Math.PI / 2, true);
  assert.ok(Math.abs(combatPose.weaponPitch) < 0.03, 'Combat stance should level rifle barrel forward');
  assert.ok(Math.abs(combatPose.weaponYaw) < 0.03, 'Combat stance should align rifle with sightline');
  assert.ok(combatPose.torsoPitch > patrolPose.torsoPitch, 'Combat stance should lean torso forward aggressively');
  assert.ok(combatPose.weaponPosY > patrolPose.weaponPosY, 'Combat stance should raise rifle to shoulder height');
});

test('computeWeaponSlotTelemetry computes dynamic health and ammo status telemetry for weapon bar buttons', () => {
  assert.equal(DEFAULT_CHEAT_CONFIG.aimAssistStrength, 10);

  const fullSlot = computeWeaponSlotTelemetry('ak47', false, 30, 30, 120, 92, 100, false, false);
  assert.equal(fullSlot.shortCode, 'AK-47');
  assert.equal(fullSlot.ammoLevel, 'full');
  assert.equal(fullSlot.ammoPct, 100);
  assert.equal(fullSlot.ammoLabel, '30/120');
  assert.equal(fullSlot.healthLevel, 'optimal');
  assert.equal(fullSlot.healthLabel, '92%');

  const lowSlot = computeWeaponSlotTelemetry('sniper', false, 1, 5, 15, 22, 100, false, false);
  assert.equal(lowSlot.shortCode, 'AWM .338');
  assert.equal(lowSlot.ammoLevel, 'low');
  assert.equal(lowSlot.ammoPct, 20);
  assert.equal(lowSlot.healthLevel, 'critical');
  assert.equal(lowSlot.healthLabel, '22%');

  const meleeSlot = computeWeaponSlotTelemetry('katana', true, 1, 1, 0, 50, 100, false, true);
  assert.equal(meleeSlot.ammoLevel, 'melee');
  assert.equal(meleeSlot.ammoLabel, 'MELEE');
  assert.equal(meleeSlot.healthLabel, '∞');
});

test('computeSmartBotSteering steers around blocking walls toward goal', () => {
  const wallAhead = [
    {
      x: 0,
      z: 0,
      w: 2.2,
      d: 1.0,
      height: 3.0,
      minX: -1.1,
      maxX: 1.1,
      minZ: -0.5,
      maxZ: 0.5,
    },
  ];
  // Bot at (0, -1.2) trying to walk straight to (0, 5.0) with a crate at z=[-0.5, 0.5]
  const steer = computeSmartBotSteering(0, -1.2, 0, 5.0, 1, 0.55, wallAhead, 32);
  assert.equal(steer.blockedAhead, true);
  assert.ok(Math.abs(steer.dirX) > 0.3, 'Bot should steer laterally around obstacle instead of walking straight into wall');
});

test('PeerJS WebRTC P2P helpers generate BC-XXXX codes, deterministic Peer IDs, invite URLs, and 6 public STUN servers', () => {
  assert.ok(PEERJS_STUN_SERVERS.length >= 5, 'Should configure multiple public STUN servers');
  assert.ok(PEERJS_STUN_SERVERS.some((s) => s.urls.includes('stun.l.google.com:19302')));

  const code = generatePeerRoomCode((len) => {
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) arr[i] = i * 3;
    return arr;
  });
  assert.equal(code.length, ROOM_CODE_LENGTH);
  assert.match(code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);

  assert.equal(roomCodeToHostPeerId('hd7p'), 'bodycam-vanguard-p2p-BC-HD7P');
  assert.equal(roomCodeToHostPeerId('BC-HD7P'), 'bodycam-vanguard-p2p-BC-HD7P');
  assert.equal(roomCodeToHostPeerId('k7m9p2x4'), 'bodycam-vanguard-p2p-K7M9P2X4');

  const url = buildRoomInviteUrl('https://my-game.example/?old=1', 'K7M9P2X4');
  assert.equal(url, 'https://my-game.example/#room=K7M9P2X4');

  const connectingStatus = formatConnectionStatusFa('connecting', 'client');
  assert.equal(connectingStatus.badgeFa, 'در حال اتصال...');
  const connectedStatus = formatConnectionStatusFa('connected', 'host');
  assert.equal(connectedStatus.badgeFa, 'متصل شد (Online P2P)');
  const errStatus = formatConnectionStatusFa('error', 'client', 'میزبان یافت نشد');
  assert.equal(errStatus.labelFa, 'میزبان یافت نشد');
});

test('Host-Authoritative state reducer merges client inputs and cleanly removes disconnected players', () => {
  let room: AuthoritativeRoomState = {
    code: 'BC-HD7P',
    name: 'اتاق GHOST-01',
    mapId: 'warehouse',
    mode: 'coop',
    hostId: 'host-1',
    hostName: 'GHOST-01',
    wave: 2,
    teamScore: 200,
    playerCount: 1,
    alphaScore: 0,
    bravoScore: 0,
    currentRound: 1,
    roundTimeRemainingSec: 90,
    roundPhase: 'playing',
    roundWinnerTeam: null,
    matchWinnerTeam: null,
    targetWinRounds: 6,
    players: [
      {
        id: 'host-1',
        name: 'GHOST-01',
        team: 'alpha',
        alive: true,
        x: 0,
        y: 0,
        z: 20,
        yaw: 0,
        pitch: 0,
        weaponIdx: 0,
        hp: 100,
        maxHp: 100,
        kills: 2,
        score: 200,
        color: '#00f0ff',
        isHost: true,
        lastSeen: 1000,
      },
    ],
  };

  room = mergeClientInputIntoHostState(
    room,
    {
      id: 'client-2',
      name: 'FRIEND-02',
      x: 5.5,
      y: 0,
      z: 14.2,
      yaw: 1.1,
      pitch: -0.1,
      weaponIdx: 2,
      hp: 85,
      kills: 3,
      score: 350,
    },
    2000
  );

  assert.equal(room.playerCount, 2);
  assert.equal(room.teamScore, 550);
  assert.equal(room.players[1].name, 'FRIEND-02');
  assert.equal(room.players[1].x, 5.5);

  const afterLeave = removeDisconnectedPlayerFromHostState(room, 'client-2');
  assert.equal(afterLeave.removedPlayer?.name, 'FRIEND-02');
  assert.equal(afterLeave.nextRoom.playerCount, 1);
  assert.equal(afterLeave.nextRoom.teamScore, 200);
});

test('ALL_WEAPON_IDS and WEAPON_CATALOG have exact 1-to-1 ordering across all 10 weapons', () => {
  assert.equal(ALL_WEAPON_IDS.length, 10);
  assert.equal(WEAPON_CATALOG.length, 10);
  assert.deepEqual(
    WEAPON_CATALOG.map((w) => w.id),
    ALL_WEAPON_IDS
  );
  assert.deepEqual(ALL_WEAPON_IDS, [
    'ak47',
    'm4a1',
    'sniper',
    'mp5',
    'shotgun',
    'pistol',
    'katana',
    'lmg',
    'deagle',
    'rpg',
  ]);
});

test('Call of Duty Round-Based Team Mode enforces Friendly Fire OFF, balanced teams, 6-round win target, and round respawns', () => {
  assert.equal(ROUND_MATCH_WIN_SCORE, 6);
  assert.equal(isRoundBasedMode('tdm_1v1'), true);
  assert.equal(isRoundBasedMode('tdm_2v2'), true);
  assert.equal(isRoundBasedMode('coop'), false);
  assert.equal(formatRoundClock(90), '01:30');
  assert.equal(formatRoundClock(5), '00:05');

  // Friendly fire is OFF in tdm_1v1, tdm_2v2, and coop; only opposing teams can damage each other
  assert.equal(canDamagePlayer('tdm_1v1', 'alpha', 'alpha', 'p1', 'p2'), false);
  assert.equal(canDamagePlayer('tdm_2v2', 'bravo', 'bravo', 'p1', 'p2'), false);
  assert.equal(canDamagePlayer('tdm_1v1', 'alpha', 'bravo', 'p1', 'p2'), true);
  assert.equal(canDamagePlayer('tdm_2v2', 'bravo', 'alpha', 'p1', 'p2'), true);
  assert.equal(canDamagePlayer('coop', 'alpha', 'bravo', 'p1', 'p2'), false);
  assert.equal(canDamagePlayer('pvp', 'alpha', 'alpha', 'p1', 'p2'), true);

  let room: AuthoritativeRoomState = {
    code: 'BC-COD6',
    name: 'اتاق COD',
    mapId: 'warehouse',
    mode: 'tdm_2v2',
    hostId: 'host-1',
    hostName: 'HOST',
    wave: 1,
    teamScore: 0,
    playerCount: 1,
    alphaScore: 0,
    bravoScore: 0,
    currentRound: 1,
    roundTimeRemainingSec: 90,
    roundPhase: 'playing',
    roundWinnerTeam: null,
    matchWinnerTeam: null,
    targetWinRounds: 6,
    players: [
      {
        id: 'host-1',
        name: 'HOST',
        team: 'alpha',
        alive: true,
        x: -18,
        y: 0,
        z: 18,
        yaw: 0,
        pitch: 0,
        weaponIdx: 0,
        hp: 100,
        maxHp: 100,
        kills: 0,
        score: 0,
        color: '#38bdf8',
        isHost: true,
        lastSeen: 1000,
      },
    ],
  };

  // Second player should automatically balance onto team Bravo
  assert.equal(assignBalancedTeam(room.players), 'bravo');
  room = mergeClientInputIntoHostState(
    room,
    {
      id: 'client-2',
      name: 'ENEMY-2',
      x: 18,
      y: 0,
      z: -18,
      yaw: 0,
      pitch: 0,
      weaponIdx: 1,
      hp: 40,
      kills: 0,
      score: 0,
    },
    2000
  );
  assert.equal(room.players[1].team, 'bravo');

  // Award 5 rounds to Alpha and respawning between rounds (intermission -> 3s countdown -> playing)
  for (let r = 1; r <= 5; r++) {
    room = awardRoundPointToTeam(room, 'alpha');
    assert.equal(room.alphaScore, r);
    assert.equal(room.roundPhase, 'intermission');
    room = startNextAuthoritativeRound(room);
    assert.equal(room.roundPhase, 'countdown');
    assert.equal(room.countdownRemainingSec, ROUND_COUNTDOWN_SEC);
    assert.equal(room.currentRound, r + 1);
    assert.equal(room.players[1].hp, 100, 'All players must respawn with 100 HP at start of next round');
    room = finishRoundCountdownState(room);
    assert.equal(room.roundPhase, 'playing');
  }

  // 6th round win triggers match_over with matchWinnerTeam = 'alpha'
  room = awardRoundPointToTeam(room, 'alpha');
  assert.equal(room.alphaScore, 6);
  assert.equal(room.roundPhase, 'match_over');
  assert.equal(room.matchWinnerTeam, 'alpha');
});

test('Public deploy helpers enforce dynamic origin URLs, app version format, and mismatch rejection', () => {
  assert.match(APP_VERSION, /^v\d+\.\d+\.\d+/);
  assert.ok(BUILD_DATE.length >= 10);

  const rootBase = getCurrentOriginShareBaseUrl('https://my-public-fps.web.app', '/');
  assert.equal(rootBase, 'https://my-public-fps.web.app/');
  assert.equal(
    buildRoomInviteUrl(rootBase, 'BC-HD7P', 'docks'),
    'https://my-public-fps.web.app/#room=BC-HD7P'
  );

  const subPathBase = getCurrentOriginShareBaseUrl('https://example.com', '/arena/');
  assert.equal(
    buildRoomInviteUrl(subPathBase, 'k7m9p2x4', 'outpost'),
    'https://example.com/arena/#room=K7M9P2X4'
  );

  const matchOk = checkOnlineVersionCompatibility('v1.0.1', 'v1.0.1');
  assert.equal(matchOk.compatible, true);
  assert.equal(matchOk.messageFa, null);

  const matchDiff = checkOnlineVersionCompatibility('v1.0.1', 'v1.0.0');
  assert.equal(matchDiff.compatible, false);
  assert.equal(matchDiff.messageFa, VERSION_MISMATCH_MESSAGE_FA);
  assert.equal(matchDiff.messageFa, 'نسخه‌ها فرق دارن، صفحه رو رفرش کنید');

  const matchMissing = checkOnlineVersionCompatibility('v1.0.1', undefined);
  assert.equal(matchMissing.compatible, false);
  assert.equal(matchMissing.messageFa, 'نسخه‌ها فرق دارن، صفحه رو رفرش کنید');
});

test('Wall-clock Date.now() round timestamps advance reliably from intermission to next round without stalling', () => {
  const t0 = 1_700_000_000_000;
  let room: AuthoritativeRoomState = {
    code: 'BC-TIME',
    name: 'اتاق تست',
    mapId: 'warehouse',
    mode: 'tdm_1v1',
    hostId: 'h1',
    hostName: 'HOST',
    wave: 1,
    teamScore: 0,
    playerCount: 2,
    alphaScore: 0,
    bravoScore: 0,
    currentRound: 1,
    roundTimeRemainingSec: 90,
    roundPhase: 'playing',
    roundWinnerTeam: null,
    matchWinnerTeam: null,
    targetWinRounds: 6,
    phaseStartedAt: t0,
    roundEndsAt: t0 + 90_000,
    players: [
      {
        id: 'h1',
        name: 'HOST',
        team: 'alpha',
        alive: true,
        x: 0,
        y: 0,
        z: 24,
        yaw: 0,
        pitch: 0,
        weaponIdx: 0,
        hp: 100,
        maxHp: 100,
        kills: 1,
        score: 150,
        color: '#38bdf8',
        isHost: true,
        lastSeen: t0,
      },
      {
        id: 'c1',
        name: 'CLIENT',
        team: 'bravo',
        alive: false,
        x: 5,
        y: 0,
        z: -12,
        yaw: 0,
        pitch: 0,
        weaponIdx: 0,
        hp: 0,
        maxHp: 100,
        kills: 0,
        score: 0,
        color: '#f43f5e',
        isHost: false,
        lastSeen: t0,
      },
    ],
  };

  // Round 1 -> Round 2 -> Round 3
  room = awardRoundPointToTeam(room, 'alpha', t0 + 10_000);
  assert.equal(room.roundPhase, 'intermission');
  assert.equal(room.alphaScore, 1);
  assert.equal(room.phaseStartedAt, t0 + 10_000);
  assert.ok((room.intermissionEndsAt ?? 0) > t0 + 10_000);

  room = startNextAuthoritativeRound(room, t0 + 13_000);
  assert.equal(room.currentRound, 2);
  assert.equal(room.roundPhase, 'countdown');
  assert.equal(room.countdownEndsAt, t0 + 13_000 + ROUND_COUNTDOWN_SEC * 1000);
  assert.equal(room.players[1].alive, true);
  assert.equal(room.players[1].hp, 100);

  room = finishRoundCountdownState(room, t0 + 16_000);
  assert.equal(room.roundPhase, 'playing');
  assert.equal(room.roundEndsAt, t0 + 16_000 + 90_000);

  // Round 2 -> Round 3 even if previous client HP had been 0
  room = awardRoundPointToTeam(room, 'alpha', t0 + 20_000);
  assert.equal(room.alphaScore, 2);
  room = startNextAuthoritativeRound(room, t0 + 23_000);
  assert.equal(room.currentRound, 3);
  assert.equal(room.roundPhase, 'countdown');
  assert.ok(room.players.every((p) => p.alive && p.hp === 100));
  room = finishRoundCountdownState(room, t0 + 26_000);
  assert.equal(room.roundPhase, 'playing');
});

test('PeerJS config module exposes broker settings, non-Google STUN servers, and GitHub Pages subpath URLs', () => {
  assert.equal(PEERJS_BROKER_CONFIG.host, '0.peerjs.com');
  assert.equal(PEERJS_BROKER_CONFIG.secure, true);
  assert.equal(getPeerBrokerHealthUrl(), 'https://0.peerjs.com/peerjs/id');

  const opts = getPeerJsClientOptions();
  assert.ok(opts.config.iceServers.some((s) => s.urls.includes('cloudflare.com')));
  assert.ok(opts.config.iceServers.some((s) => s.urls.includes('twilio.com')));
  assert.ok(opts.config.iceServers.some((s) => s.urls.includes('metered.ca')));
  assert.ok(opts.config.iceServers.some((s) => s.urls.includes('nextcloud.com')));
  assert.ok(opts.config.iceServers.some((s) => s.urls.includes('google.com')));

  const ghBase = getCurrentOriginShareBaseUrl('https://parsa.github.io', '/bodycam-vanguard/');
  assert.equal(
    buildRoomInviteUrl(ghBase, 'K7M9P2X4', 'warehouse'),
    'https://parsa.github.io/bodycam-vanguard/#room=K7M9P2X4'
  );
});

test('Connection diagnostics classify direct vs relay vs LAN and explain failures in Persian', () => {
  assert.equal(classifyConnectionTypeFa('srflx', 2, 1, 0).type, 'direct_p2p');
  assert.equal(classifyConnectionTypeFa('relay', 0, 1, 1).type, 'relay_turn');
  assert.equal(classifyConnectionTypeFa(null, 0, 2, 0).type, 'local_only');
  assert.equal(classifyConnectionTypeFa(null, 0, 0, 0).type, 'none');

  const offlineMsg = diagnosePeerConnectionFailureFa({
    online: false,
    brokerReachable: false,
    iceState: 'new',
    stunCandidatesCount: 0,
    hostCandidatesCount: 0,
  });
  assert.ok(offlineMsg && offlineMsg.includes('اینترنت'));

  const brokerDownMsg = diagnosePeerConnectionFailureFa({
    online: true,
    brokerReachable: false,
    iceState: 'new',
    stunCandidatesCount: 2,
    hostCandidatesCount: 1,
  });
  assert.ok(brokerDownMsg && brokerDownMsg.includes('PeerJS'));

  const stunBlockedMsg = diagnosePeerConnectionFailureFa({
    online: true,
    brokerReachable: true,
    iceState: 'complete',
    stunCandidatesCount: 0,
    hostCandidatesCount: 1,
  });
  assert.ok(stunBlockedMsg && stunBlockedMsg.includes('STUN'));

  const healthyMsg = diagnosePeerConnectionFailureFa({
    online: true,
    brokerReachable: true,
    iceState: 'connected',
    stunCandidatesCount: 2,
    hostCandidatesCount: 1,
  });
  assert.equal(healthyMsg, null);
});

test('Authoritative round respawn places Alpha and Bravo on opposite sides, increments respawnSeq, rejects stale inputs, and triggers instant teleport', () => {
  const t0 = 1_700_000_000_000;
  let room: AuthoritativeRoomState = {
    code: 'BC-RSPN',
    name: 'اتاق تست ریاسپاون',
    mapId: 'warehouse',
    mode: 'tdm_1v1',
    hostId: 'h1',
    hostName: 'ALPHA-1',
    wave: 1,
    teamScore: 0,
    playerCount: 2,
    alphaScore: 0,
    bravoScore: 0,
    currentRound: 1,
    roundTimeRemainingSec: 90,
    roundPhase: 'playing',
    roundWinnerTeam: null,
    matchWinnerTeam: null,
    targetWinRounds: 6,
    players: [
      {
        id: 'h1',
        name: 'ALPHA-1',
        team: 'alpha',
        alive: true,
        x: 4,
        y: 0,
        z: 18,
        yaw: 0,
        pitch: 0,
        weaponIdx: 0,
        hp: 100,
        maxHp: 100,
        kills: 1,
        score: 150,
        color: '#38bdf8',
        isHost: true,
        lastSeen: t0,
        respawnSeq: 1,
      },
      {
        id: 'c1',
        name: 'BRAVO-1',
        team: 'bravo',
        alive: false,
        x: 3,
        y: 0,
        z: 19, // died right next to Alpha's base!
        yaw: 0.4,
        pitch: 0,
        weaponIdx: 0,
        hp: 0,
        maxHp: 100,
        kills: 0,
        score: 0,
        color: '#f43f5e',
        isHost: false,
        lastSeen: t0,
        respawnSeq: 1,
      },
    ],
  };

  const alphaSpawn = getTeamSpawnPosition('alpha', 0);
  const bravoSpawn = getTeamSpawnPosition('bravo', 0);
  assert.ok(alphaSpawn.z > 15 && bravoSpawn.z < -15, 'Alpha and Bravo must spawn on opposite sides of the arena');

  // Transition to Round 2: both players must be placed on their exact team spawns with incremented respawnSeq
  room = startNextAuthoritativeRound(room, t0 + 5_000);
  const alphaAfter = room.players.find((p) => p.id === 'h1')!;
  const bravoAfter = room.players.find((p) => p.id === 'c1')!;
  assert.equal(alphaAfter.respawnSeq, 2);
  assert.equal(bravoAfter.respawnSeq, 2);
  assert.equal(alphaAfter.z, alphaSpawn.z);
  assert.equal(bravoAfter.z, bravoSpawn.z);
  assert.equal(bravoAfter.alive, true);

  // Stale client input carrying old respawnSeq (1) or missing seq must be rejected so dead location cannot overwrite new spawn
  assert.equal(isStaleClientInputForRespawn(1, bravoAfter.respawnSeq), true);
  assert.equal(isStaleClientInputForRespawn(undefined, bravoAfter.respawnSeq), true);
  assert.equal(isStaleClientInputForRespawn(2, bravoAfter.respawnSeq), false);
  assert.equal(isStaleClientInputForRespawn(undefined, 0), false);

  // Remote operator teleport detector must trigger on respawnSeq bump, death->alive transition, round change, or large jump
  assert.equal(
    shouldInstantTeleportRemotePlayer({
      initialized: true,
      prevX: 3,
      prevZ: 19,
      nextX: 0,
      nextZ: -24,
      prevRespawnSeq: 1,
      nextRespawnSeq: 2,
      prevAlive: true,
      nextAlive: true,
      prevRound: 1,
      nextRound: 1,
    }),
    true
  );
  assert.equal(
    shouldInstantTeleportRemotePlayer({
      initialized: true,
      prevX: 0,
      prevZ: 0,
      nextX: 0.2,
      nextZ: 0.2,
      prevRespawnSeq: 2,
      nextRespawnSeq: 2,
      prevAlive: false,
      nextAlive: true,
      prevRound: 1,
      nextRound: 1,
    }),
    true
  );
  assert.equal(
    shouldInstantTeleportRemotePlayer({
      initialized: true,
      prevX: 0,
      prevZ: 0,
      nextX: 1.0,
      nextZ: 0.5,
      prevRespawnSeq: 2,
      nextRespawnSeq: 2,
      prevAlive: true,
      nextAlive: true,
      prevRound: 1,
      nextRound: 1,
    }),
    false
  );
  assert.equal(
    shouldInstantTeleportRemotePlayer({
      initialized: true,
      prevX: 0,
      prevZ: 20,
      nextX: 0,
      nextZ: -24,
      prevRespawnSeq: 2,
      nextRespawnSeq: 2,
      prevAlive: true,
      nextAlive: true,
      prevRound: 1,
      nextRound: 1,
    }),
    true
  );
});

test('Custom controls layout defaults, clamping, and sanitization handle all 11 control slots safely (including voice mic, slide, and emote)', () => {
  const std = getDefaultControlLayout('standard');
  const claw = getDefaultControlLayout('claw');
  const left = getDefaultControlLayout('lefthanded');

  assert.equal(ALL_CONTROL_SLOT_IDS.length, 11);
  assert.ok(ALL_CONTROL_SLOT_IDS.includes('voice'));
  assert.ok(ALL_CONTROL_SLOT_IDS.includes('slide'));
  assert.ok(ALL_CONTROL_SLOT_IDS.includes('emote'));
  for (const id of ALL_CONTROL_SLOT_IDS) {
    assert.ok(std[id], `standard layout should define ${id}`);
    assert.ok(claw[id], `claw layout should define ${id}`);
    assert.ok(left[id], `lefthanded layout should define ${id}`);
  }
  assert.ok(std.joystick.xPct < 30 && left.joystick.xPct > 70, 'lefthanded flips joystick to right side');

  const clamped = clampControlSlot(
    'fire',
    { xPct: 999, yPct: -50, scale: 5, opacity: 0.01 },
    std.fire
  );
  assert.equal(clamped.xPct, 95);
  assert.equal(clamped.yPct, 12);
  assert.equal(clamped.scale, 1.6);
  assert.equal(clamped.opacity, 0.25);

  const sanitized = sanitizeControlLayout(
    {
      fire: { xPct: 80, yPct: 65, scale: 1.2, opacity: 0.8 },
    },
    'standard'
  );
  assert.equal(sanitized.fire.xPct, 80);
  assert.equal(sanitized.fire.scale, 1.2);
  assert.equal(sanitized.jump.xPct, std.jump.xPct);
  assert.equal(sanitized.voice.xPct, std.voice.xPct);
});

test('Voice chat pure logic enforces HTTPS security, echo/noise/AGC constraints, Persian errors, VAD RMS, team channel filtering, and 4-player mesh cap', () => {
  assert.equal(MAX_VOICE_PLAYERS, 4);

  // 1. HTTPS / Secure context gating
  assert.equal(isVoiceChatSecureContext('https:', 'example.github.io', true).allowed, true);
  assert.equal(isVoiceChatSecureContext('http:', 'localhost', true).allowed, true);
  const insecureLan = isVoiceChatSecureContext('http:', '192.168.1.50', false);
  assert.equal(insecureLan.allowed, false);
  assert.ok(insecureLan.reasonFa && insecureLan.reasonFa.includes('HTTPS'));

  // 2. Explicit echoCancellation, noiseSuppression, autoGainControl
  const constraints = getAudioCaptureConstraints();
  assert.equal(constraints.video, false);
  const audioCfg = constraints.audio as MediaTrackConstraints;
  assert.equal(audioCfg.echoCancellation, true);
  assert.equal(audioCfg.noiseSuppression, true);
  assert.equal(audioCfg.autoGainControl, true);

  // 3. Clear Persian error mapping
  assert.ok(mapMicrophoneErrorToFa({ name: 'NotAllowedError' }).includes('دسترسی به میکروفون'));
  assert.ok(mapMicrophoneErrorToFa({ name: 'NotFoundError' }).includes('میکروفونی'));

  // 4. VAD RMS calculation
  const silence = new Uint8Array(64).fill(128);
  assert.equal(computeRmsAudioLevel(silence), 0);
  const loud = new Uint8Array(64).map((_, i) => (i % 2 === 0 ? 180 : 76));
  assert.ok(computeRmsAudioLevel(loud) > 0.35);

  // 5. Team channel vs All channel + per-player mute filtering
  assert.equal(
    shouldPlayRemoteVoice({
      remotePlayerId: 'p2',
      remoteTeam: 'bravo',
      localTeam: 'alpha',
      gameMode: 'tdm_2v2',
      channelScope: 'team',
      mutedPlayerIds: new Set(),
      masterVolume: 0.8,
    }),
    false
  );
  assert.equal(
    shouldPlayRemoteVoice({
      remotePlayerId: 'p2',
      remoteTeam: 'alpha',
      localTeam: 'alpha',
      gameMode: 'tdm_2v2',
      channelScope: 'team',
      mutedPlayerIds: new Set(),
      masterVolume: 0.8,
    }),
    true
  );
  assert.equal(
    shouldPlayRemoteVoice({
      remotePlayerId: 'p2',
      remoteTeam: 'bravo',
      localTeam: 'alpha',
      gameMode: 'tdm_2v2',
      channelScope: 'all',
      mutedPlayerIds: new Set(),
      masterVolume: 0.8,
    }),
    true
  );
  assert.equal(
    shouldPlayRemoteVoice({
      remotePlayerId: 'p2',
      remoteTeam: 'alpha',
      localTeam: 'alpha',
      gameMode: 'tdm_2v2',
      channelScope: 'all',
      mutedPlayerIds: new Set(['p2']),
      masterVolume: 0.8,
    }),
    false
  );

  // 6. Mesh target cap (max 4 players total -> max 3 remote peers) + glare breaker
  const dummyPlayers = Array.from({ length: 6 }, (_, i) => ({
    id: `p${i}`,
    peerId: `peer-${i}`,
    name: `P${i}`,
    team: (i % 2 === 0 ? 'alpha' : 'bravo') as 'alpha' | 'bravo',
    alive: true,
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    pitch: 0,
    weaponIdx: 0,
    hp: 100,
    maxHp: 100,
    kills: 0,
    score: 0,
    color: '#38bdf8',
    isHost: i === 0,
    lastSeen: 1000,
  }));
  const targets = selectVoiceMeshTargets(dummyPlayers, 'p0', 'peer-0');
  assert.equal(targets.length, 3, 'Mesh must cap remote voice peers at MAX_VOICE_PLAYERS - 1 (3)');
  assert.ok(targets.every((t) => t.playerId !== 'p0'));

  assert.equal(shouldPreferOutgoingCallOnGlare('peer-b', 'peer-a'), true);
  assert.equal(shouldPreferOutgoingCallOnGlare('peer-a', 'peer-b'), false);
});

test('Round 3-second countdown locks position/input and transitions into 2-second spawn protection with early-cancel on fire', () => {
  const t0 = 1_750_000_000_000;
  let room: AuthoritativeRoomState = {
    code: 'BC-CD32',
    name: 'اتاق تست',
    mapId: 'warehouse',
    mode: 'tdm_2v2',
    hostId: 'a1',
    hostName: 'ALPHA-1',
    wave: 1,
    teamScore: 0,
    playerCount: 2,
    alphaScore: 0,
    bravoScore: 0,
    currentRound: 1,
    roundTimeRemainingSec: 90,
    roundPhase: 'playing',
    roundWinnerTeam: null,
    matchWinnerTeam: null,
    targetWinRounds: 6,
    players: [
      {
        id: 'a1',
        name: 'ALPHA-1',
        team: 'alpha',
        alive: true,
        x: 5,
        y: 0,
        z: -5,
        yaw: 0,
        pitch: 0,
        weaponIdx: 0,
        hp: 45,
        maxHp: 100,
        kills: 0,
        score: 0,
        color: '#38bdf8',
        isHost: true,
        respawnSeq: 1,
        lastSeen: t0,
      },
      {
        id: 'b1',
        name: 'BRAVO-1',
        team: 'bravo',
        alive: false,
        x: 10,
        y: 0,
        z: 10,
        yaw: 0,
        pitch: 0,
        weaponIdx: 1,
        hp: 0,
        maxHp: 100,
        kills: 0,
        score: 0,
        color: '#f43f5e',
        isHost: false,
        respawnSeq: 1,
        lastSeen: t0,
      },
    ],
  };

  // 1. Begin 3-second countdown: players reset to exact team spawns and input is locked
  room = beginRoundCountdownState(room, t0, false);
  assert.equal(room.roundPhase, 'countdown');
  assert.equal(room.countdownRemainingSec, ROUND_COUNTDOWN_SEC);
  assert.equal(room.countdownEndsAt, t0 + 3000);
  assert.equal(isRoundInputLocked(room), true);
  assert.equal(room.players[0].z, 24);
  assert.equal(room.players[1].z, -24);
  assert.equal(room.players[1].alive, true);
  assert.equal(room.players[1].hp, 100);

  // Attempting to send movement coordinates during countdown must NOT move players off team spawn
  room = mergeClientInputIntoHostState(room, { id: 'b1', x: 14, y: 0, z: 8, yaw: 1.2 }, t0 + 500);
  assert.equal(room.players[1].z, -24, 'Host must lock player coordinates to team spawn during countdown');
  assert.equal(room.players[1].x, 0);

  // 2. Finish countdown: transitions to playing + grants 2-second spawn protection to all alive players
  const tGo = t0 + 3000;
  room = finishRoundCountdownState(room, tGo);
  assert.equal(room.roundPhase, 'playing');
  assert.equal(isRoundInputLocked(room), false);
  assert.equal(isPlayerSpawnProtected(room.players[0], tGo + 500), true);
  assert.equal(isPlayerSpawnProtected(room.players[1], tGo + 1999), true);
  assert.equal(isPlayerSpawnProtected(room.players[1], tGo + SPAWN_PROTECTION_SEC * 1000 + 1), false);

  // 3. Firing early immediately clears shooter's own spawn protection without touching target's protection
  const cleared = clearPlayerSpawnProtection(room, 'a1');
  assert.equal(cleared.changed, true);
  assert.equal(isPlayerSpawnProtected(cleared.nextRoom.players[0], tGo + 500), false);
  assert.equal(isPlayerSpawnProtected(cleared.nextRoom.players[1], tGo + 500), true);
});

test('Post-death spectator selection prioritizes alive teammate in 2v2, killer fallback in 1v1, and cycles alive players', () => {
  const players2v2 = [
    { id: 'a1', name: 'ALPHA-1', team: 'alpha' as const, alive: false },
    { id: 'a2', name: 'ALPHA-2', team: 'alpha' as const, alive: true },
    { id: 'b1', name: 'BRAVO-1', team: 'bravo' as const, alive: true },
    { id: 'b2', name: 'BRAVO-2', team: 'bravo' as const, alive: true },
  ];

  // In 2v2, dead alpha player automatically watches alive teammate a2 even if b2 was killer
  assert.equal(selectInitialSpectatorTarget(players2v2, 'a1', 'alpha', 'b2', 'tdm_2v2'), 'a2');

  // If teammate a2 is also dead, falls back to killer b2
  const noTeammateAlive = players2v2.map((p) => (p.id === 'a2' ? { ...p, alive: false } : p));
  assert.equal(selectInitialSpectatorTarget(noTeammateAlive, 'a1', 'alpha', 'b2', 'tdm_2v2'), 'b2');

  // In 1v1, dead player watches killer
  const players1v1 = [
    { id: 'a1', name: 'ALPHA-1', team: 'alpha' as const, alive: false },
    { id: 'b1', name: 'BRAVO-1', team: 'bravo' as const, alive: true },
  ];
  assert.equal(selectInitialSpectatorTarget(players1v1, 'a1', 'alpha', 'b1', 'tdm_1v1'), 'b1');

  // Cycling skips dead players and wraps cleanly
  assert.equal(cycleSpectatorTarget(players2v2, 'a1', 'a2', 1), 'b1');
  assert.equal(cycleSpectatorTarget(players2v2, 'a1', 'b1', 1), 'b2');
  assert.equal(cycleSpectatorTarget(players2v2, 'a1', 'b2', 1), 'a2');
});

test('Structured Kill Feed enforces max 4 lines, 5-second expiry, and weapon short names', () => {
  assert.equal(KILL_FEED_MAX_ITEMS, 4);
  assert.equal(KILL_FEED_TTL_MS, 5000);
  assert.equal(getWeaponShortName(0), 'AK-47');
  assert.equal(getWeaponShortName(2), 'AWM');
  assert.equal(getWeaponShortName(9), 'RPG-7');

  let feed = [] as ReturnType<typeof appendKillFeedEntry>;
  for (let i = 1; i <= 6; i++) {
    feed = appendKillFeedEntry(feed, {
      id: `k-${i}`,
      killerName: `KILLER-${i}`,
      killerTeam: i % 2 === 0 ? 'bravo' : 'alpha',
      weaponName: getWeaponShortName(i % 10),
      victimName: `VICTIM-${i}`,
      victimTeam: i % 2 === 0 ? 'alpha' : 'bravo',
      isHeadshot: i === 6,
      createdAt: i * 1000,
    });
  }
  assert.equal(feed.length, 4, 'Kill feed must keep at most 4 most recent entries');
  assert.equal(feed[0].id, 'k-6');
  assert.equal(feed[3].id, 'k-3');

  // At t = 9500ms, entries created at <= 4500ms (k-3 at 3000ms, k-4 at 4000ms) expire after 5000ms
  const remaining = pruneExpiredKillFeed(feed, 9500);
  assert.deepEqual(
    remaining.map((x) => x.id),
    ['k-6', 'k-5']
  );
});

test('Minimal HUD defaults keep FPS hidden, clamp crosshair scale safely, and use compact touch button sizes', () => {
  assert.equal(loadShowFpsHud(), false, 'FPS counter must default to OFF');
  assert.equal(loadCrosshairSize(), 1.0, 'Crosshair scale must default to 1.0');
  assert.equal(loadCrosshairStyle(), 'cross', 'Crosshair style must default to minimal cross');

  assert.equal(clampCrosshairSize(0.1), 0.5);
  assert.equal(clampCrosshairSize(5.0), 1.8);
  assert.equal(clampCrosshairSize(1.34), 1.34);
  assert.equal(clampCrosshairSize(Number.NaN), 1.0);

  // Compact touch control sizing for uncluttered mobile landscape HUD
  assert.ok(CONTROL_SLOT_META.joystick.baseSizePx <= 92);
  assert.ok(CONTROL_SLOT_META.fire.baseSizePx <= 64);
  assert.ok(CONTROL_SLOT_META.ads.baseSizePx <= 44);
  assert.ok(CONTROL_SLOT_META.voice.baseSizePx <= 40);
});

test('Feature 1: Ping quality classifies green/yellow/red thresholds accurately and defaults ON', () => {
  assert.equal(loadShowPingHud(), true);
  assert.equal(classifyPingQuality(0).quality, 'good');
  assert.equal(classifyPingQuality(45).quality, 'good');
  assert.equal(classifyPingQuality(80).quality, 'good');
  assert.equal(classifyPingQuality(81).quality, 'medium');
  assert.equal(classifyPingQuality(160).quality, 'medium');
  assert.equal(classifyPingQuality(161).quality, 'poor');
  assert.equal(classifyPingQuality(320).quality, 'poor');
});

test('Feature 2: Scoreboard sorts players by kills desc, deaths asc, score desc', () => {
  const sorted = sortScoreboardPlayers([
    { id: 'p1', name: 'BRAVO-1', team: 'bravo', kills: 3, deaths: 4, score: 450 },
    { id: 'p2', name: 'ALPHA-1', team: 'alpha', kills: 5, deaths: 1, score: 750 },
    { id: 'p3', name: 'ALPHA-2', team: 'alpha', kills: 3, deaths: 1, score: 450 },
  ]);
  assert.deepEqual(
    sorted.map((p) => p.id),
    ['p2', 'p3', 'p1']
  );
});

test('Feature 3: Spatial footstep gain attenuates by short range, scales with speed, and respects volume slider', () => {
  assert.equal(FOOTSTEP_MAX_RANGE_M, 16);
  assert.equal(loadFootstepVolume(), 0.55);
  assert.equal(clampFootstepVolume(-0.5), 0);
  assert.equal(clampFootstepVolume(2.0), 1);

  // Silent when muted, stationary, or beyond 16m short range
  assert.equal(computeFootstepGain(4, 5.0, 0), 0);
  assert.equal(computeFootstepGain(4, 0.1, 0.8), 0);
  assert.equal(computeFootstepGain(16, 6.0, 1.0), 0);
  assert.equal(computeFootstepGain(22, 6.0, 1.0), 0);

  // Slow walk is noticeably quieter than fast running at the same distance
  const slowWalk = computeFootstepGain(5, 2.0, 0.7);
  const fastRun = computeFootstepGain(5, 6.5, 0.7);
  assert.ok(slowWalk > 0, 'Nearby walking should be audible');
  assert.ok(fastRun > slowWalk * 2, 'Fast movement must be noticeably louder than slow walk');

  // Closer distance is louder than farther distance
  const near = computeFootstepGain(2, 5.0, 0.7);
  const far = computeFootstepGain(12, 5.0, 0.7);
  assert.ok(near > far * 4);
});

test('Feature 4: Rematch consensus waits for all active players and resets scores/K-D while preserving teams', () => {
  const t0 = 1_700_000_000_000;
  let room: AuthoritativeRoomState = {
    code: 'BC-REMT',
    name: 'اتاق تست',
    mapId: 'warehouse',
    mode: 'tdm_1v1',
    hostId: 'h1',
    hostName: 'HOST',
    wave: 6,
    teamScore: 900,
    playerCount: 2,
    alphaScore: 5,
    bravoScore: 3,
    currentRound: 9,
    roundTimeRemainingSec: 40,
    roundPhase: 'playing',
    roundWinnerTeam: null,
    matchWinnerTeam: null,
    targetWinRounds: 6,
    players: [
      {
        id: 'h1',
        name: 'HOST',
        team: 'alpha',
        alive: true,
        x: 0,
        y: 0,
        z: 10,
        yaw: 0,
        pitch: 0,
        weaponIdx: 0,
        hp: 100,
        maxHp: 100,
        kills: 6,
        deaths: 3,
        score: 900,
        color: '#38bdf8',
        isHost: true,
        lastSeen: t0,
      },
      {
        id: 'c1',
        name: 'CLIENT',
        team: 'bravo',
        alive: false,
        x: 0,
        y: 0,
        z: -10,
        yaw: Math.PI,
        pitch: 0,
        weaponIdx: 0,
        hp: 0,
        maxHp: 100,
        kills: 3,
        deaths: 6,
        score: 450,
        color: '#f43f5e',
        isHost: false,
        lastSeen: t0,
      },
    ],
  };

  room = awardRoundPointToTeam(room, 'alpha', t0);
  assert.equal(room.roundPhase, 'match_over');
  assert.equal(room.matchWinnerTeam, 'alpha');
  assert.equal(room.intermissionEndsAt, undefined, 'Match over waits for explicit rematch confirmation');
  assert.equal(areAllActivePlayersReadyForRematch(room), false);

  room = toggleRematchVote(room, 'h1', true);
  assert.equal(areAllActivePlayersReadyForRematch(room), false);

  room = toggleRematchVote(room, 'c1', true);
  assert.equal(areAllActivePlayersReadyForRematch(room), true);

  const restarted = resetAuthoritativeMatch(room, t0 + 1000, 'docks');
  assert.equal(restarted.mapId, 'docks');
  assert.equal(restarted.alphaScore, 0);
  assert.equal(restarted.bravoScore, 0);
  assert.equal(restarted.currentRound, 1);
  assert.equal(restarted.roundPhase, 'countdown');
  assert.equal(restarted.players[0].team, 'alpha');
  assert.equal(restarted.players[1].team, 'bravo');
  assert.equal(restarted.players[0].kills, 0);
  assert.equal(restarted.players[0].deaths, 0);
  assert.equal(restarted.players[1].kills, 0);
  assert.equal(restarted.players[1].deaths, 0);
});

test('Feature 5: Map voting selects majority winner and uses Host vote as tie-breaker', () => {
  const t0 = 1_700_000_000_000;
  let room: AuthoritativeRoomState = {
    code: 'BC-VOTE',
    name: 'اتاق تست',
    mapId: 'warehouse',
    mode: 'tdm_2v2',
    hostId: 'h1',
    hostName: 'HOST',
    wave: 1,
    teamScore: 0,
    playerCount: 3,
    alphaScore: 0,
    bravoScore: 0,
    currentRound: 1,
    roundTimeRemainingSec: 90,
    roundPhase: 'playing',
    roundWinnerTeam: null,
    matchWinnerTeam: null,
    targetWinRounds: 6,
    players: [
      { id: 'h1', name: 'HOST', team: 'alpha', alive: true, x: 0, y: 0, z: 24, yaw: 0, pitch: 0, weaponIdx: 0, hp: 100, maxHp: 100, kills: 0, score: 0, color: '#38bdf8', isHost: true, lastSeen: t0 },
      { id: 'c1', name: 'C1', team: 'bravo', alive: true, x: 0, y: 0, z: -24, yaw: 0, pitch: 0, weaponIdx: 0, hp: 100, maxHp: 100, kills: 0, score: 0, color: '#f43f5e', lastSeen: t0 },
      { id: 'c2', name: 'C2', team: 'alpha', alive: true, x: 3, y: 0, z: 24, yaw: 0, pitch: 0, weaponIdx: 0, hp: 100, maxHp: 100, kills: 0, score: 0, color: '#38bdf8', lastSeen: t0 },
    ],
  };

  // Tie: Host votes outpost, C1 votes docks -> Host breaks tie in favor of outpost
  room = castMapVote(room, 'h1', 'outpost');
  room = castMapVote(room, 'c1', 'docks');
  const tieRes = resolveMapVoteWinner(room);
  assert.equal(tieRes.isTie, true);
  assert.equal(tieRes.decidedByHost, true);
  assert.equal(tieRes.winnerMapId, 'outpost');

  // Majority: C2 also votes docks -> docks wins 2 to 1
  room = castMapVote(room, 'c2', 'docks');
  const majRes = resolveMapVoteWinner(room);
  assert.equal(majRes.isTie, false);
  assert.equal(majRes.winnerMapId, 'docks');
  assert.equal(majRes.counts.docks, 2);
  assert.equal(majRes.counts.outpost, 1);
});

test('Feature 6: 30-second mid-match reconnect preserves team/K-D/score and prunes after 30s expiry', () => {
  assert.equal(RECONNECT_GRACE_MS, 30_000);
  const t0 = 1_700_000_000_000;
  let room: AuthoritativeRoomState = {
    code: 'BC-RCON',
    name: 'اتاق تست',
    mapId: 'warehouse',
    mode: 'tdm_1v1',
    hostId: 'h1',
    hostName: 'HOST',
    wave: 1,
    teamScore: 450,
    playerCount: 2,
    alphaScore: 2,
    bravoScore: 1,
    currentRound: 4,
    roundTimeRemainingSec: 65,
    roundPhase: 'playing',
    roundWinnerTeam: null,
    matchWinnerTeam: null,
    targetWinRounds: 6,
    players: [
      { id: 'h1', name: 'HOST', team: 'alpha', alive: true, x: 0, y: 0, z: 24, yaw: 0, pitch: 0, weaponIdx: 0, hp: 100, maxHp: 100, kills: 2, deaths: 1, score: 300, color: '#38bdf8', isHost: true, lastSeen: t0 },
      { id: 'c1', name: 'ALI', team: 'bravo', alive: true, x: 0, y: 0, z: -24, yaw: Math.PI, pitch: 0, weaponIdx: 0, hp: 100, maxHp: 100, kills: 4, deaths: 2, score: 600, color: '#f43f5e', lastSeen: t0 },
    ],
  };

  // Player drops mid-match -> held in room with 30s deadline
  const disc = markPlayerDisconnectedInHostState(room, 'c1', t0);
  assert.ok(disc.disconnectedPlayer);
  assert.equal(disc.nextRoom.players.length, 2);
  assert.equal(disc.nextRoom.players[1].disconnected, true);
  assert.equal(disc.nextRoom.players[1].reconnectDeadlineAt, t0 + 30_000);

  // Within 30s (at t0 + 12s), player reconnects -> exact team, kills, deaths, score restored
  const reclaimed = reclaimDisconnectedPlayerInHostState(disc.nextRoom, 'c1', 'ALI', 'peer-new', t0 + 12_000);
  assert.ok(reclaimed.reclaimedPlayer);
  assert.equal(reclaimed.reclaimedPlayer.team, 'bravo');
  assert.equal(reclaimed.reclaimedPlayer.kills, 4);
  assert.equal(reclaimed.reclaimedPlayer.deaths, 2);
  assert.equal(reclaimed.reclaimedPlayer.score, 600);
  assert.equal(reclaimed.reclaimedPlayer.disconnected, false);

  // If player never returns, pruning at t0 + 29s keeps them; pruning at t0 + 30s removes them
  const beforeExp = pruneExpiredDisconnectedPlayers(disc.nextRoom, t0 + 29_000);
  assert.equal(beforeExp.expiredPlayers.length, 0);
  assert.equal(beforeExp.nextRoom.players.length, 2);

  const afterExp = pruneExpiredDisconnectedPlayers(disc.nextRoom, t0 + 30_000);
  assert.equal(afterExp.expiredPlayers.length, 1);
  assert.equal(afterExp.expiredPlayers[0].name, 'ALI');
  assert.equal(afterExp.nextRoom.players.length, 1);
});

test('Stage 2: Soft Aim Assist defaults to 70, obeys Host room toggle, gently nudges without hard-locking, and filters remote players fairly', () => {
  assert.equal(DEFAULT_AIM_ASSIST_STRENGTH, 70);
  assert.equal(loadAimAssistStrength(), 70);
  assert.equal(clampAimAssistStrength(-10), 0);
  assert.equal(clampAimAssistStrength(140), 100);
  assert.equal(resolveEffectiveAimAssistStrength(70, true), 70);
  assert.equal(resolveEffectiveAimAssistStrength(100, false), 0, 'Host disallowing Aim Assist must force strength to 0');

  // Soft pull toward visible enemy within narrow cone, capped at gentle blend (never hard-locks in 1 frame)
  const targetYaw = Math.atan2(-0.8, 12); // target at x=+0.8, z=-12
  const softRes = computeSoftAimAssistAngles(
    0,
    1.68,
    0,
    0,
    0,
    [{ id: 'remote-1', x: 0.8, y: 1.68, z: -12, visible: true }],
    70,
    0.016,
    true
  );
  assert.ok(softRes.lockedTarget !== null);
  assert.ok(softRes.nextYaw < 0, 'Soft assist should nudge toward +X target');
  assert.ok(
    Math.abs(softRes.nextYaw) < Math.abs(targetYaw) * 0.25,
    'Soft assist must be gentle and never hard-snap onto target'
  );

  // Wall occlusion prevents soft aim assist
  const wall = [{ x: 0, z: -6, w: 6, d: 1.5, height: 3.2, minX: -3, maxX: 3, minZ: -6.75, maxZ: -5.25 }];
  const blocked = computeSoftAimAssistAngles(
    0,
    1.68,
    0,
    0,
    0,
    [{ id: 'remote-1', x: 0.8, y: 1.68, z: -12, visible: true }],
    100,
    0.05,
    true,
    wall
  );
  assert.equal(blocked.lockedTarget, null);

  // Remote player eligibility: enemy alive & unprotected => eligible; teammate, self, dead, disconnected, spawn-protected => ineligible
  const now = 1_750_000_000_000;
  assert.equal(
    isRemotePlayerEligibleForAimAssist(
      'tdm_1v1',
      'p1',
      'alpha',
      { id: 'p2', team: 'bravo', alive: true, disconnected: false, spawnProtected: false },
      now
    ),
    true
  );
  assert.equal(
    isRemotePlayerEligibleForAimAssist(
      'tdm_2v2',
      'p1',
      'alpha',
      { id: 'p3', team: 'alpha', alive: true, disconnected: false, spawnProtected: false },
      now
    ),
    false,
    'Must never assist onto teammates'
  );
  assert.equal(
    isRemotePlayerEligibleForAimAssist(
      'tdm_1v1',
      'p1',
      'alpha',
      { id: 'p2', team: 'bravo', alive: false, disconnected: false, spawnProtected: false },
      now
    ),
    false,
    'Must never assist onto dead players'
  );
  assert.equal(
    isRemotePlayerEligibleForAimAssist(
      'tdm_1v1',
      'p1',
      'alpha',
      { id: 'p2', team: 'bravo', alive: true, disconnected: true, spawnProtected: false },
      now
    ),
    false,
    'Must never assist onto disconnected players'
  );
  assert.equal(
    isRemotePlayerEligibleForAimAssist(
      'tdm_1v1',
      'p1',
      'alpha',
      { id: 'p2', team: 'bravo', alive: true, disconnected: false, spawnProtectedUntil: now + 1500 },
      now
    ),
    false,
    'Must never assist onto spawn-protected opponents'
  );
});

test('Stage 3: Symmetrical 1v1 Duel map has compact arena bounds, opposite spawns at z=+-14.5, and works in map voting', () => {
  assert.equal(isValidMapId('duel'), true);
  assert.equal(isValidMapId('nonexistent'), false);
  assert.equal(getMapArenaHalf('duel'), 19);
  assert.equal(getMapArenaHalf('warehouse'), 48);

  const alphaDuel = getTeamSpawnPosition('alpha', 0, 'duel');
  const bravoDuel = getTeamSpawnPosition('bravo', 0, 'duel');
  assert.equal(alphaDuel.x, 0);
  assert.equal(alphaDuel.z, 14.5);
  assert.equal(bravoDuel.x, 0);
  assert.equal(bravoDuel.z, -14.5);
  assert.equal(bravoDuel.yaw, Math.PI);

  const duelRoom: AuthoritativeRoomState = {
    code: 'BC-DUEL',
    name: 'اتاق دوئل',
    mapId: 'warehouse',
    mode: 'tdm_1v1',
    hostId: 'h1',
    hostName: 'HOST',
    wave: 1,
    teamScore: 0,
    playerCount: 2,
    alphaScore: 0,
    bravoScore: 0,
    currentRound: 1,
    roundTimeRemainingSec: 90,
    roundPhase: 'playing',
    roundWinnerTeam: null,
    matchWinnerTeam: null,
    targetWinRounds: 6,
    players: [
      { id: 'h1', name: 'HOST', team: 'alpha', alive: true, x: 0, y: 0, z: 14.5, yaw: 0, pitch: 0, weaponIdx: 0, hp: 100, maxHp: 100, kills: 0, score: 0, color: '#38bdf8', isHost: true, lastSeen: 1000 },
      { id: 'c1', name: 'C1', team: 'bravo', alive: true, x: 0, y: 0, z: -14.5, yaw: Math.PI, pitch: 0, weaponIdx: 0, hp: 100, maxHp: 100, kills: 0, score: 0, color: '#f43f5e', lastSeen: 1000 },
    ],
  };
  const voted = castMapVote(castMapVote(duelRoom, 'h1', 'duel'), 'c1', 'duel');
  const res = resolveMapVoteWinner(voted);
  assert.equal(res.winnerMapId, 'duel');
  assert.equal(res.counts.duel, 2);
});

test('Stage 4: Tactical Slide (Beta) defaults ON, lowers camera/hitbox for 0.85s with decay & 1.5s cooldown, cancels on jump, and obeys Host room rule', () => {
  assert.equal(loadSlideAlphaEnabled(), true, 'Slide Beta must default to ON');
  assert.equal(SLIDE_DURATION_SEC, 0.85);
  assert.equal(SLIDE_COOLDOWN_SEC, 1.5);

  let slide = createInitialSlideState();
  assert.equal(slide.active, false);
  assert.equal(slide.eyeHeight, PLAYER_STAND_EYE_HEIGHT);
  assert.equal(slide.hitboxHeight, PLAYER_STAND_HITBOX_HEIGHT);

  const baseCtx = {
    featureEnabled: true,
    roomSlideAllowed: true,
    onGround: true,
    isDead: false,
    isFrozen: false,
    moveSpeed: 7.5,
    dirX: 0,
    dirZ: -1,
  };

  // Blocked if feature OFF, Host disallows, airborne, or stationary
  assert.equal(canTriggerSlide(slide, { ...baseCtx, featureEnabled: false }), false);
  assert.equal(canTriggerSlide(slide, { ...baseCtx, roomSlideAllowed: false }), false);
  assert.equal(canTriggerSlide(slide, { ...baseCtx, onGround: false }), false);
  assert.equal(canTriggerSlide(slide, { ...baseCtx, moveSpeed: 0.5 }), false);

  // Trigger while running on ground
  slide = triggerSlide(slide, baseCtx);
  assert.equal(slide.active, true);
  assert.equal(slide.currentSpeed, SLIDE_INITIAL_SPEED);
  assert.equal(slide.eyeHeight, PLAYER_SLIDE_EYE_HEIGHT);
  assert.equal(slide.hitboxHeight, PLAYER_SLIDE_HITBOX_HEIGHT);

  // Mid-slide speed decays smoothly between initial burst and end speed (0.4s via 0.05s frames)
  for (let i = 0; i < 8; i++) {
    slide = stepSlideState(slide, 0.05, { featureEnabled: true, roomSlideAllowed: true });
  }
  assert.equal(slide.active, true);
  assert.ok(slide.currentSpeed < SLIDE_INITIAL_SPEED && slide.currentSpeed > SLIDE_END_SPEED);

  // Finish slide (+0.5s -> total 0.9s > 0.85s) -> enters 1.5s cooldown & returns to standing height
  for (let i = 0; i < 10; i++) {
    slide = stepSlideState(slide, 0.05, { featureEnabled: true, roomSlideAllowed: true });
  }
  assert.equal(slide.active, false);
  assert.ok(slide.cooldownRemainingSec > 1.3 && slide.cooldownRemainingSec <= SLIDE_COOLDOWN_SEC);
  assert.equal(slide.eyeHeight, PLAYER_STAND_EYE_HEIGHT);
  assert.equal(canTriggerSlide(slide, baseCtx), false, 'Cannot re-trigger during cooldown');

  // Tick down cooldown past 1.5s
  for (let i = 0; i < 16; i++) {
    slide = stepSlideState(slide, 0.1, { featureEnabled: true, roomSlideAllowed: true });
  }
  assert.equal(slide.cooldownRemainingSec, 0);
  assert.equal(canTriggerSlide(slide, baseCtx), true);

  // Cancel on jump immediately restores standing height and sets cooldown
  slide = triggerSlide(slide, baseCtx);
  assert.equal(slide.active, true);
  slide = cancelSlide(slide, true);
  assert.equal(slide.active, false);
  assert.equal(slide.eyeHeight, PLAYER_STAND_EYE_HEIGHT);
  assert.equal(slide.cooldownRemainingSec, SLIDE_COOLDOWN_SEC);

  // Host enforcement: if slideAllowed === false, mergeClientInputIntoHostState strips isSliding
  const lockedRoom: AuthoritativeRoomState = {
    code: 'BC-SLD1',
    name: 'اتاق اسلاید',
    mapId: 'duel',
    mode: 'tdm_1v1',
    hostId: 'h1',
    hostName: 'HOST',
    aimAssistAllowed: true,
    slideAllowed: false,
    wave: 1,
    teamScore: 0,
    playerCount: 1,
    alphaScore: 0,
    bravoScore: 0,
    currentRound: 1,
    roundTimeRemainingSec: 90,
    roundPhase: 'playing',
    roundWinnerTeam: null,
    matchWinnerTeam: null,
    targetWinRounds: 6,
    players: [
      { id: 'h1', name: 'HOST', team: 'alpha', alive: true, x: 0, y: 0, z: 14.5, yaw: 0, pitch: 0, weaponIdx: 0, hp: 100, maxHp: 100, kills: 0, score: 0, color: '#38bdf8', isHost: true, isSliding: false, lastSeen: 1000 },
    ],
  };
  const merged = mergeClientInputIntoHostState(lockedRoom, { id: 'h1', isSliding: true }, 2000);
  assert.equal(merged.players[0].isSliding, false, 'Host must strip isSliding when slideAllowed is false');
});

test('Stage 5: QoL defaults (vibration ON, auto-reload ON), post-match accuracy/MVP stats, and reset keys list', () => {
  assert.equal(loadVibrationEnabled(), true);
  assert.equal(loadAutoReloadEnabled(), true);
  assert.ok(ALL_SETTINGS_STORAGE_KEYS.length >= 10);

  assert.equal(computeAccuracyPercent(0, 0), 0);
  assert.equal(computeAccuracyPercent(20, 9), 45);
  assert.equal(computeAccuracyPercent(10, 15), 100);

  const summary = computeMatchSummaryStats([
    { id: 'p1', name: 'BRAVO-1', team: 'bravo', kills: 6, deaths: 4, shotsFired: 40, shotsHit: 16, headshots: 2, score: 900 },
    { id: 'p2', name: 'ALPHA-1', team: 'alpha', kills: 8, deaths: 2, shotsFired: 30, shotsHit: 18, headshots: 4, score: 1350 },
    { id: 'p3', name: 'ALPHA-2', team: 'alpha', kills: 6, deaths: 3, shotsFired: 25, shotsHit: 15, headshots: 3, score: 950 },
  ]);

  assert.equal(summary.mvp?.id, 'p2');
  assert.equal(summary.rows[0].isMvp, true);
  assert.equal(summary.rows[0].accuracyPct, 60);
  assert.equal(summary.rows[0].headshots, 4);
  assert.equal(summary.rows[1].id, 'p3', 'Tie on kills should break by headshots/accuracy');
  assert.equal(summary.rows[1].isMvp, false);
});

test('Host Match Settings sanitize round duration (60/90/120), win target (3/6/10), starting HP (100/150), Friendly Fire, and drive round transitions', () => {
  assert.deepEqual(DEFAULT_HOST_MATCH_SETTINGS, {
    roundDurationSec: 90,
    targetWinRounds: 6,
    startingHp: 100,
    friendlyFire: false,
    fillBotsEnabled: false,
    botDifficulty: 'medium',
  });

  // Valid choices pass through; invalid choices fall back cleanly
  const valid = sanitizeHostMatchSettings({
    roundDurationSec: 120,
    targetWinRounds: 3,
    startingHp: 150,
    friendlyFire: true,
  });
  assert.deepEqual(valid, {
    roundDurationSec: 120,
    targetWinRounds: 3,
    startingHp: 150,
    friendlyFire: true,
    fillBotsEnabled: false,
    botDifficulty: 'medium',
  });

  const invalid = sanitizeHostMatchSettings({
    roundDurationSec: 999,
    targetWinRounds: 99,
    startingHp: 500,
  });
  assert.deepEqual(invalid, DEFAULT_HOST_MATCH_SETTINGS);

  // Friendly fire defaults OFF, blocks teammate damage; when ON, permits teammate damage (still blocks self-damage)
  assert.equal(canDamagePlayer('tdm_2v2', 'alpha', 'alpha', 'a1', 'a2', false), false);
  assert.equal(canDamagePlayer('tdm_2v2', 'alpha', 'alpha', 'a1', 'a2', true), true);
  assert.equal(canDamagePlayer('tdm_2v2', 'alpha', 'alpha', 'a1', 'a1', true), false);
  assert.equal(canDamagePlayer('coop', 'alpha', 'alpha', 'a1', 'a2', false), false);
  assert.equal(canDamagePlayer('coop', 'alpha', 'alpha', 'a1', 'a2', true), true);

  // Round countdown & start apply startingHp=150 and roundDurationSec=120 and win target=3
  const t0 = 1_760_000_000_000;
  let room: AuthoritativeRoomState = {
    code: 'BC-MSET',
    name: 'اتاق تست تنظیمات',
    mapId: 'duel',
    mode: 'tdm_2v2',
    hostId: 'a1',
    hostName: 'ALPHA-1',
    wave: 1,
    teamScore: 0,
    playerCount: 2,
    alphaScore: 2,
    bravoScore: 1,
    currentRound: 1,
    roundDurationSec: 120,
    roundTimeRemainingSec: 120,
    roundPhase: 'playing',
    roundWinnerTeam: null,
    matchWinnerTeam: null,
    targetWinRounds: 3,
    startingHp: 150,
    friendlyFire: true,
    players: [
      { id: 'a1', name: 'ALPHA-1', team: 'alpha', alive: true, x: 0, y: 0, z: 14.5, yaw: 0, pitch: 0, weaponIdx: 0, hp: 50, maxHp: 100, kills: 0, score: 0, color: '#38bdf8', isHost: true, lastSeen: t0 },
      { id: 'b1', name: 'BRAVO-1', team: 'bravo', alive: false, x: 0, y: 0, z: -14.5, yaw: Math.PI, pitch: 0, weaponIdx: 0, hp: 0, maxHp: 100, kills: 0, score: 0, color: '#f43f5e', isHost: false, lastSeen: t0 },
    ],
  };

  room = beginRoundCountdownState(room, t0, false);
  assert.equal(room.roundTimeRemainingSec, 120);
  assert.equal(room.players[0].hp, 150);
  assert.equal(room.players[0].maxHp, 150);
  assert.equal(room.players[1].hp, 150);
  assert.equal(room.players[1].maxHp, 150);

  room = finishRoundCountdownState(room, t0 + 3000);
  assert.equal(room.roundEndsAt, t0 + 3000 + 120_000);

  // Reaching targetWinRounds=3 ends the match immediately
  room = awardRoundPointToTeam(room, 'alpha', t0 + 10_000);
  assert.equal(room.alphaScore, 3);
  assert.equal(room.roundPhase, 'match_over');
  assert.equal(room.matchWinnerTeam, 'alpha');
});

test('Team-only tactical ping (5s TTL) and 4 Persian quick messages strictly isolate teammates from opponents and FFA PvP', () => {
  assert.equal(TEAM_PING_TTL_MS, 5000);
  assert.equal(TEAM_QUICK_MSG_TTL_MS, 4000);
  assert.equal(TEAM_QUICK_MESSAGES.length, 4);
  assert.equal(getTeamQuickMessageTextFa('enemy_here'), 'دشمن اینجاست');
  assert.equal(getTeamQuickMessageTextFa('help'), 'کمک');
  assert.equal(getTeamQuickMessageTextFa('go'), 'برو');
  assert.equal(getTeamQuickMessageTextFa('wait'), 'صبر کن');
  assert.equal(getTeamQuickMessageTextFa('invalid_id'), null);

  assert.equal(isTeamCommsMode('tdm_2v2'), true);
  assert.equal(isTeamCommsMode('tdm_1v1'), true);
  assert.equal(isTeamCommsMode('coop'), true);
  assert.equal(isTeamCommsMode('pvp'), false);
  assert.equal(isTeamCommsMode(null), false);

  // Same-team teammates receive signals; opposing team and FFA PvP NEVER receive signals
  assert.equal(shouldReceiveTeamSignal('tdm_2v2', 'alpha', 'alpha'), true);
  assert.equal(shouldReceiveTeamSignal('tdm_2v2', 'alpha', 'bravo'), false);
  assert.equal(shouldReceiveTeamSignal('pvp', 'alpha', 'alpha'), false);

  // Expiry pruning removes signals after 5s / 4s
  const t0 = 10_000;
  const pings = [
    { id: 'p1', expiresAt: t0 + TEAM_PING_TTL_MS },
    { id: 'p2', expiresAt: t0 + TEAM_PING_TTL_MS + 2000 },
  ];
  assert.deepEqual(
    pruneExpiredTeamSignals(pings, t0 + 5000).map((p) => p.id),
    ['p2']
  );
  assert.deepEqual(pruneExpiredTeamSignals(pings, t0 + 7001), []);
});

test('Host-authoritative anti-tamper validation silently rejects impossible movement, rapid fire, mag overflow, and forged damage', () => {
  const t0 = 50_000;

  // 1. Movement speed validation
  const okWalk = validateClientMovementPosition({
    prevX: 0,
    prevZ: 0,
    prevAtMs: t0,
    nextX: 1.2,
    nextY: 0,
    nextZ: 0.4,
    nowMs: t0 + 200,
    isSliding: false,
    slideAllowed: true,
    arenaHalf: 32,
  });
  assert.equal(okWalk.valid, true);

  const teleportHack = validateClientMovementPosition({
    prevX: 0,
    prevZ: 0,
    prevAtMs: t0,
    nextX: 28,
    nextY: 0,
    nextZ: -25,
    nowMs: t0 + 100,
    isSliding: false,
    slideAllowed: true,
    arenaHalf: 32,
  });
  assert.equal(teleportHack.valid, false, 'Teleporting across map in 100ms must be rejected');

  const flyHack = validateClientMovementPosition({
    prevX: 0,
    prevZ: 0,
    prevAtMs: t0,
    nextX: 0,
    nextY: 25,
    nextZ: 0,
    nowMs: t0 + 100,
    isSliding: false,
    slideAllowed: true,
    arenaHalf: 32,
  });
  assert.equal(flyHack.valid, false, 'Vertical fly hack must be rejected');

  const nanPos = validateClientMovementPosition({
    prevX: 0,
    prevZ: 0,
    prevAtMs: t0,
    nextX: Number.NaN,
    nextY: 0,
    nextZ: 0,
    nowMs: t0 + 100,
    isSliding: false,
    slideAllowed: true,
    arenaHalf: 32,
  });
  assert.equal(nanPos.valid, false);

  // 2. Fire rate & magazine count validation (Sniper idx=2: minFireIntervalMs=750, magSize=5)
  let tracker = undefined;
  const s1 = validateClientShootEvent(tracker, 2, t0);
  assert.equal(s1.valid, true);
  tracker = s1.nextTracker;

  // Firing sniper again only 80ms later -> impossible rapid-fire -> reject
  const rapidSniper = validateClientShootEvent(tracker, 2, t0 + 80);
  assert.equal(rapidSniper.valid, false);

  // Firing remaining valid shots up to magSize+1 grace (5 + 1 = 6) then overflowing without reload gap
  let now = t0;
  for (let i = 0; i < 5; i++) {
    now += 800;
    const res = validateClientShootEvent(tracker, 2, now);
    assert.equal(res.valid, true);
    tracker = res.nextTracker;
  }
  // 7th shot without >=1050ms reload pause must be rejected
  const magOverflow = validateClientShootEvent(tracker, 2, now + 800);
  assert.equal(magOverflow.valid, false);

  // Waiting >=1050ms (reload) resets mag cleanly
  const afterReload = validateClientShootEvent(tracker, 2, now + 1300);
  assert.equal(afterReload.valid, true);

  // 3. Damage validation (AK-47 idx=0: baseDamage=36, headMultiplier=2.2 => max body=36, max head=79)
  const validBody = validateAuthoritativeHitDamage({
    weaponIdx: 0,
    rawDamage: 36,
    isHeadshot: false,
    lastShotAtMs: t0,
    nowMs: t0 + 120,
  });
  assert.equal(validBody.valid, true);
  assert.equal(validBody.authoritativeDamage, 36);

  const validHead = validateAuthoritativeHitDamage({
    weaponIdx: 0,
    rawDamage: 79,
    isHeadshot: true,
    lastShotAtMs: t0,
    nowMs: t0 + 120,
  });
  assert.equal(validHead.valid, true);
  assert.equal(validHead.authoritativeDamage, 79);

  const forgedDmg = validateAuthoritativeHitDamage({
    weaponIdx: 0,
    rawDamage: 9999,
    isHeadshot: true,
    lastShotAtMs: t0,
    nowMs: t0 + 120,
  });
  assert.equal(forgedDmg.valid, false, 'Forged 9999 damage must be silently ignored');

  const staleHit = validateAuthoritativeHitDamage({
    weaponIdx: 0,
    rawDamage: 36,
    isHeadshot: false,
    lastShotAtMs: t0,
    nowMs: t0 + 6000,
  });
  assert.equal(staleHit.valid, false, 'Hit arriving 6s after last valid shot must be rejected');
});

test('Stage 1 — Online round bot fill: reconciles 1v1 and 2v2 slots, yields immediately to joining humans, respects Host settings & rematch consensus', () => {
  const t0 = 1_760_000_000_000;

  assert.equal(getRoundModeTeamCapacity('tdm_1v1'), 1);
  assert.equal(getRoundModeTeamCapacity('tdm_2v2'), 2);
  assert.equal(getRoundModeTeamCapacity('coop'), 0);
  assert.equal(formatOnlineBotDifficultyFa('weak'), 'آسان');
  assert.equal(formatOnlineBotDifficultyFa('medium'), 'متوسط');
  assert.equal(formatOnlineBotDifficultyFa('strong'), 'سخت');

  const sanitized = sanitizeHostMatchSettings({
    roundDurationSec: 60,
    targetWinRounds: 3,
    startingHp: 150,
    friendlyFire: true,
    fillBotsEnabled: true,
    botDifficulty: 'strong',
  });
  assert.equal(sanitized.fillBotsEnabled, true);
  assert.equal(sanitized.botDifficulty, 'strong');

  // Create a 2v2 room with only Host (Alpha) and fillBotsEnabled = true
  const baseRoom: AuthoritativeRoomState = {
    code: 'BC-BOT1',
    name: 'اتاق بات',
    mapId: 'warehouse',
    mode: 'tdm_2v2',
    hostId: 'host-1',
    hostName: 'HOST',
    wave: 1,
    teamScore: 0,
    playerCount: 1,
    alphaScore: 0,
    bravoScore: 0,
    currentRound: 1,
    roundDurationSec: 60,
    roundTimeRemainingSec: 60,
    roundPhase: 'playing',
    roundWinnerTeam: null,
    matchWinnerTeam: null,
    targetWinRounds: 3,
    startingHp: 150,
    friendlyFire: false,
    fillBotsEnabled: true,
    botDifficulty: 'strong',
    players: [
      {
        id: 'host-1',
        name: 'HOST',
        team: 'alpha',
        alive: true,
        x: 0,
        y: 0,
        z: 24,
        yaw: 0,
        pitch: 0,
        weaponIdx: 0,
        hp: 150,
        maxHp: 150,
        kills: 0,
        deaths: 0,
        score: 0,
        color: '#38bdf8',
        isHost: true,
        lastSeen: t0,
      },
    ],
  };

  // Reconcile 2v2 -> should add 1 Alpha bot + 2 Bravo bots (total 4 players: 2 Alpha, 2 Bravo) with startingHp=150
  const filled2v2 = reconcileOnlineBots(baseRoom, t0);
  assert.equal(filled2v2.players.length, 4);
  assert.equal(filled2v2.players.filter((p) => p.team === 'alpha').length, 2);
  assert.equal(filled2v2.players.filter((p) => p.team === 'bravo').length, 2);
  const bots = filled2v2.players.filter((p) => p.isBot);
  assert.equal(bots.length, 3);
  assert.ok(bots.every((b) => b.hp === 150 && b.maxHp === 150 && b.botDifficulty === 'strong'));

  // Rematch consensus must ignore bots so only active humans need to click ready
  const rematchRoom = { ...filled2v2, rematchReadyPlayerIds: ['host-1'] };
  assert.equal(areAllActivePlayersReadyForRematch(rematchRoom), true, 'Bots must not block rematch consensus');

  // When a real human joins, assignBalancedHumanTeam must ignore bots and place the human on Bravo (0 humans vs 1 on Alpha)
  const humanJoinTeam = assignBalancedHumanTeam(filled2v2.players);
  assert.equal(humanJoinTeam, 'bravo');

  const withHumanJoin: AuthoritativeRoomState = {
    ...filled2v2,
    players: [
      ...filled2v2.players,
      {
        id: 'human-2',
        name: 'PLAYER-2',
        team: humanJoinTeam,
        alive: true,
        x: 0,
        y: 0,
        z: -24,
        yaw: Math.PI,
        pitch: 0,
        weaponIdx: 0,
        hp: 150,
        maxHp: 150,
        kills: 0,
        deaths: 0,
        score: 0,
        color: '#f43f5e',
        isHost: false,
        lastSeen: t0 + 100,
      },
    ],
  };
  const afterHumanReconcile = reconcileOnlineBots(withHumanJoin, t0 + 100);
  assert.equal(afterHumanReconcile.players.length, 4, 'Total 2v2 capacity remains 4');
  assert.equal(afterHumanReconcile.players.filter((p) => p.isBot).length, 2, 'One Bravo bot immediately yielded its slot');
  assert.equal(afterHumanReconcile.players.filter((p) => p.team === 'bravo' && !p.isBot).length, 1);
  assert.equal(afterHumanReconcile.players.filter((p) => p.team === 'bravo' && p.isBot).length, 1);

  // Switching to 1v1 caps each team at 1 (2 humans: Host Alpha + Player-2 Bravo -> 0 bots!)
  const in1v1 = reconcileOnlineBots({ ...afterHumanReconcile, mode: 'tdm_1v1' }, t0 + 200);
  assert.equal(in1v1.players.length, 2);
  assert.equal(in1v1.players.filter((p) => p.isBot).length, 0);

  // Disabling fillBotsEnabled removes all bots immediately
  const botsOff = reconcileOnlineBots({ ...filled2v2, fillBotsEnabled: false }, t0 + 300);
  assert.equal(botsOff.players.length, 1);
  assert.equal(botsOff.players.filter((p) => p.isBot).length, 0);
});

test('Stage 1 — Authoritative bot simulation freezes during countdown, moves & shoots enemies during playing, and scales difficulty', () => {
  const weakProfile = getOnlineBotDifficultyProfile('weak');
  const medProfile = getOnlineBotDifficultyProfile('medium');
  const strongProfile = getOnlineBotDifficultyProfile('strong');
  assert.ok(strongProfile.moveSpeed > medProfile.moveSpeed && medProfile.moveSpeed > weakProfile.moveSpeed);
  assert.ok(strongProfile.accuracy > medProfile.accuracy && medProfile.accuracy > weakProfile.accuracy);
  assert.ok(strongProfile.fireIntervalMs < medProfile.fireIntervalMs && medProfile.fireIntervalMs < weakProfile.fireIntervalMs);

  const t0 = 1_760_000_050_000;
  let room: AuthoritativeRoomState = reconcileOnlineBots(
    {
      code: 'BC-SIM1',
      name: 'تست شبیه‌سازی',
      mapId: 'duel',
      mode: 'tdm_1v1',
      hostId: 'host-1',
      hostName: 'HOST',
      wave: 1,
      teamScore: 0,
      playerCount: 1,
      alphaScore: 0,
      bravoScore: 0,
      currentRound: 1,
      roundDurationSec: 90,
      roundTimeRemainingSec: 90,
      roundPhase: 'countdown',
      countdownRemainingSec: 3,
      roundWinnerTeam: null,
      matchWinnerTeam: null,
      targetWinRounds: 6,
      startingHp: 100,
      friendlyFire: false,
      fillBotsEnabled: true,
      botDifficulty: 'strong',
      players: [
        {
          id: 'host-1',
          name: 'HOST',
          team: 'alpha',
          alive: true,
          x: 0,
          y: 0,
          z: 10,
          yaw: 0,
          pitch: 0,
          weaponIdx: 0,
          hp: 100,
          maxHp: 100,
          kills: 0,
          deaths: 0,
          score: 0,
          color: '#38bdf8',
          isHost: true,
          lastSeen: t0,
        },
      ],
    },
    t0
  );

  const botBefore = room.players.find((p) => p.isBot)!;
  const runtimes = new Map();

  // During countdown, bots MUST NOT move or fire
  const frozenStep = stepOnlineBotsAuthoritative(room, runtimes, 0.5, t0 + 500, {
    canMoveTo: () => true,
    hasLineOfSight: () => true,
    rng: () => 0.01,
  });
  assert.equal(frozenStep.changed, false);
  assert.equal(frozenStep.shots.length, 0);

  // During playing, bot moves toward opponent and fires when in LOS
  room = { ...room, roundPhase: 'playing' };
  let totalShots = 0;
  for (let i = 0; i < 20; i++) {
    const step = stepOnlineBotsAuthoritative(room, runtimes, 0.1, t0 + 1000 + i * 100, {
      canMoveTo: () => true,
      hasLineOfSight: () => true,
      rng: () => 0.05, // guaranteed hit on strong bot
    });
    room = step.nextRoom;
    totalShots += step.shots.length;
    for (const s of step.shots) {
      assert.equal(s.attackerId, botBefore.id);
      assert.equal(s.targetId, 'host-1', 'Bravo bot must target opposing Alpha player only');
      assert.equal(s.hit, true);
      assert.ok(s.damage > 0);
    }
  }
  const botAfter = room.players.find((p) => p.id === botBefore.id)!;
  const movedDist = Math.hypot(botAfter.x - botBefore.x, botAfter.z - botBefore.z);
  assert.ok(movedDist > 0.5, `Bot should move during playing phase (moved ${movedDist.toFixed(2)}m)`);
  assert.ok(totalShots >= 1, `Bot should fire when LOS is open (shots=${totalShots})`);
});

test('Stage 2 — Short offline tutorial covers 5 core steps (or 6 with Slide enabled), advances sequentially, and auto-shows only on first offline run', () => {
  assert.equal(QUICK_TUTORIAL_STORAGE_KEY, 'vanguard_quick_tutorial_done_v1');

  // Auto-start gate: only first offline run (not online, not after completion/skip)
  assert.equal(shouldAutoStartQuickTutorial(null, false), true);
  assert.equal(shouldAutoStartQuickTutorial(undefined, false), true);
  assert.equal(shouldAutoStartQuickTutorial('1', false), false);
  assert.equal(shouldAutoStartQuickTutorial(null, true), false);

  // Slide OFF -> 5 steps: move, aim, shoot, reload, switch
  let qt5 = createQuickTutorialState(false);
  assert.equal(qt5.steps.length, 5);
  assert.deepEqual(
    qt5.steps.map((s) => s.id),
    ['move', 'aim', 'shoot', 'reload', 'switch']
  );

  // Out-of-order action (e.g. reload while on move step) does not prematurely skip step 1
  const outOfOrder = advanceQuickTutorial(qt5, 'reload', 1);
  assert.equal(outOfOrder.changed, false);

  // Step 1: Move 3.5m in two increments
  let r = advanceQuickTutorial(qt5, 'move', 2.0);
  assert.equal(r.changed, true);
  assert.equal(r.stepCompleted, false);
  qt5 = r.next!;
  r = advanceQuickTutorial(qt5, 'move', 2.0);
  assert.equal(r.stepCompleted, true);
  assert.equal(r.next!.currentIndex, 1);
  qt5 = r.next!;

  // Step 2: Aim
  r = advanceQuickTutorial(qt5, 'aim', 1);
  assert.equal(r.stepCompleted, true);
  assert.equal(r.next!.currentIndex, 2);
  qt5 = r.next!;

  // Step 3: Shoot 3 fixed targets
  r = advanceQuickTutorial(qt5, 'shoot', 1);
  assert.equal(r.stepCompleted, false);
  qt5 = r.next!;
  r = advanceQuickTutorial(qt5, 'shoot', 2);
  assert.equal(r.stepCompleted, true);
  assert.equal(r.next!.currentIndex, 3);
  qt5 = r.next!;

  // Step 4: Reload
  r = advanceQuickTutorial(qt5, 'reload', 1);
  assert.equal(r.stepCompleted, true);
  assert.equal(r.next!.currentIndex, 4);
  qt5 = r.next!;

  // Step 5: Switch -> completes all when slide is OFF
  r = advanceQuickTutorial(qt5, 'switch', 1);
  assert.equal(r.stepCompleted, true);
  assert.equal(r.allCompleted, true);
  assert.equal(r.next!.completedAll, true);

  // Slide ON -> 6 steps including slide at the end
  let qt6 = createQuickTutorialState(true);
  assert.equal(qt6.steps.length, 6);
  assert.equal(qt6.steps[5].id, 'slide');
  qt6 = advanceQuickTutorial(qt6, 'move', 4).next!;
  qt6 = advanceQuickTutorial(qt6, 'aim', 1).next!;
  qt6 = advanceQuickTutorial(qt6, 'shoot', 3).next!;
  qt6 = advanceQuickTutorial(qt6, 'reload', 1).next!;
  const afterSwitch = advanceQuickTutorial(qt6, 'switch', 1);
  assert.equal(afterSwitch.allCompleted, false, 'With Slide ON, tutorial must proceed to step 6 (slide)');
  assert.equal(afterSwitch.next!.currentIndex, 5);
  const afterSlide = advanceQuickTutorial(afterSwitch.next!, 'slide', 1);
  assert.equal(afterSlide.stepCompleted, true);
  assert.equal(afterSlide.allCompleted, true);
});

test('Ad billboards config enforces low counts per map, compact sizes, safe self-hosted paths, exact aspect ratio, and Settings toggle default ON', () => {
  // Rule 1: Only 2-3 billboards per map (max 2 on 1v1 duel)
  assert.ok(AD_BILLBOARDS_BY_MAP.warehouse.length >= 2 && AD_BILLBOARDS_BY_MAP.warehouse.length <= 3);
  assert.ok(AD_BILLBOARDS_BY_MAP.docks.length >= 2 && AD_BILLBOARDS_BY_MAP.docks.length <= 3);
  assert.ok(AD_BILLBOARDS_BY_MAP.outpost.length >= 2 && AD_BILLBOARDS_BY_MAP.outpost.length <= 3);
  assert.ok(AD_BILLBOARDS_BY_MAP.duel.length >= 1 && AD_BILLBOARDS_BY_MAP.duel.length <= 2);
  assert.equal(getMapAdBillboards('duel').length, 2);

  // Rule 2 & 8: Compact (~2-3m), unique IDs, safe local image path, Persian description
  const seenIds = new Set<string>();
  for (const cfg of ALL_AD_BILLBOARDS) {
    assert.ok(!seenIds.has(cfg.id), `Duplicate billboard id: ${cfg.id}`);
    seenIds.add(cfg.id);
    assert.ok(cfg.maxWidth >= 1.5 && cfg.maxWidth <= 3.0, `Width out of compact range: ${cfg.maxWidth}`);
    assert.ok(cfg.maxHeight >= 1.5 && cfg.maxHeight <= 3.0, `Height out of compact range: ${cfg.maxHeight}`);
    assert.ok(cfg.locationLabelFa.trim().length > 4);
    assert.ok(resolveSafeLocalAdPath(cfg.imagePath)?.startsWith('./ads/'));
  }

  // Rule 8: External URLs & path traversal must be blocked silently
  assert.equal(resolveSafeLocalAdPath('https://evil.example/ad.jpg'), null);
  assert.equal(resolveSafeLocalAdPath('http://example.com/ad.jpg'), null);
  assert.equal(resolveSafeLocalAdPath('//cdn.example.com/ad.jpg'), null);
  assert.equal(resolveSafeLocalAdPath('javascript:alert(1)'), null);
  assert.equal(resolveSafeLocalAdPath('data:image/png;base64,AAA'), null);
  assert.equal(resolveSafeLocalAdPath('../secret.jpg'), null);
  assert.equal(resolveSafeLocalAdPath(''), null);
  assert.equal(resolveSafeLocalAdPath('./ads/ad-01.jpg'), './ads/ad-01.jpg');
  assert.equal(resolveSafeLocalAdPath('ads/ad-02.webp'), './ads/ad-02.webp');

  // Rule 2: Exact natural aspect ratio preserved without stretching
  // Portrait 765x1024 inside 2.4x2.35 -> height capped at 2.35, width = 2.35 * (765/1024) = 1.756
  const portrait = computeBillboardDimensions(765, 1024, 2.4, 2.35);
  assert.equal(portrait.height, 2.35);
  assert.ok(Math.abs(portrait.width / portrait.height - 765 / 1024) < 0.002);

  // Landscape 1920x1080 inside 2.5x2.25 -> width capped at 2.5, height = 2.5 / (16/9) = 1.406
  const landscape = computeBillboardDimensions(1920, 1080, 2.5, 2.25);
  assert.equal(landscape.width, 2.5);
  assert.ok(Math.abs(landscape.width / landscape.height - 16 / 9) < 0.002);

  // Square 512x512 inside 2.5x2.2 -> height capped at 2.2, width = 2.2
  const square = computeBillboardDimensions(512, 512, 2.5, 2.2);
  assert.equal(square.width, 2.2);
  assert.equal(square.height, 2.2);

  // Rule 7: Settings toggle defaults to ON (true) and is registered for settings reset
  assert.equal(loadShowAdBillboards(), true);
  assert.ok(ALL_SETTINGS_STORAGE_KEYS.includes(SHOW_AD_BILLBOARDS_STORAGE_KEY));
  // Calling saveShowAdBillboards in Node (no localStorage) must not throw
  assert.doesNotThrow(() => saveShowAdBillboards(false));
});

test('Animations Stage 1 — Compact player anim enum (0..9 including emote), local speed-derived remote walk/run, smooth death fall/fade, respawn emerge, and online merge preservation', () => {
  const allStates = ['idle', 'walk', 'run', 'slide', 'shoot', 'reload', 'switch', 'dead', 'respawn', 'emote'] as const;
  assert.equal(Object.keys(PLAYER_ANIM_STATE_TO_CODE).length, 10);
  for (const st of allStates) {
    const code = encodePlayerAnimState(st);
    assert.ok(Number.isInteger(code) && code >= 0 && code <= 9);
    assert.equal(decodePlayerAnimState(code), st);
  }
  assert.equal(decodePlayerAnimState(99), 'idle');
  assert.equal(decodePlayerAnimState(undefined), 'idle');

  // Local state priority resolution
  assert.equal(
    resolveLocalPlayerAnimState({
      alive: false,
      isRespawning: true,
      isSliding: true,
      isReloading: true,
      isSwitching: true,
      recentlyFired: true,
      isMoving: true,
      isSprinting: true,
    }),
    'dead'
  );
  assert.equal(
    resolveLocalPlayerAnimState({
      alive: true,
      isRespawning: false,
      isSliding: true,
      isReloading: true,
      isSwitching: false,
      recentlyFired: false,
      isMoving: true,
      isSprinting: true,
    }),
    'slide'
  );
  assert.equal(
    resolveLocalPlayerAnimState({
      alive: true,
      isRespawning: false,
      isSliding: false,
      isReloading: true,
      isSwitching: false,
      recentlyFired: false,
      isMoving: true,
      isSprinting: false,
    }),
    'reload'
  );
  assert.equal(
    resolveLocalPlayerAnimState({
      alive: true,
      isRespawning: false,
      isSliding: false,
      isReloading: false,
      isSwitching: false,
      recentlyFired: false,
      isMoving: true,
      isSprinting: true,
    }),
    'run'
  );

  // Remote locomotion derived locally from observed speed (no per-bone network traffic)
  assert.equal(computeRemoteLocomotionFromSpeed(0.1).mode, 'idle');
  const walkLoco = computeRemoteLocomotionFromSpeed(3.2);
  assert.equal(walkLoco.mode, 'walk');
  assert.ok(walkLoco.strideAmplitude > 0 && walkLoco.strideFrequency > 0);
  const runLoco = computeRemoteLocomotionFromSpeed(7.5);
  assert.equal(runLoco.mode, 'run');
  assert.ok(runLoco.strideAmplitude > walkLoco.strideAmplitude);
  assert.ok(runLoco.strideFrequency > walkLoco.strideFrequency);

  // Death animation: smooth fall first, full opacity before fade start, then gentle fade-out to 0
  const fallMid = computeHumanoidVisualPose({
    alive: false,
    actionState: 'dead',
    actionElapsedSec: HUMANOID_DEATH_FALL_SEC * 0.5,
    walkPhase: 0,
    speedMps: 0,
    slideBlend: 0,
    recoilKick: 0,
    idleTimeSec: 1,
    deathElapsedSec: HUMANOID_DEATH_FALL_SEC * 0.5,
    respawnElapsedSec: 1,
  });
  assert.ok(fallMid.deathFallRotX < -0.5);
  assert.equal(fallMid.opacity, 1);

  const fading = computeHumanoidVisualPose({
    alive: false,
    actionState: 'dead',
    actionElapsedSec: HUMANOID_DEATH_FADE_START_SEC + 0.3,
    walkPhase: 0,
    speedMps: 0,
    slideBlend: 0,
    recoilKick: 0,
    idleTimeSec: 1,
    deathElapsedSec: HUMANOID_DEATH_FADE_START_SEC + 0.3,
    respawnElapsedSec: 1,
  });
  assert.ok(fading.opacity > 0 && fading.opacity < 1);

  const fadedDone = computeHumanoidVisualPose({
    alive: false,
    actionState: 'dead',
    actionElapsedSec: HUMANOID_DEATH_TOTAL_SEC,
    walkPhase: 0,
    speedMps: 0,
    slideBlend: 0,
    recoilKick: 0,
    idleTimeSec: 1,
    deathElapsedSec: HUMANOID_DEATH_TOTAL_SEC,
    respawnElapsedSec: 1,
  });
  assert.equal(fadedDone.opacity, 0);

  // Respawn smooth emerge
  const respStart = computeHumanoidVisualPose({
    alive: true,
    actionState: 'respawn',
    actionElapsedSec: 0,
    walkPhase: 0,
    speedMps: 0,
    slideBlend: 0,
    recoilKick: 0,
    idleTimeSec: 1,
    deathElapsedSec: 0,
    respawnElapsedSec: 0,
  });
  const respEnd = computeHumanoidVisualPose({
    alive: true,
    actionState: 'idle',
    actionElapsedSec: 0,
    walkPhase: 0,
    speedMps: 0,
    slideBlend: 0,
    recoilKick: 0,
    idleTimeSec: 1,
    deathElapsedSec: 0,
    respawnElapsedSec: HUMANOID_RESPAWN_DURATION_SEC,
  });
  assert.ok(respStart.opacity < respEnd.opacity && respEnd.opacity === 1);
  assert.ok(respStart.respawnScaleY < 1 && respEnd.respawnScaleY === 1);

  // Host state merge preserves compact anim enum & timestamp while clamping out-of-range values
  const room: AuthoritativeRoomState = {
    code: 'BC-ANIM',
    name: 'اتاق انیمیشن',
    mapId: 'duel',
    mode: 'tdm_1v1',
    hostId: 'h1',
    hostName: 'HOST',
    wave: 1,
    teamScore: 0,
    playerCount: 1,
    alphaScore: 0,
    bravoScore: 0,
    currentRound: 1,
    roundTimeRemainingSec: 90,
    roundPhase: 'playing',
    roundWinnerTeam: null,
    matchWinnerTeam: null,
    targetWinRounds: 6,
    players: [
      { id: 'h1', name: 'HOST', team: 'alpha', alive: true, x: 0, y: 0, z: 14.5, yaw: 0, pitch: 0, weaponIdx: 0, hp: 100, maxHp: 100, kills: 0, score: 0, color: '#38bdf8', isHost: true, lastSeen: 1000 },
    ],
  };
  const mergedAnim = mergeClientInputIntoHostState(room, { id: 'h1', anim: encodePlayerAnimState('reload'), animAt: 2500 }, 2600);
  assert.equal(mergedAnim.players[0].anim, 5);
  assert.equal(mergedAnim.players[0].animAt, 2500);
  const clampedAnim = mergeClientInputIntoHostState(mergedAnim, { id: 'h1', anim: 999 }, 2700);
  assert.equal(clampedAnim.players[0].anim, 5, 'Invalid anim enum should be ignored and retain last valid state');
});

test('Animations Stage 2 — Per-weapon recoil/flash/shell profiles, multi-phase reload (mag & RPG), switch & katana slash poses', () => {
  // Every catalog weapon has a valid animation profile
  for (const wId of ALL_WEAPON_IDS) {
    const prof = getWeaponAnimProfile(wId);
    assert.ok(prof && WEAPON_ANIM_PROFILES[wId]);
    assert.ok(prof.posDamp > 0 && prof.rotDamp > 0);
  }
  assert.equal(getWeaponAnimProfile('katana').ejectShell, false);
  assert.equal(getWeaponAnimProfile('rpg').ejectShell, false);
  assert.equal(getWeaponAnimProfile('ak47').ejectShell, true);
  assert.ok(getWeaponAnimProfile('sniper').kickBackScale > getWeaponAnimProfile('mp5').kickBackScale);

  // Rifle reload pulls magazine down in phase 1-2 and returns to 0 by phase 4
  const relStart = computeWeaponReloadPose(0.0, 'ak47', false);
  const relMid = computeWeaponReloadPose(0.42, 'ak47', false);
  const relEnd = computeWeaponReloadPose(1.0, 'ak47', false);
  assert.equal(relStart.magOffsetY, 0);
  assert.ok(relMid.magOffsetY < -0.2, 'Magazine should drop clearly during mid-reload');
  assert.equal(relEnd.magOffsetY, 0);

  // RPG reload hides rocket early then slides a fresh warhead into the front launcher
  const rpgEarly = computeWeaponReloadPose(0.15, 'rpg', false);
  const rpgSlide = computeWeaponReloadPose(0.5, 'rpg', false);
  const rpgDone = computeWeaponReloadPose(0.95, 'rpg', false);
  assert.equal(rpgEarly.magVisible, false);
  assert.equal(rpgSlide.magVisible, true);
  assert.ok(rpgSlide.magOffsetZ < 0 && rpgDone.magOffsetZ === 0);

  // Weapon switch drops when switchAnim=1 and settles to 0 when switchAnim=0
  const swStart = computeWeaponSwitchPose(1);
  const swEnd = computeWeaponSwitchPose(0);
  assert.ok(swStart.dropY < -0.2);
  assert.equal(swEnd.dropY, 0);

  // Katana slash has anticipation -> fast strike -> neutral return
  const kIdle = computeKatanaSlashPose(0, 1);
  const kWindup = computeKatanaSlashPose(0.15, 1);
  const kStrike = computeKatanaSlashPose(0.5, 1);
  assert.ok(kWindup.rotX > kIdle.rotX, 'Wind-up anticipates backward');
  assert.ok(kStrike.rotX < kIdle.rotX - 1.0, 'Strike swings sharply forward');
});

test('Animations Stages 3 & 5 — Camera motion intensity slider (0..100, default 65), Reduced Motion, and Auto Quality FX budget scaling', () => {
  // Settings defaults & clamping
  assert.equal(loadCameraMotionIntensity(), 65);
  assert.equal(clampCameraMotionIntensity(-20), 0);
  assert.equal(clampCameraMotionIntensity(180), 100);
  assert.equal(loadReducedMotionEnabled(), false);
  assert.equal(loadAutoQualityEnabled(), true);
  assert.ok(ALL_SETTINGS_STORAGE_KEYS.includes(CAMERA_MOTION_INTENSITY_STORAGE_KEY));
  assert.ok(ALL_SETTINGS_STORAGE_KEYS.includes(REDUCED_MOTION_STORAGE_KEY));
  assert.ok(ALL_SETTINGS_STORAGE_KEYS.includes(AUTO_QUALITY_STORAGE_KEY));

  // Camera motion scale: 0% or Reduced Motion => completely zero camera bob/roll/shake
  assert.equal(getEffectiveCameraMotionScale(0, false), 0);
  assert.equal(getEffectiveCameraMotionScale(100, true), 0);
  assert.equal(getEffectiveCameraMotionScale(65, false), 0.65);

  const camZero = computeCameraMotionOffsets({
    intensityScale: 0,
    walkBobTimer: 1.5,
    isMoving: true,
    onGround: true,
    sprinting: true,
    sliding: false,
    isADS: false,
    strafeInputX: 1,
    landDip: 0.12,
    screenShake: 0.03,
  });
  assert.deepEqual(camZero, { offsetY: 0, offsetX: 0, rollZ: 0, pitchX: 0, shakeAmp: 0 });

  const camNormal = computeCameraMotionOffsets({
    intensityScale: 0.65,
    walkBobTimer: 0.7,
    isMoving: true,
    onGround: true,
    sprinting: true,
    sliding: false,
    isADS: false,
    strafeInputX: 0.5,
    landDip: 0.1,
    screenShake: 0.02,
  });
  assert.ok(camNormal.pitchX < 0, 'Landing dip should apply subtle downward pitch nod');
  assert.ok(camNormal.shakeAmp > 0 && camNormal.shakeAmp < 0.02);

  // Auto Quality & FX budget coordination with Graphics Presets and Reduced Motion
  assert.equal(getBaseFxTierForPreset('potato'), 0);
  assert.equal(getBaseFxTierForPreset('med'), 1);
  assert.equal(getBaseFxTierForPreset('high'), 2);

  const highFull = computeFxBudget('high', 2, false);
  assert.equal(highFull.enableShells, true);
  assert.equal(highFull.enableMuzzleLight, true);
  assert.equal(highFull.particleCountScale, 1.0);

  const reducedFx = computeFxBudget('promax', 2, true);
  assert.equal(reducedFx.tier, 0);
  assert.equal(reducedFx.enableShells, false);
  assert.equal(reducedFx.enableMuzzleLight, false);
  assert.ok(reducedFx.particleCountScale < 0.5);

  // Auto Quality steps down on sustained low FPS and recovers on sustained high FPS, while skipping headless software WebGL
  let mon = createAutoQualityMonitorState();
  assert.equal(mon.tier, 2);
  // Software WebGL bypass stays at tier 2
  const swMon = stepAutoQualityTier(mon, 10, 2.0, true, true);
  assert.equal(swMon.tier, 2);
  // Real GPU experiencing 28 FPS for 1.5s drops from tier 2 -> 1
  mon = stepAutoQualityTier(mon, 28, 0.5, true, false);
  mon = stepAutoQualityTier(mon, 28, 0.5, true, false);
  mon = stepAutoQualityTier(mon, 28, 0.5, true, false);
  assert.equal(mon.tier, 1);
  // Sustained 58 FPS for 3.5s recovers tier 1 -> 2
  for (let i = 0; i < 7; i++) {
    mon = stepAutoQualityTier(mon, 58, 0.5, true, false);
  }
  assert.equal(mon.tier, 2);
});

test('Mobile-first pixel ratio cap and adaptive shadow budgeting work as designed', () => {
  // Mobile detection covers Android/iPhone UA and narrow touch viewports
  assert.equal(detectIsMobileDevice('Mozilla/5.0 (Linux; Android 13; Pixel 7)', 5, 412), true);
  assert.equal(detectIsMobileDevice('Mozilla/5.0 (X11; Linux x86_64) Chrome/120', 0, 1280), false);
  assert.equal(detectIsMobileDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 5, 820), true);

  // Mobile DPR is strictly capped at 1.5 even on 3x flagship screens with promax preset
  const mobileHighDpr = computeEffectivePixelRatio({
    devicePixelRatio: 3,
    resScale: 1.0,
    preset: 'promax',
    isMobile: true,
    isSoftwareGl: false,
  });
  assert.equal(mobileHighDpr, MOBILE_MAX_PIXEL_RATIO);

  // Desktop DPR capped at 2.0
  const desktopHighDpr = computeEffectivePixelRatio({
    devicePixelRatio: 3,
    resScale: 1.0,
    preset: 'promax',
    isMobile: false,
    isSoftwareGl: false,
  });
  assert.equal(desktopHighDpr, DESKTOP_MAX_PIXEL_RATIO);

  // Software WebGL always locks to 1.0
  assert.equal(
    computeEffectivePixelRatio({
      devicePixelRatio: 2,
      resScale: 1.2,
      preset: 'promax',
      isMobile: false,
      isSoftwareGl: true,
    }),
    1.0
  );

  // Adaptive Quality stage 3 scales resolution down (0.72x)
  const mobileStage3Dpr = computeEffectivePixelRatio({
    devicePixelRatio: 2,
    resScale: 1.0,
    preset: 'med',
    isMobile: true,
    isSoftwareGl: false,
    autoQualityResScale: 0.72,
  });
  assert.ok(mobileStage3Dpr < 1.05 && mobileStage3Dpr >= 0.9, `Expected ~0.97, got ${mobileStage3Dpr}`);

  // Shadow config tightens frustum and caps mapSize on mobile, disables at Stage 2+
  const mobileShadow = computeEffectiveShadowConfig({
    shadowMode: 'ultra',
    isMobile: true,
    isSoftwareGl: false,
    autoQualityStage: 0,
    arenaHalf: 48,
  });
  assert.equal(mobileShadow.enabled, true);
  assert.equal(mobileShadow.mapSize, 1024);
  assert.equal(mobileShadow.frustumHalf, 24);

  const stage2Shadow = computeEffectiveShadowConfig({
    shadowMode: 'ultra',
    isMobile: false,
    isSoftwareGl: false,
    autoQualityStage: 2,
    arenaHalf: 48,
  });
  assert.equal(stage2Shadow.enabled, false);
});

test('Multi-stage Adaptive Quality degrades FX -> Shadows -> Resolution and recovers smoothly', () => {
  let aq = createAdaptiveQualityState();
  assert.equal(aq.stage, 0);

  // Software GL bypasses degradation completely
  const swAq = stepAdaptiveQuality(aq, 8, 5.0, true, true);
  assert.equal(swAq.stage, 0);

  // Disabled auto-quality stays at stage 0
  const offAq = stepAdaptiveQuality(aq, 12, 5.0, false, false);
  assert.equal(offAq.stage, 0);

  // Sustained 24 FPS steps 0 -> 1 -> 2 -> 3
  aq = stepAdaptiveQuality(aq, 24, 1.0, true, false);
  assert.equal(aq.stage, 0);
  aq = stepAdaptiveQuality(aq, 24, 1.0, true, false);
  assert.equal(aq.stage, 1);
  assert.equal(getAdaptiveQualityEffects(1).fxTierOverride, 0);
  assert.equal(getAdaptiveQualityEffects(1).disableShadows, false);

  aq = stepAdaptiveQuality(aq, 24, 2.0, true, false);
  assert.equal(aq.stage, 2);
  assert.equal(getAdaptiveQualityEffects(2).disableShadows, true);
  assert.equal(getAdaptiveQualityEffects(2).resScaleMultiplier, 1.0);

  aq = stepAdaptiveQuality(aq, 24, 2.0, true, false);
  assert.equal(aq.stage, 3);
  assert.equal(getAdaptiveQualityEffects(3).resScaleMultiplier, 0.72);

  // Recovery on sustained >= 48 FPS steps back down 3 -> 2 -> 1 -> 0
  aq = stepAdaptiveQuality(aq, 55, 4.0, true, false);
  assert.equal(aq.stage, 2);
  aq = stepAdaptiveQuality(aq, 55, 4.0, true, false);
  assert.equal(aq.stage, 1);
  aq = stepAdaptiveQuality(aq, 55, 4.0, true, false);
  assert.equal(aq.stage, 0);
});

test('Distance culling, delta sync filtering, compact PeerJS wire codecs and smooth remote interpolation', () => {
  assert.equal(shouldCullSmallProp(10, 10, 20), false);
  assert.equal(shouldCullSmallProp(25, 25, 30), true);
  assert.equal(CLIENT_SYNC_INTERVAL_SEC, 0.045);

  const baseSnap = {
    x: 4.12,
    y: 1.7,
    z: -8.35,
    yaw: 1.25,
    pitch: -0.1,
    weaponIdx: 1,
    hp: 100,
    kills: 2,
    score: 200,
    wave: 1,
    isSliding: false,
    anim: 1,
    animAt: 10000,
  };
  assert.equal(shouldSendClientStateDelta(null, baseSnap, 0), true);
  // Identical static frame below heartbeat is skipped to save bandwidth
  assert.equal(shouldSendClientStateDelta(baseSnap, { ...baseSnap }, 120), false);
  // Idle heartbeat forces periodic keepalive
  assert.equal(shouldSendClientStateDelta(baseSnap, { ...baseSnap }, CLIENT_IDLE_HEARTBEAT_MS), true);
  // Small movement >= 2cm triggers send
  assert.equal(shouldSendClientStateDelta(baseSnap, { ...baseSnap, x: baseSnap.x + 0.03 }, 45), true);
  // Anim state change triggers send
  assert.equal(shouldSendClientStateDelta(baseSnap, { ...baseSnap, anim: 4 }, 45), true);

  // Compact client input roundtrip & size reduction
  const nowMs = 1_750_000_000_000;
  const inputSample = {
    roomCode: 'AB12CD',
    playerId: 'p-1234',
    name: 'GHOST',
    x: 12.34,
    y: 1.7,
    z: -9.87,
    yaw: -2.456,
    pitch: 0.312,
    weaponIdx: 2,
    hp: 85,
    kills: 4,
    score: 450,
    roundNum: 3,
    respawnSeq: 2,
    isSliding: true,
    anim: 3,
    animAt: nowMs - 250,
  };
  const encodedInput = encodeCompactClientInput(inputSample, nowMs);
  const decodedInput = decodeCompactClientInput(encodedInput, nowMs);
  assert.ok(decodedInput);
  assert.equal(decodedInput.roomCode, 'AB12CD');
  assert.equal(decodedInput.playerId, 'p-1234');
  assert.ok(Math.abs(decodedInput.x - inputSample.x) <= 0.01);
  assert.ok(Math.abs(decodedInput.z - inputSample.z) <= 0.01);
  assert.ok(Math.abs(decodedInput.yaw - inputSample.yaw) <= 0.001);
  assert.equal(decodedInput.isSliding, true);
  assert.equal(decodedInput.anim, 3);
  assert.equal(decodedInput.animAt, nowMs - 250);

  const compactBytes = JSON.stringify({ t: 'c:i', d: encodedInput }).length;
  const verboseBytes = JSON.stringify({ t: 'client:input', ...inputSample }).length;
  assert.ok(compactBytes < verboseBytes * 0.65, `Expected compact packet < 65% of verbose (${compactBytes} vs ${verboseBytes})`);

  // Compact host pose roundtrip
  const poseSample = {
    id: 'p-1234',
    x: -5.25,
    y: 1.7,
    z: 14.8,
    yaw: 3.1,
    pitch: -0.25,
    weaponIdx: 0,
    isSliding: false,
    alive: true,
    anim: 2,
    animAt: nowMs - 100,
  };
  const decodedPose = decodeCompactPlayerPose(encodeCompactPlayerPose(poseSample, nowMs), nowMs);
  assert.ok(decodedPose);
  assert.equal(decodedPose.id, 'p-1234');
  assert.equal(decodedPose.alive, true);
  assert.equal(decodedPose.isSliding, false);
  assert.ok(Math.abs(decodedPose.x - poseSample.x) <= 0.01);
  assert.ok(Math.abs(decodedPose.yaw - poseSample.yaw) <= 0.001);

  // Shortest-angle wrap across +/-PI
  const wrapped = lerpAngle(Math.PI - 0.1, -Math.PI + 0.1, 0.5);
  assert.ok(Math.abs(Math.abs(wrapped) - Math.PI) < 0.05, `Expected wrap near PI, got ${wrapped}`);

  // Smooth interpolation vs respawn teleport snap (>10m)
  const smooth = computeSmoothedRemoteTransform({
    curX: 0,
    curY: 1.7,
    curZ: 0,
    curYaw: 0,
    targetX: 2,
    targetY: 1.7,
    targetZ: 0,
    targetYaw: 1,
    dtSec: 0.016,
  });
  assert.equal(smooth.snapped, false);
  assert.ok(smooth.x > 0.2 && smooth.x < 1.2);

  const snapped = computeSmoothedRemoteTransform({
    curX: 0,
    curY: 1.7,
    curZ: 0,
    curYaw: 0,
    targetX: 25,
    targetY: 1.7,
    targetZ: -15,
    targetYaw: 2,
    dtSec: 0.016,
  });
  assert.equal(snapped.snapped, true);
  assert.equal(snapped.x, 25);
  assert.equal(snapped.z, -15);

  // Hidden Performance Profiler defaults to OFF and is registered in settings reset keys
  assert.equal(loadShowPerfProfiler(), false);
  assert.ok(ALL_SETTINGS_STORAGE_KEYS.includes(SHOW_PERF_PROFILER_STORAGE_KEY));
});

test('VPN-resilient PeerJS config prioritizes custom host, computes exponential backoff, inspects TURN UDP/TCP/TLS 443, and falls back to STUN when Worker fails', async () => {
  assert.equal(DIRECT_CONNECT_RELAY_FALLBACK_MS, 15_000);

  // Custom self-hosted broker must be Priority 1 ahead of backup & default brokers
  const brokers = buildPeerBrokerList({
    VITE_PEER_HOST: 'peer.mygame.ir',
    VITE_PEER_PORT: '443',
    VITE_PEER_PATH: '/signal',
    VITE_PEER_SECURE: 'true',
    VITE_PEER_BACKUP_BROKERS: 'https://backup1.mygame.ir:8443/peerjs,backup2.mygame.ir',
  });
  assert.equal(brokers[0].host, 'peer.mygame.ir');
  assert.equal(brokers[0].path, '/signal');
  assert.equal(brokers[0].isCustom, true);
  assert.equal(brokers[1].host, 'backup1.mygame.ir');
  assert.equal(brokers[1].port, 8443);
  assert.equal(brokers[2].host, 'backup2.mygame.ir');
  assert.ok(brokers.some((b) => b.host === '0.peerjs.com'), 'Built-in fallback broker stays in list');

  // Exponential backoff grows monotonically and caps safely
  const b0 = computeReconnectBackoffMs(0);
  const b1 = computeReconnectBackoffMs(1);
  const b2 = computeReconnectBackoffMs(2);
  const bCap = computeReconnectBackoffMs(20);
  assert.ok(b0 >= 600 && b1 > b0 && b2 > b1);
  assert.ok(bCap <= 15_000);

  // TURN capability inspection verifies UDP, TCP, and TLS 443
  const caps = inspectTurnCapabilities([
    { urls: 'stun:stun.cloudflare.com:3478' },
    {
      urls: [
        'turn:turn.cloudflare.com:3478?transport=udp',
        'turn:turn.cloudflare.com:3478?transport=tcp',
        'turns:turn.cloudflare.com:443?transport=tcp',
      ],
      username: 'u1',
      credential: 'c1',
    },
  ]);
  assert.equal(caps.hasTurn, true);
  assert.equal(caps.hasUdp, true);
  assert.equal(caps.hasTcp, true);
  assert.equal(caps.hasTls443, true);

  // Relay-only PeerJS options set iceTransportPolicy='relay'
  const relayOpts = getPeerJsClientOptions(brokers[0], PEERJS_STUN_SERVERS, 'relay');
  assert.equal(relayOpts.config.iceTransportPolicy, 'relay');

  // Worker resolution: unconfigured -> STUN-only fallback
  clearCachedIceConfig();
  const unconf = await resolveRuntimeIceServers({ workerUrl: '', forceRefresh: true });
  assert.equal(unconf.turnWorkerStatus, 'unconfigured');
  assert.equal(unconf.hasTurn, false);
  assert.ok(unconf.iceServers.length >= PEERJS_STUN_SERVERS.length);
  assert.ok(formatTurnWorkerStatusFa(unconf.turnWorkerStatus, false).includes('STUN'));

  // Worker resolution: healthy Worker returning ephemeral TURN creds
  const okRes = await resolveRuntimeIceServers({
    workerUrl: 'https://turn-worker.example.workers.dev',
    forceRefresh: true,
    fetchImpl: (async () =>
      new Response(
        JSON.stringify({
          iceServers: [
            {
              urls: [
                'turn:turn.cloudflare.com:3478?transport=udp',
                'turn:turn.cloudflare.com:3478?transport=tcp',
                'turns:turn.cloudflare.com:443?transport=tcp',
              ],
              username: 'ephemeral-user',
              credential: 'ephemeral-pass',
            },
          ],
          ttl: 3600,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )) as typeof fetch,
  });
  assert.equal(okRes.turnWorkerStatus, 'ok');
  assert.equal(okRes.hasTurn, true);
  assert.equal(okRes.turnSupportsUdpTcpTls443, true);
  assert.ok(formatTurnWorkerStatusFa(okRes.turnWorkerStatus, true).includes('TLS 443'));

  // Worker resolution: unreachable Worker falls back cleanly to STUN-only without throwing
  const failRes = await resolveRuntimeIceServers({
    workerUrl: 'https://down-worker.example.workers.dev',
    forceRefresh: true,
    fetchImpl: (async () => {
      throw new Error('network error');
    }) as typeof fetch,
  });
  assert.equal(failRes.turnWorkerStatus, 'unreachable');
  assert.equal(failRes.hasTurn, false);
  assert.ok(failRes.iceServers.length >= PEERJS_STUN_SERVERS.length);
});

test('Room codes use unambiguous 8-char alphabet (no O/0/I/1), clean #room=CODE links, legacy ?room= compatibility, and lobby Ready gating', () => {
  assert.equal(ROOM_CODE_ALPHABET.length, 32);
  assert.ok(!/[O0I1]/.test(ROOM_CODE_ALPHABET), 'Alphabet must exclude ambiguous O, 0, I, 1');

  for (let i = 0; i < 20; i++) {
    const code = generatePeerRoomCode();
    assert.equal(code.length, 8);
    assert.ok(!/[O0I1]/.test(code), `Generated code ${code} must not contain O/0/I/1`);
  }

  // Normalization supports new 8-char codes, dashed codes, Persian digits, and legacy BC-XXXX
  assert.equal(normalizeRoomCode('k7m9-p2x4'), 'K7M9P2X4');
  assert.equal(normalizeRoomCode('K7M9P2X4'), 'K7M9P2X4');
  assert.equal(normalizeRoomCode('۴۸۲۱'), 'BC-4821');
  assert.equal(normalizeRoomCode('bc-hd7p'), 'BC-HD7P');

  // Parse clean hash invite links & legacy query links
  const parsedHash = parseRoomInviteFromUrl('', '#room=k7m9p2x4');
  assert.equal(parsedHash.roomCode, 'K7M9P2X4');
  assert.equal(parsedHash.source, 'hash');

  const parsedLegacy = parseRoomInviteFromUrl('?room=bc-hd7p&map=docks', '');
  assert.equal(parsedLegacy.roomCode, 'BC-HD7P');
  assert.equal(parsedLegacy.mapId, 'docks');
  assert.equal(parsedLegacy.source, 'query');

  // Hash takes precedence if both exist
  const parsedBoth = parseRoomInviteFromUrl('?room=BC-1111', '#room=K7M9P2X4');
  assert.equal(parsedBoth.roomCode, 'K7M9P2X4');
  assert.equal(parsedBoth.source, 'hash');

  // Lobby Ready gating: bots auto-ready, disconnected don't block, waiting human blocks Start
  const readyWait = areAllLobbyPlayersReady({
    players: [
      { id: 'h1', name: 'Host', lobbyReady: true } as any,
      { id: 'c1', name: 'Ali', lobbyReady: false } as any,
      { id: 'b1', name: 'Bot', isBot: true, lobbyReady: false } as any,
      { id: 'd1', name: 'Drop', disconnected: true, lobbyReady: false } as any,
    ],
  });
  assert.equal(readyWait.allReady, false);
  assert.equal(readyWait.readyCount, 1);
  assert.equal(readyWait.totalCount, 2);
  assert.deepEqual(readyWait.waitingNames, ['Ali']);

  const readyAll = areAllLobbyPlayersReady({
    players: [
      { id: 'h1', name: 'Host', lobbyReady: true } as any,
      { id: 'c1', name: 'Ali', lobbyReady: true } as any,
      { id: 'b1', name: 'Bot', isBot: true, lobbyReady: false } as any,
    ],
  });
  assert.equal(readyAll.allReady, true);
  assert.equal(readyAll.readyCount, 2);
  assert.equal(readyAll.totalCount, 2);
});

test('Local zero-dependency QR generator encodes clean #room=CODE invite URLs into valid SVG paths', () => {
  const inviteUrl = 'https://parsa.github.io/bodycam-vanguard/#room=K7M9P2X4';
  const qr = generateQrMatrix(inviteUrl);
  assert.ok(qr.size >= 21 && qr.size % 4 === 1, 'QR matrix dimension must be 4*V+17');
  assert.equal(qr.modules.length, qr.size);
  assert.equal(qr.modules[0].length, qr.size);
  // Top-left 7x7 finder pattern outer border must be dark
  for (let i = 0; i < 7; i++) {
    assert.equal(qr.modules[0][i], true);
    assert.equal(qr.modules[6][i], true);
    assert.equal(qr.modules[i][0], true);
    assert.equal(qr.modules[i][6], true);
  }
  // Center 3x3 of top-left finder must be dark
  assert.equal(qr.modules[3][3], true);

  const svg = renderQrSvgPath(inviteUrl, 2);
  assert.equal(svg.size, qr.size + 4);
  assert.equal(svg.viewBox, `0 0 ${svg.size} ${svg.size}`);
  assert.ok(svg.pathD.length > 200, 'SVG path should contain encoded QR modules');
});

test('Room invite URLs always derive dynamically from window.location (origin + pathname) across any static host', () => {
  // 1) GitHub Pages subpath
  const ghBase = getCurrentOriginShareBaseUrl('https://player1.github.io', '/bodycam-vanguard/');
  assert.equal(ghBase, 'https://player1.github.io/bodycam-vanguard/');
  assert.equal(buildRoomInviteUrl(ghBase, 'K7M9P2X4'), 'https://player1.github.io/bodycam-vanguard/#room=K7M9P2X4');

  // 2) Netlify root domain
  const netlifyBase = getCurrentOriginShareBaseUrl('https://bodycam-vanguard.netlify.app', '/');
  assert.equal(netlifyBase, 'https://bodycam-vanguard.netlify.app/');
  assert.equal(buildRoomInviteUrl(netlifyBase, 'K7M9P2X4'), 'https://bodycam-vanguard.netlify.app/#room=K7M9P2X4');

  // 3) Cloudflare Pages root domain
  const cfBase = getCurrentOriginShareBaseUrl('https://bodycam-vanguard.pages.dev', '/');
  assert.equal(cfBase, 'https://bodycam-vanguard.pages.dev/');
  assert.equal(buildRoomInviteUrl(cfBase, 'K7M9P2X4'), 'https://bodycam-vanguard.pages.dev/#room=K7M9P2X4');

  // 4) Custom subpath without trailing slash or with index.html
  const subNoSlash = getCurrentOriginShareBaseUrl('https://games.example.org', '/fps');
  assert.equal(subNoSlash, 'https://games.example.org/fps');
  assert.equal(buildRoomInviteUrl(subNoSlash, 'K7M9P2X4'), 'https://games.example.org/fps/#room=K7M9P2X4');

  const subIndex = getCurrentOriginShareBaseUrl('https://games.example.org', '/fps/index.html');
  assert.equal(subIndex, 'https://games.example.org/fps/index.html');
  assert.equal(buildRoomInviteUrl(subIndex, 'K7M9P2X4'), 'https://games.example.org/fps/index.html#room=K7M9P2X4');
});

test('Lucky Spin catalog enforces Inferno Reaper as sole weapon skin and exact 65/25/8/2 rarity odds', () => {
  const weaponSkins = COSMETIC_ITEMS.filter((it) => it.category === 'ak47_skin');
  assert.equal(weaponSkins.length, 1);
  assert.equal(weaponSkins[0].id, LEGENDARY_AK47_ID);
  assert.equal(weaponSkins[0].nameEn, 'Inferno Reaper');
  assert.equal(weaponSkins[0].rarity, 'legendary');

  const akBannerItems = getSpinBannerItems('ak47_inferno');
  const akLegendaries = akBannerItems.filter((it) => it.rarity === 'legendary');
  assert.equal(akLegendaries.length, 1);
  assert.equal(akLegendaries[0].id, LEGENDARY_AK47_ID);

  // Rarity probabilities must sum strictly to 100% (2% + 8% + 25% + 65%)
  const totalPct =
    RARITY_META.legendary.chancePct +
    RARITY_META.epic.chancePct +
    RARITY_META.rare.chancePct +
    RARITY_META.common.chancePct;
  assert.equal(totalPct, 100);
  assert.equal(selectRarityFromUnit(0.0), 'legendary');
  assert.equal(selectRarityFromUnit(0.0199), 'legendary');
  assert.equal(selectRarityFromUnit(0.02), 'epic');
  assert.equal(selectRarityFromUnit(0.0999), 'epic');
  assert.equal(selectRarityFromUnit(0.1), 'rare');
  assert.equal(selectRarityFromUnit(0.3499), 'rare');
  assert.equal(selectRarityFromUnit(0.35), 'common');
  assert.equal(selectRarityFromUnit(0.9999), 'common');

  // Cryptographic RNG returns valid [0, 1) values
  for (let i = 0; i < 25; i++) {
    const u = secureRandomUnit();
    assert.ok(u >= 0 && u < 1, `secureRandomUnit out of bounds: ${u}`);
  }
});

test('Lucky Spin pity guarantees Legendary after 20 non-Legendary spins and duplicates convert 5 shards into +1 free spin', () => {
  let state = createInitialCosmeticsState('2026-05-10');
  assert.equal(state.spins, INITIAL_FREE_SPINS);
  assert.equal(state.spins, 5);
  assert.equal(state.pityCounter, 0);

  // Give plenty of spins to test deterministic non-legendary -> pity -> shard loop
  state = { ...state, spins: 30 };

  // Deterministic Uint32Array RNG: alternates ~0.9 (common) and 0.0 (first common item)
  let step = 0;
  const deterministicRng = (arr: Uint32Array): Uint32Array => {
    arr[0] = step++ % 2 === 0 ? Math.floor(0.9 * 0x100000000) : 0;
    return arr;
  };
  const commonHighRng = (arr: Uint32Array): Uint32Array => {
    arr[0] = Math.floor(0.99 * 0x100000000);
    return arr;
  };

  let sawShardSpinConversion = false;
  for (let i = 0; i < PITY_GUARANTEE_THRESHOLD; i++) {
    const outcome = executeLuckySpin(state, deterministicRng);
    assert.ok(outcome);
    assert.equal(outcome.item.rarity, 'common');
    assert.equal(outcome.wasPityGuaranteed, false);
    if (i === 0) {
      assert.equal(outcome.isDuplicate, false);
      assert.equal(outcome.shardsGained, 0);
    } else {
      assert.equal(outcome.isDuplicate, true);
      assert.equal(outcome.shardsGained, 1);
      if (outcome.bonusSpinsFromShards > 0) {
        sawShardSpinConversion = true;
      }
    }
    state = outcome.nextState;
  }

  assert.equal(sawShardSpinConversion, true, `Expected ${SHARDS_PER_FREE_SPIN} duplicate shards to award +1 free spin`);
  assert.equal(state.pityCounter, PITY_GUARANTEE_THRESHOLD);

  // 21st spin MUST be guaranteed Legendary Inferno Reaper even when RNG rolls 0.99 (common)
  const pityOutcome = executeLuckySpin(state, commonHighRng);
  assert.ok(pityOutcome);
  assert.equal(pityOutcome.wasPityGuaranteed, true);
  assert.equal(pityOutcome.item.id, LEGENDARY_AK47_ID);
  assert.equal(pityOutcome.nextState.pityCounter, 0);
  assert.ok(pityOutcome.nextState.ownedIds.includes(LEGENDARY_AK47_ID));

  // Reel strip places exact winner at target index
  const strip = buildSpinReelStrip(pityOutcome.item, 36, 29, commonHighRng);
  assert.equal(strip.length, 36);
  assert.equal(strip[29].id, LEGENDARY_AK47_ID);
});

test('Free spin earning covers daily spin (once/day), match wins (+1), and every 25 kills (+1)', () => {
  let state = createInitialCosmeticsState('2026-05-09');
  const day1 = '2026-05-10';
  const day2 = '2026-05-11';

  assert.equal(canClaimDailyFreeSpin(state, day1), true);
  const claim1 = claimDailyFreeSpin(state, day1);
  assert.equal(claim1.granted, true);
  assert.equal(claim1.state.spins, INITIAL_FREE_SPINS + 1);
  assert.equal(canClaimDailyFreeSpin(claim1.state, day1), false);

  // Same day repeat claim must be ignored
  const claimRepeat = claimDailyFreeSpin(claim1.state, day1);
  assert.equal(claimRepeat.granted, false);
  assert.equal(claimRepeat.state.spins, claim1.state.spins);

  // Next calendar day unlocks daily spin again
  assert.equal(canClaimDailyFreeSpin(claim1.state, day2), true);
  const claim2 = claimDailyFreeSpin(claim1.state, day2);
  assert.equal(claim2.granted, true);
  state = claim2.state;

  // Match win grants +1 spin
  const beforeWinSpins = state.spins;
  const winRes = awardMatchWinSpin(state);
  assert.equal(winRes.spinsGranted, 1);
  state = winRes.state;
  assert.equal(state.spins, beforeWinSpins + 1);

  // Every 25 kills grants +1 spin
  const k1 = recordKillsForSpinReward(state, KILLS_PER_FREE_SPIN - 1);
  assert.equal(k1.spinsGranted, 0);
  assert.equal(k1.state.killProgress, KILLS_PER_FREE_SPIN - 1);

  const k2 = recordKillsForSpinReward(k1.state, 1);
  assert.equal(k2.spinsGranted, 1);
  assert.equal(k2.state.killProgress, 0);
  assert.equal(k2.state.spins, state.spins + 1);
});

test('Persistence validator and online PeerJS cosmetic allowlist strictly reject unknown or forged IDs', () => {
  const validated = validateCosmeticsState({
    version: COSMETICS_STATE_VERSION,
    spins: 7,
    shards: 3,
    pityCounter: 14,
    totalSpins: 14,
    killProgress: 12,
    totalKillsTracked: 40,
    totalWinsTracked: 2,
    lastDailyClaimDate: '2026-05-10',
    ownedIds: [LEGENDARY_AK47_ID, 'tracer_cyan', 'forged_hacked_item', 123],
    equipped: {
      ak47_skin: LEGENDARY_AK47_ID,
      tracer_color: 'tracer_cyan',
      muzzle_flash: 'flash_violet', // NOT owned -> must be dropped!
      crosshair_color: 'tracer_cyan', // wrong category -> must be dropped!
      name_frame: 'unknown_frame_id', // unknown ID -> must be dropped!
      name_badge: null,
      kill_icon: null,
    },
  });

  assert.deepEqual(validated.ownedIds, [LEGENDARY_AK47_ID, 'tracer_cyan']);
  assert.equal(validated.equipped.ak47_skin, LEGENDARY_AK47_ID);
  assert.equal(validated.equipped.tracer_color, 'tracer_cyan');
  assert.equal(validated.equipped.muzzle_flash, null);
  assert.equal(validated.equipped.crosshair_color, null);
  assert.equal(validated.equipped.name_frame, null);

  // Equipping an unowned item is a no-op
  const afterBadEquip = equipCosmeticItem(validated, 'muzzle_flash', 'flash_violet');
  assert.equal(afterBadEquip.equipped.muzzle_flash, null);

  // Online allowlist sanitizer drops forged/mismatched IDs and keeps valid ones
  const onlinePayload = sanitizeOnlineCosmetics({
    ak: LEGENDARY_AK47_ID,
    tr: 'forged_rainbow_tracer',
    mf: 'flash_violet',
    nf: 'frame_obsidian_gold',
    nb: 'badge_crown',
    ki: 'ak_inferno_reaper', // wrong category for kill_icon!
  });
  assert.deepEqual(onlinePayload, {
    ak: LEGENDARY_AK47_ID,
    mf: 'flash_violet',
    nf: 'frame_obsidian_gold',
    nb: 'badge_crown',
  });

  // Inferno Reaper overrides AK-47 tracer/muzzle to orange-gold and triggers kill effect only on AK-47
  const synced = toOnlineSyncedCosmetics(validated.equipped);
  assert.equal(isInfernoReaperKill('ak47', synced), true);
  assert.equal(isInfernoReaperKill('m4a1', synced), false);
  assert.equal(resolveEffectiveTracerColorInt('ak47', synced), 0xff8c1a);
  assert.equal(resolveEffectiveTracerColorInt('m4a1', synced), 0x22d3ee);
  assert.equal(resolveEffectiveMuzzleFlashColorInt('ak47', synced), 0xff9224);
  assert.equal(getCosmeticItem('ch_gold')?.colorHex, '#fbbf24');

  // Host state merge sanitizes incoming client cosmetics strictly against allowlist
  const t0 = 1_700_000_000_000;
  const hostRoom: AuthoritativeRoomState = {
    code: 'BC-COSM',
    name: 'اتاق تست کازمتیک',
    mapId: 'warehouse',
    mode: 'tdm_1v1',
    hostId: 'h1',
    hostName: 'HOST',
    wave: 1,
    teamScore: 0,
    playerCount: 2,
    alphaScore: 0,
    bravoScore: 0,
    currentRound: 1,
    roundTimeRemainingSec: 90,
    roundPhase: 'playing',
    roundWinnerTeam: null,
    matchWinnerTeam: null,
    targetWinRounds: 6,
    players: [
      {
        id: 'h1',
        name: 'HOST',
        team: 'alpha',
        alive: true,
        x: 0,
        y: 0,
        z: 10,
        yaw: 0,
        pitch: 0,
        weaponIdx: 0,
        hp: 100,
        maxHp: 100,
        kills: 0,
        score: 0,
        color: '#38bdf8',
        isHost: true,
        lastSeen: t0,
      },
      {
        id: 'c1',
        name: 'CLIENT',
        team: 'bravo',
        alive: true,
        x: 0,
        y: 0,
        z: -10,
        yaw: 0,
        pitch: 0,
        weaponIdx: 0,
        hp: 100,
        maxHp: 100,
        kills: 0,
        score: 0,
        color: '#f43f5e',
        isHost: false,
        lastSeen: t0,
      },
    ],
  };

  const merged = mergeClientInputIntoHostState(
    hostRoom,
    {
      id: 'c1',
      x: 1,
      y: 0,
      z: -9,
      yaw: 0.2,
      pitch: 0,
      weaponIdx: 0,
      cosmetics: {
        ak: LEGENDARY_AK47_ID,
        tr: 'HACKED_ID',
        nf: 'frame_obsidian_gold',
      },
    },
    t0 + 100
  );
  const c1After = merged.players.find((p) => p.id === 'c1')!;
  assert.deepEqual(c1After.cosmetics, {
    ak: LEGENDARY_AK47_ID,
    nf: 'frame_obsidian_gold',
  });
});

test('Redeem Code normalization unifies spaces, invisible chars, Persian/Arabic digits, Arabic Ya/Kaf, and English case identically on client & server', () => {
  const sampleA = '  AbC\u200B\u200C-\uFEFF۱۲۳٤٥٦-كيى  ';
  const sampleB = 'abc-123456-کیی';
  assert.equal(normalizeRedeemCode(sampleA), sampleB);
  assert.equal(netlifyNormalizeRedeemInput(sampleA), sampleB);
  assert.equal(normalizeRedeemCode('   \u200B\u200E  '), '');
  assert.equal(netlifyNormalizeRedeemInput('   \u200B\u200E  '), '');
});

test('Redeem Code ownership unlock & 5-attempt 1-minute lockout state machine work cleanly without storing any code', () => {
  // Ownership unlock via allowlisted helper
  const init = createInitialCosmeticsState('2026-11-22');
  assert.equal(init.ownedIds.includes(LEGENDARY_AK47_ID), false);

  const unlocked = unlockCosmeticItem(init, LEGENDARY_AK47_ID);
  assert.equal(unlocked.unlocked, true);
  assert.equal(unlocked.alreadyOwned, false);
  assert.equal(unlocked.state.ownedIds.includes(LEGENDARY_AK47_ID), true);

  // Already owned returns alreadyOwned: true without duplicating ID
  const repeat = unlockCosmeticItem(unlocked.state, LEGENDARY_AK47_ID);
  assert.equal(repeat.unlocked, false);
  assert.equal(repeat.alreadyOwned, true);
  assert.equal(repeat.state.ownedIds.filter((id) => id === LEGENDARY_AK47_ID).length, 1);

  // Unknown cosmetic ID is silently ignored
  const badId = unlockCosmeticItem(init, 'unknown_skin_id');
  assert.equal(badId.unlocked, false);
  assert.equal(badId.state.ownedIds.length, 0);

  // 5-attempt 1-minute lockout state machine
  assert.equal(REDEEM_MAX_FAILED_ATTEMPTS, 5);
  assert.equal(REDEEM_LOCKOUT_DURATION_MS, 60_000);
  const t0 = 1_760_000_000_000;
  let guard = createInitialRedeemLockoutState();
  for (let i = 1; i <= 4; i++) {
    const step = recordRedeemFailure(guard, t0 + i * 100);
    guard = step.nextState;
    assert.equal(step.lockedNow, false);
    assert.equal(step.attemptsRemaining, 5 - i);
    assert.equal(getRedeemLockoutRemainingMs(guard, t0 + i * 100), 0);
  }
  const fifth = recordRedeemFailure(guard, t0 + 1000);
  guard = fifth.nextState;
  assert.equal(fifth.lockedNow, true);
  assert.equal(fifth.attemptsRemaining, 0);
  assert.equal(getRedeemLockoutRemainingMs(guard, t0 + 1000), 60_000);
  assert.equal(getRedeemLockoutRemainingMs(guard, t0 + 31_000), 30_000);
  assert.equal(getRedeemLockoutRemainingMs(guard, t0 + 61_001), 0);

  // Validating expired lockout resets failedAttempts cleanly
  const afterExpiry = validateRedeemLockoutState(guard, t0 + 65_000);
  assert.equal(afterExpiry.failedAttempts, 0);
  assert.equal(afterExpiry.lockedUntilMs, 0);
});

test('Netlify Function redeem enforces POST-only, strict site-only CORS, constant-time normalized env matching, failure delay, and {ok} only', async () => {
  const prevCode = process.env.REDEEM_CODE_LEGENDARY_AK47;
  const prevUrl = process.env.URL;

  try {
    process.env.URL = 'https://game.example.netlify.app';
    // Ephemeral runtime-only test value (never a real secret or default)
    const runtimeToken = `کد-تست-${Date.now().toString(36)}-XY۹۰`;
    process.env.REDEEM_CODE_LEGENDARY_AK47 = runtimeToken;

    // 1. Rejects non-POST methods
    const getRes = await netlifyRedeemHandler({
      httpMethod: 'GET',
      headers: { host: 'game.example.netlify.app', origin: 'https://game.example.netlify.app' },
      body: '',
    });
    assert.equal(getRes.statusCode, 405);
    assert.equal(getRes.body, '{"ok":false}');

    // 2. Rejects foreign CORS origins with 403 and no Access-Control-Allow-Origin
    const foreignRes = await netlifyRedeemHandler({
      httpMethod: 'POST',
      headers: { host: 'game.example.netlify.app', origin: 'https://evil.example.com' },
      body: JSON.stringify({ code: runtimeToken }),
    });
    assert.equal(foreignRes.statusCode, 403);
    assert.equal((foreignRes.headers as Record<string, string | undefined>)['Access-Control-Allow-Origin'], undefined);
    assert.equal(foreignRes.body, '{"ok":false}');

    // 3. Accepts matching normalized input (spaces, invisible chars, Arabic Kaf/digits, lowercase) on same-site origin
    const variedInput = `  ${runtimeToken.replace('ک', 'ك').replace('۹', '٩').replace('XY', 'xy')}\u200B  `;
    const okRes = await netlifyRedeemHandler({
      httpMethod: 'POST',
      headers: { host: 'game.example.netlify.app', origin: 'https://game.example.netlify.app' },
      body: JSON.stringify({ code: variedInput }),
    });
    assert.equal(okRes.statusCode, 200);
    assert.equal(
      (okRes.headers as Record<string, string | undefined>)['Access-Control-Allow-Origin'],
      'https://game.example.netlify.app'
    );
    assert.deepEqual(JSON.parse(okRes.body), { ok: true, rewardId: LEGENDARY_AK47_ID });

    // 4. Rejects wrong code with short server-side delay and returns strictly {"ok":false}
    const tStart = Date.now();
    const badRes = await netlifyRedeemHandler({
      httpMethod: 'POST',
      headers: { host: 'game.example.netlify.app', origin: 'https://game.example.netlify.app' },
      body: JSON.stringify({ code: 'wrong-input-value' }),
    });
    const elapsed = Date.now() - tStart;
    assert.equal(badRes.statusCode, 200);
    assert.equal(badRes.body, '{"ok":false}');
    assert.ok(elapsed >= 350, `Expected failure delay >=350ms, got ${elapsed}ms`);

    // 5. Missing env var still rejects wrong codes cleanly without leaking details
    delete process.env.REDEEM_CODE_LEGENDARY_AK47;
    const missingEnvRes = await netlifyRedeemHandler({
      httpMethod: 'POST',
      headers: { host: 'game.example.netlify.app', origin: 'https://game.example.netlify.app' },
      body: JSON.stringify({ code: 'wrong-code-attempt' }),
    });
    assert.equal(missingEnvRes.statusCode, 200);
    assert.equal(missingEnvRes.body, '{"ok":false}');
  } finally {
    if (prevCode === undefined) delete process.env.REDEEM_CODE_LEGENDARY_AK47;
    else process.env.REDEEM_CODE_LEGENDARY_AK47 = prevCode;
    if (prevUrl === undefined) delete process.env.URL;
    else process.env.URL = prevUrl;
  }
});

test('Sniper Spin config (0.5% Legendary Void Piercer), shared tokens/shards, independent banner pity, and OnlineSyncedCosmetics.sn allowlist work correctly', () => {
  assert.equal(SPIN_BANNERS.length, 4);
  const sniperBanner = getSpinBannerConfig('sniper_void');
  assert.equal(sniperBanner.featuredItemId, LEGENDARY_SNIPER_ID);
  assert.equal(sniperBanner.rarityWeightsPct.legendary, 0.5);
  assert.equal(sniperBanner.rarityWeightsPct.epic, 7.5);
  assert.equal(sniperBanner.rarityWeightsPct.rare, 27);
  assert.equal(sniperBanner.rarityWeightsPct.common, 65);
  const totalWeight =
    sniperBanner.rarityWeightsPct.legendary +
    sniperBanner.rarityWeightsPct.epic +
    sniperBanner.rarityWeightsPct.rare +
    sniperBanner.rarityWeightsPct.common;
  assert.equal(totalWeight, 100);

  // Verify 0.5% boundary (0.0049 -> legendary, 0.0051 -> epic)
  assert.equal(selectRarityFromWeights(0.0049, sniperBanner.rarityWeightsPct), 'legendary');
  assert.equal(selectRarityFromWeights(0.0051, sniperBanner.rarityWeightsPct), 'epic');
  assert.equal(selectRarityFromWeights(0.081, sniperBanner.rarityWeightsPct), 'rare');
  assert.equal(selectRarityFromWeights(0.36, sniperBanner.rarityWeightsPct), 'common');

  // Verify Sniper pool contains Void Piercer as sole sniper_skin and 14 total items
  const sniperPool = getSpinBannerItems('sniper_void');
  assert.equal(sniperPool.length, 14);
  assert.equal(
    sniperPool.filter((i) => i.rarity === 'legendary').map((i) => i.id).join(','),
    LEGENDARY_SNIPER_ID
  );

  // Deterministic Uint32Array RNG stub returning fixed unit float
  const fixedRng = (u: number) => (arr: Uint32Array) => {
    arr[0] = Math.floor(u * 0x100000000) >>> 0;
    return arr;
  };

  // Shared spins & independent per-banner pity counters
  let state = createInitialCosmeticsState('2026-11-22');
  state = { ...state, spins: 25 };
  // Spin 3 times on AK-47 banner (non-legendary roll = 0.5 -> common)
  for (let i = 0; i < 3; i++) {
    const out = executeLuckySpin(state, fixedRng(0.5), 'ak47_inferno');
    assert.ok(out);
    state = out.nextState;
  }
  assert.equal(getBannerPityCounter(state, 'ak47_inferno'), 3);
  assert.equal(getBannerPityCounter(state, 'sniper_void'), 0);
  assert.equal(state.spins, 22);

  // Spin 20 non-legendary times on Sniper banner -> 21st guarantees Void Piercer
  state = { ...state, spins: 21 };
  for (let i = 0; i < 20; i++) {
    const out = executeLuckySpin(state, fixedRng(0.8), 'sniper_void');
    assert.ok(out);
    assert.notEqual(out.item.id, LEGENDARY_SNIPER_ID);
    state = out.nextState;
  }
  assert.equal(getBannerPityCounter(state, 'sniper_void'), 20);
  // AK-47 pity remained untouched
  assert.equal(getBannerPityCounter(state, 'ak47_inferno'), 3);

  const pityWin = executeLuckySpin(state, fixedRng(0.99), 'sniper_void');
  assert.ok(pityWin);
  assert.equal(pityWin.wasPityGuaranteed, true);
  assert.equal(pityWin.item.id, LEGENDARY_SNIPER_ID);
  assert.equal(getBannerPityCounter(pityWin.nextState, 'sniper_void'), 0);

  // OnlineSyncedCosmetics allowlists sn strictly and rejects injected/arbitrary IDs
  const cleanSynced = sanitizeOnlineCosmetics({
    sn: LEGENDARY_SNIPER_ID,
    ak: 'evil_injected_skin',
    scopeOverlay: 'hacked',
  });
  assert.deepEqual(cleanSynced, { sn: LEGENDARY_SNIPER_ID });
  assert.equal(sanitizeOnlineCosmetics({ sn: 'ak_inferno_reaper' }), undefined);

  // Void Piercer kill & weapon FX helpers
  assert.equal(isVoidPiercerKill('sniper', { sn: LEGENDARY_SNIPER_ID }), true);
  assert.equal(isVoidPiercerKill('ak47', { sn: LEGENDARY_SNIPER_ID }), false);
  assert.equal(resolveEffectiveTracerColorInt('sniper', { sn: LEGENDARY_SNIPER_ID }), 0x38e8ff);
  assert.equal(resolveEffectiveMuzzleFlashColorInt('sniper', { sn: LEGENDARY_SNIPER_ID }), 0x46f0ff);
});

test('Netlify Function redeem supports REDEEM_CODE_LEGENDARY_SNIPER -> awm_void_piercer independently with env override and zero plaintext secrets', async () => {
  const prevAk = process.env.REDEEM_CODE_LEGENDARY_AK47;
  const prevSniper = process.env.REDEEM_CODE_LEGENDARY_SNIPER;
  const prevUrl = process.env.URL;

  try {
    process.env.URL = 'https://game.example.netlify.app';
    assert.deepEqual(Array.from(ALLOWED_REDEEM_REWARD_IDS), [
      LEGENDARY_AK47_ID,
      LEGENDARY_SNIPER_ID,
      MYTHIC_M249_ID,
      MYTHIC_SHOTGUN_ID,
    ]);
    assert.equal(parseAllowedRedeemRewardId(LEGENDARY_SNIPER_ID), LEGENDARY_SNIPER_ID);
    assert.equal(parseAllowedRedeemRewardId('arbitrary_id'), null);

    // 1. When REDEEM_CODE_LEGENDARY_SNIPER is unset, invalid codes are rejected cleanly
    delete process.env.REDEEM_CODE_LEGENDARY_SNIPER;
    const unsetRes = await netlifyRedeemHandler({
      httpMethod: 'POST',
      headers: { host: 'game.example.netlify.app', origin: 'https://game.example.netlify.app' },
      body: JSON.stringify({ code: 'void-piercer-test-unset' }),
    });
    assert.equal(unsetRes.statusCode, 200);
    assert.equal(unsetRes.body, '{"ok":false}');

    // 2. When both env vars are configured, each code unlocks its exact allowlisted rewardId
    const akToken = `ak-test-${Date.now().toString(36)}`;
    const sniperToken = `اسنایپ-${Date.now().toString(36)}-۹۸`;
    process.env.REDEEM_CODE_LEGENDARY_AK47 = akToken;
    process.env.REDEEM_CODE_LEGENDARY_SNIPER = sniperToken;

    const sniperRes = await netlifyRedeemHandler({
      httpMethod: 'POST',
      headers: { host: 'game.example.netlify.app', origin: 'https://game.example.netlify.app' },
      body: JSON.stringify({ code: `  ${sniperToken.replace('۹', '٩').replace('۸', '٨')}  ` }),
    });
    assert.equal(sniperRes.statusCode, 200);
    assert.deepEqual(JSON.parse(sniperRes.body), { ok: true, rewardId: LEGENDARY_SNIPER_ID });

    const akRes = await netlifyRedeemHandler({
      httpMethod: 'POST',
      headers: { host: 'game.example.netlify.app', origin: 'https://game.example.netlify.app' },
      body: JSON.stringify({ code: akToken.toUpperCase() }),
    });
    assert.equal(akRes.statusCode, 200);
    assert.deepEqual(JSON.parse(akRes.body), { ok: true, rewardId: LEGENDARY_AK47_ID });
  } finally {
    if (prevAk === undefined) delete process.env.REDEEM_CODE_LEGENDARY_AK47;
    else process.env.REDEEM_CODE_LEGENDARY_AK47 = prevAk;
    if (prevSniper === undefined) delete process.env.REDEEM_CODE_LEGENDARY_SNIPER;
    else process.env.REDEEM_CODE_LEGENDARY_SNIPER = prevSniper;
    if (prevUrl === undefined) delete process.env.URL;
    else process.env.URL = prevUrl;
  }
});

test('Mythic tier ordering, Void Piercer preserved as Legendary (0.5%), and M249 Tempest Aegis 0.01% (1/10,000) pure-chance banner with NO pity', () => {
  // 1. Rarity hierarchy places mythic strictly above legendary
  assert.deepEqual(Object.keys(RARITY_META), ['mythic', 'legendary', 'epic', 'rare', 'common']);
  assert.equal(RARITY_META.mythic.labelFa, 'میتیک');
  assert.equal(RARITY_META.mythic.chancePct, 0.01);
  assert.equal(getCosmeticItem(LEGENDARY_SNIPER_ID)?.rarity, 'legendary');
  assert.equal(getCosmeticItem(LEGENDARY_AK47_ID)?.rarity, 'legendary');
  assert.equal(getCosmeticItem(MYTHIC_M249_ID)?.rarity, 'mythic');

  // 2. Third banner lmg_tempest is exactly 0.01% (1 in 10,000) with NO pity / NO guarantee
  const lmgBanner = getSpinBannerConfig('lmg_tempest');
  assert.equal(lmgBanner.featuredItemId, MYTHIC_M249_ID);
  assert.equal(lmgBanner.featuredRarity, 'mythic');
  assert.equal(lmgBanner.hasPity, false);
  assert.equal(lmgBanner.pityThreshold, 0);
  assert.equal(lmgBanner.rarityWeightsPct.mythic, 0.01);
  const weightSum =
    (lmgBanner.rarityWeightsPct.mythic ?? 0) +
    lmgBanner.rarityWeightsPct.legendary +
    lmgBanner.rarityWeightsPct.epic +
    lmgBanner.rarityWeightsPct.rare +
    lmgBanner.rarityWeightsPct.common;
  assert.equal(Math.round(weightSum * 100), 10_000);

  // Exact integer basis-point boundary: ONLY roll 0 out of [0..9999] is mythic (1 in 10,000 = 0.01%)
  assert.equal(selectRarityFromBasisPoints(0, lmgBanner.rarityWeightsPct), 'mythic');
  assert.equal(selectRarityFromBasisPoints(1, lmgBanner.rarityWeightsPct), 'epic');
  assert.equal(selectRarityFromBasisPoints(699, lmgBanner.rarityWeightsPct), 'epic');
  assert.equal(selectRarityFromBasisPoints(700, lmgBanner.rarityWeightsPct), 'rare');
  assert.equal(selectRarityFromBasisPoints(3499, lmgBanner.rarityWeightsPct), 'rare');
  assert.equal(selectRarityFromBasisPoints(3500, lmgBanner.rarityWeightsPct), 'common');
  assert.equal(selectRarityFromBasisPoints(9999, lmgBanner.rarityWeightsPct), 'common');

  // Unbiased secureRandomInt stays within [0, maxExclusive - 1]
  for (let i = 0; i < 40; i++) {
    const roll = secureRandomInt(10_000);
    assert.ok(Number.isInteger(roll) && roll >= 0 && roll < 10_000);
  }

  // Pool has exactly 14 items: 1 Mythic M249 + 13 purely cosmetic lower-tier items
  const lmgPool = getSpinBannerItems('lmg_tempest');
  assert.equal(lmgPool.length, 14);
  assert.deepEqual(
    lmgPool.filter((i) => i.rarity === 'mythic').map((i) => i.id),
    [MYTHIC_M249_ID]
  );

  // Spin 60 times with mid-range uint32 (bucket ~5000/10000 -> common) -> NEVER triggers pity guarantee on lmg_tempest
  const nonZeroRng = (arr: Uint32Array) => {
    arr[0] = 0x80000000;
    return arr;
  };
  let state = { ...createInitialCosmeticsState('2026-11-22'), spins: 65 };
  for (let i = 0; i < 60; i++) {
    const out = executeLuckySpin(state, nonZeroRng, 'lmg_tempest');
    assert.ok(out);
    assert.equal(out.wasPityGuaranteed, false);
    assert.notEqual(out.item.id, MYTHIC_M249_ID);
    state = out.nextState;
  }
  assert.equal(getBannerPityCounter(state, 'lmg_tempest'), 0);

  // Exact 0 roll out of 10,000 grants Mythic M249 Tempest Aegis
  const zeroRng = (arr: Uint32Array) => {
    arr[0] = 0;
    return arr;
  };
  const win = executeLuckySpin(state, zeroRng, 'lmg_tempest');
  assert.ok(win);
  assert.equal(win.item.id, MYTHIC_M249_ID);
  assert.equal(win.wasPityGuaranteed, false);
  assert.ok(win.nextState.ownedIds.includes(MYTHIC_M249_ID));

  // Rainbow helper returns valid 24-bit hex color & kill check only matches lmg + m249_tempest_aegis
  const rainbowHex = resolveTempestRainbowColorInt(1.25);
  assert.ok(rainbowHex >= 0 && rainbowHex <= 0xffffff);
  assert.equal(isTempestAegisKill('lmg', { m249: MYTHIC_M249_ID }), true);
  assert.equal(isTempestAegisKill('ak47', { m249: MYTHIC_M249_ID }), false);
  assert.equal(isTempestAegisKill('lmg', {}), false);

  // Online allowlist strictly allows m249_tempest_aegis and strips forged IDs
  assert.deepEqual(sanitizeOnlineCosmetics({ m249: MYTHIC_M249_ID }), { m249: MYTHIC_M249_ID });
  assert.equal(sanitizeOnlineCosmetics({ m249: 'forged_mythic_hack' }), undefined);
});

test('Mythic M249 small gameplay perks apply ONLY when equipped & holding M249, respect Host toggle, cap Aim Assist at 100%, and enforce emote allowlist', () => {
  assert.equal(MYTHIC_M249_PERKS.aimAssistBonusPct, 15);
  assert.equal(MYTHIC_M249_PERKS.aimAssistMaxCap, 100);
  assert.equal(MYTHIC_M249_PERKS.recoilKickReductionPct, 10);
  assert.ok(MYTHIC_PERK_SUMMARY_FA.length >= 3);
  assert.equal(MYTHIC_M249_PERKS.emoteDurationSec, 3.0);
  assert.equal(MYTHIC_M249_PERKS.emoteCooldownSec, 5.0);

  // Perks active ONLY on 'lmg' with m249_tempest_aegis equipped and room allows it
  assert.equal(
    isMythicM249PerksActive({
      weaponId: 'lmg',
      equippedM249SkinId: MYTHIC_M249_ID,
      isOnline: true,
      roomMythicPerksAllowed: true,
    }),
    true
  );
  assert.equal(
    isMythicM249PerksActive({
      weaponId: 'lmg',
      equippedM249SkinId: null,
      isOnline: true,
      roomMythicPerksAllowed: true,
    }),
    false
  );
  assert.equal(
    isMythicM249PerksActive({
      weaponId: 'ak47',
      equippedM249SkinId: MYTHIC_M249_ID,
      isOnline: true,
      roomMythicPerksAllowed: true,
    }),
    false
  );
  assert.equal(
    isMythicM249PerksActive({
      weaponId: 'lmg',
      equippedM249SkinId: MYTHIC_M249_ID,
      isOnline: true,
      roomMythicPerksAllowed: false,
    }),
    false
  );
  // Offline always allows Mythic perks when equipped on M249
  assert.equal(
    isMythicM249PerksActive({
      weaponId: 'lmg',
      equippedM249SkinId: MYTHIC_M249_ID,
      isOnline: false,
      roomMythicPerksAllowed: false,
    }),
    true
  );

  // Aim Assist +15% capped at 100%, and strictly 0 if player set 0% or Host disabled Aim Assist
  assert.equal(
    computeEffectiveAimAssistWithMythicPerk({
      baseAimAssistStrength: 50,
      roomAimAssistAllowed: true,
      mythicPerksActive: true,
    }),
    58
  );
  assert.equal(
    computeEffectiveAimAssistWithMythicPerk({
      baseAimAssistStrength: 95,
      roomAimAssistAllowed: true,
      mythicPerksActive: true,
    }),
    100
  );
  assert.equal(
    computeEffectiveAimAssistWithMythicPerk({
      baseAimAssistStrength: 0,
      roomAimAssistAllowed: true,
      mythicPerksActive: true,
    }),
    0
  );
  assert.equal(
    computeEffectiveAimAssistWithMythicPerk({
      baseAimAssistStrength: 60,
      roomAimAssistAllowed: false,
      mythicPerksActive: true,
    }),
    0
  );
  assert.equal(
    computeEffectiveAimAssistWithMythicPerk({
      baseAimAssistStrength: 60,
      roomAimAssistAllowed: true,
      mythicPerksActive: false,
    }),
    60
  );

  // Camera recoil multiplier (-10% => 0.90) & smoother ADS multipliers
  assert.ok(Math.abs(getMythicCameraRecoilMultiplier(true) - 0.9) < 1e-9);
  assert.equal(getMythicCameraRecoilMultiplier(false), 1.0);
  assert.ok(getMythicAdsSwayMultiplier(true) < getMythicAdsSwayMultiplier(false));
  assert.ok(getMythicAdsSmoothMultiplier(true) > getMythicAdsSmoothMultiplier(false));

  // Emote allowlist rejects arbitrary IDs
  assert.ok(ALLOWED_EMOTE_IDS.has(MYTHIC_M249_EMOTE_ID));
  assert.equal(sanitizeEmoteId(MYTHIC_M249_EMOTE_ID), MYTHIC_M249_EMOTE_ID);
  assert.equal(sanitizeEmoteId('hacked_emote'), null);
  assert.equal(sanitizeEmoteId(null), null);

  // Lobby mythic holder transparency helper
  const holders = getLobbyMythicHolderNames([
    { name: 'PARSA', cosmetics: { m249: MYTHIC_M249_ID } },
    { name: 'ALI', cosmetics: {} },
  ]);
  assert.deepEqual(holders, ['PARSA']);
});

test('Netlify Function redeem supports REDEEM_CODE_MYTHIC_M249 -> m249_tempest_aegis with env override and rejects invalid codes', async () => {
  const prevMythic = process.env.REDEEM_CODE_MYTHIC_M249;
  const prevUrl = process.env.URL;

  try {
    process.env.URL = 'https://game.example.netlify.app';

    // 1. When REDEEM_CODE_MYTHIC_M249 is unset, invalid codes are cleanly rejected
    delete process.env.REDEEM_CODE_MYTHIC_M249;
    const unsetRes = await netlifyRedeemHandler({
      httpMethod: 'POST',
      headers: { host: 'game.example.netlify.app', origin: 'https://game.example.netlify.app' },
      body: JSON.stringify({ code: 'any-random-attempt-when-unset' }),
    });
    assert.equal(unsetRes.statusCode, 200);
    assert.equal(unsetRes.body, '{"ok":false}');

    // 2. When REDEEM_CODE_MYTHIC_M249 is set at runtime, normalized matching overrides fallback and returns { ok: true, rewardId: 'm249_tempest_aegis' }
    const ephemeralMythicToken = `میتیک-${Date.now().toString(36)}-۹۱`;
    process.env.REDEEM_CODE_MYTHIC_M249 = ephemeralMythicToken;
    const okRes = await netlifyRedeemHandler({
      httpMethod: 'POST',
      headers: { host: 'game.example.netlify.app', origin: 'https://game.example.netlify.app' },
      body: JSON.stringify({
        code: `  ${ephemeralMythicToken.replace('۹', '٩').replace('۱', '١').replace('ک', 'ك')}  `,
      }),
    });
    assert.equal(okRes.statusCode, 200);
    assert.deepEqual(JSON.parse(okRes.body), { ok: true, rewardId: MYTHIC_M249_ID });
  } finally {
    if (prevMythic === undefined) delete process.env.REDEEM_CODE_MYTHIC_M249;
    else process.env.REDEEM_CODE_MYTHIC_M249 = prevMythic;
    if (prevUrl === undefined) delete process.env.URL;
    else process.env.URL = prevUrl;
  }
});

test('UI v2 store defaults to legacy, validates corrupt/versioned schemas, and handles storage safely', () => {
  assert.equal(DEFAULT_UI_V2_PREFERENCES.uiVersion, 'legacy');
  assert.equal(DEFAULT_UI_V2_PREFERENCES.version, UI_VERSION_SCHEMA_VERSION);

  // Corrupt / arbitrary payloads gracefully fall back to legacy defaults
  assert.deepEqual(validateUiV2Preferences(null), DEFAULT_UI_V2_PREFERENCES);
  assert.deepEqual(validateUiV2Preferences('corrupt'), DEFAULT_UI_V2_PREFERENCES);
  assert.deepEqual(validateUiV2Preferences({ uiVersion: 'v99', uiClickSound: 'yes' }), {
    version: UI_VERSION_SCHEMA_VERSION,
    uiVersion: 'legacy',
    uiClickSound: true,
    uiHaptics: true,
  });

  // Valid v2 payload persists cleanly
  assert.deepEqual(
    validateUiV2Preferences({ version: 1, uiVersion: 'v2', uiClickSound: false, uiHaptics: true }),
    { version: UI_VERSION_SCHEMA_VERSION, uiVersion: 'v2', uiClickSound: false, uiHaptics: true }
  );

  // Mock browser localStorage to verify round-trip + corrupt JSON recovery + throwing storage safety
  const store = new Map<string, string>();
  const prevWindow = (globalThis as Record<string, unknown>).window;
  try {
    (globalThis as Record<string, unknown>).window = {
      localStorage: {
        getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
        removeItem: (k: string) => {
          store.delete(k);
        },
      },
    };

    assert.equal(loadUiV2Preferences().uiVersion, 'legacy');
    saveUiV2Preferences({ version: 1, uiVersion: 'v2', uiClickSound: false, uiHaptics: false });
    const loaded = loadUiV2Preferences();
    assert.equal(loaded.uiVersion, 'v2');
    assert.equal(loaded.uiClickSound, false);
    assert.equal(loaded.uiHaptics, false);

    // Corrupt JSON never throws
    store.set(UI_VERSION_STORAGE_KEY, '{bad-json');
    assert.equal(loadUiV2Preferences().uiVersion, 'legacy');
  } finally {
    if (prevWindow === undefined) delete (globalThis as Record<string, unknown>).window;
    else (globalThis as Record<string, unknown>).window = prevWindow;
  }
});

test('UI v2 switch applies immediately in menus and defers mid-match with Persian notice', () => {
  const menuSwitch = resolveUiSwitchTransition('legacy', 'v2', 'title');
  assert.equal(menuSwitch.nextActiveUi, 'v2');
  assert.equal(menuSwitch.nextPreferredUi, 'v2');
  assert.equal(menuSwitch.deferred, false);
  assert.equal(menuSwitch.noticeFa, null);

  for (const matchState of ['playing', 'paused', 'gameover'] as const) {
    const midMatch = resolveUiSwitchTransition('v2', 'legacy', matchState);
    assert.equal(midMatch.nextActiveUi, 'v2', `Active UI must stay v2 during ${matchState}`);
    assert.equal(midMatch.nextPreferredUi, 'legacy', `Preferred UI saved for exit during ${matchState}`);
    assert.equal(midMatch.deferred, true);
    assert.equal(midMatch.noticeFa, UI_V2_PENDING_SWITCH_MSG_FA);

    // Selecting the already-active UI mid-match cancels pending notice
    const cancel = resolveUiSwitchTransition('v2', 'v2', matchState);
    assert.equal(cancel.deferred, false);
    assert.equal(cancel.noticeFa, null);
  }
});

test('UI v2 touch control layout uses an independent storage key and never modifies Legacy touch layout', () => {
  assert.notEqual(UI_V2_CONTROL_LAYOUT_STORAGE_KEY, CONTROL_LAYOUT_STORAGE_KEY);

  const store = new Map<string, string>();
  const prevWindow = (globalThis as Record<string, unknown>).window;
  try {
    (globalThis as Record<string, unknown>).window = {
      localStorage: {
        getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
        removeItem: (k: string) => {
          store.delete(k);
        },
      },
    };

    const legacyCustom = getDefaultControlLayout('standard');
    legacyCustom.fire = { ...legacyCustom.fire, xPct: 81, yPct: 62, scale: 1.25 };
    saveControlLayout(legacyCustom);

    const v2Custom = getDefaultControlLayout('standard');
    v2Custom.fire = { ...v2Custom.fire, xPct: 72, yPct: 75, scale: 0.9 };
    saveV2ControlLayout(v2Custom);

    const reloadedLegacy = loadSavedControlLayout('standard');
    const reloadedV2 = loadV2ControlLayout('standard');
    assert.equal(reloadedLegacy.fire.xPct, 81);
    assert.equal(reloadedLegacy.fire.scale, 1.25);
    assert.equal(reloadedV2.fire.xPct, 72);
    assert.equal(reloadedV2.fire.scale, 0.9);

    // Resetting UI v2 layout must leave Legacy layout completely intact
    resetV2ControlLayoutStorage();
    assert.equal(loadSavedControlLayout('standard').fire.xPct, 81);
    assert.equal(loadV2ControlLayout('standard').fire.xPct, getDefaultControlLayout('standard').fire.xPct);
  } finally {
    if (prevWindow === undefined) delete (globalThis as Record<string, unknown>).window;
    else (globalThis as Record<string, unknown>).window = prevWindow;
  }
});

test('UI v2 quick graphics presets map cleanly between auto/low/med/high and engine presets', () => {
  assert.deepEqual(resolveQuickGraphicsPreset('auto'), { preset: 'high', autoQuality: true });
  assert.deepEqual(resolveQuickGraphicsPreset('low'), { preset: 'low', autoQuality: false });
  assert.deepEqual(resolveQuickGraphicsPreset('med'), { preset: 'med', autoQuality: false });
  assert.deepEqual(resolveQuickGraphicsPreset('high'), { preset: 'high', autoQuality: false });

  assert.equal(getActiveQuickGraphicsTier('med', true), 'auto');
  assert.equal(getActiveQuickGraphicsTier('low', false), 'low');
  assert.equal(getActiveQuickGraphicsTier('potato', false), 'low');
  assert.equal(getActiveQuickGraphicsTier('med', false), 'med');
  assert.equal(getActiveQuickGraphicsTier('high', false), 'high');
  assert.equal(getActiveQuickGraphicsTier('ultra', false), 'high');
});

test('OG config turns post-launch features OFF, keeps uncertain features ON by default, forces Legacy UI, and supports optional countdown', () => {
  assert.equal(OG_CONFIG_VERSION, 1);
  assert.equal(OG_EVENT_CONFIG.enabled, true);
  assert.equal(OG_EVENT_CONFIG.subtitleFa, 'برگرد به شروع');
  assert.equal(OG_EVENT_CONFIG.badgeFa, 'ایونت');
  assert.equal(OG_EVENT_CONFIG.eventEndIso, null, 'Default OG event must have no time limit');

  // Post-launch features must be OFF in OG
  assert.equal(OG_FEATURE_FLAGS.uiV2, false);
  assert.equal(OG_FEATURE_FLAGS.spinSystem, false);
  assert.equal(OG_FEATURE_FLAGS.skinsAndCollection, false);
  assert.equal(OG_FEATURE_FLAGS.redeemCodes, false);
  assert.equal(OG_FEATURE_FLAGS.softAimAssist, false);
  assert.equal(OG_FEATURE_FLAGS.tacticalSlide, false);
  assert.equal(OG_FEATURE_FLAGS.teamRoundMode, false);
  assert.equal(OG_FEATURE_FLAGS.voiceChat, false);
  assert.equal(OG_FEATURE_FLAGS.killFeed, false);
  assert.equal(OG_FEATURE_FLAGS.roundCountdown, false);
  assert.equal(OG_FEATURE_FLAGS.spawnProtection, false);
  assert.equal(OG_FEATURE_FLAGS.teammateSpectate, false);
  assert.equal(OG_FEATURE_FLAGS.adBillboards, false);
  assert.equal(OG_FEATURE_FLAGS.newAnimationsAndFx, false);
  assert.equal(OG_FEATURE_FLAGS.pingHudAndAdvancedLobby, false);
  assert.equal(OG_FEATURE_FLAGS.duel1v1Map, false);

  // Uncertain early features default to ON for user decision
  for (const key of OG_UNCERTAIN_FLAG_KEYS) {
    assert.equal(OG_FEATURE_FLAGS[key], true, `Uncertain OG flag "${key}" must default to ON`);
  }

  // Normal mode has every feature enabled; OG mode always forces uiV2=false even if overridden
  const normalEffective = resolveEffectiveFeatures(false);
  assert.equal(normalEffective.uiV2, true);
  assert.equal(normalEffective.spinSystem, true);
  assert.equal(normalEffective.skinsAndCollection, true);
  assert.equal(normalEffective.teamRoundMode, true);
  assert.equal(normalEffective.duel1v1Map, true);

  const ogForcedLegacy = resolveEffectiveFeatures(true, { ...OG_FEATURE_FLAGS, uiV2: true });
  assert.equal(ogForcedLegacy.uiV2, false, 'OG mode must always force Legacy UI');

  // Maps & Weapons filtering
  const ogMaps = getOgAllowedMaps(true);
  assert.deepEqual(
    ogMaps.map((m) => m.id),
    [...OG_CLASSIC_MAPS],
    'OG mode excludes post-launch duel map and keeps classic maps'
  );
  assert.ok(getOgAllowedMaps(false).some((m) => m.id === 'duel'), 'Normal mode retains duel map');

  const strictBaseWeapons = getOgAllowedWeapons(true, { ...OG_FEATURE_FLAGS, expandedWeapons: false });
  assert.deepEqual(
    strictBaseWeapons.map((w) => w.id),
    [...OG_BASE_WEAPONS]
  );

  // Optional countdown formatting
  assert.equal(formatOgCountdownFa(null, 1_700_000_000_000), null);
  assert.equal(formatOgCountdownFa('invalid-date', 1_700_000_000_000), null);
  const future = formatOgCountdownFa('2026-12-05T12:30:45Z', Date.parse('2026-12-03T10:00:00Z'));
  assert.ok(future);
  assert.equal(future.active, true);
  assert.equal(future.expired, false);
  assert.equal(future.days, 2);
  assert.equal(future.hours, 2);
  assert.equal(future.minutes, 30);
  assert.equal(future.seconds, 45);
  assert.equal(future.labelFa, '2 روز و 02:30:45');

  const expired = formatOgCountdownFa('2026-12-01T00:00:00Z', Date.parse('2026-12-03T00:00:00Z'));
  assert.ok(expired);
  assert.equal(expired.active, false);
  assert.equal(expired.expired, true);
  assert.equal(expired.labelFa, 'پایان ایونت');
});

test('OG store persists versioned state under isolated key bodycam_og_state_v1 and recovers from corrupt storage', () => {
  assert.equal(OG_STORAGE_KEY, 'bodycam_og_state_v1');
  assert.equal(OG_STATE_SCHEMA_VERSION, 1);

  const backing = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => (backing.has(k) ? backing.get(k)! : null),
    setItem: (k: string, v: string) => {
      backing.set(k, v);
    },
  };

  const initial = loadOgState(mockStorage);
  assert.deepEqual(initial, createDefaultOgState());

  const saved = saveOgState(
    { ...initial, active: true, introSeen: true, lastMap: 'docks' },
    mockStorage
  );
  assert.equal(saved.active, true);
  assert.equal(saved.lastMap, 'docks');
  assert.equal(backing.size, 1);
  assert.ok(backing.has(OG_STORAGE_KEY));

  // Recording OG match result updates OG bestScore/bestWave/matchesPlayed without touching any normal keys
  const afterMatch = recordOgMatchResult(saved, 1450, 4, mockStorage);
  assert.equal(afterMatch.bestScore, 1450);
  assert.equal(afterMatch.bestWave, 4);
  assert.equal(afterMatch.matchesPlayed, 1);

  // Higher score updates bestScore; lower wave keeps prior bestWave
  const afterMatch2 = recordOgMatchResult(afterMatch, 2100, 2, mockStorage);
  assert.equal(afterMatch2.bestScore, 2100);
  assert.equal(afterMatch2.bestWave, 4);
  assert.equal(afterMatch2.matchesPlayed, 2);

  // Invalid map or wrong schema version resets safely
  assert.equal(sanitizeOgState({ version: 1, lastMap: 'duel' }).lastMap, 'warehouse');
  assert.deepEqual(sanitizeOgState({ version: 99, bestScore: 9999 }), createDefaultOgState());

  // Corrupt JSON and throwing storage never throw
  backing.set(OG_STORAGE_KEY, '{corrupt');
  assert.deepEqual(loadOgState(mockStorage), createDefaultOgState());
  const throwingStorage = {
    getItem: () => {
      throw new Error('QuotaExceeded');
    },
    setItem: () => {
      throw new Error('QuotaExceeded');
    },
  };
  assert.deepEqual(loadOgState(throwingStorage), createDefaultOgState());
  assert.equal(saveOgState(afterMatch2, throwingStorage).bestScore, 2100);
});

test('OG online mode="og" enforces room compatibility with exact Persian error and classic FFA rules', () => {
  assert.equal(OG_ROOM_ERROR_FA, 'این اتاق OG است');
  assert.equal(isOgOnlineMode('og'), true);
  assert.equal(isOgOnlineMode('pvp'), false);
  assert.equal(isOgOnlineMode('tdm_1v1'), false);
  assert.equal(isRoundBasedMode('og'), false);
  assert.ok(formatGameModeFa('og').includes('OG'));

  // Classic FFA damage in OG mode (same team string can still damage each other, never self)
  assert.equal(canDamagePlayer('og', 'alpha', 'alpha', 'p1', 'p2'), true);
  assert.equal(canDamagePlayer('og', 'alpha', 'alpha', 'p1', 'p1'), false);

  // Map sanitization rejects duel map in OG mode
  assert.equal(sanitizeOgRoomMap('duel', false), 'warehouse');
  assert.equal(sanitizeOgRoomMap('docks', false), 'docks');
  assert.equal(sanitizeOgRoomMap('duel', true), 'duel');

  // Join compatibility matrix
  assert.deepEqual(validateOgJoinCompatibility('og', true), { allowed: true, messageFa: null });
  assert.deepEqual(validateOgJoinCompatibility('pvp', false), { allowed: true, messageFa: null });
  assert.deepEqual(validateOgJoinCompatibility('tdm_1v1', false), { allowed: true, messageFa: null });

  // Normal player attempting to join OG room -> exact Persian error
  const normalIntoOg = validateOgJoinCompatibility('og', false);
  assert.equal(normalIntoOg.allowed, false);
  assert.equal(normalIntoOg.messageFa, 'این اتاق OG است');

  // OG player attempting to join Normal room -> rejected cleanly
  const ogIntoNormal = validateOgJoinCompatibility('tdm_2v2', true);
  assert.equal(ogIntoNormal.allowed, false);
  assert.equal(ogIntoNormal.messageFa, NON_OG_ROOM_ERROR_FA);
});

test('Mythic SPAS-12 Eclipse Breacher banner enforces 0.01% (1/10,000) pure-chance odds with NO pity, strict sg allowlist, and leaves prior banners untouched', () => {
  assert.equal(SPIN_BANNERS.length, 4);

  // Verify existing 3 banners remain completely untouched
  assert.equal(getSpinBannerConfig('ak47_inferno').rarityWeightsPct.legendary, 2);
  assert.equal(getSpinBannerConfig('sniper_void').rarityWeightsPct.legendary, 0.5);
  assert.equal(getSpinBannerConfig('lmg_tempest').rarityWeightsPct.mythic, 0.01);
  assert.equal(getSpinBannerConfig('lmg_tempest').hasPity, false);

  // 4th banner: SPAS-12 Eclipse Breacher
  const sgBanner = getSpinBannerConfig('shotgun_eclipse');
  assert.equal(sgBanner.featuredItemId, MYTHIC_SHOTGUN_ID);
  assert.equal(sgBanner.featuredRarity, 'mythic');
  assert.equal(sgBanner.hasPity, false);
  assert.equal(sgBanner.pityThreshold, 0);
  assert.equal(sgBanner.rarityWeightsPct.mythic, 0.01);
  assert.equal(sgBanner.rarityWeightsPct.epic, 6.99);
  assert.equal(sgBanner.rarityWeightsPct.rare, 28);
  assert.equal(sgBanner.rarityWeightsPct.common, 65);
  const sum =
    (sgBanner.rarityWeightsPct.mythic ?? 0) +
    (sgBanner.rarityWeightsPct.legendary ?? 0) +
    sgBanner.rarityWeightsPct.epic +
    sgBanner.rarityWeightsPct.rare +
    sgBanner.rarityWeightsPct.common;
  assert.ok(Math.abs(sum - 100) < 1e-9);

  // Exact 1/10,000 boundary (basis points: 0 -> mythic, 1 -> epic)
  assert.equal(selectRarityFromBasisPoints(0, sgBanner.rarityWeightsPct), 'mythic');
  assert.equal(selectRarityFromBasisPoints(1, sgBanner.rarityWeightsPct), 'epic');

  // Pool has 14 items with Eclipse Breacher as sole shotgun_skin & mythic
  const pool = getSpinBannerItems('shotgun_eclipse');
  assert.equal(pool.length, 14);
  const mythicItems = pool.filter((i) => i.rarity === 'mythic');
  assert.equal(mythicItems.length, 1);
  assert.equal(mythicItems[0].id, MYTHIC_SHOTGUN_ID);
  assert.equal(mythicItems[0].category, 'shotgun_skin');

  // Verify NO pity even after 30 consecutive non-mythic rolls
  const fixedRng = (u: number) => (arr: Uint32Array) => {
    arr[0] = Math.floor(u * 0x100000000) >>> 0;
    return arr;
  };
  let state = createInitialCosmeticsState('2026-11-24');
  state = { ...state, spins: 35 };
  for (let i = 0; i < 30; i++) {
    const out = executeLuckySpin(state, fixedRng(0.5), 'shotgun_eclipse');
    assert.ok(out);
    assert.equal(out.wasPityGuaranteed, false);
    assert.notEqual(out.item.id, MYTHIC_SHOTGUN_ID);
    state = out.nextState;
  }
  assert.equal(getBannerPityCounter(state, 'shotgun_eclipse'), 0);

  // Unlock & equip shotgun skin -> OnlineSyncedCosmetics.sg allowlist + visual color helpers
  const unlockedRes = unlockCosmeticItem(state, MYTHIC_SHOTGUN_ID);
  assert.equal(unlockedRes.unlocked, true);
  state = equipCosmeticItem(unlockedRes.state, 'shotgun_skin', MYTHIC_SHOTGUN_ID);
  const synced = toOnlineSyncedCosmetics(state.equipped);
  assert.equal(synced.sg, MYTHIC_SHOTGUN_ID);
  assert.deepEqual(sanitizeOnlineCosmetics({ sg: MYTHIC_SHOTGUN_ID, bogus: 'evil' }), {
    sg: MYTHIC_SHOTGUN_ID,
  });
  assert.equal(sanitizeOnlineCosmetics({ sg: 'm249_tempest_aegis' }), undefined);
  assert.equal(isEclipseBreacherKill('shotgun', synced), true);
  assert.equal(isEclipseBreacherKill('m249', synced), false);
  assert.equal(resolveEffectiveTracerColorInt('shotgun', synced), 0xffd15c);
  assert.equal(resolveEffectiveMuzzleFlashColorInt('shotgun', synced), 0xffc83d);
});

test('Mythic SPAS-12 perks (+1 mag, +15% Aim Assist cap 100%, 8% faster reload, exclusive emote) activate ONLY with skin equipped, respect Host toggle & OG exclusion', () => {
  assert.equal(MYTHIC_SHOTGUN_WEAPON_ID, 'shotgun');
  assert.equal(MYTHIC_SHOTGUN_SKIN_ID, MYTHIC_SHOTGUN_ID);
  assert.equal(MYTHIC_SHOTGUN_PERKS.extraMagShells, 1);
  assert.equal(MYTHIC_SHOTGUN_PERKS.aimAssistBonusPct, 15);
  assert.equal(MYTHIC_SHOTGUN_PERKS.reloadSpeedBonusPct, 8);
  assert.equal(MYTHIC_SHOTGUN_PERKS.reloadDurationMultiplier, 0.92);

  // Active ONLY when holding SPAS-12 + Eclipse Breacher equipped + allowed
  assert.equal(
    isMythicShotgunPerksActive({ weaponId: 'shotgun', equippedShotgunSkinId: MYTHIC_SHOTGUN_ID, isOnline: false }),
    true
  );
  // Default skin -> ZERO perks
  assert.equal(
    isMythicShotgunPerksActive({ weaponId: 'shotgun', equippedShotgunSkinId: null, isOnline: false }),
    false
  );
  // Wrong weapon -> ZERO perks
  assert.equal(
    isMythicShotgunPerksActive({ weaponId: 'lmg', equippedShotgunSkinId: MYTHIC_SHOTGUN_ID, isOnline: false }),
    false
  );
  // Host toggle OFF -> ZERO perks
  assert.equal(
    isMythicShotgunPerksActive({
      weaponId: 'shotgun',
      equippedShotgunSkinId: MYTHIC_SHOTGUN_ID,
      isOnline: true,
      roomMythicPerksAllowed: false,
    }),
    false
  );

  // Magazine size 8 -> 9 ONLY when active
  assert.equal(getMythicShotgunMagSize(8, true), 9);
  assert.equal(getMythicShotgunMagSize(8, false), 8);

  // Reload duration 1.85 -> 1.702 (~8% faster) ONLY when active
  assert.equal(getMythicShotgunReloadDuration(1.85, true), 1.702);
  assert.equal(getMythicShotgunReloadDuration(1.85, false), 1.85);

  // Aim Assist +15% capped at 100%
  assert.equal(computeEffectiveAimAssistWithMythicPerk({ baseAimAssistStrength: 50, mythicPerksActive: true }), 58);
  assert.equal(computeEffectiveAimAssistWithMythicPerk({ baseAimAssistStrength: 95, mythicPerksActive: true }), 100);
  assert.equal(computeEffectiveAimAssistWithMythicPerk({ baseAimAssistStrength: 50, mythicPerksActive: false }), 50);
  assert.equal(
    computeEffectiveAimAssistWithMythicPerk({
      baseAimAssistStrength: 60,
      roomAimAssistAllowed: false,
      mythicPerksActive: true,
    }),
    0
  );

  // Exclusive emote allowlist
  assert.equal(ALLOWED_EMOTE_IDS.has(MYTHIC_SHOTGUN_EMOTE_ID), true);
  assert.equal(sanitizeEmoteId(MYTHIC_SHOTGUN_EMOTE_ID), MYTHIC_SHOTGUN_EMOTE_ID);
  assert.equal(sanitizeEmoteId('unknown_dance'), null);

  // Lobby summary detects both M249 and SPAS-12 holders accurately
  const summary = getLobbyMythicSummary([
    { name: 'Alpha', cosmetics: { sg: MYTHIC_SHOTGUN_ID } },
    { name: 'Bravo', cosmetics: { m249: MYTHIC_M249_ID } },
    { name: 'Charlie', cosmetics: {} },
  ]);
  assert.deepEqual(summary.holderNames, ['Alpha', 'Bravo']);
  assert.equal(summary.hasM249Mythic, true);
  assert.equal(summary.hasShotgunMythic, true);
  assert.deepEqual(getLobbyMythicHolderNames([{ name: 'Alpha', cosmetics: { sg: MYTHIC_SHOTGUN_ID } }]), ['Alpha']);

  // OG mode disables skinsAndCollection so Eclipse Breacher can never activate in OG
  const ogFeatures = resolveEffectiveFeatures(true);
  assert.equal(ogFeatures.skinsAndCollection, false);
  assert.equal(
    isMythicShotgunPerksActive({
      weaponId: 'shotgun',
      equippedShotgunSkinId: ogFeatures.skinsAndCollection ? MYTHIC_SHOTGUN_ID : null,
      isOnline: false,
    }),
    false
  );
});

test('validateClientShootEvent allows +1 SPAS-12 shell and 960ms reload reset ONLY when Mythic Shotgun options are authorized', () => {
  // Default SPAS-12 (mag 8 + 1 packet tolerance = 9 shots before reload window 1050ms)
  let defaultTracker = undefined;
  let now = 1000;
  for (let i = 0; i < 9; i++) {
    const res = validateClientShootEvent(defaultTracker, 4, now);
    assert.equal(res.valid, true, `default shot ${i + 1} should pass`);
    defaultTracker = res.nextTracker;
    now += 820;
  }
  assert.equal(validateClientShootEvent(defaultTracker, 4, now).valid, false);

  // Wait 960ms (below default 1050ms reset threshold) -> still rejected for default shotgun
  assert.equal(validateClientShootEvent(defaultTracker, 4, (defaultTracker?.lastShotAtMs ?? now) + 960).valid, false);

  // Mythic SPAS-12 authorized options: magBonus=1 (allows 10th shot in window) & reloadResetThresholdMs=960
  let mythicTracker = undefined;
  let t = 1000;
  for (let i = 0; i < 10; i++) {
    const res = validateClientShootEvent(mythicTracker, 4, t, {
      magBonus: 1,
      reloadResetThresholdMs: 960,
    });
    assert.equal(res.valid, true, `mythic shot ${i + 1} should pass`);
    mythicTracker = res.nextTracker;
    t += 820;
  }
  assert.equal(
    validateClientShootEvent(mythicTracker, 4, t, { magBonus: 1, reloadResetThresholdMs: 960 }).valid,
    false
  );
  // After 960ms reload pause -> accepted with mythic threshold
  const afterReloadMs = (mythicTracker?.lastShotAtMs ?? t) + 960;
  assert.equal(
    validateClientShootEvent(mythicTracker, 4, afterReloadMs, { magBonus: 1, reloadResetThresholdMs: 960 }).valid,
    true
  );
});

test('Netlify Function redeem supports REDEEM_CODE_MYTHIC_SHOTGUN -> spas12_eclipse_breacher with env override and rejects invalid codes', async () => {
  const prevShotgun = process.env.REDEEM_CODE_MYTHIC_SHOTGUN;
  const prevUrl = process.env.URL;

  try {
    process.env.URL = 'https://game.example.netlify.app';
    assert.equal(parseAllowedRedeemRewardId(MYTHIC_SHOTGUN_ID), MYTHIC_SHOTGUN_ID);

    const syntheticCode = `eclipse-test-${Date.now().toString(36)}-۹۸`;
    process.env.REDEEM_CODE_MYTHIC_SHOTGUN = syntheticCode;

    // Matching normalized code (case + Persian/Arabic digit normalization) unlocks spas12_eclipse_breacher
    const okRes = await netlifyRedeemHandler({
      httpMethod: 'POST',
      headers: { host: 'game.example.netlify.app', origin: 'https://game.example.netlify.app' },
      body: JSON.stringify({ code: syntheticCode.toUpperCase().replace('۹۸', '98') }),
    });
    assert.equal(okRes.statusCode, 200);
    assert.equal(okRes.body, JSON.stringify({ ok: true, rewardId: MYTHIC_SHOTGUN_ID }));

    // Invalid code rejected with uniform {ok:false}
    const badRes = await netlifyRedeemHandler({
      httpMethod: 'POST',
      headers: { host: 'game.example.netlify.app', origin: 'https://game.example.netlify.app' },
      body: JSON.stringify({ code: 'invalid-shotgun-code-000' }),
    });
    assert.equal(badRes.statusCode, 200);
    assert.equal(badRes.body, '{"ok":false}');
  } finally {
    if (prevShotgun === undefined) delete process.env.REDEEM_CODE_MYTHIC_SHOTGUN;
    else process.env.REDEEM_CODE_MYTHIC_SHOTGUN = prevShotgun;
    if (prevUrl === undefined) delete process.env.URL;
    else process.env.URL = prevUrl;
  }
});

test('Stage 2 Stabilization — Global 80-particle cap, SkinFxMode defaults/persistence, and main-scene menu pause policy', () => {
  assert.equal(GLOBAL_PARTICLE_CAP, 80);
  assert.ok(ALL_SETTINGS_STORAGE_KEYS.includes(SKIN_FX_MODE_STORAGE_KEY));

  // Particle budget clamps strictly to cap = 80
  assert.equal(computeRemainingParticleAllowance(0, 24), 24);
  assert.equal(computeRemainingParticleAllowance(72, 20), 8);
  assert.equal(computeRemainingParticleAllowance(80, 15), 0);
  assert.equal(computeRemainingParticleAllowance(95, 10), 0);
  assert.equal(computeRemainingParticleAllowance(10, -5), 0);
  assert.equal(computeRemainingParticleAllowance(10, Number.NaN), 0);

  // Weak/mobile devices default to 'simple'; strong desktops default to 'full'
  assert.equal(resolveDefaultSkinFxMode({ isMobile: true, hardwareConcurrency: 8, deviceMemory: 8 }), 'simple');
  assert.equal(resolveDefaultSkinFxMode({ isMobile: false, hardwareConcurrency: 4, deviceMemory: 8 }), 'simple');
  assert.equal(resolveDefaultSkinFxMode({ isMobile: false, hardwareConcurrency: 8, deviceMemory: 4 }), 'simple');
  assert.equal(resolveDefaultSkinFxMode({ isMobile: false, hardwareConcurrency: 8, deviceMemory: 8 }), 'full');

  // resolveEffectiveSkinFx honors 'off', Reduced Motion, Potato, 'simple', and Auto-Quality
  assert.deepEqual(
    resolveEffectiveSkinFx({ skinFxMode: 'off', reducedMotion: false, preset: 'high', autoQualityStage: 0 }),
    { disabled: true, simple: true, scale: 0 }
  );
  assert.deepEqual(
    resolveEffectiveSkinFx({ skinFxMode: 'full', reducedMotion: true, preset: 'ultra', autoQualityStage: 0 }),
    { disabled: true, simple: true, scale: 0 }
  );
  assert.deepEqual(
    resolveEffectiveSkinFx({ skinFxMode: 'full', reducedMotion: false, preset: 'potato', autoQualityStage: 0 }),
    { disabled: true, simple: true, scale: 0 }
  );
  const simpleCfg = resolveEffectiveSkinFx({ skinFxMode: 'simple', reducedMotion: false, preset: 'high', autoQualityStage: 0 });
  assert.equal(simpleCfg.disabled, false);
  assert.equal(simpleCfg.simple, true);
  assert.ok(simpleCfg.scale > 0 && simpleCfg.scale <= 0.45);
  const fullCfg = resolveEffectiveSkinFx({ skinFxMode: 'full', reducedMotion: false, preset: 'high', autoQualityStage: 0 });
  assert.equal(fullCfg.disabled, false);
  assert.equal(fullCfg.simple, false);
  assert.equal(fullCfg.scale, 1);

  // Menu/overlay/hidden pause policy stops background 3D scene rendering
  assert.equal(shouldPauseMainSceneRender({ screenState: 'title', anyOverlayOpen: false, isPageHidden: false }), true);
  assert.equal(shouldPauseMainSceneRender({ screenState: 'paused', anyOverlayOpen: false, isPageHidden: false }), true);
  assert.equal(shouldPauseMainSceneRender({ screenState: 'gameover', anyOverlayOpen: false, isPageHidden: false }), true);
  assert.equal(shouldPauseMainSceneRender({ screenState: 'playing', anyOverlayOpen: true, isPageHidden: false }), true);
  assert.equal(shouldPauseMainSceneRender({ screenState: 'playing', anyOverlayOpen: false, isPageHidden: true }), true);
  assert.equal(shouldPauseMainSceneRender({ screenState: 'playing', anyOverlayOpen: false, isPageHidden: false }), false);

  // Storage key registered & load/save don't throw in Node (no localStorage)
  assert.equal(typeof loadSkinFxMode(), 'string');
  assert.doesNotThrow(() => saveSkinFxMode('off'));
});

test('Stage 3 Stabilization — Unified Single-Sight invariant guarantees NEVER two sights simultaneously across all weapons, skins, and OG mode', () => {
  const weapons = [
    { id: 'ak47', isMelee: false },
    { id: 'm4a1', isMelee: false },
    { id: 'sniper', isMelee: false },
    { id: 'mp5', isMelee: false },
    { id: 'shotgun', isMelee: false },
    { id: 'pistol', isMelee: false },
    { id: 'katana', isMelee: true },
    { id: 'lmg', isMelee: false },
    { id: 'deagle', isMelee: false },
    { id: 'rpg', isMelee: false },
  ];

  // Exhaustive cartesian invariant check across every state combination
  for (const w of weapons) {
    for (const isADS of [false, true]) {
      for (const hasEclipse of [false, true]) {
        for (const isOgMode of [false, true]) {
          for (const userCrosshairVisible of [false, true]) {
            for (const isSpectating of [false, true]) {
              const mode = resolveActiveSightMode({
                isPlaying: true,
                isSpectating,
                isADS,
                weaponId: w.id,
                isMelee: w.isMelee,
                userCrosshairVisible,
                hasEclipseShotgunSkin: hasEclipse,
                isOgMode,
              });
              // Active 2D overlay count MUST NEVER exceed 1 (crosshair, sniper 2D scope, eclipse 2D holo are strictly mutually exclusive)
              const active2dCount =
                (mode.showCrosshair ? 1 : 0) +
                (mode.showSniperScope2D ? 1 : 0) +
                (mode.showEclipseSight2D ? 1 : 0);
              assert.ok(
                active2dCount <= 1,
                `Double 2D sight detected for ${w.id} (ADS=${isADS}, eclipse=${hasEclipse}, og=${isOgMode})`
              );
              // Whenever Eclipse 2D sight is shown, 3D top-rail optic MUST be hidden so no double ring appears
              if (mode.showEclipseSight2D) {
                assert.equal(mode.hideEclipseRailOptic3D, true);
                assert.equal(mode.showCrosshair, false);
                assert.equal(mode.showSniperScope2D, false);
              }
              // Whenever Sniper 2D scope is shown, 3D first-person weapon MUST be hidden
              if (mode.showSniperScope2D) {
                assert.equal(mode.hideFirstPersonWeapon3D, true);
                assert.equal(mode.showCrosshair, false);
                assert.equal(mode.showEclipseSight2D, false);
              }
              // Whenever ADS on any non-melee gun, 2D hipfire crosshair MUST be hidden
              if (isADS && !w.isMelee) {
                assert.equal(mode.showCrosshair, false);
              }
            }
          }
        }
      }
    }
  }

  // Verify specific critical transitions:
  // 1) Mythic SPAS-12 ADS (non-OG) -> ONLY 2D Eclipse Holo + 3D rail optic hidden
  const eclipseAds = resolveActiveSightMode({
    isPlaying: true,
    isSpectating: false,
    isADS: true,
    weaponId: 'shotgun',
    isMelee: false,
    userCrosshairVisible: true,
    hasEclipseShotgunSkin: true,
    isOgMode: false,
  });
  assert.equal(eclipseAds.kind, 'eclipse_2d_holo');
  assert.equal(eclipseAds.showEclipseSight2D, true);
  assert.equal(eclipseAds.hideEclipseRailOptic3D, true);
  assert.equal(eclipseAds.showCrosshair, false);

  // 2) Mythic SPAS-12 ADS in OG Mode -> falls back to 3D standard ADS sight ONLY (zero Eclipse overlay)
  const eclipseOgAds = resolveActiveSightMode({
    isPlaying: true,
    isSpectating: false,
    isADS: true,
    weaponId: 'shotgun',
    isMelee: false,
    userCrosshairVisible: true,
    hasEclipseShotgunSkin: true,
    isOgMode: true,
  });
  assert.equal(eclipseOgAds.kind, 'weapon_3d_ads');
  assert.equal(eclipseOgAds.showEclipseSight2D, false);
  assert.equal(eclipseOgAds.showCrosshair, false);

  // 3) Standard AK-47 / M249 ADS -> 3D weapon sight ONLY (no 2D crosshair doubling)
  const akAds = resolveActiveSightMode({
    isPlaying: true,
    isSpectating: false,
    isADS: true,
    weaponId: 'ak47',
    isMelee: false,
    userCrosshairVisible: true,
    hasEclipseShotgunSkin: false,
    isOgMode: false,
  });
  assert.equal(akAds.kind, 'weapon_3d_ads');
  assert.equal(akAds.showCrosshair, false);
});

test('Stage 4 Stabilization — Exhaustive 4-banner spin odds sum to 100%, Mythic banners enforce zero pity, and statistical rolls match weights', () => {
  const bannerIds = ['ak47_inferno', 'sniper_void', 'lmg_tempest', 'shotgun_eclipse'] as const;
  for (const id of bannerIds) {
    const cfg = getSpinBannerConfig(id);
    const totalPct =
      Math.round(
        (cfg.rarityWeightsPct.common +
          cfg.rarityWeightsPct.rare +
          cfg.rarityWeightsPct.epic +
          cfg.rarityWeightsPct.legendary +
          cfg.rarityWeightsPct.mythic) *
          100
      ) / 100;
    assert.equal(totalPct, 100, `Banner ${id} weights must sum strictly to 100.00% (got ${totalPct})`);

    // Ensure every non-zero rarity weight has at least 1 pool item in that banner
    const pool = getSpinBannerItems(id);
    for (const tier of ['common', 'rare', 'epic', 'legendary', 'mythic'] as const) {
      if (cfg.rarityWeightsPct[tier] > 0) {
        assert.ok(
          pool.some((item) => item.rarity === tier),
          `Banner ${id} has non-zero weight for ${tier} but zero items`
        );
      }
    }
  }

  // Mythic banners MUST NEVER trigger pity even after 60 non-mythic spins
  const commonRollRng = (arr: Uint32Array) => {
    arr[0] = 0x80000000; // 0.50 -> lands safely in common band (65%)
    return arr;
  };
  for (const mythicBanner of ['lmg_tempest', 'shotgun_eclipse'] as const) {
    let state = { ...createInitialCosmeticsState(), spins: 100 };
    for (let i = 0; i < 60; i++) {
      const outcome = executeLuckySpin(state, commonRollRng, mythicBanner);
      assert.ok(outcome);
      assert.notEqual(outcome.item.rarity, 'mythic', `Mythic banner ${mythicBanner} must never pity-drop on spin ${i + 1}`);
      state = outcome.nextState;
    }
    assert.equal(getBannerPityCounter(state, mythicBanner), 0);
  }

  // Exact 10,000-strata basis-point uniformity verification for shotgun_eclipse (0.01% = 1/10,000)
  const eclipseWeights = getSpinBannerConfig('shotgun_eclipse').rarityWeightsPct;
  const counts = { common: 0, rare: 0, epic: 0, legendary: 0, mythic: 0 };
  for (let bp = 0; bp < 10_000; bp++) {
    const r = selectRarityFromBasisPoints(bp, eclipseWeights);
    counts[r] += 1;
  }
  assert.equal(counts.mythic, 1, 'Exactly 1 in 10,000 (0.01%) must hit Mythic across all 10,000 basis points');
  assert.equal(counts.legendary, 0, 'Mythic shotgun banner has 0% Legendary band');
  assert.equal(counts.epic, 699);
  assert.equal(counts.rare, 2800);
  assert.equal(counts.common, 6500);
});

test('Stage 4 Stabilization — Full 4-skin equip/unequip lifecycle, online allowlist sync, and corrupt storage recovery', () => {
  let state = createInitialCosmeticsState();
  state = unlockCosmeticItem(state, LEGENDARY_AK47_ID).state;
  state = unlockCosmeticItem(state, LEGENDARY_SNIPER_ID).state;
  state = unlockCosmeticItem(state, MYTHIC_M249_ID).state;
  state = unlockCosmeticItem(state, MYTHIC_SHOTGUN_ID).state;

  // Equip all 4 weapon skins simultaneously without interfering with one another
  state = equipCosmeticItem(state, 'ak47_skin', LEGENDARY_AK47_ID);
  state = equipCosmeticItem(state, 'sniper_skin', LEGENDARY_SNIPER_ID);
  state = equipCosmeticItem(state, 'm249_skin', MYTHIC_M249_ID);
  state = equipCosmeticItem(state, 'shotgun_skin', MYTHIC_SHOTGUN_ID);

  const synced = toOnlineSyncedCosmetics(state.equipped);
  assert.equal(synced.ak, LEGENDARY_AK47_ID);
  assert.equal(synced.sn, LEGENDARY_SNIPER_ID);
  assert.equal(synced.m249, MYTHIC_M249_ID);
  assert.equal(synced.sg, MYTHIC_SHOTGUN_ID);

  // Unequipping one weapon skin (e.g. SPAS-12) must leave the other 3 untouched
  state = equipCosmeticItem(state, 'shotgun_skin', null);
  assert.equal(state.equipped.shotgun_skin, null);
  assert.equal(state.equipped.ak47_skin, LEGENDARY_AK47_ID);
  assert.equal(state.equipped.sniper_skin, LEGENDARY_SNIPER_ID);
  assert.equal(state.equipped.m249_skin, MYTHIC_M249_ID);

  // Corrupt storage validation recovers cleanly without throwing or allowing forged IDs
  const recovered = validateCosmeticsState({
    version: COSMETICS_STATE_VERSION,
    ownedIds: [LEGENDARY_AK47_ID, 'forged_god_skin_999', 12345],
    equipped: {
      ak47_skin: LEGENDARY_AK47_ID,
      shotgun_skin: MYTHIC_SHOTGUN_ID, // NOT owned -> must be stripped!
      m249_skin: 'forged_skin',
    },
    spins: -50,
    shards: Number.NaN,
  });
  assert.equal(recovered.equipped.ak47_skin, LEGENDARY_AK47_ID);
  assert.equal(recovered.equipped.shotgun_skin, null);
  assert.equal(recovered.equipped.m249_skin, null);
  assert.ok(recovered.spins >= 0);
  assert.equal(recovered.shards, 0);

  // Online sanitizer strictly strips forged slots while keeping valid ones
  const sanitizedNet = sanitizeOnlineCosmetics({
    ak: LEGENDARY_AK47_ID,
    sn: 'forged_sn',
    m249: MYTHIC_M249_ID,
    sg: 'forged_sg',
  });
  assert.ok(sanitizedNet);
  assert.equal(sanitizedNet.ak, LEGENDARY_AK47_ID);
  assert.equal(sanitizedNet.sn, undefined);
  assert.equal(sanitizedNet.m249, MYTHIC_M249_ID);
  assert.equal(sanitizedNet.sg, undefined);
});

test('Task 1 — UI v2 release stage constant is Beta with exact Persian notice text', () => {
  assert.equal(UI_V2_STAGE, 'beta');
  assert.equal(UI_V2_STAGE_LABEL, 'Beta');
  assert.equal(UI_V2_ALPHA_LABEL, 'Beta');
  assert.equal(
    UI_V2_STAGE_NOTICE_FA,
    'این رابط تقریباً کامله ولی ممکنه چند مورد کوچک هنوز مشکل داشته باشه.'
  );
});

test('Task 2A — Deterministic Spin Reel lands exactly on pre-rolled prize across all 4 banners and all viewport widths', () => {
  const viewports = [360, 667, 800, 932, 1280];
  const winIndex = 34;
  const totalSlots = 44;

  for (const banner of SPIN_BANNERS) {
    const pool = getSpinBannerItems(banner.id);
    const initial = { ...createInitialCosmeticsState(), spins: 3 };
    const outcome = executeLuckySpin(initial, undefined, banner.id);
    assert.ok(outcome, `Spin on ${banner.id} should succeed with 3 tokens`);
    // Exactly 1 token deducted (or +1 bonus if duplicate hit 5 shards, here 0 shards so strictly -1)
    assert.equal(outcome.nextState.spins, 2);
    assert.equal(outcome.nextState.totalSpins, 1);
    assert.ok(outcome.nextState.ownedIds.includes(outcome.item.id));

    const strip = buildSpinReelStrip(outcome.item, totalSlots, winIndex, undefined, pool);
    assert.equal(strip.length, totalSlots);
    assert.equal(strip[winIndex].id, outcome.item.id, 'Winning slot must match pre-rolled outcome item');
    if (pool.length > 1) {
      assert.notEqual(strip[winIndex - 1].id, outcome.item.id, 'Left neighbor should avoid duplicate ambiguity');
      assert.notEqual(strip[winIndex + 1].id, outcome.item.id, 'Right neighbor should avoid duplicate ambiguity');
    }

    for (const vpWidth of viewports) {
      for (const slotWidthPx of [104, 118]) {
        const offsetPx = computeSpinReelTargetOffsetPx({
          winIndex,
          slotWidthPx,
          slotGapPx: 8,
          viewportWidthPx: vpWidth,
          trackPaddingLeftPx: 12,
        });
        const landedIndex = resolveSpinReelIndexAtOffsetPx({
          offsetPx,
          slotWidthPx,
          slotGapPx: 8,
          viewportWidthPx: vpWidth,
          trackPaddingLeftPx: 12,
          stripLength: strip.length,
        });
        assert.equal(
          landedIndex,
          winIndex,
          `Reel must land dead-center on winIndex=${winIndex} for vp=${vpWidth}px, slot=${slotWidthPx}px`
        );
        assert.equal(strip[landedIndex].id, outcome.item.id);
      }
    }
  }

  // Zero-token rejection guarantees no negative tokens
  const zeroState = { ...createInitialCosmeticsState(), spins: 0 };
  assert.equal(executeLuckySpin(zeroState, undefined, 'shotgun_eclipse'), null);
});

test('Task 2A — Remote 3D weapon skin accent resolves cleanly for all 4 weapons, default skins, and fallback', () => {
  const fullCos = {
    ak: LEGENDARY_AK47_ID,
    sn: LEGENDARY_SNIPER_ID,
    m249: MYTHIC_M249_ID,
    sg: MYTHIC_SHOTGUN_ID,
  };
  assert.equal(resolveRemoteWeaponSkinAccentHex('shotgun', fullCos), 0xf59e0b);
  assert.equal(resolveRemoteWeaponSkinAccentHex('lmg', fullCos), 0xff2a55);
  assert.equal(resolveRemoteWeaponSkinAccentHex('sniper', fullCos), 0x38e8ff);
  assert.equal(resolveRemoteWeaponSkinAccentHex('ak47', fullCos), 0xff7a1a);
  assert.equal(resolveRemoteWeaponSkinAccentHex('pistol', fullCos), null);
  assert.equal(resolveRemoteWeaponSkinAccentHex('shotgun', { ak: LEGENDARY_AK47_ID }), null);
  // Before first shot (unknown active weapon), falls back to highest-tier equipped weapon skin
  assert.equal(resolveRemoteWeaponSkinAccentHex(undefined, fullCos), 0xf59e0b);
  assert.equal(resolveRemoteWeaponSkinAccentHex(undefined, { m249: MYTHIC_M249_ID }), 0xff2a55);
  assert.equal(resolveRemoteWeaponSkinAccentHex(undefined, {}), null);
  assert.equal(resolveRemoteWeaponSkinAccentHex(undefined, undefined), null);
});

test('UI v3 Stage 1 — Single stage constant is Alpha, default UI is legacy, and 3-way switching defers cleanly mid-match', () => {
  assert.equal(UI_V3_STAGE, 'alpha');
  assert.equal(UI_V3_STAGE_LABEL, 'Alpha');
  assert.ok(UI_V3_OPTION_LABEL_FA.includes('لیکوید گلس'));
  assert.ok(UI_V3_OPTION_LABEL_FA.includes('Alpha'));
  assert.equal(DEFAULT_UI_V3_PREFERENCES.uiMode, 'legacy');
  assert.equal(DEFAULT_UI_V3_PREFERENCES.reduceTransparency, false);

  // Immediate switches in title screen across all 3 UIs
  const toV3 = resolveThreeWayUiSwitch('legacy', 'v3', 'title');
  assert.equal(toV3.nextActiveUi, 'v3');
  assert.equal(toV3.nextPreferredUi, 'v3');
  assert.equal(toV3.deferred, false);
  assert.equal(toV3.noticeFa, null);

  const toV2 = resolveThreeWayUiSwitch('v3', 'v2', 'title');
  assert.equal(toV2.nextActiveUi, 'v2');
  assert.equal(toV2.deferred, false);

  // Mid-match switches defer visual swap until match exit with Persian notice
  for (const state of ['playing', 'paused', 'gameover'] as const) {
    const mid = resolveThreeWayUiSwitch('legacy', 'v3', state);
    assert.equal(mid.nextActiveUi, 'legacy');
    assert.equal(mid.nextPreferredUi, 'v3');
    assert.equal(mid.deferred, true);
    assert.equal(mid.noticeFa, UI_V3_PENDING_SWITCH_MSG_FA);
  }

  // Selecting already active UI mid-match cancels deferral cleanly
  const sameMid = resolveThreeWayUiSwitch('v3', 'v3', 'paused');
  assert.equal(sameMid.deferred, false);
  assert.equal(sameMid.noticeFa, null);
});

test('UI v3 Stage 1 — Preferences persistence (including reduceTransparency), corrupt JSON recovery, and legacy v1 migration', () => {
  const mem = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mem.set(k, v);
    },
    removeItem: (k: string) => {
      mem.delete(k);
    },
  };

  // Fresh storage defaults to legacy + reduceTransparency false
  assert.deepEqual(loadUiV3Preferences(mockStorage), DEFAULT_UI_V3_PREFERENCES);

  // Migrates existing v1/v2 user preference seamlessly
  mem.set(LEGACY_UI_VERSION_STORAGE_KEY, JSON.stringify({ version: 1, uiVersion: 'v2', uiClickSound: false, uiHaptics: true }));
  const migrated = loadUiV3Preferences(mockStorage);
  assert.equal(migrated.uiMode, 'v2');
  assert.equal(migrated.uiClickSound, false);
  assert.equal(migrated.reduceTransparency, false);

  // Save v3 + reduceTransparency=true
  saveUiV3Preferences(
    { version: 1, uiMode: 'v3', reduceTransparency: true, uiClickSound: true, uiHaptics: false },
    mockStorage
  );
  const reloaded = loadUiV3Preferences(mockStorage);
  assert.equal(reloaded.uiMode, 'v3');
  assert.equal(reloaded.reduceTransparency, true);
  assert.equal(reloaded.uiHaptics, false);

  // Corrupt JSON falls back cleanly without throwing
  mem.set(UI_V3_PREFS_STORAGE_KEY, '{corrupt_json');
  assert.deepEqual(loadUiV3Preferences(mockStorage), DEFAULT_UI_V3_PREFERENCES);

  // Invalid values sanitized safely
  const sanitized = validateUiV3Preferences({ uiMode: 'v99', reduceTransparency: 'yes' });
  assert.equal(sanitized.uiMode, 'legacy');
  assert.equal(sanitized.reduceTransparency, false);
});

test('UI v3 Stage 1 — Independent v3 touch control layout storage never overwrites Legacy or UI v2 keys', () => {
  const mem = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mem.set(k, v);
    },
    removeItem: (k: string) => {
      mem.delete(k);
    },
  };

  const base = loadV3ControlLayout('standard', mockStorage);
  const moved = {
    ...base,
    fire: { ...base.fire, xPct: 72, yPct: 68, scale: 1.15 },
  };
  saveV3ControlLayout(moved, mockStorage);
  assert.ok(mem.has(UI_V3_CONTROL_LAYOUT_STORAGE_KEY));
  assert.equal(mem.size, 1, 'Saving UI v3 touch layout must only touch its own storage key');

  const loaded = loadV3ControlLayout('standard', mockStorage);
  assert.equal(loaded.fire.xPct, 72);
  assert.equal(loaded.fire.yPct, 68);

  resetV3ControlLayoutStorage(mockStorage);
  assert.equal(mem.has(UI_V3_CONTROL_LAYOUT_STORAGE_KEY), false);
});

test('UI v3 Stage 1 — Adaptive Liquid Glass resolver enforces zero-blur gameplay HUD, <= 3 blur layers in paused menus, and automatic degradation', () => {
  const optimalInput = {
    supportsBackdropFilter: true,
    gfxPreset: 'high' as const,
    reducedMotion: false,
    reduceTransparency: false,
    currentFps: 60,
    isInGameplayHud: false,
    isScenePaused: true,
  };

  // Optimal paused menu -> liquid glass with max 3 blur layers
  const optimal = resolveLiquidGlassCapabilities(optimalInput);
  assert.equal(optimal.mode, 'liquid');
  assert.equal(optimal.blurEnabled, true);
  assert.equal(optimal.maxBlurLayers, LIQUID_GLASS_MAX_BLUR_LAYERS);
  assert.equal(optimal.maxBlurLayers, 3);

  // Gameplay HUD -> ALWAYS zero backdrop-filter regardless of high FPS/preset
  const hud = resolveLiquidGlassCapabilities({ ...optimalInput, isInGameplayHud: true });
  assert.equal(hud.blurEnabled, false);
  assert.equal(hud.maxBlurLayers, 0);
  assert.equal(hud.reason, 'gameplay-hud-zero-blur');

  // Reduce Transparency -> solid high-contrast mode, zero blur
  const solid = resolveLiquidGlassCapabilities({ ...optimalInput, reduceTransparency: true });
  assert.equal(solid.mode, 'solid');
  assert.equal(solid.blurEnabled, false);
  assert.equal(solid.reason, 'reduce-transparency');

  // Unsupported backdrop-filter -> simple fallback
  const noSupport = resolveLiquidGlassCapabilities({ ...optimalInput, supportsBackdropFilter: false });
  assert.equal(noSupport.mode, 'simple');
  assert.equal(noSupport.blurEnabled, false);

  // Reduced motion -> simple fallback
  const redMotion = resolveLiquidGlassCapabilities({ ...optimalInput, reducedMotion: true });
  assert.equal(redMotion.mode, 'simple');
  assert.equal(redMotion.blurEnabled, false);

  // Low / Potato preset -> simple fallback
  for (const preset of ['low', 'potato'] as const) {
    const lowRes = resolveLiquidGlassCapabilities({ ...optimalInput, gfxPreset: preset });
    assert.equal(lowRes.mode, 'simple');
    assert.equal(lowRes.blurEnabled, false);
  }

  // Low FPS drop -> automatic fallback
  const lowFps = resolveLiquidGlassCapabilities({ ...optimalInput, currentFps: LIQUID_GLASS_LOW_FPS_THRESHOLD - 5 });
  assert.equal(lowFps.mode, 'simple');
  assert.equal(lowFps.blurEnabled, false);
  assert.equal(lowFps.reason, 'low-fps-fallback');

  // Active live 3D scene behind menu -> disables blur until paused
  const liveScene = resolveLiquidGlassCapabilities({ ...optimalInput, isScenePaused: false });
  assert.equal(liveScene.mode, 'simple');
  assert.equal(liveScene.blurEnabled, false);
});

test('UI v3 Stage 1 — Throttled gameplay HUD snapshot enforces 10-15 Hz cadence (~80ms) and skips redundant updates', () => {
  assert.ok(HUD_V3_MIN_INTERVAL_MS >= 66 && HUD_V3_MIN_INTERVAL_MS <= 100, 'HUD cadence must be within 10-15 Hz');
  assert.equal(shouldEmitHudSnapshot(0, 100), true);
  assert.equal(shouldEmitHudSnapshot(1000, 1016), false, 'Must skip per-frame 16ms ticks');
  assert.equal(shouldEmitHudSnapshot(1000, 1079), false);
  assert.equal(shouldEmitHudSnapshot(1000, 1080), true);

  const snapA = {
    hp: 100,
    maxHp: 100,
    ammo: 30,
    reserve: 120,
    weaponId: 'ak47' as const,
    weaponName: 'AK-47',
    reloading: false,
    score: 0,
    wave: 1,
    aliveEnemies: 4,
    fps: 60,
    pingMs: null,
    isOnline: false,
    isPlaying: true,
    capturedAtMs: 1000,
  };
  const snapSameTimeDifferent = { ...snapA, capturedAtMs: 1200 };
  const snapAmmoChanged = { ...snapA, ammo: 29, capturedAtMs: 1200 };

  assert.equal(hasHudSnapshotChanged(null, snapA), true);
  assert.equal(hasHudSnapshotChanged(snapA, snapSameTimeDifferent), false, 'Identical HUD values must not trigger React re-render');
  assert.equal(hasHudSnapshotChanged(snapA, snapAmmoChanged), true);
});





