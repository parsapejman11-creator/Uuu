import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CATEGORY_LABELS_FA,
  COSMETIC_CATEGORY_ORDER,
  COSMETIC_ITEMS,
  CosmeticCategory,
  CosmeticItem,
  CosmeticsState,
  KILLS_PER_FREE_SPIN,
  LEGENDARY_AK47_ID,
  LEGENDARY_SNIPER_ID,
  RARITY_META,
  SHARDS_PER_FREE_SPIN,
  SpinOutcome,
  buildSpinReelStrip,
  canClaimDailyFreeSpin,
  getBannerPityCounter,
  getSpinBannerItemChancePct,
  getSpinBannerItems,
} from '../game/cosmetics';
import {
  DEFAULT_SPIN_BANNER_ID,
  SPIN_BANNERS,
  SpinBannerId,
  getSpinBannerConfig,
} from '../game/spins.config';
import { InfernoPreview3D } from './InfernoPreview3D';
import { VoidPiercerPreview3D } from './VoidPiercerPreview3D';

interface SpinModalProps {
  state: CosmeticsState;
  playerName: string;
  reducedMotion: boolean;
  onExecuteSpin: (bannerId: SpinBannerId) => SpinOutcome | null;
  onClaimDailySpin: () => boolean;
  onEquipItem: (category: CosmeticCategory, itemId: string | null) => void;
  onPlayTick: (pitchScale?: number) => void;
  onPlayReveal: (rarity: CosmeticItem['rarity']) => void;
  onPlayFireSound: () => void;
  onPlayInfernoKillSound: (headshot: boolean) => void;
  onPlayVoidShotSound: () => void;
  onPlayVoidKillSound: (headshot: boolean) => void;
  onPlayVoidScopeSound: (entering: boolean) => void;
  onClose: () => void;
}

const REEL_SLOT_W = 114;
const REEL_GAP = 8;
const REEL_STEP = REEL_SLOT_W + REEL_GAP;
const REEL_TOTAL_SLOTS = 36;
const REEL_WIN_INDEX = 29;

function buildIdleReelItems(poolItems: CosmeticItem[]): CosmeticItem[] {
  const source = poolItems.length > 0 ? poolItems : COSMETIC_ITEMS;
  const arr: CosmeticItem[] = [];
  for (let i = 0; i < 16; i++) {
    arr.push(source[i % source.length]);
  }
  return arr;
}

function formatChanceFa(pct: number): string {
  return Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
}

