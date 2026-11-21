import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { canInstall, hasNativePrompt, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled || !canInstall) return null;

  const handleClick = async () => {
    if (hasNativePrompt) {
      await install();
      return;
    }
    if (isIOS) {
      setShowIOSGuide((prev) => !prev);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        type="button"
        data-testid="btn-pwa-install"
        className="secondary-btn"
        onClick={handleClick}
        style={{
          borderColor: 'rgba(56, 189, 248, 0.35)',
          color: '#bae6fd',
          background: 'rgba(56, 189, 248, 0.08)',
        }}
      >
        نصب روی گوشی
      </button>

      {showIOSGuide && (
        <div
          data-testid="pwa-ios-guide"
          dir="rtl"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(2, 6, 12, 0.72)',
            padding: '16px',
          }}
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            style={{
              maxWidth: '340px',
              width: '100%',
              background: 'rgba(10, 15, 24, 0.96)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '8px',
              padding: '14px 16px',
              color: '#f1f5f9',
              fontSize: '12px',
              lineHeight: 1.7,
              textAlign: 'right',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '6px', fontSize: '13px' }}>
              نصب روی گوشی آیفون (Safari)
            </div>
            <div>۱. در پایین صفحه سافاری دکمه <b>Share</b> را بزنید.</div>
            <div>۲. گزینه <b>Add to Home Screen</b> را انتخاب کنید.</div>
            <div>۳. بازی به‌صورت تمام‌صفحه و افقی اجرا می‌شود.</div>
            <button
              type="button"
              className="secondary-btn"
              style={{ marginTop: '10px', width: '100%' }}
              onClick={() => setShowIOSGuide(false)}
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
