import { test } from 'node:test';
import assert from 'node:assert/strict';
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
} from './rules.ts';
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

test('Custom controls layout defaults, clamping, and sanitization handle all 10 control slots safely (including voice mic and slide)', () => {
  const std = getDefaultControlLayout('standard');
  const claw = getDefaultControlLayout('claw');
  const left = getDefaultControlLayout('lefthanded');

  assert.equal(ALL_CONTROL_SLOT_IDS.length, 10);
  assert.ok(ALL_CONTROL_SLOT_IDS.includes('voice'));
  assert.ok(ALL_CONTROL_SLOT_IDS.includes('slide'));
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

test('Animations Stage 1 — Compact player anim enum (0..8), local speed-derived remote walk/run, smooth death fall/fade, respawn emerge, and online merge preservation', () => {
  const allStates = ['idle', 'walk', 'run', 'slide', 'shoot', 'reload', 'switch', 'dead', 'respawn'] as const;
  assert.equal(Object.keys(PLAYER_ANIM_STATE_TO_CODE).length, 9);
  for (const st of allStates) {
    const code = encodePlayerAnimState(st);
    assert.ok(Number.isInteger(code) && code >= 0 && code <= 8);
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
