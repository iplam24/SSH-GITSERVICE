import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import {
  Terminal as TerminalIcon,
  Plus,
  X,
  Columns,
  Rows,
  Maximize2,
  Trash2,
  ChevronDown,
  RefreshCw,
  Server,
  Play,
  Square,
  Sparkles,
  AlertTriangle,
  CornerDownLeft,
  Loader2,
  BookMarked,
} from 'lucide-react';
import { TerminalSessionInfo, TerminalShellType, ShellDescriptor, SshProfile, AiShellCommandResult, SnippetItem } from '../types';
import { api } from '../services/api';

export interface TerminalTab {
  id: string;
  session: TerminalSessionInfo;
  title: string;
  paneIndex: number;
}

interface TerminalPageProps {
  shells: ShellDescriptor[];
  sshProfiles: SshProfile[];
  defaultShell?: TerminalShellType;
  initialSessions?: TerminalSessionInfo[];
  pendingSshProfileId?: string | null;
  onClearPendingSsh?: () => void;
  pendingRunCommand?: string | null;
  onClearPendingRunCommand?: () => void;
  pendingCwd?: string | null;
  onClearPendingCwd?: () => void;
  pendingSplit?: 'horizontal' | 'vertical' | null;
  onClearPendingSplit?: () => void;
  isPageVisible?: boolean;
  terminalFontSize?: number;
  terminalFontFamily?: string;
  terminalBackgroundImage?: string;
  terminalBackgroundOpacity?: number;
  terminalBackgroundBlur?: number;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const TerminalPage: React.FC<TerminalPageProps> = ({
  shells,
  sshProfiles,
  defaultShell = 'PowerShell',
  initialSessions = [],
  pendingSshProfileId,
  onClearPendingSsh,
  pendingRunCommand,
  onClearPendingRunCommand,
  pendingCwd,
  onClearPendingCwd,
  pendingSplit,
  onClearPendingSplit,
  isPageVisible = true,
  terminalFontSize = 13,
  terminalFontFamily = "'Cascadia Code', 'Fira Code', Consolas, monospace",
  terminalBackgroundImage,
  terminalBackgroundOpacity,
  terminalBackgroundBlur,
  onShowToast,
}) => {
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [splitMode, setSplitMode] = useState<'single' | 'horizontal' | 'vertical'>('single');
  const [activePaneTabIds, setActivePaneTabIds] = useState<{ [pane: number]: string }>({ 0: '' });
  const [isShellMenuOpen, setIsShellMenuOpen] = useState(false);
  const shellMenuRef = useRef<HTMLDivElement>(null);

  const [internalShells, setInternalShells] = useState<ShellDescriptor[]>(shells || []);

  // AI Terminal Copilot (H1)
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotInput, setCopilotInput] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotResult, setCopilotResult] = useState<AiShellCommandResult | null>(null);
  const [injectedCommand, setInjectedCommand] = useState<string | null>(null);

  const currentShellType = useMemo<string>(() => {
    const active = tabs.find((t) => t.id === activeTabId);
    return active?.session?.shellType || defaultShell || 'PowerShell';
  }, [tabs, activeTabId, defaultShell]);

  const handleAskCopilot = async () => {
    if (!copilotInput.trim()) {
      onShowToast('Hãy mô tả việc bạn muốn làm', 'error');
      return;
    }
    setCopilotLoading(true);
    setCopilotResult(null);
    try {
      const res = await api.generateShellCommand({
        description: copilotInput.trim(),
        shell: currentShellType,
      });
      if (res.success) {
        setCopilotResult(res);
      } else {
        onShowToast(res.errorMessage || 'AI không tạo được lệnh. Kiểm tra cấu hình AI trong Cài đặt.', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi gọi AI Copilot', 'error');
    } finally {
      setCopilotLoading(false);
    }
  };

  const handleInsertCopilotCommand = () => {
    if (!copilotResult?.command) return;
    if (tabs.length === 0) {
      onShowToast('Chưa có phiên terminal nào để chèn lệnh', 'error');
      return;
    }
    // Chèn vào terminal đang hoạt động — KHÔNG tự chạy, người dùng tự nhấn Enter
    setInjectedCommand(copilotResult.command);
    onShowToast('Đã chèn lệnh vào terminal — kiểm tra rồi nhấn Enter để chạy', 'success');
    setCopilotOpen(false);
  };

  // Snippet / Command Manager (N4)
  const [snippetOpen, setSnippetOpen] = useState(false);
  const [snippets, setSnippets] = useState<SnippetItem[]>([]);
  const [snippetSearch, setSnippetSearch] = useState('');
  const [newSnippet, setNewSnippet] = useState<{ title: string; command: string; group: string }>({
    title: '',
    command: '',
    group: 'General',
  });

  const loadSnippets = async () => {
    try {
      const res = await api.getSnippets();
      setSnippets(res || []);
    } catch {
      /* im lặng — không chặn terminal */
    }
  };

  useEffect(() => {
    if (snippetOpen) loadSnippets();
  }, [snippetOpen]);

  const handleSaveSnippet = async () => {
    if (!newSnippet.title.trim() || !newSnippet.command.trim()) {
      onShowToast('Nhập tên và nội dung lệnh cho snippet', 'error');
      return;
    }
    try {
      await api.saveSnippet({
        title: newSnippet.title.trim(),
        command: newSnippet.command.trim(),
        group: newSnippet.group.trim() || 'General',
      });
      setNewSnippet({ title: '', command: '', group: 'General' });
      onShowToast('Đã lưu snippet', 'success');
      loadSnippets();
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi lưu snippet', 'error');
    }
  };

  const handleDeleteSnippet = async (id: string) => {
    try {
      await api.deleteSnippet(id);
      loadSnippets();
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi xóa snippet', 'error');
    }
  };

  const handleRunSnippet = (s: SnippetItem) => {
    if (tabs.length === 0) {
      onShowToast('Chưa có phiên terminal nào để chèn lệnh', 'error');
      return;
    }
    // Chèn (không tự chạy) — người dùng nhấn Enter
    setInjectedCommand(s.command);
    api.useSnippet(s.id).catch(() => {});
    onShowToast('Đã chèn snippet vào terminal — nhấn Enter để chạy', 'success');
    setSnippetOpen(false);
  };

  const filteredSnippets = useMemo(() => {
    const q = snippetSearch.trim().toLowerCase();
    if (!q) return snippets;
    return snippets.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.command.toLowerCase().includes(q) ||
        s.group.toLowerCase().includes(q)
    );
  }, [snippets, snippetSearch]);

  useEffect(() => {
    if (shells && shells.length > 0) {
      setInternalShells(shells);
    } else {
      api.getShells().then((res) => {
        if (res && res.length > 0) setInternalShells(res);
      }).catch(() => {});
    }
  }, [shells]);

  const effectiveShells = useMemo<ShellDescriptor[]>(() => {
    if (internalShells && internalShells.length > 0) return internalShells;
    return [
      { type: 'PowerShell', displayName: 'PowerShell', executablePath: 'powershell.exe', isAvailable: true },
      { type: 'Cmd', displayName: 'Command Prompt', executablePath: 'cmd.exe', isAvailable: true },
      { type: 'GitBash', displayName: 'Git Bash', executablePath: 'bash.exe', isAvailable: true },
      { type: 'Wsl', displayName: 'WSL (Linux)', executablePath: 'wsl.exe', isAvailable: true },
    ];
  }, [internalShells]);

  // Click outside to close shell dropdown
  useEffect(() => {
    if (!isShellMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (shellMenuRef.current && !shellMenuRef.current.contains(e.target as Node)) {
        setIsShellMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsShellMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isShellMenuOpen]);

  const getInitialDimensions = () => {
    const cols = Math.max(80, Math.floor((window.innerWidth - 260) / 8.5));
    const rows = Math.max(24, Math.floor((window.innerHeight - 120) / 18));
    return { cols, rows };
  };

  // Initialize first terminal if none exist and not connecting to SSH or opening CWD
  useEffect(() => {
    if (tabs.length === 0 && !pendingSshProfileId && !pendingCwd) {
      handleCreateLocalTerminal(defaultShell || 'PowerShell');
    }
  }, []);

  // Handle pending Working Directory (from Projects, Git, Home, Command Palette)
  useEffect(() => {
    if (pendingCwd) {
      const folderName = pendingCwd.replace(/\\/g, '/').split('/').filter(Boolean).pop() || pendingCwd;
      handleCreateLocalTerminal(defaultShell || 'PowerShell', pendingCwd, `PowerShell: ${folderName}`);
      onClearPendingCwd?.();
    }
  }, [pendingCwd]);

  // Handle pending SSH connection triggered from SshPage or HomePage
  useEffect(() => {
    if (pendingSshProfileId) {
      handleCreateSshTerminal(pendingSshProfileId);
      onClearPendingSsh?.();
    }
  }, [pendingSshProfileId]);

  // Handle pending split-pane request from Command Palette
  useEffect(() => {
    if (pendingSplit === 'horizontal' || pendingSplit === 'vertical') {
      setSplitMode(pendingSplit);
      onClearPendingSplit?.();
    }
  }, [pendingSplit]);

  const handleCreateLocalTerminal = async (
    shellType: TerminalShellType = defaultShell || 'PowerShell',
    cwd?: string,
    customTitle?: string
  ) => {
    try {
      const { cols, rows } = getInitialDimensions();
      const session = await api.createTerminal(shellType, cwd, cols, rows);
      const countOfSameShell = tabs.filter((t) => t.session?.shellType === shellType).length;
      const displayTitle = customTitle || (countOfSameShell > 0 ? `${session.title} (${countOfSameShell + 1})` : session.title);
      const newTab: TerminalTab = {
        id: session.sessionId,
        session,
        title: displayTitle,
        paneIndex: 0,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
      setActivePaneTabIds((prev) => ({ ...prev, 0: newTab.id }));
      onShowToast(`Đã mở phiên ${displayTitle}`, 'info');
    } catch (err: any) {
      onShowToast(err.message || 'Không thể khởi tạo phiên Terminal', 'error');
    }
  };

  const handleCreateSshTerminal = async (profileId: string) => {
    const profile = sshProfiles.find((p) => p.id === profileId);
    const profileName = profile ? `${profile.username}@${profile.host}` : profileId;
    onShowToast(`Đang kết nối SSH tới ${profileName}...`, 'info');

    try {
      const { cols, rows } = getInitialDimensions();
      const session = await api.connectSshTerminal(profileId, cols, rows);
      const newTab: TerminalTab = {
        id: session.sessionId,
        session,
        title: session.title,
        paneIndex: 0,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
      setActivePaneTabIds((prev) => ({ ...prev, 0: newTab.id }));
      onShowToast(`Đã kết nối thành công tới ${session.title}`, 'success');
    } catch (err: any) {
      onShowToast(`Lỗi kết nối SSH: ${err.message || 'Không thể mở shell từ xa'}`, 'error');
    }
  };

  const handleCloseTab = async (tabId: string) => {
    try {
      await api.closeTerminal(tabId);
    } catch { }

    setTabs((prev) => {
      const remaining = prev.filter((t) => t.id !== tabId);
      if (activeTabId === tabId && remaining.length > 0) {
        setActiveTabId(remaining[remaining.length - 1].id);
      }
      return remaining;
    });
  };

  const handleCloseAllTabs = async () => {
    for (const t of tabs) {
      try {
        await api.closeTerminal(t.id);
      } catch { }
    }
    setTabs([]);
    setActiveTabId('');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#08090d] overflow-hidden select-none">
      {/* Terminal Top Control Bar */}
      <div className="h-9 bg-[#0c0d12] border-b border-[#1e2230] px-2 flex items-center justify-between flex-shrink-0">
        {/* Terminal Tabs List */}
        <div className="flex items-center gap-1 overflow-x-auto flex-1 h-full py-1">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const isSsh = tab.session?.shellType === 'Ssh' || tab.title.startsWith('SSH:');

            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-2 px-3 py-1 rounded-t-md text-xs font-mono cursor-pointer transition-all border-t-2 ${
                  isActive
                    ? 'bg-[#12141c] text-slate-100 border-blue-500 font-medium'
                    : 'bg-transparent text-slate-400 border-transparent hover:bg-white/[0.04] hover:text-slate-200'
                }`}
              >
                {isSsh ? (
                  <Server className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                ) : (
                  <TerminalIcon className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                )}
                <span className="truncate max-w-[130px]">{tab.title}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseTab(tab.id);
                  }}
                  className="p-0.5 hover:text-rose-400 rounded transition-colors cursor-pointer"
                  title="Đóng phiên terminal"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {/* Plus / New Tab button with Split Dropdown */}
          <div ref={shellMenuRef} className="relative ml-1 flex items-center">
            <div className="inline-flex items-center rounded-md bg-[#12151f] hover:bg-[#181c2b] border border-[#1e2332] text-slate-300 shadow-sm transition-colors">
              {/* Primary 1-Click New Tab Button */}
              <button
                type="button"
                onClick={() => handleCreateLocalTerminal(defaultShell || 'PowerShell')}
                className="flex items-center justify-center p-1 px-1.5 text-slate-400 hover:text-emerald-400 hover:bg-[#1f2638] rounded-l-md transition-colors cursor-pointer border-r border-[#1e2332]"
                title={`Mở thêm tab mới (${defaultShell || 'PowerShell'})`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {/* Dropdown Toggle for Other Shells & SSH */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsShellMenuOpen((prev) => !prev);
                }}
                className={`flex items-center justify-center p-1 px-1 text-slate-400 hover:text-emerald-400 hover:bg-[#1f2638] rounded-r-md transition-colors cursor-pointer ${
                  isShellMenuOpen ? 'bg-[#1f2638] text-emerald-400' : ''
                }`}
                title="Tùy chọn mở Shell khác (Command Prompt, Git Bash, WSL, SSH...)"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            {/* Shell Options Dropdown */}
            {isShellMenuOpen && (
              <div className="absolute left-0 top-8 z-50 bg-[#0E1526] border border-[#23314F] rounded-xl shadow-2xl py-2 min-w-[220px] flex flex-col text-xs animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1 text-[10px] uppercase font-mono text-slate-400 font-bold tracking-wider">
                  Shell Cục Bộ (Máy tính)
                </div>
                {effectiveShells.map((s) => (
                  <button
                    key={s.type}
                    type="button"
                    onClick={() => {
                      setIsShellMenuOpen(false);
                      handleCreateLocalTerminal(s.type);
                    }}
                    className="px-3 py-1.5 text-left text-slate-300 hover:bg-[#152038] hover:text-emerald-400 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <TerminalIcon className="w-3 h-3 text-emerald-400" />
                      <span>{s.displayName}</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{s.type}</span>
                  </button>
                ))}

                {sshProfiles.length > 0 && (
                  <>
                    <div className="h-[1px] bg-[#1E2A44] my-1" />
                    <div className="px-3 py-1 text-[10px] uppercase font-mono text-cyan-400 font-bold tracking-wider flex items-center justify-between">
                      <span>Máy Chủ SSH Từ Xa</span>
                      <Server className="w-3 h-3" />
                    </div>
                    {sshProfiles.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setIsShellMenuOpen(false);
                          handleCreateSshTerminal(p.id);
                        }}
                        className="px-3 py-1.5 text-left text-slate-300 hover:bg-[#152038] hover:text-cyan-300 transition-colors flex items-center gap-2 truncate cursor-pointer"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                        <span className="truncate font-medium">{p.name}</span>
                        <span className="text-[10px] text-slate-500 ml-auto font-mono shrink-0">{p.username}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Tools: Split view and Close all */}
        <div className="flex items-center gap-1.5 text-slate-400">
          <button
            type="button"
            onClick={() => setCopilotOpen((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
              copilotOpen
                ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                : 'bg-[#0E1526] text-slate-300 border-[#1A253C] hover:text-violet-300 hover:border-violet-500/30'
            }`}
            title="AI Copilot: mô tả việc cần làm, AI gợi ý lệnh shell"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Copilot</span>
          </button>

          <button
            type="button"
            onClick={() => setSnippetOpen((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
              snippetOpen
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-[#0E1526] text-slate-300 border-[#1A253C] hover:text-amber-300 hover:border-amber-500/30'
            }`}
            title="Snippet: lưu & chèn nhanh các lệnh terminal hay dùng"
          >
            <BookMarked className="w-3.5 h-3.5" />
            <span>Snippet</span>
          </button>

          <div className="w-[1px] h-3.5 bg-[#1E2A44]" />

          <div className="flex items-center bg-[#0E1526] rounded-md p-0.5 border border-[#1A253C]">
            <button
              type="button"
              onClick={() => setSplitMode('single')}
              className={`p-1 rounded ${
                splitMode === 'single'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200'
              } transition-colors cursor-pointer`}
              title="Một màn hình"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setSplitMode('vertical')}
              className={`p-1 rounded ${
                splitMode === 'vertical'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200'
              } transition-colors cursor-pointer`}
              title="Chia đôi theo chiều dọc"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setSplitMode('horizontal')}
              className={`p-1 rounded ${
                splitMode === 'horizontal'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200'
              } transition-colors cursor-pointer`}
              title="Chia đôi theo chiều ngang"
            >
              <Rows className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new Event('resize'));
              onShowToast('Đã căn chỉnh lại màn hình Terminal', 'info');
            }}
            className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-white/[0.04] transition-colors cursor-pointer"
            title="Căn chỉnh và làm mới màn hình Terminal (Fit)"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-3.5 bg-[#1E2A44]" />

          <button
            type="button"
            onClick={handleCloseAllTabs}
            disabled={tabs.length === 0}
            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 transition-colors cursor-pointer"
            title="Đóng toàn bộ các tab terminal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* AI Copilot Panel (H1) */}
      {copilotOpen && (
        <div className="w-full border-b border-[#1E2A44] bg-[#0A1120] px-4 py-3 flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400 shrink-0" />
            <input
              type="text"
              autoFocus
              value={copilotInput}
              onChange={(e) => setCopilotInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !copilotLoading) handleAskCopilot();
              }}
              placeholder={`Mô tả việc cần làm (vd "liệt kê 10 file lớn nhất") — shell: ${currentShellType}`}
              className="flex-1 bg-[#0E1526] text-slate-100 placeholder-slate-500 text-xs px-3 py-2 rounded-lg border border-[#23314F] focus:outline-none focus:border-violet-500/50"
            />
            <button
              type="button"
              onClick={handleAskCopilot}
              disabled={copilotLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/40 hover:bg-violet-500/30 transition-colors cursor-pointer disabled:opacity-50"
            >
              {copilotLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Hỏi AI
            </button>
          </div>

          {copilotResult && (
            <div className="flex flex-col gap-2 bg-[#0E1526] border border-[#1E2A44] rounded-lg p-3">
              <div className="flex items-center justify-between gap-2">
                <code className="flex-1 text-xs text-emerald-300 font-mono break-all bg-black/30 px-2 py-1.5 rounded">
                  {copilotResult.command}
                </code>
                <button
                  type="button"
                  onClick={handleInsertCopilotCommand}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors cursor-pointer shrink-0"
                >
                  <CornerDownLeft className="w-3.5 h-3.5" />
                  Chèn vào terminal
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{copilotResult.explanation}</p>
              {copilotResult.isPotentiallyDestructive && (
                <div className="flex items-start gap-2 text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-md px-2.5 py-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    Cảnh báo: lệnh này có thể <strong>phá hủy dữ liệu hoặc khó hoàn tác</strong>. Hãy kiểm tra kỹ trước
                    khi nhấn Enter. Lệnh chỉ được chèn, không tự động chạy.
                  </span>
                </div>
              )}
              {copilotResult.modelUsed && (
                <span className="text-[10px] text-slate-500 font-mono self-end">
                  {copilotResult.modelUsed} • {copilotResult.durationMs}ms
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Snippet / Command Manager Panel (N4) */}
      {snippetOpen && (
        <div className="w-full border-b border-[#1E2A44] bg-[#0A1120] px-4 py-3 flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-semibold text-amber-300">Snippet Lệnh</span>
            <input
              type="text"
              value={snippetSearch}
              onChange={(e) => setSnippetSearch(e.target.value)}
              placeholder="Tìm snippet..."
              className="ml-auto w-48 bg-[#0E1526] text-slate-100 placeholder-slate-500 text-xs px-3 py-1.5 rounded-lg border border-[#23314F] focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Add new snippet */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newSnippet.title}
              onChange={(e) => setNewSnippet((s) => ({ ...s, title: e.target.value }))}
              placeholder="Tên"
              className="w-32 bg-[#0E1526] text-slate-100 placeholder-slate-500 text-xs px-2.5 py-1.5 rounded-lg border border-[#23314F] focus:outline-none focus:border-amber-500/50"
            />
            <input
              type="text"
              value={newSnippet.command}
              onChange={(e) => setNewSnippet((s) => ({ ...s, command: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveSnippet();
              }}
              placeholder="Lệnh (vd: npm run dev)"
              className="flex-1 bg-[#0E1526] text-slate-100 placeholder-slate-500 text-xs font-mono px-2.5 py-1.5 rounded-lg border border-[#23314F] focus:outline-none focus:border-amber-500/50"
            />
            <input
              type="text"
              value={newSnippet.group}
              onChange={(e) => setNewSnippet((s) => ({ ...s, group: e.target.value }))}
              placeholder="Nhóm"
              className="w-24 bg-[#0E1526] text-slate-100 placeholder-slate-500 text-xs px-2.5 py-1.5 rounded-lg border border-[#23314F] focus:outline-none focus:border-amber-500/50"
            />
            <button
              type="button"
              onClick={handleSaveSnippet}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Lưu
            </button>
          </div>

          {/* Snippet list */}
          <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
            {filteredSnippets.length === 0 ? (
              <div className="text-[11px] text-slate-500 py-2 text-center">
                Chưa có snippet nào. Thêm lệnh hay dùng để chèn nhanh về sau.
              </div>
            ) : (
              filteredSnippets.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 bg-[#0E1526] border border-[#1E2A44] rounded-lg px-3 py-1.5 group"
                >
                  <span className="text-[10px] font-mono text-amber-400/70 bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">
                    {s.group}
                  </span>
                  <span className="text-xs text-slate-200 font-medium shrink-0 truncate max-w-[140px]">{s.title}</span>
                  <code className="flex-1 text-[11px] text-emerald-300 font-mono truncate">{s.command}</code>
                  {s.useCount > 0 && (
                    <span className="text-[10px] text-slate-500 shrink-0">×{s.useCount}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRunSnippet(s)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors cursor-pointer shrink-0"
                    title="Chèn vào terminal (không tự chạy)"
                  >
                    <CornerDownLeft className="w-3 h-3" />
                    Chèn
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSnippet(s.id)}
                    className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                    title="Xóa snippet"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Terminal Viewport */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-[#060911]">
        {tabs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-500">
            <TerminalIcon className="w-8 h-8 text-slate-600" />
            <span className="text-xs">Chưa có phiên Terminal nào mở.</span>
            <button
              type="button"
              onClick={() => handleCreateLocalTerminal('PowerShell')}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-colors cursor-pointer"
            >
              + Mở PowerShell Mới
            </button>
          </div>
        ) : splitMode === 'single' ? (
          tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                className={`w-full h-full ${isActive ? 'block' : 'hidden'}`}
                style={{ display: isActive ? 'block' : 'none' }}
              >
                <XTermInstance
                  sessionId={tab.id}
                  isActive={isActive}
                  isPageVisible={isPageVisible}
                  initialCommand={isActive ? pendingRunCommand : undefined}
                  onCommandExecuted={onClearPendingRunCommand}
                  injectText={isActive ? injectedCommand : undefined}
                  onInjected={() => setInjectedCommand(null)}
                  fontSize={terminalFontSize}
                  fontFamily={terminalFontFamily}
                  backgroundImage={terminalBackgroundImage}
                  backgroundOpacity={terminalBackgroundOpacity}
                  backgroundBlur={terminalBackgroundBlur}
                />
              </div>
            );
          })
        ) : splitMode === 'vertical' ? (
          <div className="w-full h-full grid grid-cols-2 divide-x divide-[#1E2A44]">
            <div className="w-full h-full overflow-hidden">
              {tabs[0] && (
                <XTermInstance
                  sessionId={tabs[0].id}
                  isActive={true}
                  isPageVisible={isPageVisible}
                  fontSize={terminalFontSize}
                  fontFamily={terminalFontFamily}
                  backgroundImage={terminalBackgroundImage}
                  backgroundOpacity={terminalBackgroundOpacity}
                  backgroundBlur={terminalBackgroundBlur}
                />
              )}
            </div>
            <div className="w-full h-full overflow-hidden">
              {tabs[1] ? (
                <XTermInstance
                  sessionId={tabs[1].id}
                  isActive={true}
                  isPageVisible={isPageVisible}
                  fontSize={terminalFontSize}
                  fontFamily={terminalFontFamily}
                  backgroundImage={terminalBackgroundImage}
                  backgroundOpacity={terminalBackgroundOpacity}
                  backgroundBlur={terminalBackgroundBlur}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  Mở thêm tab để sử dụng khung bên phải
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full h-full grid grid-rows-2 divide-y divide-[#1E2A44]">
            <div className="w-full h-full overflow-hidden">
              {tabs[0] && (
                <XTermInstance
                  sessionId={tabs[0].id}
                  isActive={true}
                  isPageVisible={isPageVisible}
                  fontSize={terminalFontSize}
                  fontFamily={terminalFontFamily}
                  backgroundImage={terminalBackgroundImage}
                  backgroundOpacity={terminalBackgroundOpacity}
                  backgroundBlur={terminalBackgroundBlur}
                />
              )}
            </div>
            <div className="w-full h-full overflow-hidden">
              {tabs[1] ? (
                <XTermInstance
                  sessionId={tabs[1].id}
                  isActive={true}
                  isPageVisible={isPageVisible}
                  fontSize={terminalFontSize}
                  fontFamily={terminalFontFamily}
                  backgroundImage={terminalBackgroundImage}
                  backgroundOpacity={terminalBackgroundOpacity}
                  backgroundBlur={terminalBackgroundBlur}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  Mở thêm tab để sử dụng khung bên dưới
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Independent Xterm component per session with real-time font, safe refit on tab switch & focus restoration
const XTermInstance: React.FC<{
  sessionId: string;
  isActive?: boolean;
  isPageVisible?: boolean;
  initialCommand?: string | null;
  onCommandExecuted?: () => void;
  injectText?: string | null;
  onInjected?: () => void;
  fontSize?: number;
  fontFamily?: string;
  backgroundImage?: string;
  backgroundOpacity?: number;
  backgroundBlur?: number;
}> = ({
  sessionId,
  isActive = true,
  isPageVisible = true,
  initialCommand,
  onCommandExecuted,
  injectText,
  onInjected,
  fontSize = 13,
  fontFamily = "'Cascadia Code', 'Fira Code', Consolas, monospace",
  backgroundImage,
  backgroundOpacity = 0.2,
  backgroundBlur = 2,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const isActiveRef = useRef<boolean>(isActive);
  const isPageVisibleRef = useRef<boolean>(isPageVisible);

  useEffect(() => {
    isActiveRef.current = isActive;
    isPageVisibleRef.current = isPageVisible;
  }, [isActive, isPageVisible]);

  // Safe refit & focus
  const doRefitAndFocus = () => {
    if (!containerRef.current || !xtermRef.current || !fitAddonRef.current) return;
    if (containerRef.current.clientWidth < 50 || containerRef.current.clientHeight < 50) return;

    try {
      fitAddonRef.current.fit();
      const term = xtermRef.current;
      if (term.cols > 0 && term.rows > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      }
      term.refresh(0, term.rows - 1);
      term.focus();
    } catch { }
  };

  // Re-fit and focus whenever this tab or terminal page becomes active/visible
  useEffect(() => {
    if (isActive && isPageVisible) {
      const t1 = setTimeout(doRefitAndFocus, 50);
      const t2 = setTimeout(doRefitAndFocus, 180);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isActive, isPageVisible]);

  // Handle commands sent to already-connected terminal (e.g. from AI CLI Assistant or run buttons)
  useEffect(() => {
    if (initialCommand && isActive && isPageVisible && wsRef.current?.readyState === WebSocket.OPEN) {
      const timer = setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(initialCommand + '\r');
          onCommandExecuted?.();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [initialCommand, isActive, isPageVisible, onCommandExecuted]);

  // Inject a command WITHOUT auto-running it (AI Copilot) — user reviews & presses Enter
  useEffect(() => {
    if (injectText && isActive && wsRef.current?.readyState === WebSocket.OPEN) {
      const timer = setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(injectText);
          xtermRef.current?.focus();
          onInjected?.();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [injectText, isActive, onInjected]);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontFamily: fontFamily,
      fontSize: fontSize,
      theme: {
        background: backgroundImage ? 'transparent' : '#060911',
        foreground: '#F1F5F9',
        cursor: '#10B981',
        selectionBackground: '#1E2A44',
        black: '#060911',
        red: '#F43F5E',
        green: '#10B981',
        yellow: '#FBBF24',
        blue: '#38BDF8',
        magenta: '#A855F7',
        cyan: '#06B6D4',
        white: '#F8FAFC',
      },
      allowTransparency: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(containerRef.current);
    if (containerRef.current.clientWidth >= 50 && containerRef.current.clientHeight >= 50) {
      try { fitAddon.fit(); } catch { }
    }

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Connect WebSocket
    const wsUrl = api.getTerminalWsUrl(sessionId);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (term.cols > 0 && term.rows > 0) {
        ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      }

      // If initialCommand is provided (e.g. from AI CLI Assistant), send it!
      if (initialCommand) {
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(initialCommand + '\r');
            onCommandExecuted?.();
          }
        }, 500);
      }
    };

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        term.write(event.data);
      } else if (event.data instanceof Blob) {
        event.data.text().then((text) => term.write(text));
      }
    };

    ws.onclose = () => {
      term.write('\r\n\x1b[33m[DevDock: Phiên terminal đã kết thúc]\x1b[0m\r\n');
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      if (!isActiveRef.current || !isPageVisibleRef.current) return;
      if (!containerRef.current || containerRef.current.clientWidth < 50 || containerRef.current.clientHeight < 50) {
        return;
      }
      try {
        fitAddon.fit();
        if (term.cols > 0 && term.rows > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
        }
      } catch { }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      try { ws.close(); } catch { }
      term.dispose();
    };
  }, [sessionId]);

  // Update font size or family if changed
  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.fontSize = fontSize;
      xtermRef.current.options.fontFamily = fontFamily;
      doRefitAndFocus();
    }
  }, [fontSize, fontFamily]);

  return (
    <div
      onClick={() => xtermRef.current?.focus()}
      className="relative w-full h-full bg-[#060911] overflow-hidden cursor-text"
    >
      {backgroundImage && (
        <div
          className="absolute inset-0 pointer-events-none bg-cover bg-center transition-all duration-300"
          style={{
            backgroundImage: `url('${backgroundImage}')`,
            opacity: backgroundOpacity,
            filter: `blur(${backgroundBlur}px)`,
          }}
        />
      )}
      <div ref={containerRef} className="relative z-10 w-full h-full" />
    </div>
  );
};
