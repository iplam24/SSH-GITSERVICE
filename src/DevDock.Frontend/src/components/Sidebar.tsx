import React from 'react';
import {
  Home,
  FolderGit2,
  GitBranch,
  Sparkles,
  Server,
  Terminal,
  Wrench,
  Sliders,
  Settings,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Heart,
} from 'lucide-react';
import { DevDockLogo } from './DevDockLogo';
import { useLanguage } from '../context/LanguageContext';

export type NavRoute = 'home' | 'projects' | 'git' | 'ai' | 'ssh' | 'terminal' | 'tools' | 'devops' | 'settings' | 'guide' | 'about';

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
  const { t } = useLanguage();

  const mainNav = [
    { route: 'home' as NavRoute, label: t('nav.home'), icon: Home, shortcut: 'Ctrl+1' },
    { route: 'projects' as NavRoute, label: t('nav.projects'), icon: FolderGit2, shortcut: 'Ctrl+2' },
    { route: 'git' as NavRoute, label: t('nav.git'), icon: GitBranch, shortcut: 'Ctrl+3' },
    { route: 'ai' as NavRoute, label: t('nav.ai'), icon: Sparkles, shortcut: 'Ctrl+4', isAi: true },
  ];

  const toolsNav = [
    { route: 'ssh' as NavRoute, label: t('nav.ssh'), icon: Server, shortcut: 'Ctrl+Shift+S' },
    { route: 'terminal' as NavRoute, label: t('nav.terminal'), icon: Terminal, shortcut: 'Ctrl+Shift+T' },
    { route: 'tools' as NavRoute, label: t('nav.tools'), icon: Wrench, shortcut: 'Ctrl+5' },
    { route: 'devops' as NavRoute, label: t('nav.devops'), icon: Sliders, shortcut: 'Ctrl+6' },
  ];

  const systemNav = [
    { route: 'settings' as NavRoute, label: t('nav.settings'), icon: Settings, shortcut: 'Ctrl+,' },
    { route: 'guide' as NavRoute, label: t('nav.guide'), icon: BookOpen, shortcut: 'F1' },
    { route: 'about' as NavRoute, label: t('nav.about'), icon: Heart, shortcut: 'Ctrl+I' },
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
            className={`flex items-center gap-3 px-2.5 py-1.5 rounded-md text-xs transition-all duration-150 group relative cursor-pointer ${
              isActive
                ? 'bg-white/[0.07] text-slate-100 font-medium'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
            }`}
            title={collapsed ? `${item.label} (${item.shortcut})` : undefined}
          >
            <Icon
              className={`w-4 h-4 flex-shrink-0 transition-colors ${
                isActive
                  ? 'text-accent'
                  : 'text-slate-400 group-hover:text-slate-200'
              }`}
            />

            {!collapsed && (
              <div className="flex items-center justify-between flex-1 overflow-hidden">
                <span className="truncate">{item.label}</span>
                {item.isAi && activeAiModel ? (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-300 border border-white/[0.08] font-mono max-w-[65px] truncate">
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
      className={`bg-[#0a0c10] border-r border-[#1a1e2a] flex flex-col justify-between transition-all duration-200 select-none flex-shrink-0 ${
        collapsed ? 'w-14' : 'w-52'
      }`}
    >
      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto min-h-0 py-2.5 px-2 flex flex-col gap-2.5">
        {renderNavGroup(mainNav)}

        <div className="h-[1px] bg-[#1a1e2a] mx-1" />

        {renderNavGroup(toolsNav)}

        <div className="h-[1px] bg-[#1a1e2a] mx-1" />

        {renderNavGroup(systemNav)}
      </div>

      {/* Footer / App Logo, Version & Author & Collapse Button */}
      <div className="p-2 border-t border-[#1a1e2a] flex items-center justify-between gap-1">
        {!collapsed ? (
          <button
            type="button"
            onClick={() => onRouteChange('about')}
            className="flex items-center gap-2 px-1.5 py-1 rounded text-left hover:bg-white/[0.04] transition-colors cursor-pointer group flex-1 min-w-0"
            title="DevDock Workstation v1.5.0 LTS — Phát triển bởi Vũ Xuân Lâm (@iplam24)"
          >
            <DevDockLogo size={18} />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-slate-300 group-hover:text-cyan-300 font-mono font-semibold truncate leading-tight">
                DevDock v1.5.0
              </span>
              <span className="text-[9px] text-slate-500 group-hover:text-slate-400 font-mono truncate leading-tight">
                by Vũ Xuân Lâm
              </span>
            </div>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onRouteChange('about')}
            className="p-1 rounded hover:bg-white/[0.04] transition-colors cursor-pointer group flex items-center justify-center"
            title="DevDock Workstation v1.5.0 LTS — Vũ Xuân Lâm"
          >
            <DevDockLogo size={18} />
          </button>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-white/[0.05] transition-colors shrink-0 cursor-pointer"
          title={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};
