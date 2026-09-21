import React, { useState, useEffect } from 'react';
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
} from '../types';
import { api } from '../services/api';

type GitTab = 'changes' | 'history' | 'branches' | 'tags' | 'cloud';

interface GitPageProps {
  projects: ProjectItem[];
  gitAccounts?: GitAccount[];
  sshProfiles?: SshProfile[];
  activeRepoPath: string;
  onSelectRepoPath: (path: string) => void;
  onRefreshProjects?: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const GitPage: React.FC<GitPageProps> = ({
  projects,
  gitAccounts: propGitAccounts,
  sshProfiles = [],
  activeRepoPath,
  onSelectRepoPath,
  onRefreshProjects,
  onShowToast,
}) => {
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

  const loadFileDiff = async (repo: string, file: GitFileStatus) => {
    setSelectedFile(file);
    try {
      const diff = await api.getFileDiff(repo, file.path, file.isStaged);
      setDiffResult(diff);
    } catch (err: any) {
      setDiffResult(null);
    }
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
    if (!confirm(`Hủy bỏ toàn bộ thay đổi trong '${filePath}'? Hành động này không thể hoàn tác.`)) return;
    try {
      await api.discardChanges(activeRepoPath, filePath);
      await loadRepoData(activeRepoPath);
      onShowToast(`Đã hủy thay đổi trong ${filePath}`, 'info');
    } catch (err: any) {
      onShowToast(err.message || 'Hủy thay đổi thất bại', 'error');
    }
  };

  const handleCommit = async () => {
    if (!activeRepoPath || !commitSubject.trim()) {
      onShowToast('Vui lòng nhập thông điệp commit', 'error');
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
      onShowToast('Đã tạo commit thành công', 'success');
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
    if (!confirm(`Xóa nhánh '${bName}'?`)) return;
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
    if (!confirm(`Xóa remote '${name}'?`)) return;
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
    if (!confirm(`Xóa tag '${tagName}'?`)) return;
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
    if (!confirm(`Xóa bỏ vĩnh viễn stash@{${index}}?`)) return;
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
    const targetPath = path !== undefined ? path : (cicdTargetRepoPath || activeRepoPath);
    const targetAcc = accountId !== undefined ? accountId : (cicdAccountId || selectedAccountId);
    const targetRemote = remoteName !== undefined ? remoteName : cicdRemoteFullName;

    setIsInspectingRepo(true);
    setRepoInspection(null);

    try {
      const res = await api.inspectRepoTech({
        repoPath: targetPath,
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
          setCicdPostScript(`pip install -r requirements.txt\n${res.startCommand || 'uvicorn main:app --host 0.0.0.0 --port 8000 &'} || true`);
        } else if (res.techStack === 'Go') {
          setCicdPostScript('go build -o app\n./app &');
        }

        // Auto-configure recommendations
        if (res.techStack === 'NodeJs') {
          setCicdGeneratePm2Config(true);
        } else if (res.techStack === 'DotNet') {
          setCicdGenerateSystemd(true);
        }
      }
    } catch (err: any) {
      console.warn('Inspection failed:', err);
    } finally {
      setIsInspectingRepo(false);
    }
  };

  const openCicdModalForRepo = (repoPath?: string, repoName?: string, accountId?: string, remoteFullName?: string) => {
    const finalPath = repoPath !== undefined ? repoPath : activeRepoPath;
    const finalName = repoName || (finalPath ? (projects.find((p) => p.path === finalPath)?.name || finalPath) : 'Dự Án');
    const finalAcc = accountId || selectedAccountId;
    const finalRemote = remoteFullName || '';

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
    const targetFolder = cicdTargetRepoPath || activeRepoPath;
    if (!targetFolder) {
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
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0B0F17]">
      {/* Top Bar: Repo selector, Current Branch, Quick Push/Pull/Fetch */}
      <div className="h-12 border-b border-[#1E293B] bg-[#0F172A] px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-emerald-400" />
            <select
              value={activeRepoPath}
              onChange={(e) => onSelectRepoPath(e.target.value)}
              className="bg-[#0B0F17] text-slate-200 text-xs rounded-lg px-2.5 py-1.5 border border-[#1E293B] focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
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
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#111827] hover:bg-[#1E293B] text-slate-200 border border-[#334155] text-xs font-medium cursor-pointer transition-colors"
              title="Mở thư mục mã nguồn bất kỳ trên máy tính"
            >
              <FolderGit2 className="w-3.5 h-3.5 text-blue-400" />
              <span>+ Mở Thư Mục Cục Bộ</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setInitRepoPath(activeRepoPath || 'D:\\ToolTienich');
                setIsInitRepoModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-medium cursor-pointer transition-colors"
              title="Khởi tạo kho Git (git init) cho thư mục"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Khởi tạo Git</span>
            </button>
          </div>

          {repoStatus && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B0F17] border border-[#1E293B] text-xs font-mono text-emerald-400">
              <GitBranch className="w-3.5 h-3.5" />
              <span className="font-semibold">{repoStatus.currentBranch}</span>
              {repoStatus.aheadCount > 0 && (
                <span className="text-emerald-300 text-[10px] ml-1">↑{repoStatus.aheadCount}</span>
              )}
              {repoStatus.behindCount > 0 && (
                <span className="text-amber-400 text-[10px] ml-1">↓{repoStatus.behindCount}</span>
              )}
            </div>
          )}
        </div>

        {/* Global Git Actions */}
        <div className="flex items-center gap-2">
          {/* Quick Remote / Cloud actions requested by user */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('cloud');
              if (selectedAccountId) {
                loadCloudRepos(selectedAccountId, cloudSearch);
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold cursor-pointer transition-colors"
            title="Tải về danh sách Repository từ GitHub/GitLab (Fetch Cloud Repos)"
          >
            <Cloud className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tải DS Repo (Fetch)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateCloudRepoModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold cursor-pointer transition-colors"
            title="Tạo kho lưu trữ mới trên Cloud GitHub/GitLab"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tạo Repo Mới</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCicdResult(null);
              setIsCicdModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 text-purple-200 border border-purple-500/40 text-xs font-semibold cursor-pointer transition-colors"
            title="Tự động thiết lập GitHub Actions CI/CD triển khai ứng dụng lên máy chủ Server"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>CI/CD Server</span>
          </button>

          <div className="h-4 w-px bg-slate-700 mx-0.5" />

          <button
            type="button"
            onClick={handleFetch}
            disabled={loading || !activeRepoPath}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1E293B] hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer transition-colors disabled:opacity-50"
            title="Đồng bộ cập nhật mới từ Remote (Fetch)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Đồng bộ (Fetch)</span>
          </button>

          <button
            type="button"
            onClick={handlePull}
            disabled={loading || !activeRepoPath}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1E293B] hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer transition-colors disabled:opacity-50"
            title="Kéo thay đổi mới về nhánh hiện tại (Pull)"
          >
            <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
            <span>Kéo về (Pull)</span>
          </button>

          <button
            type="button"
            onClick={handlePush}
            disabled={loading || !activeRepoPath}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
            title="Đẩy các commit lên remote (Push)"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>Đẩy lên (Push)</span>
          </button>
        </div>
      </div>

      {/* Sub-Tabs Navigation Bar */}
      <div className="h-10 border-b border-[#1E293B] bg-[#070A0F] px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('changes')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'changes'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#111827]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Thay đổi</span>
            {totalChanges > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                {totalChanges}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#111827]'
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
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'branches'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#111827]'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Nhánh & Remotes</span>
            <span className="text-slate-500 text-[10px] font-mono">({branches.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tags')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'tags'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#111827]'
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
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'cloud'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#111827]'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-cyan-400" />
            <span>Kho Remote (GitHub/GitLab/Fetch)</span>
            <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-mono">
              {remoteRepos.length > 0 ? remoteRepos.length : 'API'}
            </span>
          </button>
        </div>

        {/* Quick Stash & Git Init shortcut */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setInitRepoPath(activeRepoPath);
              setIsInitRepoModalOpen(true);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#111827] hover:bg-[#1E293B] text-slate-300 text-[11px] font-mono border border-[#1E293B] cursor-pointer"
            title="Khởi tạo kho Git cục bộ tại thư mục này (git init)"
          >
            <span>+ git init</span>
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
      <div className="flex-1 overflow-hidden flex">
        {/* ==================== TAB 1: CHANGES ==================== */}
        {activeTab === 'changes' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Column: Changed Files List & Commit Box */}
            <div className="w-80 border-r border-[#1E293B] bg-[#070A0F] flex flex-col justify-between flex-shrink-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
                {/* Staged files */}
                <div>
                  <div className="flex items-center justify-between pb-1.5 mb-1 text-xs font-semibold text-slate-300 border-b border-[#1E293B]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>Đã Stage ({repoStatus?.stagedFiles.length || 0})</span>
                    </div>
                    {repoStatus && repoStatus.stagedFiles.length > 0 && (
                      <button
                        type="button"
                        onClick={handleUnstageAll}
                        className="text-[10px] text-slate-400 hover:text-rose-400 flex items-center gap-1 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                        <span>Bỏ tất cả</span>
                      </button>
                    )}
                  </div>

                  {repoStatus?.stagedFiles.map((file) => (
                    <div
                      key={file.path}
                      onClick={() => loadFileDiff(activeRepoPath, file)}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer group transition-colors ${
                        selectedFile?.path === file.path
                          ? 'bg-[#111827] text-emerald-400 font-medium border border-emerald-500/30'
                          : 'text-slate-300 hover:bg-[#111827]'
                      }`}
                    >
                      <span className="truncate flex-1 font-mono text-[11px]">{file.path}</span>
                      <div className="flex items-center gap-1">
                        <span className="px-1 text-[9px] font-mono rounded bg-emerald-500/20 text-emerald-400">
                          {file.status[0]}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnstageFile(file.path);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Bỏ khỏi stage"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {repoStatus?.stagedFiles.length === 0 && (
                    <div className="text-[11px] text-slate-500 py-2 italic">Chưa có tệp nào được stage</div>
                  )}
                </div>

                {/* Unstaged files */}
                <div>
                  <div className="flex items-center justify-between pb-1.5 mb-1 text-xs font-semibold text-slate-300 border-b border-[#1E293B]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>Chưa Stage ({repoStatus?.unstagedFiles.length || 0})</span>
                    </div>
                    {repoStatus && repoStatus.unstagedFiles.length > 0 && (
                      <button
                        type="button"
                        onClick={handleStageAll}
                        className="text-[10px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Stage tất cả</span>
                      </button>
                    )}
                  </div>

                  {repoStatus?.unstagedFiles.map((file) => (
                    <div
                      key={file.path}
                      onClick={() => loadFileDiff(activeRepoPath, file)}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer group transition-colors ${
                        selectedFile?.path === file.path
                          ? 'bg-[#111827] text-emerald-400 font-medium border border-emerald-500/30'
                          : 'text-slate-300 hover:bg-[#111827]'
                      }`}
                    >
                      <span className="truncate flex-1 font-mono text-[11px]">{file.path}</span>
                      <div className="flex items-center gap-1">
                        <span className="px-1 text-[9px] font-mono rounded bg-amber-500/20 text-amber-400">
                          {file.status[0]}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStageFile(file.path);
                          }}
                          className="p-1 text-slate-400 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Đưa vào stage"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDiscardChanges(file.path);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Hủy thay đổi"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {repoStatus?.unstagedFiles.length === 0 && (
                    <div className="text-[11px] text-slate-500 py-2 italic">Không có thay đổi chưa stage</div>
                  )}
                </div>

                {/* Untracked files */}
                {repoStatus && repoStatus.untrackedFiles.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between pb-1.5 mb-1 text-xs font-semibold text-slate-300 border-b border-[#1E293B]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        <span>Tệp mới chưa theo dõi ({repoStatus.untrackedFiles.length})</span>
                      </div>
                    </div>
                    {repoStatus.untrackedFiles.map((file) => (
                      <div
                        key={file.path}
                        onClick={() => loadFileDiff(activeRepoPath, file)}
                        className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer group transition-colors ${
                          selectedFile?.path === file.path
                            ? 'bg-[#111827] text-emerald-400 font-medium border border-emerald-500/30'
                            : 'text-slate-300 hover:bg-[#111827]'
                        }`}
                      >
                        <span className="truncate flex-1 font-mono text-[11px]">{file.path}</span>
                        <div className="flex items-center gap-1">
                          <span className="px-1 text-[9px] font-mono rounded bg-blue-500/20 text-blue-400">
                            U
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStageFile(file.path);
                            }}
                            className="p-1 text-slate-400 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Đưa vào stage"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Commit Input Box */}
              <div className="p-3 border-t border-[#1E293B] bg-[#0F172A] flex flex-col gap-2 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-300">Thông điệp Commit:</span>
                  <button
                    type="button"
                    onClick={handleAiGenerateCommit}
                    disabled={isGeneratingAiCommit || !activeRepoPath}
                    className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-medium transition-colors cursor-pointer"
                    title="Phân tích thay đổi git và sinh thông điệp commit tự động bằng AI"
                  >
                    <Sparkles className={`w-3 h-3 ${isGeneratingAiCommit ? 'animate-spin text-cyan-400' : 'text-cyan-400'}`} />
                    <span>{isGeneratingAiCommit ? 'AI đang viết...' : '✨ AI Viết Commit'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={commitSubject}
                  onChange={(e) => setCommitSubject(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.ctrlKey && e.key === 'Enter') handleCommit();
                  }}
                  placeholder="Tiêu đề commit (ngắn gọn)..."
                  className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                />
                <textarea
                  value={commitBody}
                  onChange={(e) => setCommitBody(e.target.value)}
                  rows={2}
                  placeholder="Mô tả chi tiết bổ sung (tùy chọn)..."
                  className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-emerald-500 resize-none font-mono text-[11px]"
                />
                <button
                  type="button"
                  onClick={handleCommit}
                  disabled={!commitSubject.trim() || !activeRepoPath}
                  className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Tạo Commit (Ctrl+Enter)</span>
                </button>
              </div>
            </div>

            {/* Right Column: Diff Viewer */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#0B0F17]">
              {selectedFile ? (
                <>
                  <div className="h-10 border-b border-[#1E293B] bg-[#0D131F] px-4 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-mono font-medium text-slate-200">
                        {selectedFile.path}
                      </span>
                      {selectedFile.isStaged && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                          Staged
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 bg-[#111827] p-0.5 rounded-lg border border-[#1E293B]">
                      <button
                        type="button"
                        onClick={() => setDiffMode('unified')}
                        className={`px-2 py-0.5 text-xs rounded font-medium cursor-pointer ${
                          diffMode === 'unified'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Gộp dòng
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiffMode('split')}
                        className={`px-2 py-0.5 text-xs rounded font-medium cursor-pointer ${
                          diffMode === 'split'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Chia đôi
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto p-4 font-mono text-xs select-text">
                    {diffResult?.hunks.map((hunk, hIdx) => (
                      <div key={hIdx} className="mb-4 border border-[#1E293B] rounded-lg overflow-hidden">
                        <div className="bg-[#111827] px-3 py-1 text-slate-500 text-[11px] border-b border-[#1E293B]">
                          {hunk.header}
                        </div>
                        {diffMode === 'unified' ? (
                          <div className="divide-y divide-[#1E293B]/20">
                            {hunk.lines.map((line, lIdx) => (
                              <div
                                key={lIdx}
                                className={`flex items-start px-2 py-0.5 ${
                                  line.type === 'Added'
                                    ? 'bg-emerald-950/40 text-emerald-300'
                                    : line.type === 'Deleted'
                                    ? 'bg-rose-950/40 text-rose-300'
                                    : 'text-slate-400'
                                }`}
                              >
                                <span className="w-8 text-right pr-2 text-slate-600 select-none text-[10px]">
                                  {line.oldLineNumber || ''}
                                </span>
                                <span className="w-8 text-right pr-3 text-slate-600 select-none text-[10px]">
                                  {line.newLineNumber || ''}
                                </span>
                                <span className="w-4 select-none">
                                  {line.type === 'Added' ? '+' : line.type === 'Deleted' ? '-' : ' '}
                                </span>
                                <span className="flex-1 whitespace-pre-wrap break-all">
                                  {line.content}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 divide-x divide-[#1E293B]">
                            <div className="divide-y divide-[#1E293B]/20">
                              {hunk.lines
                                .filter((l) => l.type !== 'Added')
                                .map((line, lIdx) => (
                                  <div
                                    key={lIdx}
                                    className={`flex items-start px-2 py-0.5 ${
                                      line.type === 'Deleted'
                                        ? 'bg-rose-950/40 text-rose-300'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    <span className="w-8 text-right pr-2 text-slate-600 select-none text-[10px]">
                                      {line.oldLineNumber || ''}
                                    </span>
                                    <span className="flex-1 whitespace-pre-wrap break-all">
                                      {line.content}
                                    </span>
                                  </div>
                                ))}
                            </div>
                            <div className="divide-y divide-[#1E293B]/20">
                              {hunk.lines
                                .filter((l) => l.type !== 'Deleted')
                                .map((line, lIdx) => (
                                  <div
                                    key={lIdx}
                                    className={`flex items-start px-2 py-0.5 ${
                                      line.type === 'Added'
                                        ? 'bg-emerald-950/40 text-emerald-300'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    <span className="w-8 text-right pr-2 text-slate-600 select-none text-[10px]">
                                      {line.newLineNumber || ''}
                                    </span>
                                    <span className="flex-1 whitespace-pre-wrap break-all">
                                      {line.content}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {(!diffResult || diffResult.hunks.length === 0) && (
                      <div className="p-8 text-center text-slate-500 italic">
                        Không có diff nào để hiển thị cho tệp này.
                      </div>
                    )}
                  </div>
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
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Commit list */}
            <div className="w-[420px] border-r border-[#1E293B] bg-[#070A0F] flex flex-col flex-shrink-0">
              <div className="p-3 border-b border-[#1E293B] flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Lọc commit theo thông điệp, tác giả, hash..."
                    className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-lg pl-8 pr-3 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-[#1E293B]/40">
                {filteredCommits.map((c) => {
                  const isSelected = selectedCommitHash === c.hash;
                  return (
                    <div
                      key={c.hash}
                      onClick={() => handleInspectCommit(c.hash)}
                      className={`p-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#111827] border-l-2 border-emerald-500'
                          : 'hover:bg-[#0D131F]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[11px] font-semibold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30">
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
            <div className="flex-1 flex flex-col overflow-hidden bg-[#0B0F17]">
              {selectedCommitHash && commitDetails ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Commit Inspector Header */}
                  <div className="p-4 border-b border-[#1E293B] bg-[#0D131F] flex flex-col gap-3 flex-shrink-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-100 mb-1">
                          {commitDetails.commit.subject}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                          <span className="text-emerald-400">{commitDetails.commit.hash}</span>
                          <span>•</span>
                          <span>{commitDetails.commit.authorName} ({commitDetails.commit.authorEmail})</span>
                          <span>•</span>
                          <span>{new Date(commitDetails.commit.date).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Action buttons: Cherry-pick, Revert, Reset */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCherryPick(commitDetails.commit.hash)}
                          className="px-2.5 py-1 rounded-lg bg-[#111827] hover:bg-[#1E293B] text-slate-300 text-xs font-medium border border-[#1E293B] flex items-center gap-1.5 cursor-pointer"
                          title="Áp dụng commit này vào nhánh hiện tại"
                        >
                          <GitMerge className="w-3.5 h-3.5 text-purple-400" />
                          <span>Cherry-pick</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRevert(commitDetails.commit.hash)}
                          className="px-2.5 py-1 rounded-lg bg-[#111827] hover:bg-[#1E293B] text-slate-300 text-xs font-medium border border-[#1E293B] flex items-center gap-1.5 cursor-pointer"
                          title="Tạo commit hoàn tác commit này"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                          <span>Revert</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setResetCommitRef(commitDetails.commit.hash);
                            setIsResetModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-xs font-medium border border-rose-500/30 flex items-center gap-1.5 cursor-pointer"
                          title="Đặt lại HEAD về commit này"
                        >
                          <CornerDownRight className="w-3.5 h-3.5" />
                          <span>Reset HEAD</span>
                        </button>
                      </div>
                    </div>

                    {commitDetails.commit.body && (
                      <div className="bg-[#0B0F17] p-2.5 rounded-lg border border-[#1E293B] text-slate-300 text-xs whitespace-pre-wrap font-mono">
                        {commitDetails.commit.body}
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                      <span>Thay đổi: {commitDetails.changedFiles.length} tệp</span>
                    </div>
                  </div>

                  {/* Inspector Diff Preview & Changed files */}
                  <div className="flex-1 overflow-auto p-4 flex flex-col gap-4 select-text">
                    <div className="bg-[#111827] rounded-lg border border-[#1E293B] overflow-hidden">
                      <div className="px-3 py-1.5 bg-[#0B0F17] border-b border-[#1E293B] text-xs font-semibold text-slate-300">
                        Danh sách tệp thay đổi trong commit
                      </div>
                      <div className="divide-y divide-[#1E293B]/40">
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
                    <div className="bg-[#070A0F] rounded-lg border border-[#1E293B] p-3">
                      <div className="text-xs font-semibold text-slate-400 mb-2 font-mono">Full Patch Diff:</div>
                      <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {commitDetails.diff}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                  <GitCommit className="w-12 h-12 mb-3 text-slate-700" />
                  <p className="text-sm font-medium text-slate-400">Chọn commit từ danh sách để kiểm tra chi tiết</p>
                  <p className="text-xs text-slate-600 max-w-sm mt-1">
                    Xem toàn bộ patch, danh sách tệp sửa đổi, thống kê dòng thêm/bớt và thực hiện Cherry-pick, Revert hoặc Reset.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 3: BRANCHES & REMOTES ==================== */}
        {activeTab === 'branches' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full flex flex-col gap-6">
            {/* Section 1: Branches */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <GitBranch className="w-5 h-5 text-emerald-400" />
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111827] hover:bg-[#1E293B] text-slate-300 text-xs font-semibold border border-[#1E293B] cursor-pointer"
                  >
                    <GitMerge className="w-4 h-4 text-purple-400" />
                    <span>Hòa nhập (Merge)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsRebaseModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111827] hover:bg-[#1E293B] text-slate-300 text-xs font-semibold border border-[#1E293B] cursor-pointer"
                  >
                    <CornerDownRight className="w-4 h-4 text-amber-400" />
                    <span>Tái thiết lập (Rebase)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsNewBranchModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-semibold cursor-pointer shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
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
                      className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                        b.isCurrent
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                          : 'bg-[#111827] border-[#1E293B] text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <GitBranch className={`w-4 h-4 ${b.isCurrent ? 'text-emerald-400' : 'text-slate-500'}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs">{b.name}</span>
                            {b.isCurrent && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
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
                            className="px-2.5 py-1 rounded bg-[#0B0F17] hover:bg-[#1E293B] text-slate-300 text-xs border border-[#1E293B] cursor-pointer"
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
                          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
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
          <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full flex flex-col gap-6">
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

                <button
                  type="button"
                  onClick={() => setIsCreateTagModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-semibold cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo Tag mới</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tags.map((t) => (
                  <div
                    key={t.name}
                    className="p-3.5 rounded-xl bg-[#111827] border border-[#1E293B] flex items-center justify-between hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Tag className="w-4 h-4 text-emerald-400" />
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
                        className="px-2.5 py-1 rounded bg-[#0B0F17] hover:bg-[#1E293B] text-slate-300 text-xs border border-[#1E293B] flex items-center gap-1 cursor-pointer"
                        title="Đẩy tag này lên remote"
                      >
                        <ArrowUp className="w-3 h-3 text-emerald-400" />
                        <span>Push</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteTag(t.name)}
                        className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                        title="Xóa Tag"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {tags.length === 0 && (
                  <div className="col-span-2 py-10 text-center text-slate-500 text-xs italic border border-dashed border-[#1E293B] rounded-xl">
                    Chưa có Tag nào được gắn trong kho này.
                  </div>
                )}
              </div>
            </div>

            {/* Stashes Section */}
            <div className="flex flex-col gap-4 pt-4 border-t border-[#1E293B]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Archive className="w-5 h-5 text-amber-400" />
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
                      className="px-3 py-1.5 rounded-lg bg-[#111827] hover:bg-[#1E293B] text-amber-400 text-xs font-semibold border border-[#1E293B] cursor-pointer"
                    >
                      Lấy ra & Xóa gần nhất (Pop)
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsStashModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 text-xs font-semibold cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Lưu tạm mới (Stash)</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {stashes.map((s) => (
                  <div
                    key={s.index}
                    className="p-3.5 rounded-xl bg-[#111827] border border-[#1E293B] flex items-center justify-between group hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-[#0B0F17] text-amber-400 border border-[#1E293B] flex items-center justify-center font-mono text-xs font-bold">
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
          <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full flex flex-col gap-5">
            {/* Header & Account Selection */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-blue-400" />
                  <span>Kho Lưu Trữ Cloud & Tích Hợp API</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Duyệt kho từ xa, 1-Click Clone, Tạo kho mới trên Cloud và Xuất bản dự án cục bộ lên GitHub/GitLab.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="bg-[#111827] text-slate-200 text-xs rounded-lg px-3 py-1.5 border border-[#1E293B] focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111827] hover:bg-[#1E293B] text-slate-200 text-xs font-semibold border border-[#1E293B] cursor-pointer disabled:opacity-50"
                  title="Xuất bản kho cục bộ đang mở lên tài khoản Cloud này"
                >
                  <UploadCloud className="w-4 h-4 text-emerald-400" />
                  <span>Xuất bản Kho Cục Bộ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCreateCloudRepoModalOpen(true)}
                  disabled={accounts.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo Kho Mới trên Cloud</span>
                </button>
              </div>
            </div>

            {/* Rate limit & Search bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 w-full">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={cloudSearch}
                    onChange={(e) => setCloudSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') loadCloudRepos(selectedAccountId, cloudSearch);
                    }}
                    placeholder="Tìm kiếm kho từ xa trên tài khoản Cloud (nhấn Enter)..."
                    className="w-full bg-[#111827] border border-[#1E293B] rounded-lg pl-9 pr-3 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => loadCloudRepos(selectedAccountId, cloudSearch)}
                  disabled={loadingCloudRepos || !selectedAccountId}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold cursor-pointer transition-colors shrink-0 disabled:opacity-50"
                  title="Tải về danh sách tất cả các Repository từ GitHub/GitLab (Fetch)"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loadingCloudRepos ? 'animate-spin' : ''}`} />
                  <span>Fetch Repos</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCicdResult(null);
                    setIsCicdModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 text-purple-200 border border-purple-500/40 text-xs font-semibold cursor-pointer shrink-0"
                  title="Tự động thiết lập CI/CD triển khai ứng dụng lên server qua GitHub Actions"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>CI/CD Server</span>
                </button>
              </div>

              {rateLimitInfo && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#111827] border border-[#1E293B] text-xs font-mono text-slate-400 shrink-0">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    API Quota: <strong className="text-emerald-400">{rateLimitInfo.remaining}</strong> / {rateLimitInfo.limit}
                  </span>
                </div>
              )}
            </div>

            {/* Cloud Repos Grid */}
            {accounts.length === 0 ? (
              <div className="py-20 text-center text-slate-500 text-xs border border-dashed border-[#1E293B] rounded-2xl flex flex-col items-center justify-center gap-2">
                <Cloud className="w-12 h-12 text-slate-700 mb-1" />
                <span className="font-semibold text-slate-300">Chưa cấu hình tài khoản Git Provider</span>
                <p className="text-slate-500 max-w-sm">
                  Vui lòng chuyển tới tab Cài đặt để thêm tài khoản GitHub, GitLab hoặc Gitea với Personal Access Token.
                </p>
              </div>
            ) : loadingCloudRepos ? (
              <div className="py-20 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                <span>Đang kết nối API và tải danh sách kho lưu trữ Cloud...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {remoteRepos.map((repo) => (
                  <div
                    key={repo.id}
                    className="p-4 rounded-xl bg-[#111827] border border-[#1E293B] flex flex-col justify-between hover:border-slate-700 transition-all group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="font-bold text-xs text-slate-100 group-hover:text-blue-400 transition-colors truncate">
                          {repo.name}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-mono border ${
                            repo.isPrivate
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {repo.isPrivate ? 'Riêng tư' : 'Công khai'}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 line-clamp-2 mb-3 min-h-[32px]">
                        {repo.description || 'Không có phần mô tả.'}
                      </p>

                      <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono mb-3">
                        {repo.language && (
                          <span className="flex items-center gap-1 text-slate-300">
                            <span className="w-2 h-2 rounded-full bg-blue-400" />
                            {repo.language}
                          </span>
                        )}
                        <span>⭐ {repo.starsCount}</span>
                        <span>🔀 {repo.forksCount}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#1E293B] flex items-center justify-between">
                      <a
                        href={repo.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                        title="Mở trên trình duyệt"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Mở web</span>
                      </a>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            openCicdModalForRepo(
                              activeRepoPath,
                              repo.name,
                              selectedAccountId,
                              repo.fullName
                            );
                          }}
                          className="px-2 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                          title="Tự động phân tích mã nguồn và thiết lập CI/CD cho repo này"
                        >
                          <Zap className="w-3.5 h-3.5 text-cyan-400" />
                          <span>CI/CD</span>
                        </button>

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
                          className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                          title="Đẩy mã nguồn từ máy tính lên kho GitHub này"
                        >
                          <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Đẩy Code</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setCloneUrl(repo.cloneUrl);
                            setCloneProjectName(repo.name);
                            setCloneDestPath(`D:\\Projects\\${repo.name}`);
                            setIsCloneModalOpen(true);
                          }}
                          className="px-2 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <DownloadCloud className="w-3.5 h-3.5" />
                          <span>Clone</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {remoteRepos.length === 0 && (
                  <div className="col-span-3 py-16 text-center text-slate-500 text-xs italic border border-dashed border-[#1E293B] rounded-xl">
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
                <input
                  type="text"
                  value={cloneDestPath}
                  onChange={(e) => setCloneDestPath(e.target.value)}
                  placeholder="D:\Projects\repo-name"
                  className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-blue-500"
                />
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
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-slate-400">
                      Kho mục tiêu: <span className="font-mono text-cyan-300 font-semibold">{cicdTargetRepoName || cicdRemoteFullName || activeRepoPath || 'Kho hiện tại'}</span>
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

                  <p className="text-[11px] text-slate-400">
                    Vui lòng thêm các khóa bí mật sau vào GitHub Repository để Workflow có thể SSH và triển khai mã nguồn lên máy chủ:
                  </p>

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
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 text-xs font-bold hover:scale-105 transition-all cursor-pointer shadow-glow-emerald"
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
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs shadow-glow-emerald cursor-pointer hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSettingUpCicd ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang thiết lập CI/CD &amp; sinh cấu hình...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>🚀 Tạo &amp; Cài Đặt CI/CD Ngay</span>
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
                <input
                  type="text"
                  value={initRepoPath}
                  onChange={(e) => setInitRepoPath(e.target.value)}
                  placeholder="D:\Projects\my-app"
                  className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500 selectable"
                />
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

              <input
                type="text"
                value={pushLocalPath}
                onChange={(e) => setPushLocalPath(e.target.value)}
                placeholder="D:\du-an-cua-ban"
                className="bg-[#0B0F17] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500 selectable shadow-inner"
              />
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
                <input
                  type="text"
                  value={customFolderPath}
                  onChange={(e) => setCustomFolderPath(e.target.value)}
                  placeholder="D:\ToolTienich hoặc D:\Projects\my-app"
                  className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-blue-500 selectable"
                />
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
    </div>
  );
};
