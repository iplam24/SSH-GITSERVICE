using System.Diagnostics;
using System.IO;
using System.Windows;
using System.Windows.Input;
using DevDock.Installer.Services;

namespace DevDock.Installer;

public partial class MainWindow : Window
{
    private readonly InstallerEngine _engine = new();
    private InstallOptions _options = new();

    public MainWindow()
    {
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

        TxtInstallPath.Text = InstallerEngine.GetDefaultInstallPath();
    }

    private void Header_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (e.ButtonState == MouseButtonState.Pressed)
        {
            DragMove();
        }
    }

    private void BtnClose_Click(object sender, RoutedEventArgs e)
    {
        Close();
    }

    private void BtnBrowse_Click(object sender, RoutedEventArgs e)
    {
        var dlg = new Microsoft.Win32.OpenFolderDialog
        {
            Title = "Chọn thư mục cài đặt DevDock",
            InitialDirectory = TxtInstallPath.Text
        };

        if (dlg.ShowDialog() == true)
        {
            TxtInstallPath.Text = dlg.FolderName;
        }
    }

    private async void BtnInstall_Click(object sender, RoutedEventArgs e)
    {
        var targetPath = TxtInstallPath.Text.Trim();
        if (string.IsNullOrWhiteSpace(targetPath))
        {
            MessageBox.Show("Vui lòng chọn thư mục cài đặt hợp lệ.", "DevDock Setup", MessageBoxButton.OK, MessageBoxImage.Warning);
            return;
        }

        _options = new InstallOptions
        {
            InstallPath = targetPath,
            CreateDesktopShortcut = ChkDesktop.IsChecked == true,
            CreateStartMenuShortcut = ChkStartMenu.IsChecked == true,
            AddToPath = ChkPath.IsChecked == true,
            AddContextMenu = ChkContextMenu.IsChecked == true,
            LaunchAfterInstall = ChkLaunch.IsChecked == true
        };

        // Switch to progress view
        ConfigView.Visibility = Visibility.Collapsed;
        PanelConfigButtons.Visibility = Visibility.Collapsed;
        ProgressView.Visibility = Visibility.Visible;

        bool success = await _engine.InstallAsync(_options, (status, percent) =>
        {
            Dispatcher.Invoke(() =>
            {
                TxtStatus.Text = status;
                InstallProgressBar.Value = percent;
                TxtPercent.Text = $"{(int)percent}%";
            });
        });

        if (success)
        {
            IconFinish.Visibility = Visibility.Visible;
            TxtProgressHeader.Text = "Cài đặt DevDock thành công! 🎉";
            TxtProgressNote.Text = "DevDock đã được tích hợp đầy đủ vào hệ thống của bạn.";
            PanelFinishButtons.Visibility = Visibility.Visible;

            if (_options.LaunchAfterInstall)
            {
                BtnFinish.Content = "Khởi chạy DevDock & Đóng";
            }
            else
            {
                BtnFinish.Content = "Hoàn tất";
            }
        }
        else
        {
            TxtProgressHeader.Text = "Cài đặt gặp sự cố!";
            TxtProgressNote.Text = "Vui lòng kiểm tra quyền thư mục hoặc tắt các ứng dụng đang chạy trước khi thử lại.";
            PanelConfigButtons.Visibility = Visibility.Visible;
            BtnInstall.Content = "Thử lại";
        }
    }

    private void BtnFinish_Click(object sender, RoutedEventArgs e)
    {
        if (_options.LaunchAfterInstall)
        {
            try
            {
                var exePath = Path.Combine(_options.InstallPath, "DevDock.App.exe");
                if (File.Exists(exePath))
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = exePath,
                        WorkingDirectory = _options.InstallPath,
                        UseShellExecute = true
                    });
                }
            }
            catch { }
        }

        Close();
    }
}
