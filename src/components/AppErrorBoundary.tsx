import React from 'react';

export async function clearServiceWorkersAndCaches(): Promise<boolean> {
  let cleared = false;
  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        const unregistered = await reg.unregister();
        if (unregistered) cleared = true;
      }
    }
  } catch {
    // Ignore SW unregister errors on restricted origins
  }
  try {
    if (typeof window !== 'undefined' && 'caches' in window && window.caches) {
      const keys = await window.caches.keys();
      await Promise.all(
        keys.map(async (key) => {
          const deleted = await window.caches.delete(key);
          if (deleted) cleared = true;
        })
      );
    }
  } catch {
    // Ignore CacheStorage errors in private/restricted browsers
  }
  return cleared;
}

export async function hardResetAndReload(): Promise<void> {
  await clearServiceWorkersAndCaches();
  try {
    window.location.reload();
  } catch {
    // Fallback navigation reload
    window.location.href = window.location.href;
  }
}

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    const message =
      error instanceof Error
        ? error.message || error.name
        : typeof error === 'string'
          ? error
          : 'خطای غیرمنتظره هنگام اجرای برنامه';
    return {
      hasError: true,
      errorMessage: message.slice(0, 220),
    };
  }

  componentDidCatch(error: unknown): void {
    // Keep lightweight console error for developer diagnostics without crashing recovery UI
    if (typeof console !== 'undefined' && console.error) {
      console.error('[AppErrorBoundary]', error);
    }
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  private handleHardReload = (): void => {
    void hardResetAndReload();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        dir="rtl"
        data-testid="app-error-boundary"
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#070b12] p-4 text-slate-100"
      >
        <div className="w-full max-w-md rounded-xl border border-slate-700/80 bg-[#0d1422] p-5 shadow-2xl">
          <div className="mb-1 text-xs font-semibold tracking-widest text-amber-400/90" dir="ltr">
            BODYCAM VANGUARD
          </div>
          <h1 className="mb-2 text-lg font-bold text-white">خطا در بارگذاری برنامه</h1>
          <p className="mb-3 text-sm leading-relaxed text-slate-300">
            برنامه هنگام اجرا با مشکل مواجه شد. اگر کش مرورگر قدیمی باشد، پاکسازی کش مشکل را برطرف می‌کند.
          </p>
          {this.state.errorMessage && (
            <div
              dir="ltr"
              className="mb-4 rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-2 font-mono text-xs text-rose-200 break-words"
            >
              {this.state.errorMessage}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={this.handleHardReload}
              className="flex-1 rounded-lg bg-amber-500 px-3 py-2 text-sm font-bold text-slate-950 transition hover:bg-amber-400 cursor-pointer"
            >
              پاکسازی کش و بارگذاری مجدد
            </button>
            <button
              type="button"
              onClick={this.handleRetry}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700 cursor-pointer"
            >
              تلاش مجدد
            </button>
          </div>
        </div>
      </div>
    );
  }
}
