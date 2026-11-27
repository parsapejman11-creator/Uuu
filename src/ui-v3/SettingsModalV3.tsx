import React, { Suspense, startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_CHEAT_CONFIG,
  MAP_LIST,
  SLIDE_COOLDOWN_SEC,
  WEAPON_CATALOG,
  buildRoomInviteUrl,
  formatConnectionStatusFa,
  getCurrentOriginShareBaseUrl,
  verifyCheatPasscode,
  type BotDifficultyPreset,
  type HudLayoutPreset,
  type MapId,
} from '../game/rules';
import type { CrosshairStyle } from '../game/controlLayout';
import type { VoiceChannelScope, VoiceMode } from '../game/voiceChat';
import {
  DEFAULT_GFX_PRESET,
  detectIsMobileDevice,
  getDefaultViewDistanceForPreset,
  resolveDefaultSkinFxMode,
  type SkinFxMode,
  type ViewDistanceMode,
} from '../game/perf';
import { OG_FEATURE_FLAGS, getOgAllowedMaps } from '../og/og.config';
import { measureModalOpenPaint } from '../utils/perfHelpers';
import { useUiV3 } from './UiV3Context';
import { lazyWithPreload } from '../utils/lazyWithPreload';
import { type HudControlsStyle, type UiV3GfxPresetName } from './uiV3Store';
import {
  IN_MATCH_SPIN_HINT_FA,
  canOpenSpinWheel,
  isMatchInProgress,
  resolveTransparencyUiState,
} from './stage2Helpers';
import { UiModeSwitcher3Way } from './UiModeSwitcher3Way';
import {
  BidiText,
  GlassButton,
  GlassDisclosure,
  GlassModal,
  GlassSlider,
  GlassSwitch,
} from './primitives';
import {
  IconCpu,
  IconFullscreen,
  IconGamepad,
  IconGlassLayers,
  IconInfo,
  IconPalette,
  IconReset,
  IconShield,
  IconSparkles,
  IconVolume,
  IconWeapon,
} from './icons';

const RedeemCodeSection = lazyWithPreload(() =>
  import('../components/RedeemCodeSection').then((m) => ({ default: m.RedeemCodeSection }))
);

export function preloadSettingsV3Deps(): Promise<void> {
  return RedeemCodeSection.preload();
}

export type SettingsV3CategoryId =
  | 'appearance'
  | 'graphics'
  | 'controls'
  | 'loadout'
  | 'audio'
  | 'advanced';

const CATEGORIES: ReadonlyArray<{
  id: SettingsV3CategoryId;
  label: string;
  icon: React.ReactNode;
}> = [
  { id: 'appearance', label: 'ظاهر', icon: <IconGlassLayers size={18} /> },
  { id: 'graphics', label: 'گرافیک', icon: <IconCpu size={18} /> },
  { id: 'controls', label: 'کنترل‌ها', icon: <IconGamepad size={18} /> },
  { id: 'loadout', label: 'سلاح و مپ', icon: <IconWeapon size={18} /> },
  { id: 'audio', label: 'صدا و آنلاین', icon: <IconVolume size={18} /> },
  { id: 'advanced', label: 'چیت و ریست', icon: <IconShield size={18} /> },
];

const GFX_PRESET_CARDS: ReadonlyArray<{
  id: UiV3GfxPresetName;
  title: string;
  sub: string;
  flagship?: boolean;
}> = [
  { id: 'auto', title: 'خودکار', sub: 'بهینه + ۵ثانیه' },
  { id: 'lite', title: 'سبک', sub: '60 FPS' },
  { id: 'promax', title: 'Pro Max', sub: '165%', flagship: true },
  { id: 'ultramax', title: 'Ultra Max', sub: '145%', flagship: true },
  { id: 'ultra', title: 'Ultra', sub: '125%' },
  { id: 'high', title: 'High', sub: '100%' },
  { id: 'med', title: 'Medium', sub: '75%' },
  { id: 'low', title: 'Low', sub: '55%' },
  { id: 'potato', title: 'Potato', sub: '45%' },
];

interface CompactSelectTileProps {
  id: string;
  label: string;
  description?: string;
  value: string;
  onChange: (val: string) => void;
  testId?: string;
  children: React.ReactNode;
}

const CompactSelectTile: React.FC<CompactSelectTileProps> = React.memo(
  ({ id, label, description, value, onChange, testId, children }) => {
    const [infoOpen, setInfoOpen] = useState(false);
    return (
      <div className="uiv3-compact-select-tile" dir="rtl">
        <div className="uiv3-setting-title-line">
          <label htmlFor={id} className="uiv3-setting-title">
            <BidiText text={label} />
          </label>
          {description && (
            <button
              type="button"
              className={`uiv3-info-btn ${infoOpen ? 'is-open' : ''}`}
              aria-label={`توضیح ${label}`}
              aria-expanded={infoOpen}
              title={description}
              onClick={() => setInfoOpen((prev) => !prev)}
            >
              <IconInfo size={12} />
            </button>
          )}
        </div>
        {infoOpen && description && (
          <div className="uiv3-setting-desc">
            <BidiText text={description} />
          </div>
        )}
        <select
          id={id}
          data-testid={testId}
          className="uiv3-select uiv3-select-compact"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {children}
        </select>
      </div>
    );
  }
);

