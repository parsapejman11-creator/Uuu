import React, { Suspense, lazy, useState } from 'react';
import {
  COSMETIC_ITEM_BY_ID,
  CosmeticCategory,
  CosmeticsState,
  LEGENDARY_AK47_ID,
  LEGENDARY_KATANA_ID,
  LEGENDARY_SNIPER_ID,
  MYTHIC_M249_ID,
  MYTHIC_SHOTGUN_ID,
  RARITY_META,
} from '../game/cosmetics';
import { MYTHIC_PERK_SUMMARY_FA, MYTHIC_SHOTGUN_PERK_SUMMARY_FA } from '../game/mythicPerks';
import type { SpinBannerId } from '../game/spins.config';

const TempestAegisPreview3D = lazy(() =>
  import('./TempestAegisPreview3D').then((m) => ({ default: m.TempestAegisPreview3D }))
);
const EclipseBreacherPreview3D = lazy(() =>
  import('./EclipseBreacherPreview3D').then((m) => ({ default: m.EclipseBreacherPreview3D }))
);
const InfernoPreview3D = lazy(() =>
  import('./InfernoPreview3D').then((m) => ({ default: m.InfernoPreview3D }))
);
const VoidPiercerPreview3D = lazy(() =>
  import('./VoidPiercerPreview3D').then((m) => ({ default: m.VoidPiercerPreview3D }))
);
const SakuraKatanaPreview3D = lazy(() =>
  import('./SakuraKatanaPreview3D').then((m) => ({ default: m.SakuraKatanaPreview3D }))
);

type WeaponSkinTabId = 'shotgun' | 'm249' | 'ak47' | 'sniper' | 'katana';

interface WeaponSkinEntry {
  tabId: WeaponSkinTabId;
  category: CosmeticCategory;
  weaponNameFa: string;
  weaponNameEn: string;
  specialSkinId: string;
  defaultDescFa: string;
  spinBannerId: SpinBannerId;
}

const WEAPON_SKIN_TABS: readonly WeaponSkinEntry[] = [
  {
    tabId: 'shotgun',
    category: 'shotgun_skin',
    weaponNameFa: 'شاتگان SPAS-12',
    weaponNameEn: 'SPAS-12 Breacher',
    specialSkinId: MYTHIC_SHOTGUN_ID,
    defaultDescFa: 'نسخهٔ استاندارد SPAS-12 با خشاب ۸ تیری و بدون مزیت میتیک.',
    spinBannerId: 'shotgun_eclipse',
  },
  {
    tabId: 'm249',
    category: 'm249_skin',
    weaponNameFa: 'تیربار M249',
    weaponNameEn: 'M249 SAW',
    specialSkinId: MYTHIC_M249_ID,
    defaultDescFa: 'نسخهٔ استاندارد نظامی M249 با جعبه ۱۰۰ تیری و بدون مزیت میتیک.',
    spinBannerId: 'lmg_tempest',
  },
  {
    tabId: 'ak47',
    category: 'ak47_skin',
    weaponNameFa: 'کلاشنیکف AK-47',
    weaponNameEn: 'AK-47',
    specialSkinId: LEGENDARY_AK47_ID,
    defaultDescFa: 'نسخهٔ استاندارد چوب و فولاد AK-47.',
    spinBannerId: 'ak47_inferno',
  },
  {
    tabId: 'sniper',
    category: 'sniper_skin',
    weaponNameFa: 'اسنایپ AWM',
    weaponNameEn: 'AWM .338',
    specialSkinId: LEGENDARY_SNIPER_ID,
    defaultDescFa: 'نسخهٔ استاندارد AWM با دوربین تک‌تیرانداز کلاسیک.',
    spinBannerId: 'sniper_void',
  },
  {
    tabId: 'katana',
    category: 'katana_skin',
    weaponNameFa: 'کاتانا (شمشیر)',
    weaponNameEn: 'Tactical Blade',
    specialSkinId: LEGENDARY_KATANA_ID,
    defaultDescFa: 'نسخهٔ استاندارد کاتانای تاکتیکی با تیغه فولادی.',
    spinBannerId: 'katana_sakura',
  },
];

