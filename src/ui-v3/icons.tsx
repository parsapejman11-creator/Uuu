import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

const baseProps = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className,
  'aria-hidden': true as const,
});

export const IconPlay: React.FC<IconProps> = React.memo(({ size = 18, className }) => (
  <svg {...baseProps(size, className)}>
    <polygon points="7 5 19 12 7 19 7 5" fill="currentColor" stroke="none" />
  </svg>
));

export const IconGlobe: React.FC<IconProps> = React.memo(({ size = 18, className }) => (
  <svg {...baseProps(size, className)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3.6 9h16.8M3.6 15h16.8" />
    <path d="M12 3a13.5 13.5 0 0 1 0 18M12 3a13.5 13.5 0 0 0 0 18" />
  </svg>
));

export const IconTarget: React.FC<IconProps> = React.memo(({ size = 18, className }) => (
  <svg {...baseProps(size, className)}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </svg>
));

export const IconSparkles: React.FC<IconProps> = React.memo(({ size = 18, className }) => (
  <svg {...baseProps(size, className)}>
    <path d="M12 3l1.7 4.7L18.5 9.5l-4.8 1.8L12 16l-1.7-4.7-4.8-1.8 4.8-1.8L12 3z" />
    <path d="M19 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8z" />
  </svg>
));

export const IconPalette: React.FC<IconProps> = React.memo(({ size = 18, className }) => (
  <svg {...baseProps(size, className)}>
    <path d="M12 3a9 9 0 1 0 0 18h1.5a2.25 2.25 0 0 0 1.6-3.85 1.65 1.65 0 0 1 1.18-2.8H18a3 3 0 0 0 3-3A8.35 8.35 0 0 0 12 3z" />
    <circle cx="7.8" cy="10.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="10.8" cy="7.4" r="1" fill="currentColor" stroke="none" />
    <circle cx="15.1" cy="8.1" r="1" fill="currentColor" stroke="none" />
  </svg>
));

export const IconSliders: React.FC<IconProps> = React.memo(({ size = 18, className }) => (
  <svg {...baseProps(size, className)}>
    <line x1="4" y1="7" x2="20" y2="7" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="17" x2="20" y2="17" />
    <circle cx="9" cy="7" r="2" fill="currentColor" />
    <circle cx="15" cy="12" r="2" fill="currentColor" />
    <circle cx="10" cy="17" r="2" fill="currentColor" />
  </svg>
));

export const IconFullscreen: React.FC<IconProps> = React.memo(({ size = 17, className }) => (
  <svg {...baseProps(size, className)}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </svg>
));

export const IconClose: React.FC<IconProps> = React.memo(({ size = 18, className }) => (
  <svg {...baseProps(size, className)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
));

/** Appearance / UI theme icon — clean dual layered glass panels */
export const IconGlassLayers: React.FC<IconProps> = React.memo(({ size = 18, className }) => (
  <svg {...baseProps(size, className)}>
    <rect x="4" y="4" width="11" height="11" rx="2.5" />
    <path d="M15 9h2.5A2.5 2.5 0 0 1 20 11.5v6A2.5 2.5 0 0 1 17.5 20h-6A2.5 2.5 0 0 1 9 17.5V15" />
  </svg>
));

/** Graphics / Display quality icon — clean monitor screen with frame stand */
export const IconCpu: React.FC<IconProps> = React.memo(({ size = 18, className }) => (
  <svg {...baseProps(size, className)}>
    <rect x="3" y="4" width="18" height="12" rx="2.5" />
    <path d="M8.5 20h7M12 16v4" />
    <path d="M7.5 11.5 10 9l2.2 2 3.8-4" />
  </svg>
));

/** Controls / Touch & Gamepad icon — balanced ergonomic controller silhouette */
export const IconGamepad: React.FC<IconProps> = React.memo(({ size = 18, className }) => (
  <svg {...baseProps(size, className)}>
    <path d="M6.5 7.5h11a4 4 0 0 1 3.9 4.8l-.6 2.8a2.7 2.7 0 0 1-4.6 1.3L14.5 14.8h-5L7.8 16.4a2.7 2.7 0 0 1-4.6-1.3l-.6-2.8A4 4 0 0 1 6.5 7.5z" />
    <path d="M7.5 10.2v3M6 11.7h3" />
    <circle cx="15.6" cy="10.7" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="17.6" cy="12.3" r="0.9" fill="currentColor" stroke="none" />
  </svg>
));

/** Audio & Online icon — clean speaker with two acoustic waves */
export const IconVolume: React.FC<IconProps> = React.memo(({ size = 18, className }) => (
  <svg {...baseProps(size, className)}>
    <path d="M4 9.8h3.8L12.5 6v12l-4.7-3.8H4a1 1 0 0 1-1-1v-2.4a1 1 0 0 1 1-1z" />
    <path d="M16 9.2a4.2 4.2 0 0 1 0 5.6" />
    <path d="M18.8 6.8a7.6 7.6 0 0 1 0 10.4" />
  </svg>
));

/** Cheats & Reset / Protected Settings icon — shield with crisp lock keyhole */
export const IconShield: React.FC<IconProps> = React.memo(({ size = 18, className }) => (
  <svg {...baseProps(size, className)}>
    <path d="M12 3l7 2.8v5.4c0 4.5-3 8-7 9.8-4-1.8-7-5.3-7-9.8V5.8L12 3z" />
    <circle cx="12" cy="10.6" r="1.4" />
    <path d="M12 12v2.6" />
  </svg>
));

/** Weapons & Map icon — crisp tactical scope crosshair */
export const IconWeapon: React.FC<IconProps> = React.memo(({ size = 18, className }) => (
  <svg {...baseProps(size, className)}>
    <circle cx="12" cy="12" r="6.5" />
    <path d="M12 2.8v3.2M12 18v3.2M2.8 12h3.2M18 12h3.2" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </svg>
));

export const IconHistory: React.FC<IconProps> = React.memo(({ size = 16, className }) => (
  <svg {...baseProps(size, className)}>
    <path d="M4 12a8 8 0 1 0 2.3-5.6L4 8.7" />
    <polyline points="4 4.5 4 8.7 8.2 8.7" />
    <polyline points="12 7.5 12 12 15 13.5" />
  </svg>
));

export const IconRotatePhone: React.FC<IconProps> = React.memo(({ size = 44, className }) => (
  <svg {...baseProps(size, className)}>
    <rect x="6" y="3" width="10" height="16" rx="2.5" />
    <line x1="10" y1="16.2" x2="12" y2="16.2" />
    <path d="M19 10a6 6 0 0 1-1.6 8.2" />
    <polyline points="16.5 19.2 19.6 18.8 19.2 15.8" />
  </svg>
));

export const IconCheck: React.FC<IconProps> = React.memo(({ size = 14, className }) => (
  <svg {...baseProps(size, className)}>
    <polyline points="5 12.5 10 17.5 19 7" />
  </svg>
));

export const IconInfo: React.FC<IconProps> = React.memo(({ size = 13, className }) => (
  <svg {...baseProps(size, className)}>
    <circle cx="12" cy="12" r="9.5" />
    <line x1="12" y1="11" x2="12" y2="16" />
    <circle cx="12" cy="7.6" r="0.9" fill="currentColor" stroke="none" />
  </svg>
));

export const IconReset: React.FC<IconProps> = React.memo(({ size = 14, className }) => (
  <svg {...baseProps(size, className)}>
    <path d="M4 12a8 8 0 1 0 2.3-5.6L4 8.7" />
    <polyline points="4 4.5 4 8.7 8.2 8.7" />
  </svg>
));

export const IconChevronDown: React.FC<IconProps> = React.memo(({ size = 14, className }) => (
  <svg {...baseProps(size, className)}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
));

export const IconCameraMark: React.FC<IconProps> = React.memo(({ size = 24, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 36 36"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <rect
      x="3"
      y="7"
      width="30"
      height="22"
      rx="7"
      fill="rgba(255,255,255,0.12)"
      stroke="rgba(255,255,255,0.45)"
      strokeWidth="1.5"
    />
    <circle cx="18" cy="18" r="6.8" fill="rgba(7,12,24,0.75)" stroke="rgba(255,255,255,0.8)" strokeWidth="1.4" />
    <circle cx="18" cy="18" r="2.6" fill="#5ac8fa" />
    <circle cx="27" cy="12" r="1.8" fill="#ff453a" />
  </svg>
));
