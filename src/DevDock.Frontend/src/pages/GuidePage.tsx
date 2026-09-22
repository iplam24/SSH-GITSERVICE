import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Copy,
  Check,
  ExternalLink,
  Server,
  GitBranch,
  Terminal,
  Sliders,
  Sparkles,
  Package,
  FolderGit2,
  ShieldCheck,
  Globe,
  Layers,
  Activity,
  Keyboard,
  Zap,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  FileCode,
  HardDrive,
  Key,
} from 'lucide-react';

interface GuideSection {
  id: string;
  title: string;
  category: string;
  icon: React.ElementType;
  badge?: string;
  summary: string;
  content: React.ReactNode;
}

export const GuidePage: React.FC<{ onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void }> = ({
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('getting-started');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (text: string, label = 'mã lệnh') => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    onShowToast(`Đã sao chép ${label}!`, 'success');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const sections: GuideSection[] = useMemo(
    () => [
      // 1. Getting Started
      {
        id: 'getting-started',
        title: 'Khởi Động Nhanh & Tổng Quan',
        category: 'Cơ Bản',
        icon: Zap,
        badge: 'Người mới',
        summary: 'Làm quen với giao diện DevDock, cấu trúc thanh bên, thanh tìm kiếm lệnh và phím tắt cốt lõi.',
        content: (
          <div className="flex flex-col gap-5 text-xs leading-relaxed text-slate-300">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent" />
                <span>Chào mừng bạn đến với DevDock Workstation!</span>
              </h3>
              <p className="mt-1.5 text-slate-400">
                DevDock là trạm làm việc tất-cả-trong-một (All-in-One Developer Workstation) dành cho lập trình viên trên Windows. Ứng dụng giúp bạn quản lý dự án, thao tác Git nhiều tài khoản, mở terminal đa tab, quản trị server VPS qua SSH và tùy biến môi trường Windows chỉ trong một giao diện duy nhất.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-2">
                <div className="font-semibold text-slate-200 flex items-center gap-2 text-xs">
                  <Search className="w-3.5 h-3.5 text-accent" />
                  <span>Thanh Lệnh Toàn Năng (Command Palette)</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Bấm <kbd className="px-1.5 py-0.5 rounded bg-surface-hover border border-border text-slate-200 font-mono">Ctrl+Space</kbd> tại bất kỳ màn hình nào để mở thanh tìm kiếm nhanh. Bạn có thể tìm dự án, chuyển nhanh tab, chạy lệnh Git hoặc hỏi đáp AI mà không cần dùng chuột.
                </p>
              </div>

              <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-2">
                <div className="font-semibold text-slate-200 flex items-center gap-2 text-xs">
                  <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Phím Tắt Chuyển Tab Siêu Nhanh</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Sử dụng <kbd className="px-1.5 py-0.5 rounded bg-surface-hover border border-border text-slate-200 font-mono">Ctrl+1</kbd> đến <kbd className="px-1.5 py-0.5 rounded bg-surface-hover border border-border text-slate-200 font-mono">Ctrl+6</kbd> để nhảy qua các trang Tổng quan, Dự án, Git, AI, Tiện ích và DevOps. Bấm <kbd className="px-1.5 py-0.5 rounded bg-surface-hover border border-border text-slate-200 font-mono">F1</kbd> để mở trang Hướng Dẫn này.
                </p>
              </div>
            </div>

            <div className="bg-accent-bg/40 border border-accent-border rounded-xl p-4 flex flex-col gap-2">
              <div className="font-semibold text-accent-light flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent" />
                <span>Mẹo nhỏ khi mới bắt đầu</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                <li>Vào tab <strong>Cài đặt</strong> để kiểm tra chẩn đoán hệ thống (Git, .NET, PowerShell, WSL).</li>
                <li>Vào tab <strong>Dự án</strong> và bấm "+ Thêm Dự Án" để nạp các repository code trên máy tính của bạn vào quản lý tập trung.</li>
                <li>Vào tab <strong>Cài đặt → Tài khoản Git</strong> nếu bạn có nhiều tài khoản GitHub (cá nhân và công ty) để DevDock tự động cấu hình SSH/Token.</li>
              </ul>
            </div>
          </div>
        ),
      },

      // 2. Projects
      {
        id: 'projects',
        title: 'Quản Lý Dự Án & Môi Trường',
        category: 'Lập Trình',
        icon: FolderGit2,
        summary: 'Cách thêm dự án, thiết lập lệnh khởi chạy (Run/Dev/Build/Test), biến môi trường và mở IDE 1-click.',
        content: (
          <div className="flex flex-col gap-5 text-xs leading-relaxed text-slate-300">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-accent" />
                <span>Quản Lý Dự Án Code Tập Trung</span>
              </h3>
              <p className="mt-1 text-slate-400">
                Thay vì phải tìm thư mục trong Windows Explorer hoặc gõ lệnh `cd` liên tục, DevDock lưu trữ danh sách các repo của bạn kèm trạng thái Git và phím tắt mở IDE.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="border border-border rounded-xl bg-surface p-4 flex flex-col gap-2">
                <span className="font-semibold text-slate-200 text-xs">1. Thêm Dự Án Mới:</span>
                <p className="text-slate-400 text-[11px]">
                  Bấm nút <strong>+ Thêm Dự Án</strong> ở góc trên bên phải → Chọn thư mục chứa mã nguồn (Node.js, C# .NET, Python, Rust, Go, v.v.). DevDock sẽ tự động nhận diện loại dự án và cấu hình script khởi chạy tương ứng.
                </p>
              </div>

              <div className="border border-border rounded-xl bg-surface p-4 flex flex-col gap-2">
                <span className="font-semibold text-slate-200 text-xs">2. Mở Nhanh Trong Trình Biên Soạn Code (IDE):</span>
                <p className="text-slate-400 text-[11px]">
                  Mỗi thẻ dự án đều có các nút mở trực tiếp: <strong>VS Code</strong>, <strong>Cursor</strong>, <strong>Windsurf</strong> hoặc mở thư mục trong <strong>Windows Explorer</strong> chỉ với 1 click.
                </p>
              </div>

              <div className="border border-border rounded-xl bg-surface p-4 flex flex-col gap-2">
                <span className="font-semibold text-slate-200 text-xs">3. Chạy Scripts Dự Án Không Cần Gõ Lệnh:</span>
                <p className="text-slate-400 text-[11px]">
                  Bạn có thể gán các câu lệnh thường dùng (VD: `npm run dev`, `cargo watch -x run`, `dotnet watch`) vào từng dự án. Bấm nút <strong>Play</strong> để mở tab Terminal và thực thi ngay lập tức.
                </p>
              </div>
            </div>
          </div>
        ),
      },

      // 3. Git Management
      {
        id: 'git',
        title: 'Git & Quản Lý Nhiều Tài Khoản',
        category: 'Phiên Bản',
        icon: GitBranch,
        badge: 'Quan trọng',
        summary: 'Phân tách tài khoản GitHub cá nhân và công ty, commit, push, pull, stash và bộ giải quyết xung đột Merge Conflicts.',
        content: (
          <div className="flex flex-col gap-5 text-xs leading-relaxed text-slate-300">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-accent" />
                <span>Làm Việc Với Git Chuyên Nghiệp & Nhiều Tài Khoản</span>
              </h3>
              <p className="mt-1 text-slate-400">
                Giải quyết triệt để vấn đề commit nhầm email công ty vào repo cá nhân, hoặc khó khăn khi chuyển đổi SSH keys trên Windows.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-2">
                <span className="font-semibold text-slate-200 text-xs flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Quản Lý Nhiều Tài Khoản (Multi-Account)</span>
                </span>
                <p className="text-slate-400 text-[11px]">
                  Vào <strong>Cài đặt → Tài khoản Git</strong> để thêm cả tài khoản GitHub cá nhân và GitHub/GitLab của công ty. Bạn có thể chọn tài khoản áp dụng cho từng kho code cụ thể, DevDock sẽ tự động cấu hình `user.name` và `user.email` cho repo đó.
                </p>
              </div>

              <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-2">
                <span className="font-semibold text-slate-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Bộ Giải Quyết Xung Đột (Merge Conflicts)</span>
                </span>
                <p className="text-slate-400 text-[11px]">
                  Khi rebase hoặc pull có xung đột code, tab Git sẽ hiển thị trình so sánh trực quan (Current vs Incoming vs Result). Bạn có thể bấm chọn `Giữ bản của tôi`, `Lấy bản từ xa` hoặc sửa tay trực tiếp rồi bấm `Hoàn tất giải quyết xung đột`.
                </p>
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-2">
              <span className="font-semibold text-slate-200 text-xs">Các Thao Tác Thường Dùng Trong Tab Git:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1 font-mono text-[11px]">
                <div className="p-2 rounded bg-surface-hover/60 border border-border">
                  <div className="text-accent font-bold">Staging & Commit</div>
                  <div className="text-slate-400 text-[10px] mt-0.5">Tích chọn tệp cần commit, nhập message hoặc dùng AI gợi ý commit msg.</div>
                </div>
                <div className="p-2 rounded bg-surface-hover/60 border border-border">
                  <div className="text-emerald-400 font-bold">Fetch & Push / Pull</div>
                  <div className="text-slate-400 text-[10px] mt-0.5">Đồng bộ code từ xa nhanh chóng, hỗ trợ Rebase hoặc Merge.</div>
                </div>
                <div className="p-2 rounded bg-surface-hover/60 border border-border">
                  <div className="text-amber-400 font-bold">Stash & Nhánh</div>
                  <div className="text-slate-400 text-[10px] mt-0.5">Lưu tạm công việc đang làm dở (Stash) và tạo nhánh mới dễ dàng.</div>
                </div>
              </div>
            </div>
          </div>
        ),
      },

      // 4. SSH Remote Server Control Center
      {
        id: 'ssh',
        title: 'Quản Trị Server SSH, Nginx, SSL & Tên Miền',
        category: 'Máy Chủ',
        icon: Server,
        badge: 'Tính năng cốt lõi',
        summary: 'Kiểm tra cổng đang chạy, tạo Nginx proxy tự động, trỏ tên miền (DNS A-record), cấp SSL Certbot 1-click và kéo git vào server.',
        content: (
          <div className="flex flex-col gap-5 text-xs leading-relaxed text-slate-300">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Server className="w-4 h-4 text-accent" />
                <span>Trung Tâm Điều Khiển Máy Chủ Từ Xa (Remote Server Control Center)</span>
              </h3>
              <p className="mt-1 text-slate-400">
                Quản lý toàn diện VPS/Linux Server từ xa trực tiếp qua giao thức SSH mà không cần cài đặt bất kỳ phần mềm agent nào trên server.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-2">
                <span className="font-semibold text-slate-200 text-xs flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-accent" />
                  <span>1. Kiểm Tra Cổng Đang Chạy (Ports Inspector)</span>
                </span>
                <p className="text-slate-400 text-[11px]">
                  Vào thẻ <strong>Cổng & Tiến Trình</strong> để xem danh sách cổng TCP/UDP (`ss -tulpn`). Bạn có thể phân biệt cổng Public (`0.0.0.0`) hay Local (`127.0.0.1`), bấm nút <strong>[Tạo Proxy Nginx]</strong> để trỏ domain ra ngoài, hoặc bấm <strong>[Kill PID]</strong> để giải phóng cổng bị kẹt.
                </p>
              </div>

              <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-2">
                <span className="font-semibold text-slate-200 text-xs flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>2. Tự Động Cấu Hình Nginx Virtual Hosts</span>
                </span>
                <p className="text-slate-400 text-[11px]">
                  Vào thẻ <strong>Nginx Virtual Hosts</strong> → Bấm "+ Thêm Virtual Host". Nhập tên miền (VD: `api.mysite.com`) và cổng backend (VD: `3000`). DevDock sẽ tự sinh file vhost chuẩn, kiểm tra cú pháp an toàn (`nginx -t`) và tự động kích hoạt không làm sập server.
                </p>
              </div>

              <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-2">
                <span className="font-semibold text-slate-200 text-xs flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>3. Quản Lý Tên Miền & Cấp SSL Certbot 1-Click</span>
                </span>
                <p className="text-slate-400 text-[11px]">
                  Vào thẻ <strong>Tên Miền & SSL Certbot</strong>:
                </p>
                <ul className="list-disc list-inside text-slate-400 text-[11px] space-y-1">
                  <li><strong>Kiểm tra DNS A-Record</strong>: Nhập tên miền vào, DevDock sẽ phân giải xem IP DNS đã trỏ về IP server hay chưa. Tránh việc xin SSL bị lỗi khi DNS chưa cập nhật.</li>
                  <li><strong>Cấp SSL Let's Encrypt</strong>: Sau khi DNS xanh, bấm <strong>[Cấp SSL Mới]</strong>, Certbot sẽ tự cài HTTPS và tự động gia hạn trước khi hết hạn.</li>
                </ul>
              </div>

              <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-2">
                <span className="font-semibold text-slate-200 text-xs flex items-center gap-2">
                  <GitBranch className="w-3.5 h-3.5 text-purple-400" />
                  <span>4. Kéo Mã Nguồn Git Vào Server & Auto Deploy</span>
                </span>
                <p className="text-slate-400 text-[11px]">
                  Vào thẻ <strong>Git Triển Khai Repo</strong> → Bấm "+ Clone Repository Mới". Nhập URL repo (GitHub/GitLab), thư mục trên server (VD: `/var/www/my-app`) và lệnh chạy sau khi pull (VD: `npm install && npm run build && pm2 restart all`). Mỗi khi có code mới, chỉ cần bấm <strong>[Kéo Mới Nhất (git pull)]</strong> là xong!
                </p>
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-2">
              <span className="font-semibold text-slate-200 text-xs flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>5. Bật / Tắt Process (Systemd & PM2)</span>
              </span>
              <p className="text-slate-400 text-[11px]">
                Trong tab Cổng & Tiến trình, bạn có thể xem các Systemd Service và ứng dụng PM2 đang chạy, thực hiện <strong>Start</strong>, <strong>Stop</strong>, <strong>Restart</strong> và xem trực tiếp <strong>Nhật ký Logs</strong> mà không cần mở terminal dòng lệnh gõ thủ công.
              </p>
            </div>
          </div>
        ),
      },

      // 5. Terminal
      {
        id: 'terminal',
        title: 'Terminal Tích Hợp Đa Shell',
        category: 'Dòng Lệnh',
        icon: Terminal,
        summary: 'Sử dụng nhiều tab PowerShell, WSL Linux, Command Prompt, Git Bash và SSH session với khả năng tùy biến font, màu sắc, hình nền.',
        content: (
          <div className="flex flex-col gap-5 text-xs leading-relaxed text-slate-300">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-accent" />
                <span>Terminal Tích Hợp Đa Tab Siêu Nhẹ</span>
              </h3>
              <p className="mt-1 text-slate-400">
                Tích hợp trực tiếp xterm.js và ConPTY native của Windows, mang lại trải nghiệm terminal mượt mà như Windows Terminal.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-2">
                <span className="font-semibold text-slate-200 text-xs">Mở Các Shell Khác Nhau:</span>
                <p className="text-slate-400 text-[11px]">
                  Bấm vào dấu mũi tên cạnh nút "+" để chọn khởi chạy: <strong>PowerShell 7</strong>, <strong>Windows PowerShell</strong>, <strong>WSL Ubuntu</strong>, <strong>Command Prompt (CMD)</strong> hoặc <strong>Git Bash</strong>.
                </p>
              </div>

              <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-2">
                <span className="font-semibold text-slate-200 text-xs">Tùy Biến Giao Diện:</span>
                <p className="text-slate-400 text-[11px]">
                  Vào <strong>Cài đặt → Terminal</strong> để chỉnh cỡ chữ, font monospace (Cascadia Code, Fira Code), độ trong suốt hình nền và hiệu ứng mờ (Background Blur).
                </p>
              </div>
            </div>
          </div>
        ),
      },

      // 6. Windows DevOps
      {
        id: 'devops',
        title: 'Tiện Ích Windows DevOps',
        category: 'Hệ Thống',
        icon: Sliders,
        summary: 'Quản lý cổng mạng Windows, chỉnh sửa file hosts an toàn, quản lý biến môi trường PATH và so sánh file .env.',
        content: (
          <div className="flex flex-col gap-5 text-xs leading-relaxed text-slate-300">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-accent" />
                <span>Bộ Tiện Ích Tinh Chỉnh Hệ Thống Windows</span>
              </h3>
              <p className="mt-1 text-slate-400">
                Tổng hợp 4 công cụ tiện ích mà lập trình viên Windows thường xuyên phải thao tác:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-2">
                <span className="font-semibold text-slate-200 text-xs">1. Cổng Mạng Local (Port Manager):</span>
                <p className="text-slate-400 text-[11px]">
                  Xem tiến trình nào đang chiếm cổng `3000`, `8080`, `5000` trên máy tính của bạn và bấm <strong>[Kill Process]</strong> để giải phóng cổng ngay lập tức khi ứng dụng bị treo ngầm.
                </p>
              </div>

              <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-2">
                <span className="font-semibold text-slate-200 text-xs">2. Sửa File Hosts Trực Quan:</span>
                <p className="text-slate-400 text-[11px]">
                  Thêm hoặc bật/tắt các tên miền ảo local (VD: `127.0.0.1 myapp.local`) mà không cần phải mở Notepad bằng quyền Administrator rồi tìm đường dẫn `C:\Windows\System32\drivers\etc\hosts`.
                </p>
              </div>

              <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-2">
                <span className="font-semibold text-slate-200 text-xs">3. Quản Lý Biến PATH & Môi Trường:</span>
                <p className="text-slate-400 text-[11px]">
                  Xem danh sách các thư mục trong biến `PATH` dạng danh sách dễ nhìn. DevDock tự động đánh dấu đỏ các đường dẫn đã bị xóa khỏi ổ đĩa để bạn dọn dẹp biến môi trường an toàn.
                </p>
              </div>

              <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-2">
                <span className="font-semibold text-slate-200 text-xs">4. So Sánh File Cấu Hình .env:</span>
                <p className="text-slate-400 text-[11px]">
                  Đối chiếu file `.env` thực tế với file mẫu `.env.example` để phát hiện ngay các biến còn thiếu hoặc dư thừa trước khi chạy code.
                </p>
              </div>
            </div>
          </div>
        ),
      },

      // 7. AI Assistant
      {
        id: 'ai',
        title: 'Trung Tâm Trợ Lý AI',
        category: 'Trợ Lý',
        icon: Sparkles,
        summary: 'Kết nối API OpenAI, Anthropic Claude, Google Gemini, DeepSeek hoặc Ollama chạy cục bộ để hỗ trợ lập trình.',
        content: (
          <div className="flex flex-col gap-5 text-xs leading-relaxed text-slate-300">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <span>Trợ Lý Lập Trình AI Tích Hợp Sâu</span>
              </h3>
              <p className="mt-1 text-slate-400">
                Trợ lý AI trong DevDock hiểu ngữ cảnh các repository, file cấu hình và server của bạn để trả lời chính xác nhất.
              </p>
            </div>

            <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-2.5">
              <span className="font-semibold text-slate-200 text-xs">Cách Cấu Hình Nhà Cung Cấp AI:</span>
              <ol className="list-decimal list-inside text-slate-300 text-[11px] space-y-1.5">
                <li>Vào tab <strong>Cài đặt → Nhà cung cấp AI</strong>.</li>
                <li>Chọn nhà cung cấp bạn có tài khoản: <strong>Google Gemini</strong>, <strong>OpenAI</strong>, <strong>Claude</strong>, <strong>DeepSeek</strong>, hoặc <strong>Ollama Local</strong>.</li>
                <li>Dán API Key vào và bấm <strong>Kiểm Tra Kết Nối</strong>.</li>
                <li>Sau khi kiểm tra thành công, tích chọn <em>"Đặt làm mặc định"</em>. Giờ đây bạn có thể mở tab <strong>Trung tâm AI</strong> để trò chuyện, hỏi giải thích lỗi hoặc tạo prompt mẫu.</li>
              </ol>
            </div>
          </div>
        ),
      },

      // 8. Export & Publish Release to GitHub (Addressing User's explicit question!)
      {
        id: 'github-release',
        title: 'Xuất Bản File Release Lên GitHub',
        category: 'Phát Hành',
        icon: Package,
        badge: 'Hướng dẫn phát hành',
        summary: 'Hướng dẫn từng bước cách đóng gói file cài đặt setup-devdock.exe và xuất bản Release lên kho GitHub của bạn.',
        content: (
          <div className="flex flex-col gap-5 text-xs leading-relaxed text-slate-300">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-400" />
                <span>Làm Sao Để Xuất Bản File Release Lên GitHub?</span>
              </h3>
              <p className="mt-1 text-slate-400">
                DevDock đã được tích hợp sẵn toàn bộ pipeline đóng gói ra 2 định dạng: file cài đặt đồ họa tự bung nén (<code className="text-emerald-400">setup-devdock.exe</code>) và bản chạy ngay (<code className="text-accent">DevDock-portable-win-x64.zip</code>). Dưới đây là 3 cách xuất bản release lên GitHub đơn giản nhất:
              </p>
            </div>

            {/* Method 1: Automated GitHub Actions (Best) */}
            <div className="border border-border rounded-xl bg-surface p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-100 text-xs flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                    Cách 1 (Khuyên Dùng)
                  </span>
                  <span>Tự Động Bằng GitHub Actions (CI/CD)</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">Tự build & upload 100% trên cloud</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Dự án đã có sẵn workflow CI/CD tại <code className="text-slate-200">.github/workflows/release.yml</code>. Bạn chỉ cần tạo và đẩy một thẻ Git Tag lên GitHub:
              </p>

              <div className="bg-[#0B0F17] border border-border rounded-lg p-3 font-mono text-[11px] text-slate-200 flex items-center justify-between">
                <code>git tag v1.5.0 &amp;&amp; git push origin v1.5.0</code>
                <button
                  type="button"
                  onClick={() => handleCopy('git tag v1.5.0 && git push origin v1.5.0', 'lệnh tạo tag')}
                  className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                  title="Sao chép lệnh"
                >
                  {copiedCode === 'git tag v1.5.0 && git push origin v1.5.0' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <p className="text-slate-400 text-[11px]">
                👉 Sau khi push tag, GitHub Actions sẽ tự động khởi chạy máy ảo Windows, biên dịch frontend và backend, tự động tạo file <code className="text-slate-200">setup-devdock.exe</code> và xuất bản lên mục <strong>Releases</strong> của repository!
              </p>
            </div>

            {/* Method 2: One-click script via GitHub CLI */}
            <div className="border border-border rounded-xl bg-surface p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-100 text-xs flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-mono">
                    Cách 2
                  </span>
                  <span>Đóng Gói Tại Máy Bằng PowerShell &amp; GitHub CLI (`gh`)</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">1 Lệnh duy nhất</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Nếu máy tính của bạn đã cài đặt GitHub CLI (`gh`), chỉ cần mở PowerShell tại thư mục gốc của DevDock và chạy:
              </p>

              <div className="bg-[#0B0F17] border border-border rounded-lg p-3 font-mono text-[11px] text-slate-200 flex items-center justify-between">
                <code>powershell -ExecutionPolicy Bypass -File scripts/publish-github-release.ps1 -Version "v1.5.0"</code>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      'powershell -ExecutionPolicy Bypass -File scripts/publish-github-release.ps1 -Version "v1.5.0"',
                      'lệnh publish script'
                    )
                  }
                  className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                  title="Sao chép lệnh"
                >
                  {copiedCode?.includes('publish-github-release') ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <p className="text-slate-400 text-[11px]">
                Script sẽ tự động: Build Frontend → Compile Backend .NET 9 → Đóng gói <code className="text-slate-200">setup-devdock.exe</code> và <code className="text-slate-200">DevDock-portable-win-x64.zip</code> → Gọi lệnh <code className="text-slate-200">gh release create</code> tải trực tiếp lên GitHub!
              </p>
            </div>

            {/* Method 3: Manual web upload */}
            <div className="border border-border rounded-xl bg-surface p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-100 text-xs flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-surface-hover text-slate-300 border border-border text-[10px] font-mono">
                    Cách 3
                  </span>
                  <span>Đóng Gói Thủ Công &amp; Kéo Thả Trực Tiếp Trên Web</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">Không cần cài thêm công cụ</span>
              </div>

              <ol className="list-decimal list-inside text-slate-400 text-[11px] space-y-1.5">
                <li>
                  Mở PowerShell trong thư mục dự án và chạy script build:
                  <div className="bg-[#0B0F17] border border-border rounded p-2 my-1 font-mono text-[10px] text-slate-200 flex items-center justify-between">
                    <code>powershell -ExecutionPolicy Bypass -File scripts/build-installer.ps1</code>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy('powershell -ExecutionPolicy Bypass -File scripts/build-installer.ps1', 'lệnh build installer')
                      }
                      className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </li>
                <li>
                  Sau khi build xong, mở thư mục <code className="text-slate-200">dist/</code>. Bạn sẽ thấy file <code className="text-emerald-400 font-bold">setup-devdock.exe</code>.
                </li>
                <li>
                  Mở trình duyệt web, vào trang GitHub của repo bạn: <code className="text-slate-200">https://github.com/&lt;user&gt;/&lt;repo&gt;/releases/new</code>
                </li>
                <li>
                  Nhập tag phiên bản (VD: <code className="text-slate-200">v1.5.0</code>), tiêu đề release và <strong>kéo thả file `setup-devdock.exe`</strong> vào ô đính kèm (Attach binaries).
                </li>
                <li>Bấm nút xanh <strong>Publish release</strong> là hoàn tất! Người dùng khác có thể tải về file cài đặt và dùng ngay.</li>
              </ol>
            </div>
          </div>
        ),
      },

      // 9. Shortcuts Cheatsheet
      {
        id: 'shortcuts',
        title: 'Bảng Phím Tắt Toàn Cục',
        category: 'Tiện Ích',
        icon: Keyboard,
        summary: 'Danh sách đầy đủ các phím tắt bàn phím để làm việc với tốc độ cao nhất.',
        content: (
          <div className="flex flex-col gap-4 text-xs leading-relaxed text-slate-300">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-accent" />
                <span>Bảng Phím Tắt Nhanh DevDock</span>
              </h3>
              <p className="mt-1 text-slate-400">
                Thao tác mọi chức năng chỉ với bàn phím, tiết kiệm thời gian di chuyển chuột:
              </p>
            </div>

            <div className="border border-border rounded-xl bg-surface overflow-hidden">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface-hover/50 text-[11px] text-slate-400">
                    <th className="py-2.5 px-4 font-semibold">Phím Tắt</th>
                    <th className="py-2.5 px-4 font-semibold">Chức Năng</th>
                    <th className="py-2.5 px-4 font-semibold">Phạm Vi Hoạt Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {[
                    { key: 'Ctrl + Space', desc: 'Mở Thanh Lệnh Toàn Năng (Command Palette)', scope: 'Toàn bộ ứng dụng' },
                    { key: 'F1', desc: 'Mở Cẩm Nang Hướng Dẫn Sử Dụng này', scope: 'Toàn bộ ứng dụng' },
                    { key: 'Ctrl + 1', desc: 'Chuyển sang tab Tổng Quan (Home)', scope: 'Thanh bên' },
                    { key: 'Ctrl + 2', desc: 'Chuyển sang tab Dự Án (Projects)', scope: 'Thanh bên' },
                    { key: 'Ctrl + 3', desc: 'Chuyển sang tab Quản Lý Git', scope: 'Thanh bên' },
                    { key: 'Ctrl + 4', desc: 'Chuyển sang tab Trung Tâm AI', scope: 'Thanh bên' },
                    { key: 'Ctrl + 5', desc: 'Chuyển sang tab Tiện Ích Dev (Tools)', scope: 'Thanh bên' },
                    { key: 'Ctrl + 6', desc: 'Chuyển sang tab Windows DevOps', scope: 'Thanh bên' },
                    { key: 'Ctrl + Shift + S', desc: 'Chuyển sang tab Kết Nối SSH & Server', scope: 'Thanh bên' },
                    { key: 'Ctrl + Shift + T', desc: 'Chuyển sang tab Terminal Đa Tab', scope: 'Thanh bên' },
                    { key: 'Ctrl + ,', desc: 'Mở màn hình Cài Đặt (Settings)', scope: 'Thanh bên' },
                    { key: 'Ctrl + Shift + F', desc: 'Tìm kiếm tệp nhanh trong dự án', scope: 'Tab Dự án' },
                    { key: 'Ctrl + Enter', desc: 'Commit nhanh các tệp đã stage', scope: 'Tab Git' },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-surface-hover/40 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-accent">
                        <kbd className="px-2 py-0.5 rounded bg-surface border border-border text-slate-200">
                          {row.key}
                        </kbd>
                      </td>
                      <td className="py-2.5 px-4 text-slate-200">{row.desc}</td>
                      <td className="py-2.5 px-4 text-slate-400 text-[11px]">{row.scope}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ),
      },
    ],
    [copiedCode]
  );

  // Filter sections by search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase();
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
    );
  }, [searchQuery, sections]);

  const activeSection = sections.find((s) => s.id === selectedSectionId) || sections[0];

  return (
    <div className="w-full h-full flex flex-col overflow-hidden p-4 sm:p-6 min-h-0">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col gap-4 sm:gap-5 min-h-0">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent-bg border border-accent-border flex items-center justify-center text-accent">
              <BookOpen className="w-4 h-4" />
            </div>
            <span>Cẩm Nang Hướng Dẫn Sử Dụng DevDock</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Tài liệu tra cứu tương tác, hướng dẫn cấu hình chi tiết từ cơ bản đến nâng cao và quy trình xuất bản release.
          </p>
        </div>

        {/* Live Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm: github, ssh, nginx, certbot, git..."
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accent font-sans"
          />
        </div>
      </div>

      {/* Main Layout: Left Navigation Drawer & Right Article Viewer */}
      <div className="flex-1 flex flex-col md:flex-row gap-5 overflow-hidden min-h-0">
        {/* Left Navigation Column */}
        <div className="w-full md:w-72 flex-shrink-0 flex flex-col gap-1.5 overflow-y-auto pr-1 min-h-0">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1 select-none">
            Mục Lục Cẩm Nang ({filteredSections.length})
          </span>

          {filteredSections.map((sec) => {
            const Icon = sec.icon;
            const isSelected = sec.id === activeSection.id;

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setSelectedSectionId(sec.id)}
                className={`flex items-start gap-3 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-accent-bg border-accent text-slate-100 font-medium'
                    : 'bg-surface/50 border-border hover:bg-surface hover:border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isSelected
                      ? 'bg-accent text-white'
                      : 'bg-surface-hover text-slate-400 border border-border'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold truncate text-slate-200">{sec.title}</span>
                    {sec.badge && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-300 border border-white/10 flex-shrink-0">
                        {sec.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{sec.summary}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Article Viewer */}
        <div className="flex-1 bg-surface border border-border rounded-xl p-6 overflow-y-auto flex flex-col gap-6 shadow-sm min-h-0">
          {/* Article Header */}
          <div className="flex items-start justify-between border-b border-border/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-bg border border-accent-border flex items-center justify-center text-accent flex-shrink-0">
                <activeSection.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-hover text-accent border border-border">
                    {activeSection.category}
                  </span>
                  {activeSection.badge && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {activeSection.badge}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-slate-100 mt-1">{activeSection.title}</h2>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleCopy(window.location.href, 'liên kết')}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-hover hover:bg-surface text-slate-400 hover:text-slate-200 text-xs border border-border transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Chia sẻ</span>
            </button>
          </div>

          {/* Article Main Body */}
          <div className="flex-1">{activeSection.content}</div>

          {/* Article Footer Navigation */}
          <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-slate-400">
            <span>DevDock Workstation • Developer Handbook</span>
            <div className="flex items-center gap-2">
              <span>Cần thêm trợ giúp?</span>
              <button
                type="button"
                onClick={() => setSelectedSectionId('github-release')}
                className="text-accent hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <span>Xem cách xuất bản release</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    
      </div>
    </div>
  );
};
