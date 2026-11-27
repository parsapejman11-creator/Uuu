/**
 * Tactile UI click sound & optional haptic feedback (shared across Legacy & Liquid Glass UIs).
 * Respects master soundEnabled, vibrationEnabled, reducedMotion, and UI feedback toggles.
 */

export type UiFeedbackKind = 'tap' | 'primary' | 'toggle' | 'back';

let sharedUiAudioCtx: AudioContext | null = null;

function getUiAudioContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    if (sharedUiAudioCtx) {
      if (sharedUiAudioCtx.state === 'suspended') {
        void sharedUiAudioCtx.resume().catch(() => {});
      }
      return sharedUiAudioCtx;
    }
    const Ctor =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    sharedUiAudioCtx = new Ctor();
    return sharedUiAudioCtx;
  } catch {
    return null;
  }
}

export function playUiClickSound(kind: UiFeedbackKind = 'tap'): void {
  const ctx = getUiAudioContext();
  if (!ctx || ctx.state !== 'running') return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = kind === 'primary' ? 'triangle' : 'sine';

    const startHz = kind === 'primary' ? 760 : kind === 'toggle' ? 680 : kind === 'back' ? 480 : 620;
    const endHz = kind === 'primary' ? 420 : kind === 'back' ? 290 : 340;
    const dur = kind === 'primary' ? 0.032 : 0.022;
    const peakGain = kind === 'primary' ? 0.042 : 0.028;

    osc.frequency.setValueAtTime(startHz, now);
    osc.frequency.exponentialRampToValueAtTime(endHz, now + dur);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.006);
  } catch {
    // Ignore AudioContext gesture restrictions
  }
}

export function triggerUiHaptic(kind: UiFeedbackKind = 'tap'): void {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    const ms = kind === 'primary' ? 12 : kind === 'toggle' ? 9 : 6;
    navigator.vibrate(ms);
  } catch {
    // Ignore browser/device restrictions
  }
}

export interface UiFeedbackOptions {
  soundEnabled: boolean;
  uiClickSound: boolean;
  vibrationEnabled: boolean;
  uiHaptics: boolean;
  reducedMotion: boolean;
}

export function triggerUiFeedback(kind: UiFeedbackKind, opts: UiFeedbackOptions): void {
  if (opts.soundEnabled && opts.uiClickSound) {
    playUiClickSound(kind);
  }
  if (!opts.reducedMotion && opts.vibrationEnabled && opts.uiHaptics) {
    triggerUiHaptic(kind);
  }
}
