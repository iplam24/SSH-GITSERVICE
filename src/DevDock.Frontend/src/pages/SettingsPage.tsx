import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  Palette,
  Keyboard,
  UserCheck,
  Terminal,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Lock,
  Key,
  X,
  RefreshCw,
  Sparkles,
  FolderGit2,
  Bot,
  Zap,
  Globe,
  Radio,
  Eye,
  EyeOff,
  Image,
  GitBranch,
  Download,
} from 'lucide-react';
import { AppSettings, GitAccount, GitProvider, AiProviderConfig, AiProviderType, GitGlobalConfig } from '../types';
import { api } from '../services/api';

type SettingsTab = 'aiProviders' | 'gitAccounts' | 'appearance' | 'shortcuts' | 'terminal' | 'security' | 'general';

const AI_PRESETS: Array<{
  type: AiProviderType;
  name: string;
  baseUrl: string;
  models: string[];
  color: string;
  keyPlaceholder: string;
}> = [
  {
    type: 'DeepSeek',
    name: 'DeepSeek AI',
    baseUrl: 'https://api.deepseek.com',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    color: 'from-blue-600 to-cyan-500',
    keyPlaceholder: 'sk-... (Lấy từ platform.deepseek.com)',
  },
  {
    type: 'OpenAI',
    name: 'OpenAI (ChatGPT)',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'o3-mini', 'o1'],
    color: 'from-emerald-600 to-teal-500',
    keyPlaceholder: 'sk-... (Lấy từ platform.openai.com)',
  },
  {
    type: 'Anthropic',
    name: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-3-7-sonnet-20250219', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
    color: 'from-amber-600 to-orange-500',
    keyPlaceholder: 'sk-ant-... (Lấy từ console.anthropic.com)',
  },
  {
    type: 'Gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    color: 'from-blue-500 to-indigo-600',
    keyPlaceholder: 'AIzaSy... (Lấy từ aistudio.google.com)',
  },
  {
    type: 'Ollama',
    name: 'Ollama (Local LLM)',
    baseUrl: 'http://localhost:11434',
    models: ['llama3', 'llama3.2', 'deepseek-r1', 'qwen2.5-coder', 'mistral'],
    color: 'from-yellow-600 to-amber-500',
    keyPlaceholder: 'Chạy offline cục bộ (Không cần API Key)',
  },
  {
    type: 'Groq',
    name: 'Groq (Ultra-fast)',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'deepseek-r1-distill-llama-70b'],
    color: 'from-rose-600 to-pink-500',
    keyPlaceholder: 'gsk_... (Lấy từ console.groq.com)',
  },
  {
    type: 'OpenRouter',
    name: 'OpenRouter (Multi-model)',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: ['anthropic/claude-3.5-sonnet', 'deepseek/deepseek-r1', 'openai/gpt-4o'],
    color: 'from-purple-600 to-indigo-500',
    keyPlaceholder: 'sk-or-v1-... (Lấy từ openrouter.ai)',
  },
  {
    type: 'Custom',
    name: 'Custom / LM Studio',
    baseUrl: 'http://localhost:1234/v1',
    models: ['default'],
    color: 'from-slate-600 to-slate-500',
    keyPlaceholder: 'Khóa API tùy chọn',
  },
];

interface SettingsPageProps {
  settings: AppSettings;
  gitAccounts: GitAccount[];
  aiProviders: AiProviderConfig[];
  onSaveSettings: (s: AppSettings) => void;
  onRefreshAccounts: () => void;
  onRefreshAiProviders: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onOpenSetupWizard?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  gitAccounts,
  aiProviders,
  onSaveSettings,
  onRefreshAccounts,
  onRefreshAiProviders,
  onShowToast,
  onOpenSetupWizard,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('aiProviders');