const ItemVisualSwatch: React.FC<{ item: CosmeticItem; large?: boolean }> = ({ item, large = false }) => {
  if (item.category === 'ak47_skin') {
    return (
      <div className={`spin-swatch swatch-ak${large ? ' is-lg' : ''}`} aria-hidden="true">
        <svg viewBox="0 0 120 42" fill="none">
          <defs>
            <linearGradient id="akGoldGrad" x1="0" y1="0" x2="120" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#ff6b12" />
              <stop offset="100%" stopColor="#fde047" />
            </linearGradient>
          </defs>
          <path
            d="M8 22L24 18H68L72 15H96L100 18H114V21H96L92 23H75L71 25H63L66 37H58L54 25H44L41 34H34L36 25H25L12 28L8 22Z"
            fill="#111318"
            stroke="url(#akGoldGrad)"
            strokeWidth="1.8"
          />
          <path d="M31 20H78" stroke="#ff7417" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="52" cy="20" r="2.2" fill="#fde047" />
        </svg>
      </div>
    );
  }
  if (item.category === 'sniper_skin') {
    return (
      <div className={`spin-swatch swatch-sniper${large ? ' is-lg' : ''}`} aria-hidden="true">
        <svg viewBox="0 0 128 42" fill="none">
          <defs>
            <linearGradient id="voidSniperGrad" x1="0" y1="0" x2="128" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="55%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
          {/* Futuristic Scope */}
          <rect x="42" y="8" width="28" height="6" rx="2.5" fill="#0f172a" stroke="#22d3ee" strokeWidth="1.4" />
          <line x1="48" y1="14" x2="48" y2="18" stroke="#a855f7" strokeWidth="1.6" />
          <line x1="63" y1="14" x2="63" y2="18" stroke="#a855f7" strokeWidth="1.6" />
          {/* Ceramic-black AWM Chassis + Long Fluted Barrel */}
          <path
            d="M6 21L21 18H74L80 19H118V22H80L75 24H60L58 34H51L50 24H37L34 32H28L30 24H18L9 27L6 21Z"
            fill="#0d121d"
            stroke="url(#voidSniperGrad)"
            strokeWidth="1.7"
          />
          {/* Glowing Cyan Conduit + Pulsing Energy Core */}
          <path d="M26 20.5H98" stroke="#22d3ee" strokeWidth="1.6" strokeLinecap="round" />
          <rect x="45" y="19" width="11" height="3.2" rx="1.6" fill="#a855f7" />
          <circle cx="50.5" cy="20.6" r="2.1" fill="#67e8f9" />
          {/* Muzzle Brake */}
          <rect x="116" y="18.2" width="7" height="4.8" rx="1" fill="#1e293b" stroke="#22d3ee" strokeWidth="1.1" />
        </svg>
      </div>
    );
  }
  if (item.category === 'tracer_color') {
    return (
      <div className={`spin-swatch${large ? ' is-lg' : ''}`} aria-hidden="true">
        <div
          className="swatch-tracer-beam"
          style={{
            background: `linear-gradient(90deg, transparent, ${item.colorHex}, #ffffff)`,
            boxShadow: `0 0 10px ${item.colorHex}`,
          }}
        />
      </div>
    );
  }
  if (item.category === 'muzzle_flash') {
    return (
      <div className={`spin-swatch${large ? ' is-lg' : ''}`} aria-hidden="true">
        <div
          className="swatch-flash-star"
          style={{
            background: `radial-gradient(circle, #ffffff 0%, ${item.colorHex} 45%, transparent 72%)`,
          }}
        />
      </div>
    );
  }
  if (item.category === 'crosshair_color') {
    return (
      <div className={`spin-swatch${large ? ' is-lg' : ''}`} aria-hidden="true">
        <div className="swatch-crosshair" style={{ color: item.colorHex }}>
          <span className="sc-t" />
          <span className="sc-b" />
          <span className="sc-l" />
          <span className="sc-r" />
          <span className="sc-d" />
        </div>
      </div>
    );
  }
  if (item.category === 'name_frame') {
    return (
      <div className={`spin-swatch${large ? ' is-lg' : ''}`} aria-hidden="true">
        <div
          className="swatch-name-frame"
          style={{
            borderColor: item.colorHex,
            background: item.accentHex || 'rgba(15,23,42,0.85)',
            color: item.colorHex,
          }}
        >
          NAME
        </div>
      </div>
    );
  }
  return (
    <div className={`spin-swatch${large ? ' is-lg' : ''}`} aria-hidden="true">
      <span className="swatch-symbol" style={{ color: item.colorHex }}>
        {item.symbol || '✦'}
      </span>
    </div>
  );
};

