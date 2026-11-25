import React from 'react';

/**
 * Rebuilt Mythic SPAS-12 "Eclipse Breacher" Holographic Reflex ADS Sight.
 *
 * Design & Engineering Guarantees:
 * - Strictly SINGLE sight: rendered dead-center (50% / 50%) while the 3D top-rail
 *   optic and hipfire crosshair are hidden by `resolveActiveSightMode`.
 * - Zero muddy background fill or dark vignette obscuring the target.
 * - Zero FOV change, zero ADS sensitivity change, zero second camera, zero backdrop-filter.
 * - Clean Reduced Motion / Low-Quality fallback (`simplified = true`).
 */

export interface EclipseShotgunSightProps {
  /** True under Reduced Motion or Low/Potato graphics preset */
  simplified?: boolean;
  /** Compact inline mode inside the 3D Spin/Skins preview stage */
  previewMode?: boolean;
  /** Live ammo readout (optional subtle tag below ring) */
  magLabel?: string;
}

export const EclipseShotgunSight: React.FC<EclipseShotgunSightProps> = ({
  simplified = false,
  previewMode = false,
  magLabel,
}) => {
  return (
    <div
      id={previewMode ? undefined : 'eclipse-shotgun-sight-overlay'}
      data-testid={previewMode ? 'eclipse-sight-preview' : 'eclipse-shotgun-sight-overlay'}
      className={`eclipse-sight-overlay${previewMode ? ' is-preview' : ''}${simplified ? ' is-simplified' : ''}`}
      aria-hidden="true"
    >
      <div className="eclipse-sight-ring-shell">
        <svg
          className="eclipse-sight-svg"
          viewBox="0 0 240 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="eclipseReflexGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#fffbeb" />
            </linearGradient>
          </defs>

          {/* Subtle dark contrast hairline behind outer housing ring (keeps bright/sky backgrounds crisp) */}
          <circle
            cx="120"
            cy="120"
            r="84"
            stroke="rgba(6, 8, 14, 0.55)"
            strokeWidth="3.6"
          />

          {/* Primary golden holographic reflex ring (fully transparent interior — zero haze) */}
          <circle
            cx="120"
            cy="120"
            r="84"
            stroke="url(#eclipseReflexGold)"
            strokeWidth="1.6"
            strokeOpacity="0.9"
          />

          {/* Fine segmented orbital ring (rotates gently when full motion enabled) */}
          <circle
            cx="120"
            cy="120"
            r="76"
            stroke="rgba(253, 224, 71, 0.34)"
            strokeWidth="0.9"
            strokeDasharray="10 14"
            className="eclipse-sight-orbit"
          />

          {/* Four clean shotgun pellet-spread reference arcs */}
          <path
            d="M 94 64 A 62 62 0 0 1 146 64"
            stroke="#fbbf24"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeOpacity="0.82"
          />
          <path
            d="M 94 176 A 62 62 0 0 0 146 176"
            stroke="#fbbf24"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeOpacity="0.82"
          />
          <path
            d="M 64 94 A 62 62 0 0 0 64 146"
            stroke="#fde047"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeOpacity="0.86"
          />
          <path
            d="M 176 94 A 62 62 0 0 1 176 146"
            stroke="#fde047"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeOpacity="0.86"
          />

          {/* Precision cardinal alignment ticks (outside the center sightline) */}
          <line x1="120" y1="24" x2="120" y2="38" stroke="#fef08a" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="120" y1="202" x2="120" y2="216" stroke="#fef08a" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="24" y1="120" x2="38" y2="120" stroke="#fef08a" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="202" y1="120" x2="216" y2="120" stroke="#fef08a" strokeWidth="1.6" strokeLinecap="round" />

          {/* Razor-sharp dead-center Eclipse (ماه‌گرفتگی) Reticle */}
          <g className="eclipse-reticle-core">
            {/* Dark contrast halo for instant visibility on bright daylight maps */}
            <circle
              cx="120"
              cy="120"
              r="11.5"
              stroke="rgba(6, 8, 14, 0.55)"
              strokeWidth="2.8"
            />
            {/* Thin golden corona ring */}
            <circle
              cx="120"
              cy="120"
              r="11.5"
              stroke="#fde047"
              strokeWidth="1.35"
              strokeOpacity="0.94"
            />
            {/* Bright solar eclipse crescent flare (asymmetric gold-white highlight) */}
            <path
              d="M 111 112.5 A 12 12 0 0 1 128.5 127.5"
              stroke="#fffbeb"
              strokeWidth="2.1"
              strokeLinecap="round"
            />
            {/* Pinpoint dead-center aiming dot with dark outline (unobstructed target view) */}
            <circle cx="120" cy="120" r="2.6" fill="rgba(6, 8, 14, 0.65)" />
            <circle cx="120" cy="120" r="1.75" fill="#fffbeb" />
          </g>
        </svg>

        {magLabel && (
          <div className="eclipse-sight-hud-meta" dir="ltr">
            <span className="eclipse-sight-mag">{magLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
};
