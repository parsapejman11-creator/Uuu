import React from 'react';
import {
  UI_V2_ALPHA_DISCLAIMER_FA,
  UI_V2_ALPHA_LABEL,
  type UiVersionId,
} from './uiVersionStore';

interface UiVersionSwitchProps {
  /** The user's saved/selected UI version preference */
  preferredUi: UiVersionId;
  /** The currently active rendered UI version */
  activeUi: UiVersionId;
  /** Non-null when changed mid-match and deferred until match exit */
  pendingNoticeFa: string | null;
  /** Styling variant: 'legacy' blends minimally into legacy Settings; 'v2' uses full UI v2 tokens */
  variant: 'legacy' | 'v2';
  onSelectUi: (next: UiVersionId) => void;
}

export const UiVersionSwitch: React.FC<UiVersionSwitchProps> = ({
  preferredUi,
  activeUi,
  pendingNoticeFa,
  variant,
  onSelectUi,
}) => {
  if (variant === 'legacy') {
    return (
      <div
        className="legacy-ui-switch-bar"
        data-testid="ui-version-switcher"
        data-active-ui={activeUi}
        data-preferred-ui={preferredUi}
        dir="rtl"
      >
        <div className="legacy-ui-switch-head">
          <div className="legacy-ui-switch-label">
            <span>نسخهٔ رابط کاربری</span>
            {preferredUi === 'v2' && (
              <span className="legacy-ui-alpha-mark" data-testid="ui-switch-alpha-tag">
                {UI_V2_ALPHA_LABEL}
              </span>
            )}
          </div>
          <div className="legacy-ui-segmented" role="radiogroup" aria-label="انتخاب رابط کاربری">
            <button
              type="button"
              role="radio"
              aria-checked={preferredUi === 'legacy'}
              data-testid="btn-select-ui-legacy"
              className={`legacy-ui-seg-btn ${preferredUi === 'legacy' ? 'active' : ''}`}
              onClick={() => onSelectUi('legacy')}
            >
              UI قدیمی
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={preferredUi === 'v2'}
              data-testid="btn-select-ui-v2"
              className={`legacy-ui-seg-btn ${preferredUi === 'v2' ? 'active' : ''}`}
              onClick={() => onSelectUi('v2')}
            >
              UI جدید · {UI_V2_ALPHA_LABEL}
            </button>
          </div>
        </div>
        {pendingNoticeFa ? (
          <div className="legacy-ui-switch-note is-pending" role="status" data-testid="ui-switch-pending-notice">
            {pendingNoticeFa}
          </div>
        ) : preferredUi === 'v2' ? (
          <div className="legacy-ui-switch-note">{UI_V2_ALPHA_DISCLAIMER_FA}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="uiv2-switch-card"
      data-testid="ui-version-switcher"
      data-active-ui={activeUi}
      data-preferred-ui={preferredUi}
      dir="rtl"
    >
      <div className="uiv2-switch-card-row">
        <div className="uiv2-switch-card-text">
          <div className="uiv2-switch-card-title">
            <span>رابط کاربری</span>
            <span className="uiv2-alpha-tag" data-testid="ui-switch-alpha-tag">
              {UI_V2_ALPHA_LABEL}
            </span>
          </div>
          <div className="uiv2-switch-card-sub">{UI_V2_ALPHA_DISCLAIMER_FA}</div>
        </div>
        <div className="uiv2-segmented" role="radiogroup" aria-label="انتخاب رابط کاربری">
          <button
            type="button"
            role="radio"
            aria-checked={preferredUi === 'legacy'}
            data-testid="btn-select-ui-legacy"
            className={`uiv2-seg-btn ${preferredUi === 'legacy' ? 'is-active' : ''}`}
            onClick={() => onSelectUi('legacy')}
          >
            UI قدیمی
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={preferredUi === 'v2'}
            data-testid="btn-select-ui-v2"
            className={`uiv2-seg-btn ${preferredUi === 'v2' ? 'is-active' : ''}`}
            onClick={() => onSelectUi('v2')}
          >
            UI جدید · {UI_V2_ALPHA_LABEL}
          </button>
        </div>
      </div>
      {pendingNoticeFa && (
        <div className="uiv2-pending-banner" role="status" data-testid="ui-switch-pending-notice">
          {pendingNoticeFa}
        </div>
      )}
    </div>
  );
};
