import React, { useEffect, useRef, useState, useCallback, useMemo, Suspense } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { hardResetAndReload } from './components/AppErrorBoundary';
import {
  BotDifficultyPreset,
  HudLayoutPreset,
  TrainingConfig,
  DEFAULT_TRAINING_CONFIG,
  TutorialState,
  TutorialStepId,
  WallCollider,
  WeaponId,
  ALL_WEAPON_IDS,
  WEAPON_CATALOG,
  DEFAULT_LOADOUT,
  sanitizeLoadout,
  toggleLoadoutWeapon,
  verifyCheatPasscode,
  CHEAT_UNLOCK_DURATION_SEC,
  tickCheatUnlockTimer,
  normalizeRoomCode,
  computeAutoCornerLean,
  hasLineOfSight3D,
  MapId,
  MAP_LIST,
  isValidMapId,
  getMapArenaHalf,
  CheatConfig,
  DEFAULT_CHEAT_CONFIG,
  sanitizeTrainingConfig,
  sanitizeCheatConfig,
  computeAimAssistAngles,
  resolveEffectiveAimAssistStrength,
  computeSoftAimAssistAngles,
  isRemotePlayerEligibleForAimAssist,
  SLIDE_COOLDOWN_SEC,
  PLAYER_STAND_EYE_HEIGHT,
  createInitialSlideState,
  triggerSlide,
  cancelSlide,
  stepSlideState,
  computeMatchSummaryStats,
  computeAccuracyPercent,
  getEnabledWeaponIndices,
  computeBotParameters,
  calculateWeaponDamage,
  calculateDamageTaken,
  createInitialTutorialState,
  recordTutorialProgress,
  toggleTutorialStepChecklist,
  resolveCircleAABB,
  computeBotStanceTransition,
  computeBotStancePose,
  computeWeaponSlotTelemetry,
  computeSmartBotSteering,
  HitBodyPart,
  resolveHitBodyPart,
  PeerConnectionStatus,
  PeerRole,
  OnlineGameMode,
  TeamId,
  ROUND_MATCH_WIN_SCORE,
  ROUND_COUNTDOWN_SEC,
  KILL_FEED_MAX_ITEMS,
  KILL_FEED_TTL_MS,
  getWeaponShortName,
  isRoundBasedMode,
  isRoundInputLocked,
  isPlayerSpawnProtected,
  selectInitialSpectatorTarget,
  cycleSpectatorTarget,
  getTeamColor,
  getTeamNameFa,
  getTeamSpawnPosition,
  shouldInstantTeleportRemotePlayer,
  formatRoundClock,
  canDamagePlayer,
  formatGameModeFa,
  formatConnectionStatusFa,
  buildRoomInviteUrl,
  parseRoomInviteFromUrl,
  getCurrentOriginShareBaseUrl,
  classifyPingQuality,
  sortScoreboardPlayers,
  resolveMapVoteWinner,
  HostMatchSettings,
  DEFAULT_HOST_MATCH_SETTINGS,
  TeamTacticalPing,
  TeamQuickMessage,
  TeamQuickMessageId,
  TEAM_QUICK_MESSAGES,
  TEAM_QUICK_MSG_TTL_MS,
  isTeamCommsMode,
  pruneExpiredTeamSignals,
  QUICK_TUTORIAL_STORAGE_KEY,
  QuickTutorialState,
  QuickTutorialStepId,
  createQuickTutorialState,
  advanceQuickTutorial,
  shouldAutoStartQuickTutorial,
} from './game/rules';
import {
  CustomControlsLayout,
  CONTROL_SLOT_META,
  CrosshairStyle,
  getDefaultControlLayout,
  loadSavedControlLayout,
  saveControlLayout,
  resetControlLayoutStorage,
  loadShowLeanHudButtons,
  saveShowLeanHudButtons,
  loadShowFpsHud,
  saveShowFpsHud,
  clampCrosshairSize,
  loadCrosshairSize,
  saveCrosshairSize,
  loadCrosshairStyle,
  saveCrosshairStyle,
  loadShowPingHud,
  saveShowPingHud,
  clampFootstepVolume,
  loadFootstepVolume,
  saveFootstepVolume,
  clampAimAssistStrength,
  loadAimAssistStrength,
  saveAimAssistStrength,
  loadSlideAlphaEnabled,
  saveSlideAlphaEnabled,
  loadVibrationEnabled,
  saveVibrationEnabled,
  loadAutoReloadEnabled,
  saveAutoReloadEnabled,
  loadShowAdBillboards,
  saveShowAdBillboards,
  clampCameraMotionIntensity,
  loadCameraMotionIntensity,
  saveCameraMotionIntensity,
  loadReducedMotionEnabled,
  saveReducedMotionEnabled,
  loadAutoQualityEnabled,
  saveAutoQualityEnabled,
  loadShowPerfProfiler,
  saveShowPerfProfiler,
  loadSkinFxMode,
  saveSkinFxMode,
  loadSavedGfxPreset,
  saveGfxPreset,
  loadBatterySaverEnabled,
  saveBatterySaverEnabled,
  loadLowDataModeEnabled,
  saveLowDataModeEnabled,
  loadViewDistanceMode,
  saveViewDistanceMode,
  triggerHapticFeedback,
  resetAllStoredSettings,
} from './game/controlLayout';
import {
  type PlayerAnimState,
  encodePlayerAnimState,
  decodePlayerAnimState,
  resolveLocalPlayerAnimState,
  computeRemoteLocomotionFromSpeed,
  computeHumanoidVisualPose,
  HUMANOID_DEATH_TOTAL_SEC,
  HUMANOID_RESPAWN_DURATION_SEC,
  getWeaponAnimProfile,
  computeWeaponReloadPose,
  computeWeaponSwitchPose,
  createFirstPersonWeaponAnimState,
  stepFirstPersonWeaponKinematics,
  computeTempestDrawPose,
  computeTempestInspectPose,
  computeTempestEmoteViewPose,
  computeEclipseDrawPose,
  computeEclipseInspectPose,
  computeEclipseEmoteViewPose,
  computeKatanaSlashPose,
  getEffectiveCameraMotionScale,
  computeCameraMotionOffsets,
  computeFxBudget,
} from './game/animations';
import {
  detectIsMobileDevice,
  DEFAULT_GFX_PRESET,
  computeEffectivePixelRatio,
  computeEffectiveShadowConfig,
  createAdaptiveQualityState,
  stepAdaptiveQuality,
  getAdaptiveQualityEffects,
  shouldEmitAutoStepDownNotice,
  pickInitialAutoTier,
  createInitialBenchmarkState,
  stepInitialBenchmark,
  createDynamicResolutionState,
  stepDynamicResolution,
  type AutoQualityTierName,
  type ViewDistanceMode,
  getDefaultViewDistanceForPreset,
  resolveViewDistanceConfig,
  shouldCullSmallProp,
  GLOBAL_PARTICLE_CAP,
  resolveParticleCap,
  type SkinFxMode,
  resolveDefaultSkinFxMode,
  resolveEffectiveSkinFx,
  resolveNetworkSkinFx,
  computeRemainingParticleAllowance,
  shouldPauseMainSceneRender,
  resolveActiveSightMode,
  CLIENT_SYNC_INTERVAL_SEC,
  CLIENT_SYNC_INTERVAL_LOW_DATA_SEC,
  computeSmoothedRemoteTransform,
} from './game/perf';
import {
  getMapAdBillboards,
  resolveSafeLocalAdPath,
  computeBillboardDimensions,
} from './game/ads.config';
import { APP_VERSION, BUILD_DATE } from './game/version';
import { PeerMultiplayerManager, AuthoritativeRoomState } from './game/peerOnline';
import { SoundEngine } from './game/sound';
import {
  makeConcreteTexture,
  makeAsphaltTexture,
  makeSandstoneTexture,
  makeCrateTexture,
  makeWallTexture,
  makeFlashTexture,
  makeRedactedFaceTexture,
  makeNameplateTexture,
  disposeSharedProceduralTextures,
  setTextureQualityTier,
  getTextureQualityTier,
  type TextureQualityTier,
  NameplateCosmeticStyle,
} from './game/textures';
import {
  CosmeticCategory,
  CosmeticItem,
  CosmeticsState,
  LEGENDARY_AK47_ID,
  LEGENDARY_KATANA_ID,
  LEGENDARY_RPG_ID,
  LEGENDARY_SNIPER_ID,
  MYTHIC_M249_ID,
  MYTHIC_SHOTGUN_ID,
  OnlineSyncedCosmetics,
  SpinOutcome,
  awardMatchWinSpin,
  canClaimDailyFreeSpin,
  claimDailyFreeSpin,
  equipCosmeticItem,
  executeLuckySpin,
  getCosmeticItem,
  isEclipseBreacherKill,
  isInfernoReaperKill,
  isNovaDragonRpgKill,
  isSakuraKatanaKill,
  isTempestAegisKill,
  isVoidPiercerKill,
  loadCosmeticsState,
  recordKillsForSpinReward,
  resolveEffectiveMuzzleFlashColorInt,
  resolveEffectiveTracerColorInt,
  resolveRemoteWeaponSkinAccentHex,
  resolveTempestRainbowColorInt,
  saveCosmeticsState,
  toOnlineSyncedCosmetics,
  unlockCosmeticItem,
} from './game/cosmetics';
import {
  MYTHIC_M249_EMOTE_ID,
  MYTHIC_M249_PERKS,
  MYTHIC_SHOTGUN_EMOTE_ID,
  MYTHIC_SHOTGUN_PERKS,
  computeEffectiveAimAssistWithMythicPerk,
  getMythicAdsSmoothMultiplier,
  getMythicAdsSwayMultiplier,
  getMythicCameraRecoilMultiplier,
  getMythicShotgunMagSize,
  getMythicShotgunReloadDuration,
  isMythicM249PerksActive,
  isMythicShotgunPerksActive,
} from './game/mythicPerks';
import type { SpinBannerId } from './game/spins.config';
import type { RedeemRewardId } from './game/redeem';
import {
  InfernoVfxPool,
  buildInfernoReaperAK47,
} from './game/infernoReaper3d';
import {
  VoidPiercerVfxPool,
  buildVoidPiercerSniper,
} from './game/voidPiercer3d';
import {
  TempestAegisVfxPool,
  buildTempestAegisM249,
} from './game/tempestAegis3d';
import {
  EclipseBreacherVfxPool,
  buildEclipseBreacherSpas12,
} from './game/eclipseBreacher3d';
import {
  SakuraVfxPool,
  buildSakuraKatana3D,
} from './game/sakuraKatana3d';
import {
  NovaDragonVfxPool,
  buildNovaDragonRpg3D,
} from './game/novaDragonRpg3d';
import type { OnlineRoomSummary } from './components/OnlineModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { ModalLoadingSkeleton } from './components/ModalLoadingSkeleton';
import {
  createDebouncedCallback,
  markModalOpenStart,
  scheduleIdlePrefetch,
} from './utils/perfHelpers';
import { lazyWithPreload } from './utils/lazyWithPreload';

const RedeemCodeSection = lazyWithPreload(() =>
  import('./components/RedeemCodeSection').then((m) => ({ default: m.RedeemCodeSection }))
);
import { VoidSniperScope } from './components/VoidSniperScope';
import { EclipseShotgunSight } from './components/EclipseShotgunSight';
import { TempestLmgSight } from './components/TempestLmgSight';
import {
  createWeaponMaterialLibrary,
  buildUpgradedAK47,
  buildUpgradedM4A1,
  buildUpgradedSniper,
  buildUpgradedMP5,
  buildUpgradedShotgun,
  buildUpgradedPistol,
  buildUpgradedKatana,
  buildUpgradedLMG,
  buildUpgradedDeagle,
  buildUpgradedRPG,
  type WeaponModelResult,
} from './game/weaponModels3d';
import { registerSW } from 'virtual:pwa-register';
import type { ConnectionTransportType, LivePeerTelemetry } from './game/peerDiagnostics';

const TrainingModal = lazyWithPreload(() =>
  import('./components/TrainingModal').then((m) => ({ default: m.TrainingModal }))
);
const TutorialOverlay = lazyWithPreload(() =>
  import('./components/TutorialOverlay').then((m) => ({ default: m.TutorialOverlay }))
);
const OnlineModal = lazyWithPreload(() =>
  import('./components/OnlineModal').then((m) => ({ default: m.OnlineModal }))
);
const ControlsLayoutEditor = lazyWithPreload(() =>
  import('./components/ControlsLayoutEditor').then((m) => ({ default: m.ControlsLayoutEditor }))
);
const CosmeticsHubModal = lazyWithPreload(() =>
  import('./components/CosmeticsHubModal').then((m) => ({ default: m.CosmeticsHubModal }))
);
import { triggerUiFeedback, type UiFeedbackKind } from './utils/uiFeedback';
import './ui-v3/ui-v3.css';
import { UiModeSwitcher3Way } from './ui-v3/UiModeSwitcher3Way';
import { RotatePromptV3 } from './ui-v3/RotatePromptV3';
import {
  RoundBarV3,
  RoundCountdownV3,
  SpawnProtectionV3,
  SpectatorBannerV3,
  ReconnectBannerV3,
  VoiceSpeakersV3,
} from './ui-v3/HudV3SpecialStates';
import { resolveHudV3ControlsStyle, resolveHudV3SurfaceMode } from './ui-v3/hudV3Helpers';
import { UiV3Provider, type UiV3Action, type UiV3StateSnapshot } from './ui-v3/UiV3Context';
import {
  detectBackdropFilterSupport,
  loadUiV3Preferences,
  loadV3ControlLayout,
  normalizeActiveUiVersion,
  resetV3ControlLayoutStorage,
  resolveLiquidGlassCapabilities,
  resolveThreeWayUiSwitch,
  saveUiV3Preferences,
  saveV3ControlLayout,
  type ActiveAppUiVersionId,
  type AppUiVersionId,
  type HudControlsStyle,
  type UiV3Preferences,
} from './ui-v3/uiV3Store';
const MainMenuV3 = lazyWithPreload(() =>
  import('./ui-v3/MainMenuV3').then((m) => ({ default: m.MainMenuV3 }))
);
const SettingsModalV3 = lazyWithPreload(() =>
  import('./ui-v3/SettingsModalV3').then((m) => ({ default: m.SettingsModalV3 }))
);
const OnlineModalV3 = lazyWithPreload(() =>
  import('./ui-v3/OnlineModalV3').then((m) => ({ default: m.OnlineModalV3 }))
);
const CosmeticsHubV3 = lazyWithPreload(() =>
  import('./ui-v3/CosmeticsHubV3').then((m) => ({ default: m.CosmeticsHubV3 }))
);
const OgIntroModalV3 = lazyWithPreload(() =>
  import('./ui-v3/OgIntroModalV3').then((m) => ({ default: m.OgIntroModalV3 }))
);
import {
  GameOverV3,
  MatchResultV3,
  RoundIntermissionV3,
  ScoreboardV3,
} from './ui-v3/MatchOverlaysV3';
import {
  IN_MATCH_SPIN_HINT_FA,
  canOpenSpinWheel,
  computeCosmeticSelectionOutcome,
  isMatchInProgress,
  resolveActiveMatchCosmetics,
} from './ui-v3/stage2Helpers';
import './og/og.css';
import {
  OG_EVENT_CONFIG,
  OG_FEATURE_FLAGS,
  getOgAllowedMaps,
  getOgAllowedWeapons,
  resolveEffectiveFeatures,
} from './og/og.config';
import {
  loadOgState,
  recordOgMatchResult,
  saveOgState,
  type OgPersistedState,
} from './og/ogStore';
import { OgEventBanner } from './og/OgEventBanner';
import { OgIntroModal } from './og/OgIntroModal';
import {
  PeerVoiceChatManager,
  VoiceChatSnapshot,
  VoiceMode,
  VoiceChannelScope,
  loadSavedVoiceMode,
  loadSavedVoiceVolume,
  loadSavedVoiceChannelScope,
  isVoiceChatSecureContext,
} from './game/voiceChat';

type GameScreenState = 'title' | 'playing' | 'paused' | 'gameover';
type GamePlayMode = 'campaign' | 'training';
type GfxPresetName = 'auto' | 'lite' | 'promax' | 'ultramax' | 'ultra' | 'high' | 'med' | 'low' | 'potato';
type SettingsTabId = 'gfx' | 'loadout' | 'controls' | 'cheats';

interface EngineApi {
  startSession: (mode: GamePlayMode, customTraining?: TrainingConfig) => void;
  resumeSession: () => void;
  pauseSession: () => void;
  returnToTitle: () => void;
  wakeRenderLoop: (repaintBackdrop?: boolean) => void;
  haltRenderLoop: () => void;
  selectWeapon: (idx: number) => void;
  cycleNextWeapon: () => void;
  setLoadout: (nextLoadout: WeaponId[]) => void;
  startReload: () => void;
  toggleADS: (force?: boolean) => void;
  cycleManualLean: () => void;
  setManualLean: (dir: -1 | 0 | 1) => void;
  activateAdrenaline: () => void;
  spawnPracticeBot: () => void;
  clearAllBots: () => void;
  refillPlayerAndAmmo: () => void;
  applyPreset: (preset: GfxPresetName) => void;
  updateGfx: (partial: Partial<GfxState>) => void;
  setBatterySaver: (enabled: boolean) => void;
  setLowDataMode: (enabled: boolean) => void;
  setViewDistanceMode: (mode: ViewDistanceMode) => void;
  setMap: (mapId: MapId) => void;
  updateCheats: (partial: Partial<CheatConfig>) => void;
  setBotDifficulty: (diff: BotDifficultyPreset) => void;
  setShowCrosshair: (show: boolean) => void;
  setSensitivity: (sens: number) => void;
  setAdsSensitivity: (sens: number) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setFootstepVolume: (volume: number) => void;
  setShowAdBillboards: (show: boolean) => void;
  updateTrainingLive: (cfg: TrainingConfig) => void;
  createOnlineRoom: (mapId: MapId, mode: OnlineGameMode, password?: string) => void;
  changeOnlineGameMode: (mode: OnlineGameMode) => void;
  updateOnlineRoomRules: (rules: {
    aimAssistAllowed?: boolean;
    slideAllowed?: boolean;
    mythicPerksAllowed?: boolean;
  }) => void;
  updateOnlineMatchSettings: (settings: Partial<HostMatchSettings>) => void;
  sendTeamPingAtReticle: (ndcX?: number, ndcY?: number) => void;
  sendTeamQuickMessage: (messageId: TeamQuickMessageId) => void;
  switchOnlineTeam: (playerId?: string) => void;
  joinOnlineRoom: (code: string, password?: string) => void;
  retryJoinOnlineRoom: () => void;
  leaveOnlineRoom: () => void;
  setOnlineCallsign: (name: string) => void;
  setLobbyReady: (ready: boolean) => void;
  setRoomLocked: (locked: boolean) => void;
  setRoomPassword: (password: string) => void;
  voteOnlineRematch: (ready?: boolean) => void;
  voteOnlineMap: (mapId: MapId) => void;
  getDiagnosticsTelemetry: () => Promise<LivePeerTelemetry>;
  toggleVoiceMic: () => void;
  setVoicePushToTalk: (active: boolean) => void;
  setVoiceMode: (mode: VoiceMode) => void;
  setVoiceVolume: (volume: number) => void;
  setVoiceChannelScope: (scope: VoiceChannelScope) => void;
  toggleMuteVoicePlayer: (playerId: string) => void;
  unlockVoiceAudio: () => void;
  cycleSpectatorTarget: (direction?: 1 | -1) => void;
  triggerSlideAction: () => void;
  triggerMythicEmote: () => void;
  triggerMythicInspect: () => void;
  startQuickTutorial: () => void;
  skipQuickTutorial: (startNormalMatch?: boolean) => void;
  setLocalCosmetics: (cosmetics: OnlineSyncedCosmetics) => void;
  setOgMode: (enabled: boolean) => void;
  playSpinTick: (pitchScale?: number) => void;
  playSpinReveal: (rarity: CosmeticItem['rarity']) => void;
  playAKShot: () => void;
  playInfernoKill: (headshot: boolean) => void;
  playVoidShot: () => void;
  playVoidKill: (headshot: boolean) => void;
  playVoidScopeToggle: (entering: boolean) => void;
  playTempestShot: (heat01: number) => void;
  playTempestKill: (headshot: boolean) => void;
  playTempestReloadPhase: (phase: 'open' | 'swap' | 'close' | 'charge') => void;
  playTempestInspect: () => void;
  playTempestEmote: () => void;
  playEclipseShot: () => void;
  playEclipseKill: (headshot: boolean) => void;
  playEclipseReloadPhase: (phase: 'shell' | 'pump') => void;
  playEclipseSightToggle: (entering: boolean) => void;
  playEclipseInspect: () => void;
  playEclipseEmote: () => void;
  playSakuraSlash: () => void;
  playSakuraKill: (headshot: boolean) => void;
  playNovaRpgLaunch: () => void;
  playNovaRpgExplosion: () => void;
  playNovaRpgKill: (headshot: boolean) => void;
}

interface GfxState {
  preset: GfxPresetName;
  resScale: number;
  shadowMode: 'ultra' | 'soft' | 'basic' | 'off';
  targetFps: number;
  bodycamFx: boolean;
  flashlightOn: boolean;
  vibrance: number;
}

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineApiRef = useRef<EngineApi | null>(null);

  const [screenState, setScreenState] = useState<GameScreenState>('title');
  const [playMode, setPlayMode] = useState<GamePlayMode>('campaign');
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showOnlineModal, setShowOnlineModal] = useState(false);
  const [showSpinModal, setShowSpinModal] = useState(false);
  const [spinInitialBannerId, setSpinInitialBannerId] = useState<SpinBannerId | undefined>(undefined);
  const [showSkinsModal, setShowSkinsModal] = useState(false);
  const [cosmeticsState, setCosmeticsState] = useState<CosmeticsState>(() => loadCosmeticsState());
  const cosmeticsStateRef = useRef<CosmeticsState>(cosmeticsState);
  const [infernoEdgeFlash, setInfernoEdgeFlash] = useState<'none' | 'normal' | 'headshot'>('none');
  const infernoEdgeFlashTimerRef = useRef<number | null>(null);
  const [voidEdgeFlash, setVoidEdgeFlash] = useState<'none' | 'normal' | 'headshot'>('none');
  const voidEdgeFlashTimerRef = useRef<number | null>(null);
  const [mythicEdgeFlash, setMythicEdgeFlash] = useState<'none' | 'normal' | 'headshot'>('none');
  const mythicEdgeFlashTimerRef = useRef<number | null>(null);
  const [eclipseEdgeFlash, setEclipseEdgeFlash] = useState<'none' | 'normal' | 'headshot'>('none');
  const eclipseEdgeFlashTimerRef = useRef<number | null>(null);
  const [spinRewardToast, setSpinRewardToast] = useState<string | null>(null);
  const spinRewardToastTimerRef = useRef<number | null>(null);

  const [currentMap, setCurrentMapState] = useState<MapId>('warehouse');
  const [cheatConfig, setCheatConfig] = useState<CheatConfig>(DEFAULT_CHEAT_CONFIG);
  const [cheatUnlocked, setCheatUnlocked] = useState(false);
  const [cheatUnlockRemainingSec, setCheatUnlockRemainingSec] = useState(0);
  const [cheatPasswordInput, setCheatPasswordInput] = useState('');
  const [cheatPassError, setCheatPassError] = useState<string | null>(null);

  const [loadout, setLoadoutState] = useState<WeaponId[]>(DEFAULT_LOADOUT);
  const [targetLoadoutSlot, setTargetLoadoutSlot] = useState<number>(2);
  const [isSniperScoped, setIsSniperScoped] = useState(false);
  const [isEclipseAdsSight, setIsEclipseAdsSight] = useState(false);
  const [isTempestAdsSight, setIsTempestAdsSight] = useState(false);
  const [manualLeanState, setManualLeanState] = useState<-1 | 0 | 1>(0);
  const [settingsTab, setSettingsTab] = useState<SettingsTabId>('gfx');

  const [onlineConnected, setOnlineConnected] = useState(false);
  const [peerStatus, setPeerStatus] = useState<PeerConnectionStatus>('idle');
  const [peerRole, setPeerRole] = useState<PeerRole>('none');
  const [onlinePlayerName, setOnlinePlayerName] = useState('GHOST-01');
  const [onlineRoom, setOnlineRoom] = useState<OnlineRoomSummary | null>(null);
  const [publicRooms, setPublicRooms] = useState<OnlineRoomSummary[]>([]);
  const [onlineRoomError, setOnlineRoomError] = useState<string | null>(null);
  const [pendingInviteRoomCode, setPendingInviteRoomCode] = useState<string | null>(null);
  const [onlineTransport, setOnlineTransport] = useState<{
    transportType: ConnectionTransportType;
    relayFallbackActive: boolean;
    brokerHost: string;
    hasTurn: boolean;
  }>({
    transportType: 'none',
    relayFallbackActive: false,
    brokerHost: '',
    hasTurn: false,
  });
  const [hudRoomCopied, setHudRoomCopied] = useState(false);
  const [localOnlinePlayerId, setLocalOnlinePlayerId] = useState<string>('');
  const [voiceState, setVoiceState] = useState<VoiceChatSnapshot>(() => ({
    micStatus: 'off',
    micEnabled: false,
    transmitting: false,
    pttPressed: false,
    mode: loadSavedVoiceMode(),
    channelScope: loadSavedVoiceChannelScope(),
    volume: loadSavedVoiceVolume(),
    mutedPlayerIds: [],
    speakingPlayerIds: [],
    connectedCallCount: 0,
    peers: [],
    secureContextOk: isVoiceChatSecureContext().allowed,
    autoplayBlocked: false,
    lastErrorFa: null,
  }));
  const voiceStateRef = useRef<VoiceChatSnapshot>(voiceState);
  const onlinePlayerNameRef = useRef(onlinePlayerName);
  const [roundCountdownSec, setRoundCountdownSec] = useState<number>(0);
  const [localSpawnProtected, setLocalSpawnProtected] = useState<boolean>(false);
  const [spectatorInfo, setSpectatorInfo] = useState<{
    active: boolean;
    targetId: string | null;
    targetName: string;
    targetTeam: TeamId;
    aliveCount: number;
  }>({
    active: false,
    targetId: null,
    targetName: '',
    targetTeam: 'alpha',
    aliveCount: 0,
  });

  const [gfxState, setGfxState] = useState<GfxState>(() => ({
    preset: loadSavedGfxPreset() as GfxPresetName,
    resScale: 1.0,
    shadowMode: 'soft',
    targetFps: 0,
    bodycamFx: true,
    flashlightOn: true,
    vibrance: 1.42,
  }));
  const [batterySaver, setBatterySaver] = useState<boolean>(() => loadBatterySaverEnabled());
  const [lowDataMode, setLowDataMode] = useState<boolean>(() => loadLowDataModeEnabled());
  const [viewDistanceMode, setViewDistanceMode] = useState<ViewDistanceMode>(() =>
    loadViewDistanceMode(getDefaultViewDistanceForPreset(loadSavedGfxPreset(), detectIsMobileDevice()))
  );
  const [botDifficulty, setBotDifficultyState] = useState<BotDifficultyPreset>('medium');
  const [showCrosshair, setShowCrosshairState] = useState(true);
  const [sensitivity, setSensitivityState] = useState(2.65);
  const [adsSensitivity, setAdsSensitivityState] = useState(1.35);
  const [hudLayout, setHudLayout] = useState<HudLayoutPreset>('standard');
  const [hudScale, setHudScale] = useState(1.0);
  const [hudOpacity, setHudOpacity] = useState(0.95);
  const [showLeanHudButtons, setShowLeanHudButtons] = useState<boolean>(() => loadShowLeanHudButtons());
  const [showFpsHud, setShowFpsHud] = useState<boolean>(() => loadShowFpsHud());
  const [showPingHud, setShowPingHud] = useState<boolean>(() => loadShowPingHud());
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [footstepVolume, setFootstepVolumeState] = useState<number>(() => loadFootstepVolume());
  const [aimAssistStrength, setAimAssistStrength] = useState<number>(() => loadAimAssistStrength());
  const [slideAlphaEnabled, setSlideAlphaEnabled] = useState<boolean>(() => loadSlideAlphaEnabled());
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(() => loadVibrationEnabled());
  const [autoReloadEnabled, setAutoReloadEnabled] = useState<boolean>(() => loadAutoReloadEnabled());
  const [showAdBillboards, setShowAdBillboards] = useState<boolean>(() => loadShowAdBillboards());
  const [cameraMotionIntensity, setCameraMotionIntensity] = useState<number>(() => loadCameraMotionIntensity());
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => loadReducedMotionEnabled());
  const [autoQuality, setAutoQuality] = useState<boolean>(() => loadAutoQualityEnabled());
  const [showPerfProfiler, setShowPerfProfiler] = useState<boolean>(() => loadShowPerfProfiler());
  const [skinFxMode, setSkinFxMode] = useState<SkinFxMode>(() => loadSkinFxMode());
  const [bootProgress, setBootProgress] = useState<{ pct: number; labelFa: string; ready: boolean }>({
    pct: 15,
    labelFa: 'راه‌اندازی موتور سه‌بعدی...',
    ready: false,
  });
  const [bootError, setBootError] = useState<string | null>(null);
  const [confirmResetSettings, setConfirmResetSettings] = useState<boolean>(false);
  const [showScoreboard, setShowScoreboard] = useState<boolean>(false);
  const [clientReconnecting, setClientReconnecting] = useState<{ active: boolean; remainingSec: number }>({
    active: false,
    remainingSec: 0,
  });
  const [reconnectTickNow, setReconnectTickNow] = useState<number>(() => Date.now());
  const [crosshairSize, setCrosshairSize] = useState<number>(() => loadCrosshairSize());
  const [crosshairStyle, setCrosshairStyle] = useState<CrosshairStyle>(() => loadCrosshairStyle());
  const [touchMoreOpen, setTouchMoreOpen] = useState<boolean>(false);
  const [uiV3Prefs, setUiV3Prefs] = useState<UiV3Preferences>(() => loadUiV3Preferences());
  const [autoTransparencyOverridden, setAutoTransparencyOverridden] = useState<boolean>(false);
  const [activeUiVersion, setActiveUiVersion] = useState<ActiveAppUiVersionId>(() =>
    normalizeActiveUiVersion(loadUiV3Preferences().uiMode)
  );
  const [pendingUiSwitchNotice, setPendingUiSwitchNotice] = useState<string | null>(null);
  const [measuredActiveFps, setMeasuredActiveFps] = useState<number | null>(null);
  const latestMeasuredFpsRef = useRef<number | null>(null);
  const [supportsBackdropFilter] = useState<boolean>(() => detectBackdropFilterSupport());
  const [ogState, setOgState] = useState<OgPersistedState>(() => loadOgState());
  const [showOgIntro, setShowOgIntro] = useState(false);
  const isOgMode = ogState.active;
  const ogFeatures = useMemo(() => resolveEffectiveFeatures(isOgMode, OG_FEATURE_FLAGS), [isOgMode]);
  const effectiveUiVersion: ActiveAppUiVersionId = isOgMode ? 'legacy' : activeUiVersion;
  const effectiveUiVersionRef = useRef<ActiveAppUiVersionId>(effectiveUiVersion);
  effectiveUiVersionRef.current = effectiveUiVersion;
  const [showLayoutEditor, setShowLayoutEditor] = useState(false);
  const showLayoutEditorRef = useRef<boolean>(false);
  showLayoutEditorRef.current = showLayoutEditor;
  const showSkinsModalRef = useRef<boolean>(false);
  showSkinsModalRef.current = showSkinsModal;
  const showSpinModalRef = useRef<boolean>(false);
  showSpinModalRef.current = showSpinModal;
  const showTrainingModalRef = useRef<boolean>(false);
  showTrainingModalRef.current = showTrainingModal;
  const showOnlineModalRef = useRef<boolean>(false);
  showOnlineModalRef.current = showOnlineModal;
  const showOgIntroRef = useRef<boolean>(false);
  showOgIntroRef.current = showOgIntro;
  const [activeMatchEquipped, setActiveMatchEquipped] = useState<CosmeticsState['equipped'] | null>(null);
  const activeMatchEquippedRef = useRef<CosmeticsState['equipped'] | null>(null);
  const [deferredSkinNoticeFa, setDeferredSkinNoticeFa] = useState<string | null>(null);
  const getGameplayEquipped = () =>
    resolveActiveMatchCosmetics(
      cosmeticsStateRef.current.equipped,
      activeMatchEquippedRef.current,
      screenStateRef.current
    );
  const gameplayEquipped = useMemo(
    () => resolveActiveMatchCosmetics(cosmeticsState.equipped, activeMatchEquipped, screenState),
    [cosmeticsState.equipped, activeMatchEquipped, screenState]
  );
  const [customControlLayout, setCustomControlLayout] = useState<CustomControlsLayout>(() => {
    const initialUi: ActiveAppUiVersionId = loadOgState().active
      ? 'legacy'
      : normalizeActiveUiVersion(loadUiV3Preferences().uiMode);
    if (initialUi === 'v3') return loadV3ControlLayout('standard');
    return loadSavedControlLayout('standard');
  });
  const [touchSetting, setTouchSetting] = useState<'auto' | 'on' | 'off'>('auto');
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [activeWeaponIdx, setActiveWeaponIdx] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Short 1-2 min guided offline tutorial with fixed targets
  const [quickTutorial, setQuickTutorial] = useState<QuickTutorialState | null>(null);
  const quickTutorialRef = useRef<QuickTutorialState | null>(null);

  // Stage 2: Team-only Tactical Ping HUD markers & Quick Comms state
  const [quickCommsOpen, setQuickCommsOpen] = useState(false);
  const [teamQuickMsgs, setTeamQuickMsgs] = useState<TeamQuickMessage[]>([]);
  const [projectedTeamPings, setProjectedTeamPings] = useState<
    Array<{
      id: string;
      senderName: string;
      team: TeamId;
      xPct: number;
      yPct: number;
      distM: number;
      offscreen: boolean;
    }>
  >([]);

  // Stage 3: PWA Service Worker update prompt state (graceful fallback on unsupported browsers)
  const [pwaUpdateReady, setPwaUpdateReady] = useState(false);
  const pwaUpdateFnRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    if (import.meta.env.DEV) return;
    try {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          setPwaUpdateReady(true);
        },
        onRegisterError() {
          // Gracefully ignore SW errors on restricted or unsupported browsers
        },
      });
      pwaUpdateFnRef.current = updateSW;
    } catch {
      // Unsupported browser fallback
    }
  }, []);

  // Listen for dynamic #room=CODE hash invite changes while the app is already open
  useEffect(() => {
    const handleHashInvite = () => {
      const parsed = parseRoomInviteFromUrl(window.location.search, window.location.hash);
      if (parsed.roomCode) {
        if (onlineRoom && onlineRoom.code !== parsed.roomCode) {
          engineApiRef.current?.leaveOnlineRoom();
        }
        setPendingInviteRoomCode(parsed.roomCode);
        setShowOnlineModal(true);
      }
    };
    window.addEventListener('hashchange', handleHashInvite);
    return () => window.removeEventListener('hashchange', handleHashInvite);
  }, [onlineRoom]);

  const handleToggleLeanHudButtons = useCallback((show: boolean) => {
    setShowLeanHudButtons(show);
    saveShowLeanHudButtons(show);
  }, []);

  const handleToggleShowFpsHud = useCallback((show: boolean) => {
    setShowFpsHud(show);
    saveShowFpsHud(show);
  }, []);

  const handleToggleShowPingHud = useCallback((show: boolean) => {
    setShowPingHud(show);
    saveShowPingHud(show);
  }, []);

  const handleChangeFootstepVolume = useCallback((vol: number) => {
    const clamped = clampFootstepVolume(vol);
    setFootstepVolumeState(clamped);
    saveFootstepVolume(clamped);
    engineApiRef.current?.setFootstepVolume(clamped);
  }, []);

  const handleChangeAimAssistStrength = useCallback((val: number) => {
    const clamped = clampAimAssistStrength(val);
    setAimAssistStrength(clamped);
    saveAimAssistStrength(clamped);
  }, []);

  const handleToggleSlideAlpha = useCallback((enabled: boolean) => {
    setSlideAlphaEnabled(enabled);
    saveSlideAlphaEnabled(enabled);
  }, []);

  const handleToggleVibration = useCallback((enabled: boolean) => {
    setVibrationEnabled(enabled);
    saveVibrationEnabled(enabled);
  }, []);

  const handleToggleAutoReload = useCallback((enabled: boolean) => {
    setAutoReloadEnabled(enabled);
    saveAutoReloadEnabled(enabled);
  }, []);

  const handleToggleShowAdBillboards = useCallback((show: boolean) => {
    setShowAdBillboards(show);
    saveShowAdBillboards(show);
    engineApiRef.current?.setShowAdBillboards(show);
  }, []);

  const handleChangeCameraMotionIntensity = useCallback((val: number) => {
    const clamped = clampCameraMotionIntensity(val);
    setCameraMotionIntensity(clamped);
    saveCameraMotionIntensity(clamped);
  }, []);

  const handleToggleReducedMotion = useCallback((enabled: boolean) => {
    setReducedMotion(enabled);
    saveReducedMotionEnabled(enabled);
  }, []);

  const handleToggleAutoQuality = useCallback((enabled: boolean) => {
    setAutoQuality(enabled);
    saveAutoQualityEnabled(enabled);
  }, []);

  const handleTogglePerfProfiler = useCallback((enabled: boolean) => {
    setShowPerfProfiler(enabled);
    saveShowPerfProfiler(enabled);
  }, []);

  const handleChangeSkinFxMode = useCallback((mode: SkinFxMode) => {
    setSkinFxMode(mode);
    saveSkinFxMode(mode);
  }, []);

  const handleToggleBatterySaver = useCallback((enabled: boolean) => {
    setBatterySaver(enabled);
    saveBatterySaverEnabled(enabled);
    batterySaverRef.current = enabled;
    engineApiRef.current?.setBatterySaver(enabled);
  }, []);

  const handleToggleLowDataMode = useCallback((enabled: boolean) => {
    setLowDataMode(enabled);
    saveLowDataModeEnabled(enabled);
    lowDataModeRef.current = enabled;
    engineApiRef.current?.setLowDataMode(enabled);
  }, []);

  const handleChangeViewDistanceMode = useCallback((mode: ViewDistanceMode) => {
    setViewDistanceMode(mode);
    saveViewDistanceMode(mode);
    viewDistanceModeRef.current = mode;
    engineApiRef.current?.setViewDistanceMode(mode);
  }, []);

  const handleResetAllSettings = useCallback(() => {
    resetAllStoredSettings();
    const defaultLayout = getDefaultControlLayout('standard');
    const defaultViewDist = getDefaultViewDistanceForPreset(DEFAULT_GFX_PRESET, detectIsMobileDevice());
    setHudLayout('standard');
    setCustomControlLayout(defaultLayout);
    setHudScale(1.0);
    setHudOpacity(0.95);
    setShowLeanHudButtons(false);
    setShowFpsHud(false);
    setShowPingHud(true);
    setFootstepVolumeState(0.55);
    setCrosshairSize(1.0);
    setCrosshairStyle('cross');
    setAimAssistStrength(70);
    setSlideAlphaEnabled(true);
    setVibrationEnabled(true);
    setAutoReloadEnabled(true);
    setShowAdBillboards(true);
    setCameraMotionIntensity(65);
    setReducedMotion(false);
    setAutoQuality(true);
    setShowPerfProfiler(false);
    setSkinFxMode(resolveDefaultSkinFxMode());
    setBatterySaver(false);
    batterySaverRef.current = false;
    setLowDataMode(false);
    lowDataModeRef.current = false;
    setViewDistanceMode(defaultViewDist);
    viewDistanceModeRef.current = defaultViewDist;
    setTouchSetting('auto');
    setConfirmResetSettings(false);
    engineApiRef.current?.setBatterySaver(false);
    engineApiRef.current?.setLowDataMode(false);
    engineApiRef.current?.setViewDistanceMode(defaultViewDist);
    engineApiRef.current?.setFootstepVolume(0.55);
    engineApiRef.current?.setShowCrosshair(true);
    engineApiRef.current?.setSensitivity(2.65);
    engineApiRef.current?.setAdsSensitivity(1.35);
    engineApiRef.current?.setBotDifficulty('medium');
    engineApiRef.current?.setSoundEnabled(true);
    engineApiRef.current?.setShowAdBillboards(true);
    engineApiRef.current?.applyPreset(DEFAULT_GFX_PRESET);
    engineApiRef.current?.setLoadout(DEFAULT_LOADOUT);
    resetV3ControlLayoutStorage();
    setAutoTransparencyOverridden(false);
    setUiV3Prefs((prev) =>
      saveUiV3Preferences({
        ...prev,
        reduceTransparency: false,
        uiClickSound: true,
        uiHaptics: true,
        minimalHud: false,
        controlsStyle: 'glass',
      })
    );
  }, []);

  const handleChangeCrosshairSize = useCallback((scale: number) => {
    const clamped = clampCrosshairSize(scale);
    setCrosshairSize(clamped);
    saveCrosshairSize(clamped);
  }, []);

  const handleChangeCrosshairStyle = useCallback((style: CrosshairStyle) => {
    setCrosshairStyle(style);
    saveCrosshairStyle(style);
  }, []);

  // Only tick a 1-second countdown timer while at least one player in the room is reconnecting (zero idle cost)
  const hasReconnectingRemote = Boolean(onlineRoom?.players.some((p) => p.disconnected));
  useEffect(() => {
    if (!hasReconnectingRemote) return;
    setReconnectTickNow(Date.now());
    const id = window.setInterval(() => setReconnectTickNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [hasReconnectingRemote]);

  const isMainScenePausedForUi = useMemo(
    () =>
      shouldPauseMainSceneRender({
        screenState,
        anyOverlayOpen:
          showTrainingModal ||
          showSettingsModal ||
          showOnlineModal ||
          showSpinModal ||
          showSkinsModal ||
          showOgIntro ||
          showLayoutEditor,
        isPageHidden: false,
      }),
    [
      screenState,
      showTrainingModal,
      showSettingsModal,
      showOnlineModal,
      showSpinModal,
      showSkinsModal,
      showOgIntro,
      showLayoutEditor,
    ]
  );

  const glassResolution = useMemo(
    () =>
      resolveLiquidGlassCapabilities({
        supportsBackdropFilter,
        gfxPreset: gfxState.preset,
        reducedMotion,
        reduceTransparency: uiV3Prefs.reduceTransparency,
        currentFps: measuredActiveFps,
        isInGameplayHud: screenState === 'playing' && !isMainScenePausedForUi,
        isScenePaused: isMainScenePausedForUi,
        ignoreAutoDegrade: autoTransparencyOverridden,
      }),
    [
      supportsBackdropFilter,
      gfxState.preset,
      reducedMotion,
      uiV3Prefs.reduceTransparency,
      measuredActiveFps,
      screenState,
      isMainScenePausedForUi,
      autoTransparencyOverridden,
    ]
  );

  const hudSurfaceMode = useMemo(
    () =>
      resolveHudV3SurfaceMode({
        reduceTransparency: uiV3Prefs.reduceTransparency,
        gfxPreset: gfxState.preset,
        autoTransparencyOverridden,
      }).surface,
    [uiV3Prefs.reduceTransparency, gfxState.preset, autoTransparencyOverridden]
  );

  // Sync measured FPS into React state ONLY when paused/menu is shown (zero gameplay re-renders)
  useEffect(() => {
    if (isMainScenePausedForUi && latestMeasuredFpsRef.current !== null) {
      const nextFps = latestMeasuredFpsRef.current;
      setMeasuredActiveFps((prev) => (prev === nextFps ? prev : nextFps));
    }
  }, [isMainScenePausedForUi]);

  const resolvedControlsStyle = useMemo(
    () =>
      resolveHudV3ControlsStyle({
        uiVersion: effectiveUiVersion,
        controlsStyle: uiV3Prefs.controlsStyle,
      }),
    [effectiveUiVersion, uiV3Prefs.controlsStyle]
  );

  // Sync root document attribute for scoped UI v3 styling, Liquid Glass fallback mode, HUD surface/minimal/controls style, OG mode, and reduced-motion rules
  useEffect(() => {
    document.documentElement.dataset.uiVersion = effectiveUiVersion;
    document.documentElement.dataset.glassMode = glassResolution.mode;
    document.documentElement.dataset.ogMode = isOgMode ? '1' : '0';
    document.documentElement.dataset.reducedMotion = reducedMotion ? '1' : '0';
    document.documentElement.dataset.hudMinimal =
      effectiveUiVersion === 'v3' && uiV3Prefs.minimalHud ? '1' : '0';
    document.documentElement.dataset.hudSurface = hudSurfaceMode;
    document.documentElement.dataset.controlsStyle = resolvedControlsStyle;
  }, [
    effectiveUiVersion,
    glassResolution.mode,
    isOgMode,
    reducedMotion,
    uiV3Prefs.minimalHud,
    hudSurfaceMode,
    resolvedControlsStyle,
  ]);

  // Apply any deferred mid-match UI switch once player returns to main menu
  useEffect(() => {
    if (screenState === 'title' && activeUiVersion !== uiV3Prefs.uiMode) {
      setActiveUiVersion(uiV3Prefs.uiMode);
      setPendingUiSwitchNotice(null);
    }
  }, [screenState, activeUiVersion, uiV3Prefs.uiMode]);

  // Load each UI's own independent touch button layout when switching active UI
  useEffect(() => {
    if (effectiveUiVersion === 'v3') {
      setCustomControlLayout(loadV3ControlLayout(hudLayout));
    } else {
      setCustomControlLayout(loadSavedControlLayout(hudLayout));
    }
  }, [effectiveUiVersion]);

  // Idle-prefetch lazy modal & 3D preview chunks once 3D engine boot completes
  useEffect(() => {
    if (!bootProgress.ready) return;
    const loaders = [
      ...(effectiveUiVersion === 'v3'
        ? [
            () => SettingsModalV3.preload(),
            () => OnlineModalV3.preload(),
            () => CosmeticsHubV3.preload(),
            () => OgIntroModalV3.preload(),
            () => import('./ui-v3/CosmeticsHubV3').then((m) => m.preloadCosmeticsV3Defaults()),
            () => import('./ui-v3/SettingsModalV3').then((m) => m.preloadSettingsV3Deps()),
          ]
        : [
            () => CosmeticsHubModal.preload(),
            () => OnlineModal.preload(),
            () => import('./components/CosmeticsHubModal').then((m) => m.preloadCosmeticsHubDefaults()),
          ]),
      () => TrainingModal.preload(),
      () => ControlsLayoutEditor.preload(),
      () => RedeemCodeSection.preload(),
    ];
    return scheduleIdlePrefetch(loaders, {
      initialDelayMs: 60,
      stepDelayMs: 20,
      idleTimeoutMs: 120,
      shouldContinue: () =>
        screenStateRef.current === 'title' &&
        (typeof document === 'undefined' || !document.hidden),
    });
  }, [bootProgress.ready, effectiveUiVersion]);

  const handleSelectUiVersion = useCallback(
    (targetUi: AppUiVersionId) => {
      if (isOgMode) return;
      const transition = resolveThreeWayUiSwitch(activeUiVersion, targetUi, screenState);
      setUiV3Prefs((prev) => saveUiV3Preferences({ ...prev, uiMode: transition.nextPreferredUi }));
      setActiveUiVersion(transition.nextActiveUi);
      setPendingUiSwitchNotice(transition.noticeFa);
    },
    [activeUiVersion, screenState, isOgMode]
  );

  const handleToggleReduceTransparency = useCallback((enabled: boolean) => {
    setUiV3Prefs((prev) => saveUiV3Preferences({ ...prev, reduceTransparency: enabled }));
  }, []);

  const handleToggleMinimalHud = useCallback((enabled: boolean) => {
    setUiV3Prefs((prev) => saveUiV3Preferences({ ...prev, minimalHud: enabled }));
  }, []);

  const handleChangeControlsStyle = useCallback((style: HudControlsStyle) => {
    setUiV3Prefs((prev) => saveUiV3Preferences({ ...prev, controlsStyle: style }));
  }, []);

  const handleCycleSpectator = useCallback(() => {
    engineApiRef.current?.cycleSpectatorTarget(1);
  }, []);

  const handleUnlockVoiceAudio = useCallback(() => {
    engineApiRef.current?.unlockVoiceAudio();
  }, []);

  const hudVoiceSpeakingNames = useMemo(() => {
    if (!onlineRoom || voiceState.speakingPlayerIds.length === 0) return [];
    return voiceState.speakingPlayerIds.map((sid) => {
      const sp = onlineRoom.players.find((p) => p.id === sid);
      const label = sp ? sp.name : sid === localOnlinePlayerId ? onlinePlayerName : 'بازیکن';
      return { id: sid, label };
    });
  }, [onlineRoom, voiceState.speakingPlayerIds, localOnlinePlayerId, onlinePlayerName]);

  const handleEnterOgMode = useCallback(() => {
    setShowOgIntro(false);
    setShowSpinModal(false);
    setShowSkinsModal(false);
    setShowOnlineModal(false);
    setShowSettingsModal(false);
    if (onlineRoom && onlineRoom.mode !== 'og') {
      engineApiRef.current?.leaveOnlineRoom();
    }
    if (!OG_FEATURE_FLAGS.duel1v1Map && currentMapRef.current === 'duel') {
      engineApiRef.current?.setMap('warehouse');
    }
    setOgState((prev) =>
      saveOgState({
        ...prev,
        active: true,
        introSeen: true,
        lastMap:
          !OG_FEATURE_FLAGS.duel1v1Map && currentMapRef.current === 'duel'
            ? 'warehouse'
            : currentMapRef.current,
      })
    );
    isOgModeRef.current = true;
    ogFeaturesRef.current = resolveEffectiveFeatures(true, OG_FEATURE_FLAGS);
    engineApiRef.current?.setOgMode(true);
  }, [onlineRoom]);

  const handleExitOgMode = useCallback(() => {
    if (onlineRoom && onlineRoom.mode === 'og') {
      engineApiRef.current?.leaveOnlineRoom();
    }
    setShowSettingsModal(false);
    setShowOnlineModal(false);
    if (screenState !== 'title') {
      engineApiRef.current?.returnToTitle();
    }
    setOgState((prev) => saveOgState({ ...prev, active: false }));
    isOgModeRef.current = false;
    ogFeaturesRef.current = resolveEffectiveFeatures(false, OG_FEATURE_FLAGS);
    engineApiRef.current?.setOgMode(false);
  }, [onlineRoom, screenState]);

  const handleToggleUiClickSound = useCallback((enabled: boolean) => {
    setUiV3Prefs((prev) => saveUiV3Preferences({ ...prev, uiClickSound: enabled }));
  }, []);

  const handleToggleUiHaptics = useCallback((enabled: boolean) => {
    setUiV3Prefs((prev) => saveUiV3Preferences({ ...prev, uiHaptics: enabled }));
  }, []);

  const handleUiFeedback = useCallback(
    (kind: UiFeedbackKind) => {
      triggerUiFeedback(kind, {
        soundEnabled,
        uiClickSound: uiV3Prefs.uiClickSound,
        vibrationEnabled,
        uiHaptics: uiV3Prefs.uiHaptics,
        reducedMotion,
      });
    },
    [soundEnabled, vibrationEnabled, reducedMotion, uiV3Prefs.uiClickSound, uiV3Prefs.uiHaptics]
  );

  const handleChangeHudLayoutPreset = useCallback(
    (preset: HudLayoutPreset) => {
      setHudLayout(preset);
      const presetLayout = getDefaultControlLayout(preset);
      setCustomControlLayout(presetLayout);
      if (effectiveUiVersion === 'v3') {
        saveV3ControlLayout(presetLayout);
      } else {
        saveControlLayout(presetLayout);
      }
    },
    [effectiveUiVersion]
  );

  const handleSaveCustomControlLayout = useCallback(
    (nextLayout: CustomControlsLayout) => {
      setCustomControlLayout(nextLayout);
      if (effectiveUiVersion === 'v3') {
        saveV3ControlLayout(nextLayout);
      } else {
        saveControlLayout(nextLayout);
      }
      setShowLayoutEditor(false);
    },
    [effectiveUiVersion]
  );

  const handleResetCustomControlLayout = useCallback(
    (defaultLayout?: CustomControlsLayout) => {
      if (effectiveUiVersion === 'v3') {
        resetV3ControlLayoutStorage();
      } else {
        resetControlLayoutStorage();
      }
      const fresh = defaultLayout || getDefaultControlLayout(hudLayout);
      setCustomControlLayout(fresh);
    },
    [hudLayout, effectiveUiVersion]
  );

  const [trainingConfig, setTrainingConfig] = useState<TrainingConfig>(DEFAULT_TRAINING_CONFIG);
  const [tutorialState, setTutorialState] = useState<TutorialState>(() => createInitialTutorialState());
  const [gameOverStats, setGameOverStats] = useState({
    score: 0,
    kills: 0,
    deaths: 1,
    wave: 1,
    shotsFired: 0,
    shotsHit: 0,
    headshots: 0,
  });

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  // Refs mirrored for 60Hz loop access without re-mounting WebGL
  const screenStateRef = useRef<GameScreenState>(screenState);
  const playModeRef = useRef<GamePlayMode>(playMode);
  const trainingConfigRef = useRef<TrainingConfig>(trainingConfig);
  const tutorialStateRef = useRef<TutorialState>(tutorialState);
  const touchSettingRef = useRef<'auto' | 'on' | 'off'>(touchSetting);
  const cheatConfigRef = useRef<CheatConfig>(cheatConfig);
  const currentMapRef = useRef<MapId>(currentMap);
  const loadoutRef = useRef<WeaponId[]>(loadout);
  const aimAssistStrengthRef = useRef<number>(aimAssistStrength);
  const slideAlphaEnabledRef = useRef<boolean>(slideAlphaEnabled);
  const vibrationEnabledRef = useRef<boolean>(vibrationEnabled);
  const autoReloadEnabledRef = useRef<boolean>(autoReloadEnabled);
  const showAdBillboardsRef = useRef<boolean>(showAdBillboards);
  const cameraMotionIntensityRef = useRef<number>(cameraMotionIntensity);
  const reducedMotionRef = useRef<boolean>(reducedMotion);
  const autoQualityRef = useRef<boolean>(autoQuality);
  const showPerfProfilerRef = useRef<boolean>(showPerfProfiler);
  const skinFxModeRef = useRef<SkinFxMode>(skinFxMode);
  const batterySaverRef = useRef<boolean>(batterySaver);
  const lowDataModeRef = useRef<boolean>(lowDataMode);
  const viewDistanceModeRef = useRef<ViewDistanceMode>(viewDistanceMode);
  const anyMenuOverlayOpenRef = useRef<boolean>(false);
  const pingMsRef = useRef<number | null>(pingMs);
  const isOgModeRef = useRef<boolean>(isOgMode);
  const ogFeaturesRef = useRef(ogFeatures);

  useEffect(() => {
    isOgModeRef.current = isOgMode;
    ogFeaturesRef.current = ogFeatures;
  }, [isOgMode, ogFeatures]);

  useEffect(() => {
    aimAssistStrengthRef.current = aimAssistStrength;
  }, [aimAssistStrength]);

  useEffect(() => {
    slideAlphaEnabledRef.current = slideAlphaEnabled;
  }, [slideAlphaEnabled]);

  useEffect(() => {
    vibrationEnabledRef.current = vibrationEnabled;
  }, [vibrationEnabled]);

  useEffect(() => {
    autoReloadEnabledRef.current = autoReloadEnabled;
  }, [autoReloadEnabled]);

  useEffect(() => {
    showAdBillboardsRef.current = showAdBillboards;
  }, [showAdBillboards]);

  useEffect(() => {
    cameraMotionIntensityRef.current = cameraMotionIntensity;
  }, [cameraMotionIntensity]);

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
    document.documentElement.dataset.reducedMotion = reducedMotion ? '1' : '0';
  }, [reducedMotion]);

  useEffect(() => {
    autoQualityRef.current = autoQuality;
  }, [autoQuality]);

  useEffect(() => {
    showPerfProfilerRef.current = showPerfProfiler;
  }, [showPerfProfiler]);

  useEffect(() => {
    skinFxModeRef.current = skinFxMode;
  }, [skinFxMode]);

  useEffect(() => {
    batterySaverRef.current = batterySaver;
  }, [batterySaver]);

  useEffect(() => {
    lowDataModeRef.current = lowDataMode;
  }, [lowDataMode]);

  useEffect(() => {
    viewDistanceModeRef.current = viewDistanceMode;
  }, [viewDistanceMode]);

  useEffect(() => {
    const overlayOpen =
      showTrainingModal ||
      showSettingsModal ||
      showOnlineModal ||
      showSpinModal ||
      showSkinsModal ||
      showOgIntro ||
      showLayoutEditor;
    anyMenuOverlayOpenRef.current = overlayOpen;
    engineApiRef.current?.wakeRenderLoop(false);
  }, [
    screenState,
    showTrainingModal,
    showSettingsModal,
    showOnlineModal,
    showSpinModal,
    showSkinsModal,
    showOgIntro,
    showLayoutEditor,
  ]);

  useEffect(() => {
    pingMsRef.current = pingMs;
  }, [pingMs]);

  useEffect(() => {
    loadoutRef.current = loadout;
  }, [loadout]);

  useEffect(() => {
    document.documentElement.style.setProperty('--hud-btn-scale', String(hudScale));
    document.documentElement.style.setProperty(
      '--hud-ui-scale',
      String(Math.min(1.18, Math.max(0.82, hudScale)))
    );
    document.documentElement.style.setProperty('--hud-opacity', String(hudOpacity));
    document.documentElement.style.setProperty('--crosshair-scale', String(crosshairSize));
  }, [hudScale, hudOpacity, crosshairSize]);

  useEffect(() => {
    cosmeticsStateRef.current = cosmeticsState;
    saveCosmeticsState(cosmeticsState);
    const activeEquipped = resolveActiveMatchCosmetics(
      cosmeticsState.equipped,
      activeMatchEquippedRef.current,
      screenStateRef.current
    );
    document.body.dataset.savedAkSkin = cosmeticsState.equipped.ak47_skin || 'default';
    document.body.dataset.activeAkSkin = activeEquipped.ak47_skin || 'default';
    document.body.dataset.savedRpgSkin = cosmeticsState.equipped.rpg_skin || 'default';
    document.body.dataset.activeRpgSkin = activeEquipped.rpg_skin || 'default';
    const chItem = ogFeatures.skinsAndCollection
      ? getCosmeticItem(activeEquipped.crosshair_color)
      : null;
    document.documentElement.style.setProperty('--crosshair-color', chItem?.colorHex || 'rgba(248, 250, 252, 0.94)');
    engineApiRef.current?.setLocalCosmetics(
      ogFeatures.skinsAndCollection ? toOnlineSyncedCosmetics(activeEquipped) : {}
    );
  }, [cosmeticsState, activeMatchEquipped, screenState, ogFeatures.skinsAndCollection]);

  const showSpinToast = (msg: string) => {
    setSpinRewardToast(msg);
    if (spinRewardToastTimerRef.current !== null) {
      window.clearTimeout(spinRewardToastTimerRef.current);
    }
    spinRewardToastTimerRef.current = window.setTimeout(() => {
      setSpinRewardToast(null);
      spinRewardToastTimerRef.current = null;
    }, 3200);
  };

  const triggerInfernoEdgeFlashRef = useRef<(isHeadshot: boolean) => void>(() => {});
  triggerInfernoEdgeFlashRef.current = (isHeadshot: boolean) => {
    if (reducedMotionRef.current) return;
    setInfernoEdgeFlash('none');
    window.requestAnimationFrame(() => {
      setInfernoEdgeFlash(isHeadshot ? 'headshot' : 'normal');
    });
    if (infernoEdgeFlashTimerRef.current !== null) {
      window.clearTimeout(infernoEdgeFlashTimerRef.current);
    }
    infernoEdgeFlashTimerRef.current = window.setTimeout(() => {
      setInfernoEdgeFlash('none');
      infernoEdgeFlashTimerRef.current = null;
    }, isHeadshot ? 580 : 420);
  };

  const triggerVoidEdgeFlashRef = useRef<(isHeadshot: boolean) => void>(() => {});
  triggerVoidEdgeFlashRef.current = (isHeadshot: boolean) => {
    if (reducedMotionRef.current) return;
    setVoidEdgeFlash('none');
    window.requestAnimationFrame(() => {
      setVoidEdgeFlash(isHeadshot ? 'headshot' : 'normal');
    });
    if (voidEdgeFlashTimerRef.current !== null) {
      window.clearTimeout(voidEdgeFlashTimerRef.current);
    }
    voidEdgeFlashTimerRef.current = window.setTimeout(() => {
      setVoidEdgeFlash('none');
      voidEdgeFlashTimerRef.current = null;
    }, isHeadshot ? 580 : 420);
  };

  const triggerMythicEdgeFlashRef = useRef<(isHeadshot: boolean) => void>(() => {});
  triggerMythicEdgeFlashRef.current = (isHeadshot: boolean) => {
    if (reducedMotionRef.current) return;
    setMythicEdgeFlash('none');
    window.requestAnimationFrame(() => {
      setMythicEdgeFlash(isHeadshot ? 'headshot' : 'normal');
    });
    if (mythicEdgeFlashTimerRef.current !== null) {
      window.clearTimeout(mythicEdgeFlashTimerRef.current);
    }
    mythicEdgeFlashTimerRef.current = window.setTimeout(() => {
      setMythicEdgeFlash('none');
      mythicEdgeFlashTimerRef.current = null;
    }, isHeadshot ? 640 : 460);
  };

  const triggerEclipseEdgeFlashRef = useRef<(isHeadshot: boolean) => void>(() => {});
  triggerEclipseEdgeFlashRef.current = (isHeadshot: boolean) => {
    if (reducedMotionRef.current) return;
    setEclipseEdgeFlash('none');
    window.requestAnimationFrame(() => {
      setEclipseEdgeFlash(isHeadshot ? 'headshot' : 'normal');
    });
    if (eclipseEdgeFlashTimerRef.current !== null) {
      window.clearTimeout(eclipseEdgeFlashTimerRef.current);
    }
    eclipseEdgeFlashTimerRef.current = window.setTimeout(() => {
      setEclipseEdgeFlash('none');
      eclipseEdgeFlashTimerRef.current = null;
    }, isHeadshot ? 620 : 450);
  };

  const grantKillSpinProgressRef = useRef<(killsDelta?: number) => void>(() => {});
  grantKillSpinProgressRef.current = (killsDelta = 1) => {
    if (isOgModeRef.current && !ogFeaturesRef.current.spinSystem) return;
    const res = recordKillsForSpinReward(cosmeticsStateRef.current, killsDelta);
    cosmeticsStateRef.current = res.state;
    saveCosmeticsState(res.state);
    setCosmeticsState(res.state);
    if (res.spinsGranted > 0) {
      showSpinToast(`+${res.spinsGranted} اسپین رایگان (پاداش ۲۵ کیل)`);
    }
  };

  const grantMatchWinSpinRef = useRef<() => void>(() => {});
  grantMatchWinSpinRef.current = () => {
    if (isOgModeRef.current && !ogFeaturesRef.current.spinSystem) return;
    const res = awardMatchWinSpin(cosmeticsStateRef.current);
    cosmeticsStateRef.current = res.state;
    saveCosmeticsState(res.state);
    setCosmeticsState(res.state);
    showSpinToast('+۱ اسپین رایگان (پیروزی مسابقه)');
  };

  const handleExecuteSpin = useCallback((bannerId: SpinBannerId): SpinOutcome | null => {
    if (!canOpenSpinWheel(screenStateRef.current, ogFeaturesRef.current.spinSystem)) return null;
    const outcome = executeLuckySpin(cosmeticsStateRef.current, undefined, bannerId);
    if (!outcome) return null;
    cosmeticsStateRef.current = outcome.nextState;
    // Persist synchronously BEFORE animation begins so closing/reloading mid-spin never loses or double-counts the spin
    saveCosmeticsState(outcome.nextState);
    setCosmeticsState(outcome.nextState);
    return outcome;
  }, []);

  const handleClaimDailySpin = useCallback((): boolean => {
    if (!canOpenSpinWheel(screenStateRef.current, ogFeaturesRef.current.spinSystem)) return false;
    const res = claimDailyFreeSpin(cosmeticsStateRef.current);
    if (!res.granted) return false;
    cosmeticsStateRef.current = res.state;
    saveCosmeticsState(res.state);
    setCosmeticsState(res.state);
    return true;
  }, []);

  const handleEquipCosmetic = useCallback((category: CosmeticCategory, itemId: string | null) => {
    const prevSavedEquipped = cosmeticsStateRef.current.equipped;
    const next = equipCosmeticItem(cosmeticsStateRef.current, category, itemId);
    cosmeticsStateRef.current = next;
    saveCosmeticsState(next);
    setCosmeticsState(next);
    const outcome = computeCosmeticSelectionOutcome({
      screenState: screenStateRef.current,
      prevSavedEquipped,
      nextSavedEquipped: next.equipped,
      matchLockedEquipped: activeMatchEquippedRef.current,
    });
    if (outcome.shouldDeferToNextMatch && outcome.noticeFa) {
      setDeferredSkinNoticeFa(outcome.noticeFa);
      showSpinToast(outcome.noticeFa);
    }
  }, []);

  const handleUnlockRewardFromRedeem = useCallback((rewardId: RedeemRewardId) => {
    const res = unlockCosmeticItem(cosmeticsStateRef.current, rewardId);
    if (!res.unlocked) return;
    cosmeticsStateRef.current = res.state;
    saveCosmeticsState(res.state);
    setCosmeticsState(res.state);
  }, []);

  const handleEquipRewardFromRedeem = useCallback((rewardId: RedeemRewardId) => {
    const category: CosmeticCategory =
      rewardId === MYTHIC_SHOTGUN_ID
        ? 'shotgun_skin'
        : rewardId === MYTHIC_M249_ID
          ? 'm249_skin'
          : rewardId === LEGENDARY_RPG_ID
            ? 'rpg_skin'
            : rewardId === LEGENDARY_KATANA_ID
              ? 'katana_skin'
              : rewardId === LEGENDARY_SNIPER_ID
                ? 'sniper_skin'
                : 'ak47_skin';
    handleEquipCosmetic(category, rewardId);
  }, [handleEquipCosmetic]);

  const openModalUrgent = useCallback((modalKey: string, openFn: () => void) => {
    markModalOpenStart(modalKey);
    anyMenuOverlayOpenRef.current = true;
    engineApiRef.current?.haltRenderLoop();
    openFn();
  }, []);

  const handleCloseCosmeticsModal = useCallback(() => {
    setShowSpinModal(false);
    setShowSkinsModal(false);
    setSpinInitialBannerId(undefined);
    setDeferredSkinNoticeFa(null);
  }, []);

  const cosmeticsSoundCallbacks = useMemo(
    () => ({
      onPlayTick: (pitchScale?: number) => engineApiRef.current?.playSpinTick(pitchScale),
      onPlayReveal: (rarity: CosmeticItem['rarity']) => engineApiRef.current?.playSpinReveal(rarity),
      onPlayFireSound: () => engineApiRef.current?.playAKShot(),
      onPlayInfernoKillSound: (hs: boolean) => engineApiRef.current?.playInfernoKill(hs),
      onPlayVoidShotSound: () => engineApiRef.current?.playVoidShot(),
      onPlayVoidKillSound: (hs: boolean) => engineApiRef.current?.playVoidKill(hs),
      onPlayVoidScopeSound: (entering: boolean) => engineApiRef.current?.playVoidScopeToggle(entering),
      onPlayTempestShotSound: (heat01: number) => engineApiRef.current?.playTempestShot(heat01),
      onPlayTempestKillSound: (hs: boolean) => engineApiRef.current?.playTempestKill(hs),
      onPlayTempestReloadPhaseSound: (phase: 'open' | 'swap' | 'close' | 'charge') =>
        engineApiRef.current?.playTempestReloadPhase(phase),
      onPlayTempestInspectSound: () => engineApiRef.current?.playTempestInspect(),
      onPlayTempestEmoteSound: () => engineApiRef.current?.playTempestEmote(),
      onPlayEclipseShotSound: () => engineApiRef.current?.playEclipseShot(),
      onPlayEclipseKillSound: (hs: boolean) => engineApiRef.current?.playEclipseKill(hs),
      onPlayEclipseReloadPhaseSound: (phase: 'shell' | 'pump') =>
        engineApiRef.current?.playEclipseReloadPhase(phase),
      onPlayEclipseSightSound: (entering: boolean) =>
        engineApiRef.current?.playEclipseSightToggle(entering),
      onPlayEclipseInspectSound: () => engineApiRef.current?.playEclipseInspect(),
      onPlayEclipseEmoteSound: () => engineApiRef.current?.playEclipseEmote(),
      onPlaySakuraSlashSound: () => engineApiRef.current?.playSakuraSlash(),
      onPlaySakuraKillSound: (hs: boolean) => engineApiRef.current?.playSakuraKill(hs),
      onPlayNovaRpgLaunchSound: () => engineApiRef.current?.playNovaRpgLaunch(),
      onPlayNovaRpgExplosionSound: () => engineApiRef.current?.playNovaRpgExplosion(),
      onPlayNovaRpgKillSound: (hs: boolean) => engineApiRef.current?.playNovaRpgKill(hs),
    }),
    []
  );

  useEffect(() => {
    screenStateRef.current = screenState;
    document.body.dataset.state = screenState;
  }, [screenState]);

  useEffect(() => {
    playModeRef.current = playMode;
  }, [playMode]);

  useEffect(() => {
    trainingConfigRef.current = trainingConfig;
  }, [trainingConfig]);

  useEffect(() => {
    tutorialStateRef.current = tutorialState;
  }, [tutorialState]);

  useEffect(() => {
    touchSettingRef.current = touchSetting;
  }, [touchSetting]);

  useEffect(() => {
    cheatConfigRef.current = cheatConfig;
  }, [cheatConfig]);

  useEffect(() => {
    currentMapRef.current = currentMap;
  }, [currentMap]);

  // 30-Second Security Auto-Lock Timer for Cheat & Aim Assist Panel (locks Aim Assist back to 10%)
  useEffect(() => {
    if (!cheatUnlocked) {
      setCheatUnlockRemainingSec(0);
      return;
    }
    const timer = window.setInterval(() => {
      setCheatUnlockRemainingSec((prev) => {
        const res = tickCheatUnlockTimer(prev, 1);
        if (!res.unlocked) {
          setCheatUnlocked(false);
          setCheatPasswordInput('');
          engineApiRef.current?.updateCheats({
            aimAssistEnabled: true,
            aimAssistStrength: 10,
          });
        }
        return res.remainingSec;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cheatUnlocked]);

  const advanceTutorialFromGame = useCallback((stepId: TutorialStepId, amount = 1, sound?: SoundEngine) => {
    if (playModeRef.current !== 'training' || !trainingConfigRef.current.tutorialEnabled) return;
    const { nextState, newlyCompletedStep } = recordTutorialProgress(tutorialStateRef.current, stepId, amount);
    if (nextState !== tutorialStateRef.current) {
      tutorialStateRef.current = nextState;
      setTutorialState(nextState);
      if (newlyCompletedStep && sound) {
        sound.playTutorialComplete();
      }
    }
  }, []);

  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    // Detect Software WebGL (SwiftShader / llvmpipe) per Three.js skill
    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param) ?? '');
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const sound = new SoundEngine();
    sound.footstepVolume = loadFootstepVolume();
    const canvas = document.createElement('canvas');
    canvas.id = 'game-canvas';
    canvas.dataset.testid = 'game-canvas';
    mountEl.innerHTML = '';
    mountEl.appendChild(canvas);

    const isMobileDevice = detectIsMobileDevice();
    setBootError(null);
    setBootProgress({ pct: 30, labelFa: 'آماده‌سازی موتور سه‌بعدی...', ready: false });

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: !isSoftwareGl && !isMobileDevice,
        powerPreference: 'high-performance',
      });
    } catch {
      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: false,
          powerPreference: 'default',
          failIfMajorPerformanceCaveat: false,
        });
      } catch {
        setBootError('مرورگر یا کارت گرافیک دستگاه نتوانست موتور سه‌بعدی (WebGL) را اجرا کند.');
        return;
      }
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.24;

    const maxAniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x182232);
    scene.fog = new THREE.FogExp2(0x182232, 0.017);

    // Studio RoomEnvironment reflection map (non-fatal fallback on limited GPUs; disposed cleanly on unmount)
    let envRT: THREE.WebGLRenderTarget | null = null;
    try {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const roomEnvScene = new RoomEnvironment();
      envRT = pmremGenerator.fromScene(roomEnvScene, 0.04);
      scene.environment = envRT.texture;
      roomEnvScene.dispose();
      pmremGenerator.dispose();
    } catch {
      envRT = null;
      scene.environment = null;
    }

    let bodycamMode = true;
    let baseFov = 88;
    const camera = new THREE.PerspectiveCamera(baseFov, window.innerWidth / window.innerHeight, 0.06, 170);
    camera.rotation.order = 'YXZ';
    scene.add(camera);

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xcfe4ff, 0x3b2d26, 0.85);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfff4e2, 1.15);
    dirLight.position.set(22, 38, 18);
    dirLight.castShadow = !isSoftwareGl;
    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.camera.near = 2;
    dirLight.shadow.camera.far = 110;
    const dSize = isMobileDevice ? 24 : 34;
    dirLight.shadow.camera.left = -dSize;
    dirLight.shadow.camera.right = dSize;
    dirLight.shadow.camera.top = dSize;
    dirLight.shadow.camera.bottom = -dSize;
    dirLight.shadow.bias = -0.0005;
    dirLight.shadow.normalBias = 0.02;
    scene.add(dirLight);
    scene.add(dirLight.target);

    // Tactical Weapon Flashlight
    const flashlight = new THREE.SpotLight(0xfff4e0, 2.8, 38, Math.PI * 0.25, 0.45, 1.2);
    flashlight.position.set(0.14, -0.1, -0.25);
    const flashTarget = new THREE.Object3D();
    flashTarget.position.set(0.04, -0.1, -12);
    camera.add(flashlight);
    camera.add(flashTarget);
    flashlight.target = flashTarget;

    // Post-Processing Bodycam Lens Pipeline with Color Vibrance
    let renderTarget: THREE.WebGLRenderTarget | null = null;
    const postScene = new THREE.Scene();
    const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const postUniforms = {
      tDiffuse: { value: null as THREE.Texture | null },
      uTime: { value: 0 },
      uFisheye: { value: 0.34 },
      uChromatic: { value: 0.01 },
      uGrain: { value: 0.042 },
      uUltraSharpen: { value: 0.38 },
      uVibrance: { value: 1.42 },
      uDamage: { value: 0.0 },
    };

    const postMat = new THREE.ShaderMaterial({
      uniforms: postUniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        precision mediump float;
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform float uFisheye;
        uniform float uChromatic;
        uniform float uGrain;
        uniform float uUltraSharpen;
        uniform float uVibrance;
        uniform float uDamage;
        varying vec2 vUv;

        float rand(vec2 co) {
          return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
        }

        void main() {
          vec2 centered = vUv - 0.5;
          float r2 = dot(centered, centered);
          vec2 uv = vUv;

          if (uFisheye > 0.001) {
            float k = uFisheye;
            uv = centered * (1.0 + k * r2) * (1.0 - k * 0.24) + 0.5;
          }

          if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
            gl_FragColor = vec4(0.015, 0.018, 0.024, 1.0);
            return;
          }

          float ca = uChromatic * r2;
          float r = texture2D(tDiffuse, clamp(uv + vec2(ca, 0.0), 0.001, 0.999)).r;
          float g = texture2D(tDiffuse, uv).g;
          float b = texture2D(tDiffuse, clamp(uv - vec2(ca, 0.0), 0.001, 0.999)).b;
          vec3 col = vec3(r, g, b);

          if (uUltraSharpen > 0.01) {
            vec2 texel = vec2(0.0008, 0.0008);
            vec3 n1 = texture2D(tDiffuse, clamp(uv + vec2(texel.x, 0.0), 0.001, 0.999)).rgb;
            vec3 n2 = texture2D(tDiffuse, clamp(uv - vec2(texel.x, 0.0), 0.001, 0.999)).rgb;
            vec3 n3 = texture2D(tDiffuse, clamp(uv + vec2(0.0, texel.y), 0.001, 0.999)).rgb;
            vec3 n4 = texture2D(tDiffuse, clamp(uv - vec2(0.0, texel.y), 0.001, 0.999)).rgb;
            vec3 blur = 0.25 * (n1 + n2 + n3 + n4);
            col += (col - blur) * uUltraSharpen;
            vec3 bright = max(vec3(0.0), col - vec3(0.72));
            col += bright * 0.42 * uUltraSharpen;
          }

          // Rich Color Vibrance & Contrast Grading
          float luma = dot(col, vec3(0.299, 0.587, 0.114));
          col = mix(vec3(luma), col, uVibrance);
          col *= 1.12;
          col = mix(col, col * col * (3.0 - 2.0 * col), 0.22);

          float n = (rand(uv * 240.0 + fract(uTime * 15.3)) - 0.5) * uGrain;
          col += n;

          float vig = smoothstep(0.98, 0.26, length(centered) * 1.18);
          col *= mix(0.55, 1.0, vig);
          col = mix(col, vec3(0.85, 0.06, 0.1), uDamage * (1.0 - vig * 0.55) * 0.65);

          gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });
    const postQuadGeo = new THREE.PlaneGeometry(2, 2);
    const postQuad = new THREE.Mesh(postQuadGeo, postMat);
    postScene.add(postQuad);

    const initialSavedPreset = loadSavedGfxPreset() as GfxPresetName;
    let activeAutoSubTier: AutoQualityTierName = pickInitialAutoTier(isMobileDevice);
    let initialBenchmark = createInitialBenchmarkState(activeAutoSubTier);
    let dynamicRes = createDynamicResolutionState(1.0);
    let lastEffectiveDpr = -1;
    let lastShadowMapEnabled: boolean | null = null;
    let lastAutoStepDownNoticeMs = -100000;
    let lastKnownMaterialCount = 0;
    let baseMapFogDensity = 0.015;
    let activePropCullMaxDist = isMobileDevice ? 38 : 52;
    let mapInitialized = false;

    const gfx: GfxState = {
      preset: initialSavedPreset,
      resScale: 1.0,
      shadowMode: isSoftwareGl ? 'off' : 'soft',
      targetFps: 0,
      bodycamFx: true,
      flashlightOn: true,
      vibrance: 1.42,
    };

    function syncGfxStateForPreset(presetName: GfxPresetName, subTier: AutoQualityTierName) {
      const tierToApply: GfxPresetName = presetName === 'auto' ? subTier : presetName;
      if (tierToApply === 'promax') {
        gfx.resScale = 1.65;
        gfx.shadowMode = isSoftwareGl ? 'off' : 'ultra';
        gfx.bodycamFx = true;
        gfx.flashlightOn = true;
        gfx.vibrance = 1.6;
        gfx.targetFps = 0;
      } else if (tierToApply === 'ultramax') {
        gfx.resScale = 1.45;
        gfx.shadowMode = isSoftwareGl ? 'off' : 'ultra';
        gfx.bodycamFx = true;
        gfx.flashlightOn = true;
        gfx.vibrance = 1.52;
        gfx.targetFps = 0;
      } else if (tierToApply === 'ultra') {
        gfx.resScale = 1.25;
        gfx.shadowMode = isSoftwareGl ? 'off' : 'ultra';
        gfx.bodycamFx = true;
        gfx.flashlightOn = true;
      } else if (tierToApply === 'high') {
        gfx.resScale = 1.0;
        gfx.shadowMode = isSoftwareGl ? 'off' : 'soft';
        gfx.bodycamFx = true;
        gfx.flashlightOn = true;
      } else if (tierToApply === 'med') {
        gfx.resScale = 0.75;
        gfx.shadowMode = isSoftwareGl ? 'off' : 'basic';
        gfx.bodycamFx = true;
        gfx.flashlightOn = true;
      } else if (tierToApply === 'lite') {
        gfx.resScale = 0.75;
        gfx.shadowMode = 'off';
        gfx.bodycamFx = false;
        gfx.flashlightOn = false;
        gfx.targetFps = 0;
      } else if (tierToApply === 'low') {
        gfx.resScale = 0.55;
        gfx.shadowMode = 'off';
        gfx.bodycamFx = false;
        gfx.flashlightOn = false;
      } else {
        // 'potato' — Super lightweight for low-end mobile phones
        gfx.resScale = 0.45;
        gfx.shadowMode = 'off';
        gfx.bodycamFx = false;
        gfx.flashlightOn = false;
        gfx.targetFps = 60;
      }
    }
    syncGfxStateForPreset(initialSavedPreset, activeAutoSubTier);

    const resolveDesiredTexTier = (): TextureQualityTier => {
      const effectiveTier = gfx.preset === 'auto' ? activeAutoSubTier : gfx.preset;
      if (effectiveTier === 'lite' || effectiveTier === 'potato' || batterySaverRef.current) {
        return 'lite';
      }
      return 'standard';
    };

    let activeArenaHalf = getMapArenaHalf(currentMapRef.current);
    let adaptiveQuality = createAdaptiveQualityState();

    function applyViewDistanceSettings() {
      const vdCfg = resolveViewDistanceConfig(
        viewDistanceModeRef.current,
        gfx.preset,
        batterySaverRef.current
      );
      activePropCullMaxDist = vdCfg.propCullMaxDist;
      if (camera.far !== vdCfg.cameraFar) {
        camera.far = vdCfg.cameraFar;
        camera.updateProjectionMatrix();
      }
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.density = baseMapFogDensity * vdCfg.fogDensityScale;
      }
    }

    function rebuildRenderTarget() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const aqEffects = getAdaptiveQualityEffects(adaptiveQuality.stage);
      const effectiveDpr = computeEffectivePixelRatio({
        devicePixelRatio: window.devicePixelRatio || 1,
        resScale: gfx.resScale,
        preset: gfx.preset,
        isMobile: isMobileDevice,
        isSoftwareGl,
        autoQualityResScale: aqEffects.resScaleMultiplier,
        dynamicResScale: autoQualityRef.current ? dynamicRes.scale : 1.0,
        batterySaver: batterySaverRef.current,
      });
      lastEffectiveDpr = effectiveDpr;
      renderer.setPixelRatio(effectiveDpr);
      renderer.setSize(w, h);

      if (renderTarget) {
        renderTarget.dispose();
        renderTarget = null;
      }
      if (gfx.bodycamFx && !isSoftwareGl) {
        const rw = Math.max(160, Math.floor(w * effectiveDpr));
        const rh = Math.max(120, Math.floor(h * effectiveDpr));
        renderTarget = new THREE.WebGLRenderTarget(rw, rh, {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          format: THREE.RGBAFormat,
          depthBuffer: true,
          stencilBuffer: false,
        });
        postUniforms.tDiffuse.value = renderTarget.texture;
      }
    }

    function applyShadowSettings() {
      const effectiveShadowMode = batterySaverRef.current ? 'off' : gfx.shadowMode;
      const cfg = computeEffectiveShadowConfig({
        shadowMode: effectiveShadowMode,
        isMobile: isMobileDevice,
        isSoftwareGl,
        autoQualityStage: adaptiveQuality.stage,
        arenaHalf: activeArenaHalf,
      });
      const shadowEnabledChanged = lastShadowMapEnabled !== cfg.enabled;
      lastShadowMapEnabled = cfg.enabled;
      renderer.shadowMap.enabled = cfg.enabled;
      renderer.shadowMap.type = cfg.soft ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap;
      dirLight.castShadow = cfg.enabled;

      if (dirLight.shadow.map) {
        dirLight.shadow.map.dispose();
        (dirLight.shadow as unknown as { map: null }).map = null;
      }
      if (dirLight.shadow.mapSize.width !== cfg.mapSize) {
        dirLight.shadow.mapSize.set(cfg.mapSize, cfg.mapSize);
      }
      dirLight.shadow.camera.left = -cfg.frustumHalf;
      dirLight.shadow.camera.right = cfg.frustumHalf;
      dirLight.shadow.camera.top = cfg.frustumHalf;
      dirLight.shadow.camera.bottom = -cfg.frustumHalf;
      dirLight.shadow.camera.updateProjectionMatrix();

      if (shadowEnabledChanged) {
        scene.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.material) {
            if (Array.isArray(mesh.material)) mesh.material.forEach((m) => (m.needsUpdate = true));
            else mesh.material.needsUpdate = true;
          }
        });
      }
      renderer.shadowMap.needsUpdate = true;
    }

    function applyLightingSettings() {
      const isUltraTier = gfx.preset === 'promax' || gfx.preset === 'ultramax' || gfx.preset === 'ultra';
      const isLiteEnv =
        gfx.preset === 'lite' ||
        gfx.preset === 'potato' ||
        batterySaverRef.current ||
        (gfx.preset === 'auto' && activeAutoSubTier === 'lite');
      scene.environment = isLiteEnv || !envRT ? null : envRT.texture;
      flashlight.visible = gfx.flashlightOn && !batterySaverRef.current;
      flashlight.intensity = gfx.preset === 'promax' ? 3.5 : isUltraTier ? 3.2 : 2.6;
      hemiLight.intensity = flashlight.visible ? 0.9 : 1.14;
      dirLight.intensity = flashlight.visible ? 1.22 : 1.35;
      renderer.toneMappingExposure = gfx.preset === 'promax' ? 1.34 : isUltraTier ? 1.3 : 1.22;
    }

    function applyBodycamFXSettings() {
      const isUltraTier = gfx.preset === 'promax' || gfx.preset === 'ultramax' || gfx.preset === 'ultra';
      bodycamMode = gfx.bodycamFx;
      baseFov = bodycamMode ? 88 : 75;
      postUniforms.uFisheye.value =
        gfx.preset === 'low' || gfx.preset === 'potato' || gfx.preset === 'lite' ? 0.18 : 0.34;
      postUniforms.uChromatic.value = isUltraTier ? 0.012 : gfx.preset === 'high' ? 0.01 : 0.006;
      postUniforms.uGrain.value =
        gfx.preset === 'low' || gfx.preset === 'potato' || gfx.preset === 'lite' ? 0.025 : 0.038;
      postUniforms.uUltraSharpen.value =
        isMobileDevice || gfx.preset === 'lite'
          ? 0.0
          : gfx.preset === 'promax'
            ? 0.92
            : gfx.preset === 'ultramax'
              ? 0.82
              : gfx.preset === 'ultra'
                ? 0.72
                : gfx.preset === 'high'
                  ? 0.35
                  : 0.0;
      postUniforms.uVibrance.value = gfx.vibrance;
      rebuildRenderTarget();
    }

    // =========================================================
    // 4 VIBRANT ARENA MAPS + BATCHED STATIC MESHES, MERGED PROPS & GPU DISPOSAL
    // =========================================================
    const wallColliders: WallCollider[] = [];
    const shootableEnvironment: THREE.Object3D[] = [];
    const mapRootGroup = new THREE.Group();
    scene.add(mapRootGroup);

    // Lazy per-map procedural texture getters (backed by sharedTextureCache in textures.ts)
    const getConcreteTex = () => makeConcreteTexture(maxAniso);
    const getAsphaltTex = () => makeAsphaltTexture(maxAniso);
    const getSandstoneTex = () => makeSandstoneTexture(maxAniso);
    const getWallTex = () => makeWallTexture(maxAniso);
    const getCrateTexAmber = () => makeCrateTexture('#6b481b', '#ff9f1c', maxAniso);
    const getCrateTexCyan = () => makeCrateTexture('#1b4965', '#00f0ff', maxAniso);
    const getCrateTexCrimson = () => makeCrateTexture('#691e2c', '#ff2e4c', maxAniso);
    const getCrateTexEmerald = () => makeCrateTexture('#1b4d3e', '#10b981', maxAniso);

    // Helper: bake a non-indexed, vertex-colored part geometry so multi-color props render in 1 draw call
    function makeVertexColoredPart(
      rawGeo: THREE.BufferGeometry,
      hexColor: number,
      pos: [number, number, number] = [0, 0, 0],
      rot: [number, number, number] = [0, 0, 0]
    ): THREE.BufferGeometry {
      const geo = rawGeo.index ? rawGeo.toNonIndexed() : rawGeo.clone();
      rawGeo.dispose();
      if (geo.attributes.uv) geo.deleteAttribute('uv');
      if (rot[0] !== 0) geo.rotateX(rot[0]);
      if (rot[1] !== 0) geo.rotateY(rot[1]);
      if (rot[2] !== 0) geo.rotateZ(rot[2]);
      if (pos[0] !== 0 || pos[1] !== 0 || pos[2] !== 0) geo.translate(pos[0], pos[1], pos[2]);
      const count = geo.attributes.position.count;
      const colors = new Float32Array(count * 3);
      const col = new THREE.Color(hexColor);
      for (let i = 0; i < count; i++) {
        colors[i * 3] = col.r;
        colors[i * 3 + 1] = col.g;
        colors[i * 3 + 2] = col.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      return geo;
    }

    function buildMergedPotGeometry(flowerHex: number): THREE.BufferGeometry {
      const parts = [
        makeVertexColoredPart(new THREE.CylinderGeometry(0.32, 0.21, 0.48, 8), 0xd95f2a, [0, 0.24, 0]),
        makeVertexColoredPart(new THREE.CylinderGeometry(0.36, 0.33, 0.09, 8), 0xd95f2a, [0, 0.46, 0]),
        makeVertexColoredPart(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 8), 0x3b2618, [0, 0.49, 0]),
        makeVertexColoredPart(new THREE.ConeGeometry(0.24, 0.52, 5), 0x16c65a, [0, 0.72, 0]),
        makeVertexColoredPart(new THREE.ConeGeometry(0.24, 0.52, 5), 0x16c65a, [0.1, 0.66, 0.06], [0, 0, -0.35]),
        makeVertexColoredPart(new THREE.ConeGeometry(0.24, 0.52, 5), 0x16c65a, [-0.1, 0.66, -0.06], [0, 0, 0.35]),
        makeVertexColoredPart(new THREE.DodecahedronGeometry(0.11, 0), flowerHex, [0, 0.96, 0]),
      ];
      const merged = mergeGeometries(parts, false);
      parts.forEach((p) => p.dispose());
      return merged || new THREE.CylinderGeometry(0.32, 0.21, 0.85, 8);
    }

    // Single-draw-call pot geometries (cuts 98 pot draw calls -> 14!)
    const potMergedGeoA = buildMergedPotGeometry(0xff2e63);
    const potMergedGeoB = buildMergedPotGeometry(0xffbe0b);
    const potVertexMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.68, metalness: 0.08 });

    // Shared materials for static batched tire stacks & desert palms
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1c2026, roughness: 0.88, metalness: 0.15 });
    const tireRimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4, metalness: 0.65 });
    const palmTrunkMat = new THREE.MeshStandardMaterial({ color: 0x785338, roughness: 0.9 });
    const palmLeafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.65, side: THREE.DoubleSide });

    // Shared map-reusable crate & neon materials (disposed on unmount)
    const neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const neonAmberMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const neonPinkMat = new THREE.MeshBasicMaterial({ color: 0xff2e63 });
    const alphaTrimMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const bravoTrimMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });

    // Per-map GPU disposables tracker (prevents GPU leaks when switching maps!)
    const mapDisposableGeometries: THREE.BufferGeometry[] = [];
    const mapDisposableMaterials: THREE.Material[] = [];

    function clearArenaMap() {
      while (mapRootGroup.children.length > 0) {
        mapRootGroup.remove(mapRootGroup.children[0]);
      }
      while (mapDisposableGeometries.length > 0) {
        mapDisposableGeometries.pop()?.dispose();
      }
      while (mapDisposableMaterials.length > 0) {
        mapDisposableMaterials.pop()?.dispose();
      }
      wallColliders.length = 0;
      shootableEnvironment.length = 0;
      pots.length = 0;
    }

    interface DestructiblePot {
      group: THREE.Group;
      hitMesh: THREE.Mesh;
      x: number;
      y: number;
      z: number;
      alive: boolean;
      respawnTimer: number;
    }
    const pots: DestructiblePot[] = [];

    function spawnPotAt(x: number, y: number, z: number, flowerVariant = 0) {
      const g = new THREE.Group();
      g.position.set(x, y, z);

      const mesh = new THREE.Mesh(flowerVariant % 2 === 0 ? potMergedGeoA : potMergedGeoB, potVertexMat);
      mesh.frustumCulled = true;
      g.add(mesh);
      mapRootGroup.add(g);

      const potObj: DestructiblePot = {
        group: g,
        hitMesh: mesh,
        x,
        y,
        z,
        alive: true,
        respawnTimer: 0,
      };
      mesh.userData = { pot: potObj };
      shootableEnvironment.push(mesh);
      pots.push(potObj);
    }

    // Active static batch collectors (populated during buildArenaMap, then merged by material)
    let activeShootableBatches: Map<THREE.Material, THREE.BufferGeometry[]> | null = null;
    let activeDecorBatches: Map<THREE.Material, THREE.BufferGeometry[]> | null = null;

    function pushBatchGeometry(
      batchMap: Map<THREE.Material, THREE.BufferGeometry[]>,
      material: THREE.Material,
      rawGeo: THREE.BufferGeometry
    ) {
      const g = rawGeo.index ? rawGeo.toNonIndexed() : rawGeo;
      if (g !== rawGeo) rawGeo.dispose();
      const list = batchMap.get(material);
      if (list) list.push(g);
      else batchMap.set(material, [g]);
    }

    function addDecorBox(
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      material: THREE.Material
    ) {
      const geo = new THREE.BoxGeometry(w, h, d);
      geo.translate(x, y, z);
      if (activeDecorBatches) {
        pushBatchGeometry(activeDecorBatches, material, geo);
      } else {
        const mesh = new THREE.Mesh(geo, material);
        mapDisposableGeometries.push(geo);
        mapRootGroup.add(mesh);
      }
    }

    function addTireStack(x: number, z: number, count = 3) {
      for (let i = 0; i < count; i++) {
        const tGeo = new THREE.TorusGeometry(0.38, 0.16, 7, 12);
        tGeo.rotateX(Math.PI / 2);
        tGeo.translate(x + (i % 2 === 1 ? 0.04 : -0.03), 0.16 + i * 0.3, z);
        if (activeDecorBatches) {
          pushBatchGeometry(activeDecorBatches, tireMat, tGeo);
        } else {
          mapDisposableGeometries.push(tGeo);
          mapRootGroup.add(new THREE.Mesh(tGeo, tireMat));
        }
      }
      const capGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.06, 10);
      capGeo.translate(x, count * 0.3, z);
      if (activeDecorBatches) {
        pushBatchGeometry(activeDecorBatches, tireRimMat, capGeo);
      } else {
        mapDisposableGeometries.push(capGeo);
        mapRootGroup.add(new THREE.Mesh(capGeo, tireRimMat));
      }

      wallColliders.push({
        x,
        z,
        w: 1.0,
        d: 1.0,
        height: count * 0.32,
        minX: x - 0.5,
        maxX: x + 0.5,
        minZ: z - 0.5,
        maxZ: z + 0.5,
      });
    }

    function addMapBox(
      x: number,
      z: number,
      w: number,
      h: number,
      d: number,
      material: THREE.Material,
      yBase = 0,
      collidable = true
    ) {
      const geo = new THREE.BoxGeometry(w, h, d);
      geo.translate(x, yBase + h / 2, z);
      if (activeShootableBatches) {
        pushBatchGeometry(activeShootableBatches, material, geo);
      } else {
        const mesh = new THREE.Mesh(geo, material);
        mesh.castShadow = !isSoftwareGl;
        mesh.receiveShadow = !isSoftwareGl;
        mapDisposableGeometries.push(geo);
        mapRootGroup.add(mesh);
        shootableEnvironment.push(mesh);
      }
      if (collidable && yBase < 1.8) {
        wallColliders.push({
          x,
          z,
          w,
          d,
          height: yBase + h,
          minX: x - w / 2,
          maxX: x + w / 2,
          minZ: z - d / 2,
          maxZ: z + d / 2,
        });
      }
    }

    function addDesertPalmTree(x: number, z: number) {
      const trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 4.6, 8);
      trunkGeo.translate(x, 2.3, z);
      if (activeDecorBatches) {
        pushBatchGeometry(activeDecorBatches, palmTrunkMat, trunkGeo);
      } else {
        mapDisposableGeometries.push(trunkGeo);
        mapRootGroup.add(new THREE.Mesh(trunkGeo, palmTrunkMat));
      }

      for (let i = 0; i < 6; i++) {
        const frondGeo = new THREE.BoxGeometry(0.45, 0.08, 2.2);
        const angle = (i * Math.PI) / 3;
        frondGeo.rotateX(0.38);
        frondGeo.rotateY(angle);
        frondGeo.translate(x + Math.sin(angle) * 0.95, 4.55, z + Math.cos(angle) * 0.95);
        if (activeDecorBatches) {
          pushBatchGeometry(activeDecorBatches, palmLeafMat, frondGeo);
        } else {
          mapDisposableGeometries.push(frondGeo);
          mapRootGroup.add(new THREE.Mesh(frondGeo, palmLeafMat));
        }
      }

      wallColliders.push({
        x,
        z,
        w: 0.7,
        d: 0.7,
        height: 4.6,
        minX: x - 0.35,
        maxX: x + 0.35,
        minZ: z - 0.35,
        maxZ: z + 0.35,
      });
    }

    function flushStaticMapBatches() {
      if (activeShootableBatches) {
        activeShootableBatches.forEach((geos, mat) => {
          const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
          if (geos.length > 1) geos.forEach((g) => g.dispose());
          if (!merged) return;
          merged.computeBoundingSphere();
          mapDisposableGeometries.push(merged);
          const mesh = new THREE.Mesh(merged, mat);
          mesh.castShadow = !isSoftwareGl;
          mesh.receiveShadow = !isSoftwareGl;
          mesh.frustumCulled = true;
          mapRootGroup.add(mesh);
          shootableEnvironment.push(mesh);
        });
        activeShootableBatches.clear();
        activeShootableBatches = null;
      }
      if (activeDecorBatches) {
        activeDecorBatches.forEach((geos, mat) => {
          const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
          if (geos.length > 1) geos.forEach((g) => g.dispose());
          if (!merged) return;
          merged.computeBoundingSphere();
          mapDisposableGeometries.push(merged);
          const mesh = new THREE.Mesh(merged, mat);
          mesh.castShadow = false;
          mesh.receiveShadow = false;
          mesh.frustumCulled = true;
          mapRootGroup.add(mesh);
        });
        activeDecorBatches.clear();
        activeDecorBatches = null;
      }
    }

    // Purely visual, static per-map ad billboards (never added to wallColliders or shootableEnvironment)
    const adBillboardGroup = new THREE.Group();
    adBillboardGroup.name = 'adBillboardGroup';
    adBillboardGroup.visible = showAdBillboardsRef.current;
    scene.add(adBillboardGroup);

    const adTextureLoader = new THREE.TextureLoader();
    const adTextureCache = new Map<string, THREE.Texture>();
    const adPendingLoads = new Map<string, Array<(tex: THREE.Texture | null) => void>>();
    const adBillboardDisposables: Array<{ dispose: () => void }> = [];
    let adBuildGeneration = 0;
    let adDisposed = false;
    const adFrameMat = new THREE.MeshBasicMaterial({ color: 0x141b26 });

    function clearAdBillboards() {
      while (adBillboardGroup.children.length > 0) {
        adBillboardGroup.remove(adBillboardGroup.children[0]);
      }
      while (adBillboardDisposables.length > 0) {
        adBillboardDisposables.pop()?.dispose();
      }
    }

    function loadCachedAdTexture(localPath: string, onDone: (tex: THREE.Texture | null) => void) {
      const existing = adTextureCache.get(localPath);
      if (existing) {
        onDone(existing);
        return;
      }
      const queued = adPendingLoads.get(localPath);
      if (queued) {
        queued.push(onDone);
        return;
      }
      adPendingLoads.set(localPath, [onDone]);
      adTextureLoader.load(
        localPath,
        (tex) => {
          const callbacks = adPendingLoads.get(localPath) || [];
          adPendingLoads.delete(localPath);
          if (adDisposed) {
            tex.dispose();
            return;
          }
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.generateMipmaps = true;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.anisotropy = maxAniso;
          tex.needsUpdate = true;
          adTextureCache.set(localPath, tex);
          callbacks.forEach((cb) => cb(tex));
        },
        undefined,
        () => {
          // Silently skip missing or unreadable images with zero runtime error
          const callbacks = adPendingLoads.get(localPath) || [];
          adPendingLoads.delete(localPath);
          callbacks.forEach((cb) => cb(null));
        }
      );
    }

    function buildMapAdBillboards(mapId: MapId) {
      adBuildGeneration += 1;
      const gen = adBuildGeneration;
      clearAdBillboards();
      adBillboardGroup.visible = showAdBillboardsRef.current;
      if (!showAdBillboardsRef.current) return;

      const configs = getMapAdBillboards(mapId);
      configs.forEach((cfg) => {
        const safePath = resolveSafeLocalAdPath(cfg.imagePath);
        if (!safePath) return;
        loadCachedAdTexture(safePath, (tex) => {
          if (!tex || adDisposed || gen !== adBuildGeneration || !showAdBillboardsRef.current) return;
          const img = tex.image as { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number } | undefined;
          const natW = img?.naturalWidth || img?.width || 1;
          const natH = img?.naturalHeight || img?.height || 1;
          const { width, height } = computeBillboardDimensions(natW, natH, cfg.maxWidth, cfg.maxHeight);

          const board = new THREE.Group();
          board.name = `ad-${cfg.id}`;
          board.position.set(cfg.position.x, cfg.position.y, cfg.position.z);
          board.rotation.y = cfg.rotationY;

          // Thin matte dark frame matching the game's minimal tactical look
          const frameBorder = 0.055;
          const frameDepth = 0.024;
          const frameGeo = new THREE.BoxGeometry(width + frameBorder * 2, height + frameBorder * 2, frameDepth);
          const frameMesh = new THREE.Mesh(frameGeo, adFrameMat);
          frameMesh.castShadow = false;
          frameMesh.receiveShadow = false;
          board.add(frameMesh);

          // Thin front poster plane — readable on dark maps without glaring, polygonOffset prevents z-fighting
          const posterGeo = new THREE.PlaneGeometry(width, height);
          const posterMat = new THREE.MeshBasicMaterial({
            map: tex,
            color: 0xd8dde4,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1,
          });
          const posterMesh = new THREE.Mesh(posterGeo, posterMat);
          posterMesh.position.z = frameDepth / 2 + 0.004;
          posterMesh.castShadow = false;
          posterMesh.receiveShadow = false;
          board.add(posterMesh);

          adBillboardDisposables.push(frameGeo, posterGeo, posterMat);
          adBillboardGroup.add(board);
        });
      });
    }

    function buildArenaMap(mapId: MapId) {
      activeArenaHalf = getMapArenaHalf(mapId);
      const ARENA_HALF = activeArenaHalf;
      // Clear and dispose previous map GPU resources cleanly
      clearArenaMap();
      activeShootableBatches = new Map();
      activeDecorBatches = new Map();

      const trackMat = <T extends THREE.Material>(m: T): T => {
        mapDisposableMaterials.push(m);
        return m;
      };
      const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
        mapDisposableGeometries.push(g);
        return g;
      };

      const matAmber = trackMat(new THREE.MeshStandardMaterial({ color: 0xffffff, map: getCrateTexAmber(), roughness: 0.68, metalness: 0.2 }));
      const matCyan = trackMat(new THREE.MeshStandardMaterial({ color: 0xffffff, map: getCrateTexCyan(), roughness: 0.68, metalness: 0.22 }));
      const matCrimson = trackMat(new THREE.MeshStandardMaterial({ color: 0xffffff, map: getCrateTexCrimson(), roughness: 0.68, metalness: 0.22 }));
      const matEmerald = trackMat(new THREE.MeshStandardMaterial({ color: 0xffffff, map: getCrateTexEmerald(), roughness: 0.68, metalness: 0.2 }));

      if (mapId === 'warehouse') {
        // MAP 1: NEON TACTICAL WAREHOUSE
        scene.background = new THREE.Color(0x142030);
        scene.fog = new THREE.FogExp2(0x142030, 0.015);
        hemiLight.color.setHex(0xd8ecff);
        hemiLight.groundColor.setHex(0x3d2e24);
        dirLight.color.setHex(0xfff1d6);

        const floorMesh = new THREE.Mesh(
          trackGeo(new THREE.PlaneGeometry(ARENA_HALF * 2, ARENA_HALF * 2)),
          trackMat(new THREE.MeshStandardMaterial({ color: 0xe2e8f0, map: getConcreteTex(), roughness: 0.78, metalness: 0.12 }))
        );
        floorMesh.rotation.x = -Math.PI / 2;
        floorMesh.receiveShadow = !isSoftwareGl;
        mapRootGroup.add(floorMesh);
        shootableEnvironment.push(floorMesh);

        const zoneCenter = new THREE.Mesh(
          trackGeo(new THREE.RingGeometry(4.2, 4.55, 28)),
          trackMat(new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide }))
        );
        zoneCenter.rotation.x = -Math.PI / 2;
        zoneCenter.position.y = 0.02;
        mapRootGroup.add(zoneCenter);

        const periMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xdbeafe, map: getWallTex(), roughness: 0.8, metalness: 0.12 }));
        addMapBox(0, -ARENA_HALF, ARENA_HALF * 2, 5.8, 1.6, periMat);
        addMapBox(0, ARENA_HALF, ARENA_HALF * 2, 5.8, 1.6, periMat);
        addMapBox(-ARENA_HALF, 0, 1.6, 5.8, ARENA_HALF * 2, periMat);
        addMapBox(ARENA_HALF, 0, 1.6, 5.8, ARENA_HALF * 2, periMat);

        [-ARENA_HALF + 0.85, ARENA_HALF - 0.85].forEach((zPos, i) => {
          addDecorBox(0, 3.8, zPos, ARENA_HALF * 1.8, 0.16, 0.12, i === 0 ? neonCyanMat : neonAmberMat);
        });

        const pillarMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.65, metalness: 0.28 }));
        addMapBox(0, 0, 3.2, 1.15, 3.2, matCyan);
        addMapBox(0, -10, 6.5, 2.8, 2.2, matAmber);
        addMapBox(0, 10, 6.5, 2.8, 2.2, matCrimson);
        addMapBox(-10, 0, 2.2, 2.8, 6.5, matCyan);
        addMapBox(10, 0, 2.2, 2.8, 6.5, matEmerald);

        addMapBox(-14, -14, 3.6, 3.8, 3.6, pillarMat);
        addMapBox(14, -14, 3.6, 3.8, 3.6, pillarMat);
        addMapBox(-14, 14, 3.6, 3.8, 3.6, pillarMat);
        addMapBox(14, 14, 3.6, 3.8, 3.6, pillarMat);

        addMapBox(-20, -6, 4.5, 2.4, 2.4, matCrimson);
        addMapBox(20, 6, 4.5, 2.4, 2.4, matCrimson);
        addMapBox(-6, 21, 2.4, 2.4, 4.5, matAmber);
        addMapBox(6, -21, 2.4, 2.4, 4.5, matEmerald);

        addMapBox(-6, -5, 1.8, 1.1, 1.8, matCyan);
        addMapBox(6, 5, 1.8, 1.1, 1.8, matAmber);
        addMapBox(-19, 17, 2.2, 1.2, 2.2, matEmerald);
        addMapBox(19, -17, 2.2, 1.2, 2.2, matCrimson);

        // Outer Mega-Warehouse Sector Buildings & Corner Watchtowers (Expanded 96x96m Arena)
        addMapBox(-32, -28, 7.5, 3.6, 3.2, pillarMat);
        addMapBox(32, 28, 7.5, 3.6, 3.2, pillarMat);
        addMapBox(-28, 32, 3.2, 3.6, 7.5, matAmber);
        addMapBox(28, -32, 3.2, 3.6, 7.5, matCyan);
        addMapBox(0, -34, 9.0, 3.0, 2.6, matCrimson);
        addMapBox(0, 34, 9.0, 3.0, 2.6, matEmerald);
        addMapBox(-34, 0, 2.6, 3.0, 9.0, matCyan);
        addMapBox(34, 0, 2.6, 3.0, 9.0, matAmber);
        addMapBox(-38, -38, 4.8, 4.2, 4.8, pillarMat);
        addMapBox(38, -38, 4.8, 4.2, 4.8, pillarMat);
        addMapBox(-38, 38, 4.8, 4.2, 4.8, pillarMat);
        addMapBox(38, 38, 4.8, 4.2, 4.8, pillarMat);

        [-32, -16, 0, 16, 32].forEach((zPos, idx) => {
          addDecorBox(0, 5.7, zPos, ARENA_HALF * 2 - 2, 0.35, 0.45, idx % 2 === 1 ? neonCyanMat : neonAmberMat);
        });
      } else if (mapId === 'docks') {
        // MAP 2: CARGO CONTAINER DOCKS XL (96m x 96m)
        scene.background = new THREE.Color(0x0b192c);
        scene.fog = new THREE.FogExp2(0x0b192c, 0.011);
        hemiLight.color.setHex(0x7dd3fc);
        hemiLight.groundColor.setHex(0x1e293b);
        dirLight.color.setHex(0xe0f2fe);

        const floorMesh = new THREE.Mesh(
          trackGeo(new THREE.PlaneGeometry(ARENA_HALF * 2, ARENA_HALF * 2)),
          trackMat(new THREE.MeshStandardMaterial({ color: 0xdbeafe, map: getAsphaltTex(), roughness: 0.55, metalness: 0.25 }))
        );
        floorMesh.rotation.x = -Math.PI / 2;
        floorMesh.receiveShadow = !isSoftwareGl;
        mapRootGroup.add(floorMesh);
        shootableEnvironment.push(floorMesh);

        const periMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x94a3b8, map: getWallTex(), roughness: 0.75, metalness: 0.25 }));
        addMapBox(0, -ARENA_HALF, ARENA_HALF * 2, 5.8, 1.6, periMat);
        addMapBox(0, ARENA_HALF, ARENA_HALF * 2, 5.8, 1.6, periMat);
        addMapBox(-ARENA_HALF, 0, 1.6, 5.8, ARENA_HALF * 2, periMat);
        addMapBox(ARENA_HALF, 0, 1.6, 5.8, ARENA_HALF * 2, periMat);

        addMapBox(-9, -8, 3.2, 3.2, 8.5, matCrimson);
        addMapBox(-9, -8, 3.0, 2.8, 8.2, matAmber, 3.2, false);
        addMapBox(9, 8, 3.2, 3.2, 8.5, matCyan);
        addMapBox(9, 8, 3.0, 2.8, 8.2, matEmerald, 3.2, false);

        addMapBox(11, -11, 8.0, 3.2, 3.2, matAmber);
        addMapBox(-11, 11, 8.0, 3.2, 3.2, matEmerald);

        addMapBox(0, 0, 4.6, 0.95, 4.6, matCyan);
        addMapBox(-18, 0, 3.0, 2.5, 5.5, matCrimson);
        addMapBox(18, 0, 3.0, 2.5, 5.5, matAmber);
        addMapBox(0, -19, 5.5, 2.5, 2.8, matEmerald);
        addMapBox(0, 19, 5.5, 2.5, 2.8, matCrimson);

        // Outer Port Shipping Container Yards (Expanded 96x96m Arena)
        addMapBox(-30, -24, 3.4, 3.4, 10.0, matCyan);
        addMapBox(30, 24, 3.4, 3.4, 10.0, matCrimson);
        addMapBox(-24, 30, 10.0, 3.4, 3.4, matAmber);
        addMapBox(24, -30, 10.0, 3.4, 3.4, matEmerald);
        addMapBox(0, -34, 8.5, 3.2, 3.2, matCyan);
        addMapBox(0, 34, 8.5, 3.2, 3.2, matAmber);
        addMapBox(-34, 0, 3.2, 3.2, 8.5, matEmerald);
        addMapBox(34, 0, 3.2, 3.2, 8.5, matCrimson);

        const craneMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5, metalness: 0.5 }));
        addMapBox(-22, 0, 1.6, 8.5, 1.6, craneMat);
        addMapBox(22, 0, 1.6, 8.5, 1.6, craneMat);
        addMapBox(0, 0, 46, 1.1, 1.4, craneMat, 8.0, false);
        addMapBox(0, 0, 42, 0.25, 0.35, neonPinkMat, 7.7, false);
      } else if (mapId === 'duel') {
        // MAP 4: COMPACT SYMMETRICAL 1v1 DUEL ARENA (38m x 38m — Fair 3-Lane Layout, Zero Large Blind Spots, High Mobile FPS)
        scene.background = new THREE.Color(0x111a26);
        scene.fog = new THREE.FogExp2(0x111a26, 0.014);
        hemiLight.color.setHex(0xdceeff);
        hemiLight.groundColor.setHex(0x232d3b);
        dirLight.color.setHex(0xf8fafc);

        const floorMesh = new THREE.Mesh(
          trackGeo(new THREE.PlaneGeometry(ARENA_HALF * 2, ARENA_HALF * 2)),
          trackMat(new THREE.MeshStandardMaterial({ color: 0xdbe6f2, map: getConcreteTex(), roughness: 0.74, metalness: 0.14 }))
        );
        floorMesh.rotation.x = -Math.PI / 2;
        floorMesh.receiveShadow = !isSoftwareGl;
        mapRootGroup.add(floorMesh);
        shootableEnvironment.push(floorMesh);

        // Symmetrical center line & duel ring (visual clarity for both spawns)
        const midLine = new THREE.Mesh(
          trackGeo(new THREE.PlaneGeometry(ARENA_HALF * 1.9, 0.24)),
          trackMat(new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45, side: THREE.DoubleSide }))
        );
        midLine.rotation.x = -Math.PI / 2;
        midLine.position.y = 0.02;
        mapRootGroup.add(midLine);

        const duelRing = new THREE.Mesh(
          trackGeo(new THREE.RingGeometry(2.6, 2.85, 24)),
          trackMat(new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.5, side: THREE.DoubleSide }))
        );
        duelRing.rotation.x = -Math.PI / 2;
        duelRing.position.y = 0.025;
        mapRootGroup.add(duelRing);

        const periMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xcbd5e1, map: getWallTex(), roughness: 0.78, metalness: 0.15 }));
        const slateCoverMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x475569, map: getWallTex(), roughness: 0.68, metalness: 0.22 }));

        // Compact 38x38m Perimeter Walls
        addMapBox(0, -ARENA_HALF, ARENA_HALF * 2, 5.6, 1.4, periMat);
        addMapBox(0, ARENA_HALF, ARENA_HALF * 2, 5.6, 1.4, periMat);
        addMapBox(-ARENA_HALF, 0, 1.4, 5.6, ARENA_HALF * 2, periMat);
        addMapBox(ARENA_HALF, 0, 1.4, 5.6, ARENA_HALF * 2, periMat);

        // Team-side orientation light strips (Alpha = +Z blue, Bravo = -Z red)
        addDecorBox(0, 3.6, ARENA_HALF - 0.78, ARENA_HALF * 1.65, 0.16, 0.12, alphaTrimMat);
        addDecorBox(0, 3.6, -ARENA_HALF + 0.78, ARENA_HALF * 1.65, 0.16, 0.12, bravoTrimMat);

        // Center low tactical block (crouch/slide cover, clear standing sightline)
        addMapBox(0, 0, 3.4, 1.08, 2.2, matCyan);

        // Mirrored Mid-Flank Tall Peek Blocks (symmetric X & Z)
        addMapBox(-7.8, 0, 2.2, 2.5, 5.0, slateCoverMat);
        addMapBox(7.8, 0, 2.2, 2.5, 5.0, slateCoverMat);

        // Mirrored Diagonal Mid Cover Crates (fair 1v1 angles on both sides)
        addMapBox(-4.6, 5.8, 2.8, 2.0, 1.6, matCyan);
        addMapBox(4.6, 5.8, 2.8, 2.0, 1.6, matCyan);
        addMapBox(-4.6, -5.8, 2.8, 2.0, 1.6, matCrimson);
        addMapBox(4.6, -5.8, 2.8, 2.0, 1.6, matCrimson);

        // Mirrored Spawn Cover: waist-high center barrier (clear view + slide cover) & flanking peek shields
        addMapBox(0, 10.4, 3.2, 1.02, 1.0, slateCoverMat);
        addMapBox(0, -10.4, 3.2, 1.02, 1.0, slateCoverMat);
        addMapBox(-6.0, 10.8, 2.4, 2.15, 1.2, slateCoverMat);
        addMapBox(6.0, 10.8, 2.4, 2.15, 1.2, slateCoverMat);
        addMapBox(-6.0, -10.8, 2.4, 2.15, 1.2, slateCoverMat);
        addMapBox(6.0, -10.8, 2.4, 2.15, 1.2, slateCoverMat);

        // Outer Flank Low Cover Blocks (fast slide-peek fights, zero deep blind corners)
        addMapBox(-13.2, 6.2, 2.2, 1.2, 3.0, matAmber);
        addMapBox(13.2, 6.2, 2.2, 1.2, 3.0, matAmber);
        addMapBox(-13.2, -6.2, 2.2, 1.2, 3.0, matAmber);
        addMapBox(13.2, -6.2, 2.2, 1.2, 3.0, matAmber);

        // Minimal overhead trusses (3 lightweight ceiling beams)
        [-9, 0, 9].forEach((zPos, idx) => {
          addDecorBox(0, 5.45, zPos, ARENA_HALF * 2 - 2, 0.24, 0.34, idx === 1 ? alphaTrimMat : slateCoverMat);
        });
      } else {
        // MAP 3: DESERT CANYON OUTPOST XL (96m x 96m — Warm Sunlit Sandstone Fortress, 4 Sniper Towers, Arches & Oasis)
        scene.background = new THREE.Color(0xc89666);
        scene.fog = new THREE.FogExp2(0xc28e5c, 0.0068);
        hemiLight.color.setHex(0xffe4b5);
        hemiLight.groundColor.setHex(0x7c4a27);
        dirLight.color.setHex(0xfff3d1);

        const sandstoneTex = getSandstoneTex();
        const floorMesh = new THREE.Mesh(
          trackGeo(new THREE.PlaneGeometry(ARENA_HALF * 2, ARENA_HALF * 2)),
          trackMat(new THREE.MeshStandardMaterial({ color: 0xfcd34d, map: sandstoneTex, roughness: 0.86, metalness: 0.04 }))
        );
        floorMesh.rotation.x = -Math.PI / 2;
        floorMesh.receiveShadow = !isSoftwareGl;
        mapRootGroup.add(floorMesh);
        shootableEnvironment.push(floorMesh);

        // Sandstone Courtyard Paved Ring
        const courtyardOct = new THREE.Mesh(
          trackGeo(new THREE.RingGeometry(3.8, 8.2, 8)),
          trackMat(new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.85, side: THREE.DoubleSide }))
        );
        courtyardOct.rotation.x = -Math.PI / 2;
        courtyardOct.position.y = 0.02;
        mapRootGroup.add(courtyardOct);

        const sandWallMat = trackMat(
          new THREE.MeshStandardMaterial({
            color: 0xfbbf24,
            map: sandstoneTex,
            roughness: 0.8,
            metalness: 0.06,
          })
        );
        const terracottaMat = trackMat(
          new THREE.MeshStandardMaterial({
            color: 0xc2410c,
            roughness: 0.72,
            metalness: 0.08,
          })
        );
        const hescoMat = trackMat(
          new THREE.MeshStandardMaterial({
            color: 0xa8a29e,
            map: getCrateTexAmber(),
            roughness: 0.82,
            metalness: 0.12,
          })
        );

        // Perimeter Fortress Crenellated Walls
        addMapBox(0, -ARENA_HALF, ARENA_HALF * 2, 5.8, 1.6, sandWallMat);
        addMapBox(0, ARENA_HALF, ARENA_HALF * 2, 5.8, 1.6, sandWallMat);
        addMapBox(-ARENA_HALF, 0, 1.6, 5.8, ARENA_HALF * 2, sandWallMat);
        addMapBox(ARENA_HALF, 0, 1.6, 5.8, ARENA_HALF * 2, sandWallMat);

        // Central Open Arched Pavilion
        addMapBox(-2.4, -2.4, 1.2, 3.4, 1.2, sandWallMat);
        addMapBox(2.4, -2.4, 1.2, 3.4, 1.2, sandWallMat);
        addMapBox(-2.4, 2.4, 1.2, 3.4, 1.2, sandWallMat);
        addMapBox(2.4, 2.4, 1.2, 3.4, 1.2, sandWallMat);
        addMapBox(0, 0, 1.8, 1.1, 1.8, matAmber);
        addMapBox(0, 0, 6.4, 0.5, 6.4, terracottaMat, 3.4, false);
        addMapBox(0, 0, 4.2, 0.6, 4.2, sandWallMat, 3.9, false);

        // Fortress Compound L-Walls & Arched Gateways
        addMapBox(-9.5, -10, 6.8, 3.2, 1.6, sandWallMat);
        addMapBox(9.5, 10, 6.8, 3.2, 1.6, sandWallMat);
        addMapBox(-10, 9.5, 1.6, 3.2, 6.8, sandWallMat);
        addMapBox(10, -9.5, 1.6, 3.2, 6.8, sandWallMat);

        // Overhead ArchLintels connecting compound lanes (non-collidable)
        addMapBox(-9.5, -6.2, 6.4, 0.3, 3.2, matCrimson, 3.25, false);
        addMapBox(9.5, 6.2, 6.4, 0.3, 3.2, matCyan, 3.25, false);
        addMapBox(-6.2, 9.5, 3.2, 0.3, 6.4, matAmber, 3.25, false);
        addMapBox(6.2, -9.5, 3.2, 0.3, 6.4, matEmerald, 3.25, false);

        // Climbable Sniper Watchtowers (NW, SE + Outer NE, SW Bastions)
        addMapBox(-18, -18, 5.2, 1.55, 5.2, sandWallMat);
        addMapBox(-14.6, -18, 1.8, 0.85, 2.6, hescoMat);
        addMapBox(-18, -15.6, 3.2, 0.85, 0.5, hescoMat, 1.55, false);

        addMapBox(18, 18, 5.2, 1.55, 5.2, sandWallMat);
        addMapBox(14.6, 18, 1.8, 0.85, 2.6, hescoMat);
        addMapBox(18, 15.6, 3.2, 0.85, 0.5, hescoMat, 1.55, false);

        // HESCO Bastion Bunkers & Supply Crates in NE and SW Sectors
        addMapBox(-17, 16, 4.2, 2.2, 1.8, hescoMat);
        addMapBox(-15, 13.5, 1.8, 1.2, 2.2, matAmber);
        addMapBox(17, -16, 4.2, 2.2, 1.8, hescoMat);
        addMapBox(15, -13.5, 1.8, 1.2, 2.2, matCrimson);

        // Mid-lane HESCO Cover Barriers for Corner-Lean Peeking
        addMapBox(0, -16, 4.8, 2.3, 1.5, hescoMat);
        addMapBox(0, 16, 4.8, 2.3, 1.5, hescoMat);
        addMapBox(-18, 0, 1.5, 2.3, 4.8, hescoMat);
        addMapBox(18, 0, 1.5, 2.3, 4.8, hescoMat);

        // Outer Desert Fortress Compound Walls & Sniper Bunkers (Expanded 96x96m Arena)
        addMapBox(0, -33, 9.5, 3.2, 2.2, sandWallMat);
        addMapBox(0, 33, 9.5, 3.2, 2.2, sandWallMat);
        addMapBox(-33, 0, 2.2, 3.2, 9.5, sandWallMat);
        addMapBox(33, 0, 2.2, 3.2, 9.5, sandWallMat);
        addMapBox(-32, -32, 5.6, 2.6, 5.6, hescoMat);
        addMapBox(32, 32, 5.6, 2.6, 5.6, hescoMat);
        addMapBox(-32, 32, 5.6, 2.6, 5.6, sandWallMat);
        addMapBox(32, -32, 5.6, 2.6, 5.6, sandWallMat);

        // Desert Oasis Palm Trees (batched by trunk/leaf material)
        addDesertPalmTree(-5.5, -14.5);
        addDesertPalmTree(5.5, 14.5);
        addDesertPalmTree(-14.5, 5.5);
        addDesertPalmTree(14.5, -5.5);
        addDesertPalmTree(-22, 22);
        addDesertPalmTree(22, -22);
        addDesertPalmTree(-36, -24);
        addDesertPalmTree(36, 24);
        addDesertPalmTree(-24, 36);
        addDesertPalmTree(24, -36);
      }

      // Map-Aware Destructible Flower Pots (never overlapping walls — 1 draw call each!)
      const potCoords: Array<[number, number, number]> =
        mapId === 'duel'
          ? [
              [-11.5, 0, 11.5],
              [11.5, 0, 11.5],
              [-11.5, 0, -11.5],
              [11.5, 0, -11.5],
            ]
          : mapId === 'outpost'
            ? [
                [0, 1.1, 0],
                [-4.2, 0, -4.2],
                [4.2, 0, 4.2],
                [-4.2, 0, 4.2],
                [4.2, 0, -4.2],
                [-13, 0, -9.5],
                [13, 0, 9.5],
                [-3.5, 0, -15.5],
                [3.5, 0, 15.5],
                [-15, 1.2, 13.5],
                [15, 1.2, -13.5],
                [-7.5, 0, 19],
                [7.5, 0, -19],
              ]
            : [
                [-4.5, 0, -4.5],
                [4.5, 0, 4.5],
                [-4.5, 0, 4.5],
                [4.5, 0, -4.5],
                [-12.5, 0, -4],
                [12.5, 0, 4],
                [-3.5, 0, -14],
                [3.5, 0, 14],
                [-15, 0, 8],
                [15, 0, -8],
                [-7, 0, 18],
                [7, 0, -18],
                [0, 1.15, 0],
                [-6, 1.1, -5],
              ];
      potCoords.forEach((pt, idx) => spawnPotAt(pt[0], pt[1], pt[2], idx));

      // Tactical Rubber Tire Stacks at Open Cover Corners (batched into 2 draw calls total!)
      const tireSpots: Array<[number, number, number]> =
        mapId === 'duel'
          ? []
          : mapId === 'outpost'
            ? [
                [-6.2, -2.2, 3],
                [6.2, 2.2, 3],
                [-2.2, -12.5, 3],
                [2.2, 12.5, 3],
                [-13.5, -13.5, 3],
                [13.5, 13.5, 3],
                [-12, 19, 2],
                [12, -19, 2],
              ]
            : [
                [-7.5, -1.5, 3],
                [7.5, 1.5, 3],
                [-1.5, -13.5, 4],
                [1.5, 13.5, 4],
                [-16, -10, 3],
                [16, 10, 3],
                [-13, 18, 2],
                [13, -18, 2],
              ];
      tireSpots.forEach((ts) => addTireStack(ts[0], ts[1], ts[2]));

      // Merge all batched static boxes, beams, strips, tires, and palms by material
      flushStaticMapBatches();

      baseMapFogDensity = scene.fog instanceof THREE.FogExp2 ? scene.fog.density : 0.015;
      applyViewDistanceSettings();
      mapInitialized = true;

      // Mount compact purely-visual ad billboards for the active map (no colliders/hitboxes)
      buildMapAdBillboards(mapId);
    }

    interface PickupItem {
      group: THREE.Group;
      type: 'hp' | 'armor' | 'power';
      x: number;
      z: number;
      active: boolean;
      timer: number;
    }
    const pickups: PickupItem[] = [];
    const defaultPickupSpots: Array<{ x: number; z: number; type: 'hp' | 'armor' | 'power' }> = [
      { x: -10, z: -10, type: 'hp' },
      { x: 10, z: 10, type: 'hp' },
      { x: -10, z: 10, type: 'armor' },
      { x: 10, z: -10, type: 'armor' },
      { x: 0, z: -20, type: 'power' },
      { x: 0, z: 20, type: 'power' },
    ];
    const duelPickupSpots: Array<{ x: number; z: number; type: 'hp' | 'armor' | 'power' }> = [
      { x: -11, z: 0, type: 'hp' },
      { x: 11, z: 0, type: 'hp' },
      { x: 0, z: -13.5, type: 'armor' },
      { x: 0, z: 13.5, type: 'armor' },
    ];

    // Shared pickup geometries & materials (merged HP cross cuts 2 draw calls -> 1 per HP pickup)
    const pickupBoxGeo = new THREE.BoxGeometry(0.65, 0.45, 0.65);
    const pickupCrossGeo = (() => {
      const p1Raw = new THREE.BoxGeometry(0.36, 0.08, 0.12);
      const p2Raw = new THREE.BoxGeometry(0.12, 0.08, 0.36);
      p1Raw.translate(0, 0.24, 0);
      p2Raw.translate(0, 0.24, 0);
      const p1 = p1Raw.index ? p1Raw.toNonIndexed() : p1Raw;
      const p2 = p2Raw.index ? p2Raw.toNonIndexed() : p2Raw;
      if (p1 !== p1Raw) p1Raw.dispose();
      if (p2 !== p2Raw) p2Raw.dispose();
      const merged = mergeGeometries([p1, p2], false);
      p1.dispose();
      p2.dispose();
      return merged || new THREE.BoxGeometry(0.36, 0.08, 0.36);
    })();
    const pickupRingGeo = new THREE.RingGeometry(0.55, 0.72, 20);
    const pickupCrossMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pickupBoxMats: Record<'hp' | 'armor' | 'power', THREE.MeshStandardMaterial> = {
      hp: new THREE.MeshStandardMaterial({ color: 0x00e676, emissive: 0x006633, roughness: 0.35, metalness: 0.25 }),
      armor: new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0b4c6e, roughness: 0.35, metalness: 0.25 }),
      power: new THREE.MeshStandardMaterial({ color: 0xc084fc, emissive: 0x581c87, roughness: 0.35, metalness: 0.25 }),
    };
    const pickupRingMats: Record<'hp' | 'armor' | 'power', THREE.MeshBasicMaterial> = {
      hp: new THREE.MeshBasicMaterial({ color: 0x00e676, side: THREE.DoubleSide, transparent: true, opacity: 0.45, depthWrite: false }),
      armor: new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.45, depthWrite: false }),
      power: new THREE.MeshBasicMaterial({ color: 0xc084fc, side: THREE.DoubleSide, transparent: true, opacity: 0.45, depthWrite: false }),
    };

    function createPickups() {
      pickups.forEach((p) => scene.remove(p.group));
      pickups.length = 0;
      const activeSpots = currentMapRef.current === 'duel' ? duelPickupSpots : defaultPickupSpots;

      activeSpots.forEach((spot) => {
        const g = new THREE.Group();
        const box = new THREE.Mesh(pickupBoxGeo, pickupBoxMats[spot.type]);
        g.add(box);

        if (spot.type === 'hp') {
          const cross = new THREE.Mesh(pickupCrossGeo, pickupCrossMat);
          g.add(cross);
        }

        const ring = new THREE.Mesh(pickupRingGeo, pickupRingMats[spot.type]);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = -0.35;
        g.add(ring);

        g.position.set(spot.x, 0.6, spot.z);
        scene.add(g);
        pickups.push({ group: g, type: spot.type, x: spot.x, z: spot.z, active: true, timer: 0 });
      });
    }

    setBootProgress({ pct: 68, labelFa: 'ساخت نقشه و موانع...', ready: false });
    setTextureQualityTier(resolveDesiredTexTier());
    buildArenaMap(currentMapRef.current);

    // =========================================================
    // FIRST-PERSON WEAPONS & LASER SIGHT
    // =========================================================
    const weaponPivot = new THREE.Group();
    const weaponSwayGroup = new THREE.Group();
    const weaponRecoilGroup = new THREE.Group();
    camera.add(weaponPivot);
    weaponPivot.add(weaponSwayGroup);
    weaponSwayGroup.add(weaponRecoilGroup);

    const flashTex = makeFlashTexture();

    const laserDotMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff1e38 })
    );
    scene.add(laserDotMesh);

    const muzzleFlashGroup = new THREE.Group();
    const flashMat = new THREE.MeshBasicMaterial({
      map: flashTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const fp1 = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28), flashMat);
    const fp2 = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28), flashMat);
    fp2.rotation.z = Math.PI / 4;
    const fp3 = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.26), flashMat);
    fp3.rotation.y = Math.PI / 2;
    muzzleFlashGroup.add(fp1, fp2, fp3);
    muzzleFlashGroup.visible = false;
    weaponRecoilGroup.add(muzzleFlashGroup);

    const muzzlePointLight = new THREE.PointLight(0xffaa33, 0, 7);
    camera.add(muzzlePointLight);

    // Upgraded procedural PBR material library & composite 3D base weapon models
    const weaponMatLib = createWeaponMaterialLibrary(maxAniso);
    const gloveMat = weaponMatLib.glove;
    const sleeveMat = weaponMatLib.sleeve;

    const standardAkModel = buildUpgradedAK47(weaponMatLib);
    let infernoAkModel: ReturnType<typeof buildInfernoReaperAK47> | null = null;
    const akSkinRootGroup = new THREE.Group();
    akSkinRootGroup.add(standardAkModel.group);
    const akModel: WeaponModelResult = {
      group: akSkinRootGroup,
      mag: standardAkModel.mag,
      bolt: standardAkModel.bolt,
      boltRestZ: standardAkModel.boltRestZ,
      boltTravelZ: standardAkModel.boltTravelZ,
      muzzlePos: standardAkModel.muzzlePos.clone(),
      dispose: () => standardAkModel.dispose(),
    };
    const syncLocalAkSkinVisuals = () => {
      const useInferno =
        ogFeaturesRef.current.skinsAndCollection &&
        getGameplayEquipped().ak47_skin === LEGENDARY_AK47_ID;
      if (useInferno) {
        if (!infernoAkModel) {
          infernoAkModel = buildInfernoReaperAK47({
            includeHands: true,
            gloveMat,
            sleeveMat,
            maxAnisotropy: maxAniso,
          });
          akSkinRootGroup.add(infernoAkModel.group);
        }
        infernoAkModel.group.visible = true;
        standardAkModel.group.visible = false;
        akModel.mag = infernoAkModel.mag;
        akModel.bolt = infernoAkModel.bolt;
        akModel.boltRestZ = -0.02;
        akModel.boltTravelZ = 0.068;
      } else {
        standardAkModel.group.visible = true;
        akModel.mag = standardAkModel.mag;
        akModel.bolt = standardAkModel.bolt;
        akModel.boltRestZ = standardAkModel.boltRestZ;
        akModel.boltTravelZ = standardAkModel.boltTravelZ;
        if (infernoAkModel) {
          akSkinRootGroup.remove(infernoAkModel.group);
          infernoAkModel.dispose();
          infernoAkModel = null;
        }
      }
    };
    syncLocalAkSkinVisuals();

    const m4Model = buildUpgradedM4A1(weaponMatLib);
    const standardSniperModel = buildUpgradedSniper(weaponMatLib);
    let voidSniperModel: ReturnType<typeof buildVoidPiercerSniper> | null = null;
    const sniperSkinRootGroup = new THREE.Group();
    sniperSkinRootGroup.add(standardSniperModel.group);
    const sniperModel: WeaponModelResult = {
      group: sniperSkinRootGroup,
      mag: standardSniperModel.mag,
      bolt: standardSniperModel.bolt,
      boltRestZ: standardSniperModel.boltRestZ,
      boltTravelZ: standardSniperModel.boltTravelZ,
      muzzlePos: standardSniperModel.muzzlePos.clone(),
      dispose: () => standardSniperModel.dispose(),
    };
    const syncLocalSniperSkinVisuals = () => {
      const useVoid =
        ogFeaturesRef.current.skinsAndCollection &&
        getGameplayEquipped().sniper_skin === LEGENDARY_SNIPER_ID;
      if (useVoid) {
        if (!voidSniperModel) {
          voidSniperModel = buildVoidPiercerSniper({
            includeHands: true,
            gloveMat,
            sleeveMat,
            maxAnisotropy: maxAniso,
          });
          sniperSkinRootGroup.add(voidSniperModel.group);
        }
        voidSniperModel.group.visible = true;
        standardSniperModel.group.visible = false;
        sniperModel.mag = voidSniperModel.mag;
        sniperModel.bolt = null;
      } else {
        standardSniperModel.group.visible = true;
        sniperModel.mag = standardSniperModel.mag;
        sniperModel.bolt = standardSniperModel.bolt;
        if (voidSniperModel) {
          sniperSkinRootGroup.remove(voidSniperModel.group);
          voidSniperModel.dispose();
          voidSniperModel = null;
        }
      }
    };
    syncLocalSniperSkinVisuals();
    let tempestSessionKills = 0;
    let eclipseSessionKills = 0;
    const mp5Model = buildUpgradedMP5(weaponMatLib);
    const standardShotgunModel = buildUpgradedShotgun(weaponMatLib);
    let eclipseShotgunModel: ReturnType<typeof buildEclipseBreacherSpas12> | null = null;
    const shotgunSkinRootGroup = new THREE.Group();
    shotgunSkinRootGroup.add(standardShotgunModel.group);
    const shotgunModel: WeaponModelResult = {
      group: shotgunSkinRootGroup,
      pump: standardShotgunModel.pump,
      pumpRestZ: standardShotgunModel.pumpRestZ ?? -0.28,
      bolt: standardShotgunModel.bolt,
      boltRestZ: standardShotgunModel.boltRestZ,
      boltTravelZ: standardShotgunModel.boltTravelZ,
      mag: standardShotgunModel.mag,
      muzzlePos: standardShotgunModel.muzzlePos.clone(),
      dispose: () => standardShotgunModel.dispose(),
    };
    const syncLocalShotgunSkinVisuals = () => {
      const useEclipse =
        ogFeaturesRef.current.skinsAndCollection &&
        getGameplayEquipped().shotgun_skin === MYTHIC_SHOTGUN_ID;
      if (useEclipse) {
        if (!eclipseShotgunModel) {
          eclipseShotgunModel = buildEclipseBreacherSpas12({
            includeHands: true,
            gloveMat,
            sleeveMat,
            maxAnisotropy: maxAniso,
          });
          eclipseShotgunModel.setKillCount(eclipseSessionKills);
          shotgunSkinRootGroup.add(eclipseShotgunModel.group);
        }
        eclipseShotgunModel.group.visible = true;
        standardShotgunModel.group.visible = false;
        shotgunModel.pump = eclipseShotgunModel.pump;
        shotgunModel.pumpRestZ = -0.28;
        shotgunModel.mag = null;
        shotgunModel.bolt = null;
      } else {
        standardShotgunModel.group.visible = true;
        shotgunModel.pump = standardShotgunModel.pump;
        shotgunModel.pumpRestZ = standardShotgunModel.pumpRestZ ?? -0.28;
        shotgunModel.mag = standardShotgunModel.mag;
        shotgunModel.bolt = standardShotgunModel.bolt;
        if (eclipseShotgunModel) {
          shotgunSkinRootGroup.remove(eclipseShotgunModel.group);
          eclipseShotgunModel.dispose();
          eclipseShotgunModel = null;
        }
      }
    };
    syncLocalShotgunSkinVisuals();
    const pistolModel = buildUpgradedPistol(weaponMatLib);
    const standardKatanaModel = buildUpgradedKatana(weaponMatLib);
    let sakuraKatanaModel: ReturnType<typeof buildSakuraKatana3D> | null = null;
    const katanaSkinRootGroup = new THREE.Group();
    katanaSkinRootGroup.add(standardKatanaModel.group);
    const katanaModel: WeaponModelResult = {
      group: katanaSkinRootGroup,
      mag: null,
      bladePivot: standardKatanaModel.bladePivot,
      muzzlePos: standardKatanaModel.muzzlePos.clone(),
      dispose: () => standardKatanaModel.dispose(),
    };
    const syncLocalKatanaSkinVisuals = () => {
      const useSakura =
        ogFeaturesRef.current.skinsAndCollection &&
        getGameplayEquipped().katana_skin === LEGENDARY_KATANA_ID;
      if (useSakura) {
        if (!sakuraKatanaModel) {
          sakuraKatanaModel = buildSakuraKatana3D({
            includeHands: true,
            gloveMat,
            sleeveMat,
            maxAnisotropy: maxAniso,
          });
          katanaSkinRootGroup.add(sakuraKatanaModel.group);
        }
        sakuraKatanaModel.group.visible = true;
        standardKatanaModel.group.visible = false;
        katanaModel.bladePivot = sakuraKatanaModel.bladePivot;
      } else {
        standardKatanaModel.group.visible = true;
        katanaModel.bladePivot = standardKatanaModel.bladePivot;
        if (sakuraKatanaModel) {
          katanaSkinRootGroup.remove(sakuraKatanaModel.group);
          sakuraKatanaModel.dispose();
          sakuraKatanaModel = null;
        }
      }
    };
    syncLocalKatanaSkinVisuals();
    const standardLmgModel = buildUpgradedLMG(weaponMatLib);
    let tempestLmgModel: ReturnType<typeof buildTempestAegisM249> | null = null;
    const lmgSkinRootGroup = new THREE.Group();
    lmgSkinRootGroup.add(standardLmgModel.group);
    const lmgModel: WeaponModelResult = {
      group: lmgSkinRootGroup,
      mag: standardLmgModel.mag,
      bolt: standardLmgModel.bolt,
      boltRestZ: standardLmgModel.boltRestZ,
      boltTravelZ: standardLmgModel.boltTravelZ,
      muzzlePos: standardLmgModel.muzzlePos.clone(),
      dispose: () => standardLmgModel.dispose(),
    };
    const syncLocalLmgSkinVisuals = () => {
      const useTempest =
        ogFeaturesRef.current.skinsAndCollection &&
        getGameplayEquipped().m249_skin === MYTHIC_M249_ID;
      if (useTempest) {
        if (!tempestLmgModel) {
          tempestLmgModel = buildTempestAegisM249({
            includeHands: true,
            gloveMat,
            sleeveMat,
            maxAnisotropy: maxAniso,
          });
          tempestLmgModel.setKillCount(tempestSessionKills);
          lmgSkinRootGroup.add(tempestLmgModel.group);
        }
        tempestLmgModel.group.visible = true;
        standardLmgModel.group.visible = false;
        lmgModel.mag = tempestLmgModel.mag;
        lmgModel.bolt = null;
      } else {
        standardLmgModel.group.visible = true;
        lmgModel.mag = standardLmgModel.mag;
        lmgModel.bolt = standardLmgModel.bolt;
        if (tempestLmgModel) {
          lmgSkinRootGroup.remove(tempestLmgModel.group);
          tempestLmgModel.dispose();
          tempestLmgModel = null;
        }
      }
    };
    syncLocalLmgSkinVisuals();
    const deagleModel = buildUpgradedDeagle(weaponMatLib);
    const standardRpgModel = buildUpgradedRPG(weaponMatLib);
    let novaDragonRpgModel: ReturnType<typeof buildNovaDragonRpg3D> | null = null;
    const rpgSkinRootGroup = new THREE.Group();
    rpgSkinRootGroup.add(standardRpgModel.group);
    const rpgModel: WeaponModelResult = {
      group: rpgSkinRootGroup,
      mag: standardRpgModel.mag,
      muzzlePos: standardRpgModel.muzzlePos.clone(),
      dispose: () => standardRpgModel.dispose(),
    };
    const syncLocalRpgSkinVisuals = () => {
      const useNovaDragon =
        ogFeaturesRef.current.skinsAndCollection &&
        getGameplayEquipped().rpg_skin === LEGENDARY_RPG_ID;
      if (useNovaDragon) {
        if (!novaDragonRpgModel) {
          novaDragonRpgModel = buildNovaDragonRpg3D({
            includeHands: true,
            gloveMat,
            sleeveMat,
            maxAnisotropy: maxAniso,
          });
          rpgSkinRootGroup.add(novaDragonRpgModel.group);
        }
        novaDragonRpgModel.group.visible = true;
        standardRpgModel.group.visible = false;
        rpgModel.mag = novaDragonRpgModel.mag;
        rpgModel.muzzlePos.copy(novaDragonRpgModel.muzzlePos);
      } else {
        standardRpgModel.group.visible = true;
        rpgModel.mag = standardRpgModel.mag;
        rpgModel.muzzlePos.copy(standardRpgModel.muzzlePos);
        if (novaDragonRpgModel) {
          rpgSkinRootGroup.remove(novaDragonRpgModel.group);
          novaDragonRpgModel.dispose();
          novaDragonRpgModel = null;
        }
      }
    };
    syncLocalRpgSkinVisuals();
    const baseDisposableWeaponModels: WeaponModelResult[] = [
      standardAkModel,
      m4Model,
      standardSniperModel,
      mp5Model,
      standardShotgunModel,
      pistolModel,
      katanaModel,
      standardLmgModel,
      deagleModel,
      standardRpgModel,
    ];
    weaponRecoilGroup.add(
      akModel.group,
      m4Model.group,
      sniperModel.group,
      mp5Model.group,
      shotgunModel.group,
      pistolModel.group,
      katanaModel.group,
      lmgModel.group,
      deagleModel.group,
      rpgModel.group
    );

    // Strictly aligned 1-to-1 with ALL_WEAPON_IDS and WEAPON_CATALOG:
    // 0: ak47, 1: m4a1, 2: sniper, 3: mp5, 4: shotgun, 5: pistol, 6: katana, 7: lmg, 8: deagle, 9: rpg
    const WEAPONS = [
      {
        id: 'ak47' as WeaponId,
        name: 'AK-47',
        isMelee: false,
        auto: true,
        pellets: 1,
        fireRate: 0.105,
        damage: 36,
        headMult: 2.1,
        magSize: 30,
        mag: 30,
        reserve: 120,
        maxReserve: 180,
        reloadTime: 1.55,
        spreadHip: 0.022,
        spreadAds: 0.005,
        recoilPitch: 0.026,
        recoilYaw: 0.012,
        kickBack: 0.1,
        kickRot: 0.15,
        hipPos: new THREE.Vector3(0.22, -0.2, -0.34),
        adsPos: new THREE.Vector3(0.0, -0.0845, -0.22),
        adsCantRoll: 0.0,
        adsFovDelta: -22,
        speedMult: 1.0,
        model: akModel,
      },
      {
        id: 'm4a1' as WeaponId,
        name: 'M4A1-S',
        isMelee: false,
        auto: true,
        pellets: 1,
        fireRate: 0.082,
        damage: 31,
        headMult: 2.1,
        magSize: 35,
        mag: 35,
        reserve: 140,
        maxReserve: 210,
        reloadTime: 1.35,
        spreadHip: 0.014,
        spreadAds: 0.0025,
        recoilPitch: 0.016,
        recoilYaw: 0.007,
        kickBack: 0.072,
        kickRot: 0.1,
        hipPos: new THREE.Vector3(0.21, -0.195, -0.33),
        adsPos: new THREE.Vector3(0.0, -0.079, -0.21),
        adsCantRoll: 0.0,
        adsFovDelta: -24,
        speedMult: 1.03,
        model: m4Model,
      },
      {
        id: 'sniper' as WeaponId,
        name: 'AWM .338',
        isMelee: false,
        auto: false,
        pellets: 1,
        fireRate: 0.92,
        damage: 115,
        headMult: 2.5,
        magSize: 5,
        mag: 5,
        reserve: 30,
        maxReserve: 45,
        reloadTime: 2.1,
        spreadHip: 0.042,
        spreadAds: 0.0004,
        recoilPitch: 0.082,
        recoilYaw: 0.016,
        kickBack: 0.19,
        kickRot: 0.32,
        hipPos: new THREE.Vector3(0.22, -0.21, -0.34),
        adsPos: new THREE.Vector3(0.0, -0.132, -0.21),
        adsCantRoll: 0.0,
        adsFovDelta: -52,
        speedMult: 0.92,
        model: sniperModel,
      },
      {
        id: 'mp5' as WeaponId,
        name: 'MP5-SD',
        isMelee: false,
        auto: true,
        pellets: 1,
        fireRate: 0.068,
        damage: 25,
        headMult: 2.0,
        magSize: 40,
        mag: 40,
        reserve: 160,
        maxReserve: 240,
        reloadTime: 1.2,
        spreadHip: 0.016,
        spreadAds: 0.003,
        recoilPitch: 0.012,
        recoilYaw: 0.006,
        kickBack: 0.055,
        kickRot: 0.08,
        hipPos: new THREE.Vector3(0.2, -0.19, -0.32),
        adsPos: new THREE.Vector3(0.0, -0.079, -0.21),
        adsCantRoll: 0.0,
        adsFovDelta: -20,
        speedMult: 1.12,
        model: mp5Model,
      },
      {
        id: 'shotgun' as WeaponId,
        name: 'SPAS-12',
        isMelee: false,
        auto: false,
        pellets: 8,
        fireRate: 0.68,
        damage: 20,
        headMult: 1.65,
        magSize: 8,
        mag: 8,
        reserve: 40,
        maxReserve: 56,
        reloadTime: 1.85,
        spreadHip: 0.075,
        spreadAds: 0.048,
        recoilPitch: 0.068,
        recoilYaw: 0.024,
        kickBack: 0.16,
        kickRot: 0.28,
        hipPos: new THREE.Vector3(0.23, -0.21, -0.35),
        adsPos: new THREE.Vector3(0.0, -0.068, -0.24),
        adsCantRoll: 0.0,
        adsFovDelta: -16,
        speedMult: 0.96,
        model: shotgunModel,
      },
      {
        id: 'pistol' as WeaponId,
        name: 'G18',
        isMelee: false,
        auto: false,
        pellets: 1,
        fireRate: 0.16,
        damage: 32,
        headMult: 2.1,
        magSize: 15,
        mag: 15,
        reserve: 90,
        maxReserve: 120,
        reloadTime: 1.05,
        spreadHip: 0.01,
        spreadAds: 0.002,
        recoilPitch: 0.028,
        recoilYaw: 0.006,
        kickBack: 0.075,
        kickRot: 0.2,
        hipPos: new THREE.Vector3(0.2, -0.19, -0.38),
        adsPos: new THREE.Vector3(0.0, -0.043, -0.28),
        adsCantRoll: 0.0,
        adsFovDelta: -18,
        speedMult: 1.08,
        model: pistolModel,
      },
      {
        id: 'katana' as WeaponId,
        name: 'BLADE',
        isMelee: true,
        auto: false,
        pellets: 1,
        fireRate: 0.44,
        damage: 95,
        headMult: 1.5,
        magSize: 0,
        mag: 0,
        reserve: 0,
        maxReserve: 0,
        reloadTime: 0,
        spreadHip: 0,
        spreadAds: 0,
        recoilPitch: 0.01,
        recoilYaw: 0.02,
        kickBack: 0.05,
        kickRot: 0.1,
        hipPos: new THREE.Vector3(0.29, -0.23, -0.42),
        adsPos: new THREE.Vector3(0.24, -0.21, -0.38),
        adsCantRoll: 0,
        adsFovDelta: -8,
        speedMult: 1.22,
        model: katanaModel,
      },
      {
        id: 'lmg' as WeaponId,
        name: 'M249 SAW',
        isMelee: false,
        auto: true,
        pellets: 1,
        fireRate: 0.086,
        damage: 34,
        headMult: 2.0,
        magSize: 100,
        mag: 100,
        reserve: 300,
        maxReserve: 400,
        reloadTime: 2.35,
        spreadHip: 0.024,
        spreadAds: 0.0055,
        recoilPitch: 0.02,
        recoilYaw: 0.01,
        kickBack: 0.088,
        kickRot: 0.12,
        hipPos: new THREE.Vector3(0.23, -0.21, -0.34),
        adsPos: new THREE.Vector3(0.0, -0.099, -0.22),
        adsCantRoll: 0.0,
        adsFovDelta: -20,
        speedMult: 0.92,
        model: lmgModel,
      },
      {
        id: 'deagle' as WeaponId,
        name: 'DEAGLE .50',
        isMelee: false,
        auto: false,
        pellets: 1,
        fireRate: 0.28,
        damage: 72,
        headMult: 2.4,
        magSize: 7,
        mag: 7,
        reserve: 49,
        maxReserve: 70,
        reloadTime: 1.25,
        spreadHip: 0.014,
        spreadAds: 0.0015,
        recoilPitch: 0.056,
        recoilYaw: 0.012,
        kickBack: 0.135,
        kickRot: 0.28,
        hipPos: new THREE.Vector3(0.21, -0.19, -0.36),
        adsPos: new THREE.Vector3(0.0, -0.052, -0.27),
        adsCantRoll: 0.0,
        adsFovDelta: -20,
        speedMult: 1.04,
        model: deagleModel,
      },
      {
        id: 'rpg' as WeaponId,
        name: 'RPG-7V',
        isMelee: false,
        auto: false,
        pellets: 1,
        fireRate: 1.25,
        damage: 180,
        headMult: 1.5,
        magSize: 1,
        mag: 1,
        reserve: 8,
        maxReserve: 12,
        reloadTime: 2.2,
        spreadHip: 0.012,
        spreadAds: 0.002,
        recoilPitch: 0.095,
        recoilYaw: 0.02,
        kickBack: 0.22,
        kickRot: 0.35,
        hipPos: new THREE.Vector3(0.24, -0.19, -0.3),
        adsPos: new THREE.Vector3(0.0, -0.086, -0.22),
        adsCantRoll: 0.0,
        adsFovDelta: -18,
        speedMult: 0.88,
        model: rpgModel,
      },
    ];

    let currentWeaponIdx = 0;
    let fireCooldown = 0;
    let isReloading = false;
    let reloadProgress = 0;
    let switchAnim = 0;
    let katanaSlashTimer = 0;
    let katanaSlashDir = 1;
    let shotgunPumpKick = 0;
    const fpWeaponAnimState = createFirstPersonWeaponAnimState();

    const recoilPos = new THREE.Vector3();
    const recoilRot = new THREE.Vector3();
    let camRecoilPitch = 0;
    let camRecoilYaw = 0;
    let camTargetRecoilPitch = 0;
    let camTargetRecoilYaw = 0;
    let camRoll = 0;
    let camLandDip = 0;
    let crosshairBloom = 0;
    let screenShake = 0;
    let damageShaderFlash = 0;
    let muzzleFlashTimer = 0;
    let walkBobTimer = 0;
    let deadzoneLagX = 0;
    let deadzoneLagY = 0;

    let adrenalineTimer = 0;
    let adrenalineCooldown = 0;
    let overdriveTimer = 0;

    // =========================================================
    // VFX OBJECT POOLS & ADAPTIVE FX BUDGET (Zero per-shot allocations)
    // =========================================================
    let lastBudgetReducedMotion = reducedMotionRef.current;
    let activeFxBudget = computeFxBudget(
      gfx.preset,
      getAdaptiveQualityEffects(adaptiveQuality.stage).fxTierOverride,
      lastBudgetReducedMotion
    );
    function refreshFxBudget() {
      lastBudgetReducedMotion = reducedMotionRef.current;
      activeFxBudget = computeFxBudget(
        gfx.preset,
        getAdaptiveQualityEffects(adaptiveQuality.stage).fxTierOverride,
        lastBudgetReducedMotion
      );
    }

    const _fxTmpV1 = new THREE.Vector3();
    const _fxTmpV2 = new THREE.Vector3();
    const _fxTmpV3 = new THREE.Vector3();
    const _sprintTargetPos = new THREE.Vector3(0.12, -0.25, -0.32);
    const _eclipseAdsPos = new THREE.Vector3(0.0, -0.172, -0.27);
    const _tempestAdsPos = new THREE.Vector3(0.0, -0.178, -0.25);
    const _laserDir = new THREE.Vector3();
    const _aiDir = new THREE.Vector3();
    const _aiEye = new THREE.Vector3();
    const _aiPlayerChest = new THREE.Vector3();
    const _aiGunTip = new THREE.Vector3();
    const _ebPrevPos = new THREE.Vector3();
    const _ebChest = new THREE.Vector3();
    const _shotDir = new THREE.Vector3();
    const _shotEnd = new THREE.Vector3();
    const _worldMuzzle = new THREE.Vector3();
    const _lastEndPoint = new THREE.Vector3();
    const combinedRaycastTargets: THREE.Object3D[] = [];

    function fillCombinedRaycastTargets(includeTutorial: boolean): THREE.Object3D[] {
      combinedRaycastTargets.length = 0;
      for (let i = 0; i < shootableEnvironment.length; i++) {
        combinedRaycastTargets.push(shootableEnvironment[i]);
      }
      for (let i = 0; i < enemyHitMeshes.length; i++) {
        combinedRaycastTargets.push(enemyHitMeshes[i]);
      }
      if (includeTutorial && quickTutorialHitMeshes.length > 0) {
        for (let i = 0; i < quickTutorialHitMeshes.length; i++) {
          combinedRaycastTargets.push(quickTutorialHitMeshes[i]);
        }
      }
      return combinedRaycastTargets;
    }

    interface TracerPoolItem {
      active: boolean;
      mesh: THREE.Mesh;
      mat: THREE.MeshBasicMaterial;
      dir: THREE.Vector3;
      speed: number;
      traveled: number;
      maxDist: number;
    }
    interface ShellPoolItem {
      active: boolean;
      pos: THREE.Vector3;
      rot: THREE.Euler;
      vel: THREE.Vector3;
      rotVel: THREE.Vector3;
      life: number;
    }
    interface ParticlePoolItem {
      active: boolean;
      pos: THREE.Vector3;
      vel: THREE.Vector3;
      life: number;
      maxLife: number;
    }
    interface ArcPoolItem {
      active: boolean;
      mesh: THREE.Mesh;
      mat: THREE.MeshBasicMaterial;
      vel: THREE.Vector3;
      life: number;
      maxLife: number;
    }
    interface DecalPoolItem {
      active: boolean;
      mesh: THREE.Mesh;
      life: number;
    }
    interface EnemyBulletPoolItem {
      active: boolean;
      mesh: THREE.Mesh;
      dir: THREE.Vector3;
      speed: number;
      dmg: number;
      life: number;
    }

    const eBulletGeo = new THREE.BoxGeometry(0.045, 0.045, 0.65);
    const eBulletMat = new THREE.MeshBasicMaterial({ color: 0xff4422 });
    const ENEMY_BULLET_POOL_SIZE = 32;
    const enemyBulletPool: EnemyBulletPoolItem[] = [];
    let enemyBulletCursor = 0;
    for (let i = 0; i < ENEMY_BULLET_POOL_SIZE; i++) {
      const m = new THREE.Mesh(eBulletGeo, eBulletMat);
      m.visible = false;
      m.frustumCulled = false;
      scene.add(m);
      enemyBulletPool.push({ active: false, mesh: m, dir: new THREE.Vector3(), speed: 24, dmg: 10, life: 0 });
    }

    function clearEnemyBullets() {
      for (let i = 0; i < enemyBulletPool.length; i++) {
        enemyBulletPool[i].active = false;
        enemyBulletPool[i].mesh.visible = false;
      }
    }

    const tracerGeo = new THREE.BoxGeometry(0.02, 0.02, 1.35);
    const TRACER_POOL_SIZE = 24;
    const tracerPool: TracerPoolItem[] = [];
    let tracerCursor = 0;
    for (let i = 0; i < TRACER_POOL_SIZE; i++) {
      const slotMat = new THREE.MeshBasicMaterial({ color: 0xffdd77, transparent: true, opacity: 0.9 });
      const m = new THREE.Mesh(tracerGeo, slotMat);
      m.visible = false;
      m.frustumCulled = false;
      scene.add(m);
      tracerPool.push({ active: false, mesh: m, mat: slotMat, dir: new THREE.Vector3(), speed: 128, traveled: 0, maxDist: 1 });
    }

    // Pooled GPU-instanced VFX for Inferno Reaper, Void Piercer, Mythic Tempest Aegis & Mythic Eclipse Breacher (0 dynamic lights)
    const infernoVfxPool = new InfernoVfxPool(scene, 60);
    const voidVfxPool = new VoidPiercerVfxPool(scene, 60);
    const tempestVfxPool = new TempestAegisVfxPool(scene);
    const eclipseVfxPool = new EclipseBreacherVfxPool(scene);
    const sakuraVfxPool = new SakuraVfxPool(scene, 44);
    const novaDragonVfxPool = new NovaDragonVfxPool(scene, 56);
    let lastTempestReloadPhase: string = 'idle';
    let lastEclipseReloadPhase: string = 'idle';
    let lastEclipseReloadShellIndex = -1;
    let localInspectProgress = -1;
    let localEmoteActive = false;
    let localEmoteId: string | null = null;
    let localEmoteElapsedSec = 0;
    let localEmoteCooldownSec = 0;
    const _shellRightVec = new THREE.Vector3();
    const _shellOriginVec = new THREE.Vector3();
    const _eclipsePelletEnds: THREE.Vector3[] = [
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
    ];

    const SHOTGUN_BASE_MAG_SIZE = 8;
    const SHOTGUN_BASE_RELOAD_TIME = 1.85;

    const isLocalMythicPerksEnabledNow = (): boolean => {
      if (!ogFeaturesRef.current.skinsAndCollection) return false;
      const activeWeaponId = WEAPONS[currentWeaponIdx]?.id;
      const activeRoomNow = peerManager.getRoom();
      return isMythicM249PerksActive({
        weaponId: activeWeaponId,
        equippedM249SkinId: getGameplayEquipped().m249_skin,
        isOnline: Boolean(activeRoomNow),
        roomMythicPerksAllowed: activeRoomNow?.mythicPerksAllowed,
      });
    };

    const isLocalShotgunMythicPerksEnabledNow = (): boolean => {
      if (!ogFeaturesRef.current.skinsAndCollection) return false;
      const activeWeaponId = WEAPONS[currentWeaponIdx]?.id;
      const activeRoomNow = peerManager.getRoom();
      return isMythicShotgunPerksActive({
        weaponId: activeWeaponId,
        equippedShotgunSkinId: getGameplayEquipped().shotgun_skin,
        isOnline: Boolean(activeRoomNow),
        roomMythicPerksAllowed: activeRoomNow?.mythicPerksAllowed,
      });
    };

    const syncShotgunMythicStats = (skipOnlineCheck = false) => {
      const shotgunW = WEAPONS[4];
      if (!shotgunW || shotgunW.id !== 'shotgun') return;
      const activeRoomNow = skipOnlineCheck ? null : peerManager.getRoom();
      const perksActive =
        ogFeaturesRef.current.skinsAndCollection &&
        isMythicShotgunPerksActive({
          weaponId: 'shotgun',
          equippedShotgunSkinId: getGameplayEquipped().shotgun_skin,
          isOnline: Boolean(activeRoomNow),
          roomMythicPerksAllowed: activeRoomNow?.mythicPerksAllowed,
        });
      const prevMagSize = shotgunW.magSize;
      const nextMagSize = getMythicShotgunMagSize(SHOTGUN_BASE_MAG_SIZE, perksActive);
      shotgunW.magSize = nextMagSize;
      shotgunW.reloadTime = getMythicShotgunReloadDuration(SHOTGUN_BASE_RELOAD_TIME, perksActive);
      if (nextMagSize > prevMagSize && shotgunW.mag === prevMagSize) {
        shotgunW.mag = nextMagSize;
      } else if (shotgunW.mag > nextMagSize) {
        shotgunW.mag = nextMagSize;
      }
      if (!skipOnlineCheck && currentWeaponIdx === 4) {
        updateHUD();
      }
    };
    syncShotgunMythicStats(true);

    const cancelLocalMythicEmote = (notifyNetwork = true) => {
      if (!localEmoteActive) return;
      localEmoteActive = false;
      localEmoteId = null;
      localEmoteElapsedSec = 0;
      if (notifyNetwork && activeOnlineRoomCode) {
        peerManager.sendEmote(null);
      }
    };

    const triggerLocalMythicEmote = () => {
      if (screenStateRef.current !== 'playing' || isLocalSpectating || player.hp <= 0) return;
      if (!ogFeaturesRef.current.skinsAndCollection) return;
      const curW = WEAPONS[currentWeaponIdx];
      const activeEq = getGameplayEquipped();
      const hasShotgunMythic = activeEq.shotgun_skin === MYTHIC_SHOTGUN_ID;
      const hasM249Mythic = activeEq.m249_skin === MYTHIC_M249_ID;
      const canUseEclipseEmote = curW?.id === 'shotgun' && hasShotgunMythic;
      const canUseTempestEmote = hasM249Mythic && (!canUseEclipseEmote);
      if (!canUseEclipseEmote && !canUseTempestEmote) return;
      if (isRoundInputLocked(peerManager.getRoom())) return;
      if (localEmoteActive) {
        cancelLocalMythicEmote(true);
        return;
      }
      if (localEmoteCooldownSec > 0.05) {
        showCenterAlert(`کول‌داون ایموت: ${localEmoteCooldownSec.toFixed(1)} ثانیه`, 900);
        return;
      }
      localInspectProgress = -1;
      localEmoteActive = true;
      localEmoteId = canUseEclipseEmote ? MYTHIC_SHOTGUN_EMOTE_ID : MYTHIC_M249_EMOTE_ID;
      localEmoteElapsedSec = 0;
      localEmoteCooldownSec = canUseEclipseEmote
        ? MYTHIC_SHOTGUN_PERKS.emoteCooldownSec
        : MYTHIC_M249_PERKS.emoteCooldownSec;
      isADS = false;
      setIsSniperScoped(false);
      setIsEclipseAdsSight(false);
      if (canUseEclipseEmote) {
        sound.playEclipseEmote();
      } else {
        sound.playTempestEmote();
      }
      if (activeOnlineRoomCode) {
        peerManager.sendEmote(localEmoteId);
      }
    };

    const triggerLocalMythicInspect = () => {
      if (screenStateRef.current !== 'playing' || isLocalSpectating || player.hp <= 0) return;
      if (!ogFeaturesRef.current.skinsAndCollection) return;
      const curW = WEAPONS[currentWeaponIdx];
      const activeEq = getGameplayEquipped();
      const isM249Inspect = curW?.id === 'lmg' && activeEq.m249_skin === MYTHIC_M249_ID;
      const isShotgunInspect =
        curW?.id === 'shotgun' && activeEq.shotgun_skin === MYTHIC_SHOTGUN_ID;
      if (!isM249Inspect && !isShotgunInspect) return;
      if (isReloading || isFiringInput || isADS) return;
      cancelLocalMythicEmote(true);
      localInspectProgress = 0.001;
      if (isShotgunInspect) {
        sound.playEclipseInspect();
      } else {
        sound.playTempestInspect();
      }
    };
    const getInfernoFxConfig = () =>
      resolveEffectiveSkinFx({
        skinFxMode: skinFxModeRef.current,
        reducedMotion: reducedMotionRef.current,
        preset: gfx.preset,
        autoQualityStage: adaptiveQuality.stage,
        baseScale: activeFxBudget.particleCountScale,
        batterySaver: batterySaverRef.current,
      });

    function spawnTracer(startWorld: THREE.Vector3, endWorld: THREE.Vector3, colorHex = 0xffdd77) {
      _fxTmpV1.subVectors(endWorld, startWorld);
      const totalDist = _fxTmpV1.length();
      if (totalDist < 0.5) return;
      _fxTmpV1.multiplyScalar(1 / totalDist);
      let slot = tracerPool[tracerCursor];
      for (let i = 0; i < TRACER_POOL_SIZE; i++) {
        const idx = (tracerCursor + i) % TRACER_POOL_SIZE;
        if (!tracerPool[idx].active) {
          slot = tracerPool[idx];
          tracerCursor = (idx + 1) % TRACER_POOL_SIZE;
          break;
        }
      }
      if (slot.active) {
        tracerCursor = (tracerCursor + 1) % TRACER_POOL_SIZE;
      }
      slot.active = true;
      slot.dir.copy(_fxTmpV1);
      slot.speed = 128;
      slot.traveled = 0;
      slot.maxDist = totalDist;
      slot.mat.color.setHex(colorHex);
      slot.mesh.position.copy(startWorld);
      slot.mesh.lookAt(endWorld);
      slot.mesh.visible = true;
    }

    // Single InstancedMesh Shell Pool (1 draw call + lightweight MeshLambertMaterial instead of 20 PBR meshes)
    const _instDummy = new THREE.Object3D();
    const _instZeroMat = new THREE.Matrix4().makeScale(0, 0, 0);
    const _instColor = new THREE.Color();
    const shellGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.028, 6);
    const shellMat = new THREE.MeshLambertMaterial({ color: 0xd9a738 });
    const SHELL_POOL_SIZE = 20;
    const shellInstancedMesh = new THREE.InstancedMesh(shellGeo, shellMat, SHELL_POOL_SIZE);
    shellInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    shellInstancedMesh.frustumCulled = false;
    shellInstancedMesh.visible = false;
    const shellPool: ShellPoolItem[] = [];
    let shellCursor = 0;
    for (let i = 0; i < SHELL_POOL_SIZE; i++) {
      shellInstancedMesh.setMatrixAt(i, _instZeroMat);
      shellPool.push({
        active: false,
        pos: new THREE.Vector3(0, -999, 0),
        rot: new THREE.Euler(),
        vel: new THREE.Vector3(),
        rotVel: new THREE.Vector3(),
        life: 0,
      });
    }
    shellInstancedMesh.instanceMatrix.needsUpdate = true;
    scene.add(shellInstancedMesh);

    function spawnShell() {
      if (!activeFxBudget.enableShells || activeFxBudget.maxActiveShells <= 0) return;
      const limit = Math.min(SHELL_POOL_SIZE, activeFxBudget.maxActiveShells);
      const idx = shellCursor % limit;
      shellCursor = (idx + 1) % limit;
      const slot = shellPool[idx];
      _fxTmpV1.set(0.14, -0.06, -0.35).applyMatrix4(camera.matrixWorld);
      slot.pos.copy(_fxTmpV1);
      slot.rot.set(0, 0, 0);
      _fxTmpV2.set(1, 0, 0).applyQuaternion(camera.quaternion);
      _fxTmpV3.set(0, 1, 0).applyQuaternion(camera.quaternion);
      slot.vel
        .copy(_fxTmpV2)
        .multiplyScalar(2.4 + Math.random() * 1.2)
        .addScaledVector(_fxTmpV3, 1.8 + Math.random() * 0.8);
      slot.rotVel.set(Math.random() * 18, Math.random() * 18, Math.random() * 18);
      slot.life = 1.05;
      slot.active = true;
      _instDummy.position.copy(slot.pos);
      _instDummy.rotation.copy(slot.rot);
      _instDummy.scale.setScalar(1);
      _instDummy.updateMatrix();
      shellInstancedMesh.setMatrixAt(idx, _instDummy.matrix);
      shellInstancedMesh.instanceMatrix.needsUpdate = true;
      shellInstancedMesh.visible = true;
    }

    // Single InstancedMesh Particle Pool (1 draw call + 1 MeshBasicMaterial instead of 72 meshes + 72 materials!)
    const sparkGeo = new THREE.BoxGeometry(0.055, 0.055, 0.055);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const PARTICLE_POOL_SIZE = 56;
    const particleInstancedMesh = new THREE.InstancedMesh(sparkGeo, sparkMat, PARTICLE_POOL_SIZE);
    particleInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    particleInstancedMesh.frustumCulled = false;
    particleInstancedMesh.visible = false;
    const particlePool: ParticlePoolItem[] = [];
    let particleCursor = 0;
    let activeBaseParticleCount = 0;
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      particleInstancedMesh.setMatrixAt(i, _instZeroMat);
      particleInstancedMesh.setColorAt(i, _instColor.setHex(0xffdd77));
      particlePool.push({
        active: false,
        pos: new THREE.Vector3(0, -999, 0),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.45,
      });
    }
    particleInstancedMesh.instanceMatrix.needsUpdate = true;
    if (particleInstancedMesh.instanceColor) particleInstancedMesh.instanceColor.needsUpdate = true;
    scene.add(particleInstancedMesh);

    const getTotalActiveParticles = (): number =>
      activeBaseParticleCount +
      infernoVfxPool.getActiveParticleCount() +
      voidVfxPool.getActiveParticleCount() +
      tempestVfxPool.getActiveParticleCount() +
      eclipseVfxPool.getActiveParticleCount() +
      sakuraVfxPool.getActiveParticleCount() +
      novaDragonVfxPool.getActiveParticleCount();

    function spawnParticles(pos: THREE.Vector3, colorHex: number, count = 7, speed = 5) {
      const scaledCount = Math.max(1, Math.round(count * activeFxBudget.particleCountScale));
      const allowed = computeRemainingParticleAllowance(
        getTotalActiveParticles(),
        scaledCount,
        resolveParticleCap(gfx.preset, batterySaverRef.current)
      );
      if (allowed <= 0) return;
      const limit = Math.min(PARTICLE_POOL_SIZE, Math.max(8, activeFxBudget.maxActiveParticles));
      _instColor.setHex(colorHex);
      let colorDirty = false;
      for (let i = 0; i < allowed; i++) {
        const idx = particleCursor % limit;
        particleCursor = (idx + 1) % limit;
        const slot = particlePool[idx];
        if (!slot.active) activeBaseParticleCount++;
        slot.pos.copy(pos);
        slot.vel.set(
          (Math.random() - 0.5) * speed,
          Math.random() * speed * 0.8 + 0.8,
          (Math.random() - 0.5) * speed
        );
        const life = 0.24 + Math.random() * 0.22;
        slot.life = life;
        slot.maxLife = life;
        slot.active = true;
        _instDummy.position.copy(slot.pos);
        _instDummy.rotation.set(0, 0, 0);
        _instDummy.scale.setScalar(1);
        _instDummy.updateMatrix();
        particleInstancedMesh.setMatrixAt(idx, _instDummy.matrix);
        particleInstancedMesh.setColorAt(idx, _instColor);
        colorDirty = true;
      }
      particleInstancedMesh.instanceMatrix.needsUpdate = true;
      if (colorDirty && particleInstancedMesh.instanceColor) {
        particleInstancedMesh.instanceColor.needsUpdate = true;
      }
      particleInstancedMesh.visible = true;
    }

    const decalGeo = new THREE.PlaneGeometry(0.14, 0.14);
    const decalMat = new THREE.MeshBasicMaterial({
      color: 0x0a0a0c,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const DECAL_POOL_SIZE = 28;
    const decalPool: DecalPoolItem[] = [];
    let decalCursor = 0;
    for (let i = 0; i < DECAL_POOL_SIZE; i++) {
      const m = new THREE.Mesh(decalGeo, decalMat);
      m.visible = false;
      scene.add(m);
      decalPool.push({ active: false, mesh: m, life: 0 });
    }

    function spawnDecal(point: THREE.Vector3, normal: THREE.Vector3) {
      if (!activeFxBudget.enableDecals || activeFxBudget.maxActiveDecals <= 0) return;
      const limit = Math.min(DECAL_POOL_SIZE, activeFxBudget.maxActiveDecals);
      const idx = decalCursor % limit;
      decalCursor = (idx + 1) % limit;
      const slot = decalPool[idx];
      slot.mesh.position.copy(point).addScaledVector(normal, 0.015);
      _fxTmpV1.copy(point).add(normal);
      slot.mesh.lookAt(_fxTmpV1);
      slot.life = 7.0;
      slot.active = true;
      slot.mesh.visible = true;
    }

    const katanaArcGeo = new THREE.RingGeometry(0.6, 1.35, 20, 1, -Math.PI * 0.42, Math.PI * 0.84);
    const ARC_POOL_SIZE = 4;
    const arcPool: ArcPoolItem[] = [];
    let arcCursor = 0;
    for (let i = 0; i < ARC_POOL_SIZE; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x00f7ff,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const m = new THREE.Mesh(katanaArcGeo, mat);
      m.visible = false;
      scene.add(m);
      arcPool.push({ active: false, mesh: m, mat, vel: new THREE.Vector3(), life: 0, maxLife: 0.18 });
    }

    function spawnKatanaArc(isSakura = false) {
      const idx = arcCursor % ARC_POOL_SIZE;
      arcCursor = (idx + 1) % ARC_POOL_SIZE;
      const slot = arcPool[idx];
      _fxTmpV1.set(0, 0, -1).applyQuaternion(camera.quaternion);
      slot.mesh.position.copy(camera.position).addScaledVector(_fxTmpV1, 1.45);
      slot.mesh.quaternion.copy(camera.quaternion);
      slot.mesh.rotateX(Math.PI * 0.42);
      slot.mesh.rotateZ(katanaSlashDir * 0.5);
      slot.mesh.scale.setScalar(isSakura ? 1.18 : 1);
      slot.mat.color.setHex(isSakura ? 0xff4d94 : 0x00f7ff);
      slot.mat.opacity = isSakura ? 0.94 : 0.85;
      slot.vel.copy(_fxTmpV1).multiplyScalar(2.5);
      slot.life = isSakura ? 0.22 : 0.18;
      slot.maxLife = slot.life;
      slot.active = true;
      slot.mesh.visible = true;
      if (isSakura) {
        const fxCfg = getInfernoFxConfig();
        sakuraVfxPool.spawnSlashPetals(camera.position, _fxTmpV1, fxCfg.scale, fxCfg.disabled);
      }
    }

    function clearPooledVfx() {
      for (let i = 0; i < tracerPool.length; i++) {
        tracerPool[i].active = false;
        tracerPool[i].mesh.visible = false;
      }
      for (let i = 0; i < shellPool.length; i++) {
        shellPool[i].active = false;
        shellInstancedMesh.setMatrixAt(i, _instZeroMat);
      }
      shellInstancedMesh.instanceMatrix.needsUpdate = true;
      shellInstancedMesh.visible = false;
      for (let i = 0; i < particlePool.length; i++) {
        particlePool[i].active = false;
        particleInstancedMesh.setMatrixAt(i, _instZeroMat);
      }
      activeBaseParticleCount = 0;
      particleInstancedMesh.instanceMatrix.needsUpdate = true;
      particleInstancedMesh.visible = false;
      for (let i = 0; i < arcPool.length; i++) {
        arcPool[i].active = false;
        arcPool[i].mesh.visible = false;
      }
      for (let i = 0; i < decalPool.length; i++) {
        decalPool[i].active = false;
        decalPool[i].mesh.visible = false;
      }
      sakuraVfxPool.clear();
      novaDragonVfxPool.clear();
    }

    // =========================================================
    // ENEMY BOTS & REALISTIC 3D TACTICAL OPERATOR MODELS
    // =========================================================
    let currentBotDifficulty: BotDifficultyPreset = 'medium';
    const ENEMY_CLASSES = {
      assault: {
        name: 'اپراتور تهاجمی',
        hp: 100,
        speed: 3.9,
        color: 0x333c48,
        vestColor: 0x1d232b,
        visor: '#c92a2a',
        scale: 1.0,
        fireInterval: 2.2,
        dmg: 10,
      },
      rusher: {
        name: 'مهاجم سریع (SMG)',
        hp: 75,
        speed: 5.5,
        color: 0x45382b,
        vestColor: 0x261f18,
        visor: '#d97706',
        scale: 0.95,
        fireInterval: 1.85,
        dmg: 8,
      },
      heavy: {
        name: 'جاگرنات زرهی (LMG)',
        hp: 190,
        speed: 2.8,
        color: 0x322b40,
        vestColor: 0x191522,
        visor: '#9333ea',
        scale: 1.16,
        fireInterval: 2.5,
        dmg: 14,
      },
    };

    interface EnemyBot {
      type: keyof typeof ENEMY_CLASSES;
      cfg: (typeof ENEMY_CLASSES)['assault'];
      root: THREE.Group;
      torsoMesh: THREE.Mesh;
      headMesh: THREE.Mesh;
      legL: THREE.Group;
      legR: THREE.Group;
      armL: THREE.Group;
      armR: THREE.Group;
      weaponGroup: THREE.Group;
      muzzleFlash: THREE.Mesh;
      muzzleFlashTimer: number;
      hpBg: THREE.Mesh;
      hpFill: THREE.Mesh;
      bodyMat: THREE.MeshStandardMaterial;
      fadeHideMeshes: THREE.Object3D[];
      hp: number;
      maxHp: number;
      speed: number;
      dmg: number;
      fireInterval: number;
      bulletSpeed: number;
      spread: number;
      desiredRangeMult: number;
      strafeFrequencyMult: number;
      alive: boolean;
      deathTimer: number;
      deathDir: number;
      hitFlash: number;
      strafeDir: number;
      strafeTimer: number;
      fireTimer: number;
      walkPhase: number;
      visibleToPlayer: boolean;
      combatBlend: number;
      alertTimer: number;
      currentYaw: number;
      recoilKickZ: number;
    }

    const enemies: EnemyBot[] = [];
    let enemyHitMeshes: THREE.Object3D[] = [];

    function countAliveEnemies(): number {
      let count = 0;
      for (let i = 0; i < enemies.length; i++) {
        if (enemies[i].alive) count++;
      }
      return count;
    }

    function rebuildEnemyHitboxes() {
      enemyHitMeshes = [];
      enemies.forEach((e) => {
        if (!e.alive) return;
        enemyHitMeshes.push(e.headMesh, e.torsoMesh);
        [e.legL, e.legR, e.armL, e.armR].forEach((limbGroup) => {
          limbGroup.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              enemyHitMeshes.push(child);
            }
          });
        });
      });
      if (typeof rebuildRemoteHitboxes === 'function') {
        rebuildRemoteHitboxes();
      }
    }

    // Shared & batched bot geometries/materials (merges armor, helmet, leg gear & gun meshes to cut draw calls)
    const botArmorGearMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.78,
      metalness: 0.25,
    });
    const botWeaponMergedMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      metalness: 0.72,
      roughness: 0.36,
    });
    const botStaticDarkGearMat = new THREE.MeshStandardMaterial({
      color: 0x12151a,
      roughness: 0.82,
      metalness: 0.3,
    });
    const botFlashMat = new THREE.MeshBasicMaterial({ color: 0xffb733, transparent: true, opacity: 0.92 });
    const botFlashGeo = new THREE.SphereGeometry(0.09, 6, 6);

    const botFaceMats: Partial<Record<keyof typeof ENEMY_CLASSES, THREE.MeshBasicMaterial>> = {};
    const botWeaponMergedGeos: Partial<Record<keyof typeof ENEMY_CLASSES, THREE.BufferGeometry>> = {};
    const botTorsoArmorGeos: Partial<Record<keyof typeof ENEMY_CLASSES, THREE.BufferGeometry>> = {};
    const botHelmetGeos: Partial<Record<keyof typeof ENEMY_CLASSES, THREE.BufferGeometry>> = {};

    const sharedBotGeos = {
      legUniform: (() => {
        const thigh = new THREE.BoxGeometry(0.23, 0.42, 0.25);
        thigh.translate(0, -0.2, 0);
        const calf = new THREE.BoxGeometry(0.21, 0.36, 0.23);
        calf.translate(0, -0.56, 0);
        const p1 = thigh.index ? thigh.toNonIndexed() : thigh;
        const p2 = calf.index ? calf.toNonIndexed() : calf;
        if (p1 !== thigh) thigh.dispose();
        if (p2 !== calf) calf.dispose();
        const merged = mergeGeometries([p1, p2], false);
        p1.dispose();
        p2.dispose();
        return merged || new THREE.BoxGeometry(0.23, 0.74, 0.25);
      })(),
      legGear: (() => {
        const parts = [
          makeVertexColoredPart(new THREE.BoxGeometry(0.24, 0.12, 0.27), 0x12151a, [0, -0.4, 0.02]),
          makeVertexColoredPart(new THREE.BoxGeometry(0.23, 0.14, 0.31), 0x12151a, [0, -0.72, 0.04]),
        ];
        const merged = mergeGeometries(parts, false);
        parts.forEach((p) => p.dispose());
        return merged || new THREE.BoxGeometry(0.23, 0.14, 0.31);
      })(),
      torso: new THREE.BoxGeometry(0.58, 0.76, 0.32),
      head: new THREE.BoxGeometry(0.35, 0.36, 0.35),
      faceMosaic: new THREE.PlaneGeometry(0.32, 0.28),
      upperArm: new THREE.BoxGeometry(0.17, 0.36, 0.17),
      foreArmL: new THREE.BoxGeometry(0.15, 0.34, 0.15),
      foreArmR: new THREE.BoxGeometry(0.15, 0.32, 0.15),
      shadowDisc: new THREE.CircleGeometry(0.48, 14),
      hpBg: new THREE.PlaneGeometry(0.75, 0.08),
      hpFill: new THREE.PlaneGeometry(0.71, 0.05),
    };
    const sharedBotShadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.42, depthWrite: false });
    const sharedBotHpBgMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.65, side: THREE.DoubleSide });
    const sharedBotHpFillMat = new THREE.MeshBasicMaterial({ color: 0xff2e4c, side: THREE.DoubleSide });

    function getBotFaceMat(typeKey: keyof typeof ENEMY_CLASSES): THREE.MeshBasicMaterial {
      const existing = botFaceMats[typeKey];
      if (existing) return existing;
      const mat = new THREE.MeshBasicMaterial({
        map: makeRedactedFaceTexture(ENEMY_CLASSES[typeKey].visor),
      });
      botFaceMats[typeKey] = mat;
      return mat;
    }

    function getBotWeaponMergedGeo(typeKey: keyof typeof ENEMY_CLASSES): THREE.BufferGeometry {
      const existing = botWeaponMergedGeos[typeKey];
      if (existing) return existing;
      const furnitureHex =
        typeKey === 'assault' ? 0x5c3a21 : typeKey === 'rusher' ? 0x2c353d : 0x3b3548;
      const gunMetalHex = 0x1c2026;
      const gunSteelHex = 0x4e5763;
      const barrelLen = typeKey === 'rusher' ? 0.26 : typeKey === 'heavy' ? 0.44 : 0.38;
      const parts: THREE.BufferGeometry[] = [
        makeVertexColoredPart(new THREE.BoxGeometry(0.08, 0.11, 0.36), gunMetalHex, [0, 0, 0]),
        makeVertexColoredPart(new THREE.BoxGeometry(0.05, 0.025, 0.32), gunSteelHex, [0, 0.065, 0.02]),
        makeVertexColoredPart(new THREE.BoxGeometry(0.068, 0.12, 0.24), furnitureHex, [0, -0.02, -0.26]),
        makeVertexColoredPart(new THREE.BoxGeometry(0.055, 0.13, 0.065), furnitureHex, [0, -0.1, -0.08], [0.28, 0, 0]),
        makeVertexColoredPart(new THREE.BoxGeometry(0.075, 0.085, 0.26), furnitureHex, [0, 0.01, 0.26]),
        makeVertexColoredPart(
          new THREE.CylinderGeometry(0.02, 0.02, barrelLen, 8),
          gunSteelHex,
          [0, 0.02, 0.34 + barrelLen * 0.4],
          [Math.PI / 2, 0, 0]
        ),
        makeVertexColoredPart(
          new THREE.BoxGeometry(0.025, 0.055, 0.025),
          gunMetalHex,
          [0, 0.055, 0.32 + barrelLen * 0.7]
        ),
        makeVertexColoredPart(new THREE.BoxGeometry(0.028, 0.028, 0.05), 0xff1e38, [0.045, 0.02, 0.32]),
        typeKey === 'heavy'
          ? makeVertexColoredPart(
              new THREE.CylinderGeometry(0.11, 0.11, 0.09, 10),
              gunMetalHex,
              [0, -0.13, 0.08],
              [Math.PI / 2, 0, 0]
            )
          : makeVertexColoredPart(
              new THREE.BoxGeometry(0.055, 0.19, 0.075),
              gunMetalHex,
              [0, -0.13, 0.09],
              [-0.25, 0, 0]
            ),
        makeVertexColoredPart(new THREE.BoxGeometry(0.06, 0.06, 0.09), gunMetalHex, [0, 0.095, 0.02]),
      ];
      const merged = mergeGeometries(parts, false) || new THREE.BoxGeometry(0.08, 0.11, 0.6);
      parts.forEach((p) => p.dispose());
      botWeaponMergedGeos[typeKey] = merged;
      return merged;
    }

    function getBotTorsoArmorGeo(typeKey: keyof typeof ENEMY_CLASSES): THREE.BufferGeometry {
      const existing = botTorsoArmorGeos[typeKey];
      if (existing) return existing;
      const vestHex = ENEMY_CLASSES[typeKey].vestColor;
      const gearHex = 0x12151a;
      const parts: THREE.BufferGeometry[] = [
        makeVertexColoredPart(new THREE.BoxGeometry(0.61, 0.11, 0.35), gearHex, [0, 0.82, 0]),
        makeVertexColoredPart(new THREE.BoxGeometry(0.54, 0.52, 0.37), vestHex, [0, 1.2, 0]),
        makeVertexColoredPart(new THREE.BoxGeometry(0.1, 0.18, 0.06), gearHex, [-0.14, 1.1, 0.2]),
        makeVertexColoredPart(new THREE.BoxGeometry(0.1, 0.18, 0.06), gearHex, [0, 1.1, 0.2]),
        makeVertexColoredPart(new THREE.BoxGeometry(0.1, 0.18, 0.06), gearHex, [0.14, 1.1, 0.2]),
        makeVertexColoredPart(new THREE.BoxGeometry(0.16, 0.18, 0.26), vestHex, [-0.35, 1.44, 0]),
        makeVertexColoredPart(new THREE.BoxGeometry(0.16, 0.18, 0.26), vestHex, [0.35, 1.44, 0]),
        makeVertexColoredPart(new THREE.CylinderGeometry(0.11, 0.13, 0.14, 8), gearHex, [0, 1.58, 0]),
      ];
      const merged = mergeGeometries(parts, false) || new THREE.BoxGeometry(0.54, 0.52, 0.37);
      parts.forEach((p) => p.dispose());
      botTorsoArmorGeos[typeKey] = merged;
      return merged;
    }

    function getBotHelmetGeo(typeKey: keyof typeof ENEMY_CLASSES): THREE.BufferGeometry {
      const existing = botHelmetGeos[typeKey];
      if (existing) return existing;
      const vestHex = ENEMY_CLASSES[typeKey].vestColor;
      const gearHex = 0x12151a;
      const parts: THREE.BufferGeometry[] = [
        makeVertexColoredPart(
          new THREE.SphereGeometry(0.24, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62),
          vestHex,
          [0, 0.04, -0.01]
        ),
        makeVertexColoredPart(new THREE.BoxGeometry(0.16, 0.06, 0.08), gearHex, [0, 0.14, 0.2]),
        makeVertexColoredPart(
          new THREE.CylinderGeometry(0.032, 0.032, 0.11, 6),
          gearHex,
          [-0.05, 0.13, 0.25],
          [Math.PI / 2, 0, 0]
        ),
        makeVertexColoredPart(
          new THREE.CylinderGeometry(0.032, 0.032, 0.11, 6),
          gearHex,
          [0.05, 0.13, 0.25],
          [Math.PI / 2, 0, 0]
        ),
      ];
      const merged = mergeGeometries(parts, false) || new THREE.BoxGeometry(0.38, 0.2, 0.38);
      parts.forEach((p) => p.dispose());
      botHelmetGeos[typeKey] = merged;
      return merged;
    }

    function disposeEnemyBot(e: EnemyBot) {
      scene.remove(e.root);
      e.bodyMat.dispose();
    }

    function buildBotWeaponModel(typeKey: keyof typeof ENEMY_CLASSES): {
      weaponGroup: THREE.Group;
      weaponBodyMesh: THREE.Mesh;
      muzzleFlash: THREE.Mesh;
    } {
      const wg = new THREE.Group();
      const barrelLen = typeKey === 'rusher' ? 0.26 : typeKey === 'heavy' ? 0.44 : 0.38;
      const weaponBodyMesh = new THREE.Mesh(getBotWeaponMergedGeo(typeKey), botWeaponMergedMat);
      wg.add(weaponBodyMesh);

      const muzzleFlash = new THREE.Mesh(botFlashGeo, botFlashMat);
      muzzleFlash.scale.set(1, 1, 2.2);
      muzzleFlash.position.set(0, 0.02, 0.38 + barrelLen * 0.85);
      muzzleFlash.visible = false;
      wg.add(muzzleFlash);

      return { weaponGroup: wg, weaponBodyMesh, muzzleFlash };
    }

    function createEnemy(typeKey: keyof typeof ENEMY_CLASSES, x: number, z: number) {
      const cfg = ENEMY_CLASSES[typeKey];
      const params = computeBotParameters(playModeRef.current, currentBotDifficulty, trainingConfigRef.current);

      const root = new THREE.Group();
      root.position.set(x, 0, z);
      root.scale.setScalar(cfg.scale);

      const bodyMat = new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.68, metalness: 0.18 });
      const fadeHideMeshes: THREE.Object3D[] = [];

      // Articulated Left & Right Legs (2 draw calls each instead of 4, exact limb hitbox bounds preserved)
      function buildLeg(xOffset: number): THREE.Group {
        const legGroup = new THREE.Group();
        legGroup.position.set(xOffset, 0.78, 0);
        const uniformMesh = new THREE.Mesh(sharedBotGeos.legUniform, bodyMat);
        const gearMesh = new THREE.Mesh(sharedBotGeos.legGear, botArmorGearMat);
        legGroup.add(uniformMesh, gearMesh);
        fadeHideMeshes.push(gearMesh);
        return legGroup;
      }

      const legL = buildLeg(-0.17);
      const legR = buildLeg(0.17);

      // Sculpted Torso (per-bot bodyMat for hit flash & ESP) + Single Merged Armor/Pouches/Pads/Neck Mesh
      const torso = new THREE.Mesh(sharedBotGeos.torso, bodyMat);
      torso.position.set(0, 1.16, 0);
      torso.castShadow = !isSoftwareGl;

      const armorRigMesh = new THREE.Mesh(getBotTorsoArmorGeo(typeKey), botArmorGearMat);
      fadeHideMeshes.push(armorRigMesh);

      // Head + Single Merged Ballistic Helmet/NVG Mesh + Shared Redacted Face
      const head = new THREE.Mesh(sharedBotGeos.head, bodyMat);
      head.position.set(0, 1.78, 0);
      head.castShadow = !isSoftwareGl;

      const helmetMesh = new THREE.Mesh(getBotHelmetGeo(typeKey), botArmorGearMat);
      const faceMosaic = new THREE.Mesh(sharedBotGeos.faceMosaic, getBotFaceMat(typeKey));
      faceMosaic.position.set(0, -0.02, 0.182);
      head.add(helmetMesh, faceMosaic);
      fadeHideMeshes.push(helmetMesh, faceMosaic);

      // Articulated Arms holding the 3D Rifle in Tactical Ready Stance
      const armL = new THREE.Group();
      armL.position.set(-0.36, 1.38, 0.05);
      const upperArmL = new THREE.Mesh(sharedBotGeos.upperArm, bodyMat);
      upperArmL.position.set(0.08, -0.14, 0.12);
      upperArmL.rotation.set(-0.85, 0.38, 0);
      const foreArmL = new THREE.Mesh(sharedBotGeos.foreArmL, botStaticDarkGearMat);
      foreArmL.position.set(0.24, -0.2, 0.34);
      foreArmL.rotation.set(-1.35, 0.52, 0);
      armL.add(upperArmL, foreArmL);
      fadeHideMeshes.push(foreArmL);

      const armR = new THREE.Group();
      armR.position.set(0.36, 1.38, 0.05);
      const upperArmR = new THREE.Mesh(sharedBotGeos.upperArm, bodyMat);
      upperArmR.position.set(-0.04, -0.14, 0.1);
      upperArmR.rotation.set(-0.95, -0.15, 0);
      const foreArmR = new THREE.Mesh(sharedBotGeos.foreArmR, botStaticDarkGearMat);
      foreArmR.position.set(-0.12, -0.22, 0.26);
      foreArmR.rotation.set(-1.25, -0.2, 0);
      armR.add(upperArmR, foreArmR);
      fadeHideMeshes.push(foreArmR);

      const { weaponGroup, weaponBodyMesh, muzzleFlash } = buildBotWeaponModel(typeKey);
      weaponGroup.position.set(0.16, 1.22, 0.32);
      fadeHideMeshes.push(weaponBodyMesh);

      // Contact shadow disc at bot feet (shared material & geometry)
      const shadowDisc = new THREE.Mesh(sharedBotGeos.shadowDisc, sharedBotShadowMat);
      shadowDisc.rotation.x = -Math.PI / 2;
      shadowDisc.position.y = 0.015;
      fadeHideMeshes.push(shadowDisc);

      const hpBg = new THREE.Mesh(sharedBotGeos.hpBg, sharedBotHpBgMat);
      hpBg.position.set(0, 2.22, 0);
      const hpFill = new THREE.Mesh(sharedBotGeos.hpFill, sharedBotHpFillMat);
      hpFill.position.set(0, 2.22, 0.005);

      root.add(shadowDisc, legL, legR, torso, armorRigMesh, head, armL, armR, weaponGroup, hpBg, hpFill);
      scene.add(root);

      const scaledHp = Math.round(cfg.hp * params.hpMult);
      const enemy: EnemyBot = {
        type: typeKey,
        cfg,
        root,
        torsoMesh: torso,
        headMesh: head,
        legL,
        legR,
        armL,
        armR,
        weaponGroup,
        muzzleFlash,
        muzzleFlashTimer: 0,
        hpBg,
        hpFill,
        bodyMat,
        fadeHideMeshes,
        hp: scaledHp,
        maxHp: scaledHp,
        speed: cfg.speed * params.speedMult,
        dmg: Math.max(1, Math.round(cfg.dmg * params.dmgMult)),
        fireInterval: cfg.fireInterval * params.fireIntervalMult,
        bulletSpeed: params.bulletSpeed,
        spread: params.spread,
        desiredRangeMult: params.desiredRangeMult,
        strafeFrequencyMult: params.strafeFrequencyMult,
        alive: true,
        deathTimer: 0,
        deathDir: Math.random() > 0.5 ? 1 : -1,
        hitFlash: 0,
        strafeDir: Math.random() > 0.5 ? 1 : -1,
        strafeTimer: 1 + Math.random() * 2,
        fireTimer: 1.0 + Math.random() * cfg.fireInterval,
        walkPhase: Math.random() * Math.PI * 2,
        visibleToPlayer: false,
        combatBlend: 0,
        alertTimer: 0,
        currentYaw: Math.random() * Math.PI * 2,
        recoilKickZ: 0,
      };

      head.userData = { enemy, isHead: true, bodyPart: 'head' as HitBodyPart };
      torso.userData = { enemy, isHead: false, bodyPart: 'torso' as HitBodyPart };
      [legL, legR, armL, armR].forEach((limbGroup) => {
        limbGroup.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.userData = { enemy, isHead: false, bodyPart: 'limbs' as HitBodyPart };
          }
        });
      });
      enemies.push(enemy);
      rebuildEnemyHitboxes();
      return enemy;
    }

    function applyLiveBotParamsToExistingBots() {
      const params = computeBotParameters(playModeRef.current, currentBotDifficulty, trainingConfigRef.current);
      enemies.forEach((e) => {
        if (!e.alive) return;
        e.speed = e.cfg.speed * params.speedMult;
        e.dmg = Math.max(1, Math.round(e.cfg.dmg * params.dmgMult));
        e.fireInterval = e.cfg.fireInterval * params.fireIntervalMult;
        e.bulletSpeed = params.bulletSpeed;
        e.spread = params.spread;
        e.desiredRangeMult = params.desiredRangeMult;
        e.strafeFrequencyMult = params.strafeFrequencyMult;
      });
    }

    function spawnEnemyBullet(
      fromPos: THREE.Vector3,
      targetPos: THREE.Vector3,
      dmg: number,
      spread: number,
      bulletSpeed: number
    ) {
      let slot = enemyBulletPool[enemyBulletCursor];
      for (let i = 0; i < ENEMY_BULLET_POOL_SIZE; i++) {
        const idx = (enemyBulletCursor + i) % ENEMY_BULLET_POOL_SIZE;
        if (!enemyBulletPool[idx].active) {
          slot = enemyBulletPool[idx];
          enemyBulletCursor = (idx + 1) % ENEMY_BULLET_POOL_SIZE;
          break;
        }
      }
      if (slot.active) {
        enemyBulletCursor = (enemyBulletCursor + 1) % ENEMY_BULLET_POOL_SIZE;
      }
      slot.dir.subVectors(targetPos, fromPos).normalize();
      slot.dir.x += (Math.random() - 0.5) * spread;
      slot.dir.y += (Math.random() - 0.5) * (spread * 0.7);
      slot.dir.z += (Math.random() - 0.5) * spread;
      slot.dir.normalize();
      slot.active = true;
      slot.speed = bulletSpeed;
      slot.dmg = dmg;
      slot.life = 2.8;
      slot.mesh.position.copy(fromPos);
      _fxTmpV2.copy(fromPos).add(slot.dir);
      slot.mesh.lookAt(_fxTmpV2);
      slot.mesh.visible = true;
    }

    // =========================================================
    // PLAYER PHYSICS & STATE
    // =========================================================
    const player = {
      pos: new THREE.Vector3(0, 0, 24),
      vel: new THREE.Vector3(),
      yaw: 0,
      pitch: 0,
      height: 1.72,
      radius: 0.68,
      onGround: true,
      hp: 100,
      maxHp: 100,
      armor: 25,
      maxArmor: 100,
      baseSpeed: 7.2,
    };

    let wave = 1;
    let score = 0;
    let totalKills = 0;
    let offlineShotsFired = 0;
    let offlineShotsHit = 0;
    let offlineHeadshots = 0;
    let slideState = createInitialSlideState();
    let currentEyeHeight = PLAYER_STAND_EYE_HEIGHT;
    const tmpAimAssistWorldPos = new THREE.Vector3();
    let wavePauseTimer = 0;
    let enemiesToSpawn = 0;
    let spawnIntervalTimer = 0;
    let isADS = false;
    let isFiringInput = false;
    let sensValue = 2.65;
    let adsSensMult = 1.35;
    let crosshairVisible = true;
    let manualLeanDir: -1 | 0 | 1 = 0; // -1 = lean left, 1 = lean right, 0 = auto corner lean
    let currentLean = 0; // smoothed [-1..1]
    let isCornerMounted = false;

    const keys: Record<string, boolean> = {};
    let joyMoveX = 0;
    let joyMoveY = 0;

    function isPositionFree(x: number, z: number, radius: number) {
      if (Math.abs(x) > activeArenaHalf - 2 || Math.abs(z) > activeArenaHalf - 2) return false;
      for (let i = 0; i < wallColliders.length; i++) {
        const b = wallColliders[i];
        if (x + radius > b.minX && x - radius < b.maxX && z + radius > b.minZ && z - radius < b.maxZ) return false;
      }
      return true;
    }

    // Detect Warzone-style Wall Corner Peek / Mount automatically when near a real cover edge in front
    function detectAutoCornerLean(strafeInputX = 0): number {
      if (manualLeanDir !== 0) return manualLeanDir;
      if (keys['KeyZ']) return -1;
      if (keys['KeyX']) return 1;

      return computeAutoCornerLean(
        player.pos.x,
        player.pos.y,
        player.pos.z,
        player.yaw,
        isADS,
        strafeInputX,
        currentLean,
        wallColliders,
        activeArenaHalf
      );
    }

    function destroyPot(pot: DestructiblePot) {
      if (!pot.alive) return;
      pot.alive = false;
      pot.respawnTimer = 12.0;
      pot.group.visible = false;
      const worldPt = new THREE.Vector3(pot.x, pot.y + 0.35, pot.z);
      spawnParticles(worldPt, 0xd95f2a, 9, 5.2);
      spawnParticles(worldPt, 0x16c65a, 5, 4.0);
      sound.playPotBreak();
      triggerHitmarker(false);
      score += 15;
      showCenterAlert('گلدان سفالی متلاشی شد (+15)', 1200);
      updateHUD();
    }

    // =========================================================
    // DOM REFS & HUD UPDATES
    // =========================================================
    const fpsValueEl = document.getElementById('fps-value');
    const bodycamRecTimeEl = document.getElementById('bodycam-rec-time');
    const hpBarInner = document.getElementById('hp-bar-inner');
    const hpText = document.getElementById('hp-text');
    const armorBarInner = document.getElementById('armor-bar-inner');
    const armorText = document.getElementById('armor-text');
    const ammoMagEl = document.getElementById('ammo-mag');
    const ammoReserveEl = document.getElementById('ammo-reserve');
    const hudWave = document.getElementById('hud-wave');
    const hudEnemies = document.getElementById('hud-enemies');
    const hudScore = document.getElementById('hud-score');
    const buffStrip = document.getElementById('buff-strip');
    const hitmarkerEl = document.getElementById('hitmarker');
    const damageVignette = document.getElementById('damage-vignette');
    const powerVignette = document.getElementById('power-vignette');
    const pickupFlash = document.getElementById('pickup-flash');
    const reloadIndicator = document.getElementById('reload-indicator');
    const reloadBarFill = document.getElementById('reload-bar-fill');
    const centerAlert = document.getElementById('center-alert');
    const centerAlertText = document.getElementById('center-alert-text');
    const killFeed = document.getElementById('kill-feed');
    const btnPower = document.getElementById('btn-power');
    const powerCdText = document.getElementById('power-cd-text');

    let hitmarkerTimeout: number | undefined;
    let alertTimeout: number | undefined;

    function showCenterAlert(msg: string, duration = 2200) {
      if (!centerAlert || !centerAlertText) return;
      centerAlertText.textContent = msg;
      centerAlert.classList.add('is-visible');
      centerAlert.style.opacity = '1';
      window.clearTimeout(alertTimeout);
      alertTimeout = window.setTimeout(() => {
        centerAlert.classList.remove('is-visible');
        centerAlert.style.opacity = '0';
      }, duration);
    }

    function addStructuredKillFeed(entry: {
      killerName: string;
      killerTeam: TeamId;
      weaponName: string;
      victimName: string;
      victimTeam: TeamId;
      isHeadshot: boolean;
      infernoLegendary?: boolean;
      voidLegendary?: boolean;
      tempestMythic?: boolean;
      eclipseMythic?: boolean;
      killIconSymbol?: string;
      killIconColorHex?: string;
      killerBadgeSymbol?: string;
      killerBadgeColorHex?: string;
    }) {
      if (!killFeed || !ogFeaturesRef.current.killFeed) return;
      const div = document.createElement('div');
      div.className =
        'kill-msg structured' +
        (entry.isHeadshot ? ' headshot' : '') +
        (entry.infernoLegendary ? ' inferno-legendary' : '') +
        (entry.voidLegendary ? ' void-legendary' : '') +
        (entry.tempestMythic ? ' tempest-mythic' : '') +
        (entry.eclipseMythic ? ' eclipse-mythic' : '');
      div.setAttribute('dir', 'rtl');
      div.setAttribute('data-testid', 'kill-feed-item');

      if (entry.killerBadgeSymbol) {
        const bSpan = document.createElement('span');
        bSpan.className = 'kf-badge-sym';
        bSpan.style.color = entry.killerBadgeColorHex || '#fbbf24';
        bSpan.textContent = entry.killerBadgeSymbol;
        div.appendChild(bSpan);
      }

      const killerSpan = document.createElement('span');
      killerSpan.className = 'kf-name';
      killerSpan.style.color = entry.eclipseMythic
        ? '#fef3c7'
        : entry.tempestMythic
          ? '#ffe4e6'
          : entry.voidLegendary
            ? '#a5f3fc'
            : entry.infernoLegendary
              ? '#fde68a'
              : getTeamColor(entry.killerTeam);
      killerSpan.textContent = entry.killerName;

      const weaponSpan = document.createElement('span');
      weaponSpan.className = entry.eclipseMythic
        ? 'kf-weapon kf-weapon-eclipse'
        : entry.tempestMythic
          ? 'kf-weapon kf-weapon-mythic'
          : entry.voidLegendary
            ? 'kf-weapon kf-weapon-void'
            : entry.infernoLegendary
              ? 'kf-weapon kf-weapon-inferno'
              : 'kf-weapon';
      weaponSpan.textContent = entry.eclipseMythic
        ? 'ECLIPSE SPAS-12'
        : entry.tempestMythic
          ? 'TEMPEST M249'
          : entry.voidLegendary
            ? 'VOID AWM'
            : entry.infernoLegendary
              ? 'INFERNO AK'
              : entry.weaponName;

      const victimSpan = document.createElement('span');
      victimSpan.className = 'kf-name';
      victimSpan.style.color = getTeamColor(entry.victimTeam);
      victimSpan.textContent = entry.victimName;

      div.appendChild(killerSpan);
      if (entry.killIconSymbol) {
        const kiSpan = document.createElement('span');
        kiSpan.className = 'kf-custom-icon';
        kiSpan.style.color = entry.killIconColorHex || '#f59e0b';
        kiSpan.textContent = entry.killIconSymbol;
        div.appendChild(kiSpan);
      }
      div.appendChild(weaponSpan);
      if (entry.isHeadshot) {
        const hsSpan = document.createElement('span');
        hsSpan.className = 'kf-hs-badge';
        hsSpan.title = 'هدشات';
        hsSpan.textContent = '⌖';
        div.appendChild(hsSpan);
      }
      div.appendChild(victimSpan);

      killFeed.prepend(div);
      while (killFeed.children.length > KILL_FEED_MAX_ITEMS && killFeed.lastChild) {
        killFeed.removeChild(killFeed.lastChild);
      }
      window.setTimeout(() => {
        if (div.parentNode) div.parentNode.removeChild(div);
      }, KILL_FEED_TTL_MS);
    }

    function triggerHitmarker(isHeadshot: boolean, isKill = false) {
      if (!hitmarkerEl) return;
      const path = hitmarkerEl.querySelector('path');
      if (path) path.setAttribute('stroke', isHeadshot || isKill ? '#ff2e4c' : '#ffffff');
      hitmarkerEl.classList.toggle('kill', isKill);
      hitmarkerEl.classList.add('active');
      window.clearTimeout(hitmarkerTimeout);
      hitmarkerTimeout = window.setTimeout(() => {
        hitmarkerEl.classList.remove('active');
        hitmarkerEl.classList.remove('kill');
      }, isKill ? 150 : 110);
    }

    interface CachedWeaponSlotEls {
      hpBadgeEl: HTMLElement | null;
      hpTextEl: HTMLElement | null;
      ammoBadgeEl: HTMLElement | null;
      ammoTextEl: HTMLElement | null;
      ammoBarEl: HTMLElement | null;
      lastHpColor: string;
      lastAmmoAccent: string;
      lastBarWidth: string;
      lastBarColor: string;
    }
    const weaponSlotElCache: CachedWeaponSlotEls[] = [];
    let lastHpWidthStr = '';
    let lastHpBgStr = '';
    let lastHpTextStr = '';
    let lastArmWidthStr = '';
    let lastArmTextStr = '';
    let lastAmmoMagStr = '';
    let lastAmmoMagColor = '';
    let lastAmmoResStr = '';
    let lastHudWaveText = '';
    let lastHudEnemiesText = '';
    let lastHudScoreText = '';
    let lastBuffStripHtml = '';
    let lastPowerVigOpacity = '';
    let lastPowerOnCd = false;
    let lastPowerCdStr = '';

    function updateHUD() {
      if (hpBarInner && hpText) {
        const hpPct = Math.max(0, (player.hp / player.maxHp) * 100);
        const nextHpWidth = hpPct.toFixed(1) + '%';
        const nextHpBg = hpPct > 50 ? '#f8fafc' : hpPct > 25 ? '#fda4af' : '#f43f5e';
        const nextHpText = cheatConfigRef.current.godMode ? '∞' : String(Math.ceil(player.hp));
        if (nextHpWidth !== lastHpWidthStr) {
          lastHpWidthStr = nextHpWidth;
          hpBarInner.style.width = nextHpWidth;
        }
        if (nextHpBg !== lastHpBgStr) {
          lastHpBgStr = nextHpBg;
          hpBarInner.style.background = nextHpBg;
        }
        if (nextHpText !== lastHpTextStr) {
          lastHpTextStr = nextHpText;
          hpText.textContent = nextHpText;
        }
      }

      if (armorBarInner && armorText) {
        const armPct = Math.max(0, (player.armor / player.maxArmor) * 100);
        const nextArmWidth = armPct.toFixed(1) + '%';
        const nextArmText = String(Math.ceil(player.armor));
        if (nextArmWidth !== lastArmWidthStr) {
          lastArmWidthStr = nextArmWidth;
          armorBarInner.style.width = nextArmWidth;
        }
        if (nextArmText !== lastArmTextStr) {
          lastArmTextStr = nextArmText;
          armorText.textContent = nextArmText;
        }
      }

      const w = WEAPONS[currentWeaponIdx];
      if (ammoMagEl && ammoReserveEl) {
        let nextMagStr: string;
        let nextMagColor: string;
        let nextResStr: string;
        if (w.isMelee) {
          nextMagStr = '∞';
          nextMagColor = '#ffffff';
          nextResStr = 'MELEE';
        } else {
          nextMagStr = cheatConfigRef.current.infiniteAmmo ? '∞' : String(w.mag);
          nextMagColor = w.mag === 0 && !cheatConfigRef.current.infiniteAmmo ? '#ff2e4c' : '#ffffff';
          const isInfAmmo =
            cheatConfigRef.current.infiniteAmmo ||
            (playModeRef.current === 'training' && trainingConfigRef.current.infiniteAmmo);
          nextResStr = isInfAmmo ? '/ ∞' : '/ ' + w.reserve;
        }
        if (nextMagStr !== lastAmmoMagStr) {
          lastAmmoMagStr = nextMagStr;
          ammoMagEl.textContent = nextMagStr;
        }
        if (nextMagColor !== lastAmmoMagColor) {
          lastAmmoMagColor = nextMagColor;
          ammoMagEl.style.color = nextMagColor;
        }
        if (nextResStr !== lastAmmoResStr) {
          lastAmmoResStr = nextResStr;
          ammoReserveEl.textContent = nextResStr;
        }
      }

      if (hudWave) {
        const nextWaveTxt = playModeRef.current === 'training' ? 'تمرین' : String(wave);
        if (nextWaveTxt !== lastHudWaveText) {
          lastHudWaveText = nextWaveTxt;
          hudWave.textContent = nextWaveTxt;
        }
      }
      if (hudEnemies) {
        const activeCount = countAliveEnemies() + enemiesToSpawn;
        const nextEnemiesTxt = String(activeCount);
        if (nextEnemiesTxt !== lastHudEnemiesText) {
          lastHudEnemiesText = nextEnemiesTxt;
          hudEnemies.textContent = nextEnemiesTxt;
        }
      }
      if (hudScore) {
        const nextScoreTxt = String(score);
        if (nextScoreTxt !== lastHudScoreText) {
          lastHudScoreText = nextScoreTxt;
          hudScore.textContent = nextScoreTxt;
        }
      }

      // Update dynamic Health & Ammo status telemetry on every weapon selection button (cached DOM refs + dirty checks)
      const isInf =
        cheatConfigRef.current.infiniteAmmo ||
        (playModeRef.current === 'training' && trainingConfigRef.current.infiniteAmmo);
      const isGod = cheatConfigRef.current.godMode;
      for (let i = 0; i < WEAPONS.length; i++) {
        const wp = WEAPONS[i];
        const tel = computeWeaponSlotTelemetry(
          wp.id,
          wp.isMelee,
          wp.mag,
          wp.magSize,
          wp.reserve,
          player.hp,
          player.maxHp,
          isInf,
          isGod
        );
        let cached = weaponSlotElCache[i];
        if (!cached || (cached.ammoTextEl && !cached.ammoTextEl.isConnected)) {
          cached = {
            hpBadgeEl: document.getElementById(`wslot-hp-badge-${i}`),
            hpTextEl: document.getElementById(`wslot-hp-text-${i}`),
            ammoBadgeEl: document.getElementById(`wslot-ammo-badge-${i}`),
            ammoTextEl: document.getElementById(`wslot-ammo-text-${i}`),
            ammoBarEl: document.getElementById(`wslot-ammo-bar-${i}`),
            lastHpColor: '',
            lastAmmoAccent: '',
            lastBarWidth: '',
            lastBarColor: '',
          };
          weaponSlotElCache[i] = cached;
        }

        const slotAccent =
          tel.ammoLevel === 'empty' || tel.ammoLevel === 'low' ? '#f43f5e' : '#cbd5e1';
        const barAccent =
          tel.ammoLevel === 'empty' || tel.ammoLevel === 'low' ? '#f43f5e' : '#38bdf8';
        if (cached.hpBadgeEl && cached.lastHpColor !== tel.healthColor) {
          cached.lastHpColor = tel.healthColor;
          cached.hpBadgeEl.style.color = tel.healthColor;
        }
        if (cached.hpTextEl && cached.hpTextEl.textContent !== tel.healthLabel) {
          cached.hpTextEl.textContent = tel.healthLabel;
        }
        if (cached.ammoBadgeEl && cached.lastAmmoAccent !== slotAccent) {
          cached.lastAmmoAccent = slotAccent;
          cached.ammoBadgeEl.style.color = slotAccent;
        }
        if (cached.ammoTextEl && cached.ammoTextEl.textContent !== tel.ammoLabel) {
          cached.ammoTextEl.textContent = tel.ammoLabel;
        }
        if (cached.ammoBarEl) {
          const nextBarWidth = `${tel.ammoPct}%`;
          if (cached.lastBarWidth !== nextBarWidth) {
            cached.lastBarWidth = nextBarWidth;
            cached.ammoBarEl.style.width = nextBarWidth;
          }
          if (cached.lastBarColor !== barAccent) {
            cached.lastBarColor = barAccent;
            cached.ammoBarEl.style.backgroundColor = barAccent;
          }
        }
      }
    }

    function updateBuffHUD() {
      if (buffStrip) {
        let html = '';
        if (isCornerMounted) {
          const dirTxt = currentLean > 0.12 ? 'راست' : 'چپ';
          html += `<span class="buff-readout" style="border-color:#38bdf8;color:#7dd3fc" dir="rtl">زاویه کاور دیوار (${dirTxt})</span>`;
        }
        if (adrenalineTimer > 0) {
          html += `<span class="buff-readout" dir="rtl">آدرنالین ${Math.ceil(adrenalineTimer)}s</span>`;
        }
        if (overdriveTimer > 0) {
          html += `<span class="buff-readout overdrive" dir="rtl">قدرت 2X (${Math.ceil(overdriveTimer)}s)</span>`;
        }
        if (html !== lastBuffStripHtml) {
          lastBuffStripHtml = html;
          buffStrip.innerHTML = html;
        }
      }
      if (powerVignette) {
        const nextVig = adrenalineTimer > 0 ? '1' : '0';
        if (nextVig !== lastPowerVigOpacity) {
          lastPowerVigOpacity = nextVig;
          powerVignette.style.opacity = nextVig;
        }
      }

      if (btnPower && powerCdText) {
        const nextOnCd = adrenalineCooldown > 0;
        const nextCdText = nextOnCd ? Math.ceil(adrenalineCooldown) + 's' : '';
        if (nextOnCd !== lastPowerOnCd) {
          lastPowerOnCd = nextOnCd;
          btnPower.classList.toggle('on-cd', nextOnCd);
        }
        if (nextCdText !== lastPowerCdStr) {
          lastPowerCdStr = nextCdText;
          powerCdText.textContent = nextCdText;
        }
      }
    }

    function getCurrentSightMode() {
      const w = WEAPONS[currentWeaponIdx];
      const activeEq = getGameplayEquipped();
      const hasEclipseShotgunSkin =
        ogFeaturesRef.current.skinsAndCollection &&
        activeEq.shotgun_skin === MYTHIC_SHOTGUN_ID;
      const hasTempestLmgSkin =
        ogFeaturesRef.current.skinsAndCollection &&
        activeEq.m249_skin === MYTHIC_M249_ID;
      return resolveActiveSightMode({
        isPlaying: screenStateRef.current === 'playing' || screenStateRef.current === 'paused',
        isSpectating: isLocalSpectating,
        isADS: isADS && !isReloading,
        weaponId: w ? w.id : '',
        isMelee: Boolean(w?.isMelee),
        userCrosshairVisible: crosshairVisible,
        hasEclipseShotgunSkin,
        hasTempestLmgSkin,
        isOgMode: !ogFeaturesRef.current.skinsAndCollection,
      });
    }

    function updateCrosshairVisual() {
      const ch = document.getElementById('crosshair');
      if (!ch) return;
      const w = WEAPONS[currentWeaponIdx];
      const sightMode = getCurrentSightMode();
      if (!w || !sightMode.showCrosshair) {
        ch.style.display = 'none';
        return;
      }
      ch.style.display = 'block';
      ch.style.opacity = w.isMelee ? '0.4' : '0.88';
      const gap = Math.min(26, 8 + crosshairBloom * 135);
      const topEl = document.getElementById('ch-top');
      const botEl = document.getElementById('ch-bot');
      const leftEl = document.getElementById('ch-left');
      const rightEl = document.getElementById('ch-right');
      if (topEl) topEl.style.transform = `translate(-50%, ${-gap - 7}px)`;
      if (botEl) botEl.style.transform = `translate(-50%, ${gap}px)`;
      if (leftEl) leftEl.style.transform = `translate(${-gap - 7}px, -50%)`;
      if (rightEl) rightEl.style.transform = `translate(${gap}px, -50%)`;
    }

    function drawRadar() {
      const rCanvas = radarCanvasRef.current;
      if (!rCanvas) return;
      const radarCtx = rCanvas.getContext('2d');
      if (!radarCtx) return;

      const W = rCanvas.width;
      const H = rCanvas.height;
      const cx = W / 2;
      const cy = H / 2;
      const scale = 1.85;
      radarCtx.clearRect(0, 0, W, H);

      radarCtx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      radarCtx.lineWidth = 1;
      [22, 44].forEach((r) => {
        radarCtx.beginPath();
        radarCtx.arc(cx, cy, r, 0, Math.PI * 2);
        radarCtx.stroke();
      });

      radarCtx.save();
      radarCtx.translate(cx, cy);
      radarCtx.rotate(player.yaw);

      radarCtx.fillStyle = 'rgba(130, 150, 170, 0.35)';
      for (let i = 4; i < wallColliders.length; i++) {
        const b = wallColliders[i];
        const rx = (b.x - player.pos.x) * scale;
        const rz = (b.z - player.pos.z) * scale;
        if (Math.abs(rx) > 65 || Math.abs(rz) > 65) continue;
        radarCtx.fillRect(rx - (b.w * scale) / 2, rz - (b.d * scale) / 2, b.w * scale, b.d * scale);
      }

      pickups.forEach((p) => {
        if (!p.active) return;
        const rx = (p.x - player.pos.x) * scale;
        const rz = (p.z - player.pos.z) * scale;
        if (rx * rx + rz * rz > 55 * 55) return;
        radarCtx.fillStyle = p.type === 'hp' ? '#00e676' : p.type === 'armor' ? '#38bdf8' : '#c084fc';
        radarCtx.fillRect(rx - 2, rz - 2, 4, 4);
      });

      enemies.forEach((e) => {
        if (!e.alive) return;
        const rx = (e.root.position.x - player.pos.x) * scale;
        const rz = (e.root.position.z - player.pos.z) * scale;
        const dist = Math.hypot(rx, rz);
        const clampDist = Math.min(dist, 52);
        const ang = Math.atan2(rz, rx);
        radarCtx.fillStyle = e.type === 'heavy' ? '#c084fc' : '#ff2e4c';
        radarCtx.beginPath();
        radarCtx.arc(Math.cos(ang) * clampDist, Math.sin(ang) * clampDist, dist > 52 ? 2.8 : 3.8, 0, Math.PI * 2);
        radarCtx.fill();
      });
      const nowMs = Date.now();
      if (activeTeamPings.length > 0) {
        activeTeamPings = pruneExpiredTeamSignals(activeTeamPings, nowMs);
        activeTeamPings.forEach((tp) => {
          const rx = (tp.x - player.pos.x) * scale;
          const rz = (tp.z - player.pos.z) * scale;
          const dist = Math.hypot(rx, rz);
          const clampDist = Math.min(dist, 50);
          const ang = Math.atan2(rz, rx);
          const px = Math.cos(ang) * clampDist;
          const py = Math.sin(ang) * clampDist;
          const pulse = 1 + Math.sin(nowMs * 0.012) * 0.25;
          radarCtx.save();
          radarCtx.translate(px, py);
          radarCtx.rotate(Math.PI / 4);
          radarCtx.fillStyle = tp.team === 'bravo' ? '#f43f5e' : '#38bdf8';
          radarCtx.fillRect(-3.5, -3.5, 7, 7);
          radarCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
          radarCtx.lineWidth = 1.2;
          radarCtx.strokeRect(-4.5 * pulse, -4.5 * pulse, 9 * pulse, 9 * pulse);
          radarCtx.restore();
        });
      }
      radarCtx.restore();

      // Project active team pings onto minimal HUD screen coordinates (zero work when none active)
      if (activeTeamPings.length > 0 || lastProjectedPingCount > 0) {
        const nextProjected: Array<{
          id: string;
          senderName: string;
          team: TeamId;
          xPct: number;
          yPct: number;
          distM: number;
          offscreen: boolean;
        }> = [];
        for (let i = 0; i < activeTeamPings.length; i++) {
          const tp = activeTeamPings[i];
          tempPingProjVec.set(tp.x, tp.y + 0.65, tp.z);
          const distM = Math.max(1, Math.round(tempPingProjVec.distanceTo(camera.position)));
          tempPingProjVec.project(camera);
          const behind = tempPingProjVec.z > 1;
          let xNdc = behind ? -tempPingProjVec.x : tempPingProjVec.x;
          let yNdc = behind ? -Math.abs(tempPingProjVec.y) - 0.85 : tempPingProjVec.y;
          const offscreen = behind || Math.abs(xNdc) > 0.94 || Math.abs(yNdc) > 0.88;
          xNdc = Math.max(-0.88, Math.min(0.88, xNdc));
          yNdc = Math.max(-0.8, Math.min(0.8, yNdc));
          nextProjected.push({
            id: tp.id,
            senderName: tp.senderName,
            team: tp.team,
            xPct: Math.round(((xNdc + 1) * 0.5) * 1000) / 10,
            yPct: Math.round(((-yNdc + 1) * 0.5) * 1000) / 10,
            distM,
            offscreen,
          });
        }
        lastProjectedPingCount = nextProjected.length;
        setProjectedTeamPings(nextProjected);
      }

      radarCtx.fillStyle = 'rgba(0, 240, 255, 0.14)';
      radarCtx.beginPath();
      radarCtx.moveTo(cx, cy);
      radarCtx.arc(cx, cy, 48, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55);
      radarCtx.closePath();
      radarCtx.fill();

      radarCtx.fillStyle = '#00f0ff';
      radarCtx.beginPath();
      radarCtx.moveTo(cx, cy - 5);
      radarCtx.lineTo(cx - 4, cy + 4);
      radarCtx.lineTo(cx + 4, cy + 4);
      radarCtx.closePath();
      radarCtx.fill();
    }

    // =========================================================
    // WEAPON & COMBAT ACTIONS (3-WEAPON LOADOUT + LINE-OF-SIGHT AIM ASSIST)
    // =========================================================
    function getActiveLoadoutWeaponIndices(): number[] {
      if (playModeRef.current === 'training') {
        return getEnabledWeaponIndices(trainingConfigRef.current.enabledWeapons);
      }
      const indices = loadoutRef.current
        .map((id) => WEAPONS.findIndex((w) => w.id === id))
        .filter((i) => i >= 0);
      return indices.length > 0 ? indices : [0, 2, 5];
    }

    function isWeaponAllowed(idx: number): boolean {
      const wId = WEAPONS[idx]?.id;
      if (!wId) return false;
      if (playModeRef.current === 'training') {
        return Boolean(trainingConfigRef.current.enabledWeapons[wId]);
      }
      return loadoutRef.current.includes(wId);
    }

    let prevSniperScoped = false;
    let prevEclipseSight = false;
    let prevTempestSight = false;
    function syncSniperScopeState() {
      const w = WEAPONS[currentWeaponIdx];
      const sightMode = getCurrentSightMode();

      if (sightMode.showSniperScope2D !== prevSniperScoped) {
        prevSniperScoped = sightMode.showSniperScope2D;
        if (ogFeaturesRef.current.skinsAndCollection && getGameplayEquipped().sniper_skin === LEGENDARY_SNIPER_ID) {
          sound.playVoidScopeToggle(sightMode.showSniperScope2D);
        }
      }
      setIsSniperScoped(sightMode.showSniperScope2D);

      if (sightMode.showEclipseSight2D !== prevEclipseSight) {
        prevEclipseSight = sightMode.showEclipseSight2D;
        sound.playEclipseSightToggle(sightMode.showEclipseSight2D);
      }
      setIsEclipseAdsSight(sightMode.showEclipseSight2D);

      if (sightMode.showTempestSight2D !== prevTempestSight) {
        prevTempestSight = sightMode.showTempestSight2D;
        sound.playEclipseSightToggle(sightMode.showTempestSight2D);
      }
      setIsTempestAdsSight(sightMode.showTempestSight2D);

      if (w) {
        w.model.group.visible = !sightMode.hideFirstPersonWeapon3D;
      }
      eclipseShotgunModel?.setOpticVisible(!sightMode.hideEclipseRailOptic3D);
      tempestLmgModel?.setOpticVisible(!sightMode.hideTempestRailOptic3D);
      updateCrosshairVisual();
    }

    function activateAdrenalinePower() {
      if (screenStateRef.current !== 'playing' || adrenalineCooldown > 0) return;
      adrenalineTimer = 6.0;
      adrenalineCooldown = playModeRef.current === 'training' ? 8.0 : 16.0;
      player.hp = Math.min(player.maxHp, player.hp + 25);
      sound.playPower();
      showCenterAlert('آدرنالین فعال شد — سرعت بالا و لگد کنترل‌شده', 1800);
      advanceTutorialFromGame('powerups', 1, sound);
      updateHUD();
      updateBuffHUD();
    }

    function selectWeapon(idx: number, forceAllow = false) {
      if (idx < 0 || idx >= WEAPONS.length) return;
      if (!forceAllow && !isWeaponAllowed(idx)) {
        showCenterAlert('این سلاح در لیست ۳ سلاح انتخابی شما نیست', 1400);
        return;
      }
      if (idx === currentWeaponIdx && !forceAllow) return;

      if (isReloading) {
        isReloading = false;
        reloadProgress = 0;
        lastTempestReloadPhase = 'idle';
        lastEclipseReloadPhase = 'idle';
        lastEclipseReloadShellIndex = -1;
        tempestLmgModel?.applyCinematicReload(0);
        eclipseShotgunModel?.applyCinematicReload(0);
        if (reloadIndicator) reloadIndicator.style.display = 'none';
        if (reloadBarFill) reloadBarFill.style.width = '0%';
        WEAPONS.forEach((w) => {
          if (w.model.mag) {
            w.model.mag.position.y = 0;
            w.model.mag.position.z = 0;
            if (w.id === 'rpg') {
              w.model.mag.visible = w.mag > 0 || cheatConfigRef.current.infiniteAmmo;
            } else if (w.id === 'shotgun') {
              w.model.mag.visible = false;
            } else {
              w.model.mag.visible = true;
            }
          }
          if (w.model.bolt && typeof w.model.boltRestZ === 'number') {
            w.model.bolt.position.z = w.model.boltRestZ;
          }
        });
      }
      cancelLocalMythicEmote(true);
      localInspectProgress = -1;
      const switched = idx !== currentWeaponIdx;
      currentWeaponIdx = idx;
      setActiveWeaponIdx(idx);
      if (WEAPONS[idx].isMelee) {
        isADS = false;
        document.getElementById('btn-ads')?.classList.remove('active-ads');
      }
      katanaSlashTimer = 0;
      switchAnim = 1.0;

      WEAPONS.forEach((w, i) => {
        w.model.group.visible = i === idx;
        if (i === idx && w.id === 'rpg' && w.model.mag) {
          w.model.mag.visible = w.mag > 0 || cheatConfigRef.current.infiniteAmmo;
        }
      });
      syncSniperScopeState();
      if (switched) {
        fireCooldown = 0;
        sound.playWeaponSwitch();
        advanceTutorialFromGame('reloading', 1, sound);
        advanceQuickTutorialStep('switch', 1);
      }
      updateHUD();
    }

    function cycleNextWeapon() {
      const allowed = getActiveLoadoutWeaponIndices();
      if (allowed.length <= 1) return;
      const curPos = Math.max(0, allowed.indexOf(currentWeaponIdx));
      const nextIdx = allowed[(curPos + 1) % allowed.length];
      selectWeapon(nextIdx, true);
    }

    WEAPONS.forEach((w, i) => {
      w.model.group.visible = i === 0;
    });

    // Warzone-Style ADS Reload: DOES NOT exit ADS when reloading!
    function startReload() {
      const w = WEAPONS[currentWeaponIdx];
      const hasReserve =
        cheatConfigRef.current.infiniteAmmo ||
        (playModeRef.current === 'training' && trainingConfigRef.current.infiniteAmmo) ||
        w.reserve > 0;
      if (w.isMelee || isReloading || w.mag >= w.magSize || !hasReserve) return;
      isReloading = true;
      reloadProgress = 0;
      lastTempestReloadPhase = 'idle';
      localInspectProgress = -1;
      cancelLocalMythicEmote(true);
      syncSniperScopeState();
      if (reloadIndicator) reloadIndicator.style.display = 'flex';
      if (reloadBarFill) reloadBarFill.style.width = '0%';
      sound.playReload();
      advanceTutorialFromGame('reloading', 1, sound);
      advanceQuickTutorialStep('reload', 1);
    }

    const shootRaycaster = new THREE.Raycaster();

    // Check unobstructed line-of-sight from camera to target point (prevents Aim Assist through walls)
    function hasLineOfSightToPoint(targetX: number, targetY: number, targetZ: number): boolean {
      const targetVec = new THREE.Vector3(targetX, targetY, targetZ);
      const toTarget = targetVec.clone().sub(camera.position);
      const dist = toTarget.length();
      if (dist <= 0.25) return true;

      // 1. Exact 3D Slab Ray-AABB check against all map wallColliders
      if (
        !hasLineOfSight3D(
          camera.position.x,
          camera.position.y,
          camera.position.z,
          targetX,
          targetY,
          targetZ,
          wallColliders
        )
      ) {
        return false;
      }

      // 2. Three.js Raycaster check against all 3D environment meshes (including nested groups)
      toTarget.normalize();
      shootRaycaster.set(camera.position, toTarget);
      shootRaycaster.far = Math.max(0.1, dist - 0.35);
      const blockers = shootRaycaster.intersectObjects(shootableEnvironment, true);
      for (let i = 0; i < blockers.length; i++) {
        const obj = blockers[i].object;
        // Ignore small destructible pots when checking wall occlusion
        if (obj.userData && obj.userData.pot) continue;
        if (blockers[i].distance < dist - 0.35) {
          return false;
        }
      }
      return true;
    }

    function damageEnemy(
      enemy: EnemyBot,
      baseDmg: number,
      headMult: number,
      hitPoint: THREE.Vector3,
      isHeadshot: boolean,
      explicitPart?: HitBodyPart
    ) {
      if (!enemy.alive) return;
      const relativeHitY = Math.max(0, hitPoint.y - enemy.root.position.y);
      const hitBodyPart = resolveHitBodyPart(isHeadshot, relativeHitY, enemy.cfg.scale, explicitPart);
      const effectiveHeadshot = isHeadshot || hitBodyPart === 'head';
      const limbFactor = hitBodyPart === 'limbs' ? 0.85 : 1.0;
      const finalDmg = Math.max(
        1,
        Math.round(calculateWeaponDamage(baseDmg, headMult, effectiveHeadshot, overdriveTimer > 0) * limbFactor)
      );
      enemy.hp -= finalDmg;
      enemy.hitFlash = 0.12;
      offlineShotsHit += 1;
      if (effectiveHeadshot) offlineHeadshots += 1;
      triggerHitmarker(effectiveHeadshot);
      triggerHapticFeedback(vibrationEnabledRef.current, 'hit');
      if (ogFeaturesRef.current.hitSound) {
        sound.playHitmarker(effectiveHeadshot);
      }
      spawnParticles(hitPoint, effectiveHeadshot ? 0xffdd00 : 0xff2e4c, effectiveHeadshot ? 12 : 7, 6);

      if (enemy.hp <= 0) {
        enemy.hp = 0;
        enemy.alive = false;
        enemy.deathTimer = 0;
        rebuildEnemyHitboxes();
        totalKills++;
        const pts = (enemy.type === 'heavy' ? 180 : enemy.type === 'rusher' ? 120 : 100) + (effectiveHeadshot ? 50 : 0);
        score += pts;
        triggerHitmarker(effectiveHeadshot, true);
        triggerHapticFeedback(vibrationEnabledRef.current, 'kill');
        const localOnlineCos = ogFeaturesRef.current.skinsAndCollection
          ? toOnlineSyncedCosmetics(getGameplayEquipped())
          : {};
        const activeWeaponId = WEAPONS[currentWeaponIdx]?.id || 'ak47';
        const isInfernoKill = isInfernoReaperKill(activeWeaponId, localOnlineCos);
        const isVoidKill = isVoidPiercerKill(activeWeaponId, localOnlineCos);
        const isTempestKill = isTempestAegisKill(activeWeaponId, localOnlineCos);
        const isEclipseKill = isEclipseBreacherKill(activeWeaponId, localOnlineCos);
        const isSakuraKill = isSakuraKatanaKill(activeWeaponId, localOnlineCos);
        const isNovaRpgKill = isNovaDragonRpgKill(activeWeaponId, localOnlineCos);
        if (isInfernoKill) {
          const fxCfg = getInfernoFxConfig();
          _fxTmpV2.set(
            enemy.root.position.x,
            enemy.root.position.y + 1.15 * enemy.cfg.scale,
            enemy.root.position.z
          );
          infernoVfxPool.spawnKillBurst(_fxTmpV2, effectiveHeadshot, fxCfg.scale, fxCfg.disabled);
          sound.playInfernoKill(effectiveHeadshot);
          triggerInfernoEdgeFlashRef.current(effectiveHeadshot);
        } else if (isVoidKill) {
          const fxCfg = getInfernoFxConfig();
          _fxTmpV2.set(
            enemy.root.position.x,
            enemy.root.position.y + 1.15 * enemy.cfg.scale,
            enemy.root.position.z
          );
          voidVfxPool.spawnGravityKill(_fxTmpV2, effectiveHeadshot, fxCfg.scale, fxCfg.disabled);
          sound.playVoidPiercerKill(effectiveHeadshot);
          triggerVoidEdgeFlashRef.current(effectiveHeadshot);
        } else if (isSakuraKill) {
          const fxCfg = getInfernoFxConfig();
          _fxTmpV2.set(
            enemy.root.position.x,
            enemy.root.position.y + 1.1 * enemy.cfg.scale,
            enemy.root.position.z
          );
          sakuraVfxPool.spawnKillBurst(_fxTmpV2, effectiveHeadshot, fxCfg.scale, fxCfg.disabled);
          sound.playSakuraKatanaKill(effectiveHeadshot);
        } else if (isNovaRpgKill) {
          const fxCfg = getInfernoFxConfig();
          _fxTmpV2.set(
            enemy.root.position.x,
            enemy.root.position.y + 1.0 * enemy.cfg.scale,
            enemy.root.position.z
          );
          novaDragonVfxPool.spawnNovaKillEffect(
            _fxTmpV2,
            effectiveHeadshot,
            fxCfg.scale,
            fxCfg.disabled || reducedMotionRef.current
          );
          sound.playNovaDragonKill(effectiveHeadshot);
        } else if (isTempestKill) {
          const fxCfg = getInfernoFxConfig();
          tempestSessionKills += 1;
          tempestLmgModel?.setKillCount(tempestSessionKills);
          if (!fxCfg.disabled) {
            _fxTmpV2.set(enemy.root.position.x, enemy.root.position.y, enemy.root.position.z);
            tempestVfxPool.spawnKillEffect(_fxTmpV2, {
              headshot: effectiveHeadshot,
              reducedMotion: reducedMotionRef.current,
              lowQuality: fxCfg.simple,
            });
            triggerMythicEdgeFlashRef.current(effectiveHeadshot);
          }
          sound.playTempestKill(effectiveHeadshot);
        } else if (isEclipseKill) {
          const fxCfg = getInfernoFxConfig();
          eclipseSessionKills += 1;
          eclipseShotgunModel?.setKillCount(eclipseSessionKills);
          if (!fxCfg.disabled) {
            _fxTmpV2.set(enemy.root.position.x, enemy.root.position.y, enemy.root.position.z);
            eclipseVfxPool.spawnKillEffect(_fxTmpV2, {
              headshot: effectiveHeadshot,
              reducedMotion: reducedMotionRef.current,
              lowQuality: fxCfg.simple,
            });
            triggerEclipseEdgeFlashRef.current(effectiveHeadshot);
          }
          sound.playEclipseKill(effectiveHeadshot);
        } else {
          sound.playKillConfirm(effectiveHeadshot);
        }
        grantKillSpinProgressRef.current(1);
        const killIconMeta = getCosmeticItem(localOnlineCos.ki);
        const badgeMeta = getCosmeticItem(localOnlineCos.nb);
        const myTeam = peerManager.getLocalTeam();
        addStructuredKillFeed({
          killerName: onlinePlayerNameRef.current || 'GHOST-01',
          killerTeam: myTeam,
          weaponName: getWeaponShortName(currentWeaponIdx),
          victimName: enemy.cfg.name,
          victimTeam: myTeam === 'alpha' ? 'bravo' : 'alpha',
          isHeadshot: effectiveHeadshot,
          infernoLegendary: isInfernoKill,
          voidLegendary: isVoidKill,
          tempestMythic: isTempestKill,
          eclipseMythic: isEclipseKill,
          killIconSymbol: isEclipseKill
            ? '☀'
            : isTempestKill
              ? '✧'
              : isSakuraKill
                ? '✿'
                : isVoidKill
                  ? '◈'
                  : isInfernoKill
                    ? '🔥'
                    : killIconMeta?.symbol,
          killIconColorHex: isEclipseKill
            ? '#f59e0b'
            : isTempestKill
              ? '#ff2a55'
              : isSakuraKill
                ? '#f472b6'
                : isVoidKill
                  ? '#22d3ee'
                  : isInfernoKill
                    ? '#ff7a18'
                    : killIconMeta?.colorHex,
          killerBadgeSymbol: badgeMeta?.symbol,
          killerBadgeColorHex: badgeMeta?.colorHex,
        });
        updateHUD();
      }
    }

    (window as unknown as Record<string, unknown>).__simulateEnemyDamage = (bodyPart: HitBodyPart = 'head') => {
      const targetBot = enemies.find((e) => e.alive) || spawnOneEnemy();
      if (!targetBot) return;
      const w = WEAPONS[currentWeaponIdx];
      const hitY =
        targetBot.root.position.y +
        (bodyPart === 'head' ? 1.72 : bodyPart === 'limbs' ? 0.45 : 1.18) * targetBot.cfg.scale;
      const hitPt = new THREE.Vector3(targetBot.root.position.x, hitY, targetBot.root.position.z);
      damageEnemy(targetBot, w.damage, w.headMult, hitPt, bodyPart === 'head', bodyPart);
    };

    function collectAimAssistTargets(preferHeadshot = false) {
      const targets: Array<{ id: string; x: number; y: number; z: number; visible: boolean }> = [];
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e.alive) continue;
        const ty = e.root.position.y + (preferHeadshot ? 1.72 : 1.2) * e.cfg.scale;
        const vis = hasLineOfSightToPoint(e.root.position.x, ty, e.root.position.z);
        e.visibleToPlayer = vis;
        if (vis) {
          targets.push({ id: `bot-${i}`, x: e.root.position.x, y: ty, z: e.root.position.z, visible: true });
        }
      }

      const activeRoom = peerManager.getRoom();
      if (activeRoom) {
        const myTeam = peerManager.getLocalTeam();
        const nowMs = Date.now();
        remoteOperators.forEach((op, rPid) => {
          if (!op.root.visible || !op.lastAlive || op.isDying) return;
          const rp = activeRoom.players.find((p) => p.id === rPid);
          if (!rp) return;
          if (!isRemotePlayerEligibleForAimAssist(activeRoom.mode, myOnlineId, myTeam, rp, nowMs)) return;
          op.chestMesh.getWorldPosition(tmpAimAssistWorldPos);
          const vis = hasLineOfSightToPoint(
            tmpAimAssistWorldPos.x,
            tmpAimAssistWorldPos.y,
            tmpAimAssistWorldPos.z
          );
          if (vis) {
            targets.push({
              id: `remote-${rPid}`,
              x: tmpAimAssistWorldPos.x,
              y: tmpAimAssistWorldPos.y,
              z: tmpAimAssistWorldPos.z,
              visible: true,
            });
          }
        });
      }
      return targets;
    }

    function applyAimAssistSnap() {
      const activeRoom = peerManager.getRoom();
      const effectiveSoftStrength = computeEffectiveAimAssistWithMythicPerk({
        baseAimAssistStrength: ogFeaturesRef.current.softAimAssist ? aimAssistStrengthRef.current : 0,
        roomAimAssistAllowed: activeRoom?.aimAssistAllowed,
        mythicPerksActive: isLocalMythicPerksEnabledNow() || isLocalShotgunMythicPerksEnabledNow(),
      });
      const cheats = cheatConfigRef.current;

      // Soft gameplay Aim Assist (0–100, default 70; respects Host room toggle & never locks on teammates)
      if (effectiveSoftStrength > 0) {
        const targets = collectAimAssistTargets(false);
        if (targets.length > 0) {
          const softRes = computeSoftAimAssistAngles(
            camera.position.x,
            camera.position.y,
            camera.position.z,
            player.yaw,
            player.pitch,
            targets,
            effectiveSoftStrength,
            0.018,
            true,
            wallColliders
          );
          if (softRes.lockedTarget) {
            player.yaw = softRes.nextYaw;
            player.pitch = softRes.nextPitch;
            camera.rotation.y = player.yaw;
            camera.rotation.x = player.pitch;
            return;
          }
        }
      }

      // Passcode-unlocked Cheats aim assist (only when Host allows or offline)
      if (activeRoom?.aimAssistAllowed === false) return;
      if (!cheats.aimAssistEnabled || cheats.aimAssistStrength <= 0) return;
      const targets = collectAimAssistTargets(cheats.aimAssistHeadshot);
      if (targets.length === 0) return;
      const res = computeAimAssistAngles(
        camera.position.x,
        camera.position.y,
        camera.position.z,
        player.yaw,
        player.pitch,
        targets,
        cheats.aimAssistStrength,
        0.015,
        true,
        wallColliders
      );
      if (res.lockedTarget) {
        player.yaw = res.nextYaw;
        player.pitch = res.nextPitch;
        camera.rotation.y = player.yaw;
        camera.rotation.x = player.pitch;
      }
    }

    function fireCurrentWeapon() {
      if (screenStateRef.current !== 'playing' || isReloading || fireCooldown > 0) return;
      const w = WEAPONS[currentWeaponIdx];
      const cheats = cheatConfigRef.current;
      const fireRateScale = overdriveTimer > 0 ? 0.78 : 1.0;

      // In round-based mode, block shooting during 3-2-1 countdown or while dead/spectating
      const activeRoom = peerManager.getRoom();
      if (activeRoom && isRoundBasedMode(activeRoom.mode)) {
        if (isRoundInputLocked(activeRoom)) {
          return;
        }
        const me = activeRoom.players.find((p) => p.id === myOnlineId);
        if (me && !me.alive) {
          return;
        }
      }

      applyAimAssistSnap();

      if (w.isMelee) {
        lastLocalFireAtMs = performance.now();
        fireCooldown = w.fireRate * fireRateScale;
        katanaSlashTimer = 0.34;
        katanaSlashDir *= -1;
        const isSakuraEquipped =
          ogFeaturesRef.current.skinsAndCollection &&
          getGameplayEquipped().katana_skin === LEGENDARY_KATANA_ID;
        if (isSakuraEquipped) {
          sound.playSakuraKatanaSlash();
          sakuraKatanaModel?.triggerSlash();
        } else {
          sound.playWeaponShotById(w.id);
        }
        spawnKatanaArc(isSakuraEquipped);
        recoilPos.z += 0.04;
        screenShake = Math.max(screenShake, 0.01);
        advanceTutorialFromGame('shooting', 1, sound);

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const slashEnd = camera.position.clone().addScaledVector(forward, 3.2);
        sendOnlineShoot(currentWeaponIdx, camera.position, slashEnd);

        let hitAny = false;
        enemies.forEach((e) => {
          if (!e.alive) return;
          const enemyCenter = e.root.position.clone().add(new THREE.Vector3(0, 1.25 * e.cfg.scale, 0));
          const toEnemy = enemyCenter.clone().sub(camera.position);
          const dist = toEnemy.length();
          if (dist < 3.8) {
            toEnemy.normalize();
            if (forward.dot(toEnemy) > 0.35) {
              shootRaycaster.set(camera.position, toEnemy);
              const wallHits = shootRaycaster.intersectObjects(shootableEnvironment, false);
              if (!wallHits.length || wallHits[0].distance > dist) {
                const isCrit = Math.abs(camera.position.y - (e.root.position.y + 1.75)) < 0.55;
                damageEnemy(e, w.damage, w.headMult, enemyCenter, isCrit);
                hitAny = true;
              }
            }
          }
        });

        // Katana melee hit check against online players (respecting Friendly Fire OFF)
        if (activeRoom) {
          const myTeam = peerManager.getLocalTeam();
          const meleeEnd = camera.position.clone().addScaledVector(forward, 3.5);
          sendOnlineShoot(currentWeaponIdx, camera.position, meleeEnd);
          remoteOperators.forEach((op, rPid) => {
            const targetPlayer = activeRoom.players.find((p) => p.id === rPid);
            if (!targetPlayer || (isRoundBasedMode(activeRoom.mode) && !targetPlayer.alive)) return;
            const opCenter = op.root.position.clone().add(new THREE.Vector3(0, 1.25, 0));
            const toOp = opCenter.clone().sub(camera.position);
            const dist = toOp.length();
            if (dist < 3.8) {
              toOp.normalize();
              if (forward.dot(toOp) > 0.35) {
                if (
                  !canDamagePlayer(
                    activeRoom.mode,
                    myTeam,
                    targetPlayer.team || 'bravo',
                    myOnlineId,
                    rPid,
                    Boolean(activeRoom.friendlyFire)
                  )
                ) {
                  showCenterAlert('هم‌تیمی است — آسیب غیرفعال (Friendly Fire OFF)', 1100);
                  return;
                }
                if (isPlayerSpawnProtected(targetPlayer)) {
                  return;
                }
                const isCrit = Math.abs(camera.position.y - (op.root.position.y + 1.75)) < 0.55;
                const dmg = Math.round(w.damage * (isCrit ? w.headMult : 1.0));
                spawnParticles(opCenter, 0x991111, 8, 5);
                triggerHitmarker(isCrit);
                if (ogFeaturesRef.current.hitSound) {
                  sound.playHitmarker(isCrit);
                }
                peerManager.sendPlayerHit(rPid, dmg, isCrit, currentWeaponIdx);
                hitAny = true;
              }
            }
          });
        }

        pots.forEach((pot) => {
          if (!pot.alive) return;
          const dist = Math.hypot(pot.x - camera.position.x, pot.z - camera.position.z);
          if (dist < 3.2) destroyPot(pot);
        });
        if (hitAny) {
          sound.playSwordHit();
          screenShake = Math.max(screenShake, 0.025);
        }
        return;
      }

      if (w.mag <= 0 && !cheats.infiniteAmmo) {
        fireCooldown = 0.25;
        sound.playEmpty();
        if (autoReloadEnabledRef.current) {
          startReload();
        }
        return;
      }

      if (!cheats.infiniteAmmo) {
        w.mag--;
      }
      offlineShotsFired += 1;
      lastLocalFireAtMs = performance.now();
      if (w.id === 'rpg' && w.model.mag) {
        w.model.mag.visible = w.mag > 0 || cheats.infiniteAmmo;
      }
      fireCooldown = w.fireRate * fireRateScale;
      advanceTutorialFromGame('shooting', 1, sound);
      updateHUD();

      cancelLocalMythicEmote(true);
      localInspectProgress = -1;
      const localShotCos = ogFeaturesRef.current.skinsAndCollection
        ? toOnlineSyncedCosmetics(getGameplayEquipped())
        : {};
      const isLocalVoidShot = w.id === 'sniper' && localShotCos.sn === LEGENDARY_SNIPER_ID;
      const isLocalTempestShot = w.id === 'lmg' && localShotCos.m249 === MYTHIC_M249_ID;
      const isLocalEclipseShot = w.id === 'shotgun' && localShotCos.sg === MYTHIC_SHOTGUN_ID;
      const isLocalNovaRpgShot = w.id === 'rpg' && localShotCos.rpg === LEGENDARY_RPG_ID;
      if (isLocalVoidShot) {
        sound.playVoidPiercerShot();
        voidSniperModel?.triggerShotPulse();
      } else if (isLocalTempestShot) {
        tempestLmgModel?.triggerShot();
        sound.playWeaponShotById(w.id);
        sound.playTempestShot(tempestLmgModel?.getHeat01() ?? 0);
      } else if (isLocalEclipseShot) {
        eclipseShotgunModel?.triggerShot();
        sound.playWeaponShotById(w.id);
        sound.playEclipseShot();
      } else if (isLocalNovaRpgShot) {
        novaDragonRpgModel?.triggerLaunch();
        sound.playNovaDragonLaunch();
      } else {
        if (w.id === 'ak47' && infernoAkModel?.group.visible) {
          infernoAkModel.triggerShot();
        }
        sound.playWeaponShotById(w.id);
      }

      const tempestHeatNow = isLocalTempestShot ? (tempestLmgModel?.getHeat01() ?? 0) : 0;
      const shotNowSec = performance.now() * 0.001;
      const localMuzzleColorHex = isLocalTempestShot
        ? resolveTempestRainbowColorInt(shotNowSec * 0.65 + tempestHeatNow)
        : resolveEffectiveMuzzleFlashColorInt(w.id, localShotCos);
      const localTracerColorHex = isLocalTempestShot
        ? resolveTempestRainbowColorInt(shotNowSec * 0.72 + tempestHeatNow * 0.5)
        : resolveEffectiveTracerColorInt(w.id, localShotCos);
      const animProfile = getWeaponAnimProfile(w.id);
      flashMat.color.setHex(localMuzzleColorHex);
      muzzleFlashGroup.position.copy(w.model.muzzlePos);
      muzzleFlashGroup.rotation.z = Math.random() * Math.PI * 2;
      const tempestFlashBoost = isLocalTempestShot
        ? 1.28 + tempestHeatNow * 0.35
        : isLocalEclipseShot
          ? 1.32
          : isLocalNovaRpgShot
            ? 1.38
            : 1.0;
      muzzleFlashGroup.scale.setScalar(
        animProfile.flashScale * tempestFlashBoost * (0.85 + Math.random() * 0.3)
      );
      muzzleFlashGroup.visible = !(isADS && w.id === 'sniper') && animProfile.flashScale > 0;
      muzzleFlashTimer = animProfile.flashDurationSec;

      const worldMuzzle = _worldMuzzle.copy(w.model.muzzlePos).applyMatrix4(weaponRecoilGroup.matrixWorld);
      const shotFxCfg = getInfernoFxConfig();
      if (w.id === 'ak47' && localShotCos.ak === LEGENDARY_AK47_ID && !shotFxCfg.disabled) {
        const allow = computeRemainingParticleAllowance(
          getTotalActiveParticles(),
          5,
          resolveParticleCap(gfx.preset, batterySaverRef.current)
        );
        if (allow > 0) {
          infernoVfxPool.spawnFiringEmbers(worldMuzzle, shotFxCfg.scale, false);
        }
      }
      // Zero dynamic PointLight for skin/VFX effects (rely on lightweight additive muzzle flash mesh)
      muzzlePointLight.intensity = 0;

      const mountFactor = isCornerMounted ? 0.55 : 1.0;
      const recBuff = cheats.zeroRecoil ? 0.0 : (adrenalineTimer > 0 ? 0.45 : 1.0) * mountFactor;
      const mythicCamRecoilMult = getMythicCameraRecoilMultiplier(isLocalMythicPerksEnabledNow());
      const adsFactor = (isADS ? 0.56 : 1.0) * recBuff;

      recoilPos.z += w.kickBack * animProfile.kickBackScale * recBuff;
      recoilPos.y += w.kickBack * animProfile.kickUpScale * recBuff;
      recoilRot.x += w.kickRot * animProfile.kickPitchScale * recBuff;
      recoilRot.z += (Math.random() - 0.5) * animProfile.kickRollJitter * recBuff;
      if (w.id === 'pistol') fpWeaponAnimState.pistolSlideKick = 0.065;
      else if (w.id === 'deagle') fpWeaponAnimState.deagleSlideKick = 0.072;
      else if (w.model.bolt) fpWeaponAnimState.boltKick01 = 1.0;
      if (w.id === 'shotgun') shotgunPumpKick = 1.0;

      // Mythic M249 limited camera perk: -10% camera recoil kick & shake only (spread/damage/ROF unchanged!)
      camTargetRecoilPitch += w.recoilPitch * adsFactor * mythicCamRecoilMult * (0.88 + Math.random() * 0.24);
      camTargetRecoilYaw += (Math.random() - 0.5) * 2 * w.recoilYaw * adsFactor * mythicCamRecoilMult;
      crosshairBloom = Math.min(
        0.14,
        crosshairBloom + (w.id === 'sniper' || w.id === 'rpg' ? 0.055 : w.id === 'shotgun' ? 0.048 : w.id === 'ak47' ? 0.021 : 0.015) * recBuff
      );
      screenShake = Math.max(screenShake, animProfile.cameraShakeScale * recBuff * mythicCamRecoilMult);

      if (animProfile.ejectShell && !isLocalTempestShot && !isLocalEclipseShot) {
        spawnShell();
      }

      const spread = cheats.zeroRecoil
        ? 0.0005
        : ((isADS ? w.spreadAds : w.spreadHip) + crosshairBloom * (w.id === 'sniper' && isADS ? 0.04 : 0.32)) * mountFactor;
      const pelletCount = w.pellets || 1;
      const maxRayDist = w.id === 'sniper' || w.id === 'rpg' ? 175 : w.id === 'shotgun' ? 52 : 130;
      const lastEndPoint = _lastEndPoint.copy(camera.position);
      const pendingOnlineHits: Array<{ targetId: string; dmg: number; isHead: boolean }> = [];
      const shotTargets = fillCombinedRaycastTargets(true);
      for (let pIdx = 0; pIdx < pelletCount; pIdx++) {
        _shotDir
          .set((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread, -1)
          .normalize()
          .applyQuaternion(camera.quaternion);

        shootRaycaster.set(camera.position, _shotDir);
        shootRaycaster.far = maxRayDist;
        const hits = shootRaycaster.intersectObjects(shotTargets, false);

        const endPoint = _shotEnd
          .copy(camera.position)
          .addScaledVector(_shotDir, w.id === 'shotgun' ? 45 : w.id === 'sniper' ? 140 : 75);
        if (hits.length > 0) {
          const hit = hits[0];
          endPoint.copy(hit.point);
          if (w.id === 'rpg') {
            // Explosive Splash Damage for RPG-7V (Bots + Online Opponents)
            if (isLocalNovaRpgShot) {
              sound.playNovaDragonExplosion();
              novaDragonVfxPool.spawnNovaExplosion(
                hit.point,
                shotFxCfg.scale,
                shotFxCfg.disabled || reducedMotionRef.current
              );
            } else {
              sound.playRPGExplosion();
              spawnParticles(hit.point, 0xff5500, 22, 10.5);
              spawnParticles(hit.point, 0xffcc00, 14, 7.5);
            }
            screenShake = Math.max(screenShake, 0.06);
            enemies.forEach((e) => {
              if (!e.alive) return;
              const d = e.root.position.distanceTo(hit.point);
              if (d <= 6.5) {
                const splashDmg = Math.max(55, Math.round(w.damage * (1 - d / 7.8)));
                damageEnemy(e, splashDmg, 1.2, hit.point, false, 'torso');
              }
            });
            if (activeRoom) {
              const myTeam = peerManager.getLocalTeam();
              remoteOperators.forEach((op, rPid) => {
                const targetPlayer = activeRoom.players.find((p) => p.id === rPid);
                if (!targetPlayer || (isRoundBasedMode(activeRoom.mode) && !targetPlayer.alive)) return;
                const d = op.root.position.distanceTo(hit.point);
                if (d <= 6.5) {
                  if (
                    !canDamagePlayer(
                      activeRoom.mode,
                      myTeam,
                      targetPlayer.team || 'bravo',
                      myOnlineId,
                      rPid,
                      Boolean(activeRoom.friendlyFire)
                    )
                  ) {
                    return;
                  }
                  if (isPlayerSpawnProtected(targetPlayer)) {
                    return;
                  }
                  const splashDmg = Math.max(55, Math.round(w.damage * (1 - d / 7.8)));
                  triggerHitmarker(false);
                  if (ogFeaturesRef.current.hitSound) {
                    sound.playHitmarker(false);
                  }
                  pendingOnlineHits.push({ targetId: rPid, dmg: splashDmg, isHead: false });
                }
              });
            }
          } else if (hit.object.userData && hit.object.userData.enemy) {
            const enemy = hit.object.userData.enemy as EnemyBot;
            const isHead = Boolean(hit.object.userData.isHead);
            const explicitPart = hit.object.userData.bodyPart as HitBodyPart | undefined;
            damageEnemy(enemy, w.damage, w.headMult, hit.point, isHead, explicitPart);
          } else if (hit.object.userData && hit.object.userData.remotePlayerId) {
            const rPid = String(hit.object.userData.remotePlayerId);
            const isHead = Boolean(hit.object.userData.isHead);
            if (activeRoom) {
              const myTeam = peerManager.getLocalTeam();
              const targetPlayer = activeRoom.players.find((p) => p.id === rPid);
              if (
                targetPlayer &&
                !canDamagePlayer(
                  activeRoom.mode,
                  myTeam,
                  targetPlayer.team || 'bravo',
                  myOnlineId,
                  rPid,
                  Boolean(activeRoom.friendlyFire)
                )
              ) {
                showCenterAlert('هم‌تیمی است — آسیب غیرفعال (Friendly Fire OFF)', 1100);
              } else if (targetPlayer && isPlayerSpawnProtected(targetPlayer)) {
                // Target is temporarily invulnerable after respawn; ignore hitmarker/blood
              } else {
                const dmg = Math.round(w.damage * (isHead ? w.headMult : 1.0));
                spawnParticles(hit.point, 0x991111, 7, 5);
                triggerHitmarker(isHead);
                triggerHapticFeedback(vibrationEnabledRef.current, 'hit');
                if (ogFeaturesRef.current.hitSound) {
                  sound.playHitmarker(isHead);
                }
                pendingOnlineHits.push({ targetId: rPid, dmg, isHead });
              }
            }
          } else if (hit.object.userData && typeof hit.object.userData.tutorialTarget === 'number') {
            hitQuickTutorialTarget(hit.object.userData.tutorialTarget, hit.point);
          } else if (hit.object.userData && hit.object.userData.pot) {
            destroyPot(hit.object.userData.pot as DestructiblePot);
          } else {
            spawnParticles(hit.point, 0xffaa33, pelletCount > 1 ? 3 : 5, 4);
            if (hit.face && pIdx < 3) {
              _fxTmpV3.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
              spawnDecal(hit.point, _fxTmpV3);
            }
          }
        }
        lastEndPoint.copy(endPoint);
        if (pIdx < 4 && !isLocalEclipseShot) {
          spawnTracer(worldMuzzle, endPoint, localTracerColorHex);
        }
        if (isLocalEclipseShot && pIdx < 3) {
          _eclipsePelletEnds[pIdx].copy(endPoint);
        }
        if (isLocalVoidShot && pIdx === 0 && !shotFxCfg.disabled) {
          voidVfxPool.spawnBeamAndShockwave(worldMuzzle, endPoint, shotFxCfg.scale, false);
        } else if (isLocalTempestShot && pIdx === 0 && !shotFxCfg.disabled) {
          _shellOriginVec.set(0.14, -0.05, -0.32).applyMatrix4(camera.matrixWorld);
          _shellRightVec.set(1, 0.2, 0).applyQuaternion(camera.quaternion).normalize();
          tempestVfxPool.spawnShotEffects(worldMuzzle, endPoint, tempestHeatNow, {
            reducedMotion: reducedMotionRef.current,
            lowQuality: shotFxCfg.simple,
            shellOrigin: _shellOriginVec,
            shellRightDir: _shellRightVec,
          });
        } else if (isLocalNovaRpgShot && pIdx === 0 && !shotFxCfg.disabled) {
          novaDragonVfxPool.spawnRocketTrail(
            worldMuzzle,
            endPoint,
            shotFxCfg.scale,
            reducedMotionRef.current
          );
        }
      }
      if (isLocalEclipseShot && !shotFxCfg.disabled) {
        _shellOriginVec.set(0.14, -0.06, -0.34).applyMatrix4(camera.matrixWorld);
        _shellRightVec.set(1, 0.28, 0).applyQuaternion(camera.quaternion).normalize();
        const eclipseParticleAllow = computeRemainingParticleAllowance(
          getTotalActiveParticles(),
          shotFxCfg.simple ? 3 : 8,
          resolveParticleCap(gfx.preset, batterySaverRef.current)
        );
        eclipseVfxPool.spawnShotEffects(worldMuzzle, _eclipsePelletEnds, {
          reducedMotion: reducedMotionRef.current,
          lowQuality: shotFxCfg.simple,
          maxParticlesBudget: eclipseParticleAllow,
          shellOrigin: _shellOriginVec,
          shellRightDir: _shellRightVec,
        });
      }

      sendOnlineShoot(currentWeaponIdx, worldMuzzle, lastEndPoint);
      for (let hIdx = 0; hIdx < pendingOnlineHits.length; hIdx++) {
        const ph = pendingOnlineHits[hIdx];
        peerManager.sendPlayerHit(ph.targetId, ph.dmg, ph.isHead, currentWeaponIdx);
      }

      if (w.mag === 0 && !cheats.infiniteAmmo && autoReloadEnabledRef.current) {
        window.setTimeout(() => {
          if (
            autoReloadEnabledRef.current &&
            screenStateRef.current === 'playing' &&
            WEAPONS[currentWeaponIdx] === w &&
            w.mag === 0
          ) {
            startReload();
          }
        }, 220);
      }
    }

    // =========================================================
    // SPAWNING & SESSION MANAGEMENT (Map-Aware Arena Bounds)
    // =========================================================
    const defaultSpawnPoints = [
      [-28, -28],
      [28, -28],
      [-28, 28],
      [28, 28],
      [0, -30],
      [-30, 0],
      [30, 0],
      [-18, -26],
      [18, -26],
      [-38, -16],
      [38, 16],
      [-16, 38],
      [16, -38],
    ];
    const duelSpawnPoints = [
      [0, -14.5],
      [-3.2, -14.5],
      [3.2, -14.5],
      [-11, -12],
      [11, -12],
      [-11, 12],
      [11, 12],
      [0, 14.5],
    ];

    function spawnOneEnemy() {
      const activeSpawns = currentMapRef.current === 'duel' ? duelSpawnPoints : defaultSpawnPoints;
      let best = activeSpawns[0];
      let bestDist = -1;
      const minDist = currentMapRef.current === 'duel' ? 9 : 14;
      const shuffled = activeSpawns.slice().sort(() => Math.random() - 0.5);
      for (const pt of shuffled) {
        const d = Math.hypot(pt[0] - player.pos.x, pt[1] - player.pos.z);
        if (d > minDist && d > bestDist) {
          bestDist = d;
          best = pt;
        }
      }
      let type: keyof typeof ENEMY_CLASSES = 'assault';
      const r = Math.random();
      if (playModeRef.current === 'training') {
        const agg = trainingConfigRef.current.botAggression;
        if (agg >= 75 && r < 0.45) type = 'rusher';
        else if (agg >= 60 && r > 0.72) type = 'heavy';
        else if (r < 0.28) type = 'rusher';
      } else if (currentBotDifficulty === 'strong') {
        if (r < 0.42) type = 'rusher';
        else if (wave >= 2 && r > 0.65) type = 'heavy';
      } else {
        if (wave >= 2 && r < 0.35) type = 'rusher';
        if (wave >= 3 && r > 0.74) type = 'heavy';
      }
      return createEnemy(type, best[0] + (Math.random() - 0.5) * 2, best[1] + (Math.random() - 0.5) * 2);
    }

    function startWave(wNum: number) {
      wave = wNum;
      const activeRoom = peerManager.getRoom();
      if (activeRoom && isRoundBasedMode(activeRoom.mode)) {
        // If opposing human players exist in the room, play pure PvP rounds without unsynced local bots;
        // otherwise spawn bots so solo/waiting players can play and advance rounds.
        const myTeam = peerManager.getLocalTeam();
        const enemyTeam: TeamId = myTeam === 'alpha' ? 'bravo' : 'alpha';
        const syncedOpponents = activeRoom.players.filter((p) => p.team === enemyTeam).length;
        const requiredOpponents = activeRoom.mode === 'tdm_2v2' ? 2 : 1;
        enemiesToSpawn = syncedOpponents > 0 || activeRoom.fillBotsEnabled ? 0 : requiredOpponents;
        spawnIntervalTimer = 0.15;
        const winGoal = activeRoom.targetWinRounds ?? ROUND_MATCH_WIN_SCORE;
        showCenterAlert(
          `راند ${activeRoom.currentRound} (${formatGameModeFa(activeRoom.mode)}) — هدف ${winGoal} راند`,
          2000
        );
        updateHUD();
        return;
      }

      const countDelta = currentBotDifficulty === 'weak' ? -1 : currentBotDifficulty === 'strong' ? 2 : 0;
      enemiesToSpawn = Math.max(2, 3 + wNum * 2 + countDelta);
      spawnIntervalTimer = 0.2;
      const diffLabel = currentBotDifficulty === 'weak' ? 'ضعیف' : currentBotDifficulty === 'strong' ? 'قوی' : 'متوسط';
      showCenterAlert(`موج ${wave} آغاز شد (${diffLabel})`);
      updateHUD();
    }

    // =========================================================
    // SHORT GUIDED OFFLINE TUTORIAL (FIXED STATIC TARGETS)
    // =========================================================
    interface QuickTutorialTarget3D {
      root: THREE.Group;
      board: THREE.Mesh;
      recoil: number;
    }
    const quickTutorialTargets: QuickTutorialTarget3D[] = [];
    const quickTutorialHitMeshes: THREE.Object3D[] = [];

    function readQuickTutorialDoneFlag(): string | null {
      try {
        return window.localStorage.getItem(QUICK_TUTORIAL_STORAGE_KEY);
      } catch {
        return null;
      }
    }

    function markQuickTutorialDoneFlag(): void {
      try {
        window.localStorage.setItem(QUICK_TUTORIAL_STORAGE_KEY, '1');
      } catch {
        // ignore storage quota / private mode
      }
    }

    function clearQuickTutorialTargets(): void {
      quickTutorialTargets.forEach((t) => scene.remove(t.root));
      quickTutorialTargets.length = 0;
      quickTutorialHitMeshes.length = 0;
    }

    function spawnQuickTutorialTargets(): void {
      clearQuickTutorialTargets();
      const fwdX = -Math.sin(player.yaw);
      const fwdZ = -Math.cos(player.yaw);
      const rightX = Math.cos(player.yaw);
      const rightZ = -Math.sin(player.yaw);

      const offsets = [
        { fwd: 9.0, lat: -3.0 },
        { fwd: 10.8, lat: 0.0 },
        { fwd: 9.0, lat: 3.0 },
      ];

      const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7, metalness: 0.4 });
      const boardMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.55, metalness: 0.15 });
      const outerRingMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
      const midRingMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const bullseyeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

      offsets.forEach((off, idx) => {
        let tx = player.pos.x + fwdX * off.fwd + rightX * off.lat;
        let tz = player.pos.z + fwdZ * off.fwd + rightZ * off.lat;
        if (!isPositionFree(tx, tz, 0.7)) {
          tx = player.pos.x + fwdX * 6.4 + rightX * (off.lat * 0.65);
          tz = player.pos.z + fwdZ * 6.4 + rightZ * (off.lat * 0.65);
        }
        const root = new THREE.Group();
        root.position.set(tx, 0, tz);
        root.rotation.y = Math.atan2(player.pos.x - tx, player.pos.z - tz);

        const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.65), baseMat);
        base.position.y = 0.06;
        root.add(base);

        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 1.2, 8), baseMat);
        pole.position.y = 0.66;
        root.add(pole);

        const board = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.18, 0.08), boardMat);
        board.position.y = 1.48;
        board.userData.tutorialTarget = idx;
        root.add(board);
        quickTutorialHitMeshes.push(board);

        const ringOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.02, 20), outerRingMat);
        ringOuter.rotation.x = Math.PI / 2;
        ringOuter.position.set(0, 0.04, 0.048);
        ringOuter.userData.tutorialTarget = idx;
        board.add(ringOuter);
        quickTutorialHitMeshes.push(ringOuter);

        const ringMid = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.022, 20), midRingMat);
        ringMid.rotation.x = Math.PI / 2;
        ringMid.position.set(0, 0.04, 0.052);
        ringMid.userData.tutorialTarget = idx;
        board.add(ringMid);
        quickTutorialHitMeshes.push(ringMid);

        const bullseye = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.024, 16), bullseyeMat);
        bullseye.rotation.x = Math.PI / 2;
        bullseye.position.set(0, 0.04, 0.056);
        bullseye.userData.tutorialTarget = idx;
        board.add(bullseye);
        quickTutorialHitMeshes.push(bullseye);

        root.updateMatrixWorld(true);
        scene.add(root);
        quickTutorialTargets.push({ root, board, recoil: 0 });
      });
    }

    function advanceQuickTutorialStep(stepId: QuickTutorialStepId, amount = 1): void {
      const cur = quickTutorialRef.current;
      if (!cur || !cur.active || cur.completedAll) return;
      const res = advanceQuickTutorial(cur, stepId, amount);
      if (!res.changed || !res.next) return;
      quickTutorialRef.current = res.next;
      setQuickTutorial(res.next);
      if (res.stepCompleted) {
        sound.playCountdownTick(true);
        const nextStep = res.next.steps[res.next.currentIndex];
        if (!res.allCompleted && nextStep?.id === 'reload') {
          const curW = WEAPONS[currentWeaponIdx];
          if (curW && !curW.isMelee && curW.mag >= curW.magSize) {
            curW.mag = Math.max(1, curW.magSize - 4);
            updateHUD();
          }
        }
      }
      if (res.allCompleted) {
        markQuickTutorialDoneFlag();
        showCenterAlert('آموزش کوتاه با موفقیت کامل شد!', 2400);
      }
    }

    function hitQuickTutorialTarget(targetIdx: number, hitPoint: THREE.Vector3): void {
      const t = quickTutorialTargets[targetIdx];
      if (t) {
        t.recoil = 0.44;
      }
      spawnParticles(hitPoint, 0x38bdf8, 8, 5.5);
      triggerHitmarker(true);
      triggerHapticFeedback(vibrationEnabledRef.current, 'hit');
      if (ogFeaturesRef.current.hitSound) {
        sound.playHitmarker(true);
      }
      advanceQuickTutorialStep('shoot', 1);
    }

    function resetGame(mode: GamePlayMode, customTraining?: TrainingConfig) {
      const activeTraining = customTraining ? sanitizeTrainingConfig(customTraining) : trainingConfigRef.current;
      if (customTraining) {
        trainingConfigRef.current = activeTraining;
        setTrainingConfig(activeTraining);
      }

      clearQuickTutorialTargets();
      enemies.forEach((e) => disposeEnemyBot(e));
      enemies.length = 0;
      rebuildEnemyHitboxes();
      clearEnemyBullets();
      clearPooledVfx();

      const activeRoomOnReset = peerManager.getRoom();
      if (activeRoomOnReset) {
        const myTeam = peerManager.getLocalTeam();
        const teamIdx = Math.max(
          0,
          activeRoomOnReset.players
            .filter((p) => (p.team || 'alpha') === myTeam)
            .findIndex((p) => p.id === myOnlineId)
        );
        const spawn = getTeamSpawnPosition(myTeam, teamIdx, activeRoomOnReset.mapId);
        player.pos.set(spawn.x, 0, spawn.z);
        player.yaw = spawn.yaw;
      } else if (currentMapRef.current === 'duel') {
        const duelSpawn = getTeamSpawnPosition('alpha', 0, 'duel');
        player.pos.set(duelSpawn.x, 0, duelSpawn.z);
        player.yaw = duelSpawn.yaw;
      } else {
        player.pos.set(0, 0, 24);
        player.yaw = 0;
      }
      player.vel.set(0, 0, 0);
      player.pitch = 0;
      slideState = createInitialSlideState();
      currentEyeHeight = PLAYER_STAND_EYE_HEIGHT;
      player.height = PLAYER_STAND_EYE_HEIGHT;
      camera.position.set(player.pos.x, player.pos.y + currentEyeHeight, player.pos.z);
      camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
      const roomStartHp = activeRoomOnReset?.startingHp ?? DEFAULT_HOST_MATCH_SETTINGS.startingHp;
      player.maxHp = activeRoomOnReset ? roomStartHp : 100;
      player.hp = player.maxHp;
      player.armor = mode === 'training' ? 50 : 25;
      activeTeamPings = [];
      activeTeamQuickMsgs = [];
      lastProjectedPingCount = 0;
      setProjectedTeamPings([]);
      setTeamQuickMsgs([]);
      setQuickCommsOpen(false);
      player.onGround = true;
      isADS = false;
      document.getElementById('btn-ads')?.classList.remove('active-ads');
      cancelLocalMythicEmote(true);
      localInspectProgress = -1;
      syncShotgunMythicStats();
      syncSniperScopeState();

      adrenalineTimer = 0;
      adrenalineCooldown = 0;
      overdriveTimer = 0;
      WEAPONS.forEach((w) => {
        if (!w.isMelee) {
          w.mag = w.magSize;
          w.reserve = w.maxReserve;
          if (w.id === 'rpg' && w.model.mag) {
            w.model.mag.visible = true;
          }
        }
      });
      isReloading = false;
      reloadProgress = 0;
      lastTempestReloadPhase = 'idle';
      lastEclipseReloadPhase = 'idle';
      lastEclipseReloadShellIndex = -1;
      tempestLmgModel?.applyCinematicReload(0);
      eclipseShotgunModel?.applyCinematicReload(0);
      if (reloadIndicator) reloadIndicator.style.display = 'none';
      if (reloadBarFill) reloadBarFill.style.width = '0%';

      // Select first allowed weapon from 3-weapon loadout (or training enabled weapons)
      const allowedIndices = getActiveLoadoutWeaponIndices();
      selectWeapon(allowedIndices[0] ?? 0, true);

      score = 0;
      totalKills = 0;
      tempestSessionKills = 0;
      eclipseSessionKills = 0;
      tempestLmgModel?.setKillCount(0);
      eclipseShotgunModel?.setKillCount(0);
      offlineShotsFired = 0;
      offlineShotsHit = 0;
      offlineHeadshots = 0;
      camRecoilPitch = camRecoilYaw = camTargetRecoilPitch = camTargetRecoilYaw = 0;
      createPickups();

      if (quickTutorialRef.current?.active && !activeRoomOnReset) {
        wave = 1;
        enemiesToSpawn = 0;
        spawnQuickTutorialTargets();
      } else if (mode === 'training') {
        wave = 1;
        enemiesToSpawn = 0;
        for (let i = 0; i < activeTraining.spawnCount; i++) {
          spawnOneEnemy();
        }
        showCenterAlert('میدان تمرین و آموزش فعال شد', 2000);
      } else {
        startWave(1);
      }
      updateHUD();
      updateBuffHUD();
    }

    // =========================================================
    // INPUT LISTENERS (KEYBOARD, MOUSE, TOUCH)
    // =========================================================
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Warzone-Style ADS Toggle: Can aim down sights even while reloading!
    function toggleADS(forceState?: boolean) {
      const w = WEAPONS[currentWeaponIdx];
      isADS = w.isMelee ? false : typeof forceState === 'boolean' ? forceState : !isADS;
      document.getElementById('btn-ads')?.classList.toggle('active-ads', isADS);
      syncSniperScopeState();
      if (isADS) {
        advanceQuickTutorialStep('aim', 1);
      }
    }

    function setManualLeanMode(dir: -1 | 0 | 1) {
      manualLeanDir = dir;
      setManualLeanState(dir);
      const msg =
        dir === 1
          ? 'زاویه تکیه به راست (Right Lean)'
          : dir === -1
            ? 'زاویه تکیه به چپ (Left Lean)'
            : 'زاویه هوشمند کنار دیوار (Auto Corner Mount)';
      showCenterAlert(msg, 1100);
    }

    function cycleManualLean() {
      const next: -1 | 0 | 1 = manualLeanDir === 0 ? 1 : manualLeanDir === 1 ? -1 : 0;
      setManualLeanMode(next);
    }

    function triggerLocalSlide() {
      const activeRoom = peerManager.getRoom();
      const roomSlideAllowed = activeRoom?.slideAllowed !== false;
      const frozen = isRoundInputLocked(activeRoom) || isLocalSpectating;
      const horizSpeed = Math.hypot(player.vel.x, player.vel.z);
      const forwardX = -Math.sin(player.yaw);
      const forwardZ = -Math.cos(player.yaw);
      const dirX = horizSpeed > 0.35 ? player.vel.x / horizSpeed : forwardX;
      const dirZ = horizSpeed > 0.35 ? player.vel.z / horizSpeed : forwardZ;
      const next = triggerSlide(slideState, {
        featureEnabled: ogFeaturesRef.current.tacticalSlide && slideAlphaEnabledRef.current,
        roomSlideAllowed,
        onGround: player.onGround,
        isDead: player.hp <= 0,
        isFrozen: frozen,
        moveSpeed: horizSpeed,
        dirX,
        dirZ,
      });
      if (next !== slideState && next.active) {
        slideState = next;
        player.vel.x = slideState.dirX * slideState.currentSpeed;
        player.vel.z = slideState.dirZ * slideState.currentSpeed;
        advanceQuickTutorialStep('slide', 1);
      }
    }

    const isEditableTarget = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    };

    const isInteractiveTarget = (el: EventTarget | null): boolean => {
      if (isEditableTarget(el)) return true;
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === 'BUTTON' || tag === 'A' || el.getAttribute('role') === 'button';
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const targetIsEditable = isEditableTarget(e.target) || isEditableTarget(document.activeElement);
      if (!targetIsEditable) {
        keys[e.code] = true;
      }

      if (screenStateRef.current === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        // Handshake: Enter/Space starts game from Title screen only if no modal is open and no button/input is focused
        const modalOpen = document.querySelector('[role="dialog"]');
        if (!modalOpen && !isInteractiveTarget(e.target) && !isInteractiveTarget(document.activeElement)) {
          e.preventDefault();
          engineApiRef.current?.startSession('campaign');
          return;
        }
      }

      if (screenStateRef.current !== 'playing') {
        if (screenStateRef.current === 'paused') {
          // Never resume the game while the player is typing in a text input (e.g. callsign, redeem code, passcode)
          if (e.code === 'KeyP' && targetIsEditable) {
            return;
          }
          if (e.code === 'Escape' || e.code === 'KeyP') {
            if (showLayoutEditorRef.current) {
              if (e.code === 'Escape') {
                e.preventDefault();
                setShowLayoutEditor(false);
              }
              return;
            }
            if (showTrainingModalRef.current) {
              if (e.code === 'Escape') {
                e.preventDefault();
                setShowTrainingModal(false);
              }
              return;
            }
            if (showOnlineModalRef.current) {
              if (e.code === 'Escape') {
                e.preventDefault();
                setShowOnlineModal(false);
              }
              return;
            }
            if (showOgIntroRef.current) {
              if (e.code === 'Escape') {
                e.preventDefault();
                setShowOgIntro(false);
              }
              return;
            }
            if (showSkinsModalRef.current || showSpinModalRef.current) {
              return;
            }
            engineApiRef.current?.resumeSession();
          }
        }
        return;
      }

      const activeSlots = getActiveLoadoutWeaponIndices();
      if (e.code === 'Digit1') {
        if (playModeRef.current === 'training') selectWeapon(0);
        else if (activeSlots[0] !== undefined) selectWeapon(activeSlots[0], true);
      } else if (e.code === 'Digit2') {
        if (playModeRef.current === 'training') selectWeapon(1);
        else if (activeSlots[1] !== undefined) selectWeapon(activeSlots[1], true);
      } else if (e.code === 'Digit3') {
        if (playModeRef.current === 'training') selectWeapon(2);
        else if (activeSlots[2] !== undefined) selectWeapon(activeSlots[2], true);
      } else if (e.code === 'Digit4' && playModeRef.current === 'training') selectWeapon(3);
      else if (e.code === 'Digit5' && playModeRef.current === 'training') selectWeapon(4);
      else if (e.code === 'Digit6' && playModeRef.current === 'training') selectWeapon(5);
      else if (e.code === 'Digit7' && playModeRef.current === 'training') selectWeapon(6);
      else if (e.code === 'Digit8' && playModeRef.current === 'training') selectWeapon(7);
      else if (e.code === 'Digit9' && playModeRef.current === 'training') selectWeapon(8);
      else if (e.code === 'Digit0' && playModeRef.current === 'training') selectWeapon(9);
      else if (e.code === 'KeyC') {
        if (ogFeaturesRef.current.tacticalSlide && slideAlphaEnabledRef.current) {
          if (!e.repeat) triggerLocalSlide();
        } else {
          cycleNextWeapon();
        }
      }
      else if (e.code === 'KeyR') startReload();
      else if (e.code === 'KeyQ') toggleADS();
      else if (e.code === 'KeyV') {
        if (ogFeaturesRef.current.voiceChat && activeOnlineRoomCode && voiceStateRef.current.mode === 'ptt') {
          if (!e.repeat) {
            void voiceManager.setPushToTalkActive(true);
          }
        } else {
          cycleManualLean();
        }
      }
      else if (e.code === 'KeyE') activateAdrenalinePower();
      else if (e.code === 'KeyB' && !e.repeat) triggerLocalMythicEmote();
      else if (e.code === 'KeyI' && !e.repeat) triggerLocalMythicInspect();
      else if (e.code === 'KeyF') {
        gfx.flashlightOn = !gfx.flashlightOn;
        setGfxState({ ...gfx });
        applyLightingSettings();
      } else if (e.code === 'Tab') {
        e.preventDefault();
        setShowScoreboard(true);
      } else if (isLocalSpectating && e.code === 'Space') {
        e.preventDefault();
        cycleLocalSpectatorTarget(1);
      } else if (e.code === 'Space' && player.onGround && !isRoundInputLocked(peerManager.getRoom()) && !isLocalSpectating) {
        if (slideState.active) {
          slideState = cancelSlide(slideState, true);
        }
        player.vel.y = cheatConfigRef.current.superSpeed ? 11.2 : 7.7;
        player.onGround = false;
      } else if (e.code === 'KeyG' && !e.repeat) {
        const curRoom = peerManager.getRoom();
        if (curRoom && isTeamCommsMode(curRoom.mode)) {
          sendTeamPingFromScreenPoint(0, 0);
        }
      } else if (e.code === 'KeyT' && !e.repeat) {
        const curRoom = peerManager.getRoom();
        if (curRoom && isTeamCommsMode(curRoom.mode)) {
          setQuickCommsOpen((prev) => !prev);
        }
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        setQuickCommsOpen(false);
        engineApiRef.current?.pauseSession();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
      if (e.code === 'Tab') {
        setShowScoreboard(false);
      }
      if (e.code === 'KeyV' && activeOnlineRoomCode && voiceStateRef.current.mode === 'ptt') {
        void voiceManager.setPushToTalkActive(false);
      }
    };

    let resetTouchInputState = () => {};

    const onWindowBlur = () => {
      Object.keys(keys).forEach((k) => (keys[k] = false));
      resetTouchInputState();
      isFiringInput = false;
      setShowScoreboard(false);
      if (voiceStateRef.current.pttPressed) {
        void voiceManager.setPushToTalkActive(false);
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (screenStateRef.current !== 'playing') return;
      if (peerManager.getRoom()?.roundPhase === 'match_over') return;
      sound.unlock();
      if (!isTouchDevice && touchSettingRef.current !== 'on' && document.pointerLockElement !== canvas) {
        canvas.requestPointerLock?.();
      }
      if (e.button === 0) {
        isFiringInput = true;
        fireCurrentWeapon();
      } else if (e.button === 2) {
        toggleADS(true);
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) isFiringInput = false;
      if (e.button === 2 && !isTouchDevice) toggleADS(false);
    };

    let pointerLockIgnoreMoves = 0;
    const onPointerLockChange = () => {
      if (document.pointerLockElement === canvas) {
        pointerLockIgnoreMoves = 2;
      }
    };
    document.addEventListener('pointerlockchange', onPointerLockChange);

    const onMouseMove = (e: MouseEvent) => {
      if (screenStateRef.current !== 'playing') return;
      if (document.pointerLockElement === canvas) {
        if (pointerLockIgnoreMoves > 0) {
          pointerLockIgnoreMoves--;
          return;
        }
        if (Math.abs(e.movementX) > 160 || Math.abs(e.movementY) > 160) return;
        const mult = (isADS ? 0.0036 * adsSensMult : 0.0036) * sensValue;
        const dyaw = e.movementX * mult;
        const dpitch = e.movementY * mult;
        player.yaw -= dyaw;
        player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch - dpitch));
        deadzoneLagX = Math.max(-0.075, Math.min(0.075, deadzoneLagX - dyaw * 0.45));
        deadzoneLagY = Math.max(-0.06, Math.min(0.06, deadzoneLagY + dpitch * 0.45));
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (screenStateRef.current !== 'playing') return;
      const allowed = getActiveLoadoutWeaponIndices();
      if (allowed.length <= 1) return;
      const curPos = Math.max(0, allowed.indexOf(currentWeaponIdx));
      const dir = e.deltaY > 0 ? 1 : -1;
      const nextIdx = allowed[(curPos + dir + allowed.length) % allowed.length];
      selectWeapon(nextIdx, true);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('wheel', onWheel, { passive: true });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Mobile Touch Handlers
    const leftZone = document.getElementById('left-touch-zone');
    const joyBase = document.getElementById('joystick-base');
    const joyKnob = document.getElementById('joystick-knob');
    const rightZone = document.getElementById('right-look-zone');
    const btnFire = document.getElementById('btn-fire');

    let joyTouchId: number | null = null;
    const joyOrigin = { x: 0, y: 0 };
    let lookTouchId: number | null = null;
    const lastLook = { x: 0, y: 0 };
    let fireTouchId: number | null = null;
    let fireMouseDown = false;
    let lastFireTouchTs = 0;
    const lastFireLook = { x: 0, y: 0 };

    let clearPingLongPressTimer = () => {};
    const touchCleanupCallbacks: Array<() => void> = [];

    resetTouchInputState = () => {
      joyTouchId = null;
      lookTouchId = null;
      fireTouchId = null;
      fireMouseDown = false;
      joyMoveX = 0;
      joyMoveY = 0;
      isFiringInput = false;
      clearPingLongPressTimer();
      if (joyKnob) joyKnob.style.transform = 'translate(0px, 0px)';
      joyBase?.classList.remove('active');
      btnFire?.classList.remove('pressed');
    };

    function updateJoystick(cx: number, cy: number) {
      const maxR = 42;
      let dx = cx - joyOrigin.x;
      let dy = cy - joyOrigin.y;
      const dist = Math.hypot(dx, dy);
      if (dist > maxR) {
        dx = (dx / dist) * maxR;
        dy = (dy / dist) * maxR;
      }
      if (joyKnob) joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
      joyMoveX = dx / maxR;
      joyMoveY = dy / maxR;
    }

    function applyTouchLook(dx: number, dy: number) {
      const mult = (isADS ? 0.0088 * adsSensMult : 0.0088) * sensValue;
      const dyaw = dx * mult;
      const dpitch = dy * mult;
      player.yaw -= dyaw;
      player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch - dpitch));
      deadzoneLagX = Math.max(-0.075, Math.min(0.075, deadzoneLagX - dyaw * 0.45));
      deadzoneLagY = Math.max(-0.06, Math.min(0.06, deadzoneLagY + dpitch * 0.45));
    }

    if (leftZone && joyBase) {
      const startJoyTouch = (e: TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        sound.unlock();
        if (joyTouchId !== null) return;
        const t = e.changedTouches[0];
        joyTouchId = t.identifier;
        const rect = joyBase.getBoundingClientRect();
        joyOrigin.x = rect.left + rect.width / 2;
        joyOrigin.y = rect.top + rect.height / 2;
        joyBase.classList.add('active');
        updateJoystick(t.clientX, t.clientY);
      };
      const moveJoyTouch = (e: TouchEvent) => {
        if (joyTouchId === null) return;
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === joyTouchId) updateJoystick(t.clientX, t.clientY);
        }
      };
      const endJoy = (e: TouchEvent) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === joyTouchId) {
            joyTouchId = null;
            joyMoveX = 0;
            joyMoveY = 0;
            if (joyKnob) joyKnob.style.transform = 'translate(0px, 0px)';
            joyBase.classList.remove('active');
          }
        }
      };
      leftZone.addEventListener('touchstart', startJoyTouch, { passive: false });
      leftZone.addEventListener('touchmove', moveJoyTouch, { passive: false });
      leftZone.addEventListener('touchend', endJoy);
      leftZone.addEventListener('touchcancel', endJoy);
      joyBase.addEventListener('touchstart', startJoyTouch, { passive: false });
      joyBase.addEventListener('touchmove', moveJoyTouch, { passive: false });
      joyBase.addEventListener('touchend', endJoy);
      joyBase.addEventListener('touchcancel', endJoy);
      touchCleanupCallbacks.push(() => {
        leftZone.removeEventListener('touchstart', startJoyTouch);
        leftZone.removeEventListener('touchmove', moveJoyTouch);
        leftZone.removeEventListener('touchend', endJoy);
        leftZone.removeEventListener('touchcancel', endJoy);
        joyBase.removeEventListener('touchstart', startJoyTouch);
        joyBase.removeEventListener('touchmove', moveJoyTouch);
        joyBase.removeEventListener('touchend', endJoy);
        joyBase.removeEventListener('touchcancel', endJoy);
      });
    }

    if (rightZone) {
      let pingLongPressTimer: number | null = null;
      const pingLongPressStart = { x: 0, y: 0 };
      const clearPingLongPress = () => {
        if (pingLongPressTimer !== null) {
          window.clearTimeout(pingLongPressTimer);
          pingLongPressTimer = null;
        }
      };
      clearPingLongPressTimer = clearPingLongPress;
      const startLookTouch = (e: TouchEvent) => {
        e.preventDefault();
        sound.unlock();
        if (lookTouchId !== null) return;
        const t = e.changedTouches[0];
        lookTouchId = t.identifier;
        lastLook.x = t.clientX;
        lastLook.y = t.clientY;
        pingLongPressStart.x = t.clientX;
        pingLongPressStart.y = t.clientY;
        clearPingLongPress();
        const curRoom = peerManager.getRoom();
        if (screenStateRef.current === 'playing' && curRoom && isTeamCommsMode(curRoom.mode)) {
          const tapX = t.clientX;
          const tapY = t.clientY;
          pingLongPressTimer = window.setTimeout(() => {
            pingLongPressTimer = null;
            if (screenStateRef.current !== 'playing') return;
            const ndcX = (tapX / Math.max(1, window.innerWidth)) * 2 - 1;
            const ndcY = -(tapY / Math.max(1, window.innerHeight)) * 2 + 1;
            sendTeamPingFromScreenPoint(ndcX, ndcY);
            triggerHapticFeedback(vibrationEnabledRef.current, 'hit');
          }, 460);
        }
      };
      const moveLookTouch = (e: TouchEvent) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === lookTouchId) {
            if (
              pingLongPressTimer !== null &&
              Math.hypot(t.clientX - pingLongPressStart.x, t.clientY - pingLongPressStart.y) > 14
            ) {
              clearPingLongPress();
            }
            applyTouchLook(t.clientX - lastLook.x, t.clientY - lastLook.y);
            lastLook.x = t.clientX;
            lastLook.y = t.clientY;
          }
        }
      };
      const endLook = (e: TouchEvent) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === lookTouchId) {
            lookTouchId = null;
            clearPingLongPress();
          }
        }
      };
      rightZone.addEventListener('touchstart', startLookTouch, { passive: false });
      rightZone.addEventListener('touchmove', moveLookTouch, { passive: false });
      rightZone.addEventListener('touchend', endLook);
      rightZone.addEventListener('touchcancel', endLook);
      touchCleanupCallbacks.push(() => {
        clearPingLongPress();
        rightZone.removeEventListener('touchstart', startLookTouch);
        rightZone.removeEventListener('touchmove', moveLookTouch);
        rightZone.removeEventListener('touchend', endLook);
        rightZone.removeEventListener('touchcancel', endLook);
      });
    }

    if (btnFire) {
      const startFireTouch = (e: TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        sound.unlock();
        lastFireTouchTs = Date.now();
        const t = e.changedTouches[0];
        fireTouchId = t.identifier;
        lastFireLook.x = t.clientX;
        lastFireLook.y = t.clientY;
        btnFire.classList.add('pressed');
        isFiringInput = true;
        fireCurrentWeapon();
      };
      const moveFireTouch = (e: TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === fireTouchId) {
            applyTouchLook(t.clientX - lastFireLook.x, t.clientY - lastFireLook.y);
            lastFireLook.x = t.clientX;
            lastFireLook.y = t.clientY;
          }
        }
      };
      const endFire = (e: TouchEvent) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === fireTouchId) {
            fireTouchId = null;
            isFiringInput = false;
            btnFire.classList.remove('pressed');
          }
        }
      };
      const startFireMouse = (e: MouseEvent) => {
        if (e.button !== 0) return;
        if (Date.now() - lastFireTouchTs < 650) return;
        e.preventDefault();
        e.stopPropagation();
        sound.unlock();
        fireMouseDown = true;
        btnFire.classList.add('pressed');
        isFiringInput = true;
        fireCurrentWeapon();
      };
      const endFireMouse = () => {
        if (!fireMouseDown) return;
        fireMouseDown = false;
        isFiringInput = false;
        btnFire.classList.remove('pressed');
      };
      btnFire.addEventListener('touchstart', startFireTouch, { passive: false });
      btnFire.addEventListener('touchmove', moveFireTouch, { passive: false });
      btnFire.addEventListener('touchend', endFire);
      btnFire.addEventListener('touchcancel', endFire);
      btnFire.addEventListener('mousedown', startFireMouse);
      btnFire.addEventListener('mouseup', endFireMouse);
      btnFire.addEventListener('mouseleave', endFireMouse);
      window.addEventListener('mouseup', endFireMouse);
      touchCleanupCallbacks.push(() => {
        btnFire.removeEventListener('touchstart', startFireTouch);
        btnFire.removeEventListener('touchmove', moveFireTouch);
        btnFire.removeEventListener('touchend', endFire);
        btnFire.removeEventListener('touchcancel', endFire);
        btnFire.removeEventListener('mousedown', startFireMouse);
        btnFire.removeEventListener('mouseup', endFireMouse);
        btnFire.removeEventListener('mouseleave', endFireMouse);
        window.removeEventListener('mouseup', endFireMouse);
      });
    }

    // =========================================================
    // REAL-TIME ONLINE MULTIPLAYER CLIENT (PEERJS WEBRTC P2P + FALLBACK)
    // =========================================================
    interface RemoteOperator3D {
      id: string;
      name: string;
      team: TeamId;
      root: THREE.Group;
      upperBodyGroup: THREE.Group;
      chestMesh: THREE.Mesh;
      bodyMat: THREE.MeshStandardMaterial;
      vestMat: THREE.MeshStandardMaterial;
      gearMat: THREE.MeshStandardMaterial;
      visorMat: THREE.MeshBasicMaterial;
      legL: THREE.Group;
      legR: THREE.Group;
      armL: THREE.Group;
      armR: THREE.Group;
      gun: THREE.Group;
      gunSkinAccentMesh: THREE.Mesh;
      gunSkinAccentMat: THREE.MeshBasicMaterial;
      lastWeaponId?: string;
      muzzleFlash: THREE.Mesh;
      muzzleFlashMat: THREE.MeshBasicMaterial;
      muzzleFlashTimer: number;
      sprite: THREE.Sprite;
      hitMeshes: THREE.Mesh[];
      targetPos: THREE.Vector3;
      targetYaw: number;
      lastPos: THREE.Vector3;
      walkPhase: number;
      lastStepIndex: number;
      initialized: boolean;
      lastRespawnSeq: number;
      lastAlive: boolean;
      lastRound: number;
      lastSpeaking: boolean;
      cosmeticsKey: string;
      cosmetics?: OnlineSyncedCosmetics;
      spawnProtected: boolean;
      isSliding: boolean;
      slideBlend: number;
      actionState: PlayerAnimState;
      actionTime: number;
      activeEmoteId: string | null;
      smoothedSpeed: number;
      recoilKick: number;
      isDying: boolean;
      deathTimer: number;
      deathDir: number;
      respawnTimer: number;
      lastAppliedOpacity: number;
    }
    const remoteOperators = new Map<string, RemoteOperator3D>();
    // Persist player ID in sessionStorage so mid-match 30s reconnect restores the exact slot & stats
    let myOnlineId = '';
    try {
      const savedSessionId = window.sessionStorage.getItem('bodycam_session_player_id_v1');
      if (savedSessionId && /^op-[a-z0-9]{4,10}$/i.test(savedSessionId)) {
        myOnlineId = savedSessionId;
      } else {
        myOnlineId = `op-${Math.random().toString(36).slice(2, 8)}`;
        window.sessionStorage.setItem('bodycam_session_player_id_v1', myOnlineId);
      }
    } catch {
      myOnlineId = `op-${Math.random().toString(36).slice(2, 8)}`;
    }
    setLocalOnlinePlayerId(myOnlineId);
    let activeOnlineRoomCode = '';
    let activeOnlinePassword = '';
    let onlineBroadcastTimer = 0;
    let lastLocalFireAtMs = 0;
    let localRespawnUntilMs = 0;
    let lastLocalAnimState: PlayerAnimState = 'idle';
    let lastLocalAnimAtMs = Date.now();

    function applyRemoteOperatorOpacity(op: RemoteOperator3D, opacity: number) {
      const clamped = Math.max(0, Math.min(1, opacity));
      if (Math.abs(clamped - op.lastAppliedOpacity) < 0.015) return;
      op.lastAppliedOpacity = clamped;
      const shouldBeTransparent = clamped < 0.99;
      const mats: THREE.Material[] = [op.bodyMat, op.vestMat, op.gearMat, op.visorMat];
      for (let i = 0; i < mats.length; i++) {
        const m = mats[i];
        if (m.transparent !== shouldBeTransparent) {
          m.transparent = shouldBeTransparent;
          m.needsUpdate = true;
        }
        m.opacity = clamped;
      }
      op.sprite.material.opacity = clamped;
    }

    // Round Countdown, Spawn Protection & Post-Death Spectator State (zero per-frame React churn)
    let lastKillerId: string | null = null;
    let spectateTargetId: string | null = null;
    let isLocalSpectating = false;
    let lastSyncedCountdownSec = 0;
    let lastSyncedLocalProtected = false;
    let lastSpecUiKey = '';
    const spectateCamPos = new THREE.Vector3();
    const spectateLookAt = new THREE.Vector3();
    let spectateCamInitialized = false;

    function clearSpectatorMode() {
      if (isLocalSpectating || spectateTargetId !== null) {
        isLocalSpectating = false;
        spectateTargetId = null;
        spectateCamInitialized = false;
        weaponPivot.visible = true;
        syncSniperScopeState();
      }
      if (lastSpecUiKey !== 'off') {
        lastSpecUiKey = 'off';
        setSpectatorInfo({
          active: false,
          targetId: null,
          targetName: '',
          targetTeam: 'alpha',
          aliveCount: 0,
        });
      }
    }

    function syncSpectatorFromRoom(roomData: OnlineRoomSummary | AuthoritativeRoomState) {
      const roundBased = isRoundBasedMode(roomData.mode);
      const me = roomData.players.find((p) => p.id === myOnlineId);
      const phase = roomData.roundPhase || 'playing';
      const shouldSpectate =
        roundBased &&
        Boolean(me && me.alive === false) &&
        (phase === 'playing' || phase === 'intermission');

      if (!shouldSpectate) {
        clearSpectatorMode();
        return;
      }

      isLocalSpectating = true;
      isFiringInput = false;
      isADS = false;
      syncSniperScopeState();
      weaponPivot.visible = false;
      laserDotMesh.visible = false;

      const aliveOthers = roomData.players.filter((p) => p.id !== myOnlineId && p.alive !== false);
      const currentStillAlive = Boolean(spectateTargetId && aliveOthers.some((p) => p.id === spectateTargetId));
      if (!currentStillAlive) {
        spectateTargetId = selectInitialSpectatorTarget(
          roomData.players,
          myOnlineId,
          me?.team || 'alpha',
          lastKillerId,
          roomData.mode
        );
        spectateCamInitialized = false;
      }

      const targetPlayer = spectateTargetId
        ? roomData.players.find((p) => p.id === spectateTargetId)
        : undefined;
      const targetName = targetPlayer?.name || '';
      const targetTeam: TeamId = targetPlayer?.team || 'alpha';
      const nextKey = `on:${spectateTargetId || 'none'}:${targetName}:${targetTeam}:${aliveOthers.length}`;
      if (nextKey !== lastSpecUiKey) {
        lastSpecUiKey = nextKey;
        setSpectatorInfo({
          active: true,
          targetId: spectateTargetId,
          targetName,
          targetTeam,
          aliveCount: aliveOthers.length,
        });
      }
    }

    function cycleLocalSpectatorTarget(direction: 1 | -1 = 1) {
      const roomData = peerManager.getRoom();
      if (!roomData || !isLocalSpectating) return;
      const nextId = cycleSpectatorTarget(roomData.players, myOnlineId, spectateTargetId, direction);
      if (nextId && nextId !== spectateTargetId) {
        spectateTargetId = nextId;
        spectateCamInitialized = false;
        syncSpectatorFromRoom(roomData);
      }
    }

    function rebuildRemoteHitboxes() {
      for (let i = enemyHitMeshes.length - 1; i >= 0; i--) {
        if (enemyHitMeshes[i]?.userData?.remotePlayerId) {
          enemyHitMeshes.splice(i, 1);
        }
      }
      remoteOperators.forEach((op) => {
        if (op.root.visible && op.lastAlive && !op.isDying) {
          op.hitMeshes.forEach((m) => enemyHitMeshes.push(m));
        }
      });
    }

    function resolveNameplateCosmeticStyle(cosmetics?: OnlineSyncedCosmetics): NameplateCosmeticStyle | undefined {
      if (!cosmetics) return undefined;
      const frameItem = getCosmeticItem(cosmetics.nf);
      const badgeItem = getCosmeticItem(cosmetics.nb);
      if (!frameItem && !badgeItem) return undefined;
      return {
        frameColorHex: frameItem?.colorHex,
        frameBgHex: frameItem?.accentHex,
        badgeSymbol: badgeItem?.symbol,
        badgeColorHex: badgeItem?.colorHex,
      };
    }

    function refreshRemoteNameplatesSpeaking(speakingIds: string[]) {
      const speakingSet = new Set(speakingIds);
      remoteOperators.forEach((op) => {
        const isSpeakingNow = speakingSet.has(op.id);
        if (op.lastSpeaking !== isSpeakingNow) {
          op.lastSpeaking = isSpeakingNow;
          const nameplateLabel = `${op.name} [${op.team === 'alpha' ? 'ALPHA' : 'BRAVO'}]`;
          op.sprite.material.map?.dispose();
          op.sprite.material.map = makeNameplateTexture(
            nameplateLabel,
            getTeamColor(op.team),
            isSpeakingNow,
            resolveNameplateCosmeticStyle(op.cosmetics)
          );
          op.sprite.material.needsUpdate = true;
        }
      });
    }

    function getOrCreateRemoteOperator(
      id: string,
      name: string,
      colorHex: string,
      team: TeamId = 'alpha',
      cosmetics?: OnlineSyncedCosmetics
    ): RemoteOperator3D {
      const nextColor = colorHex || getTeamColor(team);
      const uniformHex = team === 'bravo' ? 0x3b1b26 : 0x1a2c44;
      const nameplateLabel = `${name} [${team === 'alpha' ? 'ALPHA' : 'BRAVO'}]`;
      const isCurrentlySpeaking = voiceStateRef.current.speakingPlayerIds.includes(id);
      const nextCosKey = `${cosmetics?.nf || ''}|${cosmetics?.nb || ''}`;

      const existing = remoteOperators.get(id);
      if (existing) {
        existing.vestMat.color.set(nextColor);
        existing.visorMat.color.set(nextColor);
        existing.bodyMat.color.setHex(uniformHex);
        existing.cosmetics = cosmetics;
        const nextWeaponAccent = resolveRemoteWeaponSkinAccentHex(existing.lastWeaponId, cosmetics);
        if (nextWeaponAccent !== null) {
          existing.gunSkinAccentMat.color.setHex(nextWeaponAccent);
          existing.gunSkinAccentMesh.visible = true;
        } else {
          existing.gunSkinAccentMesh.visible = false;
        }
        if (
          existing.team !== team ||
          existing.name !== name ||
          existing.lastSpeaking !== isCurrentlySpeaking ||
          existing.cosmeticsKey !== nextCosKey
        ) {
          existing.team = team;
          existing.name = name;
          existing.lastSpeaking = isCurrentlySpeaking;
          existing.cosmeticsKey = nextCosKey;
          existing.sprite.material.map?.dispose();
          existing.sprite.material.map = makeNameplateTexture(
            nameplateLabel,
            nextColor,
            isCurrentlySpeaking,
            resolveNameplateCosmeticStyle(cosmetics)
          );
          existing.sprite.material.needsUpdate = true;
        }
        return existing;
      }

      const root = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({
        color: uniformHex,
        roughness: 0.68,
        metalness: 0.18,
      });
      const vestMat = new THREE.MeshStandardMaterial({
        color: nextColor,
        roughness: 0.55,
        metalness: 0.28,
      });
      const gearMat = new THREE.MeshStandardMaterial({
        color: 0x111827,
        roughness: 0.82,
        metalness: 0.25,
      });
      const visorMat = new THREE.MeshBasicMaterial({ color: nextColor });

      // Ground contact shadow
      const shadowDisc = new THREE.Mesh(
        new THREE.CircleGeometry(0.46, 16),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false })
      );
      shadowDisc.rotation.x = -Math.PI / 2;
      shadowDisc.position.y = 0.015;
      root.add(shadowDisc);

      // Articulated Left & Right Legs with Knee Pads & Combat Boots
      const hitMeshes: THREE.Mesh[] = [];
      function buildOperatorLeg(xOffset: number): THREE.Group {
        const legGroup = new THREE.Group();
        legGroup.position.set(xOffset, 0.78, 0);
        const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.42, 0.24), bodyMat);
        thigh.position.set(0, -0.2, 0);
        thigh.userData.remotePlayerId = id;
        thigh.userData.isHead = false;
        const kneePad = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.11, 0.26), gearMat);
        kneePad.position.set(0, -0.4, 0.02);
        const calf = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.36, 0.22), bodyMat);
        calf.position.set(0, -0.56, 0);
        calf.userData.remotePlayerId = id;
        calf.userData.isHead = false;
        const boot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.3), gearMat);
        boot.position.set(0, -0.72, 0.04);
        legGroup.add(thigh, kneePad, calf, boot);
        hitMeshes.push(thigh, calf);
        return legGroup;
      }

      const legL = buildOperatorLeg(-0.17);
      const legR = buildOperatorLeg(0.17);
      root.add(legL, legR);

      // Articulated upper-body group so Tactical Slide smoothly lowers both visuals AND 3D hitboxes!
      const upperBodyGroup = new THREE.Group();
      root.add(upperBodyGroup);

      // Sculpted Torso, Tactical Belt, Team-Colored Plate Carrier Vest & Shoulder Pads
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.74, 0.32), bodyMat);
      torso.position.y = 1.15;
      torso.castShadow = !isSoftwareGl;
      torso.userData.remotePlayerId = id;
      torso.userData.isHead = false;
      upperBodyGroup.add(torso);
      hitMeshes.push(torso);

      const belt = new THREE.Mesh(new THREE.BoxGeometry(0.59, 0.1, 0.34), gearMat);
      belt.position.set(0, 0.82, 0);
      upperBodyGroup.add(belt);

      const plateCarrier = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.5, 0.37), vestMat);
      plateCarrier.position.set(0, 1.2, 0);
      plateCarrier.userData.remotePlayerId = id;
      plateCarrier.userData.isHead = false;
      upperBodyGroup.add(plateCarrier);
      hitMeshes.push(plateCarrier);

      [-0.14, 0, 0.14].forEach((px) => {
        const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.17, 0.06), gearMat);
        pouch.position.set(px, 1.1, 0.2);
        upperBodyGroup.add(pouch);
      });

      [-0.34, 0.34].forEach((sx) => {
        const pad = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.18, 0.25), vestMat);
        pad.position.set(sx, 1.44, 0);
        upperBodyGroup.add(pad);
      });

      // Neck, Head, Ballistic Helmet & Glowing Team Visor
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.13, 10), gearMat);
      neck.position.set(0, 1.57, 0);
      upperBodyGroup.add(neck);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.34), gearMat);
      head.position.y = 1.78;
      head.castShadow = !isSoftwareGl;
      head.userData.remotePlayerId = id;
      head.userData.isHead = true;
      upperBodyGroup.add(head);
      hitMeshes.push(head);

      const helmetDome = new THREE.Mesh(
        new THREE.SphereGeometry(0.23, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62),
        vestMat
      );
      helmetDome.position.set(0, 0.05, -0.01);
      head.add(helmetDome);

      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.085, 0.05), visorMat);
      visor.position.set(0, 0.02, 0.17);
      head.add(visor);

      // Articulated Left & Right Arms holding Rifle
      const armL = new THREE.Group();
      armL.position.set(-0.35, 1.38, 0.05);
      const upperArmL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 0.16), bodyMat);
      upperArmL.position.set(0.08, -0.14, 0.11);
      upperArmL.rotation.set(-0.85, 0.35, 0);
      const foreArmL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.32, 0.14), gearMat);
      foreArmL.position.set(0.23, -0.2, 0.33);
      foreArmL.rotation.set(-1.35, 0.5, 0);
      armL.add(upperArmL, foreArmL);
      upperBodyGroup.add(armL);

      const armR = new THREE.Group();
      armR.position.set(0.35, 1.38, 0.05);
      const upperArmR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 0.16), bodyMat);
      upperArmR.position.set(-0.04, -0.14, 0.1);
      upperArmR.rotation.set(-0.95, -0.15, 0);
      const foreArmR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.14), gearMat);
      foreArmR.position.set(-0.12, -0.22, 0.25);
      foreArmR.rotation.set(-1.25, -0.2, 0);
      armR.add(upperArmR, foreArmR);
      upperBodyGroup.add(armR);

      const { weaponGroup: gun, muzzleFlash } = buildBotWeaponModel('assault');
      const muzzleFlashMat = botFlashMat.clone();
      muzzleFlash.material = muzzleFlashMat;
      const initWeaponAccent = resolveRemoteWeaponSkinAccentHex(undefined, cosmetics);
      const gunSkinAccentMat = new THREE.MeshBasicMaterial({
        color: initWeaponAccent ?? 0xff7a1a,
      });
      const gunSkinAccentMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.068, 0.022, 0.34),
        gunSkinAccentMat
      );
      gunSkinAccentMesh.position.set(0, 0.056, 0.16);
      gunSkinAccentMesh.visible = initWeaponAccent !== null;
      gun.add(gunSkinAccentMesh);
      gun.position.set(0.16, 1.22, 0.32);
      upperBodyGroup.add(gun);

      const nameTex = makeNameplateTexture(
        nameplateLabel,
        nextColor,
        isCurrentlySpeaking,
        resolveNameplateCosmeticStyle(cosmetics)
      );
      const spriteMat = new THREE.SpriteMaterial({ map: nameTex, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(0, 2.34, 0);
      sprite.scale.set(2.15, 0.4, 1);
      sprite.renderOrder = 2;
      root.add(sprite);

      scene.add(root);
      const initSpawn = getTeamSpawnPosition(team, 0, currentMapRef.current);
      root.position.set(initSpawn.x, 0, initSpawn.z);
      root.rotation.y = initSpawn.yaw;
      root.updateMatrixWorld(true);

      const op: RemoteOperator3D = {
        id,
        name,
        team,
        root,
        upperBodyGroup,
        chestMesh: plateCarrier,
        bodyMat,
        vestMat,
        gearMat,
        visorMat,
        legL,
        legR,
        armL,
        armR,
        gun,
        gunSkinAccentMesh,
        gunSkinAccentMat,
        lastWeaponId: undefined,
        muzzleFlash,
        muzzleFlashMat,
        muzzleFlashTimer: 0,
        sprite,
        hitMeshes,
        targetPos: new THREE.Vector3(initSpawn.x, 0, initSpawn.z),
        targetYaw: initSpawn.yaw,
        lastPos: new THREE.Vector3(initSpawn.x, 0, initSpawn.z),
        walkPhase: 0,
        lastStepIndex: 0,
        initialized: false,
        lastRespawnSeq: -1,
        lastAlive: true,
        lastRound: 0,
        lastSpeaking: isCurrentlySpeaking,
        cosmeticsKey: nextCosKey,
        cosmetics,
        spawnProtected: false,
        isSliding: false,
        slideBlend: 0,
        actionState: 'idle',
        actionTime: Date.now(),
        activeEmoteId: null,
        smoothedSpeed: 0,
        recoilKick: 0,
        isDying: false,
        deathTimer: 0,
        deathDir: Math.random() > 0.5 ? 1 : -1,
        respawnTimer: 0,
        lastAppliedOpacity: 1,
      };
      remoteOperators.set(id, op);
      rebuildRemoteHitboxes();
      return op;
    }

    function disposeRemoteOperator(op: RemoteOperator3D) {
      scene.remove(op.root);
      // Dispose per-operator body geometries (skip shared op.gun meshes using botWeaponGeos)
      const sharedGunMeshes = new Set<THREE.Object3D>();
      op.gun.traverse((child) => sharedGunMeshes.add(child));
      op.root.traverse((obj) => {
        if (sharedGunMeshes.has(obj)) return;
        if (obj instanceof THREE.Mesh && obj.geometry) {
          obj.geometry.dispose();
        }
      });
      op.bodyMat.dispose();
      op.vestMat.dispose();
      op.gearMat.dispose();
      op.visorMat.dispose();
      op.gunSkinAccentMesh.geometry.dispose();
      op.gunSkinAccentMat.dispose();
      op.muzzleFlashMat.dispose();
      const spMat = op.sprite.material as THREE.SpriteMaterial;
      spMat.map?.dispose();
      spMat.dispose();
    }

    function removeRemoteOperator(id: string) {
      const op = remoteOperators.get(id);
      if (op) {
        disposeRemoteOperator(op);
        remoteOperators.delete(id);
        rebuildRemoteHitboxes();
      }
    }

    function clearAllRemoteOperators() {
      remoteOperators.forEach((op) => disposeRemoteOperator(op));
      remoteOperators.clear();
      rebuildRemoteHitboxes();
    }

    function applyOnlineRoomState(roomData: OnlineRoomSummary | AuthoritativeRoomState) {
      activeOnlineRoomCode = roomData.code;
      setOnlineRoom(roomData);
      setOnlineRoomError(null);
      syncShotgunMythicStats();
      if (roomData.mapId && roomData.mapId !== currentMapRef.current) {
        currentMapRef.current = roomData.mapId;
        setCurrentMapState(roomData.mapId);
        buildArenaMap(roomData.mapId);
      }
      const activeIds = new Set<string>();
      const roomRound = (roomData as AuthoritativeRoomState).currentRound ?? 1;
      let visibilityChanged = false;
      roomData.players.forEach((p) => {
        if (p.id === myOnlineId) return;
        activeIds.add(p.id);
        const pTeam: TeamId = p.team || 'alpha';
        const op = getOrCreateRemoteOperator(p.id, p.name, getTeamColor(pTeam), pTeam, p.cosmetics);
        const nextAlive = p.alive !== false && !p.disconnected;
        const wasAlive = op.lastAlive;
        op.spawnProtected = Boolean(p.spawnProtected);
        op.isSliding = Boolean(p.isSliding && roomData.slideAllowed !== false && nextAlive);

        if (p.disconnected) {
          if (op.root.visible || op.isDying) {
            op.root.visible = false;
            op.isDying = false;
            visibilityChanged = true;
          }
        } else if (op.initialized && wasAlive && !nextAlive) {
          // Smooth short death fall + fade-out while immediately removing hitboxes!
          op.isDying = true;
          op.deathTimer = 0;
          op.deathDir = op.deathDir * -1;
          op.muzzleFlash.visible = false;
          op.root.visible = true;
          op.actionState = 'dead';
          op.actionTime = Date.now();
          visibilityChanged = true;
        } else if (nextAlive) {
          if (!op.root.visible || op.isDying || !wasAlive) {
            op.root.visible = true;
            op.isDying = false;
            op.deathTimer = 0;
            op.respawnTimer = 0;
            op.root.rotation.x = 0;
            op.root.rotation.z = 0;
            op.root.scale.y = 1;
            applyRemoteOperatorOpacity(op, 1);
            visibilityChanged = true;
          }
        } else if (!op.isDying && isRoundBasedMode(roomData.mode)) {
          if (op.root.visible) {
            op.root.visible = false;
            visibilityChanged = true;
          }
        }

        const rp = p as unknown as {
          x?: number;
          y?: number;
          z?: number;
          yaw?: number;
          respawnSeq?: number;
          anim?: number;
          animAt?: number;
        };
        if (typeof rp.anim === 'number') {
          const decodedAnim = decodePlayerAnimState(rp.anim);
          const nextAnimAt = typeof rp.animAt === 'number' ? rp.animAt : op.actionTime;
          if (decodedAnim !== op.actionState || nextAnimAt !== op.actionTime) {
            op.actionState = decodedAnim;
            op.actionTime = nextAnimAt || Date.now();
          }
        }
        if (typeof rp.x === 'number') {
          const nextX = Number(rp.x) || 0;
          const nextY = Number(rp.y) || 0;
          const nextZ = Number(rp.z) || 0;
          const nextYaw = Number(rp.yaw) || 0;
          const nextRespawnSeq = typeof rp.respawnSeq === 'number' ? rp.respawnSeq : op.lastRespawnSeq;

          const instantTeleport = shouldInstantTeleportRemotePlayer({
            initialized: op.initialized,
            prevX: op.root.position.x,
            prevZ: op.root.position.z,
            nextX,
            nextZ,
            prevRespawnSeq: op.lastRespawnSeq,
            nextRespawnSeq,
            prevAlive: op.lastAlive,
            nextAlive,
            prevRound: op.lastRound,
            nextRound: roomRound,
          });

          op.targetPos.set(nextX, nextY, nextZ);
          op.targetYaw = nextYaw;

          if (instantTeleport && nextAlive) {
            op.root.position.set(nextX, nextY, nextZ);
            op.lastPos.set(nextX, nextY, nextZ);
            op.root.rotation.set(0, nextYaw, 0);
            op.legL.rotation.x = 0;
            op.legR.rotation.x = 0;
            op.walkPhase = 0;
            op.lastStepIndex = 0;
            op.smoothedSpeed = 0;
            op.respawnTimer = 0;
            op.isDying = false;
            op.deathTimer = 0;
            op.root.updateMatrixWorld(true);
          }

          op.initialized = true;
          op.lastRespawnSeq = Math.max(op.lastRespawnSeq, nextRespawnSeq);
          op.lastAlive = nextAlive;
          op.lastRound = roomRound;
        } else {
          op.lastAlive = nextAlive;
          op.lastRound = roomRound;
        }
      });
      Array.from(remoteOperators.keys()).forEach((rid) => {
        if (!activeIds.has(rid)) removeRemoteOperator(rid);
      });
      if (visibilityChanged) {
        remoteOperators.forEach((op) => op.root.updateMatrixWorld(true));
        rebuildRemoteHitboxes();
      }

      // Sync 3-2-1 round countdown overlay & audio cue (only fires on integer transitions)
      const roomPhase = roomData.roundPhase || 'playing';
      if (roomPhase === 'match_over' && document.pointerLockElement === canvas) {
        document.exitPointerLock?.();
        isFiringInput = false;
      }
      if (roomPhase === 'match_over' && isRoundBasedMode(roomData.mode) && roomData.matchWinnerTeam) {
        const myTeamNow = peerManager.getLocalTeam();
        const matchWinKey = `${roomData.code}:${roomData.currentRound ?? 0}:${roomData.alphaScore ?? 0}-${roomData.bravoScore ?? 0}`;
        if (roomData.matchWinnerTeam === myTeamNow && matchWinKey !== lastAwardedMatchWinKey) {
          lastAwardedMatchWinKey = matchWinKey;
          grantMatchWinSpinRef.current();
        }
      } else if (roomPhase === 'playing') {
        lastAwardedMatchWinKey = '';
      }
      const nextCountdown =
        isRoundBasedMode(roomData.mode) && roomPhase === 'countdown'
          ? Math.max(1, Math.min(ROUND_COUNTDOWN_SEC, roomData.countdownRemainingSec ?? ROUND_COUNTDOWN_SEC))
          : 0;
      if (nextCountdown !== lastSyncedCountdownSec) {
        if (nextCountdown > 0 && screenStateRef.current === 'playing') {
          sound.playCountdownTick(false);
        } else if (lastSyncedCountdownSec > 0 && roomPhase === 'playing' && screenStateRef.current === 'playing') {
          sound.playCountdownTick(true);
        }
        lastSyncedCountdownSec = nextCountdown;
        setRoundCountdownSec(nextCountdown);
      }

      // Sync local spawn protection badge & Host startingHp/maxHp
      const meInRoom = roomData.players.find((p) => p.id === myOnlineId);
      const syncedStartHp =
        (roomData as AuthoritativeRoomState).startingHp ?? DEFAULT_HOST_MATCH_SETTINGS.startingHp;
      if (player.maxHp !== syncedStartHp) {
        player.maxHp = syncedStartHp;
        if (meInRoom && meInRoom.alive !== false && typeof meInRoom.hp === 'number') {
          player.hp = Math.min(syncedStartHp, meInRoom.hp);
        }
        updateHUD();
      }
      const nextLocalProtected = Boolean(meInRoom?.spawnProtected && meInRoom?.alive !== false);
      if (nextLocalProtected !== lastSyncedLocalProtected) {
        lastSyncedLocalProtected = nextLocalProtected;
        setLocalSpawnProtected(nextLocalProtected);
      }

      // Sync post-death spectator state cleanly
      syncSpectatorFromRoom(roomData);
    }

    let activeTeamPings: TeamTacticalPing[] = [];
    let activeTeamQuickMsgs: TeamQuickMessage[] = [];
    let lastProjectedPingCount = 0;
    const tempPingProjVec = new THREE.Vector3();
    const tempPingNdcVec = new THREE.Vector2();
    const tempPingDir = new THREE.Vector3();

    function sendTeamPingFromScreenPoint(ndcX = 0, ndcY = 0) {
      const curRoom = peerManager.getRoom();
      if (!curRoom || !isTeamCommsMode(curRoom.mode)) return;
      tempPingNdcVec.set(ndcX, ndcY);
      shootRaycaster.setFromCamera(tempPingNdcVec, camera);
      shootRaycaster.far = 95;
      const hits = shootRaycaster.intersectObjects(shootableEnvironment, false);
      let targetPt: THREE.Vector3;
      if (hits.length > 0) {
        targetPt = hits[0].point;
      } else {
        tempPingDir.copy(shootRaycaster.ray.direction);
        if (tempPingDir.y < -0.04) {
          const tGround = Math.min(55, Math.max(3, -camera.position.y / tempPingDir.y));
          targetPt = camera.position.clone().addScaledVector(tempPingDir, tGround);
          targetPt.y = 0;
        } else {
          targetPt = camera.position.clone().addScaledVector(tempPingDir, 22);
          targetPt.y = Math.max(0, Math.min(3.5, targetPt.y));
        }
      }
      peerManager.sendTeamPing(
        Number(targetPt.x.toFixed(2)),
        Number(targetPt.y.toFixed(2)),
        Number(targetPt.z.toFixed(2))
      );
    }

    const voiceManager = new PeerVoiceChatManager(
      myOnlineId,
      (snapshot) => {
        voiceStateRef.current = snapshot;
        setVoiceState(snapshot);
        refreshRemoteNameplatesSpeaking(snapshot.speakingPlayerIds);
      },
      (msgFa) => {
        showCenterAlert(msgFa, 3200);
      }
    );
    voiceManager.setLowDataMode(lowDataModeRef.current);

    const peerManager = new PeerMultiplayerManager(
      myOnlineId,
      onlinePlayerNameRef.current || 'GHOST-01',
      {
        onStatusChange: (status, role, error) => {
          setPeerStatus(status);
          setPeerRole(role);
          setOnlineConnected(status === 'connected');
          if (error) {
            setOnlineRoomError(error);
          }
        },
        onPeerReady: (peer, localPeerId) => {
          voiceManager.attachPeer(peer, localPeerId);
        },
        onPingUpdate: (nextPing) => {
          pingMsRef.current = nextPing;
          setPingMs(nextPing);
        },
        onReconnectingChange: (reconnecting, remainingSec) => {
          setClientReconnecting({ active: reconnecting, remainingSec });
        },
        onTransportChange: (info) => {
          setOnlineTransport(info);
        },
        onRoomState: (room) => {
          applyOnlineRoomState(room);
          setPendingInviteRoomCode(null);
          // Clean invite #room= or ?room= from URL after entering a room
          try {
            const parsedUrl = parseRoomInviteFromUrl(window.location.search, window.location.hash);
            if (parsedUrl.roomCode) {
              const url = new URL(window.location.href);
              url.searchParams.delete('room');
              url.searchParams.delete('map');
              if (/^#?room=/i.test(url.hash)) {
                url.hash = '';
              }
              const nextCleanUrl = `${url.pathname}${url.search}${url.hash}`;
              window.history.replaceState(null, '', nextCleanUrl);
            }
          } catch {
            // ignore history API errors in restricted iframes
          }
          voiceManager.syncRoomRoster(
            room.code,
            room.mode,
            room.players.filter((p) => !p.isBot)
          );
        },
        onRoomLeft: () => {
          activeOnlineRoomCode = '';
          setOnlineRoom(null);
          pingMsRef.current = null;
          setPingMs(null);
          setClientReconnecting({ active: false, remainingSec: 0 });
          clearAllRemoteOperators();
          voiceManager.clearRoomAndDisconnect();
          lastKillerId = null;
          lastSyncedCountdownSec = 0;
          setRoundCountdownSec(0);
          lastSyncedLocalProtected = false;
          setLocalSpawnProtected(false);
          activeTeamPings = [];
          activeTeamQuickMsgs = [];
          lastProjectedPingCount = 0;
          setProjectedTeamPings([]);
          setTeamQuickMsgs([]);
          setQuickCommsOpen(false);
          clearSpectatorMode();
          syncShotgunMythicStats();
        },
        onTeamPing: (ping) => {
          const now = Date.now();
          activeTeamPings = pruneExpiredTeamSignals(
            activeTeamPings.filter((p) => p.senderId !== ping.senderId),
            now
          );
          activeTeamPings.push(ping);
          sound.playCountdownTick(false);
        },
        onTeamQuickMessage: (msg) => {
          const now = Date.now();
          activeTeamQuickMsgs = pruneExpiredTeamSignals(activeTeamQuickMsgs, now);
          activeTeamQuickMsgs = [...activeTeamQuickMsgs.slice(-2), msg];
          setTeamQuickMsgs([...activeTeamQuickMsgs]);
          sound.playCountdownTick(false);
          window.setTimeout(() => {
            activeTeamQuickMsgs = pruneExpiredTeamSignals(activeTeamQuickMsgs, Date.now());
            setTeamQuickMsgs([...activeTeamQuickMsgs]);
          }, TEAM_QUICK_MSG_TTL_MS + 80);
        },
        onRemoteShoot: (playerId, weaponIdx, from, to) => {
          const f = new THREE.Vector3(Number(from.x) || 0, Number(from.y) || 1.4, Number(from.z) || 0);
          const t = new THREE.Vector3(Number(to.x) || 0, Number(to.y) || 1.4, Number(to.z) || 0);
          const firedWeaponId: WeaponId = WEAPONS[weaponIdx]?.id || 'ak47';
          const shooterOp = remoteOperators.get(playerId);
          const shooterRoomPlayer = peerManager.getRoom()?.players.find((p) => p.id === playerId);
          const shooterCos = shooterRoomPlayer?.cosmetics || shooterOp?.cosmetics;
          const remoteMuzzleHex = resolveEffectiveMuzzleFlashColorInt(firedWeaponId, shooterCos);
          const remoteTracerHex = resolveEffectiveTracerColorInt(firedWeaponId, shooterCos);
          if (shooterOp && shooterOp.lastAlive && !shooterOp.isDying) {
            shooterOp.lastWeaponId = firedWeaponId;
            const shotAccent = resolveRemoteWeaponSkinAccentHex(firedWeaponId, shooterCos);
            if (shotAccent !== null) {
              shooterOp.gunSkinAccentMat.color.setHex(shotAccent);
              shooterOp.gunSkinAccentMesh.visible = true;
            } else {
              shooterOp.gunSkinAccentMesh.visible = false;
            }
            shooterOp.recoilKick = 1.0;
            shooterOp.actionState = 'shoot';
            shooterOp.actionTime = Date.now();
            if (firedWeaponId !== 'katana') {
              shooterOp.muzzleFlashMat.color.setHex(remoteMuzzleHex);
              shooterOp.muzzleFlash.visible = true;
              shooterOp.muzzleFlash.rotation.z = Math.random() * Math.PI * 2;
              shooterOp.muzzleFlashTimer = 0.055;
            }
          }
          const isRemoteVoidShot = firedWeaponId === 'sniper' && shooterCos?.sn === LEGENDARY_SNIPER_ID;
          const isRemoteTempestShot = firedWeaponId === 'lmg' && shooterCos?.m249 === MYTHIC_M249_ID;
          const isRemoteEclipseShot = firedWeaponId === 'shotgun' && shooterCos?.sg === MYTHIC_SHOTGUN_ID;
          const isRemoteNovaRpgShot = firedWeaponId === 'rpg' && shooterCos?.rpg === LEGENDARY_RPG_ID;
          const netFxCfg = resolveNetworkSkinFx(getInfernoFxConfig(), lowDataModeRef.current);
          if (firedWeaponId === 'ak47' && shooterCos?.ak === LEGENDARY_AK47_ID && !netFxCfg.disabled) {
            infernoVfxPool.spawnFiringEmbers(f, netFxCfg.scale * 0.75, false);
          } else if (isRemoteVoidShot && !netFxCfg.disabled) {
            voidVfxPool.spawnBeamAndShockwave(f, t, netFxCfg.scale * 0.85, false);
          } else if (isRemoteTempestShot && !netFxCfg.disabled) {
            tempestVfxPool.spawnShotEffects(f, t, 0.55, {
              reducedMotion: reducedMotionRef.current,
              lowQuality: netFxCfg.simple || gfx.preset === 'low' || gfx.preset === 'potato' || gfx.preset === 'lite' || adaptiveQuality.stage >= 2,
            });
          } else if (isRemoteEclipseShot && !netFxCfg.disabled) {
            eclipseVfxPool.spawnShotEffects(f, [t], {
              reducedMotion: reducedMotionRef.current,
              lowQuality: netFxCfg.simple || gfx.preset === 'low' || gfx.preset === 'potato' || gfx.preset === 'lite' || adaptiveQuality.stage >= 2,
            });
          } else if (isRemoteNovaRpgShot && !netFxCfg.disabled) {
            novaDragonVfxPool.spawnRocketTrail(f, t, netFxCfg.scale * 0.9, reducedMotionRef.current);
          }
          if (firedWeaponId !== 'katana' && !isRemoteEclipseShot) {
            spawnTracer(f, t, remoteTracerHex);
          }
          if (isRemoteVoidShot) {
            sound.playVoidPiercerShot();
          } else if (isRemoteTempestShot) {
            sound.playWeaponShotById(firedWeaponId);
            sound.playTempestShot(0.45);
          } else if (isRemoteEclipseShot) {
            sound.playWeaponShotById(firedWeaponId);
            sound.playEclipseShot();
          } else if (isRemoteNovaRpgShot) {
            sound.playNovaDragonLaunch();
          } else {
            sound.playWeaponShotById(firedWeaponId);
          }
          if (firedWeaponId === 'rpg') {
            if (isRemoteNovaRpgShot) {
              sound.playNovaDragonExplosion();
              if (!netFxCfg.disabled) {
                novaDragonVfxPool.spawnNovaExplosion(t, netFxCfg.scale * 0.9, reducedMotionRef.current);
              }
            } else {
              sound.playRPGExplosion();
              if (!lowDataModeRef.current) {
                spawnParticles(t, 0xff5500, 18, 9.5);
                spawnParticles(t, 0xffcc00, 10, 7.0);
              }
            }
          }
        },
        onRemoteEmote: (playerId, emoteId) => {
          const op = remoteOperators.get(playerId);
          if (!op || !op.lastAlive || op.isDying) return;
          if (emoteId) {
            op.actionState = 'emote';
            op.activeEmoteId = emoteId;
            op.actionTime = Date.now();
          } else if (op.actionState === 'emote') {
            op.actionState = 'idle';
            op.activeEmoteId = null;
            op.actionTime = Date.now();
          }
        },
        onMapChangedByHost: (nextMap) => {
          if (nextMap !== currentMapRef.current) {
            currentMapRef.current = nextMap;
            setCurrentMapState(nextMap);
            buildArenaMap(nextMap);
            createPickups();
            const mapObj = MAP_LIST.find((m) => m.id === nextMap);
            if (mapObj) {
              showCenterAlert(`میزبان نقشه را تغییر داد: ${mapObj.nameFa}`, 2200);
            }
          }
        },
        onPlayerHitConfirmed: (evt) => {
          const killedWeaponId: WeaponId = WEAPONS[evt.weaponIdx]?.id || 'ak47';
          const isInfernoKill = evt.killed && isInfernoReaperKill(killedWeaponId, evt.attackerCosmetics);
          const isVoidKill = evt.killed && isVoidPiercerKill(killedWeaponId, evt.attackerCosmetics);
          const isTempestKill = evt.killed && isTempestAegisKill(killedWeaponId, evt.attackerCosmetics);
          const isEclipseKill = evt.killed && isEclipseBreacherKill(killedWeaponId, evt.attackerCosmetics);
          const isSakuraKill = evt.killed && isSakuraKatanaKill(killedWeaponId, evt.attackerCosmetics);
          const isNovaRpgKill = evt.killed && isNovaDragonRpgKill(killedWeaponId, evt.attackerCosmetics);
          if (evt.attackerId === myOnlineId && evt.killed) {
            triggerHitmarker(evt.isHeadshot, true);
            triggerHapticFeedback(vibrationEnabledRef.current, 'kill');
            if (isInfernoKill) {
              sound.playInfernoKill(evt.isHeadshot);
              triggerInfernoEdgeFlashRef.current(evt.isHeadshot);
            } else if (isVoidKill) {
              sound.playVoidPiercerKill(evt.isHeadshot);
              triggerVoidEdgeFlashRef.current(evt.isHeadshot);
            } else if (isSakuraKill) {
              sound.playSakuraKatanaKill(evt.isHeadshot);
            } else if (isNovaRpgKill) {
              sound.playNovaDragonKill(evt.isHeadshot);
            } else if (isTempestKill) {
              tempestSessionKills += 1;
              tempestLmgModel?.setKillCount(tempestSessionKills);
              sound.playTempestKill(evt.isHeadshot);
              if (!getInfernoFxConfig().disabled) triggerMythicEdgeFlashRef.current(evt.isHeadshot);
            } else if (isEclipseKill) {
              eclipseSessionKills += 1;
              eclipseShotgunModel?.setKillCount(eclipseSessionKills);
              sound.playEclipseKill(evt.isHeadshot);
              if (!getInfernoFxConfig().disabled) triggerEclipseEdgeFlashRef.current(evt.isHeadshot);
            } else {
              sound.playKillConfirm(evt.isHeadshot);
            }
            grantKillSpinProgressRef.current(1);
          } else if (isInfernoKill) {
            sound.playInfernoKill(evt.isHeadshot);
          } else if (isVoidKill) {
            sound.playVoidPiercerKill(evt.isHeadshot);
          } else if (isSakuraKill) {
            sound.playSakuraKatanaKill(evt.isHeadshot);
          } else if (isNovaRpgKill) {
            sound.playNovaDragonKill(evt.isHeadshot);
          } else if (isTempestKill) {
            sound.playTempestKill(evt.isHeadshot);
          } else if (isEclipseKill) {
            sound.playEclipseKill(evt.isHeadshot);
          }
          if (evt.killed) {
            if (isInfernoKill || isVoidKill || isSakuraKill || isNovaRpgKill || isTempestKill || isEclipseKill) {
              const fxCfg = resolveNetworkSkinFx(getInfernoFxConfig(), lowDataModeRef.current);
              if (!fxCfg.disabled) {
                if (evt.targetPos) {
                  _fxTmpV2.set(evt.targetPos.x, evt.targetPos.y + 1.15, evt.targetPos.z);
                } else if (evt.targetId === myOnlineId) {
                  _fxTmpV2.set(player.pos.x, player.pos.y + 1.15, player.pos.z);
                } else {
                  const victimOp = remoteOperators.get(evt.targetId);
                  if (victimOp) {
                    _fxTmpV2.set(victimOp.root.position.x, victimOp.root.position.y + 1.15, victimOp.root.position.z);
                  } else {
                    _fxTmpV2.set(0, -100, 0);
                  }
                }
                if (_fxTmpV2.y > -50) {
                  if (isInfernoKill) {
                    infernoVfxPool.spawnKillBurst(_fxTmpV2, evt.isHeadshot, fxCfg.scale, false);
                  } else if (isVoidKill) {
                    voidVfxPool.spawnGravityKill(_fxTmpV2, evt.isHeadshot, fxCfg.scale, false);
                  } else if (isSakuraKill) {
                    sakuraVfxPool.spawnKillBurst(_fxTmpV2, evt.isHeadshot, fxCfg.scale, false);
                  } else if (isNovaRpgKill) {
                    novaDragonVfxPool.spawnNovaKillEffect(_fxTmpV2, evt.isHeadshot, fxCfg.scale, reducedMotionRef.current);
                  } else if (isTempestKill) {
                    _fxTmpV2.y -= 1.15;
                    tempestVfxPool.spawnKillEffect(_fxTmpV2, {
                      headshot: evt.isHeadshot,
                      reducedMotion: reducedMotionRef.current,
                      lowQuality: fxCfg.simple,
                    });
                  } else if (isEclipseKill) {
                    _fxTmpV2.y -= 1.15;
                    eclipseVfxPool.spawnKillEffect(_fxTmpV2, {
                      headshot: evt.isHeadshot,
                      reducedMotion: reducedMotionRef.current,
                      lowQuality: fxCfg.simple,
                    });
                  }
                }
              }
            }
            const killIconMeta = getCosmeticItem(evt.attackerCosmetics?.ki);
            const badgeMeta = getCosmeticItem(evt.attackerCosmetics?.nb);
            addStructuredKillFeed({
              killerName: evt.attackerName,
              killerTeam: evt.attackerTeam,
              weaponName: getWeaponShortName(evt.weaponIdx),
              victimName: evt.targetName,
              victimTeam: evt.targetTeam,
              isHeadshot: evt.isHeadshot,
              infernoLegendary: isInfernoKill,
              voidLegendary: isVoidKill,
              tempestMythic: isTempestKill,
              eclipseMythic: isEclipseKill,
              killIconSymbol: isEclipseKill
                ? '☀'
                : isTempestKill
                  ? '✧'
                  : isSakuraKill
                    ? '✿'
                    : isVoidKill
                      ? '◈'
                      : isInfernoKill
                        ? '🔥'
                        : killIconMeta?.symbol,
              killIconColorHex: isEclipseKill
                ? '#f59e0b'
                : isTempestKill
                  ? '#ff2a55'
                  : isSakuraKill
                    ? '#f472b6'
                    : isVoidKill
                      ? '#22d3ee'
                      : isInfernoKill
                        ? '#ff7a18'
                        : killIconMeta?.colorHex,
              killerBadgeSymbol: badgeMeta?.symbol,
              killerBadgeColorHex: badgeMeta?.colorHex,
            });
          }
        },
        onLocalPlayerDamaged: (dmg, attackerName, killed, respawnPos, attackerId) => {
          if (cheatConfigRef.current.godMode) return;
          cancelLocalMythicEmote(true);
          triggerHapticFeedback(vibrationEnabledRef.current, 'damage');
          const activeRoom = peerManager.getRoom();
          const roundMode = activeRoom ? isRoundBasedMode(activeRoom.mode) : false;
          const roomStartHp = activeRoom?.startingHp ?? DEFAULT_HOST_MATCH_SETTINGS.startingHp;
          player.maxHp = roomStartHp;
          player.hp = killed ? (roundMode ? 0 : roomStartHp) : Math.max(0, player.hp - dmg);
          if (killed) {
            slideState = createInitialSlideState();
            if (roundMode) {
              if (attackerId) lastKillerId = attackerId;
              isFiringInput = false;
              isADS = false;
              setIsSniperScoped(false);
              showCenterAlert(`توسط «${attackerName}» حذف شدید — حالت تماشاگر فعال شد`, 2200);
              if (activeRoom) {
                syncSpectatorFromRoom(activeRoom);
              }
            } else {
              const myTeam = peerManager.getLocalTeam();
              const teamSpawn = respawnPos || getTeamSpawnPosition(myTeam, 0, activeRoom?.mapId || currentMapRef.current);
              player.pos.set(teamSpawn.x, 0, teamSpawn.z);
              player.vel.set(0, 0, 0);
              player.yaw = teamSpawn.yaw;
              player.pitch = 0;
              camera.position.set(player.pos.x, player.pos.y + PLAYER_STAND_EYE_HEIGHT, player.pos.z);
              camera.rotation.set(0, player.yaw, 0, 'YXZ');
              localRespawnUntilMs = performance.now() + Math.round(HUMANOID_RESPAWN_DURATION_SEC * 1000);
              lastLocalAnimState = 'respawn';
              lastLocalAnimAtMs = Date.now();
              showCenterAlert(`توسط «${attackerName}» کشته شدید — بازگشت به زمین تیم`, 2200);
              if (activeOnlineRoomCode) {
                peerManager.syncLocalPlayerState({
                  x: Number(player.pos.x.toFixed(2)),
                  y: 0,
                  z: Number(player.pos.z.toFixed(2)),
                  yaw: Number(player.yaw.toFixed(3)),
                  pitch: 0,
                  weaponIdx: currentWeaponIdx,
                  hp: player.hp,
                  kills: totalKills,
                  score,
                  wave,
                  isSliding: false,
                  anim: encodePlayerAnimState('respawn'),
                  animAt: lastLocalAnimAtMs,
                });
              }
            }
          }
          if (damageVignette) {
            damageVignette.style.opacity = '0.85';
            window.setTimeout(() => {
              if (damageVignette) damageVignette.style.opacity = '0';
            }, 220);
          }
          updateHUD();
        },
        onRoundRespawn: (roundNum, _team, spawnPos, messageFa) => {
          lastKillerId = null;
          localRespawnUntilMs = performance.now() + Math.round(HUMANOID_RESPAWN_DURATION_SEC * 1000);
          clearSpectatorMode();
          slideState = createInitialSlideState();
          currentEyeHeight = PLAYER_STAND_EYE_HEIGHT;
          player.height = PLAYER_STAND_EYE_HEIGHT;
          player.pos.set(spawnPos.x, 0, spawnPos.z);
          player.vel.set(0, 0, 0);
          player.yaw = spawnPos.yaw;
          player.pitch = 0;
          const respawnRoom = peerManager.getRoom();
          const respawnStartHp = respawnRoom?.startingHp ?? DEFAULT_HOST_MATCH_SETTINGS.startingHp;
          player.maxHp = respawnStartHp;
          player.hp = respawnStartHp;
          player.armor = 50;
          player.onGround = true;
          isADS = false;
          document.getElementById('btn-ads')?.classList.remove('active-ads');
          cancelLocalMythicEmote(true);
          localInspectProgress = -1;
          syncShotgunMythicStats();
          syncSniperScopeState();
          weaponPivot.visible = true;
          camRecoilPitch = camRecoilYaw = camTargetRecoilPitch = camTargetRecoilYaw = 0;
          camera.position.set(player.pos.x, player.pos.y + currentEyeHeight, player.pos.z);
          camera.rotation.set(0, player.yaw, 0, 'YXZ');
          WEAPONS.forEach((wp) => {
            if (!wp.isMelee) {
              wp.mag = wp.magSize;
              wp.reserve = wp.maxReserve;
              if (wp.id === 'rpg' && wp.model.mag) {
                wp.model.mag.visible = true;
              }
            }
          });
          isReloading = false;
          reloadProgress = 0;
          lastTempestReloadPhase = 'idle';
          lastEclipseReloadPhase = 'idle';
          lastEclipseReloadShellIndex = -1;
          tempestLmgModel?.applyCinematicReload(0);
          eclipseShotgunModel?.applyCinematicReload(0);
          if (reloadIndicator) reloadIndicator.style.display = 'none';
          if (reloadBarFill) reloadBarFill.style.width = '0%';
          enemies.forEach((e) => disposeEnemyBot(e));
          enemies.length = 0;
          clearEnemyBullets();
          rebuildEnemyHitboxes();
          remoteOperators.forEach((op) => op.root.updateMatrixWorld(true));
          rebuildRemoteHitboxes();
          if (activeOnlineRoomCode) {
            peerManager.syncLocalPlayerState({
              x: Number(player.pos.x.toFixed(2)),
              y: 0,
              z: Number(player.pos.z.toFixed(2)),
              yaw: Number(player.yaw.toFixed(3)),
              pitch: 0,
              weaponIdx: currentWeaponIdx,
              hp: respawnStartHp,
              kills: totalKills,
              score,
              wave: roundNum,
              isSliding: false,
            });
          }
          startWave(roundNum);
          if (peerManager.getRoom()?.roundPhase !== 'countdown') {
            showCenterAlert(messageFa, 2400);
          }
          updateHUD();
        },
        onNotice: (messageFa) => {
          showCenterAlert(messageFa, 2800);
        },
      }
    );

    function sendOnlineShoot(weaponIdx: number, from: THREE.Vector3, to: THREE.Vector3) {
      if (!activeOnlineRoomCode) return;
      peerManager.sendShoot(
        weaponIdx,
        { x: Number(from.x.toFixed(2)), y: Number(from.y.toFixed(2)), z: Number(from.z.toFixed(2)) },
        { x: Number(to.x.toFixed(2)), y: Number(to.y.toFixed(2)), z: Number(to.z.toFixed(2)) }
      );
    }

    // Check invite URL (#room=CODE or legacy ?room=CODE&map=...) on startup
    const initUrlParams = new URLSearchParams(window.location.search);
    const parsedInvite = parseRoomInviteFromUrl(window.location.search, window.location.hash);
    if (parsedInvite.mapId && isValidMapId(parsedInvite.mapId)) {
      currentMapRef.current = parsedInvite.mapId;
      setCurrentMapState(parsedInvite.mapId);
      buildArenaMap(parsedInvite.mapId);
    }
    if (parsedInvite.roomCode) {
      // Go directly to Join Room view with code pre-filled so the player confirms/enters their name first
      setPendingInviteRoomCode(parsedInvite.roomCode);
      setShowOnlineModal(true);
    }

    let lastAwardedMatchWinKey = '';
    peerManager.setOgMode(isOgModeRef.current);
    peerManager.setLowDataMode(lowDataModeRef.current);
    peerManager.setLocalCosmetics(
      ogFeaturesRef.current.skinsAndCollection
        ? toOnlineSyncedCosmetics(getGameplayEquipped())
        : {}
    );
    if (!ogFeaturesRef.current.adBillboards) {
      adBillboardGroup.visible = false;
    }

    const lockMatchCosmeticsForNewMatch = () => {
      const locked = { ...cosmeticsStateRef.current.equipped };
      activeMatchEquippedRef.current = locked;
      setActiveMatchEquipped(locked);
      setDeferredSkinNoticeFa(null);
      syncLocalAkSkinVisuals();
      syncLocalSniperSkinVisuals();
      syncLocalLmgSkinVisuals();
      syncLocalShotgunSkinVisuals();
      syncLocalKatanaSkinVisuals();
      syncLocalRpgSkinVisuals();
      syncShotgunMythicStats();
      syncSniperScopeState();
      peerManager.setLocalCosmetics(
        ogFeaturesRef.current.skinsAndCollection ? toOnlineSyncedCosmetics(locked) : {}
      );
    };

    const clearMatchCosmeticsLock = () => {
      activeMatchEquippedRef.current = null;
      setActiveMatchEquipped(null);
      setDeferredSkinNoticeFa(null);
    };

    // Expose Engine API to React UI
    engineApiRef.current = {
      startSession: (mode: GamePlayMode, customTraining?: TrainingConfig) => {
        sound.unlock();
        const activeRoomAtStart = peerManager.getRoom();
        const isFirstOfflineCampaign =
          mode === 'campaign' &&
          !activeRoomAtStart &&
          !initUrlParams.get('autostart') &&
          shouldAutoStartQuickTutorial(readQuickTutorialDoneFlag(), false);

        if (isFirstOfflineCampaign) {
          const qt = createQuickTutorialState(slideAlphaEnabledRef.current);
          quickTutorialRef.current = qt;
          setQuickTutorial(qt);
        } else {
          quickTutorialRef.current = null;
          setQuickTutorial(null);
          clearQuickTutorialTargets();
        }

        playModeRef.current = mode;
        setPlayMode(mode);
        setShowTrainingModal(false);
        setShowSettingsModal(false);
        setShowOnlineModal(false);
        setShowLayoutEditor(false);
        setShowSkinsModal(false);
        setShowSpinModal(false);
        lockMatchCosmeticsForNewMatch();
        resetGame(mode, customTraining);
        anyMenuOverlayOpenRef.current = false;
        screenStateRef.current = 'playing';
        document.body.dataset.state = 'playing';
        setScreenState('playing');
        wakeRenderLoop(false);
        if (mode === 'campaign' && peerManager.getRole() === 'host' && activeRoomAtStart) {
          peerManager.applyWinningMapVoteOnHost();
          if (isRoundBasedMode(activeRoomAtStart.mode)) {
            peerManager.beginAuthoritativeRoundCountdown();
          }
        }
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      },
      startQuickTutorial: () => {
        sound.unlock();
        if (peerManager.getRoom()) {
          showCenterAlert('آموزش کوتاه فقط در حالت آفلاین فعال است', 1800);
          return;
        }
        const qt = createQuickTutorialState(slideAlphaEnabledRef.current);
        quickTutorialRef.current = qt;
        setQuickTutorial(qt);
        playModeRef.current = 'campaign';
        setPlayMode('campaign');
        setShowTrainingModal(false);
        setShowSettingsModal(false);
        setShowOnlineModal(false);
        setShowLayoutEditor(false);
        setShowSkinsModal(false);
        setShowSpinModal(false);
        lockMatchCosmeticsForNewMatch();
        resetGame('campaign');
        anyMenuOverlayOpenRef.current = false;
        screenStateRef.current = 'playing';
        document.body.dataset.state = 'playing';
        setScreenState('playing');
        wakeRenderLoop(false);
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      },
      skipQuickTutorial: (startNormalMatch = true) => {
        markQuickTutorialDoneFlag();
        quickTutorialRef.current = null;
        setQuickTutorial(null);
        clearQuickTutorialTargets();
        if (startNormalMatch && !peerManager.getRoom()) {
          startWave(1);
        } else if (!startNormalMatch) {
          isFiringInput = false;
          if (document.pointerLockElement) document.exitPointerLock?.();
          setShowLayoutEditor(false);
          setShowSkinsModal(false);
          setShowSpinModal(false);
          clearMatchCosmeticsLock();
          screenStateRef.current = 'title';
          document.body.dataset.state = 'title';
          setScreenState('title');
          wakeRenderLoop(true);
        }
      },
      resumeSession: () => {
        sound.unlock();
        resetTouchInputState();
        setShowSettingsModal(false);
        setShowTrainingModal(false);
        setShowOnlineModal(false);
        setShowLayoutEditor(false);
        setShowSkinsModal(false);
        setShowSpinModal(false);
        setDeferredSkinNoticeFa(null);
        anyMenuOverlayOpenRef.current = false;
        screenStateRef.current = 'playing';
        document.body.dataset.state = 'playing';
        setScreenState('playing');
        wakeRenderLoop(false);
      },
      pauseSession: () => {
        resetTouchInputState();
        if (document.pointerLockElement) document.exitPointerLock?.();
        markModalOpenStart(effectiveUiVersionRef.current === 'v3' ? 'settings-v3' : 'settings');
        anyMenuOverlayOpenRef.current = true;
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
        mainLoopRunning = false;
        publishPausedPerfSnapshot();
        screenStateRef.current = 'paused';
        document.body.dataset.state = 'paused';
        setScreenState('paused');
        setShowSettingsModal(true);
      },
      returnToTitle: () => {
        resetTouchInputState();
        if (document.pointerLockElement) document.exitPointerLock?.();
        quickTutorialRef.current = null;
        setQuickTutorial(null);
        clearQuickTutorialTargets();
        setShowSettingsModal(false);
        setShowTrainingModal(false);
        setShowOnlineModal(false);
        setShowLayoutEditor(false);
        setShowSkinsModal(false);
        setShowSpinModal(false);
        clearMatchCosmeticsLock();
        screenStateRef.current = 'title';
        document.body.dataset.state = 'title';
        setScreenState('title');
        wakeRenderLoop(true);
      },
      wakeRenderLoop: (repaintBackdrop = false) => {
        wakeRenderLoop(repaintBackdrop);
      },
      haltRenderLoop: () => {
        anyMenuOverlayOpenRef.current = true;
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
        mainLoopRunning = false;
        publishPausedPerfSnapshot();
      },
      selectWeapon: (idx: number) => {
        sound.unlock();
        selectWeapon(idx);
      },
      cycleNextWeapon: () => {
        sound.unlock();
        cycleNextWeapon();
      },
      setLoadout: (nextLoadout: WeaponId[]) => {
        const clean = sanitizeLoadout(nextLoadout);
        loadoutRef.current = clean;
        setLoadoutState(clean);
        const allowedIndices = clean
          .map((id) => WEAPONS.findIndex((w) => w.id === id))
          .filter((i) => i >= 0);
        if (playModeRef.current !== 'training' && !allowedIndices.includes(currentWeaponIdx)) {
          selectWeapon(allowedIndices[0] ?? 0, true);
        }
        updateHUD();
      },
      startReload: () => {
        sound.unlock();
        startReload();
      },
      toggleADS: (force?: boolean) => {
        sound.unlock();
        toggleADS(force);
      },
      cycleManualLean: () => {
        sound.unlock();
        cycleManualLean();
      },
      setManualLean: (dir: -1 | 0 | 1) => {
        sound.unlock();
        setManualLeanMode(dir);
      },
      activateAdrenaline: () => {
        sound.unlock();
        activateAdrenalinePower();
      },
      spawnPracticeBot: () => {
        sound.unlock();
        spawnOneEnemy();
        updateHUD();
        showCenterAlert('بات تمرینی جدید وارد میدان شد', 1300);
      },
      clearAllBots: () => {
        sound.unlock();
        enemies.forEach((e) => disposeEnemyBot(e));
        enemies.length = 0;
        clearEnemyBullets();
        rebuildEnemyHitboxes();
        updateHUD();
        showCenterAlert('تمام باتها پاکسازی شدند', 1300);
      },
      refillPlayerAndAmmo: () => {
        sound.unlock();
        player.hp = player.maxHp;
        player.armor = player.maxArmor;
        adrenalineCooldown = 0;
        WEAPONS.forEach((w) => {
          if (!w.isMelee) {
            w.mag = w.magSize;
            w.reserve = w.maxReserve;
            if (w.id === 'rpg' && w.model.mag) {
              w.model.mag.visible = true;
            }
          }
        });
        createPickups();
        sound.playPickup();
        updateHUD();
        updateBuffHUD();
        showCenterAlert('مهمات تمام سلاح‌ها، زره، سلامت و آدرنالین شارژ شد', 1600);
      },
      applyPreset: (presetName: GfxPresetName) => {
        gfx.preset = presetName;
        saveGfxPreset(presetName);
        adaptiveQuality = createAdaptiveQualityState();
        dynamicRes = createDynamicResolutionState(1.0);
        if (presetName === 'auto') {
          activeAutoSubTier = pickInitialAutoTier(isMobileDevice);
          initialBenchmark = createInitialBenchmarkState(activeAutoSubTier);
        }
        syncGfxStateForPreset(presetName, activeAutoSubTier);
        const desiredTexTier = resolveDesiredTexTier();
        if (desiredTexTier !== getTextureQualityTier()) {
          setTextureQualityTier(desiredTexTier);
          if (mapInitialized) {
            buildArenaMap(currentMapRef.current);
          }
        }
        setGfxState({ ...gfx });
        applyShadowSettings();
        applyLightingSettings();
        applyBodycamFXSettings();
        applyViewDistanceSettings();
        refreshFxBudget();
      },
      updateGfx: (partial: Partial<GfxState>) => {
        Object.assign(gfx, partial);
        setGfxState({ ...gfx });
        applyShadowSettings();
        applyLightingSettings();
        applyBodycamFXSettings();
      },
      setBatterySaver: (enabled: boolean) => {
        batterySaverRef.current = enabled;
        const desiredTexTier = resolveDesiredTexTier();
        if (desiredTexTier !== getTextureQualityTier()) {
          setTextureQualityTier(desiredTexTier);
          if (mapInitialized) {
            buildArenaMap(currentMapRef.current);
          }
        }
        applyShadowSettings();
        applyLightingSettings();
        applyViewDistanceSettings();
        rebuildRenderTarget();
        refreshFxBudget();
      },
      setLowDataMode: (enabled: boolean) => {
        lowDataModeRef.current = enabled;
        peerManager.setLowDataMode(enabled);
        voiceManager.setLowDataMode(enabled);
      },
      setViewDistanceMode: (mode: ViewDistanceMode) => {
        viewDistanceModeRef.current = mode;
        applyViewDistanceSettings();
      },
      setMap: (mapId: MapId) => {
        currentMapRef.current = mapId;
        setCurrentMapState(mapId);
        buildArenaMap(mapId);
        createPickups();
        peerManager.notifyHostMapChange(mapId);
        wakeRenderLoop(true);
        const mapObj = MAP_LIST.find((m) => m.id === mapId);
        if (mapObj) {
          showCenterAlert(`نقشه فعال: ${mapObj.nameFa}`, 1500);
        }
      },
      updateCheats: (partial: Partial<CheatConfig>) => {
        const next = sanitizeCheatConfig({ ...cheatConfigRef.current, ...partial });
        cheatConfigRef.current = next;
        setCheatConfig(next);
        updateHUD();
      },
      setBotDifficulty: (diff: BotDifficultyPreset) => {
        currentBotDifficulty = diff;
        setBotDifficultyState(diff);
        applyLiveBotParamsToExistingBots();
      },
      setShowCrosshair: (show: boolean) => {
        crosshairVisible = show;
        setShowCrosshairState(show);
        updateCrosshairVisual();
      },
      setSensitivity: (sens: number) => {
        sensValue = sens;
        setSensitivityState(sens);
      },
      setAdsSensitivity: (sens: number) => {
        adsSensMult = sens;
        setAdsSensitivityState(sens);
      },
      setSoundEnabled: (enabled: boolean) => {
        sound.enabled = enabled;
        setSoundEnabledState(enabled);
      },
      setFootstepVolume: (volume: number) => {
        sound.footstepVolume = clampFootstepVolume(volume);
      },
      updateTrainingLive: (cfg: TrainingConfig) => {
        const clean = sanitizeTrainingConfig(cfg);
        trainingConfigRef.current = clean;
        setTrainingConfig(clean);
        applyLiveBotParamsToExistingBots();
        const allowed = getEnabledWeaponIndices(clean.enabledWeapons);
        if (!allowed.includes(currentWeaponIdx)) {
          selectWeapon(allowed[0] ?? 0, true);
        }
        updateHUD();
      },
      createOnlineRoom: (mapId: MapId, mode: OnlineGameMode, password = '') => {
        setOnlineRoomError(null);
        activeOnlinePassword = password.trim();
        const effectiveMode: OnlineGameMode = isOgModeRef.current ? 'og' : mode;
        const effectiveMapId: MapId =
          isOgModeRef.current && !ogFeaturesRef.current.duel1v1Map && mapId === 'duel'
            ? 'warehouse'
            : mapId;
        currentMapRef.current = effectiveMapId;
        setCurrentMapState(effectiveMapId);
        buildArenaMap(effectiveMapId);
        peerManager.setOgMode(isOgModeRef.current);
        peerManager.setPlayerName(onlinePlayerNameRef.current || 'GHOST-01');
        const createdCode = peerManager.hostRoom(effectiveMapId, effectiveMode, activeOnlinePassword);
        activeOnlineRoomCode = createdCode;
      },
      changeOnlineGameMode: (mode: OnlineGameMode) => {
        peerManager.setGameMode(mode);
      },
      updateOnlineRoomRules: (rules: {
        aimAssistAllowed?: boolean;
        slideAllowed?: boolean;
        mythicPerksAllowed?: boolean;
      }) => {
        peerManager.setRoomRules(rules);
      },
      updateOnlineMatchSettings: (settings: Partial<HostMatchSettings>) => {
        peerManager.setMatchSettings(settings);
      },
      sendTeamPingAtReticle: (ndcX = 0, ndcY = 0) => {
        sound.unlock();
        sendTeamPingFromScreenPoint(ndcX, ndcY);
      },
      sendTeamQuickMessage: (messageId: TeamQuickMessageId) => {
        sound.unlock();
        peerManager.sendTeamQuickMessage(messageId);
      },
      switchOnlineTeam: (playerId?: string) => {
        peerManager.switchPlayerTeam(playerId);
      },
      joinOnlineRoom: (code: string, password = '') => {
        const cleanCode = normalizeRoomCode(code);
        setOnlineRoomError(null);
        activeOnlinePassword = password.trim();
        peerManager.setOgMode(isOgModeRef.current);
        peerManager.setPlayerName(onlinePlayerNameRef.current || 'GHOST-01');
        peerManager.joinRoom(cleanCode, activeOnlinePassword);
      },
      retryJoinOnlineRoom: () => {
        setOnlineRoomError(null);
        peerManager.setPlayerName(onlinePlayerNameRef.current || 'GHOST-01');
        peerManager.retryLastJoin();
      },
      leaveOnlineRoom: () => {
        peerManager.leaveRoom();
        voiceManager.clearRoomAndDisconnect();
        activeOnlineRoomCode = '';
        setOnlineRoom(null);
        setOnlineRoomError(null);
        setOnlineTransport({
          transportType: 'none',
          relayFallbackActive: false,
          brokerHost: '',
          hasTurn: false,
        });
        activeTeamPings = [];
        activeTeamQuickMsgs = [];
        lastProjectedPingCount = 0;
        setProjectedTeamPings([]);
        setTeamQuickMsgs([]);
        setQuickCommsOpen(false);
        clearAllRemoteOperators();
      },
      setOnlineCallsign: (name: string) => {
        peerManager.setPlayerName(name);
      },
      setLobbyReady: (ready: boolean) => {
        peerManager.setLobbyReady(ready);
      },
      setRoomLocked: (locked: boolean) => {
        peerManager.setRoomLocked(locked);
      },
      setRoomPassword: (password: string) => {
        peerManager.setRoomPassword(password);
      },
      voteOnlineRematch: (ready = true) => {
        peerManager.voteRematch(ready);
      },
      voteOnlineMap: (mapId: MapId) => {
        peerManager.voteMap(mapId);
      },
      getDiagnosticsTelemetry: () => {
        return peerManager.getLiveTelemetry();
      },
      toggleVoiceMic: () => {
        void voiceManager.toggleMicrophone();
      },
      setVoicePushToTalk: (active: boolean) => {
        void voiceManager.setPushToTalkActive(active);
      },
      setVoiceMode: (mode: VoiceMode) => {
        voiceManager.setVoiceMode(mode);
      },
      setVoiceVolume: (volume: number) => {
        voiceManager.setVolume(volume);
      },
      setVoiceChannelScope: (scope: VoiceChannelScope) => {
        voiceManager.setChannelScope(scope);
      },
      toggleMuteVoicePlayer: (playerId: string) => {
        voiceManager.toggleMutePlayer(playerId);
      },
      unlockVoiceAudio: () => {
        voiceManager.unlockAudioPlayback();
      },
      cycleSpectatorTarget: (direction: 1 | -1 = 1) => {
        cycleLocalSpectatorTarget(direction);
      },
      triggerSlideAction: () => {
        sound.unlock();
        cancelLocalMythicEmote(true);
        triggerLocalSlide();
      },
      triggerMythicEmote: () => {
        sound.unlock();
        triggerLocalMythicEmote();
      },
      triggerMythicInspect: () => {
        sound.unlock();
        triggerLocalMythicInspect();
      },
      setShowAdBillboards: (show: boolean) => {
        showAdBillboardsRef.current = show;
        const effectiveShow = show && ogFeaturesRef.current.adBillboards;
        adBillboardGroup.visible = effectiveShow;
        if (effectiveShow && adBillboardGroup.children.length === 0) {
          buildMapAdBillboards(currentMapRef.current);
        }
      },
      setLocalCosmetics: (cosmetics: OnlineSyncedCosmetics) => {
        syncLocalAkSkinVisuals();
        syncLocalSniperSkinVisuals();
        syncLocalLmgSkinVisuals();
        syncLocalShotgunSkinVisuals();
        syncLocalKatanaSkinVisuals();
        syncLocalRpgSkinVisuals();
        syncShotgunMythicStats();
        syncSniperScopeState();
        const keepEmote =
          ogFeaturesRef.current.skinsAndCollection &&
          ((localEmoteId === MYTHIC_M249_EMOTE_ID && cosmetics.m249 === MYTHIC_M249_ID) ||
            (localEmoteId === MYTHIC_SHOTGUN_EMOTE_ID && cosmetics.sg === MYTHIC_SHOTGUN_ID));
        if (!keepEmote) {
          cancelLocalMythicEmote(true);
        }
        peerManager.setLocalCosmetics(ogFeaturesRef.current.skinsAndCollection ? cosmetics : {});
      },
      setOgMode: (enabled: boolean) => {
        peerManager.setOgMode(enabled);
        const effFeatures = resolveEffectiveFeatures(enabled, OG_FEATURE_FLAGS);
        ogFeaturesRef.current = effFeatures;
        isOgModeRef.current = enabled;
        syncLocalAkSkinVisuals();
        syncLocalSniperSkinVisuals();
        syncLocalLmgSkinVisuals();
        syncLocalShotgunSkinVisuals();
        syncLocalKatanaSkinVisuals();
        syncLocalRpgSkinVisuals();
        syncShotgunMythicStats();
        syncSniperScopeState();
        if (!effFeatures.skinsAndCollection) {
          cancelLocalMythicEmote(true);
        }
        const effectiveBillboards = effFeatures.adBillboards && showAdBillboardsRef.current;
        adBillboardGroup.visible = effectiveBillboards;
        if (effectiveBillboards && adBillboardGroup.children.length === 0) {
          buildMapAdBillboards(currentMapRef.current);
        }
        peerManager.setLocalCosmetics(
          effFeatures.skinsAndCollection
            ? toOnlineSyncedCosmetics(getGameplayEquipped())
            : {}
        );
      },
      playSpinTick: (pitchScale = 1) => {
        sound.unlock();
        sound.playSpinTick(pitchScale);
      },
      playSpinReveal: (rarity: CosmeticItem['rarity']) => {
        sound.unlock();
        sound.playSpinReveal(rarity);
      },
      playAKShot: () => {
        sound.unlock();
        sound.playWeaponShotById('ak47');
      },
      playInfernoKill: (headshot: boolean) => {
        sound.unlock();
        sound.playInfernoKill(headshot);
      },
      playVoidShot: () => {
        sound.unlock();
        sound.playVoidPiercerShot();
      },
      playVoidKill: (headshot: boolean) => {
        sound.unlock();
        sound.playVoidPiercerKill(headshot);
      },
      playVoidScopeToggle: (entering: boolean) => {
        sound.unlock();
        sound.playVoidScopeToggle(entering);
      },
      playTempestShot: (heat01: number) => {
        sound.unlock();
        sound.playWeaponShotById('lmg');
        sound.playTempestShot(heat01);
      },
      playTempestKill: (headshot: boolean) => {
        sound.unlock();
        sound.playTempestKill(headshot);
      },
      playTempestReloadPhase: (phase: 'open' | 'swap' | 'close' | 'charge') => {
        sound.unlock();
        sound.playTempestReloadPhase(phase);
      },
      playTempestInspect: () => {
        sound.unlock();
        sound.playTempestInspect();
      },
      playTempestEmote: () => {
        sound.unlock();
        sound.playTempestEmote();
      },
      playEclipseShot: () => {
        sound.unlock();
        sound.playWeaponShotById('shotgun');
        sound.playEclipseShot();
      },
      playEclipseKill: (headshot: boolean) => {
        sound.unlock();
        sound.playEclipseKill(headshot);
      },
      playEclipseReloadPhase: (phase: 'shell' | 'pump') => {
        sound.unlock();
        sound.playEclipseReloadPhase(phase);
      },
      playEclipseSightToggle: (entering: boolean) => {
        sound.unlock();
        sound.playEclipseSightToggle(entering);
      },
      playEclipseInspect: () => {
        sound.unlock();
        sound.playEclipseInspect();
      },
      playEclipseEmote: () => {
        sound.unlock();
        sound.playEclipseEmote();
      },
      playSakuraSlash: () => {
        sound.unlock();
        sound.playSakuraKatanaSlash();
      },
      playSakuraKill: (headshot: boolean) => {
        sound.unlock();
        sound.playSakuraKatanaKill(headshot);
      },
      playNovaRpgLaunch: () => {
        sound.unlock();
        sound.playNovaDragonLaunch();
      },
      playNovaRpgExplosion: () => {
        sound.unlock();
        sound.playNovaDragonExplosion();
      },
      playNovaRpgKill: (headshot: boolean) => {
        sound.unlock();
        sound.playNovaDragonKill(headshot);
      },
    };

    // Initial Graphics Setup
    setGfxState({ ...gfx });
    applyShadowSettings();
    applyLightingSettings();
    applyBodycamFXSettings();
    applyViewDistanceSettings();
    refreshFxBudget();
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Populate initial showcase pickups & patrolling bots for the live 3D Title Screen background
    createPickups();
    for (let i = 0; i < 4; i++) {
      spawnOneEnemy();
    }

    // Check URL query params (?autostart=1, ?mode=training, ?map=...)
    const params = new URLSearchParams(window.location.search);
    const initialMap = params.get('map');
    if (isValidMapId(initialMap)) {
      engineApiRef.current.setMap(initialMap);
    }
    if (params.get('autostart') === '1') {
      const startMode = params.get('mode') === 'training' ? 'training' : 'campaign';
      engineApiRef.current.startSession(startMode);
    }

    // =========================================================
    // MAIN LOOP WITH SOFTWARE-WEBGL GUARD & FPS LIMITER
    // =========================================================
    let frameId = 0;
    let lastRenderTime = performance.now();
    let lastLogicTime = performance.now();
    let fpsFrames = 0;
    let fpsTimer = performance.now();
    let menuCamAngle = 0;
    let radarTick = 0;
    let clockTick = 0;

    function updateRecClock() {
      if (!bodycamRecTimeEl) return;
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      bodycamRecTimeEl.textContent = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
    updateRecClock();

    let lastSceneDrawCalls = 0;
    let lastSceneTriangles = 0;

    function renderScene() {
      if (gfx.bodycamFx && renderTarget && !isSoftwareGl) {
        renderer.setRenderTarget(renderTarget);
        renderer.render(scene, camera);
        lastSceneDrawCalls = renderer.info.render.calls + 1;
        lastSceneTriangles = renderer.info.render.triangles + 2;
        renderer.setRenderTarget(null);
        renderer.render(postScene, postCam);
      } else {
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
        lastSceneDrawCalls = renderer.info.render.calls;
        lastSceneTriangles = renderer.info.render.triangles;
      }
    }

    function afterDraw(cb: (now: number) => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(() => cb(performance.now()), 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(() => cb(performance.now()), 80);
      }
    }

    let isPageHidden = typeof document !== 'undefined' && document.hidden;
    let mainLoopRunning = false;
    let staticBackdropDirty = true;
    let laserRaycastTimer = 0;
    let lastShadowSnapX = 1e9;
    let lastShadowSnapZ = 1e9;

    function publishPausedPerfSnapshot() {
      const perfMem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
      const jsHeapMb = perfMem ? Math.round((perfMem.usedJSHeapSize / (1024 * 1024)) * 10) / 10 : null;
      (window as unknown as { __bodycamPerf?: Record<string, unknown> }).__bodycamPerf = {
        fps: 0,
        frameTimeMs: 0,
        drawCalls: 0,
        triangles: 0,
        activeParticles: getTotalActiveParticles(),
        materials: 0,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        jsHeapMb,
        autoQualityStage: adaptiveQuality.stage,
        pixelRatio: renderer.getPixelRatio(),
        mapId: currentMapRef.current,
        isMobile: isMobileDevice,
        mainScenePaused: true,
      };
      if (showPerfProfilerRef.current) {
        const elFps = document.getElementById('perf-fps');
        const elFt = document.getElementById('perf-ft');
        const elCalls = document.getElementById('perf-calls');
        if (elFps) elFps.textContent = 'PAUSED';
        if (elFt) elFt.textContent = '0.0 ms';
        if (elCalls) elCalls.textContent = '0';
      }
    }

    function scheduleNextFrame() {
      if (isPageHidden) {
        mainLoopRunning = false;
        return;
      }
      mainLoopRunning = true;
      if (isSoftwareGl) {
        afterDraw(animate);
      } else {
        frameId = requestAnimationFrame(animate);
      }
    }

    function wakeRenderLoop(repaintBackdrop = false) {
      if (repaintBackdrop) staticBackdropDirty = true;
      const shouldPause = shouldPauseMainSceneRender({
        screenState: screenStateRef.current,
        anyOverlayOpen: anyMenuOverlayOpenRef.current,
        isPageHidden,
      });
      if (shouldPause && !staticBackdropDirty) {
        if (mainLoopRunning) {
          cancelAnimationFrame(frameId);
          clearTimeout(frameId);
          mainLoopRunning = false;
        }
        publishPausedPerfSnapshot();
        return;
      }
      if (!shouldPause) {
        const winPerf = (window as unknown as { __bodycamPerf?: Record<string, unknown> }).__bodycamPerf;
        if (winPerf && winPerf.mainScenePaused) {
          winPerf.mainScenePaused = false;
        }
      }
      if (!mainLoopRunning && !isPageHidden) {
        const resumeNow = performance.now();
        lastLogicTime = resumeNow;
        lastRenderTime = resumeNow;
        fpsTimer = resumeNow;
        fpsFrames = 0;
        scheduleNextFrame();
      }
    }

    // Measured FPS stored in ref during gameplay (zero per-frame/1Hz App re-renders)

    let cachedEmoteBtnEl: HTMLElement | null = null;
    let cachedEmoteCdEl: HTMLElement | null = null;
    let lastEmoteActiveUi: boolean | null = null;
    let lastEmoteOnCdUi: boolean | null = null;
    let lastEmoteCdTextUi = '';
    let cachedSlideBtnEl: HTMLElement | null = null;
    let cachedSlideCdEl: HTMLElement | null = null;
    let lastSlideActiveUi: boolean | null = null;
    let lastSlideOnCdUi: boolean | null = null;
    let lastSlideCdTextUi = '';

    function animate(now: number) {
      if (isPageHidden) {
        mainLoopRunning = false;
        return;
      }
      const shouldPause = shouldPauseMainSceneRender({
        screenState: screenStateRef.current,
        anyOverlayOpen: anyMenuOverlayOpenRef.current,
        isPageHidden,
      });
      if (shouldPause) {
        if (screenStateRef.current === 'title' && staticBackdropDirty && !anyMenuOverlayOpenRef.current) {
          staticBackdropDirty = false;
          if (effectiveUiVersionRef.current !== 'v3') {
            camera.position.set(17.5, 6.4, 14.5);
            camera.lookAt(0, 1.6, 0);
            weaponPivot.visible = false;
            laserDotMesh.visible = false;
            renderScene();
          }
        }
        mainLoopRunning = false;
        publishPausedPerfSnapshot();
        return;
      }
      const effectiveTargetFps = batterySaverRef.current
        ? gfx.targetFps > 0
          ? Math.min(45, gfx.targetFps)
          : 45
        : gfx.targetFps;
      if (!isSoftwareGl && effectiveTargetFps > 0) {
        const minInterval = 1000 / effectiveTargetFps;
        const elapsed = now - lastRenderTime;
        if (elapsed < minInterval - 1.5) {
          scheduleNextFrame();
          return;
        }
        lastRenderTime = now - (elapsed % minInterval);
      } else {
        lastRenderTime = now;
      }

      const dt = Math.min(0.05, Math.max(0.001, (now - lastLogicTime) / 1000));
      lastLogicTime = now;

      if (lastBudgetReducedMotion !== reducedMotionRef.current) {
        refreshFxBudget();
      }

      fpsFrames++;
      if (now - fpsTimer >= 420) {
        const windowMs = Math.max(100, now - fpsTimer);
        const windowSec = windowMs / 1000;
        const fps = Math.round((fpsFrames * 1000) / windowMs);
        const frameTimeMs = Math.round((windowMs / Math.max(1, fpsFrames)) * 10) / 10;
        if (fpsValueEl) {
          fpsValueEl.textContent = String(fps);
          fpsValueEl.style.color = fps >= 48 ? '#00e676' : fps >= 28 ? '#ffbe0b' : '#ff2e4c';
        }

        if (gfx.preset === 'auto' && !initialBenchmark.completed && screenStateRef.current === 'playing') {
          const prevBenchDone = initialBenchmark.completed;
          initialBenchmark = stepInitialBenchmark(initialBenchmark, fps, windowSec, true, isSoftwareGl);
          if (!prevBenchDone && initialBenchmark.completed) {
            activeAutoSubTier = initialBenchmark.chosenTier;
            syncGfxStateForPreset('auto', activeAutoSubTier);
            const desiredTexTier = resolveDesiredTexTier();
            if (desiredTexTier !== getTextureQualityTier()) {
              setTextureQualityTier(desiredTexTier);
              if (mapInitialized) {
                buildArenaMap(currentMapRef.current);
              }
            }
            setGfxState({ ...gfx });
            applyShadowSettings();
            applyLightingSettings();
            applyBodycamFXSettings();
            applyViewDistanceSettings();
            refreshFxBudget();
          }
        }

        const prevDynScale = dynamicRes.scale;
        const allowDynRes =
          autoQualityRef.current &&
          screenStateRef.current === 'playing' &&
          (gfx.preset === 'auto' ||
            gfx.preset === 'high' ||
            gfx.preset === 'ultra' ||
            gfx.preset === 'ultramax' ||
            gfx.preset === 'promax');
        dynamicRes = stepDynamicResolution(
          dynamicRes,
          fps,
          effectiveTargetFps,
          windowSec,
          allowDynRes,
          isSoftwareGl
        );

        const prevAqStage = adaptiveQuality.stage;
        adaptiveQuality = stepAdaptiveQuality(
          adaptiveQuality,
          fps,
          windowSec,
          autoQualityRef.current,
          isSoftwareGl
        );
        if (adaptiveQuality.stage !== prevAqStage || Math.abs(dynamicRes.scale - prevDynScale) >= 0.01) {
          if (adaptiveQuality.stage !== prevAqStage) {
            refreshFxBudget();
            applyShadowSettings();
            const notice = shouldEmitAutoStepDownNotice({
              prevStage: prevAqStage,
              nextStage: adaptiveQuality.stage,
              nowMs: now,
              lastNoticeMs: lastAutoStepDownNoticeMs,
            });
            lastAutoStepDownNoticeMs = notice.nextLastNoticeMs;
            if (notice.emit && notice.messageFa) {
              showCenterAlert(notice.messageFa, 2200);
            }
          }
          rebuildRenderTarget();
        }

        const perfMem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
        const jsHeapMb = perfMem ? Math.round((perfMem.usedJSHeapSize / (1024 * 1024)) * 10) / 10 : null;
        const drawCalls = lastSceneDrawCalls || renderer.info.render.calls;
        const triangles = lastSceneTriangles || renderer.info.render.triangles;
        const aqEffects = getAdaptiveQualityEffects(adaptiveQuality.stage);

        const activeParticles = getTotalActiveParticles();

        if (showPerfProfilerRef.current) {
          const uniqueMaterials = new Set<THREE.Material>();
          scene.traverse((obj) => {
            const m = (obj as THREE.Mesh).material;
            if (!m) return;
            if (Array.isArray(m)) {
              for (let k = 0; k < m.length; k++) uniqueMaterials.add(m[k]);
            } else {
              uniqueMaterials.add(m);
            }
          });
          lastKnownMaterialCount = uniqueMaterials.size;
        }
        const materialCount = lastKnownMaterialCount;
        const textureCount = renderer.info.memory.textures;
        const geometryCount = renderer.info.memory.geometries;

        (window as unknown as { __bodycamPerf?: Record<string, unknown> }).__bodycamPerf = {
          fps,
          frameTimeMs,
          drawCalls,
          triangles,
          activeParticles,
          materials: materialCount,
          geometries: geometryCount,
          textures: textureCount,
          jsHeapMb,
          autoQualityStage: adaptiveQuality.stage,
          pixelRatio: renderer.getPixelRatio() || lastEffectiveDpr,
          mapId: currentMapRef.current,
          isMobile: isMobileDevice,
        };

        if (showPerfProfilerRef.current) {
          const elFps = document.getElementById('perf-fps');
          const elFt = document.getElementById('perf-ft');
          const elCalls = document.getElementById('perf-calls');
          const elTris = document.getElementById('perf-tris');
          const elParticles = document.getElementById('perf-particles');
          const elMatsTex = document.getElementById('perf-mats-tex');
          const elMem = document.getElementById('perf-mem');
          const elPing = document.getElementById('perf-ping');
          const elAq = document.getElementById('perf-aq');
          if (elFps) {
            elFps.textContent = String(fps);
            elFps.style.color = fps >= 48 ? '#34d399' : fps >= 28 ? '#fbbf24' : '#f43f5e';
          }
          if (elFt) elFt.textContent = `${frameTimeMs.toFixed(1)} ms`;
          if (elCalls) elCalls.textContent = String(drawCalls);
          if (elTris) elTris.textContent = triangles.toLocaleString('en-US');
          if (elParticles) elParticles.textContent = String(activeParticles);
          if (elMatsTex) elMatsTex.textContent = `${materialCount}M / ${textureCount}T / ${geometryCount}G`;
          if (elMem) elMem.textContent = jsHeapMb !== null ? `${jsHeapMb.toFixed(1)} MB` : 'N/A';
          if (elPing) elPing.textContent = pingMsRef.current !== null ? `${pingMsRef.current} ms` : 'آفلاین';
          if (elAq) elAq.textContent = adaptiveQuality.stage === 0 ? 'کامل (0)' : `مرحله ${adaptiveQuality.stage} · ${aqEffects.labelFa}`;
        }

        latestMeasuredFpsRef.current = fps;
        fpsFrames = 0;
        fpsTimer = now;
      }

      // Snap directional shadow frustum to 1m grid around player so tight mobile shadow map stays crisp
      if (dirLight.castShadow && screenStateRef.current === 'playing') {
        const snapX = Math.round(player.pos.x);
        const snapZ = Math.round(player.pos.z);
        if (snapX !== lastShadowSnapX || snapZ !== lastShadowSnapZ) {
          lastShadowSnapX = snapX;
          lastShadowSnapZ = snapZ;
          dirLight.target.position.set(snapX, 0, snapZ);
          dirLight.position.set(snapX + 22, 38, snapZ + 18);
          dirLight.target.updateMatrixWorld();
        }
      }

      postUniforms.uTime.value = now * 0.001;
      damageShaderFlash = Math.max(0, damageShaderFlash - dt * 2.5);
      postUniforms.uDamage.value = damageShaderFlash;

      clockTick += dt;
      if (clockTick >= 1.0) {
        clockTick = 0;
        updateRecClock();
      }

      if (screenStateRef.current !== 'playing') {
        mainLoopRunning = false;
        publishPausedPerfSnapshot();
        return;
      }
      weaponPivot.visible = true;

      // 1. Timers & Buffs
      const prevBuffState = adrenalineTimer > 0 || overdriveTimer > 0 || adrenalineCooldown > 0;
      if (adrenalineTimer > 0) adrenalineTimer = Math.max(0, adrenalineTimer - dt);
      if (overdriveTimer > 0) overdriveTimer = Math.max(0, overdriveTimer - dt);
      if (adrenalineCooldown > 0) adrenalineCooldown = Math.max(0, adrenalineCooldown - dt);
      if (prevBuffState) updateBuffHUD();

      // 2. Spawner & Authoritative Call of Duty Round Mode Tick
      if (playModeRef.current !== 'training') {
        peerManager.tickAuthoritativeRound(dt);
        if (peerManager.getRole() === 'host') {
          peerManager.tickOnlineBots(dt, {
            canMoveTo: (x: number, z: number) => isPositionFree(x, z, 0.55),
            hasLineOfSight: (from: { x: number; y: number; z: number }, to: { x: number; y: number; z: number }) =>
              hasLineOfSight3D(from.x, from.y, from.z, to.x, to.y, to.z, wallColliders),
          });
        }
      }
      const activeRoom = peerManager.getRoom();
      const isRoundMatch = playModeRef.current !== 'training' && Boolean(activeRoom && isRoundBasedMode(activeRoom.mode));

      const aliveEnemies = countAliveEnemies();
      if (playModeRef.current === 'training') {
        const cfg = trainingConfigRef.current;
        if (cfg.autoRespawnBots && aliveEnemies < cfg.spawnCount) {
          spawnIntervalTimer -= dt;
          if (spawnIntervalTimer <= 0) {
            spawnOneEnemy();
            spawnIntervalTimer = 1.2;
            updateHUD();
          }
        }
      } else if (isRoundMatch) {
        if (activeRoom?.roundPhase === 'playing') {
          const myTeam = peerManager.getLocalTeam();
          const hasOpposingHuman = Boolean(activeRoom.players.some((p) => p.team !== myTeam));
          if (!hasOpposingHuman) {
            if (enemiesToSpawn > 0) {
              spawnIntervalTimer -= dt;
              if (spawnIntervalTimer <= 0 && aliveEnemies < 6) {
                spawnOneEnemy();
                enemiesToSpawn--;
                spawnIntervalTimer = 0.85;
                updateHUD();
              }
            } else if (aliveEnemies === 0 && peerManager.getRole() === 'host') {
              // Solo/co-op round fallback (no opposing humans): clearing bots wins the round
              peerManager.recordTeamRoundWin(
                myTeam,
                `راند ${activeRoom.currentRound ?? 1} با حذف کامل تیم حریف پیروز شد!`
              );
              updateHUD();
            }
          }
        }
      } else if (quickTutorialRef.current?.active && !activeRoom) {
        // Static fixed-target tutorial: keep wave bots suppressed and animate target hit recoil
        enemiesToSpawn = 0;
        for (let ti = 0; ti < quickTutorialTargets.length; ti++) {
          const t = quickTutorialTargets[ti];
          if (t.recoil > 0.001) {
            t.recoil *= Math.max(0, 1 - 10 * dt);
            t.board.rotation.x = -t.recoil;
          } else if (t.board.rotation.x !== 0) {
            t.recoil = 0;
            t.board.rotation.x = 0;
          }
        }
      } else {
        if (enemiesToSpawn > 0) {
          spawnIntervalTimer -= dt;
          if (spawnIntervalTimer <= 0 && aliveEnemies < 7) {
            spawnOneEnemy();
            enemiesToSpawn--;
            spawnIntervalTimer = Math.max(0.75, 2.1 - wave * 0.14);
            updateHUD();
          }
        } else if (aliveEnemies === 0) {
          wavePauseTimer += dt;
          if (wavePauseTimer === dt) {
            player.hp = Math.min(player.maxHp, player.hp + 25);
            showCenterAlert(`موج ${wave} پاکسازی شد! +۲۵ سلامت`, 2100);
            updateHUD();
          }
          if (wavePauseTimer >= 2.5) {
            wavePauseTimer = 0;
            startWave(wave + 1);
          }
        }
      }

      // 3. Player Movement & Bodycam Physics
      const w = WEAPONS[currentWeaponIdx];
      const cheats = cheatConfigRef.current;
      const roundInputLocked = isRoundInputLocked(activeRoom) || isLocalSpectating;
      if (fireCooldown > 0) fireCooldown -= dt;
      if (roundInputLocked) {
        isFiringInput = false;
      }
      if (isFiringInput && w.auto && fireCooldown <= 0 && !isReloading && !roundInputLocked) fireCurrentWeapon();

      const isHoldingTempestMythic =
        w.id === 'lmg' && Boolean(tempestLmgModel?.group.visible);
      const isHoldingEclipseMythic =
        w.id === 'shotgun' && Boolean(eclipseShotgunModel?.group.visible);
      let mythicReloadTilt: {
        weaponPitchOffset: number;
        weaponRollOffset: number;
        weaponDropOffset: number;
      } | null = null;

      if (isReloading) {
        reloadProgress += dt / w.reloadTime;
        if (reloadBarFill) reloadBarFill.style.width = Math.min(100, reloadProgress * 100) + '%';
        if (isHoldingTempestMythic && tempestLmgModel) {
          const tRel = tempestLmgModel.applyCinematicReload(reloadProgress);
          mythicReloadTilt = tRel;
          if (tRel.phase !== lastTempestReloadPhase) {
            lastTempestReloadPhase = tRel.phase;
            if (tRel.phase === 'open') sound.playTempestReloadPhase('open');
            else if (tRel.phase === 'swap') sound.playTempestReloadPhase('swap');
            else if (tRel.phase === 'close') sound.playTempestReloadPhase('close');
            else if (tRel.phase === 'charge') sound.playTempestReloadPhase('charge');
          }
        } else if (isHoldingEclipseMythic && eclipseShotgunModel) {
          const eRel = eclipseShotgunModel.applyCinematicReload(reloadProgress);
          mythicReloadTilt = eRel;
          if (eRel.phase !== lastEclipseReloadPhase) {
            if (eRel.phase === 'shell_1' || eRel.phase === 'shell_2' || eRel.phase === 'shell_3') {
              sound.playEclipseReloadPhase('shell');
            } else if (eRel.phase === 'pump') {
              sound.playEclipseReloadPhase('pump');
            }
            lastEclipseReloadPhase = eRel.phase;
          }
        } else if (w.model.mag) {
          const liveRelPose = computeWeaponReloadPose(reloadProgress, w.id, isADS);
          w.model.mag.position.y = liveRelPose.magOffsetY;
          w.model.mag.position.z = liveRelPose.magOffsetZ;
          w.model.mag.visible = liveRelPose.magVisible;
          if (w.model.bolt && typeof w.model.boltRestZ === 'number') {
            w.model.bolt.position.z =
              w.model.boltRestZ + liveRelPose.boltPull01 * (w.model.boltTravelZ ?? 0.07);
          }
          if (w.id === 'shotgun' && w.model.pump && typeof w.model.pumpRestZ === 'number') {
            w.model.pump.position.z = w.model.pumpRestZ + liveRelPose.boltPull01 * 0.088;
          }
        }
        if (reloadProgress >= 1) {
          isReloading = false;
          lastTempestReloadPhase = 'idle';
          lastEclipseReloadPhase = 'idle';
          lastEclipseReloadShellIndex = -1;
          if (isHoldingTempestMythic) {
            tempestLmgModel?.applyCinematicReload(0);
          }
          if (isHoldingEclipseMythic) {
            eclipseShotgunModel?.applyCinematicReload(0);
          }
          if (reloadIndicator) reloadIndicator.style.display = 'none';
          if (w.model.mag) {
            w.model.mag.position.y = 0;
            w.model.mag.position.z = 0;
            w.model.mag.visible = w.id !== 'shotgun';
          }
          if (w.model.bolt && typeof w.model.boltRestZ === 'number') {
            w.model.bolt.position.z = w.model.boltRestZ;
          }
          if (w.id === 'shotgun' && w.model.pump && typeof w.model.pumpRestZ === 'number') {
            w.model.pump.position.z = w.model.pumpRestZ;
          }
          if (
            cheats.infiniteAmmo ||
            (playModeRef.current === 'training' && trainingConfigRef.current.infiniteAmmo)
          ) {
            w.mag = w.magSize;
          } else {
            const take = Math.min(w.magSize - w.mag, w.reserve);
            w.mag += take;
            w.reserve -= take;
          }
          syncSniperScopeState();
          updateHUD();
        }
      }

      let inX = roundInputLocked ? 0 : joyMoveX;
      let inZ = roundInputLocked ? 0 : joyMoveY;
      if (!roundInputLocked) {
        if (keys['KeyW'] || keys['ArrowUp']) inZ -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) inZ += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) inX -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) inX += 1;
      }
      const inLen = Math.hypot(inX, inZ);
      if (inLen > 1) {
        inX /= inLen;
        inZ /= inLen;
      }

      const isMoving = !roundInputLocked && inLen > 0.08;
      if (isMoving && localEmoteActive) {
        cancelLocalMythicEmote(true);
      }
      if (localEmoteCooldownSec > 0) {
        localEmoteCooldownSec = Math.max(0, localEmoteCooldownSec - dt);
      }
      if (localEmoteActive) {
        localEmoteElapsedSec += dt;
        const activeEmoteDur =
          localEmoteId === MYTHIC_SHOTGUN_EMOTE_ID
            ? MYTHIC_SHOTGUN_PERKS.emoteDurationSec
            : MYTHIC_M249_PERKS.emoteDurationSec;
        if (localEmoteElapsedSec >= activeEmoteDur) {
          cancelLocalMythicEmote(true);
        }
      }
      if (localInspectProgress >= 0) {
        localInspectProgress += dt / 2.4;
        if (
          localInspectProgress >= 1 ||
          (!isHoldingTempestMythic && !isHoldingEclipseMythic) ||
          isADS ||
          isReloading
        ) {
          localInspectProgress = -1;
        }
      }

      // Direct DOM update for Emote button cooldown (cached refs, zero unchanged writes)
      if (!cachedEmoteBtnEl || !cachedEmoteBtnEl.isConnected) {
        cachedEmoteBtnEl = document.getElementById('btn-emote');
        cachedEmoteCdEl = document.getElementById('emote-cd-text');
        lastEmoteActiveUi = null;
        lastEmoteOnCdUi = null;
        lastEmoteCdTextUi = '';
      }
      if (cachedEmoteBtnEl) {
        const emOnCd = !localEmoteActive && localEmoteCooldownSec > 0.05;
        if (lastEmoteActiveUi !== localEmoteActive) {
          lastEmoteActiveUi = localEmoteActive;
          cachedEmoteBtnEl.classList.toggle('is-emoting', localEmoteActive);
        }
        if (lastEmoteOnCdUi !== emOnCd) {
          lastEmoteOnCdUi = emOnCd;
          cachedEmoteBtnEl.classList.toggle('is-cooldown', emOnCd);
        }
        if (cachedEmoteCdEl) {
          const nextEmTxt = emOnCd ? localEmoteCooldownSec.toFixed(1) : '';
          if (nextEmTxt !== lastEmoteCdTextUi) {
            lastEmoteCdTextUi = nextEmTxt;
            cachedEmoteCdEl.textContent = nextEmTxt;
          }
        }
      }

      const mobileSprint = !roundInputLocked && isTouchDevice && joyMoveY < -0.78;
      const sprinting =
        !roundInputLocked &&
        (((keys['ShiftLeft'] || keys['ShiftRight']) && inZ < -0.2) || mobileSprint) &&
        !isADS &&
        !isFiringInput;

      let moveSpeed =
        player.baseSpeed *
        w.speedMult *
        (adrenalineTimer > 0 ? 1.35 : 1.0) *
        (cheats.superSpeed ? 1.65 : 1.0);
      if (isADS) moveSpeed *= 0.64;
      else if (sprinting) moveSpeed *= 1.28;

      const sinY = Math.sin(player.yaw);
      const cosY = Math.cos(player.yaw);
      const moveWorldX = inX * cosY + inZ * sinY;
      const moveWorldZ = -inX * sinY + inZ * cosY;

      // Step Call of Duty-style Tactical Slide (Alpha) state machine (zero overhead when disabled)
      const roomNowForSlide = peerManager.getRoom();
      slideState = stepSlideState(slideState, dt, {
        featureEnabled: ogFeaturesRef.current.tacticalSlide && slideAlphaEnabledRef.current,
        roomSlideAllowed: roomNowForSlide?.slideAllowed !== false,
        isDead: player.hp <= 0 || isLocalSpectating,
        isFrozen: roundInputLocked,
      });

      // Update mobile slide button cooldown readout (cached DOM refs, zero unchanged writes)
      if (!cachedSlideBtnEl || !cachedSlideBtnEl.isConnected) {
        cachedSlideBtnEl = document.getElementById('btn-slide');
        cachedSlideCdEl = document.getElementById('slide-cd-text');
        lastSlideActiveUi = null;
        lastSlideOnCdUi = null;
        lastSlideCdTextUi = '';
      }
      if (cachedSlideBtnEl) {
        const slOnCd = !slideState.active && slideState.cooldownRemainingSec > 0.05;
        if (lastSlideActiveUi !== slideState.active) {
          lastSlideActiveUi = slideState.active;
          cachedSlideBtnEl.classList.toggle('active-slide', slideState.active);
        }
        if (lastSlideOnCdUi !== slOnCd) {
          lastSlideOnCdUi = slOnCd;
          cachedSlideBtnEl.classList.toggle('is-cooldown', slOnCd);
        }
        if (cachedSlideCdEl) {
          const nextSlTxt = slOnCd ? slideState.cooldownRemainingSec.toFixed(1) : '';
          if (nextSlTxt !== lastSlideCdTextUi) {
            lastSlideCdTextUi = nextSlTxt;
            cachedSlideCdEl.textContent = nextSlTxt;
          }
        }
      }

      const accel = player.onGround ? 18 : 7;
      if (roundInputLocked) {
        player.vel.x = 0;
        player.vel.z = 0;
      } else if (slideState.active) {
        // Directional momentum glide with smooth friction decay; allows minor strafe steering while sliding
        const steerX = moveWorldX * 1.4;
        const steerZ = moveWorldZ * 1.4;
        player.vel.x = slideState.dirX * slideState.currentSpeed + steerX;
        player.vel.z = slideState.dirZ * slideState.currentSpeed + steerZ;
      } else {
        player.vel.x += (moveWorldX * moveSpeed - player.vel.x) * Math.min(1, accel * dt);
        player.vel.z += (moveWorldZ * moveSpeed - player.vel.z) * Math.min(1, accel * dt);
      }
      player.vel.y -= 21 * dt;

      const prevX = player.pos.x;
      const prevZ = player.pos.z;
      const wasInAir = !player.onGround;
      const col = resolveCircleAABB(
        player.pos.x + player.vel.x * dt,
        player.pos.z + player.vel.z * dt,
        player.radius,
        player.pos.y,
        wallColliders,
        activeArenaHalf
      );
      player.pos.x = col.x;
      player.pos.z = col.z;
      player.pos.y += player.vel.y * dt;

      const stepMoved = Math.hypot(player.pos.x - prevX, player.pos.z - prevZ);
      if (stepMoved > 0.02) {
        advanceTutorialFromGame('movement', stepMoved * (sprinting || slideState.active ? 1.5 : 1.0), sound);
        advanceQuickTutorialStep('move', stepMoved);
      }

      if (player.pos.y <= col.floorY) {
        if (wasInAir && player.vel.y < -3) camLandDip = Math.min(0.14, Math.abs(player.vel.y) * 0.015);
        player.pos.y = col.floorY;
        player.vel.y = 0;
        player.onGround = true;
      } else {
        player.onGround = false;
      }

      // Smooth camera eye-height transition for Tactical Slide (1.68m -> 0.92m)
      currentEyeHeight += (slideState.eyeHeight - currentEyeHeight) * Math.min(1, 14 * dt);
      player.height = currentEyeHeight;

      // 4. Warzone-Style Corner Lean / Wall Mount + Bot Visibility Check + Line-of-Sight Aim Assist (Bots + Online Opponents)
      const prevCornerMounted = isCornerMounted;
      const targetLean =
        sprinting || slideState.active || !ogFeaturesRef.current.autoCornerLean ? 0 : detectAutoCornerLean(inX);
      currentLean += (targetLean - currentLean) * Math.min(1, 18 * dt);
      isCornerMounted = Math.abs(currentLean) > 0.1;
      if (prevCornerMounted !== isCornerMounted) {
        updateBuffHUD();
      }

      // Bot AI Visibility Check: update each bot's line-of-sight visibility before calculating aim-assist
      for (let i = 0; i < enemies.length; i++) {
        const bot = enemies[i];
        if (!bot.alive) {
          bot.visibleToPlayer = false;
          continue;
        }
        const targetAimY = bot.root.position.y + (cheats.aimAssistHeadshot ? 1.72 : 1.2) * bot.cfg.scale;
        bot.visibleToPlayer = hasLineOfSightToPoint(bot.root.position.x, targetAimY, bot.root.position.z);
      }

      // Soft gameplay Aim Assist (0–100, default 70; +15% capped at 100% ONLY with Mythic M249 or Mythic SPAS-12 when Host allows)
      const mythicPerksNow = isLocalMythicPerksEnabledNow();
      const shotgunMythicPerksNow = isLocalShotgunMythicPerksEnabledNow();
      const effectiveSoftAssist = computeEffectiveAimAssistWithMythicPerk({
        baseAimAssistStrength: ogFeaturesRef.current.softAimAssist ? aimAssistStrengthRef.current : 0,
        roomAimAssistAllowed: roomNowForSlide?.aimAssistAllowed,
        mythicPerksActive: mythicPerksNow || shotgunMythicPerksNow,
      });
      if (effectiveSoftAssist > 0 && !isLocalSpectating && !roundInputLocked && (isADS || isFiringInput)) {
        const softTargets = collectAimAssistTargets(false);
        if (softTargets.length > 0) {
          const softAssist = computeSoftAimAssistAngles(
            camera.position.x,
            camera.position.y,
            camera.position.z,
            player.yaw,
            player.pitch,
            softTargets,
            effectiveSoftAssist,
            dt,
            isADS || isFiringInput,
            wallColliders
          );
          if (softAssist.lockedTarget) {
            player.yaw = softAssist.nextYaw;
            player.pitch = softAssist.nextPitch;
          }
        }
      } else if (
        roomNowForSlide?.aimAssistAllowed !== false &&
        cheats.aimAssistEnabled &&
        cheats.aimAssistStrength > 0 &&
        (isADS || isFiringInput)
      ) {
        const targets = collectAimAssistTargets(cheats.aimAssistHeadshot);
        if (targets.length > 0) {
          const assist = computeAimAssistAngles(
            camera.position.x,
            camera.position.y,
            camera.position.z,
            player.yaw,
            player.pitch,
            targets,
            cheats.aimAssistStrength,
            dt,
            isADS || isFiringInput,
            wallColliders
          );
          if (assist.lockedTarget) {
            player.yaw = assist.nextYaw;
            player.pitch = assist.nextPitch;
          }
        }
      }

      camTargetRecoilPitch *= Math.exp(-9 * dt);
      camTargetRecoilYaw *= Math.exp(-9 * dt);
      camRecoilPitch += (camTargetRecoilPitch - camRecoilPitch) * Math.min(1, 24 * dt);
      camRecoilYaw += (camTargetRecoilYaw - camRecoilYaw) * Math.min(1, 24 * dt);

      if (screenShake > 0) screenShake = Math.max(0, screenShake - dt * 0.08);
      camLandDip *= Math.exp(-12 * dt);

      if (isMoving && player.onGround && !slideState.active) walkBobTimer += dt * (sprinting ? 13.5 : 9.4);
      else walkBobTimer += dt * 1.4;

      const camMotionScale = getEffectiveCameraMotionScale(
        cameraMotionIntensityRef.current,
        reducedMotionRef.current
      );
      const camMotion = computeCameraMotionOffsets({
        intensityScale: camMotionScale,
        walkBobTimer,
        isMoving,
        onGround: player.onGround,
        sprinting,
        sliding: slideState.active,
        isADS,
        strafeInputX: inX,
        landDip: camLandDip,
        screenShake,
      });
      const targetCamRoll = camMotion.rollZ - currentLean * 0.28;
      camRoll += (targetCamRoll - camRoll) * Math.min(1, 16 * dt);

      let leanOffsetX = Math.cos(player.yaw) * currentLean * 0.68;
      let leanOffsetZ = -Math.sin(player.yaw) * currentLean * 0.68;
      if (!isPositionFree(player.pos.x + leanOffsetX, player.pos.z + leanOffsetZ, 0.22)) {
        leanOffsetX *= 0.35;
        leanOffsetZ *= 0.35;
      }

      if (isLocalSpectating) {
        weaponPivot.visible = false;
        laserDotMesh.visible = false;
        const specOp = spectateTargetId ? remoteOperators.get(spectateTargetId) : undefined;
        if (specOp && specOp.root.visible) {
          const opYaw = specOp.root.rotation.y;
          const rawCamX = specOp.root.position.x + Math.sin(opYaw) * 3.1;
          const rawCamZ = specOp.root.position.z + Math.cos(opYaw) * 3.1;
          const safeCam = resolveCircleAABB(rawCamX, rawCamZ, 0.45, 1.8, wallColliders, activeArenaHalf);
          const desiredY = specOp.root.position.y + 2.2;
          if (!spectateCamInitialized) {
            spectateCamPos.set(safeCam.x, desiredY, safeCam.z);
            spectateCamInitialized = true;
          } else {
            spectateCamPos.x += (safeCam.x - spectateCamPos.x) * Math.min(1, 10 * dt);
            spectateCamPos.y += (desiredY - spectateCamPos.y) * Math.min(1, 10 * dt);
            spectateCamPos.z += (safeCam.z - spectateCamPos.z) * Math.min(1, 10 * dt);
          }
          spectateLookAt.set(
            specOp.root.position.x - Math.sin(opYaw) * 5.5,
            specOp.root.position.y + 1.5,
            specOp.root.position.z - Math.cos(opYaw) * 5.5
          );
          camera.position.copy(spectateCamPos);
          camera.lookAt(spectateLookAt);
        } else {
          // Elevated overview so the screen never turns black while waiting for next round
          camera.position.set(player.pos.x, player.pos.y + 3.6, player.pos.z);
          camera.lookAt(0, 1.2, 0);
        }
      } else {
        const swayWorldX = Math.cos(player.yaw) * camMotion.offsetX;
        const swayWorldZ = -Math.sin(player.yaw) * camMotion.offsetX;
        camera.position.set(
          player.pos.x + leanOffsetX + swayWorldX,
          player.pos.y + currentEyeHeight + camMotion.offsetY,
          player.pos.z + leanOffsetZ + swayWorldZ
        );
        camera.rotation.y = player.yaw + camRecoilYaw + (Math.random() - 0.5) * camMotion.shakeAmp;
        camera.rotation.x = Math.max(
          -1.48,
          Math.min(1.48, player.pitch + camRecoilPitch + camMotion.pitchX + (Math.random() - 0.5) * camMotion.shakeAmp)
        );
        camera.rotation.z = camRoll;
      }

      const targetFov = isLocalSpectating
        ? baseFov + 4
        : isADS
          ? baseFov + w.adsFovDelta
          : slideState.active
            ? baseFov + 6
            : sprinting
              ? baseFov + 4
              : baseFov;
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov += (targetFov - camera.fov) * Math.min(1, 13 * dt);
        camera.updateProjectionMatrix();
      }

      deadzoneLagX *= Math.exp(-9 * dt);
      deadzoneLagY *= Math.exp(-9 * dt);

      const weaponMotionFactor =
        (reducedMotionRef.current ? 0.35 : 1.0) *
        (isADS && !isReloading ? getMythicAdsSwayMultiplier(mythicPerksNow) : 1.0);
      const adsSmoothMult = getMythicAdsSmoothMultiplier(mythicPerksNow);
      const effectiveAdsCantRoll =
        isHoldingEclipseMythic || isHoldingTempestMythic ? 0 : w.adsCantRoll;
      const fpKin = stepFirstPersonWeaponKinematics(fpWeaponAnimState, {
        dt,
        isMoving,
        onGround: player.onGround,
        sprinting,
        isADS,
        isReloading,
        isMelee: w.isMelee,
        walkBobTimer,
        deadzoneLagX,
        deadzoneLagY,
        currentLean,
        adsCantRoll: effectiveAdsCantRoll,
        weaponMotionFactor,
        adsSmoothMult,
      });

      const effectiveAdsPos = isHoldingEclipseMythic
        ? _eclipseAdsPos
        : isHoldingTempestMythic
          ? _tempestAdsPos
          : w.adsPos;
      // Smoothly blend hip -> ADS -> sprint using damped weights (zero snaps, auto-pulls out of ADS during reload)
      _fxTmpV1
        .copy(w.hipPos)
        .lerp(effectiveAdsPos, fpKin.adsBlend)
        .lerp(_sprintTargetPos, fpKin.sprintBlend);
      weaponPivot.position.copy(_fxTmpV1);
      weaponSwayGroup.position.set(
        deadzoneLagX * 0.55 * weaponMotionFactor * (1 - fpKin.adsBlend * 0.72) + fpKin.bobX + currentLean * 0.048,
        deadzoneLagY * 0.55 * weaponMotionFactor * (1 - fpKin.adsBlend * 0.72) - fpKin.bobY,
        0
      );
      weaponSwayGroup.rotation.set(fpKin.swayRotX, fpKin.swayRotY, fpKin.swayRotZ);

      const wAnimProfile = getWeaponAnimProfile(w.id);
      recoilPos.multiplyScalar(Math.exp(-wAnimProfile.posDamp * dt));
      recoilRot.multiplyScalar(Math.exp(-wAnimProfile.rotDamp * dt));
      if (switchAnim > 0) switchAnim = Math.max(0, switchAnim - dt * 5.2);

      const switchPose = computeWeaponSwitchPose(switchAnim);
      const mythicDrawPose =
        switchAnim > 0.001
          ? isHoldingTempestMythic
            ? computeTempestDrawPose(switchAnim)
            : isHoldingEclipseMythic
              ? computeEclipseDrawPose(switchAnim)
              : null
          : null;
      const reloadPose =
        isReloading && !isHoldingTempestMythic && !isHoldingEclipseMythic
          ? computeWeaponReloadPose(reloadProgress, w.id, isADS)
          : null;
      const inspectPose =
        localInspectProgress >= 0
          ? isHoldingTempestMythic
            ? computeTempestInspectPose(localInspectProgress)
            : isHoldingEclipseMythic
              ? computeEclipseInspectPose(localInspectProgress)
              : null
          : null;
      const emotePose = localEmoteActive
        ? localEmoteId === MYTHIC_SHOTGUN_EMOTE_ID
          ? computeEclipseEmoteViewPose(localEmoteElapsedSec / MYTHIC_SHOTGUN_PERKS.emoteDurationSec)
          : computeTempestEmoteViewPose(localEmoteElapsedSec / MYTHIC_M249_PERKS.emoteDurationSec)
        : null;

      weaponRecoilGroup.position.set(
        recoilPos.x +
          (mythicDrawPose ? mythicDrawPose.offsetX : 0) +
          (inspectPose ? inspectPose.offsetX : 0) +
          (emotePose ? emotePose.offsetX : 0),
        recoilPos.y +
          (mythicDrawPose ? mythicDrawPose.offsetY : switchPose.dropY) +
          (mythicReloadTilt ? mythicReloadTilt.weaponDropOffset : reloadPose ? reloadPose.weaponDropY : 0) +
          (inspectPose ? inspectPose.offsetY : 0) +
          (emotePose ? emotePose.offsetY : 0),
        recoilPos.z +
          (mythicDrawPose ? mythicDrawPose.offsetZ : 0) +
          (reloadPose ? reloadPose.weaponPosZ : 0) +
          (inspectPose ? inspectPose.offsetZ : 0) +
          (emotePose ? emotePose.offsetZ : 0)
      );
      weaponRecoilGroup.rotation.set(
        recoilRot.x +
          (mythicDrawPose ? mythicDrawPose.pitchX : switchPose.pitchX) +
          (mythicReloadTilt ? mythicReloadTilt.weaponPitchOffset : reloadPose ? reloadPose.weaponPitchX : 0) +
          (inspectPose ? inspectPose.pitchX : 0) +
          (emotePose ? emotePose.pitchX : 0),
        recoilRot.y +
          (mythicDrawPose ? mythicDrawPose.yawY : 0) +
          (inspectPose ? inspectPose.yawY : 0) +
          (emotePose ? emotePose.yawY : 0),
        recoilRot.z +
          (mythicDrawPose ? mythicDrawPose.rollZ : switchPose.rollZ) +
          (mythicReloadTilt ? mythicReloadTilt.weaponRollOffset : reloadPose ? reloadPose.weaponRollZ : 0) +
          (inspectPose ? inspectPose.rollZ : 0) +
          (emotePose ? emotePose.rollZ : 0)
      );

      // Per-weapon slide, bolt carrier & shotgun pump kinematics (zero cross-weapon interference!)
      if (pistolModel.slide && typeof pistolModel.slideRestZ === 'number') {
        pistolModel.slide.position.z = pistolModel.slideRestZ + fpKin.pistolSlideKick;
      }
      if (deagleModel.slide && typeof deagleModel.slideRestZ === 'number') {
        deagleModel.slide.position.z = deagleModel.slideRestZ + fpKin.deagleSlideKick;
      }
      if (!isReloading && w.model.bolt && typeof w.model.boltRestZ === 'number') {
        w.model.bolt.position.z =
          w.model.boltRestZ + fpKin.boltKick01 * (w.model.boltTravelZ ?? 0.068);
      }
      if (shotgunPumpKick > 0 && !isReloading) {
        shotgunPumpKick = Math.max(0, shotgunPumpKick - dt * 3.2);
        if (shotgunModel.pump) {
          const pumpRestZ = shotgunModel.pumpRestZ ?? -0.28;
          shotgunModel.pump.position.z = pumpRestZ + Math.sin(shotgunPumpKick * Math.PI) * 0.092;
        }
      }

      if (katanaModel.bladePivot) {
        if (katanaSlashTimer > 0) {
          katanaSlashTimer = Math.max(0, katanaSlashTimer - dt);
          const kPose = computeKatanaSlashPose(1 - katanaSlashTimer / 0.34, katanaSlashDir);
          katanaModel.bladePivot.rotation.set(kPose.rotX, kPose.rotY, kPose.rotZ);
          katanaModel.bladePivot.position.set(kPose.posX, kPose.posY, kPose.posZ);
        } else {
          katanaModel.bladePivot.rotation.set(-0.48, 0.25, 0.32);
          katanaModel.bladePivot.position.set(0, 0, 0);
        }
      }

      if (muzzleFlashTimer > 0) {
        muzzleFlashTimer -= dt;
        if (muzzleFlashTimer <= 0) {
          muzzleFlashGroup.visible = false;
          muzzlePointLight.intensity = 0;
        }
      }
      const infernoFxCfg = getInfernoFxConfig();
      if (w.id === 'ak47' && infernoAkModel?.group.visible) {
        infernoAkModel.updateAnimation(dt, now * 0.001, !infernoFxCfg.disabled);
      }
      if (w.id === 'sniper' && voidSniperModel?.group.visible) {
        voidSniperModel.updateAnimation(dt, now * 0.001, !infernoFxCfg.disabled);
      }
      if (w.id === 'lmg' && tempestLmgModel?.group.visible) {
        tempestLmgModel.updateAnimation(dt, now * 0.001, !infernoFxCfg.disabled);
      }
      if (w.id === 'shotgun' && eclipseShotgunModel?.group.visible) {
        eclipseShotgunModel.updateAnimation(dt, now * 0.001, !infernoFxCfg.disabled);
      }
      if (w.id === 'katana' && sakuraKatanaModel?.group.visible) {
        sakuraKatanaModel.updateAnimation(dt, now * 0.001, !infernoFxCfg.disabled && !reducedMotionRef.current);
      }
      if (w.id === 'rpg' && novaDragonRpgModel?.group.visible) {
        novaDragonRpgModel.updateAnimation(dt, now * 0.001, !infernoFxCfg.disabled && !reducedMotionRef.current);
      }
      infernoVfxPool.update(dt);
      voidVfxPool.update(dt);
      tempestVfxPool.update(dt);
      eclipseVfxPool.update(dt);
      sakuraVfxPool.update(dt);
      novaDragonVfxPool.update(dt);
      crosshairBloom = Math.max(0, crosshairBloom - dt * 0.14);
      updateCrosshairVisual();

      // Throttle laser dot raycast to ~12.5 Hz & skip during ADS/sprint/reload to save CPU every frame
      if (!w.isMelee && !sprinting && !isReloading && !isADS) {
        laserRaycastTimer += dt;
        if (laserRaycastTimer >= 0.08) {
          laserRaycastTimer = 0;
          _laserDir.set(0, 0, -1).applyQuaternion(camera.quaternion);
          shootRaycaster.set(camera.position, _laserDir);
          shootRaycaster.far = 55;
          const lHits = shootRaycaster.intersectObjects(fillCombinedRaycastTargets(false), false);
          if (lHits.length > 0) {
            laserDotMesh.visible = true;
            laserDotMesh.position.copy(lHits[0].point).addScaledVector(_laserDir, -0.04);
            laserDotMesh.scale.setScalar(Math.max(0.7, Math.min(2.6, lHits[0].distance * 0.08)));
          } else {
            laserDotMesh.visible = false;
          }
        }
      } else {
        laserDotMesh.visible = false;
        laserRaycastTimer = 0.08;
      }

      // 5. Pickups & Destructible Pots
      pickups.forEach((p) => {
        if (!p.active) {
          p.timer -= dt;
          if (p.timer <= 0) {
            p.active = true;
            p.group.visible = true;
          }
          return;
        }
        p.group.rotation.y += dt * 1.8;
        p.group.position.y = 0.55 + Math.sin(now * 0.004 + p.x) * 0.12;
        if (Math.hypot(player.pos.x - p.x, player.pos.z - p.z) < 1.55) {
          let picked = false;
          if (p.type === 'hp' && player.hp < player.maxHp) {
            player.hp = Math.min(player.maxHp, player.hp + 40);
            picked = true;
          } else if (p.type === 'armor' && player.armor < player.maxArmor) {
            player.armor = Math.min(player.maxArmor, player.armor + 50);
            picked = true;
          } else if (p.type === 'power') {
            overdriveTimer = 8.0;
            WEAPONS.forEach((wp) => {
              if (!wp.isMelee) {
                wp.reserve = Math.min(wp.maxReserve, wp.reserve + wp.magSize * 2);
              }
            });
            showCenterAlert('قدرت 2X + مهمات تمام سلاح‌ها دریافت شد', 1600);
            picked = true;
          }
          if (picked) {
            p.active = false;
            p.timer = playModeRef.current === 'training' ? 6 : 15;
            p.group.visible = false;
            sound.playPickup();
            advanceTutorialFromGame('powerups', 1, sound);
            if (pickupFlash) {
              pickupFlash.style.opacity = '1';
              window.setTimeout(() => {
                pickupFlash.style.opacity = '0';
              }, 180);
            }
            updateHUD();
            updateBuffHUD();
          }
        }
      });

      // Respawn shattered flower pots & apply distance-based prop culling for mobile FPS
      for (let i = 0; i < pots.length; i++) {
        const pot = pots[i];
        if (!pot.alive) {
          pot.respawnTimer -= dt;
          if (pot.respawnTimer <= 0) {
            pot.alive = true;
          } else {
            pot.group.visible = false;
            continue;
          }
        }
        pot.group.visible = !shouldCullSmallProp(pot.x - player.pos.x, pot.z - player.pos.z, activePropCullMaxDist);
      }

      // Update 3D AudioListener pose only when nearby remote players exist and spatial footsteps are audible
      if (remoteOperators.size > 0 && sound.enabled && sound.footstepVolume > 0.01) {
        sound.updateListenerPose(
          camera.position.x,
          camera.position.y,
          camera.position.z,
          -Math.sin(player.yaw),
          0,
          -Math.cos(player.yaw),
          0,
          1,
          0
        );
      }

      // Interpolate Remote Online Players with local speed-driven walk/run, discrete action overlays, death fall/fade & respawn emerge
      const shieldPulse = 0.42 + Math.sin(now * 0.0095) * 0.18;
      const nowEpochMs = Date.now();
      const idleSec = now * 0.001;
      remoteOperators.forEach((op) => {
        if (!op.root.visible) return;
        if (op.muzzleFlashTimer > 0) {
          op.muzzleFlashTimer -= dt;
          if (op.muzzleFlashTimer <= 0) {
            op.muzzleFlash.visible = false;
          }
        }

        if (op.isDying) {
          op.deathTimer += dt;
          const deadPose = computeHumanoidVisualPose({
            alive: false,
            actionState: 'dead',
            actionElapsedSec: op.deathTimer,
            walkPhase: op.walkPhase,
            speedMps: 0,
            slideBlend: 0,
            recoilKick: 0,
            idleTimeSec: idleSec,
            deathElapsedSec: op.deathTimer,
            respawnElapsedSec: HUMANOID_RESPAWN_DURATION_SEC,
            reducedMotion: reducedMotionRef.current,
          });
          op.root.rotation.x = deadPose.deathFallRotX;
          op.root.rotation.z = deadPose.deathRollRotZ * op.deathDir;
          op.upperBodyGroup.position.set(0, deadPose.deathDropY, 0);
          op.upperBodyGroup.rotation.x = 0;
          op.legL.rotation.x = deadPose.legLRotX;
          op.legR.rotation.x = deadPose.legRRotX;
          op.armL.rotation.set(deadPose.armLRotX, 0, deadPose.armLRotZ);
          op.armR.rotation.set(deadPose.armRRotX, 0, 0);
          op.gun.position.set(0.16, deadPose.gunPosY, deadPose.gunPosZ);
          op.gun.rotation.set(deadPose.gunRotX, 0, deadPose.gunRotZ);
          applyRemoteOperatorOpacity(op, deadPose.opacity);
          if (op.deathTimer >= HUMANOID_DEATH_TOTAL_SEC) {
            op.isDying = false;
            op.root.visible = false;
            op.root.rotation.x = 0;
            op.root.rotation.z = 0;
            applyRemoteOperatorOpacity(op, 1);
          }
          return;
        }

        const smoothed = computeSmoothedRemoteTransform({
          curX: op.root.position.x,
          curY: op.root.position.y,
          curZ: op.root.position.z,
          curYaw: op.root.rotation.y,
          targetX: op.targetPos.x,
          targetY: op.targetPos.y,
          targetZ: op.targetPos.z,
          targetYaw: op.targetYaw,
          dtSec: dt,
        });
        op.root.position.set(smoothed.x, smoothed.y, smoothed.z);
        op.root.rotation.set(0, smoothed.yaw, 0);
        const moveDist = smoothed.snapped ? 0 : op.root.position.distanceTo(op.lastPos);
        op.lastPos.copy(op.root.position);
        const rawSpeedMps = moveDist / Math.max(dt, 0.008);
        op.smoothedSpeed += (rawSpeedMps - op.smoothedSpeed) * Math.min(1, 12 * dt);
        op.slideBlend += ((op.isSliding ? 1 : 0) - op.slideBlend) * Math.min(1, 14 * dt);
        op.recoilKick *= Math.exp(-15 * dt);
        op.respawnTimer = Math.min(HUMANOID_RESPAWN_DURATION_SEC + 0.1, op.respawnTimer + dt);

        const loco = computeRemoteLocomotionFromSpeed(op.smoothedSpeed);
        if (op.slideBlend <= 0.12 && loco.mode !== 'idle' && moveDist > 0.004) {
          op.walkPhase += Math.min(0.48, loco.strideFrequency * dt * 2.25);
          const stepIdx = Math.floor(op.walkPhase / Math.PI);
          if (stepIdx !== op.lastStepIndex) {
            op.lastStepIndex = stepIdx;
            sound.playSpatialFootstep(
              op.root.position.x,
              op.root.position.y,
              op.root.position.z,
              camera.position.x,
              camera.position.y,
              camera.position.z,
              op.smoothedSpeed
            );
          }
        }

        const actionElapsedSec = Math.max(0, (nowEpochMs - op.actionTime) / 1000);
        const pose = computeHumanoidVisualPose({
          alive: true,
          actionState: op.actionState,
          actionElapsedSec,
          walkPhase: op.walkPhase,
          speedMps: op.smoothedSpeed,
          slideBlend: op.slideBlend,
          recoilKick: op.recoilKick,
          idleTimeSec: idleSec,
          deathElapsedSec: 0,
          respawnElapsedSec: op.respawnTimer,
          reducedMotion: reducedMotionRef.current,
          emoteId: op.activeEmoteId,
        });

        op.root.scale.y = pose.respawnScaleY;
        applyRemoteOperatorOpacity(op, pose.opacity);
        op.upperBodyGroup.position.set(0, pose.upperBodyY, pose.upperBodyZ);
        op.upperBodyGroup.rotation.x = pose.upperBodyRotX;
        op.sprite.position.y = 2.34 - 0.72 * op.slideBlend;
        op.legL.position.y = pose.legY;
        op.legR.position.y = pose.legY;
        op.legL.rotation.x = pose.legLRotX;
        op.legR.rotation.x = pose.legRRotX;
        op.armL.rotation.set(pose.armLRotX, 0, pose.armLRotZ);
        op.armR.rotation.set(pose.armRRotX, 0, 0);
        op.gun.position.set(0.16, pose.gunPosY, pose.gunPosZ);
        op.gun.rotation.set(pose.gunRotX, 0, pose.gunRotZ);

        // Lightweight spawn-protection shimmer using existing materials (zero extra meshes/lights)
        if (op.spawnProtected) {
          op.vestMat.emissive.setHex(0x22d3ee);
          op.vestMat.emissiveIntensity = shieldPulse;
          op.bodyMat.emissive.setHex(0x0ea5e9);
          op.bodyMat.emissiveIntensity = 0.22;
        } else if (op.vestMat.emissiveIntensity > 0) {
          op.vestMat.emissive.setHex(0x000000);
          op.vestMat.emissiveIntensity = 0;
          op.bodyMat.emissive.setHex(0x000000);
          op.bodyMat.emissiveIntensity = 0;
        }
        const camDist = camera.position.distanceTo(op.root.position);
        const nameScaleW = Math.max(1.1, Math.min(2.15, camDist * 0.145));
        op.sprite.scale.set(nameScaleW, nameScaleW * 0.186, 1);
      });

      onlineBroadcastTimer += dt;
      const effectiveSyncIntervalSec = lowDataModeRef.current
        ? CLIENT_SYNC_INTERVAL_LOW_DATA_SEC
        : CLIENT_SYNC_INTERVAL_SEC;
      if (onlineBroadcastTimer >= effectiveSyncIntervalSec && activeOnlineRoomCode) {
        onlineBroadcastTimer = 0;
        const localAnimState = resolveLocalPlayerAnimState({
          alive: player.hp > 0 && !isLocalSpectating,
          isRespawning: now < localRespawnUntilMs,
          isSliding: slideState.active,
          isReloading,
          isSwitching: switchAnim > 0.08,
          recentlyFired: now - lastLocalFireAtMs < 180,
          isMoving,
          isSprinting: sprinting,
          isEmoting: localEmoteActive,
        });
        if (localAnimState !== lastLocalAnimState) {
          lastLocalAnimState = localAnimState;
          lastLocalAnimAtMs = Date.now();
        }
        peerManager.syncLocalPlayerState({
          x: Number(player.pos.x.toFixed(2)),
          y: Number(player.pos.y.toFixed(2)),
          z: Number(player.pos.z.toFixed(2)),
          yaw: Number(player.yaw.toFixed(3)),
          pitch: Number(player.pitch.toFixed(3)),
          weaponIdx: currentWeaponIdx,
          hp: player.hp,
          kills: totalKills,
          score,
          wave,
          isSliding: slideState.active,
          anim: encodePlayerAnimState(localAnimState),
          animAt: lastLocalAnimAtMs,
        });
      }

      // 6. Enemy AI
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (e.hitFlash > 0) {
          e.hitFlash -= dt;
          e.bodyMat.emissive.setHex(
            e.hitFlash > 0 ? 0x991b1b : cheats.espWallhack ? 0x00d9ff : 0x000000
          );
        } else {
          e.bodyMat.emissive.setHex(cheats.espWallhack ? 0x00d9ff : 0x000000);
        }
        if (e.muzzleFlashTimer > 0) {
          e.muzzleFlashTimer -= dt;
          if (e.muzzleFlashTimer <= 0) {
            e.muzzleFlash.visible = false;
          }
        }
        e.recoilKickZ *= Math.exp(-14 * dt);

        if (!e.alive) {
          e.muzzleFlash.visible = false;
          e.hpBg.visible = false;
          e.hpFill.visible = false;
          e.deathTimer += dt;
          const botDeadPose = computeHumanoidVisualPose({
            alive: false,
            actionState: 'dead',
            actionElapsedSec: e.deathTimer,
            walkPhase: e.walkPhase,
            speedMps: 0,
            slideBlend: 0,
            recoilKick: 0,
            idleTimeSec: idleSec,
            deathElapsedSec: e.deathTimer,
            respawnElapsedSec: HUMANOID_RESPAWN_DURATION_SEC,
            reducedMotion: reducedMotionRef.current,
          });
          e.root.rotation.x = botDeadPose.deathFallRotX;
          e.root.rotation.z = botDeadPose.deathRollRotZ * e.deathDir;
          e.root.position.y = botDeadPose.deathDropY;
          e.legL.rotation.x = botDeadPose.legLRotX;
          e.legR.rotation.x = botDeadPose.legRRotX;
          e.armL.rotation.set(botDeadPose.armLRotX, 0, botDeadPose.armLRotZ);
          e.armR.rotation.set(botDeadPose.armRRotX, 0, 0);
          if (botDeadPose.opacity < 0.99) {
            if (!e.bodyMat.transparent) {
              e.bodyMat.transparent = true;
              e.bodyMat.needsUpdate = true;
            }
            e.bodyMat.opacity = botDeadPose.opacity;
            if (botDeadPose.opacity < 0.45 && e.fadeHideMeshes.length > 0 && e.fadeHideMeshes[0].visible) {
              for (let hIdx = 0; hIdx < e.fadeHideMeshes.length; hIdx++) {
                e.fadeHideMeshes[hIdx].visible = false;
              }
            }
          }
          if (e.deathTimer >= HUMANOID_DEATH_TOTAL_SEC) {
            disposeEnemyBot(e);
            enemies.splice(i, 1);
          }
          continue;
        }

        const dx = player.pos.x - e.root.position.x;
        const dz = player.pos.z - e.root.position.z;
        const distToPlayer = Math.hypot(dx, dz);
        const dirToPlayer = _aiDir.set(dx, 0, dz).normalize();
        const targetCombatYaw = Math.atan2(dx, dz);

        e.hpBg.lookAt(camera.position);
        e.hpFill.lookAt(camera.position);
        const hpFrac = Math.max(0.001, e.hp / e.maxHp);
        e.hpFill.scale.x = hpFrac;
        e.hpFill.position.x = -(1 - hpFrac) * 0.355;

        const eyeOrigin = _aiEye.set(e.root.position.x, e.root.position.y + 1.5, e.root.position.z);
        const playerChest = _aiPlayerChest.set(player.pos.x, player.pos.y + 1.25, player.pos.z);
        const hasLOS = hasLineOfSightToPoint(eyeOrigin.x, eyeOrigin.y, eyeOrigin.z);
        e.visibleToPlayer = hasLOS;

        e.strafeTimer -= dt * e.strafeFrequencyMult;
        if (e.strafeTimer <= 0) {
          e.strafeDir *= -1;
          e.strafeTimer = 1.0 + Math.random() * 1.6;
        }

        let moveX = 0;
        let moveZ = 0;
        const desiredRange = (e.type === 'rusher' ? 3.2 : 11.5) * e.desiredRangeMult;
        if (!hasLOS || distToPlayer > desiredRange) {
          moveX += dirToPlayer.x;
          moveZ += dirToPlayer.z;
        }
        if (hasLOS && distToPlayer < 18) {
          moveX += -dirToPlayer.z * e.strafeDir * 0.78;
          moveZ += dirToPlayer.x * e.strafeDir * 0.78;
        }
        if (distToPlayer < 2.2) {
          moveX -= dirToPlayer.x * 0.8;
          moveZ -= dirToPlayer.z * 0.8;
        }

        for (let j = 0; j < enemies.length; j++) {
          if (i === j || !enemies[j].alive) continue;
          const odx = e.root.position.x - enemies[j].root.position.x;
          const odz = e.root.position.z - enemies[j].root.position.z;
          const od = Math.hypot(odx, odz);
          if (od > 0.01 && od < 1.8) {
            moveX += (odx / od) * 1.5;
            moveZ += (odz / od) * 1.5;
          }
        }

        const mLen = Math.hypot(moveX, moveZ);
        const botIsMoving = mLen > 0.05 && e.speed > 0.01;
        let patrolHeadingYaw = targetCombatYaw;

        if (botIsMoving) {
          moveX /= mLen;
          moveZ /= mLen;
          const goalX = e.root.position.x + moveX * 3.2;
          const goalZ = e.root.position.z + moveZ * 3.2;
          const smartSteer = computeSmartBotSteering(
            e.root.position.x,
            e.root.position.z,
            goalX,
            goalZ,
            e.strafeDir,
            0.62,
            wallColliders,
            activeArenaHalf
          );
          const finalDirX = smartSteer.dirX;
          const finalDirZ = smartSteer.dirZ;
          patrolHeadingYaw = smartSteer.headingYaw;
          // Slightly slower, more deliberate pace when in relaxed patrol stance
          const stanceSpeedFactor = 0.82 + 0.18 * e.combatBlend;
          const step = e.speed * stanceSpeedFactor * dt;
          const oldX = e.root.position.x;
          const oldZ = e.root.position.z;
          const res = resolveCircleAABB(
            oldX + finalDirX * step,
            oldZ + finalDirZ * step,
            0.62,
            0,
            wallColliders,
            activeArenaHalf
          );
          e.root.position.x = res.x;
          e.root.position.z = res.z;

          if (Math.hypot(res.x - oldX, res.z - oldZ) < step * 0.25) {
            e.strafeDir *= -1;
            const sideRes = resolveCircleAABB(
              oldX - dirToPlayer.z * e.strafeDir * step,
              oldZ + dirToPlayer.x * e.strafeDir * step,
              0.62,
              0,
              wallColliders,
              activeArenaHalf
            );
            e.root.position.x = sideRes.x;
            e.root.position.z = sideRes.z;
          }

          e.walkPhase += dt * e.speed * (1.75 + 0.55 * e.combatBlend);
        } else {
          e.walkPhase += dt * 1.6;
        }

        // Smoothly transition between Patrolling Stance (0) and Combat Stance (1)
        const stanceState = computeBotStanceTransition(
          e.combatBlend,
          e.alertTimer,
          e.currentYaw,
          targetCombatYaw,
          patrolHeadingYaw,
          hasLOS,
          distToPlayer,
          dt
        );
        e.combatBlend = stanceState.combatBlend;
        e.alertTimer = stanceState.alertTimer;
        e.currentYaw = stanceState.currentYaw;
        e.root.rotation.y = e.currentYaw;

        // Apply blended 3D pose (torso lean, head scanning vs target lock, arm C-clamp raise, rifle ready)
        const pose = computeBotStancePose(e.combatBlend, e.walkPhase, botIsMoving);
        e.torsoMesh.position.y = pose.torsoY;
        e.torsoMesh.rotation.set(pose.torsoPitch, 0, pose.torsoRoll);
        e.headMesh.rotation.set(pose.headPitch, pose.headYaw, 0);
        e.legL.rotation.x = pose.legLSwing;
        e.legR.rotation.x = pose.legRSwing;
        e.armL.rotation.set(pose.armLPitch, pose.armLYaw, 0);
        e.armR.rotation.set(pose.armRPitch, pose.armRYaw, 0);
        e.weaponGroup.position.set(
          pose.weaponPosX,
          pose.weaponPosY,
          pose.weaponPosZ - e.recoilKickZ
        );
        e.weaponGroup.rotation.set(pose.weaponPitch, pose.weaponYaw, pose.weaponRoll);

        e.fireTimer -= dt;
        // Bot only fires once rifle has transitioned into shouldered combat readiness (combatBlend > 0.65)
        if (hasLOS && e.combatBlend > 0.65 && distToPlayer < 30 && e.fireTimer <= 0) {
          e.fireTimer = e.fireInterval * (0.85 + Math.random() * 0.35);
          e.muzzleFlash.getWorldPosition(_aiGunTip);
          e.muzzleFlash.visible = true;
          e.muzzleFlash.rotation.z = Math.random() * Math.PI * 2;
          e.muzzleFlashTimer = 0.075;
          e.recoilKickZ = 0.075;
          spawnEnemyBullet(_aiGunTip, playerChest, e.dmg, e.spread, e.bulletSpeed);
          sound.playEnemyShot(distToPlayer);
        }
      }

      // 7. Pooled Projectiles, Shells, Particles, Arcs & Decals (Zero allocations)
      for (let i = 0; i < tracerPool.length; i++) {
        const t = tracerPool[i];
        if (!t.active) continue;
        const step = t.speed * dt;
        t.mesh.position.addScaledVector(t.dir, step);
        t.traveled += step;
        if (t.traveled >= t.maxDist) {
          t.active = false;
          t.mesh.visible = false;
        }
      }

      const pChestY = slideState.active ? 0.56 : 1.15;
      _ebChest.set(player.pos.x, player.pos.y + pChestY, player.pos.z);
      for (let i = 0; i < enemyBulletPool.length; i++) {
        const b = enemyBulletPool[i];
        if (!b.active) continue;
        b.life -= dt;
        _ebPrevPos.copy(b.mesh.position);
        b.mesh.position.addScaledVector(b.dir, b.speed * dt);

        const withinSlideHeight = b.mesh.position.y <= player.pos.y + slideState.hitboxHeight;
        if (withinSlideHeight && b.mesh.position.distanceTo(_ebChest) < 0.72) {
          if (!cheats.godMode && !lastSyncedLocalProtected && !roundInputLocked) {
            const dmgRes = calculateDamageTaken(b.dmg, player.hp, player.armor);
            player.hp = dmgRes.nextHp;
            player.armor = dmgRes.nextArmor;
            cancelLocalMythicEmote(true);

            sound.playHurt();
            triggerHapticFeedback(vibrationEnabledRef.current, 'damage');
            screenShake = Math.max(screenShake, 0.028);
            damageShaderFlash = 0.85;
            if (damageVignette) {
              damageVignette.style.opacity = '1';
              window.setTimeout(() => {
                damageVignette.style.opacity = '0';
              }, 170);
            }
            updateHUD();
          }

          b.active = false;
          b.mesh.visible = false;
          if (player.hp <= 0 && !cheats.godMode) {
            if (playModeRef.current === 'training') {
              player.hp = 100;
              player.armor = 50;
              updateHUD();
              showCenterAlert('احیای خودکار در میدان تمرین — سلامت و زره بازیابی شد', 1800);
            } else if (isRoundMatch && activeRoom) {
              player.hp = 100;
              player.armor = 50;
              resetTouchInputState();
              updateHUD();
              if (activeRoom.roundPhase === 'playing') {
                const enemyTeam: TeamId = peerManager.getLocalTeam() === 'alpha' ? 'bravo' : 'alpha';
                peerManager.recordTeamRoundWin(
                  enemyTeam,
                  'اپراتور در این راند سقوط کرد — امتیاز راند برای تیم مقابل!'
                );
              }
            } else {
              player.hp = 0;
              updateHUD();
              resetTouchInputState();
              isADS = false;
              isReloading = false;
              reloadProgress = 0;
              lastTempestReloadPhase = 'idle';
              lastEclipseReloadPhase = 'idle';
              lastEclipseReloadShellIndex = -1;
              tempestLmgModel?.applyCinematicReload(0);
              eclipseShotgunModel?.applyCinematicReload(0);
              cancelLocalMythicEmote(true);
              localInspectProgress = -1;
              document.getElementById('btn-ads')?.classList.remove('active-ads');
              if (reloadIndicator) reloadIndicator.style.display = 'none';
              if (reloadBarFill) reloadBarFill.style.width = '0%';
              syncSniperScopeState();
              if (document.pointerLockElement) document.exitPointerLock?.();
              if (isOgModeRef.current) {
                setOgState((prev) => recordOgMatchResult(prev, score, wave));
              }
              setGameOverStats({
                score,
                kills: totalKills,
                deaths: 1,
                wave,
                shotsFired: offlineShotsFired,
                shotsHit: offlineShotsHit,
                headshots: offlineHeadshots,
              });
              clearMatchCosmeticsLock();
              screenStateRef.current = 'gameover';
              document.body.dataset.state = 'gameover';
              setScreenState('gameover');
              scheduleNextFrame();
              return;
            }
          }
          continue;
        }

        if (!isPositionFree(b.mesh.position.x, b.mesh.position.z, 0.05) && b.mesh.position.y < 3.5) {
          spawnParticles(_ebPrevPos, 0xff2244, 3, 2.5);
          b.life = 0;
        }
        if (b.life <= 0) {
          b.active = false;
          b.mesh.visible = false;
        }
      }

      let shellsDirty = false;
      let anyShellActive = false;
      for (let i = 0; i < shellPool.length; i++) {
        const s = shellPool[i];
        if (!s.active) continue;
        s.life -= dt;
        if (s.life <= 0) {
          s.active = false;
          shellInstancedMesh.setMatrixAt(i, _instZeroMat);
          shellsDirty = true;
          continue;
        }
        s.vel.y -= 14 * dt;
        s.pos.addScaledVector(s.vel, dt);
        s.rot.x += s.rotVel.x * dt;
        s.rot.y += s.rotVel.y * dt;
        if (s.pos.y < 0.03) {
          s.pos.y = 0.03;
          s.vel.y = Math.abs(s.vel.y) * 0.35;
          s.vel.x *= 0.6;
          s.vel.z *= 0.6;
        }
        _instDummy.position.copy(s.pos);
        _instDummy.rotation.copy(s.rot);
        _instDummy.scale.setScalar(1);
        _instDummy.updateMatrix();
        shellInstancedMesh.setMatrixAt(i, _instDummy.matrix);
        shellsDirty = true;
        anyShellActive = true;
      }
      if (shellsDirty) {
        shellInstancedMesh.instanceMatrix.needsUpdate = true;
      }
      shellInstancedMesh.visible = anyShellActive;

      let particlesDirty = false;
      let aliveParticles = 0;
      for (let i = 0; i < particlePool.length; i++) {
        const p = particlePool[i];
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          particleInstancedMesh.setMatrixAt(i, _instZeroMat);
          particlesDirty = true;
          continue;
        }
        p.vel.y -= 9.8 * dt;
        p.pos.addScaledVector(p.vel, dt);
        const ratio = Math.max(0.01, p.life / p.maxLife);
        _instDummy.position.copy(p.pos);
        _instDummy.rotation.set(0, 0, 0);
        _instDummy.scale.setScalar(ratio);
        _instDummy.updateMatrix();
        particleInstancedMesh.setMatrixAt(i, _instDummy.matrix);
        particlesDirty = true;
        aliveParticles++;
      }
      activeBaseParticleCount = aliveParticles;
      if (particlesDirty) {
        particleInstancedMesh.instanceMatrix.needsUpdate = true;
      }
      particleInstancedMesh.visible = aliveParticles > 0;

      for (let i = 0; i < arcPool.length; i++) {
        const a = arcPool[i];
        if (!a.active) continue;
        a.life -= dt;
        a.mesh.position.addScaledVector(a.vel, dt);
        const ratio = Math.max(0, a.life / a.maxLife);
        a.mesh.scale.setScalar(1 + (1 - ratio) * 0.45);
        a.mat.opacity = ratio * 0.85;
        if (a.life <= 0) {
          a.active = false;
          a.mesh.visible = false;
        }
      }

      for (let i = 0; i < decalPool.length; i++) {
        const d = decalPool[i];
        if (!d.active) continue;
        d.life -= dt;
        if (d.life <= 0) {
          d.active = false;
          d.mesh.visible = false;
        }
      }

      radarTick += dt;
      if (radarTick >= 0.05) {
        radarTick = 0;
        drawRadar();
      }

      renderScene();
      scheduleNextFrame();
    }

    const onResize = createDebouncedCallback(() => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      rebuildRenderTarget();
      wakeRenderLoop(true);
    }, 120);
    window.addEventListener('resize', onResize);

    // Pause heavy WebGL rendering & stepping when tab/app goes to background; resume with zero dt jump
    const onVisibilityChange = () => {
      isPageHidden = document.hidden;
      if (isPageHidden) {
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
        mainLoopRunning = false;
        Object.keys(keys).forEach((k) => (keys[k] = false));
        resetTouchInputState();
      } else {
        wakeRenderLoop(false);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    setBootProgress({ pct: 100, labelFa: 'آماده است', ready: true });
    scheduleNextFrame();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      voiceManager.dispose();
      peerManager.dispose();
      touchCleanupCallbacks.forEach((fn) => fn());
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      onResize.cancel();
      adDisposed = true;
      clearAdBillboards();
      adFrameMat.dispose();
      adTextureCache.forEach((tex) => tex.dispose());
      adTextureCache.clear();
      adPendingLoads.clear();
      scene.remove(adBillboardGroup);
      clearArenaMap();
      enemies.forEach((e) => disposeEnemyBot(e));
      enemies.length = 0;
      clearAllRemoteOperators();
      enemyBulletPool.forEach((b) => scene.remove(b.mesh));
      eBulletGeo.dispose();
      eBulletMat.dispose();
      Object.values(botWeaponMergedGeos).forEach((g) => g?.dispose());
      Object.values(botTorsoArmorGeos).forEach((g) => g?.dispose());
      Object.values(botHelmetGeos).forEach((g) => g?.dispose());
      Object.values(sharedBotGeos).forEach((g) => g.dispose());
      Object.values(botFaceMats).forEach((m) => m?.dispose());
      botArmorGearMat.dispose();
      botWeaponMergedMat.dispose();
      botStaticDarkGearMat.dispose();
      botFlashGeo.dispose();
      botFlashMat.dispose();
      sharedBotShadowMat.dispose();
      sharedBotHpBgMat.dispose();
      sharedBotHpFillMat.dispose();
      potMergedGeoA.dispose();
      potMergedGeoB.dispose();
      potVertexMat.dispose();
      tireMat.dispose();
      tireRimMat.dispose();
      palmTrunkMat.dispose();
      palmLeafMat.dispose();
      neonCyanMat.dispose();
      neonAmberMat.dispose();
      neonPinkMat.dispose();
      alphaTrimMat.dispose();
      bravoTrimMat.dispose();
      pickupBoxGeo.dispose();
      pickupCrossGeo.dispose();
      pickupRingGeo.dispose();
      pickupCrossMat.dispose();
      Object.values(pickupBoxMats).forEach((m) => m.dispose());
      Object.values(pickupRingMats).forEach((m) => m.dispose());
      tracerPool.forEach((t) => {
        scene.remove(t.mesh);
        t.mat.dispose();
      });
      baseDisposableWeaponModels.forEach((m) => m.dispose());
      weaponMatLib.dispose();
      infernoAkModel?.dispose();
      infernoVfxPool.dispose();
      voidSniperModel?.dispose();
      voidVfxPool.dispose();
      tempestLmgModel?.dispose();
      tempestVfxPool.dispose();
      eclipseShotgunModel?.dispose();
      eclipseVfxPool.dispose();
      sakuraKatanaModel?.dispose();
      sakuraVfxPool.dispose();
      novaDragonRpgModel?.dispose();
      novaDragonVfxPool.dispose();
      scene.remove(shellInstancedMesh);
      scene.remove(particleInstancedMesh);
      arcPool.forEach((a) => {
        scene.remove(a.mesh);
        a.mat.dispose();
      });
      decalPool.forEach((d) => scene.remove(d.mesh));
      tracerGeo.dispose();
      shellGeo.dispose();
      shellMat.dispose();
      sparkGeo.dispose();
      sparkMat.dispose();
      katanaArcGeo.dispose();
      decalGeo.dispose();
      decalMat.dispose();
      postQuadGeo.dispose();
      postMat.dispose();
      envRT?.dispose();
      disposeSharedProceduralTextures();
      if (renderTarget) renderTarget.dispose();
      renderer.dispose();
    };
  }, [advanceTutorialFromGame]);

  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const showTouchControls =
    screenState === 'playing' && (touchSetting === 'on' || (touchSetting === 'auto' && isTouchDevice));

  const handleSelectTutorialStep = (index: number) => {
    const next = { ...tutorialState, activeStepIndex: index };
    tutorialStateRef.current = next;
    setTutorialState(next);
  };

  const handleCompleteCurrentStep = () => {
    const curStep = tutorialState.steps[tutorialState.activeStepIndex];
    if (!curStep) return;
    const { nextState } = recordTutorialProgress(tutorialState, curStep.id, curStep.target);
    tutorialStateRef.current = nextState;
    setTutorialState(nextState);
  };

  const handleResetTutorial = () => {
    const fresh = createInitialTutorialState();
    tutorialStateRef.current = fresh;
    setTutorialState(fresh);
  };

  const handleToggleTutorialStep = (stepId: TutorialStepId) => {
    const nextState = toggleTutorialStepChecklist(tutorialState, stepId);
    tutorialStateRef.current = nextState;
    setTutorialState(nextState);
  };

  const handleToggleLoadoutWeapon = (weaponId: WeaponId) => {
    const next = toggleLoadoutWeapon(loadout, weaponId);
    engineApiRef.current?.setLoadout(next);
  };

  const renderWeaponIconSvg = useCallback((id: WeaponId) => {
    if (id === 'ak47') {
      return (
        <svg className="weapon-blueprint-svg" viewBox="0 0 120 42" fill="none">
          <path d="M4 24L24 18V27L6 33L4 24Z" fill="#9a5b32" stroke="#d97706" strokeWidth="1.2" />
          <rect x="24" y="15" width="38" height="10" rx="2" fill="#334155" stroke="#94a3b8" strokeWidth="1.2" />
          <rect x="32" y="11" width="16" height="4" rx="1" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
          <rect x="62" y="16" width="22" height="7" rx="1.5" fill="#9a5b32" stroke="#d97706" strokeWidth="1" />
          <rect x="84" y="17.5" width="28" height="3.2" fill="#64748b" />
          <path d="M106 14L110 17.5H104L106 14Z" fill="#94a3b8" />
          <path d="M27 25L33 25L30 36L24 35L27 25Z" fill="#7c4728" />
          <path d="M45 25H53L60 39L51 40L45 25Z" fill="#475569" stroke="#cbd5e1" strokeWidth="1.1" />
        </svg>
      );
    }
    if (id === 'm4a1') {
      return (
        <svg className="weapon-blueprint-svg" viewBox="0 0 120 42" fill="none">
          <path d="M4 16H22L24 27H8L4 16Z" fill="#1e293b" stroke="#64748b" strokeWidth="1.2" />
          <rect x="24" y="15" width="36" height="11" rx="2" fill="#334155" stroke="#94a3b8" strokeWidth="1.2" />
          <rect x="34" y="9" width="16" height="6" rx="1.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
          <rect x="60" y="16" width="24" height="8" rx="1.5" fill="#1e293b" stroke="#64748b" strokeWidth="1.1" />
          <rect x="84" y="18" width="14" height="3.5" fill="#64748b" />
          <rect x="98" y="16.5" width="18" height="6.5" rx="2" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.1" />
          <path d="M28 26H34L31 37H25L28 26Z" fill="#1e293b" />
          <path d="M44 26H52L54 39H46L44 26Z" fill="#334155" stroke="#94a3b8" strokeWidth="1.1" />
        </svg>
      );
    }
    if (id === 'sniper') {
      return (
        <svg className="weapon-blueprint-svg" viewBox="0 0 120 42" fill="none">
          <path d="M3 18H24L27 15H64V24H25L18 29H3V18Z" fill="#2d4234" stroke="#4ade80" strokeWidth="1.2" />
          <rect x="29" y="7" width="32" height="5.5" rx="2" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.3" />
          <path d="M26 6L30 7V12.5L26 13.5V6ZM61 6L66 5V14.5L61 12.5V6Z" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
          <rect x="64" y="17.5" width="44" height="3.2" fill="#94a3b8" />
          <rect x="108" y="16" width="9" height="6" rx="1" fill="#334155" stroke="#cbd5e1" strokeWidth="1" />
          <rect x="38" y="24" width="12" height="10" rx="1" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
          <path d="M60 24L66 36M63 24L57 36" stroke="#64748b" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    }
    if (id === 'mp5') {
      return (
        <svg className="weapon-blueprint-svg" viewBox="0 0 120 42" fill="none">
          <path d="M12 18H28V22H12V18Z" fill="#475569" />
          <rect x="8" y="15" width="5" height="12" rx="1.5" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
          <rect x="28" y="14" width="34" height="11" rx="2.5" fill="#334155" stroke="#94a3b8" strokeWidth="1.2" />
          <rect x="38" y="9" width="12" height="5" rx="1" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.1" />
          <rect x="62" y="15.5" width="28" height="7.5" rx="3.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.1" />
          <path d="M33 25H39L36 36H30L33 25Z" fill="#1e293b" />
          <path d="M49 25H55L59 39H53L49 25Z" fill="#334155" stroke="#94a3b8" strokeWidth="1.1" />
        </svg>
      );
    }
    if (id === 'shotgun') {
      return (
        <svg className="weapon-blueprint-svg" viewBox="0 0 120 42" fill="none">
          <path d="M4 25L24 18L26 26L8 34L4 25Z" fill="#1e293b" stroke="#64748b" strokeWidth="1.2" />
          <rect x="25" y="16" width="34" height="9" rx="2" fill="#334155" stroke="#94a3b8" strokeWidth="1.2" />
          <rect x="59" y="16" width="48" height="3.2" fill="#94a3b8" />
          <rect x="59" y="20" width="42" height="3" fill="#475569" />
          <rect x="66" y="19.5" width="22" height="6" rx="2" fill="#f59e0b" stroke="#fde68a" strokeWidth="1" />
        </svg>
      );
    }
    if (id === 'lmg') {
      return (
        <svg className="weapon-blueprint-svg" viewBox="0 0 120 42" fill="none">
          <rect x="4" y="16" width="20" height="11" rx="2" fill="#1e293b" stroke="#64748b" strokeWidth="1.2" />
          <rect x="24" y="14" width="42" height="12" rx="2" fill="#334155" stroke="#94a3b8" strokeWidth="1.2" />
          <rect x="34" y="9" width="14" height="5" rx="1" fill="#0f172a" stroke="#4ade80" strokeWidth="1.1" />
          <rect x="66" y="15.5" width="28" height="8" rx="1.5" fill="#475569" stroke="#cbd5e1" strokeWidth="1.1" />
          <rect x="94" y="17.5" width="22" height="3.5" fill="#94a3b8" />
          <rect x="38" y="25" width="18" height="13" rx="2" fill="#14532d" stroke="#4ade80" strokeWidth="1.2" />
          <path d="M27 26H33L30 37H24L27 26Z" fill="#1e293b" />
        </svg>
      );
    }
    if (id === 'deagle') {
      return (
        <svg className="weapon-blueprint-svg" viewBox="0 0 120 42" fill="none">
          <path d="M26 9H92L88 21H26V9Z" fill="#e2e8f0" stroke="#fbbf24" strokeWidth="1.4" />
          <rect x="38" y="12" width="42" height="3.5" rx="1" fill="#f59e0b" />
          <path d="M28 21H46L39 39H23L28 21Z" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.2" />
          <path d="M46 21H58V28H46V21Z" stroke="#94a3b8" strokeWidth="1.2" />
        </svg>
      );
    }
    if (id === 'rpg') {
      return (
        <svg className="weapon-blueprint-svg" viewBox="0 0 120 42" fill="none">
          <path d="M4 15L14 18H76V23H14L4 26V15Z" fill="#475569" stroke="#94a3b8" strokeWidth="1.2" />
          <rect x="30" y="16.5" width="28" height="8" rx="2" fill="#9a5b32" stroke="#d97706" strokeWidth="1.1" />
          <path d="M76 18L94 11L114 20.5L94 30L76 23V18Z" fill="#3f6212" stroke="#84cc16" strokeWidth="1.2" />
          <rect x="112" y="19" width="5" height="3" fill="#f59e0b" />
          <path d="M42 24.5H48L45 35H39L42 24.5ZM62 23H68L65 34H59L62 23Z" fill="#7c4728" />
        </svg>
      );
    }
    if (id === 'pistol') {
      return (
        <svg className="weapon-blueprint-svg" viewBox="0 0 120 42" fill="none">
          <rect x="32" y="11" width="46" height="9" rx="2" fill="#334155" stroke="#94a3b8" strokeWidth="1.3" />
          <rect x="78" y="12.5" width="12" height="6" rx="1.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.1" />
          <path d="M35 20H50L44 37H31L35 20Z" fill="#1e293b" stroke="#64748b" strokeWidth="1.2" />
          <path d="M50 20H60V26H50V20Z" stroke="#64748b" strokeWidth="1.2" />
        </svg>
      );
    }
    return (
      <svg className="weapon-blueprint-svg" viewBox="0 0 120 42" fill="none">
        <path d="M8 31L30 23L33 28L11 36L8 31Z" fill="#1e293b" stroke="#64748b" strokeWidth="1.2" />
        <rect x="30" y="20" width="4" height="10" rx="1" transform="rotate(-20 30 20)" fill="#f59e0b" />
        <path d="M34 22L110 6L114 9L36 26L34 22Z" fill="#e2e8f0" stroke="#00f0ff" strokeWidth="1.3" />
      </svg>
    );
  }, []);

  const presetLabel =
    gfxState.preset === 'auto'
      ? 'خودکار (Auto)'
      : gfxState.preset === 'lite'
        ? 'سبک (Lite)'
        : gfxState.preset === 'promax'
          ? 'Ultra Max Pro Max (ویژه)'
          : gfxState.preset === 'ultramax'
            ? 'Ultra Max'
            : gfxState.preset === 'ultra'
              ? 'Ultra'
              : gfxState.preset === 'high'
                ? 'High'
                : gfxState.preset === 'med'
                  ? 'Medium'
                  : gfxState.preset === 'potato'
                    ? 'Potato (فوق‌سبک)'
                    : 'Low';
  const fpsLabel = gfxState.targetFps === 0 ? 'Max' : String(gfxState.targetFps);
  const currentMapMeta = MAP_LIST.find((m) => m.id === currentMap) ?? MAP_LIST[0];

  // Weapon slots displayed in the HUD bottom bar:
  // Strictly the 3 chosen loadout weapons in Campaign/Online, or all enabled weapons in Training mode.
  const hudWeaponSlots =
    playMode === 'training'
      ? WEAPON_CATALOG.map((meta, idx) => ({
          weaponIdx: idx,
          keyLabel: idx + 1,
          meta,
          allowed: Boolean(trainingConfig.enabledWeapons[meta.id]),
        }))
      : loadout.map((wId, slotPosition) => {
          const weaponIdx = Math.max(
            0,
            WEAPON_CATALOG.findIndex((w) => w.id === wId)
          );
          const meta = WEAPON_CATALOG[weaponIdx] ?? WEAPON_CATALOG[0];
          return {
            weaponIdx,
            keyLabel: slotPosition + 1,
            meta,
            allowed: true,
          };
        });

  const uiV3StateSnapshot: UiV3StateSnapshot | null = useMemo(() => {
    if (effectiveUiVersion !== 'v3') return null;
    return {
      appVersion: APP_VERSION,
      buildDate: BUILD_DATE,
      screenState,
      playMode,
      isOgMode,
      ogEnabled: OG_EVENT_CONFIG.enabled,
      isFullscreen,
      presetLabel,
      fpsLabel,
      menuBackdropSnapshotUrl: null,
      glassResolution,
      preferredUi: uiV3Prefs.uiMode,
      activeUi: activeUiVersion,
      pendingUiSwitchNotice,
      uiV3Prefs,
      autoTransparencyOverridden,
      currentMap,
      loadout,
      renderWeaponIconSvg,
      gfxState,
      autoQuality,
      batterySaver,
      lowDataMode,
      viewDistanceMode,
      showFpsHud,
      showPerfProfiler,
      skinFxMode,
      showAdBillboards,
      sensitivity,
      adsSensitivity,
      hudLayout,
      hudScale,
      hudOpacity,
      crosshairSize,
      crosshairStyle,
      showLeanHudButtons,
      botDifficulty,
      aimAssistStrength,
      autoReloadEnabled,
      vibrationEnabled,
      touchSetting,
      slideAlphaEnabled,
      cameraMotionIntensity,
      reducedMotion,
      soundEnabled,
      footstepVolume,
      voiceState,
      onlinePlayerName,
      onlineRoom,
      peerStatus,
      peerRole,
      onlineRoomError,
      localOnlinePlayerId,
      showPingHud,
      cheatConfig,
      cheatUnlocked,
      cheatUnlockRemainingSec,
      cheatPasswordInput,
      cheatPassError,
      cosmeticsState,
    };
  }, [
    effectiveUiVersion,
    screenState,
    playMode,
    isOgMode,
    isFullscreen,
    presetLabel,
    fpsLabel,
    glassResolution,
    renderWeaponIconSvg,
    uiV3Prefs,
    autoTransparencyOverridden,
    activeUiVersion,
    pendingUiSwitchNotice,
    currentMap,
    loadout,
    gfxState,
    autoQuality,
    batterySaver,
    lowDataMode,
    viewDistanceMode,
    showFpsHud,
    showPerfProfiler,
    skinFxMode,
    showAdBillboards,
    sensitivity,
    adsSensitivity,
    hudLayout,
    hudScale,
    hudOpacity,
    crosshairSize,
    crosshairStyle,
    showLeanHudButtons,
    botDifficulty,
    aimAssistStrength,
    autoReloadEnabled,
    vibrationEnabled,
    touchSetting,
    slideAlphaEnabled,
    cameraMotionIntensity,
    reducedMotion,
    soundEnabled,
    footstepVolume,
    voiceState,
    onlinePlayerName,
    onlineRoom,
    peerStatus,
    peerRole,
    onlineRoomError,
    localOnlinePlayerId,
    showPingHud,
    cheatConfig,
    cheatUnlocked,
    cheatUnlockRemainingSec,
    cheatPasswordInput,
    cheatPassError,
    cosmeticsState,
  ]);

  const handleUiV3Action = useCallback(
    (action: UiV3Action) => {
      switch (action.type) {
        case 'START_OFFLINE':
          engineApiRef.current?.startSession('campaign');
          break;
        case 'RESUME_SESSION':
          engineApiRef.current?.resumeSession();
          break;
        case 'RESTART_SESSION':
          engineApiRef.current?.startSession(playMode, trainingConfig);
          break;
        case 'RETURN_TO_TITLE':
          engineApiRef.current?.returnToTitle();
          break;
        case 'OPEN_ONLINE':
          openModalUrgent('online', () => {
            setShowSettingsModal(false);
            setShowOnlineModal(true);
          });
          break;
        case 'OPEN_TRAINING':
          openModalUrgent('training', () => {
            setShowSettingsModal(false);
            setShowTrainingModal(true);
          });
          break;
        case 'OPEN_SPIN':
          if (!canOpenSpinWheel(screenStateRef.current, ogFeaturesRef.current.spinSystem)) break;
          openModalUrgent('spin', () => {
            setDeferredSkinNoticeFa(null);
            setSpinInitialBannerId(undefined);
            setShowSpinModal(true);
          });
          break;
        case 'OPEN_SKINS':
          openModalUrgent('skins', () => {
            setDeferredSkinNoticeFa(null);
            setShowSkinsModal(true);
          });
          break;
        case 'OPEN_SETTINGS':
          openModalUrgent('settings-v3', () => {
            setShowSettingsModal(true);
          });
          break;
        case 'CLOSE_SETTINGS':
          setShowSettingsModal(false);
          break;
        case 'OPEN_LAYOUT_EDITOR':
          openModalUrgent('layout-editor', () => {
            setShowLayoutEditor(true);
          });
          break;
        case 'RESET_CONTROL_LAYOUT':
          handleResetCustomControlLayout();
          break;
        case 'OPEN_OG_INTRO':
          openModalUrgent('og-intro', () => {
            setShowOgIntro(true);
          });
          break;
        case 'EXIT_OG_MODE':
          handleExitOgMode();
          break;
        case 'TOGGLE_FULLSCREEN':
          toggleFullscreen();
          break;
        case 'SELECT_UI_MODE':
          handleSelectUiVersion(action.mode);
          break;
        case 'SET_REDUCE_TRANSPARENCY':
          if (action.enabled) {
            setAutoTransparencyOverridden(false);
          }
          handleToggleReduceTransparency(action.enabled);
          break;
        case 'SET_AUTO_TRANSPARENCY_OVERRIDE':
          setAutoTransparencyOverridden(action.overridden);
          break;
        case 'SET_UI_CLICK_SOUND':
          handleToggleUiClickSound(action.enabled);
          setUiV3Prefs((prev) => saveUiV3Preferences({ ...prev, uiClickSound: action.enabled }));
          break;
        case 'SET_UI_HAPTICS':
          handleToggleUiHaptics(action.enabled);
          setUiV3Prefs((prev) => saveUiV3Preferences({ ...prev, uiHaptics: action.enabled }));
          break;
        case 'SELECT_MAP':
          engineApiRef.current?.setMap(action.mapId);
          break;
        case 'TOGGLE_LOADOUT_WEAPON':
          handleToggleLoadoutWeapon(action.weaponId);
          break;
        case 'RESET_LOADOUT':
          engineApiRef.current?.setLoadout(DEFAULT_LOADOUT);
          break;
        case 'APPLY_GFX_PRESET':
          if (action.preset === 'low' || action.preset === 'potato' || action.preset === 'lite') {
            setAutoTransparencyOverridden(false);
          }
          engineApiRef.current?.applyPreset(action.preset);
          break;
        case 'UPDATE_GFX':
          engineApiRef.current?.updateGfx(action.partial);
          break;
        case 'SET_AUTO_QUALITY':
          handleToggleAutoQuality(action.enabled);
          break;
        case 'SET_BATTERY_SAVER':
          handleToggleBatterySaver(action.enabled);
          break;
        case 'SET_LOW_DATA_MODE':
          handleToggleLowDataMode(action.enabled);
          break;
        case 'SET_VIEW_DISTANCE_MODE':
          handleChangeViewDistanceMode(action.mode);
          break;
        case 'SET_SHOW_FPS_HUD':
          handleToggleShowFpsHud(action.enabled);
          break;
        case 'SET_SHOW_PERF_PROFILER':
          handleTogglePerfProfiler(action.enabled);
          break;
        case 'SET_SKIN_FX_MODE':
          handleChangeSkinFxMode(action.mode);
          break;
        case 'SET_SHOW_AD_BILLBOARDS':
          handleToggleShowAdBillboards(action.enabled);
          break;
        case 'SET_SENSITIVITY':
          engineApiRef.current?.setSensitivity(action.value);
          break;
        case 'SET_ADS_SENSITIVITY':
          engineApiRef.current?.setAdsSensitivity(action.value);
          break;
        case 'SET_HUD_LAYOUT':
          handleChangeHudLayoutPreset(action.preset);
          break;
        case 'SET_HUD_SCALE':
          setHudScale(action.value);
          break;
        case 'SET_HUD_OPACITY':
          setHudOpacity(action.value);
          break;
        case 'SET_MINIMAL_HUD':
          handleToggleMinimalHud(action.enabled);
          break;
        case 'SET_CONTROLS_STYLE':
          handleChangeControlsStyle(action.style);
          break;
        case 'SET_CROSSHAIR_SIZE':
          handleChangeCrosshairSize(action.value);
          break;
        case 'SET_CROSSHAIR_STYLE':
          handleChangeCrosshairStyle(action.style);
          break;
        case 'SET_SHOW_LEAN_BUTTONS':
          handleToggleLeanHudButtons(action.enabled);
          break;
        case 'SET_BOT_DIFFICULTY':
          engineApiRef.current?.setBotDifficulty(action.difficulty);
          break;
        case 'SET_AIM_ASSIST_STRENGTH':
          handleChangeAimAssistStrength(action.value);
          break;
        case 'SET_AUTO_RELOAD':
          handleToggleAutoReload(action.enabled);
          break;
        case 'SET_VIBRATION':
          handleToggleVibration(action.enabled);
          break;
        case 'SET_TOUCH_SETTING':
          setTouchSetting(action.mode);
          break;
        case 'SET_SLIDE_ALPHA':
          handleToggleSlideAlpha(action.enabled);
          break;
        case 'SET_CAMERA_MOTION_INTENSITY':
          handleChangeCameraMotionIntensity(action.value);
          break;
        case 'SET_REDUCED_MOTION':
          handleToggleReducedMotion(action.enabled);
          break;
        case 'SET_SOUND_ENABLED':
          engineApiRef.current?.setSoundEnabled(action.enabled);
          break;
        case 'SET_FOOTSTEP_VOLUME':
          handleChangeFootstepVolume(action.value);
          break;
        case 'SET_VOICE_MODE':
          engineApiRef.current?.setVoiceMode(action.mode);
          break;
        case 'SET_VOICE_VOLUME':
          engineApiRef.current?.setVoiceVolume(action.value);
          break;
        case 'SET_VOICE_CHANNEL_SCOPE':
          engineApiRef.current?.setVoiceChannelScope(action.scope);
          break;
        case 'TOGGLE_MUTE_VOICE_PLAYER':
          engineApiRef.current?.toggleMuteVoicePlayer(action.playerId);
          break;
        case 'SET_ONLINE_PLAYER_NAME':
          onlinePlayerNameRef.current = action.name;
          setOnlinePlayerName(action.name);
          break;
        case 'SET_SHOW_PING_HUD':
          handleToggleShowPingHud(action.enabled);
          break;
        case 'SET_CHEAT_PASSWORD_INPUT':
          setCheatPasswordInput(action.value);
          break;
        case 'SET_CHEAT_PASS_ERROR':
          setCheatPassError(action.message);
          break;
        case 'UNLOCK_CHEATS':
          setCheatUnlocked(true);
          setCheatUnlockRemainingSec(CHEAT_UNLOCK_DURATION_SEC);
          setCheatPassError(null);
          break;
        case 'RELOCK_CHEATS':
          setCheatUnlocked(false);
          setCheatUnlockRemainingSec(0);
          setCheatPasswordInput('');
          engineApiRef.current?.updateCheats({ aimAssistEnabled: true, aimAssistStrength: 10 });
          break;
        case 'UPDATE_CHEATS':
          engineApiRef.current?.updateCheats(action.partial);
          break;
        case 'RESET_ALL_SETTINGS':
          handleResetAllSettings();
          break;
        case 'UNLOCK_REDEEM_REWARD':
          handleUnlockRewardFromRedeem(action.rewardId);
          break;
        case 'EQUIP_REDEEM_REWARD':
          handleEquipRewardFromRedeem(action.rewardId);
          break;
        case 'FEEDBACK': {
          const mappedKind: UiFeedbackKind =
            action.kind === 'confirm' ? 'primary' : action.kind === 'cancel' ? 'back' : action.kind;
          handleUiFeedback(mappedKind);
          break;
        }
        case 'PLAY_REDEEM_SFX': {
          const api = engineApiRef.current;
          if (!api) break;
          if (action.sfx === 'reveal') api.playSpinReveal((action.arg as CosmeticItem['rarity']) || 'legendary');
          else if (action.sfx === 'ak') api.playAKShot();
          else if (action.sfx === 'infernoKill') api.playInfernoKill(Boolean(action.arg));
          else if (action.sfx === 'voidShot') api.playVoidShot();
          else if (action.sfx === 'voidKill') api.playVoidKill(Boolean(action.arg));
          else if (action.sfx === 'voidScope') api.playVoidScopeToggle(Boolean(action.arg));
          else if (action.sfx === 'tempestShot') api.playTempestShot(Number(action.arg) || 0);
          else if (action.sfx === 'tempestKill') api.playTempestKill(Boolean(action.arg));
          else if (action.sfx === 'tempestReload')
            api.playTempestReloadPhase(action.arg as 'open' | 'swap' | 'close' | 'charge');
          else if (action.sfx === 'tempestInspect') api.playTempestInspect();
          else if (action.sfx === 'tempestEmote') api.playTempestEmote();
          else if (action.sfx === 'eclipseShot') api.playEclipseShot();
          else if (action.sfx === 'eclipseKill') api.playEclipseKill(Boolean(action.arg));
          else if (action.sfx === 'eclipseReload') api.playEclipseReloadPhase(action.arg as 'shell' | 'pump');
          else if (action.sfx === 'eclipseSight') api.playEclipseSightToggle(Boolean(action.arg));
          else if (action.sfx === 'eclipseInspect') api.playEclipseInspect();
          else if (action.sfx === 'eclipseEmote') api.playEclipseEmote();
          else if (action.sfx === 'sakuraSlash') api.playSakuraSlash();
          else if (action.sfx === 'sakuraKill') api.playSakuraKill(Boolean(action.arg));
          else if (action.sfx === 'novaRpgLaunch') api.playNovaRpgLaunch();
          else if (action.sfx === 'novaRpgExplosion') api.playNovaRpgExplosion();
          else if (action.sfx === 'novaRpgKill') api.playNovaRpgKill(Boolean(action.arg));
          break;
        }
      }
    },
    [
      playMode,
      trainingConfig,
      handleResetCustomControlLayout,
      handleExitOgMode,
      toggleFullscreen,
      handleSelectUiVersion,
      handleToggleReduceTransparency,
      handleToggleUiClickSound,
      handleToggleUiHaptics,
      handleToggleLoadoutWeapon,
      handleToggleAutoQuality,
      handleToggleBatterySaver,
      handleToggleLowDataMode,
      handleChangeViewDistanceMode,
      handleToggleShowFpsHud,
      handleTogglePerfProfiler,
      handleChangeSkinFxMode,
      handleToggleShowAdBillboards,
      handleChangeHudLayoutPreset,
      handleChangeCrosshairSize,
      handleChangeCrosshairStyle,
      handleToggleLeanHudButtons,
      handleChangeAimAssistStrength,
      handleToggleAutoReload,
      handleToggleVibration,
      handleToggleSlideAlpha,
      handleChangeCameraMotionIntensity,
      handleToggleReducedMotion,
      handleChangeFootstepVolume,
      handleToggleShowPingHud,
      handleToggleMinimalHud,
      handleChangeControlsStyle,
      handleResetAllSettings,
      handleUnlockRewardFromRedeem,
      handleEquipRewardFromRedeem,
      handleUiFeedback,
    ]
  );

  return (
    <>
      <div id="canvas-mount" ref={canvasMountRef} />

      {/* Minimal Boot Loading Overlay with % Progress & WebGL Error Recovery */}
      {!bootProgress.ready && (
        <div className="boot-loading-overlay" data-testid="boot-loading-overlay" dir="rtl">
          <div className="boot-loading-card">
            <div className="boot-loading-title">
              BODY<span>CAM</span> VANGUARD
            </div>
            {bootError ? (
              <div data-testid="boot-error-panel" className="mt-3 flex flex-col gap-3">
                <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-xs leading-relaxed text-rose-200">
                  {bootError}
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => void hardResetAndReload()}
                    className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-400 cursor-pointer"
                  >
                    پاکسازی کش و بارگذاری مجدد
                  </button>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-700 cursor-pointer"
                  >
                    تلاش مجدد
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="boot-loading-sub">{bootProgress.labelFa}</div>
                <div className="boot-loading-bar">
                  <div className="boot-loading-fill" style={{ width: `${bootProgress.pct}%` }} />
                </div>
                <div className="boot-loading-pct">{bootProgress.pct}%</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hidden-by-Default Lightweight Performance Profiler Panel (Zero 60Hz React re-renders) */}
      {showPerfProfiler && (
        <div className="perf-profiler-panel" data-testid="perf-profiler-panel" dir="ltr">
          <div className="perf-row">
            <span className="perf-k">FPS</span>
            <span className="perf-v" id="perf-fps">--</span>
          </div>
          <div className="perf-row">
            <span className="perf-k">Frame</span>
            <span className="perf-v" id="perf-ft">-- ms</span>
          </div>
          <div className="perf-row">
            <span className="perf-k">Draws</span>
            <span className="perf-v" id="perf-calls">--</span>
          </div>
          <div className="perf-row">
            <span className="perf-k">Tris</span>
            <span className="perf-v" id="perf-tris">--</span>
          </div>
          <div className="perf-row">
            <span className="perf-k">Particles</span>
            <span className="perf-v" id="perf-particles">--</span>
          </div>
          <div className="perf-row">
            <span className="perf-k">Mat/Tex</span>
            <span className="perf-v" id="perf-mats-tex">--</span>
          </div>
          <div className="perf-row">
            <span className="perf-k">Heap</span>
            <span className="perf-v" id="perf-mem">--</span>
          </div>
          <div className="perf-row">
            <span className="perf-k">Ping</span>
            <span className="perf-v" id="perf-ping">--</span>
          </div>
          <div className="perf-row">
            <span className="perf-k">AutoQ</span>
            <span className="perf-v" id="perf-aq">کامل</span>
          </div>
        </div>
      )}

      {/* Bodycam Frame Brackets */}
      <div className="cam-frame">
        <div className="cam-corner cc-tl" />
        <div className="cam-corner cc-tr" />
        <div className="cam-corner cc-bl" />
        <div className="cam-corner cc-br" />
      </div>

      <div id="damage-vignette" />
      <div id="power-vignette" />
      <div id="pickup-flash" />
      <div
        id="inferno-kill-flash"
        className={infernoEdgeFlash !== 'none' ? `active is-${infernoEdgeFlash}` : undefined}
        aria-hidden="true"
      />
      <div
        id="void-kill-flash"
        className={voidEdgeFlash !== 'none' ? `active is-${voidEdgeFlash}` : undefined}
        aria-hidden="true"
      />
      <div
        id="mythic-kill-flash"
        className={mythicEdgeFlash !== 'none' ? `active is-${mythicEdgeFlash}` : undefined}
        aria-hidden="true"
      />
      <div
        id="eclipse-kill-flash"
        className={eclipseEdgeFlash !== 'none' ? `active is-${eclipseEdgeFlash}` : undefined}
        aria-hidden="true"
      />
      {spinRewardToast && (
        <div className="spin-reward-toast" dir="rtl" role="status" data-testid="spin-reward-toast">
          <span className="spin-toast-icon" aria-hidden="true">✦</span>
          <span>{spinRewardToast}</span>
        </div>
      )}

      {/* Sniper 8X Optical Scope Reticle Overlay (Futuristic Holographic for Void Piercer; Classic Mil-Dot for Default — Identical FOV & Gameplay) */}
      {isSniperScoped && (screenState === 'playing' || screenState === 'paused') && (
        ogFeatures.skinsAndCollection && gameplayEquipped.sniper_skin === LEGENDARY_SNIPER_ID ? (
          <VoidSniperScope
            simplified={reducedMotion || gfxState.preset === 'low' || gfxState.preset === 'potato'}
          />
        ) : (
          <div id="sniper-scope-overlay" data-testid="sniper-scope-overlay">
            <svg className="sniper-reticle-svg" viewBox="0 0 400 400" fill="none" aria-hidden="true">
              <circle cx="200" cy="200" r="192" stroke="rgba(148, 163, 184, 0.45)" strokeWidth="2" />
              <circle cx="200" cy="200" r="130" stroke="rgba(56, 189, 248, 0.18)" strokeWidth="1" strokeDasharray="4 4" />
              {/* Thick outer stadia bars */}
              <line x1="8" y1="200" x2="115" y2="200" stroke="rgba(15, 23, 42, 0.95)" strokeWidth="3.2" />
              <line x1="285" y1="200" x2="392" y2="200" stroke="rgba(15, 23, 42, 0.95)" strokeWidth="3.2" />
              <line x1="200" y1="8" x2="200" y2="115" stroke="rgba(15, 23, 42, 0.95)" strokeWidth="3.2" />
              <line x1="200" y1="285" x2="200" y2="392" stroke="rgba(15, 23, 42, 0.95)" strokeWidth="3.2" />
              {/* Fine inner crosshairs */}
              <line x1="115" y1="200" x2="195" y2="200" stroke="rgba(226, 232, 240, 0.85)" strokeWidth="1.1" />
              <line x1="205" y1="200" x2="285" y2="200" stroke="rgba(226, 232, 240, 0.85)" strokeWidth="1.1" />
              <line x1="200" y1="115" x2="200" y2="195" stroke="rgba(226, 232, 240, 0.85)" strokeWidth="1.1" />
              <line x1="200" y1="205" x2="200" y2="285" stroke="rgba(226, 232, 240, 0.85)" strokeWidth="1.1" />
              {/* Mil-Dot ticks */}
              {[-60, -40, -20, 20, 40, 60].map((offset) => (
                <g key={offset}>
                  <line
                    x1={200 + offset}
                    y1="196.5"
                    x2={200 + offset}
                    y2="203.5"
                    stroke="rgba(56, 189, 248, 0.85)"
                    strokeWidth="1.2"
                  />
                  <line
                    x1="196.5"
                    y1={200 + offset}
                    x2="203.5"
                    y2={200 + offset}
                    stroke="rgba(56, 189, 248, 0.85)"
                    strokeWidth="1.2"
                  />
                </g>
              ))}
              {/* Illuminated center chevron dot */}
              <circle cx="200" cy="200" r="2.3" fill="#ff2e4c" />
            </svg>
          </div>
        )
      )}

      {/* Exclusive Mythic SPAS-12 Eclipse Breacher Holographic Ring ADS Sight (Purely Cosmetic; Identical FOV & Sensitivity) */}
      {isEclipseAdsSight && (screenState === 'playing' || screenState === 'paused') && (
        <EclipseShotgunSight
          simplified={reducedMotion || gfxState.preset === 'low' || gfxState.preset === 'potato'}
        />
      )}

      {/* Exclusive Mythic M249 Tempest Aegis Holographic Wing ADS Sight (Purely Cosmetic; Identical FOV & Sensitivity) */}
      {isTempestAdsSight && (screenState === 'playing' || screenState === 'paused') && (
        <TempestLmgSight
          simplified={reducedMotion || gfxState.preset === 'low' || gfxState.preset === 'potato'}
        />
      )}

      {/* Minimal Top-Right Controls Bar (FPS hidden by default; Ping tiny & subtle; Scoreboard hold button) */}
      <div id="top-right-bar">
        {isOgMode && (
          <span className="og-hud-badge" data-testid="hud-og-badge">
            OG
          </span>
        )}
        {onlineRoom && showPingHud && ogFeatures.pingHudAndAdvancedLobby && pingMs !== null && (() => {
          const pq = classifyPingQuality(pingMs);
          return (
            <div
              className="ping-readout"
              data-testid="hud-ping-indicator"
              data-ping-quality={pq.quality}
              title={`پینگ اتصال به میزبان: ${pingMs} میلی‌ثانیه (${pq.labelFa})`}
            >
              <span className="ping-dot" style={{ background: pq.color }} />
              <span className="ping-val" style={{ color: pq.color }}>
                {pingMs}ms
              </span>
            </div>
          );
        })()}
        <div
          className="fps-readout"
          data-testid="hud-fps-readout"
          style={{ display: showFpsHud ? 'inline-flex' : 'none' }}
        >
          <span>FPS</span>
          <span id="fps-value">60</span>
        </div>
        {screenState === 'playing' && onlineRoom && isTeamCommsMode(onlineRoom.mode) && (
          <>
            <button
              id="btn-team-ping"
              data-testid="btn-team-ping"
              type="button"
              title="علامت‌گذاری نقطه برای هم‌تیمی‌ها (G یا لمس طولانی)"
              aria-label="Team Tactical Ping"
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                engineApiRef.current?.sendTeamPingAtReticle(0, 0);
                e.currentTarget.blur();
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-6-5.33-6-10a6 6 0 1 1 12 0c0 4.67-6 10-6 10z" />
                <circle cx="12" cy="11" r="2" />
              </svg>
            </button>
            <button
              id="btn-quick-comms"
              data-testid="btn-quick-comms"
              type="button"
              className={quickCommsOpen ? 'active' : ''}
              title="پیام سریع برای هم‌تیمی‌ها (T)"
              aria-label="Team Quick Messages"
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                setQuickCommsOpen((prev) => !prev);
                e.currentTarget.blur();
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          </>
        )}
        {screenState === 'playing' && (
          <button
            id="btn-scoreboard"
            data-testid="hud-scoreboard-btn"
            type="button"
            title="جدول امتیاز (نگه دارید یا Tab)"
            aria-label="Hold to view Scoreboard"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowScoreboard(true);
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              setShowScoreboard(false);
            }}
            onPointerCancel={() => setShowScoreboard(false)}
            onPointerLeave={() => setShowScoreboard(false)}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>
        )}
        <button
          id="btn-top-fullscreen"
          data-testid="btn-top-fullscreen"
          type="button"
          title="تمام صفحه (Fullscreen)"
          aria-label="Toggle Fullscreen"
          onClick={(e) => {
            e.currentTarget.blur();
            toggleFullscreen();
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {isFullscreen ? (
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
            ) : (
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            )}
          </svg>
        </button>
        <button
          id="btn-settings-open"
          type="button"
          title="تنظیمات و منو"
          aria-label="Open Settings"
          onClick={(e) => {
            e.currentTarget.blur();
            if (showSettingsModal) {
              if (screenState === 'paused') engineApiRef.current?.resumeSession();
              else setShowSettingsModal(false);
            } else {
              if (screenState === 'playing') engineApiRef.current?.pauseSession();
              else openModalUrgent('settings', () => setShowSettingsModal(true));
            }
          }}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* PWA New Version Update Prompt Banner */}
      {pwaUpdateReady && (
        <div className="pwa-update-banner" data-testid="pwa-update-banner" dir="rtl">
          <span>نسخهٔ جدید آماده است، رفرش کن</span>
          <button
            type="button"
            data-testid="btn-pwa-refresh"
            className="pwa-update-btn"
            onClick={() => {
              if (pwaUpdateFnRef.current) {
                void pwaUpdateFnRef.current(true);
              } else {
                window.location.reload();
              }
            }}
          >
            رفرش
          </button>
        </div>
      )}

      {/* Playing HUD — Minimal, Clean & Translucent */}
      <div id="hud" style={{ display: screenState === 'playing' || screenState === 'paused' ? 'block' : 'none' }}>
        {/* Stage 2: Projected Team-Only Tactical Ping Markers on HUD (5s TTL) */}
        {onlineRoom &&
          isTeamCommsMode(onlineRoom.mode) &&
          projectedTeamPings.map((tp) => (
            <div
              key={tp.id}
              data-testid="hud-team-ping-marker"
              className={`hud-team-ping-marker team-${tp.team}${tp.offscreen ? ' offscreen' : ''}`}
              style={{ left: `${tp.xPct}%`, top: `${tp.yPct}%` }}
            >
              <span className="ping-diamond" />
              <span className="ping-meta">
                {tp.senderName} · {tp.distM}m
              </span>
            </div>
          ))}

        {/* Stage 2: Minimal Compact Quick-Comms Popover (Team Modes Only) */}
        {screenState === 'playing' && quickCommsOpen && onlineRoom && isTeamCommsMode(onlineRoom.mode) && (
          <div
            className="quick-comms-popover"
            data-testid="quick-comms-menu"
            dir="rtl"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {TEAM_QUICK_MESSAGES.map((m) => (
              <button
                key={m.id}
                type="button"
                data-testid={`quick-msg-${m.id}`}
                className="quick-comms-item"
                onClick={(e) => {
                  e.stopPropagation();
                  engineApiRef.current?.sendTeamQuickMessage(m.id);
                  setQuickCommsOpen(false);
                }}
              >
                {m.textFa}
              </button>
            ))}
          </div>
        )}

        {/* Stage 2: Minimal Team-Only Quick Message Toasts */}
        {onlineRoom && isTeamCommsMode(onlineRoom.mode) && teamQuickMsgs.length > 0 && (
          <div className="hud-team-comms-stack" dir="rtl">
            {teamQuickMsgs.map((tm) => (
              <div
                key={tm.id}
                data-testid="hud-team-quick-msg"
                className={`hud-team-quick-msg team-${tm.team}`}
              >
                <span className="qmsg-sender">{tm.senderName}:</span>
                <span className="qmsg-text">{tm.textFa}</span>
              </div>
            ))}
          </div>
        )}

        <div className="hud-top-left">
          <div className="radar-wrap">
            <canvas id="radar-canvas" ref={radarCanvasRef} width="120" height="120" />
          </div>

          <div className="hud-left-stack">
            {/* Minimal frameless wave/score text ONLY in offline campaign (hidden in online round mode & training) */}
            {playMode === 'campaign' && !(onlineRoom && isRoundBasedMode(onlineRoom.mode)) && (
              <div className="wave-readout-line" dir="rtl">
                <span>
                  موج <b className="c-wave" id="hud-wave">1</b>
                </span>
                <span className="hud-sep">·</span>
                <span>
                  دشمن <b className="c-en" id="hud-enemies">0</b>
                </span>
                <span className="hud-sep">·</span>
                <span>
                  امتیاز <b className="c-sc" id="hud-score">0</b>
                </span>
              </div>
            )}

            {/* Minimal Active Voice Speakers Indicator (only visible when someone actually speaks or audio unlock needed) */}
            {onlineRoom && (voiceState.speakingPlayerIds.length > 0 || voiceState.autoplayBlocked) && (
              effectiveUiVersion === 'v3' ? (
                <VoiceSpeakersV3
                  speakingNames={hudVoiceSpeakingNames}
                  autoplayBlocked={voiceState.autoplayBlocked}
                  onUnlockAudio={handleUnlockVoiceAudio}
                />
              ) : (
                <div className="hud-voice-speakers" data-testid="hud-voice-speakers" dir="rtl">
                  {voiceState.speakingPlayerIds.map((sid) => {
                    const sp = onlineRoom.players.find((p) => p.id === sid);
                    const label = sp ? sp.name : sid === localOnlinePlayerId ? onlinePlayerName : 'بازیکن';
                    return (
                      <span key={sid} className="hud-voice-speaker-pill">
                        <span className="voice-speaking-dot" />
                        {label}
                      </span>
                    );
                  })}
                  {voiceState.autoplayBlocked && (
                    <button
                      type="button"
                      className="hud-voice-unlock-btn"
                      data-testid="hud-voice-unlock-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        engineApiRef.current?.unlockVoiceAudio();
                      }}
                    >
                      باز کردن صدا
                    </button>
                  )}
                </div>
              )
            )}
          </div>
        </div>

        {/* Interactive Training Mode & Tutorial Overlay */}
        {playMode === 'training' && (
          <Suspense fallback={null}>
            <TutorialOverlay
              tutorialState={tutorialState}
              trainingConfig={trainingConfig}
              onSelectStep={handleSelectTutorialStep}
              onCompleteCurrentStep={handleCompleteCurrentStep}
              onResetTutorial={handleResetTutorial}
              onSpawnBot={() => engineApiRef.current?.spawnPracticeBot()}
              onClearBots={() => engineApiRef.current?.clearAllBots()}
              onRefillAll={() => engineApiRef.current?.refillPlayerAndAmmo()}
              onOpenTrainingConfig={() => {
                openModalUrgent('training', () => {
                  engineApiRef.current?.pauseSession();
                  setShowSettingsModal(false);
                  setShowTrainingModal(true);
                });
              }}
            />
          </Suspense>
        )}

        {/* Single-Line Ultra-Compact Top-Center Team Round Scoreboard (<= 6vh height) */}
        {effectiveUiVersion === 'v3' ? (
          <RoundBarV3
            playMode={playMode}
            mode={onlineRoom?.mode ?? null}
            alphaScore={onlineRoom?.alphaScore}
            bravoScore={onlineRoom?.bravoScore}
            currentRound={onlineRoom?.currentRound}
            targetWinRounds={onlineRoom?.targetWinRounds}
            roundPhase={onlineRoom?.roundPhase}
            roundTimeRemainingSec={onlineRoom?.roundTimeRemainingSec}
            roundCountdownSec={roundCountdownSec}
            matchWinnerTeam={onlineRoom?.matchWinnerTeam}
          />
        ) : (
          playMode !== 'training' && onlineRoom && isRoundBasedMode(onlineRoom.mode) && (
            <div
              id="hud-cod-round-bar"
              data-testid="hud-cod-round-bar"
              className="hud-cod-round-bar"
              dir="rtl"
            >
              {/* Team Alpha Score */}
              <div className="cod-team-chip alpha">
                <span className="cod-team-dot" style={{ background: getTeamColor('alpha') }} />
                <span className="cod-team-label cod-label-full">{getTeamNameFa('alpha')}</span>
                <span className="cod-team-label cod-label-short">آلفا</span>
                <strong className="cod-team-score" data-testid="hud-alpha-score">
                  {onlineRoom.alphaScore ?? 0}
                </strong>
              </div>

              {/* Single-line Round Counter & Countdown Clock */}
              <div className="cod-center-meta">
                <span className="cod-round-tag" data-testid="hud-round-number">
                  راند {onlineRoom.currentRound ?? 1}/{onlineRoom.targetWinRounds ?? ROUND_MATCH_WIN_SCORE}
                </span>
                <span className="hud-sep">·</span>
                <span
                  className="cod-round-clock"
                  data-testid="hud-round-timer"
                  style={{
                    color:
                      onlineRoom.roundPhase === 'countdown'
                        ? '#38bdf8'
                        : (onlineRoom.roundTimeRemainingSec ?? 90) <= 15
                          ? '#f43f5e'
                          : '#f1f5f9',
                  }}
                >
                  {onlineRoom.roundPhase === 'match_over'
                    ? `برنده: ${getTeamNameFa(onlineRoom.matchWinnerTeam ?? 'alpha')}`
                    : onlineRoom.roundPhase === 'countdown'
                      ? `${['۰', '۱', '۲', '۳'][roundCountdownSec] ?? roundCountdownSec}`
                      : onlineRoom.roundPhase === 'intermission'
                        ? 'راند بعد...'
                        : formatRoundClock(onlineRoom.roundTimeRemainingSec ?? 90)}
                </span>
              </div>

              {/* Team Bravo Score */}
              <div className="cod-team-chip bravo">
                <strong className="cod-team-score" data-testid="hud-bravo-score">
                  {onlineRoom.bravoScore ?? 0}
                </strong>
                <span className="cod-team-label cod-label-full">{getTeamNameFa('bravo')}</span>
                <span className="cod-team-label cod-label-short">براوو</span>
                <span className="cod-team-dot" style={{ background: getTeamColor('bravo') }} />
              </div>
            </div>
          )
        )}

        {/* 3-Second Round Start Countdown Overlay */}
        {effectiveUiVersion === 'v3' ? (
          <RoundCountdownV3
            roundCountdownSec={roundCountdownSec}
            mode={onlineRoom?.mode ?? null}
            currentRound={onlineRoom?.currentRound}
          />
        ) : (
          roundCountdownSec > 0 && onlineRoom && isRoundBasedMode(onlineRoom.mode) && (
            <div className="round-countdown-overlay" data-testid="round-countdown-overlay" dir="rtl">
              <div key={roundCountdownSec} className="round-countdown-digit" data-testid="round-countdown-digit">
                {['۰', '۱', '۲', '۳'][roundCountdownSec] ?? roundCountdownSec}
              </div>
              <div className="round-countdown-label">
                راند {onlineRoom.currentRound ?? 1}
              </div>
            </div>
          )
        )}

        {/* Lightweight 2-Second Spawn Protection Indicator */}
        {effectiveUiVersion === 'v3' ? (
          <SpawnProtectionV3 visible={localSpawnProtected && !spectatorInfo.active && roundCountdownSec === 0} />
        ) : (
          localSpawnProtected && !spectatorInfo.active && roundCountdownSec === 0 && (
            <div className="spawn-protection-badge" data-testid="spawn-protection-badge" dir="rtl">
              <span className="spawn-protection-dot" />
              <span>محافظت اسپاون</span>
            </div>
          )
        )}

        {/* Post-Death Spectator Banner */}
        {effectiveUiVersion === 'v3' ? (
          <SpectatorBannerV3
            active={spectatorInfo.active}
            targetName={spectatorInfo.targetName}
            targetTeam={spectatorInfo.targetTeam}
            aliveCount={spectatorInfo.aliveCount}
            onNextTarget={handleCycleSpectator}
          />
        ) : (
          spectatorInfo.active && (
            <div className="spectator-banner" data-testid="spectator-banner" dir="rtl">
              <span>تماشا:</span>
              <strong
                data-testid="spectator-target-name"
                style={{ color: getTeamColor(spectatorInfo.targetTeam) }}
              >
                {spectatorInfo.targetName || 'نمای میدان'}
              </strong>
              {spectatorInfo.aliveCount > 1 && (
                <button
                  type="button"
                  className="spectator-switch-btn"
                  data-testid="btn-spectate-next"
                  onClick={(e) => {
                    e.stopPropagation();
                    engineApiRef.current?.cycleSpectatorTarget(1);
                  }}
                >
                  بعدی
                </button>
              )}
            </div>
          )
        )}

        {/* Short 1-2 Minute Guided Offline Tutorial Minimal HUD Card */}
        {screenState === 'playing' && quickTutorial?.active && !onlineRoom && (() => {
          const totalSteps = quickTutorial.steps.length;
          const activeStep = quickTutorial.steps[quickTutorial.currentIndex];
          const doneCount = quickTutorial.steps.filter((s) => s.completed).length;
          const pct = quickTutorial.completedAll
            ? 100
            : Math.round(((doneCount + (activeStep ? activeStep.progress / Math.max(0.01, activeStep.target) : 0)) / Math.max(1, totalSteps)) * 100);
          return (
            <div className="quick-tutorial-hud" data-testid="quick-tutorial-hud" dir="rtl">
              <div className="qt-top-row">
                <div className="qt-kicker">
                  <span>آموزش کوتاه</span>
                  <span className="qt-step-pill" data-testid="qt-step-counter" dir="ltr">
                    {quickTutorial.completedAll ? `${totalSteps}/${totalSteps}` : `${quickTutorial.currentIndex + 1}/${totalSteps}`}
                  </span>
                </div>
                {!quickTutorial.completedAll && (
                  <button
                    type="button"
                    className="qt-skip-btn"
                    data-testid="btn-skip-quick-tutorial"
                    onClick={(e) => {
                      e.stopPropagation();
                      engineApiRef.current?.skipQuickTutorial(true);
                    }}
                  >
                    رد کردن
                  </button>
                )}
              </div>

              {quickTutorial.completedAll ? (
                <>
                  <div className="qt-title" data-testid="qt-step-title">
                    آموزش کامل شد! آماده نبرد هستید
                  </div>
                  <div className="qt-hint">
                    هر زمان خواستید می‌توانید از «بخش تمرین و آموزش» دوباره اجرا کنید.
                  </div>
                  <div className="qt-done-actions">
                    <button
                      type="button"
                      className="qt-done-btn"
                      data-testid="btn-finish-quick-tutorial-play"
                      onClick={(e) => {
                        e.stopPropagation();
                        engineApiRef.current?.skipQuickTutorial(true);
                      }}
                    >
                      شروع بازی آفلاین
                    </button>
                    <button
                      type="button"
                      className="qt-done-btn secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        engineApiRef.current?.skipQuickTutorial(false);
                      }}
                    >
                      منوی اصلی
                    </button>
                  </div>
                </>
              ) : (
                activeStep && (
                  <>
                    <div className="qt-title" data-testid="qt-step-title">
                      {activeStep.titleFa}
                      {activeStep.id === 'shoot' && (
                        <span style={{ color: '#7dd3fc', marginRight: '6px', fontSize: '11px' }}>
                          ({Math.floor(activeStep.progress)}/{activeStep.target})
                        </span>
                      )}
                    </div>
                    <div className="qt-hint">{activeStep.hintFa}</div>
                  </>
                )
              )}

              <div className="qt-progress-track">
                <div className="qt-progress-fill" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
              </div>
            </div>
          );
        })()}

        {/* Subtle Mid-Match Reconnect Banner (30s Grace Window) */}
        {effectiveUiVersion === 'v3' ? (
          <ReconnectBannerV3
            localActive={clientReconnecting.active}
            localRemainingSec={clientReconnecting.remainingSec}
            players={onlineRoom?.players}
            nowMs={reconnectTickNow}
          />
        ) : (
          (clientReconnecting.active || hasReconnectingRemote) && (
            <div className="reconnect-status-banner" data-testid="hud-reconnecting-banner" dir="rtl">
              <span className="reconnect-pulse-dot" />
              {clientReconnecting.active ? (
                <span>
                  در حال اتصال دوباره به میزبان... ({clientReconnecting.remainingSec} ثانیه)
                </span>
              ) : (
                <span>
                  {onlineRoom?.players
                    .filter((p) => p.disconnected)
                    .map((p) => {
                      const rem = p.reconnectDeadlineAt
                        ? Math.max(0, Math.ceil((p.reconnectDeadlineAt - reconnectTickNow) / 1000))
                        : 30;
                      return `بازیکن «${p.name}» در حال اتصال دوباره... (${rem}ث)`;
                    })
                    .join(' · ')}
                </span>
              )}
            </div>
          )
        )}

        {/* Hold-to-View Minimal Scoreboard Overlay (Desktop Tab / Mobile Hold Button) */}
        {showScoreboard && screenState === 'playing' && (
          effectiveUiVersion === 'v3' ? (
            <ScoreboardV3
              onlineRoom={onlineRoom}
              localOnlinePlayerId={localOnlinePlayerId}
              onlinePlayerName={onlinePlayerName}
              cosmeticsState={cosmeticsState}
              offlineKills={gameOverStats.kills}
              offlineScore={gameOverStats.score}
            />
          ) : (
          <div className="hud-scoreboard-overlay" data-testid="hud-scoreboard-overlay" dir="rtl">
            <div className="sb-header">
              <div className="sb-title">
                <span>جدول امتیازات</span>
                {onlineRoom && (
                  <span className="sb-mode-tag">
                    {formatGameModeFa(onlineRoom.mode)} · {onlineRoom.code}
                  </span>
                )}
              </div>
              {onlineRoom && isRoundBasedMode(onlineRoom.mode) && (
                <div className="sb-round-totals">
                  <span style={{ color: getTeamColor('alpha') }}>آلفا {onlineRoom.alphaScore ?? 0}</span>
                  <span className="hud-sep">-</span>
                  <span style={{ color: getTeamColor('bravo') }}>{onlineRoom.bravoScore ?? 0} براوو</span>
                </div>
              )}
            </div>
            <table className="sb-table">
              <thead>
                <tr>
                  <th>بازیکن</th>
                  <th>تیم</th>
                  <th>کشتن</th>
                  <th>مرگ</th>
                  <th>امتیاز</th>
                </tr>
              </thead>
              <tbody>
                {onlineRoom ? (
                  sortScoreboardPlayers(onlineRoom.players).map((p) => {
                    const pTeam: TeamId = p.team || 'alpha';
                    const isMe = p.id === localOnlinePlayerId;
                    const frameMeta = getCosmeticItem(p.cosmetics?.nf);
                    const badgeMeta = getCosmeticItem(p.cosmetics?.nb);
                    return (
                      <tr key={p.id} className={isMe ? 'sb-row-me' : undefined}>
                        <td className="sb-name-cell">
                          <span className="sb-dot" style={{ background: getTeamColor(pTeam) }} />
                          <span
                            className={frameMeta ? 'sb-player-framed' : undefined}
                            style={
                              frameMeta
                                ? {
                                    borderColor: frameMeta.colorHex,
                                    background: frameMeta.accentHex || 'rgba(15,23,42,0.75)',
                                  }
                                : undefined
                            }
                          >
                            {badgeMeta?.symbol && (
                              <span
                                className="cosmetic-inline-badge"
                                style={{ color: badgeMeta.colorHex }}
                                title={badgeMeta.nameFa}
                              >
                                {badgeMeta.symbol}
                              </span>
                            )}
                            <span>{p.name}</span>
                          </span>
                          {p.isBot && <span className="sb-tag">BOT</span>}
                          {p.id === onlineRoom.hostId && <span className="sb-tag">HOST</span>}
                          {p.disconnected && <span className="sb-tag sb-tag-warn">اتصال مجدد</span>}
                        </td>
                        <td style={{ color: getTeamColor(pTeam), fontWeight: 700 }}>
                          {pTeam === 'alpha' ? 'آلفا' : 'براوو'}
                        </td>
                        <td className="sb-num">{p.kills}</td>
                        <td className="sb-num">{p.deaths ?? 0}</td>
                        <td className="sb-num">{p.score ?? 0}</td>
                      </tr>
                    );
                  })
                ) : (
                  (() => {
                    const localFrame = getCosmeticItem(gameplayEquipped.name_frame);
                    const localBadge = getCosmeticItem(gameplayEquipped.name_badge);
                    return (
                      <tr className="sb-row-me">
                        <td className="sb-name-cell">
                          <span className="sb-dot" style={{ background: getTeamColor('alpha') }} />
                          <span
                            className={localFrame ? 'sb-player-framed' : undefined}
                            style={
                              localFrame
                                ? {
                                    borderColor: localFrame.colorHex,
                                    background: localFrame.accentHex || 'rgba(15,23,42,0.75)',
                                  }
                                : undefined
                            }
                          >
                            {localBadge?.symbol && (
                              <span
                                className="cosmetic-inline-badge"
                                style={{ color: localBadge.colorHex }}
                                title={localBadge.nameFa}
                              >
                                {localBadge.symbol}
                              </span>
                            )}
                            <span>{onlinePlayerName}</span>
                          </span>
                        </td>
                        <td style={{ color: getTeamColor('alpha'), fontWeight: 700 }}>آلفا</td>
                        <td className="sb-num">{gameOverStats.kills}</td>
                        <td className="sb-num">0</td>
                        <td className="sb-num">{gameOverStats.score}</td>
                      </tr>
                    );
                  })()
                )}
              </tbody>
            </table>
          </div>
          )
        )}

        {/* Stage 2 Liquid Glass Round-End Intermission Banner (Zero-Blur) */}
        {effectiveUiVersion === 'v3' &&
          screenState === 'playing' &&
          onlineRoom &&
          isRoundBasedMode(onlineRoom.mode) &&
          onlineRoom.roundPhase === 'intermission' && (
            <RoundIntermissionV3 onlineRoom={onlineRoom} />
          )}

        {/* Post-Match Result, Rematch & Map Voting Overlay (Round-Based Match Over) */}
        {screenState === 'playing' &&
          onlineRoom &&
          isRoundBasedMode(onlineRoom.mode) &&
          onlineRoom.roundPhase === 'match_over' &&
          (effectiveUiVersion === 'v3' ? (
            <MatchResultV3
              onlineRoom={onlineRoom}
              localOnlinePlayerId={localOnlinePlayerId}
              cheatConfig={cheatConfig}
              onVoteMap={(m) => engineApiRef.current?.voteOnlineMap(m)}
              onVoteRematch={(ready) => engineApiRef.current?.voteOnlineRematch(ready)}
              onExit={() => {
                engineApiRef.current?.leaveOnlineRoom();
                engineApiRef.current?.returnToTitle();
              }}
            />
          ) : (() => {
            const activePlayers = onlineRoom.players.filter((p) => !p.disconnected && !p.isBot);
            const readyIds = new Set(onlineRoom.rematchReadyPlayerIds || []);
            const readyCount = activePlayers.filter((p) => readyIds.has(p.id)).length;
            const iAmReady = Boolean(localOnlinePlayerId && readyIds.has(localOnlinePlayerId));
            const winnerTeam: TeamId = onlineRoom.matchWinnerTeam || 'alpha';
            const voteRes = resolveMapVoteWinner(onlineRoom as unknown as AuthoritativeRoomState);
            const myMapVote = localOnlinePlayerId ? onlineRoom.mapVotes?.[localOnlinePlayerId] : undefined;
            const winningMapName = (MAP_LIST.find((m) => m.id === voteRes.winnerMapId)?.nameFa || '').split(' (')[0];
            const summaryStats = computeMatchSummaryStats(
              onlineRoom.players.map((p) => ({
                id: p.id,
                name: p.name,
                team: p.team || 'alpha',
                kills: p.kills,
                deaths: p.deaths ?? 0,
                shotsFired: p.shotsFired ?? 0,
                shotsHit: p.shotsHit ?? 0,
                headshots: p.headshots ?? 0,
                score: p.score ?? 0,
              }))
            );

            return (
              <div className="match-result-overlay" data-testid="match-result-overlay" dir="rtl">
                <div className="match-result-card">
                  <div className="mr-kicker">پایان مسابقه · خلاصه آمار</div>
                  <div className="mr-winner" style={{ color: getTeamColor(winnerTeam) }}>
                    برنده: {getTeamNameFa(winnerTeam)}
                  </div>
                  <div className="mr-score-line">
                    <span style={{ color: getTeamColor('alpha') }}>آلفا {onlineRoom.alphaScore ?? 0}</span>
                    <span className="hud-sep">—</span>
                    <span style={{ color: getTeamColor('bravo') }}>{onlineRoom.bravoScore ?? 0} براوو</span>
                  </div>

                  {summaryStats.mvp && (
                    <div className="mr-mvp-banner" data-testid="post-match-mvp-banner">
                      <span className="mr-mvp-label">بهترین بازیکن (MVP)</span>
                      <strong style={{ color: getTeamColor(summaryStats.mvp.team) }}>
                        {summaryStats.mvp.name}
                      </strong>
                      <span className="mr-mvp-meta">
                        {summaryStats.mvp.kills} کشتن · دقت {summaryStats.mvp.accuracyPct}% · {summaryStats.mvp.headshots} هدشات
                      </span>
                    </div>
                  )}

                  <table className="sb-table mr-table" data-testid="post-match-stats-table">
                    <thead>
                      <tr>
                        <th>بازیکن</th>
                        <th>تیم</th>
                        <th>کشتن</th>
                        <th>مرگ</th>
                        <th>دقت</th>
                        <th>هدشات</th>
                        <th>وضعیت</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryStats.rows.map((row) => {
                        const rawP = onlineRoom.players.find((pl) => pl.id === row.id);
                        const isReady = readyIds.has(row.id);
                        return (
                          <tr key={row.id} className={row.isMvp ? 'mr-row-mvp' : undefined}>
                            <td className="sb-name-cell">
                              <span className="sb-dot" style={{ background: getTeamColor(row.team) }} />
                              <span>{row.name}</span>
                              {row.isMvp && <span className="sb-tag mr-mvp-tag">MVP</span>}
                            </td>
                            <td style={{ color: getTeamColor(row.team), fontWeight: 700 }}>
                              {row.team === 'alpha' ? 'آلفا' : 'براوو'}
                            </td>
                            <td className="sb-num">{row.kills}</td>
                            <td className="sb-num">{row.deaths}</td>
                            <td className="sb-num">{row.accuracyPct}%</td>
                            <td className="sb-num">{row.headshots}</td>
                            <td className="sb-num" style={{ color: isReady ? '#34d399' : '#94a3b8' }}>
                              {rawP?.disconnected ? 'قطع' : isReady ? 'آماده' : 'منتظر'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Post-Match Map Voting for Next Rematch */}
                  <div className="map-vote-box" data-testid="rematch-map-vote-bar">
                    <div className="map-vote-header">
                      <span>رأی‌گیری مپ برای دست بعد ({voteRes.totalVotes} رأی)</span>
                      <span className="map-vote-status">
                        {voteRes.totalVotes === 0
                          ? 'در صورت تساوی، میزبان تصمیم می‌گیرد'
                          : voteRes.isTie
                            ? `تساوی — انتخاب میزبان: ${winningMapName}`
                            : `مپ بعدی: ${winningMapName}`}
                      </span>
                    </div>
                    <div className="map-vote-grid">
                      {MAP_LIST.map((m) => {
                        const count = voteRes.counts[m.id] || 0;
                        const voted = myMapVote === m.id;
                        const leading = voteRes.totalVotes > 0 && voteRes.winnerMapId === m.id;
                        const shortName = m.nameFa.split(' (')[0];
                        return (
                          <button
                            key={m.id}
                            type="button"
                            data-testid={`rematch-map-vote-${m.id}`}
                            className={`map-vote-chip${voted ? ' voted' : ''}${leading ? ' leading' : ''}`}
                            onClick={() => engineApiRef.current?.voteOnlineMap(m.id)}
                          >
                            <span className="mv-name">{shortName}</span>
                            <span className="mv-count">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mr-ready-counter" data-testid="rematch-ready-counter">
                    {readyCount} از {activePlayers.length} بازیکن آماده بازی دوباره است
                  </div>

                  <div className="mr-actions">
                    <button
                      type="button"
                      data-testid="btn-rematch-ready"
                      className={`primary-btn mr-btn${iAmReady ? ' ready-confirmed' : ''}`}
                      onClick={() => engineApiRef.current?.voteOnlineRematch(!iAmReady)}
                    >
                      {iAmReady ? 'آماده‌اید (در انتظار بقیه...)' : 'بازی دوباره'}
                    </button>
                    <button
                      type="button"
                      data-testid="btn-match-exit"
                      className="secondary-btn mr-btn"
                      onClick={() => {
                        engineApiRef.current?.leaveOnlineRoom();
                        engineApiRef.current?.returnToTitle();
                      }}
                    >
                      خروج
                    </button>
                  </div>
                </div>
              </div>
            );
          })())}

        <div id="kill-feed" data-testid="kill-feed" dir="rtl" />

        {/* Minimal Crosshair (Size & Style configurable in Settings) */}
        <div
          id="crosshair"
          data-testid="hud-crosshair"
          data-crosshair-style={crosshairStyle}
          data-crosshair-scale={crosshairSize}
          className={crosshairStyle === 'dot' ? 'style-dot' : 'style-cross'}
        >
          <div className="ch-line ch-top" id="ch-top" />
          <div className="ch-line ch-bot" id="ch-bot" />
          <div className="ch-line ch-left" id="ch-left" />
          <div className="ch-line ch-right" id="ch-right" />
          <div className="ch-dot" />
        </div>

        {/* Hitmarker */}
        <svg id="hitmarker" viewBox="0 0 32 32" fill="none">
          <path
            d="M5 5L12 12M27 5L20 12M5 27L12 20M27 27L20 20"
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>

        <div id="reload-indicator">
          <span dir="rtl">تعویض خشاب</span>
          <div className="reload-bar-bg">
            <div id="reload-bar-fill" />
          </div>
        </div>

        <div id="center-alert" dir="rtl">
          <div className="title" id="center-alert-text" />
        </div>

        {/* Bottom-Center Minimal Vitals, Ammo & Active-Highlight Weapon Bar */}
        <div className="hud-bottom-center">
          <div id="buff-strip" />

          <div className="status-strip">
            <div className="vitals-col">
              <div className="bar-row">
                <span className="bar-label-icon" aria-hidden="true">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 10h-5V5a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v5H5a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h5v5a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-5h5a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1z" />
                  </svg>
                </span>
                <div className="bar-outer">
                  <div id="hp-bar-inner" />
                </div>
                <span className="bar-val" id="hp-text">
                  100
                </span>
              </div>
              <div className="bar-row">
                <span className="bar-label-icon armor-icon" aria-hidden="true">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" />
                  </svg>
                </span>
                <div className="bar-outer">
                  <div id="armor-bar-inner" />
                </div>
                <span className="bar-val armor-val" id="armor-text">
                  25
                </span>
              </div>
            </div>

            <div className="ammo-block">
              <span id="ammo-mag">30</span>
              <span id="ammo-reserve">/ 120</span>
            </div>
          </div>

          {/* Dedicated Smart Left / Auto / Right Corner Lean Control Bar (Optional via Settings, default OFF) */}
          {showLeanHudButtons && (
            <div
              className="lean-control-bar"
              data-testid="lean-control-bar"
              role="group"
              aria-label="Corner Lean Controls"
              onTouchStart={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                data-testid="btn-lean-left"
                className={`lean-btn ${manualLeanState === -1 ? 'active' : ''}`}
                onClick={() => engineApiRef.current?.setManualLean(manualLeanState === -1 ? 0 : -1)}
              >
                <span>◀ چپ (Z)</span>
              </button>
              <button
                type="button"
                data-testid="btn-lean-auto"
                className={`lean-btn ${manualLeanState === 0 ? 'active' : ''}`}
                onClick={() => engineApiRef.current?.setManualLean(0)}
              >
                <span>هوشمند (AUTO)</span>
              </button>
              <button
                type="button"
                data-testid="btn-lean-right"
                className={`lean-btn ${manualLeanState === 1 ? 'active' : ''}`}
                onClick={() => engineApiRef.current?.setManualLean(manualLeanState === 1 ? 0 : 1)}
              >
                <span>راست (X) ▶</span>
              </button>
            </div>
          )}

          <div
            className="weapon-bar"
            role="group"
            aria-label="Weapon Slots"
            onTouchStart={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {hudWeaponSlots.map((slot) => {
              const isAllowed = slot.allowed;
              const isMelee = slot.meta.id === 'katana';
              const defaultMag =
                slot.meta.id === 'ak47'
                  ? 30
                  : slot.meta.id === 'm4a1'
                    ? 35
                    : slot.meta.id === 'sniper'
                      ? 5
                      : slot.meta.id === 'mp5'
                        ? 40
                        : slot.meta.id === 'shotgun'
                          ? 8
                          : slot.meta.id === 'lmg'
                            ? 100
                            : slot.meta.id === 'deagle'
                              ? 7
                              : slot.meta.id === 'rpg'
                                ? 1
                                : slot.meta.id === 'pistol'
                                  ? 15
                                  : 1;
              const defaultRes =
                slot.meta.id === 'ak47'
                  ? 120
                  : slot.meta.id === 'm4a1'
                    ? 140
                    : slot.meta.id === 'sniper'
                      ? 30
                      : slot.meta.id === 'mp5'
                        ? 160
                        : slot.meta.id === 'shotgun'
                          ? 40
                          : slot.meta.id === 'lmg'
                            ? 300
                            : slot.meta.id === 'deagle'
                              ? 49
                              : slot.meta.id === 'rpg'
                                ? 8
                                : slot.meta.id === 'pistol'
                                  ? 90
                                  : 0;
              const initialTel = computeWeaponSlotTelemetry(
                slot.meta.id,
                isMelee,
                defaultMag,
                defaultMag,
                defaultRes,
                100,
                100,
                cheatConfig.infiniteAmmo,
                cheatConfig.godMode
              );
              return (
                <button
                  key={`${slot.meta.id}-${slot.keyLabel}`}
                  type="button"
                  disabled={!isAllowed}
                  data-testid={`hud-weapon-slot-${slot.keyLabel}`}
                  aria-label={`Select ${slot.meta.nameEn}`}
                  className={`weapon-slot ${activeWeaponIdx === slot.weaponIdx ? 'active' : ''} ${!isAllowed ? 'disabled-slot' : ''}`}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                  }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isAllowed) {
                      engineApiRef.current?.selectWeapon(slot.weaponIdx);
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.currentTarget.blur();
                    if (e.detail === 0 && isAllowed) {
                      engineApiRef.current?.selectWeapon(slot.weaponIdx);
                    }
                  }}
                >
                  {/* Minimal Weapon Slot: Key + Silhouette + Ammo + Thin Bar (Only active slot highlighted) */}
                  <div className="wslot-mid-row">
                    <span className="wslot-key-tag">{slot.keyLabel}</span>
                    <div className="wslot-gun-svg">{renderWeaponIconSvg(slot.meta.id)}</div>
                    <span
                      id={`wslot-ammo-badge-${slot.weaponIdx}`}
                      data-testid={`wslot-ammo-badge-${slot.keyLabel}`}
                      className="wslot-ammo-badge"
                    >
                      <span id={`wslot-ammo-text-${slot.weaponIdx}`}>{initialTel.ammoLabel}</span>
                    </span>
                  </div>

                  <div className="wslot-ammo-bar-track">
                    <div
                      id={`wslot-ammo-bar-${slot.weaponIdx}`}
                      className="wslot-ammo-bar-fill"
                      style={{
                        width: `${initialTel.ammoPct}%`,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Multi-Touch Controls (Customizable Drag/Scale/Opacity Positions) */}
      <div
        id="touch-controls"
        className={`layout-${hudLayout} custom-layout-active`}
        style={{ display: showTouchControls && !showLayoutEditor ? 'block' : 'none' }}
      >
        <div
          id="left-touch-zone"
          style={
            customControlLayout.joystick.xPct > 50
              ? { left: 'auto', right: 0 }
              : { left: 0, right: 'auto' }
          }
        />
        <div
          id="right-look-zone"
          style={
            customControlLayout.joystick.xPct > 50
              ? { left: 0, right: 'auto' }
              : { right: 0, left: 'auto' }
          }
        />

        <div
          id="joystick-base"
          data-testid="touch-control-joystick"
          style={{
            left: `${customControlLayout.joystick.xPct}%`,
            top: `${customControlLayout.joystick.yPct}%`,
            right: 'auto',
            bottom: 'auto',
            width: `${CONTROL_SLOT_META.joystick.baseSizePx}px`,
            height: `${CONTROL_SLOT_META.joystick.baseSizePx}px`,
            transform: `translate(-50%, -50%) scale(${customControlLayout.joystick.scale * hudScale})`,
            opacity: customControlLayout.joystick.opacity * hudOpacity,
            pointerEvents: 'auto',
            zIndex: 14,
          }}
        >
          <div id="joystick-knob" />
        </div>

        <div
          id="btn-fire"
          data-testid="touch-control-fire"
          className="t-btn"
          role="button"
          aria-label="Fire Weapon"
          style={{
            left: `${customControlLayout.fire.xPct}%`,
            top: `${customControlLayout.fire.yPct}%`,
            right: 'auto',
            bottom: 'auto',
            width: `${CONTROL_SLOT_META.fire.baseSizePx}px`,
            height: `${CONTROL_SLOT_META.fire.baseSizePx}px`,
            transform: `translate(-50%, -50%) scale(${customControlLayout.fire.scale * hudScale})`,
            opacity: customControlLayout.fire.opacity * hudOpacity,
            zIndex: 15,
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="8" />
            <circle cx="12" cy="12" r="2.5" fill="currentColor" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeLinecap="round" />
          </svg>
        </div>

        <button
          id="btn-ads"
          data-testid="touch-control-ads"
          type="button"
          className="t-btn"
          aria-label="Aim Down Sights"
          onTouchStart={(e) => e.stopPropagation()}
          onPointerDown={(e) => {
            e.stopPropagation();
            engineApiRef.current?.toggleADS();
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
          style={{
            left: `${customControlLayout.ads.xPct}%`,
            top: `${customControlLayout.ads.yPct}%`,
            right: 'auto',
            bottom: 'auto',
            width: `${CONTROL_SLOT_META.ads.baseSizePx}px`,
            height: `${CONTROL_SLOT_META.ads.baseSizePx}px`,
            transform: `translate(-50%, -50%) scale(${customControlLayout.ads.scale * hudScale})`,
            opacity: customControlLayout.ads.opacity * hudOpacity,
            zIndex: 15,
          }}
        >
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="6" />
            <path d="M12 3v3M12 18v3M3 12h3M18 12h3" strokeLinecap="round" />
          </svg>
        </button>

        <button
          id="btn-jump"
          data-testid="touch-control-jump"
          type="button"
          className="t-btn"
          aria-label="Jump"
          onTouchStart={(e) => e.stopPropagation()}
          onPointerDown={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
          }}
          onClick={(e) => e.stopPropagation()}
          style={{
            left: `${customControlLayout.jump.xPct}%`,
            top: `${customControlLayout.jump.yPct}%`,
            right: 'auto',
            bottom: 'auto',
            width: `${CONTROL_SLOT_META.jump.baseSizePx}px`,
            height: `${CONTROL_SLOT_META.jump.baseSizePx}px`,
            transform: `translate(-50%, -50%) scale(${customControlLayout.jump.scale * hudScale})`,
            opacity: customControlLayout.jump.opacity * hudOpacity,
            zIndex: 15,
          }}
        >
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 19V5M6 11l6-6 6 6" />
          </svg>
        </button>

        <button
          id="btn-reload"
          data-testid="touch-control-reload"
          type="button"
          className="t-btn"
          aria-label="Reload Weapon"
          onTouchStart={(e) => e.stopPropagation()}
          onPointerDown={(e) => {
            e.stopPropagation();
            engineApiRef.current?.startReload();
          }}
          onClick={(e) => e.stopPropagation()}
          style={{
            left: `${customControlLayout.reload.xPct}%`,
            top: `${customControlLayout.reload.yPct}%`,
            right: 'auto',
            bottom: 'auto',
            width: `${CONTROL_SLOT_META.reload.baseSizePx}px`,
            height: `${CONTROL_SLOT_META.reload.baseSizePx}px`,
            transform: `translate(-50%, -50%) scale(${customControlLayout.reload.scale * hudScale})`,
            opacity: customControlLayout.reload.opacity * hudOpacity,
            zIndex: 15,
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
        </button>

        {/* Essential Next Weapon Button (Icon-only) */}
        <button
          id="btn-swap-weapon"
          data-testid="touch-control-swap"
          type="button"
          className="t-btn"
          aria-label="Switch Next Weapon"
          title="تعویض سلاح"
          onTouchStart={(e) => e.stopPropagation()}
          onPointerDown={(e) => {
            e.stopPropagation();
            engineApiRef.current?.cycleNextWeapon();
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.currentTarget.blur();
          }}
          style={{
            left: `${customControlLayout.swap.xPct}%`,
            top: `${customControlLayout.swap.yPct}%`,
            right: 'auto',
            bottom: 'auto',
            width: `${CONTROL_SLOT_META.swap.baseSizePx}px`,
            height: `${CONTROL_SLOT_META.swap.baseSizePx}px`,
            transform: `translate(-50%, -50%) scale(${customControlLayout.swap.scale * hudScale})`,
            opacity: customControlLayout.swap.opacity * hudOpacity,
            zIndex: 15,
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M16 3l4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16" />
          </svg>
        </button>

        {/* Tactical Slide (Beta) Mobile Button — Visible when Slide is enabled & allowed by Host */}
        {ogFeatures.tacticalSlide && slideAlphaEnabled && onlineRoom?.slideAllowed !== false && (
          <button
            id="btn-slide"
            data-testid="touch-control-slide"
            type="button"
            className="t-btn t-btn-slide"
            aria-label="Tactical Slide (Beta)"
            title="اسلاید تاکتیکی (C)"
            onTouchStart={(e) => e.stopPropagation()}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              engineApiRef.current?.triggerSlideAction();
            }}
            onClick={(e) => {
              e.stopPropagation();
              e.currentTarget.blur();
            }}
            style={{
              left: `${customControlLayout.slide.xPct}%`,
              top: `${customControlLayout.slide.yPct}%`,
              right: 'auto',
              bottom: 'auto',
              width: `${CONTROL_SLOT_META.slide.baseSizePx}px`,
              height: `${CONTROL_SLOT_META.slide.baseSizePx}px`,
              transform: `translate(-50%, -50%) scale(${customControlLayout.slide.scale * hudScale})`,
              opacity: customControlLayout.slide.opacity * hudOpacity,
              zIndex: 15,
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="15" cy="6" r="2" />
              <path d="M4 18h14" />
              <path d="M7 14l5-4 4 3 4-1" />
            </svg>
            <span id="slide-cd-text" />
          </button>
        )}

        {/* Exclusive Mythic Emote HUD Button — Movable in Controls Layout Editor, visible when Mythic M249 is equipped OR holding Mythic SPAS-12 */}
        {ogFeatures.skinsAndCollection &&
          (gameplayEquipped.m249_skin === MYTHIC_M249_ID ||
            (gameplayEquipped.shotgun_skin === MYTHIC_SHOTGUN_ID && activeWeaponIdx === 4)) && (
          <button
            id="btn-emote"
            data-testid="touch-control-emote"
            type="button"
            className={`t-btn t-btn-emote${
              gameplayEquipped.shotgun_skin === MYTHIC_SHOTGUN_ID && activeWeaponIdx === 4
                ? ' is-eclipse-emote'
                : ''
            }`}
            aria-label="ایموت اختصاصی میتیک"
            title="ایموت میتیک (B)"
            onTouchStart={(e) => e.stopPropagation()}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              engineApiRef.current?.triggerMythicEmote();
            }}
            onClick={(e) => {
              e.stopPropagation();
              e.currentTarget.blur();
            }}
            style={{
              left: `${customControlLayout.emote.xPct}%`,
              top: `${customControlLayout.emote.yPct}%`,
              right: 'auto',
              bottom: 'auto',
              width: `${CONTROL_SLOT_META.emote.baseSizePx}px`,
              height: `${CONTROL_SLOT_META.emote.baseSizePx}px`,
              transform: `translate(-50%, -50%) scale(${customControlLayout.emote.scale * hudScale})`,
              opacity: customControlLayout.emote.opacity * hudOpacity,
              zIndex: 15,
            }}
          >
            <span aria-hidden="true" style={{ fontSize: '15px', lineHeight: 1 }}>
              {gameplayEquipped.shotgun_skin === MYTHIC_SHOTGUN_ID && activeWeaponIdx === 4 ? '☀' : '✧'}
            </span>
            <span id="emote-cd-text" />
          </button>
        )}

        {/* Compact Secondary Controls Drawer Toggle (Expands/Collapses Lean & Power without cluttering HUD) */}
        <button
          id="btn-touch-more"
          data-testid="touch-control-more"
          type="button"
          className={`t-btn t-btn-more ${touchMoreOpen ? 'is-open' : ''}`}
          aria-label="کنترل‌های فرعی (زاویه و آدرنالین)"
          aria-expanded={touchMoreOpen}
          title="کنترل‌های فرعی"
          onTouchStart={(e) => e.stopPropagation()}
          onPointerDown={(e) => {
            e.stopPropagation();
            setTouchMoreOpen((prev) => !prev);
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.currentTarget.blur();
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </button>

        {/* Secondary Control: Adrenaline Power (Icon-only, shown when secondary menu is open, still custom-positioned) */}
        <button
          id="btn-power"
          data-testid="touch-control-power"
          type="button"
          className="t-btn t-btn-secondary"
          aria-label="Activate Adrenaline Power"
          title="آدرنالین (E)"
          onTouchStart={(e) => e.stopPropagation()}
          onPointerDown={(e) => {
            e.stopPropagation();
            engineApiRef.current?.activateAdrenaline();
          }}
          onClick={(e) => e.stopPropagation()}
          style={{
            display: touchMoreOpen ? 'flex' : 'none',
            left: `${customControlLayout.power.xPct}%`,
            top: `${customControlLayout.power.yPct}%`,
            right: 'auto',
            bottom: 'auto',
            width: `${CONTROL_SLOT_META.power.baseSizePx}px`,
            height: `${CONTROL_SLOT_META.power.baseSizePx}px`,
            transform: `translate(-50%, -50%) scale(${customControlLayout.power.scale * hudScale})`,
            opacity: customControlLayout.power.opacity * hudOpacity,
            zIndex: 15,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
          </svg>
          <span id="power-cd-text" />
        </button>

        {/* Secondary Control: Corner Lean (Icon-only, shown when secondary menu is open, still custom-positioned) */}
        <button
          id="btn-lean"
          data-testid="touch-control-lean"
          type="button"
          className={`t-btn t-btn-secondary ${manualLeanState !== 0 ? 'active-ads' : ''}`}
          aria-label="Corner Lean Mount"
          title="زاویه دیوار (Z / X)"
          onTouchStart={(e) => e.stopPropagation()}
          onPointerDown={(e) => {
            e.stopPropagation();
            engineApiRef.current?.cycleManualLean();
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.currentTarget.blur();
          }}
          style={{
            display: touchMoreOpen ? 'flex' : 'none',
            left: `${customControlLayout.lean.xPct}%`,
            top: `${customControlLayout.lean.yPct}%`,
            right: 'auto',
            bottom: 'auto',
            width: `${CONTROL_SLOT_META.lean.baseSizePx}px`,
            height: `${CONTROL_SLOT_META.lean.baseSizePx}px`,
            transform: `translate(-50%, -50%) scale(${customControlLayout.lean.scale * hudScale})`,
            opacity: customControlLayout.lean.opacity * hudOpacity,
            zIndex: 15,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 20h16" />
            <path d="M12 20V8l5-4" />
            <path d="M7 11l5-3" />
          </svg>
        </button>
      </div>

      {/* Subtle Mythic Inspect Chip when actively holding Mythic M249 or Mythic SPAS-12 (Hidden during ADS overlays) */}
      {ogFeatures.skinsAndCollection &&
        screenState === 'playing' &&
        !showLayoutEditor &&
        !isEclipseAdsSight &&
        !isTempestAdsSight &&
        !isSniperScoped &&
        ((gameplayEquipped.m249_skin === MYTHIC_M249_ID && activeWeaponIdx === 7) ||
          (gameplayEquipped.shotgun_skin === MYTHIC_SHOTGUN_ID && activeWeaponIdx === 4)) && (
          <button
            id="btn-mythic-inspect"
            data-testid="btn-mythic-inspect"
            type="button"
            className={`mythic-inspect-chip${activeWeaponIdx === 4 ? ' is-eclipse' : ''}`}
            aria-label="نمایش سلاح میتیک"
            title="نمایش سلاح (I)"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              engineApiRef.current?.triggerMythicInspect();
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {activeWeaponIdx === 4 ? '☀ نمایش سلاح (I)' : '✧ نمایش سلاح (I)'}
          </button>
        )}

      {/* Draggable Minimal Icon-Only Voice Chat Microphone Button (Online Rooms Only) */}
      {ogFeatures.voiceChat && screenState === 'playing' && Boolean(onlineRoom) && !showLayoutEditor && (
        <button
          id="btn-voice-mic"
          data-testid="hud-voice-mic-btn"
          data-voice-status={voiceState.micStatus}
          data-voice-mode={voiceState.mode}
          type="button"
          className={[
            't-btn',
            'voice-mic-btn',
            voiceState.micStatus === 'active' ? 'is-active' : '',
            voiceState.micStatus === 'ptt_ready' ? 'is-ptt-ready' : '',
            voiceState.micStatus === 'error' ? 'is-error' : '',
            voiceState.speakingPlayerIds.includes(localOnlinePlayerId) ? 'is-speaking' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-label="میکروفون چت صوتی"
          title={
            voiceState.lastErrorFa
              ? voiceState.lastErrorFa
              : voiceState.mode === 'ptt'
                ? 'فشار برای صحبت (نگه داشتن دکمه یا کلید V)'
                : voiceState.micEnabled
                  ? 'میکروفون باز — کلیک برای خاموش کردن'
                  : 'چت صوتی خاموش — کلیک برای روشن کردن میکروفون'
          }
          onTouchStart={(e) => e.stopPropagation()}
          onPointerDown={(e) => {
            e.stopPropagation();
            if (voiceState.mode === 'ptt') {
              e.preventDefault();
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                // ignore
              }
              engineApiRef.current?.setVoicePushToTalk(true);
            }
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            if (voiceState.mode === 'ptt') {
              try {
                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                }
              } catch {
                // ignore
              }
              engineApiRef.current?.setVoicePushToTalk(false);
            }
          }}
          onPointerCancel={(e) => {
            e.stopPropagation();
            if (voiceState.mode === 'ptt') {
              engineApiRef.current?.setVoicePushToTalk(false);
            }
          }}
          onLostPointerCapture={() => {
            if (voiceState.mode === 'ptt' && voiceState.pttPressed) {
              engineApiRef.current?.setVoicePushToTalk(false);
            }
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (voiceState.mode === 'open') {
              engineApiRef.current?.toggleVoiceMic();
            }
            e.currentTarget.blur();
          }}
          style={{
            position: 'fixed',
            left: `${customControlLayout.voice.xPct}%`,
            top: `${customControlLayout.voice.yPct}%`,
            right: 'auto',
            bottom: 'auto',
            width: `${CONTROL_SLOT_META.voice.baseSizePx}px`,
            height: `${CONTROL_SLOT_META.voice.baseSizePx}px`,
            transform: `translate(-50%, -50%) scale(${customControlLayout.voice.scale * hudScale})`,
            opacity: voiceState.transmitting
              ? Math.min(1, customControlLayout.voice.opacity * hudOpacity + 0.25)
              : customControlLayout.voice.opacity * hudOpacity,
            touchAction: 'none',
            zIndex: 16,
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0" />
            <line x1="12" y1="18" x2="12" y2="21" />
            <line x1="9" y1="21" x2="15" y2="21" />
            {!voiceState.transmitting && <line x1="4" y1="4" x2="20" y2="20" strokeWidth="2.1" />}
          </svg>
        </button>
      )}

      {/* Title Screen */}
      {screenState === 'title' &&
        !showTrainingModal &&
        !showSettingsModal &&
        !showOnlineModal &&
        !showSpinModal &&
        !showSkinsModal &&
        !showOgIntro &&
        !showLayoutEditor && (
        effectiveUiVersion === 'v3' && uiV3StateSnapshot ? (
          <UiV3Provider state={uiV3StateSnapshot} hudSnapshot={null} onAction={handleUiV3Action}>
            <Suspense fallback={null}>
              <MainMenuV3 />
            </Suspense>
          </UiV3Provider>
        ) : (
        <div id="start-screen" className="overlay-screen">
          <div
            data-testid="app-version-badge"
            className="app-version-badge"
            dir="rtl"
          >
            <span className="ver-num">{APP_VERSION}</span>
            <span className="hud-sep">·</span>
            <span className="ver-date">{BUILD_DATE}</span>
          </div>
          <div className="panel-card">
            {OG_EVENT_CONFIG.enabled && (
              <OgEventBanner
                variant={isOgMode ? 'active' : 'normal'}
                onOpenIntro={() => setShowOgIntro(true)}
                onExitOg={handleExitOgMode}
              />
            )}
            {/* Minimal Inline SVG Title Emblem */}
            <div className="title-emblem-wrap">
              <svg width="40" height="40" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                <rect x="6" y="12" width="52" height="40" rx="10" fill="rgba(15,23,42,0.7)" stroke="rgba(255,255,255,0.22)" strokeWidth="1.6" />
                <circle cx="32" cy="32" r="12" fill="rgba(6,10,16,0.85)" stroke="#e2e8f0" strokeWidth="1.5" />
                <circle cx="32" cy="32" r="4.5" fill="#38bdf8" />
                <rect x="46" y="19" width="5" height="5" rx="1" fill="#f43f5e" />
              </svg>
            </div>

            <h1 className="game-logo">
              BODY<span>CAM</span> · {isOgMode ? 'OG' : 'VANGUARD'}
            </h1>
            <div className="game-subtitle" dir="rtl">
              {isOgMode
                ? 'نسخهٔ کلاسیک OG · برگرد به شروع — رابط قدیمی، نقشه‌های اولیه و نبرد خالص بدون اسکین و اسپین'
                : 'شوتر تاکتیکی بادیکم · انتخاب ۳ سلاح، ۴ نقشه (از جمله میدان دوئل ۱v۱) و نبرد آنلاین تیمی'}
            </div>

            <div className="summary-meta-line" dir="rtl">
              <span>
                نقشه: <b>{currentMapMeta.nameFa}</b>
              </span>
              <span className="hud-sep">·</span>
              <span>
                گرافیک: <b>{presetLabel}</b>
              </span>
              <span className="hud-sep">·</span>
              <span>
                FPS: <b>{fpsLabel}</b>
              </span>
            </div>

            {/* Selectable Maps Showcase on Title Screen */}
            <div
              className="training-weapons-grid"
              dir="rtl"
              style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', marginBottom: '10px' }}
            >
              {getOgAllowedMaps(isOgMode, ogFeatures).map((m) => {
                const active = currentMap === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    data-testid={`title-map-${m.id}`}
                    className={`training-weapon-card ${active ? 'selected' : ''}`}
                    onClick={() => engineApiRef.current?.setMap(m.id)}
                    style={{
                      textAlign: 'right',
                      alignItems: 'flex-start',
                      padding: '8px 9px',
                    }}
                  >
                    <span className="map-badge-tag">{m.badgeFa}</span>
                    <strong style={{ color: active ? '#f8fafc' : '#cbd5e1', fontSize: '11px' }}>
                      {m.nameFa}
                    </strong>
                    <small style={{ fontSize: '9.5px', lineHeight: 1.3, color: '#94a3b8' }}>{m.subtitleFa}</small>
                  </button>
                );
              })}
            </div>

            {/* 3-Weapon Loadout Picker on Title Screen */}
            {ogFeatures.customLoadout && (
            <div className="loadout-section-box" dir="rtl">
              <div className="loadout-header-row">
                <span className="loadout-title">
                  انتخاب ۳ سلاح همراه از {getOgAllowedWeapons(isOgMode, ogFeatures).length} سلاح تاکتیکی (Loadout 3/{getOgAllowedWeapons(isOgMode, ogFeatures).length})
                </span>
                <span className="loadout-badge">
                  {loadout.map((id) => WEAPON_CATALOG.find((w) => w.id === id)?.nameEn).join(' · ')}
                </span>
              </div>
              <div className="arsenal-grid">
                {getOgAllowedWeapons(isOgMode, ogFeatures).map((w) => {
                  const slotIdx = loadout.indexOf(w.id);
                  const equipped = slotIdx !== -1;
                  const dmgPct =
                    w.id === 'rpg'
                      ? 100
                      : w.id === 'sniper'
                        ? 96
                        : w.id === 'katana'
                          ? 92
                          : w.id === 'shotgun'
                            ? 88
                            : w.id === 'deagle'
                              ? 84
                              : w.id === 'ak47'
                                ? 76
                                : w.id === 'lmg'
                                  ? 74
                                  : w.id === 'm4a1'
                                    ? 68
                                    : w.id === 'pistol'
                                      ? 56
                                      : 52;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      data-testid={`loadout-pick-${w.id}`}
                      className={`arsenal-weapon-btn ${equipped ? 'equipped' : ''}`}
                      onClick={() => handleToggleLoadoutWeapon(w.id)}
                    >
                      {equipped && <span className="slot-num-badge">اسلات {slotIdx + 1}</span>}
                      <div className="weapon-blueprint-wrap">{renderWeaponIconSvg(w.id)}</div>
                      <span className="w-code" style={{ color: equipped ? '#38bdf8' : '#eef5ff' }}>
                        {w.nameEn}
                      </span>
                      <span className="w-fa">{w.nameFa}</span>
                      <span className="w-cat">
                        {w.categoryFa} · {w.damageLabel}
                      </span>
                      <div className="weapon-stat-bar-row">
                        <div className="weapon-stat-bar-track">
                          <div className="weapon-stat-bar-fill" style={{ width: `${dmgPct}%` }} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            )}

            <button
              id="btn-start-game"
              type="button"
              className="primary-btn"
              dir="rtl"
              data-start="true"
              onClick={() => engineApiRef.current?.startSession('campaign')}
            >
              {isOgMode
                ? `شروع عملیات OG (${currentMapMeta.nameFa})`
                : `شروع عملیات اصلی (${currentMapMeta.nameFa})`}
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
              <button
                id="btn-open-online"
                type="button"
                className="training-cta-btn accent-blue"
                style={{ marginTop: 0 }}
                dir="rtl"
                onClick={() => {
                  openModalUrgent('online', () => setShowOnlineModal(true));
                }}
              >
                {isOgMode ? 'بازی آنلاین کلاسیک (OG)' : 'بازی آنلاین (1v1 / 2v2 · لینک اتاق)'}
              </button>

              <button
                id="btn-open-training"
                type="button"
                className="secondary-btn"
                style={{ marginTop: 0 }}
                dir="rtl"
                onClick={() => openModalUrgent('training', () => setShowTrainingModal(true))}
              >
                بخش تمرین و آموزش
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              {ogFeatures.spinSystem && (
                <button
                  id="btn-open-spin"
                  data-testid="btn-open-spin"
                  type="button"
                  className="title-spin-btn"
                  dir="rtl"
                  onClick={() => {
                    if (!canOpenSpinWheel(screenStateRef.current, ogFeaturesRef.current.spinSystem)) return;
                    openModalUrgent('spin', () => {
                      setDeferredSkinNoticeFa(null);
                      setSpinInitialBannerId(undefined);
                      setShowSpinModal(true);
                    });
                  }}
                >
                  <span className="title-spin-emblem" aria-hidden="true">✦</span>
                  <span>اسپین</span>
                  <span className="title-spin-count" data-testid="title-spin-count">
                    {cosmeticsState.spins}
                  </span>
                  {canClaimDailyFreeSpin(cosmeticsState) && (
                    <span className="title-spin-daily-dot" title="اسپین روزانه آماده است" />
                  )}
                </button>
              )}
              {ogFeatures.skinsAndCollection && (
                <button
                  id="btn-open-skins-menu"
                  data-testid="btn-open-skins-menu"
                  type="button"
                  className="title-skins-btn"
                  dir="rtl"
                  onClick={() => openModalUrgent('skins', () => setShowSkinsModal(true))}
                >
                  <span aria-hidden="true">✧</span>
                  <span>اسکین‌ها</span>
                </button>
              )}
              <button
                id="btn-start-settings"
                type="button"
                className="secondary-btn"
                style={{ marginTop: 0, flex: '2 1 150px' }}
                dir="rtl"
                onClick={() => openModalUrgent('settings', () => setShowSettingsModal(true))}
              >
                تنظیمات گرافیک، کنترل و سلاح‌ها
              </button>
              <button
                id="btn-title-fullscreen"
                data-testid="btn-title-fullscreen"
                type="button"
                className="secondary-btn"
                style={{ marginTop: 0, flex: '1 1 90px' }}
                dir="rtl"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? 'خروج تمام‌صفحه' : 'تمام‌صفحه'}
              </button>
              <PWAInstallButton />
            </div>

            <div className="controls-inline-hint" dir="rtl">
              {isOgMode
                ? 'کلیدهای 1 تا 3 تعویض سلاح · R ریلود · Q نشانه‌گیری (ADS)'
                : 'کلیدهای 1 تا 3 تعویض سلاح · G پینگ تیمی · T پیام سریع · V چت صوتی'}
            </div>
          </div>
        </div>
        )
      )}

      {/* Online Multiplayer Lobby Modal */}
      {showOnlineModal && (
        <Suspense
          fallback={
            <ModalLoadingSkeleton
              title="بازی آنلاین"
              testId="online-modal-skeleton"
              onClose={() => {
                setShowOnlineModal(false);
                if (screenState === 'paused') {
                  engineApiRef.current?.resumeSession();
                }
              }}
            />
          }
        >
          {effectiveUiVersion === 'v3' ? (
            <OnlineModalV3
              connected={onlineConnected}
              peerStatus={peerStatus}
              peerRole={peerRole}
              playerName={onlinePlayerName}
              onChangePlayerName={(name) => {
                onlinePlayerNameRef.current = name;
                setOnlinePlayerName(name);
                engineApiRef.current?.setOnlineCallsign(name);
              }}
              currentRoom={onlineRoom}
              publicRooms={publicRooms}
              selectedMap={currentMap}
              roomError={onlineRoomError}
              pendingInviteRoomCode={pendingInviteRoomCode}
              pingMs={pingMs}
              transportInfo={onlineTransport}
              onClearPendingInvite={() => setPendingInviteRoomCode(null)}
              onSelectMap={(m) => engineApiRef.current?.setMap(m)}
              onVoteMap={(m) => engineApiRef.current?.voteOnlineMap(m)}
              onCreateRoom={(mapId, mode, password) =>
                engineApiRef.current?.createOnlineRoom(mapId, mode, password)
              }
              onChangeGameMode={(mode) => engineApiRef.current?.changeOnlineGameMode(mode)}
              onUpdateRoomRules={(rules) => engineApiRef.current?.updateOnlineRoomRules(rules)}
              onUpdateMatchSettings={(settings) =>
                engineApiRef.current?.updateOnlineMatchSettings(settings)
              }
              onSwitchTeam={(pid) => engineApiRef.current?.switchOnlineTeam(pid)}
              onJoinRoom={(code, password) => engineApiRef.current?.joinOnlineRoom(code, password)}
              onRetryConnect={() => engineApiRef.current?.retryJoinOnlineRoom()}
              onToggleLobbyReady={(ready) => engineApiRef.current?.setLobbyReady(ready)}
              onToggleRoomLock={(locked) => engineApiRef.current?.setRoomLocked(locked)}
              onUpdateRoomPassword={(password) => engineApiRef.current?.setRoomPassword(password)}
              onLeaveRoom={() => engineApiRef.current?.leaveOnlineRoom()}
              onStartOnlineMatch={() => engineApiRef.current?.startSession('campaign')}
              onGetDiagnosticsTelemetry={() =>
                engineApiRef.current
                  ? engineApiRef.current.getDiagnosticsTelemetry()
                  : Promise.resolve({
                      peerOpen: false,
                      peerDisconnected: false,
                      iceConnectionState: 'new',
                      iceGatheringState: 'new',
                      signalingState: 'stable',
                      candidateType: null,
                      hasActivePeerConnection: false,
                    })
              }
              voiceState={ogFeatures.voiceChat ? voiceState : undefined}
              localPlayerId={localOnlinePlayerId}
              onToggleMutePlayer={
                ogFeatures.voiceChat
                  ? (pid) => engineApiRef.current?.toggleMuteVoicePlayer(pid)
                  : undefined
              }
              ogMode={isOgMode}
              ogFeatures={ogFeatures}
              onClose={() => {
                setShowOnlineModal(false);
                if (screenState === 'paused') {
                  engineApiRef.current?.resumeSession();
                }
              }}
            />
          ) : (
            <OnlineModal
              connected={onlineConnected}
              peerStatus={peerStatus}
              peerRole={peerRole}
              playerName={onlinePlayerName}
              onChangePlayerName={(name) => {
                onlinePlayerNameRef.current = name;
                setOnlinePlayerName(name);
                engineApiRef.current?.setOnlineCallsign(name);
              }}
              currentRoom={onlineRoom}
              publicRooms={publicRooms}
              selectedMap={currentMap}
              roomError={onlineRoomError}
              pendingInviteRoomCode={pendingInviteRoomCode}
              pingMs={pingMs}
              transportInfo={onlineTransport}
              onClearPendingInvite={() => setPendingInviteRoomCode(null)}
              onSelectMap={(m) => engineApiRef.current?.setMap(m)}
              onVoteMap={(m) => engineApiRef.current?.voteOnlineMap(m)}
              onCreateRoom={(mapId, mode, password) => engineApiRef.current?.createOnlineRoom(mapId, mode, password)}
              onChangeGameMode={(mode) => engineApiRef.current?.changeOnlineGameMode(mode)}
              onUpdateRoomRules={(rules) => engineApiRef.current?.updateOnlineRoomRules(rules)}
              onUpdateMatchSettings={(settings) => engineApiRef.current?.updateOnlineMatchSettings(settings)}
              onSwitchTeam={(pid) => engineApiRef.current?.switchOnlineTeam(pid)}
              onJoinRoom={(code, password) => engineApiRef.current?.joinOnlineRoom(code, password)}
              onRetryConnect={() => engineApiRef.current?.retryJoinOnlineRoom()}
              onToggleLobbyReady={(ready) => engineApiRef.current?.setLobbyReady(ready)}
              onToggleRoomLock={(locked) => engineApiRef.current?.setRoomLocked(locked)}
              onUpdateRoomPassword={(password) => engineApiRef.current?.setRoomPassword(password)}
              onLeaveRoom={() => engineApiRef.current?.leaveOnlineRoom()}
              onStartOnlineMatch={() => engineApiRef.current?.startSession('campaign')}
              onGetDiagnosticsTelemetry={() =>
                engineApiRef.current
                  ? engineApiRef.current.getDiagnosticsTelemetry()
                  : Promise.resolve({
                      peerOpen: false,
                      peerDisconnected: false,
                      iceConnectionState: 'new',
                      iceGatheringState: 'new',
                      signalingState: 'stable',
                      candidateType: null,
                      hasActivePeerConnection: false,
                    })
              }
              voiceState={ogFeatures.voiceChat ? voiceState : undefined}
              localPlayerId={localOnlinePlayerId}
              onToggleMutePlayer={
                ogFeatures.voiceChat ? (pid) => engineApiRef.current?.toggleMuteVoicePlayer(pid) : undefined
              }
              ogMode={isOgMode}
              ogFeatures={ogFeatures}
              onClose={() => {
                setShowOnlineModal(false);
                if (screenState === 'paused') {
                  engineApiRef.current?.resumeSession();
                }
              }}
            />
          )}
        </Suspense>
      )}

      {/* Training Mode Configurator Modal */}
      {showTrainingModal && (
        <Suspense
          fallback={
            <ModalLoadingSkeleton
              title="بخش تمرین و آموزش"
              testId="training-modal-skeleton"
              onClose={() => {
                setShowTrainingModal(false);
                if (screenState === 'paused') {
                  engineApiRef.current?.resumeSession();
                }
              }}
            />
          }
        >
          <TrainingModal
            config={trainingConfig}
            tutorialState={tutorialState}
            onChange={(next) => {
              if (screenState === 'paused' && playMode === 'training') {
                engineApiRef.current?.updateTrainingLive(next);
              } else {
                setTrainingConfig(next);
              }
            }}
            onToggleTutorialStep={handleToggleTutorialStep}
            onSelectTutorialStep={handleSelectTutorialStep}
            onResetTutorial={handleResetTutorial}
            onStartTraining={() => engineApiRef.current?.startSession('training', trainingConfig)}
            onStartQuickTutorial={() => engineApiRef.current?.startQuickTutorial()}
            onClose={() => {
              setShowTrainingModal(false);
              if (screenState === 'paused') {
                engineApiRef.current?.resumeSession();
              }
            }}
          />
        </Suspense>
      )}

      {/* Minimalist 4-Tab Settings & Pause Modal (Legacy) or Categorized Settings Modal (UI v2) */}
      {showSettingsModal && (
        effectiveUiVersion === 'v3' && uiV3StateSnapshot ? (
          <UiV3Provider state={uiV3StateSnapshot} hudSnapshot={null} onAction={handleUiV3Action}>
            <Suspense
              fallback={
                <ModalLoadingSkeleton
                  title="تنظیمات"
                  testId="settings-modal-skeleton"
                  onClose={() => {
                    if (screenState === 'paused') engineApiRef.current?.resumeSession();
                    else setShowSettingsModal(false);
                  }}
                />
              }
            >
              <SettingsModalV3 />
            </Suspense>
          </UiV3Provider>
        ) : (
        <div id="settings-screen" className="overlay-screen" role="dialog" aria-modal="true" aria-label="Game Settings">
          <div className="panel-card settings-minimal-card">
            <div className="game-logo" style={{ fontSize: '17px', textAlign: 'center' }} dir="rtl">
              تنظیمات · BODY<span>CAM</span>{isOgMode ? ' · OG' : ''}
            </div>
            {isOgMode && (
              <div className="og-settings-exit-box" dir="rtl" data-testid="og-settings-exit-box">
                <div className="og-settings-exit-box-copy">
                  <strong>حالت OG فعال است</strong>
                  <span>رابط قدیمی اجباری است. برای بازگشت به حالت عادی و UI جدید از OG خارج شوید.</span>
                </div>
                <button
                  type="button"
                  className="og-btn-exit"
                  data-testid="btn-exit-og-settings"
                  onClick={handleExitOgMode}
                >
                  خروج از OG
                </button>
              </div>
            )}
            {ogFeatures.uiV2 && (
              <UiModeSwitcher3Way
                preferredUi={uiV3Prefs.uiMode}
                activeUi={activeUiVersion}
                pendingNoticeFa={pendingUiSwitchNotice}
                variant="legacy"
                onSelectUi={handleSelectUiVersion}
              />
            )}
            {(onlineRoom || peerStatus !== 'idle') && (
              <div className="pause-room-bar" data-testid="pause-room-bar" dir="rtl">
                <div className="pause-room-meta">
                  <span
                    className="hud-online-dot"
                    style={{
                      background: formatConnectionStatusFa(peerStatus, peerRole, onlineRoomError).color,
                    }}
                  />
                  {onlineRoom ? (
                    <>
                      <span style={{ color: '#94a3b8' }}>اتاق:</span>
                      <strong className="pause-room-code" data-testid="pause-room-code">
                        {onlineRoom.code}
                      </strong>
                      <span style={{ color: '#94a3b8' }}>({onlineRoom.players.length} نفر)</span>
                      <span style={{ color: '#64748b' }}>·</span>
                      <span style={{ color: '#cbd5e1', fontSize: '10.5px' }}>
                        {formatConnectionStatusFa(peerStatus, peerRole, onlineRoomError).badgeFa}
                      </span>
                    </>
                  ) : (
                    <span style={{ color: '#cbd5e1' }}>
                      {formatConnectionStatusFa(peerStatus, peerRole, onlineRoomError).badgeFa}
                    </span>
                  )}
                </div>
                {onlineRoom && (
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="hud-copy-btn"
                      data-testid="pause-copy-room-btn"
                      onClick={() => {
                        const url = buildRoomInviteUrl(
                          getCurrentOriginShareBaseUrl(window.location.origin, window.location.pathname),
                          onlineRoom.code
                        );
                        navigator.clipboard?.writeText(url).catch(() => {});
                        setHudRoomCopied(true);
                        window.setTimeout(() => setHudRoomCopied(false), 1600);
                      }}
                    >
                      {hudRoomCopied ? 'کپی شد' : 'کپی لینک اتاق'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 4 Minimalist Category Tabs */}
            <div className="settings-tabs-nav" dir="rtl" role="tablist">
              <button
                type="button"
                role="tab"
                data-testid="settings-tab-gfx"
                aria-selected={settingsTab === 'gfx'}
                className={`settings-tab-btn ${settingsTab === 'gfx' ? 'active' : ''}`}
                onClick={() => setSettingsTab('gfx')}
              >
                گرافیک Pro Max
              </button>
              <button
                type="button"
                role="tab"
                data-testid="settings-tab-loadout"
                aria-selected={settingsTab === 'loadout'}
                className={`settings-tab-btn ${settingsTab === 'loadout' ? 'active' : ''}`}
                onClick={() => setSettingsTab('loadout')}
              >
                ۳ سلاح و مپ
              </button>
              <button
                type="button"
                role="tab"
                data-testid="settings-tab-controls"
                aria-selected={settingsTab === 'controls'}
                className={`settings-tab-btn ${settingsTab === 'controls' ? 'active' : ''}`}
                onClick={() => setSettingsTab('controls')}
              >
                کنترل و بات‌ها
              </button>
              <button
                type="button"
                role="tab"
                data-testid="settings-tab-cheats"
                aria-selected={settingsTab === 'cheats'}
                className={`settings-tab-btn ${settingsTab === 'cheats' ? 'active' : ''}`}
                onClick={() => setSettingsTab('cheats')}
              >
                ایم‌اسیست و چیت قفل‌دار
              </button>
            </div>

            {/* TAB 1: GRAPHICS & PRO MAX RESOLUTION */}
            {settingsTab === 'gfx' && (
              <div data-testid="settings-panel-gfx">
                <div className="settings-section-title" dir="rtl">
                  <span>سطح گرافیک (از گوشی اقتصادی تا Ultra Max Pro Max ویژه پرچم‌دار)</span>
                </div>

                <div className="gfx-tier-grid" dir="rtl">
                  <button
                    type="button"
                    data-testid="gfx-preset-auto"
                    className={`gfx-tier-card ${gfxState.preset === 'auto' ? 'active' : ''}`}
                    onClick={() => engineApiRef.current?.applyPreset('auto')}
                  >
                    <strong>خودکار (Auto)</strong>
                    <span>تنظیم و رزولوشن پویا</span>
                  </button>
                  <button
                    type="button"
                    data-testid="gfx-preset-lite"
                    className={`gfx-tier-card ${gfxState.preset === 'lite' ? 'active' : ''}`}
                    onClick={() => engineApiRef.current?.applyPreset('lite')}
                  >
                    <strong>سبک (Lite)</strong>
                    <span>بافت سبک و حداکثر FPS</span>
                  </button>
                  <button
                    type="button"
                    data-testid="gfx-preset-promax"
                    className={`gfx-tier-card flagship-tier ${gfxState.preset === 'promax' ? 'active' : ''}`}
                    onClick={() => engineApiRef.current?.applyPreset('promax')}
                  >
                    <strong>Ultra Max Pro Max</strong>
                    <span>ویژه پرچم‌دار · 165%</span>
                  </button>
                  <button
                    type="button"
                    data-testid="gfx-preset-ultramax"
                    className={`gfx-tier-card flagship-tier ${gfxState.preset === 'ultramax' ? 'active' : ''}`}
                    onClick={() => engineApiRef.current?.applyPreset('ultramax')}
                  >
                    <strong>Ultra Max</strong>
                    <span>فوق‌شفاف · 145%</span>
                  </button>
                  <button
                    type="button"
                    data-testid="gfx-preset-ultra"
                    className={`gfx-tier-card ${gfxState.preset === 'ultra' ? 'active' : ''}`}
                    onClick={() => engineApiRef.current?.applyPreset('ultra')}
                  >
                    <strong>Ultra</strong>
                    <span>کیفیت اولترا · 125%</span>
                  </button>
                  <button
                    type="button"
                    data-testid="gfx-preset-high"
                    className={`gfx-tier-card ${gfxState.preset === 'high' ? 'active' : ''}`}
                    onClick={() => engineApiRef.current?.applyPreset('high')}
                  >
                    <strong>High</strong>
                    <span>کیفیت بالا · 100%</span>
                  </button>
                  <button
                    type="button"
                    data-testid="gfx-preset-med"
                    className={`gfx-tier-card ${gfxState.preset === 'med' ? 'active' : ''}`}
                    onClick={() => engineApiRef.current?.applyPreset('med')}
                  >
                    <strong>Medium</strong>
                    <span>بهینه · 75%</span>
                  </button>
                  <button
                    type="button"
                    data-testid="gfx-preset-potato"
                    className={`gfx-tier-card ${gfxState.preset === 'potato' ? 'active' : ''}`}
                    onClick={() => engineApiRef.current?.applyPreset('potato')}
                  >
                    <strong>Potato</strong>
                    <span>فوق‌سبک · 45%</span>
                  </button>
                </div>

                <div className="setting-row" dir="rtl">
                  <label htmlFor="opt-preset">انتخاب مستقیم سطح گرافیک</label>
                  <select
                    id="opt-preset"
                    value={gfxState.preset}
                    onChange={(e) => engineApiRef.current?.applyPreset(e.target.value as GfxPresetName)}
                  >
                    <option value="auto">خودکار (Auto · بنچمارک ۵ ثانیه + رزولوشن پویا)</option>
                    <option value="lite">سبک (Lite · حداکثر FPS موبایل)</option>
                    <option value="promax">Ultra Max Pro Max (ویژه بالاترین رده گوشی‌ها)</option>
                    <option value="ultramax">Ultra Max (رزولوشن و سایه فوق‌العاده)</option>
                    <option value="ultra">Ultra (اولترا)</option>
                    <option value="high">High (کیفیت بالا)</option>
                    <option value="med">Medium (متوسط)</option>
                    <option value="low">Low (خیلی سبک)</option>
                    <option value="potato">Potato (فوق‌سبک بدون لگ)</option>
                  </select>
                </div>

                <div className="setting-row" dir="rtl">
                  <label htmlFor="opt-res">رزولوشن رندر (Super-Sampling Resolution)</label>
                  <select
                    id="opt-res"
                    value={String(gfxState.resScale)}
                    onChange={(e) => engineApiRef.current?.updateGfx({ resScale: parseFloat(e.target.value) })}
                  >
                    <option value="2">200% (4K Pro Max Extreme)</option>
                    <option value="1.65">165% (Ultra Max Pro Max)</option>
                    <option value="1.45">145% (Ultra Max)</option>
                    <option value="1.25">125% (Ultra Super-Sampling)</option>
                    <option value="1">100% (Full HD Native)</option>
                    <option value="0.75">75% (استاندارد)</option>
                    <option value="0.55">55% (سبک)</option>
                    <option value="0.45">45% (فوق‌سبک)</option>
                  </select>
                </div>

                <div className="setting-row" dir="rtl">
                  <label htmlFor="opt-vibrance">
                    شدت رنگ و شفافیت HDR: <b style={{ color: '#38bdf8' }}>{Math.round(gfxState.vibrance * 100)}%</b>
                  </label>
                  <input
                    id="opt-vibrance"
                    type="range"
                    min="1.0"
                    max="1.85"
                    step="0.05"
                    value={gfxState.vibrance}
                    onChange={(e) => engineApiRef.current?.updateGfx({ vibrance: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="setting-row" dir="rtl">
                  <label htmlFor="opt-shadows">کیفیت سایه‌ها (Shadows)</label>
                  <select
                    id="opt-shadows"
                    value={gfxState.shadowMode}
                    onChange={(e) =>
                      engineApiRef.current?.updateGfx({
                        shadowMode: e.target.value as 'ultra' | 'soft' | 'basic' | 'off',
                      })
                    }
                  >
                    <option value="ultra">اولترا 4K (4096px)</option>
                    <option value="soft">بالا (2048px)</option>
                    <option value="basic">متوسط (1024px)</option>
                    <option value="off">خاموش (افزایش شدید FPS)</option>
                  </select>
                </div>

                <div className="setting-row" dir="rtl">
                  <label htmlFor="opt-fps">سقف فریم‌ریت (FPS Limit)</label>
                  <select
                    id="opt-fps"
                    value={String(gfxState.targetFps)}
                    onChange={(e) => engineApiRef.current?.updateGfx({ targetFps: parseInt(e.target.value, 10) })}
                  >
                    <option value="0">نامحدود (120Hz / Max FPS)</option>
                    <option value="60">60 FPS</option>
                    <option value="45">45 FPS</option>
                    <option value="30">30 FPS</option>
                  </select>
                </div>

                <div className="setting-row" dir="rtl">
                  <label htmlFor="opt-bodycam">افکت لنز بادیکم و چراغ‌قوه</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select
                      id="opt-bodycam"
                      value={gfxState.bodycamFx ? 'on' : 'off'}
                      onChange={(e) => engineApiRef.current?.updateGfx({ bodycamFx: e.target.value === 'on' })}
                    >
                      <option value="on">لنز بادیکم روشن</option>
                      <option value="off">لنز بادیکم خاموش</option>
                    </select>
                    <select
                      id="opt-flashlight"
                      value={gfxState.flashlightOn ? 'on' : 'off'}
                      onChange={(e) => engineApiRef.current?.updateGfx({ flashlightOn: e.target.value === 'on' })}
                    >
                      <option value="on">چراغ‌قوه روشن</option>
                      <option value="off">چراغ‌قوه خاموش</option>
                    </select>
                  </div>
                </div>

                <div className="setting-row" dir="rtl">
                  <label htmlFor="opt-auto-quality">
                    کیفیت خودکار (Auto Quality)
                    <span style={{ display: 'block', fontSize: '9.5px', color: '#94a3b8' }}>
                      در صورت افت FPS زیر ۳۰، مرحله‌به‌مرحله سبک‌سازی می‌کند: ۱) افکت‌ها → ۲) سایه‌ها → ۳) رزولوشن رندر
                    </span>
                  </label>
                  <select
                    id="opt-auto-quality"
                    data-testid="opt-auto-quality"
                    value={autoQuality ? 'on' : 'off'}
                    onChange={(e) => handleToggleAutoQuality(e.target.value === 'on')}
                  >
                    <option value="on">روشن (پیش‌فرض)</option>
                    <option value="off">خاموش</option>
                  </select>
                </div>

                <div className="setting-row" dir="rtl">
                  <label htmlFor="opt-skin-fx-mode">
                    افکت‌های اسکین (Skin VFX)
                    <span style={{ display: 'block', fontSize: '9.5px', color: '#94a3b8' }}>
                      در حالت «خاموش»، ظاهر سه‌بعدی اسکین حفظ می‌شود اما ذرات و افکت‌های ویژه خاموش می‌شوند
                    </span>
                  </label>
                  <select
                    id="opt-skin-fx-mode"
                    data-testid="opt-skin-fx-mode"
                    value={skinFxMode}
                    onChange={(e) => handleChangeSkinFxMode(e.target.value as SkinFxMode)}
                  >
                    <option value="off">خاموش (حداکثر FPS)</option>
                    <option value="simple">ساده (پیشنهاد موبایل)</option>
                    <option value="full">کامل (دسکتاپ قوی)</option>
                  </select>
                </div>

                <div className="setting-row" dir="rtl">
                  <label htmlFor="opt-view-distance">
                    فاصله دید (View Distance)
                    <span style={{ display: 'block', fontSize: '9.5px', color: '#94a3b8' }}>
                      محدود کردن اشیای دور و عمق دید برای افزایش FPS
                    </span>
                  </label>
                  <select
                    id="opt-view-distance"
                    data-testid="opt-view-distance"
                    value={viewDistanceMode}
                    onChange={(e) => handleChangeViewDistanceMode(e.target.value as ViewDistanceMode)}
                  >
                    <option value="near">نزدیک (حداکثر FPS)</option>
                    <option value="med">متوسط</option>
                    <option value="far">دور</option>
                  </select>
                </div>

                <div className="setting-row" dir="rtl">
                  <label htmlFor="opt-battery-saver">
                    صرفه‌جویی باتری و گرما
                    <span style={{ display: 'block', fontSize: '9.5px', color: '#94a3b8' }}>
                      سقف ۴۵ FPS، حذف سایه و محیط IBL، کاهش رزولوشن و ذرات برای خنک ماندن گوشی
                    </span>
                  </label>
                  <select
                    id="opt-battery-saver"
                    data-testid="opt-battery-saver"
                    value={batterySaver ? 'on' : 'off'}
                    onChange={(e) => handleToggleBatterySaver(e.target.value === 'on')}
                  >
                    <option value="off">خاموش (پیش‌فرض)</option>
                    <option value="on">روشن</option>
                  </select>
                </div>

                <div className="setting-row" dir="rtl">
                  <label htmlFor="opt-show-perf-profiler">
                    نمایش پنل عملکرد (Profiler)
                    <span style={{ display: 'block', fontSize: '9.5px', color: '#94a3b8' }}>
                      نمایش زنده FPS، زمان فریم، Draw Calls، مثلث‌ها، حافظه و پینگ (پیش‌فرض خاموش)
                    </span>
                  </label>
                  <select
                    id="opt-show-perf-profiler"
                    data-testid="opt-show-perf-profiler"
                    value={showPerfProfiler ? 'on' : 'off'}
                    onChange={(e) => handleTogglePerfProfiler(e.target.value === 'on')}
                  >
                    <option value="off">خاموش (پیش‌فرض)</option>
                    <option value="on">روشن</option>
                  </select>
                </div>
              </div>
            )}

            {/* TAB 2: 3-WEAPON LOADOUT & MAP SELECTOR */}
            {settingsTab === 'loadout' && (
              <div data-testid="settings-panel-loadout">
                <div className="setting-row" dir="rtl">
                  <label htmlFor="opt-map">نقشه فعال عملیات (Map)</label>
                  <select
                    id="opt-map"
                    value={currentMap}
                    onChange={(e) => engineApiRef.current?.setMap(e.target.value as MapId)}
                  >
                    {getOgAllowedMaps(isOgMode, ogFeatures).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nameFa} — {m.subtitleFa}
                      </option>
                    ))}
                  </select>
                </div>

                {ogFeatures.customLoadout && (
                <div className="loadout-section-box" dir="rtl" style={{ marginTop: '8px', marginBottom: '6px' }}>
                  <div className="loadout-header-row">
                    <span className="loadout-title">
                      انتخاب ۳ سلاح همراه از {getOgAllowedWeapons(isOgMode, ogFeatures).length} سلاح (Loadout 3/{getOgAllowedWeapons(isOgMode, ogFeatures).length}):
                    </span>
                    <span className="loadout-badge">
                      {loadout.map((id) => WEAPON_CATALOG.find((w) => w.id === id)?.nameEn).join(' · ')}
                    </span>
                  </div>
                  <div className="arsenal-grid">
                    {getOgAllowedWeapons(isOgMode, ogFeatures).map((w) => {
                      const slotIdx = loadout.indexOf(w.id);
                      const equipped = slotIdx !== -1;
                      const dmgPct =
                        w.id === 'rpg'
                          ? 100
                          : w.id === 'sniper'
                            ? 96
                            : w.id === 'katana'
                              ? 92
                              : w.id === 'shotgun'
                                ? 88
                                : w.id === 'deagle'
                                  ? 84
                                  : w.id === 'ak47'
                                    ? 76
                                    : w.id === 'lmg'
                                      ? 74
                                      : w.id === 'm4a1'
                                        ? 68
                                        : w.id === 'pistol'
                                          ? 56
                                          : 52;
                      return (
                        <button
                          key={w.id}
                          type="button"
                          data-testid={`settings-loadout-${w.id}`}
                          className={`arsenal-weapon-btn ${equipped ? 'equipped' : ''}`}
                          onClick={() => handleToggleLoadoutWeapon(w.id)}
                        >
                          {equipped && <span className="slot-num-badge">اسلات {slotIdx + 1}</span>}
                          <div className="weapon-blueprint-wrap">{renderWeaponIconSvg(w.id)}</div>
                          <span className="w-code" style={{ color: equipped ? '#38bdf8' : '#eef5ff' }}>
                            {w.nameEn}
                          </span>
                          <span className="w-fa">{w.nameFa}</span>
                          <span className="w-cat">
                            {w.categoryFa} · {w.damageLabel}
                          </span>
                          <div className="weapon-stat-bar-row">
                            <div className="weapon-stat-bar-track">
                              <div className="weapon-stat-bar-fill" style={{ width: `${dmgPct}%` }} />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                )}
              </div>
            )}

            {/* TAB 3: CONTROLS, HIGH SENSITIVITY & SMART BOTS */}
            {settingsTab === 'controls' && (
              <div data-testid="settings-panel-controls">
                <div className="setting-row" dir="rtl">
                  <label htmlFor="opt-sens">
                    حساسیت چرخش دوربین (Sensitivity): <b style={{ color: '#38bdf8' }}>{Math.round(sensitivity * 100)}%</b>
                  </label>
                  <input
                    id="opt-sens"
                    type="range"
                    min="0.3"
                    max="8.0"
                    step="0.05"
                    value={sensitivity}
                    onChange={(e) => engineApiRef.current?.setSensitivity(parseFloat(e.target.value))}
                  />
                </div>

                <div className="setting-row" dir="rtl">
                  <label htmlFor="opt-ads-sens">
                    حساسیت نشانه‌گیری و اسنایپ (ADS):{' '}
                    <b style={{ color: '#38bdf8' }}>{Math.round(adsSensitivity * 100)}%</b>
                  </label>
                  <input
                    id="opt-ads-sens"
                    type="range"
                    min="0.2"
                    max="4.0"
                    step="0.05"
                    value={adsSensitivity}
                    onChange={(e) => engineApiRef.current?.setAdsSensitivity(parseFloat(e.target.value))}
                  />
                </div>

                <div className="setting-row" dir="rtl">
                  <label htmlFor="opt-layout">چیدمان جوی‌استیک و دکمه‌های تیر (HUD Layout)</label>
                  <select
                    id="opt-layout"
                    value={hudLayout}
                    onChange={(e) => handleChangeHudLayoutPreset(e.target.value as HudLayoutPreset)}
                  >
                    <option value="standard">استاندارد ارگونومیک (راست‌دست)</option>
                    <option value="claw">حرفه‌ای چهارانگشتی (Claw)</option>
                    <option value="lefthanded">چپ‌دست (جوی‌استیک راست)</option>
                  </select>
                </div>

                {ogFeatures.customTouchLayoutEditor && (
                <div className="setting-row" dir="rtl">
                  <label>ویرایش آزاد چیدمان کنترل‌ها (جابه‌جایی، اندازه و شفافیت)</label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      data-testid="btn-open-layout-editor"
                      className="preset-chip"
                      style={{
                        borderColor: 'rgba(56, 189, 248, 0.5)',
                        background: 'rgba(56, 189, 248, 0.12)',
                        color: '#bae6fd',
                        fontWeight: 700,
                      }}
                      onClick={() => setShowLayoutEditor(true)}
                    >
                      ویرایش چیدمان کنترل‌ها
                    </button>
                    <button
                      type="button"
                      data-testid="btn-settings-reset-layout"
                      className="preset-chip"
                      style={{
                        borderColor: 'rgba(255, 255, 255, 0.16)',
                        background: 'rgba(255, 255, 255, 0.04)',
                        color: '#cbd5e1',
                        fontWeight: 700,
                      }}
                      onClick={() => handleResetCustomControlLayout()}
                    >
                      بازگشت به پیش‌فرض
                    </button>
                  </div>
                </div>
                )}

                <div className="setting-row" dir="rtl">
                  <label htmlFor="opt-show-fps-hud">
                    نمایش شمارنده FPS روی صفحه بازی
                    <span style={{ display: 'block', fontSize: '9.5px', color: '#94a3b8' }}>
                      به صورت پیش‌فرض خاموش است تا صفحه بازی خلوت بماند
                    </span>
                  </label>
                  <select
                    id="opt-show-fps-hud"
                    data-testid="opt-show-fps-hud"
                    value={showFpsHud ? 'on' : 'off'}
                    onChange={(e) => handleToggleShowFpsHud(e.target.value === 'on')}
                  >
                    <option value="off">خاموش (پیش‌فرض)</option>
                    <option value="on">روشن</option>
                  </select>
                </div>

                {ogFeatures.pingHudAndAdvancedLobby && (
                <div className="setting-row" dir="rtl">
                  <label htmlFor="opt-show-ping-hud">
                    نمایش پینگ و کیفیت اتصال (ms)
                    <span style={{ display: 'block', fontSize: '9.5px', color: '#94a3b8' }}>
                      در حالت آنلاین، تاخیر اتصال به میزبان را کوچک در گوشه صفحه نشان می‌دهد
                    </span>
                  </label>
                  <select
                    id="opt-show-ping-hud"
                    data-testid="opt-show-ping-hud"
                    value={showPingHud ? 'on' : 'off'}
                    onChange={(e) => handleToggleShowPingHud(e.target.value === 'on')}
                  >
                    <option value="on">روشن (پیش‌فرض)</option>
                    <option value="off">خاموش</option>
                  </select>
                </div>
                )}

                {ogFeatures.adBillboards && (
                <div className="setting-row" dir="rtl">
                  <label htmlFor="opt-show-ad-billboards">
                    نمایش بیلبوردها
                    <span style={{ display: 'block', fontSize: '9.5px', color: '#94a3b8' }}>
                      تابلوهای تبلیغاتی کوچک و تزئینی روی دیوارهای مپ (بدون اثر بر گیم‌پلی)
                    </span>
                  </label>
                  <select
                    id="opt-show-ad-billboards"
                    data-testid="opt-show-ad-billboards"
                    value={showAdBillboards ? 'on' : 'off'}
                    onChange={(e) => handleToggleShowAdBillboards(e.target.value === 'on')}
                  >
                    <option value="on">روشن (پیش‌فرض)</option>
                    <option value="off">خاموش</option>
                  </select>
                </div>
                )}

                <div className="setting-row" dir="rtl">
                  <label htmlFor="opt-camera-motion-intensity">
                    شدت حرکت دوربین:{' '}
                    <b style={{ color: '#38bdf8' }}>
                      {cameraMotionIntensity === 0 ? 'خاموش (0%)' : `${cameraMotionIntensity}%`}
                    </b>
                    <span style={{ display: 'block', fontSize: '9.5px', color: '#94a3b8' }}>
                      تکان ملایم هنگام راه رفتن، دویدن، فرود، شلیک و اسلاید (۰٪ = کاملاً خاموش)
                    </span>
                  </label>
                  <input
                    id="opt-camera-motion-intensity"
                    data-testid="opt-camera-motion-intensity"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={cameraMotionIntensity}
                    onChange={(e) => handleChangeCameraMotionIntensity(parseInt(e.target.value, 10))}
                  />
                </div>

                <div className="setting-row" dir="rtl">
                  <label htmlFor="opt-reduced-motion">
                    کاهش حرکت و افکت‌ها (Reduced Motion)
                    <span style={{ display: 'block', fontSize: '9.5px', color: '#94a3b8' }}>
                      خاموش کردن تکان دوربین و انیمیشن‌های UI و کاهش ذرات برای راحتی چشم و FPS بالاتر
                    </span>
                  </label>
                  <select
                    id="opt-reduced-motion"
                    data-testid="opt-reduced-motion"
                    value={reducedMotion ? 'on' : 'off'}
                    onChange={(e) => handleToggleReducedMotion(e.target.value === 'on')}
                  >
                    <option value="off">خاموش (پیش‌فرض)</option>
                    <option value="on">روشن</option>
                  </select>
                </div>

                <div className="setting-row" dir="rtl">
                  <label htmlFor="opt-footstep-volume">
                    صدای پای جهت‌دار بازیکنان نزدیک:{' '}
                    <b style={{ color: '#38bdf8' }}>{Math.round(footstepVolume * 100)}%</b>
                  </label>
                  <input
                    id="opt-footstep-volume"
                    data-testid="opt-footstep-volume"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={footstepVolume}
                    onChange={(e) => handleChangeFootstepVolume(parseFloat(e.target.value))}
                  />
                </div>

                <div className="setting-row" dir="rtl">
                  <label htmlFor="opt-crosshair-size">
                    اندازه کراس‌هیر (Crosshair Size):{' '}
                    <b style={{ color: '#38bdf8' }}>{Math.round(crosshairSize * 100)}%</b>
                  </label>
                  <input
                    id="opt-crosshair-size"
                    data-testid="opt-crosshair-size"
                    type="range"
                    min="0.5"
                    max="1.8"
                    step="0.1"
                    value={crosshairSize}
                    onChange={(e) => handleChangeCrosshairSize(parseFloat(e.target.value))}
                  />
                </div>

                <div className="setting-row" dir="rtl">
                  <label htmlFor="opt-crosshair-style">شکل کراس‌هیر (Crosshair)</label>
                  <select
                    id="opt-crosshair-style"
                    data-testid="opt-crosshair-style"
                    value={crosshairStyle}
                    onChange={(e) => handleChangeCrosshairStyle(e.target.value as CrosshairStyle)}
                  >
                    <option value="cross">خطوط نازک مینیمال</option>
                    <option value="dot">نقطه ساده</option>
                  </select>
                </div>

                <div className="setting-row" dir="rtl">
                  <label htmlFor="opt-show-lean-buttons">
                    نمایش دکمه‌های چپ (Z) / هوشمند / راست (X) روی HUD
                    <span style={{ display: 'block', fontSize: '9.5px', color: '#94a3b8' }}>
                      در حالت خاموش، کلیدهای Z و X و حالت هوشمند AUTO همچنان در پس‌زمینه فعال هستند
                    </span>
                  </label>
                  <select
                    id="opt-show-lean-buttons"
                    data-testid="opt-show-lean-buttons"
                    value={showLeanHudButtons ? 'on' : 'off'}
                    onChange={(e) => handleToggleLeanHudButtons(e.target.value === 'on')}
                  >
                    <option value="off">خاموش (پیش‌فرض)</option>
                    <option value="on">روشن</option>
                  </select>
                </div>

                <div className="setting-row" dir="rtl">
                  <label htmlFor="opt-hud-scale">
                    اندازه کلی دکمه‌ها و جوی‌استیک: <b style={{ color: '#38bdf8' }}>{Math.round(hudScale * 100)}%</b>
                  </label>
                  <input
                    id="opt-hud-scale"
                    type="range"
                    min="0.75"
                    max="1.4"
                    step="0.05"
                    value={hudScale}
                    onChange={(e) => setHudScale(parseFloat(e.target.value))}
                  />
                </div>

                <div className="setting-row" dir="rtl">
                  <label htmlFor="opt-hud-opacity">
                    شفافیت کلی کنترل‌ها: <b style={{ color: '#38bdf8' }}>{Math.round(hudOpacity * 100)}%</b>
                  </label>
                  <input
                    id="opt-hud-opacity"
                    type="range"
                    min="0.35"
                    max="1.0"
                    step="0.05"
                    value={hudOpacity}
                    onChange={(e) => setHudOpacity(parseFloat(e.target.value))}
                  />
                </div>

                <div className="setting-row" dir="rtl">
                  <label htmlFor="opt-botdiff">سطح هوش و مسیریابی بات‌ها (Smart Bot AI)</label>
                  <select
                    id="opt-botdiff"
                    value={botDifficulty}
                    onChange={(e) => engineApiRef.current?.setBotDifficulty(e.target.value as BotDifficultyPreset)}
                  >
                    <option value="weak">ضعیف (مبتدی)</option>
                    <option value="medium">متوسط (مسیریابی هوشمند تاکتیکی)</option>
                    <option value="strong">قوی (کماندو حرفه‌ای)</option>
                  </select>
                </div>

                {ogFeatures.softAimAssist && (
                <div className="setting-row" dir="rtl">
                  <label htmlFor="opt-soft-aim-assist">
                    کمک نشانه‌گیری (Aim Assist):{' '}
                    <b style={{ color: '#38bdf8' }}>{aimAssistStrength}%</b>
                    <span style={{ display: 'block', fontSize: '9.5px', color: '#94a3b8' }}>
                      {onlineRoom?.aimAssistAllowed === false
                        ? 'در این اتاق توسط میزبان غیرفعال شده است'
                        : 'هدایت نرم روی حریفان آنلاین و بات‌ها (هرگز روی هم‌تیمی‌ها عمل نمی‌کند · پیش‌فرض ۷۰٪)'}
                    </span>
                  </label>
                  <input
                    id="opt-soft-aim-assist"
                    data-testid="opt-soft-aim-assist"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={aimAssistStrength}
                    onChange={(e) => handleChangeAimAssistStrength(parseInt(e.target.value, 10))}
                  />
                </div>
                )}

                <div className="setting-row" dir="rtl">
                  <label htmlFor="opt-auto-reload">
                    ریلود خودکار هنگام خالی شدن خشاب
                    <span style={{ display: 'block', fontSize: '9.5px', color: '#94a3b8' }}>
                      پس از شلیک آخرین تیر، خشاب به‌صورت خودکار تعویض می‌شود
                    </span>
                  </label>
                  <select
                    id="opt-auto-reload"
                    data-testid="opt-auto-reload"
                    value={autoReloadEnabled ? 'on' : 'off'}
                    onChange={(e) => handleToggleAutoReload(e.target.value === 'on')}
                  >
                    <option value="on">روشن (پیش‌فرض)</option>
                    <option value="off">خاموش (ریلود دستی)</option>
                  </select>
                </div>

                <div className="setting-row" dir="rtl">
                  <label htmlFor="opt-vibration">
                    لرزش خفیف گوشی (Vibration)
                    <span style={{ display: 'block', fontSize: '9.5px', color: '#94a3b8' }}>
                      لرزش کوتاه و کم‌شدت هنگام اصابت تیر، کشتن حریف و آسیب دیدن
                    </span>
                  </label>
                  <select
                    id="opt-vibration"
                    data-testid="opt-vibration"
                    value={vibrationEnabled ? 'on' : 'off'}
                    onChange={(e) => handleToggleVibration(e.target.value === 'on')}
                  >
                    <option value="on">روشن (پیش‌فرض)</option>
                    <option value="off">خاموش</option>
                  </select>
                </div>

                <div className="setting-row" dir="rtl">
                  <label htmlFor="opt-touch">کنترل لمسی و صدا</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select
                      id="opt-touch"
                      value={touchSetting}
                      onChange={(e) => setTouchSetting(e.target.value as 'auto' | 'on' | 'off')}
                    >
                      <option value="auto">لمسی خودکار</option>
                      <option value="on">لمسی همیشه روشن</option>
                      <option value="off">لمسی خاموش</option>
                    </select>
                    <select
                      id="opt-sound"
                      value={soundEnabled ? 'on' : 'off'}
                      onChange={(e) => engineApiRef.current?.setSoundEnabled(e.target.value === 'on')}
                    >
                      <option value="on">صدا روشن</option>
                      <option value="off">بی‌صدا</option>
                    </select>
                  </div>
                </div>

                {/* Beta Features Section */}
                {ogFeatures.tacticalSlide && (
                <div
                  data-testid="settings-alpha-section"
                  className="settings-alpha-box"
                  dir="rtl"
                >
                  <div className="settings-section-title" style={{ marginTop: 0 }}>
                    <span>آزمایشی (Beta)</span>
                    <span className="alpha-pill-tag">BETA</span>
                  </div>
                  <div className="setting-row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                    <label htmlFor="opt-slide-alpha">
                      اسلاید تاکتیکی (Slide · نسخه بتا)
                      <span style={{ display: 'block', fontSize: '9.5px', color: '#94a3b8' }}>
                        {onlineRoom?.slideAllowed === false
                          ? 'در اتاق فعلی توسط میزبان غیرمجاز شده است'
                          : `حین دویدن با کلید C یا دکمه اسلاید روی موبایل سر بخورید (حدود ۰.۸۵ ثانیه · کولداون ${SLIDE_COOLDOWN_SEC} ثانیه)`}
                      </span>
                    </label>
                    <select
                      id="opt-slide-alpha"
                      data-testid="opt-slide-alpha"
                      value={slideAlphaEnabled ? 'on' : 'off'}
                      onChange={(e) => handleToggleSlideAlpha(e.target.value === 'on')}
                    >
                      <option value="on">روشن (پیش‌فرض · بتا)</option>
                      <option value="off">خاموش</option>
                    </select>
                  </div>
                </div>
                )}

                {/* Reset All Settings Row (Inline confirmation — never window.confirm) */}
                <div className="setting-row" dir="rtl" style={{ marginTop: '6px' }}>
                  <label>
                    بازنشانی تمام تنظیمات بازی به حالت پیش‌فرض
                    <span style={{ display: 'block', fontSize: '9.5px', color: '#94a3b8' }}>
                      چیدمان دکمه‌ها، Aim Assist، کراس‌هیر، لرزش، اسلاید بتا، صدا و گرافیک
                    </span>
                  </label>
                  {!confirmResetSettings ? (
                    <button
                      type="button"
                      data-testid="btn-reset-all-settings"
                      className="preset-chip"
                      style={{
                        borderColor: 'rgba(244, 63, 94, 0.45)',
                        background: 'rgba(244, 63, 94, 0.08)',
                        color: '#fda4af',
                        fontWeight: 700,
                      }}
                      onClick={() => setConfirmResetSettings(true)}
                    >
                      ریست همهٔ تنظیمات
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                      <button
                        type="button"
                        data-testid="btn-confirm-reset-all-settings"
                        className="preset-chip"
                        style={{
                          borderColor: 'rgba(244, 63, 94, 0.7)',
                          background: 'rgba(244, 63, 94, 0.22)',
                          color: '#fecdd3',
                          fontWeight: 800,
                        }}
                        onClick={handleResetAllSettings}
                      >
                        تایید ریست
                      </button>
                      <button
                        type="button"
                        data-testid="btn-cancel-reset-all-settings"
                        className="preset-chip"
                        onClick={() => setConfirmResetSettings(false)}
                      >
                        انصراف
                      </button>
                    </div>
                  )}
                </div>

                {/* Online Voice Chat Settings */}
                {ogFeatures.voiceChat && (
                <div
                  data-testid="settings-voice-section"
                  style={{
                    marginTop: '12px',
                    paddingTop: '10px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.12)',
                  }}
                  dir="rtl"
                >
                  <div className="settings-section-title" style={{ marginTop: 0 }}>
                    <span>چت صوتی آنلاین (Voice Chat · WebRTC)</span>
                    <span style={{ fontSize: '10px', color: voiceState.secureContextOk ? '#38bdf8' : '#fda4af' }}>
                      {voiceState.secureContextOk ? 'HTTPS آماده' : 'نیازمند HTTPS'}
                    </span>
                  </div>

                  <div className="setting-row" dir="rtl">
                    <label htmlFor="opt-voice-mode">
                      حالت میکروفون (Voice Mode)
                      <span style={{ display: 'block', fontSize: '9.5px', color: '#94a3b8' }}>
                        فشار برای صحبت: نگه داشتن کلید V (دسکتاپ) یا نگه داشتن دکمه میکروفون (موبایل)
                      </span>
                    </label>
                    <select
                      id="opt-voice-mode"
                      data-testid="opt-voice-mode"
                      value={voiceState.mode}
                      onChange={(e) => engineApiRef.current?.setVoiceMode(e.target.value as VoiceMode)}
                    >
                      <option value="open">میکروفون باز (کلیک روشن/خاموش)</option>
                      <option value="ptt">فشار برای صحبت (Push-to-Talk · V)</option>
                    </select>
                  </div>

                  <div className="setting-row" dir="rtl">
                    <label htmlFor="opt-voice-volume">
                      ولوم صدای بازیکنان دیگر:{' '}
                      <b style={{ color: '#38bdf8' }}>{Math.round(voiceState.volume * 100)}%</b>
                    </label>
                    <input
                      id="opt-voice-volume"
                      data-testid="opt-voice-volume"
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={voiceState.volume}
                      onChange={(e) => engineApiRef.current?.setVoiceVolume(parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="setting-row" dir="rtl">
                    <label htmlFor="opt-voice-channel">
                      کانال صدای تیمی (در حالت 1v1 / 2v2 / Co-op)
                    </label>
                    <select
                      id="opt-voice-channel"
                      data-testid="opt-voice-channel"
                      value={voiceState.channelScope}
                      onChange={(e) => engineApiRef.current?.setVoiceChannelScope(e.target.value as VoiceChannelScope)}
                    >
                      <option value="team">فقط هم‌تیمی‌ها</option>
                      <option value="all">همه بازیکنان اتاق</option>
                    </select>
                  </div>

                  <div className="setting-row" dir="rtl">
                    <label htmlFor="opt-low-data-mode">
                      حالت داده کم (Low Data Mode)
                      <span style={{ display: 'block', fontSize: '9.5px', color: '#94a3b8' }}>
                        کاهش نرخ همگام‌سازی آنلاین به ۸Hz، قطع تماس صوتی و غیرفعال‌سازی افکت اسکین‌های شبکه
                      </span>
                    </label>
                    <select
                      id="opt-low-data-mode"
                      data-testid="opt-low-data-mode"
                      value={lowDataMode ? 'on' : 'off'}
                      onChange={(e) => handleToggleLowDataMode(e.target.value === 'on')}
                    >
                      <option value="off">خاموش (پیش‌فرض)</option>
                      <option value="on">روشن</option>
                    </select>
                  </div>

                  {voiceState.lastErrorFa && (
                    <div
                      data-testid="settings-voice-error"
                      style={{
                        marginTop: '6px',
                        padding: '6px 9px',
                        borderRadius: '8px',
                        background: 'rgba(239, 68, 68, 0.14)',
                        border: '1px solid rgba(248, 113, 113, 0.35)',
                        color: '#fecaca',
                        fontSize: '10.5px',
                        lineHeight: 1.5,
                      }}
                    >
                      {voiceState.lastErrorFa}
                    </div>
                  )}

                  {onlineRoom && onlineRoom.players.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#cbd5e1', marginBottom: '5px' }}>
                        مدیریت صدای بازیکنان اتاق ({onlineRoom.players.length} نفر):
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {onlineRoom.players.map((p) => {
                          const isMe = p.id === localOnlinePlayerId;
                          const isSpeaking = voiceState.speakingPlayerIds.includes(p.id);
                          const isMuted = voiceState.mutedPlayerIds.includes(p.id);
                          return (
                            <div
                              key={p.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px',
                                padding: '5px 8px',
                                borderRadius: '8px',
                                background: isSpeaking ? 'rgba(16, 185, 129, 0.14)' : 'rgba(15, 23, 42, 0.72)',
                                border: isSpeaking
                                  ? '1px solid rgba(16, 185, 129, 0.55)'
                                  : '1px solid rgba(148, 163, 184, 0.18)',
                                fontSize: '11px',
                              }}
                            >
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#f1f5f9', fontWeight: 700 }}>
                                {isSpeaking && <span className="voice-speaking-dot" />}
                                {p.name}
                                {isMe && <span style={{ color: '#94a3b8', fontSize: '10px' }}>(شما)</span>}
                                {isSpeaking && <span className="voice-speaking-badge">در حال صحبت</span>}
                              </span>
                              {!isMe ? (
                                <button
                                  type="button"
                                  data-testid={`btn-mute-player-${p.id}`}
                                  className="preset-chip"
                                  style={{
                                    padding: '3px 8px',
                                    fontSize: '10px',
                                    borderColor: isMuted ? 'rgba(244, 63, 94, 0.55)' : 'rgba(148, 163, 184, 0.35)',
                                    background: isMuted ? 'rgba(244, 63, 94, 0.18)' : 'rgba(30, 41, 59, 0.85)',
                                    color: isMuted ? '#fda4af' : '#e2e8f0',
                                  }}
                                  onClick={() => engineApiRef.current?.toggleMuteVoicePlayer(p.id)}
                                >
                                  {isMuted ? 'بی‌صدا شده (فعال کن)' : 'میوت کردن'}
                                </button>
                              ) : (
                                <span style={{ fontSize: '10px', color: voiceState.transmitting ? '#34d399' : '#94a3b8' }}>
                                  {voiceState.transmitting ? 'در حال ارسال صدا' : 'میکروفون خاموش'}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                )}
              </div>
            )}

            {/* TAB 4: LOCKED AIM ASSIST (10% DEFAULT) & PASSCODE-PROTECTED CHEATS */}
            {settingsTab === 'cheats' && (
              <div data-testid="settings-panel-cheats">
                <div className="settings-section-title" dir="rtl">
                  <span>ایم‌اسیست قفل‌دار (تنظیم پیش‌فرض و ثابت روی ۱۰٪ — نیازمند رمز اختصاصی)</span>
                </div>

                {!cheatUnlocked ? (
                  <div className="cheat-gate-box" dir="rtl" data-testid="cheat-password-gate">
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px',
                        padding: '6px 9px',
                        borderRadius: '6px',
                        background: 'rgba(0, 230, 118, 0.1)',
                        border: '1px solid rgba(0, 230, 118, 0.3)',
                        fontSize: '11.5px',
                      }}
                    >
                      <span>وضعیت ایم‌اسیست استاندارد:</span>
                      <b data-testid="locked-aim-assist-readout" style={{ color: '#00e676' }}>
                        قفل روی {cheatConfig.aimAssistStrength}% (فقط دید مستقیم)
                      </b>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#cbd5e1', fontWeight: 700 }}>
                      تغییر ایم‌اسیست و فعال‌سازی چیت‌ها قفل است. برای بازگشایی ۳۰ ثانیه‌ای رمز اختصاصی را وارد کنید:
                    </div>
                    <div className="cheat-gate-row">
                      <input
                        id="input-cheat-passcode"
                        data-testid="input-cheat-passcode"
                        type="password"
                        className="cheat-pass-input"
                        value={cheatPasswordInput}
                        onChange={(e) => {
                          setCheatPasswordInput(e.target.value);
                          if (cheatPassError) setCheatPassError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (verifyCheatPasscode(cheatPasswordInput)) {
                              setCheatUnlocked(true);
                              setCheatUnlockRemainingSec(CHEAT_UNLOCK_DURATION_SEC);
                              setCheatPassError(null);
                            } else {
                              setCheatPassError('رمز وارد شده صحیح نیست. ایم‌اسیست (۱۰٪) و چیت‌ها قفل هستند.');
                            }
                          }
                        }}
                        placeholder="رمز اختصاصی..."
                      />
                      <button
                        type="button"
                        data-testid="btn-unlock-cheats"
                        className="cheat-unlock-btn"
                        onClick={() => {
                          if (verifyCheatPasscode(cheatPasswordInput)) {
                            setCheatUnlocked(true);
                            setCheatUnlockRemainingSec(CHEAT_UNLOCK_DURATION_SEC);
                            setCheatPassError(null);
                          } else {
                            setCheatPassError('رمز وارد شده صحیح نیست. ایم‌اسیست (۱۰٪) و چیت‌ها قفل هستند.');
                          }
                        }}
                      >
                        بازگشایی ۳۰ ثانیه‌ای
                      </button>
                    </div>
                    {cheatPassError && (
                      <div
                        data-testid="cheat-passcode-error"
                        style={{ fontSize: '11px', color: '#fda4af', fontWeight: 700, marginTop: '4px' }}
                      >
                        {cheatPassError}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="cheat-timer-banner" dir="rtl" data-testid="cheat-unlock-timer">
                      <span>
                        قفل ایم‌اسیست و چیت باز است — قفل خودکار روی ۱۰٪ تا <b>{cheatUnlockRemainingSec}</b> ثانیه دیگر
                      </span>
                      <button
                        type="button"
                        data-testid="btn-relock-cheats"
                        className="cheat-unlock-btn"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => {
                          setCheatUnlocked(false);
                          setCheatUnlockRemainingSec(0);
                          setCheatPasswordInput('');
                          engineApiRef.current?.updateCheats({
                            aimAssistEnabled: true,
                            aimAssistStrength: 10,
                          });
                        }}
                      >
                        قفل فوری (بازگشت به ۱۰٪)
                      </button>
                    </div>

                    <div className="setting-row" dir="rtl">
                      <label htmlFor="opt-aim-assist">وضعیت ایم‌اسیست هوشمند (بدون قفل پشت دیوار)</label>
                      <select
                        id="opt-aim-assist"
                        value={cheatConfig.aimAssistEnabled ? 'on' : 'off'}
                        onChange={(e) =>
                          engineApiRef.current?.updateCheats({ aimAssistEnabled: e.target.value === 'on' })
                        }
                      >
                        <option value="on">فعال (فقط اهداف دارای دید مستقیم)</option>
                        <option value="off">غیرفعال</option>
                      </select>
                    </div>

                    <div className="setting-row" dir="rtl">
                      <label htmlFor="opt-aim-strength">
                        قدرت ایم‌اسیست (پیش‌فرض ۱۰٪):{' '}
                        <b style={{ color: '#38bdf8' }}>{cheatConfig.aimAssistStrength}%</b>
                      </label>
                      <input
                        id="opt-aim-strength"
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={cheatConfig.aimAssistStrength}
                        onChange={(e) =>
                          engineApiRef.current?.updateCheats({
                            aimAssistStrength: parseInt(e.target.value, 10),
                            aimAssistEnabled: parseInt(e.target.value, 10) > 0,
                          })
                        }
                      />
                    </div>

                    <div className="setting-row" dir="rtl">
                      <label htmlFor="opt-aim-headshot">چیت قفل مستقیم روی سر (Headshot Lock)</label>
                      <select
                        id="opt-aim-headshot"
                        value={cheatConfig.aimAssistHeadshot ? 'on' : 'off'}
                        onChange={(e) =>
                          engineApiRef.current?.updateCheats({ aimAssistHeadshot: e.target.value === 'on' })
                        }
                      >
                        <option value="off">سینه و مرکز بدن (طبیعی)</option>
                        <option value="on">قفل مستقیم روی سر (Headshot)</option>
                      </select>
                    </div>

                    <div className="setting-row" dir="rtl">
                      <label htmlFor="opt-cheat-ammo">چیت تیر بی‌نهایت (Infinite Ammo)</label>
                      <select
                        id="opt-cheat-ammo"
                        value={cheatConfig.infiniteAmmo ? 'on' : 'off'}
                        onChange={(e) =>
                          engineApiRef.current?.updateCheats({ infiniteAmmo: e.target.value === 'on' })
                        }
                      >
                        <option value="off">خاموش</option>
                        <option value="on">روشن (بدون تمام شدن خشاب)</option>
                      </select>
                    </div>

                    <div className="setting-row" dir="rtl">
                      <label htmlFor="opt-cheat-recoil">چیت حذف لگد سلاح (Zero Recoil)</label>
                      <select
                        id="opt-cheat-recoil"
                        value={cheatConfig.zeroRecoil ? 'on' : 'off'}
                        onChange={(e) =>
                          engineApiRef.current?.updateCheats({ zeroRecoil: e.target.value === 'on' })
                        }
                      >
                        <option value="off">خاموش</option>
                        <option value="on">روشن (لیزری بدون لگد)</option>
                      </select>
                    </div>

                    <div className="setting-row" dir="rtl">
                      <label htmlFor="opt-cheat-god">چیت ضدضربه (God Mode)</label>
                      <select
                        id="opt-cheat-god"
                        value={cheatConfig.godMode ? 'on' : 'off'}
                        onChange={(e) =>
                          engineApiRef.current?.updateCheats({ godMode: e.target.value === 'on' })
                        }
                      >
                        <option value="off">خاموش</option>
                        <option value="on">روشن (ضدگلوله کامل)</option>
                      </select>
                    </div>

                    <div className="setting-row" dir="rtl">
                      <label htmlFor="opt-cheat-esp">چیت رادار نوری دشمنان (ESP Highlight)</label>
                      <select
                        id="opt-cheat-esp"
                        value={cheatConfig.espWallhack ? 'on' : 'off'}
                        onChange={(e) =>
                          engineApiRef.current?.updateCheats({ espWallhack: e.target.value === 'on' })
                        }
                      >
                        <option value="off">خاموش</option>
                        <option value="on">روشن (درخشش نئونی)</option>
                      </select>
                    </div>

                    <div className="setting-row" dir="rtl">
                      <label htmlFor="opt-cheat-speed">چیت سرعت و پرش فوق‌العاده (Super Speed)</label>
                      <select
                        id="opt-cheat-speed"
                        value={cheatConfig.superSpeed ? 'on' : 'off'}
                        onChange={(e) =>
                          engineApiRef.current?.updateCheats({ superSpeed: e.target.value === 'on' })
                        }
                      >
                        <option value="off">خاموش</option>
                        <option value="on">روشن (سرعت ۱.۶ برابر)</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Quick Access to Skins Loadout from Settings */}
            {ogFeatures.skinsAndCollection && (
            <div className="settings-skins-row" dir="rtl">
              <div>
                <div className="settings-skins-title">اسکین‌های سلاح (Loadout)</div>
                <div className="settings-skins-sub">
                  {isMatchInProgress(screenState)
                    ? IN_MATCH_SPIN_HINT_FA
                    : 'انتخاب اسکین میتیک، لجندری یا پیش‌فرض برای هر سلاح'}
                </div>
              </div>
              <button
                type="button"
                id="btn-open-skins-settings"
                data-testid="btn-open-skins-settings"
                className="title-skins-btn"
                onClick={() =>
                  openModalUrgent('skins', () => {
                    setDeferredSkinNoticeFa(null);
                    setShowSkinsModal(true);
                  })
                }
              >
                <span>✧ اسکین‌ها</span>
              </button>
            </div>
            )}

            {/* Redeem Code Section (independent of cheats & owner panel) */}
            {ogFeatures.redeemCodes && (
            <Suspense fallback={null}>
              <RedeemCodeSection
                ownedIds={cosmeticsState.ownedIds}
                equipped={cosmeticsState.equipped}
                reducedMotion={reducedMotion}
                onUnlockReward={handleUnlockRewardFromRedeem}
                onEquipReward={handleEquipRewardFromRedeem}
                onPlayRevealSound={(rarity) => engineApiRef.current?.playSpinReveal(rarity || 'legendary')}
                onPlayFireSound={() => engineApiRef.current?.playAKShot()}
                onPlayInfernoKillSound={(hs) => engineApiRef.current?.playInfernoKill(hs)}
                onPlayVoidShotSound={() => engineApiRef.current?.playVoidShot()}
                onPlayVoidKillSound={(hs) => engineApiRef.current?.playVoidKill(hs)}
                onPlayVoidScopeSound={(entering) => engineApiRef.current?.playVoidScopeToggle(entering)}
                onPlayTempestShotSound={(heat01) => engineApiRef.current?.playTempestShot(heat01)}
                onPlayTempestKillSound={(hs) => engineApiRef.current?.playTempestKill(hs)}
                onPlayTempestReloadPhaseSound={(phase) => engineApiRef.current?.playTempestReloadPhase(phase)}
                onPlayTempestInspectSound={() => engineApiRef.current?.playTempestInspect()}
                onPlayTempestEmoteSound={() => engineApiRef.current?.playTempestEmote()}
                onPlayEclipseShotSound={() => engineApiRef.current?.playEclipseShot()}
                onPlayEclipseKillSound={(hs) => engineApiRef.current?.playEclipseKill(hs)}
                onPlayEclipseReloadPhaseSound={(phase) => engineApiRef.current?.playEclipseReloadPhase(phase)}
                onPlayEclipseSightSound={(entering) => engineApiRef.current?.playEclipseSightToggle(entering)}
                onPlayEclipseInspectSound={() => engineApiRef.current?.playEclipseInspect()}
                onPlayEclipseEmoteSound={() => engineApiRef.current?.playEclipseEmote()}
                onPlaySakuraSlashSound={() => engineApiRef.current?.playSakuraSlash()}
                onPlaySakuraKillSound={(hs) => engineApiRef.current?.playSakuraKill(hs)}
                onPlayNovaRpgLaunchSound={() => engineApiRef.current?.playNovaRpgLaunch()}
                onPlayNovaRpgExplosionSound={() => engineApiRef.current?.playNovaRpgExplosion()}
                onPlayNovaRpgKillSound={(hs) => engineApiRef.current?.playNovaRpgKill(hs)}
              />
            </Suspense>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
              <button
                id="btn-toggle-fullscreen"
                data-testid="btn-toggle-fullscreen"
                type="button"
                className="secondary-btn"
                style={{ marginTop: 0 }}
                dir="rtl"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? 'خروج از تمام صفحه' : 'تمام صفحه'}
              </button>
              <button
                id="btn-close-settings"
                type="button"
                className="primary-btn"
                style={{ marginTop: 0 }}
                dir="rtl"
                onClick={() => {
                  if (screenState === 'paused') engineApiRef.current?.resumeSession();
                  else setShowSettingsModal(false);
                }}
              >
                {screenState === 'paused' ? 'ادامه بازی' : 'تایید و بازگشت'}
              </button>
            </div>

            {screenState === 'paused' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px' }}>
                  <button
                    type="button"
                    className="training-cta-btn accent-blue"
                    style={{ marginTop: 0 }}
                    dir="rtl"
                    onClick={() => {
                      openModalUrgent('online', () => {
                        setShowSettingsModal(false);
                        setShowOnlineModal(true);
                      });
                    }}
                  >
                    لابی آنلاین
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    style={{ marginTop: 0 }}
                    dir="rtl"
                    onClick={() => {
                      openModalUrgent('training', () => {
                        setShowSettingsModal(false);
                        setShowTrainingModal(true);
                      });
                    }}
                  >
                    تنظیمات تمرین
                  </button>
                  <button
                    id="btn-restart-settings"
                    type="button"
                    className="secondary-btn"
                    style={{ marginTop: 0 }}
                    dir="rtl"
                    onClick={() => engineApiRef.current?.startSession(playMode, trainingConfig)}
                  >
                    شروع مجدد
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    style={{ marginTop: 0 }}
                    dir="rtl"
                    onClick={() => engineApiRef.current?.returnToTitle()}
                  >
                    منوی اصلی
                  </button>
                </div>
            )}
          </div>
        </div>
        )
      )}

      {/* Unified Minimal Skin, Spin & Redeem Hub (Stacked above Settings so in-match Skins opens immediately on first click) */}
      {((showSpinModal && canOpenSpinWheel(screenState, ogFeatures.spinSystem)) ||
        (showSkinsModal && ogFeatures.skinsAndCollection)) && (
        <Suspense
          fallback={
            <ModalLoadingSkeleton
              title={
                showSkinsModal && (!showSpinModal || !canOpenSpinWheel(screenState, ogFeatures.spinSystem))
                  ? 'اسکین‌ها و کلکسیون'
                  : 'گردونهٔ اسپین'
              }
              testId="cosmetics-modal-skeleton"
              onClose={handleCloseCosmeticsModal}
            />
          }
        >
          {effectiveUiVersion === 'v3' ? (
            <CosmeticsHubV3
              initialTab={
                showSkinsModal && (!showSpinModal || !canOpenSpinWheel(screenState, ogFeatures.spinSystem))
                  ? 'skins'
                  : 'spin'
              }
              initialBannerId={spinInitialBannerId}
              allowSpin={canOpenSpinWheel(screenState, ogFeatures.spinSystem)}
              allowSkins={ogFeatures.skinsAndCollection}
              allowRedeem={ogFeatures.redeemCodes}
              isInMatch={isMatchInProgress(screenState)}
              deferredSkinNoticeFa={deferredSkinNoticeFa}
              state={cosmeticsState}
              reducedMotion={reducedMotion}
              onExecuteSpin={handleExecuteSpin}
              onClaimDailySpin={handleClaimDailySpin}
              onEquipItem={handleEquipCosmetic}
              onUnlockRewardFromRedeem={handleUnlockRewardFromRedeem}
              onEquipRewardFromRedeem={handleEquipRewardFromRedeem}
              {...cosmeticsSoundCallbacks}
              onClose={handleCloseCosmeticsModal}
            />
          ) : (
            <CosmeticsHubModal
              initialTab={
                showSkinsModal && (!showSpinModal || !canOpenSpinWheel(screenState, ogFeatures.spinSystem))
                  ? 'skins'
                  : 'spin'
              }
              initialBannerId={spinInitialBannerId}
              allowSpin={canOpenSpinWheel(screenState, ogFeatures.spinSystem)}
              allowSkins={ogFeatures.skinsAndCollection}
              allowRedeem={ogFeatures.redeemCodes}
              isInMatch={isMatchInProgress(screenState)}
              deferredSkinNoticeFa={deferredSkinNoticeFa}
              state={cosmeticsState}
              reducedMotion={reducedMotion}
              onExecuteSpin={handleExecuteSpin}
              onClaimDailySpin={handleClaimDailySpin}
              onEquipItem={handleEquipCosmetic}
              onUnlockRewardFromRedeem={handleUnlockRewardFromRedeem}
              onEquipRewardFromRedeem={handleEquipRewardFromRedeem}
              {...cosmeticsSoundCallbacks}
              onClose={handleCloseCosmeticsModal}
            />
          )}
        </Suspense>
      )}

      {/* Game Over Screen */}
      {screenState === 'gameover' && (
        effectiveUiVersion === 'v3' ? (
          <GameOverV3
            stats={gameOverStats}
            cheatConfig={cheatConfig}
            onRetry={() => engineApiRef.current?.startSession(playMode, trainingConfig)}
            onReturnToTitle={() => engineApiRef.current?.returnToTitle()}
          />
        ) : (
        <div id="gameover-screen" className="overlay-screen" role="dialog" aria-modal="true" aria-label="Game Over">
          <div className="panel-card">
            <div className="game-logo" style={{ color: '#f43f5e' }} dir="rtl">
              قطع ارتباط دوربین · سقوط
            </div>
            <div className="game-subtitle" dir="rtl">
              اپراتور در درگیری از پای درآمد
            </div>

            <div className="stats-grid stats-grid-summary" data-testid="gameover-summary-stats">
              <div className="stat-box">
                <div className="n" id="go-kills">
                  {gameOverStats.kills}
                </div>
                <div className="l" dir="rtl">
                  کشتن
                </div>
              </div>
              <div className="stat-box">
                <div className="n" id="go-deaths">
                  {gameOverStats.deaths}
                </div>
                <div className="l" dir="rtl">
                  مرگ
                </div>
              </div>
              <div className="stat-box">
                <div className="n" id="go-accuracy">
                  {computeAccuracyPercent(gameOverStats.shotsFired, gameOverStats.shotsHit)}%
                </div>
                <div className="l" dir="rtl">
                  دقت تیراندازی
                </div>
              </div>
              <div className="stat-box">
                <div className="n" id="go-headshots">
                  {gameOverStats.headshots}
                </div>
                <div className="l" dir="rtl">
                  هدشات
                </div>
              </div>
              <div className="stat-box">
                <div className="n" id="go-score">
                  {gameOverStats.score}
                </div>
                <div className="l" dir="rtl">
                  امتیاز کل
                </div>
              </div>
              <div className="stat-box">
                <div className="n" id="go-wave">
                  {gameOverStats.wave}
                </div>
                <div className="l" dir="rtl">
                  موج نهایی
                </div>
              </div>
            </div>

            <button
              id="btn-retry"
              type="button"
              className="primary-btn"
              dir="rtl"
              data-start="true"
              onClick={() => engineApiRef.current?.startSession(playMode, trainingConfig)}
            >
              بازی دوباره
            </button>
            <button
              type="button"
              className="secondary-btn"
              dir="rtl"
              onClick={() => engineApiRef.current?.returnToTitle()}
            >
              خروج به منوی اصلی
            </button>
          </div>
        </div>
        )
      )}

      {showLayoutEditor && (
        <Suspense
          fallback={
            <ModalLoadingSkeleton
              title="ویرایش چیدمان کنترل‌ها"
              testId="layout-editor-skeleton"
              onClose={() => setShowLayoutEditor(false)}
            />
          }
        >
          <ControlsLayoutEditor
            initialLayout={customControlLayout}
            activePreset={hudLayout}
            slideEnabled={ogFeatures.tacticalSlide && slideAlphaEnabled}
            controlsStyle={resolvedControlsStyle}
            onSave={handleSaveCustomControlLayout}
            onResetDefault={(defaults) => handleResetCustomControlLayout(defaults)}
            onClose={() => setShowLayoutEditor(false)}
          />
        </Suspense>
      )}

      {effectiveUiVersion === 'v3' ? (
        showOgIntro && (
          <Suspense fallback={null}>
            <OgIntroModalV3
              open={showOgIntro}
              bestScore={ogState.bestScore}
              bestWave={ogState.bestWave}
              onEnterOg={handleEnterOgMode}
              onClose={() => setShowOgIntro(false)}
            />
          </Suspense>
        )
      ) : (
        <OgIntroModal
          open={showOgIntro}
          bestScore={ogState.bestScore}
          bestWave={ogState.bestWave}
          onEnterOg={handleEnterOgMode}
          onClose={() => setShowOgIntro(false)}
        />
      )}

      {effectiveUiVersion === 'v3' && uiV3StateSnapshot && (
        <UiV3Provider state={uiV3StateSnapshot} hudSnapshot={null} onAction={handleUiV3Action}>
          <RotatePromptV3 />
        </UiV3Provider>
      )}
    </>
  );
}
