using DevDock.Core.Models;
using DevDock.Git.Services;
using DevDock.Security.Services;
using DevDock.Settings.Services;
using Xunit;

namespace DevDock.Tests;

public class AiCopilotTests
{
    private static AiService CreateServiceWithNoProviders()
    {
        // Dùng thư mục tạm rỗng để không có provider nào (seed presets nhưng không có API key)
        var tempDir = Path.Combine(Path.GetTempPath(), $"devdock_ai_test_{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempDir);
        // Seed file rỗng để tránh nạp cấu hình thật của người dùng
        File.WriteAllText(Path.Combine(tempDir, "ai_providers.json"), "[]");

        var cred = new DpapiCredentialService(Path.Combine(tempDir, "creds.json"));
        var git = new GitService();
        return new AiService(cred, git, tempDir);
    }

    [Fact]
    public async Task GenerateShellCommand_EmptyDescription_ReturnsFailure()
    {
        var svc = CreateServiceWithNoProviders();
        var res = await svc.GenerateShellCommandAsync(new AiShellCommandRequest { Description = "" });

        Assert.False(res.Success);
        Assert.False(string.IsNullOrWhiteSpace(res.ErrorMessage));
    }

    [Fact]
    public async Task ExplainError_EmptyInput_ReturnsFailure()
    {
        var svc = CreateServiceWithNoProviders();
        var res = await svc.ExplainErrorAsync(new AiExplainErrorRequest { ErrorText = "" });

        Assert.False(res.Success);
        Assert.False(string.IsNullOrWhiteSpace(res.ErrorMessage));
    }

    [Fact]
    public async Task GenerateShellCommand_NoProviderConfigured_DegradesGracefully()
    {
        var svc = CreateServiceWithNoProviders();
        // Seed presets có thể được tạo, nhưng không có API key -> phải trả về lỗi lịch sự, không ném exception
        var res = await svc.GenerateShellCommandAsync(new AiShellCommandRequest
        {
            Description = "liệt kê file trong thư mục",
            Shell = "PowerShell"
        });

        Assert.False(res.Success);
        Assert.False(string.IsNullOrWhiteSpace(res.ErrorMessage));
    }
}
