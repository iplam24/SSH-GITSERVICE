using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows;

namespace DevDock.App;

/// <summary>
/// Interaction logic for App.xaml
/// </summary>
public partial class App : System.Windows.Application
{
    private const string MutexName = "DevDock_SingleInstance_App_Mutex";
    private static Mutex? _mutex;

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    private static extern int RegisterWindowMessage(string lpString);

    [DllImport("user32.dll")]
    private static extern bool PostMessage(IntPtr hWnd, int Msg, IntPtr wParam, IntPtr lParam);

    private static readonly IntPtr HWND_BROADCAST = new IntPtr(0xffff);

    protected override async void OnStartup(StartupEventArgs e)
    {
        var logPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "DevDock", "devdock_startup.log");
        Directory.CreateDirectory(Path.GetDirectoryName(logPath)!);
        File.AppendAllText(logPath, $"[{DateTime.Now:O}] App.OnStartup starting...\n");

        _mutex = new Mutex(true, MutexName, out bool createdNew);
        File.AppendAllText(logPath, $"[{DateTime.Now:O}] Mutex createdNew: {createdNew}\n");

        if (!createdNew)
        {
            // Another instance is already running. Broadcast message to activate it and shutdown.
            try
            {
                int msg = RegisterWindowMessage("DevDock_Show_Window_Message");
                PostMessage(HWND_BROADCAST, msg, IntPtr.Zero, IntPtr.Zero);
                File.AppendAllText(logPath, $"[{DateTime.Now:O}] Duplicate instance detected, posted show message and shutting down.\n");
            }
            catch (Exception ex)
            {
                File.AppendAllText(logPath, $"[{DateTime.Now:O}] Error posting message: {ex}\n");
            }

            Shutdown();
            return;
        }

        AppDomain.CurrentDomain.UnhandledException += (s, args) =>
        {
            File.AppendAllText(logPath, $"[{DateTime.Now:O}] UnhandledException: {args.ExceptionObject}\n");
        };

        DispatcherUnhandledException += (s, args) =>
        {
            File.AppendAllText(logPath, $"[{DateTime.Now:O}] DispatcherUnhandledException: {args.Exception}\n");
        };

        base.OnStartup(e);
        File.AppendAllText(logPath, $"[{DateTime.Now:O}] base.OnStartup completed.\n");

        // Display Splash Screen immediately
        var splash = new SplashScreenWindow();
        splash.Show();
        splash.UpdateStatus("Đang khởi động hệ thống DevDock...", 15);

        try
        {
            var mainWindow = new MainWindow(splash);
            MainWindow = mainWindow;
            await mainWindow.InitializeAppAsync();
        }
        catch (Exception ex)
        {
            File.AppendAllText(logPath, $"[{DateTime.Now:O}] Fatal error in MainWindow initialization: {ex}\n");
            splash.Close();
            System.Windows.MessageBox.Show($"DevDock gặp lỗi khởi động:\n\n{ex.Message}\n\n{ex.StackTrace}", "DevDock Error", MessageBoxButton.OK, MessageBoxImage.Error);
            Shutdown();
        }
    }

    protected override void OnExit(ExitEventArgs e)
    {
        var logPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "DevDock", "devdock_startup.log");
        File.AppendAllText(logPath, $"[{DateTime.Now:O}] App.OnExit called with ExitCode: {e.ApplicationExitCode}\n");

        if (_mutex != null)
        {
            try
            {
                _mutex.ReleaseMutex();
                _mutex.Dispose();
            }
            catch { }
        }
        base.OnExit(e);
    }
}

