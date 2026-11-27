import React, { useState } from 'react';
import { IconCheck, IconChevronDown, IconClose, IconInfo } from './icons';
import { tokenizeBidiText } from './bidiText';

export interface BidiTextProps {
  text: string;
  className?: string;
}

/**
 * Renders mixed Persian/English UI text with uniform Latin digits and `<bdi dir="ltr">`
 * isolation around English parentheticals (e.g. Desert Outpost, Duel Arena) and 1v1 / 2v2 tokens.
 */
export const BidiText: React.FC<BidiTextProps> = React.memo(({ text, className }) => {
  const segments = tokenizeBidiText(text);
  const content = segments.map((seg, idx) =>
    seg.dir === 'ltr' ? (
      <bdi
        key={idx}
        dir="ltr"
        className={seg.isParen ? 'uiv3-bidi-ltr uiv3-bidi-paren' : 'uiv3-bidi-ltr'}
      >
        {seg.text}
      </bdi>
    ) : (
      <React.Fragment key={idx}>{seg.text}</React.Fragment>
    )
  );
  return className ? <span className={className}>{content}</span> : <>{content}</>;
});

export interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  /** Only assign blurLayer (1..3) to top-level surfaces to strictly cap simultaneous blur layers at <= 3 */
  blurLayer?: 1 | 2 | 3;
  elevated?: boolean;
  padding?: 'none' | 'sm' | 'md';
  dir?: 'rtl' | 'ltr';
  'data-testid'?: string;
}

export const GlassCard: React.FC<GlassCardProps> = React.memo(
  ({ children, className = '', blurLayer, elevated = false, padding = 'md', dir = 'rtl', 'data-testid': testId }) => {
    const classes = [
      'uiv3-card',
      blurLayer ? `uiv3-blur-layer uiv3-blur-l${blurLayer}` : '',
      elevated ? 'is-elevated' : '',
      padding === 'none' ? 'pad-none' : padding === 'sm' ? 'pad-sm' : 'pad-md',
      className,
    ]
      .filter(Boolean)
      .join(' ');
    return (
      <div className={classes} dir={dir} data-testid={testId}>
        {children}
      </div>
    );
  }
);

export interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'subtle' | 'danger' | 'accent';
  shape?: 'capsule' | 'rounded';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  active?: boolean;
  block?: boolean;
}

