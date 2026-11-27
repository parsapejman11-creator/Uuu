import React, { lazy } from 'react';

export type PreloadableComponent<T extends React.ComponentType<any>> = React.FC<
  React.ComponentProps<T>
> & {
  preload: () => Promise<void>;
};

/**
 * Code-split lazy component wrapper with synchronous fast-path once preloaded.
 *
 * Plain `React.lazy()` throws a resolved Promise on first mount even when the
 * module was already prefetched, triggering React Suspense's ~300ms fallback
 * debounce delay. `lazyWithPreload` keeps the chunk split cleanly while letting
 * idle-prefetched modals mount synchronously in <50ms with zero Suspense delay.
 */
export function lazyWithPreload<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): PreloadableComponent<T> {
  let Loaded: T | null = null;
  let pending: Promise<void> | null = null;

  const load = (): Promise<void> => {
    if (Loaded) return Promise.resolve();
    if (!pending) {
      pending = factory().then((mod) => {
        Loaded = mod.default;
      });
    }
    return pending;
  };

  const LazyInner = lazy(() =>
    load().then(() => ({
      default: Loaded as T,
    }))
  );

  const Wrapper: React.FC<React.ComponentProps<T>> & {
    preload?: () => Promise<void>;
  } = (props) => {
    if (Loaded) {
      const SyncComp = Loaded;
      return <SyncComp {...props} />;
    }
    return <LazyInner {...(props as any)} />;
  };

  Wrapper.preload = load;
  return Wrapper as PreloadableComponent<T>;
}
