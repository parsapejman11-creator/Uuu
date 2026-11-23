import React, { useEffect, useState } from 'react';
import { IconRotatePhone } from './icons';

/**
 * Displays a clean RTL "گوشی رو بچرخون" overlay whenever UI v2 is viewed
 * in narrow portrait orientation (phones / portrait tablets).
 * Automatically hides the instant the user rotates to landscape.
 */
export const RotatePromptV2: React.FC = () => {
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      if (typeof window === 'undefined') return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      setIsPortraitMobile(h > w && w <= 760);
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  if (!isPortraitMobile) return null;

  return (
    <div
      className="uiv2-rotate-overlay"
      data-testid="uiv2-rotate-prompt"
      role="dialog"
      aria-modal="true"
      aria-label="چرخش گوشی به حالت افقی"
      dir="rtl"
    >
      <div className="uiv2-rotate-card">
        <div className="uiv2-rotate-icon-wrap">
          <IconRotatePhone size={48} />
        </div>
        <h2 className="uiv2-rotate-title">گوشی رو بچرخون</h2>
        <p className="uiv2-rotate-sub">
          برای بهترین تجربهٔ بازی و دید کامل در رابط جدید، گوشی را در حالت افقی (Landscape) قرار دهید.
        </p>
      </div>
    </div>
  );
};
