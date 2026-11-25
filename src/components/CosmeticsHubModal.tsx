import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CATEGORY_LABELS_FA,
  COSMETIC_ITEM_BY_ID,
  COSMETIC_ITEMS,
  CosmeticCategory,
  CosmeticItem,
  CosmeticRarity,
  CosmeticsState,
  KILLS_PER_FREE_SPIN,
  LEGENDARY_AK47_ID,
  LEGENDARY_SNIPER_ID,
  MYTHIC_M249_ID,
  MYTHIC_SHOTGUN_ID,
  RARITY_META,
  SHARDS_PER_FREE_SPIN,
  SpinOutcome,
  buildSpinReelStrip,
  canClaimDailyFreeSpin,
  computeSpinReelTargetOffsetPx,
  getBannerPityCounter,
  getSpinBannerItems,
  resolveSpinReelIndexAtOffsetPx,
} from '../game/cosmetics';
import {
  DEFAULT_SPIN_BANNER_ID,
  SPIN_BANNERS,
  SpinBannerId,
  getSpinBannerConfig,
} from '../game/spins.config';
import { MYTHIC_PERK_SUMMARY_FA, MYTHIC_SHOTGUN_PERK_SUMMARY_FA } from '../game/mythicPerks';
import type { RedeemRewardId } from '../game/redeem';
import { RedeemCodeSection } from './RedeemCodeSection';

const InfernoPreview3D = lazy(() =>
  import('./InfernoPreview3D').then((m) => ({ default: m.InfernoPreview3D }))
);
const VoidPiercerPreview3D = lazy(() =>
  import('./VoidPiercerPreview3D').then((m) => ({ default: m.VoidPiercerPreview3D }))
);
const TempestAegisPreview3D = lazy(() =>
  import('./TempestAegisPreview3D').then((m) => ({ default: m.TempestAegisPreview3D }))
);
const EclipseBreacherPreview3D = lazy(() =>
  import('./EclipseBreacherPreview3D').then((m) => ({ default: m.EclipseBreacherPreview3D }))
);

export type CosmeticsHubTab = 'spin' | 'skins' | 'redeem';
type SkinSubTab = 'shotgun' | 'm249' | 'ak47' | 'sniper' | 'extras';

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
    defaultDescFa: 'نسخهٔ استاندارد ۸ تیری بدون افکت و بدون مزیت میتیک.',
    perkListFa: MYTHIC_SHOTGUN_PERK_SUMMARY_FA,
  },
  {
    id: 'm249',
    category: 'm249_skin',
    weaponFa: 'تیربار M249',
    weaponEn: 'M249 SAW',
    skinId: MYTHIC_M249_ID,
    bannerId: 'lmg_tempest',
    defaultDescFa: 'نسخهٔ استاندارد نظامی ۱۰۰ تیری بدون مزیت میتیک.',
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
];

const EXTRA_COSMETIC_CATEGORIES: readonly CosmeticCategory[] = [
  'tracer_color',
  'muzzle_flash',
  'crosshair_color',
  'name_frame',
  'name_badge',
  'kill_icon',
];

/** Single canonical accent color per rarity tier */
const RARITY_ACCENT: Readonly<Record<CosmeticRarity, string>> = {
  common: '#94a3b8',
  rare: '#38bdf8',
  epic: '#a855f7',
  legendary: '#f59e0b',
  mythic: '#ff2a55',
};

const REEL_TOTAL_SLOTS = 44;
const REEL_WIN_INDEX = 34;
const REEL_DURATION_MS = 2650;

function buildIdleReelStrip(pool: readonly CosmeticItem[], featuredItem?: CosmeticItem): CosmeticItem[] {
  const safePool = pool.length > 0 ? pool : COSMETIC_ITEMS;
  const out: CosmeticItem[] = [];
  for (let i = 0; i < 18; i++) {
    if (i === 4 && featuredItem) {
      out.push(featuredItem);
    } else {
      out.push(safePool[i % safePool.length]);
    }
  }
  return out;
}

/** Smooth acceleration (first 12%) + natural quintic ease-out deceleration (remaining 88%) */
function easeSpinReel(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped < 0.12) {
    const u = clamped / 0.12;
    return 0.08 * u * u;
  }
  const u = (clamped - 0.12) / 0.88;
  return 0.08 + 0.92 * (1 - Math.pow(1 - u, 4.2));
}

