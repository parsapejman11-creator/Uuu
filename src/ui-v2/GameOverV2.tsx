import React from 'react';
import { computeAccuracyPercent } from '../game/rules';
import { IconHome, IconReset } from './icons';
import type { UiFeedbackKind } from './feedback';

interface GameOverV2Props {
  stats: {
    score: number;
    kills: number;
    deaths: number;
    wave: number;
    shotsFired: number;
    shotsHit: number;
    headshots: number;
  };
  onRetry: () => void;
  onReturnToTitle: () => void;
  onFeedback: (kind: UiFeedbackKind) => void;
}

export const GameOverV2: React.FC<GameOverV2Props> = ({
  stats,
  onRetry,
  onReturnToTitle,
  onFeedback,
}) => {
  const accuracy = computeAccuracyPercent(stats.shotsFired, stats.shotsHit);

  return (
    <div
      id="gameover-screen"
      className="uiv2-screen uiv2-gameover-screen"
      role="dialog"
      aria-modal="true"
      aria-label="پایان عملیات"
      data-testid="uiv2-gameover"
      dir="rtl"
    >
      <div className="uiv2-gameover-card">
        <div className="uiv2-gameover-head">
          <div className="uiv2-gameover-kicker">قطع ارتباط دوربین · سقوط</div>
          <h2 className="uiv2-gameover-title">اپراتور در درگیری از پای درآمد</h2>
        </div>

        <div className="uiv2-gameover-stats" data-testid="gameover-summary-stats">
          <div className="uiv2-stat-cell">
            <span className="uiv2-stat-num uiv2-tabular" id="go-kills">
              {stats.kills}
            </span>
            <span className="uiv2-stat-lbl">کشتن</span>
          </div>
          <div className="uiv2-stat-cell">
            <span className="uiv2-stat-num uiv2-tabular" id="go-deaths">
              {stats.deaths}
            </span>
            <span className="uiv2-stat-lbl">مرگ</span>
          </div>
          <div className="uiv2-stat-cell">
            <span className="uiv2-stat-num uiv2-tabular" id="go-accuracy">
              {accuracy}%
            </span>
            <span className="uiv2-stat-lbl">دقت تیراندازی</span>
          </div>
          <div className="uiv2-stat-cell">
            <span className="uiv2-stat-num uiv2-tabular" id="go-headshots">
              {stats.headshots}
            </span>
            <span className="uiv2-stat-lbl">هدشات</span>
          </div>
          <div className="uiv2-stat-cell">
            <span className="uiv2-stat-num uiv2-tabular" id="go-score">
              {stats.score}
            </span>
            <span className="uiv2-stat-lbl">امتیاز کل</span>
          </div>
          <div className="uiv2-stat-cell">
            <span className="uiv2-stat-num uiv2-tabular" id="go-wave">
              {stats.wave}
            </span>
            <span className="uiv2-stat-lbl">موج نهایی</span>
          </div>
        </div>

        <div className="uiv2-gameover-actions">
          <button
            id="btn-retry"
            type="button"
            className="uiv2-btn uiv2-btn-primary"
            data-start="true"
            onClick={() => {
              onFeedback('primary');
              onRetry();
            }}
          >
            <IconReset size={17} />
            <span>بازی دوباره</span>
          </button>
          <button
            type="button"
            className="uiv2-btn uiv2-btn-surface"
            onClick={() => {
              onFeedback('back');
              onReturnToTitle();
            }}
          >
            <IconHome size={17} />
            <span>خروج به منوی اصلی</span>
          </button>
        </div>
      </div>
    </div>
  );
};
