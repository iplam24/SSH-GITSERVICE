import React, { useState, useEffect, useMemo } from 'react';
import {
  GitBranch,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  Plus,
  Minus,
  Check,
  RotateCcw,
  Layers,
  FileCode,
  Split,
  FolderGit2,
  AlertCircle,
  Clock,
  Send,
  Cloud,
  Tag,
  Archive,
  History,
  GitCommit,
  GitMerge,
  GitPullRequest,
  ExternalLink,
  Copy,
  Trash2,
  Edit3,
  Search,
  Shield,
  UploadCloud,
  DownloadCloud,
  CornerDownRight,
  Sparkles,
  ChevronRight,
  X,
  Zap,
  Server,
  FileText,
  CheckCheck,
  Box,
  Cpu,
  Activity,
  CheckCircle2,
  Lock,
  Globe,
  GitFork,
  Star,
  Folder,
  FolderOpen,
  Terminal,
  WrapText,
  Eye,
  Filter,
} from 'lucide-react';
import {
  ProjectItem,
  GitRepoStatus,
  GitFileStatus,
  GitDiffResult,
  GitBranchItem,
  GitCommitItem,
  GitAccount,
  GitRemoteItem,
  GitTagItem,
  GitStashItem,
  GitCommitDetailResult,
  RemoteRepoItem,
  GitRateLimitInfo,
  SshProfile,
  GithubActionSetupRequest,
  GithubActionSetupResult,
  RepoTechInspectionResult,
  InspectRepoRequest,
  GitIgnoreInfo,
} from '../types';
import { api } from '../services/api';
import { useConfirm } from '../context/ConfirmContext';

type GitTab = 'changes' | 'history' | 'branches' | 'tags' | 'cloud';