  // AI Provider Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [editingAiProvider, setEditingAiProvider] = useState<Partial<AiProviderConfig>>({
    name: '',
    providerType: 'DeepSeek',
    apiBaseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    isDefault: false,
  });
  const [aiKeyInput, setAiKeyInput] = useState('');
  const [showAiKey, setShowAiKey] = useState(false);
  const [testingAiId, setTestingAiId] = useState<string | null>(null);
  const [isTestingModalAi, setIsTestingModalAi] = useState(false);
  const [modalTestResult, setModalTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Git Global Config State
  const [gitGlobalConfig, setGitGlobalConfig] = useState<GitGlobalConfig>({
    userName: '',
    userEmail: '',
    defaultBranch: 'main',
    autoCrlf: 'true',
    credentialHelper: 'manager',
    isGitInstalled: false,
    gitVersion: '',
  });
  const [isLoadingGitConfig, setIsLoadingGitConfig] = useState(false);
  const [isSavingGitGlobal, setIsSavingGitGlobal] = useState(false);
  const [isInstallingGitWinget, setIsInstallingGitWinget] = useState(false);

  // Git Account Modal State
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Partial<GitAccount>>({
    name: '',
    provider: 'GitHub',
    username: '',
    email: '',
    isDefault: false,
  });
  const [tokenInput, setTokenInput] = useState('');
  const [showAccountToken, setShowAccountToken] = useState(false);
  const [syncWithGlobalGit, setSyncWithGlobalGit] = useState(true);
  const [testingAccountId, setTestingAccountId] = useState<string | null>(null);
  const [isTestingModalAccount, setIsTestingModalAccount] = useState(false);
  const [modalAccountTestResult, setModalAccountTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const tabs = [
    { id: 'aiProviders' as SettingsTab, label: 'Nhà cung cấp API AI', icon: Sparkles, badge: 'Mới' },
    { id: 'gitAccounts' as SettingsTab, label: 'Tài khoản Git & Repo', icon: UserCheck },
    { id: 'appearance' as SettingsTab, label: 'Giao diện & Chủ đề', icon: Palette },
    { id: 'shortcuts' as SettingsTab, label: 'Phím tắt nhanh', icon: Keyboard },
    { id: 'terminal' as SettingsTab, label: 'Cấu hình Terminal', icon: Terminal },
    { id: 'security' as SettingsTab, label: 'Bảo mật & DPAPI', icon: Shield },
    { id: 'general' as SettingsTab, label: 'Cài đặt hệ thống', icon: SettingsIcon },
  ];

  // AI Provider Actions
  const handleSelectPreset = (preset: (typeof AI_PRESETS)[0]) => {
    setEditingAiProvider({
      ...editingAiProvider,
      name: preset.name,
      providerType: preset.type,
      apiBaseUrl: preset.baseUrl,
      defaultModel: preset.models[0] || 'default',
    });
  };

  const handleSaveAiProvider = async () => {
    if (!editingAiProvider.name) {
      onShowToast('Vui lòng nhập tên nhà cung cấp AI', 'error');
      return;
    }

    try {
      await api.saveAiProvider({
        config: editingAiProvider,
        apiKey: aiKeyInput.trim() || undefined,
      });
      setIsAiModalOpen(false);
      setAiKeyInput('');
      setModalTestResult(null);
      onRefreshAiProviders();
      onShowToast('Đã lưu nhà cung cấp AI an toàn với Windows DPAPI!', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Không thể lưu cấu hình AI', 'error');
    }
  };

  const handleTestModalAi = async () => {
    if (!editingAiProvider.name) {
      onShowToast('Vui lòng nhập tên nhà cung cấp AI trước khi kiểm tra', 'error');
      return;
    }
    setIsTestingModalAi(true);
    setModalTestResult(null);
    try {
      const res = await api.testAiDirectConfig({
        config: editingAiProvider,
        apiKey: aiKeyInput.trim() || undefined,
      });
      if (res.success) {
        setModalTestResult({
          success: true,
          message: `Kết nối thành công (${res.latencyMs}ms)! Model: ${res.modelUsed || 'OK'} • Phản hồi: ${res.responseMessage || 'DevDock AI Connected'}`,
        });
        onShowToast(`Kết nối AI thành công (${res.latencyMs}ms)!`, 'success');
      } else {
        setModalTestResult({
          success: false,
          message: res.errorMessage || 'Kiểm tra thất bại. Vui lòng kiểm tra lại Key và Endpoint.',
        });
        onShowToast(res.errorMessage || 'Kiểm tra kết nối AI thất bại', 'error');
      }
    } catch (err: any) {
      setModalTestResult({
        success: false,
        message: err.message || 'Lỗi kiểm tra kết nối AI',
      });
      onShowToast(err.message || 'Lỗi kiểm tra kết nối AI', 'error');
    } finally {
      setIsTestingModalAi(false);
    }
  };

  const handleTestAiProvider = async (id: string) => {
    setTestingAiId(id);
    try {
      const res = await api.testAiProvider(id);
      if (res.success) {
        onShowToast(`Kết nối AI thành công (${res.latencyMs}ms)! Phản hồi: ${res.responseMessage || 'OK'}`, 'success');
      } else {
        onShowToast(res.errorMessage || 'Kiểm tra kết nối AI thất bại', 'error');
      }
      onRefreshAiProviders();
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi kiểm tra kết nối AI', 'error');
    } finally {
      setTestingAiId(null);
    }
  };

  const handleSetDefaultAi = async (id: string) => {
    try {
      await api.setDefaultAiProvider(id);
      onRefreshAiProviders();
      onShowToast('Đã đặt làm nhà cung cấp AI mặc định', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi đặt mặc định', 'error');
    }
  };

  const handleDeleteAi = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa cấu hình nhà cung cấp AI này?')) return;
    try {
      await api.deleteAiProvider(id);
      onRefreshAiProviders();
      onShowToast('Đã xóa nhà cung cấp AI', 'info');
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi xóa provider', 'error');
    }
  };

  // Git Global & Account Actions
  const loadGitGlobalConfig = async () => {
    setIsLoadingGitConfig(true);
    try {
      const cfg = await api.getGitGlobalConfig();
      if (cfg) {
        setGitGlobalConfig({
          userName: cfg.userName || '',
          userEmail: cfg.userEmail || '',
          defaultBranch: cfg.defaultBranch || 'main',
          autoCrlf: cfg.autoCrlf || 'true',
          credentialHelper: cfg.credentialHelper || 'manager',
          isGitInstalled: cfg.isGitInstalled,
          gitVersion: cfg.gitVersion || '',
        });
      }
    } catch (err: any) {
      console.error('Failed to load git global config:', err);
    } finally {
      setIsLoadingGitConfig(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'gitAccounts') {
      loadGitGlobalConfig();
    }
  }, [activeTab]);

  const handleSaveGitGlobalConfig = async () => {
    setIsSavingGitGlobal(true);
    try {
      await api.setGitGlobalConfig(gitGlobalConfig);
      onShowToast('Đã lưu cấu hình Git Global thành công (git config --global)!', 'success');
      await loadGitGlobalConfig();
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi khi lưu cấu hình Git Global', 'error');
    } finally {
      setIsSavingGitGlobal(false);
    }
  };

  const handleInstallGitViaWinget = async () => {
    setIsInstallingGitWinget(true);
    onShowToast('Đang gọi winget để tải và cài đặt Git. Vui lòng chờ...', 'info');
    try {
      const res = await api.installGitViaWinget();
      if (res.success) {
        onShowToast(res.message || 'Cài đặt Git qua winget thành công!', 'success');
        await loadGitGlobalConfig();
      } else {
        onShowToast(res.message || 'Cài đặt Git thất bại. Hãy kiểm tra kết nối mạng hoặc winget trên máy.', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi khi gọi winget để cài đặt Git', 'error');
    } finally {
      setIsInstallingGitWinget(false);
    }
  };

  const handleTestModalAccount = async () => {
    if (!tokenInput && !editingAccount.id) {
      onShowToast('Vui lòng nhập Personal Access Token (PAT) để kiểm tra', 'error');
      return;
    }
    setIsTestingModalAccount(true);
    setModalAccountTestResult(null);
    try {
      const res = await api.testGitDirectConfig({
        account: editingAccount,
        token: tokenInput || undefined,
      });
      if (res.success) {
        setModalAccountTestResult({
          success: true,
          message: `Token hợp lệ! Xác thực thành công: ${res.displayName || editingAccount.username || 'Git Account'}. Sẵn sàng push code.`,
        });
        onShowToast('Xác thực Git Token thành công!', 'success');
      } else {
        setModalAccountTestResult({
          success: false,
          message: res.errorMessage || 'Token không hợp lệ hoặc không có quyền truy cập repo.',
        });
        onShowToast(res.errorMessage || 'Xác thực Git Token thất bại', 'error');
      }
    } catch (err: any) {
      setModalAccountTestResult({
        success: false,
        message: err.message || 'Lỗi kiểm tra token Git',
      });
      onShowToast(err.message || 'Lỗi kiểm tra token', 'error');
    } finally {
      setIsTestingModalAccount(false);
    }
  };

  const handleSaveAccount = async () => {
    if (!editingAccount.name || !editingAccount.username) {
      onShowToast('Tên gợi nhớ và Username không được để trống', 'error');
      return;
    }

    try {
      await api.saveGitAccount({
        account: editingAccount,
        token: tokenInput || undefined,
      });

      if (syncWithGlobalGit) {
        const updatedGlobal: GitGlobalConfig = {
          ...gitGlobalConfig,
          userName: editingAccount.name || editingAccount.username || gitGlobalConfig.userName,
          userEmail: editingAccount.email || gitGlobalConfig.userEmail,
        };
        try {
          await api.setGitGlobalConfig(updatedGlobal);
          setGitGlobalConfig(updatedGlobal);
        } catch { }
      }

      setIsAccountModalOpen(false);
      setTokenInput('');
      setModalAccountTestResult(null);
      onRefreshAccounts();
      onShowToast('Đã lưu tài khoản Git & Token PAT an toàn bằng Windows DPAPI', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Không thể lưu tài khoản', 'error');
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa tài khoản Git này?')) return;
    try {
      await api.deleteGitAccount(id);
      onRefreshAccounts();
      onShowToast('Đã xóa tài khoản Git', 'info');
    } catch { }
  };

  const handleTestAccount = async (id: string) => {
    setTestingAccountId(id);
    try {
      const res = await api.testGitAccount(id);
      if (res.success) {
        onShowToast(`Kết nối thành công: ${res.displayName || 'OK'}`, 'success');
      } else {
        onShowToast(res.errorMessage || 'Kiểm tra kết nối thất bại', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Kiểm tra kết nối thất bại', 'error');
    } finally {
      setTestingAccountId(null);
    }
  };

  const handleSetDefaultGit = async (acc: GitAccount) => {
    try {
      await api.saveGitAccount({ account: { ...acc, isDefault: true } });
      onRefreshAccounts();
      onShowToast(`Đã đặt '${acc.name}' làm tài khoản mặc định`, 'success');
    } catch { }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#090D16]">
      {/* Settings Sub-Sidebar */}
      <div className="w-64 border-r border-[#1A2235] bg-[#060911] p-3 flex flex-col gap-1 flex-shrink-0">
        <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
          Cài đặt hệ thống
        </div>
        <div className="flex flex-col gap-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white/[0.08] text-slate-100 font-semibold border border-white/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-blue-400' : 'text-slate-400'
                    }`}
                  />
                  <span>{t.label}</span>
                </div>
                {t.badge && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono font-medium">
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Settings Viewport */}
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
        {/* ==================== TAB 1: AI API PROVIDERS ==================== */}
        {activeTab === 'aiProviders' && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#1A2235]">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  <span>Nhà cung cấp API AI (AI Providers)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cấu hình khóa API cho DeepSeek, OpenAI, Claude, Gemini, Ollama... Khóa được mã hóa bằng phần cứng Windows DPAPI.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingAiProvider({
                    name: 'DeepSeek AI',
                    providerType: 'DeepSeek',
                    apiBaseUrl: 'https://api.deepseek.com',
                    defaultModel: 'deepseek-chat',
                    isDefault: false,
                  });
                  setAiKeyInput('');
                  setIsAiModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Provider AI</span>
              </button>
            </div>

            {/* Quick Add Presets Bar */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-slate-400 font-medium">Thêm nhanh theo mẫu nhà cung cấp:</span>
              <div className="flex flex-wrap gap-2">
                {AI_PRESETS.slice(0, 5).map((p) => (
                  <button
                    key={p.type}
                    type="button"
                    onClick={() => {
                      handleSelectPreset(p);
                      setIsAiModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#12141c] hover:bg-[#181b26] border border-[#1e2230] text-xs text-slate-300 transition-colors cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    <span>+ {p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Providers List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-1">
              {aiProviders.map((p) => {
                const isTesting = testingAiId === p.id;
                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                      p.isDefault
                        ? 'bg-[#12141c] border-blue-500/30'
                        : 'bg-[#0c0d12] border-[#1e2230] hover:border-[#2a2f42]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                            <Bot className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                              <span>{p.name}</span>
                              {p.isDefault && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                                  Mặc định
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">{p.providerType}</span>
                          </div>
                        </div>

                        {/* Status badge */}
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-mono ${
                            p.status === 'active'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : p.status === 'invalid'
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              p.status === 'active'
                                ? 'bg-emerald-400 animate-pulse'
                                : p.status === 'invalid'
                                ? 'bg-rose-400'
                                : 'bg-slate-500'
                            }`}
                          />
                          {p.status === 'active'
                            ? `${p.lastLatencyMs || 100}ms`
                            : p.status === 'invalid'
                            ? 'Lỗi'
                            : 'Chưa test'}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-col gap-1 text-[11px] text-slate-400 font-mono">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Model:</span>
                          <span className="text-slate-200 font-medium">{p.defaultModel}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Endpoint:</span>
                          <span className="text-slate-300 truncate max-w-[200px]" title={p.apiBaseUrl}>
                            {p.apiBaseUrl}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Khóa API:</span>
                          <span className="text-emerald-400 text-[10px]">
                            {p.hasKey ? p.maskedKey : 'Chưa nhập khóa'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[#1E2A44] gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleTestAiProvider(p.id)}
                          disabled={isTesting}
                          className="px-2 py-1 rounded bg-[#141E34] hover:bg-[#1C2B4A] text-slate-300 text-[10px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin text-cyan-400' : ''}`} />
                          <span>{isTesting ? 'Đang test...' : 'Test kết nối'}</span>
                        </button>

                        {!p.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultAi(p.id)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[10px] transition-colors cursor-pointer"
                          >
                            Đặt mặc định
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAiProvider(p);
                            setAiKeyInput('');
                            setIsAiModalOpen(true);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Sửa cấu hình"
                        >
                          <SettingsIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAi(p.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Xóa cấu hình"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================== TAB 2: GIT ACCOUNTS & GLOBAL WORKFLOW ==================== */}
        {activeTab === 'gitAccounts' && (
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#1A2235]">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <FolderGit2 className="w-5 h-5 text-emerald-400" />
                  <span>Luồng Thiết Lập Git & Cấu Hình Đẩy Code</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Kiểm tra môi trường Git Windows, tải tự động qua Winget, cấu hình Git Global và quản lý Personal Access Token (PAT) để push code an toàn.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadGitGlobalConfig}
                  disabled={isLoadingGitConfig}
                  className="px-2.5 py-1.5 rounded-lg bg-[#0E1424] hover:bg-[#152037] border border-[#1E2A44] text-slate-300 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Tải lại thông tin Git"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingGitConfig ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
                  <span>Làm mới</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingAccount({
                      name: '',
                      provider: 'GitHub',
                      username: '',
                      email: '',
                      isDefault: gitAccounts.length === 0,
                      apiBaseUrl: '',
                    });
                    setTokenInput('');
                    setModalAccountTestResult(null);
                    setIsAccountModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Tài Khoản Git (PAT)</span>
                </button>
              </div>
            </div>

            {/* BƯỚC 1: Trạng thái Git Engine trên Windows */}
            <div className="p-5 rounded-2xl bg-[#0c0d12] border border-[#1e2230] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                    gitGlobalConfig.isGitInstalled
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  }`}>
                    {gitGlobalConfig.isGitInstalled ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">1. Trạng thái Git Engine Windows</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                        gitGlobalConfig.isGitInstalled
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {gitGlobalConfig.isGitInstalled ? 'Đã Cài Đặt' : 'Chưa Cài Đặt'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {gitGlobalConfig.isGitInstalled
                        ? `Phiên bản phát hiện: ${gitGlobalConfig.gitVersion || 'Git CLI'} — Sẵn sàng cho mọi lệnh git clone, commit, push.`
                        : 'Không tìm thấy tệp thực thi git.exe trong biến môi trường PATH của Windows.'}
                    </p>
                  </div>
                </div>

                {!gitGlobalConfig.isGitInstalled && (
                  <button
                    type="button"
                    onClick={handleInstallGitViaWinget}
                    disabled={isInstallingGitWinget}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isInstallingGitWinget ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        <span>Đang chạy winget install Git.Git...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Cài đặt Git tự động qua Winget</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {!gitGlobalConfig.isGitInstalled && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-center justify-between">
                  <span>
                    Bạn cũng có thể tải Git thủ công từ trang chủ Git SCM nếu máy tính không mở quyền Winget.
                  </span>
                  <a
                    href="https://git-scm.com/download/win"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-cyan-400 hover:underline font-semibold ml-2 shrink-0"
                  >
                    <span>Trang tải Git SCM</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* BƯỚC 2: Cấu hình Git Global (git config --global) */}
            <div className="p-5 rounded-2xl bg-[#0E1424] border border-[#1E2A44] flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-slate-200">2. Cấu hình Git Global Toàn Cục (git config --global)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Thông tin danh tính này sẽ được gắn vào mọi commit trên máy tính của bạn khi đẩy mã nguồn.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 text-[11px] font-medium">Tên hiển thị tác giả (user.name):</label>
                  <input
                    type="text"
                    value={gitGlobalConfig.userName}
                    onChange={(e) => setGitGlobalConfig({ ...gitGlobalConfig, userName: e.target.value })}
                    placeholder="e.g. Nguyen Van A"
                    className="bg-[#060911] border border-[#1E2A44] rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 selectable font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 text-[11px] font-medium">Email tác giả (user.email):</label>
                  <input
                    type="email"
                    value={gitGlobalConfig.userEmail}
                    onChange={(e) => setGitGlobalConfig({ ...gitGlobalConfig, userEmail: e.target.value })}
                    placeholder="e.g. yourname@example.com"
                    className="bg-[#060911] border border-[#1E2A44] rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 selectable font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 text-[11px] font-medium">Nhánh khởi tạo mặc định (init.defaultBranch):</label>
                  <input
                    type="text"
                    value={gitGlobalConfig.defaultBranch}
                    onChange={(e) => setGitGlobalConfig({ ...gitGlobalConfig, defaultBranch: e.target.value })}
                    placeholder="main"
                    className="bg-[#060911] border border-[#1E2A44] rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 selectable font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 text-[11px] font-medium">Xử lý xuống dòng Windows/Linux (core.autocrlf):</label>
                  <select
                    value={gitGlobalConfig.autoCrlf}
                    onChange={(e) => setGitGlobalConfig({ ...gitGlobalConfig, autoCrlf: e.target.value })}
                    className="bg-[#060911] border border-[#1E2A44] rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 selectable font-mono"
                  >
                    <option value="true">true (Chuẩn Windows: Checkout CRLF, Commit LF - Khuyên dùng)</option>
                    <option value="input">input (Checkout giữ nguyên, Commit LF - Cho Linux/WSL)</option>
                    <option value="false">false (Tắt tự động chuyển đổi ký tự kết thúc dòng)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1 lg:col-span-2">
                  <label className="text-slate-300 text-[11px] font-medium">Trình quản lý chứng thực (credential.helper):</label>
                  <select
                    value={gitGlobalConfig.credentialHelper}
                    onChange={(e) => setGitGlobalConfig({ ...gitGlobalConfig, credentialHelper: e.target.value })}
                    className="bg-[#060911] border border-[#1E2A44] rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 selectable font-mono"
                  >
                    <option value="manager">manager (Git Credential Manager - Tích hợp Windows an toàn, Khuyên dùng)</option>
                    <option value="wincred">wincred (Windows Credential Store cổ điển)</option>
                    <option value="cache">cache (Lưu tạm vào bộ nhớ RAM trong thời gian ngắn)</option>
                    <option value="store">store (Lưu file text chưa mã hóa - Không an toàn)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#1E2A44]">
                <span className="text-[11px] text-slate-400">
                  Lưu ý: Email cấu hình ở đây nên trùng với email đăng ký tài khoản GitHub/GitLab của bạn để avatar commit được liên kết chính xác.
                </span>
                <button
                  type="button"
                  onClick={handleSaveGitGlobalConfig}
                  disabled={isSavingGitGlobal}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSavingGitGlobal ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Áp Dụng Vào Git Global</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* BƯỚC 3: Quản lý Tài khoản & Token PAT để Push Code */}
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-200">3. Danh sách Tài khoản & Personal Access Token (PAT) để Push Code</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    GitHub & GitLab không còn cho phép dùng mật khẩu tài khoản khi push code. Dùng Personal Access Token (PAT) với mã hóa phần cứng Windows DPAPI.
                  </p>
                </div>
              </div>

              {/* Security & Token Banner */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/40 via-[#0B1528] to-slate-900 border border-blue-500/20 text-xs flex items-start gap-3">
                <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1 text-[11px] leading-relaxed text-slate-300">
                  <span>
                    <strong className="text-cyan-300">Cách hoạt động của Personal Access Token (PAT):</strong> Khi bạn tạo token trên GitHub (với quyền <code className="text-emerald-300 font-mono">repo</code>) hoặc GitLab (quyền <code className="text-emerald-300 font-mono">write_repository</code>), token sẽ thay thế hoàn toàn mật khẩu khi thực hiện lệnh <code className="text-cyan-300 font-mono">git push</code>.
                  </span>
                  <span className="text-slate-400">
                    DevDock lưu token trực tiếp vào ổ đĩa bằng <strong>Windows Data Protection API (DPAPI)</strong>. Chuỗi mã hóa chỉ có thể được mở bởi tài khoản Windows của bạn trên máy tính này.
                  </span>
                </div>
              </div>

              {/* Account Cards Grid */}
              {gitAccounts.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#0E1424] border border-[#1E2A44] border-dashed text-center flex flex-col items-center justify-center gap-2">
                  <FolderGit2 className="w-10 h-10 text-slate-600" />
                  <span className="text-xs font-bold text-slate-300">Chưa có tài khoản Git nào được cấu hình</span>
                  <p className="text-[11px] text-slate-500 max-w-sm">
                    Nhấn vào "Thêm Tài Khoản Git (PAT)" để thêm tài khoản GitHub hoặc GitLab với Token xác thực đẩy code.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAccount({
                        name: '',
                        provider: 'GitHub',
                        username: '',
                        email: '',
                        isDefault: true,
                        apiBaseUrl: '',
                      });
                      setTokenInput('');
                      setModalAccountTestResult(null);
                      setIsAccountModalOpen(true);
                    }}
                    className="mt-2 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    + Thêm Tài Khoản Ngay
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {gitAccounts.map((acc) => (
                    <div
                      key={acc.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                        acc.isDefault
                          ? 'bg-[#12141c] border-blue-500/30'
                          : 'bg-[#0c0d12] border-[#1e2230] hover:border-[#2a2f42]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-100">{acc.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono font-medium">
                              {acc.provider}
                            </span>
                          </div>
                          {acc.isDefault && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                              Mặc định
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-1.5 flex items-center gap-2">
                          <span>User: <strong className="text-slate-200">{acc.username}</strong></span>
                          {acc.email && (
                            <>
                              <span>•</span>
                              <span>Email: {acc.email}</span>
                            </>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-400/90 font-mono">
                          <Lock className="w-3 h-3 text-emerald-400" />
                          <span>PAT: {acc.maskedToken || '•••••••• (Đã bảo vệ DPAPI)'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2.5 border-t border-[#1E2A44]">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleTestAccount(acc.id)}
                            disabled={testingAccountId === acc.id}
                            className="px-2.5 py-1 rounded bg-[#141E34] hover:bg-[#1C2B4A] text-slate-300 text-[10px] font-medium transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3 h-3 ${testingAccountId === acc.id ? 'animate-spin text-cyan-400' : ''}`} />
                            <span>{testingAccountId === acc.id ? 'Đang test...' : 'Kiểm tra Token'}</span>
                          </button>
                          {!acc.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultGit(acc)}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[10px] transition-colors cursor-pointer"
                            >
                              Đặt mặc định
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAccount(acc);
                              setTokenInput('');
                              setModalAccountTestResult(null);
                              setIsAccountModalOpen(true);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Sửa tài khoản & Cập nhật Token"
                          >
                            <SettingsIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAccount(acc.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Xóa tài khoản"
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

        {/* ==================== TAB 3: APPEARANCE ==================== */}
        {activeTab === 'appearance' && (
          <div className="flex flex-col gap-6">
            <div className="pb-3 border-b border-[#1A2235]">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Palette className="w-5 h-5 text-emerald-400" />
                <span>Giao diện & Chủ đề Windows Fluent</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Tùy chỉnh màu sắc điểm nhấn (Accent Color) và phong cách hiển thị.
              </p>
            </div>

            {/* Accent Colors */}
            <div className="p-5 rounded-2xl bg-[#0c0d12] border border-[#1e2230] flex flex-col gap-4">
              <div>
                <span className="text-xs font-bold text-slate-200">Màu sắc chủ đạo (Accent Color)</span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Thay đổi màu điểm nhấn cho các nút hành động, chỉ báo trạng thái và tiêu điểm trên toàn ứng dụng.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                {[
                  { id: 'blue', label: 'Classic Blue', color: 'bg-blue-500' },
                  { id: 'emerald', label: 'Emerald', color: 'bg-emerald-500' },
                  { id: 'cyan', label: 'Electric Cyan', color: 'bg-cyan-500' },
                  { id: 'violet', label: 'Violet', color: 'bg-purple-500' },
                  { id: 'rose', label: 'Crimson Red', color: 'bg-rose-500' },
                  { id: 'amber', label: 'Amber Gold', color: 'bg-amber-500' },
                ].map((c) => {
                  const isSelected = (settings.accentColor || 'blue') === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onSaveSettings({ ...settings, accentColor: c.id });
                        document.documentElement.setAttribute('data-accent', c.id);
                        onShowToast(`Đã đổi màu chủ đạo thành ${c.label}`, 'success');
                      }}
                      className={`flex flex-col items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500/60 bg-blue-500/10 text-slate-100 font-semibold shadow-sm'
                          : 'border-[#1e2230] bg-[#12141c] text-slate-400 hover:text-slate-200 hover:border-[#2a2f42]'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full ${c.color} flex items-center justify-center`}>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-white font-bold" />}
                      </span>
                      <span className="text-[11px]">{c.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Theme Preview Card */}
              <div className="mt-2 p-4 rounded-xl bg-[#12141c] border border-[#1e2230] flex flex-col gap-2.5">
                <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold tracking-wider">Xem trước giao diện hiện tại:</span>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 rounded-md bg-white/[0.06] text-slate-200 text-xs font-medium border border-white/10">
                    Badge Trạng Thái
                  </div>
                  <button type="button" className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors cursor-pointer">
                    Nút Hoạt Động
                  </button>
                  <span className="text-xs text-slate-400">
                    Chế độ: <strong className="text-slate-200 font-medium">Dark Modern (Linear & Raycast Inspired)</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 4: TERMINAL CONFIG ==================== */}
        {activeTab === 'terminal' && (
          <div className="flex flex-col gap-6">
            <div className="pb-3 border-b border-[#1A2235]">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Terminal className="w-5 h-5 text-emerald-400" />
                <span>Cấu hình Console & Terminal</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Tùy chỉnh cỡ chữ, phông chữ lập trình, shell mặc định và kiểm tra thời gian thực.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Controls */}
              <div className="p-5 rounded-2xl bg-[#0E1424] border border-[#1E2A44] flex flex-col gap-4">
                {/* Font Size Slider */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200">Cỡ chữ Terminal (Font Size):</label>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      {settings.terminalFontSize || 13}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={11}
                    max={20}
                    step={1}
                    value={settings.terminalFontSize || 13}
                    onChange={(e) => {
                      const newSize = parseInt(e.target.value);
                      onSaveSettings({ ...settings, terminalFontSize: newSize });
                    }}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>11px (Nhỏ)</span>
                    <span>14px (Chuẩn)</span>
                    <span>20px (Lớn)</span>
                  </div>
                </div>

                {/* Font Family Dropdown */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-200">Phông chữ dòng lệnh (Font Family):</label>
                  <select
                    value={settings.terminalFontFamily || "'Cascadia Code', 'Fira Code', Consolas, monospace"}
                    onChange={(e) => {
                      onSaveSettings({ ...settings, terminalFontFamily: e.target.value });
                    }}
                    className="bg-[#060911] border border-[#1E2A44] rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="'Cascadia Code', 'Fira Code', Consolas, monospace">
                      Cascadia Code (Mặc định Windows Terminal)
                    </option>
                    <option value="'JetBrains Mono', 'Fira Code', monospace">
                      JetBrains Mono (Khuyên dùng cho lập trình)
                    </option>
                    <option value="'Fira Code', Consolas, monospace">
                      Fira Code (Hỗ trợ Ligatures)
                    </option>
                    <option value="'Consolas', 'Courier New', monospace">
                      Consolas (Cổ điển Windows)
                    </option>
                  </select>
                </div>

                {/* Default Shell */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-200">Shell mặc định khi mở Tab mới:</label>
                  <select
                    value={settings.defaultShell || 'PowerShell'}
                    onChange={(e) => {
                      onSaveSettings({ ...settings, defaultShell: e.target.value as any });
                    }}
                    className="bg-[#060911] border border-[#1E2A44] rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="PowerShell">PowerShell (powershell.exe)</option>
                    <option value="Cmd">Command Prompt (cmd.exe)</option>
                    <option value="GitBash">Git Bash (bash.exe)</option>
                    <option value="Wsl">WSL Ubuntu / Linux (wsl.exe)</option>
                  </select>
                </div>

                {/* Terminal Wallpaper Section */}
                <div className="flex flex-col gap-2 pt-3 border-t border-[#1E2A44]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Image className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Hình nền Terminal (Wallpaper):</span>
                    </label>
                    {settings.terminalBackgroundImage && (
                      <button
                        type="button"
                        onClick={() => onSaveSettings({ ...settings, terminalBackgroundImage: '' })}
                        className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                      >
                        Gỡ hình nền
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={settings.terminalBackgroundImage || ''}
                    onChange={(e) => onSaveSettings({ ...settings, terminalBackgroundImage: e.target.value })}
                    placeholder="URL hình ảnh (https://...) hoặc đường dẫn ảnh..."
                    className="bg-[#060911] border border-[#1E2A44] rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500 selectable"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-500">Mẫu có sẵn:</span>
                    {[
                      { name: 'Cyber Matrix', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1200&auto=format&fit=crop' },
                      { name: 'Deep Space', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1200&auto=format&fit=crop' },
                      { name: 'Neon City', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop' },
                      { name: 'Dark Abstract', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop' },
                    ].map((wp) => (
                      <button
                        key={wp.name}
                        type="button"
                        onClick={() => onSaveSettings({ ...settings, terminalBackgroundImage: wp.url })}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                          settings.terminalBackgroundImage === wp.url
                            ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 font-bold'
                            : 'border-[#1E2A44] bg-[#070B14] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {wp.name}
                      </button>
                    ))}
                  </div>

                  {/* Opacity & Blur Sliders */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Độ mờ (Opacity):</span>
                        <span className="font-mono text-cyan-400 font-bold">
                          {Math.round((settings.terminalBackgroundOpacity ?? 0.25) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.05}
                        max={0.7}
                        step={0.05}
                        value={settings.terminalBackgroundOpacity ?? 0.25}
                        onChange={(e) => onSaveSettings({ ...settings, terminalBackgroundOpacity: parseFloat(e.target.value) })}
                        className="w-full accent-cyan-500 cursor-pointer h-1.5"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Độ nhòe (Blur):</span>
                        <span className="font-mono text-cyan-400 font-bold">
                          {settings.terminalBackgroundBlur ?? 2}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={10}
                        step={1}
                        value={settings.terminalBackgroundBlur ?? 2}
                        onChange={(e) => onSaveSettings({ ...settings, terminalBackgroundBlur: parseInt(e.target.value) })}
                        className="w-full accent-cyan-500 cursor-pointer h-1.5"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Real-time Preview Box */}
              <div className="p-5 rounded-2xl bg-[#0E1424] border border-[#1E2A44] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Xem trước Terminal thời gian thực:</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Trực quan xterm</span>
                </div>

                <div className="flex-1 rounded-xl bg-[#060911] border border-[#1E2A44] p-4 flex flex-col justify-between overflow-hidden shadow-inner relative">
                  {settings.terminalBackgroundImage && (
                    <div
                      className="absolute inset-0 pointer-events-none bg-cover bg-center transition-all duration-300"
                      style={{
                        backgroundImage: `url('${settings.terminalBackgroundImage}')`,
                        opacity: settings.terminalBackgroundOpacity ?? 0.25,
                        filter: `blur(${settings.terminalBackgroundBlur ?? 2}px)`,
                      }}
                    />
                  )}
                  <div
                    style={{
                      fontSize: `${settings.terminalFontSize || 13}px`,
                      fontFamily: settings.terminalFontFamily || "'Cascadia Code', 'Fira Code', Consolas, monospace",
                    }}
                    className="relative z-10 leading-relaxed text-slate-200 font-mono selectable"
                  >
                    <div className="text-slate-400">Windows PowerShell [Version 10.0.26100.3194]</div>
                    <div className="text-slate-500">(c) Microsoft Corporation. All rights reserved.</div>
                    <br />
                    <div className="text-emerald-400">
                      PS D:\ToolTienich&gt; <span className="text-slate-100">git status</span>
                    </div>
                    <div className="text-cyan-400">On branch main</div>
                    <div className="text-slate-300">Your branch is up to date with 'origin/main'.</div>
                    <div className="text-slate-400 mt-1">Changes to be committed:</div>
                    <div className="text-emerald-300 ml-4">+ modified: src/DevDock.Frontend/TerminalPage.tsx</div>
                    <div className="text-emerald-300 ml-4">+ modified: src/DevDock.Frontend/AiPage.tsx</div>
                    <br />
                    <div className="text-emerald-400 flex items-center gap-1">
                      <span>PS D:\ToolTienich&gt;</span>
                      <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 5: SHORTCUTS CHEAT SHEET ==================== */}
        {activeTab === 'shortcuts' && (
          <div className="flex flex-col gap-6">
            <div className="pb-3 border-b border-[#1A2235]">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-emerald-400" />
                <span>Bảng Phím Tắt Nhanh (Keyboard Shortcuts)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Tăng tốc độ làm việc của lập trình viên với các tổ hợp phím tắt nhanh toàn hệ thống.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0E1424] border border-[#1E2A44] flex flex-col gap-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#1E2A44] text-[11px] font-mono text-slate-400 uppercase">
                      <th className="pb-2.5 font-semibold">Tổ Hợp Phím</th>
                      <th className="pb-2.5 font-semibold">Hành Động / Chức Năng</th>
                      <th className="pb-2.5 font-semibold">Phân Loại</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A2235] font-sans">
                    {[
                      { keys: 'Ctrl + Space', desc: 'Mở Command Palette tìm kiếm và điều hướng nhanh toàn ứng dụng', cat: 'Toàn cục' },
                      { keys: 'Ctrl + 1', desc: 'Chuyển nhanh tới trang Tổng quan (Dashboard)', cat: 'Điều hướng' },
                      { keys: 'Ctrl + 2', desc: 'Chuyển nhanh tới trang Quản lý Dự án (Projects)', cat: 'Điều hướng' },
                      { keys: 'Ctrl + 3', desc: 'Chuyển nhanh tới Quản lý Git & Branch', cat: 'Điều hướng' },
                      { keys: 'Ctrl + 4', desc: 'Chuyển nhanh tới Trợ lý AI Copilot CLI REPL', cat: 'Điều hướng' },
                      { keys: 'Ctrl + 5', desc: 'Chuyển nhanh tới Bộ Tiện ích Lập trình viên (Dev Tools)', cat: 'Điều hướng' },
                      { keys: 'Ctrl + Shift + S', desc: 'Mở trang Quản lý Kết nối SSH Remote', cat: 'Công cụ' },
                      { keys: 'Ctrl + Shift + T', desc: 'Mở Terminal Console đa tab', cat: 'Công cụ' },
                      { keys: 'Ctrl + Shift + G', desc: 'Mở nhanh Git Repo của dự án hiện tại', cat: 'Công cụ' },
                      { keys: 'Ctrl + Shift + A', desc: 'Mở nhanh Trung tâm AI Copilot', cat: 'Công cụ' },
                      { keys: 'Ctrl + ,', desc: 'Mở Cài đặt hệ thống (Settings)', cat: 'Hệ thống' },
                      { keys: 'Enter', desc: 'Gửi câu hỏi / lệnh trong AI CLI REPL', cat: 'AI CLI' },
                      { keys: 'Shift + Enter', desc: 'Xuống dòng mới trong ô soạn thảo AI', cat: 'AI CLI' },
                      { keys: '↑ / ↓ (Mũi tên)', desc: 'Duyệt lại lịch sử các lệnh AI CLI đã gửi gần đây', cat: 'AI CLI' },
                    ].map((s, idx) => (
                      <tr key={idx} className="hover:bg-[#121A2E]/50 transition-colors">
                        <td className="py-2.5 pr-4">
                          <kbd className="px-2 py-1 rounded-md bg-[#070B14] border border-[#2B3B5C] font-mono text-[11px] text-emerald-400 font-bold shadow-sm inline-block">
                            {s.keys}
                          </kbd>
                        </td>
                        <td className="py-2.5 pr-4 text-slate-200">{s.desc}</td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                            {s.cat}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 6: SECURITY & DPAPI ==================== */}
        {activeTab === 'security' && (
          <div className="flex flex-col gap-6">
            <div className="pb-3 border-b border-[#1A2235]">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                <span>Bảo Mật & Mã Hóa Windows DPAPI</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Cơ chế bảo vệ thông tin đăng nhập, Git Token và API Key độc quyền bằng phần cứng Windows.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-5 rounded-2xl bg-[#0c0d12] border border-[#1e2230] flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                    <Lock className="w-4 h-4" />
                    <span>Trạng thái Mã hóa: ĐANG HOẠT ĐỘNG (Active)</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    DevDock sử dụng <strong>Windows Data Protection API (DPAPI)</strong> với phạm vi{' '}
                    <code className="text-emerald-400 font-mono text-[11px]">DataProtectionScope.CurrentUser</code>.
                    Tất cả các khóa API AI (DeepSeek, OpenAI, Claude) và SSH Private Keys đều được mã hóa bằng khóa gắn liền với tài khoản đăng nhập Windows của bạn.
                  </p>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Ngay cả khi file cấu hình JSON bị sao chép sang máy tính khác, dữ liệu nhạy cảm vẫn không thể bị giải mã hay đánh cắp.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#1E2A44] text-xs text-slate-400 font-mono">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Khóa bí mật không bao giờ hiển thị dạng văn bản thô (plaintext)</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#0E1424] border border-[#1E2A44] flex flex-col justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-slate-200">Kiểm tra & Xác thực Hệ thống</div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Xác minh tính toàn vẹn của mô-đun mã hóa DPAPI trên hệ điều hành này.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onShowToast('Hệ thống DPAPI hoạt động hoàn hảo! Dữ liệu bảo mật tuyệt đối.', 'success');
                  }}
                  className="py-2 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold text-xs border border-emerald-500/30 transition-colors cursor-pointer"
                >
                  Kiểm tra toàn vẹn DPAPI ngay
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 7: GENERAL & WINDOWS INTEGRATIONS ==================== */}
        {activeTab === 'general' && (
          <div className="flex flex-col gap-6">
            <div className="pb-3 border-b border-[#1A2235]">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-emerald-400" />
                <span>Cài Đặt Hệ Thống & Tích Hợp Windows</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Đăng ký DevDock vào biến môi trường PATH, menu chuột phải Explorer, tạo biểu tượng Desktop và chạy lại Setup Wizard.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Shortcut */}
              <div className="p-5 rounded-2xl bg-[#0E1424] border border-[#1E2A44] flex flex-col justify-between gap-3 shadow-sm">
                <div>
                  <div className="text-xs font-bold text-slate-200">Biểu tượng Desktop</div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Tạo lối tắt `DevDock.lnk` với icon Cyber neon độ phân giải cao ngoài Desktop.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await api.createDesktopShortcut();
                      onShowToast(res.message || 'Đã tạo Shortcut trên màn hình Desktop!', 'success');
                    } catch (err: any) {
                      onShowToast(err.message || 'Lỗi tạo shortcut', 'error');
                    }
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold text-xs border border-emerald-500/30 transition-colors cursor-pointer"
                >
                  Tạo Shortcut Desktop Ngay
                </button>
              </div>

              {/* Context Menu */}
              <div className="p-5 rounded-2xl bg-[#0E1424] border border-[#1E2A44] flex flex-col justify-between gap-3 shadow-sm">
                <div>
                  <div className="text-xs font-bold text-slate-200">Menu Chuột Phải Explorer</div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Thêm tùy chọn "Mở bằng DevDock" khi click phải vào thư mục bất kỳ trong Windows Explorer.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await api.registerContextMenu();
                      onShowToast(res.message, res.success ? 'success' : 'error');
                    } catch (err: any) {
                      onShowToast(err.message || 'Lỗi đăng ký Context Menu', 'error');
                    }
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 font-semibold text-xs border border-blue-500/30 transition-colors cursor-pointer"
                >
                  Đăng ký Menu Chuột Phải
                </button>
              </div>

              {/* Setup Wizard */}
              <div className="p-5 rounded-2xl bg-[#0E1424] border border-[#1E2A44] flex flex-col justify-between gap-3 shadow-sm">
                <div>
                  <div className="text-xs font-bold text-slate-200">Thuật Sĩ Thiết Lập (Setup Wizard)</div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Mở lại màn hình chào đón và hướng dẫn thiết lập hệ thống từng bước.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenSetupWizard) onOpenSetupWizard();
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-semibold text-xs border border-purple-500/30 transition-colors cursor-pointer"
                >
                  Mở Trình Hướng Dẫn Setup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==================== MODAL: ADD / EDIT AI PROVIDER ==================== */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E1424] border border-[#2A3B5E] rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#1E2A44] pb-3">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Cấu hình Nhà cung cấp API AI (AI Provider)</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsAiModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Presets selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-slate-300">Chọn mẫu nhanh (Preset):</label>
              <div className="grid grid-cols-4 gap-1.5">
                {AI_PRESETS.map((p) => (
                  <button
                    key={p.type}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-medium border text-center transition-all cursor-pointer truncate ${
                      editingAiProvider.providerType === p.type
                        ? 'border-cyan-400 bg-cyan-500/15 text-cyan-300 font-bold'
                        : 'border-[#1E2A44] bg-[#060911] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {p.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 font-medium">Tên hiển thị:</label>
                  <input
                    type="text"
                    value={editingAiProvider.name || ''}
                    onChange={(e) => setEditingAiProvider({ ...editingAiProvider, name: e.target.value })}
                    placeholder="DeepSeek AI..."
                    className="bg-[#060911] border border-[#1E2A44] rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500 selectable"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 font-medium">Model mặc định:</label>
                  <input
                    type="text"
                    value={editingAiProvider.defaultModel || ''}
                    onChange={(e) => setEditingAiProvider({ ...editingAiProvider, defaultModel: e.target.value })}
                    placeholder="deepseek-chat, gpt-4o..."
                    className="bg-[#060911] border border-[#1E2A44] rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500 selectable"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-300 font-medium">Endpoint API (Base URL):</label>
                <input
                  type="text"
                  value={editingAiProvider.apiBaseUrl || ''}
                  onChange={(e) => setEditingAiProvider({ ...editingAiProvider, apiBaseUrl: e.target.value })}
                  placeholder="https://api.deepseek.com hoặc http://localhost:11434"
                  className="bg-[#060911] border border-[#1E2A44] rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500 selectable"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-medium flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Khóa bí mật API Key (Mã hóa DPAPI):</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAiKey(!showAiKey)}
                    className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    {showAiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showAiKey ? 'Ẩn' : 'Hiện'}</span>
                  </button>
                </div>
                <input
                  type={showAiKey ? 'text' : 'password'}
                  value={aiKeyInput}
                  onChange={(e) => setAiKeyInput(e.target.value)}
                  placeholder={
                    editingAiProvider.hasKey
                      ? `Đang lưu (${editingAiProvider.maskedKey}) — Để trống để giữ nguyên`
                      : 'sk-... hoặc token API'
                  }
                  className="bg-[#060911] border border-[#1E2A44] rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500 selectable"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isDefaultCheck"
                  checked={editingAiProvider.isDefault || false}
                  onChange={(e) => setEditingAiProvider({ ...editingAiProvider, isDefault: e.target.checked })}
                  className="rounded border-[#1E2A44] text-cyan-500 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="isDefaultCheck" className="text-slate-300 text-xs cursor-pointer">
                  Đặt làm Nhà cung cấp AI mặc định cho DevDock
                </label>
              </div>

              {modalTestResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                    modalTestResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {modalTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  )}
                  <span className="leading-relaxed selectable">{modalTestResult.message}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#1E2A44]">
              <button
                type="button"
                onClick={handleTestModalAi}
                disabled={isTestingModalAi}
                className="py-1.5 px-3 rounded-lg bg-[#070B14] hover:bg-[#121A2E] text-slate-200 border border-[#2B3B5C] font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isTestingModalAi ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    <span>Đang ping API...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Kiểm tra kết nối</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAiModalOpen(false);
                    setModalTestResult(null);
                  }}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveAiProvider}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg cursor-pointer transition-colors"
                >
                  Lưu Nhà Cung Cấp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ADD / EDIT GIT ACCOUNT & PAT TOKEN ==================== */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E1424] border border-[#2A3B5E] rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#1E2A44] pb-3">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-emerald-400" />
                <span>{editingAccount.id ? 'Cập Nhật Tài Khoản Git & Token PAT' : 'Thêm Tài Khoản Git & Token Đẩy Code'}</span>
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsAccountModalOpen(false);
                  setModalAccountTestResult(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Provider selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-slate-300">Chọn Nhà cung cấp Git (Provider):</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['GitHub', 'GitLab', 'Bitbucket', 'Generic'] as GitProvider[]).map((prov) => (
                  <button
                    key={prov}
                    type="button"
                    onClick={() => setEditingAccount({ ...editingAccount, provider: prov })}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-medium border text-center transition-all cursor-pointer ${
                      editingAccount.provider === prov
                        ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300 font-bold'
                        : 'border-[#1E2A44] bg-[#060911] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {prov === 'Generic' ? 'Custom' : prov}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 font-medium">Tên gợi nhớ:</label>
                  <input
                    type="text"
                    value={editingAccount.name || ''}
                    onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
                    placeholder="e.g. GitHub Cá Nhân, GitLab Công Ty"
                    className="bg-[#060911] border border-[#1E2A44] rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 selectable"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 font-medium">Tên người dùng (Username):</label>
                  <input
                    type="text"
                    value={editingAccount.username || ''}
                    onChange={(e) => setEditingAccount({ ...editingAccount, username: e.target.value })}
                    placeholder="e.g. octocat"
                    className="bg-[#060911] border border-[#1E2A44] rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500 selectable"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 font-medium">Email tài khoản Git:</label>
                  <input
                    type="email"
                    value={editingAccount.email || ''}
                    onChange={(e) => setEditingAccount({ ...editingAccount, email: e.target.value })}
                    placeholder="e.g. your-email@example.com"
                    className="bg-[#060911] border border-[#1E2A44] rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500 selectable"
                  />
                </div>

                {(editingAccount.provider === 'GitLab' || editingAccount.provider === 'Generic' || editingAccount.provider === 'Bitbucket') && (
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-300 font-medium">API Endpoint (Base URL):</label>
                    <input
                      type="text"
                      value={editingAccount.apiBaseUrl || ''}
                      onChange={(e) => setEditingAccount({ ...editingAccount, apiBaseUrl: e.target.value })}
                      placeholder="e.g. https://gitlab.mycompany.com"
                      className="bg-[#060911] border border-[#1E2A44] rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500 selectable"
                    />
                  </div>
                )}
              </div>

              {/* Personal Access Token Input */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-medium flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>Personal Access Token (PAT) để Push/Pull Code:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAccountToken(!showAccountToken)}
                    className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    {showAccountToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showAccountToken ? 'Ẩn' : 'Hiện'}</span>
                  </button>
                </div>
                <input
                  type={showAccountToken ? 'text' : 'password'}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder={
                    editingAccount.maskedToken
                      ? `Đang lưu (${editingAccount.maskedToken}) — Để trống để giữ nguyên token hiện tại`
                      : editingAccount.provider === 'GitHub'
                      ? 'ghp_xxxxxxxxxxxxxxxxxxxx (Bắt buộc scope repo để push code)'
                      : 'glpat-xxxxxxxxxxxxxxxxxxxx'
                  }
                  className="bg-[#060911] border border-[#1E2A44] rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500 selectable"
                />
              </div>

              {/* Token Guidelines Helper */}
              <div className="p-3 rounded-xl bg-[#070B14] border border-[#1E2A44] text-[11px] text-slate-400 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    <span>Mã hóa bảo vệ bằng Windows DPAPI</span>
                  </span>
                  {editingAccount.provider === 'GitHub' && (
                    <a
                      href="https://github.com/settings/tokens/new?scopes=repo,workflow,write:packages,read:user,user:email"
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 hover:underline flex items-center gap-0.5 text-[10px]"
                    >
                      <span>Tạo token GitHub</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                  {editingAccount.provider === 'GitLab' && (
                    <a
                      href="https://gitlab.com/-/user_settings/personal_access_tokens"
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 hover:underline flex items-center gap-0.5 text-[10px]"
                    >
                      <span>Tạo token GitLab</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  {editingAccount.provider === 'GitHub'
                    ? 'Yêu cầu scope tối thiểu: `repo` (để clone private repo và git push) và `read:user`.'
                    : 'Yêu cầu scope tối thiểu: `api` hoặc `write_repository` và `read_repository`.'}
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="syncGlobalCheck"
                    checked={syncWithGlobalGit}
                    onChange={(e) => setSyncWithGlobalGit(e.target.checked)}
                    className="rounded border-[#1E2A44] text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="syncGlobalCheck" className="text-slate-300 text-xs cursor-pointer">
                    Đồng bộ Tên & Email này vào Git Global (<code className="text-cyan-300 font-mono text-[10px]">user.name</code>, <code className="text-cyan-300 font-mono text-[10px]">user.email</code>)
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isDefaultAccountCheck"
                    checked={editingAccount.isDefault || false}
                    onChange={(e) => setEditingAccount({ ...editingAccount, isDefault: e.target.checked })}
                    className="rounded border-[#1E2A44] text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="isDefaultAccountCheck" className="text-slate-300 text-xs cursor-pointer">
                    Đặt làm tài khoản Git mặc định của hệ thống
                  </label>
                </div>
              </div>

              {modalAccountTestResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                    modalAccountTestResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {modalAccountTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  )}
                  <span className="leading-relaxed selectable">{modalAccountTestResult.message}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#1E2A44]">
              <button
                type="button"
                onClick={handleTestModalAccount}
                disabled={isTestingModalAccount}
                className="py-1.5 px-3 rounded-lg bg-[#070B14] hover:bg-[#121A2E] text-slate-200 border border-[#2B3B5C] font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isTestingModalAccount ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    <span>Đang kiểm tra token...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Kiểm tra Token trực tiếp</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountModalOpen(false);
                    setModalAccountTestResult(null);
                  }}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveAccount}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg cursor-pointer transition-colors"
                >
                  Lưu Tài Khoản (DPAPI)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
