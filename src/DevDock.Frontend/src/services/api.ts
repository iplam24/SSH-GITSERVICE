import {
  ProjectItem,
  ProjectCommandResult,
  GitRepoStatus,
  GitCommitItem,
  GitBranchItem,
  GitDiffResult,
  SshProfile,
  SshConnectionTestResult,
  SshCommandResult,
  SshListeningPortItem,
  SshServerOverview,
  SshDomainItem,
  SshNginxSiteItem,
  SshNginxSaveRequest,
  SshCertbotCertificateItem,
  SshGitDeploymentItem,
  SshProcessItem,
  SshServerMetadata,
  ShellDescriptor,
  TerminalSessionInfo,
  AppSettings,
  GitAccount,
  SystemMetrics,
  CommandPaletteItem,
  TerminalShellType,
  RemoteRepoItem,
  CreateRemoteRepoRequest,
  PublishLocalRepoRequest,
  CloneRepoRequest,
  PushToRemoteRepoRequest,
  GitPushResult,
  GitRemoteItem,
  GitTagItem,
  GitStashItem,
  GitCommitDetailResult,
  GitRateLimitInfo,
  GitGlobalConfig,
  SetupDiagnostics,
  SystemIntegrationStatus,
  ApplySetupRequest,
  SetupActionResult,
  AiProviderConfig,
  SaveAiProviderRequest,
  AiTestResult,
  AiChatRequest,
  AiChatResponse,
  AiGenerateCommitRequest,
  RemoteFileItem,
  RemoteFileContent,
  SftpUploadRequest,
  SftpDeleteRequest,
  SftpCreateDirRequest,
  InspectRepoRequest,
  RepoTechInspectionResult,
  GithubActionSetupRequest,
  GithubActionSetupResult,
  GitIgnoreInfo,
  SaveGitIgnoreRequest,
  AddToGitIgnoreRequest,
  PortListeningItem,
  KillProcessResult,
  HostEntryItem,
  SystemEnvVariableItem,
  DotEnvCompareResult,
  SyncGithubSecretsRequest,
  SyncGithubSecretsResult,
  CreateGithubReleaseRequest,
  CreateGithubReleaseResult,
  GithubReleaseItem,
  RepoFileNode,
  RepoFileContentResult,
  DockerContainerItem,
  DockerImageItem,
  DockerCommandResult,
  DockerAvailabilityResult,
  PluginManifest,
} from '../types';

const API_BASE = window.location.port === '5173' ? 'http://127.0.0.1:38420' : '';

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  const rawText = await res.text().catch(() => '');
  let data: any = null;
  if (rawText && rawText.trim()) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = rawText;
    }
  }

  if (!res.ok) {
    let errText = '';
    if (data && typeof data === 'object') {
      errText = data.message || data.error || data.title || JSON.stringify(data);
    } else if (typeof data === 'string' && data.trim()) {
      errText = data.trim();
    }
    throw new Error(errText || `Request failed with status ${res.status}`);
  }

  return (data ?? {}) as T;
}

