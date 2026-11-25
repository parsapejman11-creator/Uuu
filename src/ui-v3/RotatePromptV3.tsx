import React, { useEffect, useState } from 'react';
import { IconRotatePhone } from './icons';

function isPortraitPhoneViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerHeight > window.innerWidth && window.innerWidth <= 760;
}

export const RotatePromptV3: React.FC = React.memo(() => {
  const [isPortrait, setIsPortrait] = useState<boolean>(() => isPortraitPhoneViewport());

  useEffect(() => {
    const sync = () => setIsPortrait(isPortraitPhoneViewport());
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
    };
  }, []);

  if (!isPortrait) return null;

  return (
    <div
      className="uiv3-rotate-gate"
      role="alert"
      aria-live="assertive"
      data-testid="uiv3-rotate-prompt"
      dir="rtl"
    >
      <div className="uiv3-rotate-card uiv3-blur-layer uiv3-blur-l1">
        <div className="uiv3-rotate-icon-wrap" aria-hidden="true">
          <IconRotatePhone size={42} />
        </div>
        <h2 className="uiv3-rotate-title">گوشی رو بچرخون</h2>
        <p className="uiv3-rotate-sub">
          برای تجربهٔ روان و دید کامل در رابط لیکوید گلس، گوشی را به حالت افقی (Landscape) بچرخانید.
        </p>
      </div>
    </div>
  );
});
