import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Globe,
  Cpu,
  Search,
  RefreshCw,
  Trash2,
  Plus,
  Zap,
  Check,
  AlertTriangle,
  FileText,
  Sliders,
  ShieldAlert,
  Server,
  Terminal,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
  Edit2,
  Filter,
  Sparkles,
} from 'lucide-react';
import {
  PortListeningItem,
  HostEntryItem,
  SystemEnvVariableItem,
  DotEnvCompareResult,
  DotEnvKeyDiff,
} from '../types';
import { api } from '../services/api';

type DevOpsTab = 'ports' | 'hosts' | 'env';

interface DevOpsPageProps {
  initialTab?: DevOpsTab;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRunCommandInTerminal?: (cmd: string) => void;
}

export const DevOpsPage: React.FC<DevOpsPageProps> = ({
  initialTab = 'ports',
  onShowToast,
  onRunCommandInTerminal,
}) => {
  const [activeTab, setActiveTab] = useState<DevOpsTab>(initialTab);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0c0d12]">
      {/* Top Header & Tab Navigation */}
      <div className="border-b border-[#1a1e2a] bg-[#090b10] px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 flex-shrink-0 select-none">
        <div>
          <h1 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-accent" />
            <span>Windows Dev Ops & Quản trị Hệ thống</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Quản lý cổng mạng, tiến trình chiếm port, file Hosts và biến môi trường Windows
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 bg-[#12151f] p-1 rounded-lg border border-[#1e2332]">
          <button
            type="button"
            onClick={() => setActiveTab('ports')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'ports'
                ? 'bg-accent/20 text-accent border border-accent/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Cổng mạng & Tiến trình (Ports)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hosts')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'hosts'
                ? 'bg-accent/20 text-accent border border-accent/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Windows Hosts Manager</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('env')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'env'
                ? 'bg-accent/20 text-accent border border-accent/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Biến môi trường & .env Studio</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'ports' && <PortInspectorTab onShowToast={onShowToast} />}
        {activeTab === 'hosts' && <HostsManagerTab onShowToast={onShowToast} />}
        {activeTab === 'env' && <EnvironmentStudioTab onShowToast={onShowToast} />}
      </div>
    </div>
  );
};

/* =========================================================================================
 * 1. PORT INSPECTOR & PROCESS KILLER TAB
 * ========================================================================================= */
