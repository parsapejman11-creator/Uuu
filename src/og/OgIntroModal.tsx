import React, { useEffect, useState } from 'react';
import { OG_EVENT_CONFIG, formatOgCountdownFa } from './og.config';

interface OgIntroModalProps {
  open: boolean;
  bestScore: number;
  bestWave: number;
  onEnterOg: () => void;
  onClose: () => void;
}

export const OgIntroModal: React.FC<OgIntroModalProps> = ({
  open,
  bestScore,
  bestWave,
  onEnterOg,
  onClose,
}) => {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!open || !OG_EVENT_CONFIG.eventEndIso) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [open]);

  if (!open) return null;

  const countdown = formatOgCountdownFa(OG_EVENT_CONFIG.eventEndIso, nowMs);

  return (
    <div
      className="og-intro-backdrop"
      data-testid="og-intro-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="og-intro-title"
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="og-intro-card">
        <div className="og-intro-scanline" aria-hidden="true" />

        <div className="og-intro-top">
          <div className="og-intro-emblem" aria-hidden="true">
            <svg width="46" height="46" viewBox="0 0 48 48" fill="none">
              <rect x="2" y="2" width="44" height="44" rx="8" fill="#07111a" stroke="#f59e0b" strokeWidth="2" />
              <path d="M9 15V9H15M33 9H39V15M39 33V39H33M15 39H9V33" stroke="#00f0ff" strokeWidth="2" strokeLinecap="square" />
              <circle cx="24" cy="24" r="8" stroke="#f59e0b" strokeWidth="2" />
              <circle cx="24" cy="24" r="3" fill="#00f0ff" />
              <path d="M24 11V14M24 34V37M11 24H14M34 24H37" stroke="#f59e0b" strokeWidth="1.8" />
            </svg>
          </div>
          <div className="og-intro-title-block">
            <div className="og-intro-kicker-row">
              <span className="og-event-tag">{OG_EVENT_CONFIG.badgeFa}</span>
              <span className="og-era-tag" dir="ltr">CLASSIC BUILD · v1.0</span>
            </div>
            <h2 id="og-intro-title" className="og-intro-title" dir="ltr">
              BODY<span>CAM</span> · OG
            </h2>
            <p className="og-intro-tagline">{OG_EVENT_CONFIG.subtitleFa}</p>
          </div>
        </div>

        <p className="og-intro-desc">
          تجربهٔ خالص و اولیهٔ بازی با رابط کاربری قدیمی، نقشه‌های کلاسیک و قوانین روز اول — بدون اسکین، بدون اسپین و بدون امکانات مدرن.
        </p>

        <div className="og-intro-highlights">
          <div className="og-intro-item">
            <strong>رابط قدیمی اجباری</strong>
            <span>حتی اگر روی UI جدید باشید، اینجا فقط منو و HUD کلاسیک فعال است.</span>
          </div>
          <div className="og-intro-item">
            <strong>نبرد خالص بدون اسکین و اسپین</strong>
            <span>بدون کد ردیم، بدون اسلاید و Aim Assist نرم، بدون پیشرفت یا جایزهٔ حالت عادی.</span>
          </div>
          <div className="og-intro-item">
            <strong>آنلاین اختصاصی OG</strong>
            <span>اتاق‌های آنلاین OG فقط برای بازیکنان OG باز هستند (حالت کلاسیک نبرد آزاد).</span>
          </div>
        </div>

        {countdown && (
          <div className="og-intro-countdown" data-testid="og-intro-countdown">
            <span>زمان باقی‌ماندهٔ ایونت:</span>
            <strong dir="ltr">{countdown.labelFa}</strong>
          </div>
        )}

        {(bestScore > 0 || bestWave > 0) && (
          <div className="og-intro-record">
            <span>رکورد جداگانهٔ OG شما:</span>
            <strong dir="ltr">
              SCORE {bestScore.toLocaleString()} · WAVE {bestWave}
            </strong>
          </div>
        )}

        <div className="og-intro-actions">
          <button
            type="button"
            className="og-btn-enter"
            data-testid="btn-confirm-enter-og"
            onClick={onEnterOg}
          >
            ورود به حالت OG
          </button>
          <button
            type="button"
            className="og-btn-cancel"
            data-testid="btn-cancel-enter-og"
            onClick={onClose}
          >
            انصراف و بازگشت
          </button>
        </div>
      </div>
    </div>
  );
};