export const GlassButton: React.FC<GlassButtonProps> = React.memo(
  ({
    children,
    className = '',
    variant = 'secondary',
    shape = 'capsule',
    size = 'md',
    icon,
    active = false,
    block = false,
    type = 'button',
    ...rest
  }) => {
    const classes = [
      'uiv3-btn',
      `uiv3-btn-${variant}`,
      shape === 'capsule' ? 'uiv3-shape-capsule' : 'uiv3-shape-rounded',
      `uiv3-btn-${size}`,
      active ? 'is-active' : '',
      block ? 'is-block' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');
    return (
      <button type={type} className={classes} {...rest}>
        {icon && <span className="uiv3-btn-icon">{icon}</span>}
        <span className="uiv3-btn-label">{children}</span>
      </button>
    );
  }
);

export interface GlassSwitchProps {
  id?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  badge?: string;
  disabled?: boolean;
  /** When true, hides long description behind a compact tap-to-reveal info icon */
  compactInfo?: boolean;
  /** Optional inline footer notice (e.g. auto-trigger explanation) */
  footerSlot?: React.ReactNode;
  'data-testid'?: string;
}

export const GlassSwitch: React.FC<GlassSwitchProps> = React.memo(
  ({
    id,
    checked,
    onChange,
    label,
    description,
    badge,
    disabled = false,
    compactInfo = false,
    footerSlot,
    'data-testid': testId,
  }) => {
    const [infoOpen, setInfoOpen] = useState(false);
    const showDescInline = Boolean(description && (!compactInfo || infoOpen));
    return (
      <div
        className={`uiv3-setting-row ${compactInfo ? 'is-compact-tile' : ''} ${footerSlot ? 'has-footer-slot' : ''} ${disabled ? 'is-disabled' : ''}`}
        dir="rtl"
      >
        <div className="uiv3-setting-row-main">
          <div className="uiv3-setting-copy">
            <div className="uiv3-setting-title-line">
              <label htmlFor={id} className="uiv3-setting-title">
                <BidiText text={label} />
              </label>
              {badge && <span className="uiv3-inline-badge">{badge}</span>}
              {description && compactInfo && (
                <button
                  type="button"
                  className={`uiv3-info-btn ${infoOpen ? 'is-open' : ''}`}
                  aria-label={`توضیح ${label}`}
                  aria-expanded={infoOpen}
                  title={description}
                  onClick={() => setInfoOpen((prev) => !prev)}
                >
                  <IconInfo size={12} />
                </button>
              )}
            </div>
            {showDescInline && (
              <div className="uiv3-setting-desc">
                <BidiText text={description!} />
              </div>
            )}
          </div>
          <button
            id={id}
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            data-testid={testId}
            className={`uiv3-switch ${checked ? 'is-on' : ''}`}
            onClick={() => onChange(!checked)}
          >
            <span className="uiv3-switch-thumb" />
          </button>
        </div>
        {footerSlot}
      </div>
    );
  }
);

export interface GlassSliderProps {
  id?: string;
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  valueLabel: string;
  onChange: (next: number) => void;
  disabled?: boolean;
  /** When true, hides description behind a compact tap-to-reveal info icon */
  compactInfo?: boolean;
  'data-testid'?: string;
}

export const GlassSlider: React.FC<GlassSliderProps> = React.memo(
  ({
    id,
    label,
    description,
    value,
    min,
    max,
    step,
    valueLabel,
    onChange,
    disabled = false,
    compactInfo = false,
    'data-testid': testId,
  }) => {
    const [infoOpen, setInfoOpen] = useState(false);
    const pct = Math.max(0, Math.min(100, ((value - min) / Math.max(0.0001, max - min)) * 100));
    const showDescInline = Boolean(description && (!compactInfo || infoOpen));
    return (
      <div className={`uiv3-slider-row ${compactInfo ? 'is-compact-tile' : ''} ${disabled ? 'is-disabled' : ''}`} dir="rtl">
        <div className="uiv3-slider-head">
          <div className="uiv3-setting-copy">
            <div className="uiv3-setting-title-line">
              <label htmlFor={id} className="uiv3-setting-title">
                <BidiText text={label} />
              </label>
              {description && compactInfo && (
                <button
                  type="button"
                  className={`uiv3-info-btn ${infoOpen ? 'is-open' : ''}`}
                  aria-label={`توضیح ${label}`}
                  aria-expanded={infoOpen}
                  title={description}
                  onClick={() => setInfoOpen((prev) => !prev)}
                >
                  <IconInfo size={12} />
                </button>
              )}
            </div>
            {showDescInline && (
              <div className="uiv3-setting-desc">
                <BidiText text={description!} />
              </div>
            )}
          </div>
          <span className="uiv3-value-pill" dir="ltr">
            {valueLabel}
          </span>
        </div>
        <div className="uiv3-slider-track-wrap" dir="ltr">
          <div className="uiv3-slider-fill" style={{ width: `${pct}%` }} />
          <input
            id={id}
            data-testid={testId}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            className="uiv3-range-input"
            onChange={(e) => onChange(parseFloat(e.target.value))}
          />
        </div>
      </div>
    );
  }
);

export interface GlassDisclosureProps {
  title: string;
  meta?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  'data-testid'?: string;
}

export const GlassDisclosure: React.FC<GlassDisclosureProps> = React.memo(
  ({ title, meta, defaultOpen = false, children, 'data-testid': testId }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
      <div className={`uiv3-disclosure ${open ? 'is-open' : ''}`} data-testid={testId} dir="rtl">
        <button
          type="button"
          className="uiv3-disclosure-trigger"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          <span className="uiv3-disclosure-title">
            <BidiText text={title} />
          </span>
          <span className="uiv3-disclosure-right">
            {meta && <span className="uiv3-disclosure-meta">{meta}</span>}
            <IconChevronDown size={14} className={`uiv3-disclosure-chev ${open ? 'is-open' : ''}`} />
          </span>
        </button>
        {open && <div className="uiv3-disclosure-body">{children}</div>}
      </div>
    );
  }
);

