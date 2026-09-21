import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { AlertTriangle, Trash2, Info, X } from 'lucide-react';

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

interface ConfirmContextType {
  confirm: (options: string | ConfirmDialogOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
};

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<ConfirmDialogOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: string | ConfirmDialogOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      if (typeof options === 'string') {
        setDialog({
          title: 'Xác nhận thao tác',
          message: options,
          confirmText: 'Xác nhận',
          cancelText: 'Hủy',
          type: 'danger',
        });
      } else {
        setDialog({
          title: options.title || 'Xác nhận thao tác',
          message: options.message,
          confirmText: options.confirmText || 'Xác nhận',
          cancelText: options.cancelText || 'Hủy',
          type: options.type || 'danger',
        });
      }
    });
  }, []);

  const handleConfirm = () => {
    if (resolveRef.current) {
      resolveRef.current(true);
      resolveRef.current = null;
    }
    setDialog(null);
  };

  const handleCancel = () => {
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
    setDialog(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!dialog) return;
      if (e.key === 'Escape') {
        handleCancel();
      } else if (e.key === 'Enter') {
        handleConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialog]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 select-none">
          <div
            className="w-full max-w-md bg-[#0e121d] border border-[#20283f] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1b2236] bg-[#131826]">
              <div className="flex items-center gap-2.5">
                {dialog.type === 'danger' && (
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400">
                    <Trash2 className="w-4 h-4" />
                  </div>
                )}
                {dialog.type === 'warning' && (
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                )}
                {dialog.type === 'info' && (
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400">
                    <Info className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">{dialog.title}</h3>
                  <p className="text-[11px] text-slate-400">DevDock System Confirmation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/5 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 flex flex-col gap-3 text-xs text-slate-300">
              <p className="text-slate-200 font-medium leading-relaxed">
                {dialog.message}
              </p>
              {dialog.type === 'danger' && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>Hành động này sẽ không thể hoàn tác sau khi thực hiện.</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 border-t border-[#1b2236] bg-[#0b0e17] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 text-xs font-medium transition-colors cursor-pointer"
              >
                {dialog.cancelText}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-semibold shadow-md transition-all cursor-pointer ${
                  dialog.type === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/25'
                    : dialog.type === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/25'
                    : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/25'
                }`}
              >
                {dialog.type === 'danger' ? <Trash2 className="w-3.5 h-3.5" /> : null}
                <span>{dialog.confirmText}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
