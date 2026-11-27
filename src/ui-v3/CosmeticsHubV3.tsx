import React, { Suspense, startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CATEGORY_LABELS_FA,
  COSMETIC_ITEM_BY_ID,
  COSMETIC_ITEMS,
  KILLS_PER_FREE_SPIN,
  LEGENDARY_AK47_ID,
  LEGENDARY_KATANA_ID,
  LEGENDARY_RPG_ID,
  LEGENDARY_SNIPER_ID,
  MYTHIC_M249_ID,
  MYTHIC_SHOTGUN_ID,
  RARITY_META,
  SHARDS_PER_FREE_SPIN,
  buildSpinReelStrip,
  canClaimDailyFreeSpin,
  computeSpinReelTargetOffsetPx,
  getBannerPityCounter,
  getSpinBannerItems,
  resolveSpinReelIndexAtOffsetPx,
  type CosmeticCategory,
  type CosmeticItem,
  type CosmeticRarity,
  type SpinOutcome,
} from '../game/cosmetics';
import {
  DEFAULT_SPIN_BANNER_ID,
  SPIN_BANNERS,
  getSpinBannerConfig,
  type SpinBannerId,
} from '../game/spins.config';
import { MYTHIC_PERK_SUMMARY_FA, MYTHIC_SHOTGUN_PERK_SUMMARY_FA } from '../game/mythicPerks';
import { disposeSharedPreviewRenderer } from '../game/sharedPreviewRenderer';
import { createDebouncedCallback, measureModalOpenPaint } from '../utils/perfHelpers';
import { lazyWithPreload } from '../utils/lazyWithPreload';
import type { CosmeticsHubModalProps, CosmeticsHubTab } from '../components/CosmeticsHubModal';
import { BidiText, GlassButton, GlassTabs } from './primitives';
import { IconClose, IconPalette, IconSparkles } from './icons';

const RedeemCodeSection = lazyWithPreload(() =>
  import('../components/RedeemCodeSection').then((m) => ({ default: m.RedeemCodeSection }))
);
const InfernoPreview3D = lazyWithPreload(() =>
  import('../components/InfernoPreview3D').then((m) => ({ default: m.InfernoPreview3D }))
);
const VoidPiercerPreview3D = lazyWithPreload(() =>
  import('../components/VoidPiercerPreview3D').then((m) => ({ default: m.VoidPiercerPreview3D }))
);
const TempestAegisPreview3D = lazyWithPreload(() =>
  import('../components/TempestAegisPreview3D').then((m) => ({ default: m.TempestAegisPreview3D }))
);
const EclipseBreacherPreview3D = lazyWithPreload(() =>
  import('../components/EclipseBreacherPreview3D').then((m) => ({
    default: m.EclipseBreacherPreview3D,
  }))
);
const SakuraKatanaPreview3D = lazyWithPreload(() =>
  import('../components/SakuraKatanaPreview3D').then((m) => ({ default: m.SakuraKatanaPreview3D }))
);
const NovaDragonRpgPreview3D = lazyWithPreload(() =>
  import('../components/NovaDragonRpgPreview3D').then((m) => ({ default: m.NovaDragonRpgPreview3D }))
);

export function preloadCosmeticsV3Defaults(): Promise<void> {
  return Promise.all([
    InfernoPreview3D.preload(),
    EclipseBreacherPreview3D.preload(),
    RedeemCodeSection.preload(),
  ]).then(() => undefined);
}

type SkinSubTab = 'shotgun' | 'm249' | 'ak47' | 'sniper' | 'katana' | 'rpg' | 'extras';

interface WeaponSkinMeta {
  id: Exclude<SkinSubTab, 'extras'>;
  category: CosmeticCategory;
  weaponFa: string;
  weaponEn: string;
  skinId: string;
  bannerId: SpinBannerId;
  defaultDescFa: string;
  perkListFa?: readonly string[];
}

const WEAPON_SKINS: readonly WeaponSkinMeta[] = [
  {
    id: 'shotgun',
    category: 'shotgun_skin',
    weaponFa: 'شاتگان SPAS-12',
    weaponEn: 'SPAS-12',
    skinId: MYTHIC_SHOTGUN_ID,
    bannerId: 'shotgun_eclipse',
    defaultDescFa: 'نسخهٔ استاندارد 8 تیری بدون افکت و بدون مزیت میتیک.',
    perkListFa: MYTHIC_SHOTGUN_PERK_SUMMARY_FA,
  },
  {
    id: 'm249',
    category: 'm249_skin',
    weaponFa: 'تیربار M249',
    weaponEn: 'M249 SAW',
    skinId: MYTHIC_M249_ID,
    bannerId: 'lmg_tempest',
    defaultDescFa: 'نسخهٔ استاندارد نظامی 100 تیری بدون مزیت میتیک.',
    perkListFa: MYTHIC_PERK_SUMMARY_FA,
  },
  {
    id: 'ak47',
    category: 'ak47_skin',
    weaponFa: 'کلاشنیکف AK-47',
    weaponEn: 'AK-47',
    skinId: LEGENDARY_AK47_ID,
    bannerId: 'ak47_inferno',
    defaultDescFa: 'نسخهٔ کلاسیک چوب و فولاد (کاملاً ظاهری).',
  },
  {
    id: 'sniper',
    category: 'sniper_skin',
    weaponFa: 'اسنایپر AWM',
    weaponEn: 'AWM Sniper',
    skinId: LEGENDARY_SNIPER_ID,
    bannerId: 'sniper_void',
    defaultDescFa: 'اسکوپ کلاسیک Mil-Dot با بدنه استاندارد (کاملاً ظاهری).',
  },
  {
    id: 'katana',
    category: 'katana_skin',
    weaponFa: 'کاتانا (شمشیر)',
    weaponEn: 'Tactical Blade',
    skinId: LEGENDARY_KATANA_ID,
    bannerId: 'katana_sakura',
    defaultDescFa: 'کاتانای تاکتیکی استاندارد با تیغه فولادی (کاملاً ظاهری).',
  },
  {
    id: 'rpg',
    category: 'rpg_skin',
    weaponFa: 'آرپی‌جی RPG-7V',
    weaponEn: 'RPG-7V',
    skinId: LEGENDARY_RPG_ID,
    bannerId: 'rpg_nova',
    defaultDescFa: 'راکت‌انداز استاندارد با کلاهک PG-7V (کاملاً ظاهری).',
  },
];

