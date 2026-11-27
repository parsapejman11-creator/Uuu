import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AppErrorBoundary, clearServiceWorkersAndCaches } from './components/AppErrorBoundary';
import './index.css';

const CHUNK_RECOVER_KEY = 'vanguard_chunk_recover_ts_v1';
const DEV_SW_PURGED_KEY = 'vanguard_dev_sw_purged_v1';

function canTriggerGuardedReload(key: string, cooldownMs = 30_000): boolean {
  try {
    const prev = Number(window.sessionStorage.getItem(key) || '0');
    const now = Date.now();
    if (Number.isFinite(prev) && prev > 0 && now - prev < cooldownMs) {
      return false;
    }
    window.sessionStorage.setItem(key, String(now));
    return true;
  } catch {
    return false;
  }
}

function recoverFromStaleChunk(): void {
  if (!canTriggerGuardedReload(CHUNK_RECOVER_KEY)) return;
  void clearServiceWorkersAndCaches().finally(() => {
    window.location.reload();
  });
}

if (typeof window !== 'undefined') {
  // In dev mode, actively purge any lingering Service Worker from previous builds/dev-dist
  if (import.meta.env.DEV && 'serviceWorker' in navigator) {
    const hadController = Boolean(navigator.serviceWorker.controller);
    void clearServiceWorkersAndCaches().then((cleared) => {
      if (hadController && cleared && canTriggerGuardedReload(DEV_SW_PURGED_KEY, 15_000)) {
        window.location.reload();
      }
    });
  }

  // Recover automatically if a cached index.html references an outdated JS/CSS chunk hash
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    recoverFromStaleChunk();
  });

  window.addEventListener('unhandledrejection', (event) => {
    const msg =
      event.reason instanceof Error
        ? event.reason.message
        : typeof event.reason === 'string'
          ? event.reason
          : '';
    if (
      /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i.test(
        msg
      )
    ) {
      recoverFromStaleChunk();
    }
  });
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
}
