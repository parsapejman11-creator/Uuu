import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type {
  BotDifficultyPreset,
  CheatConfig,
  HudLayoutPreset,
  MapId,
  PeerConnectionStatus,
  PeerRole,
  WeaponId,
} from '../game/rules';
import type { CrosshairStyle } from '../game/controlLayout';
import type { VoiceChannelScope, VoiceChatSnapshot, VoiceMode } from '../game/voiceChat';
import type { OnlineRoomSummary } from '../components/OnlineModal';
import type { CosmeticsState } from '../game/cosmetics';
import type { RedeemRewardId } from '../game/redeem';
import type { SkinFxMode, ViewDistanceMode } from '../game/perf';
import type {
  AppUiVersionId,
  HudControlsStyle,
  HudSnapshotV3,
  LiquidGlassResolution,
  UiV3GfxPresetName,
  UiV3Preferences,
  UiV3ScreenState,
} from './uiV3Store';
import { GlassToast } from './primitives';

export interface UiV3GfxSnapshot {
  preset: UiV3GfxPresetName;
  resScale: number;
  vibrance: number;
  shadowMode: 'ultra' | 'soft' | 'basic' | 'off';
  targetFps: number;
  bodycamFx: boolean;
  flashlightOn: boolean;
}

/**
 * Strongly-typed read-only state snapshot exposed to all UI v3 components.
 * Zero game logic lives inside UI components; all state flows cleanly from this boundary.
 */
export interface UiV3StateSnapshot {
  appVersion: string;
  buildDate: string;
  screenState: UiV3ScreenState;
  playMode: 'campaign' | 'training';
  isOgMode: boolean;
  ogEnabled: boolean;
  isFullscreen: boolean;
  presetLabel: string;
  fpsLabel: string;
  /** Static JPEG dataURL of the last rendered WebGL frame captured right before pausing scene */
  menuBackdropSnapshotUrl: string | null;
  /** Resolved adaptive Liquid Glass capability & fallback mode */
  glassResolution: LiquidGlassResolution;

  /** UI mode & Liquid Glass preferences */
  preferredUi: AppUiVersionId;
  activeUi: AppUiVersionId;
  pendingUiSwitchNotice: string | null;
  uiV3Prefs: UiV3Preferences;
  autoTransparencyOverridden: boolean;

  /** Map & 3-Weapon Loadout */
  currentMap: MapId;
  loadout: WeaponId[];
  renderWeaponIconSvg: (id: WeaponId) => React.ReactNode;

  /** Graphics & Performance */
  gfxState: UiV3GfxSnapshot;
  autoQuality: boolean;
  batterySaver: boolean;
  lowDataMode: boolean;
  viewDistanceMode: ViewDistanceMode;
  showFpsHud: boolean;
  showPerfProfiler: boolean;
  skinFxMode: SkinFxMode;
  showAdBillboards: boolean;

  /** Controls & HUD */
  sensitivity: number;
  adsSensitivity: number;
  hudLayout: HudLayoutPreset;
  hudScale: number;
  hudOpacity: number;
  crosshairSize: number;
  crosshairStyle: CrosshairStyle;
  showLeanHudButtons: boolean;
  botDifficulty: BotDifficultyPreset;
  aimAssistStrength: number;
  autoReloadEnabled: boolean;
  vibrationEnabled: boolean;
  touchSetting: 'auto' | 'on' | 'off';
  slideAlphaEnabled: boolean;
  cameraMotionIntensity: number;
  reducedMotion: boolean;

  /** Audio & Voice */
  soundEnabled: boolean;
  footstepVolume: number;
  voiceState: VoiceChatSnapshot;

  /** Online */
  onlinePlayerName: string;
  onlineRoom: OnlineRoomSummary | null;
  peerStatus: PeerConnectionStatus;
  peerRole: PeerRole;
  onlineRoomError: string | null;
  localOnlinePlayerId: string;
  showPingHud: boolean;

