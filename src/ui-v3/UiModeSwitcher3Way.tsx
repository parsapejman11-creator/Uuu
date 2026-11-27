import React from 'react';
import {
  UI_V3_OPTION_LABEL_FA,
  UI_V3_STAGE_LABEL,
  UI_V3_STAGE_NOTICE_FA,
  type AppUiVersionId,
} from './uiV3Store';

interface UiModeSwitcher3WayProps {
  preferredUi: AppUiVersionId;
  activeUi: AppUiVersionId;
  pendingNoticeFa: string | null;
  variant: 'legacy' | 'v3';
  onSelectUi: (next: AppUiVersionId) => void;
}

export const UiModeSwitcher3Way: React.FC<UiModeSwitcher3WayProps> = React.memo(
  ({ preferredUi, activeUi, pendingNoticeFa, variant, onSelectUi }) => {
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
              {preferredUi === 'v3' && (
                <span
                  className="legacy-ui-alpha-mark"
                  data-testid="ui-switch-alpha-tag"
                  title={UI_V3_STAGE_NOTICE_FA}
                >
                  {UI_V3_STAGE_LABEL}
                </span>
              )}
            </div>
            <div className="legacy-ui-segmented legacy-ui-segmented-3way" role="radiogroup" aria-label="انتخاب رابط کاربری">
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
                aria-checked={preferredUi === 'v3'}
                data-testid="btn-select-ui-v3"
                title={UI_V3_STAGE_NOTICE_FA}
                className={`legacy-ui-seg-btn ${preferredUi === 'v3' ? 'active' : ''}`}
                onClick={() => onSelectUi('v3')}
              >
                {UI_V3_OPTION_LABEL_FA}
              </button>
            </div>
          </div>
          {pendingNoticeFa ? (
            <div className="legacy-ui-switch-note is-pending" role="status" data-testid="ui-switch-pending-notice">
              {pendingNoticeFa}
            </div>
          ) : preferredUi === 'v3' ? (
            <div className="legacy-ui-switch-note">{UI_V3_STAGE_NOTICE_FA}</div>
          ) : null}
        </div>
      );
    }

    return (
      <div
        className="uiv3-switcher-box"
        data-testid="ui-version-switcher"
        data-active-ui={activeUi}
        data-preferred-ui={preferredUi}
        dir="rtl"
      >
        <div className="uiv3-switcher-head">
          <div className="uiv3-switcher-title-row">
            <span className="uiv3-setting-title">انتخاب رابط کاربری</span>
            <span
              className="uiv3-stage-pill"
              data-testid="ui-switch-alpha-tag"
              title={UI_V3_STAGE_NOTICE_FA}
            >
              {UI_V3_STAGE_LABEL}
            </span>
          </div>
          <span className="uiv3-setting-desc uiv3-switcher-one-line">
            تغییر میان UI قدیمی و لیکوید گلس بدون تغییر در منطق بازی
          </span>
        </div>
        <div className="uiv3-segmented-3way" role="radiogroup" aria-label="انتخاب رابط کاربری">
          <button
            type="button"
            role="radio"
            aria-checked={preferredUi === 'legacy'}
            data-testid="btn-select-ui-legacy"
            className={`uiv3-seg-btn ${preferredUi === 'legacy' ? 'is-active' : ''}`}
            onClick={() => onSelectUi('legacy')}
          >
            UI قدیمی
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={preferredUi === 'v3'}
            data-testid="btn-select-ui-v3"
            title={UI_V3_STAGE_NOTICE_FA}
            className={`uiv3-seg-btn ${preferredUi === 'v3' ? 'is-active' : ''}`}
            onClick={() => onSelectUi('v3')}
          >
            لیکوید گلس
          </button>
        </div>
        {pendingNoticeFa && (
          <div className="uiv3-pending-notice" role="status" data-testid="ui-switch-pending-notice">
            {pendingNoticeFa}
          </div>
        )}
      </div>
    );
  }
);
