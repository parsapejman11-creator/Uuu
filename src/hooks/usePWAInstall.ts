import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    try {
      if (typeof window === 'undefined') return false;
      const standaloneMatch =
        window.matchMedia?.('(display-mode: standalone)').matches ||
        window.matchMedia?.('(display-mode: fullscreen)').matches;
      const iosStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
      return Boolean(standaloneMatch || iosStandalone);
    } catch {
      return false;
    }
  });

  const [isIOS] = useState<boolean>(() => {
    try {
      if (typeof navigator === 'undefined') return false;
      const ua = navigator.userAgent;
      return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    let mqlStandalone: MediaQueryList | null = null;
    let mqlFullscreen: MediaQueryList | null = null;
    const handleDisplayChange = () => {
      if (mqlStandalone?.matches || mqlFullscreen?.matches) {
        setIsInstalled(true);
      }
    };
    try {
      mqlStandalone = window.matchMedia('(display-mode: standalone)');
      mqlFullscreen = window.matchMedia('(display-mode: fullscreen)');
      mqlStandalone.addEventListener?.('change', handleDisplayChange);
      mqlFullscreen.addEventListener?.('change', handleDisplayChange);
    } catch {
      // Unsupported browser: degrade gracefully
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mqlStandalone?.removeEventListener?.('change', handleDisplayChange);
      mqlFullscreen?.removeEventListener?.('change', handleDisplayChange);
    };
  }, []);

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) return 'unavailable';
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
      return outcome;
    } catch {
      return 'unavailable';
    }
  }, [deferredPrompt]);

  const canInstall = !isInstalled && (deferredPrompt !== null || isIOS);

  return {
    canInstall,
    hasNativePrompt: deferredPrompt !== null,
    isInstalled,
    isIOS,
    install,
  };
}
