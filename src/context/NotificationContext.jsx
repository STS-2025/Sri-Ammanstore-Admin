import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const newToast = { id, type, title, message };
    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = {
    success: (title, message) => addToast({ type: 'success', title, message }),
    error: (title, message) => addToast({ type: 'error', title, message }),
    warning: (title, message) => addToast({ type: 'warning', title, message }),
    info: (title, message) => addToast({ type: 'info', title, message })
  };

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      {/* Toast Notifications Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md pointer-events-none">
        {toasts.map((toast) => {
          const typeConfig = {
            success: {
              icon: CheckCircle2,
              bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
              iconColor: 'text-emerald-600'
            },
            error: {
              icon: AlertCircle,
              bg: 'bg-rose-50 border-rose-200 text-rose-900',
              iconColor: 'text-rose-600'
            },
            warning: {
              icon: AlertTriangle,
              bg: 'bg-amber-50 border-amber-200 text-amber-900',
              iconColor: 'text-amber-600'
            },
            info: {
              icon: Info,
              bg: 'bg-blue-50 border-blue-200 text-blue-900',
              iconColor: 'text-blue-600'
            }
          }[toast.type] || {
            icon: Info,
            bg: 'bg-slate-50 border-slate-200 text-slate-900',
            iconColor: 'text-slate-600'
          };

          const IconComponent = typeConfig.icon;

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all duration-200 animate-in fade-in slide-in-from-bottom-3 ${typeConfig.bg}`}
            >
              <IconComponent className={`w-5 h-5 mt-0.5 shrink-0 ${typeConfig.iconColor}`} />
              <div className="flex-1 min-w-0">
                {toast.title && <div className="text-sm font-semibold mb-0.5">{toast.title}</div>}
                {toast.message && <div className="text-xs text-slate-600 leading-relaxed">{toast.message}</div>}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                aria-label="Dismiss toast"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