export interface GlassTabOption<T extends string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  testId?: string;
}

export interface GlassTabsProps<T extends string> {
  tabs: ReadonlyArray<GlassTabOption<T>>;
  activeId: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  compact?: boolean;
  className?: string;
}

function GlassTabsInner<T extends string>({
  tabs,
  activeId,
  onChange,
  ariaLabel,
  compact = false,
  className = '',
}: GlassTabsProps<T>) {
  return (
    <div
      className={`uiv3-tabs ${compact ? 'is-compact' : ''} ${className}`}
      role="tablist"
      aria-label={ariaLabel}
      dir="rtl"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-testid={tab.testId}
            className={`uiv3-tab-btn ${isActive ? 'is-active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon && <span className="uiv3-tab-icon">{tab.icon}</span>}
            <span>
              <BidiText text={tab.label} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

export const GlassTabs = React.memo(GlassTabsInner) as typeof GlassTabsInner;

export interface GlassModalProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeTitle?: string;
  onClose: () => void;
  closeLabel?: string;
  /** When set, renders a compact checkmark-confirm close button inside the slim header */
  confirmCloseLabel?: string;
  closeButtonId?: string;
  sheetClassName?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerExtra?: React.ReactNode;
  backdropSnapshotUrl?: string | null;
  'data-testid'?: string;
}

export const GlassModal: React.FC<GlassModalProps> = React.memo(
  ({
    title,
    subtitle,
    badge,
    badgeTitle,
    onClose,
    closeLabel = 'بستن',
    confirmCloseLabel,
    closeButtonId,
    sheetClassName = '',
    children,
    footer,
    headerExtra,
    'data-testid': testId,
  }) => {
    return (
      <div
        className="uiv3-modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid={testId}
        dir="rtl"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="uiv3-ambient-scrim" aria-hidden="true" />
        {/* Crisp translucent specular modal sheet without full-viewport backdrop-filter tiling */}
        <div className={`uiv3-modal-sheet ${sheetClassName}`}>
          <div className="uiv3-modal-glass-bg" aria-hidden="true" />
          <div className="uiv3-modal-content">
            <header className="uiv3-modal-header uiv3-slim-header">
              <div className="uiv3-modal-title-group">
                <div className="uiv3-modal-title-row">
                  <h2 className="uiv3-modal-title">{title}</h2>
                  {badge && (
                    <span className="uiv3-stage-pill" title={badgeTitle} data-testid="uiv3-settings-stage-badge">
                      {badge}
                    </span>
                  )}
                </div>
                {subtitle && <div className="uiv3-modal-subtitle">{subtitle}</div>}
              </div>
              <div className="uiv3-modal-header-actions">
                {headerExtra}
                {confirmCloseLabel ? (
                  <button
                    id={closeButtonId}
                    type="button"
                    className="uiv3-header-confirm-btn"
                    aria-label={confirmCloseLabel}
                    onClick={onClose}
                    data-testid="uiv3-modal-close-btn"
                  >
                    <IconCheck size={14} />
                    <span>{confirmCloseLabel}</span>
                  </button>
                ) : (
                  <button
                    id={closeButtonId}
                    type="button"
                    className="uiv3-icon-circle-btn"
                    aria-label={closeLabel}
                    onClick={onClose}
                    data-testid="uiv3-modal-close-btn"
                  >
                    <IconClose size={17} />
                  </button>
                )}
              </div>
            </header>
            <div className="uiv3-modal-body">{children}</div>
            {footer && <footer className="uiv3-modal-footer">{footer}</footer>}
          </div>
        </div>
      </div>
    );
  }
);

export interface GlassToastProps {
  message: string | null;
  tone?: 'info' | 'success' | 'warn';
}

export const GlassToast: React.FC<GlassToastProps> = React.memo(({ message, tone = 'info' }) => {
  if (!message) return null;
  return (
    <div
      className={`uiv3-toast uiv3-toast-${tone}`}
      role="status"
      aria-live="polite"
      data-testid="uiv3-toast"
      dir="rtl"
    >
      <span className="uiv3-toast-dot" aria-hidden="true" />
      <span>
        <BidiText text={message} />
      </span>
    </div>
  );
});
