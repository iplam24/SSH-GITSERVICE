import React from 'react';
import {
  FolderGit2,
  Server,
  GitBranch,
  Terminal,
  Cpu,
  HardDrive,
  Activity,
  ArrowUpRight,
  Play,
  ExternalLink,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { ProjectItem, SshProfile, SystemMetrics, GitRepoStatus } from '../types';
import { NavRoute } from '../components/Sidebar';

interface HomePageProps {
  metrics: SystemMetrics | null;
  projects: ProjectItem[];
  sshProfiles: SshProfile[];
  gitStatus: GitRepoStatus | null;
  activeRepoPath: string;
  activeAiModel?: string;
  onNavigate: (route: NavRoute) => void;
  onOpenTerminalForProject: (p: ProjectItem) => void;
  onOpenTerminalForPath?: (path: string) => void;
  onConnectSsh: (p: SshProfile) => void;
  onRunProjectDev: (p: ProjectItem) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  metrics,
  projects,
  sshProfiles,
  gitStatus,
  activeRepoPath,
  activeAiModel,
  onNavigate,
  onOpenTerminalForProject,
  onOpenTerminalForPath,
  onConnectSsh,
  onRunProjectDev,
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  return (
    <div className="w-full h-full overflow-y-auto p-5 flex flex-col gap-5 max-w-7xl mx-auto bg-[#0c0d12] min-h-0">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1a1e2a]">
        <div>
          <h1 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            {getGreeting()} 👋
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Trung tâm Điều khiển DevDock • {metrics?.machineName ?? 'Windows Workstation'} • {metrics?.osVersion ?? 'Windows 11'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('ai')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#12151f] hover:bg-[#171b26] text-slate-200 border border-[#1e2332] text-xs font-medium transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>Trợ lý AI {activeAiModel ? `(${activeAiModel})` : ''}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('projects')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#12151f] hover:bg-[#171b26] text-slate-200 border border-[#1e2332] text-xs font-medium transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-slate-400" />
            <span>Thêm Dự án</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('terminal')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#12151f] hover:bg-[#171b26] text-slate-200 border border-[#1e2332] text-xs font-medium transition-colors cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5 text-slate-400" />
            <span>Terminal</span>
          </button>
        </div>
      </div>

      {/* System Metrics Cards */}
      {metrics && (() => {
        const cpu = metrics?.cpuUsagePercent ?? (metrics as any)?.CpuUsagePercent ?? 0;
        const ram = metrics?.ramUsagePercent ?? (metrics as any)?.RamUsagePercent ?? 0;
        const usedRam = metrics?.usedRamMb ?? (metrics as any)?.UsedRamMb ?? 0;
        const totalRam = metrics?.totalRamMb ?? (metrics as any)?.TotalRamMb ?? 0;
        const diskUsage = metrics?.diskUsagePercent ?? (metrics as any)?.DiskUsagePercent ?? 0;
        const diskFree = metrics?.diskFreeGb ?? (metrics as any)?.DiskFreeGb ?? 0;
        const netRecv = metrics?.networkReceivedKbps ?? (metrics as any)?.NetworkReceivedKbps ?? 0;
        const netSent = metrics?.networkSentKbps ?? (metrics as any)?.NetworkSentKbps ?? 0;

        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* CPU Card */}
            <div className="bg-[#12151f] border border-[#1b202e] hover:border-[#283046] rounded-lg p-3.5 flex flex-col justify-between relative overflow-hidden group shadow-sm transition-all">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="font-medium">Tải CPU</span>
                <Cpu className="w-4 h-4 text-emerald-500/80" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-xl font-bold font-mono text-slate-100">
                  {cpu.toFixed(0)}%
                </span>
                <span className="text-[11px] text-slate-500">Tổng tải</span>
              </div>
              <div className="w-full bg-[#181d2a] h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full bg-emerald-500/90 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(cpu, 100)}%` }}
                />
              </div>
            </div>

            {/* RAM Card */}
            <div className="bg-[#12151f] border border-[#1b202e] hover:border-[#283046] rounded-lg p-3.5 flex flex-col justify-between relative overflow-hidden group shadow-sm transition-all">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="font-medium">Bộ nhớ RAM</span>
                <HardDrive className="w-4 h-4 text-blue-500/80" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-xl font-bold font-mono text-slate-100">
                  {ram.toFixed(0)}%
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {(usedRam / 1024).toFixed(1)} / {(totalRam / 1024).toFixed(0)} GB
                </span>
              </div>
              <div className="w-full bg-[#181d2a] h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full bg-blue-500/90 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(ram, 100)}%` }}
                />
              </div>
            </div>

            {/* Disk Card */}
            <div className="bg-[#12151f] border border-[#1b202e] hover:border-[#283046] rounded-lg p-3.5 flex flex-col justify-between relative overflow-hidden group shadow-sm transition-all">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="font-medium">Ổ đĩa hệ thống</span>
                <HardDrive className="w-4 h-4 text-amber-500/80" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-xl font-bold font-mono text-slate-100">
                  {diskUsage.toFixed(0)}%
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {diskFree.toFixed(0)} GB trống
                </span>
              </div>
              <div className="w-full bg-[#181d2a] h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full bg-amber-500/90 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(diskUsage, 100)}%` }}
                />
              </div>
            </div>

            {/* Network / Activity */}
            <div className="bg-[#12151f] border border-[#1b202e] hover:border-[#283046] rounded-lg p-3.5 flex flex-col justify-between relative overflow-hidden group shadow-sm transition-all">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="font-medium">Lưu lượng Mạng</span>
                <Activity className="w-4 h-4 text-purple-500/80" />
              </div>
              <div className="mt-2 flex flex-col font-mono text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Tải về:</span>
                  <span className="text-emerald-400 font-medium">
                    {netRecv > 1024
                      ? `${(netRecv / 1024).toFixed(1)} MB/s`
                      : `${netRecv.toFixed(0)} KB/s`}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-slate-500">Tải lên:</span>
                  <span className="text-blue-400 font-medium">
                    {netSent > 1024
                      ? `${(netSent / 1024).toFixed(1)} MB/s`
                      : `${netSent.toFixed(0)} KB/s`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Main Grid: Projects, SSH, Git */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column (2 cols): Projects & Git */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Projects Card */}
          <div className="bg-[#12151f] border border-[#1b202e] rounded-lg p-4 flex flex-col gap-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-slate-400" />
                <h2 className="text-xs font-semibold text-slate-100 uppercase tracking-wider">Dự án Đã Đăng Ký</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('projects')}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 font-medium cursor-pointer transition-colors"
              >
                <span>Xem tất cả ({projects.length})</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs border border-dashed border-[#1e2332] rounded-md">
                Chưa có dự án nào. Nhấn "+ Thêm Dự án" để liên kết thư mục mã nguồn!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {projects.slice(0, 4).map((project) => (
                  <div
                    key={project.id}
                    className="p-3 rounded-md bg-[#161a26] border border-[#202638] hover:border-[#2b334a] transition-colors flex flex-col justify-between gap-2.5 group"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-200 group-hover:text-accent transition-colors truncate">
                          {project.name}
                        </span>
                        {project.isGitRepository && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/[0.04] text-slate-400 border border-white/[0.08] font-mono">
                            git
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono truncate block mt-0.5">
                        {project.path}
                      </span>
                    </div>

                    {/* Quick actions */}
                    <div className="flex items-center gap-1.5 pt-2 border-t border-[#202638]">
                      {project.commands.dev && (
                        <button
                          type="button"
                          onClick={() => onRunProjectDev(project)}
                          className="px-2 py-0.5 rounded bg-[#12151f] hover:bg-[#1b2030] text-slate-300 border border-[#22283a] text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                          title={`Chạy: ${project.commands.dev}`}
                        >
                          <Play className="w-3 h-3 text-emerald-400" />
                          <span>Dev</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenTerminalForProject(project)}
                        className="px-2 py-0.5 rounded bg-[#12151f] hover:bg-[#1b2030] text-slate-300 border border-[#22283a] text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        title="Mở Terminal trong thư mục dự án"
                      >
                        <Terminal className="w-3 h-3 text-slate-400" />
                        <span>Terminal</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Git Repository Quick Overview */}
          <div className="bg-[#12151f] border border-[#1b202e] rounded-lg p-4 flex flex-col gap-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-slate-400" />
                <h2 className="text-xs font-semibold text-slate-100 uppercase tracking-wider">Trạng Thái Git Hiện Tại</h2>
              </div>
              <div className="flex items-center gap-3">
                {activeRepoPath && onOpenTerminalForPath && (
                  <button
                    type="button"
                    onClick={() => onOpenTerminalForPath(activeRepoPath)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium cursor-pointer transition-colors"
                    title={`Mở Terminal tại "${activeRepoPath}"`}
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Terminal</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onNavigate('git')}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 font-medium cursor-pointer transition-colors"
                >
                  <span>Mở Quản lý Git</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {gitStatus ? (
              <div className="p-3 bg-[#161a26] rounded-md border border-[#202638] flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-semibold text-slate-200">{gitStatus.currentBranch}</span>
                    {gitStatus.upstreamBranch && (
                      <span className="text-slate-500 text-[11px]">→ {gitStatus.upstreamBranch}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {gitStatus.aheadCount > 0 && (
                      <span className="text-emerald-400 font-mono text-[11px]">
                        ↑ {gitStatus.aheadCount}
                      </span>
                    )}
                    {gitStatus.behindCount > 0 && (
                      <span className="text-amber-400 font-mono text-[11px]">
                        ↓ {gitStatus.behindCount}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-slate-400 pt-2 border-t border-[#202638]">
                  <span>
                    Đã Stage: <strong className="text-emerald-400">{gitStatus.stagedFiles.length}</strong>
                  </span>
                  <span>
                    Chưa Stage:{' '}
                    <strong className="text-amber-400">{gitStatus.unstagedFiles.length}</strong>
                  </span>
                  <span>
                    Chưa theo dõi:{' '}
                    <strong className="text-slate-400">{gitStatus.untrackedFiles.length}</strong>
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-slate-500 text-xs border border-dashed border-[#1e2332] rounded-md">
                Chưa chọn kho Git đang hoạt động. Chuyển sang tab Quản lý Git để chọn kho.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: SSH Connections & Quick Help */}
        <div className="flex flex-col gap-5">
          {/* SSH Connections */}
          <div className="bg-[#12151f] border border-[#1b202e] rounded-lg p-4 flex flex-col gap-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-slate-400" />
                <h2 className="text-xs font-semibold text-slate-100 uppercase tracking-wider">Máy Chủ SSH</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('ssh')}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 font-medium cursor-pointer transition-colors"
              >
                <span>Quản lý</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {sshProfiles.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs border border-dashed border-[#1e2332] rounded-md">
                Chưa có cấu hình SSH nào. Nhấn "Quản lý" để thêm máy chủ!
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {sshProfiles.slice(0, 5).map((profile) => (
                  <div
                    key={profile.id}
                    className="p-2.5 rounded-md bg-[#161a26] border border-[#202638] flex items-center justify-between group hover:border-[#2b334a] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 flex-shrink-0" />
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-xs font-medium text-slate-200 truncate">
                          {profile.name}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono truncate">
                          {profile.username}@{profile.host}:{profile.port}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onConnectSsh(profile)}
                      className="px-2 py-1 rounded bg-[#12151f] hover:bg-[#1b2030] text-slate-300 border border-[#22283a] text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>Kết nối</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Launcher Card */}
          <div className="bg-[#12151f] border border-[#1b202e] rounded-lg p-4 flex flex-col gap-3 shadow-sm">
            <h2 className="text-xs font-semibold text-slate-100 uppercase tracking-wider">Phím Tắt Toàn Cục</h2>
            <div className="flex flex-col gap-2 text-xs text-slate-400 font-mono">
              <div className="flex items-center justify-between py-1 border-b border-[#1e2332]">
                <span className="text-slate-300">Khởi chạy nhanh</span>
                <kbd className="px-1.5 py-0.5 rounded bg-[#0e1017] text-slate-300 border border-[#1e2332]">
                  Ctrl + Space
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#1e2332]">
                <span className="text-slate-300">Bảng điều khiển lệnh</span>
                <kbd className="px-1.5 py-0.5 rounded bg-[#0e1017] text-slate-300 border border-[#1e2332]">
                  Ctrl + Shift + P
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#1e2332]">
                <span className="text-slate-300">Mở Terminal</span>
                <kbd className="px-1.5 py-0.5 rounded bg-[#0e1017] text-slate-300 border border-[#1e2332]">
                  Ctrl + Shift + T
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#1e2332]">
                <span className="text-slate-300">Quản lý Git</span>
                <kbd className="px-1.5 py-0.5 rounded bg-[#0e1017] text-slate-300 border border-[#1e2332]">
                  Ctrl + Shift + G
                </kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
