export interface ProjectItem {
  id: string;
  name: string;
  path: string;
  icon?: string;
  isGitRepository: boolean;
  favorite: boolean;
  tags: string[];
  commands: Record<string, string>;
  lastOpenedAt?: string;
  createdAt: string;
}

export interface ProjectCommandResult {
  success: boolean;
  exitCode: number;
  output: string;
  errorMessage?: string;
}

export type GitFileDeltaType =
  | 'Untracked'
  | 'Modified'
  | 'Added'
  | 'Deleted'
  | 'Renamed'
  | 'Copied'
  | 'Ignored'
  | 'Conflicted';

export interface GitFileStatus {
  path: string;
  oldPath?: string;
  status: GitFileDeltaType;
  isStaged: boolean;
}

export interface GitRepoStatus {
  repoPath: string;
  currentBranch: string;
  upstreamBranch?: string;
  aheadCount: number;
  behindCount: number;
  isClean: boolean;
  stagedFiles: GitFileStatus[];
  unstagedFiles: GitFileStatus[];
  untrackedFiles: GitFileStatus[];
}

export interface GitCommitItem {
  hash: string;
  shortHash: string;
  authorName: string;
  authorEmail: string;
  date: string;
  relativeDate: string;
  subject: string;
  body: string;
}

export interface GitBranchItem {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
  upstreamBranch?: string;
}

export type DiffLineType = 'Context' | 'Added' | 'Deleted' | 'Header';

