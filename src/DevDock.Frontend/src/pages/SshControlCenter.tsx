import React, { useState, useEffect } from 'react';
import {
  Server,
  Play,
  Square,
  RotateCw,
  Terminal,
  FolderTree,
  Globe,
  ShieldCheck,
  Cpu,
  HardDrive,
  Activity,
  CheckCircle2,
  AlertTriangle,
  X,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Lock,
  RefreshCw,
  FileCode,
  FileText,
  GitBranch,
  Layers,
  ArrowLeft,
  Clock,
  Wifi,
  Sliders,
} from 'lucide-react';
import {
  SshProfile,
  SshServerOverview,
  SshListeningPortItem,
  SshProcessItem,
  SshNginxSiteItem,
  SshCertbotCertificateItem,
  SshDomainItem,
  SshGitDeploymentItem,
  SshSavedSnippet,
  SshServerMetadata,
  SshCommandResult,
} from '../types';
import { api } from '../services/api';

interface SshControlCenterProps {
  profile: SshProfile;
  onBack: () => void;
  onOpenTerminal: (profile: SshProfile) => void;
  onOpenSftp: (profile: SshProfile, path?: string) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

type SubTabType = 'overview' | 'ports' | 'nginx' | 'domains' | 'git' | 'snippets';

export const SshControlCenter: React.FC<SshControlCenterProps> = ({
  profile,
  onBack,
  onOpenTerminal,
  onOpenSftp,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<SubTabType>('overview');

  // Loading states
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [isLoadingPorts, setIsLoadingPorts] = useState(false);
  const [isLoadingProcesses, setIsLoadingProcesses] = useState(false);
  const [isLoadingNginx, setIsLoadingNginx] = useState(false);
  const [isLoadingCertbot, setIsLoadingCertbot] = useState(false);
  const [isLoadingDomains, setIsLoadingDomains] = useState(false);
  const [isExecutingCommand, setIsExecutingCommand] = useState(false);

  // Data
  const [overview, setOverview] = useState<SshServerOverview | null>(null);
  const [ports, setPorts] = useState<SshListeningPortItem[]>([]);
  const [portsSearch, setPortsSearch] = useState('');
  const [processes, setProcesses] = useState<SshProcessItem[]>([]);
  const [processType, setProcessType] = useState<'systemd' | 'pm2'>('systemd');
  const [processSearch, setProcessSearch] = useState('');

  // Nginx
  const [nginxRunning, setNginxRunning] = useState<boolean | null>(null);
  const [nginxVersion, setNginxVersion] = useState<string>('');
  const [nginxSites, setNginxSites] = useState<SshNginxSiteItem[]>([]);
  const [nginxSearch, setNginxSearch] = useState('');
  const [isNginxModalOpen, setIsNginxModalOpen] = useState(false);
  const [nginxModalMode, setNginxModalMode] = useState<'reverse_proxy' | 'static' | 'custom'>('reverse_proxy');
  const [nginxSiteName, setNginxSiteName] = useState('');
  const [nginxDomains, setNginxDomains] = useState('');
  const [nginxProxyPort, setNginxProxyPort] = useState('3000');
  const [nginxRootPath, setNginxRootPath] = useState('/var/www/my-site');
  const [nginxCustomConfig, setNginxCustomConfig] = useState('');
  const [nginxLogModal, setNginxLogModal] = useState<{ open: boolean; type: 'error' | 'access'; content: string }>({
    open: false,
    type: 'error',
    content: '',
  });

  // Domains & Certbot
  const [domainsList, setDomainsList] = useState<SshDomainItem[]>([]);
  const [newDomainInput, setNewDomainInput] = useState('');
  const [certbotInstalled, setCertbotInstalled] = useState<boolean | null>(null);
  const [certificates, setCertificates] = useState<SshCertbotCertificateItem[]>([]);
  const [isIssueSslModalOpen, setIsIssueSslModalOpen] = useState(false);
  const [sslDomain, setSslDomain] = useState('');
  const [sslEmail, setSslEmail] = useState('');
  const [isIssuingSsl, setIsIssuingSsl] = useState(false);

  // Git Deployments
  const [gitDeployments, setGitDeployments] = useState<SshGitDeploymentItem[]>([]);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [cloneRepoUrl, setCloneRepoUrl] = useState('');
  const [cloneTargetDir, setCloneTargetDir] = useState('/var/www/');
  const [cloneBranch, setCloneBranch] = useState('main');
  const [clonePostDeploy, setClonePostDeploy] = useState('npm install && npm run build');
  const [isCloning, setIsCloning] = useState(false);
  const [pullingRepoDir, setPullingRepoDir] = useState<string | null>(null);

  // Snippets & Terminal Runner
  const [savedSnippets, setSavedSnippets] = useState<SshSavedSnippet[]>([]);
  const [customCommand, setCustomCommand] = useState('');
  const [useSudo, setUseSudo] = useState(false);
  const [commandHistory, setCommandHistory] = useState<{ cmd: string; result: SshCommandResult; time: string }[]>([]);
  const [newSnippetTitle, setNewSnippetTitle] = useState('');

  // Process logs modal
  const [processLogsModal, setProcessLogsModal] = useState<{ open: boolean; name: string; logs: string }>({
    open: false,
    name: '',
    logs: '',
  });

  // Systemd creation modal
  const [isSystemdModalOpen, setIsSystemdModalOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDesc, setNewServiceDesc] = useState('');
  const [newServiceExec, setNewServiceExec] = useState('');
  const [newServiceDir, setNewServiceDir] = useState('');
  const [newServiceUser, setNewServiceUser] = useState('root');

  // Copy status
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Load Initial Metadata
  useEffect(() => {
    loadMetadata();
    loadOverview();
  }, [profile.id]);

  const loadMetadata = async () => {
    try {
      const res = await api.getSshServerMetadata(profile.id);
      if (res.success && res.metadata) {
        setDomainsList(res.metadata.domains || []);
        setGitDeployments(res.metadata.gitDeployments || []);
        setSavedSnippets(res.metadata.customSnippets || []);
      }
    } catch {
      // fallback
    }
  };

  const saveCurrentMetadata = async (
    newDomains?: SshDomainItem[],
    newGits?: SshGitDeploymentItem[],
    newSnips?: SshSavedSnippet[]
  ) => {
    const meta: SshServerMetadata = {
      domains: newDomains ?? domainsList,
      gitDeployments: newGits ?? gitDeployments,
      trackedSystemdServices: [],
      customSnippets: newSnips ?? savedSnippets,
    };
    try {
      await api.saveSshServerMetadata(profile.id, meta);
    } catch (err: any) {
      console.error('Failed to save metadata:', err);
    }
  };

  // Switch Subtabs Data Fetching
  useEffect(() => {
    if (activeTab === 'overview') {
      loadOverview();
    } else if (activeTab === 'ports') {
      loadPorts();
      loadProcesses(processType);
    } else if (activeTab === 'nginx') {
      loadNginx();
    } else if (activeTab === 'domains') {
      loadDomainsCheck();
      loadCertbot();
    } else if (activeTab === 'git') {
      refreshAllGitDeployments();
    }
  }, [activeTab]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // =========================================================================
  // OVERVIEW
  // =========================================================================
  const loadOverview = async () => {
    setIsLoadingOverview(true);
    try {
      const res = await api.getSshOverview(profile.id);
      if (res.success && res.overview) {
        setOverview(res.overview);
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi khi lấy thông số máy chủ', 'error');
    } finally {
      setIsLoadingOverview(false);
    }
  };

  // =========================================================================
  // PORTS & PROCESSES
  // =========================================================================
  const loadPorts = async () => {
    setIsLoadingPorts(true);
    try {
      const res = await api.getSshPorts(profile.id);
      if (res.success) {
        setPorts(res.ports);
      } else {
        onShowToast(res.errorMessage || 'Lỗi kiểm tra cổng mạng', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi kiểm tra cổng', 'error');
    } finally {
      setIsLoadingPorts(false);
    }
  };

  const loadProcesses = async (type: 'systemd' | 'pm2') => {
    setIsLoadingProcesses(true);
    try {
      const res = await api.getSshProcesses(profile.id);
      if (res.success) {
        const filtered = (res.processes || []).filter((p) => p.type === type);
        setProcesses(filtered);
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi đọc tiến trình', 'error');
    } finally {
      setIsLoadingProcesses(false);
    }
  };

  const handleKillPortProcess = async (portItem: SshListeningPortItem) => {
    if (!portItem.pid) return;
    if (!confirm(`Bạn có chắc muốn đóng tiến trình '${portItem.processName}' (PID: ${portItem.pid})?`)) return;
    try {
      const res = await api.killSshPortProcess(profile.id, portItem.pid, true);
      if (res.success) {
        onShowToast(`Đã đóng tiến trình PID ${portItem.pid}`, 'success');
        loadPorts();
      } else {
        onShowToast(res.errorMessage || 'Không thể đóng tiến trình', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi đóng tiến trình', 'error');
    }
  };

  const handleProcessAction = async (processName: string, action: 'start' | 'stop' | 'restart') => {
    try {
      onShowToast(`Đang thực hiện ${action} tiến trình '${processName}'...`, 'info');
      const res = await api.executeSshProcessAction(profile.id, processType, processName, action);
      if (res.success) {
        onShowToast(`Đã ${action} ${processName} thành công!`, 'success');
        loadProcesses(processType);
      } else {
        onShowToast(res.output || `Lỗi khi ${action} tiến trình`, 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || `Lỗi khi ${action} tiến trình`, 'error');
    }
  };

  const handleViewProcessLogs = async (processName: string) => {
    try {
      onShowToast(`Đang tải nhật ký '${processName}'...`, 'info');
      let cmd = '';
      if (processType === 'systemd') {
        cmd = `journalctl -u ${processName} -n 120 --no-pager`;
      } else {
        cmd = `pm2 logs ${processName} --lines 120 --nostream`;
      }
      const res = await api.sshExecCommand(profile.id, cmd);
      setProcessLogsModal({
        open: true,
        name: processName,
        logs: res.output || '(Không có nhật ký nào)',
      });
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi lấy nhật ký tiến trình', 'error');
    }
  };

  const handleCreateSystemdService = async () => {
    if (!newServiceName.trim() || !newServiceExec.trim()) {
      onShowToast('Vui lòng nhập Tên Service và Lệnh Khởi Chạy (ExecStart)', 'error');
      return;
    }
    try {
      const res = await api.createSshSystemdService(profile.id, {
        serviceName: newServiceName.trim(),
        execStart: newServiceExec.trim(),
        workingDir: newServiceDir.trim() || '/root',
        user: newServiceUser.trim() || 'root',
      });
      if (res.success) {
        onShowToast(`Đã tạo và kích hoạt Service '${newServiceName}' thành công!`, 'success');
        setIsSystemdModalOpen(false);
        setNewServiceName('');
        setNewServiceDesc('');
        setNewServiceExec('');
        setNewServiceDir('');
        loadProcesses('systemd');
      } else {
        onShowToast(res.output || 'Tạo service thất bại', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi tạo service systemd', 'error');
    }
  };

  // Quick shortcut: Port -> Nginx Proxy Modal
  const handleQuickProxyPort = (portNum: number) => {
    setNginxModalMode('reverse_proxy');
    setNginxSiteName(`app-${portNum}`);
    setNginxDomains('');
    setNginxProxyPort(portNum.toString());
    setActiveTab('nginx');
    setIsNginxModalOpen(true);
  };

  // =========================================================================
  // NGINX
  // =========================================================================
  const loadNginx = async () => {
    setIsLoadingNginx(true);
    try {
      const status = await api.getSshNginxStatus(profile.id);
      const isRunning = status.exitCode === 0 && (status.output.includes('active (running)') || status.output.includes('running'));
      setNginxRunning(isRunning);
      const verMatch = status.output.match(/nginx\/([0-9.]+)/i);
      setNginxVersion(verMatch ? `nginx/${verMatch[1]}` : isRunning ? 'Đang chạy' : 'Chưa chạy');
      const sitesRes = await api.getSshNginxSites(profile.id);
      if (sitesRes.success) {
        setNginxSites(sitesRes.sites);
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi kiểm tra Nginx', 'error');
    } finally {
      setIsLoadingNginx(false);
    }
  };

  const handleTestNginxConfig = async () => {
    try {
      onShowToast('Đang kiểm tra cú pháp cấu hình Nginx (nginx -t)...', 'info');
      const res = await api.sshExecCommand(profile.id, 'nginx -t');
      if (res.exitCode === 0) {
        onShowToast('✅ Cú pháp Nginx hoàn toàn chính xác (syntax is ok)!', 'success');
      } else {
        onShowToast(`❌ Lỗi cấu hình Nginx: ${res.output.slice(0, 200)}`, 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi kiểm tra Nginx', 'error');
    }
  };

  const handleReloadNginx = async () => {
    try {
      onShowToast('Đang reload dịch vụ Nginx...', 'info');
      const res = await api.reloadSshNginx(profile.id);
      if (res.success) {
        onShowToast('✅ Reload Nginx thành công!', 'success');
        loadNginx();
      } else {
        onShowToast(res.output || 'Reload Nginx thất bại', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi reload Nginx', 'error');
    }
  };

  const handleToggleNginxSite = async (site: SshNginxSiteItem) => {
    try {
      const newEnabled = !site.isEnabled;
      onShowToast(`Đang ${newEnabled ? 'kích hoạt' : 'tắt'} vhost '${site.name}'...`, 'info');
      const res = await api.toggleSshNginxSite(profile.id, site.name, newEnabled);
      if (res.success) {
        onShowToast(`Đã ${newEnabled ? 'bật' : 'tắt'} '${site.name}'!`, 'success');
        loadNginx();
      } else {
        onShowToast(res.output || 'Lỗi thay đổi trạng thái', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi thao tác vhost', 'error');
    }
  };

  const handleDeleteNginxSite = async (site: SshNginxSiteItem) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa cấu hình vhost '${site.name}' khỏi máy chủ?`)) return;
    try {
      const res = await api.deleteSshNginxSite(profile.id, site.name);
      if (res.success) {
        onShowToast(`Đã xóa vhost '${site.name}'!`, 'success');
        loadNginx();
      } else {
        onShowToast(res.output || 'Lỗi xóa vhost', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi xóa vhost', 'error');
    }
  };

  const handleOpenNginxLogs = async (type: 'error' | 'access') => {
    try {
      const res = await api.getSshNginxLogs(profile.id, type, 120);
      setNginxLogModal({
        open: true,
        type,
        content: res.logs || '(Không có nhật ký)',
      });
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi tải log Nginx', 'error');
    }
  };

  // Generate Nginx Preview
  const getGeneratedNginxConfig = () => {
    if (nginxModalMode === 'custom') return nginxCustomConfig;
    const doms = nginxDomains.trim() || 'example.com';
    if (nginxModalMode === 'reverse_proxy') {
      return `server {
    listen 80;
    listen [::]:80;
    server_name ${doms};

    location / {
        proxy_pass http://127.0.0.1:${nginxProxyPort || '3000'};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}`;
    } else {
      return `server {
    listen 80;
    listen [::]:80;
    server_name ${doms};

    root ${nginxRootPath || '/var/www/html'};
    index index.html index.htm;

    location / {
        try_files $uri $uri/ /index.html;
    }
}`;
    }
  };

  const handleSaveNginxSite = async () => {
    if (!nginxSiteName.trim()) {
      onShowToast('Vui lòng đặt tên tệp cấu hình (VD: my-app.conf)', 'error');
      return;
    }
    const cleanName = nginxSiteName.trim().endsWith('.conf') ? nginxSiteName.trim() : `${nginxSiteName.trim()}.conf`;

    try {
      onShowToast(`Đang lưu và áp dụng cấu hình '${cleanName}'...`, 'info');
      const res = await api.saveSshNginxSite(profile.id, {
        siteName: cleanName,
        domainNames: nginxDomains,
        proxyPassHost: 'http://127.0.0.1',
        proxyPassPort: nginxModalMode === 'reverse_proxy' ? parseInt(nginxProxyPort) : undefined,
        isSpaStatic: nginxModalMode === 'static',
        staticRootPath: nginxModalMode === 'static' ? nginxRootPath : undefined,
        enableWebSocket: true,
        enableSsl: false,
        customDirectives: nginxModalMode === 'custom' ? nginxCustomConfig : undefined,
      });

      if (res.success) {
        onShowToast(`Đã lưu và kích hoạt vhost '${cleanName}' thành công!`, 'success');
        setIsNginxModalOpen(false);
        setNginxSiteName('');
        setNginxDomains('');
        loadNginx();
      } else {
        onShowToast(res.output || 'Lưu cấu hình Nginx thất bại', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi lưu cấu hình Nginx', 'error');
    }
  };

  // =========================================================================
  // DOMAINS & CERTBOT SSL
  // =========================================================================
  const loadDomainsCheck = async () => {
    setIsLoadingDomains(true);
    try {
      const meta = await api.getSshServerMetadata(profile.id);
      const existing = meta.metadata?.domains || [];
      if (existing.length > 0) {
        const checkRes = await api.checkSshDomains(
          profile.id,
          existing.map((d) => d.domain)
        );
        if (checkRes.success) {
          setDomainsList(checkRes.domains);
          saveCurrentMetadata(checkRes.domains, undefined, undefined);
        }
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi kiểm tra bản ghi DNS tên miền', 'error');
    } finally {
      setIsLoadingDomains(false);
    }
  };

  const loadCertbot = async () => {
    setIsLoadingCertbot(true);
    try {
      const res = await api.getSshCertbotStatus(profile.id);
      setCertbotInstalled(res.success);
      setCertificates(res.certificates || []);
    } catch (err: any) {
      // not installed
      setCertbotInstalled(false);
    } finally {
      setIsLoadingCertbot(false);
    }
  };

  const handleInstallCertbot = async () => {
    try {
      onShowToast('Đang cài đặt Certbot và plugin Nginx trên server (apt/snap)...', 'info');
      const res = await api.installSshCertbot(profile.id);
      if (res.success) {
        onShowToast('Cài đặt Certbot thành công!', 'success');
        loadCertbot();
      } else {
        onShowToast(res.output || 'Cài đặt Certbot thất bại', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi cài Certbot', 'error');
    }
  };

  const handleAddDomain = async () => {
    if (!newDomainInput.trim()) return;
    const cleanDomains = newDomainInput
      .split(/[ ,]+/)
      .map((d) => d.trim().toLowerCase())
      .filter((d) => d.length > 3 && !domainsList.some((x) => x.domain === d));

    if (cleanDomains.length === 0) return;

    try {
      onShowToast(`Đang phân giải DNS cho ${cleanDomains.length} tên miền...`, 'info');
      const checkRes = await api.checkSshDomains(profile.id, cleanDomains);
      const updated = [...domainsList, ...(checkRes.domains || [])];
      setDomainsList(updated);
      setNewDomainInput('');
      await saveCurrentMetadata(updated, undefined, undefined);
      onShowToast(`Đã thêm và kiểm tra ${cleanDomains.length} tên miền!`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi thêm tên miền', 'error');
    }
  };

  const handleDeleteDomain = async (domainStr: string) => {
    const updated = domainsList.filter((d) => d.domain !== domainStr);
    setDomainsList(updated);
    await saveCurrentMetadata(updated, undefined, undefined);
    onShowToast(`Đã gỡ tên miền '${domainStr}'`, 'info');
  };

  const handleIssueCertbotSsl = async () => {
    if (!sslDomain.trim()) {
      onShowToast('Vui lòng nhập tên miền cần cấp SSL', 'error');
      return;
    }
    setIsIssuingSsl(true);
    try {
      onShowToast(`Đang yêu cầu Let's Encrypt cấp SSL cho '${sslDomain}'...`, 'info');
      const res = await api.issueSshCertbotSsl(
        profile.id,
        sslDomain.trim(),
        sslEmail.trim() || `admin@${sslDomain.trim()}`
      );
      if (res.success) {
        onShowToast(`✅ Đã cấp chứng chỉ SSL thành công cho '${sslDomain}'!`, 'success');
        setIsIssueSslModalOpen(false);
        setSslDomain('');
        loadCertbot();
        loadNginx();
      } else {
        onShowToast(res.output || 'Cấp chứng chỉ SSL thất bại', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi khi cấp chứng chỉ SSL', 'error');
    } finally {
      setIsIssuingSsl(false);
    }
  };

  const handleRenewAllCertificates = async () => {
    try {
      onShowToast('Đang thực hiện kiểm tra và gia hạn chứng chỉ (certbot renew)...', 'info');
      const res = await api.sshExecCommand(profile.id, 'certbot renew --quiet');
      if (res.exitCode === 0) {
        onShowToast('✅ Đã kiểm tra gia hạn tất cả chứng chỉ SSL!', 'success');
        loadCertbot();
      } else {
        onShowToast(res.output || 'Gia hạn thất bại', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi gia hạn SSL', 'error');
    }
  };

  // =========================================================================
  // GIT SERVER DEPLOYMENTS
  // =========================================================================
  const refreshAllGitDeployments = async () => {
    if (gitDeployments.length === 0) return;
    const updated: SshGitDeploymentItem[] = [];
    for (const item of gitDeployments) {
      try {
        const st = await api.getSshServerGitStatus(profile.id, item.targetPath);
        updated.push({
          ...item,
          branch: st.branch || item.branch,
          lastCommitHash: st.lastCommitHash,
          lastCommitMessage: st.lastCommitMessage,
          lastPulledAt: st.lastPulledAt,
        });
      } catch {
        updated.push(item);
      }
    }
    setGitDeployments(updated);
    saveCurrentMetadata(undefined, updated, undefined);
  };

  const handleCloneRepo = async () => {
    if (!cloneRepoUrl.trim() || !cloneTargetDir.trim()) {
      onShowToast('Vui lòng nhập Repo Git URL và Thư mục trên Server', 'error');
      return;
    }
    setIsCloning(true);
    try {
      onShowToast(`Đang clone repository vào '${cloneTargetDir}'...`, 'info');
      const res = await api.sshServerGitClone(
        profile.id,
        cloneRepoUrl.trim(),
        cloneTargetDir.trim(),
        cloneBranch.trim() || 'main'
      );
      if (res.success) {
        onShowToast('Clone repository thành công!', 'success');
        // Fetch status
        const st = await api.getSshServerGitStatus(profile.id, cloneTargetDir.trim());
        const newItem: SshGitDeploymentItem = {
          id: Date.now().toString(),
          name: cloneRepoUrl.split('/').pop()?.replace('.git', '') || 'git-app',
          repoUrl: cloneRepoUrl.trim(),
          targetPath: cloneTargetDir.trim(),
          branch: cloneBranch.trim() || 'main',
          postDeployCommand: clonePostDeploy.trim(),
          lastCommitHash: st.lastCommitHash,
          lastCommitMessage: st.lastCommitMessage,
          lastPulledAt: new Date().toISOString(),
        };
        const updated = [...gitDeployments, newItem];
        setGitDeployments(updated);
        await saveCurrentMetadata(undefined, updated, undefined);
        setIsCloneModalOpen(false);
        setCloneRepoUrl('');
      } else {
        onShowToast(res.output || 'Clone repository thất bại', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi khi clone git', 'error');
    } finally {
      setIsCloning(false);
    }
  };

  const handlePullRepo = async (item: SshGitDeploymentItem) => {
    setPullingRepoDir(item.targetPath);
    try {
      onShowToast(`Đang kéo code mới nhất tại '${item.targetPath}'...`, 'info');
      const res = await api.sshServerGitPull(
        profile.id,
        item.targetPath,
        item.branch,
        item.postDeployCommand
      );
      if (res.success) {
        onShowToast('✅ Kéo code và chạy post-deploy thành công!', 'success');
        // Refresh item status
        const st = await api.getSshServerGitStatus(profile.id, item.targetPath);
        const updated = gitDeployments.map((g) =>
          g.targetPath === item.targetPath
            ? {
                ...g,
                lastCommitHash: st.lastCommitHash,
                lastCommitMessage: st.lastCommitMessage,
                lastPulledAt: new Date().toISOString(),
              }
            : g
        );
        setGitDeployments(updated);
        await saveCurrentMetadata(undefined, updated, undefined);
      } else {
        onShowToast(`❌ Lỗi khi kéo code: ${res.output.slice(0, 300)}`, 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi pull git', 'error');
    } finally {
      setPullingRepoDir(null);
    }
  };

  const handleDeleteGitDeployment = async (targetDir: string) => {
    const updated = gitDeployments.filter((g) => g.targetPath !== targetDir);
    setGitDeployments(updated);
    await saveCurrentMetadata(undefined, updated, undefined);
    onShowToast(`Đã gỡ dự án tại '${targetDir}' khỏi danh sách quản lý`, 'info');
  };

  // =========================================================================
  // SNIPPETS & COMMAND RUNNER
  // =========================================================================
  const handleExecuteCommand = async (cmdToRun?: string) => {
    const cmd = cmdToRun || customCommand;
    if (!cmd.trim()) return;
    setIsExecutingCommand(true);
    const timeStr = new Date().toLocaleTimeString();
    const finalCmd = useSudo && !cmd.trim().startsWith('sudo ') ? `sudo ${cmd.trim()}` : cmd.trim();
    try {
      const res = await api.sshExecCommand(profile.id, finalCmd);
      setCommandHistory((prev) => [
        {
          cmd: finalCmd,
          result: res,
          time: timeStr,
        },
        ...prev.slice(0, 19),
      ]);
      if (res.exitCode === 0) {
        onShowToast(`Hoàn tất lệnh trong ${res.executionTimeMs}ms`, 'success');
      } else {
        onShowToast(`Lệnh kết thúc với exit code ${res.exitCode}`, 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi thực thi lệnh', 'error');
    } finally {
      setIsExecutingCommand(false);
    }
  };

  const handleSaveSnippet = async () => {
    if (!customCommand.trim() || !newSnippetTitle.trim()) {
      onShowToast('Vui lòng nhập lệnh và đặt tiêu đề cho snippet', 'error');
      return;
    }
    const newSnip: SshSavedSnippet = {
      id: Date.now().toString(),
      name: newSnippetTitle.trim(),
      command: customCommand.trim(),
      description: 'Lệnh tùy biến đã lưu',
    };
    const updated = [...savedSnippets, newSnip];
    setSavedSnippets(updated);
    await saveCurrentMetadata(undefined, undefined, updated);
    setNewSnippetTitle('');
    onShowToast(`Đã lưu snippet '${newSnip.name}'!`, 'success');
  };

  // Presets
  const sysadminPresets = [
    {
      title: 'Cài Nginx Web Server',
      desc: 'Cài đặt và bật Nginx dịch vụ tự khởi động cùng OS',
      cmd: 'apt update && apt install -y nginx && systemctl enable --now nginx',
    },
    {
      title: 'Cài Node.js LTS (NodeSource)',
      desc: 'Cài phiên bản Node.js LTS v20.x và npm',
      cmd: 'curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install -y nodejs',
    },
    {
      title: 'Cài Docker & Compose',
      desc: 'Cài Docker engine và tiện ích compose',
      cmd: 'curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh',
    },
    {
      title: 'Cài Certbot & Git',
      desc: 'Cài Git và công cụ cấp chứng chỉ SSL Certbot',
      cmd: 'apt update && apt install -y git certbot python3-certbot-nginx',
    },
    {
      title: 'Cập nhật hệ thống OS',
      desc: 'Quét và nâng cấp các gói bảo mật mới nhất',
      cmd: 'apt update && apt upgrade -y',
    },
    {
      title: 'Dọn dẹp rác & Cache',
      desc: 'Xóa gói dư thừa và dọn log systemd cũ',
      cmd: 'apt autoremove -y && journalctl --vacuum-time=3d',
    },
    {
      title: 'Khởi động lại Nginx',
      desc: 'Reload hoặc restart lại nginx an toàn',
      cmd: 'nginx -t && systemctl reload nginx',
    },
    {
      title: 'Cấu hình UFW Tường Lửa',
      desc: 'Cho phép port 22 (SSH), 80 (HTTP), 443 (HTTPS)',
      cmd: 'ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable',
    },
  ];

  // Filtering
  const filteredPorts = ports.filter(
    (p) =>
      p.port.toString().includes(portsSearch) ||
      p.processName.toLowerCase().includes(portsSearch.toLowerCase()) ||
      p.localAddress.toLowerCase().includes(portsSearch.toLowerCase())
  );

  const filteredProcesses = processes.filter(
    (p) =>
      p.name.toLowerCase().includes(processSearch.toLowerCase()) ||
      p.status.toLowerCase().includes(processSearch.toLowerCase())
  );

  const filteredSites = nginxSites.filter(
    (s) =>
      s.name.toLowerCase().includes(nginxSearch.toLowerCase()) ||
      s.domainNames.some((d: string) => d.toLowerCase().includes(nginxSearch.toLowerCase()))
  );

  // Compute memory percent
  const memUsedPercent =
    overview && overview.memTotalMb > 0
      ? Math.round((overview.memUsedMb / overview.memTotalMb) * 100)
      : 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6 max-w-7xl mx-auto w-full gap-5">
      {/* Top Navigation & Server Summary */}
      <div className="flex flex-col gap-4 pb-4 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-lg bg-surface hover:bg-surface-hover text-text-muted hover:text-text border border-border transition-colors cursor-pointer"
              title="Quay lại danh sách máy chủ"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-bg border border-accent-border flex items-center justify-center text-accent flex-shrink-0">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-text">{profile.name}</h1>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Online
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted font-mono">
                  <span>{profile.username}@{profile.host}:{profile.port}</span>
                  {overview?.osName && <span>• {overview.osName}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenTerminal(profile)}
              className="px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Mở Shell Console</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenSftp(profile)}
              className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover text-text-muted hover:text-text text-xs font-medium flex items-center gap-1.5 transition-colors border border-border cursor-pointer"
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>SFTP Tệp</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'overview') loadOverview();
                if (activeTab === 'ports') {
                  loadPorts();
                  loadProcesses(processType);
                }
                if (activeTab === 'nginx') loadNginx();
                if (activeTab === 'domains') {
                  loadDomainsCheck();
                  loadCertbot();
                }
                if (activeTab === 'git') refreshAllGitDeployments();
              }}
              className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover text-text-muted hover:text-text border border-border transition-colors cursor-pointer"
              title="Làm mới tab hiện tại"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-border/40 pb-px">
          {[
            { id: 'overview', label: 'Tổng Quan & Tài Nguyên', icon: Cpu },
            { id: 'ports', label: 'Cổng & Tiến Trình', icon: Activity },
            { id: 'nginx', label: 'Nginx Virtual Hosts', icon: Globe },
            { id: 'domains', label: 'Tên Miền & SSL Certbot', icon: ShieldCheck },
            { id: 'git', label: 'Git Triển Khai Repo', icon: GitBranch },
            { id: 'snippets', label: 'Lệnh Nhanh & Sysadmin', icon: FileCode },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as SubTabType)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-accent text-accent font-semibold bg-accent-bg'
                    : 'border-transparent text-text-muted hover:text-text hover:bg-surface-hover'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="flex-1 overflow-y-auto flex flex-col gap-6">
          {isLoadingOverview && !overview ? (
            <div className="py-20 flex flex-col items-center justify-center text-text-muted gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-accent" />
              <span className="text-xs">Đang lấy thông số máy chủ từ xa...</span>
            </div>
          ) : overview ? (
            <>
              {/* Telemetry Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* CPU */}
                <div className="bg-surface border border-border rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-text-muted">
                    <span className="text-xs font-medium">Tải CPU</span>
                    <Cpu className="w-4 h-4 text-accent" />
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-bold text-text font-mono">
                      {overview.cpuUsage || '0%'}
                    </div>
                    <div className="text-[11px] text-text-muted font-mono mt-1">
                      OS: {overview.osName || 'Linux'}
                    </div>
                  </div>
                </div>

                {/* RAM */}
                <div className="bg-surface border border-border rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-text-muted">
                    <span className="text-xs font-medium">Bộ Nhớ RAM</span>
                    <Activity className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="mt-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-bold text-text font-mono">{memUsedPercent}%</span>
                      <span className="text-xs font-mono text-text-muted">
                        {(overview.memUsedMb / 1024).toFixed(1)} / {(overview.memTotalMb / 1024).toFixed(1)} GB
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-hover rounded-full overflow-hidden mt-2">
                      <div
                        className={`h-full transition-all ${
                          memUsedPercent > 85 ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, memUsedPercent)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Disk */}
                <div className="bg-surface border border-border rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-text-muted">
                    <span className="text-xs font-medium">Ổ Đĩa Root (/)</span>
                    <HardDrive className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="mt-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-bold text-text font-mono">{overview.diskPercent || '0%'}</span>
                      <span className="text-xs font-mono text-text-muted">
                        {overview.diskUsed || '0'} / {overview.diskTotal || '0'}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-hover rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full transition-all bg-amber-500"
                        style={{ width: `${Math.min(100, parseInt(overview.diskPercent) || 0)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Uptime */}
                <div className="bg-surface border border-border rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-text-muted">
                    <span className="text-xs font-medium">Thời Gian Hoạt Động</span>
                    <Clock className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="mt-3">
                    <div className="text-lg font-bold text-text font-mono truncate" title={overview.uptime}>
                      {overview.uptime || 'N/A'}
                    </div>
                    <div className="text-[11px] text-text-muted font-mono mt-1">
                      UFW: {overview.ufwActive ? 'Bảo vệ bật' : 'Tắt'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Server Spec Details & IP Network */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* System Info */}
                <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
                  <h3 className="text-xs font-bold text-text flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-accent" />
                    <span>Thông Tin Hệ Thống</span>
                  </h3>
                  <div className="flex flex-col gap-2 font-mono text-xs">
                    <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                      <span className="text-text-muted">Hệ Điều Hành</span>
                      <span className="text-text font-medium">{overview.osName}</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                      <span className="text-text-muted">Thời Gian Uptime</span>
                      <span className="text-text">{overview.uptime}</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                      <span className="text-text-muted">RAM Tổng / Đã Dùng</span>
                      <span className="text-text">{overview.memUsedMb} MB / {overview.memTotalMb} MB</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-text-muted">Dung Lượng Ổ Đĩa</span>
                      <span className="text-text">{overview.diskUsed} ({overview.diskPercent}) / {overview.diskTotal}</span>
                    </div>
                  </div>
                </div>

                {/* Network & IPs */}
                <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
                  <h3 className="text-xs font-bold text-text flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-accent" />
                    <span>Địa Chỉ Máy Chủ & Tường Lửa UFW</span>
                  </h3>
                  <div className="flex flex-col gap-2 font-mono text-xs">
                    <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                      <span className="text-text-muted">IP / Host Máy Chủ</span>
                      <div className="flex items-center gap-2">
                        <span className="text-text font-bold text-accent">{profile.host}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(profile.host)}
                          className="text-text-muted hover:text-text cursor-pointer"
                          title="Sao chép IP"
                        >
                          {copiedText === profile.host ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                      <span className="text-text-muted">Cổng Kết Nối SSH</span>
                      <span className="text-text">Port {profile.port}</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                      <span className="text-text-muted">Tường Lửa UFW</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          overview.ufwActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {overview.ufwActive ? 'Đang Hoạt Động (Active)' : 'Chưa Bật (Inactive)'}
                      </span>
                    </div>
                    {overview.ufwRules && overview.ufwRules.length > 0 && (
                      <div className="flex items-start justify-between py-1.5">
                        <span className="text-text-muted">Quy Tắc Mở Port</span>
                        <span className="text-text text-right truncate max-w-xs">{overview.ufwRules.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-text-muted">
              Không thể tải thông số máy chủ. Hãy kiểm tra kết nối mạng.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PORTS & PROCESSES */}
      {/* ========================================================================= */}
      {activeTab === 'ports' && (
        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-text-muted" />
                <input
                  type="text"
                  value={portsSearch}
                  onChange={(e) => setPortsSearch(e.target.value)}
                  placeholder="Lọc cổng, process, địa chỉ..."
                  className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-text placeholder-text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <span className="text-xs text-text-muted font-mono">
                Đang lắng nghe: {filteredPorts.length} cổng
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadPorts}
                disabled={isLoadingPorts}
                className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover text-text text-xs font-medium flex items-center gap-1.5 border border-border transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPorts ? 'animate-spin text-accent' : ''}`} />
                <span>Quét Cổng Lại</span>
              </button>
            </div>
          </div>

          {/* Listening Ports Table */}
          <div className="border border-border rounded-xl bg-surface overflow-hidden flex flex-col max-h-[42%]">
            <div className="px-4 py-2.5 bg-surface-hover/50 border-b border-border flex items-center justify-between">
              <div className="text-xs font-bold text-text flex items-center gap-2">
                <Activity className="w-4 h-4 text-accent" />
                <span>Danh Sách Cổng Đang Lắng Nghe (Listening Ports)</span>
              </div>
              <span className="text-[11px] text-text-muted font-mono">ss -tulpn</span>
            </div>

            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-text-muted text-[11px] bg-surface/80 sticky top-0">
                    <th className="py-2 px-3 font-medium">Giao Thức</th>
                    <th className="py-2 px-3 font-medium">Cổng (Port)</th>
                    <th className="py-2 px-3 font-medium">Địa Chỉ Gắn (Local Address)</th>
                    <th className="py-2 px-3 font-medium">Tiến Trình (Process)</th>
                    <th className="py-2 px-3 font-medium">PID</th>
                    <th className="py-2 px-3 font-medium text-right">Thao Tác Nhanh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredPorts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-text-muted">
                        {isLoadingPorts ? 'Đang quét các cổng mạng...' : 'Không tìm thấy cổng nào'}
                      </td>
                    </tr>
                  ) : (
                    filteredPorts.map((p, idx) => (
                      <tr key={idx} className="hover:bg-surface-hover/50 transition-colors">
                        <td className="py-2 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              p.protocol.toLowerCase() === 'tcp'
                                ? 'bg-blue-500/10 text-blue-400'
                                : 'bg-purple-500/10 text-purple-400'
                            }`}
                          >
                            {p.protocol.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-bold text-accent">:{p.port}</td>
                        <td className="py-2 px-3 text-text-muted">
                          {p.localAddress.includes('0.0.0.0') || p.localAddress.includes('*') ? (
                            <span className="text-amber-400">Public ({p.localAddress})</span>
                          ) : p.localAddress.includes('127.0.0.1') ? (
                            <span className="text-emerald-400">Local (127.0.0.1)</span>
                          ) : (
                            p.localAddress
                          )}
                        </td>
                        <td className="py-2 px-3 font-semibold text-text truncate max-w-[140px]">
                          {p.processName || 'N/A'}
                        </td>
                        <td className="py-2 px-3 text-text-muted">{p.pid || '-'}</td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleQuickProxyPort(p.port)}
                              className="px-2 py-1 rounded bg-accent-bg hover:bg-accent-bg-hover text-accent-light text-[11px] font-medium border border-accent-border transition-colors cursor-pointer"
                              title="Tạo Virtual Host Nginx Proxy trỏ vào cổng này"
                            >
                              Tạo Proxy Nginx
                            </button>
                            {p.pid > 0 && (
                              <button
                                type="button"
                                onClick={() => handleKillPortProcess(p)}
                                className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-medium border border-rose-500/20 transition-colors cursor-pointer"
                                title="Đóng tiến trình PID này"
                              >
                                Kill PID
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Process Manager Section */}
          <div className="border border-border rounded-xl bg-surface overflow-hidden flex-1 flex flex-col">
            <div className="px-4 py-2.5 bg-surface-hover/50 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-text flex items-center gap-2">
                  <Layers className="w-4 h-4 text-accent" />
                  <span>Trình Quản Lý Tiến Trình (Process Manager)</span>
                </span>
                <div className="flex items-center bg-surface p-0.5 rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => {
                      setProcessType('systemd');
                      loadProcesses('systemd');
                    }}
                    className={`px-2.5 py-1 text-xs rounded font-medium cursor-pointer transition-colors ${
                      processType === 'systemd'
                        ? 'bg-accent text-white font-semibold'
                        : 'text-text-muted hover:text-text'
                    }`}
                  >
                    Systemd Services
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProcessType('pm2');
                      loadProcesses('pm2');
                    }}
                    className={`px-2.5 py-1 text-xs rounded font-medium cursor-pointer transition-colors ${
                      processType === 'pm2'
                        ? 'bg-accent text-white font-semibold'
                        : 'text-text-muted hover:text-text'
                    }`}
                  >
                    PM2 Node.js
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={processSearch}
                  onChange={(e) => setProcessSearch(e.target.value)}
                  placeholder="Lọc tiến trình..."
                  className="w-48 bg-surface border border-border rounded-lg px-2.5 py-1 text-xs text-text placeholder-text-muted focus:outline-none"
                />
                {processType === 'systemd' && (
                  <button
                    type="button"
                    onClick={() => setIsSystemdModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tạo Systemd Service</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => loadProcesses(processType)}
                  className="p-1 rounded-lg bg-surface hover:bg-surface-hover text-text-muted hover:text-text border border-border cursor-pointer"
                  title="Làm mới tiến trình"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingProcesses ? 'animate-spin text-accent' : ''}`} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-text-muted text-[11px] bg-surface/80 sticky top-0">
                    <th className="py-2 px-3 font-medium">Tên Tiến Trình</th>
                    <th className="py-2 px-3 font-medium">Trạng Thái</th>
                    <th className="py-2 px-3 font-medium">ID</th>
                    <th className="py-2 px-3 font-medium">Tài Nguyên</th>
                    <th className="py-2 px-3 font-medium text-right">Điều Khiển</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredProcesses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-text-muted">
                        {isLoadingProcesses
                          ? 'Đang nạp danh sách tiến trình...'
                          : processType === 'pm2'
                          ? 'Chưa có ứng dụng PM2 nào đang chạy hoặc PM2 chưa được cài đặt'
                          : 'Không tìm thấy service phù hợp'}
                      </td>
                    </tr>
                  ) : (
                    filteredProcesses.map((pr, idx) => (
                      <tr key={idx} className="hover:bg-surface-hover/50 transition-colors">
                        <td className="py-2 px-3 font-bold text-text">{pr.name}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              pr.status.toLowerCase() === 'active' || pr.status.toLowerCase() === 'online'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : pr.status.toLowerCase() === 'failed' || pr.status.toLowerCase() === 'errored'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-surface-hover text-text-muted border border-border'
                            }`}
                          >
                            {pr.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-text-muted">{pr.id || '-'}</td>
                        <td className="py-2 px-3 text-text-muted">
                          {pr.memory || pr.cpu ? `${pr.memory || ''} ${pr.cpu || ''}` : '-'}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleProcessAction(pr.name, 'restart')}
                              className="p-1 rounded bg-surface hover:bg-surface-hover text-text-muted hover:text-text border border-border cursor-pointer transition-colors"
                              title="Khởi động lại (Restart)"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                            </button>
                            {pr.status === 'active' || pr.status === 'online' ? (
                              <button
                                type="button"
                                onClick={() => handleProcessAction(pr.name, 'stop')}
                                className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 cursor-pointer transition-colors"
                                title="Dừng tiến trình (Stop)"
                              >
                                <Square className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleProcessAction(pr.name, 'start')}
                                className="p-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 cursor-pointer transition-colors"
                                title="Chạy tiến trình (Start)"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleViewProcessLogs(pr.name)}
                              className="px-2 py-1 rounded bg-surface hover:bg-surface-hover text-text text-[11px] border border-border cursor-pointer transition-colors"
                              title="Xem nhật ký chạy (Logs)"
                            >
                              Logs
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: NGINX VIRTUAL HOSTS */}
      {/* ========================================================================= */}
      {activeTab === 'nginx' && (
        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Nginx Banner & Controls */}
          <div className="bg-surface border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-3.5 h-3.5 rounded-full ${
                  nginxRunning ? 'bg-emerald-400 ring-4 ring-emerald-400/20' : 'bg-rose-400 ring-4 ring-rose-400/20'
                }`}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-text">Dịch Vụ Nginx</span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      nginxRunning
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {nginxRunning ? 'Đang Chạy (Active)' : 'Đang Dừng (Stopped)'}
                  </span>
                </div>
                <div className="text-xs text-text-muted font-mono mt-0.5">
                  Phiên bản: {nginxVersion || 'Chưa cài đặt'} • Vhosts: {nginxSites.length} site
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestNginxConfig}
                className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover text-text text-xs font-medium border border-border transition-colors cursor-pointer"
                title="Kiểm tra cú pháp (nginx -t)"
              >
                Kiểm Tra (nginx -t)
              </button>
              <button
                type="button"
                onClick={handleReloadNginx}
                className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover text-text text-xs font-medium border border-border transition-colors cursor-pointer"
                title="Tải lại cấu hình Nginx"
              >
                Reload Nginx
              </button>
              <button
                type="button"
                onClick={() => handleOpenNginxLogs('error')}
                className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover text-text text-xs font-medium border border-border transition-colors cursor-pointer"
                title="Xem nhật ký lỗi"
              >
                Xem Error Log
              </button>
              <button
                type="button"
                onClick={() => {
                  setNginxModalMode('reverse_proxy');
                  setNginxSiteName('');
                  setNginxDomains('');
                  setIsNginxModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Thêm Virtual Host</span>
              </button>
            </div>
          </div>

          {/* Sites Grid */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-text-muted" />
              <input
                type="text"
                value={nginxSearch}
                onChange={(e) => setNginxSearch(e.target.value)}
                placeholder="Tìm kiếm site, domain..."
                className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-text placeholder-text-muted focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredSites.length === 0 ? (
              <div className="py-20 text-center text-text-muted flex flex-col items-center justify-center">
                <Globe className="w-12 h-12 text-border mb-3 stroke-1" />
                <p className="text-sm font-medium text-text">Chưa có Virtual Host nào</p>
                <p className="text-xs text-text-muted mt-1">
                  Bấm "+ Thêm Virtual Host" để tạo Reverse Proxy hoặc cấu hình Web tĩnh
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
                {filteredSites.map((site, idx) => (
                  <div
                    key={idx}
                    className="bg-surface border border-border hover:border-text-muted/40 rounded-xl p-4 flex flex-col justify-between gap-4 transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-accent" />
                          <span className="font-bold text-sm text-text truncate" title={site.name}>
                            {site.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleNginxSite(site)}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded cursor-pointer transition-colors ${
                            site.isEnabled
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-surface-hover text-text-muted border border-border'
                          }`}
                          title="Bấm để Bật/Tắt vhost này"
                        >
                          {site.isEnabled ? 'Enabled (Đang bật)' : 'Disabled (Tắt)'}
                        </button>
                      </div>

                      {/* Domain list */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {site.domainNames.map((dom: string, dIdx: number) => (
                          <span
                            key={dIdx}
                            className="text-xs font-mono px-2 py-0.5 rounded bg-surface-hover text-text border border-border flex items-center gap-1"
                          >
                            <span>{dom}</span>
                            <a
                              href={`http://${dom}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-text-muted hover:text-accent"
                              title="Mở trong trình duyệt"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </span>
                        ))}
                      </div>

                      {/* Details */}
                      <div className="mt-3 text-xs font-mono flex flex-col gap-1 text-text-muted">
                        {site.proxyPassPort && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-accent">Proxy:</span>
                            <span className="text-text font-semibold">
                              {site.proxyPassHost || 'http://127.0.0.1'}:{site.proxyPassPort}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-hover border border-border">
                            {site.configPath}
                          </span>
                          {site.isSslEnabled && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> SSL HTTPS
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-border flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {site.domainNames[0] && (
                          <button
                            type="button"
                            onClick={() => {
                              setSslDomain(site.domainNames[0]);
                              setActiveTab('domains');
                              setIsIssueSslModalOpen(true);
                            }}
                            className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[11px] font-medium border border-emerald-500/20 transition-colors cursor-pointer"
                            title="Cấp SSL Let's Encrypt cho domain này"
                          >
                            Cấp SSL
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-text-muted">
                        <button
                          type="button"
                          onClick={() => handleDeleteNginxSite(site)}
                          className="p-1 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                          title="Xóa vhost"
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

      {/* ========================================================================= */}
      {/* TAB 4: DOMAINS & CERTBOT SSL */}
      {/* ========================================================================= */}
      {activeTab === 'domains' && (
        <div className="flex-1 overflow-hidden flex flex-col gap-5">
          {/* Sub-section 1: Domain DNS Health Check */}
          <div className="border border-border rounded-xl bg-surface p-4 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-text flex items-center gap-2">
                  <Globe className="w-4 h-4 text-accent" />
                  <span>Quản Lý Tên Miền & Kiểm Tra Bản Ghi DNS A-Record</span>
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Xác minh xem tên miền của bạn đã trỏ chính xác về IP máy chủ ({profile.host}) chưa trước khi chạy Certbot.
                </p>
              </div>

              <button
                type="button"
                onClick={loadDomainsCheck}
                disabled={isLoadingDomains}
                className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover text-text text-xs font-medium flex items-center gap-1.5 border border-border transition-colors cursor-pointer self-start"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDomains ? 'animate-spin text-accent' : ''}`} />
                <span>Kiểm Tra Lại Tất Cả DNS</span>
              </button>
            </div>

            {/* Add Domain Input Bar */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newDomainInput}
                onChange={(e) => setNewDomainInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddDomain();
                }}
                placeholder="Nhập tên miền (VD: api.example.com, app.example.com)..."
                className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-xs text-text font-mono focus:outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={handleAddDomain}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Tên Miền</span>
              </button>
            </div>

            {/* Domains Table */}
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-text-muted text-[11px] bg-surface-hover/50">
                    <th className="py-2.5 px-3 font-medium">Tên Miền</th>
                    <th className="py-2.5 px-3 font-medium">IP DNS Trỏ Về</th>
                    <th className="py-2.5 px-3 font-medium">IP Máy Chủ</th>
                    <th className="py-2.5 px-3 font-medium">Trạng Thái Bản Ghi</th>
                    <th className="py-2.5 px-3 font-medium text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {domainsList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-text-muted">
                        Chưa theo dõi tên miền nào. Hãy nhập tên miền ở trên để kiểm tra kết nối DNS.
                      </td>
                    </tr>
                  ) : (
                    domainsList.map((d, idx) => (
                      <tr key={idx} className="hover:bg-surface-hover/50 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-text">
                          <div className="flex items-center gap-2">
                            <span>{d.domain}</span>
                            <a
                              href={`https://${d.domain}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-text-muted hover:text-accent"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-text-muted">{d.resolvedIp || 'Không phân giải được'}</td>
                        <td className="py-2.5 px-3 text-text-muted">{profile.host}</td>
                        <td className="py-2.5 px-3">
                          {d.isPointingToThisServer ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Đã trỏ chuẩn xác</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1 w-fit">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Chưa trỏ về server</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {d.isPointingToThisServer && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSslDomain(d.domain);
                                  setIsIssueSslModalOpen(true);
                                }}
                                className="px-2 py-1 rounded bg-accent-bg hover:bg-accent-bg-hover text-accent-light text-[11px] font-medium border border-accent-border cursor-pointer transition-colors"
                              >
                                Cấp SSL Ngay
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteDomain(d.domain)}
                              className="p-1 hover:text-rose-400 hover:bg-rose-500/10 rounded cursor-pointer transition-colors"
                              title="Gỡ theo dõi tên miền"
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

          {/* Sub-section 2: Certbot SSL Certificates */}
          <div className="border border-border rounded-xl bg-surface p-4 flex-1 flex flex-col gap-4 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-text flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Chứng Chỉ SSL Let's Encrypt (Certbot)</span>
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Tự động xin và cài đặt HTTPS miễn phí vào Nginx cho tên miền chỉ bằng 1 nút bấm.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {certbotInstalled === false && (
                  <button
                    type="button"
                    onClick={handleInstallCertbot}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Cài Đặt Certbot Ngay</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRenewAllCertificates}
                  className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover text-text text-xs font-medium border border-border transition-colors cursor-pointer"
                  title="Kiểm tra và gia hạn các chứng chỉ sắp hết hạn"
                >
                  Gia Hạn Tất Cả (certbot renew)
                </button>
                <button
                  type="button"
                  onClick={() => setIsIssueSslModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>+ Cấp SSL Mới</span>
                </button>
              </div>
            </div>

            {/* Certificates Table */}
            <div className="border border-border rounded-lg overflow-y-auto flex-1">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-text-muted text-[11px] bg-surface-hover/50 sticky top-0">
                    <th className="py-2.5 px-3 font-medium">Tên Miền / Tên Chứng Chỉ</th>
                    <th className="py-2.5 px-3 font-medium">Ngày Hết Hạn</th>
                    <th className="py-2.5 px-3 font-medium">Thời Gian Còn Lại</th>
                    <th className="py-2.5 px-3 font-medium">Đường Dẫn Chứng Chỉ</th>
                    <th className="py-2.5 px-3 font-medium text-right">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {certificates.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-text-muted">
                        {isLoadingCertbot
                          ? 'Đang kiểm tra chứng chỉ SSL trên máy chủ...'
                          : 'Chưa có chứng chỉ SSL Let\'s Encrypt nào trên máy chủ này'}
                      </td>
                    </tr>
                  ) : (
                    certificates.map((cert, idx) => (
                      <tr key={idx} className="hover:bg-surface-hover/50 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-text">{cert.domainName}</td>
                        <td className="py-2.5 px-3 text-text-muted">{cert.expiryDate || 'N/A'}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              cert.daysRemaining > 20
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : cert.daysRemaining > 0
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {cert.daysRemaining > 0 ? `Còn ${cert.daysRemaining} ngày` : 'Đã hết hạn'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-text-muted truncate max-w-xs">{cert.certificatePath}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                            Hợp Lệ
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: GIT SERVER DEPLOYMENTS */}
      {/* ========================================================================= */}
      {activeTab === 'git' && (
        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-text flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-accent" />
                <span>Quản Lý Dự Án Git Triển Khai Trên Máy Chủ (Server Deployments)</span>
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Theo dõi các mã nguồn repo đã clone vào server, kéo commit mới nhất và tự động chạy lệnh build/restart.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={refreshAllGitDeployments}
                className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover text-text text-xs font-medium flex items-center gap-1.5 border border-border transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Kiểm Tra Trạng Thái Git</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCloneModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Clone Repository Mới</span>
              </button>
            </div>
          </div>

          {/* Git Deployments List */}
          <div className="flex-1 overflow-y-auto">
            {gitDeployments.length === 0 ? (
              <div className="py-20 text-center text-text-muted flex flex-col items-center justify-center">
                <GitBranch className="w-12 h-12 text-border mb-3 stroke-1" />
                <p className="text-sm font-medium text-text">Chưa có Repository nào được theo dõi</p>
                <p className="text-xs text-text-muted mt-1">
                  Bấm "+ Clone Repository Mới" để kéo mã nguồn từ GitHub/GitLab vào server
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gitDeployments.map((repo, idx) => (
                  <div
                    key={idx}
                    className="bg-surface border border-border rounded-xl p-4 flex flex-col justify-between gap-4 transition-all"
                  >
                    <div>
                      {/* Title & Branch */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <GitBranch className="w-4 h-4 text-accent flex-shrink-0" />
                          <span className="font-bold text-sm text-text font-mono truncate" title={repo.repoUrl}>
                            {repo.name || repo.repoUrl.split('/').pop()?.replace('.git', '') || repo.repoUrl}
                          </span>
                        </div>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-hover text-accent border border-border">
                          {repo.branch}
                        </span>
                      </div>

                      {/* Directory Path */}
                      <div className="mt-2 text-xs font-mono text-text-muted flex items-center gap-1.5">
                        <span>Đường dẫn:</span>
                        <span className="text-text font-semibold">{repo.targetPath}</span>
                      </div>

                      {/* Last Commit Info */}
                      <div className="mt-3 p-3 bg-surface-hover/50 rounded-lg border border-border/60 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
                          <span className="text-accent font-bold">
                            {repo.lastCommitHash ? repo.lastCommitHash.slice(0, 7) : 'Chưa có thông tin'}
                          </span>
                          <span>{repo.lastPulledAt ? new Date(repo.lastPulledAt).toLocaleTimeString() : ''}</span>
                        </div>
                        <p className="text-xs text-text font-medium line-clamp-2">
                          {repo.lastCommitMessage || 'Chưa kiểm tra được commit mới nhất'}
                        </p>
                      </div>

                      {/* Post deploy command if any */}
                      {repo.postDeployCommand && (
                        <div className="mt-2 text-[11px] font-mono text-text-muted truncate">
                          <span className="text-amber-400 font-semibold">Post-deploy:</span>{' '}
                          <code>{repo.postDeployCommand}</code>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handlePullRepo(repo)}
                          disabled={pullingRepoDir === repo.targetPath}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${
                              pullingRepoDir === repo.targetPath ? 'animate-spin' : ''
                            }`}
                          />
                          <span>Kéo Mới Nhất (git pull)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenSftp(profile, repo.targetPath)}
                          className="px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-hover text-text text-xs font-medium border border-border transition-colors cursor-pointer"
                          title="Mở thư mục này trong SFTP File Explorer"
                        >
                          Mở SFTP
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteGitDeployment(repo.targetPath)}
                        className="p-1.5 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                        title="Gỡ khỏi danh sách quản lý"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: SNIPPETS & SYSADMIN QUICK RUNNER */}
      {/* ========================================================================= */}
      {activeTab === 'snippets' && (
        <div className="flex-1 overflow-hidden flex flex-col gap-5">
          {/* Preset Buttons Grid */}
          <div className="border border-border rounded-xl bg-surface p-4 flex flex-col gap-3">
            <h3 className="text-xs font-bold text-text flex items-center gap-2">
              <Sliders className="w-4 h-4 text-accent" />
              <span>Cài Đặt & Tiện Ích Sysadmin Nhanh (1-Click Presets)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {sysadminPresets.map((ps, idx) => (
                <div
                  key={idx}
                  className="bg-surface-hover/50 border border-border rounded-lg p-3 flex flex-col justify-between gap-3 hover:border-accent/40 transition-colors"
                >
                  <div>
                    <div className="font-bold text-xs text-text">{ps.title}</div>
                    <div className="text-[11px] text-text-muted mt-0.5">{ps.desc}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExecuteCommand(ps.cmd)}
                    disabled={isExecutingCommand}
                    className="w-full py-1.5 rounded bg-accent-bg hover:bg-accent-bg-hover text-accent-light text-xs font-semibold border border-accent-border transition-colors cursor-pointer text-center"
                  >
                    Chạy Ngay
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Command Runner */}
          <div className="border border-border rounded-xl bg-surface p-4 flex flex-col gap-3">
            <h3 className="text-xs font-bold text-text flex items-center gap-2">
              <Terminal className="w-4 h-4 text-accent" />
              <span>Trình Chạy Lệnh Trực Tiếp (Remote Command Runner)</span>
            </h3>

            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center bg-surface border border-border rounded-lg px-3 py-2 gap-2 focus-within:border-accent">
                <span className="text-accent font-mono text-xs select-none">$</span>
                <input
                  type="text"
                  value={customCommand}
                  onChange={(e) => setCustomCommand(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleExecuteCommand();
                  }}
                  placeholder="Nhập lệnh shell để thực thi (VD: uname -a, docker ps, free -m)..."
                  className="flex-1 bg-transparent text-xs text-text font-mono focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer select-none px-2">
                <input
                  type="checkbox"
                  checked={useSudo}
                  onChange={(e) => setUseSudo(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-0"
                />
                <span>sudo</span>
              </label>

              <button
                type="button"
                onClick={() => handleExecuteCommand()}
                disabled={isExecutingCommand || !customCommand.trim()}
                className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Chạy</span>
              </button>
            </div>

            {/* Save snippet helper */}
            {customCommand.trim() && (
              <div className="flex items-center gap-2 text-xs pt-1">
                <span className="text-text-muted">Lưu lệnh này để dùng lại:</span>
                <input
                  type="text"
                  value={newSnippetTitle}
                  onChange={(e) => setNewSnippetTitle(e.target.value)}
                  placeholder="Đặt tiêu đề cho snippet..."
                  className="bg-surface border border-border rounded px-2 py-1 text-xs text-text focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveSnippet}
                  className="px-2.5 py-1 rounded bg-surface hover:bg-surface-hover text-text text-xs border border-border cursor-pointer transition-colors"
                >
                  Lưu Snippet
                </button>
              </div>
            )}
          </div>

          {/* Command Execution Console / Output History */}
          <div className="border border-border rounded-xl bg-surface overflow-hidden flex-1 flex flex-col">
            <div className="px-4 py-2 bg-surface-hover/50 border-b border-border flex items-center justify-between">
              <span className="text-xs font-bold text-text">Nhật Ký Kết Quả Thực Thi (Console Output)</span>
              {commandHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCommandHistory([])}
                  className="text-xs text-text-muted hover:text-text cursor-pointer"
                >
                  Xóa Lịch Sử
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1 p-4 font-mono text-xs flex flex-col gap-4">
              {commandHistory.length === 0 ? (
                <div className="text-text-muted text-center py-10">
                  Chưa chạy lệnh nào trong phiên này. Hãy chọn preset hoặc gõ lệnh ở trên.
                </div>
              ) : (
                commandHistory.map((item, idx) => (
                  <div key={idx} className="bg-surface-hover/40 border border-border/60 rounded-lg p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[11px] text-text-muted border-b border-border/40 pb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-accent font-bold">$ {item.cmd}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] ${
                            item.result.exitCode === 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          exit: {item.result.exitCode}
                        </span>
                      </div>
                      <span>{item.time} ({item.result.executionTimeMs}ms)</span>
                    </div>
                    <pre className="text-text whitespace-pre-wrap select-text text-[11px] max-h-60 overflow-y-auto">
                      {item.result.output || '(Lệnh hoàn tất không có output)'}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT NGINX SITE */}
      {/* ========================================================================= */}
      {isNginxModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl max-w-2xl w-full p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-bold text-text flex items-center gap-2">
                <Globe className="w-4 h-4 text-accent" />
                <span>Thêm Cấu Hình Nginx Virtual Host Mới</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsNginxModalOpen(false)}
                className="p-1 text-text-muted hover:text-text cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Template Selector */}
            <div className="flex items-center gap-2 border-b border-border/50 pb-3">
              {[
                { id: 'reverse_proxy', label: 'Reverse Proxy (Node/Python/Go/Docker)' },
                { id: 'static', label: 'Web Tĩnh (HTML / React / Vue)' },
                { id: 'custom', label: 'Tùy Biến Tự Do' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setNginxModalMode(m.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    nginxModalMode === m.id
                      ? 'bg-accent text-white font-semibold'
                      : 'bg-surface-hover text-text-muted hover:text-text'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Fields */}
            <div className="flex flex-col gap-3 font-mono text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-text-muted text-[11px]">Tên tệp cấu hình (Filename):</label>
                <input
                  type="text"
                  value={nginxSiteName}
                  onChange={(e) => setNginxSiteName(e.target.value)}
                  placeholder="my-app.conf"
                  className="bg-surface border border-border rounded-lg px-3 py-1.5 text-text focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-text-muted text-[11px]">Tên miền (ServerName, cách nhau dấu phẩy hoặc khoảng trắng):</label>
                <input
                  type="text"
                  value={nginxDomains}
                  onChange={(e) => setNginxDomains(e.target.value)}
                  placeholder="api.example.com, www.example.com"
                  className="bg-surface border border-border rounded-lg px-3 py-1.5 text-text focus:outline-none focus:border-accent"
                />
              </div>

              {nginxModalMode === 'reverse_proxy' && (
                <div className="flex flex-col gap-1">
                  <label className="text-text-muted text-[11px]">Cổng ứng dụng nội bộ (Proxy Port):</label>
                  <input
                    type="number"
                    value={nginxProxyPort}
                    onChange={(e) => setNginxProxyPort(e.target.value)}
                    placeholder="3000"
                    className="bg-surface border border-border rounded-lg px-3 py-1.5 text-text focus:outline-none focus:border-accent"
                  />
                  <span className="text-[10px] text-text-muted">
                    Nginx sẽ chuyển tiếp request tới http://127.0.0.1:{nginxProxyPort || '3000'}
                  </span>
                </div>
              )}

              {nginxModalMode === 'static' && (
                <div className="flex flex-col gap-1">
                  <label className="text-text-muted text-[11px]">Thư mục chứa mã nguồn (Root Path):</label>
                  <input
                    type="text"
                    value={nginxRootPath}
                    onChange={(e) => setNginxRootPath(e.target.value)}
                    placeholder="/var/www/my-site/dist"
                    className="bg-surface border border-border rounded-lg px-3 py-1.5 text-text focus:outline-none focus:border-accent"
                  />
                </div>
              )}

              {/* Code Preview / Editor */}
              <div className="flex flex-col gap-1">
                <label className="text-text-muted text-[11px]">Cấu hình Nginx được tạo:</label>
                {nginxModalMode === 'custom' ? (
                  <textarea
                    rows={8}
                    value={nginxCustomConfig}
                    onChange={(e) => setNginxCustomConfig(e.target.value)}
                    className="w-full bg-surface-hover/80 border border-border rounded-lg p-3 text-[11px] text-text focus:outline-none focus:border-accent font-mono"
                  />
                ) : (
                  <pre className="bg-surface-hover/80 border border-border rounded-lg p-3 text-[11px] text-text-muted overflow-x-auto max-h-48">
                    {getGeneratedNginxConfig()}
                  </pre>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsNginxModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-text cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveNginxSite}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs cursor-pointer transition-colors shadow-sm"
              >
                Lưu & Kích Hoạt VHost
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ISSUE CERTBOT SSL */}
      {/* ========================================================================= */}
      {isIssueSslModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-bold text-text flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Cấp Chứng Chỉ SSL Let's Encrypt (Certbot)</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsIssueSslModalOpen(false)}
                className="p-1 text-text-muted hover:text-text cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-text-muted font-medium">Tên miền (Domain):</label>
                <input
                  type="text"
                  value={sslDomain}
                  onChange={(e) => setSslDomain(e.target.value)}
                  placeholder="api.example.com"
                  className="bg-surface border border-border rounded-lg px-3 py-2 text-text font-mono focus:outline-none focus:border-accent"
                />
                <span className="text-[10px] text-text-muted">
                  Đảm bảo DNS A-Record của tên miền đã trỏ về IP {profile.host}.
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-text-muted font-medium">Email quản trị viên nhận thông báo hết hạn:</label>
                <input
                  type="email"
                  value={sslEmail}
                  onChange={(e) => setSslEmail(e.target.value)}
                  placeholder={`admin@${sslDomain || 'example.com'}`}
                  className="bg-surface border border-border rounded-lg px-3 py-2 text-text font-mono focus:outline-none focus:border-accent"
                />
              </div>

              <div className="p-3 bg-surface-hover/60 rounded-lg border border-border text-[11px] text-text-muted">
                Lệnh Certbot sẽ tự động cấu hình lại Nginx, thêm port 443 HTTPS và kích hoạt tự động gia hạn (auto-renew).
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsIssueSslModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-text cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleIssueCertbotSsl}
                disabled={isIssuingSsl || !sslDomain.trim()}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs cursor-pointer transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {isIssuingSsl && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isIssuingSsl ? 'Đang Cấp SSL...' : 'Cấp Chứng Chỉ SSL'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CLONE GIT REPOSITORY */}
      {/* ========================================================================= */}
      {isCloneModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-bold text-text flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-accent" />
                <span>Clone Git Repository Vào Server</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsCloneModalOpen(false)}
                className="p-1 text-text-muted hover:text-text cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 font-mono text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-text-muted text-[11px]">Git Repository URL (HTTPS hoặc SSH):</label>
                <input
                  type="text"
                  value={cloneRepoUrl}
                  onChange={(e) => setCloneRepoUrl(e.target.value)}
                  placeholder="https://github.com/org/my-project.git"
                  className="bg-surface border border-border rounded-lg px-3 py-1.5 text-text focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-text-muted text-[11px]">Thư mục đích trên máy chủ (Target Directory):</label>
                <input
                  type="text"
                  value={cloneTargetDir}
                  onChange={(e) => setCloneTargetDir(e.target.value)}
                  placeholder="/var/www/my-project"
                  className="bg-surface border border-border rounded-lg px-3 py-1.5 text-text focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-text-muted text-[11px]">Nhánh git (Branch):</label>
                <input
                  type="text"
                  value={cloneBranch}
                  onChange={(e) => setCloneBranch(e.target.value)}
                  placeholder="main"
                  className="bg-surface border border-border rounded-lg px-3 py-1.5 text-text focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-text-muted text-[11px]">Lệnh tự động chạy sau khi pull (Post-Deploy Script):</label>
                <input
                  type="text"
                  value={clonePostDeploy}
                  onChange={(e) => setClonePostDeploy(e.target.value)}
                  placeholder="npm install && npm run build && pm2 restart all"
                  className="bg-surface border border-border rounded-lg px-3 py-1.5 text-text focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsCloneModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-text cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCloneRepo}
                disabled={isCloning || !cloneRepoUrl.trim()}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs cursor-pointer transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {isCloning && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isCloning ? 'Đang Clone...' : 'Bắt Đầu Clone'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE SYSTEMD SERVICE */}
      {/* ========================================================================= */}
      {isSystemdModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-bold text-text flex items-center gap-2">
                <Layers className="w-4 h-4 text-accent" />
                <span>Tạo Dịch Vụ Systemd Mới</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsSystemdModalOpen(false)}
                className="p-1 text-text-muted hover:text-text cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 font-mono text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-text-muted text-[11px]">Tên Service (VD: my-api):</label>
                <input
                  type="text"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  placeholder="my-backend-service"
                  className="bg-surface border border-border rounded-lg px-3 py-1.5 text-text focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-text-muted text-[11px]">Mô tả (Description):</label>
                <input
                  type="text"
                  value={newServiceDesc}
                  onChange={(e) => setNewServiceDesc(e.target.value)}
                  placeholder="Node.js Production Server"
                  className="bg-surface border border-border rounded-lg px-3 py-1.5 text-text focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-text-muted text-[11px]">Lệnh khởi chạy (ExecStart):</label>
                <input
                  type="text"
                  value={newServiceExec}
                  onChange={(e) => setNewServiceExec(e.target.value)}
                  placeholder="/usr/bin/node /var/www/app/server.js"
                  className="bg-surface border border-border rounded-lg px-3 py-1.5 text-text focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-text-muted text-[11px]">Thư mục làm việc (WorkingDirectory):</label>
                <input
                  type="text"
                  value={newServiceDir}
                  onChange={(e) => setNewServiceDir(e.target.value)}
                  placeholder="/var/www/app"
                  className="bg-surface border border-border rounded-lg px-3 py-1.5 text-text focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-text-muted text-[11px]">Người dùng chạy (User):</label>
                <input
                  type="text"
                  value={newServiceUser}
                  onChange={(e) => setNewServiceUser(e.target.value)}
                  placeholder="root"
                  className="bg-surface border border-border rounded-lg px-3 py-1.5 text-text focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsSystemdModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-text cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCreateSystemdService}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs cursor-pointer transition-colors shadow-sm"
              >
                Tạo & Kích Hoạt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW LOGS (PROCESS OR NGINX) */}
      {/* ========================================================================= */}
      {(processLogsModal.open || nginxLogModal.open) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl max-w-3xl w-full p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-bold text-text flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent" />
                <span>
                  {processLogsModal.open
                    ? `Nhật Ký Dịch Vụ: ${processLogsModal.name}`
                    : `Nginx Log: ${nginxLogModal.type}`}
                </span>
              </h2>
              <button
                type="button"
                onClick={() => {
                  setProcessLogsModal({ open: false, name: '', logs: '' });
                  setNginxLogModal({ open: false, type: 'error', content: '' });
                }}
                className="p-1 text-text-muted hover:text-text cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <pre className="flex-1 bg-surface-hover/80 border border-border rounded-lg p-4 font-mono text-[11px] text-text overflow-y-auto whitespace-pre-wrap select-text max-h-[60vh]">
              {processLogsModal.open ? processLogsModal.logs : nginxLogModal.content}
            </pre>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setProcessLogsModal({ open: false, name: '', logs: '' });
                  setNginxLogModal({ open: false, type: 'error', content: '' });
                }}
                className="px-4 py-1.5 rounded-lg bg-surface hover:bg-surface-hover text-text text-xs border border-border cursor-pointer transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
