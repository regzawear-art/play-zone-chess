import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';

type Toast = { id: number; message: string; type?: 'info' | 'success' | 'error' };

const ToastCtx = createContext<{ show: (msg: string, t?: Toast['type']) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = (message: string, type: Toast['type'] = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((s) => [...s, { id, message, type }]);
    setTimeout(() => setToasts((s) => s.filter((t) => t.id !== id)), 3000);
  };

  // listen for global app-toast events so non-react code can trigger toasts
  useEffect(() => {
    const handler = (ev: any) => {
      const d = ev.detail || {};
      show(d.message || '');
    };
    window.addEventListener('app-toast', handler as EventListener);
    return () => window.removeEventListener('app-toast', handler as EventListener);
  }, []);

  const value = useMemo(() => ({ show }), []);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div style={{ position: 'fixed', right: 18, top: 18, zIndex: 9999 }}>
        {toasts.map((t) => (
          <div key={t.id} style={{ marginBottom: 8, padding: '10px 14px', borderRadius: 8, color: '#fff', background: t.type === 'error' ? '#e11' : t.type === 'success' ? '#16a34a' : '#334155', boxShadow: '0 6px 18px rgba(2,6,23,.6)', minWidth: 160 }}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export default ToastProvider;

// Listen for app-toast events so non-react code can trigger toasts
if (typeof window !== 'undefined') {
  // noop-the provider itself listens for 'app-toast' events via useEffect
}
