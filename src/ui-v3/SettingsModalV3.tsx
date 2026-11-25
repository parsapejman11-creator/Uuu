import React, { useMemo, useState } from 'react';
import {
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
import type { SkinFxMode } from '../game/perf';
import { RedeemCodeSection } from '../components/RedeemCodeSection';
import { useUiV3 } from './UiV3Context';
import {
  UI_V3_STAGE_LABEL,
  UI_V3_STAGE_NOTICE_FA,
  UI_V3_TITLE_FA,
  type UiV3GfxPresetName,
} from './uiV3Store';
import { UiModeSwitcher3Way } from './UiModeSwitcher3Way';
import { GlassButton, GlassModal, GlassSlider, GlassSwitch } from './primitives';
import {
  IconCpu,
  IconFullscreen,
  IconGamepad,
  IconGlassLayers,
  IconPalette,
  IconShield,
  IconSparkles,
  IconVolume,
  IconWeapon,
} from './icons';

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
  { id: 'appearance', label: 'ظاهر', icon: <IconGlassLayers size={16} /> },
  { id: 'graphics', label: 'گرافیک', icon: <IconCpu size={16} /> },
  { id: 'controls', label: 'کنترل‌ها', icon: <IconGamepad size={16} /> },
  { id: 'loadout', label: 'سلاح و مپ', icon: <IconWeapon size={16} /> },
  { id: 'audio', label: 'صدا و آنلاین', icon: <IconVolume size={16} /> },
  { id: 'advanced', label: 'چیت و ریست', icon: <IconShield size={16} /> },
];

const GFX_PRESET_CARDS: ReadonlyArray<{
  id: UiV3GfxPresetName;
  title: string;
  sub: string;
  flagship?: boolean;
}> = [
  { id: 'promax', title: 'Ultra Max Pro Max', sub: 'پرچم‌دار · 165%', flagship: true },
  { id: 'ultramax', title: 'Ultra Max', sub: 'فوق‌شفاف · 145%', flagship: true },
  { id: 'ultra', title: 'Ultra', sub: 'اولترا · 125%' },
  { id: 'high', title: 'High', sub: 'بالا · 100%' },
  { id: 'med', title: 'Medium', sub: 'بهینه · 75%' },
  { id: 'low', title: 'Low', sub: 'سبک · 55%' },
  { id: 'potato', title: 'Potato', sub: 'فوق‌سبک · 45%' },
];

