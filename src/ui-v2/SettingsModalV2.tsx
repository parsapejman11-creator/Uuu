import React, { useState } from 'react';
import {
  CHEAT_UNLOCK_DURATION_SEC,
  DEFAULT_LOADOUT,
  MAP_LIST,
  SLIDE_COOLDOWN_SEC,
  WEAPON_CATALOG,
  buildRoomInviteUrl,
  formatConnectionStatusFa,
  getCurrentOriginShareBaseUrl,
  verifyCheatPasscode,
  type BotDifficultyPreset,
  type CheatConfig,
  type HudLayoutPreset,
  type MapId,
  type PeerConnectionStatus,
  type PeerRole,
  type WeaponId,
} from '../game/rules';
import type { CrosshairStyle } from '../game/controlLayout';
import type { VoiceChannelScope, VoiceChatSnapshot, VoiceMode } from '../game/voiceChat';
import type { OnlineRoomSummary } from '../components/OnlineModal';
import { getCosmeticItem, type CosmeticsState } from '../game/cosmetics';
import type { RedeemRewardId } from '../game/redeem';
import { RedeemCodeSection } from '../components/RedeemCodeSection';
import { UiVersionSwitch } from './UiVersionSwitch';
import {
  getActiveQuickGraphicsTier,
  resolveQuickGraphicsPreset,
  type QuickGraphicsTier,
  type UiGfxPresetName as GfxPresetName,
  type UiPlayMode as GamePlayMode,
  type UiScreenState as GameScreenState,
  type UiV2Preferences,
  type UiVersionId,
} from './uiVersionStore';
import type { UiFeedbackKind } from './feedback';
import {
  IconClose,
  IconCpu,
  IconFullscreen,
  IconHome,
  IconLayers,
  IconOnline,
  IconPalette,
  IconPlay,
  IconReset,
  IconSettings,
  IconShield,
  IconSliders,
  IconSpark,
  IconTarget,
  IconVolume,
} from './icons';

export type SettingsV2CategoryId =
  | 'general'
  | 'controls'
  | 'graphics'
  | 'audio'
  | 'online'
  | 'skins'
  | 'appearance';

export interface SettingsV2GfxState {
  preset: GfxPresetName;
  resScale: number;
  shadowMode: 'ultra' | 'soft' | 'basic' | 'off';
  targetFps: number;
  bodycamFx: boolean;
  flashlightOn: boolean;
  vibrance: number;
}

export interface SettingsModalV2Props {
  screenState: GameScreenState;
  playMode: GamePlayMode;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onCloseOrResume: () => void;
  onRestartMatch: () => void;
  onReturnToTitle: () => void;
  onOpenOnline: () => void;
  onOpenTraining: () => void;
  onOpenSkins: () => void;
  onOpenSpin: () => void;
  onOpenLayoutEditor: () => void;
  onResetControlLayout: () => void;

  // UI v2 switch & feedback prefs
  preferredUi: UiVersionId;
  activeUi: UiVersionId;
  pendingUiSwitchNotice: string | null;
  uiPrefs: UiV2Preferences;
  onSelectUiVersion: (next: UiVersionId) => void;
  onToggleUiClickSound: (enabled: boolean) => void;
  onToggleUiHaptics: (enabled: boolean) => void;
  onFeedback: (kind: UiFeedbackKind) => void;

  // Shared game state
  currentMap: MapId;
  onSelectMap: (mapId: MapId) => void;
  loadout: WeaponId[];
  onToggleLoadoutWeapon: (weaponId: WeaponId) => void;
  onResetLoadout: () => void;
  renderWeaponIconSvg: (id: WeaponId) => React.ReactNode;

  // Graphics & Perf
  gfxState: SettingsV2GfxState;
  onApplyPreset: (preset: GfxPresetName) => void;
  onUpdateGfx: (partial: Partial<SettingsV2GfxState>) => void;
  autoQuality: boolean;
  onToggleAutoQuality: (enabled: boolean) => void;
  showFpsHud: boolean;
  onToggleShowFpsHud: (show: boolean) => void;
  showPerfProfiler: boolean;
  onTogglePerfProfiler: (show: boolean) => void;

  // Controls & Gameplay
  sensitivity: number;
  onChangeSensitivity: (val: number) => void;
  adsSensitivity: number;
  onChangeAdsSensitivity: (val: number) => void;
  hudLayout: HudLayoutPreset;
  onChangeHudLayoutPreset: (preset: HudLayoutPreset) => void;
  hudScale: number;
  onChangeHudScale: (val: number) => void;
  hudOpacity: number;
  onChangeHudOpacity: (val: number) => void;
  crosshairSize: number;
  onChangeCrosshairSize: (val: number) => void;
  crosshairStyle: CrosshairStyle;
  onChangeCrosshairStyle: (style: CrosshairStyle) => void;
  showLeanHudButtons: boolean;
  onToggleLeanHudButtons: (show: boolean) => void;
  botDifficulty: BotDifficultyPreset;
  onChangeBotDifficulty: (diff: BotDifficultyPreset) => void;
  aimAssistStrength: number;
  onChangeAimAssistStrength: (val: number) => void;
  autoReloadEnabled: boolean;
  onToggleAutoReload: (enabled: boolean) => void;
  vibrationEnabled: boolean;
  onToggleVibration: (enabled: boolean) => void;
  touchSetting: 'auto' | 'on' | 'off';
  onChangeTouchSetting: (val: 'auto' | 'on' | 'off') => void;
  slideAlphaEnabled: boolean;
  onToggleSlideAlpha: (enabled: boolean) => void;
  showAdBillboards: boolean;
  onToggleShowAdBillboards: (show: boolean) => void;
  cameraMotionIntensity: number;
  onChangeCameraMotionIntensity: (val: number) => void;
  reducedMotion: boolean;
  onToggleReducedMotion: (enabled: boolean) => void;

  // Audio & Voice
  soundEnabled: boolean;
  onToggleSoundEnabled: (enabled: boolean) => void;
  footstepVolume: number;
  onChangeFootstepVolume: (val: number) => void;
  voiceState: VoiceChatSnapshot;
  onChangeVoiceMode: (mode: VoiceMode) => void;
  onChangeVoiceVolume: (vol: number) => void;
  onChangeVoiceChannelScope: (scope: VoiceChannelScope) => void;
  onToggleMuteVoicePlayer: (playerId: string) => void;

  // Online
  onlinePlayerName: string;
  onChangeOnlinePlayerName: (name: string) => void;
  onlineRoom: OnlineRoomSummary | null;
  peerStatus: PeerConnectionStatus;
  peerRole: PeerRole;
  onlineRoomError: string | null;
  localOnlinePlayerId: string;
  showPingHud: boolean;
  onToggleShowPingHud: (show: boolean) => void;

  // Locked Aim Assist & Cheats
  cheatConfig: CheatConfig;
  cheatUnlocked: boolean;
  cheatUnlockRemainingSec: number;
  cheatPasswordInput: string;
  cheatPassError: string | null;
  onChangeCheatPasswordInput: (val: string) => void;
  onSetCheatPassError: (err: string | null) => void;
  onUnlockCheats: () => void;
  onRelockCheats: () => void;
  onUpdateCheats: (partial: Partial<CheatConfig>) => void;

