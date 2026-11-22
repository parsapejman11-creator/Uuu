import React from 'react';

interface VoidSniperScopeProps {
  /** Simplified mode for Reduced Motion or Low/Potato graphics quality */
  simplified?: boolean;
  /** Compact inline preview mode inside Spin / Collection modal */
  previewMode?: boolean;
  /** Optional close handler when rendered in interactive preview mode */
  onClosePreview?: () => void;
}

/**
 * Modern Sci-Fi Holographic Scope Overlay for AWM "Void Piercer"
 * - 100% cosmetic overlay (zero extra camera / zero render target / zero gameplay advantage).
 * - Identical FOV, zoom, sensitivity, and breathing sway as default AWM.
 * - Purely decorative holographic optics: soft iridescent glass sheen, animated zoom ring arcs,
 *   subtle scanlines, smooth opening aperture blink, and crisp holographic precision reticle.
 */
export const VoidSniperScope: React.FC<VoidSniperScopeProps> = ({
  simplified = false,
  previewMode = false,
  onClosePreview,
}) => {
  return (
    <div
      id={previewMode ? undefined : 'void-sniper-scope-overlay'}
      className={`void-scope-root${simplified ? ' is-simplified' : ''}${previewMode ? ' is-preview' : ''}`}
      data-testid={previewMode ? 'void-scope-preview-overlay' : 'void-sniper-scope-overlay'}
      aria-hidden={!previewMode}
    >
      {previewMode && onClosePreview && (
        <button
          type="button"
          className="void-scope-preview-close"
          data-testid="btn-close-void-scope-preview"
          onClick={onClosePreview}
        >
          ✕ بستن اسکوپ
        </button>
      )}
      {/* Subtle holographic iris/opening blink layer */}
      {!simplified && <div className="void-scope-entry-blink" />}

      {/* Soft iridescent optical glass sheen around lens perimeter */}
      <div className="void-scope-iridescent-ring" />

      {/* Subtle decorative horizontal scanlines (omitted in simplified/low-quality mode) */}
      {!simplified && <div className="void-scope-scanlines" />}

      {/* Crisp Holographic Reticle & Decorative Animated Bezel SVG */}
      <svg className="void-scope-svg" viewBox="0 0 440 440" fill="none">
        <defs>
          <linearGradient id="voidHoloCyanViolet" x1="0" y1="0" x2="440" y2="440" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.92" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.88" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.92" />
          </linearGradient>
          <radialGradient id="voidGlassGlint" cx="35%" cy="28%" r="65%">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.08" />
            <stop offset="55%" stopColor="#a855f7" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Faint iridescent interior glass reflection */}
        <circle cx="220" cy="220" r="204" fill="url(#voidGlassGlint)" />

        {/* Sleek outer thin bezel ring */}
        <circle cx="220" cy="220" r="206" stroke="url(#voidHoloCyanViolet)" strokeWidth="2.2" opacity="0.88" />
        <circle cx="220" cy="220" r="196" stroke="rgba(165, 243, 252, 0.24)" strokeWidth="1" />

        {/* Animated decorative zoom-ring arc assembly (outer rotating holographic brackets) */}
        <g className="void-scope-zoom-ring-outer">
          <path
            d="M 220 22 A 198 198 0 0 1 360 80"
            stroke="#22d3ee"
            strokeWidth="2.4"
            strokeLinecap="round"
            opacity="0.72"
          />
          <path
            d="M 220 418 A 198 198 0 0 1 80 360"
            stroke="#a855f7"
            strokeWidth="2.4"
            strokeLinecap="round"
            opacity="0.72"
          />
          <path
            d="M 402 145 A 198 198 0 0 1 402 295"
            stroke="rgba(165, 243, 252, 0.36)"
            strokeWidth="1.2"
            strokeDasharray="6 8"
          />
          <path
            d="M 38 295 A 198 198 0 0 1 38 145"
            stroke="rgba(192, 132, 252, 0.36)"
            strokeWidth="1.2"
            strokeDasharray="6 8"
          />
        </g>

        {/* Counter-rotating subtle inner telemetry tick ring (purely decorative) */}
        <g className="void-scope-zoom-ring-inner">
          <circle
            cx="220"
            cy="220"
            r="158"
            stroke="rgba(103, 232, 249, 0.22)"
            strokeWidth="1"
            strokeDasharray="2 12"
          />
          <path d="M 140 84 A 158 158 0 0 1 300 84" stroke="rgba(34, 211, 238, 0.42)" strokeWidth="1.4" />
          <path d="M 300 356 A 158 158 0 0 1 140 356" stroke="rgba(168, 85, 247, 0.42)" strokeWidth="1.4" />
        </g>

        {/* Decorative angled corner aperture brackets */}
        <path d="M 88 124 L 74 110 L 94 90" stroke="rgba(103, 232, 249, 0.5)" strokeWidth="1.4" />
        <path d="M 352 124 L 366 110 L 346 90" stroke="rgba(192, 132, 252, 0.5)" strokeWidth="1.4" />
        <path d="M 88 316 L 74 330 L 94 350" stroke="rgba(192, 132, 252, 0.5)" strokeWidth="1.4" />
        <path d="M 352 316 L 366 330 L 346 350" stroke="rgba(103, 232, 249, 0.5)" strokeWidth="1.4" />

        {/* Outer dark stadia bars (same visual framing as standard AWM) */}
        <line x1="16" y1="220" x2="128" y2="220" stroke="rgba(10, 16, 30, 0.88)" strokeWidth="2.8" />
        <line x1="312" y1="220" x2="424" y2="220" stroke="rgba(10, 16, 30, 0.88)" strokeWidth="2.8" />
        <line x1="220" y1="16" x2="220" y2="128" stroke="rgba(10, 16, 30, 0.88)" strokeWidth="2.8" />
        <line x1="220" y1="312" x2="220" y2="424" stroke="rgba(10, 16, 30, 0.88)" strokeWidth="2.8" />

        {/* Glowing cyan-violet edge lines along outer stadia */}
        <line x1="26" y1="220" x2="128" y2="220" stroke="rgba(34, 211, 238, 0.6)" strokeWidth="1.1" />
        <line x1="312" y1="220" x2="414" y2="220" stroke="rgba(34, 211, 238, 0.6)" strokeWidth="1.1" />
        <line x1="220" y1="26" x2="220" y2="128" stroke="rgba(168, 85, 247, 0.58)" strokeWidth="1.1" />
        <line x1="220" y1="312" x2="220" y2="414" stroke="rgba(168, 85, 247, 0.58)" strokeWidth="1.1" />

        {/* Fine holographic graduated crosshairs around central zone */}
        <line x1="128" y1="220" x2="206" y2="220" stroke="rgba(224, 242, 254, 0.86)" strokeWidth="1" />
        <line x1="234" y1="220" x2="312" y2="220" stroke="rgba(224, 242, 254, 0.86)" strokeWidth="1" />
        <line x1="220" y1="128" x2="220" y2="206" stroke="rgba(224, 242, 254, 0.86)" strokeWidth="1" />
        <line x1="220" y1="234" x2="220" y2="312" stroke="rgba(224, 242, 254, 0.86)" strokeWidth="1" />

        {/* Graduated mil ticks */}
        {[-72, -52, -32, 32, 52, 72].map((offset) => (
          <g key={offset}>
            <line
              x1={220 + offset}
              y1="216.5"
              x2={220 + offset}
              y2="223.5"
              stroke="rgba(103, 232, 249, 0.88)"
              strokeWidth="1.15"
            />
            <line
              x1="216.5"
              y1={220 + offset}
              x2="223.5"
              y2={220 + offset}
              stroke="rgba(192, 132, 252, 0.84)"
              strokeWidth="1.15"
            />
          </g>
        ))}

        {/* Central thin holographic precision ring + gentle pulsing center dot */}
        <g className="void-scope-center-pulse">
          <circle cx="220" cy="220" r="14" stroke="url(#voidHoloCyanViolet)" strokeWidth="1.35" opacity="0.92" />
          <circle cx="220" cy="220" r="24" stroke="rgba(103, 232, 249, 0.25)" strokeWidth="0.9" strokeDasharray="3 5" />
          <circle cx="220" cy="220" r="2.2" fill="#67e8f9" />
          <circle cx="220" cy="220" r="1.1" fill="#ffffff" />
        </g>
      </svg>
    </div>
  );
};
