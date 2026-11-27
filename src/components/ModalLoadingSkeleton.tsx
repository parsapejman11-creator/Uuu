import React from 'react';

interface ModalLoadingSkeletonProps {
  title: string;
  onClose?: () => void;
  testId?: string;
}

/**
 * Instant (<16ms) glass modal shell rendered immediately inside React.Suspense
 * while any lazy modal chunk finishes resolving (prevents blank/frozen taps).
 */
export const ModalLoadingSkeleton: React.FC<ModalLoadingSkeletonProps> = React.memo(
  ({ title, onClose, testId = 'modal-loading-skeleton' }) => {
    return (
      <div
        className="uiv3-modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-busy="true"
        aria-label={title}
        data-testid={testId}
        dir="rtl"
        style={{ zIndex: 105 }}
      >
        <div className="uiv3-ambient-scrim" aria-hidden="true" />
        <div className="uiv3-modal-sheet">
          <div className="uiv3-modal-glass-bg" aria-hidden="true" />
          <div className="uiv3-modal-content">
            <div className="uiv3-modal-header">
              <div className="uiv3-modal-title-group">
                <h2 className="uiv3-modal-title">{title}</h2>
                <div className="uiv3-modal-subtitle">در حال آماده‌سازی...</div>
              </div>
              {onClose && (
                <button
                  type="button"
                  className="uiv3-icon-circle-btn"
                  aria-label="بستن"
                  onClick={onClose}
                >
                  ✕
                </button>
              )}
            </div>
            <div
              className="uiv3-modal-body"
              style={{
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div
                style={{
                  height: '44px',
                  borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.08)',
                }}
              />
              <div
                style={{
                  height: '96px',
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.06)',
                }}
              />
              <div
                style={{
                  height: '72px',
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.05)',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
);