export interface DiffLine {
  type: DiffLineType;
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export interface DiffHunk {
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface GitDiffResult {
  filePath: string;
  oldFilePath?: string;
  isBinary: boolean;
  hunks: DiffHunk[];
  rawDiff: string;
}

export type SshAuthType = 'Password' | 'PrivateKey' | 'KeyWithPassphrase';

export interface SshProfile {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: SshAuthType;
  privateKeyPath?: string;
  hasPassword: boolean;
  hasPrivateKey: boolean;
  group?: string;
  lastConnectedAt?: string;
  createdAt: string;
}

export interface SshConnectionTestResult {
  success: boolean;
  latencyMs: number;
  serverVersion?: string;
  errorMessage?: string;
  details?: string;
}

export type TerminalShellType = 'PowerShell' | 'Cmd' | 'GitBash' | 'Wsl' | 'Ssh' | 'Custom';

export interface ShellDescriptor {
  type: TerminalShellType;
  displayName: string;
  executablePath: string;
  arguments?: string;
  isAvailable: boolean;
}

export interface TerminalSessionInfo {
  sessionId: string;
  title: string;
  shellType: TerminalShellType;
  processId?: number;
  workingDirectory: string;
  isActive: boolean;
  createdAt: string;
}

export interface AppSettings {
  theme: string;
  accentColor: string;
  terminalFontSize: number;
  terminalFontFamily: string;
  defaultShell: TerminalShellType;
  startMinimized: boolean;
  minimizeToTray: boolean;
  globalHotkeyEnabled: boolean;
  globalHotkey: string;
  autoFetchGit: boolean;
  gitFetchIntervalMinutes: number;
  language: 'vi' | 'en';
  hasCompletedSetup?: boolean;
  addToPath?: boolean;
  runAtStartup?: boolean;
  registerContextMenu?: boolean;
  terminalBackgroundImage?: string;
  terminalBackgroundOpacity?: number;
  terminalBackgroundBlur?: number;
}

export interface SetupDiagnostics {
  osVersion: string;
  architecture: string;
  isAdmin: boolean;
  dotnetInstalled: boolean;
  dotnetVersion: string;
  webview2Installed: boolean;
  webview2Version: string;
  gitInstalled: boolean;
  gitVersion: string;
  gitPath: string;
  powershellInstalled: boolean;
  powershellVersion: string;
  wslInstalled: boolean;
  sshInstalled: boolean;
}

export interface SystemIntegrationStatus {
  isInPath: boolean;
  appDirectory: string;
  isContextMenuRegistered: boolean;
  isStartupRegistered: boolean;
  isProtocolRegistered: boolean;
}

export interface ApplySetupRequest {
  addToPath: boolean;
  registerContextMenu: boolean;
  runAtStartup: boolean;
  registerProtocol: boolean;
  language: 'vi' | 'en';
  theme: string;
  accentColor: string;
  defaultShell: TerminalShellType;
}

export interface SetupActionResult {
  success: boolean;
  message: string;
  status?: SystemIntegrationStatus;
}

export type GitProvider = 'GitHub' | 'GitLab' | 'Bitbucket' | 'Generic';

export interface GitAccount {
  id: string;
  name: string;
  provider: GitProvider;
  username: string;
  email: string;
  isDefault: boolean;
  hasToken: boolean;
  maskedToken: string;
  apiBaseUrl?: string;
  createdAt: string;
}

export interface RemoteRepoItem {
  id: string;
  name: string;
  fullName: string;
  description?: string;
  htmlUrl: string;
  cloneUrl: string;
  sshUrl?: string;
  isPrivate: boolean;
  defaultBranch: string;
  starsCount: number;
  forksCount: number;
  language?: string;
  updatedAt?: string;
  ownerName: string;
  ownerAvatarUrl?: string;
}

export interface CreateRemoteRepoRequest {
  accountId: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  autoInitReadme: boolean;
  gitignoreTemplate?: string;
}

export interface PublishLocalRepoRequest {
  repoPath: string;
  accountId: string;
  remoteName?: string;
  repoName: string;
  description?: string;
  isPrivate: boolean;
}

export interface CloneRepoRequest {
  cloneUrl: string;
  destinationPath: string;
  projectName?: string;
  addToProjects: boolean;
}

export interface PushToRemoteRepoRequest {
  accountId: string;
  repoPath: string;
  cloneUrl: string;
  remoteName?: string;
  branch?: string;
  autoCommitAll?: boolean;
  commitMessage?: string;
  forcePush?: boolean;
}

export interface GitPushResult {
  success: boolean;
  message: string;
  output: string;
  branch: string;
  remoteUrl: string;
}

export interface GitRemoteItem {
  name: string;
  fetchUrl: string;
  pushUrl: string;
}

export interface GitTagItem {
  name: string;
  commitHash: string;
  message?: string;
  date?: string;
}

export interface GitStashItem {
  index: number;
  message: string;
  branch: string;
  date: string;
}

export interface GitCommitFileChange {
  filePath: string;
  status: GitFileDeltaType;
  additions: number;
  deletions: number;
}

export interface GitCommitDetailResult {
  commit: GitCommitItem;
  changedFiles: GitCommitFileChange[];
  diff: string;
}

export interface GitRateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: string;
}

export interface GitGlobalConfig {
  userName: string;
  userEmail: string;
  defaultBranch: string;
  autoCrlf: string;
  credentialHelper: string;
  isGitInstalled: boolean;
  gitVersion: string;
}

export interface SystemMetrics {
  cpuUsagePercent: number;
  totalRamMb: number;
  usedRamMb: number;
  availableRamMb: number;
  ramUsagePercent: number;
  diskTotalGb: number;
  diskFreeGb: number;
  diskUsagePercent: number;
  networkSentKbps: number;
  networkReceivedKbps: number;
  uptime: string;
  machineName: string;
  osVersion: string;
}

export interface CommandPaletteItem {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  shortcut?: string;
  icon?: string;
  actionType: string;
  payload?: Record<string, string>;
}

// ------------------ AI PROVIDERS & ASSISTANT ------------------
export type AiProviderType =
  | 'OpenAI'
  | 'Anthropic'
  | 'Gemini'
  | 'DeepSeek'
  | 'Ollama'
  | 'Groq'
  | 'OpenRouter'
  | 'Custom';

export interface AiProviderConfig {
  id: string;
  name: string;
  providerType: AiProviderType;
  apiBaseUrl: string;
  defaultModel: string;
  isDefault: boolean;
  hasKey: boolean;
  maskedKey: string;
  status: 'active' | 'invalid' | 'untested';
  lastLatencyMs: number;
  lastTestedAt?: string;
  createdAt: string;
}

export interface SaveAiProviderRequest {
  config: Partial<AiProviderConfig>;
  apiKey?: string;
}

export interface AiTestResult {
  success: boolean;
  latencyMs: number;
  modelUsed?: string;
  responseMessage?: string;
  errorMessage?: string;
}

export interface AiChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface AiChatRequest {
  providerId?: string;
  model?: string;
  messages: AiChatMessage[];
  temperature?: number;
  systemPrompt?: string;
}

export interface AiChatResponse {
  success: boolean;
  message: string;
  modelUsed: string;
  durationMs: number;
  errorMessage?: string;
}

export interface AiGenerateCommitRequest {
  repoPath: string;
  providerId?: string;
  model?: string;
  customInstructions?: string;
}

export interface AiPlanStep {
  id: string;
  title: string;
  description?: string;
  command?: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  targetFiles?: string[];
}

export interface AiExecutionPlan {
  id: string;
  title: string;
  description?: string;
  targetDirectory?: string;
  steps: AiPlanStep[];
  status: 'draft' | 'running' | 'completed' | 'failed';
  createdAt: string;
}

export interface AiSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AiChatMessage[];
  plan?: AiExecutionPlan;
  linkedProjectId?: string;
  category: 'general' | 'scaffold' | 'debug' | 'cli' | 'plan';
}

