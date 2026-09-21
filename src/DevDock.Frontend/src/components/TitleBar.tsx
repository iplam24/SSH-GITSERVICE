import React from 'react';
import { Search, Minus, Square, X, Cpu, HardDrive, Sparkles } from 'lucide-react';
import { windowControls } from '../services/api';
import { SystemMetrics } from '../types';
import { DevDockLogo } from './DevDockLogo';

interface TitleBarProps {
  metrics: SystemMetrics | null;
  activeAiModel?: string;
  onOpenCommandPalette: () => void;
  onOpenAiHub?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  metrics,
  activeAiModel,
  onOpenCommandPalette,
  onOpenAiHub,
}) => {
  return (
    <header
      className="h-9 bg-[#0B0F17] border-b border-[#1A2433] flex items-center justify-between px-3 select-none flex-shrink-0 z-50 transition-colors"
      onMouseDown={(e) => {
        // Drag window if not clicked on interactive elements
        if ((e.target as HTMLElement).closest('button, input, a')) return;
        windowControls.drag();
      }}
    >
      {/* Left: Brand */}
      <div className="flex items-center gap-2.5">
        <DevDockLogo size={18} />
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs text-slate-200 tracking-wide font-sans">
            DevDock Workstation
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-400 border border-slate-700/50 font-mono font-medium">
            v1.5
          </span>
        </div>
      </div>

      {/* Center: Command Palette Trigger (Raycast / Windows 11 style) */}
      <button
        type="button"
        onClick={onOpenCommandPalette}
        className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#0E1526]/90 hover:bg-[#151F36] border border-[#1E2C48] text-slate-400 text-xs transition-all duration-150 group w-72 max-w-sm justify-between shadow-sm hover:border-slate-600 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-accent transition-colors" />
          <span className="text-slate-400 group-hover:text-slate-200 text-[11px]">Tìm lệnh, AI, kho Git, SSH...</span>
        </div>
        <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-[#070B14] text-slate-400 group-hover:text-slate-200 rounded border border-[#1E2C48]">
          Ctrl+Space
        </kbd>
      </button>

      {/* Right: AI badge, Metrics chip & Windows 11 Controls */}
      <div className="flex items-center gap-2.5">
        {/* Active AI Provider Chip */}
        {activeAiModel && (
          <button
            type="button"
            onClick={onOpenAiHub}
            className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-[10px] text-cyan-300 font-medium transition-colors cursor-pointer"
            title="Nhà cung cấp AI đang kích hoạt — Bấm để mở AI Hub"
          >
            <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span className="max-w-[120px] truncate">{activeAiModel}</span>
          </button>
        )}

        {/* System Telemetry Chips */}
        {metrics && (
          <div className="hidden sm:flex items-center gap-2.5 px-2 py-0.5 rounded-md bg-[#0E1526] border border-[#1A253C] text-[10px] font-mono text-slate-400">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              <Cpu className="w-3 h-3 text-slate-400" />
              <span>{(metrics.cpuUsagePercent ?? (metrics as any).CpuUsagePercent ?? 0).toFixed(0)}%</span>
            </div>
            <div className="w-[1px] h-2.5 bg-[#1F2B44]" />
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <HardDrive className="w-3 h-3 text-slate-400" />
              <span>{(metrics.ramUsagePercent ?? (metrics as any).RamUsagePercent ?? 0).toFixed(0)}%</span>
            </div>
          </div>
        )}

        {/* Windows 11 Fluent Window Controls */}
        <div className="flex items-center -mr-2">
          <button
            type="button"
            onClick={windowControls.minimize}
            className="w-10 h-8 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors"
            title="Thu nhỏ"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={windowControls.maximize}
            className="w-10 h-8 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors"
            title="Phóng to"
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={windowControls.close}
            className="w-10 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#C42B1C] transition-colors"
            title="Đóng"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
