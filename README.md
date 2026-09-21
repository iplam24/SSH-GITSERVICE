# DevDock — Modern Developer Command Center

<div align="center">
  <h3>⚡ A high-performance, keyboard-first desktop developer command center for Windows</h3>
  <p>Unifying Git workflows, credentials, SSH connections, native ConPTY terminals, project runners, and developer utilities into a single sleek application.</p>
</div>

---

## 🌟 Highlights

- ⚡ **Blazing Fast Native Shell**: Built with **.NET 9 + Microsoft WebView2** — ultra-fast startup, low RAM footprint, native Windows API integration.
- 🎯 **Keyboard-First Workflow**: Full app control via keyboard. Global hotkey (`Ctrl+Space`) brings DevDock to front from anywhere in Windows.
- 🔍 **Raycast/Linear-Style Command Palette**: `Ctrl+Shift+P` or `Ctrl+Space` for instant fuzzy search across commands, projects, SSH profiles, and utilities.
- 💻 **Native Windows ConPTY Terminal**: Full ANSI 256-color support, multi-tab and split-pane (horizontal/vertical) layouts for PowerShell, Command Prompt, Git Bash, and WSL.
- 🖥 **SSH Connection Manager**: Connect to remote Linux, Windows, or Minecraft servers via `SSH.NET`. Test latency/connectivity and stream interactive SSH shells in real-time.
- 🌿 **Git Hub & Visual Diff Viewer**: Branch switching, file staging/unstaging, commit log, push/pull/fetch, stash, and **Side-by-Side + Unified** diff viewer.
- 🔐 **Windows DPAPI Credential Security**: Git Personal Access Tokens, SSH passwords, and private keys are encrypted using hardware/user-bound Windows DPAPI. Zero plaintext secrets in logs or UI.
- 📁 **Project Manager & Runners**: Detects project configurations, provides quick-open to Explorer/VS Code, and runs `dev`, `build`, and `test` commands with streaming output.
- 🧰 **11+ Developer Utilities**: Built-in JSON Formatter, JWT Decoder, Base64, URL Encoder, UUID Generator, Hash Generator, Regex Tester, Timestamp Converter, Color Picker, Text Diff, and CORS-Free HTTP Client.
- 📊 **Real-time System Metrics**: Live CPU, RAM, Disk, and Network monitoring chips and dashboard graphs.
- 🔌 **Extensible Plugin Architecture**: Clean lifecycle hooks and command registries for plugins (e.g. Docker, Minecraft, Kubernetes).

---

## 🏗 System Architecture

```text
DevDock
├── src/
│   ├── DevDock.App/             Desktop Host (WPF/Win32 + WebView2 + Kestrel HTTP & WebSockets)
│   ├── DevDock.Core/            Domain Models, Interfaces, Event Bus & Plugin Contracts
│   ├── DevDock.Security/        Windows DPAPI Credential Storage & Secret Masking
│   ├── DevDock.Projects/        Project Discovery & Dev/Build/Test Runner
│   ├── DevDock.Git/             Async Git CLI Engine & Structured Diff Parser
│   ├── DevDock.SSH/             SSH.NET Profile Manager & Interactive Shell Streamer
│   ├── DevDock.Terminal/        Windows ConPTY P/Invoke Engine & WebSocket Session Hub
│   ├── DevDock.Settings/        Configuration Store, Git Accounts & Win32 System Metrics
│   ├── DevDock.Plugins/         Plugin Manager & Extension Contracts
│   └── DevDock.Frontend/        React 18 + TypeScript + Vite + Tailwind CSS + xterm.js
├── dist/DevDock/                Ready-to-run Windows Release
├── ARCHITECTURE.md              Deep dive architecture & data flow specification
├── README.md                    Product overview & quick reference
└── SETUP.md                     Building, packaging & developer environment guide
```

---

## 🚀 Quickstart

### Running the Pre-built Release
The production binary is located at:
```text
dist\DevDock\DevDock.App.exe
```
Double-click `DevDock.App.exe` to launch DevDock immediately.

### Development Mode (with Live Hot-Reloading)

1. **Start the Vite Frontend dev server** (with instant HMR):
   ```bash
   cd src/DevDock.Frontend
   npm run dev
   ```

2. **Launch the Desktop Host**:
   ```bash
   dotnet run --project src/DevDock.App/DevDock.App.csproj
   ```
   DevDock automatically detects `http://localhost:5173` and attaches WebView2 for live editing!

---

## ⌨ Keyboard Shortcuts

| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>Space</kbd> | **Wake DevDock / Quick Launcher** | Global (anywhere in Windows) |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> | Open Command Palette | In App |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>T</kbd> | Open New Terminal Tab | In App |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>G</kbd> | Switch to Git Hub | In App |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> | Switch to SSH Manager | In App |
| <kbd>Ctrl</kbd> + <kbd>1</kbd> | Home Dashboard | In App |
| <kbd>Ctrl</kbd> + <kbd>2</kbd> | Projects Hub | In App |
| <kbd>Ctrl</kbd> + <kbd>6</kbd> | Developer Tools | In App |
| <kbd>Ctrl</kbd> + <kbd>,</kbd> | Settings & Accounts | In App |

---

## 📦 Building the Windows Distribution

### 1. Build the React Frontend:
```bash
cd src/DevDock.Frontend
npm run build
cd ../..
```

### 2. Build and Publish the Windows `.exe`:
```bash
dotnet publish src/DevDock.App/DevDock.App.csproj -c Release -r win-x64 --self-contained false -o dist/DevDock
```

For a self-contained executable (includes .NET runtime):
```bash
dotnet publish src/DevDock.App/DevDock.App.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o dist/DevDock-Standalone
```

---

## 🧪 Automated Tests

Run the test suite covering DPAPI encryption, token masking, Git diff parsing, and project discovery:
```bash
dotnet test tests/DevDock.Tests/DevDock.Tests.csproj
```

---

## 📄 License
MIT License. Built with ❤️ for Windows Developers.