export interface ProjectTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  defaultDirName: string;
  commands: {
    scaffold: string;
    dev: string;
    build: string;
    test?: string;
  };
}

// ------------------ SFTP REMOTE FILE MANAGER ------------------
export interface RemoteFileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedTime: string;
  permissions?: string;
}

export interface RemoteFileContent {
  path: string;
  content: string;
  isBinary: boolean;
  size: number;
}

export interface SftpUploadRequest {
  profileId: string;
  remotePath: string;
  contentBase64: string;
}

export interface SftpDeleteRequest {
  profileId: string;
  path: string;
  isDirectory: boolean;
}

export interface SftpCreateDirRequest {
  profileId: string;
  path: string;
}

// ------------------ AI FOLDER-BOUND WORKSPACE & SUB-CONVERSATIONS ------------------
export interface AiWorkspaceProject {
  id: string;
  name: string;
  folderPath: string;
  createdAt: string;
  isGit?: boolean;
  gitBranch?: string;
  conversations: AiSession[];
  activeConversationId?: string;
}

export interface InspectRepoRequest {
  repoPath?: string;
  accountId?: string;
  remoteRepoFullName?: string;
}

export interface RepoTechInspectionResult {
  success: boolean;
  techStack: string;
  framework: string;
  packageManager: string;
  buildCommand: string;
  testCommand: string;
  startCommand: string;
  appPort: number;
  hasDockerfile: boolean;
  hasDockerCompose: boolean;
  hasExistingWorkflow: boolean;
  existingWorkflows: string[];
  suggestedDeployType: string;
  recommendation: string;
  summary: string;
}

export interface GithubActionSetupRequest {
  repoPath: string;
  accountId?: string;
  remoteRepoFullName?: string;
  deployType: string;
  techStack: string;
  targetBranch: string;
  workflowFileName?: string;
  serverHost?: string;
  serverUser?: string;
  serverPort?: number;
  deployDirectory?: string;
  postDeployScript?: string;
  autoCommit?: boolean;
  customWorkflowYaml?: string;
  includeCaching?: boolean;
  includeHealthCheck?: boolean;
  healthCheckPort?: number;
  generateDockerfile?: boolean;
  generateDockerCompose?: boolean;
  generatePm2Config?: boolean;
  generateSystemd?: boolean;
}

export interface GithubActionSetupResult {
  success: boolean;
  workflowFilePath: string;
  workflowContent: string;
  requiredSecrets: string[];
  generatedFiles?: string[];
  message: string;
}
