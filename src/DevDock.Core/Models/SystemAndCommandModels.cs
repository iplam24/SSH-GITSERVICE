namespace DevDock.Core.Models;

public class DriveMetric
{
    public string Name { get; set; } = string.Empty;
    public string Letter { get; set; } = string.Empty;
    public string VolumeLabel { get; set; } = string.Empty;
    public string DriveType { get; set; } = string.Empty;
    public double TotalGb { get; set; }
    public double FreeGb { get; set; }
    public double UsedGb { get; set; }
    public double UsagePercent { get; set; }
    public bool IsSystem { get; set; }
}

public class SystemMetrics
{
    public double CpuUsagePercent { get; set; }
    public double TotalRamMb { get; set; }
    public double UsedRamMb { get; set; }
    public double AvailableRamMb { get; set; }
    public double RamUsagePercent { get; set; }
    public double DiskTotalGb { get; set; }
    public double DiskFreeGb { get; set; }
    public double DiskUsagePercent { get; set; }
    public List<DriveMetric> Drives { get; set; } = new();
    public double NetworkSentKbps { get; set; }
    public double NetworkReceivedKbps { get; set; }
    public TimeSpan Uptime { get; set; }
    public string MachineName { get; set; } = Environment.MachineName;
    public string OsVersion { get; set; } = Environment.OSVersion.ToString();
}

public class CommandPaletteItem
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Subtitle { get; set; }
    public string Category { get; set; } = "General"; // Git, SSH, Terminal, Projects, Tools, Settings, System
    public string? Shortcut { get; set; }
    public string? Icon { get; set; }
    public string ActionType { get; set; } = "navigate"; // navigate, execute, terminal, ssh, git, project
    public Dictionary<string, string>? Payload { get; set; }
}