  // Cosmetics & Redeem
  cosmeticsState: CosmeticsState;
  onUnlockRewardFromRedeem: (rewardId: RedeemRewardId) => void;
  onEquipRewardFromRedeem: (rewardId: RedeemRewardId) => void;
  onPlayRevealSound: (rarity?: 'legendary' | 'mythic') => void;
  onPlayFireSound: () => void;
  onPlayInfernoKillSound: (hs: boolean) => void;
  onPlayVoidShotSound: () => void;
  onPlayVoidKillSound: (hs: boolean) => void;
  onPlayVoidScopeSound: (entering: boolean) => void;
  onPlayTempestShotSound: (heat01: number) => void;
  onPlayTempestKillSound: (hs: boolean) => void;
  onPlayTempestReloadPhaseSound: (phase: 'open' | 'swap' | 'close' | 'charge') => void;
  onPlayTempestInspectSound: () => void;
  onPlayTempestEmoteSound: () => void;

  // Reset all
  onResetAllSettings: () => void;
}

const CATEGORIES: Array<{
  id: SettingsV2CategoryId;
  labelFa: string;
  icon: React.FC<{ size?: number }>;
}> = [
  { id: 'general', labelFa: 'عمومی', icon: IconSettings },
  { id: 'controls', labelFa: 'کنترل‌ها', icon: IconSliders },
  { id: 'graphics', labelFa: 'گرافیک و عملکرد', icon: IconCpu },
  { id: 'audio', labelFa: 'صدا', icon: IconVolume },
  { id: 'online', labelFa: 'آنلاین', icon: IconOnline },
  { id: 'skins', labelFa: 'اسکین‌ها و کد ردیم', icon: IconLayers },
  { id: 'appearance', labelFa: 'ظاهر', icon: IconPalette },
];

const QUICK_GFX_TIERS: Array<{ id: QuickGraphicsTier; labelFa: string; subFa: string }> = [
  { id: 'auto', labelFa: 'خودکار', subFa: 'تنظیم هوشمند FPS' },
  { id: 'low', labelFa: 'کم', subFa: 'حداکثر روانی' },
  { id: 'med', labelFa: 'متوسط', subFa: 'متعادل و بهینه' },
  { id: 'high', labelFa: 'بالا', subFa: 'شفافیت کامل' },
];

const ToggleSwitchV2: React.FC<{
  id?: string;
  testId?: string;
  checked: boolean;
  label: string;
  onChange: (next: boolean) => void;
}> = ({ id, testId, checked, label, onChange }) => (
  <button
    id={id}
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    data-testid={testId}
    className={`uiv2-toggle ${checked ? 'is-on' : ''}`}
    onClick={() => onChange(!checked)}
  >
    <span className="uiv2-toggle-knob" />
  </button>
);

