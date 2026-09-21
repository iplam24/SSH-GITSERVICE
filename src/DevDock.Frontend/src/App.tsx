import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar, NavRoute } from './components/Sidebar';
import { CommandPalette } from './components/CommandPalette';
import { ToastContainer, ToastMessage } from './components/Toast';
import { ExitConfirmModal } from './components/ExitConfirmModal';
import { ConfirmProvider } from './context/ConfirmContext';

import { HomePage } from './pages/HomePage';
import { ProjectsPage } from './pages/ProjectsPage';
import { GitPage } from './pages/GitPage';
import { AiPage } from './pages/AiPage';
import { SshPage } from './pages/SshPage';
import { TerminalPage } from './pages/TerminalPage';
import { ToolsPage, ToolType } from './pages/ToolsPage';
import { DevOpsPage } from './pages/DevOpsPage';
import { SettingsPage } from './pages/SettingsPage';
import { SetupPage } from './pages/SetupPage';
import { GuidePage } from './pages/GuidePage';
import { AboutPage } from './pages/AboutPage';

import {
  ProjectItem,
  SshProfile,
  GitRepoStatus,
  SystemMetrics,
  CommandPaletteItem,
  ShellDescriptor,
  AppSettings,
  GitAccount,
  AiProviderConfig,
} from './types';
import { api } from './services/api';

