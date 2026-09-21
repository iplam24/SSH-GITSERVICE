import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { TerminalSessionInfo, TerminalShellType, ShellDescriptor, SshProfile } from '../types';
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
  initialSessions?: TerminalSessionInfo[];
  pendingSshProfileId?: string | null;
  onClearPendingSsh?: () => void;
  pendingRunCommand?: string | null;
  onClearPendingRunCommand?: () => void;
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
  initialSessions = [],
  pendingSshProfileId,
  onClearPendingSsh,
  pendingRunCommand,
  onClearPendingRunCommand,
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

  // Initialize first terminal if none exist and not connecting to SSH
  useEffect(() => {
    if (tabs.length === 0 && !pendingSshProfileId) {
      handleCreateLocalTerminal('PowerShell');
    }
  }, []);

  // Handle pending SSH connection triggered from SshPage or HomePage
  useEffect(() => {
    if (pendingSshProfileId) {
      handleCreateSshTerminal(pendingSshProfileId);
      onClearPendingSsh?.();
    }
  }, [pendingSshProfileId]);

  const handleCreateLocalTerminal = async (shellType: TerminalShellType = 'PowerShell', cwd?: string) => {
    try {
      const session = await api.createTerminal(shellType, cwd, 80, 24);
      const newTab: TerminalTab = {
        id: session.sessionId,
        session,
        title: session.title,
        paneIndex: 0,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
      setActivePaneTabIds((prev) => ({ ...prev, 0: newTab.id }));
    } catch (err: any) {
      onShowToast(err.message || 'Không thể khởi tạo phiên Terminal', 'error');
    }
  };

  const handleCreateSshTerminal = async (profileId: string) => {
    const profile = sshProfiles.find((p) => p.id === profileId);
    const profileName = profile ? `${profile.username}@${profile.host}` : profileId;
    onShowToast(`Đang kết nối SSH tới ${profileName}...`, 'info');

    try {
      const session = await api.connectSshTerminal(profileId, 80, 24);
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
    <div className="flex-1 flex flex-col h-full bg-[#060911] overflow-hidden select-none">
      {/* Terminal Top Control Bar */}
      <div className="h-9 bg-[#090D16] border-b border-[#1A2235] px-2 flex items-center justify-between flex-shrink-0">
        {/* Terminal Tabs List */}
        <div className="flex items-center gap-1 overflow-x-auto flex-1 h-full py-1">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const isSsh = tab.session?.shellType === 'Ssh' || tab.title.startsWith('SSH:');

            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-2 px-3 py-1 rounded-t-lg text-xs font-mono cursor-pointer transition-all border-t-2 ${
                  isActive
                    ? isSsh
                      ? 'bg-[#060911] text-cyan-200 border-cyan-400 font-medium shadow-glow-cyan'
                      : 'bg-[#060911] text-slate-100 border-emerald-400 font-medium shadow-glow-emerald'
                    : 'bg-[#0E1526]/70 text-slate-400 border-transparent hover:bg-[#141E34] hover:text-slate-200'
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

          {/* Plus / New Tab button with Dropdown */}
          <div className="relative ml-1">
            <button
              type="button"
              onClick={() => setIsShellMenuOpen(!isShellMenuOpen)}
              className="flex items-center gap-1 p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-[#141E34] transition-colors cursor-pointer"
              title="Mở thêm Terminal mới"
            >
              <Plus className="w-3.5 h-3.5" />
              <ChevronDown className="w-3 h-3" />
            </button>

            {/* Shell Options Dropdown */}
            {isShellMenuOpen && (
              <div className="absolute left-0 top-8 z-50 bg-[#0E1526] border border-[#23314F] rounded-xl shadow-2xl py-2 min-w-[210px] flex flex-col text-xs animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1 text-[10px] uppercase font-mono text-slate-400 font-bold tracking-wider">
                  Shell Cục Bộ (Máy tính)
                </div>
                {shells.map((s) => (
                  <button
                    key={s.type}
                    type="button"
                    onClick={() => {
                      setIsShellMenuOpen(false);
                      handleCreateLocalTerminal(s.type);
                    }}
                    className="px-3 py-1.5 text-left text-slate-300 hover:bg-[#152038] hover:text-emerald-400 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>{s.displayName}</span>
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
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        <span className="truncate font-medium">{p.name}</span>
                        <span className="text-[10px] text-slate-500 ml-auto font-mono">{p.username}</span>
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
          tabs.map((tab) => (
            <div
              key={tab.id}
              className={`w-full h-full ${tab.id === activeTabId ? 'block' : 'hidden'}`}
            >
              <XTermInstance
                sessionId={tab.id}
                initialCommand={tab.id === activeTabId ? pendingRunCommand : undefined}
                onCommandExecuted={onClearPendingRunCommand}
                fontSize={terminalFontSize}
                fontFamily={terminalFontFamily}
                backgroundImage={terminalBackgroundImage}
                backgroundOpacity={terminalBackgroundOpacity}
                backgroundBlur={terminalBackgroundBlur}
              />
            </div>
          ))
        ) : splitMode === 'vertical' ? (
          <div className="w-full h-full grid grid-cols-2 divide-x divide-[#1E2A44]">
            <div className="w-full h-full overflow-hidden">
              {tabs[0] && (
                <XTermInstance
                  sessionId={tabs[0].id}
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

// Independent Xterm component per session with real-time font and command runner
const XTermInstance: React.FC<{
  sessionId: string;
  initialCommand?: string | null;
  onCommandExecuted?: () => void;
  fontSize?: number;
  fontFamily?: string;
  backgroundImage?: string;
  backgroundOpacity?: number;
  backgroundBlur?: number;
}> = ({
  sessionId,
  initialCommand,
  onCommandExecuted,
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
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Connect WebSocket
    const wsUrl = api.getTerminalWsUrl(sessionId);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));

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
      try {
        fitAddon.fit();
        if (ws.readyState === WebSocket.OPEN) {
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
      fitAddonRef.current?.fit();
    }
  }, [fontSize, fontFamily]);

  return (
    <div className="relative w-full h-full bg-[#060911] overflow-hidden">
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