const AppearanceTab: React.FC = React.memo(() => {
  const { state, dispatch, showToast } = useUiV3();

  const transparencyUi = useMemo(
    () =>
      resolveTransparencyUiState({
        manualReduceTransparency: state.uiV3Prefs.reduceTransparency,
        gfxPreset: state.gfxState.preset,
        glassReason: state.glassResolution.reason,
        autoTransparencyOverridden: state.autoTransparencyOverridden,
      }),
    [
      state.uiV3Prefs.reduceTransparency,
      state.gfxState.preset,
      state.glassResolution.reason,
      state.autoTransparencyOverridden,
    ]
  );

  const handleToggleTransparency = (next: boolean) => {
    dispatch({ type: 'FEEDBACK', kind: 'toggle' });
    if (next) {
      dispatch({ type: 'SET_AUTO_TRANSPARENCY_OVERRIDE', overridden: false });
      dispatch({ type: 'SET_REDUCE_TRANSPARENCY', enabled: true });
      showToast('کاهش شفافیت فعال شد', 'info');
    } else {
      dispatch({ type: 'SET_REDUCE_TRANSPARENCY', enabled: false });
      dispatch({ type: 'SET_AUTO_TRANSPARENCY_OVERRIDE', overridden: true });
      showToast('شفافیت شیشهٔ مایع فعال شد', 'info');
    }
  };

  return (
    <div className="uiv3-settings-stack is-compact" data-testid="uiv3-settings-panel-appearance">
      <div className="uiv3-glass-group is-compact">
        <UiModeSwitcher3Way
          preferredUi={state.preferredUi}
          activeUi={state.activeUi}
          pendingNoticeFa={state.pendingUiSwitchNotice}
          variant="v3"
          onSelectUi={(mode) => {
            dispatch({ type: 'FEEDBACK', kind: 'confirm' });
            dispatch({ type: 'SELECT_UI_MODE', mode });
          }}
        />
      </div>

      <div className="uiv3-glass-group is-compact">
        <div className="uiv3-group-head">
          <span className="uiv3-group-title">شفافیت، حرکت و بازخورد</span>
          <span className="uiv3-glass-readout-text" data-testid="uiv3-glass-mode-readout">
            <BidiText text={state.glassResolution.labelFa} />
          </span>
        </div>

        <div className="uiv3-compact-grid">
          <GlassSwitch
            id="uiv3-opt-reduce-transparency"
            data-testid="uiv3-opt-reduce-transparency"
            checked={transparencyUi.switchChecked}
            onChange={handleToggleTransparency}
            label="کاهش شفافیت"
            description="تبدیل پنل‌های شیشه‌ای به سطح نیمه‌مات با کنتراست بالا و خاموش کردن تارشدگی"
            compactInfo
            footerSlot={
              transparencyUi.autoReasonFa ? (
                <div className="uiv3-auto-reason-bar" data-testid="uiv3-auto-transparency-reason">
                  <span>{transparencyUi.autoReasonFa}</span>
                  {transparencyUi.canDisableAuto && (
                    <button
                      type="button"
                      className="uiv3-auto-reason-btn"
                      data-testid="uiv3-btn-disable-auto-transparency"
                      onClick={() => handleToggleTransparency(false)}
                    >
                      خاموش کردن
                    </button>
                  )}
                </div>
              ) : null
            }
          />

          <GlassSwitch
            id="uiv3-opt-reduced-motion"
            data-testid="opt-reduced-motion"
            checked={state.reducedMotion}
            onChange={(enabled) => {
              dispatch({ type: 'FEEDBACK', kind: 'toggle' });
              dispatch({ type: 'SET_REDUCED_MOTION', enabled });
            }}
            label="کاهش حرکت و افکت‌ها"
            description="ساده‌سازی انیمیشن‌های UI، کاهش تکان دوربین و ذرات برای FPS بالاتر"
            compactInfo
          />

          <GlassSwitch
            id="uiv3-opt-click-sound"
            data-testid="uiv3-opt-click-sound"
            checked={state.uiV3Prefs.uiClickSound}
            onChange={(enabled) => {
              dispatch({ type: 'SET_UI_CLICK_SOUND', enabled });
            }}
            label="صدای لمس منو"
            description="کلیک کوتاه هنگام لمس دکمه‌های رابط کاربری"
            compactInfo
          />

          <GlassSwitch
            id="uiv3-opt-haptics"
            data-testid="uiv3-opt-haptics"
            checked={state.uiV3Prefs.uiHaptics}
            onChange={(enabled) => {
              dispatch({ type: 'SET_UI_HAPTICS', enabled });
            }}
            label="لرزش لمس منو (Haptics)"
            description="لرزش بسیار کوتاه روی موبایل هنگام لمس دکمه‌ها"
            compactInfo
          />
        </div>

        <div className="uiv3-compact-action-row">
          <span className="uiv3-setting-title">نمایش تمام‌صفحه</span>
          <GlassButton
            id="btn-toggle-fullscreen"
            data-testid="btn-toggle-fullscreen"
            variant="secondary"
            size="sm"
            icon={<IconFullscreen size={14} />}
            onClick={() => {
              dispatch({ type: 'FEEDBACK', kind: 'tap' });
              dispatch({ type: 'TOGGLE_FULLSCREEN' });
            }}
          >
            {state.isFullscreen ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه'}
          </GlassButton>
        </div>
      </div>
    </div>
  );
});

const GraphicsTab: React.FC = React.memo(() => {
  const { state, dispatch } = useUiV3();
  const { gfxState } = state;
  return (
    <div className="uiv3-settings-stack is-compact" data-testid="uiv3-settings-panel-graphics">
      <div className="uiv3-glass-group is-compact">
        <div className="uiv3-group-head">
          <span className="uiv3-group-title">سطح گرافیک</span>
          <span className="uiv3-glass-readout-text" dir="ltr">
            {gfxState.preset.toUpperCase()}
          </span>
        </div>

        <div className="uiv3-preset-grid is-compact">
          {GFX_PRESET_CARDS.map((p) => (
            <button
              key={p.id}
              type="button"
              data-testid={`gfx-preset-${p.id}`}
              className={`uiv3-preset-tile ${p.flagship ? 'is-flagship' : ''} ${gfxState.preset === p.id ? 'is-active' : ''}`}
              onClick={() => {
                dispatch({ type: 'FEEDBACK', kind: 'tap' });
                dispatch({ type: 'APPLY_GFX_PRESET', preset: p.id });
              }}
            >
              <strong dir="ltr">{p.title}</strong>
              <span dir="ltr">{p.sub}</span>
            </button>
          ))}
        </div>

        <div className="uiv3-compact-grid">
          <CompactSelectTile
            id="uiv3-opt-res"
            testId="uiv3-opt-res"
            label="رزولوشن رندر"
            value={String(gfxState.resScale)}
            onChange={(val) => dispatch({ type: 'UPDATE_GFX', partial: { resScale: parseFloat(val) } })}
          >
            <option value="2">200% (4K Pro Max)</option>
            <option value="1.65">165% (Ultra Max Pro Max)</option>
            <option value="1.45">145% (Ultra Max)</option>
            <option value="1.25">125% (Ultra)</option>
            <option value="1">100% (Full HD)</option>
            <option value="0.75">75% (استاندارد)</option>
            <option value="0.55">55% (سبک)</option>
            <option value="0.45">45% (فوق‌سبک)</option>
          </CompactSelectTile>

          <CompactSelectTile
            id="uiv3-opt-shadows"
            testId="uiv3-opt-shadows"
            label="کیفیت سایه‌ها"
            value={gfxState.shadowMode}
            onChange={(val) =>
              dispatch({
                type: 'UPDATE_GFX',
                partial: { shadowMode: val as 'ultra' | 'soft' | 'basic' | 'off' },
              })
            }
          >
            <option value="ultra">اولترا 4K (4096px)</option>
            <option value="soft">بالا (2048px)</option>
            <option value="basic">متوسط (1024px)</option>
            <option value="off">خاموش (حداکثر FPS)</option>
          </CompactSelectTile>

          <CompactSelectTile
            id="uiv3-opt-fps"
            testId="uiv3-opt-fps"
            label="سقف فریم‌ریت (FPS)"
            value={String(gfxState.targetFps)}
            onChange={(val) =>
              dispatch({ type: 'UPDATE_GFX', partial: { targetFps: parseInt(val, 10) } })
            }
          >
            <option value="0">نامحدود (Max FPS)</option>
            <option value="60">60 FPS</option>
            <option value="45">45 FPS</option>
            <option value="30">30 FPS</option>
          </CompactSelectTile>

          <CompactSelectTile
            id="uiv3-opt-view-distance"
            testId="opt-view-distance"
            label="فاصله دید (Draw Distance)"
            value={state.viewDistanceMode}
            onChange={(val) =>
              dispatch({ type: 'SET_VIEW_DISTANCE_MODE', mode: val as ViewDistanceMode })
            }
          >
            <option value="near">نزدیک (حداکثر FPS)</option>
            <option value="med">متوسط (متعادل)</option>
            <option value="far">دور (نمای کامل)</option>
          </CompactSelectTile>

          <GlassSlider
            id="uiv3-opt-vibrance"
            data-testid="uiv3-opt-vibrance"
            label="شدت رنگ HDR"
            value={gfxState.vibrance}
            min={1.0}
            max={1.85}
            step={0.05}
            valueLabel={`${Math.round(gfxState.vibrance * 100)}%`}
            onChange={(vibrance) => dispatch({ type: 'UPDATE_GFX', partial: { vibrance } })}
            compactInfo
          />
        </div>
      </div>

      <GlassDisclosure
        title="بهینه‌سازی، صرفه‌جویی باتری و افکت‌ها"
        meta="8 گزینه"
        data-testid="uiv3-gfx-advanced-disclosure"
      >
        <div className="uiv3-compact-grid">
          <GlassSwitch
            id="uiv3-opt-auto-quality"
            data-testid="opt-auto-quality"
            checked={state.autoQuality}
            onChange={(enabled) => dispatch({ type: 'SET_AUTO_QUALITY', enabled })}
            label="کیفیت خودکار (Auto Quality)"
            description="تنظیم پویای رزولوشن (60% تا 100%) و کاهش خودکار افکت‌ها هنگام افت FPS"
            compactInfo
          />

          <GlassSwitch
            id="uiv3-opt-battery-saver"
            data-testid="opt-battery-saver"
            checked={state.batterySaver}
            onChange={(enabled) => dispatch({ type: 'SET_BATTERY_SAVER', enabled })}
            label="صرفه‌جویی باتری و گرما"
            description="محدود کردن DPR به 1.0، سقف فریم 45، خاموش کردن سایه و بازتاب و کاهش ذرات برای جلوگیری از داغ شدن گوشی"
            compactInfo
          />

          <CompactSelectTile
            id="uiv3-opt-skin-fx-mode"
            testId="opt-skin-fx-mode"
            label="افکت‌های اسکین (VFX)"
            description="در حالت خاموش، مدل سه‌بعدی اسکین حفظ می‌شود ولی ذرات خاموش‌اند"
            value={state.skinFxMode}
            onChange={(val) => dispatch({ type: 'SET_SKIN_FX_MODE', mode: val as SkinFxMode })}
          >
            <option value="off">خاموش (حداکثر FPS)</option>
            <option value="simple">ساده (پیشنهاد موبایل)</option>
            <option value="full">کامل (دسکتاپ قوی)</option>
          </CompactSelectTile>

          <GlassSwitch
            id="uiv3-opt-bodycam"
            data-testid="uiv3-opt-bodycam"
            checked={gfxState.bodycamFx}
            onChange={(bodycamFx) => dispatch({ type: 'UPDATE_GFX', partial: { bodycamFx } })}
            label="لنز بادیکم (Bodycam Lens)"
            compactInfo
          />

          <GlassSwitch
            id="uiv3-opt-flashlight"
            data-testid="uiv3-opt-flashlight"
            checked={gfxState.flashlightOn}
            onChange={(flashlightOn) => dispatch({ type: 'UPDATE_GFX', partial: { flashlightOn } })}
            label="چراغ‌قوه تاکتیکی"
            compactInfo
          />

          <GlassSwitch
            id="uiv3-opt-show-ad-billboards"
            data-testid="opt-show-ad-billboards"
            checked={state.showAdBillboards}
            onChange={(enabled) => dispatch({ type: 'SET_SHOW_AD_BILLBOARDS', enabled })}
            label="نمایش بیلبوردها"
            description="تابلوهای تزئینی کوچک روی دیوارهای مپ (بدون اثر بر گیم‌پلی)"
            compactInfo
          />

          <GlassSwitch
            id="uiv3-opt-show-fps-hud"
            data-testid="opt-show-fps-hud"
            checked={state.showFpsHud}
            onChange={(enabled) => dispatch({ type: 'SET_SHOW_FPS_HUD', enabled })}
            label="شمارنده FPS روی صفحه"
            description="نمایش نرخ فریم در گوشهٔ صفحهٔ بازی"
            compactInfo
          />

          <GlassSwitch
            id="uiv3-opt-show-perf-profiler"
            data-testid="opt-show-perf-profiler"
            checked={state.showPerfProfiler}
            onChange={(enabled) => dispatch({ type: 'SET_SHOW_PERF_PROFILER', enabled })}
            label="پنل عملکرد (Profiler)"
            description="نمایش زنده FPS، زمان فریم، Draw Calls، مثلث‌ها، حافظه و پینگ"
            compactInfo
          />
        </div>
      </GlassDisclosure>
    </div>
  );
});

const ControlsTab: React.FC = React.memo(() => {
  const { state, dispatch, showToast } = useUiV3();
  return (
    <div className="uiv3-settings-stack is-compact" data-testid="uiv3-settings-panel-controls">
      <div className="uiv3-glass-group is-compact">
        <div className="uiv3-group-head">
          <span className="uiv3-group-title">حساسیت و نشانه‌گیری</span>
        </div>

        <div className="uiv3-compact-grid">
          <GlassSlider
            id="uiv3-opt-sens"
            data-testid="uiv3-opt-sens"
            label="حساسیت دوربین"
            value={state.sensitivity}
            min={0.3}
            max={8.0}
            step={0.05}
            valueLabel={`${Math.round(state.sensitivity * 100)}%`}
            onChange={(value) => dispatch({ type: 'SET_SENSITIVITY', value })}
            compactInfo
          />

          <GlassSlider
            id="uiv3-opt-ads-sens"
            data-testid="uiv3-opt-ads-sens"
            label="حساسیت ADS و اسنایپ"
            value={state.adsSensitivity}
            min={0.2}
            max={4.0}
            step={0.05}
            valueLabel={`${Math.round(state.adsSensitivity * 100)}%`}
            onChange={(value) => dispatch({ type: 'SET_ADS_SENSITIVITY', value })}
            compactInfo
          />

          <GlassSlider
            id="uiv3-opt-soft-aim-assist"
            data-testid="opt-soft-aim-assist"
            label="کمک نشانه‌گیری (Aim Assist)"
            description={
              state.onlineRoom?.aimAssistAllowed === false
                ? 'در این اتاق توسط میزبان غیرفعال شده است'
                : 'هدایت نرم روی حریفان آنلاین و بات‌ها (هرگز روی هم‌تیمی‌ها عمل نمی‌کند)'
            }
            value={state.aimAssistStrength}
            min={0}
            max={100}
            step={5}
            valueLabel={`${state.aimAssistStrength}%`}
            onChange={(value) => dispatch({ type: 'SET_AIM_ASSIST_STRENGTH', value })}
            compactInfo
          />

          <GlassSlider
            id="uiv3-opt-camera-motion"
            data-testid="opt-camera-motion-intensity"
            label="شدت حرکت دوربین"
            description="تکان ملایم هنگام راه رفتن، دویدن، فرود، شلیک و اسلاید (0% = خاموش)"
            value={state.cameraMotionIntensity}
            min={0}
            max={100}
            step={5}
            valueLabel={state.cameraMotionIntensity === 0 ? 'خاموش' : `${state.cameraMotionIntensity}%`}
            onChange={(value) => dispatch({ type: 'SET_CAMERA_MOTION_INTENSITY', value })}
            compactInfo
          />
        </div>
      </div>

      <div className="uiv3-glass-group is-compact">
        <div className="uiv3-group-head">
          <span className="uiv3-group-title">چیدمان لمسی و HUD</span>
          <div className="uiv3-btn-inline-pair">
            <GlassButton
              data-testid="btn-open-layout-editor"
              variant="accent"
              size="sm"
              onClick={() => {
                dispatch({ type: 'FEEDBACK', kind: 'tap' });
                dispatch({ type: 'OPEN_LAYOUT_EDITOR' });
              }}
            >
              ویرایش چیدمان
            </GlassButton>
            <GlassButton
              data-testid="btn-settings-reset-layout"
              variant="subtle"
              size="sm"
              onClick={() => {
                dispatch({ type: 'FEEDBACK', kind: 'tap' });
                dispatch({ type: 'RESET_CONTROL_LAYOUT' });
                showToast('چیدمان لمسی به پیش‌فرض برگشت', 'info');
              }}
            >
              پیش‌فرض
            </GlassButton>
          </div>
        </div>

        <div className="uiv3-compact-grid">
          <CompactSelectTile
            id="uiv3-opt-layout"
            label="الگوی چیدمان دکمه‌ها"
            description="تنظیم جداگانه برای UI v3 بدون دست زدن به چیدمان UI قدیمی"
            value={state.hudLayout}
            onChange={(val) => dispatch({ type: 'SET_HUD_LAYOUT', preset: val as HudLayoutPreset })}
          >
            <option value="standard">استاندارد ارگونومیک (راست‌دست)</option>
            <option value="claw">حرفه‌ای چهارانگشتی (Claw)</option>
            <option value="lefthanded">چپ‌دست (جوی‌استیک راست)</option>
          </CompactSelectTile>

          <CompactSelectTile
            id="uiv3-opt-touch"
            label="حالت کنترل لمسی"
            value={state.touchSetting}
            onChange={(val) => dispatch({ type: 'SET_TOUCH_SETTING', mode: val as 'auto' | 'on' | 'off' })}
          >
            <option value="auto">لمسی خودکار</option>
            <option value="on">لمسی همیشه روشن</option>
            <option value="off">لمسی خاموش</option>
          </CompactSelectTile>

          <CompactSelectTile
            id="uiv3-opt-controls-style"
            testId="uiv3-opt-controls-style"
            label="ظاهر دکمه‌های لمسی (تیر، نشانه، پرش)"
            description="«کلاسیک» ظاهر ساده و غیرشیشه‌ای رابط قدیمی را برای گوشی‌های ضعیف‌تر یا سلیقهٔ ساده اعمال می‌کند"
            value={state.uiV3Prefs.controlsStyle}
            onChange={(val) => {
              dispatch({ type: 'FEEDBACK', kind: 'toggle' });
              dispatch({ type: 'SET_CONTROLS_STYLE', style: val as HudControlsStyle });
            }}
          >
            <option value="glass">لیکوید گلس (شیشه‌ای)</option>
            <option value="classic">کلاسیک · رابط قدیمی (غیرشیشه‌ای و سبک)</option>
          </CompactSelectTile>

          <GlassSlider
            id="uiv3-opt-hud-scale"
            data-testid="uiv3-opt-hud-scale"
            label="اندازه HUD و کنترل‌ها"
            value={state.hudScale}
            min={0.75}
            max={1.4}
            step={0.05}
            valueLabel={`${Math.round(state.hudScale * 100)}%`}
            onChange={(value) => dispatch({ type: 'SET_HUD_SCALE', value })}
            compactInfo
          />

          <GlassSlider
            id="uiv3-opt-hud-opacity"
            data-testid="uiv3-opt-hud-opacity"
            label="شفافیت HUD و کنترل‌ها"
            value={state.hudOpacity}
            min={0.35}
            max={1.0}
            step={0.05}
            valueLabel={`${Math.round(state.hudOpacity * 100)}%`}
            onChange={(value) => dispatch({ type: 'SET_HUD_OPACITY', value })}
            compactInfo
          />

          <GlassSwitch
            id="uiv3-opt-minimal-hud"
            data-testid="uiv3-opt-minimal-hud"
            checked={state.uiV3Prefs.minimalHud}
            onChange={(enabled) => {
              dispatch({ type: 'FEEDBACK', kind: 'toggle' });
              dispatch({ type: 'SET_MINIMAL_HUD', enabled });
            }}
            label="HUD مینیمال"
            description="پنهان کردن رادار، Kill Feed و اعلان‌های غیرضروری برای دید حداکثری"
            compactInfo
          />
        </div>
      </div>

      <GlassDisclosure
        title="کراس‌هیر، هوش بات‌ها و حرکت پیشرفته"
        meta="7 گزینه"
        data-testid="uiv3-controls-advanced-disclosure"
      >
        <div className="uiv3-compact-grid">
          <GlassSlider
            id="uiv3-opt-crosshair-size"
            data-testid="opt-crosshair-size"
            label="اندازه کراس‌هیر"
            value={state.crosshairSize}
            min={0.5}
            max={1.8}
            step={0.1}
            valueLabel={`${Math.round(state.crosshairSize * 100)}%`}
            onChange={(value) => dispatch({ type: 'SET_CROSSHAIR_SIZE', value })}
            compactInfo
          />

          <CompactSelectTile
            id="uiv3-opt-crosshair-style"
            testId="opt-crosshair-style"
            label="شکل کراس‌هیر"
            value={state.crosshairStyle}
            onChange={(val) => dispatch({ type: 'SET_CROSSHAIR_STYLE', style: val as CrosshairStyle })}
          >
            <option value="cross">خطوط نازک مینیمال</option>
            <option value="dot">نقطه ساده</option>
          </CompactSelectTile>

          <CompactSelectTile
            id="uiv3-opt-botdiff"
            label="هوش بات‌ها (Bot AI)"
            value={state.botDifficulty}
            onChange={(val) => dispatch({ type: 'SET_BOT_DIFFICULTY', difficulty: val as BotDifficultyPreset })}
          >
            <option value="weak">ضعیف (مبتدی)</option>
            <option value="medium">متوسط (تاکتیکی)</option>
            <option value="strong">قوی (کماندو حرفه‌ای)</option>
          </CompactSelectTile>

          <GlassSwitch
            id="uiv3-opt-show-lean"
            data-testid="opt-show-lean-buttons"
            checked={state.showLeanHudButtons}
            onChange={(enabled) => dispatch({ type: 'SET_SHOW_LEAN_BUTTONS', enabled })}
            label="دکمه‌های خم شدن (Z/X)"
            description="حتی در حالت خاموش، کلیدهای Z/X و خم شدن هوشمند فعال‌اند"
            compactInfo
          />

          <GlassSwitch
            id="uiv3-opt-auto-reload"
            data-testid="opt-auto-reload"
            checked={state.autoReloadEnabled}
            onChange={(enabled) => dispatch({ type: 'SET_AUTO_RELOAD', enabled })}
            label="ریلود خودکار"
            compactInfo
          />

          <GlassSwitch
            id="uiv3-opt-vibration"
            data-testid="opt-vibration"
            checked={state.vibrationEnabled}
            onChange={(enabled) => dispatch({ type: 'SET_VIBRATION', enabled })}
            label="لرزش گوشی (Vibration)"
            description="لرزش کوتاه هنگام اصابت تیر، کشتن حریف و آسیب دیدن"
            compactInfo
          />

          <GlassSwitch
            id="uiv3-opt-slide-alpha"
            data-testid="opt-slide-alpha"
            checked={state.slideAlphaEnabled}
            onChange={(enabled) => dispatch({ type: 'SET_SLIDE_ALPHA', enabled })}
            label="اسلاید تاکتیکی (Slide)"
            badge="BETA"
            description={
              state.onlineRoom?.slideAllowed === false
                ? 'در اتاق فعلی توسط میزبان غیرمجاز شده است'
                : `حین دویدن با کلید C یا دکمه اسلاید سر بخورید (کولداون ${SLIDE_COOLDOWN_SEC} ثانیه)`
            }
            compactInfo
          />
        </div>
      </GlassDisclosure>
    </div>
  );
});

const LoadoutTab: React.FC = React.memo(() => {
  const { state, dispatch, showToast } = useUiV3();
  const inMatch = isMatchInProgress(state.screenState);
  const spinAllowed = canOpenSpinWheel(state.screenState, !state.isOgMode);
  const allowedMaps = useMemo(
    () => (state.isOgMode ? getOgAllowedMaps(true, OG_FEATURE_FLAGS) : MAP_LIST),
    [state.isOgMode]
  );
  return (
    <div className="uiv3-settings-stack is-compact" data-testid="uiv3-settings-panel-loadout">
      <div className="uiv3-glass-group is-compact">
        <div className="uiv3-compact-grid">
          <CompactSelectTile
            id="uiv3-opt-map"
            label="نقشه فعال عملیات"
            value={state.currentMap}
            onChange={(val) => dispatch({ type: 'SELECT_MAP', mapId: val as MapId })}
          >
            {allowedMaps.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nameFa} — {m.badgeFa}
              </option>
            ))}
          </CompactSelectTile>

          <div className="uiv3-compact-select-tile">
            <span className="uiv3-setting-title">{inMatch ? 'اسکین‌ها' : 'اسکین‌ها و گردونه'}</span>
            <div className="uiv3-btn-inline-pair">
              {!state.isOgMode && (
                <GlassButton
                  data-testid="btn-open-skins-settings"
                  variant="secondary"
                  size="sm"
                  icon={<IconPalette size={15} />}
                  onClick={() => {
                    dispatch({ type: 'FEEDBACK', kind: 'tap' });
                    dispatch({ type: 'OPEN_SKINS' });
                  }}
                >
                  اسکین‌ها
                </GlassButton>
              )}
              {spinAllowed && (
                <GlassButton
                  data-testid="uiv3-btn-open-spin-settings"
                  variant="accent"
                  size="sm"
                  icon={<IconSparkles size={15} />}
                  onClick={() => {
                    dispatch({ type: 'FEEDBACK', kind: 'tap' });
                    dispatch({ type: 'OPEN_SPIN' });
                  }}
                >
                  اسپین ({state.cosmeticsState.spins})
                </GlassButton>
              )}
            </div>
            {inMatch && !state.isOgMode && (
              <div className="uiv3-setting-desc uiv3-spin-hint" data-testid="uiv3-inmatch-spin-hint">
                {IN_MATCH_SPIN_HINT_FA}
              </div>
            )}
          </div>
        </div>

        <div className="uiv3-group-head">
          <span className="uiv3-group-title">
            چیدمان 3 سلاح ({state.loadout.length}/{WEAPON_CATALOG.length})
          </span>
          <GlassButton
            variant="subtle"
            size="sm"
            onClick={() => {
              dispatch({ type: 'RESET_LOADOUT' });
              showToast('چیدمان سلاح به پیش‌فرض برگشت', 'info');
            }}
          >
            بازنشانی سلاح‌ها
          </GlassButton>
        </div>

        <div className="uiv3-weapon-grid is-settings is-compact">
          {WEAPON_CATALOG.map((w) => {
            const slotIdx = state.loadout.indexOf(w.id);
            const equipped = slotIdx !== -1;
            return (
              <button
                key={w.id}
                type="button"
                data-testid={`settings-loadout-${w.id}`}
                aria-pressed={equipped}
                className={`uiv3-weapon-tile ${equipped ? 'is-equipped' : ''}`}
                onClick={() => {
                  dispatch({ type: 'FEEDBACK', kind: 'toggle' });
                  dispatch({ type: 'TOGGLE_LOADOUT_WEAPON', weaponId: w.id });
                }}
              >
                <div className="uiv3-weapon-tile-top">
                  <div className="uiv3-weapon-svg">{state.renderWeaponIconSvg(w.id)}</div>
                  {equipped && <span className="uiv3-slot-pill">{slotIdx + 1}</span>}
                </div>
                <strong className="uiv3-weapon-en" dir="ltr">
                  {w.nameEn}
                </strong>
                <span className="uiv3-weapon-fa">{w.nameFa}</span>
              </button>
            );
          })}
        </div>
      </div>

      {!state.isOgMode && (
        <GlassDisclosure title="کد هدیه و اسکین (Redeem Code)" data-testid="uiv3-loadout-redeem-disclosure">
          <Suspense fallback={<div className="uiv3-setting-desc">در حال بارگذاری بخش کد هدیه...</div>}>
            <RedeemCodeSection
              ownedIds={state.cosmeticsState.ownedIds}
              equipped={state.cosmeticsState.equipped}
              reducedMotion={state.reducedMotion}
              onUnlockReward={(rewardId) => dispatch({ type: 'UNLOCK_REDEEM_REWARD', rewardId })}
              onEquipReward={(rewardId) => dispatch({ type: 'EQUIP_REDEEM_REWARD', rewardId })}
              onPlayRevealSound={(rarity) => dispatch({ type: 'PLAY_REDEEM_SFX', sfx: 'reveal', arg: rarity })}
              onPlayFireSound={() => dispatch({ type: 'PLAY_REDEEM_SFX', sfx: 'ak' })}
              onPlayInfernoKillSound={(hs) => dispatch({ type: 'PLAY_REDEEM_SFX', sfx: 'infernoKill', arg: hs })}
              onPlayVoidShotSound={() => dispatch({ type: 'PLAY_REDEEM_SFX', sfx: 'voidShot' })}
              onPlayVoidKillSound={(hs) => dispatch({ type: 'PLAY_REDEEM_SFX', sfx: 'voidKill', arg: hs })}
              onPlayVoidScopeSound={(entering) => dispatch({ type: 'PLAY_REDEEM_SFX', sfx: 'voidScope', arg: entering })}
              onPlayTempestShotSound={(heat01) => dispatch({ type: 'PLAY_REDEEM_SFX', sfx: 'tempestShot', arg: heat01 })}
              onPlayTempestKillSound={(hs) => dispatch({ type: 'PLAY_REDEEM_SFX', sfx: 'tempestKill', arg: hs })}
              onPlayTempestReloadPhaseSound={(phase) => dispatch({ type: 'PLAY_REDEEM_SFX', sfx: 'tempestReload', arg: phase })}
              onPlayTempestInspectSound={() => dispatch({ type: 'PLAY_REDEEM_SFX', sfx: 'tempestInspect' })}
              onPlayTempestEmoteSound={() => dispatch({ type: 'PLAY_REDEEM_SFX', sfx: 'tempestEmote' })}
              onPlayEclipseShotSound={() => dispatch({ type: 'PLAY_REDEEM_SFX', sfx: 'eclipseShot' })}
              onPlayEclipseKillSound={(hs) => dispatch({ type: 'PLAY_REDEEM_SFX', sfx: 'eclipseKill', arg: hs })}
              onPlayEclipseReloadPhaseSound={(phase) => dispatch({ type: 'PLAY_REDEEM_SFX', sfx: 'eclipseReload', arg: phase })}
              onPlayEclipseSightSound={(entering) => dispatch({ type: 'PLAY_REDEEM_SFX', sfx: 'eclipseSight', arg: entering })}
              onPlayEclipseInspectSound={() => dispatch({ type: 'PLAY_REDEEM_SFX', sfx: 'eclipseInspect' })}
              onPlayEclipseEmoteSound={() => dispatch({ type: 'PLAY_REDEEM_SFX', sfx: 'eclipseEmote' })}
              onPlaySakuraSlashSound={() => dispatch({ type: 'PLAY_REDEEM_SFX', sfx: 'sakuraSlash' })}
              onPlaySakuraKillSound={(hs) => dispatch({ type: 'PLAY_REDEEM_SFX', sfx: 'sakuraKill', arg: hs })}
              onPlayNovaRpgLaunchSound={() => dispatch({ type: 'PLAY_REDEEM_SFX', sfx: 'novaRpgLaunch' })}
              onPlayNovaRpgExplosionSound={() => dispatch({ type: 'PLAY_REDEEM_SFX', sfx: 'novaRpgExplosion' })}
              onPlayNovaRpgKillSound={(hs) => dispatch({ type: 'PLAY_REDEEM_SFX', sfx: 'novaRpgKill', arg: hs })}
            />
          </Suspense>
        </GlassDisclosure>
      )}
    </div>
  );
});