export const api = {
  // Projects
  getProjects: () => req<ProjectItem[]>('/api/projects'),
  getProject: (id: string) => req<ProjectItem>(`/api/projects/${id}`),
  saveProject: (project: Partial<ProjectItem>) =>
    req<ProjectItem>('/api/projects', { method: 'POST', body: JSON.stringify(project) }),
  deleteProject: (id: string) => req<{ success: boolean }>(`/api/projects/${id}`, { method: 'DELETE' }),
  detectProject: (path: string) =>
    req<ProjectItem>('/api/projects/detect', { method: 'POST', body: JSON.stringify({ path }) }),
  runProjectCommand: (projectId: string, commandKey: string, customCommand?: string) =>
    req<ProjectCommandResult>('/api/projects/run', {
      method: 'POST',
      body: JSON.stringify({ projectId, commandKey, customCommand }),
    }),
  openExplorer: (path: string) =>
    req<void>('/api/projects/open-explorer', { method: 'POST', body: JSON.stringify({ path }) }),
  openEditor: (path: string, editor = 'code') =>
    req<void>('/api/projects/open-editor', { method: 'POST', body: JSON.stringify({ path, editor }) }),
  openTerminal: (path: string) =>
    req<{ success?: boolean }>('/api/projects/open-terminal', { method: 'POST', body: JSON.stringify({ path }) }),
  browseFolder: (initialPath?: string) =>
    req<{ folder: string | null; canceled: boolean }>('/api/system/browse-folder', {
      method: 'POST',
      body: JSON.stringify({ initialPath }),
    }),

  // Git
  getGitStatus: (repoPath: string) =>
    req<GitRepoStatus>(`/api/git/status?repoPath=${encodeURIComponent(repoPath)}`),
  stageFile: (repoPath: string, filePath: string) =>
    req<void>('/api/git/stage', { method: 'POST', body: JSON.stringify({ repoPath, filePath }) }),
  unstageFile: (repoPath: string, filePath: string) =>
    req<void>('/api/git/unstage', { method: 'POST', body: JSON.stringify({ repoPath, filePath }) }),
  stageAll: (repoPath: string) =>
    req<void>('/api/git/stage-all', { method: 'POST', body: JSON.stringify({ repoPath }) }),
  unstageAll: (repoPath: string) =>
    req<void>('/api/git/unstage-all', { method: 'POST', body: JSON.stringify({ repoPath }) }),
  discardChanges: (repoPath: string, filePath: string) =>
    req<void>('/api/git/discard', { method: 'POST', body: JSON.stringify({ repoPath, filePath }) }),
  commit: (repoPath: string, message: string, authorName?: string, authorEmail?: string) =>
    req<{ output: string }>('/api/git/commit', {
      method: 'POST',
      body: JSON.stringify({ repoPath, message, authorName, authorEmail }),
    }),
  push: (repoPath: string, remote?: string, branch?: string) =>
    req<{ output: string }>('/api/git/push', {
      method: 'POST',
      body: JSON.stringify({ repoPath, remote, branch }),
    }),
  pull: (repoPath: string, remote?: string, branch?: string) =>
    req<{ output: string }>('/api/git/pull', {
      method: 'POST',
      body: JSON.stringify({ repoPath, remote, branch }),
    }),
  fetch: (repoPath: string, remote?: string) =>
    req<{ output: string }>('/api/git/fetch', {
      method: 'POST',
      body: JSON.stringify({ repoPath, remote }),
    }),
  getBranches: (repoPath: string) =>
    req<GitBranchItem[]>(`/api/git/branches?repoPath=${encodeURIComponent(repoPath)}`),
  checkoutBranch: (repoPath: string, branchName: string) =>
    req<void>('/api/git/checkout', { method: 'POST', body: JSON.stringify({ repoPath, branchName }) }),
  createBranch: (repoPath: string, branchName: string, checkout = true) =>
    req<void>('/api/git/create-branch', {
      method: 'POST',
      body: JSON.stringify({ repoPath, branchName, checkout }),
    }),
  getCommits: (repoPath: string, count = 25) =>
    req<GitCommitItem[]>(`/api/git/commits?repoPath=${encodeURIComponent(repoPath)}&count=${count}`),
  getFileDiff: (repoPath: string, filePath: string, staged = false, contextLines = 3) =>
    req<GitDiffResult>(
      `/api/git/diff?repoPath=${encodeURIComponent(repoPath)}&filePath=${encodeURIComponent(filePath)}&staged=${staged}&contextLines=${contextLines}`
    ),
  stash: (repoPath: string, message?: string) =>
    req<{ output: string }>('/api/git/stash', { method: 'POST', body: JSON.stringify({ repoPath, message }) }),
  stashPop: (repoPath: string) =>
    req<{ output: string }>('/api/git/stash-pop', { method: 'POST', body: JSON.stringify({ repoPath }) }),
  getStashes: (repoPath: string) =>
    req<GitStashItem[]>(`/api/git/stashes?repoPath=${encodeURIComponent(repoPath)}`),
  applyStash: (repoPath: string, index = 0) =>
    req<{ output: string }>('/api/git/stashes/apply', { method: 'POST', body: JSON.stringify({ repoPath, index }) }),
  dropStash: (repoPath: string, index = 0) =>
    req<{ output: string }>('/api/git/stashes/drop', { method: 'POST', body: JSON.stringify({ repoPath, index }) }),
  deleteBranch: (repoPath: string, branchName: string, force = false) =>
    req<void>('/api/git/branches/delete', { method: 'POST', body: JSON.stringify({ repoPath, branchName, force }) }),
  renameBranch: (repoPath: string, oldName: string, newName: string) =>
    req<void>('/api/git/branches/rename', { method: 'POST', body: JSON.stringify({ repoPath, oldName, newName }) }),
  getRemotes: (repoPath: string) =>
    req<GitRemoteItem[]>(`/api/git/remotes?repoPath=${encodeURIComponent(repoPath)}`),
  addRemote: (repoPath: string, name: string, url: string) =>
    req<void>('/api/git/remotes/add', { method: 'POST', body: JSON.stringify({ repoPath, name, url }) }),
  removeRemote: (repoPath: string, name: string) =>
    req<void>('/api/git/remotes/remove', { method: 'POST', body: JSON.stringify({ repoPath, name }) }),
  getTags: (repoPath: string) =>
    req<GitTagItem[]>(`/api/git/tags?repoPath=${encodeURIComponent(repoPath)}`),
  createTag: (repoPath: string, name: string, message?: string) =>
    req<void>('/api/git/tags/create', { method: 'POST', body: JSON.stringify({ repoPath, name, message }) }),
  pushTag: (repoPath: string, name: string, remote?: string) =>
    req<void>('/api/git/tags/push', { method: 'POST', body: JSON.stringify({ repoPath, name, remote }) }),
  deleteTag: (repoPath: string, name: string) =>
    req<void>('/api/git/tags/delete', { method: 'POST', body: JSON.stringify({ repoPath, name }) }),
  merge: (repoPath: string, branchName: string) =>
    req<{ output: string }>('/api/git/merge', { method: 'POST', body: JSON.stringify({ repoPath, branchName }) }),
  rebase: (repoPath: string, branchName: string) =>
    req<{ output: string }>('/api/git/rebase', { method: 'POST', body: JSON.stringify({ repoPath, branchName }) }),
  reset: (repoPath: string, targetRef: string, mode: string) =>
    req<{ output: string }>('/api/git/reset', { method: 'POST', body: JSON.stringify({ repoPath, targetRef, mode }) }),
  revert: (repoPath: string, commitHash: string) =>
    req<{ output: string }>('/api/git/revert', { method: 'POST', body: JSON.stringify({ repoPath, commitHash }) }),
  cherryPick: (repoPath: string, commitHash: string) =>
    req<{ output: string }>('/api/git/cherry-pick', { method: 'POST', body: JSON.stringify({ repoPath, commitHash }) }),
  getCommitDetails: (repoPath: string, commitHash: string) =>
    req<GitCommitDetailResult>(
      `/api/git/commit-details?repoPath=${encodeURIComponent(repoPath)}&commitHash=${encodeURIComponent(commitHash)}`
    ),

  // Cloud Git Providers
  listRemoteRepos: (accountId: string, search?: string, page = 1, pageSize = 30) =>
    req<RemoteRepoItem[]>(
      `/api/git/providers/repos?accountId=${encodeURIComponent(accountId)}&search=${encodeURIComponent(
        search || ''
      )}&page=${page}&pageSize=${pageSize}`
    ),
  createRemoteRepo: (data: CreateRemoteRepoRequest) =>
    req<RemoteRepoItem>('/api/git/providers/create', { method: 'POST', body: JSON.stringify(data) }),
  publishLocalRepo: (data: PublishLocalRepoRequest) =>
    req<{ success: boolean; repoUrl: string; cloneUrl: string; message: string }>('/api/git/providers/publish', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  cloneRepo: (data: CloneRepoRequest) =>
    req<{ success: boolean; targetDirectory: string; message: string }>('/api/git/providers/clone', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  pushToRemoteRepo: (data: PushToRemoteRepoRequest) =>
    req<GitPushResult>('/api/git/providers/push-to-remote', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getRateLimit: (accountId: string) =>
    req<GitRateLimitInfo>(`/api/git/providers/rate-limit?accountId=${encodeURIComponent(accountId)}`),
  getCloudRepoTree: (accountId: string, repo: string, path = '', branch?: string) =>
    req<RepoFileNode[]>(
      `/api/git/providers/tree?accountId=${encodeURIComponent(accountId)}&repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(path)}${branch ? `&branch=${encodeURIComponent(branch)}` : ''}`
    ),
  getCloudFileContent: (accountId: string, repo: string, path: string, branch?: string) =>
    req<RepoFileContentResult>(
      `/api/git/providers/file?accountId=${encodeURIComponent(accountId)}&repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(path)}${branch ? `&branch=${encodeURIComponent(branch)}` : ''}`
    ),
  getLocalFsTree: (path: string) =>
    req<RepoFileNode[]>(`/api/fs/tree?path=${encodeURIComponent(path)}`),
  getLocalFsFile: (path: string) =>
    req<RepoFileContentResult>(`/api/fs/file?path=${encodeURIComponent(path)}`),
  initRepo: (repoPath: string) =>
    req<{ success: boolean; output: string }>('/api/git/init', {
      method: 'POST',
      body: JSON.stringify({ repoPath }),
    }),
  setupGithubAction: (data: GithubActionSetupRequest) =>
    req<GithubActionSetupResult>('/api/git/cicd/setup-github-action', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  inspectRepoTech: (data: InspectRepoRequest) =>
    req<RepoTechInspectionResult>('/api/git/cicd/inspect', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getGitIgnore: (repoPath: string) =>
    req<GitIgnoreInfo>(`/api/git/gitignore?repoPath=${encodeURIComponent(repoPath)}`),
  saveGitIgnore: (data: SaveGitIgnoreRequest) =>
    req<{ success: boolean }>('/api/git/gitignore', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  addToGitIgnore: (data: AddToGitIgnoreRequest) =>
    req<{ success: boolean }>('/api/git/gitignore/add', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getGitIgnoreTemplates: () =>
    req<Record<string, string>>('/api/git/gitignore/templates'),

  // SSH
  getSshProfiles: () => req<SshProfile[]>('/api/ssh/profiles'),
  getSshProfile: (id: string) => req<SshProfile>(`/api/ssh/profiles/${id}`),
  saveSshProfile: (data: {
    profile: Partial<SshProfile>;
    password?: string;
    privateKeyContent?: string;
    keyPassphrase?: string;
  }) => req<SshProfile>('/api/ssh/profiles', { method: 'POST', body: JSON.stringify(data) }),
  deleteSshProfile: (id: string) => req<{ success: boolean }>(`/api/ssh/profiles/${id}`, { method: 'DELETE' }),
  testSshProfile: (data: {
    profile: Partial<SshProfile>;
    password?: string;
    privateKeyContent?: string;
    keyPassphrase?: string;
  }) => req<SshConnectionTestResult>('/api/ssh/test', { method: 'POST', body: JSON.stringify(data) }),
  connectSshTerminal: (profileId: string, cols = 80, rows = 24) =>
    req<TerminalSessionInfo>('/api/ssh/connect-terminal', {
      method: 'POST',
      body: JSON.stringify({ profileId, cols, rows }),
    }),

  // SSH SFTP Remote Explorer
  sftpListDirectory: (profileId: string, path?: string) =>
    req<{ success: boolean; files: RemoteFileItem[]; errorMessage?: string }>(
      `/api/ssh/${profileId}/sftp/list${path ? `?path=${encodeURIComponent(path)}` : ''}`
    ),
  sftpReadFile: (profileId: string, path: string) =>
    req<{ success: boolean; file?: RemoteFileContent; errorMessage?: string }>(
      `/api/ssh/${profileId}/sftp/read?path=${encodeURIComponent(path)}`
    ),
  sftpUploadFile: (data: SftpUploadRequest) =>
    req<{ success: boolean; errorMessage?: string }>('/api/ssh/sftp/upload', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  sftpDelete: (data: SftpDeleteRequest) =>
    req<{ success: boolean; errorMessage?: string }>('/api/ssh/sftp/delete', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  sftpCreateDirectory: (data: SftpCreateDirRequest) =>
    req<{ success: boolean; errorMessage?: string }>('/api/ssh/sftp/mkdir', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Advanced SSH Server Management
  sshExecCommand: (profileId: string, command: string, timeoutSeconds = 60, elevated = false) =>
    req<SshCommandResult>(`/api/ssh/${profileId}/exec`, {
      method: 'POST',
      body: JSON.stringify({ command, timeoutSeconds, elevated }),
    }),
  executeSshCommand: (profileId: string, command: string, timeoutSeconds = 60, elevated = false) =>
    req<SshCommandResult>(`/api/ssh/${profileId}/exec`, {
      method: 'POST',
      body: JSON.stringify({ command, timeoutSeconds, elevated }),
    }),
  getSshOverview: (profileId: string) =>
    req<{ success: boolean; overview: SshServerOverview; errorMessage?: string }>(`/api/ssh/${profileId}/overview`),
  getSshPorts: (profileId: string) =>
    req<{ success: boolean; ports: SshListeningPortItem[]; errorMessage?: string }>(`/api/ssh/${profileId}/ports`),
  killSshPortProcess: (profileId: string, pid: number, force = true) =>
    req<{ success: boolean; errorMessage?: string }>(`/api/ssh/${profileId}/ports/kill`, {
      method: 'POST',
      body: JSON.stringify({ pid, force }),
    }),
  getSshProcesses: (profileId: string) =>
    req<{ success: boolean; processes: SshProcessItem[]; errorMessage?: string }>(`/api/ssh/${profileId}/processes`),
  executeSshProcessAction: (profileId: string, type: 'systemd' | 'pm2', processNameOrId: string, action: string) =>
    req<SshCommandResult>(`/api/ssh/${profileId}/processes/action`, {
      method: 'POST',
      body: JSON.stringify({ type, processNameOrId, action }),
    }),
  createSshSystemdService: (profileId: string, data: { serviceName: string; execStart: string; workingDir: string; user: string; envVars?: string }) =>
    req<SshCommandResult>(`/api/ssh/${profileId}/processes/create-systemd`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getSshNginxStatus: (profileId: string) =>
    req<SshCommandResult>(`/api/ssh/${profileId}/nginx/status`),
  getSshNginxSites: (profileId: string) =>
    req<{ success: boolean; sites: SshNginxSiteItem[]; errorMessage?: string }>(`/api/ssh/${profileId}/nginx/sites`),
  saveSshNginxSite: (profileId: string, siteConfig: SshNginxSaveRequest) =>
    req<SshCommandResult>(`/api/ssh/${profileId}/nginx/sites`, {
      method: 'POST',
      body: JSON.stringify(siteConfig),
    }),
  toggleSshNginxSite: (profileId: string, siteName: string, enable: boolean) =>
    req<SshCommandResult>(`/api/ssh/${profileId}/nginx/sites/toggle`, {
      method: 'POST',
      body: JSON.stringify({ siteName, enable }),
    }),
  deleteSshNginxSite: (profileId: string, siteName: string) =>
    req<SshCommandResult>(`/api/ssh/${profileId}/nginx/sites/${encodeURIComponent(siteName)}`, {
      method: 'DELETE',
    }),
  reloadSshNginx: (profileId: string) =>
    req<SshCommandResult>(`/api/ssh/${profileId}/nginx/reload`, { method: 'POST' }),
  getSshNginxLogs: (profileId: string, type = 'error', lines = 100) =>
    req<{ logs: string }>(`/api/ssh/${profileId}/nginx/logs?type=${type}&lines=${lines}`),
  getSshCertbotStatus: (profileId: string) =>
    req<{ success: boolean; certificates: SshCertbotCertificateItem[]; errorMessage?: string }>(`/api/ssh/${profileId}/certbot/status`),
  installSshCertbot: (profileId: string) =>
    req<SshCommandResult>(`/api/ssh/${profileId}/certbot/install`, { method: 'POST' }),
  issueSshCertbotSsl: (profileId: string, domain: string, email: string) =>
    req<SshCommandResult>(`/api/ssh/${profileId}/certbot/issue`, {
      method: 'POST',
      body: JSON.stringify({ domain, email }),
    }),
  checkSshDomains: (profileId: string, domains: string[]) =>
    req<{ success: boolean; domains: SshDomainItem[]; errorMessage?: string }>(`/api/ssh/${profileId}/domains/check`, {
      method: 'POST',
      body: JSON.stringify({ domains }),
    }),
  sshServerGitClone: (profileId: string, repoUrl: string, targetDir: string, branch = 'main') =>
    req<SshCommandResult>(`/api/ssh/${profileId}/git/clone`, {
      method: 'POST',
      body: JSON.stringify({ repoUrl, targetDir, branch }),
    }),
  sshServerGitPull: (profileId: string, targetDir: string, branch = 'main', postDeployCommand?: string) =>
    req<SshCommandResult>(`/api/ssh/${profileId}/git/pull`, {
      method: 'POST',
      body: JSON.stringify({ targetDir, branch, postDeployCommand }),
    }),
  getSshServerGitStatus: (profileId: string, targetDir: string) =>
    req<SshGitDeploymentItem>(`/api/ssh/${profileId}/git/status`, {
      method: 'POST',
      body: JSON.stringify({ targetDir }),
    }),
  getSshServerMetadata: (profileId: string) =>
    req<{ success: boolean; metadata: SshServerMetadata; errorMessage?: string }>(`/api/ssh/${profileId}/metadata`),
  saveSshServerMetadata: (profileId: string, metadata: SshServerMetadata) =>
    req<{ success: boolean; errorMessage?: string }>(`/api/ssh/${profileId}/metadata`, {
      method: 'POST',
      body: JSON.stringify(metadata),
    }),

  // Terminal
  getShells: () => req<ShellDescriptor[]>('/api/terminal/shells'),
  createTerminal: (shellType: TerminalShellType, workingDirectory?: string, cols = 80, rows = 24) =>
    req<TerminalSessionInfo>('/api/terminal/create', {
      method: 'POST',
      body: JSON.stringify({ shellType, workingDirectory, cols, rows }),
    }),
  getTerminalSessions: () => req<TerminalSessionInfo[]>('/api/terminal/sessions'),
  closeTerminal: (sessionId: string) =>
    req<void>('/api/terminal/close', { method: 'POST', body: JSON.stringify({ sessionId }) }),

  // Settings
  getSettings: () => req<AppSettings>('/api/settings'),
  saveSettings: (settings: AppSettings) =>
    req<AppSettings>('/api/settings', { method: 'POST', body: JSON.stringify(settings) }),
  getGitAccounts: () => req<GitAccount[]>('/api/settings/git-accounts'),
  saveGitAccount: (data: { account: Partial<GitAccount>; token?: string }) =>
    req<GitAccount>('/api/settings/git-accounts', { method: 'POST', body: JSON.stringify(data) }),
  deleteGitAccount: (id: string) =>
    req<{ success: boolean }>(`/api/settings/git-accounts/${id}`, { method: 'DELETE' }),
  testGitAccount: (id: string) =>
    req<{ success: boolean; displayName?: string; avatarUrl?: string; errorMessage?: string }>(
      `/api/settings/git-accounts/${id}/test`,
      { method: 'POST' }
    ),
  testGitDirectConfig: (data: { account: Partial<GitAccount>; token?: string }) =>
    req<{ success: boolean; displayName?: string; avatarUrl?: string; errorMessage?: string }>(
      '/api/settings/git-accounts/test-config',
      { method: 'POST', body: JSON.stringify(data) }
    ),
  getGitGlobalConfig: () => req<GitGlobalConfig>('/api/git/global-config'),
  setGitGlobalConfig: (config: GitGlobalConfig) =>
    req<{ success: boolean }>('/api/git/global-config', { method: 'POST', body: JSON.stringify(config) }),
  installGitViaWinget: () =>
    req<SetupActionResult>('/api/git/install-winget', { method: 'POST' }),

  // Metrics & Commands
  getMetrics: () => req<SystemMetrics>('/api/system/metrics'),
  getCommands: () => req<CommandPaletteItem[]>('/api/commands'),

  // HTTP Tool Proxy
  executeHttp: (data: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
    contentType?: string;
  }) =>
    req<{
      statusCode: number;
      statusText: string;
      durationMs: number;
      headers: Record<string, string>;
      body: string;
      byteLength: number;
      error?: string;
    }>('/api/tools/http-request', { method: 'POST', body: JSON.stringify(data) }),

  // Setup & System Integrations
  getSetupDiagnostics: () => req<SetupDiagnostics>('/api/setup/diagnostics'),
  getIntegrationStatus: () => req<SystemIntegrationStatus>('/api/setup/integrations'),
  addToPath: () => req<SetupActionResult>('/api/setup/path/add', { method: 'POST' }),
  removeFromPath: () => req<SetupActionResult>('/api/setup/path/remove', { method: 'POST' }),
  registerContextMenu: () => req<SetupActionResult>('/api/setup/context-menu/register', { method: 'POST' }),
  unregisterContextMenu: () => req<SetupActionResult>('/api/setup/context-menu/unregister', { method: 'POST' }),
  registerStartup: () => req<SetupActionResult>('/api/setup/startup/register', { method: 'POST' }),
  unregisterStartup: () => req<SetupActionResult>('/api/setup/startup/unregister', { method: 'POST' }),
  registerProtocol: () => req<SetupActionResult>('/api/setup/protocol/register', { method: 'POST' }),
  createDesktopShortcut: () =>
    req<{ success: boolean; message: string }>('/api/setup/shortcut/desktop', { method: 'POST' }),
  applySetup: (data: ApplySetupRequest) =>
    req<SetupActionResult>('/api/setup/apply', { method: 'POST', body: JSON.stringify(data) }),

  // AI Providers & Assistant
  getAiProviders: () => req<AiProviderConfig[]>('/api/ai/providers'),
  getAiProvider: (id: string) => req<AiProviderConfig>(`/api/ai/providers/${id}`),
  saveAiProvider: (data: SaveAiProviderRequest) =>
    req<AiProviderConfig>('/api/ai/providers', { method: 'POST', body: JSON.stringify(data) }),
  deleteAiProvider: (id: string) => req<{ success: boolean }>(`/api/ai/providers/${id}`, { method: 'DELETE' }),
  setDefaultAiProvider: (id: string) =>
    req<{ success: boolean }>(`/api/ai/providers/${id}/set-default`, { method: 'POST' }),
  testAiProvider: (id: string) => req<AiTestResult>(`/api/ai/providers/${id}/test`, { method: 'POST' }),
  testAiDirectConfig: (data: SaveAiProviderRequest) =>
    req<AiTestResult>('/api/ai/providers/test-config', { method: 'POST', body: JSON.stringify(data) }),
  sendAiChat: (data: AiChatRequest) =>
    req<AiChatResponse>('/api/ai/chat', { method: 'POST', body: JSON.stringify(data) }),
  generateAiCommit: (data: AiGenerateCommitRequest) =>
    req<AiChatResponse>('/api/ai/git/generate-commit', { method: 'POST', body: JSON.stringify(data) }),

  // ------------------ WINDOWS DEV OPS ------------------
  getListeningPorts: () => req<PortListeningItem[]>('/api/devops/ports'),
  killProcess: (pid: number, force = true) =>
    req<KillProcessResult>('/api/devops/ports/kill', {
      method: 'POST',
      body: JSON.stringify({ pid, force }),
    }),
  getHostEntries: () => req<HostEntryItem[]>('/api/devops/hosts'),
  saveHostEntries: (entries: HostEntryItem[], autoFlushDns = true) =>
    req<{ success: boolean }>('/api/devops/hosts', {
      method: 'POST',
      body: JSON.stringify({ entries, autoFlushDns }),
    }),
  flushDns: () =>
    req<{ success: boolean }>('/api/devops/hosts/flush-dns', {
      method: 'POST',
    }),
  getEnvVariables: () => req<SystemEnvVariableItem[]>('/api/devops/env'),
  compareDotEnv: (currentEnv: string, exampleEnv: string) =>
    req<DotEnvCompareResult>('/api/devops/dotenv/compare', {
      method: 'POST',
      body: JSON.stringify({ currentEnv, exampleEnv }),
    }),

  // GitHub Actions Secrets & Releases Automation
  syncGithubSecrets: (body: SyncGithubSecretsRequest) =>
    req<SyncGithubSecretsResult>('/api/git/secrets/sync', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  createGithubRelease: (body: CreateGithubReleaseRequest) =>
    req<CreateGithubReleaseResult>('/api/git/releases/create', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getGithubReleases: (accountId: string, remoteRepoFullName: string) =>
    req<GithubReleaseItem[]>(`/api/git/releases?accountId=${encodeURIComponent(accountId)}&remoteRepoFullName=${encodeURIComponent(remoteRepoFullName)}`),

  // Open External URL in default Windows browser
  openUrl: (url: string) => {
    try {
      window.open(url, '_blank');
    } catch {}
    return req<{ success: boolean }>('/api/system/open-url', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }).catch(() => {});
  },

  // ------------------ PLUGINS ------------------
  getPlugins: () => req<PluginManifest[]>('/api/plugins'),

  // ------------------ DOCKER (real CLI) ------------------
  getDockerAvailability: () => req<DockerAvailabilityResult>('/api/docker/availability'),
  getDockerContainers: (all = true) =>
    req<DockerContainerItem[]>(`/api/docker/containers?all=${all}`),
  getDockerImages: () => req<DockerImageItem[]>('/api/docker/images'),
  startDockerContainer: (containerId: string) =>
    req<DockerCommandResult>('/api/docker/containers/start', {
      method: 'POST',
      body: JSON.stringify({ containerId }),
    }),
  stopDockerContainer: (containerId: string) =>
    req<DockerCommandResult>('/api/docker/containers/stop', {
      method: 'POST',
      body: JSON.stringify({ containerId }),
    }),
  restartDockerContainer: (containerId: string) =>
    req<DockerCommandResult>('/api/docker/containers/restart', {
      method: 'POST',
      body: JSON.stringify({ containerId }),
    }),
  removeDockerContainer: (id: string, force = false) =>
    req<DockerCommandResult>('/api/docker/containers/remove', {
      method: 'POST',
      body: JSON.stringify({ id, force }),
    }),
  getDockerContainerLogs: (containerId: string, tail = 200) =>
    req<DockerCommandResult>(
      `/api/docker/containers/logs?containerId=${encodeURIComponent(containerId)}&tail=${tail}`
    ),
  removeDockerImage: (id: string, force = false) =>
    req<DockerCommandResult>('/api/docker/images/remove', {
      method: 'POST',
      body: JSON.stringify({ id, force }),
    }),
  dockerComposeUp: (workingDirectory: string) =>
    req<DockerCommandResult>('/api/docker/compose/up', {
      method: 'POST',
      body: JSON.stringify({ workingDirectory }),
    }),
  dockerComposeDown: (workingDirectory: string) =>
    req<DockerCommandResult>('/api/docker/compose/down', {
      method: 'POST',
      body: JSON.stringify({ workingDirectory }),
    }),

  // WebSocket Helpers
  getTerminalWsUrl: (sessionId: string) => {
    const host = window.location.port === '5173' ? '127.0.0.1:38420' : window.location.host;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${host}/ws/terminal/${sessionId}`;
  },

  getMetricsWsUrl: () => {
    const host = window.location.port === '5173' ? '127.0.0.1:38420' : window.location.host;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${host}/ws/metrics`;
  },
};

// Window chrome communication helpers
export const windowControls = {
  minimize: () => {
    if ((window as any).chrome?.webview) {
      (window as any).chrome.webview.postMessage(JSON.stringify({ type: 'window:minimize' }));
    }
  },
  maximize: () => {
    if ((window as any).chrome?.webview) {
      (window as any).chrome.webview.postMessage(JSON.stringify({ type: 'window:maximize' }));
    }
  },
  close: () => {
    if ((window as any).chrome?.webview) {
      (window as any).chrome.webview.postMessage(JSON.stringify({ type: 'window:close' }));
    }
  },
  drag: () => {
    if ((window as any).chrome?.webview) {
      (window as any).chrome.webview.postMessage(JSON.stringify({ type: 'window:drag' }));
    }
  },
  forceExit: () => {
    if ((window as any).chrome?.webview) {
      (window as any).chrome.webview.postMessage(JSON.stringify({ type: 'app:force-exit' }));
    }
  },
  minimizeToTray: () => {
    if ((window as any).chrome?.webview) {
      (window as any).chrome.webview.postMessage(JSON.stringify({ type: 'window:minimize-to-tray' }));
    }
  },
};
