import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastVariant = 'success' | 'warning' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full px-4 pointer-events-none"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const getIcon = () => {
    switch (toast.variant) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-rose-400 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-cyan-400 shrink-0" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.variant) {
      case 'success':
        return 'border-emerald-500/40 bg-emerald-950/90 text-emerald-100';
      case 'warning':
        return 'border-amber-500/40 bg-amber-950/90 text-amber-100';
      case 'error':
        return 'border-rose-500/40 bg-rose-950/90 text-rose-100';
      default:
        return 'border-cyan-500/40 bg-cyan-950/90 text-cyan-100';
    }
  };

  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${getBorderColor()}`}
    >
      {getIcon()}
      <div className="flex-1 min-w-0">
        <h4 className="font-heading font-bold text-xs tracking-wide">{toast.title}</h4>
        {toast.description && (
          <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{toast.description}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Close notification"
        className="text-slate-400 hover:text-slate-100 rounded-md p-0.5 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