export const SpinModal: React.FC<SpinModalProps> = ({
  state,
  playerName,
  reducedMotion,
  onExecuteSpin,
  onClaimDailySpin,
  onEquipItem,
  onPlayTick,
  onPlayReveal,
  onPlayFireSound,
  onPlayInfernoKillSound,
  onPlayVoidShotSound,
  onPlayVoidKillSound,
  onPlayVoidScopeSound,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'spin' | 'collection'>('spin');
  const [activeBannerId, setActiveBannerId] = useState<SpinBannerId>(DEFAULT_SPIN_BANNER_ID);
  const [showOddsInfo, setShowOddsInfo] = useState(false);
  const [collectionFilter, setCollectionFilter] = useState<CosmeticCategory | 'all'>('all');

  const activeBanner = useMemo(() => getSpinBannerConfig(activeBannerId), [activeBannerId]);
  const bannerPoolItems = useMemo(() => getSpinBannerItems(activeBannerId), [activeBannerId]);
  const bannerLegendaryItem = useMemo(
    () => bannerPoolItems.find((i) => i.id === activeBanner.featuredItemId) ?? bannerPoolItems[0],
    [bannerPoolItems, activeBanner.featuredItemId]
  );

  const findBannerIdForItem = (itemId: string): SpinBannerId =>
    SPIN_BANNERS.find((b) => b.itemIds.includes(itemId))?.id ?? DEFAULT_SPIN_BANNER_ID;

  const [previewItem, setPreviewItem] = useState<CosmeticItem | null>(
    () => COSMETIC_ITEMS.find((i) => i.id === LEGENDARY_AK47_ID) ?? COSMETIC_ITEMS[0]
  );

  // Spin reel animation state
  const [isSpinning, setIsSpinning] = useState(false);
  const [reelItems, setReelItems] = useState<CosmeticItem[]>(() =>
    buildIdleReelItems(getSpinBannerItems(DEFAULT_SPIN_BANNER_ID))
  );
  const [reelOffsetPx, setReelOffsetPx] = useState(0);
  const [revealOutcome, setRevealOutcome] = useState<SpinOutcome | null>(null);
  const [dailyNotice, setDailyNotice] = useState<string | null>(null);
  const [burstKey, setBurstKey] = useState(0);

  const reelViewportRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const pendingStateTimerRef = useRef<number>(0);

  const ownedSet = useMemo(() => new Set(state.ownedIds), [state.ownedIds]);
  const dailyReady = canClaimDailyFreeSpin(state);
  const bannerPityCounter = getBannerPityCounter(state, activeBannerId);
  const pityPct = Math.min(100, Math.round((bannerPityCounter / activeBanner.pityThreshold) * 100));
  const nextIsGuaranteed = bannerPityCounter >= activeBanner.pityThreshold;
  const isVoidBanner = activeBannerId === 'sniper_void';

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.clearTimeout(pendingStateTimerRef.current);
    };
  }, []);

  const handleSelectBanner = (bannerId: SpinBannerId) => {
    if (isSpinning || bannerId === activeBannerId) return;
    const nextBanner = getSpinBannerConfig(bannerId);
    const nextPool = getSpinBannerItems(bannerId);
    const nextFeatured = nextPool.find((i) => i.id === nextBanner.featuredItemId) ?? nextPool[0] ?? null;
    setActiveBannerId(bannerId);
    setReelItems(buildIdleReelItems(nextPool));
    setReelOffsetPx(0);
    setRevealOutcome(null);
    setPreviewItem(nextFeatured);
  };

  const handleClaimDaily = () => {
    const ok = onClaimDailySpin();
    if (ok) {
      onPlayReveal('rare');
      setDailyNotice('۱ اسپین رایگان روزانه به حساب شما اضافه شد!');
      window.setTimeout(() => setDailyNotice(null), 2600);
    }
  };

  const handleStartSpin = () => {
    if (isSpinning || state.spins < 1) return;
    const outcome = onExecuteSpin(activeBannerId);
    if (!outcome) return;

    const strip = buildSpinReelStrip(
      outcome.item,
      REEL_TOTAL_SLOTS,
      REEL_WIN_INDEX,
      undefined,
      bannerPoolItems
    );
    setReelItems(strip);
    setRevealOutcome(null);
    setIsSpinning(true);

    const viewportWidth = reelViewportRef.current?.clientWidth || 340;
    const centerX = viewportWidth / 2;
    const targetCardCenter = REEL_WIN_INDEX * REEL_STEP + REEL_SLOT_W / 2;
    const microOffset = ((outcome.nextState.totalSpins * 17) % 21) - 10;
    const finalOffset = Math.max(0, targetCardCenter - centerX + microOffset);

    if (reducedMotion) {
      setReelOffsetPx(finalOffset);
      pendingStateTimerRef.current = window.setTimeout(() => {
        setIsSpinning(false);
        setRevealOutcome(outcome);
        setPreviewItem(outcome.item);
        onPlayReveal(outcome.item.rarity);
      }, 180);
      return;
    }

    const durationMs = outcome.item.rarity === 'legendary' ? 3550 : 3050;
    const startMs = performance.now();
    let lastTickSlot = -1;

    setReelOffsetPx(0);

    const step = (now: number) => {
      const elapsed = now - startMs;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 4.2);
      const currentX = finalOffset * eased;
      setReelOffsetPx(currentX);

      const passedSlot = Math.floor((currentX + centerX) / REEL_STEP);
      if (passedSlot !== lastTickSlot) {
        lastTickSlot = passedSlot;
        onPlayTick(1.18 - eased * 0.45);
      }

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        setReelOffsetPx(finalOffset);
        setIsSpinning(false);
        setBurstKey((k) => k + 1);
        setRevealOutcome(outcome);
        setPreviewItem(outcome.item);
        onPlayReveal(outcome.item.rarity);
      }
    };

    animFrameRef.current = requestAnimationFrame(step);
  };

  const filteredCollectionItems = useMemo(() => {
    if (collectionFilter === 'all') return COSMETIC_ITEMS;
    return COSMETIC_ITEMS.filter((i) => i.category === collectionFilter);
  }, [collectionFilter]);

  const previewChancePct = useMemo(() => {
    if (!previewItem) return 0;
    return getSpinBannerItemChancePct(findBannerIdForItem(previewItem.id), previewItem);
  }, [previewItem]);

  return (
    <div
      className="spin-modal-backdrop"
      data-testid="spin-modal"
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSpinning) onClose();
      }}
    >
      <div className={`spin-modal-sheet${isVoidBanner ? ' theme-void' : ' theme-inferno'}`}>
        {/* Top Minimal Header */}
        <div className="spin-header">
          <div className="spin-header-title-row">
            <div>
              <h2 className="spin-title">اسپین شانس و کلکسیون</h2>
              <div className="spin-subtitle">
                کاملاً ظاهری (بدون تأثیر روی دمیج و بالانس) · رایگان
              </div>
            </div>
            <button
              type="button"
              className="spin-close-btn"
              data-testid="btn-close-spin"
              aria-label="بستن اسپین"
              disabled={isSpinning}
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          <div className="spin-toolbar-row">
            {/* Tabs */}
            <div className="spin-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'spin'}
                data-testid="tab-spin"
                className={`spin-tab-btn${activeTab === 'spin' ? ' active' : ''}`}
                disabled={isSpinning}
                onClick={() => setActiveTab('spin')}
              >
                اسپین
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'collection'}
                data-testid="tab-collection"
                className={`spin-tab-btn${activeTab === 'collection' ? ' active' : ''}`}
                disabled={isSpinning}
                onClick={() => setActiveTab('collection')}
              >
                کلکسیون ({state.ownedIds.length}/{COSMETIC_ITEMS.length})
              </button>
            </div>

            {/* Shared Balance Readout + Odds Info */}
            <div className="spin-stats-inline">
              <span className="spin-stat-item" data-testid="spin-balance-readout">
                اسپین: <strong className="tabular-nums">{state.spins}</strong>
              </span>
              <span className="spin-sep" aria-hidden="true">·</span>
              <span className="spin-stat-item" data-testid="spin-shards-readout">
                تکه: <strong className="tabular-nums">{state.shards}/{SHARDS_PER_FREE_SPIN}</strong>
              </span>
              <button
                type="button"
                className={`spin-info-btn${showOddsInfo ? ' active' : ''}`}
                data-testid="btn-toggle-odds-info"
                onClick={() => setShowOddsInfo((v) => !v)}
              >
                اطلاعات شانس
              </button>
            </div>
          </div>

          {/* Minimal Data-Driven Spin Banner Switcher */}
          {activeTab === 'spin' && (
            <div className="spin-banner-switcher" role="tablist" aria-label="انتخاب اسپین" data-testid="spin-banner-switcher">
              {SPIN_BANNERS.map((banner) => {
                const isSelected = banner.id === activeBannerId;
                return (
                  <button
                    key={banner.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    data-testid={`banner-tab-${banner.id}`}
                    disabled={isSpinning}
                    className={`spin-banner-tab${isSelected ? ' active' : ''} banner-${banner.id}`}
                    style={
                      isSelected
                        ? {
                            borderColor: banner.theme.primaryHex,
                            boxShadow: `0 0 14px ${banner.theme.glowRgba}`,
                          }
                        : undefined
                    }
                    onClick={() => handleSelectBanner(banner.id)}
                  >
                    <span className="spin-banner-tab-title">{banner.labelFa}</span>
                    <span className="spin-banner-tab-sub" style={{ color: banner.theme.primaryHex }} dir="ltr">
                      {banner.titleEn} · {formatChanceFa(banner.rarityWeightsPct.legendary)}%
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {dailyReady && (
            <div className="spin-daily-banner">
              <span>هدیهٔ روزانه آماده است (+۱ اسپین رایگان)</span>
              <button
                type="button"
                className="spin-daily-claim-btn"
                data-testid="btn-claim-daily-spin"
                onClick={handleClaimDaily}
              >
                دریافت +۱
              </button>
            </div>
          )}

          {dailyNotice && <div className="spin-notice-bar">{dailyNotice}</div>}

          {/* Collapsible Odds & Rules Info Sheet (per active banner) */}
          {showOddsInfo && (
            <div className="spin-odds-panel" data-testid="spin-odds-panel">
              <div className="spin-odds-grid">
                {(['legendary', 'epic', 'rare', 'common'] as const).map((rar) => {
                  const meta = RARITY_META[rar];
                  const weight = activeBanner.rarityWeightsPct[rar];
                  const color = rar === 'legendary' ? activeBanner.theme.primaryHex : meta.colorHex;
                  return (
                    <div
                      key={rar}
                      className="spin-odds-cell"
                      style={{ borderColor: rar === 'legendary' ? `${activeBanner.theme.primaryHex}88` : meta.borderHex }}
                    >
                      <span style={{ color, fontWeight: 700 }}>{meta.labelFa}</span>
                      <strong className="tabular-nums" data-testid={`odds-val-${rar}`}>
                        {formatChanceFa(weight)}٪
                      </strong>
                    </div>
                  );
                })}
              </div>
              <div className="spin-odds-notes">
                <span>
                  • تضمین لجندری ({activeBanner.labelFa}): پس از {activeBanner.pityThreshold} اسپین بدون لجندری در همین بخش، اسپین بعدی قطعاً {activeBanner.titleEn} است.
                </span>
                <span>• جایزه تکراری: ۱ تکه (Shard) می‌دهد؛ هر {SHARDS_PER_FREE_SPIN} تکه خودکار = ۱ اسپین رایگان (مشترک بین همه اسپین‌ها).</span>
                <span>• روش گرفتن اسپین: شروع با ۵ اسپین · هر روز ۱ اسپین رایگان · هر برد مسابقه +۱ · هر {KILLS_PER_FREE_SPIN} کشتن +۱ (پیشرفت فعلی: {state.killProgress}/{KILLS_PER_FREE_SPIN}).</span>
              </div>
            </div>
          )}
        </div>

        {/* Main Scrollable Content */}
        <div className="spin-body">
          {activeTab === 'spin' ? (
            <>
              {/* Horizontal Smooth Reel */}
              <div className="spin-reel-shell">
                <div
                  className="spin-reel-pointer-top"
                  style={{ borderTopColor: activeBanner.theme.primaryHex }}
                  aria-hidden="true"
                />
                <div
                  className="spin-reel-pointer-bot"
                  style={{ borderBottomColor: activeBanner.theme.primaryHex }}
                  aria-hidden="true"
                />
                <div ref={reelViewportRef} className="spin-reel-viewport" data-testid="spin-reel-viewport">
                  <div
                    className="spin-reel-track"
                    dir="ltr"
                    style={{
                      transform: `translate3d(${-reelOffsetPx}px, 0, 0)`,
                    }}
                  >
                    {reelItems.map((item, idx) => {
                      const rm = RARITY_META[item.rarity];
                      const isWinHighlight = !isSpinning && revealOutcome && idx === REEL_WIN_INDEX;
                      const isVoidLeg = item.id === LEGENDARY_SNIPER_ID;
                      const barColor = isVoidLeg ? '#22d3ee' : rm.colorHex;
                      const borderColor = isVoidLeg ? 'rgba(34, 211, 238, 0.72)' : rm.borderHex;
                      return (
                        <div
                          key={`${item.id}-${idx}`}
                          className={`spin-reel-card rarity-${item.rarity}${isVoidLeg ? ' is-void-leg' : ''}${isWinHighlight ? ' is-winner' : ''}`}
                          style={{
                            borderColor,
                            background: isVoidLeg
                              ? 'linear-gradient(160deg, rgba(8,26,38,0.96), rgba(22,12,38,0.98))'
                              : item.rarity === 'legendary'
                                ? 'linear-gradient(160deg, rgba(28,18,6,0.96), rgba(14,10,8,0.98))'
                                : 'rgba(13, 18, 28, 0.94)',
                          }}
                        >
                          <div className="spin-reel-card-bar" style={{ background: barColor }} />
                          <ItemVisualSwatch item={item} />
                          <div className="spin-reel-card-name" dir="rtl">
                            {item.nameFa}
                          </div>
                          <div className="spin-reel-card-rar" style={{ color: barColor }}>
                            {rm.labelFa}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Lightweight CSS spark burst on reel stop */}
                {!reducedMotion && burstKey > 0 && !isSpinning && revealOutcome && (
                  <div key={burstKey} className={`spin-spark-burst rarity-${revealOutcome.item.rarity}`} aria-hidden="true">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <span
                        key={i}
                        className="spin-spark-dot"
                        style={
                          {
                            '--ang': `${i * 30}deg`,
                            background:
                              revealOutcome.item.id === LEGENDARY_SNIPER_ID
                                ? i % 2 === 0
                                  ? '#22d3ee'
                                  : '#a855f7'
                                : RARITY_META[revealOutcome.item.rarity].colorHex,
                          } as React.CSSProperties
                        }
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Per-Banner Pity Progress + Primary Spin CTA */}
              <div className="spin-action-bar">
                <div className="spin-pity-block" data-testid="spin-pity-bar">
                  <div className="spin-pity-label">
                    <span>
                      {nextIsGuaranteed
                        ? `اسپین بعدی: تضمین لجندری (${activeBanner.titleEn})!`
                        : `پیشرفت تضمین ${activeBanner.titleEn}`}
                    </span>
                    <strong className="tabular-nums" style={{ color: activeBanner.theme.primaryHex }}>
                      {bannerPityCounter}/{activeBanner.pityThreshold}
                    </strong>
                  </div>
                  <div className="spin-pity-track">
                    <div
                      className={`spin-pity-fill${nextIsGuaranteed ? ' is-ready' : ''}${isVoidBanner ? ' is-void' : ''}`}
                      style={{ width: `${pityPct}%` }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className={`spin-go-btn${isVoidBanner ? ' is-void' : ''}`}
                  data-testid="btn-execute-spin"
                  disabled={isSpinning || state.spins < 1}
                  onClick={handleStartSpin}
                >
                  {isSpinning
                    ? 'در حال چرخش...'
                    : state.spins > 0
                      ? `اسپین (۱) · باقیمانده: ${state.spins}`
                      : 'اسپین ندارید (برد مسابقه یا ۲۵ کشتن)'}
                </button>
              </div>

              {/* Live Item Preview Pane (Always accessible without owning!) */}
              {previewItem && (
                <div className="spin-preview-card" data-testid="spin-preview-card">
                  <div className="spin-preview-head">
                    <div>
                      <div className="spin-preview-meta">
                        <span
                          style={{
                            color:
                              previewItem.id === LEGENDARY_SNIPER_ID
                                ? '#22d3ee'
                                : RARITY_META[previewItem.rarity].colorHex,
                            fontWeight: 700,
                          }}
                        >
                          {RARITY_META[previewItem.rarity].labelFa}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{CATEGORY_LABELS_FA[previewItem.category]}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">شانس {formatChanceFa(previewChancePct)}٪</span>
                      </div>
                      <h3 className="spin-preview-name">
                        {previewItem.nameFa}{' '}
                        <span className="spin-preview-en" dir="ltr">
                          {previewItem.nameEn}
                        </span>
                      </h3>
                    </div>

                    {ownedSet.has(previewItem.id) ? (
                      <button
                        type="button"
                        className={`spin-equip-btn${
                          state.equipped[previewItem.category] === previewItem.id ? ' is-equipped' : ''
                        }`}
                        onClick={() =>
                          onEquipItem(
                            previewItem.category,
                            state.equipped[previewItem.category] === previewItem.id ? null : previewItem.id
                          )
                        }
                      >
                        {state.equipped[previewItem.category] === previewItem.id ? 'فعال ✓' : 'انتخاب'}
                      </button>
                    ) : (
                      <span className="spin-preview-lock-text">پیش‌نمایش رایگان</span>
                    )}
                  </div>

                  {previewItem.id === LEGENDARY_AK47_ID ? (
                    <InfernoPreview3D
                      reducedMotion={reducedMotion}
                      onTriggerFireSound={onPlayFireSound}
                      onTriggerKillSound={onPlayInfernoKillSound}
                    />
                  ) : previewItem.id === LEGENDARY_SNIPER_ID ? (
                    <VoidPiercerPreview3D
                      reducedMotion={reducedMotion}
                      onTriggerFireSound={onPlayVoidShotSound}
                      onTriggerKillSound={onPlayVoidKillSound}
                      onTriggerScopeSound={onPlayVoidScopeSound}
                    />
                  ) : (
                    <div className="spin-cosmetic-live-preview">
                      <ItemVisualSwatch item={previewItem} large />
                      <div className="spin-cosmetic-preview-copy">
                        {previewItem.category === 'name_frame' && (
                          <div
                            className="preview-name-sample"
                            style={{
                              borderColor: previewItem.colorHex,
                              background: previewItem.accentHex || 'rgba(15,23,42,0.85)',
                            }}
                          >
                            {playerName || 'GHOST-01'}
                          </div>
                        )}
                        {previewItem.category === 'name_badge' && (
                          <div className="preview-badge-sample">
                            <span style={{ color: previewItem.colorHex, fontSize: '1.1rem' }}>
                              {previewItem.symbol}
                            </span>
                            <strong>{playerName || 'GHOST-01'}</strong>
                          </div>
                        )}
                        {previewItem.category === 'kill_icon' && (
                          <div className="preview-kf-sample">
                            <span style={{ color: '#38bdf8' }}>{playerName || 'GHOST-01'}</span>
                            <span style={{ color: previewItem.colorHex, fontWeight: 700 }}>
                              {previewItem.symbol} {isVoidBanner ? 'AWM' : 'AK-47'}
                            </span>
                            <span style={{ color: '#fb7185' }}>ENEMY</span>
                          </div>
                        )}
                        <p>{previewItem.descriptionFa}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Active Banner Prize Pool List */}
              <div className="spin-pool-section">
                <div className="spin-pool-header">
                  <span>لیست جوایز {activeBanner.labelFa} (برای پیش‌نمایش لمس کنید)</span>
                  <button
                    type="button"
                    className={`spin-jump-legendary-btn${isVoidBanner ? ' is-void' : ''}`}
                    data-testid="btn-preview-legendary"
                    onClick={() => bannerLegendaryItem && setPreviewItem(bannerLegendaryItem)}
                  >
                    پیش‌نمایش سه‌بعدی {activeBanner.titleEn}
                  </button>
                </div>
                <div className="spin-pool-grid">
                  {bannerPoolItems.map((item) => {
                    const rm = RARITY_META[item.rarity];
                    const isVoidLeg = item.id === LEGENDARY_SNIPER_ID;
                    const color = isVoidLeg ? '#22d3ee' : rm.colorHex;
                    const border = isVoidLeg ? 'rgba(34, 211, 238, 0.55)' : rm.borderHex;
                    const isOwned = ownedSet.has(item.id);
                    const isSelected = previewItem?.id === item.id;
                    const chancePct = getSpinBannerItemChancePct(activeBannerId, item);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-testid={`prize-item-${item.id}`}
                        className={`spin-pool-item rarity-${item.rarity}${isVoidLeg ? ' is-void-leg' : ''}${isSelected ? ' is-selected' : ''}`}
                        style={{ borderColor: isSelected ? color : border }}
                        onClick={() => setPreviewItem(item)}
                      >
                        <div className="spin-pool-item-top">
                          <span style={{ color }}>{rm.labelFa}</span>
                          <span className="tabular-nums">{formatChanceFa(chancePct)}٪</span>
                        </div>
                        <ItemVisualSwatch item={item} />
                        <div className="spin-pool-item-name">{item.nameFa}</div>
                        <div className="spin-pool-item-cat">
                          {isOwned ? 'دارید ✓' : CATEGORY_LABELS_FA[item.category]}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Minimal Collection & Equip Tab (Unified across all banners) */
            <div className="spin-collection-view" data-testid="spin-collection-view">
              <div className="spin-cat-filters">
                <button
                  type="button"
                  className={`spin-cat-btn${collectionFilter === 'all' ? ' active' : ''}`}
                  onClick={() => setCollectionFilter('all')}
                >
                  همه ({state.ownedIds.length})
                </button>
                {COSMETIC_CATEGORY_ORDER.map((cat) => {
                  const ownedInCat = COSMETIC_ITEMS.filter(
                    (i) => i.category === cat && ownedSet.has(i.id)
                  ).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      className={`spin-cat-btn${collectionFilter === cat ? ' active' : ''}`}
                      onClick={() => setCollectionFilter(cat)}
                    >
                      {CATEGORY_LABELS_FA[cat]} ({ownedInCat})
                    </button>
                  );
                })}
              </div>

              <div className="spin-collection-grid">
                {filteredCollectionItems.map((item) => {
                  const isOwned = ownedSet.has(item.id);
                  const isEquipped = state.equipped[item.category] === item.id;
                  const rm = RARITY_META[item.rarity];
                  const isVoidLeg = item.id === LEGENDARY_SNIPER_ID;
                  const accent = isVoidLeg ? '#22d3ee' : rm.colorHex;
                  const border = isVoidLeg ? 'rgba(34, 211, 238, 0.52)' : rm.borderHex;
                  return (
                    <div
                      key={item.id}
                      data-testid={`collection-item-${item.id}`}
                      className={`spin-col-card rarity-${item.rarity}${isVoidLeg ? ' is-void-leg' : ''}${
                        isOwned ? '' : ' is-locked'
                      }${isEquipped ? ' is-equipped' : ''}`}
                      style={{ borderColor: isEquipped ? accent : border }}
                    >
                      <div className="spin-col-top">
                        <span style={{ color: accent, fontWeight: 700 }}>{rm.labelFa}</span>
                        <span>{CATEGORY_LABELS_FA[item.category]}</span>
                      </div>
                      <ItemVisualSwatch item={item} />
                      <div className="spin-col-name">{item.nameFa}</div>
                      <div className="spin-col-actions">
                        {isOwned ? (
                          <button
                            type="button"
                            data-testid={`btn-equip-${item.id}`}
                            className={`spin-equip-btn${isEquipped ? ' is-equipped' : ''}`}
                            onClick={() => onEquipItem(item.category, isEquipped ? null : item.id)}
                          >
                            {isEquipped ? 'فعال · برداشتن' : 'انتخاب'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="spin-preview-mini-btn"
                            onClick={() => {
                              const itemBannerId = findBannerIdForItem(item.id);
                              setActiveBannerId(itemBannerId);
                              setReelItems(buildIdleReelItems(getSpinBannerItems(itemBannerId)));
                              setReelOffsetPx(0);
                              setPreviewItem(item);
                              setActiveTab('spin');
                            }}
                          >
                            قفل · پیش‌نمایش
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reward Reveal Overlay Card (after spin stops) */}
      {revealOutcome && (
        <div
          className={`spin-reveal-backdrop rarity-${revealOutcome.item.rarity}`}
          data-testid="spin-reveal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRevealOutcome(null);
          }}
        >
          <div
            className={`spin-reveal-card rarity-${revealOutcome.item.rarity}${
              revealOutcome.item.id === LEGENDARY_SNIPER_ID ? ' theme-void' : ''
            }`}
            style={{
              borderColor:
                revealOutcome.item.id === LEGENDARY_SNIPER_ID
                  ? '#22d3ee'
                  : RARITY_META[revealOutcome.item.rarity].colorHex,
            }}
          >
            <div
              className="spin-reveal-kicker"
              style={{
                color:
                  revealOutcome.item.id === LEGENDARY_SNIPER_ID
                    ? '#22d3ee'
                    : RARITY_META[revealOutcome.item.rarity].colorHex,
              }}
              dir="ltr"
            >
              {revealOutcome.item.id === LEGENDARY_SNIPER_ID
                ? '◈ LEGENDARY SNIPER ◈'
                : revealOutcome.item.rarity === 'legendary'
                  ? '✦ LEGENDARY REWARD ✦'
                  : RARITY_META[revealOutcome.item.rarity].labelEn}
            </div>
            <h3 className="spin-reveal-title">{revealOutcome.item.nameFa}</h3>
            <div className="spin-reveal-sub">
              {CATEGORY_LABELS_FA[revealOutcome.item.category]}
              {revealOutcome.wasPityGuaranteed ? ' · جایزهٔ تضمینی اسپین ۲۱' : ''}
            </div>

            {revealOutcome.item.id === LEGENDARY_AK47_ID ? (
              <InfernoPreview3D
                compact
                reducedMotion={reducedMotion}
                showDemoControls
                onTriggerFireSound={onPlayFireSound}
                onTriggerKillSound={onPlayInfernoKillSound}
              />
            ) : revealOutcome.item.id === LEGENDARY_SNIPER_ID ? (
              <VoidPiercerPreview3D
                compact
                reducedMotion={reducedMotion}
                showDemoControls
                onTriggerFireSound={onPlayVoidShotSound}
                onTriggerKillSound={onPlayVoidKillSound}
                onTriggerScopeSound={onPlayVoidScopeSound}
              />
            ) : (
              <div className="spin-reveal-visual">
                <ItemVisualSwatch item={revealOutcome.item} large />
                <p className="spin-reveal-desc">{revealOutcome.item.descriptionFa}</p>
              </div>
            )}

            {revealOutcome.isDuplicate && (
              <div className="spin-duplicate-box">
                جایزه تکراری بود → <strong>+{revealOutcome.shardsGained} تکه (Shard)</strong>
                {revealOutcome.bonusSpinsFromShards > 0 && (
                  <span> · ۵ تکه کامل شد → +{revealOutcome.bonusSpinsFromShards} اسپین رایگان!</span>
                )}
              </div>
            )}

            <div className="spin-reveal-actions">
              <button
                type="button"
                className="spin-equip-btn primary"
                data-testid="btn-reveal-equip"
                onClick={() => {
                  onEquipItem(revealOutcome.item.category, revealOutcome.item.id);
                  setRevealOutcome(null);
                }}
              >
                انتخاب و استفاده (Equip)
              </button>
              <button
                type="button"
                className="spin-close-reveal-btn"
                data-testid="btn-reveal-close"
                onClick={() => setRevealOutcome(null)}
              >
                ادامه
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
