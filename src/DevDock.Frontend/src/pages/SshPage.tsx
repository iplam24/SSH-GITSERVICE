import React, { useState, useEffect, useRef } from 'react';
import {
  Server,
  Plus,
  Play,
  Key,
  Lock,
  Trash2,
  Copy,
  Edit2,
  Activity,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  FolderTree,
  Folder,
  File,
  UploadCloud,
  Download,
  Eye,
  CornerLeftUp,
  FolderPlus,
  FileText,
  FileCode,
  HardDrive,
  Check,
  Sliders,
} from 'lucide-react';
import { SshProfile, SshAuthType, SshConnectionTestResult, RemoteFileItem, RemoteFileContent } from '../types';
import { api } from '../services/api';
import { useConfirm } from '../context/ConfirmContext';
import { SshControlCenter } from './SshControlCenter';

interface SshPageProps {
  profiles: SshProfile[];
  onRefreshProfiles: () => void;
  onConnectTerminal: (profile: SshProfile) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const SshPage: React.FC<SshPageProps> = ({
  profiles,
  onRefreshProfiles,
  onConnectTerminal,
  onShowToast,
}) => {
  const confirm = useConfirm();
  // Navigation View: 'profiles' (Server Cards), 'manage' (Remote Control Center), or 'sftp' (SFTP Remote File Explorer)
  const [activeView, setActiveView] = useState<'profiles' | 'manage' | 'sftp'>('profiles');
  const [selectedManageProfile, setSelectedManageProfile] = useState<SshProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Partial<SshProfile>>({
    name: '',
    host: '',
    port: 22,
    username: 'root',
    authType: 'Password',
  });
  const [password, setPassword] = useState('');
  const [privateKeyContent, setPrivateKeyContent] = useState('');
  const [keyPassphrase, setKeyPassphrase] = useState('');

  // Test Connection State
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    profile: SshProfile;
    result: SshConnectionTestResult;
  } | null>(null);

