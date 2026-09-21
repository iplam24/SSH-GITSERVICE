import React from 'react';
import {
  Home,
  FolderGit2,
  GitBranch,
  Sparkles,
  Server,
  Terminal,
  Wrench,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export type NavRoute = 'home' | 'projects' | 'git' | 'ai' | 'ssh' | 'terminal' | 'tools' | 'settings';

interface SidebarProps {
  currentRoute: NavRoute;
  onRouteChange: (route: NavRoute) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeAiModel?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onRouteChange,
  collapsed,
  onToggleCollapse,
  activeAiModel,
}) => {
  const mainNav = [
    { route: 'home' as NavRoute, label: 'Tổng quan', icon: Home, shortcut: 'Ctrl+1' },
    { route: 'projects' as NavRoute, label: 'Dự án', icon: FolderGit2, shortcut: 'Ctrl+2' },
    { route: 'git' as NavRoute, label: 'Quản lý Git', icon: GitBranch, shortcut: 'Ctrl+3' },
    { route: 'ai' as NavRoute, label: 'Trung tâm AI', icon: Sparkles, shortcut: 'Ctrl+4', isAi: true },
  ];

  const toolsNav = [
    { route: 'ssh' as NavRoute, label: 'Kết nối SSH', icon: Server, shortcut: 'Ctrl+Shift+S' },
    { route: 'terminal' as NavRoute, label: 'Terminal', icon: Terminal, shortcut: 'Ctrl+Shift+T' },
    { route: 'tools' as NavRoute, label: 'Tiện ích Dev', icon: Wrench, shortcut: 'Ctrl+5' },
  ];

  const systemNav = [
    { route: 'settings' as NavRoute, label: 'Cài đặt', icon: Settings, shortcut: 'Ctrl+,' },
  ];

  const renderNavGroup = (items: typeof mainNav) => (
    <div className="flex flex-col gap-0.5">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentRoute === item.route;

        return (
          <button
            key={item.route}
            type="button"
            onClick={() => onRouteChange(item.route)}
            className={`flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs transition-all duration-150 group relative cursor-pointer ${
              isActive
                ? item.isAi
                  ? 'bg-accent-bg text-cyan-300 font-semibold border-l-2 border-cyan-400'
                  : 'bg-accent-bg text-accent-light font-semibold border-l-2 border-accent shadow-glow-accent'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#121A28]'
            }`}
            title={collapsed ? `${item.label} (${item.shortcut})` : undefined}
          >
            <Icon
              className={`w-4 h-4 flex-shrink-0 transition-colors ${
                isActive
                  ? item.isAi
                    ? 'text-cyan-400'
                    : 'text-accent'
                  : item.isAi
                  ? 'text-cyan-400/80 group-hover:text-cyan-300'
                  : 'text-slate-400 group-hover:text-slate-200'
              }`}
            />

            {!collapsed && (
              <div className="flex items-center justify-between flex-1 overflow-hidden">
                <span className="truncate">{item.label}</span>
                {item.isAi && activeAiModel ? (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/25 font-mono max-w-[65px] truncate">
                    AI
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                    {item.shortcut}
                  </span>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <aside
      className={`bg-[#0A0E17] border-r border-[#192233] flex flex-col justify-between transition-all duration-200 select-none flex-shrink-0 ${
        collapsed ? 'w-14' : 'w-52'
      }`}
    >
      {/* Navigation Sections */}
      <div className="py-2.5 px-2 flex flex-col gap-3">
        {renderNavGroup(mainNav)}

        <div className="h-[1px] bg-[#141B2D] mx-1" />

        {renderNavGroup(toolsNav)}

        <div className="h-[1px] bg-[#141B2D] mx-1" />

        {renderNavGroup(systemNav)}
      </div>

      {/* Footer / Collapse Button */}
      <div className="p-2 border-t border-[#1A2235] flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2 px-2 text-[11px] text-slate-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-glow-accent animate-pulse" />
            <span className="text-[10px] text-slate-400">Hệ thống sẵn sàng</span>
          </div>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-[#0E1526] transition-colors ml-auto cursor-pointer"
          title={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};