const AppearanceTab: React.FC = React.memo(() => {
  const { state, dispatch, showToast } = useUiV3();
  return (
    <div className="uiv3-settings-stack" data-testid="uiv3-settings-panel-appearance">
      <div className="uiv3-glass-group">
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

      <div className="uiv3-glass-group">
        <div className="uiv3-group-head">
          <span className="uiv3-group-title">مواد و شفافیت شیشهٔ مایع</span>
          <span className="uiv3-status-chip" data-testid="uiv3-glass-mode-readout">
            {state.glassResolution.labelFa}
          </span>
        </div>

        <GlassSwitch
          id="uiv3-opt-reduce-transparency"
          data-testid="uiv3-opt-reduce-transparency"
          checked={state.uiV3Prefs.reduceTransparency}
          onChange={(enabled) => {
            dispatch({ type: 'FEEDBACK', kind: 'toggle' });
            dispatch({ type: 'SET_REDUCE_TRANSPARENCY', enabled });
            showToast(enabled ? 'کاهش شفافیت فعال شد (خوانایی حداکثری)' : 'حالت شیشهٔ مایع فعال شد', 'info');
          }}
          label="کاهش شفافیت"
          description="تبدیل پنل‌های شیشه‌ای به سطح نیمه‌مات با کنتراست بسیار بالا و خاموش کردن کامل تارشدگی"
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
          description="ساده‌سازی انیمیشن‌های UI، خاموش کردن تکان دوربین و کاهش ذرات برای راحتی چشم و FPS بالاتر"
        />

        <GlassSwitch
          id="uiv3-opt-click-sound"
          data-testid="uiv3-opt-click-sound"
          checked={state.uiV3Prefs.uiClickSound}
          onChange={(enabled) => {
            dispatch({ type: 'SET_UI_CLICK_SOUND', enabled });
          }}
          label="صدای لمس دکمه‌های رابط"
          description="کلیک نرم و کوتاه هنگام جابه‌جایی در منوها"
        />

        <GlassSwitch
          id="uiv3-opt-haptics"
          data-testid="uiv3-opt-haptics"
          checked={state.uiV3Prefs.uiHaptics}
          onChange={(enabled) => {
            dispatch({ type: 'SET_UI_HAPTICS', enabled });
          }}
          label="بازخورد لمسی منو (Haptics)"
          description="لرزش بسیار کوتاه روی دستگاه‌های موبایل هنگام لمس دکمه‌ها"
        />
      </div>

      <div className="uiv3-glass-group">
        <div className="uiv3-setting-row">
          <div className="uiv3-setting-copy">
            <div className="uiv3-setting-title">نمایش تمام‌صفحه</div>
            <div className="uiv3-setting-desc">پوشش کامل نمایشگر بدون نوارهای مرورگر</div>
          </div>
          <GlassButton
            id="btn-toggle-fullscreen"
            data-testid="btn-toggle-fullscreen"
            variant="secondary"
            size="sm"
            icon={<IconFullscreen size={15} />}
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
    <div className="uiv3-settings-stack" data-testid="uiv3-settings-panel-graphics">
      <div className="uiv3-glass-group">
        <div className="uiv3-group-head">
          <span className="uiv3-group-title">سطح گرافیک (از Potato تا Ultra Max Pro Max)</span>
        </div>
        <div className="uiv3-preset-grid">
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
              <span>{p.sub}</span>
            </button>
          ))}
        </div>

        <div className="uiv3-setting-row">
          <div className="uiv3-setting-copy">
            <label htmlFor="uiv3-opt-res" className="uiv3-setting-title">
              رزولوشن رندر (Super-Sampling)
            </label>
          </div>
          <select
            id="uiv3-opt-res"
            data-testid="uiv3-opt-res"
            className="uiv3-select"
            value={String(gfxState.resScale)}
            onChange={(e) => dispatch({ type: 'UPDATE_GFX', partial: { resScale: parseFloat(e.target.value) } })}
          >
            <option value="2">200% (4K Pro Max)</option>
            <option value="1.65">165% (Ultra Max Pro Max)</option>
            <option value="1.45">145% (Ultra Max)</option>
            <option value="1.25">125% (Ultra)</option>
            <option value="1">100% (Full HD Native)</option>
            <option value="0.75">75% (استاندارد)</option>
            <option value="0.55">55% (سبک)</option>
            <option value="0.45">45% (فوق‌سبک)</option>
          </select>
        </div>

        <GlassSlider
          id="uiv3-opt-vibrance"
          data-testid="uiv3-opt-vibrance"
          label="شدت رنگ و شفافیت HDR"
          value={gfxState.vibrance}
          min={1.0}
          max={1.85}
          step={0.05}
          valueLabel={`${Math.round(gfxState.vibrance * 100)}%`}
          onChange={(vibrance) => dispatch({ type: 'UPDATE_GFX', partial: { vibrance } })}
        />

        <div className="uiv3-setting-row">
          <div className="uiv3-setting-copy">
            <label htmlFor="uiv3-opt-shadows" className="uiv3-setting-title">
              کیفیت سایه‌ها (Shadows)
            </label>
          </div>
          <select
            id="uiv3-opt-shadows"
            data-testid="uiv3-opt-shadows"
            className="uiv3-select"
            value={gfxState.shadowMode}
            onChange={(e) =>
              dispatch({
                type: 'UPDATE_GFX',
                partial: { shadowMode: e.target.value as 'ultra' | 'soft' | 'basic' | 'off' },
              })
            }
          >
            <option value="ultra">اولترا 4K (4096px)</option>
            <option value="soft">بالا (2048px)</option>
            <option value="basic">متوسط (1024px)</option>
            <option value="off">خاموش (افزایش شدید FPS)</option>
          </select>
        </div>

        <div className="uiv3-setting-row">
          <div className="uiv3-setting-copy">
            <label htmlFor="uiv3-opt-fps" className="uiv3-setting-title">
              سقف فریم‌ریت (FPS Limit)
            </label>
          </div>
          <select
            id="uiv3-opt-fps"
            data-testid="uiv3-opt-fps"
            className="uiv3-select"
            value={String(gfxState.targetFps)}
            onChange={(e) =>
              dispatch({ type: 'UPDATE_GFX', partial: { targetFps: parseInt(e.target.value, 10) } })
            }
          >
            <option value="0">نامحدود (Max FPS)</option>
            <option value="60">60 FPS</option>
            <option value="45">45 FPS</option>
            <option value="30">30 FPS</option>
          </select>
        </div>
      </div>

      <div className="uiv3-glass-group">
        <div className="uiv3-group-head">
          <span className="uiv3-group-title">بهینه‌سازی، افکت‌ها و ابزار عملکرد</span>
        </div>

        <GlassSwitch
          id="uiv3-opt-auto-quality"
          data-testid="opt-auto-quality"
          checked={state.autoQuality}
          onChange={(enabled) => dispatch({ type: 'SET_AUTO_QUALITY', enabled })}
          label="کیفیت خودکار (Auto Quality)"
          description="در صورت افت FPS زیر ۳۰، مرحله‌به‌مرحله افکت‌ها، سایه‌ها و رزولوشن را سبک می‌کند"
        />

        <div className="uiv3-setting-row">
          <div className="uiv3-setting-copy">
            <label htmlFor="uiv3-opt-skin-fx-mode" className="uiv3-setting-title">
              افکت‌های اسکین (Skin VFX)
            </label>
            <div className="uiv3-setting-desc">در حالت «خاموش»، مدل سه‌بعدی اسکین حفظ می‌شود ولی ذرات خاموش‌اند</div>
          </div>
          <select
            id="uiv3-opt-skin-fx-mode"
            data-testid="opt-skin-fx-mode"
            className="uiv3-select"
            value={state.skinFxMode}
            onChange={(e) => dispatch({ type: 'SET_SKIN_FX_MODE', mode: e.target.value as SkinFxMode })}
          >
            <option value="off">خاموش (حداکثر FPS)</option>
            <option value="simple">ساده (پیشنهاد موبایل)</option>
            <option value="full">کامل (دسکتاپ قوی)</option>
          </select>
        </div>

        <GlassSwitch
          id="uiv3-opt-bodycam"
          data-testid="uiv3-opt-bodycam"
          checked={gfxState.bodycamFx}
          onChange={(bodycamFx) => dispatch({ type: 'UPDATE_GFX', partial: { bodycamFx } })}
          label="افکت لنز بادیکم (Bodycam Lens)"
        />

        <GlassSwitch
          id="uiv3-opt-flashlight"
          data-testid="uiv3-opt-flashlight"
          checked={gfxState.flashlightOn}
          onChange={(flashlightOn) => dispatch({ type: 'UPDATE_GFX', partial: { flashlightOn } })}
          label="چراغ‌قوه تاکتیکی (Flashlight)"
        />

        <GlassSwitch
          id="uiv3-opt-show-ad-billboards"
          data-testid="opt-show-ad-billboards"
          checked={state.showAdBillboards}
          onChange={(enabled) => dispatch({ type: 'SET_SHOW_AD_BILLBOARDS', enabled })}
          label="نمایش بیلبوردها"
          description="تابلوهای تزئینی کوچک روی دیوارهای مپ (بدون اثر بر گیم‌پلی)"
        />

        <GlassSwitch
          id="uiv3-opt-show-fps-hud"
          data-testid="opt-show-fps-hud"
          checked={state.showFpsHud}
          onChange={(enabled) => dispatch({ type: 'SET_SHOW_FPS_HUD', enabled })}
          label="نمایش شمارنده FPS روی صفحه"
          description="به صورت پیش‌فرض خاموش است تا صفحه بازی خلوت بماند"
        />

        <GlassSwitch
          id="uiv3-opt-show-perf-profiler"
          data-testid="opt-show-perf-profiler"
          checked={state.showPerfProfiler}
          onChange={(enabled) => dispatch({ type: 'SET_SHOW_PERF_PROFILER', enabled })}
          label="نمایش پنل عملکرد (Profiler)"
          description="نمایش زنده FPS، زمان فریم، Draw Calls، مثلث‌ها، حافظه و پینگ"
        />
      </div>
    </div>
  );
});

