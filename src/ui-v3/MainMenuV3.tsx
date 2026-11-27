import React, { useMemo, useState } from 'react';
import { MAP_LIST, WEAPON_CATALOG, type MapId, type WeaponId } from '../game/rules';
import { useUiV3 } from './UiV3Context';
import { UI_V3_STAGE_LABEL, UI_V3_STAGE_NOTICE_FA, UI_V3_TITLE_FA } from './uiV3Store';
import { BidiText, GlassButton, GlassCard, GlassTabs } from './primitives';
import {
  IconCameraMark,
  IconCheck,
  IconFullscreen,
  IconGlobe,
  IconHistory,
  IconPalette,
  IconPlay,
  IconSliders,
  IconSparkles,
  IconTarget,
} from './icons';
import { PWAInstallButton } from '../components/PWAInstallButton';

type MenuDeckTab = 'maps' | 'loadout';

export const MainMenuV3: React.FC = React.memo(() => {
  const { state, dispatch, showToast } = useUiV3();
  const [deckTab, setDeckTab] = useState<MenuDeckTab>('maps');

  const currentMapMeta = useMemo(
    () => MAP_LIST.find((m) => m.id === state.currentMap) ?? MAP_LIST[0],
    [state.currentMap]
  );

  const loadoutWeapons = useMemo(
    () =>
      state.loadout
        .map((id) => WEAPON_CATALOG.find((w) => w.id === id))
        .filter((w): w is (typeof WEAPON_CATALOG)[number] => Boolean(w)),
    [state.loadout]
  );

  const deckTabs = useMemo(
    () => [
      { id: 'maps' as const, label: `نقشه (${MAP_LIST.length})`, testId: 'uiv3-deck-tab-maps' },
      { id: 'loadout' as const, label: `3 سلاح (${state.loadout.length}/${WEAPON_CATALOG.length})`, testId: 'uiv3-deck-tab-loadout' },
    ],
    [state.loadout.length]
  );

  const handleSelectMap = (mapId: MapId) => {
    dispatch({ type: 'FEEDBACK', kind: 'tap' });
    dispatch({ type: 'SELECT_MAP', mapId });
    const meta = MAP_LIST.find((m) => m.id === mapId);
    if (meta) showToast(`نقشه: ${meta.nameFa}`, 'info');
  };

  const handleToggleWeapon = (weaponId: WeaponId) => {
    dispatch({ type: 'FEEDBACK', kind: 'toggle' });
    dispatch({ type: 'TOGGLE_LOADOUT_WEAPON', weaponId });
  };

  return (
    <div
      id="uiv3-main-menu"
      className="uiv3-screen uiv3-main-menu"
      data-testid="uiv3-main-menu"
      data-glass-mode={state.glassResolution.mode}
      dir="rtl"
    >
      <div className="uiv3-ambient-backdrop" aria-hidden="true" />

      <div className="uiv3-menu-shell">
        {/* BLUR LAYER 1: Floating Liquid Glass Header Capsule */}
        <header className="uiv3-topbar uiv3-blur-layer uiv3-blur-l1">
          <div className="uiv3-brand-block">
            <div className="uiv3-brand-emblem">
              <IconCameraMark size={24} />
            </div>
            <div className="uiv3-brand-text">
              <div className="uiv3-brand-row">
                <h1 className="uiv3-brand-title" dir="ltr">
                  BODY<span>CAM</span> · VANGUARD
                </h1>
                <span
                  className="uiv3-stage-pill"
                  data-testid="uiv3-menu-stage-badge"
                  title={UI_V3_STAGE_NOTICE_FA}
                >
                  <BidiText text={`${UI_V3_TITLE_FA} · ${UI_V3_STAGE_LABEL}`} />
                </span>
              </div>
              <div className="uiv3-brand-meta" data-testid="uiv3-brand-meta">
                <bdi dir="ltr" className="uiv3-bidi-ltr">
                  {state.appVersion}
                </bdi>
                <span className="uiv3-dot" aria-hidden="true">
                  ·
                </span>
                <bdi dir="ltr" className="uiv3-bidi-ltr">
                  {state.presetLabel}
                </bdi>
                <span className="uiv3-dot" aria-hidden="true">
                  ·
                </span>
                <bdi dir="ltr" className="uiv3-bidi-ltr">
                  FPS {state.fpsLabel}
                </bdi>
              </div>
            </div>
          </div>

          <div className="uiv3-topbar-actions">
            {state.ogEnabled && (
              <button
                type="button"
                className="uiv3-og-pill"
                data-testid="btn-open-og-event"
                title="دورهٔ ایونت قدیمی (OG) تا چند روز دیگه تموم میشه و میره"
                onClick={() => {
                  dispatch({ type: 'FEEDBACK', kind: 'tap' });
                  dispatch({ type: 'OPEN_OG_INTRO' });
                }}
              >
                <IconHistory size={15} />
                <bdi dir="ltr" className="uiv3-bidi-ltr">
                  OG
                </bdi>
                <span className="uiv3-og-tag">تا چند روز دیگه</span>
              </button>
            )}
            <button
              type="button"
              className="uiv3-icon-circle-btn"
              aria-label={state.isFullscreen ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه'}
              data-testid="uiv3-btn-fullscreen"
              onClick={() => {
                dispatch({ type: 'FEEDBACK', kind: 'tap' });
                dispatch({ type: 'TOGGLE_FULLSCREEN' });
              }}
            >
              <IconFullscreen size={17} />
            </button>
            <button
              type="button"
              className="uiv3-icon-circle-btn is-accent"
              aria-label="تنظیمات"
              data-testid="uiv3-btn-open-settings"
              onClick={() => {
                dispatch({ type: 'FEEDBACK', kind: 'tap' });
                dispatch({ type: 'OPEN_SETTINGS' });
              }}
            >
              <IconSliders size={17} />
            </button>
          </div>
        </header>

        {/* MAIN 2-COLUMN LANDSCAPE WORKSPACE */}
        <main className="uiv3-menu-grid">
          {/* Primary Command Hub (Right in RTL) — crisp specular glass without heavy full-card backdrop blur */}
          <GlassCard elevated className="uiv3-command-card" data-testid="uiv3-command-card">
            <div className="uiv3-summary-strip" data-testid="uiv3-summary-strip">
              <div className="uiv3-summary-row">
                <span className="uiv3-summary-k">نقشه فعال</span>
                <strong className="uiv3-summary-v uiv3-summary-map" data-testid="uiv3-active-map-label">
                  <BidiText text={currentMapMeta.nameFa} />
                </strong>
              </div>
              <div className="uiv3-summary-rule" aria-hidden="true" />
              <div className="uiv3-summary-row uiv3-summary-loadout-row">
                <span className="uiv3-summary-k">سلاح‌های همراه</span>
                <div className="uiv3-weapon-chips" data-testid="uiv3-loadout-chips">
                  {loadoutWeapons.map((w, idx) => (
                    <span
                      key={w.id}
                      className="uiv3-weapon-chip"
                      data-testid={`uiv3-loadout-chip-${idx + 1}`}
                    >
                      <span className="uiv3-weapon-chip-slot" dir="ltr">
                        {idx + 1}
                      </span>
                      <bdi dir="ltr" className="uiv3-bidi-ltr uiv3-weapon-chip-name">
                        {w.nameEn}
                      </bdi>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="uiv3-cta-stack">
              <GlassButton
                id="btn-start-game"
                data-testid="uiv3-btn-start-offline"
                variant="primary"
                size="lg"
                block
                icon={<IconPlay size={18} />}
                onClick={() => {
                  dispatch({ type: 'FEEDBACK', kind: 'confirm' });
                  dispatch({ type: 'START_OFFLINE' });
                }}
              >
                شروع عملیات آفلاین
              </GlassButton>

              <div className="uiv3-cta-pair">
                <GlassButton
                  data-testid="uiv3-btn-open-online"
                  variant="accent"
                  size="md"
                  block
                  icon={<IconGlobe size={17} />}
                  onClick={() => {
                    dispatch({ type: 'FEEDBACK', kind: 'tap' });
                    dispatch({ type: 'OPEN_ONLINE' });
                  }}
                >
                  <BidiText text="آنلاین (1v1 / 2v2)" />
                </GlassButton>
                <GlassButton
                  data-testid="uiv3-btn-open-training"
                  variant="secondary"
                  size="md"
                  block
                  icon={<IconTarget size={17} />}
                  onClick={() => {
                    dispatch({ type: 'FEEDBACK', kind: 'tap' });
                    dispatch({ type: 'OPEN_TRAINING' });
                  }}
                >
                  تمرین و آموزش
                </GlassButton>
              </div>
            </div>

            <div className="uiv3-dock-row">
              <button
                type="button"
                className="uiv3-dock-pill is-gold"
                data-testid="uiv3-btn-open-spin"
                onClick={() => {
                  dispatch({ type: 'FEEDBACK', kind: 'tap' });
                  dispatch({ type: 'OPEN_SPIN' });
                }}
              >
                <IconSparkles size={15} />
                <span>اسپین</span>
                <span className="uiv3-dock-count" dir="ltr">
                  {state.cosmeticsState.spins}
                </span>
              </button>

              <button
                type="button"
                className="uiv3-dock-pill"
                data-testid="uiv3-btn-open-skins"
                onClick={() => {
                  dispatch({ type: 'FEEDBACK', kind: 'tap' });
                  dispatch({ type: 'OPEN_SKINS' });
                }}
              >
                <IconPalette size={15} />
                <span>اسکین‌ها</span>
              </button>

              <button
                type="button"
                className="uiv3-dock-pill"
                data-testid="uiv3-btn-dock-settings"
                onClick={() => {
                  dispatch({ type: 'FEEDBACK', kind: 'tap' });
                  dispatch({ type: 'OPEN_SETTINGS' });
                }}
              >
                <IconSliders size={15} />
                <span>تنظیمات</span>
              </button>
            </div>

            <div className="uiv3-pwa-slot">
              <PWAInstallButton />
            </div>
          </GlassCard>

          {/* Tactical Map & 3-Weapon Loadout Configurator (Left in RTL) */}
          <GlassCard className="uiv3-deck-card" data-testid="uiv3-deck-card">
            <div className="uiv3-deck-head">
              <GlassTabs
                tabs={deckTabs}
                activeId={deckTab}
                onChange={(next) => {
                  dispatch({ type: 'FEEDBACK', kind: 'tap' });
                  setDeckTab(next);
                }}
                ariaLabel="انتخاب نقشه یا سلاح"
                compact
              />
            </div>

            <div className="uiv3-deck-scroll">
              {deckTab === 'maps' ? (
                <div className="uiv3-map-list" data-testid="uiv3-map-list">
                  {MAP_LIST.map((m) => {
                    const active = state.currentMap === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        data-testid={`uiv3-map-${m.id}`}
                        aria-pressed={active}
                        className={`uiv3-map-item ${active ? 'is-active' : ''}`}
                        onClick={() => handleSelectMap(m.id)}
                      >
                        <div className="uiv3-map-item-top">
                          <span className="uiv3-map-tag">
                            <BidiText text={m.badgeFa} />
                          </span>
                          {active && (
                            <span
                              className="uiv3-selected-badge"
                              data-testid={`uiv3-map-selected-${m.id}`}
                            >
                              <IconCheck size={11} />
                              <span>انتخاب‌شده</span>
                            </span>
                          )}
                        </div>
                        <strong className="uiv3-map-name">
                          <BidiText text={m.nameFa} />
                        </strong>
                        <span className="uiv3-map-sub">
                          <BidiText text={m.subtitleFa} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="uiv3-weapon-grid" data-testid="uiv3-weapon-grid">
                  {WEAPON_CATALOG.map((w) => {
                    const slotIdx = state.loadout.indexOf(w.id);
                    const equipped = slotIdx !== -1;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        data-testid={`uiv3-weapon-${w.id}`}
                        aria-pressed={equipped}
                        className={`uiv3-weapon-tile ${equipped ? 'is-equipped' : ''}`}
                        onClick={() => handleToggleWeapon(w.id)}
                      >
                        <div className="uiv3-weapon-tile-top">
                          <div className="uiv3-weapon-svg">{state.renderWeaponIconSvg(w.id)}</div>
                          {equipped && (
                            <span className="uiv3-slot-pill" dir="ltr">
                              {slotIdx + 1}
                            </span>
                          )}
                        </div>
                        <strong className="uiv3-weapon-en">
                          <bdi dir="ltr" className="uiv3-bidi-ltr">
                            {w.nameEn}
                          </bdi>
                        </strong>
                        <span className="uiv3-weapon-fa">
                          <BidiText text={w.nameFa} />
                        </span>
                        <span className="uiv3-weapon-dmg">
                          <bdi dir="ltr" className="uiv3-bidi-ltr">
                            {w.damageLabel}
                          </bdi>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </GlassCard>
        </main>
      </div>
    </div>
  );
});
