using DevDock.Core.Models;

namespace DevDock.Core.Services;

public interface IDevOpsService
{
    Task<List<PortListeningItem>> GetListeningPortsAsync();
    Task<KillProcessResult> KillProcessByPidAsync(int pid, bool force = true);
    Task<List<HostEntryItem>> GetHostEntriesAsync();
    Task<bool> SaveHostEntriesAsync(List<HostEntryItem> entries, bool flushDns = true);
    Task<bool> FlushDnsCacheAsync();
    Task<List<SystemEnvVariableItem>> GetEnvironmentVariablesAsync();
    Task<DotEnvCompareResult> CompareDotEnvAsync(string currentEnv, string exampleEnv);
}
