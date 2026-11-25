import React from 'react';
import { useHudSnapshotV3 } from './UiV3Context';

/**
 * Memoized, low-frequency (10-15 Hz) Liquid Glass gameplay HUD status strip.
 * STRICT PERFORMANCE GUARANTEE:
 * - Reads ONLY from throttled HudSnapshotV3 (~12.5 Hz), never per-frame.
 * - Uses ZERO backdrop-filter (CSS explicitly enforces `backdrop-filter: none !important`).
 * - Completely non-blocking (`pointer-events: none`) so touch controls and aiming are untouched.
 */
export const HudV3Overlay: React.FC = React.memo(() => {
  const snap = useHudSnapshotV3();
  if (!snap || !snap.isPlaying) return null;

  const hpPct = Math.max(0, Math.min(100, Math.round((snap.hp / Math.max(1, snap.maxHp)) * 100)));
  const hpTone = hpPct <= 30 ? 'is-low' : hpPct <= 60 ? 'is-mid' : 'is-high';

  return (
    <div
      className="uiv3-hud-strip"
      data-testid="uiv3-hud-snapshot-strip"
      aria-hidden="true"
      dir="rtl"
    >
      <div className="uiv3-hud-capsule">
        <span className={`uiv3-hud-hp-dot ${hpTone}`} />
        <span className="uiv3-hud-val" dir="ltr">
          {snap.hp}
        </span>
        <span className="uiv3-hud-sep" />
        <span className="uiv3-hud-weapon">{snap.weaponName}</span>
        <span className="uiv3-hud-ammo" dir="ltr">
          {snap.reloading ? 'RLD' : `${snap.ammo}/${snap.reserve}`}
        </span>
        <span className="uiv3-hud-sep" />
        <span className="uiv3-hud-meta">
          {snap.isOnline ? `امتیاز ${snap.score}` : `موج ${snap.wave}`}
        </span>
      </div>
    </div>
  );
});
