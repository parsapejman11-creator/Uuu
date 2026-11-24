import React, { useState } from 'react';
import { MAP_LIST, WEAPON_CATALOG, type MapId, type WeaponId } from '../game/rules';
import { canClaimDailyFreeSpin, type CosmeticsState } from '../game/cosmetics';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { OgEventBanner } from '../og/OgEventBanner';
import { AlphaNotice } from './AlphaNotice';
import {
  IconBodycamMark,
  IconFullscreen,
  IconLayers,
  IconMap,
  IconOnline,
  IconPlay,
  IconSettings,
  IconSpark,
  IconTarget,
} from './icons';
import type { UiFeedbackKind } from './feedback';

interface MainMenuV2Props {
  appVersion: string;
  buildDate: string;
  currentMap: MapId;
  presetLabel: string;
  fpsLabel: string;
  loadout: WeaponId[];
  cosmeticsState: CosmeticsState;
  isFullscreen: boolean;
  renderWeaponIconSvg: (id: WeaponId) => React.ReactNode;
  onSelectMap: (mapId: MapId) => void;
  onToggleLoadoutWeapon: (weaponId: WeaponId) => void;
  onStartOffline: () => void;
  onOpenOnline: () => void;
  onOpenTraining: () => void;
  onOpenSpin: () => void;
  onOpenSkins: () => void;
  onOpenSettings: () => void;
  onToggleFullscreen: () => void;
  onOpenOgIntro?: () => void;
  onFeedback: (kind: UiFeedbackKind) => void;
}

const WEAPON_POWER_PCT: Record<WeaponId, number> = {
  rpg: 100,
  sniper: 96,
  katana: 92,
  shotgun: 88,
  deagle: 84,
  ak47: 76,
  lmg: 74,
  m4a1: 68,
  pistol: 56,
  mp5: 52,
};

