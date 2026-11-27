/**
 * Lightweight, pure performance utilities for modal responsiveness, idle chunk prefetching,
 * debounced storage persistence, and debounced resize/viewport handlers.
 *
 * ZERO React imports, ZERO game logic.
 */

export interface DebouncedFn<TArgs extends unknown[]> {
  (...args: TArgs): void;
  cancel: () => void;
  flush: () => void;
}

export function createDebouncedCallback<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  delayMs: number
): DebouncedFn<TArgs> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: TArgs | null = null;

  const invoke = () => {
    timer = null;
    if (lastArgs !== null) {
      const args = lastArgs;
      lastArgs = null;
      fn(...args);
    }
  };

  const debounced = ((...args: TArgs) => {
    lastArgs = args;
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(invoke, Math.max(0, delayMs));
  }) as DebouncedFn<TArgs>;

  debounced.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    lastArgs = null;
  };

  debounced.flush = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (lastArgs !== null) {
      const args = lastArgs;
      lastArgs = null;
      fn(...args);
    }
  };

  return debounced;
}

export interface StorageLike {
  setItem: (key: string, value: string) => void;
}

export interface DebouncedStorageWriter {
  setItem: (key: string, value: string) => void;
  flush: () => void;
  pendingCount: () => number;
  dispose: () => void;
}

/**
 * Coalesces rapid localStorage writes (e.g., slider drags or rapid setting toggles)
 * into a single trailing flush after `delayMs`, while guaranteeing flush on pagehide/beforeunload.
 */
export function createDebouncedStorageWriter(
  delayMs = 200,
  storageProvider?: () => StorageLike | null
): DebouncedStorageWriter {
  const pending = new Map<string, string>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const getStore = (): StorageLike | null => {
    if (storageProvider) return storageProvider();
    try {
      return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
    } catch {
      return null;
    }
  };

  const flush = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (pending.size === 0) return;
    const store = getStore();
    if (!store) {
      pending.clear();
      return;
    }
    for (const [k, v] of pending.entries()) {
      try {
        store.setItem(k, v);
      } catch {
        // Ignore storage quota / private mode errors
      }
    }
    pending.clear();
  };

  const onVisibilityChange = () => {
    if (typeof document !== 'undefined' && document.hidden) {
      flush();
    }
  };

  let attachedWindowListeners = false;
  if (!storageProvider && typeof window !== 'undefined') {
    attachedWindowListeners = true;
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }
  }

  return {
    setItem(key: string, value: string) {
      pending.set(key, value);
      if (timer !== null) {
        clearTimeout(timer);
      }
      timer = setTimeout(flush, Math.max(0, delayMs));
    },
    flush,
    pendingCount() {
      return pending.size;
    },
    dispose() {
      flush();
      if (attachedWindowListeners && typeof window !== 'undefined') {
        window.removeEventListener('pagehide', flush);
        window.removeEventListener('beforeunload', flush);
        if (typeof document !== 'undefined') {
          document.removeEventListener('visibilitychange', onVisibilityChange);
        }
        attachedWindowListeners = false;
      }
    },
  };
}

/** Shared app-wide debounced writer for frequent settings writes */
export const debouncedSettingsStorage: DebouncedStorageWriter = createDebouncedStorageWriter(220);

export type IdleChunkLoader = () => Promise<unknown>;

export interface IdlePrefetchOptions {
  initialDelayMs?: number;
  stepDelayMs?: number;
  idleTimeoutMs?: number;
  shouldContinue?: () => boolean;
}

/**
 * Sequentially prefetches lazy UI chunks during browser idle windows (requestIdleCallback
 * with setTimeout fallback), yielding between chunks so boot and gameplay FPS stay unaffected.
 */
export function scheduleIdlePrefetch(
  loaders: ReadonlyArray<IdleChunkLoader>,
  options: IdlePrefetchOptions = {}
): () => void {
  const {
    initialDelayMs = 220,
    stepDelayMs = 60,
    idleTimeoutMs = 1500,
    shouldContinue = () => true,
  } = options;

  let cancelled = false;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let idleId: number | null = null;
  let index = 0;

  const win = typeof window !== 'undefined' ? (window as unknown as {
    requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  }) : null;

  const scheduleNext = (delay: number) => {
    if (cancelled || index >= loaders.length) return;
    timerId = setTimeout(() => {
      timerId = null;
      if (cancelled || index >= loaders.length) return;
      if (!shouldContinue()) {
        // Retry once user returns to an idle menu state
        scheduleNext(800);
        return;
      }
      const runLoader = () => {
        idleId = null;
        if (cancelled || index >= loaders.length) return;
        if (!shouldContinue()) {
          scheduleNext(800);
          return;
        }
        const loader = loaders[index++];
        Promise.resolve()
          .then(() => loader())
          .catch(() => {
            // Prefetch failures are non-fatal; React.lazy will retry on demand
          })
          .finally(() => {
            if (!cancelled && index < loaders.length) {
              scheduleNext(stepDelayMs);
            }
          });
      };

      if (win && typeof win.requestIdleCallback === 'function') {
        idleId = win.requestIdleCallback(runLoader, { timeout: idleTimeoutMs });
      } else {
        runLoader();
      }
    }, Math.max(0, delay));
  };

  scheduleNext(initialDelayMs);

  return () => {
    cancelled = true;
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    if (idleId !== null && win && typeof win.cancelIdleCallback === 'function') {
      win.cancelIdleCallback(idleId);
      idleId = null;
    }
  };
}

/**
 * Lightweight performance.mark / performance.measure helper for modal open latency auditing.
 */
export function markModalOpenStart(modalKey: string): void {
  try {
    if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
      performance.mark(`modal-open-start:${modalKey}`);
    }
  } catch {
    // ignore
  }
}

export function measureModalOpenPaint(modalKey: string): void {
  try {
    if (
      typeof performance !== 'undefined' &&
      typeof performance.mark === 'function' &&
      typeof performance.measure === 'function'
    ) {
      const startMark = `modal-open-start:${modalKey}`;
      const endMark = `modal-open-paint:${modalKey}`;
      performance.mark(endMark);
      if (performance.getEntriesByName(startMark).length > 0) {
        performance.measure(`modal-open:${modalKey}`, startMark, endMark);
      }
    }
  } catch {
    // ignore
  }
}
