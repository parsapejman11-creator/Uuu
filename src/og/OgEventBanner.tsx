import React, { useEffect, useState } from 'react';
import { OG_EVENT_CONFIG, formatOgCountdownFa } from './og.config';

interface OgEventBannerProps {
  /** 'normal' shows the entry trigger + event banner; 'active' shows the active OG mode bar + exit button */
  variant: 'normal' | 'active';
  /** Compact density for UI v2 menu */
  compact?: boolean;
  onOpenIntro?: () => void;
  onExitOg?: () => void;
}

export const OgEventBanner: React.FC<OgEventBannerProps> = ({
  variant,
  compact = false,
  onOpenIntro,
  onExitOg,
}) => {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!OG_EVENT_CONFIG.eventEndIso) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!OG_EVENT_CONFIG.enabled) return null;

  const countdown = formatOgCountdownFa(OG_EVENT_CONFIG.eventEndIso, nowMs);

  if (variant === 'active') {
    return (
      <div
        className="og-active-banner"
        data-testid="og-active-banner"
        dir="rtl"
        role="region"
        aria-label="حالت کلاسیک OG فعال است"
      >
        <div className="og-active-banner-info">
          <span className="og-event-tag og-event-tag-live">{OG_EVENT_CONFIG.badgeFa} · OG</span>
          <div className="og-active-banner-text">
            <strong>حالت OG فعال است — {OG_EVENT_CONFIG.subtitleFa}</strong>
            <span>
              رابط قدیمی · بدون اسکین، اسپین و پیشرفت عادی
              {countdown ? ` · باقی‌مانده: ${countdown.labelFa}` : ''}
            </span>
          </div>
        </div>
        {onExitOg && (
          <button
            type="button"
            className="og-btn-exit"
            data-testid="btn-exit-og-menu"
            onClick={onExitOg}
          >
            خروج از OG (حالت عادی)
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`og-promo-banner ${compact ? 'is-compact' : ''}`}
      data-testid="og-promo-banner"
      dir="rtl"
    >
      <div className="og-promo-meta">
        <span className="og-event-tag">{OG_EVENT_CONFIG.badgeFa}</span>
        <div className="og-promo-copy">
          <strong>OG · {OG_EVENT_CONFIG.subtitleFa}</strong>
          <span>
            نسخهٔ کلاسیک بازی (بدون اسکین و اسپین)
            {countdown ? ` · ${countdown.labelFa}` : ''}
          </span>
        </div>
      </div>
      <button
        type="button"
        className="og-entry-btn"
        data-testid="btn-open-og"
        onClick={onOpenIntro}
      >
        <span className="og-entry-btn-label" dir="ltr">OG</span>
        <span className="og-entry-btn-badge">{OG_EVENT_CONFIG.badgeFa}</span>
      </button>
    </div>
  );
};