const EXTRA_COSMETIC_CATEGORIES: readonly CosmeticCategory[] = [
  'tracer_color',
  'muzzle_flash',
  'crosshair_color',
  'name_frame',
  'name_badge',
  'kill_icon',
];

const RARITY_ACCENT: Readonly<Record<CosmeticRarity, string>> = {
  common: '#94a3b8',
  rare: '#38bdf8',
  epic: '#c084fc',
  legendary: '#fbbf24',
  mythic: '#ff3b6b',
};

const REEL_TOTAL_SLOTS = 44;
const REEL_WIN_INDEX = 34;
const REEL_DURATION_MS = 2650;

function buildIdleReelStrip(pool: readonly CosmeticItem[], featuredItem?: CosmeticItem): CosmeticItem[] {
  const safePool = pool.length > 0 ? pool : COSMETIC_ITEMS;
  const out: CosmeticItem[] = [];
  for (let i = 0; i < 18; i++) {
    if (i === 4 && featuredItem) out.push(featuredItem);
    else out.push(safePool[i % safePool.length]);
  }
  return out;
}

function easeSpinReel(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped < 0.12) {
    const u = clamped / 0.12;
    return 0.08 * u * u;
  }
  const u = (clamped - 0.12) / 0.88;
  return 0.08 + 0.92 * (1 - Math.pow(1 - u, 4.2));
}

const PreviewGlassSkeleton: React.FC = () => (
  <div className="uiv3-preview-skeleton" role="status" aria-label="در حال بارگذاری پیش‌نمایش سه‌بعدی">
    <span className="uiv3-spinner" aria-hidden="true" />
    <span>آماده‌سازی پیش‌نمایش سه‌بعدی...</span>
  </div>
);

/**
 * Liquid Glass Stage 2 — Spin Wheel, Weapon Skins, Extras & Redeem Hub.
 * Reuses the exact deterministic reel math, shared 3D preview renderer, and cosmetics callbacks.
 * Blur Budget: strictly 1 small blur layer (header capsule) in 'liquid' mode.
 */
