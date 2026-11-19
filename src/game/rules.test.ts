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
  generatePeerRoomCode,
  roomCodeToHostPeerId,
  buildRoomInviteUrl,
  formatConnectionStatusFa,
  mergeClientInputIntoHostState,
  removeDisconnectedPlayerFromHostState,
  AuthoritativeRoomState,
  ALL_WEAPON_IDS,
  ROUND_MATCH_WIN_SCORE,
  canDamagePlayer,
  assignBalancedTeam,
  awardRoundPointToTeam,
  startNextAuthoritativeRound,
  formatRoundClock,
  isRoundBasedMode,
  getCurrentOriginShareBaseUrl,
  checkOnlineVersionCompatibility,
  VERSION_MISMATCH_MESSAGE_FA,
  isStaleClientInputForRespawn,
  shouldInstantTeleportRemotePlayer,
  getTeamSpawnPosition,
} from './rules.ts';
import {
  getDefaultControlLayout,
  clampControlSlot,
  sanitizeControlLayout,
  ALL_CONTROL_SLOT_IDS,
} from './controlLayout.ts';
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
import { PEERJS_BROKER_CONFIG, getPeerBrokerHealthUrl, getPeerJsClientOptions } from './peerConfig.ts';
import { classifyConnectionTypeFa, diagnosePeerConnectionFailureFa } from './peerDiagnostics.ts';
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
  assert.equal(MAP_LIST.length, 3);
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

  const code = generatePeerRoomCode(() => 0.25);
  assert.match(code, /^BC-[A-Z0-9]{4}$/);

  assert.equal(roomCodeToHostPeerId('hd7p'), 'bodycam-vanguard-p2p-BC-HD7P');
  assert.equal(roomCodeToHostPeerId('BC-HD7P'), 'bodycam-vanguard-p2p-BC-HD7P');

  const url = buildRoomInviteUrl('https://my-game.run.app/?old=1', 'hd7p', 'warehouse');
  assert.equal(url, 'https://my-game.run.app/?room=BC-HD7P&map=warehouse');

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

  // Award 5 rounds to Alpha and respawning between rounds
  for (let r = 1; r <= 5; r++) {
    room = awardRoundPointToTeam(room, 'alpha');
    assert.equal(room.alphaScore, r);
    assert.equal(room.roundPhase, 'intermission');
    room = startNextAuthoritativeRound(room);
    assert.equal(room.roundPhase, 'playing');
    assert.equal(room.currentRound, r + 1);
    assert.equal(room.players[1].hp, 100, 'All players must respawn with 100 HP at start of next round');
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
  assert.equal(rootBase, 'https://my-public-fps.web.app');
  assert.equal(
    buildRoomInviteUrl(rootBase, 'BC-HD7P', 'docks'),
    'https://my-public-fps.web.app?room=BC-HD7P&map=docks'
  );

  const subPathBase = getCurrentOriginShareBaseUrl('https://example.com', '/arena/');
  assert.equal(
    buildRoomInviteUrl(subPathBase, 'bc-9999', 'outpost'),
    'https://example.com/arena/?room=BC-9999&map=outpost'
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
  assert.equal(room.roundPhase, 'playing');
  assert.equal(room.roundEndsAt, t0 + 13_000 + 90_000);
  assert.equal(room.players[1].alive, true);
  assert.equal(room.players[1].hp, 100);

  // Round 2 -> Round 3 even if previous client HP had been 0
  room = awardRoundPointToTeam(room, 'alpha', t0 + 20_000);
  assert.equal(room.alphaScore, 2);
  room = startNextAuthoritativeRound(room, t0 + 23_000);
  assert.equal(room.currentRound, 3);
  assert.equal(room.roundPhase, 'playing');
  assert.ok(room.players.every((p) => p.alive && p.hp === 100));
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
    buildRoomInviteUrl(ghBase, 'BC-7K2P', 'warehouse'),
    'https://parsa.github.io/bodycam-vanguard/?room=BC-7K2P&map=warehouse'
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
  assert.ok(brokerDownMsg && brokerDownMsg.includes('سرور واسطه'));

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

test('Custom controls layout defaults, clamping, and sanitization handle all 9 control slots safely (including voice mic)', () => {
  const std = getDefaultControlLayout('standard');
  const claw = getDefaultControlLayout('claw');
  const left = getDefaultControlLayout('lefthanded');

  assert.equal(ALL_CONTROL_SLOT_IDS.length, 9);
  assert.ok(ALL_CONTROL_SLOT_IDS.includes('voice'));
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