interface SkinsModalProps {
  state: CosmeticsState;
  reducedMotion: boolean;
  onEquipSkin: (category: CosmeticCategory, itemId: string | null) => void;
  onOpenSpinBanner?: (bannerId: SpinBannerId) => void;
  onPlayFireSound: () => void;
  onPlayInfernoKillSound: (headshot: boolean) => void;
  onPlayVoidShotSound: () => void;
  onPlayVoidKillSound: (headshot: boolean) => void;
  onPlayVoidScopeSound: (entering: boolean) => void;
  onPlayTempestShotSound: (heat01: number) => void;
  onPlayTempestKillSound: (headshot: boolean) => void;
  onPlayTempestReloadPhaseSound: (phase: 'open' | 'swap' | 'close' | 'charge') => void;
  onPlayTempestInspectSound: () => void;
  onPlayTempestEmoteSound: () => void;
  onPlayEclipseShotSound?: () => void;
  onPlayEclipseKillSound?: (headshot: boolean) => void;
  onPlayEclipseReloadPhaseSound?: (phase: 'shell' | 'pump') => void;
  onPlayEclipseSightSound?: (entering: boolean) => void;
  onPlayEclipseInspectSound?: () => void;
  onPlayEclipseEmoteSound?: () => void;
  onPlaySakuraSlashSound?: () => void;
  onPlaySakuraKillSound?: (headshot: boolean) => void;
  onClose: () => void;
}