export const CosmeticsHubV3: React.FC<CosmeticsHubModalProps> = React.memo(({
  initialTab,
  initialBannerId,
  allowSpin,
  allowSkins,
  allowRedeem,
  isInMatch = false,
  deferredSkinNoticeFa = null,
  state,
  reducedMotion,
  onExecuteSpin,
  onClaimDailySpin,
  onEquipItem,
  onUnlockRewardFromRedeem,
  onEquipRewardFromRedeem,
  onPlayTick,
  onPlayReveal,
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
  onPlayNovaRpgLaunchSound,
  onPlayNovaRpgExplosionSound,
  onPlayNovaRpgKillSound,
  onClose,
}) => {
  const resolvedInitialTab: CosmeticsHubTab =
    initialTab === 'spin' && allowSpin
      ? 'spin'
      : initialTab === 'skins' && allowSkins
        ? 'skins'
        : initialTab === 'redeem' && allowRedeem
          ? 'redeem'
          : allowSpin
            ? 'spin'
            : allowSkins
              ? 'skins'
              : 'redeem';

  const [activeTab, setActiveTab] = useState<CosmeticsHubTab>(resolvedInitialTab);
  const [selectedBannerId, setSelectedBannerId] = useState<SpinBannerId>(
    initialBannerId || DEFAULT_SPIN_BANNER_ID
  );
  const [skinSubTab, setSkinSubTab] = useState<SkinSubTab>('shotgun');
  const [extraCategory, setExtraCategory] = useState<CosmeticCategory>('tracer_color');
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinStatusMsg, setSpinStatusMsg] = useState<string | null>(null);
  const [spinResult, setSpinResult] = useState<SpinOutcome | null>(null);
  const [showOdds, setShowOdds] = useState(false);
  const [landedWinIndex, setLandedWinIndex] = useState<number | null>(null);

  const activeBanner = useMemo(() => getSpinBannerConfig(selectedBannerId), [selectedBannerId]);
  const bannerPool = useMemo(() => getSpinBannerItems(selectedBannerId), [selectedBannerId]);
  const featuredItem = COSMETIC_ITEM_BY_ID.get(activeBanner.featuredItemId);
  const featuredOwned = state.ownedIds.includes(activeBanner.featuredItemId);
  const dailyAvailable = canClaimDailyFreeSpin(state);
  const pityCount = getBannerPityCounter(state, selectedBannerId);

  const [reelItems, setReelItems] = useState<CosmeticItem[]>(() =>
    buildIdleReelStrip(
      getSpinBannerItems(initialBannerId || DEFAULT_SPIN_BANNER_ID),
      COSMETIC_ITEM_BY_ID.get(
        getSpinBannerConfig(initialBannerId || DEFAULT_SPIN_BANNER_ID).featuredItemId
      )
    )
  );

  const spinningLockRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const reelViewportRef = useRef<HTMLDivElement | null>(null);
  const reelTrackRef = useRef<HTMLDivElement | null>(null);
  const lastLandedIndexRef = useRef<number | null>(null);

  const cancelReelAnimation = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    spinningLockRef.current = false;
  }, []);

  const applyTrackTransform = useCallback((offsetPx: number) => {
    if (reelTrackRef.current) {
      reelTrackRef.current.style.transform = `translate3d(${-offsetPx}px, 0, 0)`;
    }
  }, []);

  const measureReelMetrics = useCallback(() => {
    const vp = reelViewportRef.current;
    const track = reelTrackRef.current;
    const viewportWidthPx = vp ? vp.clientWidth : 520;
    let slotWidthPx = 114;
    let slotGapPx = 8;
    let trackPaddingLeftPx = 0;

    if (track) {
      const style = window.getComputedStyle(track);
      const parsedGap = parseFloat(style.columnGap || style.gap || '8');
      if (Number.isFinite(parsedGap) && parsedGap >= 0) slotGapPx = parsedGap;
      const parsedPad = parseFloat(style.paddingLeft || '0');
      if (Number.isFinite(parsedPad) && parsedPad >= 0) trackPaddingLeftPx = parsedPad;
      const firstSlot = track.querySelector<HTMLElement>('.uiv3-reel-slot');
      if (firstSlot && firstSlot.offsetWidth > 0) {
        slotWidthPx = firstSlot.offsetWidth;
      }
    }
    return { viewportWidthPx, slotWidthPx, slotGapPx, trackPaddingLeftPx };
  }, []);

  useEffect(() => {
    if (spinningLockRef.current) return;
    setReelItems(buildIdleReelStrip(bannerPool, featuredItem));
    setLandedWinIndex(null);
    lastLandedIndexRef.current = null;
    const id = window.requestAnimationFrame(() => {
      const metrics = measureReelMetrics();
      const idleOffset = computeSpinReelTargetOffsetPx({ winIndex: 4, ...metrics });
      applyTrackTransform(idleOffset);
    });
    return () => window.cancelAnimationFrame(id);
  }, [bannerPool, featuredItem, measureReelMetrics, applyTrackTransform]);

  const [previewMountReady, setPreviewMountReady] = useState(false);

  useEffect(() => {
    measureModalOpenPaint(initialTab === 'skins' ? 'skins-v3' : 'spin-v3');
    let timerId: number | null = null;
    const rafId = window.requestAnimationFrame(() => {
      timerId = window.setTimeout(() => setPreviewMountReady(true), 60);
    });
    return () => {
      window.cancelAnimationFrame(rafId);
      if (timerId !== null) window.clearTimeout(timerId);
      disposeSharedPreviewRenderer();
    };
  }, []);

  useEffect(() => {
    const onResize = createDebouncedCallback(() => {
      if (spinningLockRef.current) return;
      const targetIdx = lastLandedIndexRef.current ?? 4;
      const metrics = measureReelMetrics();
      const nextOffset = computeSpinReelTargetOffsetPx({ winIndex: targetIdx, ...metrics });
      applyTrackTransform(nextOffset);
    }, 100);
    window.addEventListener('resize', onResize);
    return () => {
      onResize.cancel();
      window.removeEventListener('resize', onResize);
    };
  }, [measureReelMetrics, applyTrackTransform]);

  useEffect(() => {
    setActiveTab(resolvedInitialTab);
  }, [resolvedInitialTab]);

  useEffect(() => {
    if (initialBannerId) setSelectedBannerId(initialBannerId);
  }, [initialBannerId]);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelReelAnimation();
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      cancelReelAnimation();
    };
  }, [cancelReelAnimation]);

  const activeWeaponMeta = useMemo(
    () => WEAPON_SKINS.find((w) => w.id === skinSubTab) || WEAPON_SKINS[0],
    [skinSubTab]
  );

  const extraItems = useMemo(
    () => COSMETIC_ITEMS.filter((item) => item.category === extraCategory),
    [extraCategory]
  );

  const primaryTabs = useMemo(() => {
    const list: Array<{ id: CosmeticsHubTab; label: string; icon?: React.ReactNode; testId: string }> = [];
    if (allowSpin) {
      list.push({
        id: 'spin',
        label: 'گردونه اسپین',
        icon: <IconSparkles size={14} />,
        testId: 'chub-tab-spin',
      });
    }
    if (allowSkins) {
      list.push({
        id: 'skins',
        label: 'اسکین‌ها',
        icon: <IconPalette size={14} />,
        testId: 'chub-tab-skins',
      });
    }
    if (allowRedeem) {
      list.push({
        id: 'redeem',
        label: 'کد ردیم',
        testId: 'chub-tab-redeem',
      });
    }
    return list;
  }, [allowSpin, allowSkins, allowRedeem]);

  const handleSpinNow = () => {
    if (spinningLockRef.current || isSpinning) return;
    if (state.spins <= 0) {
      setSpinStatusMsg('توکن اسپین کافی ندارید. با بازی، برد یا اسپین روزانه توکن رایگان بگیرید.');
      return;
    }

    spinningLockRef.current = true;
    setSpinStatusMsg(null);
    setSpinResult(null);
    setLandedWinIndex(null);

    const outcome = onExecuteSpin(selectedBannerId);
    if (!outcome) {
      spinningLockRef.current = false;
      setSpinStatusMsg('اسپین در دسترس نیست.');
      return;
    }

    const nextStrip = buildSpinReelStrip(
      outcome.item,
      REEL_TOTAL_SLOTS,
      REEL_WIN_INDEX,
      undefined,
      bannerPool
    );
    setReelItems(nextStrip);
    setIsSpinning(true);

    rafRef.current = window.requestAnimationFrame(() => {
      const metrics = measureReelMetrics();
      const targetOffsetPx = computeSpinReelTargetOffsetPx({
        winIndex: REEL_WIN_INDEX,
        ...metrics,
      });

      if (reducedMotion) {
        applyTrackTransform(targetOffsetPx);
        lastLandedIndexRef.current = REEL_WIN_INDEX;
        setLandedWinIndex(REEL_WIN_INDEX);
        spinningLockRef.current = false;
        setIsSpinning(false);
        onPlayReveal(outcome.item.rarity);
        setSpinResult(outcome);
        return;
      }

      const startOffsetPx = computeSpinReelTargetOffsetPx({ winIndex: 2, ...metrics });
      applyTrackTransform(startOffsetPx);

      const startTs = performance.now();
      let lastSlotIdx = resolveSpinReelIndexAtOffsetPx({
        offsetPx: startOffsetPx,
        ...metrics,
        stripLength: nextStrip.length,
      });

      const stepFrame = (now: number) => {
        if (!spinningLockRef.current) return;
        const t = Math.min(1, (now - startTs) / REEL_DURATION_MS);
        const eased = easeSpinReel(t);
        const currentOffset = startOffsetPx + (targetOffsetPx - startOffsetPx) * eased;
        applyTrackTransform(currentOffset);

        const curIdx = resolveSpinReelIndexAtOffsetPx({
          offsetPx: currentOffset,
          ...metrics,
          stripLength: nextStrip.length,
        });
        if (curIdx !== lastSlotIdx) {
          lastSlotIdx = curIdx;
          onPlayTick(0.88 + (1 - t) * 0.45);
        }

        if (t < 1) {
          rafRef.current = window.requestAnimationFrame(stepFrame);
        } else {
          applyTrackTransform(targetOffsetPx);
          rafRef.current = null;
          lastLandedIndexRef.current = REEL_WIN_INDEX;
          setLandedWinIndex(REEL_WIN_INDEX);
          spinningLockRef.current = false;
          setIsSpinning(false);
          onPlayReveal(outcome.item.rarity);
          setSpinResult(outcome);
        }
      };

      rafRef.current = window.requestAnimationFrame(stepFrame);
    });
  };

  const handleClaimDaily = () => {
    const ok = onClaimDailySpin();
    if (ok) setSpinStatusMsg('1 توکن اسپین روزانه به حساب شما اضافه شد.');
  };

  const handleCloseSafe = () => {
    cancelReelAnimation();
    onClose();
  };

  const renderSkinPreview = (skinId: string) =>
    !previewMountReady ? (
      <PreviewGlassSkeleton />
    ) : (
      <Suspense fallback={<PreviewGlassSkeleton />}>
      {skinId === LEGENDARY_AK47_ID && (
        <InfernoPreview3D
          key="preview-ak47"
          reducedMotion={reducedMotion}
          showDemoControls
          onTriggerFireSound={onPlayFireSound}
          onTriggerKillSound={onPlayInfernoKillSound}
        />
      )}
      {skinId === LEGENDARY_SNIPER_ID && (
        <VoidPiercerPreview3D
          key="preview-sniper"
          reducedMotion={reducedMotion}
          showDemoControls
          onTriggerFireSound={onPlayVoidShotSound}
          onTriggerKillSound={onPlayVoidKillSound}
          onTriggerScopeSound={onPlayVoidScopeSound}
        />
      )}
      {skinId === MYTHIC_M249_ID && (
        <TempestAegisPreview3D
          key="preview-m249"
          reducedMotion={reducedMotion}
          showDemoControls
          onTriggerShotSound={onPlayTempestShotSound}
          onTriggerKillSound={onPlayTempestKillSound}
          onTriggerReloadPhaseSound={onPlayTempestReloadPhaseSound}
          onTriggerInspectSound={onPlayTempestInspectSound}
          onTriggerEmoteSound={onPlayTempestEmoteSound}
        />
      )}
      {skinId === MYTHIC_SHOTGUN_ID && (
        <EclipseBreacherPreview3D
          key="preview-shotgun"
          reducedMotion={reducedMotion}
          showDemoControls
          onTriggerShotSound={onPlayEclipseShotSound}
          onTriggerKillSound={onPlayEclipseKillSound}
          onTriggerReloadPhaseSound={onPlayEclipseReloadPhaseSound}
          onTriggerSightSound={onPlayEclipseSightSound}
          onTriggerInspectSound={onPlayEclipseInspectSound}
          onTriggerEmoteSound={onPlayEclipseEmoteSound}
        />
      )}
      {skinId === LEGENDARY_KATANA_ID && (
        <SakuraKatanaPreview3D
          key="preview-katana"
          reducedMotion={reducedMotion}
          showDemoControls
          onTriggerSlashSound={onPlaySakuraSlashSound}
          onTriggerKillSound={onPlaySakuraKillSound}
        />
      )}
      {skinId === LEGENDARY_RPG_ID && (
        <NovaDragonRpgPreview3D
          key="preview-rpg"
          reducedMotion={reducedMotion}
          showDemoControls
          onTriggerLaunchSound={onPlayNovaRpgLaunchSound}
          onTriggerExplosionSound={onPlayNovaRpgExplosionSound}
          onTriggerKillSound={onPlayNovaRpgKillSound}
        />
      )}
    </Suspense>
    );

  const bannerRarity = activeBanner.featuredRarity;
  const bannerAccent = RARITY_ACCENT[bannerRarity];
  const isSpinResultEquipped =
    spinResult !== null && state.equipped[spinResult.item.category] === spinResult.item.id;

  return (
    <div
      className="uiv3-modal-backdrop is-submodal"
      role="dialog"
      aria-modal="true"
      aria-label={allowSpin ? 'مرکز اسپین، اسکین‌ها و کد ردیم' : 'اسکین‌ها'}
      dir="rtl"
      data-testid="cosmetics-hub-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCloseSafe();
      }}
    >
      <div className="uiv3-ambient-scrim" aria-hidden="true" />
      <div className="uiv3-modal-sheet uiv3-cosmetics-sheet">
        <div className="uiv3-modal-glass-bg" aria-hidden="true" />
        <div className="uiv3-modal-content">
          {/* BLUR LAYER 1: Compact Liquid Glass Header */}
          <header className="uiv3-modal-header uiv3-blur-layer uiv3-blur-l1">
            <div className="uiv3-cosmetics-head-left">
              <h2 className="uiv3-modal-title">{allowSpin ? 'اسپین و اسکین‌ها' : 'اسکین‌ها'}</h2>
              <div className="uiv3-cosmetics-counters">
                <span className="uiv3-token-pill is-gold" data-testid="chub-spins-count">
                  <span>توکن</span>
                  <strong dir="ltr">{state.spins}</strong>
                </span>
                <span className="uiv3-token-pill" data-testid="chub-shards-count">
                  <span>شرد</span>
                  <strong dir="ltr">
                    {state.shards}/{SHARDS_PER_FREE_SPIN}
                  </strong>
                </span>
              </div>
            </div>

            <div className="uiv3-cosmetics-head-right">
              <div className="uiv3-cosmetics-nav-wrap">
                <GlassTabs
                  tabs={primaryTabs}
                  activeId={activeTab}
                  onChange={(next) => {
                    if (isSpinning) return;
                    startTransition(() => setActiveTab(next));
                  }}
                  ariaLabel="بخش‌های اسپین و اسکین"
                  compact
                />
              </div>
              <button
                type="button"
                className="uiv3-icon-circle-btn"
                data-testid="chub-close-btn"
                onClick={handleCloseSafe}
                aria-label="بستن"
              >
                <IconClose size={17} />
              </button>
            </div>
          </header>

          {deferredSkinNoticeFa && (
            <div
              className="uiv3-deferred-skin-notice"
              role="status"
              aria-live="polite"
              data-testid="chub-deferred-skin-notice"
            >
              {deferredSkinNoticeFa}
            </div>
          )}

          {/* SCROLLABLE BODY */}
          <div className="uiv3-cosmetics-body">
            {/* ===================== TAB 1: SPIN ===================== */}
            {activeTab === 'spin' && allowSpin && (
              <div className="uiv3-spin-stack" data-testid="chub-panel-spin">
                {/* Minimal Banner Switcher */}
                <div className="uiv3-banner-strip" role="tablist" aria-label="انتخاب بنر اسپین">
                  {SPIN_BANNERS.map((banner) => {
                    const isSel = banner.id === selectedBannerId;
                    const accent = RARITY_ACCENT[banner.featuredRarity];
                    const rMeta = RARITY_META[banner.featuredRarity];
                    return (
                      <button
                        key={banner.id}
                        type="button"
                        role="tab"
                        aria-selected={isSel}
                        disabled={isSpinning}
                        data-testid={`chub-banner-${banner.id}`}
                        className={`uiv3-banner-chip${isSel ? ' is-active' : ''}`}
                        style={isSel ? { borderColor: accent } : undefined}
                        onClick={() => {
                          startTransition(() => {
                            setSelectedBannerId(banner.id);
                            setSpinResult(null);
                            setSpinStatusMsg(null);
                            setLandedWinIndex(null);
                          });
                        }}
                      >
                        <span className="uiv3-banner-chip-name">
                          <BidiText text={banner.labelFa} />
                        </span>
                        <span
                          className="uiv3-rarity-pill"
                          style={{ color: accent, borderColor: `${accent}66` }}
                        >
                          {rMeta.labelFa}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Smooth Deterministic Horizontal Reel */}
                <section
                  className={`uiv3-reel-shell${isSpinning ? ' is-spinning' : ''}`}
                  aria-label="نوار چرخش جوایز"
                  data-testid="chub-spin-reel"
                  data-win-index={landedWinIndex ?? ''}
                  data-win-item-id={spinResult?.item.id ?? ''}
                  style={{ borderColor: `${bannerAccent}55` }}
                >
                  <div className="uiv3-reel-pointer-top" aria-hidden="true" />
                  <div className="uiv3-reel-pointer-line" aria-hidden="true" />
                  <div className="uiv3-reel-pointer-bottom" aria-hidden="true" />

                  <div className="uiv3-reel-viewport" ref={reelViewportRef} dir="ltr">
                    <div className="uiv3-reel-track" ref={reelTrackRef}>
                      {reelItems.map((item, idx) => {
                        const accent = RARITY_ACCENT[item.rarity];
                        const isWinner = landedWinIndex === idx && spinResult?.item.id === item.id;
                        return (
                          <div
                            key={`${item.id}-${idx}`}
                            className={`uiv3-reel-slot${isWinner ? ' is-winner' : ''}`}
                            data-slot-index={idx}
                            data-item-id={item.id}
                            style={{
                              borderTopColor: accent,
                              borderRightColor: isWinner ? accent : `${accent}44`,
                              borderBottomColor: isWinner ? accent : `${accent}44`,
                              borderLeftColor: isWinner ? accent : `${accent}44`,
                            }}
                          >
                            <span
                              className="uiv3-reel-rarity"
                              style={{ color: accent }}
                              dir="rtl"
                            >
                              {RARITY_META[item.rarity].labelFa}
                            </span>
                            <span
                              className="uiv3-reel-swatch"
                              style={{
                                backgroundColor: item.colorHex || accent,
                                borderColor: accent,
                              }}
                            >
                              {item.symbol || ''}
                            </span>
                            <span className="uiv3-reel-name" dir="rtl">
                              <BidiText text={item.nameFa} />
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>

                {/* Split Stage: Always-Accessible 3D Preview + Spin Controls & Reward Card */}
                <div className="uiv3-cosmetics-split">
                  <div className="uiv3-glass-group uiv3-preview-box">
                    <div className="uiv3-group-head">
                      <div>
                        <div className="uiv3-group-title">
                          <BidiText text={activeBanner.titleFa} />
                        </div>
                        <div className="uiv3-setting-desc" dir="ltr">
                          {activeBanner.titleEn}
                        </div>
                      </div>
                      <span
                        className="uiv3-rarity-pill"
                        style={{ color: bannerAccent, borderColor: `${bannerAccent}77` }}
                      >
                        {RARITY_META[bannerRarity].labelFa}
                      </span>
                    </div>

                    <div className="uiv3-preview-stage">
                      {renderSkinPreview(activeBanner.featuredItemId)}
                    </div>

                    <p className="uiv3-setting-desc" style={{ margin: 0 }}>
                      <BidiText text={activeBanner.subtitleFa} />
                    </p>
                  </div>

                  <div className="uiv3-glass-group uiv3-spin-controls-box">
                    {/* Rarity-Colored Reward Card */}
                    {spinResult && (
                      <div
                        className="uiv3-reward-card"
                        data-testid="chub-spin-result"
                        data-result-item-id={spinResult.item.id}
                        style={{
                          borderColor: RARITY_ACCENT[spinResult.item.rarity],
                          background: `linear-gradient(145deg, ${RARITY_ACCENT[spinResult.item.rarity]}28, rgba(12, 22, 42, 0.72))`,
                        }}
                      >
                        <div className="uiv3-group-head">
                          <span
                            className="uiv3-rarity-pill"
                            style={{
                              color: RARITY_ACCENT[spinResult.item.rarity],
                              borderColor: `${RARITY_ACCENT[spinResult.item.rarity]}88`,
                            }}
                          >
                            {RARITY_META[spinResult.item.rarity].labelFa}
                          </span>
                          <span className="uiv3-setting-desc">
                            {CATEGORY_LABELS_FA[spinResult.item.category]}
                          </span>
                        </div>

                        <div className="uiv3-reward-name" data-testid="chub-spin-result-name">
                          <BidiText text={spinResult.item.nameFa} />
                        </div>

                        {spinResult.isDuplicate ? (
                          <div className="uiv3-setting-desc">
                            آیتم تکراری ← +{spinResult.shardsGained} شرد
                            {spinResult.bonusSpinsFromShards > 0
                              ? ` (+${spinResult.bonusSpinsFromShards} توکن اسپین رایگان!)`
                              : ''}
                          </div>
                        ) : (
                          <div className="uiv3-reward-new-tag">آیتم جدید باز شد</div>
                        )}

                        <div className="uiv3-reward-actions">
                          <GlassButton
                            variant="primary"
                            size="md"
                            data-testid="chub-spin-again-btn"
                            disabled={isSpinning || state.spins <= 0}
                            onClick={handleSpinNow}
                          >
                            {state.spins > 0 ? `اسپین دوباره (${state.spins})` : 'توکن تمام شده'}
                          </GlassButton>
                          {!spinResult.isDuplicate && (
                            <GlassButton
                              variant="accent"
                              size="md"
                              data-testid="chub-result-equip-btn"
                              disabled={isSpinResultEquipped}
                              onClick={() =>
                                onEquipItem(spinResult.item.category, spinResult.item.id)
                              }
                            >
                              {isSpinResultEquipped ? 'انتخاب‌شده' : 'تجهیز فوری'}
                            </GlassButton>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Primary Spin CTA */}
                    {!spinResult && (
                      <GlassButton
                        variant="primary"
                        size="lg"
                        block
                        data-testid="chub-spin-btn"
                        disabled={isSpinning || state.spins <= 0}
                        onClick={handleSpinNow}
                      >
                        {isSpinning
                          ? 'در حال چرخش گردونه...'
                          : state.spins > 0
                            ? `اجرای اسپین · 1 توکن (موجودی: ${state.spins})`
                            : 'توکن اسپین تمام شده'}
                      </GlassButton>
                    )}

                    <div className="uiv3-cta-pair">
                      <GlassButton
                        variant="secondary"
                        size="sm"
                        block
                        data-testid="chub-daily-btn"
                        disabled={!dailyAvailable || isSpinning}
                        onClick={handleClaimDaily}
                      >
                        {dailyAvailable ? 'اسپین روزانه (+1)' : 'روزانه دریافت شد'}
                      </GlassButton>
                      <GlassButton
                        variant="subtle"
                        size="sm"
                        block
                        data-testid="chub-odds-btn"
                        onClick={() => setShowOdds((v) => !v)}
                      >
                        {showOdds ? 'بستن شانس‌ها' : 'جدول شانس‌ها'}
                      </GlassButton>
                    </div>

                    {spinStatusMsg && <div className="uiv3-success-banner">{spinStatusMsg}</div>}

                    <div className="uiv3-meta-card">
                      <div className="uiv3-meta-line">
                        <span>شانس جایزه اصلی</span>
                        <strong style={{ color: bannerAccent }} dir="ltr">
                          {bannerRarity === 'mythic'
                            ? `${activeBanner.rarityWeightsPct.mythic}% (1/10,000)`
                            : `${activeBanner.rarityWeightsPct.legendary}%`}
                        </strong>
                      </div>
                      <div className="uiv3-meta-line">
                        <span>تضمین (Pity)</span>
                        <strong dir="ltr">
                          {activeBanner.hasPity
                            ? `${pityCount} / ${activeBanner.pityThreshold}`
                            : 'ندارد (شانس خالص)'}
                        </strong>
                      </div>
                      <div className="uiv3-meta-line">
                        <span>اسپین رایگان با کیل</span>
                        <strong dir="ltr">
                          {state.killProgress} / {KILLS_PER_FREE_SPIN}
                        </strong>
                      </div>
                      {featuredOwned && (
                        <div className="uiv3-owned-note">
                          باز شده — از تب «اسکین‌ها» انتخاب کنید
                        </div>
                      )}
                    </div>

                    {showOdds && (
                      <div className="uiv3-odds-panel" data-testid="chub-odds-box">
                        {(['mythic', 'legendary', 'epic', 'rare', 'common'] as const).map(
                          (tier) => (
                            <div className="uiv3-meta-line" key={tier}>
                              <span style={{ color: RARITY_ACCENT[tier], fontWeight: 700 }}>
                                {RARITY_META[tier].labelFa}
                              </span>
                              <strong dir="ltr">{activeBanner.rarityWeightsPct[tier]}%</strong>
                            </div>
                          )
                        )}
                        <div className="uiv3-setting-desc">
                          مجموع جوایز بنر: <b dir="ltr">{bannerPool.length}</b> مورد ·{' '}
                          <BidiText text={featuredItem?.nameFa || ''} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ===================== TAB 2: SKINS ===================== */}
            {activeTab === 'skins' && allowSkins && (
              <div className="uiv3-spin-stack" data-testid="chub-panel-skins">
                {isInMatch && !allowSpin && (
                  <div className="uiv3-inmatch-spin-note" data-testid="chub-inmatch-spin-hint">
                    بعد از پایان مسابقه، گردونه از منوی اصلی در دسترس است.
                  </div>
                )}
                <div className="uiv3-banner-strip" role="tablist" aria-label="انتخاب سلاح یا تزئینات">
                  {WEAPON_SKINS.map((w) => {
                    const isSel = skinSubTab === w.id;
                    const equippedSpecial = state.equipped[w.category] === w.skinId;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        role="tab"
                        aria-selected={isSel}
                        data-testid={`chub-skin-tab-${w.id}`}
                        className={`uiv3-banner-chip${isSel ? ' is-active' : ''}`}
                        onClick={() => startTransition(() => setSkinSubTab(w.id))}
                      >
                        <span className="uiv3-banner-chip-name">
                          <BidiText text={w.weaponFa} />
                        </span>
                        {equippedSpecial && (
                          <span className="uiv3-status-dot" style={{ background: '#30d158' }} />
                        )}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    role="tab"
                    aria-selected={skinSubTab === 'extras'}
                    data-testid="chub-skin-tab-extras"
                    className={`uiv3-banner-chip${skinSubTab === 'extras' ? ' is-active' : ''}`}
                    onClick={() => startTransition(() => setSkinSubTab('extras'))}
                  >
                    <span className="uiv3-banner-chip-name">سایر تزئینات</span>
                  </button>
                </div>

                {skinSubTab !== 'extras' ? (
                  (() => {
                    const specialItem = COSMETIC_ITEM_BY_ID.get(activeWeaponMeta.skinId);
                    const isOwned = state.ownedIds.includes(activeWeaponMeta.skinId);
                    const isSpecialEquipped =
                      state.equipped[activeWeaponMeta.category] === activeWeaponMeta.skinId;
                    const specialRarity: CosmeticRarity = specialItem?.rarity || 'legendary';
                    const specialAccent = RARITY_ACCENT[specialRarity];
                    const rMeta = RARITY_META[specialRarity];

                    return (
                      <div className="uiv3-cosmetics-split">
                        <div className="uiv3-glass-group uiv3-preview-box">
                          <div className="uiv3-group-head">
                            <div>
                              <div className="uiv3-group-title">
                                <BidiText text={specialItem?.nameFa || activeWeaponMeta.weaponFa} />
                              </div>
                              <div className="uiv3-setting-desc" dir="ltr">
                                {specialItem?.nameEn || activeWeaponMeta.weaponEn}
                              </div>
                            </div>
                            <span
                              className="uiv3-rarity-pill"
                              style={{ color: specialAccent, borderColor: `${specialAccent}77` }}
                            >
                              {rMeta.labelFa}
                            </span>
                          </div>
                          <div className="uiv3-preview-stage">
                            {renderSkinPreview(activeWeaponMeta.skinId)}
                          </div>
                        </div>

                        {/* Equal-Sized Skin Cards */}
                        <div className="uiv3-equal-skin-grid">
                          {/* Default Skin Card */}
                          <article
                            className={`uiv3-skin-card${!isSpecialEquipped ? ' is-equipped' : ''}`}
                            data-testid={`chub-skin-card-default-${activeWeaponMeta.id}`}
                          >
                            <div className="uiv3-group-head">
                              <strong className="uiv3-skin-card-title">
                                <BidiText text={`استاندارد (${activeWeaponMeta.weaponEn})`} />
                              </strong>
                              <span
                                className={`uiv3-state-badge ${!isSpecialEquipped ? 'is-selected' : 'is-unlocked'}`}
                                data-testid={`chub-state-default-${activeWeaponMeta.id}`}
                              >
                                {!isSpecialEquipped ? 'انتخاب‌شده' : 'باز شده'}
                              </span>
                            </div>

                            <p className="uiv3-skin-card-desc">
                              <BidiText text={activeWeaponMeta.defaultDescFa} />
                            </p>

                            <div className="uiv3-skin-card-foot">
                              <GlassButton
                                variant={!isSpecialEquipped ? 'subtle' : 'secondary'}
                                size="sm"
                                block
                                data-testid={`chub-equip-default-${activeWeaponMeta.id}`}
                                disabled={!isSpecialEquipped}
                                onClick={() => onEquipItem(activeWeaponMeta.category, null)}
                              >
                                {!isSpecialEquipped ? 'انتخاب‌شده' : 'انتخاب استاندارد'}
                              </GlassButton>
                            </div>
                          </article>

                          {/* Special Legendary/Mythic Skin Card */}
                          <article
                            className={`uiv3-skin-card${isSpecialEquipped ? ' is-equipped' : ''}${!isOwned ? ' is-locked' : ''}`}
                            data-testid={`chub-skin-card-special-${activeWeaponMeta.id}`}
                            style={{
                              borderColor: isSpecialEquipped ? specialAccent : `${specialAccent}55`,
                            }}
                          >
                            <div className="uiv3-group-head">
                              <strong className="uiv3-skin-card-title">
                                <BidiText text={specialItem?.nameFa || ''} />
                              </strong>
                              <span
                                className={`uiv3-state-badge ${
                                  isSpecialEquipped
                                    ? 'is-selected'
                                    : isOwned
                                      ? 'is-unlocked'
                                      : 'is-locked'
                                }`}
                                data-testid={`chub-state-special-${activeWeaponMeta.id}`}
                              >
                                {isSpecialEquipped ? 'انتخاب‌شده' : isOwned ? 'باز شده' : 'قفل'}
                              </span>
                            </div>

                            <p className="uiv3-skin-card-desc">
                              <BidiText text={specialItem?.descriptionFa || ''} />
                            </p>

                            {activeWeaponMeta.perkListFa && (
                              <div className="uiv3-inline-note">
                                شامل مزایای محدود میتیک (قابل کنترل توسط میزبان اتاق)
                              </div>
                            )}

                            <div className="uiv3-skin-card-foot">
                              {isOwned ? (
                                <GlassButton
                                  variant={isSpecialEquipped ? 'subtle' : 'primary'}
                                  size="sm"
                                  block
                                  data-testid={`chub-equip-special-${activeWeaponMeta.id}`}
                                  disabled={isSpecialEquipped}
                                  onClick={() =>
                                    onEquipItem(activeWeaponMeta.category, activeWeaponMeta.skinId)
                                  }
                                >
                                  {isSpecialEquipped ? 'انتخاب‌شده' : 'انتخاب این اسکین'}
                                </GlassButton>
                              ) : allowSpin ? (
                                <GlassButton
                                  variant="accent"
                                  size="sm"
                                  block
                                  data-testid={`chub-goto-spin-${activeWeaponMeta.id}`}
                                  onClick={() => {
                                    startTransition(() => {
                                      setSelectedBannerId(activeWeaponMeta.bannerId);
                                      setActiveTab('spin');
                                    });
                                  }}
                                >
                                  قفل · رفتن به اسپین
                                </GlassButton>
                              ) : (
                                <GlassButton variant="subtle" size="sm" block disabled>
                                  قفل
                                </GlassButton>
                              )}
                            </div>
                          </article>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="uiv3-extras-stack">
                    <div className="uiv3-banner-strip">
                      {EXTRA_COSMETIC_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          className={`uiv3-opt-chip${extraCategory === cat ? ' is-active' : ''}`}
                          onClick={() => startTransition(() => setExtraCategory(cat))}
                        >
                          {CATEGORY_LABELS_FA[cat]}
                        </button>
                      ))}
                    </div>

                    <div className="uiv3-extras-grid">
                      <article
                        className={`uiv3-skin-card${state.equipped[extraCategory] === null ? ' is-equipped' : ''}`}
                      >
                        <div className="uiv3-group-head">
                          <strong className="uiv3-skin-card-title">پیش‌فرض</strong>
                          <span
                            className={`uiv3-state-badge ${
                              state.equipped[extraCategory] === null ? 'is-selected' : 'is-unlocked'
                            }`}
                          >
                            {state.equipped[extraCategory] === null ? 'انتخاب‌شده' : 'باز شده'}
                          </span>
                        </div>
                        <div className="uiv3-skin-card-foot">
                          <GlassButton
                            variant="secondary"
                            size="sm"
                            block
                            disabled={state.equipped[extraCategory] === null}
                            onClick={() => onEquipItem(extraCategory, null)}
                          >
                            {state.equipped[extraCategory] === null
                              ? 'انتخاب‌شده'
                              : 'انتخاب پیش‌فرض'}
                          </GlassButton>
                        </div>
                      </article>

                      {extraItems.map((item) => {
                        const owned = state.ownedIds.includes(item.id);
                        const equipped = state.equipped[extraCategory] === item.id;
                        const accent = RARITY_ACCENT[item.rarity];
                        return (
                          <article
                            key={item.id}
                            className={`uiv3-skin-card${equipped ? ' is-equipped' : ''}${!owned ? ' is-locked' : ''}`}
                            style={{ borderColor: equipped ? accent : `${accent}44` }}
                          >
                            <div className="uiv3-group-head">
                              <strong className="uiv3-skin-card-title">
                                <BidiText text={item.nameFa} />
                              </strong>
                              <span
                                className={`uiv3-state-badge ${
                                  equipped ? 'is-selected' : owned ? 'is-unlocked' : 'is-locked'
                                }`}
                              >
                                {equipped ? 'انتخاب‌شده' : owned ? 'باز شده' : 'قفل'}
                              </span>
                            </div>
                            {item.colorHex && (
                              <div className="uiv3-swatch-desc">
                                <span
                                  className="uiv3-swatch-dot"
                                  style={{ backgroundColor: item.colorHex }}
                                />
                                <span>{item.descriptionFa}</span>
                              </div>
                            )}
                            <div className="uiv3-skin-card-foot">
                              <GlassButton
                                variant={owned && !equipped ? 'primary' : 'subtle'}
                                size="sm"
                                block
                                disabled={!owned || equipped}
                                onClick={() => onEquipItem(extraCategory, item.id)}
                              >
                                {!owned ? 'قفل' : equipped ? 'انتخاب‌شده' : 'انتخاب'}
                              </GlassButton>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===================== TAB 3: REDEEM CODE ===================== */}
            {activeTab === 'redeem' && allowRedeem && (
              <div className="uiv3-glass-group" data-testid="chub-panel-redeem">
                <Suspense fallback={<PreviewGlassSkeleton />}>
                  <RedeemCodeSection
                    ownedIds={state.ownedIds}
                    equipped={state.equipped}
                    reducedMotion={reducedMotion}
                    onUnlockReward={onUnlockRewardFromRedeem}
                    onEquipReward={onEquipRewardFromRedeem}
                    onPlayRevealSound={(rarity) => onPlayReveal(rarity || 'legendary')}
                    onPlayFireSound={onPlayFireSound}
                    onPlayInfernoKillSound={onPlayInfernoKillSound}
                    onPlayVoidShotSound={onPlayVoidShotSound}
                    onPlayVoidKillSound={onPlayVoidKillSound}
                    onPlayVoidScopeSound={onPlayVoidScopeSound}
                    onPlayTempestShotSound={onPlayTempestShotSound}
                    onPlayTempestKillSound={onPlayTempestKillSound}
                    onPlayTempestReloadPhaseSound={onPlayTempestReloadPhaseSound}
                    onPlayTempestInspectSound={onPlayTempestInspectSound}
                    onPlayTempestEmoteSound={onPlayTempestEmoteSound}
                    onPlayEclipseShotSound={onPlayEclipseShotSound}
                    onPlayEclipseKillSound={onPlayEclipseKillSound}
                    onPlayEclipseReloadPhaseSound={onPlayEclipseReloadPhaseSound}
                    onPlayEclipseSightSound={onPlayEclipseSightSound}
                    onPlayEclipseInspectSound={onPlayEclipseInspectSound}
                    onPlayEclipseEmoteSound={onPlayEclipseEmoteSound}
                    onPlaySakuraSlashSound={onPlaySakuraSlashSound}
                    onPlaySakuraKillSound={onPlaySakuraKillSound}
                    onPlayNovaRpgLaunchSound={onPlayNovaRpgLaunchSound}
                    onPlayNovaRpgExplosionSound={onPlayNovaRpgExplosionSound}
                    onPlayNovaRpgKillSound={onPlayNovaRpgKillSound}
                  />
                </Suspense>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