const AudioOnlineTab: React.FC = React.memo(() => {
  const { state, dispatch, showToast } = useUiV3();
  const [copied, setCopied] = useState(false);
  const connStatus = useMemo(
    () => formatConnectionStatusFa(state.peerStatus, state.peerRole, state.onlineRoomError),
    [state.peerStatus, state.peerRole, state.onlineRoomError]
  );

  return (
    <div className="uiv3-settings-stack is-compact" data-testid="uiv3-settings-panel-audio">
      <div className="uiv3-glass-group is-compact">
        <div className="uiv3-group-head">
          <span className="uiv3-group-title">صدا و پروفایل</span>
        </div>

        <div className="uiv3-compact-grid">
          <GlassSwitch
            id="uiv3-opt-sound"
            checked={state.soundEnabled}
            onChange={(enabled) => dispatch({ type: 'SET_SOUND_ENABLED', enabled })}
            label="صدای کلی بازی"
            compactInfo
          />

          <GlassSlider
            id="uiv3-opt-footstep-volume"
            data-testid="opt-footstep-volume"
            label="صدای پای جهت‌دار"
            value={state.footstepVolume}
            min={0}
            max={1}
            step={0.05}
            valueLabel={`${Math.round(state.footstepVolume * 100)}%`}
            onChange={(value) => dispatch({ type: 'SET_FOOTSTEP_VOLUME', value })}
            compactInfo
          />

          <div className="uiv3-compact-select-tile">
            <label htmlFor="uiv3-opt-callsign" className="uiv3-setting-title">
              نام نمایشی (Callsign)
            </label>
            <input
              id="uiv3-opt-callsign"
              type="text"
              maxLength={18}
              className="uiv3-text-input uiv3-select-compact"
              value={state.onlinePlayerName}
              onChange={(e) => dispatch({ type: 'SET_ONLINE_PLAYER_NAME', name: e.target.value })}
              placeholder="نام شما..."
            />
          </div>

          <GlassSwitch
            id="uiv3-opt-show-ping-hud"
            data-testid="opt-show-ping-hud"
            checked={state.showPingHud}
            onChange={(enabled) => dispatch({ type: 'SET_SHOW_PING_HUD', enabled })}
            label="نمایش پینگ (ms)"
            description="نمایش تاخیر اتصال به میزبان در گوشه صفحه آنلاین"
            compactInfo
          />

          <GlassSwitch
            id="uiv3-opt-low-data-mode"
            data-testid="opt-low-data-mode"
            checked={state.lowDataMode}
            onChange={(enabled) => dispatch({ type: 'SET_LOW_DATA_MODE', enabled })}
            label="حالت داده کم (Low Data)"
            description="کاهش نرخ همگام‌سازی شبکه آنلاین به 8Hz، خاموش کردن چت صوتی و حذف افکت‌های شبکه"
            compactInfo
          />
        </div>

        {(state.onlineRoom || state.peerStatus !== 'idle') && (
          <div className="uiv3-room-pill-bar" data-testid="pause-room-bar">
            <div className="uiv3-room-pill-meta">
              <span className="uiv3-room-dot" style={{ background: connStatus.color }} />
              {state.onlineRoom ? (
                <span>
                  اتاق <strong data-testid="pause-room-code">{state.onlineRoom.code}</strong> ·{' '}
                  {state.onlineRoom.players.length} نفر · {connStatus.badgeFa}
                </span>
              ) : (
                <span>{connStatus.badgeFa}</span>
              )}
            </div>
            {state.onlineRoom && (
              <GlassButton
                data-testid="pause-copy-room-btn"
                variant="secondary"
                size="sm"
                onClick={() => {
                  const url = buildRoomInviteUrl(
                    getCurrentOriginShareBaseUrl(window.location.origin, window.location.pathname),
                    state.onlineRoom!.code
                  );
                  navigator.clipboard?.writeText(url).catch(() => {});
                  setCopied(true);
                  showToast('لینک دعوت اتاق کپی شد', 'success');
                  window.setTimeout(() => setCopied(false), 1600);
                }}
              >
                {copied ? 'کپی شد' : 'کپی لینک اتاق'}
              </GlassButton>
            )}
          </div>
        )}
      </div>

      <div className="uiv3-glass-group is-compact" data-testid="settings-voice-section">
        <div className="uiv3-group-head">
          <span className="uiv3-group-title">چت صوتی آنلاین (WebRTC)</span>
          <span className="uiv3-glass-readout-text">
            {state.voiceState.secureContextOk ? 'HTTPS آماده' : 'نیازمند HTTPS'}
          </span>
        </div>

        <div className="uiv3-compact-grid">
          <CompactSelectTile
            id="uiv3-opt-voice-mode"
            testId="opt-voice-mode"
            label="حالت میکروفون"
            description="فشار برای صحبت: کلید V یا دکمه میکروفون موبایل"
            value={state.voiceState.mode}
            onChange={(val) => dispatch({ type: 'SET_VOICE_MODE', mode: val as VoiceMode })}
          >
            <option value="open">میکروفون باز</option>
            <option value="ptt">فشار برای صحبت (PTT · V)</option>
          </CompactSelectTile>

          <CompactSelectTile
            id="uiv3-opt-voice-channel"
            testId="opt-voice-channel"
            label="کانال صدای تیمی"
            value={state.voiceState.channelScope}
            onChange={(val) =>
              dispatch({ type: 'SET_VOICE_CHANNEL_SCOPE', scope: val as VoiceChannelScope })
            }
          >
            <option value="team">فقط هم‌تیمی‌ها</option>
            <option value="all">همه بازیکنان اتاق</option>
          </CompactSelectTile>

          <GlassSlider
            id="uiv3-opt-voice-volume"
            data-testid="opt-voice-volume"
            label="ولوم صدای بازیکنان"
            value={state.voiceState.volume}
            min={0}
            max={1}
            step={0.05}
            valueLabel={`${Math.round(state.voiceState.volume * 100)}%`}
            onChange={(value) => dispatch({ type: 'SET_VOICE_VOLUME', value })}
            compactInfo
          />
        </div>

        {state.voiceState.lastErrorFa && (
          <div className="uiv3-error-banner" data-testid="settings-voice-error">
            {state.voiceState.lastErrorFa}
          </div>
        )}

        {state.onlineRoom && state.onlineRoom.players.length > 0 && (
          <div className="uiv3-voice-players">
            <div className="uiv3-setting-desc">بازیکنان اتاق ({state.onlineRoom.players.length} نفر):</div>
            {state.onlineRoom.players.map((p) => {
              const isMe = p.id === state.localOnlinePlayerId;
              const isSpeaking = state.voiceState.speakingPlayerIds.includes(p.id);
              const isMuted = state.voiceState.mutedPlayerIds.includes(p.id);
              return (
                <div key={p.id} className={`uiv3-voice-player-row ${isSpeaking ? 'is-speaking' : ''}`}>
                  <span className="uiv3-voice-player-name">
                    {p.name}
                    {isMe && <small> (شما)</small>}
                  </span>
                  {!isMe ? (
                    <GlassButton
                      data-testid={`btn-mute-player-${p.id}`}
                      variant={isMuted ? 'danger' : 'subtle'}
                      size="sm"
                      onClick={() => dispatch({ type: 'TOGGLE_MUTE_VOICE_PLAYER', playerId: p.id })}
                    >
                      {isMuted ? 'فعال کردن صدا' : 'میوت'}
                    </GlassButton>
                  ) : (
                    <span className="uiv3-glass-readout-text">
                      {state.voiceState.transmitting ? 'ارسال صدا' : 'میکروفون خاموش'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

const AdvancedTab: React.FC = React.memo(() => {
  const { state, dispatch, showToast } = useUiV3();
  const [confirmReset, setConfirmReset] = useState(false);

  const handleTryUnlock = () => {
    if (verifyCheatPasscode(state.cheatPasswordInput)) {
      dispatch({ type: 'UNLOCK_CHEATS' });
      showToast('قفل چیت‌ها به مدت 30 ثانیه باز شد', 'warn');
    } else {
      dispatch({
        type: 'SET_CHEAT_PASS_ERROR',
        message: 'رمز وارد شده صحیح نیست. ایم‌اسیست (10%) و چیت‌ها قفل هستند.',
      });
    }
  };

  return (
    <div className="uiv3-settings-stack is-compact" data-testid="uiv3-settings-panel-advanced">
      <div className="uiv3-glass-group is-compact">
        <div className="uiv3-group-head">
          <span className="uiv3-group-title">ایم‌اسیست قفل‌دار و چیت‌ها</span>
          <span className="uiv3-glass-readout-text" data-testid="locked-aim-assist-readout">
            {state.cheatUnlocked
              ? `باز · ${state.cheatUnlockRemainingSec}s`
              : `قفل روی ${state.cheatConfig.aimAssistStrength}%`}
          </span>
        </div>

        {!state.cheatUnlocked ? (
          <div className="uiv3-cheat-gate" data-testid="cheat-password-gate">
            <div className="uiv3-cheat-row">
              <input
                id="input-cheat-passcode"
                data-testid="input-cheat-passcode"
                type="password"
                className="uiv3-text-input"
                value={state.cheatPasswordInput}
                onChange={(e) => {
                  dispatch({ type: 'SET_CHEAT_PASSWORD_INPUT', value: e.target.value });
                  if (state.cheatPassError) dispatch({ type: 'SET_CHEAT_PASS_ERROR', message: null });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleTryUnlock();
                  }
                }}
                placeholder="رمز اختصاصی بازگشایی 30 ثانیه‌ای..."
              />
              <GlassButton data-testid="btn-unlock-cheats" variant="accent" size="sm" onClick={handleTryUnlock}>
                بازگشایی
              </GlassButton>
            </div>
            {state.cheatPassError && (
              <div className="uiv3-error-banner" data-testid="cheat-passcode-error">
                {state.cheatPassError}
              </div>
            )}
          </div>
        ) : (
          <div className="uiv3-cheat-unlocked">
            <div className="uiv3-cheat-timer" data-testid="cheat-unlock-timer">
              <span>قفل خودکار تا {state.cheatUnlockRemainingSec} ثانیه دیگر</span>
              <GlassButton
                data-testid="btn-relock-cheats"
                variant="danger"
                size="sm"
                onClick={() => dispatch({ type: 'RELOCK_CHEATS' })}
              >
                قفل فوری
              </GlassButton>
            </div>

            <div className="uiv3-compact-grid">
              <GlassSwitch
                id="uiv3-opt-aim-assist"
                checked={state.cheatConfig.aimAssistEnabled}
                onChange={(aimAssistEnabled) => dispatch({ type: 'UPDATE_CHEATS', partial: { aimAssistEnabled } })}
                label="ایم‌اسیست هوشمند"
                compactInfo
              />

              <GlassSlider
                id="uiv3-opt-aim-strength"
                label="قدرت ایم‌اسیست"
                value={state.cheatConfig.aimAssistStrength}
                min={0}
                max={100}
                step={5}
                valueLabel={`${state.cheatConfig.aimAssistStrength}%`}
                onChange={(aimAssistStrength) =>
                  dispatch({
                    type: 'UPDATE_CHEATS',
                    partial: { aimAssistStrength, aimAssistEnabled: aimAssistStrength > 0 },
                  })
                }
                compactInfo
              />

              <GlassSwitch
                id="uiv3-opt-aim-headshot"
                checked={state.cheatConfig.aimAssistHeadshot}
                onChange={(aimAssistHeadshot) => dispatch({ type: 'UPDATE_CHEATS', partial: { aimAssistHeadshot } })}
                label="قفل روی سر (Headshot)"
                compactInfo
              />
              <GlassSwitch
                id="uiv3-opt-cheat-ammo"
                checked={state.cheatConfig.infiniteAmmo}
                onChange={(infiniteAmmo) => dispatch({ type: 'UPDATE_CHEATS', partial: { infiniteAmmo } })}
                label="تیر بی‌نهایت"
                compactInfo
              />
              <GlassSwitch
                id="uiv3-opt-cheat-recoil"
                checked={state.cheatConfig.zeroRecoil}
                onChange={(zeroRecoil) => dispatch({ type: 'UPDATE_CHEATS', partial: { zeroRecoil } })}
                label="حذف لگد سلاح"
                compactInfo
              />
              <GlassSwitch
                id="uiv3-opt-cheat-god"
                checked={state.cheatConfig.godMode}
                onChange={(godMode) => dispatch({ type: 'UPDATE_CHEATS', partial: { godMode } })}
                label="ضدضربه (God Mode)"
                compactInfo
              />
              <GlassSwitch
                id="uiv3-opt-cheat-esp"
                checked={state.cheatConfig.espWallhack}
                onChange={(espWallhack) => dispatch({ type: 'UPDATE_CHEATS', partial: { espWallhack } })}
                label="رادار ESP دشمنان"
                compactInfo
              />
              <GlassSwitch
                id="uiv3-opt-cheat-speed"
                checked={state.cheatConfig.superSpeed}
                onChange={(superSpeed) => dispatch({ type: 'UPDATE_CHEATS', partial: { superSpeed } })}
                label="سرعت فوق‌العاده"
                compactInfo
              />
            </div>
          </div>
        )}
      </div>

      <div className="uiv3-glass-group is-compact">
        <div className="uiv3-compact-action-row">
          <div className="uiv3-setting-copy">
            <div className="uiv3-setting-title">بازنشانی تمام تنظیمات بازی</div>
            <div className="uiv3-setting-desc">گرافیک، کنترل‌ها، چیدمان لمسی، صدا و سلاح‌ها</div>
          </div>
          {!confirmReset ? (
            <GlassButton
              data-testid="btn-reset-all-settings"
              variant="danger"
              size="sm"
              onClick={() => setConfirmReset(true)}
            >
              ریست همه
            </GlassButton>
          ) : (
            <div className="uiv3-btn-inline-pair">
              <GlassButton
                data-testid="btn-confirm-reset-all-settings"
                variant="danger"
                size="sm"
                onClick={() => {
                  dispatch({ type: 'RESET_ALL_SETTINGS' });
                  dispatch({ type: 'SET_REDUCE_TRANSPARENCY', enabled: false });
                  dispatch({ type: 'SET_AUTO_TRANSPARENCY_OVERRIDE', overridden: false });
                  setConfirmReset(false);
                  showToast('تمام تنظیمات به پیش‌فرض برگشت', 'success');
                }}
              >
                تایید ریست
              </GlassButton>
              <GlassButton
                data-testid="btn-cancel-reset-all-settings"
                variant="subtle"
                size="sm"
                onClick={() => setConfirmReset(false)}
              >
                انصراف
              </GlassButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export const SettingsModalV3: React.FC = React.memo(() => {
  const { state, dispatch, showToast } = useUiV3();
  const [activeCategory, setActiveCategory] = useState<SettingsV3CategoryId>('appearance');

  useEffect(() => {
    measureModalOpenPaint('settings-v3');
  }, []);

  const isPaused = state.screenState === 'paused';

  const handleClose = useCallback(() => {
    dispatch({ type: 'FEEDBACK', kind: 'cancel' });
    if (isPaused) dispatch({ type: 'RESUME_SESSION' });
    else dispatch({ type: 'CLOSE_SETTINGS' });
  }, [dispatch, isPaused]);

  const handleResetActiveSection = useCallback(() => {
    dispatch({ type: 'FEEDBACK', kind: 'tap' });
    switch (activeCategory) {
      case 'appearance':
        dispatch({ type: 'SET_REDUCE_TRANSPARENCY', enabled: false });
        dispatch({ type: 'SET_AUTO_TRANSPARENCY_OVERRIDE', overridden: false });
        dispatch({ type: 'SET_REDUCED_MOTION', enabled: false });
        dispatch({ type: 'SET_UI_CLICK_SOUND', enabled: true });
        dispatch({ type: 'SET_UI_HAPTICS', enabled: true });
        showToast('تنظیمات بخش ظاهر به پیش‌فرض برگشت', 'info');
        break;
      case 'graphics':
        dispatch({ type: 'APPLY_GFX_PRESET', preset: DEFAULT_GFX_PRESET });
        dispatch({ type: 'SET_AUTO_QUALITY', enabled: true });
        dispatch({ type: 'SET_BATTERY_SAVER', enabled: false });
        dispatch({
          type: 'SET_VIEW_DISTANCE_MODE',
          mode: getDefaultViewDistanceForPreset(DEFAULT_GFX_PRESET, detectIsMobileDevice()),
        });
        dispatch({ type: 'SET_SKIN_FX_MODE', mode: resolveDefaultSkinFxMode() });
        dispatch({ type: 'SET_SHOW_AD_BILLBOARDS', enabled: true });
        dispatch({ type: 'SET_SHOW_FPS_HUD', enabled: false });
        dispatch({ type: 'SET_SHOW_PERF_PROFILER', enabled: false });
        showToast('تنظیمات بخش گرافیک به پیش‌فرض برگشت', 'info');
        break;
      case 'controls':
        dispatch({ type: 'SET_SENSITIVITY', value: 2.65 });
        dispatch({ type: 'SET_ADS_SENSITIVITY', value: 1.35 });
        dispatch({ type: 'SET_AIM_ASSIST_STRENGTH', value: 70 });
        dispatch({ type: 'SET_CAMERA_MOTION_INTENSITY', value: 65 });
        dispatch({ type: 'SET_HUD_LAYOUT', preset: 'standard' });
        dispatch({ type: 'RESET_CONTROL_LAYOUT' });
        dispatch({ type: 'SET_HUD_SCALE', value: 1.0 });
        dispatch({ type: 'SET_HUD_OPACITY', value: 0.95 });
        dispatch({ type: 'SET_MINIMAL_HUD', enabled: false });
        dispatch({ type: 'SET_CONTROLS_STYLE', style: 'glass' });
        dispatch({ type: 'SET_CROSSHAIR_SIZE', value: 1.0 });
        dispatch({ type: 'SET_CROSSHAIR_STYLE', style: 'cross' });
        dispatch({ type: 'SET_TOUCH_SETTING', mode: 'auto' });
        dispatch({ type: 'SET_BOT_DIFFICULTY', difficulty: 'medium' });
        dispatch({ type: 'SET_SHOW_LEAN_BUTTONS', enabled: false });
        dispatch({ type: 'SET_AUTO_RELOAD', enabled: true });
        dispatch({ type: 'SET_VIBRATION', enabled: true });
        dispatch({ type: 'SET_SLIDE_ALPHA', enabled: true });
        showToast('تنظیمات بخش کنترل‌ها به پیش‌فرض برگشت', 'info');
        break;
      case 'loadout':
        dispatch({ type: 'SELECT_MAP', mapId: 'warehouse' });
        dispatch({ type: 'RESET_LOADOUT' });
        showToast('سلاح‌ها و مپ به پیش‌فرض برگشت', 'info');
        break;
      case 'audio':
        dispatch({ type: 'SET_SOUND_ENABLED', enabled: true });
        dispatch({ type: 'SET_FOOTSTEP_VOLUME', value: 0.55 });
        dispatch({ type: 'SET_VOICE_MODE', mode: 'ptt' });
        dispatch({ type: 'SET_VOICE_VOLUME', value: 0.85 });
        dispatch({ type: 'SET_VOICE_CHANNEL_SCOPE', scope: 'team' });
        dispatch({ type: 'SET_SHOW_PING_HUD', enabled: true });
        dispatch({ type: 'SET_LOW_DATA_MODE', enabled: false });
        showToast('تنظیمات صدا و آنلاین به پیش‌فرض برگشت', 'info');
        break;
      case 'advanced':
        dispatch({ type: 'UPDATE_CHEATS', partial: { ...DEFAULT_CHEAT_CONFIG } });
        dispatch({ type: 'RELOCK_CHEATS' });
        showToast('تنظیمات بخش چیت به پیش‌فرض برگشت', 'info');
        break;
    }
  }, [activeCategory, dispatch, showToast]);

  return (
    <GlassModal
      title="تنظیمات"
      onClose={handleClose}
      confirmCloseLabel={isPaused ? 'ادامه بازی' : 'تایید'}
      closeButtonId="btn-close-settings"
      sheetClassName="uiv3-settings-sheet"
      data-testid="uiv3-settings-modal"
      headerExtra={
        <button
          type="button"
          className="uiv3-header-reset-btn"
          data-testid="uiv3-btn-reset-section"
          onClick={handleResetActiveSection}
          title="بازنشانی همین بخش به پیش‌فرض"
        >
          <IconReset size={13} />
          <span>ریست این بخش</span>
        </button>
      }
      footer={
        isPaused ? (
          <div className="uiv3-pause-slim-footer" data-testid="uiv3-pause-quick-footer">
            <GlassButton variant="subtle" size="sm" onClick={() => dispatch({ type: 'OPEN_ONLINE' })}>
              لابی آنلاین
            </GlassButton>
            <GlassButton variant="subtle" size="sm" onClick={() => dispatch({ type: 'OPEN_TRAINING' })}>
              تمرین
            </GlassButton>
            <GlassButton
              id="btn-restart-settings"
              variant="subtle"
              size="sm"
              onClick={() => dispatch({ type: 'RESTART_SESSION' })}
            >
              شروع مجدد
            </GlassButton>
            <GlassButton variant="danger" size="sm" onClick={() => dispatch({ type: 'RETURN_TO_TITLE' })}>
              منوی اصلی
            </GlassButton>
          </div>
        ) : undefined
      }
    >
      <div className="uiv3-settings-layout">
        <nav className="uiv3-settings-rail" aria-label="دسته‌بندی تنظیمات" role="tablist">
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={active}
                data-testid={`uiv3-settings-tab-${cat.id}`}
                className={`uiv3-rail-btn ${active ? 'is-active' : ''}`}
                onClick={() => {
                  dispatch({ type: 'FEEDBACK', kind: 'tap' });
                  startTransition(() => setActiveCategory(cat.id));
                }}
              >
                <span className="uiv3-rail-icon">{cat.icon}</span>
                <span className="uiv3-rail-label">{cat.label}</span>
              </button>
            );
          })}
        </nav>

        <section className="uiv3-settings-pane" aria-live="polite" data-testid="uiv3-settings-pane">
          {activeCategory === 'appearance' && <AppearanceTab />}
          {activeCategory === 'graphics' && <GraphicsTab />}
          {activeCategory === 'controls' && <ControlsTab />}
          {activeCategory === 'loadout' && <LoadoutTab />}
          {activeCategory === 'audio' && <AudioOnlineTab />}
          {activeCategory === 'advanced' && <AdvancedTab />}
        </section>
      </div>
    </GlassModal>
  );
});
