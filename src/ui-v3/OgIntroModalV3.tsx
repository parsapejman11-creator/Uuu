import React, { useEffect, useState } from 'react';
import { OG_EVENT_CONFIG, formatOgCountdownFa } from '../og/og.config';
import { BidiText, GlassButton } from './primitives';
import { IconClose, IconHistory } from './icons';
import { measureModalOpenPaint } from '../utils/perfHelpers';

export interface OgIntroModalV3Props {
  open: boolean;
  bestScore: number;
  bestWave: number;
  onEnterOg: () => void;
  onClose: () => void;
}

/**
 * Liquid Glass Stage 2 entry modal for the OG Event (shown ONLY when active UI is v3).
 * Once the player confirms entering OG mode, the app enforces Legacy UI strictly as required.
 */
export const OgIntroModalV3: React.FC<OgIntroModalV3Props> = React.memo(
  ({ open, bestScore, bestWave, onEnterOg, onClose }) => {
    const [nowMs, setNowMs] = useState(() => Date.now());

    useEffect(() => {
      if (!open) return;
      measureModalOpenPaint('og-intro-v3');
      if (!OG_EVENT_CONFIG.eventEndIso) return;
      const id = window.setInterval(() => setNowMs(Date.now()), 1000);
      return () => window.clearInterval(id);
    }, [open]);

    useEffect(() => {
      if (!open) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    const countdown = formatOgCountdownFa(OG_EVENT_CONFIG.eventEndIso, nowMs);

    return (
      <div
        className="uiv3-modal-backdrop"
        data-testid="og-intro-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="uiv3-og-intro-title"
        dir="rtl"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="uiv3-ambient-scrim" aria-hidden="true" />
        <div className="uiv3-modal-sheet uiv3-og-sheet">
          <div className="uiv3-modal-glass-bg" aria-hidden="true" />
          <div className="uiv3-modal-content">
            {/* Blur Layer 1: Compact Glass Header */}
            <header className="uiv3-modal-header uiv3-blur-layer uiv3-blur-l1">
              <div className="uiv3-og-head-left">
                <div className="uiv3-og-emblem" aria-hidden="true">
                  <IconHistory size={22} />
                </div>
                <div className="uiv3-modal-title-group">
                  <div className="uiv3-modal-title-row">
                    <h2 id="uiv3-og-intro-title" className="uiv3-modal-title" dir="ltr">
                      BODY<span style={{ color: '#fbbf24' }}>CAM</span> · OG
                    </h2>
                    <span className="uiv3-og-pill-tag">{OG_EVENT_CONFIG.badgeFa}</span>
                    <span className="uiv3-og-era-chip" dir="ltr">
                      CLASSIC · v1.0
                    </span>
                  </div>
                  <div className="uiv3-modal-subtitle">
                    <BidiText text={OG_EVENT_CONFIG.subtitleFa} />
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="uiv3-icon-circle-btn"
                aria-label="بستن"
                onClick={onClose}
                data-testid="uiv3-og-close-btn"
              >
                <IconClose size={17} />
              </button>
            </header>

            <div className="uiv3-og-body">
              <p className="uiv3-og-desc">
                تجربهٔ خالص و اولیهٔ بازی با رابط کاربری قدیمی، نقشه‌های کلاسیک و قوانین روز اول — بدون اسکین، بدون اسپین و بدون امکانات مدرن.
              </p>

              <div className="uiv3-og-highlights">
                <div className="uiv3-og-tile">
                  <strong>رابط قدیمی اجباری</strong>
                  <span>با ورود به OG، فقط منو و HUD کلاسیک فعال است (لیکوید گلس موقتاً غیرفعال می‌شود).</span>
                </div>
                <div className="uiv3-og-tile">
                  <strong>نبرد خالص روز اول</strong>
                  <span>بدون اسکین، بدون اسپین، بدون کد ردیم و بدون اسلاید یا Aim Assist نرم.</span>
                </div>
                <div className="uiv3-og-tile">
                  <strong>آنلاین اختصاصی OG</strong>
                  <span>اتاق‌های آنلاین OG فقط برای بازیکنان OG باز هستند (حالت کلاسیک نبرد آزاد).</span>
                </div>
              </div>

              <div className="uiv3-og-meta-row">
                {OG_EVENT_CONFIG.endingSoon && (
                  <div className="uiv3-og-stat-pill is-ending" data-testid="og-ending-notice" role="status">
                    <span>مهلت ایونت قدیمی</span>
                    <strong>{OG_EVENT_CONFIG.endingShortFa}</strong>
                  </div>
                )}
                {countdown && (
                  <div className="uiv3-og-stat-pill" data-testid="og-intro-countdown">
                    <span>زمان باقی‌ماندهٔ ایونت</span>
                    <strong dir="ltr">{countdown.labelFa}</strong>
                  </div>
                )}
                {(bestScore > 0 || bestWave > 0) && (
                  <div className="uiv3-og-stat-pill">
                    <span>رکورد جداگانهٔ OG</span>
                    <strong dir="ltr">
                      SCORE {bestScore.toLocaleString()} · WAVE {bestWave}
                    </strong>
                  </div>
                )}
              </div>
            </div>

            <footer className="uiv3-modal-footer uiv3-og-footer">
              <GlassButton
                variant="primary"
                size="md"
                className="uiv3-og-confirm-btn"
                data-testid="btn-confirm-enter-og"
                onClick={onEnterOg}
              >
                ورود به حالت OG
              </GlassButton>
              <GlassButton
                variant="subtle"
                size="md"
                data-testid="btn-cancel-enter-og"
                onClick={onClose}
              >
                انصراف و بازگشت
              </GlassButton>
            </footer>
          </div>
        </div>
      </div>
    );
  }
);