export const MainMenuV2: React.FC<MainMenuV2Props> = ({
  appVersion,
  buildDate,
  currentMap,
  presetLabel,
  fpsLabel,
  loadout,
  cosmeticsState,
  isFullscreen,
  renderWeaponIconSvg,
  onSelectMap,
  onToggleLoadoutWeapon,
  onStartOffline,
  onOpenOnline,
  onOpenTraining,
  onOpenSpin,
  onOpenSkins,
  onOpenSettings,
  onToggleFullscreen,
  onOpenOgIntro,
  onFeedback,
}) => {
  const [selectorTab, setSelectorTab] = useState<'maps' | 'loadout'>('maps');
  const currentMapMeta = MAP_LIST.find((m) => m.id === currentMap) ?? MAP_LIST[0];
  const dailySpinReady = canClaimDailyFreeSpin(cosmeticsState);
  const loadoutSummary = loadout
    .map((id) => WEAPON_CATALOG.find((w) => w.id === id)?.nameEn ?? id)
    .join(' · ');

  return (
    <div id="start-screen" className="uiv2-screen uiv2-menu-screen" data-testid="uiv2-main-menu" dir="rtl">
      <div className="uiv2-menu-shell">
        {/* Top Single-Row Bar */}
        <header className="uiv2-menu-header">
          <div className="uiv2-brand-group">
            <IconBodycamMark size={28} />
            <div className="uiv2-brand-text">
              <div className="uiv2-brand-line">
                <h1 className="uiv2-brand-title" dir="ltr">
                  BODY<span>CAM</span> · VANGUARD
                </h1>
                <span className="uiv2-alpha-tag" data-testid="uiv2-menu-alpha-badge">
                  Alpha
                </span>
              </div>
              <div className="uiv2-brand-meta">
                <span>{currentMapMeta.nameFa.split(' (')[0]}</span>
                <span className="uiv2-sep" aria-hidden="true">·</span>
                <span>گرافیک {presetLabel}</span>
                <span className="uiv2-sep" aria-hidden="true">·</span>
                <span className="uiv2-tabular">FPS {fpsLabel}</span>
                <span className="uiv2-sep uiv2-hide-compact" aria-hidden="true">·</span>
                <span className="uiv2-tabular uiv2-hide-compact" data-testid="app-version-badge">
                  {appVersion} · {buildDate}
                </span>
              </div>
            </div>
          </div>

          <div className="uiv2-header-actions">
            <PWAInstallButton />
            <button
              id="btn-title-fullscreen"
              data-testid="btn-title-fullscreen"
              type="button"
              className="uiv2-icon-btn"
              title={isFullscreen ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه'}
              aria-label={isFullscreen ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه'}
              onClick={() => {
                onFeedback('tap');
                onToggleFullscreen();
              }}
            >
              <IconFullscreen size={18} active={isFullscreen} />
            </button>
            <button
              id="btn-start-settings"
              data-testid="uiv2-open-settings"
              type="button"
              className="uiv2-btn uiv2-btn-ghost uiv2-header-settings-btn"
              onClick={() => {
                onFeedback('tap');
                onOpenSettings();
              }}
            >
              <IconSettings size={17} />
              <span>تنظیمات</span>
            </button>
          </div>
        </header>

        {/* Alpha Disclaimer Strip */}
        <AlphaNotice compact />

        {/* OG Event Banner & Entry Button */}
        {onOpenOgIntro && (
          <OgEventBanner
            variant="normal"
            compact
            onOpenIntro={() => {
              onFeedback('primary');
              onOpenOgIntro();
            }}
          />
        )}

        {/* Two-Column Landscape Tactical Workspace */}
        <main className="uiv2-menu-grid">
          {/* Primary Action Column (RTL Right) */}
          <section className="uiv2-action-col" aria-label="عملیات و حالت‌های بازی">
            <button
              id="btn-start-game"
              type="button"
              className="uiv2-btn uiv2-btn-primary uiv2-hero-cta"
              data-start="true"
              onClick={() => {
                onFeedback('primary');
                onStartOffline();
              }}
            >
              <span className="uiv2-cta-icon">
                <IconPlay size={18} />
              </span>
              <span className="uiv2-cta-body">
                <strong>شروع عملیات آفلاین</strong>
                <small>{currentMapMeta.nameFa}</small>
              </span>
            </button>

            <div className="uiv2-mode-row">
              <button
                id="btn-open-online"
                type="button"
                className="uiv2-btn uiv2-btn-surface uiv2-mode-btn"
                onClick={() => {
                  onFeedback('primary');
                  onOpenOnline();
                }}
              >
                <IconOnline size={18} />
                <span className="uiv2-mode-btn-text">
                  <strong>بازی آنلاین</strong>
                  <small>1v1 / 2v2 · لینک اتاق</small>
                </span>
              </button>

              <button
                id="btn-open-training"
                type="button"
                className="uiv2-btn uiv2-btn-surface uiv2-mode-btn"
                onClick={() => {
                  onFeedback('tap');
                  onOpenTraining();
                }}
              >
                <IconTarget size={18} />
                <span className="uiv2-mode-btn-text">
                  <strong>تمرین و آموزش</strong>
                  <small>تیراندازی و ربات‌ها</small>
                </span>
              </button>
            </div>

            <div className="uiv2-cosmetic-row">
              <button
                id="btn-open-spin"
                data-testid="btn-open-spin"
                type="button"
                className="uiv2-btn uiv2-btn-surface uiv2-cosmetic-btn"
                onClick={() => {
                  onFeedback('tap');
                  onOpenSpin();
                }}
              >
                <IconSpark size={17} />
                <span className="uiv2-cosmetic-label">اسپین</span>
                <span className="uiv2-count-num uiv2-tabular" data-testid="title-spin-count">
                  {cosmeticsState.spins}
                </span>
                {dailySpinReady && (
                  <span className="uiv2-daily-text" title="اسپین روزانه آماده است">
                    رایگان
                  </span>
                )}
              </button>

              <button
                id="btn-open-skins-menu"
                data-testid="btn-open-skins-menu"
                type="button"
                className="uiv2-btn uiv2-btn-surface uiv2-cosmetic-btn"
                onClick={() => {
                  onFeedback('tap');
                  onOpenSkins();
                }}
              >
                <IconLayers size={17} />
                <span className="uiv2-cosmetic-label">اسکین‌ها</span>
              </button>
            </div>

            <div className="uiv2-menu-loadout-strip">
              <span className="uiv2-strip-k">تجهیزات فعال</span>
              <span className="uiv2-strip-v" dir="ltr">
                {loadoutSummary}
              </span>
            </div>

            <div className="uiv2-key-hint">
              کلیدهای 1 تا 3 تعویض سلاح · G پینگ تیمی · T پیام سریع · V چت صوتی
            </div>
          </section>

          {/* Tactical Selector Column (RTL Left): Maps & 3-Weapon Loadout */}
          <section className="uiv2-selector-col" aria-label="انتخاب نقشه و سلاح">
            <div className="uiv2-selector-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={selectorTab === 'maps'}
                data-testid="uiv2-tab-maps"
                className={`uiv2-tab-btn ${selectorTab === 'maps' ? 'is-active' : ''}`}
                onClick={() => {
                  onFeedback('toggle');
                  setSelectorTab('maps');
                }}
              >
                <IconMap size={15} />
                <span>نقشه عملیات ({MAP_LIST.length})</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={selectorTab === 'loadout'}
                data-testid="uiv2-tab-loadout"
                className={`uiv2-tab-btn ${selectorTab === 'loadout' ? 'is-active' : ''}`}
                onClick={() => {
                  onFeedback('toggle');
                  setSelectorTab('loadout');
                }}
              >
                <IconTarget size={15} />
                <span>انتخاب ۳ سلاح ({loadout.length}/{WEAPON_CATALOG.length})</span>
              </button>
            </div>

            <div className="uiv2-selector-body">
              {selectorTab === 'maps' ? (
                <div className="uiv2-map-grid">
                  {MAP_LIST.map((m) => {
                    const active = currentMap === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        data-testid={`title-map-${m.id}`}
                        className={`uiv2-map-card ${active ? 'is-selected' : ''}`}
                        onClick={() => {
                          onFeedback('toggle');
                          onSelectMap(m.id);
                        }}
                      >
                        <div className="uiv2-map-card-top">
                          <span className="uiv2-map-kicker">{m.badgeFa}</span>
                          {active && <span className="uiv2-selected-mark">انتخاب‌شده</span>}
                        </div>
                        <strong className="uiv2-map-name">{m.nameFa}</strong>
                        <span className="uiv2-map-sub">{m.subtitleFa}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="uiv2-arsenal-grid">
                  {WEAPON_CATALOG.map((w) => {
                    const slotIdx = loadout.indexOf(w.id);
                    const equipped = slotIdx !== -1;
                    const dmgPct = WEAPON_POWER_PCT[w.id] ?? 60;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        data-testid={`loadout-pick-${w.id}`}
                        className={`uiv2-weapon-card ${equipped ? 'is-equipped' : ''}`}
                        onClick={() => {
                          onFeedback('toggle');
                          onToggleLoadoutWeapon(w.id);
                        }}
                      >
                        <div className="uiv2-weapon-top">
                          <span className="uiv2-weapon-en" dir="ltr">
                            {w.nameEn}
                          </span>
                          {equipped && (
                            <span className="uiv2-slot-index uiv2-tabular">اسلات {slotIdx + 1}</span>
                          )}
                        </div>
                        <div className="uiv2-weapon-svg">{renderWeaponIconSvg(w.id)}</div>
                        <div className="uiv2-weapon-fa">{w.nameFa}</div>
                        <div className="uiv2-weapon-cat">
                          {w.categoryFa} · <span className="uiv2-tabular">{w.damageLabel}</span>
                        </div>
                        <div className="uiv2-stat-track">
                          <div className="uiv2-stat-fill" style={{ width: `${dmgPct}%` }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};