  // SFTP Explorer State
  const [selectedSftpProfile, setSelectedSftpProfile] = useState<SshProfile | null>(null);
  const [currentRemotePath, setCurrentRemotePath] = useState<string>('/');
  const [remoteFiles, setRemoteFiles] = useState<RemoteFileItem[]>([]);
  const [isLoadingSftp, setIsLoadingSftp] = useState(false);
  const [sftpError, setSftpError] = useState<string | null>(null);
  const [sftpSearchQuery, setSftpSearchQuery] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    name: string;
    path: string;
    content: string;
    isBinary: boolean;
    size: number;
  } | null>(null);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [copiedFileContent, setCopiedFileContent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter profiles
  const filteredProfiles = profiles.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.host.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenAddModal = () => {
    setEditingProfile({
      name: '',
      host: '',
      port: 22,
      username: 'root',
      authType: 'Password',
    });
    setPassword('');
    setPrivateKeyContent('');
    setKeyPassphrase('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: SshProfile) => {
    setEditingProfile(p);
    setPassword('');
    setPrivateKeyContent('');
    setKeyPassphrase('');
    setIsModalOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!editingProfile.name || !editingProfile.host || !editingProfile.username) {
      onShowToast('Vui lòng nhập Tên gợi nhớ, Địa chỉ Host và Tên đăng nhập (Username)', 'error');
      return;
    }

    try {
      await api.saveSshProfile({
        profile: editingProfile,
        password: password || undefined,
        privateKeyContent: privateKeyContent || undefined,
        keyPassphrase: keyPassphrase || undefined,
      });

      setIsModalOpen(false);
      onRefreshProfiles();
      onShowToast('Đã lưu kết nối SSH an toàn bằng Windows DPAPI!', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Lưu kết nối SSH thất bại', 'error');
    }
  };

  const handleDeleteProfile = async (p: SshProfile) => {
    const ok = await confirm({
      title: 'Xóa Kết Nối SSH',
      message: `Bạn có chắc chắn muốn xóa kết nối SSH '${p.name}'?`,
      confirmText: 'Xóa Kết Nối',
      type: 'danger',
    });
    if (!ok) return;
    try {
      await api.deleteSshProfile(p.id);
      if (selectedSftpProfile?.id === p.id) {
        setSelectedSftpProfile(null);
        setRemoteFiles([]);
      }
      onRefreshProfiles();
      onShowToast(`Đã xóa kết nối SSH '${p.name}'`, 'info');
    } catch (err: any) {
      onShowToast(err.message || 'Xóa kết nối thất bại', 'error');
    }
  };

  const handleTestConnection = async (p: SshProfile) => {
    setTestingId(p.id);
    try {
      const res = await api.testSshProfile({ profile: p });
      setTestResult({ profile: p, result: res });
    } catch (err: any) {
      setTestResult({
        profile: p,
        result: {
          success: false,
          latencyMs: 0,
          errorMessage: err.message || 'Kiểm tra kết nối thất bại',
        },
      });
    } finally {
      setTestingId(null);
    }
  };

  // ------------------ SERVER CONTROL CENTER LOGIC ------------------
  const handleOpenManage = (profile: SshProfile) => {
    setSelectedManageProfile(profile);
    setActiveView('manage');
  };

  // ------------------ SFTP LOGIC ------------------
  const handleOpenSftp = (profile: SshProfile, initialPath = '/') => {
    setSelectedSftpProfile(profile);
    setActiveView('sftp');
    loadRemoteDirectory(profile.id, initialPath);
  };

  const loadRemoteDirectory = async (profileId: string, path: string) => {
    setIsLoadingSftp(true);
    setSftpError(null);
    try {
      const res = await api.sftpListDirectory(profileId, path);
      if (res.success) {
        setRemoteFiles(res.files || []);
        setCurrentRemotePath(path);
      } else {
        setSftpError(res.errorMessage || 'Không thể đọc thư mục từ xa.');
      }
    } catch (err: any) {
      setSftpError(err.message || 'Lỗi kết nối SFTP tới máy chủ.');
    } finally {
      setIsLoadingSftp(false);
    }
  };

  const handleNavigatePath = (newPath: string) => {
    if (!selectedSftpProfile) return;
    const clean = newPath.replace(/\/+/g, '/') || '/';
    loadRemoteDirectory(selectedSftpProfile.id, clean);
  };

  const handleNavigateUp = () => {
    if (currentRemotePath === '/' || currentRemotePath === '') return;
    const parts = currentRemotePath.split('/').filter(Boolean);
    parts.pop();
    const upPath = '/' + parts.join('/');
    handleNavigatePath(upPath);
  };

  const handleOpenFileOrDir = async (item: RemoteFileItem) => {
    if (!selectedSftpProfile) return;
    if (item.isDirectory) {
      handleNavigatePath(item.path);
    } else {
      // Read file
      try {
        onShowToast(`Đang tải tệp '${item.name}'...`, 'info');
        const res = await api.sftpReadFile(selectedSftpProfile.id, item.path);
        if (res.success && res.file) {
          setPreviewFile({
            name: item.name,
            path: item.path,
            content: res.file.content,
            isBinary: res.file.isBinary,
            size: item.size,
          });
        } else {
          onShowToast(res.errorMessage || 'Không thể đọc nội dung tệp', 'error');
        }
      } catch (err: any) {
        onShowToast(err.message || 'Lỗi khi đọc tệp từ xa', 'error');
      }
    }
  };

  const handleDeleteRemoteItem = async (item: RemoteFileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedSftpProfile) return;
    const ok = await confirm({
      title: item.isDirectory ? 'Xóa Thư Mục Từ Xa' : 'Xóa Tệp Từ Xa',
      message: `Bạn có chắc muốn xóa ${item.isDirectory ? 'thư mục' : 'tệp'} '${item.name}' trên máy chủ?`,
      confirmText: 'Xóa Vĩnh Viễn',
      type: 'danger',
    });
    if (!ok) return;

    try {
      const res = await api.sftpDelete({
        profileId: selectedSftpProfile.id,
        path: item.path,
        isDirectory: item.isDirectory,
      });
      if (res.success) {
        onShowToast(`Đã xóa '${item.name}' thành công!`, 'success');
        loadRemoteDirectory(selectedSftpProfile.id, currentRemotePath);
      } else {
        onShowToast(res.errorMessage || 'Xóa tệp/thư mục thất bại', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi xóa tệp từ xa', 'error');
    }
  };

  const handleCreateDirectory = async () => {
    if (!selectedSftpProfile || !newFolderName.trim()) return;
    const target = `${currentRemotePath.replace(/\/$/, '')}/${newFolderName.trim()}`;
    try {
      const res = await api.sftpCreateDirectory({
        profileId: selectedSftpProfile.id,
        path: target,
      });
      if (res.success) {
        onShowToast(`Đã tạo thư mục '${newFolderName}'!`, 'success');
        setIsNewFolderModalOpen(false);
        setNewFolderName('');
        loadRemoteDirectory(selectedSftpProfile.id, currentRemotePath);
      } else {
        onShowToast(res.errorMessage || 'Tạo thư mục thất bại', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi khi tạo thư mục', 'error');
    }
  };

  // Upload Files via Drag and Drop or File Picker
  const handleUploadFileList = async (files: FileList) => {
    if (!selectedSftpProfile || files.length === 0) return;
    setIsUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        onShowToast(`Đang tải lên '${file.name}' (${i + 1}/${files.length})...`, 'info');

        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let j = 0; j < bytes.byteLength; j++) {
          binary += String.fromCharCode(bytes[j]);
        }
        const base64 = btoa(binary);

        const remoteTarget = `${currentRemotePath.replace(/\/$/, '')}/${file.name}`;
        const res = await api.sftpUploadFile({
          profileId: selectedSftpProfile.id,
          remotePath: remoteTarget,
          contentBase64: base64,
        });

        if (!res.success) {
          throw new Error(res.errorMessage || `Lỗi tải tệp ${file.name}`);
        }
      }
      onShowToast(`Đã tải lên thành công ${files.length} tệp qua SFTP!`, 'success');
      loadRemoteDirectory(selectedSftpProfile.id, currentRemotePath);
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi khi tải tệp lên máy chủ', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadFile = (fileName: string, content: string, isBinary: boolean) => {
    let url = '';
    if (isBinary) {
      url = `data:application/octet-stream;base64,${content}`;
    } else {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      url = URL.createObjectURL(blob);
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filteredRemoteFiles = remoteFiles.filter((f) =>
    f.name.toLowerCase().includes(sftpSearchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden w-full h-full min-h-0 bg-[#0c0d12] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto w-full h-full flex flex-col gap-4 sm:gap-5 min-h-0">
      {/* Top Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#1E293B]">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Server className="w-5 h-5 text-accent" />
            <span>Kết Nối SSH & Trình Quản Lý Tệp SFTP Remote</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Quản lý máy chủ từ xa, mở terminal console, xem cây thư mục, đọc/sửa file và kéo thả tải lên SFTP.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#0C1220] p-1 rounded-xl border border-[#1E2A44]">
            <button
              type="button"
              onClick={() => setActiveView('profiles')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeView === 'profiles'
                  ? 'bg-white/[0.08] text-slate-100 font-semibold border border-white/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Máy chủ ({profiles.length})</span>
            </button>
            {selectedManageProfile && (
              <button
                type="button"
                onClick={() => setActiveView('manage')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'manage'
                    ? 'bg-white/[0.08] text-slate-100 font-semibold border border-white/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                <span>Quản Trị ({selectedManageProfile.name})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (!selectedSftpProfile && profiles.length > 0) {
                  handleOpenSftp(profiles[0]);
                } else {
                  setActiveView('sftp');
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeView === 'sftp'
                  ? 'bg-white/[0.08] text-slate-100 font-semibold border border-white/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>SFTP File Explorer</span>
            </button>
          </div>

          {activeView === 'profiles' && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Kết Nối</span>
            </button>
          )}
        </div>
      </div>

      {/* ==================== VIEW 1: SERVER PROFILES CARDS ==================== */}
      {activeView === 'profiles' && (
        <div className="flex-1 flex flex-col gap-4 overflow-hidden min-h-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative max-w-xs w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm máy chủ (Tên, Host, User)..."
                className="w-full bg-[#111827] border border-[#1E293B] rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accent"
              />
            </div>
            <span className="text-xs text-slate-500 font-mono shrink-0">
              Tổng số máy chủ: {filteredProfiles.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 pr-1">
            {filteredProfiles.length === 0 ? (
              <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center">
                <Server className="w-12 h-12 text-slate-700 mb-3 stroke-1" />
                <p className="text-sm font-medium text-slate-400">Chưa có kết nối SSH nào</p>
                <p className="text-xs text-slate-600 mt-1">Bấm "+ Thêm Kết Nối" để đăng ký máy chủ Linux/VPS của bạn</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(330px,1fr))] gap-4">
                {filteredProfiles.map((p) => (
                  <div
                    key={p.id}
                    className="bg-[#111827] border border-[#1E293B] hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between gap-4 transition-all shadow-sm group"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-9 h-9 rounded-lg bg-[#0B0F17] border border-[#1E293B] flex items-center justify-center text-accent flex-shrink-0">
                          <Server className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-sm text-slate-200 truncate group-hover:text-blue-400 transition-colors">
                              {p.name}
                            </span>
                            <div className="w-2 h-2 rounded-full bg-emerald-400" title="Đã cấu hình" />
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono truncate">
                            {p.username}@{p.host}:{p.port}
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0B0F17] text-slate-400 border border-[#1E293B] shrink-0">
                        {p.authType === 'Password'
                          ? 'Mật khẩu'
                          : p.authType === 'PrivateKey'
                          ? 'Private Key'
                          : 'Key + Pass'}
                      </span>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-[#1E293B] flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => onConnectTerminal(p)}
                          className="h-8 px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-emerald-500/30 cursor-pointer shadow-sm whitespace-nowrap"
                          title="Mở tab Terminal và kết nối ngay tới máy chủ"
                        >
                          <Play className="w-3 h-3 fill-emerald-400" />
                          <span>Shell</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenManage(p)}
                          className="h-8 px-2.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-blue-500/30 cursor-pointer shadow-sm whitespace-nowrap"
                          title="Mở Trung Tâm Quản Trị Máy Chủ (Cổng, Nginx, SSL, Git, Process)"
                        >
                          <Sliders className="w-3 h-3 text-blue-400" />
                          <span>Quản Trị</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenSftp(p)}
                          className="h-8 px-2.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-cyan-500/30 cursor-pointer shadow-sm whitespace-nowrap"
                          title="Mở Trình Quản Lý Tệp SFTP kéo thả file"
                        >
                          <FolderTree className="w-3.5 h-3.5 text-cyan-400" />
                          <span>SFTP</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTestConnection(p)}
                          disabled={testingId === p.id}
                          className="h-8 px-2.5 rounded-lg bg-[#0B0F17] hover:bg-[#1E293B] text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors border border-[#1E293B] cursor-pointer whitespace-nowrap"
                          title="Kiểm tra ping và tính hợp lệ của tài khoản"
                        >
                          <Activity className={`w-3 h-3 ${testingId === p.id ? 'animate-spin text-cyan-400' : ''}`} />
                          <span>Test</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1 text-slate-400 shrink-0 ml-auto">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(p)}
                          className="w-8 h-8 flex items-center justify-center hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Chỉnh sửa thông tin kết nối"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProfile(p)}
                          className="w-8 h-8 flex items-center justify-center hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Xóa cấu hình kết nối"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== VIEW 2: SERVER CONTROL CENTER ==================== */}
      {activeView === 'manage' && selectedManageProfile && (
        <SshControlCenter
          profile={selectedManageProfile}
          onBack={() => setActiveView('profiles')}
          onOpenTerminal={onConnectTerminal}
          onOpenSftp={(prof, path) => {
            handleOpenSftp(prof, path || '/');
          }}
          onShowToast={onShowToast}
        />
      )}

      {/* ==================== VIEW 3: SFTP REMOTE FILE EXPLORER ==================== */}
      {activeView === 'sftp' && (
        <div className="flex-1 flex flex-col gap-3.5 overflow-hidden min-h-0">
          {/* SFTP Top Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#0D1322] border border-[#1E2A44]">
            {/* Server Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-accent" />
                <span>Máy chủ:</span>
              </span>
              <select
                value={selectedSftpProfile?.id || ''}
                onChange={(e) => {
                  const p = profiles.find((prof) => prof.id === e.target.value);
                  if (p) handleOpenSftp(p);
                }}
                className="bg-[#060911] border border-[#1E2A44] rounded-lg px-2.5 py-1 text-xs text-slate-200 font-medium focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                {profiles.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.name} ({prof.username}@{prof.host})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Location Shortcuts */}
            <div className="flex items-center gap-1 text-[11px] font-mono">
              <span className="text-slate-500 mr-1">Vị trí:</span>
              {[
                { label: 'root /', path: '/' },
                { label: '~ home', path: `/home/${selectedSftpProfile?.username || 'root'}` },
                { label: 'var/www', path: '/var/www' },
                { label: 'etc', path: '/etc' },
                { label: 'tmp', path: '/tmp' },
              ].map((loc) => (
                <button
                  key={loc.label}
                  type="button"
                  onClick={() => handleNavigatePath(loc.path)}
                  className="px-2 py-0.5 rounded bg-[#131C30] hover:bg-[#1C2946] text-slate-300 hover:text-cyan-300 border border-[#1E2A44] transition-colors cursor-pointer"
                >
                  {loc.label}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsNewFolderModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#141E34] hover:bg-[#1E2D4C] text-slate-200 text-xs font-medium border border-[#1E2A44] transition-colors cursor-pointer"
                title="Tạo thư mục mới tại đường dẫn này"
              >
                <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                <span>Thư mục mới</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                title="Chọn tệp từ máy tính để tải lên máy chủ"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{isUploading ? 'Đang tải lên...' : 'Tải tệp lên'}</span>
              </button>
              <input
                type="file"
                multiple
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleUploadFileList(e.target.files);
                }}
              />
            </div>
          </div>

          {/* Breadcrumb Path & Search Bar */}
          <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-[#090E1A] border border-[#1A2438]">
            <div className="flex items-center gap-2 flex-1 overflow-hidden font-mono text-xs text-slate-300">
              <button
                type="button"
                onClick={handleNavigateUp}
                disabled={currentRemotePath === '/' || currentRemotePath === ''}
                className="p-1 rounded bg-[#131C30] hover:bg-[#1E2946] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Lên một cấp thư mục"
              >
                <CornerLeftUp className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleNavigatePath('/')}
                  className="hover:text-cyan-400 cursor-pointer font-bold"
                >
                  /
                </button>
                {currentRemotePath
                  .split('/')
                  .filter(Boolean)
                  .map((seg, idx, arr) => {
                    const segPath = '/' + arr.slice(0, idx + 1).join('/');
                    return (
                      <React.Fragment key={segPath}>
                        <span className="text-slate-600">/</span>
                        <button
                          type="button"
                          onClick={() => handleNavigatePath(segPath)}
                          className="hover:text-cyan-400 cursor-pointer hover:underline"
                        >
                          {seg}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative max-w-[180px] w-full">
                <Search className="w-3 h-3 absolute left-2.5 top-2 text-slate-500" />
                <input
                  type="text"
                  value={sftpSearchQuery}
                  onChange={(e) => setSftpSearchQuery(e.target.value)}
                  placeholder="Lọc tệp tại đây..."
                  className="w-full bg-[#060911] border border-[#1A2438] rounded-lg pl-8 pr-2.5 py-1 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <button
                type="button"
                onClick={() => selectedSftpProfile && loadRemoteDirectory(selectedSftpProfile.id, currentRemotePath)}
                disabled={isLoadingSftp}
                className="p-1.5 rounded-lg bg-[#111A2E] hover:bg-[#1A2744] text-slate-400 hover:text-slate-200 border border-[#1E2A44] transition-colors cursor-pointer"
                title="Làm mới danh sách tệp"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSftp ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Remote Files Table Dropzone Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingOver(false);
              if (e.dataTransfer.files) {
                handleUploadFileList(e.dataTransfer.files);
              }
            }}
            className={`flex-1 rounded-xl bg-[#090E1A] border overflow-hidden flex flex-col relative transition-all min-h-0 ${
              isDraggingOver
                ? 'border-blue-500 bg-blue-950/20'
                : 'border-[#1A2438]'
            }`}
          >
            {/* Drag & Drop Visual Overlay */}
            {isDraggingOver && (
              <div className="absolute inset-0 z-40 bg-cyan-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 border-2 border-dashed border-cyan-400">
                <UploadCloud className="w-12 h-12 text-cyan-300 animate-bounce" />
                <div className="text-center">
                  <div className="text-base font-bold text-cyan-200">
                    Thả tệp vào đây để tải lên máy chủ qua SFTP!
                  </div>
                  <div className="text-xs text-cyan-400/80 font-mono mt-1">
                    Đích đến: {currentRemotePath}
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {sftpError && (
              <div className="p-4 m-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{sftpError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => selectedSftpProfile && loadRemoteDirectory(selectedSftpProfile.id, currentRemotePath)}
                  className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-semibold text-[11px] cursor-pointer"
                >
                  Thử lại
                </button>
              </div>
            )}

            {/* File Table */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-[#0C1220] border-b border-[#1A2438] text-[11px] font-mono text-slate-400 select-none z-10">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Tên Tệp / Thư Mục</th>
                    <th className="py-2.5 px-4 font-semibold w-28 hidden sm:table-cell">Kích Thước</th>
                    <th className="py-2.5 px-4 font-semibold w-32 hidden md:table-cell">Quyền Hạn</th>
                    <th className="py-2.5 px-4 font-semibold w-40 hidden md:table-cell">Thời Gian Sửa</th>
                    <th className="py-2.5 px-4 font-semibold w-24 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141B2D]">
                  {isLoadingSftp ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                          <span>Đang duyệt danh sách tệp SFTP từ máy chủ...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredRemoteFiles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-slate-500">
                        <Folder className="w-10 h-10 text-slate-700 mx-auto mb-2 stroke-1" />
                        <div className="text-xs font-medium text-slate-400">Thư mục trống hoặc không khớp từ khóa tìm kiếm</div>
                        <div className="text-[11px] text-slate-600 mt-1">Kéo thả tệp từ desktop vào đây để tải lên</div>
                      </td>
                    </tr>
                  ) : (
                    filteredRemoteFiles.map((file) => (
                      <tr
                        key={file.path}
                        onClick={() => handleOpenFileOrDir(file)}
                        className="hover:bg-[#121A2C] transition-colors group cursor-pointer"
                      >
                        {/* Name & Icon */}
                        <td className="py-2 px-4 flex items-center gap-2.5">
                          {file.isDirectory ? (
                            <Folder className="w-4 h-4 text-amber-400 flex-shrink-0 fill-amber-400/20" />
                          ) : file.name.endsWith('.sh') || file.name.endsWith('.py') || file.name.endsWith('.js') || file.name.endsWith('.ts') || file.name.endsWith('.json') ? (
                            <FileCode className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          )}
                          <span className={`font-mono truncate ${file.isDirectory ? 'font-bold text-slate-100 group-hover:text-cyan-300' : 'text-slate-200 group-hover:text-slate-100'}`}>
                            {file.name}
                          </span>
                        </td>

                        {/* Size */}
                        <td className="py-2 px-4 font-mono text-[11px] text-slate-400 hidden sm:table-cell">
                          {file.isDirectory ? '—' : formatFileSize(file.size)}
                        </td>

                        {/* Permissions */}
                        <td className="py-2 px-4 font-mono text-[11px] text-slate-500 hidden md:table-cell">
                          {file.permissions || '-rw-r--r--'}
                        </td>

                        {/* Modified Time */}
                        <td className="py-2 px-4 font-mono text-[11px] text-slate-400 hidden md:table-cell">
                          {new Date(file.modifiedTime).toLocaleString('vi-VN', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>

                        {/* Actions */}
                        <td className="py-2 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {!file.isDirectory && (
                              <button
                                type="button"
                                onClick={() => handleOpenFileOrDir(file)}
                                className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors cursor-pointer"
                                title="Xem nội dung tệp"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteRemoteItem(file, e)}
                              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Xóa tệp/thư mục này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Status Bar */}
            <div className="p-2.5 bg-[#0C1220] border-t border-[#1A2438] flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>
                  {selectedSftpProfile ? `${selectedSftpProfile.username}@${selectedSftpProfile.host}` : 'Chưa kết nối'}
                </span>
                <span className="text-slate-600">•</span>
                <span>{filteredRemoteFiles.length} mục</span>
              </div>
              <div className="text-slate-500">
                Kéo thả file vào bảng để upload SFTP tự động
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ADD / EDIT SSH PROFILE ==================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#334155] rounded-xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Server className="w-5 h-5 text-accent" />
                <span>{editingProfile.id ? 'Chỉnh Sửa Kết Nối SSH' : 'Thêm Mới Kết Nối SSH'}</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-300">Tên gợi nhớ kết nối</label>
                <input
                  type="text"
                  value={editingProfile.name || ''}
                  onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                  placeholder="VPS Production, Server Staging..."
                  className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-accent selectable"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-300">Địa chỉ Host / IP</label>
                  <input
                    type="text"
                    value={editingProfile.host || ''}
                    onChange={(e) => setEditingProfile({ ...editingProfile, host: e.target.value })}
                    placeholder="192.168.1.20 hoặc server.example.com"
                    className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-accent selectable"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-300">Cổng Port</label>
                  <input
                    type="number"
                    value={editingProfile.port || 22}
                    onChange={(e) =>
                      setEditingProfile({ ...editingProfile, port: parseInt(e.target.value) || 22 })
                    }
                    className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-accent selectable"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-300">Tên Người Dùng (User)</label>
                  <input
                    type="text"
                    value={editingProfile.username || ''}
                    onChange={(e) =>
                      setEditingProfile({ ...editingProfile, username: e.target.value })
                    }
                    placeholder="root hoặc ubuntu"
                    className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-accent selectable"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-300">Phương thức xác thực</label>
                  <select
                    value={editingProfile.authType || 'Password'}
                    onChange={(e) =>
                      setEditingProfile({
                        ...editingProfile,
                        authType: e.target.value as SshAuthType,
                      })
                    }
                    className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-accent cursor-pointer"
                  >
                    <option value="Password">Mật khẩu (Password)</option>
                    <option value="PrivateKey">Khóa SSH Private Key</option>
                    <option value="KeyWithPassphrase">SSH Key kèm Passphrase</option>
                  </select>
                </div>
              </div>

              {/* Password Input */}
              {editingProfile.authType === 'Password' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-accent" />
                    <span>Mật khẩu (Mã hóa bảo vệ bằng Windows DPAPI)</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingProfile.hasPassword ? '•••••••• (để trống nếu giữ nguyên)' : 'Nhập mật khẩu SSH'}
                    className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-accent selectable"
                  />
                </div>
              )}

              {/* Private Key Input */}
              {editingProfile.authType !== 'Password' && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-accent" />
                      <span>Nội dung Khóa Private Key hoặc Đường dẫn File</span>
                    </label>
                    <textarea
                      value={privateKeyContent}
                      onChange={(e) => setPrivateKeyContent(e.target.value)}
                      placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                      rows={4}
                      className="bg-[#0B0F17] border border-[#1E293B] rounded-lg p-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-accent resize-none selectable"
                    />
                  </div>

                  {editingProfile.authType === 'KeyWithPassphrase' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-300">Mật khẩu giải mã Key (Passphrase)</label>
                      <input
                        type="password"
                        value={keyPassphrase}
                        onChange={(e) => setKeyPassphrase(e.target.value)}
                        placeholder="Nhập Passphrase giải mã"
                        className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-accent selectable"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium cursor-pointer transition-colors"
              >
                Lưu Kết Nối SSH
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: PREVIEW / READ REMOTE FILE ==================== */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1322] border border-[#233352] rounded-2xl max-w-4xl w-full h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#1E2A44] bg-[#090E1A]">
              <div className="flex items-center gap-2 overflow-hidden">
                <FileCode className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span className="font-mono text-xs font-bold text-slate-100 truncate">
                  {previewFile.path}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                  {formatFileSize(previewFile.size)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(previewFile.content);
                    setCopiedFileContent(true);
                    setTimeout(() => setCopiedFileContent(false), 2000);
                  }}
                  className="px-2.5 py-1 rounded bg-[#141E34] hover:bg-[#1E2D4C] text-slate-300 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedFileContent ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedFileContent ? 'Đã sao chép' : 'Sao chép'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadFile(previewFile.name, previewFile.content, previewFile.isBinary)}
                  className="px-2.5 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors border border-cyan-500/30"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải xuống</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-4 bg-[#060911]">
              {previewFile.isBinary ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                  <HardDrive className="w-12 h-12 text-slate-600" />
                  <p className="text-sm font-semibold text-slate-300">Tệp nhị phân (Binary File)</p>
                  <p className="text-xs text-slate-500 max-w-md text-center">
                    Tệp này không phải là văn bản thuần túy (ảnh, tệp thực thi hoặc nén). Bạn có thể bấm nút Tải xuống bên trên để lưu về máy.
                  </p>
                </div>
              ) : (
                <pre className="font-mono text-xs leading-relaxed text-slate-200 whitespace-pre-wrap select-text">
                  {previewFile.content || '(Tệp rỗng 0 bytes)'}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: CREATE REMOTE DIRECTORY ==================== */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#334155] rounded-xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-amber-400" />
                <span>Tạo Thư Mục Từ Xa Mới</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsNewFolderModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-300">Tên thư mục mới:</label>
              <input
                type="text"
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateDirectory();
                }}
                placeholder="my-folder hoặc logs..."
                className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500 selectable"
              />
              <span className="text-[11px] text-slate-500 font-mono">
                Đường dẫn tạo: {currentRemotePath.replace(/\/$/, '')}/{newFolderName || '...'}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setIsNewFolderModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCreateDirectory}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs cursor-pointer transition-colors"
              >
                Tạo Thư Mục
              </button>
            </div>
          </div>
        </div>
      )}
    
      </div>
    </div>
  );
};
