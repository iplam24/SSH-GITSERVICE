# DevDock — Setup and Build Guide

This guide walks you through setting up the development environment, compiling the source code, running automated tests, and packaging DevDock into a Windows `.exe` distribution.

---

## 1. Prerequisites

Ensure the following tools are installed on your Windows machine:

1. **Operating System**: Windows 10 (version 1809 / build 17763 or later) or Windows 11 (required for native Windows ConPTY pseudo console).
2. **.NET SDK**: .NET 9.0 SDK or higher (`dotnet --version`).
3. **Node.js**: Node.js v18.0+ or v20.0+ LTS with `npm` (`node -v`, `npm -v`).
4. **Git for Windows**: Git CLI installed and available in PATH (`git --version`).
5. **WebView2 Runtime**: Pre-installed on Windows 10/11. (If missing, download from Microsoft Evergreen Bootstrapper).

---

## 2. Project Directory Structure

```text
d:\ToolTienich\
├── src\
│   ├── DevDock.App\              # WPF Desktop Shell, WebView2, Tray & Kestrel Server
│   ├── DevDock.Core\             # Domain models, service interfaces & plugin contracts
│   ├── DevDock.Security\         # Windows DPAPI encryption & secret masking
│   ├── DevDock.Projects\         # Project storage, discovery & command runners
│   ├── DevDock.Git\              # Git CLI integration & structured diff parser
│   ├── DevDock.SSH\              # SSH.NET client & interactive shell stream
│   ├── DevDock.Terminal\         # ConPTY P/Invoke & WebSocket session manager
│   ├── DevDock.Settings\         # Configuration, Git accounts & system metrics
│   ├── DevDock.Plugins\          # Extensibility system & sample plugins
│   └── DevDock.Frontend\         # React 18, TypeScript, Vite & Tailwind CSS UI
├── tests\
│   └── DevDock.Tests\            # Automated unit and integration tests
├── dist\
│   └── DevDock\                  # Production-ready Windows application package
├── ARCHITECTURE.md               # Technical architecture documentation
├── README.md                     # Overview and feature list
└── SETUP.md                      # Setup and packaging guide
```

---

## 3. Development Workflow

### Step 1: Install Frontend Dependencies
```powershell
cd src\DevDock.Frontend
npm install
```

### Step 2: Run in Development Mode (Live Hot-Reloading)
Start the Vite development server in one terminal:
```powershell
cd src\DevDock.Frontend
npm run dev
```
*(Vite runs on `http://localhost:5173`)*

In another terminal, launch the desktop host:
```powershell
dotnet run --project src\DevDock.App\DevDock.App.csproj
```
`DevDock.App` automatically detects the active Vite development server and points WebView2 to it, enabling live UI hot-reloading!

---

## 4. Building the Production Release

### Step 1: Build Frontend Assets
Compile TypeScript and bundle the frontend into `DevDock.App/wwwroot`:
```powershell
cd src\DevDock.Frontend
npm run build
cd ..\..
```

### Step 2: Build the .NET Solution
```powershell
dotnet build DevDock.slnx -c Release
```

### Step 3: Run Automated Tests
```powershell
dotnet test tests\DevDock.Tests\DevDock.Tests.csproj
```

---

## 5. Packaging into Windows `.exe`

### Option A: Framework-Dependent Package (Recommended)
Generates a lightweight folder with `DevDock.App.exe` leveraging the machine's installed .NET 9 runtime:
```powershell
dotnet publish src/DevDock.App/DevDock.App.csproj -c Release -r win-x64 --self-contained false -o dist/DevDock
```
The output is created at `dist\DevDock\DevDock.App.exe`.

### Option B: Self-Contained Single-File Executable
Generates a standalone single `.exe` containing the complete .NET runtime:
```powershell
dotnet publish src/DevDock.App/DevDock.App.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o dist/DevDock-Standalone
```

---

## 6. How to Run DevDock

Navigate to `dist\DevDock\` and double click:
```text
DevDock.App.exe
```

### Verifying Core Features:
- **Global Hotkey**: Press `Ctrl + Space` anywhere in Windows to bring DevDock to front and open the Quick Launcher.
- **Command Palette**: Press `Ctrl + Shift + P` or click the search box in the title bar.
- **System Tray**: Close the window or minimize — DevDock docks to the Windows System Tray. Right-click the tray icon to restore or exit.
- **Local Terminal**: Click '+' in the Terminal tab to open PowerShell, CMD, Git Bash, or WSL. Split horizontally or vertically.
- **SSH Terminal**: Go to SSH, add or select a server, click "Test Connection" to check latency, then click "Connect" to stream an interactive shell.
- **Git & Diff**: Open a project with a git repo to view staged/unstaged changes, create commits, switch branches, and inspect side-by-side visual diffs.
- **Developer Tools**: Explore the 11 built-in tools (JSON Formatter, JWT Decoder, Base64, UUID, Regex, HTTP Client, etc.).

---

## 7. Troubleshooting

| Issue | Solution |
| :--- | :--- |
| **WebView2 not initializing** | Ensure the Microsoft Edge WebView2 Evergreen Runtime is installed. |
| **ConPTY fails to spawn** | Requires Windows 10 build 17763 or higher. Verify `powershell.exe` or `cmd.exe` exists in `System32`. |
| **Git operations return errors** | Verify Git is installed and `git --version` works from PowerShell. |
| **DPAPI encryption access** | DPAPI encrypts per-user. Data cannot be accessed across different Windows login accounts. |
