import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
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
  CheatConfig,
  DEFAULT_CHEAT_CONFIG,
  sanitizeTrainingConfig,
  sanitizeCheatConfig,
  computeAimAssistAngles,
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
  isRoundBasedMode,
  getTeamColor,
  getTeamNameFa,
  getTeamSpawnPosition,
  shouldInstantTeleportRemotePlayer,
  formatRoundClock,
  canDamagePlayer,
  formatGameModeFa,
  formatConnectionStatusFa,
  buildRoomInviteUrl,
  getCurrentOriginShareBaseUrl,
} from './game/rules';
import {
  CustomControlsLayout,
  CONTROL_SLOT_META,
  getDefaultControlLayout,
  loadSavedControlLayout,
  saveControlLayout,
  resetControlLayoutStorage,
  loadShowLeanHudButtons,
  saveShowLeanHudButtons,
} from './game/controlLayout';
import { APP_VERSION, BUILD_DATE } from './game/version';
import { PeerMultiplayerManager, AuthoritativeRoomState } from './game/peerOnline';
import { SoundEngine } from './game/sound';
import {
  makeConcreteTexture,
  makeAsphaltTexture,
  makeSandstoneTexture,
  makeCrateTexture,
  makeWallTexture,
  makeWoodTexture,
  makeFlashTexture,
  makeRedactedFaceTexture,
  makeNameplateTexture,
} from './game/textures';
import { TrainingModal } from './components/TrainingModal';
import { TutorialOverlay } from './components/TutorialOverlay';
import { OnlineModal, OnlineRoomSummary } from './components/OnlineModal';
import { ControlsLayoutEditor } from './components/ControlsLayoutEditor';
import type { LivePeerTelemetry } from './game/peerDiagnostics';
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
type GfxPresetName = 'promax' | 'ultramax' | 'ultra' | 'high' | 'med' | 'low' | 'potato';
type SettingsTabId = 'gfx' | 'loadout' | 'controls' | 'cheats';

interface EngineApi {
  startSession: (mode: GamePlayMode, customTraining?: TrainingConfig) => void;
  resumeSession: () => void;
  pauseSession: () => void;
  returnToTitle: () => void;
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
  setMap: (mapId: MapId) => void;
  updateCheats: (partial: Partial<CheatConfig>) => void;
  setBotDifficulty: (diff: BotDifficultyPreset) => void;
  setShowCrosshair: (show: boolean) => void;
  setSensitivity: (sens: number) => void;
  setAdsSensitivity: (sens: number) => void;
  setSoundEnabled: (enabled: boolean) => void;
  updateTrainingLive: (cfg: TrainingConfig) => void;
  createOnlineRoom: (mapId: MapId, mode: OnlineGameMode, password?: string) => void;
  changeOnlineGameMode: (mode: OnlineGameMode) => void;
  switchOnlineTeam: (playerId?: string) => void;
  joinOnlineRoom: (code: string, password?: string) => void;
  leaveOnlineRoom: () => void;
  setOnlineCallsign: (name: string) => void;
  getDiagnosticsTelemetry: () => Promise<LivePeerTelemetry>;
  toggleVoiceMic: () => void;
  setVoicePushToTalk: (active: boolean) => void;
  setVoiceMode: (mode: VoiceMode) => void;
  setVoiceVolume: (volume: number) => void;
  setVoiceChannelScope: (scope: VoiceChannelScope) => void;
  toggleMuteVoicePlayer: (playerId: string) => void;
  unlockVoiceAudio: () => void;
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

  const [currentMap, setCurrentMapState] = useState<MapId>('warehouse');
  const [cheatConfig, setCheatConfig] = useState<CheatConfig>(DEFAULT_CHEAT_CONFIG);
  const [cheatUnlocked, setCheatUnlocked] = useState(false);
  const [cheatUnlockRemainingSec, setCheatUnlockRemainingSec] = useState(0);
  const [cheatPasswordInput, setCheatPasswordInput] = useState('');
  const [cheatPassError, setCheatPassError] = useState<string | null>(null);

  const [loadout, setLoadoutState] = useState<WeaponId[]>(DEFAULT_LOADOUT);
  const [targetLoadoutSlot, setTargetLoadoutSlot] = useState<number>(2);
  const [isSniperScoped, setIsSniperScoped] = useState(false);
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
  const [hudRoomCopied, setHudRoomCopied] = useState(false);
  const [hudRoomExpanded, setHudRoomExpanded] = useState(false);
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

  const [gfxState, setGfxState] = useState<GfxState>({
    preset: 'high',
    resScale: 1.0,
    shadowMode: 'soft',
    targetFps: 0,
    bodycamFx: true,
    flashlightOn: true,
    vibrance: 1.42,
  });
  const [botDifficulty, setBotDifficultyState] = useState<BotDifficultyPreset>('medium');
  const [showCrosshair, setShowCrosshairState] = useState(true);
  const [sensitivity, setSensitivityState] = useState(2.65);
  const [adsSensitivity, setAdsSensitivityState] = useState(1.35);
  const [hudLayout, setHudLayout] = useState<HudLayoutPreset>('standard');
  const [hudScale, setHudScale] = useState(1.0);
  const [hudOpacity, setHudOpacity] = useState(0.95);
  const [showLeanHudButtons, setShowLeanHudButtons] = useState<boolean>(() => loadShowLeanHudButtons());
  const [showLayoutEditor, setShowLayoutEditor] = useState(false);
  const [customControlLayout, setCustomControlLayout] = useState<CustomControlsLayout>(() =>
    loadSavedControlLayout('standard')
  );
  const [touchSetting, setTouchSetting] = useState<'auto' | 'on' | 'off'>('auto');
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [activeWeaponIdx, setActiveWeaponIdx] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleToggleLeanHudButtons = useCallback((show: boolean) => {
    setShowLeanHudButtons(show);
    saveShowLeanHudButtons(show);
  }, []);

  const handleChangeHudLayoutPreset = useCallback((preset: HudLayoutPreset) => {
    setHudLayout(preset);
    const presetLayout = getDefaultControlLayout(preset);
    setCustomControlLayout(presetLayout);
    saveControlLayout(presetLayout);
  }, []);

  const handleSaveCustomControlLayout = useCallback((nextLayout: CustomControlsLayout) => {
    setCustomControlLayout(nextLayout);
    saveControlLayout(nextLayout);
    setShowLayoutEditor(false);
  }, []);

  const handleResetCustomControlLayout = useCallback(
    (defaultLayout?: CustomControlsLayout) => {
      resetControlLayoutStorage();
      const fresh = defaultLayout || getDefaultControlLayout(hudLayout);
      setCustomControlLayout(fresh);
    },
    [hudLayout]
  );

  const [trainingConfig, setTrainingConfig] = useState<TrainingConfig>(DEFAULT_TRAINING_CONFIG);
  const [tutorialState, setTutorialState] = useState<TutorialState>(() => createInitialTutorialState());
  const [gameOverStats, setGameOverStats] = useState({ score: 0, kills: 0, wave: 1 });

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

  useEffect(() => {
    loadoutRef.current = loadout;
  }, [loadout]);

