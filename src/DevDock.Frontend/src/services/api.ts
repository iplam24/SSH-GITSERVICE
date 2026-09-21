import {
  ProjectItem,
  ProjectCommandResult,
  GitRepoStatus,
  GitCommitItem,
  GitBranchItem,
  GitDiffResult,
  SshProfile,
  SshConnectionTestResult,
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

  if (!res.ok) {
    let errText = '';
    try {
      const errJson = await res.json();
      errText = errJson.message || errJson.error || JSON.stringify(errJson);
    } catch {
      errText = await res.text();
    }
    throw new Error(errText || `Request failed with status ${res.status}`);
  }

  return res.json();
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
  getFileDiff: (repoPath: string, filePath: string, staged = false) =>
    req<GitDiffResult>(
      `/api/git/diff?repoPath=${encodeURIComponent(repoPath)}&filePath=${encodeURIComponent(filePath)}&staged=${staged}`
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
  getMetrics: () => req<SystemMetrics>('/api/metrics'),
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
};
