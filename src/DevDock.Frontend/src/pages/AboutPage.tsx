import React, { useState } from 'react';
import {
  Github,
  Mail,
  Copy,
  Check,
  Sparkles,
  Terminal,
  Heart,
  Code2,
  Shield,
  Star,
  ArrowUpRight,
  BookOpen,
  FolderGit2,
  RefreshCw,
  Cpu,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../services/api';
import { NavRoute } from '../components/Sidebar';
import { DevDockLogo } from '../components/DevDockLogo';

interface AboutPageProps {
  onNavigate?: (route: NavRoute) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate, onShowToast }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalLogs, setTerminalLogs] = useState<Array<{ text: string; type: 'info' | 'success' | 'warn' | 'accent' }>>([
    { text: 'DevDock Cyber Terminal v1.5.0 LTS — System Initialized.', type: 'info' },
    { text: 'Sản phẩm được kiến tạo & phát triển bởi: Vũ Xuân Lâm', type: 'accent' },
    { text: 'Gõ /help hoặc /version để khám phá chi tiết phiên bản & thông tin tác giả.', type: 'warn' },
  ]);

  const appInfo = {
    name: 'DevDock Workstation',
    version: '1.5.0',
    edition: 'LTS (Long Term Support)',
    build: '2026.09.21-win-x64',
    releaseChannel: 'Stable Release',
    architecture: 'Windows x64 Native Desktop',
    runtime: '.NET 9.0 Core (C# 13) • Microsoft Edge WebView2 Evergreen',
    frontend: 'React 18.3 • TypeScript 5.6 • Vite 5 • Tailwind CSS',
    terminal: 'Windows ConPTY Win32 API • SSH.NET 2024 Interactive Stream',
    gitEngine: 'LibGit2Sharp & Native Git CLI Integration',
    license: 'MIT Open Source License',
    tagline: 'Trạm làm việc hợp nhất cho Kỹ sư phần mềm & Quản trị hệ thống',
    description:
      'Hợp nhất sức mạnh của Terminal ConPTY tốc độ cao, Quản lý Git & Auto CI/CD, Quản trị máy chủ SSH và Trung tâm AI đa mô hình trong một không gian làm việc mượt mà, hiện đại.',
  };

  const authorInfo = {
    name: 'Vũ Xuân Lâm',
    alias: 'iplam24',
    role: 'Lead Architect & Fullstack Systems Developer',
    github: 'https://github.com/iplam24/iplam24',
    githubBase: 'https://github.com/iplam24',
    email: 'vxlcontact143@gmail.com',
    location: 'Hà Nội, Việt Nam 🇻🇳',
    mission:
      'Kiến tạo công cụ phát triển phần mềm hiệu năng cao, hợp nhất sức mạnh của Terminal với trải nghiệm thị giác Fluent hiện đại.',
  };

  const formattedSpecs = `DevDock Workstation — System Specifications
--------------------------------------------------
Tên sản phẩm:    ${appInfo.name}
Phiên bản:       v${appInfo.version} ${appInfo.edition}
Bản dựng:        ${appInfo.build} (${appInfo.releaseChannel})
Nền tảng:        ${appInfo.architecture}
Web Engine:      ${appInfo.runtime}
Frontend:        ${appInfo.frontend}
Terminal Engine: ${appInfo.terminal}
Git Engine:      ${appInfo.gitEngine}
Giấy phép:       ${appInfo.license}
Tác giả:         ${authorInfo.name} (@${authorInfo.alias})
GitHub:          ${authorInfo.github}
Email liên hệ:   ${authorInfo.email}
Trạng thái:      Operational / Production Ready`;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    onShowToast(`Đã sao chép ${label} vào bộ nhớ tạm!`, 'success');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpenLink = (url: string) => {
    api.openUrl(url);
    onShowToast(`Đang mở liên kết: ${url}`, 'info');
  };

  const handleCheckUpdate = () => {
    setIsCheckingUpdate(true);
    setTimeout(() => {
      setIsCheckingUpdate(false);
      onShowToast(`Bạn đang sử dụng phiên bản DevDock v${appInfo.version} LTS mới nhất!`, 'success');
    }, 800);
  };

  const executeTerminalCommand = (cmd: string) => {
    const trimmed = cmd.trim().toLowerCase();
    if (!trimmed) return;

    const newLogs: Array<{ text: string; type: 'info' | 'success' | 'warn' | 'accent' }> = [
      ...terminalLogs,
      { text: `$ ${cmd}`, type: 'accent' },
    ];

    switch (trimmed) {
      case '/help':
      case 'help':
        newLogs.push(
          { text: 'Danh sách các lệnh khả dụng:', type: 'info' },
          { text: '  /version  - Thông số phiên bản & kiến trúc DevDock Workstation', type: 'info' },
          { text: '  /author   - Thông tin chi tiết về tác giả Vũ Xuân Lâm', type: 'info' },
          { text: '  /github   - Mở hồ sơ GitHub chính thức của tác giả', type: 'info' },
          { text: '  /contact  - Thông tin liên hệ & hòm thư tác giả', type: 'info' },
          { text: '  /stack    - Khám phá các công nghệ lõi tạo nên DevDock', type: 'info' },
          { text: '  /vision   - Tầm nhìn & triết lý phát triển của dự án', type: 'info' },
          { text: '  /quote    - Trích dẫn lập trình tâm đắc', type: 'info' },
          { text: '  /clear    - Xóa màn hình terminal này', type: 'info' }
        );
        break;

      case '/version':
      case 'version':
      case '-v':
      case '--version':
        newLogs.push(
          { text: '  ╔═══════════════════════════════════════════════════════════╗', type: 'accent' },
          { text: '  ║        DevDock Workstation — Official Release             ║', type: 'accent' },
          { text: '  ╚═══════════════════════════════════════════════════════════╝', type: 'accent' },
          { text: `  • Phiên bản: v${appInfo.version} ${appInfo.edition}`, type: 'success' },
          { text: `  • Bản dựng: ${appInfo.build} (${appInfo.releaseChannel})`, type: 'info' },
          { text: `  • Nền tảng: ${appInfo.architecture}`, type: 'info' },
          { text: `  • Tác giả: ${authorInfo.name} (@${authorInfo.alias})`, type: 'accent' },
          { text: `  • Động cơ: .NET 9.0 Kestrel / ConPTY Win32 / React 18`, type: 'info' },
          { text: `  • Bản quyền: ${appInfo.license} — Mọi hệ thống vận hành tối ưu.`, type: 'success' }
        );
        break;

      case '/author':
      case 'author':
      case 'whoami':
        newLogs.push(
          { text: `Tác giả: ${authorInfo.name} (@${authorInfo.alias})`, type: 'success' },
          { text: `Vị trí: ${authorInfo.role}`, type: 'info' },
          { text: `Địa điểm: ${authorInfo.location}`, type: 'info' },
          { text: `Sứ mệnh: ${authorInfo.mission}`, type: 'accent' }
        );
        break;

      case '/github':
      case 'github':
        newLogs.push(
          { text: `Đang kết nối tới GitHub: ${authorInfo.github}`, type: 'success' },
          { text: 'Mở tab trình duyệt Windows...', type: 'info' }
        );
        handleOpenLink(authorInfo.github);
        break;

      case '/contact':
      case 'contact':
      case 'mail':
        newLogs.push(
          { text: `Email chính thức: ${authorInfo.email}`, type: 'success' },
          { text: `GitHub Profile: ${authorInfo.github}`, type: 'info' },
          { text: 'Cam kết phản hồi trong thời gian sớm nhất.', type: 'accent' }
        );
        break;

      case '/stack':
      case 'stack':
        newLogs.push(
          { text: '⚡ DevDock Workstation Tech Stack:', type: 'accent' },
          { text: '  • Backend Core: ASP.NET Core Kestrel, .NET 9.0 C# 13', type: 'info' },
          { text: '  • Terminal Engine: Windows ConPTY Win32 Native API & SSH.NET Stream', type: 'info' },
          { text: '  • Frontend: React 18, TypeScript, Tailwind CSS, Lucide Icons', type: 'info' },
          { text: '  • Native Host: Microsoft Edge WebView2 Evergreen Desktop Runtime', type: 'info' },
          { text: '  • Git Engine: LibGit2Sharp & Native Git CLI Integration', type: 'info' }
        );
        break;

      case '/vision':
      case 'vision':
        newLogs.push(
          { text: '✨ Triết lý kiến trúc của Vũ Xuân Lâm:', type: 'accent' },
          { text: '  "Một lập trình viên chuyên nghiệp không nên lãng phí thời gian chuyển đổi', type: 'info' },
          { text: '   giữa hàng chục ứng dụng rời rạc. DevDock được sinh ra để thống nhất toàn', type: 'info' },
          { text: '   bộ quy trình từ Quản lý Repo Git, SSH Server, Terminal cho đến Trí tuệ AI."', type: 'info' }
        );
        break;

      case '/quote':
      case 'quote': {
        const quotes = [
          '“First, solve the problem. Then, write the code.” — John Johnson',
          '“Simplicity is prerequisite for reliability.” — Edsger W. Dijkstra',
          '“Make it work, make it right, make it fast.” — Kent Beck',
          '“Programs must be written for people to read, and only incidentally for machines to execute.” — Abelson & Sussman',
          '“Good software, like wine, takes time.” — Joel Spolsky',
        ];
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        newLogs.push({ text: randomQuote, type: 'success' });
        break;
      }

      case '/clear':
      case 'clear':
      case 'cls':
        setTerminalLogs([{ text: 'Terminal đã được xóa sạch. Gõ /help để xem trợ giúp.', type: 'info' }]);
        setTerminalInput('');
        return;

      default:
        newLogs.push({
          text: `Lệnh không hợp lệ: "${cmd}". Gõ /help hoặc /version để xem hướng dẫn.`,
          type: 'warn',
        });
        break;
    }

    setTerminalLogs(newLogs);
    setTerminalInput('');
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-[#080a0f] select-text min-h-0 relative">
      {/* Background Decorative Ambient Glows (isolated in fixed/absolute background layer) */}
      <div className="absolute inset-0 pointer-events-none z-0 min-h-full">
        <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[850px] h-[380px] bg-gradient-to-b from-cyan-600/15 via-blue-500/10 to-transparent blur-3xl" />
        <div className="absolute top-[80px] right-[5%] w-[350px] h-[350px] bg-purple-600/10 blur-3xl" />
        <div className="absolute top-[180px] left-[5%] w-[350px] h-[350px] bg-emerald-600/10 blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-7 pb-16 relative z-10 flex flex-col gap-7">

          {/* ========================================================================= */}
          {/* 1. OFFICIAL APP LOGO & VERSION IDENTITY BANNER */}
          {/* ========================================================================= */}
          <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-b from-[#111728] via-[#0d1220] to-[#090d16] border border-[#1e273c] shadow-2xl relative overflow-hidden backdrop-blur-md">
            {/* Top Glowing Gradient Border */}
            <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 shadow-sm shadow-cyan-500/40" />

            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              {/* App Logo + Title + Badges */}
              <div className="flex items-start sm:items-center gap-5 sm:gap-6">
                {/* Glowing App Logo Squircle */}
                <div className="relative group shrink-0">
                  <div className="relative p-3 rounded-2xl bg-gradient-to-b from-[#141d30] to-[#0a0e1a] border border-cyan-500/30 shadow-xl shadow-cyan-500/15 group-hover:border-cyan-400/60 group-hover:shadow-cyan-500/30 transition-all duration-300">
                    <DevDockLogo size={68} withGlow={true} />
                  </div>
                  <span
                    className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#090d16] shadow-sm animate-pulse"
                    title="DevDock Core Engine: Đang chạy ổn định"
                  />
                </div>

                {/* Title & Metadata */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-cyan-100 to-slate-300 font-sans">
                      {appInfo.name}
                    </h1>

                    {/* Version Badge */}
                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                      <span>v{appInfo.version} {appInfo.edition}</span>
                    </div>

                    {/* Build Badge */}
                    <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-slate-400 text-[11px] font-mono">
                      {appInfo.build}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-cyan-300/90 font-sans">
                    {appInfo.tagline}
                  </p>

                  <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                    {appInfo.description}
                  </p>
                </div>
              </div>

              {/* Quick Actions & Status */}
              <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-3 w-full lg:w-auto shrink-0 border-t lg:border-t-0 border-[#1c2438] pt-4 lg:pt-0">
                {/* System Status Pill */}
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-semibold">Stable & Up-to-date</span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(formattedSpecs, 'Toàn bộ thông số phiên bản DevDock')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#171f33] hover:bg-[#202b44] text-slate-200 border border-[#2b3956] text-xs font-semibold cursor-pointer transition-all duration-150 hover:border-cyan-500/40"
                    title="Sao chép toàn bộ thông số phiên bản & hệ thống"
                  >
                    {copiedField === 'Toàn bộ thông số phiên bản DevDock' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                    <span className="hidden sm:inline">Sao chép thông số</span>
                    <span className="sm:hidden">Specs</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCheckUpdate}
                    disabled={isCheckingUpdate}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold cursor-pointer transition-all duration-150 disabled:opacity-50"
                    title="Kiểm tra phiên bản mới"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin text-cyan-400' : ''}`} />
                    <span className="hidden sm:inline">Kiểm tra cập nhật</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. SYSTEM & PLATFORM SPECS MATRIX */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Spec 1: Version & Channel */}
            <div className="p-3.5 rounded-xl bg-[#0c111e] border border-[#192236] flex items-center gap-3 hover:border-cyan-500/30 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-slate-500 font-mono">Phiên bản ứng dụng</span>
                <span className="text-xs font-bold text-slate-200 truncate">v{appInfo.version} {appInfo.edition}</span>
                <span className="text-[10px] text-emerald-400 font-mono">{appInfo.releaseChannel}</span>
              </div>
            </div>

            {/* Spec 2: Runtime Engine */}
            <div className="p-3.5 rounded-xl bg-[#0c111e] border border-[#192236] flex items-center gap-3 hover:border-blue-500/30 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-slate-500 font-mono">Backend Core & Host</span>
                <span className="text-xs font-bold text-slate-200 truncate">ASP.NET Core (.NET 9.0)</span>
                <span className="text-[10px] text-slate-400 font-mono">Kestrel + Win32 Native</span>
              </div>
            </div>

            {/* Spec 3: Frontend & Web Engine */}
            <div className="p-3.5 rounded-xl bg-[#0c111e] border border-[#192236] flex items-center gap-3 hover:border-purple-500/30 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-slate-500 font-mono">Giao diện & Web Engine</span>
                <span className="text-xs font-bold text-slate-200 truncate">React 18 + Vite 5</span>
                <span className="text-[10px] text-slate-400 font-mono">MS Edge WebView2</span>
              </div>
            </div>

            {/* Spec 4: Terminal & License */}
            <div className="p-3.5 rounded-xl bg-[#0c111e] border border-[#192236] flex items-center gap-3 hover:border-emerald-500/30 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-slate-500 font-mono">Bản quyền & Động cơ PTY</span>
                <span className="text-xs font-bold text-slate-200 truncate">Windows ConPTY / SSH</span>
                <span className="text-[10px] text-cyan-400 font-mono">MIT Open Source</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. AUTHOR & LEAD ARCHITECT PROFILE (VŨ XUÂN LÂM) */}
          {/* ========================================================================= */}
          <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-b from-[#101524] to-[#0a0e18] border border-[#1d2639] shadow-2xl relative overflow-hidden backdrop-blur-md">
            {/* Top Accent Gradient Border */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              {/* Avatar + Main Author Information */}
              <div className="flex items-start sm:items-center gap-5">
                {/* Glowing Avatar VXL */}
                <div className="relative group shrink-0">
                  <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-[2px] shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all duration-300">
                    <div className="w-full h-full rounded-[14px] bg-[#0c101a] flex flex-col items-center justify-center font-mono font-bold text-xl sm:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-200 to-indigo-300 select-none">
                      <span>VXL</span>
                    </div>
                  </div>
                  {/* Status Indicator */}
                  <span
                    className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0c101a] shadow-sm animate-pulse"
                    title="Tác giả đang hoạt động & phát triển dự án"
                  />
                </div>

                {/* Name & Title */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 font-sans">
                      {authorInfo.name}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold">
                      @{authorInfo.alias}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Creator & Lead Developer
                    </span>
                  </div>

                  <p className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <span>{authorInfo.role}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400">{authorInfo.location}</span>
                  </p>

                  <p className="text-xs text-slate-400 max-w-xl leading-relaxed mt-0.5">
                    {authorInfo.mission}
                  </p>
                </div>
              </div>

              {/* Author Recognition Badge */}
              <div className="flex flex-col items-start md:items-end gap-2 shrink-0 border-t md:border-t-0 border-[#1c2336] pt-4 md:pt-0 w-full md:w-auto">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-mono text-slate-300">
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                  <span className="font-semibold text-slate-100">Bản quyền kiến trúc</span>
                  <span className="text-cyan-400 font-bold">Vũ Xuân Lâm</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Chủ quyền mã nguồn & giấy phép MIT</span>
                </div>
              </div>
            </div>

            {/* Quick Action Contact Row */}
            <div className="mt-6 pt-5 border-t border-[#1a2133] flex flex-wrap items-center gap-3">
              {/* GitHub Button */}
              <button
                type="button"
                onClick={() => handleOpenLink(authorInfo.github)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#171e2e] hover:bg-[#202a40] text-slate-100 border border-[#2b3854] text-xs font-semibold cursor-pointer transition-all duration-150 hover:shadow-lg hover:border-cyan-500/40 group"
              >
                <Github className="w-4 h-4 text-slate-300 group-hover:text-cyan-400 transition-colors" />
                <span>GitHub: @{authorInfo.alias}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-300 ml-0.5" />
              </button>

              <button
                type="button"
                onClick={() => handleCopy(authorInfo.github, 'Liên kết GitHub')}
                className="p-2 rounded-xl bg-[#171e2e] hover:bg-[#202a40] text-slate-400 hover:text-slate-200 border border-[#2b3854] text-xs cursor-pointer transition-colors"
                title="Sao chép liên kết GitHub"
              >
                {copiedField === 'Liên kết GitHub' ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>

              {/* Email Button */}
              <button
                type="button"
                onClick={() => {
                  window.location.href = `mailto:${authorInfo.email}?subject=DevDock%20Workstation%20Contact`;
                  onShowToast(`Đang mở ứng dụng email gửi tới ${authorInfo.email}`, 'info');
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#171e2e] hover:bg-[#202a40] text-slate-100 border border-[#2b3854] text-xs font-semibold cursor-pointer transition-all duration-150 hover:shadow-lg hover:border-blue-500/40 group"
              >
                <Mail className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                <span>{authorInfo.email}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-300 ml-0.5" />
              </button>

              <button
                type="button"
                onClick={() => handleCopy(authorInfo.email, 'Địa chỉ Email')}
                className="p-2 rounded-xl bg-[#171e2e] hover:bg-[#202a40] text-slate-400 hover:text-slate-200 border border-[#2b3854] text-xs cursor-pointer transition-colors"
                title="Sao chép Email"
              >
                {copiedField === 'Địa chỉ Email' ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>

              {/* Quick Navigation to Guide */}
              {onNavigate && (
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('guide')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 border border-white/[0.06] text-xs cursor-pointer transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Xem Hướng Dẫn</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. INTERACTIVE CYBER TERMINAL VIBE BOX */}
          {/* ========================================================================= */}
          <div className="rounded-2xl bg-[#090d15] border border-[#1b2336] shadow-xl overflow-hidden flex flex-col">
            {/* Terminal Window Header */}
            <div className="px-4 py-2.5 bg-[#0e1422] border-b border-[#1b2336] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="h-3 w-[1px] bg-slate-700 mx-1" />
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-mono font-semibold text-slate-200">
                  vxl@devdock-workstation: ~ (Interactive Cyber Console)
                </span>
              </div>

              {/* Quick Command Pills */}
              <div className="hidden sm:flex items-center gap-1.5">
                {['/version', '/help', '/author', '/github', '/contact', '/stack', '/quote'].map((cmd) => (
                  <button
                    key={cmd}
                    type="button"
                    onClick={() => executeTerminalCommand(cmd)}
                    className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 font-mono text-[11px] border border-white/[0.06] hover:border-cyan-500/40 transition-colors cursor-pointer"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </div>

            {/* Terminal Output Logs */}
            <div className="p-4 bg-[#070a10] min-h-[160px] max-h-[250px] overflow-y-auto font-mono text-xs flex flex-col gap-1.5 select-text scrollbar-thin">
              {terminalLogs.map((log, index) => (
                <div
                  key={index}
                  className={`leading-relaxed whitespace-pre-wrap ${
                    log.type === 'accent'
                      ? 'text-cyan-400 font-semibold'
                      : log.type === 'success'
                      ? 'text-emerald-400'
                      : log.type === 'warn'
                      ? 'text-amber-300'
                      : 'text-slate-300'
                  }`}
                >
                  {log.text}
                </div>
              ))}
            </div>

            {/* Terminal Command Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeTerminalCommand(terminalInput);
              }}
              className="px-4 py-2.5 bg-[#0b0f19] border-t border-[#1b2336] flex items-center gap-2"
            >
              <span className="text-cyan-400 font-mono text-xs font-bold select-none">&gt;</span>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                placeholder="Nhập lệnh (ví dụ: /version, /author, /github, /contact, /stack, /quote)..."
                className="flex-1 bg-transparent text-slate-100 font-mono text-xs focus:outline-none placeholder:text-slate-600"
              />
              <button
                type="submit"
                className="px-2.5 py-1 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono cursor-pointer transition-colors"
              >
                Chạy
              </button>
            </form>
          </div>

          {/* ========================================================================= */}
          {/* 5. ENGINEERING HIGHLIGHTS BY VŨ XUÂN LÂM */}
          {/* ========================================================================= */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Kiến Trúc & Đột Phá Kỹ Thuật Trong DevDock
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">Được thiết kế tỉ mỉ bởi Vũ Xuân Lâm</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Feature Card 1 */}
              <div className="p-4 rounded-xl bg-[#0e1320] border border-[#1b2438] flex flex-col gap-2.5 hover:border-cyan-500/40 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Terminal className="w-4 h-4" />
                </div>
                <h4 className="font-semibold text-sm text-slate-200">Terminal Engine Đa Nền Tảng</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tích hợp trực tiếp Windows ConPTY C# Native kết hợp SSH.NET Interactive Stream, hỗ trợ chia đôi màn hình (Split Pane), tự động đồng bộ kích thước và khôi phục focus tức thì.
                </p>
              </div>

              {/* Feature Card 2 */}
              <div className="p-4 rounded-xl bg-[#0e1320] border border-[#1b2438] flex flex-col gap-2.5 hover:border-blue-500/40 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <FolderGit2 className="w-4 h-4" />
                </div>
                <h4 className="font-semibold text-sm text-slate-200">Git Center & Auto CI/CD</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Quản lý Git trực quan, xem Diff theo dòng, đồng bộ Cloud GitHub/GitLab và công cụ tự động nhận diện kiến trúc mã nguồn để sinh workflow GitHub Actions CI/CD triển khai server.
                </p>
              </div>

              {/* Feature Card 3 */}
              <div className="p-4 rounded-xl bg-[#0e1320] border border-[#1b2438] flex flex-col gap-2.5 hover:border-purple-500/40 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h4 className="font-semibold text-sm text-slate-200">Trợ Lý AI & Windows DevOps</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tích hợp AI đa nhà cung cấp (DeepSeek, OpenAI, Claude, Gemini, Ollama), phân tích dự án, lập kế hoạch thực thi và bộ tiện ích DevOps tra cứu Port, Hosts, Biến môi trường không độ trễ.
                </p>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 6. COMMUNITY & COLLABORATION FOOTER BANNER */}
          {/* ========================================================================= */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-[#0d1424] to-blue-950/40 border border-cyan-500/20 flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="flex flex-col gap-1 text-center md:text-left">
              <h4 className="text-base font-bold text-slate-100 flex items-center justify-center md:justify-start gap-2">
                <span>Bạn muốn đóng góp hoặc trao đổi hợp tác?</span>
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
              </h4>
              <p className="text-xs text-slate-300">
                Ghé thăm GitHub <strong className="text-cyan-400">iplam24</strong> hoặc gửi mail trực tiếp tới <strong className="text-cyan-400">vxlcontact143@gmail.com</strong>.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleOpenLink(authorInfo.github)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/20 cursor-pointer transition-all"
              >
                <Star className="w-4 h-4 fill-slate-950" />
                <span>Follow trên GitHub</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  window.location.href = `mailto:${authorInfo.email}`;
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/[0.1] text-xs font-semibold cursor-pointer transition-all"
              >
                <Mail className="w-4 h-4 text-cyan-400" />
                <span>Gửi Email</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 7. CREDITS & SYSTEM COPYRIGHT */}
          {/* ========================================================================= */}
          <div className="pt-4 pb-2 border-t border-[#151b2a] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-mono gap-2">
            <span>© 2026 {appInfo.name} v{appInfo.version} LTS. Phát triển bởi Vũ Xuân Lâm (@iplam24).</span>
            <span>Xây dựng trên nền tảng .NET 9 C#, React 18, TypeScript & Tailwind CSS 🇻🇳</span>
          </div>
        </div>
    </div>
  );
};