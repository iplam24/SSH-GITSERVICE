namespace DevDock.Core.Models;

public class PortListeningItem
{
    public int Port { get; set; }
    public string Protocol { get; set; } = "TCP";
    public string LocalAddress { get; set; } = "0.0.0.0";
    public int Pid { get; set; }
    public string ProcessName { get; set; } = string.Empty;
    public string? ProcessPath { get; set; }
    public double MemoryMb { get; set; }
    public DateTime? StartTime { get; set; }
    public string State { get; set; } = "LISTENING";
}

public class KillProcessRequest
{
    public int Pid { get; set; }
    public bool Force { get; set; } = true;
}

public class KillProcessResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public int Pid { get; set; }
}

public class HostEntryItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string IpAddress { get; set; } = "127.0.0.1";
    public List<string> Hostnames { get; set; } = new();
    public string? Comment { get; set; }
    public bool IsEnabled { get; set; } = true;
    public int LineNumber { get; set; }
    public bool IsSystemDefault { get; set; }
}

public class SaveHostsRequest
{
    public List<HostEntryItem> Entries { get; set; } = new();
    public bool AutoFlushDns { get; set; } = true;
}

public class EnvPathItem
{
    public string Path { get; set; } = string.Empty;
    public bool Exists { get; set; }
    public string? ErrorMessage { get; set; }
}

public class SystemEnvVariableItem
{
    public string Name { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string Target { get; set; } = "User"; // "User" or "Machine"
    public bool IsPath { get; set; }
    public List<EnvPathItem> PathItems { get; set; } = new();
}

public class DotEnvCompareRequest
{
    public string CurrentEnv { get; set; } = string.Empty;
    public string ExampleEnv { get; set; } = string.Empty;
}

public class DotEnvKeyDiff
{
    public string Key { get; set; } = string.Empty;
    public string? CurrentValue { get; set; }
    public string? ExampleValue { get; set; }
    public string Status { get; set; } = "matched"; // "missing", "extra", "matched", "different_value"
}

public class DotEnvCompareResult
{
    public List<DotEnvKeyDiff> DiffEntries { get; set; } = new();
    public int MissingKeysCount { get; set; }
    public int ExtraKeysCount { get; set; }
    public int TotalKeysCount { get; set; }
}