export interface CosmeticsHubModalProps {
  initialTab: CosmeticsHubTab;
  initialBannerId?: SpinBannerId;
  allowSpin: boolean;
  allowSkins: boolean;
  allowRedeem: boolean;
  state: CosmeticsState;
  reducedMotion: boolean;
  onExecuteSpin: (bannerId: SpinBannerId) => SpinOutcome | null;
  onClaimDailySpin: () => boolean;
  onEquipItem: (category: CosmeticCategory, itemId: string | null) => void;
  onUnlockRewardFromRedeem: (rewardId: RedeemRewardId) => void;
  onEquipRewardFromRedeem: (rewardId: RedeemRewardId) => void;
  onPlayTick: (pitchScale?: number) => void;
  onPlayReveal: (rarity: CosmeticItem['rarity']) => void;
  onPlayFireSound: () => void;
  onPlayInfernoKillSound: (headshot: boolean) => void;
  onPlayVoidShotSound: () => void;
  onPlayVoidKillSound: (headshot: boolean) => void;
  onPlayVoidScopeSound: (entering: boolean) => void;
  onPlayTempestShotSound?: (heat01: number) => void;
  onPlayTempestKillSound?: (headshot: boolean) => void;
  onPlayTempestReloadPhaseSound?: (phase: 'open' | 'swap' | 'close' | 'charge') => void;
  onPlayTempestInspectSound?: () => void;
  onPlayTempestEmoteSound?: () => void;
  onPlayEclipseShotSound?: () => void;
  onPlayEclipseKillSound?: (headshot: boolean) => void;
  onPlayEclipseReloadPhaseSound?: (phase: 'shell' | 'pump') => void;
  onPlayEclipseSightSound?: (entering: boolean) => void;
  onPlayEclipseInspectSound?: () => void;
  onPlayEclipseEmoteSound?: () => void;
  onClose: () => void;
}

const PreviewSkeleton: React.FC = () => (
  <div className="chub-preview-skeleton" role="status" aria-label="در حال بارگذاری پیش‌نمایش سه‌بعدی">
    <div className="chub-skeleton-shimmer" />
    <span>در حال آماده‌سازی پیش‌نمایش سه‌بعدی...</span>
  </div>
);

