using DevDock.Core.Models;

namespace DevDock.Core.Services;

public interface ISetupService
{
    Task<SetupDiagnostics> GetDiagnosticsAsync();
    Task<SystemIntegrationStatus> GetIntegrationStatusAsync();
    Task<SetupActionResult> AddToPathAsync();
    Task<SetupActionResult> RemoveFromPathAsync();
    Task<SetupActionResult> RegisterContextMenuAsync();
    Task<SetupActionResult> UnregisterContextMenuAsync();
    Task<SetupActionResult> RegisterStartupAsync();
    Task<SetupActionResult> UnregisterStartupAsync();
    Task<SetupActionResult> RegisterProtocolHandlerAsync();
    Task<SetupActionResult> ApplySetupAsync(ApplySetupRequest request);
}
