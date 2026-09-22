using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net.Http;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Windows;
using System.Windows.Interop;
using DevDock.App.Server;
using DevDock.Core.Models;
using DevDock.Core.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Web.WebView2.Core;
using Forms = System.Windows.Forms;

namespace DevDock.App;

public partial class MainWindow : Window
{
    private const int HOTKEY_ID = 9001;
    private const uint MOD_CONTROL = 0x0002;
    private const uint MOD_NOREPEAT = 0x4000;
    private const uint VK_SPACE = 0x20;
    private const int WM_HOTKEY = 0x0312;

    [DllImport("user32.dll")]
    private static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);

    [DllImport("user32.dll")]
    private static extern bool UnregisterHotKey(IntPtr hWnd, int id);

    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    private static extern int RegisterWindowMessage(string lpString);

    // Used for native window drag from WebView2 context (DragMove() requires WPF MouseDown event)
    [DllImport("user32.dll")]
    private static extern IntPtr SendMessage(IntPtr hWnd, int msg, IntPtr wParam, IntPtr lParam);

    // Must be called before SendMessage(WM_NCLBUTTONDOWN) to release WebView2 mouse capture
    [DllImport("user32.dll")]
    private static extern bool ReleaseCapture();

    private const int WM_NCLBUTTONDOWN = 0x00A1;
    private const int HTCAPTION = 2;

    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

    private const int WM_GETMINMAXINFO = 0x0024;
    private const uint MONITOR_DEFAULTTONEAREST = 0x00000002;

    [DllImport("user32.dll")]
    private static extern IntPtr MonitorFromWindow(IntPtr handle, uint flags);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    private static extern bool GetMonitorInfo(IntPtr hMonitor, ref MONITORINFO lpmi);

    [StructLayout(LayoutKind.Sequential)]
    public struct POINT
    {
        public int X;
        public int Y;
        public POINT(int x, int y) { X = x; Y = y; }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct MINMAXINFO
    {
        public POINT ptReserved;
        public POINT ptMaxSize;
        public POINT ptMaxPosition;
        public POINT ptMinTrackSize;
        public POINT ptMaxTrackSize;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
    public struct MONITORINFO
    {
        public int cbSize;
        public RECT rcMonitor;
        public RECT rcWork;
        public int dwFlags;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT
    {
        public int left;
        public int top;
        public int right;
        public int bottom;
    }

    private readonly ApiServer _apiServer = new();
    private Forms.NotifyIcon? _notifyIcon;
    private IntPtr _windowHandle;
    private int _wmShowDevDock;
    private bool _isRealExit;

    private readonly SplashScreenWindow? _splash;

    public MainWindow(SplashScreenWindow? splash = null)
    {
        _splash = splash;
        Opacity = 0;
        ShowInTaskbar = false;
        InitializeComponent();
        try
        {
            var icoPath = Path.Combine(AppContext.BaseDirectory, "app.ico");
            if (File.Exists(icoPath))
            {
                Icon = System.Windows.Media.Imaging.BitmapFrame.Create(new Uri(icoPath, UriKind.Absolute));
            }
        }
        catch { }
        Closing += OnClosing;
        StateChanged += OnWindowStateChanged;
    }

    [DllImport("user32.dll")]
    private static extern int GetSystemMetrics(int nIndex);
    private const int SM_CXFRAME = 32;
    private const int SM_CYFRAME = 33;
    private const int SM_CXPADDEDBORDER = 92;

    private void OnWindowStateChanged(object? sender, EventArgs e)
    {
        if (WindowState == WindowState.Maximized)
        {
            var source = PresentationSource.FromVisual(this);
            double dpiX = source?.CompositionTarget?.TransformToDevice.M11 ?? 1.0;
            double dpiY = source?.CompositionTarget?.TransformToDevice.M22 ?? 1.0;

            int frameX = GetSystemMetrics(SM_CXFRAME);
            int frameY = GetSystemMetrics(SM_CYFRAME);
            int padding = GetSystemMetrics(SM_CXPADDEDBORDER);

            int borderX = (frameX > 0 ? frameX : 4) + (padding > 0 ? padding : 4);
            int borderY = (frameY > 0 ? frameY : 4) + (padding > 0 ? padding : 4);

            RootGrid.Margin = new Thickness(borderX / dpiX, borderY / dpiY, borderX / dpiX, borderY / dpiY);
        }
        else
        {
            RootGrid.Margin = new Thickness(0);
        }
    }

    private static void Log(string msg)
    {
        try
        {
            var logPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "DevDock", "devdock_startup.log");
            File.AppendAllText(logPath, $"[{DateTime.Now:O}] {msg}\n");
        }
        catch { }
    }

    public async Task InitializeAppAsync()
    {
        Log("MainWindow.InitializeAppAsync started.");
        try
        {
            // Show window invisibly (Opacity=0, ShowInTaskbar=false) behind Topmost Splash Screen
            // so WPF attaches the visual tree and builds the WebView2 HwndHost child window!
            Show();

            _windowHandle = new WindowInteropHelper(this).Handle;

            // Register message to activate DevDock when another instance launches
            _wmShowDevDock = RegisterWindowMessage("DevDock_Show_Window_Message");

            // Enable Windows 11 / 10 immersive dark mode frame
            int darkMode = 1;
            DwmSetWindowAttribute(_windowHandle, 20, ref darkMode, sizeof(int)); // DWMWA_USE_IMMERSIVE_DARK_MODE

            _splash?.UpdateStatus("Đang đăng ký phím tắt & khay hệ thống...", 35);

            // Register Global Hotkey (Ctrl + Space)
            var source = HwndSource.FromHwnd(_windowHandle);
            source?.AddHook(HwndHook);
            RegisterHotKey(_windowHandle, HOTKEY_ID, MOD_CONTROL | MOD_NOREPEAT, VK_SPACE);

            // Setup System Tray
            SetupNotifyIcon();

            // Auto-create Desktop Shortcut if not present
            EnsureDesktopShortcut();

            // Start embedded API Server
            _splash?.UpdateStatus("Đang khởi chạy lõi API Server...", 55);
            Log("Starting API Server...");
            await _apiServer.StartAsync();
            Log($"API Server started on {_apiServer.BaseUrl}");

            // Initialize WebView2
            _splash?.UpdateStatus("Đang nạp môi trường WebView2...", 75);
            Log("Initializing WebView2...");
            await InitializeWebViewAsync();
            Log("WebView2 initialization completed.");

            _splash?.UpdateStatus("Đang tải không gian làm việc...", 95);
            await Task.Delay(250);

            _splash?.UpdateStatus("Sẵn sàng!", 100);
            await Task.Delay(250);

            // Make MainWindow visible, show in taskbar, and bring to front
            ShowInTaskbar = true;
            Opacity = 1.0;
            Activate();
            SetForegroundWindow(_windowHandle);

            // Close splash window
            if (_splash != null)
            {
                await _splash.FadeOutAndCloseAsync();
            }
        }
        catch (Exception ex)
        {
            Log($"MainWindow.InitializeAppAsync error: {ex}");
            _splash?.Close();
            System.Windows.MessageBox.Show($"DevDock initialization error:\n\n{ex.Message}\n\n{ex.StackTrace}", "DevDock Error", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private void SetupNotifyIcon()
    {
        Icon appIcon = SystemIcons.Application;
        var icoPath = Path.Combine(AppContext.BaseDirectory, "app.ico");
        if (File.Exists(icoPath))
        {
            try { appIcon = new Icon(icoPath); } catch { }
        }

        _notifyIcon = new Forms.NotifyIcon
        {
            Text = "DevDock — Developer Command Center",
            Visible = true,
            Icon = appIcon
        };

        var menu = new Forms.ContextMenuStrip();
        var header = new Forms.ToolStripMenuItem("⚡ DevDock") { Enabled = false };
        var openItem = new Forms.ToolStripMenuItem("Open DevDock", null, (_, _) => RestoreWindow());
        var paletteItem = new Forms.ToolStripMenuItem("Command Palette (Ctrl+Shift+P)", null, (_, _) =>
        {
            RestoreWindow();
            PostWebMessage(new { type = "FOCUS_COMMAND_PALETTE" });
        });
        var exitItem = new Forms.ToolStripMenuItem("Thoát DevDock", null, (_, _) =>
        {
            RestoreWindow();
            PostWebMessage(new { type = "REQUEST_EXIT_CONFIRM" });
        });

        menu.Items.Add(header);
        menu.Items.Add(new Forms.ToolStripSeparator());
        menu.Items.Add(openItem);
        menu.Items.Add(paletteItem);
        menu.Items.Add(new Forms.ToolStripSeparator());
        menu.Items.Add(exitItem);

        _notifyIcon.ContextMenuStrip = menu;
        _notifyIcon.DoubleClick += (_, _) => RestoreWindow();
    }

    private void RestoreWindow()
    {
        try
        {
            Show();
        }
        catch { }

        try
        {
            if (WindowState == WindowState.Minimized)
            {
                WindowState = WindowState.Normal;
            }
            Activate();
            Topmost = true;
            Topmost = false;
            Focus();
            SetForegroundWindow(_windowHandle);
        }
        catch { }
    }

    private async Task InitializeWebViewAsync()
    {
        var userDataFolder = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "DevDock",
            "WebView2Profile");
        Directory.CreateDirectory(userDataFolder);

        try
        {
            Log($"Attempting primary WebView2 profile at: {userDataFolder}");
            var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
            await WebViewControl.EnsureCoreWebView2Async(env);
            Log("Primary WebView2 profile successfully initialized.");
        }
        catch (Exception ex)
        {
            Log($"Primary WebView2 profile failed ({ex.Message}), switching to process temp profile...");
            var fallbackFolder = Path.Combine(Path.GetTempPath(), "DevDock_WV2_" + Environment.ProcessId);
            Directory.CreateDirectory(fallbackFolder);
            var env = await CoreWebView2Environment.CreateAsync(null, fallbackFolder);
            await WebViewControl.EnsureCoreWebView2Async(env);
            Log("Fallback WebView2 profile successfully initialized.");
        }

        WebViewControl.CoreWebView2.Settings.IsStatusBarEnabled = false;
        WebViewControl.CoreWebView2.Settings.AreDevToolsEnabled = true;
        // Lock zoom factor to 1.0 and disable trackpad pinch/mousewheel zoom so the desktop layout remains crisp and unclipped
        WebViewControl.CoreWebView2.Settings.IsZoomControlEnabled = false;
        WebViewControl.ZoomFactor = 1.0;
        // Enable CSS app-region: drag so the title bar can be dragged natively
        WebViewControl.CoreWebView2.Settings.IsNonClientRegionSupportEnabled = true;
        WebViewControl.CoreWebView2.WebMessageReceived += OnWebMessageReceived;

        // Intercept JavaScript alert/confirm dialogs so Chromium NEVER displays "127.0.0.1:38420 says"
        WebViewControl.CoreWebView2.ScriptDialogOpening += (sender, args) =>
        {
            var deferral = args.GetDeferral();
            try
            {
                if (args.Kind == CoreWebView2ScriptDialogKind.Confirm)
                {
                    var result = System.Windows.MessageBox.Show(
                        this,
                        args.Message,
                        "DevDock",
                        MessageBoxButton.OKCancel,
                        MessageBoxImage.Question);

                    if (result == MessageBoxResult.OK)
                    {
                        args.Accept();
                    }
                }
                else if (args.Kind == CoreWebView2ScriptDialogKind.Alert)
                {
                    System.Windows.MessageBox.Show(
                        this,
                        args.Message,
                        "DevDock",
                        MessageBoxButton.OK,
                        MessageBoxImage.Information);
                    args.Accept();
                }
            }
            finally
            {
                deferral.Complete();
            }
        };

        await WebViewControl.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(@"
            window.confirm = function(msg) { return false; };
            window.alert = function(msg) { };
            window.addEventListener('error', function(e) {
                window.chrome.webview.postMessage(JSON.stringify({ type: 'LOG_ERROR', message: e.message, filename: e.filename, lineno: e.lineno, colno: e.colno, stack: e.error ? e.error.stack : '' }));
            });
            window.addEventListener('unhandledrejection', function(e) {
                window.chrome.webview.postMessage(JSON.stringify({ type: 'LOG_ERROR', message: 'Unhandled Promise: ' + (e.reason ? (e.reason.stack || e.reason) : '') }));
            });
            const _origErr = console.error;
            console.error = function(...args) {
                _origErr.apply(console, args);
                window.chrome.webview.postMessage(JSON.stringify({ type: 'LOG_CONSOLE_ERROR', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') }));
            };
        ");

        WebViewControl.CoreWebView2.NavigationCompleted += async (s, e) =>
        {
            Log($"NavigationCompleted: IsSuccess={e.IsSuccess}, WebErrorStatus={e.WebErrorStatus}");
            try
            {
                var html = await WebViewControl.CoreWebView2.ExecuteScriptAsync("document.documentElement.outerHTML");
                Log($"DOM Length: {html?.Length ?? 0}");
                var rootContent = await WebViewControl.CoreWebView2.ExecuteScriptAsync("document.getElementById('root')?.innerHTML");
                Log($"#root innerHTML length: {rootContent?.Length ?? 0}");
            }
            catch (Exception ex)
            {
                Log($"ExecuteScriptAsync error: {ex.Message}");
            }
        };

        // Clear WebView2 disk cache so newly built frontend assets are always loaded immediately
        try
        {
            await WebViewControl.CoreWebView2.Profile.ClearBrowsingDataAsync(
                CoreWebView2BrowsingDataKinds.DiskCache |
                CoreWebView2BrowsingDataKinds.CacheStorage |
                CoreWebView2BrowsingDataKinds.ServiceWorkers);
        }
        catch { }

        // Open external links (e.g. GitHub repos, releases) in user's default Windows browser
        WebViewControl.CoreWebView2.NewWindowRequested += (sender, args) =>
        {
            args.Handled = true;
            try
            {
                if (!string.IsNullOrWhiteSpace(args.Uri))
                {
                    Process.Start(new ProcessStartInfo(args.Uri) { UseShellExecute = true });
                }
            }
            catch { }
        };

        // Check if Vite Dev Server is alive on localhost:5173
        bool viteRunning = false;
        try
        {
            using var client = new HttpClient { Timeout = TimeSpan.FromMilliseconds(500) };
            var res = await client.GetAsync("http://localhost:5173");
            viteRunning = res.IsSuccessStatusCode;
        }
        catch { }

        var targetUrl = viteRunning ? "http://localhost:5173" : $"{_apiServer.BaseUrl}/index.html?v={DateTime.UtcNow.Ticks}";
        Log($"Navigating WebView2 to {targetUrl}");
        WebViewControl.CoreWebView2.Navigate(targetUrl);
    }

    private void OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            var raw = e.TryGetWebMessageAsString();
            if (string.IsNullOrWhiteSpace(raw)) return;

            using var doc = JsonDocument.Parse(raw);
            if (!doc.RootElement.TryGetProperty("type", out var typeProp)) return;

            var type = typeProp.GetString();
            if (type == "LOG_ERROR" || type == "LOG_CONSOLE_ERROR")
            {
                Log($"JS ERROR: {raw}");
                return;
            }
            switch (type)
            {
                case "window:minimize":
                    WindowState = WindowState.Minimized;
                    break;
                case "window:maximize":
                    WindowState = WindowState == WindowState.Maximized ? WindowState.Normal : WindowState.Maximized;
                    break;
                case "window:close":
                    Close();
                    break;
                case "app:force-exit":
                    _isRealExit = true;
                    Close();
                    break;
                case "window:minimize-to-tray":
                    Hide();
                    _notifyIcon?.ShowBalloonTip(2000, "DevDock", "DevDock đang chạy ngầm trong khay hệ thống. Nhấn Ctrl+Space để mở lại.", Forms.ToolTipIcon.Info);
                    break;
                case "window:drag":
                    if (WindowState == WindowState.Maximized)
                        WindowState = WindowState.Normal;
                    // ReleaseCapture releases WebView2's mouse capture so Windows can start drag
                    ReleaseCapture();
                    SendMessage(_windowHandle, WM_NCLBUTTONDOWN, (IntPtr)HTCAPTION, IntPtr.Zero);
                    break;
            }
        }
        catch { }
    }

    public void PostWebMessage(object payload)
    {
        try
        {
            var json = JsonSerializer.Serialize(payload);
            WebViewControl.CoreWebView2?.PostWebMessageAsString(json);
        }
        catch { }
    }

    private IntPtr HwndHook(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
    {
        if (msg == WM_GETMINMAXINFO)
        {
            WmGetMinMaxInfo(hwnd, lParam);
            // Do not consume message; let WPF WindowChrome continue its own tracking
            handled = false;
            return IntPtr.Zero;
        }

        if (_wmShowDevDock != 0 && msg == _wmShowDevDock)
        {
            RestoreWindow();
            handled = true;
            return IntPtr.Zero;
        }

        if (msg == WM_HOTKEY && wParam.ToInt32() == HOTKEY_ID)
        {
            // Global Hotkey (Ctrl + Space) pressed
            RestoreWindow();
            PostWebMessage(new { type = "FOCUS_COMMAND_PALETTE" });
            handled = true;
        }
        return IntPtr.Zero;
    }

    private static void WmGetMinMaxInfo(IntPtr hwnd, IntPtr lParam)
    {
        try
        {
            var mmi = Marshal.PtrToStructure<MINMAXINFO>(lParam);

            var monitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
            if (monitor != IntPtr.Zero)
            {
                var monitorInfo = new MONITORINFO();
                monitorInfo.cbSize = Marshal.SizeOf(typeof(MONITORINFO));
                if (GetMonitorInfo(monitor, ref monitorInfo))
                {
                    var rcWorkArea = monitorInfo.rcWork;
                    var rcMonitorArea = monitorInfo.rcMonitor;

                    mmi.ptMaxPosition.X = Math.Abs(rcWorkArea.left - rcMonitorArea.left);
                    mmi.ptMaxPosition.Y = Math.Abs(rcWorkArea.top - rcMonitorArea.top);
                    mmi.ptMaxSize.X = Math.Abs(rcWorkArea.right - rcWorkArea.left);
                    mmi.ptMaxSize.Y = Math.Abs(rcWorkArea.bottom - rcWorkArea.top);
                }
            }

            Marshal.StructureToPtr(mmi, lParam, true);
        }
        catch { }
    }

    private void OnClosing(object? sender, System.ComponentModel.CancelEventArgs e)
    {
        if (_isRealExit)
        {
            try
            {
                UnregisterHotKey(_windowHandle, HOTKEY_ID);
                _notifyIcon?.Dispose();
                _ = _apiServer.StopAsync();
            }
            catch { }
            return;
        }

        // Intercept close event (from taskbar right-click "Close window", Alt+F4, or TitleBar X)
        // Prevent immediate close and request Exit Confirm Modal in React UI
        e.Cancel = true;
        try
        {
            if (WindowState == WindowState.Minimized)
            {
                WindowState = WindowState.Normal;
            }
            Activate();
            SetForegroundWindow(_windowHandle);
        }
        catch { }

        PostWebMessage(new { type = "REQUEST_EXIT_CONFIRM" });
    }

    public static void EnsureDesktopShortcut(bool overwrite = false)
    {
        try
        {
            var desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
            if (string.IsNullOrEmpty(desktop) || !Directory.Exists(desktop))
            {
                desktop = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
            }
            if (string.IsNullOrEmpty(desktop) || !Directory.Exists(desktop)) return;

            var shortcutPath = Path.Combine(desktop, "DevDock.lnk");
            if (!overwrite && File.Exists(shortcutPath)) return;

            var currentExe = Environment.ProcessPath ?? System.Diagnostics.Process.GetCurrentProcess().MainModule?.FileName;
            if (string.IsNullOrEmpty(currentExe) || !File.Exists(currentExe)) return;

            var workingDir = AppDomain.CurrentDomain.BaseDirectory;
            var iconPath = Path.Combine(workingDir, "app.ico");
            if (!File.Exists(iconPath))
            {
                iconPath = currentExe;
            }

            var wshType = Type.GetTypeFromProgID("WScript.Shell");
            if (wshType != null)
            {
                dynamic wshShell = Activator.CreateInstance(wshType)!;
                dynamic shortcut = wshShell.CreateShortcut(shortcutPath);
                shortcut.TargetPath = currentExe;
                shortcut.WorkingDirectory = workingDir;
                shortcut.IconLocation = iconPath;
                shortcut.Description = "DevDock — Modern Developer Command Center";
                shortcut.Save();
            }
        }
        catch { }
    }
}