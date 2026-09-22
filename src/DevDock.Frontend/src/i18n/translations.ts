export type Lang = 'vi' | 'en';

export const translations = {
  vi: {
    // Sidebar
    'nav.home': 'Tổng quan',
    'nav.projects': 'Dự án',
    'nav.git': 'Quản lý Git',
    'nav.ai': 'Trung tâm AI',
    'nav.ssh': 'Kết nối SSH',
    'nav.terminal': 'Terminal',
    'nav.tools': 'Tiện ích Dev',
    'nav.devops': 'Windows DevOps',
    'nav.settings': 'Cài đặt',
    'nav.guide': 'Hướng dẫn sử dụng',
    'nav.about': 'Tác giả & Vibe',

    // TitleBar
    'titlebar.search_placeholder': 'Tìm lệnh, AI, kho Git, SSH...',
    'titlebar.minimize': 'Thu nhỏ',
    'titlebar.maximize': 'Phóng to',
    'titlebar.close': 'Đóng / Close (Alt+F4)',

    // Exit Modal
    'exit.title': 'Xác nhận thoát DevDock',
    'exit.subtitle': 'Developer Command Center',
    'exit.confirm_text': 'Bạn có chắc chắn muốn đóng và thoát khỏi DevDock?',
    'exit.warning_title': 'Lưu ý khi thoát:',
    'exit.warning_ssh': 'Mọi phiên kết nối SSH và SFTP đang mở sẽ bị ngắt kết nối.',
    'exit.warning_process': 'Các tiến trình build, dev server và terminal chạy ngầm sẽ dừng lại.',
    'exit.tip': 'Gợi ý: Bạn có thể chọn "Thu nhỏ vào khay" để ứng dụng tiếp tục chạy ngầm trong System Tray mà không ngắt các tiến trình dev.',
    'exit.minimize_tray': 'Thu nhỏ vào khay',
    'exit.cancel': 'Hủy',
    'exit.confirm_btn': 'Thoát DevDock',

    // Common actions
    'action.save': 'Lưu',
    'action.cancel': 'Hủy',
    'action.add': 'Thêm',
    'action.delete': 'Xóa',
    'action.edit': 'Sửa',
    'action.close': 'Đóng',
    'action.copy': 'Sao chép',
    'action.refresh': 'Làm mới',
    'action.connect': 'Kết nối',
    'action.disconnect': 'Ngắt kết nối',
    'action.test': 'Kiểm tra',
    'action.open': 'Mở',
    'action.search': 'Tìm kiếm',
    'action.confirm': 'Xác nhận',

    // Settings
    'settings.title': 'Cài đặt hệ thống',
    'settings.language': 'Ngôn ngữ',
    'settings.language_vi': 'Tiếng Việt',
    'settings.language_en': 'English',
    'settings.theme': 'Giao diện',
    'settings.terminal': 'Terminal',
    'settings.git': 'Git & Tài khoản',
    'settings.ai': 'Trí tuệ nhân tạo',
    'settings.security': 'Bảo mật',
    'settings.general': 'Chung',
    'settings.appearance': 'Giao diện',
    'settings.shortcuts': 'Phím tắt',
    'settings.save_success': 'Đã lưu cài đặt',

    // HomePage
    'home.greeting_morning': 'Chào buổi sáng',
    'home.greeting_afternoon': 'Chào buổi chiều',
    'home.greeting_evening': 'Chào buổi tối',
    'home.projects_section': 'Dự Án Đã Đăng Ký',
    'home.git_status': 'Trạng Thái Git Hiện Tại',
    'home.ssh_servers': 'Máy Chủ SSH',
    'home.shortcuts': 'Phím Tắt Toàn Cục',
    'home.view_all': 'Xem tất cả',
    'home.no_projects': 'Chưa có dự án nào. Nhấn "+ Thêm Dự án" để liên kết thư mục mã nguồn!',
    'home.add_project': '+ Thêm Dự Án',
    'home.ai_assistant': 'Trợ Lý AI (AI)',
    'home.manage': 'Quản lý',
    'home.open_terminal': 'Terminal',

    // Git
    'git.status': 'Trạng thái',
    'git.branch': 'Nhánh',
    'git.commit': 'Commit',
    'git.push': 'Đẩy lên',
    'git.pull': 'Kéo về',
    'git.fetch': 'Fetch',
    'git.clone': 'Clone',
    'git.stage_all': 'Stage Tất Cả',
    'git.unstage_all': 'Unstage Tất Cả',
    'git.discard': 'Huỷ thay đổi',
    'git.no_changes': 'Không có thay đổi nào.',

    // SSH
    'ssh.new_profile': 'Thêm máy chủ',
    'ssh.connect': 'Kết nối',
    'ssh.disconnect': 'Ngắt kết nối',
    'ssh.test': 'Kiểm tra kết nối',
    'ssh.no_profiles': 'Chưa có hồ sơ SSH nào.',

    // Terminal  
    'terminal.new_tab': 'Tab mới',
    'terminal.close_tab': 'Đóng tab',
    'terminal.fit': 'Căn chỉnh màn hình',
    'terminal.clear': 'Xoá màn hình',
  },
  en: {
    // Sidebar
    'nav.home': 'Overview',
    'nav.projects': 'Projects',
    'nav.git': 'Git Management',
    'nav.ai': 'AI Center',
    'nav.ssh': 'SSH Connect',
    'nav.terminal': 'Terminal',
    'nav.tools': 'Dev Tools',
    'nav.devops': 'Windows DevOps',
    'nav.settings': 'Settings',
    'nav.guide': 'User Guide',
    'nav.about': 'About & Vibe',

    // TitleBar
    'titlebar.search_placeholder': 'Search commands, AI, Git, SSH...',
    'titlebar.minimize': 'Minimize',
    'titlebar.maximize': 'Maximize',
    'titlebar.close': 'Close (Alt+F4)',

    // Exit Modal
    'exit.title': 'Confirm Exit DevDock',
    'exit.subtitle': 'Developer Command Center',
    'exit.confirm_text': 'Are you sure you want to close and exit DevDock?',
    'exit.warning_title': 'Please note:',
    'exit.warning_ssh': 'All active SSH and SFTP sessions will be disconnected.',
    'exit.warning_process': 'Background build processes, dev servers and terminals will be stopped.',
    'exit.tip': 'Tip: You can choose "Minimize to Tray" to keep the app running in the background without stopping dev processes.',
    'exit.minimize_tray': 'Minimize to Tray',
    'exit.cancel': 'Cancel',
    'exit.confirm_btn': 'Exit DevDock',

    // Common actions
    'action.save': 'Save',
    'action.cancel': 'Cancel',
    'action.add': 'Add',
    'action.delete': 'Delete',
    'action.edit': 'Edit',
    'action.close': 'Close',
    'action.copy': 'Copy',
    'action.refresh': 'Refresh',
    'action.connect': 'Connect',
    'action.disconnect': 'Disconnect',
    'action.test': 'Test',
    'action.open': 'Open',
    'action.search': 'Search',
    'action.confirm': 'Confirm',

    // Settings
    'settings.title': 'System Settings',
    'settings.language': 'Language',
    'settings.language_vi': 'Tiếng Việt',
    'settings.language_en': 'English',
    'settings.theme': 'Theme',
    'settings.terminal': 'Terminal',
    'settings.git': 'Git & Accounts',
    'settings.ai': 'Artificial Intelligence',
    'settings.security': 'Security',
    'settings.general': 'General',
    'settings.appearance': 'Appearance',
    'settings.shortcuts': 'Shortcuts',
    'settings.save_success': 'Settings saved',

    // HomePage
    'home.greeting_morning': 'Good morning',
    'home.greeting_afternoon': 'Good afternoon',
    'home.greeting_evening': 'Good evening',
    'home.projects_section': 'Registered Projects',
    'home.git_status': 'Current Git Status',
    'home.ssh_servers': 'SSH Servers',
    'home.shortcuts': 'Global Shortcuts',
    'home.view_all': 'View all',
    'home.no_projects': 'No projects yet. Click "+ Add Project" to link a source folder!',
    'home.add_project': '+ Add Project',
    'home.ai_assistant': 'AI Assistant',
    'home.manage': 'Manage',
    'home.open_terminal': 'Terminal',

    // Git
    'git.status': 'Status',
    'git.branch': 'Branch',
    'git.commit': 'Commit',
    'git.push': 'Push',
    'git.pull': 'Pull',
    'git.fetch': 'Fetch',
    'git.clone': 'Clone',
    'git.stage_all': 'Stage All',
    'git.unstage_all': 'Unstage All',
    'git.discard': 'Discard changes',
    'git.no_changes': 'No changes.',

    // SSH
    'ssh.new_profile': 'Add server',
    'ssh.connect': 'Connect',
    'ssh.disconnect': 'Disconnect',
    'ssh.test': 'Test connection',
    'ssh.no_profiles': 'No SSH profiles yet.',

    // Terminal
    'terminal.new_tab': 'New tab',
    'terminal.close_tab': 'Close tab',
    'terminal.fit': 'Fit terminal',
    'terminal.clear': 'Clear screen',
  },
} as const;

export type TranslationKey = keyof typeof translations.vi;