const ControlsTab: React.FC = React.memo(() => {
  const { state, dispatch, showToast } = useUiV3();
  return (
    <div className="uiv3-settings-stack" data-testid="uiv3-settings-panel-controls">
      <div className="uiv3-glass-group">
        <div className="uiv3-group-head">
          <span className="uiv3-group-title">حساسیت دوربین و نشانه‌گیری</span>
        </div>

        <GlassSlider
          id="uiv3-opt-sens"
          data-testid="uiv3-opt-sens"
          label="حساسیت چرخش دوربین"
          value={state.sensitivity}
          min={0.3}
          max={8.0}
          step={0.05}
          valueLabel={`${Math.round(state.sensitivity * 100)}%`}
          onChange={(value) => dispatch({ type: 'SET_SENSITIVITY', value })}
        />

        <GlassSlider
          id="uiv3-opt-ads-sens"
          data-testid="uiv3-opt-ads-sens"
          label="حساسیت نشانه‌گیری و اسنایپ (ADS)"
          value={state.adsSensitivity}
          min={0.2}
          max={4.0}
          step={0.05}
          valueLabel={`${Math.round(state.adsSensitivity * 100)}%`}
          onChange={(value) => dispatch({ type: 'SET_ADS_SENSITIVITY', value })}
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
        />

        <GlassSlider
          id="uiv3-opt-camera-motion"
          data-testid="opt-camera-motion-intensity"
          label="شدت حرکت دوربین"
          description="تکان ملایم هنگام راه رفتن، دویدن، فرود، شلیک و اسلاید (۰٪ = خاموش)"
          value={state.cameraMotionIntensity}
          min={0}
          max={100}
          step={5}
          valueLabel={state.cameraMotionIntensity === 0 ? 'خاموش' : `${state.cameraMotionIntensity}%`}
          onChange={(value) => dispatch({ type: 'SET_CAMERA_MOTION_INTENSITY', value })}
        />
      </div>

      <div className="uiv3-glass-group">
        <div className="uiv3-group-head">
          <span className="uiv3-group-title">چیدمان لمسی، کراس‌هیر و HUD</span>
        </div>

        <div className="uiv3-setting-row">
          <div className="uiv3-setting-copy">
            <label htmlFor="uiv3-opt-layout" className="uiv3-setting-title">
              الگوی چیدمان دکمه‌ها (HUD Preset)
            </label>
          </div>
          <select
            id="uiv3-opt-layout"
            className="uiv3-select"
            value={state.hudLayout}
            onChange={(e) => dispatch({ type: 'SET_HUD_LAYOUT', preset: e.target.value as HudLayoutPreset })}
          >
            <option value="standard">استاندارد ارگونومیک (راست‌دست)</option>
            <option value="claw">حرفه‌ای چهارانگشتی (Claw)</option>
            <option value="lefthanded">چپ‌دست (جوی‌استیک راست)</option>
          </select>
        </div>

        <div className="uiv3-setting-row">
          <div className="uiv3-setting-copy">
            <div className="uiv3-setting-title">ویرایش آزاد چیدمان لمسی (ذخیره جداگانه برای v3)</div>
            <div className="uiv3-setting-desc">تغییر مکان، اندازه و شفافیت دکمه‌ها بدون دست زدن به چیدمان UI قدیمی</div>
          </div>
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

        <GlassSlider
          id="uiv3-opt-hud-scale"
          label="اندازه کلی دکمه‌ها و جوی‌استیک"
          value={state.hudScale}
          min={0.75}
          max={1.4}
          step={0.05}
          valueLabel={`${Math.round(state.hudScale * 100)}%`}
          onChange={(value) => dispatch({ type: 'SET_HUD_SCALE', value })}
        />

        <GlassSlider
          id="uiv3-opt-hud-opacity"
          label="شفافیت کلی کنترل‌ها"
          value={state.hudOpacity}
          min={0.35}
          max={1.0}
          step={0.05}
          valueLabel={`${Math.round(state.hudOpacity * 100)}%`}
          onChange={(value) => dispatch({ type: 'SET_HUD_OPACITY', value })}
        />

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
        />

        <div className="uiv3-setting-row">
          <div className="uiv3-setting-copy">
            <label htmlFor="uiv3-opt-crosshair-style" className="uiv3-setting-title">
              شکل کراس‌هیر
            </label>
          </div>
          <select
            id="uiv3-opt-crosshair-style"
            data-testid="opt-crosshair-style"
            className="uiv3-select"
            value={state.crosshairStyle}
            onChange={(e) => dispatch({ type: 'SET_CROSSHAIR_STYLE', style: e.target.value as CrosshairStyle })}
          >
            <option value="cross">خطوط نازک مینیمال</option>
            <option value="dot">نقطه ساده</option>
          </select>
        </div>

        <div className="uiv3-setting-row">
          <div className="uiv3-setting-copy">
            <label htmlFor="uiv3-opt-touch" className="uiv3-setting-title">
              حالت کنترل لمسی
            </label>
          </div>
          <select
            id="uiv3-opt-touch"
            className="uiv3-select"
            value={state.touchSetting}
            onChange={(e) => dispatch({ type: 'SET_TOUCH_SETTING', mode: e.target.value as 'auto' | 'on' | 'off' })}
          >
            <option value="auto">لمسی خودکار</option>
            <option value="on">لمسی همیشه روشن</option>
            <option value="off">لمسی خاموش</option>
          </select>
        </div>

        <div className="uiv3-setting-row">
          <div className="uiv3-setting-copy">
            <label htmlFor="uiv3-opt-botdiff" className="uiv3-setting-title">
              هوش و مسیریابی بات‌ها (Smart Bot AI)
            </label>
          </div>
          <select
            id="uiv3-opt-botdiff"
            className="uiv3-select"
            value={state.botDifficulty}
            onChange={(e) => dispatch({ type: 'SET_BOT_DIFFICULTY', difficulty: e.target.value as BotDifficultyPreset })}
          >
            <option value="weak">ضعیف (مبتدی)</option>
            <option value="medium">متوسط (تاکتیکی)</option>
            <option value="strong">قوی (کماندو حرفه‌ای)</option>
          </select>
        </div>

        <GlassSwitch
          id="uiv3-opt-show-lean"
          data-testid="opt-show-lean-buttons"
          checked={state.showLeanHudButtons}
          onChange={(enabled) => dispatch({ type: 'SET_SHOW_LEAN_BUTTONS', enabled })}
          label="دکمه‌های خم شدن (Z / AUTO / X) روی HUD"
          description="حتی در حالت خاموش، کلیدهای Z/X و خم شدن هوشمند در پس‌زمینه فعال‌اند"
        />

        <GlassSwitch
          id="uiv3-opt-auto-reload"
          data-testid="opt-auto-reload"
          checked={state.autoReloadEnabled}
          onChange={(enabled) => dispatch({ type: 'SET_AUTO_RELOAD', enabled })}
          label="ریلود خودکار هنگام خالی شدن خشاب"
        />

        <GlassSwitch
          id="uiv3-opt-vibration"
          data-testid="opt-vibration"
          checked={state.vibrationEnabled}
          onChange={(enabled) => dispatch({ type: 'SET_VIBRATION', enabled })}
          label="لرزش خفیف گوشی (Vibration)"
          description="لرزش کوتاه هنگام اصابت تیر، کشتن حریف و آسیب دیدن"
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
        />
      </div>
    </div>
  );
});