export const CosmeticsHubModal: React.FC<CosmeticsHubModalProps> = ({
  initialTab,
  initialBannerId,
  allowSpin,
  allowSkins,
  allowRedeem,
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
    buildIdleReelStrip(getSpinBannerItems(initialBannerId || DEFAULT_SPIN_BANNER_ID), COSMETIC_ITEM_BY_ID.get(getSpinBannerConfig(initialBannerId || DEFAULT_SPIN_BANNER_ID).featuredItemId))
  );

  // Synchronous ref locks & RAF handles to make rapid multi-tap double-deduction and unmount leaks impossible
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
    let slotWidthPx = 116;
    let slotGapPx = 8;
    let trackPaddingLeftPx = 0;

    if (track) {
      const style = window.getComputedStyle(track);
      const parsedGap = parseFloat(style.columnGap || style.gap || '8');
      if (Number.isFinite(parsedGap) && parsedGap >= 0) slotGapPx = parsedGap;
      const parsedPad = parseFloat(style.paddingLeft || '0');
      if (Number.isFinite(parsedPad) && parsedPad >= 0) trackPaddingLeftPx = parsedPad;
      const firstSlot = track.querySelector<HTMLElement>('.chub-reel-slot');
      if (firstSlot && firstSlot.offsetWidth > 0) {
        slotWidthPx = firstSlot.offsetWidth;
      }
    }
    return { viewportWidthPx, slotWidthPx, slotGapPx, trackPaddingLeftPx };
  }, []);

  // Re-center idle or landed reel when banner changes or viewport resizes
  useEffect(() => {
    if (spinningLockRef.current) return;
    setReelItems(buildIdleReelStrip(bannerPool, featuredItem));
    setLandedWinIndex(null);
    lastLandedIndexRef.current = null;
    const id = window.requestAnimationFrame(() => {
      const metrics = measureReelMetrics();
      const idleOffset = computeSpinReelTargetOffsetPx({
        winIndex: 4,
        ...metrics,
      });
      applyTrackTransform(idleOffset);
    });
    return () => window.cancelAnimationFrame(id);
  }, [bannerPool, featuredItem, measureReelMetrics, applyTrackTransform]);

  useEffect(() => {
    const onResize = () => {
      if (spinningLockRef.current) return;
      const targetIdx = lastLandedIndexRef.current ?? 4;
      const metrics = measureReelMetrics();
      const nextOffset = computeSpinReelTargetOffsetPx({
        winIndex: targetIdx,
        ...metrics,
      });
      applyTrackTransform(nextOffset);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [measureReelMetrics, applyTrackTransform]);

  useEffect(() => {
    setActiveTab(resolvedInitialTab);
  }, [resolvedInitialTab]);

  useEffect(() => {
    if (initialBannerId) {
      setSelectedBannerId(initialBannerId);
    }
  }, [initialBannerId]);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Safe to close even mid-spin: result was already saved synchronously before animation started
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

  const handleSpinNow = () => {
    // Synchronous guard blocks double/rapid taps within the same frame before React disables button
    if (spinningLockRef.current || isSpinning) return;
    if (state.spins <= 0) {
      setSpinStatusMsg('توکن اسپین کافی ندارید. با بازی، برد یا اسپین روزانه توکن رایگان بگیرید.');
      return;
    }

    spinningLockRef.current = true;
    setSpinStatusMsg(null);
    setSpinResult(null);
    setLandedWinIndex(null);

    // 1. Pre-determine & synchronously persist result BEFORE any animation runs
    const outcome = onExecuteSpin(selectedBannerId);
    if (!outcome) {
      spinningLockRef.current = false;
      setSpinStatusMsg('اسپین در دسترس نیست.');
      return;
    }

    // 2. Build deterministic strip with exact winning item locked at REEL_WIN_INDEX
    const nextStrip = buildSpinReelStrip(
      outcome.item,
      REEL_TOTAL_SLOTS,
      REEL_WIN_INDEX,
      undefined,
      bannerPool
    );
    setReelItems(nextStrip);
    setIsSpinning(true);

    // Wait 1 frame so DOM renders the new strip slots before measuring exact slot widths
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

      const startOffsetPx = computeSpinReelTargetOffsetPx({
        winIndex: 2,
        ...metrics,
      });
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
          const pitchScale = 0.88 + (1 - t) * 0.45;
          onPlayTick(pitchScale);
        }

        if (t < 1) {
          rafRef.current = window.requestAnimationFrame(stepFrame);
        } else {
          // Exact pixel snap on winning slot center
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
    if (ok) {
      setSpinStatusMsg('۱ توکن اسپین روزانه به حساب شما اضافه شد.');
    }
  };

  const handleCloseSafe = () => {
    cancelReelAnimation();
    onClose();
  };

  // Single 3D Preview Renderer — guaranteed at most ONE WebGL canvas mounted across the entire modal
  const renderSkinPreview = (skinId: string) => {
    return (
      <Suspense fallback={<PreviewSkeleton />}>
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
      </Suspense>
    );
  };

  const bannerRarity = activeBanner.featuredRarity;
  const bannerAccent = RARITY_ACCENT[bannerRarity];

  const isSpinResultEquipped =
    spinResult !== null && state.equipped[spinResult.item.category] === spinResult.item.id;

  return (
    <div
      className={`chub-backdrop${reducedMotion ? ' is-reduced-motion' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="مرکز اسپین، اسکین‌ها و کد ردیم"
      dir="rtl"
      data-testid="cosmetics-hub-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCloseSafe();
      }}
    >
      <div className="chub-panel">
        {/* Top Minimal Header with Token Counter */}
        <header className="chub-header">
          <div className="chub-title-wrap">
            <h2 className="chub-title">اسپین و اسکین‌ها</h2>
            <div className="chub-stats-inline">
              <span className="chub-stat-chip chub-stat-tokens" data-testid="chub-spins-count">
                <span>توکن اسپین</span>
                <strong>{state.spins}</strong>
              </span>
              <span className="chub-stat-chip" data-testid="chub-shards-count">
                <span>شرد</span>
                <strong>
                  {state.shards}/{SHARDS_PER_FREE_SPIN}
                </strong>
              </span>
            </div>
          </div>

          <button
            type="button"
            className="chub-close-btn"
            data-testid="chub-close-btn"
            onClick={handleCloseSafe}
            aria-label="بستن"
          >
            ✕
          </button>
        </header>

        {/* Primary Segmented Navigation */}
        <nav className="chub-tabs" aria-label="بخش‌ها">
          {allowSpin && (
            <button
              type="button"
              className={`chub-tab-btn${activeTab === 'spin' ? ' is-active' : ''}`}
              data-testid="chub-tab-spin"
              disabled={isSpinning}
              onClick={() => setActiveTab('spin')}
            >
              گردونه اسپین
            </button>
          )}
          {allowSkins && (
            <button
              type="button"
              className={`chub-tab-btn${activeTab === 'skins' ? ' is-active' : ''}`}
              data-testid="chub-tab-skins"
              disabled={isSpinning}
              onClick={() => setActiveTab('skins')}
            >
              اسکین‌ها
            </button>
          )}
          {allowRedeem && (
            <button
              type="button"
              className={`chub-tab-btn${activeTab === 'redeem' ? ' is-active' : ''}`}
              data-testid="chub-tab-redeem"
              disabled={isSpinning}
              onClick={() => setActiveTab('redeem')}
            >
              کد ردیم
            </button>
          )}
        </nav>

        {/* Scrollable Body */}
        <div className="chub-body">
          {/* ===================== TAB 1: SPIN ===================== */}
          {activeTab === 'spin' && allowSpin && (
            <div className="chub-spin-view" data-testid="chub-panel-spin">
              {/* Banner Selector Strip */}
              <div className="chub-banner-strip" role="tablist" aria-label="انتخاب بنر اسپین">
                {SPIN_BANNERS.map((banner) => {
                  const isSel = banner.id === selectedBannerId;
                  const accent = RARITY_ACCENT[banner.featuredRarity];
                  const rarityMeta = RARITY_META[banner.featuredRarity];
                  return (
                    <button
                      key={banner.id}
                      type="button"
                      role="tab"
                      aria-selected={isSel}
                      disabled={isSpinning}
                      data-testid={`chub-banner-${banner.id}`}
                      className={`chub-banner-pill chub-tier-${banner.featuredRarity}${isSel ? ' is-active' : ''}`}
                      style={isSel ? { borderColor: accent } : undefined}
                      onClick={() => {
                        setSelectedBannerId(banner.id);
                        setSpinResult(null);
                        setSpinStatusMsg(null);
                        setLandedWinIndex(null);
                      }}
                    >
                      <span className="chub-banner-name">{banner.labelFa}</span>
                      <span
                        className="chub-tier-tag"
                        style={{ color: accent, borderColor: `${accent}66` }}
                      >
                        {rarityMeta.labelFa}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Deterministic Horizontal Spin Reel */}
              <section
                className={`chub-reel-shell chub-tier-${bannerRarity}${isSpinning ? ' is-spinning' : ''}`}
                aria-label="نوار چرخش جوایز"
                data-testid="chub-spin-reel"
                data-win-index={landedWinIndex ?? ''}
                data-win-item-id={spinResult?.item.id ?? ''}
              >
                <div className="chub-reel-pointer-top" aria-hidden="true" />
                <div className="chub-reel-pointer-line" aria-hidden="true" />
                <div className="chub-reel-pointer-bottom" aria-hidden="true" />
                <div className="chub-reel-fade-left" aria-hidden="true" />
                <div className="chub-reel-fade-right" aria-hidden="true" />

                {/* dir="ltr" is strictly required so translate3d(-offsetPx) maps index 1:1 to center */}
                <div className="chub-reel-viewport" ref={reelViewportRef} dir="ltr">
                  <div className="chub-reel-track" ref={reelTrackRef}>
                    {reelItems.map((item, idx) => {
                      const accent = RARITY_ACCENT[item.rarity];
                      const isWinner = landedWinIndex === idx && spinResult?.item.id === item.id;
                      const isHighTier = item.rarity === 'legendary' || item.rarity === 'mythic';
                      return (
                        <div
                          key={`${item.id}-${idx}`}
                          className={`chub-reel-slot chub-tier-${item.rarity}${isWinner ? ' is-winner' : ''}${isHighTier ? ' is-high-tier' : ''}`}
                          data-slot-index={idx}
                          data-item-id={item.id}
                          style={{
                            borderTopColor: accent,
                            borderRightColor: isWinner ? accent : `${accent}44`,
                            borderBottomColor: isWinner ? accent : `${accent}44`,
                            borderLeftColor: isWinner ? accent : `${accent}44`,
                          }}
                        >
                          <span className="chub-reel-rarity" style={{ color: accent }} dir="rtl">
                            {RARITY_META[item.rarity].labelFa}
                          </span>
                          <div className="chub-reel-icon-row">
                            <span
                              className="chub-reel-swatch"
                              style={{
                                backgroundColor: item.colorHex || accent,
                                borderColor: accent,
                              }}
                            >
                              {item.symbol || ''}
                            </span>
                          </div>
                          <span className="chub-reel-name" dir="rtl">
                            {item.nameFa}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* Compact Split Stage: Single 3D Featured Preview + Controls & Result */}
              <div className="chub-split-grid">
                <div className={`chub-preview-card chub-tier-${bannerRarity}`}>
                  <div className="chub-preview-meta">
                    <div className="chub-preview-titles">
                      <div className="chub-item-title">{activeBanner.titleFa}</div>
                      <div className="chub-item-sub" dir="ltr">
                        {activeBanner.titleEn}
                      </div>
                    </div>
                    <span
                      className="chub-tier-badge"
                      style={{
                        color: bannerAccent,
                        borderColor: `${bannerAccent}77`,
                      }}
                    >
                      {RARITY_META[bannerRarity].labelFa}
                    </span>
                  </div>

                  <div className="chub-preview-stage">
                    {renderSkinPreview(activeBanner.featuredItemId)}
                  </div>

                  <p className="chub-desc">{activeBanner.subtitleFa}</p>
                </div>

                <div className="chub-controls-card">
                  {/* Result Card (appears right above CTA on settle for immediate visibility) */}
                  {spinResult && (
                    <div
                      className={`chub-result-card chub-tier-${spinResult.item.rarity}`}
                      data-testid="chub-spin-result"
                      data-result-item-id={spinResult.item.id}
                      style={{ borderColor: RARITY_ACCENT[spinResult.item.rarity] }}
                    >
                      <div className="chub-result-head">
                        <span
                          className="chub-tier-tag"
                          style={{
                            color: RARITY_ACCENT[spinResult.item.rarity],
                            borderColor: `${RARITY_ACCENT[spinResult.item.rarity]}77`,
                          }}
                        >
                          {RARITY_META[spinResult.item.rarity].labelFa}
                        </span>
                        <span className="chub-result-cat">
                          {CATEGORY_LABELS_FA[spinResult.item.category]}
                        </span>
                      </div>

                      <div className="chub-result-name" data-testid="chub-spin-result-name">
                        {spinResult.item.nameFa}
                      </div>

                      {spinResult.isDuplicate ? (
                        <div className="chub-result-sub">
                          آیتم تکراری ← +{spinResult.shardsGained} شرد
                          {spinResult.bonusSpinsFromShards > 0
                            ? ` (+${spinResult.bonusSpinsFromShards} توکن اسپین رایگان!)`
                            : ''}
                        </div>
                      ) : (
                        <div className="chub-result-sub is-new">آیتم جدید باز شد</div>
                      )}

                      <div className="chub-result-actions">
                        <button
                          type="button"
                          className="chub-primary-btn chub-spin-again-btn"
                          data-testid="chub-spin-again-btn"
                          disabled={isSpinning || state.spins <= 0}
                          onClick={handleSpinNow}
                        >
                          {state.spins > 0 ? `اسپین دوباره (${state.spins})` : 'توکن تمام شده'}
                        </button>
                        {!spinResult.isDuplicate && (
                          <button
                            type="button"
                            className={`chub-equip-btn${isSpinResultEquipped ? ' is-done' : ''}`}
                            data-testid="chub-result-equip-btn"
                            disabled={isSpinResultEquipped}
                            onClick={() => onEquipItem(spinResult.item.category, spinResult.item.id)}
                          >
                            {isSpinResultEquipped ? 'انتخاب‌شده' : 'تجهیز فوری'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Primary Spin CTA */}
                  <div className="chub-action-stack">
                    {!spinResult && (
                      <button
                        type="button"
                        className={`chub-primary-btn${isSpinning ? ' is-busy' : ''}`}
                        data-testid="chub-spin-btn"
                        disabled={isSpinning || state.spins <= 0}
                        onClick={handleSpinNow}
                      >
                        {isSpinning
                          ? 'در حال چرخش گردونه...'
                          : state.spins > 0
                            ? `اجرای اسپین · ۱ توکن (موجودی: ${state.spins})`
                            : 'توکن اسپین تمام شده'}
                      </button>
                    )}

                    <div className="chub-secondary-row">
                      <button
                        type="button"
                        className="chub-secondary-btn"
                        data-testid="chub-daily-btn"
                        disabled={!dailyAvailable || isSpinning}
                        onClick={handleClaimDaily}
                      >
                        {dailyAvailable ? 'اسپین روزانه (+۱)' : 'روزانه دریافت شد'}
                      </button>

                      <button
                        type="button"
                        className="chub-secondary-btn"
                        data-testid="chub-odds-btn"
                        onClick={() => setShowOdds((v) => !v)}
                      >
                        {showOdds ? 'بستن شانس‌ها' : 'جدول شانس‌ها'}
                      </button>
                    </div>
                  </div>

                  {spinStatusMsg && <div className="chub-notice">{spinStatusMsg}</div>}

                  {/* Compact Meta Rows */}
                  <div className="chub-meta-list">
                    <div className="chub-meta-row">
                      <span>شانس جایزه اصلی</span>
                      <strong style={{ color: bannerAccent }} dir="ltr">
                        {bannerRarity === 'mythic'
                          ? `${activeBanner.rarityWeightsPct.mythic}% (1/10,000)`
                          : `${activeBanner.rarityWeightsPct.legendary}%`}
                      </strong>
                    </div>
                    <div className="chub-meta-row">
                      <span>تضمین (Pity)</span>
                      <strong>
                        {activeBanner.hasPity
                          ? `${pityCount} / ${activeBanner.pityThreshold}`
                          : 'ندارد (شانس خالص)'}
                      </strong>
                    </div>
                    <div className="chub-meta-row">
                      <span>اسپین رایگان با کیل</span>
                      <strong>
                        {state.killProgress} / {KILLS_PER_FREE_SPIN}
                      </strong>
                    </div>
                    {featuredOwned && (
                      <div className="chub-owned-banner">
                        باز شده — از تب «اسکین‌ها» انتخاب کنید
                      </div>
                    )}
                  </div>

                  {/* Collapsible Odds Table */}
                  {showOdds && (
                    <div className="chub-odds-box" data-testid="chub-odds-box">
                      {(['mythic', 'legendary', 'epic', 'rare', 'common'] as const).map((tier) => (
                        <div className="chub-odds-row" key={tier}>
                          <span style={{ color: RARITY_ACCENT[tier] }}>
                            {RARITY_META[tier].labelFa}
                          </span>
                          <span dir="ltr">{activeBanner.rarityWeightsPct[tier]}%</span>
                        </div>
                      ))}
                      <div className="chub-odds-pool">
                        مجموع جوایز بنر: {bannerPool.length} مورد · {featuredItem?.nameFa || ''}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB 2: SKINS & COLLECTION ===================== */}
          {activeTab === 'skins' && allowSkins && (
            <div className="chub-skins-view" data-testid="chub-panel-skins">
              <div className="chub-banner-strip" role="tablist" aria-label="انتخاب سلاح یا تزئینات">
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
                      className={`chub-banner-pill${isSel ? ' is-active' : ''}`}
                      onClick={() => setSkinSubTab(w.id)}
                    >
                      <span className="chub-banner-name">{w.weaponFa}</span>
                      {equippedSpecial && <span className="chub-dot-equipped" aria-label="انتخاب‌شده" />}
                    </button>
                  );
                })}
                <button
                  type="button"
                  role="tab"
                  aria-selected={skinSubTab === 'extras'}
                  data-testid="chub-skin-tab-extras"
                  className={`chub-banner-pill${skinSubTab === 'extras' ? ' is-active' : ''}`}
                  onClick={() => setSkinSubTab('extras')}
                >
                  <span className="chub-banner-name">سایر تزئینات</span>
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
                  const rarityMeta = RARITY_META[specialRarity];

                  return (
                    <div className="chub-split-grid">
                      {/* Single Active 3D Preview Stage */}
                      <div className={`chub-preview-card chub-tier-${specialRarity}`}>
                        <div className="chub-preview-meta">
                          <div className="chub-preview-titles">
                            <div className="chub-item-title">
                              {specialItem?.nameFa || activeWeaponMeta.weaponFa}
                            </div>
                            <div className="chub-item-sub" dir="ltr">
                              {specialItem?.nameEn || activeWeaponMeta.weaponEn}
                            </div>
                          </div>
                          <span
                            className="chub-tier-badge"
                            style={{
                              color: specialAccent,
                              borderColor: `${specialAccent}77`,
                            }}
                          >
                            {rarityMeta.labelFa}
                          </span>
                        </div>

                        <div className="chub-preview-stage">
                          {renderSkinPreview(activeWeaponMeta.skinId)}
                        </div>
                      </div>

                      {/* Equal-Sized Skin Cards (Zero Layout Shift) */}
                      <div className="chub-skin-cards-grid">
                        {/* Standard Skin Card */}
                        <article
                          className={`chub-skin-card chub-tier-common${!isSpecialEquipped ? ' is-equipped' : ''}`}
                          data-testid={`chub-skin-card-default-${activeWeaponMeta.id}`}
                        >
                          <div className="chub-skin-card-top">
                            <div className="chub-skin-card-head">
                              <strong>استاندارد ({activeWeaponMeta.weaponEn})</strong>
                              <span
                                className="chub-tier-tag"
                                style={{
                                  color: RARITY_ACCENT.common,
                                  borderColor: `${RARITY_ACCENT.common}66`,
                                }}
                              >
                                معمولی
                              </span>
                            </div>
                            <span
                              className={`chub-state-pill ${!isSpecialEquipped ? 'is-selected' : 'is-unlocked'}`}
                              data-testid={`chub-state-default-${activeWeaponMeta.id}`}
                            >
                              {!isSpecialEquipped ? 'انتخاب‌شده' : 'باز شده'}
                            </span>
                          </div>

                          <p className="chub-skin-card-desc">{activeWeaponMeta.defaultDescFa}</p>

                          <div className="chub-card-footer">
                            <button
                              type="button"
                              className={`chub-equip-btn${!isSpecialEquipped ? ' is-done' : ''}`}
                              data-testid={`chub-equip-default-${activeWeaponMeta.id}`}
                              disabled={!isSpecialEquipped}
                              onClick={() => onEquipItem(activeWeaponMeta.category, null)}
                            >
                              {!isSpecialEquipped ? 'انتخاب‌شده' : 'انتخاب استاندارد'}
                            </button>
                          </div>
                        </article>

                        {/* Special Legendary / Mythic Skin Card */}
                        <article
                          className={`chub-skin-card chub-tier-${specialRarity}${isSpecialEquipped ? ' is-equipped' : ''}${!isOwned ? ' is-locked' : ''}`}
                          data-testid={`chub-skin-card-special-${activeWeaponMeta.id}`}
                          style={{
                            borderColor: isSpecialEquipped ? specialAccent : `${specialAccent}55`,
                          }}
                        >
                          <div className="chub-skin-card-top">
                            <div className="chub-skin-card-head">
                              <strong>{specialItem?.nameFa}</strong>
                              <span
                                className="chub-tier-tag"
                                style={{
                                  color: specialAccent,
                                  borderColor: `${specialAccent}77`,
                                }}
                              >
                                {rarityMeta.labelFa}
                              </span>
                            </div>
                            <span
                              className={`chub-state-pill ${
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

                          <p className="chub-skin-card-desc">{specialItem?.descriptionFa}</p>

                          {activeWeaponMeta.perkListFa && (
                            <ul className="chub-perk-list">
                              {activeWeaponMeta.perkListFa.map((line) => (
                                <li key={line}>{line}</li>
                              ))}
                            </ul>
                          )}

                          <div className="chub-card-footer">
                            {isOwned ? (
                              <button
                                type="button"
                                className={`chub-equip-btn${isSpecialEquipped ? ' is-done' : ''}`}
                                data-testid={`chub-equip-special-${activeWeaponMeta.id}`}
                                disabled={isSpecialEquipped}
                                onClick={() =>
                                  onEquipItem(activeWeaponMeta.category, activeWeaponMeta.skinId)
                                }
                              >
                                {isSpecialEquipped ? 'انتخاب‌شده' : 'انتخاب این اسکین'}
                              </button>
                            ) : allowSpin ? (
                              <button
                                type="button"
                                className="chub-secondary-btn"
                                data-testid={`chub-goto-spin-${activeWeaponMeta.id}`}
                                onClick={() => {
                                  setSelectedBannerId(activeWeaponMeta.bannerId);
                                  setActiveTab('spin');
                                }}
                              >
                                قفل · رفتن به اسپین
                              </button>
                            ) : (
                              <button type="button" className="chub-equip-btn" disabled>
                                قفل
                              </button>
                            )}
                          </div>
                        </article>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="chub-extras-wrap">
                  <div className="chub-subcat-strip">
                    {EXTRA_COSMETIC_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        className={`chub-subcat-btn${extraCategory === cat ? ' is-active' : ''}`}
                        onClick={() => setExtraCategory(cat)}
                      >
                        {CATEGORY_LABELS_FA[cat]}
                      </button>
                    ))}
                  </div>

                  <div className="chub-extras-grid">
                    {/* Default Reset Card */}
                    <article
                      className={`chub-extra-card${state.equipped[extraCategory] === null ? ' is-equipped' : ''}`}
                    >
                      <div className="chub-extra-top">
                        <div className="chub-extra-head">
                          <strong>پیش‌فرض</strong>
                          <span
                            className="chub-tier-tag"
                            style={{
                              color: RARITY_ACCENT.common,
                              borderColor: `${RARITY_ACCENT.common}66`,
                            }}
                          >
                            معمولی
                          </span>
                        </div>
                        <span
                          className={`chub-state-pill ${
                            state.equipped[extraCategory] === null ? 'is-selected' : 'is-unlocked'
                          }`}
                        >
                          {state.equipped[extraCategory] === null ? 'انتخاب‌شده' : 'باز شده'}
                        </span>
                      </div>
                      <button
                        type="button"
                        className={`chub-equip-btn${state.equipped[extraCategory] === null ? ' is-done' : ''}`}
                        disabled={state.equipped[extraCategory] === null}
                        onClick={() => onEquipItem(extraCategory, null)}
                      >
                        {state.equipped[extraCategory] === null ? 'انتخاب‌شده' : 'انتخاب پیش‌فرض'}
                      </button>
                    </article>

                    {extraItems.map((item) => {
                      const owned = state.ownedIds.includes(item.id);
                      const equipped = state.equipped[extraCategory] === item.id;
                      const accent = RARITY_ACCENT[item.rarity];
                      const rMeta = RARITY_META[item.rarity];
                      return (
                        <article
                          key={item.id}
                          className={`chub-extra-card chub-tier-${item.rarity}${equipped ? ' is-equipped' : ''}${!owned ? ' is-locked' : ''}`}
                        >
                          <div className="chub-extra-top">
                            <div className="chub-extra-head">
                              <strong>{item.nameFa}</strong>
                              <span
                                className="chub-tier-tag"
                                style={{ color: accent, borderColor: `${accent}77` }}
                              >
                                {rMeta.labelFa}
                              </span>
                            </div>
                            <span
                              className={`chub-state-pill ${
                                equipped ? 'is-selected' : owned ? 'is-unlocked' : 'is-locked'
                              }`}
                            >
                              {equipped ? 'انتخاب‌شده' : owned ? 'باز شده' : 'قفل'}
                            </span>
                          </div>
                          {item.colorHex && (
                            <div className="chub-swatch-row">
                              <span
                                className="chub-swatch-dot"
                                style={{ backgroundColor: item.colorHex }}
                              />
                              <span>{item.descriptionFa}</span>
                            </div>
                          )}
                          <button
                            type="button"
                            className={`chub-equip-btn${equipped ? ' is-done' : ''}`}
                            disabled={!owned || equipped}
                            onClick={() => onEquipItem(extraCategory, item.id)}
                          >
                            {!owned ? 'قفل' : equipped ? 'انتخاب‌شده' : 'انتخاب'}
                          </button>
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
            <div className="chub-redeem-view" data-testid="chub-panel-redeem">
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
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
