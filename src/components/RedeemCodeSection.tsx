import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import {
  COSMETIC_ITEM_BY_ID,
  CosmeticsState,
  LEGENDARY_AK47_ID,
  LEGENDARY_SNIPER_ID,
  MYTHIC_M249_ID,
} from '../game/cosmetics';
import {
  ALLOWED_REDEEM_REWARD_IDS,
  RedeemLockoutState,
  RedeemRewardId,
  createInitialRedeemLockoutState,
  getRedeemLockoutRemainingMs,
  loadRedeemLockoutState,
  normalizeRedeemCode,
  recordRedeemFailure,
  saveRedeemLockoutState,
  verifyRedeemCodeServer,
} from '../game/redeem';

const InfernoPreview3D = lazy(() =>
  import('./InfernoPreview3D').then((m) => ({ default: m.InfernoPreview3D }))
);

const VoidPiercerPreview3D = lazy(() =>
  import('./VoidPiercerPreview3D').then((m) => ({ default: m.VoidPiercerPreview3D }))
);

const TempestAegisPreview3D = lazy(() =>
  import('./TempestAegisPreview3D').then((m) => ({ default: m.TempestAegisPreview3D }))
);

interface RedeemCodeSectionProps {
  ownedIds: string[];
  equipped: CosmeticsState['equipped'];
  reducedMotion: boolean;
  onUnlockReward: (rewardId: RedeemRewardId) => void;
  onEquipReward: (rewardId: RedeemRewardId) => void;
  onPlayRevealSound: (rarity?: 'legendary' | 'mythic') => void;
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
}

const SPARK_ANGLES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