export const SettingsModalV2: React.FC<SettingsModalV2Props> = (props) => {
  const [activeCategory, setActiveCategory] = useState<SettingsV2CategoryId>('general');
  const [copiedRoom, setCopiedRoom] = useState(false);
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  const [cheatsExpanded, setCheatsExpanded] = useState(false);

  const isPaused = props.screenState === 'paused';
  const activeQuickTier = getActiveQuickGraphicsTier(props.gfxState.preset, props.autoQuality);

  const handleQuickGraphics = (tier: QuickGraphicsTier) => {
    props.onFeedback('toggle');
    const resolved = resolveQuickGraphicsPreset(tier);
    props.onApplyPreset(resolved.preset);
    props.onToggleAutoQuality(resolved.autoQuality);
  };

  const handleResetCurrentSection = () => {
    props.onFeedback('back');
    if (activeCategory === 'general') {
      props.onSelectMap('warehouse');
      props.onResetLoadout();
      props.onChangeBotDifficulty('medium');
      props.onToggleAutoReload(true);
      props.onToggleShowAdBillboards(true);
    } else if (activeCategory === 'controls') {
      props.onChangeSensitivity(2.65);
      props.onChangeAdsSensitivity(1.35);
      props.onChangeAimAssistStrength(70);
      props.onChangeHudLayoutPreset('standard');
      props.onResetControlLayout();
      props.onChangeHudScale(1.0);
      props.onChangeHudOpacity(0.95);
      props.onChangeCrosshairSize(1.0);
      props.onChangeCrosshairStyle('cross');
      props.onToggleLeanHudButtons(false);
      props.onToggleSlideAlpha(true);
      props.onToggleVibration(true);
      props.onChangeTouchSetting('auto');
      props.onChangeCameraMotionIntensity(65);
    } else if (activeCategory === 'graphics') {
      props.onApplyPreset('high');
      props.onToggleAutoQuality(true);
      props.onToggleShowFpsHud(false);
      props.onTogglePerfProfiler(false);
    } else if (activeCategory === 'audio') {
      props.onToggleSoundEnabled(true);
      props.onChangeFootstepVolume(0.55);
      props.onToggleUiClickSound(true);
      props.onChangeVoiceMode('open');
      props.onChangeVoiceVolume(0.85);
      props.onChangeVoiceChannelScope('team');
    } else if (activeCategory === 'online') {
      props.onToggleShowPingHud(true);
    } else if (activeCategory === 'appearance') {
      props.onToggleReducedMotion(false);
      props.onToggleUiClickSound(true);
      props.onToggleUiHaptics(true);
    }
  };

  const equippedAk = getCosmeticItem(props.cosmeticsState.equipped.ak47_skin);
  const equippedSniper = getCosmeticItem(props.cosmeticsState.equipped.sniper_skin);
  const equippedM249 = getCosmeticItem(props.cosmeticsState.equipped.m249_skin);

  return (
    <div
      id="settings-screen"
      className="uiv2-screen uiv2-settings-screen"
      role="dialog"
      aria-modal="true"
      aria-label="تنظیمات بازی"
      data-testid="uiv2-settings-modal"
      dir="rtl"
    >
      <div className="uiv2-settings-shell">
        {/* Top Modal Header */}
        <header className="uiv2-settings-header">
          <div className="uiv2-settings-title-group">
            <h2 className="uiv2-settings-title">
              {isPaused ? 'توقف و تنظیمات' : 'تنظیمات'}
            </h2>
            <span className="uiv2-alpha-tag" data-testid="uiv2-settings-alpha-badge">
              Alpha
            </span>
          </div>

          <div className="uiv2-settings-head-actions">
            <button
              id="btn-toggle-fullscreen"
              data-testid="btn-toggle-fullscreen"
              type="button"
              className="uiv2-btn uiv2-btn-ghost uiv2-btn-sm"
              onClick={() => {
                props.onFeedback('tap');
                props.onToggleFullscreen();
              }}
            >
              <IconFullscreen size={16} active={props.isFullscreen} />
              <span className="uiv2-hide-xs">{props.isFullscreen ? 'خروج تمام‌صفحه' : 'تمام‌صفحه'}</span>
            </button>
            <button
              id="btn-close-settings"
              type="button"
              className="uiv2-btn uiv2-btn-primary uiv2-btn-sm"
              onClick={() => {
                props.onFeedback('primary');
                props.onCloseOrResume();
              }}
            >
              {isPaused ? <IconPlay size={15} /> : <IconClose size={16} />}
              <span>{isPaused ? 'ادامه بازی' : 'بستن'}</span>
            </button>
          </div>
        </header>

        {/* Pause Quick Actions Bar (Visible Immediately When Paused Mid-Match) */}
        {isPaused && (
          <div className="uiv2-pause-bar" data-testid="uiv2-pause-bar">
            <button
              type="button"
              className="uiv2-btn uiv2-btn-surface uiv2-btn-sm"
              onClick={() => {
                props.onFeedback('tap');
                props.onOpenOnline();
              }}
            >
              <IconOnline size={15} />
              <span>لابی آنلاین</span>
            </button>
            <button
              type="button"
              className="uiv2-btn uiv2-btn-surface uiv2-btn-sm"
              onClick={() => {
                props.onFeedback('tap');
                props.onOpenTraining();
              }}
            >
              <IconTarget size={15} />
              <span>تنظیمات تمرین</span>
            </button>
            <button
              id="btn-restart-settings"
              type="button"
              className="uiv2-btn uiv2-btn-surface uiv2-btn-sm"
              onClick={() => {
                props.onFeedback('primary');
                props.onRestartMatch();
              }}
            >
              <IconReset size={15} />
              <span>شروع مجدد</span>
            </button>
            <button
              type="button"
              className="uiv2-btn uiv2-btn-danger uiv2-btn-sm"
              onClick={() => {
                props.onFeedback('back');
                props.onReturnToTitle();
              }}
            >
              <IconHome size={15} />
              <span>منوی اصلی</span>
            </button>
          </div>
        )}

        {/* Active Online Room Bar */}
        {(props.onlineRoom || props.peerStatus !== 'idle') && (
          <div className="uiv2-room-strip" data-testid="pause-room-bar">
            <div className="uiv2-room-strip-meta">
              <span
                className="uiv2-live-dot"
                style={{
                  background: formatConnectionStatusFa(props.peerStatus, props.peerRole, props.onlineRoomError).color,
                }}
              />
              {props.onlineRoom ? (
                <>
                  <span>اتاق</span>
                  <strong className="uiv2-tabular" data-testid="pause-room-code" dir="ltr">
                    {props.onlineRoom.code}
                  </strong>
                  <span className="uiv2-muted">({props.onlineRoom.players.length} نفر)</span>
                  <span className="uiv2-sep">·</span>
                  <span className="uiv2-muted">
                    {formatConnectionStatusFa(props.peerStatus, props.peerRole, props.onlineRoomError).badgeFa}
                  </span>
                </>
              ) : (
                <span>
                  {formatConnectionStatusFa(props.peerStatus, props.peerRole, props.onlineRoomError).badgeFa}
                </span>
              )}
            </div>
            {props.onlineRoom && (
              <button
                type="button"
                className="uiv2-btn uiv2-btn-ghost uiv2-btn-xs"
                data-testid="pause-copy-room-btn"
                onClick={() => {
                  props.onFeedback('tap');
                  const url = buildRoomInviteUrl(
                    getCurrentOriginShareBaseUrl(window.location.origin, window.location.pathname),
                    props.onlineRoom!.code
                  );
                  navigator.clipboard?.writeText(url).catch(() => {});
                  setCopiedRoom(true);
                  window.setTimeout(() => setCopiedRoom(false), 1600);
                }}
              >
                {copiedRoom ? 'کپی شد' : 'کپی لینک اتاق'}
              </button>
            )}
          </div>
        )}

        {/* Sidebar + Content Workspace */}
        <div className="uiv2-settings-body">
          <nav className="uiv2-settings-sidebar" role="tablist" aria-label="دسته‌بندی تنظیمات">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  data-testid={`uiv2-settings-cat-${cat.id}`}
                  className={`uiv2-cat-btn ${active ? 'is-active' : ''}`}
                  onClick={() => {
                    props.onFeedback('toggle');
                    setActiveCategory(cat.id);
                  }}
                >
                  <Icon size={16} />
                  <span>{cat.labelFa}</span>
                </button>
              );
            })}
          </nav>

          <div className="uiv2-settings-content">
            {/* Section Title + Per-Section Reset */}
            <div className="uiv2-section-head">
              <h3>{CATEGORIES.find((c) => c.id === activeCategory)?.labelFa}</h3>
              {activeCategory !== 'skins' && (
                <button
                  type="button"
                  data-testid={`uiv2-reset-section-${activeCategory}`}
                  className="uiv2-btn uiv2-btn-ghost uiv2-btn-xs"
                  onClick={handleResetCurrentSection}
                >
                  <IconReset size={14} />
                  <span>ریست این بخش</span>
                </button>
              )}
            </div>

            {/* 1. GENERAL */}
            {activeCategory === 'general' && (
              <div className="uiv2-settings-stack" data-testid="uiv2-panel-general">
                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-map">نقشه فعال عملیات</label>
                    <small>انتخاب میدان نبرد برای آفلاین و پیش‌فرض آنلاین</small>
                  </div>
                  <select
                    id="v2-opt-map"
                    className="uiv2-select"
                    value={props.currentMap}
                    onChange={(e) => {
                      props.onFeedback('toggle');
                      props.onSelectMap(e.target.value as MapId);
                    }}
                  >
                    {MAP_LIST.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nameFa}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-botdiff">سطح هوش مصنوعی بات‌ها</label>
                    <small>قدرت واکنش و مسیریابی دشمنان آفلاین</small>
                  </div>
                  <select
                    id="v2-opt-botdiff"
                    className="uiv2-select"
                    value={props.botDifficulty}
                    onChange={(e) => {
                      props.onFeedback('toggle');
                      props.onChangeBotDifficulty(e.target.value as BotDifficultyPreset);
                    }}
                  >
                    <option value="weak">ضعیف (مبتدی)</option>
                    <option value="medium">متوسط (تاکتیکی)</option>
                    <option value="strong">قوی (کماندو)</option>
                  </select>
                </div>

                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-autoreload">ریلود خودکار هنگام اتمام خشاب</label>
                    <small>تعویض خودکار خشاب بعد از شلیک آخرین تیر</small>
                  </div>
                  <ToggleSwitchV2
                    id="v2-opt-autoreload"
                    testId="opt-auto-reload"
                    checked={props.autoReloadEnabled}
                    label="ریلود خودکار"
                    onChange={(next) => {
                      props.onFeedback('toggle');
                      props.onToggleAutoReload(next);
                    }}
                  />
                </div>

                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-billboards">نمایش بیلبوردهای دیواری</label>
                    <small>تابلوهای تزئینی محیط روی دیوارهای مپ (بدون اثر بر گیم‌پلی)</small>
                  </div>
                  <ToggleSwitchV2
                    id="v2-opt-billboards"
                    testId="opt-show-ad-billboards"
                    checked={props.showAdBillboards}
                    label="نمایش بیلبوردها"
                    onChange={(next) => {
                      props.onFeedback('toggle');
                      props.onToggleShowAdBillboards(next);
                    }}
                  />
                </div>

                <div className="uiv2-subsection">
                  <div className="uiv2-subhead">
                    <span>انتخاب ۳ سلاح همراه (Loadout {props.loadout.length}/{WEAPON_CATALOG.length})</span>
                    <span className="uiv2-muted" dir="ltr">
                      {props.loadout.map((id) => WEAPON_CATALOG.find((w) => w.id === id)?.nameEn).join(' · ')}
                    </span>
                  </div>
                  <div className="uiv2-arsenal-grid is-compact">
                    {WEAPON_CATALOG.map((w) => {
                      const slotIdx = props.loadout.indexOf(w.id);
                      const equipped = slotIdx !== -1;
                      return (
                        <button
                          key={w.id}
                          type="button"
                          data-testid={`settings-loadout-${w.id}`}
                          className={`uiv2-weapon-card ${equipped ? 'is-equipped' : ''}`}
                          onClick={() => {
                            props.onFeedback('toggle');
                            props.onToggleLoadoutWeapon(w.id);
                          }}
                        >
                          <div className="uiv2-weapon-top">
                            <span className="uiv2-weapon-en" dir="ltr">
                              {w.nameEn}
                            </span>
                            {equipped && <span className="uiv2-slot-index">اسلات {slotIdx + 1}</span>}
                          </div>
                          <div className="uiv2-weapon-svg">{props.renderWeaponIconSvg(w.id)}</div>
                          <div className="uiv2-weapon-fa">{w.nameFa}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 2. CONTROLS */}
            {activeCategory === 'controls' && (
              <div className="uiv2-settings-stack" data-testid="uiv2-panel-controls">
                {/* Quick Path to Touch Layout Editor (independent UI v2 storage) */}
                <div className="uiv2-highlight-row">
                  <div className="uiv2-row-info">
                    <strong>چیدمان دکمه‌های لمسی (مجزا برای UI جدید)</strong>
                    <small>تغییر جایگاه، اندازه و شفافیت دکمه‌ها بدون تغییر در چیدمان UI قدیمی</small>
                  </div>
                  <div className="uiv2-inline-actions">
                    <button
                      type="button"
                      data-testid="btn-open-layout-editor"
                      className="uiv2-btn uiv2-btn-primary uiv2-btn-sm"
                      onClick={() => {
                        props.onFeedback('primary');
                        props.onOpenLayoutEditor();
                      }}
                    >
                      ویرایش چیدمان کنترل‌ها
                    </button>
                    <button
                      type="button"
                      data-testid="btn-settings-reset-layout"
                      className="uiv2-btn uiv2-btn-ghost uiv2-btn-sm"
                      onClick={() => {
                        props.onFeedback('back');
                        props.onResetControlLayout();
                      }}
                    >
                      پیش‌فرض
                    </button>
                  </div>
                </div>

                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-sens">حساسیت چرخش دوربین (Sensitivity)</label>
                  </div>
                  <div className="uiv2-slider-wrap">
                    <input
                      id="v2-opt-sens"
                      type="range"
                      min="0.3"
                      max="8.0"
                      step="0.05"
                      value={props.sensitivity}
                      onChange={(e) => props.onChangeSensitivity(parseFloat(e.target.value))}
                    />
                    <span className="uiv2-val uiv2-tabular">{Math.round(props.sensitivity * 100)}%</span>
                  </div>
                </div>

                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-ads-sens">حساسیت نشانه‌گیری و اسنایپ (ADS)</label>
                  </div>
                  <div className="uiv2-slider-wrap">
                    <input
                      id="v2-opt-ads-sens"
                      type="range"
                      min="0.2"
                      max="4.0"
                      step="0.05"
                      value={props.adsSensitivity}
                      onChange={(e) => props.onChangeAdsSensitivity(parseFloat(e.target.value))}
                    />
                    <span className="uiv2-val uiv2-tabular">{Math.round(props.adsSensitivity * 100)}%</span>
                  </div>
                </div>

                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-aim-assist">کمک نشانه‌گیری (Aim Assist)</label>
                    <small>
                      {props.onlineRoom?.aimAssistAllowed === false
                        ? 'در این اتاق توسط میزبان غیرفعال شده است'
                        : 'هدایت نرم روی حریفان (هرگز روی هم‌تیمی‌ها عمل نمی‌کند)'}
                    </small>
                  </div>
                  <div className="uiv2-slider-wrap">
                    <input
                      id="v2-opt-aim-assist"
                      data-testid="opt-soft-aim-assist"
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={props.aimAssistStrength}
                      onChange={(e) => props.onChangeAimAssistStrength(parseInt(e.target.value, 10))}
                    />
                    <span className="uiv2-val uiv2-tabular">{props.aimAssistStrength}%</span>
                  </div>
                </div>

                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-layout">الگوی چیدمان دکمه‌ها (Preset)</label>
                  </div>
                  <select
                    id="v2-opt-layout"
                    className="uiv2-select"
                    value={props.hudLayout}
                    onChange={(e) => {
                      props.onFeedback('toggle');
                      props.onChangeHudLayoutPreset(e.target.value as HudLayoutPreset);
                    }}
                  >
                    <option value="standard">استاندارد ارگونومیک (راست‌دست)</option>
                    <option value="claw">حرفه‌ای چهارانگشتی (Claw)</option>
                    <option value="lefthanded">چپ‌دست (جوی‌استیک راست)</option>
                  </select>
                </div>

                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-touch">حالت نمایش دکمه‌های لمسی</label>
                  </div>
                  <select
                    id="v2-opt-touch"
                    className="uiv2-select"
                    value={props.touchSetting}
                    onChange={(e) => {
                      props.onFeedback('toggle');
                      props.onChangeTouchSetting(e.target.value as 'auto' | 'on' | 'off');
                    }}
                  >
                    <option value="auto">لمسی خودکار</option>
                    <option value="on">همیشه روشن</option>
                    <option value="off">خاموش</option>
                  </select>
                </div>

                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-hud-scale">اندازه کلی دکمه‌ها و جوی‌استیک</label>
                  </div>
                  <div className="uiv2-slider-wrap">
                    <input
                      id="v2-opt-hud-scale"
                      type="range"
                      min="0.75"
                      max="1.4"
                      step="0.05"
                      value={props.hudScale}
                      onChange={(e) => props.onChangeHudScale(parseFloat(e.target.value))}
                    />
                    <span className="uiv2-val uiv2-tabular">{Math.round(props.hudScale * 100)}%</span>
                  </div>
                </div>

                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-hud-opacity">شفافیت کلی کنترل‌ها</label>
                  </div>
                  <div className="uiv2-slider-wrap">
                    <input
                      id="v2-opt-hud-opacity"
                      type="range"
                      min="0.35"
                      max="1.0"
                      step="0.05"
                      value={props.hudOpacity}
                      onChange={(e) => props.onChangeHudOpacity(parseFloat(e.target.value))}
                    />
                    <span className="uiv2-val uiv2-tabular">{Math.round(props.hudOpacity * 100)}%</span>
                  </div>
                </div>

                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-ch-size">اندازه کراس‌هیر (Crosshair)</label>
                  </div>
                  <div className="uiv2-slider-wrap">
                    <input
                      id="v2-opt-ch-size"
                      data-testid="opt-crosshair-size"
                      type="range"
                      min="0.5"
                      max="1.8"
                      step="0.1"
                      value={props.crosshairSize}
                      onChange={(e) => props.onChangeCrosshairSize(parseFloat(e.target.value))}
                    />
                    <span className="uiv2-val uiv2-tabular">{Math.round(props.crosshairSize * 100)}%</span>
                  </div>
                </div>

                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-ch-style">شکل کراس‌هیر</label>
                  </div>
                  <select
                    id="v2-opt-ch-style"
                    data-testid="opt-crosshair-style"
                    className="uiv2-select"
                    value={props.crosshairStyle}
                    onChange={(e) => {
                      props.onFeedback('toggle');
                      props.onChangeCrosshairStyle(e.target.value as CrosshairStyle);
                    }}
                  >
                    <option value="cross">خطوط نازک مینیمال</option>
                    <option value="dot">نقطه ساده</option>
                  </select>
                </div>

                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-cam-motion">شدت حرکت دوربین (Camera Motion)</label>
                    <small>تکان راه‌رفتن، دویدن و ضربهٔ فرود</small>
                  </div>
                  <div className="uiv2-slider-wrap">
                    <input
                      id="v2-opt-cam-motion"
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={props.cameraMotionIntensity}
                      onChange={(e) => props.onChangeCameraMotionIntensity(parseInt(e.target.value, 10))}
                    />
                    <span className="uiv2-val uiv2-tabular">{props.cameraMotionIntensity}%</span>
                  </div>
                </div>

                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-lean-btns">نمایش دکمه‌های خم شدن چپ/راست (Z / X) روی HUD</label>
                    <small>در حالت خاموش، کلیدهای Z و X و حالت هوشمند AUTO همچنان فعال هستند</small>
                  </div>
                  <ToggleSwitchV2
                    id="v2-opt-lean-btns"
                    testId="opt-show-lean-buttons"
                    checked={props.showLeanHudButtons}
                    label="نمایش دکمه‌های خم شدن"
                    onChange={(next) => {
                      props.onFeedback('toggle');
                      props.onToggleLeanHudButtons(next);
                    }}
                  />
                </div>

                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-slide">اسلاید تاکتیکی (Slide · بتا)</label>
                    <small>
                      {props.onlineRoom?.slideAllowed === false
                        ? 'در اتاق فعلی توسط میزبان غیرمجاز شده است'
                        : `سر خوردن حین دویدن با کلید C یا دکمه اسلاید (کولداون ${SLIDE_COOLDOWN_SEC} ثانیه)`}
                    </small>
                  </div>
                  <ToggleSwitchV2
                    id="v2-opt-slide"
                    testId="opt-slide-alpha"
                    checked={props.slideAlphaEnabled}
                    label="اسلاید تاکتیکی"
                    onChange={(next) => {
                      props.onFeedback('toggle');
                      props.onToggleSlideAlpha(next);
                    }}
                  />
                </div>

                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-vibration">لرزش خفیف گوشی (Vibration)</label>
                    <small>بازخورد لرزشی هنگام شلیک/آسیب و لمس دکمه‌ها</small>
                  </div>
                  <ToggleSwitchV2
                    id="v2-opt-vibration"
                    testId="opt-vibration"
                    checked={props.vibrationEnabled}
                    label="لرزش گوشی"
                    onChange={(next) => {
                      props.onFeedback('toggle');
                      props.onToggleVibration(next);
                    }}
                  />
                </div>

                {/* Passcode-Protected Locked Aim Assist & Cheats (100% preserved) */}
                <div className="uiv2-subsection">
                  <button
                    type="button"
                    className="uiv2-collapse-btn"
                    data-testid="uiv2-toggle-cheats-drawer"
                    aria-expanded={cheatsExpanded}
                    onClick={() => {
                      props.onFeedback('tap');
                      setCheatsExpanded((prev) => !prev);
                    }}
                  >
                    <span className="uiv2-collapse-title">
                      <IconShield size={15} />
                      <span>ایم‌اسیست قفل‌دار و چیت‌ها (نیازمند رمز اختصاصی)</span>
                    </span>
                    <span className="uiv2-muted">{cheatsExpanded ? 'بستن' : 'باز کردن'}</span>
                  </button>

                  {cheatsExpanded && (
                    <div className="uiv2-cheats-body" data-testid="settings-panel-cheats">
                      {!props.cheatUnlocked ? (
                        <div className="uiv2-cheat-gate" data-testid="cheat-password-gate">
                          <div className="uiv2-row-info">
                            <small>
                              وضعیت ایم‌اسیست استاندارد:{' '}
                              <strong data-testid="locked-aim-assist-readout">
                                قفل روی {props.cheatConfig.aimAssistStrength}% (فقط دید مستقیم)
                              </strong>
                            </small>
                          </div>
                          <div className="uiv2-cheat-input-row">
                            <input
                              id="input-cheat-passcode"
                              data-testid="input-cheat-passcode"
                              type="password"
                              className="uiv2-input"
                              value={props.cheatPasswordInput}
                              onChange={(e) => {
                                props.onChangeCheatPasswordInput(e.target.value);
                                if (props.cheatPassError) props.onSetCheatPassError(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (verifyCheatPasscode(props.cheatPasswordInput)) {
                                    props.onUnlockCheats();
                                  } else {
                                    props.onSetCheatPassError('رمز وارد شده صحیح نیست.');
                                  }
                                }
                              }}
                              placeholder="رمز اختصاصی..."
                            />
                            <button
                              type="button"
                              data-testid="btn-unlock-cheats"
                              className="uiv2-btn uiv2-btn-surface uiv2-btn-sm"
                              onClick={() => {
                                if (verifyCheatPasscode(props.cheatPasswordInput)) {
                                  props.onUnlockCheats();
                                } else {
                                  props.onSetCheatPassError('رمز وارد شده صحیح نیست.');
                                }
                              }}
                            >
                              بازگشایی {CHEAT_UNLOCK_DURATION_SEC}ث
                            </button>
                          </div>
                          {props.cheatPassError && (
                            <div className="uiv2-error-text" data-testid="cheat-passcode-error">
                              {props.cheatPassError}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="uiv2-settings-stack">
                          <div className="uiv2-pending-banner" data-testid="cheat-unlock-timer">
                            <span>قفل باز است — قفل خودکار تا {props.cheatUnlockRemainingSec} ثانیه دیگر</span>
                            <button
                              type="button"
                              data-testid="btn-relock-cheats"
                              className="uiv2-btn uiv2-btn-ghost uiv2-btn-xs"
                              onClick={props.onRelockCheats}
                            >
                              قفل فوری
                            </button>
                          </div>

                          <div className="uiv2-row">
                            <label htmlFor="v2-cheat-aa">ایم‌اسیست هوشمند</label>
                            <ToggleSwitchV2
                              id="v2-cheat-aa"
                              checked={props.cheatConfig.aimAssistEnabled}
                              label="ایم‌اسیست هوشمند"
                              onChange={(v) => props.onUpdateCheats({ aimAssistEnabled: v })}
                            />
                          </div>
                          <div className="uiv2-row">
                            <label htmlFor="v2-cheat-aa-str">قدرت ایم‌اسیست</label>
                            <div className="uiv2-slider-wrap">
                              <input
                                id="v2-cheat-aa-str"
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={props.cheatConfig.aimAssistStrength}
                                onChange={(e) => {
                                  const v = parseInt(e.target.value, 10);
                                  props.onUpdateCheats({ aimAssistStrength: v, aimAssistEnabled: v > 0 });
                                }}
                              />
                              <span className="uiv2-val uiv2-tabular">{props.cheatConfig.aimAssistStrength}%</span>
                            </div>
                          </div>
                          <div className="uiv2-row">
                            <label>قفل روی سر (Headshot Lock)</label>
                            <ToggleSwitchV2
                              checked={props.cheatConfig.aimAssistHeadshot}
                              label="قفل روی سر"
                              onChange={(v) => props.onUpdateCheats({ aimAssistHeadshot: v })}
                            />
                          </div>
                          <div className="uiv2-row">
                            <label>تیر بی‌نهایت (Infinite Ammo)</label>
                            <ToggleSwitchV2
                              checked={props.cheatConfig.infiniteAmmo}
                              label="تیر بی‌نهایت"
                              onChange={(v) => props.onUpdateCheats({ infiniteAmmo: v })}
                            />
                          </div>
                          <div className="uiv2-row">
                            <label>حذف لگد سلاح (Zero Recoil)</label>
                            <ToggleSwitchV2
                              checked={props.cheatConfig.zeroRecoil}
                              label="حذف لگد"
                              onChange={(v) => props.onUpdateCheats({ zeroRecoil: v })}
                            />
                          </div>
                          <div className="uiv2-row">
                            <label>ضدضربه (God Mode)</label>
                            <ToggleSwitchV2
                              checked={props.cheatConfig.godMode}
                              label="ضدضربه"
                              onChange={(v) => props.onUpdateCheats({ godMode: v })}
                            />
                          </div>
                          <div className="uiv2-row">
                            <label>رادار نوری دشمنان (ESP)</label>
                            <ToggleSwitchV2
                              checked={props.cheatConfig.espWallhack}
                              label="رادار نوری"
                              onChange={(v) => props.onUpdateCheats({ espWallhack: v })}
                            />
                          </div>
                          <div className="uiv2-row">
                            <label>سرعت و پرش فوق‌العاده</label>
                            <ToggleSwitchV2
                              checked={props.cheatConfig.superSpeed}
                              label="سرعت فوق‌العاده"
                              onChange={(v) => props.onUpdateCheats({ superSpeed: v })}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. GRAPHICS & PERFORMANCE */}
            {activeCategory === 'graphics' && (
              <div className="uiv2-settings-stack" data-testid="uiv2-panel-graphics">
                <div className="uiv2-subsection">
                  <div className="uiv2-subhead">
                    <span>پیش‌تنظیم سریع گرافیک</span>
                  </div>
                  <div className="uiv2-quick-gfx-grid">
                    {QUICK_GFX_TIERS.map((tier) => (
                      <button
                        key={tier.id}
                        type="button"
                        data-testid={`uiv2-quick-gfx-${tier.id}`}
                        className={`uiv2-quick-gfx-btn ${activeQuickTier === tier.id ? 'is-active' : ''}`}
                        onClick={() => handleQuickGraphics(tier.id)}
                      >
                        <strong>{tier.labelFa}</strong>
                        <small>{tier.subFa}</small>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-preset">سطح دقیق گرافیک (Pro Max تا Potato)</label>
                  </div>
                  <select
                    id="v2-opt-preset"
                    className="uiv2-select"
                    value={props.gfxState.preset}
                    onChange={(e) => {
                      props.onFeedback('toggle');
                      props.onApplyPreset(e.target.value as GfxPresetName);
                    }}
                  >
                    <option value="promax">Ultra Max Pro Max (165%)</option>
                    <option value="ultramax">Ultra Max (145%)</option>
                    <option value="ultra">Ultra (125%)</option>
                    <option value="high">High (100%)</option>
                    <option value="med">Medium (75%)</option>
                    <option value="low">Low (سبک)</option>
                    <option value="potato">Potato (45% فوق‌سبک)</option>
                  </select>
                </div>

                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-res">رزولوشن رندر (Render Scale)</label>
                  </div>
                  <select
                    id="v2-opt-res"
                    className="uiv2-select"
                    value={String(props.gfxState.resScale)}
                    onChange={(e) => props.onUpdateGfx({ resScale: parseFloat(e.target.value) })}
                  >
                    <option value="2">200% (4K Extreme)</option>
                    <option value="1.65">165% (Ultra Max Pro Max)</option>
                    <option value="1.45">145% (Ultra Max)</option>
                    <option value="1.25">125% (Ultra)</option>
                    <option value="1">100% (Native)</option>
                    <option value="0.75">75% (استاندارد)</option>
                    <option value="0.55">55% (سبک)</option>
                    <option value="0.45">45% (فوق‌سبک)</option>
                  </select>
                </div>

                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-vibrance">شدت رنگ و شفافیت HDR</label>
                  </div>
                  <div className="uiv2-slider-wrap">
                    <input
                      id="v2-opt-vibrance"
                      type="range"
                      min="1.0"
                      max="1.85"
                      step="0.05"
                      value={props.gfxState.vibrance}
                      onChange={(e) => props.onUpdateGfx({ vibrance: parseFloat(e.target.value) })}
                    />
                    <span className="uiv2-val uiv2-tabular">{Math.round(props.gfxState.vibrance * 100)}%</span>
                  </div>
                </div>

                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-shadows">کیفیت سایه‌ها (Shadows)</label>
                  </div>
                  <select
                    id="v2-opt-shadows"
                    className="uiv2-select"
                    value={props.gfxState.shadowMode}
                    onChange={(e) =>
                      props.onUpdateGfx({
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

                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-fps">سقف فریم‌ریت (FPS Limit)</label>
                  </div>
                  <select
                    id="v2-opt-fps"
                    className="uiv2-select"
                    value={String(props.gfxState.targetFps)}
                    onChange={(e) => props.onUpdateGfx({ targetFps: parseInt(e.target.value, 10) })}
                  >
                    <option value="0">نامحدود (Max FPS)</option>
                    <option value="60">60 FPS</option>
                    <option value="45">45 FPS</option>
                    <option value="30">30 FPS</option>
                  </select>
                </div>

                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-bodycam">افکت لنز بادیکم</label>
                  </div>
                  <ToggleSwitchV2
                    id="v2-opt-bodycam"
                    checked={props.gfxState.bodycamFx}
                    label="لنز بادیکم"
                    onChange={(next) => {
                      props.onFeedback('toggle');
                      props.onUpdateGfx({ bodycamFx: next });
                    }}
                  />
                </div>

                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-flashlight">چراغ‌قوه تاکتیکی</label>
                  </div>
                  <ToggleSwitchV2
                    id="v2-opt-flashlight"
                    checked={props.gfxState.flashlightOn}
                    label="چراغ‌قوه"
                    onChange={(next) => {
                      props.onFeedback('toggle');
                      props.onUpdateGfx({ flashlightOn: next });
                    }}
                  />
                </div>

                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-autoq">کیفیت خودکار (Auto Quality)</label>
                    <small>در صورت افت FPS زیر ۳۰، مرحله‌به‌مرحله سبک‌سازی می‌کند</small>
                  </div>
                  <ToggleSwitchV2
                    id="v2-opt-autoq"
                    testId="opt-auto-quality"
                    checked={props.autoQuality}
                    label="کیفیت خودکار"
                    onChange={(next) => {
                      props.onFeedback('toggle');
                      props.onToggleAutoQuality(next);
                    }}
                  />
                </div>

                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-showfps">نمایش شمارنده FPS روی صفحه بازی</label>
                  </div>
                  <ToggleSwitchV2
                    id="v2-opt-showfps"
                    testId="opt-show-fps-hud"
                    checked={props.showFpsHud}
                    label="نمایش FPS"
                    onChange={(next) => {
                      props.onFeedback('toggle');
                      props.onToggleShowFpsHud(next);
                    }}
                  />
                </div>

                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-profiler">پنل آمار عملکرد (Profiler)</label>
                    <small>نمایش زنده FPS، زمان فریم، Draw Calls، مثلث‌ها و حافظه</small>
                  </div>
                  <ToggleSwitchV2
                    id="v2-opt-profiler"
                    testId="opt-show-perf-profiler"
                    checked={props.showPerfProfiler}
                    label="پنل عملکرد"
                    onChange={(next) => {
                      props.onFeedback('toggle');
                      props.onTogglePerfProfiler(next);
                    }}
                  />
                </div>
              </div>
            )}

            {/* 4. AUDIO & VOICE */}
            {activeCategory === 'audio' && (
              <div className="uiv2-settings-stack" data-testid="uiv2-panel-audio">
                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-sound">صدای کلی بازی</label>
                  </div>
                  <ToggleSwitchV2
                    id="v2-opt-sound"
                    checked={props.soundEnabled}
                    label="صدای بازی"
                    onChange={(next) => {
                      props.onFeedback('toggle');
                      props.onToggleSoundEnabled(next);
                    }}
                  />
                </div>

                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-footsteps">صدای پای جهت‌دار بازیکنان نزدیک</label>
                  </div>
                  <div className="uiv2-slider-wrap">
                    <input
                      id="v2-opt-footsteps"
                      data-testid="opt-footstep-volume"
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={props.footstepVolume}
                      onChange={(e) => props.onChangeFootstepVolume(parseFloat(e.target.value))}
                    />
                    <span className="uiv2-val uiv2-tabular">{Math.round(props.footstepVolume * 100)}%</span>
                  </div>
                </div>

                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-ui-click">صدای کلیک منوهای UI جدید</label>
                    <small>صدای ظریف و سنتزشده هنگام فشردن دکمه‌ها</small>
                  </div>
                  <ToggleSwitchV2
                    id="v2-opt-ui-click"
                    checked={props.uiPrefs.uiClickSound}
                    label="صدای کلیک منو"
                    onChange={(next) => props.onToggleUiClickSound(next)}
                  />
                </div>

                <div className="uiv2-subsection" data-testid="settings-voice-section">
                  <div className="uiv2-subhead">
                    <span>چت صوتی آنلاین (WebRTC)</span>
                    <span className="uiv2-muted">
                      {props.voiceState.secureContextOk ? 'HTTPS آماده' : 'نیازمند HTTPS'}
                    </span>
                  </div>

                  <div className="uiv2-row">
                    <div className="uiv2-row-info">
                      <label htmlFor="v2-opt-vmode">حالت میکروفون</label>
                      <small>فشار برای صحبت: کلید V یا نگه داشتن دکمه میکروفون</small>
                    </div>
                    <select
                      id="v2-opt-vmode"
                      data-testid="opt-voice-mode"
                      className="uiv2-select"
                      value={props.voiceState.mode}
                      onChange={(e) => props.onChangeVoiceMode(e.target.value as VoiceMode)}
                    >
                      <option value="open">میکروفون باز</option>
                      <option value="ptt">فشار برای صحبت (V)</option>
                    </select>
                  </div>

                  <div className="uiv2-row">
                    <div className="uiv2-row-info">
                      <label htmlFor="v2-opt-vvol">ولوم صدای بازیکنان دیگر</label>
                    </div>
                    <div className="uiv2-slider-wrap">
                      <input
                        id="v2-opt-vvol"
                        data-testid="opt-voice-volume"
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={props.voiceState.volume}
                        onChange={(e) => props.onChangeVoiceVolume(parseFloat(e.target.value))}
                      />
                      <span className="uiv2-val uiv2-tabular">{Math.round(props.voiceState.volume * 100)}%</span>
                    </div>
                  </div>

                  <div className="uiv2-row">
                    <div className="uiv2-row-info">
                      <label htmlFor="v2-opt-vchan">کانال صدای تیمی</label>
                    </div>
                    <select
                      id="v2-opt-vchan"
                      data-testid="opt-voice-channel"
                      className="uiv2-select"
                      value={props.voiceState.channelScope}
                      onChange={(e) => props.onChangeVoiceChannelScope(e.target.value as VoiceChannelScope)}
                    >
                      <option value="team">فقط هم‌تیمی‌ها</option>
                      <option value="all">همه بازیکنان اتاق</option>
                    </select>
                  </div>

                  {props.voiceState.lastErrorFa && (
                    <div className="uiv2-error-text" data-testid="settings-voice-error">
                      {props.voiceState.lastErrorFa}
                    </div>
                  )}

                  {props.onlineRoom && props.onlineRoom.players.length > 0 && (
                    <div className="uiv2-voice-roster">
                      {props.onlineRoom.players.map((p) => {
                        const isMe = p.id === props.localOnlinePlayerId;
                        const isMuted = props.voiceState.mutedPlayerIds.includes(p.id);
                        return (
                          <div key={p.id} className="uiv2-voice-peer">
                            <span>
                              {p.name} {isMe ? '(شما)' : ''}
                            </span>
                            {!isMe ? (
                              <button
                                type="button"
                                data-testid={`btn-mute-player-${p.id}`}
                                className="uiv2-btn uiv2-btn-ghost uiv2-btn-xs"
                                onClick={() => props.onToggleMuteVoicePlayer(p.id)}
                              >
                                {isMuted ? 'بی‌صدا شده' : 'میوت'}
                              </button>
                            ) : (
                              <span className="uiv2-muted">
                                {props.voiceState.transmitting ? 'در حال ارسال صدا' : 'خاموش'}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. ONLINE */}
            {activeCategory === 'online' && (
              <div className="uiv2-settings-stack" data-testid="uiv2-panel-online">
                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-callsign">نام نمایشی شما در آنلاین</label>
                    <small>در لابی، جدول امتیاز و کیل‌فید نمایش داده می‌شود</small>
                  </div>
                  <input
                    id="v2-opt-callsign"
                    type="text"
                    maxLength={16}
                    className="uiv2-input uiv2-input-sm"
                    value={props.onlinePlayerName}
                    onChange={(e) => props.onChangeOnlinePlayerName(e.target.value)}
                  />
                </div>

                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-ping">نمایش پینگ و کیفیت اتصال (ms)</label>
                    <small>نمایش تأخیر زنده در گوشهٔ صفحه حین بازی آنلاین</small>
                  </div>
                  <ToggleSwitchV2
                    id="v2-opt-ping"
                    testId="opt-show-ping-hud"
                    checked={props.showPingHud}
                    label="نمایش پینگ"
                    onChange={(next) => {
                      props.onFeedback('toggle');
                      props.onToggleShowPingHud(next);
                    }}
                  />
                </div>

                <div className="uiv2-highlight-row">
                  <div className="uiv2-row-info">
                    <strong>لابی آنلاین و مدیریت اتاق (PeerJS)</strong>
                    <small>
                      {props.onlineRoom
                        ? `اتاق فعال: ${props.onlineRoom.code} (${props.onlineRoom.players.length} بازیکن)`
                        : 'ساخت اتاق جدید، ورود با کد دعوت یا پیوستن به نبرد راندی 1v1 و 2v2'}
                    </small>
                  </div>
                  <button
                    type="button"
                    className="uiv2-btn uiv2-btn-primary uiv2-btn-sm"
                    onClick={() => {
                      props.onFeedback('primary');
                      props.onOpenOnline();
                    }}
                  >
                    <IconOnline size={16} />
                    <span>باز کردن لابی آنلاین</span>
                  </button>
                </div>
              </div>
            )}

            {/* 6. SKINS & REDEEM CODE */}
            {activeCategory === 'skins' && (
              <div className="uiv2-settings-stack" data-testid="uiv2-panel-skins">
                <div className="uiv2-highlight-row">
                  <div className="uiv2-row-info">
                    <strong>اسکین‌های سلاح و کلکسیون</strong>
                    <small>
                      AK-47: {equippedAk?.nameFa ?? 'پیش‌فرض'} · AWM: {equippedSniper?.nameFa ?? 'پیش‌فرض'} · M249:{' '}
                      {equippedM249?.nameFa ?? 'پیش‌فرض'}
                    </small>
                  </div>
                  <div className="uiv2-inline-actions">
                    <button
                      type="button"
                      id="btn-open-skins-settings"
                      data-testid="btn-open-skins-settings"
                      className="uiv2-btn uiv2-btn-primary uiv2-btn-sm"
                      onClick={() => {
                        props.onFeedback('primary');
                        props.onOpenSkins();
                      }}
                    >
                      <IconLayers size={15} />
                      <span>اسکین‌ها</span>
                    </button>
                    <button
                      type="button"
                      className="uiv2-btn uiv2-btn-surface uiv2-btn-sm"
                      onClick={() => {
                        props.onFeedback('tap');
                        props.onOpenSpin();
                      }}
                    >
                      <IconSpark size={15} />
                      <span>اسپین ({props.cosmeticsState.spins})</span>
                    </button>
                  </div>
                </div>

                <RedeemCodeSection
                  ownedIds={props.cosmeticsState.ownedIds}
                  equipped={props.cosmeticsState.equipped}
                  reducedMotion={props.reducedMotion}
                  onUnlockReward={props.onUnlockRewardFromRedeem}
                  onEquipReward={props.onEquipRewardFromRedeem}
                  onPlayRevealSound={props.onPlayRevealSound}
                  onPlayFireSound={props.onPlayFireSound}
                  onPlayInfernoKillSound={props.onPlayInfernoKillSound}
                  onPlayVoidShotSound={props.onPlayVoidShotSound}
                  onPlayVoidKillSound={props.onPlayVoidKillSound}
                  onPlayVoidScopeSound={props.onPlayVoidScopeSound}
                  onPlayTempestShotSound={props.onPlayTempestShotSound}
                  onPlayTempestKillSound={props.onPlayTempestKillSound}
                  onPlayTempestReloadPhaseSound={props.onPlayTempestReloadPhaseSound}
                  onPlayTempestInspectSound={props.onPlayTempestInspectSound}
                  onPlayTempestEmoteSound={props.onPlayTempestEmoteSound}
                />
              </div>
            )}

            {/* 7. APPEARANCE & UI VERSION */}
            {activeCategory === 'appearance' && (
              <div className="uiv2-settings-stack" data-testid="uiv2-panel-appearance">
                <UiVersionSwitch
                  preferredUi={props.preferredUi}
                  activeUi={props.activeUi}
                  pendingNoticeFa={props.pendingUiSwitchNotice}
                  variant="v2"
                  onSelectUi={(next) => {
                    props.onFeedback('toggle');
                    props.onSelectUiVersion(next);
                  }}
                />

                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-reduced-motion">کاهش حرکت و افکت‌ها (Reduced Motion)</label>
                    <small>ساده‌سازی انیمیشن‌های UI و کاهش تکان دوربین و ذرات</small>
                  </div>
                  <ToggleSwitchV2
                    id="v2-opt-reduced-motion"
                    testId="opt-reduced-motion"
                    checked={props.reducedMotion}
                    label="کاهش حرکت"
                    onChange={(next) => {
                      props.onFeedback('toggle');
                      props.onToggleReducedMotion(next);
                    }}
                  />
                </div>

                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-ui-haptics">لرزش خیلی کوتاه لمس دکمه‌ها (UI Haptics)</label>
                    <small>در صورت پشتیبانی گوشی و روشن بودن لرزش کلی</small>
                  </div>
                  <ToggleSwitchV2
                    id="v2-opt-ui-haptics"
                    testId="uiv2-opt-haptics"
                    checked={props.uiPrefs.uiHaptics}
                    label="لرزش لمس منو"
                    onChange={(next) => props.onToggleUiHaptics(next)}
                  />
                </div>

                <div className="uiv2-row">
                  <div className="uiv2-row-info">
                    <label htmlFor="v2-opt-ui-sound">صدای ظریف کلیک دکمه‌ها</label>
                  </div>
                  <ToggleSwitchV2
                    id="v2-opt-ui-sound"
                    testId="uiv2-opt-click-sound"
                    checked={props.uiPrefs.uiClickSound}
                    label="صدای کلیک دکمه‌ها"
                    onChange={(next) => props.onToggleUiClickSound(next)}
                  />
                </div>

                <div className="uiv2-row uiv2-danger-row">
                  <div className="uiv2-row-info">
                    <strong>بازنشانی تمام تنظیمات بازی به پیش‌فرض</strong>
                    <small>گرافیک، حساسیت، Aim Assist، کراس‌هیر، صدا و چیدمان کنترل‌ها</small>
                  </div>
                  {!confirmResetAll ? (
                    <button
                      type="button"
                      data-testid="btn-reset-all-settings"
                      className="uiv2-btn uiv2-btn-danger uiv2-btn-sm"
                      onClick={() => {
                        props.onFeedback('back');
                        setConfirmResetAll(true);
                      }}
                    >
                      ریست همهٔ تنظیمات
                    </button>
                  ) : (
                    <div className="uiv2-inline-actions">
                      <button
                        type="button"
                        data-testid="btn-confirm-reset-all-settings"
                        className="uiv2-btn uiv2-btn-danger uiv2-btn-sm"
                        onClick={() => {
                          props.onFeedback('back');
                          props.onResetAllSettings();
                          setConfirmResetAll(false);
                        }}
                      >
                        تایید ریست
                      </button>
                      <button
                        type="button"
                        data-testid="btn-cancel-reset-all-settings"
                        className="uiv2-btn uiv2-btn-ghost uiv2-btn-sm"
                        onClick={() => setConfirmResetAll(false)}
                      >
                        انصراف
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Re-export DEFAULT_LOADOUT reference check for consumers
export { DEFAULT_LOADOUT };
