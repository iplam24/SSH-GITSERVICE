import React from 'react';
import { Search, Minus, Square, X, Cpu, HardDrive, Sparkles, BookOpen, Heart, Globe } from 'lucide-react';
import { windowControls } from '../services/api';
import { SystemMetrics } from '../types';
import { DevDockLogo } from './DevDockLogo';
import { useLanguage } from '../context/LanguageContext';

interface TitleBarProps {
  metrics: SystemMetrics | null;
  activeAiModel?: string;
  onOpenCommandPalette: () => void;
  onOpenAiHub?: () => void;
  onOpenGuide?: () => void;
  onOpenAbout?: () => void;
  onRequestExit?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  metrics,
  activeAiModel,
  onOpenCommandPalette,
  onOpenAiHub,
  onOpenGuide,
  onOpenAbout,
  onRequestExit,
}) => {
  const { lang, toggleLang, t } = useLanguage();
  return (
    <header
      className="h-9 bg-[#0a0c10] border-b border-[#1a1e2a] flex items-center justify-between px-3 select-none flex-shrink-0 z-50 transition-colors"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Left: Brand */}
      <div className="flex items-center gap-2.5">
        <DevDockLogo size={18} />
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs text-slate-200 tracking-wide font-sans">
            DevDock Workstation
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/[0.04] text-slate-400 border border-white/[0.08] font-mono font-medium">
            v1.5
          </span>
        </div>
      </div>

      {/* Center: Command Palette — no-drag so click works */}
      <button
        type="button"
        onClick={onOpenCommandPalette}
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className="hidden sm:flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-md bg-[#12151f] hover:bg-[#171b26] border border-[#1e2332] text-slate-400 text-xs transition-all duration-150 group w-44 md:w-60 lg:w-72 max-w-sm justify-between shadow-subtle hover:border-slate-600 cursor-pointer"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Search className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-colors shrink-0" />
          <span className="text-slate-400 group-hover:text-slate-200 text-[11px] truncate">Tìm lệnh, AI, kho Git, SSH...</span>
        </div>
        <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-[#0c0e14] text-slate-400 group-hover:text-slate-300 rounded border border-[#1e2332] shrink-0">
          Ctrl+Space
        </kbd>
      </button>

      {/* Right: AI badge, Metrics chip & Controls — no-drag so buttons work */}
      <div
        className="flex items-center gap-2"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {activeAiModel && (
          <button
            type="button"
            onClick={onOpenAiHub}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#12151f] hover:bg-[#181c28] border border-[#1e2332] text-[11px] text-slate-300 font-medium transition-colors cursor-pointer"
            title="Nhà cung cấp AI đang kích hoạt — Bấm để mở AI Hub"
          >
            <Sparkles className="w-3 h-3 text-accent" />
            <span className="max-w-[120px] truncate">{activeAiModel}</span>
          </button>
        )}

        {onOpenGuide && (
          <button
            type="button"
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#12151f] hover:bg-[#181c28] border border-[#1e2332] text-[11px] text-slate-300 font-medium transition-colors cursor-pointer"
            title="Mở Cẩm Nang Hướng Dẫn Sử Dụng (F1)"
          >
            <BookOpen className="w-3 h-3 text-accent" />
            <span className="hidden sm:inline">Hướng dẫn</span>
          </button>
        )}

        {onOpenAbout && (
          <button
            type="button"
            onClick={onOpenAbout}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-gradient-to-r from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 border border-cyan-500/25 text-[11px] text-cyan-300 font-medium transition-colors cursor-pointer"
            title="Sản phẩm phát triển bởi Vũ Xuân Lâm (@iplam24) — Bấm xem chi tiết"
          >
            <Heart className="w-3 h-3 text-rose-400 fill-rose-400/40" />
            <span>Vũ Xuân Lâm</span>
          </button>
        )}

        {metrics && (
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-[#12151f] border border-[#1e2332] text-[10px] font-mono text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
              <Cpu className="w-3 h-3 text-slate-500" />
              <span>{(metrics.cpuUsagePercent ?? (metrics as any).CpuUsagePercent ?? 0).toFixed(0)}%</span>
            </div>
            <div className="w-[1px] h-2.5 bg-[#1e2332]" />
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500/80" />
              <HardDrive className="w-3 h-3 text-slate-500" />
              <span>{(metrics.ramUsagePercent ?? (metrics as any).RamUsagePercent ?? 0).toFixed(0)}%</span>
            </div>
          </div>
        )}

        {/* Windows 11 Controls */}
        <div className="flex items-center -mr-2">
          <button
            type="button"
            onClick={toggleLang}
            className="h-8 px-2 flex items-center gap-1 text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors text-[10px] font-mono"
            title={lang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
          >
            <Globe className="w-3 h-3" />
            <span>{lang === 'vi' ? 'EN' : 'VI'}</span>
          </button>
          <button
            type="button"
            onClick={windowControls.minimize}
            className="w-10 h-8 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors"
            title={t('titlebar.minimize')}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={windowControls.maximize}
            className="w-10 h-8 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors"
            title={t('titlebar.maximize')}
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={onRequestExit ?? windowControls.close}
            className="w-10 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#C42B1C] transition-colors"
            title={t('titlebar.close')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