export const RedeemCodeSection: React.FC<RedeemCodeSectionProps> = ({
  ownedIds,
  equipped,
  reducedMotion,
  onUnlockReward,
  onEquipReward,
  onPlayRevealSound,
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
}) => {
  const [codeInput, setCodeInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'error' | 'info' | 'success'; text: string } | null>(null);
  const [lockoutState, setLockoutState] = useState<RedeemLockoutState>(() => loadRedeemLockoutState());
  const [remainingSec, setRemainingSec] = useState<number>(() =>
    Math.ceil(getRedeemLockoutRemainingMs(loadRedeemLockoutState()) / 1000)
  );
  const [revealedRewardId, setRevealedRewardId] = useState<RedeemRewardId | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Tick 1-minute lockout countdown while locked
  useEffect(() => {
    const remMs = getRedeemLockoutRemainingMs(lockoutState);
    if (remMs <= 0) {
      setRemainingSec(0);
      return;
    }
    setRemainingSec(Math.ceil(remMs / 1000));
    const timer = window.setInterval(() => {
      const nextRem = getRedeemLockoutRemainingMs(lockoutState, Date.now());
      if (nextRem <= 0) {
        const reset = createInitialRedeemLockoutState();
        saveRedeemLockoutState(reset);
        setLockoutState(reset);
        setRemainingSec(0);
        setFeedback((prev) => (prev?.tone === 'error' ? null : prev));
        window.clearInterval(timer);
      } else {
        setRemainingSec(Math.ceil(nextRem / 1000));
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [lockoutState]);

  const isLocked = remainingSec > 0;
  const allowedRewardList = Array.from(ALLOWED_REDEEM_REWARD_IDS);
  const ownedRewardsCount = allowedRewardList.filter((id) => ownedIds.includes(id)).length;
  const allRewardsOwned = ownedRewardsCount >= ALLOWED_REDEEM_REWARD_IDS.size;

  const revealedItem = revealedRewardId ? COSMETIC_ITEM_BY_ID.get(revealedRewardId) : undefined;
  const isRevealedVoid = revealedRewardId === LEGENDARY_SNIPER_ID;
  const isRevealedMythic = revealedRewardId === MYTHIC_M249_ID;
  const isRevealedEquipped =
    revealedRewardId === MYTHIC_M249_ID
      ? equipped.m249_skin === MYTHIC_M249_ID
      : revealedRewardId === LEGENDARY_SNIPER_ID
        ? equipped.sniper_skin === LEGENDARY_SNIPER_ID
        : revealedRewardId === LEGENDARY_AK47_ID
          ? equipped.ak47_skin === LEGENDARY_AK47_ID
          : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || isLocked) return;

    const normalized = normalizeRedeemCode(codeInput);
    if (!normalized) {
      setFeedback({ tone: 'error', text: 'لطفاً کد را وارد کنید.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    const result = await verifyRedeemCodeServer(normalized);
    if (!mountedRef.current) return;

    setSubmitting(false);

    if (result.status === 'ok') {
      // Never persist or retain the entered code
      setCodeInput('');
      const cleared = createInitialRedeemLockoutState();
      saveRedeemLockoutState(cleared);
      setLockoutState(cleared);
      setRemainingSec(0);

      if (ownedIds.includes(result.rewardId)) {
        setFeedback({ tone: 'info', text: 'قبلاً باز شده' });
        return;
      }

      onUnlockReward(result.rewardId);
      onPlayRevealSound(result.rewardId === MYTHIC_M249_ID ? 'mythic' : 'legendary');
      const itemLabel = COSMETIC_ITEM_BY_ID.get(result.rewardId)?.nameFa ?? 'اسکین ویژه';
      setFeedback({ tone: 'success', text: `${itemLabel} به کلکسیون اضافه شد.` });
      setRevealedRewardId(result.rewardId);
      return;
    }

    if (result.status === 'unavailable') {
      setFeedback({ tone: 'error', text: 'بررسی کد در حال حاضر در دسترس نیست.' });
      return;
    }

    const { nextState, lockedNow, attemptsRemaining } = recordRedeemFailure(lockoutState, Date.now());
    saveRedeemLockoutState(nextState);
    setLockoutState(nextState);

    if (lockedNow) {
      const secs = Math.ceil(getRedeemLockoutRemainingMs(nextState) / 1000);
      setRemainingSec(secs);
      setCodeInput('');
      setFeedback({
        tone: 'error',
        text: `۵ تلاش اشتباه انجام شد. کادر به مدت ${secs} ثانیه قفل شد.`,
      });
    } else {
      setFeedback({
        tone: 'error',
        text: `کد اشتباه است (${attemptsRemaining} تلاش باقی‌مانده).`,
      });
    }
  };

  return (
    <>
      <section className="redeem-settings-card" dir="rtl" aria-label="کد ردیم" data-testid="redeem-settings-card">
        <div className="redeem-card-head">
          <label htmlFor="redeem-code-input" className="redeem-card-title">
            کد ردیم
          </label>
          {ownedRewardsCount > 0 && (
            <span className="redeem-owned-tag" data-testid="redeem-owned-tag">
              {allRewardsOwned
                ? 'همه اسکین‌های ویژه باز شده'
                : `${ownedRewardsCount}/${ALLOWED_REDEEM_REWARD_IDS.size} باز شده`}
            </span>
          )}
        </div>

        <form className="redeem-form-row" onSubmit={handleSubmit}>
          <input
            id="redeem-code-input"
            data-testid="redeem-code-input"
            type="text"
            className="redeem-code-input"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder={isLocked ? `قفل شده (${remainingSec} ثانیه)` : 'کد را وارد کنید...'}
            disabled={submitting || isLocked}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={96}
            aria-label="کد ردیم"
          />
          <button
            type="submit"
            className="redeem-submit-btn"
            data-testid="redeem-submit-btn"
            disabled={submitting || isLocked}
          >
            {submitting ? '...' : 'ثبت'}
          </button>
        </form>

        {isLocked ? (
          <div className="redeem-feedback tone-error" role="status" data-testid="redeem-feedback">
            تعداد تلاش‌های اشتباه بیش از حد بود. تا {remainingSec} ثانیه دیگر دوباره امتحان کنید.
          </div>
        ) : feedback ? (
          <div className={`redeem-feedback tone-${feedback.tone}`} role="status" data-testid="redeem-feedback">
            {feedback.text}
          </div>
        ) : null}
      </section>

      {revealedRewardId && (
        <div
          className="redeem-reveal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={
            isRevealedMythic
              ? 'باز شدن اسکین میتیک M249'
              : isRevealedVoid
                ? 'باز شدن اسکین لجندری اسنایپ'
                : 'باز شدن اسکین لجندری AK-47'
          }
          data-testid="redeem-reveal-overlay"
          dir="rtl"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRevealedRewardId(null);
          }}
        >
          <div
            className={`redeem-reveal-card${
              isRevealedMythic ? ' theme-mythic' : isRevealedVoid ? ' theme-void' : ''
            }`}
          >
            <div
              className={`redeem-gold-aura${
                isRevealedMythic ? ' is-mythic' : isRevealedVoid ? ' is-void' : ''
              }`}
              aria-hidden="true"
            />
            {!reducedMotion && (
              <div
                className={`spin-spark-burst ${isRevealedMythic ? 'rarity-mythic' : 'rarity-legendary'}`}
                aria-hidden="true"
              >
                {SPARK_ANGLES.map((ang, idx) => (
                  <span
                    key={ang}
                    className="spin-spark-dot"
                    style={
                      {
                        '--ang': `${ang}deg`,
                        '--dist': `${76 + (idx % 3) * 18}px`,
                        background: isRevealedMythic
                          ? idx % 3 === 0
                            ? '#ff2a55'
                            : idx % 3 === 1
                              ? '#ffffff'
                              : '#38bdf8'
                          : isRevealedVoid
                            ? idx % 2 === 0
                              ? '#22d3ee'
                              : '#a855f7'
                            : undefined,
                      } as React.CSSProperties
                    }
                  />
                ))}
              </div>
            )}

            <div
              className={`redeem-reveal-kicker${
                isRevealedMythic ? ' is-mythic' : isRevealedVoid ? ' is-void' : ''
              }`}
              dir="ltr"
            >
              {isRevealedMythic
                ? '✧ MYTHIC M249 ✧'
                : isRevealedVoid
                  ? '◈ LEGENDARY SNIPER ◈'
                  : '✦ LEGENDARY ✦'}
            </div>
            <h3 className="redeem-reveal-title">
              {revealedItem?.nameFa ??
                (isRevealedMythic
                  ? 'M249 تمپست ایجیس'
                  : isRevealedVoid
                    ? 'AWM وید پیرسر'
                    : 'AK-47 اینفرنو ریپر')}
            </h3>
            <div className="redeem-reveal-sub" dir="ltr">
              {isRevealedMythic
                ? `${revealedItem?.nameEn ?? 'Tempest Aegis'} · M249 SAW`
                : isRevealedVoid
                  ? `${revealedItem?.nameEn ?? 'Void Piercer'} · AWM .338`
                  : `${revealedItem?.nameEn ?? 'Inferno Reaper'} · AK-47`}
            </div>

            <div className="redeem-reveal-3d-wrap">
              <Suspense
                fallback={
                  <div className="redeem-3d-loading">در حال بارگذاری نمایش سه‌بعدی...</div>
                }
              >
                {isRevealedMythic ? (
                  <TempestAegisPreview3D
                    compact
                    reducedMotion={reducedMotion}
                    showDemoControls
                    showPerksSummary
                    onTriggerShotSound={onPlayTempestShotSound}
                    onTriggerKillSound={onPlayTempestKillSound}
                    onTriggerReloadPhaseSound={onPlayTempestReloadPhaseSound}
                    onTriggerInspectSound={onPlayTempestInspectSound}
                    onTriggerEmoteSound={onPlayTempestEmoteSound}
                  />
                ) : isRevealedVoid ? (
                  <VoidPiercerPreview3D
                    compact
                    reducedMotion={reducedMotion}
                    showDemoControls
                    onTriggerFireSound={onPlayVoidShotSound}
                    onTriggerKillSound={onPlayVoidKillSound}
                    onTriggerScopeSound={onPlayVoidScopeSound}
                  />
                ) : (
                  <InfernoPreview3D
                    compact
                    reducedMotion={reducedMotion}
                    showDemoControls={false}
                    onTriggerFireSound={onPlayFireSound}
                    onTriggerKillSound={onPlayInfernoKillSound}
                  />
                )}
              </Suspense>
            </div>

            <div className="redeem-reveal-actions">
              <button
                type="button"
                className="spin-equip-btn primary"
                data-testid="btn-redeem-equip"
                onClick={() => {
                  onEquipReward(revealedRewardId);
                  setRevealedRewardId(null);
                }}
              >
                {isRevealedEquipped ? 'فعال ✓' : 'انتخاب'}
              </button>
              <button
                type="button"
                className="spin-close-reveal-btn"
                data-testid="btn-redeem-close-reveal"
                onClick={() => setRevealedRewardId(null)}
              >
                ادامه
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
