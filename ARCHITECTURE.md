# DevDock — System Architecture

## 1. Overview

**DevDock** is a modern, keyboard-first Developer Command Center for Windows built with high performance, modular architecture, and sleek developer aesthetics (inspired by VS Code, Cursor, Linear, and Raycast).

DevDock unifies developer workflows into a single hub:
- **Project Management**: Project discovery, quick-open in IDE/Explorer, dev/build/test command execution.
- **Git Workflows**: Multi-account support, branch switching, commit staging, push/pull/fetch, stash, and visual diff viewer.
- **Terminal Workflows**: Native Windows ConPTY terminal (PowerShell, CMD, Git Bash, WSL) with multi-tab and split-pane support.
- **SSH Workflows**: SSH connection manager, connection testing, and interactive SSH terminal via SSH.NET.
- **Command Palette & Quick Launcher**: Global `Ctrl+Space` hotkey with instant fuzzy search across commands, projects, SSH hosts, and tools.
- **Developer Utilities**: JSON Formatter, JWT Decoder, Base64, URL, UUID, Hashes, Regex, Timestamps, Color Picker, Text Diff, HTTP Client.
- **System Resource Monitor**: Real-time CPU, RAM, Disk, and Network stats.
- **Security**: Hardware/user-bound Windows DPAPI credential encryption with zero plaintext secrets in logs or UI.

---

## 2. High-Level Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           DevDock Desktop Window                                │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │ Custom Modern Dark Titlebar (Window Drag, Global Search, System Stats)    │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                              WebView2 Viewport                            │  │
│  │                                                                           │  │
│  │  React 18 / TypeScript / Vite / Tailwind CSS / xterm.js / Zustand         │  │
│  │  ┌──────────────┬──────────────────────────────────────────────────────┐  │  │
│  │  │   Sidebar    │                   Active View                        │  │  │
│  │  │              │  ┌────────────────────────────────────────────────┐  │  │  │
│  │  │ 🏠 Home      │  │ Home / Projects / Git / SSH / Terminal / Tools │  │  │  │
│  │  │ 📁 Projects  │  └────────────────────────────────────────────────┘  │  │  │
│  │  │ 💻 Git       │  ┌────────────────────────────────────────────────┐  │  │  │
│  │  │ 🖥 SSH       │  │ Command Palette / Quick Launcher (Ctrl+Space)  │  │  │  │
│  │  │ ⌨ Terminal   │  └────────────────────────────────────────────────┘  │  │  │
│  │  │ 🧰 Tools     │  ┌────────────────────────────────────────────────┐  │  │  │
│  │  │ ⚙ Settings   │  │ Split Pane / Multi-Tab Terminals (xterm.js)    │  │  │  │
│  │  └──────────────┴──┴────────────────────────────────────────────────┴──┘  │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       │ HTTP / WebSockets (localhost:58420)
┌──────────────────────────────────────▼──────────────────────────────────────────┐
│                             .NET 9 Desktop Host                                │
│                                                                                 │
│  ┌─────────────────────┐  ┌───────────────────────┐  ┌──────────────────────┐   │
│  │   Win32 Hotkey      │  │   System Tray Icon    │  │  Kestrel HTTP & WS   │   │
│  │   (Ctrl + Space)    │  │     (NotifyIcon)      │  │    Embedded Server   │   │
│  └─────────────────────┘  └───────────────────────┘  └──────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                               DevDock Core                                      │
│                                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ Project Svc  │  │   Git Svc    │  │   SSH Svc    │  │  Terminal Manager    │ │
│  │ (Runners)    │  │  (CLI & Diff)│  │  (SSH.NET)   │  │  (Windows ConPTY)    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ Security Svc │  │ Settings Svc │  │ Metrics Svc  │  │   Plugin Engine      │ │
│  │(Win32 DPAPI) │  │(Accounts/Cfg)│  │ (CPU/RAM/Net)│  │ (Docker/Minecraft...)│ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────────┘ │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────────┐
│                              Windows Subsystem                                  │
│  ┌───────────────┐   ┌────────────────┐   ┌───────────────┐   ┌──────────────┐  │
│  │ Windows ConPTY│   │  Windows DPAPI │   │ Git CLI & SSH │   │ File System  │  │
│  └───────────────┘   └────────────────┘   └───────────────┘   └──────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Module Breakdown & Responsibilities

The codebase is strictly modularized into isolated projects under `src/`:

### 3.1 `DevDock.Core`
- **Models**:
  - `ProjectItem`: Name, path, icon, commands (`dev`, `build`, `test`), favorite flag, tags.
  - `GitStatusResult`: Staged, unstaged, untracked files, current branch, ahead/behind counters.
  - `GitCommitItem`: Hash, author, message, date, relative date.
  - `GitDiffResult` & `DiffHunk`: Structured diff lines for unified and side-by-side rendering.
  - `SshProfile`: Host, port, username, auth type (Password / PrivateKey), status.
  - `TerminalSessionInfo`: Session ID, shell type, process ID, title.
  - `SystemMetrics`: CPU percent, RAM total/used/percent, Disk metrics, Network rate.
- **Interfaces**:
  - `IProjectService`, `IGitService`, `ISshService`, `ITerminalService`, `ICredentialService`, `ISettingsService`, `ISystemMetricsService`, `IPluginManager`.
- **Command Registry**:
  - Exposes actions searchable by the Command Palette.

### 3.2 `DevDock.Security`
- **Windows DPAPI Integration**:
  - Encrypts and decrypts sensitive values (Git PAT tokens, SSH passwords, private key content) using `ProtectedData.Protect` with `DataProtectionScope.CurrentUser`.
  - Credentials can only be decrypted on the same machine under the same Windows user account.