export const SkinsModal: React.FC<SkinsModalProps> = ({
  state,
  reducedMotion,
  onEquipSkin,
  onOpenSpinBanner,
  onPlayFireSound,
  onPlayInfernoKillSound,
  onPlayVoidShotSound,
  onPlayVoidKillSound,
  onPlayVoidScopeSound,
  onPlayTempestShotSound,
  onPlayTempestKillSound,
  onPlayTempestReloadPhaseSound,
  onPlayTempestInspectSound,
  onPlayTempestEmoteSound,
  onPlayEclipseShotSound,
  onPlayEclipseKillSound,
  onPlayEclipseReloadPhaseSound,
  onPlayEclipseSightSound,
  onPlayEclipseInspectSound,
  onPlayEclipseEmoteSound,
  onPlaySakuraSlashSound,
  onPlaySakuraKillSound,
  onClose,
}) => {
  const [activeTabId, setActiveTabId] = useState<WeaponSkinTabId>('m249');
  const [selectedChoice, setSelectedChoice] = useState<'default' | 'special'>(() =>
    state.equipped.m249_skin === MYTHIC_M249_ID ? 'special' : 'special'
  );

  const activeEntry = WEAPON_SKIN_TABS.find((w) => w.tabId === activeTabId) ?? WEAPON_SKIN_TABS[0];
  const specialItem = COSMETIC_ITEM_BY_ID.get(activeEntry.specialSkinId);
  const ownsSpecial = state.ownedIds.includes(activeEntry.specialSkinId);
  const equippedSkinId = state.equipped[activeEntry.category] ?? null;
  const isDefaultEquipped = equippedSkinId === null;
  const isSpecialEquipped = equippedSkinId === activeEntry.specialSkinId;
  const specialRarityMeta = specialItem ? RARITY_META[specialItem.rarity] : RARITY_META.legendary;

  const handleSelectTab = (entry: WeaponSkinEntry) => {
    setActiveTabId(entry.tabId);
    setSelectedChoice(state.equipped[entry.category] === entry.specialSkinId ? 'special' : 'special');
  };

  return (
    <div
      className="skins-modal-backdrop"
      data-testid="skins-modal"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="انتخاب اسکین سلاح‌ها"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="skins-modal-sheet">
        <div className="skins-modal-head">
          <div>
            <h2 className="skins-modal-title">اسکین‌ها (Loadout)</h2>
            <div className="skins-modal-sub">
              انتخاب اسکین برای هر سلاح · همیشه می‌توانید به پیش‌فرض برگردید
            </div>
          </div>
          <button
            type="button"
            className="spin-close-btn"
            data-testid="btn-close-skins"
            aria-label="بستن اسکین‌ها"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Weapon Tabs */}
        <div className="skins-weapon-tabs" role="tablist" aria-label="سلاح‌ها">
          {WEAPON_SKIN_TABS.map((entry) => {
            const isTabActive = entry.tabId === activeTabId;
            const hasSpecialEquipped = state.equipped[entry.category] === entry.specialSkinId;
            const item = COSMETIC_ITEM_BY_ID.get(entry.specialSkinId);
            return (
              <button
                key={entry.tabId}
                type="button"
                role="tab"
                aria-selected={isTabActive}
                data-testid={`skins-tab-${entry.tabId}`}
                className={`skins-weapon-tab${isTabActive ? ' active' : ''}`}
                onClick={() => handleSelectTab(entry)}
              >
                <span className="skins-weapon-tab-name">{entry.weaponNameFa}</span>
                <span className="skins-weapon-tab-status">
                  {hasSpecialEquipped && item
                    ? `${RARITY_META[item.rarity].labelFa} فعال`
                    : 'پیش‌فرض'}
                </span>
              </button>
            );
          })}
        </div>

        <div className="skins-modal-body">
          {/* Skin Cards: Always includes Default + Special Skin */}
          <div className="skins-choice-grid">
            {/* Default (Standard) Skin Card */}
            <div
              className={`skins-choice-card${selectedChoice === 'default' ? ' is-selected' : ''}${
                isDefaultEquipped ? ' is-equipped' : ''
              }`}
              data-testid={`skin-card-${activeEntry.tabId}-default`}
              onClick={() => setSelectedChoice('default')}
            >
              <div className="skins-choice-top">
                <span className="skins-rarity-pill rarity-common">پیش‌فرض</span>
                <span className="skins-owned-label">همیشه آزاد</span>
              </div>
              <div className="skins-choice-name">پیش‌فرض (معمولی)</div>
              <div className="skins-choice-en" dir="ltr">
                Standard · {activeEntry.weaponNameEn}
              </div>
              <button
                type="button"
                data-testid={`btn-equip-${activeEntry.tabId}-default`}
                className={`skins-action-btn${isDefaultEquipped ? ' is-active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedChoice('default');
                  onEquipSkin(activeEntry.category, null);
                }}
              >
                {isDefaultEquipped ? 'انتخاب‌شده ✓' : 'انتخاب پیش‌فرض'}
              </button>
            </div>

            {/* Special Skin Card (Mythic / Legendary) */}
            {specialItem && (
              <div
                className={`skins-choice-card rarity-${specialItem.rarity}${
                  specialItem.id === LEGENDARY_SNIPER_ID ? ' is-void-leg' : ''
                }${specialItem.id === MYTHIC_SHOTGUN_ID ? ' is-eclipse-mythic' : ''}${selectedChoice === 'special' ? ' is-selected' : ''}${
                  isSpecialEquipped ? ' is-equipped' : ''
                }`}
                data-testid={`skin-card-${activeEntry.tabId}-special`}
                onClick={() => setSelectedChoice('special')}
              >
                <div className="skins-choice-top">
                  <span
                    className={`skins-rarity-pill rarity-${specialItem.rarity}`}
                    style={{
                      color:
                        specialItem.id === MYTHIC_SHOTGUN_ID
                          ? '#f59e0b'
                          : specialItem.id === LEGENDARY_SNIPER_ID
                            ? '#22d3ee'
                            : specialItem.id === LEGENDARY_KATANA_ID
                              ? '#f472b6'
                              : specialRarityMeta.colorHex,
                    }}
                  >
                    {specialRarityMeta.labelFa}
                  </span>
                  <span className="skins-owned-label">{ownsSpecial ? 'باز شده ✓' : 'قفل'}</span>
                </div>
                <div className="skins-choice-name">{specialItem.nameFa}</div>
                <div className="skins-choice-en" dir="ltr">
                  {specialItem.nameEn}
                </div>
                {ownsSpecial ? (
                  <button
                    type="button"
                    data-testid={`btn-equip-${activeEntry.tabId}-special`}
                    className={`skins-action-btn primary${isSpecialEquipped ? ' is-active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedChoice('special');
                      onEquipSkin(activeEntry.category, specialItem.id);
                    }}
                  >
                    {isSpecialEquipped ? 'انتخاب‌شده ✓' : 'انتخاب (Equip)'}
                  </button>
                ) : (
                  <button
                    type="button"
                    data-testid={`btn-goto-spin-${activeEntry.tabId}`}
                    className="skins-action-btn locked"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenSpinBanner) {
                        onOpenSpinBanner(activeEntry.spinBannerId);
                      } else {
                        setSelectedChoice('special');
                      }
                    }}
                  >
                    باز کردن در اسپین
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 3D Preview Stage */}
          <div className="skins-preview-panel">
            {selectedChoice === 'default' ? (
              <div className="skins-default-preview" data-testid="skins-default-preview">
                <div className="skins-default-badge" dir="ltr">
                  STANDARD · {activeEntry.weaponNameEn}
                </div>
                <h3>{activeEntry.weaponNameFa} — نسخهٔ پیش‌فرض (معمولی)</h3>
                <p>{activeEntry.defaultDescFa}</p>
                {(activeEntry.tabId === 'm249' || activeEntry.tabId === 'shotgun') && (
                  <div className="skins-default-note">
                    با نسخهٔ معمولی هیچ مزیت میتیکی فعال نیست و تمام آمار سلاح استاندارد است.
                  </div>
                )}
              </div>
            ) : (
              <Suspense
                fallback={<div className="redeem-3d-loading">در حال بارگذاری نمایش سه‌بعدی...</div>}
              >
                {activeEntry.tabId === 'shotgun' ? (
                  <EclipseBreacherPreview3D
                    reducedMotion={reducedMotion}
                    showDemoControls
                    showPerksSummary
                    onTriggerShotSound={onPlayEclipseShotSound}
                    onTriggerKillSound={onPlayEclipseKillSound}
                    onTriggerReloadPhaseSound={onPlayEclipseReloadPhaseSound}
                    onTriggerSightSound={onPlayEclipseSightSound}
                    onTriggerInspectSound={onPlayEclipseInspectSound}
                    onTriggerEmoteSound={onPlayEclipseEmoteSound}
                  />
                ) : activeEntry.tabId === 'm249' ? (
                  <TempestAegisPreview3D
                    reducedMotion={reducedMotion}
                    showDemoControls
                    showPerksSummary
                    onTriggerShotSound={onPlayTempestShotSound}
                    onTriggerKillSound={onPlayTempestKillSound}
                    onTriggerReloadPhaseSound={onPlayTempestReloadPhaseSound}
                    onTriggerInspectSound={onPlayTempestInspectSound}
                    onTriggerEmoteSound={onPlayTempestEmoteSound}
                  />
                ) : activeEntry.tabId === 'ak47' ? (
                  <InfernoPreview3D
                    reducedMotion={reducedMotion}
                    showDemoControls
                    onTriggerFireSound={onPlayFireSound}
                    onTriggerKillSound={onPlayInfernoKillSound}
                  />
                ) : activeEntry.tabId === 'katana' ? (
                  <SakuraKatanaPreview3D
                    reducedMotion={reducedMotion}
                    showDemoControls
                    onTriggerSlashSound={onPlaySakuraSlashSound}
                    onTriggerKillSound={onPlaySakuraKillSound}
                  />
                ) : (
                  <VoidPiercerPreview3D
                    reducedMotion={reducedMotion}
                    showDemoControls
                    onTriggerFireSound={onPlayVoidShotSound}
                    onTriggerKillSound={onPlayVoidKillSound}
                    onTriggerScopeSound={onPlayVoidScopeSound}
                  />
                )}
              </Suspense>
            )}

            {selectedChoice === 'special' && activeEntry.tabId !== 'm249' && activeEntry.tabId !== 'shotgun' && specialItem && (
              <div className="skins-cosmetic-note">{specialItem.descriptionFa}</div>
            )}
            {selectedChoice === 'default' && (activeEntry.tabId === 'm249' || activeEntry.tabId === 'shotgun') && (
              <div className="mythic-perks-card is-muted" dir="rtl">
                <div className="mythic-perks-head">
                  <span>مزایای میتیک (غیرفعال روی نسخهٔ پیش‌فرض)</span>
                </div>
                <ul className="mythic-perks-list">
                  {(activeEntry.tabId === 'shotgun'
                    ? MYTHIC_SHOTGUN_PERK_SUMMARY_FA
                    : MYTHIC_PERK_SUMMARY_FA
                  )
                    .slice(0, 2)
                    .map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