const LoadoutTab: React.FC = React.memo(() => {
  const { state, dispatch, showToast } = useUiV3();
  return (
    <div className="uiv3-settings-stack" data-testid="uiv3-settings-panel-loadout">
      <div className="uiv3-glass-group">
        <div className="uiv3-setting-row">
          <div className="uiv3-setting-copy">
            <label htmlFor="uiv3-opt-map" className="uiv3-setting-title">
              نقشه فعال عملیات (Map)
            </label>
          </div>
          <select
            id="uiv3-opt-map"
            className="uiv3-select"
            value={state.currentMap}
            onChange={(e) => dispatch({ type: 'SELECT_MAP', mapId: e.target.value as MapId })}
          >
            {MAP_LIST.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nameFa} — {m.badgeFa}
              </option>
            ))}
          </select>
        </div>

        <div className="uiv3-group-head" style={{ marginTop: '6px' }}>
          <span className="uiv3-group-title">
            چیدمان ۳ سلاح ({state.loadout.length}/{WEAPON_CATALOG.length})
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

        <div className="uiv3-weapon-grid is-settings">
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
                <span className="uiv3-weapon-dmg">{w.damageLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="uiv3-glass-group">
        <div className="uiv3-setting-row">
          <div className="uiv3-setting-copy">
            <div className="uiv3-setting-title">اسکین‌ها و گردونهٔ اسپین</div>
            <div className="uiv3-setting-desc">انتخاب اسکین میتیک، لجندری یا پیش‌فرض برای هر سلاح</div>
          </div>
          <div className="uiv3-btn-inline-pair">
            <GlassButton
              data-testid="btn-open-skins-settings"
              variant="secondary"
              size="sm"
              icon={<IconPalette size={15} />}
              onClick={() => dispatch({ type: 'OPEN_SKINS' })}
            >
              اسکین‌ها
            </GlassButton>
            <GlassButton
              data-testid="uiv3-btn-open-spin-settings"
              variant="accent"
              size="sm"
              icon={<IconSparkles size={15} />}
              onClick={() => dispatch({ type: 'OPEN_SPIN' })}
            >
              اسپین ({state.cosmeticsState.spins})
            </GlassButton>
          </div>
        </div>
      </div>

      <div className="uiv3-glass-group">
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
        />
      </div>
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
    <div className="uiv3-settings-stack" data-testid="uiv3-settings-panel-audio">
      <div className="uiv3-glass-group">
        <div className="uiv3-group-head">
          <span className="uiv3-group-title">صدای بازی</span>
        </div>

        <GlassSwitch
          id="uiv3-opt-sound"
          checked={state.soundEnabled}
          onChange={(enabled) => dispatch({ type: 'SET_SOUND_ENABLED', enabled })}
          label="صدای کلی بازی"
        />

        <GlassSlider
          id="uiv3-opt-footstep-volume"
          data-testid="opt-footstep-volume"
          label="صدای پای جهت‌دار بازیکنان نزدیک"
          value={state.footstepVolume}
          min={0}
          max={1}
          step={0.05}
          valueLabel={`${Math.round(state.footstepVolume * 100)}%`}
          onChange={(value) => dispatch({ type: 'SET_FOOTSTEP_VOLUME', value })}
        />
      </div>

      <div className="uiv3-glass-group" data-testid="settings-voice-section">
        <div className="uiv3-group-head">
          <span className="uiv3-group-title">چت صوتی آنلاین (WebRTC Voice)</span>
          <span className="uiv3-status-chip">
            {state.voiceState.secureContextOk ? 'HTTPS آماده' : 'نیازمند HTTPS'}
          </span>
        </div>

        <div className="uiv3-setting-row">
          <div className="uiv3-setting-copy">
            <label htmlFor="uiv3-opt-voice-mode" className="uiv3-setting-title">
              حالت میکروفون
            </label>
            <div className="uiv3-setting-desc">فشار برای صحبت: کلید V یا دکمه میکروفون موبایل</div>
          </div>
          <select
            id="uiv3-opt-voice-mode"
            data-testid="opt-voice-mode"
            className="uiv3-select"
            value={state.voiceState.mode}
            onChange={(e) => dispatch({ type: 'SET_VOICE_MODE', mode: e.target.value as VoiceMode })}
          >
            <option value="open">میکروفون باز</option>
            <option value="ptt">فشار برای صحبت (PTT · V)</option>
          </select>
        </div>

        <GlassSlider
          id="uiv3-opt-voice-volume"
          data-testid="opt-voice-volume"
          label="ولوم صدای بازیکنان دیگر"
          value={state.voiceState.volume}
          min={0}
          max={1}
          step={0.05}
          valueLabel={`${Math.round(state.voiceState.volume * 100)}%`}
          onChange={(value) => dispatch({ type: 'SET_VOICE_VOLUME', value })}
        />

        <div className="uiv3-setting-row">
          <div className="uiv3-setting-copy">
            <label htmlFor="uiv3-opt-voice-channel" className="uiv3-setting-title">
              کانال صدای تیمی
            </label>
          </div>
          <select
            id="uiv3-opt-voice-channel"
            data-testid="opt-voice-channel"
            className="uiv3-select"
            value={state.voiceState.channelScope}
            onChange={(e) =>
              dispatch({ type: 'SET_VOICE_CHANNEL_SCOPE', scope: e.target.value as VoiceChannelScope })
            }
          >
            <option value="team">فقط هم‌تیمی‌ها</option>
            <option value="all">همه بازیکنان اتاق</option>
          </select>
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
                    <span className="uiv3-status-chip">
                      {state.voiceState.transmitting ? 'ارسال صدا' : 'میکروفون خاموش'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="uiv3-glass-group">
        <div className="uiv3-group-head">
          <span className="uiv3-group-title">پروفایل و اتاق آنلاین</span>
        </div>

        <div className="uiv3-setting-row">
          <div className="uiv3-setting-copy">
            <label htmlFor="uiv3-opt-callsign" className="uiv3-setting-title">
              نام نمایشی (Callsign)
            </label>
          </div>
          <input
            id="uiv3-opt-callsign"
            type="text"
            maxLength={18}
            className="uiv3-text-input"
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
          label="نمایش پینگ و کیفیت اتصال (ms)"
          description="نمایش تاخیر اتصال به میزبان در گوشه صفحه آنلاین"
        />

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
    </div>
  );
});

