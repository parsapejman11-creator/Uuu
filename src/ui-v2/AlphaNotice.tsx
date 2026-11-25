import React from 'react';
import { UI_V2_STAGE_LABEL, UI_V2_STAGE_NOTICE_FA } from './uiVersionStore';

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
      title={UI_V2_STAGE_NOTICE_FA}
      dir="rtl"
    >
      <span className="uiv2-alpha-tag" data-testid="uiv2-alpha-badge" title={UI_V2_STAGE_NOTICE_FA}>
        {UI_V2_STAGE_LABEL}
      </span>
      {showDescription && (
        <span className="uiv2-alpha-desc">{UI_V2_STAGE_NOTICE_FA}</span>
      )}
    </div>
  );
};
