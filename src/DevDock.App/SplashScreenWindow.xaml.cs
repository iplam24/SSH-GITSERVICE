using System.IO;
using System.Windows;
using System.Windows.Media.Animation;

namespace DevDock.App;

public partial class SplashScreenWindow : Window
{
    public SplashScreenWindow()
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

        Loaded += (_, _) =>
        {
            if (Resources["GlowPulse"] is Storyboard sb)
            {
                sb.Begin();
            }
        };
    }

    public void UpdateStatus(string message, double progress)
    {
        if (!Dispatcher.CheckAccess())
        {
            Dispatcher.Invoke(() => UpdateStatus(message, progress));
            return;
        }

        StatusText.Text = message;
        var clampVal = Math.Clamp(progress, 0, 100);
        ProgressBar.Value = clampVal;
        PercentText.Text = $"{(int)clampVal}%";
    }

    public async Task FadeOutAndCloseAsync()
    {
        var anim = new DoubleAnimation(1.0, 0.0, TimeSpan.FromMilliseconds(250));
        var tcs = new TaskCompletionSource<bool>();
        anim.Completed += (_, _) => tcs.TrySetResult(true);
        BeginAnimation(OpacityProperty, anim);
        await tcs.Task;
        Close();
    }
}