  /** Cheats & Locked Aim Assist */
  cheatConfig: CheatConfig;
  cheatUnlocked: boolean;
  cheatUnlockRemainingSec: number;
  cheatPasswordInput: string;
  cheatPassError: string | null;

  /** Cosmetics & Redeem */
  cosmeticsState: CosmeticsState;
}

/**
 * Strongly-typed action union dispatched from UI v3 components back to the host engine/controller.
 */
export type UiV3Action =
  | { type: 'START_OFFLINE' }
  | { type: 'RESUME_SESSION' }
  | { type: 'RESTART_SESSION' }
  | { type: 'RETURN_TO_TITLE' }
  | { type: 'OPEN_ONLINE' }
  | { type: 'OPEN_TRAINING' }
  | { type: 'OPEN_SPIN' }
  | { type: 'OPEN_SKINS' }
  | { type: 'OPEN_SETTINGS' }
  | { type: 'CLOSE_SETTINGS' }
  | { type: 'OPEN_LAYOUT_EDITOR' }
  | { type: 'RESET_CONTROL_LAYOUT' }
  | { type: 'OPEN_OG_INTRO' }
  | { type: 'EXIT_OG_MODE' }
  | { type: 'TOGGLE_FULLSCREEN' }
  | { type: 'SELECT_UI_MODE'; mode: AppUiVersionId }
  | { type: 'SET_REDUCE_TRANSPARENCY'; enabled: boolean }
  | { type: 'SET_AUTO_TRANSPARENCY_OVERRIDE'; overridden: boolean }
  | { type: 'SET_UI_CLICK_SOUND'; enabled: boolean }
  | { type: 'SET_UI_HAPTICS'; enabled: boolean }
  | { type: 'SET_MINIMAL_HUD'; enabled: boolean }
  | { type: 'SET_CONTROLS_STYLE'; style: HudControlsStyle }
  | { type: 'SELECT_MAP'; mapId: MapId }
  | { type: 'TOGGLE_LOADOUT_WEAPON'; weaponId: WeaponId }
  | { type: 'RESET_LOADOUT' }
  | { type: 'APPLY_GFX_PRESET'; preset: UiV3GfxPresetName }
  | { type: 'UPDATE_GFX'; partial: Partial<UiV3GfxSnapshot> }
  | { type: 'SET_AUTO_QUALITY'; enabled: boolean }
  | { type: 'SET_BATTERY_SAVER'; enabled: boolean }
  | { type: 'SET_LOW_DATA_MODE'; enabled: boolean }
  | { type: 'SET_VIEW_DISTANCE_MODE'; mode: ViewDistanceMode }
  | { type: 'SET_SHOW_FPS_HUD'; enabled: boolean }
  | { type: 'SET_SHOW_PERF_PROFILER'; enabled: boolean }
  | { type: 'SET_SKIN_FX_MODE'; mode: SkinFxMode }
  | { type: 'SET_SHOW_AD_BILLBOARDS'; enabled: boolean }
  | { type: 'SET_SENSITIVITY'; value: number }
  | { type: 'SET_ADS_SENSITIVITY'; value: number }
  | { type: 'SET_HUD_LAYOUT'; preset: HudLayoutPreset }
  | { type: 'SET_HUD_SCALE'; value: number }
  | { type: 'SET_HUD_OPACITY'; value: number }
  | { type: 'SET_CROSSHAIR_SIZE'; value: number }
  | { type: 'SET_CROSSHAIR_STYLE'; style: CrosshairStyle }
  | { type: 'SET_SHOW_LEAN_BUTTONS'; enabled: boolean }
  | { type: 'SET_BOT_DIFFICULTY'; difficulty: BotDifficultyPreset }
  | { type: 'SET_AIM_ASSIST_STRENGTH'; value: number }
  | { type: 'SET_AUTO_RELOAD'; enabled: boolean }
  | { type: 'SET_VIBRATION'; enabled: boolean }
  | { type: 'SET_TOUCH_SETTING'; mode: 'auto' | 'on' | 'off' }
  | { type: 'SET_SLIDE_ALPHA'; enabled: boolean }
  | { type: 'SET_CAMERA_MOTION_INTENSITY'; value: number }
  | { type: 'SET_REDUCED_MOTION'; enabled: boolean }
  | { type: 'SET_SOUND_ENABLED'; enabled: boolean }
  | { type: 'SET_FOOTSTEP_VOLUME'; value: number }
  | { type: 'SET_VOICE_MODE'; mode: VoiceMode }
  | { type: 'SET_VOICE_VOLUME'; value: number }
  | { type: 'SET_VOICE_CHANNEL_SCOPE'; scope: VoiceChannelScope }
  | { type: 'TOGGLE_MUTE_VOICE_PLAYER'; playerId: string }
  | { type: 'SET_ONLINE_PLAYER_NAME'; name: string }
  | { type: 'SET_SHOW_PING_HUD'; enabled: boolean }
  | { type: 'SET_CHEAT_PASSWORD_INPUT'; value: string }
  | { type: 'SET_CHEAT_PASS_ERROR'; message: string | null }
  | { type: 'UNLOCK_CHEATS' }
  | { type: 'RELOCK_CHEATS' }
  | { type: 'UPDATE_CHEATS'; partial: Partial<CheatConfig> }
  | { type: 'RESET_ALL_SETTINGS' }
  | { type: 'UNLOCK_REDEEM_REWARD'; rewardId: RedeemRewardId }
  | { type: 'EQUIP_REDEEM_REWARD'; rewardId: RedeemRewardId }
  | { type: 'FEEDBACK'; kind: 'tap' | 'toggle' | 'confirm' | 'cancel' }
  | { type: 'PLAY_REDEEM_SFX'; sfx: string; arg?: unknown };