interface GitPageProps {
  projects: ProjectItem[];
  gitAccounts?: GitAccount[];
  sshProfiles?: SshProfile[];
  activeRepoPath: string;
  onSelectRepoPath: (path: string) => void;
  onRefreshProjects?: () => void;
  onOpenTerminal?: (path: string) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const GitPage: React.FC<GitPageProps> = ({
  projects,
  gitAccounts: propGitAccounts,
  sshProfiles = [],
  activeRepoPath,
  onSelectRepoPath,
  onRefreshProjects,
  onOpenTerminal,
  onShowToast,
}) => {
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<GitTab>('changes');
  const [repoStatus, setRepoStatus] = useState<GitRepoStatus | null>(null);
  const [branches, setBranches] = useState<GitBranchItem[]>([]);
  const [commits, setCommits] = useState<GitCommitItem[]>([]);
  const [remotes, setRemotes] = useState<GitRemoteItem[]>([]);
  const [tags, setTags] = useState<GitTagItem[]>([]);
  const [stashes, setStashes] = useState<GitStashItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Changes Tab states
  const [commitSubject, setCommitSubject] = useState('');
  const [commitBody, setCommitBody] = useState('');
  const [selectedFile, setSelectedFile] = useState<GitFileStatus | null>(null);
  const [diffResult, setDiffResult] = useState<GitDiffResult | null>(null);
  const [diffMode, setDiffMode] = useState<'unified' | 'split'>('unified');
  const [isWordWrap, setIsWordWrap] = useState(false);
  const [viewFullFile, setViewFullFile] = useState(false);
  const [fileFilter, setFileFilter] = useState('');
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [isGeneratingAiCommit, setIsGeneratingAiCommit] = useState(false);

  // History Tab states
  const [historySearch, setHistorySearch] = useState('');
  const [selectedCommitHash, setSelectedCommitHash] = useState<string | null>(null);
  const [commitDetails, setCommitDetails] = useState<GitCommitDetailResult | null>(null);
  const [loadingCommitDetails, setLoadingCommitDetails] = useState(false);

  // Modals
  const [isNewBranchModalOpen, setIsNewBranchModalOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [isRenameBranchModalOpen, setIsRenameBranchModalOpen] = useState(false);
  const [branchToRename, setBranchToRename] = useState<string>('');
  const [renamedBranchNewName, setRenamedBranchNewName] = useState('');
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeTargetBranch, setMergeTargetBranch] = useState('');
  const [isRebaseModalOpen, setIsRebaseModalOpen] = useState(false);
  const [rebaseTargetBranch, setRebaseTargetBranch] = useState('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetCommitRef, setResetCommitRef] = useState('HEAD~1');
  const [resetMode, setResetMode] = useState<'soft' | 'mixed' | 'hard'>('mixed');

  // Remotes Modals
  const [isAddRemoteModalOpen, setIsAddRemoteModalOpen] = useState(false);
  const [newRemoteName, setNewRemoteName] = useState('upstream');
  const [newRemoteUrl, setNewRemoteUrl] = useState('');

  // Tags Modals
  const [isCreateTagModalOpen, setIsCreateTagModalOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagMessage, setNewTagMessage] = useState('');

  // Stash Modal
  const [isStashModalOpen, setIsStashModalOpen] = useState(false);
  const [stashMessage, setStashMessage] = useState('');

  // Cloud Tab states
  const [accounts, setAccounts] = useState<GitAccount[]>(propGitAccounts || []);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [remoteRepos, setRemoteRepos] = useState<RemoteRepoItem[]>([]);
  const [cloudSearch, setCloudSearch] = useState('');
  const [loadingCloudRepos, setLoadingCloudRepos] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<GitRateLimitInfo | null>(null);

  // Cloud Modals
  const [isCreateCloudRepoModalOpen, setIsCreateCloudRepoModalOpen] = useState(false);
  const [createCloudRepoName, setCreateCloudRepoName] = useState('');
  const [createCloudRepoDesc, setCreateCloudRepoDesc] = useState('');
  const [createCloudRepoPrivate, setCreateCloudRepoPrivate] = useState(true);
  const [createCloudRepoReadme, setCreateCloudRepoReadme] = useState(true);

  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishRepoName, setPublishRepoName] = useState('');
  const [publishRemoteName, setPublishRemoteName] = useState('origin');
  const [publishIsPrivate, setPublishIsPrivate] = useState(true);

  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [cloneUrl, setCloneUrl] = useState('');
  const [cloneDestPath, setCloneDestPath] = useState('');
  const [cloneProjectName, setCloneProjectName] = useState('');

  // CI/CD GitHub Actions Setup states
  const [isCicdModalOpen, setIsCicdModalOpen] = useState(false);
  const [cicdTargetRepoPath, setCicdTargetRepoPath] = useState('');
  const [cicdTargetRepoName, setCicdTargetRepoName] = useState('');
  const [cicdRemoteFullName, setCicdRemoteFullName] = useState('');
  const [cicdAccountId, setCicdAccountId] = useState('');
  const [isInspectingRepo, setIsInspectingRepo] = useState(false);
  const [repoInspection, setRepoInspection] = useState<RepoTechInspectionResult | null>(null);

  const [cicdTechStack, setCicdTechStack] = useState('NodeJs');
  const [cicdDeployType, setCicdDeployType] = useState('SSH_RSYNC');
  const [cicdServerProfileId, setCicdServerProfileId] = useState('');
  const [cicdServerHost, setCicdServerHost] = useState('');
  const [cicdServerUser, setCicdServerUser] = useState('root');
  const [cicdServerPort, setCicdServerPort] = useState(22);
  const [cicdDeployDir, setCicdDeployDir] = useState('/var/www/my-app');
  const [cicdBranch, setCicdBranch] = useState('main');
  const [cicdPostScript, setCicdPostScript] = useState('');
  const [cicdAutoCommit, setCicdAutoCommit] = useState(true);
  const [cicdIncludeCaching, setCicdIncludeCaching] = useState(true);
  const [cicdIncludeHealthCheck, setCicdIncludeHealthCheck] = useState(true);
  const [cicdHealthCheckPort, setCicdHealthCheckPort] = useState(3000);
  const [cicdGenerateDockerfile, setCicdGenerateDockerfile] = useState(false);
  const [cicdGenerateDockerCompose, setCicdGenerateDockerCompose] = useState(false);
  const [cicdGeneratePm2Config, setCicdGeneratePm2Config] = useState(false);
  const [cicdGenerateSystemd, setCicdGenerateSystemd] = useState(false);
  const [isSettingUpCicd, setIsSettingUpCicd] = useState(false);
  const [cicdResult, setCicdResult] = useState<GithubActionSetupResult | null>(null);
  const [copiedSecretKey, setCopiedSecretKey] = useState<string | null>(null);
  const [isSyncingSecrets, setIsSyncingSecrets] = useState(false);
  const [secretsSyncMessage, setSecretsSyncMessage] = useState<string | null>(null);

  // Automated GitHub Release states
  const [isCreateReleaseModalOpen, setIsCreateReleaseModalOpen] = useState(false);
  const [releaseTagName, setReleaseTagName] = useState('v1.0.0');
  const [releaseTitle, setReleaseTitle] = useState('DevDock v1.0.0 — Modern Developer Command Center');
  const [releaseBody, setReleaseBody] = useState('');
  const [releaseTargetBranch, setReleaseTargetBranch] = useState('main');
  const [releaseDraft, setReleaseDraft] = useState(false);
  const [releasePrerelease, setReleasePrerelease] = useState(false);
  const [isCreatingRelease, setIsCreatingRelease] = useState(false);
  const [releaseResultUrl, setReleaseResultUrl] = useState<string | null>(null);

  // Local Git Init states
  const [isInitRepoModalOpen, setIsInitRepoModalOpen] = useState(false);
  const [initRepoPath, setInitRepoPath] = useState('');
  const [isInitializingRepo, setIsInitializingRepo] = useState(false);

  // Push to Remote states
  const [isPushToRemoteModalOpen, setIsPushToRemoteModalOpen] = useState(false);
  const [pushTargetRepo, setPushTargetRepo] = useState<RemoteRepoItem | null>(null);
  const [pushLocalPath, setPushLocalPath] = useState('');
  const [pushBranch, setPushBranch] = useState('main');
  const [pushRemoteName, setPushRemoteName] = useState('origin');
  const [pushAutoCommit, setPushAutoCommit] = useState(true);
  const [pushCommitMessage, setPushCommitMessage] = useState('Initial commit to GitHub');
  const [pushForce, setPushForce] = useState(false);
  const [isPushingToRemote, setIsPushingToRemote] = useState(false);
  const [pushToRemoteResult, setPushToRemoteResult] = useState<{ success: boolean; message: string; output: string } | null>(null);
  const [copiedPushCommands, setCopiedPushCommands] = useState(false);

  // Open Local Folder Modal states
  const [isOpenFolderModalOpen, setIsOpenFolderModalOpen] = useState(false);
  const [customFolderPath, setCustomFolderPath] = useState('');
  const [isOpeningFolder, setIsOpeningFolder] = useState(false);

  // GitIgnore Management states
  const [isGitIgnoreModalOpen, setIsGitIgnoreModalOpen] = useState(false);
  const [gitIgnoreInfo, setGitIgnoreInfo] = useState<GitIgnoreInfo | null>(null);
  const [gitIgnoreContent, setGitIgnoreContent] = useState('');
  const [isLoadingGitIgnore, setIsLoadingGitIgnore] = useState(false);
  const [isSavingGitIgnore, setIsSavingGitIgnore] = useState(false);
  const [gitIgnoreTemplates, setGitIgnoreTemplates] = useState<Record<string, string>>({});
  const [gitIgnoreAutoCommit, setGitIgnoreAutoCommit] = useState(false);
  const [isAutoStageModalOpen, setIsAutoStageModalOpen] = useState(false);

  // Filter git projects
  const gitProjects = projects.filter((p) => p.isGitRepository);

  useEffect(() => {
    if (!activeRepoPath && gitProjects.length > 0) {
      onSelectRepoPath(gitProjects[0].path);
    }
  }, [gitProjects, activeRepoPath, onSelectRepoPath]);

  // Load Accounts if not provided
  useEffect(() => {
    if (propGitAccounts && propGitAccounts.length > 0) {
      setAccounts(propGitAccounts);
      if (!selectedAccountId) {
        const def = propGitAccounts.find((a) => a.isDefault) || propGitAccounts[0];
        setSelectedAccountId(def.id);
      }
    } else {
      api.getGitAccounts().then((accs) => {
        setAccounts(accs);
        if (accs.length > 0 && !selectedAccountId) {
          const def = accs.find((a) => a.isDefault) || accs[0];
          setSelectedAccountId(def.id);
        }
      }).catch(() => {});
    }
  }, [propGitAccounts]);

  const loadRepoData = async (path: string) => {
    if (!path) return;
    setLoading(true);
    try {
      const [status, branchList, commitList, remoteList, tagList, stashList] = await Promise.all([
        api.getGitStatus(path),
        api.getBranches(path).catch(() => []),
        api.getCommits(path, 35).catch(() => []),
        api.getRemotes(path).catch(() => []),
        api.getTags(path).catch(() => []),
        api.getStashes(path).catch(() => []),
      ]);
      setRepoStatus(status);
      setBranches(branchList);
      setCommits(commitList);
      setRemotes(remoteList);
      setTags(tagList);
      setStashes(stashList);

      // Auto-select first changed file if none selected or not present
      const allFiles = status.stagedFiles.concat(status.unstagedFiles, status.untrackedFiles);
      if (!selectedFile || !allFiles.some((f) => f.path === selectedFile.path)) {
        const first = status.unstagedFiles[0] || status.stagedFiles[0] || status.untrackedFiles[0];
        if (first) {
          loadFileDiff(path, first);
        } else {
          setSelectedFile(null);
          setDiffResult(null);
        }
      } else {
        loadFileDiff(path, selectedFile);
      }
    } catch (err: any) {
      onShowToast(err.message || 'Không thể tải trạng thái Git', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeRepoPath) {
      loadRepoData(activeRepoPath);
      // Auto fill publish repo name from folder basename
      const parts = activeRepoPath.replace(/\\/g, '/').split('/');
      const last = parts[parts.length - 1] || 'my-project';
      setPublishRepoName(last);
    }
  }, [activeRepoPath]);

  const splitFilePath = (pathStr: string) => {
    const normalized = (pathStr || '').replace(/\\/g, '/');
    const lastSlash = normalized.lastIndexOf('/');
    if (lastSlash === -1) {
      return { fileName: normalized, dirPath: '' };
    }
    return {
      fileName: normalized.substring(lastSlash + 1),
      dirPath: normalized.substring(0, lastSlash + 1),
    };
  };

  const diffStats = useMemo(() => {
    let additions = 0;
    let deletions = 0;
    if (diffResult?.hunks) {
      for (const hunk of diffResult.hunks) {
        for (const line of hunk.lines) {
          if (line.type === 'Added') additions++;
          else if (line.type === 'Deleted') deletions++;
        }
      }
    }
    return { additions, deletions };
  }, [diffResult]);

  const loadFileDiff = async (repo: string, file: GitFileStatus, fullFileOverride?: boolean) => {
    setSelectedFile(file);
    setLoadingDiff(true);
    const isFull = fullFileOverride !== undefined ? fullFileOverride : viewFullFile;
    try {
      const diff = await api.getFileDiff(repo, file.path, file.isStaged, isFull ? 99999 : 3);
      setDiffResult(diff);
    } catch (err: any) {
      setDiffResult(null);
    } finally {
      setLoadingDiff(false);
    }
  };

  const handleToggleFullFile = () => {
    const nextVal = !viewFullFile;
    setViewFullFile(nextVal);
    if (activeRepoPath && selectedFile) {
      loadFileDiff(activeRepoPath, selectedFile, nextVal);
    }
  };

  const handleOpenFileInEditor = async (filePath: string) => {
    if (!activeRepoPath) return;
    try {
      const normRepo = activeRepoPath.replace(/\\/g, '/').replace(/\/$/, '');
      const normFile = filePath.replace(/\\/g, '/').replace(/^\//, '');
      const fullPath = normFile.startsWith(normRepo) ? normFile : `${normRepo}/${normFile}`;
      await api.openEditor(fullPath);
      onShowToast(`Đang mở ${splitFilePath(filePath).fileName} trong trình soạn thảo...`, 'info');
    } catch (err: any) {
      onShowToast(err.message || 'Không thể mở trình soạn thảo', 'error');
    }
  };

  const renderStatusBadge = (status: string) => {
    const s = (status || '').trim().toUpperCase();
    if (s.startsWith('M')) {
      return (
        <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0 select-none" title="Đã sửa đổi (Modified)">
          M
        </span>
      );
    }
    if (s.startsWith('A')) {
      return (
        <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0 select-none" title="Thêm mới (Added)">
          A
        </span>
      );
    }
    if (s.startsWith('D')) {
      return (
        <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0 select-none" title="Đã xóa (Deleted)">
          D
        </span>
      );
    }
    if (s.startsWith('U') || s.startsWith('?')) {
      return (
        <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-sky-500/15 text-sky-400 border border-sky-500/30 shrink-0 select-none" title="Chưa theo dõi (Untracked)">
          U
        </span>
      );
    }
    if (s.startsWith('R')) {
      return (
        <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-purple-500/15 text-purple-400 border border-purple-500/30 shrink-0 select-none" title="Đã đổi tên (Renamed)">
          R
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-slate-500/15 text-slate-400 border border-slate-500/30 shrink-0 select-none">
        {s[0] || '?'}
      </span>
    );
  };

  const handleStageFile = async (filePath: string) => {
    if (!activeRepoPath) return;
    try {
      await api.stageFile(activeRepoPath, filePath);
      await loadRepoData(activeRepoPath);
      onShowToast(`Đã Stage: ${filePath}`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Stage thất bại', 'error');
    }
  };

  const handleUnstageFile = async (filePath: string) => {
    if (!activeRepoPath) return;
    try {
      await api.unstageFile(activeRepoPath, filePath);
      await loadRepoData(activeRepoPath);
      onShowToast(`Đã Unstage: ${filePath}`, 'info');
    } catch (err: any) {
      onShowToast(err.message || 'Unstage thất bại', 'error');
    }
  };

  const handleStageAll = async () => {
    if (!activeRepoPath) return;
    try {
      await api.stageAll(activeRepoPath);
      await loadRepoData(activeRepoPath);
      onShowToast('Đã Stage tất cả thay đổi', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Stage all thất bại', 'error');
    }
  };

  const handleUnstageAll = async () => {
    if (!activeRepoPath) return;
    try {
      await api.unstageAll(activeRepoPath);
      await loadRepoData(activeRepoPath);
      onShowToast('Đã Unstage tất cả thay đổi', 'info');
    } catch (err: any) {
      onShowToast(err.message || 'Unstage all thất bại', 'error');
    }
  };

  const handleDiscardChanges = async (filePath: string) => {
    if (!activeRepoPath) return;
    const ok = await confirm({
      title: 'Hủy Bỏ Thay Đổi Tệp',
      message: `Hủy bỏ toàn bộ thay đổi trong '${filePath}'? Hành động này không thể hoàn tác.`,
      confirmText: 'Hủy Bỏ Thay Đổi',
      type: 'danger',
    });
    if (!ok) return;
    try {
      await api.discardChanges(activeRepoPath, filePath);
      await loadRepoData(activeRepoPath);
      onShowToast(`Đã hủy thay đổi trong ${filePath}`, 'info');
    } catch (err: any) {
      onShowToast(err.message || 'Hủy thay đổi thất bại', 'error');
    }
  };

  const handleConfirmAutoStageAndCommit = async () => {
    setIsAutoStageModalOpen(false);
    if (!activeRepoPath || !commitSubject.trim()) return;

    try {
      onShowToast('Đang tự động Stage tất cả các tệp thay đổi...', 'info');
      await api.stageAll(activeRepoPath);

      const fullMsg = commitBody.trim()
        ? `${commitSubject.trim()}\n\n${commitBody.trim()}`
        : commitSubject.trim();
      await api.commit(activeRepoPath, fullMsg);
      setCommitSubject('');
      setCommitBody('');
      await loadRepoData(activeRepoPath);
      onShowToast('Đã tự động Stage và tạo commit thành công!', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Thao tác commit thất bại', 'error');
    }
  };

  const handleCommit = async () => {
    if (!activeRepoPath || !commitSubject.trim()) {
      onShowToast('Vui lòng nhập tiêu đề commit', 'error');
      return;
    }

    const stagedCount = repoStatus?.stagedFiles?.length ?? 0;
    const unstagedCount = (repoStatus?.unstagedFiles?.length ?? 0) + (repoStatus?.untrackedFiles?.length ?? 0);

    if (stagedCount === 0) {
      if (unstagedCount === 0) {
        onShowToast('Không có thay đổi nào trong kho mã nguồn để commit', 'info');
        return;
      }

      // Mở modal in-app sang xịn mịn, không dùng window.confirm trình duyệt
      setIsAutoStageModalOpen(true);
      return;
    }

    try {
      const fullMsg = commitBody.trim()
        ? `${commitSubject.trim()}\n\n${commitBody.trim()}`
        : commitSubject.trim();
      await api.commit(activeRepoPath, fullMsg);
      setCommitSubject('');
      setCommitBody('');
      await loadRepoData(activeRepoPath);
      onShowToast('Đã tạo commit thành công!', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Commit thất bại', 'error');
    }
  };

  const handleAiGenerateCommit = async () => {
    if (!activeRepoPath) return;
    setIsGeneratingAiCommit(true);
    try {
      const res = await api.generateAiCommit({ repoPath: activeRepoPath });
      if (res.success && res.message) {
        const parts = res.message.trim().split('\n\n');
        setCommitSubject(parts[0].trim());
        if (parts.length > 1) {
          setCommitBody(parts.slice(1).join('\n\n').trim());
        }
        onShowToast('Đã tạo commit message thông minh bằng AI!', 'success');
      } else {
        onShowToast(res.errorMessage || 'AI không thể tạo commit message', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi gọi AI', 'error');
    } finally {
      setIsGeneratingAiCommit(false);
    }
  };

  const handlePush = async () => {
    if (!activeRepoPath) return;
    setLoading(true);
    try {
      const res = await api.push(activeRepoPath);
      await loadRepoData(activeRepoPath);
      onShowToast(res.output || 'Đã Push lên remote thành công', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Push thất bại', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePull = async () => {
    if (!activeRepoPath) return;
    setLoading(true);
    try {
      const res = await api.pull(activeRepoPath);
      await loadRepoData(activeRepoPath);
      onShowToast(res.output || 'Đã Pull từ remote thành công', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Pull thất bại', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFetch = async () => {
    if (!activeRepoPath) return;
    setLoading(true);
    try {
      await api.fetch(activeRepoPath);
      await loadRepoData(activeRepoPath);
      onShowToast('Đã đồng bộ fetch toàn bộ remotes', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Fetch thất bại', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckoutBranch = async (bName: string) => {
    if (!activeRepoPath) return;
    try {
      await api.checkoutBranch(activeRepoPath, bName);
      await loadRepoData(activeRepoPath);
      onShowToast(`Đã chuyển sang nhánh '${bName}'`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Chuyển nhánh thất bại', 'error');
    }
  };

  const handleCreateBranch = async () => {
    if (!activeRepoPath || !newBranchName.trim()) return;
    try {
      await api.createBranch(activeRepoPath, newBranchName.trim(), true);
      setIsNewBranchModalOpen(false);
      setNewBranchName('');
      await loadRepoData(activeRepoPath);
      onShowToast(`Đã tạo & chuyển sang nhánh '${newBranchName}'`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Tạo nhánh thất bại', 'error');
    }
  };

  const handleDeleteBranch = async (bName: string) => {
    const ok = await confirm({
      title: 'Xóa Nhánh Git',
      message: `Bạn có chắc chắn muốn xóa nhánh '${bName}'?`,
      confirmText: 'Xóa Nhánh',
      type: 'danger',
    });
    if (!ok) return;
    try {
      await api.deleteBranch(activeRepoPath, bName, true);
      await loadRepoData(activeRepoPath);
      onShowToast(`Đã xóa nhánh '${bName}'`, 'info');
    } catch (err: any) {
      onShowToast(err.message || 'Xóa nhánh thất bại', 'error');
    }
  };

  const handleRenameBranch = async () => {
    if (!branchToRename || !renamedBranchNewName.trim()) return;
    try {
      await api.renameBranch(activeRepoPath, branchToRename, renamedBranchNewName.trim());
      setIsRenameBranchModalOpen(false);
      setBranchToRename('');
      setRenamedBranchNewName('');
      await loadRepoData(activeRepoPath);
      onShowToast('Đổi tên nhánh thành công', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Đổi tên nhánh thất bại', 'error');
    }
  };

  const handleMerge = async () => {
    if (!mergeTargetBranch) return;
    try {
      const res = await api.merge(activeRepoPath, mergeTargetBranch);
      setIsMergeModalOpen(false);
      await loadRepoData(activeRepoPath);
      onShowToast(res.output || `Đã Merge nhánh '${mergeTargetBranch}' thành công`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Merge thất bại', 'error');
    }
  };

  const handleRebase = async () => {
    if (!rebaseTargetBranch) return;
    try {
      const res = await api.rebase(activeRepoPath, rebaseTargetBranch);
      setIsRebaseModalOpen(false);
      await loadRepoData(activeRepoPath);
      onShowToast(res.output || `Đã Rebase trên nền '${rebaseTargetBranch}' thành công`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Rebase thất bại', 'error');
    }
  };

  const handleReset = async () => {
    try {
      const res = await api.reset(activeRepoPath, resetCommitRef, resetMode);
      setIsResetModalOpen(false);
      await loadRepoData(activeRepoPath);
      onShowToast(res.output || `Đã Reset (${resetMode}) về '${resetCommitRef}'`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Reset thất bại', 'error');
    }
  };

  const handleCherryPick = async (commitHash: string) => {
    try {
      const res = await api.cherryPick(activeRepoPath, commitHash);
      await loadRepoData(activeRepoPath);
      onShowToast(res.output || `Đã Cherry-pick commit ${commitHash.substring(0, 7)}`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Cherry-pick thất bại', 'error');
    }
  };

  const handleRevert = async (commitHash: string) => {
    try {
      const res = await api.revert(activeRepoPath, commitHash);
      await loadRepoData(activeRepoPath);
      onShowToast(res.output || `Đã Revert commit ${commitHash.substring(0, 7)}`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Revert thất bại', 'error');
    }
  };

  const handleInspectCommit = async (commitHash: string) => {
    setSelectedCommitHash(commitHash);
    setLoadingCommitDetails(true);
    try {
      const details = await api.getCommitDetails(activeRepoPath, commitHash);
      setCommitDetails(details);
    } catch (err: any) {
      onShowToast(err.message || 'Không thể lấy thông tin chi tiết commit', 'error');
    } finally {
      setLoadingCommitDetails(false);
    }
  };

  // Remotes
  const handleAddRemote = async () => {
    if (!newRemoteName.trim() || !newRemoteUrl.trim()) return;
    try {
      await api.addRemote(activeRepoPath, newRemoteName.trim(), newRemoteUrl.trim());
      setIsAddRemoteModalOpen(false);
      setNewRemoteName('upstream');
      setNewRemoteUrl('');
      await loadRepoData(activeRepoPath);
      onShowToast(`Đã thêm remote '${newRemoteName}'`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Thêm remote thất bại', 'error');
    }
  };

  const handleRemoveRemote = async (name: string) => {
    const ok = await confirm({
      title: 'Xóa Remote Git',
      message: `Bạn có chắc chắn muốn xóa remote '${name}'?`,
      confirmText: 'Xóa Remote',
      type: 'danger',
    });
    if (!ok) return;
    try {
      await api.removeRemote(activeRepoPath, name);
      await loadRepoData(activeRepoPath);
      onShowToast(`Đã xóa remote '${name}'`, 'info');
    } catch (err: any) {
      onShowToast(err.message || 'Xóa remote thất bại', 'error');
    }
  };

  // Tags
  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      await api.createTag(activeRepoPath, newTagName.trim(), newTagMessage || undefined);
      setIsCreateTagModalOpen(false);
      setNewTagName('');
      setNewTagMessage('');
      await loadRepoData(activeRepoPath);
      onShowToast(`Đã tạo tag '${newTagName}'`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Tạo tag thất bại', 'error');
    }
  };

  const handlePushTag = async (tagName: string) => {
    try {
      await api.pushTag(activeRepoPath, tagName);
      onShowToast(`Đã đẩy tag '${tagName}' lên remote`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Đẩy tag thất bại', 'error');
    }
  };

  const handleDeleteTag = async (tagName: string) => {
    const ok = await confirm({
      title: 'Xóa Git Tag',
      message: `Bạn có chắc chắn muốn xóa tag '${tagName}'?`,
      confirmText: 'Xóa Tag',
      type: 'danger',
    });
    if (!ok) return;
    try {
      await api.deleteTag(activeRepoPath, tagName);
      await loadRepoData(activeRepoPath);
      onShowToast(`Đã xóa tag '${tagName}'`, 'info');
    } catch (err: any) {
      onShowToast(err.message || 'Xóa tag thất bại', 'error');
    }
  };

  // Stashes
  const handleCreateStash = async () => {
    try {
      const res = await api.stash(activeRepoPath, stashMessage || undefined);
      setIsStashModalOpen(false);
      setStashMessage('');
      await loadRepoData(activeRepoPath);
      onShowToast(res.output || 'Đã lưu tạm thay đổi (Stash)', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Lưu tạm thất bại', 'error');
    }
  };

  const handleApplyStash = async (index: number) => {
    try {
      const res = await api.applyStash(activeRepoPath, index);
      await loadRepoData(activeRepoPath);
      onShowToast(res.output || `Đã áp dụng stash@{${index}}`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Áp dụng stash thất bại', 'error');
    }
  };

  const handleDropStash = async (index: number) => {
    const ok = await confirm({
      title: 'Xóa Git Stash',
      message: `Bạn có chắc chắn muốn xóa bỏ vĩnh viễn stash@{${index}}?`,
      confirmText: 'Xóa Vĩnh Viễn',
      type: 'danger',
    });
    if (!ok) return;
    try {
      const res = await api.dropStash(activeRepoPath, index);
      await loadRepoData(activeRepoPath);
      onShowToast(res.output || `Đã xóa stash@{${index}}`, 'info');
    } catch (err: any) {
      onShowToast(err.message || 'Xóa stash thất bại', 'error');
    }
  };

  const handlePopStash = async () => {
    try {
      const res = await api.stashPop(activeRepoPath);
      await loadRepoData(activeRepoPath);
      onShowToast(res.output || 'Đã lấy ra & xóa stash gần nhất', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Pop stash thất bại', 'error');
    }
  };

  // Cloud Repos
  const loadCloudRepos = async (accId: string, search?: string) => {
    if (!accId) return;
    setLoadingCloudRepos(true);
    try {
      const [repos, limit] = await Promise.all([
        api.listRemoteRepos(accId, search, 1, 40),
        api.getRateLimit(accId).catch(() => null),
      ]);
      setRemoteRepos(repos);
      if (limit) setRateLimitInfo(limit);
    } catch (err: any) {
      onShowToast(err.message || 'Không thể tải danh sách kho từ Git Provider', 'error');
    } finally {
      setLoadingCloudRepos(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'cloud' && selectedAccountId) {
      loadCloudRepos(selectedAccountId, cloudSearch);
    }
  }, [activeTab, selectedAccountId]);

  const handleCreateCloudRepo = async () => {
    if (!selectedAccountId || !createCloudRepoName.trim()) {
      onShowToast('Vui lòng nhập tên kho lưu trữ', 'error');
      return;
    }
    try {
      const created = await api.createRemoteRepo({
        accountId: selectedAccountId,
        name: createCloudRepoName.trim(),
        description: createCloudRepoDesc.trim() || undefined,
        isPrivate: createCloudRepoPrivate,
        autoInitReadme: createCloudRepoReadme,
      });
      setIsCreateCloudRepoModalOpen(false);
      setCreateCloudRepoName('');
      setCreateCloudRepoDesc('');
      await loadCloudRepos(selectedAccountId, cloudSearch);
      onShowToast(`Đã tạo kho '${created.name}' trên Cloud thành công!`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Tạo kho trên Cloud thất bại', 'error');
    }
  };

  const handlePublishLocalRepo = async () => {
    if (!activeRepoPath || !selectedAccountId || !publishRepoName.trim()) {
      onShowToast('Vui lòng kiểm tra lại thông tin xuất bản', 'error');
      return;
    }
    try {
      const res = await api.publishLocalRepo({
        repoPath: activeRepoPath,
        accountId: selectedAccountId,
        repoName: publishRepoName.trim(),
        remoteName: publishRemoteName.trim() || 'origin',
        isPrivate: publishIsPrivate,
      });
      setIsPublishModalOpen(false);
      await loadRepoData(activeRepoPath);
      onShowToast(res.message || 'Đã xuất bản kho lên Cloud thành công!', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Xuất bản thất bại', 'error');
    }
  };

  const handleCloneRepo = async () => {
    if (!cloneUrl.trim() || !cloneDestPath.trim()) {
      onShowToast('Vui lòng nhập URL và đường dẫn thư mục đích', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await api.cloneRepo({
        cloneUrl: cloneUrl.trim(),
        destinationPath: cloneDestPath.trim(),
        projectName: cloneProjectName.trim() || undefined,
        addToProjects: true,
      });
      setIsCloneModalOpen(false);
      setCloneUrl('');
      setCloneDestPath('');
      setCloneProjectName('');
      if (onRefreshProjects) onRefreshProjects();
      onShowToast(res.message || 'Đã clone kho thành công và thêm vào Dự án!', 'success');
      onSelectRepoPath(res.targetDirectory);
    } catch (err: any) {
      onShowToast(err.message || 'Clone kho thất bại', 'error');
    } finally {
      setLoading(false);
    }
  };

  // When an SSH Profile is selected for CI/CD, auto-fill credentials
  const handleSelectSshProfileForCicd = (profileId: string) => {
    setCicdServerProfileId(profileId);
    const found = sshProfiles.find((p) => p.id === profileId);
    if (found) {
      setCicdServerHost(found.host);
      setCicdServerUser(found.username);
      setCicdServerPort(found.port || 22);
    }
  };

  // Run automated repo tech inspection
  const runRepoInspection = async (path?: string, accountId?: string, remoteName?: string) => {
    let targetPath = path !== undefined ? path : cicdTargetRepoPath;
    const targetRemote = remoteName !== undefined ? remoteName : cicdRemoteFullName;
    const targetAcc = accountId !== undefined ? accountId : (cicdAccountId || selectedAccountId);

    // If targetPath is not set, only fallback to activeRepoPath if there is NO remote repo target
    if (!targetPath && !targetRemote) {
      targetPath = activeRepoPath;
    }

    setIsInspectingRepo(true);
    setRepoInspection(null);

    try {
      const res = await api.inspectRepoTech({
        repoPath: targetPath || '',
        accountId: targetAcc,
        remoteRepoFullName: targetRemote,
      });

      setRepoInspection(res);
      if (res && res.success) {
        if (res.techStack) setCicdTechStack(res.techStack);
        if (res.suggestedDeployType) setCicdDeployType(res.suggestedDeployType);
        if (res.appPort) setCicdHealthCheckPort(res.appPort);

        // Auto configure post-deploy script based on real inspection
        if (res.hasDockerCompose) {
          setCicdDeployType('SSH_DOCKER');
          setCicdPostScript('docker compose down --remove-orphans || true\ndocker compose pull || true\ndocker compose up -d --build');
        } else if (res.techStack === 'NodeJs') {
          setCicdPostScript(`${res.packageManager} install --production\npm2 reload all || pm2 restart all || ${res.packageManager} run start &`);
        } else if (res.techStack === 'DotNet') {
          setCicdPostScript('dotnet publish -c Release -o ./publish\nsudo systemctl restart kestrel-app || true');
        } else if (res.techStack === 'Python') {
          if (res.suggestedDeployType === 'SSH_PM2' || res.framework?.toLowerCase().includes('pm2') || res.startCommand?.includes('pm2')) {
            setCicdPostScript(`pip install -r requirements.txt || true\npm2 reload ecosystem.config.js || pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js`);
          } else {
            setCicdPostScript(`pip install -r requirements.txt || true\n${res.startCommand || 'uvicorn main:app --host 0.0.0.0 --port 8000 &'} || true`);
          }
        } else if (res.techStack === 'Go') {
          setCicdPostScript('go build -o app\n./app &');
        }

        // Auto-configure recommendations
        if (res.techStack === 'NodeJs') {
          setCicdGeneratePm2Config(true);
        } else if (res.techStack === 'DotNet') {
          setCicdGenerateSystemd(true);
        } else if (res.techStack === 'Python') {
          if (res.suggestedDeployType === 'SSH_PM2') {
            setCicdGeneratePm2Config(false);
          } else {
            setCicdGenerateSystemd(true);
          }
        }
      }
    } catch (err: any) {
      console.warn('Inspection failed:', err);
    } finally {
      setIsInspectingRepo(false);
    }
  };

  const openCicdModalForRepo = (repoPath?: string, repoName?: string, accountId?: string, remoteFullName?: string) => {
    let finalPath = repoPath !== undefined ? repoPath : '';
    const finalRemote = remoteFullName || '';
    const finalAcc = accountId || selectedAccountId;

    // If repoPath was not explicitly provided but remote is given, search for a matching local project
    if (!finalPath && finalRemote) {
      const simpleName = repoName || (finalRemote.includes('/') ? finalRemote.split('/').pop()! : finalRemote);
      const matchingProj = projects.find(
        (p) =>
          p.name.toLowerCase() === simpleName.toLowerCase() ||
          p.path.toLowerCase().replace(/\\/g, '/').endsWith(`/${simpleName.toLowerCase()}`)
      );
      if (matchingProj) {
        finalPath = matchingProj.path;
      } else if (activeRepoPath && activeRepoPath.toLowerCase().replace(/\\/g, '/').endsWith(`/${simpleName.toLowerCase()}`)) {
        finalPath = activeRepoPath;
      }
    } else if (!finalPath && !finalRemote) {
      finalPath = activeRepoPath;
    }

    const finalName = repoName || (finalPath ? (projects.find((p) => p.path === finalPath)?.name || finalPath) : (finalRemote || 'Dự Án'));

    setCicdTargetRepoPath(finalPath);
    setCicdTargetRepoName(finalName);
    setCicdAccountId(finalAcc);
    setCicdRemoteFullName(finalRemote);
    setCicdResult(null);
    setIsCicdModalOpen(true);

    runRepoInspection(finalPath, finalAcc, finalRemote);
  };

  // Handle setting up CI/CD
  const handleSetupCicd = async () => {
    const targetFolder = cicdTargetRepoPath || (!cicdRemoteFullName ? activeRepoPath : '');
    if (!targetFolder && !cicdRemoteFullName) {
      onShowToast('Vui lòng chọn hoặc nhập đường dẫn thư mục kho lưu trữ!', 'error');
      return;
    }
    if (!cicdServerHost.trim()) {
      onShowToast('Vui lòng nhập địa chỉ máy chủ Server Host hoặc chọn SSH Profile', 'error');
      return;
    }

    setIsSettingUpCicd(true);
    try {
      const res = await api.setupGithubAction({
        repoPath: targetFolder,
        accountId: cicdAccountId || selectedAccountId,
        remoteRepoFullName: cicdRemoteFullName,
        deployType: cicdDeployType,
        techStack: cicdTechStack,
        targetBranch: cicdBranch || 'main',
        serverHost: cicdServerHost.trim(),
        serverUser: cicdServerUser.trim() || 'root',
        serverPort: cicdServerPort || 22,
        deployDirectory: cicdDeployDir.trim() || '/var/www/app',
        postDeployScript: cicdPostScript.trim(),
        autoCommit: cicdAutoCommit,
        includeCaching: cicdIncludeCaching,
        includeHealthCheck: cicdIncludeHealthCheck,
        healthCheckPort: cicdHealthCheckPort,
        generateDockerfile: cicdGenerateDockerfile,
        generateDockerCompose: cicdGenerateDockerCompose,
        generatePm2Config: cicdGeneratePm2Config,
        generateSystemd: cicdGenerateSystemd,
      });

      if (res.success) {
        setCicdResult(res);
        onShowToast('Đã thiết lập GitHub Actions CI/CD thành công!', 'success');
        if (targetFolder === activeRepoPath) {
          loadRepoData(activeRepoPath);
        }
      } else {
        onShowToast(res.message || 'Thiết lập CI/CD thất bại', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi khi gọi API thiết lập CI/CD', 'error');
    } finally {
      setIsSettingUpCicd(false);
    }
  };

  const handleAutoSyncSecrets = async () => {
    const accId = cicdAccountId || selectedAccountId;
    let remote = cicdRemoteFullName;
    if (!remote && remotes.length > 0) {
      const origin = remotes.find((r) => r.name === 'origin') || remotes[0];
      const remoteUrl = origin?.fetchUrl || origin?.pushUrl || '';
      const m = remoteUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?/i);
      if (m) remote = `${m[1]}/${m[2]}`;
    }

    if (!accId) {
      onShowToast('Vui lòng chọn tài khoản GitHub trong phần cấu hình!', 'error');
      return;
    }
    if (!remote) {
      onShowToast('Không xác định được kho từ xa GitHub để đồng bộ Secrets!', 'error');
      return;
    }

    setIsSyncingSecrets(true);
    setSecretsSyncMessage(null);
    try {
      const secrets: Record<string, string> = {
        SSH_HOST: cicdServerHost.trim(),
        SSH_USER: cicdServerUser.trim(),
        SSH_KEY: cicdServerProfileId ? `ssh_profile:${cicdServerProfileId}` : '',
      };
      if (cicdServerPort && cicdServerPort !== 22) {
        secrets.SSH_PORT = String(cicdServerPort);
      }

      const res = await api.syncGithubSecrets({
        accountId: accId,
        remoteRepoFullName: remote,
        secrets,
      });

      if (res.success) {
        setSecretsSyncMessage(res.message);
        onShowToast(res.message, 'success');
      } else {
        onShowToast(res.message || 'Lỗi khi đồng bộ Secrets', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi khi đồng bộ Secrets lên GitHub', 'error');
    } finally {
      setIsSyncingSecrets(false);
    }
  };

  const handleGenerateReleaseNotes = () => {
    if (commits.length === 0) {
      setReleaseBody('### 🚀 Có gì mới trong phiên bản này:\n- Phát hành chính thức phiên bản DevDock');
      return;
    }
    const recentCommits = commits.slice(0, 10);
    const notes = [
      `### 🚀 DevDock ${releaseTagName} Updates`,
      '',
      '#### ✨ Những thay đổi và tính năng nổi bật:',
      ...recentCommits.map((c) => `- ${c.subject} (${c.hash.substring(0, 7)})`),
      '',
      '#### 📦 Tải về và cài đặt:',
      '- **setup-devdock.exe**: Bộ cài đặt tự động cho Windows.',
      '- **DevDock-Portable-win-x64.zip**: Bản chạy trực tiếp không cần cài đặt.',
    ].join('\n');
    setReleaseBody(notes);
    onShowToast('Đã tự động tạo ghi chú Release từ các commit gần nhất!', 'success');
  };

  const handleCreateRelease = async () => {
    if (!releaseTagName.trim()) {
      onShowToast('Vui lòng nhập tên tag phiên bản (ví dụ v1.0.0)', 'error');
      return;
    }

    setIsCreatingRelease(true);
    setReleaseResultUrl(null);
    try {
      const activeRemote = remotes.find((r) => r.name === 'origin') || remotes[0];
      let remoteFullName = cicdRemoteFullName;
      const remoteUrl = activeRemote?.fetchUrl || activeRemote?.pushUrl || '';
      if (!remoteFullName && remoteUrl) {
        const m = remoteUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?/i);
        if (m) remoteFullName = `${m[1]}/${m[2]}`;
      }

      const res = await api.createGithubRelease({
        accountId: selectedAccountId || cicdAccountId,
        repoPath: activeRepoPath,
        remoteRepoFullName: remoteFullName,
        tagName: releaseTagName.trim(),
        targetBranch: releaseTargetBranch || 'main',
        name: releaseTitle.trim() || releaseTagName.trim(),
        body: releaseBody.trim(),
        draft: releaseDraft,
        prerelease: releasePrerelease,
        generateReleaseNotes: true,
        triggerCiCdWorkflow: true,
      });

      if (res.success) {
        onShowToast(res.message, 'success');
        if (res.releaseUrl) {
          setReleaseResultUrl(res.releaseUrl);
        }
        await loadRepoData(activeRepoPath);
      } else {
        onShowToast(res.message || 'Lỗi khi tạo Release', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Thao tác tạo release thất bại', 'error');
    } finally {
      setIsCreatingRelease(false);
    }
  };

  // Handle local Git Init
  const handleInitLocalRepo = async () => {
    const target = initRepoPath.trim() || activeRepoPath;
    if (!target) {
      onShowToast('Vui lòng chọn đường dẫn thư mục cần khởi tạo Git', 'error');
      return;
    }

    setIsInitializingRepo(true);
    try {
      const res = await api.initRepo(target);
      if (res.success) {
        onShowToast('Khởi tạo kho Git cục bộ thành công!', 'success');
        setIsInitRepoModalOpen(false);
        onSelectRepoPath(target);
        if (onRefreshProjects) onRefreshProjects();
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi khởi tạo git init', 'error');
    } finally {
      setIsInitializingRepo(false);
    }
  };

  // Handle push to existing remote repository
  const handlePushToRemoteRepo = async () => {
    const targetFolder = pushLocalPath.trim() || activeRepoPath;
    if (!targetFolder) {
      onShowToast('Vui lòng nhập hoặc chọn thư mục mã nguồn trên máy tính!', 'error');
      return;
    }
    if (!selectedAccountId) {
      onShowToast('Vui lòng chọn tài khoản Git để xác thực!', 'error');
      return;
    }
    if (!pushTargetRepo) {
      onShowToast('Chưa chọn kho lưu trữ đích!', 'error');
      return;
    }

    setIsPushingToRemote(true);
    setPushToRemoteResult(null);

    try {
      const res = await api.pushToRemoteRepo({
        accountId: selectedAccountId,
        repoPath: targetFolder,
        cloneUrl: pushTargetRepo.cloneUrl,
        remoteName: pushRemoteName || 'origin',
        branch: pushBranch || 'main',
        autoCommitAll: pushAutoCommit,
        commitMessage: pushCommitMessage || 'Update from DevDock',
        forcePush: pushForce,
      });

      setPushToRemoteResult(res);
      if (res.success) {
        onShowToast(res.message || 'Đã đẩy mã nguồn lên GitHub thành công!', 'success');
        onSelectRepoPath(targetFolder);
        if (onRefreshProjects) onRefreshProjects();
        loadRepoData(targetFolder);
      } else {
        onShowToast(res.message || 'Đẩy mã nguồn thất bại!', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi khi gọi API đẩy mã nguồn', 'error');
    } finally {
      setIsPushingToRemote(false);
    }
  };

  // Handle open custom local folder
  const handleOpenCustomFolder = async () => {
    const folder = customFolderPath.trim();
    if (!folder) {
      onShowToast('Vui lòng nhập đường dẫn thư mục', 'error');
      return;
    }

    setIsOpeningFolder(true);
    try {
      const detected = await api.detectProject(folder).catch(() => null);
      if (detected) {
        await api.saveProject(detected).catch(() => {});
        if (onRefreshProjects) onRefreshProjects();
      }
      onSelectRepoPath(folder);
      setIsOpenFolderModalOpen(false);
      onShowToast(`Đã chọn thư mục: ${folder}`, 'success');
      loadRepoData(folder);
    } catch (err: any) {
      onSelectRepoPath(folder);
      setIsOpenFolderModalOpen(false);
      loadRepoData(folder);
    } finally {
      setIsOpeningFolder(false);
    }
  };

  const handleBrowseFolderForCustom = async () => {
    try {
      const res = await api.browseFolder(customFolderPath);
      if (res && res.folder) {
        setCustomFolderPath(res.folder);
      }
    } catch (err: any) {
      onShowToast(err.message || 'Không thể mở hộp thoại chọn thư mục', 'error');
    }
  };

  const handleOpenInExplorer = async (path: string) => {
    if (!path) {
      onShowToast('Chưa có đường dẫn thư mục', 'error');
      return;
    }
    try {
      await api.openExplorer(path);
      onShowToast('Đang mở thư mục trong Windows Explorer', 'info');
    } catch (err: any) {
      onShowToast(err.message || 'Không thể mở thư mục trong Explorer', 'error');
    }
  };

  const handleBrowseFolderForInit = async () => {
    try {
      const res = await api.browseFolder(initRepoPath || activeRepoPath);
      if (res && res.folder) {
        setInitRepoPath(res.folder);
      }
    } catch (err: any) {
      onShowToast(err.message || 'Không thể mở hộp thoại chọn thư mục', 'error');
    }
  };

  const handleBrowseFolderForClone = async () => {
    try {
      const res = await api.browseFolder(cloneDestPath);
      if (res && res.folder) {
        setCloneDestPath(res.folder);
      }
    } catch (err: any) {
      onShowToast(err.message || 'Không thể mở hộp thoại chọn thư mục', 'error');
    }
  };

  const handleBrowseFolderForPush = async () => {
    try {
      const res = await api.browseFolder(pushLocalPath || activeRepoPath);
      if (res && res.folder) {
        setPushLocalPath(res.folder);
      }
    } catch (err: any) {
      onShowToast(err.message || 'Không thể mở hộp thoại chọn thư mục', 'error');
    }
  };

  const openGitIgnoreModal = async (path?: string) => {
    const target = path || activeRepoPath;
    if (!target) {
      onShowToast('Vui lòng chọn hoặc mở một thư mục Git trước!', 'error');
      return;
    }
    setIsGitIgnoreModalOpen(true);
    setIsLoadingGitIgnore(true);
    try {
      const [info, templates] = await Promise.all([
        api.getGitIgnore(target),
        api.getGitIgnoreTemplates().catch(() => ({} as Record<string, string>)),
      ]);
      setGitIgnoreInfo(info);
      setGitIgnoreContent(info.content || '');
      setGitIgnoreTemplates(templates);
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi khi tải tệp .gitignore', 'error');
    } finally {
      setIsLoadingGitIgnore(false);
    }
  };

  const handleSaveGitIgnore = async () => {
    const target = activeRepoPath;
    if (!target) return;
    setIsSavingGitIgnore(true);
    try {
      const res = await api.saveGitIgnore({
        repoPath: target,
        content: gitIgnoreContent,
        autoCommit: gitIgnoreAutoCommit,
        commitMessage: 'Update .gitignore via DevDock',
      });
      if (res.success) {
        onShowToast('Đã lưu tệp .gitignore thành công!', 'success');
        setIsGitIgnoreModalOpen(false);
        loadRepoData(target);
      } else {
        onShowToast('Không thể lưu tệp .gitignore', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi khi lưu .gitignore', 'error');
    } finally {
      setIsSavingGitIgnore(false);
    }
  };

  const handleQuickIgnoreFile = async (filePattern: string) => {
    const target = activeRepoPath;
    if (!target) return;
    try {
      const res = await api.addToGitIgnore({
        repoPath: target,
        pattern: filePattern,
        autoCommit: false,
      });
      if (res.success) {
        onShowToast(`Đã thêm "${filePattern}" vào .gitignore!`, 'success');
        loadRepoData(target);
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi khi thêm vào .gitignore', 'error');
    }
  };

  const applyGitIgnoreTemplate = (templateKey: string) => {
    const tpl = gitIgnoreTemplates[templateKey];
    if (!tpl) return;
    if (!gitIgnoreContent.trim()) {
      setGitIgnoreContent(tpl);
    } else {
      setGitIgnoreContent((prev) => prev.trimEnd() + '\n\n' + tpl);
    }
    onShowToast(`Đã áp dụng mẫu ${templateKey} vào trình soạn thảo!`, 'info');
  };

  const getPushShellCommands = () => {
    const p = pushLocalPath.trim() || 'D:\\du-an-cua-ban';
    const b = pushBranch.trim() || 'main';
    const r = pushTargetRepo?.cloneUrl || 'https://github.com/iplam24/repo.git';
    const msg = pushCommitMessage.trim() || 'Initial commit';
    const forceFlag = pushForce ? ' --force' : '';
    return `cd "${p}"\ngit init\ngit add .\ngit commit -m "${msg}"\ngit branch -M ${b}\ngit remote add origin ${r}\ngit push -u origin ${b}${forceFlag}`;
  };

  const filteredCommits = commits.filter((c) => {
    if (!historySearch.trim()) return true;
    const q = historySearch.toLowerCase();
    return (
      c.hash.toLowerCase().includes(q) ||
      c.subject.toLowerCase().includes(q) ||
      c.authorName.toLowerCase().includes(q)
    );
  });

  const totalChanges = repoStatus
    ? repoStatus.stagedFiles.length +
      repoStatus.unstagedFiles.length +
      repoStatus.untrackedFiles.length
    : 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0c0d12] w-full h-full min-h-0">
      {/* Top Bar: Repo selector, Current Branch, Quick Push/Pull/Fetch */}
      <div className="h-11 border-b border-[#1a1e2a] bg-[#0e1017] px-3 flex items-center justify-between flex-shrink-0 gap-2 overflow-x-auto select-none no-scrollbar">
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <FolderGit2 className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={activeRepoPath}
            onChange={(e) => onSelectRepoPath(e.target.value)}
            className="bg-[#12151f] hover:bg-[#171b26] text-slate-200 text-xs rounded-md px-2.5 py-1.5 border border-[#1e2332] focus:outline-none focus:border-accent font-medium cursor-pointer max-w-[140px] sm:max-w-[200px] xl:max-w-xs truncate shrink-0"
          >
            {gitProjects.map((p) => (
              <option key={p.id} value={p.path}>
                {p.name} ({p.path})
              </option>
            ))}
            {gitProjects.length === 0 && (
              <option value="">Chưa có dự án Git nào trong DevDock</option>
            )}
          </select>

          <button
            type="button"
            onClick={() => {
              setCustomFolderPath(activeRepoPath || 'D:\\ToolTienich');
              setIsOpenFolderModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-md bg-[#12151f] hover:bg-[#171b26] text-slate-300 border border-[#1e2332] text-xs font-medium cursor-pointer transition-colors whitespace-nowrap shrink-0"
            title="Mở thư mục mã nguồn bất kỳ trên máy tính"
          >
            <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Mở thư mục</span>
          </button>

          {activeRepoPath && (
            <button
              type="button"
              onClick={() => handleOpenInExplorer(activeRepoPath)}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-md bg-[#12151f] hover:bg-[#171b26] text-slate-300 border border-[#1e2332] text-xs font-medium cursor-pointer transition-colors whitespace-nowrap shrink-0"
              title={`Mở "${activeRepoPath}" trong Windows File Explorer`}
            >
              <Folder className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden md:inline">Explorer</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => openGitIgnoreModal()}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-md bg-[#12151f] hover:bg-[#171b26] text-amber-300 border border-amber-500/30 text-xs font-medium cursor-pointer transition-colors whitespace-nowrap shrink-0"
            title="Quản lý & tạo tệp .gitignore cho dự án"
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">.gitignore</span>
          </button>

          {activeRepoPath && onOpenTerminal && (
            <button
              type="button"
              onClick={() => onOpenTerminal(activeRepoPath)}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-md bg-[#12151f] hover:bg-[#171b26] text-emerald-300 border border-emerald-500/30 text-xs font-medium cursor-pointer transition-colors whitespace-nowrap shrink-0"
              title={`Mở Terminal tại thư mục "${activeRepoPath}"`}
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Terminal</span>
            </button>
          )}

          {repoStatus && (
            <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-slate-300 whitespace-nowrap shrink-0">
              <GitBranch className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-200">{repoStatus.currentBranch}</span>
              {repoStatus.aheadCount > 0 && (
                <span className="text-emerald-400 text-[10px] ml-0.5 font-bold">↑{repoStatus.aheadCount}</span>
              )}
              {repoStatus.behindCount > 0 && (
                <span className="text-amber-400 text-[10px] ml-0.5 font-bold">↓{repoStatus.behindCount}</span>
              )}
            </div>
          )}
        </div>

        {/* Global Git Actions & Cloud Hub */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Remote / Cloud actions */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('cloud');
              if (selectedAccountId) {
                loadCloudRepos(selectedAccountId, cloudSearch);
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#12151f] hover:bg-[#171b26] text-slate-300 border border-[#1e2332] text-xs font-medium cursor-pointer transition-colors whitespace-nowrap shrink-0"
            title="Duyệt và tìm nạp danh sách Repository từ GitHub/GitLab"
          >
            <Cloud className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden lg:inline">Kho Cloud</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateCloudRepoModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#12151f] hover:bg-[#171b26] text-slate-300 border border-[#1e2332] text-xs font-medium cursor-pointer transition-colors whitespace-nowrap shrink-0"
            title="Tạo kho lưu trữ mới trên Cloud GitHub/GitLab"
          >
            <Plus className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden lg:inline">Tạo Repo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              openCicdModalForRepo(activeRepoPath, undefined, undefined, '');
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#12151f] hover:bg-[#171b26] text-slate-300 border border-[#1e2332] text-xs font-medium cursor-pointer transition-colors whitespace-nowrap shrink-0"
            title="Tự động thiết lập GitHub Actions CI/CD triển khai ứng dụng lên máy chủ Server"
          >
            <Zap className="w-3.5 h-3.5 text-accent" />
            <span>CI/CD</span>
          </button>

          <div className="h-4 w-px bg-[#1e2332] mx-0.5 shrink-0" />

          {/* Unified Git Sync Controls Segmented Group */}
          <div className="inline-flex items-center rounded-md border border-[#1e2332] bg-[#12151f] overflow-hidden shrink-0 shadow-sm">
            <button
              type="button"
              onClick={handleFetch}
              disabled={loading || !activeRepoPath}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 hover:bg-[#171b26] text-slate-300 text-xs font-medium cursor-pointer transition-colors disabled:opacity-50 border-r border-[#1e2332] whitespace-nowrap"
              title="Đồng bộ cập nhật mới từ Remote (Fetch)"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Fetch</span>
            </button>

            <button
              type="button"
              onClick={handlePull}
              disabled={loading || !activeRepoPath}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 hover:bg-[#171b26] text-slate-300 text-xs font-medium cursor-pointer transition-colors disabled:opacity-50 border-r border-[#1e2332] whitespace-nowrap"
              title="Kéo thay đổi mới về nhánh hiện tại (Pull)"
            >
              <ArrowDown className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Pull</span>
            </button>

            <button
              type="button"
              onClick={handlePush}
              disabled={loading || !activeRepoPath}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50 whitespace-nowrap"
              title="Đẩy các commit lên remote (Push)"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>Push</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Navigation Bar */}
      <div className="h-9 border-b border-[#1a1e2a] bg-[#0a0c10] px-3 flex items-center justify-between flex-shrink-0 gap-2 overflow-x-auto select-none no-scrollbar">
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('changes')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'changes'
                ? 'bg-white/[0.08] text-slate-100 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Thay đổi</span>
            {totalChanges > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-accent/20 text-accent-light text-[10px] font-mono font-bold">
                {totalChanges}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-white/[0.08] text-slate-100 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Lịch sử Commit</span>
            {commits.length > 0 && (
              <span className="text-slate-500 text-[10px] font-mono">({commits.length})</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('branches')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'branches'
                ? 'bg-white/[0.08] text-slate-100 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Nhánh & Remotes</span>
            <span className="text-slate-500 text-[10px] font-mono">({branches.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tags')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'tags'
                ? 'bg-white/[0.08] text-slate-100 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Tags & Lưu tạm</span>
            <span className="text-slate-500 text-[10px] font-mono">
              ({tags.length}T / {stashes.length}S)
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cloud')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'cloud'
                ? 'bg-white/[0.08] text-slate-100 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Kho Remote (Cloud)</span>
            <span className="px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-400 text-[10px] font-mono">
              {remoteRepos.length > 0 ? remoteRepos.length : 'API'}
            </span>
          </button>
        </div>

        {/* Quick Stash & Git Init shortcut */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setInitRepoPath(activeRepoPath);
              setIsInitRepoModalOpen(true);
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-slate-400 hover:text-slate-200 text-xs font-mono hover:bg-white/[0.04] transition-colors cursor-pointer"
            title="Khởi tạo kho Git cục bộ tại thư mục này (git init)"
          >
            <span>+ git init</span>
          </button>

          <button
            type="button"
            onClick={() => openGitIgnoreModal()}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-amber-400 hover:text-amber-300 text-xs font-mono hover:bg-amber-500/10 border border-amber-500/20 transition-colors cursor-pointer"
            title="Quản lý & tạo tệp .gitignore cho dự án"
          >
            <Shield className="w-3 h-3 text-amber-400" />
            <span>.gitignore</span>
          </button>

          <button
            type="button"
            onClick={() => setIsStashModalOpen(true)}
            disabled={!activeRepoPath}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#111827] hover:bg-[#1E293B] text-slate-400 hover:text-slate-200 text-xs border border-[#1E293B] cursor-pointer"
            title="Lưu tạm các thay đổi chưa commit vào stack"
          >
            <Archive className="w-3 h-3 text-amber-400" />
            <span>Lưu tạm (Stash)</span>
          </button>

          {stashes.length > 0 && (
            <button
              type="button"
              onClick={handlePopStash}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#111827] hover:bg-[#1E293B] text-amber-400 text-xs border border-[#1E293B] cursor-pointer"
              title="Khôi phục & xóa stash mới nhất"
            >
              <span>Pop Stash ({stashes.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEWPORT BASED ON ACTIVE TAB */}
      <div className="flex-1 overflow-hidden flex min-h-0">
        {/* ==================== TAB 1: CHANGES ==================== */}
        {activeTab === 'changes' && (
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Left Column: Changed Files List & Commit Box */}
            <div className="w-72 md:w-80 xl:w-[360px] border-r border-[#1a1e2a] bg-[#0c0e14] flex flex-col justify-between flex-shrink-0 overflow-hidden min-h-0">
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 min-h-0 pr-1">
                {/* Search Filter for Changed Files */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={fileFilter}
                    onChange={(e) => setFileFilter(e.target.value)}
                    placeholder="Lọc tệp thay đổi..."
                    className="w-full bg-[#12151f] border border-[#1e2332] rounded-md pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accent font-sans"
                  />
                  {fileFilter && (
                    <button
                      type="button"
                      onClick={() => setFileFilter('')}
                      className="absolute right-2 top-2 text-slate-500 hover:text-slate-300 cursor-pointer"
                      title="Xóa bộ lọc"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Staged files */}
                <div>
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 text-xs font-semibold text-slate-300 border-b border-[#1a1e2a]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Đã Stage ({repoStatus?.stagedFiles.length || 0})</span>
                    </div>
                    {repoStatus && repoStatus.stagedFiles.length > 0 && (
                      <button
                        type="button"
                        onClick={handleUnstageAll}
                        className="text-[10px] text-slate-400 hover:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                        <span>Bỏ tất cả</span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    {(repoStatus?.stagedFiles || [])
                      .filter(
                        (f) =>
                          !fileFilter.trim() ||
                          f.path.toLowerCase().includes(fileFilter.toLowerCase().trim())
                      )
                      .map((file) => {
                        const { fileName, dirPath } = splitFilePath(file.path);
                        const isSelected = selectedFile?.path === file.path;
                        return (
                          <div
                            key={file.path}
                            onClick={() => loadFileDiff(activeRepoPath, file)}
                            className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer group transition-all duration-150 border ${
                              isSelected
                                ? 'bg-emerald-500/10 border-emerald-500/40 text-slate-100 font-medium shadow-sm'
                                : 'border-transparent text-slate-300 hover:bg-[#161a26] hover:border-[#22283a]'
                            }`}
                            title={file.path}
                          >
                            <div className="flex flex-col min-w-0 flex-1 pr-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <FileCode
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    isSelected ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'
                                  }`}
                                />
                                <span
                                  className={`text-xs font-semibold truncate ${
                                    isSelected ? 'text-emerald-300' : 'text-slate-200 group-hover:text-slate-100'
                                  }`}
                                >
                                  {fileName}
                                </span>
                              </div>
                              <span
                                className="text-[10px] text-slate-500 font-mono truncate pl-5 mt-0.5"
                                title={file.path}
                              >
                                {dirPath || './'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {renderStatusBadge(file.status)}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnstageFile(file.path);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                title="Bỏ khỏi stage"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                  {repoStatus?.stagedFiles.length === 0 && (
                    <div className="text-[11px] text-slate-500 py-2 italic px-1">Chưa có tệp nào được stage</div>
                  )}
                </div>

                {/* Unstaged files */}
                <div>
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 text-xs font-semibold text-slate-300 border-b border-[#1a1e2a]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>Chưa Stage ({repoStatus?.unstagedFiles.length || 0})</span>
                    </div>
                    {repoStatus && repoStatus.unstagedFiles.length > 0 && (
                      <button
                        type="button"
                        onClick={handleStageAll}
                        className="text-[10px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Stage tất cả</span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    {(repoStatus?.unstagedFiles || [])
                      .filter(
                        (f) =>
                          !fileFilter.trim() ||
                          f.path.toLowerCase().includes(fileFilter.toLowerCase().trim())
                      )
                      .map((file) => {
                        const { fileName, dirPath } = splitFilePath(file.path);
                        const isSelected = selectedFile?.path === file.path;
                        return (
                          <div
                            key={file.path}
                            onClick={() => loadFileDiff(activeRepoPath, file)}
                            className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer group transition-all duration-150 border ${
                              isSelected
                                ? 'bg-emerald-500/10 border-emerald-500/40 text-slate-100 font-medium shadow-sm'
                                : 'border-transparent text-slate-300 hover:bg-[#161a26] hover:border-[#22283a]'
                            }`}
                            title={file.path}
                          >
                            <div className="flex flex-col min-w-0 flex-1 pr-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <FileCode
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    isSelected ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'
                                  }`}
                                />
                                <span
                                  className={`text-xs font-semibold truncate ${
                                    isSelected ? 'text-emerald-300' : 'text-slate-200 group-hover:text-slate-100'
                                  }`}
                                >
                                  {fileName}
                                </span>
                              </div>
                              <span
                                className="text-[10px] text-slate-500 font-mono truncate pl-5 mt-0.5"
                                title={file.path}
                              >
                                {dirPath || './'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {renderStatusBadge(file.status)}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStageFile(file.path);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                title="Đưa vào stage"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDiscardChanges(file.path);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                title="Hủy thay đổi trong tệp này"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickIgnoreFile(file.path);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                title={`Bỏ qua tệp "${file.path}" (Thêm vào .gitignore)`}
                              >
                                <Shield className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                  {repoStatus?.unstagedFiles.length === 0 && (
                    <div className="text-[11px] text-slate-500 py-2 italic px-1">Không có thay đổi chưa stage</div>
                  )}
                </div>

                {/* Untracked files */}
                {repoStatus && repoStatus.untrackedFiles.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 text-xs font-semibold text-slate-300 border-b border-[#1a1e2a]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        <span>Tệp mới chưa theo dõi ({repoStatus.untrackedFiles.length})</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {repoStatus.untrackedFiles
                        .filter(
                          (f) =>
                            !fileFilter.trim() ||
                            f.path.toLowerCase().includes(fileFilter.toLowerCase().trim())
                        )
                        .map((file) => {
                          const { fileName, dirPath } = splitFilePath(file.path);
                          const isSelected = selectedFile?.path === file.path;
                          return (
                            <div
                              key={file.path}
                              onClick={() => loadFileDiff(activeRepoPath, file)}
                              className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer group transition-all duration-150 border ${
                                isSelected
                                  ? 'bg-emerald-500/10 border-emerald-500/40 text-slate-100 font-medium shadow-sm'
                                  : 'border-transparent text-slate-300 hover:bg-[#161a26] hover:border-[#22283a]'
                              }`}
                              title={file.path}
                            >
                              <div className="flex flex-col min-w-0 flex-1 pr-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <FileCode
                                    className={`w-3.5 h-3.5 shrink-0 ${
                                      isSelected ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'
                                    }`}
                                  />
                                  <span
                                    className={`text-xs font-semibold truncate ${
                                      isSelected ? 'text-emerald-300' : 'text-slate-200 group-hover:text-slate-100'
                                    }`}
                                  >
                                    {fileName}
                                  </span>
                                </div>
                                <span
                                  className="text-[10px] text-slate-500 font-mono truncate pl-5 mt-0.5"
                                  title={file.path}
                                >
                                  {dirPath || './'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {renderStatusBadge('U')}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStageFile(file.path);
                                  }}
                                  className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                  title="Đưa vào stage"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickIgnoreFile(file.path);
                                  }}
                                  className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                  title={`Bỏ qua tệp "${file.path}" (Thêm vào .gitignore)`}
                                >
                                  <Shield className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* Commit Input Box */}
              <div className="p-3 border-t border-[#1a1e2a] bg-[#0e1017] flex flex-col gap-2 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-300">Thông điệp Commit:</span>
                  <button
                    type="button"
                    onClick={handleAiGenerateCommit}
                    disabled={isGeneratingAiCommit || !activeRepoPath}
                    className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-[#12151f] hover:bg-[#181c28] border border-[#1e2332] text-slate-300 font-medium transition-colors cursor-pointer disabled:opacity-50"
                    title="Phân tích thay đổi git và sinh thông điệp commit tự động bằng AI"
                  >
                    <Sparkles className={`w-3 h-3 ${isGeneratingAiCommit ? 'animate-spin text-accent' : 'text-accent'}`} />
                    <span>{isGeneratingAiCommit ? 'Đang viết...' : 'AI Viết Commit'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={commitSubject}
                  onChange={(e) => setCommitSubject(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.ctrlKey && e.key === 'Enter') handleCommit();
                  }}
                  placeholder="Tiêu đề commit..."
                  className="w-full bg-[#12151f] border border-[#1e2332] rounded-md px-2.5 py-1.5 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-accent"
                />
                <textarea
                  value={commitBody}
                  onChange={(e) => setCommitBody(e.target.value)}
                  rows={2}
                  placeholder="Mô tả chi tiết (tùy chọn)..."
                  className="w-full bg-[#12151f] border border-[#1e2332] rounded-md px-2.5 py-1.5 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-accent resize-none font-mono text-[11px]"
                />
                <button
                  type="button"
                  onClick={handleCommit}
                  disabled={!commitSubject.trim() || !activeRepoPath}
                  className="w-full py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white font-medium text-xs rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {(repoStatus?.stagedFiles?.length ?? 0) > 0
                      ? `Tạo Commit (${repoStatus?.stagedFiles?.length} tệp Staged)`
                      : 'Stage tất cả & Tạo Commit'}
                  </span>
                </button>
              </div>
            </div>

            {/* Right Column: Diff Viewer */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#0c0d12] min-h-0">
              {selectedFile ? (
                <>
                  {/* Diff Viewer Toolbar Header */}
                  <div className="h-10 border-b border-[#1a1e2a] bg-[#0e1017] px-3 flex items-center justify-between flex-shrink-0 gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-xs font-mono font-semibold text-slate-200 truncate" title={selectedFile.path}>
                        {selectedFile.path}
                      </span>
                      {selectedFile.isStaged ? (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-mono border border-emerald-500/30 shrink-0">
                          Staged
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 text-[10px] font-mono border border-amber-500/30 shrink-0">
                          Working Tree
                        </span>
                      )}
                      {(diffStats.additions > 0 || diffStats.deletions > 0) && (
                        <div className="hidden md:flex items-center gap-1.5 text-[10px] font-mono shrink-0 ml-1">
                          {diffStats.additions > 0 && (
                            <span className="text-emerald-400 font-semibold bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-500/30">
                              +{diffStats.additions}
                            </span>
                          )}
                          {diffStats.deletions > 0 && (
                            <span className="text-rose-400 font-semibold bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-500/30">
                              -{diffStats.deletions}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Open file in Editor */}
                      <button
                        type="button"
                        onClick={() => handleOpenFileInEditor(selectedFile.path)}
                        className="px-2.5 py-1 text-xs rounded-md bg-[#12151f] hover:bg-[#1b2030] text-slate-300 hover:text-slate-100 border border-[#1e2332] flex items-center gap-1.5 transition-colors cursor-pointer shadow-subtle"
                        title="Mở tệp này trong VS Code hoặc trình soạn thảo mặc định"
                      >
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                        <span className="hidden sm:inline">Mở Editor</span>
                      </button>

                      {/* Toggle View Mode: Diff hunks vs Full file */}
                      <div className="flex items-center bg-[#12151f] p-0.5 rounded-md border border-[#1e2332]">
                        <button
                          type="button"
                          onClick={() => {
                            if (viewFullFile) handleToggleFullFile();
                          }}
                          className={`px-2.5 py-1 text-xs rounded font-medium cursor-pointer transition-colors flex items-center gap-1 ${
                            !viewFullFile
                              ? 'bg-white/[0.08] text-slate-100 font-semibold shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title="Chỉ hiển thị các đoạn mã có sự thay đổi"
                        >
                          <Layers className="w-3 h-3" />
                          <span>Chỉ thay đổi</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!viewFullFile) handleToggleFullFile();
                          }}
                          className={`px-2.5 py-1 text-xs rounded font-medium cursor-pointer transition-colors flex items-center gap-1 ${
                            viewFullFile
                              ? 'bg-emerald-500/20 text-emerald-300 font-semibold shadow-sm border border-emerald-500/30'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title="Hiển thị toàn bộ tệp với các dòng thay đổi được đánh dấu trong ngữ cảnh"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Toàn bộ tệp</span>
                        </button>
                      </div>

                      {/* Word Wrap Toggle */}
                      <button
                        type="button"
                        onClick={() => setIsWordWrap(!isWordWrap)}
                        className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
                          isWordWrap
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                            : 'bg-[#12151f] border-[#1e2332] text-slate-400 hover:text-slate-200'
                        }`}
                        title={
                          isWordWrap
                            ? 'Đang bật tự động xuống dòng (Bấm để giữ nguyên dòng code)'
                            : 'Đang giữ nguyên dòng code (Bấm để bật tự động xuống dòng)'
                        }
                      >
                        <WrapText className="w-3.5 h-3.5" />
                      </button>

                      {/* Diff Mode Toggle: Unified vs Split */}
                      <div className="flex items-center bg-[#12151f] p-0.5 rounded-md border border-[#1e2332]">
                        <button
                          type="button"
                          onClick={() => setDiffMode('unified')}
                          className={`px-2 py-1 text-xs rounded font-medium cursor-pointer transition-colors ${
                            diffMode === 'unified'
                              ? 'bg-white/[0.08] text-slate-100 font-semibold shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title="Xem gộp dòng (Unified)"
                        >
                          Gộp dòng
                        </button>
                        <button
                          type="button"
                          onClick={() => setDiffMode('split')}
                          className={`px-2 py-1 text-xs rounded font-medium cursor-pointer transition-colors ${
                            diffMode === 'split'
                              ? 'bg-white/[0.08] text-slate-100 font-semibold shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title="Xem chia đôi (Side-by-side)"
                        >
                          Chia đôi
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Diff Viewer Content Area */}
                  {loadingDiff ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                      <span className="text-xs">Đang tải diff...</span>
                    </div>
                  ) : diffResult?.isBinary ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center gap-3">
                      <FileCode className="w-12 h-12 text-slate-600" />
                      <div>
                        <p className="text-sm font-semibold text-slate-300">Tệp nhị phân (Binary File)</p>
                        <p className="text-xs text-slate-500 mt-1">Không thể hiển thị so sánh dạng văn bản cho tệp này.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenFileInEditor(selectedFile.path)}
                        className="px-3 py-1.5 rounded-md bg-[#161a26] border border-[#22283a] text-xs text-slate-200 hover:bg-[#1e2332] flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        <span>Mở trong trình chỉnh sửa</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-auto p-3 font-mono text-xs select-text min-h-0">
                      {diffResult?.hunks && diffResult.hunks.length > 0 ? (
                        diffResult.hunks.map((hunk, hIdx) => (
                          <div
                            key={hIdx}
                            className="mb-4 border border-[#1e2332] rounded-lg overflow-hidden bg-[#090b10] shadow-sm"
                          >
                            <div className="bg-[#12151f] px-3 py-1.5 text-slate-400 text-[11px] border-b border-[#1e2332] flex items-center justify-between font-mono select-none">
                              <span className="text-cyan-400 font-semibold font-mono">
                                {viewFullFile
                                  ? `Toàn bộ tệp (${hunk.lines.length} dòng)`
                                  : hunk.header}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {hunk.oldLines > 0 && hunk.newLines > 0
                                  ? `Dòng cũ: ${hunk.oldStart}..${hunk.oldStart + Math.max(hunk.oldLines - 1, 0)} → Dòng mới: ${hunk.newStart}..${hunk.newStart + Math.max(hunk.newLines - 1, 0)}`
                                  : ''}
                              </span>
                            </div>

                            {diffMode === 'unified' ? (
                              <div className="overflow-x-auto min-w-full">
                                <div className="divide-y divide-[#1e2332]/20 min-w-full">
                                  {hunk.lines.map((line, lIdx) => (
                                    <div
                                      key={lIdx}
                                      className={`flex items-stretch text-xs leading-5 hover:bg-white/[0.03] transition-colors border-l-2 ${
                                        line.type === 'Added'
                                          ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500'
                                          : line.type === 'Deleted'
                                          ? 'bg-rose-500/10 text-rose-200 border-rose-500'
                                          : 'border-transparent text-slate-300'
                                      }`}
                                    >
                                      <span className="w-10 text-right pr-2 select-none text-[11px] text-slate-500 font-mono shrink-0 py-0.5 bg-[#0e1017]/60 border-r border-[#1e2332]">
                                        {line.oldLineNumber || ''}
                                      </span>
                                      <span className="w-10 text-right pr-2 select-none text-[11px] text-slate-500 font-mono shrink-0 py-0.5 bg-[#0e1017]/60 border-r border-[#1e2332]">
                                        {line.newLineNumber || ''}
                                      </span>
                                      <span
                                        className={`w-6 text-center select-none font-bold shrink-0 py-0.5 font-mono ${
                                          line.type === 'Added'
                                            ? 'text-emerald-400'
                                            : line.type === 'Deleted'
                                            ? 'text-rose-400'
                                            : 'text-transparent'
                                        }`}
                                      >
                                        {line.type === 'Added' ? '+' : line.type === 'Deleted' ? '-' : ' '}
                                      </span>
                                      <span
                                        className={`flex-1 pl-2 pr-4 py-0.5 font-mono ${
                                          isWordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
                                        }`}
                                      >
                                        {line.content || ' '}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="overflow-x-auto min-w-full">
                                <div className="grid grid-cols-2 divide-x divide-[#1e2332] min-w-[700px]">
                                  {/* Left: Deletions & Context */}
                                  <div className="divide-y divide-[#1e2332]/20">
                                    {hunk.lines
                                      .filter((l) => l.type !== 'Added')
                                      .map((line, lIdx) => (
                                        <div
                                          key={lIdx}
                                          className={`flex items-stretch text-xs leading-5 hover:bg-white/[0.03] transition-colors border-l-2 ${
                                            line.type === 'Deleted'
                                              ? 'bg-rose-500/10 text-rose-200 border-rose-500'
                                              : 'border-transparent text-slate-400'
                                          }`}
                                        >
                                          <span className="w-10 text-right pr-2 select-none text-[11px] text-slate-500 font-mono shrink-0 py-0.5 bg-[#0e1017]/60 border-r border-[#1e2332]">
                                            {line.oldLineNumber || ''}
                                          </span>
                                          <span
                                            className={`w-5 text-center select-none font-bold shrink-0 py-0.5 font-mono ${
                                              line.type === 'Deleted' ? 'text-rose-400' : 'text-transparent'
                                            }`}
                                          >
                                            {line.type === 'Deleted' ? '-' : ' '}
                                          </span>
                                          <span
                                            className={`flex-1 pl-2 pr-3 py-0.5 font-mono ${
                                              isWordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
                                            }`}
                                          >
                                            {line.content || ' '}
                                          </span>
                                        </div>
                                      ))}
                                  </div>
                                  {/* Right: Additions & Context */}
                                  <div className="divide-y divide-[#1e2332]/20">
                                    {hunk.lines
                                      .filter((l) => l.type !== 'Deleted')
                                      .map((line, lIdx) => (
                                        <div
                                          key={lIdx}
                                          className={`flex items-stretch text-xs leading-5 hover:bg-white/[0.03] transition-colors border-l-2 ${
                                            line.type === 'Added'
                                              ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500'
                                              : 'border-transparent text-slate-400'
                                          }`}
                                        >
                                          <span className="w-10 text-right pr-2 select-none text-[11px] text-slate-500 font-mono shrink-0 py-0.5 bg-[#0e1017]/60 border-r border-[#1e2332]">
                                            {line.newLineNumber || ''}
                                          </span>
                                          <span
                                            className={`w-5 text-center select-none font-bold shrink-0 py-0.5 font-mono ${
                                              line.type === 'Added' ? 'text-emerald-400' : 'text-transparent'
                                            }`}
                                          >
                                            {line.type === 'Added' ? '+' : ' '}
                                          </span>
                                          <span
                                            className={`flex-1 pl-2 pr-3 py-0.5 font-mono ${
                                              isWordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
                                            }`}
                                          >
                                            {line.content || ' '}
                                          </span>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-slate-500 italic">
                          Không có sự khác biệt nào để hiển thị cho tệp này.
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                  <Layers className="w-12 h-12 mb-3 text-slate-700" />
                  <p className="text-sm font-medium text-slate-400">Chưa chọn tệp nào để xem Diff</p>
                  <p className="text-xs text-slate-600 max-w-sm mt-1">
                    Nhấp vào bất kỳ tệp nào trong danh sách bên trái để so sánh sự thay đổi theo thời gian thực.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 2: HISTORY ==================== */}
        {activeTab === 'history' && (
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Left: Commit list */}
            <div className="w-full md:w-[360px] border-r border-[#1a1e2a] bg-[#0c0e14] flex flex-col flex-shrink-0 md:flex-shrink-0 min-h-0">
              <div className="p-3 border-b border-[#1a1e2a] flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Lọc commit theo thông điệp, tác giả, hash..."
                    className="w-full bg-[#12151f] border border-[#1e2332] rounded-md pl-8 pr-3 py-1.5 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-[#1a1e2a] min-h-0 pr-1">
                {filteredCommits.map((c) => {
                  const isSelected = selectedCommitHash === c.hash;
                  return (
                    <div
                      key={c.hash}
                      onClick={() => handleInspectCommit(c.hash)}
                      className={`p-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-white/[0.07] border-l-2 border-accent'
                          : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[11px] font-medium text-slate-300 bg-white/[0.05] px-1.5 py-0.5 rounded border border-white/[0.08]">
                          {c.shortHash}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">{c.relativeDate}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-200 line-clamp-2 mb-1.5">
                        {c.subject}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="truncate">{c.authorName}</span>
                      </div>
                    </div>
                  );
                })}
                {filteredCommits.length === 0 && (
                  <div className="p-8 text-center text-slate-500 text-xs italic">
                    Không tìm thấy commit nào phù hợp
                  </div>
                )}
              </div>
            </div>

            {/* Right: Commit Inspector & Actions */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#0c0d12] min-h-0">
              {selectedCommitHash && commitDetails ? (
                <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                  {/* Commit Inspector Header */}
                  <div className="p-4 border-b border-[#1a1e2a] bg-[#0e1017] flex flex-col gap-3 flex-shrink-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-100 mb-1">
                          {commitDetails.commit.subject}
                        </h3>
                        <div className="flex items-center gap-2.5 text-xs text-slate-400 font-mono">
                          <span className="text-accent-light">{commitDetails.commit.hash}</span>
                          <span>•</span>
                          <span>{commitDetails.commit.authorName} ({commitDetails.commit.authorEmail})</span>
                          <span>•</span>
                          <span>{new Date(commitDetails.commit.date).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Action buttons: Cherry-pick, Revert, Reset */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCherryPick(commitDetails.commit.hash)}
                          className="px-2.5 py-1 rounded-md bg-[#12151f] hover:bg-[#171b26] text-slate-300 text-xs font-medium border border-[#1e2332] flex items-center gap-1.5 cursor-pointer transition-colors"
                          title="Áp dụng commit này vào nhánh hiện tại"
                        >
                          <GitMerge className="w-3.5 h-3.5 text-slate-400" />
                          <span>Cherry-pick</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRevert(commitDetails.commit.hash)}
                          className="px-2.5 py-1 rounded-md bg-[#12151f] hover:bg-[#171b26] text-slate-300 text-xs font-medium border border-[#1e2332] flex items-center gap-1.5 cursor-pointer transition-colors"
                          title="Tạo commit hoàn tác commit này"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                          <span>Revert</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setResetCommitRef(commitDetails.commit.hash);
                            setIsResetModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium border border-rose-500/20 flex items-center gap-1.5 cursor-pointer transition-colors"
                          title="Đặt lại HEAD về commit này"
                        >
                          <CornerDownRight className="w-3.5 h-3.5" />
                          <span>Reset HEAD</span>
                        </button>
                      </div>
                    </div>

                    {commitDetails.commit.body && (
                      <div className="bg-[#12151f] p-2.5 rounded-md border border-[#1e2332] text-slate-300 text-xs whitespace-pre-wrap font-mono">
                        {commitDetails.commit.body}
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                      <span>Thay đổi: {commitDetails.changedFiles.length} tệp</span>
                    </div>
                  </div>

                  {/* Inspector Diff Preview & Changed files */}
                  <div className="flex-1 overflow-auto p-4 flex flex-col gap-4 select-text min-h-0">
                    <div className="bg-[#12151f] rounded-md border border-[#1e2332] overflow-hidden">
                      <div className="px-3 py-1.5 bg-[#0e1017] border-b border-[#1e2332] text-xs font-semibold text-slate-300">
                        Danh sách tệp thay đổi trong commit
                      </div>
                      <div className="divide-y divide-[#1e2332]">
                        {commitDetails.changedFiles.map((file, fIdx) => (
                          <div key={fIdx} className="px-3 py-1.5 flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-200">{file.filePath}</span>
                            <div className="flex items-center gap-2">
                              {file.additions > 0 && (
                                <span className="text-emerald-400">+{file.additions}</span>
                              )}
                              {file.deletions > 0 && (
                                <span className="text-rose-400">-{file.deletions}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Raw Patch Preview */}
                    <div className="bg-[#0e1017] rounded-md border border-[#1e2332] p-3">
                      <div className="text-xs font-semibold text-slate-400 mb-2 font-mono">Full Patch Diff:</div>
                      <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {commitDetails.diff || 'Không có nội dung diff cho commit này'}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2">
                  <History className="w-12 h-12 text-slate-700 stroke-1" />
                  <p className="text-xs font-medium">Chọn một commit từ danh sách bên trái để xem chi tiết</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 3: BRANCHES & REMOTES ==================== */}
        {activeTab === 'branches' && (
          <div className="flex-1 overflow-y-auto p-5 max-w-5xl mx-auto w-full flex flex-col gap-5 min-h-0 pr-1">
            {/* Section 1: Branches */}
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center justify-between pb-3 border-b border-[#1a1e2a]">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-slate-400" />
                    <span>Quản lý Nhánh (Branches)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tạo nhánh mới, chuyển nhánh, đổi tên, xóa nhánh và thực hiện Merge / Rebase.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsMergeModalOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#12151f] hover:bg-[#171b26] text-slate-300 text-xs font-medium border border-[#1e2332] cursor-pointer transition-colors"
                  >
                    <GitMerge className="w-3.5 h-3.5 text-slate-400" />
                    <span>Hòa nhập (Merge)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsRebaseModalOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#12151f] hover:bg-[#171b26] text-slate-300 text-xs font-medium border border-[#1e2332] cursor-pointer transition-colors"
                  >
                    <CornerDownRight className="w-3.5 h-3.5 text-slate-400" />
                    <span>Tái thiết lập (Rebase)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsNewBranchModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent hover:bg-accent-hover text-white text-xs font-medium cursor-pointer shadow-sm transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tạo nhánh mới</span>
                  </button>
                </div>
              </div>

              {/* Local Branches Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {branches
                  .filter((b) => !b.isRemote)
                  .map((b) => (
                    <div
                      key={b.name}
                      className={`p-3 rounded-lg border flex items-center justify-between transition-colors ${
                        b.isCurrent
                          ? 'bg-white/[0.04] border-accent/40 text-slate-100 shadow-sm'
                          : 'bg-[#12151f] border-[#1b202e] text-slate-200 hover:border-[#283046]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <GitBranch className={`w-4 h-4 ${b.isCurrent ? 'text-accent' : 'text-slate-500'}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs">{b.name}</span>
                            {b.isCurrent && (
                              <span className="px-1.5 py-0.5 rounded bg-accent/15 text-accent-light text-[10px] font-mono border border-accent/25">
                                Đang hoạt động
                              </span>
                            )}
                          </div>
                          {b.upstreamBranch && (
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              Tracking: {b.upstreamBranch}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!b.isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleCheckoutBranch(b.name)}
                            className="px-2 py-1 rounded-md bg-[#161a26] hover:bg-[#1d2232] text-slate-300 text-xs border border-[#212738] cursor-pointer transition-colors"
                          >
                            Chuyển sang
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setBranchToRename(b.name);
                            setRenamedBranchNewName(b.name);
                            setIsRenameBranchModalOpen(true);
                          }}
                          className="p-1.5 rounded hover:bg-white/[0.05] text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
                          title="Đổi tên nhánh"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {!b.isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleDeleteBranch(b.name)}
                            className="p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-rose-400 cursor-pointer"
                            title="Xóa nhánh"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Section 2: Git Remotes */}
            <div className="flex flex-col gap-4 pt-4 border-t border-[#1E293B]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-blue-400" />
                    <span>Quản lý Git Remotes</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Các remote kết nối (origin, upstream) để đẩy và kéo mã nguồn.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddRemoteModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111827] hover:bg-[#1E293B] text-slate-200 text-xs font-semibold border border-[#1E293B] cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>Thêm Remote mới</span>
                </button>
              </div>

              <div className="bg-[#111827] rounded-xl border border-[#1E293B] overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0D131F] text-slate-400 border-b border-[#1E293B] font-mono">
                    <tr>
                      <th className="p-3">Tên Remote</th>
                      <th className="p-3">Fetch URL</th>
                      <th className="p-3">Push URL</th>
                      <th className="p-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B]/40">
                    {remotes.map((r) => (
                      <tr key={r.name} className="hover:bg-[#0B0F17]/50 font-mono">
                        <td className="p-3 font-semibold text-emerald-400">{r.name}</td>
                        <td className="p-3 text-slate-300 truncate max-w-xs">{r.fetchUrl}</td>
                        <td className="p-3 text-slate-400 truncate max-w-xs">{r.pushUrl}</td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveRemote(r.name)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                            title="Xóa Remote"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {remotes.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-500 italic">
                          Chưa có Git Remote nào được liên kết. Hãy thêm remote để đẩy lên GitHub / GitLab.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 4: TAGS & STASHES ==================== */}
        {activeTab === 'tags' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full flex flex-col gap-6 min-h-0 pr-1">
            {/* Tags Section */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-emerald-400" />
                    <span>Thẻ phiên bản (Git Tags)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Gắn thẻ đánh dấu phiên bản phát hành (v1.0.0, release-rc1, v.v.).
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setReleaseTagName(tags.length > 0 ? `v1.0.${tags.length}` : 'v1.0.0');
                      setIsCreateReleaseModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold cursor-pointer shadow-md shadow-blue-600/20 transition-all whitespace-nowrap"
                    title="Tự động tạo Release trên GitHub, kích hoạt GitHub Actions build installer và phát hành"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>⚡ Tự Động Tạo GitHub Release</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCreateTagModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#181d2a] hover:bg-[#202738] text-slate-300 border border-[#252e42] text-xs font-medium cursor-pointer shadow-sm transition-colors whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tạo Tag mới</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tags.map((t) => (
                  <div
                    key={t.name}
                    className="p-3 rounded-lg bg-[#12151f] border border-[#1b202e] flex items-center justify-between hover:border-[#283046] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Tag className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="font-semibold text-xs text-slate-200">{t.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {t.commitHash.substring(0, 7)} {t.message ? `• ${t.message}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handlePushTag(t.name)}
                        className="px-2 py-1 rounded-md bg-[#161a26] hover:bg-[#1d2232] text-slate-300 text-xs border border-[#212738] flex items-center gap-1 cursor-pointer transition-colors"
                        title="Đẩy tag này lên remote"
                      >
                        <ArrowUp className="w-3 h-3 text-slate-400" />
                        <span>Push</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteTag(t.name)}
                        className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-white/[0.05] cursor-pointer transition-colors"
                        title="Xóa Tag"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {tags.length === 0 && (
                  <div className="col-span-2 py-10 text-center text-slate-500 text-xs italic border border-dashed border-[#1e2332] rounded-xl">
                    Chưa có Tag nào được gắn trong kho này.
                  </div>
                )}
              </div>
            </div>

            {/* Stashes Section */}
            <div className="flex flex-col gap-3.5 pt-4 border-t border-[#1a1e2a]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Archive className="w-4 h-4 text-slate-400" />
                    <span>Ngăn xếp Lưu tạm (Stashes)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Quản lý các snapshot thay đổi đang được cất tạm để dọn dẹp thư mục làm việc.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {stashes.length > 0 && (
                    <button
                      type="button"
                      onClick={handlePopStash}
                      className="px-2.5 py-1.5 rounded-md bg-[#12151f] hover:bg-[#171b26] text-slate-300 text-xs font-medium border border-[#1e2332] cursor-pointer transition-colors"
                    >
                      Lấy ra gần nhất (Pop)
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsStashModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#12151f] hover:bg-[#171b26] text-slate-300 border border-[#1e2332] text-xs font-medium cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Lưu tạm mới (Stash)</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {stashes.map((s) => (
                  <div
                    key={s.index}
                    className="p-3 rounded-lg bg-[#12151f] border border-[#1b202e] flex items-center justify-between group hover:border-[#283046] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded bg-[#161a26] text-slate-300 border border-[#212738] flex items-center justify-center font-mono text-xs font-medium">
                        #{s.index}
                      </span>
                      <div>
                        <div className="font-semibold text-xs text-slate-200">
                          {s.message || `Lưu tạm trên nhánh ${s.branch}`}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Nhánh: {s.branch} • {s.date}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApplyStash(s.index)}
                        className="px-3 py-1 rounded-lg bg-[#0B0F17] hover:bg-[#1E293B] text-slate-200 text-xs font-medium border border-[#1E293B] cursor-pointer"
                      >
                        Áp dụng (Apply)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDropStash(s.index)}
                        className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                        title="Xóa Stash"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {stashes.length === 0 && (
                  <div className="py-10 text-center text-slate-500 text-xs italic border border-dashed border-[#1E293B] rounded-xl">
                    Ngăn xếp lưu tạm trống.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 5: CLOUD REPOSITORIES ==================== */}
        {activeTab === 'cloud' && (
          <div className="flex-1 overflow-y-auto p-5 max-w-6xl mx-auto w-full flex flex-col gap-4 min-h-0 pr-1">
            {/* Header & Account Selection */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#1a1e2a]">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-slate-400" />
                  <span>Kho Lưu Trữ Cloud & Tích Hợp API</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Duyệt kho từ xa, Clone 1-click và xuất bản dự án cục bộ lên GitHub/GitLab.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="bg-[#12151f] hover:bg-[#171b26] text-slate-200 text-xs rounded-md px-2.5 py-1.5 border border-[#1e2332] focus:outline-none focus:border-accent font-medium cursor-pointer"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.provider}: {a.name} (@{a.username})
                    </option>
                  ))}
                  {accounts.length === 0 && (
                    <option value="">Chưa có tài khoản Cloud nào</option>
                  )}
                </select>

                <button
                  type="button"
                  onClick={() => setIsPublishModalOpen(true)}
                  disabled={!activeRepoPath || accounts.length === 0}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#12151f] hover:bg-[#171b26] text-slate-300 text-xs font-medium border border-[#1e2332] cursor-pointer disabled:opacity-50 transition-colors"
                  title="Xuất bản kho cục bộ đang mở lên tài khoản Cloud này"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-slate-400" />
                  <span>Xuất bản Cục Bộ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCreateCloudRepoModalOpen(true)}
                  disabled={accounts.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent hover:bg-accent-hover text-white text-xs font-medium cursor-pointer shadow-sm disabled:opacity-50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo Kho Mới</span>
                </button>
              </div>
            </div>

            {/* Search bar & Rate limit */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-1 w-full">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={cloudSearch}
                    onChange={(e) => setCloudSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') loadCloudRepos(selectedAccountId, cloudSearch);
                    }}
                    placeholder="Tìm kiếm kho từ xa trên tài khoản Cloud (nhấn Enter)..."
                    className="w-full bg-[#12151f] border border-[#1e2332] rounded-md pl-8 pr-3 py-1.5 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-accent"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => loadCloudRepos(selectedAccountId, cloudSearch)}
                  disabled={loadingCloudRepos || !selectedAccountId}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#12151f] hover:bg-[#171b26] text-slate-300 border border-[#1e2332] text-xs font-medium cursor-pointer transition-colors shrink-0 disabled:opacity-50"
                  title="Tải về danh sách tất cả các Repository từ GitHub/GitLab (Fetch)"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loadingCloudRepos ? 'animate-spin' : ''}`} />
                  <span>Fetch</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    openCicdModalForRepo('', undefined, selectedAccountId, '');
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#12151f] hover:bg-[#171b26] text-slate-300 border border-[#1e2332] text-xs font-medium cursor-pointer transition-colors shrink-0"
                  title="Tự động thiết lập CI/CD triển khai ứng dụng lên server qua GitHub Actions"
                >
                  <Zap className="w-3.5 h-3.5 text-accent" />
                  <span>CI/CD Server</span>
                </button>
              </div>

              {rateLimitInfo && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#12151f] border border-[#1e2332] text-xs font-mono text-slate-400 shrink-0">
                  <Shield className="w-3 h-3 text-slate-400" />
                  <span>
                    API Quota: <strong className="text-slate-200">{rateLimitInfo.remaining}</strong> / {rateLimitInfo.limit}
                  </span>
                </div>
              )}
            </div>

            {/* Cloud Repos Grid */}
            {accounts.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs border border-dashed border-[#1e2332] rounded-xl flex flex-col items-center justify-center gap-2">
                <Cloud className="w-10 h-10 text-slate-600 mb-1 stroke-1" />
                <span className="font-semibold text-slate-300">Chưa cấu hình tài khoản Git Provider</span>
                <p className="text-slate-500 max-w-sm">
                  Vui lòng chuyển tới tab Cài đặt để thêm tài khoản GitHub, GitLab hoặc Gitea với Personal Access Token.
                </p>
              </div>
            ) : loadingCloudRepos ? (
              <div className="py-16 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                <span>Đang tải danh sách kho lưu trữ Cloud...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {remoteRepos.map((repo) => (
                  <div
                    key={repo.id}
                    className="p-3.5 rounded-lg bg-[#12151f] border border-[#1b202e] hover:border-[#283046] flex flex-col justify-between transition-all duration-150 group shadow-sm"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <a
                          href={repo.htmlUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-xs text-slate-200 group-hover:text-accent transition-colors truncate"
                          title={repo.fullName || repo.name}
                        >
                          {repo.name}
                        </a>
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/[0.04] text-slate-400 border border-white/[0.08] flex items-center gap-1 shrink-0"
                        >
                          {repo.isPrivate ? (
                            <>
                              <Lock className="w-2.5 h-2.5 text-amber-400/80" />
                              <span>Riêng tư</span>
                            </>
                          ) : (
                            <>
                              <Globe className="w-2.5 h-2.5 text-slate-500" />
                              <span>Công khai</span>
                            </>
                          )}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 line-clamp-2 min-h-[32px] leading-relaxed">
                        {repo.description || (
                          <span className="text-slate-600 italic">Không có mô tả</span>
                        )}
                      </p>

                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono mt-2 mb-3">
                        {repo.language && (
                          <span className="flex items-center gap-1 text-slate-300">
                            <span className="w-2 h-2 rounded-full bg-blue-500/80" />
                            {repo.language}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-slate-400">
                          <Star className="w-3 h-3 text-slate-500" />
                          <span>{repo.starsCount}</span>
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <GitFork className="w-3 h-3 text-slate-500" />
                          <span>{repo.forksCount}</span>
                        </span>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-[#1a1f2c] flex items-center justify-between">
                      {/* Primary Clone action */}
                      <button
                        type="button"
                        onClick={() => {
                          setCloneUrl(repo.cloneUrl);
                          setCloneProjectName(repo.name);
                          setCloneDestPath(`D:\\Projects\\${repo.name}`);
                          setIsCloneModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-md bg-[#161a26] hover:bg-[#1d2232] text-slate-200 border border-[#212738] text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                        title="Sao chép kho lưu trữ về máy tính (Clone)"
                      >
                        <DownloadCloud className="w-3.5 h-3.5 text-slate-400" />
                        <span>Clone</span>
                      </button>

                      {/* Secondary actions */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setPushTargetRepo(repo);
                            setPushLocalPath(activeRepoPath || 'D:\\ToolTienich');
                            setPushBranch(repo.defaultBranch || 'main');
                            setPushCommitMessage(`Initial commit to ${repo.name}`);
                            setPushToRemoteResult(null);
                            setIsPushToRemoteModalOpen(true);
                          }}
                          className="p-1.5 rounded-md text-slate-400 hover:text-emerald-400 hover:bg-white/[0.05] transition-colors cursor-pointer"
                          title="Đẩy mã nguồn từ máy tính lên kho này"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            // Find matching local project or directory
                            const matchingProject = projects.find(
                              (p) =>
                                p.name.toLowerCase() === repo.name.toLowerCase() ||
                                p.path.toLowerCase().replace(/\\/g, '/').endsWith(`/${repo.name.toLowerCase()}`)
                            );
                            const isCurrent = activeRepoPath && activeRepoPath.toLowerCase().replace(/\\/g, '/').endsWith(`/${repo.name.toLowerCase()}`);
                            const localPath = matchingProject ? matchingProject.path : (isCurrent ? activeRepoPath : '');

                            openCicdModalForRepo(
                              localPath,
                              repo.name,
                              selectedAccountId,
                              repo.fullName
                            );
                          }}
                          className="p-1.5 rounded-md text-slate-400 hover:text-accent hover:bg-white/[0.05] transition-colors cursor-pointer"
                          title="Thiết lập CI/CD GitHub Actions"
                        >
                          <Zap className="w-3.5 h-3.5" />
                        </button>

                        <a
                          href={repo.htmlUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-colors"
                          title="Mở trên trình duyệt web"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
                {remoteRepos.length === 0 && (
                  <div className="col-span-3 py-16 text-center text-slate-500 text-xs italic border border-dashed border-[#1e2332] rounded-xl">
                    Không tìm thấy kho nào trên tài khoản này. Nhấn 'Tạo Kho Mới' để bắt đầu.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ==================== MODALS ==================== */}

      {/* 1. Modal: Tạo Nhánh Mới */}
      {isNewBranchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#334155] rounded-xl max-w-sm w-full p-5 shadow-2xl flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-emerald-400" />
              <span>Tạo Nhánh Mới</span>
            </h3>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 font-medium">Tên nhánh</label>
              <input
                type="text"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="feature/ten-tinh-nang"
                className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500 selectable"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setIsNewBranchModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCreateBranch}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Tạo & Chuyển sang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal: Đổi Tên Nhánh */}
      {isRenameBranchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#334155] rounded-xl max-w-sm w-full p-5 shadow-2xl flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-emerald-400" />
              <span>Đổi Tên Nhánh '{branchToRename}'</span>
            </h3>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 font-medium">Tên nhánh mới</label>
              <input
                type="text"
                value={renamedBranchNewName}
                onChange={(e) => setRenamedBranchNewName(e.target.value)}
                className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500 selectable"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setIsRenameBranchModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleRenameBranch}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Lưu tên mới
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal: Merge Branch */}
      {isMergeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#334155] rounded-xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <GitMerge className="w-4 h-4 text-purple-400" />
              <span>Hòa nhập (Merge) vào nhánh '{repoStatus?.currentBranch}'</span>
            </h3>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 font-medium">Chọn nhánh nguồn cần hòa nhập</label>
              <select
                value={mergeTargetBranch}
                onChange={(e) => setMergeTargetBranch(e.target.value)}
                className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none cursor-pointer"
              >
                <option value="">-- Chọn nhánh --</option>
                {branches
                  .filter((b) => !b.isCurrent)
                  .map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setIsMergeModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleMerge}
                disabled={!mergeTargetBranch}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Thực hiện Merge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal: Rebase Branch */}
      {isRebaseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#334155] rounded-xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <CornerDownRight className="w-4 h-4 text-amber-400" />
              <span>Tái thiết lập (Rebase) nhánh '{repoStatus?.currentBranch}'</span>
            </h3>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 font-medium">Chọn nhánh nền (Base branch)</label>
              <select
                value={rebaseTargetBranch}
                onChange={(e) => setRebaseTargetBranch(e.target.value)}
                className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none cursor-pointer"
              >
                <option value="">-- Chọn nhánh --</option>
                {branches
                  .filter((b) => !b.isCurrent)
                  .map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setIsRebaseModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleRebase}
                disabled={!rebaseTargetBranch}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Thực hiện Rebase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal: Reset HEAD */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#334155] rounded-xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-rose-400" />
              <span>Đặt lại nhánh (Reset HEAD)</span>
            </h3>
            <div className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-medium">Target Commit Ref / Hash</label>
                <input
                  type="text"
                  value={resetCommitRef}
                  onChange={(e) => setResetCommitRef(e.target.value)}
                  className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-medium">Chế độ Reset</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['mixed', 'soft', 'hard'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setResetMode(m)}
                      className={`py-2 rounded-lg font-mono text-xs uppercase border cursor-pointer ${
                        resetMode === m
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
                          : 'bg-[#0B0F17] text-slate-400 border-[#1E293B]'
                      }`}
                    >
                      --{m}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {resetMode === 'soft' && 'Giữ nguyên toàn bộ thay đổi trong Staged.'}
                  {resetMode === 'mixed' && 'Giữ nguyên thay đổi trong tệp nhưng bỏ khỏi Stage (mặc định).'}
                  {resetMode === 'hard' && 'CẢNH BÁO: Hủy bỏ toàn bộ thay đổi không thể khôi phục!'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Thực hiện Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal: Thêm Remote Mới */}
      {isAddRemoteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#334155] rounded-xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Cloud className="w-4 h-4 text-emerald-400" />
              <span>Thêm Git Remote Mới</span>
            </h3>
            <div className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-medium">Tên Remote</label>
                <input
                  type="text"
                  value={newRemoteName}
                  onChange={(e) => setNewRemoteName(e.target.value)}
                  placeholder="origin, upstream..."
                  className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-medium">Remote URL</label>
                <input
                  type="text"
                  value={newRemoteUrl}
                  onChange={(e) => setNewRemoteUrl(e.target.value)}
                  placeholder="https://github.com/user/repo.git hoặc git@..."
                  className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setIsAddRemoteModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleAddRemote}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Thêm Remote
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal: Tạo Tag Mới */}
      {isCreateTagModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#334155] rounded-xl max-w-sm w-full p-5 shadow-2xl flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-400" />
              <span>Tạo Tag Phiên Bản</span>
            </h3>
            <div className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-medium">Tên Tag (v1.0.0...)</label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="v1.0.0"
                  className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-medium">Ghi chú / Thông điệp Tag</label>
                <input
                  type="text"
                  value={newTagMessage}
                  onChange={(e) => setNewTagMessage(e.target.value)}
                  placeholder="Bản phát hành chính thức..."
                  className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setIsCreateTagModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCreateTag}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Tạo Tag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Modal: Lưu Tạm Mới (Stash) */}
      {isStashModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#334155] rounded-xl max-w-sm w-full p-5 shadow-2xl flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Archive className="w-4 h-4 text-amber-400" />
              <span>Lưu Tạm Thay Đổi (Stash)</span>
            </h3>
            <div className="flex flex-col gap-1 text-xs">
              <label className="text-slate-400 font-medium">Thông điệp lưu tạm</label>
              <input
                type="text"
                value={stashMessage}
                onChange={(e) => setStashMessage(e.target.value)}
                placeholder="Đang dở dang tính năng đăng nhập..."
                className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setIsStashModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCreateStash}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Lưu vào Stash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Modal: Tạo Kho Mới Trên Cloud */}
      {isCreateCloudRepoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#334155] rounded-xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Cloud className="w-4 h-4 text-blue-400" />
              <span>Tạo Kho Mới Trên Cloud Git Provider</span>
            </h3>
            <div className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-medium">Tên kho (Repository Name)</label>
                <input
                  type="text"
                  value={createCloudRepoName}
                  onChange={(e) => setCreateCloudRepoName(e.target.value)}
                  placeholder="my-awesome-app"
                  className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-medium">Mô tả (Description)</label>
                <input
                  type="text"
                  value={createCloudRepoDesc}
                  onChange={(e) => setCreateCloudRepoDesc(e.target.value)}
                  placeholder="Dự án ứng dụng desktop hiện đại..."
                  className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <label className="flex items-center justify-between cursor-pointer pt-1">
                <span className="text-slate-300">Chế độ Riêng tư (Private)</span>
                <input
                  type="checkbox"
                  checked={createCloudRepoPrivate}
                  onChange={(e) => setCreateCloudRepoPrivate(e.target.checked)}
                  className="accent-blue-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-300">Tự động khởi tạo tệp README.md</span>
                <input
                  type="checkbox"
                  checked={createCloudRepoReadme}
                  onChange={(e) => setCreateCloudRepoReadme(e.target.checked)}
                  className="accent-blue-500 w-4 h-4"
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setIsCreateCloudRepoModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCreateCloudRepo}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Tạo Kho Trên Cloud
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Modal: Xuất Bản Kho Cục Bộ Lên Cloud */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#334155] rounded-xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-emerald-400" />
              <span>Xuất Bản Kho Cục Bộ Lên Cloud</span>
            </h3>
            <p className="text-xs text-slate-400">
              Hệ thống sẽ tự động tạo kho từ xa, gán remote và đẩy toàn bộ commit cùng nhánh hiện tại lên Cloud.
            </p>

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-medium">Tên kho trên Cloud</label>
                <input
                  type="text"
                  value={publishRepoName}
                  onChange={(e) => setPublishRepoName(e.target.value)}
                  className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-medium">Tên Remote cục bộ</label>
                <input
                  type="text"
                  value={publishRemoteName}
                  onChange={(e) => setPublishRemoteName(e.target.value)}
                  placeholder="origin"
                  className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <label className="flex items-center justify-between cursor-pointer pt-1">
                <span className="text-slate-300">Kho Riêng tư (Private)</span>
                <input
                  type="checkbox"
                  checked={publishIsPrivate}
                  onChange={(e) => setPublishIsPrivate(e.target.checked)}
                  className="accent-emerald-500 w-4 h-4"
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setIsPublishModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handlePublishLocalRepo}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Xuất Bản Ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. Modal: 1-Click Clone Repo */}
      {isCloneModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#334155] rounded-xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <DownloadCloud className="w-4 h-4 text-blue-400" />
              <span>1-Click Clone Kho Về Máy Tính</span>
            </h3>

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-medium">Clone URL</label>
                <input
                  type="text"
                  value={cloneUrl}
                  onChange={(e) => setCloneUrl(e.target.value)}
                  className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-medium">Thư mục đích trên Windows</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={cloneDestPath}
                    onChange={(e) => setCloneDestPath(e.target.value)}
                    placeholder="D:\Projects\repo-name"
                    className="flex-1 bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-blue-500 selectable"
                  />
                  <button
                    type="button"
                    onClick={handleBrowseFolderForClone}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0"
                    title="Duyệt và chọn thư mục từ máy tính (Hộp thoại Windows)"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>Duyệt...</span>
                  </button>
                  {cloneDestPath.trim() && (
                    <button
                      type="button"
                      onClick={() => handleOpenInExplorer(cloneDestPath)}
                      className="flex items-center gap-1.5 px-2.5 py-2 bg-[#1E293B]/70 hover:bg-[#1E293B] text-slate-300 border border-[#334155] rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0"
                      title="Mở thư mục này trong Windows File Explorer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Explorer</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-medium">Tên dự án trong DevDock (Tùy chọn)</label>
                <input
                  type="text"
                  value={cloneProjectName}
                  onChange={(e) => setCloneProjectName(e.target.value)}
                  placeholder="Tên gợi nhớ dự án..."
                  className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setIsCloneModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCloneRepo}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Bắt đầu Clone
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 12. Modal: Tự Động Thiết Lập CI/CD GitHub Actions Cho Server */}
      {isCicdModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D131F] border border-[#233550] rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#1E2B40] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-500/20 to-blue-500/20 text-purple-300 border border-purple-500/30">
                  <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <span>Tự Động Thiết Lập CI/CD GitHub Actions</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Tự Động Hóa Deploy Server
                    </span>
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                      <span>Kho mục tiêu:</span>
                      <span className="font-mono text-cyan-300 font-semibold">{cicdTargetRepoName || cicdRemoteFullName || activeRepoPath || 'Kho hiện tại'}</span>
                      {cicdTargetRepoPath ? (
                        <span className="text-[10px] text-slate-500 font-mono">({cicdTargetRepoPath})</span>
                      ) : cicdRemoteFullName ? (
                        <span className="text-[10px] text-purple-400 font-mono">({cicdRemoteFullName} • Cloud)</span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      onClick={() => runRepoInspection()}
                      disabled={isInspectingRepo}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Quét và phân tích lại mã nguồn của repo"
                    >
                      <RefreshCw className={`w-3 h-3 ${isInspectingRepo ? 'animate-spin text-cyan-400' : ''}`} />
                      <span>{isInspectingRepo ? 'Đang soi code...' : 'Soi Lại Code'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCicdModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#162236] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Success Result View */}
            {cicdResult ? (
              <div className="flex flex-col gap-4 py-2 animate-in fade-in">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                  <CheckCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-emerald-300 text-xs">{cicdResult.message}</span>
                    <span className="text-[11px] font-mono text-slate-300">
                      Đường dẫn tệp: {cicdResult.workflowFilePath}
                    </span>
                    {cicdResult.generatedFiles && cicdResult.generatedFiles.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="text-[10px] text-slate-400">Các tệp cấu hình đã sinh:</span>
                        {cicdResult.generatedFiles.map((gf) => (
                          <span key={gf} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                            {gf}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Secrets Setup Guide */}
                <div className="p-4 rounded-xl bg-[#080C14] border border-[#1E2C44] flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-slate-200">
                        Cấu hình GitHub Actions Secrets (Bắt buộc)
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Vào GitHub Repo &gt; Settings &gt; Secrets and variables &gt; Actions
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <p className="text-[11px] text-slate-400">
                      Workflow cần các khóa bí mật sau để có thể SSH và triển khai mã nguồn lên máy chủ:
                    </p>

                    <button
                      type="button"
                      onClick={handleAutoSyncSecrets}
                      disabled={isSyncingSecrets}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
                      title="Sử dụng GitHub API và mã hóa libsodium để tự động lưu các Secret này lên GitHub Repo"
                    >
                      {isSyncingSecrets ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang đẩy Secrets lên GitHub...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5" />
                          <span>⚡ Tự động đẩy tất cả Secrets lên GitHub</span>
                        </>
                      )}
                    </button>
                  </div>

                  {secretsSyncMessage && (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{secretsSyncMessage}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    {[
                      { name: 'SSH_HOST', val: cicdServerHost, desc: 'Địa chỉ IP hoặc tên miền máy chủ Server' },
                      { name: 'SSH_USER', val: cicdServerUser, desc: 'Tên người dùng SSH (root, ubuntu,...)' },
                      { name: 'SSH_KEY', val: 'Khóa SSH Private Key (id_rsa / id_ed25519)', desc: 'Nội dung Private Key kết nối không cần mật khẩu' },
                      ...(cicdServerPort !== 22
                        ? [{ name: 'SSH_PORT', val: String(cicdServerPort), desc: 'Cổng kết nối SSH của Server' }]
                        : []),
                    ].map((secret) => (
                      <div
                        key={secret.name}
                        className="p-2.5 rounded-lg bg-[#0E1524] border border-[#1E2A42] flex items-center justify-between text-xs font-mono"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-cyan-300">{secret.name}</span>
                          <span className="text-[10px] text-slate-400 font-sans">{secret.desc}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400 max-w-[140px] truncate">{secret.val}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(secret.val);
                              setCopiedSecretKey(secret.name);
                              onShowToast(`Đã sao chép giá trị cho ${secret.name}!`, 'success');
                              setTimeout(() => setCopiedSecretKey(null), 2000);
                            }}
                            className="p-1.5 rounded hover:bg-[#1B2942] text-slate-400 hover:text-slate-200 cursor-pointer"
                            title="Sao chép giá trị này"
                          >
                            {copiedSecretKey === secret.name ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Workflow Preview Code */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-300">Nội dung tệp .github/workflows/deploy.yml đã sinh:</span>
                  <pre className="p-3 bg-[#060911] border border-[#1E293B] rounded-xl text-[11px] font-mono text-slate-200 max-h-48 overflow-y-auto selectable">
                    {cicdResult.workflowContent}
                  </pre>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E2B40]">
                  <button
                    type="button"
                    onClick={() => {
                      setCicdResult(null);
                      setIsCicdModalOpen(false);
                    }}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    Hoàn Tất
                  </button>
                </div>
              </div>
            ) : (
              /* Setup Configuration Form */
              <div className="flex flex-col gap-4 text-xs">
                {/* AUTO CODE INSPECTION BANNER */}
                {isInspectingRepo ? (
                  <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center gap-3 animate-pulse">
                    <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-cyan-300">Đang phân tích cấu trúc mã nguồn Repository...</span>
                      <span className="text-[11px] text-slate-400">Kiểm tra package.json, *.csproj, requirements.txt, Dockerfile, scripts build &amp; ports.</span>
                    </div>
                  </div>
                ) : repoInspection && repoInspection.success ? (
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#0C1526] to-[#0A1828] border border-cyan-500/30 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-slate-100">
                          Đã tự động nhận diện mã nguồn Repository
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {repoInspection.framework}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                      <div className="p-2 rounded bg-[#060A12] border border-[#1E2B40]">
                        <span className="text-[10px] text-slate-500 block font-sans">Gói (Package Manager)</span>
                        <span className="text-cyan-300 font-semibold">{repoInspection.packageManager}</span>
                      </div>

                      <div className="p-2 rounded bg-[#060A12] border border-[#1E2B40]">
                        <span className="text-[10px] text-slate-500 block font-sans">Lệnh Build</span>
                        <span className="text-emerald-300 font-semibold truncate block" title={repoInspection.buildCommand}>
                          {repoInspection.buildCommand || 'Không cần build'}
                        </span>
                      </div>

                      <div className="p-2 rounded bg-[#060A12] border border-[#1E2B40]">
                        <span className="text-[10px] text-slate-500 block font-sans">Cổng dịch vụ (Port)</span>
                        <span className="text-amber-300 font-semibold">Port {repoInspection.appPort}</span>
                      </div>

                      <div className="p-2 rounded bg-[#060A12] border border-[#1E2B40]">
                        <span className="text-[10px] text-slate-500 block font-sans">Trạng thái Docker</span>
                        <span className={repoInspection.hasDockerCompose || repoInspection.hasDockerfile ? 'text-emerald-400' : 'text-slate-400'}>
                          {repoInspection.hasDockerCompose ? 'Đã có Compose' : repoInspection.hasDockerfile ? 'Đã có Dockerfile' : 'Chưa có Docker'}
                        </span>
                      </div>
                    </div>

                    {repoInspection.summary && (
                      <p className="text-[11px] text-slate-400 italic">
                        💡 {repoInspection.summary} {repoInspection.recommendation}
                      </p>
                    )}
                  </div>
                ) : null}

                {/* 1. Tech Stack Selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-300 font-semibold">1. Nền Tảng &amp; Công Nghệ (Được tự động chọn theo mã nguồn):</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'NodeJs', label: 'Node.js / React / Vite / Next', icon: '⚡' },
                      { id: 'DotNet', label: 'ASP.NET Core / .NET 9', icon: '🔷' },
                      { id: 'Docker', label: 'Docker Compose Container', icon: '🐳' },
                      { id: 'Python', label: 'Python / FastAPI / Django', icon: '🐍' },
                      { id: 'Go', label: 'Golang Microservice', icon: '🔵' },
                      { id: 'Static', label: 'Static HTML / Web App', icon: '📄' },
                    ].map((tech) => (
                      <button
                        key={tech.id}
                        type="button"
                        onClick={() => {
                          setCicdTechStack(tech.id);
                          if (tech.id === 'NodeJs') {
                            setCicdPostScript('npm install --production\npm2 reload all || pm2 restart all || npm run start &');
                          } else if (tech.id === 'DotNet') {
                            setCicdPostScript('dotnet publish -c Release -o ./publish\nsudo systemctl restart kestrel-app || true');
                          } else if (tech.id === 'Docker') {
                            setCicdPostScript('docker compose down --remove-orphans || true\ndocker compose pull || true\ndocker compose up -d --build');
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                          cicdTechStack === tech.id
                            ? 'bg-[#18263D] border-cyan-400 text-slate-100 shadow-sm'
                            : 'bg-[#080C14] border-[#1E2B40] text-slate-400 hover:text-slate-200 hover:border-slate-600'
                        }`}
                      >
                        <span className="text-base">{tech.icon}</span>
                        <span className="font-semibold text-[11px]">{tech.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. ADVANCED SCAFFOLDING OPTIONS ("TỰ TẠO MẤY CÁI PHỨC TẠP") */}
                <div className="p-3.5 rounded-xl bg-[#080C14] border border-[#1E2C44] flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-slate-200">
                      2. Tự Động Sinh Tệp Cấu Hình Phức Tạp (Production Scaffolding):
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <label className="flex items-start gap-2 p-2 rounded-lg bg-[#0C121D] border border-[#1A263B] cursor-pointer hover:border-cyan-500/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={cicdGenerateDockerfile}
                        onChange={(e) => setCicdGenerateDockerfile(e.target.checked)}
                        className="accent-cyan-500 w-4 h-4 rounded mt-0.5 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-slate-200 text-[11px] font-semibold">Tự tạo Dockerfile chuẩn Multi-stage</span>
                        <span className="text-slate-400 text-[10px]">Tối ưu kích thước image và bảo mật cho môi trường sản xuất.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2 p-2 rounded-lg bg-[#0C121D] border border-[#1A263B] cursor-pointer hover:border-cyan-500/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={cicdGenerateDockerCompose}
                        onChange={(e) => setCicdGenerateDockerCompose(e.target.checked)}
                        className="accent-cyan-500 w-4 h-4 rounded mt-0.5 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-slate-200 text-[11px] font-semibold">Tự tạo docker-compose.yml</span>
                        <span className="text-slate-400 text-[10px]">Kèm ánh xạ cổng, biến môi trường và chính sách restart: unless-stopped.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2 p-2 rounded-lg bg-[#0C121D] border border-[#1A263B] cursor-pointer hover:border-cyan-500/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={cicdGeneratePm2Config}
                        onChange={(e) => setCicdGeneratePm2Config(e.target.checked)}
                        className="accent-purple-500 w-4 h-4 rounded mt-0.5 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-slate-200 text-[11px] font-semibold">Tự tạo PM2 ecosystem.config.js</span>
                        <span className="text-slate-400 text-[10px]">Quản lý tiến trình Node.js, tự khởi động lại khi crash &amp; nạp cluster.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2 p-2 rounded-lg bg-[#0C121D] border border-[#1A263B] cursor-pointer hover:border-cyan-500/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={cicdGenerateSystemd}
                        onChange={(e) => setCicdGenerateSystemd(e.target.checked)}
                        className="accent-blue-500 w-4 h-4 rounded mt-0.5 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-slate-200 text-[11px] font-semibold">Tự tạo Linux Systemd service</span>
                        <span className="text-slate-400 text-[10px]">Dành cho .NET / Go / Python tự khởi động cùng máy chủ Linux.</span>
                      </div>
                    </label>
                  </div>

                  <div className="flex items-center gap-4 pt-1.5 border-t border-[#162030]">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cicdIncludeCaching}
                        onChange={(e) => setCicdIncludeCaching(e.target.checked)}
                        className="accent-emerald-500 w-3.5 h-3.5 rounded cursor-pointer"
                      />
                      <span className="text-slate-300 text-[11px]">Bật Caching Dependencies (tăng tốc build x5)</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cicdIncludeHealthCheck}
                        onChange={(e) => setCicdIncludeHealthCheck(e.target.checked)}
                        className="accent-emerald-500 w-3.5 h-3.5 rounded cursor-pointer"
                      />
                      <span className="text-slate-300 text-[11px]">Kiểm tra Health Check sau deploy</span>
                    </label>
                  </div>
                </div>

                {/* 3. Deployment Method */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-300 font-semibold">3. Phương Thức Triển Khai Lên Máy Chủ:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCicdDeployType('SSH_RSYNC')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                        cicdDeployType === 'SSH_RSYNC'
                          ? 'bg-[#18263D] border-cyan-400 text-slate-100 shadow-sm'
                          : 'bg-[#080C14] border-[#1E2B40] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
                        <Server className="w-3.5 h-3.5" />
                        <span>Deploy trực tiếp qua SSH (PM2 / Systemd / Native)</span>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        SSH vào server, kéo git mới nhất, build và reload tiến trình tự động.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCicdDeployType('SSH_DOCKER')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                        cicdDeployType === 'SSH_DOCKER'
                          ? 'bg-[#18263D] border-cyan-400 text-slate-100 shadow-sm'
                          : 'bg-[#080C14] border-[#1E2B40] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
                        <Box className="w-3.5 h-3.5" />
                        <span>Deploy Docker Compose Server</span>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        SSH vào server và chạy docker compose down / pull / up -d --build tự động.
                      </span>
                    </button>
                  </div>
                </div>

                {/* 4. Server Target & SSH Profile Quick Selection */}
                <div className="p-3.5 rounded-xl bg-[#080C14] border border-[#1E2C44] flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-200 font-semibold flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-cyan-400" />
                      <span>4. Thông Tin Máy Chủ Triển Khai (Server Info):</span>
                    </label>

                    {sshProfiles.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">Chọn nhanh từ DevDock:</span>
                        <select
                          value={cicdServerProfileId}
                          onChange={(e) => handleSelectSshProfileForCicd(e.target.value)}
                          className="bg-[#121B2A] border border-[#233550] rounded-md px-2 py-0.5 text-xs text-cyan-300 focus:outline-none cursor-pointer"
                        >
                          <option value="">-- Chọn SSH Server --</option>
                          {sshProfiles.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.username}@{p.host})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <span className="text-[11px] text-slate-400">Địa chỉ Server Host / IP:</span>
                      <input
                        type="text"
                        value={cicdServerHost}
                        onChange={(e) => setCicdServerHost(e.target.value)}
                        placeholder="192.168.1.100 hoặc server.domain.com"
                        className="bg-[#0E1524] border border-[#1E2A42] rounded-lg px-3 py-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500 selectable"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] text-slate-400">Cổng SSH:</span>
                      <input
                        type="number"
                        value={cicdServerPort}
                        onChange={(e) => setCicdServerPort(parseInt(e.target.value) || 22)}
                        className="bg-[#0E1524] border border-[#1E2A42] rounded-lg px-3 py-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500 selectable"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] text-slate-400">SSH Username:</span>
                      <input
                        type="text"
                        value={cicdServerUser}
                        onChange={(e) => setCicdServerUser(e.target.value)}
                        placeholder="root hoặc ubuntu"
                        className="bg-[#0E1524] border border-[#1E2A42] rounded-lg px-3 py-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500 selectable"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] text-slate-400">Thư mục trên Server:</span>
                      <input
                        type="text"
                        value={cicdDeployDir}
                        onChange={(e) => setCicdDeployDir(e.target.value)}
                        placeholder="/var/www/my-app"
                        className="bg-[#0E1524] border border-[#1E2A42] rounded-lg px-3 py-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500 selectable"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] text-slate-400">Cổng Health Check:</span>
                      <input
                        type="number"
                        value={cicdHealthCheckPort}
                        onChange={(e) => setCicdHealthCheckPort(parseInt(e.target.value) || 3000)}
                        placeholder="3000"
                        className="bg-[#0E1524] border border-[#1E2A42] rounded-lg px-3 py-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500 selectable"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Branch & Post Deploy script */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-300 font-semibold">Nhánh kích hoạt (Branch):</label>
                    <input
                      type="text"
                      value={cicdBranch}
                      onChange={(e) => setCicdBranch(e.target.value)}
                      placeholder="main"
                      className="bg-[#0E1524] border border-[#1E2A42] rounded-lg px-3 py-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500 selectable"
                    />
                  </div>

                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-slate-300 font-semibold">Lệnh chạy sau khi tải code (Post-Deploy Script):</label>
                    <textarea
                      value={cicdPostScript}
                      onChange={(e) => setCicdPostScript(e.target.value)}
                      rows={3}
                      placeholder="npm install --production && pm2 reload all"
                      className="bg-[#0E1524] border border-[#1E2A42] rounded-lg px-3 py-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500 resize-none selectable"
                    />
                  </div>
                </div>

                {/* 6. Auto commit toggle */}
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={cicdAutoCommit}
                    onChange={(e) => setCicdAutoCommit(e.target.checked)}
                    className="accent-emerald-500 w-4 h-4 rounded cursor-pointer"
                  />
                  <span className="text-slate-300 text-xs">
                    Tự động tạo commit Git chứa workflow và các tệp cấu hình vừa tạo
                  </span>
                </label>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1E2B40]">
                  <button
                    type="button"
                    onClick={() => setIsCicdModalOpen(false)}
                    className="px-3.5 py-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    Hủy
                  </button>

                  <button
                    type="button"
                    onClick={handleSetupCicd}
                    disabled={isSettingUpCicd || !cicdServerHost.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSettingUpCicd ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang thiết lập CI/CD &amp; sinh cấu hình...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        <span>Tạo &amp; Cài Đặt CI/CD</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 13. Modal: Khởi Tạo Git Cục Bộ (git init) */}
      {isInitRepoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#334155] rounded-xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-emerald-400" />
              <span>Khởi Tạo Kho Git Cục Bộ (git init)</span>
            </h3>

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-medium">Đường dẫn thư mục dự án:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={initRepoPath}
                    onChange={(e) => setInitRepoPath(e.target.value)}
                    placeholder="D:\Projects\my-app"
                    className="flex-1 bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500 selectable"
                  />
                  <button
                    type="button"
                    onClick={handleBrowseFolderForInit}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0"
                    title="Duyệt và chọn thư mục từ máy tính (Hộp thoại Windows)"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>Duyệt...</span>
                  </button>
                  {initRepoPath.trim() && (
                    <button
                      type="button"
                      onClick={() => handleOpenInExplorer(initRepoPath)}
                      className="flex items-center gap-1.5 px-2.5 py-2 bg-[#1E293B]/70 hover:bg-[#1E293B] text-slate-300 border border-[#334155] rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0"
                      title="Mở thư mục này trong Windows File Explorer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Explorer</span>
                    </button>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                Lệnh sẽ chạy: <code className="text-emerald-400 font-mono">git init -b main</code> tại thư mục đã chọn, cho phép bắt đầu quản lý phiên bản và commit code.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setIsInitRepoModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleInitLocalRepo}
                disabled={isInitializingRepo || !initRepoPath.trim()}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-semibold rounded-lg cursor-pointer transition-colors disabled:opacity-50"
              >
                {isInitializingRepo ? 'Đang khởi tạo...' : 'Khởi Tạo Git Ngay'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 14. Modal: Đẩy Mã Nguồn Lên GitHub (Push to Remote) */}
      {isPushToRemoteModalOpen && pushTargetRepo && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#334155] rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <span>Đẩy Mã Nguồn Lên GitHub</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        pushTargetRepo.isPrivate
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {pushTargetRepo.isPrivate ? 'Riêng tư' : 'Công khai'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Đích: <span className="text-emerald-400 font-mono font-medium">{pushTargetRepo.fullName}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPushToRemoteModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Account Info */}
            <div className="bg-[#0B0F17] rounded-xl border border-[#1E293B] p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>
                  Tài khoản đẩy: <strong className="text-slate-100">{pushTargetRepo.ownerName || 'GitHub Account'}</strong>
                </span>
              </div>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5" /> Tự động đính kèm Token PAT xác thực
              </span>
            </div>

            {/* Folder selection */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-300">
                1. Thư mục mã nguồn cục bộ trên máy tính cần đẩy:
              </label>

              {projects.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-1">
                  <span className="text-[11px] text-slate-500 self-center mr-1">Dự án có sẵn:</span>
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPushLocalPath(p.path)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                        pushLocalPath === p.path
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-[#0B0F17] border-[#1E293B] text-slate-400 hover:text-slate-200 hover:border-slate-600'
                      }`}
                    >
                      📁 {p.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={pushLocalPath}
                  onChange={(e) => setPushLocalPath(e.target.value)}
                  placeholder="D:\du-an-cua-ban"
                  className="flex-1 bg-[#0B0F17] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500 selectable shadow-inner"
                />
                <button
                  type="button"
                  onClick={handleBrowseFolderForPush}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-medium transition-colors cursor-pointer shrink-0"
                  title="Duyệt và chọn thư mục từ máy tính (Hộp thoại Windows)"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>Duyệt...</span>
                </button>
                {pushLocalPath.trim() && (
                  <button
                    type="button"
                    onClick={() => handleOpenInExplorer(pushLocalPath)}
                    className="flex items-center gap-1.5 px-3 py-2.5 bg-[#1E293B]/70 hover:bg-[#1E293B] text-slate-300 border border-[#334155] rounded-xl text-xs font-medium transition-colors cursor-pointer shrink-0"
                    title="Mở thư mục này trong Windows File Explorer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Explorer</span>
                  </button>
                )}
              </div>
              <span className="text-[11px] text-slate-500">
                💡 DevDock sẽ tự động chạy <code className="text-slate-400 font-mono">git init</code> nếu thư mục này chưa có kho Git.
              </span>
            </div>

            {/* Push options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-300">2. Tên nhánh đẩy (Branch):</label>
                <input
                  type="text"
                  value={pushBranch}
                  onChange={(e) => setPushBranch(e.target.value)}
                  placeholder="main"
                  className="bg-[#0B0F17] border border-[#1E293B] rounded-xl px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500 selectable"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-300">Tên Remote (thường là origin):</label>
                <input
                  type="text"
                  value={pushRemoteName}
                  onChange={(e) => setPushRemoteName(e.target.value)}
                  placeholder="origin"
                  className="bg-[#0B0F17] border border-[#1E293B] rounded-xl px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500 selectable"
                />
              </div>
            </div>

            {/* Auto Commit Settings */}
            <div className="bg-[#0B0F17]/70 rounded-xl border border-[#1E293B] p-3.5 flex flex-col gap-2.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pushAutoCommit}
                  onChange={(e) => setPushAutoCommit(e.target.checked)}
                  className="accent-emerald-500 w-4 h-4 rounded cursor-pointer"
                />
                <span className="text-slate-200 text-xs font-medium">
                  Tự động lưu và tạo Commit tất cả tệp nếu chưa có commit (git add -A && git commit)
                </span>
              </label>

              {pushAutoCommit && (
                <div className="flex flex-col gap-1 pl-6">
                  <span className="text-[11px] text-slate-400 font-medium">Thông điệp commit:</span>
                  <input
                    type="text"
                    value={pushCommitMessage}
                    onChange={(e) => setPushCommitMessage(e.target.value)}
                    placeholder="Initial commit to GitHub"
                    className="bg-[#111827] border border-[#1E293B] rounded-lg px-3 py-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500 selectable"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer pl-6">
                <input
                  type="checkbox"
                  checked={pushForce}
                  onChange={(e) => setPushForce(e.target.checked)}
                  className="accent-amber-500 w-3.5 h-3.5 rounded cursor-pointer"
                />
                <span className="text-amber-300 text-[11px]">
                  Ghi đè nhánh từ xa (<code className="font-mono">--force</code>) nếu kho trên GitHub đã có commit trước
                </span>
              </label>
            </div>

            {/* Terminal commands manual box */}
            <div className="bg-[#070A0F] rounded-xl border border-[#1E293B] p-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-blue-400" />
                  <span>Hoặc chạy thủ công trên Terminal / PowerShell:</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(getPushShellCommands());
                    setCopiedPushCommands(true);
                    setTimeout(() => setCopiedPushCommands(false), 2000);
                  }}
                  className="px-2 py-1 rounded bg-[#111827] hover:bg-[#1E293B] text-slate-300 text-[11px] flex items-center gap-1 border border-[#1E293B] cursor-pointer"
                >
                  {copiedPushCommands ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Sao chép toàn bộ lệnh</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="text-[11px] font-mono text-emerald-400/90 bg-[#04060A] p-2.5 rounded-lg border border-[#1E293B] overflow-x-auto leading-relaxed selectable whitespace-pre-wrap">
                {getPushShellCommands()}
              </pre>
            </div>

            {/* Result display */}
            {pushToRemoteResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex flex-col gap-2 ${
                  pushToRemoteResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {pushToRemoteResult.success ? (
                    <CheckCheck className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span>{pushToRemoteResult.message}</span>
                </div>
                {pushToRemoteResult.output && (
                  <pre className="p-2 rounded bg-black/40 font-mono text-[10px] text-slate-300 overflow-x-auto max-h-32">
                    {pushToRemoteResult.output}
                  </pre>
                )}
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setIsPushToRemoteModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {pushToRemoteResult?.success ? 'Đóng' : 'Hủy'}
              </button>

              <button
                type="button"
                onClick={handlePushToRemoteRepo}
                disabled={isPushingToRemote || !pushLocalPath.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 cursor-pointer hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPushingToRemote ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang kết nối & đẩy code lên GitHub...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>🚀 1-Click Đẩy Lên GitHub Ngay</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 15. Modal: Mở Thư Mục Mã Nguồn Cục Bộ (Open Custom Folder) */}
      {isOpenFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#334155] rounded-xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-blue-400" />
                <span>Mở Thư Mục Mã Nguồn Cục Bộ</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsOpenFolderModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-300 font-medium">Nhập đường dẫn thư mục dự án trên máy tính:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customFolderPath}
                    onChange={(e) => setCustomFolderPath(e.target.value)}
                    placeholder="D:\ToolTienich hoặc D:\Projects\my-app"
                    className="flex-1 bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-blue-500 selectable"
                  />
                  <button
                    type="button"
                    onClick={handleBrowseFolderForCustom}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0"
                    title="Duyệt và chọn thư mục từ máy tính (Hộp thoại Windows)"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>Duyệt...</span>
                  </button>
                  {customFolderPath.trim() && (
                    <button
                      type="button"
                      onClick={() => handleOpenInExplorer(customFolderPath)}
                      className="flex items-center gap-1.5 px-2.5 py-2 bg-[#1E293B]/70 hover:bg-[#1E293B] text-slate-300 border border-[#334155] rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0"
                      title="Mở thư mục này trong Windows File Explorer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Explorer</span>
                    </button>
                  )}
                </div>
              </div>

              {projects.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-slate-400 text-[11px]">Hoặc chọn nhanh từ dự án hiện có:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {projects.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setCustomFolderPath(p.path)}
                        className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
                          customFolderPath === p.path
                            ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                            : 'bg-[#0B0F17] border-[#1E293B] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-400">
                DevDock sẽ nạp thư mục này vào không gian Git để kiểm tra thay đổi, quản lý commit và đẩy lên Cloud.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setIsOpenFolderModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleOpenCustomFolder}
                disabled={isOpeningFolder || !customFolderPath.trim()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors disabled:opacity-50"
              >
                {isOpeningFolder ? 'Đang mở...' : 'Mở Thư Mục Ngay'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 16. Modal: Quản Lý & Tự Động Sinh .gitignore */}
      {isGitIgnoreModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#334155] rounded-2xl max-w-3xl w-full p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150 max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-100">Quản Lý &amp; Tự Động Sinh Tệp .gitignore</h3>
                    {gitIgnoreInfo?.exists ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold">
                        Đã có tệp .gitignore
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-semibold">
                        Chưa có .gitignore
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono truncate max-w-lg mt-0.5">
                    {activeRepoPath}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGitIgnoreModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#1E293B] text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isLoadingGitIgnore ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                <span>Đang đọc và phân tích cấu hình .gitignore...</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5 overflow-y-auto flex-1 pr-1">
                {/* 1. Auto-Recommendation Banner */}
                {gitIgnoreInfo?.recommendedTemplate && (
                  <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-amber-200">
                      <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span>
                        Hệ thống nhận diện dự án phù hợp với mẫu <strong>{gitIgnoreInfo.recommendedTemplate}</strong> (.vs, bin, obj, dist, node_modules, logs).
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => applyGitIgnoreTemplate(gitIgnoreInfo.recommendedTemplate)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer transition-colors shadow-sm whitespace-nowrap flex items-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>Áp Dụng Mẫu Gợi Ý</span>
                    </button>
                  </div>
                )}

                {/* 2. Quick Presets Templates */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-300">Chọn mẫu cấu hình nhanh (1-Click Chèn):</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'FullStack', label: 'Full-Stack (.NET + Node + Win)', icon: '⚡' },
                      { key: 'DotNet', label: '.NET / C# / VS', icon: '🔷' },
                      { key: 'NodeJs', label: 'Node.js / React / Next / Vite', icon: '🟢' },
                      { key: 'Python', label: 'Python / Venv / Pycache', icon: '🐍' },
                      { key: 'Go', label: 'Golang / Binaries', icon: '🔵' },
                      { key: 'Docker', label: 'Docker / Compose', icon: '🐳' },
                      { key: 'OS_IDEs', label: 'Hệ điều hành & IDEs (.vs, .idea)', icon: '💻' },
                    ].map((tpl) => (
                      <button
                        key={tpl.key}
                        type="button"
                        onClick={() => applyGitIgnoreTemplate(tpl.key)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] border border-[#1E293B] hover:border-amber-500/40 text-slate-300 text-xs cursor-pointer transition-colors"
                      >
                        <span>{tpl.icon}</span>
                        <span>{tpl.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Common Quick Add Tokens */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-400">Thêm nhanh từng mẫu quy tắc:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {['node_modules/', '.vs/', 'bin/', 'obj/', 'dist/', 'build/', '.env*', '*.log', 'Thumbs.db', '.DS_Store', '*.exe', '*.zip'].map((rule) => (
                      <button
                        key={rule}
                        type="button"
                        onClick={() => {
                          if (!gitIgnoreContent.includes(rule)) {
                            setGitIgnoreContent((prev) => (prev.trimEnd() ? prev.trimEnd() + '\n' + rule : rule));
                            onShowToast(`Đã thêm ${rule}`, 'info');
                          }
                        }}
                        className="px-2 py-0.5 rounded bg-[#080C14] hover:bg-slate-800 border border-[#1E293B] text-[11px] font-mono text-slate-400 hover:text-amber-300 cursor-pointer"
                      >
                        + {rule}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Textarea Editor */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-300">Nội dung tệp .gitignore:</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {gitIgnoreContent.split('\n').length} dòng | {gitIgnoreContent.length} ký tự
                    </span>
                  </div>
                  <textarea
                    value={gitIgnoreContent}
                    onChange={(e) => setGitIgnoreContent(e.target.value)}
                    placeholder="# Nhập các quy tắc bỏ qua tệp/thư mục (mỗi quy tắc một dòng)...&#10;node_modules/&#10;.vs/&#10;bin/&#10;obj/&#10;dist/"
                    rows={12}
                    spellCheck={false}
                    className="w-full p-3 rounded-xl bg-[#080C14] border border-[#1E293B] text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500 leading-relaxed resize-y selection:bg-amber-500/30"
                  />
                </div>

                {/* 5. Options */}
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={gitIgnoreAutoCommit}
                    onChange={(e) => setGitIgnoreAutoCommit(e.target.checked)}
                    className="accent-amber-500 rounded cursor-pointer"
                  />
                  <span>Tự động tạo Commit lưu tệp .gitignore vào Git ngay sau khi lưu</span>
                </label>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setIsGitIgnoreModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleSaveGitIgnore}
                disabled={isSavingGitIgnore || isLoadingGitIgnore}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 cursor-pointer hover:brightness-110 transition-all disabled:opacity-50"
              >
                {isSavingGitIgnore ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang lưu .gitignore...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Lưu Tệp .gitignore Ngay</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tự động Stage & Commit (Thay thế browser window.confirm localhost:38420) */}
      {isAutoStageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 select-none">
          <div className="w-full max-w-md bg-[#0e121d] border border-[#20283f] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1b2236] bg-[#131826]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
                  <GitCommit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Tự động Stage & Tạo Commit</h3>
                  <p className="text-[11px] text-slate-400">Git Working Tree</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAutoStageModalOpen(false)}
                className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/5 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col gap-3 text-xs text-slate-300">
              <p className="text-slate-200 font-medium">
                Chưa có tệp nào được đưa vào hàng đợi (<span className="text-emerald-400 font-semibold">Staged</span>).
              </p>
              <p className="text-slate-400 leading-relaxed">
                Bạn có muốn tự động đưa tất cả <span className="text-slate-200 font-semibold">{((repoStatus?.unstagedFiles?.length ?? 0) + (repoStatus?.untrackedFiles?.length ?? 0))} tệp thay đổi</span> vào hàng đợi và tạo commit ngay bây giờ không?
              </p>

              {/* Commit Preview */}
              <div className="p-3 rounded-lg bg-[#080b13] border border-[#1b2236] flex flex-col gap-1">
                <span className="text-[10px] uppercase font-mono text-slate-500 font-semibold tracking-wider">
                  Nội dung Commit:
                </span>
                <span className="text-xs font-mono text-slate-200 truncate">
                  {commitSubject.trim()}
                </span>
                {commitBody.trim() && (
                  <span className="text-[11px] font-mono text-slate-400 line-clamp-2 mt-0.5">
                    {commitBody.trim()}
                  </span>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 border-t border-[#1b2236] bg-[#0b0e17] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsAutoStageModalOpen(false)}
                className="px-3.5 py-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/5 text-xs font-medium transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmAutoStageAndCommit}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Stage tất cả & Tạo Commit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tự Động Tạo GitHub Release */}
      {isCreateReleaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 select-none">
          <div className="w-full max-w-2xl bg-[#0e121d] border border-[#20283f] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1b2236] bg-[#131826]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Tự Động Tạo GitHub Release & Build CI/CD</h3>
                  <p className="text-[11px] text-slate-400">Tự động gắn Tag, kích hoạt GitHub Actions đóng gói .exe & .zip</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateReleaseModalOpen(false)}
                className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/5 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col gap-4 overflow-y-auto text-xs text-slate-300">
              {releaseResultUrl && (
                <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Release đã được khởi tạo thành công trên GitHub!</span>
                    </div>
                    <a
                      href={releaseResultUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 underline font-medium"
                    >
                      <span>Xem trên GitHub</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <p className="text-[11px] text-emerald-400/90 leading-relaxed">
                    Workflow GitHub Actions (<code className="bg-black/30 px-1 py-0.5 rounded text-slate-200">release.yml</code>) đang tự động chạy biên dịch và gắn tệp bộ cài đặt <code className="bg-black/30 px-1 py-0.5 rounded text-slate-200">setup-devdock.exe</code> và <code className="bg-black/30 px-1 py-0.5 rounded text-slate-200">Portable.zip</code> vào Release này.
                  </p>
                </div>
              )}

              {/* Tag & Branch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-blue-400" />
                    <span>Tên Tag Phiên Bản *</span>
                  </label>
                  <input
                    type="text"
                    value={releaseTagName}
                    onChange={(e) => setReleaseTagName(e.target.value)}
                    placeholder="ví dụ: v1.0.0, v1.1.0..."
                    className="w-full px-3 py-2 rounded-lg bg-[#080b13] border border-[#20283f] focus:border-blue-500 focus:outline-none text-slate-100 text-xs font-mono"
                  />
                  <span className="text-[10px] text-slate-500">Quy chuẩn SemVer (bắt đầu bằng ký tự 'v')</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Nhánh Mục Tiêu (Target Branch)</span>
                  </label>
                  <input
                    type="text"
                    value={releaseTargetBranch}
                    onChange={(e) => setReleaseTargetBranch(e.target.value)}
                    placeholder="main hoặc master"
                    className="w-full px-3 py-2 rounded-lg bg-[#080b13] border border-[#20283f] focus:border-emerald-500 focus:outline-none text-slate-100 text-xs font-mono"
                  />
                  <span className="text-[10px] text-slate-500">Nhánh nguồn được chọn để gắn Tag phiên bản</span>
                </div>
              </div>

              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-slate-300">Tiêu đề Bản Phát Hành (Release Title)</label>
                <input
                  type="text"
                  value={releaseTitle}
                  onChange={(e) => setReleaseTitle(e.target.value)}
                  placeholder="Tiêu đề phiên bản nổi bật..."
                  className="w-full px-3 py-2 rounded-lg bg-[#080b13] border border-[#20283f] focus:border-blue-500 focus:outline-none text-slate-100 text-xs"
                />
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-slate-300">Ghi chú Phát hành (Release Notes - Markdown)</label>
                  <button
                    type="button"
                    onClick={handleGenerateReleaseNotes}
                    className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 cursor-pointer font-medium hover:underline"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>✨ Tự động tạo từ các Commit gần nhất</span>
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={releaseBody}
                  onChange={(e) => setReleaseBody(e.target.value)}
                  placeholder="Chi tiết tính năng mới, sửa lỗi, hướng dẫn cài đặt..."
                  className="w-full px-3 py-2 rounded-lg bg-[#080b13] border border-[#20283f] focus:border-blue-500 focus:outline-none text-slate-200 text-xs font-mono leading-relaxed"
                />
              </div>

              {/* Checkboxes */}
              <div className="flex flex-wrap gap-5 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs hover:text-slate-100">
                  <input
                    type="checkbox"
                    checked={releaseDraft}
                    onChange={(e) => setReleaseDraft(e.target.checked)}
                    className="rounded bg-[#080b13] border-[#20283f] text-blue-500 focus:ring-0 focus:ring-offset-0"
                  />
                  <span>Bản nháp (Draft - chỉ mình bạn thấy trước khi publish)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs hover:text-slate-100">
                  <input
                    type="checkbox"
                    checked={releasePrerelease}
                    onChange={(e) => setReleasePrerelease(e.target.checked)}
                    className="rounded bg-[#080b13] border-[#20283f] text-amber-500 focus:ring-0 focus:ring-offset-0"
                  />
                  <span>Đánh dấu là Pre-release (Bản thử nghiệm Beta)</span>
                </label>
              </div>

              {/* Auto Pipeline Callout */}
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/25 flex items-start gap-2.5">
                <Zap className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5 text-[11px] text-blue-300/90 leading-relaxed">
                  <span className="font-semibold text-blue-200">Quy trình tự động hóa hoàn toàn:</span>
                  <span>1. DevDock tạo Git Tag cục bộ và tự động <code className="text-white bg-black/30 px-1 py-0.2 rounded">git push origin {releaseTagName}</code> lên GitHub.</span>
                  <span>2. Gọi GitHub REST API phát hành Release chính thức kèm Release Notes.</span>
                  <span>3. GitHub Actions (<code className="text-white bg-black/30 px-1 py-0.2 rounded">release.yml</code>) lập tức kích hoạt runner Windows tự động biên dịch, tạo bộ cài đặt <strong className="text-white">setup-devdock.exe</strong> & <strong className="text-white">Portable.zip</strong> rồi tải lên trực tiếp Release!</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 border-t border-[#1b2236] bg-[#0b0e17] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCreateReleaseModalOpen(false)}
                className="px-3.5 py-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/5 text-xs font-medium transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleCreateRelease}
                disabled={isCreatingRelease || !releaseTagName.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingRelease ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang tạo & đẩy Release...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>🚀 Xuất Bản Release Ngay</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
