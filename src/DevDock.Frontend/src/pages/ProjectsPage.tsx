import React, { useState } from 'react';
import {
  FolderGit2,
  Plus,
  Play,
  Hammer,
  TestTube,
  ExternalLink,
  Terminal,
  Trash2,
  Star,
  Code2,
  X,
  Search,
  Check,
  AlertCircle,
  FolderOpen,
  Rocket,
  Settings2,
} from 'lucide-react';
import { ProjectItem, DevEnvProfile } from '../types';
import { api } from '../services/api';
import { useConfirm } from '../context/ConfirmContext';

interface ProjectsPageProps {
  projects: ProjectItem[];
  onRefreshProjects: () => void;
  onOpenTerminalForProject: (p: ProjectItem) => void;
  onOpenGitForProject: (p: ProjectItem) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({
  projects,
  onRefreshProjects,
  onOpenTerminalForProject,
  onOpenGitForProject,
  onShowToast,
}) => {
  const confirm = useConfirm();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [inputPath, setInputPath] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [newProject, setNewProject] = useState<Partial<ProjectItem>>({
    name: '',
    path: '',
    commands: { dev: '', build: '', test: '' },
    tags: [],
    favorite: false,
  });

  // Runner state
  const [runningCmd, setRunningCmd] = useState<{ projectId: string; cmdKey: string } | null>(null);
  const [cmdOutput, setCmdOutput] = useState<{ title: string; output: string; success: boolean } | null>(null);

  // Dev Environment (N5)
  const [devEnvProject, setDevEnvProject] = useState<ProjectItem | null>(null);
  const [devEnvProfiles, setDevEnvProfiles] = useState<DevEnvProfile[]>([]);
  const [devEnvLoading, setDevEnvLoading] = useState(false);
  const [launchingProfileId, setLaunchingProfileId] = useState<string | null>(null);
  const [newProfile, setNewProfile] = useState<Partial<DevEnvProfile>>({
    name: 'Default',
    openEditor: true,
    editor: 'code',
    openTerminal: true,
    devCommandKey: 'dev',
    urls: [],
  });
  const [urlInput, setUrlInput] = useState('');

  const openDevEnv = async (p: ProjectItem) => {
    setDevEnvProject(p);
    setDevEnvLoading(true);
    setNewProfile({
      name: 'Default',
      openEditor: true,
      editor: 'code',
      openTerminal: true,
      devCommandKey: Object.keys(p.commands || {})[0] || 'dev',
      urls: [],
    });
    setUrlInput('');
    try {
      const res = await api.getDevEnvProfiles(p.id);
      setDevEnvProfiles(res || []);
    } catch {
      setDevEnvProfiles([]);
    } finally {
      setDevEnvLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!devEnvProject) return;
    if (!newProfile.name?.trim()) {
      onShowToast('Nhập tên profile môi trường', 'error');
      return;
    }
    try {
      await api.saveDevEnvProfile({
        ...newProfile,
        projectId: devEnvProject.id,
        name: newProfile.name.trim(),
        editor: newProfile.editor?.trim() || 'code',
        urls: newProfile.urls || [],
      });
      onShowToast('Đã lưu profile môi trường', 'success');
      const res = await api.getDevEnvProfiles(devEnvProject.id);
      setDevEnvProfiles(res || []);
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi lưu profile', 'error');
    }
  };

  const handleLaunchProfile = async (profile: DevEnvProfile) => {
    setLaunchingProfileId(profile.id);
    try {
      const res = await api.launchDevEnv(profile.id);
      if (res.success) {
        onShowToast(`Đã khởi chạy môi trường: ${res.actions.length} thao tác`, 'success');
        setCmdOutput({
          title: `One-Click Dev Env: ${profile.name}`,
          output: res.actions.join('\n'),
          success: true,
        });
      } else {
        onShowToast(res.errorMessage || 'Lỗi khởi chạy môi trường', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi khởi chạy môi trường', 'error');
    } finally {
      setLaunchingProfileId(null);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (!devEnvProject) return;
    try {
      await api.deleteDevEnvProfile(id);
      const res = await api.getDevEnvProfiles(devEnvProject.id);
      setDevEnvProfiles(res || []);
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi xóa profile', 'error');
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDetectPath = async () => {
    if (!inputPath.trim()) return;
    setDetecting(true);
    try {
      const detected = await api.detectProject(inputPath.trim());
      setNewProject(detected);
      onShowToast(`Đã nhận diện dự án '${detected.name}'`, 'info');
    } catch (err: any) {
      onShowToast(err.message || 'Không thể quét nhận diện dự án tại đường dẫn này', 'error');
    } finally {
      setDetecting(false);
    }
  };

  const handleBrowseFolder = async () => {
    try {
      const res = await api.browseFolder(inputPath);
      if (res && res.folder) {
        setInputPath(res.folder);
        // Automatically trigger detection
        setDetecting(true);
        try {
          const detected = await api.detectProject(res.folder);
          setNewProject(detected);
          onShowToast(`Đã nhận diện dự án '${detected.name}'`, 'info');
        } catch {
          setNewProject((prev) => ({ ...prev, path: res.folder! }));
        } finally {
          setDetecting(false);
        }
      }
    } catch (err: any) {
      onShowToast(err.message || 'Không thể mở hộp thoại chọn thư mục', 'error');
    }
  };

  const handleSaveProject = async () => {
    if (!newProject.name || !newProject.path) {
      onShowToast('Vui lòng nhập Tên dự án và Đường dẫn thư mục', 'error');
      return;
    }

    try {
      await api.saveProject(newProject);
      setIsAddModalOpen(false);
      setInputPath('');
      setNewProject({ name: '', path: '', commands: {}, tags: [], favorite: false });
      onRefreshProjects();
      onShowToast('Đã lưu dự án thành công!', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Không thể lưu dự án', 'error');
    }
  };

  const handleDeleteProject = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Xóa Dự Án',
      message: `Bạn có chắc muốn xóa dự án '${name}' khỏi DevDock?`,
      confirmText: 'Xóa Dự Án',
      type: 'danger',
    });
    if (!ok) return;
    try {
      await api.deleteProject(id);
      onRefreshProjects();
      onShowToast(`Đã xóa dự án '${name}'`, 'info');
    } catch (err: any) {
      onShowToast(err.message || 'Xóa dự án thất bại', 'error');
    }
  };

  const handleToggleFavorite = async (p: ProjectItem) => {
    try {
      await api.saveProject({ ...p, favorite: !p.favorite });
      onRefreshProjects();
    } catch { }
  };

  const handleRunCommand = async (p: ProjectItem, cmdKey: string) => {
    setRunningCmd({ projectId: p.id, cmdKey });
    setCmdOutput({ title: `${p.name} — ${cmdKey}`, output: 'Đang thực thi lệnh...\n', success: true });
    try {
      const res = await api.runProjectCommand(p.id, cmdKey);
      setCmdOutput({
        title: `${p.name} — ${cmdKey} (Mã thoát: ${res.exitCode})`,
        output: res.output || (res.success ? 'Lệnh hoàn thành với mã thoát 0.' : 'Lệnh thất bại không có đầu ra.'),
        success: res.success,
      });
      if (res.success) {
        onShowToast(`Lệnh '${cmdKey}' hoàn tất thành công`, 'success');
      } else {
        onShowToast(`Lệnh '${cmdKey}' thất bại (mã thoát ${res.exitCode})`, 'error');
      }
    } catch (err: any) {
      setCmdOutput({
        title: `${p.name} — ${cmdKey} (Lỗi)`,
        output: err.message || 'Lỗi thực thi lệnh',
        success: false,
      });
      onShowToast(err.message || 'Thực thi lệnh thất bại', 'error');
    } finally {
      setRunningCmd(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden w-full h-full min-h-0 bg-[#0c0d12] p-4 sm:p-5">
      <div className="max-w-7xl mx-auto w-full h-full flex flex-col gap-4 sm:gap-5 min-h-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1a1e2a]">
        <div>
          <h1 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-slate-400" />
            <span>Quản Lý Dự Án & Codebase</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Đăng ký, khởi chạy dev server, build và quản lý luồng làm việc dự án của bạn.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm dự án (Tên, Thư mục, Tag)..."
              className="w-full bg-[#12151f] border border-[#1e2332] rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accent"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setNewProject({ name: '', path: '', commands: { dev: '', build: '', test: '' }, tags: [], favorite: false });
              setInputPath('');
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-colors shadow-sm cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Dự Án</span>
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        {filteredProjects.length === 0 ? (
          <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center">
            <FolderGit2 className="w-10 h-10 text-slate-600 mb-2 stroke-1" />
            <p className="text-sm font-medium text-slate-400">Không tìm thấy dự án phù hợp bộ lọc</p>
            <p className="text-xs text-slate-600 mt-1">Đăng ký dự án mới bằng cách nhấn "+ Thêm Dự Án" ở trên</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(310px,1fr))] gap-3.5">
            {filteredProjects.map((p) => {
              return (
                <div
                  key={p.id}
                  className="bg-[#12151f] border border-[#1b202e] hover:border-[#283046] rounded-lg p-3.5 flex flex-col justify-between gap-3.5 transition-all shadow-sm group"
                >
                  {/* Top: Name & Favorite */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded-md bg-[#161a26] border border-[#202638] flex items-center justify-center font-bold text-xs text-slate-300 flex-shrink-0">
                        {p.icon === 'dotnet'
                          ? 'C#'
                          : p.icon === 'node'
                          ? 'JS'
                          : p.icon === 'rust'
                          ? 'RS'
                          : p.icon === 'go'
                          ? 'GO'
                          : p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="font-semibold text-xs text-slate-200 truncate group-hover:text-accent transition-colors">
                          {p.name}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono truncate" title={p.path}>
                          {p.path}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleFavorite(p)}
                      className="p-1 rounded text-slate-500 hover:text-amber-400 transition-colors cursor-pointer"
                      title={p.favorite ? 'Bỏ yêu thích' : 'Đánh dấu yêu thích'}
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${p.favorite ? 'text-amber-400 fill-amber-400' : ''}`}
                      />
                    </button>
                  </div>

                  {/* Tags */}
                  {p.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {p.tags.map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.2 rounded bg-[#161a26] text-slate-400 border border-[#202638] text-[10px] font-mono"
                        >
                          {t}
                        </span>
                      ))}
                      {p.isGitRepository && (
                        <span className="px-1.5 py-0.2 rounded bg-white/[0.04] text-slate-400 border border-white/[0.08] text-[10px] font-mono">
                          git
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="pt-2.5 border-t border-[#1a1f2c] flex flex-col gap-2">
                    {/* Dev / Build / Test Commands */}
                    <div className="flex items-center gap-1.5">
                      {p.commands.dev && (
                        <button
                          type="button"
                          onClick={() => handleRunCommand(p, 'dev')}
                          disabled={runningCmd?.projectId === p.id}
                          className="flex-1 py-1 px-2 rounded-md bg-[#161a26] hover:bg-[#1d2232] text-slate-300 text-xs font-medium flex items-center justify-center gap-1 transition-colors border border-[#202638] cursor-pointer whitespace-nowrap"
                          title={`Chạy: ${p.commands.dev}`}
                        >
                          <Play className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>Dev</span>
                        </button>
                      )}
                      {p.commands.build && (
                        <button
                          type="button"
                          onClick={() => handleRunCommand(p, 'build')}
                          disabled={runningCmd?.projectId === p.id}
                          className="flex-1 py-1 px-2 rounded-md bg-[#161a26] hover:bg-[#1d2232] text-slate-300 text-xs font-medium flex items-center justify-center gap-1 transition-colors border border-[#202638] cursor-pointer whitespace-nowrap"
                          title={`Chạy: ${p.commands.build}`}
                        >
                          <Hammer className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>Build</span>
                        </button>
                      )}
                      {p.commands.test && (
                        <button
                          type="button"
                          onClick={() => handleRunCommand(p, 'test')}
                          disabled={runningCmd?.projectId === p.id}
                          className="flex-1 py-1 px-2 rounded-md bg-[#161a26] hover:bg-[#1d2232] text-slate-300 text-xs font-medium flex items-center justify-center gap-1 transition-colors border border-[#202638] cursor-pointer whitespace-nowrap"
                          title={`Chạy: ${p.commands.test}`}
                        >
                          <TestTube className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>Test</span>
                        </button>
                      )}
                    </div>

                    {/* Quick utility launches */}
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-0.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => api.openExplorer(p.path)}
                          className="hover:text-slate-200 transition-colors cursor-pointer"
                          title="Mở thư mục trong Windows Explorer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => api.openEditor(p.path, 'code')}
                          className="hover:text-slate-200 transition-colors cursor-pointer"
                          title="Mở trong VS Code"
                        >
                          <Code2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenTerminalForProject(p)}
                          className="hover:text-slate-200 transition-colors cursor-pointer"
                          title="Mở Terminal tại thư mục dự án"
                        >
                          <Terminal className="w-3.5 h-3.5" />
                        </button>
                        {p.isGitRepository && (
                          <button
                            type="button"
                            onClick={() => onOpenGitForProject(p)}
                            className="hover:text-emerald-400 transition-colors text-[11px] font-mono cursor-pointer"
                            title="Kiểm tra Git Repository"
                          >
                            Git
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openDevEnv(p)}
                          className="hover:text-violet-400 transition-colors cursor-pointer"
                          title="One-Click Dev Environment: mở editor + terminal + dev server + URL"
                        >
                          <Rocket className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteProject(p.id, p.name)}
                        className="hover:text-rose-400 transition-colors p-1 cursor-pointer"
                        title="Xóa dự án"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Inline Command Output Drawer */}
      {cmdOutput && (
        <div className="bg-[#0B0F17] border border-[#1E293B] rounded-xl p-4 flex flex-col gap-2 shadow-2xl animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-2">
            <div className="flex items-center gap-2 text-xs font-semibold">
              {cmdOutput.success ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              )}
              <span className="text-slate-200">{cmdOutput.title}</span>
            </div>
            <button
              type="button"
              onClick={() => setCmdOutput(null)}
              className="p-1 text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <pre className="text-xs font-mono text-slate-300 bg-[#070A0F] p-3 rounded-lg overflow-x-auto max-h-48 whitespace-pre-wrap selectable">
            {cmdOutput.output}
          </pre>
        </div>
      )}

      {/* Dev Environment Modal (N5) */}
      {devEnvProject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#334155] rounded-xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Rocket className="w-5 h-5 text-violet-400" />
                <span>One-Click Dev Env — {devEnvProject.name}</span>
              </h2>
              <button
                type="button"
                onClick={() => setDevEnvProject(null)}
                className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Existing profiles */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] uppercase font-mono text-slate-400 font-bold tracking-wider">
                Profile đã lưu
              </span>
              {devEnvLoading ? (
                <div className="text-xs text-slate-500">Đang tải...</div>
              ) : devEnvProfiles.length === 0 ? (
                <div className="text-xs text-slate-500">Chưa có profile. Tạo mới bên dưới.</div>
              ) : (
                devEnvProfiles.map((prof) => (
                  <div
                    key={prof.id}
                    className="flex items-center gap-2 bg-[#0E1526] border border-[#1E2A44] rounded-lg px-3 py-2"
                  >
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-xs font-semibold text-slate-200">{prof.name}</span>
                      <span className="text-[10px] text-slate-500 truncate">
                        {[
                          prof.openEditor && `editor(${prof.editor})`,
                          prof.openTerminal && 'terminal',
                          prof.devCommandKey && `cmd:${prof.devCommandKey}`,
                          prof.urls?.length > 0 && `${prof.urls.length} URL`,
                        ]
                          .filter(Boolean)
                          .join(' • ')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLaunchProfile(prof)}
                      disabled={launchingProfileId === prof.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/40 hover:bg-violet-500/30 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      <Rocket className="w-3.5 h-3.5" />
                      {launchingProfileId === prof.id ? 'Đang chạy...' : 'Launch'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProfile(prof.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                      title="Xóa profile"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* New profile form */}
            <div className="flex flex-col gap-3 border-t border-[#1E293B] pt-4">
              <span className="text-[11px] uppercase font-mono text-slate-400 font-bold tracking-wider flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5" /> Tạo profile mới
              </span>

              <input
                type="text"
                value={newProfile.name || ''}
                onChange={(e) => setNewProfile((s) => ({ ...s, name: e.target.value }))}
                placeholder="Tên profile"
                className="bg-[#0E1526] text-slate-100 placeholder-slate-500 text-xs px-3 py-2 rounded-lg border border-[#23314F] focus:outline-none focus:border-violet-500/50"
              />

              <div className="flex items-center gap-4 text-xs text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!newProfile.openEditor}
                    onChange={(e) => setNewProfile((s) => ({ ...s, openEditor: e.target.checked }))}
                    className="accent-violet-500"
                  />
                  Mở editor
                </label>
                <input
                  type="text"
                  value={newProfile.editor || ''}
                  onChange={(e) => setNewProfile((s) => ({ ...s, editor: e.target.value }))}
                  placeholder="code"
                  className="w-24 bg-[#0E1526] text-slate-100 placeholder-slate-500 text-xs px-2.5 py-1.5 rounded-lg border border-[#23314F] focus:outline-none focus:border-violet-500/50"
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!newProfile.openTerminal}
                    onChange={(e) => setNewProfile((s) => ({ ...s, openTerminal: e.target.checked }))}
                    className="accent-violet-500"
                  />
                  Mở terminal
                </label>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-slate-400">Lệnh dev (chọn từ Commands của dự án)</label>
                <select
                  value={newProfile.devCommandKey || ''}
                  onChange={(e) => setNewProfile((s) => ({ ...s, devCommandKey: e.target.value || undefined }))}
                  className="bg-[#0E1526] text-slate-100 text-xs px-3 py-2 rounded-lg border border-[#23314F] focus:outline-none focus:border-violet-500/50"
                >
                  <option value="">— Không chạy lệnh —</option>
                  {Object.keys(devEnvProject.commands || {}).map((key) => (
                    <option key={key} value={key}>
                      {key}: {devEnvProject.commands[key]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-slate-400">URL tự mở (http/https)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && urlInput.trim()) {
                        setNewProfile((s) => ({ ...s, urls: [...(s.urls || []), urlInput.trim()] }));
                        setUrlInput('');
                      }
                    }}
                    placeholder="http://localhost:3000"
                    className="flex-1 bg-[#0E1526] text-slate-100 placeholder-slate-500 text-xs px-3 py-2 rounded-lg border border-[#23314F] focus:outline-none focus:border-violet-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (urlInput.trim()) {
                        setNewProfile((s) => ({ ...s, urls: [...(s.urls || []), urlInput.trim()] }));
                        setUrlInput('');
                      }
                    }}
                    className="px-3 py-2 rounded-lg text-xs font-medium bg-[#161a26] text-slate-300 border border-[#23314F] hover:bg-[#1d2232] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {(newProfile.urls || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {(newProfile.urls || []).map((u, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-1 text-[10px] font-mono bg-[#0E1526] text-slate-300 border border-[#23314F] rounded px-2 py-0.5"
                      >
                        {u}
                        <button
                          type="button"
                          onClick={() =>
                            setNewProfile((s) => ({ ...s, urls: (s.urls || []).filter((_, idx) => idx !== i) }))
                          }
                          className="text-slate-500 hover:text-rose-400 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleSaveProfile}
                className="self-start flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/40 hover:bg-violet-500/30 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Lưu profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Register Project Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#334155] rounded-xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FolderGit2 className="w-5 h-5 text-emerald-400" />
                <span>Đăng Ký Dự Án Mới</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Path Auto-detect field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Đường Dẫn Thư Mục Dự Án</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputPath}
                  onChange={(e) => setInputPath(e.target.value)}
                  placeholder="D:\HIS.API hoặc D:\MyProject hoặc C:\repo"
                  className="flex-1 bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono selectable"
                />
                <button
                  type="button"
                  onClick={handleBrowseFolder}
                  className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                  title="Duyệt và chọn thư mục từ máy tính (Hộp thoại Windows)"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Duyệt...</span>
                </button>
                {inputPath.trim() && (
                  <button
                    type="button"
                    onClick={() => api.openExplorer(inputPath)}
                    className="px-2.5 py-2 bg-[#1E293B]/70 hover:bg-[#1E293B] text-slate-300 border border-[#334155] rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                    title="Mở thư mục này trong Windows File Explorer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Explorer</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDetectPath}
                  disabled={detecting || !inputPath.trim()}
                  className="px-3.5 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {detecting ? 'Đang quét...' : 'Quét tự động'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Bấm "Quét tự động" để phát hiện kho lưu trữ .git, package.json / .csproj và các lệnh chạy.
              </p>
            </div>

            {/* Editable project details */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-400">Tên Hiển Thị Dự Án</label>
                <input
                  type="text"
                  value={newProject.name || ''}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="Tên Dự Án"
                  className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 selectable"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-slate-400">Lệnh Dev</label>
                  <input
                    type="text"
                    value={newProject.commands?.dev || ''}
                    onChange={(e) =>
                      setNewProject({
                        ...newProject,
                        commands: { ...newProject.commands, dev: e.target.value },
                      })
                    }
                    placeholder="dotnet watch / npm run dev"
                    className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500 selectable"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-slate-400">Lệnh Build</label>
                  <input
                    type="text"
                    value={newProject.commands?.build || ''}
                    onChange={(e) =>
                      setNewProject({
                        ...newProject,
                        commands: { ...newProject.commands, build: e.target.value },
                      })
                    }
                    placeholder="dotnet build / npm run build"
                    className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500 selectable"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-slate-400">Lệnh Test</label>
                  <input
                    type="text"
                    value={newProject.commands?.test || ''}
                    onChange={(e) =>
                      setNewProject({
                        ...newProject,
                        commands: { ...newProject.commands, test: e.target.value },
                      })
                    }
                    placeholder="dotnet test / npm test"
                    className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500 selectable"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveProject}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium cursor-pointer transition-colors"
              >
                Lưu Dự Án
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};
