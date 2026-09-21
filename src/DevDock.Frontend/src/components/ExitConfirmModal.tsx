import React, { useEffect } from 'react';
import { LogOut, Power, X, ShieldAlert, ArrowDownToLine } from 'lucide-react';
import { windowControls } from '../services/api';

interface ExitConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div
        className="w-full max-w-md bg-[#0f121d] border border-[#23293f] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1b2133] bg-[#141824]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400">
              <Power className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Xác nhận thoát DevDock</h3>
              <p className="text-[11px] text-slate-400">Developer Command Center</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/5 flex items-center justify-center transition-colors cursor-pointer"
            title="Đóng (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 text-xs text-slate-300 leading-relaxed">
          <p className="text-slate-200 font-medium text-sm">
            Bạn có chắc chắn muốn đóng và thoát khỏi DevDock?
          </p>

          <div className="p-3.5 rounded-lg bg-rose-500/[0.06] border border-rose-500/20 text-slate-400 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-rose-400 font-medium text-xs">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Lưu ý khi thoát:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400 pl-0.5">
              <li>Mọi phiên kết nối SSH và SFTP đang mở sẽ bị ngắt kết nối.</li>
              <li>Các tiến trình build, dev server và terminal chạy ngầm sẽ dừng lại.</li>
            </ul>
          </div>

          <p className="text-slate-400 text-[11px]">
            Gợi ý: Bạn có thể chọn <span className="text-slate-200 font-medium">"Thu nhỏ vào khay"</span> để ứng dụng tiếp tục chạy ngầm trong System Tray mà không ngắt các tiến trình dev.
          </p>
        </div>

        {/* Actions Footer */}
        <div className="px-5 py-3.5 border-t border-[#1b2133] bg-[#0c0e17] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              windowControls.minimizeToTray();
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#181d2c] hover:bg-[#20273a] text-slate-300 hover:text-white border border-[#252d43] text-xs font-medium transition-colors cursor-pointer"
            title="Ẩn cửa sổ và giữ ứng dụng chạy ngầm ở khay hệ thống"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 text-slate-400" />
            <span>Thu nhỏ vào khay</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/5 text-xs font-medium transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => {
                windowControls.forceExit();
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/20 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Thoát DevDock</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