const PortInspectorTab: React.FC<{
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}> = ({ onShowToast }) => {
  const [ports, setPorts] = useState<PortListeningItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPortForKill, setSelectedPortForKill] = useState<PortListeningItem | null>(null);
  const [killing, setKilling] = useState(false);

  const COMMON_DEV_PORTS = [3000, 5173, 5000, 8080, 8000, 5432, 3306, 6379, 27017];

  const fetchPorts = async () => {
    setLoading(true);
    try {
      const data = await api.getListeningPorts();
      setPorts(data);
    } catch (err: any) {
      onShowToast(err.message || 'Không thể quét danh sách cổng mạng', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPorts();
  }, []);

  const filteredPorts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return ports;
    return ports.filter(
      (p) =>
        p.port.toString().includes(q) ||
        p.processName.toLowerCase().includes(q) ||
        p.pid.toString().includes(q) ||
        p.localAddress.toLowerCase().includes(q) ||
        (p.processPath && p.processPath.toLowerCase().includes(q))
    );
  }, [ports, searchQuery]);

  const handleKillProcess = async (item: PortListeningItem) => {
    setKilling(true);
    try {
      const res = await api.killProcess(item.pid, true);
      if (res.success) {
        onShowToast(res.message, 'success');
        setSelectedPortForKill(null);
        // Auto refresh ports
        fetchPorts();
      } else {
        onShowToast(res.message, 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Không thể dừng tiến trình', 'error');
    } finally {
      setKilling(false);
    }
  };

  const totalRamUsage = useMemo(() => {
    return Math.round(ports.reduce((acc, cur) => acc + (cur.memoryMb || 0), 0));
  }, [ports]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6 max-w-7xl mx-auto w-full gap-5">
      {/* Top Bar: Search, Quick Filters & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Box */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm theo số cổng (e.g. 3000, 8080), tên tiến trình, hoặc PID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#12151f] text-slate-100 placeholder-slate-500 text-xs pl-9 pr-4 py-2 rounded-lg border border-[#1e2332] focus:outline-none focus:border-accent"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Stats & Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#12151f] border border-[#1e2332] text-xs">
            <span className="text-slate-400">
              Đang mở: <strong className="text-emerald-400 font-mono">{ports.length}</strong> cổng
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">
              Tổng RAM: <strong className="text-sky-400 font-mono">{totalRamUsage} MB</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={fetchPorts}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#12151f] hover:bg-[#1a1f2e] text-slate-200 border border-[#1e2332] text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-accent ${loading ? 'animate-spin' : ''}`} />
            <span>Quét lại</span>
          </button>
        </div>
      </div>

      {/* Quick Common Dev Port Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-500 flex items-center gap-1 text-[11px] font-medium flex-shrink-0">
          <Zap className="w-3 h-3 text-amber-400" /> Cổng dev phổ biến:
        </span>
        {COMMON_DEV_PORTS.map((p) => {
          const isListening = ports.some((x) => x.port === p);
          const isSelected = searchQuery === p.toString();
          return (
            <button
              key={p}
              type="button"
              onClick={() => setSearchQuery(isSelected ? '' : p.toString())}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors flex items-center gap-1 cursor-pointer ${
                isSelected
                  ? 'bg-accent text-white font-semibold'
                  : isListening
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-600/40 hover:bg-emerald-900/60'
                  : 'bg-[#12151f] text-slate-500 border border-[#1a1e2a] hover:text-slate-300'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              :{p}
            </button>
          );
        })}
      </div>

      {/* Ports Table */}
      <div className="flex-1 overflow-hidden rounded-xl border border-[#1a1e2a] bg-[#090b10] flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0e111a] text-slate-400 font-mono text-[11px] uppercase sticky top-0 z-10 border-b border-[#1a1e2a]">
              <tr>
                <th className="py-2.5 px-4">Cổng (Port)</th>
                <th className="py-2.5 px-4">Giao thức</th>
                <th className="py-2.5 px-4">Tiến trình (Process)</th>
                <th className="py-2.5 px-4">PID</th>
                <th className="py-2.5 px-4">Bộ nhớ RAM</th>
                <th className="py-2.5 px-4">Đường dẫn thực thi</th>
                <th className="py-2.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141824] text-slate-300 font-sans">
              {loading && ports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 text-accent animate-spin mx-auto mb-2" />
                    Đang quét danh sách cổng mạng Windows...
                  </td>
                </tr>
              ) : filteredPorts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Không tìm thấy cổng mạng nào phù hợp với từ khóa '{searchQuery}'.
                  </td>
                </tr>
              ) : (
                filteredPorts.map((item) => {
                  const isNode = item.processName.toLowerCase().includes('node');
                  const isDotnet = item.processName.toLowerCase().includes('dotnet');
                  const isPython = item.processName.toLowerCase().includes('python');
                  const isNginx = item.processName.toLowerCase().includes('nginx');

                  return (
                    <tr
                      key={`${item.protocol}-${item.port}-${item.pid}`}
                      className="hover:bg-[#121624] transition-colors group"
                    >
                      {/* Port */}
                      <td className="py-2.5 px-4">
                        <span className="font-mono text-sm font-bold text-emerald-400">
                          :{item.port}
                        </span>
                        <span className="text-[10px] text-slate-500 block font-mono">
                          {item.localAddress}
                        </span>
                      </td>

                      {/* Protocol & State */}
                      <td className="py-2.5 px-4">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {item.protocol}
                        </span>
                      </td>

                      {/* Process Name */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isNode
                                ? 'bg-green-500'
                                : isDotnet
                                ? 'bg-purple-500'
                                : isPython
                                ? 'bg-yellow-500'
                                : isNginx
                                ? 'bg-teal-500'
                                : 'bg-slate-500'
                            }`}
                          />
                          <span className="font-medium text-slate-100">
                            {item.processName || 'Unknown'}
                          </span>
                        </div>
                      </td>

                      {/* PID */}
                      <td className="py-2.5 px-4">
                        <span className="font-mono text-xs text-slate-400 bg-white/[0.04] px-1.5 py-0.5 rounded">
                          {item.pid}
                        </span>
                      </td>

                      {/* RAM */}
                      <td className="py-2.5 px-4 font-mono text-xs text-sky-400">
                        {item.memoryMb > 0 ? `${item.memoryMb} MB` : '—'}
                      </td>

                      {/* Path */}
                      <td className="py-2.5 px-4 text-slate-500 max-w-xs truncate text-[11px] font-mono" title={item.processPath}>
                        {item.processPath || '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedPortForKill(item)}
                          disabled={item.pid <= 4}
                          className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/25 text-xs font-medium transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center gap-1"
                          title={item.pid <= 4 ? 'Tiến trình hệ thống được bảo vệ' : 'Buộc dừng tiến trình chiếm cổng này'}
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Kill</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Kill Confirmation Modal */}
      {selectedPortForKill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-[#0f121a] border border-[#23293a] rounded-xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 rounded-lg bg-rose-500/15 border border-rose-500/30">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Xác nhận dừng tiến trình</h3>
                <p className="text-xs text-slate-400">Bạn có chắc muốn buộc dừng tiến trình này?</p>
              </div>
            </div>

            <div className="bg-[#090b10] p-3 rounded-lg border border-[#1a1e2a] text-xs font-mono flex flex-col gap-1.5 text-slate-300">
              <div>
                <span className="text-slate-500">Cổng mạng:</span>{' '}
                <strong className="text-emerald-400">:{selectedPortForKill.port}</strong> ({selectedPortForKill.protocol})
              </div>
              <div>
                <span className="text-slate-500">Tên tiến trình:</span>{' '}
                <strong className="text-slate-100">{selectedPortForKill.processName}</strong>
              </div>
              <div>
                <span className="text-slate-500">Process ID (PID):</span>{' '}
                <strong className="text-sky-400">{selectedPortForKill.pid}</strong>
              </div>
              {selectedPortForKill.processPath && (
                <div className="truncate text-slate-400 text-[11px]" title={selectedPortForKill.processPath}>
                  <span className="text-slate-500">Đường dẫn:</span> {selectedPortForKill.processPath}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1a1e2a]">
              <button
                type="button"
                onClick={() => setSelectedPortForKill(null)}
                disabled={killing}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-[#151926] cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleKillProcess(selectedPortForKill)}
                disabled={killing}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-900/30 transition-colors cursor-pointer disabled:opacity-50"
              >
                {killing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{killing ? 'Đang dừng...' : 'Buộc dừng (Kill)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* =========================================================================================
 * 2. WINDOWS HOSTS FILE MANAGER TAB
 * ========================================================================================= */
const HostsManagerTab: React.FC<{
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}> = ({ onShowToast }) => {
  const [entries, setEntries] = useState<HostEntryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Partial<HostEntryItem> | null>(null);
  const [hostnamesInput, setHostnamesInput] = useState('');

  const fetchHosts = async () => {
    setLoading(true);
    try {
      const data = await api.getHostEntries();
      setEntries(data);
    } catch (err: any) {
      onShowToast(err.message || 'Không thể đọc file Windows hosts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHosts();
  }, []);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.ipAddress.toLowerCase().includes(q) ||
        e.hostnames.some((h) => h.toLowerCase().includes(q)) ||
        (e.comment && e.comment.toLowerCase().includes(q))
    );
  }, [entries, searchQuery]);

  const handleToggleEntry = async (id: string) => {
    const updated = entries.map((e) => (e.id === id ? { ...e, isEnabled: !e.isEnabled } : e));
    setEntries(updated);

    try {
      await api.saveHostEntries(updated, true);
      onShowToast('Đã cập nhật trạng thái bản ghi hosts', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Không thể lưu file hosts', 'error');
      fetchHosts();
    }
  };

  const handleDeleteEntry = async (id: string) => {
    const target = entries.find((e) => e.id === id);
    if (!target) return;
    if (target.isSystemDefault) {
      if (!confirm('Đây là bản ghi hệ thống (localhost). Bạn có chắc muốn xóa không?')) return;
    }

    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);

    try {
      await api.saveHostEntries(updated, true);
      onShowToast('Đã xóa bản ghi hosts thành công', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi khi xóa bản ghi', 'error');
      fetchHosts();
    }
  };

  const handleOpenAddModal = () => {
    setEditingEntry({
      ipAddress: '127.0.0.1',
      hostnames: [],
      comment: '',
      isEnabled: true,
    });
    setHostnamesInput('');
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (item: HostEntryItem) => {
    setEditingEntry(item);
    setHostnamesInput(item.hostnames.join(' '));
    setIsEditModalOpen(true);
  };

  const handleSaveModal = async () => {
    if (!editingEntry?.ipAddress?.trim()) {
      onShowToast('Vui lòng nhập địa chỉ IP hợp lệ', 'error');
      return;
    }

    const parsedHostnames = hostnamesInput
      .split(/[\s,]+/)
      .map((h) => h.trim())
      .filter((h) => h.length > 0);

    if (parsedHostnames.length === 0) {
      onShowToast('Vui lòng nhập ít nhất 1 tên miền (Hostname)', 'error');
      return;
    }

    setSaving(true);
    try {
      let updated: HostEntryItem[];
      if (editingEntry.id) {
        // Edit existing
        updated = entries.map((e) =>
          e.id === editingEntry.id
            ? ({
                ...e,
                ipAddress: editingEntry.ipAddress!.trim(),
                hostnames: parsedHostnames,
                comment: editingEntry.comment?.trim(),
                isEnabled: editingEntry.isEnabled ?? true,
              } as HostEntryItem)
            : e
        );
      } else {
        // Add new
        const newItem: HostEntryItem = {
          id: Math.random().toString(36).substring(2, 9),
          ipAddress: editingEntry.ipAddress!.trim(),
          hostnames: parsedHostnames,
          comment: editingEntry.comment?.trim(),
          isEnabled: true,
          lineNumber: entries.length + 1,
          isSystemDefault: false,
        };
        updated = [...entries, newItem];
      }

      setEntries(updated);
      await api.saveHostEntries(updated, true);
      setIsEditModalOpen(false);
      onShowToast('Đã lưu file hosts và Flush DNS thành công!', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi khi lưu file hosts', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFlushDns = async () => {
    try {
      onShowToast('Đang làm sạch bộ nhớ cache DNS...', 'info');
      await api.flushDns();
      onShowToast('Đã Flush DNS thành công (DnsFlushResolverCache)', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi Flush DNS', 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6 max-w-7xl mx-auto w-full gap-5">
      {/* Informational Banner */}
      <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-800/30 text-xs text-slate-300 flex items-start gap-3">
        <Globe className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <span className="font-semibold text-blue-300">File Hosts Windows:</span>{' '}
          <code className="px-1 py-0.5 rounded bg-black/40 text-blue-200 font-mono text-[11px]">
            C:\Windows\System32\drivers\etc\hosts
          </code>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Ánh xạ domain ảo nội bộ (ví dụ: <code className="text-slate-300">api.local</code>,{' '}
            <code className="text-slate-300">app.test</code>) tới localhost. Tự động sao lưu{' '}
            <code className="text-slate-300">hosts.bak</code> trước mỗi lần thay đổi.
          </p>
        </div>
      </div>

      {/* Control Bar: Search & Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm theo IP, tên miền (domain), hoặc ghi chú..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#12151f] text-slate-100 placeholder-slate-500 text-xs pl-9 pr-4 py-2 rounded-lg border border-[#1e2332] focus:outline-none focus:border-accent"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleFlushDns}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#12151f] hover:bg-[#1a1f2e] text-slate-200 border border-[#1e2332] text-xs font-medium transition-colors cursor-pointer"
            title="Xóa cache DNS của Windows để các thay đổi có hiệu lực ngay"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Flush DNS</span>
          </button>

          <button
            type="button"
            onClick={fetchHosts}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#12151f] hover:bg-[#1a1f2e] text-slate-200 border border-[#1e2332] text-xs font-medium transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-accent ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-accent hover:bg-accent/90 text-white text-xs font-semibold shadow-lg shadow-accent/20 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Bản ghi mới</span>
          </button>
        </div>
      </div>

      {/* Hosts Table */}
      <div className="flex-1 overflow-hidden rounded-xl border border-[#1a1e2a] bg-[#090b10] flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0e111a] text-slate-400 font-mono text-[11px] uppercase sticky top-0 z-10 border-b border-[#1a1e2a]">
              <tr>
                <th className="py-2.5 px-4 w-16">Bật/Tắt</th>
                <th className="py-2.5 px-4">Địa chỉ IP</th>
                <th className="py-2.5 px-4">Tên miền (Hostnames)</th>
                <th className="py-2.5 px-4">Ghi chú</th>
                <th className="py-2.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141824] text-slate-300 font-sans">
              {loading && entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 text-accent animate-spin mx-auto mb-2" />
                    Đang đọc file hosts...
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    Không tìm thấy bản ghi hosts nào.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-[#121624] transition-colors group ${
                      !item.isEnabled ? 'opacity-50 bg-black/20' : ''
                    }`}
                  >
                    {/* Toggle Switch */}
                    <td className="py-2.5 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleEntry(item.id)}
                        className={`w-8 h-4.5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                          item.isEnabled ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
                        }`}
                        title={item.isEnabled ? 'Đang kích hoạt (Bấm để tắt)' : 'Đã tắt (Bấm để bật lại)'}
                      >
                        <span className="w-3.5 h-3.5 rounded-full bg-white block shadow" />
                      </button>
                    </td>

                    {/* IP */}
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-200">
                      {item.ipAddress}
                    </td>

                    {/* Hostnames */}
                    <td className="py-2.5 px-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.hostnames.map((h, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded text-xs font-mono bg-white/[0.06] text-sky-300 border border-white/[0.08]"
                          >
                            {h}
                          </span>
                        ))}
                        {item.isSystemDefault && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                            Default
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Comment */}
                    <td className="py-2.5 px-4 text-slate-400 text-xs italic">
                      {item.comment || '—'}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-colors cursor-pointer"
                          title="Sửa bản ghi"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(item.id)}
                          className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Xóa bản ghi"
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
      </div>

      {/* Add / Edit Modal */}
      {isEditModalOpen && editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-[#0f121a] border border-[#23293a] rounded-xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1a1e2a]">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Globe className="w-4 h-4 text-accent" />
                <span>{editingEntry.id ? 'Chỉnh sửa Bản ghi Hosts' : 'Thêm Bản ghi Hosts Mới'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              {/* IP Input */}
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-medium">Địa chỉ IP:</label>
                <input
                  type="text"
                  placeholder="127.0.0.1"
                  value={editingEntry.ipAddress || ''}
                  onChange={(e) => setEditingEntry({ ...editingEntry, ipAddress: e.target.value })}
                  className="bg-[#090b10] border border-[#1e2332] rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-accent"
                />
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] text-slate-500">Gợi ý nhanh:</span>
                  {['127.0.0.1', '0.0.0.0', '::1'].map((ip) => (
                    <button
                      key={ip}
                      type="button"
                      onClick={() => setEditingEntry({ ...editingEntry, ipAddress: ip })}
                      className="px-1.5 py-0.5 rounded bg-white/[0.04] text-[10px] font-mono text-slate-300 hover:bg-white/[0.08] cursor-pointer"
                    >
                      {ip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hostnames Input */}
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-medium">
                  Tên miền (Hostnames) — cách nhau bằng dấu cách:
                </label>
                <input
                  type="text"
                  placeholder="api.local myapp.test frontend.dev"
                  value={hostnamesInput}
                  onChange={(e) => setHostnamesInput(e.target.value)}
                  className="bg-[#090b10] border border-[#1e2332] rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-accent"
                />
              </div>

              {/* Comment Input */}
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-medium">Ghi chú (Tùy chọn):</label>
                <input
                  type="text"
                  placeholder="Dự án Microservice A"
                  value={editingEntry.comment || ''}
                  onChange={(e) => setEditingEntry({ ...editingEntry, comment: e.target.value })}
                  className="bg-[#090b10] border border-[#1e2332] rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1a1e2a]">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-[#151926] cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveModal}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent hover:bg-accent/90 text-white text-xs font-semibold shadow-lg shadow-accent/20 transition-colors cursor-pointer disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{saving ? 'Đang lưu...' : 'Lưu & Flush DNS'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* =========================================================================================
 * 3. ENVIRONMENT VARIABLES & .ENV STUDIO TAB
 * ========================================================================================= */
const EnvironmentStudioTab: React.FC<{
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}> = ({ onShowToast }) => {
  const [subView, setSubView] = useState<'system' | 'dotenv'>('system');

  // System Vars State
  const [envVars, setEnvVars] = useState<SystemEnvVariableItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [targetFilter, setTargetFilter] = useState<'All' | 'User' | 'Machine'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPathName, setExpandedPathName] = useState<string | null>('PATH');

  // .env Studio State
  const [currentEnv, setCurrentEnv] = useState<string>(
    'PORT=3000\nDATABASE_URL=postgres://localhost:5432/devdb\nDEBUG=true\nAPI_KEY=dev_123456\n'
  );
  const [exampleEnv, setExampleEnv] = useState<string>(
    'PORT=8080\nDATABASE_URL=postgres://user:pass@host:5432/proddb\nSECRET_KEY=your_jwt_secret\nAPI_KEY=your_api_key\nREDIS_HOST=localhost\n'
  );
  const [diffResult, setDiffResult] = useState<DotEnvCompareResult | null>(null);
  const [comparing, setComparing] = useState(false);

  const fetchEnv = async () => {
    setLoading(true);
    try {
      const data = await api.getEnvVariables();
      setEnvVars(data);
    } catch (err: any) {
      onShowToast(err.message || 'Không thể lấy danh sách biến môi trường', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subView === 'system') {
      fetchEnv();
    }
  }, [subView]);

  const filteredVars = useMemo(() => {
    return envVars.filter((v) => {
      const matchesTarget = targetFilter === 'All' || v.target === targetFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q || v.name.toLowerCase().includes(q) || v.value.toLowerCase().includes(q);
      return matchesTarget && matchesSearch;
    });
  }, [envVars, targetFilter, searchQuery]);

  // Dead Path Items Summary
  const deadPathCount = useMemo(() => {
    let count = 0;
    envVars.forEach((v) => {
      if (v.isPath) {
        count += v.pathItems.filter((p) => !p.exists).length;
      }
    });
    return count;
  }, [envVars]);

  // Compare .env
  const handleCompareDotEnv = async () => {
    setComparing(true);
    try {
      const res = await api.compareDotEnv(currentEnv, exampleEnv);
      setDiffResult(res);
      onShowToast(
        `Đã phân tích xong: Phát hiện ${res.missingKeysCount} key còn thiếu!`,
        res.missingKeysCount > 0 ? 'info' : 'success'
      );
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi khi so sánh file .env', 'error');
    } finally {
      setComparing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6 max-w-7xl mx-auto w-full gap-5">
      {/* Sub-tab switcher */}
      <div className="flex items-center justify-between border-b border-[#1a1e2a] pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubView('system')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              subView === 'system'
                ? 'bg-accent/15 text-accent border border-accent/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#12151f]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Biến môi trường Windows & Dead PATH</span>
            {deadPathCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 font-mono">
                {deadPathCount} path chết
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSubView('dotenv')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              subView === 'dotenv'
                ? 'bg-accent/15 text-accent border border-accent/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#12151f]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>.env Studio & So sánh Template</span>
          </button>
        </div>

        {subView === 'system' && (
          <button
            type="button"
            onClick={fetchEnv}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#12151f] hover:bg-[#1a1f2e] text-slate-200 border border-[#1e2332] text-xs font-medium transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-accent ${loading ? 'animate-spin' : ''}`} />
            <span>Quét lại</span>
          </button>
        )}
      </div>

      {/* View 1: Windows System Variables & Dead PATH Inspector */}
      {subView === 'system' && (
        <div className="flex-1 flex flex-col overflow-hidden gap-4">
          {/* Controls: Target Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Tìm biến môi trường (e.g. PATH, JAVA_HOME, DOTNET_ROOT)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#12151f] text-slate-100 placeholder-slate-500 text-xs pl-9 pr-4 py-2 rounded-lg border border-[#1e2332] focus:outline-none focus:border-accent"
              />
            </div>

            {/* Scope Filter */}
            <div className="flex items-center gap-1 bg-[#12151f] p-1 rounded-lg border border-[#1e2332] text-xs">
              {(['All', 'User', 'Machine'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTargetFilter(t)}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    targetFilter === t
                      ? 'bg-white/[0.08] text-slate-100 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t === 'All' ? 'Tất cả' : t === 'User' ? 'User Variables' : 'System (Machine)'}
                </button>
              ))}
            </div>
          </div>

          {/* List of Variables */}
          <div className="flex-1 overflow-y-auto rounded-xl border border-[#1a1e2a] bg-[#090b10] p-3 flex flex-col gap-2">
            {loading && envVars.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <RefreshCw className="w-6 h-6 text-accent animate-spin mx-auto mb-2" />
                Đang đọc biến môi trường...
              </div>
            ) : filteredVars.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Không tìm thấy biến môi trường nào.
              </div>
            ) : (
              filteredVars.map((v) => {
                const isPath = v.isPath;
                const isExpanded = expandedPathName === `${v.target}:${v.name}`;
                const hasDeadPath = v.pathItems.some((p) => !p.exists);

                return (
                  <div
                    key={`${v.target}:${v.name}`}
                    className={`rounded-lg border p-3 flex flex-col gap-2 transition-colors ${
                      hasDeadPath
                        ? 'border-rose-800/40 bg-rose-950/10'
                        : isPath
                        ? 'border-sky-800/30 bg-sky-950/10'
                        : 'border-[#1a1e2a] bg-[#0c0e15]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-100">
                          {v.name}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            v.target === 'Machine'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {v.target}
                        </span>
                        {isPath && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                            PATH ({v.pathItems.length} mục)
                          </span>
                        )}
                        {hasDeadPath && (
                          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 font-mono">
                            <AlertTriangle className="w-3 h-3" />
                            Chứa đường dẫn không tồn tại
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(v.value);
                            onShowToast(`Đã sao chép giá trị biến ${v.name}`, 'success');
                          }}
                          className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                          title="Sao chép giá trị"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        {isPath && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedPathName(isExpanded ? null : `${v.target}:${v.name}`)
                            }
                            className="px-2 py-0.5 rounded bg-white/[0.05] hover:bg-white/[0.1] text-xs text-slate-300 font-mono cursor-pointer"
                          >
                            {isExpanded ? 'Thu gọn' : 'Chi tiết'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Standard Value Display */}
                    {!isPath && (
                      <div className="font-mono text-xs text-slate-300 bg-black/40 p-2 rounded border border-white/[0.04] break-all select-text">
                        {v.value}
                      </div>
                    )}

                    {/* PATH Breakdown */}
                    {isPath && (
                      <div className="flex flex-col gap-1 mt-1">
                        {(!isExpanded ? v.pathItems.slice(0, 3) : v.pathItems).map((p, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center justify-between p-1.5 rounded text-xs font-mono transition-colors ${
                              p.exists
                                ? 'bg-black/30 text-slate-300 hover:bg-black/50'
                                : 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {p.exists ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                              )}
                              <span className="truncate">{p.path}</span>
                            </div>

                            <span
                              className={`text-[10px] px-1 rounded flex-shrink-0 ${
                                p.exists
                                  ? 'text-emerald-400'
                                  : 'bg-rose-600 text-white font-semibold'
                              }`}
                            >
                              {p.exists ? 'Tồn tại' : 'ĐƯỜNG DẪN CHẾT'}
                            </span>
                          </div>
                        ))}

                        {!isExpanded && v.pathItems.length > 3 && (
                          <button
                            type="button"
                            onClick={() => setExpandedPathName(`${v.target}:${v.name}`)}
                            className="text-[11px] text-accent hover:underline text-left pt-1 cursor-pointer"
                          >
                            + Xem thêm {v.pathItems.length - 3} đường dẫn khác...
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* View 2: .env Studio & Diff */}
      {subView === 'dotenv' && (
        <div className="flex-1 flex flex-col overflow-hidden gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-hidden">
            {/* Current .env Input */}
            <div className="flex flex-col gap-1.5 overflow-hidden">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  File .env hiện tại (Local)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentEnv(
                      'PORT=3000\nDATABASE_URL=postgres://localhost:5432/devdb\nDEBUG=true\nAPI_KEY=dev_123456\n'
                    )
                  }
                  className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Mẫu test
                </button>
              </div>
              <textarea
                value={currentEnv}
                onChange={(e) => setCurrentEnv(e.target.value)}
                placeholder="Dán nội dung file .env của bạn vào đây..."
                className="flex-1 w-full bg-[#090b10] border border-[#1e2332] rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-accent resize-none leading-relaxed"
              />
            </div>

            {/* Example .env Input */}
            <div className="flex flex-col gap-1.5 overflow-hidden">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-sky-400" />
                  File .env.example mẫu (Template)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setExampleEnv(
                      'PORT=8080\nDATABASE_URL=postgres://user:pass@host:5432/proddb\nSECRET_KEY=your_jwt_secret\nAPI_KEY=your_api_key\nREDIS_HOST=localhost\n'
                    )
                  }
                  className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Mẫu test
                </button>
              </div>
              <textarea
                value={exampleEnv}
                onChange={(e) => setExampleEnv(e.target.value)}
                placeholder="Dán nội dung file .env.example mẫu vào đây..."
                className="flex-1 w-full bg-[#090b10] border border-[#1e2332] rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-accent resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400">
              So sánh phát hiện key bị thiếu giữa cấu hình thực tế và mẫu ban đầu của dự án.
            </div>
            <button
              type="button"
              onClick={handleCompareDotEnv}
              disabled={comparing}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-accent hover:bg-accent/90 text-white text-xs font-semibold shadow-lg shadow-accent/20 transition-colors cursor-pointer disabled:opacity-50"
            >
              {comparing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>So sánh & Phân tích cấu hình</span>
            </button>
          </div>

          {/* Diff Results Container */}
          {diffResult && (
            <div className="rounded-xl border border-[#1e2332] bg-[#090b10] p-4 flex flex-col gap-3 max-h-60 overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-[#1a1e2a] text-xs">
                <span className="font-semibold text-slate-200">
                  Kết quả phân tích (Tổng: {diffResult.totalKeysCount} keys)
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-rose-400 font-medium">
                    Thiếu: <strong>{diffResult.missingKeysCount}</strong>
                  </span>
                  <span className="text-purple-400 font-medium">
                    Thừa: <strong>{diffResult.extraKeysCount}</strong>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {diffResult.diffEntries.map((d, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded-lg border text-xs font-mono flex flex-col gap-1 ${
                      d.status === 'missing'
                        ? 'border-rose-500/40 bg-rose-950/20 text-rose-300'
                        : d.status === 'extra'
                        ? 'border-purple-500/30 bg-purple-950/20 text-purple-300'
                        : 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <strong className="truncate">{d.key}</strong>
                      <span className="text-[10px] uppercase px-1 rounded bg-black/40">
                        {d.status === 'missing'
                          ? 'Thiếu trong .env'
                          : d.status === 'extra'
                          ? 'Key thêm mới'
                          : 'Khớp'}
                      </span>
                    </div>
                    {d.status === 'missing' && (
                      <span className="text-[10px] text-slate-400 truncate">
                        Gợi ý: {d.exampleValue || '(Chưa có giá trị mẫu)'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