export const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<NavRoute>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  // Core data states
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [sshProfiles, setSshProfiles] = useState<SshProfile[]>([]);
  const [shells, setShells] = useState<ShellDescriptor[]>([]);
  const [gitAccounts, setGitAccounts] = useState<GitAccount[]>([]);
  const [aiProviders, setAiProviders] = useState<AiProviderConfig[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'dark',
    accentColor: 'blue',
    terminalFontSize: 13,
    terminalFontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace",
    defaultShell: 'PowerShell',
    startMinimized: false,
    minimizeToTray: true,
    globalHotkeyEnabled: true,
    globalHotkey: 'Ctrl+Space',
    autoFetchGit: true,
    gitFetchIntervalMinutes: 10,
    language: 'vi',
  });

  const [activeRepoPath, setActiveRepoPath] = useState<string>('');
  const [activeGitStatus, setActiveGitStatus] = useState<GitRepoStatus | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [commands, setCommands] = useState<CommandPaletteItem[]>([]);
  const [selectedTool, setSelectedTool] = useState<ToolType>('json');
  const [selectedDevopsTab, setSelectedDevopsTab] = useState<'ports' | 'hosts' | 'env'>('ports');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [pendingSshProfileId, setPendingSshProfileId] = useState<string | null>(null);
  const [pendingRunCommand, setPendingRunCommand] = useState<string | null>(null);
  const [pendingTerminalCwd, setPendingTerminalCwd] = useState<string | null>(null);

  const activeAiProvider = useMemo(() => {
    return aiProviders.find((p) => p.isDefault) || aiProviders[0] || null;
  }, [aiProviders]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch initial data
  const refreshProjects = useCallback(async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch { }
  }, []);

  const refreshSshProfiles = useCallback(async () => {
    try {
      const data = await api.getSshProfiles();
      setSshProfiles(data);
    } catch { }
  }, []);

  const refreshAccounts = useCallback(async () => {
    try {
      const data = await api.getGitAccounts();
      setGitAccounts(data);
    } catch { }
  }, []);

  const refreshAiProviders = useCallback(async () => {
    try {
      const data = await api.getAiProviders();
      setAiProviders(data);
    } catch { }
  }, []);

  const refreshCommands = useCallback(async () => {
    try {
      const cmds = await api.getCommands();
      const aboutCmd: CommandPaletteItem = {
        id: 'nav:about',
        title: 'Tác giả: Vũ Xuân Lâm (@iplam24)',
        subtitle: 'Thông tin tác giả, GitHub https://github.com/iplam24/iplam24, Email vxlcontact143@gmail.com',
        category: 'Hệ Thống',
        actionType: 'navigate',
        payload: { route: 'about' },
        icon: 'heart',
      };
      setCommands([aboutCmd, ...cmds]);
    } catch { }
  }, []);

  useEffect(() => {
    refreshProjects();
    refreshSshProfiles();
    refreshAccounts();
    refreshAiProviders();
    refreshCommands();

    api.getShells().then(setShells).catch(() => {});
    api.getSettings().then((s) => {
      setSettings(s);
      if (s?.accentColor) {
        document.documentElement.setAttribute('data-accent', s.accentColor);
      }
      if (s && s.hasCompletedSetup === false) {
        setIsSetupOpen(true);
      }
    }).catch(() => {});
  }, [refreshProjects, refreshSshProfiles, refreshAccounts, refreshAiProviders, refreshCommands]);

  useEffect(() => {
    if (settings.accentColor) {
      document.documentElement.setAttribute('data-accent', settings.accentColor);
    }
  }, [settings.accentColor]);

  // Connect live metrics WebSocket
  useEffect(() => {
    const wsUrl = api.getMetricsWsUrl();
    let ws: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setMetrics(data);
          } catch { }
        };
        ws.onerror = () => {};
        ws.onclose = () => {
          timer = setTimeout(connect, 3000);
        };
      } catch {
        timer = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (timer) clearTimeout(timer);
      if (ws) ws.close();
    };
  }, []);

  // Native WebView2 Host Message Listener (Taskbar close, System Tray Exit, Hotkeys)
  useEffect(() => {
    const webview = (window as any).chrome?.webview;
    if (!webview) return;

    const handleWebMessage = (event: any) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data || !data.type) return;

        if (data.type === 'REQUEST_EXIT_CONFIRM') {
          setIsExitModalOpen(true);
        } else if (data.type === 'FOCUS_COMMAND_PALETTE') {
          refreshCommands();
          setIsCommandPaletteOpen(true);
        }
      } catch {}
    };

    webview.addEventListener('message', handleWebMessage);
    return () => webview.removeEventListener('message', handleWebMessage);
  }, [refreshCommands]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Space -> Command Palette
      if (e.ctrlKey && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        refreshCommands();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      // Ctrl + Shift + G -> Git
      else if (e.ctrlKey && e.shiftKey && (e.key === 'G' || e.key === 'g')) {
        e.preventDefault();
        setCurrentRoute('git');
      }
      // Ctrl + Shift + S -> SSH
      else if (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        setCurrentRoute('ssh');
      }
      // Ctrl + Shift + T -> Terminal
      else if (e.ctrlKey && e.shiftKey && (e.key === 'T' || e.key === 't')) {
        e.preventDefault();
        setCurrentRoute('terminal');
      }
      // Ctrl + Shift + A -> AI Hub
      else if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setCurrentRoute('ai');
      }
      // Ctrl + , -> Settings
      else if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        setCurrentRoute('settings');
      }
      // F1 -> User Guide / Handbook
      else if (e.key === 'F1') {
        e.preventDefault();
        setCurrentRoute('guide');
      }
      // Ctrl + I -> Author & Vibe / About
      else if (e.ctrlKey && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        setCurrentRoute('about');
      }
      // Number shortcuts Ctrl + 1, 2, 3, 4, 5, 6
      else if (e.ctrlKey && !e.shiftKey && !e.altKey) {
        if (e.key === '1') { e.preventDefault(); setCurrentRoute('home'); }
        else if (e.key === '2') { e.preventDefault(); setCurrentRoute('projects'); }
        else if (e.key === '3') { e.preventDefault(); setCurrentRoute('git'); }
        else if (e.key === '4') { e.preventDefault(); setCurrentRoute('ai'); }
        else if (e.key === '5') { e.preventDefault(); setCurrentRoute('tools'); }
        else if (e.key === '6') { e.preventDefault(); setCurrentRoute('devops'); }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [refreshCommands]);

  // Command Palette execution handler
  const handleSelectCommand = (cmd: CommandPaletteItem) => {
    if (cmd.actionType === 'navigate' && cmd.payload?.route) {
      const r = cmd.payload.route.replace('/', '') as NavRoute;
      setCurrentRoute(r || 'home');
      if (cmd.payload.tool) {
        setSelectedTool(cmd.payload.tool as ToolType);
      }
      if (cmd.payload.tab && (cmd.payload.tab === 'ports' || cmd.payload.tab === 'hosts' || cmd.payload.tab === 'env')) {
        setSelectedDevopsTab(cmd.payload.tab as any);
      }
    } else if (cmd.actionType === 'devops_flush_dns') {
      api.flushDns()
        .then(() => showToast('Đã Flush DNS thành công (DnsFlushResolverCache)', 'success'))
        .catch((err) => showToast(err.message || 'Lỗi Flush DNS', 'error'));
    } else if (cmd.actionType === 'project') {
      const p = projects.find((x) => x.id === cmd.payload?.projectId);
      if (p) {
        if (cmd.payload?.action === 'open') {
          api.openExplorer(p.path);
        } else if (cmd.payload?.action === 'terminal') {
          handleOpenTerminalForPath(p.path);
        } else if (cmd.payload?.action === 'git') {
          setActiveRepoPath(p.path);
          setCurrentRoute('git');
        } else if (cmd.payload?.action === 'run_dev') {
          api.runProjectCommand(p.id, 'dev');
          showToast(`Đã khởi chạy dev server cho ${p.name}`, 'info');
        }
      }
    } else if (cmd.actionType === 'ssh_connect') {
      if (cmd.payload?.profileId) {
        setPendingSshProfileId(cmd.payload.profileId);
      }
      setCurrentRoute('terminal');
    } else if (cmd.actionType === 'terminal') {
      setCurrentRoute('terminal');
    } else if (cmd.actionType === 'setup_wizard' || cmd.id === 'setup:wizard') {
      setIsSetupOpen(true);
    }
  };

  const handleOpenTerminalForPath = (path?: string) => {
    if (path) {
      setPendingTerminalCwd(path);
    }
    setCurrentRoute('terminal');
  };

  const handleOpenTerminalForProject = (p: ProjectItem) => {
    handleOpenTerminalForPath(p.path);
  };

  const handleOpenGitForProject = (p: ProjectItem) => {
    setActiveRepoPath(p.path);
    setCurrentRoute('git');
  };

  const handleConnectSsh = (p: SshProfile) => {
    setPendingSshProfileId(p.id);
    setCurrentRoute('terminal');
  };

  const handleRunCommandInTerminal = (cmd: string) => {
    setPendingRunCommand(cmd);
    setCurrentRoute('terminal');
  };

  const handleRunProjectDev = async (p: ProjectItem) => {
    try {
      showToast(`Đang chạy dev command cho ${p.name}...`, 'info');
      await api.runProjectCommand(p.id, 'dev');
      showToast(`Tiến trình dev hoàn tất cho ${p.name}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Chạy dev thất bại', 'error');
    }
  };

  return (
    <ConfirmProvider>
      <div className="h-screen w-screen flex flex-col bg-[#0c0d12] text-slate-100 overflow-hidden select-none font-sans">
      {/* Windows 11 Fluent Title Bar */}
      <TitleBar
        metrics={metrics}
        activeAiModel={activeAiProvider?.name || activeAiProvider?.defaultModel}
        onOpenCommandPalette={() => {
          refreshCommands();
          setIsCommandPaletteOpen(true);
        }}
        onOpenAiHub={() => setCurrentRoute('ai')}
        onOpenGuide={() => setCurrentRoute('guide')}
        onOpenAbout={() => setCurrentRoute('about')}
      />

      {/* Main App Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0 h-full">
        {/* Sidebar */}
        <Sidebar
          currentRoute={currentRoute}
          onRouteChange={setCurrentRoute}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          activeAiModel={activeAiProvider?.name}
        />

        {/* Dynamic Route Viewport */}
        <main className="flex-1 flex flex-col overflow-hidden relative bg-[#0c0d12] min-h-0 h-full w-full">
          {currentRoute === 'home' && (
            <HomePage
              metrics={metrics}
              projects={projects}
              sshProfiles={sshProfiles}
              gitStatus={activeGitStatus}
              activeRepoPath={activeRepoPath}
              activeAiModel={activeAiProvider?.name}
              onNavigate={setCurrentRoute}
              onOpenTerminalForProject={handleOpenTerminalForProject}
              onConnectSsh={handleConnectSsh}
              onRunProjectDev={handleRunProjectDev}
            />
          )}

          {currentRoute === 'projects' && (
            <ProjectsPage
              projects={projects}
              onRefreshProjects={refreshProjects}
              onOpenTerminalForProject={handleOpenTerminalForProject}
              onOpenGitForProject={handleOpenGitForProject}
              onShowToast={showToast}
            />
          )}

          <div className={`w-full h-full min-h-0 ${currentRoute === 'git' ? 'flex flex-col' : 'hidden'}`}>
            <GitPage
              projects={projects}
              gitAccounts={gitAccounts}
              sshProfiles={sshProfiles}
              activeRepoPath={activeRepoPath}
              onSelectRepoPath={setActiveRepoPath}
              onRefreshProjects={refreshProjects}
              onOpenTerminal={handleOpenTerminalForPath}
              onShowToast={showToast}
            />
          </div>

          <div className={`w-full h-full min-h-0 ${currentRoute === 'ai' ? 'flex flex-col' : 'hidden'}`}>
            <AiPage
              providers={aiProviders}
              activeProvider={activeAiProvider}
              projects={projects}
              onRefreshProjects={refreshProjects}
              onRefreshProviders={refreshAiProviders}
              onSelectProvider={(p) => {
                api.setDefaultAiProvider(p.id).then(() => refreshAiProviders());
              }}
              onNavigateSettings={() => setCurrentRoute('settings')}
              onOpenTerminal={handleOpenTerminalForPath}
              onRunCommandInTerminal={handleRunCommandInTerminal}
              onShowToast={showToast}
            />
          </div>

          <div className={`w-full h-full min-h-0 ${currentRoute === 'ssh' ? 'flex flex-col' : 'hidden'}`}>
            <SshPage
              profiles={sshProfiles}
              onRefreshProfiles={refreshSshProfiles}
              onConnectTerminal={handleConnectSsh}
              onShowToast={showToast}
            />
          </div>

          <div className={`w-full h-full min-h-0 ${currentRoute === 'terminal' ? 'flex flex-col' : 'hidden'}`}>
            <TerminalPage
              shells={shells}
              sshProfiles={sshProfiles}
              defaultShell={settings.defaultShell || 'PowerShell'}
              pendingSshProfileId={pendingSshProfileId}
              onClearPendingSsh={() => setPendingSshProfileId(null)}
              pendingRunCommand={pendingRunCommand}
              onClearPendingRunCommand={() => setPendingRunCommand(null)}
              pendingCwd={pendingTerminalCwd}
              onClearPendingCwd={() => setPendingTerminalCwd(null)}
              isPageVisible={currentRoute === 'terminal'}
              terminalFontSize={settings.terminalFontSize}
              terminalFontFamily={settings.terminalFontFamily}
              terminalBackgroundImage={settings.terminalBackgroundImage}
              terminalBackgroundOpacity={settings.terminalBackgroundOpacity}
              terminalBackgroundBlur={settings.terminalBackgroundBlur}
              onShowToast={showToast}
            />
          </div>

          {currentRoute === 'tools' && (
            <ToolsPage initialTool={selectedTool} onShowToast={showToast} />
          )}

          {currentRoute === 'devops' && (
            <DevOpsPage
              initialTab={selectedDevopsTab}
              onShowToast={showToast}
              onRunCommandInTerminal={handleRunCommandInTerminal}
            />
          )}

          {currentRoute === 'settings' && (
            <SettingsPage
              settings={settings}
              gitAccounts={gitAccounts}
              aiProviders={aiProviders}
              onSaveSettings={async (s) => {
                setSettings(s);
                await api.saveSettings(s);
                showToast('Đã lưu cài đặt', 'success');
              }}
              onRefreshAccounts={refreshAccounts}
              onRefreshAiProviders={refreshAiProviders}
              onShowToast={showToast}
              onOpenSetupWizard={() => setIsSetupOpen(true)}
            />
          )}

          {currentRoute === 'guide' && (
            <GuidePage onShowToast={showToast} />
          )}

          {currentRoute === 'about' && (
            <AboutPage onNavigate={setCurrentRoute} onShowToast={showToast} />
          )}
        </main>
      </div>

      {/* Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        commands={commands}
        onSelectCommand={handleSelectCommand}
      />

      {/* Deep Windows Setup & Onboarding Wizard */}
      {isSetupOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#060911] animate-in fade-in duration-200">
          <SetupPage
            settings={settings}
            isModal={true}
            onClose={() => setIsSetupOpen(false)}
            onFinishSetup={async (newSettings) => {
              setSettings(newSettings);
              setIsSetupOpen(false);
              showToast('Thiết lập DevDock hoàn tất thành công! Sẵn sàng làm việc 🚀', 'success');
            }}
          />
        </div>
      )}

      {/* Native Exit Application Confirmation Modal */}
      <ExitConfirmModal
        isOpen={isExitModalOpen}
        onClose={() => setIsExitModalOpen(false)}
      />

      {/* Floating Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
    </ConfirmProvider>
  );
};
