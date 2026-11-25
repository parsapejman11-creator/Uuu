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
  strokeWidth: 1.85,
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
    <path d="M12 3a9 9 0 1 0 0 18h1.4a2.3 2.3 0 0 0 1.6-3.9 1.7 1.7 0 0 1 1.2-2.9H18a3 3 0 0 0 3-3A8.2 8.2 0 0 0 12 3z" />
    <circle cx="7.8" cy="10.2" r="1" fill="currentColor" stroke="none" />
    <circle cx="10.8" cy="7.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="15.2" cy="8.2" r="1" fill="currentColor" stroke="none" />
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

export const IconGlassLayers: React.FC<IconProps> = React.memo(({ size = 17, className }) => (
  <svg {...baseProps(size, className)}>
    <polygon points="12 3 21 8 12 13 3 8 12 3" />
    <polyline points="3 12.5 12 17.5 21 12.5" />
    <polyline points="3 16.5 12 21.5 21 16.5" />
  </svg>
));

export const IconCpu: React.FC<IconProps> = React.memo(({ size = 17, className }) => (
  <svg {...baseProps(size, className)}>
    <rect x="6" y="6" width="12" height="12" rx="2.5" />
    <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
    <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
  </svg>
));

export const IconGamepad: React.FC<IconProps> = React.memo(({ size = 17, className }) => (
  <svg {...baseProps(size, className)}>
    <rect x="3" y="7" width="18" height="10" rx="5" />
    <path d="M8 10v4M6 12h4" />
    <circle cx="15.5" cy="11" r="1" fill="currentColor" stroke="none" />
    <circle cx="17.5" cy="13" r="1" fill="currentColor" stroke="none" />
  </svg>
));

export const IconVolume: React.FC<IconProps> = React.memo(({ size = 17, className }) => (
  <svg {...baseProps(size, className)}>
    <polygon points="4 10 8.5 10 13 6 13 18 8.5 14 4 14 4 10" />
    <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
  </svg>
));

export const IconShield: React.FC<IconProps> = React.memo(({ size = 17, className }) => (
  <svg {...baseProps(size, className)}>
    <path d="M12 3l7 3v5.5c0 4.6-3 8.1-7 9.5-4-1.4-7-4.9-7-9.5V6l7-3z" />
  </svg>
));

export const IconWeapon: React.FC<IconProps> = React.memo(({ size = 17, className }) => (
  <svg {...baseProps(size, className)}>
    <path d="M3 10h13l3-2v4l-3-1h-3l1 5h-2.5l-1.5-5H7l-2 3H3v-4z" />
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