const AdvancedTab: React.FC = React.memo(() => {
  const { state, dispatch, showToast } = useUiV3();
  const [confirmReset, setConfirmReset] = useState(false);

  const handleTryUnlock = () => {
    if (verifyCheatPasscode(state.cheatPasswordInput)) {
      dispatch({ type: 'UNLOCK_CHEATS' });
      showToast('قفل چیت‌ها به مدت ۳۰ ثانیه باز شد', 'warn');
    } else {
      dispatch({
        type: 'SET_CHEAT_PASS_ERROR',
        message: 'رمز وارد شده صحیح نیست. ایم‌اسیست (۱۰٪) و چیت‌ها قفل هستند.',
      });
    }
  };

  return (
    <div className="uiv3-settings-stack" data-testid="uiv3-settings-panel-advanced">
      <div className="uiv3-glass-group">
        <div className="uiv3-group-head">
          <span className="uiv3-group-title">ایم‌اسیست قفل‌دار و چیت‌ها</span>
          <span className="uiv3-status-chip" data-testid="locked-aim-assist-readout">
            {state.cheatUnlocked
              ? `باز · ${state.cheatUnlockRemainingSec}s`
              : `قفل روی ${state.cheatConfig.aimAssistStrength}%`}
          </span>
        </div>

        {!state.cheatUnlocked ? (
          <div className="uiv3-cheat-gate" data-testid="cheat-password-gate">
            <div className="uiv3-setting-desc">
              برای بازگشایی ۳۰ ثانیه‌ای ایم‌اسیست پیشرفته و چیت‌ها، رمز اختصاصی را وارد کنید:
            </div>
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
                placeholder="رمز اختصاصی..."
              />
              <GlassButton data-testid="btn-unlock-cheats" variant="accent" size="sm" onClick={handleTryUnlock}>
                بازگشایی ۳۰ ثانیه‌ای
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

            <GlassSwitch
              id="uiv3-opt-aim-assist"
              checked={state.cheatConfig.aimAssistEnabled}
              onChange={(aimAssistEnabled) => dispatch({ type: 'UPDATE_CHEATS', partial: { aimAssistEnabled } })}
              label="ایم‌اسیست هوشمند (فقط دید مستقیم)"
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
            />

            <GlassSwitch
              id="uiv3-opt-aim-headshot"
              checked={state.cheatConfig.aimAssistHeadshot}
              onChange={(aimAssistHeadshot) => dispatch({ type: 'UPDATE_CHEATS', partial: { aimAssistHeadshot } })}
              label="قفل مستقیم روی سر (Headshot Lock)"
            />
            <GlassSwitch
              id="uiv3-opt-cheat-ammo"
              checked={state.cheatConfig.infiniteAmmo}
              onChange={(infiniteAmmo) => dispatch({ type: 'UPDATE_CHEATS', partial: { infiniteAmmo } })}
              label="تیر بی‌نهایت (Infinite Ammo)"
            />
            <GlassSwitch
              id="uiv3-opt-cheat-recoil"
              checked={state.cheatConfig.zeroRecoil}
              onChange={(zeroRecoil) => dispatch({ type: 'UPDATE_CHEATS', partial: { zeroRecoil } })}
              label="حذف لگد سلاح (Zero Recoil)"
            />
            <GlassSwitch
              id="uiv3-opt-cheat-god"
              checked={state.cheatConfig.godMode}
              onChange={(godMode) => dispatch({ type: 'UPDATE_CHEATS', partial: { godMode } })}
              label="ضدضربه کامل (God Mode)"
            />
            <GlassSwitch
              id="uiv3-opt-cheat-esp"
              checked={state.cheatConfig.espWallhack}
              onChange={(espWallhack) => dispatch({ type: 'UPDATE_CHEATS', partial: { espWallhack } })}
              label="رادار نوری دشمنان (ESP Highlight)"
            />
            <GlassSwitch
              id="uiv3-opt-cheat-speed"
              checked={state.cheatConfig.superSpeed}
              onChange={(superSpeed) => dispatch({ type: 'UPDATE_CHEATS', partial: { superSpeed } })}
              label="سرعت و پرش فوق‌العاده (Super Speed)"
            />
          </div>
        )}
      </div>

      <div className="uiv3-glass-group">
        <div className="uiv3-setting-row">
          <div className="uiv3-setting-copy">
            <div className="uiv3-setting-title">بازنشانی تمام تنظیمات بازی</div>
            <div className="uiv3-setting-desc">
              چیدمان دکمه‌ها، Aim Assist، کراس‌هیر، لرزش، اسلاید بتا، صدا و گرافیک
            </div>
          </div>
          {!confirmReset ? (
            <GlassButton
              data-testid="btn-reset-all-settings"
              variant="danger"
              size="sm"
              onClick={() => setConfirmReset(true)}
            >
              ریست همهٔ تنظیمات
            </GlassButton>
          ) : (
            <div className="uiv3-btn-inline-pair">
              <GlassButton
                data-testid="btn-confirm-reset-all-settings"
                variant="danger"
                size="sm"
                onClick={() => {
                  dispatch({ type: 'RESET_ALL_SETTINGS' });
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
  const { state, dispatch } = useUiV3();
  const [activeCategory, setActiveCategory] = useState<SettingsV3CategoryId>('appearance');

  const isPaused = state.screenState === 'paused';

  const handleClose = () => {
    dispatch({ type: 'FEEDBACK', kind: 'cancel' });
    if (isPaused) dispatch({ type: 'RESUME_SESSION' });
    else dispatch({ type: 'CLOSE_SETTINGS' });
  };

  return (
    <GlassModal
      title="تنظیمات"
      subtitle={`BODYCAM · ${UI_V3_TITLE_FA}`}
      badge={UI_V3_STAGE_LABEL}
      badgeTitle={UI_V3_STAGE_NOTICE_FA}
      onClose={handleClose}
      backdropSnapshotUrl={state.menuBackdropSnapshotUrl}
      data-testid="uiv3-settings-modal"
      footer={
        <div className="uiv3-settings-footer-bar">
          {isPaused && (
            <div className="uiv3-pause-quick-actions">
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
          )}
          <GlassButton
            id="btn-close-settings"
            data-testid="uiv3-btn-close-settings"
            variant="primary"
            size="md"
            onClick={handleClose}
          >
            {isPaused ? 'ادامه بازی' : 'تایید و بازگشت'}
          </GlassButton>
        </div>
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
                  setActiveCategory(cat.id);
                }}
              >
                <span className="uiv3-rail-icon">{cat.icon}</span>
                <span className="uiv3-rail-label">{cat.label}</span>
              </button>
            );
          })}
        </nav>

        <section className="uiv3-settings-pane" aria-live="polite">
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
