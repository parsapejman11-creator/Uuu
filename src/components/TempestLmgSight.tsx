import React from 'react';

interface TempestLmgSightProps {
  /** Disables subtle pulse/shimmer when Reduced Motion or Low/Potato GFX is active. */
  simplified?: boolean;
  /** Preview mode inside cosmetics / spin modal (compact scale, contained inside card). */
  previewMode?: boolean;
  /** Optional live ammo count to show cleanly under the sight bezel. */
  ammoCount?: number;
}

/**
 * Exclusive Mythic M249 SAW "Tempest Aegis" Holographic Wing ADS Sight.
 *
 * Design guarantees:
 * - Purely cosmetic visual upgrade (identical ADS FOV, spread, sensitivity & damage).
 * - Strict Single-Sight Invariant: active ONLY when ADS with Mythic M249 in non-OG mode;
 *   hides both the 2D hipfire crosshair AND the 3D top-rail optic so zero double-reticle occurs.
 * - Crystal-clear unobstructed interior with a razor-sharp dead-center diamond-dot reticle
 *   framed by ceramic-crimson & prismatic-cyan aerospace wing arcs.
 * - Zero backdrop-filter or heavy blur so framerate remains rock solid on every device.
 */
export const TempestLmgSight: React.FC<TempestLmgSightProps> = React.memo(
  ({ simplified = false, previewMode = false, ammoCount }) => {
    return (
      <div
        className={`tempest-sight-overlay${previewMode ? ' is-preview' : ''}${simplified ? ' is-simplified' : ''}`}
        data-testid={previewMode ? 'tempest-sight-preview' : 'tempest-sight-overlay'}
        aria-hidden="true"
      >
        <div className="tempest-sight-shell">
          <svg className="tempest-sight-svg" viewBox="0 0 280 220" fill="none">
            <defs>
              <linearGradient id="tempestFrameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.92" />
                <stop offset="48%" stopColor="#fb7185" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="tempestCyanArc" x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.88" />
                <stop offset="50%" stopColor="#f43f5e" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.88" />
              </linearGradient>
            </defs>

            {/* Subtle dark contrast backing on outer aerospace wing brackets only (center stays 100% open) */}
            <path
              d="M 52 72 L 66 54 L 96 54 M 228 72 L 214 54 L 184 54 M 52 148 L 66 166 L 96 166 M 228 148 L 214 166 L 184 166"
              stroke="rgba(6, 10, 18, 0.72)"
              strokeWidth="4.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 52 72 L 66 54 L 96 54 M 228 72 L 214 54 L 184 54 M 52 148 L 66 166 L 96 166 M 228 148 L 214 166 L 184 166"
              stroke="url(#tempestFrameGrad)"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Twin curved aerospace stabilizer wing arcs (left & right) */}
            <path
              d="M 46 84 A 96 96 0 0 0 46 136"
              stroke="rgba(6, 10, 18, 0.65)"
              strokeWidth="4.6"
              strokeLinecap="round"
            />
            <path
              d="M 46 84 A 96 96 0 0 0 46 136"
              stroke="#e11d48"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M 234 84 A 96 96 0 0 1 234 136"
              stroke="rgba(6, 10, 18, 0.65)"
              strokeWidth="4.6"
              strokeLinecap="round"
            />
            <path
              d="M 234 84 A 96 96 0 0 1 234 136"
              stroke="#e11d48"
              strokeWidth="2.2"
              strokeLinecap="round"
            />

            {/* Inner prismatic holographic ring (very thin, wide open around aim point) */}
            <g className="tempest-sight-scan">
              <circle
                cx="140"
                cy="110"
                r="62"
                stroke="url(#tempestCyanArc)"
                strokeWidth="1.15"
                strokeDasharray="18 14 6 14"
                strokeOpacity="0.58"
              />
            </g>

            {/* Horizontal & vertical ballistic lead stadia ticks (far from center) */}
            <line x1="66" y1="110" x2="90" y2="110" stroke="rgba(6, 10, 18, 0.72)" strokeWidth="3.2" strokeLinecap="round" />
            <line x1="66" y1="110" x2="90" y2="110" stroke="#38bdf8" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="190" y1="110" x2="214" y2="110" stroke="rgba(6, 10, 18, 0.72)" strokeWidth="3.2" strokeLinecap="round" />
            <line x1="190" y1="110" x2="214" y2="110" stroke="#38bdf8" strokeWidth="1.4" strokeLinecap="round" />

            <line x1="140" y1="54" x2="140" y2="66" stroke="rgba(248, 250, 252, 0.78)" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="140" y1="154" x2="140" y2="168" stroke="rgba(244, 63, 94, 0.86)" strokeWidth="1.6" strokeLinecap="round" />

            {/* Subtle drop-compensation micro dots below center */}
            <circle cx="140" cy="130" r="1.35" fill="rgba(56, 189, 248, 0.85)" />
            <circle cx="140" cy="142" r="1.1" fill="rgba(244, 63, 94, 0.75)" />

            {/* Crisp Dead-Center Mythic Reticle: open diamond halo + pinpoint glowing core */}
            <g className="tempest-reticle-core">
              {/* Thin precision diamond brackets (open center) */}
              <polygon
                points="140,98 152,110 140,122 128,110"
                stroke="rgba(6, 10, 18, 0.78)"
                strokeWidth="2.8"
                fill="none"
              />
              <polygon
                points="140,98 152,110 140,122 128,110"
                stroke="#38bdf8"
                strokeWidth="1.2"
                strokeDasharray="6 6"
                fill="none"
              />
              {/* Razor-sharp dead-center aim dot with dark contrast halo */}
              <circle cx="140" cy="110" r="3.4" fill="rgba(6, 10, 18, 0.85)" />
              <circle cx="140" cy="110" r="2.0" fill="#ff2a55" />
              <circle cx="140" cy="110" r="0.85" fill="#fff5f7" />
            </g>
          </svg>

          <div className="tempest-sight-hud-meta">
            <span>TEMPEST AEGIS</span>
            {typeof ammoCount === 'number' && (
              <span className="tempest-sight-ammo">{ammoCount}</span>
            )}
          </div>
        </div>
      </div>
    );
  }
);

TempestLmgSight.displayName = 'TempestLmgSight';