- **Redaction & Masking**:
  - Formats tokens for safe display (e.g. `ghp_••••••••••••••••3a9b`).
  - Strict log sanitation guarantees no secret keys or passwords appear in log files, console, or responses.

### 3.3 `DevDock.Terminal`
- **Windows ConPTY**:
  - Uses native Windows Pseudo Console (`CreatePseudoConsole`, `ClosePseudoConsole`, `ResizePseudoConsole` in `kernel32.dll`).
  - Attaches to child shell processes (`powershell.exe`, `cmd.exe`, `git-bash.exe`, `wsl.exe`).
- **WebSocket Streaming**:
  - Handles bidirectional data piping between xterm.js in the frontend and the ConPTY I/O pipes.
  - Supports dynamic resizing on window/tab resize events (`cols`, `rows`).

### 3.4 `DevDock.SSH`
- **SSH.NET Integration**:
  - Connects to remote Linux/Windows/Minecraft servers using passwords or private keys (with optional passphrases).
  - Diagnostic connection testing (verifies connectivity, host key, and authentication within a safe timeout).
  - Spawns interactive pseudo-terminal shells (`client.CreateShellStream`) piped directly to the WebSocket terminal session.

### 3.5 `DevDock.Git`
- **Git CLI Wrapper**:
  - Executes asynchronous git commands with proper encoding and safety bounds.
  - Parses status, branches, commits, staging, unstaging, discard changes, commit creation, fetch, pull, push, stash.
  - Structured Git Diff generator providing line-by-line diff metadata for both unified and side-by-side visual views.

### 3.6 `DevDock.Projects`
- **Project Store & Discovery**:
  - Persists project definitions in `%APPDATA%\DevDock\projects.json`.
  - Automatically identifies whether a directory contains a `.git` repository, `package.json`, `.csproj`, `Cargo.toml`, etc.
- **Command Runner**:
  - Executes configured project commands (`dev`, `build`, `test`, custom scripts) and routes output to terminal sessions.

### 3.7 `DevDock.Settings`
- **Configuration Engine**:
  - Stores user preferences, keyboard shortcut mappings, active theme, accent color, terminal font size, and default shell.
  - Manages Git Accounts (GitHub, GitLab, Bitbucket, Generic) linked to DPAPI-stored credentials.

### 3.8 `DevDock.Plugins`
- **Extensibility Architecture**:
  - `IDevDockPlugin`: Life-cycle hooks (`InitializeAsync`, `ShutdownAsync`).
  - Registries for Commands, Sidebar Items, Developer Tools, and Project Actions.
  - Built-in extension points ready for Docker container management, Kubernetes clusters, Minecraft servers, and AI assistant sidecars.

### 3.9 `DevDock.App` (Desktop Host)
- **WPF / Win32 Shell**:
  - Custom frameless dark title bar with Windows 11 DWM snap layouts and dark mode support (`DwmSetWindowAttribute`).
  - Embeds `Microsoft.Web.WebView2` pointing to the in-process Kestrel server.
- **Global Hotkey**:
  - Win32 `RegisterHotKey(hWnd, HOTKEY_ID, MOD_CONTROL, VK_SPACE)`.
  - Intercepted in `WndProc`: restores/activates DevDock if minimized or in background, and notifies the frontend to activate the Command Palette.
- **System Tray**:
  - Windows `NotifyIcon` with a modern dark context menu (Open, Command Palette, Recent Projects, Recent SSH, Settings, Exit).

### 3.10 `DevDock.Frontend`
- **Tech Stack**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, xterm.js, Zustand.
- **Key Features**:
  - **Command Palette & Quick Launcher (`Ctrl+Space` / `Ctrl+Shift+P`)**: Ultra-fast fuzzy search.
  - **Dashboard**: Quick actions, system metrics cards, recent projects and SSH sessions.
  - **Project Hub**: Quick open in VS Code, Terminal, Explorer, with dev/build/test controls.
  - **Git Hub & Visual Diff**: Staging, branches, commits, and diff viewer.
  - **Terminal Hub**: Multi-tab, split-screen (horizontal/vertical), shell selector, full ANSI xterm.js.
  - **SSH Hub**: Connection list, test connection, quick terminal launch.
  - **Developer Tools Suite**: 11+ built-in developer utilities.
  - **Settings Hub**: Accounts, shortcuts, appearance, security.

---

## 4. Communication & Data Flow

```text
┌────────────────────────────────┐                 ┌───────────────────────────────┐
│     React Frontend (WebView2)  │                 │    .NET 9 Host (Kestrel)      │
│                                │                 │                               │
│  - REST API calls (fetch)      ├─ HTTP JSON ────►│  - /api/projects              │
│  - Terminal keystrokes/resize  │                 │  - /api/git                   │
│  - Live system stats reception ├─ WebSockets ───►│  - /api/ssh                   │
│                                │                 │  - /api/tools                 │
│                                │                 │  - /api/settings              │
│                                │                 │  - /ws/terminal/{sessionId}   │
│                                │                 │  - /ws/metrics                │
└────────────────────────────────┘                 └───────────────────────────────┘
```

---

## 5. Security Model

1. **At-Rest Protection**:
   - Secrets are encrypted with Windows DPAPI (`DataProtectionScope.CurrentUser`).
   - Plaintext credentials never touch disk.
2. **In-Transit Protection**:
   - Kestrel binds exclusively to `127.0.0.1` (loopback only) on a randomly assigned or protected local port.
3. **UI & Log Masking**:
   - Tokens are masked on retrieval (`ghp_••••••••••••••••3a9b`).
   - Strict redacting prevents secrets from being recorded in logs or terminal streams.
