import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Terminal,
  FolderGit2,
  ExternalLink,
  Shield,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Cpu,
  Monitor,
  Check,
  X,
  Play,
  Layers,
  ChevronRight,
  Sliders,
  Settings,
  CornerDownRight,
} from 'lucide-react';
import {
  AppSettings,
  SetupDiagnostics,
  SystemIntegrationStatus,
  ApplySetupRequest,
  TerminalShellType,
} from '../types';
import { api } from '../services/api';
import { DevDockLogo } from '../components/DevDockLogo';

interface SetupPageProps {
  settings: AppSettings;
  onFinishSetup: (newSettings: AppSettings) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const SetupPage: React.FC<SetupPageProps> = ({
  settings,
  onFinishSetup,
  onClose,
  isModal = false,
}) => {
  const [step, setStep] = useState<number>(1);
  const [diagnostics, setDiagnostics] = useState<SetupDiagnostics | null>(null);
  const [integrations, setIntegrations] = useState<SystemIntegrationStatus | null>(null);
  const [loadingDiag, setLoadingDiag] = useState<boolean>(true);
  const [applying, setApplying] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Setup form states
  const [language, setLanguage] = useState<'vi' | 'en'>(settings.language || 'vi');
  const [theme, setTheme] = useState<string>(settings.theme || 'dark');
  const [accentColor, setAccentColor] = useState<string>(settings.accentColor || 'blue');
  const [defaultShell, setDefaultShell] = useState<TerminalShellType>(settings.defaultShell || 'PowerShell');
  const [addToPath, setAddToPath] = useState<boolean>(true);
  const [registerContextMenu, setRegisterContextMenu] = useState<boolean>(true);
  const [runAtStartup, setRunAtStartup] = useState<boolean>(false);
  const [registerProtocol, setRegisterProtocol] = useState<boolean>(true);

  // Load diagnostics & current Windows integrations on mount
  const refreshData = async () => {
    setLoadingDiag(true);
    try {
      const [diag, integ] = await Promise.all([
        api.getSetupDiagnostics(),
        api.getIntegrationStatus(),
      ]);
      setDiagnostics(diag);
      setIntegrations(integ);
      if (integ.isInPath !== undefined) {
        setAddToPath(!integ.isInPath); // if not in path, suggest adding
      }
      if (integ.isContextMenuRegistered !== undefined) {
        setRegisterContextMenu(!integ.isContextMenuRegistered);
      }
      if (integ.isStartupRegistered !== undefined) {
        setRunAtStartup(integ.isStartupRegistered);
      }
    } catch (err: any) {
      console.error('Failed to load setup diagnostics', err);
    } finally {
      setLoadingDiag(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Quick action single-clicks
  const handleQuickAddToPath = async () => {
    setApplying(true);
    try {
      const res = await api.addToPath();
      setActionMessage(res.message);
      if (res.status) setIntegrations(res.status);
    } catch (err: any) {
      setActionMessage(err.message || 'Lỗi thêm vào PATH');
    } finally {
      setApplying(false);
    }
  };

  const handleQuickRegisterContextMenu = async () => {
    setApplying(true);
    try {
      const res = await api.registerContextMenu();
      setActionMessage(res.message);
      if (res.status) setIntegrations(res.status);
    } catch (err: any) {
      setActionMessage(err.message || 'Lỗi đăng ký Context Menu');
    } finally {
      setApplying(false);
    }
  };

  const handleQuickRegisterStartup = async () => {
    setApplying(true);
    try {
      const res = await api.registerStartup();
      setActionMessage(res.message);
      if (res.status) setIntegrations(res.status);
    } catch (err: any) {
      setActionMessage(err.message || 'Lỗi cấu hình khởi động');
    } finally {
      setApplying(false);
    }
  };

  // Final apply setup
  const handleCompleteSetup = async () => {
    setApplying(true);
    try {
      const req: ApplySetupRequest = {
        addToPath,
        registerContextMenu,
        runAtStartup,
        registerProtocol,
        language,
        theme,
        accentColor,
        defaultShell,
      };
      const res = await api.applySetup(req);
      const updatedSettings: AppSettings = {
        ...settings,
        language,
        theme,
        accentColor,
        defaultShell,
        hasCompletedSetup: true,
        addToPath,
        runAtStartup,
        registerContextMenu,
      };
      onFinishSetup(updatedSettings);
    } catch (err: any) {
      setActionMessage(err.message || 'Lỗi áp dụng cấu hình');
    } finally {
      setApplying(false);
    }
  };

  const steps = [
    { num: 1, title: 'Chào mừng', desc: 'Hồ sơ & Giao diện' },
    { num: 2, title: 'Chẩn đoán', desc: 'Yêu cầu hệ thống' },
    { num: 3, title: 'Quyền & PATH', desc: 'Tích hợp Windows cấp sâu' },
    { num: 4, title: 'Môi trường', desc: 'Shell & Phím tắt' },
    { num: 5, title: 'Hoàn tất', desc: 'Sẵn sàng làm việc' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#070A0F] text-slate-100 select-none relative">
      {/* Background cyber glow effect */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <div className="h-16 border-b border-[#1E293B] bg-[#0A0E17]/80 backdrop-blur-md px-6 flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <DevDockLogo size={36} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-wider text-slate-100 font-mono">
                DEVDOCK ONBOARDING
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono border border-emerald-500/30">
                Setup Wizard v1.0
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Thiết lập tối ưu hóa môi trường lập trình cấp sâu trên Windows
            </span>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[#1E293B] transition-colors cursor-pointer"
            title="Đóng thiết lập"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Wizard Progress Bar */}
      <div className="border-b border-[#1E293B] bg-[#0B0F17] px-8 py-3 flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center justify-between w-full max-w-4xl mx-auto">
          {steps.map((s, idx) => {
            const isCompleted = step > s.num;
            const isCurrent = step === s.num;
            return (
              <React.Fragment key={s.num}>
                <div
                  onClick={() => setStep(s.num)}
                  className={`flex items-center gap-2.5 cursor-pointer group transition-all`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCompleted
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                        : isCurrent
                        ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500'
                        : 'bg-[#111827] text-slate-500 border border-[#1E293B] group-hover:border-slate-600'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.num}
                  </div>
                  <div className="hidden sm:flex flex-col">
                    <span
                      className={`text-xs font-bold leading-none ${
                        isCurrent ? 'text-emerald-400' : isCompleted ? 'text-slate-200' : 'text-slate-500'
                      }`}
                    >
                      {s.title}
                    </span>
                    <span className="text-[10px] text-slate-500 leading-tight mt-0.5">{s.desc}</span>
                  </div>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-[2px] mx-4 transition-colors ${
                      step > s.num ? 'bg-emerald-500/60' : 'bg-[#1E293B]'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Content Viewport */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 flex flex-col items-center justify-center z-10">
        <div className="w-full max-w-3xl bg-[#111827]/90 border border-[#1E293B] rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-xl flex flex-col min-h-[440px] justify-between">
          {/* ==================== BƯỚC 1: CHÀO MỪNG ==================== */}
          {step === 1 && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div className="flex items-center gap-3 pb-4 border-b border-[#1E293B]">
                <Sparkles className="w-6 h-6 text-emerald-400" />
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Chào mừng bạn đến với DevDock</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Command Center tối tân cho developer trên Windows. Hãy thiết lập hồ sơ và phong cách bạn thích.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Language selection */}
                <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#1E293B] flex flex-col gap-2.5">
                  <label className="text-xs font-semibold text-slate-300">Ngôn ngữ hiển thị chính</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setLanguage('vi')}
                      className={`p-3 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        language === 'vi'
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-sm'
                          : 'bg-[#111827] border-[#1E293B] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-base">🇻🇳</span>
                      <span>Tiếng Việt (Khuyên dùng)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage('en')}
                      className={`p-3 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        language === 'en'
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-sm'
                          : 'bg-[#111827] border-[#1E293B] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-base">🇬🇧</span>
                      <span>English</span>
                    </button>
                  </div>
                </div>

                {/* Accent Color */}
                <div className="p-4 rounded-xl bg-[#0c0d12] border border-[#1e2230] flex flex-col gap-2.5">
                  <label className="text-xs font-semibold text-slate-300">Màu sắc chủ đạo (Accent Color)</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'blue', label: 'Classic Blue', bg: 'bg-blue-500' },
                      { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-500' },
                      { id: 'violet', label: 'Violet', bg: 'bg-violet-500' },
                      { id: 'amber', label: 'Amber Gold', bg: 'bg-amber-500' },
                    ].map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setAccentColor(c.id)}
                        className={`p-2.5 rounded-lg border text-[11px] font-medium flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                          accentColor === c.id
                            ? 'bg-[#12141c] border-blue-500 text-slate-100 shadow-sm'
                            : 'bg-[#12141c] border-[#1e2230] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full ${c.bg}`} />
                        <span className="truncate">{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Highlight Banner */}
              <div className="p-4 rounded-xl bg-[#12141c] border border-[#1e2230] flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/[0.05] border border-white/10 text-slate-300 flex items-center justify-center font-mono font-bold text-sm flex-shrink-0">
                  ⌘
                </div>
                <div className="text-xs text-slate-300">
                  <strong className="text-slate-100">Trải nghiệm Keyboard-First:</strong> DevDock được thiết kế
                  để bạn làm chủ toàn bộ môi trường với phím tắt toàn cục{' '}
                  <kbd className="px-1.5 py-0.5 rounded bg-[#0c0d12] text-slate-200 border border-[#1e2230] font-mono text-[11px]">
                    Ctrl + Space
                  </kbd>
                  . Bạn có thể gọi terminal, tìm kiếm dự án, SSH, hay chạy Git bất kỳ lúc nào.
                </div>
              </div>
            </div>
          )}

          {/* ==================== BƯỚC 2: CHẨN ĐOÁN HỆ THỐNG ==================== */}
          {step === 2 && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div className="flex items-center justify-between pb-4 border-b border-[#1E293B]">
                <div className="flex items-center gap-3">
                  <Cpu className="w-6 h-6 text-emerald-400" />
                  <div>
                    <h2 className="text-lg font-bold text-slate-100">Kiểm tra Yêu cầu & Chẩn đoán Môi trường</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Tự động quét các thành phần runtime, trình biên dịch và công cụ dòng lệnh trên máy của bạn.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={refreshData}
                  disabled={loadingDiag}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B0F17] hover:bg-[#1E293B] text-slate-300 text-xs border border-[#1E293B] cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingDiag ? 'animate-spin' : ''}`} />
                  <span>Quét lại</span>
                </button>
              </div>

              {loadingDiag ? (
                <div className="py-20 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Đang phân tích cấu hình hệ thống Windows...</span>
                </div>
              ) : diagnostics ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                  {/* Item 1: OS */}
                  <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-[#1E293B] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Monitor className="w-4 h-4 text-blue-400" />
                      <div>
                        <div className="font-semibold text-slate-200">{diagnostics.osVersion}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Kiến trúc: {diagnostics.architecture}
                        </div>
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  </div>

                  {/* Item 2: .NET 9 */}
                  <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-[#1E293B] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-4 h-4 rounded bg-purple-500/20 text-purple-400 font-bold text-[10px] flex items-center justify-center font-mono">
                        .N
                      </span>
                      <div>
                        <div className="font-semibold text-slate-200">.NET 9 Runtime</div>
                        <div className="text-[10px] text-slate-500 font-mono">v{diagnostics.dotnetVersion}</div>
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  </div>

                  {/* Item 3: Git CLI */}
                  <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-[#1E293B] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FolderGit2 className="w-4 h-4 text-orange-400" />
                      <div>
                        <div className="font-semibold text-slate-200">Git CLI Engine</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {diagnostics.gitInstalled ? diagnostics.gitVersion : 'Chưa cài đặt Git trên máy'}
                        </div>
                      </div>
                    </div>
                    {diagnostics.gitInstalled ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    )}
                  </div>

                  {/* Item 4: WebView2 */}
                  <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-[#1E293B] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center justify-center font-mono">
                        W2
                      </span>
                      <div>
                        <div className="font-semibold text-slate-200">Microsoft WebView2 Runtime</div>
                        <div className="text-[10px] text-slate-500 font-mono">{diagnostics.webview2Version}</div>
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  </div>

                  {/* Item 5: PowerShell */}
                  <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-[#1E293B] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Terminal className="w-4 h-4 text-blue-400" />
                      <div>
                        <div className="font-semibold text-slate-200">PowerShell Engine</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {diagnostics.powershellVersion || 'Sẵn sàng'}
                        </div>
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  </div>

                  {/* Item 6: WSL / OpenSSH */}
                  <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-[#1E293B] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="w-4 h-4 text-teal-400" />
                      <div>
                        <div className="font-semibold text-slate-200">OpenSSH & Quyền Hệ Thống</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          SSH: {diagnostics.sshInstalled ? 'Đã cài đặt' : 'Không'} • Admin:{' '}
                          {diagnostics.isAdmin ? 'Có' : 'Người dùng tiêu chuẩn'}
                        </div>
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* ==================== BƯỚC 3: QUYỀN HỆ THỐNG & PATH ==================== */}
          {step === 3 && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div className="flex items-center gap-3 pb-4 border-b border-[#1E293B]">
                <Shield className="w-6 h-6 text-emerald-400" />
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Quyền Hệ Thống & Tích Hợp Windows Cấp Sâu</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tích hợp lệnh 'devdock' vào PATH, menu chuột phải Windows Explorer, và chạy ngầm cùng Windows.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3.5">
                {/* 1. Add to PATH */}
                <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#1E293B] hover:border-slate-700 transition-colors flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold text-sm flex-shrink-0 border border-emerald-500/30">
                      &gt;_
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-200">Thêm 'devdock' vào Windows PATH</span>
                        {integrations?.isInPath ? (
                          <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
                            ✓ Đã có trong PATH
                          </span>
                        ) : (
                          <span className="px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-mono border border-amber-500/30">
                            Khuyên dùng
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Mở bất kỳ CMD, PowerShell hoặc Windows Terminal nào, chỉ cần gõ lệnh{' '}
                        <code className="text-emerald-400 font-mono bg-slate-900 px-1 py-0.5 rounded">devdock</code>{' '}
                        để kích hoạt ứng dụng, hoặc{' '}
                        <code className="text-emerald-400 font-mono bg-slate-900 px-1 py-0.5 rounded">devdock .</code>{' '}
                        để mở ngay thư mục mã nguồn hiện tại!
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={addToPath}
                      onChange={(e) => setAddToPath(e.target.checked)}
                      className="accent-emerald-500 w-4 h-4 cursor-pointer"
                    />
                  </div>
                </div>

                {/* 2. Context Menu */}
                <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#1E293B] hover:border-slate-700 transition-colors flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center font-bold text-sm flex-shrink-0 border border-blue-500/30">
                      📁
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-200">
                          Tích hợp Menu Chuột Phải Windows Explorer
                        </span>
                        {integrations?.isContextMenuRegistered && (
                          <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
                            ✓ Đã kích hoạt
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Chuột phải vào bất kỳ thư mục dự án nào trên máy tính -&gt; chọn{' '}
                        <strong className="text-slate-200">"Mở bằng DevDock"</strong> để bắt đầu code, chạy Git, mở
                        terminal ngay lập tức.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={registerContextMenu}
                      onChange={(e) => setRegisterContextMenu(e.target.checked)}
                      className="accent-emerald-500 w-4 h-4 cursor-pointer"
                    />
                  </div>
                </div>

                {/* 3. Run at Startup */}
                <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#1E293B] hover:border-slate-700 transition-colors flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold text-sm flex-shrink-0 border border-purple-500/30">
                      🚀
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-200">Khởi động cùng Windows (Chạy nền Tray)</span>
                        {integrations?.isStartupRegistered && (
                          <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
                            ✓ Đã bật
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Khởi chạy sẵn dưới khay hệ thống (System Tray) khi bật máy. Bất kỳ lúc nào bạn nhấn{' '}
                        <code className="text-emerald-400 font-mono">Ctrl + Space</code>, DevDock sẽ bay ra tức thì mà
                        không tốn thời gian chờ mở app.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={runAtStartup}
                      onChange={(e) => setRunAtStartup(e.target.checked)}
                      className="accent-emerald-500 w-4 h-4 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {actionMessage && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{actionMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* ==================== BƯỚC 4: MÔI TRƯỜNG & SHELL ==================== */}
          {step === 4 && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div className="flex items-center gap-3 pb-4 border-b border-[#1E293B]">
                <Sliders className="w-6 h-6 text-emerald-400" />
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Cấu hình Môi trường Terminal & Phím Tắt</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Lựa chọn Shell ưa thích của bạn cho Terminal nhúng và xác nhận các phím tắt quan trọng.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4 text-xs">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-300">Shell Mặc Định Cho Terminal Nhúng</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { id: 'PowerShell' as TerminalShellType, label: 'PowerShell', icon: 'PS' },
                      { id: 'Cmd' as TerminalShellType, label: 'CMD (Command Prompt)', icon: 'CMD' },
                      { id: 'GitBash' as TerminalShellType, label: 'Git Bash', icon: 'BASH' },
                      { id: 'Wsl' as TerminalShellType, label: 'WSL (Linux)', icon: 'WSL' },
                    ].map((sh) => (
                      <button
                        key={sh.id}
                        type="button"
                        onClick={() => setDefaultShell(sh.id)}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                          defaultShell === sh.id
                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-sm'
                            : 'bg-[#0B0F17] border-[#1E293B] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="font-mono font-bold text-xs bg-[#111827] px-2 py-0.5 rounded border border-[#1E293B]">
                          {sh.icon}
                        </span>
                        <span className="font-medium text-center">{sh.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hotkey Summary */}
                <div className="mt-2 p-4 rounded-xl bg-[#0B0F17] border border-[#1E293B] flex flex-col gap-2">
                  <span className="font-semibold text-slate-200 text-xs mb-1">Các Phím Tắt Nhanh Đã Được Kích Hoạt</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                    <div className="flex items-center justify-between p-2 rounded bg-[#111827]">
                      <span>Bảng điều khiển toàn cục:</span>
                      <kbd className="text-emerald-400 font-bold">Ctrl + Space</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-[#111827]">
                      <span>Trung tâm Quản lý Git:</span>
                      <kbd className="text-emerald-400 font-bold">Ctrl + Shift + G</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-[#111827]">
                      <span>Mở Terminal Mới:</span>
                      <kbd className="text-emerald-400 font-bold">Ctrl + Shift + T</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-[#111827]">
                      <span>Kết nối SSH Profiles:</span>
                      <kbd className="text-emerald-400 font-bold">Ctrl + Shift + S</kbd>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== BƯỚC 5: HOÀN TẤT ==================== */}
          {step === 5 && (
            <div className="flex flex-col gap-6 animate-fadeIn text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-3xl mx-auto shadow-xl shadow-emerald-500/20">
                🎉
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-100">DevDock Đã Sẵn Sàng Phục Vụ Bạn!</h2>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  Môi trường phát triển và toàn bộ quyền tích hợp Windows cấp sâu (PATH, Menu chuột phải, Khởi động)
                  đã được thiết lập tối ưu.
                </p>
              </div>

              {/* Summary of applied configuration */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono max-w-xl mx-auto w-full text-left">
                <div className="p-3 rounded-lg bg-[#0B0F17] border border-[#1E293B]">
                  <span className="text-[10px] text-slate-500 block">Ngôn ngữ</span>
                  <span className="font-bold text-emerald-400">{language === 'vi' ? 'Tiếng Việt' : 'English'}</span>
                </div>
                <div className="p-3 rounded-lg bg-[#0B0F17] border border-[#1E293B]">
                  <span className="text-[10px] text-slate-500 block">Shell</span>
                  <span className="font-bold text-emerald-400">{defaultShell}</span>
                </div>
                <div className="p-3 rounded-lg bg-[#0B0F17] border border-[#1E293B]">
                  <span className="text-[10px] text-slate-500 block">Windows PATH</span>
                  <span className="font-bold text-emerald-400">{addToPath ? 'Đã thêm (devdock)' : 'Bỏ qua'}</span>
                </div>
                <div className="p-3 rounded-lg bg-[#0B0F17] border border-[#1E293B]">
                  <span className="text-[10px] text-slate-500 block">Menu chuột phải</span>
                  <span className="font-bold text-emerald-400">{registerContextMenu ? 'Đã gán' : 'Bỏ qua'}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500">
                💡 Mẹo nhỏ: Bạn có thể chạy lại màn hình thiết lập này bất kỳ lúc nào trong phần Cài đặt hoặc Command
                Palette.
              </div>
            </div>
          )}

          {/* Wizard Footer Navigation Controls */}
          <div className="flex items-center justify-between pt-6 border-t border-[#1E293B] mt-6">
            <div>
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B0F17] hover:bg-[#1E293B] text-slate-300 text-xs font-semibold border border-[#1E293B] cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Quay lại</span>
                </button>
              ) : (
                <div />
              )}
            </div>

            <div className="flex items-center gap-3">
              {step < 5 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold cursor-pointer shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
                >
                  <span>Tiếp tục</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCompleteSetup}
                  disabled={applying}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-600 hover:to-teal-500 text-slate-950 text-xs font-extrabold cursor-pointer shadow-xl shadow-emerald-500/30 transition-all hover:scale-105 disabled:opacity-50"
                >
                  <Play className={`w-4 h-4 fill-current ${applying ? 'animate-spin' : ''}`} />
                  <span>{applying ? 'Đang hoàn tất...' : 'Bắt đầu làm việc với DevDock 🚀'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
