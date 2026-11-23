import React from 'react';
import { UI_V2_ALPHA_DISCLAIMER_FA, UI_V2_ALPHA_LABEL } from './uiVersionStore';

interface AlphaNoticeProps {
  compact?: boolean;
  showDescription?: boolean;
  className?: string;
}

export const AlphaNotice: React.FC<AlphaNoticeProps> = ({
  compact = false,
  showDescription = true,
  className = '',
}) => {
  return (
    <div
      className={`uiv2-alpha-notice ${compact ? 'is-compact' : ''} ${className}`.trim()}
      data-testid="uiv2-alpha-notice"
      dir="rtl"
    >
      <span className="uiv2-alpha-tag" data-testid="uiv2-alpha-badge">
        {UI_V2_ALPHA_LABEL}
      </span>
      {showDescription && (
        <span className="uiv2-alpha-desc">{UI_V2_ALPHA_DISCLAIMER_FA}</span>
      )}
    </div>
  );
};