  useEffect(() => {
    document.documentElement.style.setProperty('--hud-btn-scale', String(hudScale));
    document.documentElement.style.setProperty('--hud-opacity', String(hudOpacity));
  }, [hudScale, hudOpacity]);

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
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const sound = new SoundEngine();
    const canvas = document.createElement('canvas');
    canvas.id = 'game-canvas';
    canvas.dataset.testid = 'game-canvas';
    mountEl.innerHTML = '';
    mountEl.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.24;

    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x182232);
    scene.fog = new THREE.FogExp2(0x182232, 0.017);

    // Studio RoomEnvironment reflection map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

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
    dirLight.shadow.camera.far = 140;
    const dSize = 52;
    dirLight.shadow.camera.left = -dSize;
    dirLight.shadow.camera.right = dSize;
    dirLight.shadow.camera.top = dSize;
    dirLight.shadow.camera.bottom = -dSize;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

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
        precision highp float;
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
    const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat);
    postScene.add(postQuad);

    const gfx: GfxState = {
      preset: 'high',
      resScale: 1.0,
      shadowMode: isSoftwareGl ? 'off' : 'soft',
      targetFps: 0,
      bodycamFx: true,
      flashlightOn: true,
      vibrance: 1.42,
    };

    function rebuildRenderTarget() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const maxDprCap =
        gfx.preset === 'promax'
          ? 2.75
          : gfx.preset === 'ultramax'
            ? 2.5
            : gfx.preset === 'ultra'
              ? 2.25
              : gfx.preset === 'high'
                ? 1.75
                : gfx.preset === 'potato'
                  ? 1.0
                  : 1.3;
      const baseDpr = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, maxDprCap);
      renderer.setPixelRatio(baseDpr * (isSoftwareGl ? 1 : gfx.resScale));
      renderer.setSize(w, h);

      if (renderTarget) {
        renderTarget.dispose();
        renderTarget = null;
      }
      if (gfx.bodycamFx && !isSoftwareGl) {
        const rw = Math.max(160, Math.floor(w * baseDpr * gfx.resScale));
        const rh = Math.max(120, Math.floor(h * baseDpr * gfx.resScale));
        renderTarget = new THREE.WebGLRenderTarget(rw, rh, {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          format: THREE.RGBAFormat,
        });
        postUniforms.tDiffuse.value = renderTarget.texture;
      }
    }

    function applyShadowSettings() {
      const enabled = !isSoftwareGl && gfx.shadowMode !== 'off';
      renderer.shadowMap.enabled = enabled;
      renderer.shadowMap.type =
        gfx.shadowMode === 'ultra' || gfx.shadowMode === 'soft'
          ? THREE.PCFSoftShadowMap
          : THREE.BasicShadowMap;
      dirLight.castShadow = enabled;

      if (dirLight.shadow.map) {
        dirLight.shadow.map.dispose();
        (dirLight.shadow as unknown as { map: null }).map = null;
      }
      const sSize = gfx.shadowMode === 'ultra' ? 4096 : gfx.shadowMode === 'soft' ? 2048 : 1024;
      if (dirLight.shadow.mapSize.width !== sSize) {
        dirLight.shadow.mapSize.set(sSize, sSize);
      }
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.material) {
          if (Array.isArray(mesh.material)) mesh.material.forEach((m) => (m.needsUpdate = true));
          else mesh.material.needsUpdate = true;
        }
      });
      renderer.shadowMap.needsUpdate = true;
    }

    function applyLightingSettings() {
      const isUltraTier = gfx.preset === 'promax' || gfx.preset === 'ultramax' || gfx.preset === 'ultra';
      flashlight.visible = gfx.flashlightOn;
      flashlight.intensity = gfx.preset === 'promax' ? 3.5 : isUltraTier ? 3.2 : 2.6;
      hemiLight.intensity = gfx.flashlightOn ? 0.9 : 1.14;
      dirLight.intensity = gfx.flashlightOn ? 1.22 : 1.35;
      renderer.toneMappingExposure = gfx.preset === 'promax' ? 1.34 : isUltraTier ? 1.3 : 1.22;
    }

    function applyBodycamFXSettings() {
      const isUltraTier = gfx.preset === 'promax' || gfx.preset === 'ultramax' || gfx.preset === 'ultra';
      bodycamMode = gfx.bodycamFx;
      baseFov = bodycamMode ? 88 : 75;
      postUniforms.uFisheye.value = gfx.preset === 'low' || gfx.preset === 'potato' ? 0.18 : 0.34;
      postUniforms.uChromatic.value = isUltraTier ? 0.012 : gfx.preset === 'high' ? 0.01 : 0.006;
      postUniforms.uGrain.value = gfx.preset === 'low' || gfx.preset === 'potato' ? 0.025 : 0.038;
      postUniforms.uUltraSharpen.value =
        gfx.preset === 'promax' ? 0.92 : gfx.preset === 'ultramax' ? 0.82 : gfx.preset === 'ultra' ? 0.72 : gfx.preset === 'high' ? 0.35 : 0.0;
      postUniforms.uVibrance.value = gfx.vibrance;
      rebuildRenderTarget();
    }

    // =========================================================
    // 3 LARGE VIBRANT ARENA MAPS (96m x 96m) + DESTRUCTIBLE POTS, TIRES & 3D CHICKENS
    // =========================================================
    const ARENA_HALF = 48;
    const wallColliders: WallCollider[] = [];
    const shootableEnvironment: THREE.Object3D[] = [];
    const mapRootGroup = new THREE.Group();
    scene.add(mapRootGroup);

    const concreteTex = makeConcreteTexture(maxAniso);
    const asphaltTex = makeAsphaltTexture(maxAniso);
    const sandstoneTex = makeSandstoneTexture(maxAniso);
    const wallTex = makeWallTexture(maxAniso);
    const crateTexAmber = makeCrateTexture('#6b481b', '#ff9f1c', maxAniso);
    const crateTexCyan = makeCrateTexture('#1b4965', '#00f0ff', maxAniso);
    const crateTexCrimson = makeCrateTexture('#691e2c', '#ff2e4c', maxAniso);
    const crateTexEmerald = makeCrateTexture('#1b4d3e', '#10b981', maxAniso);

    // Shared Low-Poly Geometries & Materials for Props (Mobile Optimized)
    const potBaseGeo = new THREE.CylinderGeometry(0.32, 0.21, 0.48, 8);
    const potRimGeo = new THREE.CylinderGeometry(0.36, 0.33, 0.09, 8);
    const potSoilGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.06, 8);
    const leafGeo = new THREE.ConeGeometry(0.24, 0.52, 5);
    const flowerGeo = new THREE.DodecahedronGeometry(0.11, 0);
    const potClayMat = new THREE.MeshStandardMaterial({ color: 0xd95f2a, roughness: 0.72, metalness: 0.08 });
    const potSoilMat = new THREE.MeshStandardMaterial({ color: 0x3b2618, roughness: 0.95 });
    const potLeafMat = new THREE.MeshStandardMaterial({ color: 0x16c65a, roughness: 0.55 });
    const potFlowerMatA = new THREE.MeshStandardMaterial({ color: 0xff2e63, emissive: 0x330512, roughness: 0.4 });
    const potFlowerMatB = new THREE.MeshStandardMaterial({ color: 0xffbe0b, emissive: 0x332200, roughness: 0.4 });

    const tireGeo = new THREE.TorusGeometry(0.38, 0.16, 7, 12);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1c2026, roughness: 0.88, metalness: 0.15 });
    const tireRimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4, metalness: 0.65 });

    const chkBodyGeo = new THREE.BoxGeometry(0.34, 0.28, 0.44);
    const chkHeadGeo = new THREE.BoxGeometry(0.2, 0.22, 0.2);
    const chkBeakGeo = new THREE.ConeGeometry(0.055, 0.14, 4);
    const chkCombGeo = new THREE.BoxGeometry(0.06, 0.11, 0.16);
    const chkWingGeo = new THREE.BoxGeometry(0.06, 0.18, 0.28);
    const chkLegGeo = new THREE.BoxGeometry(0.04, 0.18, 0.04);
    const chkWhiteMat = new THREE.MeshStandardMaterial({ color: 0xfffbeb, roughness: 0.7 });
    const chkBeakMat = new THREE.MeshStandardMaterial({ color: 0xff9f1c, roughness: 0.5 });
    const chkCombMat = new THREE.MeshStandardMaterial({ color: 0xff1e42, emissive: 0x330008, roughness: 0.5 });

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

    interface RoamingChicken {
      group: THREE.Group;
      hitMesh: THREE.Mesh;
      headGroup: THREE.Group;
      wingL: THREE.Mesh;
      wingR: THREE.Mesh;
      legL: THREE.Mesh;
      legR: THREE.Mesh;
      x: number;
      z: number;
      yaw: number;
      targetYaw: number;
      speed: number;
      walkPhase: number;
      peckTimer: number;
      changeDirTimer: number;
      alive: boolean;
      respawnTimer: number;
    }
    const chickens: RoamingChicken[] = [];

    function spawnPotAt(x: number, y: number, z: number, flowerVariant = 0) {
      const g = new THREE.Group();
      g.position.set(x, y, z);

      const base = new THREE.Mesh(potBaseGeo, potClayMat);
      base.position.y = 0.24;
      const rim = new THREE.Mesh(potRimGeo, potClayMat);
      rim.position.y = 0.46;
      const soil = new THREE.Mesh(potSoilGeo, potSoilMat);
      soil.position.y = 0.49;

      const leaf1 = new THREE.Mesh(leafGeo, potLeafMat);
      leaf1.position.set(0, 0.72, 0);
      const leaf2 = new THREE.Mesh(leafGeo, potLeafMat);
      leaf2.position.set(0.1, 0.66, 0.06);
      leaf2.rotation.z = -0.35;
      const leaf3 = new THREE.Mesh(leafGeo, potLeafMat);
      leaf3.position.set(-0.1, 0.66, -0.06);
      leaf3.rotation.z = 0.35;

      const blossom = new THREE.Mesh(flowerGeo, flowerVariant % 2 === 0 ? potFlowerMatA : potFlowerMatB);
      blossom.position.set(0, 0.96, 0);

      g.add(base, rim, soil, leaf1, leaf2, leaf3, blossom);
      mapRootGroup.add(g);

      const potObj: DestructiblePot = {
        group: g,
        hitMesh: base,
        x,
        y,
        z,
        alive: true,
        respawnTimer: 0,
      };
      base.userData = { pot: potObj };
      rim.userData = { pot: potObj };
      leaf1.userData = { pot: potObj };
      shootableEnvironment.push(base, rim, leaf1);
      pots.push(potObj);
    }

    function addTireStack(x: number, z: number, count = 3) {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      for (let i = 0; i < count; i++) {
        const t = new THREE.Mesh(tireGeo, tireMat);
        t.rotation.x = Math.PI / 2;
        t.position.set((i % 2 === 1 ? 0.04 : -0.03), 0.16 + i * 0.3, 0);
        g.add(t);
      }
      const rimCap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 10), tireRimMat);
      rimCap.position.set(0, count * 0.3, 0);
      g.add(rimCap);
      mapRootGroup.add(g);

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

    function spawnChickenAt(x: number, z: number) {
      const g = new THREE.Group();
      g.position.set(x, 0, z);

      const body = new THREE.Mesh(chkBodyGeo, chkWhiteMat);
      body.position.set(0, 0.3, 0);

      const wingL = new THREE.Mesh(chkWingGeo, chkWhiteMat);
      wingL.position.set(-0.2, 0.31, 0);
      const wingR = new THREE.Mesh(chkWingGeo, chkWhiteMat);
      wingR.position.set(0.2, 0.31, 0);

      const headGroup = new THREE.Group();
      headGroup.position.set(0, 0.46, 0.18);
      const head = new THREE.Mesh(chkHeadGeo, chkWhiteMat);
      const beak = new THREE.Mesh(chkBeakGeo, chkBeakMat);
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, 0.01, 0.15);
      const comb = new THREE.Mesh(chkCombGeo, chkCombMat);
      comb.position.set(0, 0.14, 0.01);
      headGroup.add(head, beak, comb);

      const legL = new THREE.Mesh(chkLegGeo, chkBeakMat);
      legL.position.set(-0.09, 0.1, 0);
      const legR = new THREE.Mesh(chkLegGeo, chkBeakMat);
      legR.position.set(0.09, 0.1, 0);

      g.add(body, wingL, wingR, headGroup, legL, legR);
      mapRootGroup.add(g);

      const yaw = Math.random() * Math.PI * 2;
      const chk: RoamingChicken = {
        group: g,
        hitMesh: body,
        headGroup,
        wingL,
        wingR,
        legL,
        legR,
        x,
        z,
        yaw,
        targetYaw: yaw,
        speed: 1.65 + Math.random() * 0.7,
        walkPhase: Math.random() * Math.PI * 2,
        peckTimer: 0,
        changeDirTimer: 1.5 + Math.random() * 2.5,
        alive: true,
        respawnTimer: 0,
      };
      body.userData = { chicken: chk };
      head.userData = { chicken: chk };
      shootableEnvironment.push(body, head);
      chickens.push(chk);
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
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.position.set(x, yBase + h / 2, z);
      mesh.castShadow = !isSoftwareGl;
      mesh.receiveShadow = !isSoftwareGl;
      mapRootGroup.add(mesh);
      shootableEnvironment.push(mesh);
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
      return mesh;
    }

    function addDesertPalmTree(x: number, z: number) {
      const palmGroup = new THREE.Group();
      palmGroup.position.set(x, 0, z);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x785338, roughness: 0.9 });
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.65, side: THREE.DoubleSide });
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 4.6, 8), trunkMat);
      trunk.position.y = 2.3;
      palmGroup.add(trunk);
      for (let i = 0; i < 6; i++) {
        const frond = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 2.2), leafMat);
        const angle = (i * Math.PI) / 3;
        frond.position.set(Math.sin(angle) * 0.95, 4.55, Math.cos(angle) * 0.95);
        frond.rotation.y = angle;
        frond.rotation.x = 0.38;
        palmGroup.add(frond);
      }
      mapRootGroup.add(palmGroup);
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

    function buildArenaMap(mapId: MapId) {
      // Clear previous map objects
      while (mapRootGroup.children.length > 0) {
        mapRootGroup.remove(mapRootGroup.children[0]);
      }
      wallColliders.length = 0;
      shootableEnvironment.length = 0;
      pots.length = 0;
      chickens.length = 0;

      const matAmber = new THREE.MeshStandardMaterial({ color: 0xffffff, map: crateTexAmber, roughness: 0.68, metalness: 0.2 });
      const matCyan = new THREE.MeshStandardMaterial({ color: 0xffffff, map: crateTexCyan, roughness: 0.68, metalness: 0.22 });
      const matCrimson = new THREE.MeshStandardMaterial({ color: 0xffffff, map: crateTexCrimson, roughness: 0.68, metalness: 0.22 });
      const matEmerald = new THREE.MeshStandardMaterial({ color: 0xffffff, map: crateTexEmerald, roughness: 0.68, metalness: 0.2 });
      const neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      const neonAmberMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
      const neonPinkMat = new THREE.MeshBasicMaterial({ color: 0xff2e63 });

      if (mapId === 'warehouse') {
        // MAP 1: NEON TACTICAL WAREHOUSE
        scene.background = new THREE.Color(0x142030);
        scene.fog = new THREE.FogExp2(0x142030, 0.015);
        hemiLight.color.setHex(0xd8ecff);
        hemiLight.groundColor.setHex(0x3d2e24);
        dirLight.color.setHex(0xfff1d6);

        const floorMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(ARENA_HALF * 2, ARENA_HALF * 2),
          new THREE.MeshStandardMaterial({ color: 0xe2e8f0, map: concreteTex, roughness: 0.78, metalness: 0.12 })
        );
        floorMesh.rotation.x = -Math.PI / 2;
        floorMesh.receiveShadow = true;
        mapRootGroup.add(floorMesh);
        shootableEnvironment.push(floorMesh);

        const zoneCenter = new THREE.Mesh(
          new THREE.RingGeometry(4.2, 4.55, 32),
          new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide })
        );
        zoneCenter.rotation.x = -Math.PI / 2;
        zoneCenter.position.y = 0.02;
        mapRootGroup.add(zoneCenter);

        const periMat = new THREE.MeshStandardMaterial({ color: 0xdbeafe, map: wallTex, roughness: 0.8, metalness: 0.12 });
        addMapBox(0, -ARENA_HALF, ARENA_HALF * 2, 5.8, 1.6, periMat);
        addMapBox(0, ARENA_HALF, ARENA_HALF * 2, 5.8, 1.6, periMat);
        addMapBox(-ARENA_HALF, 0, 1.6, 5.8, ARENA_HALF * 2, periMat);
        addMapBox(ARENA_HALF, 0, 1.6, 5.8, ARENA_HALF * 2, periMat);

        [-ARENA_HALF + 0.85, ARENA_HALF - 0.85].forEach((zPos, i) => {
          const strip = new THREE.Mesh(
            new THREE.BoxGeometry(ARENA_HALF * 1.8, 0.16, 0.12),
            i === 0 ? neonCyanMat : neonAmberMat
          );
          strip.position.set(0, 3.8, zPos);
          mapRootGroup.add(strip);
        });

        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.65, metalness: 0.28 });
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
          const beam = new THREE.Mesh(
            new THREE.BoxGeometry(ARENA_HALF * 2 - 2, 0.35, 0.45),
            idx % 2 === 1 ? neonCyanMat : neonAmberMat
          );
          beam.position.set(0, 5.7, zPos);
          mapRootGroup.add(beam);
        });
      } else if (mapId === 'docks') {
        // MAP 2: CARGO CONTAINER DOCKS XL (96m x 96m)
        scene.background = new THREE.Color(0x0b192c);
        scene.fog = new THREE.FogExp2(0x0b192c, 0.011);
        hemiLight.color.setHex(0x7dd3fc);
        hemiLight.groundColor.setHex(0x1e293b);
        dirLight.color.setHex(0xe0f2fe);

        const floorMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(ARENA_HALF * 2, ARENA_HALF * 2),
          new THREE.MeshStandardMaterial({ color: 0xdbeafe, map: asphaltTex, roughness: 0.55, metalness: 0.25 })
        );
        floorMesh.rotation.x = -Math.PI / 2;
        floorMesh.receiveShadow = true;
        mapRootGroup.add(floorMesh);
        shootableEnvironment.push(floorMesh);

        const periMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, map: wallTex, roughness: 0.75, metalness: 0.25 });
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

        const craneMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5, metalness: 0.5 });
        addMapBox(-22, 0, 1.6, 8.5, 1.6, craneMat);
        addMapBox(22, 0, 1.6, 8.5, 1.6, craneMat);
        addMapBox(0, 0, 46, 1.1, 1.4, craneMat, 8.0, false);
        addMapBox(0, 0, 42, 0.25, 0.35, neonPinkMat, 7.7, false);
      } else {
        // MAP 3: DESERT CANYON OUTPOST XL (96m x 96m — Warm Sunlit Sandstone Fortress, 4 Sniper Towers, Arches & Oasis)
        scene.background = new THREE.Color(0xc89666);
        scene.fog = new THREE.FogExp2(0xc28e5c, 0.0068);
        hemiLight.color.setHex(0xffe4b5);
        hemiLight.groundColor.setHex(0x7c4a27);
        dirLight.color.setHex(0xfff3d1);

        const floorMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(ARENA_HALF * 2, ARENA_HALF * 2),
          new THREE.MeshStandardMaterial({ color: 0xfcd34d, map: sandstoneTex, roughness: 0.86, metalness: 0.04 })
        );
        floorMesh.rotation.x = -Math.PI / 2;
        floorMesh.receiveShadow = true;
        mapRootGroup.add(floorMesh);
        shootableEnvironment.push(floorMesh);

        // Sandstone Courtyard Paved Ring
        const courtyardOct = new THREE.Mesh(
          new THREE.RingGeometry(3.8, 8.2, 8),
          new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.85, side: THREE.DoubleSide })
        );
        courtyardOct.rotation.x = -Math.PI / 2;
        courtyardOct.position.y = 0.02;
        mapRootGroup.add(courtyardOct);

        const sandWallMat = new THREE.MeshStandardMaterial({
          color: 0xfbbf24,
          map: sandstoneTex,
          roughness: 0.8,
          metalness: 0.06,
        });
        const terracottaMat = new THREE.MeshStandardMaterial({
          color: 0xc2410c,
          roughness: 0.72,
          metalness: 0.08,
        });
        const hescoMat = new THREE.MeshStandardMaterial({
          color: 0xa8a29e,
          map: crateTexAmber,
          roughness: 0.82,
          metalness: 0.12,
        });

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

        // Desert Oasis Palm Trees
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

      // Map-Aware Destructible Flower Pots (never overlapping walls)
      const potCoords: Array<[number, number, number]> =
        mapId === 'outpost'
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

      // Tactical Rubber Tire Stacks at Open Cover Corners
      const tireSpots: Array<[number, number, number]> =
        mapId === 'outpost'
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

      // Animated 3D Roaming Chickens
      const chickenSpots: Array<[number, number]> = [
        [-5, 12],
        [6, -12],
        [-14, -2],
        [14, 2],
        [-8, -18],
        [8, 18],
        [2, 7],
      ];
      chickenSpots.forEach((cs) => spawnChickenAt(cs[0], cs[1]));
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
    const pickupSpots: Array<{ x: number; z: number; type: 'hp' | 'armor' | 'power' }> = [
      { x: -10, z: -10, type: 'hp' },
      { x: 10, z: 10, type: 'hp' },
      { x: -10, z: 10, type: 'armor' },
      { x: 10, z: -10, type: 'armor' },
      { x: 0, z: -20, type: 'power' },
      { x: 0, z: 20, type: 'power' },
    ];

    function createPickups() {
      pickups.forEach((p) => scene.remove(p.group));
      pickups.length = 0;

      pickupSpots.forEach((spot) => {
        const g = new THREE.Group();
        const colMap = { hp: 0x00e676, armor: 0x38bdf8, power: 0xc084fc };
        const emiMap = { hp: 0x006633, armor: 0x0b4c6e, power: 0x581c87 };
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(0.65, 0.45, 0.65),
          new THREE.MeshStandardMaterial({
            color: colMap[spot.type],
            emissive: emiMap[spot.type],
            roughness: 0.35,
            metalness: 0.25,
          })
        );
        g.add(box);

        if (spot.type === 'hp') {
          const cMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
          const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.12), cMat);
          c1.position.y = 0.24;
          const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.36), cMat);
          c2.position.y = 0.24;
          g.add(c1, c2);
        }

        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.55, 0.72, 24),
          new THREE.MeshBasicMaterial({
            color: colMap[spot.type],
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.45,
            depthWrite: false,
          })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = -0.35;
        g.add(ring);

        g.position.set(spot.x, 0.6, spot.z);
        scene.add(g);
        pickups.push({ group: g, type: spot.type, x: spot.x, z: spot.z, active: true, timer: 0 });
      });
    }

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

    const woodTex = makeWoodTexture(maxAniso);
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

    const metalDark = new THREE.MeshStandardMaterial({ color: 0x1e2228, metalness: 0.85, roughness: 0.35 });
    const metalSteel = new THREE.MeshStandardMaterial({ color: 0x606975, metalness: 0.9, roughness: 0.28 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: woodTex, roughness: 0.72, metalness: 0.05 });
    const gloveMat = new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 0.85 });
    const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x242a33, roughness: 0.9 });

    function buildAK47() {
      const g = new THREE.Group();
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.07, 0.29), metalDark);
      g.add(receiver);
      const dust = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.024, 0.26), metalSteel);
      dust.position.set(0, 0.042, 0.01);
      g.add(dust);
      // Picatinny Top Rail + Tactical Micro Reflex Sight
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.01, 0.16), metalDark);
      rail.position.set(0, 0.056, -0.02);
      g.add(rail);
      const reflexFrame = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.032, 0.048), metalDark);
      reflexFrame.position.set(0, 0.072, -0.03);
      g.add(reflexFrame);
      const sightDot = new THREE.Mesh(
        new THREE.SphereGeometry(0.004, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x00ff88 })
      );
      sightDot.position.set(0, 0.074, -0.03);
      g.add(sightDot);

      const ch = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.014, 0.022), metalSteel);
      ch.position.set(0.036, 0.02, -0.02);
      g.add(ch);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.082, 0.23), woodMat);
      stock.position.set(0, -0.018, 0.24);
      stock.rotation.x = 0.08;
      g.add(stock);
      const buttpad = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.088, 0.022), gloveMat);
      buttpad.position.set(0, -0.026, 0.355);
      g.add(buttpad);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.095, 0.045), woodMat);
      grip.position.set(0, -0.072, 0.095);
      grip.rotation.x = -0.32;
      g.add(grip);
      const hg = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.056, 0.19), woodMat);
      hg.position.set(0, 0.005, -0.22);
      g.add(hg);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.35, 12), metalDark);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.01, -0.4);
      g.add(barrel);
      const muzzleBrake = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.015, 0.055, 10), metalSteel);
      muzzleBrake.rotation.x = Math.PI / 2;
      muzzleBrake.position.set(0, 0.01, -0.57);
      g.add(muzzleBrake);
      const gasTube = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.18, 8), metalDark);
      gasTube.rotation.x = Math.PI / 2;
      gasTube.position.set(0, 0.032, -0.24);
      g.add(gasTube);
      const fs = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.038, 0.018), metalDark);
      fs.position.set(0, 0.032, -0.52);
      g.add(fs);

      const laserBox = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.024, 0.065), metalDark);
      laserBox.position.set(0.036, 0.012, -0.25);
      g.add(laserBox);

      const magGroup = new THREE.Group();
      const magMat = new THREE.MeshStandardMaterial({ color: 0x382419, metalness: 0.35, roughness: 0.55 });
      const seg1 = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.088, 0.054), magMat);
      seg1.position.set(0, -0.065, -0.025);
      seg1.rotation.x = 0.14;
      const seg2 = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.088, 0.052), magMat);
      seg2.position.set(0, -0.135, -0.048);
      seg2.rotation.x = 0.36;
      magGroup.add(seg1, seg2);
      g.add(magGroup);

      const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.065, 0.075), gloveMat);
      rHand.position.set(0.008, -0.07, 0.1);
      const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.055, 0.085), gloveMat);
      lHand.position.set(-0.01, -0.025, -0.22);
      const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.065, 0.24), sleeveMat);
      lArm.position.set(-0.09, -0.11, -0.08);
      lArm.rotation.set(0.32, -0.35, 0);
      g.add(rHand, lHand, lArm);

      return { group: g, mag: magGroup, muzzlePos: new THREE.Vector3(0, 0.012, -0.6) };
    }

    function buildSniper() {
      // AWM .338 Lapua Bolt-Action Sniper Rifle with Dual-Ring 8X Scope, Fluted Barrel, Muzzle Brake & Bipod
      const g = new THREE.Group();
      const chassisMat = new THREE.MeshStandardMaterial({ color: 0x2d3a2e, roughness: 0.58, metalness: 0.32 });
      const scopeGlassMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9 });

      // Polymer Tactical Chassis & Receiver
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.066, 0.36), chassisMat);
      g.add(chassis);
      const upperRec = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.036, 0.28), metalDark);
      upperRec.position.set(0, 0.044, -0.01);
      g.add(upperRec);

      // Bolt Handle with Spherical Knob
      const boltShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.048, 8), metalSteel);
      boltShaft.rotation.z = -Math.PI / 2.4;
      boltShaft.position.set(0.038, 0.036, 0.05);
      const boltKnob = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), metalDark);
      boltKnob.position.set(0.056, 0.024, 0.05);
      g.add(boltShaft, boltKnob);

      // Thumbhole Sniper Stock & Adjustable Cheek Rest
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.092, 0.26), chassisMat);
      stock.position.set(0, -0.016, 0.28);
      g.add(stock);
      const cheekRest = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.032, 0.14), gloveMat);
      cheekRest.position.set(0, 0.038, 0.26);
      g.add(cheekRest);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.098, 0.048), gloveMat);
      grip.position.set(0, -0.072, 0.12);
      grip.rotation.x = -0.24;
      g.add(grip);

      // Long Heavy Free-Floated Fluted Barrel + Multi-Port .338 Muzzle Brake
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.016, 0.56, 12), metalDark);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.036, -0.42);
      g.add(barrel);
      const muzzleBrake = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.028, 0.075), metalSteel);
      muzzleBrake.position.set(0, 0.036, -0.72);
      g.add(muzzleBrake);

      // Folding Tactical Bipod under Forend
      const bipodMount = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.024, 0.045), metalDark);
      bipodMount.position.set(0, -0.032, -0.24);
      const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.17, 6), metalSteel);
      legL.rotation.x = Math.PI / 2;
      legL.position.set(-0.024, -0.046, -0.32);
      const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.17, 6), metalSteel);
      legR.rotation.x = Math.PI / 2;
      legR.position.set(0.024, -0.046, -0.32);
      g.add(bipodMount, legL, legR);

      // Dual-Ring High-Magnification 8X Telescopic Scope
      const scopeRail = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.012, 0.22), metalSteel);
      scopeRail.position.set(0, 0.065, -0.02);
      const ringRear = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.038, 0.022), metalDark);
      ringRear.position.set(0, 0.088, 0.04);
      const ringFront = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.038, 0.022), metalDark);
      ringFront.position.set(0, 0.088, -0.08);
      const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.26, 14), metalDark);
      scopeTube.rotation.x = Math.PI / 2;
      scopeTube.position.set(0, 0.098, -0.02);
      const scopeBellFront = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.02, 0.075, 14), metalDark);
      scopeBellFront.rotation.x = Math.PI / 2;
      scopeBellFront.position.set(0, 0.098, -0.17);
      const scopeEyepiece = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.055, 14), metalDark);
      scopeEyepiece.rotation.x = Math.PI / 2;
      scopeEyepiece.position.set(0, 0.098, 0.12);
      const lensBack = new THREE.Mesh(new THREE.CircleGeometry(0.019, 14), scopeGlassMat);
      lensBack.position.set(0, 0.098, 0.148);
      const turretTop = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.018, 10), metalSteel);
      turretTop.position.set(0, 0.12, -0.02);
      g.add(scopeRail, ringRear, ringFront, scopeTube, scopeBellFront, scopeEyepiece, lensBack, turretTop);

      // .338 Lapua Box Magazine
      const magGroup = new THREE.Group();
      const boxMag = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.095, 0.086), metalDark);
      boxMag.position.set(0, -0.068, -0.02);
      magGroup.add(boxMag);
      g.add(magGroup);

      // Operator Hands
      const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.065, 0.075), gloveMat);
      rHand.position.set(0.008, -0.07, 0.12);
      const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.055, 0.085), gloveMat);
      lHand.position.set(-0.008, -0.026, -0.16);
      const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.065, 0.24), sleeveMat);
      lArm.position.set(-0.09, -0.11, -0.05);
      lArm.rotation.set(0.32, -0.35, 0);
      g.add(rHand, lHand, lArm);

      return { group: g, mag: magGroup, muzzlePos: new THREE.Vector3(0, 0.036, -0.76) };
    }

    function buildMP5() {
      // MP5-SD Navy Tactical SMG with Integral Ribbed Suppressor & Curved 9mm Mag
      const g = new THREE.Group();
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.064, 0.23), metalDark);
      g.add(receiver);
      const upperTube = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.32, 12), metalSteel);
      upperTube.rotation.x = Math.PI / 2;
      upperTube.position.set(0, 0.034, -0.06);
      g.add(upperTube);

      // Red Dot Sight on Claw Mount
      const opticMount = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.032, 0.056), metalDark);
      opticMount.position.set(0, 0.064, 0.0);
      const redDot = new THREE.Mesh(
        new THREE.SphereGeometry(0.004, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      redDot.position.set(0, 0.066, 0.0);
      g.add(opticMount, redDot);

      // Ribbed Integral SD Handguard + Suppressor Can
      const sdHandguard = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.18, 12), gloveMat);
      sdHandguard.rotation.x = Math.PI / 2;
      sdHandguard.position.set(0, 0.006, -0.2);
      const sdSuppressor = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.18, 14), metalDark);
      sdSuppressor.rotation.x = Math.PI / 2;
      sdSuppressor.position.set(0, 0.006, -0.36);
      g.add(sdHandguard, sdSuppressor);

      // Collapsible Wire Stock & Pistol Grip
      const stockPad = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.035), gloveMat);
      stockPad.position.set(0, -0.01, 0.24);
      const stockRailL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.01, 0.16), metalSteel);
      stockRailL.position.set(-0.024, 0.005, 0.16);
      const stockRailR = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.01, 0.16), metalSteel);
      stockRailR.position.set(0.024, 0.005, 0.16);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.09, 0.042), gloveMat);
      grip.position.set(0, -0.068, 0.065);
      grip.rotation.x = -0.26;
      g.add(stockPad, stockRailL, stockRailR, grip);

      // Curved 9mm Magazine
      const magGroup = new THREE.Group();
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.135, 0.036), metalSteel);
      mag.position.set(0, -0.085, -0.045);
      mag.rotation.x = 0.22;
      magGroup.add(mag);
      g.add(magGroup);

      // Operator Hands
      const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.062, 0.07), gloveMat);
      rHand.position.set(0.006, -0.065, 0.07);
      const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.055, 0.075), gloveMat);
      lHand.position.set(-0.006, -0.022, -0.2);
      const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.062, 0.22), sleeveMat);
      lArm.position.set(-0.085, -0.11, -0.07);
      lArm.rotation.set(0.32, -0.35, 0);
      g.add(rHand, lHand, lArm);

      return { group: g, mag: magGroup, muzzlePos: new THREE.Vector3(0, 0.006, -0.46) };
    }

    function buildPistol() {
      const g = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.028, 0.19), metalDark);
      frame.position.set(0, 0, -0.02);
      g.add(frame);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.105, 0.05), gloveMat);
      grip.position.set(0, -0.058, 0.045);
      grip.rotation.x = -0.26;
      g.add(grip);
      const tg = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.026, 0.044), metalDark);
      tg.position.set(0, -0.022, -0.01);
      g.add(tg);
      const laser = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.02, 0.048), metalDark);
      laser.position.set(0, -0.02, -0.075);
      g.add(laser);
      const laserDot = new THREE.Mesh(
        new THREE.BoxGeometry(0.008, 0.008, 0.006),
        new THREE.MeshBasicMaterial({ color: 0xff2244 })
      );
      laserDot.position.set(0, -0.02, -0.102);
      g.add(laserDot);

      const slide = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.032, 0.21), metalSteel);
      slide.position.set(0, 0.024, -0.02);
      const dotMat = new THREE.MeshBasicMaterial({ color: 0x00ff99 });
      const rsL = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.008, 0.008), dotMat);
      rsL.position.set(-0.009, 0.02, 0.095);
      const rsR = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.008, 0.008), dotMat);
      rsR.position.set(0.009, 0.02, 0.095);
      const fs = new THREE.Mesh(
        new THREE.BoxGeometry(0.005, 0.009, 0.008),
        new THREE.MeshBasicMaterial({ color: 0x00f0ff })
      );
      fs.position.set(0, 0.021, -0.095);
      slide.add(rsL, rsR, fs);
      g.add(slide);

      const magGroup = new THREE.Group();
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.09, 0.04), metalDark);
      mag.position.set(0, -0.06, 0.045);
      mag.rotation.x = -0.26;
      magGroup.add(mag);
      g.add(magGroup);
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.065, 0.08), gloveMat);
      hand.position.set(0, -0.055, 0.05);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.062, 0.22), sleeveMat);
      arm.position.set(0.04, -0.12, 0.16);
      arm.rotation.set(0.45, 0.15, 0);
      g.add(hand, arm);

      return { group: g, slide, mag: magGroup, muzzlePos: new THREE.Vector3(0, 0.022, -0.15) };
    }

    function buildKatana() {
      const g = new THREE.Group();
      const katanaGroup = new THREE.Group();
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.019, 0.22, 8), gloveMat);
      handle.position.y = -0.12;
      katanaGroup.add(handle);
      const guard = new THREE.Mesh(
        new THREE.CylinderGeometry(0.046, 0.046, 0.014, 8),
        new THREE.MeshStandardMaterial({ color: 0xd49b27, metalness: 0.9, roughness: 0.25 })
      );
      guard.position.y = -0.005;
      katanaGroup.add(guard);
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.008, 0.62, 0.036),
        new THREE.MeshStandardMaterial({ color: 0xcfd9e6, metalness: 0.95, roughness: 0.15 })
      );
      blade.position.y = 0.31;
      katanaGroup.add(blade);
      const edge = new THREE.Mesh(
        new THREE.BoxGeometry(0.005, 0.63, 0.011),
        new THREE.MeshBasicMaterial({ color: 0x00f7ff })
      );
      edge.position.set(0, 0.315, -0.02);
      katanaGroup.add(edge);
      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.019, 0.09, 4),
        new THREE.MeshStandardMaterial({ color: 0x00f7ff, emissive: 0x0088aa, metalness: 0.7 })
      );
      tip.position.set(0, 0.66, -0.004);
      tip.scale.set(0.32, 1, 1);
      katanaGroup.add(tip);
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.08, 0.058), gloveMat);
      hand.position.y = -0.09;
      katanaGroup.add(hand);

      katanaGroup.rotation.set(-0.48, 0.25, 0.32);
      g.add(katanaGroup);
      return { group: g, bladePivot: katanaGroup, mag: null as THREE.Object3D | null, muzzlePos: new THREE.Vector3() };
    }

    function buildM4A1() {
      const g = new THREE.Group();
      const oliveMat = new THREE.MeshStandardMaterial({ color: 0x3a4338, roughness: 0.6, metalness: 0.25 });
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.068, 0.26), metalDark);
      g.add(upper);
      const railTop = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.014, 0.42), metalSteel);
      railTop.position.set(0, 0.04, -0.08);
      g.add(railTop);
      const holoHousing = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.046, 0.065), metalDark);
      holoHousing.position.set(0, 0.068, -0.02);
      g.add(holoHousing);
      const holoReticle = new THREE.Mesh(
        new THREE.SphereGeometry(0.0045, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff2244 })
      );
      holoReticle.position.set(0, 0.068, -0.02);
      g.add(holoReticle);
      const bufferTube = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.18, 10), metalDark);
      bufferTube.rotation.x = Math.PI / 2;
      bufferTube.position.set(0, 0.01, 0.2);
      g.add(bufferTube);
      const stockBody = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.095, 0.14), oliveMat);
      stockBody.position.set(0, -0.015, 0.25);
      g.add(stockBody);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.098, 0.045), oliveMat);
      grip.position.set(0, -0.072, 0.085);
      grip.rotation.x = -0.3;
      g.add(grip);
      const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.056, 0.24), oliveMat);
      handguard.position.set(0, 0.008, -0.23);
      g.add(handguard);
      const foregrip = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.078, 0.028), metalDark);
      foregrip.position.set(0, -0.052, -0.24);
      g.add(foregrip);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.18, 10), metalSteel);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.01, -0.38);
      g.add(barrel);
      const suppressor = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.19, 14), metalDark);
      suppressor.rotation.x = Math.PI / 2;
      suppressor.position.set(0, 0.01, -0.52);
      g.add(suppressor);
      const peq = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.022, 0.068), oliveMat);
      peq.position.set(0.034, 0.022, -0.28);
      g.add(peq);
      const magGroup = new THREE.Group();
      const pmag = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.145, 0.056), oliveMat);
      pmag.position.set(0, -0.09, -0.035);
      pmag.rotation.x = 0.18;
      magGroup.add(pmag);
      g.add(magGroup);
      const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.065, 0.075), gloveMat);
      rHand.position.set(0.008, -0.07, 0.09);
      const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.062, 0.065), gloveMat);
      lHand.position.set(-0.006, -0.05, -0.24);
      const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.064, 0.24), sleeveMat);
      lArm.position.set(-0.09, -0.12, -0.09);
      lArm.rotation.set(0.32, -0.35, 0);
      g.add(rHand, lHand, lArm);

      return { group: g, mag: magGroup, muzzlePos: new THREE.Vector3(0, 0.01, -0.63) };
    }

    function buildShotgun() {
      const g = new THREE.Group();
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.074, 0.3), metalDark);
      g.add(receiver);
      const heatShield = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.026, 0.38), metalSteel);
      heatShield.position.set(0, 0.032, -0.31);
      g.add(heatShield);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.48, 12), metalDark);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.02, -0.36);
      g.add(barrel);
      const magTube = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.44, 10), metalSteel);
      magTube.rotation.x = Math.PI / 2;
      magTube.position.set(0, -0.012, -0.34);
      g.add(magTube);
      const pump = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.048, 0.16), gloveMat);
      pump.position.set(0, -0.016, -0.28);
      g.add(pump);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.085, 0.22), metalDark);
      stock.position.set(0, -0.02, 0.24);
      stock.rotation.x = 0.1;
      g.add(stock);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.095, 0.046), gloveMat);
      grip.position.set(0, -0.072, 0.1);
      grip.rotation.x = -0.28;
      g.add(grip);
      const sightFront = new THREE.Mesh(
        new THREE.BoxGeometry(0.008, 0.014, 0.008),
        new THREE.MeshBasicMaterial({ color: 0xff9d00 })
      );
      sightFront.position.set(0, 0.048, -0.56);
      g.add(sightFront);

      // Dedicated shell carrier group for reload animation without displacing the pump
      const shellCarrierGroup = new THREE.Group();
      const shellMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.009, 0.009, 0.052, 8),
        new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45, metalness: 0.2 })
      );
      shellMesh.rotation.x = Math.PI / 2;
      shellMesh.position.set(0, -0.036, -0.04);
      shellCarrierGroup.add(shellMesh);
      g.add(shellCarrierGroup);

      const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.065, 0.075), gloveMat);
      rHand.position.set(0.008, -0.07, 0.1);
      const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.055, 0.09), gloveMat);
      lHand.position.set(-0.008, -0.025, -0.28);
      const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.065, 0.24), sleeveMat);
      lArm.position.set(-0.09, -0.11, -0.11);
      lArm.rotation.set(0.32, -0.35, 0);
      g.add(rHand, lHand, lArm);

      return { group: g, pump, mag: shellCarrierGroup as THREE.Object3D | null, muzzlePos: new THREE.Vector3(0, 0.02, -0.61) };
    }

    function buildLMG() {
      // M249 SAW Para Light Machine Gun with 100-Round Ammo Box, Ventilated Heatshield & Bipod
      const g = new THREE.Group();
      const lmgGreen = new THREE.MeshStandardMaterial({ color: 0x2d4a3e, roughness: 0.55, metalness: 0.35 });
      const brassMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.35, metalness: 0.85 });

      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.082, 0.34), metalDark);
      g.add(receiver);
      const topCover = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.026, 0.28), metalSteel);
      topCover.position.set(0, 0.052, -0.01);
      g.add(topCover);
      const holo = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.044, 0.062), metalDark);
      holo.position.set(0, 0.082, 0.01);
      g.add(holo);
      const holoDot = new THREE.Mesh(
        new THREE.SphereGeometry(0.0045, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x00ff88 })
      );
      holoDot.position.set(0, 0.084, 0.01);
      g.add(holoDot);

      const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.066, 0.26), metalSteel);
      handguard.position.set(0, 0.005, -0.26);
      g.add(handguard);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.015, 0.42, 12), metalDark);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.02, -0.44);
      g.add(barrel);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.095, 0.24), metalDark);
      stock.position.set(0, -0.012, 0.26);
      g.add(stock);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.098, 0.048), gloveMat);
      grip.position.set(0, -0.075, 0.1);
      grip.rotation.x = -0.28;
      g.add(grip);

      // 100-Round Green Box Magazine + Brass Bullet Belt
      const magGroup = new THREE.Group();
      const ammoBox = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 0.12), lmgGreen);
      ammoBox.position.set(0, -0.1, -0.05);
      const beltStrip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.06, 0.05), brassMat);
      beltStrip.position.set(-0.04, 0.01, -0.05);
      magGroup.add(ammoBox, beltStrip);
      g.add(magGroup);

      const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.065, 0.075), gloveMat);
      rHand.position.set(0.008, -0.07, 0.1);
      const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.058, 0.085), gloveMat);
      lHand.position.set(-0.01, -0.03, -0.25);
      const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.065, 0.24), sleeveMat);
      lArm.position.set(-0.09, -0.11, -0.09);
      lArm.rotation.set(0.32, -0.35, 0);
      g.add(rHand, lHand, lArm);

      return { group: g, mag: magGroup, muzzlePos: new THREE.Vector3(0, 0.02, -0.66) };
    }

    function buildDeagle() {
      // Desert Eagle .50 AE Heavy Chrome & Gold Hand Cannon
      const g = new THREE.Group();
      const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.94, roughness: 0.18 });
      const goldAccent = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.88, roughness: 0.24 });

      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.034, 0.25), metalDark);
      frame.position.set(0, 0, -0.04);
      g.add(frame);
      const slide = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.046, 0.27), chromeMat);
      slide.position.set(0, 0.034, -0.04);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.26, 10), goldAccent);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.034, -0.045);
      const frontSight = new THREE.Mesh(
        new THREE.BoxGeometry(0.008, 0.012, 0.012),
        new THREE.MeshBasicMaterial({ color: 0xff2e4c })
      );
      frontSight.position.set(0, 0.06, -0.16);
      slide.add(barrel, frontSight);
      g.add(slide);

      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.115, 0.056), gloveMat);
      grip.position.set(0, -0.065, 0.05);
      grip.rotation.x = -0.26;
      g.add(grip);

      const magGroup = new THREE.Group();
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.1, 0.046), chromeMat);
      mag.position.set(0, -0.068, 0.05);
      mag.rotation.x = -0.26;
      magGroup.add(mag);
      g.add(magGroup);

      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.068, 0.082), gloveMat);
      hand.position.set(0, -0.058, 0.055);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.064, 0.22), sleeveMat);
      arm.position.set(0.04, -0.12, 0.16);
      arm.rotation.set(0.45, 0.15, 0);
      g.add(hand, arm);

      return { group: g, slide, mag: magGroup, muzzlePos: new THREE.Vector3(0, 0.034, -0.19) };
    }

    function buildRPG() {
      // RPG-7V Tactical Rocket Launcher with PG-7V Warhead Cone
      const g = new THREE.Group();
      const warheadMat = new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.52, metalness: 0.35 });
      const copperTipMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.78 });

      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.68, 14), metalDark);
      tube.rotation.x = Math.PI / 2;
      tube.position.set(0, 0.02, -0.14);
      g.add(tube);
      const woodWrap = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.28, 14), woodMat);
      woodWrap.rotation.x = Math.PI / 2;
      woodWrap.position.set(0, 0.02, 0.02);
      g.add(woodWrap);
      const exhaustBell = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.028, 0.12, 14), metalSteel);
      exhaustBell.rotation.x = Math.PI / 2;
      exhaustBell.position.set(0, 0.02, 0.24);
      g.add(exhaustBell);

      const gripFront = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.095, 0.044), woodMat);
      gripFront.position.set(0, -0.048, -0.16);
      gripFront.rotation.x = -0.2;
      const gripRear = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.092, 0.044), gloveMat);
      gripRear.position.set(0, -0.048, -0.02);
      gripRear.rotation.x = -0.2;
      g.add(gripFront, gripRear);

      // PG-7V Warhead protruding from front (hidden when empty after firing)
      const magGroup = new THREE.Group();
      const warheadBody = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.024, 0.16, 12), warheadMat);
      warheadBody.rotation.x = Math.PI / 2;
      warheadBody.position.set(0, 0.02, -0.52);
      const warheadCone = new THREE.Mesh(new THREE.ConeGeometry(0.056, 0.16, 12), warheadMat);
      warheadCone.rotation.x = -Math.PI / 2;
      warheadCone.position.set(0, 0.02, -0.68);
      const fuseTip = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.014, 0.045, 8), copperTipMat);
      fuseTip.rotation.x = Math.PI / 2;
      fuseTip.position.set(0, 0.02, -0.77);
      magGroup.add(warheadBody, warheadCone, fuseTip);
      g.add(magGroup);

      const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.065, 0.075), gloveMat);
      rHand.position.set(0.008, -0.055, -0.16);
      const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.062, 0.075), gloveMat);
      lHand.position.set(-0.008, -0.055, -0.02);
      g.add(rHand, lHand);

      return { group: g, mag: magGroup, muzzlePos: new THREE.Vector3(0, 0.02, -0.78) };
    }

    const akModel = buildAK47();
    const m4Model = buildM4A1();
    const sniperModel = buildSniper();
    const mp5Model = buildMP5();
    const shotgunModel = buildShotgun();
    const pistolModel = buildPistol();
    const katanaModel = buildKatana();
    const lmgModel = buildLMG();
    const deagleModel = buildDeagle();
    const rpgModel = buildRPG();
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
        adsPos: new THREE.Vector3(0.0, -0.145, -0.26),
        adsCantRoll: 0.14,
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
        adsPos: new THREE.Vector3(0.0, -0.148, -0.25),
        adsCantRoll: 0.1,
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
        adsPos: new THREE.Vector3(0.0, -0.14, -0.25),
        adsCantRoll: 0.08,
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
        adsPos: new THREE.Vector3(0.0, -0.145, -0.27),
        adsCantRoll: 0.12,
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
        adsPos: new THREE.Vector3(0.0, -0.142, -0.31),
        adsCantRoll: 0.05,
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
        adsPos: new THREE.Vector3(0.0, -0.15, -0.25),
        adsCantRoll: 0.1,
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
        adsPos: new THREE.Vector3(0.0, -0.142, -0.29),
        adsCantRoll: 0.06,
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
        adsPos: new THREE.Vector3(0.04, -0.14, -0.24),
        adsCantRoll: 0.04,
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
    let slideKick = 0;
    let shotgunPumpKick = 0;

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
    // VFX POOLS
    // =========================================================
    interface TracerItem {
      mesh: THREE.Mesh;
      dir: THREE.Vector3;
      speed: number;
      traveled: number;
      maxDist: number;
    }
    interface ShellItem {
      mesh: THREE.Mesh;
      vel: THREE.Vector3;
      rotVel: THREE.Vector3;
      life: number;
    }
    interface ParticleItem {
      mesh: THREE.Mesh;
      vel: THREE.Vector3;
      life: number;
      maxLife: number;
      isArc?: boolean;
    }
    interface DecalItem {
      mesh: THREE.Mesh;
      life: number;
    }
    interface EnemyBulletItem {
      mesh: THREE.Mesh;
      dir: THREE.Vector3;
      speed: number;
      dmg: number;
      life: number;
    }

    const tracers: TracerItem[] = [];
    const shells: ShellItem[] = [];
    const particles: ParticleItem[] = [];
    const decals: DecalItem[] = [];
    const enemyBullets: EnemyBulletItem[] = [];

    const tracerMat = new THREE.MeshBasicMaterial({ color: 0xffdd77, transparent: true, opacity: 0.9 });
    const tracerGeo = new THREE.BoxGeometry(0.02, 0.02, 1.35);

    function spawnTracer(startWorld: THREE.Vector3, endWorld: THREE.Vector3) {
      const dir = new THREE.Vector3().subVectors(endWorld, startWorld);
      const totalDist = dir.length();
      if (totalDist < 0.5) return;
      dir.normalize();
      const m = new THREE.Mesh(tracerGeo, tracerMat);
      m.position.copy(startWorld);
      m.lookAt(endWorld);
      scene.add(m);
      tracers.push({ mesh: m, dir, speed: 128, traveled: 0, maxDist: totalDist });
    }

    const shellGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.028, 6);
    const shellMat = new THREE.MeshStandardMaterial({ color: 0xd9a738, metalness: 0.85, roughness: 0.25 });

    function spawnShell() {
      const m = new THREE.Mesh(shellGeo, shellMat);
      const origin = new THREE.Vector3(0.14, -0.06, -0.35).applyMatrix4(camera.matrixWorld);
      m.position.copy(origin);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
      const vel = right.multiplyScalar(2.4 + Math.random() * 1.2).add(up.multiplyScalar(1.8 + Math.random() * 0.8));
      scene.add(m);
      shells.push({
        mesh: m,
        vel,
        rotVel: new THREE.Vector3(Math.random() * 18, Math.random() * 18, Math.random() * 18),
        life: 1.1,
      });
      if (shells.length > 22) {
        const old = shells.shift()!;
        scene.remove(old.mesh);
      }
    }

    const sparkGeo = new THREE.BoxGeometry(0.055, 0.055, 0.055);
    function spawnParticles(pos: THREE.Vector3, colorHex: number, count = 7, speed = 5) {
      const mat = new THREE.MeshBasicMaterial({ color: colorHex });
      for (let i = 0; i < count; i++) {
        const m = new THREE.Mesh(sparkGeo, mat);
        m.position.copy(pos);
        scene.add(m);
        particles.push({
          mesh: m,
          vel: new THREE.Vector3(
            (Math.random() - 0.5) * speed,
            Math.random() * speed * 0.8 + 0.8,
            (Math.random() - 0.5) * speed
          ),
          life: 0.3 + Math.random() * 0.25,
          maxLife: 0.55,
        });
      }
      while (particles.length > 85) {
        const old = particles.shift()!;
        scene.remove(old.mesh);
      }
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
    function spawnDecal(point: THREE.Vector3, normal: THREE.Vector3) {
      const m = new THREE.Mesh(decalGeo, decalMat);
      m.position.copy(point).addScaledVector(normal, 0.015);
      m.lookAt(point.clone().add(normal));
      scene.add(m);
      decals.push({ mesh: m, life: 7.0 });
      if (decals.length > 28) {
        const old = decals.shift()!;
        scene.remove(old.mesh);
      }
    }

    function spawnKatanaArc() {
      const arcGeo = new THREE.RingGeometry(0.6, 1.35, 20, 1, -Math.PI * 0.42, Math.PI * 0.84);
      const arcMat = new THREE.MeshBasicMaterial({
        color: 0x00f7ff,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const arc = new THREE.Mesh(arcGeo, arcMat);
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      arc.position.copy(camera.position).addScaledVector(forward, 1.45);
      arc.quaternion.copy(camera.quaternion);
      arc.rotateX(Math.PI * 0.42);
      arc.rotateZ(katanaSlashDir * 0.5);
      scene.add(arc);
      particles.push({ mesh: arc, vel: forward.multiplyScalar(2.5), life: 0.18, maxLife: 0.18, isArc: true });
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

    function buildBotWeaponModel(typeKey: keyof typeof ENEMY_CLASSES): {
      weaponGroup: THREE.Group;
      muzzleFlash: THREE.Mesh;
    } {
      const wg = new THREE.Group();
      const gunMetal = new THREE.MeshStandardMaterial({ color: 0x1c2026, metalness: 0.85, roughness: 0.32 });
      const gunSteel = new THREE.MeshStandardMaterial({ color: 0x4e5763, metalness: 0.9, roughness: 0.28 });
      const furnitureMat = new THREE.MeshStandardMaterial({
        color: typeKey === 'assault' ? 0x5c3a21 : typeKey === 'rusher' ? 0x2c353d : 0x3b3548,
        roughness: 0.65,
        metalness: 0.15,
      });

      // Receiver
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.11, 0.36), gunMetal);
      wg.add(receiver);
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.025, 0.32), gunSteel);
      topRail.position.set(0, 0.065, 0.02);
      wg.add(topRail);

      // Buttstock resting against bot shoulder
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.12, 0.24), furnitureMat);
      stock.position.set(0, -0.02, -0.26);
      wg.add(stock);

      // Pistol Grip
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.13, 0.065), furnitureMat);
      grip.position.set(0, -0.1, -0.08);
      grip.rotation.x = 0.28;
      wg.add(grip);

      // Handguard & Barrel pointing forward (+Z in bot local space)
      const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.085, 0.26), furnitureMat);
      handguard.position.set(0, 0.01, 0.26);
      wg.add(handguard);

      const barrelLen = typeKey === 'rusher' ? 0.26 : typeKey === 'heavy' ? 0.44 : 0.38;
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, barrelLen, 8), gunSteel);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.02, 0.34 + barrelLen * 0.4);
      wg.add(barrel);

      // Front Sight & Tactical Red Laser Emitter
      const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.055, 0.025), gunMetal);
      frontSight.position.set(0, 0.055, 0.32 + barrelLen * 0.7);
      wg.add(frontSight);

      const laserEmitter = new THREE.Mesh(
        new THREE.BoxGeometry(0.028, 0.028, 0.05),
        new THREE.MeshBasicMaterial({ color: 0xff1e38 })
      );
      laserEmitter.position.set(0.045, 0.02, 0.32);
      wg.add(laserEmitter);

      // Magazine (Drum for heavy, curved banana mag for assault/rusher)
      if (typeKey === 'heavy') {
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.09, 12), gunMetal);
        drum.rotation.x = Math.PI / 2;
        drum.position.set(0, -0.13, 0.08);
        wg.add(drum);
      } else {
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.19, 0.075), gunMetal);
        mag.position.set(0, -0.13, 0.09);
        mag.rotation.x = -0.25;
        wg.add(mag);
      }

      // Optic Sight on top rail
      const optic = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.09), gunMetal);
      optic.position.set(0, 0.095, 0.02);
      wg.add(optic);

      // 3D Muzzle Flash at tip of bot barrel
      const flashMat = new THREE.MeshBasicMaterial({
        color: 0xffb733,
        transparent: true,
        opacity: 0.92,
      });
      const muzzleFlash = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), flashMat);
      muzzleFlash.scale.set(1, 1, 2.2);
      muzzleFlash.position.set(0, 0.02, 0.38 + barrelLen * 0.85);
      muzzleFlash.visible = false;
      wg.add(muzzleFlash);

      return { weaponGroup: wg, muzzleFlash };
    }

    function createEnemy(typeKey: keyof typeof ENEMY_CLASSES, x: number, z: number) {
      const cfg = ENEMY_CLASSES[typeKey];
      const params = computeBotParameters(playModeRef.current, currentBotDifficulty, trainingConfigRef.current);

      const root = new THREE.Group();
      root.position.set(x, 0, z);
      root.scale.setScalar(cfg.scale);

      const bodyMat = new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.68, metalness: 0.18 });
      const vestMat = new THREE.MeshStandardMaterial({ color: cfg.vestColor, roughness: 0.78, metalness: 0.25 });
      const gearMat = new THREE.MeshStandardMaterial({ color: 0x12151a, roughness: 0.82, metalness: 0.3 });
      const redactedFaceMat = new THREE.MeshBasicMaterial({ map: makeRedactedFaceTexture(cfg.visor) });

      // Articulated Left & Right Legs with Knee Pads & Combat Boots
      function buildLeg(xOffset: number): THREE.Group {
        const legGroup = new THREE.Group();
        legGroup.position.set(xOffset, 0.78, 0);
        const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.42, 0.25), bodyMat);
        thigh.position.set(0, -0.2, 0);
        const kneePad = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.27), gearMat);
        kneePad.position.set(0, -0.4, 0.02);
        const calf = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.36, 0.23), bodyMat);
        calf.position.set(0, -0.56, 0);
        const boot = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.14, 0.31), gearMat);
        boot.position.set(0, -0.72, 0.04);
        legGroup.add(thigh, kneePad, calf, boot);
        return legGroup;
      }

      const legL = buildLeg(-0.17);
      const legR = buildLeg(0.17);

      // Sculpted Torso, Tactical Belt, Plate Carrier & Ammo Pouches
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.76, 0.32), bodyMat);
      torso.position.set(0, 1.16, 0);
      torso.castShadow = !isSoftwareGl;

      const belt = new THREE.Mesh(new THREE.BoxGeometry(0.61, 0.11, 0.35), gearMat);
      belt.position.set(0, 0.82, 0);

      const plateCarrier = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.52, 0.37), vestMat);
      plateCarrier.position.set(0, 1.2, 0);

      // 3 Mag Pouches on front of Plate Carrier
      [-0.14, 0, 0.14].forEach((px) => {
        const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.06), gearMat);
        pouch.position.set(px, 1.1, 0.2);
        root.add(pouch);
      });

      // Shoulder Armor Pads
      [-0.35, 0.35].forEach((sx) => {
        const pad = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.26), vestMat);
        pad.position.set(sx, 1.44, 0);
        root.add(pad);
      });

      // Head, Neck, Rounded Tactical Ballistic Helmet, NVG Mount & Redacted Face
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.14, 10), gearMat);
      neck.position.set(0, 1.58, 0);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.36, 0.35), bodyMat);
      head.position.set(0, 1.78, 0);
      head.castShadow = !isSoftwareGl;

      const helmetDome = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62),
        vestMat
      );
      helmetDome.position.set(0, 0.04, -0.01);
      head.add(helmetDome);

      // Dual-Tube Night Vision Goggles (NVG) on Helmet Forehead
      const nvgMount = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.08), gearMat);
      nvgMount.position.set(0, 0.14, 0.2);
      const nvgTubeL = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.11, 8), gearMat);
      nvgTubeL.rotation.x = Math.PI / 2;
      nvgTubeL.position.set(-0.05, 0.13, 0.25);
      const nvgTubeR = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.11, 8), gearMat);
      nvgTubeR.rotation.x = Math.PI / 2;
      nvgTubeR.position.set(0.05, 0.13, 0.25);
      head.add(nvgMount, nvgTubeL, nvgTubeR);

      const faceMosaic = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.28), redactedFaceMat);
      faceMosaic.position.set(0, -0.02, 0.182);
      head.add(faceMosaic);

      // Articulated Arms holding the 3D Rifle in Tactical Ready Stance
      const armL = new THREE.Group();
      armL.position.set(-0.36, 1.38, 0.05);
      const upperArmL = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.36, 0.17), bodyMat);
      upperArmL.position.set(0.08, -0.14, 0.12);
      upperArmL.rotation.set(-0.85, 0.38, 0);
      const foreArmL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.34, 0.15), gearMat);
      foreArmL.position.set(0.24, -0.2, 0.34);
      foreArmL.rotation.set(-1.35, 0.52, 0);
      armL.add(upperArmL, foreArmL);

      const armR = new THREE.Group();
      armR.position.set(0.36, 1.38, 0.05);
      const upperArmR = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.36, 0.17), bodyMat);
      upperArmR.position.set(-0.04, -0.14, 0.1);
      upperArmR.rotation.set(-0.95, -0.15, 0);
      const foreArmR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.32, 0.15), gearMat);
      foreArmR.position.set(-0.12, -0.22, 0.26);
      foreArmR.rotation.set(-1.25, -0.2, 0);
      armR.add(upperArmR, foreArmR);

      const { weaponGroup, muzzleFlash } = buildBotWeaponModel(typeKey);
      weaponGroup.position.set(0.16, 1.22, 0.32);

      // Contact shadow disc at bot feet
      const shadowDisc = new THREE.Mesh(
        new THREE.CircleGeometry(0.48, 16),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.42, depthWrite: false })
      );
      shadowDisc.rotation.x = -Math.PI / 2;
      shadowDisc.position.y = 0.015;

      const hpBg = new THREE.Mesh(
        new THREE.PlaneGeometry(0.75, 0.08),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.65, side: THREE.DoubleSide })
      );
      hpBg.position.set(0, 2.22, 0);
      const hpFill = new THREE.Mesh(
        new THREE.PlaneGeometry(0.71, 0.05),
        new THREE.MeshBasicMaterial({ color: 0xff2e4c, side: THREE.DoubleSide })
      );
      hpFill.position.set(0, 2.22, 0.005);

      root.add(shadowDisc, legL, legR, torso, belt, plateCarrier, neck, head, armL, armR, weaponGroup, hpBg, hpFill);
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

    const eBulletGeo = new THREE.BoxGeometry(0.045, 0.045, 0.65);
    const eBulletMat = new THREE.MeshBasicMaterial({ color: 0xff4422 });

    function spawnEnemyBullet(
      fromPos: THREE.Vector3,
      targetPos: THREE.Vector3,
      dmg: number,
      spread: number,
      bulletSpeed: number
    ) {
      const dir = new THREE.Vector3().subVectors(targetPos, fromPos).normalize();
      dir.x += (Math.random() - 0.5) * spread;
      dir.y += (Math.random() - 0.5) * (spread * 0.7);
      dir.z += (Math.random() - 0.5) * spread;
      dir.normalize();
      const mesh = new THREE.Mesh(eBulletGeo, eBulletMat);
      mesh.position.copy(fromPos);
      mesh.lookAt(fromPos.clone().add(dir));
      scene.add(mesh);
      enemyBullets.push({ mesh, dir, speed: bulletSpeed, dmg, life: 2.8 });
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
      if (Math.abs(x) > ARENA_HALF - 2 || Math.abs(z) > ARENA_HALF - 2) return false;
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
        ARENA_HALF
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
      addKillFeed('گلدان سفالی متلاشی شد (+15)', false);
      updateHUD();
    }

    function hitChicken(chk: RoamingChicken) {
      if (!chk.alive) return;
      chk.alive = false;
      chk.respawnTimer = 9.0;
      chk.group.visible = false;
      const worldPt = new THREE.Vector3(chk.x, 0.4, chk.z);
      spawnParticles(worldPt, 0xffffff, 11, 5.8);
      spawnParticles(worldPt, 0xff9f1c, 4, 4.5);
      sound.playChickenCluck();
      triggerHitmarker(false);
      score += 25;
      addKillFeed('مرغ میدان شکار شد (+25)', false);
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
      centerAlert.style.opacity = '1';
      window.clearTimeout(alertTimeout);
      alertTimeout = window.setTimeout(() => {
        centerAlert.style.opacity = '0';
      }, duration);
    }

    function addKillFeed(text: string, isHeadshot: boolean) {
      if (!killFeed) return;
      const div = document.createElement('div');
      div.className = 'kill-msg' + (isHeadshot ? ' headshot' : '');
      div.setAttribute('dir', 'rtl');
      div.textContent = text;
      killFeed.prepend(div);
      while (killFeed.children.length > 5 && killFeed.lastChild) {
        killFeed.removeChild(killFeed.lastChild);
      }
      window.setTimeout(() => {
        if (div.parentNode) div.parentNode.removeChild(div);
      }, 2200);
    }

    function triggerHitmarker(isHeadshot: boolean) {
      if (!hitmarkerEl) return;
      const path = hitmarkerEl.querySelector('path');
      if (path) path.setAttribute('stroke', isHeadshot ? '#ff2e4c' : '#ffffff');
      hitmarkerEl.classList.add('active');
      window.clearTimeout(hitmarkerTimeout);
      hitmarkerTimeout = window.setTimeout(() => hitmarkerEl.classList.remove('active'), 110);
    }

    function updateHUD() {
      if (hpBarInner && hpText) {
        const hpPct = Math.max(0, (player.hp / player.maxHp) * 100);
        hpBarInner.style.width = hpPct + '%';
        hpBarInner.style.background =
          hpPct > 50
            ? 'linear-gradient(90deg, #00d26a, #00f5a0)'
            : hpPct > 25
              ? 'linear-gradient(90deg, #ff9d00, #ffd000)'
              : 'linear-gradient(90deg, #ff1e42, #ff6b6b)';
        hpText.textContent = cheatConfigRef.current.godMode ? '∞' : String(Math.ceil(player.hp));
      }

      if (armorBarInner && armorText) {
        const armPct = Math.max(0, (player.armor / player.maxArmor) * 100);
        armorBarInner.style.width = armPct + '%';
        armorText.textContent = String(Math.ceil(player.armor));
      }

      const w = WEAPONS[currentWeaponIdx];
      if (ammoMagEl && ammoReserveEl) {
        if (w.isMelee) {
          ammoMagEl.textContent = '∞';
          ammoMagEl.style.color = '#ffffff';
          ammoReserveEl.textContent = 'MELEE';
        } else {
          ammoMagEl.textContent = cheatConfigRef.current.infiniteAmmo ? '∞' : String(w.mag);
          ammoMagEl.style.color = w.mag === 0 && !cheatConfigRef.current.infiniteAmmo ? '#ff2e4c' : '#ffffff';
          const isInf =
            cheatConfigRef.current.infiniteAmmo ||
            (playModeRef.current === 'training' && trainingConfigRef.current.infiniteAmmo);
          ammoReserveEl.textContent = isInf ? '/ ∞' : '/ ' + w.reserve;
        }
      }

      if (hudWave) hudWave.textContent = playModeRef.current === 'training' ? 'تمرین' : String(wave);
      if (hudEnemies) {
        const activeCount = enemies.filter((e) => e.alive).length + enemiesToSpawn;
        hudEnemies.textContent = String(activeCount);
      }
      if (hudScore) hudScore.textContent = String(score);

      // Update dynamic Health & Ammo status telemetry on every weapon selection button
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
        const hpBadgeEl = document.getElementById(`wslot-hp-badge-${i}`);
        const hpTextEl = document.getElementById(`wslot-hp-text-${i}`);
        const ammoBadgeEl = document.getElementById(`wslot-ammo-badge-${i}`);
        const ammoTextEl = document.getElementById(`wslot-ammo-text-${i}`);
        const ammoBarEl = document.getElementById(`wslot-ammo-bar-${i}`);

        if (hpBadgeEl) hpBadgeEl.style.color = tel.healthColor;
        if (hpTextEl) hpTextEl.textContent = tel.healthLabel;
        if (ammoBadgeEl) ammoBadgeEl.style.color = tel.ammoColor;
        if (ammoTextEl) ammoTextEl.textContent = tel.ammoLabel;
        if (ammoBarEl) {
          ammoBarEl.style.width = `${tel.ammoPct}%`;
          ammoBarEl.style.backgroundColor = tel.ammoColor;
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
        buffStrip.innerHTML = html;
      }
      if (powerVignette) powerVignette.style.opacity = adrenalineTimer > 0 ? '1' : '0';

      if (btnPower && powerCdText) {
        if (adrenalineCooldown > 0) {
          btnPower.classList.add('on-cd');
          powerCdText.textContent = Math.ceil(adrenalineCooldown) + 's';
        } else {
          btnPower.classList.remove('on-cd');
          powerCdText.textContent = 'آماده';
        }
      }
    }

    function updateCrosshairVisual() {
      const ch = document.getElementById('crosshair');
      if (!ch) return;
      const w = WEAPONS[currentWeaponIdx];
      if (!crosshairVisible || (isADS && w.id === 'sniper')) {
        ch.style.display = 'none';
        return;
      }
      ch.style.display = 'block';
      ch.style.opacity = w.isMelee ? '0.4' : isADS ? '0.5' : '0.88';
      const gap = Math.min(26, (isADS ? 4 : 8) + crosshairBloom * 135);
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
      radarCtx.restore();

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

    function syncSniperScopeState() {
      const w = WEAPONS[currentWeaponIdx];
      const scoped = Boolean(isADS && w && w.id === 'sniper' && !w.isMelee);
      setIsSniperScoped(scoped);
      if (w) {
        w.model.group.visible = !scoped;
      }
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
        if (reloadIndicator) reloadIndicator.style.display = 'none';
        WEAPONS.forEach((w) => {
          if (w.model.mag) w.model.mag.position.y = 0;
        });
      }
      const switched = idx !== currentWeaponIdx;
      currentWeaponIdx = idx;
      setActiveWeaponIdx(idx);
      if (WEAPONS[idx].isMelee) {
        isADS = false;
        document.getElementById('btn-ads')?.classList.remove('active-ads');
      }
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
      if (reloadIndicator) reloadIndicator.style.display = 'flex';
      if (reloadBarFill) reloadBarFill.style.width = '0%';
      sound.playReload();
      advanceTutorialFromGame('reloading', 1, sound);
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
        // Ignore small destructible pots or chickens when checking wall occlusion
        if (obj.userData && (obj.userData.pot || obj.userData.chicken)) continue;
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
      triggerHitmarker(effectiveHeadshot);
      sound.playHitmarker(effectiveHeadshot);
      spawnParticles(hitPoint, effectiveHeadshot ? 0xffdd00 : 0xff2e4c, effectiveHeadshot ? 12 : 7, 6);

      if (enemy.hp <= 0) {
        enemy.hp = 0;
        enemy.alive = false;
        enemy.deathTimer = 0;
        rebuildEnemyHitboxes();
        totalKills++;
        const pts = (enemy.type === 'heavy' ? 180 : enemy.type === 'rusher' ? 120 : 100) + (effectiveHeadshot ? 50 : 0);
        score += pts;
        addKillFeed(
          effectiveHeadshot ? `هدشات · ${enemy.cfg.name} (+${pts})` : `${enemy.cfg.name} حذف شد (+${pts})`,
          effectiveHeadshot
        );
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

    function applyAimAssistSnap() {
      const cheats = cheatConfigRef.current;
      if (!cheats.aimAssistEnabled || cheats.aimAssistStrength <= 0) return;
      const targets = enemies
        .filter((e) => {
          if (!e.alive) return false;
          const ty = e.root.position.y + (cheats.aimAssistHeadshot ? 1.72 : 1.2) * e.cfg.scale;
          e.visibleToPlayer = hasLineOfSightToPoint(e.root.position.x, ty, e.root.position.z);
          return e.visibleToPlayer;
        })
        .map((e, idx) => ({
          id: `bot-${idx}`,
          x: e.root.position.x,
          y: e.root.position.y + (cheats.aimAssistHeadshot ? 1.72 : 1.2) * e.cfg.scale,
          z: e.root.position.z,
          visible: e.visibleToPlayer,
        }));
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

      // In round-based mode, dead players wait for the next round respawn
      const activeRoom = peerManager.getRoom();
      if (activeRoom && isRoundBasedMode(activeRoom.mode)) {
        const me = activeRoom.players.find((p) => p.id === myOnlineId);
        if (me && !me.alive) {
          showCenterAlert('در این راند حذف شده‌اید — منتظر شروع راند بعدی باشید', 1400);
          return;
        }
      }

      applyAimAssistSnap();

      if (w.isMelee) {
        fireCooldown = w.fireRate * fireRateScale;
        katanaSlashTimer = 0.34;
        katanaSlashDir *= -1;
        sound.playWeaponShotById(w.id);
        spawnKatanaArc();
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
          remoteOperators.forEach((op, rPid) => {
            const targetPlayer = activeRoom.players.find((p) => p.id === rPid);
            if (!targetPlayer || (isRoundBasedMode(activeRoom.mode) && !targetPlayer.alive)) return;
            const opCenter = op.root.position.clone().add(new THREE.Vector3(0, 1.25, 0));
            const toOp = opCenter.clone().sub(camera.position);
            const dist = toOp.length();
            if (dist < 3.8) {
              toOp.normalize();
              if (forward.dot(toOp) > 0.35) {
                if (!canDamagePlayer(activeRoom.mode, myTeam, targetPlayer.team || 'bravo', myOnlineId, rPid)) {
                  showCenterAlert('هم‌تیمی است — آسیب غیرفعال (Friendly Fire OFF)', 1100);
                  return;
                }
                const isCrit = Math.abs(camera.position.y - (op.root.position.y + 1.75)) < 0.55;
                const dmg = Math.round(w.damage * (isCrit ? w.headMult : 1.0));
                spawnParticles(opCenter, 0x991111, 8, 5);
                triggerHitmarker(isCrit);
                peerManager.sendPlayerHit(rPid, dmg, isCrit);
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
        chickens.forEach((chk) => {
          if (!chk.alive) return;
          const dist = Math.hypot(chk.x - camera.position.x, chk.z - camera.position.z);
          if (dist < 3.2) hitChicken(chk);
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
        startReload();
        return;
      }

      if (!cheats.infiniteAmmo) {
        w.mag--;
      }
      if (w.id === 'rpg' && w.model.mag) {
        w.model.mag.visible = w.mag > 0 || cheats.infiniteAmmo;
      }
      fireCooldown = w.fireRate * fireRateScale;
      advanceTutorialFromGame('shooting', 1, sound);
      updateHUD();

      sound.playWeaponShotById(w.id);

      muzzleFlashGroup.position.copy(w.model.muzzlePos);
      muzzleFlashGroup.rotation.z = Math.random() * Math.PI * 2;
      const flashScale =
        w.id === 'sniper' || w.id === 'rpg'
          ? 1.65
          : w.id === 'shotgun' || w.id === 'deagle'
            ? 1.45
            : w.id === 'ak47' || w.id === 'lmg'
              ? 1.12
              : w.id === 'm4a1' || w.id === 'mp5'
                ? 0.48
                : 0.72;
      muzzleFlashGroup.scale.setScalar(flashScale * (0.85 + Math.random() * 0.3));
      muzzleFlashGroup.visible = !(isADS && w.id === 'sniper');
      muzzleFlashTimer = w.id === 'shotgun' || w.id === 'sniper' || w.id === 'rpg' ? 0.068 : 0.045;

      const worldMuzzle = w.model.muzzlePos.clone().applyMatrix4(weaponRecoilGroup.matrixWorld);
      muzzlePointLight.position.set(0, -0.05, -0.7);
      muzzlePointLight.intensity =
        w.id === 'sniper' || w.id === 'rpg'
          ? 5.4
          : w.id === 'shotgun' || w.id === 'deagle'
            ? 4.8
            : w.id === 'ak47' || w.id === 'lmg'
              ? 3.5
              : w.id === 'm4a1' || w.id === 'mp5'
                ? 1.3
                : 2.3;

      const mountFactor = isCornerMounted ? 0.55 : 1.0;
      const recBuff = cheats.zeroRecoil ? 0.0 : (adrenalineTimer > 0 ? 0.45 : 1.0) * mountFactor;
      const adsFactor = (isADS ? 0.56 : 1.0) * recBuff;

      recoilPos.z += w.kickBack * recBuff;
      recoilPos.y += w.kickBack * 0.14 * recBuff;
      recoilRot.x += w.kickRot * recBuff;
      recoilRot.z += (Math.random() - 0.5) * 0.09 * recBuff;
      if (w.id === 'pistol' || w.id === 'deagle') slideKick = 0.065;
      if (w.id === 'shotgun') shotgunPumpKick = 1.0;

      camTargetRecoilPitch += w.recoilPitch * adsFactor * (0.88 + Math.random() * 0.24);
      camTargetRecoilYaw += (Math.random() - 0.5) * 2 * w.recoilYaw * adsFactor;
      crosshairBloom = Math.min(
        0.14,
        crosshairBloom + (w.id === 'sniper' || w.id === 'rpg' ? 0.055 : w.id === 'shotgun' ? 0.048 : w.id === 'ak47' ? 0.021 : 0.015) * recBuff
      );
      screenShake = Math.max(
        screenShake,
        (w.id === 'sniper' || w.id === 'rpg' ? 0.028 : w.id === 'shotgun' || w.id === 'deagle' ? 0.022 : w.id === 'ak47' ? 0.009 : 0.006) * recBuff
      );

      if (w.id !== 'rpg') {
        spawnShell();
      }

      const spread = cheats.zeroRecoil
        ? 0.0005
        : ((isADS ? w.spreadAds : w.spreadHip) + crosshairBloom * (w.id === 'sniper' && isADS ? 0.04 : 0.32)) * mountFactor;
      const pelletCount = w.pellets || 1;
      const maxRayDist = w.id === 'sniper' || w.id === 'rpg' ? 175 : w.id === 'shotgun' ? 52 : 130;
      let lastEndPoint = camera.position.clone();
      for (let pIdx = 0; pIdx < pelletCount; pIdx++) {
        const dir = new THREE.Vector3(
          (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * spread,
          -1
        )
          .normalize()
          .applyQuaternion(camera.quaternion);

        shootRaycaster.set(camera.position, dir);
        shootRaycaster.far = maxRayDist;
        const hits = shootRaycaster.intersectObjects(shootableEnvironment.concat(enemyHitMeshes), false);

        let endPoint = camera.position.clone().addScaledVector(dir, w.id === 'shotgun' ? 45 : w.id === 'sniper' ? 140 : 75);
        if (hits.length > 0) {
          const hit = hits[0];
          endPoint = hit.point;
          if (w.id === 'rpg') {
            // Explosive Splash Damage for RPG-7V (Bots + Online Opponents)
            sound.playRPGExplosion();
            spawnParticles(hit.point, 0xff5500, 22, 10.5);
            spawnParticles(hit.point, 0xffcc00, 14, 7.5);
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
                  if (!canDamagePlayer(activeRoom.mode, myTeam, targetPlayer.team || 'bravo', myOnlineId, rPid)) {
                    return;
                  }
                  const splashDmg = Math.max(55, Math.round(w.damage * (1 - d / 7.8)));
                  triggerHitmarker(false);
                  peerManager.sendPlayerHit(rPid, splashDmg, false);
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
              if (targetPlayer && !canDamagePlayer(activeRoom.mode, myTeam, targetPlayer.team || 'bravo', myOnlineId, rPid)) {
                showCenterAlert('هم‌تیمی است — آسیب غیرفعال (Friendly Fire OFF)', 1100);
              } else {
                const dmg = Math.round(w.damage * (isHead ? w.headMult : 1.0));
                spawnParticles(hit.point, 0x991111, 7, 5);
                triggerHitmarker(isHead);
                sound.playHitmarker(isHead);
                peerManager.sendPlayerHit(rPid, dmg, isHead);
              }
            }
          } else if (hit.object.userData && hit.object.userData.pot) {
            destroyPot(hit.object.userData.pot as DestructiblePot);
          } else if (hit.object.userData && hit.object.userData.chicken) {
            hitChicken(hit.object.userData.chicken as RoamingChicken);
          } else {
            spawnParticles(hit.point, 0xffaa33, pelletCount > 1 ? 3 : 5, 4);
            if (hit.face && pIdx < 3) {
              const worldNormal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
              spawnDecal(hit.point, worldNormal);
            }
          }
        }
        lastEndPoint = endPoint;
        if (pIdx < 4) {
          spawnTracer(worldMuzzle, endPoint);
        }
      }

      sendOnlineShoot(currentWeaponIdx, worldMuzzle, lastEndPoint);

      if (w.mag === 0 && !cheats.infiniteAmmo) {
        window.setTimeout(() => {
          if (screenStateRef.current === 'playing' && WEAPONS[currentWeaponIdx] === w && w.mag === 0) {
            startReload();
          }
        }, 220);
      }
    }

    // =========================================================
    // SPAWNING & SESSION MANAGEMENT (Expanded 96x96m Arena)
    // =========================================================
    const spawnPoints = [
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

    function spawnOneEnemy() {
      let best = spawnPoints[0];
      let bestDist = -1;
      const shuffled = spawnPoints.slice().sort(() => Math.random() - 0.5);
      for (const pt of shuffled) {
        const d = Math.hypot(pt[0] - player.pos.x, pt[1] - player.pos.z);
        if (d > 14 && d > bestDist) {
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
        const humanOpponents = activeRoom.players.filter((p) => p.team === enemyTeam).length;
        const requiredOpponents = activeRoom.mode === 'tdm_2v2' ? 2 : 1;
        enemiesToSpawn = humanOpponents > 0 ? 0 : requiredOpponents;
        spawnIntervalTimer = 0.15;
        showCenterAlert(
          `راند ${activeRoom.currentRound} (${formatGameModeFa(activeRoom.mode)}) — هدف ${ROUND_MATCH_WIN_SCORE} راند`,
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

    function resetGame(mode: GamePlayMode, customTraining?: TrainingConfig) {
      const activeTraining = customTraining ? sanitizeTrainingConfig(customTraining) : trainingConfigRef.current;
      if (customTraining) {
        trainingConfigRef.current = activeTraining;
        setTrainingConfig(activeTraining);
      }

      enemies.forEach((e) => scene.remove(e.root));
      enemies.length = 0;
      rebuildEnemyHitboxes();
      enemyBullets.forEach((b) => scene.remove(b.mesh));
      enemyBullets.length = 0;
      tracers.forEach((t) => scene.remove(t.mesh));
      tracers.length = 0;

      const activeRoomOnReset = peerManager.getRoom();
      if (activeRoomOnReset) {
        const myTeam = peerManager.getLocalTeam();
        const teamIdx = Math.max(
          0,
          activeRoomOnReset.players
            .filter((p) => (p.team || 'alpha') === myTeam)
            .findIndex((p) => p.id === myOnlineId)
        );
        const spawn = getTeamSpawnPosition(myTeam, teamIdx);
        player.pos.set(spawn.x, 0, spawn.z);
        player.yaw = spawn.yaw;
      } else {
        player.pos.set(0, 0, 24);
        player.yaw = 0;
      }
      player.vel.set(0, 0, 0);
      player.pitch = 0;
      camera.position.set(player.pos.x, player.pos.y + player.height, player.pos.z);
      camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
      player.hp = 100;
      player.armor = mode === 'training' ? 50 : 25;
      player.onGround = true;
      isADS = false;
      setIsSniperScoped(false);

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
      if (reloadIndicator) reloadIndicator.style.display = 'none';

      // Select first allowed weapon from 3-weapon loadout (or training enabled weapons)
      const allowedIndices = getActiveLoadoutWeaponIndices();
      selectWeapon(allowedIndices[0] ?? 0, true);

      score = 0;
      totalKills = 0;
      camRecoilPitch = camRecoilYaw = camTargetRecoilPitch = camTargetRecoilYaw = 0;
      createPickups();

      if (mode === 'training') {
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

    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.code] = true;

      if (screenStateRef.current === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        // Handshake: Enter/Space starts game from Title screen if modals aren't open
        const modalOpen = document.querySelector('[role="dialog"]');
        if (!modalOpen) {
          e.preventDefault();
          engineApiRef.current?.startSession('campaign');
          return;
        }
      }

      if (screenStateRef.current !== 'playing') {
        if ((e.code === 'Escape' || e.code === 'KeyP') && screenStateRef.current === 'paused') {
          engineApiRef.current?.resumeSession();
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
      else if (e.code === 'KeyC') cycleNextWeapon();
      else if (e.code === 'KeyR') startReload();
      else if (e.code === 'KeyQ') toggleADS();
      else if (e.code === 'KeyV') {
        if (activeOnlineRoomCode && voiceStateRef.current.mode === 'ptt') {
          if (!e.repeat) {
            void voiceManager.setPushToTalkActive(true);
          }
        } else {
          cycleManualLean();
        }
      }
      else if (e.code === 'KeyE') activateAdrenalinePower();
      else if (e.code === 'KeyF') {
        gfx.flashlightOn = !gfx.flashlightOn;
        setGfxState({ ...gfx });
        applyLightingSettings();
      } else if (e.code === 'Space' && player.onGround) {
        player.vel.y = cheatConfigRef.current.superSpeed ? 11.2 : 7.7;
        player.onGround = false;
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        engineApiRef.current?.pauseSession();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
      if (e.code === 'KeyV' && activeOnlineRoomCode && voiceStateRef.current.mode === 'ptt') {
        void voiceManager.setPushToTalkActive(false);
      }
    };

    const onWindowBlur = () => {
      Object.keys(keys).forEach((k) => (keys[k] = false));
      isFiringInput = false;
      if (voiceStateRef.current.pttPressed) {
        void voiceManager.setPushToTalkActive(false);
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (screenStateRef.current !== 'playing') return;
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
    const lastFireLook = { x: 0, y: 0 };

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
    }

    if (rightZone) {
      rightZone.addEventListener(
        'touchstart',
        (e) => {
          e.preventDefault();
          sound.unlock();
          if (lookTouchId !== null) return;
          const t = e.changedTouches[0];
          lookTouchId = t.identifier;
          lastLook.x = t.clientX;
          lastLook.y = t.clientY;
        },
        { passive: false }
      );
      rightZone.addEventListener(
        'touchmove',
        (e) => {
          e.preventDefault();
          for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.identifier === lookTouchId) {
              applyTouchLook(t.clientX - lastLook.x, t.clientY - lastLook.y);
              lastLook.x = t.clientX;
              lastLook.y = t.clientY;
            }
          }
        },
        { passive: false }
      );
      const endLook = (e: TouchEvent) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === lookTouchId) lookTouchId = null;
        }
      };
      rightZone.addEventListener('touchend', endLook);
      rightZone.addEventListener('touchcancel', endLook);
    }

    if (btnFire) {
      btnFire.addEventListener(
        'touchstart',
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          sound.unlock();
          const t = e.changedTouches[0];
          fireTouchId = t.identifier;
          lastFireLook.x = t.clientX;
          lastFireLook.y = t.clientY;
          btnFire.classList.add('pressed');
          isFiringInput = true;
          fireCurrentWeapon();
        },
        { passive: false }
      );
      btnFire.addEventListener(
        'touchmove',
        (e) => {
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
        },
        { passive: false }
      );
      const endFire = (e: TouchEvent) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === fireTouchId) {
            fireTouchId = null;
            isFiringInput = false;
            btnFire.classList.remove('pressed');
          }
        }
      };
      btnFire.addEventListener('touchend', endFire);
      btnFire.addEventListener('touchcancel', endFire);
    }

    // =========================================================
    // REAL-TIME ONLINE MULTIPLAYER CLIENT (PEERJS WEBRTC P2P + FALLBACK)
    // =========================================================
    interface RemoteOperator3D {
      id: string;
      name: string;
      team: TeamId;
      root: THREE.Group;
      bodyMat: THREE.MeshStandardMaterial;
      vestMat: THREE.MeshStandardMaterial;
      visorMat: THREE.MeshBasicMaterial;
      legL: THREE.Group;
      legR: THREE.Group;
      sprite: THREE.Sprite;
      hitMeshes: THREE.Mesh[];
      targetPos: THREE.Vector3;
      targetYaw: number;
      lastPos: THREE.Vector3;
      walkPhase: number;
      initialized: boolean;
      lastRespawnSeq: number;
      lastAlive: boolean;
      lastRound: number;
      lastSpeaking: boolean;
    }
    const remoteOperators = new Map<string, RemoteOperator3D>();
    let myOnlineId = `op-${Math.random().toString(36).slice(2, 8)}`;
    setLocalOnlinePlayerId(myOnlineId);
    let activeOnlineRoomCode = '';
    let activeOnlinePassword = '';
    let onlineBroadcastTimer = 0;

    function rebuildRemoteHitboxes() {
      for (let i = enemyHitMeshes.length - 1; i >= 0; i--) {
        if (enemyHitMeshes[i]?.userData?.remotePlayerId) {
          enemyHitMeshes.splice(i, 1);
        }
      }
      remoteOperators.forEach((op) => {
        if (op.root.visible) {
          op.hitMeshes.forEach((m) => enemyHitMeshes.push(m));
        }
      });
    }

    function refreshRemoteNameplatesSpeaking(speakingIds: string[]) {
      const speakingSet = new Set(speakingIds);
      remoteOperators.forEach((op) => {
        const isSpeakingNow = speakingSet.has(op.id);
        if (op.lastSpeaking !== isSpeakingNow) {
          op.lastSpeaking = isSpeakingNow;
          const nameplateLabel = `${op.name} [${op.team === 'alpha' ? 'ALPHA' : 'BRAVO'}]`;
          op.sprite.material.map?.dispose();
          op.sprite.material.map = makeNameplateTexture(nameplateLabel, getTeamColor(op.team), isSpeakingNow);
          op.sprite.material.needsUpdate = true;
        }
      });
    }

    function getOrCreateRemoteOperator(id: string, name: string, colorHex: string, team: TeamId = 'alpha'): RemoteOperator3D {
      const nextColor = colorHex || getTeamColor(team);
      const uniformHex = team === 'bravo' ? 0x3b1b26 : 0x1a2c44;
      const nameplateLabel = `${name} [${team === 'alpha' ? 'ALPHA' : 'BRAVO'}]`;
      const isCurrentlySpeaking = voiceStateRef.current.speakingPlayerIds.includes(id);

      const existing = remoteOperators.get(id);
      if (existing) {
        existing.vestMat.color.set(nextColor);
        existing.visorMat.color.set(nextColor);
        existing.bodyMat.color.setHex(uniformHex);
        if (existing.team !== team || existing.name !== name || existing.lastSpeaking !== isCurrentlySpeaking) {
          existing.team = team;
          existing.name = name;
          existing.lastSpeaking = isCurrentlySpeaking;
          existing.sprite.material.map?.dispose();
          existing.sprite.material.map = makeNameplateTexture(nameplateLabel, nextColor, isCurrentlySpeaking);
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

      // Sculpted Torso, Tactical Belt, Team-Colored Plate Carrier Vest & Shoulder Pads
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.74, 0.32), bodyMat);
      torso.position.y = 1.15;
      torso.castShadow = !isSoftwareGl;
      torso.userData.remotePlayerId = id;
      torso.userData.isHead = false;
      root.add(torso);
      hitMeshes.push(torso);

      const belt = new THREE.Mesh(new THREE.BoxGeometry(0.59, 0.1, 0.34), gearMat);
      belt.position.set(0, 0.82, 0);
      root.add(belt);

      const plateCarrier = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.5, 0.37), vestMat);
      plateCarrier.position.set(0, 1.2, 0);
      plateCarrier.userData.remotePlayerId = id;
      plateCarrier.userData.isHead = false;
      root.add(plateCarrier);
      hitMeshes.push(plateCarrier);

      [-0.14, 0, 0.14].forEach((px) => {
        const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.17, 0.06), gearMat);
        pouch.position.set(px, 1.1, 0.2);
        root.add(pouch);
      });

      [-0.34, 0.34].forEach((sx) => {
        const pad = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.18, 0.25), vestMat);
        pad.position.set(sx, 1.44, 0);
        root.add(pad);
      });

      // Neck, Head, Ballistic Helmet & Glowing Team Visor
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.13, 10), gearMat);
      neck.position.set(0, 1.57, 0);
      root.add(neck);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.34), gearMat);
      head.position.y = 1.78;
      head.castShadow = !isSoftwareGl;
      head.userData.remotePlayerId = id;
      head.userData.isHead = true;
      root.add(head);
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
      root.add(armL);

      const armR = new THREE.Group();
      armR.position.set(0.35, 1.38, 0.05);
      const upperArmR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 0.16), bodyMat);
      upperArmR.position.set(-0.04, -0.14, 0.1);
      upperArmR.rotation.set(-0.95, -0.15, 0);
      const foreArmR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.14), gearMat);
      foreArmR.position.set(-0.12, -0.22, 0.25);
      foreArmR.rotation.set(-1.25, -0.2, 0);
      armR.add(upperArmR, foreArmR);
      root.add(armR);

      const { weaponGroup: gun } = buildBotWeaponModel('assault');
      gun.position.set(0.16, 1.22, 0.32);
      root.add(gun);

      const nameTex = makeNameplateTexture(nameplateLabel, nextColor, isCurrentlySpeaking);
      const spriteMat = new THREE.SpriteMaterial({ map: nameTex, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(0, 2.34, 0);
      sprite.scale.set(2.15, 0.4, 1);
      sprite.renderOrder = 2;
      root.add(sprite);

      scene.add(root);
      const initSpawn = getTeamSpawnPosition(team, 0);
      root.position.set(initSpawn.x, 0, initSpawn.z);
      root.rotation.y = initSpawn.yaw;
      root.updateMatrixWorld(true);

      const op: RemoteOperator3D = {
        id,
        name,
        team,
        root,
        bodyMat,
        vestMat,
        visorMat,
        legL,
        legR,
        sprite,
        hitMeshes,
        targetPos: new THREE.Vector3(initSpawn.x, 0, initSpawn.z),
        targetYaw: initSpawn.yaw,
        lastPos: new THREE.Vector3(initSpawn.x, 0, initSpawn.z),
        walkPhase: 0,
        initialized: false,
        lastRespawnSeq: -1,
        lastAlive: true,
        lastRound: 0,
        lastSpeaking: isCurrentlySpeaking,
      };
      remoteOperators.set(id, op);
      rebuildRemoteHitboxes();
      return op;
    }

    function removeRemoteOperator(id: string) {
      const op = remoteOperators.get(id);
      if (op) {
        scene.remove(op.root);
        remoteOperators.delete(id);
        rebuildRemoteHitboxes();
      }
    }

    function clearAllRemoteOperators() {
      remoteOperators.forEach((op) => scene.remove(op.root));
      remoteOperators.clear();
      rebuildRemoteHitboxes();
    }

    function applyOnlineRoomState(roomData: OnlineRoomSummary | AuthoritativeRoomState) {
      activeOnlineRoomCode = roomData.code;
      setOnlineRoom(roomData);
      setOnlineRoomError(null);
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
        const op = getOrCreateRemoteOperator(p.id, p.name, getTeamColor(pTeam), pTeam);
        const nextAlive = p.alive !== false;
        const shouldBeVisible = !isRoundBasedMode(roomData.mode) || nextAlive;
        if (op.root.visible !== shouldBeVisible) {
          op.root.visible = shouldBeVisible;
          visibilityChanged = true;
        }
        const rp = p as unknown as { x?: number; y?: number; z?: number; yaw?: number; respawnSeq?: number };
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

          if (instantTeleport) {
            op.root.position.set(nextX, nextY, nextZ);
            op.lastPos.set(nextX, nextY, nextZ);
            op.root.rotation.y = nextYaw;
            op.legL.rotation.x = 0;
            op.legR.rotation.x = 0;
            op.walkPhase = 0;
            op.root.updateMatrixWorld(true);
          }

          op.initialized = true;
          op.lastRespawnSeq = Math.max(op.lastRespawnSeq, nextRespawnSeq);
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
        onRoomState: (room) => {
          applyOnlineRoomState(room);
          voiceManager.syncRoomRoster(room.code, room.mode, room.players);
        },
        onRoomLeft: () => {
          activeOnlineRoomCode = '';
          setOnlineRoom(null);
          clearAllRemoteOperators();
          voiceManager.clearRoomAndDisconnect();
        },
        onRemoteShoot: (_playerId, weaponIdx, from, to) => {
          const f = new THREE.Vector3(Number(from.x) || 0, Number(from.y) || 1.4, Number(from.z) || 0);
          const t = new THREE.Vector3(Number(to.x) || 0, Number(to.y) || 1.4, Number(to.z) || 0);
          const firedWeaponId: WeaponId = WEAPONS[weaponIdx]?.id || 'ak47';
          if (firedWeaponId !== 'katana') {
            spawnTracer(f, t);
          }
          sound.playWeaponShotById(firedWeaponId);
          if (firedWeaponId === 'rpg') {
            sound.playRPGExplosion();
            spawnParticles(t, 0xff5500, 18, 9.5);
            spawnParticles(t, 0xffcc00, 10, 7.0);
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
        onLocalPlayerDamaged: (dmg, attackerName, killed, respawnPos) => {
          if (cheatConfigRef.current.godMode) return;
          const activeRoom = peerManager.getRoom();
          const roundMode = activeRoom ? isRoundBasedMode(activeRoom.mode) : false;
          player.hp = killed ? (roundMode ? 0 : 100) : Math.max(0, player.hp - dmg);
          if (killed) {
            if (roundMode) {
              showCenterAlert(`توسط «${attackerName}» در این راند حذف شدید — منتظر شروع راند بعدی باشید`, 2500);
            } else {
              const myTeam = peerManager.getLocalTeam();
              const teamSpawn = respawnPos || getTeamSpawnPosition(myTeam, 0);
              player.pos.set(teamSpawn.x, 0, teamSpawn.z);
              player.vel.set(0, 0, 0);
              player.yaw = teamSpawn.yaw;
              player.pitch = 0;
              camera.position.set(player.pos.x, player.pos.y + player.height, player.pos.z);
              camera.rotation.set(0, player.yaw, 0, 'YXZ');
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
          player.pos.set(spawnPos.x, 0, spawnPos.z);
          player.vel.set(0, 0, 0);
          player.yaw = spawnPos.yaw;
          player.pitch = 0;
          player.hp = 100;
          player.armor = 50;
          player.onGround = true;
          isADS = false;
          setIsSniperScoped(false);
          camRecoilPitch = camRecoilYaw = camTargetRecoilPitch = camTargetRecoilYaw = 0;
          camera.position.set(player.pos.x, player.pos.y + player.height, player.pos.z);
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
          if (reloadIndicator) reloadIndicator.style.display = 'none';
          enemies.forEach((e) => scene.remove(e.root));
          enemies.length = 0;
          enemyBullets.forEach((b) => scene.remove(b.mesh));
          enemyBullets.length = 0;
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
              hp: 100,
              kills: totalKills,
              score,
              wave: roundNum,
            });
          }
          startWave(roundNum);
          showCenterAlert(messageFa, 2400);
          updateHUD();
        },
        onNotice: (messageFa) => {
          showCenterAlert(messageFa, 2800);
          addKillFeed(messageFa, false);
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

    // Check URL parameters (?room=CODE&map=...) immediately on startup (works 100% serverless)
    const initUrlParams = new URLSearchParams(window.location.search);
    const initRoomParam = initUrlParams.get('room');
    const initMapParam = initUrlParams.get('map') as MapId | null;
    if (initMapParam && (initMapParam === 'warehouse' || initMapParam === 'docks' || initMapParam === 'outpost')) {
      currentMapRef.current = initMapParam;
      setCurrentMapState(initMapParam);
      buildArenaMap(initMapParam);
    }
    if (initRoomParam && initRoomParam.trim()) {
      const normalizedInvite = normalizeRoomCode(initRoomParam.trim());
      setPendingInviteRoomCode(normalizedInvite);
      setShowOnlineModal(true);
      window.setTimeout(() => {
        peerManager.joinRoom(normalizedInvite, '');
      }, 250);
    }

    // Expose Engine API to React UI
    engineApiRef.current = {
      startSession: (mode: GamePlayMode, customTraining?: TrainingConfig) => {
        sound.unlock();
        playModeRef.current = mode;
        setPlayMode(mode);
        setShowTrainingModal(false);
        setShowSettingsModal(false);
        setShowOnlineModal(false);
        resetGame(mode, customTraining);
        screenStateRef.current = 'playing';
        document.body.dataset.state = 'playing';
        setScreenState('playing');
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      },
      resumeSession: () => {
        sound.unlock();
        setShowSettingsModal(false);
        setShowTrainingModal(false);
        setShowOnlineModal(false);
        screenStateRef.current = 'playing';
        document.body.dataset.state = 'playing';
        setScreenState('playing');
      },
      pauseSession: () => {
        isFiringInput = false;
        if (document.pointerLockElement) document.exitPointerLock?.();
        screenStateRef.current = 'paused';
        document.body.dataset.state = 'paused';
        setScreenState('paused');
        setShowSettingsModal(true);
      },
      returnToTitle: () => {
        isFiringInput = false;
        if (document.pointerLockElement) document.exitPointerLock?.();
        setShowSettingsModal(false);
        setShowTrainingModal(false);
        setShowOnlineModal(false);
        screenStateRef.current = 'title';
        document.body.dataset.state = 'title';
        setScreenState('title');
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
        enemies.forEach((e) => scene.remove(e.root));
        enemies.length = 0;
        enemyBullets.forEach((b) => scene.remove(b.mesh));
        enemyBullets.length = 0;
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
        if (presetName === 'promax') {
          gfx.resScale = 1.65;
          gfx.shadowMode = isSoftwareGl ? 'off' : 'ultra';
          gfx.bodycamFx = true;
          gfx.flashlightOn = true;
          gfx.vibrance = 1.6;
          gfx.targetFps = 0;
        } else if (presetName === 'ultramax') {
          gfx.resScale = 1.45;
          gfx.shadowMode = isSoftwareGl ? 'off' : 'ultra';
          gfx.bodycamFx = true;
          gfx.flashlightOn = true;
          gfx.vibrance = 1.52;
          gfx.targetFps = 0;
        } else if (presetName === 'ultra') {
          gfx.resScale = 1.25;
          gfx.shadowMode = isSoftwareGl ? 'off' : 'ultra';
          gfx.bodycamFx = true;
          gfx.flashlightOn = true;
        } else if (presetName === 'high') {
          gfx.resScale = 1.0;
          gfx.shadowMode = isSoftwareGl ? 'off' : 'soft';
          gfx.bodycamFx = true;
          gfx.flashlightOn = true;
        } else if (presetName === 'med') {
          gfx.resScale = 0.75;
          gfx.shadowMode = isSoftwareGl ? 'off' : 'basic';
          gfx.bodycamFx = true;
          gfx.flashlightOn = true;
        } else if (presetName === 'low') {
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
        setGfxState({ ...gfx });
        applyShadowSettings();
        applyLightingSettings();
        applyBodycamFXSettings();
      },
      updateGfx: (partial: Partial<GfxState>) => {
        Object.assign(gfx, partial);
        setGfxState({ ...gfx });
        applyShadowSettings();
        applyLightingSettings();
        applyBodycamFXSettings();
      },
      setMap: (mapId: MapId) => {
        currentMapRef.current = mapId;
        setCurrentMapState(mapId);
        buildArenaMap(mapId);
        createPickups();
        peerManager.notifyHostMapChange(mapId);
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
        currentMapRef.current = mapId;
        setCurrentMapState(mapId);
        buildArenaMap(mapId);
        peerManager.setPlayerName(onlinePlayerNameRef.current || 'GHOST-01');
        const createdCode = peerManager.hostRoom(mapId, mode, activeOnlinePassword);
        activeOnlineRoomCode = createdCode;
      },
      changeOnlineGameMode: (mode: OnlineGameMode) => {
        peerManager.setGameMode(mode);
      },
      switchOnlineTeam: (playerId?: string) => {
        peerManager.switchPlayerTeam(playerId);
      },
      joinOnlineRoom: (code: string, password = '') => {
        const cleanCode = normalizeRoomCode(code);
        setOnlineRoomError(null);
        activeOnlinePassword = password.trim();
        peerManager.setPlayerName(onlinePlayerNameRef.current || 'GHOST-01');
        peerManager.joinRoom(cleanCode, activeOnlinePassword);
      },
      leaveOnlineRoom: () => {
        peerManager.leaveRoom();
        voiceManager.clearRoomAndDisconnect();
        activeOnlineRoomCode = '';
        setOnlineRoom(null);
        setOnlineRoomError(null);
        clearAllRemoteOperators();
      },
      setOnlineCallsign: (name: string) => {
        peerManager.setPlayerName(name);
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
    };

    // Initial Graphics Setup
    applyShadowSettings();
    applyLightingSettings();
    applyBodycamFXSettings();
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
    const initialMap = params.get('map') as MapId | null;
    if (initialMap && (initialMap === 'warehouse' || initialMap === 'docks' || initialMap === 'outpost')) {
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

    function renderScene() {
      if (gfx.bodycamFx && renderTarget && !isSoftwareGl) {
        renderer.setRenderTarget(renderTarget);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
        renderer.render(postScene, postCam);
      } else {
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
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

    function scheduleNextFrame() {
      if (isSoftwareGl) {
        afterDraw(animate);
      } else {
        frameId = requestAnimationFrame(animate);
      }
    }

    function animate(now: number) {
      if (!isSoftwareGl && gfx.targetFps > 0) {
        const minInterval = 1000 / gfx.targetFps;
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

      fpsFrames++;
      if (now - fpsTimer >= 420) {
        const fps = Math.round((fpsFrames * 1000) / (now - fpsTimer));
        if (fpsValueEl) {
          fpsValueEl.textContent = String(fps);
          fpsValueEl.style.color = fps >= 48 ? '#00e676' : fps >= 28 ? '#ffbe0b' : '#ff2e4c';
        }
        fpsFrames = 0;
        fpsTimer = now;
      }

      postUniforms.uTime.value = now * 0.001;
      damageShaderFlash = Math.max(0, damageShaderFlash - dt * 2.5);
      postUniforms.uDamage.value = damageShaderFlash;

      clockTick += dt;
      if (clockTick >= 1.0) {
        clockTick = 0;
        updateRecClock();
      }

      if (screenStateRef.current === 'title') {
        menuCamAngle += dt * 0.28;
        const orbitRadius = 18.5 + Math.sin(menuCamAngle * 0.7) * 3.5;
        camera.position.set(
          Math.cos(menuCamAngle) * orbitRadius,
          6.2 + Math.sin(menuCamAngle * 1.1) * 1.8,
          Math.sin(menuCamAngle) * orbitRadius
        );
        camera.lookAt(0, 1.6, 0);

        // Showcase active 3D weapon floating & rotating gently in foreground
        weaponPivot.visible = true;
        weaponPivot.position.set(0.24, -0.18 + Math.sin(now * 0.0025) * 0.015, -0.44);
        weaponSwayGroup.rotation.set(
          Math.sin(now * 0.0018) * 0.06,
          Math.sin(now * 0.0014) * 0.26,
          Math.cos(now * 0.0016) * 0.05
        );
        laserDotMesh.visible = false;

        // Animate 3D chickens, pickups, and patrolling operators in the background
        pickups.forEach((p) => {
          if (p.active) {
            p.group.rotation.y += dt * 1.8;
            p.group.position.y = 0.55 + Math.sin(now * 0.004 + p.x) * 0.12;
          }
        });
        chickens.forEach((chk) => {
          if (!chk.alive) return;
          chk.walkPhase += dt * 10;
          chk.group.position.y = Math.abs(Math.sin(chk.walkPhase)) * 0.03;
          chk.group.rotation.y += dt * 0.35;
        });
        enemies.forEach((e, idx) => {
          if (!e.alive) return;
          e.walkPhase += dt * 4.5;
          const demoCombatBlend = 0.5 + 0.5 * Math.sin(now * 0.0018 + idx * 1.4);
          const pose = computeBotStancePose(demoCombatBlend, e.walkPhase, true);
          e.torsoMesh.position.y = pose.torsoY;
          e.torsoMesh.rotation.set(pose.torsoPitch, 0, pose.torsoRoll);
          e.headMesh.rotation.set(pose.headPitch, pose.headYaw, 0);
          e.legL.rotation.x = pose.legLSwing;
          e.legR.rotation.x = pose.legRSwing;
          e.armL.rotation.set(pose.armLPitch, pose.armLYaw, 0);
          e.armR.rotation.set(pose.armRPitch, pose.armRYaw, 0);
          e.weaponGroup.position.set(pose.weaponPosX, pose.weaponPosY, pose.weaponPosZ);
          e.weaponGroup.rotation.set(pose.weaponPitch, pose.weaponYaw, pose.weaponRoll);
          e.root.rotation.y = menuCamAngle + idx * 1.5;
          e.hpBg.lookAt(camera.position);
          e.hpFill.lookAt(camera.position);
        });

        renderScene();
        scheduleNextFrame();
        return;
      }

      weaponPivot.visible = true;
      if (screenStateRef.current !== 'playing') {
        renderScene();
        scheduleNextFrame();
        return;
      }

      // 1. Timers & Buffs
      const prevBuffState = adrenalineTimer > 0 || overdriveTimer > 0 || adrenalineCooldown > 0;
      if (adrenalineTimer > 0) adrenalineTimer = Math.max(0, adrenalineTimer - dt);
      if (overdriveTimer > 0) overdriveTimer = Math.max(0, overdriveTimer - dt);
      if (adrenalineCooldown > 0) adrenalineCooldown = Math.max(0, adrenalineCooldown - dt);
      if (prevBuffState) updateBuffHUD();

      // 2. Spawner & Authoritative Call of Duty Round Mode Tick
      if (playModeRef.current !== 'training') {
        peerManager.tickAuthoritativeRound(dt);
      }
      const activeRoom = peerManager.getRoom();
      const isRoundMatch = playModeRef.current !== 'training' && Boolean(activeRoom && isRoundBasedMode(activeRoom.mode));

      const aliveEnemies = enemies.filter((e) => e.alive).length;
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
      if (fireCooldown > 0) fireCooldown -= dt;
      if (isFiringInput && w.auto && fireCooldown <= 0 && !isReloading) fireCurrentWeapon();

      if (isReloading) {
        reloadProgress += dt / w.reloadTime;
        if (reloadBarFill) reloadBarFill.style.width = Math.min(100, reloadProgress * 100) + '%';
        if (w.model.mag) {
          w.model.mag.position.y = -Math.sin(Math.min(1, reloadProgress) * Math.PI) * 0.22;
          if (w.id === 'rpg' && reloadProgress > 0.35) {
            w.model.mag.visible = true;
          }
        }
        if (reloadProgress >= 1) {
          isReloading = false;
          if (reloadIndicator) reloadIndicator.style.display = 'none';
          if (w.model.mag) {
            w.model.mag.position.y = 0;
            if (w.id === 'rpg') w.model.mag.visible = true;
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
          updateHUD();
        }
      }

      let inX = joyMoveX;
      let inZ = joyMoveY;
      if (keys['KeyW'] || keys['ArrowUp']) inZ -= 1;
      if (keys['KeyS'] || keys['ArrowDown']) inZ += 1;
      if (keys['KeyA'] || keys['ArrowLeft']) inX -= 1;
      if (keys['KeyD'] || keys['ArrowRight']) inX += 1;
      const inLen = Math.hypot(inX, inZ);
      if (inLen > 1) {
        inX /= inLen;
        inZ /= inLen;
      }

      const isMoving = inLen > 0.08;
      const mobileSprint = isTouchDevice && joyMoveY < -0.78;
      const sprinting =
        (((keys['ShiftLeft'] || keys['ShiftRight']) && inZ < -0.2) || mobileSprint) && !isADS && !isFiringInput;

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

      const accel = player.onGround ? 18 : 7;
      player.vel.x += (moveWorldX * moveSpeed - player.vel.x) * Math.min(1, accel * dt);
      player.vel.z += (moveWorldZ * moveSpeed - player.vel.z) * Math.min(1, accel * dt);
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
        ARENA_HALF
      );
      player.pos.x = col.x;
      player.pos.z = col.z;
      player.pos.y += player.vel.y * dt;

      const stepMoved = Math.hypot(player.pos.x - prevX, player.pos.z - prevZ);
      if (stepMoved > 0.02) {
        advanceTutorialFromGame('movement', stepMoved * (sprinting ? 1.5 : 1.0), sound);
      }

      if (player.pos.y <= col.floorY) {
        if (wasInAir && player.vel.y < -3) camLandDip = Math.min(0.14, Math.abs(player.vel.y) * 0.015);
        player.pos.y = col.floorY;
        player.vel.y = 0;
        player.onGround = true;
      } else {
        player.onGround = false;
      }

      // 4. Warzone-Style Corner Lean / Wall Mount + Bot Visibility Check + Line-of-Sight Aim Assist
      const prevCornerMounted = isCornerMounted;
      const targetLean = sprinting ? 0 : detectAutoCornerLean(inX);
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

      if (cheats.aimAssistEnabled && cheats.aimAssistStrength > 0 && (isADS || isFiringInput)) {
        const targets = enemies
          .filter((e) => {
            if (!e.alive || !e.visibleToPlayer) return false;
            const ty = e.root.position.y + (cheats.aimAssistHeadshot ? 1.72 : 1.2) * e.cfg.scale;
            return hasLineOfSightToPoint(e.root.position.x, ty, e.root.position.z);
          })
          .map((e, idx) => ({
            id: `bot-${idx}`,
            x: e.root.position.x,
            y: e.root.position.y + (cheats.aimAssistHeadshot ? 1.72 : 1.2) * e.cfg.scale,
            z: e.root.position.z,
            visible: e.visibleToPlayer,
          }));
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

      if (isMoving && player.onGround) walkBobTimer += dt * (sprinting ? 13.5 : 9.4);
      else walkBobTimer += dt * 1.4;

      const camStepY =
        isMoving && player.onGround
          ? Math.sin(walkBobTimer * 2) * (sprinting ? 0.045 : 0.024)
          : Math.sin(walkBobTimer) * 0.005;
      const targetCamRoll =
        (isMoving && player.onGround
          ? -inX * 0.032 + Math.sin(walkBobTimer) * (sprinting ? 0.022 : 0.012)
          : 0) -
        currentLean * 0.28;
      camRoll += (targetCamRoll - camRoll) * Math.min(1, 16 * dt);

      let leanOffsetX = Math.cos(player.yaw) * currentLean * 0.68;
      let leanOffsetZ = -Math.sin(player.yaw) * currentLean * 0.68;
      if (!isPositionFree(player.pos.x + leanOffsetX, player.pos.z + leanOffsetZ, 0.22)) {
        leanOffsetX *= 0.35;
        leanOffsetZ *= 0.35;
      }

      camera.position.set(
        player.pos.x + leanOffsetX,
        player.pos.y + player.height + camStepY - camLandDip,
        player.pos.z + leanOffsetZ
      );
      camera.rotation.y = player.yaw + camRecoilYaw + (Math.random() - 0.5) * screenShake;
      camera.rotation.x = Math.max(
        -1.48,
        Math.min(1.48, player.pitch + camRecoilPitch + (Math.random() - 0.5) * screenShake)
      );
      camera.rotation.z = camRoll;

      const targetFov = isADS ? baseFov + w.adsFovDelta : sprinting ? baseFov + 4 : baseFov;
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov += (targetFov - camera.fov) * Math.min(1, 13 * dt);
        camera.updateProjectionMatrix();
      }

      deadzoneLagX *= Math.exp(-9 * dt);
      deadzoneLagY *= Math.exp(-9 * dt);

      const gunBobAmp = isMoving && player.onGround ? (isADS ? 0.005 : sprinting ? 0.028 : 0.015) : 0.003;
      const bobX = Math.cos(walkBobTimer) * gunBobAmp;
      const bobY = Math.abs(Math.sin(walkBobTimer)) * gunBobAmp * 1.4;

      let targetPos = isADS ? w.adsPos : w.hipPos;
      if (sprinting && !w.isMelee) {
        targetPos = new THREE.Vector3(0.12, -0.25, -0.32);
      }
      weaponPivot.position.lerp(targetPos, Math.min(1, 15 * dt));
      weaponSwayGroup.position.set(
        deadzoneLagX * 0.55 + bobX + currentLean * 0.048,
        deadzoneLagY * 0.55 - bobY,
        0
      );
      weaponSwayGroup.rotation.set(
        deadzoneLagY * 1.3 + (sprinting && !w.isMelee ? -0.22 : 0),
        deadzoneLagX * 1.6 + (sprinting && !w.isMelee ? 0.52 : 0),
        (isADS ? w.adsCantRoll : deadzoneLagX * 0.8) - currentLean * 0.34
      );

      recoilPos.multiplyScalar(Math.exp(-16 * dt));
      recoilRot.multiplyScalar(Math.exp(-15 * dt));
      if (switchAnim > 0) switchAnim = Math.max(0, switchAnim - dt * 5.2);

      // Warzone-Style ADS Reloading: Keep weapon steady in scope when reloading in ADS
      const relTiltZ = isReloading ? Math.sin(Math.min(1, reloadProgress) * Math.PI) * (isADS ? 0.22 : 0.55) : 0;
      const relDropY = isReloading ? -Math.sin(Math.min(1, reloadProgress) * Math.PI) * (isADS ? 0.028 : 0.06) : 0;

      weaponRecoilGroup.position.set(recoilPos.x, recoilPos.y - switchAnim * 0.25 + relDropY, recoilPos.z);
      weaponRecoilGroup.rotation.set(recoilRot.x - switchAnim * 0.4, recoilRot.y, recoilRot.z + relTiltZ);

      if (slideKick > 0) {
        slideKick = Math.max(0, slideKick - dt * 0.65);
        pistolModel.slide.position.z = -0.02 + slideKick;
        deagleModel.slide.position.z = -0.04 + slideKick;
      }
      if (shotgunPumpKick > 0) {
        shotgunPumpKick = Math.max(0, shotgunPumpKick - dt * 3.2);
        if (shotgunModel.pump) {
          shotgunModel.pump.position.z = -0.28 + Math.sin(shotgunPumpKick * Math.PI) * 0.095;
        }
      }

      if (katanaSlashTimer > 0) {
        katanaSlashTimer = Math.max(0, katanaSlashTimer - dt);
        const p = 1 - katanaSlashTimer / 0.34;
        const swing = Math.sin(p * Math.PI);
        katanaModel.bladePivot.rotation.set(
          -0.48 - swing * 1.45,
          0.25 + katanaSlashDir * swing * 1.6,
          0.32 + katanaSlashDir * swing * 1.3
        );
        katanaModel.bladePivot.position.set(-katanaSlashDir * swing * 0.22, swing * 0.05, -swing * 0.25);
      } else {
        katanaModel.bladePivot.rotation.set(-0.48, 0.25, 0.32);
        katanaModel.bladePivot.position.set(0, 0, 0);
      }

      if (muzzleFlashTimer > 0) {
        muzzleFlashTimer -= dt;
        if (muzzleFlashTimer <= 0) {
          muzzleFlashGroup.visible = false;
          muzzlePointLight.intensity = 0;
        }
      }
      crosshairBloom = Math.max(0, crosshairBloom - dt * 0.14);
      updateCrosshairVisual();

      if (!w.isMelee && !sprinting && !isReloading) {
        const laserDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        shootRaycaster.set(camera.position, laserDir);
        shootRaycaster.far = 55;
        const lHits = shootRaycaster.intersectObjects(shootableEnvironment.concat(enemyHitMeshes), false);
        if (lHits.length > 0) {
          laserDotMesh.visible = true;
          laserDotMesh.position.copy(lHits[0].point).addScaledVector(laserDir, -0.04);
          laserDotMesh.scale.setScalar(Math.max(0.7, Math.min(2.6, lHits[0].distance * 0.08)));
        } else {
          laserDotMesh.visible = false;
        }
      } else {
        laserDotMesh.visible = false;
      }

      // 5. Pickups, Destructible Pots & 3D Roaming Chickens
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

      // Respawn shattered flower pots after timer
      pots.forEach((pot) => {
        if (!pot.alive) {
          pot.respawnTimer -= dt;
          if (pot.respawnTimer <= 0) {
            pot.alive = true;
            pot.group.visible = true;
          }
        }
      });

      // Animate 3D Roaming Chickens (lightweight low-poly waddle & pecking)
      chickens.forEach((chk) => {
        if (!chk.alive) {
          chk.respawnTimer -= dt;
          if (chk.respawnTimer <= 0) {
            chk.alive = true;
            chk.group.visible = true;
          }
          return;
        }
        chk.changeDirTimer -= dt;
        if (chk.changeDirTimer <= 0) {
          chk.yaw += (Math.random() - 0.5) * 2.1;
          chk.changeDirTimer = 1.6 + Math.random() * 2.4;
        }
        const cStep = chk.speed * dt;
        const nx = chk.x + Math.sin(chk.yaw) * cStep;
        const nz = chk.z + Math.cos(chk.yaw) * cStep;
        if (isPositionFree(nx, nz, 0.35)) {
          chk.x = nx;
          chk.z = nz;
        } else {
          chk.yaw += Math.PI * 0.75;
        }
        chk.walkPhase += dt * 11.5;
        chk.group.position.set(chk.x, Math.abs(Math.sin(chk.walkPhase)) * 0.03, chk.z);
        chk.group.rotation.y = chk.yaw;
        chk.legL.rotation.x = Math.sin(chk.walkPhase) * 0.55;
        chk.legR.rotation.x = -Math.sin(chk.walkPhase) * 0.55;
        chk.headGroup.position.z = Math.sin(chk.walkPhase * 2) * 0.025;
      });

      // Interpolate Remote Online Co-Op / PvP Players with articulated leg stride & adaptive nameplate sizing
      remoteOperators.forEach((op) => {
        if (!op.root.visible) return;
        op.root.position.lerp(op.targetPos, Math.min(1, 14 * dt));
        op.root.rotation.y = op.targetYaw;
        const moveDist = op.root.position.distanceTo(op.lastPos);
        op.lastPos.copy(op.root.position);
        if (moveDist > 0.008) {
          op.walkPhase += Math.min(0.45, moveDist * 3.8);
          op.legL.rotation.x = Math.sin(op.walkPhase) * 0.52;
          op.legR.rotation.x = -Math.sin(op.walkPhase) * 0.52;
        } else {
          op.legL.rotation.x *= 0.8;
          op.legR.rotation.x *= 0.8;
        }
        const camDist = camera.position.distanceTo(op.root.position);
        const nameScaleW = Math.max(1.1, Math.min(2.15, camDist * 0.145));
        op.sprite.scale.set(nameScaleW, nameScaleW * 0.186, 1);
      });

      onlineBroadcastTimer += dt;
      if (onlineBroadcastTimer >= 0.08 && activeOnlineRoomCode) {
        onlineBroadcastTimer = 0;
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
          e.deathTimer += dt;
          e.root.rotation.x = Math.min(Math.PI / 2, e.deathTimer * 4.5);
          e.root.position.y = Math.max(-0.4, -e.deathTimer * 0.4);
          if (e.deathTimer > 1.4) {
            scene.remove(e.root);
            enemies.splice(i, 1);
          }
          continue;
        }

        const dx = player.pos.x - e.root.position.x;
        const dz = player.pos.z - e.root.position.z;
        const distToPlayer = Math.hypot(dx, dz);
        const dirToPlayer = new THREE.Vector3(dx, 0, dz).normalize();
        const targetCombatYaw = Math.atan2(dx, dz);

        e.hpBg.lookAt(camera.position);
        e.hpFill.lookAt(camera.position);
        const hpFrac = Math.max(0.001, e.hp / e.maxHp);
        e.hpFill.scale.x = hpFrac;
        e.hpFill.position.x = -(1 - hpFrac) * 0.355;

        const eyeOrigin = e.root.position.clone().add(new THREE.Vector3(0, 1.5, 0));
        const playerChest = player.pos.clone().add(new THREE.Vector3(0, 1.25, 0));
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
            ARENA_HALF
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
            ARENA_HALF
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
              ARENA_HALF
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
          const gunTip = new THREE.Vector3();
          e.muzzleFlash.getWorldPosition(gunTip);
          e.muzzleFlash.visible = true;
          e.muzzleFlash.rotation.z = Math.random() * Math.PI * 2;
          e.muzzleFlashTimer = 0.075;
          e.recoilKickZ = 0.075;
          spawnEnemyBullet(gunTip, playerChest, e.dmg, e.spread, e.bulletSpeed);
          sound.playEnemyShot(distToPlayer);
        }
      }

      // 7. Projectiles, Shells & Particles
      for (let i = tracers.length - 1; i >= 0; i--) {
        const t = tracers[i];
        const step = t.speed * dt;
        t.mesh.position.addScaledVector(t.dir, step);
        t.traveled += step;
        if (t.traveled >= t.maxDist) {
          scene.remove(t.mesh);
          tracers.splice(i, 1);
        }
      }

      for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const b = enemyBullets[i];
        b.life -= dt;
        const prevPos = b.mesh.position.clone();
        b.mesh.position.addScaledVector(b.dir, b.speed * dt);

        const pChest = player.pos.clone().add(new THREE.Vector3(0, 1.15, 0));
        if (b.mesh.position.distanceTo(pChest) < 0.72) {
          if (!cheats.godMode) {
            const dmgRes = calculateDamageTaken(b.dmg, player.hp, player.armor);
            player.hp = dmgRes.nextHp;
            player.armor = dmgRes.nextArmor;

            sound.playHurt();
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

          scene.remove(b.mesh);
          enemyBullets.splice(i, 1);
          if (player.hp <= 0 && !cheats.godMode) {
            if (playModeRef.current === 'training') {
              player.hp = 100;
              player.armor = 50;
              updateHUD();
              showCenterAlert('احیای خودکار در میدان تمرین — سلامت و زره بازیابی شد', 1800);
            } else if (isRoundMatch && activeRoom) {
              player.hp = 100;
              player.armor = 50;
              isFiringInput = false;
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
              isFiringInput = false;
              if (document.pointerLockElement) document.exitPointerLock?.();
              setGameOverStats({ score, kills: totalKills, wave });
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
          spawnParticles(prevPos, 0xff2244, 3, 2.5);
          b.life = 0;
        }
        if (b.life <= 0) {
          scene.remove(b.mesh);
          enemyBullets.splice(i, 1);
        }
      }

      for (let i = shells.length - 1; i >= 0; i--) {
        const s = shells[i];
        s.life -= dt;
        s.vel.y -= 14 * dt;
        s.mesh.position.addScaledVector(s.vel, dt);
        s.mesh.rotation.x += s.rotVel.x * dt;
        s.mesh.rotation.y += s.rotVel.y * dt;
        if (s.mesh.position.y < 0.03) {
          s.mesh.position.y = 0.03;
          s.vel.y = Math.abs(s.vel.y) * 0.35;
          s.vel.x *= 0.6;
          s.vel.z *= 0.6;
        }
        if (s.life <= 0) {
          scene.remove(s.mesh);
          shells.splice(i, 1);
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (!p.isArc) p.vel.y -= 9.8 * dt;
        p.mesh.position.addScaledVector(p.vel, dt);
        const ratio = Math.max(0, p.life / p.maxLife);
        if (p.isArc) {
          p.mesh.scale.setScalar(1 + (1 - ratio) * 0.45);
          (p.mesh.material as THREE.MeshBasicMaterial).opacity = ratio * 0.85;
        } else {
          p.mesh.scale.setScalar(ratio);
        }
        if (p.life <= 0) {
          scene.remove(p.mesh);
          particles.splice(i, 1);
        }
      }

      for (let i = decals.length - 1; i >= 0; i--) {
        decals[i].life -= dt;
        if (decals[i].life <= 0) {
          scene.remove(decals[i].mesh);
          decals.splice(i, 1);
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

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      rebuildRenderTarget();
    };
    window.addEventListener('resize', onResize);

    scheduleNextFrame();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      voiceManager.dispose();
      peerManager.dispose();
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
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

  const renderWeaponIconSvg = (id: WeaponId) => {
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
  };

  const presetLabel =
    gfxState.preset === 'promax'
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
  const botLabel = botDifficulty === 'weak' ? 'ضعیف' : botDifficulty === 'strong' ? 'قوی' : 'متوسط';
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

  return (
    <>
      <div id="canvas-mount" ref={canvasMountRef} />

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

      {/* Sniper 8X Optical Scope Reticle Overlay (Clean Mil-Dot Reticle — Zero Text) */}
      {isSniperScoped && (screenState === 'playing' || screenState === 'paused') && (
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
      )}

      {/* Always-Visible Top-Right FPS + Fullscreen + Settings Bar */}
      <div id="top-right-bar">
        <div className="fps-readout">
          <span>FPS</span>
          <span id="fps-value">60</span>
        </div>
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
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
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
          title="تنظیمات"
          aria-label="Open Settings"
          onClick={(e) => {
            e.currentTarget.blur();
            if (showSettingsModal) {
              if (screenState === 'paused') engineApiRef.current?.resumeSession();
              else setShowSettingsModal(false);
            } else {
              if (screenState === 'playing') engineApiRef.current?.pauseSession();
              else setShowSettingsModal(true);
            }
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Playing HUD */}
      <div id="hud" style={{ display: screenState === 'playing' || screenState === 'paused' ? 'block' : 'none' }}>
        <div className="hud-top-left">
          <div className="radar-wrap">
            <canvas id="radar-canvas" ref={radarCanvasRef} width="120" height="120" />
          </div>
          <div className="bodycam-meta">
            <div className="rec-line">
              <span className="rec-indicator-square" aria-hidden="true" />
              <span>REC · AXON BODY 4</span>
            </div>
            <div id="bodycam-rec-time">2026-11-16 12:00:00</div>
            <div
              className="wave-readout-line"
              dir="rtl"
              style={{
                display:
                  playMode !== 'training' && onlineRoom && isRoundBasedMode(onlineRoom.mode) ? 'none' : undefined,
              }}
            >
              <span>
                وضعیت <b className="c-wave" id="hud-wave">1</b>
              </span>
              <span>·</span>
              <span>
                دشمن <b className="c-en" id="hud-enemies">0</b>
              </span>
              <span>·</span>
              <span>
                امتیاز <b className="c-sc" id="hud-score">0</b>
              </span>
            </div>
            {(onlineRoom || peerStatus !== 'idle') && (
              <div className="hud-online-wrap" data-testid="hud-online-status" dir="rtl">
                <button
                  type="button"
                  className="hud-online-chip"
                  data-testid="hud-online-toggle"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHudRoomExpanded((prev) => !prev);
                  }}
                  style={{
                    borderColor: formatConnectionStatusFa(peerStatus, peerRole, onlineRoomError).color,
                  }}
                >
                  <span
                    className="hud-online-dot"
                    style={{
                      background: formatConnectionStatusFa(peerStatus, peerRole, onlineRoomError).color,
                    }}
                  />
                  {onlineRoom ? (
                    <>
                      <span className="hud-online-code">{onlineRoom.code}</span>
                      <span className="hud-online-count">({onlineRoom.players.length})</span>
                    </>
                  ) : (
                    <span>{formatConnectionStatusFa(peerStatus, peerRole, onlineRoomError).badgeFa}</span>
                  )}
                  <span style={{ color: '#94a3b8', fontSize: '0.85em' }}>{hudRoomExpanded ? '▴' : '▾'}</span>
                </button>
                {hudRoomExpanded && (
                  <div className="hud-online-popover">
                    <span style={{ color: '#e2e8f0', fontWeight: 700 }}>
                      {formatConnectionStatusFa(peerStatus, peerRole, onlineRoomError).badgeFa}
                    </span>
                    {onlineRoom && (
                      <button
                        type="button"
                        className="hud-copy-btn"
                        data-testid="hud-copy-room-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = buildRoomInviteUrl(
                            getCurrentOriginShareBaseUrl(window.location.origin, window.location.pathname),
                            onlineRoom.code,
                            onlineRoom.mapId
                          );
                          navigator.clipboard?.writeText(url).catch(() => {});
                          setHudRoomCopied(true);
                          window.setTimeout(() => setHudRoomCopied(false), 1600);
                        }}
                      >
                        {hudRoomCopied ? 'کپی شد' : 'کپی لینک اتاق'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            {onlineRoom && (voiceState.speakingPlayerIds.length > 0 || voiceState.autoplayBlocked) && (
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
            )}
          </div>
        </div>

        {/* Interactive Training Mode & Tutorial Overlay */}
        {playMode === 'training' && (
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
              engineApiRef.current?.pauseSession();
              setShowSettingsModal(false);
              setShowTrainingModal(true);
            }}
          />
        )}

        {/* Single-Line Compact Call of Duty Top-Center Team Round Scoreboard HUD (1v1 / 2v2 Round Mode) */}
        {playMode !== 'training' && onlineRoom && isRoundBasedMode(onlineRoom.mode) && (
          <div
            id="hud-cod-round-bar"
            data-testid="hud-cod-round-bar"
            className="hud-cod-round-bar"
            dir="rtl"
          >
            {/* Team Alpha Score */}
            <div className="cod-team-chip alpha">
              <span
                className="cod-team-dot"
                style={{ background: getTeamColor('alpha'), boxShadow: '0 0 6px #38bdf8' }}
              />
              <span className="cod-team-label cod-label-full" style={{ color: '#bae6fd' }}>
                {getTeamNameFa('alpha')}
              </span>
              <span className="cod-team-label cod-label-short" style={{ color: '#bae6fd' }}>
                آلفا
              </span>
              <strong className="cod-team-score" data-testid="hud-alpha-score" style={{ color: '#38bdf8' }}>
                {onlineRoom.alphaScore ?? 0}
              </strong>
            </div>

            {/* Single-line Round Counter & Countdown Clock */}
            <div className="cod-center-meta">
              <span className="cod-round-tag" data-testid="hud-round-number">
                راند {onlineRoom.currentRound ?? 1}/{onlineRoom.targetWinRounds ?? ROUND_MATCH_WIN_SCORE}
              </span>
              <span style={{ color: 'rgba(148,163,184,0.6)' }}>·</span>
              <span
                className="cod-round-clock"
                data-testid="hud-round-timer"
                style={{
                  color:
                    (onlineRoom.roundTimeRemainingSec ?? 90) <= 15
                      ? '#f43f5e'
                      : onlineRoom.roundPhase === 'intermission'
                        ? '#ffbe0b'
                        : '#00f0ff',
                }}
              >
                {onlineRoom.roundPhase === 'match_over'
                  ? `برنده: ${getTeamNameFa(onlineRoom.matchWinnerTeam ?? 'alpha')}`
                  : onlineRoom.roundPhase === 'intermission'
                    ? 'راند بعد...'
                    : formatRoundClock(onlineRoom.roundTimeRemainingSec ?? 90)}
              </span>
            </div>

            {/* Team Bravo Score */}
            <div className="cod-team-chip bravo">
              <strong className="cod-team-score" data-testid="hud-bravo-score" style={{ color: '#f43f5e' }}>
                {onlineRoom.bravoScore ?? 0}
              </strong>
              <span className="cod-team-label cod-label-full" style={{ color: '#fecdd3' }}>
                {getTeamNameFa('bravo')}
              </span>
              <span className="cod-team-label cod-label-short" style={{ color: '#fecdd3' }}>
                براوو
              </span>
              <span
                className="cod-team-dot"
                style={{ background: getTeamColor('bravo'), boxShadow: '0 0 6px #f43f5e' }}
              />
            </div>
          </div>
        )}

        <div id="kill-feed" dir="rtl" />

        {/* Crosshair */}
        <div id="crosshair">
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
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </svg>

        <div id="reload-indicator">
          <span dir="rtl">در حال تعویض خشاب...</span>
          <div className="reload-bar-bg">
            <div id="reload-bar-fill" />
          </div>
        </div>

        <div id="center-alert" dir="rtl">
          <div className="title" id="center-alert-text" />
        </div>

        {/* Bottom Status & 3-Weapon Tactical Loadout Switcher */}
        <div className="hud-bottom-center">
          <div id="buff-strip" />

          <div className="status-strip">
            <div className="vitals-col">
              <div className="bar-row">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#00e676">
                  <path d="M19 10h-5V5a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v5H5a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h5v5a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-5h5a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1z" />
                </svg>
                <div className="bar-outer">
                  <div id="hp-bar-inner" />
                </div>
                <span className="bar-val" id="hp-text">
                  100
                </span>
              </div>
              <div className="bar-row">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#38bdf8">
                  <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" />
                </svg>
                <div className="bar-outer">
                  <div id="armor-bar-inner" />
                </div>
                <span className="bar-val" id="armor-text" style={{ color: '#38bdf8' }}>
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
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    if (isAllowed) {
                      engineApiRef.current?.selectWeapon(slot.weaponIdx);
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.currentTarget.blur();
                    if (isAllowed) {
                      engineApiRef.current?.selectWeapon(slot.weaponIdx);
                    }
                  }}
                >
                  {/* Top Row: Key Tag + Dynamic Health Status Icon */}
                  <div className="wslot-top-row">
                    <span className="wslot-key-tag">{slot.keyLabel}</span>
                    <span
                      id={`wslot-hp-badge-${slot.weaponIdx}`}
                      data-testid={`wslot-hp-badge-${slot.keyLabel}`}
                      className="wslot-hp-badge"
                      style={{ color: initialTel.healthColor }}
                      title="وضعیت سلامت اپراتور"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                      <span id={`wslot-hp-text-${slot.weaponIdx}`}>{initialTel.healthLabel}</span>
                    </span>
                  </div>

                  {/* Middle Row: Weapon SVG Illustration + Dynamic Ammo Status Icon */}
                  <div className="wslot-mid-row">
                    <div className="wslot-gun-svg">{renderWeaponIconSvg(slot.meta.id)}</div>
                    <span
                      id={`wslot-ammo-badge-${slot.weaponIdx}`}
                      data-testid={`wslot-ammo-badge-${slot.keyLabel}`}
                      className="wslot-ammo-badge"
                      style={{ color: initialTel.ammoColor }}
                      title="وضعیت مهمات سلاح"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M7 2h10l2 5v15H5V7l2-5zm2 6v11h6V8H9z" />
                      </svg>
                      <span id={`wslot-ammo-text-${slot.weaponIdx}`}>{initialTel.ammoLabel}</span>
                    </span>
                  </div>

                  {/* Bottom Row: Live Ammo Capacity Bar */}
                  <div className="wslot-ammo-bar-track">
                    <div
                      id={`wslot-ammo-bar-${slot.weaponIdx}`}
                      className="wslot-ammo-bar-fill"
                      style={{
                        width: `${initialTel.ammoPct}%`,
                        backgroundColor: initialTel.ammoColor,
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
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
        </button>

        <button
          id="btn-power"
          data-testid="touch-control-power"
          type="button"
          className="t-btn"
          aria-label="Activate Adrenaline Power"
          onTouchStart={(e) => e.stopPropagation()}
          onPointerDown={(e) => {
            e.stopPropagation();
            engineApiRef.current?.activateAdrenaline();
          }}
          onClick={(e) => e.stopPropagation()}
          style={{
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
          </svg>
          <span id="power-cd-text">آماده</span>
        </button>

        <button
          id="btn-swap-weapon"
          data-testid="touch-control-swap"
          type="button"
          className="t-btn"
          aria-label="Switch Next Weapon"
          title="تعویض سریع سلاح (C)"
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M16 3l4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16" />
          </svg>
          <span>گان بعدی</span>
        </button>

        <button
          id="btn-lean"
          data-testid="touch-control-lean"
          type="button"
          className="t-btn"
          aria-label="Corner Lean Mount"
          title="کج کردن تفنگ کنار دیوار (V)"
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
            left: `${customControlLayout.lean.xPct}%`,
            top: `${customControlLayout.lean.yPct}%`,
            right: 'auto',
            bottom: 'auto',
            width: `${CONTROL_SLOT_META.lean.baseSizePx}px`,
            height: `${CONTROL_SLOT_META.lean.baseSizePx}px`,
            transform: `translate(-50%, -50%) scale(${customControlLayout.lean.scale * hudScale})`,
            opacity: customControlLayout.lean.opacity * hudOpacity,
            borderColor: 'rgba(255, 190, 11, 0.5)',
            color: '#ffbe0b',
            fontSize: '8.5px',
            flexDirection: 'column',
            gap: '1px',
            zIndex: 15,
          }}
        >
          <span>LEAN</span>
          <span>زاویه</span>
        </button>
      </div>

      {/* Draggable HUD Voice Chat Microphone Button (Desktop & Mobile, Online Rooms Only) */}
      {screenState === 'playing' && Boolean(onlineRoom) && !showLayoutEditor && (
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
            opacity: customControlLayout.voice.opacity * hudOpacity,
            touchAction: 'none',
            zIndex: 16,
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0" />
            <line x1="12" y1="18" x2="12" y2="21" />
            <line x1="9" y1="21" x2="15" y2="21" />
            {!voiceState.transmitting && <line x1="4" y1="4" x2="20" y2="20" strokeWidth="2.4" />}
          </svg>
          <span className="voice-mic-label">
            {voiceState.micStatus === 'requesting'
              ? '...'
              : voiceState.transmitting
                ? 'LIVE'
                : voiceState.mode === 'ptt'
                  ? 'PTT'
                  : voiceState.micStatus === 'error'
                    ? 'ERR'
                    : 'MIC'}
          </span>
        </button>
      )}

      {/* Title Screen */}
      {screenState === 'title' && !showTrainingModal && !showSettingsModal && !showOnlineModal && (
        <div id="start-screen" className="overlay-screen">
          <div
            data-testid="app-version-badge"
            dir="rtl"
            style={{
              position: 'fixed',
              left: 'max(14px, env(safe-area-inset-left))',
              bottom: 'max(12px, env(safe-area-inset-bottom))',
              zIndex: 30,
              background: 'rgba(8, 13, 24, 0.9)',
              border: '1px solid rgba(56, 189, 248, 0.38)',
              borderRadius: '8px',
              padding: '5px 10px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#cbd5e1',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.45)',
              pointerEvents: 'none',
            }}
          >
            <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: 900 }}>{APP_VERSION}</span>
            <span style={{ color: '#475569' }}>·</span>
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>بیلد: {BUILD_DATE}</span>
          </div>
          <div className="panel-card">
            {/* Custom Inline SVG Title Emblem */}
            <div className="title-emblem-wrap">
              <svg width="52" height="52" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                <rect x="6" y="12" width="52" height="40" rx="10" fill="#101826" stroke="#00f0ff" strokeWidth="2" />
                <circle cx="32" cy="32" r="13" fill="#060a10" stroke="#eef5ff" strokeWidth="2" />
                <circle cx="32" cy="32" r="5" fill="#00f0ff" />
                <rect x="46" y="18" width="6" height="6" rx="1" fill="#ff2e4c" />
                <path d="M14 20h6M14 44h6" stroke="#8fa7c4" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>

            <h1 className="game-logo">
              BODY<span>CAM</span> · VANGUARD
            </h1>
            <div className="game-subtitle" dir="rtl">
              شوتر تاکتیکی بادیکم — انتخاب ۳ سلاح هم‌زمان، اسنایپر دوربین‌دار AWM، ۳ نقشه کامل و لابی آنلاین با رمز
            </div>

            <div className="summary-meta-line" dir="rtl">
              <span>
                نقشه: <b style={{ color: currentMapMeta.accentColor }}>{currentMapMeta.nameFa}</b>
              </span>
              <span>·</span>
              <span>
                گرافیک: <b>{presetLabel}</b>
              </span>
              <span>·</span>
              <span>
                ایم‌اسیست:{' '}
                <b>{cheatConfig.aimAssistEnabled ? `${cheatConfig.aimAssistStrength}%` : 'خاموش'}</b>
              </span>
              <span>·</span>
              <span>
                FPS: <b>{fpsLabel}</b>
              </span>
            </div>

            {/* 3 Selectable Maps Showcase on Title Screen */}
            <div
              className="training-weapons-grid"
              dir="rtl"
              style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '10px' }}
            >
              {MAP_LIST.map((m) => {
                const active = currentMap === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    data-testid={`title-map-${m.id}`}
                    className={`training-weapon-card ${active ? 'selected' : ''}`}
                    onClick={() => engineApiRef.current?.setMap(m.id)}
                    style={{
                      borderColor: active ? m.accentColor : undefined,
                      textAlign: 'right',
                      alignItems: 'flex-start',
                      padding: '8px 9px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 800,
                        background: active ? m.accentColor : 'rgba(255,255,255,0.08)',
                        color: active ? '#041019' : '#8fa7c4',
                        padding: '1px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      {m.badgeFa}
                    </span>
                    <strong style={{ color: active ? m.accentColor : '#eef5ff', fontSize: '11px' }}>
                      {m.nameFa}
                    </strong>
                    <small style={{ fontSize: '9.5px', lineHeight: 1.3 }}>{m.subtitleFa}</small>
                  </button>
                );
              })}
            </div>

            {/* 3-Weapon Loadout Picker on Title Screen (Pick 3 of 10 Weapons) */}
            <div className="loadout-section-box" dir="rtl">
              <div className="loadout-header-row">
                <span className="loadout-title">انتخاب ۳ سلاح همراه از ۱۰ سلاح تاکتیکی (Loadout 3/10)</span>
                <span className="loadout-badge">
                  {loadout.map((id) => WEAPON_CATALOG.find((w) => w.id === id)?.nameEn).join(' · ')}
                </span>
              </div>
              <div className="arsenal-grid">
                {WEAPON_CATALOG.map((w) => {
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

            <button
              id="btn-start-game"
              type="button"
              className="primary-btn"
              dir="rtl"
              data-start="true"
              onClick={() => engineApiRef.current?.startSession('campaign')}
            >
              شروع عملیات اصلی ({currentMapMeta.nameFa})
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
              <button
                id="btn-open-online"
                type="button"
                className="training-cta-btn"
                style={{
                  marginTop: 0,
                  borderColor: 'rgba(56, 189, 248, 0.55)',
                  background: 'rgba(56, 189, 248, 0.14)',
                  color: '#7dd3fc',
                }}
                dir="rtl"
                onClick={() => {
                  setShowOnlineModal(true);
                }}
              >
                بازی آنلاین (لینک مستقیم کروم + رمز اتاق)
              </button>

              <button
                id="btn-open-training"
                type="button"
                className="training-cta-btn"
                style={{ marginTop: 0 }}
                dir="rtl"
                onClick={() => setShowTrainingModal(true)}
              >
                بخش تمرین و آموزش (Training)
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', marginTop: '8px' }}>
              <button
                id="btn-start-settings"
                type="button"
                className="secondary-btn"
                style={{ marginTop: 0 }}
                dir="rtl"
                onClick={() => setShowSettingsModal(true)}
              >
                تنظیمات گرافیک، حساسیت، سلاح‌ها و نقشه‌ها
              </button>
              <button
                id="btn-title-fullscreen"
                data-testid="btn-title-fullscreen"
                type="button"
                className="secondary-btn"
                style={{
                  marginTop: 0,
                  borderColor: 'rgba(0, 240, 255, 0.45)',
                  color: '#7dd3fc',
                }}
                dir="rtl"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? 'خروج از تمام صفحه' : 'تمام صفحه (Fullscreen)'}
              </button>
            </div>

            <div className="controls-inline-hint" dir="rtl">
              کلیدهای 1 تا 3 یا C تعویض ۳ سلاح انتخابی · زاویه هوشمند حساس کنار دیوار یا V/Z/X · اسنایپر با زوم 8X
            </div>
          </div>
        </div>
      )}

      {/* Online Multiplayer Lobby Modal */}
      {showOnlineModal && (
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
          onSelectMap={(m) => engineApiRef.current?.setMap(m)}
          onCreateRoom={(mapId, mode, password) => engineApiRef.current?.createOnlineRoom(mapId, mode, password)}
          onChangeGameMode={(mode) => engineApiRef.current?.changeOnlineGameMode(mode)}
          onSwitchTeam={(pid) => engineApiRef.current?.switchOnlineTeam(pid)}
          onJoinRoom={(code, password) => engineApiRef.current?.joinOnlineRoom(code, password)}
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
          voiceState={voiceState}
          localPlayerId={localOnlinePlayerId}
          onToggleMutePlayer={(pid) => engineApiRef.current?.toggleMuteVoicePlayer(pid)}
          onClose={() => {
            setShowOnlineModal(false);
            if (screenState === 'paused') {
              engineApiRef.current?.resumeSession();
            }
          }}
        />
      )}

      {/* Training Mode Configurator Modal */}
      {showTrainingModal && (
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
          onClose={() => {
            setShowTrainingModal(false);
            if (screenState === 'paused') {
              engineApiRef.current?.resumeSession();
            }
          }}
        />
      )}

      {/* Minimalist 4-Tab Settings & Pause Modal */}
      {showSettingsModal && (
        <div id="settings-screen" className="overlay-screen" role="dialog" aria-modal="true" aria-label="Game Settings">
          <div className="panel-card settings-minimal-card">
            <div className="game-logo" style={{ fontSize: '19px', textAlign: 'center' }} dir="rtl">
              تنظیمات مینیمال عملیات · BODY<span>CAM</span>
            </div>
            {screenState === 'paused' && onlineRoom && (
              <div className="pause-room-bar" data-testid="pause-room-bar" dir="rtl" style={{ marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#94a3b8', fontWeight: 700 }}>کد اتاق:</span>
                  <strong style={{ color: '#38bdf8', fontFamily: 'monospace', fontSize: '13px' }}>
                    {onlineRoom.code}
                  </strong>
                  <span style={{ color: '#cbd5e1' }}>({onlineRoom.players.length} نفر)</span>
                </div>
                <button
                  type="button"
                  className="hud-copy-btn"
                  data-testid="pause-copy-room-btn"
                  onClick={() => {
                    const url = buildRoomInviteUrl(
                      getCurrentOriginShareBaseUrl(window.location.origin, window.location.pathname),
                      onlineRoom.code,
                      onlineRoom.mapId
                    );
                    navigator.clipboard?.writeText(url).catch(() => {});
                    setHudRoomCopied(true);
                    window.setTimeout(() => setHudRoomCopied(false), 1600);
                  }}
                >
                  {hudRoomCopied ? 'کپی شد!' : 'کپی لینک اتاق'}
                </button>
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
                    <option value="promax">Ultra Max Pro Max (ویژه بالاترین رده گوشی‌ها)</option>
                    <option value="ultramax">Ultra Max (رزولوشن و سایه فوق‌العاده)</option>
                    <option value="ultra">Ultra (اولترا)</option>
                    <option value="high">High (کیفیت بالا)</option>
                    <option value="med">Medium (متوسط)</option>
                    <option value="low">Low (سبک)</option>
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
                    شدت رنگ و شفافیت HDR: <b style={{ color: '#ffbe0b' }}>{Math.round(gfxState.vibrance * 100)}%</b>
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
                    {MAP_LIST.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nameFa} — {m.subtitleFa}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="loadout-section-box" dir="rtl" style={{ marginTop: '8px', marginBottom: '6px' }}>
                  <div className="loadout-header-row">
                    <span className="loadout-title">انتخاب ۳ سلاح همراه از ۱۰ سلاح (Loadout 3/10):</span>
                    <span className="loadout-badge">
                      {loadout.map((id) => WEAPON_CATALOG.find((w) => w.id === id)?.nameEn).join(' · ')}
                    </span>
                  </div>
                  <div className="arsenal-grid">
                    {WEAPON_CATALOG.map((w) => {
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
              </div>
            )}

            {/* TAB 3: CONTROLS, HIGH SENSITIVITY & SMART BOTS */}
            {settingsTab === 'controls' && (
              <div data-testid="settings-panel-controls">
                <div className="setting-row" dir="rtl">
                  <label htmlFor="opt-sens">
                    حساسیت چرخش دوربین (Sensitivity): <b style={{ color: '#00f0ff' }}>{Math.round(sensitivity * 100)}%</b>
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

                <div className="setting-row" dir="rtl">
                  <label>ویرایش آزاد چیدمان کنترل‌ها (جابه‌جایی، اندازه و شفافیت)</label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      data-testid="btn-open-layout-editor"
                      className="preset-chip"
                      style={{
                        borderColor: 'rgba(0, 240, 255, 0.65)',
                        background: 'rgba(0, 240, 255, 0.16)',
                        color: '#7dd3fc',
                        fontWeight: 800,
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
                        borderColor: 'rgba(245, 158, 11, 0.55)',
                        background: 'rgba(245, 158, 11, 0.14)',
                        color: '#fcd34d',
                        fontWeight: 800,
                      }}
                      onClick={() => handleResetCustomControlLayout()}
                    >
                      بازگشت به پیش‌فرض
                    </button>
                  </div>
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
                    اندازه کلی دکمه‌ها و جوی‌استیک: <b style={{ color: '#00f0ff' }}>{Math.round(hudScale * 100)}%</b>
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

                {/* Online Voice Chat Settings */}
                <div
                  data-testid="settings-voice-section"
                  style={{
                    marginTop: '12px',
                    paddingTop: '10px',
                    borderTop: '1px solid rgba(16, 185, 129, 0.28)',
                  }}
                  dir="rtl"
                >
                  <div className="settings-section-title" style={{ marginTop: 0, color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.28)' }}>
                    <span>چت صوتی آنلاین (Voice Chat · WebRTC)</span>
                    <span style={{ fontSize: '10px', color: voiceState.secureContextOk ? '#6ee7b7' : '#fda4af' }}>
                      {voiceState.secureContextOk ? 'HTTPS آماده' : 'نیازمند HTTPS'}
                    </span>
                  </div>

                  <div className="setting-row" dir="rtl">
                    <label htmlFor="opt-voice-mode">
                      حالت میکروفون (Voice Mode)
                      <span style={{ display: 'block', fontSize: '9.5px', color: '#94a3b8' }}>
                        فشار برای صحبت: نگه داشتن کلید V (دسکتاپ) یا نگه داشتن دکمه MIC (موبایل)
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
                      <b style={{ color: '#34d399' }}>{Math.round(voiceState.volume * 100)}%</b>
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
                        <b style={{ color: '#00e676' }}>{cheatConfig.aimAssistStrength}%</b>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
              <button
                id="btn-toggle-fullscreen"
                data-testid="btn-toggle-fullscreen"
                type="button"
                className="secondary-btn"
                style={{
                  marginTop: 0,
                  borderColor: 'rgba(0, 240, 255, 0.5)',
                  background: 'rgba(0, 240, 255, 0.12)',
                  color: '#7dd3fc',
                }}
                dir="rtl"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? 'خروج از حالت تمام صفحه' : 'حالت تمام صفحه (Fullscreen)'}
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
                    className="training-cta-btn"
                    style={{
                      marginTop: 0,
                      borderColor: 'rgba(56, 189, 248, 0.55)',
                      background: 'rgba(56, 189, 248, 0.14)',
                      color: '#7dd3fc',
                    }}
                    dir="rtl"
                    onClick={() => {
                      setShowSettingsModal(false);
                      setShowOnlineModal(true);
                    }}
                  >
                    لابی آنلاین
                  </button>
                  <button
                    type="button"
                    className="training-cta-btn"
                    style={{ marginTop: 0 }}
                    dir="rtl"
                    onClick={() => {
                      setShowSettingsModal(false);
                      setShowTrainingModal(true);
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
      )}

      {/* Game Over Screen */}
      {screenState === 'gameover' && (
        <div id="gameover-screen" className="overlay-screen" role="dialog" aria-modal="true" aria-label="Game Over">
          <div className="panel-card">
            <div className="game-logo" style={{ color: '#ff3355' }} dir="rtl">
              قطع ارتباط دوربین · سقوط
            </div>
            <div className="game-subtitle" dir="rtl">
              اپراتور در درگیری از پای درآمد
            </div>

            <div className="stats-grid">
              <div className="stat-box">
                <div className="n" id="go-score">
                  {gameOverStats.score}
                </div>
                <div className="l" dir="rtl">
                  امتیاز کل
                </div>
              </div>
              <div className="stat-box">
                <div className="n" id="go-kills">
                  {gameOverStats.kills}
                </div>
                <div className="l" dir="rtl">
                  دشمن حذفشده
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
              عملیات جدید
            </button>
            <button
              type="button"
              className="training-cta-btn"
              dir="rtl"
              onClick={() => {
                setShowTrainingModal(true);
              }}
            >
              ورود به میدان تمرین و آموزش
            </button>
          </div>
        </div>
      )}

      {showLayoutEditor && (
        <ControlsLayoutEditor
          initialLayout={customControlLayout}
          activePreset={hudLayout}
          onSave={handleSaveCustomControlLayout}
          onResetDefault={(defaults) => handleResetCustomControlLayout(defaults)}
          onClose={() => setShowLayoutEditor(false)}
        />
      )}
    </>
  );
}
