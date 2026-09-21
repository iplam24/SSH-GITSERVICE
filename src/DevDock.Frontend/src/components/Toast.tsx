import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const Icon =
    toast.type === 'success' ? CheckCircle2 : toast.type === 'error' ? AlertCircle : Info;

  const colorClass =
    toast.type === 'success'
      ? 'border-emerald-500/40 text-emerald-300 bg-emerald-950/90'
      : toast.type === 'error'
      ? 'border-rose-500/40 text-rose-300 bg-rose-950/90'
      : 'border-blue-500/40 text-blue-300 bg-blue-950/90';

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 px-3.5 py-2.5 rounded-lg border shadow-xl backdrop-blur-md text-xs font-medium animate-in slide-in-from-right duration-200 min-w-[280px] max-w-sm justify-between ${colorClass}`}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span>{toast.message}</span>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="p-1 hover:opacity-80 rounded"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
