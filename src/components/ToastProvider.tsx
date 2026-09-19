import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from 'react';

// Keep the toast layer above every modal/dialog in the application.
// Friends/Invites uses z-[9999], so toasts intentionally use z-[11000].
type Toast = {
  id: number;
  message: string;
  type?: 'info' | 'success' | 'error';
};

type ToastContextValue = {
  show: (msg: string, type?: Toast['type']) => void;
};

const ToastCtx = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);

    setToasts((current) => [
      ...current,
      { id, message, type },
    ]);

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3000);
  }, []);

  // Listen for global app-toast events so existing multiplayer code can
  // continue to trigger notifications without needing the React context.
  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{
        message?: string;
        type?: Toast['type'];
      }>;

      const detail = customEvent.detail || {};

      if (detail.message) {
        show(detail.message, detail.type || 'info');
      }
    };

    window.addEventListener('app-toast', handler);
    return () => window.removeEventListener('app-toast', handler);
  }, [show]);

  const value = useMemo<ToastContextValue>(() => ({ show }), [show]);

  return (
    <ToastCtx.Provider value={value}>
      {children}

      {/*
        Render the notification layer at the end of the application tree.
        The very high z-index keeps it above Friends/Invites modals and
        prevents a modal backdrop from hiding the notification.
      */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed right-4 top-4 z-[11000] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2 sm:right-5 sm:top-5"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto w-fit max-w-[min(380px,calc(100vw-2rem))] rounded-xl border px-4 py-3 text-sm font-medium text-white shadow-2xl backdrop-blur-md ${
              toast.type === 'error'
                ? 'border-red-400/30 bg-red-600/95'
                : toast.type === 'success'
                  ? 'border-emerald-300/30 bg-emerald-600/95'
                  : 'border-white/15 bg-slate-800/95'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export default ToastProvider;