export interface UiV3ContextValue {
  state: UiV3StateSnapshot;
  /** Referentially stable dispatcher — safe to pass into memoized children without triggering re-renders */
  dispatch: (action: UiV3Action) => void;
  showToast: (message: string, tone?: 'info' | 'success' | 'warn') => void;
}

const UiV3Context = createContext<UiV3ContextValue | null>(null);
const HudSnapshotV3Context = createContext<HudSnapshotV3 | null>(null);

export interface UiV3ProviderProps {
  state: UiV3StateSnapshot;
  hudSnapshot: HudSnapshotV3 | null;
  onAction: (action: UiV3Action) => void;
  children: React.ReactNode;
}

export const UiV3Provider: React.FC<UiV3ProviderProps> = ({
  state,
  hudSnapshot,
  onAction,
  children,
}) => {
  // Ref-backed handler keeps `dispatch` identity 100% stable across renders (prevents callback churn)
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;

  const dispatch = useCallback((action: UiV3Action) => {
    onActionRef.current(action);
  }, []);

  const [toast, setToast] = useState<{ message: string; tone: 'info' | 'success' | 'warn' } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((message: string, tone: 'info' | 'success' | 'warn' = 'info') => {
    setToast({ message, tone });
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 2200);
  }, []);

  React.useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    };
  }, []);

  const ctxValue = useMemo<UiV3ContextValue>(
    () => ({ state, dispatch, showToast }),
    [state, dispatch, showToast]
  );

  return (
    <UiV3Context.Provider value={ctxValue}>
      <HudSnapshotV3Context.Provider value={hudSnapshot}>
        {children}
        <GlassToast message={toast?.message ?? null} tone={toast?.tone ?? 'info'} />
      </HudSnapshotV3Context.Provider>
    </UiV3Context.Provider>
  );
};

export function useUiV3(): UiV3ContextValue {
  const ctx = useContext(UiV3Context);
  if (!ctx) {
    throw new Error('useUiV3 must be used within UiV3Provider');
  }
  return ctx;
}

export function useHudSnapshotV3(): HudSnapshotV3 | null {
  return useContext(HudSnapshotV3Context);
}
