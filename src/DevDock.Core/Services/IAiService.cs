using DevDock.Core.Models;

namespace DevDock.Core.Services;

public interface IAiService
{
    Task<List<AiProviderConfig>> GetProvidersAsync();
    Task<AiProviderConfig?> GetProviderByIdAsync(string id);
    Task<AiProviderConfig> SaveProviderAsync(AiProviderConfig config, string? apiKey);
    Task<bool> DeleteProviderAsync(string id);
    Task<bool> SetDefaultProviderAsync(string id);
    Task<AiTestResult> TestProviderAsync(string id);
    Task<AiTestResult> TestDirectConfigAsync(SaveAiProviderRequest request);
    Task<AiChatResponse> ChatAsync(AiChatRequest request);
    Task<AiChatResponse> GenerateCommitMessageAsync(AiGenerateCommitRequest request);
}
