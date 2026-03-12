'use client';
import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{
        position: 'fixed', bottom: '1.5rem', right: '1.5rem',
        display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 9999,
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 16px',
            borderRadius: '6px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.82rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            animation: 'fadeIn 0.2s ease',
            background: t.type === 'success' ? 'rgba(0,230,118,0.12)'
                      : t.type === 'error'   ? 'rgba(255,59,92,0.12)'
                      : 'rgba(0,212,255,0.10)',
            border: `1px solid ${
              t.type === 'success' ? 'rgba(0,230,118,0.4)'
            : t.type === 'error'   ? 'rgba(255,59,92,0.4)'
            : 'rgba(0,212,255,0.3)'}`,
            color: t.type === 'success' ? 'var(--success)'
                 : t.type === 'error'   ? 'var(--danger)'
                 : 'var(--accent)',
            minWidth: '260px', maxWidth: '380px',
          }}>
            <span style={{ fontSize: '1rem' }}>
              {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
            </span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);